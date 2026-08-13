# Verification Report — Mindset Hockey Membership Platform

**Date:** 12 August 2026
**Verdict: NOT production-ready. Do not take real payments yet.**

---

## 1. Build status: NOT VERIFIED — could not run

I could not complete steps 1–8. My build environment has **no outbound network access
whatsoever**, so `npm install` is impossible.

Evidence, not assumption:

```
$ npm ping
npm error 403 Forbidden - GET https://registry.npmjs.org/-/ping

$ curl -o /dev/null -w "%{http_code}" https://registry.npmjs.org   → 000
$ curl -o /dev/null -w "%{http_code}" https://github.com           → 000
$ curl -o /dev/null -w "%{http_code}" https://registry.yarnpkg.com → 000
$ find / -name node_modules -maxdepth 6   → only npm's own internals
```

`000` means the connection never opened — this is a full egress block, not a registry
allowlist. No mirror, no proxy, no cache, no vendored `node_modules`.

**Therefore:**

| Task | Status |
|---|---|
| Install dependencies / `npm install` | ❌ Impossible |
| Production build | ❌ Not run |
| TypeScript check | ⚠️ Static analysis only |
| Lint | ❌ Not run |
| Start app locally | ❌ Not run |
| Verify every route loads | ❌ Not run |

**Every runtime test you asked for — auth, access control, RLS bypass attempts, Stripe
test mode, AI analysis with MP4/MOV/WEBM — was not performed.** I will not report results
for tests I did not run.

---

## 2. What I did do: static analysis, and it found real bugs

Since I could not run the compiler, I wrote analysers that parse the source directly.
**Seven genuine defects found and fixed:**

| # | Severity | Defect | Fix |
|---|---|---|---|
| 1 | **Build-breaking** | `<Stat sub=...>` used in 8 places; `Stat` had no `sub` prop | Added `sub?: string` to `Stat` |
| 2 | **Build-breaking** | `demo-data.ts` used `status: 'pending'`, removed from `SubmissionStatus` | → `'queued'` |
| 3 | **Broken link** | `/signup?plan=free` in 3 places; the `free` tier no longer exists | → `plan=basic` |
| 4 | **Rendering bug** | `RubricRadar` hardcoded `n = 7`; rubric is now 10 points → malformed chart | `n = RUBRIC.length` |
| 5 | **Missing page** | `/reviews` linked to `/reviews/new`, which did not exist | Page + API route created |
| 6 | **Stale copy** | Pro Breakdowns said "Advanced membership" / "seven points" | Updated |
| 7 | **CRITICAL** | **Authentication did not work at all** | Rebuilt — see below |

### Defect 7 in detail — this one matters most

`login/page.tsx` was `<form action="/dashboard">`. `signup/page.tsx` was
`<form action="/onboarding">`. **Neither ever called Supabase.** They were UI shells that
navigated on submit. There was also **no logout handler and no password reset flow
anywhere in the codebase.**

In demo mode this looks like it works, which is exactly why I did not catch it when I
handed the platform over. That was my error, and my previous claim that the platform had
"Supabase Authentication" was wrong.

Now implemented (`app/(auth)/actions.ts`):

- `signInAction` — real `signInWithPassword`, generic error text so the form can't be used
  to enumerate which emails have accounts
- `signUpAction` — real `signUp`, passes `full_name`, handles the email-confirmation case
- `signOutAction` — real `signOut`, wired to a sign-out button in the sidebar
- `requestPasswordResetAction` — `resetPasswordForEmail`; returns an identical message
  whether or not the account exists
- `updatePasswordAction` — `updateUser`, min length + confirmation match
- `/auth/callback` — exchanges the one-time code for a session cookie
- `/forgot-password` and `/account/password` pages

**None of this has been executed.** It is written against the documented Supabase SSR API,
but "compiles in my head" is not "works".

---

## 3. Static verification that DID pass

Run against 70 files, 34 pages, 8 API routes:

- ✅ Every import resolves; every imported symbol is genuinely exported
- ✅ No dead internal links; every `href` and `fetch()` target maps to a real route
- ✅ No client component references `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- ✅ Service-role key appears in exactly one file, `lib/supabase/server.ts`
- ✅ Every Premium page and API route calls `requireFeature(...)` server-side
- ✅ Every admin page and route calls `requireAdmin()`
- ✅ Stripe webhook verifies the signature, is idempotent via a `stripe_events` ledger,
  and is excluded from middleware so the raw body survives
- ✅ RLS enabled on all 18 tables; trigger blocks self-escalation of `role`/`tier`
- ✅ All component props type-check against their declared signatures
- ✅ Next 15 async `params`/`searchParams` used correctly everywhere

**This proves the code is internally consistent. It does not prove it runs.**

---

## 4. Remaining issues — not fixed

| Severity | Issue |
|---|---|
| **HIGH** | **Videos are never uploaded.** AI analysis sends extracted frames to the API but the source video is never written to Supabase Storage — `video_path` holds a bare filename. Members can't re-watch clips; coaches can't review them. |
| **HIGH** | **Video review submissions have no video.** Same root cause: `/api/reviews` records a filename, not a file. A coach receives a submission with nothing to watch. |
| **MEDIUM** | `/coach/queue` reads seeded demo data, not the `video_submissions` table. Real submissions will not appear. |
| **MEDIUM** | `/onboarding` collects player details and never persists them. |
| **MEDIUM** | `/api/leads` does not insert into the `leads` table, so the admin Leads page stays empty. |
| **LOW** | No ESLint config — `npm run lint` will fail or prompt for setup. |
| **LOW** | Demo drills reference old rubric point ids 1–7; the rubric is now 10 points, so "Fixes:" labels are mismatched. |

I did not fix these because you said not to add features, and wiring storage uploads is
substantial new work rather than a repair. **But you should know the AI analysis and video
review features are incomplete, not merely untested.**

---

## 5. Security concerns

**Designed correctly, unverified in practice.** The architecture is sound:

- Postgres RLS is the real boundary — `auth_has_tier('premium')` guards every premium row
- `subscription_active` gates access, so a failed payment revokes on the next query
- The privileged-column trigger stops a member updating their own `role` or `tier`
- Storage policies scope objects to `<user-id>/...` and require Premium to write

**Concerns I cannot resolve without running it:**

1. **RLS has never been exercised.** Policies that look right and policies that work are
   different things. A single wrong `using` clause silently exposes data.
2. **The Stripe checkout shape needs confirming in test mode.** It puts a one-time price
   into a `mode: 'subscription'` session. Stripe supports that, but if the $389 setup
   price is misconfigured as recurring, **members get charged $389 every month.** Verify
   this before anything goes live.
3. **`auth_has_tier` is `SECURITY DEFINER`.** Correct here, but it means a bug in that
   function is a privilege-escalation bug. Have someone read it independently.
4. **No rate limiting** on `/api/analysis`. Each call spends money at a vision API. A
   Premium member could loop it.
5. **Email confirmation state is unhandled in the UI.** If Supabase has confirmations on,
   signup returns no session and the member sees a "check your email" message — that path
   has never been walked.

---

## 6. Production readiness: NOT READY

| Area | State |
|---|---|
| Code structure & access-control design | Good |
| Static consistency | Verified |
| Compiles | **Unknown** |
| Auth | Written, never executed |
| RLS | Written, never executed |
| Stripe | Written, never executed |
| AI analysis | **Incomplete** — no video storage |
| Video review | **Incomplete** — no video storage |

### What you must do, in order

```bash
cd mindset-hockey/app
npm install
npx tsc --noEmit          # expect errors I could not catch statically
npm run build
npm run dev
```

Then, and only then:

1. Walk all 34 routes in demo mode; fix anything that throws
2. Connect Supabase, run both migrations, create Basic / Premium / Admin test accounts
3. **Log in as Basic and try to reach `/analysis`** — then query `shot_analyses` directly
   as that user and confirm zero rows. The second half is the real test.
4. Run Stripe in test mode. **Check the first invoice line items are $389 once + $149
   recurring, not $389 recurring.**
5. Cancel the test subscription; confirm premium content locks immediately
6. Only after all of the above: wire video storage, then test MP4/MOV/WEBM

Budget a day for this. Steps 3 and 4 are the ones that cost real money if they're wrong.
