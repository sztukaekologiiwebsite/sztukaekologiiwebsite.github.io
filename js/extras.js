/* ==========================================================================
   Sztuka Ekologii — extras
   Gallery "show all", back-to-top, chapter nav, skip intro,
   swinging trash puppets, scroll-drawn vine, bottle-cap rain.
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const PL = document.documentElement.lang === 'pl';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const lenis = () => window.__lenis || null;
  const scrollToY = (y, el) => { const l = lenis(); if (l) l.scrollTo(el ?? y, { duration: 1.4 }); else (el ? el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }) : window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' })); };
  const refresh = () => window.ScrollTrigger && ScrollTrigger.refresh();

  /* ---------- Gallery: show all ---------- */
  $$('[data-gallery-more]').forEach(btn => {
    const grid = btn.closest('section').querySelector('.gallery-grid');
    btn.addEventListener('click', () => {
      grid.classList.remove('is-collapsed');
      btn.parentElement.remove();
      $$('.gallery-item', grid).forEach(it => { it.style.opacity = 1; it.style.transform = 'none'; });
      refresh();
    });
  });

  /* ---------- Back to top ---------- */
  const top = $('.to-top');
  if (top) {
    const onScroll = () => top.classList.toggle('is-on', window.scrollY > window.innerHeight * 1.2);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    top.addEventListener('click', () => scrollToY(0));
  }

  /* ---------- Skip intro (home) ---------- */
  $$('.t2t-skip').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToY(null, $('#rest')); }));

  /* ---------- Chapter nav (long project pages, desktop) ---------- */
  const main = $('main[data-chapters]');
  if (main && window.matchMedia('(min-width: 1200px)').matches) {
    const secs = $$(':scope > section', main).filter(s => $('.eyebrow', s) && !s.classList.contains('page-hero'));
    if (secs.length > 3) {
      const nav = document.createElement('nav');
      nav.className = 'toc';
      nav.setAttribute('aria-label', (top && top.dataset.tocLabel) || 'On this page');
      nav.innerHTML = '<ol>' + secs.map((s, i) => `<li><a href="#" data-i="${i}"><span class="toc-dot"></span><span class="toc-label">${$('.eyebrow', s).textContent.trim()}</span></a></li>`).join('') + '</ol>';
      document.body.appendChild(nav);
      const links = $$('a', nav);
      links.forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToY(null, secs[+a.dataset.i]); }));
      const io = new IntersectionObserver(ens => ens.forEach(en => {
        if (en.isIntersecting) { const i = secs.indexOf(en.target); links.forEach((l, k) => l.classList.toggle('is-on', k === i)); }
      }), { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(s => io.observe(s));
      const hero = $('.page-hero', main), foot = $('.site-footer');
      const vis = () => {
        const past = hero ? hero.getBoundingClientRect().bottom < 80 : true;
        const atEnd = foot ? foot.getBoundingClientRect().top < window.innerHeight * 0.6 : false;
        nav.classList.toggle('is-on', past && !atEnd);
      };
      window.addEventListener('scroll', vis, { passive: true }); vis();
    }
  }

  /* ---------- Swinging trash puppets ---------- */
  const stage = $('[data-puppet-stage]');
  if (stage) {
    const ps = $$('[data-puppet]', stage).map((el, i) => ({ el, a: 0, v: 0, drag: false, phase: i * 1.7, last: 0, lastT: 0 }));
    let wind = 0, visible = false, raf = null, lastY = window.scrollY;
    const set = p => { p.el.style.transform = `translateX(-50%) rotate(${p.a.toFixed(2)}deg)`; };
    const step = t => {
      ps.forEach(p => {
        if (!p.drag) {
          const idle = reduce ? 0 : Math.sin(t / 900 + p.phase) * 0.9;            // gentle breeze
          const acc = -0.022 * (p.a - idle) - 0.035 * p.v + wind * (0.6 + (p.phase % 1));
          p.v += acc * 3; p.a += p.v;
          p.a = Math.max(-75, Math.min(75, p.a));
        }
        set(p);
      });
      wind *= 0.9;
      raf = visible ? requestAnimationFrame(step) : null;
    };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(step); }).observe(stage);
    window.addEventListener('scroll', () => { const y = window.scrollY; if (visible && !reduce) wind += Math.max(-0.4, Math.min(0.4, (y - lastY) * 0.012)); lastY = y; }, { passive: true });
    ps.forEach(p => {
      const pivot = () => { const r = stage.getBoundingClientRect(), bar = $('.stage-bar', stage).getBoundingClientRect(); return { x: r.left + parseFloat(getComputedStyle(p.el).left), y: bar.bottom }; };
      const angleAt = e => { const o = pivot(); return Math.max(-75, Math.min(75, Math.atan2(e.clientX - o.x, e.clientY - o.y) * -180 / Math.PI)); };
      p.el.addEventListener('pointerdown', e => {
        e.preventDefault(); p.el.setPointerCapture(e.pointerId); p.drag = true; p.el.classList.add('is-grabbed'); stage.classList.add('was-used');
        p.last = p.a; p.lastT = performance.now();
      });
      p.el.addEventListener('pointermove', e => {
        if (!p.drag) return;
        const a = angleAt(e), now = performance.now();
        p.v = (a - p.last) / Math.max(1, (now - p.lastT) / 16.7); p.last = a; p.lastT = now; p.a = a;
      });
      const up = () => { if (!p.drag) return; p.drag = false; p.el.classList.remove('is-grabbed'); p.v = Math.max(-9, Math.min(9, p.v)); };
      p.el.addEventListener('pointerup', up); p.el.addEventListener('pointercancel', up);
      // a tap / click without dragging gives it a playful nudge
      p.el.addEventListener('click', () => { if (Math.abs(p.v) < 0.5) p.v += (Math.random() > 0.5 ? 1 : -1) * 4; });
      // keyboard: arrows swing it
      p.el.tabIndex = 0; p.el.setAttribute('role', 'img');
      p.el.setAttribute('aria-label', $('img', p.el).alt);
      p.el.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') p.v -= 3; if (e.key === 'ArrowRight') p.v += 3; });
    });
  }

  /* ---------- Scroll-drawn vine (About) ---------- */
  const vineMain = $('main[data-vine]');
  if (vineMain && window.matchMedia('(min-width: 1100px)').matches) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.classList.add('vine'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path'); path.classList.add('vine-stem');
    svg.appendChild(path); vineMain.style.position = 'relative'; vineMain.appendChild(svg);
    let leaves = [], len = 0;
    const build = () => {
      const H = vineMain.scrollHeight, W = 120, x0 = 34, amp = 26, step = 260;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px';
      let d = `M ${x0} 0`;
      for (let y = 0, k = 0; y < H; y += step, k++) {
        const s = k % 2 ? -1 : 1;
        d += ` C ${x0 + s * amp} ${y + step * 0.33}, ${x0 + s * amp} ${y + step * 0.66}, ${x0} ${Math.min(H, y + step)}`;
      }
      path.setAttribute('d', d);
      len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      leaves.forEach(l => l.remove()); leaves = [];
      for (let at = 180; at < len; at += 150) {
        const p = path.getPointAtLength(at), q = path.getPointAtLength(at + 2), ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
        const side = (leaves.length % 2 ? 1 : -1);
        const g = document.createElementNS(NS, 'g'); g.classList.add('vine-leaf'); g.dataset.at = at;
        g.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang + side * 55})`);
        const leaf = document.createElementNS(NS, 'path');
        leaf.setAttribute('d', 'M0 0 C 8 -9, 22 -9, 30 0 C 22 9, 8 9, 0 0 Z');
        leaf.setAttribute('class', leaves.length % 3 === 2 ? 'leaf-b' : 'leaf-g');
        g.appendChild(leaf); svg.appendChild(g); leaves.push(g);
      }
    };
    const draw = () => {
      const r = vineMain.getBoundingClientRect(), H = vineMain.scrollHeight;
      const prog = Math.max(0, Math.min(1, (window.innerHeight * 0.7 - r.top) / H));
      const drawn = len * prog;
      path.style.strokeDashoffset = len - drawn;
      leaves.forEach(l => l.classList.toggle('is-on', +l.dataset.at < drawn));
    };
    build(); draw();
    window.addEventListener('scroll', draw, { passive: true });
    window.addEventListener('resize', () => { build(); draw(); });
    window.addEventListener('load', () => { build(); draw(); });
  }

  /* ---------- Easter egg: type "recykling" (or tap the logo 5×) ---------- */
  const rain = () => {
    if (reduce || document.querySelector('.cap-rain')) return;
    const box = document.createElement('div'); box.className = 'cap-rain'; box.setAttribute('aria-hidden', 'true');
    const colors = ['#e63b2e', '#1f8fcf', '#8fd46f', '#ffcd4d', '#337a45', '#ff7a1a', '#f6f2e9'];
    const H = window.innerHeight, W = window.innerWidth;
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('span'); c.className = 'cap';
      const size = 22 + Math.random() * 22;
      c.style.cssText = `--c:${colors[i % colors.length]};width:${size}px;height:${size}px;left:${Math.random() * 100}%`;
      box.appendChild(c);
      const dur = 1.6 + Math.random() * 1.4, delay = Math.random() * 1.6;
      c.animate([
        { transform: `translateY(-60px) rotate(0deg)` },
        { transform: `translateY(${H - size}px) rotate(${(Math.random() * 2 - 1) * 540}deg)`, offset: 0.8, easing: 'ease-out' },
        { transform: `translateY(${H - size - 40}px) rotate(${(Math.random() * 2 - 1) * 600}deg)`, offset: 0.9 },
        { transform: `translateY(${H + 80}px) rotate(${(Math.random() * 2 - 1) * 720}deg)` }
      ], { duration: dur * 1000, delay: delay * 1000, easing: 'cubic-bezier(.45,0,.9,.6)', fill: 'both' });
    }
    const msg = document.createElement('div'); msg.className = 'cap-msg'; msg.textContent = PL ? '♻ Drugie życie! ♻' : '♻ Second life! ♻';
    box.appendChild(msg);
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 5200);
  };
  let typed = '';
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    if (typed.endsWith('recykling') || typed.endsWith('recycling')) { typed = ''; rain(); }
  });
  let taps = 0, tapT = 0;
  $$('.brand img').forEach(img => img.addEventListener('click', e => {
    const now = Date.now(); taps = now - tapT < 600 ? taps + 1 : 1; tapT = now;
    if (taps >= 5) { e.preventDefault(); taps = 0; rain(); }
  }));
})();
