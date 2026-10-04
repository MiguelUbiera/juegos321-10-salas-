#!/usr/bin/env python3
"""Construye el Cronómetro Carrera de equipos con el molde de la casa.

    python construir.py
    python construir.py --habilidad=RUTA\\recursos\\favicon.svg

Todo el trabajo está en ..\\_comun\\molde.py. Aquí solo se dice qué carpeta.
"""
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent / "_comun"))
import molde  # noqa: E402

# el resto del taller llama a construir.main(); que siga funcionando
main = molde.main
SALIDA = molde.SALIDA
molde.fijar(AQUI)

if __name__ == "__main__":
    sys.exit(molde.desde_linea(AQUI))
