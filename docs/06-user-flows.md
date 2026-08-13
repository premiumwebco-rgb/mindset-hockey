# User Flows & Wireframes

## Flow 1 — Cold Parent → Paying Member (the money flow)

```
Instagram Reel: "The 3 reasons your son's shot is slow"
        │
        ▼
LANDING PAGE  ─── hero: "I was a 16U A player. Last month I signed Junior A."
        │          ↳ proof strip: A → AAA → Junior A · Alternate Captain · 2 broken ribs
        │          ↳ story film (90s)
        │          ↳ Six Pillars
        │          ↳ before/after shot mechanics
        │          ↳ pricing
        │
        ├──▶ [Exit-intent popup]  "Free: The Overlooked Player Playbook"
        │           └─▶ email captured → 5-email nurture sequence
        │
        ▼
FREE ASSESSMENT (5 min, no card)
        │  12 questions: age, level, position, shot confidence,
        │  training frequency, bounce-back after mistakes, goals
        ▼
SCORED REPORT  "Your player scores 58/100. Weakest pillar: MINDSET."
        │  ↳ genuinely useful even if they never pay — this is the trust transaction
        ▼
TIER RECOMMENDATION  → Basic or Advanced based on level + urgency
        ▼
STRIPE CHECKOUT (7-day free trial on Basic)
        ▼
ONBOARDING (3 steps)
   1. Player profile: name, age, level, position, shoots L/R
   2. Pick focus: two of the Six Pillars
   3. Set training days per week
        ▼
DASHBOARD — Day 1 plan already loaded, one clear action
```

**Design rules for this flow**
- Never ask for a card before value is delivered. The assessment report *is* the value.
- The report must be honest. A report that flatters converts worse and refunds more.
- One CTA per screen. Every additional choice costs conversion.
- Time-to-first-value after payment must be under 60 seconds. The dashboard shows a real task immediately, not a "welcome, explore the library" empty state.

## Flow 2 — Daily Player Loop (the retention flow)

```
Push/email: "Day 12. 15 minutes. Weight transfer."
     ▼
DASHBOARD → Today's session (1 video + 3 drills + 1 mindset rep)
     ▼
Watch (2–4 min) → Do the reps → Mark complete
     ▼
Streak +1 · Pillar XP · "Next: Thursday — release timing"
     ▼
Weekly: log a self-rating → feeds the progress chart the parent looks at
```

**The parent and the player use different screens.** The player wants: today's task, streak, and their score going up. The parent wants: a weekly summary email proving the money is working. Build both.

## Flow 3 — Shot Analysis (the moat flow, Advanced only)

```
/analysis → "2 credits remaining this month"
     ▼
NEW SUBMISSION
   Step 1  How to film (30s explainer + checklist)
           ☐ Side angle, hip height, 10 ft away
           ☐ Front angle, same distance
           ☐ 5 shots minimum, same shot type
           ☐ Good lighting, whole body in frame
   Step 2  Upload (≤60s per clip, ≤200MB)
   Step 3  Context: shot type, stick flex, what they're struggling with
     ▼
"Submitted. Your breakdown will be ready within 72 hours."
     ▼
──────── COACH SIDE ────────
/coach/queue → oldest first, SLA badge (green <48h, amber <72h, red overdue)
     ▼
/coach/review/:id
   Left: video player w/ frame-step + speed control
   Right: 7-point rubric, 1–10 sliders + note per point
   Bottom: timestamped comments · record voiceover · pick 3 prescribed drills
     ▼
Publish
──────── PLAYER SIDE ────────
Email + in-app: "Your shot breakdown is ready."
     ▼
/analysis/:id
   Score 47/70 · radar chart · coach voiceover
   Focus this month: Weight Transfer (4/10) · Release Timing (5/10)
   Your 3 drills → added to weekly plan automatically
   [Compare to a pro] [Re-submit in 30 days]
     ▼
30 days later → re-submission → SIDE-BY-SIDE PROGRESS
   "Weight transfer 4 → 7."   ← the screenshot that sells the platform
```

## Flow 4 — Pro Comparison Tool

```
/pro-breakdowns → filter by level (Junior A / AAA / College), shot type, handedness
     ▼
Select a clip → annotated breakdown w/ rubric-keyed timestamps
     ▼
[Compare with my shot] → split view
     ┌──────────────┬──────────────┐
     │  YOUR CLIP   │   PRO CLIP   │
     └──────────────┴──────────────┘
     ◀◀ ◀ ▶ ▶▶   0.25×  [sync offset −0.3s]
     Toggle overlays: weight transfer · flex · release · hands · follow-through
```

## Flow 5 — Cancellation (retention, done ethically)

```
/account → Cancel
     ▼
"Before you go —" (ONE screen, no dark patterns, cancel button always visible)
   • Your progress: 34 sessions, 12-day best streak, shot score 41 → 52
   • Options: pause 1 month · downgrade to Basic · cancel
     ▼
If cancel → one honest question: why?
     ▼
Confirmed. Access until period end. Data retained.
     ▼
Day 14 winback: "Your streak is waiting." → 50% off first month back
```

Cancel must be reachable in **two clicks** from anywhere. This is a values decision and also a business one — hockey associations talk, and a brand that traps parents dies in one season.

---

# Wireframes

## Homepage (mobile-first, desktop noted)

```
┌────────────────────────────────────┐
│ MINDSET HOCKEY      [Login] [Start]│  sticky, translucent on scroll
├────────────────────────────────────┤
│                                    │
│   ▸ SILVER EYEBROW                 │  16U A → AAA → JUNIOR A
│                                    │
│   I WASN'T THE MOST                │  Anton, 44/64/80px
│   TALENTED PLAYER                  │
│   ON THE ICE.                      │
│                                    │
│   I broke my rib twice, rebuilt    │  Inter 18px, silver
│   my shot and my mindset, and      │
│   signed Junior A. Here's the      │
│   system.                          │
│                                    │
│   [ START FREE ]  [ Watch story ▸ ]│  electric blue / ghost
│                                    │
│   ─────────────────────────────    │
│   16U A   ·   AAA   ·   JUNIOR A   │  proof strip
│                                    │
│   [ hero video facade, 16:9 ]      │  ← data-lf-video
└────────────────────────────────────┘
│  "Every parent I meet says the     │  ← the empathy section
│   same thing: we're spending       │     (this is what makes them
│   more and he isn't improving."    │      keep scrolling)
├────────────────────────────────────┤
│  THE PROBLEM ISN'T EFFORT          │
│  3 cards: no plan · no feedback ·  │
│  nobody coaching the mind          │
├────────────────────────────────────┤
│  THE SIX PILLARS                   │  6 cards, hover glow
│  [1 MINDSET] [2 MECHANICS]         │
│  [3 SKILL]   [4 SYSTEMS]           │
│  [5 HABITS]  [6 LEADERSHIP]        │
├────────────────────────────────────┤
│  THE TIMELINE                      │  vertical rail, blue markers
│  ● 16U A — overlooked              │
│  ● Injury #1 — broken rib          │
│  ● Rebuilt the shot                │
│  ● Injury #2 — broken rib again    │
│  ● Alternate Captain               │
│  ● AAA                             │
│  ● JUNIOR A ✦                      │
├────────────────────────────────────┤
│  SHOT MECHANICS                    │
│  7-point framework grid            │
│  + before/after video facade       │
├────────────────────────────────────┤
│  INSIDE THE PLATFORM               │
│  4 screenshot cards                │
├────────────────────────────────────┤
│  TESTIMONIALS (3)                  │  placeholder-ready structure
├────────────────────────────────────┤
│  PRICING — 3 columns               │
│  Free · Basic $50 · Advanced $80★  │
│  "Less than one private lesson"    │
├────────────────────────────────────┤
│  FAQ (accordion, 8 items)          │
├────────────────────────────────────┤
│  FINAL CTA — full-bleed            │
│  "Talent helps. Mindset,           │
│   discipline, and consistent       │
│   work change careers."            │
├────────────────────────────────────┤
│  FOOTER + socials                  │
└────────────────────────────────────┘
```

## Member Dashboard

```
┌──────────┬─────────────────────────────────────────┐
│ SIDEBAR  │  Welcome back, Tyler       🔥 12-day    │
│          │  ───────────────────────────────────────│
│ Dashboard│  ┌─────────────────────────────────────┐│
│ Library  │  │ TODAY · WEEK 3 · DAY 2              ││
│ Drills   │  │ Weight Transfer — Loading the Back  ││
│ Mindset  │  │ 1 video · 3 drills · 15 min         ││
│ Shot     │  │            [ START SESSION ]        ││
│  Course  │  └─────────────────────────────────────┘│
│ Analysis▲│                                          │
│ Pro ▲    │  ┌────────┬────────┬────────┬─────────┐ │
│ Progress │  │ Shot   │ Streak │Sessions│ Analysis│ │
│ Account  │  │ 52/70  │  12    │  34    │ 2 left  │ │
│          │  │  ▲11   │        │        │         │ │
│ ──────── │  └────────┴────────┴────────┴─────────┘ │
│ Tier:    │                                          │
│ ADVANCED │  SIX PILLARS PROGRESS  (6 radial bars)   │
│          │                                          │
│          │  CONTINUE WATCHING (3 cards)             │
│          │  YOUR LATEST BREAKDOWN (radar + focus)   │
└──────────┴─────────────────────────────────────────┘
      ▲ = locked with upgrade badge for Basic tier
```

## Analysis Review (member view)

```
┌────────────────────────────────────────────────────┐
│ ← Analysis    Submitted Jan 12 · Reviewed Jan 14   │
├──────────────────────────┬─────────────────────────┤
│                          │  OVERALL   47/70        │
│   [ video, side angle ]  │  ┌───────────────────┐  │
│   ◀◀ ◀ ▶ ▶▶  0.25×      │  │   radar chart     │  │
│                          │  │   (7 axes)        │  │
│  ▸ 0:03 "Watch the back  │  └───────────────────┘  │
│    foot here"            │  Weight Transfer  4 ▁▁  │
│  ▸ 0:07 "Puck too close" │  Stick Flex       6 ▁▁▁ │
│                          │  Release          5 ▁▁  │
│  ▶ Coach voiceover 2:14  │  Hands            8 ▁▁▁▁│
│                          │  Follow Through   7     │
│                          │  Balance          9     │
│                          │  Posture          8     │
├──────────────────────────┴─────────────────────────┤
│ FOCUS THIS MONTH: Weight Transfer · Release Timing │
│ YOUR DRILLS: [Wall Load ×3] [Ladder] [Quick Rel.]  │
│ [ Compare to a pro ]        [ Re-submit in 30 days]│
└────────────────────────────────────────────────────┘
```
