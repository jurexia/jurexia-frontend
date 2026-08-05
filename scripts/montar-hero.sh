#!/bin/bash
# Monta el vídeo del hero: cinco planos con fundidos cruzados y bucle cerrado.
#
# CUIDADO CON LA SALA DE JUNTAS. Las dos generaciones de ese plano metieron una
# bandera de México con el ESCUDO NACIONAL DEFORMADO. En el clip que usamos
# (…0520) aparece a partir del segundo ~5, así que sólo se toman 0.2–3.7 s.
# No es capricho estético: el uso del escudo está regulado por la Ley sobre el
# Escudo, la Bandera y el Himno Nacionales, y un escudo distorsionado en
# material comercial de una plataforma jurídica es exposición real.
#
# El plano del portátil va ESPEJADO: la abogada está a la izquierda, justo
# donde cae el titular «El ejercicio, perfeccionado».
#
# El bucle se cierra fundiendo el final sobre una repetición del arranque, así
# que el primer y el último fotograma son el mismo plano y no hay parpadeo.
set -e

FF="$(cat /tmp/ffpath)"
D="/Users/josedavidalcantarmendoza/Documents/IUREXIA-MAC/Videos home"
S="/private/tmp/claude-501/-Users-josedavidalcantarmendoza-Documents-Viaje-a-Europa/15e6f45f-8b41-4f02-b054-c9890fac2e53/scratchpad"
OUT="$S/hero5"
mkdir -p "$OUT"

X=0.7        # duración del fundido cruzado
NORM="scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,format=yuv420p"

corta () {  # $1 fuente  $2 inicio  $3 duración  $4 salida  $5 filtro extra
    local extra="${5:+,$5}"
    "$FF" -hide_banner -loglevel error -y -ss "$2" -t "$3" -i "$D/$1.mp4" \
        -an -vf "${NORM}${extra}" -c:v libx264 -preset slow -crf 20 "$OUT/$4"
}

echo "1/6  recortando planos…"
# 1 ventana — abre y cierra el bucle
corta Woman_lawyer_thinking_at_window_202608030450   0.6 4.0 p1.mp4
# 2 portátil — espejado, la abogada estaba donde va el titular
corta Mexican_woman_lawyer_working_laptop_202608030444 0.4 4.0 p2.mp4 hflip
# 3 sala de juntas — VENTANA SEGURA, la bandera entra después
corta Mexican_lawyers_in_meeting_room_202608030520   0.2 3.5 p3.mp4
# 4 lectura en despacho — el plano nuevo (5-ago-2026)
corta Lawyer_reading_document_in_office_202608050433 0.5 4.0 p4.mp4
# 5 archivo — el andar cierra antes de volver a la ventana
corta Man_walking_down_aisle_202608030455            0.5 4.0 p5.mp4
# cola: los primeros 0.7 s del plano 1, para cerrar el bucle sobre sí mismo
corta Woman_lawyer_thinking_at_window_202608030450   0.6 "$X" cola.mp4

echo "2/6  encadenando con fundidos de ${X}s…"
# Los desplazamientos se acumulan: cada fundido empieza X segundos antes del
# final del tramo ya montado.
o1=$(echo "4.0 - $X"        | bc)   # 3.3
o2=$(echo "$o1 + 4.0 - $X"  | bc)   # 6.6
o3=$(echo "$o2 + 3.5 - $X"  | bc)   # 9.4
o4=$(echo "$o3 + 4.0 - $X"  | bc)   # 12.7
o5=$(echo "$o4 + 4.0 - $X"  | bc)   # 16.0

"$FF" -hide_banner -loglevel error -y \
    -i "$OUT/p1.mp4" -i "$OUT/p2.mp4" -i "$OUT/p3.mp4" \
    -i "$OUT/p4.mp4" -i "$OUT/p5.mp4" -i "$OUT/cola.mp4" \
    -filter_complex "\
[0][1]xfade=transition=fade:duration=$X:offset=$o1[a];\
[a][2]xfade=transition=fade:duration=$X:offset=$o2[b];\
[b][3]xfade=transition=fade:duration=$X:offset=$o3[c];\
[c][4]xfade=transition=fade:duration=$X:offset=$o4[d];\
[d][5]xfade=transition=fade:duration=$X:offset=$o5,format=yuv420p[v]" \
    -map "[v]" -an -c:v libx264 -preset veryslow -crf 31 \
    -movflags +faststart -pix_fmt yuv420p "$OUT/hero.mp4"

echo "3/6  resultado:"
"$FF" -hide_banner -i "$OUT/hero.mp4" 2>&1 | grep -E "Duration|Stream #" | sed 's/^ */     /'
printf "     peso: %s KB\n" "$(( $(stat -f%z "$OUT/hero.mp4") / 1024 ))"
