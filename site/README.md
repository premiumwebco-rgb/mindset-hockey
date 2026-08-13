# Mindset Hockey — Website

Ten-page static site. No build step, no dependencies. Open `index.html` to preview, or drop the whole `site/` folder onto any host.

---

## Before you go live — 3 things left

| # | What | Where |
|---|---|---|
| 1 | **Google Analytics ID** — replace `G-XXXXXXXXXX` | every `.html` (2 spots each) + `build-pages.py` |
| 2 | **Form endpoint** — add `action="..."` to the contact form | `contact.html` |
| 3 | **Real names** — swap "Coach, Founder & Owner" and "Coach Jack" for full names | `index.html`, `coaches.html`, `build-pages.py` |

The reviews section has been removed until you have real testimonials. When you do, add a `.tcard` grid back to the homepage between Case Studies and Pricing.

Already done: phone `(240) 435-6511`, email `braydencastiglia@gmail.com`, and the training address are live on every page.

```bash
cd site
grep -rl 'G-XXXXXXXXXX' . | xargs sed -i 's/G-XXXXXXXXXX/G-YOURID/g'
```

Also swap `https://mindsethockey.com` for your real domain in canonicals, OG tags, `robots.txt` and `sitemap.xml`.

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage — hero (both coaches), six pillars, shot analysis, film, **coaching staff**, **mindset development**, case studies, pricing + on-ice, FAQ, Waldorf map |
| `coaches.html` | **New.** Founder/Owner profile + Coach Jack bio, Junior A game film, how the staff works |
| `pricing.html` | Basic / Premium / Custom, comparison table, five-system breakdown, mindset section, pricing FAQ |
| `programs.html` | Shot analysis, mindset development (10 topics), the six-pillar system, complete Premium system |
| `about.html` | Founder story and timeline, ending in founding the business |
| `locations.html` | The Capital Clubhouse only — address, directions, on-ice pricing, service area |
| `contact.html` | Lead form with plan and training-location preference |
| `thank-you.html` | Post-submit page (noindex) |
| `privacy.html` | Privacy policy |
| `404.html` | Custom not-found (noindex) |

`build-pages.py` regenerates everything except `index.html` and `pricing.html`, which are hand-authored. Edit the shared nav/footer/CTA/location constants in that script and re-run `python3 build-pages.py`.

---

## Location — single site

Everything now points at one place:

**The Capital Clubhouse · 3033 Waldorf Market Place · Waldorf, MD 20603**

Baltimore, Columbia, Annapolis, Howard County and Anne Arundel are gone from every page, map, schema block and FAQ answer — verified at zero occurrences. Service-area content targets Waldorf, White Plains, La Plata, Brandywine, Charles County and Southern Maryland.

Local SEO shipped for this location: `LocalBusiness` + `SportsActivityLocation` schema with the real address and geo coordinates, `geo.region` / `geo.placename` / `ICBM` meta tags, Waldorf-targeted page titles and H1s, a location-specific FAQ answer, and Google Maps embeds + directions links pointed at the rink.

**Verify the geo coordinates.** I used 38.6284, -76.9310 from the street address. Open the site's map, confirm the pin sits on the building, and correct the numbers in `index.html` and `build-pages.py` if it's off.

**Next for local ranking:** claim your Google Business Profile and make the name, address and phone match this site exactly. That consistency beats anything on-page.

---

## Coaching staff

The site now presents a two-person organization with a clear hierarchy.

**Coach, Founder & Owner (you)** — labelled Coach, Founder & Owner everywhere, tagged Junior A Player like Jack. Copy states you own the business, set the development systems and program direction, coach players directly, and are the primary point of contact. Red-accented card, listed first, with a "Talk to the Owner" CTA.

**Coach Jack — Development Coach** — Junior A player, NCAA prospect, skill development specialist, player mentor. Full bio from your notes (Single-A at 16, broken collarbone and wrist, rebuilt his shot, Junior A by 20, pursuing NCAA). Blue-accented card, clearly staff rather than principal.

His headshot, action photo and two game clips are in `media/` as `coach-jack-*`. The clips are transcoded to web MP4 with poster frames and click-to-play — nothing downloads until a visitor asks.

---

## Pricing implemented

| Plan | Setup | Monthly |
|---|---|---|
| **Basic** | $600 | $200 |
| **Premium** | $849 | $250 |
| **Custom** | Quote | Quote |

Basic: personalized training guidance, monthly check-ins, basic performance tracking, access to training resources.

Premium adds: specialized workout plan, nutrition/meal plan, video analysis, advanced tracking, priority support, personalized coaching, **mindset development training**.

Custom: "Need something tailored specifically to your goals? Build a custom package by selecting the services you want from our Premium offerings and more. Contact us for a personalized quote." → **Request Custom Quote** button.

---

## Mindset development

A dedicated section appears on the homepage, the programs page and the pricing page, covering all ten topics: confidence building, mental toughness, handling mistakes, performing under pressure, goal setting, accountability, winning habits, discipline and consistency, game preparation routines, leadership development.

Premium is positioned throughout as a complete development system — skill development, strength and conditioning, nutrition, video analysis and mindset coaching — rather than just hockey training.

---

## Analytics events already wired

Fires to both `gtag` and `dataLayer`, so GA4 or GTM both work.

| Event | Triggered by |
|---|---|
| `generate_lead` | Contact form submit (includes plan and training-location preference) |
| `phone_click` | Any `tel:` link |
| `email_click` | Any `mailto:` link |
| `cta_click` | Any element with `data-cta` — 70 tagged across the site |
| `program_inquiry` | Any plan CTA (`data-plan`) |
| `video_play` | Video facade click, including Coach Jack's game film |
| `scroll_depth` | 25 / 50 / 75 / 90% |

In GA4, mark `generate_lead` and `phone_click` as **key events** to track conversions.

---

## Notes

**Reviews are off the site for now.** No placeholder quotes, no invented testimonials. Add real ones with written consent when you have them — that's the single highest-converting thing you can add to this site.

**On-ice sessions: $200**, no set time limit, both coaches when available, small session sizes. Live on the homepage, pricing page, locations page, contact form dropdown, FAQ and offer schema.

**"AA" appears in exactly one place** — the level dropdown on the contact form, where a *customer* selects their own child's level. Every claim about your playing career reads 16U A → AAA → Junior A.

---

## Performance

No frameworks, no build step. One stylesheet and one script, both cached across pages. Fonts preconnected with `display=swap`. Images lazy-loaded below the fold, hero image `fetchpriority="high"`. Video is click-to-play — nothing loads until asked.
