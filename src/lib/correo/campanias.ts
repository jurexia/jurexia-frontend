/**
 * Los correos de captación, uno por segmento.
 *
 * El reparto real de la base (5-ago-2026) manda sobre el tono de cada uno:
 *
 *   nunca inició sesión .......  65   → ENTRADA
 *   nunca consultó ............ 566   → ACTIVACIÓN
 *   inactivos 30+ días ........ 894   → REACTIVACIÓN
 *   toparon el tope ...........  76   → SUSCRIPCIÓN
 *   clientes de pago .......... 159   → REFERIDOS
 *
 * De ahí la regla que ordena todo: sólo 76 personas en toda la base han
 * chocado con el muro del plan gratuito. Son las únicas a las que una oferta
 * les dice algo. A los cientos que nunca escribieron una consulta ofrecerles
 * descuento es rebajar algo que no han usado: convierte mal y gasta la lista.
 * Por eso el correo de activación NO vende plan. Su única meta es la primera
 * consulta.
 *
 * Marco común, en palabras de David: no vendemos una suscripción de IA
 * genérica, sino una plataforma gratuita que escala con la exigencia del
 * despacho.
 */

import {
    boton, caja, envolver, esc, fuerte, listado, nombrePila, parrafo, rotulo, SITIO,
} from './plantilla';
import { urlBaja } from './baja';
import { urlEntrada } from './entrada';
import {
    codigoReferido, enlaceInvitacion, DIAS_DE_BIENVENIDA, ESCALERA,
} from './referidos';
import type { Correo, Destinatario } from './enviar';

const CHAT = `${SITIO}/chat`;
const PRECIOS = `${SITIO}/precios`;

/** Quita el HTML para la versión de texto plano que exige todo correo serio. */
function aTexto(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|h1|h2)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&middot;/g, '·').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n').map((l) => l.trim()).join('\n')
        .trim();
}

/**
 * Consultas de ejemplo, listas para pegar. Es la pieza que más mueve la
 * activación: el usuario que no sabe qué preguntar, no pregunta.
 */
function consultasEjemplo(estado?: string | null): string[] {
    const e = (estado || '').trim();
    if (e && e.toUpperCase() !== 'FEDERAL') {
        return [
            `¿Qué plazo tengo para promover un amparo indirecto contra un acto de autoridad en ${e}?`,
            `¿Qué requisitos exige el Código de Procedimientos Civiles de ${e} para la demanda inicial?`,
            `Redacta un escrito de contestación de demanda conforme a la legislación de ${e}.`,
        ];
    }
    return [
        '¿Qué plazo tengo para promover un amparo indirecto contra un acto de autoridad?',
        '¿Qué requisitos exige el artículo 108 de la Ley de Amparo para la demanda?',
        'Redacta un escrito de contestación de demanda en materia mercantil.',
    ];
}

/** El argumento de fondo, con datos que el abogado puede verificar él mismo. */
function porQueImporta(): string {
    return caja(
        rotulo('Por qué no es una IA genérica') +
        `<p style="margin:0 0 12px;">La diferencia no está en el modelo, sino en de dónde saca la respuesta:</p>` +
        listado([
            'Legislación de las 32 entidades federativas y federal, indexada artículo por artículo.',
            'Cada cita trae el enlace al ordenamiento publicado por su congreso, para que usted la verifique antes de usarla.',
            'Las tesis se cotejan contra el Semanario Judicial de la Federación: si el registro no existe, la plataforma no la cita.',
        ]),
    );
}

// ─────────────────────────────────────────────────────────────────────────
// 1. ACTIVACIÓN — para quien se registró y nunca escribió una consulta.
//    No menciona planes ni precios. Una sola meta: la primera consulta.
// ─────────────────────────────────────────────────────────────────────────
export function correoActivacion(d: Destinatario): Correo {
    const nombre = nombrePila(d.full_name, d.email);
    const ejemplos = consultasEjemplo(d.estado);

    const cuerpo =
        parrafo(`Estimado licenciado ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            'Nos honra que haya abierto una cuenta en Iurexia. Sabemos lo que vale el tiempo de un abogado ' +
            'en ejercicio, y por eso este correo va a lo único que importa: que compruebe usted mismo, ' +
            'en un par de minutos, si la plataforma está a la altura de su práctica.',
        ) +
        parrafo(
            `Su cuenta es ${fuerte('gratuita y no caduca')}. No hay nada que activar ni que pagar: ` +
            'ya puede resolver con ella una duda real de su despacho.',
        ) +
        caja(
            rotulo('Copie cualquiera de estas y péguela en el chat') +
            listado(ejemplos),
        ) +
        parrafo(
            'Recibirá el artículo aplicable con su texto íntegro y el enlace al ordenamiento oficial, ' +
            'listo para que usted lo verifique y decida. La última palabra sigue siendo suya; ' +
            'nuestro trabajo es ahorrarle la búsqueda, no sustituir su criterio.',
            '20px 0 22px 0',
        ) +
        boton('Hacer mi primera consulta', CHAT) +
        porQueImporta() +
        parrafo(
            'Una plataforma de inteligencia artificial construida expresamente para el sistema jurídico ' +
            'mexicano, y puesta a su disposición sin costo ¿no merece al menos una consulta de prueba?',
            '22px 0 0 0',
        );

    const html = envolver({ cuerpo, urlBaja: urlBaja(d.email) });
    return {
        asunto: `Licenciado ${nombre}, su cuenta de Iurexia lo está esperando`,
        html,
        texto: aTexto(cuerpo) + `\n\nHacer su primera consulta: ${CHAT}\nDarse de baja: ${urlBaja(d.email)}`,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. REACTIVACIÓN — para quien probó y lleva más de 30 días sin volver.
//    Funciona como noticia, no como publicidad: qué hay hoy que no había
//    cuando se fue. Es el formato del correo de Oaxaca, que sí abre.
//
//    Aquí NO se menciona que las mejoras vengan de quejas de usuarios: dicho
//    a un cliente, eso siembra la duda de que la plataforma falla. Las mejoras
//    se presentan como lo que son —trabajo de desarrollo continuo—.
// ─────────────────────────────────────────────────────────────────────────
export function correoReactivacion(d: Destinatario): Correo {
    const nombre = nombrePila(d.full_name, d.email);

    const cuerpo =
        parrafo(`Estimado licenciado ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            'Usted conoció Iurexia en una etapa temprana, y por eso queremos que sea de los primeros en ' +
            `saberlo: la plataforma que usted probó ya no existe. Lo que hay hoy es ${fuerte('Iurexia 2.0')}, ` +
            'una versión con capacidades muy superiores a las de entonces.',
        ) +
        caja(
            rotulo('Lo que cambió') +
            listado([
                'Legislación de las 32 entidades federativas, con el selector de estado en el chat.',
                'Redacción de escritos y demandas fundada en la ley local, no sólo en la federal.',
                'Verificación de tesis contra el Semanario Judicial: si el registro no existe, no se cita.',
                'Carpetas de trabajo para organizar sus consultas y sus escritos por asunto.',
                'Agente de amparo con plan aprobable antes de redactar.',
            ]),
        ) +
        parrafo(
            `Todo ello ya está disponible en su cuenta, ${fuerte('sin costo alguno')} ` +
            'y sin que tenga que cambiar de plan.',
            '20px 0 20px 0',
        ) +
        caja(
            rotulo('Y muy pronto') +
            `<p style="margin:0;">Estamos por liberar la ${fuerte('aplicación móvil de Iurexia')}: ` +
            'todas las funciones de la plataforma desde la palma de su mano, para consultar un artículo ' +
            'en el pasillo del juzgado o revisar un escrito camino a una audiencia. Como usuario registrado, ' +
            'se lo avisaremos antes que a nadie.</p>',
        ) +
        parrafo('', '18px 0 0 0') +
        boton('Conocer Iurexia 2.0', SITIO) +
        parrafo(
            'Estamos a sus órdenes para lo que necesite. Si desea que le mostremos cómo aprovechar alguna ' +
            'de estas herramientas en un asunto concreto, responda este correo y con gusto lo acompañamos.',
            '22px 0 0 0',
        );

    const html = envolver({ cuerpo, urlBaja: urlBaja(d.email) });
    return {
        asunto: `Licenciado ${nombre}, le presentamos Iurexia 2.0`,
        html,
        texto: aTexto(cuerpo) + `\n\nConocer Iurexia 2.0: ${SITIO}\nDarse de baja: ${urlBaja(d.email)}`,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. SUSCRIPCIÓN — sólo para quien ya chocó con el muro.
//    Es el único de los tres que habla de planes, porque es el único que va
//    a gente que sabe exactamente qué está comprando.
// ─────────────────────────────────────────────────────────────────────────
export function correoSuscripcion(d: Destinatario): Correo {
    const nombre = nombrePila(d.full_name, d.email);
    const usadas = d.queries_used ?? 0;

    const cuerpo =
        parrafo(`Estimado licenciado ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            `Usted agotó las consultas de su plan gratuito${usadas >= 5 ? '' : ' o está por hacerlo'}, ` +
            'y eso lo coloca en un grupo reducido: el de quienes le dieron a la plataforma un uso ' +
            'profesional sostenido. Le agradecemos de veras esa confianza.',
        ) +
        parrafo(
            'Por lo mismo, este correo va directo al punto. No hace falta explicarle qué hace Iurexia: ' +
            'usted ya lo comprobó con sus propios asuntos.',
        ) +
        caja(
            rotulo('Lo que se abre al ampliar su plan') +
            listado([
                'Consultas sin el tope de cinco.',
                'Redacción de escritos y demandas fundada en la legislación de su estado.',
                'Carpetas de trabajo sin límite, para llevar varios asuntos en paralelo.',
                'Modos de razonamiento extendido para los asuntos que lo ameriten.',
            ]),
        ) +
        parrafo(
            `La plataforma sigue siendo ${fuerte('gratuita en su base')}. Lo que usted paga no es el acceso: ` +
            'es la capacidad, y sube o baja según lo que su despacho exija ese mes. Usted decide el ritmo.',
            '20px 0 22px 0',
        ) +
        boton('Ver los planes', PRECIOS) +
        parrafo(
            'Y si prefiere continuar en el plan gratuito, cuente con ello: su cuenta y todo su trabajo ' +
            'permanecen intactos, el tope se reinicia, y seguirá siendo bienvenido cuando nos necesite.',
            '22px 0 0 0',
        );

    const html = envolver({ cuerpo, urlBaja: urlBaja(d.email) });
    return {
        asunto: `Licenciado ${nombre}, su plan gratuito llegó al límite`,
        html,
        texto: aTexto(cuerpo) + `\n\nVer los planes: ${PRECIOS}\nDarse de baja: ${urlBaja(d.email)}`,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// 4. REFERIDOS — sólo para quien YA paga Pro o superior.
//    Es el único correo que va a clientes, no a prospectos: el tono cambia
//    de invitación a reconocimiento.
// ─────────────────────────────────────────────────────────────────────────
export function correoReferidos(d: Destinatario): Correo {
    const nombre = nombrePila(d.full_name, d.email);
    const enlace = d.id ? enlaceInvitacion(d.id) : `${SITIO}/registro`;
    const codigo = d.id ? codigoReferido(d.id) : '';

    const cuerpo =
        parrafo(`Estimado licenciado ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            `Le escribimos para ponerle en las manos algo que puede regalar: ` +
            `${fuerte(`${DIAS_DE_BIENVENIDA} días de Iurexia Pro`)} para cada colega que usted invite. ` +
            'Sin tarjeta, sin compromiso de renovación y sin que a usted le cueste nada.',
        ) +
        parrafo(
            'La idea es sencilla. Cuando usted le recomienda una herramienta a un colega está poniendo ' +
            'su nombre de por medio, y eso vale. Así que quien reciba su invitación no llega a una ' +
            'prueba recortada: entra con el plan Pro completo desde el primer día.',
        ) +
        caja(
            rotulo('Y usted también cobra') +
            listado(ESCALERA.map((p) =>
                `${p.nivel} ${p.nivel === 1 ? 'colega invitado que use la plataforma' : 'colegas invitados que la usen'} → ` +
                `${p.dias} días de Pro para su cuenta`,
            )) +
            `<p style="margin:16px 0 0;font-size:13px;color:#404040;">Se paga desde el primero: ` +
            `<strong style="color:#1a1a1a;">no hay que juntar cinco para recibir algo</strong>. ` +
            `Cuenta el colega que verifica su correo y hace al menos una consulta real — no las altas ` +
            `vacías, porque premiar registros de humo no le sirve a nadie.</p>` +
            `<p style="margin:12px 0 0;font-size:13px;color:#404040;">Si usted ya paga un plan, ` +
            `<strong style="color:#1a1a1a;">seguirá pagando exactamente lo mismo</strong>: los días ` +
            `regalados se suman a sus capacidades, no a su recibo. Su suscripción no se modifica y no ` +
            `se genera ningún cargo. Al terminar los días, su cuenta vuelve sola al plan que traía, ` +
            `sin interrupción y sin cobro sorpresa.</p>`,
        ) +
        (codigo
            ? caja(
                rotulo('Su enlace de invitación') +
                `<p style="margin:0 0 10px;word-break:break-all;"><a href="${esc(enlace)}" style="color:#8b7355;text-decoration:underline;">${esc(enlace)}</a></p>` +
                `<p style="margin:0;font-size:13px;color:#404040;">O bien, que su colega escriba el código ` +
                `<strong style="color:#1a1a1a;letter-spacing:1px;">${esc(codigo)}</strong> al registrarse.</p>`,
            )
            : '') +
        parrafo('', '18px 0 0 0') +
        boton('Compartir por WhatsApp o correo', `${SITIO}/perfil`) +
        parrafo(
            'Desde su perfil puede mandarlo por WhatsApp con un toque, que es como se pasan estas ' +
            'cosas entre colegas, y seguir ahí mismo cuántos ya lo están usando.',
            '22px 0 0 0',
        );

    const html = envolver({ cuerpo, urlBaja: urlBaja(d.email) });
    return {
        asunto: `Licenciado ${nombre}, regale ${DIAS_DE_BIENVENIDA} días de Iurexia Pro a un colega`,
        html,
        texto: aTexto(cuerpo) + `\n\nSu enlace: ${enlace}\nDarse de baja: ${urlBaja(d.email)}`,
    };
}


// ─────────────────────────────────────────────────────────────────────────
// 5. ENTRADA — para quien se registró y NUNCA llegó a iniciar sesión.
//    Son 65 cuentas: se dieron de alta y algo se rompió o lo dejaron a medias.
//    No hay que venderles nada; hay que quitarles el obstáculo de encima.
//    El botón no lleva el enlace mágico (caducaría, y el antivirus del
//    destinatario lo consumiría antes que él) sino a /entrar, donde se genera
//    fresco de un clic.
// ─────────────────────────────────────────────────────────────────────────
export function correoEntrada(d: Destinatario): Correo {
    const nombre = nombrePila(d.full_name, d.email);

    const cuerpo =
        parrafo(`Estimado licenciado ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            'Usted creó una cuenta en Iurexia, pero nunca llegó a entrar. Puede que el registro ' +
            'se interrumpiera, o simplemente que quedara pendiente entre asuntos más urgentes.',
        ) +
        parrafo(
            `Su cuenta sigue ahí, ${fuerte('activa y sin costo')}. Y para que no tenga que ` +
            'recordar ninguna contraseña, le preparamos una entrada directa:',
        ) +
        boton('Entrar sin contraseña', urlEntrada(d.email)) +
        parrafo(
            'Pulse el botón y le enviaremos al instante un enlace de acceso. Un clic más y estará dentro.',
            '20px 0 20px 0',
        ) +
        porQueImporta() +
        parrafo(
            'Si prefiere entrar con su contraseña de siempre, también puede hacerlo desde ' +
            `${SITIO}/login. Y si necesita ayuda, responda este correo: le contestamos nosotros.`,
            '22px 0 0 0',
        );

    const html = envolver({ cuerpo, urlBaja: urlBaja(d.email) });
    return {
        asunto: `Licenciado ${nombre}, su cuenta de Iurexia quedó a medio camino`,
        html,
        texto: aTexto(cuerpo) + `\n\nEntrar sin contraseña: ${urlEntrada(d.email)}\nDarse de baja: ${urlBaja(d.email)}`,
    };
}


// ─────────────────────────────────────────────────────────────────────────
// VITRINA — dos tandas, dos textos.
//
// A un litigante activo se le pide su CARA y su palabra: eso se pide con
// respeto y explicando por qué él. A un despacho con dominio propio se le
// pide su MARCA, que es otra conversación y otro riesgo para quien la
// presta. Mandar el mismo texto a los dos habría sonado a circular.
//
// Ninguno de los dos promete que se publicará: se pide autorización, y lo
// que se publique se revisa antes con el interesado.
// ─────────────────────────────────────────────────────────────────────────

/** Tanda 1: los abogados que más la usan. Se les pide testimonio y foto. */
export function correoVitrinaAbogado(d: Destinatario): Correo {
    const nombre = nombrePila(d.full_name, d.email);
    const cuerpo =
        parrafo(`Estimado licenciado ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            'Le escribo porque usted es de quienes más usan Iurexia — no de los que se ' +
            'registraron y la dejaron, sino de los que la abren a trabajar. Eso, para ' +
            'nosotros, vale más que cualquier cosa que podamos decir de nosotros mismos.',
        ) +
        parrafo(
            `Nos gustaría que otros colegas lo supieran, y para eso le pedimos su ` +
            `autorización: ${fuerte('su nombre, una fotografía y unas líneas suyas')} ` +
            'contando en qué le ha servido. Escritas por usted y publicadas tal cual; no ' +
            'las redactamos nosotros.',
        ) +
        // ── El logotipo, para quien tenga despacho ────────────────────────
        // Va DENTRO de este correo y no en uno aparte porque la mayoría de
        // los que litigan con despacho propio usan correo personal: filtrar
        // por dominio los dejaba fuera a todos. Se pregunta, no se supone.
        caja(
            rotulo('¿Tiene despacho propio?') +
            `<p style="margin:0 0 12px;">Si su firma tiene logotipo, nos gustaría ` +
            `<strong style="color:#1a1a1a;">mostrarlo en la página de Iurexia</strong>, ` +
            `entre los despachos que trabajan con la plataforma. Mándenoslo en PNG con ` +
            `fondo transparente y aparece junto a su nombre, enlazado a su sitio.</p>` +
            `<p style="margin:0 0 12px;">Le seré franco sobre por qué se lo pedimos: cuando ` +
            `un abogado entra a nuestra página, lo primero que se pregunta es quién más está ` +
            `usando esto. Un logotipo de un despacho real contesta esa pregunta mejor que ` +
            `cualquier párrafo que escribamos nosotros.</p>` +
            `<p style="margin:0;font-size:13px;color:#404040;">Y funciona en las dos ` +
            `direcciones: su firma queda a la vista de los colegas que visitan el sitio, con ` +
            `un enlace directo al suyo. Si no tiene despacho o prefiere no prestarlo, el ` +
            `beneficio es exactamente el mismo — el logotipo es opcional.</p>`,
        ) +
        caja(
            rotulo('Lo que recibe a cambio') +
            listado([
                'Platinum tres meses sin costo, desde que envía su autorización. Sin cargo y sin renovación automática.',
                'Su ficha en nuestro sitio, enlazada a su despacho o a su perfil profesional: quien llegue buscando abogado, lo encuentra a usted.',
            ]) +
            `<p style="margin:16px 0 0;font-size:13px;color:#404040;">Al terminar los tres ` +
            `meses su cuenta vuelve sola al plan que traía, sin interrupción y sin cobro ` +
            `sorpresa. Puede retirar su testimonio cuando quiera, sin explicar por qué y ` +
            `<strong style="color:#1a1a1a;">sin perder los tres meses</strong>: si retirarlo ` +
            `costara el beneficio, no sería un derecho sino una multa.</p>`,
        ) +
        parrafo(
            'Nada se publica de inmediato. Primero lo revisamos con usted.',
            '20px 0 20px 0',
        ) +
        boton('Ver de qué se trata', `${SITIO}/vitrina`) +
        parrafo(
            'Y si prefiere no aparecer, no pasa absolutamente nada: seguirá teniendo la ' +
            'misma plataforma y la misma atención. Se lo pedimos porque nos honraría, no ' +
            'porque se lo debamos cobrar de alguna forma.',
            '22px 0 0 0',
        );

    return {
        asunto: `Licenciado ${nombre}, ¿nos permite contar que usted usa Iurexia?`,
        html: envolver({ cuerpo, urlBaja: urlBaja(d.email) }),
        texto: aTexto(cuerpo) + `\n\n${SITIO}/vitrina\nDarse de baja: ${urlBaja(d.email)}`,
    };
}

/** Tanda 2: los despachos con dominio propio. Se les pide el logo. */
export function correoVitrinaDespacho(d: Destinatario): Correo {
    const nombre = nombrePila(d.full_name, d.email);
    const cuerpo =
        parrafo(`Estimado licenciado ${esc(nombre)}:`, '0 0 22px 0') +
        parrafo(
            'Su despacho es de los que trabajan con Iurexia, y nos gustaría poder decirlo: ' +
            `le pedimos autorización para mostrar ${fuerte('el logotipo de su firma')} en ` +
            'nuestro sitio, entre los despachos que usan la plataforma.',
        ) +
        parrafo(
            'Sabemos lo que se pide al pedir una marca. Por eso el alcance va escrito y ' +
            'acotado: el logotipo aparece en la página, con su nombre, mientras usted no ' +
            'lo revoque. No se usa en publicidad pagada sin consultarle antes, no se ' +
            'modifica y no se cede a terceros.',
        ) +
        caja(
            rotulo('Lo que recibe a cambio') +
            listado([
                'Platinum tres meses sin costo para su cuenta, desde que envía su autorización.',
                'Su firma enlazada desde nuestro sitio al suyo.',
            ]) +
            `<p style="margin:16px 0 0;font-size:13px;color:#404040;">Si además quiere ` +
            `acompañarlo de unas líneas suyas y una fotografía, mejor — pero es opcional, y ` +
            `el beneficio es el mismo con o sin ellas.</p>` +
            `<p style="margin:12px 0 0;font-size:13px;color:#404040;">Le pedimos el logotipo ` +
            `en <strong style="color:#1a1a1a;">PNG con fondo transparente</strong>, que es lo ` +
            `que permite montarlo sin recortes ni bordes blancos.</p>`,
        ) +
        parrafo(
            'Puede retirarlo cuando quiera, sin explicar por qué y sin perder los tres meses.',
            '20px 0 20px 0',
        ) +
        boton('Autorizar y enviar el logotipo', `${SITIO}/vitrina`) +
        parrafo(
            'Si la decisión no le corresponde a usted, le agradeceríamos que nos indicara ' +
            'con quién conviene tratarlo — o simplemente ignore este correo, sin ningún ' +
            'inconveniente.',
            '22px 0 0 0',
        );

    return {
        asunto: `${esc(nombre)}: ¿nos autoriza a mostrar el logotipo de su despacho?`,
        html: envolver({ cuerpo, urlBaja: urlBaja(d.email) }),
        texto: aTexto(cuerpo) + `\n\n${SITIO}/vitrina\nDarse de baja: ${urlBaja(d.email)}`,
    };
}

export const CAMPANIAS = {
    entrada: { construir: correoEntrada, etiqueta: 'Entrada — nunca inició sesión' },
    activacion: { construir: correoActivacion, etiqueta: 'Activación — nunca consultó' },
    reactivacion: { construir: correoReactivacion, etiqueta: 'Reactivación — Iurexia 2.0' },
    suscripcion: { construir: correoSuscripcion, etiqueta: 'Suscripción — topó el límite' },
    referidos: { construir: correoReferidos, etiqueta: 'Referidos — usuarios Pro' },
    vitrina_abogado: { construir: correoVitrinaAbogado, etiqueta: 'Vitrina — abogados activos (testimonio, foto y logo si tienen despacho)' },
    vitrina_despacho: { construir: correoVitrinaDespacho, etiqueta: 'Vitrina — despachos con dominio propio (logo)' },
} as const;

export type NombreCampania = keyof typeof CAMPANIAS;
