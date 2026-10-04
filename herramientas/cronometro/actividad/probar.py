#!/usr/bin/env python3
"""Prueba el Cronómetro de actividad en los visores del aula.

    python probar.py                      # todas las pruebas y la vista de la tarjeta
    python probar.py --capturas=CARPETA   # además, deja las capturas para mirarlas
    python probar.py --fuentes=ARCHIVO    # sin red: sirve las tipografías desde un CSS local
    python probar.py --sin-vista          # no rehace vista.webp

Usa Playwright con Chromium (pip install playwright && playwright install chromium).
Cada prueba negativa va con su positiva: «no aparece la lista» se cumple
sola en una página en blanco, así que al lado va «aparece el reloj con su cifra».
Lo que no se pudo comprobar no cuenta como bien.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import io
import json
import re
import sys
import tempfile
import time
from pathlib import Path

sys.dont_write_bytecode = True   # no deja __pycache__ en la carpeta
AQUI = Path(__file__).resolve().parent
INDEX = AQUI / "index.html"
URL = INDEX.as_uri()          # se sustituye por la del servidor local al arrancar
CLAVE = "s321-cronometro-actividad"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

# ── Resultado ─────────────────────────────────────────────────────────────
FALLOS: list[str] = []
BIENES = 0


def bien(txt: str) -> None:
    global BIENES
    BIENES += 1
    print(f"  [bien] {txt}")


def mal(txt: str) -> None:
    FALLOS.append(txt)
    print(f"  [MAL ] {txt}")


def comprobar(cond: bool, txt: str, detalle: str = "") -> bool:
    if cond:
        bien(txt)
    else:
        mal(txt + (f" — {detalle}" if detalle else ""))
    return cond


def seccion(nombre: str) -> None:
    print(f"\n{nombre}")


# ── Datos de muestra ──────────────────────────────────────────────────────
NOMBRES = ["Marcos", "Andrés", "María", "", "Jeremy", "Elías", "Carolina", "", "Yaritza", "Kelvin", "Rosa", ""]
MOMENTOS = [49200, 73000, 125800, 160100, 190400, 231700, 262900, 301250, 322000, 347800, 380100, 402600]


def estado(**kw) -> dict:
    base = {"v": 3, "nombre": "Reto 3 · Trabajo en parejas", "conMeta": True, "meta": 300000, "p": 1,
            "avisar": True, "sonido": False, "marcas": [], "encabezado": "", "rondas": [], "ocultas": False,
            "plegada": False, "info": False, "acum": 222600, "corriendo": False, "reloj": "ahora"}
    base.update(kw)
    return base


def ronda(base_nombre: str, n: int, marcas, p: int = 1) -> dict:
    """Una ronda guardada, como la escribe la herramienta al reiniciar."""
    return {"base": base_nombre, "n": n, "p": p, "fecha": 0,
            "marcas": [{"ms": ms, "nombre": nb} for ms, nb in marcas]}


def marcas(n: int) -> list[dict]:
    return [{"ms": MOMENTOS[i], "nombre": NOMBRES[i]} for i in range(n)]


# ── Navegador ─────────────────────────────────────────────────────────────
class Banco:
    def __init__(self, pw, fuentes_css: str | None):
        self.pw = pw
        self.css = fuentes_css
        self.navegador = None

    async def abrir(self):
        self.navegador = await self.pw.chromium.launch()

    async def cerrar(self):
        await self.navegador.close()

    async def pagina(self, w: int, h: int, *, datos: dict | None = None, reducido: bool = False,
                     tactil: bool = False, reloj_falso: bool = False, esperar: bool = True, escala: int = 1):
        ctx = await self.navegador.new_context(viewport={"width": w, "height": h}, device_scale_factor=escala,
                                               reduced_motion="reduce" if reducido else "no-preference",
                                               has_touch=tactil, is_mobile=False)
        if self.css is not None:
            css = self.css

            async def servir(route):
                await route.fulfill(status=200, content_type="text/css", body=css)
            await ctx.route("https://fonts.googleapis.com/**", servir)
            await ctx.route("https://fonts.gstatic.com/**", lambda r: r.abort())
        pg = await ctx.new_page()
        pg.errores = []
        pg.on("pageerror", lambda e: pg.errores.append(f"error: {e}"))
        pg.on("console", lambda m: pg.errores.append(f"consola {m.type}: {m.text}") if m.type in ("error", "warning") else None)
        if reloj_falso:
            # el reloj simulado arranca quieto: solo avanza cuando la prueba lo manda
            inicio = time.time()
            await pg.clock.install(time=inicio)
            await pg.clock.pause_at(inicio + 0.01)
            if datos is not None and datos.get("reloj") == "ahora":
                datos = dict(datos, reloj=int(round((inicio + 0.01) * 1000)))
        if datos is not None:
            # se siembra una sola vez por pestaña: al recargar manda lo que la página guardó
            await ctx.add_init_script(
                "try{if(!sessionStorage.getItem('s321-sembrado')){const d=" + json.dumps(datos) + ";"
                "if(d.reloj==='ahora')d.reloj=Date.now();"
                "localStorage.setItem('" + CLAVE + "',JSON.stringify(d));sessionStorage.setItem('s321-sembrado','1')}}catch(e){}")
        await pg.goto(URL)
        if esperar:
            await self.esperar_carga(pg, reloj_falso)
        return pg

    @staticmethod
    async def esperar_carga(pg, reloj_falso=False):
        for _ in range(80):
            if await pg.evaluate("() => document.getElementById('carga').hidden"):
                return True
            if reloj_falso:
                await pg.clock.run_for(100)
            await pg.wait_for_timeout(60)
        return False


JS_MEDIR = r"""
() => {
  const r = s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return {x:b.x, y:b.y, w:b.width, h:b.height, r:b.right, b:b.bottom,
            ve: cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && b.width > 0 && b.height > 0}; };
  const d = document.scrollingElement;
  const botones = [...document.querySelectorAll('.mandos button')].filter(b => b.offsetParent)
    .map(b => { const x = b.getBoundingClientRect(); return {id: b.id, x:x.x, y:x.y, r:x.right, b:x.bottom, w:x.width, h:x.height}; });
  const filas = [...document.querySelectorAll('#lista-marcas li')].map(li => { const x = li.getBoundingClientRect(); return {y:x.y, b:x.bottom}; });
  return {sh: d.scrollHeight, ih: innerHeight, sw: d.scrollWidth, iw: innerWidth,
    pc: document.documentElement.classList.contains('pc'),
    pieza: r('#pieza'), cab: r('.p-cab'), din: r('#dinamica'), estado: r('#estado'), cifra: r('#cifra'),
    caja: r('.cifra-caja'), reloj: r('#reloj'), meta: r('#meta'), mandos: r('.mandos'), lista: r('#lista'),
    listaMarcas: r('#lista-marcas'), teclas: r('#teclas'), barra: r('.barra'), migas: r('.migas'), pie: r('.pie'),
    info: r('#info'), infoInt: r('.info-int'), tool: r('.p-tool'),
    conInfo: document.getElementById('cuerpo').classList.contains('con-info'),
    pieTxt: document.querySelector('.pie').textContent.trim(),
    botones, filas, texto: document.getElementById('cifra').textContent,
    conLista: document.getElementById('cuerpo').classList.contains('con-lista')};
}
"""


def dentro(a, b, tol=1.0) -> bool:
    return a["x"] >= b["x"] - tol and a["y"] >= b["y"] - tol and a["r"] <= b["r"] + tol and a["b"] <= b["b"] + tol


def se_tocan(a, b) -> bool:
    return not (a["r"] <= b["x"] or b["r"] <= a["x"] or a["b"] <= b["y"] or b["b"] <= a["y"])


# ── Pruebas sin navegador ─────────────────────────────────────────────────
def pruebas_de_archivo(habilidad: Path | None) -> None:
    seccion("Archivos")
    html = INDEX.read_text(encoding="utf-8")

    # index.html es producto: debe salir idéntico de fuente/
    sys.path.insert(0, str(AQUI))
    try:
        import importlib
        construir = importlib.import_module("construir")
        molde = construir.molde
        antes = html
        antes_carta = (AQUI / "tarjeta.html").read_text(encoding="utf-8")
        tmp = Path(tempfile.mkdtemp()) / "index.html"
        salida_original = molde.SALIDA
        molde.SALIDA = tmp
        buf = io.StringIO()
        _stdout = sys.stdout
        sys.stdout = buf
        try:
            molde.main(mantenimiento=False)   # comparar, no arreglar
        finally:
            sys.stdout = _stdout
            molde.SALIDA = salida_original
        comprobar(tmp.read_text(encoding="utf-8") == antes, "index.html coincide con lo que construyen la casa y fuente/ (nadie lo retocó a mano)")
        comprobar((AQUI / "tarjeta.html").read_text(encoding="utf-8") == antes_carta, "tarjeta.html también sale igual de la ficha")
    except Exception as e:  # noqa: BLE001
        mal(f"no se pudo reconstruir index.html para compararlo: {e}")

    fav = AQUI / "favicon.svg"
    if habilidad and habilidad.exists():
        comprobar(fav.read_bytes() == habilidad.read_bytes(), "favicon.svg idéntico, byte a byte, al de la habilidad",
                  "difiere del de la habilidad; «python construir.py» lo copia otra vez")
    else:
        mal("no se encontró el favicon de la habilidad para compararlo (usa --habilidad=RUTA)")
    comprobar('href="favicon.svg"' in html and "data:image/svg" not in html.split("<style>")[0],
              "el isotipo se enlaza como archivo, no en data:")
    icono = (AQUI / "icono.svg").read_text(encoding="utf-8")
    comprobar("<metadata" not in icono and len(icono) < 4000,
              f"icono.svg es solo el dibujo, sin firmas añadidas ({len(icono)} caracteres)")

    comprobar('data-s321="barra"' in html and 'data-s321="carga"' in html, "la barra y la carga llevan su marca data-s321")
    comprobar('id="volver"' not in html and not re.search(r'<a[^>]+id="miga-cronometros"', html),
              "ya no hay una salida duplicada a «Cronómetros»: de las migas solo Inicio enlaza")
    comprobar("@view-transition" in html and "navigation: auto" in html, "declara el paso suave entre páginas")
    comprobar("setInterval" not in html, "el tiempo no se cuenta con setInterval")
    comprobar("performance.now()" in html and "requestAnimationFrame" in html, "el tiempo sale del reloj del sistema y se dibuja por cuadros")
    comprobar(not re.search(r'target\s*=\s*["\']?_blank', html) and "window.open" not in html and "<iframe" not in html.lower(),
              "ningún enlace abre otra pestaña ni una ventana; no hay iframe")
    comprobar("®" not in html, "no aparece el símbolo ®")
    comprobar("™" not in html and "&#8482;" not in html, "no aparece el símbolo ™: la marca se escribe «Secuencia321» a secas")
    comprobar("© Secuencia321" in html, "el crédito es «© Secuencia321»")
    comprobar("<form" not in html.lower(), "no hay <form>: Enter nunca recarga la página")
    botones = re.findall(r"<button\b[^>]*>", html)
    comprobar(all('type="button"' in b for b in botones), f"los {len(botones)} botones escritos llevan type=\"button\"")
    marcado = re.sub(r"<script>.*?</script>", "", html, flags=re.S)
    ids = re.findall(r'\sid="([^"]+)"', marcado)
    dup = sorted({i for i in ids if ids.count(i) > 1})
    comprobar(not dup, "ningún id repetido", ", ".join(dup))

    seccion("La tarjeta del panel")
    try:
        ficha = json.loads((AQUI / "ficha.json").read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        mal(f"ficha.json no se puede leer: {e}")
        return
    fijos = {
        "id": "actividad", "orden": 1, "nombre": "Cronómetro de actividad",
        "antetitulo": "un reloj para toda la clase",
        "instruccion": "Escribe el nombre de la dinámica y establece la meta.",
        "abrir": "index.html", "icono": "icono.svg", "vista": "vista.webp",
    }
    distintos = [k for k, v in fijos.items() if ficha.get(k) != v]
    comprobar(not distintos, "ficha.json trae los campos fijos del encargo", "difieren: " + ", ".join(distintos))
    comprobar(bool(re.fullmatch(r"\d+\.\d+", str(ficha.get("version", "")))), "la ficha lleva versión con punto")
    comprobar(bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(ficha.get("fecha", "")))), "la ficha lleva fecha AAAA-MM-DD")
    comprobar(ficha.get("como_funciona", "").count("**") == 2, "una sola negrita marcada con **…** en «cómo funciona»")
    ideas = ficha.get("ideas") or []
    comprobar(len(ideas) == 3 and all(i.count("**") == 2 for i in ideas),
              "tres ideas para la clase, con una negrita cada una")
    # el para qué no puede valer para cualquier cronómetro: tiene que nombrar lo propio
    propio = ("marca", "nombre", "ronda", "repit", "compar", "quién", "mejor")
    texto_utilidad = (str(ficha.get("para_que", "")) + " " + str(ficha.get("lema", ""))).lower()
    comprobar(any(p in texto_utilidad for p in propio),
              "el «para qué» nombra lo propio de este cronómetro y no serviría para cualquiera")
    comprobar(all(any(p in i.lower() for p in propio) for i in ideas),
              "cada idea se apoya en marcas, rondas o comparación")
    for archivo in ("index.html", "tarjeta.html", "icono.svg", "favicon.svg"):
        comprobar((AQUI / archivo).exists(), f"existe {archivo}")
    CASA = AQUI.parent / "_comun"
    for archivo in ("casa.css", "iconos.svg", "tarjeta.html", "tarjeta.css", "molde.py"):
        comprobar((CASA / archivo).exists(), f"la casa trae {archivo}")
    for archivo in ("propio.css", "propio.js", "cuerpo.html"):
        comprobar((AQUI / "fuente" / archivo).exists(), f"el cronómetro trae lo suyo: {archivo}")

    # la tarjeta compacta también es producto: sale de fuente/ y de la ficha
    carta = (AQUI / "tarjeta.html").read_text(encoding="utf-8")
    comprobar(str(ficha.get("nombre")) in carta and str(ficha.get("lema")) in carta,
              "la tarjeta compacta dice el nombre y el lema de la ficha")
    claves = [c for c in (ficha.get("incluye") or [])[:3]]
    comprobar(all(f"<li>{c}</li>" in carta for c in claves),
              "la tarjeta compacta lleva las tres primeras claves de «incluye»")
    comprobar(str(ficha.get("para_que", ""))[:40] not in carta and str(ficha.get("como_funciona", ""))[:40] not in carta,
              "la tarjeta compacta no repite las explicaciones: esas viven dentro de la herramienta")
    comprobar("<script" not in carta.lower(), "la tarjeta compacta no lleva guion: es una pieza quieta")
    comprobar("®" not in carta, "la tarjeta compacta no usa el símbolo ®")
    texto = json.dumps(ficha, ensure_ascii=False).lower() + " " + re.sub(r"<[^>]+>", " ", html).lower()
    edad = re.search(r"\b\d+\s*(a|-)\s*\d+\s*años|\baños de edad|\bedad(es)?\b|\bgrado(s)? (escolar|\d)|\b\d\s*[º°]\s*(grado|de primaria|de secundaria)|\b(primero|segundo|tercero|cuarto|quinto|sexto) de (primaria|secundaria)", texto)
    comprobar(edad is None, "no aparece ninguna edad ni ningún grado", edad.group(0) if edad else "")


# ── Contraste ─────────────────────────────────────────────────────────────
JS_CONTRASTE = r"""
() => {
  const hex = h => { h = h.replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), 1]; };
  const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2], p.length>3 ? p[3] : 1]; };
  const lin = c => { c /= 255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const L = c => 0.2126*lin(c[0]) + 0.7152*lin(c[1]) + 0.0722*lin(c[2]);
  const mezcla = (a, b) => [a[0]*a[3]+b[0]*(1-a[3]), a[1]*a[3]+b[1]*(1-a[3]), a[2]*a[3]+b[2]*(1-a[3]), 1];
  const razon = (a, b) => { const x = L(a), y = L(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  /* sobre el suelo petróleo se mide contra su tono más claro: el peor caso */
  const SUELO = hex('#24576b');
  function fondo(el) {
    const capas = [];
    for (let e = el; e; e = e.parentElement) {
      if (e.classList && (e.classList.contains('barra'))) { capas.push(hex('#173f50')); break; }
      if (e.classList && (e.classList.contains('escenario') || e.classList.contains('carga'))) {
        if (e.classList.contains('escenario') && document.documentElement.classList.contains('pc')) capas.push(hex('#fffcf7'));
        else capas.push(SUELO);
        break;
      }
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c && c[3] > 0) { capas.push(c); if (c[3] >= 0.999) break; }
    }
    if (!capas.length) return hex('#fffcf7');
    let f = capas[capas.length-1];
    for (let i = capas.length-2; i >= 0; i--) f = mezcla(capas[i], f);
    return f;
  }
  const opacidad = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const LECTURA = '.info-titulo,.info-bloque p,.info-ideas li,.p-tool,.aj-nota,.meta-pie,.m-nombre,.m-t,.m-dif,.teclas,.aj-fila label,.prec-nombre,.prec-muestra,.aviso-txt,.rotulo,.p-titulo,.lista-titulo-b,.estado,.aj-titulo,.aj-rotulo,.m-dato,.menu button';
  const res = [];
  const vistos = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement; if (!el || vistos.has(el)) continue; vistos.add(el);
    if (el.closest('svg,script,style,[aria-hidden="true"]') && !el.closest('.cifra')) continue;
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    if (cs.visibility === 'hidden' || b.width === 0 || b.height === 0 || el.closest('[hidden]')) continue;
    let o = opacidad(el); if (o < 0.05) continue;
    const c = rgba(cs.color); const f = fondo(el);
    const color = mezcla([c[0],c[1],c[2], c[3]*o], f);
    const px = parseFloat(cs.fontSize), peso = parseInt(cs.fontWeight, 10);
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const lectura = !!el.closest(LECTURA) && !el.closest('button:not(.lista-titulo-b):not(.m-cuerpo):not([role="menuitem"]),kbd');
    res.push({t: n.nodeValue.trim().slice(0, 40), c: +razon(color, f).toFixed(2), grande, lectura, px, clase: el.className && el.className.baseVal === undefined ? el.className : ''});
  }
  /* los marcadores de posición */
  for (const el of document.querySelectorAll('textarea[placeholder],input[placeholder]')) {
    const b = el.getBoundingClientRect(); if (!b.width || el.value) continue;
    const c = rgba(getComputedStyle(el, '::placeholder').color); const f = fondo(el);
    res.push({t: 'marcador: ' + el.placeholder.slice(0, 30), c: +razon(c, f).toFixed(2), grande: false, lectura: false, marcador: true, px: parseFloat(getComputedStyle(el).fontSize)});
  }
  return res;
}
"""


async def pruebas_contraste(banco: Banco) -> None:
    seccion("Contraste, calculado sobre la página")
    peores = []
    for nombre, kw, accion in (
        ("en pausa con marcas", {"datos": estado(marcas=marcas(4))}, None),
        ("vacío", {"datos": estado(nombre="", acum=0)}, None),
        ("con los ajustes abiertos", {"datos": estado(marcas=marcas(2))}, "#btn-ajustes"),
        ("pasada la meta", {"datos": estado(marcas=marcas(3), acum=331000)}, None),
        ("pantalla completa", {"datos": estado(marcas=marcas(3))}, "tecla:p"),
    ):
        pg = await banco.pagina(1366, 768, **kw)
        if accion == "tecla:p":
            await pg.keyboard.press("p")
            await pg.wait_for_timeout(700)
        elif accion:
            await pg.click(accion)
            await pg.wait_for_timeout(300)
        datos = await pg.evaluate(JS_CONTRASTE)
        for d in datos:
            minimo = 3.0 if d["grande"] else 4.5
            if d.get("lectura") and not d["grande"]:
                minimo = 7.0
            if d["c"] < minimo:
                peores.append(f"{nombre}: «{d['t']}» {d['c']}:1 (pide {minimo}:1)")
        lect = [d["c"] for d in datos if d.get("lectura") and not d["grande"]]
        print(f"    {nombre}: {len(datos)} textos; lectura mínima {min(lect) if lect else '—'}:1; "
              f"mínimo general {min(d['c'] for d in datos)}:1")
        await pg.context.close()
    comprobar(not peores, "texto de lectura ≥ 7:1; ningún texto bajo 4.5:1 salvo el grande, que no baja de 3:1", "; ".join(peores[:6]))


# ── Encaje en los visores ─────────────────────────────────────────────────
APAISADOS = [(1366, 638), (1024, 638), (1280, 670), (1366, 620), (1920, 950), (1180, 820)]
PANTALLA_COMPLETA = [(1024, 768), (1280, 800), (1366, 768), (1920, 1080)]
DOCUMENTO = [(820, 1180), (390, 844), (844, 390)]


def revisar_panel(m: dict, etiqueta: str, n_marcas: int, con_info: bool = False) -> None:
    comprobar(m["sh"] <= m["ih"] + 1, f"{etiqueta}: sin desplazamiento vertical", f"{m['sh']} > {m['ih']}")
    comprobar(m["sw"] <= m["iw"] + 1, f"{etiqueta}: sin desplazamiento horizontal", f"{m['sw']} > {m['iw']}")
    vista = {"x": 0, "y": 0, "r": m["iw"], "b": m["ih"]}
    piezas = ["cab", "din", "estado", "caja", "meta", "mandos"]
    fuera = [p for p in piezas if not (m[p] and m[p]["ve"] and dentro(m[p], m["pieza"]) and dentro(m[p], vista))]
    comprobar(not fuera, f"{etiqueta}: nombre, cifra, meta y mandos a la vista, dentro de la pieza", "fuera: " + ", ".join(fuera))
    comprobar(dentro(m["pieza"], vista), f"{etiqueta}: la pieza cabe en la ventana, con la barra y las migas encima",
              f"pieza hasta {m['pieza']['b']:.0f} en {m['ih']}")
    comprobar(dentro(m["caja"], m["reloj"], 2), f"{etiqueta}: la cifra no se sale de su columna")
    solapes = [f"{a['id']}/{b['id']}" for i, a in enumerate(m["botones"]) for b in m["botones"][i + 1:] if se_tocan(a, b)]
    fuera_col = [b["id"] for b in m["botones"] if not dentro(b, m["reloj"], 2)]
    comprobar(not solapes and all(dentro(b, m["pieza"]) for b in m["botones"]), f"{etiqueta}: los mandos no se pisan y caben", ", ".join(solapes))
    comprobar(not fuera_col, f"{etiqueta}: los mandos se quedan en la columna del reloj, sin montarse sobre la lista ni la información",
              ", ".join(fuera_col))
    comprobar(bool(re.fullmatch(r"\d{2}:\d{2}\.\d", m["texto"])), f"{etiqueta}: aparece el reloj con su cifra ({m['texto']})")
    if n_marcas:
        comprobar(m["conLista"] and m["lista"]["ve"] and m["lista"]["r"] <= m["reloj"]["x"] + 1,
                  f"{etiqueta}: con {n_marcas} marcas, la lista va a la izquierda del reloj")
        comprobar(dentro(m["listaMarcas"], m["pieza"]), f"{etiqueta}: la lista se desplaza por dentro, sin empujar nada fuera")
    else:
        comprobar(not m["conLista"] and not m["lista"]["ve"], f"{etiqueta}: sin marcas no hay lista")
        if not con_info:
            centro = (m["caja"]["x"] + m["caja"]["r"]) / 2
            centro_p = (m["pieza"]["x"] + m["pieza"]["r"]) / 2
            comprobar(abs(centro - centro_p) < 6, f"{etiqueta}: sin marcas ni información, el reloj va centrado", f"{centro:.0f} frente a {centro_p:.0f}")
    if con_info:
        comprobar(m["conInfo"] and m["info"]["ve"] and dentro(m["info"], m["pieza"]) and m["info"]["x"] >= m["reloj"]["r"] - 1,
                  f"{etiqueta}: la información va a la derecha del reloj, dentro de la pieza")
        comprobar(dentro(m["infoInt"], m["pieza"], 2), f"{etiqueta}: la información se desplaza por dentro")
    else:
        comprobar(not m["conInfo"] and not m["info"]["ve"], f"{etiqueta}: con la información oculta, no ocupa sitio")


async def pruebas_encaje(banco: Banco, capturas: Path | None) -> None:
    seccion("Cabecera sin línea y sin nota de estado")
    pg = await banco.pagina(1366, 638, datos=estado())
    d = await pg.evaluate("""() => {
      const cab = getComputedStyle(document.querySelector('.p-cab'));
      const din = document.getElementById('dinamica');
      const b = document.getElementById('estado').getBoundingClientRect();
      return {borde: cab.borderBottomWidth, marcador: din.placeholder,
              estadoAncho: b.width,
              estadoTexto: document.getElementById('estado-txt').textContent};
    }""")
    comprobar(d["borde"] == "0px", "la cabecera ya no lleva línea debajo: el campo se activa solo con tocarlo", d["borde"])
    comprobar(d["marcador"] == "Actividad", "el campo del nombre insinúa «Actividad» de fábrica", d["marcador"])
    comprobar(d["estadoAncho"] <= 2, "la nota de «Listo / en marcha» ya no se ve", str(d))
    comprobar(bool(d["estadoTexto"]), "pero el texto sigue ahí para quien usa lector de pantalla", d["estadoTexto"])
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Encaje: estado abierto en los visores de aula (modo panel)")
    for (w, h) in APAISADOS:
        casos = [(0, False), (12, False), (0, True)]
        if (w, h) in ((1024, 638), (1366, 620)):
            casos.append((12, True))
        for n, con_info in casos:
            pg = await banco.pagina(w, h, datos=estado(marcas=marcas(n), info=con_info))
            m = await pg.evaluate(JS_MEDIR)
            etq = f"{w}×{h} con {n} marcas" + (" y la información abierta" if con_info else "")
            revisar_panel(m, etq, n, con_info)
            if capturas and (w, h) in ((1366, 638), (1024, 638), (1366, 620), (1920, 950)):
                nombre = f"abierto-{w}x{h}-{n}marcas" + ("-info" if con_info else "")
                await pg.screenshot(path=str(capturas / f"{nombre}.png"))
            comprobar(not pg.errores, f"{etq}: consola limpia", "; ".join(pg.errores[:3]))
            await pg.context.close()

    seccion("Pantalla completa con 5 marcas")
    for (w, h) in PANTALLA_COMPLETA:
        pg = await banco.pagina(w, h, datos=estado(marcas=marcas(5)))
        await pg.keyboard.press("p")
        await pg.wait_for_timeout(800)
        m = await pg.evaluate(JS_MEDIR)
        etq = f"{w}×{h} pantalla completa"
        comprobar(m["pc"], f"{etq}: entra con la tecla P")
        comprobar(not (m["barra"]["ve"] or m["migas"]["ve"] or m["pie"]["ve"]), f"{etq}: sin barra, sin migas y sin pie")
        comprobar(not (m["teclas"] and m["teclas"]["ve"]),
                  f"{etq}: los atajos no se ven: viven dentro del panel de ajustes, que está cerrado")
        comprobar(abs(m["pieza"]["w"] - w) < 1 and abs(m["pieza"]["h"] - h) < 1, f"{etq}: la pieza ocupa toda la pantalla")
        revisar_panel(m, etq, 5)
        todas = len(m["filas"]) == 5 and all(f["b"] <= m["listaMarcas"]["b"] + 1 and f["y"] >= m["listaMarcas"]["y"] - 1 for f in m["filas"])
        comprobar(todas, f"{etq}: se ven las 5 marcas, no una sola línea")
        if capturas and (w, h) in ((1024, 768), (1920, 1080)):
            await pg.screenshot(path=str(capturas / f"pantalla-completa-{w}x{h}.png"))
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(300)
        m2 = await pg.evaluate(JS_MEDIR)
        comprobar(not m2["pc"] and m2["barra"]["ve"], f"{etq}: Esc devuelve la página con su barra")
        await pg.context.close()

    seccion("Pantalla completa: solo lo esencial, aunque Información y Ajustes estuvieran abiertos")
    pg = await banco.pagina(1366, 768, datos=estado(info=True))
    await pg.click("#btn-ajustes")
    await pg.wait_for_timeout(200)
    await pg.keyboard.press("p")
    await pg.wait_for_timeout(700)
    d = await pg.evaluate("""() => ({
      info: getComputedStyle(document.getElementById('info')).display,
      ajustes: getComputedStyle(document.getElementById('ajustes')).display,
      infoBtn: !!document.getElementById('btn-info').offsetParent,
      ajustesBtn: !!document.getElementById('btn-ajustes').offsetParent,
      reiniciarBtn: !!document.getElementById('btn-reiniciar').offsetParent,
      pantallaBtn: !!document.getElementById('btn-pantalla').offsetParent,
      marcha: !!document.getElementById('btn-marcha').offsetParent,
      marca: !!document.getElementById('btn-marca').offsetParent})""")
    comprobar(d["info"] == "none" and d["ajustes"] == "none" and not d["infoBtn"] and not d["ajustesBtn"] and not d["reiniciarBtn"],
              "Información, Ajustes y Reiniciar desaparecen del todo, así estuvieran abiertos", str(d))
    comprobar(d["pantallaBtn"] and d["marcha"] and d["marca"],
              "quedan pantalla completa, pausa/reanudar y marca", str(d))
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(400)
    v = await pg.evaluate("() => getComputedStyle(document.getElementById('btn-info')).display")
    comprobar(v != "none", "y al salir de pantalla completa, Información vuelve a estar a mano", v)
    await pg.context.close()

    seccion("Pantalla completa: los mandos se atenúan solos y despiertan al tocar")
    pg = await banco.pagina(1366, 638, datos=estado(), reloj_falso=True)
    await pg.keyboard.press("p")
    await pg.wait_for_timeout(400)
    await pg.keyboard.press("Space")   # arranca el reloj
    await pg.wait_for_timeout(150)
    op0 = await pg.evaluate("() => getComputedStyle(document.querySelector('.mandos')).opacity")
    comprobar(op0 == "1", "recién entrado, con el reloj corriendo, los mandos se ven enteros", op0)
    await pg.clock.run_for(8200)
    await pg.wait_for_timeout(900)   # lo que tarda la transición suave
    op1 = await pg.evaluate("() => getComputedStyle(document.querySelector('.mandos')).opacity")
    lat = await pg.evaluate("() => document.documentElement.classList.contains('latente')")
    comprobar(lat and abs(float(op1) - 0.4) < 0.05,
              "pasados unos segundos sin tocar nada, se atenúan un 60%, con una transición suave", f"{op1}, latente={lat}")
    fn_antes = await pg.evaluate("() => document.getElementById('btn-marca').disabled")
    await pg.evaluate("() => document.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))")
    await pg.wait_for_timeout(900)
    op2 = await pg.evaluate("() => getComputedStyle(document.querySelector('.mandos')).opacity")
    comprobar(op2 == "1", "y tocar cualquier punto de la pantalla los devuelve de golpe", op2)
    comprobar(fn_antes is False, "atenuados o no, la función sigue intacta: el botón no se deshabilita por eso")
    await pg.keyboard.press("Space")   # pausa el reloj
    await pg.wait_for_timeout(150)
    await pg.clock.run_for(8200)
    await pg.wait_for_timeout(900)
    op3 = await pg.evaluate("() => getComputedStyle(document.querySelector('.mandos')).opacity")
    comprobar(op3 == "1", "en pausa no se atenúan, aunque pase el tiempo", op3)
    await pg.keyboard.press("Space")   # reanuda, para que salir de pantalla completa los sorprenda ya atenuados
    await pg.wait_for_timeout(150)
    await pg.clock.run_for(8200)
    await pg.wait_for_timeout(900)
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(900)
    fuera = await pg.evaluate("() => getComputedStyle(document.querySelector('.mandos')).opacity")
    comprobar(fuera == "1", "y al salir de pantalla completa también se ven enteros", fuera)
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Modo documento: en vertical y en el teléfono girado (la orientación decide, no el ancho)")
    for (w, h) in DOCUMENTO:
        pg = await banco.pagina(w, h, datos=estado(marcas=marcas(6), info=True), tactil=True)
        m = await pg.evaluate(JS_MEDIR)
        etq = f"{w}×{h}"
        comprobar(m["info"]["ve"] and m["info"]["y"] >= m["lista"]["b"] - 1,
                  f"{etq}: la información va al final, debajo de la lista")
        comprobar(m["sw"] <= m["iw"] + 1, f"{etq}: sin desplazamiento horizontal")
        comprobar(m["lista"]["ve"] and m["lista"]["y"] >= m["mandos"]["b"] - 1, f"{etq}: la lista va debajo de los mandos")
        centro = (m["caja"]["x"] + m["caja"]["r"]) / 2
        centro_p = (m["pieza"]["x"] + m["pieza"]["r"]) / 2
        comprobar(abs(centro - centro_p) < 6, f"{etq}: el reloj sigue centrado")
        comprobar(bool(re.fullmatch(r"\d{2}:\d{2}\.\d", m["texto"])), f"{etq}: aparece el reloj con su cifra")
        alto_lista = m["listaMarcas"]["h"] if m["listaMarcas"] else 0
        comprobar(alto_lista <= 0.4 * h + 2, f"{etq}: la lista mide como mucho el 40 % de la pantalla", f"{alto_lista:.0f} px")
        chicos = [b["id"] for b in m["botones"] if b["h"] < 44 and b["id"] != "btn-clip"]
        comprobar(not chicos, f"{etq}: los mandos miden 44 px o más", ", ".join(chicos))
        teclado = await pg.evaluate("() => getComputedStyle(document.getElementById('aj-teclado')).display")
        comprobar(teclado == "none", f"{etq}: en pantalla de dedo no hay teclado que explicar, y el grupo entero se va")
        # plegable: se pliega y se despliega
        await pg.click("#lista-plegar")
        plegada = await pg.evaluate("() => getComputedStyle(document.getElementById('lista-marcas')).display === 'none'")
        await pg.click("#lista-plegar")
        abierta = await pg.evaluate("() => getComputedStyle(document.getElementById('lista-marcas')).display !== 'none'")
        comprobar(plegada and abierta, f"{etq}: la lista se pliega y se despliega")
        if capturas:
            # sin «página entera»: al estirar la ventana, el navegador deja de simular el tacto
            await pg.evaluate("() => window.scrollTo(0, 0)")
            await pg.screenshot(path=str(capturas / f"documento-{w}x{h}-arriba.png"))
            await pg.evaluate("() => window.scrollTo(0, document.scrollingElement.scrollHeight)")
            await pg.screenshot(path=str(capturas / f"documento-{w}x{h}-abajo.png"))
        await pg.context.close()

    seccion("La clave de pantalla del clip mide 44 px aunque se vea de 36")
    pg = await banco.pagina(1366, 638, datos=estado(marcas=marcas(2)))
    area = await pg.evaluate("""() => { const b = document.getElementById('btn-clip'); const r = b.getBoundingClientRect();
        const antes = getComputedStyle(b, '::before'); return {w: r.width, h: r.height, ins: antes.inset || antes.top}; }""")
    hit = await pg.evaluate("""() => { const b = document.getElementById('btn-clip'); const r = b.getBoundingClientRect();
        const e = document.elementFromPoint(r.left - 3, r.top + r.height / 2); return !!(e && e.closest('#btn-clip')); }""")
    comprobar(abs(area["w"] - 36) < 1 and hit, "el clip se ve de 36 px y responde también 4 px por fuera")
    await pg.context.close()


# ── La información de la herramienta ─────────────────────────────────────
async def pruebas_info(banco: Banco) -> None:
    seccion("La información: sale al abrir y se puede ocultar")
    ficha = json.loads((AQUI / "ficha.json").read_text(encoding="utf-8"))
    pg = await banco.pagina(1366, 638)            # sin estado guardado: como la abre alguien por primera vez
    m = await pg.evaluate(JS_MEDIR)
    comprobar(m["conInfo"] and m["info"]["ve"], "al abrir, la información está desplegada")
    centro = (m["caja"]["x"] + m["caja"]["r"]) / 2
    centro_p = (m["pieza"]["x"] + m["pieza"]["r"]) / 2
    comprobar(m["info"]["x"] >= m["reloj"]["r"] - 1 and centro_p - centro > 0.08 * m["pieza"]["w"],
              "el reloj se corre a la izquierda y la información ocupa la derecha",
              f"centro del reloj {centro:.0f}, centro de la pieza {centro_p:.0f}")
    textos = await pg.evaluate("""() => ({titulo: document.getElementById('info-titulo').textContent,
        rotulos: [...document.querySelectorAll('#info .rotulo')].map(e => e.textContent),
        cuerpo: [...document.querySelectorAll('#info .info-bloque p:not(.rotulo)')].map(e => e.textContent),
        ideas: [...document.querySelectorAll('#info .info-ideas li')].map(e => e.textContent),
        negritas: document.querySelectorAll('#info b').length,
        recuadro: getComputedStyle(document.querySelector('.info-int')).backgroundColor})""")
    ante = ficha["antetitulo"]
    limpio = lambda t: t.replace("**", "")
    comprobar(textos["titulo"] == ante[:1].upper() + ante[1:], "el encabezado es el antetítulo de la ficha, y no repite el título", textos["titulo"])
    comprobar(textos["rotulos"] == ["Para qué", "Cómo funciona", "Ideas para la clase"], "los tres rótulos", str(textos["rotulos"]))
    comprobar(textos["cuerpo"] == [limpio(ficha["para_que"]), limpio(ficha["como_funciona"])],
              "«Para qué» y «Cómo funciona» salen de la ficha: un solo texto para la tarjeta y para la herramienta")
    comprobar(textos["ideas"] == [limpio(i) for i in ficha["ideas"]], "las ideas para la clase salen de la ficha")
    comprobar(textos["negritas"] == 1 + sum(i.count("**") // 2 for i in ficha["ideas"]), "las negritas son las que marcan los textos")
    comprobar(textos["recuadro"] in ("rgba(0, 0, 0, 0)", "transparent"),
              "la información sale sobre el mismo lienzo, sin recuadro aparte", textos["recuadro"])
    cifra_con = float((await pg.evaluate("() => getComputedStyle(document.querySelector('.cifra-caja')).fontSize"))[:-2])
    await pg.click("#btn-info")
    await pg.wait_for_timeout(450)
    m2 = await pg.evaluate(JS_MEDIR)
    cifra_sin = float((await pg.evaluate("() => getComputedStyle(document.querySelector('.cifra-caja')).fontSize"))[:-2])
    centro = (m2["caja"]["x"] + m2["caja"]["r"]) / 2
    centro_p = (m2["pieza"]["x"] + m2["pieza"]["r"]) / 2
    comprobar(not m2["conInfo"] and not m2["info"]["ve"] and abs(centro - centro_p) < 6,
              "el botón la oculta y el reloj vuelve al centro")
    comprobar(cifra_sin > cifra_con, f"la cifra aprovecha el sitio que queda ({cifra_con:.0f} → {cifra_sin:.0f} px)")
    etiqueta = await pg.evaluate("() => [document.getElementById('btn-info').getAttribute('aria-pressed'), document.getElementById('btn-info').getAttribute('aria-label')]")
    comprobar(etiqueta == ["false", "Ver la información"], "el botón dice lo que hará", str(etiqueta))
    await pg.reload()
    await Banco.esperar_carga(pg)
    comprobar(not (await pg.evaluate(JS_MEDIR))["conInfo"], "al recargar sigue oculta")
    await pg.click("#btn-info")
    await pg.wait_for_timeout(450)
    comprobar((await pg.evaluate(JS_MEDIR))["conInfo"], "y vuelve a salir cuando se pide")
    await pg.keyboard.press("Space")
    await pg.wait_for_timeout(200)
    await pg.keyboard.press("m")
    await pg.wait_for_timeout(450)
    m3 = await pg.evaluate(JS_MEDIR)
    comprobar(not m3["conInfo"] and m3["conLista"], "con la primera marca la información se aparta y entra la lista")
    comprobar(m3["pieTxt"] == "© Secuencia321", "el pie dice «© Secuencia321», sin repetir Herramientas", m3["pieTxt"])
    cab = await pg.evaluate("""() => ({tool: document.getElementById('pieza-titulo').textContent,
        toolVisible: document.getElementById('pieza-titulo').getBoundingClientRect().width > 2,
        marcador: document.getElementById('dinamica').placeholder,
        instruccion: !!document.querySelector('.p-instr'),
        dentro: document.querySelector('.p-cab').contains(document.getElementById('dinamica'))})""")
    comprobar(cab["tool"] == "Cronómetro de actividad" and not cab["toolVisible"] and cab["dentro"] and not cab["instruccion"]
              and cab["marcador"] == "Actividad",
              "el nombre de la herramienta ya no se ve —queda solo para quien usa lector de pantalla— y debajo va el de la dinámica, con «Actividad» de guía y sin instrucción", str(cab))
    comprobar(not pg.errores, "consola limpia", "; ".join(pg.errores[:3]))
    await pg.context.close()


# ── La carga de la casa ───────────────────────────────────────────────────
async def pruebas_carga(banco: Banco) -> None:
    seccion("La carga de la casa")
    pg = await banco.pagina(1366, 638, datos=estado(), esperar=False)
    await pg.wait_for_timeout(120)
    visible = await pg.evaluate("() => { const c = document.getElementById('carga'); return !c.hidden && getComputedStyle(c).opacity === '1'; }")
    marca = await pg.evaluate("() => !!document.querySelector('.carga .iso .u4') && document.querySelector('.carga-dice').textContent")
    bajo_barra = await pg.evaluate("() => document.getElementById('carga').getBoundingClientRect().top >= document.querySelector('.barra').getBoundingClientRect().bottom - 1")
    comprobar(visible, "aparece al arrancar")
    comprobar(marca == "Preparando el cronómetro…", "el isotipo de siete piezas y la frase «Preparando el cronómetro…»")
    comprobar(bajo_barra, "la barra queda a la vista: solo cambia el contenido")
    inicio_fuera = None
    fin = None
    for _ in range(60):
        est = await pg.evaluate("() => [performance.now(), document.getElementById('carga').classList.contains('fuera'), document.getElementById('carga').hidden, window.S321_CARGA_T0]")
        if est[1] and inicio_fuera is None:
            inicio_fuera = est[0]
        if est[2]:
            fin = est[0]
            break
        await pg.wait_for_timeout(50)
    t0 = await pg.evaluate("() => window.S321_CARGA_T0 || 0")
    comprobar(inicio_fuera is not None and inicio_fuera >= 800 and inicio_fuera >= t0 + 1160,
              "dura al menos 0.8 s desde la navegación y lo que tarda en componerse el isotipo",
              f"empezó a irse a los {inicio_fuera and round(inicio_fuera)} ms (T0 {round(t0)} ms)")
    comprobar(fin is not None and fin < 4000, "se retira sola", f"{fin and round(fin)} ms")
    comprobar(not pg.errores, "consola limpia al arrancar", "; ".join(pg.errores[:3]))
    await pg.context.close()

    pg = await banco.pagina(1366, 638, datos=estado(), esperar=False, reducido=True)
    await pg.wait_for_timeout(150)
    quieto = await pg.evaluate("""() => { const r = document.querySelector('.carga .iso .u4'); const cs = getComputedStyle(r);
        return cs.animationName === 'none' && cs.opacity === '1' && getComputedStyle(document.querySelector('.carga-raya')).display === 'none'; }""")
    comprobar(quieto, "con «reducir movimiento», el isotipo aparece quieto y sin raya")
    ok = await Banco.esperar_carga(pg)
    comprobar(ok, "con «reducir movimiento», también se retira sola")
    await pg.context.close()


# ── Señales de la meta, con el reloj simulado ─────────────────────────────
async def pruebas_senales(banco: Banco) -> None:
    seccion("Señales con meta 1:00 (reloj simulado)")
    pg = await banco.pagina(1366, 768, datos=estado(meta=60000, acum=0, nombre="Prueba"), reloj_falso=True)
    leer = """() => { const p = document.getElementById('pieza'), c = document.getElementById('cifra'), cs = getComputedStyle(c);
        return {tramo: p.dataset.tramo, e: document.getElementById('estado-txt').textContent, anim: cs.animationName,
                color: cs.color, der: document.getElementById('meta-der').textContent, cifra: c.textContent,
                barra: getComputedStyle(document.getElementById('meta-lleno')).backgroundColor}; }"""
    await pg.keyboard.press("Space")
    await pg.clock.run_for(44800)
    a = await pg.evaluate(leer)
    comprobar(a["tramo"] == "nada" and a["anim"] == "none", f"a {a['cifra']} todavía nada se mueve")
    await pg.clock.run_for(400)
    await pg.wait_for_timeout(450)
    a = await pg.evaluate(leer)
    comprobar(a["tramo"] == "aviso" and a["anim"] == "respira", f"a {a['cifra']} la cifra respira", str(a))
    comprobar(a["barra"] == "rgb(176, 74, 42)", "en el aviso la barra pasa a terracota", a["barra"])
    await pg.clock.run_for(5000)
    await pg.wait_for_timeout(450)
    a = await pg.evaluate(leer)
    comprobar(a["tramo"] == "final" and a["anim"] == "palpita" and a["color"] == "rgb(143, 58, 30)",
              f"a {a['cifra']} se pone terracota honda y palpita", str(a))
    comprobar(a["e"] == "Últimos segundos", "la píldora dice «Últimos segundos»", a["e"])
    await pg.keyboard.press("Space")
    await pg.wait_for_timeout(450)
    a = await pg.evaluate(leer)
    comprobar(a["anim"] == "none" and a["color"] == "rgb(143, 58, 30)" and a["e"] == "En pausa",
              "en pausa ningún pulso: el color se queda quieto", str(a))
    await pg.keyboard.press("Space")
    await pg.clock.run_for(9900)
    await pg.wait_for_timeout(80)
    a = await pg.evaluate(leer)
    comprobar(a["tramo"] == "cumplida" and a["anim"] == "none" and a["color"] == "rgb(143, 58, 30)",
              f"a {a['cifra']} deja de palpitar y queda en terracota", str(a))
    comprobar(a["der"] == "Meta cumplida" and a["e"] == "Meta cumplida", "dice «Meta cumplida»", f"{a['der']} · {a['e']}")
    halo = await pg.evaluate("() => document.getElementById('pieza').classList.contains('halo') || getComputedStyle(document.getElementById('pieza'), '::after').opacity")
    comprobar(halo is True or float(halo) > 0, "un halo de velo terracota rodea la pieza al cumplirse")
    await pg.clock.run_for(2500)
    a = await pg.evaluate(leer)
    comprobar(bool(re.fullmatch(r"\+0:0\d sobre la meta", a["der"])), f"luego «{a['der'].replace(' sobre la meta', '')}» (y «sobre la meta» para quien escucha)")
    comprobar(a["cifra"].startswith("01:02"), "sigue contando pasada la meta", a["cifra"])
    await pg.context.close()

    seccion("Señales con «reducir movimiento»")
    pg = await banco.pagina(1366, 768, datos=estado(meta=60000, acum=0), reloj_falso=True, reducido=True)
    await pg.keyboard.press("Space")
    await pg.clock.run_for(46000)
    a = await pg.evaluate(leer)
    comprobar(a["tramo"] == "aviso" and a["anim"] == "none", "en el aviso no respira")
    await pg.clock.run_for(5000)
    a = await pg.evaluate(leer)
    comprobar(a["tramo"] == "final" and a["anim"] == "none" and a["color"] == "rgb(143, 58, 30)", "en el final no palpita; solo cambia el color")
    sin_anim = await pg.evaluate("() => document.getAnimations().filter(x => x.playState === 'running' && (x.effect.getComputedTiming().duration > 1)).length")
    comprobar(sin_anim == 0, "no hay ninguna animación corriendo", f"{sin_anim} animaciones")
    await pg.context.close()


# ── La sombra de pausa y marcha, y la entrada de la lista ────────────────
async def pruebas_movimiento(banco: Banco) -> None:
    seccion("La sombra al pausar y al reanudar")
    pg = await banco.pagina(1366, 638, datos=estado(acum=0))
    await pg.keyboard.press("Space")
    await pg.wait_for_timeout(250)
    o1 = float(await pg.evaluate("() => getComputedStyle(document.getElementById('sombra')).opacity"))
    ico1 = await pg.evaluate("() => document.getElementById('sombra-ico').getAttribute('href')")
    await pg.wait_for_timeout(700)
    o2 = float(await pg.evaluate("() => getComputedStyle(document.getElementById('sombra')).opacity"))
    comprobar(0.05 < o1 <= 0.121 and ico1 == "#i-marcha", f"al iniciar aparece el triángulo en sombra (opacidad {o1:.3f})")
    comprobar(o2 == 0, "y desaparece antes de 900 ms")
    await pg.keyboard.press("Space")
    await pg.wait_for_timeout(250)
    o3 = float(await pg.evaluate("() => getComputedStyle(document.getElementById('sombra')).opacity"))
    ico3 = await pg.evaluate("() => document.getElementById('sombra-ico').getAttribute('href')")
    await pg.wait_for_timeout(700)
    o4 = float(await pg.evaluate("() => getComputedStyle(document.getElementById('sombra')).opacity"))
    comprobar(0.05 < o3 <= 0.121 and ico3 == "#i-pausa" and o4 == 0, "al pausar, las dos barras en sombra, y se van")
    toca = await pg.evaluate("() => getComputedStyle(document.getElementById('sombra')).pointerEvents === 'none' && document.getElementById('sombra').getAttribute('aria-hidden') === 'true'")
    comprobar(toca, "la sombra no intercepta toques ni la leen los lectores de pantalla")

    seccion("La primera marca trae la lista")
    await pg.keyboard.press("Space")
    await pg.wait_for_timeout(200)
    antes = await pg.evaluate(JS_MEDIR)
    await pg.keyboard.press("m")
    await pg.wait_for_timeout(400)
    despues = await pg.evaluate(JS_MEDIR)
    ancho_final = await pg.evaluate("() => { const c = document.getElementById('cuerpo'); return parseFloat(getComputedStyle(c).gridTemplateColumns.split(' ')[0]); }")
    comprobar(not antes["conLista"] and despues["conLista"] and despues["lista"]["ve"], "la lista aparece a la izquierda")
    comprobar(despues["lista"]["w"] >= 0.95 * ancho_final and despues["lista"]["r"] <= despues["reloj"]["x"] + 1,
              "en 400 ms ya está en su sitio y el reloj se corrió", f"{despues['lista']['w']:.0f} de {ancho_final:.0f} px")
    await pg.context.close()


# ── Que el tiempo no se atrase ────────────────────────────────────────────
def a_ms(txt: str) -> int:
    m = re.fullmatch(r"(?:(\d+):)?(\d{2}):(\d{2})(?:\.(\d+))?", txt)
    if not m:
        return -1
    h, mm, ss, f = m.groups()
    ms = ((int(h or 0) * 60 + int(mm)) * 60 + int(ss)) * 1000
    if f:
        ms += int(f.ljust(3, "0")[:3])
    return ms


async def pruebas_deriva(banco: Banco) -> None:
    seccion("Que el tiempo no se atrase")
    pg = await banco.pagina(1366, 638, datos=estado(acum=0))
    inicio = await pg.evaluate("() => { document.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true})); return Date.now(); }")
    await pg.wait_for_timeout(1500)
    # el hilo de la página se bloquea 1.5 s: si contara saltos, se atrasaría
    await pg.evaluate("() => { const t = performance.now(); while (performance.now() - t < 1500) {} }")
    await pg.wait_for_timeout(400)
    muestra = await pg.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r([document.getElementById('cifra').textContent, Date.now()]))))")
    vista, ahora = muestra
    real = ahora - inicio
    diferencia = real - a_ms(vista)
    comprobar(0 <= diferencia <= 100 + 34, f"tras {real / 1000:.1f} s (1.5 s con la página bloqueada) la cifra dice {vista}: {diferencia} ms de diferencia")
    await pg.context.close()


# ── Teclado, marcas, clip y memoria ───────────────────────────────────────
async def pruebas_teclado(banco: Banco) -> None:
    seccion("Teclado y marcas")
    pg = await banco.pagina(1366, 638, datos=estado(acum=0, nombre=""))
    est = "() => window.s321Cronometro.estado()"
    await pg.keyboard.press("Space")
    comprobar((await pg.evaluate(est))["corre"], "Espacio inicia")
    await pg.wait_for_timeout(300)
    await pg.keyboard.press("m")
    await pg.wait_for_timeout(250)
    await pg.keyboard.press("m")
    comprobar((await pg.evaluate(est))["marcas"] == 2, "M guarda una marca cada vez")
    t_marca = await pg.evaluate("() => document.querySelector('#lista-marcas li:last-child .m-t').textContent")
    nueva_foco = await pg.evaluate("() => document.activeElement === document.body")
    comprobar(nueva_foco, "la marca nueva no toma el foco sola")
    await pg.keyboard.press("n")
    await pg.wait_for_timeout(150)
    foco = await pg.evaluate("() => document.activeElement && document.activeElement.id")
    comprobar(foco.startswith("marca-nombre-"), "N abre el nombre de la última marca", foco)
    await pg.keyboard.type("Andrés m r p")
    comprobar((await pg.evaluate(est))["corre"] and not await pg.evaluate("() => document.documentElement.classList.contains('pc')"),
              "mientras se escribe, las teclas no actúan")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(150)
    nombre, t_despues = await pg.evaluate("() => [document.querySelector('#lista-marcas li:last-child .m-nombre').textContent, document.querySelector('#lista-marcas li:last-child .m-t').textContent]")
    comprobar(nombre == "Andrés m r p" and t_despues == t_marca, "Enter guarda el nombre y el momento de la marca no cambia", f"{nombre} · {t_marca} → {t_despues}")
    # Esc cancela
    await pg.click("#lista-marcas li:first-child .m-lapiz")
    await pg.keyboard.type("Nadie")
    await pg.keyboard.press("Escape")
    primero = await pg.evaluate("() => document.querySelector('#lista-marcas li:first-child .m-nombre').textContent")
    comprobar(primero == "Marca 1", "Esc cancela la edición", primero)
    # encabezado editable
    await pg.click("#lista-lapiz")
    await pg.keyboard.type("Llegadas")
    await pg.keyboard.press("Enter")
    enc = await pg.evaluate("() => document.getElementById('lista-titulo-b').textContent")
    comprobar(enc == "Llegadas", "el encabezado de la lista se puede renombrar", enc)
    # Espacio tras un clic de ratón no repite el botón
    await pg.click("#btn-marcha")
    pausado = not (await pg.evaluate(est))["corre"]
    await pg.keyboard.press("Space")
    otra = (await pg.evaluate(est))["corre"]
    comprobar(pausado and otra, "tras un clic en «Pausar», Espacio vuelve a iniciar: el foco regresó a la página")
    n_antes = (await pg.evaluate(est))["marcas"]
    await pg.keyboard.press("Space")
    # la dinámica: Espacio escribe un espacio, no pausa
    await pg.click("#dinamica")
    await pg.keyboard.type("Reto 3")
    await pg.keyboard.press("Space")
    await pg.keyboard.type("parejas")
    await pg.keyboard.press("Enter")
    din = await pg.evaluate("() => document.getElementById('dinamica').value")
    comprobar(din == "Reto 3 parejas" and not (await pg.evaluate(est))["corre"], "en el nombre de la dinámica, Espacio escribe y Enter termina", din)
    # R pide dos pulsaciones
    await pg.keyboard.press("r")
    conf = await pg.evaluate("() => [document.getElementById('btn-reiniciar').classList.contains('confirmar'), document.querySelector('#reiniciar-txt .ve').textContent]")
    comprobar(conf[0] and conf[1] == "Toca otra vez" and (await pg.evaluate(est))["marcas"] == n_antes, "R una vez pide confirmar en ciruela", str(conf))
    await pg.keyboard.press("r")
    e2 = await pg.evaluate(est)
    comprobar(e2["marcas"] == 0 and await pg.evaluate("() => document.getElementById('cifra').textContent") == "00:00.0",
              "R otra vez reinicia tiempo y marcas")
    await pg.keyboard.press("r")
    await pg.wait_for_timeout(3200)
    vuelta = await pg.evaluate("() => !document.getElementById('btn-reiniciar').classList.contains('confirmar')")
    comprobar(vuelta, "si no llega el segundo toque en 3 s, Reiniciar vuelve a su estado")
    # P y Esc
    await pg.keyboard.press("p")
    await pg.wait_for_timeout(700)
    pc = await pg.evaluate("() => document.documentElement.classList.contains('pc')")
    sinAjustes = await pg.evaluate("() => !document.getElementById('btn-ajustes').offsetParent")
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(700)
    salio = await pg.evaluate("() => !document.documentElement.classList.contains('pc')")
    comprobar(pc and sinAjustes and salio,
              "P pone pantalla completa, sin acceso a Ajustes; como no hay panel que cerrar, Esc sale directo", str((pc, sinAjustes, salio)))
    await pg.context.close()

    seccion("Sin marcadores de posición, salvo el único que insinúa dónde va la actividad")
    pg = await banco.pagina(1366, 768, datos=estado(nombre="", marcas=marcas(2)))
    await pg.wait_for_timeout(200)
    campos = await pg.evaluate("""() => {
      const con = [...document.querySelectorAll('input, textarea')].filter(e => e.getAttribute('placeholder'));
      return {con: con.map(e => e.id + ': ' + e.getAttribute('placeholder')),
              etiqueta: document.getElementById('dinamica').getAttribute('aria-label')};
    }""")
    comprobar(campos["con"] == ["dinamica: Actividad"],
              "el único marcador de la pieza es «Actividad», en el campo del nombre", " | ".join(campos["con"]))
    await pg.click("#lista-marcas .m-lapiz")
    await pg.wait_for_timeout(250)
    edicion = await pg.evaluate("""() => {
      const c = document.querySelector('.m-campo');
      return c ? {ph: c.getAttribute('placeholder'), etiqueta: c.getAttribute('aria-label')} : null;
    }""")
    comprobar(edicion and not edicion["ph"], "tampoco el campo del nombre de una marca al abrirlo", str(edicion))
    comprobar(edicion and edicion["etiqueta"] and campos["etiqueta"] == "Nombre de la dinámica",
              "los campos se siguen anunciando a quien no ve, aunque ya no haya un lápiz aparte", str(campos["etiqueta"]))
    await pg.context.close()

    seccion("El clip de las marcas")
    pg = await banco.pagina(1366, 638, datos=estado(marcas=marcas(5)))
    await pg.click("#btn-clip")
    await pg.click("#menu-ver")
    await pg.wait_for_timeout(450)
    m = await pg.evaluate(JS_MEDIR)
    clip = await pg.evaluate("""() => ({tenido: document.getElementById('btn-clip').classList.contains('oculta'),
      n: document.getElementById('clip-n').hidden ? null : document.getElementById('clip-n').textContent,
      menu: document.getElementById('menu-ver-txt').textContent})""")
    centro = (m["caja"]["x"] + m["caja"]["r"]) / 2
    centro_p = (m["pieza"]["x"] + m["pieza"]["r"]) / 2
    comprobar(not m["conLista"] and abs(centro - centro_p) < 6, "«Ocultar marcas» recentra el reloj")
    comprobar(clip["tenido"] and clip["n"] is None and clip["menu"] == "Mostrar marcas (5)",
              "el clip se tiñe porque hay marcas guardadas, sin número: el número cuenta rondas y aún no hay ninguna", str(clip))
    await pg.click("#btn-clip")
    txt = await pg.evaluate("() => document.getElementById('menu-ver-txt').textContent")
    comprobar(txt == "Mostrar marcas (5)", "la opción cambia a «Mostrar marcas (5)»", txt)
    await pg.click("#menu-ver")
    await pg.wait_for_timeout(420)
    m = await pg.evaluate(JS_MEDIR)
    comprobar(m["conLista"] and m["lista"]["ve"], "«Mostrar marcas» devuelve la lista")
    await pg.click("#btn-clip")
    await pg.click("#menu-borrar")
    aviso = await pg.evaluate("() => !document.getElementById('aviso').hidden && document.getElementById('aviso-txt').textContent")
    comprobar(aviso == "Se borraron 5 marcas", "«Borrar marcas» deja el aviso con «Deshacer»", str(aviso))
    await pg.click("#aviso-deshacer")
    n = await pg.evaluate("() => window.s321Cronometro.estado().marcas")
    comprobar(n == 5, "«Deshacer» las devuelve")
    await pg.click("#btn-clip")
    await pg.click("#menu-borrar")
    await pg.wait_for_timeout(5300)
    se_fue = await pg.evaluate("() => document.getElementById('aviso').hidden && window.s321Cronometro.estado().marcas === 0")
    comprobar(se_fue, "el aviso dura 5 s y se va")
    await pg.context.close()

    pg = await banco.pagina(1366, 638, datos=estado(marcas=marcas(3)))
    await pg.click("#lista-marcas li:nth-child(2) .m-cuerpo")
    await pg.click("#lista-marcas li:nth-child(2) .m-quitar")
    n, av = await pg.evaluate("() => [window.s321Cronometro.estado().marcas, document.getElementById('aviso-txt').textContent]")
    await pg.click("#aviso-deshacer")
    n2 = await pg.evaluate("() => window.s321Cronometro.estado().marcas")
    comprobar(n == 2 and av == "Se borró «Andrés»" and n2 == 3, "la papelera borra una marca y deja «Deshacer»", f"{n} · {av} · {n2}")
    await pg.context.close()

    seccion("Memoria al recargar")
    pg = await banco.pagina(1366, 638, datos=estado(acum=5000, marcas=marcas(2), encabezado="Llegadas", p=2, meta=45000))
    await pg.keyboard.press("Space")
    await pg.wait_for_timeout(1200)
    antes = a_ms(await pg.evaluate("() => document.getElementById('cifra').textContent"))
    await pg.reload()
    await Banco.esperar_carga(pg)
    e = await pg.evaluate("() => ({...window.s321Cronometro.estado(), t: window.s321Cronometro.tiempo(), cifra: document.getElementById('cifra').textContent, enc: document.getElementById('lista-titulo-b').textContent, meta: document.getElementById('meta-valor').textContent, nombre: document.getElementById('dinamica').value, m1: document.querySelector('#lista-marcas li .m-nombre').textContent})")
    comprobar(e["corre"] and e["t"] > antes + 900, "en marcha: al recargar sigue contando lo que pasó mientras tanto", f"{antes} → {round(e['t'])}")
    comprobar(e["p"] == 2 and re.fullmatch(r"\d{2}:\d{2}\.\d{2}", e["cifra"]) and e["enc"] == "Llegadas" and e["meta"] == "Meta 45 s"
              and e["nombre"] == "Reto 3 · Trabajo en parejas" and e["m1"] == "Marcos" and e["marcas"] == 2,
              "se conservan nombre, meta, precisión, marcas con su nombre y encabezado", str(e))
    await pg.keyboard.press("Space")
    parado = await pg.evaluate("() => window.s321Cronometro.tiempo()")
    await pg.wait_for_timeout(700)
    await pg.reload()
    await Banco.esperar_carga(pg)
    t2 = await pg.evaluate("() => [window.s321Cronometro.estado().corre, window.s321Cronometro.tiempo()]")
    comprobar(not t2[0] and abs(t2[1] - parado) < 5, "en pausa: al recargar queda donde estaba")
    comprobar(not pg.errores, "consola limpia", "; ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Ajustes")
    pg = await banco.pagina(1366, 638, datos=estado(acum=0))
    await pg.click("#btn-ajustes")
    await pg.fill("#aj-min", "0")
    await pg.fill("#aj-seg", "0")
    meta_cero = await pg.evaluate("() => window.s321Cronometro.estado().meta")
    comprobar(meta_cero == 300000, "si los dos campos quedan en cero, se conserva la meta anterior")
    await pg.fill("#aj-min", "2")
    await pg.fill("#aj-seg", "30")
    await pg.press("#aj-seg", "Enter")
    meta = await pg.evaluate("() => [window.s321Cronometro.estado().meta, document.getElementById('meta-valor').textContent]")
    comprobar(meta == [150000, "Meta 2:30"], "la meta se escribe en minutos y segundos", str(meta))
    await pg.click(".prec:has(#prec-3)")
    txt = await pg.evaluate("() => document.getElementById('cifra').textContent")
    comprobar(txt == "00:00.000", "la precisión cambia la cifra (milésimas)", txt)
    await pg.click("label[for='aj-meta']")
    sin = await pg.evaluate("() => document.getElementById('pieza').classList.contains('sin-meta') && getComputedStyle(document.getElementById('meta')).display === 'none'")
    comprobar(sin, "sin meta, desaparece la barra")
    await pg.mouse.click(30, 300)
    await pg.wait_for_timeout(320)
    cerrado = await pg.evaluate("() => document.getElementById('ajustes').hidden")
    comprobar(cerrado, "tocar fuera cierra los ajustes")
    await pg.context.close()


# ── Punto decimal ─────────────────────────────────────────────────────────
async def pruebas_notacion(banco: Banco) -> None:
    seccion("Notación: punto decimal y ninguna coma decimal")
    textos = []
    largas = [{"ms": 10000, "nombre": "Uno"}, {"ms": 115600, "nombre": "Dos"}]
    for datos, accion in ((estado(marcas=marcas(12), acum=410000), None), (estado(p=3, marcas=marcas(3)), "#btn-ajustes"),
                          (estado(acum=3_725_400, marcas=largas), None)):
        pg = await banco.pagina(1366, 768, datos=datos)
        if accion:
            await pg.click(accion)
        textos.append(await pg.evaluate("() => document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label],[title]')].map(e => (e.getAttribute('aria-label')||'') + ' ' + (e.getAttribute('title')||'')).join(' ')"))
        await pg.context.close()
    todo = "\n".join(textos)
    coma = re.findall(r"\d,\d", todo)
    comprobar(not coma, "ninguna coma decimal en pantalla", " ".join(coma[:5]))
    comprobar(len(re.findall(r"\d\.\d", todo)) > 20, "las cifras llevan punto decimal (03:42.6, +49.2 s)")
    comprobar("1:02:05.4" in todo, "con horas: 1:02:05.4")
    comprobar("+49.2 s" in todo, "duraciones cortas con «s»: +49.2 s")
    comprobar("+1:45.6" in todo, "duraciones largas con reloj: +1:45.6")
    comprobar(re.search(r"\d %(?! de)", todo) is not None, "porcentaje con espacio y sin palabras de más: «74 %»")


# ── Las rondas y la comparación ───────────────────────────────────────────
TRES = [
    ronda("Equipos", 1, [(49200, "Marcos"), (73000, "Andrés"), (125800, "María"), (160100, "Elías"), (190400, "Jeremy")]),
    ronda("Equipos", 2, [(45600, "Andrés"), (52300, "Marcos"), (101200, "María"), (143700, "Jeremy")]),
]
AHORA = [{"ms": 41000, "nombre": "Marcos"}, {"ms": 58400, "nombre": "Andrés"},
         {"ms": 72900, "nombre": "María"}, {"ms": 95100, "nombre": ""}, {"ms": 118600, "nombre": "Jeremy"}]

JS_CMP = r"""
() => {
  const tabla = document.querySelector('.cmp');
  if (!tabla) return {nada: document.querySelector('.cmp-nada') ? document.querySelector('.cmp-nada').textContent : ''};
  const col = [...tabla.querySelectorAll('thead th')].map(t => t.textContent);
  const fil = [...tabla.querySelectorAll('tbody tr')].map(tr => ({
    quien: tr.querySelector('.cmp-quien').textContent,
    celdas: [...tr.querySelectorAll('.cmp-t')].map(td => td.textContent),
    mejor: [...tr.querySelectorAll('.cmp-t')].findIndex(td => td.classList.contains('cmp-mejor')),
    cambio: tr.querySelector('.cmp-cambio') ? tr.querySelector('.cmp-cambio').textContent : null,
    clase: tr.querySelector('.cmp-cambio') ? tr.querySelector('.cmp-cambio').className : ''
  }));
  const r = document.getElementById('comparar').getBoundingClientRect();
  const p = document.getElementById('pieza').getBoundingClientRect();
  return {col, fil, nota: document.getElementById('cmp-nota').textContent,
          hoja: {x: r.x, y: r.y, r: r.right, b: r.bottom, h: r.height},
          pieza: {x: p.x, y: p.y, r: p.right, b: p.bottom}};
}
"""


async def pruebas_rondas(banco: Banco, capturas: Path | None) -> None:
    seccion("Las rondas: reiniciar guarda, no borra")
    pg = await banco.pagina(1366, 638, datos=estado(encabezado="Equipos", marcas=AHORA, rondas=TRES))
    await pg.wait_for_timeout(250)

    v = await pg.evaluate("""() => ({
      clipN: document.getElementById('clip-n').textContent,
      clipOculto: document.getElementById('clip-n').hidden,
      cajaOculta: document.getElementById('rondas-caja').hidden,
      titulo: document.getElementById('lista-titulo-b').textContent})""")
    comprobar(v["clipN"] == "2" and not v["clipOculto"], "el botón de al lado de Reiniciar cuenta las rondas guardadas, no las marcas", str(v))
    comprobar(not v["cajaOculta"], "la cabecera de la lista trae su menú de rondas")
    comprobar(v["titulo"] == "Equipos", "la lista en curso se llama por su encabezado, sin número", v["titulo"])

    await pg.click("#lista-menu")
    await pg.wait_for_timeout(220)
    menu = await pg.evaluate("""() => [...document.querySelectorAll('#rondas-menu button')].map(b => b.textContent.replace(/\\s+/g,' ').trim())""")
    comprobar(len(menu) == 4, f"el menú ofrece la de ahora, las dos guardadas y comparar ({len(menu)})", " | ".join(menu))
    comprobar(menu[0].startswith("Equipos · la de ahora"), "primero, la ronda en curso", menu[0])
    comprobar("Equipos 2" in menu[1] and "Equipos 1" in menu[2], "después, las guardadas de la más nueva a la más vieja", " | ".join(menu[1:3]))
    comprobar(menu[-1] == "Comparar rondas", "y al final, comparar", menu[-1])

    # mirar una ronda guardada: se ve, no se toca
    ids = await pg.eval_on_selector_all("#rondas-menu [data-ronda]", "els => els.map(e => e.dataset.ronda)")
    await pg.click(f'#rondas-menu [data-ronda="{ids[1]}"]')
    await pg.wait_for_timeout(350)
    g = await pg.evaluate("""() => ({
      titulo: document.getElementById('lista-titulo-b').textContent,
      filas: [...document.querySelectorAll('#lista-marcas li')].map(li => li.querySelector('.m-nombre').textContent),
      tiempos: [...document.querySelectorAll('#lista-marcas .m-t')].map(e => e.textContent),
      lapices: document.querySelectorAll('#lista-marcas .m-lapiz').length,
      editables: document.querySelectorAll('#lista-marcas [data-editar]').length,
      volver: !document.getElementById('lista-volver').hidden,
      lapizCab: document.getElementById('lista-lapiz').hidden})""")
    comprobar(g["titulo"] == "Equipos 2", "al mirar una guardada, la cabecera dice su nombre con número", g["titulo"])
    comprobar(g["filas"] == ["Andrés", "Marcos", "María", "Jeremy"], "se ven sus marcas, en su orden", " · ".join(g["filas"]))
    comprobar(g["tiempos"][0] == "00:45.6", "con sus tiempos", " ".join(g["tiempos"]))
    comprobar(g["lapices"] == 0 and g["editables"] == 0, "una ronda guardada no se edita", f"{g['lapices']} lápices, {g['editables']} editables")
    comprobar(g["volver"] and g["lapizCab"], "aparece la vuelta a la de ahora y se retira el lápiz del encabezado")

    await pg.click("#lista-volver")
    await pg.wait_for_timeout(300)
    vuelta = await pg.evaluate("""() => ({titulo: document.getElementById('lista-titulo-b').textContent,
      n: document.querySelectorAll('#lista-marcas li').length,
      lapices: document.querySelectorAll('#lista-marcas .m-lapiz').length})""")
    comprobar(vuelta["titulo"] == "Equipos" and vuelta["n"] == 5 and vuelta["lapices"] == 5,
              "y se vuelve a la de ahora, editable otra vez", str(vuelta))
    await pg.context.close()

    # reiniciar archiva y numera
    pg = await banco.pagina(1366, 638, datos=estado(encabezado="Equipos", marcas=AHORA, rondas=TRES))
    await pg.wait_for_timeout(200)
    await pg.click("#btn-reiniciar")
    await pg.click("#btn-reiniciar")
    await pg.wait_for_timeout(400)
    r = await pg.evaluate("""() => {
      const o = JSON.parse(localStorage.getItem('""" + CLAVE + r"""'));
      return {rondas: o.rondas.map(x => x.base + ' ' + x.n + ':' + x.marcas.length), marcas: o.marcas.length,
              aviso: document.getElementById('aviso-txt').textContent,
              cifra: document.getElementById('cifra').textContent,
              clipN: document.getElementById('clip-n').textContent};
    }""")
    comprobar(r["rondas"] == ["Equipos 1:5", "Equipos 2:4", "Equipos 3:5"],
              "al reiniciar, la lista se guarda como ronda y toma el número siguiente", " | ".join(r["rondas"]))
    comprobar(r["marcas"] == 0 and r["cifra"].startswith("00:00"), "y la de ahora empieza vacía y en cero", str(r))
    comprobar("Se guardó «Equipos 3»" in r["aviso"] and "5 marcas" in r["aviso"], "el aviso dice qué se guardó", r["aviso"])
    comprobar(r["clipN"] == "3", "el contador sube a 3 rondas", r["clipN"])

    # deshacer devuelve la ronda y su tiempo
    await pg.click("#aviso-deshacer")
    await pg.wait_for_timeout(350)
    d = await pg.evaluate("""() => {
      const o = JSON.parse(localStorage.getItem('""" + CLAVE + r"""'));
      return {rondas: o.rondas.length, marcas: o.marcas.length, cifra: document.getElementById('cifra').textContent};
    }""")
    comprobar(d["rondas"] == 2 and d["marcas"] == 5 and d["cifra"].startswith("03:42"),
              "«Deshacer» deshace el reinicio entero: vuelven las marcas y el tiempo", str(d))

    # borrar marcas no toca las rondas guardadas
    await pg.click("#btn-clip")
    await pg.wait_for_timeout(150)
    await pg.click("#menu-borrar")
    await pg.wait_for_timeout(300)
    b = await pg.evaluate("""() => { const o = JSON.parse(localStorage.getItem('""" + CLAVE + r"""'));
      return {rondas: o.rondas.length, marcas: o.marcas.length}; }""")
    comprobar(b["rondas"] == 2 and b["marcas"] == 0, "borrar las marcas de ahora no toca las rondas guardadas", str(b))

    # y borrar las rondas es un acto aparte, con su deshacer
    await pg.click("#btn-clip")
    await pg.wait_for_timeout(150)
    await pg.click("#menu-vaciar")
    await pg.wait_for_timeout(300)
    v2 = await pg.evaluate("""() => { const o = JSON.parse(localStorage.getItem('""" + CLAVE + r"""'));
      return {rondas: o.rondas.length, caja: document.getElementById('rondas-caja').hidden,
              aviso: document.getElementById('aviso-txt').textContent}; }""")
    comprobar(v2["rondas"] == 0 and v2["caja"], "borrar las rondas las quita y retira su menú", str(v2))
    await pg.click("#aviso-deshacer")
    await pg.wait_for_timeout(300)
    v3 = await pg.evaluate("""() => JSON.parse(localStorage.getItem('""" + CLAVE + r"""')).rondas.length""")
    comprobar(v3 == 2, "y «Deshacer» las devuelve", str(v3))
    await pg.click("#btn-clip")
    await pg.wait_for_timeout(250)
    nombres = await pg.evaluate("""() => [...document.querySelectorAll('#clip-menu li')].filter(li => !li.hidden)
      .map(li => li.querySelector('button').textContent.replace(/\\s+/g,' ').trim())""")
    comprobar("Borrar la ronda activa" not in nombres,
              "sin marcas no se ofrece borrar la ronda activa, que está vacía", " | ".join(nombres))
    comprobar(any(n.startswith("Ver la") for n in nombres),
              "pero sí llegar a la guardada: con la activa vacía, la lista no está en pantalla", " | ".join(nombres))
    await pg.click("#menu-guardada")
    await pg.wait_for_timeout(350)
    mirando = await pg.evaluate("""() => ({titulo: document.getElementById('lista-titulo-b').textContent,
      filas: document.querySelectorAll('#lista-marcas li').length})""")
    comprobar(mirando["titulo"] == "Equipos 2" and mirando["filas"] == 4,
              "y se abre la última ronda guardada", str(mirando))
    await pg.click("#lista-volver")
    await pg.wait_for_timeout(250)
    await pg.keyboard.press("Space")
    await pg.wait_for_timeout(150)
    await pg.keyboard.press("m")
    await pg.wait_for_timeout(350)
    await pg.click("#btn-clip")
    await pg.wait_for_timeout(250)
    nombres2 = await pg.evaluate("""() => [...document.querySelectorAll('#clip-menu li')].filter(li => !li.hidden)
      .map(li => li.querySelector('button').textContent.replace(/\\s+/g,' ').trim())""")
    comprobar("Borrar la ronda activa" in nombres2, "con una marca puesta, el menú habla de la ronda activa", " | ".join(nombres2))
    comprobar(not any(n.startswith("Ver la") for n in nombres2),
              "y deja de ofrecer la guardada: ya está la cabecera de la lista para eso", " | ".join(nombres2))
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(250)
    await pg.context.close()

    # la memoria aguanta la recarga
    pg = await banco.pagina(1366, 638, datos=estado(encabezado="Equipos", marcas=AHORA, rondas=TRES))
    await pg.wait_for_timeout(200)
    await pg.reload()
    await Banco.esperar_carga(pg)
    await pg.wait_for_timeout(250)
    m = await pg.evaluate("""() => ({clipN: document.getElementById('clip-n').textContent,
      filas: document.querySelectorAll('#lista-marcas li').length})""")
    comprobar(m["clipN"] == "2" and m["filas"] == 5, "al recargar siguen ahí las rondas guardadas y las marcas de ahora", str(m))
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Comparar: los mismos nombres, ronda por ronda")
    for w, h, etq in ((1366, 638, "1366x638"), (1024, 638, "1024x638")):
        pg = await banco.pagina(w, h, datos=estado(encabezado="Equipos", marcas=AHORA, rondas=TRES))
        await pg.wait_for_timeout(250)
        await pg.click("#btn-clip")
        await pg.wait_for_timeout(150)
        await pg.click("#menu-comparar")
        await pg.wait_for_timeout(450)
        c = await pg.evaluate(JS_CMP)
        if etq == "1366x638":
            comprobar(c["col"] == ["Quién", "Equipos 1", "Equipos 2", "Equipos · ahora", "Cambio"],
                      "una columna por ronda, de la más vieja a la de ahora, y el cambio al final", " | ".join(c["col"]))
            quienes = [f["quien"] for f in c["fil"]]
            comprobar(quienes == ["Marcos", "Andrés", "María", "Jeremy", "Elías"],
                      "una fila por nombre, ordenadas por su último tiempo", " · ".join(quienes))
            marcos = c["fil"][0]
            comprobar(marcos["celdas"] == ["00:49.2", "00:52.3", "00:41.0"], "cada celda es el momento en que esa persona terminó", " ".join(marcos["celdas"]))
            comprobar(marcos["cambio"] == "−8.2 s" and "baja" in marcos["clase"],
                      "el cambio va de la primera ronda en que aparece a la última, con el menos tipográfico", f"{marcos['cambio']} / {marcos['clase']}")
            comprobar(marcos["mejor"] == 2, "se destaca el mejor tiempo de cada quien", str(marcos["mejor"]))
            elias = c["fil"][-1]
            comprobar(elias["celdas"] == ["02:40.1", "—", "—"] and elias["cambio"] == "—",
                      "quien solo corrió una ronda sale igual, con sus casillas vacías", " ".join(elias["celdas"]))
            andres = c["fil"][1]
            comprobar(andres["cambio"] == "−14.6 s", "y el cambio de cada quien se calcula con sus propias rondas", andres["cambio"])
            comprobar("1 marca sin nombre" in c["nota"], "la nota dice cuántas marcas quedaron fuera por no tener nombre", c["nota"])
        comprobar(dentro(c["hoja"], c["pieza"], 2), f"la hoja de comparación no se sale de la pieza en {w} × {h}")
        comprobar(c["hoja"]["h"] <= (c["pieza"]["b"] - c["pieza"]["y"]) + 1, f"y no es más alta que la pieza en {w} × {h}")
        if capturas:
            await pg.screenshot(path=str(capturas / f"comparar-{etq}.png"))
        # se cierra con Escape y devuelve el foco
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(250)
        cerrada = await pg.evaluate("""() => ({hoja: document.getElementById('comparar').hidden,
          velo: document.getElementById('cmp-velo').hidden})""")
        comprobar(cerrada["hoja"] and cerrada["velo"], f"Escape cierra la comparación en {w} × {h}")
        comprobar(not pg.errores, f"consola limpia al comparar en {w} × {h}", " | ".join(pg.errores[:3]))
        await pg.context.close()

    # sin nombres no hay nada que cruzar, y se dice
    sin = [ronda("Marcas", 1, [(10000, ""), (20000, "")]), ronda("Marcas", 2, [(9000, "")])]
    pg = await banco.pagina(1366, 638, datos=estado(marcas=[], rondas=sin))
    await pg.wait_for_timeout(250)
    hay = await pg.evaluate("() => document.getElementById('menu-comparar-li').hidden")
    comprobar(hay, "sin ningún nombre, no se ofrece comparar")
    una = [ronda("Marcas", 1, [(10000, "Ana")])]
    pg2 = await banco.pagina(1366, 638, datos=estado(marcas=[], rondas=una))
    await pg2.wait_for_timeout(250)
    hay2 = await pg2.evaluate("() => document.getElementById('menu-comparar-li').hidden")
    comprobar(hay2, "con una sola ronda tampoco: hacen falta dos para comparar")
    dos = [ronda("Marcas", 1, [(10000, "Ana")]), ronda("Marcas", 2, [(8000, "Ana")])]
    pg3 = await banco.pagina(1366, 638, datos=estado(marcas=[], rondas=dos))
    await pg3.wait_for_timeout(250)
    hay3 = await pg3.evaluate("() => document.getElementById('menu-comparar-li').hidden")
    comprobar(not hay3, "con dos rondas con nombres, sí")
    await pg.context.close()
    await pg2.context.close()
    await pg3.context.close()


# ── Que nada aparezca ni desaparezca de un tirón ──────────────────────────
async def pruebas_suavidad(banco: Banco) -> None:
    seccion("Entrar y salir sin tirones")
    pg = await banco.pagina(1366, 638, datos=estado(encabezado="Equipos", marcas=AHORA, rondas=TRES))
    await pg.wait_for_timeout(250)

    # el panel sale debajo de su botón, y sin pestaña que dibujar mal
    await pg.click("#btn-ajustes")
    await pg.wait_for_timeout(300)
    pes = await pg.evaluate("""() => {
      const b = document.getElementById('btn-ajustes').getBoundingClientRect();
      const a = document.getElementById('ajustes').getBoundingClientRect();
      const p = document.getElementById('pieza').getBoundingClientRect();
      return {pestana: !!document.getElementById('ajustes-pestana'),
              debajo: a.top >= b.bottom - 1, dentro: a.right <= p.right + 2 && a.left >= p.left - 2,
              visible: a.width > 100};
    }""")
    comprobar(not pes["pestana"], "no hay pestaña: era un triangulito que en algunas pantallas salía dentado")
    comprobar(pes["debajo"] and pes["visible"], "el panel de ajustes sale debajo de su botón", str(pes))

    # los cuatro paneles salen con animación, no de golpe
    for etq, abrir, cerrar, sel in (
        ("los ajustes", "#btn-ajustes", "#ajustes-cerrar", "#ajustes"),
        ("el menú de las marcas", "#btn-clip", "#btn-clip", "#clip-menu"),
        ("el menú de las rondas", "#lista-menu", "#lista-menu", "#rondas-menu"),
    ):
        if await pg.evaluate(f"() => document.querySelector('{sel}').hidden"):
            await pg.click(abrir)
            await pg.wait_for_timeout(300)
        await pg.click(cerrar)
        await pg.wait_for_timeout(60)
        medio = await pg.evaluate(f"""() => {{
          const e = document.querySelector('{sel}');
          return {{saliendo: e.classList.contains('saliendo'), visible: !e.hidden,
                   anim: getComputedStyle(e).animationName}};
        }}""")
        comprobar(medio["saliendo"] and medio["visible"] and medio["anim"] != "none",
                  f"{etq} se va con su animación, no de golpe", str(medio))
        await pg.wait_for_timeout(320)
        fin = await pg.evaluate(f"() => document.querySelector('{sel}').hidden")
        comprobar(fin, f"{etq} termina oculto")

    # la comparación también
    await pg.click("#btn-clip")
    await pg.wait_for_timeout(250)
    await pg.click("#menu-comparar")
    await pg.wait_for_timeout(400)
    await pg.click("#cmp-cerrar")
    await pg.wait_for_timeout(60)
    cmp_medio = await pg.evaluate("""() => ({hoja: document.getElementById('comparar').classList.contains('saliendo'),
      velo: document.getElementById('cmp-velo').classList.contains('saliendo')})""")
    comprobar(cmp_medio["hoja"] and cmp_medio["velo"], "la comparación y su velo se van juntos y suaves", str(cmp_medio))
    await pg.wait_for_timeout(350)
    cmp_fin = await pg.evaluate("""() => document.getElementById('comparar').hidden
      && document.getElementById('cmp-velo').hidden""")
    comprobar(cmp_fin, "y terminan ocultos")

    # pantalla completa NO pasa por una transición de vista: el aviso llega
    # mientras el navegador aún agranda la ventana, y la foto congelada
    # encima de la página viva era el tirón que se veía
    vt = await pg.evaluate("() => typeof document.startViewTransition === 'function'")
    if vt:
        await pg.evaluate("() => { window.__vt = 0; const f = document.startViewTransition.bind(document);"
                          " document.startViewTransition = cb => { window.__vt++; return f(cb); }; }")
        await pg.keyboard.press("p")
        await pg.wait_for_timeout(600)
        d = await pg.evaluate("""() => ({vt: window.__vt, pc: document.documentElement.classList.contains('pc'),
          barra: getComputedStyle(document.querySelector('.barra')).display})""")
        comprobar(d["vt"] == 0,
                  "pantalla completa no abre ninguna transición de vista: la del navegador ya hace el viaje", str(d["vt"]))
        comprobar(d["pc"] and d["barra"] == "none", "y la pieza queda a pantalla completa, sin barra", str(d))
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(600)
        salida = await pg.evaluate("""() => ({vt: window.__vt, pc: document.documentElement.classList.contains('pc'),
          barra: getComputedStyle(document.querySelector('.barra')).display})""")
        comprobar(salida["vt"] == 0 and not salida["pc"] and salida["barra"] != "none",
                  "y al salir vuelve entera, también sin transición encima", str(salida))
        tec = await pg.evaluate("""() => ({dentro: !!document.getElementById('teclas').closest('.ajustes'),
          enLaPieza: !!document.querySelector('.pieza > .teclas')})""")
        comprobar(tec["dentro"] and not tec["enLaPieza"],
                  "los atajos viven en el panel de ajustes, no colgando de la pieza", str(tec))
        forma = await pg.evaluate("""() => getComputedStyle(document.querySelector('.pieza')).transitionProperty""")
        comprobar("padding" in forma and "border-radius" in forma,
                  "lo que sí se suaviza es la forma de la pieza, que es lo único interpolable", forma)
    else:
        comprobar(True, "este navegador no tiene transiciones de vista; el cambio se hace igual, sin ellas")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    # con «reducir movimiento», todo al instante
    pg = await banco.pagina(1366, 638, datos=estado(marcas=marcas(3)), reducido=True)
    await pg.wait_for_timeout(200)
    await pg.click("#btn-ajustes")
    await pg.wait_for_timeout(150)
    await pg.click("#ajustes-cerrar")
    await pg.wait_for_timeout(40)
    seco = await pg.evaluate("""() => ({oculto: document.getElementById('ajustes').hidden,
      saliendo: document.getElementById('ajustes').classList.contains('saliendo')})""")
    comprobar(seco["oculto"] and not seco["saliendo"], "con «reducir movimiento» los paneles se cierran al instante", str(seco))
    await pg.keyboard.press("p")
    await pg.wait_for_timeout(250)
    comprobar(await pg.evaluate("() => document.documentElement.classList.contains('pc')"),
              "y pantalla completa entra sin transición, pero entra")
    await pg.context.close()


# ── La tarjeta compacta ───────────────────────────────────────────────────
async def pruebas_tarjeta(banco: Banco, capturas: Path | None) -> None:
    seccion("La tarjeta compacta (tarjeta.html)")
    global URL
    guardada = URL
    URL = URL.replace("index.html", "tarjeta.html")
    try:
        pg = await banco.pagina(760, 720, esperar=False, escala=2)
        await pg.wait_for_timeout(700)
        t = await pg.evaluate("""() => {
          const c = document.querySelector('.carta');
          if (!c) return null;
          const r = c.getBoundingClientRect();
          return {w: Math.round(r.width), h: Math.round(r.height),
            ante: c.querySelector('.c-ante').textContent,
            nombre: c.querySelector('.c-nombre').textContent,
            claves: [...c.querySelectorAll('.c-claves li')].map(l => l.textContent),
            abrir: c.querySelector('.c-abrir').getAttribute('href'),
            abrirAlto: Math.round(c.querySelector('.c-abrir').getBoundingClientRect().height),
            fam: getComputedStyle(c.querySelector('.c-nombre')).fontFamily,
            texto: c.textContent.replace(/\\s+/g,' ').trim().length,
            sale: c.scrollWidth > c.clientWidth + 1};
        }""")
        if t is None:
            mal("tarjeta.html no dibuja ninguna carta")
            return
        comprobar(260 <= t["w"] <= 420 and 360 <= t["h"] <= 560,
                  f"la carta es una carta, no una página: {t['w']} × {t['h']} px", str(t))
        comprobar(t["nombre"] == "Cronómetro de actividad", "dice el nombre del cronómetro", t["nombre"])
        comprobar(t["ante"] == "Un reloj para toda la clase", "y su antetítulo, en mayúscula inicial", t["ante"])
        comprobar(len(t["claves"]) == 3, f"tres claves y no más ({len(t['claves'])})", " · ".join(t["claves"]))
        comprobar(t["texto"] < 220, f"casi no hay texto: {t['texto']} caracteres, no una explicación")
        comprobar(t["abrir"] == "index.html", "el botón abre la herramienta en la misma pestaña", str(t["abrir"]))
        comprobar(t["abrirAlto"] >= 44, f"el botón se toca con el dedo ({t['abrirAlto']} px)")
        comprobar("Lora" in t["fam"], "el nombre va en la letra de la marca", t["fam"])
        comprobar(not t["sale"], "nada se sale de la carta")
        comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
        if capturas:
            await pg.screenshot(path=str(capturas / "tarjeta.png"))
        # el panel la achica con una sola medida
        await pg.evaluate("() => document.documentElement.style.setProperty('--carta', '10px')")
        await pg.wait_for_timeout(200)
        chica = await pg.evaluate("() => Math.round(document.querySelector('.carta').getBoundingClientRect().width)")
        comprobar(abs(chica - t["w"] * 10 / 16) < 3, f"con --carta el panel la escala entera: {chica} px con 10, {t['w']} con 16")
        await pg.context.close()
    finally:
        URL = guardada


# ── La vista de la tarjeta ────────────────────────────────────────────────
async def hacer_vista(banco: Banco) -> None:
    seccion("La vista de la tarjeta (vista.webp)")
    w = 1280
    pg = await banco.pagina(w, 940, datos=estado(acum=222650 - 1600, corriendo=True, marcas=[]), reloj_falso=True, esperar=False, escala=2)
    # la marcha sigue desde la carga: 1.6 s simulados después, la cifra dice 03:42.6
    await pg.wait_for_timeout(900)
    await pg.clock.run_for(1600)
    await pg.wait_for_timeout(450)
    mesa = await pg.evaluate("() => document.querySelector('.mesa').getBoundingClientRect().toJSON()")
    alto = int(round(940 + (800 - mesa["height"])))
    await pg.set_viewport_size({"width": w, "height": alto})
    # quieta, y con un poco más de escenario alrededor para que en la tarjeta se lea como objeto
    await pg.add_style_tag(content="*,*::before,*::after{animation-play-state:paused!important}"
                                   ".mesa{padding:34px 64px 30px!important}")
    await pg.wait_for_timeout(300)
    mesa = await pg.evaluate("() => document.querySelector('.mesa').getBoundingClientRect().toJSON()")
    datos = await pg.evaluate("() => [document.getElementById('cifra').textContent, document.getElementById('estado-txt').textContent, document.getElementById('meta-der').textContent, document.getElementById('dinamica').value, document.getElementById('meta-valor').textContent]")
    png = await pg.screenshot(clip={"x": 0, "y": mesa["y"], "width": w, "height": 800})
    await pg.context.close()
    try:
        from PIL import Image
    except ImportError:
        mal("falta Pillow para escribir vista.webp (pip install pillow)")
        return
    im = Image.open(io.BytesIO(png)).convert("RGB")
    if im.size != (1280, 800):
        im = im.resize((1280, 800), Image.LANCZOS)
    destino = AQUI / "vista.webp"
    for calidad in (86, 80, 74, 68, 60):
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=calidad, method=6)
        if buf.tell() < 150_000:
            break
    destino.write_bytes(buf.getvalue())
    comprobar(datos == ["03:42.6", "En marcha", "74 %", "Reto 3 · Trabajo en parejas", "Meta 5:00"],
              "la vista muestra los datos de muestra", str(datos))
    comprobar(im.size == (1280, 800) and destino.stat().st_size < 150_000,
              f"vista.webp de {im.size[0]} × {im.size[1]} y {destino.stat().st_size / 1000:.1f} KB (calidad {calidad})")


# ── Principal ─────────────────────────────────────────────────────────────
def servir_carpeta() -> str:
    """Sirve la carpeta en 127.0.0.1, como la servirá el sitio: mismo origen para la memoria."""
    import functools
    import http.server
    import threading

    class Callado(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):  # noqa: D401
            pass
    manejador = functools.partial(Callado, directory=str(AQUI))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manejador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_address[1]}/index.html"


async def prueba_desde_carpeta(banco: "Banco") -> None:
    seccion("Abierto directamente desde su carpeta")
    global URL
    guardada, URL = URL, INDEX.as_uri()
    try:
        pg = await banco.pagina(1366, 638, datos=estado())
        m = await pg.evaluate(JS_MEDIR)
        comprobar(bool(re.fullmatch(r"\d{2}:\d{2}\.\d", m["texto"])) and m["pieza"]["ve"], "abre y dibuja el reloj desde el archivo")
        comprobar(not pg.errores, "sin errores en la consola", "; ".join(pg.errores[:3]))
        await pg.context.close()
    finally:
        URL = guardada


async def principal(args) -> int:
    global URL
    from playwright.async_api import async_playwright
    URL = servir_carpeta()
    css = Path(args.fuentes).read_text(encoding="utf-8") if args.fuentes else None
    capturas = Path(args.capturas) if args.capturas else None
    if capturas:
        capturas.mkdir(parents=True, exist_ok=True)
    habilidad = Path(args.habilidad) if args.habilidad else (AQUI.parents[2] / "Habilidad" / "secuencia321-generator" / "recursos" / "favicon.svg")
    pruebas_de_archivo(habilidad)
    async with async_playwright() as pw:
        banco = Banco(pw, css)
        await banco.abrir()
        try:
            await prueba_desde_carpeta(banco)
            await pruebas_info(banco)
            await pruebas_rondas(banco, capturas)
            await pruebas_suavidad(banco)
            await pruebas_tarjeta(banco, capturas)
            await pruebas_carga(banco)
            await pruebas_encaje(banco, capturas)
            await pruebas_senales(banco)
            await pruebas_movimiento(banco)
            await pruebas_deriva(banco)
            await pruebas_teclado(banco)
            await pruebas_notacion(banco)
            await pruebas_contraste(banco)
            if not args.sin_vista:
                await hacer_vista(banco)
        finally:
            await banco.cerrar()
    print(f"\n{BIENES} comprobaciones bien, {len(FALLOS)} mal.")
    if FALLOS:
        print("Lo que falla:")
        for f in FALLOS:
            print(f"  · {f}")
        return 1
    print("Todo en orden.")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--fuentes", help="CSS con las tipografías embebidas, para probar sin red")
    p.add_argument("--capturas", help="carpeta donde dejar las capturas de los visores")
    p.add_argument("--habilidad", help="ruta al favicon.svg de la habilidad (recursos/favicon.svg)")
    p.add_argument("--sin-vista", action="store_true", help="no rehacer vista.webp")
    args = p.parse_args()
    return asyncio.run(principal(args))


if __name__ == "__main__":
    sys.exit(main())
