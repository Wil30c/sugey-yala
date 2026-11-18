/* ============================================================
   SugeySpotify · Datos: canciones originales de Sugey Yala (generadas
   en vivo) + éxitos anime/gamer (videos oficiales de YouTube)
   ============================================================ */

const ARTIST = {
  name: 'SUGEY YALA',
  listeners: 4815162,
  bio: 'Ingeniera de día, leyenda del pabellón de noche. Compone openings para los que se quedaron a sustitutorio y bandas sonoras para los que van por la trica.'
};

const ALBUM_MAIN = 'UNI LLENO DE BURROS';

/* style: motor de síntesis | bpm | root: nota MIDI | mode: escala
   palette: colores de la portada | glyph: símbolo de portada        */
const ORIGINALS = [
  {
    id: 'o1', title: 'Shingeki no Cachimbo', style: 'anime', bpm: 150, root: 57, mode: 'minor',
    bars: 64, palette: ['#A3172F', '#E7B84A'], glyph: 'titan',
    lyrics: [
      'Llegué en marzo con mi mochila nueva',
      'Me dijeron "cachimbo", empezó la prueba',
      'Muros de concreto en la Túpac Amaru',
      'Cálculo Uno me mira desde lo alto',
      '¡Ataca, ataca, que viene el parcial!',
      'Con mi cuaderno como espada final',
      'Si me jalan hoy, vuelvo en el ciclo',
      'Un cachimbo nunca se rinde, ¡lo digo!'
    ]
  },
  {
    id: 'o2', title: 'Super Burro Bros. 1-1', style: 'chiptune', bpm: 140, root: 60, mode: 'major',
    bars: 48, palette: ['#E7B84A', '#3A1B6E'], glyph: 'pixel',
    lyrics: [
      'Salto la tubería de la Puerta 3',
      'Monedas del comedor: una, dos y tres',
      'El jefe final es el examen sustitutorio',
      'Power-up de café en el laboratorio',
      'Pierdo una vida si me cruzo al profe',
      '¡Continue? Sí! Otro ciclo y no me escape',
    ]
  },
  {
    id: 'o3', title: 'Jalado Fantasy: Batalla Final', style: 'rpg', bpm: 160, root: 62, mode: 'minor',
    bars: 64, palette: ['#1D1240', '#A3172F'], glyph: 'sword',
    lyrics: [
      '¡Un Física Dos salvaje apareció!',
      'Uso "Copiar"… ¡pero el profe lo bloqueó!',
      'Uso "Llorar"… no es muy efectivo',
      'Mi promedio baja, quedo pensativo',
      'Invoco al delegado, lanza "Reclamo"',
      '¡Golpe crítico! Ahora sí apruebo el año'
    ]
  },
  {
    id: 'o4', title: 'Lofi Biblioteca Central', style: 'lofi', bpm: 78, root: 53, mode: 'dorian',
    bars: 48, palette: ['#3B2A4F', '#E8A0A8'], glyph: 'moon',
    lyrics: [
      'Tres de la mañana, la tesis no avanza',
      'Un café del kiosko, poca esperanza',
      'Llueve en el Rímac, no llueve en verdad',
      'Es solo mi pena por la integral',
      'Subrayo con plumón todo el separata',
      'Mañana lo olvido, pero hoy no se escapa'
    ]
  },
  {
    id: 'o5', title: 'Eurobeat de la Túpac Amaru', style: 'eurobeat', bpm: 155, root: 64, mode: 'minor',
    bars: 64, palette: ['#E7B84A', '#A3172F'], glyph: 'bolt',
    lyrics: [
      'Combi a toda velocidad, ¡derrapando en la curva!',
      'Llego tarde a la clase, el profe ya me turba',
      '¡Déjà vu! Ya llevé este curso antes',
      '¡Déjà vu! Mis notas son alarmantes',
      'Ochenta por hora por la Túpac Amaru',
      'Si no llego a las ocho, el profe me pone cero'
    ]
  },
  {
    id: 'o6', title: 'Cumbia del Sustitutorio', style: 'cumbia', bpm: 96, root: 55, mode: 'minor',
    bars: 56, palette: ['#E2398A', '#F2C230'], glyph: 'star',
    lyrics: [
      'Me jalaron en Estática, ay qué dolor',
      'Me voy al sustitutorio con todo el amor',
      'Bailando en el comedor con mi táper',
      'Que el ponderado lo arregla el destino, compadre',
      '¡Y suena, suena el güiro de la UNI!',
      'Diez punto cinco, pero aprobé, ¡sí señor!'
    ]
  },
  {
    id: 'o7', title: 'Huayno del Ponderado', style: 'huayno', bpm: 112, root: 52, mode: 'pentaMinor',
    bars: 56, palette: ['#7A1E2E', '#3FA37A'], glyph: 'mountain',
    lyrics: [
      'Desde la sierra vine a estudiar',
      'Con mi charango y ganas de ingresar',
      'El Cepre fue duro, la UNI más',
      'Pero el ponderado no me va a ganar',
      'Quenita, quenita, toca para mí',
      'Que el viernes en la noche me voy a reír'
    ]
  },
  {
    id: 'o8', title: 'Neon Genesis Rímac', style: 'synthwave', bpm: 104, root: 61, mode: 'minor',
    bars: 56, palette: ['#4B1D6E', '#F05A7E'], glyph: 'sun',
    lyrics: [
      'Luces de neón sobre el puente del Rímac',
      'Pilotando mi carpeta, nadie me lo quita',
      'Entra en el robot, dijo mi jefe de práctica',
      'Ni modo, me toca la parte más dramática',
      'Huele a laboratorio y a sueño perdido',
      'Pero esta noche el ciclo está vencido'
    ]
  },
  {
    id: 'o9', title: 'Sustitutorio no Jutsu', style: 'anime', bpm: 165, root: 59, mode: 'minor',
    bars: 64, palette: ['#E7B84A', '#1D1240'], glyph: 'spiral',
    lyrics: [
      '¡Técnica secreta: estudiar la noche anterior!',
      'Clones de sombra para cada profesor',
      'Mi chakra es puro café con pan',
      'Ocho horas de examen, ¡ya no puedo más!',
      'Dattebayo, apruebo de una vez',
      'O me toca la trica… por tercera vez'
    ]
  },
  {
    id: 'o10', title: 'The Legend of Ponderado', style: 'chiptune', bpm: 120, root: 55, mode: 'major',
    bars: 48, palette: ['#2E6B4F', '#E7B84A'], glyph: 'gem',
    lyrics: [
      'Es peligroso ir solo al examen',
      'Toma esta calculadora, que no te desanimen',
      'Ocho mazmorras: una por cada facultad',
      'El templo de FIEE tiene la verdad',
      'Rescato a mi promedio del castillo del jale',
      '¡Ta-da-da-daaa! Por fin, nadie me iguale'
    ]
  }
];

/* Videos oficiales verificados (permiten reproducirse incrustados) */
const YT_HITS = [
  { id: 'y1', yt: 'CwkzK-F0Y00', title: 'Gurenge', artist: 'LiSA', from: 'Kimetsu no Yaiba', kind: 'anime' },
  { id: 'y2', yt: 'ZRtdQ81jPUQ', title: 'Idol (アイドル)', artist: 'YOASOBI', from: 'Oshi no Ko', kind: 'anime' },
  { id: 'y3', yt: 'M2cckDmNLMI', title: 'KICK BACK', artist: 'Kenshi Yonezu', from: 'Chainsaw Man', kind: 'anime' },
  { id: 'y4', yt: '1tk1pqwrOys', title: 'Kaikai Kitan', artist: 'Eve', from: 'Jujutsu Kaisen', kind: 'anime' },
  { id: 'y5', yt: '7aMOurgDB-o', title: 'Unravel', artist: 'TK from Ling tosite sigure', from: 'Tokyo Ghoul', kind: 'anime' },
  { id: 'y6', yt: 'aJRu5ltxXjc', title: 'Blue Bird', artist: 'Ikimonogakari', from: 'Naruto Shippuden', kind: 'anime' },
  { id: 'y7', yt: '8OkpRK2_gVs', title: 'Guren no Yumiya', artist: 'Linked Horizon', from: 'Attack on Titan', kind: 'anime' },
  { id: 'y8', yt: 'YoeP9w5UIlg', title: 'We Are!', artist: 'Hiroshi Kitadani', from: 'One Piece', kind: 'anime' },
  { id: 'y9', yt: '0FCvzsVlXpQ', title: 'MEGALOVANIA', artist: 'Toby Fox', from: 'Undertale', kind: 'game' },
  { id: 'y10', yt: 'bj__2NO_myw', title: 'Last Surprise (en vivo)', artist: 'ATLUS Sound Team', from: 'Persona 5', kind: 'game' }
];

/* Playlists por facultad (mezclas de las originales) */
const FACULTY_MIXES = [
  { id: 'm-fiee', name: 'FIEE Voltaje', desc: 'Para soldar circuitos a las 2 a.m.', ids: ['o5', 'o8', 'o2'], palette: ['#E7B84A', '#4B1D6E'], glyph: 'bolt' },
  { id: 'm-fic', name: 'FIC Concreto Armado', desc: 'Resiste más que tu viga en voladizo.', ids: ['o1', 'o3', 'o9'], palette: ['#8A8A8A', '#A3172F'], glyph: 'titan' },
  { id: 'm-fiis', name: 'FIIS Sprint Final', desc: 'Deploy el viernes. Que sea lo que Dios quiera.', ids: ['o4', 'o8', 'o10'], palette: ['#1D1240', '#3FA37A'], glyph: 'pixel' },
  { id: 'm-fim', name: 'FIM Torque Máximo', desc: 'Rock pesado para el taller de máquinas.', ids: ['o9', 'o5', 'o1'], palette: ['#A3172F', '#1D1240'], glyph: 'sword' },
  { id: 'm-fc', name: 'Ciencias Cuántica Chill', desc: 'Superposición de sueño y despierto.', ids: ['o4', 'o7', 'o8'], palette: ['#3B2A4F', '#E7B84A'], glyph: 'moon' },
  { id: 'm-faua', name: 'FAUA Maqueta Nights', desc: 'Cúter, balsa y cumbia hasta el amanecer.', ids: ['o6', 'o4', 'o7'], palette: ['#E2398A', '#3B2A4F'], glyph: 'star' }
];

const GENRE_LABEL = {
  anime: 'Anime opening', chiptune: '8-bit', rpg: 'Batalla RPG', lofi: 'Lofi anime',
  eurobeat: 'Eurobeat', cumbia: 'Cumbia', huayno: 'Huayno', synthwave: 'Synthwave'
};
