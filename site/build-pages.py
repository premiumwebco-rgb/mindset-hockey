#!/usr/bin/env python3
"""
Generates the shared-shell pages for the Mindset Hockey site.
index.html and pricing.html are hand-authored; everything else is built here so
the nav, footer, sticky CTA, analytics and SEO tags stay identical everywhere.

Run:  python3 build-pages.py
"""
import os, html

SITE   = "https://mindsethockey.com"
PHONE  = "+12404356511"
PHONED = "(240) 435-6511"
EMAIL  = "braydencastiglia@gmail.com"
GA     = "G-XXXXXXXXXX"

# ── Single training location ────────────────────────────────────────────────
VENUE   = "The Capital Clubhouse"
STREET  = "3033 Waldorf Market Place"
CITY    = "Waldorf"
REGION  = "MD"
ZIP     = "20603"
MAPQ    = "The+Capital+Clubhouse,+3033+Waldorf+Market+Place,+Waldorf,+MD+20603"

NAVITEMS = [("index.html","Home"),("programs.html","Programs"),("coaches.html","Coaches"),
            ("pricing.html","Pricing"),("locations.html","Location"),
            ("about.html","About"),("contact.html","Contact")]

def head(title, desc, path, extra_ld="", noindex=False):
    og = f"{SITE}/assets/og-image.jpg"
    robots = '<meta name="robots" content="noindex,follow">' if noindex else ''
    canon  = '' if noindex else f'<link rel="canonical" href="{SITE}/{path}">'
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#05070C">
{robots}
{canon}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Mindset Hockey">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{og}">
<meta property="og:url" content="{SITE}/{path}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{og}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<noscript><style>.rv{{opacity:1!important;transform:none!important}}.stickycta{{display:none}}</style></noscript>
<script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA}');</script>
{extra_ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
"""

def nav(active):
    CUR = ' aria-current="page"'
    links = "".join(
        '      <a href="%s"%s>%s</a>\n' % (h, CUR if h == active else "", t)
        for h, t in NAVITEMS)
    mob = "".join(f'    <a href="{h}">{t}</a>\n' for h,t in NAVITEMS)
    return f"""<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="logo" href="index.html" aria-label="Mindset Hockey home"><b>MINDSET</b><span>HOCKEY</span></a>
    <nav class="nav-links" aria-label="Primary">
{links}    </nav>
    <div class="nav-cta">
      <a class="nav-phone" href="tel:{PHONE}">{PHONED}</a>
      <a class="btn btn-primary btn-sm" href="contact.html" data-cta="book_assessment" data-cta-location="nav">Free Assessment</a>
      <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false"><i></i><i></i><i></i></button>
    </div>
  </div>
  <div id="mobileMenu">
{mob}    <a href="tel:{PHONE}">Call {PHONED}</a>
  </div>
</header>

<main id="main">
"""

def crumbs(trail):
    """trail = [(href|None, label)] — last item is the current page."""
    lis = ""
    for href,label in trail:
        lis += f'<li><a href="{href}">{label}</a></li>' if href else f'<li><span aria-current="page">{label}</span></li>'
    items = []
    for i,(href,label) in enumerate(trail,1):
        it = f'{{"@type":"ListItem","position":{i},"name":"{label}"'
        it += f',"item":"{SITE}/{href}"}}' if href else '}'
        items.append(it)
    ld = ('<script type="application/ld+json">{"@context":"https://schema.org",'
          '"@type":"BreadcrumbList","itemListElement":[' + ",".join(items) + ']}</script>')
    return f'<div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><ol>{lis}</ol></nav></div>\n{ld}\n'

FOOTER = f"""</main>
<footer>
  <div class="wrap">
    <div class="f-grid">
      <div class="f-col">
        <a class="logo" href="index.html"><b>MINDSET</b><span>HOCKEY</span></a>
        <p class="muted small mt1" style="max-width:34ch">Hockey training in Waldorf, Maryland for players 10–18. Skill development, strength, nutrition, video analysis and mindset coaching at {VENUE} — plus remote coaching anywhere.</p>
        <p class="small mt1 muted">{VENUE}<br>{STREET}<br>{CITY}, {REGION} {ZIP}</p>
        <p class="small mt1"><a href="tel:{PHONE}">{PHONED}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></p>
        <div class="socials">
          <a href="https://instagram.com/mindsethockey" aria-label="Mindset Hockey on Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
          <a href="https://youtube.com/@mindsethockey" aria-label="Mindset Hockey on YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"/></svg></a>
          <a href="https://tiktok.com/@mindsethockey" aria-label="Mindset Hockey on TikTok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 6.5A4.5 4.5 0 0 0 18.5 11"/></svg></a>
        </div>
      </div>
      <div class="f-col"><h4>Programs</h4><a href="programs.html">All Programs</a><a href="pricing.html">Pricing</a><a href="programs.html#shot-analysis">Shot Analysis</a><a href="programs.html#mindset">Mindset Development</a><a href="pricing.html#premium">Premium Program</a><a href="contact.html?plan=custom">Custom Quote</a></div>
      <div class="f-col"><h4>Company</h4><a href="about.html">About &amp; Story</a><a href="coaches.html">Coaching Staff</a><a href="locations.html">Waldorf, MD Location</a><a href="contact.html">Contact</a><a href="privacy.html">Privacy Policy</a></div>
      <div class="f-col"><h4>Get started</h4><a href="contact.html">Free Assessment</a><a href="tel:{PHONE}">Call Us</a><a href="mailto:{EMAIL}">Email Us</a></div>
    </div>
    <div class="f-bot"><span>© 2026 Mindset Hockey. All rights reserved.</span><span>Individual results vary. No program can guarantee placement at any level of hockey.</span></div>
  </div>
</footer>

<div class="stickycta" id="stickyCta">
  <a class="call" href="tel:{PHONE}" aria-label="Call Mindset Hockey"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg></a>
  <a class="btn btn-primary btn-block" href="contact.html" data-cta="sticky_mobile" data-cta-location="sticky">Book Free Assessment</a>
</div>
<script src="assets/site.js" defer></script>
</body>
</html>
"""

FINALE = f"""<section class="finale">
  <div class="wrap">
    <h2 class="rv">Talent helps. Mindset changes careers.</h2>
    <p class="lede rv" style="max-width:58ch">Tell us your player's age, level and what's frustrating you. We'll come back within 24 hours with an honest read on what to work on first.</p>
    <div class="hero-actions rv" style="justify-content:center">
      <a class="btn btn-primary btn-lg" href="contact.html" data-cta="final_cta" data-cta-location="finale">Book a Free Assessment</a>
      <a class="btn btn-ghost btn-lg" href="tel:{PHONE}">Call {PHONED}</a>
    </div>
    <p class="mt2"><span class="respond">⏱ We respond to all inquiries within 24 hours</span></p>
  </div>
</section>
"""

def staffstrip(eyebrow, heading, lede, band=True, cta="Meet the Coaching Staff"):
    """Compact two-coach block reused across pages."""
    cls = ' class="band"' if band else ""
    return f"""<section{cls}>
  <div class="wrap">
    <div class="head center rv">
      <p class="eyebrow center">{eyebrow}</p>
      <h2>{heading}</h2>
      <p class="lede mt2">{lede}</p>
    </div>
    <div class="staff">
      <article class="coach lead rv">
        <div class="coach-photo">
          <span class="coach-badge">Coach &amp; Owner</span>
          <img src="media/coach-brayden-headshot.jpg" alt="Coach Brayden, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width="560" height="560" loading="lazy">
        </div>
        <div class="coach-body">
          <h3>Coach Brayden</h3>
          <p class="coach-role">Owner &amp; Lead Coach · Junior A Player</p>
          <ul class="chips"><li>Junior A Player</li><li>Program Founder</li><li>Lead Coach</li></ul>
          <p>Coach Brayden owns the business and set every development system here — the 7-point rubric, the six pillars and the standard the whole staff coaches to. Still on the ice and in the film room every week, and the person who answers your first message.</p>
        </div>
      </article>
      <article class="coach rv">
        <div class="coach-photo">
          <span class="coach-badge blue">Development Coach</span>
          <img src="media/coach-jack-headshot.jpg" alt="Coach Jack, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width="620" height="619" loading="lazy">
        </div>
        <div class="coach-body">
          <h3>Coach Jack</h3>
          <p class="coach-role">Development Coach · Junior A Player</p>
          <ul class="chips"><li>Junior A Player</li><li>NCAA Prospect</li><li>Player Mentor</li></ul>
          <p>Broke his collarbone and wrist at 16 playing Single-A, rebuilt his shot from the ground up, and reached Junior A by 20. He's currently exploring NCAA opportunities — and he coaches the climb he's still on.</p>
        </div>
      </article>
    </div>
    <p class="center mt3"><a class="btn btn-ghost" href="coaches.html" data-cta="staffstrip_coaches" data-cta-location="staffstrip">{cta}</a></p>
  </div>
</section>
"""

PAGES = {}

# ─────────────────────────────── COACHES ─────────────────────────────────
COACH_LD = """<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SportsActivityLocation","@id":"https://mindsethockey.com/#business",
"name":"Mindset Hockey","url":"https://mindsethockey.com/coaches.html",
"employee":[
 {"@type":"Person","jobTitle":"Coach, Founder & Owner","name":"Coach Brayden",
  "description":"Coach, founder and owner of Mindset Hockey. Junior A player who progressed from 16U A to AAA to Junior A. Owns the business and oversees all player development systems, program direction and coaching standards."},
 {"@type":"Person","jobTitle":"Development Coach","name":"Coach Jack",
  "description":"Junior A player and NCAA prospect. Skill development specialist and player mentor at Mindset Hockey."}
]}
</script>"""

PAGES["coaches.html"] = dict(
  title="Coaching Staff | Hockey Coaches in Waldorf, Maryland | Mindset Hockey",
  desc="Meet the Mindset Hockey coaching staff: Coach Brayden, owner and lead coach, and Coach Jack, a Junior A development coach and NCAA prospect, training players in Waldorf, MD.",
  active="coaches.html",
  trail=[("index.html","Home"),(None,"Coaching Staff")],
  extra_ld=COACH_LD,
  body=f"""
<section style="padding-bottom:30px">
  <div class="faceoff" style="width:470px;height:470px;top:-100px;right:-160px" aria-hidden="true"></div>
  <div class="wrap"><div class="head center">
    <p class="eyebrow center">The coaching staff</p>
    <h1>Learn from coaches<br>still living the game</h1>
    <p class="lede mt2">Two coaches, both currently playing Junior A. Our staff combines leadership, experience and a passion for player development — helping athletes improve their skills, confidence and understanding of the game, on and off the ice. One of us owns the program; both of us coach it.</p>
    <p class="mt2"><span class="respond">⏱ We respond to all inquiries within 24 hours</span></p>
  </div></div>
</section>

<section style="padding-top:0">
  <div class="wrap">
    <div class="staff">

      <article class="coach lead rv">
        <div class="coach-photo">
          <span class="coach-badge">Coach &amp; Owner</span>
          <img src="media/coach-brayden-headshot.jpg" alt="Coach Brayden, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width="560" height="560" loading="lazy">
        </div>
        <div class="coach-body">
          <h3>Coach Brayden</h3>
          <p class="coach-role">Owner &amp; Lead Coach · Junior A Player</p>
          <ul class="chips">
            <li>Junior A Player</li><li>Program Founder</li><li>Business Owner</li>
            <li>Lead Coach</li><li>Former Alternate Captain</li>
          </ul>
          <p>I started Mindset Hockey because nobody coached me on the two things that actually changed my career — my shot mechanics and how I thought. I was a 16U A player who broke his rib twice, lost most of two seasons, rebuilt from zero, earned a letter, moved up to AAA and signed with a Junior A organization.</p>
          <p>As owner I set the direction of the program: the seven-point shot rubric, the six-pillar framework, the weekly plan structure and the standard every coach on this staff is held to. I oversee all operations and player development systems — and I'm still on the ice and in the film room with players every week.</p>
          <p>I'm also the person you talk to first. Every inquiry comes to me, and I answer it myself within 24 hours.</p>
          <div class="foot">
            <a class="btn btn-red btn-block" href="contact.html" data-cta="contact_founder" data-cta-location="coaches">Talk to Coach Brayden</a>
            <p class="mt1 small center"><a href="about.html">Read the full story →</a></p>
          </div>
        </div>
      </article>

      <article class="coach rv">
        <div class="coach-photo">
          <span class="coach-badge blue">Development Coach</span>
          <img src="media/coach-jack-headshot.jpg" alt="Coach Jack, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width="620" height="619">
        </div>
        <div class="coach-body">
          <h3>Coach Jack</h3>
          <p class="coach-role">Development Coach · Junior A Player</p>
          <ul class="chips">
            <li>Junior A Player</li><li>NCAA Prospect</li>
            <li>Skill Development Specialist</li><li>Player Mentor</li>
          </ul>
          <p>Hockey stopped being just a sport for Jack early on — it became the thing he built his life around. At 16, playing Single-A, he broke his collarbone and his wrist. Those injuries became the turning point of his career.</p>
          <p>He refused to let the setbacks define him and used them as fuel. Rebuilding his shot after the wrist injury took months of deliberate, unglamorous work, and it taught him how to break a skill down to its parts and put it back together properly.</p>
          <p>That work took him from Single-A at 16 to competing at the Junior A level by 20. He's currently exploring opportunities with NCAA programs as he continues chasing the next level.</p>
          <p>Because he's lived both the setbacks and the success, Jack knows exactly what the climb demands. As a coach his focus is developing the whole player — the skills on the ice, and the confidence, discipline, work ethic and mindset that decide how far those skills go.</p>
          <div class="foot">
            <a class="btn btn-primary btn-block" href="contact.html" data-cta="contact_coach_jack" data-cta-location="coaches">Book a Free Assessment</a>
          </div>
        </div>
      </article>

    </div>

</div>
</section>

<div class="rinkline" aria-hidden="true"></div>

<section class="band">
  <div class="wrap">
    <div class="head center rv"><p class="eyebrow center">Coach Jack · game film</p><h2>He's still playing<br>at the level you're chasing</h2>
    <p class="lede mt2">Real Junior A game film. The point isn't highlights — it's that the person coaching your player is competing at the level right now, not describing it from memory.</p></div>
    <div class="compare rv">
      <div class="facade" data-lf-video data-video-src="media/coach-jack-clip-1.mp4" data-video-title="Coach Jack game film 1" role="button" tabindex="0" aria-label="Play Coach Jack game film, clip one">
        <span class="tag">Junior A · game film</span>
        <img src="media/poster-coach-clip-1.jpg" alt="Junior A game film still showing Coach Jack circled as the play develops in the offensive zone" width="1172" height="540" loading="lazy">
        <span class="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z"/></svg></span></span>
        <div class="cap">Reading the play and attacking the middle</div>
      </div>
      <div class="facade" data-lf-video data-video-src="media/coach-jack-clip-2.mp4" data-video-title="Coach Jack game film 2" role="button" tabindex="0" aria-label="Play Coach Jack game film, clip two">
        <span class="tag">Junior A · game film</span>
        <img src="media/poster-coach-clip-2.jpg" alt="Junior A game film still showing a rush entering the offensive zone" width="1172" height="540" loading="lazy">
        <span class="play"><span><svg width="20" height="24" viewBox="0 0 22 26" fill="#fff" aria-hidden="true"><path d="M22 13 0 26V0z"/></svg></span></span>
        <div class="cap">Zone entry into a net-front finish</div>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="head center rv"><p class="eyebrow center">How the staff works</p><h2>One system, two coaches</h2></div>
    <div class="cards c3">
      <article class="card rv"><span class="num">01</span><h3>Coach Brayden sets the system</h3><p>The framework, the rubric and the coaching standard are Coach Brayden's. Every plan that goes out is built on the same system, so nothing a player learns from one coach contradicts the other.</p></article>
      <article class="card rv"><span class="num">02</span><h3>Coach Jack develops the skills</h3><p>Skill sessions, shot rebuilds and mentoring from someone currently competing at Junior A and pursuing NCAA opportunities — recent enough to remember every step of the climb.</p></article>
      <article class="card rv"><span class="num">03</span><h3>Nothing gets outsourced</h3><p>Every breakdown is done by a named coach on this page. There's no queue, no anonymous reviewer, and no template responses.</p></article>
    </div>
    <div class="contactstrip mt3 rv">
      <div><h3>Want to meet the staff?</h3><p>Book a free assessment at {VENUE} in {CITY} and meet Coach Brayden and Coach Jack before you commit to anything.</p></div>
      <div class="acts"><a class="btn btn-primary" href="contact.html" data-cta="coaches_contact" data-cta-location="coaches">Book a Free Assessment</a><a class="btn btn-ghost" href="pricing.html">See Programs</a></div>
    </div>
  </div>
</section>
{FINALE}""")

# ─────────────────────────────── PROGRAMS ────────────────────────────────
PAGES["programs.html"] = dict(
  title="Hockey Training Programs in Waldorf, MD | Shot Analysis &amp; Mindset Development",
  desc="Hockey development programs for players 10–18 in Waldorf, Maryland: 7-point shot mechanics analysis, mindset development training, hockey workout and nutrition plans, and video breakdowns.",
  active="programs.html",
  trail=[("index.html","Home"),(None,"Programs")],
  body=f"""
<section style="padding-bottom:34px">
  <div class="faceoff" style="width:460px;height:460px;top:-90px;right:-150px" aria-hidden="true"></div>
  <div class="wrap"><div class="head center">
    <p class="eyebrow center">What we coach</p>
    <h1>Programs built<br>around the player</h1>
    <p class="lede mt2">Six pillars, one system, coached at {VENUE} in {CITY}, Maryland — and remotely. Every program below maps to the same framework, so nothing your player learns is disconnected from anything else.</p>
    <p class="mt2"><span class="respond">⏱ We respond to all inquiries within 24 hours</span></p>
  </div></div>
</section>

<section style="padding-top:0" id="shot-analysis">
  <div class="wrap"><div class="split">
    <div class="rv">
      <p class="eyebrow">Program 01</p>
      <h2 style="font-size:clamp(24px,4vw,38px)">Shot mechanics analysis</h2>
      <p class="lede mt2">Film two phone angles. Every submission comes back scored 1–10 on all seven mechanics points, with timestamped notes on the exact frame each one breaks.</p>
      <ul class="ticks">
        <li>Weight transfer, stick flex, release timing, hand position</li>
        <li>Follow through, balance and shooting posture</li>
        <li>Coach voiceover walking through every fix</li>
        <li>Three prescribed drills added to the weekly plan</li>
        <li>Re-film at 30 days for a side-by-side comparison</li>
      </ul>
      <p class="mt2"><a class="btn btn-primary" href="contact.html?plan=premium" data-plan="premium" data-cta="program_shot" data-cta-location="programs">Get Your Shot Analyzed</a></p>
      <p class="mt2 small muted"><b class="hl">AI Shot Analysis is included with both the Standard and Premium programs.</b> Upload a clip from your phone and it grades ten mechanics categories, telling you what it could see and how confident it is. It reads video frames &mdash; it is not a biomechanics lab, and anything the footage does not show clearly comes back marked rather than guessed at.</p>
    </div>
    <figure class="sample rv">
      <img src="media/release-annotated.jpg" alt="Annotated hockey shot release frame showing loaded stick flex, puck leaving the toe of the blade, planted front foot and airborne back leg" width="1280" height="720" loading="lazy">
      <figcaption>A real scored release frame</figcaption>
    </figure>
  </div></div>
</section>

<div class="rinkline" aria-hidden="true"></div>

<section class="band" id="mindset">
  <div class="wrap"><div class="split rev">
    <figure class="hero-shot rv" style="margin:0">
      <img src="media/photo-battle-square.jpg" alt="Coach Brayden, number 17, battling for a loose puck in front of the net during a game" width="800" height="800" loading="lazy">
      <figcaption>Coach Brayden — the season everything changed</figcaption>
    </figure>
    <div class="rv">
      <p class="eyebrow">Program 02 · Included with Premium</p>
      <h2 style="font-size:clamp(24px,4vw,38px)">Mindset development<br>training</h2>
      <p class="lede mt2">Physical skills are only part of the equation. Our Premium athletes receive guidance on confidence, discipline, accountability and mental performance so they can perform at their best both on and off the ice.</p>
      <ul class="ticks">
        <li>The 20-second reset for the shift after a mistake</li>
        <li>Building a repeatable pre-game routine</li>
        <li>Confidence follows evidence — how to manufacture it</li>
        <li>Coming back from injury without losing yourself</li>
        <li>What to do when the coach stops playing you</li>
      </ul>
      <p class="mt2"><a class="btn btn-primary" href="pricing.html#premium" data-plan="premium" data-cta="program_mindset" data-cta-location="programs">See the Premium Program</a></p>
    </div>
  </div></div>
</section>

<section id="mindset-topics">
  <div class="crease" style="width:340px;height:170px;right:-90px;top:60px" aria-hidden="true"></div>
  <div class="wrap">
    <div class="head center rv">
      <p class="eyebrow center">What we actually coach</p>
      <h2>Ten things nobody<br>teaches at practice</h2>
      <p class="lede mt2">Hockey success comes from developing the athlete and the person. Each of these is coached deliberately, with a drill or routine attached — not as a pep talk.</p>
    </div>
    <div class="mindgrid rv">
      <div class="mind"><b>01</b><h3>Confidence building</h3><p>Confidence follows evidence. We build the evidence on purpose — tracked reps, visible progress, scores that move.</p></div>
      <div class="mind"><b>02</b><h3>Mental toughness</h3><p>Finishing the session, the shift and the season when it stops being fun. Trained through standards, not slogans.</p></div>
      <div class="mind"><b>03</b><h3>Handling mistakes</h3><p>The 20-second reset. What to do between the turnover and the next puck drop so one error doesn't become four.</p></div>
      <div class="mind"><b>04</b><h3>Performing under pressure</h3><p>Tryouts, showcases, playoff overtime. Breathing, focus cues and narrowing attention to the next play only.</p></div>
      <div class="mind"><b>05</b><h3>Goal setting</h3><p>Process goals he controls instead of outcome goals he doesn't. Reviewed monthly against real tracking data.</p></div>
      <div class="mind"><b>06</b><h3>Accountability</h3><p>Owning the tape, the missed session and the bad shift — without spiraling. The single biggest separator we see.</p></div>
      <div class="mind"><b>07</b><h3>Winning habits</h3><p>The daily standard: sleep, fuel, stick work, film. What he does on the days nobody is watching.</p></div>
      <div class="mind"><b>08</b><h3>Discipline &amp; consistency</h3><p>Showing up at the same level on low-motivation days. Systems and streaks that make the choice smaller.</p></div>
      <div class="mind"><b>09</b><h3>Game preparation</h3><p>A repeatable pre-game routine — timing, warm-up, music, visualization — so he arrives ready instead of hoping.</p></div>
      <div class="mind"><b>10</b><h3>Leadership</h3><p>Communicating with coaches, holding teammates to a standard and becoming the player used in the moments that matter.</p></div>
    </div>
    <div class="honestnote rv">
      <p><span class="hl">Why this is in the program at all:</span> Coach Brayden lost most of two seasons to broken ribs and our development coach broke his collarbone and wrist at 16. Both came back further along than they left. Neither of those comebacks was a physical story — and that's exactly why the mental side is coached here instead of assumed.</p>
    </div>
    <p class="center mt3"><a class="btn btn-primary btn-lg" href="pricing.html#premium" data-plan="premium" data-cta="mindset_premium" data-cta-location="programs_mindset">Mindset Training Is Included With Premium</a></p>
  </div>
</section>

<div class="rinkline" aria-hidden="true"></div>

<section class="band">
  <div class="wrap">
    <div class="head center rv"><p class="eyebrow center">Program 03–06</p><h2>The rest of the system</h2></div>
    <div class="cards c2">
      <article class="card rv"><span class="num">03</span><h3>Skill development</h3><p>Hands, edges, puck protection, deception and winning 1-on-1s. On-ice and off-ice progressions your player can actually run at home between sessions.</p></article>
      <article class="card rv"><span class="num">04</span><h3>Training systems</h3><p>Weekly plans built from age, level and position. In-season versus off-season periodization, load management and recovery — so he peaks for tryouts, not in October.</p></article>
      <article class="card rv"><span class="num">05</span><h3>Habits &amp; nutrition</h3><p>The daily standard, practice structure and game habits — plus a specialized hockey nutrition and meal plan on Premium. The unglamorous part that decides everything.</p></article>
      <article class="card rv"><span class="num">06</span><h3>Leadership &amp; recruiting</h3><p>Coachability, communicating with coaches, and how Junior recruiting actually works — what scouts look at, when they look, and what parents get wrong.</p></article>
    </div>
    <div class="contactstrip mt3 rv">
      <div><h3>Which program does your player need?</h3><p>Tell us the age, level and the thing that's frustrating you. We'll give you an honest recommendation.</p></div>
      <div class="acts"><a class="btn btn-primary" href="contact.html" data-cta="programs_help" data-cta-location="programs">Talk to a Coach</a><a class="btn btn-ghost" href="pricing.html">See Pricing</a></div>
    </div>
  </div>
</section>

<section id="complete-system">
  <div class="wrap">
    <div class="head center rv">
      <p class="eyebrow center">The Premium Program</p>
      <h2>A complete development<br>system, not just training</h2>
      <p class="lede mt2">Most players get skills coaching and nothing else — no strength plan, no nutrition, no film, no mental side. Premium puts all five together so they reinforce each other instead of competing for his time.</p>
    </div>
    <div class="cards c5 rv">
      <article class="card"><span class="num">01</span><h3>Skill development</h3><p>Shot mechanics, hands, edges and 1-on-1 play, coached against the 7-point rubric.</p></article>
      <article class="card"><span class="num">02</span><h3>Strength &amp; conditioning</h3><p>A specialized hockey workout plan built for his age, level and season phase.</p></article>
      <article class="card"><span class="num">03</span><h3>Nutrition</h3><p>A specialized hockey nutrition and meal plan — fueling for practice, games and growth.</p></article>
      <article class="card"><span class="num">04</span><h3>Video analysis</h3><p>Scored breakdowns with timestamped notes, coach voiceover and prescribed drills.</p></article>
      <article class="card"><span class="num">05</span><h3>Mindset coaching</h3><p>Confidence, discipline, accountability and performing under pressure — coached on purpose.</p></article>
    </div>
    <p class="center mt3"><a class="btn btn-primary btn-lg" href="pricing.html#premium" data-plan="premium" data-cta="premium_complete" data-cta-location="programs">See Premium — $389 setup + $149/mo</a></p>
  </div>
</section>

{staffstrip("Who coaches it",
  "Every program above is<br>coached by these two",
  "No queue, no anonymous reviewer, no rotating cast of part-timers. Your player works with Coach Brayden, who built this system, or with Coach Jack, a current Junior A player and NCAA prospect.",
  band=True)}
{FINALE}""")

# ──────────────────────────────── ABOUT ──────────────────────────────────
PAGES["about.html"] = dict(
  title="About Mindset Hockey | Founder-Led Hockey Training in Waldorf, MD",
  desc="The story behind Mindset Hockey: a 16U A player who broke his rib twice, rebuilt his shot and mindset, reached AAA, signed Junior A — and founded a hockey development program in Waldorf, Maryland.",
  active="about.html",
  trail=[("index.html","Home"),(None,"About")],
  body=f"""
<section style="padding-bottom:30px">
  <div class="wrap"><div class="head center">
    <p class="eyebrow center">The story behind the program</p>
    <h1>It wasn't a<br>straight line</h1>
    <p class="lede mt2">I'm Coach Brayden — founder and owner of Mindset Hockey. I'm not telling you what worked twenty years ago — I'm telling you what worked recently, at the level your player is trying to reach.</p>
  </div></div>
</section>

<section style="padding-top:0">
  <div class="wrap">
    <div class="teamgrid rv">
      <figure class="teamphoto">
        <img src="media/photo-faceoff.jpg" alt="Coach Brayden, owner of Mindset Hockey, in a Team Maryland number 17 jersey lined up for a faceoff" width="1250" height="830">
        <figcaption>Team Maryland · #17</figcaption>
      </figure>
      <div class="teamside">
        <div class="card">
          <h3>Coach Brayden</h3>
          <p class="mt1">16U A player. Two broken ribs. Alternate captain. AAA. Signed Junior A. Every drill and rubric point on this site came out of that climb.</p>
          <p class="mt1">I own and run Mindset Hockey — the vision, the training systems, the coaching standard and the day-to-day operation. I'm also still on the ice with players, and I'm the person who answers your first message.</p>
          <p class="mt1"><a class="btn btn-ghost btn-sm" href="coaches.html" data-cta="about_to_coaches" data-cta-location="about">Meet the coaching staff</a></p>
        </div>
</div>
    </div>
  </div>
</section>

<div class="rinkline" aria-hidden="true"></div>

<section class="band">
  <div class="wrap">
    <div class="head center rv"><p class="eyebrow center">The journey</p><h2>How it actually went</h2></div>
    <div class="tl">
      <div class="tl-item rv"><p class="tl-when">The starting point</p><h3>16U A — overlooked</h3><p>Not the fastest. Not the most skilled. Not on anyone's list. Working hard and going nowhere, because working hard without a system is just being tired.</p></div>
      <div class="tl-item key rv"><p class="tl-when">The setback</p><h3>Broken rib — the first time</h3><p>Months out. Sitting in the stands watching the game move on without me. This is where most players quietly disappear — not because they can't play, but because the time away breaks how they see themselves.</p></div>
      <div class="tl-item rv"><p class="tl-when">The decision</p><h3>Rebuilding the shot from zero</h3><p>If I couldn't skate, I could learn. I studied shot mechanics frame by frame and built a training system I could run in a garage. That framework is now the 7-point rubric.</p></div>
      <div class="tl-item key rv"><p class="tl-when">The second setback</p><h3>Broken rib — again</h3><p>The second one is harder, because the first already cost you a year. That's when I stopped training only my body and started training how I thought.</p></div>
      <div class="tl-item rv"><p class="tl-when">The turn</p><h3>Alternate captain</h3><p>I came back more reliable, not more talented. Coaches started using me in the moments that mattered. Then they gave me a letter.</p></div>
      <div class="tl-item rv"><p class="tl-when">The jump</p><h3>AAA</h3><p>The level I was told I'd never reach. Same body. Different mechanics, different habits, different head.</p></div>
      <div class="tl-item key rv"><p class="tl-when">Then</p><h3>Signed — Junior A</h3><p>Talent helps. Mindset, discipline and consistent work change careers. Everything I did is written down, filmed, and now coached.</p></div>
      <div class="tl-item key rv"><p class="tl-when">Today</p><h3>Founded Mindset Hockey</h3><p>I turned the system into a business, based at {VENUE} in {CITY}, Maryland. As owner I set the program's direction and standards — and I brought on a development coach who's currently playing Junior A and chasing NCAA opportunities, because your player should learn from people still living it.</p></div>
    </div>
    <p class="center mt3"><a class="btn btn-ghost" href="coaches.html" data-cta="timeline_coaches" data-cta-location="about">Meet the Coaching Staff</a></p>
  </div>
</section>

<section>
  <div class="wrap-narrow">
    <div class="head center rv"><p class="eyebrow center">How we work</p><h2>What you can expect</h2></div>
    <div class="cards c2 rv">
      <article class="card"><h3>Honest assessments</h3><p>If your player doesn't need us yet, we'll tell you. If the footage isn't usable, we'll tell you that too — at no charge.</p></article>
      <article class="card"><h3>Named coaching</h3><p>Every video review is done by a named coach who recently played the level your player is chasing. Nothing is outsourced to a queue.</p></article>
      <article class="card"><h3>No outcome promises</h3><p>We never promise placement at any level. We promise better mechanics, a real plan, and a player who handles a bad game better.</p></article>
      <article class="card"><h3>24-hour responses</h3><p>Every inquiry gets a reply within 24 hours. Premium members get breakdowns back inside 72 — usually under 48.</p></article>
    </div>
    <div class="contactstrip mt3 rv">
      <div><h3>Want to talk it through?</h3><p>No pitch. Tell us where your player is and we'll give you a straight answer.</p></div>
      <div class="acts"><a class="btn btn-primary" href="contact.html" data-cta="about_contact" data-cta-location="about">Book a Free Assessment</a><a class="btn btn-ghost" href="tel:{PHONE}">Call Now</a></div>
    </div>
  </div>
</section>

{staffstrip("The staff",
  "I don't coach<br>this alone",
  "I built the program and I run it — but your player also works with Coach Jack, a development coach who is currently playing Junior A and pursuing NCAA opportunities. Two coaches, one system, both still living the game.",
  band=True)}
{FINALE}""")

# ─────────────────────────────── LOCATIONS ───────────────────────────────
PLACE_LD = ("""<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SportsActivityLocation",
"@id":"https://mindsethockey.com/#business","name":"Mindset Hockey",
"description":"Hockey training and player development in Waldorf, Maryland. Skill development, strength and conditioning, nutrition, video analysis and mindset coaching for players 10-18 at The Capital Clubhouse.",
"url":"https://mindsethockey.com/locations.html","telephone":"+1-240-435-6511",
"address":{"@type":"PostalAddress","streetAddress":"3033 Waldorf Market Place","addressLocality":"Waldorf","addressRegion":"MD","postalCode":"20603","addressCountry":"US"},
"geo":{"@type":"GeoCoordinates","latitude":38.6284,"longitude":-76.9310},
"containedInPlace":{"@type":"SportsActivityLocation","name":"The Capital Clubhouse"},
"areaServed":[{"@type":"City","name":"Waldorf"},{"@type":"City","name":"White Plains"},
{"@type":"City","name":"La Plata"},{"@type":"City","name":"Brandywine"},
{"@type":"AdministrativeArea","name":"Charles County"},
{"@type":"AdministrativeArea","name":"Southern Maryland"}],
"openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"06:00","closes":"21:00"}]}
</script>""")

PAGES["locations.html"] = dict(
  title="Hockey Training in Waldorf, Maryland | The Capital Clubhouse | Mindset Hockey",
  desc="Hockey training and player development at The Capital Clubhouse, 3033 Waldorf Market Place, Waldorf, MD. Serving Charles County and Southern Maryland, plus remote video coaching.",
  active="locations.html",
  trail=[("index.html","Home"),(None,"Waldorf, MD Location")],
  extra_ld=PLACE_LD,
  body=f"""
<section style="padding-bottom:30px">
  <div class="wrap"><div class="head center">
    <p class="eyebrow center">Where we train</p>
    <h1>Hockey training in<br>Waldorf, Maryland</h1>
    <p class="lede mt2">All in-person ice and off-ice sessions run out of one home rink — {VENUE} in {CITY}. One location means a consistent schedule, familiar ice and no chasing coaches across the state.</p>
    <p class="mt2"><span class="respond">⏱ We respond to all inquiries within 24 hours</span></p>
  </div></div>
</section>

<section style="padding-top:0">
  <div class="wrap"><div class="split">
    <div class="rv">
      <div class="venue">
        <p class="eyebrow">Our home rink</p>
        <p class="vname">{VENUE}</p>
        <address>{STREET}<br>{CITY}, {REGION} {ZIP}</address>
        <div class="vmeta">
          <div><b>Training</b><span>On-ice skill sessions, off-ice shooting and strength work, and video capture for analysis.</span></div>
          <div><b>Hours</b><span>Monday–Sunday, 6:00am–9:00pm ET (by appointment)</span></div>
          <div><b>Serving</b><span>Waldorf, White Plains, La Plata, Brandywine, Charles County and Southern Maryland</span></div>
          <div><b>Contact</b><span><a href="tel:{PHONE}">{PHONED}</a> · <a href="mailto:{EMAIL}">{EMAIL}</a></span></div>
        </div>
        <p class="mt2">
          <a class="btn btn-primary" href="https://www.google.com/maps/dir/?api=1&amp;destination={MAPQ}" target="_blank" rel="noopener" data-cta="get_directions" data-cta-location="locations">Get Directions</a>
          <a class="btn btn-ghost" href="contact.html?location=waldorf" data-cta="book_waldorf" data-cta-location="locations">Book a Session Here</a>
        </p>
      </div>
    </div>
    <div class="rv">
      <div class="card">
        <h3>Private on-ice sessions — $149</h3>
        <p class="mt1 muted">Shooting development, stickhandling, skating work, hockey IQ and position-specific coaching, with immediate feedback on the ice. Both coaches are on when we're both available, and session sizes stay small so every player gets real reps.</p>
        <p class="mt1 muted">Filmed on two angles, so the same session becomes your next video breakdown. You'll get ice times, entrance and locker room notes by email once you're booked.</p>
        <p class="mt2"><a class="btn btn-primary btn-sm" href="contact.html?plan=on-ice" data-plan="on_ice" data-cta="book_on_ice" data-cta-location="locations">Book a Private Session</a></p>
      </div>
      <div class="card mt2">
        <h3>Both coaches are on site</h3>
        <p class="mt1 muted">Sessions at {VENUE} are run by Coach Brayden, the owner of the program, or by Coach Jack, our development coach — a current Junior A player and NCAA prospect. Never an assistant you've never heard of.</p>
        <p class="mt1 small"><a href="coaches.html">Meet the coaching staff →</a></p>
      </div>
      <div class="card mt2">
        <h3>Free parking, easy access</h3>
        <p class="mt1 muted">Just off Route 301 in the Waldorf Market Place area, with free on-site parking. Most families in Charles County are here in under 25 minutes.</p>
      </div>
    </div>
  </div></div>
</section>

<div class="rinkline" aria-hidden="true"></div>

<section class="band">
  <div class="wrap">
    <div class="head center rv"><p class="eyebrow center">Who we serve</p><h2>Southern Maryland families</h2>
    <p class="lede mt2">{VENUE} sits just off Route 301 in {CITY}, which makes it a straightforward drive for most of Charles County and the surrounding area.</p></div>
    <div class="cards c3">
      <article class="card rv"><h3>Waldorf &amp; White Plains</h3><p class="mt1">Our home base. Weeknight and weekend sessions, with the shortest drive for families in {CITY}, White Plains and St. Charles.</p><p class="mt1 small"><a href="contact.html?location=waldorf" data-cta="area_waldorf" data-cta-location="locations">Book in Waldorf →</a></p></article>
      <article class="card rv"><h3>Charles County</h3><p class="mt1">La Plata, Bryans Road, Indian Head and Hughesville are all a short drive up 301 or 225. Most local families get here in under 25 minutes.</p><p class="mt1 small"><a href="contact.html?location=charles-county" data-cta="area_charles" data-cta-location="locations">Book from Charles County →</a></p></article>
      <article class="card rv"><h3>Southern Maryland</h3><p class="mt1">Brandywine, Clinton, Accokeek and the wider Southern Maryland area, including families crossing from Prince George's County and Calvert County.</p><p class="mt1 small"><a href="contact.html?location=southern-maryland" data-cta="area_somd" data-cta-location="locations">Book from Southern MD →</a></p></article>
    </div>
  </div>
</section>

<section>
  <div class="wrap"><div class="split">
    <div class="rv">
      <p class="eyebrow">Not local?</p>
      <h2 style="font-size:clamp(24px,4vw,38px)">Remote coaching<br>works the same</h2>
      <p class="lede mt2">The core of the program is video analysis and a written weekly plan — neither needs you in the room. Most of what makes a player better happens between sessions anyway.</p>
      <ul class="ticks">
        <li>Film two phone angles at your home rink or driveway</li>
        <li>Breakdown returned inside 72 hours</li>
        <li>Weekly plan updated from the scores</li>
        <li>Monthly check-in call</li>
      </ul>
      <p class="mt2"><a class="btn btn-primary" href="contact.html?location=remote" data-cta="location_remote" data-cta-location="locations">Start Remote Coaching</a></p>
    </div>
    <div class="rv">
      <div class="card">
        <h3>Getting here</h3>
        <p class="mt1 muted">{VENUE} is at {STREET}, {CITY}, {REGION} {ZIP}, just off Route 301 in the Waldorf Market Place area. Parking is free and on-site. Once your sessions are booked you'll get ice times, entrance and locker room notes by email.</p>
        <p class="mt2"><a class="btn btn-ghost btn-sm" href="https://www.google.com/maps/dir/?api=1&amp;destination={MAPQ}" target="_blank" rel="noopener" data-cta="get_directions_secondary" data-cta-location="locations">Open in Google Maps</a></p>
      </div>
      <div class="card mt2">
        <h3>Contact</h3>
        <p class="mt1 small"><a href="tel:{PHONE}">{PHONED}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></p>
        <p class="mt1 small muted">Monday–Sunday, 6am–9pm ET</p>
      </div>
    </div>
  </div></div>
</section>

{staffstrip("Who you'll train with",
  "Two coaches at<br>the Waldorf rink",
  "Every session at The Capital Clubhouse is run by one of these two — both currently playing Junior A. One of us owns the program; both of us coach it.",
  band=True)}
{FINALE}""")

# ─────────────────────────────── CONTACT ─────────────────────────────────
PAGES["contact.html"] = dict(
  title="Contact | Book a Free Hockey Assessment in Waldorf, MD | Mindset Hockey",
  desc="Book a free hockey assessment at The Capital Clubhouse in Waldorf, Maryland, or request a custom quote. Tell us your player's age, level and goals — we reply within 24 hours.",
  active="contact.html",
  trail=[("index.html","Home"),(None,"Contact")],
  body=f"""
<section style="padding-bottom:20px">
  <div class="faceoff" style="width:430px;height:430px;top:-80px;left:-150px" aria-hidden="true"></div>
  <div class="wrap"><div class="head center">
    <p class="eyebrow center">Get started</p>
    <h1>Book a free<br>assessment</h1>
    <p class="lede mt2">Tell us where your player is and what's frustrating you. You'll get an honest read on what to work on first — including if the answer is "not yet."</p>
    <p class="mt2"><span class="respond">⏱ We respond to all inquiries within 24 hours</span></p>
  </div></div>
</section>

<section style="padding-top:0">
  <div class="wrap"><div class="split">
    <div class="rv">
      <form class="form" data-track-form="assessment_request" data-fallback-email="{EMAIL}" novalidate>
        <div class="form-row">
          <div class="field"><label for="parentName">Your name</label><input id="parentName" name="name" required autocomplete="name"><span class="err">Please enter your name.</span></div>
          <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email"><span class="err">Please enter a valid email.</span></div>
        </div>
        <div class="form-row">
          <div class="field"><label for="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
          <div class="field"><label for="playerAge">Player's age</label>
            <select id="playerAge" name="age"><option>10</option><option>11</option><option>12</option><option>13</option><option selected>14</option><option>15</option><option>16</option><option>17</option><option>18</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label for="level">Current level</label>
            <select id="level" name="level"><option>House / Rec</option><option selected>A</option><option>AA</option><option>AAA</option><option>Prep</option><option>Junior</option></select>
          </div>
          <div class="field"><label for="plan">Program of interest</label>
            <select id="plan" name="plan"><option value="not_sure" selected>Not sure yet</option><option value="on_ice">Private on-ice session — $149</option><option value="standard">Standard — $249 setup + $100/mo</option><option value="premium">Premium — $389 setup + $149/mo</option><option value="custom">Custom quote</option></select>
          </div>
        </div>
        <div class="form-row" style="grid-template-columns:1fr">
          <div class="field"><label for="training">Training preference</label>
            <select id="training" name="training"><option value="waldorf" selected>In person — {VENUE}, {CITY} MD</option><option value="remote">Remote / video coaching</option><option value="both">A mix of both</option></select>
          </div>
        </div>
        <div class="field"><label for="goals">What's frustrating you right now?</label>
          <textarea id="goals" name="goals" required placeholder="e.g. He works hard but his shot hasn't improved, and he got cut at tryouts in the spring."></textarea>
          <span class="err">Tell us a little about your player so we can give a useful answer.</span>
        </div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" data-cta="submit_assessment" data-cta-location="contact_form">Send — Get a Reply Within 24 Hours</button>
        <p class="fineprint">No spam, no sales calls. We read every message ourselves.</p>
      </form>
</div>

    <div class="rv">
      <div class="card"><h3>Prefer to talk?</h3>
        <p class="mt1 muted">Most families would rather have a five-minute conversation than fill in a form. That's fine — call or text.</p>
        <p class="mt2"><a class="btn btn-primary btn-block" href="tel:{PHONE}" data-cta="call_from_contact" data-cta-location="contact_page">Call {PHONED}</a></p>
        <p class="mt1"><a class="btn btn-ghost btn-block" href="mailto:{EMAIL}">Email {EMAIL}</a></p>
      </div>
      <div class="card mt2"><h3>What happens next</h3>
        <ol class="mt1" style="padding-left:18px;color:var(--silver-dim);font-size:14.5px">
          <li class="mt1">We reply within 24 hours with a few questions.</li>
          <li class="mt1">Short call to understand the player and the season.</li>
          <li class="mt1">Honest recommendation — including "not yet" if that's the truth.</li>
          <li class="mt1">If it's a fit, we start with the baseline video breakdown.</li>
        </ol>
      </div>
      <div class="card mt2"><h3>Where we train</h3>
        <p class="mt1 muted small"><b style="color:var(--white)">{VENUE}</b><br>{STREET}<br>{CITY}, {REGION} {ZIP}</p>
        <p class="mt1 muted small">Monday–Sunday, 6:00am–9:00pm ET, by appointment.<br>Serving Waldorf, Charles County and Southern Maryland — plus remote coaching nationwide.</p>
        <p class="mt1 small"><a href="locations.html">Location &amp; directions →</a></p>
      </div>
      <div class="card mt2"><h3>Who you'll hear from</h3>
        <p class="mt1 muted small">Every inquiry goes straight to Coach Brayden, the owner of the program — not an assistant or an inbox. He answers it himself within 24 hours.</p>
        <div class="ministaff mt2">
          <figure><img src="media/coach-brayden-headshot.jpg" alt="Coach Brayden, owner and lead coach at Mindset Hockey, in a Team Maryland jersey" width="560" height="560" loading="lazy"><figcaption>Coach Brayden<em>Owner · Junior A player</em></figcaption></figure>
          <figure><img src="media/coach-jack-headshot.jpg" alt="Coach Jack, Mindset Hockey development coach, in a Utica Jr. Comets USPHL jersey" width="620" height="619" loading="lazy"><figcaption>Coach Jack<em>Junior A player</em></figcaption></figure>
        </div>
        <p class="mt2 small muted">Two coaches, both currently playing Junior A. One of us owns the program; both of us coach it.</p>
        <p class="mt1 small"><a href="coaches.html">Meet the coaching staff →</a></p>
      </div>
    </div>
  </div></div>
</section>
""")

# ─────────────────────────────── THANK YOU ───────────────────────────────
PAGES["thank-you.html"] = dict(
  title="Thank You | Mindset Hockey",
  desc="Thanks for reaching out to Mindset Hockey. We respond to all inquiries within 24 hours.",
  active="", noindex=True,
  trail=[("index.html","Home"),(None,"Thank you")],
  body=f"""
<section>
  <div class="faceoff" style="width:520px;height:520px;top:-120px;left:50%;margin-left:-260px" aria-hidden="true"></div>
  <div class="wrap-narrow center">
    <div style="width:74px;height:74px;border-radius:50%;background:rgba(61,220,132,.14);border:1px solid rgba(61,220,132,.4);display:grid;place-items:center;margin:0 auto 26px">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3ddc84" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>
    </div>
    <p class="eyebrow center">Message received</p>
    <h1 style="font-size:clamp(32px,6vw,60px)">Thanks — we've<br>got your message</h1>
    <p class="lede mt2" style="margin-inline:auto">
      A real person reads every inquiry. <span class="hl">We respond to all inquiries within 24 hours</span>,
      usually much sooner. Check your inbox — and your spam folder, just in case.
    </p>
    <p class="mt2"><span class="respond">⏱ Reply on the way within 24 hours</span></p>

    <div class="cards c3 mt3" style="text-align:left">
      <article class="card"><span class="num">01</span><h3>Start filming</h3><p>Side angle at hip height, ten feet away. Front angle at the same distance. Five shots of the same type, good light. That's what makes a real breakdown possible.</p></article>
      <article class="card"><span class="num">02</span><h3>Meet your coaches</h3><p>Two coaches, both currently playing Junior A. One of us owns the program; both of us coach it — and one of us will be working with your player.</p><p class="mt1 small"><a href="coaches.html">Meet the coaching staff →</a></p></article>
      <article class="card"><span class="num">03</span><h3>Compare programs</h3><p>Basic, Premium and Custom side by side, so you know what to ask about on the call.</p><p class="mt1 small"><a href="pricing.html">See pricing →</a></p></article>
    </div>

    <div class="contactstrip mt3">
      <div><h3>Need us sooner?</h3><p>If it's time-sensitive — a tryout or camp coming up — call and say so.</p></div>
      <div class="acts"><a class="btn btn-primary" href="tel:{PHONE}" data-cta="call_from_thanks" data-cta-location="thank_you">Call {PHONED}</a><a class="btn btn-ghost" href="index.html">Back to Home</a></div>
    </div>
  </div>
</section>
""")

# ─────────────────────────────── PRIVACY ─────────────────────────────────
PAGES["privacy.html"] = dict(
  title="Privacy Policy | Mindset Hockey",
  desc="How Mindset Hockey collects, uses and protects your information — with extra care because most of the people we coach are children.",
  active="", trail=[("index.html","Home"),(None,"Privacy Policy")],
  body=f"""
<section>
  <div class="wrap-narrow">
    <p class="eyebrow">Legal</p>
    <h1>Privacy Policy</h1>
    <p class="lede mt2">We collect the minimum needed to run the coaching service, and we're especially careful because most of the people we work with are children.</p>
    <p class="small muted">Last updated: August 2026</p>

    <div class="mt3">
      <h2 style="font-size:22px">What we collect</h2>
      <p class="mt1 muted">Contact details you give us (name, email, phone), player profile details (first name, age, level, position), any video you submit for analysis, and standard technical data such as device type and pages viewed via Google Analytics.</p>

      <h2 class="mt3" style="font-size:22px">Children</h2>
      <p class="mt1 muted">Accounts and inquiries are made by a parent or guardian. We deliberately do not collect a child's full name, home address, phone number, school or precise location. If you believe we hold information about a child that we shouldn't, email <a href="mailto:{EMAIL}">{EMAIL}</a> and we'll delete it.</p>

      <h2 class="mt3" style="font-size:22px">Video you submit</h2>
      <p class="mt1 muted">Submitted video is stored privately and is visible only to you and the reviewing coach. It is never used in marketing without separate written consent from a parent or guardian. You can request deletion of any submission at any time.</p>

      <h2 class="mt3" style="font-size:22px">Analytics and cookies</h2>
      <p class="mt1 muted">We use Google Analytics to understand which pages are useful and where people get stuck. It sets cookies and collects usage data. You can opt out with Google's browser add-on or by blocking cookies in your browser — the site works fine either way.</p>

      <h2 class="mt3" style="font-size:22px">Who we share with</h2>
      <p class="mt1 muted">Only the providers needed to run the service: our website host, email provider, analytics provider and payment processor. We do not sell personal information and we do not share it with advertisers or data brokers.</p>

      <h2 class="mt3" style="font-size:22px">Your rights</h2>
      <p class="mt1 muted">You can request a copy of your data, correct it, or have it deleted. Email us and we'll action it promptly.</p>

      <h2 class="mt3" style="font-size:22px">Email</h2>
      <p class="mt1 muted">We send service email (replies, scheduling, breakdown notifications) to everyone who contacts us, and marketing email only to people who opted in. Every marketing email has a working one-click unsubscribe.</p>

      <h2 class="mt3" style="font-size:22px">Contact</h2>
      <p class="mt1 muted">Questions about this policy: <a href="mailto:{EMAIL}">{EMAIL}</a> or {PHONED}.</p>

</div>
  </div>
</section>
""")

# ──────────────────────────────── 404 ────────────────────────────────────
PAGES["404.html"] = dict(
  title="Page Not Found | Mindset Hockey",
  desc="That page doesn't exist. Head back to Mindset Hockey to find hockey training programs, pricing and shot analysis.",
  active="", noindex=True, trail=None,
  body=f"""
<section>
  <div class="faceoff" style="width:520px;height:520px;top:-100px;left:50%;margin-left:-260px" aria-hidden="true"></div>
  <div class="wrap-narrow center">
    <p class="display" style="font-size:clamp(70px,18vw,150px);color:var(--rink-red);line-height:.9">404</p>
    <p class="eyebrow center mt2">Icing the puck</p>
    <h1 style="font-size:clamp(28px,5vw,48px)">That page went<br>off the boards</h1>
    <p class="lede mt2" style="margin-inline:auto">The link's broken or the page moved. Here's where most people were heading:</p>
    <div class="cards c3 mt3" style="text-align:left">
      <article class="card"><h3>Programs</h3><p class="mt1">Shot analysis, mindset coaching and the full six-pillar system.</p><p class="mt1 small"><a href="programs.html">See programs →</a></p></article>
      <article class="card"><h3>Coaching staff</h3><p class="mt1">Meet Coach Brayden and our Junior A development coach.</p><p class="mt1 small"><a href="coaches.html">Meet the coaches →</a></p></article>
      <article class="card"><h3>Free assessment</h3><p class="mt1">Tell us about your player and get an honest recommendation.</p><p class="mt1 small"><a href="contact.html">Get started →</a></p></article>
    </div>
    <p class="mt3"><a class="btn btn-primary btn-lg" href="index.html" data-cta="404_home" data-cta-location="404">Back to Home</a></p>
  </div>
</section>
""")

def build():
    here = os.path.dirname(os.path.abspath(__file__))
    for fname, cfg in PAGES.items():
        ld = cfg.get("extra_ld", "")
        crumb_html = ""
        if cfg.get("trail"):
            crumb_html = crumbs(cfg["trail"])
        out = head(cfg["title"], cfg["desc"], fname, ld, cfg.get("noindex", False))
        out += nav(cfg.get("active",""))
        out += crumb_html
        out += cfg["body"]
        out += FOOTER
        with open(os.path.join(here, fname), "w", encoding="utf-8") as f:
            f.write(out)
        print(f"  wrote {fname:22s} {len(out)/1024:6.1f} KB")

if __name__ == "__main__":
    print("Building Mindset Hockey pages…")
    build()
    print("Done.")
