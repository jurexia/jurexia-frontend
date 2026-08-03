/**
 * El plan de trabajo de una demanda de amparo indirecto.
 *
 * La idea que se toma de Harvey: el abogado describe la tarea, **ve el plan
 * antes de que se ejecute**, lo ajusta y lo aprueba. La diferencia con un chat
 * es que el trabajo deja de ser una caja negra y el criterio sigue siendo suyo.
 *
 * Aquí el plan NO lo inventa el modelo: la estructura de una demanda de amparo
 * está en la Ley de Amparo, así que se arma de forma determinista a partir de
 * los datos del caso. Eso lo hace reproducible —el mismo caso da el mismo
 * plan— y evita que el modelo se salte un requisito de los que exige el
 * artículo 108.
 */

export type ClaveVia =
    | 'analisis'
    | 'procedencia'
    | 'autoridades'
    | 'constitucional'
    | 'jurisprudencia'
    | 'conceptos'
    | 'suspension'
    | 'escrito';

export interface PasoPlan {
    clave: ClaveVia;
    titulo: string;
    detalle: string;
    /** Qué bases consulta este paso. Vacío si es puro razonamiento. */
    fuentes: string[];
    /** Los pasos obligatorios no se pueden desactivar: sin ellos no hay demanda. */
    obligatorio: boolean;
}

export interface DatosAmparo {
    quejoso: string;
    actoReclamado: string;
    autoridades: string;
    fechaConocimiento: string;
    estado: string;
    /** Supuesto del plazo; decide el paso de procedencia y el aviso al usuario. */
    urgencia: 'ordinario' | 'sin_plazo';
    pideSuspension: boolean;
    /** Cualquier dato extra que el abogado quiera que se tome en cuenta. */
    notas: string;
}

export const DATOS_VACIOS: DatosAmparo = {
    quejoso: '',
    actoReclamado: '',
    autoridades: '',
    fechaConocimiento: '',
    estado: '',
    urgencia: 'ordinario',
    pideSuspension: true,
    notas: '',
};

/**
 * El plazo del amparo indirecto.
 *
 * Regla general: quince días (art. 17 de la Ley de Amparo). Pero su fracción IV
 * exime del plazo a los actos que importen peligro de privación de la vida,
 * ataques a la libertad personal fuera de procedimiento, incomunicación,
 * deportación, destierro, desaparición forzada o los prohibidos por el
 * artículo 22 constitucional: esos pueden promoverse **en cualquier tiempo**.
 *
 * Se calcula en días naturales a modo de aviso temprano. NO sustituye el
 * cómputo en días hábiles del órgano: por eso lo que se devuelve es una
 * advertencia, no una fecha de vencimiento.
 */
export function avisoDePlazo(datos: DatosAmparo): { tono: 'neutro' | 'atencion' | 'urgente'; texto: string } | null {
    if (datos.urgencia === 'sin_plazo') {
        return {
            tono: 'neutro',
            texto: 'Por el tipo de acto, la demanda puede promoverse en cualquier tiempo (art. 17, fr. IV, Ley de Amparo).',
        };
    }
    if (!datos.fechaConocimiento) return null;

    const desde = new Date(datos.fechaConocimiento + 'T00:00:00');
    if (Number.isNaN(desde.getTime())) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.floor((hoy.getTime() - desde.getTime()) / 86_400_000);
    if (dias < 0) return null;

    if (dias > 21) {
        return {
            tono: 'urgente',
            texto: `Han pasado ${dias} días naturales desde que se conoció el acto. El plazo genérico es de quince días hábiles (art. 17). Verifica el cómputo antes de promover.`,
        };
    }
    if (dias > 10) {
        return {
            tono: 'atencion',
            texto: `Han pasado ${dias} días naturales. El plazo genérico es de quince días hábiles (art. 17): confirma cuántos hábiles quedan.`,
        };
    }
    return {
        tono: 'neutro',
        texto: `Han pasado ${dias} días naturales desde que se conoció el acto. Plazo genérico: quince días hábiles (art. 17).`,
    };
}

/** Arma el plan según los datos. Determinista: mismos datos, mismo plan. */
export function construirPlan(datos: DatosAmparo): PasoPlan[] {
    const entidad = datos.estado ? `legislación de ${datos.estado}` : 'legislación estatal';

    const plan: PasoPlan[] = [
        {
            clave: 'analisis',
            titulo: 'Analizar el acto reclamado',
            detalle: 'Clasificar el acto, determinar si es de tracto sucesivo o de ejecución instantánea y si proviene de autoridad para efectos del amparo.',
            fuentes: [],
            obligatorio: true,
        },
        {
            clave: 'procedencia',
            titulo: 'Revisar procedencia y plazo',
            detalle:
                datos.urgencia === 'sin_plazo'
                    ? 'Confirmar que el acto encuadra en el art. 17, fr. IV, y revisar las causales de improcedencia del art. 61.'
                    : 'Cómputo del plazo del art. 17 y revisión de las causales de improcedencia del art. 61.',
            fuentes: ['Ley de Amparo'],
            obligatorio: true,
        },
        {
            clave: 'autoridades',
            titulo: 'Precisar autoridades responsables',
            detalle: 'Separar autoridad ordenadora de ejecutora y verificar que cada una quede señalada como exige el art. 108, fr. III.',
            fuentes: ['Ley de Amparo', entidad],
            obligatorio: true,
        },
        {
            clave: 'constitucional',
            titulo: 'Identificar los derechos violados',
            detalle: 'Localizar los preceptos constitucionales y convencionales que el acto transgrede, incluidos los arts. 103 y 107.',
            fuentes: ['Constitución', 'Bloque de constitucionalidad'],
            obligatorio: true,
        },
        {
            clave: 'jurisprudencia',
            titulo: 'Buscar jurisprudencia aplicable',
            detalle: 'Tesis y jurisprudencia de la SCJN y de Tribunales Colegiados sobre el acto y los derechos en juego. Cada cita se comprueba contra el Semanario.',
            fuentes: ['Jurisprudencia SCJN', 'Precedentes TCC'],
            obligatorio: false,
        },
        {
            clave: 'conceptos',
            titulo: 'Redactar los conceptos de violación',
            detalle: 'Argumentar la transgresión con silogismo completo: premisa normativa, hecho y conclusión, apoyada en los criterios encontrados.',
            fuentes: [],
            obligatorio: true,
        },
    ];

    if (datos.pideSuspension) {
        plan.push({
            clave: 'suspension',
            titulo: 'Redactar la suspensión',
            detalle: 'Capítulo de suspensión con la apariencia del buen derecho y el peligro en la demora; provisional y definitiva (arts. 125 a 158).',
            fuentes: ['Ley de Amparo'],
            obligatorio: false,
        });
    }

    plan.push({
        clave: 'escrito',
        titulo: 'Armar el escrito completo',
        detalle: 'Proemio, hechos, preceptos violados, conceptos de violación, pruebas y petitorios, con los requisitos del art. 108.',
        fuentes: [],
        obligatorio: true,
    });

    return plan;
}

/**
 * Convierte el plan aprobado en la instrucción que recibe el motor.
 *
 * Va por el chat que ya existe: el marcador `[MODO_REDACCION_PRO]` es el mismo
 * que usa el botón de Redacción Pro, así que no hace falta tocar el backend
 * para que esto funcione.
 */
export function instruccionDesdePlan(datos: DatosAmparo, pasos: PasoPlan[]): string {
    const lista = pasos.map((p, i) => `${i + 1}. ${p.titulo}: ${p.detalle}`).join('\n');

    return [
        '[MODO_REDACCION_PRO]',
        'Redacta una DEMANDA DE AMPARO INDIRECTO conforme al plan aprobado por el abogado.',
        '',
        'DATOS DEL CASO',
        `- Quejoso: ${datos.quejoso}`,
        `- Acto reclamado: ${datos.actoReclamado}`,
        `- Autoridades responsables: ${datos.autoridades}`,
        datos.fechaConocimiento ? `- Fecha en que se conoció el acto: ${datos.fechaConocimiento}` : '',
        datos.estado ? `- Entidad: ${datos.estado}` : '',
        datos.urgencia === 'sin_plazo'
            ? '- Supuesto de plazo: acto de los previstos en el art. 17, fr. IV (puede promoverse en cualquier tiempo).'
            : '- Supuesto de plazo: plazo genérico de quince días (art. 17).',
        `- Suspensión: ${datos.pideSuspension ? 'sí se solicita' : 'no se solicita'}`,
        datos.notas ? `- Notas del abogado: ${datos.notas}` : '',
        '',
        'PLAN APROBADO — sigue estos pasos en orden y no omitas ninguno:',
        lista,
        '',
        'REGLAS',
        '- Cumple los requisitos del artículo 108 de la Ley de Amparo.',
        '- Cita los artículos 103 y 107 constitucionales de forma expresa.',
        '- Cada tesis que cites debe llevar su registro digital. Si no estás seguro de que exista, no la cites.',
        '- Estructura formal mexicana: proemio, hechos, preceptos violados, conceptos de violación, pruebas y petitorios.',
        '- No inventes datos del caso. Si algo falta, márcalo entre corchetes para que el abogado lo complete.',
    ]
        .filter(Boolean)
        .join('\n');
}
