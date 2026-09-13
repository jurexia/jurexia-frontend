# -*- coding: utf-8 -*-
"""LAS TRES ESCALAS DEL TALLER, Y POR QUÉ HAY QUE VIGILARLAS.

Una interfaz no se ve anticuada por los colores: se ve anticuada cuando no hay
escalas y cada sitio elige su valor. Medido el 13-sep-2026, antes de arreglarlo:

  · 323 clases de color de texto repartidas en TRECE opacidades distintas
  · once tamaños de letra, cuatro de ellos con MEDIO píxel (9.5, 10.5, 11.5, 12.5)
  · seis radios de esquina
  · once opacidades de borde, con duplicados exactos (0.1 y 0.10)

Un medio píxel no es una decisión de diseño: es lo que sale de empujar un texto
para que quepa. Y trece grises no son una jerarquía, son ruido.

Este guardián fija las escalas que quedaron. Si hace falta un valor nuevo, se
añade AQUÍ a propósito —y entonces es una decisión— en vez de colarse suelto.
"""
import os, re, sys, collections

RAICES = ("src/app/taller", "src/components/sentencia")

# Tailwind sólo genera los modificadores de opacidad múltiplos de 5. Un valor
# fuera de la escala no da error: la clase no se genera, el elemento se queda
# sin esa propiedad y hereda. Pasó con text-white/46 y con border-white/12,
# que dejó cinco botones sin borde durante semanas.
OPACIDAD_TAILWIND = {n for n in range(0, 101, 5)}
RX_OPACIDAD = re.compile(
    r'\b(?:text|bg|border|ring|fill|stroke|shadow|divide|outline|'
    r'decoration|placeholder|from|via|to)-[a-z-]+(?:-\d{2,3})?/(\d+)\b')

TIPO = {10, 12, 13, 14, 16}          # cinco peldaños, sin medios píxeles
RX_TIPO = re.compile(r'text-\[([0-9.]+)px\]')

RADIO = {"rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full", "rounded-none"}
RX_RADIO = re.compile(r'\brounded-[a-z0-9]+\b')

fallos = []
for raiz in RAICES:
    for d, _, fs in os.walk(raiz):
        for f in fs:
            if not f.endswith((".tsx", ".ts")):
                continue
            p = os.path.join(d, f)
            with open(p, encoding="utf-8") as fh:
                for i, ln in enumerate(fh, 1):
                    for n in RX_OPACIDAD.findall(ln):
                        if int(n) not in OPACIDAD_TAILWIND:
                            fallos.append((p, i, f"/{n}", "Tailwind no genera esta opacidad; "
                                           "usa un múltiplo de 5 o la forma /[0.46]"))
                    for v in RX_TIPO.findall(ln):
                        if float(v) not in TIPO:
                            fallos.append((p, i, f"text-[{v}px]",
                                           f"fuera de la escala {sorted(TIPO)}"))
                    for r in RX_RADIO.findall(ln):
                        if r not in RADIO:
                            fallos.append((p, i, r, f"fuera de la escala {sorted(RADIO)}"))

if fallos:
    print(f"FALLO · {len(fallos)} valor(es) fuera de escala:\n")
    for p, i, q, por in fallos[:25]:
        print(f"  {p}:{i}  {q}")
        print(f"      {por}")
    sys.exit(1)
print("OK · las tres escalas del taller están cerradas "
      f"(tipografía {sorted(TIPO)}, radios {len(RADIO)}, opacidades múltiplos de 5)")
