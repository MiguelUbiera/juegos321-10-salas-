/* ═══════════════════════════════════════════════════════════════════════
   Secuencia321 · Cronómetro por etapas · guion
   Fuente de index.html: se corrige aquí y se vuelve a construir.
   Lo que comparte con los demás cronómetros está copiado de la casa; lo
   propio es el reparto de etapas y su editor.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
'use strict';

/* ── Utilidades ─────────────────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const TITULO = 'Cronómetro por etapas';
const TITULO_PAGINA = 'Cronómetro por etapas · Secuencia321';
const CLAVE = 's321-cronometro-etapas';
const VERSION = 2;   /* subirla descarta lo guardado con el esquema viejo */
const MENOS = '−';                 // el menos tipográfico
/* un campo de escritura se queda con sus teclas: ni el espacio ni las
   letras son atajos mientras se escribe */
const escribiendo = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable ||
  (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(el.type)));
const NOMBRE_MAX = 32;   /* cabe «Trabajo en parejas por mesas» */
const MIN_ETAPAS = 2;
const MAX_ETAPAS = 8;
const MAX_EVENTOS = 20;                // los más viejos se van dejando caer
const ETAPA_MAX = 180 * 60000;         // tres horas por etapa
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
/* Una etapa tiene nombre y un tiempo previsto. `cortes` guarda el momento
   —contado desde el arranque— en que se cerró cada una: de ahí sale lo que
   duró de verdad, sin guardar duraciones que luego no cuadren. */
const E = {
  nombre: '', encabezado: '',
  etapas: [], cortes: [], actual: 0, fin: false,
  eventos: [], viendo: null, sel: null,
  avisar: true, sonido: false, seguir: false, senal: true, despierta: true, final: false,
  ocultas: false, plegada: false, info: true,
  acum: 0, t0: null
};
let sigId = 1, sigEvento = 1;
let agotadaAvisada = false;
const corre = () => E.t0 !== null;
/* El tiempo sale del reloj del sistema, nunca de contar saltos de un
   temporizador: así no se atrasa aunque se cambie de pestaña. */
const tiempo = (ahora = performance.now()) => E.acum + (corre() ? ahora - E.t0 : 0);

const nuevaEtapa = (n, plan) => ({ id: sigId++, n, plan });
/* El estándar de la casa: tres etapas con los nombres de siempre y
   10 · 20 · 10 minutos. Es de donde arranca todo evento nuevo cuando no
   hay un reparto anterior que heredar. */
function etapasDeFabrica() {
  return [nuevaEtapa('Inicio', 600000), nuevaEtapa('Desarrollo', 1200000), nuevaEtapa('Cierre', 600000)];
}
const planTotal = () => E.etapas.reduce((a, e) => a + e.plan, 0);
const arranqueDe = i => (i > 0 ? E.cortes[i - 1] || 0 : 0);
/* lo que duró la etapa i: cerrada, entre sus dos cortes; la que corre, lo
   que lleva; las que no han empezado, nada */
function realDe(i, t) {
  if (i < E.cortes.length) return E.cortes[i] - arranqueDe(i);
  if (i === E.actual && !E.fin) return Math.max(0, t - arranqueDe(i));
  if (i === E.actual && E.fin) return Math.max(0, t - arranqueDe(i));
  return null;
}
const enEtapa = t => Math.max(0, t - arranqueDe(E.actual));
const etapaActual = () => E.etapas[Math.min(E.actual, E.etapas.length - 1)];
const aCero = () => tiempo() === 0 && !corre() && E.cortes.length === 0;

/* ── Memoria: si la página se recarga, sigue donde iba ─────────────── */
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      v: VERSION, nombre: E.nombre, encabezado: E.encabezado,
      etapas: E.etapas.map(e => ({ n: e.n, plan: e.plan })),
      cortes: E.cortes.slice(), actual: E.actual, fin: E.fin,
      eventos: E.eventos.map(v => ({ base: v.base, n: v.n, total: v.total, fecha: v.fecha,
        etapas: v.etapas.map(e => ({ n: e.n, plan: e.plan })), cortes: v.cortes.slice() })),
      avisar: E.avisar, sonido: E.sonido, seguir: E.seguir, senal: E.senal,
      despierta: E.despierta, final: E.final,
      ocultas: E.ocultas, plegada: E.plegada, info: E.info,
      acum: tiempo(), corriendo: corre(), reloj: Date.now()
    }));
  } catch (e) { /* sin memoria en este navegador: la herramienta sigue funcionando */ }
}
let guardarT = 0;
const guardarLuego = () => { clearTimeout(guardarT); guardarT = setTimeout(guardar, 350); };
function cargar() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { o = null; }
  if (!o || o.v !== VERSION) { E.etapas = etapasDeFabrica(); return; }
  const txt = (v, max) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  E.nombre = typeof o.nombre === 'string' ? o.nombre.replace(/[\r\n]+/g, ' ').slice(0, 70) : '';
  E.encabezado = txt(o.encabezado, 28);
  E.etapas = (Array.isArray(o.etapas) ? o.etapas : [])
    .filter(e => e && Number.isFinite(e.plan) && e.plan >= 1000).slice(0, MAX_ETAPAS)
    .map((e, i) => nuevaEtapa(txt(e.n, NOMBRE_MAX) || `Etapa ${i + 1}`, Math.min(ETAPA_MAX, Math.round(e.plan / 1000) * 1000)));
  if (E.etapas.length < MIN_ETAPAS) E.etapas = etapasDeFabrica();
  E.avisar = o.avisar !== false;
  E.sonido = o.sonido === true;
  E.seguir = o.seguir === true;
  E.senal = o.senal !== false;
  E.despierta = o.despierta !== false;
  E.final = o.final === true;
  E.ocultas = o.ocultas === true;
  E.plegada = o.plegada === true;
  E.info = o.info !== false;
  E.cortes = (Array.isArray(o.cortes) ? o.cortes : []).filter(Number.isFinite)
    .map(x => Math.max(0, Math.floor(x))).slice(0, E.etapas.length);
  E.actual = Number.isFinite(o.actual) ? Math.min(Math.max(0, Math.floor(o.actual)), E.etapas.length - 1) : 0;
  if (E.cortes.length < E.actual) E.actual = E.cortes.length;
  E.fin = o.fin === true && E.cortes.length >= E.etapas.length;
  E.eventos = (Array.isArray(o.eventos) ? o.eventos : []).slice(-MAX_EVENTOS)
    .map(v => v && Array.isArray(v.etapas) && Array.isArray(v.cortes) ? {
      id: sigEvento++, base: txt(v.base, 28) || 'Etapas',
      n: Number.isFinite(v.n) && v.n > 0 ? Math.floor(v.n) : 1,
      total: Number.isFinite(v.total) ? Math.max(0, Math.floor(v.total)) : 0,
      fecha: Number.isFinite(v.fecha) ? v.fecha : 0,
      etapas: v.etapas.filter(e => e && Number.isFinite(e.plan)).slice(0, MAX_ETAPAS)
        .map((e, i) => ({ n: txt(e.n, NOMBRE_MAX) || `Etapa ${i + 1}`, plan: Math.min(ETAPA_MAX, Math.max(1000, Math.round(e.plan / 1000) * 1000)) })),
      cortes: v.cortes.filter(Number.isFinite).map(x => Math.max(0, Math.floor(x)))
    } : null)
    .filter(v => v && v.etapas.length && v.cortes.length);
  let acum = Number.isFinite(o.acum) ? Math.max(0, o.acum) : 0;
  if (o.corriendo === true && !E.fin && Number.isFinite(o.reloj)) {
    acum += Math.max(0, Date.now() - o.reloj);
    E.acum = acum; E.t0 = performance.now();
  } else E.acum = acum;
  agotadaAvisada = enEtapa(tiempo()) >= etapaActual().plan;
}

/* ── Referencias ────────────────────────────────────────────────────── */
const $pieza = $('#pieza'), $cuerpo = $('#cuerpo'), $reloj = $('#reloj'), $cifra = $('#cifra'),
  $estadoTxt = $('#estado-txt'), $sombra = $('#sombra'), $sombraIco = $('#sombra-ico'),
  $repPista = $('#rep-pista'), $repPrevisto = $('#rep-previsto'), $repDer = $('#rep-der'), $repTotal = $('#rep-total'),
  $btnMarcha = $('#btn-marcha'), $marchaIco = $('#marcha-ico'), $marchaTxt = $('#marcha-txt'),
  $btnSiguiente = $('#btn-siguiente'), $siguienteIco = $('#siguiente-ico'), $siguienteTxt = $('#siguiente-txt'),
  $btnReiniciar = $('#btn-reiniciar'), $reiniciarTxt = $('#reiniciar-txt'),
  $clipCaja = $('#clip-caja'), $btnClip = $('#btn-clip'), $clipN = $('#clip-n'), $clipMenu = $('#clip-menu'),
  $menuVer = $('#menu-ver'), $menuVerTxt = $('#menu-ver-txt'), $menuVerIco = $('#menu-ver-ico'),
  $menuGuardarLi = $('#menu-guardar-li'), $menuGuardar = $('#menu-guardar'), $menuGuardarTxt = $('#menu-guardar-txt'),
  $menuVaciarLi = $('#menu-vaciar-li'), $menuVaciar = $('#menu-vaciar'), $menuVaciarTxt = $('#menu-vaciar-txt'),
  $lista = $('#lista'), $listaTitulo = $('#lista-titulo'), $etLista = $('#et-lista'),
  $listaLapiz = $('#lista-lapiz'), $listaQuitar = $('#lista-quitar'), $listaPlegar = $('#lista-plegar'), $plegarIco = $('#plegar-ico'), $listaMenu = $('#lista-menu'),
  $listaVolver = $('#lista-volver'), $eventosMenu = $('#eventos-menu'),
  $cmpVelo = $('#cmp-velo'), $comparar = $('#comparar'), $cmpSub = $('#cmp-sub'), $cmpMarco = $('#cmp-marco'),
  $cmpNota = $('#cmp-nota'), $cmpCerrar = $('#cmp-cerrar'),
  $din = $('#dinamica'), $dinCampo = $('#dinamica-campo'),
  $btnAjustes = $('#btn-ajustes'), $ajustes = $('#ajustes'), $ajCerrar = $('#ajustes-cerrar'),
  $ajAvisar = $('#aj-avisar'), $ajSonido = $('#aj-sonido'), $ajSeguir = $('#aj-seguir'), $ajSenal = $('#aj-senal'),
  $ajDespierta = $('#aj-despierta'), $ajFinal = $('#aj-final'),
  $btnPantalla = $('#btn-pantalla'), $pantallaIco = $('#pantalla-ico'),
  $btnInfo = $('#btn-info'), $info = $('#info'), $infoInt = $('.info-int'),
  $aviso = $('#aviso'), $avisoTxt = $('#aviso-txt'), $avisoDeshacer = $('#aviso-deshacer');

/* ── Dibujar ────────────────────────────────────────────────────────── */
let cifraHecha = '', emHecho = 0, derHecha = '', previstoHecho = -1, tituloHecho = '', tramoActual = 'nada', raf = 0;
const P = 0;                        /* una clase se cuenta en segundos */

function pintarCifra(t) {
  const x = partes(t, P);
  const html = x.principal.replace(/:/g, '<span class="sep">:</span>');
  if (html !== cifraHecha) { $cifra.innerHTML = html; cifraHecha = html; }
  const em = Math.round(emDe(x) * 1000) / 1000;
  if (em !== emHecho) { emHecho = em; $reloj.style.setProperty('--em', String(em)); }
}

/* La barra es el mapa de lo previsto y no se mueve: cada tramo ocupa su
   parte del total planeado. Lo que cambia es el relleno. */
function armarPista() {
  $repPista.innerHTML = E.etapas.map((e, i) =>
    `<div class="rep-tramo" data-i="${i}" style="--c:var(--e${(i % 6) + 1});flex-grow:${e.plan}"><div class="rep-lleno"></div></div>`).join('');
}
function pintarPista(t) {
  const total = planTotal();
  if (total !== previstoHecho) {
    previstoHecho = total;
    $repPrevisto.innerHTML = `<span class="oculto">Previsto en total </span><span class="num">${enReloj(total, 0)}</span>`;
    $$('.rep-tramo', $repPista).forEach((d, i) => { if (E.etapas[i]) d.style.flexGrow = String(E.etapas[i].plan); });
  }
  $$('.rep-tramo', $repPista).forEach((d, i) => {
    const e = E.etapas[i];
    if (!e) return;
    const real = realDe(i, t);
    const f = real === null ? 0 : Math.min(1, real / e.plan);
    d.firstElementChild.style.width = (Math.round(f * 1000) / 10) + '%';
    d.classList.toggle('corre', i === E.actual && corre() && !E.fin);
    d.classList.toggle('hecha', i < E.cortes.length);
    d.classList.toggle('pasada', real !== null && real > e.plan);
  });
  const der = `<span class="num">${enReloj(t, 0)}</span>`;
  if (der !== derHecha) { $repDer.innerHTML = der; derHecha = der; }
  $repDer.classList.toggle('pasada', t > total);
}

/* los tramos de la etapa que se acaba */
/* Dos señales distintas, cada una con su interruptor: el **aviso** es la
   respiración del último minuto —«queda poco»— y la **señal** es el
   parpadeo de los últimos segundos —«se acaba ahora»—. Quien da clase
   con proyector a veces quiere la primera y no la segunda. */
function tramoDe(tE) {
  const plan = etapaActual().plan;
  if (E.fin) return 'nada';
  if (tE >= plan) return 'pasada';
  const falta = plan - tE;
  if (E.senal && falta <= Math.min(10000, 0.2 * plan)) return 'final';
  if (E.avisar && falta <= Math.min(60000, 0.25 * plan)) return 'aviso';
  return 'nada';
}
/* el pulso del tramo final va al compás del segundo */
const fijarFase = t => $pieza.style.setProperty('--fase', `${-Math.round(t % 1000)}ms`);

function aplicarTramo(tr, tE) {
  if (tr !== 'pasada' && tE < etapaActual().plan) agotadaAvisada = false;
  if (tr === tramoActual) return;
  tramoActual = tr;
  $pieza.dataset.tramo = tr;
  if (tr === 'final') fijarFase(tE);
  if (tr === 'pasada' && corre() && !agotadaAvisada) {
    agotadaAvisada = true;
    halo();
    if (E.sonido) campana();
    if (E.seguir) siguiente(true);
  }
}

function pintarEstado(t) {
  const c = corre();
  let e = 'listo', txt = 'Listo';
  if (E.fin) { e = 'fin'; txt = 'Terminada'; }
  else if (c && tramoActual === 'pasada') { e = 'cumplida'; txt = ''; }
  else if (c && tramoActual === 'final') { e = 'final'; txt = 'Últimos segundos'; }
  else if (c) { e = 'marcha'; txt = 'En marcha'; }
  else if (t > 0) { e = 'pausa'; txt = 'En pausa'; }
  if ($pieza.dataset.e !== e) { $pieza.dataset.e = e; $estadoTxt.textContent = txt; }
}

function pintarTitulo(t) {
  const s = E.fin ? `${enReloj(t, 0)} · ${TITULO}` : `${enReloj(enEtapa(t), 0)} · ${etapaActual().n}`;
  if (s !== tituloHecho) { tituloHecho = s; document.title = corre() || t > 0 ? s : TITULO_PAGINA; }
}

function pintar(ahora = performance.now()) {
  const t = tiempo(ahora);
  const tE = enEtapa(t);
  aplicarTramo(tramoDe(tE), tE);
  pintarCifra(E.fin ? t : tE);
  pintarPista(t);
  pintarEstado(t);
  pintarTitulo(t);
  pintarFilas(t);
}
function bucle(ahora) { raf = 0; pintar(ahora); if (corre()) raf = requestAnimationFrame(bucle); }
function pedir() { if (!raf && corre()) raf = requestAnimationFrame(bucle); }

/* La etiqueta que se ve es también el rótulo del botón al pasar el cursor:
   cuando el botón queda solo con su ícono, el texto sigue ahí. */
function etiqueta(apila, clave) {
  $$('[data-l]', apila).forEach(s => s.classList.toggle('ve', s.dataset.l === clave));
  const v = $('.ve', apila);
  if (v && apila.parentElement) apila.parentElement.title = v.textContent.replace(/\s+/g, ' ').trim();
}

function actualizar() {
  const c = corre(), t = tiempo();
  $marchaIco.setAttribute('href', c ? '#i-pausa' : '#i-marcha');
  etiqueta($marchaTxt, c ? 'pausar' : (t > 0 ? 'seguir' : 'iniciar'));
  $btnMarcha.disabled = E.fin;
  /* terminada la tanda, el botón que seguía adelante ofrece la siguiente:
     empezar otro evento no tiene por qué pasar por «Reiniciar» */
  const ultima = E.actual >= E.etapas.length - 1;
  $btnSiguiente.disabled = eventoVisto() ? true : (E.fin ? false : (!c && t === 0));
  $siguienteIco.setAttribute('href', E.fin ? '#i-bandera' : ultima ? '#i-listo' : '#i-siguiente');
  etiqueta($siguienteTxt, E.fin ? 'nuevo' : ultima ? 'terminar' : 'siguiente');
  if (!$btnReiniciar.classList.contains('confirmar')) {
    const deEtapa = reiniciable(E.sel);
    etiqueta($reiniciarTxt, deEtapa ? 'etapa' : 'reiniciar');
    const n = deEtapa ? E.etapas[E.sel].n : '';
    const t = $('#reiniciar-etapa-n');
    if (t && t.textContent !== n) t.textContent = n;
    $btnReiniciar.title = deEtapa ? `Reiniciar ${n}` : 'Reiniciar';
    $btnReiniciar.classList.toggle('de-etapa', deEtapa);
    if (deEtapa) $btnReiniciar.style.setProperty('--c', `var(--e${(E.sel % 6) + 1})`);
    else $btnReiniciar.style.removeProperty('--c');
  }
  aplicarLista();
  pintar();
  pedir();
  despertar(c && E.despierta);
  avivarMandos();
}

/* ── Acciones ───────────────────────────────────────────────────────── */
function alternar() {
  if (E.fin) return;
  E.sel = null;
  const ahora = performance.now();
  if (corre()) { E.acum += ahora - E.t0; E.t0 = null; sombra('pausa'); }
  else { E.t0 = ahora; sombra('marcha'); }
  if (tramoActual === 'final') fijarFase(enEtapa(tiempo(ahora)));
  guardar();
  actualizar();
  programarEtapa();
}

/* Cerrar la etapa y abrir la siguiente. La última termina la actividad. */
function siguiente(sola) {
  if (E.fin) return;
  E.sel = null;
  const t = Math.floor(tiempo());
  if (!corre() && t === 0) return;
  E.cortes[E.actual] = t;
  E.cortes.length = E.actual + 1;
  if (E.actual >= E.etapas.length - 1) {
    E.fin = true;
    if (corre()) { E.acum = t; E.t0 = null; }
    /* una campana sola al cerrar el evento entero: en un taller es la
       señal de «hasta aquí», distinta del aviso de cada etapa */
    if (E.final) campana();
    sombra('pausa');
  } else {
    E.actual += 1;
    if (E.info) { E.info = false; aplicarInfo(); }
    if (!sola) sombra('siguiente');
  }
  agotadaAvisada = false;
  tramoActual = '';
  guardar();
  actualizar();
  programarEtapa();
  desplazarAlActual();
}

/* Volver a la etapa anterior: se deshace el corte, no el tiempo. */
function atras() {
  if (E.actual === 0 && !E.fin) return;
  if (E.fin) E.fin = false;
  else E.actual -= 1;
  E.cortes.length = E.actual;
  agotadaAvisada = false;
  tramoActual = '';
  guardar();
  actualizar();
  programarEtapa();
  desplazarAlActual();
}

/* Reiniciar no borra: guarda el evento y empieza otro con el mismo
   reparto, igual que en el cronómetro de actividad. Borrar es aparte. */
function reiniciar() {
  cerrarEncabezado(true);
  cerrarComparar(false);
  cerrarEventos(false);
  E.viendo = null;
  const guardado = guardarEvento(true);
  if (!guardado) {
    E.acum = 0; E.t0 = null; E.cortes = []; E.actual = 0; E.fin = false;
    agotadaAvisada = false;
    tramoActual = '';
    ocultarAviso();
  }
  E.ocultas = false;
  cerrarClip(false);
  rehacerFilas();
  actualizar();
  guardar();
}

/* Reiniciar pide un segundo toque antes de 3 s: nadie borra una
   actividad por un roce en la pizarra. */
let reinicioT = 0;
function volverReinicio() {
  clearTimeout(reinicioT);
  $btnReiniciar.classList.remove('confirmar');
  etiqueta($reiniciarTxt, E.sel === null ? 'reiniciar' : 'etapa');
}
function pedirReinicio() {
  /* con una etapa seleccionada, Reiniciar es de ella: un solo botón,
     dos alcances, y el rótulo dice cuál */
  if (reiniciable(E.sel)) { const i = E.sel; volverReinicio(); reiniciarEtapa(i); return; }
  if ($btnReiniciar.classList.contains('confirmar')) { volverReinicio(); reiniciar(); return; }
  $btnReiniciar.classList.add('confirmar');
  etiqueta($reiniciarTxt, 'toca');
  clearTimeout(reinicioT);
  reinicioT = setTimeout(volverReinicio, 3000);
}

/* con la pestaña detrás, el aviso de la etapa llega igual */
let etapaT = 0;
function programarEtapa() {
  clearTimeout(etapaT);
  if (!corre() || E.fin) return;
  const falta = etapaActual().plan - enEtapa(tiempo());
  if (falta <= 0 || falta > 6 * 3600000) return;
  etapaT = setTimeout(() => { pintar(); }, falta + 20);
}

/* ── La lista de etapas ─────────────────────────────────────────────── */
const encabezado = () => E.encabezado || 'Etapas';

function aplicarLista() {
  const mirando = eventoVisto();
  const n = etapasVistas().length;
  const nE = E.eventos.length;
  const ver = !E.ocultas;
  const nombre = tituloVisto();
  $cuerpo.classList.toggle('con-lista', ver);
  $lista.setAttribute('aria-hidden', ver ? 'false' : 'true');
  $lista.inert = !ver;
  $lista.classList.toggle('mirando', !!mirando);
  $clipN.hidden = nE === 0;
  $clipN.textContent = String(nE);
  $btnClip.classList.toggle('oculta', E.ocultas);
  /* el menú dice el nombre del evento, no «etapas»: lo que se oculta es
     «Grupo 1», que es como el maestro lo llamó */
  $menuVerTxt.textContent = E.ocultas ? `Ver «${nombre}»` : `Ocultar «${nombre}»`;
  $menuVerIco.setAttribute('href', E.ocultas ? '#i-mostrar' : '#i-ocultar');
  $btnClip.setAttribute('aria-label', nE === 0 ? 'Opciones del evento'
    : nE === 1 ? 'Opciones del evento: 1 guardado' : `Opciones del evento: ${nE} guardados`);
  /* guardar en mitad de la tanda la cortaba por la mitad: se ofrece
     cuando el evento ya terminó, que es cuando hay algo cerrado que
     guardar */
  $menuGuardarLi.hidden = !E.fin || !!mirando;
  $menuGuardarTxt.textContent = `Guardar «${eventoActivo()}»`;
  /* la X de la cabecera: quita el evento que se está mirando */
  $listaQuitar.hidden = !mirando;
  if (mirando) $listaQuitar.setAttribute('aria-label', `Eliminar «${nombre}»`);
  /* «Borrar todo» barre la herramienta entera, así que se ofrece siempre
     que haya algo que barrer: un evento guardado, tiempo corrido, un
     nombre puesto o un reparto distinto del estándar */
  $menuVaciarLi.hidden = !(nE || hayCorrido() || E.nombre || E.encabezado || !repartoEstandar());
  $menuVaciarTxt.textContent = 'Borrar todo';
  $listaLapiz.hidden = !!mirando || !!$('.lista-titulo-campo', $listaTitulo);
  $listaVolver.hidden = !mirando;
  /* El menos recoge el panel entero y devuelve el sitio al reloj: es lo
     mismo que «Ocultar» del menú de abajo, no una tercera cosa. Tener
     un «minimizar» que escondía las etapas y dejaba el encabezado se
     peleaba con el menú de eventos, que se abría sobre nada. */
  $listaPlegar.setAttribute('aria-label', `Ocultar «${nombre}»`);
  $listaPlegar.title = 'Ocultar';
  const b = $('#lista-titulo-b');
  if (b) {
    b.textContent = nombre;
    b.title = mirando ? `${nombre} · evento guardado` : 'Cambiar el nombre del evento';
    b.disabled = !!mirando;
  }
  if (nE === 0 && abierto($eventosMenu)) cerrarEventos(false);
}

function armarFilas() {
  const mirando = eventoVisto();
  const filas = etapasVistas().map((e, i) =>
    `<li class="et" data-i="${i}" style="--c:var(--e${(i % 6) + 1})">` +
      `<span class="et-n" aria-hidden="true">${i + 1}</span>` +
      `<span class="et-textos"><span class="et-nombre"></span><span class="et-donde"></span></span>` +
      `<span class="et-cifras"><span class="et-t"></span><span class="et-dif"></span></span>` +
      (mirando ? '' :
        `<span class="et-mover" aria-hidden="false">` +
          `<button type="button" class="et-flecha" data-subir="${i}"${i === 0 ? ' disabled' : ''} aria-label="Subir la etapa ${i + 1}" title="Subir">${ico('arriba')}</button>` +
          `<button type="button" class="et-flecha" data-bajar="${i}"${i === etapasVistas().length - 1 ? ' disabled' : ''} aria-label="Bajar la etapa ${i + 1}" title="Bajar">${ico('abajo')}</button>` +
        `</span>` +
        `<button type="button" class="et-lapiz" data-editar="${i}" aria-label="Cambiar el nombre y el tiempo de la etapa ${i + 1}" title="Cambiar">${ico('lapiz')}</button>`) +
    `</li>`).join('');
  const mas = mirando || E.etapas.length >= MAX_ETAPAS ? '' :
    `<li class="et-mas-caja"><button type="button" class="et-mas" id="et-mas-lista" aria-label="Añadir una etapa" title="Añadir etapa">${ico('mas')}</button></li>`;
  $etLista.innerHTML = filas + mas;
}

function pintarFilas(t) {
  const mirando = eventoVisto();
  etapasVistas().forEach((e, i) => {
    const li = $(`li[data-i="${i}"]`, $etLista);
    if (!li || i === editandoEtapa) return;
    const hecha = mirando ? i < mirando.cortes.length : i < E.cortes.length;
    const ahora = !mirando && i === E.actual && !hecha;
    /* elegir una etapa es elegirla para rehacerla, y no se rehace lo que
       aún no ocurrió: la que espera se deja cambiar —su lápiz sigue
       ahí— pero no se elige */
    const tocable = !mirando;
    li.className = 'et' + (mirando ? ' quieta' : '') + (ahora ? ' ahora' : hecha ? ' hecha' : ' espera') +
      (tocable ? ' tocable' : '') + (!mirando && E.sel === i ? ' elegida' : '');
    if (tocable) { li.setAttribute('role', 'button'); li.setAttribute('tabindex', '0'); }
    else { li.removeAttribute('role'); li.removeAttribute('tabindex'); }
    const nom = $('.et-nombre', li);
    if (nom.textContent !== e.n) { nom.textContent = e.n; nom.title = e.n; }
    const real = mirando ? realEnEvento(mirando, i) : realDe(i, t);
    const donde = ahora ? `etapa ${i + 1} de ${E.etapas.length}` : (hecha ? `previsto ${enReloj(e.plan, 0)}` : '');
    const $d = $('.et-donde', li);
    if ($d.textContent !== donde) $d.textContent = donde;
    const $t = $('.et-t', li), $dif = $('.et-dif', li);
    const cifra = real === null ? enReloj(e.plan, 0) : enReloj(real, 0);
    if ($t.textContent !== cifra) $t.textContent = cifra;
    let dif = '', clase = 'et-dif';
    if (real !== null && (hecha || real > e.plan)) {
      const d = real - e.plan;
      dif = Math.abs(d) < 1000 ? 'en su tiempo' : duracion(d, 0, true);
      clase += d >= 1000 ? ' sube' : d <= -1000 ? ' baja' : '';
    } else if (real !== null) {
      dif = `de ${enReloj(e.plan, 0)}`;
    }
    if ($dif.textContent !== dif) $dif.textContent = dif;
    if ($dif.className !== clase) $dif.className = clase;
    const etq = tocable ? `${e.n}. ${E.sel === i ? 'Elegida' : 'Elegir esta etapa'}` : e.n;
    if (li.getAttribute('aria-label') !== etq) li.setAttribute('aria-label', etq);
    if (tocable) li.setAttribute('aria-pressed', E.sel === i ? 'true' : 'false');
    else li.removeAttribute('aria-pressed');
  });
  requestAnimationFrame(bordesLista);
}

function desplazarAlActual() {
  const li = $(`li[data-i="${E.actual}"]`, $etLista);
  if (li) li.scrollIntoView({ block: 'nearest', behavior: reducido() ? 'auto' : 'smooth' });
}

function bordesLista() {
  const ol = $etLista;
  ol.classList.toggle('hay-arriba', ol.scrollTop > 2);
  ol.classList.toggle('hay-abajo', ol.scrollHeight - ol.clientHeight - ol.scrollTop > 2);
}
$etLista.addEventListener('scroll', bordesLista, { passive: true });
if (window.ResizeObserver) new ResizeObserver(bordesLista).observe($etLista);

function latirClip() {
  if (reducido()) return;
  $btnClip.classList.remove('late');
  void $btnClip.offsetWidth;
  $btnClip.classList.add('late');
}

function ocultarEtapas(si) {
  E.ocultas = si;
  aplicarLista();
  guardar();
}

/* el encabezado de la lista se puede renombrar */
let cerrarEncabezado = () => {};
function editarEncabezado() {
  const h = $listaTitulo;
  if ($('.lista-titulo-campo', h)) return;
  const antes = E.encabezado;
  h.innerHTML = `<input type="text" class="lista-titulo-campo" id="lista-encabezado" maxlength="28" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="Etapas" aria-label="Encabezado de la lista">`;
  const c = $('.lista-titulo-campo', h);
  c.value = E.encabezado;
  c.focus(); c.select();
  $listaLapiz.hidden = true;
  let hecho = false;
  cerrarEncabezado = guardarlo => {
    if (hecho) return; hecho = true;
    E.encabezado = guardarlo ? c.value.replace(/\s+/g, ' ').trim().slice(0, 28) : antes;
    h.innerHTML = `<button type="button" class="lista-titulo-b" id="lista-titulo-b"></button>`;
    $listaLapiz.hidden = false;
    cerrarEncabezado = () => {};
    aplicarLista();
    guardar();
  };
  c.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); cerrarEncabezado(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarEncabezado(false); }
  });
  c.addEventListener('blur', () => cerrarEncabezado(true));
}
$listaTitulo.addEventListener('click', e => { if (e.target.closest('.lista-titulo-b')) editarEncabezado(); });
$listaLapiz.addEventListener('click', editarEncabezado);
$listaPlegar.addEventListener('click', () => { cerrarEventos(false); ocultarEtapas(true); });

/* ── Los eventos: una tanda de etapas que se guarda ──────────────────
   Un grupo hace sus etapas, se guarda, y el siguiente grupo repite el
   mismo reparto. Después se comparan: qué grupo se pasó y en qué parte.
   Es lo mismo que las rondas del cronómetro de actividad, con etapas en
   vez de marcas. */
const eventoActivo = () => E.encabezado || 'Etapas';
const nombreEvento = v => `${v.base} ${v.n}`;
/* cada evento lleva un color, que es lo que lo distingue de un vistazo en
   el menú y en la comparación. Sale del mismo anillo de la paleta. */
const colorEvento = i => `var(--e${(i % 6) + 1})`;
const colorActivo = () => colorEvento(E.eventos.length);
const hayCorrido = () => E.cortes.length > 0 || tiempo() > 0;
/* ¿el reparto sigue siendo el de fábrica? */
const repartoEstandar = () => {
  const f = etapasDeFabrica();
  return E.etapas.length === f.length && E.etapas.every((e, i) => e.n === f[i].n && e.plan === f[i].plan);
};

function archivarEvento() {
  if (!E.cortes.length) return null;
  /* si el encabezado ya termina en número, no se le pega otro:
     «Concurso 1» guardado era «Concurso 1 1» */
  const base = eventoActivo().replace(/\s+\d+$/, '').trim() || eventoActivo();
  const n = E.eventos.reduce((mx, v) => (v.base === base && v.n > mx ? v.n : mx), 0) + 1;
  const v = {
    id: sigEvento++, base, n, fecha: Date.now(), total: Math.floor(tiempo()),
    etapas: E.etapas.map(e => ({ n: e.n, plan: e.plan })),
    cortes: E.cortes.slice()
  };
  E.eventos.push(v);
  while (E.eventos.length > MAX_EVENTOS) E.eventos.shift();
  return v;
}

/* el evento que se está mirando: el de ahora, o uno guardado */
const eventoVisto = () => (E.viendo === null ? null : E.eventos.find(v => v.id === E.viendo) || null);
const etapasVistas = () => { const v = eventoVisto(); return v ? v.etapas : E.etapas; };
const tituloVisto = () => { const v = eventoVisto(); return v ? nombreEvento(v) : eventoActivo(); };

function verEvento(id) {
  E.viendo = id;
  if (E.ocultas) E.ocultas = false;
  rehacerFilas();
  aplicarLista();
  $etLista.scrollTop = 0;
  guardar();
}

function guardarEvento(desdeReinicio) {
  const v = archivarEvento();
  if (!v) return null;
  const antes = { acum: tiempo(), t0: E.t0, cortes: E.cortes.slice(), actual: E.actual, fin: E.fin };
  /* guardar abre una lista **nueva**, con el estándar de la casa y su
     nombre: si heredara el reparto y el encabezado del evento recién
     archivado no se notaría que es otra, y se confunde con la anterior
     puesta en cero. */
  E.acum = 0; E.t0 = null; E.cortes = []; E.actual = 0; E.fin = false; E.viendo = null; E.sel = null;
  E.etapas = etapasDeFabrica();
  E.encabezado = '';
  previstoHecho = -1;
  agotadaAvisada = false;
  tramoActual = '';
  /* guardar no pregunta ni ofrece deshacer: lo guardado sigue ahí, en la
     lista de eventos, y de ahí se elimina si sobra. Deshacer es para lo
     que desaparece. */
  void antes;
  return v;
}

/* «Borrar todo» barre de verdad: los eventos guardados, el que está en
   marcha, el reparto, el nombre de la actividad y los ajustes. Queda la
   herramienta como recién abierta, con el estándar de la casa. Borrar a
   medias era peor que no borrar: quedaban restos y no se veía cuáles. */
const AJUSTES_FABRICA = { avisar: true, sonido: false, seguir: false, senal: true, despierta: true, final: false };
function borrarTodo() {
  const antes = {
    eventos: E.eventos.slice(), nombre: E.nombre, encabezado: E.encabezado,
    etapas: E.etapas.map(e => ({ n: e.n, plan: e.plan })),
    cortes: E.cortes.slice(), actual: E.actual, fin: E.fin, acum: tiempo(), corria: corre(),
    avisar: E.avisar, sonido: E.sonido, seguir: E.seguir, senal: E.senal,
    despierta: E.despierta, final: E.final, ocultas: E.ocultas
  };
  cerrarComparar(false);
  cerrarEtapa(false);
  if (corre()) { E.acum = tiempo(); E.t0 = null; }
  E.eventos = []; E.viendo = null; E.sel = null;
  E.nombre = ''; E.encabezado = '';
  E.etapas = etapasDeFabrica();
  E.cortes = []; E.actual = 0; E.fin = false; E.acum = 0; E.t0 = null;
  E.ocultas = false; E.plegada = false;
  Object.assign(E, AJUSTES_FABRICA);
  agotadaAvisada = false; tramoActual = ''; previstoHecho = -1;
  try { localStorage.removeItem(CLAVE); } catch (e) { /* sin memoria: igual */ }
  $din.value = '';
  ajustarDinamica();
  sincronizarAjustes();
  rehacerEtapas();
  avisar('Se borró todo', () => {
    E.eventos = antes.eventos; E.nombre = antes.nombre; E.encabezado = antes.encabezado;
    E.etapas = antes.etapas.map(e => nuevaEtapa(e.n, e.plan));
    E.cortes = antes.cortes; E.actual = antes.actual; E.fin = antes.fin;
    E.acum = antes.acum; E.t0 = null;
    E.avisar = antes.avisar; E.sonido = antes.sonido; E.seguir = antes.seguir; E.senal = antes.senal;
    E.despierta = antes.despierta; E.final = antes.final;
    E.ocultas = antes.ocultas;
    agotadaAvisada = false; tramoActual = ''; previstoHecho = -1;
    $din.value = antes.nombre;
    ajustarDinamica();
    sincronizarAjustes();
    rehacerEtapas();
  });
}

/* ── Navegar entre etapas: una clase no va en línea recta ────────────
   Tocar una etapa ya corrida —o la que corre— la empieza de nuevo: se
   borra su tiempo y el de las que vinieran después, y el reloj vuelve a
   donde empezaba. Las que aún no han pasado no se tocan: no se puede
   rehacer algo que no ocurrió. */
/* Tocar una etapa la **selecciona**; lo que la reinicia es el botón de
   Reiniciar, que mientras hay una seleccionada dice su nombre. Así una
   clase que se tuerce se arregla con los mandos de siempre, sin gestos
   nuevos que aprender ni avisos que leer. */
/* Se elige cualquier etapa: la elegida es la que se mueve de sitio con
   las flechas, y —si ya corrió o está corriendo— la que reinicia el
   botón de siempre. Una que aún no ha pasado se puede mover pero no
   rehacer: no se rehace lo que no ocurrió. */
const reiniciable = i => i !== null && i <= E.actual;
function seleccionar(i) {
  if (eventoVisto()) return;
  E.sel = (E.sel === i || i === null) ? null : i;
  rehacerFilas();
  actualizar();
}
/* mover una etapa dentro de la columna: se lleva consigo su tiempo ya
   corrido, para que la lista siga diciendo la verdad */
function moverEtapa(i, paso) {
  const j = i + paso;
  if (eventoVisto() || j < 0 || j >= E.etapas.length) return;
  cerrarEtapa(true);
  const dur = k => (k < E.cortes.length ? E.cortes[k] - (k > 0 ? E.cortes[k - 1] || 0 : 0) : null);
  const duraciones = E.etapas.map((_, k) => dur(k));
  const corridas = E.cortes.length;
  [E.etapas[i], E.etapas[j]] = [E.etapas[j], E.etapas[i]];
  [duraciones[i], duraciones[j]] = [duraciones[j], duraciones[i]];
  /* los cortes se rehacen de las duraciones: solo tienen sentido las que
     de verdad se midieron, y esas siguen a su etapa */
  if (corridas) {
    const nuevos = [];
    let suma = 0;
    for (let k = 0; k < corridas; k++) {
      if (duraciones[k] === null) break;
      suma += duraciones[k];
      nuevos.push(suma);
    }
    E.cortes = nuevos;
    if (E.actual > E.cortes.length) E.actual = E.cortes.length;
  }
  E.sel = j;
  previstoHecho = -1;
  tramoActual = '';
  guardar();
  rehacerFilas();
  actualizar();
  const li = $(`li[data-i="${j}"]`, $etLista);
  if (li) {
    li.scrollIntoView({ block: 'nearest', behavior: reducido() ? 'auto' : 'smooth' });
    const b = $(`[data-${paso < 0 ? 'subir' : 'bajar'}]`, li);
    if (b && !b.disabled) b.focus({ preventScroll: true });
  }
}
function reiniciarEtapa(i) {
  if (i === null || i < 0 || i >= E.etapas.length) return;
  const base = i > 0 ? (E.cortes[i - 1] || 0) : 0;
  E.cortes.length = i;
  E.actual = i;
  E.fin = false;
  E.acum = base;
  if (corre()) E.t0 = performance.now();
  E.sel = null;
  agotadaAvisada = false;
  tramoActual = '';
  guardar();
  rehacerFilas();
  actualizar();
  programarEtapa();
  desplazarAlActual();
}
$etLista.addEventListener('click', e => {
  /* una fila en edición es suya: tocar dentro de ella —el nombre, los
     minutos, los segundos, sus botones— no vuelve a elegir la etapa.
     Antes solo se libraba `.et-campo`, así que el clic en los minutos
     rehacía la lista y cerraba la edición al instante. */
  if (e.target.closest('li.editando') || e.target.closest('[data-editar]') || e.target.closest('.et-mas')) return;
  const li = e.target.closest('li[data-i]');
  if (!li || eventoVisto()) { return; }
  seleccionar(Number(li.dataset.i));
});
$etLista.addEventListener('keydown', e => {
  /* la fila tiene papel de botón y responde a Enter y al espacio, pero
     dentro de un campo el espacio es una letra más: sin esta salida,
     escribir «Trabajo en parejas» elegía la etapa al primer espacio y
     cerraba la edición, de modo que los nombres no pasaban de una
     palabra */
  if (escribiendo(e.target) || (e.target.closest && e.target.closest('li.editando'))) return;
  const li = e.target.closest && e.target.closest('li[data-i]');
  if (!li || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  seleccionar(Number(li.dataset.i));
});

/* ── Cambiar una etapa sin salir de la lista ─────────────────────────
   El panel de ajustes sigue estando para repartir de un vistazo, pero a
   media clase uno cambia una cosa: el nombre de la etapa que corre o su
   tiempo. Eso se hace aquí mismo, como las marcas del otro cronómetro. */
let editandoEtapa = null;
function editarEtapa(i) {
  if (eventoVisto()) return;
  cerrarEtapa(true);
  const e = E.etapas[i];
  const li = $(`li[data-i="${i}"]`, $etLista);
  if (!e || !li) return;
  editandoEtapa = i;
  E.sel = null;
  const x = Math.round(e.plan / 1000);
  li.className = 'et editando';
  li.removeAttribute('tabindex');
  li.removeAttribute('role');
  li.innerHTML =
    `<span class="et-n" aria-hidden="true">${i + 1}</span>` +
    `<input type="text" class="et-campo et-campo-n" id="et-n-${i}" maxlength="32" autocomplete="off" spellcheck="false" enterkeyhint="done" aria-label="Nombre de la etapa ${i + 1}">` +
    `<span class="et-campo-t">` +
      `<input type="text" class="campo-num" id="et-min-${i}" inputmode="numeric" autocomplete="off" maxlength="3" aria-label="Minutos de la etapa ${i + 1}">` +
      `<span class="aj-unidad" aria-hidden="true">:</span>` +
      `<input type="text" class="campo-num" id="et-seg-${i}" inputmode="numeric" autocomplete="off" maxlength="2" aria-label="Segundos de la etapa ${i + 1}">` +
    `</span>` +
    `<button type="button" class="et-accion et-quita" data-quita="${i}" aria-label="Quitar la etapa ${i + 1}" title="Quitar">${ico('basura')}</button>` +
    `<button type="button" class="et-accion et-ok" data-listo="${i}" aria-label="Guardar" title="Guardar">${ico('listo')}</button>`;
  const n = $('.et-campo-n', li), m = $(`#et-min-${i}`), g = $(`#et-seg-${i}`);
  n.value = e.n; m.value = String(Math.floor(x / 60)); g.value = dos(x % 60);
  li.addEventListener('mousedown', ev => { if (ev.target.closest('.et-accion')) ev.preventDefault(); });
  n.focus({ preventScroll: true });
  n.select();
  [n, m, g].forEach(c => {
    c.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); cerrarEtapa(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrarEtapa(false); }
    });
    c.addEventListener('blur', ev => {
      if (ev.relatedTarget && li.contains(ev.relatedTarget)) return;
      setTimeout(() => { if (editandoEtapa === i && !li.contains(document.activeElement)) cerrarEtapa(true); }, 0);
    });
  });
  if (m) m.addEventListener('input', () => { if (/\D/.test(m.value)) m.value = m.value.replace(/\D/g, ''); });
  if (g) g.addEventListener('input', () => { if (/\D/.test(g.value)) g.value = g.value.replace(/\D/g, ''); });
}
/* al soltarla se normaliza: el nombre en blanco toma el suyo y un tiempo
   en cero vuelve al que tenía. Mientras se escribe, nada se rellena. */
function cerrarEtapa(guardarlo) {
  if (editandoEtapa === null) return;
  const i = editandoEtapa;
  editandoEtapa = null;
  const e = E.etapas[i];
  const n = $(`#et-n-${i}`), m = $(`#et-min-${i}`), g = $(`#et-seg-${i}`);
  if (e && n && m && g && guardarlo) {
    e.n = n.value.replace(/\s+/g, ' ').trim().slice(0, NOMBRE_MAX) || `Etapa ${i + 1}`;
    const total = Math.min(ETAPA_MAX, ((parseInt(m.value.replace(/\D/g, ''), 10) || 0) * 60 +
      (parseInt(g.value.replace(/\D/g, ''), 10) || 0)) * 1000);
    if (total >= 1000) e.plan = total;
    previstoHecho = -1;
    tramoActual = '';
    agotadaAvisada = enEtapa(tiempo()) >= etapaActual().plan;
    guardar();
    programarEtapa();
  }
  rehacerFilas();
  actualizar();
}

/* Añadir y quitar no esperan a que el reloj esté en cero: si el maestro
   está editando, es porque la clase se torció y hace falta ahora. Quitar
   una etapa ya corrida se lleva su tiempo, y el total baja con ella. */
function anadirEtapa() {
  if (E.etapas.length >= MAX_ETAPAS) return;
  E.etapas.push(nuevaEtapa(`Etapa ${E.etapas.length + 1}`, 300000));
  /* añadir una etapa después de «Terminar» reabre el evento: la etapa
     nueva no se ha corrido, así que la actividad no está terminada. Sin
     esto quedaba en la lista pero muerta —ni seguía ni se reiniciaba
     sola—, que es peor que no dejar añadirla. */
  if (E.fin && E.cortes.length < E.etapas.length) {
    E.fin = false;
    E.actual = E.cortes.length;
    agotadaAvisada = false;
    tramoActual = '';
    E.sel = null;
  }
  previstoHecho = -1;
  guardar();
  rehacerFilas();
  actualizar();
  editarEtapa(E.etapas.length - 1);
}
function quitarEtapa(i) {
  if (E.etapas.length <= MIN_ETAPAS || i < 0 || i >= E.etapas.length) return;
  cerrarEtapa(false);
  const antes = { etapas: E.etapas.slice(), cortes: E.cortes.slice(), actual: E.actual, fin: E.fin, acum: E.acum };
  const dur = i < E.cortes.length ? E.cortes[i] - (i > 0 ? E.cortes[i - 1] || 0 : 0) : 0;
  const [fuera] = E.etapas.splice(i, 1);
  if (i < E.cortes.length) {
    E.cortes.splice(i, 1);
    for (let k = i; k < E.cortes.length; k++) E.cortes[k] -= dur;
    E.acum = Math.max(0, E.acum - dur);
  }
  if (E.actual > i) E.actual -= 1;
  if (E.actual >= E.etapas.length) E.actual = E.etapas.length - 1;
  if (E.cortes.length >= E.etapas.length) E.fin = true;
  E.sel = null;
  previstoHecho = -1;
  tramoActual = '';
  guardar();
  rehacerFilas();
  actualizar();
  avisar(`Se quitó «${fuera.n}»`, () => {
    E.etapas = antes.etapas; E.cortes = antes.cortes; E.actual = antes.actual; E.fin = antes.fin; E.acum = antes.acum;
    previstoHecho = -1; tramoActual = '';
    guardar();
    rehacerFilas();
    actualizar();
  });
}
$etLista.addEventListener('click', e => {
  const q = e.target.closest('[data-quita]');
  if (q) { quitarEtapa(Number(q.dataset.quita)); return; }
  const l = e.target.closest('[data-listo]');
  if (l) { cerrarEtapa(true); return; }
  const b = e.target.closest('[data-editar]');
  if (b) { editarEtapa(Number(b.dataset.editar)); return; }
  if (e.target.closest('.et-mas')) { anadirEtapa(); return; }
  const s = e.target.closest('[data-subir]');
  if (s) { moverEtapa(Number(s.dataset.subir), -1); return; }
  const j = e.target.closest('[data-bajar]');
  if (j) moverEtapa(Number(j.dataset.bajar), 1);
});

/* ── El menú de la cabecera: los eventos ─────────────────────────────
   Arriba se navega —de un evento a otro y a la comparación—; junto a
   Reiniciar se actúa. Son dos menús con dos oficios, no el mismo dos
   veces. */
function pintarEventosMenu() {
  /* cada evento se reconoce por su color: el nombre basta, sin explicar
     cuál es el de ahora más que con su marca de «activo» */
  /* cada evento guardado lleva su X al final de su renglón: se borra de
     un clic, ahí mismo donde se le ve, y eso sí ofrece deshacer */
  const filas = E.eventos.slice().reverse().map(v =>
    `<li role="none" class="r-fila"><button type="button" role="menuitem" data-evento="${v.id}" style="--c:${colorEvento(E.eventos.indexOf(v))}"${E.viendo === v.id ? ' aria-current="true"' : ''}>` +
      '<span class="r-color" aria-hidden="true"></span>' +
      `<span class="r-nombre">${esc(nombreEvento(v))}</span>` +
      `<span class="r-n">${enReloj(v.total, 0)}</span></button>` +
      `<button type="button" class="r-quitar" data-quitar-evento="${v.id}" aria-label="Eliminar «${esc(nombreEvento(v))}»" title="Eliminar">${ico('cerrar')}</button></li>`).join('');
  const hoy = `<li role="none"><button type="button" role="menuitem" data-evento="ahora" style="--c:${colorActivo()}"${E.viendo === null ? ' aria-current="true"' : ''}>` +
    '<span class="r-color" aria-hidden="true"></span>' +
    `<span class="r-nombre">${esc(eventoActivo())}</span><span class="r-activo">activo</span>` +
    `<span class="r-n">${enReloj(Math.floor(tiempo()), 0)}</span></button></li>`;
  let html = hoy + filas;
  if (hayComparacion()) {
    html += '<li role="none" class="r-sep" aria-hidden="true"></li>' +
      `<li role="none"><button type="button" role="menuitem" data-comparar="1">${ico('ola')}<span>Comparar eventos</span></button></li>`;
  }
  /* aquí arriba se navega y se empieza otro; el reparto vive en su propio
     botón de ajustes, que es donde se va a repartir, no a navegar */
  if (E.cortes.length && !eventoVisto()) {
    html += '<li role="none" class="r-sep" aria-hidden="true"></li>' +
      `<li role="none"><button type="button" role="menuitem" data-nuevo="1">${ico('mas')}<span>Añadir evento</span></button></li>`;
  }
  $eventosMenu.innerHTML = html;
}
let eventosPorTeclado = false;
function abrirEventos(porTeclado) {
  cerrarAjustes(false);
  cerrarClip(false);
  pintarEventosMenu();
  eventosPorTeclado = porTeclado;
  mostrar($eventosMenu);
  $listaMenu.setAttribute('aria-expanded', 'true');
  if (porTeclado) { const b = $('button', $eventosMenu); if (b) b.focus(); }
}
function cerrarEventos(devolverFoco) {
  if (!abierto($eventosMenu)) return;
  ocultar($eventosMenu);
  $listaMenu.setAttribute('aria-expanded', 'false');
  if (devolverFoco && eventosPorTeclado) $listaMenu.focus();
}
$listaMenu.addEventListener('click', e => { if (!abierto($eventosMenu)) abrirEventos(e.detail === 0); else cerrarEventos(e.detail === 0); });
$eventosMenu.addEventListener('click', e => {
  const q = e.target.closest('[data-quitar-evento]');
  if (q) { eliminarEvento(Number(q.dataset.quitarEvento)); return; }
  const b = e.target.closest('[data-evento]');
  if (b) { cerrarEventos(true); verEvento(b.dataset.evento === 'ahora' ? null : Number(b.dataset.evento)); return; }
  if (e.target.closest('[data-comparar]')) { cerrarEventos(false); abrirComparar(); return; }
  if (e.target.closest('[data-nuevo]')) { cerrarEventos(true); nuevoEvento(); }
});
/* cerrar el evento de ahora y abrir otro en limpio: es lo que se hace al
   terminar una tanda, y no tiene por qué pasar por «Reiniciar» */
function nuevoEvento() {
  if (!E.cortes.length || eventoVisto()) return;
  guardarEvento(false);
  rehacerFilas();
  actualizar();
  guardar();
}
$listaVolver.addEventListener('click', () => verEvento(null));
/* eliminar el evento que se está mirando, con su deshacer */
function eliminarEvento(id) {
  const i = E.eventos.findIndex(v => v.id === id);
  if (i < 0) return;
  const v = E.eventos[i], nombre = nombreEvento(v);
  cerrarComparar(false);
  E.eventos.splice(i, 1);
  if (E.viendo === id) E.viendo = null;
  guardar();
  rehacerFilas();
  actualizar();
  if (abierto($eventosMenu)) { if (E.eventos.length) pintarEventosMenu(); else cerrarEventos(false); }
  avisar(`Se eliminó «${nombre}»`, () => {
    E.eventos.splice(i, 0, v);
    guardar();
    rehacerFilas();
    actualizar();
    if (abierto($eventosMenu)) pintarEventosMenu();
  });
}
$listaQuitar.addEventListener('click', () => { const v = eventoVisto(); if (v) eliminarEvento(v.id); });

/* ── Comparar eventos: la misma etapa, grupo por grupo ───────────── */
const eventosComparables = () => {
  const t = E.eventos.slice();
  if (E.cortes.length) t.push({ id: 0, base: eventoActivo(), n: 0, ahora: true, total: Math.floor(tiempo()),
    etapas: E.etapas.map(e => ({ n: e.n, plan: e.plan })), cortes: E.cortes.slice() });
  return t;
};
const hayComparacion = () => eventosComparables().length >= 2;
const clave = s => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
const realEnEvento = (v, i) => (i < v.cortes.length ? v.cortes[i] - (i > 0 ? v.cortes[i - 1] || 0 : 0) : null);

function tablaComparacion() {
  const eventos = eventosComparables();
  const filas = new Map();
  eventos.forEach((v, col) => {
    v.etapas.forEach((e, i) => {
      const k = clave(e.n);
      if (!filas.has(k)) filas.set(k, { nombre: e.n, plan: e.plan, t: new Array(eventos.length).fill(null) });
      const f = filas.get(k);
      if (f.t[col] === null) f.t[col] = realEnEvento(v, i);
    });
  });
  const lista = [...filas.values()].map(f => {
    const vistos = f.t.map((x, i) => (x === null ? -1 : i)).filter(i => i >= 0);
    const cambio = vistos.length > 1 ? f.t[vistos[vistos.length - 1]] - f.t[vistos[0]] : null;
    const mejor = f.t.reduce((mj, x, i) => (x !== null && (mj < 0 || x < f.t[mj]) ? i : mj), -1);
    /* dos que tardaron lo mismo no tienen ganador: empate, y se dice */
    const empate = mejor >= 0 && f.t.filter(x => x !== null && x === f.t[mejor]).length > 1;
    return { ...f, cambio, cuantos: vistos.length, mejor, empate };
  });
  const totales = eventos.map(v => (v.cortes.length ? v.cortes[v.cortes.length - 1] : null));
  return { eventos, lista, totales };
}

function pintarComparacion() {
  const { eventos, lista, totales } = tablaComparacion();
  const tit = v => (v.ahora ? v.base : nombreEvento(v));
  const color = (v, i) => (v.ahora ? colorActivo() : colorEvento(i));
  $cmpSub.textContent = eventos.length === 2 ? 'Dos eventos, las mismas etapas.' : `${eventos.length} eventos, las mismas etapas.`;
  if (!lista.length) {
    $cmpMarco.innerHTML = '<p class="cmp-nada">Todavía no hay etapas corridas que comparar.</p>';
    $cmpNota.textContent = '';
    return;
  }
  /* La última columna no dice un número más: dice **quién fue más rápido**
     en esa etapa, con el color del evento. Es la métrica que importa. */
  const conMejor = lista.some(f => f.cuantos > 1);
  const cab = '<tr><th class="cmp-quien" scope="col">Etapa</th><th scope="col">Previsto</th>' +
    eventos.map((v, i) => `<th scope="col" class="cmp-ev" style="--c:${color(v, i)}"><span class="cmp-punto" aria-hidden="true"></span>${esc(tit(v))}</th>`).join('') +
    (conMejor ? '<th scope="col">Más rápido</th>' : '') + '</tr>';
  const cuerpo = lista.map(f => {
    const celdas = f.t.map((x, i) => x === null
      ? '<td class="cmp-t cmp-vacia">—</td>'
      : `<td class="cmp-t${f.cuantos > 1 && i === f.mejor ? ' cmp-mejor' : ''}">${enReloj(x, 0)}</td>`).join('');
    let mejor = '';
    if (conMejor) {
      mejor = f.cuantos > 1 && f.mejor >= 0
        ? (f.empate ? '<td class="cmp-gana cmp-empate">empate</td>'
          : `<td class="cmp-gana" style="--c:${color(eventos[f.mejor], f.mejor)}"><span class="cmp-punto" aria-hidden="true"></span>${esc(tit(eventos[f.mejor]))}</td>`)
        : '<td class="cmp-gana cmp-vacia">—</td>';
    }
    return `<tr><th class="cmp-quien" scope="row" title="${esc(f.nombre)}">${esc(f.nombre)}</th>` +
      `<td class="cmp-t cmp-plan">${enReloj(f.plan, 0)}</td>${celdas}${mejor}</tr>`;
  }).join('');
  const planTot = lista.reduce((a, f) => a + f.plan, 0);
  const vistos = totales.map((x, i) => (x === null ? -1 : i)).filter(i => i >= 0);
  const mejorTot = vistos.reduce((mj, i) => (mj < 0 || totales[i] < totales[mj] ? i : mj), -1);
  const totCeldas = totales.map((x, i) => x === null ? '<td class="cmp-t cmp-vacia">—</td>'
    : `<td class="cmp-t${vistos.length > 1 && i === mejorTot ? ' cmp-mejor' : ''}">${enReloj(x, 0)}</td>`).join('');
  const empateTot = mejorTot >= 0 && totales.filter(x => x !== null && x === totales[mejorTot]).length > 1;
  const ganaTot = conMejor ? (vistos.length > 1 && mejorTot >= 0
    ? (empateTot ? '<td class="cmp-gana cmp-empate">empate</td>'
      : `<td class="cmp-gana" style="--c:${color(eventos[mejorTot], mejorTot)}"><span class="cmp-punto" aria-hidden="true"></span>${esc(tit(eventos[mejorTot]))}</td>`)
    : '<td class="cmp-gana cmp-vacia">—</td>') : '';
  const pie = '<tr class="cmp-total"><th class="cmp-quien" scope="row">Total</th>' +
    `<td class="cmp-t cmp-plan">${enReloj(planTot, 0)}</td>${totCeldas}${ganaTot}</tr>`;
  $cmpMarco.innerHTML = `<table class="cmp"><thead>${cab}</thead><tbody>${cuerpo}${pie}</tbody></table>`;
  $cmpNota.textContent = conMejor ? 'En cada etapa gana quien tardó menos.' : '';
}

let focoPrevio = null;
function abrirComparar() {
  if (!hayComparacion()) return;
  cerrarClip(false);
  cerrarEventos(false);
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
$comparar.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('button, [tabindex="0"]', $comparar).filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const pri = f[0], ult = f[f.length - 1];
  if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
  else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
});

/* ── El clip de las etapas ──────────────────────────────────────────── */
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
$menuVer.addEventListener('click', e => { const t = e.detail === 0; cerrarClip(t); ocultarEtapas(!E.ocultas); });
$menuGuardar.addEventListener('click', e => { const t = e.detail === 0; cerrarClip(t); guardarEvento(false); rehacerFilas(); actualizar(); guardar(); });
$menuVaciar.addEventListener('click', e => { const t = e.detail === 0; cerrarClip(t); borrarTodo(); });

/* ── Señales: la sombra, el halo y la campana ───────────────────────── */
function sombra(tipo) {
  if (reducido() || typeof $sombra.animate !== 'function') return;
  $sombraIco.setAttribute('href', tipo === 'pausa' ? '#i-pausa' : tipo === 'siguiente' ? '#i-siguiente' : '#i-marcha');
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


/* ── Pantalla completa ──────────────────────────────────────────────── */
const raiz = document.documentElement;
let pcRespaldo = false;   /* donde el navegador no la permite, la pieza ocupa la ventana */
const pcNativa = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const enPC = () => pcNativa() || pcRespaldo;
/* Pasar a pantalla completa cambia media pieza de sitio, y **no** se
   envuelve en una transición de vista. Se hacía, y ahí estaba el tirón:
   el aviso de pantalla completa llega mientras el navegador todavía está
   agrandando la ventana, así que la transición congelaba una foto del
   tamaño viejo encima de la página viva y la soltaba de golpe al acabar.
   Dos animaciones sobre lo mismo se estorban. La del navegador ya hace
   el viaje; nosotros solo cambiamos la clase, y lo que se mueve dentro
   de la pieza lo lleva el CSS. */
function sincronizarPC() {
  cerrarClip(false);
  cerrarEventos(false);
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


/* ── Ajustes: el editor de etapas ───────────────────────────────────── */
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
  if (porTeclado) $ajAvisar.focus();
}
function cerrarAjustes(devolverFoco) {
  if (!abierto($ajustes)) return;
  ocultar($ajustes);
  $btnAjustes.setAttribute('aria-expanded', 'false');
  if (devolverFoco && ajustesPorTeclado) $btnAjustes.focus();
}
$btnAjustes.addEventListener('click', e => { if (!abierto($ajustes)) abrirAjustes(e.detail === 0); else cerrarAjustes(e.detail === 0); });
$ajCerrar.addEventListener('click', e => cerrarAjustes(e.detail === 0 || ajustesPorTeclado));

function sincronizarAjustes() {
  $ajAvisar.checked = E.avisar;
  $ajSenal.checked = E.senal;
  $ajSonido.checked = E.sonido;
  $ajSeguir.checked = E.seguir;
  $ajDespierta.checked = E.despierta;
  $ajFinal.checked = E.final;
}
$ajAvisar.addEventListener('change', () => { E.avisar = $ajAvisar.checked; tramoActual = ''; pintar(); guardar(); });
$ajSenal.addEventListener('change', () => { E.senal = $ajSenal.checked; tramoActual = ''; pintar(); guardar(); });
$ajSonido.addEventListener('change', () => { E.sonido = $ajSonido.checked; guardar(); });
$ajSeguir.addEventListener('change', () => { E.seguir = $ajSeguir.checked; guardar(); });
$ajDespierta.addEventListener('change', () => { E.despierta = $ajDespierta.checked; despertar(corre() && E.despierta); guardar(); });
$ajFinal.addEventListener('change', () => { E.final = $ajFinal.checked; if (E.final) campana(); guardar(); });

/* El panel de ajustes ya no edita etapas: eso se hace en la lista, con
   el lápiz de cada fila. Aquí solo queda lo del sistema —los avisos, la
   señal, el sonido, pasar sola—, que es lo que no cabe en una fila. */
function rehacerFilas() {
  previstoHecho = -1;
  armarPista();
  armarFilas();
  pintar();
}
function rehacerEtapas() {
  previstoHecho = -1;
  tramoActual = '';
  armarPista();
  armarFilas();
  actualizar();
  guardar();
}

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
  else { clearTimeout(ocultoT); if (corre()) { despertar(E.despierta); pintar(); pedir(); } }
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


/* ── El nombre de la actividad ───────────────────────────────────────── */
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


/* ── Mandos ─────────────────────────────────────────────────────────── */
$btnMarcha.addEventListener('click', alternar);
$btnSiguiente.addEventListener('click', () => { if (E.fin) nuevoEvento(); else siguiente(false); });
$btnReiniciar.addEventListener('click', pedirReinicio);

/* ── Teclado ────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = e.target;
  if (e.key === 'Escape') {
    if (abierto($comparar)) { cerrarComparar(true); e.preventDefault(); return; }
    if (abierto($eventosMenu)) { cerrarEventos(true); e.preventDefault(); return; }
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
    case 'v': case 'V': e.preventDefault(); siguiente(false); break;
    case 'b': case 'B': e.preventDefault(); atras(); break;
    case 'r': case 'R': e.preventDefault(); pedirReinicio(); break;
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
  if (abierto($ajustes) && !$ajustes.contains(e.target) && !$btnAjustes.contains(e.target) && !$listaMenu.contains(e.target)) cerrarAjustes(false);
  if (abierto($clipMenu) && !$clipMenu.contains(e.target) && !$btnClip.contains(e.target)) cerrarClip(false);
  if (abierto($eventosMenu) && !$eventosMenu.contains(e.target) && !$listaMenu.contains(e.target)) cerrarEventos(false);
}, true);
document.addEventListener('keydown', prepararAudio, true);
['click', 'touchend'].forEach(t => document.addEventListener(t, prepararAudio, { capture: true, passive: true }));
document.addEventListener('click', () => {
  if (performance.now() - ultimoPuntero > 1200) return;
  const a = document.activeElement;
  if (a && a !== document.body && a.matches('button, a, input[type="checkbox"], input[type="radio"]')) a.blur();
});

/* ── Arranque ───────────────────────────────────────────────────────── */
cargar();
$din.value = E.nombre;
ajustarDinamica();
aplicarInfo();
sincronizarAjustes();
armarPista();
armarFilas();
actualizar();
programarEtapa();
retirarCarga();

/* para las pruebas: se lee, no se toca */
window.s321Cronometro = Object.freeze({
  tiempo: () => tiempo(),
  estado: () => ({
    corre: corre(), tramo: tramoActual, fin: E.fin, actual: E.actual, sel: E.sel, acum: E.acum,
    etapas: E.etapas.map(e => ({ n: e.n, plan: e.plan })),
    cortes: E.cortes.slice(), info: E.info, ocultas: E.ocultas,
    eventos: E.eventos.map(v => ({ nombre: v.base + ' ' + v.n, cortes: v.cortes.slice() })), viendo: E.viendo
  })
});
})();
