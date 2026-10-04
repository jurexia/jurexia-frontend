/* ═══ SOLUCIONES: POR PERFIL Y POR MATERIA (3-oct-2026) ═══
   Harvey tiene una página por práctica (Litigation, Transactional…) y otra por
   perfil (Law firms, In-house, Mid-sized firms). Éstas son las de Iurexia,
   como datos: la plantilla es una sola (app/soluciones/[slug]).

   Reglas de lo que se escribe aquí, para no prometer de más:
   · Sólo leyes que están en el acervo. La Ley de Amparo sí está (se verificó
     el 1-sep-2026). De los estados se dice «los códigos de tu entidad»: 12
     tienen más de cien ordenamientos, pero 17 sólo tienen sus códigos.
   · Las preguntas son EJEMPLOS de cómo se pregunta, no respuestas prometidas.
   · Los flujos son los siete que existen en el chat (25-sep-2026). */

export type Solucion = {
    slug: string;
    tipo: 'perfil' | 'materia';
    nombre: string; // en las migas y en las tarjetas
    titulo: string; // la promesa, en tres a seis palabras
    entrada: string;
    resumen: string; // para la tarjeta del índice
    descripcion: string; // la meta descripción
    beneficios: { titulo: string; texto: string }[];
    preguntas: string[];
    fuentes?: string[];
    flujos?: string[];
    visual: { src: string; ancho: number; alto: number; alt: string; barra?: string };
    arte: string;
};

const CONSULTA = { src: '/web/producto/consulta.webp', ancho: 2000, alto: 1250, barra: 'iurexia.com/chat', alt: 'Una consulta resuelta en Iurexia con 12 citas, las 12 verificadas, agrupadas por fuente oficial.' };
const FLUJOS = { src: '/web/producto/flujos.webp', ancho: 1800, alto: 1385, alt: 'Los flujos de trabajo: la demanda de amparo indirecto dividida en sus partes, con los datos que pide cada una.' };
const CARPETA = { src: '/web/producto/carpeta.webp', ancho: 2000, alto: 1250, barra: 'iurexia.com/carpetas', alt: 'Una carpeta de amparo directo: el objetivo, el avance y la lista de lo que falta.' };
const FUENTE = { src: '/web/producto/fuente-oficial.webp', ancho: 900, alto: 1406, alt: 'El visor de la fuente oficial: el artículo 19 de la Constitución resaltado en su página del PDF oficial.' };
const CARPETAS = { src: '/web/producto/carpetas.webp', ancho: 2000, alto: 1250, barra: 'iurexia.com/carpetas', alt: 'Mis carpetas inteligentes: cada asunto con sus documentos y su avance.' };
const ESFUERZO = { src: '/web/producto/esfuerzo.webp', ancho: 1400, alto: 700, alt: 'El selector de esfuerzo de redacción: Básico, Pro y Platinum.' };

export const SOLUCIONES: Solucion[] = [
    // ── Por perfil ──
    {
        slug: 'litigantes',
        tipo: 'perfil',
        nombre: 'Abogados litigantes',
        titulo: 'El trabajo de un pasante, en minutos',
        entrada: 'Para el litigante que lleva sus asuntos: investiga con fuentes verificadas, redacta la demanda o el recurso parte por parte y ten cada asunto en su carpeta, con sus plazos y sus expedientes a la vista.',
        resumen: 'Investigación, redacción y seguimiento para quien lleva sus propios asuntos.',
        descripcion: 'Inteligencia artificial para abogados litigantes en México: investigación con fuentes verificadas, redacción de demandas y recursos, y seguimiento de expedientes.',
        beneficios: [
            { titulo: 'Fundamento en minutos', texto: 'La legislación, la jurisprudencia y los precedentes que sostienen tu argumento, cada cita con su documento oficial.' },
            { titulo: 'El escrito, parte por parte', texto: 'Demanda de amparo, contestación o agravios: Iurexia propone, tú confirmas, y el escrito sale listo para Word.' },
            { titulo: 'Tus asuntos en orden', texto: 'Cada asunto en su carpeta, con lo que le falta y sus expedientes revisados cada día hábil.' },
        ],
        preguntas: [
            '¿Qué plazo tengo para promover amparo indirecto contra la negativa de pensión del IMSS?',
            '¿Qué jurisprudencia aplica cuando el patrón ofrece el trabajo con un salario menor al que percibía el trabajador?',
            '¿Procede el recurso de queja contra el auto que desecha la ampliación de la demanda de amparo?',
        ],
        flujos: ['Demanda de amparo indirecto', 'Demanda de amparo directo', 'Contestación de demanda', 'Apelación: escrito de agravios'],
        visual: CONSULTA,
        arte: '/web/arte/biblioteca.webp',
    },
    {
        slug: 'despachos',
        tipo: 'perfil',
        nombre: 'Despachos',
        titulo: 'Más asuntos, el mismo equipo',
        entrada: 'Para el despacho que quiere atender más asuntos sin crecer la nómina: la investigación y el primer borrador se hacen en minutos, con fuentes que cualquiera del equipo puede comprobar.',
        resumen: 'Multiplica la capacidad del equipo con investigación y borradores verificables.',
        descripcion: 'Inteligencia artificial para despachos de abogados en México: investigación jurídica, borradores de escritos y carpetas por asunto, con cada cita verificada.',
        beneficios: [
            { titulo: 'Capacidad sin contratar', texto: 'El trabajo de investigación y de primer borrador baja de días a minutos, y el equipo se dedica a la estrategia.' },
            { titulo: 'Criterio comprobable', texto: 'Cada cita abre su documento oficial: quien revisa el escrito comprueba la fuente sin buscarla.' },
            { titulo: 'Un expediente por asunto', texto: 'Las carpetas guardan documentos, objetivo y consultas de cada asunto, y dicen qué falta.' },
        ],
        preguntas: [
            '¿Qué criterios hay sobre la carga de la prueba del despido cuando el patrón lo niega y ofrece el trabajo?',
            'Revisa este contrato de arrendamiento y propón cláusulas para proteger al arrendador.',
            '¿Qué fundamentos le faltan a esta demanda? Señálame los artículos mal citados y los que faltan.',
        ],
        flujos: ['Revisión de contrato', 'Contestación de demanda', 'Investigación jurídica y dictamen'],
        visual: CARPETAS,
        arte: '/web/arte/columnata.webp',
    },
    {
        slug: 'corporativos',
        tipo: 'perfil',
        nombre: 'Áreas jurídicas de empresa',
        titulo: 'Respuestas internas, con fundamento',
        entrada: 'Para el área jurídica de una empresa: resuelve con certeza las consultas del negocio, revisa contratos y prepara dictámenes antes de recurrir al despacho externo.',
        resumen: 'Consultas del negocio, contratos y dictámenes resueltos dentro de la empresa.',
        descripcion: 'Inteligencia artificial para áreas jurídicas corporativas en México: consultas con fundamento, revisión de contratos y dictámenes con fuentes verificadas.',
        beneficios: [
            { titulo: 'Menos gasto externo', texto: 'Las primeras fases de la estrategia legal se resuelven dentro, con el fundamento a la vista.' },
            { titulo: 'Contratos revisados', texto: 'El dictamen de revisión con las cláusulas propuestas, en el flujo de revisión de contrato.' },
            { titulo: 'Dictámenes con fuentes', texto: 'La investigación jurídica de un problema, con su conclusión y cada fuente citada.' },
        ],
        preguntas: [
            '¿Qué obligaciones tiene la empresa en materia de reparto de utilidades si tuvo pérdidas fiscales?',
            '¿Qué requisitos debe cumplir una cláusula de confidencialidad para ser exigible en un contrato mercantil?',
            '¿Procede la rescisión del contrato de suministro por incumplimiento reiterado en las entregas?',
        ],
        flujos: ['Revisión de contrato', 'Investigación jurídica y dictamen'],
        visual: ESFUERZO,
        arte: '/web/arte/escritorio.webp',
    },
    {
        slug: 'academia',
        tipo: 'perfil',
        nombre: 'Estudiantes y docentes',
        titulo: 'Estudiar el derecho con sus fuentes',
        entrada: 'Para quien estudia o enseña derecho: consulta la legislación y la jurisprudencia con su documento oficial, y aprende con las lecciones de Estudiar y pensar, cada una con su lectura en PDF.',
        resumen: 'Consulta con fuentes oficiales y lecciones en video con su lectura.',
        descripcion: 'Iurexia para estudiantes y docentes de derecho: consulta con fuentes oficiales y las lecciones de Estudiar y pensar, en video y con su lectura en PDF.',
        beneficios: [
            { titulo: 'La fuente, no el resumen', texto: 'Cada respuesta lleva al artículo o a la tesis en su documento oficial.' },
            { titulo: 'Lecciones con lectura', texto: 'Las lecciones de Estudiar y pensar, en video y con su PDF académico: antecedentes, personajes y documentos.' },
            { titulo: 'Gratis para empezar', texto: 'El plan gratuito basta para consultar y comprobar fuentes.' },
        ],
        preguntas: [
            '¿Qué es el control de convencionalidad y desde cuándo es obligatorio para los jueces mexicanos?',
            '¿Cuál es la diferencia entre jurisprudencia por reiteración y por contradicción de criterios?',
            '¿Qué protegen las llamadas cláusulas pétreas y existen en la Constitución mexicana?',
        ],
        visual: FUENTE,
        arte: '/web/arte/cupula.webp',
    },
    // ── Por materia ──
    {
        slug: 'amparo',
        tipo: 'materia',
        nombre: 'Amparo',
        titulo: 'Del acto reclamado a la demanda',
        entrada: 'El amparo indirecto y el directo, de la oportunidad a los conceptos de violación: Iurexia calcula el plazo, encuentra la jurisprudencia aplicable y construye la demanda contigo, parte por parte.',
        resumen: 'Plazos, jurisprudencia y la demanda de amparo indirecto o directo, parte por parte.',
        descripcion: 'Inteligencia artificial para el juicio de amparo en México: plazos, jurisprudencia aplicable y la demanda de amparo indirecto o directo, con cada cita verificada.',
        beneficios: [
            { titulo: 'La Ley de Amparo, al artículo', texto: 'Los requisitos del artículo 108, la oportunidad del 17 y la suspensión, con su texto oficial.' },
            { titulo: 'Jurisprudencia aplicable', texto: 'Las tesis del Semanario que sostienen cada concepto de violación, verificadas contra su registro.' },
            { titulo: 'La demanda, completa', texto: 'Datos del 108, antecedentes, conceptos de violación y suspensión, en el flujo de amparo indirecto.' },
        ],
        preguntas: [
            '¿Qué plazo tengo para promover amparo indirecto contra la negativa de pensión del IMSS?',
            '¿Procede la suspensión de plano contra la orden de desalojo de un inmueble ocupado por un tercero extraño?',
            '¿Es posible, desde el control de convencionalidad, inaplicar la prisión preventiva oficiosa del artículo 19 constitucional?',
        ],
        fuentes: ['Constitución Política de los Estados Unidos Mexicanos', 'Ley de Amparo', 'Jurisprudencia y tesis del Semanario Judicial de la Federación', 'Convención Americana sobre Derechos Humanos y criterios de la Corte Interamericana'],
        flujos: ['Demanda de amparo indirecto', 'Demanda de amparo directo'],
        visual: FLUJOS,
        arte: '/web/arte/columnata.webp',
    },
    {
        slug: 'laboral',
        tipo: 'materia',
        nombre: 'Laboral',
        titulo: 'Cada criterio laboral, con su fuente',
        entrada: 'Despidos, ofrecimientos de trabajo, prestaciones y seguridad social: Iurexia responde con la Ley Federal del Trabajo, la Ley del Seguro Social y la jurisprudencia que aplica a tu caso.',
        resumen: 'Despido, ofrecimiento de trabajo, prestaciones y seguridad social, con su jurisprudencia.',
        descripcion: 'Inteligencia artificial para derecho laboral en México: Ley Federal del Trabajo, Ley del Seguro Social y jurisprudencia laboral, con cada cita verificada.',
        beneficios: [
            { titulo: 'La ley y la tesis', texto: 'El artículo de la Ley Federal del Trabajo y la jurisprudencia que lo interpreta, en la misma respuesta.' },
            { titulo: 'El ofrecimiento, analizado', texto: 'Si el ofrecimiento de trabajo es de buena o de mala fe, con los criterios que lo deciden.' },
            { titulo: 'Escritos de juicio', texto: 'La contestación de la demanda o los agravios, con el flujo de trabajo que corresponde.' },
        ],
        preguntas: [
            '¿Qué jurisprudencia aplica cuando el patrón ofrece el trabajo con un salario menor al que percibía el trabajador?',
            '¿Quién tiene la carga de la prueba de la jornada extraordinaria cuando excede de nueve horas semanales?',
            '¿Procede la pensión por cesantía en edad avanzada si el trabajador cotizó bajo la Ley del Seguro Social de 1973?',
        ],
        fuentes: ['Ley Federal del Trabajo', 'Ley del Seguro Social', 'Artículo 123 de la Constitución', 'Jurisprudencia laboral de la Suprema Corte y los Tribunales Colegiados'],
        flujos: ['Contestación de demanda', 'Apelación: escrito de agravios', 'Demanda de amparo directo'],
        visual: CONSULTA,
        arte: '/web/arte/biblioteca.webp',
    },
    {
        slug: 'penal',
        tipo: 'materia',
        nombre: 'Penal',
        titulo: 'El proceso penal, con su fundamento',
        entrada: 'Del control de detención a la teoría del caso: Iurexia consulta el Código Nacional de Procedimientos Penales, el Código Penal Federal y los códigos de tu entidad, y abre cada artículo en su documento oficial.',
        resumen: 'Sistema acusatorio, medidas cautelares y teoría del caso, con sus códigos.',
        descripcion: 'Inteligencia artificial para derecho penal en México: Código Nacional de Procedimientos Penales, códigos penales y jurisprudencia, con la teoría del caso paso a paso.',
        beneficios: [
            { titulo: 'El sistema acusatorio', texto: 'Las etapas del Código Nacional de Procedimientos Penales, artículo por artículo y con su texto.' },
            { titulo: 'Medidas cautelares', texto: 'La prisión preventiva y sus alternativas, con la Constitución y los criterios de la Corte.' },
            { titulo: 'Teoría del caso', texto: 'El flujo de teoría del caso para el sistema penal acusatorio, en dos partes.' },
        ],
        preguntas: [
            '¿Es posible, desde el control de convencionalidad, inaplicar la prisión preventiva oficiosa del artículo 19 constitucional?',
            '¿Qué plazo tiene el Ministerio Público para formular la imputación después de la detención en flagrancia?',
            '¿Procede el amparo contra el auto de vinculación a proceso o primero debe agotarse la apelación?',
        ],
        fuentes: ['Código Nacional de Procedimientos Penales', 'Código Penal Federal', 'Códigos penales de las entidades', 'Constitución y jurisprudencia penal'],
        flujos: ['Teoría del caso', 'Demanda de amparo indirecto'],
        visual: FUENTE,
        arte: '/web/arte/escalinata.webp',
    },
    {
        slug: 'civil-y-familiar',
        tipo: 'materia',
        nombre: 'Civil y familiar',
        titulo: 'Tu código, no el de otro estado',
        entrada: 'Contratos, arrendamiento, sucesiones, alimentos y divorcio: Iurexia separa los códigos civiles de cada entidad, consulta el Código Nacional de Procedimientos Civiles y Familiares y responde con la jurisprudencia que aplica.',
        resumen: 'Contratos, sucesiones, alimentos y divorcio, con el código de tu entidad.',
        descripcion: 'Inteligencia artificial para derecho civil y familiar en México: códigos civiles por entidad, Código Nacional de Procedimientos Civiles y Familiares y jurisprudencia.',
        beneficios: [
            { titulo: 'El filtro jurisdiccional', texto: 'Si el asunto es de Jalisco, ves el código de Jalisco y la ley federal; nunca el de otra entidad.' },
            { titulo: 'El procedimiento nacional', texto: 'El Código Nacional de Procedimientos Civiles y Familiares, con su texto oficial.' },
            { titulo: 'Contratos revisados', texto: 'El dictamen de revisión con cláusulas propuestas, en el flujo de revisión de contrato.' },
        ],
        preguntas: [
            'Mi clienta quiere demandar pensión alimenticia para sus hijos; ¿qué debe acreditar y qué porcentaje suele fijarse?',
            '¿Procede la prescripción de la acción de nulidad de un contrato de compraventa celebrado con error?',
            '¿Qué requisitos debe cumplir el testamento ológrafo para ser válido?',
        ],
        fuentes: ['Código Civil Federal', 'Código Nacional de Procedimientos Civiles y Familiares', 'Códigos civiles de las entidades', 'Jurisprudencia civil y familiar'],
        flujos: ['Revisión de contrato', 'Contestación de demanda', 'Apelación: escrito de agravios'],
        visual: CARPETA,
        arte: '/web/arte/manuscrito.webp',
    },
    {
        slug: 'fiscal-y-administrativo',
        tipo: 'materia',
        nombre: 'Fiscal y administrativo',
        titulo: 'La defensa frente a la autoridad',
        entrada: 'Créditos fiscales, juicio contencioso y responsabilidades administrativas: Iurexia consulta el Código Fiscal de la Federación, las leyes de los impuestos, el procedimiento contencioso y la jurisprudencia de la materia.',
        resumen: 'Créditos fiscales, contencioso administrativo y amparo contra la autoridad.',
        descripcion: 'Inteligencia artificial para derecho fiscal y administrativo en México: Código Fiscal de la Federación, juicio contencioso administrativo y jurisprudencia.',
        beneficios: [
            { titulo: 'El Código Fiscal, al artículo', texto: 'Facultades de comprobación, plazos y caducidad, con su texto oficial.' },
            { titulo: 'El juicio contencioso', texto: 'La Ley Federal de Procedimiento Contencioso Administrativo y sus criterios.' },
            { titulo: 'Amparo contra la autoridad', texto: 'Cuando procede el amparo y cuando primero el juicio de nulidad, con la jurisprudencia que lo resuelve.' },
        ],
        preguntas: [
            '¿Cuándo caducan las facultades de comprobación del SAT si el contribuyente no presentó la declaración?',
            '¿Procede el juicio de nulidad contra la negativa ficta a una solicitud de devolución de IVA?',
            '¿Qué criterios hay sobre la competencia territorial de la autoridad fiscal en una visita domiciliaria?',
        ],
        fuentes: ['Código Fiscal de la Federación', 'Ley del Impuesto sobre la Renta y Ley del IVA', 'Ley Federal de Procedimiento Contencioso Administrativo', 'Jurisprudencia fiscal y administrativa'],
        flujos: ['Demanda de amparo indirecto', 'Investigación jurídica y dictamen'],
        visual: CONSULTA,
        arte: '/web/arte/fachada.webp',
    },
    {
        slug: 'mercantil',
        tipo: 'materia',
        nombre: 'Mercantil',
        titulo: 'Contratos y juicios mercantiles',
        entrada: 'Títulos de crédito, sociedades, contratos y juicios mercantiles: Iurexia responde con el Código de Comercio y las leyes mercantiles, y revisa contigo el contrato cláusula por cláusula.',
        resumen: 'Títulos de crédito, sociedades, contratos y juicios ejecutivos y orales.',
        descripcion: 'Inteligencia artificial para derecho mercantil en México: Código de Comercio, títulos de crédito, sociedades y revisión de contratos con fuentes verificadas.',
        beneficios: [
            { titulo: 'El Código de Comercio', texto: 'Juicios ejecutivos y orales, prescripción y pruebas, con el texto oficial de cada artículo.' },
            { titulo: 'Títulos y sociedades', texto: 'La Ley General de Títulos y Operaciones de Crédito y la de Sociedades Mercantiles, con sus criterios.' },
            { titulo: 'Contratos revisados', texto: 'El dictamen de revisión con las cláusulas propuestas, parte por parte.' },
        ],
        preguntas: [
            '¿Cuál es el plazo de prescripción de la acción cambiaria directa derivada de un pagaré?',
            '¿Procede la vía ejecutiva mercantil con una factura aceptada por el deudor?',
            '¿Qué requisitos debe cumplir el acta de asamblea para aumentar el capital de una S.A. de C.V.?',
        ],
        fuentes: ['Código de Comercio', 'Ley General de Títulos y Operaciones de Crédito', 'Ley General de Sociedades Mercantiles', 'Jurisprudencia mercantil'],
        flujos: ['Revisión de contrato', 'Contestación de demanda', 'Apelación: escrito de agravios'],
        visual: ESFUERZO,
        arte: '/web/arte/grabado.webp',
    },
];

export const solucionPorSlug = (slug: string) => SOLUCIONES.find((s) => s.slug === slug);
export const PERFILES = SOLUCIONES.filter((s) => s.tipo === 'perfil');
export const MATERIAS = SOLUCIONES.filter((s) => s.tipo === 'materia');
