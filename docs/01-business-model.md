# MINDSET HOCKEY — Business Model

> **Tagline:** Talent helps. Mindset, discipline, and consistent work change careers.

---

## 1. The One-Line Business

A premium online player-development membership that teaches youth hockey players (10–18) the exact mindset, mechanics, and training systems that took the founder from 16U A hockey to AAA and a signed Junior A contract — sold primarily to their parents.

## 2. Why This Business Works

| Ingredient | Why it matters here |
|---|---|
| **Proof-based founder story** | Not a retired pro talking down. A recent, verifiable jump from A → AAA → Junior A. Parents can see the ladder their kid is on. |
| **High-spend, high-anxiety buyer** | Tier 2 families average ~$2,448/season; Tier 1 (AAA) averages ~$7,055, and elite travel programs routinely exceed $10,000/yr. A $50–80/mo membership is 1–3% of what they already spend. |
| **Underserved emotional need** | Existing platforms sell *drills*. Nobody sells *the psychology of a player who was overlooked and became trusted*. That is the actual thing parents are scared about. |
| **Recurring by nature** | Development is seasonal and continuous. Weekly plans + progress tracking + video feedback create a reason to stay subscribed for 9–12 months. |
| **Defensible moat** | The founder's story, footage, and personal voice cannot be cloned. Competitors have libraries; we have a narrative + a coach. |

## 3. Positioning Statement

> For parents of 10–18 year old hockey players who are spending real money and not seeing real progress, **Mindset Hockey** is the complete player development system that trains the mind, the mechanics, and the habits together — because the founder proved that a 16U A player can become a Junior A signee without being the most talented kid in the room.

**We are not:** a drill dump, a strength app, a skills camp, or a highlight account.
**We are:** a development *system* with a coach attached.

## 4. Revenue Model

### Tiers

| Tier | Price | Target | What it really sells |
|---|---|---|---|
| **Free — The Locker Room** | $0 | Cold traffic, email capture | Trust. Proof. A taste of the framework. |
| **Basic — The System** | **$50/mo** ($450/yr, save 25%) | Committed parent, self-directed player | Structure. "We finally have a plan." |
| **Advanced — The Program** | **$80/mo** ($720/yr, save 25%) | Parent chasing AAA/Junior/Prep/NCAA | Access to a coach. "Someone is watching my kid." |

### Tier contents

**FREE**
- Development articles + SEO blog
- 8 free drills (3 shooting, 3 stickhandling, 2 mindset)
- Weekly development tip email
- "The Overlooked Player Playbook" PDF (lead magnet)
- Free 5-minute self-assessment → scored report → upsell

**BASIC — $50/mo**
- Full training library (shooting, hands, edges, conditioning, off-ice)
- **The Shot Mechanics Course** (7-module flagship)
- **Mindset Training Track** (12 lessons: adversity, confidence, coachability, pre-game routine, bounce-back)
- Weekly development plans (auto-assigned by age + level + position)
- Full drill database with filters
- Progress tracking dashboard + streaks
- Practice structure templates + game-habit checklists

**ADVANCED — $80/mo**
- Everything in Basic, plus:
- **2 video analysis submissions/month** with coach review against the 7-point rubric
- **Elite Release Library** (Junior A / AAA mechanics, annotated — all footage owned or consented; see `08-your-film-breakdown.md`)
- **Side-by-side comparison tool** (your clip vs. a pro clip, synced)
- Personalized recommendations engine driven by analysis scores
- Advanced training systems (in-season/off-season periodization)
- Priority support (48h response)
- Elite development content (recruiting, showcase prep, coach communication)

### Why $50/$80 when competitors charge $19.99–$29.99

Project Hockey ($19.99/mo), Hockey Training ($19.99/mo), and iTrain Hockey ($29.99/mo) compete on *library size*. Competing on library size against a 3,000-session catalogue is unwinnable and unprofitable.

We compete on **outcome + access**, which is where price elasticity lives:
- $80/mo is **cheaper than one private skills session** ($100–150/hr in most markets).
- The Advanced tier includes human review — a real marginal cost — which justifies the price to the buyer and creates a natural capacity limit that makes the offer feel scarce.
- Anchoring against private coaching, not against apps, is the entire pricing strategy. **Every price page must anchor on the cost of one private lesson.**

### Unit economics (conservative Year-1 assumptions)

| Metric | Assumption |
|---|---|
| Blended ARPU | $61/mo (60% Basic / 40% Advanced) |
| Gross margin | ~85% (video hosting + Stripe fees) |
| Coach time per Advanced member | ~25 min/mo → caps Advanced at ~250 members per reviewing coach |
| Target monthly churn | 7% (sports memberships run 8–12%; weekly plans + streaks are the retention lever) |
| Implied avg. lifetime | ~14 months → **LTV ≈ $730** |
| Target blended CAC | ≤ $120 (organic-led) → **LTV:CAC ≈ 6:1** |
| Free → paid conversion target | 4–7% of email list within 60 days |

### Revenue ladder

| Milestone | Members | MRR | ARR |
|---|---|---|---|
| Validation | 50 | $3,050 | $36.6K |
| Ramen-profitable | 150 | $9,150 | $110K |
| Full-time viable | 400 | $24,400 | $293K |
| Second coach hired | 800 | $48,800 | $586K |
| Category position | 2,000 | $122,000 | **$1.46M** |

## 5. Expansion Revenue (Phase 2+)

1. **1:1 Coaching** — $250/mo, 4 spots, monthly call + full video breakdown. Highest-margin, sells itself off Advanced.
2. **Team/Association licences** — $1,500–4,000/season for a whole club. Enormous leverage; one sale = 20 memberships.
3. **Summer Intensive** — $297 8-week cohort with a leaderboard and live calls. Runs in the May–Aug lull when memberships dip.
4. **Shot Mechanics Course standalone** — $197 one-time. Captures buyers who won't subscribe.
5. **Physical products** — shooting pad + tracking journal bundle. Brand extension, not a core bet.

## 6. Cost Structure

| Line | Est. monthly (early) |
|---|---|
| Video hosting (Mux/Bunny/Cloudflare Stream) | $50–300 (scales with usage) |
| Supabase (DB + auth + storage) | $25–100 |
| Vercel hosting | $20 |
| Stripe fees | 2.9% + 30¢ per transaction |
| Email (Resend/ConvertKit) | $30–100 |
| Domain/misc | $10 |
| **Total early fixed** | **~$150–500/mo** |

Break-even at roughly **10 paying members**. This is a business you can start and run at a profit almost immediately — the real constraint is attention, not capital.

## 7. Key Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Founder is the product; time doesn't scale | Rubric-driven analysis templates + a trained second reviewer by 250 Advanced members. Cap Advanced seats publicly — scarcity is also marketing. |
| Seasonality (May–Aug dip) | Off-season is *when* development happens. Reframe summer as the flagship season with an "Off-Season Blueprint" and the Summer Intensive. |
| Price objection vs. $20 competitors | Never compete on library size. Always anchor on private-lesson cost and on human video review. |
| "You're only 18/19, why should I listen?" | Turn it into the wedge: *"I'm not talking about what worked 20 years ago. I'm telling you what worked last season."* Recency is the credibility. |
| Outcome claims / advertising compliance | Never promise placement. Language is always about *process*: better mechanics, better habits, clearer plan. Testimonials get honest disclaimers. |
| Chargebacks / refund abuse | 14-day money-back guarantee, clearly stated, easy to honour. Cheaper than disputes and it converts. |

## 8. Ethical Guardrails (non-negotiable)

Hockey parents are anxious, financially stretched, and easy to exploit. This brand does not:

- Promise or imply that any tier leads to Junior, NCAA, or NHL placement.
- Use fake countdown timers, fake seat counts, or fabricated testimonials.
- Sell fear of the child "falling behind" or "missing their window."
- Make the child's worth conditional on level.
- Hide the cancel button.

It does: sell a **credible process**, show **real footage**, publish **honest pricing**, and make cancellation one click. Trust compounds; pressure doesn't. In a market this small and this word-of-mouth-driven, reputation *is* the CAC.
