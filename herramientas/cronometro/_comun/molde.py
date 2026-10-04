#!/usr/bin/env python3
"""El molde de la casa: ensambla el index.html y la tarjeta de un cronómetro.

Cada cronómetro tiene un construir.py de tres líneas que llama aquí con su
carpeta. Lo común (casa.css, iconos.svg, la carta) sale de _comun/; lo suyo,
de su fuente/.

    python construir.py
    python construir.py --habilidad=RUTA\recursos\favicon.svg

Copia el isotipo desde la habilidad, limpia los SVG de firmas recogidas al
viajar y junta casa.css + fuente/propio.css, fuente/cuerpo.html y
fuente/propio.js en un solo index.html: el CSS en su <style>, el JS en su
<script>, y la carga, los íconos de interfaz y el ícono del cronómetro en
línea. Después arma tarjeta.html con la ficha. No hace nada más.

index.html y tarjeta.html son producto: no se retocan a mano. Si algo está
mal, se corrige en _comun/ o en fuente/ y se vuelve a construir.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

CASA = Path(__file__).resolve().parent            # _comun/
AQUI = CASA                                        # la fija cada cronómetro
FUENTE = CASA
SALIDA = CASA
FAVICON = CASA
HABILIDAD = CASA


def fijar(carpeta: Path) -> None:
    """Apunta el molde a la carpeta de un cronómetro."""
    global AQUI, FUENTE, SALIDA, FAVICON, HABILIDAD
    AQUI = carpeta.resolve()
    FUENTE = AQUI / "fuente"
    SALIDA = AQUI / "index.html"
    FAVICON = AQUI / "favicon.svg"
    # el isotipo viaja con la habilidad y se copia byte a byte (marca.md §3)
    HABILIDAD = AQUI.parents[2] / "Habilidad" / "secuencia321-generator" / "recursos" / "favicon.svg"

# Las mismas familias y la misma dirección que la portada del sitio: si el
# navegador ya las trae de allí, no las vuelve a pedir.
FUENTES = ("https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700"
           "&family=Nunito:wght@400;600;700;800&family=Source+Code+Pro:wght@400;600;700&display=swap")

PLANTILLA = """<!DOCTYPE html>
<html lang="es">
<!-- Secuencia321 · @@NOMBRE@@ · v@@VERSION@@
     Producto: sale de fuente/ con construir.py. No se retoca a mano. -->
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>@@NOMBRE@@ · Secuencia321</title>
<meta name="description" content="@@DESCRIPCION@@">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#173f50">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link id="fuentes" rel="stylesheet" href="@@FUENTES@@" media="print" onload="this.media='all';this.dataset.lista='1'" onerror="this.dataset.lista='1'">
<noscript><link rel="stylesheet" href="@@FUENTES@@"><style>.carga{display:none!important}html:not(.fuentes-ok) .marca-txt{opacity:1!important;animation:none!important}</style></noscript>
<style>
@@CSS@@
</style>
</head>
<body>
@@CUERPO@@
<script>
@@JS@@
</script>
</body>
</html>
"""


def leer(ruta: Path) -> str:
    return ruta.read_text(encoding="utf-8").replace("\r\n", "\n")


def sin_firmas(s: str) -> str:
    """Quita la firma de procedencia que los archivos de imagen recogen al viajar.

    Un SVG que pasa por el chat vuelve con un bloque <metadata> de varios miles
    de caracteres. No estorba al dibujo, pero engorda el archivo y rompe la
    comparación byte a byte del isotipo.
    """
    s = re.sub(r"<metadata>.*?</metadata>", "", s, flags=re.S)
    s = re.sub(r'\s+xmlns:c2pa="[^"]*"', "", s)
    return re.sub(r"\n[ \t]*\n+", "\n", s)


def limpiar(ruta: Path) -> str:
    s = leer(ruta)
    limpio = sin_firmas(s)
    if limpio == s:
        return ""
    ruta.write_text(limpio, encoding="utf-8", newline="\n")
    return f"{ruta.name}: se le quitó la firma que recogió al viajar"


def poner_favicon(habilidad: Path) -> str:
    """Los dos gestos de la marca: copiar el isotipo y enlazarlo."""
    if not habilidad.exists():
        return f"AVISO: no se encontró el isotipo de la habilidad en {habilidad}; favicon.svg queda como está"
    datos = habilidad.read_bytes()
    if FAVICON.exists() and FAVICON.read_bytes() == datos:
        return "favicon.svg: ya es el de la habilidad"
    FAVICON.write_bytes(datos)
    return f"favicon.svg: copiado byte a byte de la habilidad ({len(datos)} bytes)"


def svg_en_linea(ruta: Path, *, decorativo: bool) -> str:
    s = sin_firmas(leer(ruta))
    s = re.sub(r"<\?xml.*?\?>", "", s, flags=re.S)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    if decorativo:
        s = re.sub(r'\s+role="img"', "", s)
        s = re.sub(r'\s+aria-label="[^"]*"', "", s)
        s = s.replace("<svg ", '<svg aria-hidden="true" focusable="false" ', 1)
    s = re.sub(r">\s+<", "><", s.strip())
    return s


def escapar(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def negrita(t: str) -> str:
    """`**…**` es la única negrita de estos textos (la misma regla de la tarjeta)."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escapar(t))


def panel_info(f: dict) -> str:
    """La información de la herramienta sale de ficha.json: una sola fuente
    para lo que dice la tarjeta del panel y lo que dice la herramienta."""
    ante = (f.get("antetitulo") or "").strip()
    piezas = []
    if ante:
        piezas.append(f'<h2 class="info-titulo" id="info-titulo">{escapar(ante[:1].upper() + ante[1:])}</h2>')
    for rotulo, clave in (("Para qué", "para_que"), ("Cómo funciona", "como_funciona")):
        if f.get(clave):
            piezas.append(f'<div class="info-bloque"><p class="rotulo">{rotulo}</p><p>{negrita(f[clave])}</p></div>')
    ideas = f.get("ideas") or []
    if ideas:
        li = "".join(f"<li>{negrita(i)}</li>" for i in ideas)
        piezas.append(f'<div class="info-bloque"><p class="rotulo">Ideas para la clase</p><ul class="info-ideas">{li}</ul></div>')
    # Aprendizajes: términos sueltos para reconocer, no consejos para leer —
    # por eso van en una fila de etiquetas (`.info-aprende`), no en una lista
    # con viñeta. Por ahora solo lo usa Bloques; en los demás, `aprendizajes`
    # no está en la ficha y este bloque no aparece.
    aprendizajes = f.get("aprendizajes") or []
    if aprendizajes:
        li = "".join(f"<li>{escapar(str(a))}</li>" for a in aprendizajes)
        piezas.append(f'<div class="info-bloque"><p class="rotulo">Aprendizajes relacionados</p><ul class="info-aprende">{li}</ul></div>')
    return "\n            ".join(piezas)


TARJETA = """<!DOCTYPE html>
<html lang="es">
<!-- Secuencia321 · @@NOMBRE@@ · la tarjeta compacta · v@@VERSION@@
     Producto: sale de fuente/tarjeta.html, fuente/tarjeta.css y ficha.json
     con construir.py. No se retoca a mano. -->
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@@NOMBRE@@ · tarjeta</title>
<meta name="color-scheme" content="light">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="@@FUENTES@@">
<style>
@@CSS@@
</style>
</head>
<body>
@@CARTA@@
</body>
</html>
"""


def hacer_tarjeta(ficha: dict) -> int:
    """La versión compacta: lo que el panel coloca en su carrusel."""
    carta = leer(CASA / "tarjeta.html").strip()
    if carta.count("<!-- ICONO -->") != 1:
        print("Falta o sobra la marca <!-- ICONO --> en fuente/tarjeta.html", file=sys.stderr)
        return 1
    carta = carta.replace("<!-- ICONO -->", svg_en_linea(AQUI / "icono.svg", decorativo=True))
    # tres claves y no más: en el carrusel la carta se lee de un vistazo
    claves = "".join(f"<li>{escapar(str(c))}</li>" for c in (ficha.get("incluye") or [])[:3])
    ante = (ficha.get("antetitulo") or "").strip()
    for marca, valor in (("@@ID@@", escapar(str(ficha.get("id", "")))),
                         ("@@ANTETITULO@@", escapar(ante[:1].upper() + ante[1:])),
                         ("@@NOMBRE@@", escapar(str(ficha.get("nombre", "")))),
                         ("@@LEMA@@", escapar(str(ficha.get("lema", "")))),
                         ("@@CLAVES@@", claves),
                         ("@@ABRIR@@", escapar(str(ficha.get("abrir", "index.html"))))):
        carta = carta.replace(marca, valor)
    html = TARJETA
    for marca, valor in (("@@VERSION@@", version()), ("@@FUENTES@@", FUENTES.replace("&", "&amp;")),
                         ("@@NOMBRE@@", escapar(str(ficha.get("nombre", "")))),
                         ("@@CSS@@", leer(CASA / "tarjeta.css").strip()), ("@@CARTA@@", carta)):
        html = html.replace(marca, valor)
    (AQUI / "tarjeta.html").write_text(html, encoding="utf-8", newline="\n")
    print(f"tarjeta.html construida: {len(html.encode('utf-8')):,} bytes")
    return 0


def version() -> str:
    ficha = AQUI / "ficha.json"
    if ficha.exists():
        m = re.search(r'"version"\s*:\s*"([^"]+)"', leer(ficha))
        if m:
            return m.group(1)
    return "0"


def main(habilidad: Path | None = None, *, mantenimiento: bool = True) -> int:
    # el mantenimiento se salta cuando quien llama solo quiere comparar el HTML
    if mantenimiento:
        for aviso in (poner_favicon(habilidad or HABILIDAD), limpiar(AQUI / "icono.svg"), limpiar(CASA / "iconos.svg")):
            if aviso:
                print(aviso)

    ficha = json.loads(leer(AQUI / "ficha.json"))
    css = leer(CASA / "casa.css").strip() + "\n\n" + leer(FUENTE / "propio.css").strip()
    js = leer(FUENTE / "propio.js").strip()
    cuerpo = leer(FUENTE / "cuerpo.html").strip()

    for marca in ("<!-- ICONOS -->", "<!-- ICONO -->", "<!-- INFO -->"):
        if cuerpo.count(marca) != 1:
            print(f"Falta o sobra la marca {marca} en fuente/cuerpo.html", file=sys.stderr)
            return 1
    cuerpo = cuerpo.replace("<!-- ICONOS -->", svg_en_linea(CASA / "iconos.svg", decorativo=False))
    cuerpo = cuerpo.replace("<!-- ICONO -->", svg_en_linea(AQUI / "icono.svg", decorativo=True))
    cuerpo = cuerpo.replace("<!-- INFO -->", panel_info(ficha))

    if "</script" in js.lower().replace("<\\/script", ""):
        print("El guion no puede contener la cadena </script>", file=sys.stderr)
        return 1

    html = PLANTILLA
    desc = f"{ficha.get('nombre','')} de Secuencia321: {ficha.get('lema','')} {ficha.get('para_que','')}".strip()
    for marca, valor in (("@@VERSION@@", version()), ("@@FUENTES@@", FUENTES.replace("&", "&amp;")),
                         ("@@NOMBRE@@", escapar(str(ficha.get("nombre", "")))),
                         ("@@DESCRIPCION@@", escapar(desc)[:300]),
                         ("@@CSS@@", css), ("@@CUERPO@@", cuerpo), ("@@JS@@", js)):
        html = html.replace(marca, valor)
    SALIDA.write_text(html, encoding="utf-8", newline="\n")
    print(f"index.html construido: {len(html.encode('utf-8')):,} bytes")
    return hacer_tarjeta(ficha)


def desde_linea(carpeta: Path) -> int:
    """Lo que llama el construir.py de cada cronómetro."""
    fijar(carpeta)
    argumento = None
    for a in sys.argv[1:]:
        if a.startswith("--habilidad="):
            argumento = Path(a.split("=", 1)[1])
    return main(argumento)
