# -*- coding: utf-8 -*-
"""UNA OPACIDAD QUE NO EXISTE NO PINTA NADA, Y NO AVISA.

Tailwind sólo genera los modificadores de opacidad de su escala —múltiplos de
5—. Si se escribe `text-white/46`, la clase no se genera: el elemento se queda
sin color y hereda el del padre. No hay error de compilación, no hay aviso en
consola, y en una pantalla oscura el texto puede acabar blanco puro o invisible
según de quién herede.

Se descubrió colapsando los trece grises del taller a una escala de cuatro: 209
de las 320 clases reescritas apuntaban a /46 y /78, y el CSS compilado no tenía
ninguna de las dos. El navegador no lo dice; sólo lo dice el CSS generado.
"""
import os, re, sys

RAICES = ("src/app/taller", "src/components/sentencia")
# Los modificadores de opacidad de Tailwind: 0..100 de 5 en 5.
VALE = {n for n in range(0, 101, 5)}
# `border-white/[0.07]` y demás valores arbitrarios entre corchetes sí valen:
# Tailwind los genera tal cual. Aquí sólo se miran los numéricos sueltos.
RX = re.compile(r'\b(?:text|bg|border|ring|fill|stroke|shadow|divide|outline|'
                r'decoration|placeholder|from|via|to)-'
                r'[a-z-]+(?:-\d{2,3})?/(\d+)\b')

malas = []
for raiz in RAICES:
    for d, _, fs in os.walk(raiz):
        for f in fs:
            if not f.endswith((".tsx", ".ts")):
                continue
            p = os.path.join(d, f)
            with open(p, encoding="utf-8") as fh:
                for i, linea in enumerate(fh, 1):
                    for n in RX.findall(linea):
                        if int(n) not in VALE:
                            malas.append((p, i, n, linea.strip()[:90]))

if malas:
    print(f"FALLO · {len(malas)} opacidad(es) que Tailwind no genera:\n")
    for p, i, n, txt in malas[:20]:
        print(f"  {p}:{i} → /{n}")
        print(f"      {txt}")
    print("\nUsa un múltiplo de 5, o un valor arbitrario entre corchetes: /[0.46]")
    sys.exit(1)
print("OK · todas las opacidades están en la escala que Tailwind genera")
