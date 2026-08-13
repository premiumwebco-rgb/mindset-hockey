/* ==========================================================================
   MINDSET HOCKEY — shared behaviour
   Nav, sticky CTA, reveal, video facades, form validation,
   and Google Analytics 4 conversion event tracking.

   STRUCTURE — this matters when the site runs inside Next.js.
   Behaviour is split in two:

     GLOBAL (bound once)  — things attached to document/window or to DOM that
                            persists across navigation: analytics, scroll
                            handlers, the nav burger, click delegation.

     PER PAGE (mhInitPage) — things attached to elements inside the page body:
                            the .rv reveal observer, forms and video facades.
                            These elements are replaced on every client-side
                            navigation, so this function must run again each
                            time. On the plain static site it simply runs once.

   Everything is idempotent — re-running mhInitPage() never double-binds.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- GA4 event helper ------------------------------------------
     Fires to gtag if present, always pushes to dataLayer so GTM works too.
     Safe no-op when analytics isn't loaded (e.g. local file preview).      */
  function track(name, params) {
    params = params || {};
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params));
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
    } catch (e) { /* analytics must never break the page */ }
  }
  window.mhTrack = track;

  /* ======================================================================
     PER-PAGE BINDINGS
     ====================================================================== */

  /* ---------- reveal on scroll ------------------------------------------
     Elements start at opacity:0 (see .rv in site.css) and are revealed when
     they scroll into view. If this never runs, the page body is invisible —
     so there are two safety nets below.                                    */
  var revealObserver = null;

  function initReveal() {
    var candidates = document.querySelectorAll('.rv:not([data-rv-bound])');
    if (!candidates.length) return;

    if ('IntersectionObserver' in window) {
      if (!revealObserver) {
        revealObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add('in');
              revealObserver.unobserve(en.target);
            }
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      }
      candidates.forEach(function (el) {
        el.setAttribute('data-rv-bound', '1');
        revealObserver.observe(el);
      });
    } else {
      // No observer support: show everything rather than hide it.
      candidates.forEach(function (el) {
        el.setAttribute('data-rv-bound', '1');
        el.classList.add('in');
      });
    }

    // Safety net: anything already on screen when this runs gets revealed
    // immediately, and anything the observer somehow missed is revealed
    // shortly after. Content must never be left invisible.
    sweepVisible();
    setTimeout(sweepVisible, 400);
    setTimeout(sweepVisible, 1200);
  }

  function sweepVisible() {
    document.querySelectorAll('.rv:not(.in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
    });
  }

  /* ---------- form validation + submit tracking ------------------------- */
  function initForms() {
    document.querySelectorAll('form[data-track-form]:not([data-mh-bound])').forEach(function (form) {
      form.setAttribute('data-mh-bound', '1');

      form.addEventListener('submit', function (e) {
        var ok = true;
        form.querySelectorAll('[required]').forEach(function (input) {
          var wrap = input.closest('.field');
          var val = (input.value || '').trim();
          var bad = !val || (input.type === 'email' && val.indexOf('@') < 1);
          if (wrap) wrap.classList.toggle('invalid', bad);
          if (bad && ok) { input.focus(); ok = false; }
        });

        if (!ok) { e.preventDefault(); return; }

        // honeypot: silently swallow bot submissions
        var trap = form.querySelector('[name="company"]');
        if (trap && trap.value) { e.preventDefault(); return; }

        track('generate_lead', {
          form_name: form.getAttribute('data-track-form'),
          plan_interest: (form.querySelector('[name="plan"]') || {}).value || 'not_specified',
          page_path: location.pathname
        });
        track('form_submit', { form_name: form.getAttribute('data-track-form') });

        // ── Delivery ────────────────────────────────────────────────────────
        // Submissions POST to the host's form handler (Netlify Forms picks up
        // any POST carrying `form-name`). If that fails — e.g. the site isn't
        // on Netlify yet — we fall back to opening the visitor's email client
        // with their answers pre-filled, so an enquiry is never lost silently.
        var custom = form.getAttribute('action');
        var isNetlify = form.hasAttribute('data-netlify');
        if (!custom || isNetlify) {
          e.preventDefault();

          // Works both as a static site (thank-you.html) and inside Next.js
          // (/thank-you), where extensionless routes are used.
          var thanksBase = document.body.getAttribute('data-thanks-url') || 'thank-you.html';
          var thanks = thanksBase + '?from=' +
            encodeURIComponent(form.getAttribute('data-track-form'));

          var mailFallback = function () {
            var to = form.getAttribute('data-fallback-email');
            if (to) {
              var lines = [];
              form.querySelectorAll('input, select, textarea').forEach(function (el) {
                if (!el.name || !el.value || el.name === 'company' || el.name === 'form-name') return;
                var lab = form.querySelector('label[for="' + el.id + '"]');
                lines.push((lab ? lab.textContent.trim() : el.name) + ': ' + el.value);
              });
              window.open('mailto:' + to +
                '?subject=' + encodeURIComponent('Free assessment request — Mindset Hockey') +
                '&body=' + encodeURIComponent(lines.join('\n') + '\n\n— Sent from the website'),
                '_blank');
            }
            window.location.href = thanks;
          };

          if (window.fetch && isNetlify) {
            var body = new URLSearchParams(new FormData(form)).toString();
            fetch('/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: body
            }).then(function (r) {
              if (r.ok) window.location.href = thanks;
              else mailFallback();
            }).catch(mailFallback);
          } else {
            mailFallback();
          }
        }
      });

      // clear the error state as the user fixes it
      form.querySelectorAll('[required]').forEach(function (input) {
        input.addEventListener('input', function () {
          var wrap = input.closest('.field');
          if (wrap) wrap.classList.remove('invalid');
        });
      });
    });
  }

  /* ---------- video facades --------------------------------------------- */
  function initFacades() {
    document.querySelectorAll('[data-lf-video]:not([data-mh-bound])').forEach(function (f) {
      f.setAttribute('data-mh-bound', '1');

      function play() {
        var src = f.getAttribute('data-video-src');
        track('video_play', { video_title: f.getAttribute('data-video-title') || 'untitled' });

        if (src) {
          var v = document.createElement('video');
          v.setAttribute('src', src);
          v.setAttribute('controls', '');
          v.setAttribute('autoplay', '');
          v.setAttribute('playsinline', '');
          v.setAttribute('preload', 'metadata');
          v.style.cssText = 'width:100%;display:block;background:#05070C';
          if (f.replaceChildren) { f.replaceChildren(v); }
          else { f.innerHTML = ''; f.appendChild(v); }
          return;
        }
        var id = f.getAttribute('data-video-id');
        if (!id || id.indexOf('_ID') > -1) return; /* placeholder — stay a thumbnail */
        var fr = document.createElement('iframe');
        fr.setAttribute('src', 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0');
        fr.setAttribute('title', f.getAttribute('data-video-title') || 'Video');
        fr.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; picture-in-picture');
        fr.setAttribute('allowfullscreen', '');
        fr.style.cssText = 'width:100%;aspect-ratio:16/9;border:0;display:block';
        if (f.replaceChildren) { f.replaceChildren(fr); }
        else { f.innerHTML = ''; f.appendChild(fr); }
      }

      f.addEventListener('click', play);
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
      });
    });
  }

  /**
   * Re-binds everything that lives inside the page body.
   * Exposed so the Next.js marketing layout can call it after each client-side
   * navigation, when the previous page's DOM has been replaced.
   */
  function initPage() {
    initReveal();
    initForms();
    initFacades();
  }
  window.mhInitPage = initPage;

  /* ======================================================================
     GLOBAL BINDINGS — bound once for the lifetime of the document
     ====================================================================== */

  /* ---------- nav + sticky CTA ------------------------------------------ */
  function onScroll() {
    var nav = document.getElementById('nav');
    var sticky = document.getElementById('stickyCta');
    var y = window.scrollY;
    if (nav) nav.classList.toggle('stuck', y > 12);
    if (sticky) sticky.classList.toggle('show', y > 520);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Delegated so it survives the nav being re-rendered by a framework.
  document.addEventListener('click', function (e) {
    var burger = e.target && e.target.closest && e.target.closest('#burger');
    if (burger) {
      var menu = document.getElementById('mobileMenu');
      if (menu) {
        var open = menu.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      return;
    }
    var inMenu = e.target && e.target.closest && e.target.closest('#mobileMenu a');
    if (inMenu) {
      var m = document.getElementById('mobileMenu');
      var b = document.getElementById('burger');
      if (m) m.classList.remove('open');
      if (b) b.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- conversion event tracking --------------------------------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    var a = t.closest('a, button');
    if (!a) return;

    // phone clicks
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) {
      track('phone_click', { phone_number: href.replace('tel:', ''), link_text: a.textContent.trim() });
      return;
    }
    if (href.indexOf('mailto:') === 0) {
      track('email_click', { link_text: a.textContent.trim() });
      return;
    }

    // CTA + program inquiry clicks (opt-in via data attributes)
    var cta = a.getAttribute('data-cta');
    if (cta) {
      track('cta_click', {
        cta_name: cta,
        cta_location: a.getAttribute('data-cta-location') || 'unknown',
        page_path: location.pathname
      });
    }
    var plan = a.getAttribute('data-plan');
    if (plan) {
      track('program_inquiry', { plan_name: plan, page_path: location.pathname });
    }
  });

  /* ---------- scroll-depth (helps tune the page later) ------------------ */
  var hit = {};
  window.addEventListener('scroll', function () {
    var d = document.documentElement;
    var pct = Math.round(((window.scrollY + window.innerHeight) / d.scrollHeight) * 100);
    [25, 50, 75, 90].forEach(function (m) {
      if (pct >= m && !hit[m]) { hit[m] = true; track('scroll_depth', { percent: m }); }
    });
  }, { passive: true });

  /* ---------- first run -------------------------------------------------- */
  initPage();
  window.addEventListener('load', function () {
    initPage();
    setTimeout(sweepVisible, 1200);
  });
})();
