/**
 * Los dos correos del circuito.
 *
 *   1. `avisoInterno`  — a David: qué entró, qué se arregló solo, qué espera
 *                        su visto bueno. Es un parte de trabajo, no una alerta.
 *   2. `correoCierre`  — al usuario: qué falló, por qué, y qué se hizo.
 *   3. `correoAcuse`   — al usuario, el mismo día que reporta: que se le leyó,
 *                        con su folio, y qué pasa ahora (16-oct-2026).
 *
 * REGLAS DEL CORREO AL USUARIO, aprendidas escribiéndole a un abogado que
 * llevaba cuatro quejas sin respuesta:
 *
 *   · Se le da la razón cuando la tiene, sin rodeos y en la primera línea.
 *   · Se describe el fallo GENÉRICO, nunca su consulta. Que sepamos qué
 *     preguntó no significa que debamos decírselo: leer el expediente de
 *     alguien y luego citárselo es lo contrario de generar confianza.
 *   · No se promete lo que no está desplegado. «Corregido» significa en
 *     producción, no en una rama.
 *   · Firma el equipo de desarrollo, no un remitente inventado.
 */

import { PALETA, esc, envolver, rotulo, parrafo, caja, listado, nombrePila, SITIO } from '../correo/plantilla';

const SANS = 'Arial,Helvetica,sans-serif';

export interface Incidencia {
    id: string;
    folio: string | null;
    user_email: string | null;
    familia: string | null;
    clase: string | null;
    texto: string;
    estado: string;
    diagnostico: string | null;
    correccion: string | null;
    requiere_vb: boolean;
    confianza: number | null;
    triaje_por: string | null;
}

/* ─────────────────────── 1. EL PARTE PARA DAVID ─────────────────────── */

function fila(etiqueta: string, valor: string, destacar = false): string {
    return `<tr>
      <td style="padding:7px 0;font-family:${SANS};font-size:13px;color:${PALETA.apagado};">${esc(etiqueta)}</td>
      <td style="padding:7px 0;font-family:${SANS};font-size:13px;text-align:right;${
          destacar ? `font-weight:bold;color:${PALETA.tinta};` : ''}">${esc(valor)}</td>
    </tr>`;
}

export function avisoInterno(datos: {
    recogidas: number;
    porFamilia: Record<string, number>;
    corregidas: Incidencia[];
    esperandoVB: Incidencia[];
    dudosas: Incidencia[];
}): { asunto: string; html: string; texto: string } {
    const { recogidas, porFamilia, corregidas, esperandoVB, dudosas } = datos;

    const partes: string[] = [];

    partes.push(rotulo('Circuito de incidencias'));
    partes.push(`<div style="font-family:Georgia,serif;font-size:21px;color:${PALETA.tinta};padding-bottom:18px;">${
        esperandoVB.length
            ? `${esperandoVB.length} ${esperandoVB.length === 1 ? 'incidencia espera' : 'incidencias esperan'} tu visto bueno`
            : 'Sin nada que aprobar'}</div>`);

    // Lo que se aplicó solo. Va PRIMERO y con el detalle completo: es lo que
    // se hizo sin preguntarte, así que es lo que más derecho tienes a auditar.
    if (corregidas.length) {
        partes.push(rotulo('Se aplicó sin preguntar'));
        partes.push(parrafo(
            `Correcciones de <strong>datos</strong> — acervo, metadatos, reindexado. ` +
            `Ninguna cambia el comportamiento de la plataforma.`));
        partes.push(caja(listado(corregidas.map(i =>
            `<strong>${esc(i.clase ?? '')}</strong>${i.folio ? ` · folio ${esc(i.folio)}` : ''}<br>` +
            `${esc((i.diagnostico ?? '').slice(0, 220))}<br>` +
            `<span style="color:${PALETA.marron};">→ ${esc((i.correccion ?? '').slice(0, 220))}</span>`))));
    }

    // Lo que NO se tocó. El circuito llega hasta aquí y se para.
    if (esperandoVB.length) {
        partes.push(rotulo('Esperando tu visto bueno'));
        partes.push(parrafo(
            `Tocan <strong>comportamiento</strong> — prompt, umbral, código o cobro. ` +
            `Están diagnosticadas y con el parche escrito, pero no aplicadas.`));
        partes.push(caja(listado(esperandoVB.map(i =>
            `<strong>${esc(i.clase ?? '')}</strong>${i.folio ? ` · folio ${esc(i.folio)}` : ''}<br>` +
            `${esc((i.diagnostico ?? i.texto).slice(0, 260))}<br>` +
            `<span style="color:${PALETA.marron};">propuesta: ${esc((i.correccion ?? '—').slice(0, 260))}</span>`))));
    }

    // Las que el triaje no supo clasificar. Sin esto, el circuito esconde sus
    // propios fallos: una incidencia mal clasificada desaparece en silencio.
    if (dudosas.length) {
        partes.push(rotulo('El triaje dudó'));
        partes.push(parrafo(`Confianza baja. Si aciertan, la regla necesita una línea más.`));
        partes.push(caja(listado(dudosas.map(i =>
            `${esc(i.texto.slice(0, 140))}<br><span style="color:${PALETA.marron};">` +
            `dijo ${esc(i.clase ?? '?')} · ${i.confianza ?? '?'} · ${esc(i.triaje_por ?? '')}</span>`))));
    }

    const resumen = Object.entries(porFamilia).sort((a, b) => b[1] - a[1]);
    partes.push(rotulo('La vuelta'));
    partes.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PALETA.borde};">
        ${fila('Recogidas', String(recogidas), true)}
        ${resumen.map(([f, n]) => fila(f, String(n))).join('')}
    </table>`);

    const asunto = esperandoVB.length
        ? `Incidencias · ${esperandoVB.length} esperan tu visto bueno`
        : `Incidencias · ${corregidas.length} corregidas, nada que aprobar`;

    const texto = [
        `CIRCUITO DE INCIDENCIAS`,
        ``,
        `Recogidas: ${recogidas}`,
        ...resumen.map(([f, n]) => `  ${f}: ${n}`),
        ``,
        `Aplicado sin preguntar (${corregidas.length}):`,
        ...corregidas.map(i => `  · ${i.clase} — ${i.correccion ?? ''}`),
        ``,
        `Esperando visto bueno (${esperandoVB.length}):`,
        ...esperandoVB.map(i => `  · ${i.clase} — ${i.diagnostico ?? i.texto.slice(0, 120)}`),
    ].join('\n');

    return { asunto, html: envolver({ cuerpo: partes.join('') }), texto };
}

/* ────────────────── 2. EL CORREO DE CIERRE AL USUARIO ────────────────── */

/**
 * Cómo se le cuenta cada clase de fallo a quien lo sufrió.
 *
 * Están escritas en genérico A PROPÓSITO. El circuito conoce la consulta que
 * falló —la necesita para verificar— pero al usuario se le habla del defecto,
 * no de su expediente.
 */
const RELATO: Record<string, { titulo: string; queParoJusto: string }> = {
    'calidad/tesis-falsa': {
        titulo: 'Una cita de jurisprudencia que no se pudo comprobar',
        queParoJusto: 'Iurexia sólo debe citar tesis que estén en el Semanario Judicial de la ' +
            'Federación y que pueda mostrarle con su registro digital. Una cita sin registro ' +
            'es una cita que no podemos garantizarle.',
    },
    'calidad/respuesta-erronea': {
        titulo: 'Una respuesta apoyada en un ordenamiento equivocado',
        queParoJusto: 'La respuesta se apoyó en una norma que no correspondía al caso o cuyo ' +
            'texto no estaba actualizado en nuestro acervo.',
    },
    'calidad/enumera-articulos': {
        titulo: 'La respuesta enumeró artículos en vez de razonar',
        queParoJusto: 'En lugar de argumentar, la respuesta devolvió una lista de artículos del ' +
            'código. Es un fallo de forma que vuelve la respuesta inservible aunque los ' +
            'artículos existan.',
    },
    'defecto/subida': {
        titulo: 'Un documento que no llegó a procesarse',
        queParoJusto: 'El envío del archivo se interrumpió antes de llegar. El aviso, además, ' +
            'culpaba a su documento de algo que no era suyo.',
    },
    'defecto/historial': {
        titulo: 'Consultas anteriores que no se podían recuperar',
        queParoJusto: 'El historial dejaba de mostrar las conversaciones antiguas. No se ' +
            'borraron: estaban ahí y la pantalla no las alcanzaba.',
    },
    'defecto/cancelacion': {
        titulo: 'La cancelación de la suscripción devolvía un error',
        queParoJusto: 'Cancelar tiene que poder hacerse siempre, sin hablar con nadie y a la ' +
            'primera. Que devolviera un error es un fallo grave y así lo tratamos.',
    },
    'defecto/cobra-consulta-fallida': {
        titulo: 'Consultas que fallaron y aun así descontaron cuota',
        queParoJusto: 'Una consulta que devuelve error no es una consulta. No debe descontar ' +
            'nada de su plan.',
    },
    'defecto/error-crudo': {
        titulo: 'Un mensaje de error interno que nunca debió llegarle',
        queParoJusto: 'Le llegó un error técnico de nuestros sistemas, con instrucciones que no ' +
            'van dirigidas a usted. Ese texto no debe salir nunca de la máquina.',
    },
};

export function correoCierre(datos: {
    nombre: string | null;
    clase: string;
    folio: string | null;
    correccion: string;
    urlBaja?: string;
}): { asunto: string; html: string; texto: string } {
    const { nombre, clase, folio, correccion, urlBaja } = datos;
    const r = RELATO[clase] ?? {
        titulo: 'El fallo que nos reportó',
        queParoJusto: 'Revisamos lo que nos describió y encontramos la causa.',
    };

    const saludo = nombre ? `Estimado licenciado ${esc(nombre)}:` : 'Estimada, estimado:';

    const cuerpo = [
        rotulo(folio ? `Reporte ${esc(folio)} · resuelto` : 'Reporte resuelto'),
        `<div style="font-family:Georgia,serif;font-size:21px;color:${PALETA.tinta};padding-bottom:20px;">${esc(r.titulo)}</div>`,
        parrafo(saludo),
        parrafo(
            'Usted nos reportó un fallo. Tenía razón, y le escribimos para decirle exactamente ' +
            'qué era y qué hicimos.'),
        caja(
            `<div style="font-family:${SANS};font-size:10px;letter-spacing:2px;color:${PALETA.marron};text-transform:uppercase;padding-bottom:10px;">Qué ocurría</div>` +
            `<div style="padding-bottom:16px;">${esc(r.queParoJusto)}</div>` +
            `<div style="font-family:${SANS};font-size:10px;letter-spacing:2px;color:${PALETA.marron};text-transform:uppercase;padding-bottom:10px;">Qué se corrigió</div>` +
            `<div>${esc(correccion)}</div>`),
        parrafo(
            'El cambio ya está en producción. No tiene que hacer nada: la próxima vez que use ' +
            'esa función, funcionará como debía.'),
        parrafo(
            'Gracias por tomarse el tiempo de reportarlo. Un fallo que nadie señala se queda ' +
            'años en el producto.'),
        `<div style="border-top:1px solid ${PALETA.borde};margin-top:28px;padding-top:18px;font-family:${SANS};font-size:13px;color:${PALETA.apagado};">
            <div style="font-weight:bold;color:${PALETA.tinta};">Equipo de desarrollo · Iurexia</div>
            <div>soporte@iurexia.com</div>
         </div>`,
    ].join('');

    const texto = [
        folio ? `Reporte ${folio} — resuelto` : 'Reporte resuelto',
        '', r.titulo, '',
        'Qué ocurría: ' + r.queParoJusto,
        'Qué se corrigió: ' + correccion,
        '', 'Ya está en producción. Gracias por reportarlo.',
        '', 'Equipo de desarrollo · Iurexia',
    ].join('\n');

    return {
        asunto: folio ? `Su reporte ${folio}, resuelto` : 'El fallo que nos reportó, resuelto',
        html: envolver({ cuerpo, urlBaja }),
        texto,
    };
}

/* ────────────────── 3. EL ACUSE AL USUARIO, EL MISMO DÍA ────────────────── */

/**
 * David, 16-oct-2026: «Automatiza el soporte: si falla hay que darles la razón,
 * y si hay tema de leyes se revisará con su reporte».
 *
 * Hasta hoy el chat de soporte decía «le escribirán a su correo» y nadie
 * escribía: el único correo al usuario era el de cierre, que sólo sale cuando
 * el arreglo está en producción, y entre tanto pasaban semanas de silencio.
 * Este acuse sale en la vuelta siguiente al reporte y dice tres cosas:
 *
 *   · Fallo de la plataforma (familia `defecto`) → tiene razón, es nuestro,
 *     no suyo, en la primera línea y sin pedirle pruebas.
 *   · Discusión jurídica (familia `calidad`) → ni se le da la razón ni se le
 *     discute: se revisa con su reporte contra el texto oficial, y se le
 *     escribe con el resultado (eso lo hace después `correoCierre`).
 *   · Soporte y propuestas → la respuesta útil que ya existe (dónde se cancela,
 *     dónde se cambia el plan) y una persona detrás si no basta.
 *
 * Mismas reglas que el cierre: el fallo se describe en GENÉRICO, nunca su
 * consulta, y no se promete nada que dependa de un humano con fecha.
 */
const ACUSE: Record<string, { titulo: string; cuerpo: string }> = {
    'defecto/cancelacion': {
        titulo: 'La cancelación de su suscripción',
        cuerpo: 'Cancelar debe poder hacerse siempre y a la primera, sin hablar con nadie. ' +
            'Si no pudo, el fallo es nuestro. Mientras lo corregimos, basta con que responda ' +
            'a este correo con la palabra «cancelar» y la suscripción se da de baja desde aquí, ' +
            'sin cargos posteriores.',
    },
    'defecto/cobra-consulta-fallida': {
        titulo: 'Consultas que fallaron y descontaron cuota',
        cuerpo: 'Una consulta que devuelve error no es una consulta y no debe descontar nada ' +
            'de su plan. Si alguna se le descontó, responda a este correo y se la reponemos.',
    },
    'defecto/plan-no-aplicado': {
        titulo: 'Un pago que no se reflejó en su plan',
        cuerpo: 'Si usted pagó, el plan tiene que estar activo. Cotejaremos su pago con la ' +
            'cuenta y, si responde a este correo con el correo con el que pagó, lo activamos ' +
            'a mano sin esperar al arreglo.',
    },
    'defecto/acceso-movil': {
        titulo: 'El acceso desde el celular',
        cuerpo: 'Mientras lo corregimos, puede entrar con la misma cuenta desde ' +
            'www.iurexia.com en el navegador del celular o de la computadora; sus carpetas y ' +
            'consultas son las mismas.',
    },
};

const ACUSE_POR_FAMILIA: Record<string, { titulo: string; cuerpo: string }> = {
    defecto: {
        titulo: 'Un fallo de la plataforma',
        cuerpo: 'Lo que nos describe es un fallo de Iurexia, no de usted ni de su documento.',
    },
    calidad: {
        titulo: 'Su observación sobre el fundamento de una respuesta',
        cuerpo: 'Cuando un abogado discute el fundamento de una respuesta —un artículo, una ' +
            'tesis, la ley aplicable— no lo damos por bueno ni por malo de entrada: lo revisamos ' +
            'con su reporte, cotejando la cita contra el texto oficial de la ley o el registro ' +
            'de la tesis en el Semanario Judicial de la Federación. Si la respuesta estuvo mal, ' +
            'corregimos el acervo para que no vuelva a ocurrirle a nadie y le escribimos para ' +
            'decirle qué estaba mal y qué se cambió.',
    },
    'soporte/cancelacion': {
        titulo: 'La cancelación de su suscripción',
        cuerpo: 'Puede cancelar en cualquier momento desde www.iurexia.com/cuenta/suscripcion, ' +
            'botón «Gestionar suscripción», sin hablar con nadie. Si prefiere que lo hagamos nosotros, responda ' +
            'a este correo con la palabra «cancelar».',
    },
    'soporte/planes-y-cobro': {
        titulo: 'Su consulta sobre planes y cobro',
        cuerpo: 'Los planes y sus precios están en www.iurexia.com/precios. Para cambiar de ' +
            'plan, actualizar la tarjeta, descargar comprobantes o cancelar, entre a ' +
            'www.iurexia.com/cuenta/suscripcion y pulse «Gestionar suscripción». Si su caso no se resuelve ahí, responda a ' +
            'este correo y una persona del equipo lo atiende.',
    },
    'soporte/sin-respuesta': {
        titulo: 'Su mensaje sin respuesta',
        cuerpo: 'Tiene razón en reclamarlo: nos escribió y no le contestamos a tiempo. Una ' +
            'persona del equipo retoma su caso; si quiere añadir algo, responda a este correo.',
    },
    soporte: {
        titulo: 'Su consulta a soporte',
        cuerpo: 'Una persona del equipo revisa su caso. Si quiere añadir algo, responda a ' +
            'este correo.',
    },
    mejora: {
        titulo: 'Su propuesta',
        cuerpo: 'Quedó anotada en la lista de propuestas que revisa el equipo de producto. ' +
            'Muchas de las funciones que hoy tiene Iurexia empezaron como un mensaje así.',
    },
};

/** Las familias que NO llevan acuse: telemetría y lo que el triaje no entendió. */
export const SIN_ACUSE = new Set(['encuesta', 'buzon-equivocado']);

export function correoAcuse(datos: {
    nombre: string | null;
    email: string;
    tratamiento?: string | null;
    familia: string;
    clase: string;
    folio: string | null;
    /** Días entre el reporte y este correo. Desde 3 se pide disculpa por la demora. */
    diasDeRetraso: number;
}): { asunto: string; html: string; texto: string } {
    const { familia, clase, folio, diasDeRetraso } = datos;
    const especifico = ACUSE[clase] ?? ACUSE_POR_FAMILIA[clase];
    const general = ACUSE_POR_FAMILIA[familia] ?? ACUSE_POR_FAMILIA.soporte;
    const relato = familia === 'defecto' ? RELATO[clase] : undefined;
    const titulo = especifico?.titulo ?? relato?.titulo ?? general.titulo;

    // Sin nombre en el perfil no se usa el del correo («Lic. jperez83»): saludo llano.
    const pila = datos.nombre?.trim() ? nombrePila(datos.nombre, datos.email) : '';
    const nombre = pila ? pila.charAt(0).toUpperCase() + pila.slice(1).toLowerCase() : '';
    const saludo = !nombre ? 'Estimada, estimado:'
        : datos.tratamiento === 'licenciada' ? `Estimada licenciada ${esc(nombre)}:`
        : datos.tratamiento === 'licenciado' ? `Estimado licenciado ${esc(nombre)}:`
        : `Apreciable Lic. ${esc(nombre)}:`;

    // Lo primero que lee, según de qué se trate.
    const apertura = familia === 'defecto'
        ? 'Tiene razón, y se lo decimos de entrada: lo que nos reportó no debió ocurrir.'
        : familia === 'calidad'
            ? 'Recibimos su observación sobre una respuesta de Iurexia y le agradecemos que se tomara el tiempo de escribirla.'
            : 'Recibimos su mensaje y le escribimos para que sepa qué sigue.';

    const demora = diasDeRetraso >= 3
        ? 'Le pedimos además una disculpa por contestarle hasta hoy: su mensaje se quedó detenido ' +
          'en nuestro circuito interno por un error nuestro, que ya corregimos.'
        : null;

    const queSigue = familia === 'defecto'
        ? [
            // El relato del cierre NO: cuenta la causa de un fallo ya verificado,
            // y aquí todavía no se ha verificado nada.
            general.cuerpo,
            especifico?.cuerpo,
            'Su reporte quedó registrado' + (folio ? ` con el folio ${folio}` : '') + ' y ya está en ' +
            'la cola de corrección del equipo de desarrollo. Cuando el arreglo esté en producción, ' +
            'le escribiremos para confirmárselo.',
        ].filter(Boolean) as string[]
        : [(especifico ?? general).cuerpo];

    const cuerpo = [
        rotulo(folio ? `Reporte ${esc(folio)} · recibido` : 'Reporte recibido'),
        `<div style="font-family:Georgia,serif;font-size:21px;color:${PALETA.tinta};padding-bottom:20px;">${esc(titulo)}</div>`,
        parrafo(saludo),
        parrafo(esc(apertura)),
        ...(demora ? [parrafo(esc(demora))] : []),
        caja(queSigue.map((p, i) =>
            `<div style="${i < queSigue.length - 1 ? 'padding-bottom:12px;' : ''}">${esc(p)}</div>`).join('')),
        parrafo('Puede responder directamente a este correo: lo lee una persona del equipo.'),
        `<div style="border-top:1px solid ${PALETA.borde};margin-top:28px;padding-top:18px;font-family:${SANS};font-size:13px;color:${PALETA.apagado};">
            <div style="font-weight:bold;color:${PALETA.tinta};">Equipo de soporte · Iurexia</div>
            <div>soporte@iurexia.com · <a href="${SITIO}" style="color:${PALETA.apagado};">www.iurexia.com</a></div>
         </div>`,
    ].join('');

    const texto = [
        saludo.replace(/&[a-z]+;/g, ''), '',
        apertura, ...(demora ? ['', demora] : []), '',
        ...queSigue.flatMap(p => [p, '']),
        'Puede responder directamente a este correo: lo lee una persona del equipo.', '',
        'Equipo de soporte · Iurexia', 'soporte@iurexia.com',
    ].join('\n');

    return {
        asunto: folio ? `Su reporte ${folio}: lo recibimos` : 'Recibimos su reporte',
        html: envolver({ cuerpo }),
        texto,
    };
}
