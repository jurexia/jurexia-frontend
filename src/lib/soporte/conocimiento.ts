/**
 * Lo que soporte sabe responder.
 *
 * Sale de los 91 reportes reales de `user_feedback`, agrupados por lo que de
 * verdad pregunta la gente y no por lo que creíamos que preguntaba:
 *
 *   24  pagos y planes  ·  11 cancelación  ·  7 interfaz
 *    5  citas y tesis   ·   3 esperan a un humano  ·  2 acceso
 *
 * Vive en el repo y no en la base de datos a propósito: así se revisa como
 * código, con historial de quién cambió qué y por qué.
 *
 * REGLA QUE NO SE ROMPE: aquí no entra nada interno. Ni modelos, ni
 * proveedores, ni nombres de colecciones, ni arquitectura, ni claves. Si un
 * dato ayudaría al usuario pero delata cómo está hecho Iurexia, se reescribe
 * en términos de lo que él ve en pantalla.
 */

export interface Tema {
    id: string;
    /** Cómo lo dice el usuario. Sirve para que el modelo reconozca el caso. */
    senales: string[];
    /** Qué debe responder. En segunda persona de usted y sin rodeos. */
    respuesta: string;
    /** true = el equipo tiene que verlo aunque el usuario quede conforme. */
    escalarSiempre?: boolean;
}

export const TEMAS: Tema[] = [
    // ── 24 reportes: el grupo más grande ──────────────────────────────
    {
        id: 'pago-no-reflejado',
        senales: ['pagué y sigo en gratuito', 'no se refleja mi plan', 'compré platinum y no aparece'],
        respuesta:
            'El cobro y la activación viajan por caminos distintos, así que a veces el plan tarda unos minutos en aparecer. ' +
            'Cierre sesión, vuelva a entrar y revise su perfil. Si después de eso sigue en gratuito, dígamelo: ' +
            'necesito el correo con el que pagó, porque casi siempre el pago quedó en una cuenta distinta a la que está usando.',
    },
    {
        id: 'dos-cuentas',
        senales: ['tenía premium y ahora aparezco gratuito', 'me quitaron mi plan', 'perdí mi suscripción'],
        respuesta:
            'Su suscripción no se ha tocado. Lo que ocurre casi siempre es que existen dos cuentas a su nombre —una con el plan y otra gratuita— ' +
            'y entró con la segunda. En su perfil verá un aviso si detectamos la otra cuenta. ' +
            'Salga y entre con el correo que usó al pagar, y todo vuelve a su lugar.',
    },
    // ── 11 reportes ───────────────────────────────────────────────────
    {
        id: 'cancelar',
        senales: ['quiero cancelar', 'no me deja cancelar', 'cómo cancelo mi suscripción'],
        respuesta:
            'Se cancela desde su perfil, en «Mi suscripción»: al final de esa tarjeta está «Cancelar mi suscripción». ' +
            'Conserva el acceso hasta que termine el periodo que ya pagó, y no se le vuelve a cobrar. ' +
            'Si el botón no aparece o le marca error, dígamelo y lo cancelo yo desde aquí.',
        escalarSiempre: true,
    },
    // ── 7 reportes ────────────────────────────────────────────────────
    {
        id: 'historial',
        senales: ['no veo mis consultas anteriores', 'el historial no baja', 'solo se ve una conversación'],
        respuesta:
            'El historial vive en la barra izquierda, agrupado por fecha. Si le costaba desplazarse o se le regresaba solo, ' +
            'eso ya está corregido: recargue la página con la caché limpia (Ctrl+Shift+R, o Cmd+Shift+R en Mac) y debería recorrerlo entero. ' +
            'En el teléfono se abre con el botón de menú, arriba a la izquierda.',
    },
    {
        id: 'pantalla',
        senales: ['no se ve el panel derecho', 'la pantalla se corta', 'no puedo leer bien'],
        respuesta:
            'Suele ser el zoom del navegador. Pruebe con Ctrl+0 (Cmd+0 en Mac) para volverlo al 100 %. ' +
            'Si el documento aparece cortado a la derecha, ábralo con el enlace del PDF: se ve completo en su propia pestaña.',
    },
    // ── 5 reportes ────────────────────────────────────────────────────
    {
        id: 'tesis',
        senales: ['citó una tesis que no existe', 'el registro digital no aparece en la SCJN', 'la tesis es de otra materia'],
        respuesta:
            'Eso es serio y quiero que lo revise el equipo. Cada respuesta lleva un sello de citas verificadas contra el Semanario Judicial; ' +
            'si una tesis pasó sin verificar, necesitamos el número de registro y la consulta exacta para corregirlo. ' +
            'Páseme esos dos datos, por favor.',
        escalarSiempre: true,
    },
    // ── 2 reportes ────────────────────────────────────────────────────
    {
        id: 'acceso',
        senales: ['no puedo entrar desde el celular', 'dice que mis datos son incorrectos', 'olvidé mi contraseña'],
        respuesta:
            'Use «¿Olvidó su contraseña?» en la pantalla de acceso: le llega un enlace al correo y queda resuelto en un minuto. ' +
            'Si entra en la computadora pero no en el teléfono, casi siempre es que el teclado del móvil puso mayúscula inicial en el correo. ' +
            'Escríbalo todo en minúsculas.',
    },
    // ── El caso que el widget nunca atendió ───────────────────────────
    {
        id: 'espera-humano',
        senales: ['nadie me responde', 'les mandé un proyecto y no contestan', 'llevo días esperando'],
        respuesta:
            'Tiene razón en reclamarlo y le pido una disculpa. Este canal era un buzón, no una conversación, y por eso se quedó sin respuesta. ' +
            'Ya no: aquí le contesto de inmediato y, si no puedo resolverlo, lo paso al equipo con todo lo que me cuente. ' +
            '¿Qué necesita?',
        escalarSiempre: true,
    },
    // ── El malentendido más común: creen que esto es el chat legal ────
    {
        id: 'consulta-legal',
        senales: ['redáctame el amparo', 'resume esta demanda', 'fundamenta con más técnica', 'quiero que analices'],
        respuesta:
            'Con gusto, pero por aquí no puedo trabajar su asunto: este canal es sólo para fallas de la plataforma. ' +
            'Lleve esa petición al chat de Iurexia —el botón «Ir al Chat»— y ahí tendrá el análisis completo, con sus fundamentos y citas. ' +
            'Si lo que falla es que el chat no le responde bien, eso sí cuéntemelo aquí.',
    },
    {
        id: 'sin-respuesta-chat',
        senales: ['se atora', 'no me contesta nada', 'se queda pensando', 'no carga la respuesta'],
        respuesta:
            'Cuéntemelo con detalle para poder reproducirlo: qué estado tenía seleccionado, qué preguntó y si había subido un documento. ' +
            'Mientras tanto, recargue la página y vuelva a intentarlo — si fue un corte de conexión, con eso basta.',
        escalarSiempre: true,
    },
    {
        id: 'globo-internet',
        senales: ['el botón de internet tiene candado', 'no me deja buscar en internet'],
        respuesta:
            'Las fuentes de internet están disponibles desde el plan Pro. El botón del globo se enciende con un clic y se apaga solo al recargar, ' +
            'para que no consuma cuando no lo necesita. Con él activo, la respuesta termina con la lista de sitios oficiales consultados.',
    },
];


/* ── QUÉ ES CADA COSA EN IUREXIA ──────────────────────────────────────────
 *
 * Sin esto, soporte contestaba «no manejo esa información» a preguntas sobre
 * funciones propias de la plataforma. Un abogado preguntó por los Genios —que
 * son una función central— y se le respondió que no se le podía ayudar. Eso no
 * es prudencia: es no conocer el producto, y cuesta más confianza que un error.
 *
 * Aquí va lo que el USUARIO ve y usa. Nada de cómo está construido.
 */
export const MAPA_PLATAFORMA = `
LA CAJA DE CONSULTA (pantalla del chat)
· Fuero — acota a Constitucional, Federal o Estatal. Sin marcar, busca en todos.
· Materia — Civil, Penal, Familiar o Administrativa. En Auto se detecta sola.
· Rayo (Respuesta rápida) — la cita al grano, sin desarrollo. Todos los planes.
· Globo (Fuentes de internet) — añade búsqueda en dominios oficiales: poderes
  judiciales, congresos, diarios oficiales. Desde plan Pro. Se enciende con un
  clic y se apaga al recargar, para no gastar cuando no hace falta.
· Buscar / Redactar — Buscar halla la norma con cita verificable; Redactar
  construye el argumento articulado. Al elegir Redactar aparecen tres escalones:
  Profesional (todos los planes), Pro y Platinum, con razonamiento más profundo.
· Micrófono — dicta la consulta en vez de escribirla. Chrome y Safari.
· Clip — sube un PDF, Word o TXT y Iurexia lo lee completo. El límite de páginas
  crece con el plan.

LOS MODOS DE TRABAJO
· Escrito legal — genera demanda, contestación, amparo, denuncia o recurso con
  sus fundamentos. Todos los planes.
· Sentencia — audita una resolución AJENA: incoherencias del razonamiento, apego
  constitucional, vicios de forma y fondo. Desde plan Pro.
· Precedentes — busca en la jurisprudencia y tesis del Poder Judicial de la
  Federación. Se elige corte (SCJN o Tribunales Colegiados), sala, circuito o
  tribunal. Cada criterio llega con su registro digital verificado. Desde Pro.
· Jurimetría — estadística judicial: cómo han resuelto los tribunales asuntos
  como el suyo, en qué sentido y con qué frecuencia. Exclusivo Platinum.

LOS GENIOS
Especialistas por materia: CIDH, Amparo, Civil, Penal, Laboral, Agrario, Fiscal,
Mercantil y Administrativo. Cada uno lleva en memoria el corpus completo de su
materia —códigos, leyes orgánicas, reglamentos—, así que cita artículos
textuales y conecta normas como un especialista.
· Se activan con un clic en la fila de Genios, bajo la caja de consulta.
· Desde plan Pro. Hasta DOS a la vez. La sesión dura 3 minutos tras activarse.
· No se pueden combinar con el modo Redacción cuando hay dos activos.
· Si no necesita tanta profundidad, los filtros de Fuero y Materia ya dan
  respuestas muy completas sin consumir una sesión de Genio.

LA BARRA SUPERIOR
· Sálvame — el amparo por salud, con su propio flujo de urgencia.
· Sentencia (Secretario del PJF) — redacta un borrador de sentencia COMPLETO
  desde el expediente: antecedentes, considerandos y resolutivos. Abre su propia
  pantalla. Exclusivo Platinum.
· Mi trabajo — sus carpetas. Ahí se guarda lo que produce, organizado por
  asunto. Cada respuesta tiene «A mi carpeta» para archivarla.
· Normativa — el acervo de leyes navegable.
· El estado (jurisdicción) — filtra toda consulta hacia la legislación de esa
  entidad. Se cambia con un clic.

OTRAS PANTALLAS
· Agente — arma una demanda de amparo indirecto por pasos, con un plan que usted
  aprueba antes de que se redacte. En beta.
· Perfil — plan, consumo del periodo, datos fiscales, contraseña y el programa
  «Invite y ascienda»: tres colegas con plan Pro o superior y sube a Platinum.
· Guía rápida de uso — en la barra izquierda del chat, recorre cada botón.

EL ACERVO
Legislación de las 32 entidades y federal, jurisprudencia y tesis del Poder
Judicial de la Federación, y el bloque de constitucionalidad. Cada respuesta
lleva un sello de citas verificadas contra el Semanario Judicial.
`;

/** El bloque que se le da al modelo. Sin metadatos ni ids: sólo lo útil. */
export function conocimientoParaPrompt(): string {
    return TEMAS
        .map(t => `· Cuando digan algo como «${t.senales[0]}»:\n  ${t.respuesta}`)
        .join('\n\n');
}

/* Disparadores del escalado, en RAÍCES y sin tildes.
 *
 * La primera versión troceaba las frases de ejemplo y exigía que estuvieran
 * todas sus palabras. Falló con un reporte REAL: «iurexia me cito tesis que no
 * existian al verificarlas en la pagina SCJN» — «existian» no es «existe» y
 * «cito» no es «citó». Nadie escribe como el ejemplo, y menos con prisa y sin
 * acentos.
 *
 * Cada grupo es una conjunción: todas sus raíces tienen que aparecer. Basta
 * con que UN grupo case.
 */
const DISPARADORES: string[][] = [
    // Tesis inventada o mal traída: siempre lo ve el equipo.
    ['tesis', 'no exist'], ['tesis', 'inventa'], ['registro', 'no exist'],
    ['tesis', 'otra materia'], ['cita', 'falsa'],
    // Cancelación: aunque se le explique, queremos confirmarla nosotros.
    ['cancel'],
    // Creen que nadie los atiende.
    ['nadie', 'respond'], ['no me respond'], ['sin respuesta'], ['no me contest'],
    ['dias esperando'], ['no me han contest'],
    // El chat se queda colgado.
    ['se atora'], ['se queda pensando'], ['no carga la respuesta'],
];

/** Quita tildes y baja a minúsculas: la gente escribe sin acentos. */
function normalizar(texto: string): string {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/** ¿Es un tema que, si NO se resuelve, debe acabar en el equipo?
 *
 * OJO con lo que esta función NO es (7-ago-2026): no es una orden de escalar
 * ahora. Se usaba así y el resultado fue que soporte@iurexia.com recibía un
 * correo POR CADA MENSAJE del usuario, desde el primero, aunque la respuesta
 * lo resolviera en el acto. El buzón se llenó de conversaciones resueltas.
 *
 * Ahora sólo marca el tema como delicado. El escalado ocurre en un único
 * momento —cuando el intercambio termina sin solución— y manda UN correo con
 * la conversación completa, que es lo único que le sirve a quien la lee.
 */
export function temaDelicado(texto: string): boolean {
    const t = normalizar(texto);
    return DISPARADORES.some(grupo => grupo.every(raiz => t.includes(normalizar(raiz))));
}
