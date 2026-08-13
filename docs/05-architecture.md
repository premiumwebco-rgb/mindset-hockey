# App Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Server components = fast, SEO-friendly marketing pages and a gated app in one codebase. |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS v4 + CSS custom properties | Design tokens live in CSS vars so the PageFlow HTML and the app share one palette. |
| Auth | **Supabase Auth** (email + magic link + Google) | Row-Level Security enforces tier gating at the database, not just the UI. |
| Database | **Supabase Postgres** | Relational fits the content/progress model. RLS is the killer feature here. |
| File storage | Supabase Storage | Player video uploads, avatars, PDFs. |
| Video delivery | **Mux** (or Cloudflare Stream / Bunny) | Signed playback URLs, adaptive bitrate, thumbnails, per-view analytics. Never serve premium video from public storage. |
| Payments | **Stripe Billing** + Customer Portal | Subscriptions, trials, proration, dunning, self-serve cancel. |
| Email | Resend (transactional) + ConvertKit/Loops (marketing) | |
| Hosting | Vercel | |
| Analytics | Vercel Analytics + PostHog | Funnel + retention. |

## 2. High-Level Diagram

```
                        ┌──────────────────────────────┐
   Cold traffic ───────▶│   MARKETING (public, SSG)    │
   (IG/YT/SEO)          │  /  /pricing  /story         │
                        │  /free  /blog/*  /shot-course│
                        └───────────┬──────────────────┘
                                    │ email capture / assessment
                                    ▼
                        ┌──────────────────────────────┐
                        │   AUTH (Supabase)            │
                        │  /signup /login /onboarding  │
                        └───────────┬──────────────────┘
                                    │ Stripe Checkout
                                    ▼
   ┌────────────────────────────────────────────────────────────┐
   │                    MEMBER APP (gated, RSC)                 │
   │                                                            │
   │  /dashboard      weekly plan · streak · next actions       │
   │  /library        training videos by pillar (tier-gated)    │
   │  /drills         filterable drill database                 │
   │  /mindset        12-lesson mindset track                   │
   │  /shot-course    7-module flagship course                  │
   │  /analysis       ▲ ADVANCED — submit + review video        │
   │  /pro-breakdowns ▲ ADVANCED — side-by-side comparison      │
   │  /progress       assessments, scores, history              │
   │  /account        Stripe portal, profile                    │
   └───────────────┬──────────────────────┬─────────────────────┘
                   │                      │
                   ▼                      ▼
        ┌────────────────────┐  ┌──────────────────────┐
        │ Supabase Postgres  │  │  Mux (signed video)  │
        │ + RLS + Storage    │  └──────────────────────┘
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐        ┌────────────────────┐
        │  Stripe Webhooks   │        │  COACH CONSOLE     │
        │  → subscriptions   │        │  /coach/queue      │
        │  → tier updates    │        │  /coach/review/:id │
        └────────────────────┘        └────────────────────┘
```

## 3. Tier Gating — Defence in Depth

Three independent layers. A bug in one does not leak content.

1. **Database (source of truth).** RLS policies on `lessons`, `drills`, `pro_breakdowns` check `required_tier <= current_user_tier()`. Even a leaked anon key returns nothing.
2. **Server components.** `requireTier('advanced')` in the route segment redirects to `/upgrade` before render.
3. **Video.** Mux playback IDs are `signed`. The server mints a short-lived JWT only after the tier check. A copied URL expires in minutes.

```ts
// lib/auth/tier.ts — conceptual
export const TIER_RANK = { free: 0, basic: 1, advanced: 2 } as const

export async function requireTier(min: Tier) {
  const { user, profile } = await getSession()
  if (!user) redirect('/login')
  if (TIER_RANK[profile.tier] < TIER_RANK[min]) redirect(`/upgrade?need=${min}`)
  return { user, profile }
}
```

**Upsell rule:** locked Advanced content is *visible but locked* to Basic members — title, thumbnail, and description shown with a lock badge. Hiding it entirely destroys the upgrade path. Showing it creates desire. This is the single highest-leverage revenue decision in the app.

## 4. Subscription Lifecycle

```
Signup (free)
   └─▶ Onboarding: player profile + 5-min assessment
         └─▶ Assessment report (free, high value) ──▶ tier recommendation
               └─▶ Stripe Checkout (7-day trial on Basic)
                     └─▶ webhook: checkout.session.completed → tier = basic|advanced
                           ├─ invoice.paid            → extend period, reset analysis credits
                           ├─ invoice.payment_failed  → status = past_due, dunning email
                           ├─ subscription.updated    → tier change / proration
                           └─ subscription.deleted    → tier = free, retain progress data
```

**Critical:** never delete member progress on cancellation. Winback offers convert because the dashboard still remembers everything. "Your streak is waiting" is the highest-performing winback email in this category.

**Analysis credits** reset on `invoice.paid`, not on a cron. Advanced = 2/month, non-rolling (max 4 banked) — protects coach capacity while feeling generous.

## 5. Video Analysis Pipeline

```
Player records (phone, 2 angles: side + front)
   ▼
/analysis/new  → guided upload (angle checklist, 60s max, 200MB cap)
   ▼
Supabase Storage (private bucket)  → row in video_submissions (status: pending)
   ▼
Direct upload to Mux → playback_id (signed) → status: ready
   ▼
Coach console /coach/queue (oldest-first, SLA countdown badge)
   ▼
Coach scores 7 rubric points (1–10) + timestamped notes + records a Loom/Mux voiceover
   ▼
status: reviewed → email to parent + player → in-app notification
   ▼
Auto-generated prescription: rubric scores map to 3 drill recommendations
   ▼
Player re-submits in 30 days → side-by-side progress comparison
```

The re-submission loop is the retention engine. **Design every screen to push toward "submit again in 30 days."**

## 6. The 7-Point Shot Mechanics Rubric

Scored 1–10 each; the framework is the intellectual property of the whole platform.

| # | Point | What the coach is looking for | Common flaw | Prescribed fix |
|---|---|---|---|---|
| 1 | **Weight Transfer** | Load onto back leg, drive through to front; hips lead hands | Shooting off the back foot; no hip rotation | Weight-shift ladder; wall-load reps |
| 2 | **Stick Flex** | Puck ahead of blade; loading the shaft into the ice, not slapping at it | Puck too close to the body; no visible bend | Flex-point drills; puck-position markers |
| 3 | **Release Timing** | Blade closes at the right moment; deception before release | Telegraphing; slow, predictable release | Quick-release ladder; hesitation reps |
| 4 | **Hand Positioning** | Bottom hand drives, top hand pulls; correct separation for shot type | Hands too close; bottom hand passive | Hand-separation reps by shot type |
| 5 | **Follow Through** | Blade finishes at the target; full extension | Cutting the finish short; blade rolling open | Target-finish reps; frame-by-frame film |
| 6 | **Balance** | Stable base through release; head steady and eyes up | Falling away; head drops to the puck | Single-leg loading; eyes-up shooting |
| 7 | **Shooting Posture** | Athletic knee bend, chest up, shoulders square to intent | Standing upright; bent at the waist | Posture holds; mirror/film checks |

**Output shape:** an overall `/70` score, a per-point radar chart, the two lowest points flagged as "focus this month," and three auto-prescribed drills tied to those points.

## 7. Pro Breakdown / Comparison Tool

- `pro_breakdowns` table stores a clip + level (`nhl` | `junior` | `aaa`) + annotated timestamps keyed to the 7 rubric points.
- Comparison view = two `<video>` elements sharing a single transport controller: play/pause, scrub, **frame-step (±1/30s)**, and speed (0.1×–1×).
- Sync-offset control lets the coach align both clips to the moment of release — the single most important UX detail in the feature, because a comparison is meaningless if the release frames aren't aligned.
- Player picks their own submission on the left, any pro clip on the right.
- Annotation overlays toggle on/off per rubric point.

## 8. Content Model

```
Pillar (6)
  └── Track            e.g. "Shot Mechanics Course", "Mindset Track"
        └── Module     e.g. "Weight Transfer"
              └── Lesson   video + notes + drills + optional quiz
                    └── Drill   reps/sets/equipment/difficulty
```

Weekly plans are generated from `(age_group, level, position, focus_areas[])` where `focus_areas` comes from the latest assessment or analysis. Start rule-based, not ML — a good rules table beats a bad model, and it's explainable to parents, which matters more.

## 9. Performance & SEO

- Marketing pages statically generated; `revalidate: 3600` on blog.
- Member app fully dynamic, server-rendered, no client data fetching on first paint.
- Fonts self-hosted via `next/font` with `display: swap`.
- Images: `next/image`, AVIF/WebP, explicit dimensions.
- Video: never autoplay; poster image + click-to-play facade (also a PageFlow requirement).
- Targets: **LCP < 1.8s, CLS < 0.05, INP < 200ms** on 4G mobile.
- Schema.org: `Organization`, `Course`, `VideoObject`, `FAQPage`, `Product` + `Offer` on pricing.
- Programmatic SEO opportunity: `/drills/[skill]-drills-for-[age-group]` — hundreds of low-competition long-tail pages.

## 10. Build Phases

| Phase | Weeks | Ships |
|---|---|---|
| **0 — Proof** | 1–2 | PageFlow landing page, email capture, free assessment, waitlist. *Validate before building.* |
| **1 — MVP** | 3–8 | Auth, Stripe, library, shot course, mindset track, drills, dashboard, progress |
| **2 — Moat** | 9–14 | Video analysis, coach console, rubric scoring, pro breakdowns, comparison tool |
| **3 — Scale** | 15–24 | Weekly plan engine, mobile PWA, team licences, referrals, community |
