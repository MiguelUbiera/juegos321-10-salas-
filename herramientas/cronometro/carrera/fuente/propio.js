/* ═══════════════════════════════════════════════════════════════════════
   Secuencia321 · Carrera de equipos · guion
   Fuente de index.html: se corrige aquí y se vuelve a construir.
   Lo que comparte con los demás cronómetros está copiado de la casa; lo
   propio son los carriles y el editor de equipos.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
'use strict';

/* ── Utilidades ─────────────────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const TITULO = 'Carrera de equipos';
const TITULO_PAGINA = 'Carrera de equipos · Secuencia321';
const CLAVE = 's321-cronometro-carrera';
const VERSION = 2;
const escribiendo = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable ||
  (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(el.type)));
const NOMBRE_MAX = 28;
const MIN_EQUIPOS = 2;
const MAX_EQUIPOS = 6;
const ALERTA_MAX = 60 * 60000;
const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = n => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ── Notación: solo minutos y segundos, sin decimales ──────────────────
   Ningún cronómetro de la casa fija esto por defecto; aquí se elige a
   propósito, porque el encargo pide quitar del todo la coma decimal. */
const dos = n => String(n).padStart(2, '0');
function partes(msCrudo) {
  const s = Math.floor(Math.max(0, msCrudo) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0 ? `${h}:${dos(m)}:${dos(ss)}` : `${dos(m)}:${dos(ss)}`;
}
const enReloj = ms => partes(ms);
/* ancho de la cifra en em, para que el tamaño automático no baile:
   en Source Code Pro cada signo mide 0.6 em y los dos puntos 0.46 */
function emDe(txt) {
  const seps = (txt.match(/:/g) || []).length;
  return (txt.length - seps) * 0.6 + seps * 0.46;
}

/* ── Estado ─────────────────────────────────────────────────────────── */
const NOMBRES_FABRICA = ['Los Primos', 'Las Fracciones', 'Equipo Pi', 'Los Enteros'];
const nuevoEquipo = n => ({ id: sigId++, n, t: null, av: 0 });
const equiposDeFabrica = () => NOMBRES_FABRICA.map(nuevoEquipo);
let sigId = 1;

const E = {
  nombre: '',
  equipos: [],
  alerta: 60000,                // avisa cada minuto; 0 apaga las alertas
  acum: 0, t0: null, fin: false,
  alertaSonido: false, sonido: false, despierta: true, final: false,
  info: false
};
const corre = () => E.t0 !== null;
const tiempo = (ahora = performance.now()) => E.acum + (corre() ? ahora - E.t0 : 0);
const empezada = () => corre() || tiempo() > 0;
const todos = () => E.equipos.length > 0 && E.equipos.every(e => e.t !== null);
/* el orden de llegada: quien no ha llegado no entra en la lista */
const puestos = () => E.equipos.map((e, i) => ({ e, i })).filter(x => x.e.t !== null)
  .sort((a, b) => a.e.t - b.e.t || a.i - b.i);

/* ── Memoria: si la página se recarga, sigue donde iba ─────────────── */
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      v: VERSION, nombre: E.nombre, alerta: E.alerta,
      equipos: E.equipos.map(e => ({ n: e.n, t: e.t, av: e.av })),
      fin: E.fin, alertaSonido: E.alertaSonido, sonido: E.sonido,
      despierta: E.despierta, final: E.final, info: E.info,
      acum: tiempo(), corriendo: corre(), reloj: Date.now()
    }));
  } catch (e) { /* sin memoria en este navegador: la herramienta sigue funcionando */ }
}
function cargar() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { o = null; }
  if (!o || o.v !== VERSION) { E.equipos = equiposDeFabrica(); return; }
  E.nombre = typeof o.nombre === 'string' ? o.nombre.replace(/[\r\n]+/g, ' ').slice(0, 70) : '';
  E.alerta = Number.isFinite(o.alerta) ? Math.min(ALERTA_MAX, Math.max(0, Math.round(o.alerta / 1000) * 1000)) : 60000;
  E.equipos = (Array.isArray(o.equipos) ? o.equipos : []).slice(0, MAX_EQUIPOS)
    .map((e, i) => ({ id: sigId++, n: (typeof e?.n === 'string' && e.n.trim().slice(0, NOMBRE_MAX)) || `Equipo ${i + 1}`,
      t: Number.isFinite(e?.t) && e.t >= 0 ? Math.floor(e.t) : null,
      av: Number.isFinite(e?.av) && e.av >= 0 ? Math.floor(e.av) : 0 }));
  if (E.equipos.length < MIN_EQUIPOS) E.equipos = equiposDeFabrica();
  E.alertaSonido = o.alertaSonido === true;
  E.sonido = o.sonido === true;
  E.despierta = o.despierta !== false;
  E.final = o.final === true;
  E.info = o.info === true;
  E.fin = o.fin === true && todos();
  let acum = Number.isFinite(o.acum) ? Math.max(0, o.acum) : 0;
  if (o.corriendo === true && !E.fin && Number.isFinite(o.reloj)) {
    acum += Math.max(0, Date.now() - o.reloj);
    E.acum = acum; E.t0 = performance.now();
  } else E.acum = acum;
}

/* ── Referencias ────────────────────────────────────────────────────── */
const $pieza = $('#pieza'), $cuerpo = $('#cuerpo'), $reloj = $('#reloj'), $cifra = $('#cifra'),
  $estadoTxt = $('#estado-txt'), $sombra = $('#sombra'), $sombraIco = $('#sombra-ico'),
  $carriles = $('#carriles'),
  $btnMarcha = $('#btn-marcha'), $marchaIco = $('#marcha-ico'), $btnReiniciar = $('#btn-reiniciar'),
  $din = $('#dinamica'), $dinCampo = $('#dinamica-campo'),
  $btnAjustes = $('#btn-ajustes'), $ajustes = $('#ajustes'), $ajCerrar = $('#ajustes-cerrar'),
  $eqEditor = $('#eq-editor'), $eqMas = $('#eq-mas'),
  $ajAlertaMin = $('#aj-alerta-min'), $ajAlertaSeg = $('#aj-alerta-seg'),
  $ajAlertaSonido = $('#aj-alerta-sonido'), $ajSonido = $('#aj-sonido'),
  $ajDespierta = $('#aj-despierta'), $ajFinal = $('#aj-final'),
  $btnPantalla = $('#btn-pantalla'), $pantallaIco = $('#pantalla-ico'),
  $btnInfo = $('#btn-info'), $info = $('#info'), $infoInt = $('.info-int'),
  $aviso = $('#aviso'), $avisoTxt = $('#aviso-txt'), $avisoDeshacer = $('#aviso-deshacer');

/* ── Dibujar la pista ───────────────────────────────────────────────── */
let cifraHecha = '', emHecho = 0, escalaClave = '', raf = 0;

function pintarCifra(t) {
  const txt = partes(t);
  const html = txt.replace(/:/g, '<span class="sep">:</span>');
  if (html !== cifraHecha) { $cifra.innerHTML = html; cifraHecha = html; }
  const em = Math.round(emDe(txt) * 1000) / 1000;
  if (em !== emHecho) { emHecho = em; $reloj.style.setProperty('--em', String(em)); }
}

/* Solo dimensiona las barras de la pista —ya no dibuja una escala visible
   ni una marca de meta—; el tope crece con quien va más lejos. */
const PASOS = [5000, 10000, 15000, 30000, 60000, 120000, 300000, 600000, 900000, 1800000, 3600000];
function escala(maximoVisto) {
  const base = Math.max(maximoVisto, 20000) * 1.08;
  const paso = PASOS.find(p => base / p <= 6) || PASOS[PASOS.length - 1];
  return Math.ceil(base / paso) * paso;
}

/* Las alertas por intervalo: cada equipo que sigue corriendo recibe el
   mismo pulso —en su propio carril— cada vez que su tiempo cumple otro
   múltiplo del intervalo configurado. Quien ya llegó no la escucha más:
   por eso se cuenta por equipo (e.av), no con un solo aviso global. */
function revisarAlertas(t) {
  if (E.alerta <= 0 || !corre()) return;
  E.equipos.forEach((e, i) => {
    if (e.t !== null) return;
    const veces = Math.floor(t / E.alerta);
    if (veces > e.av) {
      e.av = veces;
      const li = $(`.carril[data-i="${i}"]`, $carriles);
      if (li) { li.classList.remove('alerta'); void li.offsetWidth; li.classList.add('alerta'); }
      if (E.alertaSonido) ding();
    }
  });
}

function pintarEstado(t) {
  const c = corre();
  let e = 'listo', txt = 'Listo';
  if (E.fin) { e = 'fin'; txt = 'Finalizada'; }
  else if (c) { e = 'marcha'; txt = 'En curso'; }
  else if (t > 0) { e = 'pausa'; txt = 'En pausa'; }
  if ($pieza.dataset.e !== e) { $pieza.dataset.e = e; $estadoTxt.textContent = txt; }
}

function pintarTitulo(t) {
  const s = `${enReloj(t)} · ${TITULO}`;
  document.title = corre() || t > 0 ? s : TITULO_PAGINA;
}

function pintar(ahora = performance.now()) {
  const t = tiempo(ahora);
  revisarAlertas(t);
  pintarCifra(t);
  pintarEstado(t);
  pintarTitulo(t);
  const maximo = Math.max(t, ...E.equipos.map(e => e.t || 0));
  const tope = escala(maximo);
  $$('.carril', $carriles).forEach(li => {
    /* El orden en pantalla cambia al terminar la ronda: el equipo se
       identifica por su número, no por su posición en la lista. */
    const e = E.equipos[+li.dataset.i];
    if (!e) return;
    const x = e.t !== null ? e.t : t;
    const barra = li._barra || (li._barra = $('.eq-barra', li));
    const et = li._t || (li._t = $('.eq-t', li));
    const fraccion = Math.min(1, x / tope);
    barra.style.width = (fraccion * 100).toFixed(3) + '%';
    /* El tiempo solo se marca cuando el equipo ya llegó —mientras sigue
       corriendo, la barra avanza sola, sin un número que la acompañe. */
    const cifraCarril = e.t !== null ? enReloj(e.t) : '';
    if (et.textContent !== cifraCarril) { et.textContent = cifraCarril; li._tw = cifraCarril ? et.offsetWidth : 0; }
    /* La barra mide exactamente lo que va del tiempo, sin mínimo. El
       número va dentro solo si la barra ya es lo bastante larga para
       llevarlo; si no, se escribe justo al final de la barra. */
    const px = fraccion * (li._pw || 0);
    const sobra = (li._pw || 0) - px;
    const dentro = e.t !== null && (px >= (li._tw || 0) + 24 || sobra < (li._tw || 0) + 10);
    if (li._dentro !== dentro) { li._dentro = dentro; li.classList.toggle('dentro', dentro); }
  });
}
/* El ancho de cada pista, medido aparte para no leer el diseño en cada cuadro. */
function medirPistas() {
  $$('.carril', $carriles).forEach(li => {
    li._pw = $('.eq-pista', li).clientWidth;
    const et = li._t || (li._t = $('.eq-t', li));
    li._tw = et.textContent ? et.offsetWidth : 0;
  });
}
function bucle(ahora) { raf = 0; pintar(ahora); if (corre()) raf = requestAnimationFrame(bucle); }
function pedir() { if (!raf && corre()) raf = requestAnimationFrame(bucle); }

function actualizar() {
  const c = corre(), t = tiempo(), termino = todos();
  $btnMarcha.disabled = termino;
  $marchaIco.setAttribute('href', c ? '#i-pausa' : '#i-marcha');
  const etiqueta = termino ? 'Carrera terminada' : c ? 'Pausa' : t > 0 ? 'Seguir' : 'Dar la salida';
  $btnMarcha.setAttribute('aria-label', etiqueta);
  $btnMarcha.title = etiqueta;
  $eqMas.disabled = empezada() || E.equipos.length >= MAX_EQUIPOS;
  $$('.eq-quitar', $eqEditor).forEach(b => { b.disabled = empezada() || E.equipos.length <= MIN_EQUIPOS; });
  $ajAlertaMin.disabled = $ajAlertaSeg.disabled = empezada();
  $$('.eq-accion .btn-llego', $carriles).forEach(b => { b.disabled = !empezada(); });
  pintar();
  pedir();
  despertar(c && E.despierta);
  avivarMandos();
  guardar();
}

/* ── Los equipos: estructura y acciones ────────────────────────────── */
/* El nombre del carril es un textarea de una sola fila que crece solo
   —igual que «Actividad»—, para que un nombre largo pueda acomodarse en
   dos líneas en vez de recortarse con puntos suspensivos. */
function ajustarAlturaNombre(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function ajustarAlturaNombres() { $$('.eq-nombre', $carriles).forEach(ajustarAlturaNombre); }

function armarCarriles() {
  $carriles.innerHTML = E.equipos.map((e, i) =>
    `<li class="carril" data-i="${i}" style="--c:var(--eq${(i % 6) + 1})">` +
      `<span class="eq-letra" title="Tecla ${i + 1}">${i + 1}</span>` +
      `<textarea class="eq-nombre" data-i="${i}" rows="1" maxlength="${NOMBRE_MAX}" autocomplete="off" spellcheck="false" aria-label="Nombre del equipo ${i + 1}"></textarea>` +
      `<div class="eq-pista"><div class="eq-barra"><span class="eq-t"></span></div></div>` +
      `<div class="eq-accion"></div>` +
    `</li>`).join('');
  $$('.eq-nombre', $carriles).forEach((inp, i) => { inp.value = E.equipos[i].n; });
  ajustarAlturaNombres();
  medirPistas();
  escalaClave = '';
}
function armarEditor() {
  $eqEditor.innerHTML = E.equipos.map((e, i) =>
    `<div class="eq-ed" data-i="${i}">` +
      `<span class="eq-ed-color" style="--c:var(--eq${(i % 6) + 1})" aria-hidden="true"></span>` +
      `<input type="text" class="eq-ed-nombre" data-i="${i}" maxlength="${NOMBRE_MAX}" autocomplete="off" spellcheck="false" aria-label="Nombre del equipo ${i + 1}">` +
      `<button type="button" class="eq-quitar" data-quitar="${i}" aria-label="Quitar el equipo ${i + 1}" title="Quitar">${ico('cerrar')}</button>` +
    `</div>`).join('');
  $$('.eq-ed-nombre', $eqEditor).forEach((inp, i) => { inp.value = E.equipos[i].n; });
  ajustarScrollEquipos();
}
/* Con pocos equipos, el alto del contenido casi siempre coincide con el
   límite de la caja al milímetro, y ahí el redondeo de un par de píxeles
   del navegador puede hacer aparecer una barra de scroll —ancha y muy a
   la vista en Windows— para un sobrante que no se ve a simple vista. Se
   mide el sobrante real y solo se habilita el scroll si hace falta de
   verdad, no por un redondeo. */
function ajustarScrollEquipos() {
  const habilita = $eqEditor.scrollHeight - $eqEditor.clientHeight > 6;
  $eqEditor.style.overflowY = habilita ? 'auto' : 'hidden';
}
/* Al terminar la ronda, la lista se reordena sola por puesto: el primero
   sube al primer renglón, sea cual sea su número. Si se deshace una
   llegada, vuelve el orden por número. Cada carril se desliza a su sitio. */
let animarOrden = false;
function ordenarCarriles() {
  const lis = $$('.carril', $carriles);
  const actual = lis.map(li => +li.dataset.i);
  const orden = E.fin ? puestos().map(x => x.i) : actual.slice().sort((a, b) => a - b);
  if (orden.length !== actual.length || orden.every((v, k) => v === actual[k])) return;
  const antes = new Map(lis.map(li => [li, li.getBoundingClientRect().top]));
  orden.forEach(i => $carriles.appendChild($(`.carril[data-i="${i}"]`, $carriles)));
  if (!animarOrden || reducido()) return;
  lis.forEach(li => {
    const d = antes.get(li) - li.getBoundingClientRect().top;
    if (d) li.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}
function pintarAcciones() {
  const orden = puestos();
  $$('.carril', $carriles).forEach(li => {
    const i = +li.dataset.i;
    const e = E.equipos[i];
    if (!e) return;
    li.classList.toggle('llego', e.t !== null);
    const acc = $('.eq-accion', li);
    if (e.t === null) {
      acc.innerHTML = `<button type="button" class="btn-llego" data-llego="${i}" aria-label="Marcar como terminado: ${esc(e.n)}" title="Terminó">${ico('listo')}</button>`;
      $('.btn-llego', acc).disabled = !empezada();
    } else {
      const pos = orden.findIndex(x => x.i === i) + 1;
      acc.innerHTML = `<button type="button" class="eq-puesto${pos === 1 ? ' primero' : ''}" data-deshacer="${i}" title="Tocar para deshacer la llegada" aria-label="${esc(e.n)}: puesto ${pos}. Tocar para deshacer la llegada.">${pos}.º</button>`;
    }
  });
  ordenarCarriles();
}

function terminar(i) {
  const e = E.equipos[i];
  if (!e || e.t !== null || !empezada()) return;
  e.t = Math.floor(tiempo());
  if (todos()) { E.acum = Math.max(...E.equipos.map(x => x.t)); E.t0 = null; E.fin = true; if (E.final) campana(); }
  else if (E.sonido) ding();
  const li = $(`.carril[data-i="${i}"]`, $carriles);
  if (li) { li.classList.remove('recien'); void li.offsetWidth; li.classList.add('recien'); }
  pintarAcciones();
  actualizar();
}
function deshacer(i) {
  const e = E.equipos[i];
  if (!e || e.t === null) return;
  e.t = null;
  E.fin = false;
  pintarAcciones();
  actualizar();
}
function alternar() {
  if (todos()) return;
  const ahora = performance.now();
  if (corre()) { E.acum += ahora - E.t0; E.t0 = null; sombra('pausa'); }
  else { E.t0 = ahora; sombra('marcha'); }
  actualizar();
}
function cambiarCantidad(d) {
  if (empezada()) return;
  const n = E.equipos.length + d;
  if (n < MIN_EQUIPOS || n > MAX_EQUIPOS) return;
  if (d > 0) E.equipos.push(nuevoEquipo(`Equipo ${E.equipos.length + 1}`));
  else E.equipos.pop();
  armarCarriles(); armarEditor(); pintarAcciones(); actualizar();
}
function quitarEquipo(i) {
  if (empezada() || E.equipos.length <= MIN_EQUIPOS || i < 0 || i >= E.equipos.length) return;
  const antes = E.equipos.slice();
  const [fuera] = E.equipos.splice(i, 1);
  armarCarriles(); armarEditor(); pintarAcciones(); actualizar();
  avisar(`Se quitó «${fuera.n}»`, () => { E.equipos = antes; armarCarriles(); armarEditor(); pintarAcciones(); actualizar(); });
}
function renombrar(i, valor) {
  const e = E.equipos[i];
  if (!e) return;
  e.n = valor.replace(/\s+/g, ' ').trim().slice(0, NOMBRE_MAX) || `Equipo ${i + 1}`;
  $$(`.eq-nombre[data-i="${i}"]`, $carriles).forEach(inp => { if (document.activeElement !== inp) { inp.value = e.n; ajustarAlturaNombre(inp); } });
  $$(`.eq-ed-nombre[data-i="${i}"]`, $eqEditor).forEach(inp => { if (document.activeElement !== inp) inp.value = e.n; });
  guardar();
}
$carriles.addEventListener('click', e => {
  const b = e.target.closest('[data-llego]'); if (b) { terminar(Number(b.dataset.llego)); return; }
  const d = e.target.closest('[data-deshacer]'); if (d) deshacer(Number(d.dataset.deshacer));
});
$carriles.addEventListener('input', e => {
  const inp = e.target.closest('.eq-nombre');
  if (!inp) return;
  /* el nombre puede ocupar dos líneas por el propio ajuste de palabras,
     pero un Enter no debe meter un salto de línea a mano */
  if (/[\r\n]/.test(inp.value)) inp.value = inp.value.replace(/\s*[\r\n]+\s*/g, ' ');
  ajustarAlturaNombre(inp);
  renombrar(Number(inp.dataset.i), inp.value);
});
$carriles.addEventListener('keydown', e => {
  const inp = e.target.closest && e.target.closest('.eq-nombre');
  if (inp && e.key === 'Enter') { e.preventDefault(); inp.blur(); }
});
$carriles.addEventListener('blur', e => {
  const inp = e.target.closest && e.target.closest('.eq-nombre');
  if (inp) { const v = inp.value.replace(/\s+/g, ' ').trim(); if (v !== inp.value) { inp.value = v; ajustarAlturaNombre(inp); } }
}, true);
if (window.ResizeObserver) new ResizeObserver(ajustarAlturaNombres).observe($carriles);
$eqEditor.addEventListener('click', e => {
  const q = e.target.closest('[data-quitar]'); if (q) quitarEquipo(Number(q.dataset.quitar));
});
$eqEditor.addEventListener('input', e => {
  const inp = e.target.closest('.eq-ed-nombre'); if (inp) renombrar(Number(inp.dataset.i), inp.value);
});
$eqMas.addEventListener('click', () => cambiarCantidad(1));

/* ── Reiniciar: empieza otra carrera, con deshacer ───────────────────── */
function reiniciarDeVerdad() {
  E.equipos.forEach(e => { e.t = null; e.av = 0; });
  E.acum = 0; E.t0 = null; E.fin = false;
  escalaClave = '';
  pintarAcciones();
  actualizar();
}
function reiniciar() {
  if (!empezada() && !todos()) return;
  const antes = { equipos: E.equipos.map(e => ({ n: e.n, t: e.t, av: e.av })), acum: tiempo(), fin: E.fin };
  reiniciarDeVerdad();
  avisar('Se reinició la carrera', () => {
    E.equipos = antes.equipos.map(x => nuevoEquipo(x.n));
    E.equipos.forEach((e, i) => { e.t = antes.equipos[i].t; e.av = antes.equipos[i].av; });
    E.acum = antes.acum; E.t0 = null; E.fin = antes.fin;
    escalaClave = '';
    armarCarriles(); armarEditor(); pintarAcciones(); actualizar();
  });
}
/* pide un segundo toque en tres segundos: nadie borra una carrera por un
   roce en la pizarra */
let reinicioT = 0;
function volverReinicio() {
  clearTimeout(reinicioT);
  $btnReiniciar.classList.remove('confirmar');
  $btnReiniciar.setAttribute('aria-label', 'Reiniciar');
  $btnReiniciar.title = 'Reiniciar';
}
function pedirReinicio() {
  if ($btnReiniciar.classList.contains('confirmar')) { volverReinicio(); reiniciar(); return; }
  $btnReiniciar.classList.add('confirmar');
  $btnReiniciar.setAttribute('aria-label', 'Toca otra vez para reiniciar');
  $btnReiniciar.title = 'Toca otra vez para reiniciar';
  clearTimeout(reinicioT);
  reinicioT = setTimeout(volverReinicio, 3000);
}

/* ── Ajustes: el intervalo de las alertas ─────────────────────────── */
function sincronizarAlerta() {
  const x = Math.round(E.alerta / 1000);
  $ajAlertaMin.value = String(Math.floor(x / 60));
  $ajAlertaSeg.value = dos(x % 60);
}
function aplicarAlerta() {
  const m = parseInt($ajAlertaMin.value.replace(/\D/g, ''), 10) || 0;
  const s = parseInt($ajAlertaSeg.value.replace(/\D/g, ''), 10) || 0;
  E.alerta = Math.min(ALERTA_MAX, (m * 60 + s) * 1000);
  guardar();
}
[$ajAlertaMin, $ajAlertaSeg].forEach(c => {
  c.addEventListener('input', () => { if (/\D/.test(c.value)) c.value = c.value.replace(/\D/g, ''); });
  c.addEventListener('blur', aplicarAlerta);
  c.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); c.blur(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); sincronizarAlerta(); c.blur(); }
  });
});

/* ── Señales: la sombra y la campana ─────────────────────────────────── */
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
let audio = null;
function prepararAudio() {
  try {
    if (!audio) { const C = window.AudioContext || window.webkitAudioContext; if (C) audio = new C(); }
    if (audio && audio.state === 'suspended') audio.resume();
  } catch (e) { audio = null; }
}
/* un tono breve: llegó un equipo */
function ding() {
  if (!audio) return;
  try {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, audio.currentTime);
    g.gain.setValueAtTime(.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.22, audio.currentTime + .008);
    g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .32);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + .34);
  } catch (e) { /* sin sonido */ }
}
/* dos golpes con los parciales de una campana: terminó la carrera entera */
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

/* ── Entrar y salir sin tirones ────────────────────────────────────── */
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

/* ── Pantalla completa ─────────────────────────────────────────────── */
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
  ajustarScrollEquipos();
  if (porTeclado) $ajAlertaMin.focus();
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
  sincronizarAlerta();
  $ajAlertaSonido.checked = E.alertaSonido;
  $ajSonido.checked = E.sonido;
  $ajDespierta.checked = E.despierta;
  $ajFinal.checked = E.final;
}
$ajAlertaSonido.addEventListener('change', () => { E.alertaSonido = $ajAlertaSonido.checked; guardar(); });
$ajSonido.addEventListener('change', () => { E.sonido = $ajSonido.checked; guardar(); });
$ajDespierta.addEventListener('change', () => { E.despierta = $ajDespierta.checked; despertar(corre() && E.despierta); guardar(); });
$ajFinal.addEventListener('change', () => { E.final = $ajFinal.checked; if (E.final) campana(); guardar(); });

/* ── Pestaña oculta, recarga y salida ─────────────────────────────── */
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

/* ── El nombre de la actividad ─────────────────────────────────────── */
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
  guardar();
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

/* ── Mandos ─────────────────────────────────────────────────────────── */
$btnMarcha.addEventListener('click', alternar);
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
  if (/^[1-6]$/.test(e.key)) { e.preventDefault(); terminar(parseInt(e.key, 10) - 1); return; }
  switch (e.key) {
    case ' ': case 'Spacebar':
      if (enMando) return;
      e.preventDefault(); alternar(); break;
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
aplicarInfo();
armarCarriles();
armarEditor();
sincronizarAjustes();
pintarAcciones();
actualizar();
medirPistas();
pintar();
if (typeof ResizeObserver === 'function') new ResizeObserver(() => { medirPistas(); pintar(); }).observe($carriles);
animarOrden = true;
retirarCarga();

/* para las pruebas: se lee, no se toca */
window.s321Cronometro = Object.freeze({
  tiempo: () => tiempo(),
  estado: () => ({
    corre: corre(), fin: E.fin, alerta: E.alerta,
    equipos: E.equipos.map(e => ({ n: e.n, t: e.t, av: e.av }))
  })
});
})();
