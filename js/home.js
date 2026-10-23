/* ==========================================================================
   Home — "Trash to Treasure" 3D scene (Three.js)
   Litter drifts in a dark field, then rebuilds itself on scroll into the
   logo, a puppet and a leaf.
   ========================================================================== */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector('.t2t-scene');
  const stagesEl = document.querySelector('.t2t-stages');
  if (!canvas || !stagesEl) return;
  const N = innerWidth < 760 ? 900 : 1400;

  if (!window.THREE) { document.documentElement.classList.add('no-webgl'); return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { document.documentElement.classList.add('no-webgl'); return; }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x0b1f14, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1f14, 60, 120);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300);
  camera.position.set(0, 0, 70);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(20, 30, 40); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd0f2, 0.6); rim.position.set(-30, -10, -20); scene.add(rim);
  const glow = new THREE.PointLight(0x9ad97c, 1.4, 45); glow.position.set(0, 0, 18); scene.add(glow);

  /* ---------- Instances: three kinds of "litter" ---------- */
  const geos = [new THREE.BoxGeometry(0.55, 1, 0.55), new THREE.CylinderGeometry(0.42, 0.42, 0.22, 12), new THREE.IcosahedronGeometry(0.48, 0)];
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.25, flatShading: true });
  const counts = [Math.floor(N * 0.34), Math.floor(N * 0.33)]; counts.push(N - counts[0] - counts[1]);
  const meshes = geos.map((g, i) => { const m = new THREE.InstancedMesh(g, mat, counts[i]); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; });
  const owner = new Uint8Array(N), local = new Uint16Array(N);
  for (let i = 0, k = 0; k < 3; k++) for (let j = 0; j < counts[k]; j++, i++) { owner[i] = k; local[i] = j; }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const inst = Array.from({ length: N }, () => ({
    rx: rnd(0, 6.3), ry: rnd(0, 6.3), sx: rnd(-0.6, 0.6), sy: rnd(-0.6, 0.6), s: rnd(0.6, 1.35), ph: rnd(0, 6.3),
    dir: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize()
  }));

  /* ---------- Target shapes ---------- */
  const litter = ['#4aa3df', '#3f8f5a', '#cfe3e8', '#a7adb3', '#e0533d', '#f2c14e', '#eeeeee', '#a67c52', '#7cc36a'].map(c => new THREE.Color(c));
  const stage0 = () => {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = rnd(-48, 48), y = rnd(-28, 28);
      const behindText = Math.abs(x) < 24 && Math.abs(y) < 13;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = behindText ? rnd(-45, -28) : rnd(-25, 12);
      const c = litter[(Math.random() * litter.length) | 0]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { pos, col };
  };
  const sample = (draw, worldW, size = 220) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); draw(x, size);
    const d = x.getImageData(0, 0, size, size).data, pts = [];
    for (let y = 0; y < size; y += 2) for (let X = 0; X < size; X += 2) { const i = (y * size + X) * 4; if (d[i + 3] > 150) pts.push([X, y, d[i], d[i + 1], d[i + 2]]); }
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) {
      const p = pts[(Math.random() * pts.length) | 0] || [size / 2, size / 2, 150, 200, 150];
      pos[k * 3] = (p[0] / size - 0.5) * worldW + rnd(-0.25, 0.25);
      pos[k * 3 + 1] = -(p[1] / size - 0.5) * worldW + rnd(-0.25, 0.25);
      pos[k * 3 + 2] = rnd(-1.8, 1.8);
      const cc = new THREE.Color(`rgb(${p[2]},${p[3]},${p[4]})`);
      col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b;
    }
    return { pos, col };
  };
  /* Marionette: each part gets its own share of pieces so small features stay readable.
     Strings use small pieces laid evenly along the line. */
  const samplePuppet = (worldW, size = 220) => {
    const parts = [
      // [share, piece scale, draw]
      [0.10, 0.85, (x, s) => { x.fillStyle = '#c08a52'; x.fillRect(s * .27, s * .045, s * .46, s * .04); x.fillRect(s * .475, 0, s * .05, s * .17); }],           // wooden control cross
      [0.16, 0.8, (x, s) => { x.fillStyle = '#ffcd4d'; x.beginPath(); x.arc(s * .5, s * .3, s * .1, 0, 7); x.fill();                                                 // head
        x.fillStyle = '#ffcd4d'; x.beginPath(); x.arc(s * .265, s * .385, s * .03, 0, 7); x.fill(); x.beginPath(); x.arc(s * .735, s * .385, s * .03, 0, 7); x.fill(); }], // hands
      [0.05, 0.75, (x, s) => { x.fillStyle = '#e0533d'; x.beginPath(); x.moveTo(s * .41, s * .235); x.lineTo(s * .59, s * .235); x.lineTo(s * .5, s * .13); x.closePath(); x.fill(); // hat
        x.fillStyle = '#ffffff'; x.beginPath(); x.arc(s * .5, s * .128, s * .018, 0, 7); x.fill(); }],                                                                   // pom-pom
      [0.05, 0.55, (x, s) => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(s * .46, s * .29, s * .026, 0, 7); x.fill(); x.beginPath(); x.arc(s * .54, s * .29, s * .026, 0, 7); x.fill(); }], // eye whites
      [0.02, 0.5, (x, s) => { x.fillStyle = '#14466e'; x.beginPath(); x.arc(s * .465, s * .292, s * .012, 0, 7); x.fill(); x.beginPath(); x.arc(s * .545, s * .292, s * .012, 0, 7); x.fill(); }], // pupils
      [0.03, 0.5, (x, s) => { x.strokeStyle = '#e0533d'; x.lineWidth = s * .016; x.lineCap = 'round'; x.beginPath(); x.arc(s * .5, s * .315, s * .045, .35, Math.PI - .35); x.stroke(); }], // smile
      [0.19, 0.85, (x, s) => { x.fillStyle = '#7cc36a'; x.beginPath(); x.moveTo(s * .4, s * .42); x.lineTo(s * .6, s * .42); x.lineTo(s * .62, s * .63); x.lineTo(s * .38, s * .63); x.closePath(); x.fill(); // shirt
        x.fillStyle = '#4a9a52'; x.fillRect(s * .39, s * .49, s * .22, s * .025); x.fillRect(s * .385, s * .56, s * .23, s * .025); }],                                       // stripes
      [0.03, 0.55, (x, s) => { x.fillStyle = '#1f8fcf'; [.46, .53, .6].forEach(y => { x.beginPath(); x.arc(s * .5, s * y, s * .014, 0, 7); x.fill(); }); }],             // buttons
      [0.12, 0.8, (x, s) => { x.strokeStyle = '#4aa3df'; x.lineWidth = s * .045; x.lineCap = 'round'; x.lineJoin = 'round';                                            // arms, waving up
        x.beginPath(); x.moveTo(s * .41, s * .45); x.lineTo(s * .32, s * .5); x.lineTo(s * .27, s * .41); x.stroke();
        x.beginPath(); x.moveTo(s * .59, s * .45); x.lineTo(s * .68, s * .5); x.lineTo(s * .73, s * .41); x.stroke(); }],
      [0.06, 0.8, (x, s) => { x.fillStyle = '#1f8fcf'; x.fillRect(s * .38, s * .63, s * .24, s * .07); }],                                                          // shorts
      [0.08, 0.8, (x, s) => { x.strokeStyle = '#c9d3d8'; x.lineWidth = s * .042; x.lineCap = 'round';                                                                // legs
        x.beginPath(); x.moveTo(s * .45, s * .7); x.lineTo(s * .43, s * .86); x.stroke(); x.beginPath(); x.moveTo(s * .55, s * .7); x.lineTo(s * .58, s * .86); x.stroke(); }],
      [0.04, 0.8, (x, s) => { x.fillStyle = '#e0533d'; x.beginPath(); x.ellipse(s * .41, s * .885, s * .045, s * .024, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(s * .6, s * .885, s * .045, s * .024, 0, 0, 7); x.fill(); }] // shoes
    ];
    const strings = [[.29, .065, .265, .36], [.71, .065, .735, .36], [.5, .17, .5, .2], [.36, .065, .43, .79], [.64, .065, .58, .79]];
    const stringShare = 1 - parts.reduce((a, p) => a + p[0], 0);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sc = new Float32Array(N);
    let k = 0;
    const put = (px, py, rgb, scale) => {
      if (k >= N) return;
      pos[k * 3] = (px / size - .5) * worldW + rnd(-.12, .12);
      pos[k * 3 + 1] = -(py / size - .5) * worldW + rnd(-.12, .12);
      pos[k * 3 + 2] = rnd(-1.2, 1.2);
      col[k * 3] = rgb[0]; col[k * 3 + 1] = rgb[1]; col[k * 3 + 2] = rgb[2]; sc[k] = scale; k++;
    };
    for (const [share, scale, draw] of parts) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d'); draw(x, size);
      const d = x.getImageData(0, 0, size, size).data, pts = [];
      for (let y = 0; y < size; y++) for (let X = 0; X < size; X++) { const i = (y * size + X) * 4; if (d[i + 3] > 150) pts.push([X, y, d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]); }
      const n = Math.round(N * share);
      for (let q = 0; q < n && pts.length; q++) { const p = pts[(Math.random() * pts.length) | 0]; put(p[0], p[1], [p[2], p[3], p[4]], scale); }
    }
    const str = new THREE.Color('#e8eef0');
    const totalLen = strings.reduce((a, [x1, y1, x2, y2]) => a + Math.hypot(x2 - x1, y2 - y1), 0);
    const nStr = Math.round(N * stringShare);
    for (const [x1, y1, x2, y2] of strings) {
      const n = Math.max(2, Math.round(nStr * Math.hypot(x2 - x1, y2 - y1) / totalLen));
      for (let q = 0; q < n; q++) { const t = q / (n - 1); put((x1 + (x2 - x1) * t) * size, (y1 + (y2 - y1) * t) * size, [str.r, str.g, str.b], 0.38); }
    }
    while (k < N) { const j = (Math.random() * k) | 0; put((pos[j * 3] / worldW + .5) * size, (-pos[j * 3 + 1] / worldW + .5) * size, [col[j * 3], col[j * 3 + 1], col[j * 3 + 2]], sc[j]); }
    return { pos, col, sc };
  };
  const drawLeaf = (x, s) => {
    const g = x.createLinearGradient(0, s, s, 0); g.addColorStop(0, '#337a45'); g.addColorStop(0.6, '#5aa65a'); g.addColorStop(1, '#9ad97c');
    x.fillStyle = g; x.beginPath(); x.moveTo(s * 0.16, s * 0.86);
    x.bezierCurveTo(s * 0.1, s * 0.4, s * 0.45, s * 0.1, s * 0.9, s * 0.1); x.bezierCurveTo(s * 0.9, s * 0.55, s * 0.6, s * 0.9, s * 0.16, s * 0.86); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.lineWidth = s * 0.018; x.lineCap = 'round';
    x.beginPath(); x.moveTo(s * 0.16, s * 0.86); x.quadraticCurveTo(s * 0.5, s * 0.5, s * 0.86, s * 0.14); x.stroke();
    [[0.32, 0.7, 0.28, 0.45], [0.46, 0.57, 0.5, 0.3], [0.6, 0.43, 0.72, 0.22], [0.38, 0.64, 0.6, 0.72], [0.53, 0.5, 0.76, 0.5]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a * s, b * s); x.lineTo(c * s, d * s); x.stroke(); });
  };

  const LAST = 3; // index of the final stage (rubbish → logo → puppet → leaf)
  const targets = [stage0()];
  let ready = false;
  const img = new Image();
  img.onload = () => {
    targets[1] = sample((x, s) => { const r = img.width / img.height, w = r > 1 ? s : s * r, h = r > 1 ? s / r : s; x.drawImage(img, (s - w) / 2, (s - h) / 2, w, h); }, 36);
    targets[2] = samplePuppet(40);
    targets[3] = sample(drawLeaf, 38);
    ready = true;
  };
  img.src = (document.documentElement.dataset.root || '') + 'assets/img/logo-mark.png';

  /* ---------- Layout ---------- */
  let wide = true, halfW = 40, halfH = 25;
  const offsets = [0, -1, 1, 0];
  const stageScale = [1, 0.78, 0.84, 0.72], stageZ = [0, 0, 0, -22];
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    wide = w / h > 1.1;
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; halfW = halfH * camera.aspect;
  };
  resize(); addEventListener('resize', resize);

  /* ---------- Scroll & pointer ---------- */
  let pTarget = 0, p = 0;
  const stageNames = [...document.querySelectorAll('.t2t-stage')].map(s => s.dataset.name);
  const prog = document.querySelector('.t2t-progress');
  const numIdx = prog.querySelector('.idx'), numName = prog.querySelector('.name'), numBar = prog.querySelector('.bar span');
  const onScroll = () => {
    const r = stagesEl.getBoundingClientRect();
    const total = r.height - innerHeight;
    pTarget = Math.min(LAST, Math.max(0, (-r.top / total) * LAST));
    prog.classList.toggle('is-hidden', r.bottom < innerHeight * 0.6);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const mouse = { x: 9999, y: 9999 };
  addEventListener('pointermove', e => { mouse.x = (e.clientX / innerWidth * 2 - 1) * halfW; mouse.y = -(e.clientY / innerHeight * 2 - 1) * halfH; }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = 9999; });

  /* ---------- Render loop ---------- */
  const dummy = new THREE.Object3D(), col = new THREE.Color(), push = new Float32Array(N * 2);
  const smooth = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
  let visible = true, lastStage = -1;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(stagesEl);

  const frame = now => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = reduce ? 0 : now * 0.001;
    p += (pTarget - p) * 0.14;
    const i = Math.min(LAST - 1, Math.floor(p)), f = p - i;
    const e = (ready || i === 0) ? smooth(0.12, 0.88, f) : 0;
    const A = targets[i], B = (ready ? targets[Math.min(LAST, i + 1)] : null) || targets[i];
    const burst = Math.sin(Math.PI * e) * 9;
    const ox = k => (wide ? offsets[k] * Math.min(15, halfW * 0.42) : 0);
    const oy = k => (wide || k === 0 ? 0 : halfH * 0.32);
    const sc = wide ? 1 : Math.min(1, (halfW * 1.7) / 40);
    const cur = Math.round(p);
    if (cur !== lastStage) { lastStage = cur; numIdx.textContent = '0' + cur; numName.textContent = stageNames[cur] || ''; }
    numBar.style.transform = `scaleX(${p / LAST})`;

    for (let n = 0; n < N; n++) {
      const o = inst[n], j = n * 3;
      const sa = i === 0 ? 1 : sc * stageScale[i], sb = sc * stageScale[i + 1];
      const ax = A.pos[j] * sa + ox(i), ay = A.pos[j + 1] * sa + oy(i), az = A.pos[j + 2] + stageZ[i];
      const bx = B.pos[j] * sb + ox(i + 1), by = B.pos[j + 1] * sb + oy(i + 1), bz = B.pos[j + 2] + stageZ[i + 1];
      let x = ax + (bx - ax) * e + o.dir.x * burst, y = ay + (by - ay) * e + o.dir.y * burst;
      const z = az + (bz - az) * e + o.dir.z * burst;
      const drift = i === 0 ? (1 - e) * 1.6 + 0.25 : 0.25;
      x += Math.sin(t * 0.5 + o.ph) * drift; y += Math.cos(t * 0.4 + o.ph * 1.3) * drift;
      const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
      let px = push[n * 2] * 0.9, py = push[n * 2 + 1] * 0.9;
      if (d2 < 49) { const d = Math.sqrt(d2) || 1, k = (7 - d) * 0.55; px += dx / d * k * 0.2; py += dy / d * k * 0.2; }
      push[n * 2] = px; push[n * 2 + 1] = py;
      dummy.position.set(x + px, y + py, z);
      dummy.rotation.set(o.rx + t * o.sx, o.ry + t * o.sy, 0);
      const formed = i === 0 ? e : 1;
      const pa = A.sc ? A.sc[n] : 1, pb = B.sc ? B.sc[n] : 1;
      dummy.scale.setScalar(o.s * (1.75 - formed * 1.05) * (pa + (pb - pa) * e)); // big litter, finer pieces once a shape forms
      dummy.updateMatrix();
      const m = meshes[owner[n]];
      m.setMatrixAt(local[n], dummy.matrix);
      col.setRGB(A.col[j] + (B.col[j] - A.col[j]) * e, A.col[j + 1] + (B.col[j + 1] - A.col[j + 1]) * e, A.col[j + 2] + (B.col[j + 2] - A.col[j + 2]) * e);
      m.setColorAt(local[n], col);
    }
    meshes.forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    glow.position.x += ((mouse.x < 999 ? mouse.x : 0) - glow.position.x) * 0.08;
    glow.position.y += ((mouse.y < 999 ? mouse.y : 0) - glow.position.y) * 0.08;
    camera.position.x = Math.sin(t * 0.15) * 2; camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
})();
