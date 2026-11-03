/**
 * LAS REGLAS DEL DIAGNÓSTICO, sin base de datos ni red (2-nov-2026).
 *
 * La auditoría del 2-nov midió 14 días de soporte: 90 casos (68 por el chat,
 * 22 por correo), casi ninguno resuelto sin una persona, y la respuesta real
 * tardó una mediana de 4.8 días. Y la mayoría no necesitaba a nadie:
 *
 *   37  consulta jurídica escrita en la caja de soporte
 *   13  cómo se usa algo
 *   10  pagué y no se activó, pago rechazado o cuenta suspendida
 *    6  precio, o pagar sin tarjeta
 *    6  no puedo entrar
 *    5  chat cortado o respuesta que no llegó
 *    5  cancelar
 *    4  documento que no se analiza
 *    1  calidad jurídica
 *
 * Aquí viven las dos mitades del diagnóstico que no tocan nada:
 *
 *   1. `clasificar`: de qué trata el mensaje. Por RAÍCES y sin tildes, igual
 *      que `fichaSinMotor` de conocimiento.ts, porque nadie escribe como el
 *      ejemplo («ya page», «suscripocion», «tuturial»), y en orden: lo del
 *      dinero y la cuenta antes que la consulta jurídica, que casa con
 *      palabras de todo el día («demanda», «escrito»).
 *   2. `decidir`: con los hechos que reunió `diagnostico.ts` (perfil, cobro,
 *      sesiones, respuestas, errores), qué le pasa, qué se le contesta y con
 *      cuánta seguridad. Si no hay seguridad, `tipo: 'humano'`: un correo
 *      equivocado sobre su pago o su cuenta es peor que ninguno.
 *
 * Este módulo NO importa nada a propósito: así se prueba con
 * `node _pruebas/atencion-automatica/prueba.mts` sin levantar Next.
 */

export type Canal = 'chat' | 'correo';

export type TipoCaso =
    | 'consulta-juridica'   // T1
    | 'como-se-usa'         // T2
    | 'contratar'           // T3
    | 'pago'                // T4
    | 'acceso'              // T5
    | 'respuesta-cortada'   // T6
    | 'documento'           // T7
    | 'cancelar'            // T8
    | 'acuse'               // «hola», «gracias»: no hay nada que contestar
    | 'humano';             // lo ve una persona

export type IdPlantilla = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8';

export const PLANTILLA_DE: Partial<Record<TipoCaso, IdPlantilla>> = {
    'consulta-juridica': 'T1', 'como-se-usa': 'T2', contratar: 'T3', pago: 'T4',
    acceso: 'T5', 'respuesta-cortada': 'T6', documento: 'T7', cancelar: 'T8',
};

/** El tipo que corresponde a cada plantilla: un «precio» con la cuenta suspendida se contesta con T4, y es de pago. */
export const TIPO_DE: Record<IdPlantilla, TipoCaso> = {
    T1: 'consulta-juridica', T2: 'como-se-usa', T3: 'contratar', T4: 'pago',
    T5: 'acceso', T6: 'respuesta-cortada', T7: 'documento', T8: 'cancelar',
};

/** Las secciones de «cómo se usa», del MAPA_PLATAFORMA y de Codigo.gs. */
export type SeccionUso =
    | 'tutorial' | 'consulta' | 'escrito' | 'documento' | 'historial' | 'movil' | 'contador'
    | 'carpetas' | 'agenda' | 'seguimiento' | 'flujos' | 'boveda' | 'plantillas' | 'redactor' | 'herramientas'
    | 'entidad' | 'plan-y-pagos';

export interface Marcas {
    /** «Me dieron un número de código, ¿dónde lo anexo?»: era el folio del chat de soporte. */
    folio?: boolean;
    /** Quiere pagar con enlace, transferencia o depósito. */
    sinTarjeta?: boolean;
    /** Pide un teléfono o WhatsApp. */
    contacto?: boolean;
    /** Ya paga y quiere otro plan. */
    cambiarPlan?: boolean;
}

export interface Clasificacion {
    tipo: TipoCaso;
    /** Qué regla casó, para el parte: así se ve por qué se decidió cada cosa. */
    regla: string;
    secciones: SeccionUso[];
    marcas: Marcas;
}

/** Quita tildes, baja a minúsculas y junta espacios: la gente escribe sin acentos. */
export function normalizar(texto: string): string {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[¿¡]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/* ─────────────────────────── 1. CLASIFICAR ─────────────────────────── */

/** Un grupo casa si casan TODAS sus expresiones; una regla, si casa UN grupo. */
type Grupo = RegExp[];

interface Regla {
    nombre: string;
    grupos: Grupo[];
    /* Sólo vale en un mensaje corto o que habla de la plataforma. Sin esto,
       «rescisión por falta de pago de rentas», «que mi ex pague la pensión»,
       «el precio de la compraventa» o «no puedo ingresar al domicilio» —un
       escrito jurídico pegado en la caja de soporte, que es el caso más común—
       se contestaban como un problema de su cuenta. */
    contexto?: boolean;
}

const casaAlguno = (t: string, grupos: Grupo[]) => grupos.some(g => g.every(rx => rx.test(t)));

/** Lo que nombra la plataforma, su plan o su cuenta. */
const PLATAFORMA = /(iurexia|lurexia|plataforma|soporte|gratis|\bchat\b|boton|pestana|pantalla|\bplan\b|planes|suscrip|tarjeta|\bcuenta\b|consultas?\b|\bapp\b|pagina|gratuit|\bpro\b|platinum|basico|premium|servidor|conexion|internet|adjunt|archivo|\bpdf\b|\bword\b)/;
const CORTO = 160;

const conContexto = (t: string) => t.length < CORTO || PLATAFORMA.test(t);
const casaRegla = (t: string, r: Regla) => (!r.contexto || conContexto(t)) && casaAlguno(t, r.grupos);

/* «Hola», «gracias», «ok»: un mensaje hecho SÓLO de estas palabras no pide nada.
   Va por palabras y no por frase entera porque se combinan sin orden: «Enterado,
   muchas gracias por su atención», «hola que tal buena noche». */
const PALABRAS_DE_ACUSE = new Set([
    'hola', 'buen', 'buena', 'buenas', 'bueno', 'buenos', 'dia', 'dias', 'tarde', 'tardes', 'noche', 'noches',
    'que', 'tal', 'gracias', 'muchas', 'mil', 'ok', 'okay', 'okey', 'okis', 'si', 'no', 'vale', 'va', 'listo',
    'perfecto', 'excelente', 'enterado', 'enterada', 'de', 'acuerdo', 'claro', 'muy', 'bien', 'saludos', 'por',
    'su', 'atencion', 'ya', 'entendi', 'entiendo', 'y', 'le', 'agradezco', 'genial', 'super',
]);

function esAcuse(t: string): boolean {
    const palabras = t.replace(/[^a-zñ ]/g, ' ').split(' ').filter(Boolean);
    return palabras.length > 0 && palabras.length <= 10 && palabras.every(p => PALABRAS_DE_ACUSE.has(p));
}

/* Lo que siempre ve una persona, aunque haya plantilla cerca: dinero que se
   devuelve, cobros que no reconoce, facturas, borrar la cuenta, quejas y
   reclamos. Son políticas, no pasos, y no hay ninguna aprobada para
   contestarlas solas. Van PRIMERO: un «cancelen ese cobro que no autoricé» no
   es un instructivo para cancelar. */
const SIEMPRE_HUMANO: Regla[] = [
    { nombre: 'reembolso', grupos: [[/reembols/], [/cobro (doble|duplicado|indebido|de mas)/], [/me cobraron (dos veces|doble|de mas)/]] },
    { nombre: 'reembolso', contexto: true, grupos: [[/devuel\w* (mi |el |su )?dinero/], [/devoluci\w* (de )?(mi |el )?(dinero|pago|cobro)/],
        [/\bmi dinero\b/], [/no me (han )?devuel/]] },
    { nombre: 'cobro que no reconoce', grupos: [[/no (lo |la )?autorice/], [/no autoriz/], [/sin (mi )?autoriza/], [/contracargo/],
        [/disputa (de|del|por el) (cargo|cobro|pago)/], [/desconoc\w* (el |un |ese )?(cargo|cobro)/],
        [/cancel\w* (ese|el|este|mi|un) (cobro|cargo)/], [/(me )?(estan|siguen|siguieron) cobrando/],
        [/cobr\w* (sin|nuevamente|otra vez|de nuevo)/], [/no cancelaron/]] },
    { nombre: 'consulta cobrada sin respuesta', grupos: [
        [/(contabiliz|descont|cobr|gast|rest)\w* (como )?(una |la |mi )?consulta/, /(sin|no) (me )?(\w+ ){0,2}(respuesta|respuesto|resultado)/],
        [/(consumieron|consumio|consumiendo|gastaron|descontaron|quitaron|quita|quito) (\w+ )?(los |las |mis |una |un )?(creditos|consultas?)/],
        [/me (ha )?marcado \d+ consultas/], [/cobrando la consulta/]] },
    // Esperan a una persona: «nadie me responde», «no me contestan» (en plural: el equipo, no el asistente).
    { nombre: 'espera a una persona', grupos: [[/nadie me (responde|contesta|da respuesta|atiende)/],
        [/no me (responden|contestan|han (respondido|contestado))/], [/dias esperando/], [/(llevo|tengo) .{0,20}(dias|horas) (esperando|sin respuesta)/]] },
    { nombre: 'factura', grupos: [[/\bcfdi\b/], [/datos fiscales/], [/facturar/],
        [/(necesito|quiero|solicito|requiero|me (pueden|puede) (dar|enviar|mandar|hacer)) (una |la |mi |el )?factura/]] },
    { nombre: 'eliminar la cuenta', contexto: true, grupos: [[/(elimin|borr)\w* (de )?(toda )?(mi |la |su )?cuenta/],
        [/dar(me)? de baja (de )?(mi |la )?cuenta/], [/cerrar (mi |la )?cuenta/], [/mis datos personales/], [/derechos arco/]] },
    { nombre: 'queja o reclamo', grupos: [[/profeco/], [/(es una|son unos|esto es una?) (estafa|fraude)/], [/demandar a iurexia/],
        [/abusiv/], [/les valio/], [/se hacen (tontos|los)/], [/(ultima|ultimo) vez que (uso|trabajo|pago|contrato)/], [/desleal/],
        [/dano (economico|que me)/], [/pesimo/], [/me (siento|senti) (estafad|engan)/], [/nunca me (escribieron|contestaron|respondieron)/],
        [/(quitaron|eliminaron) (esa |la |una |esta )?(funcion|herramienta|opcion)/], [/sin (que )?(me )?avisar/], [/\bfatal\b/],
        [/desconfiad/], [/no (me )?confio/], [/observaciones/, /(error|herramienta|plataforma)/], [/(error|errores) (cometido|que cometio|grave)/]] },
    // Lo que propone para la interfaz: lo lee el equipo de producto.
    { nombre: 'sugerencia', grupos: [[/\b(agreguen|anadan|deberian|sugiero|sugerencia|seria bueno|propongo|amplien|amplian)\b/]] },
    { nombre: 'interfaz', grupos: [[/(pantalla|letra|texto|barra|menu)\b.*(no (se )?(ve|muestra|alcanza|puedo leer)|pequen|desperdicia|no es (clar|intuitiv))/],
        [/no es intu?itiva/], [/se repitio el texto/]] },
    // «Sigue el problema», «persiste el error»: sin la conversación no se sabe cuál.
    { nombre: 'seguimiento de un fallo', grupos: [[/(sigue|siguen|persiste|persisten|continua)\w* (el |los |persistiendo )?(mismo )?(problema|error|fallo|falla)/],
        [/(problema|error|fallo|falla)s? (sigue|esta persistiendo|persiste|continua)/], [/sigue persistiendo/]] },
    { nombre: 'varios fallos a la vez', grupos: [[/(varios|barios|muchos|todos los) (problemas|errores|fallos)/]] },
    // Lo que vendrá («¿cuándo tendrán…?») o lo que la plataforma no hace (imágenes, videos): no hay ficha que lo conteste.
    { nombre: 'pregunta de producto', grupos: [[/(cuando|para cuando) (tendran|habra|van a tener|sacaran|estara)/],
        [/(puede|puedes|podria)\w* (hacer|generar|crear|traducir) (imagenes|fotos|videos|audios?|presentaciones)/],
        [/\bgenios?\b/], [/(cambio|cambiaron|cambiar[oa]n) (la forma|la manera|el formato)/]] },
];

/* T4: el pago y la cuenta. Antes que todo lo demás: es dinero de alguien. */
const PAGO: Regla[] = [
    { nombre: 'pago no reflejado', grupos: [
        [/(sigo|sigue|aparezco|aparece|apareciendo|estoy|esta|quede|quedo) (\w+ )?(como |en )?(el )?(plan )?gratuit/],
        [/no se (me )?(\w+ )?(acutaliz|actualiz|activ|reflej|aplic)\w*/, /(plan|pago|suscripcion|\bpro\b|platinum|basico|estudio)/],
        [/(plan|pago|suscripcion) no se (\w+ )?(refleja|activ|actualiz|aplic)/], [/me quitaron (mi |el )?plan/], [/perdi (mi |la )?suscripcion/],
        [/(acabo de|volvi a|vuelvo a) pagar/], [/(pague|pagar) otra vez/], [/que paso con mi (suscripcion|plan)/],
        [/yo (estaba|tenia) (en |el )?(plan )?(premium|pro|platinum|basico)/], [/no se actuli?z/, /(plan|pago|consultas)/]] },
    { nombre: 'pago, rechazo o suspensión', contexto: true, grupos: [[/suspendid/], [/falta de pago/], [/cuenta (esta |quedo )?bloquead/],
        [/rechaz\w* (el |mi |su )?(pago|cobro|tarjeta|cargo)/], [/(pago|cobro|tarjeta|cargo) (fue |me )?rechaz/],
        [/\bya (lo |la )?pag/], [/\bpague\b/], [/\bya page\b/], [/\bpage y\b/],
        [/(hice|realice|efectue|di|he realizado|he hecho|realizado) (el |mi |un )?pago/], [/pago (y|pero) (no|sigo|aun)/],
        [/intentando pagar/], [/no (me )?(deja|puedo|pude) pagar/]] },
];

/* T8. «Cancelar» también es jurídico —cancelar una hipoteca, un gravamen, una
   pensión— y también es la tarjeta: sólo cuenta si habla de la suscripción. */
const CANCELAR: Regla = { nombre: 'cancelar la suscripción', grupos: [
    [/cancel/, /(suscrip|subscrip|\bplan\b|membresia|iurexia|renovacion|mensualidad|\bmensual\b|\banual\b|\bservicio\b|mi cuenta)/],
    [/cerrar (mi |la )?(suscrip|subscrip)/],
    [/^(quiero|como|puedo|deseo|necesito|me ayuda\w* a) (\w+ )?cancel\w*\??$/],
    [/dar(me)? de baja (de )?(la |mi )?(suscripcion|plan|servicio)/],
    [/ya no (quiero|deseo) (pagar|seguir|el servicio|la suscripcion|el plan)/], [/no (quiero|deseo) renovar/],
] };
const CANCELAR_AJENO = /cancel\w* (de |del |la |el |una |un |mi |su )?(hipoteca|gravamen|pension|registro|inscripcion|embargo|orden|audiencia|contrato|testamento|poder|cheque|deuda|credito|tarjeta)/;
/* «No me deja cancelar», «cancelé y me siguen cobrando»: eso ya no es un
   instructivo, es un caso (la misma regla de Codigo.gs). */
const CANCELAR_CON_FALLA = [/no (me |se me |se )?(deja|puedo|pude|aparece|sale|permite)\b/, /\berror\b/, /(sigue|siguen|me) (cobrando|cobraron|cobran)/,
    /ya (la |lo )?cancele/, /cancele y/, /no (se|me) (cancela|cancelo)/];

/* T1 con nota: el número que le dio el asistente de soporte era su folio. */
const FOLIO_CONFUNDIDO: Regla = { nombre: 'el folio de soporte tomado por un código', contexto: true, grupos: [
    [/(numero|codigo|folio)/, /(anex|donde (lo |la )?(pongo|meto|ingreso|escribo|anoto|coloco|debo|uso)|para que (es|sirve))/],
] };

/* T5. Sólo con negación o con la palabra de la sesión: «acceso desde mi
   móvil» es una duda de uso, no una puerta cerrada; y «no puedo ingresar al
   domicilio» es un desalojo, no su cuenta. */
const ACCESO: Regla = { nombre: 'no puede entrar', contexto: true, grupos: [
    [/no (puedo|me deja|logro|he podido|pude) (entrar|ingresar|acceder|iniciar|abrir mi cuenta|loguear|entar)/],
    [/iniciar sesion/], [/inicio de sesion/], [/no (me )?inicia sesion/], [/contrasen/],
    [/olvide (mi |la )?(contrasena|clave)/],
    [/me (saca|sale|cierra|corre) (de la |la |de mi )?(sesion|cuenta|pagina|plataforma)/], [/se (me )?cierra (la )?sesion/],
    [/(cada|a cada) (hora|rato|momento) me (saca|pide|cierra)/],
    [/codigo de (acceso|verificacion|inicio|ingreso)/], [/no (me )?llega (el )?codigo/], [/el codigo no (llega|funciona|sirve)/],
    [/(datos|credenciales) (son )?incorrect/], [/\blogin\b/], [/\bloguear/],
] };

/* T2 antes que T7: en el chat se adjunta UN documento por consulta, y «no me
   deja subir varios» es eso, no una falla. */
const VARIOS_DOCUMENTOS = /\b(varios|dos|cuantos|mas de un[oa]?)\s+(\w+\s+)?(document|documet|docuent|docuemnt|archivo|pdf)|(adjunt|subir|subo|sube)\w*\s+(a\s+)?(varios|los dos|todos a la vez)|\ba la vez\b|solo (sube|se ve|me sube) (uno|el ultimo)|sube el ultimo/;

/* T7: un documento que falló. Hace falta el documento Y la falla: «¿puedo
   subir un PDF?» es una duda de uso (T2). «Fallo» a secas no cuenta: en un
   escrito es la sentencia del juez. Adjuntar, subir, el PDF o el archivo ya
   son de la plataforma; «documento» a secas, no. */
const DOC_SUSTANTIVO = /(document|documet|docuent|docuemnt|dumento|archivo|archiivo|arcchivo|\bpdf\b|\bword\b|docx|adjunt|anex\w* (un|el|mi|una) (escrito|documento|archivo|demanda)|\bsubi\b|\bsubo\b|\bsubir\b|\bsube\b|subiendo|\bcargu?e\b)/;
const DOC_FALLA = /(\berror\b|no se (pudo|puede|sube|suben|carga|cargo|analiz|lee|leyo|abre|envia|envio)|no (me )?(deja|acepta|lee|carga|abre|analiza|recibe)\b|no me (esta|estan) dejando|sin dejar\w* (subir|adjuntar)|se (corto|corta|cae|cayo|perdio|traba|congela)|solo (me )?(dice|recibio|tomo|leyo|subio)|\bfalla\b|fallando|fallo (esta|persiste|sigue)|no funciona|perdio el contacto|corto la conexion|no (lo |la |los )?(recib|analiz)|no (los |lo |la )?ha(n)? (leido|leio)|falta que lea|no (puede|pudo) leer|no (sale|aparece|arroja) nada|hoja en blanco|tardo demasiado|muy extenso|failed to fetch|network ?error|load failed)/;
const DOC_ACCION = /(adjunt|\bsubi\b|\bsubo\b|\bsubir\b|\bsube\b|subiendo|archivo|archiivo|arcchivo|\bpdf\b|\bword\b|docx|\bcargu?e\b|\bcargar\b)/;
/* Descargar es exportar lo ya escrito: no es un documento que no se analizó. */
const DOC_DESCARGA = /descarg|\bbajar\b/;
const DOCUMENTO: Regla = { nombre: 'documento que no se analizó', grupos: [[DOC_ACCION, DOC_FALLA], [/error al analizar (el )?documento/]] };
const DOCUMENTO_A_SECAS: Regla = { nombre: 'documento que no se analizó', contexto: true, grupos: [[DOC_SUSTANTIVO, DOC_FALLA]] };

/* T6: la respuesta que se cortó, no llegó o salió vacía. */
const CORTADA: Regla = { nombre: 'respuesta cortada o que no llegó', contexto: true, grupos: [
    [/se (corto|corta|traba|atora|congela|queda (pensando|cargando|en))/], [/perdio el contacto/],
    [/no (me )?(contesta|responde|carga|termina)\b/], [/no (me )?(aparece|aparecio|salio|sale) (nada|lo que|la respuesta)/],
    [/no aparecio/], [/tarda (mucho|en|demasiado)/], [/leyendo (la )?consulta/], [/(me )?cerro la pagina/],
    [/respuesta (incompleta|cortada|a medias|no llego|se perdio|nunca llego)/],
    [/(se|me) (borro|perdio|desaparecio) (la |mi )?(ultima |anterior )?(respuesta|consulta)/], [/no quiere hacerse/],
    [/error (code|codigo) \d{3}/], [/retry ?error|error: ?retry/], [/(me )?(aparece|sale|marca) (x |una |un )?error/],
    [/failed to fetch/], [/se queda en guia/],
    [/(obtener|recuperar|ver) mi (ultima|anterior) (pregunta|respuesta|consulta)/],
    [/(marca|amrca|sale|aparece|da) (los mismos |un |el |otro )?error/],
    [/(me )?(anda|esta) fallando/], [/no da respuesta/], [/se (me )?fue (el |la )?(internet|luz|conexion|senal)/],
    [/no (me )?(da|arroja|muestra|despliega|genera) (el |la |ningun )?(resultado|respuesta|documento)/],
    [/no (se )?(ve|vbe|veo) la respuesta/], [/no puedo ver (la |mi )?(ultima|respuesta|consulta)/],
    [/solo (aparecen|aparece|despliega|sale|muestra|arroja) (dos|unos|unas|3|tres|algunos|2)/], [/(simbolos|signos) de gato/],
    [/##/], [/(hoja|pantalla) en blanco/],
] };

/* Calidad jurídica: la discute un abogado y la revisa el equipo contra el texto oficial. */
const CALIDAD: Regla = { nombre: 'calidad jurídica', grupos: [
    [/(tesis|jurisprudencia|cita|registro)/, /(no exist|falsa|inventad|incorrect|equivocad|otra materia)/],
    [/(legislacion|codigo|articulo|fundamento)/, /(incorrect|equivocad|derogad)/],
    [/falta (de )?fundamento/], [/(tesis|citas) verificad/], [/respuestas? que se contradic/], [/me confunda/], [/no analiz\w* bien/],
    [/(respuesta|informacion) (es |fue )?(inexacta|imprecisa|erronea|incorrecta|equivocada|mala)/],
    [/(marque|indique|especifique|pedi|dije) (que|desde) .*(codigo|ley|legislacion|materia)/],
    [/no (redacta|aplica|cita|usa|considera|respeta) .*(conforme|segun|de acuerdo) (al|a la|con el|con la) (codigo|ley|legislacion)/],
    [/no corresponde\w* (a|con) (aquellos|los|las|la|el) .*(legislacion|ley|codigo)/],
    [/respuestas .*(peores|por (muy )?debajo|bajaron|empeor)/], [/(le he|ya le|yo misma le|yo mismo le) (corregido|corrigido)/],
    [/sigue (dando|senalando|marcando|diciendo) /], [/se equivoca/], [/carece de fundament/], [/no se configura/],
    [/no es (correcta|correcto|aplicable)/], [/tergivers/], [/le pedi a (la|su|esta) (aplicacion|plataforma|herramienta|\bia\b)/],
    [/solo (ubica|encuentra|identifica|detecta|reconoce) a? ?\d/], [/(informacion|respuesta)s? incompleta/],
    [/que me (propones|propusiste|das|diste|genero|generaste) .*(corta|incompleta|mal|insuficiente|pobre)/],
] };

/* T3: contratar, precios, pagar sin tarjeta, cambiar de plan. Nunca se
   contesta con cifras: los precios cambian el 3-nov; se manda a /precios. */
const CONTRATAR: Regla = { nombre: 'contratar o precio', contexto: true, grupos: [
    [/precio/], [/\bcostos?\b/], [/\bcuesta\b/], [/cuanto (cuesta|vale|sale|es|cobran)/], [/\btarifa/],
    [/quiero contratar/], [/como (contrat|adquiero|compro|me suscribo)/], [/contratar (el |un |su |algun )?(plan|servicio|iurexia|paquete)/],
    [/quiero (pagar|comprar|adquirir|suscribirme|el plan)/], [/\bsuscribir/], [/adquir\w* (un |el )?(paquete|plan|servicio|producto)/],
    [/(plan|planes) (basico|pro|platinum|estudio|ultra|secretarios|de pago|mensual|anual)/], [/\bplanes\b/], [/^plan$/],
    [/(que|cual) (incluye|cubre|ofrece)/], [/\bel basico\b/],
    [/(sin|no tengo|no uso) tarjeta/], [/transferencia/], [/\bdeposit/], [/\boxxo\b/], [/en efectivo/], [/\bspei\b/],
    [/cobra\w* (mas|extra|solo la diferencia|la diferencia)/], [/\$\s?\d/],
    [/(subir|cambiar|actualizar|pasar|mejorar)\w* (de |al |a |mi )?(plan )?(platinum|\bpro\b|basico|ultra|estudio|secretarios)/],
] };
const SIN_TARJETA = /(sin|no tengo|no uso|otra forma)\b.*tarjeta|transferencia|\bdeposit|\boxxo\b|efectivo|\bspei\b|enlace de pago|liga de pago/;
const CONTACTO = /whats|telefono|celular|numero (de|para) (contacto|llamar|comunicarme)|llamar|marcar|hablar con (alguien|una persona|un asesor)/;
const CAMBIAR_PLAN = /tengo (activo|el plan|plan|pagado)|subir de plan|cambiar (de|el|mi) plan|mejorar (mi|el) plan|actualizar al plan|ya (tengo|pago) (el )?(plan )?(basico|pro|platinum)|la diferencia/;

/* T2: cómo se usa. Sólo en mensajes cortos (LARGO_USO): una pregunta de uso
   cabe en dos líneas, y un escrito pegado que dice «me sirve para acreditar»
   no lo es. */
const LARGO_USO = 300;
const SECCIONES: Array<[SeccionUso, Grupo[]]> = [
    ['movil', [[/\bapp\b/], [/aplicacion (movil|para|de iurexia|en el)/], [/android/], [/iphone/], [/acceso desde (mi |el )?(movil|celular|telefono)/],
        [/(desde|en) (mi |el )?(movil|celular|telefono|tablet)\b/], [/\bchrome\b/], [/navegador/]]],
    ['redactor', [[/redactor (pjf|de sentencias)/], [/taller de sentencias/], [/plan (ultra )?secretarios/], [/secretario (del )?(pjf|poder judicial)/],
        [/(elaboracion|proyecto)s? de sentencia/, /(plataforma|iurexia|herramienta|sirve|para la|tendran|hacer)/]]],
    ['herramientas', [[/(opcion|herramienta|boton) (para|de) (revisar|auditar|analizar) (una |la )?sentencia/],
        [/(boton|herramienta|opcion) (de |del )?(sentencia|precedentes|jurimetria|cronologia|toulmin|escrito legal)/],
        [/\b(jurimetria|toulmin|cronologia)\b/], [/desplegar herramientas/], [/herramienta (de )?precedentes/]]],
    ['entidad', [[/\bfederal\b/, /(aparece|opcion|seleccion|jurisdiccion|fuero|entidad|estado)/],
        [/(deselecciono|deseleccionar|quito|quitar|cambio|cambiar|elegir|elijo) (la |el |mi )?(entidad|estado)/], [/jurisdiccion federal/],
        [/legislacion (local|estatal|del estado)/, /(no|que no|en vez)/]]],
    ['flujos', [[/\bflujo/]]],
    ['boveda', [[/boveda/]]],
    ['plantillas', [[/plantillas?\b/, /(subir|usar|mis|word|formato|despacho|llenar)/], [/machote/], [/membrete/], [/formato (de|del) (mi )?despacho/]]],
    ['agenda', [[/\bagenda\b/], [/aviso(s)? de (vencimiento|termino)/]]],
    ['seguimiento', [[/seguimiento (de|del|a) (un |mi |los )?(expediente|asunto|juicio)/], [/lista de acuerdos/], [/boletin/], [/monitore/]]],
    ['historial', [[/historial/], [/chat anterior/], [/vuelvo al chat/], [/regresar al chat/], [/mis consultas/],
        [/consultas (realizadas|guardadas|pasadas)/], [/guardad\w* (las |mis )?consultas/], [/donde (quedan|estan|se guardan|veo) (mis |las )?consultas/],
        [/(no (veo|encuentro|aparece)|donde (esta|veo|quedo)|volver a|regresar a|recuperar) .*(consulta|chat|conversacion)e?s? anterior/],
        [/borra\w* (la |mis? )?(informacion|conversacion|consulta)/], [/guard\w* (la )?(i[nm]f[oi]rmacion|consulta|respuesta)/],
        [/(necesito|busco|donde esta|no encuentro)/, /(proyecto|escrito|documento|consulta|respuesta|conversacion)/,
            /\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/]]],
    ['escrito', [[/(me )?sirve para (redactar|hacer)/], [/(plataforma|iurexia) (\w+ )?(redact|escrito|demanda)/],
        [/(puede|puedes|podria)\w* .*(redact|demanda|escrito|amparo|proyecto)/, /(esta|la) (\bia\b|plataforma|herramienta|aplicacion)\b/],
        [/^(puedes|puede|podrias|podria) (generar|redactar|hacer|elaborar|crear) (una|un) (demanda|escrito|amparo|contrato|denuncia)[^.]*\?$/],
        [/(pestana|boton|opcion) (para|de) (redactar|escrito|demanda)/], [/como (lo |la )?edit/], [/editar (el |la |mi )?(documento|escrito|respuesta)/],
        [/(en|a) (un )?(pdf|word)\b/], [/descargar/], [/copiar/], [/exportar/], [/imprimir/]]],
    ['documento', [[/(puedo|quiero|como|donde|se puede) (subir|adjuntar|cargar|anexar|mandar|enviar)/], [/sube (el|un) documento/],
        [/subiendo/], [/\bhojas\b/], [/\bpaginas\b/, /(subir|analizar|documento|ley)/], [/dividir el (texto|documento|archivo)/],
        [/en (dos|varias) partes/], [VARIOS_DOCUMENTOS]]],
    ['contador', [[/contador/], [/cuantas consultas/], [/consultas me quedan/], [/mi consumo/], [/mis creditos/],
        [/consultas \d+ ?\/ ?\d+/], [/\d+ ?\/ ?\d+ consultas/]]],
    ['plan-y-pagos', [[/donde (se me esta haciendo|me hacen|veo) el cobro/], [/(cuenta|tarjeta) (es )?(donde )?me cobra/],
        [/me cobran el servicio/], [/metodo de pago/], [/portal de facturacion/], [/cambiar (mi |la )?tarjeta/],
        [/donde .{0,30}\bcobro\b/], [/comprobante/]]],
    ['consulta', [[/\bfuentes\b/, /(boton|activar|apagar|encender|elegir|seleccion|cuales)/], [/esfuerzo/], [/internet/, /(boton|fuente|buscar en|candado|activar|globo)/],
        [/leyes estatales/], [/bases? de datos/], [/que tan confiable/],
        [/analizar un caso/], [/puedo (pegar|escribir|preguntar)/], [/donde (puedo )?(escribo|escribir|pregunto|hago la consulta)/],
        [/como (hago|realizo|hacer) (una|la|mi) consulta/], [/^(pero )?(me |nos |le )?sirve para/], [/(iurexia|plataforma|esto) (me )?sirve para/],
        [/que tipo de (demandas|escritos|asuntos|materias|casos)/], [/me apoya en/]]],
    ['tutorial', [[/tutorial/], [/tuturial/], [/instructivo/], [/manual de uso/], [/\bguia\b/], [/como (se )?(usa|utiliza|funciona)\b/],
        [/como usar/], [/como utilizar/], [/saber como/, /usar/], [/(esto|iurexia|la plataforma) para (que|qué) (es|sirve)/],
        [/para que (es|sirve) (esto|iurexia|la plataforma)/],
        [/^(y )?que (le |te )?puedo (preguntar|hacer)( aqui| con (esto|iurexia|la plataforma))?\??$/], [/capacitacion/]]],
];

/** Todas las secciones de uso, en el orden en que se miran (T2 tiene un fragmento por cada una). */
export const SECCIONES_USO: SeccionUso[] = SECCIONES.map(([s]) => s);

/* T1: vocabulario jurídico, y de los hechos que llegan a un abogado. Es la red
   del final: casa con mucho, y sólo se usa si nada de lo anterior casó. */
const JURIDICO = new RegExp([
    'amparo', 'demanda', 'denuncia', 'querella', 'juicio', 'sentencia', 'recurso', 'apelac', 'agravio', 'alegato', 'incident', 'incidnete',
    'nulidad', '\\bjuez', 'juzgado', 'tribunal', 'fiscalia', 'ministerio publico', '\\bmp\\b', 'carpeta de investigacion', 'delito', '\\bpenal\\b',
    '\\bcivil\\b', 'mercantil', 'laboral', 'familiar', 'divorci', 'pension', 'alimentici', 'alimentari', 'custodia', '\\bguarda\\b',
    'convivenc', 'patria potestad', 'albacea', 'sucesion', 'herencia', 'hereder', 'testament', 'intestament', 'de cujus', 'notari',
    'contrato de', 'arrendamiento', '\\brenta\\b', 'propiedad', 'escritura', 'gravamen', 'infonavit', '\\bimss\\b', 'issste', 'pemex',
    'despido', 'finiquito', 'indemniza', 'dano moral', 'responsabilidad civil', 'accidente', 'choque', 'vehiculo', 'conductor', 'fallec',
    'victima', 'derecho (de|a|al|del|humano|penal|civil|laboral|familiar|mercantil|fiscal|administrativo|constitucional|agrario)', 'derechos', '\\bley\\b', '\\bleyes\\b', 'normativa', 'codigo (civil|penal|nacional|de procedimientos|familiar)', 'articulo',
    'jurisprudencia', '\\btesis\\b', 'vinculacion', 'libertad', 'prision', 'audiencia', 'notific', 'emplaza', 'prescrip', 'embarg',
    'desalojo', 'reclamacion', 'proemio', 'abogad', 'ficha textual', 'ensayo', 'materia (penal|civil|familiar|laboral|de amparo|mercantil)',
    'demandad', 'expediente', 'redact', 'redacc', 'escrito', 'elabor', 'hazme', 'has un', 'realiza(me)? un', 'ayudame a', 'me ayudes',
    'necesito que me ayuden a revisar', '\\bcaso\\b', 'banco', 'domicili', 'credito', 'deuda', 'prestamo', 'policia', 'fraude', '\\brobo',
    'lesiones', 'homicid', 'violencia', 'acoso', 'amenaz', 'menor de edad', 'matrimonio', 'concubin', 'patron', 'trabajador', 'salario',
    '\\bsat\\b', 'impuesto', 'multa', 'infraccion', 'senador', 'diputad', 'constitucion', 'borrador', 'medio preparatorio', 'perfeccionar',
].join('|'));

/** Lo que dice la plataforma por dentro: si aparece, el texto largo no es un escrito pegado. */
const DE_LA_PLATAFORMA = /(iurexia|plataforma|soporte|\bchat\b|boton|pestana|pantalla)/;
/** Para el texto largo sin vocabulario jurídico: si cuenta qué pasó con un mensaje, no es un escrito pegado. */
const CUENTA_LO_QUE_PASO = /(iurexia|plataforma|soporte|\bchat\b|boton|pestana|pantalla|consulta|mensaje|\bmsj\b|envi[oae]|respuesta|respondi)/;

/** Un escrito pegado: largo y jurídico. Se aparta para que no dispare reglas de la cuenta. */
const LARGO_ESCRITO = 400;

const resultado = (tipo: TipoCaso, regla: string, secciones: SeccionUso[] = [], marcas: Marcas = {}): Clasificacion =>
    ({ tipo, regla, secciones, marcas });

function clasificarTexto(t: string): Clasificacion {
    if (!t) return resultado('acuse', 'vacío');
    if (esAcuse(t)) return resultado('acuse', 'sólo saludo o agradecimiento');

    for (const r of SIEMPRE_HUMANO) if (casaRegla(t, r)) return resultado('humano', r.nombre);
    // «Ya pagué, ¿dónde bajo el comprobante?» es de uso: el comprobante está en «Plan y pagos».
    if (/(bajar|descargar|donde (esta|encuentro|veo|puedo)|obtener|necesito|ver) .{0,25}(comprobante|recibo)/.test(t)) {
        return resultado('como-se-usa', 'uso: plan-y-pagos (comprobante)', ['plan-y-pagos']);
    }
    for (const r of PAGO) if (casaRegla(t, r)) return resultado('pago', r.nombre);

    if (casaRegla(t, CANCELAR) && !CANCELAR_AJENO.test(t)) {
        return CANCELAR_CON_FALLA.some(rx => rx.test(t))
            ? resultado('humano', 'cancelación con falla o con cobro')
            : resultado('cancelar', CANCELAR.nombre);
    }

    if (casaRegla(t, FOLIO_CONFUNDIDO)) return resultado('consulta-juridica', FOLIO_CONFUNDIDO.nombre, [], { folio: true });

    // El móvil antes que el acceso: «¿cómo entro desde el celular?» es de uso.
    const corto = t.length < LARGO_USO;
    if (corto && casaAlguno(t, SECCIONES[0][1]) && !casaRegla(t, ACCESO)) return resultado('como-se-usa', 'uso: movil', ['movil']);

    if (casaRegla(t, ACCESO)) return resultado('acceso', ACCESO.nombre);
    const redactor = SECCIONES.find(([s]) => s === 'redactor')![1];
    if (corto && casaAlguno(t, redactor)) return resultado('como-se-usa', 'uso: redactor', ['redactor']);
    // Un documento por consulta: «no me deja subir varios» se contesta con el cómo.
    if (corto && VARIOS_DOCUMENTOS.test(t)) return resultado('como-se-usa', 'uso: documento (uno por consulta)', ['documento']);
    if ((casaRegla(t, DOCUMENTO) || casaRegla(t, DOCUMENTO_A_SECAS)) && !DOC_DESCARGA.test(t)) return resultado('documento', DOCUMENTO.nombre);
    if (casaRegla(t, CORTADA)) return resultado('respuesta-cortada', CORTADA.nombre);
    if (casaRegla(t, CALIDAD)) return resultado('humano', CALIDAD.nombre);

    if (casaRegla(t, CONTRATAR)) {
        return resultado('contratar', CONTRATAR.nombre, [], {
            sinTarjeta: SIN_TARJETA.test(t) || undefined,
            contacto: CONTACTO.test(t) || undefined,
            cambiarPlan: CAMBIAR_PLAN.test(t) || undefined,
        });
    }

    if (corto) {
        const secciones = SECCIONES.filter(([, grupos]) => casaAlguno(t, grupos)).map(([s]) => s);
        if (secciones.length) {
            // El tutorial entero sólo si no hay una sección concreta.
            const concretas = secciones.filter(s => s !== 'tutorial');
            const elegidas = (concretas.length ? concretas : secciones).slice(0, 3);
            return resultado('como-se-usa', `uso: ${elegidas.join(', ')}`, elegidas);
        }
    }

    if (JURIDICO.test(t)) return resultado('consulta-juridica', 'consulta jurídica en la caja de soporte');
    // Un texto largo sin nada de la plataforma es un escrito pegado.
    if (t.length >= CORTO && !CUENTA_LO_QUE_PASO.test(t)) return resultado('consulta-juridica', 'texto largo sin nada de la plataforma');

    return resultado('humano', 'sin reconocer');
}

/**
 * De qué trata el mensaje (o la conversación: las líneas del abogado, una por
 * renglón). Los escritos pegados —largos y jurídicos— se apartan primero: lo
 * que decide es lo que el abogado escribió alrededor. Si alrededor no hay un
 * problema de su cuenta o de la plataforma, es una consulta jurídica en la
 * caja equivocada (T1), aunque pregunte «¿dónde escribo?».
 */
export function clasificar(texto: string): Clasificacion {
    const lineas = (texto || '').split('\n').map(normalizar).filter(Boolean);
    const escritos = lineas.filter(l => l.length >= LARGO_ESCRITO && JURIDICO.test(l) && !DE_LA_PLATAFORMA.test(l));
    if (!escritos.length) return clasificarTexto(lineas.join(' '));

    const alrededor = clasificarTexto(lineas.filter(l => !escritos.includes(l)).join(' '));
    const sinProblema = alrededor.tipo === 'acuse' || alrededor.tipo === 'como-se-usa' || alrededor.tipo === 'consulta-juridica'
        || (alrededor.tipo === 'humano' && alrededor.regla === 'sin reconocer');
    return sinProblema
        ? resultado('consulta-juridica', 'escrito jurídico pegado en la caja de soporte', [], alrededor.marcas)
        : alrededor;
}

/* ─────────────────────────── 2. LOS HECHOS ─────────────────────────── */

export interface Perfil {
    id: string;
    email: string;
    nombre: string | null;
    tratamiento: string | null;
    /** `subscription_type`, o 'gratuito'. */
    plan: string;
    consultasUsadas: number;
    consultasLimite: number;
    /** Las de pago: NUNCA se reinician al mes. */
    consultasRecargadas: number;
    suspendidoAt: string | null;
    impagoDesde: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
}

/** Otra cuenta con el MISMO buzón de Gmail (puntos o +etiqueta): llega a la misma bandeja. */
export interface CuentaGemela {
    id: string;
    correoOculto: string;
    plan: string;
}

export interface FacturaResumen {
    /** draft | open | paid | uncollectible | void */
    estado: string | null;
    pagadaAt: string | null;
    intentos: number;
    creadaAt: string | null;
}

export interface SuscripcionResumen {
    id: string;
    /** active | trialing | past_due | unpaid | incomplete | incomplete_expired | canceled | paused */
    estado: string;
    /** El plan que dice el cobro (por el price id), o null si no se reconoce. */
    planId: string | null;
    cancelaAlFinal: boolean;
    /** Fin del acceso si se canceló; fin del periodo en curso si no. */
    finPeriodo: string | null;
    creadaAt: string | null;
    factura: FacturaResumen | null;
}

export interface HechosStripe {
    consultado: boolean;
    error: string | null;
    cliente: string | null;
    /** El cliente se encontró por el correo, no por `stripe_customer_id` del perfil. */
    porCorreo: boolean;
    suscripcion: SuscripcionResumen | null;
}

export interface RespuestaChat {
    /** Los primeros 8 del peticion_id: basta para el parte y no es un dato del abogado. */
    id: string;
    estado: string;
    creadaAt: string;
    terminadaAt: string | null;
    guardada: boolean;
    /** Caracteres de la respuesta. El texto no sale de `diagnostico.ts`. */
    largo: number;
}

export type CausaDocumento = 'red' | 'texto' | 'formato' | 'hojas' | 'tamano' | 'cuota' | 'fallo';

export interface ErrorDocumento {
    at: string;
    causa: CausaDocumento;
    hojasDocumento?: number;
    hojasPlan?: number;
}

/** Lo que devuelve `public.auth_resumen_usuario` (ver supabase_atencion_automatica.sql). */
export interface ResumenAuth {
    inicios: number;
    inicios_sin_renovar: number;
    horas_entre_inicios: number;
    renovaciones: number;
    revocaciones: number;
    max_por_minuto: number;
    minuto_pico: string | null;
    sesiones_en_pico: number;
    vida_mediana_s: number | null;
    sesiones_activas: number;
    agentes: number;
    ultimo_inicio: string | null;
}

export interface Hechos {
    perfil: Perfil | null;
    bloqueo: { motivo: string; desde: string | null } | null;
    gemelas: CuentaGemela[];
    stripe: HechosStripe | null;
    respuestas: RespuestaChat[] | null;
    erroresDocumento: ErrorDocumento[] | null;
    auth: ResumenAuth | null;
    /** Del correo: la cabecera Date contra la hora en que llegó. */
    reloj: { desfaseMinutos: number } | null;
    /** Fuentes que no se pudieron leer, y por qué. Un hueco no es un «no». */
    faltantes: string[];
}

export function hechosVacios(): Hechos {
    return {
        perfil: null, bloqueo: null, gemelas: [], stripe: null, respuestas: null,
        erroresDocumento: null, auth: null, reloj: null, faltantes: [],
    };
}

/* ─────────────────────────── 3. DECIDIR ─────────────────────────── */

/** Por debajo de esto no sale ningún correo solo: lo ve una persona. */
export const UMBRAL_ENVIO = 0.75;

/** Ventanas de los hechos, contadas desde el reporte. */
export const HORAS_RESPUESTAS = 48;
export const HORAS_AUTH = 24;

/* LAS DOS SEÑALES DE LAS SESIONES (2-nov-2026), medidas ese día en
   auth.refresh_tokens y auth.sessions (auth.audit_log_entries está VACÍA en
   este proyecto: los eventos de auth sólo van al flujo de registros):

   · RÁFAGA. El caso del reloj 9 h adelantado: 42 renovaciones en un minuto,
     140 en doce, y cada token revocado a los 0.14 s (mediana) de nacer. En
     cuatro días nadie más pasó de 2 por minuto, y la vida mediana del token de
     todos los demás fue de 3,463 s en adelante: la hora de vida del acceso.
   · SESIÓN QUE NO SE RENUEVA. Un Pro abrió 5 sesiones en 6 h, cada una con
     un solo token sin rotar y `refreshed_at` nulo: cada renovación le falló
     («refresh_token_not_found») y volvía a entrar. «Me saca cada hora».
     El remedio no está del lado del abogado: lo ve el equipo. */
export const RAFAGA_POR_MINUTO = 10;
export const RAFAGA_VIDA_MAXIMA_S = 60;
export const SIN_RENOVAR_MINIMO = 4;
export const SIN_RENOVAR_HORAS = 2;
/** Diferencia entre la cabecera Date del correo y su llegada que ya es reloj. */
export const DESFASE_RELOJ_MIN = 10;

export const PLANES_DE_PAGO = new Set([
    'basico_monthly', 'basico_annual', 'pro_monthly', 'pro_annual', 'platinum_monthly',
    'platinum_annual', 'ultra_secretarios', 'platinum_estudio',
]);

export type ValorVariable = string | number | string[];

export interface Borrador {
    plantilla: IdPlantilla;
    variables: Record<string, ValorVariable>;
}

export interface Decision {
    /** 'humano' si no hay certeza, aunque el mensaje fuera de otro tipo. */
    tipo: TipoCaso;
    /** Lo que dijo el clasificador antes de mirar los hechos. */
    clasificado: TipoCaso;
    regla: string;
    /** Una frase, para el parte. */
    diagnostico: string;
    /** Qué se hace: mandar tal plantilla, o qué tiene que hacer una persona. */
    accion: string;
    /** Sólo si se puede mandar sola. Para 'humano' es null SIEMPRE. */
    plantilla: IdPlantilla | null;
    variables: Record<string, ValorVariable>;
    confianza: number;
    /** El correo que habría salido, para que David lo vea en el parte. Nunca se manda. */
    borrador: Borrador | null;
}

export interface Contexto {
    canal: Canal;
    /** Cuándo escribió (creado_at del reporte). Las ventanas se miden desde aquí. */
    referenciaAt: string;
    ahora: number;
}

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

/** «miguel@tbblaw.net» → «mig•••@tbblaw.net», como el aviso de «otra cuenta» del perfil. */
export function ocultarCorreo(correo: string): string {
    const [usuario, dominio] = (correo || '').split('@');
    if (!dominio) return '•••';
    const visible = usuario.slice(0, Math.min(3, usuario.length));
    return `${visible}${'•'.repeat(Math.max(3, usuario.length - visible.length))}@${dominio}`;
}

/**
 * La dirección que de verdad recibe el correo. En Gmail, «juan.perez+iurexia»
 * y «juanperez» son el mismo buzón; para Iurexia, dos cuentas distintas. Fuera
 * de Gmail no se toca nada: allá los puntos sí cuentan.
 */
export function correoCanonico(correo: string): string {
    const c = (correo || '').trim().toLowerCase();
    const [usuario, dominio] = c.split('@');
    if (!dominio) return c;
    if (dominio === 'gmail.com' || dominio === 'googlemail.com') {
        return `${usuario.split('+')[0].replace(/\./g, '')}@gmail.com`;
    }
    return c;
}

/** Consultas que le quedan hoy: las del plan y, aparte, las recargadas. */
export function consultasRestantes(p: Perfil): number {
    return Math.max(0, p.consultasLimite - p.consultasUsadas) + Math.max(0, p.consultasRecargadas);
}

export function describirDesfase(minutos: number): string {
    const sentido = minutos > 0 ? 'adelantado' : 'atrasado';
    const m = Math.abs(minutos);
    if (m >= 90) {
        const horas = Math.round(m / 60);
        return `unas ${horas} horas ${sentido}`;
    }
    return `unos ${Math.round(m)} minutos ${sentido}`;
}

/** ¿Las sesiones dicen «reloj» o «sesión que no se renueva»? */
export function senalDeSesion(a: ResumenAuth | null): 'rafaga' | 'sin-renovar' | null {
    if (!a) return null;
    if (a.max_por_minuto >= RAFAGA_POR_MINUTO && (a.vida_mediana_s ?? Infinity) < RAFAGA_VIDA_MAXIMA_S) return 'rafaga';
    if (a.inicios >= SIN_RENOVAR_MINIMO && a.inicios_sin_renovar / a.inicios >= 0.8
        && a.horas_entre_inicios >= SIN_RENOVAR_HORAS && a.renovaciones === 0) return 'sin-renovar';
    return null;
}

export function nombrePlan(plan: string | null | undefined): string {
    const nombres: Record<string, string> = {
        gratuito: 'Gratuito', basico_monthly: 'Básico', basico_annual: 'Básico anual', pro_monthly: 'Pro',
        pro_annual: 'Pro anual', platinum_monthly: 'Platinum', platinum_annual: 'Platinum anual',
        ultra_secretarios: 'Ultra Secretarios', platinum_estudio: 'Estudio',
    };
    return nombres[plan || 'gratuito'] ?? 'su plan';
}

function enVentana(iso: string, ctx: Contexto, horas: number): boolean {
    const t = ms(iso);
    const ref = ms(ctx.referenciaAt);
    return t >= ref - horas * 3600_000 && t <= ref + 15 * 60_000;
}

/** El correo que habría salido, con su plantilla, para un caso que ve una persona. */
const borrador = (plantilla: IdPlantilla, variables: Record<string, ValorVariable>): Borrador => ({ plantilla, variables });

/**
 * Del clasificador y los hechos a la decisión. Pura: misma entrada, misma salida.
 */
export function decidir(c: Clasificacion, h: Hechos, ctx: Contexto): Decision {
    const base = { clasificado: c.tipo, regla: c.regla };
    const enviar = (plantilla: IdPlantilla, variables: Record<string, ValorVariable>, confianza: number,
        diagnostico: string, accion?: string): Decision => {
        if (confianza < UMBRAL_ENVIO) {
            return {
                ...base, tipo: 'humano', diagnostico,
                accion: `lo ve una persona (confianza ${confianza.toFixed(2)}); borrador ${plantilla}`,
                plantilla: null, variables: {}, confianza, borrador: borrador(plantilla, variables),
            };
        }
        return { ...base, tipo: TIPO_DE[plantilla], diagnostico, accion: accion ?? `mandar ${plantilla}`, plantilla, variables, confianza, borrador: null };
    };
    const humano = (diagnostico: string, accion: string, confianza: number, b: Borrador | null = null): Decision =>
        ({ ...base, tipo: 'humano', diagnostico, accion, plantilla: null, variables: {}, confianza, borrador: b });

    if (c.tipo === 'acuse') {
        return { ...base, tipo: 'acuse', diagnostico: 'Saludo o agradecimiento: no pide nada.', accion: 'nada que contestar',
            plantilla: null, variables: {}, confianza: 0.95, borrador: null };
    }
    if (c.tipo === 'humano') {
        return humano(`Lo ve una persona: ${c.regla}.`, 'pasar a una persona', 0.9);
    }

    const p = h.perfil;
    // Una disputa de cargo la ve el equipo, sea cual sea la pregunta.
    if (h.bloqueo) {
        return humano(`Cuenta bloqueada (${h.bloqueo.motivo}): la ve el equipo.`, 'pasar a una persona: bloqueo por disputa', 0.95);
    }

    switch (c.tipo) {
        case 'consulta-juridica': return decidirConsulta(c, h, ctx, enviar);
        case 'como-se-usa': {
            const secciones = c.secciones.length ? c.secciones : ['tutorial'];
            return enviar('T2', { secciones }, secciones.includes('tutorial') && secciones.length === 1 ? 0.8 : 0.85,
                `Pregunta de uso: ${secciones.join(', ')}.`);
        }
        case 'contratar': {
            if (p?.suspendidoAt) return decidirPago(c, h, ctx, enviar, humano);
            const yaPaga = !!p && PLANES_DE_PAGO.has(p.plan);
            const variables: Record<string, ValorVariable> = {
                situacion: yaPaga ? 'cambiar' : 'contratar',
                sin_tarjeta: c.marcas.sinTarjeta ? 'si' : '',
                contacto: c.marcas.contacto ? 'si' : '',
            };
            if (yaPaga) variables.plan = nombrePlan(p!.plan);
            return enviar('T3', variables, 0.85,
                yaPaga ? `Ya paga (${nombrePlan(p!.plan)}) y pregunta por otro plan.`
                    : `Quiere contratar${c.marcas.sinTarjeta ? ', sin tarjeta' : ''}.`);
        }
        case 'pago': return decidirPago(c, h, ctx, enviar, humano);
        case 'acceso': return decidirAcceso(c, h, ctx, enviar, humano);
        case 'respuesta-cortada': return decidirCortada(c, h, ctx, enviar, humano);
        case 'documento': return decidirDocumento(c, h, ctx, enviar, humano);
        case 'cancelar': return decidirCancelar(c, h, ctx, enviar, humano);
        default: return humano('Sin regla para este tipo.', 'pasar a una persona', 0.5);
    }
}

type Enviar = (plantilla: IdPlantilla, variables: Record<string, ValorVariable>, confianza: number, diagnostico: string, accion?: string) => Decision;
type Humano = (diagnostico: string, accion: string, confianza: number, b?: Borrador | null) => Decision;

function decidirConsulta(c: Clasificacion, h: Hechos, ctx: Contexto, enviar: Enviar): Decision {
    const p = h.perfil;
    const variables: Record<string, ValorVariable> = {
        apertura: ctx.canal,
        nota_folio: c.marcas.folio ? 'si' : '',
    };
    if (!p) {
        variables.situacion = 'sin-cuenta';
        return enviar('T1', variables, 0.8, 'Consulta jurídica escrita a soporte, sin cuenta con ese correo.');
    }
    const quedan = consultasRestantes(p);
    variables.situacion = quedan > 0 ? 'con-consultas' : 'sin-consultas';
    if (quedan > 0) variables.consultas_restantes = quedan;
    return enviar('T1', variables, ctx.canal === 'chat' ? 0.9 : 0.85,
        `Consulta jurídica en la caja de soporte; le quedan ${quedan} consultas${c.marcas.folio ? '; confundió el folio con un código' : ''}.`);
}

function decidirPago(c: Clasificacion, h: Hechos, ctx: Contexto, enviar: Enviar, humano: Humano): Decision {
    const p = h.perfil;
    const s = h.stripe;
    if (!p) return humano('Habla de un pago, pero no hay cuenta con ese correo.', 'pasar a una persona: preguntar con qué correo pagó', 0.5);

    const correo_oculto = ocultarCorreo(p.email);
    if (p.suspendidoAt) {
        const confirmada = !!s?.suscripcion && ['past_due', 'unpaid'].includes(s.suscripcion.estado)
            && s.suscripcion.factura?.estado === 'open';
        return enviar('T4', { estado: 'suspendida' }, confirmada ? 0.9 : s?.consultado ? 0.8 : 0.78,
            `Cuenta suspendida por falta de pago desde ${p.suspendidoAt.slice(0, 10)}${confirmada ? '; el cobro confirma la factura abierta' : ''}.`);
    }

    const sub = s?.suscripcion ?? null;
    const pagaEnCobro = !!sub && ['active', 'trialing'].includes(sub.estado);
    const perfilDePago = PLANES_DE_PAGO.has(p.plan);

    if (pagaEnCobro && sub!.factura?.estado === 'paid') {
        if (perfilDePago) {
            return enviar('T4', { estado: 'activo', plan: nombrePlan(sub!.planId || p.plan), correo_oculto }, 0.85,
                `El cobro está pagado${sub!.factura.pagadaAt ? ` (${sub!.factura.pagadaAt.slice(0, 10)})` : ''} y el perfil ya tiene ${nombrePlan(p.plan)}: falta recargar la sesión.`);
        }
        return humano(`El cobro está pagado (${nombrePlan(sub!.planId)}) y el perfil sigue en ${nombrePlan(p.plan)}.`,
            'pasar a una persona: aplicar el plan a mano (pago confirmado, perfil sin actualizar)', 0.9);
    }

    // El plan vive en otra cuenta del mismo buzón.
    const gemelaDePago = h.gemelas.find(g => PLANES_DE_PAGO.has(g.plan));
    if (!perfilDePago && gemelaDePago) {
        return enviar('T4', { estado: 'otra-cuenta', correo_oculto: gemelaDePago.correoOculto }, 0.85,
            `El plan ${nombrePlan(gemelaDePago.plan)} está en otra cuenta del mismo buzón (${gemelaDePago.correoOculto}).`);
    }

    if (sub && ['incomplete', 'past_due', 'unpaid'].includes(sub.estado)) {
        return enviar('T4', { estado: 'pendiente' }, 0.8, `El cobro quedó pendiente (${sub.estado}); el plan no se activó.`);
    }

    if (s && !s.consultado) {
        return humano(`No se pudo leer el cobro (${s.error ?? 'sin datos'}).`, 'pasar a una persona: revisar el cobro', 0.4);
    }
    if (perfilDePago) {
        return humano(`El perfil tiene ${nombrePlan(p.plan)} pero el cobro no muestra una suscripción pagada.`,
            'pasar a una persona: cotejar el cobro con el perfil', 0.6);
    }
    return enviar('T4', { estado: 'sin-pago', correo_oculto }, 0.55,
        'No hay ningún cobro asociado a esta cuenta ni a su buzón.');
}

function decidirAcceso(c: Clasificacion, h: Hechos, ctx: Contexto, enviar: Enviar, humano: Humano): Decision {
    const p = h.perfil;
    const senal = senalDeSesion(h.auth);
    const desfase = h.reloj && Math.abs(h.reloj.desfaseMinutos) >= DESFASE_RELOJ_MIN ? h.reloj.desfaseMinutos : null;

    if (desfase !== null) {
        return enviar('T5', { causa: 'reloj-desfase', desfase: describirDesfase(desfase) }, senal === 'rafaga' ? 0.95 : 0.9,
            `El reloj de su equipo va ${describirDesfase(desfase)} (cabecera Date del correo)${senal === 'rafaga' ? ' y las sesiones lo confirman' : ''}.`);
    }
    if (senal === 'rafaga') {
        const a = h.auth!;
        return enviar('T5', { causa: 'reloj' }, 0.85,
            `Ráfaga de renovaciones: ${a.max_por_minuto} en un minuto, cada token revocado a los ${a.vida_mediana_s}s; reloj del equipo o sesiones en conflicto.`);
    }
    if (senal === 'sin-renovar') {
        const a = h.auth!;
        return humano(`La sesión no se renueva: ${a.inicios} inicios en ${a.horas_entre_inicios} h, ninguno renovado («me saca cada hora»).`,
            'pasar a una persona: revisar los registros de auth (refresh_token_not_found probable)', 0.8);
    }
    if (p?.suspendidoAt) {
        return enviar('T5', { causa: 'suspendida' }, 0.85, 'Puede entrar: lo que ve es el muro de cuenta suspendida por falta de pago.');
    }
    const gemela = h.gemelas[0];
    if (gemela) {
        return enviar('T5', { causa: 'otra-cuenta', correo_oculto: gemela.correoOculto }, 0.75,
            `Hay otra cuenta del mismo buzón (${gemela.correoOculto}): puede estar entrando con la otra.`);
    }
    if (!p) {
        return humano('No puede entrar y no hay cuenta con ese correo.', 'pasar a una persona: preguntar con qué correo se registró', 0.5);
    }
    // Escribió desde el chat de la plataforma: tenía sesión. La falla es otra.
    const confianza = ctx.canal === 'chat' ? 0.7 : h.auth ? 0.75 : 0.7;
    return enviar('T5', { causa: 'contrasena' }, confianza,
        `Sin señal en las sesiones${h.auth ? ` (${h.auth.inicios} inicios en ${HORAS_AUTH} h)` : ''}: los caminos de siempre (código por correo o recuperar la contraseña).`);
}

function decidirCortada(c: Clasificacion, h: Hechos, ctx: Contexto, enviar: Enviar, humano: Humano): Decision {
    if (!h.respuestas) return humano('No se pudieron leer sus respuestas.', 'pasar a una persona', 0.4);
    const ventana = h.respuestas.filter(r => enVentana(r.creadaAt, ctx, HORAS_RESPUESTAS))
        .sort((a, b) => ms(b.creadaAt) - ms(a.creadaAt));
    if (!ventana.length) {
        return humano(`No hay ninguna respuesta suya en las ${HORAS_RESPUESTAS} h previas: la petición no llegó al servidor.`,
            'pasar a una persona: buscar el envío trabado en los registros', 0.4);
    }
    const cortadas = ventana.filter(r => r.estado === 'interrumpida');
    // Desde el 2-nov la devolución depende de una política de cobro SIN APROBAR:
    // la variable `devolucion` se queda vacía hasta que David la apruebe.
    const devolucion = '';
    if (cortadas.length >= 3) {
        return humano(`${cortadas.length} respuestas interrumpidas en ${HORAS_RESPUESTAS} h: problema persistente (¿red que retiene?).`,
            'pasar a una persona', 0.7, borrador('T6', { estado: cortadas[0].largo > 0 ? 'a-medias' : 'sin-texto', fecha_consulta: cortadas[0].creadaAt, devolucion }));
    }
    const problema = ventana.find(r => r.estado === 'interrumpida' || (r.estado === 'terminada' && !r.guardada && r.largo > 0));
    const r = problema ?? ventana[0];
    const fecha_consulta = r.creadaAt;
    if (r.estado === 'terminada' && !r.guardada && r.largo > 0) {
        return enviar('T6', { estado: 'recuperable', fecha_consulta, devolucion }, 0.9,
            `La respuesta del ${r.creadaAt.slice(0, 16)} sí terminó (${r.largo} car.) y no se guardó: se recupera al abrir el chat.`);
    }
    if (r.estado === 'interrumpida') {
        return enviar('T6', { estado: r.largo > 0 ? 'a-medias' : 'sin-texto', fecha_consulta, devolucion }, 0.85,
            `La respuesta del ${r.creadaAt.slice(0, 16)} se interrumpió ${r.largo > 0 ? `con ${r.largo} car. escritos` : 'sin una letra'}.`);
    }
    if (r.estado === 'terminada' && r.guardada) {
        return enviar('T6', { estado: 'en-historial', fecha_consulta, devolucion }, 0.75,
            `Su última respuesta (${r.creadaAt.slice(0, 16)}) terminó y está guardada en su historial.`);
    }
    return humano(`La respuesta del ${r.creadaAt.slice(0, 16)} sigue «${r.estado}».`, 'pasar a una persona', 0.5);
}

function decidirDocumento(c: Clasificacion, h: Hechos, ctx: Contexto, enviar: Enviar, humano: Humano): Decision {
    if (!h.erroresDocumento) return humano('No se pudieron leer sus mensajes de error.', 'pasar a una persona', 0.4);
    const ventana = h.erroresDocumento.filter(e => enVentana(e.at, ctx, HORAS_RESPUESTAS))
        .sort((a, b) => ms(b.at) - ms(a.at));
    if (!ventana.length) {
        return humano(`Ningún error de documento en las ${HORAS_RESPUESTAS} h previas.`, 'pasar a una persona', 0.5,
            borrador('T7', { causa: 'sin-rastro' }));
    }
    const e = ventana[0];
    if (ventana.length >= 3) {
        return humano(`${ventana.length} documentos fallidos en ${HORAS_RESPUESTAS} h (el último: ${e.causa}).`, 'pasar a una persona', 0.7,
            borrador('T7', { causa: e.causa }));
    }
    const variables: Record<string, ValorVariable> = { causa: e.causa };
    if (e.causa === 'hojas' && e.hojasDocumento && e.hojasPlan) {
        variables.hojas_documento = e.hojasDocumento;
        variables.hojas_plan = e.hojasPlan;
    }
    if (e.causa === 'hojas' && !(e.hojasDocumento && e.hojasPlan)) variables.causa = 'tamano';
    return enviar('T7', variables, e.causa === 'fallo' ? 0.75 : 0.85, `Documento sin analizar: ${e.causa} (${e.at.slice(0, 16)}).`);
}

function decidirCancelar(c: Clasificacion, h: Hechos, ctx: Contexto, enviar: Enviar, humano: Humano): Decision {
    const p = h.perfil;
    // Con el muro de suspensión no llega al perfil, y cancelar por petición es
    // una política de cobro SIN APROBAR (2-nov-2026).
    if (p?.suspendidoAt) {
        return humano('Quiere cancelar con la cuenta suspendida: el muro no le deja llegar al perfil.',
            'pasar a una persona: cancelar por petición (política sin aprobar)', 0.85);
    }
    // Variable para cuando se apruebe la política de cancelar por petición:
    // hasta entonces, vacía.
    const por_peticion = '';
    const sub = h.stripe?.suscripcion ?? null;
    if (sub && ['active', 'trialing', 'past_due'].includes(sub.estado)) {
        if (sub.cancelaAlFinal) {
            return sub.finPeriodo
                ? enviar('T8', { estado: 'ya-cancelada', fin_periodo: sub.finPeriodo, por_peticion }, 0.9,
                    `Ya canceló: conserva el acceso hasta ${sub.finPeriodo.slice(0, 10)}.`)
                : humano('Ya canceló, pero el cobro no dice hasta cuándo.', 'pasar a una persona', 0.6);
        }
        return enviar('T8', { estado: 'pasos', fin: sub.finPeriodo ? 'con-fecha' : 'sin-fecha', ...(sub.finPeriodo ? { fin_periodo: sub.finPeriodo } : {}), por_peticion },
            0.9, `Suscripción ${sub.estado} sin cancelar: los pasos del perfil${sub.finPeriodo ? ` (periodo hasta ${sub.finPeriodo.slice(0, 10)})` : ''}.`);
    }
    if (h.stripe && !h.stripe.consultado) {
        return enviar('T8', { estado: 'pasos', fin: 'sin-fecha', por_peticion }, 0.75, 'No se pudo leer el cobro: los pasos del perfil, sin fecha.');
    }
    if (p && PLANES_DE_PAGO.has(p.plan)) {
        return humano(`El perfil tiene ${nombrePlan(p.plan)} y el cobro no muestra una suscripción viva.`, 'pasar a una persona: cotejar', 0.6);
    }
    const gemela = h.gemelas.find(g => PLANES_DE_PAGO.has(g.plan));
    if (gemela) {
        return humano(`La suscripción está en otra cuenta del mismo buzón (${gemela.correoOculto}).`, 'pasar a una persona', 0.6);
    }
    return enviar('T8', { estado: 'sin-suscripcion', por_peticion }, 0.85, 'No tiene ninguna suscripción: no hay nada que cancelar.');
}
