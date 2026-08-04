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

export interface OpcionesCorreo {
    /** Cuerpo ya compuesto con los ayudantes de arriba. */
    cuerpo: string;
    /** Enlace de baja con un clic. Obligatorio en todo correo masivo. */
    urlBaja?: string;
    /** Texto del pie. Por defecto, el aviso de verificación de citas. */
    pie?: string;
}

const PIE_POR_DEFECTO =
    'Las respuestas de la plataforma citan la fuente oficial para su verificación y no sustituyen el criterio profesional del abogado.';

/**
 * Envuelve el cuerpo en el membrete y el pie.
 *
 * `urlBaja` sólo se omite en los correos transaccionales (recuperar contraseña,
 * confirmar cambio): esos no se pueden dar de baja porque no son publicidad, y
 * ofrecer la baja ahí haría que el usuario se saliera de avisos que necesita.
 */
export function envolver({ cuerpo, urlBaja, pie }: OpcionesCorreo): string {
    const baja = urlBaja
        ? `<br><a href="${esc(urlBaja)}" style="color:${PALETA.marron};text-decoration:underline;">Darse de baja de estos avisos</a>`
        : '';

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PALETA.cremaFondo};margin:0;padding:32px 12px;font-family:${SERIF};">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:${PALETA.cremaPapel};border:1px solid ${PALETA.borde};">

  <tr>
    <td style="padding:34px 44px 26px 44px;border-bottom:2px solid ${PALETA.oro};">
      <div style="font-family:${SERIF};font-size:25px;font-weight:600;color:${PALETA.tinta};letter-spacing:0.5px;line-height:1;">Iurexia</div>
      <div style="font-family:${SANS};font-size:10px;letter-spacing:2.6px;color:${PALETA.marron};text-transform:uppercase;padding-top:8px;">Legal Tech</div>
    </td>
  </tr>

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
