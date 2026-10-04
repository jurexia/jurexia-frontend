/* Los capítulos de la sala de demostraciones.

   Viven fuera de la página porque los usan dos sitios: /plataforma enseña los
   de la plataforma general y /precios enseña el del taller, junto al plan que
   lo incluye. Duplicarlos sería garantizar que un día digan cosas distintas.

   LOS TÍTULOS PROMETEN EN SEGUNDA PERSONA. Es la lección de iudex.mx: no
   «Función de redacción», sino «Redacta el amparo y llévatelo a tu Word». El
   vídeo que va debajo es la prueba de la promesa; el título, la promesa.

   EL TERCER ELEMENTO DE CADA RÓTULO ES EL SEGUNDO EN QUE EMPIEZA ESE MOMENTO.
   Con él, el reproductor enciende la tarjeta que toca y escribe el rótulo sobre
   la imagen. Iudex no rotula nada: sus dos clips, de 58 y 62 segundos, se
   explican con una frase de doce palabras y el lector no sabe dónde mirar.

   TODO LO QUE SE VE EN EL VÍDEO DEL TALLER ES FICTICIO —tribunal, magistrada,
   partes, expediente— salvo los criterios del acervo, que son registros reales
   del Semanario. Se grabó así a propósito: enseñar el motor sin enseñar el
   asunto de nadie. En el del seguimiento, en cambio, el expediente es real y
   público: es la lista de acuerdos tal como la publica el propio Consejo de la
   Judicatura Federal. */

import type { Capitulo } from '@/components/DemoCapitulos';
import type { Rotulo } from '@/components/DemoEnVivo';

/* LAS GRABACIONES DEL 3-OCT-2026. Las cuatro de antes enseñaban el chat de
   antes del 25-sep —la barra de Genios, Fuero y Materia, Buscar/Redactar— y
   las carpetas con la barra pública de la web. Se regrabaron con la cuenta
   demo sobre una compilación de producción de la rama, con la barra de trabajo
   y «Now powered by OpenAI». Lo que se ve es la plataforma real; sólo se
   acelera la espera. El tercer elemento de cada rótulo es el segundo en que
   empieza ese momento en el vídeo montado. */
export const ROTULOS_CONSULTA: Rotulo[] = [
    ['La pregunta', 'En lenguaje llano, como se plantea en el despacho.', 0],
    ['El trabajo, a la vista', 'Lee la consulta, fija la jurisdicción y recorre el acervo.', 8.1],
    ['El documento', 'La respuesta se escribe en una hoja que puedes editar y llevar a Word.', 13.2],
    ['La prueba', 'Cada cita abre su documento oficial, en la página exacta y resaltada.', 21.2],
];

export const CONSULTA: Capitulo = {
    id: 'consulta',
    funcion: 'Consulta con fuente',
    gancho: 'La respuesta abre el PDF oficial en su página.',
    titulo: (
        <>
            Pregunta, y comprueba la fuente
        </>
    ),
    entradilla:
        'La respuesta trae los criterios que la sostienen. Pulsa cualquiera y se abre el documento oficial en la página exacta, con el texto resaltado. Sin salir de la conversación.',
    src: '/demo/consulta.mp4',
    poster: '/demo/consulta-poster.jpg',
    descripcion:
        'Demostración con el chat de hoy: una consulta sobre prisión preventiva oficiosa; Iurexia lee la consulta, fija la jurisdicción y recorre el acervo, escribe la respuesta en un documento con catorce citas verificadas y una de ellas abre la Constitución en el artículo 19, resaltado.',
    rotulos: ROTULOS_CONSULTA,
    url: 'iurexia.com/chat',
};

export const REDACCION: Capitulo = {
    id: 'redaccion',
    funcion: 'Redacción de escritos',
    gancho: 'La demanda entera y, de ahí, a tu Word.',
    titulo: (
        <>
            Redacta el amparo y llévatelo a tu Word
        </>
    ),
    entradilla:
        'Le cuentas el asunto como se lo contarías a un pasante: partes, acto reclamado, fechas y los agravios que quieres desarrollar, y eliges con qué esfuerzo se redacta. Iurexia escribe la demanda entera en una hoja que puedes editar, con sus fundamentos citados y verificados. Y termina donde trabajas: un .docx que abres en tu Word.',
    src: '/demo/redaccion.mp4',
    poster: '/demo/redaccion-poster.jpg',
    descripcion:
        'Demostración con datos ficticios: se elige el esfuerzo Platinum, se describe un amparo directo laboral con sus agravios, Iurexia escribe la demanda completa en el documento con doce citas verificadas y se exporta a Word.',
    rotulos: [
        ['El esfuerzo', 'Platinum: el motor más potente, con argumentos en capas.', 0],
        ['El encargo', 'Partes, acto reclamado, fechas y los agravios a desarrollar.', 6.6],
        ['La demanda', 'Entera, en una hoja que puedes editar, con sus citas verificadas.', 16.4],
        ['En tu Word', 'El .docx que abres y sigues escribiendo.', 26.4],
    ],
    url: 'iurexia.com/chat',
};

export const CARPETAS: Capitulo = {
    id: 'carpetas',
    funcion: 'Carpetas inteligentes',
    gancho: 'Lee tu expediente y te dice qué falta.',
    titulo: (
        <>
            Mete el asunto en una carpeta que piensa
        </>
    ),
    entradilla:
        'Le pones nombre y objetivo, y subes lo que tengas. La carpeta lee los documentos, mide cuánto llevas acreditado y te enumera lo que todavía falta por probar.',
    src: '/demo/carpeta.mp4',
    poster: '/demo/carpeta-poster.jpg',
    descripcion:
        'Demostración con datos ficticios: se crea la carpeta de un amparo directo con su objetivo, se suben la demanda y la sentencia reclamada, y la carpeta responde con lo que todavía falta acreditar y los riesgos que no se habían visto.',
    rotulos: [
        ['El objetivo', 'La carpeta nace sabiendo qué hay que conseguir.', 0],
        ['El expediente', 'Se sube lo que haya: la demanda, la sentencia, las pruebas.', 16.2],
        ['Lo que falta', 'Qué le falta al expediente y qué riesgos quizá no viste.', 25.3],
    ],
    url: 'iurexia.com/carpetas',
};

export const SEGUIMIENTO: Capitulo = {
    id: 'seguimiento',
    funcion: 'Seguimiento de expedientes',
    gancho: 'El juzgado se mueve y te llega un correo.',
    titulo: (
        <>
            Deja de entrar cada mañana.{' '}
            Te avisamos nosotros
        </>
    ),
    entradilla:
        'Das de alta el número y el órgano, y cada día laborable a las 9:10 Iurexia consulta el portal del Consejo por ti. Te escribe sólo cuando hay una actuación nueva — y también el día en que no pudo revisar, que es la otra mitad de la promesa.',
    src: '/demo/seguimiento.mp4',
    poster: '/demo/seguimiento-poster.jpg',
    descripcion:
        'Demostración: se busca el tribunal, se escribe el número de expediente, Iurexia prueba los tipos de asunto hasta dar con él y devuelve la carátula real del portal con su NEUN y sus últimos acuerdos.',
    rotulos: [
        ['El tribunal', 'Se busca por nombre. Están los 949 órganos del Poder Judicial de la Federación.', 0],
        ['El número', 'Y el tipo de asunto: si no lo sabes, Iurexia los prueba todos.', 9.0],
        ['La carátula', 'La que devuelve el portal, con su NEUN y su historial. Sólo entonces se guarda.', 15.5],
    ],
    url: 'iurexia.com/carpetas',
};

export const SENTENCIAS: Capitulo = {
    id: 'sentencias',
    funcion: 'Taller de sentencias',
    gancho: 'El proyecto se arma sobre tu criterio.',
    titulo: (
        <>
            Proyecta la sentencia.{' '}
            El criterio sigue siendo tuyo
        </>
    ),
    entradilla:
        'Ficha del asunto, acto reclamado y conceptos de violación. Iurexia calcula la oportunidad, extrae la ratio, plantea los problemas jurídicos y busca el acervo por cada uno. Ahí se detiene: el sentido de cada problema lo fijas tú, y sobre eso se redacta.',
    src: '/demo/sentencia.mp4',
    poster: '/demo/sentencia-poster.jpg',
    descripcion:
        'Demostración con datos ficticios: un amparo directo laboral entra al taller, se genera el adelanto, se consulta el acervo, el secretario fija su criterio en cinco problemas y el taller devuelve el proyecto de sentencia.',
    rotulos: [
        ['El adelanto', 'Oportunidad, ratio, conceptos y problemas jurídicos.'],
        ['Tu criterio', 'El sentido de cada problema, y el porqué, lo pones tú.'],
        ['La sentencia', 'El proyecto redactado sobre tu razonamiento.'],
    ],
    url: 'iurexia.com/taller',
};

/* El taller NO va aquí. Vive sólo en la tarjeta del plan Ultra, en /precios,
   porque es la herramienta que ese plan vende y porque enseñarla en la página
   general de la plataforma promete a cualquier visitante algo que su plan no
   incluye. */
export const CAPITULOS: Capitulo[] = [CONSULTA, REDACCION, CARPETAS, SEGUIMIENTO];
