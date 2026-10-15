/* Journey with the Best — orchestration
   - Picks landscape/portrait video source based on viewport (set synchronously)
   - Hero loads eagerly; other scenes lazy-load as they approach
   - Reveals + play/pause via IntersectionObserver
   - Scroll progress bar, nav shade, parallax, section reveals
   - Honors prefers-reduced-motion
*/
(() => {
  'use strict';

  const html = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMQ = window.matchMedia('(max-width: 820px)');

  const isMobile = () => mobileMQ.matches;

  // ------------------------------------------------------------
  //  VIDEO SOURCE WIRING
  // ------------------------------------------------------------

  const pickSrc = (video) => {
    const m = isMobile() && video.dataset.srcMobile;
    return m ? video.dataset.srcMobile : video.dataset.src;
  };

  const assignSrc = (video, { eager = false } = {}) => {
    const target = pickSrc(video);
    if (!target) return;
    if (video.getAttribute('src') === target) return;
    video.setAttribute('src', target);
    video.classList.toggle('is-portrait', isMobile() && !!video.dataset.srcMobile);
    try { video.load(); } catch (_) {}
    // Try autoplay (muted inline is allowed; some mobile browsers still reject — ignore).
    if (eager) {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    }
  };

  // <source media="..."> inside each <video> handles initial source selection at parse
  // time — no need to force a src here. We only re-assign on breakpoint change.
  // Mark portrait-mode videos so CSS centers them without the 16:9 focal offsets.
  document.querySelectorAll('video[data-video]').forEach((v) => {
    if (isMobile() && v.dataset.srcMobile) v.classList.add('is-portrait');
  });
  // Nudge the hero to play (muted autoplay is permitted; some browsers still want this).
  document.querySelectorAll('video[data-video][data-eager]').forEach((v) => {
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  });

  // Make every video visible as soon as it has a frame; keep a safety timeout so slow
  // environments (file://, cold caches) never leave a scene black.
  const markReady = (scene) => scene.classList.add('is-ready');
  document.querySelectorAll('.scene').forEach((scene) => {
    const v = scene.querySelector('video');
    if (!v) { markReady(scene); return; }
    const ready = () => markReady(scene);
    if (v.readyState >= 2) ready();
    v.addEventListener('loadeddata', ready, { once: true });
    v.addEventListener('canplay', ready, { once: true });
    v.addEventListener('error', () => scene.classList.add('is-ready', 'is-fallback'), { once: true });
    // Hard fallback — never leave the hero black.
    setTimeout(ready, 2500);
  });

  // ------------------------------------------------------------
  //  SCENE ACTIVATION + LAZY LOADING
  // ------------------------------------------------------------

  const scenes = document.querySelectorAll('.scene');

  // Pre-load the next scene when it comes within 600px of the viewport.
  // <source> tags are already present — just bump preload up so the browser fetches eagerly.
  const preloadObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const video = entry.target.querySelector('video[data-video]:not([data-eager])');
      if (video && video.preload !== 'auto') {
        video.setAttribute('preload', 'auto');
        try { video.load(); } catch (_) {}
      }
      preloadObs.unobserve(entry.target);
    });
  }, { rootMargin: '600px 0px 600px 0px' });

  // Add .is-active when a scene occupies the viewport — drives reveals + playback.
  const activeObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const scene = entry.target;
      const video = scene.querySelector('video');
      if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
        scene.classList.add('is-active');
        if (video && video.paused) {
          const p = video.play(); if (p && p.catch) p.catch(() => {});
        }
      } else if (entry.intersectionRatio < 0.08) {
        scene.classList.remove('is-active');
        if (video && !scene.classList.contains('scene--hero')) {
          try { video.pause(); } catch (_) {}
        }
      }
    });
  }, { threshold: [0, 0.08, 0.35, 0.6, 1] });

  scenes.forEach((s) => { preloadObs.observe(s); activeObs.observe(s); });

  // The hero is on-screen at load — activate it right away so reveals fire.
  const hero = document.querySelector('.scene--hero');
  if (hero) {
    requestAnimationFrame(() => hero.classList.add('is-active'));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const v = hero.querySelector('video');
        if (v && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      }
    });
  }

  // Apply reveal delays
  document.querySelectorAll('.reveal[data-delay]').forEach((el) => {
    const d = parseInt(el.dataset.delay, 10) || 0;
    el.style.transitionDelay = d + 'ms';
  });

  // ------------------------------------------------------------
  //  SECTION REVEAL OBSERVER (non-scene sections)
  // ------------------------------------------------------------

  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        sectionObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -80px 0px' });

  document.querySelectorAll('.about, .value, .dest, .services, .steps, .team, .reviews, .faq, .plan, .ready, .plan-hero, .contact-row, .mvv, .approach, .regions, .promise').forEach((s) => {
    s.classList.add('section-reveal');
    sectionObs.observe(s);
  });

  // ------------------------------------------------------------
  //  BREAKPOINT SWAP (landscape <-> portrait source)
  // ------------------------------------------------------------

  let lastMobile = isMobile();
  const onBreakpoint = () => {
    if (isMobile() === lastMobile) return;
    lastMobile = isMobile();
    html.dataset.vp = lastMobile ? 'mobile' : 'desktop';
    // Force each video to re-evaluate its <source media> tags
    document.querySelectorAll('video[data-video]').forEach((v) => {
      const wasPlaying = !v.paused;
      v.classList.toggle('is-portrait', lastMobile);
      // Clearing src attribute (if any) returns control to <source> tags
      v.removeAttribute('src');
      try { v.load(); } catch (_) {}
      if (wasPlaying) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    });
  };
  if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', onBreakpoint);
  else mobileMQ.addListener(onBreakpoint);

  // ------------------------------------------------------------
  //  SCROLL PROGRESS + NAV SHADE + SUBTLE PARALLAX
  // ------------------------------------------------------------

  const progress = document.querySelector('.scroll-progress span');
  const nav = document.querySelector('.nav');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (progress && h > 0) progress.style.transform = `scaleX(${Math.min(1, y / h)})`;
      if (nav) nav.classList.toggle('is-scrolled', y > 40);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ------------------------------------------------------------
  //  STICKY MOBILE CTA
  // ------------------------------------------------------------

  const stickyCta = document.querySelector('.sticky-cta');
  const waFab = document.querySelector('.wa-fab');
  const planSec = document.getElementById('plan');
  if (hero && (stickyCta || waFab)) {
    const heroObs = new IntersectionObserver(([e]) => {
      const past = !e.isIntersecting;
      if (stickyCta) stickyCta.classList.toggle('is-visible', past);
      if (waFab)     waFab.classList.toggle('is-visible', past);
    }, { threshold: 0.4 });
    heroObs.observe(hero);
  }
  if (stickyCta && planSec) {
    const planObs = new IntersectionObserver(([e]) => {
      stickyCta.classList.toggle('is-hidden-at-form', e.isIntersecting);
    }, { threshold: 0.15 });
    planObs.observe(planSec);
  }

  // ------------------------------------------------------------
  //  ENQUIRY FORM
  // ------------------------------------------------------------

  const form = document.getElementById('enquiry-form');
  if (form) {
    const success = form.querySelector('.plan__success');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('[name="name"]');
      const email = form.querySelector('[name="email"]');
      let ok = true;
      [name, email].forEach((f) => {
        const bad = !f.value.trim() || (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value));
        f.style.borderBottomColor = bad ? '#e07a5f' : '';
        if (bad) ok = false;
      });
      if (!ok) { name.focus(); return; }
      form.querySelectorAll('input, textarea, select, button').forEach((el) => el.setAttribute('disabled', ''));
      if (success) { success.hidden = false; success.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }); }
    });
  }

  // ------------------------------------------------------------
  //  SMOOTH IN-PAGE LINKS + YEAR
  // ------------------------------------------------------------

  const yEl = document.getElementById('y');
  if (yEl) yEl.textContent = new Date().getFullYear();

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();
