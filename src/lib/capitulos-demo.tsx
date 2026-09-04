/* Los capítulos de la sala de demostraciones.

   Viven fuera de la página porque los usan dos: /plataforma los enseña los
   cuatro y /precios enseña sólo el del taller, junto al plan que lo incluye.
   Duplicarlos sería garantizar que un día digan cosas distintas.

   LOS TÍTULOS PROMETEN EN SEGUNDA PERSONA. Es la lección de iudex.mx: no
   «Función de redacción», sino «Redacta el amparo y llévatelo a tu Word». El
   vídeo que va debajo es la prueba de la promesa; el título, la promesa.

   TODO LO QUE SE VE EN EL VÍDEO DEL TALLER ES FICTICIO —tribunal, magistrada,
   partes, expediente— salvo los criterios del acervo, que son registros reales
   del Semanario. Se grabó así a propósito: enseñar el motor sin enseñar el
   asunto de nadie. */

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
        'Dices qué escrito quieres y de qué asunto. Iurexia lo redacta completo, con sus fundamentos citados y trazados al acervo. Y termina donde trabajas: un .docx que abres y sigues escribiendo.',
    src: '/demo/redaccion.mp4',
    poster: '/demo/redaccion-poster.jpg',
    descripcion:
        'Demostración: se elige «demanda de amparo», se describen los hechos, Iurexia redacta el escrito completo y se exporta a Word con un botón.',
    rotulos: [
        ['El caso', 'Qué escrito, contra qué acto y con qué hechos.'],
        ['El escrito', 'La demanda completa, con sus citas verificadas.'],
        ['Tu Word', 'DOCX, PDF o directo a la carpeta del asunto.'],
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
        ['El objetivo', 'La carpeta nace sabiendo qué hay que conseguir.'],
        ['El expediente', 'Se sube lo que haya: escritos, acuerdos, pruebas.'],
        ['Lo que falta', 'El avance acreditado y la lista de lo pendiente.'],
    ],
    url: 'iurexia.com/carpetas',
};

export const SENTENCIAS: Capitulo = {
    id: 'sentencias',
    funcion: 'Taller de sentencias',
    gancho: 'El proyecto se arma sobre tu criterio.',
    titulo: (
        <>
            Proyecta la sentencia. <span className="text-accent-gold">El criterio sigue siendo tuyo</span>
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

export const CAPITULOS: Capitulo[] = [CONSULTA, REDACCION, CARPETAS, SENTENCIAS];
