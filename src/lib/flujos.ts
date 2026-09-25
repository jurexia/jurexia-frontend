/**
 * Flujos de trabajo — la pieza de Astra for Law traída a Iurexia (25-sep-2026).
 *
 * Un flujo es un proceso jurídico con pasos DECLARADOS: qué aporta el abogado,
 * qué hace Iurexia y dónde revisa el abogado. El valor no está en que la IA
 * haga más, sino en que el abogado vea de antemano el camino, sepa qué tiene
 * que traer, y reciba el trabajo ordenado por esos mismos pasos.
 *
 * Lo que un flujo NO es: un agente que corre por su cuenta en varias vueltas.
 * Iurexia recorre los pasos en UNA respuesta del chat, con el acervo de
 * siempre, y la revisión del abogado cierra cada flujo. Se dice así en la
 * pantalla para no prometer lo que no pasa.
 *
 * Cómo viaja: el encargo del abogado es el mensaje visible (y lo que busca el
 * acervo); los pasos van como instrucción de sistema junto al contexto de la
 * carpeta (ver `contexto-carpeta.ts`), así la búsqueda no se contamina con el
 * andamiaje y el hilo no se llena de instrucciones.
 */

export type EjecutaPaso = 'abogado' | 'iurexia' | 'revision'

export interface PasoFlujo {
    titulo: string
    /** Qué se hace en el paso, dicho para el abogado y para el modelo. */
    detalle: string
    ejecuta: EjecutaPaso
}

export interface FlujoTrabajo {
    id: string
    nombre: string
    categoria: 'Amparo' | 'Litigio' | 'Contratos' | 'Penal' | 'Investigación'
    descripcion: string
    /** El documento con que termina. */
    entrega: string
    /** Lo que el encargo debería traer; se muestra como lista antes de lanzar. */
    pide: string[]
    ejemplo: string
    pasos: PasoFlujo[]
}

export const FLUJOS: FlujoTrabajo[] = [
    {
        id: 'amparo-indirecto',
        nombre: 'Amparo indirecto: procedencia y suspensión',
        categoria: 'Amparo',
        descripcion:
            'De un acto de autoridad a un dictamen de procedencia, plazo y suspensión, con el esquema de la demanda.',
        entrega: 'Dictamen de procedencia y esquema de demanda',
        pide: [
            'El acto reclamado y la autoridad que lo emitió o lo ejecuta',
            'Cuándo se notificó o se tuvo conocimiento del acto',
            'Qué derecho se afecta y cómo (interés jurídico o legítimo)',
        ],
        ejemplo:
            'El IMSS negó por oficio del 2 de septiembre la pensión por viudez de mi clienta, notificado el 5. Ella acreditó el concubinato con sentencia de jurisdicción voluntaria…',
        pasos: [
            { titulo: 'El acto y la autoridad', detalle: 'Acto reclamado, autoridad responsable y fecha de notificación o conocimiento.', ejecuta: 'abogado' },
            { titulo: 'Procedencia', detalle: 'Supuesto del artículo 107 de la Ley de Amparo; causales de improcedencia del artículo 61 que podrían oponerse, incluida la definitividad y sus excepciones.', ejecuta: 'iurexia' },
            { titulo: 'Plazo', detalle: 'Plazo aplicable (artículo 17) y su cómputo (artículo 18), con la fecha límite si consta la notificación.', ejecuta: 'iurexia' },
            { titulo: 'Suspensión', detalle: 'Si procede de oficio o a petición de parte; requisitos del artículo 128, ponderación de la apariencia del buen derecho y del peligro en la demora (artículo 138) y garantía.', ejecuta: 'iurexia' },
            { titulo: 'Esquema de la demanda', detalle: 'Requisitos del artículo 108 y conceptos de violación propuestos, cada uno con su fundamento.', ejecuta: 'iurexia' },
            { titulo: 'Revisión del abogado', detalle: 'Confirmar fechas, pruebas del interés y la vía antes de presentar.', ejecuta: 'revision' },
        ],
    },
    {
        id: 'amparo-directo',
        nombre: 'Amparo directo: conceptos de violación',
        categoria: 'Amparo',
        descripcion:
            'De la sentencia definitiva a los conceptos de violación, separando las violaciones procesales de las de fondo.',
        entrega: 'Proyecto de conceptos de violación',
        pide: [
            'La sentencia definitiva, laudo o resolución que puso fin al juicio',
            'La fecha de notificación',
            'Las violaciones procesales que se hicieron valer durante el juicio',
        ],
        ejemplo:
            'Sentencia de apelación del Tribunal Superior que confirmó la condena al pago de 1.2 millones por incumplimiento de contrato; no se valoró la pericial contable que ofrecimos…',
        pasos: [
            { titulo: 'La sentencia reclamada', detalle: 'Qué resolvió, quién la dictó y cuándo se notificó.', ejecuta: 'abogado' },
            { titulo: 'Procedencia y plazo', detalle: 'Procedencia del amparo directo (artículo 170 de la Ley de Amparo), plazo y presentación por conducto de la autoridad responsable.', ejecuta: 'iurexia' },
            { titulo: 'Violaciones procesales', detalle: 'Las que trascendieron al fallo y si se prepararon como exigen los artículos 171 a 173.', ejecuta: 'iurexia' },
            { titulo: 'Violaciones de fondo', detalle: 'Fundamentación, motivación, valoración de pruebas, congruencia y exhaustividad.', ejecuta: 'iurexia' },
            { titulo: 'Conceptos de violación', detalle: 'Redactados con su causa de pedir: qué dice la sentencia, por qué es contraria a derecho, con qué norma o criterio, y qué se pide.', ejecuta: 'iurexia' },
            { titulo: 'Revisión del abogado', detalle: 'Cotejar las transcripciones con el expediente y verificar la preparación de las violaciones procesales.', ejecuta: 'revision' },
        ],
    },
    {
        id: 'contestacion',
        nombre: 'Contestación de demanda',
        categoria: 'Litigio',
        descripcion:
            'De la demanda recibida a un proyecto de contestación: hechos uno por uno, excepciones y pruebas.',
        entrega: 'Proyecto de contestación',
        pide: [
            'La demanda y sus anexos (o su contenido esencial)',
            'La fecha del emplazamiento, la entidad y la vía',
            'La versión del cliente sobre cada hecho',
        ],
        ejemplo:
            'Nos demandan en la vía ordinaria mercantil el pago de un pagaré de 350 mil pesos; el cliente dice que lo pagó en efectivo y tiene recibos firmados. Emplazamiento del 18 de septiembre en Querétaro…',
        pasos: [
            { titulo: 'La demanda', detalle: 'Prestaciones, hechos y fundamentos que plantea la actora; fecha de emplazamiento.', ejecuta: 'abogado' },
            { titulo: 'Plazo y vía', detalle: 'Plazo para contestar según el código aplicable (CNPCF donde ya rige, el código procesal local o el Código de Comercio) y la fecha límite si consta el emplazamiento.', ejecuta: 'iurexia' },
            { titulo: 'Hechos, uno por uno', detalle: 'Afirmar, negar o manifestar que se ignoran, con la consecuencia de no hacerlo.', ejecuta: 'iurexia' },
            { titulo: 'Excepciones y defensas', detalle: 'Procesales y de fondo que proceden con los hechos del encargo (prescripción, pago, falta de legitimación, las que apliquen).', ejecuta: 'iurexia' },
            { titulo: 'Pruebas', detalle: 'Qué ofrecer y qué acredita cada una, y si el código exige ofrecerlas con la contestación.', ejecuta: 'iurexia' },
            { titulo: 'Proyecto de contestación', detalle: 'El escrito completo, listo para ajustar.', ejecuta: 'iurexia' },
            { titulo: 'Revisión del abogado', detalle: 'Verificar el cómputo del plazo, los hechos que el cliente confirma y los documentos que se anexan.', ejecuta: 'revision' },
        ],
    },
    {
        id: 'agravios',
        nombre: 'Apelación: expresión de agravios',
        categoria: 'Litigio',
        descripcion:
            'De la resolución de primera instancia a los agravios, cada uno con su causa de pedir.',
        entrega: 'Proyecto de escrito de agravios',
        pide: [
            'La resolución apelada y su fecha de notificación',
            'Lo que se pidió y lo que se resolvió',
            'Dónde cree que el juez se equivocó',
        ],
        ejemplo:
            'El juez familiar fijó alimentos del 15% sin considerar los ingresos del padre acreditados con estados de cuenta; sentencia notificada el 10 de septiembre en Jalisco…',
        pasos: [
            { titulo: 'La resolución apelada', detalle: 'Qué se decidió, en qué juicio y cuándo se notificó.', ejecuta: 'abogado' },
            { titulo: 'Procedencia, plazo y efectos', detalle: 'Si la resolución es apelable, el plazo y los efectos según el código aplicable.', ejecuta: 'iurexia' },
            { titulo: 'Lo que se resolvió mal', detalle: 'Errores de fondo, de valoración probatoria y de forma, separados.', ejecuta: 'iurexia' },
            { titulo: 'Agravios', detalle: 'Cada agravio con su causa de pedir: la parte de la resolución, por qué es incorrecta, la norma o el criterio que lo sostiene y lo que se pide.', ejecuta: 'iurexia' },
            { titulo: 'Proyecto del escrito', detalle: 'El escrito completo de agravios.', ejecuta: 'iurexia' },
            { titulo: 'Revisión del abogado', detalle: 'Cotejar con las constancias y confirmar el plazo.', ejecuta: 'revision' },
        ],
    },
    {
        id: 'contrato',
        nombre: 'Revisión de contrato',
        categoria: 'Contratos',
        descripcion:
            'Del contrato y el objetivo del cliente a un dictamen de riesgos con la redacción propuesta.',
        entrega: 'Dictamen de revisión con propuesta de cambios',
        pide: [
            'El contrato (o sus cláusulas relevantes)',
            'A qué parte representas y qué busca',
            'La entidad y si es civil o mercantil',
        ],
        ejemplo:
            'Represento al arrendatario en un arrendamiento comercial a cinco años en Monterrey; le preocupa la pena por terminación anticipada y el aumento anual de la renta…',
        pasos: [
            { titulo: 'El contrato y el objetivo', detalle: 'El texto y lo que busca la parte que se representa.', ejecuta: 'abogado' },
            { titulo: 'Estructura', detalle: 'Partes, objeto, obligaciones, plazos, montos y forma.', ejecuta: 'iurexia' },
            { titulo: 'Validez y ley aplicable', detalle: 'Requisitos de forma y de fondo según el Código Civil de la entidad, el Federal o el Código de Comercio.', ejecuta: 'iurexia' },
            { titulo: 'Cláusulas de riesgo', detalle: 'Penas convencionales, rescisión, garantías, jurisdicción y lo que falta, ordenadas por gravedad para la parte representada.', ejecuta: 'iurexia' },
            { titulo: 'Redacción propuesta', detalle: 'Cada cambio con la cláusula actual, la propuesta y la razón.', ejecuta: 'iurexia' },
            { titulo: 'Revisión del abogado', detalle: 'Decidir qué se negocia y qué se acepta.', ejecuta: 'revision' },
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
            'A quién representas (defensa, asesoría de la víctima o fiscalía)',
            'La etapa del procedimiento y el delito imputado',
        ],
        ejemplo:
            'Defensa de un imputado por robo con violencia en Puebla; audiencia intermedia en tres semanas. La identificación se hizo por fotografía sin cumplir el protocolo…',
        pasos: [
            { titulo: 'Los hechos y la etapa', detalle: 'Lo que consta en la carpeta, la parte representada y la etapa.', ejecuta: 'abogado' },
            { titulo: 'Teoría fáctica', detalle: 'El relato que se sostendrá, en proposiciones fácticas.', ejecuta: 'iurexia' },
            { titulo: 'Teoría jurídica', detalle: 'Tipo penal aplicable, sus elementos, forma de intervención y causas de exclusión del delito posibles.', ejecuta: 'iurexia' },
            { titulo: 'Teoría probatoria', detalle: 'Qué dato o medio de prueba sostiene cada proposición, conforme al CNPP.', ejecuta: 'iurexia' },
            { titulo: 'Debilidades', detalle: 'La teoría de la contraparte y los puntos débiles propios.', ejecuta: 'iurexia' },
            { titulo: 'Revisión del abogado', detalle: 'Contrastar con los registros de la carpeta antes de la audiencia.', ejecuta: 'revision' },
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
            'Para quién es el dictamen y qué decisión apoya',
        ],
        ejemplo:
            '¿Puede una empresa en Jalisco descontar del finiquito el saldo de un préstamo personal al trabajador? El cliente quiere saber si le conviene hacerlo o demandar…',
        pasos: [
            { titulo: 'La pregunta', detalle: 'El problema y su contexto.', ejecuta: 'abogado' },
            { titulo: 'Planteamiento', detalle: 'La pregunta jurídica precisa y lo que hay que resolver para contestarla.', ejecuta: 'iurexia' },
            { titulo: 'Marco normativo', detalle: 'Constitución, tratados y leyes aplicables, con el texto de los artículos.', ejecuta: 'iurexia' },
            { titulo: 'Jurisprudencia y precedentes', detalle: 'Criterios aplicables, distinguiendo los obligatorios (artículo 217 de la Ley de Amparo) de los orientadores.', ejecuta: 'iurexia' },
            { titulo: 'Análisis y conclusión', detalle: 'La respuesta, sus matices y el riesgo de cada alternativa.', ejecuta: 'iurexia' },
            { titulo: 'Revisión del abogado', detalle: 'Validar la conclusión con los hechos completos del caso.', ejecuta: 'revision' },
        ],
    },
]

export function flujoPorId(id: string | null | undefined): FlujoTrabajo | null {
    if (!id) return null
    return FLUJOS.find((f) => f.id === id) ?? null
}

export const ROTULO_EJECUTA: Record<EjecutaPaso, string> = {
    abogado: 'Tú',
    iurexia: 'Iurexia',
    revision: 'Tu revisión',
}

/** Lo que se ve en el hilo: el nombre del flujo y el encargo, tal cual. */
export function mensajeDeFlujo(flujo: FlujoTrabajo, encargo: string): string {
    return `**Flujo · ${flujo.nombre}**\n\n${encargo.trim()}`
}

/**
 * La instrucción de sistema del flujo.
 *
 * En la PRIMERA respuesta se recorren todos los pasos. Después no: si el
 * abogado pide «acórtalo» o «¿y la suspensión de oficio?», rehacer el flujo
 * entero sería no escucharlo. Ahí sólo se le recuerda al modelo de dónde viene
 * la conversación.
 */
export function instruccionesDeFlujo(flujo: FlujoTrabajo, primerTurno: boolean): string {
    if (!primerTurno) {
        return (
            `# FLUJO DE TRABAJO EN CURSO: ${flujo.nombre}\n` +
            `Esta conversación nació de ese flujo (entrega: ${flujo.entrega}). ` +
            'Lo que el abogado pide ahora continúa ese trabajo: responde exactamente a lo que pide, ' +
            'sin rehacer el flujo completo salvo que lo solicite.'
        )
    }
    const pasos = flujo.pasos
        .map((p, i) => {
            const quien =
                p.ejecuta === 'abogado'
                    ? 'LO APORTA EL ABOGADO: tómalo del encargo y de la carpeta; si falta, dilo'
                    : p.ejecuta === 'revision'
                      ? 'LO HACE EL ABOGADO: no lo hagas tú, prepáralo'
                      : 'LO HACES TÚ'
            return `${i + 1}. ${p.titulo} (${quien}) — ${p.detalle}`
        })
        .join('\n')
    return (
        `# FLUJO DE TRABAJO: ${flujo.nombre}\n` +
        `El abogado arrancó esta consulta con un flujo de trabajo. La entrega es: ${flujo.entrega}.\n\n` +
        'Recorre estos pasos en orden y usa el título de cada paso como encabezado de su sección:\n' +
        `${pasos}\n\n` +
        'Reglas del flujo:\n' +
        '- Si el encargo no trae algo que un paso necesita, abre con una sección «Lo que falta del encargo» ' +
        'y avanza con lo que sí consta; nunca inventes hechos, fechas, montos ni números de expediente.\n' +
        '- Los plazos se calculan sólo si consta la fecha de notificación; si no, di cómo se computan.\n' +
        '- El último paso es del abogado: ciérralo con la sección «Para tu revisión», una lista concreta de lo ' +
        'que debe verificar antes de usar el documento.'
    )
}
