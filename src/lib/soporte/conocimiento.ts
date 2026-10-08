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
            'Cierre sesión, vuelva a entrar y revise su perfil, en «Plan y pagos». Si después de eso sigue en gratuito, dígamelo: ' +
            'necesito el correo con el que pagó, porque casi siempre el pago quedó en una cuenta distinta a la que está usando.',
    },
    {
        id: 'dos-cuentas',
        senales: ['tenía premium y ahora aparezco gratuito', 'me quitaron mi plan', 'perdí mi suscripción'],
        respuesta:
            'Su suscripción no se ha tocado. Lo que ocurre casi siempre es que existen dos cuentas a su nombre —una con el plan y otra gratuita— ' +
            'y entró con la segunda. Si es así, su perfil le muestra un aviso con el correo de la otra cuenta (en parte oculto). ' +
            'Salga y entre con ese correo; si prefiere quedarse con esta cuenta, el equipo puede trasladar la suscripción.',
    },
    // ── 11 reportes ───────────────────────────────────────────────────
    {
        id: 'cancelar',
        senales: ['quiero cancelar', 'no me deja cancelar', 'cómo cancelo mi suscripción'],
        respuesta:
            'Se cancela desde su perfil, pestaña «Plan y pagos», tarjeta «Mi suscripción»: «Cancelar mi suscripción». ' +
            'También desde el menú de su foto, arriba a la derecha. Le preguntará el motivo y, según el caso, le ofrecerá pausar un mes sin cargo, ' +
            'pero «Cancelar de todas formas» está siempre a un clic. Conserva el acceso hasta que termine el periodo pagado y no se le vuelve a cobrar. ' +
            'Si el botón no aparece o marca error, lo paso al equipo para que lo cancele.',
        escalarSiempre: true,
    },
    {
        id: 'reembolso',
        senales: ['quiero mi dinero', 'reembolso', 'me cobraron y no lo uso'],
        respuesta:
            'Le entiendo. La política publicada en la página de precios es que no hay reembolsos: al cancelar se conserva el acceso hasta el fin del periodo pagado. ' +
            'Aun así, paso su caso al equipo con lo que me cuente para que lo revisen y le escriban a su correo.',
        escalarSiempre: true,
    },
    // ── 7 reportes ────────────────────────────────────────────────────
    {
        id: 'historial',
        senales: ['no veo mis consultas anteriores', 'el historial no baja', 'desapareció mi conversación'],
        respuesta:
            'Sus consultas están en la barra izquierda. Las que no están en una carpeta aparecen en «Consultas», por fecha; las que movió a una carpeta ' +
            'aparecen DENTRO de esa carpeta, al desplegarla. Con más de seis consultas sale arriba un buscador. ' +
            'En el teléfono la barra se abre con el botón de menú, arriba a la izquierda. Si aun así no aparece, recargue con Ctrl+Shift+R (Cmd+Shift+R en Mac).',
    },
    {
        id: 'pantalla',
        senales: ['no se ve el panel derecho', 'la pantalla se corta', 'no puedo leer bien'],
        respuesta:
            'Suele ser el zoom del navegador. Pruebe con Ctrl+0 (Cmd+0 en Mac) para volverlo al 100 %. ' +
            'El panel «Documento» de la derecha se cierra con «Recoger»; en el teléfono se cambia entre «Consulta» y «Documento» con las pestañas de arriba. ' +
            'Si un PDF de la fuente aparece cortado, ábralo con su enlace y se ve completo en su propia pestaña.',
    },
    // ── 5 reportes ────────────────────────────────────────────────────
    {
        id: 'tesis',
        senales: ['citó una tesis que no existe', 'el registro digital no aparece en la SCJN', 'la tesis es de otra materia'],
        respuesta:
            'Eso es serio y quiero que lo revise el equipo. Las respuestas con citas llevan un sello: «Citas verificadas» si se comprobaron contra el acervo y el Semanario Judicial, ' +
            'o un aviso cuando alguna no se pudo comprobar. Si una tesis pasó sin verificar, necesitamos el número de registro y la consulta exacta para corregirlo. ' +
            'Páseme esos dos datos, por favor.',
        escalarSiempre: true,
    },
    // ── 2 reportes ────────────────────────────────────────────────────
    {
        id: 'acceso',
        senales: ['no puedo entrar desde el celular', 'dice que mis datos son incorrectos', 'olvidé mi contraseña'],
        respuesta:
            'En la pantalla de acceso tiene dos caminos: «¿Olvidaste tu contraseña?», que le manda un enlace al correo, o «Entrar con un código por correo», ' +
            'que le manda un código de 6 dígitos y no necesita contraseña. También puede entrar con Google o con Apple si así creó la cuenta. ' +
            'Si falla sólo en el teléfono, revise que el teclado no haya puesto mayúscula inicial o un espacio al final del correo.',
    },
    // ── El caso que el widget nunca atendió ───────────────────────────
    {
        id: 'espera-humano',
        senales: ['nadie me responde', 'les mandé un proyecto y no contestan', 'llevo días esperando'],
        respuesta:
            'Tiene razón en reclamarlo y le pido una disculpa. Aquí le contesto de inmediato y, si no puedo resolverlo, lo paso al equipo con todo lo que me cuente ' +
            'y le escriben a su correo. ¿Qué necesita?',
        escalarSiempre: true,
    },
    // ── El malentendido más común: creen que esto es el chat legal ────
    {
        id: 'consulta-legal',
        senales: ['redáctame el amparo', 'resume esta demanda', 'fundamenta con más técnica', 'quiero que analices'],
        respuesta:
            'Con gusto, pero por aquí no puedo trabajar su asunto: este canal es sólo para dudas y fallas de la plataforma. ' +
            'Escríbalo en la caja de consulta del chat —la que está detrás de esta ventana— y ahí tendrá el análisis completo, con sus fundamentos y citas. ' +
            'Si lo que falla es que el chat no le responde bien, eso sí cuéntemelo aquí.',
    },
    {
        id: 'sin-respuesta-chat',
        senales: ['se atora', 'no me contesta nada', 'se queda pensando', 'no carga la respuesta'],
        respuesta:
            'Cuéntemelo con detalle para poder reproducirlo: qué entidad tenía seleccionada, qué preguntó y si había adjuntado un documento. ' +
            'Mientras tanto, recargue la página y vuelva a intentarlo — si fue un corte de conexión, con eso basta.',
        escalarSiempre: true,
    },
    {
        id: 'internet',
        senales: ['el botón de internet tiene candado', 'no me deja buscar en internet', 'dónde está el globo'],
        respuesta:
            'La búsqueda en internet ya no es un globo: es la quinta fila del botón «Fuentes», abajo a la izquierda de la caja de consulta. ' +
            'Está disponible desde el plan Pro, se enciende con un clic y se apaga sola al recargar la página. ' +
            'Con ella encendida, la respuesta suma sitios oficiales: Diario Oficial, Suprema Corte, congresos y tribunales.',
    },
    // ── Lo nuevo de la plataforma que más se pregunta ─────────────────
    {
        id: 'redactor-pjf',
        senales: ['no me deja entrar al redactor pjf', 'el redactor dice ultra', 'quiero hacer un proyecto de sentencia'],
        respuesta:
            'El Redactor PJF —el taller que redacta un proyecto de sentencia a partir del expediente— es del plan Ultra Secretarios ($999 al mes, 40 proyectos al mes). ' +
            'Cada cuenta tiene un proyecto de prueba gratis; si ya lo usó, el botón le muestra el plan. Platinum no lo incluye. ' +
            'En pantallas angostas el botón está dentro de «Más», en la barra de arriba.',
    },
    {
        id: 'archivo',
        senales: ['no puedo subir mi archivo', 'no me acepta el documento', 'el pdf es muy grande'],
        respuesta:
            'En el chat se adjunta un documento por consulta: PDF o Word (.doc y .docx), de hasta 25 MB, con el clip de la caja o arrastrándolo a la ventana. ' +
            'Cada plan lee hasta cierto número de hojas: Gratuito 20, Básico 50, Pro 100 y Platinum 600. ' +
            'Si es un archivo de texto u otro formato, guárdelo como PDF o Word y vuelva a subirlo.',
    },
    {
        id: 'documento-versiones',
        senales: ['no encuentro mi escrito', 'perdí la versión anterior', 'no veo el documento en otra computadora'],
        respuesta:
            'No es una falla: así funciona, y no hace falta escalarlo. El escrito vive en el panel «Documento», a la derecha; arriba están el selector de versiones ' +
            '(las últimas doce) y el botón azul «Word», que lo descarga con las citas como notas al pie. Esas versiones se guardan en el navegador donde se hicieron, ' +
            'así que en otra computadora no aparecen. Para tenerlo en todas partes, descárguelo en Word o use «A mi carpeta» en la respuesta.',
    },
    {
        id: 'contador',
        senales: ['cuántas consultas me quedan', 'no veo el contador', 'dónde veo mi consumo'],
        respuesta:
            'El contador está arriba a la derecha de la barra, pero en pantallas angostas se oculta para dejar sitio. ' +
            'Siempre puede verlo en el menú de su foto, arriba a la derecha, y en su perfil, pestaña «Plan y pagos». ' +
            'Las consultas se cuentan por mes.',
    },
    {
        id: 'guia',
        senales: ['dónde está la guía rápida', 'cómo se usa la plataforma', 'necesito un manual'],
        respuesta:
            'La guía rápida de la barra izquierda se retiró. Lo que la sustituye es un video de un minuto y medio: con el chat vacío, ' +
            'debajo de la caja de consulta está el enlace azul «Ver tutorial de uso del nuevo chat», que lo abre en otra pestaña. ' +
            'Y cualquier botón que no entienda, pregúntemelo aquí y se lo explico.',
    },
    {
        id: 'mover-soporte',
        senales: ['el botón de soporte me tapa', 'cómo quito este botón', 'el chat de ayuda estorba'],
        respuesta:
            'Puede moverlo: mantenga presionado el botón «Soporte» —con el dedo o con el ratón— y arrástrelo a donde no le estorbe; recuerda el sitio. ' +
            'El panel abierto también se mueve arrastrándolo por su cabecera. Cerrarlo sólo lo repliega, para que no se quede sin este canal.',
    },
    {
        id: 'cuenta-suspendida',
        senales: ['mi cuenta está suspendida', 'dice falta de pago', 'cuenta bloqueada'],
        respuesta:
            'Si la pantalla dice «Cuenta suspendida por falta de pago», el último cobro fue rechazado: basta con actualizar el método de pago ahí mismo y la cuenta se reactiva sola. ' +
            'Si dice «Cuenta bloqueada», está ligada a una disputa de cargo con su banco y la tiene que ver el equipo: lo paso de inmediato.',
        escalarSiempre: true,
    },
    {
        id: 'eliminar-cuenta',
        senales: ['quiero borrar mi cuenta', 'eliminar mis datos', 'dar de baja mi cuenta'],
        respuesta:
            'Puedo ayudarle. Desde el perfil todavía no se puede eliminar la cuenta por cuenta propia, así que paso su solicitud al equipo para que la atienda y le confirme por correo. ' +
            'Si sólo quiere dejar de pagar, eso sí lo hace usted mismo: perfil, «Plan y pagos», «Cancelar mi suscripción».',
        escalarSiempre: true,
    },
    {
        id: 'factura',
        senales: ['necesito factura', 'cfdi', 'datos fiscales'],
        respuesta:
            'Sus datos fiscales —RFC, razón social, régimen, código postal y uso del CFDI— se capturan en su perfil, pestaña «Plan y pagos». ' +
            'Para la factura en sí, paso su solicitud al equipo con el correo de su cuenta.',
        escalarSiempre: true,
    },
];


/* ── QUÉ ES CADA COSA EN IUREXIA ──────────────────────────────────────────
 *
 * Sin esto, soporte contestaba «no manejo esa información» a preguntas sobre
 * funciones propias de la plataforma. Un abogado preguntó por los Genios —que
 * entonces eran una función central— y se le respondió que no se le podía
 * ayudar. Eso no es prudencia: es no conocer el producto, y cuesta más
 * confianza que un error.
 *
 * Aquí va lo que el USUARIO ve y usa. Nada de cómo está construido.
 *
 * PUESTO AL DÍA EL 7-OCT-2026, contra el código (no de memoria): la barra con
 * relieve y sin iconos, el panel Documento, Lo último, Estudiar y pensar, los
 * flujos, el seguimiento, los precios vigentes, «Regala Iurexia» y los avisos
 * de cuenta. Se corrigió lo que ya era falso: el Redactor PJF NO es de
 * Platinum (es de Ultra Secretarios), el clip no acepta TXT, «Invite y
 * ascienda» y la guía rápida ya no existen, y el globo de internet es ahora
 * una fila de «Fuentes». Cuando cambie la pantalla, esto se cambia con ella.
 */
export const MAPA_PLATAFORMA = `
LA BARRA DE ARRIBA (en el chat y en las demás páginas de la plataforma)
Botones con su nombre, sin iconos. Lo que no cabe en pantallas angostas —o con
el panel Documento abierto— pasa al botón «Más».
· Mi trabajo — sus carpetas (página «Mis carpetas»).
· Lo último — novedades en cuatro pestañas: Suprema Corte, Tesis de la semana,
  Diario Oficial e Inteligencia artificial.
· Normativa — el repositorio de leyes: Constitución, tratados, leyes federales y
  de las entidades.
· Redactor PJF — el taller que redacta un proyecto de sentencia desde el
  expediente (adelanto, acervo, criterio del secretario y proyecto). Es del plan
  Ultra Secretarios: 40 proyectos al mes y recargas de 10 por $250 que no
  caducan. Cada cuenta tiene UN proyecto de prueba gratis, sin tarjeta.
  Platinum NO lo incluye. Sin acceso, el botón dice «Ultra».
· Sálvame (rojo) — el amparo por salud con su flujo de urgencia. Gratis para
  cualquier cuenta con sesión; entrega el escrito en Word.
· La entidad (p. ej. «Querétaro») — dice qué leyes estatales se consultan. Lista
  las 32 entidades; no hay opción «Federal». En el teléfono está dentro de «Más».
  Para trabajar sólo con derecho federal se apaga «Leyes estatales» en Fuentes.
· El contador «usadas/límite» de consultas del mes. Se oculta en pantallas
  angostas; también está en el menú de la foto y en el perfil.
· La foto (menú): consultas usadas, «Mi perfil», «Planes», «Cancelar
  Suscripción» (si tiene plan) y «Cerrar sesión».
· El botón «Soporte» (este canal) se puede arrastrar a cualquier sitio y
  recuerda dónde se dejó.

EL TUTORIAL
La «Guía rápida de uso» de la barra izquierda ya no existe. En su lugar, con el
chat vacío, debajo de la caja de consulta está el enlace azul «Ver tutorial de
uso del nuevo chat»: abre en otra pestaña un video de 1 min 25 s.

LA CAJA DE CONSULTA
· Se escribe la consulta o se pide un escrito («Redacta una demanda de…»).
  Enter envía; Mayús+Enter salta de línea. Mientras responde hay un botón para
  detenerla.
· Fuentes — abajo a la izquierda. Cuatro fuentes, cada una con su emblema:
  Bloque de constitucionalidad, Jurisprudencia nacional, Leyes federales y Leyes
  estatales. Se combinan con un clic; al menos una queda encendida y hay
  «Encender todas». La elección se queda guardada en ese navegador. Quinta fila:
  Internet (sitios oficiales), desde plan Pro; arranca apagada en cada carga.
· Esfuerzo — con qué fuerza se redacta un escrito: Básico (todos), Pro (desde
  Pro) y Platinum (Platinum y Ultra). Sólo cuenta cuando se pide un escrito.
· Micrófono — dictado en español; funciona en Chrome y Safari.
· Clip — UN documento por consulta: PDF o Word (.doc, .docx), hasta 25 MB.
  También se puede arrastrar a la ventana. Hojas que se leen: Gratuito 20,
  Básico 50, Pro 100, Platinum y Ultra 600. No acepta TXT.
· «Desplegar herramientas» (o «Herramientas»), bajo la caja, abre cinco:
  - Escrito legal — formulario para Demanda, Amparo, Impugnación, Contrato,
    Petición u oficio y Denuncia disciplinaria. Todos los planes.
  - Sentencia — audita una resolución AJENA (se arrastra o se pega) y entrega una
    nota exportable a Word. Desde plan Pro.
  - Precedentes — busca criterios del Poder Judicial de la Federación: SCJN,
    Tribunales Colegiados o ambas; sala, circuito y tribunal. Desde plan Pro.
  - Jurimetría — sentido probable de un asunto (concede, niega, sobresee).
    Platinum y Ultra.
  - Toulmin — el constructor de demandas y recursos en cinco pasos (el caso,
    argumentos, redactar, revisar, Word). Los pasos de argumentar, redactar y
    revisar cuentan una consulta cada uno.

LAS RESPUESTAS Y EL PANEL DOCUMENTO
· Cada respuesta llega como tarjeta con sus fuentes por institución y, si cita,
  el sello: «Citas verificadas», o un aviso cuando alguna no se pudo comprobar
  contra el acervo o el Semanario. Los registros confirmados enlazan a la ficha
  oficial.
· En cada respuesta: «Desarrollar a partir de este fundamento» (redacta desde
  ahí; cuenta una consulta) y «A mi carpeta».
· El texto completo se abre en el panel «Documento», a la derecha: editable,
  con el botón azul «Word» (citas como notas al pie), papel Carta u Oficio,
  imprimir, nombre del documento y «Versión N» (las últimas doce, guardadas sólo
  en ese navegador). «Recoger» lo cierra. En el teléfono: pestañas «Consulta» y
  «Documento». Las citas [N] abren la fuente.

LA BARRA IZQUIERDA
· Nueva consulta.
· Flujos de trabajo — construyen un escrito completo por pasos: amparo
  indirecto, amparo directo, contestación de demanda, agravios de apelación,
  revisión de contrato, teoría del caso (penal acusatorio) e investigación y
  dictamen. Pro 30 al mes; Platinum y Ultra 60. Iniciar un flujo gasta uno del
  mes y ninguna consulta.
· Mis carpetas y la lista de carpetas: cada carpeta despliega sus consultas,
  «Nueva consulta aquí» y «Documentos y análisis». Tipos: Cliente, Asunto o
  juicio, Proyecto académico y Documento legal.
· Estudiar y pensar — lecciones del canal de YouTube de Iurexia con su lectura
  en PDF.
· Consultas — las que no están en una carpeta, por fecha. Con más de seis sale
  un buscador. Menú de cada consulta: renombrar, mover a una carpeta, sacar de
  la carpeta, eliminar.
· Regala Iurexia — enlace para invitar colegas (ver PLANES).
· En el teléfono se abre con el botón de menú, arriba a la izquierda.

MIS CARPETAS (página)
· Dos pestañas: «Mis carpetas inteligentes» y «Seguimiento ante órganos
  jurisdiccionales».
· Dentro de una carpeta: objetivo, «Lo que ve Iurexia» (análisis; actualizarlo
  cuenta una consulta), consultas de la carpeta, «Redactar» (incidentes,
  medidas provisionales, contestación de vistas, apelaciones) y documentos
  (subir uno cuenta una consulta). Espacio: Gratuito 20 MB, Básico 100, Pro 500,
  Platinum y Ultra 2 GB.
· Seguimiento — por ahora, órganos del Poder Judicial de la Federación. Se revisa
  cada día a las 9:10 (hora de la Ciudad de México) y llega un correo sólo si hay
  algo nuevo.

LOS GENIOS
Se retiraron el 25-sep-2026. Si alguien los busca: ya no existen; basta con
preguntar en el chat, y para escritos largos están los flujos de trabajo (desde
Pro). El rayo (respuesta rápida) también se retiró.

PLANES (precios en pesos; anual = cupo mensual igual, pagado por año)
· Gratuito — $0. 5 consultas al mes; documentos de hasta 20 hojas.
· Básico — $79 al mes o $790 al año. 70 consultas; 50 hojas.
· Pro — $149 al mes o $1,490 al año. 140 consultas; 100 hojas; internet,
  Precedentes, Sentencia y esfuerzo Pro; 30 flujos al mes.
· Platinum — $599 al mes o $5,990 al año. 560 consultas; 600 hojas; todo lo de
  Pro, Jurimetría y esfuerzo Platinum; 60 flujos.
· Ultra Secretarios — $999 al mes. Lo de Platinum más el Redactor PJF con 40
  proyectos al mes.
· Subir de plan es inmediato; bajar aplica en el siguiente ciclo. Se paga con
  Visa, Mastercard o American Express. La política publicada es que no hay
  reembolsos: al cancelar se conserva el acceso hasta el fin del periodo.
· Pro al 50 % el primer mes (oferta por correo, página /pro50): sólo Pro
  mensual, sólo cuentas que nunca han pagado, vigente hasta el 17 de octubre de
  2026; después renueva a $149.
· Regala Iurexia — el colega invitado recibe 25 consultas que no caducan, sin
  tarjeta. Quien invita gana 30 días si se suscribe un colega y 60 días si se
  suscriben tres: de Pro si hoy es gratuito o Básico; de Platinum si ya es Pro o
  más. El enlace está en el botón «Regala Iurexia» de la barra izquierda (y, en
  cuentas de pago, en la pestaña «Invitaciones» del perfil).

LA CUENTA
· Entrar: correo y contraseña, «Entrar con un código por correo» (6 dígitos,
  sin contraseña), Google o Apple. «¿Olvidaste tu contraseña?» manda un enlace;
  si se abre en otro navegador falla, y entonces conviene el código.
· Registro con código de 6 dígitos al correo; la contraseña es opcional. Hay un
  campo «Código de invitación». «Probar sin registrarme» abre la versión básica.
· Versión básica (sin cuenta, o gratuita sin consultas): responde con criterios
  del Semanario y su registro digital; lo demás aparece con candado en «Con un
  plan».
· Perfil — pestañas Mi cuenta (foto y nombre; el correo no se cambia), Plan y
  pagos (suscripción, «Actualizar Plan», «Portal de Facturación», datos
  fiscales), Práctica, Invitaciones (cuentas de pago) y Preferencias
  (tratamiento, contraseña).
· Cancelar: perfil, «Plan y pagos», «Cancelar mi suscripción» (o el menú de la
  foto). Pide el motivo, puede ofrecer pausar un mes sin cargo (una vez), y
  «Cancelar de todas formas» está siempre visible. Se conserva el acceso hasta el
  fin del periodo; cuenta, consultas y carpetas no se borran.
· Eliminar la cuenta todavía NO se puede desde el perfil: se pasa al equipo.
· Avisos de pantalla completa: «Cuenta suspendida por falta de pago» (se
  actualiza el método de pago y se reactiva sola), «Cuenta bloqueada por disputa
  de cargo» (la ve el equipo) y «Cuenta inhabilitada» («Reactivar mi cuenta»).

EL ACERVO
Legislación federal y de las 32 entidades, jurisprudencia y tesis del Poder
Judicial de la Federación, y el bloque de constitucionalidad.
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
    // Dinero y cuenta: siempre lo confirma el equipo (7-oct-2026).
    ['reembols'], ['devuel', 'dinero'], ['disputa'], ['suspendid'], ['bloquead'],
    ['elimin', 'cuenta'], ['borr', 'cuenta'], ['factur'],
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
