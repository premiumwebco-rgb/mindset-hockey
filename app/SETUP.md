# Mindset Hockey — Setup

Next.js 15 (App Router) + Supabase + Stripe + a vision model.
One app serves both the public marketing site and the authenticated member portal.

> **Current state: no backend is connected.**
> There is no Supabase project, no `.env.local`, and no Stripe configuration
> yet. The app runs in **demo mode** until you create them — every screen is
> walkable with seed data and no credentials. Nothing in this document should be
> read as "already working"; it is what you need to do, not a description of a
> configured system.

---

## What's in the box

| Area | Status |
|---|---|
| Marketing site (9 routes) | Built, renders, verified locally |
| Member portal, auth flows, RBAC | Code complete — **never run against a real database** |
| Stripe checkout + webhooks | Code complete — **never run against real Stripe** |
| AI Shot Analysis | Code complete — **never run against a real model** |
| Migrations 0001–0004 | Written — **not applied anywhere** |

Everything below the first row is unverified at runtime. `RUNBOOK.md` is the
step-by-step for proving each piece actually works.

---

## Pricing (current, canonical)

| Plan | Setup (one-time) | Monthly | AI Shot Analysis |
|---|---|---|---|
| **Standard** | $249 | $100 | **Included** |
| **Premium** | $389 | $149 | **Included** |
| Private on-ice session | — | $149 per session | n/a |

**AI Shot Analysis is included with both plans.** It is not a Premium upsell.
Premium adds the customized training program, performance nutrition guidance,
video analysis and breakdowns, advanced tracking, mindset development, priority
support and monthly coaching review sessions.

Internally the tier enum is `basic` (= Standard) and `premium`. The `basic`
value predates the Standard rename and is load-bearing in the database enum and
RLS policies — the display label is Standard everywhere the member sees it.
Do not rename the enum without a migration.

---

## 1. Install

```bash
cd mindset-hockey/app
npm install
```

Node 18.17+ (20 LTS recommended). Confirm with `node -v`.

## 2. Run in demo mode

```bash
npm run dev
```

With no `NEXT_PUBLIC_SUPABASE_URL` set, `lib/session.ts` flips `DEMO_MODE` on:
routes render with seed data, auth is stubbed, and anything requiring a backend
says so plainly rather than pretending. Uploads and AI analysis are disabled in
this mode by design — they do not fake a result.

## 3. Environment

Copy the template and fill it in:

```bash
cp .env.example .env.local
```

`.env.local` is gitignored and must never be committed.

### Required for a working backend

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only — bypasses RLS, never expose
```

### Required for billing

```
STRIPE_SECRET_KEY=              # use a TEST-mode key while verifying
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_SETUP=      # $249 — must be ONE-TIME
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=    # $100/month
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_SETUP=       # $389 — must be ONE-TIME
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=     # $149/month
```

> **The single most expensive mistake available here:** creating a setup-fee
> price as *Recurring* instead of *One-time* in the Stripe dashboard. That bills
> a family $249 or $389 every month. Verify the price type in Stripe before
> taking a real payment, and check the checkout total reads
> "$349 due today, then $100/month" (Standard) or "$538 due today, then
> $149/month" (Premium).

### Optional — AI Shot Analysis

```
ANTHROPIC_API_KEY=              # or OPENAI_API_KEY
```

**With no key set the feature still works end to end.** Video uploads and
stores normally, and the analysis is routed to the coach review queue with
status `in_review`. It never invents scores to fill the report. See
`.env.example` for the cost-control variables (`AI_ANALYSES_PER_DAY` etc.),
all of which have working defaults.

None of the AI variables are `NEXT_PUBLIC_` — they are read only by
`lib/ai/analyzer.ts`, which throws if it is ever imported into client code.

## 4. Database

Four migrations in `supabase/migrations/`, applied **in order** via the Supabase
SQL Editor:

| File | What it does |
|---|---|
| `0001_init.sql` | Base schema |
| `0002_membership_platform.sql` | Profiles, subscriptions, RLS, storage buckets |
| `0003_reconcile_tables.sql` | **Not optional.** Fixes four tables declared in both 0001 and 0002 — `create table if not exists` silently skips the second definition, leaving columns the app writes to missing. |
| `0004_ai_shot_analysis.sql` | Opens AI Shot Analysis to Standard, adds the storage/result columns, adds the usage ledger |

`RUNBOOK.md` Stage 4 has the verification queries. Do not assume a migration
applied because the file exists locally.

## 5. Storage

Two **private** buckets, created by the migrations: `member-videos` and
`analysis-frames`. Objects live at `<user-uuid>/<analysis-id>/<file>`; the first
path segment is the owner and storage RLS compares it to `auth.uid()`. Playback
uses short-lived signed URLs minted server-side. Never make these buckets public
— they contain video of minors.

---

## Architecture notes

**RLS is the security boundary.** The middleware and the `requireFeature()`
guards are UX: they redirect people to somewhere sensible. They are not what
stops a Standard member reading Premium data. The Postgres policies are. Any
test that only proves "the UI redirected me" has proved nothing about security —
`RUNBOOK.md` Stage 8.3 is the test that counts.

**Feature gating has one source of truth:** `FEATURE_MIN_TIER` in
`lib/plans.ts`, mirrored by the RLS policies. Change one, change both.

**The marketing site uses the original CSS/JS**, served from `public/assets/`
rather than rebuilt in Tailwind, so the design is pixel-identical to the
approved static site. `site/` remains the source of truth for that markup.
`components/marketing/MarketingScripts.tsx` re-runs the reveal/forms/video
bindings after client-side navigation — without it, `.rv` content stays at
`opacity: 0` and pages appear empty below the header.

---

## Commands

```bash
npm run dev          # demo mode unless .env.local is configured
npm run build        # production build
npm run start        # serve the build
npx tsc --noEmit     # types only
```
