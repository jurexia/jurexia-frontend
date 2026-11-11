"""
Imágenes de los correos «noche» (11-nov-2026).

David, al ver las cartas en Promociones: «que se vea un negro bonito como el
del canal por dentro y el logo por fuera resplandeciente, negro totalmente el
fondo del correo… y si hablamos de buen fin, pues hay que poner la imagen del
buen fin».

Genera, en `public/correo/`:
  · iurexia-resplandor.png   el wordmark con halo dorado, sobre negro puro
  · buen-fin-2026.jpg        portada del Buen Fin (hoja oficial 2026 + el 30 %)
  · buen-fin-2026-ultimo.jpg la misma portada para el último día
  · iurexia-vs-chatgpt.jpg   portada de `posicion`: un año de Pro contra un mes de ChatGPT Pro

Las cifras de las portadas están ESCRITAS EN LA IMAGEN: si cambian los precios
de PLANS o de ChatGPT (`src/lib/comparativa.ts`), se cambian aquí abajo y se
vuelve a correr. Todo a 2x (1200 px de ancho para pintarse a 600).

    python3 scripts/correo-noche/generar.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ── Cifras (mantener al día con PLANS y comparativa.ts) ─────────────────────
PRO_ANUAL = 1490            # PLANS.pro_annual
PRO_ANUAL_BUEN_FIN = 1043   # cuenta('pro').anualBuenFin (30 % sobre 1,490)
CHATGPT_PRO_DESDE = 1989    # CHATGPT.proDesde, App Store de México, 11-nov-2026
FECHA_PRECIOS_CHATGPT = '11 de noviembre de 2026'

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / 'public' / 'correo'
AQUI = Path(__file__).resolve().parent

FUENTES = Path('/System/Library/Fonts/Supplemental')
GEORGIA = str(FUENTES / 'Georgia.ttf')
GEORGIA_B = str(FUENTES / 'Georgia Bold.ttf')
ARIAL_B = str(FUENTES / 'Arial Bold.ttf')
ARIAL = str(FUENTES / 'Arial.ttf')

# Paleta del canal (reference_youtube_iurexia): fondo #0f0e0d, crema, oro.
NEGRO = (0, 0, 0)
NOCHE = (15, 14, 13)
CREMA = (253, 251, 247)
ORO = (201, 169, 98)
ORO_CLARO = (236, 214, 152)
ORO_OSCURO = (168, 128, 60)


def fuente(ruta: str, tam: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(ruta, tam)


def degradado_vertical(ancho: int, alto: int, arriba, abajo) -> Image.Image:
    t = np.linspace(0, 1, alto)[:, None, None]
    a = np.array(arriba, dtype=float)[None, None, :]
    b = np.array(abajo, dtype=float)[None, None, :]
    arr = (a * (1 - t) + b * t).repeat(ancho, axis=1)
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def luz_radial(ancho: int, alto: int, cx: float, cy: float, rx: float, ry: float, color, fuerza: float) -> np.ndarray:
    """Capa aditiva: una luz cálida que se apaga hacia afuera (como el banner del canal)."""
    y, x = np.mgrid[0:alto, 0:ancho]
    d = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    k = np.clip(1 - d, 0, 1) ** 2 * fuerza
    return k[:, :, None] * np.array(color, dtype=float)[None, None, :]


def ventana_bordes(ancho: int, alto: int, margen: int = 90) -> np.ndarray:
    """1 en el centro y 0 en el borde: la luz se apaga antes de llegar al corte de la imagen."""
    def eje(n):
        t = np.clip(np.minimum(np.arange(n), n - 1 - np.arange(n)) / margen, 0, 1)
        return t * t * (3 - 2 * t)
    return eje(alto)[:, None] * eje(ancho)[None, :]


def fondo_noche(ancho: int, alto: int, base, luces) -> Image.Image:
    luz = np.zeros((alto, ancho, 3), dtype=float)
    for (cx, cy, rx, ry, color, fuerza) in luces:
        luz += luz_radial(ancho, alto, cx, cy, rx, ry, color, fuerza)
    arr = np.array(base, dtype=float) + luz * ventana_bordes(ancho, alto)[:, :, None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def halo(capa: Image.Image, radio: float, color, opacidad: float) -> Image.Image:
    """Resplandor: el alfa de `capa` desenfocado y teñido, listo para pegar debajo."""
    a = capa.split()[3].filter(ImageFilter.GaussianBlur(radio))
    a = a.point(lambda v: int(v * opacidad))
    h = Image.new('RGBA', capa.size, color + (0,))
    h.putalpha(a)
    return h


def texto_capa(lienzo_tam, xy, texto, f, relleno=None, degradado=None, espaciado=0, ancla='la') -> Image.Image:
    """Texto en una capa RGBA. Con `degradado` (arriba, abajo) el relleno es un oro en degradado."""
    capa = Image.new('RGBA', lienzo_tam, (0, 0, 0, 0))
    mascara = Image.new('L', lienzo_tam, 0)
    d = ImageDraw.Draw(mascara)
    if espaciado:
        x, y = xy
        ancho_total = sum(d.textlength(c, font=f) for c in texto) + espaciado * (len(texto) - 1)
        if ancla[0] == 'm':
            x -= ancho_total / 2
        elif ancla[0] == 'r':
            x -= ancho_total
        # Letra por letra con ancla en la línea de ascendentes («a»): con «t»
        # cada glifo se alinea por su propia tinta y el «·» sube.
        for c in texto:
            d.text((x, y), c, font=f, fill=255, anchor='la')
            x += d.textlength(c, font=f) + espaciado
    else:
        d.text(xy, texto, font=f, fill=255, anchor=ancla)
    if degradado:
        caja = mascara.getbbox() or (0, 0, 1, 1)
        g = degradado_vertical(caja[2] - caja[0], max(1, caja[3] - caja[1]), *degradado)
        relleno_img = Image.new('RGB', lienzo_tam, degradado[1])
        relleno_img.paste(g, (caja[0], caja[1]))
    else:
        relleno_img = Image.new('RGB', lienzo_tam, relleno)
    capa.paste(relleno_img, (0, 0))
    capa.putalpha(mascara)
    return capa


def linea_oro(lienzo: Image.Image, cx: int, y: int, ancho: int, grueso: int = 3) -> None:
    """Filete dorado que se desvanece en las puntas, como el del banner."""
    capa = Image.new('RGBA', lienzo.size, (0, 0, 0, 0))
    arr = np.zeros((grueso, ancho, 4), dtype=np.uint8)
    t = np.linspace(-1, 1, ancho)
    alfa = (np.clip(1 - np.abs(t) ** 3, 0, 1) * 255).astype(np.uint8)
    arr[:, :, 0], arr[:, :, 1], arr[:, :, 2] = ORO
    arr[:, :, 3] = alfa[None, :]
    capa.paste(Image.fromarray(arr), (cx - ancho // 2, y))
    lienzo.alpha_composite(capa)


# ── 1. El wordmark, sacado del logotipo oficial ─────────────────────────────
def wordmark() -> Image.Image:
    """
    `public/logo-iurexia.png` es tinta gris y oro sobre blanco. Se separa cada
    píxel en «tinta gris» (que pasa a crema) y «tinta oro» (que conserva un oro
    en degradado), con su alfa, para pintarlo sobre negro sin el halo blanco del
    fondo original. Se recorta en y=587: debajo viene «LEGAL TECH PLATFORM».
    """
    logo = Image.open(RAIZ / 'public' / 'logo-iurexia.png').convert('RGB').crop((110, 362, 912, 597))
    c = np.asarray(logo).astype(float)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    maxc, minc = c.max(axis=2), c.min(axis=2)
    sat = np.where(maxc > 0, (maxc - minc) / np.maximum(maxc, 1), 0)
    # Oro: tiene color (el azul cae muy por debajo del rojo). Gris: no.
    es_oro = (r - b) > 18
    alfa_gris = np.clip((255 - c.mean(axis=2)) / (255 - 60), 0, 1)
    alfa_oro = np.clip((255 - b) / (255 - 95), 0, 1)
    alfa = np.where(es_oro, alfa_oro, alfa_gris)

    alto, ancho = alfa.shape
    oro = np.asarray(degradado_vertical(ancho, alto, ORO_CLARO, ORO_OSCURO)).astype(float)
    crema = np.zeros_like(oro) + np.array(CREMA, dtype=float)
    color = np.where(es_oro[..., None], oro, crema)
    rgba = np.dstack([color, alfa * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(rgba)
    return img.crop(img.getbbox())


def membrete() -> None:
    W, H = 1200, 380
    lienzo = fondo_noche(W, H, NEGRO, [(600, 175, 520, 190, (58, 46, 26), 1.0)]).convert('RGBA')
    wm = wordmark()
    ancho = 640
    wm = wm.resize((ancho, round(wm.height * ancho / wm.width)), Image.LANCZOS)
    capa = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x, y = (W - wm.width) // 2, 168 - wm.height // 2
    capa.paste(wm, (x, y))
    lienzo.alpha_composite(halo(capa, 46, (201, 169, 98), 0.55))
    lienzo.alpha_composite(halo(capa, 16, (240, 222, 170), 0.45))
    lienzo.alpha_composite(capa)
    linea_oro(lienzo, W // 2, y + wm.height + 52, 220, 3)
    lienzo.convert('RGB').save(SALIDA / 'iurexia-resplandor.png', optimize=True)


# ── 2. Portadas del Buen Fin ────────────────────────────────────────────────
def hoja_buen_fin() -> Image.Image:
    """La hoja de calendario del logotipo oficial 2026, sin la franja MIPYMES."""
    return Image.open(AQUI / 'buen-fin-2026-hoja.png').convert('RGBA')


def portada_buen_fin(ultimo: bool) -> None:
    W, H = 1200, 640
    lienzo = fondo_noche(W, H, NOCHE, [
        (300, 330, 420, 360, (70, 56, 32), 0.9),
        (880, 300, 520, 330, (34, 28, 18), 0.8),
    ]).convert('RGBA')

    hoja = hoja_buen_fin()
    alto_hoja = 470
    hoja = hoja.resize((round(hoja.width * alto_hoja / hoja.height), alto_hoja), Image.LANCZOS)
    capa = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    capa.paste(hoja, (64, (H - alto_hoja) // 2), hoja)
    lienzo.alpha_composite(halo(capa, 60, (255, 236, 196), 0.30))
    lienzo.alpha_composite(halo(capa, 18, (255, 245, 225), 0.25))
    lienzo.alpha_composite(capa)

    x0 = 640
    rotulo = 'ÚLTIMO DÍA' if ultimo else 'BUEN FIN EN IUREXIA'
    lienzo.alpha_composite(texto_capa((W, H), (x0, 92), rotulo, fuente(ARIAL_B, 23), relleno=ORO, espaciado=6))

    treinta = texto_capa((W, H), (x0 - 8, 112), '30 %', fuente(GEORGIA_B, 200), degradado=(ORO_CLARO, ORO_OSCURO))
    lienzo.alpha_composite(halo(treinta, 30, (201, 169, 98), 0.45))
    lienzo.alpha_composite(treinta)

    lienzo.alpha_composite(texto_capa((W, H), (x0, 338), 'en su primer pago', fuente(GEORGIA, 48), relleno=CREMA))
    linea_oro(lienzo, x0 + 110, 424, 220, 3)
    lienzo.alpha_composite(texto_capa((W, H), (x0, 452), 'Un año de Pro por', fuente(GEORGIA, 36), relleno=CREMA))
    cifra = f'${PRO_ANUAL_BUEN_FIN:,}'
    lienzo.alpha_composite(texto_capa((W, H), (x0 + 318, 446), cifra, fuente(GEORGIA_B, 42), degradado=(ORO_CLARO, ORO)))
    pie = 'HOY, MARTES 17, HASTA LAS 23:59' if ultimo else 'CÓDIGO BUENFIN30 · YA VA APLICADO'
    lienzo.alpha_composite(texto_capa((W, H), (x0, 528), pie, fuente(ARIAL_B, 19), relleno=(214, 205, 188), espaciado=3))

    nombre = 'buen-fin-2026-ultimo.jpg' if ultimo else 'buen-fin-2026.jpg'
    lienzo.convert('RGB').save(SALIDA / nombre, quality=88, optimize=True, progressive=True)


# ── 3. Portada de `posicion`: la cuenta contra ChatGPT Pro ──────────────────
def portada_posicion() -> None:
    W, H = 1200, 600
    lienzo = fondo_noche(W, H, NOCHE, [
        (330, 320, 420, 330, (66, 52, 30), 0.95),
        (880, 320, 400, 300, (26, 24, 22), 0.6),
    ]).convert('RGBA')

    lienzo.alpha_composite(texto_capa((W, H), (W // 2, 70), 'HAGA LA CUENTA', fuente(ARIAL_B, 23), relleno=ORO, espaciado=7, ancla='mt'))

    izq, der = 330, 880
    lienzo.alpha_composite(texto_capa((W, H), (izq, 170), 'Un año de Iurexia Pro', fuente(GEORGIA, 40), relleno=CREMA, ancla='mt'))
    cifra = texto_capa((W, H), (izq, 232), f'${PRO_ANUAL:,}', fuente(GEORGIA_B, 132), degradado=(ORO_CLARO, ORO_OSCURO), ancla='mt')
    lienzo.alpha_composite(halo(cifra, 28, (201, 169, 98), 0.45))
    lienzo.alpha_composite(cifra)
    lienzo.alpha_composite(texto_capa((W, H), (izq, 410), 'DOCE MESES', fuente(ARIAL_B, 19), relleno=(214, 205, 188), espaciado=4, ancla='mt'))

    # Filete vertical entre las dos columnas.
    d = ImageDraw.Draw(lienzo)
    for yy in range(170, 450):
        t = (yy - 170) / 280
        a = int(170 * (1 - abs(2 * t - 1) ** 2))
        d.point((W // 2 + 5, yy), fill=ORO + (a,))
        d.point((W // 2 + 6, yy), fill=ORO + (a,))

    gris = (178, 172, 162)
    lienzo.alpha_composite(texto_capa((W, H), (der, 170), 'Un mes de ChatGPT Pro', fuente(GEORGIA, 40), relleno=gris, ancla='mt'))
    lienzo.alpha_composite(texto_capa((W, H), (der, 232), f'${CHATGPT_PRO_DESDE:,}', fuente(GEORGIA_B, 132), relleno=gris, ancla='mt'))
    lienzo.alpha_composite(texto_capa((W, H), (der, 410), 'UN MES · EL PRO MÁS BARATO', fuente(ARIAL_B, 19), relleno=(150, 144, 135), espaciado=4, ancla='mt'))

    nota = f'Precios en pesos. ChatGPT: App Store de México, consultada el {FECHA_PRECIOS_CHATGPT}.'
    lienzo.alpha_composite(texto_capa((W, H), (W // 2, 530), nota, fuente(ARIAL, 19), relleno=(150, 144, 135), ancla='mt'))
    lienzo.convert('RGB').save(SALIDA / 'iurexia-vs-chatgpt.jpg', quality=88, optimize=True, progressive=True)


if __name__ == '__main__':
    SALIDA.mkdir(parents=True, exist_ok=True)
    membrete()
    portada_buen_fin(ultimo=False)
    portada_buen_fin(ultimo=True)
    portada_posicion()
    for n in ('iurexia-resplandor.png', 'buen-fin-2026.jpg', 'buen-fin-2026-ultimo.jpg', 'iurexia-vs-chatgpt.jpg'):
        p = SALIDA / n
        print(f'{n}: {Image.open(p).size} {p.stat().st_size // 1024} KB')
