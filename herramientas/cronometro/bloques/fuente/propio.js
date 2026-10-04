/* ═══════════════════════════════════════════════════════════════════════
   Secuencia321 · Cronómetro 4 · Minutos en bloques · guion
   Fuente de index.html: se corrige aquí y se vuelve a construir con
   construir.py. Lo que comparte con los demás cronómetros está resuelto
   por la casa (pantalla completa, ajustes, información); lo propio es la
   rueda, la bandeja y su acumulación.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
'use strict';

/* ── Utilidades ─────────────────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const CLAVE = 's321-cronometro-bloques';
const VERSION = 1;   /* subirla descarta lo guardado con el esquema viejo */

/* ── entrar y salir sin tirones: lo mismo que usan los demás cronómetros
   para sus paneles, así ajustes también entra y sale con transición en
   vez de aparecer de golpe ─────────────────────────────────────────── */
const SALIDA = 190;
const salidas = new WeakMap();
function abierto(el) { return !el.hidden && !el.classList.contains('saliendo'); }
function mostrar(el) {
  const t = salidas.get(el);
  if (t) { clearTimeout(t); salidas.delete(el); }
  el.classList.remove('saliendo');
  el.hidden = false;
}
function ocultar(el) {
  if (el.hidden || el.classList.contains('saliendo')) return;
  if (reducido()) { el.hidden = true; return; }
  el.classList.add('saliendo');
  salidas.set(el, setTimeout(() => { el.hidden = true; el.classList.remove('saliendo'); salidas.delete(el); }, SALIDA));
}

/* ── Estado ─────────────────────────────────────────────────────────── */
const E = {
  nombre: '',
  duracion: 1, duracionPersonal: 7,
  objetivo: 5, personalizado: 12, agrupa: '5', modo: 'libre',
  avisar: true, senal: true, sonidoBloque: false, sonidoMeta: true, decenas: true,
  bloques: 0, meta: false, estaciones: [],
  /* el tiempo sale del reloj del sistema, nunca de contar pasos de un
     temporizador: así no se atrasa ni se desincroniza si se cambia de
     pestaña o el equipo se queda un momento sin atender */
  acumMs: 0, t0: null, bloqueInicioMs: 0
};
const corre = () => E.t0 !== null;
const elapsedMs = (ahora = performance.now()) => E.acumMs + (corre() ? ahora - E.t0 : 0);

const $pieza = $('#pieza'), $principal = $('#principal'), $rueda = $('#rueda'),
  $bandeja = $('#bandeja'), $metaN = $('#meta-n'), $estado = $('#estado'), $estadoTxt = $('#estado-txt'),
  $btnMarcha = $('#btn-marcha'), $icoMarcha = $('#marcha-ico'), $btnReiniciar = $('#btn-reiniciar'),
  $btnEstacion = $('#btn-estacion'), $tiraEst = $('#tira-estaciones'),
  $din = $('#dinamica'), $dinCampo = $('#dinamica-campo'),
  $btnInfo = $('#btn-info'), $info = $('#info'), $cuerpo = $('#cuerpo'),
  $btnAjustes = $('#btn-ajustes'), $ajustes = $('#ajustes'), $ajCerrar = $('#ajustes-cerrar'),
  $filaPersonal = $('#fila-personalizado'), $objPersonal = $('#obj-personal'),
  $filaDuracionPersonal = $('#fila-duracion-personal'), $durPersonal = $('#dur-personal'),
  $btnPantalla = $('#btn-pantalla'), $pantallaIco = $('#pantalla-ico'),
  $ajAvisar = $('#aj-avisar'), $ajSenal = $('#aj-senal'), $ajSonidoBloque = $('#aj-sonido-bloque'),
  $ajSonidoMeta = $('#aj-sonido-meta'), $ajDecenas = $('#aj-decenas');

/* ── memoria: si la página se recarga, la clase sigue donde iba ───────── */
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      v: VERSION, nombre: E.nombre,
      duracion: E.duracion, duracionPersonal: E.duracionPersonal,
      objetivo: E.objetivo, personalizado: E.personalizado, agrupa: E.agrupa, modo: E.modo,
      avisar: E.avisar, senal: E.senal, sonidoBloque: E.sonidoBloque, sonidoMeta: E.sonidoMeta, decenas: E.decenas,
      bloques: E.bloques, meta: E.meta, estaciones: E.estaciones.slice(),
      acumMs: elapsedMs(), bloqueInicioMs: E.bloqueInicioMs, corriendo: corre(), reloj: Date.now()
    }));
  } catch (e) { /* sin memoria en este navegador: la herramienta sigue funcionando */ }
}
let guardarT = 0;
const guardarLuego = () => { clearTimeout(guardarT); guardarT = setTimeout(guardar, 350); };
function cargar() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { o = null; }
  if (!o || o.v !== VERSION) return;
  const num = (v, def) => (typeof v === 'number' && isFinite(v) ? v : def);
  E.nombre = typeof o.nombre === 'string' ? o.nombre.replace(/[\r\n]+/g, ' ').slice(0, 70) : '';
  E.duracion = o.duracion === 'personalizado' ? 'personalizado' : num(o.duracion, 1);
  E.duracionPersonal = Math.max(1, num(o.duracionPersonal, 7));
  E.objetivo = o.objetivo === 'personalizado' ? 'personalizado' : num(o.objetivo, 5);
  E.personalizado = Math.max(1, num(o.personalizado, 12));
  E.agrupa = ['5', '10', 'libre'].includes(o.agrupa) ? o.agrupa : '5';
  E.modo = ['libre', 'estaciones', 'reto'].includes(o.modo) ? o.modo : 'libre';
  E.avisar = o.avisar !== false; E.senal = o.senal !== false;
  E.sonidoBloque = !!o.sonidoBloque; E.sonidoMeta = o.sonidoMeta !== false; E.decenas = o.decenas !== false;
  E.bloques = Math.max(0, num(o.bloques, 0)); E.meta = !!o.meta;
  E.estaciones = Array.isArray(o.estaciones) ? o.estaciones.filter(n => typeof n === 'number') : [];
  /* lo que corría al recargar sigue corriendo: se retoma en pausa, no de
     un tirón, para no sorprender a nadie con un reloj ya en marcha */
  E.acumMs = Math.max(0, num(o.acumMs, 0));
  E.bloqueInicioMs = Math.max(0, num(o.bloqueInicioMs, 0));
  E.t0 = null;
}

/* ── la rueda de sesenta marcas ───────────────────────────────────── */
let marcasHTML = '';
for (let i = 0; i < 60; i++) marcasHTML += `<rect x="116.5" y="10" width="7" height="22" rx="3.5" class="cuenta" data-i="${i}" transform="rotate(${i * 6} 120 120)"/>`;
/* el centro dibuja minutos : segundos, como en los demás cronómetros */
$rueda.innerHTML = `<g>${marcasHTML}</g><text x="120" y="120" class="bl-cifra" id="bl-cifra-central"></text>`;
const $cuentas = $$('.cuenta', $rueda);
const svgTxt = $('#bl-cifra-central', $rueda);

function tickActual() {
  const seg = duracionSeg();
  return Math.min(59, Math.floor(segBloque() * 60 / seg));
}
function pintarRueda() {
  const tick = tickActual();
  $cuentas.forEach((c, i) => {
    c.classList.toggle('llena', i < tick);
    c.classList.toggle('par', E.decenas && Math.floor(i / 10) % 2 === 1);
  });
  /* el centro es siempre el tiempo real transcurrido (minutos : segundos
     desde que se le dio a «Empezar»), sin importar cuánto dure un bloque:
     con la duración por defecto de un minuto coincide exactamente con
     bloques completos : segundos del bloque en curso */
  const segTotal = Math.floor(elapsedMs() / 1000);
  const mm = Math.floor(segTotal / 60), ss = segTotal % 60;
  svgTxt.innerHTML = `${mm}<tspan class="sep">:</tspan>${String(ss).padStart(2, '0')}`;
}

/* ── audio simple, sin recursos externos ─────────────────────────── */
let audioCtx = null;
function beep(f, d = .16) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = f; o.type = 'sine';
    g.gain.setValueAtTime(.14, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + d);
  } catch (e) { /* sin audio, la herramienta sigue funcionando */ }
}

/* ── Pantalla despierta mientras corre ─────────────────────────────── */
let candado = null;
async function despertar(si) {
  try {
    if (si && !candado && navigator.wakeLock && document.visibilityState === 'visible') {
      candado = await navigator.wakeLock.request('screen');
      candado.addEventListener('release', () => { candado = null; });
    } else if (!si && candado) {
      const c = candado; candado = null; await c.release();
    }
  } catch (e) { candado = null; }
}

/* ── la bandeja: un bloque por cada vez que la rueda se completa ─────
   El color alterna por grupo (el tamaño que se eligió en «Agrupar de»),
   con petróleo claro y hondo — el terracota queda solo para el bloque
   final, así no se confunde con el agrupamiento. */
function metaActual() { return E.objetivo === 'personalizado' ? (parseInt(E.personalizado, 10) || 1) : E.objetivo; }
function tamGrupo() { return E.agrupa === 'libre' ? 0 : Number(E.agrupa); }
/* la caja no tiene un ancho fijo: se calcula según cuántos bloques le
   tocan, en una forma más ancha que alta, y queda reservada desde el
   principio — de a uno por fila hasta cinco, como se pidió; recién ahí
   empieza a repartirse en varias filas */
function dimensionarBandeja(meta) {
  const enPantallaCompleta = document.documentElement.classList.contains('pc');
  const BLOQUE = enPantallaCompleta ? 44.8 : 36.8, GAP = 8, PAD = 20;
  const cols = Math.max(1, Math.min(meta, Math.max(5, Math.ceil(Math.sqrt(meta * 2.2)))));
  $bandeja.style.width = Math.round(cols * BLOQUE + (cols - 1) * GAP + PAD) + 'px';
}
let infoRetirada = false;
function pintarBandeja() {
  const meta = metaActual();
  $metaN.textContent = String(meta);
  dimensionarBandeja(meta);
  const grupo = tamGrupo();
  let h = '';
  for (let i = 0; i < E.bloques; i++) {
    const esUltimo = i === E.bloques - 1 && E.bloques === meta;
    const impar = grupo > 0 && Math.floor(i / grupo) % 2 === 1;
    const cierra = grupo > 0 && (i + 1) % grupo === 0 && i !== E.bloques - 1;
    h += `<div class="bl-bloque${esUltimo ? ' ultimo' : impar ? ' impar' : ''}${cierra ? ' cierra-grupo' : ''}"></div>`;
  }
  $bandeja.innerHTML = h;
  /* al primer bloque, la información se retira sola, como en Actividad */
  if (!infoRetirada && E.bloques > 0) { infoRetirada = true; abrirInfo(false); }
}

/* ── estado y señales ─────────────────────────────────────────────── */
function calcularEstado() {
  if (E.meta) return 'cumplida';
  if (corre() && E.senal && tickActual() >= 50) return 'final';
  if (corre()) return 'marcha';
  if (E.bloques > 0 || elapsedMs() > 0) return 'pausa';
  return 'listo';
}
const TXT_ESTADO = { listo: 'Listo', marcha: 'En marcha', pausa: 'En pausa', final: 'Últimos segundos', cumplida: 'Meta cumplida' };
function pintarEstado() {
  const e = calcularEstado();
  if ($pieza.dataset.e !== e) { $pieza.dataset.e = e; $estadoTxt.textContent = TXT_ESTADO[e]; }
}

function actualizarBotones() {
  $icoMarcha.setAttribute('href', corre() ? '#i-pausa' : '#i-marcha');
  $btnMarcha.setAttribute('aria-label', corre() ? 'Pausar' : (E.bloques > 0 || elapsedMs() > 0 ? 'Seguir' : 'Empezar'));
  $btnMarcha.title = $btnMarcha.getAttribute('aria-label');
  $btnEstacion.hidden = E.modo !== 'estaciones';
  $tiraEst.hidden = E.estaciones.length === 0;
}

/* ── el reloj ─────────────────────────────────────────────────────── */
/* la duración de un bloque no está fija en un minuto: la rueda sigue
   teniendo sesenta marcas, pero cada una vale «duración ÷ 60» del tiempo
   real, así que con la duración por defecto (1 min) cada marca sigue
   siendo, literalmente, un segundo */
function duracionMin() { return E.duracion === 'personalizado' ? (parseInt(E.duracionPersonal, 10) || 1) : E.duracion; }
function duracionSeg() { return duracionMin() * 60; }
function segBloque() { return Math.max(0, Math.floor((elapsedMs() - E.bloqueInicioMs) / 1000)); }

let bucle = 0, avisado50 = false;
function paso() {
  const totalSeg = duracionSeg();
  if (segBloque() >= totalSeg) {
    /* += y no =: si el equipo estuvo un rato sin atender y se completó
       más de un bloque de una vez, cada uno cuenta con su duración
       exacta en vez de perder el sobrante contra el reloj real */
    E.bloqueInicioMs += totalSeg * 1000;
    E.bloques += 1;
    avisado50 = false;
    if (E.sonidoBloque) beep(660);
    pintarBandeja();
    const meta = metaActual();
    if (E.bloques >= meta) {
      E.bloques = meta;
      E.meta = true;
      E.acumMs = elapsedMs(); E.t0 = null;
      $pieza.classList.add('halo');
      if (E.sonidoMeta) { beep(660); setTimeout(() => beep(880), 150); setTimeout(() => beep(1100), 320); }
      despertar(false);
    }
  } else if (E.avisar && tickActual() >= 50 && !avisado50) {
    avisado50 = true;
  }
  pintarRueda(); pintarEstado(); actualizarBotones();
  guardarLuego();
  if (corre() && !E.meta) bucle = setTimeout(paso, 250);
}

function alternar() {
  if (E.meta) return;
  if (corre()) { E.acumMs = elapsedMs(); E.t0 = null; clearTimeout(bucle); }
  else { E.t0 = performance.now(); bucle = setTimeout(paso, 250); }
  pintarEstado(); actualizarBotones(); guardar();
  despertar(corre());
}

let reinicioT = 0;
function pedirReinicio() {
  if (!$btnReiniciar.classList.contains('confirmar')) {
    $btnReiniciar.classList.add('confirmar');
    $btnReiniciar.title = 'Toca otra vez para reiniciar';
    clearTimeout(reinicioT);
    reinicioT = setTimeout(volverReinicio, 3000);
    return;
  }
  volverReinicio();
  reiniciar();
}
function volverReinicio() {
  clearTimeout(reinicioT);
  $btnReiniciar.classList.remove('confirmar');
  $btnReiniciar.title = 'Reiniciar';
}
function reiniciar() {
  clearTimeout(bucle);
  E.acumMs = 0; E.t0 = null; E.bloqueInicioMs = 0;
  E.bloques = 0; E.meta = false; avisado50 = false;
  $pieza.classList.remove('halo');
  pintarRueda(); pintarBandeja(); pintarEstado(); actualizarBotones(); guardar();
  despertar(false);
}
function nuevaEstacion() {
  if (E.bloques > 0 || elapsedMs() > 0) {
    E.estaciones.push(E.bloques);
    $tiraEst.innerHTML = E.estaciones.map((n, i) => `<span>Estación ${i + 1} · ${n}</span>`).join('');
  }
  clearTimeout(bucle);
  E.acumMs = 0; E.t0 = null; E.bloqueInicioMs = 0;
  E.bloques = 0; E.meta = false; avisado50 = false;
  $pieza.classList.remove('halo');
  pintarRueda(); pintarBandeja(); pintarEstado(); actualizarBotones(); guardar();
  despertar(false);
}

/* ── ajustes: segmentados ─────────────────────────────────────────── */
function segmentado(id, onCambio) {
  const cont = $(id);
  $$('button', cont).forEach(b => b.addEventListener('click', () => {
    $$('button', cont).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    onCambio(b.dataset.v);
  }));
}
function marcarSegmentado(id, v) {
  $$('button', $(id)).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
}
segmentado('#seg-duracion', v => {
  E.duracion = v === 'personalizado' ? 'personalizado' : Number(v);
  $filaDuracionPersonal.hidden = v !== 'personalizado';
  pintarRueda(); guardar();
});
$durPersonal.addEventListener('input', () => {
  $durPersonal.value = $durPersonal.value.replace(/\D/g, '').slice(0, 2);
  E.duracionPersonal = Math.max(1, parseInt($durPersonal.value, 10) || 1);
  pintarRueda(); guardarLuego();
});
segmentado('#seg-objetivo', v => {
  E.objetivo = v === 'personalizado' ? 'personalizado' : Number(v);
  $filaPersonal.hidden = v !== 'personalizado';
  if (E.meta && E.bloques < metaActual()) { E.meta = false; $pieza.classList.remove('halo'); }
  pintarBandeja(); pintarEstado(); guardar();
});
$objPersonal.addEventListener('input', () => {
  $objPersonal.value = $objPersonal.value.replace(/\D/g, '').slice(0, 3);
  E.personalizado = Math.max(1, parseInt($objPersonal.value, 10) || 1);
  pintarBandeja(); guardarLuego();
});
segmentado('#seg-agrupa', v => { E.agrupa = v; pintarBandeja(); guardar(); });
segmentado('#seg-modo', v => {
  E.modo = v;
  if (v === 'reto') {
    E.objetivo = 'personalizado'; E.personalizado = 8; $objPersonal.value = '8';
    marcarSegmentado('#seg-objetivo', 'personalizado');
    $filaPersonal.hidden = false;
    pintarBandeja();
  }
  actualizarBotones(); guardar();
});

$ajAvisar.addEventListener('change', () => { E.avisar = $ajAvisar.checked; guardar(); });
$ajSenal.addEventListener('change', () => { E.senal = $ajSenal.checked; pintarEstado(); guardar(); });
$ajSonidoBloque.addEventListener('change', () => { E.sonidoBloque = $ajSonidoBloque.checked; guardar(); });
$ajSonidoMeta.addEventListener('change', () => { E.sonidoMeta = $ajSonidoMeta.checked; guardar(); });
$ajDecenas.addEventListener('change', () => { E.decenas = $ajDecenas.checked; pintarRueda(); guardar(); });

/* ── campo de actividad ───────────────────────────────────────────── */
function ajustarDinamica() {
  $din.style.height = 'auto'; $din.style.height = $din.scrollHeight + 'px';
  $dinCampo.classList.toggle('lleno', $din.value.trim() !== '');
}
$din.addEventListener('input', () => { ajustarDinamica(); E.nombre = $din.value; guardarLuego(); });
/* la Lora del título llega por red: si se mide la altura antes de que
   cargue, la caja queda calculada con la tipografía de reserva. Se vuelve
   a medir cuando la fuente está lista, y también si el tamaño de letra
   cambia (al entrar o salir de pantalla completa, o si la ventana cambia
   de ancho). */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarDinamica);
if (window.ResizeObserver) new ResizeObserver(ajustarDinamica).observe($pieza);

/* ── información / ajustes: abrir y cerrar ────────────────────────── */
function abrirInfo(si) {
  $cuerpo.classList.toggle('con-info', si);
  $btnInfo.setAttribute('aria-pressed', String(si));
  $btnInfo.title = si ? 'Ocultar la información' : 'Información';
}
$btnInfo.addEventListener('click', () => abrirInfo(!$cuerpo.classList.contains('con-info')));

function abrirAjustes(si) {
  if (si) mostrar($ajustes); else ocultar($ajustes);
  $btnAjustes.setAttribute('aria-expanded', String(si));
}
$btnAjustes.addEventListener('click', () => abrirAjustes(!abierto($ajustes)));
$ajCerrar.addEventListener('click', () => abrirAjustes(false));
document.addEventListener('click', e => {
  if (abierto($ajustes) && !e.target.closest('.ajustes') && !e.target.closest('#btn-ajustes')) abrirAjustes(false);
});

/* ── pantalla completa ────────────────────────────────────────────── */
/* Igual que en los demás cronómetros: la clase va en <html>, la pide el
   navegador, y si el navegador no la concede (o no existe la API) hay un
   respaldo que ocupa la ventana igual. A diferencia de los demás, aquí
   nada se cierra solo al entrar o salir — «la misma composición, solo
   con la rueda más grande» — así que `sincronizarPC` no toca ni la
   información ni los ajustes. */
const raiz = document.documentElement;
let pcRespaldo = false;
const pcNativa = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const enPC = () => pcNativa() || pcRespaldo;
function sincronizarPC() { pintarPC(); }
function pintarPC() {
  const si = enPC();
  raiz.classList.toggle('pc', si);
  $pantallaIco.setAttribute('href', si ? '#i-reducir' : '#i-ampliar');
  $btnPantalla.setAttribute('aria-label', si ? 'Salir de pantalla completa' : 'Pantalla completa');
  $btnPantalla.title = $btnPantalla.getAttribute('aria-label');
  dimensionarBandeja(metaActual());
}
const esTactil = () => window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
function fijarHorizontal() {
  if (!esTactil() || !screen.orientation || typeof screen.orientation.lock !== 'function') return;
  try { const r = screen.orientation.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (e) { /* no se puede: da igual */ }
}
function soltarOrientacion() {
  if (!esTactil() || !screen.orientation || typeof screen.orientation.unlock !== 'function') return;
  try { screen.orientation.unlock(); } catch (e) { /* nada */ }
}
function entrarPC() {
  const pedirla = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
  const respaldo = () => { pcRespaldo = true; sincronizarPC(); };
  if (!pedirla) { respaldo(); return; }
  try {
    const r = pedirla.call(raiz, { navigationUI: 'hide' });
    if (r && typeof r.then === 'function') { r.then(fijarHorizontal, respaldo); }
    else fijarHorizontal();
  } catch (e) { respaldo(); }
}
function salirPC() {
  if (pcNativa()) {
    const salir = document.exitFullscreen || document.webkitExitFullscreen;
    try { const r = salir && salir.call(document); if (r && r.catch) r.catch(() => {}); } catch (e) { /* nada */ }
  }
  soltarOrientacion();
  pcRespaldo = false;
  sincronizarPC();
}
const alternarPC = () => (enPC() ? salirPC() : entrarPC());
document.addEventListener('fullscreenchange', sincronizarPC);
document.addEventListener('webkitfullscreenchange', sincronizarPC);
$btnPantalla.addEventListener('click', alternarPC);

/* ── mandos ────────────────────────────────────────────────────────── */
$btnMarcha.addEventListener('click', alternar);
$btnReiniciar.addEventListener('click', pedirReinicio);
$btnEstacion.addEventListener('click', nuevaEstacion);

/* ── pestaña oculta y salida ──────────────────────────────────────────
   Guardar al ocultarse o al salir: si se cierra la pestaña o se recarga
   a media clase, el progreso no se pierde. El bloqueo de pantalla se
   suelta solo al ocultarse (lo hace el propio navegador) y hay que
   volver a pedirlo al regresar si el reloj seguía corriendo. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { guardar(); }
  else if (corre()) { despertar(true); }
});
window.addEventListener('pagehide', guardar);

/* ── la carga de la casa se retira cuando todo está listo ─────────────
   Igual que en los demás cronómetros: dura al menos lo que tarda en
   componerse el isotipo, y como máximo lo que tarden en llegar las
   fuentes — nunca deja la pantalla en blanco ni se queda pegada. */
function fuentesListas() {
  const link = document.getElementById('fuentes');
  const hoja = new Promise(res => {
    if (!link || link.dataset.lista) { res(); return; }
    link.addEventListener('load', res, { once: true });
    link.addEventListener('error', res, { once: true });
  });
  return hoja.then(() => {
    if (!document.fonts || typeof document.fonts.load !== 'function') return null;
    return Promise.all(['700 1em Lora', '800 1em Nunito', '600 1em Nunito', '600 1em "Source Code Pro"']
      .map(f => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready);
  }).catch(() => null);
}
function retirarCarga() {
  const carga = $('#carga');
  if (!carga) return;
  const t0 = typeof window.S321_CARGA_T0 === 'number' ? window.S321_CARGA_T0 : 0;
  const minimo = reducido() ? 800 : Math.max(800, t0 + 1200);
  const tope = new Promise(res => setTimeout(res, Math.max(0, 3200 - performance.now())));
  Promise.race([fuentesListas(), tope]).then(() => {
    setTimeout(() => {
      carga.classList.add('fuera');
      carga.setAttribute('aria-hidden', 'true');
      setTimeout(() => { carga.hidden = true; }, 320);
    }, Math.max(0, minimo - performance.now()));
  });
}

/* ── teclado ───────────────────────────────────────────────────────── */
const escribiendo = el => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox'));
document.addEventListener('keydown', e => {
  if (escribiendo(e.target)) return;
  if (e.key === ' ') { e.preventDefault(); alternar(); }
  else if (e.key.toLowerCase() === 'r') pedirReinicio();
  else if (e.key.toLowerCase() === 'p') alternarPC();
});

/* ── arranque ─────────────────────────────────────────────────────── */
cargar();
$din.value = E.nombre;
marcarSegmentado('#seg-duracion', E.duracion);
marcarSegmentado('#seg-objetivo', E.objetivo);
marcarSegmentado('#seg-agrupa', E.agrupa);
marcarSegmentado('#seg-modo', E.modo);
$filaDuracionPersonal.hidden = E.duracion !== 'personalizado';
$filaPersonal.hidden = E.objetivo !== 'personalizado';
$durPersonal.value = String(E.duracionPersonal);
$objPersonal.value = String(E.personalizado);
$ajAvisar.checked = E.avisar; $ajSenal.checked = E.senal;
$ajSonidoBloque.checked = E.sonidoBloque; $ajSonidoMeta.checked = E.sonidoMeta; $ajDecenas.checked = E.decenas;
if (E.meta) $pieza.classList.add('halo');
if (E.estaciones.length) $tiraEst.innerHTML = E.estaciones.map((n, i) => `<span>Estación ${i + 1} · ${n}</span>`).join('');
abrirInfo(true);
ajustarDinamica();
pintarRueda();
pintarBandeja();
pintarEstado();
actualizarBotones();
retirarCarga();
})();
