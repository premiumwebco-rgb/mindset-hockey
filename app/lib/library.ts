// Server-only. Mirrors the guard in lib/ai/duration.ts rather than the
// `server-only` package, which is not a dependency of this project. If this
// module is ever pulled into a client bundle the app fails loudly at import
// time instead of quietly shipping the service-role client to a browser.
if (typeof window !== 'undefined') {
  throw new Error('lib/library.ts is server-only.');
}

import { hasTier, DEMO_MODE, type Session } from './session';
import { PILLARS, type Pillar, type Tier } from './types';

/* ==========================================================================
   TRAINING LIBRARY — DATA LAYER

   The single place /library and /library/[id] read training content from.
   Everything here is server-only; importing it into a client component is a
   build error, which is what keeps the service-role client out of the browser.

   THE ACCESS MODEL, AND WHY IT IS SPLIT IN TWO
   -------------------------------------------
   The library has to do two things that pull in opposite directions:

     1. Show a member the locked Premium lessons they are NOT entitled to, so
        they can see what upgrading buys. (Hiding it destroys the upgrade path.)
     2. Never let that member reach the file.

   The RLS policy from 0008 only satisfies (2) — it hides premium rows from a
   basic member entirely, so a single RLS-bound query cannot render a teaser.
   The naive fix is to read everything with the service-role client and decide
   in TypeScript who may see what. That is exactly the design where one bad
   `if` leaks the library, so it is not what this does.

   Instead there are two queries with different jobs:

     ENTITLEMENT QUERY (session client, RLS enforced)
       Returns only the rows Postgres itself says this user may read. The set of
       ids it returns IS the definition of "unlocked". No TypeScript decides it.

     TEASER QUERY (service-role client, restricted column list)
       Returns published rows for display. Its select list deliberately omits
       `storage_path`, so the one field that could locate a file in the bucket
       is never loaded into a response a locked member can see.

   `locked` is then `!unlockedIds.has(row.id)` — sourced from the database, not
   from a hand-written tier comparison. hasTier() is still applied on the
   playback path as a second, independent check.
   ========================================================================== */

/** The six pillars, in display order. Derived from PILLARS so there is one list. */
export const PILLAR_KEYS = PILLARS.map((p) => p.key);

export function isPillar(value: unknown): value is Pillar {
  return typeof value === 'string' && (PILLAR_KEYS as string[]).includes(value);
}

/**
 * Reads ?pillar= from the URL.
 *
 * Anything that is not one of the six — a typo, a removed pillar, an injection
 * attempt — resolves to null, which renders the All view. An unrecognised
 * filter must never be an error page.
 */
export function parsePillar(value: unknown): Pillar | null {
  return isPillar(value) ? value : null;
}

/** What a library card is allowed to know. Deliberately no `storage_path`. */
export interface LibraryCard {
  id: string;
  title: string;
  description: string | null;
  pillar: Pillar;
  category: string | null;
  kind: string;
  requiredTier: Tier;
  durationSec: number | null;
  isPublished: boolean;
  /** True when this user may not open the file. Sourced from RLS, not from code. */
  locked: boolean;
}

export type PillarCounts = Record<Pillar | 'all', number>;

export interface LibraryView {
  resources: LibraryCard[];
  counts: PillarCounts;
  /** True when Supabase is not configured. The library shows an empty state. */
  unavailable: boolean;
}

/**
 * The slice of the Supabase client this module uses. Structural, so both the
 * real client and a test stub satisfy it without either importing the other.
 */
export interface QueryResult {
  data: RawRow[] | null;
  error: { message: string } | null;
}

/** A PostgREST-style chainable query that resolves to rows. */
export interface QueryBuilder extends PromiseLike<QueryResult> {
  eq(column: string, value: unknown): QueryBuilder;
  order(column: string, opts: { ascending: boolean }): QueryBuilder;
}

export interface SupabaseLike {
  from(table: string): { select(columns: string): QueryBuilder };
}

/** Columns safe to load for a card. `storage_path` is absent on purpose. */
const CARD_COLUMNS =
  'id, title, description, pillar, category, kind, required_tier, duration_sec, is_published, sort_order, created_at';

interface RawRow {
  id: string;
  title: string;
  description: string | null;
  pillar: string | null;
  category: string | null;
  kind: string | null;
  required_tier: string | null;
  duration_sec: number | null;
  is_published: boolean | null;
}

function toCard(row: RawRow, locked: boolean): LibraryCard | null {
  // A row with no pillar cannot be placed. 0009 already makes this impossible
  // for published rows at the database level; this is the belt to that braces.
  // Dropping it is correct — there is no "Other" bucket to fall back to.
  if (!isPillar(row.pillar)) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pillar: row.pillar,
    category: row.category,
    kind: row.kind ?? 'video',
    requiredTier: (row.required_tier as Tier) ?? 'basic',
    durationSec: row.duration_sec,
    isPublished: Boolean(row.is_published),
    locked,
  };
}

function emptyCounts(): PillarCounts {
  const counts = { all: 0 } as PillarCounts;
  for (const key of PILLAR_KEYS) counts[key] = 0;
  return counts;
}

/**
 * The library for one member, optionally narrowed to one pillar.
 *
 * Filtering is done by Postgres (`.eq('pillar', …)`), not by fetching
 * everything and slicing it here. Counts come from a separate minimal
 * projection of `pillar` alone, so switching filters never re-downloads
 * descriptions.
 */
export async function getLibrary(
  session: Session,
  pillar: Pillar | null
): Promise<LibraryView> {
  // No Supabase configured. Show nothing rather than inventing content — the
  // library is production data or it is empty, never a demo fixture.
  if (DEMO_MODE) {
    return { resources: [], counts: emptyCounts(), unavailable: true };
  }

  const { createServerClient, createAdminClient } = await import('./supabase/server');
  // Cast to the narrow structural type this module needs. The generated
  // Supabase client types are far deeper than the four methods used here and
  // resolving them structurally blows TypeScript's instantiation limit.
  return buildLibraryView(session, pillar, {
    supabase: (await createServerClient()) as unknown as SupabaseLike,
    admin: (await createAdminClient()) as unknown as SupabaseLike,
  });
}

/**
 * The query logic behind getLibrary(), with the two clients passed in.
 *
 * Split out so the access rules can be exercised against stub clients in a
 * test — the alternative is asserting on a code reading, which proves nothing
 * about what the function actually returns. Not part of the page-facing API.
 */
export async function buildLibraryView(
  session: Session,
  pillar: Pillar | null,
  clients: { supabase: SupabaseLike; admin: SupabaseLike }
): Promise<LibraryView> {
  const { supabase, admin } = clients;

  const staff = session.role === 'admin' || session.role === 'coach';

  /* -- 1. ENTITLEMENT: which rows does Postgres let this user read? --------
     Ids only. Under the 0008 policy this returns published rows whose
     required_tier the user's tier covers, plus everything for staff. This set
     defines "unlocked" — nothing in TypeScript overrides it. */
  const { data: allowedRows, error: allowedError } = await supabase
    .from('training_resources')
    .select('id')
    .eq('is_published', true);

  if (allowedError) {
    console.error('[library] entitlement query failed:', allowedError.message);
  }
  const unlockedIds = new Set((allowedRows ?? []).map((r) => r.id as string));

  /* -- 2. COUNTS: one minimal projection over published rows -------------- */
  const { data: pillarRows, error: countError } = await admin
    .from('training_resources')
    .select('pillar')
    .eq('is_published', true);

  if (countError) {
    console.error('[library] count query failed:', countError.message);
  }

  const counts = emptyCounts();
  for (const row of pillarRows ?? []) {
    const key = row.pillar as string | null;
    if (isPillar(key)) {
      counts[key] += 1;
      counts.all += 1;
    }
  }

  /* -- 3. CARDS: filtered in the database, never in JavaScript ------------ */
  let query = admin
    .from('training_resources')
    .select(CARD_COLUMNS)
    .eq('is_published', true);

  if (pillar) query = query.eq('pillar', pillar);

  const { data: rows, error: rowsError } = await query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (rowsError) {
    console.error('[library] card query failed:', rowsError.message);
    return { resources: [], counts, unavailable: false };
  }

  const resources = (rows ?? [])
    .map((row) => toCard(row as unknown as RawRow, !staff && !unlockedIds.has(row.id as string)))
    .filter((card): card is LibraryCard => card !== null);

  return { resources, counts, unavailable: false };
}

/* ==========================================================================
   PLAYBACK
   ========================================================================== */

export type ResourceAccess =
  | { ok: true; resource: LibraryCard; signedUrl: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'locked'; requiredTier: Tier }
  | { ok: false; reason: 'unavailable' };

/** How long a playback URL stays valid. Long enough to watch, short enough that
 *  a copied link is worthless within the hour. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const BUCKET = 'training-resources';

/**
 * Resolve one resource for viewing, minting a signed URL only if the caller is
 * genuinely entitled.
 *
 * ORDER MATTERS. Authorization is decided before a URL exists at all, so there
 * is no branch where a URL is created and then withheld. Three independent
 * gates have to agree:
 *
 *   1. The row must be published (or the caller must be staff).
 *   2. hasTier() must pass — the same helper every other gated route uses.
 *   3. The signed URL is minted through the SESSION client, so the storage
 *      policy from 0008 authorizes the read. A service-role client would
 *      bypass storage RLS and prove nothing about production permissions.
 *
 * Failing any gate returns a reason and no URL. The caller renders an upgrade
 * prompt from that.
 */
export async function getResourceForViewing(
  session: Session,
  id: string
): Promise<ResourceAccess> {
  if (DEMO_MODE) return { ok: false, reason: 'unavailable' };

  const { createServerClient, createAdminClient } = await import('./supabase/server');
  const admin = await createAdminClient();

  const fetchRow = async () =>
    admin
      .from('training_resources')
      .select(`${CARD_COLUMNS}, storage_path`)
      .eq('id', id)
      .maybeSingle();

  const sign = async (path: string) => {
    const supabase = await createServerClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    return { signedUrl: data?.signedUrl ?? null, error: error ? { message: error.message } : null };
  };

  return resolveResourceAccess(session, { fetchRow, sign });
}

/** Row shape plus the storage path, as loaded by the service-role client. */
export interface RawRowWithPath extends RawRow {
  storage_path?: string | null;
}

export interface AccessDeps {
  fetchRow: () => Promise<{ data: RawRowWithPath | null; error: { message: string } | null }>;
  sign: (path: string) => Promise<{ signedUrl: string | null; error: { message: string } | null }>;
}

/**
 * The gate sequence behind getResourceForViewing(), with row loading and URL
 * signing injected.
 *
 * Separated so a test can prove that `sign` is never even CALLED on an
 * unauthorized path — which is a stronger guarantee than checking that the
 * returned object lacks a URL, and is the property that actually matters.
 */
export async function resolveResourceAccess(
  session: Session,
  deps: AccessDeps
): Promise<ResourceAccess> {
  const { data: row, error } = await deps.fetchRow();

  if (error || !row) return { ok: false, reason: 'not_found' };

  const staff = session.role === 'admin' || session.role === 'coach';

  // GATE 1 — drafts are invisible to members, whatever their tier.
  if (!row.is_published && !staff) return { ok: false, reason: 'not_found' };

  const card = toCard(row as unknown as RawRow, false);
  if (!card) return { ok: false, reason: 'not_found' };

  // GATE 2 — tier. hasTier() already returns true for admins.
  if (!hasTier(session, card.requiredTier)) {
    return { ok: false, reason: 'locked', requiredTier: card.requiredTier };
  }

  const path = row.storage_path;
  if (!path || path === 'pending') return { ok: false, reason: 'not_found' };

  // GATE 3 — storage RLS. Signed through the user's own session, and only
  // reached once gates 1 and 2 have already passed.
  const { signedUrl, error: signError } = await deps.sign(path);

  if (signError || !signedUrl) {
    console.error('[library] signed url failed:', signError?.message);
    return { ok: false, reason: 'unavailable' };
  }

  return { ok: true, resource: { ...card, locked: false }, signedUrl };
}
