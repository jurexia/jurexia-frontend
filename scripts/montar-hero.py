#!/usr/bin/env python3
"""
Monta el vídeo del hero: seis planos con fundidos cruzados y bucle cerrado.

UNA SOLA PASADA de ffmpeg. La versión anterior cortaba cada plano a un archivo
intermedio y luego los encadenaba: ocho codificaciones de 1080p en vez de una,
y con preset veryslow llegó a colgarse 23 minutos sin avanzar. Así tarda ~12 s.

El grafo de filtros se escribe a un archivo y se pasa con
`-filter_complex_script`: construirlo en la línea de comandos hacía que el
shell lo destrozara («No such filter: ''»).

LA SALA DE JUNTAS. Las dos primeras generaciones traían el escudo nacional
DEFORMADO y obligaban a recortar el plano a 3.5 s. La tercera («Bandera
correcta deliveracion», 5-ago-2026) la verificó David en persona y va completa.
Si algún día se regenera, revisar el escudo fotograma a fotograma ANTES de
montar: su uso lo regula la Ley sobre el Escudo, la Bandera y el Himno
Nacionales, y uno deforme en material comercial es exposición real.

El plano del portátil va ESPEJADO: la abogada está a la izquierda, justo donde
cae el titular «El ejercicio, perfeccionado».

El bucle se cierra fundiendo el final sobre una repetición del arranque, así
que el primer y el último fotograma son el mismo plano y no hay parpadeo.
"""
import os, pathlib, subprocess, sys, time

FF = os.environ.get("FFMPEG", "ffmpeg")
D = os.environ.get("VIDEOS", os.path.expanduser("~/Documents/IUREXIA-MAC/Videos home"))
SAL = pathlib.Path(__file__).resolve().parents[1] / "public" / "hero"

L, X = 7.4, 0.7          # duración de cada plano y del fundido cruzado

CLIPS = [  # (archivo, inicio, duración, espejar)
    ("Woman_lawyer_thinking_at_window_202608030450",   0.5, L, False),
    ("Mexican_woman_lawyer_working_laptop_202608030444", 0.3, L, True),
    ("Bandera correcta deliveracion",                  0.3, L, False),
    ("Lawyer_reading_document_in_office_202608050433",  0.3, L, False),
    ("Lawyer_looking_out_office_window_202608050613",   0.3, L, False),
    ("Man_walking_down_aisle_202608030455",             0.3, L, False),
    ("Woman_lawyer_thinking_at_window_202608030450",    0.5, X, False),  # cola
]

NORM = ("scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
        "fps=24,setpts=PTS-STARTPTS,format=yuv420p")

def main():
    nodos = [f"[{i}:v]{NORM}{',hflip' if flip else ''}[n{i}]"
             for i, (_, _, _, flip) in enumerate(CLIPS)]
    off, prev = L - X, "n0"
    for i in range(1, len(CLIPS)):
        sal = "v" if i == len(CLIPS) - 1 else f"x{i}"
        nodos.append(f"[{prev}][n{i}]xfade=transition=fade:duration={X}:offset={off:.1f}[{sal}]")
        prev, off = sal, off + L - X

    filtro = pathlib.Path("/tmp/hero_filtro.txt")
    filtro.write_text(";".join(nodos))

    args = [FF, "-hide_banner", "-loglevel", "error", "-y"]
    for f, ss, t, _ in CLIPS:
        args += ["-ss", str(ss), "-t", str(t), "-i", f"{D}/{f}.mp4"]
    args += ["-filter_complex_script", str(filtro), "-map", "[v]", "-an",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
             "-movflags", "+faststart", str(SAL / "hero.mp4")]

    t0 = time.time()
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-2000:])

    # El póster se saca del primer fotograma del vídeo recién montado, para que
    # casen exactamente y no haya salto al arrancar la reproducción.
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(SAL / "hero.mp4"), "-frames:v", "1", "-q:v", "80",
                    str(SAL / "hero-poster.webp")], check=True)

    kb = (SAL / "hero.mp4").stat().st_size // 1024
    print(f"listo en {time.time()-t0:.1f}s — {kb} KB")

if __name__ == "__main__":
    main()
