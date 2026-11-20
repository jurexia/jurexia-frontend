/**
 * Plantilla base de los correos de Iurexia.
 *
 * Las plantillas viejas (state-update, email-campaign) son fondo negro con
 * emojis y botones con degradado — justo lo que se quitó de la web en agosto.
 * Estas siguen las mismas tres reglas que la barra superior y las páginas
 * públicas: paleta de la casa, un solo radio, cero emojis.
 *
 * Todo va en tablas con estilos en línea porque los clientes de correo no
 * soportan flexbox, grid, ni hojas de estilo externas. Georgia en vez de
 * Playfair porque las fuentes web no cargan en Gmail: Georgia está en todos
 * los sistemas y es la reserva declarada de la marca.
 */

export const PALETA = {
    cremaFondo: '#f9f7f1',
    cremaPapel: '#fefdfb',
    borde: '#e8e6e0',
    tinta: '#1a1a1a',
    texto: '#2d2d2d',
    apagado: '#404040',
    marron: '#8b7355',
    oro: '#c9a962',
} as const;

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Arial,Helvetica,sans-serif';

export const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iurexia.com';

/** Escapa texto que viene de la base de datos antes de meterlo en el HTML. */
export function esc(s: string | null | undefined): string {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Rótulo de sección: versalitas marrones sobre el contenido. */
export function rotulo(texto: string): string {
    return `<div style="font-family:${SANS};font-size:10px;letter-spacing:2px;color:${PALETA.marron};text-transform:uppercase;padding-bottom:12px;">${esc(texto)}</div>`;
}

/** Párrafo del cuerpo. Admite <strong> ya formado, por eso no escapa. */
export function parrafo(html: string, margen = '0 0 20px 0'): string {
    return `<p style="margin:${margen};">${html}</p>`;
}

/** Resalte: el único énfasis permitido dentro del texto corrido. */
export function fuerte(texto: string): string {
    return `<strong style="color:${PALETA.tinta};">${esc(texto)}</strong>`;
}

/**
 * Botón de acción. Sin degradados ni sombras: rectángulo dorado con texto
 * oscuro. Va en tabla porque Outlook ignora el padding de los enlaces.
 */
export function boton(texto: string, url: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0;"><tr><td style="background-color:${PALETA.oro};padding:14px 30px;"><a href="${esc(url)}" style="font-family:${SANS};font-size:14px;font-weight:bold;color:${PALETA.tinta};text-decoration:none;letter-spacing:0.3px;display:inline-block;">${esc(texto)}</a></td></tr></table>`;
}

/** Caja de apoyo sobre fondo crema, para ejemplos y notas destacadas. */
export function caja(contenidoHtml: string): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PALETA.cremaFondo};border:1px solid ${PALETA.borde};margin:4px 0;"><tr><td style="padding:22px 24px;font-family:Georgia,serif;font-size:14px;line-height:1.7;color:${PALETA.texto};">${contenidoHtml}</td></tr></table>`;
}

/** Lista con marca dorada al margen — la misma del correo de Oaxaca. */
export function listado(items: string[]): string {
    const filas = items
        .map(
            (t) =>
                `<tr><td style="padding:11px 0 11px 14px;border-bottom:1px solid ${PALETA.borde};border-left:2px solid ${PALETA.oro};font-family:Georgia,serif;font-size:14px;color:${PALETA.texto};">${esc(t)}</td></tr>`,
        )
        .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PALETA.borde};">${filas}</table>`;
}

/**
 * El avance del video del chat (v43), para ir a todo el ancho bajo el membrete.
 *
 * POR QUÉ UN GIF Y NO EL VIDEO (17-sep-2026). Ningún cliente de correo serio
 * reproduce `<video>`: Gmail lo quita y Outlook lo ignora. Un GIF sí se anima
 * en Gmail, Apple Mail y los móviles, y en Outlook de escritorio —que sólo
 * pinta el primer fotograma— se ve la pregunta ya escrita en el chat, que es
 * una imagen con sentido por sí sola.
 *
 * Doce segundos de cuatro momentos (pregunta, recorrido del acervo, la cita que
 * abre su documento y la revisión de una demanda) a 600 px, 8 fotogramas por
 * segundo y 64 colores: 1.3 MB. La paleta reserva a propósito los rojos del
 * aviso «Son del Código Civil, no del procesal», que se perdían y son justo
 * lo que cuenta el momento. La imagen lleva al video completo, con sonido, en
 * la portada.
 */
export const GIF_VIDEO_CHAT = `${SITIO}/correo/iurexia-chat.gif`;
export const URL_VIDEO_CHAT = `${SITIO}/#video-chat`;

export function videoChat(): string {
    return `<a href="${esc(URL_VIDEO_CHAT)}" style="display:block;text-decoration:none;border:0;">` +
        `<img src="${esc(GIF_VIDEO_CHAT)}" width="600" height="338" ` +
        `alt="Iurexia en acción: una pregunta jurídica, el recorrido por el acervo, las citas que abren su documento y la revisión de una demanda. Ver el video completo." ` +
        `style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;background-color:${PALETA.cremaFondo};" />` +
        `</a>`;
}

/**
 * LA PANTALLA NUEVA (18-sep-2026): el hilo a la izquierda y la hoja tipo Word
 * escribiéndose a la derecha, con las citas numeradas y los emblemas de las
 * instituciones apareciendo conforme se cita cada una.
 *
 * Nueve segundos rodados sobre los componentes REALES del producto, un
 * fotograma por dirección, a 600 px y 6 por segundo: 178 KB, una décima parte
 * del GIF del vídeo del chat, porque casi todo el cuadro está quieto y el
 * paletizado por diferencias lo aprovecha. En Outlook de escritorio, que sólo
 * pinta el primer fotograma, queda la pregunta ya escrita y la hoja en blanco:
 * una imagen que se entiende sola.
 */
export const GIF_DOCUMENTO = `${SITIO}/correo/iurexia-documento.gif`;

export function vistaDocumento(): string {
    return `<a href="${esc(SITIO)}/chat" style="display:block;text-decoration:none;border:0;">` +
        `<img src="${esc(GIF_DOCUMENTO)}" width="600" height="338" ` +
        `alt="La nueva pantalla de Iurexia: a la izquierda la consulta y las instituciones consultadas; a la derecha, una hoja tipo Word donde la respuesta se escribe con sus citas numeradas." ` +
        `style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;background-color:${PALETA.cremaFondo};" />` +
        `</a>`;
}

/**
 * UNA ANIMACIÓN POR CASO DE USO (16-oct-2026, correo «lo que ya puede hacer»).
 *
 * GIF de 600 px sacado de las grabaciones reales de la plataforma (cuenta demo,
 * datos ficticios), enlazado a la sección que muestra. Lleva ancho y alto
 * declarados —sin ellos Gmail lo pinta a tamaño cero mientras carga— y un alt
 * que se entiende solo, porque muchos clientes bloquean las imágenes hasta que
 * el lector las permite.
 */
export function animacion(gif: string, enlace: string, alt: string, ancho = 600, alto = 338): string {
    return `<a href="${esc(enlace)}" style="display:block;text-decoration:none;border:0;margin:0 0 14px;">` +
        `<img src="${esc(gif)}" width="${ancho}" height="${alto}" alt="${esc(alt)}" ` +
        `style="display:block;width:100%;max-width:${ancho}px;height:auto;border:1px solid ${PALETA.borde};outline:none;background-color:${PALETA.cremaFondo};" />` +
        `</a>`;
}

/** Enlace discreto en el cuerpo: subrayado marrón, sin botón. */
export function enlaceTexto(texto: string, url: string): string {
    return `<a href="${esc(url)}" style="font-family:${SANS};font-size:13px;color:${PALETA.marron};text-decoration:underline;">${esc(texto)}</a>`;
}

export interface OpcionesCorreo {
    /** Cuerpo ya compuesto con los ayudantes de arriba. */
    cuerpo: string;
    /**
     * Texto de vista previa: lo que Gmail y Outlook muestran junto al asunto.
     * Sin él, el cliente toma lo primero que encuentra —el membrete— y la
     * bandeja enseña «Iurexia Legal Tech», que no dice nada. Va oculto.
     */
    preencabezado?: string;
    /**
     * Pieza visual a todo el ancho, entre el membrete y el cuerpo. Va fuera del
     * margen interior del cuerpo para que el GIF ocupe los 600 px completos.
     */
    visual?: string;
    /** Enlace de baja con un clic. Obligatorio en todo correo masivo. */
    urlBaja?: string;
    /** Texto del pie. Por defecto, el aviso de verificación de citas. */
    pie?: string;
    /** Membrete con el logotipo en vez del nombre en texto. Lo llevan los
     *  avisos que firma Soporte de Iurexia. */
    logo?: boolean;
}

/**
 * El logotipo del membrete: 480×185, pintado a 240×92, fondo blanco. Vive en el
 * almacenamiento público de Supabase. `public/logo-jurexia.png` es la marca
 * vieja («Jurexia»): no usarlo.
 */
export const LOGO_CORREO =
    'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/assets/correo/logo-iurexia-correo.png';

/** Pie de los avisos de soporte: invita a responder, no a darse de baja. */
export const PIE_SOPORTE = 'Soporte de Iurexia · soporte@iurexia.com · Puede responder directamente a este correo.';

const PIE_POR_DEFECTO =
    'Las respuestas de la plataforma citan la fuente oficial para su verificación y no sustituyen el criterio profesional del abogado.';

/**
 * Envuelve el cuerpo en el membrete y el pie.
 *
 * `urlBaja` sólo se omite en los correos transaccionales (recuperar contraseña,
 * confirmar cambio): esos no se pueden dar de baja porque no son publicidad, y
 * ofrecer la baja ahí haría que el usuario se saliera de avisos que necesita.
 */
export function envolver({ cuerpo, urlBaja, pie, visual, preencabezado, logo }: OpcionesCorreo): string {
    const membrete = logo
        ? `<img src="${LOGO_CORREO}" width="240" height="92" alt="Iurexia" style="display:block;width:240px;max-width:100%;height:auto;border:0;outline:none;" />`
        : `<div style="font-family:${SERIF};font-size:25px;font-weight:600;color:${PALETA.tinta};letter-spacing:0.5px;line-height:1;">Iurexia</div>
      <div style="font-family:${SANS};font-size:10px;letter-spacing:2.6px;color:${PALETA.marron};text-transform:uppercase;padding-top:8px;">Legal Tech</div>`;
    const baja = urlBaja
        ? `<br><a href="${esc(urlBaja)}" style="color:${PALETA.marron};text-decoration:underline;">Darse de baja de estos avisos</a>`
        : '';
    const pre = preencabezado
        ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preencabezado)}</div>\n`
        : '';

    return `${pre}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PALETA.cremaFondo};margin:0;padding:32px 12px;font-family:${SERIF};">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:${PALETA.cremaPapel};border:1px solid ${PALETA.borde};">

  <tr>
    <td style="padding:${logo ? '26px 44px 20px 44px' : '34px 44px 26px 44px'};border-bottom:2px solid ${PALETA.oro};">
      ${membrete}
    </td>
  </tr>

${visual ? `  <tr>
    <td style="padding:0;border-bottom:1px solid ${PALETA.borde};line-height:0;font-size:0;">${visual}</td>
  </tr>
` : ''}
  <tr>
    <td style="padding:36px 44px 36px 44px;font-family:${SERIF};font-size:15px;line-height:1.72;color:${PALETA.texto};">
${cuerpo}
    </td>
  </tr>

  <tr>
    <td style="padding:20px 44px 26px 44px;background-color:${PALETA.cremaFondo};border-top:1px solid ${PALETA.borde};font-family:${SANS};font-size:11px;line-height:1.7;color:${PALETA.marron};">
      Iurexia Legal Tech &middot; <a href="${SITIO}" style="color:${PALETA.marron};text-decoration:underline;">iurexia.com</a><br>
      ${esc(pie ?? PIE_POR_DEFECTO)}${baja}
    </td>
  </tr>

</table>
</td></tr>
</table>`;
}

/** Primer nombre, para el saludo. Nunca devuelve cadena vacía. */
export function nombrePila(nombre: string | null | undefined, correo: string): string {
    const limpio = (nombre ?? '').trim();
    if (limpio) return limpio.split(/\s+/)[0];
    return correo.split('@')[0];
}

/* ═══ LA NOCHE (11-nov-2026) ═══
   David, tras la prueba de bandeja: «Todos caen en promociones sin el HTML
   profesional… que se vea un negro bonito como el del canal por dentro y el
   logo por fuera resplandeciente, negro totalmente el fondo del correo.
   Justificado el texto, y si hablamos de buen fin, pues hay que poner la imagen
   del buen fin». La carta sin diseño (fondo blanco, sin imágenes ni botón)
   cayó igual en Promociones en su Gmail: perder la imagen no compraba nada.

   Paleta del canal de YouTube: fondo #0f0e0d, crema, oro en degradado. El
   correo entero va sobre negro puro; arriba, fuera de la tarjeta, el wordmark
   con su halo (`public/correo/iurexia-resplandor.png`); dentro, la tarjeta en
   el negro del canal con filete de oro, la portada si la hay, el texto
   justificado en crema y un botón de oro. Las imágenes las hace
   `scripts/correo-noche/generar.py`.

   Documento HTML completo (no fragmento) porque lleva <head>: `color-scheme`
   para que Apple Mail y Outlook no lo inviertan en modo oscuro, el ajuste de
   márgenes para el teléfono y, si se da, el marcado de Gmail para la pestaña
   Promociones (la ficha con el código y la fecha de vencimiento). */
export const NOCHE = {
    fondo: '#000000',
    tarjeta: '#0f0e0d',
    borde: '#2a261f',
    texto: '#e8e2d5',
    blanco: '#fdfbf7',
    apagado: '#9d9484',
    oro: '#c9a962',
    oroClaro: '#e2c98a',
} as const;

export const LOGO_RESPLANDOR = `${SITIO}/correo/iurexia-resplandor.png`;

/** La imagen de cabecera de la tarjeta: 1200 px de ancho, pintada a 600. */
export type Portada = { src: string; alt: string; url: string };

/** Resalte dentro del texto corrido: crema casi blanca y negrita. */
export function fuerteNoche(texto: string): string {
    return `<strong style="color:${NOCHE.blanco};font-weight:bold;">${esc(texto)}</strong>`;
}

/** Botón de oro, centrado. En tabla porque Outlook ignora el padding de los enlaces. */
export function botonNoche(texto: string, url: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:30px auto 6px auto;"><tr><td align="center" bgcolor="${NOCHE.oro}" style="background-color:${NOCHE.oro};background-image:linear-gradient(180deg,${NOCHE.oroClaro},#b48f4c);"><a href="${esc(url)}" style="display:inline-block;padding:16px 40px;font-family:${SANS};font-size:15px;font-weight:bold;letter-spacing:0.6px;color:${NOCHE.tarjeta};text-decoration:none;text-align:center;">${esc(texto)}</a></td></tr></table>`;
}

/** Letra chica (condiciones, fuentes): gris cálido, legible sobre la tarjeta. */
export function notaNoche(texto: string): string {
    return `<p style="margin:12px 0 0;font-family:${SANS};font-size:11px;line-height:1.65;color:${NOCHE.apagado};text-align:justify;">${texto}</p>`;
}

/** Lista de argumentos sobre la tarjeta negra: rombo de oro, el titular en
 *  crema fuerte y la explicación en el texto corrido. */
export function listaNoche(items: { titular: string; texto: string }[]): string {
    const filas = items
        .map(
            (i) =>
                `<tr><td width="22" valign="top" style="padding:13px 0 0 0;font-family:${SANS};font-size:11px;line-height:1;color:${NOCHE.oro};">&#9670;</td>` +
                `<td style="padding:8px 0 10px 0;font-family:${SERIF};font-size:16px;line-height:1.65;color:${NOCHE.texto};text-align:left;">` +
                `<strong style="color:${NOCHE.blanco};">${esc(i.titular)}</strong> ${esc(i.texto)}</td></tr>`,
        )
        .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px 0;">${filas}</table>`;
}

export function envolverNoche({ cuerpo, urlBaja, preencabezado, portada, titulo, marcado, encabezado }: {
    cuerpo: string;
    urlBaja: string;
    preencabezado?: string;
    portada?: Portada;
    titulo?: string;
    /** Titular grande en mayúsculas, ENCIMA de la portada (19-nov-2026). */
    encabezado?: string;
    /** JSON-LD para la pestaña Promociones de Gmail (ya serializado). */
    marcado?: string;
}): string {
    const pre = preencabezado
        ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preencabezado)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>\n`
        : '';
    const filaPortada = portada
        ? `    <tr><td style="padding:0;line-height:0;font-size:0;"><a href="${esc(portada.url)}" style="text-decoration:none;"><img src="${esc(portada.src)}" width="600" alt="${esc(portada.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;color:${NOCHE.oroClaro};font-family:${SERIF};font-size:18px;line-height:1.4;" /></a></td></tr>\n`
        : '';
    const filaEncabezado = encabezado
        ? `    <tr><td class="noche-encabezado" align="center" style="padding:34px 40px 28px 40px;font-family:${SERIF};font-size:27px;line-height:1.28;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;color:${NOCHE.blanco};text-align:center;">${esc(encabezado)}</td></tr>\n`
        : '';
    // `<` escapado: el JSON va dentro de <script> y no debe poder cerrarlo.
    const ld = marcado ? `<script type="application/ld+json">${marcado.replace(/</g, '\\u003c')}</script>\n` : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(titulo ?? 'Iurexia')}</title>
${ld}<style>
:root { color-scheme: dark; supported-color-schemes: dark; }
body { margin: 0 !important; padding: 0 !important; background-color: ${NOCHE.fondo} !important; }
@media only screen and (max-width: 620px) {
  .noche-cuerpo { padding: 30px 22px 28px 22px !important; }
  .noche-pie { padding: 18px 22px 24px 22px !important; }
  .noche-encabezado { padding: 26px 18px 22px 18px !important; font-size: 22px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${NOCHE.fondo};">
${pre}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${NOCHE.fondo}" style="background-color:${NOCHE.fondo};">
<tr><td align="center" style="padding:14px 10px 0 10px;">
  <a href="${SITIO}" style="text-decoration:none;"><img src="${LOGO_RESPLANDOR}" width="600" alt="Iurexia" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;color:${NOCHE.oroClaro};font-family:${SERIF};font-size:30px;line-height:1.3;" /></a>
</td></tr>
<tr><td align="center" style="padding:0 10px 36px 10px;">
  <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${NOCHE.tarjeta}" style="width:100%;max-width:600px;background-color:${NOCHE.tarjeta};border:1px solid ${NOCHE.borde};border-top:2px solid ${NOCHE.oro};">
${filaEncabezado}${filaPortada}    <tr><td class="noche-cuerpo" style="padding:38px 48px 34px 48px;font-family:${SERIF};font-size:16px;line-height:1.75;color:${NOCHE.texto};text-align:justify;">
${cuerpo}
    </td></tr>
    <tr><td class="noche-pie" style="padding:20px 48px 26px 48px;border-top:1px solid ${NOCHE.borde};font-family:${SANS};font-size:11px;line-height:1.7;color:${NOCHE.apagado};text-align:center;">
      Iurexia Legal Tech &middot; <a href="${SITIO}" style="color:${NOCHE.apagado};text-decoration:underline;">iurexia.com</a><br>
      Le escribimos porque tiene una cuenta en Iurexia. <a href="${esc(urlBaja)}" style="color:${NOCHE.apagado};text-decoration:underline;">Darse de baja</a>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Marcado de Gmail para la pestaña Promociones: el logotipo del remitente, la
 * oferta con su código y su vencimiento, y la portada como vista previa. Gmail
 * decide si lo muestra; si no, no estorba.
 */
export function marcadoPromocion({ descripcion, codigo, desde, hasta, imagen, url, titular }: {
    descripcion: string;
    codigo?: string;
    desde: string;
    hasta: string;
    imagen: string;
    url: string;
    titular: string;
}): string {
    return JSON.stringify([
        { '@context': 'http://schema.org/', '@type': 'Organization', logo: `${SITIO}/correo/iurexia-avatar-256.png` },
        {
            '@context': 'http://schema.org/', '@type': 'DiscountOffer', description: descripcion,
            ...(codigo ? { discountCode: codigo } : {}), availabilityStarts: desde, availabilityEnds: hasta,
        },
        { '@context': 'http://schema.org/', '@type': 'PromotionCard', image: imagen, url, headline: titular },
    ]);
}
