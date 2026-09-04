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

export const CONSULTA: Capitulo = {
    id: 'consulta',
    funcion: 'Consulta con fuente',
    gancho: 'La respuesta abre el PDF oficial en su página.',
    titulo: (
        <>
            Pregunta, y <span className="text-accent-gold">comprueba la fuente</span>
        </>
    ),
    entradilla:
        'La respuesta trae los criterios que la sostienen. Pulsa cualquiera y se abre el documento oficial en la página exacta, con el texto subrayado. Sin salir de la conversación.',
    src: '/demo/consulta.mp4',
    poster: '/demo/consulta-poster.jpg',
    descripcion:
        'Demostración: una consulta sobre prisión preventiva oficiosa, la respuesta con sus criterios y el PDF oficial de la Constitución abierto en el artículo citado.',
    rotulos: [
        ['La pregunta', 'En lenguaje llano, como se plantea en el despacho.'],
        ['La respuesta', 'Con los criterios y las normas que la sostienen.'],
        ['La prueba', 'El PDF oficial, en su página, con el texto subrayado.'],
    ],
    url: 'iurexia.com/chat',
};

export const REDACCION: Capitulo = {
    id: 'redaccion',
    funcion: 'Redacción de escritos',
    gancho: 'La demanda entera y, de ahí, a tu Word.',
    titulo: (
        <>
            Redacta el amparo y <span className="text-accent-gold">llévatelo a tu Word</span>
        </>
    ),
    entradilla:
        'Le cuentas el asunto como se lo contarías a un pasante: partes, acto reclamado, fechas y los agravios que quieres desarrollar. Iurexia redacta la demanda entera, con sus fundamentos citados y trazados al acervo. Y termina donde trabajas: el .docx abierto en tu Word.',
    src: '/demo/redaccion.mp4',
    poster: '/demo/redaccion-poster.jpg',
    descripcion:
        'Demostración: en el modo de redacción profesional se describe un amparo directo laboral con sus cuatro conceptos de violación, Iurexia redacta la demanda completa con sus citas trazadas al acervo, se exporta a DOCX y el documento se abre en Word.',
    rotulos: [
        ['El encargo', 'Partes, acto reclamado, fechas y los agravios a desarrollar.', 0],
        ['La demanda', 'Entera: proemio, oportunidad, conceptos y petitorios.', 6.6],
        ['Las citas', 'Nueve trazadas al acervo, y la que no se pudo comprobar, dicha.', 18.2],
        ['En tu Word', 'El .docx que abres y sigues escribiendo.', 24.7],
    ],
    url: 'iurexia.com/chat',
};

export const CARPETAS: Capitulo = {
    id: 'carpetas',
    funcion: 'Carpetas inteligentes',
    gancho: 'Lee tu expediente y te dice qué falta.',
    titulo: (
        <>
            Mete el asunto en una <span className="text-accent-gold">carpeta que piensa</span>
        </>
    ),
    entradilla:
        'Le pones nombre y objetivo, y subes lo que tengas. La carpeta lee los documentos, mide cuánto llevas acreditado y te enumera lo que todavía falta por probar.',
    src: '/demo/carpeta.mp4',
    poster: '/demo/carpeta-poster.jpg',
    descripcion:
        'Demostración: se crea una carpeta con su objetivo, se suben los documentos del asunto y la carpeta responde con el porcentaje de avance y la lista de lo que falta.',
    rotulos: [
        ['El objetivo', 'La carpeta nace sabiendo qué hay que conseguir.', 0],
        ['El expediente', 'Se sube lo que haya: escritos, acuerdos, pruebas.', 16],
        ['Lo que falta', 'El avance acreditado y la lista de lo pendiente.', 22.8],
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
            <span className="text-accent-gold">Te avisamos nosotros</span>
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
        ['El número', 'Y el tipo de asunto: si no lo sabes, Iurexia los prueba todos.', 8.3],
        ['La carátula', 'La que devuelve el portal, con su NEUN y su historial. Sólo entonces se guarda.', 12.3],
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
            <span className="text-accent-gold">El criterio sigue siendo tuyo</span>
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
