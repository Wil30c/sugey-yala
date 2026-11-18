/* ============================================================
   SugeySpotify · Utilidades de interfaz: portadas, títulos 3D, toasts
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { if (!isFinite(s) || s < 0) s = 0; const m = Math.floor(s / 60), x = Math.floor(s % 60); return m + ':' + String(x).padStart(2, '0'); };
const store = {
  get(k, d) { try { const v = localStorage.getItem('unify.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('unify.' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- título 3D letra por letra ---------- */
function split3d(text, delay = 0) {
  let i = 0;
  return text.split(' ').map(w => `<span class="wd">${[...w].map(c => `<span class="ch" style="--i:${i++};--d:${delay}ms">${esc(c)}</span>`).join('')}</span>`).join(' ');
}

/* ---------- portadas generativas ---------- */
let coverSeq = 0;
const BONE = '#F3EDE4', INK = '#14080B';
const GLYPHS = {
  titan: () => {
    let s = `<circle cx="100" cy="92" r="46" fill="${BONE}" opacity=".9"/><circle cx="100" cy="92" r="20" fill="${INK}"/><circle cx="108" cy="84" r="6" fill="${BONE}"/>`;
    for (let r = 0; r < 4; r++) for (let c = -1; c < 6; c++) s += `<rect x="${c * 40 + (r % 2 ? 20 : 0) + 2}" y="${124 + r * 20}" width="36" height="16" rx="2" fill="${INK}" opacity="${0.55 + r * 0.1}"/>`;
    return s;
  },
  pixel: () => {
    const map = ['..#....#..', '.##....##.', '.##....##.', '.########.', '##########', '#.##..##.#', '##########', '.###==###.', '.##====##.', '..######..'];
    let s = ''; map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') s += `<rect x="${30 + x * 14}" y="${28 + y * 14}" width="14" height="14" fill="${ch === '=' ? BONE : INK}" opacity="${ch === '=' ? 0.95 : 0.85}"/>`; }));
    return s;
  },
  sword: () => `<g transform="rotate(-40 100 100)"><rect x="92" y="18" width="16" height="118" fill="${BONE}"/><polygon points="92,18 100,4 108,18" fill="${BONE}"/><rect x="64" y="134" width="72" height="12" rx="3" fill="${INK}"/><rect x="94" y="146" width="12" height="34" fill="${INK}"/><circle cx="100" cy="186" r="8" fill="${INK}"/></g>`,
  moon: () => `<circle cx="118" cy="78" r="44" fill="${BONE}" opacity=".92"/><circle cx="138" cy="64" r="40" fill="${INK}" opacity=".85"/><g fill="${BONE}"><circle cx="42" cy="40" r="2.5"/><circle cx="64" cy="70" r="1.8"/><circle cx="160" cy="140" r="2"/><circle cx="30" cy="110" r="1.6"/></g><rect x="22" y="150" width="156" height="34" rx="4" fill="${INK}" opacity=".6"/><g fill="#E7B84A" opacity=".9"><rect x="34" y="160" width="10" height="14"/><rect x="54" y="160" width="10" height="14"/><rect x="74" y="160" width="10" height="14" opacity=".4"/><rect x="94" y="160" width="10" height="14"/><rect x="114" y="160" width="10" height="14" opacity=".4"/><rect x="134" y="160" width="10" height="14"/><rect x="154" y="160" width="10" height="14"/></g>`,
  bolt: () => `<polygon points="112,14 48,112 94,112 78,186 152,80 104,80 128,14" fill="${BONE}"/><polygon points="112,14 48,112 94,112 78,186 152,80 104,80 128,14" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round" transform="translate(8 8)" opacity=".5"/>`,
  star: () => { const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 30 : 74, a = -Math.PI / 2 + i * Math.PI / 5; pts.push((100 + r * Math.cos(a)).toFixed(1) + ',' + (104 + r * Math.sin(a)).toFixed(1)); } return `<polygon points="${pts.join(' ')}" fill="${BONE}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><circle cx="100" cy="104" r="14" fill="${INK}"/>`; },
  mountain: () => `<circle cx="146" cy="54" r="22" fill="#E7B84A"/><polygon points="0,200 70,70 140,200" fill="${INK}" opacity=".85"/><polygon points="60,200 130,96 200,200" fill="${INK}" opacity=".6"/><polygon points="70,70 52,104 64,98 74,108 86,98" fill="${BONE}"/><polygon points="130,96 116,120 128,114 136,124 146,118" fill="${BONE}"/>`,
  sun: () => { let s = `<defs><clipPath id="sc${coverSeq}"><circle cx="100" cy="96" r="60"/></clipPath></defs><g clip-path="url(#sc${coverSeq})"><rect x="30" y="30" width="140" height="140" fill="#E7B84A"/>`; for (let i = 0; i < 6; i++) s += `<rect x="30" y="${104 + i * 11}" width="140" height="${3 + i}" fill="${INK}" opacity=".85"/>`; s += '</g>'; for (let i = 0; i < 7; i++) s += `<line x1="${100 + (i - 3) * 14}" y1="150" x2="${100 + (i - 3) * 60}" y2="200" stroke="${BONE}" stroke-width="1.4" opacity=".55"/>`; for (let i = 0; i < 4; i++) s += `<line x1="0" y1="${158 + i * i * 4}" x2="200" y2="${158 + i * i * 4}" stroke="${BONE}" stroke-width="1.2" opacity=".5"/>`; return s; },
  spiral: () => { let d = 'M100 100'; for (let a = 0; a < Math.PI * 7; a += 0.2) { const r = 3 + a * 3.6; d += ` L${(100 + r * Math.cos(a)).toFixed(1)} ${(100 + r * Math.sin(a)).toFixed(1)}`; } return `<path d="${d}" fill="none" stroke="${BONE}" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".5"/>`; },
  gem: () => `<polygon points="100,24 158,78 100,176 42,78" fill="${BONE}" opacity=".95"/><polygon points="100,24 124,78 100,176 76,78" fill="${INK}" opacity=".18"/><polyline points="42,78 158,78" stroke="${INK}" stroke-width="4" opacity=".4"/><polygon points="100,24 124,78 76,78" fill="#fff" opacity=".35"/>`,
  burro: () => `<use href="#i-burro" x="34" y="26" width="132" height="132" color="${BONE}"/>`,
  heart: () => `<use href="#i-heart-f" x="44" y="40" width="112" height="112" color="${BONE}"/>`,
  spark: () => `<use href="#i-spark" x="44" y="40" width="112" height="112" color="${BONE}"/>`,
  upload: () => `<use href="#i-upload" x="54" y="46" width="92" height="92" color="${BONE}"/>`
};

function coverSVG(palette, glyph, label) {
  coverSeq++;
  const [a, b] = palette || ['#A3172F', '#E7B84A'], id = 'cg' + coverSeq;
  const art = (GLYPHS[glyph] || GLYPHS.burro)();
  const txt = label ? `<text x="14" y="188" font-family="Unbounded, sans-serif" font-weight="800" font-size="${label.length > 16 ? 11 : 14}" fill="${BONE}" letter-spacing="-.3">${esc(label)}</text>` : '';
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label || 'Portada')}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="200" height="200" fill="url(#${id})"/>${art}${txt}</svg>`;
}
function ytThumb(t, hq) { return `<img src="https://i.ytimg.com/vi/${t.yt}/${hq ? 'hqdefault' : 'mqdefault'}.jpg" alt="" loading="lazy">`; }

function trackCover(t, opts = {}) {
  if (t.kind === 'yt') return ytThumb(t, opts.hq);
  if (t.kind === 'file') return coverSVG(['#3B2A4F', '#A3172F'], 'upload', opts.label ? t.title : '');
  return coverSVG(t.palette, t.glyph, opts.label ? t.title : '');
}

/* ---------- toasts ---------- */
function toast(msg, ms = 2600) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
}

/* ---------- inclinación 3D de portadas y títulos ---------- */
function bindTilt() {
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest('.tilt');
    $$('.tilt.tilting').forEach(t => { if (t !== el) { t.classList.remove('tilting'); t.style.transform = ''; } });
    if (!el) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.classList.add('tilting');
    el.style.transform = `perspective(700px) rotateX(${(0.5 - y) * 16}deg) rotateY(${(x - 0.5) * 18}deg) scale(1.03)`;
    el.style.setProperty('--gx', x * 100 + '%'); el.style.setProperty('--gy', y * 100 + '%');
  }, { passive: true });
  const main = $('#main');
  main.addEventListener('pointermove', e => {
    const rx = ((e.clientY / innerHeight) - 0.5) * -10, ry = ((e.clientX / innerWidth) - 0.5) * 14;
    $$('.t3d', main).forEach(t => { t.style.setProperty('--rx', rx + 'deg'); t.style.setProperty('--ry', ry + 'deg'); });
  }, { passive: true });
}
