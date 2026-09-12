# -*- coding: utf-8 -*-
"""Ningún trozo de pantalla puede colgar de un estado que no se fija nunca.

EL FALLO QUE VIENE A IMPEDIR, encontrado conduciendo el ADR 93/2026 en
producción: la tarjeta del estudio viéndose escribir —el texto en directo, las
palabras contadas, el cursor— estaba condicionada a `paso === 'criterio'`, y
`setPaso` sólo se llama con 'ficha', 'adelanto', 'acervo' y 'proyecto'. La
condición era imposible de cumplir. El panel entero era código muerto y la
pantalla se quedaba muda los dos a cuatro minutos que tarda la redacción, que
es la espera más larga de la herramienta.

Nada falla cuando esto pasa: no hay excepción, no hay aviso en la consola, el
tipo cuadra —'criterio' SÍ está en la unión `Paso`— y la compilación pasa. Sólo
falta una tarjeta que nadie echa de menos porque nunca la vio.

    python3 comprobaciones/pasos_alcanzables.py
"""
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVOS = ["src/app/taller/page.tsx"]

# `setPaso('acervo')` y también `setPaso((p) => 'acervo')`, por si acaso.
RX_FIJA = re.compile(r"setPaso\s*\(\s*(?:\([^)]*\)\s*=>\s*)?'([a-z_]+)'")
# `paso === 'criterio'`, `paso !== 'ficha'`, y el orden inverso.
RX_COMPARA = re.compile(r"paso\s*[!=]==\s*'([a-z_]+)'|'([a-z_]+)'\s*[!=]==\s*paso")

fallos = []
for rel in ARCHIVOS:
    ruta = os.path.join(RAIZ, rel)
    if not os.path.exists(ruta):
        fallos.append(f"{rel}: no existe; ¿se renombró la pantalla?")
        continue
    src = io.open(ruta, encoding="utf-8").read()
    # LOS COMENTARIOS NO SON CÓDIGO. Este mismo archivo explica el fallo
    # citándolo —«estaba condicionada a `paso === 'criterio'`»— y sin quitar la
    # prosa el detector se acusaba a sí mismo. Una comprobación que señala a la
    # documentación del arreglo enseña a no hacerle caso.
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"^\s*//.*$", "", src, flags=re.M)
    fijados = set(RX_FIJA.findall(src))
    # El inicial del useState también cuenta como alcanzable.
    ini = re.search(r"useState<Paso>\('([a-z_]+)'\)", src)
    if ini:
        fijados.add(ini.group(1))
    comparados = {a or b for a, b in RX_COMPARA.findall(src)}
    if not fijados:
        fallos.append(f"{rel}: no se encontró ningún setPaso; el detector "
                      f"quedó ciego y hay que arreglarlo, no ignorarlo")
        continue
    for p in sorted(comparados - fijados):
        n = len(re.findall(r"paso\s*[!=]==\s*'%s'" % re.escape(p), src))
        fallos.append(
            f"{rel}: se compara «paso === '{p}'» en {n} sitio(s) y ese paso "
            f"NUNCA se fija. Lo que cuelgue de esa condición no se pinta jamás.")

if fallos:
    print("\n".join("  ✗ " + f for f in fallos))
    sys.exit(1)
print("OK · todos los pasos comparados se fijan en algún sitio")
