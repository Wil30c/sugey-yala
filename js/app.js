/* ============================================================
   SugeySpotify · Núcleo: estado, reproductor, YouTube, DJ, navegación
   ============================================================ */

/* ---------- preparar canciones ---------- */
ORIGINALS.forEach(t => { t.kind = 'synth'; t.artist = ARTIST.name; t.album = ALBUM_MAIN; t.dur = UniAudio.compose(t).duration; });
YT_HITS.forEach(t => { t.kind = 'yt'; t.album = t.from; t.dur = 0; });
function prepCreation(t) { t.kind = 'synth'; t.artist = ARTIST.name + ' con IA'; t.album = 'Tus creaciones IA'; t.dur = UniAudio.compose(t).duration; return t; }

const state = {
  queue: [], qi: -1, current: null, playing: false, listKey: null,
  shuffle: false, repeat: false, pausedAt: 0,
  liked: new Set(store.get('liked', [])), following: store.get('following', false),
  creations: store.get('creations', []).map(prepCreation), files: [], searchList: [],
  view: 'home', back: [], fwd: [], panelTab: 'lyrics', panelOpen: false,
  djOn: true, firstDJ: true, suppressDJ: false, vol: store.get('vol', 0.8), muted: false,
  yt: null, ytReady: false, stage: false, fx: { sp3d: false, echo: false, bass: false },
  chat: [{ who: 'bot', text: 'Hola, soy DJ Yala. Pídeme algo para estudiar, un opening de anime, o escribe "crea una canción sobre…".' }],
  draft: ''
};
const allTracks = () => [...ORIGINALS, ...YT_HITS, ...state.creations, ...state.files];
const byId = id => allTracks().find(t => t.id === id);
const isCurrent = t => state.current && state.current.id === t.id;

function hitsCollage() {
  const ids = [0, 2, 4, 8].map(i => YT_HITS[i].yt);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${ids.map((id, i) => `<image href="https://i.ytimg.com/vi/${id}/mqdefault.jpg" x="${(i % 2) * 100}" y="${Math.floor(i / 2) * 100}" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>`).join('')}</svg>`;
}

function getList(key) {
  if (key === 'album') return { kind: 'Álbum', name: ALBUM_MAIN, gold: true, owner: ARTIST.name, desc: 'El primer álbum de Sugey Yala: openings, batallas RPG, cumbias y huaynos para sobrevivir al ciclo. Cada canción se toca en vivo dentro de tu navegador.', tracks: ORIGINALS, cover: () => coverSVG(['#A3172F', '#5C0B18'], 'burro', 'UNI LLENO DE BURROS'), tint: 'rgba(163,23,47,.65)' };
  if (key === 'hits') return { kind: 'Playlist', name: 'Éxitos anime y gamer', owner: 'SugeySpotify', desc: 'Openings de anime y temas de videojuegos desde sus videos oficiales de YouTube.', tracks: YT_HITS, cover: hitsCollage, tint: 'rgba(231,184,74,.35)' };
  if (key === 'liked') return { kind: 'Playlist', name: 'Tus me gusta', owner: 'Tú', desc: 'Todo lo que marcaste con el corazón.', tracks: allTracks().filter(t => state.liked.has(t.id)), cover: () => coverSVG(['#5C0B18', '#E7B84A'], 'heart'), tint: 'rgba(231,184,74,.3)' };
  if (key === 'creations') return { kind: 'Playlist', name: 'Tus creaciones IA', owner: 'Tú y la IA', desc: 'Canciones compuestas por la IA a partir de tus ideas.', tracks: state.creations, cover: () => coverSVG(['#3A1B6E', '#A3172F'], 'spark'), tint: 'rgba(58,27,110,.6)' };
  if (key === 'files') return { kind: 'Playlist', name: 'Tus MP3', owner: 'Tú', desc: 'Tus propias canciones. Se quedan en tu computadora y suenan con todos los efectos.', tracks: state.files, cover: () => coverSVG(['#3B2A4F', '#A3172F'], 'upload'), tint: 'rgba(59,42,79,.6)' };
  if (key === 'search') return { kind: 'Búsqueda', name: 'Resultados', owner: 'SugeySpotify', desc: '', tracks: state.searchList, cover: () => coverSVG(['#14080B', '#A3172F'], 'burro'), tint: 'rgba(163,23,47,.4)' };
  if (key && key.startsWith('mix:')) {
    const m = FACULTY_MIXES.find(x => 'mix:' + x.id === key); if (!m) return null;
    return { kind: 'Mezcla', name: m.name, owner: 'SugeySpotify para ti', desc: m.desc, tracks: m.ids.map(byId).filter(Boolean), cover: () => coverSVG(m.palette, m.glyph, m.name), tint: m.palette[0] + 'aa' };
  }
  return null;
}

/* ---------- reproducción ---------- */
function playList(key, idx = 0, opts = {}) {
  const L = getList(key);
  if (!L || !L.tracks.length) { toast('Esta playlist todavía no tiene canciones'); return; }
  state.listKey = key; state.queue = L.tracks.slice(); state.qi = Math.min(idx, state.queue.length - 1);
  startCurrent({ manual: true, ...opts });
}
function stopAll() {
  UniAudio.stopSong(); UniAudio.stopMedia();
  if (state.yt && state.yt.pauseVideo && state.current && state.current.kind === 'yt') { try { state.yt.pauseVideo(); } catch (e) {} }
}
function startCurrent(opts = {}) {
  const t = state.queue[state.qi]; if (!t) return;
  UniAudio.init(); stopAll();
  state.current = t; state.pausedAt = 0;
  $('#ytCard').hidden = t.kind !== 'yt';
  if (t.kind === 'synth') { UniAudio.playSong(t, 0); setPlaying(true); }
  else if (t.kind === 'file') { UniAudio.playFile(t.url).then(() => setPlaying(true)).catch(() => toast('Este archivo no se puede reproducir')); }
  else if (t.kind === 'yt') { setPlaying(false); ytPlay(t); }
  Scene3D.setCover(t.palette || ['#A3172F', '#E7B84A'], t.title);
  renderNow(); markPlaying(); renderPanel(); renderSide();
  maybeDJ(t, opts);
}
function setPlaying(p) {
  state.playing = p;
  Scene3D.setPlaying(p);
  $('#playBtn').innerHTML = `<svg><use href="#i-${p ? 'pause' : 'play'}"/></svg>`;
  $('#playBtn').setAttribute('aria-label', p ? 'Pausar' : 'Reproducir');
  $('#npCover').classList.toggle('spin', p);
  markPlaying();
}
function togglePlay() {
  const t = state.current;
  if (!t) { playList('album', 0); return; }
  UniAudio.init();
  if (t.kind === 'synth') {
    if (state.playing) { state.pausedAt = UniAudio.songPos().time; UniAudio.stopSong(); setPlaying(false); }
    else { UniAudio.playSong(t, state.pausedAt || 0); setPlaying(true); }
  } else if (t.kind === 'file') {
    const a = UniAudio.mediaEl();
    if (state.playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  } else if (t.kind === 'yt' && state.yt && state.yt.getPlayerState) {
    state.playing ? state.yt.pauseVideo() : state.yt.playVideo();
  }
}
function next(auto) {
  if (!state.queue.length) return;
  if (state.shuffle && state.queue.length > 1) { let i; do { i = Math.floor(Math.random() * state.queue.length); } while (i === state.qi); state.qi = i; }
  else state.qi = (state.qi + 1) % state.queue.length;
  startCurrent({ auto });
}
function prev() {
  if (!state.queue.length) return;
  if (getPos().time > 3) { seekTo(0); return; }
  state.qi = (state.qi - 1 + state.queue.length) % state.queue.length;
  startCurrent({});
}
function onEnded() { if (state.repeat) startCurrent({}); else next(true); }
UniAudio.onEnded = onEnded;

function getPos() {
  const t = state.current; if (!t) return { time: 0, dur: 0, bar: -1 };
  if (t.kind === 'synth') {
    if (state.playing) return UniAudio.songPos();
    const sd = UniAudio.compose(t).stepDur; return { time: state.pausedAt, dur: t.dur, bar: Math.floor(state.pausedAt / (sd * 16)) };
  }
  if (t.kind === 'file') return UniAudio.songPos();
  try { return { time: state.yt.getCurrentTime() || 0, dur: state.yt.getDuration() || 0, bar: -1 }; } catch (e) { return { time: 0, dur: 0, bar: -1 }; }
}
function seekTo(time) {
  const t = state.current; if (!t) return;
  if (t.kind === 'synth') { if (state.playing) UniAudio.playSong(t, time); else state.pausedAt = time; }
  else if (t.kind === 'file') { const a = UniAudio.mediaEl(); if (a) a.currentTime = time; }
  else if (state.yt && state.yt.seekTo) state.yt.seekTo(time, true);
}

/* ---------- YouTube ---------- */
let ytPending = null;
window.onYouTubeIframeAPIReady = () => { state.ytReady = true; if (ytPending) { const t = ytPending; ytPending = null; ytPlay(t); } };
function ytVolume(mult = 1) { if (state.yt && state.yt.setVolume) state.yt.setVolume(Math.round((state.muted ? 0 : state.vol) * 100 * mult)); }
function ytPlay(t) {
  $('#ytLabel').textContent = `${t.title}, ${t.artist}`;
  if (location.protocol === 'file:') toast('Si el video no carga, abre la app con iniciar.bat: YouTube no funciona desde un archivo suelto.', 6000);
  if (!state.ytReady) { ytPending = t; return; }
  if (!state.yt) {
    state.yt = new YT.Player('ytPlayer', {
      width: '100%', height: '100%', videoId: t.yt,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: e => { ytVolume(); e.target.playVideo(); },
        onStateChange: e => {
          if (!state.current || state.current.kind !== 'yt') return;
          if (e.data === 1) { setPlaying(true); const d = state.yt.getDuration(); if (d && !state.current.dur) { state.current.dur = d; } }
          else if (e.data === 2) setPlaying(false);
          else if (e.data === 0) { setPlaying(false); onEnded(); }
        },
        onError: () => { toast('Este video no permite reproducirse aquí. Paso al siguiente.'); setTimeout(() => next(true), 1500); }
      }
    });
  } else { state.yt.loadVideoById(t.yt); ytVolume(); }
}

/* ---------- DJ Yala ---------- */
let manualCount = 0, bubbleTimer = null;
function maybeDJ(t, opts) {
  if (state.suppressDJ) { state.suppressDJ = false; return; }
  if (!state.djOn) return;
  const go = state.firstDJ || opts.auto || (opts.manual && (++manualCount % 3 === 0));
  if (!go) return;
  const text = UniAI.djIntro(t, state.firstDJ); state.firstDJ = false;
  djSay(text);
}
function duck(on) { UniAudio.duck(on); if (state.current && state.current.kind === 'yt') ytVolume(on ? 0.25 : 1); }
function djSay(text) {
  clearTimeout(bubbleTimer);
  $('#djText').textContent = text; $('#djBubble').hidden = false;
  const hide = () => { $('#djBubble').hidden = true; };
  if (state.djOn && UniAI.hasSpeech) UniAI.speak(text, { onstart: () => duck(true), onend: () => { duck(false); bubbleTimer = setTimeout(hide, 600); } });
  else bubbleTimer = setTimeout(hide, 4500);
}

/* ---------- reproductor: UI ---------- */
function renderNow() {
  const t = state.current; if (!t) return;
  $('#npCover').innerHTML = trackCover(t);
  $('#npTitle').textContent = t.title; $('#npArtist').textContent = t.artist + (t.kind === 'yt' ? `, ${t.from}` : '');
  const liked = state.liked.has(t.id);
  $('#likeBtn').classList.toggle('on', liked); $('#likeBtn').innerHTML = `<svg><use href="#i-heart${liked ? '-f' : ''}"/></svg>`;
  $('#stageKicker').textContent = t.kind === 'yt' ? `${t.artist}, ${t.from}` : `${t.artist}, ${GENRE_LABEL[t.style] || 'Tu archivo'}`;
  $('#stageTitle').textContent = t.title; $('#stageLyric').textContent = '';
  document.title = `${t.title} · SugeySpotify`;
}
function markPlaying() {
  $$('.trk[data-tid]').forEach(r => {
    const cur = state.current && r.dataset.tid === state.current.id;
    r.classList.toggle('playing', !!cur); r.classList.toggle('paused', !!cur && !state.playing);
    const n = $('.n', r); if (!n) return;
    const idx = +r.dataset.idx + 1;
    n.innerHTML = `<span>${cur ? '<span class="eq"><i></i><i></i><i></i></span>' : idx}</span><svg><use href="#i-${cur && state.playing ? 'pause' : 'play'}"/></svg>`;
  });
  $$('.pl-actions .btn-play').forEach(b => { b.innerHTML = `<svg><use href="#i-${state.listKey === b.dataset.play && state.playing ? 'pause' : 'play'}"/></svg>`; });
}
function toggleLike(id) {
  const on = !state.liked.has(id);
  on ? state.liked.add(id) : state.liked.delete(id);
  store.set('liked', [...state.liked]);
  if (on) UniAudio.SFX.like();
  toast(on ? 'Agregada a Tus me gusta' : 'Quitada de Tus me gusta', 1600);
  $$(`[data-like="${CSS.escape(id)}"]`).forEach(b => { b.classList.toggle('on', on); b.innerHTML = `<svg><use href="#i-heart${on ? '-f' : ''}"/></svg>`; });
  if (state.current && state.current.id === id) { renderNow(); $('#likeBtn').classList.add('pop'); setTimeout(() => $('#likeBtn').classList.remove('pop'), 400); }
  if (state.view === 'list:liked') render();
  renderSide();
}
function setVol(v) {
  state.vol = Math.max(0, Math.min(1, v)); store.set('vol', state.vol);
  if (state.vol > 0) state.muted = false;
  UniAudio.setVolume(state.muted ? 0 : state.vol); ytVolume();
  $('#volFill').style.width = (state.muted ? 0 : state.vol * 100) + '%';
  $('#muteBtn').innerHTML = `<svg><use href="#i-${state.muted || state.vol === 0 ? 'mute' : 'vol'}"/></svg>`;
}
function toggleFx(name) {
  UniAudio.init();
  const on = !state.fx[name]; state.fx[name] = on;
  if (name === 'sp3d') { UniAudio.setSpatial(on); toast(on ? 'Audio 3D activado. Ponte audífonos.' : 'Audio 3D desactivado'); }
  if (name === 'echo') { UniAudio.setReverb(on); toast(on ? 'Eco del Pabellón activado' : 'Eco desactivado'); }
  if (name === 'bass') { UniAudio.setBass(on); toast(on ? 'Bajos potentes activados' : 'Bajos normales'); }
  if (on && state.current && state.current.kind === 'yt') toast('Los efectos se aplican a Sugey Yala y tus MP3. YouTube no permite procesar su audio.', 4200);
  $('#' + { sp3d: 'sp3dBtn', echo: 'echoBtn', bass: 'bassBtn' }[name]).classList.toggle('on', on);
  return on;
}

/* ---------- panel lateral ---------- */
let lastLyric = -9;
function openPanel(tab) {
  if (state.panelOpen && state.panelTab === tab) { closePanel(); return; }
  state.panelOpen = true; state.panelTab = tab;
  $('#panel').hidden = false; document.body.classList.add('panel-open');
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#lyrBtn').classList.toggle('on', tab === 'lyrics'); $('#queueBtn').classList.toggle('on', tab === 'queue');
  renderPanel();
}
function closePanel() { state.panelOpen = false; $('#panel').hidden = true; document.body.classList.remove('panel-open'); $('#lyrBtn').classList.remove('on'); $('#queueBtn').classList.remove('on'); }
function renderPanel() {
  if (!state.panelOpen) return;
  $('#panelBody').innerHTML = state.panelTab === 'lyrics' ? Views.lyrics() : Views.queue();
  lastLyric = -9;
}
function lyricIndex(t, p) {
  if (!t || t.kind !== 'synth' || !t.lyrics || p.bar < 8) return -1;
  const sec = UniAudio.compose(t).sections[p.bar]; if (!sec || sec.name === 'outro') return -1;
  return Math.floor((p.bar - 8) / 4) % t.lyrics.length;
}

/* ---------- barra lateral ---------- */
function renderSide() {
  const keys = ['album', 'hits', 'liked', 'creations', 'files', ...FACULTY_MIXES.map(m => 'mix:' + m.id)];
  $('#sideLists').innerHTML = keys.map(k => {
    const L = getList(k);
    return `<li><button data-nav="list:${k}" class="${state.view === 'list:' + k ? 'on' : ''} ${state.listKey === k && state.playing ? 'playing' : ''}" title="${esc(L.name)}"><span class="mini">${L.cover()}</span><span class="txt"><span class="nm">${esc(L.name)}</span><span class="sub">${L.kind}, ${L.tracks.length} canciones</span></span></button></li>`;
  }).join('');
}

/* ---------- navegación ---------- */
function go(view, push = true) {
  if (push && view !== state.view) { state.back.push(state.view); state.fwd = []; }
  state.view = view; render();
}
function render() {
  const v = state.view, el = $('#view');
  if (v === 'home') el.innerHTML = Views.home();
  else if (v === 'search') el.innerHTML = Views.search(state.q || '');
  else if (v === 'library') el.innerHTML = Views.library();
  else if (v === 'ai') el.innerHTML = Views.ai();
  else if (v.startsWith('list:')) el.innerHTML = Views.list(v.slice(5));
  $('#main').scrollTop = 0;
  const top = v.startsWith('list:') ? 'library' : v;
  $$('[data-nav]').forEach(b => { if (b.closest('.nav') || b.closest('.mnav')) b.classList.toggle('on', b.dataset.nav === top); });
  renderSide(); afterRender(v);
}
function afterRender(v) {
  if (v === 'home') countUp($('#listeners'), ARTIST.listeners);
  if (v === 'search') { const q = $('#bigQ'); q.focus(); q.addEventListener('input', () => { state.q = q.value; $('#sres').innerHTML = Views.searchResults(q.value); }); }
  if (v === 'ai') { const c = $('#chat'); c.scrollTop = c.scrollHeight; }
  if (v === 'list:files') bindDrop();
}
function countUp(el, to) {
  if (!el) return;
  const t0 = performance.now(), dur = 1700;
  const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * e).toLocaleString('es-PE'); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- archivos MP3 ---------- */
function addFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav|flac|aac)$/i.test(f.name));
  if (!list.length) { toast('Elige archivos de audio, por ejemplo MP3'); return; }
  list.forEach((f, i) => {
    const t = { id: 'f' + Date.now() + i, kind: 'file', title: f.name.replace(/\.[^.]+$/, ''), artist: 'Tu archivo', album: 'Tus MP3', url: URL.createObjectURL(f), dur: 0 };
    const probe = new Audio(); probe.preload = 'metadata'; probe.src = t.url;
    probe.onloadedmetadata = () => { t.dur = probe.duration; if (state.view === 'list:files') render(); };
    state.files.push(t);
  });
  toast(list.length === 1 ? 'Agregaste 1 canción a Tus MP3' : `Agregaste ${list.length} canciones a Tus MP3`);
  if (state.view === 'list:files') render(); else go('list:files');
}
function bindDrop() {
  const d = $('#drop'); if (!d) return;
  ['dragenter', 'dragover'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.remove('over'); }));
  d.addEventListener('drop', e => addFiles(e.dataTransfer.files));
}

/* ---------- IA ---------- */
function composeAI(prompt, style) {
  const t = prepCreation(UniAI.analyze(prompt, style && style !== 'auto' ? style : null));
  state.creations.unshift(t);
  store.set('creations', state.creations.map(({ id, title, style, bpm, mode, root, bars, palette, glyph, lyrics, ai, prompt }) => ({ id, title, style, bpm, mode, root, bars, palette, glyph, lyrics, ai, prompt })));
  state.listKey = 'creations'; state.queue = state.creations.slice(); state.qi = 0;
  state.suppressDJ = true; startCurrent({ manual: true });
  return t;
}
const aiApi = {
  compose: p => composeAI(p),
  next: () => next(),
  pause: () => { if (state.playing) togglePlay(); },
  bray: () => bray(),
  toggleSpatial: () => toggleFx('sp3d'),
  playHit: kind => { const pool = YT_HITS.filter(h => h.kind === kind); const t = pool[Math.floor(Math.random() * pool.length)]; state.suppressDJ = true; playList('hits', YT_HITS.indexOf(t)); return t; },
  playStyle: s => { const pool = ORIGINALS.filter(o => o.style === s); if (!pool.length) return null; const t = pool[Math.floor(Math.random() * pool.length)]; state.suppressDJ = true; playList('album', ORIGINALS.indexOf(t)); return t; }
};
function chatSend(text) {
  text = text.trim(); if (!text) return;
  UniAudio.init();
  state.chat.push({ who: 'me', text }); paintChat(true);
  setTimeout(() => {
    const reply = UniAI.respond(text, aiApi) || '…';
    state.chat.push({ who: 'bot', text: reply }); paintChat(false);
    djSay(reply);
  }, 650);
}
function paintChat(typing) {
  const c = $('#chat'); if (!c) return;
  c.innerHTML = state.chat.map(m => `<div class="msg ${m.who}">${esc(m.text)}</div>`).join('') + (typing ? '<div class="msg bot typing"><i></i><i></i><i></i></div>' : '');
  c.scrollTop = c.scrollHeight;
}
function runCompose(form) {
  const q = form.q.value.trim(), style = form.style ? form.style.value : 'auto';
  if (!q) { toast('Escribe una idea para tu canción'); form.q.focus(); return; }
  state.draft = q;
  UniAudio.init(); UniAudio.SFX.magic();
  const btn = $('.compose-btn', form), steps = $('#steps'), out = $('#composeOut');
  btn.disabled = true; steps.hidden = false; out.innerHTML = '';
  const lis = $$('li', steps); lis.forEach(l => l.className = '');
  lis.forEach((l, i) => setTimeout(() => { if (i) lis[i - 1].className = 'done'; l.className = 'on'; }, i * 420));
  setTimeout(() => {
    lis.forEach(l => l.className = 'done');
    const t = composeAI(q, style);
    btn.disabled = false; state.draft = '';
    out.innerHTML = `<div class="result"><span class="mini">${trackCover(t)}</span><span><b>${esc(t.title)}</b><small>${GENRE_LABEL[t.style]}, ${t.bpm} BPM, ${fmt(t.dur)}. Ya está sonando.</small></span></div>`;
    djSay(`Nueva canción compuesta: ${t.title}. ¡Que suene!`);
  }, lis.length * 420 + 200);
}
function bray() {
  UniAudio.SFX.bray();
  const b = $('#brayBtn'); b.classList.remove('kick'); void b.offsetWidth; b.classList.add('kick');
}

/* ---------- eventos ---------- */
function bindEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-like],[data-play],[data-act],[data-nav],[data-tab]');
    if (!el) return;
    if (el.dataset.like) { e.preventDefault(); toggleLike(el.dataset.like); return; }
    if (el.dataset.play) {
      const key = el.dataset.play, idx = +el.dataset.idx || 0;
      UniAudio.SFX.click();
      const L = getList(key), t = L && L.tracks[idx];
      if (el.dataset.toggle && state.listKey === key && state.current) { togglePlay(); return; }
      if (t && isCurrent(t)) { togglePlay(); return; }
      playList(key, idx); return;
    }
    if (el.dataset.tab) { state.panelOpen = false; openPanel(el.dataset.tab); return; }
    if (el.dataset.act) { act(el.dataset.act, el); return; }
    if (el.dataset.nav) { e.preventDefault(); UniAudio.SFX.tap(); go(el.dataset.nav); }
  });
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === 'Escape' && state.stage) { toggleStage(); return; }
    if (typing) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if ((e.key === 'Enter') && document.activeElement.matches('.trk, .card')) document.activeElement.click();
  });
  document.addEventListener('submit', e => {
    const f = e.target; e.preventDefault();
    if (f.dataset.form === 'chat') { chatSend(f.q.value); f.q.value = ''; }
    if (f.dataset.form === 'compose') runCompose(f);
    if (f.dataset.form === 'quick-compose') { const q = f.q.value.trim(); if (!q) { toast('Escribe una idea para tu canción'); return; } state.draft = q; go('ai'); setTimeout(() => runCompose($('form[data-form="compose"]')), 50); }
  });

  $('#playBtn').onclick = () => { UniAudio.SFX.click(); togglePlay(); };
  $('#nextBtn').onclick = () => next();
  $('#prevBtn').onclick = () => prev();
  $('#shufBtn').onclick = () => { state.shuffle = !state.shuffle; $('#shufBtn').classList.toggle('on', state.shuffle); toast(state.shuffle ? 'Aleatorio activado' : 'Aleatorio desactivado', 1500); };
  $('#repBtn').onclick = () => { state.repeat = !state.repeat; $('#repBtn').classList.toggle('on', state.repeat); toast(state.repeat ? 'Repetir esta canción' : 'Repetir desactivado', 1500); };
  $('#likeBtn').onclick = () => state.current && toggleLike(state.current.id);
  $('#lyrBtn').onclick = () => openPanel('lyrics');
  $('#queueBtn').onclick = () => openPanel('queue');
  $('#panelClose').onclick = closePanel;
  $('#sp3dBtn').onclick = () => toggleFx('sp3d');
  $('#echoBtn').onclick = () => toggleFx('echo');
  $('#bassBtn').onclick = () => toggleFx('bass');
  $('#djBtn').onclick = () => { state.djOn = !state.djOn; UniAI.voiceOn = state.djOn; $('#djBtn').classList.toggle('on', state.djOn); toast(state.djOn ? 'Voz del DJ Yala activada' : 'Voz del DJ Yala desactivada', 1600); };
  $('#muteBtn').onclick = () => { state.muted = !state.muted; setVol(state.vol); if (!state.muted && state.vol === 0) setVol(0.6); };
  $('#brayBtn').onclick = bray;
  $('#stageBtn').onclick = toggleStage;
  $('#stageExit').onclick = toggleStage;
  $('#backBtn').onclick = () => { if (state.back.length) { state.fwd.push(state.view); go(state.back.pop(), false); } };
  $('#fwdBtn').onclick = () => { if (state.fwd.length) { state.back.push(state.view); go(state.fwd.pop(), false); } };
  $('#fileIn').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
  const ts = $('#topSearch');
  ts.addEventListener('focus', () => { if (state.view !== 'search') { state.q = ts.value; go('search'); } });
  ts.addEventListener('input', () => { state.q = ts.value; if (state.view !== 'search') go('search'); else { const b = $('#bigQ'); if (b) b.value = ts.value; $('#sres').innerHTML = Views.searchResults(ts.value); } });

  dragBar($('#seekBar'), $('#seekFill'), f => { const p = getPos(); if (p.dur) seekTo(f * p.dur); }, true);
  dragBar($('#volBar'), $('#volFill'), f => setVol(f));
  $('#seekBar').addEventListener('keydown', e => { const p = getPos(); if (e.key === 'ArrowRight') seekTo(Math.min(p.dur, p.time + 5)); if (e.key === 'ArrowLeft') seekTo(Math.max(0, p.time - 5)); });
  $('#volBar').addEventListener('keydown', e => { if (e.key === 'ArrowRight') setVol(state.vol + 0.05); if (e.key === 'ArrowLeft') setVol(state.vol - 0.05); });
}
let seeking = false;
function dragBar(bar, fill, cb, onRelease) {
  const frac = e => { const r = bar.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
  bar.addEventListener('pointerdown', e => {
    bar.setPointerCapture(e.pointerId); if (onRelease) seeking = true;
    fill.style.width = frac(e) * 100 + '%'; if (!onRelease) cb(frac(e));
    const move = ev => { fill.style.width = frac(ev) * 100 + '%'; if (!onRelease) cb(frac(ev)); };
    const up = ev => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); if (onRelease) { cb(frac(ev)); seeking = false; } };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
  });
}
function act(name, el) {
  if (name === 'follow') { state.following = !state.following; store.set('following', state.following); el.classList.toggle('on', state.following); el.textContent = state.following ? 'Siguiendo' : 'Seguir'; if (state.following) { UniAudio.SFX.like(); toast('Ahora sigues a Sugey Yala'); } }
  if (name === 'dj-start') { state.firstDJ = true; state.shuffle = true; $('#shufBtn').classList.add('on'); playList('album', Math.floor(Math.random() * ORIGINALS.length)); }
  if (name === 'shuffle') { state.shuffle = !state.shuffle; el.classList.toggle('on', state.shuffle); $('#shufBtn').classList.toggle('on', state.shuffle); if (state.shuffle && !state.playing) { const k = state.view.slice(5), L = getList(k); if (L && L.tracks.length) playList(k, Math.floor(Math.random() * L.tracks.length)); } }
  if (name === 'pick-files') $('#fileIn').click();
  if (name === 'chip') { const txt = el.textContent; chatSend(txt); }
  if (name === 'genre') {
    const g = el.dataset.g;
    state.searchList = g === 'anime-yt' ? YT_HITS.filter(h => h.kind === 'anime') : g === 'game-yt' ? YT_HITS.filter(h => h.kind === 'game') : allTracks().filter(t => t.style === g);
    const label = g === 'anime-yt' ? 'Openings de anime' : g === 'game-yt' ? 'Videojuegos' : GENRE_LABEL[g];
    $('#sres').innerHTML = `<div class="sec-h"><div><h2>${esc(label)}</h2><p>${state.searchList.length} canciones</p></div><button class="link" data-act="clear-search">Volver a explorar</button></div>${state.searchList.map((t, i) => Views.row(t, i, 'search')).join('')}`;
  }
  if (name === 'clear-search') { $('#sres').innerHTML = Views.searchResults(''); }
  if (name === 'jump') { const i = state.queue.findIndex(t => t.id === el.dataset.tid); if (i >= 0 && i !== state.qi) { state.qi = i; startCurrent({ manual: true }); } }
}
function toggleStage() {
  state.stage = !state.stage;
  document.body.classList.toggle('on-stage', state.stage);
  $('#stage').hidden = !state.stage;
  Scene3D.setStage(state.stage);
  UniAudio.init(); UniAudio.SFX.whoosh();
  if (state.stage && !state.current) playList('album', 0);
}

/* ---------- bucle de UI ---------- */
const simFreq = new Uint8Array(512);
function simLevels(time) {
  const beat = (time * 2.1) % 1, kick = Math.pow(1 - beat, 3);
  for (let i = 0; i < simFreq.length; i++) simFreq[i] = Math.min(255, kick * 210 * Math.exp(-i / 26) + (Math.sin(time * 3 + i * 0.27) * 0.5 + 0.5) * 110 * Math.exp(-i / 160) + Math.random() * 30);
  return { bass: 0.25 + kick * 0.6, mid: 0.35 + 0.2 * Math.sin(time * 1.3), high: 0.25 + 0.25 * Math.random(), freq: simFreq };
}
let lastNow = performance.now(), lastDurTxt = '';
function loop(now) {
  const dt = (now - lastNow) / 1000; lastNow = now;
  UniAudio.update(dt);
  if (state.current) {
    const p = getPos();
    if (!seeking) $('#seekFill').style.width = (p.dur ? (p.time / p.dur) * 100 : 0) + '%';
    $('#tCur').textContent = fmt(p.time);
    const d = fmt(p.dur); if (d !== lastDurTxt) { $('#tDur').textContent = d; lastDurTxt = d; }
    const li = lyricIndex(state.current, p);
    if (li !== lastLyric) {
      lastLyric = li;
      const box = $('#lyrics');
      if (box) $$('p', box).forEach((el, i) => { el.classList.toggle('on', i === li); el.classList.toggle('past', li >= 0 && i < li); if (i === li) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      $('#stageLyric').textContent = li >= 0 ? state.current.lyrics[li] : '';
    }
  }
  requestAnimationFrame(loop);
}

/* ---------- arranque ---------- */
function boot() {
  const ok = Scene3D.init($('#bg3d'));
  if (!ok) toast('Tu navegador no pudo cargar la escena 3D. La música sigue funcionando.', 5000);
  Scene3D.setLevelSource(() => {
    const t = state.current; if (!state.playing || !t) return null;
    if (t.kind === 'yt') return simLevels(performance.now() / 1000);
    return UniAudio.levels();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Scene3D.redrawText());
  bindTilt(); bindEvents();
  setVol(state.vol);
  render();
  requestAnimationFrame(loop);
}
boot();
