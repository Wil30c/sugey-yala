/* ============================================================
   SugeySpotify · Motor de audio
   - Sintetizador/secuenciador que compone canciones en vivo
   - Audio 3D (HRTF orbitando alrededor de tu cabeza)
   - Eco del Pabellón (reverb), bass boost, efectos de sonido
   - Reproductor de MP3 locales por la misma cadena de efectos
   ============================================================ */

const UniAudio = (() => {
  let ctx, master, shelf, comp, analyser, musicBus, dryGain, wetGain, panner;
  let reverb, reverbSend, sfxBus, noiseBuf, pulse12, pulse25, distCurve;
  let freqData, timeData;
  let audioEl = null, mediaSrc = null;
  let spatialOn = false, spatialT = 0;
  const spatialPos = { x: 0, y: 0, z: -1 };
  let seq = null;            // estado del secuenciador
  let songOut = null;        // ganancia de la canción actual
  const cache = new Map();   // canciones compuestas por id
  let onEnded = () => {};
  let volume = 0.8;

  /* ---------- utilidades ---------- */
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10], pentaMinor: [0, 2, 3, 5, 7, 8, 10]
  };
  const MEL_SCALES = { pentaMinor: [0, 3, 5, 7, 10] };
  const PROGS = {
    minor: [[0, 5, 2, 6], [0, 3, 6, 2], [0, 5, 3, 4], [0, 6, 5, 6]],
    major: [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3]],
    dorian: [[0, 3, 0, 3], [1, 4, 0, 5]],
    pentaMinor: [[0, 6, 5, 4], [0, 3, 0, 4]]
  };

  function makeImpulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function makePulse(duty) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 * Math.sin(k * Math.PI * duty)) / (k * Math.PI);
    return ctx.createPeriodicWave(re, im);
  }
  function makeDist(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x)); }
    return c;
  }

  /* ---------- inicialización ---------- */
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = volume;
    shelf = ctx.createBiquadFilter(); shelf.type = 'lowshelf'; shelf.frequency.value = 140; shelf.gain.value = 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    analyser = ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.78;
    master.connect(shelf); shelf.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);

    musicBus = ctx.createGain();
    dryGain = ctx.createGain(); wetGain = ctx.createGain(); wetGain.gain.value = 0;
    panner = ctx.createPanner(); panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse'; panner.refDistance = 1.2; panner.rolloffFactor = 0.6;
    musicBus.connect(dryGain); dryGain.connect(master);
    musicBus.connect(panner); panner.connect(wetGain); wetGain.connect(master);

    reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(3.2, 2.4);
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.12;
    musicBus.connect(reverbSend); reverbSend.connect(reverb); reverb.connect(master);

    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    pulse12 = makePulse(0.125); pulse25 = makePulse(0.25); distCurve = makeDist(60);
    freqData = new Uint8Array(analyser.frequencyBinCount); timeData = new Uint8Array(analyser.fftSize);
  }

  /* ---------- voces (instrumentos) ---------- */
  function vca(t, peak, a, dec, sus, rel, dur, dest) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0002), t + a + dec);
    const end = Math.max(t + a + dec, t + dur);
    g.gain.setValueAtTime(Math.max(peak * sus, 0.0002), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
    g.connect(dest || songOut); return { g, end: end + rel + 0.05 };
  }
  function osc(type, f, t, end, dest) {
    const o = ctx.createOscillator();
    if (type === 'p12') o.setPeriodicWave(pulse12); else if (type === 'p25') o.setPeriodicWave(pulse25); else o.type = type;
    o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(end); return o;
  }
  function noise(t, dur, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.connect(dest);
    s.start(t, Math.random() * 1.5, dur + 0.05); return s;
  }
  function filt(type, f, q, dest) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; b.connect(dest); return b; }

  const V = {
    kick(t, v = 1, hard) {
      const { g, end } = vca(t, 0.9 * v, 0.002, hard ? 0.35 : 0.22, 0.001, 0.05, 0.01);
      const o = osc('sine', hard ? 60 : 150, t, end, g);
      o.frequency.setValueAtTime(hard ? 170 : 150, t); o.frequency.exponentialRampToValueAtTime(hard ? 38 : 45, t + (hard ? 0.4 : 0.12));
    },
    snare(t, v = 1, big) {
      const { g, end } = vca(t, 0.45 * v, 0.001, big ? 0.28 : 0.16, 0.001, 0.05, 0.01);
      noise(t, end - t, filt('highpass', 1500, 0.8, g));
      const tg = vca(t, 0.3 * v, 0.001, 0.08, 0.001, 0.03, 0.01); osc('triangle', 190, t, tg.end, tg.g);
      if (big) { const s = ctx.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(reverb); }
    },
    hat(t, v = 1, open) {
      const { g, end } = vca(t, 0.16 * v, 0.001, open ? 0.18 : 0.035, 0.001, 0.02, 0.005);
      noise(t, end - t, filt('highpass', 7500, 0.9, g));
    },
    chipNoise(t, v = 1, long) {
      const { g, end } = vca(t, 0.22 * v, 0.001, long ? 0.12 : 0.03, 0.001, 0.02, 0.005);
      noise(t, end - t, filt('bandpass', long ? 2500 : 6000, 0.6, g));
    },
    tom(t, m, v = 1) {
      const { g, end } = vca(t, 0.55 * v, 0.002, 0.3, 0.001, 0.05, 0.01);
      const o = osc('sine', mtof(m), t, end, g); o.frequency.exponentialRampToValueAtTime(mtof(m) * 0.6, t + 0.3);
    },
    cowbell(t, v = 1) {
      const { g, end } = vca(t, 0.12 * v, 0.001, 0.12, 0.001, 0.04, 0.01);
      const bp = filt('bandpass', 1400, 3, g); osc('square', 562, t, end, bp); osc('square', 845, t, end, bp);
    },
    guiro(t, v = 1, long) {
      const n = long ? 6 : 2, gap = 0.016;
      for (let i = 0; i < n; i++) {
        const { g, end } = vca(t + i * gap, 0.1 * v, 0.002, 0.012, 0.001, 0.005, 0.004);
        noise(t + i * gap, end - t - i * gap, filt('bandpass', 4200, 2, g));
      }
    },
    crackle(t) {
      const { g, end } = vca(t, 0.05 + Math.random() * 0.06, 0.0005, 0.006, 0.001, 0.004, 0.001);
      noise(t, end - t, filt('highpass', 2500, 0.5, g));
    },
    bass(t, m, dur, v = 1, kind = 'saw') {
      const type = kind === 'tri' ? 'triangle' : kind === 'sine' ? 'sine' : kind === 'sq' ? 'square' : 'sawtooth';
      const { g, end } = vca(t, 0.42 * v, 0.004, 0.12, kind === 'sine' ? 0.8 : 0.5, 0.06, dur);
      const lp = filt('lowpass', kind === 'tri' || kind === 'sine' ? 4000 : 900, kind === 'acid' ? 9 : 1.2, g);
      if (kind === 'acid' || kind === 'saw') { lp.frequency.setValueAtTime(kind === 'acid' ? 2400 : 1400, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.18); }
      osc(type, mtof(m), t, end, lp);
    },
    lead(t, m, dur, v = 1, kind = 'saw') {
      const type = { saw: 'sawtooth', sq: 'square', p25: 'p25', p12: 'p12', tri: 'triangle', sine: 'sine' }[kind] || 'sawtooth';
      const chip = kind === 'p25' || kind === 'p12';
      const { g, end } = vca(t, (chip ? 0.13 : 0.16) * v, chip ? 0.002 : 0.01, 0.15, 0.6, chip ? 0.03 : 0.12, dur);
      const lp = filt('lowpass', chip ? 9000 : 3800, 1, g);
      const o1 = osc(type, mtof(m), t, end, lp);
      if (!chip) { const o2 = osc(type, mtof(m), t, end, lp); o2.detune.value = 9; o1.detune.value = -7; }
      if (dur > 0.25) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(18, t + dur); l.connect(lg); lg.connect(o1.detune); l.start(t); l.stop(end); }
    },
    guitar(t, ms, dur, v = 1) { // power chord distorsionado
      const { g, end } = vca(t, 0.07 * v, 0.003, 0.1, 0.7, 0.05, dur);
      const lp = filt('lowpass', 3200, 0.8, g); const ws = ctx.createWaveShaper(); ws.curve = distCurve; ws.connect(lp);
      const pre = ctx.createGain(); pre.gain.value = 2.5; pre.connect(ws);
      ms.forEach((m, i) => { const o = osc('sawtooth', mtof(m), t, end, pre); o.detune.value = i * 4 - 4; });
    },
    pad(t, ms, dur, v = 1) {
      const { g, end } = vca(t, 0.05 * v, Math.min(0.5, dur * 0.4), 0.3, 0.8, 0.6, dur);
      const lp = filt('lowpass', 1600, 0.6, g);
      ms.forEach(m => { osc('sawtooth', mtof(m), t, end, lp).detune.value = -8; osc('sawtooth', mtof(m), t, end, lp).detune.value = 8; });
    },
    ep(t, ms, dur, v = 1) { // piano eléctrico FM
      ms.forEach((m, i) => {
        const tt = t + i * 0.012;
        const { g, end } = vca(tt, 0.075 * v, 0.005, 0.6, 0.35, 0.5, dur);
        const car = osc('sine', mtof(m), tt, end, g);
        const mod = ctx.createOscillator(), mg = ctx.createGain(); mod.frequency.value = mtof(m) * 1;
        mg.gain.setValueAtTime(mtof(m) * 1.6, tt); mg.gain.exponentialRampToValueAtTime(mtof(m) * 0.1, tt + 0.5);
        mod.connect(mg); mg.connect(car.frequency); mod.start(tt); mod.stop(end);
      });
    },
    pluck(t, m, v = 1, bright) {
      const { g, end } = vca(t, 0.14 * v, 0.002, bright ? 0.18 : 0.3, 0.001, 0.08, 0.01);
      const lp = filt('lowpass', bright ? 5000 : 2800, 2, g); lp.frequency.setValueAtTime(bright ? 6000 : 3500, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
      osc('sawtooth', mtof(m), t, end, lp); osc('square', mtof(m + 12), t, end, lp).detune.value = 5;
    },
    strings(t, m, dur, v = 1) {
      const { g, end } = vca(t, 0.06 * v, 0.004, 0.08, 0.5, 0.05, dur);
      osc('sawtooth', mtof(m), t, end, filt('lowpass', 2600, 1, g));
    },
    brass(t, m, dur, v = 1) {
      const { g, end } = vca(t, 0.14 * v, 0.04, 0.2, 0.7, 0.12, dur);
      const lp = filt('lowpass', 600, 1.5, g); lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2800, t + 0.08);
      osc('sawtooth', mtof(m), t, end, lp); osc('sawtooth', mtof(m - 12), t, end, lp).detune.value = 6;
    },
    flute(t, m, dur, v = 1) { // quena
      const { g, end } = vca(t, 0.16 * v, 0.05, 0.1, 0.8, 0.15, dur);
      const o = osc('sine', mtof(m), t, end, g); osc('triangle', mtof(m), t, end, g).detune.value = 3;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(22, t + Math.max(0.2, dur)); l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(end);
      const bg = vca(t, 0.03 * v, 0.02, 0.1, 0.3, 0.1, dur); noise(t, bg.end - t, filt('bandpass', mtof(m) * 2, 3, bg.g));
    },
    crash(t, v = 1) {
      const { g, end } = vca(t, 0.11 * v, 0.001, 1.2, 0.001, 0.2, 0.01);
      noise(t, end - t, filt('highpass', 5000, 0.5, g));
    }
  };

  /* ---------- composición ---------- */
  function compose(track) {
    if (cache.has(track.id)) return cache.get(track.id);
    const r = rng(track.id + track.title + track.style);
    const scale = SCALES[track.mode] || SCALES.minor;
    const melScale = MEL_SCALES[track.mode] || scale;
    const progs = PROGS[track.mode] || PROGS.minor;
    const progA = progs[Math.floor(r() * progs.length)], progB = progs[Math.floor(r() * progs.length)];
    const root = track.root, stepDur = 60 / track.bpm / 4, bars = track.bars;

    // secciones en bloques de 8 compases
    const order = ['A', 'B', 'A', 'break', 'B', 'B', 'A', 'B'];
    const sections = [];
    const blocks = Math.max(3, Math.round(bars / 8));
    for (let b = 0; b < blocks; b++) {
      const name = b === 0 ? 'intro' : b === blocks - 1 ? 'outro' : order[(b - 1) % order.length];
      for (let i = 0; i < 8; i++) sections.push({ name, barIn: i });
    }
    const totalSteps = sections.length * 16;

    const degToMidi = (d, sc) => { const n = sc.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return root + sc[i] + 12 * o; };
    const chordOf = (deg, seventh) => { const c = [degToMidi(deg, scale), degToMidi(deg + 2, scale), degToMidi(deg + 4, scale)]; if (seventh) c.push(degToMidi(deg + 6, scale)); return c; };

    // candidatas para melodía (registro medio-alto)
    const cands = []; for (let d = 0; d < melScale.length * 3; d++) { const m = degToMidi(d, melScale) + 12; if (m >= root + 10 && m <= root + 31) cands.push(m); }

    const density = { anime: 0.62, chiptune: 0.66, rpg: 0.6, lofi: 0.32, eurobeat: 0.7, cumbia: 0.5, huayno: 0.58, synthwave: 0.45 }[track.style] || 0.5;
    function motif(prog) {
      const notes = new Array(32).fill(null); let idx = Math.floor(cands.length / 2);
      for (let s = 0; s < 32; s++) {
        const strong = s % 4 === 0, p = strong ? density + 0.25 : (s % 2 === 0 ? density : density * 0.45);
        if (r() < p) {
          idx = Math.max(0, Math.min(cands.length - 1, idx + Math.round((r() - 0.5) * 4)));
          let m = cands[idx];
          if (strong) { // atraer a nota del acorde
            const pcs = chordOf(prog[Math.floor(s / 16) % prog.length]).map(x => ((x % 12) + 12) % 12);
            let best = m, bd = 99; cands.forEach(c => { if (pcs.includes(c % 12) && Math.abs(c - m) < bd) { bd = Math.abs(c - m); best = c; } }); m = best; idx = cands.indexOf(m);
          }
          notes[s] = { m, len: 1 };
        }
      }
      for (let s = 0; s < 32; s++) if (notes[s]) { let l = 1; while (s + l < 32 && !notes[s + l] && l < 6) l++; notes[s].len = l; }
      return notes;
    }
    function phraseSet(prog) {
      const a = motif(prog), b = motif(prog), out = [];
      // 8 compases = A A' A A'' (A' cambia el final, A'' resuelve a tónica)
      const end2 = b.slice(16), tonic = cands.find(c => c % 12 === root % 12 && c >= root + 12) || cands[0];
      const variants = [a, a.slice(0, 16).concat(end2), a, a.slice(0, 24).concat([{ m: tonic, len: 8 }, null, null, null, null, null, null, null])];
      variants.forEach(v => out.push(...v)); return out;
    }
    const melA = phraseSet(progA);
    const melB = phraseSet(progB).map(n => n && { m: n.m + (r() < 0.5 ? 0 : 0), len: n.len });
    // arpegio / contramelodía
    const arpShape = [0, 1, 2, 1, 0, 2, 1, 2].map(x => x);

    const song = {
      track, stepDur, totalSteps, sections, duration: totalSteps * stepDur,
      chordAt(bar) { const sec = sections[bar]; const prog = sec && sec.name === 'B' ? progB : progA; return prog[bar % prog.length]; },
      chord(bar, seventh) { return chordOf(this.chordAt(bar), seventh); },
      melAt(step) { const bar = Math.floor(step / 16), sec = sections[bar]; if (!sec) return null; const i = (sec.barIn * 16 + (step % 16)) % 128; return sec.name === 'B' ? melB[i] : melA[i]; },
      arpShape, root
    };
    cache.set(track.id, song); return song;
  }

  /* ---------- reproducción por paso ---------- */
  function playStep(song, step, t) {
    const st = song.track.style, bar = Math.floor(step / 16), s = step % 16, sec = song.sections[bar];
    if (!sec) return;
    const name = sec.name, intro = name === 'intro', outro = name === 'outro', brk = name === 'break', B = name === 'B';
    const last2 = bar >= song.sections.length - 2;
    const sd = song.stepDur, ch = song.chord(bar), bassRoot = ch[0] - 24;
    const fill = sec.barIn === 7 && s >= 12 && !outro;
    const mel = song.melAt(step);
    const drums = !intro && !brk && !last2;
    const half = sec.barIn < 4;
    if (sec.barIn === 0 && s === 0 && (B || name === 'A') ) V.crash(t, 0.8);

    switch (st) {
      case 'anime': {
        if (drums || (intro && !half)) {
          if (s === 0 || s === 8 || (B && s === 10) || s === 3 && !intro) V.kick(t);
          if (s === 4 || s === 12) V.snare(t, 1, B);
          if (s % 2 === 0) V.hat(t, s % 4 === 2 ? 1 : 0.6, B && s === 14);
          if (fill) V.snare(t, 0.5 + (s - 12) * 0.15);
        }
        if (!intro || !half) { if (s % 2 === 0 && !brk) V.bass(t, bassRoot + (s === 14 ? 12 : 0), sd * 1.8, 0.9, 'saw'); }
        if ((B || (name === 'A' && sec.barIn >= 4)) && s % 2 === 0 && !last2) V.guitar(t, [ch[0] - 12, ch[0] - 5], sd * 1.6, s % 4 === 0 ? 1 : 0.7);
        if (brk && s === 0) V.pad(t, ch, sd * 16, 1.2);
        if (intro && s % 4 === 0) V.pluck(t, ch[(s / 4) % 3] + 12, 0.8, true);
        if (mel && !intro && !brk) V.lead(t, mel.m, mel.len * sd * 0.95, B ? 1.1 : 0.9, B ? 'saw' : 'sq');
        if (outro && s === 0 && last2) V.pad(t, ch, sd * 16, 1);
        break;
      }
      case 'chiptune': {
        if (drums) {
          if (s === 0 || s === 8 || (B && s === 11)) V.chipNoise(t, 1.1, true);
          if (s === 4 || s === 12) V.chipNoise(t, 0.9, true);
          if (s % 2 === 1) V.chipNoise(t, 0.5);
        }
        if (!(intro && half)) V.bass(t, bassRoot + 12 + (s % 4 === 2 ? 12 : 0), sd * 0.9, 1, 'tri');
        if ((B || brk) && !last2) V.lead(t, ch[s % 3] + 12 + (s % 6 === 5 ? 12 : 0), sd * 0.9, 0.45, 'p12');
        if (mel && !intro && !brk) V.lead(t, mel.m, mel.len * sd * 0.9, 1, 'p25');
        if (intro && !half && s % 2 === 0) V.lead(t, ch[(s / 2) % 3] + 12, sd, 0.5, 'p12');
        if (last2 && s === 0 && bar === song.sections.length - 1) ch.forEach(m => V.lead(t, m + 12, sd * 12, 0.6, 'p25'));
        break;
      }
      case 'rpg': {
        if (drums) {
          if (s === 0 || s === 6 || s === 8 || s === 14) V.kick(t, 0.9);
          if (s === 4 || s === 12) V.snare(t, 0.9, true);
          V.hat(t, s % 4 === 0 ? 0.7 : 0.35);
          if (fill) V.tom(t, 45 + (15 - s) * 2, 0.8);
        }
        if (s === 0 && (intro || sec.barIn % 4 === 0)) V.tom(t, 38, 1);
        if (!brk && !(intro && half)) V.strings(t, ch[song.arpShape[s % 8]] + (s >= 8 ? 12 : 0), sd * 0.9, 0.9);
        if (s % 2 === 0 && !brk && !intro) V.bass(t, bassRoot + 12, sd * 1.6, 0.8, 'saw');
        if (mel && !intro) V.brass(t, mel.m, mel.len * sd, brk ? 0.6 : 1);
        if (brk && s === 0) V.pad(t, ch, sd * 16, 1.3);
        if (last2 && s === 0) V.pad(t, ch, sd * 16, 1);
        break;
      }
      case 'lofi': {
        const sw = s % 2 === 1 ? sd * 0.22 : 0, tt = t + sw;
        if (Math.random() < 0.35) V.crackle(t + Math.random() * sd);
        if (drums || (intro && !half)) {
          if (s === 0 || s === 7 || s === 10) V.kick(tt, 0.75);
          if (s === 4 || s === 12) V.snare(tt, 0.55);
          if (s % 2 === 0) V.hat(tt, s % 4 === 0 ? 0.55 : 0.35);
        }
        const ch7 = song.chord(bar, true);
        if (s === 0) V.ep(tt, ch7, sd * 14, 1);
        if (s === 14 && sec.barIn % 2 === 1) V.ep(tt, song.chord(bar + 1, true).map(m => m + 0), sd * 2, 0.6);
        if (!intro && (s === 0 || s === 10)) V.bass(tt, bassRoot + 12, sd * (s === 0 ? 8 : 5), 1, 'sine');
        if (mel && (B || sec.barIn >= 4) && !intro && !brk) V.lead(tt, mel.m, mel.len * sd, 0.7, 'tri');
        break;
      }
      case 'eurobeat': {
        if (drums) {
          if (s % 4 === 0) V.kick(t);
          if (s === 4 || s === 12) V.snare(t, 0.9);
          if (s % 4 === 2) V.hat(t, 1, true); else V.hat(t, 0.4);
          if (fill) V.snare(t, 0.6);
        }
        if (!(intro && half) && !brk) V.bass(t, bassRoot + (s % 2 === 1 ? 24 : 12), sd * 0.8, 0.9, 'saw');
        if (B && s % 4 === 2) ch.forEach(m => V.lead(t, m + 12, sd * 1.2, 0.35, 'saw'));
        if (mel && !intro) V.lead(t, mel.m, mel.len * sd * 0.9, brk ? 0.7 : 1, 'saw');
        if (brk && s === 0) V.pad(t, ch, sd * 16, 1.2);
        break;
      }
      case 'cumbia': {
        if (drums || (intro && !half)) {
          V.guiro(t, s % 4 === 0 ? 1 : 0.7, s % 4 === 0);
          if (s === 0 || s === 8) V.kick(t, 0.8);
          if (s % 4 === 2) V.cowbell(t, 1);
          if (s === 4 || s === 12) V.tom(t, 52, 0.45);
          if (s === 7 || s === 15) V.tom(t, 57, 0.35);
        }
        if (!intro || !half) {
          if (s === 0 || s === 8) V.bass(t, bassRoot + 12, sd * 4, 1, 'sine');
          if (s === 6 || s === 14) V.bass(t, bassRoot + 19, sd * 2, 0.9, 'sine');
        }
        if (s % 4 === 2 && !last2) ch.forEach(m => V.pluck(t, m, 0.45));
        if (mel && !intro) { V.pluck(t, mel.m, 1.1, true); V.pluck(t + sd * 3, mel.m, 0.35, true); }
        break;
      }
      case 'huayno': {
        const pat = [1, 0, 0, 1, 0, 0, 1, 0]; // largo-corto-corto
        if (drums || (intro && !half)) {
          if (s % 8 === 0) V.kick(t, 0.9);
          if (s % 8 === 3 || s % 8 === 6) V.tom(t, 50, 0.5);
          if (s % 2 === 0) V.hat(t, 0.3);
        }
        if (pat[s % 8] && !last2) ch.forEach((m, i) => V.pluck(t + i * 0.011, m + 12, 0.32, true)); // charango
        if (!intro && (s % 8 === 0 || s % 8 === 3)) V.bass(t, bassRoot + 12 + (s % 8 === 3 ? 7 : 0), sd * 2.5, 0.9, 'tri');
        if (mel && !(intro && half)) V.flute(t, mel.m, mel.len * sd, brk ? 0.7 : 1);
        if (brk && s === 0) V.pad(t, ch, sd * 16, 0.8);
        break;
      }
      case 'synthwave': {
        if (drums) {
          if (s === 0 || s === 8 || s === 10) V.kick(t);
          if (s === 4 || s === 12) V.snare(t, 1, true);
          if (s % 2 === 0) V.hat(t, 0.45);
        }
        if (!(intro && half) && !last2) V.bass(t, bassRoot + 12 + (s % 4 === 3 ? 12 : 0), sd * 0.85, 0.85, 'saw');
        if (s === 0) V.pad(t, ch, sd * 16, intro ? 1.4 : 1);
        if ((B || brk) && s % 2 === 0) V.pluck(t, ch[song.arpShape[(s / 2) % 8]] + 12, 0.45, true);
        if (mel && (B || brk || sec.barIn >= 4) && !intro) V.lead(t, mel.m, mel.len * sd, 0.85, 'saw');
        break;
      }
    }
  }

  function tick() {
    if (!seq) return;
    const ahead = document.hidden ? 1.4 : 0.14;
    while (seq.nextTime < ctx.currentTime + ahead) {
      if (seq.step >= seq.song.totalSteps) { const cb = onEnded; stopSong(); setTimeout(cb, 400); return; }
      try { playStep(seq.song, seq.step, seq.nextTime); } catch (e) { console.warn(e); }
      seq.nextTime += seq.song.stepDur; seq.step++;
    }
  }

  function stopSong() {
    if (seq) { clearInterval(seq.timer); seq = null; }
    if (songOut) { const g = songOut; try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); } catch (e) {} setTimeout(() => g.disconnect(), 600); songOut = null; }
  }

  function playSong(track, offset = 0) {
    init(); stopMedia(); stopSong();
    const song = compose(track);
    songOut = ctx.createGain(); songOut.gain.value = 1; songOut.connect(musicBus);
    const step = Math.max(0, Math.floor(offset / song.stepDur));
    const t0 = ctx.currentTime + 0.06;
    seq = { song, step, nextTime: t0, startCtx: t0 - step * song.stepDur, timer: setInterval(tick, 25) };
    tick();
    return song;
  }

  /* ---------- MP3 locales ---------- */
  function ensureMedia() {
    if (!audioEl) {
      audioEl = new Audio(); audioEl.crossOrigin = 'anonymous'; audioEl.preload = 'auto';
      audioEl.addEventListener('ended', () => onEnded());
    }
    if (!mediaSrc) { mediaSrc = ctx.createMediaElementSource(audioEl); mediaSrc.connect(musicBus); }
  }
  function playFile(url, offset = 0) {
    init(); stopSong(); ensureMedia();
    if (audioEl.src !== url) audioEl.src = url;
    audioEl.currentTime = offset || 0;
    return audioEl.play();
  }
  function stopMedia() { if (audioEl) audioEl.pause(); }

  /* ---------- efectos de sonido ---------- */
  const SFX = {
    click() { init(); const t = ctx.currentTime; const { g, end } = vca(t, 0.25, 0.001, 0.04, 0.001, 0.02, 0.001, sfxBus); osc('sine', 1350, t, end, g).frequency.exponentialRampToValueAtTime(700, t + 0.04); },
    tap() { init(); const t = ctx.currentTime; const { g, end } = vca(t, 0.12, 0.001, 0.03, 0.001, 0.01, 0.001, sfxBus); osc('triangle', 900, t, end, g); },
    whoosh() { init(); const t = ctx.currentTime; const { g, end } = vca(t, 0.35, 0.15, 0.35, 0.001, 0.1, 0.2, sfxBus); const bp = filt('bandpass', 300, 1.5, g); bp.frequency.exponentialRampToValueAtTime(5000, t + 0.45); noise(t, end - t, bp); },
    like() { init(); const t = ctx.currentTime; [76, 83, 88].forEach((m, i) => { const { g, end } = vca(t + i * 0.07, 0.15, 0.002, 0.25, 0.001, 0.1, 0.01, sfxBus); osc('sine', mtof(m), t + i * 0.07, end, g); }); },
    magic() { init(); const t = ctx.currentTime; [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => { const { g, end } = vca(t + i * 0.05, 0.08, 0.002, 0.4, 0.001, 0.2, 0.01, sfxBus); osc('triangle', mtof(m), t + i * 0.05, end, g); }); },
    bray() { // ¡rebuzno! hii-joo
      init(); const t0 = ctx.currentTime + 0.02;
      const ws = ctx.createWaveShaper(); ws.curve = makeDist(20);
      const f1 = filt('bandpass', 900, 2.5, sfxBus), f2 = filt('bandpass', 1500, 3, sfxBus); ws.connect(f1); ws.connect(f2);
      for (let i = 0; i < 3; i++) {
        const t = t0 + i * 0.62;
        const hee = vca(t, 0.5, 0.03, 0.12, 0.8, 0.06, 0.2, ws), o1 = osc('sawtooth', 620, t, hee.end, hee.g);
        o1.frequency.linearRampToValueAtTime(880, t + 0.2);
        const haw = vca(t + 0.26, 0.6, 0.02, 0.1, 0.85, 0.12, 0.26, ws), o2 = osc('sawtooth', 330, t + 0.26, haw.end, haw.g);
        o2.frequency.linearRampToValueAtTime(210, t + 0.56);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 28; lg.gain.value = 40; lfo.connect(lg); lg.connect(o2.frequency); lfo.start(t + 0.26); lfo.stop(haw.end);
      }
    }
  };

  /* ---------- API pública ---------- */
  return {
    init, compose, playSong, stopSong, playFile, stopMedia, SFX, rng,
    get ctx() { return ctx; },
    set onEnded(fn) { onEnded = fn; },
    isSynthPlaying: () => !!seq,
    songPos() {
      if (seq) { const tm = Math.max(0, ctx.currentTime - seq.startCtx); const step = Math.floor(tm / seq.song.stepDur); return { time: Math.min(tm, seq.song.duration), dur: seq.song.duration, bar: Math.floor(step / 16), step }; }
      if (audioEl && audioEl.src) return { time: audioEl.currentTime || 0, dur: audioEl.duration || 0, bar: -1, step: -1 };
      return { time: 0, dur: 0, bar: -1, step: -1 };
    },
    mediaEl: () => audioEl,
    setVolume(v) { volume = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    duck(on) { if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.22 : 1, ctx.currentTime, 0.15); },
    setSpatial(on) { init(); spatialOn = on; const t = ctx.currentTime; wetGain.gain.setTargetAtTime(on ? 1.25 : 0, t, 0.25); dryGain.gain.setTargetAtTime(on ? 0 : 1, t, 0.25); },
    setReverb(on) { init(); reverbSend.gain.setTargetAtTime(on ? 0.75 : 0.12, ctx.currentTime, 0.2); },
    setBass(on) { init(); shelf.gain.setTargetAtTime(on ? 9 : 0, ctx.currentTime, 0.1); },
    get spatialOn() { return spatialOn; },
    spatialPos,
    update(dt) {
      if (!ctx || !spatialOn) return;
      spatialT += dt * 0.9;
      spatialPos.x = Math.sin(spatialT) * 2.2; spatialPos.z = -Math.cos(spatialT) * 2.2; spatialPos.y = Math.sin(spatialT * 0.6) * 0.6;
      if (panner.positionX) { panner.positionX.value = spatialPos.x; panner.positionY.value = spatialPos.y; panner.positionZ.value = spatialPos.z; }
      else panner.setPosition(spatialPos.x, spatialPos.y, spatialPos.z);
    },
    levels() {
      if (!analyser) return null;
      analyser.getByteFrequencyData(freqData);
      const avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += freqData[i]; return s / (b - a) / 255; };
      return { bass: avg(1, 8), mid: avg(10, 70), high: avg(90, 220), freq: freqData };
    }
  };
})();
