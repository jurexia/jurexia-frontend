/**
 * LAS OCHO RESPUESTAS DE LA ATENCIÓN AUTOMÁTICA (2-nov-2026).
 *
 * Cada plantilla vive aquí, en código, con su texto, sus variables y su
 * versión. Su `sha256` se calcula del TEXTO —asunto, cuerpo, fragmentos,
 * variables y lo común: saludos, cierre, firma y pie—, no de un número que
 * alguien sube a mano: si cambia una coma, cambia el hash, y el cron deja de
 * mandarla hasta que David apruebe la versión nueva en `plantillas_soporte`
 * (ver supabase_atencion_automatica.sql y atencion-automatica.ts).
 *
 * Lo que va entre llaves dobles es una VARIABLE con tipo. Los únicos textos
 * libres que se cuelan en un correo son datos de su cuenta —un folio, una
 * fecha, un número, un correo enmascarado, el nombre del plan—, validados uno
 * por uno al pintar. Lo que se elige según el caso (la causa, el estado) es
 * un FRAGMENTO de la propia plantilla, y por eso entra en el hash: David
 * aprueba todas las variantes de una vez.
 *
 * REGLAS DE LA CASA (~/.claude/CLAUDE.md), y la prueba las vigila:
 *   · salen de soporte@iurexia.com, en plural y de usted, y firman «Soporte
 *     de Iurexia»; nunca una persona ni «el fundador»;
 *   · no nombran proveedores ni modelos;
 *   · no ponen precios —cambian el 3-nov—: mandan a iurexia.com/precios;
 *   · no prometen acciones de una persona con fecha;
 *   · plantilla de la casa: logotipo, Georgia, crema y oro, párrafos justificados.
 *
 * El producto se describe con MAPA_PLATAFORMA y TEMAS de conocimiento.ts, y
 * con las secciones y los capítulos del tutorial de Codigo.gs (soporte@). Donde
 * no coinciden, manda el MAPA: Codigo.gs hablaba de un botón «Plazos» y de
 * avisos fijos que el mapa ya no tiene.
 */

import { createHash } from 'node:crypto';
import { PALETA, esc, envolver, rotulo, boton, nombrePila, PIE_SOPORTE } from '../correo/plantilla';
import type { IdPlantilla, ValorVariable } from './diagnostico-reglas';

export const REMITENTE_ATENCION = 'Soporte de Iurexia <soporte@iurexia.com>';
export const RESPONDER_A = 'soporte@iurexia.com';
export const FIRMA = 'Soporte de Iurexia';

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Arial,Helvetica,sans-serif';

/** El cierre de todas, salvo T6, que pide responder si la respuesta no aparece. */
const CIERRE = 'Si esto no resuelve su caso, responda a este correo: llega al equipo de soporte con su folio.';
const REFERENCIA = 'Referencia: su mensaje a soporte del {{fecha_reporte}} · folio {{folio}}';

export type TipoVariable =
    | 'folio' | 'saludo' | 'fecha' | 'fecha-hora' | 'numero' | 'texto' | 'correo-oculto'
    | 'fragmento'     // elige UNO de los fragmentos `nombre.opcion`
    | 'fragmentos';   // elige VARIOS, en orden

export interface DeclaracionVariable {
    tipo: TipoVariable;
    /** Puede quedarse vacía: el bloque no se pinta. */
    opcional?: boolean;
    /** Por qué existe, si no es obvio (lo lee David en el parte y en la vista previa). */
    nota?: string;
}

export interface Plantilla {
    id: IdPlantilla;
    version: number;
    nombre: string;
    asunto: string;
    preencabezado: string;
    titulo: string;
    /** Bloques separados por una línea en blanco. Ver `bloques()`. */
    cuerpo: string;
    fragmentos: Record<string, string>;
    variables: Record<string, DeclaracionVariable>;
}

/* Las que tienen todas: el folio va en el asunto porque el Apps Script de
   soporte@ reconoce los folios por la palabra «folio» (Atencion.gs); si el
   abogado contesta, su respuesta vuelve a abrir el reporte. */
const COMUNES: Record<string, DeclaracionVariable> = {
    folio: { tipo: 'folio' },
    saludo: { tipo: 'saludo' },
    fecha_reporte: { tipo: 'fecha' },
};

const PASOS_RELOJ = [
    '· En Windows: Configuración › Hora e idioma › Fecha y hora › «Establecer la hora automáticamente».',
    '· En Mac: Ajustes del Sistema › General › Fecha y hora › «Ajustar fecha y hora automáticamente».',
    '· En el teléfono: Ajustes › Fecha y hora (en algunos, dentro de General o de Sistema) › hora automática.',
].join('\n');

const RED_DE_OFICINA = 'Si se repite y su red pasa por un proxy o un antivirus que revisa las páginas —algo común en oficinas y tribunales—, '
    + 'pruebe desde otra red, por ejemplo con los datos de su teléfono.';

/** Los capítulos del tutorial (5:23). Mismos segundos que CAPITULOS de TutorialNuevoChat.tsx: la prueba lo coteja. */
export const CAPITULOS_TUTORIAL: Array<[string, number]> = [
    ['La consulta: fuentes y esfuerzo', 20.2],
    ['Carpetas inteligentes', 58.73],
    ['Flujos de trabajo', 99.7],
    ['Bóveda', 166.4],
    ['Agenda y plazos', 205.23],
    ['Mis plantillas', 246.47],
    ['Herramientas de Platinum', 285.1],
];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const capitulo = (titulo: string) => {
    const c = CAPITULOS_TUTORIAL.find(([t]) => t === titulo)!;
    return `[video] ${c[0]} (${mmss(c[1])}) | https://www.iurexia.com/tutorial?t=${c[1]}`;
};

export const PLANTILLAS: Record<IdPlantilla, Plantilla> = {
    /* ── T1 · 37 de 90: la consulta jurídica escrita en la caja de soporte ── */
    T1: {
        id: 'T1', version: 1, nombre: 'Consulta jurídica en la caja de soporte',
        asunto: 'Soporte Iurexia · folio {{folio}} · dónde se hacen las consultas jurídicas',
        preencabezado: 'Su pregunta jurídica tiene su lugar: la caja de consulta del chat.',
        titulo: 'Dónde se hace su consulta jurídica',
        cuerpo: ['{{saludo}}', '{{apertura}}', '{{situacion}}', '{{nota_folio}}',
            '[boton] Ir a la caja de consulta | https://www.iurexia.com/chat', CIERRE].join('\n\n'),
        fragmentos: {
            'apertura.chat': 'Le escribimos por el mensaje que dejó en el botón «Soporte» de Iurexia. Ese botón atiende dudas y fallas de la '
                + 'plataforma, así que ahí su pregunta jurídica no recibe el análisis que merece. Las consultas se escriben en la caja de '
                + 'consulta del chat, la caja grande al centro de la pantalla: ahí Iurexia le responde con leyes y jurisprudencia, y cada '
                + 'cita abre su fuente oficial.',
            'apertura.correo': 'Le escribimos por su correo a soporte. Este buzón atiende dudas y fallas de la plataforma, así que por aquí no '
                + 'podemos analizar su asunto. Las consultas se escriben en la caja de consulta del chat de Iurexia: ahí la plataforma le '
                + 'responde con leyes y jurisprudencia, y cada cita abre su fuente oficial.',
            'situacion.con-consultas': 'Consultas disponibles hoy en su cuenta: {{consultas_restantes}}. Entre a '
                + '[www.iurexia.com/chat](https://www.iurexia.com/chat) y escriba ahí su pregunta; si necesita un escrito, pídalo igual, '
                + 'por ejemplo: «Redacta una demanda de…».',
            'situacion.sin-consultas': 'Las consultas de su plan de este periodo ya se usaron. Mientras se renuevan, la versión básica del chat '
                + 'le sigue respondiendo con criterios del Semanario Judicial de la Federación y su registro digital. Si necesita el análisis '
                + 'completo —con leyes, documentos y escritos—, los planes están en [www.iurexia.com/precios](https://www.iurexia.com/precios).',
            'situacion.sin-cuenta': 'Para hacerlo necesita una cuenta: entre a [www.iurexia.com](https://www.iurexia.com) y regístrese con su '
                + 'correo. El registro es gratuito y no pide tarjeta.',
            'nota_folio.si': 'Una aclaración sobre el número que le dio el asistente de soporte, {{folio}}: es el folio de su reporte. Sirve '
                + 'para darle seguimiento, y no hay que anotarlo ni anexarlo en ninguna parte.',
        },
        variables: {
            ...COMUNES,
            apertura: { tipo: 'fragmento' },
            situacion: { tipo: 'fragmento' },
            nota_folio: { tipo: 'fragmento', opcional: true, nota: 'el número que dio el chat de soporte era el folio (caso del 2-nov)' },
            consultas_restantes: { tipo: 'numero', opcional: true },
        },
    },

    /* ── T2 · 13 de 90: cómo se usa algo ── */
    T2: {
        id: 'T2', version: 1, nombre: 'Cómo se usa',
        asunto: 'Soporte Iurexia · folio {{folio}} · cómo se hace en la plataforma',
        preencabezado: 'Los pasos, y el capítulo del tutorial donde se ve.',
        titulo: 'Cómo se hace en Iurexia',
        cuerpo: ['{{saludo}}',
            'Con gusto le explicamos. Aquí tiene los pasos y, cuando lo hay, el capítulo del tutorial donde se ve en la plataforma.',
            '{{secciones}}', CIERRE].join('\n\n'),
        fragmentos: {
            'secciones.tutorial': ['## El tutorial de la plataforma',
                'En cinco minutos recorre cada herramienta sobre la plataforma real. Cada capítulo empieza justo donde se explica la función:',
                CAPITULOS_TUTORIAL.map(([t, s]) => `· [${t} (${mmss(s)})](https://www.iurexia.com/tutorial?t=${s})`).join('\n')].join('\n\n'),
            'secciones.consulta': ['## Cómo hacer una consulta', [
                '· En [www.iurexia.com/chat](https://www.iurexia.com/chat) escriba su consulta en la caja del centro, o pida un escrito: «Redacta una demanda de…». Enter envía; Mayús+Enter salta de línea.',
                '· Con «Fuentes», abajo a la izquierda, elige dónde busca: Bloque de constitucionalidad, Jurisprudencia nacional, Leyes federales y Leyes estatales. Desde el plan Pro suma Internet, con sitios oficiales.',
                '· Si pide un escrito, «Esfuerzo» elige con qué fuerza se redacta.',
                '· Cada respuesta trae sus fuentes, y cada cita abre la suya para que la verifique.',
            ].join('\n'), capitulo('La consulta: fuentes y esfuerzo')].join('\n\n'),
            'secciones.escrito': ['## Cómo pedir un escrito', [
                '· En la caja de consulta del chat, pídalo con sus datos: «Redacta una demanda de…».',
                '· O use «Escrito legal», en «Desplegar herramientas», bajo la caja: es un formulario para demanda, amparo, impugnación, contrato, petición u oficio y denuncia disciplinaria.',
                '· El texto completo se abre en el panel «Documento», a la derecha. Ahí lo edita, y el botón azul «Word» lo descarga con las citas como notas al pie.',
            ].join('\n')].join('\n\n'),
            'secciones.documento': ['## Cómo pedir el análisis de un documento', [
                '· En la caja de consulta del chat pulse el clip, o arrastre el archivo a la ventana. Se adjunta un documento por consulta: PDF o Word (.doc o .docx).',
                '· Escriba qué necesita del documento —un resumen, los riesgos, una contestación— y envíe.',
                '· Cada plan lee hasta cierto número de hojas; si su documento tiene más, divídalo y adjunte cada parte en su propia consulta.',
            ].join('\n')].join('\n\n'),
            'secciones.historial': ['## Dónde están sus consultas anteriores', [
                '· En la barra izquierda. Las que no están en una carpeta aparecen en «Consultas», por fecha; las que movió a una carpeta, dentro de esa carpeta al desplegarla.',
                '· Con más de seis consultas sale arriba un buscador.',
                '· El menú de cada consulta permite renombrarla, moverla a una carpeta o eliminarla.',
                '· En el teléfono, la barra se abre con el botón de menú, arriba a la izquierda.',
            ].join('\n')].join('\n\n'),
            'secciones.movil': ['## Iurexia en el teléfono', [
                '· Abra [www.iurexia.com](https://www.iurexia.com) en el navegador de su teléfono y entre con la misma cuenta: sus consultas y sus carpetas son las mismas que en la computadora.',
                '· La barra izquierda se abre con el botón de menú, arriba a la izquierda, y lo que no cabe en la barra de arriba está en «Más».',
                '· La consulta y el documento se alternan con las pestañas «Consulta» y «Documento».',
            ].join('\n')].join('\n\n'),
            'secciones.contador': ['## Cuántas consultas le quedan', [
                '· El contador «usadas/límite» está arriba a la derecha; en pantallas angostas se oculta para dejar sitio.',
                '· También lo ve en el menú de su foto, arriba a la derecha, y en su perfil, pestaña «Plan y pagos».',
                '· Las consultas del plan se cuentan por mes.',
            ].join('\n')].join('\n\n'),
            'secciones.carpetas': ['## Cómo crear y usar sus carpetas', [
                '· Entre a «Mi trabajo», en la barra de arriba, o directamente a [www.iurexia.com/carpetas](https://www.iurexia.com/carpetas), y cree una carpeta nueva.',
                '· Elija el tipo —Cliente, Asunto o juicio, Proyecto académico o Documento legal— y escriba su objetivo.',
                '· Suba los documentos del asunto; cada documento que sube cuenta una consulta.',
                '· En «Lo que ve Iurexia» está el análisis de la carpeta; actualizarlo cuenta una consulta.',
                '· Con «Nueva consulta aquí» pregunta con el expediente a la vista, y la consulta queda guardada en la carpeta.',
            ].join('\n'), capitulo('Carpetas inteligentes')].join('\n\n'),
            'secciones.agenda': ['## Cómo usar la agenda de términos', [
                '· Abra «Agenda», en la barra de arriba, o [www.iurexia.com/agenda](https://www.iurexia.com/agenda), y pulse «Nuevo término».',
                '· Pegue el acuerdo y pulse «Leer el acuerdo»: le propone qué hay que hacer, el código que rige y el vencimiento calculado, y usted lo puede corregir. También puede capturarlo a mano: expediente, juzgado o tribunal, fecha y tipo de notificación.',
                '· En «Avisarme por correo» elija con cuántos días de anticipación quiere el aviso. Los avisos salen cada mañana a las 7:00, hora de la Ciudad de México.',
            ].join('\n'), capitulo('Agenda y plazos')].join('\n\n'),
            'secciones.seguimiento': ['## Cómo dar de alta el seguimiento de un expediente', [
                '· En «Mis carpetas», abra la pestaña «Seguimiento ante órganos jurisdiccionales».',
                '· Registre el expediente: el órgano, el tipo de asunto y su número. Por ahora se siguen órganos del Poder Judicial de la Federación.',
                '· Se revisa cada día a las 9:10, hora de la Ciudad de México, y le llega un correo sólo si hay algo nuevo.',
            ].join('\n')].join('\n\n'),
            'secciones.flujos': ['## Cómo usar los flujos de trabajo', [
                '· En la barra izquierda abra «Flujos de trabajo» y elija uno: amparo indirecto, amparo directo, contestación de demanda, agravios de apelación, revisión de contrato, teoría del caso (penal acusatorio) o investigación y dictamen.',
                '· Describa su encargo: el flujo construye el escrito por pasos, le muestra lo que ya dedujo y le pide lo que falta.',
                '· Iniciar un flujo gasta uno de los flujos del mes y ninguna consulta. Los flujos están disponibles desde el plan Pro.',
                '· Una denuncia, una querella o cualquier otro escrito no es un flujo: se pide en el chat («Redacta…») o con «Escrito legal», en «Desplegar herramientas».',
            ].join('\n'), capitulo('Flujos de trabajo')].join('\n\n'),
            'secciones.boveda': ['## Cómo usar la Bóveda', [
                '· La Bóveda es del plan Platinum y de los planes que lo incluyen. Vive dentro de cada carpeta.',
                '· Suba ahí los documentos del expediente, hasta 500 por carpeta.',
                '· Pregunte al expediente completo: cada respuesta cita el documento y la página. En las tablas de revisión, cada documento es una fila y cada pregunta una columna, con la cita literal verificada.',
            ].join('\n'), capitulo('Bóveda')].join('\n\n'),
            'secciones.plantillas': ['## Cómo usar sus plantillas', [
                '· Suba a «Mis plantillas» el formato de su despacho, en Word.',
                '· Iurexia marca los datos que cambian de un asunto a otro —el nombre del cliente, el domicilio, la fecha— y usted decide de dónde se llena cada uno.',
                '· Desde la carpeta de cualquier cliente elija la plantilla y obtenga el documento lleno, con su membrete, sus estilos y sus tablas, sin gastar consultas.',
            ].join('\n'), capitulo('Mis plantillas')].join('\n\n'),
            'secciones.redactor': ['## El Redactor PJF', [
                '· Es el taller que redacta un proyecto de sentencia a partir del expediente: adelanto, acervo, criterio del secretario y proyecto.',
                '· Es del plan Ultra Secretarios; Platinum no lo incluye. Cada cuenta tiene un proyecto de prueba sin costo y sin tarjeta.',
                '· El botón «Redactor PJF» está en la barra de arriba; en pantallas angostas, dentro de «Más».',
            ].join('\n')].join('\n\n'),
            'secciones.herramientas': ['## Las herramientas', [
                '· Bajo la caja de consulta, «Desplegar herramientas» abre seis: Escrito legal, Sentencia, Precedentes, Jurimetría, Cronología y Toulmin.',
                '· Escrito legal es de todos los planes. Las otras cinco son del plan Platinum y de los planes que lo incluyen; en los demás se ven con candado.',
                '· Sentencia audita una resolución ajena frente a los precedentes de su tribunal y entrega una nota exportable a Word; Precedentes busca criterios del Poder Judicial de la Federación; Jurimetría estima el sentido probable de un asunto; Cronología ordena los hechos del expediente con la página de cada uno, y Toulmin construye una demanda o un recurso en cinco pasos.',
            ].join('\n'), capitulo('Herramientas de Platinum')].join('\n\n'),
            'secciones.entidad': ['## La entidad y el derecho federal', [
                '· El botón con el nombre de su entidad, en la barra de arriba (en el teléfono, dentro de «Más»), dice qué leyes estatales se consultan. Lista las 32 entidades; no hay una opción «Federal».',
                '· Para trabajar sólo con derecho federal, abra «Fuentes», abajo a la izquierda de la caja de consulta, y apague «Leyes estatales».',
                '· Su elección de fuentes se queda guardada en ese navegador.',
            ].join('\n')].join('\n\n'),
            'secciones.plan-y-pagos': ['## Su plan y sus pagos', [
                '· En su perfil, pestaña «Plan y pagos», está su suscripción, con «Actualizar Plan» para cambiarla.',
                '· «Portal de Facturación» abre sus pagos: la tarjeta con la que se cobra y sus comprobantes.',
                '· Ahí mismo se capturan sus datos fiscales.',
            ].join('\n')].join('\n\n'),
        },
        variables: { ...COMUNES, secciones: { tipo: 'fragmentos' } },
    },

    /* ── T3 · 6 de 90: contratar, o pagar sin tarjeta ── */
    T3: {
        id: 'T3', version: 1, nombre: 'Contratar o pagar sin tarjeta',
        asunto: 'Soporte Iurexia · folio {{folio}} · cómo contratar su plan',
        preencabezado: 'Los planes, cómo se pagan y cómo se activan.',
        titulo: 'Cómo contratar su plan',
        cuerpo: ['{{saludo}}', '{{situacion}}', '{{sin_tarjeta}}', '{{contacto}}',
            '[boton] Ver los planes | https://www.iurexia.com/precios', CIERRE].join('\n\n'),
        fragmentos: {
            'situacion.contratar': 'Con gusto. Los planes, con lo que incluye cada uno y sus precios vigentes, están en '
                + '[www.iurexia.com/precios](https://www.iurexia.com/precios). Ahí elige el plan y paga con tarjeta de crédito o débito, y el '
                + 'plan se activa en el momento en la cuenta con la que entró.',
            'situacion.cambiar': 'Su cuenta tiene hoy el plan {{plan}}. Para cambiarlo, entre a su perfil, pestaña «Plan y pagos», y pulse '
                + '«Actualizar Plan». Subir de plan es inmediato; bajar aplica en el siguiente ciclo. Lo que incluye cada plan, con sus precios '
                + 'vigentes, está en [www.iurexia.com/precios](https://www.iurexia.com/precios).',
            // La política de David (2-nov-2026): enlace de pago o transferencia; los datos los manda él.
            'sin_tarjeta.si': 'Si prefiere no pagar con tarjeta, también puede hacerlo con un enlace de pago o por transferencia. Respóndanos a '
                + 'este correo con el plan que le interesa y la forma de pago que prefiere, y le enviamos los datos para hacerlo.',
            'contacto.si': 'La atención de soporte es por escrito: en este mismo correo y en el botón «Soporte» de la plataforma, que contesta '
                + 'al momento las dudas de uso.',
        },
        variables: {
            ...COMUNES,
            situacion: { tipo: 'fragmento' },
            sin_tarjeta: { tipo: 'fragmento', opcional: true },
            contacto: { tipo: 'fragmento', opcional: true, nota: 'pidió teléfono o WhatsApp' },
            plan: { tipo: 'texto', opcional: true },
        },
    },

    /* ── T4 · 10 de 90: pagué y no se activó, pago rechazado, cuenta suspendida ── */
    T4: {
        id: 'T4', version: 1, nombre: 'Pagué y no se activó (estado verificado)',
        asunto: 'Soporte Iurexia · folio {{folio}} · lo que encontramos sobre su pago',
        preencabezado: 'Revisamos su cuenta y su cobro.',
        titulo: 'Lo que encontramos sobre su pago',
        cuerpo: ['{{saludo}}', '{{estado}}', CIERRE].join('\n\n'),
        fragmentos: {
            'estado.activo': 'Revisamos su cuenta: el pago se registró y su plan {{plan}} está activo en la cuenta {{correo_oculto}}. Si la '
                + 'pantalla todavía le muestra el plan anterior, cierre sesión —en el menú de su foto, arriba a la derecha, «Cerrar sesión»— y '
                + 'vuelva a entrar: al entrar de nuevo se carga el plan vigente.',
            'estado.otra-cuenta': 'Revisamos su cuenta: el plan está activo, pero en otra cuenta, la de {{correo_oculto}}. Es su mismo buzón de '
                + 'correo escrito de otra forma —con puntos o con «+»—, y para Iurexia son dos cuentas distintas. Salga de esta sesión y entre '
                + 'con esa dirección exacta: ahí están su plan, sus consultas y sus carpetas. Si prefiere quedarse con la cuenta con la que nos '
                + 'escribió, respóndanos a este correo y lo vemos con usted.',
            'estado.suspendida': 'Revisamos su cuenta: el último cobro de su suscripción fue rechazado por su banco, y por eso la cuenta quedó '
                + 'suspendida. No ha perdido nada: su plan, sus consultas y sus carpetas siguen intactos. Entre a '
                + '[www.iurexia.com](https://www.iurexia.com) y, en el aviso «Cuenta suspendida por falta de pago», pulse «Actualizar mi método '
                + 'de pago» para dar de alta una tarjeta. Si ya la había dado de alta, basta con volver a entrar: al abrirse el aviso, el cobro '
                + 'se intenta solo con la tarjeta nueva, y en cuanto pasa la cuenta se reactiva.',
            'estado.pendiente': 'Revisamos su cuenta: el cobro de su plan quedó pendiente y no se completó, así que el plan no se activó. Puede '
                + 'intentarlo de nuevo en [www.iurexia.com/precios](https://www.iurexia.com/precios), con la misma tarjeta o con otra; si su '
                + 'banco le pide confirmar la compra, autorícela en su aplicación. Si prefiere no pagar con tarjeta, respóndanos a este correo '
                + 'y le enviamos los datos para pagar con un enlace de pago o por transferencia.',
            'estado.sin-pago': 'Revisamos su cuenta, la de {{correo_oculto}}, y no encontramos ningún cobro asociado a ella. Si pagó con otro '
                + 'correo, respóndanos a este correo indicándonos cuál, y lo cotejamos.',
        },
        variables: {
            ...COMUNES,
            estado: { tipo: 'fragmento' },
            plan: { tipo: 'texto', opcional: true },
            correo_oculto: { tipo: 'correo-oculto', opcional: true },
        },
    },

    /* ── T5 · 6 de 90: no puedo entrar ── */
    T5: {
        id: 'T5', version: 1, nombre: 'No puedo entrar (según la causa)',
        asunto: 'Soporte Iurexia · folio {{folio}} · cómo volver a entrar',
        preencabezado: 'Revisamos los accesos de su cuenta.',
        titulo: 'Cómo volver a entrar',
        cuerpo: ['{{saludo}}', '{{causa}}', CIERRE].join('\n\n'),
        fragmentos: {
            'causa.reloj-desfase': ['Revisamos los accesos de su cuenta y su contraseña funciona: cada vez que entra, el acceso se concede. '
                + 'Lo que falla es el reloj de su equipo, que va {{desfase}} respecto de la hora real: con esa diferencia, la sesión se da por '
                + 'vencida en el mismo segundo en que se abre. Ponga la fecha y la hora en automático y vuelva a entrar:', PASOS_RELOJ].join('\n\n'),
            'causa.reloj': ['Revisamos los accesos de su cuenta y su contraseña funciona: cada vez que entra, el acceso se concede, pero la '
                + 'sesión se cierra sola en cuestión de segundos. Eso pasa casi siempre cuando el reloj del equipo no está en hora: la sesión se '
                + 'da por vencida en el mismo segundo en que se abre. Ponga la fecha y la hora en automático, cierre las demás pestañas de '
                + 'Iurexia y vuelva a entrar:', PASOS_RELOJ].join('\n\n'),
            'causa.suspendida': 'Su contraseña y su cuenta están bien: lo que ve al entrar es el aviso «Cuenta suspendida por falta de pago», '
                + 'porque el último cobro de su suscripción fue rechazado por su banco. Pulse «Actualizar mi método de pago» y dé de alta una '
                + 'tarjeta: en cuanto el cobro pasa, la cuenta se reactiva sola, con su plan y sus carpetas intactos.',
            'causa.otra-cuenta': 'Revisamos su acceso: con su correo hay dos cuentas en Iurexia, porque {{correo_oculto}} es su mismo buzón '
                + 'escrito de otra forma —con puntos o con «+»—. Si al entrar no ve sus consultas o su plan, salga y entre escribiendo la '
                + 'dirección exactamente como la de la otra cuenta. Lo más rápido es «Entrar con un código por correo», en la pantalla de '
                + 'acceso: le llega un código y no necesita contraseña.',
            'causa.contrasena': ['Revisamos su cuenta y está activa. En la pantalla de acceso tiene dos caminos que no dependen de recordar la '
                + 'contraseña:', [
                '· «Entrar con un código por correo»: le llega un código a su correo y no necesita contraseña.',
                '· «¿Olvidaste tu contraseña?»: le manda un enlace para poner una nueva. Ábralo en el mismo navegador donde lo pidió, porque en otro el enlace falla.',
            ].join('\n'), 'Si creó su cuenta con uno de los botones de acceso rápido, entre con ese mismo botón. Y si entra desde el teléfono, '
                + 'revise que el teclado no haya puesto mayúscula inicial ni un espacio al final de su correo.'].join('\n\n'),
        },
        variables: {
            ...COMUNES,
            causa: { tipo: 'fragmento' },
            desfase: { tipo: 'texto', opcional: true, nota: '«unas 9 horas adelantado», de la cabecera Date de su correo' },
            correo_oculto: { tipo: 'correo-oculto', opcional: true },
        },
    },

    /* ── T6 · 5 de 90: el chat cortado o la respuesta que no llegó ── */
    T6: {
        id: 'T6', version: 1, nombre: 'Respuesta cortada',
        asunto: 'Soporte Iurexia · folio {{folio}} · dónde quedó su respuesta',
        preencabezado: 'Revisamos su consulta que no llegó.',
        titulo: 'Dónde quedó su respuesta',
        cuerpo: ['{{saludo}}', '{{estado}}', '{{devolucion}}',
            'Si su respuesta no aparece, responda a este correo: llega al equipo de soporte con su folio.'].join('\n\n'),
        fragmentos: {
            'estado.recuperable': 'Tiene razón: la respuesta no llegó a su pantalla. Revisamos su consulta del {{fecha_consulta}} y la respuesta '
                + 'sí se terminó de escribir: quedó guardada. Abra [www.iurexia.com/chat](https://www.iurexia.com/chat) con su cuenta —en este '
                + 'equipo o en cualquier otro— y aparece sola en su conversación; si ya tenía la página abierta, recárguela.',
            'estado.en-historial': 'Revisamos su consulta del {{fecha_consulta}}: la respuesta se terminó y ya está en su historial. La encuentra '
                + 'en la barra izquierda, en «Consultas» —o dentro de la carpeta donde la hizo—, con esa fecha.',
            'estado.a-medias': `Tiene razón: su consulta del {{fecha_consulta}} se interrumpió antes de terminar. Lo que alcanzó a escribirse quedó en su conversación; para la respuesta completa, vuelva a enviarla. ${RED_DE_OFICINA}`,
            'estado.sin-texto': `Tiene razón: su consulta del {{fecha_consulta}} se interrumpió antes de que se escribiera la respuesta. Vuelva a enviarla. ${RED_DE_OFICINA}`,
        },
        variables: {
            ...COMUNES,
            estado: { tipo: 'fragmento' },
            fecha_consulta: { tipo: 'fecha-hora' },
            /* POLÍTICA DE COBRO SIN APROBAR (2-nov-2026): devolver la consulta
               que se cortó. La variable se queda sin fragmentos —y vacía—
               hasta que David apruebe la política; entonces se escribe aquí
               su texto, cambia el hash y T6 se aprueba de nuevo. */
            devolucion: { tipo: 'fragmento', opcional: true, nota: 'vacía: devolver la consulta es política sin aprobar' },
        },
    },

    /* ── T7 · 4 de 90: el documento que no se analizó ── */
    T7: {
        id: 'T7', version: 1, nombre: 'Documento que no se analizó',
        asunto: 'Soporte Iurexia · folio {{folio}} · por qué no se analizó su documento',
        preencabezado: 'Revisamos el documento que no se analizó.',
        titulo: 'Su documento sin analizar',
        cuerpo: ['{{saludo}}', '{{causa}}', CIERRE].join('\n\n'),
        fragmentos: {
            'causa.red': `Tiene razón: su documento no se analizó, y no fue por el archivo. La conexión se cortó mientras se enviaba el documento o mientras llegaba el análisis. Vuelva a adjuntarlo con el clip de la caja de consulta y envíelo. ${RED_DE_OFICINA}`,
            'causa.texto': 'Su documento no se analizó porque no se pudo leer su texto: suele pasar con escaneos de baja calidad o con imágenes '
                + 'guardadas como PDF. Ábralo y use «Guardar como» › PDF, o escanéelo de nuevo a 300 ppp, y adjunte ese PDF.',
            'causa.formato': 'Su documento no se analizó porque el archivo no se pudo abrir como PDF ni como Word: suele pasar cuando está dañado '
                + 'o cuando su extensión no corresponde a su formato. Ábralo en su procesador de textos, use «Guardar como» › PDF y adjunte ese PDF.',
            'causa.hojas': 'Su documento no se analizó por su extensión: tiene {{hojas_documento}} hojas y su plan lee hasta {{hojas_plan}}. '
                + 'Puede dividirlo y adjuntar cada parte en su propia consulta; en [www.iurexia.com/precios](https://www.iurexia.com/precios) ve '
                + 'qué plan lo lee completo.',
            'causa.tamano': 'Su documento no se analizó por su tamaño. Puede dividirlo y adjuntar cada parte en su propia consulta; en '
                + '[www.iurexia.com/precios](https://www.iurexia.com/precios) ve qué plan lee documentos de ese tamaño.',
            'causa.cuota': 'Su documento no se analizó porque las consultas de su plan de este periodo ya se habían usado, y no se le descontó '
                + 'nada. Los planes están en [www.iurexia.com/precios](https://www.iurexia.com/precios).',
            'causa.fallo': 'Tiene razón: su documento no se analizó por un fallo de la plataforma, no por el archivo. Vuelva a adjuntarlo con el '
                + 'clip de la caja de consulta y envíelo; si falla de nuevo, responda a este correo con la hora aproximada y el tipo de '
                + 'documento, y lo revisamos.',
            'causa.sin-rastro': 'Revisamos su cuenta y no encontramos el error de su documento. Lo más común es una de tres cosas: que la conexión '
                + 'se cortara al enviarlo (vuelva a adjuntarlo y envíelo), que el archivo no sea PDF ni Word (use «Guardar como» › PDF) o que '
                + 'tenga más hojas de las que lee su plan (divídalo y adjunte cada parte en su propia consulta).',
        },
        variables: {
            ...COMUNES,
            causa: { tipo: 'fragmento' },
            hojas_documento: { tipo: 'numero', opcional: true },
            hojas_plan: { tipo: 'numero', opcional: true },
        },
    },

    /* ── T8 · 5 de 90: cancelar ── */
    T8: {
        id: 'T8', version: 1, nombre: 'Cancelar (autoservicio)',
        asunto: 'Soporte Iurexia · folio {{folio}} · cómo cancelar su suscripción',
        preencabezado: 'Se cancela desde su perfil, en un minuto.',
        titulo: 'Cómo cancelar su suscripción',
        cuerpo: ['{{saludo}}', '{{estado}}', '{{por_peticion}}', CIERRE].join('\n\n'),
        fragmentos: {
            'estado.pasos': ['Puede cancelarla usted mismo, en un minuto y sin hablar con nadie:', [
                '· Entre a su perfil —también desde el menú de su foto, arriba a la derecha— y abra la pestaña «Plan y pagos».',
                '· En la tarjeta «Mi suscripción», pulse «Cancelar mi suscripción».',
                '· Le preguntará el motivo y, según el caso, le ofrecerá pausar un mes sin cargo; «Cancelar de todas formas» está siempre a la vista.',
            ].join('\n'), '{{fin}}'].join('\n\n'),
            'fin.con-fecha': 'Conserva el acceso hasta el {{fin_periodo}}, fin del periodo que ya pagó, y no se le vuelve a cobrar. Su cuenta, sus '
                + 'consultas y sus carpetas no se borran.',
            'fin.sin-fecha': 'Conserva el acceso hasta el fin del periodo que ya pagó, y no se le vuelve a cobrar. Su cuenta, sus consultas y sus '
                + 'carpetas no se borran.',
            'estado.ya-cancelada': 'Revisamos su suscripción y ya está cancelada: conserva el acceso hasta el {{fin_periodo}} y después no se le '
                + 'vuelve a cobrar. No tiene que hacer nada más; su cuenta, sus consultas y sus carpetas no se borran.',
            'estado.sin-suscripcion': 'Revisamos su cuenta y no tiene ninguna suscripción activa: no hay nada que cancelar y no se le hará '
                + 'ningún cargo.',
        },
        variables: {
            ...COMUNES,
            estado: { tipo: 'fragmento' },
            fin: { tipo: 'fragmento', opcional: true },
            fin_periodo: { tipo: 'fecha', opcional: true },
            /* POLÍTICA DE COBRO SIN APROBAR (2-nov-2026): cancelar a petición del
               abogado, a fin de periodo. Sin fragmentos hasta que David la
               apruebe; entonces se escribe aquí y T8 se aprueba de nuevo. */
            por_peticion: { tipo: 'fragmento', opcional: true, nota: 'vacía: cancelar por petición es política sin aprobar' },
        },
    },
};

/* ─────────────────────────── el hash ─────────────────────────── */

/** Saludos posibles: los mismos del acuse del circuito de incidencias. */
export const SALUDOS = ['Estimada licenciada {nombre}:', 'Estimado licenciado {nombre}:', 'Apreciable Lic. {nombre}:', 'Estimada, estimado:'];

/** Lo que firma y cierra todas: también entra en el hash de cada una. */
const COMUN_CANONICO = [
    `REFERENCIA: ${REFERENCIA}`,
    `SALUDOS: ${SALUDOS.join(' | ')}`,
    'DESPEDIDA: Atentamente,',
    `FIRMA: ${FIRMA}`,
    `REMITENTE: ${REMITENTE_ATENCION} · RESPONDER A: ${RESPONDER_A}`,
    `PIE: ${PIE_SOPORTE}`,
].join('\n');

/** El texto exacto que se aprueba: legible, para que David lo lea en `plantillas_soporte.texto`. */
export function textoCanonico(p: Plantilla): string {
    const fragmentos = Object.keys(p.fragmentos).sort().map(k => `FRAGMENTO ${k}:\n${p.fragmentos[k]}`);
    const variables = Object.keys(p.variables).sort()
        .map(k => `${k} (${p.variables[k].tipo}${p.variables[k].opcional ? ', opcional' : ''})`);
    return [
        `PLANTILLA ${p.id} · versión ${p.version} · ${p.nombre}`,
        `ASUNTO: ${p.asunto}`,
        `PREENCABEZADO: ${p.preencabezado}`,
        `TÍTULO: ${p.titulo}`,
        `CUERPO:\n${p.cuerpo}`,
        ...fragmentos,
        `VARIABLES: ${variables.join(', ')}`,
        COMUN_CANONICO,
    ].join('\n\n');
}

export function sha256(texto: string): string {
    return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export interface Huella { id: IdPlantilla; version: number; sha256: string }

export function huella(p: Plantilla): Huella {
    return { id: p.id, version: p.version, sha256: sha256(textoCanonico(p)) };
}

export function huellas(): Huella[] {
    return (Object.keys(PLANTILLAS) as IdPlantilla[]).map(id => huella(PLANTILLAS[id]));
}

/* ─────────────────────────── el saludo ─────────────────────────── */

/** Las letras de un nombre de pila en español (sin la bandera «u», que el tsconfig sin `target` no admite). */
const LETRAS = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'-]";

/** Mismo criterio que `correoAcuse`: sin nombre en el perfil no se usa el del correo («Lic. jperez83»). */
export function saludoPara(nombre: string | null | undefined, tratamiento: string | null | undefined, correo = ''): string {
    const pila = nombre?.trim() ? nombrePila(nombre, correo) : '';
    const limpio = pila ? pila.charAt(0).toUpperCase() + pila.slice(1).toLowerCase() : '';
    if (!limpio || !new RegExp(`^${LETRAS}{2,30}$`).test(limpio)) return 'Estimada, estimado:';
    if (tratamiento === 'licenciada') return `Estimada licenciada ${limpio}:`;
    if (tratamiento === 'licenciado') return `Estimado licenciado ${limpio}:`;
    return `Apreciable Lic. ${limpio}:`;
}

/* ─────────────────────────── pintar ─────────────────────────── */

export class ErrorDePlantilla extends Error { }

const RX_SALUDO = new RegExp(`^(Estimada licenciada ${LETRAS}{2,30}|Estimado licenciado ${LETRAS}{2,30}|Apreciable Lic\\. ${LETRAS}{2,30}|Estimada, estimado):$`);
const RX_FOLIO = /^(\d{1,6}-\d{2}|R-[0-9a-z]{1,10})$/;

const FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' });
const DIA_MES = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' });
const HORA = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' });

/** Un valor de variable ya validado y escrito como texto (sin escapar todavía). */
function valorComoTexto(nombre: string, d: DeclaracionVariable, v: ValorVariable): string {
    const malo = (por: string) => new ErrorDePlantilla(`variable «${nombre}» (${d.tipo}): ${por}`);
    switch (d.tipo) {
        case 'folio':
            if (typeof v !== 'string' || !RX_FOLIO.test(v)) throw malo(`folio inválido ${JSON.stringify(v)}`);
            return v;
        case 'saludo':
            if (typeof v !== 'string' || !RX_SALUDO.test(v)) throw malo(`saludo fuera de las fórmulas: ${JSON.stringify(v)}`);
            return v;
        case 'fecha':
        case 'fecha-hora': {
            const t = typeof v === 'string' ? Date.parse(v) : NaN;
            if (!Number.isFinite(t)) throw malo(`fecha ilegible ${JSON.stringify(v)}`);
            const f = new Date(t);
            return d.tipo === 'fecha' ? FECHA.format(f) : `${DIA_MES.format(f)} a las ${HORA.format(f)}`;
        }
        case 'numero':
            if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100_000) throw malo(`número inválido ${JSON.stringify(v)}`);
            return v.toLocaleString('es-MX');
        case 'correo-oculto':
            if (typeof v !== 'string' || !/^[^\s@<>]{1,40}•+@[a-z0-9.-]{3,60}$/i.test(v)) throw malo('no es un correo enmascarado');
            return v;
        case 'texto':
            // Datos cortos de la cuenta (el plan, el desfase): nada de enlaces, correos ni marcado.
            if (typeof v !== 'string' || !v.trim() || v.length > 80 || /[<>@{}\[\]]|https?:|www\./i.test(v)) throw malo(`texto no admitido ${JSON.stringify(v)}`);
            return v;
        default:
            throw malo('no es un valor de texto');
    }
}

interface Bloque {
    tipo: 'parrafo' | 'subtitulo' | 'lista' | 'boton' | 'video';
    texto: string;
    items?: string[];
    url?: string;
}

const RX_VAR = /\{\{([a-z_]+)\}\}/g;
const RX_ENLACE = /\[([^\]]+)\]\((https:\/\/www\.iurexia\.com[^)\s]*)\)/g;

/** El texto de una plantilla, en bloques, con los fragmentos ya resueltos. */
function bloques(p: Plantilla, texto: string, valores: Record<string, ValorVariable>, profundidad = 0): Bloque[] {
    if (profundidad > 3) throw new ErrorDePlantilla(`${p.id}: fragmentos anidados de más`);
    const salida: Bloque[] = [];
    for (const crudo of texto.split(/\n\s*\n/)) {
        const b = crudo.trim();
        if (!b) continue;
        const soloVar = /^\{\{([a-z_]+)\}\}$/.exec(b);
        const decl = soloVar ? p.variables[soloVar[1]] : undefined;
        if (soloVar && decl && (decl.tipo === 'fragmento' || decl.tipo === 'fragmentos')) {
            const nombre = soloVar[1];
            const v = valores[nombre];
            const opciones = decl.tipo === 'fragmentos' ? (Array.isArray(v) ? v : []) : (typeof v === 'string' && v ? [v] : []);
            if (!opciones.length && !decl.opcional) throw new ErrorDePlantilla(`${p.id}: falta el fragmento «${nombre}»`);
            for (const opcion of opciones) {
                const clave = `${nombre}.${opcion}`;
                if (!(clave in p.fragmentos)) throw new ErrorDePlantilla(`${p.id}: no existe el fragmento «${clave}»`);
                salida.push(...bloques(p, p.fragmentos[clave], valores, profundidad + 1));
            }
            continue;
        }
        if (b.startsWith('## ')) { salida.push({ tipo: 'subtitulo', texto: b.slice(3) }); continue; }
        if (b.startsWith('[boton] ') || b.startsWith('[video] ')) {
            const [t, url] = b.slice(8).split(' | ');
            if (!/^https:\/\/www\.iurexia\.com(\/|$)/.test(url || '')) throw new ErrorDePlantilla(`${p.id}: enlace fuera de iurexia.com`);
            salida.push({ tipo: b.startsWith('[boton]') ? 'boton' : 'video', texto: t, url });
            continue;
        }
        const lineas = b.split('\n');
        if (lineas.every(l => l.startsWith('· '))) { salida.push({ tipo: 'lista', texto: '', items: lineas.map(l => l.slice(2)) }); continue; }
        salida.push({ tipo: 'parrafo', texto: lineas.join(' ') });
    }
    return salida;
}

/** Sustituye las variables de valor; `html` escapa y convierte los enlaces. */
function enLinea(p: Plantilla, texto: string, valores: Record<string, ValorVariable>, html: boolean): string {
    const conValores = (s: string, escapar: (x: string) => string) => s.replace(RX_VAR, (_, nombre: string) => {
        const d = p.variables[nombre];
        if (!d) throw new ErrorDePlantilla(`${p.id}: variable sin declarar «${nombre}»`);
        const v = valores[nombre];
        if (v === undefined || v === '') throw new ErrorDePlantilla(`${p.id}: falta el valor de «${nombre}»`);
        return escapar(valorComoTexto(nombre, d, v));
    });
    if (!html) return conValores(texto, x => x).replace(RX_ENLACE, (_, t: string, url: string) =>
        t.startsWith('www.') && url.endsWith(t.slice(4)) ? t : `${t} (${url})`);
    // Primero se escapa el texto fijo y los valores; los enlaces se arman al final
    // y sólo con direcciones de iurexia.com.
    const partes: string[] = [];
    const rx = new RegExp(RX_ENLACE.source, 'g');
    let ultimo = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(texto)) !== null) {
        partes.push(conValores(esc(texto.slice(ultimo, m.index)), esc));
        partes.push(`<a href="${esc(m[2])}" style="color:${PALETA.marron};text-decoration:underline;">${conValores(esc(m[1]), esc)}</a>`);
        ultimo = m.index + m[0].length;
    }
    partes.push(conValores(esc(texto.slice(ultimo)), esc));
    return partes.join('');
}

export interface CorreoPintado {
    asunto: string;
    preencabezado: string;
    html: string;
    texto: string;
    plantilla: Huella;
}

/** El correo completo, listo para mandar. Lanza ErrorDePlantilla si falta o sobra algo. */
export function pintar(id: IdPlantilla, valores: Record<string, ValorVariable>): CorreoPintado {
    const p = PLANTILLAS[id];
    if (!p) throw new ErrorDePlantilla(`no existe la plantilla ${id}`);
    for (const nombre of Object.keys(valores)) {
        if (!p.variables[nombre]) throw new ErrorDePlantilla(`${id}: variable que la plantilla no declara «${nombre}»`);
    }
    const bs = bloques(p, p.cuerpo, valores);
    const asunto = enLinea(p, p.asunto, valores, false);
    const referencia = enLinea(p, REFERENCIA, { ...valores }, false);

    const PARRAFO = 'margin:0 0 20px 0;text-align:justify;';
    const html = bs.map(b => {
        switch (b.tipo) {
            case 'subtitulo':
                return `<div style="font-family:${SERIF};font-size:17px;font-weight:bold;color:${PALETA.tinta};padding:10px 0 10px 0;">${enLinea(p, b.texto, valores, true)}</div>`;
            case 'lista':
                return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PALETA.borde};margin:0 0 20px 0;">${
                    b.items!.map(i => `<tr><td style="padding:10px 0 10px 14px;border-bottom:1px solid ${PALETA.borde};border-left:2px solid ${PALETA.oro};font-family:${SERIF};font-size:14px;line-height:1.6;color:${PALETA.texto};text-align:justify;">${enLinea(p, i, valores, true)}</td></tr>`).join('')
                }</table>`;
            case 'boton':
                return `<div style="margin:4px 0 24px 0;">${boton(b.texto, b.url!)}</div>`;
            case 'video':
                return `<p style="${PARRAFO}">Véalo en video: <a href="${esc(b.url!)}" style="color:${PALETA.marron};text-decoration:underline;">${esc(b.texto)}</a>.</p>`;
            default:
                return `<p style="${PARRAFO}">${enLinea(p, b.texto, valores, true)}</p>`;
        }
    }).join('\n');

    const cuerpo = [
        rotulo(referencia),
        `<div style="font-family:${SERIF};font-size:21px;color:${PALETA.tinta};padding-bottom:20px;">${esc(p.titulo)}</div>`,
        html,
        `<p style="margin:28px 0 0 0;">Atentamente,<br><strong style="color:${PALETA.tinta};">${esc(FIRMA)}</strong></p>`,
        `<div style="font-family:${SANS};font-size:12px;color:${PALETA.apagado};padding-top:6px;">soporte@iurexia.com</div>`,
    ].join('\n');

    const texto = [
        referencia, '',
        ...bs.flatMap(b => {
            switch (b.tipo) {
                case 'subtitulo': return [enLinea(p, b.texto, valores, false).toUpperCase(), ''];
                case 'lista': return [...b.items!.map(i => `· ${enLinea(p, i, valores, false)}`), ''];
                case 'boton': return [`${b.texto}: ${b.url}`, ''];
                case 'video': return [`Véalo en video: ${b.texto} (${b.url})`, ''];
                default: return [enLinea(p, b.texto, valores, false), ''];
            }
        }),
        'Atentamente,', FIRMA, 'soporte@iurexia.com',
        '', '--', PIE_SOPORTE,
    ].join('\n');

    return {
        asunto,
        preencabezado: p.preencabezado,
        html: envolver({ cuerpo, logo: true, pie: PIE_SOPORTE, preencabezado: p.preencabezado }),
        texto,
        plantilla: huella(p),
    };
}

/** Las opciones de cada variable de fragmento, para las vistas previas y la prueba. */
export function opcionesDe(p: Plantilla, variable: string): string[] {
    return Object.keys(p.fragmentos).filter(k => k.startsWith(`${variable}.`)).map(k => k.slice(variable.length + 1));
}
