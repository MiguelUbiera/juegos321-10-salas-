/* ═══════════════════════════════════════════════════════════════════════
   Secuencia321 · Semáforo de exposición · guion
   Fuente de index.html: se corrige aquí y se vuelve a construir.
   Lo que comparte con los demás cronómetros está copiado de la casa; lo
   propio es la lista de expositores, el reparto por marcas de tiempo y el
   cambio de color que hace de semáforo.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
'use strict';

/* ── Utilidades ─────────────────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const TITULO = 'Semáforo de exposición';
const TITULO_PAGINA = 'Semáforo de exposición · Secuencia321';
const CLAVE = 's321-cronometro-semaforo';
const VERSION = 1;
const escribiendo = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable ||
  (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(el.type)));
const NOMBRE_MAX = 40;
const MIN_EXP = 1;
const MAX_EXP = 40;
const TURNO_MAX = 180 * 60000;          // tres horas por turno, como tope
const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = (n, extra = '') => `<svg class="ico"${extra} aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ── Notación: punto decimal, como se escribe en la República Dominicana ─ */
const dos = n => String(n).padStart(2, '0');
const PASO = [1000, 100, 10, 1];
const cortar = (ms, p) => Math.floor(Math.max(0, ms) / PASO[p]) * PASO[p];
function partes(ms, p) {
  ms = cortar(ms, p);
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return {
    principal: h > 0 ? `${h}:${dos(m)}:${dos(ss)}` : `${dos(m)}:${dos(ss)}`,
    frac: p > 0 ? '.' + String(Math.floor((ms % 1000) / PASO[p])).padStart(p, '0') : ''
  };
}
const enReloj = (ms, p) => { const x = partes(ms, p); return x.principal + x.frac; };
const MENOS = '−';
function duracion(ms, p, conSigno) {
  const a = cortar(Math.abs(ms), p);
  let t;
  if (a < 60000) t = (a / 1000).toFixed(p) + ' s';
  else { const x = partes(a, p); t = x.principal.replace(/^0(?=\d:)/, '') + x.frac; }
  return (ms < 0 && a > 0 ? MENOS : conSigno ? '+' : '') + t;
}
function emDe(x) {
  const seps = (x.principal.match(/:/g) || []).length;
  const digitos = x.principal.length - seps;
  return digitos * 0.6 + seps * 0.46 + (x.frac ? x.frac.length * 0.6 * 0.46 + 0.02 : 0);
}
/* mm:ss de un campo de Ajustes, sin fracción: para leer y escribir Mínimo y Máximo */
const aMmSs = ms => { const s = Math.round(ms / 1000); return { m: Math.floor(s / 60), s: s % 60 }; };
const deMmSs = (m, s) => Math.max(0, (m * 60 + s) * 1000);


/* ── Estado ─────────────────────────────────────────────────────────── */
/* Un expositor solo lleva nombre; el tiempo —mínimo, máximo y el aviso de
   cierre— es uno solo para toda la actividad, repartido antes de empezar.
   `usado` y `marca` se llenan al cerrar su turno. */
const E = {
  nombre: '',
  minimo: 180000, maximo: 300000, aviso: 60000, precision: 0,
  parpadeo: true, sonido: true, despierta: true,
  orden: 'secuencial',
  expositores: [], actual: 0, fin: false,
  info: true, lista: true,
  acum: 0, t0: null
};
let sigId = 1, sigOrig = 1;
const corre = () => E.t0 !== null;
const tiempo = (ahora = performance.now()) => E.acum + (corre() ? ahora - E.t0 : 0);
const nuevoExpositor = nombre => ({ id: sigId++, orig: sigOrig++, nombre, estado: 'pendiente', usado: null, marca: null });
const expositorActual = () => (E.fin ? null : E.expositores[E.actual] || null);

/* El tramo es puro: solo mira el tiempo, nunca si el reloj corre o está en
   pausa. Así el color no vuelve al neutro por pausar a media exposición. */
function tramoDeT(t) {
  if (t <= 0) return 'espera';
  if (t >= E.maximo) return 'agotado';
  /* si el aviso pedido (30 s a 2 min) no cabe dentro de un máximo corto,
     se acorta para que siempre quede al menos un segundo de «en curso» */
  const aviso = Math.min(E.aviso, Math.max(0, E.maximo - 1000));
  if (t >= E.maximo - aviso) return 'cierra';
  return 'curso';
}
const tramoDe = t => (E.fin ? 'fin' : tramoDeT(t));
/* Cómo queda un turno cerrado, para la fila discreta de su historial:
   solo se marca la excepción —bajo el mínimo, cerca del máximo, pasado—;
   el turno corriente no lleva etiqueta. */
function marcaDe(usado) {
  if (usado < E.minimo) return { texto: 'bajo el mínimo', clase: 'antes' };
  const tr = tramoDeT(usado);
  if (tr === 'cierra') return { texto: 'cerca del máximo', clase: 'cierra' };
  if (tr === 'agotado') return { texto: duracion(usado - E.maximo, 0, true) + ' sobre el máximo', clase: 'agotado' };
  return { texto: '', clase: '' };
}

/* al cambiar el orden, solo se reparte lo que todavía no ha pasado: lo ya
   cerrado y quien presenta ahora no se mueven de sitio */
function barajar(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function reordenarPendientes() {
  const desde = E.fin ? 0 : E.actual + 1;
  const cola = E.expositores.slice(desde);
  if (E.orden === 'aleatorio') barajar(cola); else cola.sort((a, b) => a.orig - b.orig);
  E.expositores.splice(desde, cola.length, ...cola);
}

/* ── Memoria: si la página se recarga, sigue donde iba ─────────────── */
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      v: VERSION, nombre: E.nombre,
      minimo: E.minimo, maximo: E.maximo, aviso: E.aviso, precision: E.precision,
      parpadeo: E.parpadeo, sonido: E.sonido, despierta: E.despierta, orden: E.orden,
      info: E.info, lista: E.lista,
      expositores: E.expositores.map(p => ({ orig: p.orig, nombre: p.nombre, estado: p.estado, usado: p.usado, marca: p.marca })),
      actual: E.actual, fin: E.fin,
      acum: tiempo(), corriendo: corre(), reloj: Date.now()
    }));
  } catch (e) { /* sin memoria en este navegador: la herramienta sigue funcionando */ }
}
let guardarT = 0;
const guardarLuego = () => { clearTimeout(guardarT); guardarT = setTimeout(guardar, 350); };
function cargar() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { o = null; }
  if (!o || o.v !== VERSION) { E.expositores = [nuevoExpositor('')]; return; }
  const txt = (v, max) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  E.nombre = typeof o.nombre === 'string' ? o.nombre.replace(/[\r\n]+/g, ' ').slice(0, 70) : '';
  E.minimo = Number.isFinite(o.minimo) ? Math.max(0, Math.round(o.minimo / 1000) * 1000) : E.minimo;
  E.maximo = Number.isFinite(o.maximo) ? Math.max(1000, Math.round(o.maximo / 1000) * 1000) : E.maximo;
  E.aviso = [30000, 60000, 120000].includes(o.aviso) ? o.aviso : E.aviso;
  E.precision = o.precision === 1 ? 1 : 0;
  E.parpadeo = o.parpadeo !== false;
  E.sonido = o.sonido !== false;
  E.despierta = o.despierta !== false;
  E.orden = o.orden === 'aleatorio' ? 'aleatorio' : 'secuencial';
  E.info = o.info !== false;
  E.lista = o.lista !== false;
  E.expositores = (Array.isArray(o.expositores) ? o.expositores : []).slice(0, MAX_EXP)
    .map(p => (p ? { id: sigId++, orig: Number.isFinite(p.orig) ? p.orig : sigOrig++, nombre: txt(p.nombre, NOMBRE_MAX),
      estado: p.estado === 'hecho' ? 'hecho' : 'pendiente',
      usado: p.estado === 'hecho' && Number.isFinite(p.usado) ? Math.max(0, Math.floor(p.usado)) : null,
      marca: typeof p.marca === 'string' ? p.marca : null } : null))
    .filter(Boolean);
  if (!E.expositores.length) E.expositores = [nuevoExpositor('')];
  sigOrig = E.expositores.reduce((mx, p) => Math.max(mx, p.orig + 1), sigOrig);
  E.actual = Number.isFinite(o.actual) ? Math.min(Math.max(0, Math.floor(o.actual)), E.expositores.length - 1) : 0;
  E.fin = o.fin === true && E.expositores.every(p => p.estado === 'hecho');
  let acum = Number.isFinite(o.acum) ? Math.max(0, o.acum) : 0;
  if (o.corriendo === true && !E.fin && Number.isFinite(o.reloj)) {
    acum += Math.max(0, Date.now() - o.reloj);
    E.acum = acum; E.t0 = performance.now();
  } else E.acum = acum;
}

/* ── Referencias ────────────────────────────────────────────────────── */
const $pieza = $('#pieza'), $cuerpo = $('#cuerpo'), $reloj = $('#reloj'), $cifra = $('#cifra'),
  $estado = $('#estado'), $estadoTxt = $('#estado-txt'), $sombra = $('#sombra'), $sombraIco = $('#sombra-ico'),
  $pista = $('#pista'), $pistaLleno = $('#pista-lleno'), $pistaMin = $('#pista-min'),
  $btnMarcha = $('#btn-marcha'), $marchaIco = $('#marcha-ico'),
  $btnSiguiente = $('#btn-siguiente'), $siguienteIco = $('#siguiente-ico'),
  $btnReiniciar = $('#btn-reiniciar'), $reiniciarTxt = $('#reiniciar-txt'),
  $btnLista = $('#btn-lista'), $lista = $('#lista'), $expLista = $('#exp-lista'), $segOrden = $('#seg-orden'),
  $expone = $('#expone'), $exponeCampo = $('#expone-campo'),
  $din = $('#dinamica'), $dinCampo = $('#dinamica-campo'),
  $btnAjustes = $('#btn-ajustes'), $ajustes = $('#ajustes'), $ajCerrar = $('#ajustes-cerrar'),
  $ajMinM = $('#aj-min-m'), $ajMinS = $('#aj-min-s'), $ajMaxM = $('#aj-max-m'), $ajMaxS = $('#aj-max-s'),
  $segAviso = $('#seg-aviso'), $segPrecision = $('#seg-precision'),
  $ajParpadeo = $('#aj-parpadeo'), $ajSonido = $('#aj-sonido'), $ajDespierta = $('#aj-despierta'),
  $btnPantalla = $('#btn-pantalla'), $pantallaIco = $('#pantalla-ico'),
  $btnInfo = $('#btn-info'), $info = $('#info'), $infoInt = $('.info-int'),
  $aviso = $('#aviso'), $avisoTxt = $('#aviso-txt'), $avisoDeshacer = $('#aviso-deshacer');

/* ── Dibujar ────────────────────────────────────────────────────────── */
let cifraHecha = '', emHecho = 0, tituloHecho = '', tramoActual = '', minCruzado = false, pistaMinHecha = -1, raf = 0;

function pintarCifra(t) {
  const x = partes(t, E.precision);
  const html = x.principal.replace(/:/g, '<span class="sep">:</span>') + (x.frac ? `<span class="frac">${x.frac}</span>` : '');
  if (html !== cifraHecha) { $cifra.innerHTML = html; cifraHecha = html; }
  const em = Math.round((emDe(x)) * 1000) / 1000;
  if (em !== emHecho) { emHecho = em; $reloj.style.setProperty('--em', String(em)); }
}

function pintarPista(t) {
  if (E.maximo !== pistaMinHecha + 0 && false) { /* no-op: se sincroniza en sincronizarAjustes/ajustarTiempos */ }
  const f = Math.min(1, t / Math.max(1, E.maximo));
  $pistaLleno.style.width = (Math.round(f * 1000) / 10) + '%';
}
function pintarMarcaMin() {
  const fm = Math.min(1, E.minimo / Math.max(1, E.maximo));
  $pistaMin.style.left = (Math.round(fm * 1000) / 10) + '%';
}

const TEXTO_TRAMO = { espera: 'En espera', curso: 'En curso', cierra: 'Ve cerrando', agotado: 'Tiempo agotado', fin: 'Terminado' };
function aplicarTramo(tr, t) {
  if (t < E.minimo) minCruzado = false;
  else if (!minCruzado) { minCruzado = true; if (tramoActual) avisarMarca(); }
  if (tr === tramoActual) return;
  const yaPintado = tramoActual !== '';
  tramoActual = tr;
  $pieza.dataset.tramo = tr;
  $estadoTxt.textContent = TEXTO_TRAMO[tr] || '';
  if (yaPintado && tr === 'cierra') avisarMarca();
  else if (yaPintado && tr === 'agotado') { senal(); if (E.sonido) campana(); }
  if (tr === 'agotado') fijarFase(t);
}
const fijarFase = t => $pieza.style.setProperty('--fase', `${-Math.round(t % 1000)}ms`);

function pintarTitulo(t) {
  const p = expositorActual();
  const s = E.fin ? `${enReloj(t, 0)} · ${TITULO}` : `${enReloj(t, 0)}${p && p.nombre ? ' · ' + p.nombre : ''}`;
  if (s !== tituloHecho) { tituloHecho = s; document.title = corre() || t > 0 ? s : TITULO_PAGINA; }
}

function pintar(ahora = performance.now()) {
  const t = tiempo(ahora);
  aplicarTramo(tramoDe(t), t);
  pintarCifra(t);
  pintarPista(t);
  pintarTitulo(t);
  pintarFilaActual(t);
}
function bucle(ahora) { raf = 0; pintar(ahora); if (corre()) raf = requestAnimationFrame(bucle); }
function pedir() { if (!raf && corre()) raf = requestAnimationFrame(bucle); }

function etiqueta(apila, clave) { $$('[data-l]', apila).forEach(s => s.classList.toggle('ve', s.dataset.l === clave)); }

function actualizar() {
  const c = corre(), t = tiempo();
  $pieza.classList.toggle('corre', c);
  $marchaIco.setAttribute('href', c ? '#i-pausa' : '#i-marcha');
  const etqMarcha = c ? 'Pausar' : (t > 0 ? 'Seguir' : 'Iniciar');
  $btnMarcha.setAttribute('aria-label', etqMarcha);
  $btnMarcha.title = etqMarcha;
  $btnMarcha.disabled = E.fin;
  $btnSiguiente.disabled = E.fin;
  const esUltimo = E.actual >= E.expositores.length - 1;
  const etqSiguiente = esUltimo ? 'Terminar' : 'Siguiente';
  $btnSiguiente.setAttribute('aria-label', etqSiguiente);
  $btnSiguiente.title = etqSiguiente;
  $siguienteIco.setAttribute('href', esUltimo ? '#i-listo' : '#i-siguiente');
  $pieza.classList.toggle('parpadea', E.parpadeo);
  pintar();
  pedir();
  despertar(c && E.despierta);
  avivarMandos();
}

/* ── Acciones ───────────────────────────────────────────────────────── */
function alternar() {
  if (E.fin) return;
  const ahora = performance.now();
  if (corre()) { E.acum += ahora - E.t0; E.t0 = null; sombra('pausa'); }
  else { E.t0 = ahora; sombra('marcha'); }
  if (tramoActual === 'agotado') fijarFase(tiempo(ahora));
  guardar();
  actualizar();
}

/* Cierra el turno de quien presenta y pasa al siguiente. El último
   termina la ronda entera. Al pasar, el turno que empieza arranca solo:
   no tiene sentido pedir un segundo toque para seguir la ronda. */
function siguiente() {
  if (E.fin) return;
  const t = Math.floor(tiempo());
  const p = expositorActual();
  if (!p) return;
  const corria = corre();
  if (corria) { E.acum = t; E.t0 = null; }
  p.estado = 'hecho'; p.usado = t; p.marca = marcaDe(t).clase;
  if (E.actual >= E.expositores.length - 1) {
    E.fin = true;
    sombra('pausa');
  } else {
    E.actual += 1;
    E.acum = 0; E.t0 = null;
    sombra('siguiente');
  }
  tramoActual = ''; minCruzado = false;
  guardar();
  rehacerFilas();
  actualizar();
  sincronizarExpone();
  desplazarAlActual();
}

/* Volver al expositor anterior: se retoma su turno donde se dejó, no
   desde cero — se deshace el cierre, no el tiempo que ya corrió. */
function atras() {
  const i = E.fin ? E.expositores.length - 1 : E.actual - 1;
  if (i < 0) return;
  const p = E.expositores[i];
  if (!p || p.estado !== 'hecho') return;
  E.fin = false;
  E.acum = p.usado || 0; E.t0 = null;
  p.estado = 'pendiente'; p.usado = null; p.marca = null;
  E.actual = i;
  tramoActual = ''; minCruzado = false;
  guardar();
  rehacerFilas();
  actualizar();
  sincronizarExpone();
  desplazarAlActual();
}

/* Reiniciar vuelve toda la ronda al principio, con la misma lista: no la
   borra —para eso está quitar cada fila—, solo pone los relojes en cero. */
function reiniciarSesion() {
  E.expositores.forEach(p => { p.estado = 'pendiente'; p.usado = null; p.marca = null; });
  E.actual = 0; E.fin = false; E.acum = 0; E.t0 = null;
  tramoActual = ''; minCruzado = false;
  ocultarAviso();
  guardar();
  rehacerFilas();
  actualizar();
  sincronizarExpone();
}
let reinicioT = 0;
function volverReinicio() { clearTimeout(reinicioT); $btnReiniciar.classList.remove('confirmar'); etiqueta($reiniciarTxt, 'reiniciar'); }
function pedirReinicio() {
  if ($btnReiniciar.classList.contains('confirmar')) { volverReinicio(); reiniciarSesion(); return; }
  $btnReiniciar.classList.add('confirmar');
  etiqueta($reiniciarTxt, 'toca');
  clearTimeout(reinicioT);
  reinicioT = setTimeout(volverReinicio, 3000);
}

/* ── La lista de expositores ─────────────────────────────────────────── */
function armarFilas() {
  const desde = E.fin ? 0 : E.actual + 1;
  const filas = E.expositores.map((p, i) => {
    const actual = !E.fin && i === E.actual;
    const hecho = p.estado === 'hecho';
    const pendiente = !actual && !hecho;
    const clase = 'exp' + (actual ? ' actual' : '') + (hecho ? ' hecho' : '');
    let cifras = '';
    if (actual) cifras = `<span class="exp-cifras"><span class="exp-t" id="exp-t-actual"></span></span>`;
    else if (hecho) {
      const m = marcaDe(p.usado || 0);
      cifras = `<span class="exp-cifras"><span class="exp-t">${enReloj(p.usado || 0, 0)}</span>` +
        (m.texto ? `<span class="exp-marca ${m.clase}">${m.texto}</span>` : '') + `</span>`;
    }
    let controles = '';
    if (pendiente) {
      controles = `<span class="exp-mover">` +
        `<button type="button" class="exp-flecha" data-subir="${i}"${i <= desde ? ' disabled' : ''} aria-label="Subir a ${esc(p.nombre || 'este expositor')}" title="Subir">${ico('arriba')}</button>` +
        `<button type="button" class="exp-flecha" data-bajar="${i}"${i >= E.expositores.length - 1 ? ' disabled' : ''} aria-label="Bajar a ${esc(p.nombre || 'este expositor')}" title="Bajar">${ico('abajo')}</button>` +
        `</span>` +
        `<button type="button" class="exp-lapiz" data-editar="${i}" aria-label="Cambiar el nombre del expositor ${i + 1}" title="Cambiar">${ico('lapiz')}</button>` +
        `<button type="button" class="exp-quitar" data-quitar="${i}" aria-label="Quitar al expositor ${i + 1}" title="Quitar">${ico('basura')}</button>`;
    }
    return `<li class="${clase}" data-i="${i}">` +
      `<span class="exp-n" aria-hidden="true">${i + 1}</span>` +
      `<span class="exp-nombre">${esc(p.nombre || `Expositor ${i + 1}`)}</span>` +
      cifras + controles + `</li>`;
  }).join('');
  const mas = E.expositores.length >= MAX_EXP ? '' :
    `<li class="exp-mas-caja"><button type="button" class="exp-mas" id="exp-mas" aria-label="Añadir un expositor" title="Añadir expositor">${ico('mas')}</button></li>`;
  $expLista.innerHTML = filas + mas;
}
function pintarFilaActual(t) {
  const el = $('#exp-t-actual');
  if (!el || editandoExp !== null) return;
  const s = enReloj(t, 0);
  if (el.textContent !== s) el.textContent = s;
}
function desplazarAlActual() {
  if (E.fin) return;
  const li = $(`li[data-i="${E.actual}"]`, $expLista);
  if (li) li.scrollIntoView({ block: 'nearest', behavior: reducido() ? 'auto' : 'smooth' });
}
function bordesLista() {
  const ol = $expLista;
  ol.classList.toggle('hay-arriba', ol.scrollTop > 2);
  ol.classList.toggle('hay-abajo', ol.scrollHeight - ol.clientHeight - ol.scrollTop > 2);
}
$expLista.addEventListener('scroll', bordesLista, { passive: true });
if (window.ResizeObserver) new ResizeObserver(bordesLista).observe($expLista);

function rehacerFilas() { armarFilas(); requestAnimationFrame(bordesLista); }

/* ── Orden: por la lista, o al azar ───────────────────────────────────── */
$segOrden.addEventListener('click', e => {
  const b = e.target.closest('button[data-orden]');
  if (!b || b.dataset.orden === E.orden) return;
  E.orden = b.dataset.orden;
  $$('button', $segOrden).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  reordenarPendientes();
  guardar();
  rehacerFilas();
  actualizar();
});

/* ── Añadir, quitar, mover y renombrar sin salir de la lista ─────────── */
let editandoExp = null;
function editarExpositor(i) {
  cerrarExpositor(true);
  const p = E.expositores[i];
  const li = $(`li[data-i="${i}"]`, $expLista);
  if (!p || !li) return;
  editandoExp = i;
  li.className = 'exp editando';
  li.removeAttribute('tabindex');
  li.innerHTML = `<span class="exp-n" aria-hidden="true">${i + 1}</span>` +
    `<input type="text" class="exp-campo" id="exp-n-${i}" maxlength="${NOMBRE_MAX}" autocomplete="off" spellcheck="false" enterkeyhint="done" aria-label="Nombre del expositor ${i + 1}">` +
    `<button type="button" class="exp-accion exp-quita" data-quita="${i}" aria-label="Quitar" title="Quitar">${ico('basura')}</button>` +
    `<button type="button" class="exp-accion exp-ok" data-listo="${i}" aria-label="Guardar" title="Guardar">${ico('listo')}</button>`;
  const n = $('.exp-campo', li);
  n.value = p.nombre;
  li.addEventListener('mousedown', ev => { if (ev.target.closest('.exp-accion')) ev.preventDefault(); });
  n.focus({ preventScroll: true });
  n.select();
  n.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); cerrarExpositor(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrarExpositor(false); }
  });
  n.addEventListener('blur', ev => {
    if (ev.relatedTarget && li.contains(ev.relatedTarget)) return;
    setTimeout(() => { if (editandoExp === i && !li.contains(document.activeElement)) cerrarExpositor(true); }, 0);
  });
}
function cerrarExpositor(guardarlo) {
  if (editandoExp === null) return;
  const i = editandoExp;
  editandoExp = null;
  const p = E.expositores[i];
  const n = $(`#exp-n-${i}`);
  if (p && n && guardarlo) {
    p.nombre = n.value.replace(/\s+/g, ' ').trim().slice(0, NOMBRE_MAX);
    guardar();
  }
  rehacerFilas();
  actualizar();
  if (p && i === E.actual && !E.fin) sincronizarExpone();
}
function anadirExpositor() {
  if (E.expositores.length >= MAX_EXP) return;
  const nuevo = nuevoExpositor('');
  E.expositores.push(nuevo);
  if (E.fin) {
    E.fin = false;
    E.actual = E.expositores.indexOf(nuevo);
    E.acum = 0; E.t0 = null;
    tramoActual = ''; minCruzado = false;
  }
  reordenarPendientes();
  guardar();
  rehacerFilas();
  actualizar();
  sincronizarExpone();
  editarExpositor(E.expositores.indexOf(nuevo));
}
function moverExpositor(i, paso) {
  const desde = E.fin ? 0 : E.actual + 1;
  const j = i + paso;
  if (j < desde || j >= E.expositores.length) return;
  [E.expositores[i], E.expositores[j]] = [E.expositores[j], E.expositores[i]];
  guardar();
  rehacerFilas();
  actualizar();
  const li = $(`li[data-i="${j}"]`, $expLista);
  if (li) {
    li.scrollIntoView({ block: 'nearest', behavior: reducido() ? 'auto' : 'smooth' });
    const b = $(`[data-${paso < 0 ? 'subir' : 'bajar'}]`, li);
    if (b && !b.disabled) b.focus({ preventScroll: true });
  }
}
function quitarExpositor(i) {
  const desde = E.fin ? 0 : E.actual + 1;
  if (i < desde || i >= E.expositores.length || E.expositores.length <= MIN_EXP) return;
  cerrarExpositor(false);
  const [fuera] = E.expositores.splice(i, 1);
  guardar();
  rehacerFilas();
  actualizar();
  avisar(`Se quitó «${fuera.nombre || 'Expositor'}»`, () => {
    E.expositores.splice(i, 0, fuera);
    guardar();
    rehacerFilas();
    actualizar();
  });
}
$expLista.addEventListener('click', e => {
  const q = e.target.closest('[data-quita]'); if (q) { cerrarExpositor(false); return; }
  const l = e.target.closest('[data-listo]'); if (l) { cerrarExpositor(true); return; }
  if (e.target.closest('li.editando')) return;
  const ed = e.target.closest('[data-editar]'); if (ed) { editarExpositor(Number(ed.dataset.editar)); return; }
  if (e.target.closest('.exp-mas')) { anadirExpositor(); return; }
  const s = e.target.closest('[data-subir]'); if (s) { moverExpositor(Number(s.dataset.subir), -1); return; }
  const j = e.target.closest('[data-bajar]'); if (j) { moverExpositor(Number(j.dataset.bajar), 1); return; }
  const qu = e.target.closest('[data-quitar]'); if (qu) quitarExpositor(Number(qu.dataset.quitar));
});

/* ── Quién presenta: espejo del expositor actual, editable en el sitio ── */
function colocarCaretAlFinal(el) {
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}
function sincronizarExpone() {
  const p = expositorActual();
  $expone.contentEditable = p ? 'true' : 'false';
  const val = p ? p.nombre : '';
  if ($expone.textContent !== val) $expone.textContent = val;
}
let exponeAntes = '';
$expone.addEventListener('focus', () => { exponeAntes = $expone.textContent; });
$expone.addEventListener('input', () => {
  const p = expositorActual();
  if (!p) return;
  if (/[\r\n]/.test($expone.textContent)) { $expone.textContent = $expone.textContent.replace(/\s*[\r\n]+\s*/g, ' '); colocarCaretAlFinal($expone); }
  if ($expone.textContent.length > NOMBRE_MAX) { $expone.textContent = $expone.textContent.slice(0, NOMBRE_MAX); colocarCaretAlFinal($expone); }
  p.nombre = $expone.textContent;
  const fila = $(`li[data-i="${E.actual}"] .exp-nombre`, $expLista);
  if (fila) fila.textContent = p.nombre || `Expositor ${E.actual + 1}`;
  guardarLuego();
});
$expone.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $expone.blur(); }
  else if (e.key === 'Escape') {
    e.preventDefault(); e.stopPropagation();
    $expone.textContent = exponeAntes;
    const p = expositorActual(); if (p) p.nombre = exponeAntes;
    $expone.blur();
  }
});
$expone.addEventListener('blur', () => {
  const p = expositorActual();
  if (!p) return;
  const limpio = $expone.textContent.replace(/\s+/g, ' ').trim();
  if ($expone.textContent !== limpio) $expone.textContent = limpio;
  p.nombre = limpio;
  rehacerFilas();
  guardar();
});
$exponeCampo.addEventListener('click', e => {
  if (e.target === $expone || !expositorActual()) return;
  $expone.focus();
  colocarCaretAlFinal($expone);
});

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
$dinCampo.addEventListener('click', e => {
  if (e.target === $din) return;
  $din.focus(); const n = $din.value.length; $din.setSelectionRange(n, n);
});
if (window.ResizeObserver) new ResizeObserver(() => ajustarDinamica()).observe($dinCampo);

/* ── Señales: la sombra, el destello y la campana ────────────────────── */
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
function senal() {
  if (reducido()) return;
  $pieza.classList.add('halo');
  clearTimeout(haloT);
  haloT = setTimeout(() => $pieza.classList.remove('halo'), 150);
}
/* cruzar el mínimo o entrar en el tramo de cierre: el destello siempre, y
   además el clic breve si «Sonar al cruzar cada marca» está activo. El
   máximo no pasa por aquí: en «agotado» suena la campana entera. */
function avisarMarca() { senal(); if (E.sonido) tic(); }
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
/* un clic corto: cruzar el mínimo o entrar en el tramo de cierre no
   merece la campana entera, solo un aviso breve */
function tic() {
  if (!audio) return;
  try {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(720, audio.currentTime);
    g.gain.setValueAtTime(.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.4, audio.currentTime + .006);
    g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .15);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + .18);
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
let avisoT = 0, avisoDeshacerFn = null;
function avisar(texto, deshacer) {
  $avisoTxt.textContent = texto;
  avisoDeshacerFn = deshacer;
  $aviso.hidden = false;
  clearTimeout(avisoT);
  avisoT = setTimeout(ocultarAviso, 5000);
}
function ocultarAviso() { clearTimeout(avisoT); $aviso.hidden = true; avisoDeshacerFn = null; }
$avisoDeshacer.addEventListener('click', () => { const f = avisoDeshacerFn; ocultarAviso(); if (f) f(); });

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

/* ── La lista de expositores: se puede ocultar para que el reloj crezca ─
   El botón vive en la cabecera, no dentro de la propia lista: así sigue
   a mano para volver a mostrarla aunque esté oculta. */
function aplicarLista() {
  $cuerpo.classList.toggle('con-lista', E.lista);
  $lista.setAttribute('aria-hidden', E.lista ? 'false' : 'true');
  $lista.inert = !E.lista;
  $btnLista.setAttribute('aria-pressed', E.lista ? 'true' : 'false');
  const t = E.lista ? 'Ocultar la lista' : 'Ver la lista';
  $btnLista.setAttribute('aria-label', t);
  $btnLista.title = t;
  if (E.lista) requestAnimationFrame(bordesLista);
}
$btnLista.addEventListener('click', () => { E.lista = !E.lista; aplicarLista(); guardar(); });

/* ── Entrar y salir sin tirones ──────────────────────────────────────── */
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

/* ── Pantalla completa ──────────────────────────────────────────────── */
const raiz = document.documentElement;
let pcRespaldo = false;
const pcNativa = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const enPC = () => pcNativa() || pcRespaldo;
function sincronizarPC() { cerrarAjustes(false); pintarPC(); }
function pintarPC() {
  const si = enPC();
  raiz.classList.toggle('pc', si);
  $pantallaIco.setAttribute('href', si ? '#i-reducir' : '#i-ampliar');
  $btnPantalla.setAttribute('aria-label', si ? 'Salir de pantalla completa' : 'Pantalla completa');
  $btnPantalla.title = si ? 'Salir de pantalla completa' : 'Pantalla completa';
  if (abierto($ajustes)) colocarAjustes();
  avivarMandos();
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
    if (r && typeof r.then === 'function') { r.then(fijarHorizontal, respaldo); } else fijarHorizontal();
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

/* ── Ajustes ────────────────────────────────────────────────────────── */
let ajustesPorTeclado = false;
function colocarAjustes() {
  const r = $btnAjustes.getBoundingClientRect();
  const alto = Math.max(220, window.innerHeight - r.bottom - 26);
  $ajustes.style.setProperty('--aj-alto', alto + 'px');
}
function abrirAjustes(porTeclado) {
  ajustesPorTeclado = porTeclado;
  sincronizarAjustes();
  mostrar($ajustes);
  $btnAjustes.setAttribute('aria-expanded', 'true');
  colocarAjustes();
  if (porTeclado) $ajMinM.focus();
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
  const mn = aMmSs(E.minimo), mx = aMmSs(E.maximo);
  $ajMinM.value = String(mn.m); $ajMinS.value = dos(mn.s);
  $ajMaxM.value = String(mx.m); $ajMaxS.value = dos(mx.s);
  $$('button', $segAviso).forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.aviso) === E.aviso ? 'true' : 'false'));
  $$('button', $segPrecision).forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.precision) === E.precision ? 'true' : 'false'));
  $$('button', $segOrden).forEach(b => b.setAttribute('aria-pressed', b.dataset.orden === E.orden ? 'true' : 'false'));
  $ajParpadeo.checked = E.parpadeo;
  $ajSonido.checked = E.sonido;
  $ajDespierta.checked = E.despierta;
}
function leerTiempos() {
  const mn = deMmSs(parseInt($ajMinM.value.replace(/\D/g, ''), 10) || 0, parseInt($ajMinS.value.replace(/\D/g, ''), 10) || 0);
  let mx = deMmSs(parseInt($ajMaxM.value.replace(/\D/g, ''), 10) || 0, parseInt($ajMaxS.value.replace(/\D/g, ''), 10) || 0);
  if (mx < 1000) mx = 1000;
  E.minimo = Math.min(mn, mx);
  E.maximo = Math.max(mx, 1000);
  pintarMarcaMin();
  tramoActual = ''; minCruzado = false;
  guardar();
  actualizar();
}
[$ajMinM, $ajMinS, $ajMaxM, $ajMaxS].forEach(c => {
  c.addEventListener('input', () => { if (/\D/.test(c.value)) c.value = c.value.replace(/\D/g, ''); });
  c.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); c.blur(); } });
  c.addEventListener('blur', leerTiempos);
});
$segAviso.addEventListener('click', e => {
  const b = e.target.closest('button[data-aviso]'); if (!b) return;
  E.aviso = Number(b.dataset.aviso);
  $$('button', $segAviso).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  tramoActual = ''; guardar(); actualizar();
});
$segPrecision.addEventListener('click', e => {
  const b = e.target.closest('button[data-precision]'); if (!b) return;
  E.precision = Number(b.dataset.precision);
  $$('button', $segPrecision).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  cifraHecha = ''; guardar(); actualizar();
});
$ajParpadeo.addEventListener('change', () => { E.parpadeo = $ajParpadeo.checked; actualizar(); guardar(); });
$ajSonido.addEventListener('change', () => { E.sonido = $ajSonido.checked; guardar(); });
$ajDespierta.addEventListener('change', () => { E.despierta = $ajDespierta.checked; despertar(corre() && E.despierta); guardar(); });

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

/* ── La carga de la casa se retira cuando todo está listo ────────────── */
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

/* ── Mandos ─────────────────────────────────────────────────────────── */
$btnMarcha.addEventListener('click', alternar);
$btnSiguiente.addEventListener('click', siguiente);
$btnReiniciar.addEventListener('click', pedirReinicio);

/* ── Teclado ────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = e.target;
  if (e.key === 'Escape') {
    if (abierto($ajustes)) { cerrarAjustes(true); e.preventDefault(); return; }
    if (enPC()) { salirPC(); e.preventDefault(); }
    return;
  }
  if (escribiendo(el) || e.repeat) return;
  const enMando = el && el !== document.body && el.closest && el.closest('button, a, input, select, summary, [role="menuitem"]');
  switch (e.key) {
    case ' ': case 'Spacebar':
      if (enMando) return;
      e.preventDefault(); alternar(); break;
    case 'v': case 'V': e.preventDefault(); siguiente(); break;
    case 'b': case 'B': e.preventDefault(); atras(); break;
    case 'r': case 'R': e.preventDefault(); pedirReinicio(); break;
    case 'p': case 'P': e.preventDefault(); alternarPC(); break;
    default: break;
  }
});

let ultimoPuntero = -1e9;
document.addEventListener('pointerdown', e => {
  ultimoPuntero = performance.now();
  prepararAudio();
  if (abierto($ajustes) && !$ajustes.contains(e.target) && !$btnAjustes.contains(e.target)) cerrarAjustes(false);
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
sincronizarExpone();
aplicarInfo();
aplicarLista();
pintarMarcaMin();
rehacerFilas();
actualizar();
retirarCarga();

/* para las pruebas: se lee, no se toca */
window.s321Cronometro = Object.freeze({
  tiempo: () => tiempo(),
  estado: () => ({
    corre: corre(), tramo: tramoActual, fin: E.fin, actual: E.actual,
    expositores: E.expositores.map(p => ({ nombre: p.nombre, estado: p.estado, usado: p.usado, marca: p.marca })),
    minimo: E.minimo, maximo: E.maximo, aviso: E.aviso, orden: E.orden
  })
});
})();
