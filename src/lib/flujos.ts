/**
 * Flujos de trabajo — AGENTES que construyen un escrito por partes (25-sep-2026).
 *
 * La primera versión (esa misma mañana) mandaba UNA consulta con los pasos
 * escritos, y el modelo contestaba con una lista de faltantes. David al
 * probarla: «eso no es workflow, es una respuesta a un prompt». Tenía razón.
 *
 * Ahora cada flujo entrega un ESCRITO TERMINADO y se construye parte por parte:
 *
 *   1. Iurexia lee el encargo, la carpeta, lo confirmado y lo ya redactado, y
 *      propone cada dato que la parte necesita (`/flujo/deducir` en la API).
 *   2. El abogado confirma en pantalla: casi todo ya viene marcado con la
 *      opción más probable; los datos de hecho que no constan se piden, y si
 *      falta un documento clave se pide el documento o su contenido esencial.
 *   3. La parte se redacta con /chat en modo redacción y con TODO el acervo, y
 *      cae en el documento. Luego sigue la siguiente parte.
 *
 * Los CAMPOS de cada parte están escritos aquí, no los decide el modelo: lo que
 * exige una demanda de amparo lo dice el artículo 108 de la Ley de Amparo, no
 * una inferencia. El modelo propone VALORES; qué se pide lo fija el flujo.
 *
 * Los ids de campo son únicos dentro de cada flujo: los valores confirmados de
 * todas las partes viven en un mismo objeto.
 */

export type TipoCampo = 'texto' | 'parrafo' | 'fecha' | 'opcion' | 'varias' | 'documento'

export interface CampoFlujo {
    id: string
    etiqueta: string
    tipo: TipoCampo
    ayuda?: string
    /** Opciones fijas; el agente añade las del caso detrás. */
    opciones?: string[]
    /** Por omisión, sí. */
    obligatorio?: boolean
}

export interface ParteFlujo {
    id: string
    titulo: string
    /** Lo que contiene la parte, dicho para el abogado. */
    resumen: string
    /** Qué debe redactarse en esta parte, dicho para el modelo. */
    redaccion: string
    campos: CampoFlujo[]
}

export interface FlujoTrabajo {
    id: string
    nombre: string
    categoria: 'Amparo' | 'Litigio' | 'Contratos' | 'Penal' | 'Investigación'
    descripcion: string
    /** El escrito con que termina. */
    entrega: string
    /** Lo que conviene traer; se muestra antes de empezar. */
    pide: string[]
    ejemplo: string
    partes: ParteFlujo[]
}

const PERSONAS_AUTORIZADAS: CampoFlujo = {
    id: 'autorizados',
    etiqueta: 'Personas autorizadas',
    tipo: 'texto',
    ayuda: 'Nombres y, si la tienen, cédula profesional. Déjalo vacío si no hay.',
    obligatorio: false,
}

export const FLUJOS: FlujoTrabajo[] = [
    {
        id: 'amparo-indirecto',
        nombre: 'Demanda de amparo indirecto',
        categoria: 'Amparo',
        descripcion:
            'Del acto de autoridad a la demanda completa: datos del artículo 108, antecedentes, conceptos de violación y suspensión.',
        entrega: 'Demanda de amparo indirecto',
        pide: [
            'El acto reclamado (oficio o resolución) y quién lo emitió',
            'Cuándo se notificó o se tuvo conocimiento de él',
            'Los hechos del caso y lo que busca el cliente',
        ],
        ejemplo:
            'El IMSS negó por oficio la pensión por viudez a mi clienta; dice que el acta de matrimonio del finado desvirtúa el concubinato, aunque vivieron juntos más de seis años…',
        partes: [
            {
                id: 'datos',
                titulo: 'Proemio y datos del artículo 108',
                resumen: 'A quién se dirige, quién promueve y las fracciones I a IV: quejoso, tercero interesado, autoridades y acto reclamado.',
                redaccion:
                    'El rubro y el encabezado dirigido al órgano; el proemio con el nombre de la parte quejosa, cómo promueve, su domicilio para oír notificaciones y las personas autorizadas; la solicitud del amparo con su fundamento constitucional y legal; y las fracciones I a IV del artículo 108 de la Ley de Amparo, numeradas como en un escrito real.',
                campos: [
                    { id: 'organo', etiqueta: 'Órgano ante el que se presenta', tipo: 'opcion', ayuda: 'Juez de Distrito competente por materia y territorio.' },
                    { id: 'quejoso', etiqueta: 'Nombre completo de la parte quejosa', tipo: 'texto' },
                    { id: 'promueve', etiqueta: 'Cómo promueve', tipo: 'opcion', opciones: ['Por su propio derecho', 'Por conducto de su representante legal', 'Por conducto de apoderado'] },
                    { id: 'domicilio', etiqueta: 'Domicilio para oír y recibir notificaciones', tipo: 'texto' },
                    PERSONAS_AUTORIZADAS,
                    { id: 'tercero', etiqueta: 'Tercero interesado', tipo: 'opcion', ayuda: 'Quien tenga interés en que subsista el acto; si no lo hay, dilo.' },
                    { id: 'autoridades', etiqueta: 'Autoridades responsables', tipo: 'varias', ayuda: 'Con su carácter de ordenadora o ejecutora.' },
                    { id: 'acto', etiqueta: 'Acto reclamado', tipo: 'parrafo', ayuda: 'Qué se reclama, de quién, con número y fecha del oficio o resolución.' },
                ],
            },
            {
                id: 'antecedentes',
                titulo: 'Antecedentes, oportunidad y preceptos violados',
                resumen: 'Los hechos bajo protesta de decir verdad, la oportunidad de la demanda, el interés, la definitividad y los preceptos violados.',
                redaccion:
                    'La protesta de decir verdad y los antecedentes del acto reclamado narrados en orden cronológico (fracción V del artículo 108); un apartado de oportunidad con el plazo y su cómputo conforme a los artículos 17 y 18 de la Ley de Amparo; el interés con que se promueve; la procedencia y la definitividad; y los preceptos constitucionales y convencionales violados (fracción VI).',
                campos: [
                    { id: 'notificacion', etiqueta: 'Fecha de notificación o de conocimiento del acto', tipo: 'fecha' },
                    { id: 'acto_doc', etiqueta: 'El documento del acto reclamado', tipo: 'documento', ayuda: 'Súbelo a la carpeta o pega su contenido: Iurexia lo citará con precisión.', obligatorio: false },
                    { id: 'hechos', etiqueta: 'Antecedentes que se narrarán bajo protesta de decir verdad', tipo: 'parrafo' },
                    { id: 'interes', etiqueta: 'Interés con que se promueve', tipo: 'opcion', opciones: ['Interés jurídico', 'Interés legítimo individual', 'Interés legítimo colectivo'] },
                    { id: 'definitividad', etiqueta: 'Principio de definitividad', tipo: 'opcion', opciones: ['No hay recurso ordinario que agotar', 'Se actualiza una excepción a la definitividad', 'El recurso ordinario ya se agotó'] },
                    { id: 'preceptos', etiqueta: 'Preceptos constitucionales y convencionales violados', tipo: 'varias' },
                ],
            },
            {
                id: 'conceptos',
                titulo: 'Conceptos de violación',
                resumen: 'Cada línea de argumento como un concepto de violación, con su causa de pedir, normas y jurisprudencia.',
                redaccion:
                    'El capítulo de CONCEPTOS DE VIOLACIÓN: un concepto por cada línea confirmada, numerado, con su causa de pedir (qué dice el acto, por qué es contrario a la Constitución o a los tratados, con qué norma y qué jurisprudencia, y qué consecuencia debe seguirse), transcribiendo los preceptos y criterios del acervo que lo sostienen.',
                campos: [
                    { id: 'lineas', etiqueta: 'Líneas de argumento', tipo: 'varias', ayuda: 'Cada una será un concepto de violación.' },
                    { id: 'enfoques', etiqueta: 'Enfoques que deben aplicarse', tipo: 'varias', opciones: ['Perspectiva de género', 'Interés superior de la niñez', 'Persona adulta mayor', 'Principio pro persona'], obligatorio: false },
                    { id: 'imprescindible', etiqueta: 'Hechos o pruebas que no deben faltar en los argumentos', tipo: 'parrafo', obligatorio: false },
                ],
            },
            {
                id: 'cierre',
                titulo: 'Suspensión, pruebas y puntos petitorios',
                resumen: 'La solicitud de suspensión con sus efectos, las pruebas y anexos, y lo que se pide al juez.',
                redaccion:
                    'El capítulo de SUSPENSIÓN DEL ACTO RECLAMADO (tipo, requisitos del artículo 128, apariencia del buen derecho y peligro en la demora, efectos pedidos y garantía cuando proceda), el capítulo de PRUEBAS Y ANEXOS, los PUNTOS PETITORIOS numerados y el cierre con lugar, fecha y firma.',
                campos: [
                    { id: 'suspension', etiqueta: 'Suspensión', tipo: 'opcion', opciones: ['Solicitar la suspensión provisional y la definitiva', 'Solicitar la suspensión de oficio y de plano', 'No solicitar suspensión'] },
                    { id: 'efectos', etiqueta: 'Efectos que se piden con la suspensión', tipo: 'parrafo', obligatorio: false },
                    { id: 'pruebas', etiqueta: 'Pruebas y anexos que se ofrecen', tipo: 'varias' },
                    { id: 'lugar', etiqueta: 'Lugar de firma', tipo: 'texto', obligatorio: false },
                ],
            },
        ],
    },
    {
        id: 'amparo-directo',
        nombre: 'Demanda de amparo directo',
        categoria: 'Amparo',
        descripcion:
            'De la sentencia definitiva a la demanda: datos del artículo 175, violaciones procesales y conceptos de violación.',
        entrega: 'Demanda de amparo directo',
        pide: [
            'La sentencia, laudo o resolución que puso fin al juicio',
            'La fecha en que se notificó',
            'Las violaciones procesales que se hicieron valer en el juicio',
        ],
        ejemplo:
            'La Sala confirmó en apelación la condena a pagar 1.2 millones por incumplimiento de contrato; no se valoró la pericial contable que ofrecimos…',
        partes: [
            {
                id: 'datos',
                titulo: 'Datos del artículo 175',
                resumen: 'Quejoso, tercero interesado, autoridad responsable, acto reclamado y fecha de notificación.',
                redaccion:
                    'El encabezado dirigido al Tribunal Colegiado de Circuito por conducto de la autoridad responsable; el proemio con el nombre de la parte quejosa, cómo promueve, domicilio y autorizados; y las fracciones I a IV del artículo 175 de la Ley de Amparo, con la fecha de notificación y la oportunidad de la demanda.',
                campos: [
                    { id: 'quejoso', etiqueta: 'Nombre completo de la parte quejosa', tipo: 'texto' },
                    { id: 'promueve', etiqueta: 'Cómo promueve', tipo: 'opcion', opciones: ['Por su propio derecho', 'Por conducto de su representante legal', 'Por conducto de apoderado'] },
                    { id: 'domicilio', etiqueta: 'Domicilio para oír y recibir notificaciones', tipo: 'texto' },
                    PERSONAS_AUTORIZADAS,
                    { id: 'tercero', etiqueta: 'Tercero interesado', tipo: 'texto', ayuda: 'La contraparte en el juicio de origen.' },
                    { id: 'autoridad', etiqueta: 'Autoridad responsable', tipo: 'texto', ayuda: 'El tribunal o la sala que dictó la resolución.' },
                    { id: 'sentencia', etiqueta: 'Resolución reclamada', tipo: 'parrafo', ayuda: 'Qué resolvió, fecha, expediente o toca.' },
                    { id: 'notificacion', etiqueta: 'Fecha de notificación de la resolución', tipo: 'fecha' },
                    { id: 'sentencia_doc', etiqueta: 'La resolución reclamada', tipo: 'documento', ayuda: 'Súbela o pega sus considerandos: sin ella los conceptos no pueden combatirla con precisión.' },
                ],
            },
            {
                id: 'procesales',
                titulo: 'Preceptos violados y violaciones procesales',
                resumen: 'Los preceptos violados y, si las hay, las violaciones procesales que trascendieron al fallo.',
                redaccion:
                    'Los preceptos constitucionales violados y, si las hay, las violaciones procesales que trascendieron al resultado del fallo, con la forma en que se prepararon conforme a los artículos 171 a 173 de la Ley de Amparo.',
                campos: [
                    { id: 'preceptos', etiqueta: 'Preceptos violados', tipo: 'varias' },
                    { id: 'procesales', etiqueta: 'Violaciones procesales', tipo: 'varias', obligatorio: false },
                    { id: 'preparacion', etiqueta: 'Preparación de las violaciones procesales', tipo: 'opcion', opciones: ['No hay violaciones procesales que hacer valer', 'Se impugnaron durante el juicio', 'No era necesario prepararlas'] },
                ],
            },
            {
                id: 'conceptos',
                titulo: 'Conceptos de violación y puntos petitorios',
                resumen: 'Los conceptos de fondo con su causa de pedir, y lo que se pide al Tribunal.',
                redaccion:
                    'El capítulo de CONCEPTOS DE VIOLACIÓN: primero los procesales y después los de fondo, cada uno con su causa de pedir, la parte de la resolución que combate, las normas y la jurisprudencia del acervo; después los PUNTOS PETITORIOS y el cierre.',
                campos: [
                    { id: 'lineas', etiqueta: 'Líneas de argumento de fondo', tipo: 'varias' },
                    { id: 'enfoques', etiqueta: 'Enfoques que deben aplicarse', tipo: 'varias', opciones: ['Perspectiva de género', 'Interés superior de la niñez', 'Principio pro persona'], obligatorio: false },
                ],
            },
        ],
    },
    {
        id: 'contestacion',
        nombre: 'Contestación de demanda',
        categoria: 'Litigio',
        descripcion:
            'De la demanda recibida al escrito de contestación: prestaciones, hechos uno por uno, excepciones y pruebas.',
        entrega: 'Escrito de contestación de demanda',
        pide: [
            'La demanda (o su contenido esencial)',
            'La fecha del emplazamiento y el juzgado',
            'La versión del cliente sobre cada hecho',
        ],
        ejemplo:
            'Nos demandan en la vía ordinaria mercantil el pago de un pagaré de 350 mil pesos; el cliente dice que lo pagó en efectivo y tiene recibos firmados…',
        partes: [
            {
                id: 'datos',
                titulo: 'Datos del juicio y comparecencia',
                resumen: 'Juzgado, expediente, partes, vía y la comparecencia del demandado.',
                redaccion:
                    'El encabezado con el juzgado, el expediente y la vía; el proemio de comparecencia del demandado con su domicilio y autorizados; y la manifestación de que se contesta en tiempo, con la fecha del emplazamiento y el fundamento del plazo según el código procesal aplicable.',
                campos: [
                    { id: 'demanda_doc', etiqueta: 'La demanda que se contesta', tipo: 'documento', ayuda: 'Súbela o pega sus prestaciones y hechos: sin ella no se puede contestar hecho por hecho.' },
                    { id: 'organo', etiqueta: 'Juzgado', tipo: 'texto' },
                    { id: 'expediente', etiqueta: 'Número de expediente', tipo: 'texto' },
                    { id: 'actor', etiqueta: 'Parte actora', tipo: 'texto' },
                    { id: 'demandado', etiqueta: 'Parte demandada (quien contesta)', tipo: 'texto' },
                    { id: 'domicilio', etiqueta: 'Domicilio para oír y recibir notificaciones', tipo: 'texto' },
                    PERSONAS_AUTORIZADAS,
                    { id: 'via', etiqueta: 'Vía y código aplicable', tipo: 'opcion' },
                    { id: 'emplazamiento', etiqueta: 'Fecha del emplazamiento', tipo: 'fecha' },
                ],
            },
            {
                id: 'hechos',
                titulo: 'Prestaciones y hechos',
                resumen: 'La postura ante cada prestación y cada hecho: se afirma, se niega o se ignora.',
                redaccion:
                    'La contestación a las PRESTACIONES, una por una, y a los HECHOS, uno por uno y en el mismo orden de la demanda, afirmándolos, negándolos o manifestando que se ignoran, con la versión propia de los hechos donde corresponda.',
                campos: [
                    { id: 'version', etiqueta: 'Versión del cliente sobre los hechos', tipo: 'parrafo' },
                    { id: 'hechos_postura', etiqueta: 'Postura ante cada hecho', tipo: 'parrafo', ayuda: 'Hecho por hecho: se afirma, se niega o se ignora.' },
                ],
            },
            {
                id: 'excepciones',
                titulo: 'Excepciones y defensas',
                resumen: 'Las excepciones procesales y de fondo que proceden con los hechos.',
                redaccion:
                    'El capítulo de EXCEPCIONES Y DEFENSAS: cada una con su nombre, los hechos que la sustentan, su fundamento y la jurisprudencia aplicable del acervo.',
                campos: [
                    { id: 'excepciones', etiqueta: 'Excepciones y defensas', tipo: 'varias' },
                ],
            },
            {
                id: 'cierre',
                titulo: 'Pruebas y puntos petitorios',
                resumen: 'Las pruebas que se ofrecen con lo que acredita cada una, y lo que se pide.',
                redaccion:
                    'El ofrecimiento de PRUEBAS relacionándolas con los hechos y excepciones que acreditan (cuando el código aplicable exija ofrecerlas con la contestación), los PUNTOS PETITORIOS y el cierre.',
                campos: [
                    { id: 'pruebas', etiqueta: 'Pruebas que se ofrecen', tipo: 'varias' },
                    { id: 'lugar', etiqueta: 'Lugar de firma', tipo: 'texto', obligatorio: false },
                ],
            },
        ],
    },
    {
        id: 'agravios',
        nombre: 'Apelación: escrito de agravios',
        categoria: 'Litigio',
        descripcion:
            'De la resolución de primera instancia al escrito de agravios, cada uno con su causa de pedir.',
        entrega: 'Escrito de expresión de agravios',
        pide: [
            'La resolución apelada y su fecha de notificación',
            'Lo que se pidió y lo que se resolvió',
            'Dónde se equivocó el juez',
        ],
        ejemplo:
            'El juez familiar fijó alimentos del 15% sin considerar los ingresos del padre acreditados con estados de cuenta; sentencia notificada el 10 de septiembre…',
        partes: [
            {
                id: 'datos',
                titulo: 'Datos del recurso',
                resumen: 'A quién se dirige, quién apela, la resolución impugnada y la oportunidad.',
                redaccion:
                    'El encabezado, el proemio del apelante con domicilio y autorizados, la identificación de la resolución apelada y la manifestación de que el recurso se interpone o los agravios se expresan en tiempo, con el fundamento del código procesal aplicable.',
                campos: [
                    { id: 'resolucion_doc', etiqueta: 'La resolución apelada', tipo: 'documento', ayuda: 'Súbela o pega los considerandos y resolutivos que se combaten.' },
                    { id: 'organo', etiqueta: 'Órgano al que se dirige', tipo: 'texto' },
                    { id: 'expediente', etiqueta: 'Expediente', tipo: 'texto' },
                    { id: 'apelante', etiqueta: 'Parte apelante', tipo: 'texto' },
                    { id: 'domicilio', etiqueta: 'Domicilio para oír y recibir notificaciones', tipo: 'texto' },
                    PERSONAS_AUTORIZADAS,
                    { id: 'notificacion', etiqueta: 'Fecha de notificación de la resolución', tipo: 'fecha' },
                ],
            },
            {
                id: 'agravios',
                titulo: 'Agravios y puntos petitorios',
                resumen: 'Cada agravio con la parte de la resolución que combate, por qué es incorrecta y qué se pide.',
                redaccion:
                    'El capítulo de AGRAVIOS: uno por cada línea confirmada, con la parte de la resolución que se combate, por qué es incorrecta, la norma o el criterio del acervo que lo sostiene y lo que debe resolverse; después los PUNTOS PETITORIOS y el cierre.',
                campos: [
                    { id: 'lineas', etiqueta: 'Agravios que se harán valer', tipo: 'varias' },
                    { id: 'enfoques', etiqueta: 'Enfoques que deben aplicarse', tipo: 'varias', opciones: ['Perspectiva de género', 'Interés superior de la niñez', 'Principio pro persona'], obligatorio: false },
                ],
            },
        ],
    },
    {
        id: 'contrato',
        nombre: 'Revisión de contrato',
        categoria: 'Contratos',
        descripcion:
            'Del contrato y el objetivo del cliente a un dictamen de riesgos con las cláusulas propuestas.',
        entrega: 'Dictamen de revisión con cláusulas propuestas',
        pide: [
            'El contrato (o sus cláusulas relevantes)',
            'A qué parte representas y qué busca',
            'La entidad y si es civil o mercantil',
        ],
        ejemplo:
            'Represento al arrendatario en un arrendamiento comercial a cinco años en Monterrey; le preocupa la pena por terminación anticipada y el aumento anual de la renta…',
        partes: [
            {
                id: 'estructura',
                titulo: 'El contrato y su régimen',
                resumen: 'Partes, objeto, obligaciones, plazos, montos, forma y ley aplicable.',
                redaccion:
                    'La primera parte del dictamen: identificación del contrato, las partes, el objeto, las obligaciones principales, plazos y montos, la forma exigida y el régimen legal aplicable con sus artículos.',
                campos: [
                    { id: 'contrato_doc', etiqueta: 'El contrato', tipo: 'documento', ayuda: 'Súbelo o pega las cláusulas que importan.' },
                    { id: 'parte', etiqueta: 'Parte que representas', tipo: 'texto' },
                    { id: 'objetivo', etiqueta: 'Lo que busca tu cliente', tipo: 'parrafo' },
                    { id: 'regimen', etiqueta: 'Régimen aplicable', tipo: 'opcion' },
                ],
            },
            {
                id: 'riesgos',
                titulo: 'Riesgos y cláusulas propuestas',
                resumen: 'Las cláusulas de riesgo por gravedad, con la redacción propuesta para cada una.',
                redaccion:
                    'El análisis de RIESGOS ordenado por gravedad para la parte representada y, para cada uno, la cláusula actual, la REDACCIÓN PROPUESTA lista para insertarse y la razón jurídica del cambio; después las conclusiones.',
                campos: [
                    { id: 'riesgos', etiqueta: 'Cláusulas y riesgos que se atenderán', tipo: 'varias' },
                    { id: 'tono', etiqueta: 'Postura de negociación', tipo: 'opcion', opciones: ['Equilibrada', 'Firme', 'Conciliadora'] },
                ],
            },
        ],
    },
    {
        id: 'teoria-del-caso',
        nombre: 'Teoría del caso (penal acusatorio)',
        categoria: 'Penal',
        descripcion:
            'De los hechos de la carpeta de investigación a la teoría fáctica, jurídica y probatoria.',
        entrega: 'Teoría del caso',
        pide: [
            'Los hechos según la carpeta de investigación',
            'A quién representas y la etapa del procedimiento',
            'El delito que se imputa',
        ],
        ejemplo:
            'Defensa de un imputado por robo con violencia en Puebla; audiencia intermedia en tres semanas. La identificación se hizo por fotografía sin cumplir el protocolo…',
        partes: [
            {
                id: 'factica',
                titulo: 'Teoría fáctica y jurídica',
                resumen: 'El relato en proposiciones fácticas, el tipo penal y sus elementos.',
                redaccion:
                    'La TEORÍA FÁCTICA en proposiciones fácticas numeradas y la TEORÍA JURÍDICA: el tipo penal aplicable del código que corresponda, sus elementos, la forma de intervención y las causas de exclusión del delito que puedan hacerse valer.',
                campos: [
                    { id: 'parte', etiqueta: 'Parte que representas', tipo: 'opcion', opciones: ['Defensa', 'Asesoría jurídica de la víctima', 'Ministerio Público'] },
                    { id: 'etapa', etiqueta: 'Etapa del procedimiento', tipo: 'opcion', opciones: ['Investigación inicial', 'Investigación complementaria', 'Etapa intermedia', 'Juicio oral'] },
                    { id: 'delito', etiqueta: 'Delito imputado y código aplicable', tipo: 'texto' },
                    { id: 'hechos', etiqueta: 'Hechos relevantes', tipo: 'parrafo' },
                    { id: 'carpeta_doc', etiqueta: 'Registros de la carpeta de investigación', tipo: 'documento', obligatorio: false },
                ],
            },
            {
                id: 'probatoria',
                titulo: 'Teoría probatoria y debilidades',
                resumen: 'La prueba de cada proposición, la teoría contraria y los puntos débiles.',
                redaccion:
                    'La TEORÍA PROBATORIA (qué dato o medio de prueba sostiene cada proposición, conforme al Código Nacional de Procedimientos Penales), la teoría probable de la contraparte y las DEBILIDADES propias con cómo enfrentarlas.',
                campos: [
                    { id: 'pruebas', etiqueta: 'Datos y medios de prueba disponibles', tipo: 'varias' },
                    { id: 'debilidades', etiqueta: 'Debilidades que deben atenderse', tipo: 'varias', obligatorio: false },
                ],
            },
        ],
    },
    {
        id: 'dictamen',
        nombre: 'Investigación jurídica y dictamen',
        categoria: 'Investigación',
        descripcion:
            'De una pregunta a un dictamen: marco normativo, jurisprudencia obligatoria y conclusión.',
        entrega: 'Dictamen jurídico',
        pide: [
            'La pregunta, tan precisa como sea posible',
            'La entidad y la materia, si las sabes',
            'Para quién es y qué decisión apoya',
        ],
        ejemplo:
            '¿Puede una empresa en Jalisco descontar del finiquito el saldo de un préstamo personal al trabajador? El cliente quiere saber si le conviene hacerlo o demandar…',
        partes: [
            {
                id: 'marco',
                titulo: 'Planteamiento y marco jurídico',
                resumen: 'La pregunta precisa, las normas aplicables y la jurisprudencia.',
                redaccion:
                    'El PLANTEAMIENTO (la pregunta jurídica precisa y los hechos relevantes), el MARCO NORMATIVO con el texto de los artículos aplicables y la JURISPRUDENCIA, distinguiendo la obligatoria (artículo 217 de la Ley de Amparo) de la orientadora.',
                campos: [
                    { id: 'pregunta', etiqueta: 'Pregunta jurídica', tipo: 'parrafo' },
                    { id: 'destinatario', etiqueta: 'Para quién es el dictamen', tipo: 'texto', obligatorio: false },
                    { id: 'normas', etiqueta: 'Ordenamientos que deben analizarse', tipo: 'varias' },
                ],
            },
            {
                id: 'conclusion',
                titulo: 'Análisis y conclusiones',
                resumen: 'La respuesta, sus matices y el riesgo de cada alternativa.',
                redaccion:
                    'El ANÁLISIS aplicado a los hechos y las CONCLUSIONES: la respuesta a la pregunta, sus matices, las alternativas con su riesgo y la recomendación.',
                campos: [
                    { id: 'alternativas', etiqueta: 'Alternativas que deben evaluarse', tipo: 'varias' },
                ],
            },
        ],
    },
]

export function flujoPorId(id: string | null | undefined): FlujoTrabajo | null {
    if (!id) return null
    return FLUJOS.find((f) => f.id === id) ?? null
}

export function esObligatorio(c: CampoFlujo): boolean {
    return c.obligatorio !== false
}

/** Lo que se ve en el hilo al empezar: el flujo y el encargo, tal cual. */
export function mensajeDeFlujo(flujo: FlujoTrabajo, encargo: string): string {
    return `**Flujo · ${flujo.nombre}**\n\n${encargo.trim()}`
}

/** Un valor confirmado, como lo lee el modelo. */
export function valorLegible(v: unknown): string {
    if (Array.isArray(v)) return v.filter(Boolean).map((x) => `- ${x}`).join('\n')
    return typeof v === 'string' ? v.trim() : ''
}

/**
 * El mensaje visible de cada parte. Es también lo que busca el acervo, así que
 * lleva la frase de búsqueda que propuso el agente.
 */
export function mensajeDeParte(flujo: FlujoTrabajo, indice: number, consulta: string): string {
    const parte = flujo.partes[indice]
    const busqueda = consulta.trim() ? ` ${consulta.trim()}` : ''
    // Redacción Pro (gpt-5.6-luna): los flujos son de Pro en adelante, y el
    // modo Profesional va a un motor más ligero. Sin `user_id` (las partes no
    // cobran consultas) Platinum no puede comprobarse y queda en Pro.
    return `[MODO_REDACCION_PRO] ${flujo.entrega} — parte ${indice + 1} de ${flujo.partes.length}: ${parte.titulo.toLowerCase()}.${busqueda}`
}

/**
 * La instrucción de sistema al REDACTAR una parte. No lleva rótulos internos:
 * en la primera versión los paréntesis «(LO HACES TÚ)» acabaron como
 * encabezados del documento.
 */
export function instruccionDeParte(
    flujo: FlujoTrabajo,
    indice: number,
    valores: Record<string, unknown>
): string {
    const parte = flujo.partes[indice]
    const todos = flujo.partes.flatMap((p) => p.campos)
    const confirmados = todos
        .map((c) => {
            const v = valorLegible(valores[c.id])
            if (!v || c.tipo === 'documento') return null
            return v.includes('\n') ? `${c.etiqueta}:\n${v}` : `${c.etiqueta}: ${v}`
        })
        .filter(Boolean)
        .join('\n')
    // Un documento «que consta en la carpeta» ya viaja con la carpeta; aquí
    // sólo entra lo que el abogado pegó, en un campo o cuando el agente se lo
    // pidió (`aporte_<parte>`).
    const pegados = [
        ...todos
            .filter((c) => c.tipo === 'documento')
            .map((c) => ({ nombre: c.etiqueta, texto: valorLegible(valores[c.id]) })),
        ...Object.entries(valores)
            .filter(([k]) => k.startsWith('aporte_'))
            .map(([, v]) => ({ nombre: 'Documento aportado por el abogado', texto: valorLegible(v) })),
    ]
    const documentos = pegados
        .filter((d) => d.texto.length > 40)
        .map((d) => `## ${d.nombre} (texto aportado por el abogado)\n${d.texto.slice(0, 20000)}`)
        .join('\n\n')
    const siguiente = flujo.partes[indice + 1]

    return [
        `# REDACCIÓN POR PARTES: ${flujo.entrega}`,
        `Estás redactando con el abogado un escrito real que va a presentar. Se construye por partes; ésta es la parte ${indice + 1} de ${flujo.partes.length}: «${parte.titulo}».`,
        `Qué debe contener esta parte:\n${parte.redaccion}`,
        'Cómo escribirla:\n' +
            '- Escribe SÓLO el texto de esta parte, tal como irá en el escrito: sin saludo al abogado, sin explicaciones, sin notas al margen y sin rotularla como «parte».\n' +
            '- No repitas lo que ya se redactó en las partes anteriores de esta conversación; continúa donde se quedó.\n' +
            '- Usa los datos confirmados tal cual. Si un dato de hecho indispensable no está, escribe en su lugar [DATO PENDIENTE: qué falta] y sigue; nunca lo inventes.\n' +
            '- Fundamenta con el acervo: transcribe o cita los artículos y la jurisprudencia aplicables con su Doc ID.' +
            // Medido contra /chat el 25-sep: sin esto, la parte 1 terminaba con
            // petitorio, «PROTESTO LO NECESARIO» y firma, como si fuera el
            // escrito entero.
            (siguiente
                ? `\n- El escrito NO termina aquí: no escribas puntos petitorios, «PROTESTO LO NECESARIO», lugar, fecha ni firma. Termina en cuanto concluya «${parte.titulo}»; lo que sigue («${flujo.partes.slice(indice + 1).map((p) => p.titulo).join('», «')}») se redactará después.`
                : '\n- Es la última parte: cierra el escrito con los puntos petitorios, «PROTESTO LO NECESARIO», lugar, fecha y firma.'),
        confirmados ? `## Datos confirmados por el abogado\n${confirmados}` : null,
        documentos || null,
    ]
        .filter(Boolean)
        .join('\n\n')
}
