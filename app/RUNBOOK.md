# Runtime Verification Runbook

From **untested** to **ready for launch**. Nothing below is verified — you are the first
person to execute this code. Work top to bottom; each stage assumes the previous one
passed.

Mark each box only after you have seen the expected result with your own eyes.

**Current state, honestly stated.** As of this writing there is **no Supabase project,
no `.env.local`, and no Stripe configuration**. Migrations 0001-0004 exist as files and
have **not been applied to any database**. The app compiles, builds, and runs in demo
mode; nothing beyond that has been executed. Treat every stage below as NOT TESTED until
you personally see it pass.

**Pricing used throughout:** Standard $249 setup + $100/month, Premium $389 setup +
$149/month, private on-ice sessions $149. Internally the tier enum is `basic`
(= Standard) and `premium`; the enum name predates the rename and is load-bearing in RLS.

**AI Shot Analysis is included with BOTH plans.** Stage 11 has been rewritten for the
current implementation, which does store the source video (the old gap is closed).
Stage 12 (video review submissions) still stores only a filename — that one is genuinely
incomplete and is marked where it bites.

```bash
cd mindset-hockey/app          # every command below runs from here
```

---

## Stage 1 — Install dependencies

```bash
node -v        # need v18.17+ ; v20 or v22 recommended
npm -v
npm install
```

**Expected:** `added ~350 packages` and a `node_modules/` directory. Warnings about
deprecated transitive packages are normal. **Zero** `npm ERR!` lines.

**Failure — `EBADENGINE`**
Your Node is too old. Install Node 20 LTS from nodejs.org, reopen the terminal, re-run.

**Failure — `ERESOLVE could not resolve`**
A peer-dependency conflict, most likely React 19 vs a package expecting 18.

```bash
npm install --legacy-peer-deps
```

**Failure — `EACCES` / permission denied**
Never fix this with `sudo`. Fix ownership instead:

```bash
sudo chown -R $(whoami) ~/.npm
```

- [ ] **1.1** `npm install` completes with no errors
- [ ] **1.2** `node_modules/next`, `node_modules/@supabase/ssr`, `node_modules/stripe` all exist

---

## Stage 2 — TypeScript and first build

Do this *before* configuring anything. It runs in demo mode and isolates code errors from
config errors.

```bash
npx tsc --noEmit
```

**Expected:** no output at all. That means zero type errors.

**This is the step most likely to produce a list of errors.** I could not run the compiler,
so treat any output as expected work, not a disaster. Fix top-down — one root cause often
clears ten messages.

Most likely categories and their fixes:

| Error | Cause | Fix |
|---|---|---|
| `Property 'x' does not exist on type 'Y'` | Supabase query returns `any`/union | Cast the row: `(data as MyRow[])` |
| `Type 'string' is not assignable to type 'Tier'` | Plain string where an enum is wanted | `as Tier` or widen the type |
| `'X' is possibly 'null'` | Supabase returns `T \| null` | Guard with `if (!x) return` or `?.` |
| `No overload matches this call` on `stripe.…` | SDK types vs pinned `apiVersion` | See Stage 5.4 |
| `Cannot find module '@/…'` | Path alias | Confirm `tsconfig.json` has `"@/*": ["./*"]` |

Then:

```bash
npm run build
```

**Expected:** `✓ Compiled successfully`, then a route table listing ~34 routes, ending
`○ (Static)` / `ƒ (Dynamic)` legend.

**Failure — `Error: Dynamic server usage`**
A page using `cookies()` is being statically rendered. Add to that page:
`export const dynamic = 'force-dynamic';`

**Failure — `useActionState is not exported from 'react'`**
React below 19. Check `npm ls react` shows 19.x.

**Failure — build hangs at "Collecting page data"**
Usually a top-level `await` on a missing env var. Confirm `.env.local` doesn't exist yet
(demo mode should need nothing).

- [ ] **2.1** `npx tsc --noEmit` exits clean
- [ ] **2.2** `npm run build` prints "Compiled successfully"
- [ ] **2.3** Route table lists `/dashboard`, `/analysis`, `/admin`, `/upgrade`

---

## Stage 3 — Run in demo mode and walk every route

Demo mode needs no backend. This proves the UI renders before any integration exists.

```bash
npm run dev
```

Open `http://localhost:3000`.

Visit each route and confirm it renders without a red error overlay:

| # | Route | Expect |
|---|---|---|
| 1 | `/` | Marketing homepage, pricing cards (Standard $249+$100, Premium $389+$149) |
| 2 | `/login` | Form + amber "Demo mode" panel |
| 3 | `/signup?plan=premium` | Signup form, Premium copy |
| 4 | `/forgot-password` | Reset form |
| 5 | `/dashboard` | Welcome header, four stat cards |
| 6 | `/analysis` | One demo analysis, score 71 |
| 7 | `/analysis/demo-1` | Full report, scored breakdown, "Do this next" |
| 8 | `/analysis/new` | Drag-and-drop uploader |
| 9 | `/reviews` | Two demo submissions |
| 10 | `/reviews/new` | Submission form |
| 11 | `/workouts` | Four plan cards |
| 12 | `/nutrition` | Three meal plan cards |
| 13 | `/mindset` | Eight lessons, 2 complete, progress bar |
| 14 | `/progress` | Stat cards + two SVG trend charts |
| 15 | `/library` | Lesson list |
| 16 | `/drills` | Drill database |
| 17 | `/shot-course` | Rubric course |
| 18 | `/pro-breakdowns` | Reference clips |
| 19 | `/upgrade` | Two plan cards + Custom |
| 20 | `/account` | Profile + membership panels |
| 21 | `/account/password` | Change-password form |
| 22 | `/admin` | Overview, MRR $5,350 |
| 23 | `/admin/users` | Three demo users |
| 24 | `/admin/subscriptions` | Two demo subs |
| 25 | `/admin/leads` | One demo lead |
| 26 | `/admin/content` | Four content counts |
| 27 | `/coach/queue` | Review queue |

Also check: the sidebar shows **Sign out**, and switching tier via the demo cookie changes
which items show a padlock.

**Failure — "Cannot read properties of undefined"**
A demo fixture is missing a field a component reads. The overlay names the file and line.

**Failure — page is blank but no error**
Check the terminal, not the browser. Server component errors print there.

- [ ] **3.1** All 27 routes render
- [ ] **3.2** No errors in the browser console
- [ ] **3.3** No errors in the terminal

---

## Stage 4 — Connect Supabase

### 4.1 Create the project

supabase.com → New project. Save the database password. Wait for provisioning (~2 min).

### 4.2 Get the keys

Project Settings → **API**:

| Field | Goes to |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

The `service_role` key bypasses all RLS. It must never reach the browser or a git commit.

### 4.3 Create `.env.local`

```bash
cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://YOURREF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

`.env.local` is already gitignored by Next. Confirm: `git check-ignore -v .env.local`.

### 4.4 Run the migrations — order matters

Supabase Dashboard → **SQL Editor** → New query. Run each file's full contents, in order,
as three separate queries:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_membership_platform.sql`
3. `supabase/migrations/0003_reconcile_tables.sql` ← **do not skip**

> **Why 0003 exists.** `subscriptions`, `video_submissions`, `analysis_reviews` and `leads`
> are declared in *both* 0001 and 0002. Because 0002 uses `create table if not exists`,
> Postgres silently keeps the 0001 shape, and the app then writes to columns that don't
> exist. 0003 reconciles them. **Skip it and the Stripe webhook, video review and admin
> leads page will all fail at runtime.**

Verify:

```sql
select table_name, count(*) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles','subscriptions','shot_analyses','video_submissions',
                     'analysis_reviews','leads','workout_plans','mindset_lessons','metrics')
group by table_name order by table_name;
```

**Expected:** nine rows. Then confirm the reconciliation actually applied:

```sql
select
  (select count(*) from information_schema.columns
    where table_name='subscriptions' and column_name='setup_fee_paid') as sub_setup_fee,
  (select count(*) from information_schema.columns
    where table_name='video_submissions' and column_name='title') as vs_title,
  (select count(*) from information_schema.columns
    where table_name='analysis_reviews' and column_name='analysis_id') as ar_analysis_id,
  (select count(*) from information_schema.columns
    where table_name='leads' and column_name='handled') as leads_handled;
```

**Expected:** `1 | 1 | 1 | 1`. Any `0` means 0003 didn't run — go back.

### 4.5 Confirm RLS is on

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```

**Expected:** `rowsecurity = true` on every application table. Any `false` is a data leak.

### 4.6 Confirm the storage buckets exist

```sql
select id, public from storage.buckets;
```

**Expected:** `member-videos | false` and `analysis-frames | false`. **`public` must be
`false`** — `true` means anyone with the URL can watch members' videos.

- [ ] **4.1** Project created, keys copied
- [ ] **4.2** `.env.local` created and gitignored
- [ ] **4.3** All three migrations ran without error
- [ ] **4.4** Column-check query returns `1 | 1 | 1 | 1`
- [ ] **4.5** `rowsecurity = true` on every table
- [ ] **4.6** Both buckets exist and are private

---

## Stage 5 — Connect Stripe

### 5.1 Test mode

Stripe Dashboard → toggle **Test mode** on (top right). Everything below uses test keys —
they start `sk_test_` / `pk_test_`.

### 5.2 Create two products, four prices

Products → Add product.

**Product 1: "Basic Program"**
- Price A: `249.00 USD`, **One-time** → copy id → `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_SETUP`
- Price B: `100.00 USD`, **Recurring · Monthly** → `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY`

**Product 2: "Premium Program"**
- Price C: `849.00 USD`, **One-time** → `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_SETUP`
- Price D: `250.00 USD`, **Recurring · Monthly** → `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY`

> **The single most expensive mistake in this whole document:** if a *setup* price is
> created as **Recurring** instead of **One-time**, members are charged **$389 every
> month**. Open each setup price and confirm it reads "One time" before continuing.

### 5.3 Add keys to `.env.local`

```bash
cat >> .env.local <<'EOF'

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_SETUP=price_...
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_SETUP=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
EOF
```

### 5.4 Verify the pinned API version matches the SDK

`lib/stripe.ts` pins `apiVersion: '2024-12-18.acacia'`.

```bash
npm ls stripe
```

If TypeScript complains that the version string isn't assignable, the installed SDK expects
a different one. Read the expected literal out of the error and update `lib/stripe.ts` to
match. Do **not** delete the `apiVersion` line — pinning is what stops a future Stripe
change breaking you silently.

### 5.5 Forward webhooks locally

Install the CLI (`brew install stripe/stripe-cli/stripe`, or download for Windows), then:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints `> Ready! Your webhook signing secret is whsec_...`. Add it:

```bash
echo 'STRIPE_WEBHOOK_SECRET=whsec_...' >> .env.local
```

**Leave `stripe listen` running in its own terminal for all of Stage 9 and 10.**

Restart `npm run dev` after any `.env.local` change — Next only reads it at boot.

- [ ] **5.1** Four prices created
- [ ] **5.2** Both setup prices confirmed **One-time**
- [ ] **5.3** All five Stripe vars in `.env.local`
- [ ] **5.4** `stripe listen` running, `whsec_` captured

---

## Stage 6 — Production build with real config

```bash
npm run build && npm start
```

**Expected:** builds, then serves on `:3000`. Demo mode is now **off** — visiting
`/dashboard` should bounce you to `/login`.

**If it does not redirect, stop.** Middleware isn't seeing your Supabase env vars, and
every access-control test below would be meaningless.

**Failure — `Invalid API key`**
Anon key is truncated. They're long — re-copy the whole thing.

**Failure — `fetch failed` at build**
A page is calling Supabase during static generation. Add
`export const dynamic = 'force-dynamic';` to that page.

For the rest of the runbook use `npm run dev` (faster feedback).

- [ ] **6.1** Production build succeeds with real env vars
- [ ] **6.2** `/dashboard` redirects to `/login` when signed out

---

## Stage 7 — Authentication

### 7.1 Turn off email confirmation (test only)

Supabase → Authentication → Providers → Email → **disable "Confirm email"**. This lets
signup return a session immediately. Turn it back **on** before launch.

### 7.2 Create three accounts

At `http://localhost:3000/signup?plan=basic`, register:

| Email | Password |
|---|---|
| `basic@test.com` | `TestPass123!` |
| `premium@test.com` | `TestPass123!` |
| `admin@test.com` | `TestPass123!` |

**Expected:** each redirects to `/onboarding`.

Confirm rows were created by the trigger:

```sql
select email, role, tier, subscription_active from profiles order by created_at;
```

**Expected:** three rows, all `member / none / false`.

**Failure — no rows in `profiles`**
The `on_auth_user_created` trigger didn't fire. Check:

```sql
select tgname from pg_trigger where tgname = 'on_auth_user_created';
```

Missing → re-run the last section of `0002_membership_platform.sql`.

### 7.3 Assign roles and tiers

```sql
update profiles set tier='basic',   subscription_active=true              where email='basic@test.com';
update profiles set tier='premium', subscription_active=true              where email='premium@test.com';
update profiles set role='admin',   tier='premium', subscription_active=true where email='admin@test.com';
select email, role, tier, subscription_active from profiles order by email;
```

### 7.4 Login

Sign out, then log in as `basic@test.com`.

**Expected:** lands on `/dashboard`; sidebar shows "Basic" with a green dot.

**Failure — "That email and password combination is not right"** with correct credentials
Email confirmation is still on. Either disable it (7.1) or confirm the user manually in
Authentication → Users.

### 7.5 Session persistence

Hard-refresh (`Cmd/Ctrl+Shift+R`). Close the tab, reopen `localhost:3000/dashboard`.

**Expected:** still logged in both times.

**Failure — logged out on refresh**
Middleware isn't refreshing the cookie. Confirm `middleware.ts` is at the project root
(not inside `app/`).

### 7.6 Logout

Click **Sign out** in the sidebar.

**Expected:** redirected to `/login`. Manually visiting `/dashboard` bounces you back.

### 7.7 Password reset

Turn email confirmation back **on** first, or Supabase won't send mail.

Go to `/forgot-password`, submit `basic@test.com`.

**Expected:** green message "If an account exists…". Check Supabase → Authentication →
Logs, or your inbox. Follow the link → lands on `/account/password` → set a new password →
log in with it.

**Expected:** the same green message for an address that does *not* exist. If the wording
differs, that's an account-enumeration leak — report it.

**Failure — no email arrives**
Supabase's built-in SMTP is heavily rate-limited (a few per hour). For real use configure
custom SMTP under Project Settings → Auth.

- [ ] **7.1** Three accounts created, `profiles` rows exist
- [ ] **7.2** Roles/tiers assigned
- [ ] **7.3** Login works
- [ ] **7.4** Session survives refresh and tab close
- [ ] **7.5** Logout works and protection re-engages
- [ ] **7.6** Password reset completes end to end
- [ ] **7.7** Reset response is identical for unknown addresses

---

## Stage 8 — Role permissions

### 8.1 Basic member is locked out — UI layer

Log in as `basic@test.com`. Type each URL directly into the address bar:

| URL | Expected |
|---|---|
| `/analysis` | → `/upgrade?need=premium&f=ai_shot_analysis` |
| `/analysis/new` | → `/upgrade` |
| `/workouts` | → `/upgrade` |
| `/nutrition` | → `/upgrade` |
| `/mindset` | → `/upgrade` |
| `/reviews` | → `/upgrade` |
| `/admin` | → `/dashboard` |
| `/dashboard` | ✅ loads |
| `/progress` | ✅ loads, charts replaced by an upgrade card |

**Failure — a premium page renders for Basic**
`requireFeature` isn't being called. Check the top of that page's component.

### 8.2 Basic member is locked out — API layer

UI redirects are cosmetic. Test the API directly. In DevTools → Console, while logged in
as Basic:

```js
await fetch('/api/analysis', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ frames: [{ base64: 'x', mediaType: 'image/jpeg', timestampMs: 0 }] })
}).then(r => r.status)
```

**Expected:** `307` or `302` (redirect from the guard) — **never `200`**.

```js
await fetch('/api/admin/user', {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'any', role: 'admin' })
}).then(r => r.status)
```

**Expected:** redirect. **A `200` here means a member can make themselves an admin.** Stop
everything and fix it.

### 8.3 Basic member is locked out — database layer

This is the one that actually matters. UI and API can both be bypassed; RLS cannot.

Still logged in as Basic, in the browser console:

```js
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const sb = createClient(
  'https://YOURREF.supabase.co',
  'YOUR_ANON_KEY',
  { global: { headers: { Authorization: 'Bearer ' + JSON.parse(
      Object.entries(localStorage).find(([k]) => k.includes('auth-token'))[1]
    ).access_token } } }
);
console.log(await sb.from('shot_analyses').select('*'));
console.log(await sb.from('workout_plans').select('*'));
console.log(await sb.from('mindset_lessons').select('*'));
```

**Expected:** `data: []` for all three. Empty array, not an error — that's RLS filtering
rows, which is exactly right.

**Failure — rows come back**
RLS is not enforcing. Re-run the policy section of `0002`, and re-check
`select tablename, rowsecurity from pg_tables`.

### 8.4 Forged cookie

Log out. In DevTools → Application → Cookies, add `mh_tier` = `premium` and `mh_role` =
`admin`. Reload `/dashboard`.

**Expected:** still redirected to `/login`. Those cookies only do anything in demo mode,
which is off.

### 8.5 Premium and Admin

Log in as `premium@test.com` — all six premium routes load, `/admin` redirects away.

Log in as `admin@test.com` — everything loads, including `/admin/*` and `/coach/queue`.

On `/admin/users`, change a user's tier in the dropdown, then verify it stuck:

```sql
select email, tier, role, subscription_active from profiles order by email;
select action, target_id, meta, created_at from audit_log order by created_at desc limit 5;
```

**Expected:** the profile changed *and* an `admin.user.update` row appears in `audit_log`.

Also confirm the self-demotion guard: as admin, try setting **your own** role to `member`.

**Expected:** error "You cannot remove your own admin role."

- [ ] **8.1** All six premium routes redirect for Basic
- [ ] **8.2** `/api/analysis` and `/api/admin/user` refuse Basic
- [ ] **8.3** RLS returns `[]` for premium tables — **the critical test**
- [ ] **8.4** Forged cookies grant nothing
- [ ] **8.5** Premium sees premium; Admin sees all; audit log writes; self-demotion blocked

---

## Stage 9 — Subscription upgrade

Reset a test user so checkout has something to do:

```sql
update profiles set tier='none', subscription_active=false where email='basic@test.com';
```

### 9.1 Basic checkout

Log in as `basic@test.com` → `/upgrade` → **Get Started** on Basic.

**Expected:** redirect to Stripe Checkout showing **two line items**:

```
Standard Program         $100.00 / month
Standard Program         $249.00        ← one-time
Total due today          $349.00
```

> **If the total says `$349.00/month`, your setup price is Recurring.** Stop, fix it in
> Stripe (Stage 5.2), and start over.

Pay with `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.

**Expected:** redirect to `/onboarding?checkout=success`.

### 9.2 Webhook fired

Watch the `stripe listen` terminal.

**Expected:** `checkout.session.completed [evt_...]` → `200`.

**Failure — `400 Invalid signature`**
`STRIPE_WEBHOOK_SECRET` doesn't match the running `stripe listen`. Re-copy it and restart
`npm run dev`.

**Failure — no event at all**
`stripe listen` isn't pointed at the right port.

### 9.3 Entitlement applied

```sql
select email, tier, subscription_active, setup_fee_paid_at, stripe_customer_id
from profiles where email='basic@test.com';

select tier, status, setup_fee_paid, setup_fee_amount, current_period_end
from subscriptions order by created_at desc limit 1;

select id, type, processed_at from stripe_events order by processed_at desc limit 3;
```

**Expected:**
- profile: `basic / true / <timestamp> / cus_...`
- subscription: `basic / active / true / 80000` (cents)
- one `checkout.session.completed` row in `stripe_events`

**Failure — `column "setup_fee_paid" does not exist`**
Migration `0003` was skipped. Go back to Stage 4.4.

### 9.4 Idempotency

```bash
stripe events resend evt_XXXXXXXX     # the id from your terminal
```

**Expected:** `{"received":true,"duplicate":true}` and **no second row** in
`subscriptions`.

### 9.5 Premium checkout

Repeat with `premium@test.com` and the Premium plan. Expect `$389` + `$149/month`,
`total due today $538.00`, and `tier='premium'` afterwards.

Confirm the member can now reach `/analysis`, `/workouts`, `/nutrition`, `/mindset`,
`/reviews`.

- [ ] **9.1** Standard checkout shows $249 one-time + $100/month
- [ ] **9.2** Setup fee is **not** recurring
- [ ] **9.3** Webhook returns 200
- [ ] **9.4** Profile and subscription rows correct
- [ ] **9.5** Replayed event is ignored
- [ ] **9.6** Premium checkout correct, premium routes unlock

---

## Stage 10 — Cancellation and failed payment

### 10.1 Cancel

`/account` → **Manage Billing** → Stripe portal → Cancel plan → **immediately**, not at
period end.

**Expected in `stripe listen`:** `customer.subscription.deleted` → `200`.

```sql
select email, tier, subscription_active from profiles where email='premium@test.com';
select status from subscriptions order by updated_at desc limit 1;
```

**Expected:** `subscription_active = false`, status `canceled`. Note `tier` deliberately
stays `premium` so the UI can offer a reactivate CTA — access is governed by
`subscription_active`, not by tier.

### 10.2 Access revoked immediately

Still logged in as that user, reload `/analysis`.

**Expected:** redirected to `/upgrade`. No re-login required.

Then the database check — the one that proves it:

```js
console.log(await sb.from('shot_analyses').select('*'));   // console snippet from 8.3
```

**Expected:** `data: []`. Their own previously-created rows are now unreadable, because
`auth_has_tier()` requires `subscription_active`.

**Failure — content still accessible**
Either the webhook didn't fire, or `auth_has_tier` isn't checking `subscription_active`.
Check `audit_log` for an `entitlement.revoked` row.

### 10.3 Failed payment

Reactivate, then in Stripe test mode swap the customer's card to `4000 0000 0000 0341`
(attaches fine, fails on charge). Force a renewal:

```bash
stripe trigger invoice.payment_failed
```

**Expected:** webhook 200, `subscription_active` → `false`, premium locked.

Real behaviour differs slightly: Stripe first marks `past_due` and retries per your
dunning settings. Only `active`/`trialing` grant access, so `past_due` locks the account
immediately. Decide whether that's the customer experience you want, or whether you'd
rather add a grace period.

- [ ] **10.1** Cancellation webhook fires and flips `subscription_active`
- [ ] **10.2** Premium routes lock without re-login
- [ ] **10.3** RLS returns `[]` post-cancellation — **the critical test**
- [ ] **10.4** Failed payment revokes access
- [ ] **10.5** `entitlement.revoked` appears in `audit_log`

---

## Stage 11 — AI Shot Analysis

**Included with BOTH Standard and Premium.** A Standard member must be able to reach
`/analysis` and run an analysis; if they cannot, migration 0004 has not applied.

**What changed since the earlier draft of this runbook:** the source video is now
genuinely uploaded to the private `member-videos` bucket, playback uses signed URLs, and
deleting an analysis deletes the object too. The old "frames only, filename in
`video_path`" gap is closed.

**What to expect with no AI key set:** upload and storage still work, and the analysis is
routed to `/coach/ai-queue` with status `in_review`. That is correct behaviour, not a
failure — the system never fabricates scores. Test that path first if you want to verify
the pipeline without spending money at the vision API.

**What to expect with a key set:** categories the footage cannot support come back as
`score: null` / `insufficient_footage`. A report with four honest scores and six
"insufficient footage" rows is a PASS, not a bug. Distant rink-camera footage should
produce mostly nulls and low confidence — if it returns ten confident scores from bad
footage, something is wrong and you should tell me.

### 11.1 Add an AI key

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local
```

Restart `npm run dev`.

### 11.2 Prepare three clips

Use your own footage. You already have suitable files in `mindset-hockey/site/media/`.

```bash
cd ../site/media
ffmpeg -i shot-side-slowmo.mp4 -c copy test.mp4
ffmpeg -i shot-side-slowmo.mp4 -c copy test.mov
ffmpeg -i shot-side-slowmo.mp4 -c libvpx-vp9 -b:v 1M test.webm
```

### 11.3 Upload each format

As `premium@test.com` → `/analysis/new` → drag `test.mp4`.

**Expected sequence:**
1. "Reading the clip and finding the release…" with a progress bar
2. Ten frame thumbnails appear
3. Choose shot type and angle → **Analyse My Shot**
4. "Analysing your shot…" for 20–40 seconds
5. Redirect to `/analysis/<uuid>` with scores, strengths, weaknesses, action steps

Repeat for `.mov` and `.webm`.

> `.mov` is the one to watch. Browser support for QuickTime in `<video>` is inconsistent —
> if frame extraction fails there but works for MP4, that's a browser codec limit, not a
> code bug. Note it and tell members to export MP4.

### 11.4 Verify persistence

```sql
select id, status, overall_score, confidence, model, jsonb_array_length(scores) as points
from shot_analyses order by created_at desc limit 3;
```

**Expected:** `status = analyzed`, score 0–100, `points = 10`.

### 11.5 Progress history

```sql
select kind, value, source, recorded_at from metrics
where kind = 'analysis_score' order by recorded_at desc limit 5;
```

**Expected:** one row per analysis. Then load `/progress` — the trend chart should plot
them.

### 11.6 Failure handling

- Upload a `.txt` renamed to `.mp4` → expect "Use an MP4, MOV or WEBM file."
- Upload a file over 200 MB → expect the size error
- Temporarily set a bogus `ANTHROPIC_API_KEY` → expect the analysis row to land as
  `status='failed'` with `error_message` populated, and the report page to show "Analysis
  failed" rather than crashing
- Remove the key entirely → expect `status='in_review'` and a message saying it went to a
  coach. **It must never invent scores.**

- [ ] **11.1** MP4 completes end to end
- [ ] **11.2** MOV result recorded (pass or documented browser limitation)
- [ ] **11.3** WEBM completes end to end
- [ ] **11.4** `shot_analyses` rows have 10 scored points
- [ ] **11.5** `metrics` rows created; `/progress` plots them
- [ ] **11.6** Bad file, oversized file, bad key and missing key all handled
- [ ] **11.7** ⚠️ Confirmed: source video is **not** stored (known gap)

---

## Stage 12 — Video review submissions ⚠️ known incomplete

**Same gap, worse consequence.** `/api/reviews` records a filename, not the file. A coach
receives a submission with nothing to watch. And `/coach/queue` currently reads demo
fixtures, so real submissions won't even appear there.

### 12.1 Submit

As `premium@test.com` → `/reviews/new` → attach a video, title "Test game film", notes,
submit.

**Expected:** redirect to `/reviews`, entry listed as "Queued".

```sql
select id, title, kind, status, video_path, sla_due_at from video_submissions
order by created_at desc limit 3;
```

**Expected:** row exists; `sla_due_at` ≈ 72 hours out; `video_path` is **just a filename**
— that's the gap.

**Failure — `column "title" does not exist`**
Migration 0003 skipped. Stage 4.4.

### 12.2 Basic member blocked

As `basic@test.com`, POST directly:

```js
await fetch('/api/reviews', {
  method:'POST', headers:{'content-type':'application/json'},
  body: JSON.stringify({ title:'hack', kind:'game' })
}).then(r=>r.status)
```

**Expected:** redirect status, never 200. Confirm no row was inserted.

### 12.3 Coach queue

Log in as admin → `/coach/queue`.

**Expected today:** demo fixtures, **not** your real submission. This confirms the known
gap rather than a new bug.

- [ ] **12.1** Submission creates a `video_submissions` row
- [ ] **12.2** SLA timestamp ~72h
- [ ] **12.3** Basic member cannot submit
- [ ] **12.4** ⚠️ Confirmed: no video file stored, coach queue not wired (known gaps)

---

## Pre-launch gate

Everything above must be ticked, plus:

- [ ] **G1** Email confirmation re-enabled in Supabase
- [ ] **G2** Custom SMTP configured (built-in mail is rate-limited to a handful per hour)
- [ ] **G3** Switched to Stripe **live** keys; four live prices created; **setup prices
  re-verified as One-time**
- [ ] **G4** Live webhook endpoint added in Stripe pointing at your production URL, with
  the six events subscribed
- [ ] **G5** `NEXT_PUBLIC_SITE_URL` set to the production domain
- [ ] **G6** All env vars added to your host (Vercel → Settings → Environment Variables)
- [ ] **G7** `SUPABASE_SERVICE_ROLE_KEY` confirmed absent from git: `git log -S "service_role" --oneline`
- [ ] **G8** Storage buckets confirmed **private**
- [ ] **G9** Rate limiting added to `/api/analysis` — each call costs you money at the
  vision API, and nothing currently stops a member looping it
- [ ] **G10** Real terms and privacy policy reviewed by a lawyer, given you handle minors' video
- [ ] **G11** A full checkout run against **live** Stripe with a real card, then refunded
- [ ] **G12** Video storage implemented, or Premium marketing copy amended so you are not
  selling video review you cannot yet deliver

**G12 is not optional.** Premium currently advertises "video analysis and breakdowns" and
"video review submissions". Until storage is wired, one of those two things has to change:
the product or the promise.

---

## Fast triage

| Symptom | First thing to check |
|---|---|
| Everything redirects to `/login` | Env vars loaded? Restart dev server |
| `/dashboard` loads while signed out | Supabase env vars missing → still in demo mode |
| `column ... does not exist` | Migration 0003 not run |
| Webhook 400 | `STRIPE_WEBHOOK_SECRET` stale — recopy from `stripe listen`, restart |
| Webhook never arrives | `stripe listen` not running or wrong port |
| Checkout says `$349/month` | Setup price created as Recurring — **fix immediately** |
| RLS returns rows it shouldn't | Re-run policies in 0002; check `pg_tables.rowsecurity` |
| Analysis always `in_review` | No `ANTHROPIC_API_KEY` — working as designed |
| Analysis `failed` | Read `error_message` in `shot_analyses` |
| Frames don't extract from MOV | Browser codec limitation — try MP4 |
