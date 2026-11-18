/* ============================================================
   SugeySpotify · Escena 3D (Three.js)
   Vinilo giratorio, anillo de ecualizador, anillo de texto,
   burros graduados que bailan y el orbe del audio 3D.
   ============================================================ */

const Scene3D = (() => {
  let renderer, scene, camera, clock, group, vinyl, vinylTex, labelCanvas, bars = [], burros = [], stars, ring, orb, orbTrail, pLight, rimLight;
  let stage = false, playing = false, getLevels = () => null;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = { guinda: 0xa3172f, deep: 0x5c0b18, gold: 0xe7b84a, bone: 0xf3ede4 };
  let palette = ['#A3172F', '#E7B84A'], coverTitle = 'SugeySpotify';

  function init(canvas) {
    if (!window.THREE) return false;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x14080b, 1);
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x14080b, 0.045);
    camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 0.4, 10);
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xffe9d6, 0.45));
    const key = new THREE.DirectionalLight(0xffe2a8, 0.9); key.position.set(4, 6, 6); scene.add(key);
    pLight = new THREE.PointLight(C.guinda, 2.2, 9); pLight.position.set(0, 0, 2.5); scene.add(pLight);
    rimLight = new THREE.PointLight(C.gold, 1.2, 18); rimLight.position.set(-5, 3, -2); scene.add(rimLight);

    group = new THREE.Group(); scene.add(group);
    buildVinyl(); buildBars(); buildRing(); buildStars(); buildBurros(); buildOrb();

    addEventListener('resize', onResize);
    addEventListener('pointermove', e => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; });
    renderer.setAnimationLoop(frame);
    return true;
  }

  /* ---------- vinilo ---------- */
  function drawLabel() {
    const c = labelCanvas, x = c.getContext('2d'), s = c.width, h = s / 2;
    x.clearRect(0, 0, s, s);
    x.fillStyle = '#0c0607'; x.beginPath(); x.arc(h, h, h, 0, Math.PI * 2); x.fill();
    for (let r = h * 0.98; r > h * 0.36; r -= 3) { x.strokeStyle = (Math.round(r) % 2) ? '#1b1013' : '#100809'; x.lineWidth = 1.6; x.beginPath(); x.arc(h, h, r, 0, Math.PI * 2); x.stroke(); }
    // brillo
    const sh = x.createLinearGradient(0, 0, s, s); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,230,200,0.10)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)');
    x.fillStyle = sh; x.beginPath(); x.arc(h, h, h, 0, Math.PI * 2); x.fill();
    const g = x.createRadialGradient(h, h, 4, h, h, h * 0.34); g.addColorStop(0, palette[1]); g.addColorStop(1, palette[0]);
    x.fillStyle = g; x.beginPath(); x.arc(h, h, h * 0.34, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#F3EDE4'; x.textAlign = 'center'; x.font = '800 30px Unbounded, sans-serif';
    x.fillText('SUGEY YALA', h, h - 34);
    x.font = '600 17px Manrope, sans-serif';
    const t = coverTitle.length > 26 ? coverTitle.slice(0, 25) + '…' : coverTitle; x.fillText(t, h, h + 48);
    x.fillStyle = '#0c0607'; x.beginPath(); x.arc(h, h, 9, 0, Math.PI * 2); x.fill();
    if (vinylTex) vinylTex.needsUpdate = true;
  }
  function buildVinyl() {
    labelCanvas = document.createElement('canvas'); labelCanvas.width = labelCanvas.height = 1024;
    drawLabel();
    vinylTex = new THREE.CanvasTexture(labelCanvas); vinylTex.anisotropy = 4;
    const face = new THREE.MeshStandardMaterial({ map: vinylTex, roughness: 0.35, metalness: 0.3 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x0c0607, roughness: 0.4 });
    vinyl = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.06, 96), [edge, face, face]);
    vinyl.rotation.x = Math.PI / 2;
    group.add(vinyl);
  }

  /* ---------- barras del ecualizador ---------- */
  function buildBars() {
    const n = 72, geo = new THREE.BoxGeometry(0.07, 1, 0.07); geo.translate(0, 0.5, 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, col = new THREE.Color(C.gold).lerp(new THREE.Color(C.guinda), Math.abs(Math.sin(a)));
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.4 }));
      m.position.set(Math.cos(a) * 2.25, Math.sin(a) * 2.25, 0); m.rotation.z = a - Math.PI / 2; m.scale.y = 0.05;
      group.add(m); bars.push(m);
    }
  }

  /* ---------- anillo de texto ---------- */
  function buildRing() {
    const c = document.createElement('canvas'); c.width = 4096; c.height = 160; const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.font = '800 92px Unbounded, sans-serif'; x.textBaseline = 'middle';
    const words = ['SUGEY YALA', 'UNI LLENO DE BURROS'];
    let px = 20, i = 0;
    while (px < c.width) { const w = words[i % 2]; x.fillStyle = i % 2 ? '#E7B84A' : '#F3EDE4'; x.fillText(w, px, 84); px += x.measureText(w).width + 40; x.fillStyle = '#A3172F'; x.fillText('✦', px, 84); px += 110; i++; }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = 1;
    ring = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.55, 128, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = 0.32; ring.rotation.z = -0.12;
    group.add(ring);
  }

  /* ---------- estrellas / polvo dorado ---------- */
  function buildStars() {
    const n = reduce ? 600 : 1800, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const a = new THREE.Color(C.gold), b = new THREE.Color(0xe8a0a8), w = new THREE.Color(C.bone);
    for (let i = 0; i < n; i++) {
      const r = 8 + Math.random() * 40, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph) * 0.6; pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 10;
      const c = [a, b, w][i % 3]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
    scene.add(stars);
  }

  /* ---------- burros graduados ---------- */
  function makeBurro() {
    const b = new THREE.Group();
    const grey = new THREE.MeshStandardMaterial({ color: 0x8c8f99, roughness: 0.85, flatShading: true });
    const light = new THREE.MeshStandardMaterial({ color: 0xe4dccd, roughness: 0.8, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2326, roughness: 0.7 });
    const black = new THREE.MeshStandardMaterial({ color: 0x0d0a0b, roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({ color: C.gold, emissive: C.gold, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.4 });
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); b.add(o); return o; };
    box(1.3, 0.62, 0.62, grey, 0, 0, 0);                         // cuerpo
    box(0.9, 0.2, 0.5, light, 0, -0.26, 0);                       // panza
    const neck = box(0.32, 0.55, 0.32, grey, 0.62, 0.32, 0); neck.rotation.z = -0.45;
    box(0.12, 0.5, 0.1, dark, 0.56, 0.5, 0).rotation.z = -0.45;   // crin
    box(0.46, 0.4, 0.4, grey, 0.86, 0.62, 0);                     // cabeza
    box(0.34, 0.3, 0.34, light, 1.14, 0.54, 0);                   // hocico
    box(0.05, 0.06, 0.06, black, 1.32, 0.6, 0.09); box(0.05, 0.06, 0.06, black, 1.32, 0.6, -0.09); // fosas
    box(0.08, 0.08, 0.04, black, 0.98, 0.72, 0.2); box(0.08, 0.08, 0.04, black, 0.98, 0.72, -0.2); // ojos
    const e1 = box(0.1, 0.48, 0.08, grey, 0.78, 1.02, 0.13); e1.rotation.x = 0.25;
    const e2 = box(0.1, 0.48, 0.08, grey, 0.78, 1.02, -0.13); e2.rotation.x = -0.25;
    // birrete
    box(0.56, 0.05, 0.56, black, 0.86, 0.9, 0).rotation.y = 0.5;
    box(0.3, 0.12, 0.3, black, 0.86, 0.84, 0);
    box(0.03, 0.22, 0.03, gold, 1.06, 0.78, 0.22);
    const legs = [];
    [[0.45, 0.2], [0.45, -0.2], [-0.45, 0.2], [-0.45, -0.2]].forEach(([x, z]) => {
      const leg = new THREE.Group(); leg.position.set(x, -0.25, z);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), grey); l.position.y = -0.3; leg.add(l);
      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.17), dark); hoof.position.y = -0.6; leg.add(hoof);
      b.add(leg); legs.push(leg);
    });
    const tail = box(0.06, 0.45, 0.06, dark, -0.7, -0.05, 0); tail.rotation.z = -0.4;
    b.userData = { legs, tail, ears: [e1, e2] };
    return b;
  }
  function buildBurros() {
    const n = reduce ? 4 : 7;
    for (let i = 0; i < n; i++) {
      const b = makeBurro(), a = (i / n) * Math.PI * 2;
      const r = 5.2 + (i % 3) * 1.4;
      b.userData.orbit = { a, r, y: (i % 2 ? 1.6 : -1.9) + Math.sin(i) * 0.6, speed: 0.05 + (i % 3) * 0.025, phase: i * 1.7 };
      b.scale.setScalar(0.55 + (i % 3) * 0.12);
      scene.add(b); burros.push(b);
    }
  }

  /* ---------- orbe del audio 3D ---------- */
  function buildOrb() {
    orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: C.gold }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.22, depthWrite: false }));
    orb.add(halo); orb.visible = false; scene.add(orb);
    const n = 40, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    orbTrail = new THREE.Points(g, new THREE.PointsMaterial({ color: C.gold, size: 0.07, transparent: true, opacity: 0.7, depthWrite: false }));
    orbTrail.visible = false; orbTrail.userData.n = n; scene.add(orbTrail);
  }

  /* ---------- bucle ---------- */
  let smooth = { bass: 0, mid: 0, high: 0 };
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const lv = getLevels() || { bass: 0, mid: 0, high: 0, freq: null };
    smooth.bass += (lv.bass - smooth.bass) * 0.3; smooth.mid += (lv.mid - smooth.mid) * 0.2; smooth.high += (lv.high - smooth.high) * 0.2;
    const energy = playing ? smooth.bass : 0;
    const k = reduce ? 0.25 : 1;

    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    // posición del grupo según modo
    const wide = innerWidth > 900;
    const target = stage ? { x: 0, y: 0.1, z: 0, s: 1.1 } : { x: wide ? 3.6 : 0, y: wide ? 1.2 : 2.2, z: -2, s: wide ? 0.95 : 0.7 };
    group.position.x += (target.x - group.position.x) * 0.06;
    group.position.y += (target.y - group.position.y) * 0.06;
    group.position.z += (target.z - group.position.z) * 0.06;
    const sc = group.scale.x + (target.s * (1 + energy * 0.06) - group.scale.x) * 0.15; group.scale.setScalar(sc);
    group.rotation.y = mouse.x * 0.35 + (stage ? Math.sin(t * 0.3) * 0.25 * k : -0.35);
    group.rotation.x = mouse.y * 0.2;

    vinyl.rotation.y += (playing ? 1.8 : 0.15) * dt * k;
    ring.rotation.y -= (0.12 + smooth.mid * 0.6) * dt * k;
    ring.material.opacity = stage ? 1 : 0.85;

    const f = lv.freq;
    for (let i = 0; i < bars.length; i++) {
      let v = 0.04;
      if (f && playing) { const idx = Math.floor(2 + Math.pow(i / bars.length < 0.5 ? (i / bars.length) * 2 : (1 - i / bars.length) * 2, 1.6) * 150); v = 0.04 + (f[idx] / 255) * 1.6; }
      else if (playing) v = 0.06 + (Math.sin(t * 6 + i * 0.6) * 0.5 + 0.5) * (0.3 + smooth.bass);
      bars[i].scale.y += (v - bars[i].scale.y) * 0.35;
    }
    pLight.intensity = 1.3 + energy * 3.2; pLight.position.set(group.position.x, group.position.y, group.position.z + 2.5);
    rimLight.intensity = 0.9 + smooth.high * 3;
    stars.rotation.y += dt * (0.01 + smooth.mid * 0.05) * k;
    stars.material.size = 0.08 + smooth.high * 0.08;

    burros.forEach((b, i) => {
      const o = b.userData.orbit; o.a += o.speed * dt * k * (stage ? 1.6 : 1);
      const bob = Math.sin(t * 2 + o.phase) * 0.25 + (playing ? energy * 0.6 : 0);
      b.position.set(Math.cos(o.a) * o.r, o.y + bob, Math.sin(o.a) * o.r * 0.55 - 3.5);
      b.rotation.y = -o.a + Math.PI; b.rotation.z = Math.sin(t * 1.3 + o.phase) * 0.12;
      const dance = playing ? 0.5 + energy : 0.15;
      b.userData.legs.forEach((l, j) => { l.rotation.z = Math.sin(t * (playing ? 9 : 3) + j * Math.PI * (j % 2 ? 1 : 0.5) + o.phase) * 0.45 * dance * k; });
      b.userData.tail.rotation.x = Math.sin(t * 7 + i) * 0.6 * dance;
      b.userData.ears.forEach((e, j) => { e.rotation.z = Math.sin(t * 5 + j + o.phase) * 0.2 * dance; });
    });

    // orbe del audio 3D
    const sp = window.UniAudio && UniAudio.spatialOn;
    orb.visible = orbTrail.visible = !!sp && playing;
    if (sp) {
      const p = UniAudio.spatialPos, ox = group.position.x + p.x * 1.9, oy = group.position.y + p.y * 1.5, oz = group.position.z - p.z * 1.9;
      orb.position.set(ox, oy, oz); orb.scale.setScalar(1 + energy * 0.8);
      const arr = orbTrail.geometry.attributes.position.array, n = orbTrail.userData.n;
      for (let i = n - 1; i > 0; i--) { arr[i * 3] = arr[(i - 1) * 3]; arr[i * 3 + 1] = arr[(i - 1) * 3 + 1]; arr[i * 3 + 2] = arr[(i - 1) * 3 + 2]; }
      arr[0] = ox; arr[1] = oy; arr[2] = oz; orbTrail.geometry.attributes.position.needsUpdate = true;
    }

    const camZ = stage ? 7.2 : 10;
    camera.position.z += (camZ - camera.position.z) * 0.05;
    camera.position.x = mouse.x * 0.6; camera.position.y = 0.4 - mouse.y * 0.4;
    camera.lookAt(stage ? 0 : 0.8, stage ? 0 : 0.3, -2);
    renderer.render(scene, camera);
  }

  function onResize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }

  return {
    init,
    setLevelSource(fn) { getLevels = fn; },
    setPlaying(p) { playing = p; },
    setStage(s) { stage = s; },
    setCover(pal, title) { palette = pal || palette; coverTitle = title || coverTitle; if (labelCanvas) drawLabel(); },
    redrawText() { if (labelCanvas) drawLabel(); if (ring) { scene && group.remove(ring); buildRing(); } }
  };
})();
