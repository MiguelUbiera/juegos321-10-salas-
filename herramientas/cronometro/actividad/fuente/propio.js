/* ═══════════════════════════════════════════════════════════════════════
   Secuencia321 · Cronómetro de actividad · guion
   Fuente de index.html: se corrige aquí y se vuelve a construir.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
'use strict';

/* ── Utilidades ─────────────────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const TITULO = 'Cronómetro de actividad';
const TITULO_PAGINA = 'Cronómetro de actividad · Secuencia321';
const CLAVE = 's321-cronometro-actividad';
const VERSION = 3;
const MENOS = '−';                 // el menos tipográfico
const MAX_MARCAS = 500;
const MAX_RONDAS = 20;                 // las más viejas se van dejando caer
const META_MAX = 180 * 60000;          // tres horas
const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = (n, extra = '') => `<svg class="ico"${extra} aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ── Notación: punto decimal, como se escribe en la República Dominicana ─ */
const dos = n => String(n).padStart(2, '0');
const PASO = [1000, 100, 10, 1];        // milisegundos por unidad según la precisión
const cortar = (ms, p) => Math.floor(Math.max(0, ms) / PASO[p]) * PASO[p];
function partes(ms, p) {
  ms = cortar(ms, p);
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return {
    principal: h > 0 ? `${h}:${dos(m)}:${dos(ss)}` : `${dos(m)}:${dos(ss)}`,
    frac: p > 0 ? '.' + String(Math.floor((ms % 1000) / PASO[p])).padStart(p, '0') : ''
  };
}
/* 03:42.6 · 1:05:57.3 */
const enReloj = (ms, p) => { const x = partes(ms, p); return x.principal + x.frac; };
/* duraciones: «45.8 s» bajo el minuto y «1:45.6» por encima; con signo, «+1:45.6» */
function duracion(ms, p, conSigno) {
  const a = cortar(Math.abs(ms), p);
  let t;
  if (a < 60000) t = (a / 1000).toFixed(p) + ' s';
  else { const x = partes(a, p); t = x.principal.replace(/^0(?=\d:)/, '') + x.frac; }
  return (ms < 0 && a > 0 ? MENOS : conSigno ? '+' : '') + t;
}
/* la meta: «5:00», «45 s», «1:00:00» */
function metaPartes(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return { n: String(s), u: ' s' };
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return { n: h > 0 ? `${h}:${dos(m)}:${dos(ss)}` : `${m}:${dos(ss)}`, u: '' };
}
/* el exceso sobre la meta: «+0:32», «+1:02:05» */
function exceso(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return '+' + (h > 0 ? `${h}:${dos(m)}:${dos(ss)}` : `${m}:${dos(ss)}`);
}
/* ancho de la cifra en em: en Source Code Pro cada signo mide 0.6 em;
   los dos puntos se estrechan 0.14 y la fracción va a 0.46 */
function emDe(x) {
  const seps = (x.principal.match(/:/g) || []).length;
  const digitos = x.principal.length - seps;
  return digitos * 0.6 + seps * 0.46 + (x.frac ? x.frac.length * 0.6 * 0.46 + 0.02 : 0);
}

/* ── Estado ─────────────────────────────────────────────────────────── */
/* La lista de marcas es una ronda. La que corre está en `marcas`; las que
   ya terminaron se archivan en `rondas` al reiniciar, y de ahí sale la
   comparación. `viendo` es la ronda guardada que se está mirando, si alguna. */
const E = {
  nombre: '', conMeta: true, meta: 300000, p: 0, avisar: true, sonido: false,
  marcas: [], encabezado: '', ocultas: true, plegada: false, info: true,
  rondas: [], viendo: null,
  conCupo: false, cupo: 4,
  acum: 0, t0: null
};
let sigId = 1, sigRonda = 1;
let cumplidaAvisada = false, cupoAvisado = false;
const corre = () => E.t0 !== null;
/* El tiempo sale del reloj del sistema, nunca de contar saltos de un
   temporizador: así no se atrasa aunque se cambie de pestaña. */
const tiempo = (ahora = performance.now()) => E.acum + (corre() ? ahora - E.t0 : 0);

/* ── Memoria: si la página se recarga, sigue donde iba ─────────────── */
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      v: VERSION, nombre: E.nombre, conMeta: E.conMeta, meta: E.meta, p: E.p, avisar: E.avisar, sonido: E.sonido,
      marcas: E.marcas.map(m => ({ ms: m.ms, nombre: m.nombre })), encabezado: E.encabezado,
      rondas: E.rondas.map(r => ({ base: r.base, n: r.n, p: r.p, fecha: r.fecha, marcas: r.marcas.map(m => ({ ms: m.ms, nombre: m.nombre })) })),
      ocultas: E.ocultas, plegada: E.plegada, info: E.info, conCupo: E.conCupo, cupo: E.cupo,
      acum: tiempo(), corriendo: corre(), reloj: Date.now()
    }));
  } catch (e) { /* sin memoria en este navegador: la herramienta sigue funcionando */ }
}
let guardarT = 0;
const guardarLuego = () => { clearTimeout(guardarT); guardarT = setTimeout(guardar, 350); };
function cargar() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { o = null; }
  if (!o || o.v !== VERSION) return;
  const txt = (v, max) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  E.nombre = typeof o.nombre === 'string' ? o.nombre.replace(/[\r\n]+/g, ' ').slice(0, 70) : '';
  E.conMeta = o.conMeta !== false;
  E.meta = Number.isFinite(o.meta) ? Math.min(Math.max(Math.round(o.meta / 1000) * 1000, 1000), META_MAX) : 300000;
  E.p = 0;                             /* ya no se elige: siempre segundos */
  E.avisar = o.avisar !== false;
  E.sonido = o.sonido === true;
  E.encabezado = txt(o.encabezado, 28);
  E.ocultas = o.ocultas === true;
  E.plegada = o.plegada === true;
  E.info = o.info !== false;
  E.conCupo = o.conCupo === true;
  E.cupo = Number.isFinite(o.cupo) ? Math.min(Math.max(Math.round(o.cupo), 1), MAX_MARCAS) : 4;
  const leerMarcas = v => (Array.isArray(v) ? v : [])
    .filter(m => m && Number.isFinite(m.ms) && m.ms >= 0).slice(0, MAX_MARCAS)
    .map(m => ({ id: sigId++, ms: Math.floor(m.ms), nombre: txt(m.nombre, 40) }));
  E.marcas = leerMarcas(o.marcas);
  E.rondas = (Array.isArray(o.rondas) ? o.rondas : []).slice(-MAX_RONDAS)
    .map(r => r && Array.isArray(r.marcas) ? {
      id: sigRonda++, base: txt(r.base, 28) || 'Marcas',
      n: Number.isFinite(r.n) && r.n > 0 ? Math.floor(r.n) : 1,
      p: [0, 1, 2, 3].includes(r.p) ? r.p : 1,
      fecha: Number.isFinite(r.fecha) ? r.fecha : 0,
      marcas: leerMarcas(r.marcas)
    } : null)
    .filter(r => r && r.marcas.length);
  let acum = Number.isFinite(o.acum) ? Math.max(0, o.acum) : 0;
  if (o.corriendo === true && Number.isFinite(o.reloj)) {
    acum += Math.max(0, Date.now() - o.reloj);
    E.acum = acum; E.t0 = performance.now();
  } else E.acum = acum;
  cumplidaAvisada = E.conMeta && tiempo() >= E.meta;
  cupoAvisado = E.conCupo && E.marcas.length >= E.cupo;
}

/* ── Referencias ────────────────────────────────────────────────────── */
const $pieza = $('#pieza'), $cuerpo = $('#cuerpo'), $reloj = $('#reloj'), $cifra = $('#cifra'),
  $estadoTxt = $('#estado-txt'), $sombra = $('#sombra'), $sombraIco = $('#sombra-ico'),
  $metaLleno = $('#meta-lleno'), $metaValor = $('#meta-valor'), $metaDer = $('#meta-der'),
  $btnMarcha = $('#btn-marcha'), $marchaIco = $('#marcha-ico'), $marchaTxt = $('#marcha-txt'),
  $btnMarca = $('#btn-marca'), $marcaCupo = $('#marca-cupo'), $btnReiniciar = $('#btn-reiniciar'), $reiniciarTxt = $('#reiniciar-txt'),
  $clipCaja = $('#clip-caja'), $btnClip = $('#btn-clip'), $clipN = $('#clip-n'), $clipMenu = $('#clip-menu'),
  $menuVerLi = $('#menu-ver-li'), $menuBorrarLi = $('#menu-borrar-li'), $menuVer = $('#menu-ver'), $menuVerTxt = $('#menu-ver-txt'), $menuVerIco = $('#menu-ver-ico'), $menuBorrar = $('#menu-borrar'),
  $menuBorrarTxt = $('#menu-borrar-txt'), $menuCompararLi = $('#menu-comparar-li'), $menuComparar = $('#menu-comparar'),
  $menuCompararTxt = $('#menu-comparar-txt'), $menuVaciarLi = $('#menu-vaciar-li'), $menuVaciar = $('#menu-vaciar'),
  $menuVaciarTxt = $('#menu-vaciar-txt'), $menuGuardadaLi = $('#menu-guardada-li'),
  $menuGuardada = $('#menu-guardada'), $menuGuardadaTxt = $('#menu-guardada-txt'),
  $lista = $('#lista'), $listaTitulo = $('#lista-titulo'), $listaMarcas = $('#lista-marcas'),
  $listaLapiz = $('#lista-lapiz'), $listaPlegar = $('#lista-plegar'), $listaVolver = $('#lista-volver'),
  $rondasCaja = $('#rondas-caja'), $listaMenu = $('#lista-menu'), $rondasMenu = $('#rondas-menu'),
  $cmpVelo = $('#cmp-velo'), $comparar = $('#comparar'), $cmpSub = $('#cmp-sub'), $cmpMarco = $('#cmp-marco'),
  $cmpNota = $('#cmp-nota'), $cmpCerrar = $('#cmp-cerrar'),
  $din = $('#dinamica'), $dinCampo = $('#dinamica-campo'),
  $btnAjustes = $('#btn-ajustes'), $ajustes = $('#ajustes'), $ajCerrar = $('#ajustes-cerrar'),
  $ajMeta = $('#aj-meta'), $ajMin = $('#aj-min'), $ajSeg = $('#aj-seg'), $ajAvisar = $('#aj-avisar'), $ajSonido = $('#aj-sonido'),
  $ajCupo = $('#aj-cupo'), $ajCupoN = $('#aj-cupo-n'),
  $btnPantalla = $('#btn-pantalla'), $pantallaIco = $('#pantalla-ico'),
  $btnInfo = $('#btn-info'), $info = $('#info'), $infoInt = $('.info-int'),
  $aviso = $('#aviso'), $avisoTxt = $('#aviso-txt'), $avisoDeshacer = $('#aviso-deshacer');

/* ── Dibujar ────────────────────────────────────────────────────────── */
let cifraHecha = '', emHecho = 0, metaDerHecha = '', metaAnchoHecho = -1, tituloHecho = '', tramoActual = 'nada', raf = 0;

function pintarCifra(t) {
  const x = partes(t, E.p);
  const html = x.principal.replace(/:/g, '<span class="sep">:</span>') + (x.frac ? `<span class="frac">${x.frac}</span>` : '');
  if (html !== cifraHecha) { $cifra.innerHTML = html; cifraHecha = html; }
  const em = Math.round(emDe(x) * 1000) / 1000;
  if (em !== emHecho) { emHecho = em; $reloj.style.setProperty('--em', String(em)); }
}

/* la bandera dice que eso es la meta: la palabra sobra en pantalla,
   pero se queda para quien la escucha */
function pintarMetaValor() {
  const m = metaPartes(E.meta);
  $metaValor.innerHTML = `<span class="oculto">Meta </span><span class="num">${m.n}</span>${m.u}`;
}

function pintarMeta(t) {
  if (!E.conMeta) return;
  const f = Math.min(1, t / E.meta);
  const w = Math.round(f * 1000) / 10;
  if (w !== metaAnchoHecho) { $metaLleno.style.width = w + '%'; metaAnchoHecho = w; }
  let html;
  if (t < E.meta) html = `<span class="num">${Math.floor(f * 100)}</span> %`;
  else if (t - E.meta < 1000) html = 'Meta cumplida';
  else html = `<span class="num">${exceso(t - E.meta)}</span><span class="oculto"> sobre la meta</span>`;
  if (html !== metaDerHecha) {
    $metaDer.innerHTML = html; metaDerHecha = html;
    $metaDer.classList.toggle('pasada', t >= E.meta);
  }
}

/* los tramos de la meta: aviso, final y meta cumplida */
function tramoDe(t) {
  if (!E.conMeta) return 'nada';
  const falta = E.meta - t;
  if (falta <= 0) return 'cumplida';
  if (!E.avisar) return 'nada';
  if (falta <= Math.min(10000, 0.2 * E.meta)) return 'final';
  if (falta <= Math.min(60000, 0.25 * E.meta)) return 'aviso';
  return 'nada';
}
/* el pulso del tramo final va al compás del segundo */
const fijarFase = t => $pieza.style.setProperty('--fase', `${-Math.round(t % 1000)}ms`);

function aplicarTramo(tr, t) {
  if (tr !== 'cumplida' && E.conMeta && t < E.meta) cumplidaAvisada = false;
  if (tr === tramoActual) return;
  tramoActual = tr;
  $pieza.dataset.tramo = tr;
  if (tr === 'final') fijarFase(t);
  if (tr === 'cumplida' && corre() && !cumplidaAvisada) {
    cumplidaAvisada = true;
    halo();
    if (E.sonido) campana();
  }
}

function pintarEstado(t) {
  const c = corre();
  let e = 'listo', txt = 'Listo';
  if (c && tramoActual === 'cumplida') { e = 'cumplida'; txt = 'Meta cumplida'; }
  else if (c && tramoActual === 'final') { e = 'final'; txt = 'Últimos segundos'; }
  else if (c) { e = 'marcha'; txt = 'En marcha'; }
  else if (t > 0) { e = 'pausa'; txt = 'En pausa'; }
  if ($pieza.dataset.e !== e) { $pieza.dataset.e = e; $estadoTxt.textContent = txt; }
}

function pintarTitulo(t) {
  const txt = corre() ? `${partes(t, 0).principal} · ${TITULO}` : TITULO_PAGINA;
  if (txt !== tituloHecho) { document.title = txt; tituloHecho = txt; }
}

function pintar(ahora = performance.now()) {
  const t = tiempo(ahora);
  pintarCifra(t);
  pintarMeta(t);
  aplicarTramo(tramoDe(t), t);
  pintarEstado(t);
  pintarTitulo(t);
}
/* se dibuja cuadro a cuadro solo mientras corre */
function bucle(ahora) { raf = 0; pintar(ahora); if (corre()) raf = requestAnimationFrame(bucle); }
function pedir() { if (!raf && corre()) raf = requestAnimationFrame(bucle); }

function etiqueta(apila, clave) { $$('[data-l]', apila).forEach(s => s.classList.toggle('ve', s.dataset.l === clave)); }

function actualizar() {
  const c = corre(), t = tiempo();
  etiqueta($marchaTxt, c ? 'pausar' : t > 0 ? 'seguir' : 'iniciar');
  $marchaIco.setAttribute('href', c ? '#i-pausa' : '#i-marcha');
  $btnMarcha.title = c ? 'Pausar' : t > 0 ? 'Seguir' : 'Iniciar';
  $btnMarca.disabled = !c;
  $pieza.classList.toggle('corre', c);
  $pieza.classList.toggle('sin-meta', !E.conMeta);
  if (!E.conMeta && tramoActual !== 'nada') { tramoActual = 'nada'; $pieza.dataset.tramo = 'nada'; }
  pintar();
  if (c) pedir();
  despertar(c);
  avivarMandos();
}

/* ── Señales: la sombra, el halo y la campana ───────────────────────── */
function sombra(tipo) {
  if (reducido() || typeof $sombra.animate !== 'function') return;
  $sombraIco.setAttribute('href', tipo === 'pausa' ? '#i-pausa' : '#i-marcha');
  $sombra.getAnimations().forEach(a => a.cancel());
  $sombra.animate([
    { opacity: 0, transform: 'scale(.9)' },
    { opacity: .12, transform: 'scale(.97)', offset: .1875 },
    { opacity: .12, transform: 'scale(1)', offset: .4375 },
    { opacity: 0, transform: 'scale(1.06)' }
  ], { duration: 800, easing: 'ease-out' });
}
let haloT = 0;
function halo() {
  if (reducido()) return;
  $pieza.classList.add('halo');
  clearTimeout(haloT);
  haloT = setTimeout(() => $pieza.classList.remove('halo'), 150);
}
let audio = null;
function prepararAudio() {
  try {
    if (!audio) { const C = window.AudioContext || window.webkitAudioContext; if (C) audio = new C(); }
    if (audio && audio.state === 'suspended') audio.resume();
  } catch (e) { audio = null; }
}
/* una campana sintetizada: dos golpes con los parciales de una campana */
function campana() {
  if (!audio) return;
  try {
    const salida = audio.createGain();
    salida.gain.value = .9;
    salida.connect(audio.destination);
    const golpe = (cuando, f, vol) => {
      [[1, 1], [2, .5], [2.76, .32], [5.4, .14], [8.93, .06]].forEach(([r, g]) => {
        const o = audio.createOscillator(), a = audio.createGain(), dur = 1.9 / Math.sqrt(r);
        o.type = 'sine';
        o.frequency.setValueAtTime(f * r, cuando);
        a.gain.setValueAtTime(.0001, cuando);
        a.gain.exponentialRampToValueAtTime(vol * g, cuando + .008);
        a.gain.exponentialRampToValueAtTime(.0001, cuando + dur);
        o.connect(a); a.connect(salida);
        o.start(cuando); o.stop(cuando + dur + .05);
      });
    };
    const t0 = audio.currentTime + .02;
    golpe(t0, 880, .2);
    golpe(t0 + .34, 1318.5, .17);
  } catch (e) { /* sin sonido */ }
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

/* la campana suena a su hora aunque la pestaña esté oculta */
let metaT = 0;
function programarMeta() {
  clearTimeout(metaT);
  if (!corre() || !E.conMeta) return;
  const falta = E.meta - tiempo();
  if (falta > 0) metaT = setTimeout(() => pintar(), falta + 8);
}

/* ── Acciones ───────────────────────────────────────────────────────── */
function alternar() {
  const ahora = performance.now();
  if (corre()) { E.acum += ahora - E.t0; E.t0 = null; sombra('pausa'); }
  else { E.t0 = ahora; sombra('marcha'); }
  if (tramoActual === 'final') fijarFase(tiempo(ahora));
  guardar();
  actualizar();
  programarMeta();
}

/* El cupo: cuántas marcas hacen una ronda completa. Es solo un aviso —no
   bloquea ni archiva solo—: la cifra sobre el botón de Marca cuenta, y al
   llegar se tiñe y da un destello; reiniciar sigue siendo quien decide
   cuándo esa ronda pasa a la lista de guardadas. */
function aplicarCupo() {
  $marcaCupo.hidden = !E.conCupo;
  if (!E.conCupo) { cupoAvisado = false; return; }
  const completa = E.marcas.length >= E.cupo;
  $marcaCupo.textContent = `${E.marcas.length} / ${E.cupo}`;
  $marcaCupo.classList.toggle('completa', completa);
  if (completa && !cupoAvisado) { cupoAvisado = true; halo(); }
  else if (!completa) cupoAvisado = false;
}

function marcar() {
  if (!corre() || E.marcas.length >= MAX_MARCAS) return;
  const m = { id: sigId++, ms: Math.floor(tiempo()), nombre: '' };
  E.viendo = null;                       /* una marca nueva devuelve a la ronda de ahora */
  E.marcas.push(m);
  if (E.marcas.length === 1 && E.info) { E.info = false; aplicarInfo(); }
  aplicarLista();
  pintarMarcas({ nueva: m.id });
  aplicarCupo();
  if (E.ocultas) latirClip();
  guardar();
}

/* Reiniciar no borra: archiva. La ronda que termina se guarda con su
   número y empieza otra vacía. Borrar sigue siendo un acto aparte. */
function archivarRonda() {
  if (!E.marcas.length) return null;
  const base = encabezado();
  const n = E.rondas.reduce((mx, r) => (r.base === base && r.n > mx ? r.n : mx), 0) + 1;
  const r = { id: sigRonda++, base, n, p: E.p, fecha: Date.now(), marcas: E.marcas };
  E.rondas.push(r);
  while (E.rondas.length > MAX_RONDAS) E.rondas.shift();
  return r;
}
const nombreRonda = r => `${r.base} ${r.n}`;

function reiniciar() {
  cerrarEdicion(true);
  cerrarComparar(false);
  E.viendo = null;
  const antes = tiempo();
  const r = archivarRonda();
  E.acum = 0; E.t0 = null; E.marcas = []; E.ocultas = true;
  cumplidaAvisada = false;
  tramoActual = '';
  ocultarAviso();
  cerrarClip(false);
  cerrarRondas(false);
  aplicarLista();
  pintarMarcas();
  aplicarCupo();
  actualizar();
  guardar();
  if (r) {
    const n = r.marcas.length;
    /* «Deshacer» deshace el reinicio entero: la ronda vuelve a estar en curso,
       con su tiempo, en pausa. */
    avisar(`Se guardó «${nombreRonda(r)}» con ${n === 1 ? '1 marca' : n + ' marcas'}`, () => {
      const i = E.rondas.indexOf(r);
      if (i >= 0) E.rondas.splice(i, 1);
      E.marcas = r.marcas;
      E.acum = antes; E.t0 = null;
      cumplidaAvisada = E.conMeta && antes >= E.meta;
      pintarMarcas();
      aplicarCupo();
      actualizar();
      guardar();
    });
  }
}

/* Reiniciar pide un segundo toque antes de 3 s: nadie borra una
   dinámica por un roce en la pizarra. */
let reinicioT = 0;
function volverReinicio() {
  clearTimeout(reinicioT);
  $btnReiniciar.classList.remove('confirmar');
  etiqueta($reiniciarTxt, 'reiniciar');
}
function pedirReinicio(origen) {
  if ($btnReiniciar.classList.contains('confirmar')) { volverReinicio(); reiniciar(); return; }
  $btnReiniciar.classList.add('confirmar');
  etiqueta($reiniciarTxt, 'toca');
  clearTimeout(reinicioT);
  reinicioT = setTimeout(volverReinicio, 3000);
}

/* ── El aviso que ofrece deshacer ──────────────────────────────────── */
let avisoT = 0, avisoDeshacer = null;
function avisar(texto, deshacer) {
  $avisoTxt.textContent = texto;
  avisoDeshacer = deshacer;
  $aviso.hidden = false;
  clearTimeout(avisoT);
  avisoT = setTimeout(ocultarAviso, 5000);
}
function ocultarAviso() { clearTimeout(avisoT); $aviso.hidden = true; avisoDeshacer = null; }
$avisoDeshacer.addEventListener('click', () => { const f = avisoDeshacer; ocultarAviso(); if (f) f(); });

/* ── Las marcas ─────────────────────────────────────────────────────── */
const encabezado = () => E.encabezado || 'Marcas';
const nombreDe = (m, i) => m.nombre || `Marca ${i + 1}`;
/* la ronda que se está mirando: la de ahora, o una guardada */
const rondaVista = () => (E.viendo === null ? null : E.rondas.find(r => r.id === E.viendo) || null);
const marcasVistas = () => { const r = rondaVista(); return r ? r.marcas : E.marcas; };
const pVista = () => { const r = rondaVista(); return r ? r.p : E.p; };
const tituloVista = () => { const r = rondaVista(); return r ? nombreRonda(r) : encabezado(); };
/* el parcial se calcula con las cifras que se ven, para que la resta cuadre */
const parcialDe = (lista, i, p) => cortar(lista[i].ms, p) - (i > 0 ? cortar(lista[i - 1].ms, p) : 0);
const parcial = i => parcialDe(E.marcas, i, E.p);
let editandoId = null;

function aplicarLista() {
  const mirando = rondaVista();
  const n = marcasVistas().length;
  const nR = E.rondas.length;
  const ver = n > 0 && !E.ocultas;
  $cuerpo.classList.toggle('con-lista', ver);
  $lista.setAttribute('aria-hidden', ver ? 'false' : 'true');
  $lista.inert = !ver;
  $lista.classList.toggle('mirando', !!mirando);
  $clipCaja.hidden = E.marcas.length === 0 && nR === 0;
  $clipN.hidden = nR === 0;
  $clipN.textContent = String(nR);
  /* el número cuenta rondas; que las marcas estén guardadas lo dice el color */
  $btnClip.classList.toggle('oculta', E.ocultas && E.marcas.length > 0);
  /* con rondas guardadas y la activa vacía, la única forma de llegar a una
     guardada es pedirla: la cabecera de la lista no está en pantalla */
  const soloGuardadas = nR > 0 && E.marcas.length === 0 && !mirando;
  $menuGuardadaLi.hidden = !soloGuardadas;
  if (soloGuardadas) $menuGuardadaTxt.textContent = nR === 1 ? 'Ver la ronda guardada' : `Ver la última ronda (${nombreRonda(E.rondas[nR - 1])})`;
  $menuVerLi.hidden = n === 0 && !E.ocultas;
  $menuVerTxt.textContent = E.ocultas ? `Mostrar marcas (${n})` : 'Ocultar marcas';
  $menuVerIco.setAttribute('href', E.ocultas ? '#i-mostrar' : '#i-ocultar');
  $btnClip.setAttribute('aria-label', nR === 0 ? 'Opciones de las marcas'
    : nR === 1 ? 'Opciones de las marcas: 1 ronda guardada' : `Opciones de las marcas: ${nR} rondas guardadas`);
  $menuCompararLi.hidden = false;
  $menuCompararTxt.textContent = `Comparar rondas (${nR + (E.marcas.length ? 1 : 0)})`;
  $menuBorrarLi.hidden = E.marcas.length === 0;
  $menuBorrarTxt.textContent = 'Borrar la ronda activa';
  $menuVaciarLi.hidden = nR === 0;
  $menuVaciarTxt.textContent = nR === 1 ? 'Borrar la ronda guardada' : `Borrar las ${nR} rondas guardadas`;
  $rondasCaja.hidden = nR === 0;
  $listaLapiz.hidden = !!mirando || !!$('.lista-titulo-campo', $listaTitulo);
  $listaVolver.hidden = !mirando;
  $lista.classList.toggle('plegada', E.plegada);
  $listaPlegar.setAttribute('aria-expanded', E.plegada ? 'false' : 'true');
  $listaPlegar.setAttribute('aria-label', E.plegada ? 'Desplegar la lista' : 'Plegar la lista');
  const b = $('#lista-titulo-b');
  if (b) {
    b.textContent = tituloVista();
    b.title = mirando ? `${tituloVista()} · ronda guardada` : 'Cambiar el encabezado';
    b.disabled = !!mirando;
  }
  if (nR === 0 && abierto($rondasMenu)) cerrarRondas(false);
  if ($clipCaja.hidden && abierto($clipMenu)) cerrarClip(false);
}

function filaNormal(li, m, i) {
  const mirando = rondaVista();
  const p = pVista(), lista = marcasVistas();
  const nombre = nombreDe(m, i);
  li.className = 'm' + (m.nombre ? '' : ' sin-nombre') + (mirando ? ' quieta' : '');
  const cuerpo =
    `<span class="m-nombre">${esc(nombre)}</span>` +
    `<span class="m-t">${enReloj(m.ms, p)}</span>` +
    `<span class="m-dif">${duracion(parcialDe(lista, i, p), p, true)}</span>`;
  if (mirando) {
    li.innerHTML =
      `<span class="m-n" aria-hidden="true">${i + 1}</span>` +
      `<span class="m-cuerpo" title="${esc(nombre)}">${cuerpo}</span>`;
    return;
  }
  li.innerHTML =
    `<span class="m-n" aria-hidden="true">${i + 1}</span>` +
    `<button type="button" class="m-cuerpo" data-editar="${m.id}" title="${esc(nombre)}" aria-label="${esc(`Marca ${i + 1}: ${nombre}, a los ${enReloj(m.ms, p)}. Cambiar el nombre`)}">` +
      cuerpo +
    `</button>` +
    `<button type="button" class="m-lapiz" data-editar="${m.id}" aria-label="${esc(`Editar la marca ${i + 1}`)}" title="Editar">${ico('lapiz')}</button>`;
}

function pintarMarcas(opc = {}) {
  const ol = $listaMarcas;
  const previas = new Map($$('li', ol).map(li => [li.dataset.id, li]));
  marcasVistas().forEach((m, i) => {
    const clave = String(m.id);
    let li = previas.get(clave);
    previas.delete(clave);
    if (!li) { li = document.createElement('li'); li.dataset.id = clave; }
    if (ol.children[i] !== li) ol.insertBefore(li, ol.children[i] || null);
    if (editandoId === m.id) {
      const n = $('.m-n', li); if (n) n.textContent = String(i + 1);
      const d = $('.m-dato', li); if (d) d.innerHTML = datoEdicion(m, i);
    } else filaNormal(li, m, i);
    if (opc.nueva === m.id) {
      li.classList.add('nueva');
      setTimeout(() => li.classList.remove('nueva'), 1300);
    }
  });
  previas.forEach(li => li.remove());
  aplicarLista();
  requestAnimationFrame(bordesLista);
  if (opc.nueva && editandoId === null) {
    requestAnimationFrame(() => ol.scrollTo({ top: ol.scrollHeight, behavior: reducido() ? 'auto' : 'smooth' }));
  }
}

const datoEdicion = (m, i) => `<b>${enReloj(m.ms, E.p)}</b> · ${duracion(parcial(i), E.p, true)}`;

function editarMarca(id) {
  if (editandoId === id) { const c = $(`#marca-nombre-${id}`); if (c) c.focus(); return; }
  cerrarEdicion(true);
  const i = E.marcas.findIndex(m => m.id === id);
  if (i < 0) return;
  const m = E.marcas[i];
  const li = $(`li[data-id="${id}"]`, $listaMarcas);
  if (!li) return;
  editandoId = id;
  li.className = 'm editando';
  li.innerHTML =
    `<span class="m-n" aria-hidden="true">${i + 1}</span>` +
    `<input type="text" class="m-campo" id="marca-nombre-${id}" maxlength="40" autocomplete="off" spellcheck="false" enterkeyhint="done" ` +
      `aria-label="${esc(`Nombre de la marca ${i + 1}`)}">` +
    `<div class="m-pie"><span class="m-dato">${datoEdicion(m, i)}</span>` +
      `<button type="button" class="m-accion m-quitar" data-quitar="${id}" aria-label="${esc(`Borrar la marca ${i + 1}`)}" title="Borrar la marca">${ico('basura')}</button>` +
      `<button type="button" class="m-accion m-guardar" data-guardar="${id}" aria-label="Guardar el nombre" title="Guardar">${ico('listo')}</button>` +
    `</div>`;
  const campo = $('.m-campo', li);
  /* los botones de la fila no le quitan el foco al campo: así, en la
     pizarra, el toque llega a su botón antes de que la fila se cierre */
  li.addEventListener('mousedown', e => { if (e.target.closest('.m-accion')) e.preventDefault(); });
  campo.value = m.nombre;
  campo.focus({ preventScroll: true });
  campo.select();
  li.scrollIntoView({ block: 'nearest', behavior: reducido() ? 'auto' : 'smooth' });
  campo.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); cerrarEdicion(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarEdicion(false); }
  });
  campo.addEventListener('blur', e => {
    if (e.relatedTarget && li.contains(e.relatedTarget)) return;
    setTimeout(() => { if (editandoId === id && !li.contains(document.activeElement)) cerrarEdicion(true); }, 0);
  });
}

function cerrarEdicion(guardarlo) {
  if (editandoId === null) return;
  const id = editandoId;
  const m = E.marcas.find(x => x.id === id);
  const campo = $(`#marca-nombre-${id}`);
  editandoId = null;
  if (m && campo && guardarlo) {
    m.nombre = campo.value.replace(/\s+/g, ' ').trim().slice(0, 40);
    guardar();
  }
  pintarMarcas();
}

function quitarMarca(id) {
  const i = E.marcas.findIndex(m => m.id === id);
  if (i < 0) return;
  editandoId = null;
  const [m] = E.marcas.splice(i, 1);
  pintarMarcas();
  aplicarCupo();
  guardar();
  avisar(m.nombre ? `Se borró «${m.nombre}»` : `Se borró la marca ${i + 1}`, () => {
    E.marcas.splice(Math.min(i, E.marcas.length), 0, m);
    pintarMarcas();
    aplicarCupo();
    guardar();
  });
}

function borrarMarcas() {
  const copia = E.marcas.slice(), ocultas = E.ocultas, n = copia.length;
  if (!n) return;
  cerrarEdicion(false);
  E.viendo = null;
  E.marcas = []; E.ocultas = true;
  pintarMarcas();
  aplicarCupo();
  guardar();
  avisar(n === 1 ? 'Se borró 1 marca' : `Se borraron ${n} marcas`, () => {
    E.marcas = copia.concat(E.marcas); E.ocultas = ocultas;
    pintarMarcas();
    aplicarCupo();
    guardar();
  });
}

function ocultarMarcas(si) {
  cerrarEdicion(true);
  E.ocultas = si;
  aplicarLista();
  guardar();
}

function vaciarRondas() {
  const copia = E.rondas.slice(), n = copia.length;
  if (!n) return;
  cerrarComparar(false);
  E.rondas = []; E.viendo = null;
  pintarMarcas();
  guardar();
  avisar(n === 1 ? 'Se borró la ronda guardada' : `Se borraron ${n} rondas guardadas`, () => {
    E.rondas = copia.concat(E.rondas);
    pintarMarcas();
    guardar();
  });
}

/* ── Las rondas: mirar una guardada o volver a la de ahora ──────────── */
function verRonda(id) {
  cerrarEdicion(true);
  E.viendo = id;
  if (E.ocultas) E.ocultas = false;
  pintarMarcas();
  $listaMarcas.scrollTop = 0;
  guardar();
}

function pintarRondasMenu() {
  const filas = E.rondas.slice().reverse().map(r => {
    const n = r.marcas.length;
    return `<li role="none"><button type="button" role="menuitem" data-ronda="${r.id}"${E.viendo === r.id ? ' aria-current="true"' : ''}>` +
      ico('bandera') +
      `<span class="r-nombre">${esc(nombreRonda(r))}</span>` +
      `<span class="r-n">${n}</span></button></li>`;
  });
  const hoy = `<li role="none"><button type="button" role="menuitem" data-ronda="ahora"${E.viendo === null ? ' aria-current="true"' : ''}>` +
    ico('reinicio') + `<span class="r-nombre">${esc(encabezado())} · la de ahora</span>` +
    `<span class="r-n">${E.marcas.length}</span></button></li>`;
  let html = hoy + filas.join('');
  html += `<li role="none" class="r-sep" aria-hidden="true"></li>` +
    `<li role="none"><button type="button" role="menuitem" data-comparar="1">${ico('ola')}<span>Comparar rondas</span></button></li>`;
  $rondasMenu.innerHTML = html;
}

let rondasPorTeclado = false;
function abrirRondas(porTeclado) {
  cerrarAjustes(false);
  cerrarClip(false);
  pintarRondasMenu();
  rondasPorTeclado = porTeclado;
  mostrar($rondasMenu);
  $listaMenu.setAttribute('aria-expanded', 'true');
  if (porTeclado) { const b = $('button', $rondasMenu); if (b) b.focus(); }
}
function cerrarRondas(devolverFoco) {
  if (!abierto($rondasMenu)) return;
  ocultar($rondasMenu);
  $listaMenu.setAttribute('aria-expanded', 'false');
  if (devolverFoco && rondasPorTeclado) $listaMenu.focus();
}
$listaMenu.addEventListener('click', e => { if (!abierto($rondasMenu)) abrirRondas(e.detail === 0); else cerrarRondas(e.detail === 0); });
$rondasMenu.addEventListener('click', e => {
  const b = e.target.closest('[data-ronda]');
  if (b) { cerrarRondas(true); verRonda(b.dataset.ronda === 'ahora' ? null : Number(b.dataset.ronda)); return; }
  if (e.target.closest('[data-comparar]')) { cerrarRondas(false); abrirComparar(); }
});
$listaVolver.addEventListener('click', () => verRonda(null));

/* ── Comparar: los mismos nombres, ronda por ronda ──────────────────── */
/* Solo entran las marcas con nombre: «Marca 3» no es nadie y no se
   puede seguir de una ronda a otra. */
const rondasComparables = () => {
  const t = E.rondas.slice();
  if (E.marcas.length) t.push({ id: 0, base: encabezado(), n: 0, p: E.p, marcas: E.marcas, ahora: true });
  return t;
};
const clave = s => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
function hayComparacion() {
  const t = rondasComparables();
  if (t.length < 2) return false;
  return t.filter(r => r.marcas.some(m => m.nombre)).length >= 2;
}

function tablaComparacion() {
  const rondas = rondasComparables();
  const filas = new Map();
  let sinNombre = 0;
  rondas.forEach((r, col) => {
    r.marcas.forEach(m => {
      if (!m.nombre) { sinNombre++; return; }
      const k = clave(m.nombre);
      if (!filas.has(k)) filas.set(k, { nombre: m.nombre, t: new Array(rondas.length).fill(null) });
      const f = filas.get(k);
      f.nombre = m.nombre;
      if (f.t[col] === null) f.t[col] = m.ms;      /* si repite en la misma ronda, vale la primera */
    });
  });
  const lista = [...filas.values()].map(f => {
    const vistos = f.t.map((v, i) => (v === null ? -1 : i)).filter(i => i >= 0);
    const pri = vistos[0], ult = vistos[vistos.length - 1];
    const cambio = vistos.length > 1
      ? cortar(f.t[ult], rondas[ult].p) - cortar(f.t[pri], rondas[pri].p) : null;
    const mejor = f.t.reduce((mj, v, i) => (v !== null && (mj < 0 || v < f.t[mj]) ? i : mj), -1);
    return { ...f, cambio, cambioP: rondas[ult].p, ultimo: f.t[ult], mejor, cuantas: vistos.length };
  });
  lista.sort((a, b) => a.ultimo - b.ultimo || a.nombre.localeCompare(b.nombre, 'es'));
  return { rondas, lista, sinNombre };
}

function pintarComparacion() {
  const { rondas, lista, sinNombre } = tablaComparacion();
  const tit = r => (r.ahora ? `${r.base} · ahora` : nombreRonda(r));
  if (rondas.length < 2) {
    $cmpSub.textContent = rondas.length === 0 ? 'Todavía no hay ninguna ronda.' : 'Con una sola ronda todavía no hay con qué comparar.';
    $cmpMarco.innerHTML = '<p class="cmp-nada">Guarda al menos otra ronda —toca Reiniciar cuando termines esta— y ponle nombre a las marcas: entonces se cruzan solas.</p>';
    $cmpNota.textContent = '';
    return;
  }
  $cmpSub.textContent = rondas.length === 2 ? 'Dos rondas, los mismos nombres.' : `${rondas.length} rondas, los mismos nombres.`;
  if (!lista.length) {
    $cmpMarco.innerHTML = '<p class="cmp-nada">Todavía no hay nombres que comparar. Ponle su nombre a cada marca y se cruzan solas.</p>';
    $cmpNota.textContent = '';
    return;
  }
  const conCambio = lista.some(f => f.cambio !== null);
  const cab = `<tr><th class="cmp-quien" scope="col">Quién</th>` +
    rondas.map(r => `<th scope="col">${esc(tit(r))}</th>`).join('') +
    (conCambio ? '<th scope="col">Cambio</th>' : '') + '</tr>';
  const cuerpo = lista.map(f => {
    const celdas = f.t.map((v, i) => v === null
      ? '<td class="cmp-t cmp-vacia">—</td>'
      : `<td class="cmp-t${f.cuantas > 1 && i === f.mejor ? ' cmp-mejor' : ''}">${enReloj(v, rondas[i].p)}</td>`).join('');
    let cambio = '';
    if (conCambio) {
      cambio = f.cambio === null ? '<td class="cmp-cambio cmp-vacia">—</td>'
        : `<td class="cmp-cambio ${f.cambio < 0 ? 'baja' : f.cambio > 0 ? 'sube' : ''}">${f.cambio === 0 ? 'igual' : duracion(f.cambio, f.cambioP, true)}</td>`;
    }
    return `<tr><th class="cmp-quien" scope="row" title="${esc(f.nombre)}">${esc(f.nombre)}</th>${celdas}${cambio}</tr>`;
  }).join('');
  $cmpMarco.innerHTML = `<table class="cmp"><thead>${cab}</thead><tbody>${cuerpo}</tbody></table>`;
  const partes = ['Cada cifra es el momento en que esa persona terminó, contado desde el arranque de su ronda; en oscuro, su mejor tiempo.'];
  if (conCambio) partes.push('«Cambio» va de la primera ronda en que aparece a la última: en negativo, tardó menos.');
  if (sinNombre) partes.push(sinNombre === 1 ? 'Queda fuera 1 marca sin nombre.' : `Quedan fuera ${sinNombre} marcas sin nombre.`);
  $cmpNota.textContent = partes.join(' ');
}

let focoPrevio = null;
function abrirComparar() {
  cerrarEdicion(true);
  cerrarClip(false);
  cerrarRondas(false);
  cerrarAjustes(false);
  focoPrevio = document.activeElement;
  pintarComparacion();
  mostrar($cmpVelo);
  mostrar($comparar);
  $cmpCerrar.focus();
}
function cerrarComparar(devolverFoco) {
  if (!abierto($comparar)) return;
  ocultar($comparar);
  ocultar($cmpVelo);
  if (devolverFoco && focoPrevio && document.contains(focoPrevio)) focoPrevio.focus();
  focoPrevio = null;
}
$cmpCerrar.addEventListener('click', () => cerrarComparar(true));
$cmpVelo.addEventListener('click', () => cerrarComparar(true));
/* el foco no se escapa del diálogo mientras está abierto */
$comparar.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('button, [tabindex="0"]', $comparar).filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const pri = f[0], ult = f[f.length - 1];
  if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
  else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
});

/* ── La información: sale al abrir y se puede ocultar ───────────────── */
function aplicarInfo() {
  $cuerpo.classList.toggle('con-info', E.info);
  $info.setAttribute('aria-hidden', E.info ? 'false' : 'true');
  $info.inert = !E.info;
  $btnInfo.setAttribute('aria-pressed', E.info ? 'true' : 'false');
  const t = E.info ? 'Ocultar la información' : 'Ver la información';
  $btnInfo.setAttribute('aria-label', t);
  $btnInfo.title = t;
  requestAnimationFrame(bordesInfo);
}
function bordesInfo() {
  if (!$infoInt) return;
  $infoInt.classList.toggle('hay-arriba', $infoInt.scrollTop > 2);
  $infoInt.classList.toggle('hay-abajo', $infoInt.scrollHeight - $infoInt.clientHeight - $infoInt.scrollTop > 2);
}
$btnInfo.addEventListener('click', () => { E.info = !E.info; aplicarInfo(); guardar(); });
if ($infoInt) {
  $infoInt.addEventListener('scroll', bordesInfo, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(bordesInfo).observe($infoInt);
}

/* el borde de la lista se desvanece donde hay más marcas por ver */
function bordesLista() {
  const ol = $listaMarcas;
  const arriba = ol.scrollTop > 2;
  const abajo = ol.scrollHeight - ol.clientHeight - ol.scrollTop > 2;
  ol.classList.toggle('hay-arriba', arriba);
  ol.classList.toggle('hay-abajo', abajo);
}
$listaMarcas.addEventListener('scroll', bordesLista, { passive: true });
if (window.ResizeObserver) new ResizeObserver(bordesLista).observe($listaMarcas);

function latirClip() {
  if (reducido()) return;
  $btnClip.classList.remove('late');
  void $btnClip.offsetWidth;
  $btnClip.classList.add('late');
}

/* N: nombrar la última marca sin tocar la pantalla */
function nombrarUltima() {
  const n = E.marcas.length;
  if (!n) return;
  if (E.viendo !== null) { E.viendo = null; pintarMarcas(); }
  if (E.ocultas || E.plegada) { E.ocultas = false; E.plegada = false; aplicarLista(); guardar(); }
  editarMarca(E.marcas[n - 1].id);
}

$listaMarcas.addEventListener('click', e => {
  const q = e.target.closest('[data-quitar]');
  if (q) { quitarMarca(Number(q.dataset.quitar)); return; }
  const g = e.target.closest('[data-guardar]');
  if (g) { cerrarEdicion(true); return; }
  const b = e.target.closest('[data-editar]');
  if (b) editarMarca(Number(b.dataset.editar));
});

/* el encabezado de la lista se puede renombrar */
function editarEncabezado() {
  const h = $listaTitulo;
  if ($('.lista-titulo-campo', h)) return;
  const antes = E.encabezado;
  h.innerHTML = `<input type="text" class="lista-titulo-campo" id="lista-encabezado" maxlength="28" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="Marcas" aria-label="Encabezado de la lista">`;
  const c = $('.lista-titulo-campo', h);
  c.value = E.encabezado;
  c.focus(); c.select();
  $listaLapiz.hidden = true;
  let hecho = false;
  const cerrar = guardarlo => {
    if (hecho) return; hecho = true;
    E.encabezado = guardarlo ? c.value.replace(/\s+/g, ' ').trim().slice(0, 28) : antes;
    h.innerHTML = `<button type="button" class="lista-titulo-b" id="lista-titulo-b"></button>`;
    $listaLapiz.hidden = false;
    aplicarLista();
    guardar();
  };
  c.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); cerrar(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(false); }
  });
  c.addEventListener('blur', () => cerrar(true));
}
$listaTitulo.addEventListener('click', e => { if (e.target.closest('.lista-titulo-b')) editarEncabezado(); });
$listaLapiz.addEventListener('click', editarEncabezado);
$listaPlegar.addEventListener('click', () => { E.plegada = !E.plegada; aplicarLista(); guardar(); });

/* ── El clip de las marcas ──────────────────────────────────────────── */
let clipPorTeclado = false;
function abrirClip(porTeclado) {
  cerrarAjustes(false);
  clipPorTeclado = porTeclado;
  mostrar($clipMenu);
  $btnClip.setAttribute('aria-expanded', 'true');
  if (porTeclado) { const b = $$('button', $clipMenu).find(x => !x.closest('[hidden]')); if (b) b.focus(); }
}
function cerrarClip(devolverFoco) {
  if (!abierto($clipMenu)) return;
  ocultar($clipMenu);
  $btnClip.setAttribute('aria-expanded', 'false');
  if (devolverFoco && clipPorTeclado) $btnClip.focus();
}
$btnClip.addEventListener('click', e => { if (!abierto($clipMenu)) abrirClip(e.detail === 0); else cerrarClip(e.detail === 0); });
$menuVer.addEventListener('click', e => { const t = e.detail === 0; cerrarClip(t); ocultarMarcas(!E.ocultas); });
$menuBorrar.addEventListener('click', e => { const t = e.detail === 0; cerrarClip(t); borrarMarcas(); });
$menuComparar.addEventListener('click', () => { cerrarClip(false); abrirComparar(); });
$menuGuardada.addEventListener('click', e => { const t = e.detail === 0; cerrarClip(t); if (E.rondas.length) verRonda(E.rondas[E.rondas.length - 1].id); });
$menuVaciar.addEventListener('click', e => { const t = e.detail === 0; cerrarClip(t); vaciarRondas(); });
$clipMenu.addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const items = $$('[role="menuitem"]', $clipMenu);
  const k = items.indexOf(document.activeElement);
  items[(k + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
});

/* ── El nombre de la dinámica ───────────────────────────────────────── */
let dinAntes = '';
function ajustarDinamica() {
  $din.style.height = 'auto';
  $din.style.height = $din.scrollHeight + 'px';
  $dinCampo.classList.toggle('lleno', $din.value.trim() !== '');
}
$din.addEventListener('focus', () => { dinAntes = $din.value; });
$din.addEventListener('input', () => {
  if (/[\r\n]/.test($din.value)) $din.value = $din.value.replace(/\s*[\r\n]+\s*/g, ' ');
  E.nombre = $din.value;
  ajustarDinamica();
  guardarLuego();
});
$din.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $din.blur(); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); $din.value = dinAntes; E.nombre = dinAntes; ajustarDinamica(); $din.blur(); }
});
$din.addEventListener('blur', () => {
  const limpio = $din.value.replace(/\s+/g, ' ').trim();
  if (limpio !== $din.value) { $din.value = limpio; ajustarDinamica(); }
  E.nombre = limpio;
  guardar();
});
/* Sin lápiz: toda la zona activa la edición. Si el toque cae ya sobre el
   campo, el navegador pone el cursor donde se tocó; si cae en el margen
   de alrededor, se manda el foco al final del texto. */
$dinCampo.addEventListener('click', e => {
  if (e.target === $din) return;
  $din.focus(); const n = $din.value.length; $din.setSelectionRange(n, n);
});
if (window.ResizeObserver) new ResizeObserver(() => ajustarDinamica()).observe($dinCampo);

/* ── Entrar y salir sin tirones ──────────────────────────────────────
   Un panel que aparece con una animación y se va de golpe se siente roto.
   `mostrar` y `ocultar` le dan a cada uno su salida; con «reducir
   movimiento» se van al instante. Mientras sale, cuenta como cerrado. */
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
  salidas.set(el, setTimeout(() => {
    el.hidden = true;
    el.classList.remove('saliendo');
    salidas.delete(el);
  }, SALIDA));
}

/* ── Ajustes ────────────────────────────────────────────────────────── */
let ajustesPorTeclado = false;
/* El panel no lleva pestaña: sale debajo de su botón y con su animación,
   que ya dice de dónde viene. Un triangulito rotado solo añadía un borde
   dentado en algunas pantallas. */
function colocarAjustes() {
  const r = $btnAjustes.getBoundingClientRect();
  const alto = Math.max(220, window.innerHeight - r.bottom - 26);
  $ajustes.style.setProperty('--aj-alto', alto + 'px');
}
function abrirAjustes(porTeclado) {
  cerrarClip(false);
  ajustesPorTeclado = porTeclado;
  sincronizarAjustes();
  mostrar($ajustes);
  $btnAjustes.setAttribute('aria-expanded', 'true');
  colocarAjustes();
  if (porTeclado) $ajMeta.focus();
}
function cerrarAjustes(devolverFoco) {
  if (!abierto($ajustes)) return;
  leerMeta(true);
  leerCupo(true);
  ocultar($ajustes);
  $btnAjustes.setAttribute('aria-expanded', 'false');
  if (devolverFoco && ajustesPorTeclado) $btnAjustes.focus();
}
$btnAjustes.addEventListener('click', e => { if (!abierto($ajustes)) abrirAjustes(e.detail === 0); else cerrarAjustes(e.detail === 0); });
$ajCerrar.addEventListener('click', e => cerrarAjustes(e.detail === 0 || ajustesPorTeclado));

function escribirMeta() {
  const s = Math.round(E.meta / 1000);
  $ajMin.value = String(Math.floor(s / 60));
  $ajSeg.value = dos(s % 60);
}
function sincronizarAjustes() {
  $ajMeta.checked = E.conMeta;
  $ajMin.disabled = $ajSeg.disabled = !E.conMeta;
  if (document.activeElement !== $ajMin && document.activeElement !== $ajSeg) escribirMeta();
  $ajAvisar.checked = E.avisar;
  $ajSonido.checked = E.sonido;
  $ajCupo.checked = E.conCupo;
  $ajCupoN.disabled = !E.conCupo;
  if (document.activeElement !== $ajCupoN) $ajCupoN.value = String(E.cupo);
}
/* mientras se escribe no se reescriben los campos; con los dos en cero
   se conserva la meta anterior */
function leerMeta(normalizar) {
  const min = parseInt(($ajMin.value || '').replace(/\D/g, ''), 10) || 0;
  const seg = parseInt(($ajSeg.value || '').replace(/\D/g, ''), 10) || 0;
  const total = Math.min(META_MAX, (min * 60 + seg) * 1000);
  if (total >= 1000 && total !== E.meta) {
    E.meta = total;
    cumplidaAvisada = tiempo() >= E.meta;
    tramoActual = '';
    pintarMetaValor();
    metaDerHecha = '';
    pintar();
    guardar();
    programarMeta();
  }
  if (normalizar) escribirMeta();
}
[$ajMin, $ajSeg].forEach(c => {
  c.addEventListener('input', () => { if (/\D/.test(c.value)) c.value = c.value.replace(/\D/g, ''); leerMeta(false); });
  c.addEventListener('change', () => leerMeta(true));
  c.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); leerMeta(true); c.blur(); } });
});
$ajMeta.addEventListener('change', () => {
  E.conMeta = $ajMeta.checked;
  cumplidaAvisada = E.conMeta && tiempo() >= E.meta;
  tramoActual = '';
  metaDerHecha = ''; metaAnchoHecho = -1;
  sincronizarAjustes();
  actualizar();
  guardar();
  programarMeta();
});
$ajAvisar.addEventListener('change', () => { E.avisar = $ajAvisar.checked; tramoActual = ''; pintar(); guardar(); });
$ajSonido.addEventListener('change', () => {
  E.sonido = $ajSonido.checked;
  if (E.sonido) { prepararAudio(); campana(); }
  guardar();
});

/* el cupo: cuántas marcas hacen una ronda. Con los dos en cero se
   conserva el cupo anterior, igual que la meta. */
function leerCupo(normalizar) {
  const n = parseInt(($ajCupoN.value || '').replace(/\D/g, ''), 10) || 0;
  const total = Math.min(MAX_MARCAS, n);
  if (total >= 1 && total !== E.cupo) {
    E.cupo = total;
    aplicarCupo();
    guardar();
  }
  if (normalizar) $ajCupoN.value = String(E.cupo);
}
$ajCupoN.addEventListener('input', () => { if (/\D/.test($ajCupoN.value)) $ajCupoN.value = $ajCupoN.value.replace(/\D/g, ''); leerCupo(false); });
$ajCupoN.addEventListener('change', () => leerCupo(true));
$ajCupoN.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); leerCupo(true); $ajCupoN.blur(); } });
$ajCupo.addEventListener('change', () => {
  E.conCupo = $ajCupo.checked;
  $ajCupoN.disabled = !E.conCupo;
  aplicarCupo();
  guardar();
});

/* ── Pantalla completa ──────────────────────────────────────────────── */
const raiz = document.documentElement;
let pcRespaldo = false;   /* donde el navegador no la permite, la pieza ocupa la ventana */
const pcNativa = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const enPC = () => pcNativa() || pcRespaldo;
/* Pasar a pantalla completa cambia media pieza de sitio. Si el navegador
   sabe hacer transiciones de vista, el cambio se hace dentro de una: la
   pieza y la cifra se mueven de un estado al otro en vez de saltar. */
/* Pasar a pantalla completa **no** se envuelve en una transición de
   vista. Se hacía, y ahí estaba el tirón: el aviso de pantalla completa
   llega mientras el navegador todavía está agrandando la ventana, así
   que la transición congelaba una foto del tamaño viejo encima de la
   página viva y la soltaba de golpe al acabar. Dos animaciones sobre lo
   mismo se estorban. La del navegador ya hace el viaje. */
function sincronizarPC() {
  cerrarClip(false);
  cerrarRondas(false);
  cerrarAjustes(false);
  pintarPC();
}
function pintarPC() {
  const si = enPC();
  raiz.classList.toggle('pc', si);
  $pantallaIco.setAttribute('href', si ? '#i-reducir' : '#i-ampliar');
  $btnPantalla.setAttribute('aria-label', si ? 'Salir de pantalla completa' : 'Pantalla completa');
  $btnPantalla.title = si ? 'Salir de pantalla completa' : 'Pantalla completa';
  if (abierto($ajustes)) colocarAjustes();
  avivarMandos();
}
/* En tableta, teléfono o pizarra táctil, la pantalla completa se pide
   **en horizontal**: la cifra es ancha y de pie se parte en dos líneas o
   se queda diminuta. Al entrar se bloquea la orientación y al salir se
   suelta. En un equipo de escritorio la API no existe o rechaza, y no
   pasa nada: el `catch` se lo come y todo sigue igual. */
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

/* Pasado un rato en pantalla completa con el reloj corriendo, los mandos
   que quedan se atenúan solos (ver el CSS de la sección 10): no tapan la
   vista de la clase. Tocar uno de ellos, cualquier punto de la pantalla o
   una tecla los despierta y reinicia la espera; en pausa o fuera de
   pantalla completa se quedan siempre enteros. */
const ESPERA_LATENTE = 8000;
let latenteT = 0;
function avivarMandos() {
  clearTimeout(latenteT);
  raiz.classList.remove('latente');
  if (enPC() && corre()) latenteT = setTimeout(() => raiz.classList.add('latente'), ESPERA_LATENTE);
}
document.addEventListener('pointerdown', avivarMandos, true);
document.addEventListener('pointermove', avivarMandos, true);
document.addEventListener('keydown', avivarMandos, true);

/* ── Mandos ─────────────────────────────────────────────────────────── */
$btnMarcha.addEventListener('click', alternar);
$btnMarca.addEventListener('click', marcar);
$btnReiniciar.addEventListener('click', () => pedirReinicio('toque'));

/* ── Teclado ────────────────────────────────────────────────────────── */
const escribiendo = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable ||
  (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(el.type)));
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = e.target;
  if (e.key === 'Escape') {
    if (abierto($comparar)) { cerrarComparar(true); e.preventDefault(); return; }
    if (abierto($rondasMenu)) { cerrarRondas(true); e.preventDefault(); return; }
    if (abierto($clipMenu)) { cerrarClip(true); e.preventDefault(); return; }
    if (abierto($ajustes)) { cerrarAjustes(true); e.preventDefault(); return; }
    if (enPC()) { salirPC(); e.preventDefault(); }
    return;
  }
  if (escribiendo(el) || e.repeat) return;
  const enMando = el && el !== document.body && el.closest && el.closest('button, a, input, select, summary, [role="menuitem"]');
  switch (e.key) {
    case ' ': case 'Spacebar':
      if (enMando) return;            /* un mando con el foco se activa a sí mismo */
      e.preventDefault(); alternar(); break;
    case 'm': case 'M': e.preventDefault(); marcar(); break;
    case 'n': case 'N': e.preventDefault(); nombrarUltima(); break;
    case 'r': case 'R': e.preventDefault(); pedirReinicio('tecla'); break;
    case 'p': case 'P': e.preventDefault(); alternarPC(); break;
    default: break;
  }
});

/* Tras un clic o un toque en un botón, el foco vuelve a la página: así
   Espacio sigue siendo «iniciar o pausar» y no repite el último botón. */
let ultimoPuntero = -1e9;
document.addEventListener('pointerdown', e => {
  ultimoPuntero = performance.now();
  prepararAudio();
  if (abierto($ajustes) && !$ajustes.contains(e.target) && !$btnAjustes.contains(e.target)) cerrarAjustes(false);
  if (abierto($clipMenu) && !$clipMenu.contains(e.target) && !$btnClip.contains(e.target)) cerrarClip(false);
  if (abierto($rondasMenu) && !$rondasMenu.contains(e.target) && !$listaMenu.contains(e.target)) cerrarRondas(false);
}, true);
document.addEventListener('keydown', prepararAudio, true);
['click', 'touchend'].forEach(t => document.addEventListener(t, prepararAudio, { capture: true, passive: true }));
document.addEventListener('click', () => {
  if (performance.now() - ultimoPuntero > 1200) return;
  const a = document.activeElement;
  if (a && a !== document.body && a.matches('button, a, input[type="checkbox"], input[type="radio"]')) a.blur();
});

/* ── Pestaña oculta, recarga y salida ───────────────────────────────── */
let ocultoT = 0;
function relojOculto() {
  clearTimeout(ocultoT);
  if (!document.hidden || !corre()) return;
  pintarTitulo(tiempo());
  ocultoT = setTimeout(relojOculto, 1005 - (tiempo() % 1000));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { guardar(); relojOculto(); }
  else { clearTimeout(ocultoT); if (corre()) { despertar(true); pintar(); pedir(); } }
});
window.addEventListener('pagehide', guardar);
window.addEventListener('resize', () => { if (abierto($ajustes)) colocarAjustes(); });

/* ── La carga de la casa se retira cuando todo está listo ──────────── */
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
  if (!carga) { raiz.classList.add('fuentes-ok'); return; }
  const t0 = typeof window.S321_CARGA_T0 === 'number' ? window.S321_CARGA_T0 : 0;
  /* dura al menos lo que tarda en componerse el isotipo: su última pieza
     se enciende a los 1.16 s de empezar, y nunca menos de 0.8 s */
  const minimo = reducido() ? 800 : Math.max(800, t0 + 1200);
  const tope = new Promise(res => setTimeout(res, Math.max(0, 3200 - performance.now())));
  Promise.race([fuentesListas(), tope]).then(() => {
    raiz.classList.add('fuentes-ok');      /* ya con su letra: la marca y la carga se muestran sin saltar */
    setTimeout(() => {
      carga.classList.add('fuera');
      carga.setAttribute('aria-hidden', 'true');
      setTimeout(() => { carga.hidden = true; }, 320);
    }, Math.max(0, minimo - performance.now()));
  });
}

/* ── Arranque ───────────────────────────────────────────────────────── */
cargar();
$din.value = E.nombre;
ajustarDinamica();
aplicarInfo();
sincronizarAjustes();
pintarMetaValor();
aplicarLista();
pintarMarcas();
aplicarCupo();
actualizar();
programarMeta();
retirarCarga();

/* para las pruebas: se lee, no se toca */
window.s321Cronometro = Object.freeze({
  tiempo: () => tiempo(),
  estado: () => ({ corre: corre(), tramo: tramoActual, marcas: E.marcas.length, p: E.p, meta: E.meta, conMeta: E.conMeta, info: E.info, conCupo: E.conCupo, cupo: E.cupo })
});
})();
