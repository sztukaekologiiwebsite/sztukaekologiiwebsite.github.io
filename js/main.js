/* ==========================================================================
   Sztuka Ekologii — interactions & motion
   Requires (optional): GSAP + ScrollTrigger, Lenis. Degrades gracefully.
   ========================================================================== */
(() => {
  const html = document.documentElement;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) html.classList.remove('motion', 'pl', 'pt');
  const motion = hasGsap && html.classList.contains('motion');
  window.__seReady = true;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const PL = document.documentElement.lang === 'pl';

  /* ---------- Placeholder photos: add label + soft shapes ---------- */
  const camIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  $$('.ph').forEach((ph, i) => {
    if (ph.querySelector('img, video')) return;
    const inner = document.createElement('div');
    inner.className = 'ph-inner';
    const seed = (i * 37) % 100;
    inner.innerHTML =
      `<span class="ph-shape" style="width:46%;aspect-ratio:1;left:${10 + (seed % 40)}%;top:${15 + (seed % 30)}%;background:rgba(255,255,255,.18)"></span>` +
      `<span class="ph-shape" style="width:28%;aspect-ratio:1;right:${8 + (seed % 25)}%;bottom:${10 + (seed % 35)}%;background:rgba(255,255,255,.12)"></span>`;
    ph.prepend(inner);
    if (ph.dataset.label) {
      const lab = document.createElement('span');
      lab.className = 'ph-label';
      lab.innerHTML = camIcon + '<span>' + ph.dataset.label + '</span>';
      ph.appendChild(lab);
    }
    if (!ph.hasAttribute('role')) { ph.setAttribute('role', 'img'); ph.setAttribute('aria-label', (PL ? 'Miejsce na zdjęcie: ' : 'Photo placeholder: ') + (ph.dataset.label || (PL ? 'zdjęcie' : 'image'))); }
  });

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Header: scrolled / hide on scroll down ---------- */
  const header = $('.site-header');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      const menuOpen = document.body.classList.contains('menu-open');
      header.classList.toggle('is-hidden', !menuOpen && y > 300 && y > lastY + 2);
      if (y < lastY - 2) header.classList.remove('is-hidden');
    }
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Copy-to-clipboard buttons ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const iconOnly = !!btn.querySelector('svg');
    const label = iconOnly ? btn.getAttribute('aria-label') : btn.textContent;
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch (_) { location.href = 'mailto:' + btn.dataset.copy; return; }
    const done = btn.dataset.copied || 'Copied!';
    if (iconOnly) { btn.setAttribute('aria-label', done); btn.title = done; } else btn.textContent = done;
    btn.classList.add('is-copied');
    setTimeout(() => {
      if (iconOnly) { btn.setAttribute('aria-label', label); btn.title = label; } else btn.textContent = label;
      btn.classList.remove('is-copied');
    }, 1800);
  }));

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const mobileMenu = $('.mobile-menu');
  let lenis = null;
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.label').textContent = open ? (PL ? 'Zamknij' : 'Close') : 'Menu';
    mobileMenu.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) setTimeout(() => mobileMenu.querySelector('a')?.focus(), 350);
  };
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); toggle.focus(); } });
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq-q').forEach(q => q.addEventListener('click', () => q.setAttribute('aria-expanded', String(q.getAttribute('aria-expanded') !== 'true'))));

  /* ---------- Gallery filter ---------- */
  const filterBtns = $$('.filter-btn');
  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filterBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    $$('.gallery-item').forEach(item => {
      const show = f === 'all' || (item.dataset.cat || '').split(' ').includes(f);
      item.classList.toggle('is-hidden', !show);
    });
    if (motion) {
      const visible = $$('.gallery-item:not(.is-hidden)');
      gsap.fromTo(visible, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' });
      ScrollTrigger.refresh();
    }
  }));

  /* ---------- Lightbox ---------- */
  const lb = $('.lightbox');
  if (lb) {
    const stage = $('.lb-stage', lb), cap = $('.lb-cap', lb);
    let idx = 0, lastFocus = null;
    const items = () => $$('.gallery-item:not(.is-hidden)');
    const show = i => {
      const list = items(); if (!list.length) return;
      idx = (i + list.length) % list.length;
      const src = list[idx].querySelector('.ph');
      const clone = src.cloneNode(true);
      clone.className = src.className.replace(/\br-\w+/g, '');
      clone.style.transform = '';
      clone.querySelectorAll('img[data-full]').forEach(img => { img.src = img.dataset.full; img.loading = 'eager'; });
      stage.querySelector('.ph')?.remove();
      stage.prepend(clone);
      cap.textContent = list[idx].dataset.caption || '';
      if (motion) gsap.fromTo(clone, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
    };
    const open = i => { lastFocus = document.activeElement; lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); show(i); lenis?.stop(); $('.lb-close', lb).focus(); };
    const close = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); lenis?.start(); lastFocus?.focus(); };
    $$('.gallery-item').forEach(item => item.addEventListener('click', () => open(items().indexOf(item))));
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'Tab') {
        const f = $$('button', lb); const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Hero canvas (organic blobs + floating seeds) ---------- */
  const canvas = $('.hero-canvas');
  if (canvas) heroCanvas(canvas, motion);

  /* ---------- Marquee groups: duplicate content so it loops ---------- */
  $$('.marquee-track').forEach(track => {
    const group = track.querySelector('.marquee-group');
    if (!group) return;
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  if (!motion) {
    // Static fallbacks
    $$('[data-count]').forEach(el => (el.textContent = el.dataset.count + (el.dataset.suffix || '')));
    return;
  }

  /* ======================================================================
     MOTION (GSAP)
     ====================================================================== */
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out' });

  /* ---------- Smooth scroll ---------- */
  if (window.Lenis) {
    // Snappier smooth scroll: higher lerp = catches up faster; slight wheel boost; native touch scrolling
    lenis = new Lenis({ lerp: 0.18, wheelMultiplier: 1.15, touchMultiplier: 1.4, smoothWheel: true, syncTouch: false });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -20 }); }
    }));
  }

  /* ---------- Split helpers ---------- */
  const splitWords = el => {
    const frag = document.createDocumentFragment();
    const push = (text, cls) => text.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      const s = document.createElement('span');
      s.className = 'w' + (cls ? ' ' + cls : '');
      s.textContent = part;
      frag.appendChild(s);
    });
    Array.from(el.childNodes).forEach(n => {
      if (n.nodeType === 3) push(n.textContent);
      else if (n.nodeType === 1) push(n.textContent, n.className);
    });
    el.innerHTML = '';
    el.appendChild(frag);
    el.classList.add('is-split');
    return $$('.w', el);
  };

  /* ---------- Magnetic elements ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * strength);
        yTo((e.clientY - r.top - r.height / 2) * strength);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Page transitions ---------- */
  const tr = $('.transition');
  const panels = tr ? $$('.panel', tr) : [];
  const trLogo = tr ? $('img', tr) : null;

  const isInternal = a => {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;
    return true;
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!isInternal(a) || !panels.length) return;
    e.preventDefault();
    const go = () => { try { sessionStorage.setItem('se-nav', '1'); } catch (_) {} location.href = a.href; };
    lenis?.stop();
    gsap.timeline({ onComplete: go })
      .fromTo(panels, { yPercent: 100 }, { yPercent: 0, duration: 0.75, stagger: 0.09, ease: 'power4.inOut' })
      .fromTo(trLogo, { opacity: 0, scale: 0.6, rotate: -90 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.45 }, '-=0.25');
  });

  const revealPage = () => {
    // Played on arrival via internal navigation
    if (!html.classList.contains('pt') || !panels.length) return Promise.resolve();
    gsap.set(panels, { yPercent: 0 });
    gsap.set(trLogo, { opacity: 1 });
    html.classList.remove('pt');
    return new Promise(res => {
      gsap.timeline({ onComplete: res })
        .to(trLogo, { opacity: 0, scale: 0.7, rotate: 90, duration: 0.35, ease: 'power2.in' })
        .to(panels.slice().reverse(), { yPercent: -100, duration: 0.85, stagger: 0.08, ease: 'power4.inOut' }, '-=0.05')
        .set(panels, { yPercent: 100 });
    });
  };

  // Reset transition when restored from back/forward cache
  window.addEventListener('pageshow', e => {
    if (e.persisted && panels.length) { gsap.set(panels, { yPercent: 100 }); gsap.set(trLogo, { opacity: 0 }); lenis?.start(); }
  });

  /* ---------- Preloader (first visit in this session) ---------- */
  const runPreloader = () => {
    const pl = $('.preloader');
    if (!html.classList.contains('pl') || !pl) return Promise.resolve();
    pl.classList.add('is-active');
    lenis?.stop();
    const count = $('.pl-count', pl), bar = $('.pl-bar span', pl), logo = $('img', pl);
    const obj = { v: 0 };
    return new Promise(res => {
      gsap.timeline({
        onComplete: () => {
          html.classList.remove('pl'); pl.remove(); lenis?.start();
          try { sessionStorage.setItem('se-seen', '1'); } catch (_) {}
          res();
        }
      })
        .from(logo, { scale: 0.4, opacity: 0, rotate: -180, duration: 1, ease: 'back.out(1.6)' })
        .to(obj, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(obj.v)).padStart(3, '0'); } }, 0.1)
        .to(bar, { scaleX: 1, duration: 1.4, ease: 'power2.inOut' }, 0.1)
        .to(logo, { rotate: 360, duration: 1.4, ease: 'power2.inOut' }, 0.4)
        .to([count, bar.parentNode], { opacity: 0, y: -10, duration: 0.3 })
        .to(logo, { scale: 14, opacity: 0, duration: 0.9, ease: 'power3.in' }, '-=0.1')
        .to(pl, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power4.inOut' }, '-=0.5');
    });
  };

  /* ---------- Intro animations (above the fold) ---------- */
  const intro = () => {
    const tl = gsap.timeline();
    const lines = $$('.split-lines .line > span');
    if (lines.length) tl.to(lines, { y: 0, duration: 1.3, stagger: 0.1, ease: 'power4.out' }, 0);
    const introEls = $$('[data-intro]');
    if (introEls.length) tl.fromTo(introEls, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, 0.45);
    const mark = $('.hero-mark');
    if (mark) tl.fromTo(mark, { opacity: 0, rotate: -60, scale: 0.8 }, { opacity: 0.09, rotate: 0, scale: 1, duration: 2, ease: 'power3.out' }, 0);
    return tl;
  };

  /* one broken effect must never stop the rest */
  const safe = fn => { try { return fn(); } catch (e) { console.warn('[anim]', e); } };

  /* ---------- Scroll-driven animations ---------- */
  const scrollAnims = () => {
    // Parallax first: creating it after self-killing "once" triggers trips ScrollTrigger's refresh
    $$('[data-parallax]').forEach(el => {
      const amt = parseFloat(el.dataset.parallax) || 0.15;
      safe(() => gsap.fromTo(el, { yPercent: -amt * 50 }, { yPercent: amt * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    });

    const reveal = els => { els = els.filter(e => !e.__shown); if (!els.length) return; els.forEach(e => (e.__shown = true));
      gsap.to(els, { opacity: 1, y: 0, scale: 1, duration: 1.1, stagger: 0.1, ease: 'power3.out', overwrite: true }); };
    // Generic reveals
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      // no `once`: self-killing triggers corrupt ScrollTrigger's list while others are still being created
      onEnter: els => reveal(els),
      onLeave: els => reveal(els),        // jumped past it (anchor link, fast flick): still show it
      onEnterBack: els => reveal(els)
    });

    // Split line headings further down the page
    $$('.split-scroll').forEach(h => {
      gsap.to($$('.line > span', h), { y: 0, duration: 1.2, stagger: 0.08, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 85%', toggleActions: 'play play play none' } });
    });

    // Clip-path image reveals
    $$('[data-clip]').forEach(el => {
      const ph = el.querySelector('.ph') || el;
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play play play none' } });
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.4, ease: 'power4.inOut' });
      if (ph !== el) tl.from(ph, { scale: 1.35, duration: 1.8, ease: 'power3.out' }, 0);
    });

    // Word-by-word light up
    $$('.reveal-text').forEach(el => {
      const words = splitWords(el);
      gsap.to(words, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: 0.3 } });
    });

    // Counters
    $$('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
      const o = { v: 0 };
      el.textContent = '0' + suf;
      gsap.to(o, { v: end, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play play play none' }, onUpdate: () => (el.textContent = Math.round(o.v) + suf) });
    });

    // Marquee with scroll-velocity boost
    $$('.marquee-track').forEach(track => {
      const dir = track.dataset.dir === 'right' ? 1 : -1;
      const tween = gsap.fromTo(track, { xPercent: dir === -1 ? 0 : -50 }, { xPercent: dir === -1 ? -50 : 0, duration: parseFloat(track.dataset.speed) || 30, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        trigger: track, start: 'top bottom', end: 'bottom top',
        onUpdate: self => {
          const v = Math.min(Math.abs(self.getVelocity()) / 250, 6);
          gsap.to(tween, { timeScale: 1 + v, duration: 0.2, overwrite: true });
          gsap.to(tween, { timeScale: 1, duration: 1.2, delay: 0.2, overwrite: false });
        }
      });
    });

    // Hero: content drifts up & fades, mark spins
    const hero = $('.hero');
    if (hero) {
      gsap.to('.hero-inner', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-mark', { rotate: 120, yPercent: 30, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    // Page hero blobs
    $$('.page-hero .bg-blob').forEach((b, i) => {
      gsap.to(b, { x: i ? -60 : 40, y: i ? 40 : -30, duration: 6 + i * 2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });
    $$('.join .blob').forEach((b, i) => {
      gsap.to(b, { xPercent: i ? -20 : 25, yPercent: i ? -15 : 20, duration: 7 + i * 2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });

    // Hanging elements (e.g. the poster on marionette strings): idle sway + kick from scroll speed
    $$('[data-swing]').forEach(el => {
      let kick = 0, vel = 0;
      ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onUpdate: self => { kick += Math.max(-6, Math.min(6, self.getVelocity() / 400)); } });
      gsap.ticker.add(time => {
        vel += (-kick) * 0.06; vel *= 0.9; kick += vel;          // springy return
        kick = Math.max(-9, Math.min(9, kick));
        gsap.set(el, { rotation: Math.sin(time * 1.1) * 1.3 + kick });
      });
    });

    // Featured poster: 3D flip-up reveal on scroll + holographic tilt following the cursor
    $$('[data-poster3d]').forEach(rig => {
      const card = rig.querySelector('.poster');
      gsap.fromTo(rig, { rotationX: 40, rotationY: -12, y: 70, scale: 0.9, opacity: 0.15, transformPerspective: 1300, transformOrigin: '50% 100%' },
        { rotationX: 0, rotationY: 0, y: 0, scale: 1, opacity: 1, ease: 'power3.out', scrollTrigger: { trigger: rig, start: 'top 112%', end: 'top 62%', scrub: 0.3 } });
      if (!finePointer || !card) return;
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
      const sc = gsap.quickTo(card, 'scale', { duration: 0.6, ease: 'power3' });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 16); rx(-(py - 0.5) * 14); sc(1.03);
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); sc(1); });
    });

    // Timeline progress line
    $$('.timeline').forEach(tl => {
      const p = $('.tl-progress', tl);
      if (p) gsap.to(p, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: true } });
    });

    // Footer giant word
    const fw = $('.footer-word');
    if (fw) {
      const chars = [];
      $$('span', fw).forEach(sp => {
        const t = sp.textContent; sp.textContent = '';
        [...t].forEach(ch => { const c = document.createElement('span'); c.textContent = ch === ' ' ? ' ' : ch; sp.appendChild(c); chars.push(c); });
      });
      gsap.from(chars, { yPercent: 110, rotate: 8, duration: 1.1, stagger: 0.035, ease: 'power4.out', scrollTrigger: { trigger: fw, start: 'top 95%', toggleActions: 'play play play none' } });
    }

    // Project / info cards tilt on hover
    if (finePointer) {
      $$('[data-tilt]').forEach(card => {
        const rX = gsap.quickTo(card, 'rotationX', { duration: 0.6 }), rY = gsap.quickTo(card, 'rotationY', { duration: 0.6 });
        gsap.set(card, { transformPerspective: 900 });
        card.addEventListener('pointermove', e => {
          const r = card.getBoundingClientRect();
          rY(((e.clientX - r.left) / r.width - 0.5) * 8);
          rX(-((e.clientY - r.top) / r.height - 0.5) * 8);
        });
        card.addEventListener('pointerleave', () => { rX(0); rY(0); });
      });
    }

    ScrollTrigger.refresh();
    catchUp();
  };

  // Anything already scrolled past before the triggers existed (fast scroll during load, anchor jumps)
  // never fires its enter callbacks — play those straight away so nothing above the viewport stays hidden.
  const catchUp = () => {
    const y = window.scrollY;
    ScrollTrigger.getAll().forEach(st => {
      const a = st.animation;
      if (a && st.end < y && !st.vars.scrub && a.progress() < 1 && !a.isActive()) safe(() => a.play());
    });
    const passed = $$('[data-reveal]').filter(e => !e.__shown && e.getBoundingClientRect().top < window.innerHeight * 0.88);
    if (passed.length) { passed.forEach(e => (e.__shown = true)); gsap.to(passed, { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.04, ease: 'power3.out', overwrite: true }); }
  };
  window.addEventListener('scroll', () => { clearTimeout(catchUp.t); catchUp.t = setTimeout(catchUp, 180); }, { passive: true });

  /* ---------- Boot sequence ---------- */
  const start = async () => {
    await runPreloader();
    const introP = revealPage();
    intro();
    scrollAnims();
    await introP;
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* ======================================================================
     Hero canvas
     ====================================================================== */
  function heroCanvas(cv, animate) {
    const ctx = cv.getContext('2d');
    let w, h, dpr, raf = null, visible = true;
    const mouse = { x: 0.7, y: 0.35, tx: 0.7, ty: 0.35 };
    const blobs = [
      { c: [154, 217, 124], r: 0.42, x: 0.18, y: 0.25, sx: 0.00021, sy: 0.00017, ph: 0 },
      { c: [143, 208, 242], r: 0.38, x: 0.82, y: 0.2, sx: 0.00017, sy: 0.00023, ph: 2 },
      { c: [255, 205, 77], r: 0.22, x: 0.62, y: 0.7, sx: 0.00026, sy: 0.00019, ph: 4, a: 0.45 },
      { c: [51, 122, 69], r: 0.3, x: 0.35, y: 0.85, sx: 0.00019, sy: 0.00015, ph: 1, a: 0.35 },
      { c: [31, 143, 207], r: 0.26, x: 0.9, y: 0.75, sx: 0.00022, sy: 0.0002, ph: 3, a: 0.35 }
    ];
    const seeds = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, s: 0.00004 + Math.random() * 0.0001, d: Math.random() * Math.PI * 2, leaf: Math.random() > 0.6 }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = t => {
      ctx.fillStyle = '#f6f2e9';
      ctx.fillRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
      const m = Math.max(w, h);
      blobs.forEach((b, i) => {
        let x = (b.x + Math.sin(t * b.sx + b.ph) * 0.08) * w;
        let y = (b.y + Math.cos(t * b.sy + b.ph) * 0.08) * h;
        if (i === 0) { x += (mouse.x - 0.5) * 120; y += (mouse.y - 0.5) * 80; }
        if (i === 1) { x -= (mouse.x - 0.5) * 90; y -= (mouse.y - 0.5) * 60; }
        const r = b.r * m * (1 + Math.sin(t * 0.0004 + b.ph) * 0.06);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const a = b.a || 0.6;
        g.addColorStop(0, `rgba(${b.c},${a})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      seeds.forEach(s => {
        if (animate) { s.y -= s.s * 16; s.x += Math.sin(t * 0.0006 + s.d) * 0.00025; if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); } }
        const x = s.x * w, y = s.y * h;
        ctx.save();
        ctx.translate(x, y);
        if (s.leaf) {
          ctx.rotate(Math.sin(t * 0.001 + s.d) * 0.8 + s.d);
          ctx.fillStyle = 'rgba(51,122,69,0.35)';
          ctx.beginPath(); ctx.ellipse(0, 0, s.r * 2.4, s.r, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(31,143,207,0.3)';
          ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
    };
    const loop = t => { draw(t); raf = visible ? requestAnimationFrame(loop) : null; };

    resize();
    window.addEventListener('resize', () => { resize(); if (!animate) draw(0); });
    if (!animate) { draw(0); return; }
    window.addEventListener('pointermove', e => { mouse.tx = e.clientX / window.innerWidth; mouse.ty = e.clientY / window.innerHeight; }, { passive: true });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(cv);
    raf = requestAnimationFrame(loop);
  }
})();
