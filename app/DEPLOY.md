# Deploying Mindset Hockey

Next.js 15 App Router. **Vercel is the right host** — it is built by the Next.js
team, and this app uses App Router server components, route handlers, `nodejs`
runtime routes and `next/font`, all of which work there with no configuration.
Nothing in the architecture argues for anything else.

Do each stage in order. Do not skip stage 0.

---

## 0. Before you deploy anything

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes **on your machine** (see "Build note" below)
- [ ] You have completed a full test-mode purchase of both tiers locally
- [ ] `git status` is clean except for intended changes
- [ ] `.env.local` is NOT tracked by git (`git check-ignore app/.env.local`)

### Build note

`npm run build` must be run on your own machine. The build compiles with SWC,
a platform-specific native binary; a `node_modules` installed on Windows does
not contain the Linux binary and vice versa. If you ever see
*"Failed to load SWC binary"*, delete `node_modules` and reinstall on that
machine. Vercel installs fresh, so this never affects the deployed build.

---

## 1. Supabase — production

The database is already live and migrations 0001–0004 are applied. What remains
is configuration.

1. **Auth → URL Configuration**
   - Site URL: `https://mindsethockey.company`
   - Redirect URLs — add both:
     - `https://mindsethockey.company/auth/callback`
     - `http://localhost:3005/auth/callback` (keep for local dev)
   - Without the production entry, every confirmation email link fails.
2. **Auth → Providers → Email** — turn "Confirm email" **OFF**. Signup is designed to authenticate the member immediately and send them straight to checkout; requiring email confirmation first breaks that flow (they land signed out).
3. **Auth → Rate limits** — leave the defaults on; they are your brute-force protection.
4. **Storage** — confirm `member-videos` and `analysis-frames` are **private**.
   These hold video of minors. Re-check after any dashboard change:
   ```sql
   select id, public from storage.buckets
   where id in ('member-videos','analysis-frames');
   -- expect public = false for both
   ```
5. **Copy the production keys** from Settings → API. `NEXT_PUBLIC_SUPABASE_URL`
   is the **Project URL** (`https://<ref>.supabase.co`) — *not* the Data/REST
   API URL. A trailing `/rest/v1` makes every auth call fail with
   "Invalid path specified in request URL".

---

## 2. Stripe — production

Full detail in `../docs/STRIPE_PLAN.md`. Minimum to take money:

1. **Activate the account** (business details, bank account, tax info).
2. **Create 4 LIVE products/prices** — test-mode IDs do not work with live keys:

   | Product | Price | Type |
   |---|---|---|
   | Standard Development Program | $100.00 USD | Recurring, monthly |
   | Standard Program — Onboarding & Setup | $249.00 USD | **One-time** |
   | Premium Development Program | $149.00 USD | Recurring, monthly |
   | Premium Program — Onboarding & Setup | $389.00 USD | **One-time** |

   The setup prices **must** be One-time. `/api/stripe/checkout` verifies this
   against Stripe and returns 409 rather than building a session that would bill
   a family $249 every month — but fix it at the source.
3. **Create the live event destination**
   - URL: `https://mindsethockey.company/api/stripe/webhook`
   - **API version: `2025-02-24.acacia`** — set it explicitly to match the pin
     in `lib/stripe.ts`. Leaving it on "account default" can silently write
     `null` into `subscriptions.current_period_end`.
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `invoice.paid`, `invoice.payment_failed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Configure the Customer Portal** (Settings → Billing → Customer portal).
   `/api/stripe/portal` errors until this exists. Enable cancel (at period end)
   and payment-method update. Leave "switch plans" **off** for now.
5. **Enable Smart Retries** (Settings → Billing → Subscriptions and emails).
6. **Set the Terms and Privacy URLs** in the portal and branding settings to
   `https://mindsethockey.company/terms` and `/privacy`.

---

## 3. Vercel

1. Import the GitHub repo.
2. **Root Directory: `app`** — the repo root is the workspace, not the Next app.
   This is the single most common misconfiguration here.
3. Framework preset: Next.js. Build command and output: leave as detected.
4. Add environment variables (Production scope), each marked **Sensitive**:

   ```
   NEXT_PUBLIC_SITE_URL=https://mindsethockey.company
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=
   NEXT_PUBLIC_STRIPE_PRICE_STANDARD_SETUP=
   NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=
   NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_SETUP=
   ANTHROPIC_API_KEY=            # optional — see below
   ```

   `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It is server-only and must
   never be given a `NEXT_PUBLIC_` prefix.

   With no `ANTHROPIC_API_KEY`, AI Shot Analysis still works end to end: the
   video uploads and stores normally and the analysis is routed to the coach
   review queue. It never fabricates a score.

5. Deploy.

---

## 4. Domain

1. Vercel → Settings → Domains → add `mindsethockey.company` and `www`.
2. At your registrar, point the records Vercel shows you.
3. Redirect `www` → apex (or the reverse) so there is one canonical origin.
   The canonical tags across the marketing pages assume the bare apex.
4. HTTPS is provisioned automatically. Wait for the certificate before testing
   Stripe — webhooks require valid HTTPS/TLS 1.2+.

---

## 5. After the first deploy

Run these in order against production.

- [ ] Visit `/` — marketing site renders, nav works
- [ ] `/pricing` → **Get Started** → `/signup?plan=standard`
- [ ] Create a real account; confirmation email arrives and the link works
- [ ] Land on `/upgrade?plan=standard` after confirming
- [ ] Complete a **real** Standard purchase; check the Stripe receipt reads
      **$349 today, then $100/month**
- [ ] Back on `/onboarding` the success banner appears and resolves to active
- [ ] Verify entitlement **in the database, not the UI**:
      ```sql
      select email, tier, subscription_active from profiles where email = '…';
      -- expect: basic, true
      ```
- [ ] `/account` shows Standard / Active; **Manage Billing** opens the portal
- [ ] Cancel in the portal → `subscription_active` flips to `false`
- [ ] Refund yourself in the Stripe Dashboard
- [ ] Repeat for Premium (**$538 today, then $149/month**)
- [ ] Submit the contact form → the lead appears in `/admin/leads`
- [ ] Set yourself to admin:
      ```sql
      update profiles set role='admin', tier='premium', subscription_active=true
      where email = 'braydencastiglia@gmail.com';
      ```
- [ ] Confirm Stripe webhook delivery is 100% in Workbench after 24h
- [ ] Submit `https://mindsethockey.company/sitemap.xml` to Google Search Console

---

## 6. Rollback

Vercel keeps every deployment. Promote the previous one from the Deployments
tab; it takes seconds and needs no rebuild.

Database changes do **not** roll back with a deployment. Migrations 0001–0004
are already applied and no further migration is needed for this release.
