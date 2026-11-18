/* ============================================================
   SugeySpotify · Vistas (HTML de cada pantalla)
   Usa el estado y funciones globales definidos en app.js
   ============================================================ */

const Views = (() => {
  const playIcon = id => `<svg><use href="#i-${id}"/></svg>`;
  const eq = '<span class="eq"><i></i><i></i><i></i></span>';
  const albumOf = t => t.kind === 'yt' ? t.from : t.kind === 'file' ? 'Archivo local' : (GENRE_LABEL[t.style] || '');

  function row(t, i, key) {
    const cur = isCurrent(t), liked = state.liked.has(t.id);
    return `<div class="trk${cur ? ' playing' : ''}${cur && !state.playing ? ' paused' : ''}" role="button" tabindex="0" data-play="${key}" data-idx="${i}" data-tid="${t.id}">
      <span class="n"><span>${cur ? eq : i + 1}</span>${playIcon(cur && state.playing ? 'pause' : 'play')}</span>
      <span class="tt"><span class="mini">${trackCover(t)}</span><span class="w"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></span>
      <span class="al">${esc(albumOf(t))}</span>
      <button class="lk${liked ? ' on' : ''}" data-like="${t.id}" aria-label="${liked ? 'Quitar de me gusta' : 'Me gusta'}">${playIcon(liked ? 'heart-f' : 'heart')}</button>
      <span class="du">${t.dur ? fmt(t.dur) : '—'}</span>
    </div>`;
  }
  function rows(list, key, head = true, col = 'Género') {
    return `<div class="tracks">${head ? `<div class="trk head"><span class="n">#</span><span>Título</span><span>${col}</span><span></span><span class="du">Duración</span></div>` : ''}${list.map((t, i) => row(t, i, key)).join('')}</div>`;
  }
  function card({ nav, play, idx = 0, cover, title, sub, tag = '' }) {
    return `<div class="card${state.listKey === play && state.qi === idx && state.playing ? ' playing' : ''}" data-nav="${nav}" role="link" tabindex="0">
      <div class="cw"><div class="cover tilt">${cover}${tag}<span class="glare"></span></div>
      <button class="fab" data-play="${play}" data-idx="${idx}" aria-label="Reproducir ${esc(title)}">${playIcon('play')}</button></div>
      <h3>${esc(title)}</h3><p>${esc(sub)}</p></div>`;
  }

  /* ---------- Inicio ---------- */
  function home() {
    const pop = ORIGINALS.slice(0, 5);
    return `
    <section class="hero">
      <div class="verified">${playIcon('verified')}Artista verificada</div>
      <h1 class="t3d big" aria-label="SUGEY YALA">${split3d('SUGEY YALA')}</h1>
      <div class="album-line"><span class="lbl">Nuevo álbum</span></div>
      <h2 class="t3d gold mid" aria-label="UNI LLENO DE BURROS">${split3d('UNI LLENO DE BURROS', 450)}</h2>
      <p class="hero-stats"><b id="listeners">0</b> oyentes mensuales</p>
      <div class="actions">
        <button class="btn-play" data-play="album" data-idx="0" aria-label="Reproducir UNI LLENO DE BURROS">${playIcon('play')}</button>
        <button class="btn-ghost${state.following ? ' on' : ''}" data-act="follow">${state.following ? 'Siguiendo' : 'Seguir'}</button>
        <button class="btn-ai" data-act="dj-start">${playIcon('spark')}Que el DJ Yala elija</button>
      </div>
    </section>
    <section class="sec">
      <div class="sec-h"><div><h2>Populares</h2></div><button class="link" data-nav="list:album">Ver el álbum completo</button></div>
      ${rows(pop, 'album', false)}
    </section>
    <section class="sec">
      <div class="sec-h"><div><h2>Éxitos anime y gamer</h2><p>Openings y temas de videojuegos desde sus videos oficiales</p></div><button class="link" data-nav="list:hits">Mostrar todo</button></div>
      <div class="cards">${YT_HITS.slice(0, 6).map((t, i) => card({ nav: 'list:hits', play: 'hits', idx: i, cover: ytThumb(t, true), title: t.title, sub: `${t.artist}. ${t.from}`, tag: `<span class="tag yt">${t.kind === 'game' ? 'Videojuego' : 'Anime'}</span>` })).join('')}</div>
    </section>
    <section class="sec">
      <div class="sec-h"><div><h2>Mezclas por facultad</h2><p>Hechas con las canciones de Sugey Yala</p></div><button class="link" data-nav="library">Tu biblioteca</button></div>
      <div class="cards">${FACULTY_MIXES.map(m => card({ nav: 'list:mix:' + m.id, play: 'mix:' + m.id, cover: coverSVG(m.palette, m.glyph, m.name), title: m.name, sub: m.desc })).join('')}</div>
    </section>
    <section class="sec">
      <div class="ai-box">
        <h2>${playIcon('spark')}Escribe una idea y Sugey Yala la canta</h2>
        <p>La compositora IA elige género, tempo, melodía, letra y portada. Prueba con "me jalaron en Cálculo y quiero algo épico".</p>
        <form class="ask" data-form="quick-compose"><input name="q" placeholder="¿De qué trata tu canción?" maxlength="120" autocomplete="off"><button class="send" aria-label="Componer">${playIcon('send')}</button></form>
      </div>
    </section>`;
  }

  /* ---------- Playlist / álbum ---------- */
  function list(key) {
    const L = getList(key);
    if (!L) return `<div class="empty"><b>Esta playlist ya no existe</b>Vuelve al inicio para elegir otra.</div>`;
    const total = L.tracks.reduce((a, t) => a + (t.dur || 0), 0);
    const col = key === 'hits' ? 'Serie o juego' : 'Género';
    let extra = '';
    if (key === 'files') extra = `<div class="drop" id="drop">${playIcon('upload')}<b>Arrastra tus canciones aquí</b>MP3, M4A, OGG o WAV desde tu computadora. Suenan con el audio 3D y el visualizador.<br><button class="btn-ghost" data-act="pick-files">Elegir archivos</button></div>`;
    let empty = '';
    if (!L.tracks.length) empty = {
      liked: '<div class="empty"><b>Aún no tienes canciones favoritas</b>Toca el corazón en cualquier canción para guardarla aquí.</div>',
      creations: '<div class="empty"><b>Todavía no has compuesto nada</b><button class="btn-ghost" data-nav="ai">Abrir la compositora IA</button></div>',
      files: '', search: '<div class="empty"><b>Sin resultados</b>Prueba con otro nombre.</div>'
    }[key] || '';
    return `
    <section class="pl-head" style="--tint:${L.tint}">
      <div class="pl-cover tilt">${L.cover()}<span class="glare"></span></div>
      <div class="pl-info">
        <div class="kind">${L.kind}</div>
        <h1 class="t3d${L.gold ? ' gold' : ''}" aria-label="${esc(L.name)}">${split3d(L.name)}</h1>
        <p class="desc">${esc(L.desc)}</p>
        <div class="meta">${esc(L.owner)} <span>${L.tracks.length} canciones${total ? ', ' + Math.round(total / 60) + ' min' : ''}</span></div>
      </div>
    </section>
    <div class="pl-actions">
      ${L.tracks.length ? `<button class="btn-play" data-play="${key}" data-idx="0" data-toggle="1" aria-label="Reproducir">${playIcon(state.listKey === key && state.playing ? 'pause' : 'play')}</button>
      <button class="ico${state.shuffle ? ' on' : ''}" data-act="shuffle" aria-label="Aleatorio">${playIcon('shuffle')}</button>` : ''}
      ${key === 'files' ? `<button class="btn-ghost" data-act="pick-files">Agregar archivos</button>` : ''}
    </div>
    ${extra}
    ${L.tracks.length ? rows(L.tracks, key, true, col) : empty}
    ${key === 'hits' ? '<p class="note">Estos temas se reproducen con el reproductor oficial de YouTube, que se muestra mientras suenan. El audio 3D y los efectos funcionan con las canciones de Sugey Yala y tus MP3.</p>' : ''}`;
  }

  /* ---------- Buscar ---------- */
  function search(q = '') {
    return `<label class="big-search">${playIcon('search')}<input id="bigQ" type="search" value="${esc(q)}" placeholder="Canciones, artistas, series o géneros" autocomplete="off"></label><div id="sres">${searchResults(q)}</div>`;
  }
  function searchResults(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      const tiles = Object.entries(GENRE_LABEL).map(([s, label]) => { const t = ORIGINALS.find(o => o.style === s); return `<button class="tile" data-act="genre" data-g="${s}" style="background:${t.palette[0]}">${label}<span class="art">${coverSVG(t.palette, t.glyph)}</span></button>`; });
      tiles.push(`<button class="tile" data-act="genre" data-g="anime-yt" style="background:#7A1E2E">Openings de anime<span class="art">${ytThumb(YT_HITS[0])}</span></button>`);
      tiles.push(`<button class="tile" data-act="genre" data-g="game-yt" style="background:#3A1B6E">Videojuegos<span class="art">${ytThumb(YT_HITS[8])}</span></button>`);
      return `<div class="sec-h"><div><h2>Explorar todo</h2></div></div><div class="tiles">${tiles.join('')}</div>`;
    }
    const res = allTracks().filter(t => [t.title, t.artist, t.from, t.album, GENRE_LABEL[t.style], t.prompt].filter(Boolean).join(' ').toLowerCase().includes(q));
    state.searchList = res;
    if (!res.length) return `<div class="empty"><b>No encontramos "${esc(q)}"</b>Revisa cómo lo escribiste o pídele al DJ Yala una canción nueva.</div>`;
    return `<div class="sec-h"><div><h2>Canciones</h2><p>${res.length} resultados</p></div></div>${rows(res, 'search', true, 'Género o serie')}`;
  }

  /* ---------- Biblioteca ---------- */
  function library() {
    const keys = ['album', 'hits', 'liked', 'creations', 'files', ...FACULTY_MIXES.map(m => 'mix:' + m.id)];
    return `<div class="sec-h" style="margin-top:12px"><div><h2>Tu biblioteca</h2></div></div>
    <div class="cards">${keys.map(k => { const L = getList(k); return card({ nav: 'list:' + k, play: k, cover: L.cover(), title: L.name, sub: `${L.kind}, ${L.tracks.length} canciones` }); }).join('')}</div>`;
  }

  /* ---------- IA ---------- */
  function ai() {
    const styles = Object.entries(GENRE_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    const recent = state.creations.slice(0, 4);
    return `
    <div class="sec-h" style="margin-top:12px"><div><h2>DJ Yala y Compositora IA</h2><p>Funciona dentro de tu navegador. Lo que escribas no sale de tu computadora.</p></div></div>
    <div class="ai-grid">
      <div class="ai-box">
        <h2>${playIcon('voice')}Habla con el DJ Yala</h2>
        <p>Pídele música por ánimo, género o serie. Si activas la voz, te responde hablando.</p>
        <div class="chat" id="chat">${state.chat.map(m => `<div class="msg ${m.who}">${esc(m.text)}</div>`).join('')}</div>
        <div class="chips">${['Pon algo para estudiar', 'Un opening de anime', 'Modo gamer', 'Crea una cumbia sobre el sustitutorio', 'Activa el audio 3D', 'Rebuzna'].map(c => `<button class="chip" data-act="chip">${c}</button>`).join('')}</div>
        <form class="ask" data-form="chat"><input name="q" placeholder="Escribe al DJ Yala…" maxlength="160" autocomplete="off"><button class="send" aria-label="Enviar">${playIcon('send')}</button></form>
      </div>
      <div class="ai-box">
        <h2>${playIcon('spark')}Compositora IA</h2>
        <p>Describe tu canción. La IA elige género, tempo, melodía, letra y portada, y Sugey Yala la canta.</p>
        <form data-form="compose">
          <div class="ask"><textarea name="q" rows="3" maxlength="160" placeholder="Ej.: una canción épica sobre aprobar Física II en el sustitutorio">${esc(state.draft || '')}</textarea></div>
          <div class="ask" style="margin-top:8px"><select name="style" style="flex:1;background:rgba(243,237,228,.07);border:1px solid var(--line);border-radius:10px;padding:10px 12px;color:var(--bone);font-weight:700"><option value="auto">Que la IA elija el género</option>${styles}</select></div>
          <button class="compose-btn" type="submit">${playIcon('spark')}Componer canción</button>
        </form>
        <ul class="steps" id="steps" hidden>${['Leyendo tu idea', 'Eligiendo género y tempo', 'Escribiendo melodía y acordes', 'Escribiendo la letra', 'Diseñando la portada', 'Masterizando en el Pabellón Central'].map(s => `<li>${s}</li>`).join('')}</ul>
        <div id="composeOut"></div>
        ${recent.length ? `<div class="q-sec">Tus creaciones recientes</div>${recent.map((t, i) => `<button class="q-item" data-play="creations" data-idx="${i}"><span class="mini">${trackCover(t)}</span><span class="w"><b>${esc(t.title)}</b><small>${GENRE_LABEL[t.style]}, ${t.bpm} BPM</small></span></button>`).join('')}` : ''}
      </div>
    </div>`;
  }

  /* ---------- panel ---------- */
  function lyrics() {
    const t = state.current;
    if (!t) return '<p class="lyrics-note">Elige una canción para ver su letra.</p>';
    if (t.kind !== 'synth' || !t.lyrics) return `<p class="lyrics-note">Las letras sincronizadas están disponibles en las canciones de Sugey Yala y en tus creaciones IA. Para "${esc(t.title)}", canta de memoria.</p>`;
    return `<p class="lyrics-note">${esc(t.title)}</p><div class="lyrics" id="lyrics">${t.lyrics.map((l, i) => `<p data-li="${i}">${esc(l)}</p>`).join('')}</div>`;
  }
  function queue() {
    if (!state.current) return '<p class="lyrics-note">La cola está vacía. Dale play a cualquier canción.</p>';
    const nextOnes = state.queue.slice(state.qi + 1).concat(state.queue.slice(0, state.qi)).slice(0, 20);
    const item = (t, i, now) => `<button class="q-item${now ? ' now' : ''}" data-act="jump" data-tid="${t.id}"><span class="mini">${trackCover(t)}</span><span class="w"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></button>`;
    return `<div class="q-sec">Sonando ahora</div>${item(state.current, 0, true)}<div class="q-sec">A continuación</div>${nextOnes.map((t, i) => item(t, i)).join('') || '<p class="lyrics-note">No hay más canciones en la cola.</p>'}`;
  }

  return { home, list, search, searchResults, library, ai, lyrics, queue, row };
})();
