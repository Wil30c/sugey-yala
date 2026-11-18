/* ============================================================
   SugeySpotify · IA local
   - DJ Yala: voz en español (síntesis del navegador) + chat
   - Compositora: convierte una idea en canción, título y letra
   Todo corre en tu navegador; no se envía nada a internet.
   ============================================================ */

const UniAI = (() => {
  let voice = null, voiceOn = true;
  const hasSpeech = 'speechSynthesis' in window;

  function pickVoice() {
    if (!hasSpeech) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /es[-_]PE/i.test(v.lang)) || vs.find(v => /es[-_](419|MX|US|CO|CL|AR)/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
  }
  if (hasSpeech) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function speak(text, { onstart, onend } = {}) {
    if (!hasSpeech || !voiceOn) { onend && onend(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice; u.lang = voice ? voice.lang : 'es-PE'; u.rate = 1.04; u.pitch = 1.08;
    let done = false; const fin = () => { if (!done) { done = true; onend && onend(); } };
    u.onstart = () => onstart && onstart(); u.onend = fin; u.onerror = fin;
    setTimeout(fin, 14000);
    speechSynthesis.speak(u);
  }
  const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

  /* ---------- DJ ---------- */
  function greeting() {
    const h = new Date().getHours();
    return h < 6 ? 'Buenas madrugadas, gente de la UNI que no duerme' : h < 12 ? 'Buenos días, cachimbos y cachimbas' : h < 19 ? 'Buenas tardes, burros y burras de la UNI' : 'Buenas noches, ingenieros del pabellón';
  }
  function djIntro(track, first) {
    const g = GENRE_LABEL[track.style] || (track.kind === 'game' ? 'videojuego' : 'anime');
    const name = track.title, who = track.artist || ARTIST.name;
    const opens = first ? [`${greeting()}. Soy DJ Yala, tu DJ con inteligencia artificial. `] : ['', 'Seguimos. ', 'Atención, pabellón. '];
    const lines = [
      `Para los que van por la trica, aquí va ${name}, de ${who}.`,
      `Esta va dedicada a todos los jalados en Cálculo: ${name}.`,
      `Sube el volumen, que el sustitutorio es mañana. ${name}, puro ${g}.`,
      `Del comedor directo a tus audífonos: ${name}.`,
      `Ponderado bajo, energía alta. Con ustedes, ${name}.`,
      `Según mis cálculos, el noventa por ciento de la UNI necesita escuchar ${name} ahora.`
    ];
    return pick(opens) + pick(lines);
  }

  /* ---------- compositora ---------- */
  const STYLE_KEYS = {
    cumbia: ['cumbia', 'bailar', 'baile', 'fiesta', 'comedor', 'chela', 'tono', 'juerga', 'sabrosa', 'perreo', 'chicha'],
    huayno: ['huayno', 'sierra', 'andes', 'cusco', 'puno', 'quena', 'charango', 'ayacucho', 'huancayo', 'andino', 'montaña'],
    lofi: ['estudiar', 'estudio', 'biblioteca', 'tesis', 'concentrar', 'dormir', 'lluvia', 'chill', 'relajar', 'triste', 'pena', 'llorar', 'calma', 'lofi', 'madrugada'],
    anime: ['anime', 'opening', 'naruto', 'titan', 'titán', 'shonen', 'pelea', 'épico', 'epico', 'ataque', 'poder', 'jutsu', 'otaku', 'kawaii'],
    chiptune: ['pixel', '8 bit', '8-bit', '8bit', 'arcade', 'mario', 'nintendo', 'gamer', 'juego', 'videojuego', 'consola', 'retro'],
    rpg: ['batalla', 'jefe', 'boss', 'rpg', 'final', 'dragón', 'dragon', 'examen', 'sustitutorio', 'parcial', 'guerra', 'espada'],
    eurobeat: ['velocidad', 'combi', 'carrera', 'auto', 'drift', 'rápido', 'rapido', 'túpac', 'tupac', 'tarde', 'correr', 'moto'],
    synthwave: ['noche', 'neón', 'neon', 'ochentas', '80', 'ciudad', 'rímac', 'rimac', 'amor', 'sugey', 'futuro', 'robot', 'luces']
  };
  const SAD = ['triste', 'jalado', 'jalaron', 'jale', 'llorar', 'pena', 'solo', 'sola', 'perdí', 'perdi', 'extraño', 'cansado', 'cansada', 'trica'];
  const HAPPY = ['feliz', 'aprobé', 'aprobe', 'fiesta', 'ingresé', 'ingrese', 'vacaciones', 'gané', 'gane', 'amor', 'viernes'];
  const PALETTES = {
    anime: [['#A3172F', '#E7B84A'], ['#E7B84A', '#1D1240']], chiptune: [['#E7B84A', '#3A1B6E'], ['#2E6B4F', '#E7B84A']],
    rpg: [['#1D1240', '#A3172F']], lofi: [['#3B2A4F', '#E8A0A8']], eurobeat: [['#E7B84A', '#A3172F']],
    cumbia: [['#E2398A', '#F2C230']], huayno: [['#7A1E2E', '#3FA37A']], synthwave: [['#4B1D6E', '#F05A7E']]
  };
  const GLYPHS = { anime: 'spiral', chiptune: 'pixel', rpg: 'sword', lofi: 'moon', eurobeat: 'bolt', cumbia: 'star', huayno: 'mountain', synthwave: 'sun' };
  const TITLES = {
    anime: ['{X} no Jutsu', 'Shingeki no {X}', '{X}: Opening 2', 'Kimetsu no {X}'],
    chiptune: ['Super {X} Bros.', '{X}: Nivel 1-1', 'Pac-{X}', '{X} 64'],
    rpg: ['{X}: Batalla Final', 'Final {X} VII', 'El jefe de {X}', '{X} Fantasy'],
    lofi: ['Lofi {X} para estudiar', '{X} a las 3 a.m.', '{X} (beats para la tesis)', 'Lluvia sobre {X}'],
    eurobeat: ['Eurobeat del {X}', '{X} Déjà Vu', 'Running in the {X}', '{X} a 90 por hora'],
    cumbia: ['Cumbia del {X}', 'La {X} sabrosa', '{X} en el comedor', 'Mi {X} bonita'],
    huayno: ['Huayno del {X}', '{X} de los Andes', 'Quenita del {X}', '{X} en la sierra'],
    synthwave: ['Neon {X}', '{X} 1986', '{X} en el Rímac', 'Noches de {X}']
  };
  const STOP = new Set(['para', 'sobre', 'una', 'unos', 'unas', 'que', 'con', 'canción', 'cancion', 'tema', 'música', 'musica', 'crea', 'creame', 'créame', 'haz', 'hazme', 'genera', 'compón', 'compon', 'quiero', 'cuando', 'porque', 'estoy', 'muy', 'del', 'las', 'los', 'una', 'algo', 'como', 'tipo', 'estilo', 'pero', 'ahora', 'esta', 'este', 'mucho', 'mucha']);

  function analyze(prompt, forced) {
    const p = prompt.toLowerCase();
    const r = UniAudio.rng(p + Date.now());
    let style = null, best = 0;
    for (const [s, keys] of Object.entries(STYLE_KEYS)) { const n = keys.filter(k => p.includes(k)).length; if (n > best) { best = n; style = s; } }
    const sad = SAD.some(w => p.includes(w)), happy = HAPPY.some(w => p.includes(w));
    if (!style) style = sad ? 'lofi' : happy ? 'cumbia' : pick(Object.keys(STYLE_KEYS), r);
    if (forced && STYLE_KEYS[forced]) style = forced;
    const base = { anime: 155, chiptune: 135, rpg: 158, lofi: 78, eurobeat: 155, cumbia: 96, huayno: 112, synthwave: 104 }[style];
    const bpm = Math.round(base * (sad ? 0.92 : happy ? 1.06 : 1) + (r() - 0.5) * 8);
    const mode = style === 'huayno' ? 'pentaMinor' : style === 'lofi' ? 'dorian' : sad ? 'minor' : happy ? 'major' : (r() < 0.6 ? 'minor' : 'major');
    const words = p.replace(/[^\wáéíóúñü\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
    let key = words.sort((a, b) => b.length - a.length)[0] || pick(['Ponderado', 'Pabellón', 'Cachimbo', 'Sustitutorio', 'Comedor']);
    key = key.charAt(0).toUpperCase() + key.slice(1);
    const title = pick(TITLES[style], r).replace('{X}', key);
    const lyr = [
      `Esta canción nació de una idea: "${prompt.trim().slice(0, 60)}"`,
      pick([`En la UNI todos saben de ${key.toLowerCase()}`, `${key} en el pabellón, ${key} en el corazón`, `Me dijeron que el ${key.toLowerCase()} no se estudia, se sufre`], r),
      pick(['Ponderado diez punto cinco, pero sigo de pie', 'El profe dijo "fácil", y yo me lo creí', 'Tres cafés del kiosko y un sustitutorio'], r),
      pick(['Burro que no estudia, rebuzna en el examen', 'Si me jalan, vuelvo; si apruebo, celebro', 'Puerta Tres a las siete, sin desayunar'], r),
      pick([`¡${key}, ${key}! Que suene en la Túpac Amaru`, `Sugey Yala canta, la UNI baila`, 'Hecho por IA, sufrido por humanos'], r),
      pick(['Y al final del ciclo, todos somos ingenieros', 'Mañana es otro día… y otro parcial', 'Dale play otra vez, que la trica no perdona'], r)
    ];
    return {
      id: 'ai' + Date.now(), title, style, bpm, mode, root: 52 + Math.floor(r() * 10), bars: 48,
      palette: pick(PALETTES[style], r), glyph: GLYPHS[style], lyrics: lyr, ai: true, prompt
    };
  }

  /* ---------- chat del DJ ---------- */
  function respond(text, api) {
    const p = text.toLowerCase().trim();
    const has = (...w) => w.some(x => p.includes(x));
    if (!p) return null;
    if (has('crea', 'compón', 'compon', 'genera', 'hazme una', 'haz una', 'inventa')) {
      const t = api.compose(text);
      return `Listo. Compuse "${t.title}" (${GENRE_LABEL[t.style]}, ${t.bpm} BPM). Ya está sonando y la guardé en Tus creaciones.`;
    }
    if (has('siguiente', 'salta', 'next', 'otra')) { api.next(); return 'Pasamos a la siguiente. Que nadie se duerma.'; }
    if (has('pausa', 'para la', 'detén', 'deten', 'stop')) { api.pause(); return 'Pausado. Aprovecha para tomar agüita.'; }
    if (has('rebuzn', 'burro', 'hiaa', 'jiaa')) { api.bray(); return '¡Hiii-jooo! Ese fue un rebuzno 100% UNI.'; }
    if (has('3d', '8d', 'espacial', 'envolvente')) { const on = api.toggleSpatial(); return on ? 'Audio 3D activado. Ponte audífonos: el sonido va a girar alrededor de tu cabeza.' : 'Audio 3D desactivado. Volvemos al estéreo clásico.'; }
    if (has('sugey', 'quién eres', 'quien eres')) return `${ARTIST.name}: ${ARTIST.bio} Tiene ${ARTIST.listeners.toLocaleString('es-PE')} oyentes mensuales, casi todos jalados.`;
    if (has('videojuego', 'gamer', 'undertale', 'persona', 'juego')) { const t = api.playHit('game'); return `Modo gamer: "${t.title}" de ${t.from}.`; }
    if (has('anime', 'opening', 'otaku', 'naruto', 'one piece', 'demon', 'kimetsu', 'jujutsu', 'chainsaw')) { const t = api.playHit('anime'); return `Opening de anime: "${t.title}" de ${t.artist} (${t.from}).`; }
    for (const [s, keys] of Object.entries(STYLE_KEYS)) {
      if (keys.some(k => p.includes(k))) { const t = api.playStyle(s); if (t) return `Para eso, "${t.title}". ${GENRE_LABEL[s]} puro.`; }
    }
    if (has('hola', 'buenas', 'qué tal', 'que tal')) return `${greeting()}. Pídeme un género, un ánimo o escribe "crea una canción sobre…".`;
    return 'No te entendí del todo. Prueba con "pon algo para estudiar", "un opening de anime" o "crea una cumbia sobre el sustitutorio".';
  }

  return {
    speak, djIntro, analyze, respond, hasSpeech,
    get voiceOn() { return voiceOn; }, set voiceOn(v) { voiceOn = v; if (!v && hasSpeech) speechSynthesis.cancel(); },
    stop() { if (hasSpeech) speechSynthesis.cancel(); }
  };
})();
