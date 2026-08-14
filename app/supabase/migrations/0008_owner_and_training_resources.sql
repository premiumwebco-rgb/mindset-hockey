-- ============================================================================
-- 0008 — OWNER USAGE TAGGING  +  TRAINING RESOURCE STORAGE
--
-- WHAT WAS ALREADY IN PLACE (audited, unchanged)
--   * `user_role` enum with 'admin' (0001)
--   * auth_is_admin() / auth_is_staff() SECURITY DEFINER helpers (0002)
--   * auth_has_tier() already returns TRUE for role='admin' (0002), so every
--     tier-gated policy already passes for the owner
--   * hasTier() in lib/session.ts already short-circuits on role='admin'
--   * reserveAnalysis() already treats isAdmin as an infinite allowance
--
-- Owner privilege therefore already exists. This migration closes the two
-- genuine gaps found in the audit.
--
-- GAP 1 — OWNER ANALYSES POLLUTED CUSTOMER QUOTA ACCOUNTING
--   An owner's ai_usage rows were written with entitlement_source='included',
--   i.e. tagged as if they had come out of a customer weekly allowance. It did
--   no harm while the role stayed admin (infinite limit), but it meant owner
--   activity was indistinguishable from paying-customer activity in every
--   quota and revenue query, and if the role were ever changed those rows
--   would retroactively count against the account. A third source value fixes
--   it cleanly.
--
-- GAP 2 — NOWHERE TO PUT TRAINING RESOURCES
--   Only 'member-videos' and 'analysis-frames' existed, both scoped to
--   <user-uuid>/... ownership. There was no bucket for coach-authored training
--   videos, PDFs or images, and no storage policy that would let staff write
--   one. Admin uploads would have failed in production with an RLS denial.
--
-- Additive only. No existing table, column or policy is dropped.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. OWNER USAGE IS TRACKED BUT NEVER CHARGED
--
-- 'owner' rows are counted by NEITHER the weekly-allowance query (which filters
-- entitlement_source='included') NOR the credit query (which filters
-- ='purchased'). So an owner analysis consumes no entitlement and decrements
-- no credit — while still producing a full ai_usage row carrying provider,
-- model, tokens and estimated cost, so AI spend monitoring stays accurate.
-- ---------------------------------------------------------------------------
comment on column ai_usage.entitlement_source is
  'included = customer weekly allowance | purchased = free-signup or paid credit | owner = admin/owner run, tracked for cost but never charged to any quota.';

-- Cost reporting that separates real customer demand from owner testing.
create index if not exists ai_usage_owner_idx
  on ai_usage (created_at desc)
  where entitlement_source = 'owner';

-- ---------------------------------------------------------------------------
-- 2. TRAINING RESOURCE BUCKET
--
-- PRIVATE, like every other bucket here. Training content is paid product;
-- serving it from a public URL would let anyone with the link bypass the
-- membership entirely. Playback uses short-lived signed URLs minted
-- server-side, exactly as member video already does.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-resources',
  'training-resources',
  false,
  -- 500 MB. Coach film is large; the default project limit is far smaller and
  -- would reject a real training video.
  524288000,
  array[
    'video/mp4','video/quicktime','video/webm',
    'application/pdf',
    'image/jpeg','image/png','image/webp'
  ]
)
on conflict (id) do nothing;

-- Idempotent hardening, in case the bucket already existed with other settings.
-- `public = false` is the important one: never leave paid content
-- world-readable. The size and MIME limits are enforced by Storage itself, so
-- they hold even if the API route were bypassed.
update storage.buckets
   set public = false,
       file_size_limit = 524288000,
       allowed_mime_types = array[
         'video/mp4','video/quicktime','video/webm',
         'application/pdf',
         'image/jpeg','image/png','image/webp'
       ]
 where id = 'training-resources';

-- NOTE FOR DEPLOYMENT: Supabase also enforces a PROJECT-WIDE upload limit that
-- overrides any bucket setting. It defaults well below 500 MB. Raise it under
-- Storage -> Settings -> "Upload file size limit", or large videos will be
-- rejected before this bucket limit is ever consulted.

-- ---------------------------------------------------------------------------
-- 3. STORAGE POLICIES FOR TRAINING RESOURCES
--
-- Deliberately a DIFFERENT ownership model from member-videos. Member videos
-- are owned by the member and keyed on <user-uuid>/... . Training resources are
-- owned by the BUSINESS: staff write them, members only read.
--
-- WRITE  staff only (auth_is_staff() = admin or coach)
-- READ   any member with an active entitlement, plus staff
-- DELETE admin only — a coach should not be able to destroy the library
-- ---------------------------------------------------------------------------

drop policy if exists training_resources_staff_write on storage.objects;
create policy training_resources_staff_write on storage.objects
  for insert with check (
    bucket_id = 'training-resources'
    and auth_is_staff()
  );

drop policy if exists training_resources_staff_update on storage.objects;
create policy training_resources_staff_update on storage.objects
  for update using (
    bucket_id = 'training-resources'
    and auth_is_staff()
  );

drop policy if exists training_resources_staff_delete on storage.objects;
create policy training_resources_staff_delete on storage.objects
  for delete using (
    bucket_id = 'training-resources'
    and auth_is_admin()
  );

-- Read: entitled members and staff. auth_has_tier('basic') already returns
-- true for admins, so the owner reads everything without a special case.
drop policy if exists training_resources_member_read on storage.objects;
create policy training_resources_member_read on storage.objects
  for select using (
    bucket_id = 'training-resources'
    and (auth_has_tier('basic') or auth_is_staff())
  );

-- ---------------------------------------------------------------------------
-- 4. TRAINING RESOURCE CATALOGUE
--
-- The existing content tables (drills, tracks, modules, lessons, workout_plans,
-- meal_plans, mindset_lessons, nutrition_resources) hold structured curriculum.
-- None of them models "a file the coach uploaded", which is what an uploaded
-- video or PDF is. This table records the uploaded asset and links it to the
-- storage object.
-- ---------------------------------------------------------------------------
create table if not exists training_resources (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,

  -- video | pdf | image | other
  kind          text not null default 'video',
  -- Free-form grouping the owner controls (e.g. 'Shooting', 'Edges').
  category      text,

  -- Object path inside the 'training-resources' bucket. Never a public URL.
  storage_path  text not null,
  mime_type     text,
  size_bytes    bigint,

  -- Minimum tier required to view. Mirrors the content tables' convention.
  required_tier tier_t not null default 'basic',
  is_published  boolean not null default false,
  sort_order    int not null default 0,

  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists training_resources_category_idx
  on training_resources (category, sort_order);
create index if not exists training_resources_published_idx
  on training_resources (is_published, required_tier);

alter table training_resources enable row level security;

-- Members see published resources their tier covers. Staff see everything,
-- including unpublished drafts.
drop policy if exists training_resources_read on training_resources;
create policy training_resources_read on training_resources
  for select using (
    (is_published and auth_has_tier(required_tier)) or auth_is_staff()
  );

-- Only staff may create or edit. No member write path of any kind.
drop policy if exists training_resources_staff_write on training_resources;
create policy training_resources_staff_write on training_resources
  for all using (auth_is_staff()) with check (auth_is_staff());

comment on table training_resources is
  'Coach-authored training assets (video/PDF/image) stored in the private training-resources bucket. Staff write, entitled members read.';

-- ============================================================================
-- VERIFY
-- ============================================================================
--   -- bucket must be private
--   select id, public from storage.buckets where id = 'training-resources';
--   -- expect public = false
--
--   -- owner analyses are tracked but charged to nothing
--   select entitlement_source, count(*), sum(estimated_cost_usd)
--     from ai_usage group by entitlement_source;
--
--   -- confirm your account is the owner
--   select email, role, tier from profiles where role = 'admin';
-- ============================================================================
