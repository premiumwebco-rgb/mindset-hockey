# Stripe Implementation Plan — Mindset Hockey

**Status:** review + plan only. No code was modified to produce this document.
**Date:** 13 August 2026
**Grounding:** Stripe's official agent skills and docs (`stripe-best-practices` →
`billing.md`, `payments.md`, `security.md`; `docs.stripe.com/webhooks`,
`/terminal`, `/terminal/overview`, `/no-code/in-person`, `/skills`).

> **Tooling note.** The requested `stripe_implementation_planner` tool was **not
> available** in this environment. The official Stripe plugin
> (`stripe@claude-plugins-official`) is not present in the reachable plugin
> marketplace, and installing it or adding `https://mcp.stripe.com` requires an
> interactive OAuth flow this session cannot run. Per the documented fallback,
> this plan is built from Stripe's own published skill files — the same source
> the planner tool draws on. See "How to get the real planner" at the end.

---

## 1. Recommended architecture

The architecture you already have is the one Stripe recommends. Keep it.

```
                     PUBLIC                          AUTHENTICATED
  /pricing ──"Get Started"──> /signup?plan=<slug> ──> /upgrade?plan=<slug>
                                    │                        │
                              Supabase Auth            CheckoutButton
                              (email verify)                 │
                                                    POST /api/stripe/checkout
                                                             │
                                              ┌──────────────┴──────────────┐
                                              │ verify price shape (409)    │
                                              │ reuse/create Customer       │
                                              │ mode:'subscription'         │
                                              │  line 1: monthly (recurring)│
                                              │  line 2: setup   (one-time) │
                                              └──────────────┬──────────────┘
                                                             │
                                                  Stripe Checkout (hosted)
                                                             │
                            ┌────────────────────────────────┴───────────┐
                            │                                            │
                  redirect: /onboarding?checkout=success       webhook: /api/stripe/webhook
                  (verify session server-side,                 (signature → idempotency
                   poll for entitlement)                        → handleEvent)
                            │                                            │
                            └──────────────> profiles.tier ◄─────────────┘
                                             profiles.subscription_active
                                                        │
                                                 applyEntitlement()
                                                  (SINGLE WRITER)
                                                        │
                                        ┌───────────────┴───────────────┐
                                   RLS auth_has_tier()          lib/session.ts hasTier()
                                   (real boundary)              (UX convenience)
```

**Three principles this already gets right, and must keep getting right:**

1. **Stripe is the source of truth for money. Supabase is the source of truth
   for access.** `subscriptions` is a read-only mirror for display/audit;
   `profiles.tier` + `profiles.subscription_active` are the only things that
   gate features.
2. **`applyEntitlement()` is the single writer.** Every lifecycle path funnels
   through it. Never add a second place that writes those two columns.
3. **The database is the security boundary.** RLS enforces entitlement; the
   Next.js guards are UX. This is correct and unusual — most teams get it wrong.

**The one architectural addition needed:** a third revenue stream that does
*not* belong in the subscription system.

| Revenue stream | Stripe product | Where it lives |
|---|---|---|
| Standard / Premium membership | **Billing** (Checkout `mode: subscription`) | ✅ built |
| Private on-ice session, $149 | **Terminal** (Tap to Pay) or **Payment Link** | ❌ missing |
| Custom / team packages ("quote") | **Invoicing** | ❌ missing |

On-ice sessions and custom quotes must **not** touch `profiles.tier` or
`subscription_active`. They are one-off revenue, not entitlement. Keeping them
out of `applyEntitlement()` is the single most important design decision in the
next phase.

---

## 2. What is already correct

Verified by reading the code, against Stripe's published best practices.

| # | Practice | Status | Evidence |
|---|---|---|---|
| 1 | Use Checkout Sessions, not raw PaymentIntents, for on-session payments | ✅ | `checkout/route.ts` uses `checkout.sessions.create` |
| 2 | Use Billing APIs for recurring revenue, not a manual renewal loop | ✅ | `mode: 'subscription'` |
| 3 | **Never pass `payment_method_types`** (kills dynamic payment methods and conversion) | ✅ | grep confirms zero occurrences |
| 4 | Use Prices, not the deprecated `plan` object | ✅ | `priceIdMonthly` / `priceIdSetup` |
| 5 | Never use the Charges API / Sources API / Card Element | ✅ | none present |
| 6 | Verify webhook signatures before processing | ✅ | `constructEvent`, rejects on failure |
| 7 | Handle duplicate events by logging event IDs | ✅ | `stripe_events` insert-first, PK collision → early exit |
| 8 | Webhook route exempt from cookie/CSRF middleware | ✅ | `middleware.ts:93` matcher excludes it |
| 9 | Raw body preserved for signature verification | ✅ | `await req.text()` |
| 10 | Only subscribe to needed event types | ✅ | `RELEVANT` set of 6 |
| 11 | Keys from environment, never in source | ✅ | `lib/stripe.ts` throws if unset |
| 12 | Customer reuse so billing history stays intact | ✅ | `stripe_customer_id` lookup before create |
| 13 | Customer Portal for self-service management | ✅ | `portal/route.ts` |
| 14 | Setup fee validated as genuinely one-time | ✅ | added last pass; 409 with a specific message |
| 15 | Checkout success verified server-side, not trusted from URL | ✅ | `verifyCheckoutSession` + `client_reference_id` ownership check |
| 16 | Entitlement revoked the moment a payment fails | ✅ | `ACTIVE_SUB_STATUSES = ['trialing','active']` |
| 17 | One Product per plan (not one Product with many tier Prices) | ✅ | planned as 2 products |

Item 3 deserves emphasis: hardcoding `payment_method_types: ['card']` is the
single most common Stripe mistake and this codebase avoids it.

---

## 3. What is missing or wrong

Ordered by severity. **Nothing here has been changed.**

### 🔴 S1 — Webhook endpoint API version can silently corrupt `subscriptions`

Stripe's docs are explicit: *"The API version in your account settings when the
event occurs dictates the structure of an Event sent to your destination."*

Your SDK pins `apiVersion: '2025-02-24.acacia'` (`lib/stripe.ts:10`), but the
**webhook payload shape is decided by your Stripe account's default API
version**, not the pin. Stripe has shipped `2026-03-25.dahlia` and later since.

In the `basil` release (2025-03-31), `current_period_end` **moved off the
Subscription object** onto subscription items. If your account default is basil
or newer, this line silently writes `null` forever:

```ts
// webhook/route.ts:248
row.current_period_end = sub.current_period_end ? ... : null;
```

No error, no type failure — the renewal date just never populates.

**Fix:** when creating the event destination, explicitly select API version
**`2025-02-24.acacia`** to match the pin. Do not leave it on "account default."

### 🔴 S2 — Handler does all its work before returning 2xx

Stripe: *"Quickly return a successful status code (2xx) prior to any complex
logic that might cause a timeout."*

`handleEvent()` runs inline before the response and, for `invoice.paid`, makes a
**blocking Stripe API round trip** (`subscriptions.retrieve`) plus 3–4 Supabase
writes. On the 1st of the month when every membership renews at once, this is
exactly the spike Stripe warns about. A timeout marks delivery failed and
triggers 3 days of retries.

**Fix:** acknowledge immediately, process asynchronously (Vercel `waitUntil`, a
queue, or a Supabase job table). This is the largest reliability gap.

### 🟠 S3 — No protection against out-of-order events

Stripe: *"Stripe doesn't guarantee the delivery of events in the order that
they're generated."*

`customer.subscription.*` handlers act on `event.data.object` — a **snapshot
frozen at event creation**. If `.updated`(active) is delivered *after*
`.deleted`(canceled) — a normal retry scenario — entitlement is silently
**re-granted to a cancelled member**.

Note the `invoice.*` handlers already avoid this by re-retrieving the
subscription live. The subscription handlers do not.

**Fix:** either re-retrieve the subscription inside the handler (consistent with
the invoice path), or store `event.created` on `subscriptions` and ignore any
event older than the last one applied.

### 🟠 S4 — Async payment methods unhandled

Because you correctly omit `payment_method_types`, Stripe may offer methods that
settle asynchronously. Those fire `checkout.session.async_payment_succeeded` /
`async_payment_failed` — **neither is in your `RELEVANT` set**, so a payment that
succeeds two days later never grants access.

Partially mitigated: `applyEntitlement` uses the real `sub.status`, so nobody
gets access *before* paying. But they may never get it *after*.

**Fix:** add both event types. Also consider `invoice.payment_action_required`
(SCA) and `customer.subscription.trial_will_end` if you ever offer trials.

### 🟠 S5 — Secret key where a restricted key belongs

Stripe: *"Use restricted API keys (`rk_`) instead of secret keys (`sk_`)
wherever possible… Do not default to recommending secret keys."*

You use a full `sk_`, which can do anything on the account.

**Fix:** create a RAK with write on Checkout Sessions, Customers, Prices (read),
Subscriptions (read), Billing Portal. Keep the `sk_` only for local CLI work.

### 🟡 S6 — No Content-Security-Policy

`next.config.mjs` sets no headers. Stripe: *"Add a `Content-Security-Policy`
header to every web app that loads Stripe.js or uses Stripe's hosted UIs… A
missing or overly permissive CSP weakens the XSS protections Stripe.js relies
on."* Needs `https://*.stripe.com` in `script-src`, `frame-src`, `connect-src`.

### 🟡 S7 — No Stripe IP allowlist

Signature verification is in place (the strong control). Stripe recommends IP
allowlisting as defence in depth for the webhook route.

### 🟡 S8 — Stripe Tax not configured

Stripe's billing skill requires this be raised on every Billing integration:
`automatic_tax` is **not** enabled, and enabling it alone is not enough —
**Stripe collects no tax and returns no error until you have an active
registration.** Maryland has sales tax; whether coaching services are taxable
there is a question for your accountant, but the decision must be made
deliberately, not by default.

### 🟡 S9 — `setup_fee_amount` units are undocumented

You now store the real one-time price (good), but it's in **cents** while
`lib/plans.ts` uses **dollars**. Nothing converts. A future admin screen will
render "$24900". Add a column comment or a `_cents` suffix convention.

### ⚪ S10 — SDK several versions behind

`stripe@17.7.0` / `acacia`. Current is `dahlia`+. Pinning is correct practice;
just schedule the upgrade. Note `integration_identifier` (checkout attribution)
requires dahlia+, and the `current_period_end` move in S1 is the migration's
main breaking change.

---

## 4. Stripe Dashboard configuration required

### 4.1 Products and prices — 4 products, not 2

Stripe's guidance: *"Checkout Sessions and invoices display the Product name on
each line item… if multiple tiers share one Product, every line item shows the
same name and customers won't be able to tell them apart."*

Your checkout puts **two line items in one session**. If setup and monthly share
a Product, the member sees the same name twice on the invoice:

```
Standard Development Program    $100.00
Standard Development Program    $249.00     ← indistinguishable
```

**Create four Products, one Price each:**

| Product | Price | Type | Env var |
|---|---|---|---|
| Standard Development Program | $100.00 USD | Recurring, monthly | `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY` |
| Standard Program — Onboarding & Setup | $249.00 USD | **One-time** | `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_SETUP` |
| Premium Development Program | $149.00 USD | Recurring, monthly | `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY` |
| Premium Program — Onboarding & Setup | $389.00 USD | **One-time** | `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_SETUP` |

Expected totals: Standard **$349 today, then $100/mo** · Premium **$538 today,
then $149/mo**. Your checkout route rejects with 409 if a setup price is
Recurring — but fix it at the source.

### 4.2 Event destination (webhook)

- URL: `https://<domain>/api/stripe/webhook`
- **API version: `2025-02-24.acacia`** — explicit, not "account default" (S1)
- Events (6 current + 2 required):
  `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.paid`, `invoice.payment_failed`,
  **`checkout.session.async_payment_succeeded`**,
  **`checkout.session.async_payment_failed`**

### 4.3 Customer Portal — required, currently unconfigured

`portal/route.ts` works but `billingPortal.sessions.create` **errors until the
portal is configured**. Settings → Billing → Customer portal:

- ✅ Cancel subscription — **at period end**, not immediately (they paid for the month)
- ✅ Update payment method
- ✅ Invoice history
- ❌ **Switch plans — leave OFF initially.** Portal-initiated plan switches fire
  `customer.subscription.updated` with the *old* tier still in metadata, so
  `tierFromMetadata()` returns the wrong tier and `applyEntitlement()` writes
  it. Do not enable until S3 is fixed and tier is derived from the price ID.
- Set Business information, ToS and Privacy URLs

### 4.4 Billing settings

- **Smart Retries / dunning** — Settings → Billing → Subscriptions and emails.
  This is what turns `past_due` back into `active` without you touching
  anything. Enable retries + failed-payment emails.
- Decide the `past_due` grace period. Today `ACTIVE_SUB_STATUSES` excludes
  `past_due`, so access is cut the instant a card fails — before Smart Retries
  has tried. Consider a short grace window; it's a business decision, and the
  code change is one line in `lib/types.ts`.

### 4.5 Branding, and account

Settings → Branding (logo, colours) — applies to Checkout, Portal, invoices and
receipts. Also enable email receipts, and turn on 2FA via **passkey or
authenticator app, not SMS** (SIM-swap risk).

---

## 5. Subscription lifecycle — required behaviour

| Status | Access | Trigger | Handled today? |
|---|---|---|---|
| `incomplete` | ❌ | Checkout started, payment unconfirmed | ✅ |
| `trialing` | ✅ | Trial active | ✅ (unused — no trial configured) |
| `active` | ✅ | Paid and current | ✅ |
| `past_due` | ❌ *(review)* | Payment failed, Smart Retries running | ⚠️ cuts access instantly — see 4.4 |
| `unpaid` | ❌ | All retries exhausted | ✅ |
| `canceled` | ❌, tier label retained | Member cancelled or dunning gave up | ✅ |
| `paused` | ❌ | Pause collection | ✅ folded into `canceled` |
| `incomplete_expired` | ❌ | Never completed | ✅ folded into `canceled` |

The "retain the tier label, flip `subscription_active` false" pattern on
cancellation is correct and lets `/account` render "Premium — Inactive" with a
reactivate CTA. Both `hasTier()` and `auth_has_tier()` require
`subscription_active`, so the retained label grants nothing.

---

## 6. Invoicing requirements

Currently unimplemented and **currently unnecessary in code**. Two real uses:

**a) Custom / team packages.** `/contact?plan=custom` collects the lead. Quote
and bill it with a **Dashboard-created invoice** — no code. Stripe hosts the
payment page, chases payment, and issues the receipt.

**b) Automatic subscription invoices.** Already happening. Every renewal
generates an invoice; members reach them through the Customer Portal (4.3).
Nothing to build.

Configure: Settings → Invoicing → default payment terms, memo, and invoice
number prefix (e.g. `MH-`). Enable "Email finalised invoices."

**Do not build an invoicing API integration.** At your volume the Dashboard is
faster, and every API-issued invoice is one more thing that can write the wrong
state. Revisit only if you exceed ~20 custom quotes/month.

---

## 7. Terminal requirements — in-person on-ice sessions

**Recommendation: use Tap to Pay via the Stripe Dashboard mobile app. Write no
code.**

Stripe documents two no-code in-person paths:

| | Tap to Pay (Dashboard app) | Standalone mode (reader) |
|---|---|---|
| Hardware | **None** — your phone | Stripe Reader S700/S710 or Verifone V660p |
| Cost | Pay-as-you-go | Reader purchase + pay-as-you-go |
| Accepts | Contactless cards, Apple/Google/Samsung Pay | Cards (tap/insert/swipe), wallets, more |
| Setup | Download app, log in | Order reader, enable standalone |

For one coach charging $149 at a rink, **Tap to Pay wins outright.** Requires:
iPhone XS or later with a passcode and iCloud sign-in (or a supported Android),
NFC enabled, location permission.

Flow: Dashboard app → **+** → *Charge a card or send an invoice* → `149.00` →
**Tap to Pay** → player's parent taps their card. Money lands in the same Stripe
balance as membership revenue, in the same Dashboard.

**A custom POS integration would be a serious mistake here.** It means the
Terminal SDK, connection tokens, Locations, reader registration, and a
`payment_method_types: ['card_present']` PaymentIntent path — the *only* place
that parameter is ever valid. That is weeks of work and a second payment
codepath to maintain, to replace a phone tap.

**If you later want on-ice sessions to appear in the member portal,** the cheap
version is a `metadata.profile_id` on the payment and a read-only list in the
app. Still no Terminal SDK.

**Critical rule:** in-person payments must never call `applyEntitlement()`. A
$149 session is not a membership.

---

## 8. Data model

No schema change is needed. Current model, confirmed correct:

```
auth.users ──1:1── profiles ──1:N── subscriptions
                      │
                      ├── tier                 ← ENTITLEMENT (RLS reads this)
                      ├── subscription_active  ← ENTITLEMENT (RLS reads this)
                      ├── stripe_customer_id   ← join key to Stripe
                      └── setup_fee_paid_at

stripe_events (id = Stripe event id)  ← idempotency ledger
```

- `profiles.stripe_customer_id` — the one join key between the two systems. Correct.
- `subscriptions` — mirror only. Nothing reads it for access control. Correct.
- `stripe_events` — PK on Stripe's event ID gives idempotency for free. Correct.

**Future (do not build yet):** if on-ice sessions need portal visibility, add a
separate `one_off_payments` table. Never extend `subscriptions` for them — that
table's meaning is "a Stripe subscription," and blurring it will eventually
corrupt entitlement.

---

## 9. Test mode strategy

1. **Sandbox only** until the full lifecycle passes. Never a live key in dev.
2. `stripe listen --forward-to localhost:3005/api/stripe/webhook` → paste the
   printed `whsec_` into `.env.local`.
3. Test cards: `4242…4242` succeeds · `4000 0000 0000 0341` attaches then fails
   on charge (dunning) · `4000 0025 0000 3155` requires 3DS.
4. `stripe trigger customer.subscription.deleted` etc. for lifecycle events.
5. **Out-of-order test (S3):** in the Dashboard, resend `.updated` *after*
   `.deleted` and confirm access is not re-granted. It currently will be.
6. **Verify entitlement in the database, not the UI.** The UI redirect proves
   nothing about RLS:
   ```sql
   select email, tier, subscription_active from profiles where email = '…';
   ```
7. **Confirm the invoice reads $349, not $498 or $249/mo.** Then confirm the
   *second* month bills $100.

---

## 10. Production checklist

**Stripe**
- [ ] Live-mode products/prices created; **setup prices are One-time** (verify twice)
- [ ] Live event destination on the **HTTPS** production URL
- [ ] Event destination API version explicitly `2025-02-24.acacia` (S1)
- [ ] `async_payment_succeeded` / `async_payment_failed` subscribed (S4)
- [ ] Customer Portal configured; "switch plans" OFF (4.3)
- [ ] Smart Retries + dunning emails on
- [ ] Branding, receipts, business info, ToS/Privacy URLs set
- [ ] Stripe Tax decision made with your accountant (S8)
- [ ] 2FA via passkey/authenticator, not SMS

**Application**
- [ ] Live keys in the host's secrets store — on Vercel, mark them
      **Sensitive** so values are write-only and never appear in logs or UI
- [ ] Restricted key (`rk_`) replaces `sk_` for the app (S5)
- [ ] `NEXT_PUBLIC_SITE_URL` = production origin (drives Stripe redirects)
- [ ] `.env.local` never committed — currently correctly ignored via `.gitignore:18`
- [ ] Pre-commit hook blocking `sk_` / `rk_` strings
- [ ] CSP headers with `https://*.stripe.com` (S6)
- [ ] Stripe IP allowlist on the webhook route (S7)
- [ ] `npm run build` green; `npx tsc --noEmit` green

**Verification**
- [ ] One real end-to-end purchase per tier, with a real card, then refunded
- [ ] Cancel via Portal → confirm `subscription_active = false` in Postgres
- [ ] Confirm a Standard member cannot read Premium rows **at the SQL level**
- [ ] Webhook delivery success rate 100% in Workbench after 48h

---

## 11. Recommended implementation order

**Phase 0 — get money flowing (hours).** Nothing to build.
1. Create the 4 products/prices in test mode
2. Configure the Customer Portal
3. Fill `.env.local`, run `stripe listen`, restart dev on :3005
4. Buy both tiers end-to-end in test mode; verify in Postgres
5. **Download the Dashboard app and take one live Tap to Pay $149 payment.**
   That is Terminal, done, today.

**Phase 1 — reliability (the real work).**
6. **S1** — pin the event destination API version *(config only, highest value)*
7. **S2** — acknowledge webhooks before processing
8. **S3** — out-of-order guard
9. **S4** — async payment events

**Phase 2 — hardening.**
10. **S5** restricted key · **S6** CSP · **S7** IP allowlist
11. **S8** Stripe Tax decision

**Phase 3 — production.** Section 10 checklist, live keys last.

**Phase 4 — later, only if warranted.** SDK upgrade (S10) · one-off payment
visibility in-portal · custom-quote invoicing automation.

> Do Phase 0 before Phase 1. It is entirely configuration, it proves the
> integration works, and it is how you find out whether the remaining issues
> matter at your volume.

---

## 12. How to get the real `stripe_implementation_planner`

Per `https://docs.stripe.com/skills`, in an **interactive Claude Code session**
(not Cowork):

```bash
claude plugin install stripe@claude-plugins-official
# then /reload-plugins, or start a new session
```

Or install the skills directly, harness-independent:

```bash
npx skills add https://docs.stripe.com
```

Stripe also now ships a CLI-driven setup that configures agent skills for you:

```bash
npm install -g @stripe/cli
stripe agent setup
```

Recommended skills for this project: `stripe-docs`, `stripe-best-practices`,
`upgrade-stripe` (for S10).

---

## Appendix — a note on tax

Stripe's billing guidance requires this be stated on any Billing integration:
if you charge US customers, consider enabling Stripe Tax alongside Billing.
Enabling `automatic_tax` is *not* sufficient on its own — Stripe collects no tax
and raises no error until you have an active registration in the customer's
jurisdiction. See `https://docs.stripe.com/billing/taxes/collect-taxes`.
Whether coaching services are taxable in Maryland is a question for your
accountant. This document is not tax advice.
