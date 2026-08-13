# MINDSET HOCKEY

> **Talent helps. Mindset, discipline and consistent work change careers.**

Hockey training and player development in Waldorf, Maryland, for players 10–18 —
built on a real story: 16U A → two broken ribs → alternate captain → AAA →
signed Junior A.

One Next.js application serves both the public marketing site and the
authenticated member portal.

---

## Current status — read this first

| Piece | State |
|---|---|
| Marketing site (9 routes) | **Working.** Verified rendering locally |
| Production build | **Passing.** 49/49 pages generated |
| TypeScript | **Clean** |
| Member portal, auth, RBAC | Code complete — **never run against a real database** |
| Stripe billing | Code complete — **never run against real Stripe** |
| AI Shot Analysis | Code complete — **never run against a real model** |
| Supabase project | **Does not exist yet** |
| Migrations 0001–0004 | Written, **not applied anywhere** |

There is no `.env.local` and no backend. The app runs in **demo mode** with seed
data until you create one. Nothing below the third row has been executed at
runtime — see `app/RUNBOOK.md` to change that, one stage at a time.

---

## Layout

```
mindset-hockey/
├── app/                     THE APPLICATION (Next.js 15, App Router)
│   ├── app/(marketing)/     Public site — 9 routes, ported from site/
│   ├── app/(app)/           Member portal (auth required)
│   │   ├── analysis/        AI Shot Analysis: upload, history, report
│   │   ├── coach/           Coach console incl. the AI review fallback queue
│   │   └── admin/           Admin dashboard
│   ├── app/(auth)/          Login, signup, password reset
│   ├── app/api/             Stripe webhooks, analysis pipeline, leads
│   ├── lib/ai/              Rubric, output validation, analyzer, storage, quota
│   ├── supabase/migrations/ 0001–0004, run in order
│   ├── public/              site.css / site.js / media served to the browser
│   ├── SETUP.md             Start here
│   ├── RUNBOOK.md           Untested → launch-ready, stage by stage
│   └── VERIFICATION.md      What static verification did and did not prove
│
├── site/                    The finished static marketing site.
│                            Source of truth for the marketing markup; the
│                            (marketing) routes were ported from these files.
│
├── media/                   Raw source footage not used by the live site
│
└── docs/                    Strategy written before the build
```

`site/` is kept deliberately. It is the reference the Next.js marketing routes
were converted from, and `site/build-pages.py` still regenerates the shared
nav/footer pages. If you change marketing copy, change it in both places.

---

## Pricing

| Plan | Setup | Monthly | AI Shot Analysis |
|---|---|---|---|
| **Standard** | $249 | $100 | **Included** |
| **Premium** | $389 | $149 | **Included** |
| Private on-ice session | — | $149/session | — |

**AI Shot Analysis is included with both plans.** Premium adds the customized
training program, performance nutrition guidance, video analysis and breakdowns,
advanced tracking, mindset development, priority support and monthly coaching
review sessions.

Founding members lock their monthly rate for as long as they stay.

---

## AI Shot Analysis — what it is, honestly

Upload a phone clip; it grades the shot across ten mechanics categories.

**It reads still frames from video**, the way a coach does stepping through
film. It is **not** a biomechanics lab: it cannot measure joint angles, puck
velocity or force, and it does not claim to. Anything the footage cannot support
comes back as `insufficient_footage` rather than a guessed number, every
category carries a confidence level, and each judgement is labelled *observed*
or *inferred*.

If the model cannot read the clip — or no API key is configured — the video is
preserved and routed to a human coach. **No code path fabricates a score.**

---

## Quick start

```bash
cd app
npm install
npm run dev          # demo mode; no credentials needed
```

Then read `app/SETUP.md`.

---

## Coaching staff

**Coach Brayden** — Owner & Lead Coach, Junior A player. Built the seven-point
shot rubric, the six-pillar framework and the standard the staff coaches to.
Answers every inquiry personally.

**Coach Jack** — Development Coach, Junior A player and NCAA prospect. Broke his
collarbone and wrist at 16 playing Single-A, rebuilt his shot from the ground up,
reached Junior A by 20.

**The Capital Clubhouse** · 3033 Waldorf Market Place · Waldorf, MD 20603
(240) 435-6511 · braydencastiglia@gmail.com

---

*Individual results vary. No program can guarantee placement at any level of hockey.*
