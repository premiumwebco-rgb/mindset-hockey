# Publishing Mindset Hockey

Pre-flight passed: 10 pages, 507 links verified, no broken links or missing assets, 14 MB total.

---

## 1. Get it live (5 minutes, free, no card)

**Netlify Drop — fastest path**

1. Go to **app.netlify.com/drop**
2. Drag the whole **`site`** folder onto the page
3. It deploys instantly and gives you a URL like `dazzling-otter-8f2a.netlify.app`

That URL is real and shareable immediately. Create a free account when prompted so the site stays yours — otherwise it expires.

**Vercel** works the same way at vercel.com/new if you prefer it.

---

## 2. Your own domain (~$12/year)

Buy `mindsethockey.com` (or whatever's free) at Namecheap, Cloudflare or Porkbun. In Netlify: **Domain settings → Add custom domain**, then follow the DNS instructions. HTTPS is automatic and free.

Once the domain is live, update the site to match:

```bash
cd site
grep -rl 'mindsethockey.com' . | xargs sed -i 's|https://mindsethockey.com|https://YOURDOMAIN.com|g'
```

That fixes canonical tags, Open Graph URLs, `sitemap.xml` and `robots.txt`.

---

## 3. Make the contact form actually deliver — do this first

Right now the form validates, fires the analytics event, and opens the visitor's email app with their answers pre-filled, then sends them to the thank-you page. **Leads won't vanish, but it's a clunky experience and some people will drop off.**

Proper fix, about 5 minutes:

1. Sign up free at **formspree.io** (50 submissions/month free)
2. Create a form, copy your endpoint (looks like `https://formspree.io/f/xyzabcd`)
3. In `contact.html`, find the `<form class="form"` tag and add the action:

```html
<form class="form" action="https://formspree.io/f/xyzabcd" method="POST" data-track-form="assessment_request" novalidate>
```

The email fallback switches itself off automatically once `action` is present.

**If you deploy on Netlify**, it's even simpler — add `netlify` and `name` to the form tag and Netlify captures submissions with no third party:

```html
<form class="form" name="assessment" method="POST" data-netlify="true" data-track-form="assessment_request" novalidate>
```

Then set the form to email you under **Forms → Notifications** in the Netlify dashboard.

---

## 4. Google Analytics (10 minutes)

1. **analytics.google.com** → create a property → copy the Measurement ID (`G-XXXXXXXX`)
2. Replace it everywhere:

```bash
cd site
grep -rl 'G-XXXXXXXXXX' . | xargs sed -i 's/G-XXXXXXXXXX/G-YOURREALID/g'
```

3. Redeploy
4. In GA4 → **Admin → Events**, mark `generate_lead` and `phone_click` as **key events**

Then you'll see exactly which pages produce enquiries.

---

## 5. Google Business Profile — biggest local SEO win

**google.com/business** → add Mindset Hockey. Use exactly the same details as the site:

- **Name:** Mindset Hockey
- **Address:** 3033 Waldorf Market Place, Waldorf, MD 20603
- **Phone:** (240) 435-6511
- **Category:** Sports Coach / Sports Club
- **Website:** your new domain

Exact-match consistency across your site and your profile matters more for ranking in "hockey training near me" than anything on the page. Google mails a postcard to verify.

**Check the map pin.** The site uses coordinates 38.6284, -76.9310 derived from the street address. Open the homepage map and confirm the pin sits on the building — if it's off, fix `geo` in `index.html` and `build-pages.py`.

---

## 6. Submit to Google

**search.google.com/search-console** → add your domain → submit `https://YOURDOMAIN.com/sitemap.xml`. Indexing takes a few days to a couple of weeks.

---

## Launch-day checklist

- [ ] Site deployed, URL works
- [ ] Form endpoint connected — **submit a test enquiry and confirm it reaches your inbox**
- [ ] GA Measurement ID replaced
- [ ] Domain connected, URLs updated across the site
- [ ] Map pin verified on the rink
- [ ] Google Business Profile submitted
- [ ] Sitemap submitted to Search Console
- [ ] Opened the site on your phone and tapped the sticky call button

---

## First month

The single highest-value addition is **real reviews**. The section was removed rather than filled with fabricated quotes. After your first few players, ask for a sentence naming a specific change — a mechanic that got fixed, a habit that stuck, how their kid handled a bad game. Get written consent, then add a `.tcard` grid back to the homepage between Case Studies and Pricing.

Second highest: a **before/after case study**. Baseline breakdown on day 1, re-film the same five shots at day 30, publish both scores. That will out-convert every other thing on this site.
