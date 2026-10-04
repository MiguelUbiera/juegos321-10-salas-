#!/usr/bin/env python3
"""Prueba el Cronómetro por etapas en los visores del aula.

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
CLAVE = "s321-cronometro-etapas"

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
    base = {"v": 2, "nombre": "Fracciones equivalentes", "encabezado": "",
            "etapas": [{"n": "Inicio", "plan": 600000}, {"n": "Desarrollo", "plan": 1500000},
                       {"n": "Cierre", "plan": 600000}],
            "cortes": [], "actual": 0, "fin": False,
            "avisar": True, "sonido": False, "seguir": False,
            "ocultas": False, "plegada": False, "info": False,
            "acum": 0, "corriendo": False, "reloj": "ahora"}
    base.update(kw)
    return base



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
  const d = document.documentElement;
  const r = s => { const e = document.querySelector(s); if (!e) return null;
    const x = e.getBoundingClientRect(); if (!x.width && !x.height) return null;
    return {x: x.x, y: x.y, r: x.right, b: x.bottom, w: x.width, h: x.height}; };
  const botones = [...document.querySelectorAll('.mandos > button, .mandos .b-clip')].filter(b => b.offsetParent)
    .map(b => { const x = b.getBoundingClientRect(); return {id: b.id, x: x.x, y: x.y, r: x.right, b: x.bottom, w: x.width, h: x.height}; });
  const tramos = [...document.querySelectorAll('#rep-pista .rep-tramo')].map(t => t.getBoundingClientRect().width);
  const pista = document.getElementById('rep-pista');
  const anchoPista = pista ? pista.getBoundingClientRect().width : 0;
  return {sh: d.scrollHeight, ih: innerHeight, sw: d.scrollWidth, iw: innerWidth,
    pc: document.documentElement.classList.contains('pc'),
    pieza: r('#pieza'), cab: r('.p-cab'), din: r('#dinamica'), estado: r('#estado'), cifra: r('#cifra'),
    caja: r('.cifra-caja'), reloj: r('#reloj'), reparto: r('#reparto'), mandos: r('.mandos'), lista: r('#lista'),
    etLista: r('#et-lista'), teclas: r('#teclas'), barra: r('.barra'), migas: r('.migas'), pie: r('.pie'),
    info: r('#info'), infoInt: r('.info-int'), tool: r('.p-tool'),
    tramos, repAncho: anchoPista, pistaAncho: tramos.reduce((a, b) => a + b, 0) + Math.max(0, (tramos.length - 1) * 3),
    conInfo: document.getElementById('cuerpo').classList.contains('con-info'),
    pieTxt: document.querySelector('.pie').textContent.trim(),
    botones, texto: document.getElementById('cifra').textContent,
    conLista: document.getElementById('cuerpo').classList.contains('con-lista')};
}
"""


def dentro(a, b, tol=1.0) -> bool:
    return a["x"] >= b["x"] - tol and a["y"] >= b["y"] - tol and a["r"] <= b["r"] + tol and a["b"] <= b["b"] + tol


def se_tocan(a, b) -> bool:
    return not (a["r"] <= b["x"] or b["r"] <= a["x"] or a["b"] <= b["y"] or b["b"] <= a["y"])


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


# ── Pruebas sin navegador ─────────────────────────────────────────────────
def pruebas_de_archivo(habilidad: Path | None) -> None:
    seccion("Archivos")
    html = INDEX.read_text(encoding="utf-8")

    # index.html es producto: debe salir idéntico de la casa y de fuente/
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

    CASA = AQUI.parent / "_comun"
    for archivo in ("casa.css", "iconos.svg", "tarjeta.html", "tarjeta.css", "molde.py"):
        comprobar((CASA / archivo).exists(), f"la casa trae {archivo}")
    for archivo in ("propio.css", "propio.js", "cuerpo.html"):
        comprobar((AQUI / "fuente" / archivo).exists(), f"el cronómetro trae lo suyo: {archivo}")

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
    # el ícono tiene que distinguirse del de los hermanos
    hermano = AQUI.parent / "01_Actividad" / "icono.svg"
    if hermano.exists():
        comprobar(hermano.read_bytes() != (AQUI / "icono.svg").read_bytes(),
                  "el ícono no es el mismo que el del cronómetro de actividad: en el carrusel se distinguen")
        comprobar("rx=\"18\"" in icono and "rx=\"18\"" in hermano.read_text(encoding="utf-8"),
                  "pero comparte con él el cuadrado de aplicación: se ve que son de la misma casa")

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
    # el único campo con marcador es el del nombre de la actividad: una
    # sola palabra, casi transparente, para saber dónde se escribe —ya
    # que no hay línea ni lápiz que lo insinúen— y nada de frases largas
    campos = re.findall(r'<(?:input|textarea)\b[^>]*placeholder="([^"]*)"', marcado)
    comprobar(campos == ["Actividad"], "el único marcador de la pieza es «Actividad», en el campo del nombre", " | ".join(campos))
    # los colores de las etapas salen de la paleta y no se inventan
    paleta = {"#b04a2a", "#327a52", "#2c5c70", "#5a3a52", "#8f3a1e", "#0f2d3a"}
    declarados = set(re.findall(r"--e\d:(#[0-9a-f]{6})", html))
    comprobar(declarados and declarados <= paleta,
              f"los {len(declarados)} colores de las etapas salen de la paleta de la marca", " ".join(sorted(declarados - paleta)))

    seccion("La tarjeta del panel")
    try:
        ficha = json.loads((AQUI / "ficha.json").read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        mal(f"ficha.json no se puede leer: {e}")
        return
    fijos = {"id": "etapas", "orden": 2, "nombre": "Cronómetro por etapas",
             "abrir": "index.html", "icono": "icono.svg", "vista": "vista.webp"}
    distintos = [k for k, v in fijos.items() if ficha.get(k) != v]
    comprobar(not distintos, "ficha.json trae los campos fijos", "difieren: " + ", ".join(distintos))
    comprobar(bool(re.fullmatch(r"\d+\.\d+", str(ficha.get("version", "")))), "la ficha lleva versión con punto")
    comprobar(bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(ficha.get("fecha", "")))), "la ficha lleva fecha AAAA-MM-DD")
    comprobar(ficha.get("como_funciona", "").count("**") == 2, "una sola negrita marcada con **…** en «cómo funciona»")
    ideas = ficha.get("ideas") or []
    comprobar(len(ideas) == 3 and all(i.count("**") == 2 for i in ideas),
              "tres ideas para la clase, con una negrita cada una")
    propio = ("etapa", "parte", "reparto", "previsto", "fase", "bloque", "turno", "estacion", "estación")
    utilidad = (str(ficha.get("para_que", "")) + " " + str(ficha.get("lema", ""))).lower()
    comprobar(any(p in utilidad for p in propio),
              "el «para qué» nombra lo propio de este cronómetro y no serviría para cualquiera")
    comprobar(all(any(p in i.lower() for p in propio) for i in ideas),
              "cada idea se apoya en el reparto por etapas")
    # y no puede ser el mismo texto que el del hermano
    otra = AQUI.parent / "01_Actividad" / "ficha.json"
    if otra.exists():
        o = json.loads(otra.read_text(encoding="utf-8"))
        iguales = [k for k in ("lema", "para_que", "como_funciona", "antetitulo") if o.get(k) == ficha.get(k)]
        comprobar(not iguales, "ningún texto repetido del cronómetro de actividad", ", ".join(iguales))
    for archivo in ("index.html", "tarjeta.html", "icono.svg", "favicon.svg"):
        comprobar((AQUI / archivo).exists(), f"existe {archivo}")
    carta = (AQUI / "tarjeta.html").read_text(encoding="utf-8")
    comprobar(str(ficha.get("nombre")) in carta and str(ficha.get("lema")) in carta,
              "la tarjeta compacta dice el nombre y el lema de la ficha")
    comprobar("<script" not in carta.lower(), "la tarjeta compacta no lleva guion: es una pieza quieta")
    texto = json.dumps(ficha, ensure_ascii=False).lower() + " " + re.sub(r"<[^>]+>", " ", html).lower()
    edad = re.search(r"\b\d+\s*(a|-)\s*\d+\s*años|\baños de edad|\bedad(es)?\b|\bgrado(s)? (escolar|\d)|\b\d\s*[º°]\s*(grado|de primaria|de secundaria)|\b(primero|segundo|tercero|cuarto|quinto|sexto) de (primaria|secundaria)", texto)
    comprobar(edad is None, "no aparece ninguna edad ni ningún grado", edad.group(0) if edad else "")


# ── El encaje en los visores del aula ─────────────────────────────────────
VISORES = [(1366, 638), (1024, 638), (1280, 670), (1366, 620), (1920, 950)]
PANTALLA_COMPLETA = [(1024, 768), (1280, 800), (1366, 768), (1920, 1080)]
DOCUMENTO = [(820, 1180), (390, 844), (844, 390)]


def revisar_panel(m: dict, etiqueta: str, con_info: bool) -> None:
    comprobar(m["sh"] <= m["ih"] + 1, f"{etiqueta}: entra sin desplazamiento vertical", f"{m['sh']} > {m['ih']}")
    comprobar(m["sw"] <= m["iw"] + 1, f"{etiqueta}: entra sin desplazamiento horizontal", f"{m['sw']} > {m['iw']}")
    comprobar(dentro(m["cifra"], m["pieza"], 2), f"{etiqueta}: la cifra no se sale de la pieza")
    comprobar(m["cifra"]["b"] - m["cifra"]["y"] > 46, f"{etiqueta}: la cifra se lee desde el fondo del aula",
              f"{round(m['cifra']['b'] - m['cifra']['y'])} px")
    comprobar(dentro(m["reparto"], m["reloj"], 2), f"{etiqueta}: el reparto se queda en la columna del reloj")
    comprobar(m["tramos"] and abs(m["repAncho"] - m["pistaAncho"]) < 2,
              f"{etiqueta}: los tramos llenan la barra entera", f"{m['pistaAncho']} de {m['repAncho']}")
    fuera = [b["id"] for b in m["botones"] if not dentro(b, m["reloj"], 2)]
    comprobar(not fuera, f"{etiqueta}: los mandos se quedan en la columna del reloj", ", ".join(fuera))
    comprobar(m["conInfo"] == con_info, f"{etiqueta}: la información está {'abierta' if con_info else 'oculta'}")
    if con_info:
        comprobar(dentro(m["infoInt"], m["info"], 2) and m["info"]["r"] <= m["pieza"]["r"] + 2,
                  f"{etiqueta}: la información no se sale de la pieza")


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
    comprobar(d["estadoTexto"] == "Listo", "pero el texto sigue ahí para quien usa lector de pantalla", d["estadoTexto"])
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("El encaje en los visores del aula")
    for (w, h) in VISORES:
        for con_info in (False, True):
            pg = await banco.pagina(w, h, datos=estado(info=con_info))
            await pg.wait_for_timeout(260)
            m = await pg.evaluate(JS_MEDIR)
            revisar_panel(m, f"{w}×{h}{' con información' if con_info else ''}", con_info)
            comprobar(not pg.errores, f"{w}×{h}: consola limpia", " | ".join(pg.errores[:2]))
            if capturas:
                await pg.screenshot(path=str(capturas / f"abierto-{w}x{h}{'-info' if con_info else ''}.png"))
            await pg.context.close()

    seccion("Pantalla completa")
    for (w, h) in PANTALLA_COMPLETA:
        pg = await banco.pagina(w, h, datos=estado())
        await pg.keyboard.press("p")
        await pg.wait_for_timeout(800)
        m = await pg.evaluate(JS_MEDIR)
        etq = f"{w}×{h} pantalla completa"
        comprobar(m["pc"], f"{etq}: entra con la tecla P")
        comprobar(m["barra"] is None and m["migas"] is None and m["pie"] is None,
                  f"{etq}: sin barra, sin migas y sin pie")
        comprobar(m["teclas"] is None, f"{etq}: sin la línea de teclas")
        comprobar(m["cifra"]["b"] - m["cifra"]["y"] > 90, f"{etq}: la cifra crece",
                  f"{round(m['cifra']['b'] - m['cifra']['y'])} px")
        revisar_panel(m, etq, False)
        if capturas and (w, h) in ((1024, 768), (1920, 1080)):
            await pg.screenshot(path=str(capturas / f"pantalla-completa-{w}x{h}.png"))
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
      siguiente: !!document.getElementById('btn-siguiente').offsetParent})""")
    comprobar(d["info"] == "none" and d["ajustes"] == "none" and not d["infoBtn"] and not d["ajustesBtn"] and not d["reiniciarBtn"],
              "Información, Ajustes y Reiniciar desaparecen del todo, así estuvieran abiertos", str(d))
    comprobar(d["pantallaBtn"] and d["marcha"] and d["siguiente"],
              "quedan pantalla completa, pausa/reanudar y siguiente/terminar", str(d))
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(400)
    v = await pg.evaluate("() => getComputedStyle(document.getElementById('btn-info')).display")
    comprobar(v != "none", "y al salir de pantalla completa, Información vuelve a estar a mano", v)
    await pg.context.close()

    seccion("Modo documento: en vertical, la lista debajo")
    for (w, h) in DOCUMENTO:
        pg = await banco.pagina(w, h, datos=estado(), tactil=True)
        await pg.wait_for_timeout(260)
        m = await pg.evaluate(JS_MEDIR)
        etq = f"{w}×{h}"
        comprobar(m["sw"] <= m["iw"] + 1, f"{etq}: no se desplaza en horizontal", f"{m['sw']} > {m['iw']}")
        comprobar(m["lista"] is not None and m["lista"]["y"] > m["cifra"]["y"],
                  f"{etq}: la lista de etapas va debajo del reloj")
        comprobar(m["teclas"] is None, f"{etq}: en pantalla táctil no se enseñan las teclas")
        comprobar(m["cifra"]["b"] - m["cifra"]["y"] > 34, f"{etq}: la cifra se sigue leyendo",
                  f"{round(m['cifra']['b'] - m['cifra']['y'])} px")
        if capturas:
            await pg.screenshot(path=str(capturas / f"documento-{w}x{h}.png"), full_page=True)
        await pg.context.close()


# ── El reparto: el motor de las etapas ────────────────────────────────────
async def pruebas_etapas(banco: Banco, capturas: Path | None) -> None:
    seccion("Las etapas: una se cierra y abre la siguiente")
    pg = await banco.pagina(1366, 638, datos=estado(), reloj_falso=True)
    est = "() => window.s321Cronometro.estado()"
    e0 = await pg.evaluate(est)
    comprobar([x["n"] for x in e0["etapas"]] == ["Inicio", "Desarrollo", "Cierre"],
              "de fábrica vienen tres etapas con los nombres de las secuencias", str([x["n"] for x in e0["etapas"]]))
    comprobar([x["plan"] for x in e0["etapas"]] == [600000, 1500000, 600000],
              "y lo que se guardó es lo que se recupera, sin reescribirlo con el estándar")

    await pg.keyboard.press("Space")
    await pg.clock.run_for(60000)
    await pg.wait_for_timeout(120)
    v = await pg.evaluate("""() => ({cifra: document.getElementById('cifra').textContent,
      total: document.getElementById('rep-total') ? '' : document.getElementById('rep-der').textContent,
      previsto: document.getElementById('rep-previsto').textContent})""")
    comprobar(v["cifra"] in ("00:59", "01:00"), "la cifra grande cuenta el tiempo de la etapa que corre", v["cifra"])
    comprobar(v["total"] in ("00:59", "01:00"),
              "y al lado va el total, sin la palabra «Total» ni el nombre de ninguna clase", v["total"])
    comprobar("45:00" in v["previsto"], "a la izquierda, lo previsto en total", v["previsto"])

    await pg.keyboard.press("v")
    await pg.wait_for_timeout(150)
    e1 = await pg.evaluate(est)
    comprobar(e1["actual"] == 1 and len(e1["cortes"]) == 1, "«Siguiente» cierra la etapa y abre la que sigue", str(e1))
    await pg.clock.run_for(30000)
    await pg.wait_for_timeout(120)
    v2 = await pg.evaluate("""() => ({cifra: document.getElementById('cifra').textContent,
      total: document.getElementById('rep-der').textContent,
      filas: [...document.querySelectorAll('#et-lista li[data-i]')].map(li => ({
        clase: li.className, n: li.querySelector('.et-nombre').textContent,
        donde: li.querySelector('.et-donde').textContent,
        t: li.querySelector('.et-t').textContent, dif: li.querySelector('.et-dif').textContent}))})""")
    comprobar(v2["cifra"] in ("00:29", "00:30"), "la cifra vuelve a cero al abrir la etapa nueva", v2["cifra"])
    comprobar(v2["total"].split()[-1] in ("01:29", "01:30"), "pero el total sigue sumando", v2["total"])
    f = v2["filas"]
    comprobar("hecha" in f[0]["clase"] and f[0]["t"] in ("00:59", "01:00") and "previsto 10:00" in f[0]["donde"],
              "la etapa cerrada muestra lo que duró y lo que estaba previsto", str(f[0]))
    comprobar(f[0]["dif"].startswith("\u2212") and f[0]["dif"] in ("\u22129:00", "\u22129:01"),
              "con su diferencia y el menos tipográfico", f[0]["dif"])
    comprobar("ahora" in f[1]["clase"] and f[1]["donde"] == "etapa 2 de 3",
              "la que corre se señala y dice dónde estamos, dentro de la lista", str(f[1]))
    comprobar(f[2]["donde"] == "" and f[2]["t"] == "10:00",
              "la que espera enseña su tiempo previsto una sola vez", str(f[2]))

    await pg.keyboard.press("b")
    await pg.wait_for_timeout(150)
    eb = await pg.evaluate(est)
    comprobar(eb["actual"] == 0 and eb["cortes"] == [], "«Volver a la anterior» deshace el corte, no el tiempo", str(eb))
    comprobar(await pg.evaluate("() => window.s321Cronometro.tiempo()") >= 90000, "el reloj no pierde lo que llevaba")
    await pg.context.close()

    seccion("Una etapa que se pasa no corta nada")
    pg = await banco.pagina(1366, 638, datos=estado(acum=640000, corriendo=True, actual=0), reloj_falso=True)
    await pg.wait_for_timeout(200)
    p = await pg.evaluate("""() => ({tramo: document.getElementById('pieza').dataset.tramo,
      estado: document.getElementById('estado-txt').textContent,
      pasada: document.querySelectorAll('#rep-pista .rep-tramo.pasada').length,
      lleno: document.querySelector('#rep-pista .rep-tramo .rep-lleno').style.width,
      dif: document.querySelector('#et-lista li[data-i] .et-dif').textContent,
      corre: window.s321Cronometro.estado().corre})""")
    comprobar(p["corre"], "pasada la etapa, el reloj sigue corriendo")
    comprobar(p["tramo"] == "pasada" and p["estado"] == "", "se dice que se agotó solo con el indicador, sin texto encima", str(p))
    comprobar(p["pasada"] == 1 and p["lleno"] == "100%", "su tramo se llena y se raya, pero no crece: el reparto es el mapa", str(p))
    comprobar(re.fullmatch(r"\+\d+(\.\d+)? s", p["dif"] or "") is not None, "y la lista dice cuánto se fue de más", p["dif"])
    if capturas:
        await pg.screenshot(path=str(capturas / "etapa-pasada.png"))
    await pg.context.close()

    seccion("La última etapa termina la actividad")
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000, 2100000], actual=2, acum=2640000), reloj_falso=True)
    await pg.wait_for_timeout(200)
    await pg.keyboard.press("v")
    await pg.wait_for_timeout(250)
    fin = await pg.evaluate("""() => ({e: window.s321Cronometro.estado(),
      estado: document.getElementById('estado-txt').textContent,
      cifra: document.getElementById('cifra').textContent,
      marcha: document.getElementById('btn-marcha').disabled,
      siguiente: document.getElementById('btn-siguiente').disabled})""")
    comprobar(fin["e"]["fin"] and fin["estado"] == "Terminada", "al cerrar la última, la actividad termina", str(fin["estado"]))
    comprobar(fin["cifra"] in ("43:59", "44:00"), "y la cifra grande pasa a decir el total", fin["cifra"])
    comprobar(fin["marcha"], "no se puede seguir contando la última etapa")
    comprobar(not fin["siguiente"], "pero el botón de seguir adelante ofrece el evento nuevo: terminar no es un callejón")
    if capturas:
        await pg.screenshot(path=str(capturas / "terminada.png"))
    await pg.context.close()

    seccion("Reiniciar y la memoria")
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000], actual=1, acum=900000))
    await pg.wait_for_timeout(200)
    await pg.reload()
    await Banco.esperar_carga(pg)
    await pg.wait_for_timeout(200)
    m = await pg.evaluate(est)
    comprobar(m["actual"] == 1 and m["cortes"] == [600000], "al recargar sigue en la misma etapa", str(m))
    await pg.click("#btn-reiniciar")
    await pg.click("#btn-reiniciar")
    await pg.wait_for_timeout(400)
    r = await pg.evaluate(est)
    comprobar(r["actual"] == 0 and r["cortes"] == [] and not r["fin"], "Reiniciar vuelve a la primera etapa", str(r))
    comprobar([x["n"] for x in r["etapas"]] == ["Inicio", "Desarrollo", "Cierre"], "y no toca el reparto: lo planeado se queda")
    comprobar(len(r["eventos"]) == 1 and r["eventos"][0]["nombre"] == "Etapas 1",
              "Reiniciar no borra: guarda el evento con su número", str(r["eventos"]))
    comprobar(await pg.evaluate("() => document.getElementById('aviso').hidden"),
              "y no ofrece deshacer: lo guardado sigue en la lista, y de ahí se elimina si sobra")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()


async def pruebas_pantalla_completa(banco: Banco, capturas: Path | None) -> None:
    seccion("Pantalla completa: sin foto congelada encima")
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000], actual=1, acum=900000))
    await pg.wait_for_timeout(350)
    vt = await pg.evaluate("() => typeof document.startViewTransition === 'function'")
    if not vt:
        comprobar(True, "este navegador no tiene transiciones de vista; el cambio se hace igual, sin ellas")
        await pg.context.close()
        return
    await pg.evaluate("() => { window.__vt = 0; const f = document.startViewTransition.bind(document);"
                      " document.startViewTransition = cb => { window.__vt++; return f(cb); }; }")
    await pg.keyboard.press("p")
    await pg.wait_for_timeout(600)
    d = await pg.evaluate("""() => ({vt: window.__vt, pc: document.documentElement.classList.contains('pc'),
      barra: getComputedStyle(document.querySelector('.barra')).display,
      pie: getComputedStyle(document.querySelector('.pie')).display})""")
    comprobar(d["vt"] == 0,
              "pantalla completa no abre ninguna transición de vista: el aviso llega mientras el navegador "
              "todavía agranda la ventana, y esa foto congelada era el tirón", str(d["vt"]))
    comprobar(d["pc"] and d["barra"] == "none" and d["pie"] == "none",
              "y la pieza queda entera: sin barra, sin migas y sin pie", str(d))
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(600)
    s = await pg.evaluate("""() => ({vt: window.__vt, pc: document.documentElement.classList.contains('pc'),
      barra: getComputedStyle(document.querySelector('.barra')).display})""")
    comprobar(s["vt"] == 0 and not s["pc"] and s["barra"] != "none",
              "y al salir vuelve entera, también sin transición encima", str(s))
    forma = await pg.evaluate("() => getComputedStyle(document.querySelector('.pieza')).transitionProperty")
    comprobar("padding" in forma and "border-radius" in forma,
              "lo que sí se suaviza es la forma de la pieza, que es lo único interpolable", forma)
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
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
    fn_antes = await pg.evaluate("() => document.getElementById('btn-siguiente').disabled")
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


async def pruebas_estandar(banco: Banco, capturas: Path | None) -> None:
    seccion("El estándar: con qué se abre un navegador nuevo")
    pg = await banco.pagina(1366, 638)
    await pg.wait_for_timeout(350)
    e = await pg.evaluate("() => window.s321Cronometro.estado()")
    comprobar([x["n"] for x in e["etapas"]] == ["Inicio", "Desarrollo", "Cierre"],
              "tres etapas con los nombres de siempre", " · ".join(x["n"] for x in e["etapas"]))
    comprobar([x["plan"] for x in e["etapas"]] == [600000, 1200000, 600000],
              "y su reparto: 10, 20 y 10 minutos", str([x["plan"] // 60000 for x in e["etapas"]]))
    v = await pg.evaluate("""() => ({titulo: document.getElementById('lista-titulo-b').textContent,
      previsto: document.getElementById('rep-previsto').textContent,
      clip: document.getElementById('clip-n').hidden})""")
    comprobar(v["titulo"] == "Etapas", "la lista activa se llama «Etapas» hasta que el maestro la nombre", v["titulo"])
    comprobar("40:00" in v["previsto"], "cuarenta minutos en total", v["previsto"])
    comprobar(v["clip"], "y no hay ningún evento guardado todavía")

    # el encabezado se nombra, se corre la tanda y «Guardar» abre la siguiente sola
    await pg.click("#lista-lapiz")
    await pg.wait_for_timeout(300)
    await pg.fill(".lista-titulo-campo", "Grupo")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(300)
    await pg.click("#btn-marcha")
    await pg.wait_for_timeout(250)
    for _ in range(3):
        await pg.click("#btn-siguiente")
        await pg.wait_for_timeout(220)
    rot = await pg.evaluate("() => document.querySelector('#siguiente-txt .ve').textContent.trim()")
    comprobar(rot == "Guardar", "terminada la tanda, el mismo botón ofrece guardarla: no hace falta reiniciar", rot)
    await pg.click("#btn-siguiente")
    await pg.wait_for_timeout(450)
    g = await pg.evaluate("""() => ({e: window.s321Cronometro.estado(),
      titulo: document.getElementById('lista-titulo-b').textContent})""")
    comprobar([v["nombre"] for v in g["e"]["eventos"]] == ["Grupo 1"],
              "se archiva con su nombre y su número", str([v["nombre"] for v in g["e"]["eventos"]]))
    comprobar(g["e"]["cortes"] == [] and not g["e"]["fin"],
              "y la siguiente se abre sola, en cero: guardar ya es empezar otra", str(g["e"]["cortes"]))
    comprobar([x["plan"] for x in g["e"]["etapas"]] == [600000, 1200000, 600000],
              "y la nueva vuelve al estándar de la casa", str([x["plan"] // 60000 for x in g["e"]["etapas"]]))
    comprobar(g["titulo"] == "Etapas",
              "también en el nombre: heredar el del evento archivado la hacía pasar por la misma puesta en cero", g["titulo"])

    # el menos del encabezado quita el panel de en medio
    await pg.evaluate("() => { window.__relojAntes = document.getElementById('reloj').getBoundingClientRect().width; }")
    await pg.click("#lista-plegar")
    await pg.wait_for_timeout(400)
    r = await pg.evaluate("""() => ({ocultas: window.s321Cronometro.estado().ocultas,
      ancho: document.getElementById('lista').getBoundingClientRect().width,
      reloj: document.getElementById('reloj').getBoundingClientRect().width,
      relojAntes: window.__relojAntes})""")
    comprobar(r["ocultas"] and r["ancho"] < 6,
              "el menos quita el panel de en medio: es lo mismo que «Ocultar», no una tercera cosa", str(r))
    comprobar(r["reloj"] > r["relojAntes"] + 100,
              f"y el reloj se queda con el sitio ({round(r['reloj'] - r['relojAntes'])} px más)")
    await pg.click("#btn-clip")
    await pg.wait_for_timeout(300)
    clip = await pg.evaluate("""() => [...document.querySelectorAll('#clip-menu li')].filter(l => !l.hidden)
      .map(l => l.querySelector('button').textContent.replace(/\\s+/g,' ').trim())""")
    comprobar(clip[0].startswith("Ver"), "y desde abajo se vuelve a ver, que es de donde se ocultó", clip[0])
    await pg.click("#menu-ver")
    await pg.wait_for_timeout(600)
    comprobar(await pg.evaluate("() => document.getElementById('lista').getBoundingClientRect().width > 6"),
              "y vuelve con su sitio")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()


# ── El editor de etapas ───────────────────────────────────────────────────
async def pruebas_reparto(banco: Banco, capturas: Path | None) -> None:
    seccion("El reparto se cambia en la lista, no en un panel")
    pg = await banco.pagina(1366, 638, datos=estado())
    await pg.wait_for_timeout(250)
    await pg.click("#btn-ajustes")
    await pg.wait_for_timeout(400)
    a = await pg.evaluate("""() => ({abierto: !document.getElementById('ajustes').hidden,
      editor: !!document.getElementById('et-editor'), mas: !!document.getElementById('et-mas'),
      filas: [...document.querySelectorAll('#ajustes .aj-fila label')].map(l => l.textContent),
      rotulos: [...document.querySelectorAll('#ajustes .aj-rotulo')].map(l => l.textContent),
      notas: [...document.querySelectorAll('#ajustes .aj-nota')].map(l => l.textContent),
      dentro: (() => { const r = document.getElementById('ajustes').getBoundingClientRect();
        return r.top >= -1 && r.bottom <= innerHeight + 1; })()})""")
    comprobar(a["abierto"], "los ajustes se abren por su botón de la cabecera")
    comprobar(not a["editor"] and not a["mas"],
              "y ya no editan etapas: eso se hace en la lista, donde se ven", str(a))
    comprobar(a["filas"] == ["Avisar antes de que se acabe", "Parpadear en los últimos segundos",
                             "Sonido al agotarse", "Pasar sola a la siguiente",
                             "Mantener la pantalla despierta", "Campana al terminar todo"],
              "aquí solo queda lo del sistema y lo del taller", " | ".join(a["filas"]))
    comprobar(a["rotulos"] == ["Cuando se acaba el tiempo", "Con teclado", "Al terminarse una etapa", "En el taller"],
              "en grupos con su rótulo, y los atajos en el hueco de la primera columna", " | ".join(a["rotulos"]))
    tec = await pg.evaluate("""() => {
      const t = document.getElementById('teclas'), aj = document.getElementById('ajustes');
      const r = t.getBoundingClientRect(), a = aj.getBoundingClientRect();
      return {dentro: !!t.closest('.ajustes'), n: t.querySelectorAll('li').length,
        anchoOk: r.left >= a.left - 1 && r.right <= a.right + 1,
        panelEnPantalla: a.top >= -1 && a.bottom <= innerHeight + 1,
        alcanzable: aj.scrollHeight - aj.clientHeight,
        enLaPieza: !!document.querySelector('.pieza > .teclas')};
    }""")
    comprobar(tec["dentro"] and not tec["enLaPieza"],
              "los atajos ya no cuelgan de la pieza: en la pizarra se toca, no se teclea", str(tec))
    comprobar(tec["n"] == 4 and tec["anchoOk"],
              "solo los que no se adivinan: el espacio para iniciar y pausar lo sabe todo el mundo", str(tec))
    comprobar(tec["panelEnPantalla"], "el panel no se sale de la pantalla")
    comprobar(tec["alcanzable"] == 0,
              "y no hace falta desplazarlo: era eso lo que lo hacía parecer enorme", str(tec))
    comprobar(not any("se cambian en la lista" in n for n in a["notas"]),
              "sin instrucciones de dónde se editan las etapas: el panel ajusta, no explica", " | ".join(a["notas"]))
    comprobar(a["dentro"], "y el panel cabe entero en la pantalla")

    # los dos del taller se guardan y se recuperan
    await pg.click("#aj-despierta")
    await pg.click("#aj-final")
    await pg.wait_for_timeout(400)
    g = await pg.evaluate("() => JSON.parse(localStorage.getItem('s321-cronometro-etapas'))")
    comprobar(g["despierta"] is False and g["final"] is True,
              "lo del taller se recuerda entre clases", f"despierta={g['despierta']} final={g['final']}")
    await pg.reload()
    await pg.wait_for_timeout(700)
    await pg.click("#btn-ajustes")
    await pg.wait_for_timeout(450)
    v = await pg.evaluate("""() => ({d: document.getElementById('aj-despierta').checked,
      f: document.getElementById('aj-final').checked})""")
    comprobar(v["d"] is False and v["f"] is True, "y al volver, los interruptores dicen lo mismo", str(v))
    if capturas:
        await pg.screenshot(path=str(capturas / "ajustes.png"))
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(300)

    # el previsto total se rehace al cambiar un tiempo
    await pg.click('#et-lista [data-editar="1"]')
    await pg.wait_for_timeout(300)
    await pg.fill("#et-min-1", "12")
    await pg.fill("#et-seg-1", "30")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(350)
    prev = await pg.evaluate("() => document.getElementById('rep-previsto').textContent")
    comprobar("32:30" in prev, "cambiar un tiempo rehace el previsto total y el tamaño de los tramos", prev)
    anchos = await pg.evaluate("""() => [...document.querySelectorAll('#rep-pista .rep-tramo')]
      .map(x => Math.round(x.getBoundingClientRect().width))""")
    comprobar(anchos[1] > anchos[0] and anchos[1] > anchos[2],
              "la barra vuelve a repartirse en proporción", str(anchos))
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    # quitar una etapa ya corrida se lleva su tiempo, y las cuentas cuadran
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000], actual=1, acum=900000))
    await pg.wait_for_timeout(250)
    await pg.click('#et-lista [data-editar="0"]')
    await pg.wait_for_timeout(300)
    await pg.click('#et-lista [data-quita="0"]')
    await pg.wait_for_timeout(400)
    q = await pg.evaluate("() => window.s321Cronometro.estado()")
    comprobar(q["cortes"] == [] and q["actual"] == 0,
              "quitar la etapa corrida se lleva su corte y el evento vuelve a la primera", str(q))
    comprobar(q["acum"] == 300000, "y el total baja exactamente lo que duraba ella", str(q["acum"]))
    aviso = await pg.evaluate("() => document.getElementById('aviso-txt').textContent")
    comprobar("Inicio" in aviso, "diciendo cuál se fue, por su nombre", aviso)
    await pg.click("#aviso-deshacer")
    await pg.wait_for_timeout(400)
    v = await pg.evaluate("() => window.s321Cronometro.estado()")
    comprobar(v["cortes"] == [600000] and v["acum"] == 900000 and v["actual"] == 1,
              "«Deshacer» devuelve la etapa, su corte y el total", str(v))

    # el mínimo son dos etapas
    await pg.click('#et-lista [data-editar="0"]')
    await pg.wait_for_timeout(250)
    await pg.click('#et-lista [data-quita="0"]')
    await pg.wait_for_timeout(350)
    await pg.click('#et-lista [data-editar="0"]')
    await pg.wait_for_timeout(250)
    await pg.click('#et-lista [data-quita="0"]')
    await pg.wait_for_timeout(350)
    comprobar(len((await pg.evaluate("() => window.s321Cronometro.estado()"))["etapas"]) == 2,
              "no se baja de dos etapas: una sola no es un reparto")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()


# ── Los eventos: una tanda se guarda y se compara con la siguiente ────────
EV1 = {"base": "Grupo", "n": 1, "total": 2_640_000, "fecha": 0,
       "etapas": [{"n": "Inicio", "plan": 600000}, {"n": "Desarrollo", "plan": 1500000}, {"n": "Cierre", "plan": 600000}],
       "cortes": [540000, 2_220_000, 2_640_000]}
EV2 = dict(EV1, n=2, total=2_880_000, cortes=[660000, 2_460_000, 2_880_000])


async def pruebas_eventos(banco: Banco, capturas: Path | None) -> None:
    seccion("Los eventos: la tanda se guarda con su nombre")
    d = estado(encabezado="Grupo", eventos=[EV1, EV2], cortes=[600000], actual=1, acum=1_320_000)
    pg = await banco.pagina(1366, 638, datos=d)
    await pg.wait_for_timeout(300)
    v = await pg.evaluate("""() => ({titulo: document.getElementById('lista-titulo-b').textContent,
      clipN: document.getElementById('clip-n').textContent, clipOculto: document.getElementById('clip-n').hidden})""")
    comprobar(v["titulo"] == "Grupo", "la lista se llama por el nombre del evento en curso", v["titulo"])
    comprobar(v["clipN"] == "2" and not v["clipOculto"], "el contador lleva la cuenta de los eventos guardados", str(v))

    await pg.click("#lista-menu")
    await pg.wait_for_timeout(300)
    menu = await pg.evaluate("""() => [...document.querySelectorAll('#eventos-menu button:not(.r-quitar)')]
      .map(b => b.querySelector('.r-nombre') ? b.querySelector('.r-nombre').textContent : b.textContent.trim())""")
    comprobar(len(menu) == 5 and menu[0] == "Grupo",
              "el menú de la cabecera lista los eventos, empezando por el de ahora", " | ".join(menu))
    comprobar(menu[1] == "Grupo 2" and menu[2] == "Grupo 1", "de la más nueva a la más vieja", " | ".join(menu[1:3]))
    comprobar("Comparar eventos" in menu, "y comparar está aquí arriba, con la lista, no abajo entre los mandos", " | ".join(menu))
    comprobar(not any("Repartir" in x for x in menu),
              "el reparto no: eso se va a hacer al panel de ajustes, no al menú de navegar", " | ".join(menu))
    comprobar("Añadir evento" in menu, "y aquí se empieza otro evento, sin pasar por Reiniciar", " | ".join(menu))

    # el nombre basta: lo que distingue un evento de otro es su color
    col = await pg.evaluate("""() => {
      const b = [...document.querySelectorAll('#eventos-menu button[data-evento]')];
      return {puntos: b.filter(x => x.querySelector('.r-color')).length,
        colores: b.map(x => x.style.getPropertyValue('--c')),
        activo: [...document.querySelectorAll('#eventos-menu .r-activo')].map(x => x.textContent),
        texto: b.map(x => x.textContent)};
    }""")
    comprobar(col["puntos"] == 3, f"cada evento lleva su punto de color ({col['puntos']})")
    comprobar(len(set(col["colores"])) == 3, "y tres eventos son tres colores distintos", " ".join(col["colores"]))
    comprobar(col["activo"] == ["activo"], "el de ahora se marca con «activo», sin frases", str(col["activo"]))
    comprobar(not any("el de ahora" in t for t in col["texto"]),
              "y en ningún sitio dice «el de ahora»: el nombre y el color bastan", " | ".join(col["texto"]))

    # los dos menús no hacen lo mismo
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(300)
    await pg.click("#btn-clip")
    await pg.wait_for_timeout(300)
    clip = await pg.evaluate("""() => [...document.querySelectorAll('#clip-menu li')].filter(l => !l.hidden)
      .map(l => l.querySelector('button').textContent.replace(/\s+/g,' ').trim())""")
    comprobar(clip[0] == 'Ocultar «Grupo»', "el menú de al lado de Reiniciar oculta el evento por su nombre, no «las etapas»", clip[0])
    comprobar(not any(x.startswith("Guardar") for x in clip),
              "guardar no se ofrece a media tanda: cortaría el evento por la mitad", " | ".join(clip))
    comprobar(any(x == "Borrar todo" for x in clip),
              "y borrar se dice en dos palabras, sin contar cuántos hay", " | ".join(clip))
    comprobar(not any("Comparar" in x or "Repartir" in x or "Editar" in x for x in clip),
              "comparar y repartir ya no están aquí abajo: viven arriba, junto a la lista", " | ".join(clip))
    comprobar(not any(x.startswith("Grupo 1") or x.startswith("Grupo 2") for x in clip),
              "los dos menús no repiten lo mismo", " | ".join(clip))
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(300)

    # mirar un evento guardado
    await pg.click("#lista-menu")
    await pg.wait_for_timeout(300)
    ids = await pg.eval_on_selector_all("#eventos-menu [data-evento]", "els => els.map(e => e.dataset.evento)")
    await pg.click(f'#eventos-menu [data-evento="{ids[1]}"]')
    await pg.wait_for_timeout(400)
    g = await pg.evaluate("""() => ({titulo: document.getElementById('lista-titulo-b').textContent,
      tiempos: [...document.querySelectorAll('#et-lista .et-t')].map(e => e.textContent),
      quietas: document.querySelectorAll('#et-lista li.quieta').length,
      tocables: document.querySelectorAll('#et-lista li.tocable').length,
      volver: !document.getElementById('lista-volver').hidden})""")
    comprobar(g["titulo"] == "Grupo 2", "se abre el evento guardado con su nombre", g["titulo"])
    comprobar(g["tiempos"] == ["11:00", "30:00", "07:00"], "con lo que duró cada etapa", " ".join(g["tiempos"]))
    # cada evento guardado se borra desde su propio renglón
    await pg.click("#lista-volver")
    await pg.wait_for_timeout(350)
    await pg.click("#lista-menu")
    await pg.wait_for_timeout(300)
    x = await pg.evaluate("""() => {
      const b = [...document.querySelectorAll('#eventos-menu [data-quitar-evento]')];
      const f = b[0].closest('li').querySelector('[data-evento]').getBoundingClientRect();
      const q = b[0].getBoundingClientRect();
      return {n: b.length, suelta: q.x >= f.right - 1, ancho: q.width,
        activo: !!document.querySelector('#eventos-menu [data-evento="ahora"] ~ .r-quitar')};
    }""")
    comprobar(x["n"] == 2, f"cada evento guardado lleva su X, ahí mismo donde se le ve ({x['n']})")
    comprobar(x["suelta"] and x["ancho"] < 60,
              "al final de su renglón, sin montarse encima del nombre", f"{round(x['ancho'])} px")
    comprobar(not x["activo"], "el de ahora no la lleva: no hay nada guardado que borrar")
    ids = await pg.eval_on_selector_all("#eventos-menu [data-quitar-evento]", "e => e.map(x => x.dataset.quitarEvento)")
    await pg.click(f'#eventos-menu [data-quitar-evento="{ids[0]}"]')
    await pg.wait_for_timeout(400)
    comprobar(len((await pg.evaluate("() => window.s321Cronometro.estado()"))["eventos"]) == 1,
              "un clic lo borra")
    av = await pg.evaluate("() => document.getElementById('aviso-txt').textContent")
    comprobar("eliminó" in av, "y eso sí ofrece deshacer: lo que desaparece", av)
    await pg.click("#aviso-deshacer")
    await pg.wait_for_timeout(400)
    comprobar(len((await pg.evaluate("() => window.s321Cronometro.estado()"))["eventos"]) == 2, "«Deshacer» lo devuelve")
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(300)
    await pg.click("#lista-menu")
    await pg.wait_for_timeout(300)
    ids = await pg.eval_on_selector_all("#eventos-menu [data-evento]", "els => els.map(e => e.dataset.evento)")
    await pg.click(f'#eventos-menu [data-evento="{ids[1]}"]')
    await pg.wait_for_timeout(400)
    g = await pg.evaluate("""() => ({titulo: document.getElementById('lista-titulo-b').textContent,
      tiempos: [...document.querySelectorAll('#et-lista li[data-i] .et-t')].map(e => e.textContent),
      quietas: document.querySelectorAll('#et-lista li.quieta').length,
      tocables: document.querySelectorAll('#et-lista li.tocable').length,
      volver: !document.getElementById('lista-volver').hidden})""")
    comprobar(g["quietas"] == 3 and g["tocables"] == 0 and g["volver"], "un evento guardado se mira, no se toca", str(g))
    await pg.click("#lista-volver")
    await pg.wait_for_timeout(350)
    comprobar(await pg.evaluate("() => document.getElementById('lista-titulo-b').textContent") == "Grupo",
              "y se vuelve al de ahora")
    await pg.context.close()

    seccion("Comparar eventos: la misma etapa, grupo por grupo")
    pg = await banco.pagina(1366, 638, datos=d)
    await pg.wait_for_timeout(300)
    await pg.click("#lista-menu")
    await pg.wait_for_timeout(250)
    await pg.click("#eventos-menu [data-comparar]")
    await pg.wait_for_timeout(500)
    c = await pg.evaluate("""() => {
      const t = document.querySelector('.cmp');
      if (!t) return null;
      return {col: [...t.querySelectorAll('thead th')].map(x => x.textContent),
        colores: [...t.querySelectorAll('thead th.cmp-ev')].map(x => x.style.getPropertyValue('--c')),
        puntos: t.querySelectorAll('thead th.cmp-ev .cmp-punto').length,
        fil: [...t.querySelectorAll('tbody tr')].map(tr => ({
          q: tr.querySelector('.cmp-quien').textContent,
          c: [...tr.querySelectorAll('.cmp-t')].map(td => td.textContent),
          gana: tr.querySelector('.cmp-gana') ? tr.querySelector('.cmp-gana').textContent : null,
          ganaColor: tr.querySelector('.cmp-gana') ? tr.querySelector('.cmp-gana').style.getPropertyValue('--c') : null})),
        total: t.querySelector('tr.cmp-total') ? t.querySelector('tr.cmp-total').textContent.replace(/\s+/g,' ').trim() : null,
        nota: document.getElementById('cmp-nota').textContent,
        hoja: (() => { const r = document.getElementById('comparar').getBoundingClientRect(); return {x: r.x, y: r.y, r: r.right, b: r.bottom}; })(),
        pieza: (() => { const r = document.getElementById('pieza').getBoundingClientRect(); return {x: r.x, y: r.y, r: r.right, b: r.bottom}; })()};
    }""")
    if c is None:
        mal("la comparación no dibuja su tabla")
    else:
        comprobar(c["col"] == ["Etapa", "Previsto", "Grupo 1", "Grupo 2", "Grupo", "Más rápido"],
                  "una fila por etapa y una columna por evento, con lo previsto delante", " | ".join(c["col"]))
        comprobar(c["puntos"] == 3 and len(set(c["colores"])) == 3,
                  "cada evento trae a la tabla el color con el que se le conoce", " ".join(c["colores"]))
        comprobar([f["q"] for f in c["fil"][:3]] == ["Inicio", "Desarrollo", "Cierre"],
                  "las etapas, en su orden", " · ".join(f["q"] for f in c["fil"][:3]))
        comprobar(c["fil"][0]["c"] == ["10:00", "09:00", "11:00", "10:00"],
                  "cada celda es lo que duró esa etapa en ese evento", " ".join(c["fil"][0]["c"]))
        comprobar(c["fil"][0]["gana"] == "Grupo 1",
                  "la última columna no repite un número: dice quién tardó menos, por su nombre", c["fil"][0]["gana"] or "")
        comprobar(c["fil"][0]["ganaColor"] == c["colores"][0],
                  "y lo dice en el color de ese evento", f"{c['fil'][0]['ganaColor']} vs {c['colores'][0]}")
        comprobar(c["fil"][2]["gana"] == "empate" or c["fil"][2]["c"][1] != c["fil"][2]["c"][2],
                  "cuando dos tardan lo mismo no se inventa un ganador: dice empate", str(c["fil"][2]))
        comprobar(c["total"] and "45:00" in c["total"] and "44:00" in c["total"] and "48:00" in c["total"],
                  "con su fila de totales, que es la que dice quién se pasó", c["total"] or "")
        comprobar(len(c["nota"]) <= 48, f"y la explicación cabe en una línea de teléfono ({len(c['nota'])} caracteres)", c["nota"])
        comprobar(dentro(c["hoja"], c["pieza"], 2), "la hoja no se sale de la pieza")
    if capturas:
        await pg.screenshot(path=str(capturas / "comparar-eventos.png"))
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Rehacer una etapa: se elige arriba, se reinicia con el botón de siempre")
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000], actual=1, acum=1_320_000))
    await pg.wait_for_timeout(300)
    tocables = await pg.evaluate("""() => [...document.querySelectorAll('#et-lista li[data-i]')].map(l => l.classList.contains('tocable'))""")
    comprobar(tocables == [True, True, True],
              "se puede elegir cualquier etapa: elegirla es tomarla para moverla o rehacerla", str(tocables))
    rotulo = await pg.evaluate("() => document.querySelector('#reiniciar-txt .ve').textContent.trim()")
    comprobar(rotulo == "Reiniciar", "sin nada elegido, Reiniciar es del evento entero", rotulo)

    await pg.click('#et-lista li[data-i="0"]')
    await pg.wait_for_timeout(400)
    s = await pg.evaluate("""() => ({e: window.s321Cronometro.estado(),
      elegidas: [...document.querySelectorAll('#et-lista li[data-i]')].map(l => l.classList.contains('elegida')),
      rotulo: document.querySelector('#reiniciar-txt .ve').textContent.replace(/\\s+/g,' ').trim(),
      aviso: document.getElementById('aviso').hidden})""")
    comprobar(s["e"]["cortes"] == [600000] and s["e"]["actual"] == 1,
              "tocar una etapa la elige y no borra nada: nadie pierde una clase por rozar la pizarra", str(s["e"]["cortes"]))
    comprobar(s["elegidas"] == [True, False, False], "se ve cuál está elegida", str(s["elegidas"]))
    comprobar(s["rotulo"] == "Reiniciar Inicio", "y el mismo botón de Reiniciar pasa a ser el de esa etapa", s["rotulo"])
    comprobar(s["aviso"], "sin avisos que leer: el rótulo ya lo dice todo")

    await pg.click("#btn-reiniciar")
    await pg.wait_for_timeout(400)
    r = await pg.evaluate("() => window.s321Cronometro.estado()")
    comprobar(r["actual"] == 0 and r["cortes"] == [], "ahora sí: la etapa elegida empieza de nuevo de un solo toque", str(r))
    comprobar(await pg.evaluate("() => window.s321Cronometro.tiempo()") < 1000, "y el reloj vuelve a donde ella empezaba")
    comprobar(await pg.evaluate("() => document.querySelector('#reiniciar-txt .ve').textContent.trim()") == "Reiniciar",
              "hecho lo cual el botón vuelve a ser el de siempre")

    # volver a tocarla la suelta
    await pg.click('#et-lista li[data-i="0"]')
    await pg.wait_for_timeout(250)
    await pg.click('#et-lista li[data-i="0"]')
    await pg.wait_for_timeout(250)
    comprobar((await pg.evaluate("() => window.s321Cronometro.estado()"))["sel"] is None,
              "tocarla otra vez la suelta")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Mover una etapa: elegirla es tomarla")
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000], actual=1, acum=1_320_000))
    await pg.wait_for_timeout(300)
    await pg.click('#et-lista li[data-i="2"]')
    await pg.wait_for_timeout(300)
    f = await pg.evaluate("""() => ({rotulo: document.querySelector('#reiniciar-txt .ve').textContent.replace(/\\s+/g,' ').trim(),
      flechas: getComputedStyle(document.querySelector('#et-lista li.elegida .et-mover')).display,
      otras: [...document.querySelectorAll('#et-lista li[data-i]:not(.elegida) .et-mover')]
        .every(x => getComputedStyle(x).display === 'none')})""")
    comprobar(f["rotulo"] == "Reiniciar", "elegir una etapa que no ha pasado no convierte Reiniciar en suya", f["rotulo"])
    comprobar(f["flechas"] == "flex", "pero sí saca sus flechas: moverla de sitio sí se puede", f["flechas"])
    comprobar(f["otras"], "y solo las de la elegida: en las demás no estorban")

    await pg.click('#et-lista [data-subir="2"]')
    await pg.wait_for_timeout(400)
    m = await pg.evaluate("() => window.s321Cronometro.estado()")
    comprobar([x["n"] for x in m["etapas"]] == ["Inicio", "Cierre", "Desarrollo"],
              "la flecha la sube un puesto", " · ".join(x["n"] for x in m["etapas"]))
    comprobar(m["cortes"] == [600000], "y lo ya corrido sigue donde estaba", str(m["cortes"]))
    comprobar(m["sel"] == 1, "la etapa movida se queda elegida, para volver a moverla", str(m["sel"]))
    arriba = await pg.evaluate("""() => document.querySelector('#et-lista li[data-i="0"] [data-subir]').disabled""")
    abajo = await pg.evaluate("""() => document.querySelector('#et-lista li[data-i="2"] [data-bajar]').disabled""")
    comprobar(arriba and abajo, "la primera no sube más y la última no baja más")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    # sin nada elegido, Reiniciar sigue pidiendo confirmación
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000], actual=1, acum=1_320_000))
    await pg.wait_for_timeout(300)
    await pg.click("#btn-reiniciar")
    await pg.wait_for_timeout(250)
    conf = await pg.evaluate("""() => ({txt: document.querySelector('#reiniciar-txt .ve').textContent.trim(),
      cortes: window.s321Cronometro.estado().cortes})""")
    comprobar(conf["txt"] == "Toca otra vez" and conf["cortes"] == [600000],
              "reiniciar el evento entero sigue pidiendo el segundo toque", str(conf))
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()


# ── Cambiar una etapa sin salir de la lista ───────────────────────────────
async def pruebas_lista_edicion(banco: Banco, capturas: Path | None) -> None:
    seccion("Editar desde la lista: el cambio se hace donde se ve")
    pg = await banco.pagina(1366, 638, datos=estado(cortes=[600000], actual=1, acum=900000))
    await pg.wait_for_timeout(300)
    lapices = await pg.evaluate("() => document.querySelectorAll('#et-lista [data-editar]').length")
    comprobar(lapices == 3, f"cada etapa lleva su lápiz, también las ya corridas ({lapices})")

    await pg.click('#et-lista [data-editar="1"]')
    await pg.wait_for_timeout(300)
    ed = await pg.evaluate("""() => ({fila: !!document.querySelector('#et-lista li.editando'),
      n: document.getElementById('et-n-1') ? document.getElementById('et-n-1').value : null,
      min: document.getElementById('et-min-1') ? document.getElementById('et-min-1').value : null,
      seg: document.getElementById('et-seg-1') ? document.getElementById('et-seg-1').value : null,
      foco: document.activeElement.id})""")
    comprobar(ed["fila"], "la fila se abre en su sitio, sin panel que tape la lista")
    comprobar(ed["n"] == "Desarrollo" and ed["min"] == "25" and ed["seg"] == "00",
              "trae el nombre y el tiempo que ya tenía", str(ed))
    comprobar(ed["foco"] == "et-n-1", "con el cursor puesto en el nombre", ed["foco"])
    if capturas:
        await pg.screenshot(path=str(capturas / "lista-editando.png"))

    # el nombre no se queda con las sobras de la fila
    anchos = await pg.evaluate("""() => {
      const n = document.getElementById('et-n-1'), li = n.closest('li');
      return {n: n.getBoundingClientRect().width, li: li.getBoundingClientRect().width,
        toca: Math.min(...[...li.querySelectorAll('.et-accion, .campo-num, .et-campo-n')]
          .map(x => x.getBoundingClientRect().height))};
    }""")
    comprobar(anchos["n"] >= 140, f"el campo del nombre se lleva su línea entera ({round(anchos['n'])} px de {round(anchos['li'])})")
    comprobar(anchos["toca"] >= 34, f"y todo lo que se toca en la fila se toca con el dedo ({round(anchos['toca'])} px)")

    # tocar los minutos no cierra la edición
    await pg.click("#et-min-1")
    await pg.wait_for_timeout(350)
    comprobar(await pg.evaluate("() => !!document.querySelector('#et-lista li.editando')"),
              "pasar del nombre a los minutos no cierra la fila: la fila en edición es suya")
    await pg.fill("#et-min-1", "7")
    await pg.fill("#et-seg-1", "30")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(350)
    comprobar((await pg.evaluate("() => window.s321Cronometro.estado()"))["etapas"][1]["plan"] == 450000,
              "y el tiempo escrito ahí se guarda")
    await pg.click('#et-lista [data-editar="1"]')
    await pg.wait_for_timeout(250)

    await pg.fill("#et-n-1", "Trabajo en parejas")
    await pg.fill("#et-min-1", "12")
    await pg.fill("#et-seg-1", "30")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(350)
    e = await pg.evaluate("() => window.s321Cronometro.estado()")
    comprobar(e["etapas"][1]["n"] == "Trabajo en parejas", "el nombre se guarda", e["etapas"][1]["n"])
    comprobar(e["etapas"][1]["plan"] == 750000, "y el tiempo, en minutos y segundos", str(e["etapas"][1]["plan"]))
    comprobar(e["cortes"] == [600000], "sin tocar lo ya medido", str(e["cortes"]))
    cerrada = await pg.evaluate("() => document.querySelectorAll('#et-lista li.editando').length")
    comprobar(cerrada == 0, "y la fila se cierra sola")

    # Escape no guarda
    await pg.click('#et-lista [data-editar="0"]')
    await pg.wait_for_timeout(250)
    await pg.fill("#et-n-0", "Otra cosa")
    await pg.keyboard.press("Escape")
    await pg.wait_for_timeout(350)
    comprobar((await pg.evaluate("() => window.s321Cronometro.estado()"))["etapas"][0]["n"] == "Inicio",
              "Escape deja la etapa como estaba")

    # añadir desde la lista, con el evento ya empezado
    await pg.click("#et-mas-lista")
    await pg.wait_for_timeout(400)
    a = await pg.evaluate("""() => ({e: window.s321Cronometro.estado(),
      editando: !!document.querySelector('#et-lista li.editando'),
      tramos: document.querySelectorAll('#rep-pista .rep-tramo').length})""")
    comprobar(len(a["e"]["etapas"]) == 4, "el «+» de la lista añade una etapa con el reloj ya empezado", str(len(a["e"]["etapas"])))
    comprobar(a["e"]["cortes"] == [600000], "y no mueve lo que ya se midió", str(a["e"]["cortes"]))
    comprobar(a["editando"], "la deja abierta para ponerle nombre en el momento")
    comprobar(a["tramos"] == 4, f"y la barra le hace su tramo ({a['tramos']})")
    await pg.fill("#et-n-3", "Sobra tiempo")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(350)
    comprobar((await pg.evaluate("() => window.s321Cronometro.estado()"))["etapas"][3]["n"] == "Sobra tiempo",
              "con el nombre que se le acaba de escribir")

    # quitarla desde la propia fila
    await pg.click('#et-lista [data-editar="3"]')
    await pg.wait_for_timeout(250)
    await pg.click('#et-lista [data-quita="3"]')
    await pg.wait_for_timeout(400)
    comprobar(len((await pg.evaluate("() => window.s321Cronometro.estado()"))["etapas"]) == 3,
              "la papelera de la fila la quita sin ir a ningún panel")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Los campos no se rellenan solos")
    pg = await banco.pagina(1366, 638, datos=estado())
    await pg.wait_for_timeout(300)
    await pg.click('#et-lista [data-editar="1"]')
    await pg.wait_for_timeout(300)
    await pg.fill("#et-n-1", "")
    await pg.fill("#et-min-1", "")
    await pg.fill("#et-seg-1", "")
    await pg.wait_for_timeout(500)
    v = await pg.evaluate("""() => ['et-n-1','et-min-1','et-seg-1'].map(x => document.getElementById(x).value)""")
    comprobar(v == ["", "", ""], "borrar deja los campos en blanco mientras se escribe", str(v))
    await pg.fill("#et-seg-1", "1")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(400)
    e = await pg.evaluate("() => window.s321Cronometro.estado()")
    comprobar(e["etapas"][1]["plan"] == 1000, "se puede dejar una etapa en un segundo", str(e["etapas"][1]["plan"]))
    comprobar(e["etapas"][1]["n"] == "Etapa 2", "y el nombre en blanco toma el suyo al soltarlo, no antes", e["etapas"][1]["n"])
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

    seccion("Un nombre de varias palabras")
    pg = await banco.pagina(1366, 638, datos=estado())
    await pg.wait_for_timeout(300)
    await pg.click('#et-lista [data-editar="1"]')
    await pg.wait_for_timeout(300)
    await pg.keyboard.type("Trabajo en parejas por mesas")
    await pg.wait_for_timeout(250)
    v = await pg.evaluate("""() => ({valor: document.getElementById('et-n-1').value,
      sigue: !!document.querySelector('#et-lista li.editando'),
      tope: document.getElementById('et-n-1').maxLength})""")
    comprobar(v["sigue"], "el espacio es una letra más dentro del campo, no el atajo de la lista")
    comprobar(v["valor"] == "Trabajo en parejas por mesas",
              "así que el nombre puede tener varias palabras", repr(v["valor"]))
    comprobar(v["tope"] >= 32, f"con sitio de sobra ({v['tope']} caracteres)")
    await pg.keyboard.press("Enter")
    await pg.wait_for_timeout(350)
    comprobar((await pg.evaluate("() => window.s321Cronometro.estado()"))["etapas"][1]["n"] == "Trabajo en parejas por mesas",
              "y se guarda entero")
    comprobar(not pg.errores, "consola limpia", " | ".join(pg.errores[:3]))
    await pg.context.close()

# ── El tiempo no se atrasa ────────────────────────────────────────────────
def a_ms(txt: str) -> int:
    p = [int(x) for x in re.findall(r"\d+", txt)]
    return (p[0] * 60 + p[1]) * 1000 if len(p) == 2 else (p[0] * 3600 + p[1] * 60 + p[2]) * 1000


async def pruebas_deriva(banco: Banco) -> None:
    seccion("El tiempo sale del reloj del sistema")
    pg = await banco.pagina(1366, 768, datos=estado())
    await pg.keyboard.press("Space")
    t0 = time.monotonic()
    await pg.evaluate("() => { const f = performance.now() + 1500; while (performance.now() < f) {} }")
    await pg.wait_for_timeout(400)
    real = (time.monotonic() - t0) * 1000
    leido = await pg.evaluate("() => window.s321Cronometro.tiempo()")
    comprobar(abs(leido - real) < 260, f"con la página bloqueada 1.5 s, el reloj no se atrasa ({round(leido)} ms frente a {round(real)} ms)")
    pintado = a_ms(await pg.evaluate("() => document.getElementById('cifra').textContent"))
    comprobar(abs(pintado - leido) < 1200, "y la cifra dice lo mismo que el reloj")
    await pg.context.close()


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
        ("empezada", {"datos": estado(cortes=[600000], actual=1, acum=900000)}, None),
        ("vacío", {"datos": estado(nombre="", acum=0)}, None),
        ("con los ajustes abiertos", {"datos": estado()}, "#btn-ajustes"),
        ("etapa pasada", {"datos": estado(acum=640000)}, None),
        ("pantalla completa", {"datos": estado(cortes=[600000], actual=1, acum=900000)}, "tecla:p"),
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

async def hacer_vista(banco: Banco) -> None:
    seccion("La vista de la tarjeta (vista.webp)")
    w = 1280
    pg = await banco.pagina(w, 940, datos=estado(cortes=[708000], actual=1, acum=708000 + 612000 - 1600, corriendo=True), reloj_falso=True, esperar=False, escala=2)
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
    datos = await pg.evaluate("() => [document.getElementById('cifra').textContent, document.getElementById('estado-txt').textContent, document.getElementById('rep-der').textContent, document.getElementById('dinamica').value, document.getElementById('rep-previsto').textContent]")
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
    comprobar(datos[1] == "En marcha" and datos[3] == "Fracciones equivalentes"
              and re.fullmatch(r"\d{1,3}:\d{2}", datos[2]) and "45:00" in datos[4] and datos[0].startswith("10:"),
              "la vista muestra los datos de muestra", str(datos))
    comprobar(im.size == (1280, 800) and destino.stat().st_size < 150_000,
              f"vista.webp de {im.size[0]} × {im.size[1]} y {destino.stat().st_size / 1000:.1f} KB (calidad {calidad})")


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
            await pruebas_encaje(banco, capturas)
            await pruebas_etapas(banco, capturas)
            await pruebas_estandar(banco, capturas)
            await pruebas_pantalla_completa(banco, capturas)
            await pruebas_reparto(banco, capturas)
            await pruebas_eventos(banco, capturas)
            await pruebas_lista_edicion(banco, capturas)
            await pruebas_deriva(banco)
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
