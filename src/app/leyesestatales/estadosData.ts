// ══════════════════════════════════════════════════════════════
// ESTADOS DATA — Plan Maestro Limpio
// 32 estados de México con estructura de leyes por categoría
// ══════════════════════════════════════════════════════════════

export interface Ley {
    nombre: string;
    fecha?: string; // fecha de última reforma/publicación
    url?: string;   // URL al PDF (Phase 2)
}

export interface CategoriaLeyes {
    constitucion: Ley[];
    leyes: Ley[];
    codigos: Ley[];
    reglamentos: Ley[];
    otros: Ley[];
}

export interface Estado {
    slug: string;
    nombre: string;
    nombreCorto: string;
    abreviatura: string;
    region: 'norte' | 'centro' | 'sur' | 'occidente' | 'oriente';
    leyesCount: number; // total de documentos indexados
    ultimaActualizacion?: string;
    leyes: CategoriaLeyes;
}

// Datos iniciales — Querétaro como caso de prueba con leyes reales
// Los demás estados tienen estructura placeholder
const QUERETARO_LEYES: CategoriaLeyes = {
    constitucion: [
        { nombre: 'Constitución Política del Estado Libre y Soberano de Querétaro', fecha: '2024-06-15' },
    ],
    leyes: [
        { nombre: 'Ley Orgánica del Poder Ejecutivo del Estado de Querétaro' },
        { nombre: 'Ley Orgánica del Poder Legislativo del Estado de Querétaro' },
        { nombre: 'Ley Orgánica del Poder Judicial del Estado de Querétaro' },
        { nombre: 'Ley de Transparencia y Acceso a la Información Pública del Estado de Querétaro' },
        { nombre: 'Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Querétaro' },
        { nombre: 'Ley Electoral del Estado de Querétaro' },
        { nombre: 'Ley de Hacienda del Estado de Querétaro' },
        { nombre: 'Ley de Educación del Estado de Querétaro' },
        { nombre: 'Ley de Salud del Estado de Querétaro' },
        { nombre: 'Ley de Desarrollo Urbano del Estado de Querétaro' },
        { nombre: 'Ley de Protección Ambiental para el Desarrollo Sustentable del Estado de Querétaro' },
        { nombre: 'Ley de Propiedad en Condominio del Estado de Querétaro' },
        { nombre: 'Ley del Notariado del Estado de Querétaro' },
        { nombre: 'Ley de Justicia Administrativa del Estado de Querétaro' },
        { nombre: 'Ley de los Derechos de las Personas Adultas Mayores del Estado de Querétaro' },
        { nombre: 'Ley para Prevenir y Eliminar la Discriminación en el Estado de Querétaro' },
        { nombre: 'Ley de Víctimas del Estado de Querétaro' },
        { nombre: 'Ley de Mediación, Conciliación y Promoción de la Paz Social para el Estado de Querétaro' },
        { nombre: 'Ley de Responsabilidades Administrativas del Estado de Querétaro' },
    ],
    codigos: [
        { nombre: 'Código Civil del Estado de Querétaro' },
        { nombre: 'Código Penal del Estado de Querétaro' },
        { nombre: 'Código de Procedimientos Civiles del Estado de Querétaro' },
        { nombre: 'Código de Procedimientos Penales del Estado de Querétaro' },
        { nombre: 'Código Urbano del Estado de Querétaro' },
        { nombre: 'Código Fiscal del Estado de Querétaro' },
        { nombre: 'Código Municipal del Estado de Querétaro' },
        { nombre: 'Código de Procedimientos Contenciosos Administrativos del Estado de Querétaro' },
    ],
    reglamentos: [
        { nombre: 'Reglamento de Construcción del Municipio de Querétaro' },
        { nombre: 'Reglamento de Tránsito del Municipio de Querétaro' },
        { nombre: 'Reglamento de la Ley de Desarrollo Urbano del Estado de Querétaro' },
        { nombre: 'Reglamento Interior del Congreso del Estado de Querétaro' },
    ],
    otros: [
        { nombre: 'Plan Estatal de Desarrollo del Estado de Querétaro 2022-2027' },
    ],
};

const LEYES_PLACEHOLDER: CategoriaLeyes = {
    constitucion: [],
    leyes: [],
    codigos: [],
    reglamentos: [],
    otros: [],
};

export const ESTADOS: Estado[] = [
    { slug: 'aguascalientes', nombre: 'Aguascalientes', nombreCorto: 'Aguascalientes', abreviatura: 'AGS', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'baja-california', nombre: 'Baja California', nombreCorto: 'Baja California', abreviatura: 'BC', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'baja-california-sur', nombre: 'Baja California Sur', nombreCorto: 'B.C. Sur', abreviatura: 'BCS', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'campeche', nombre: 'Campeche', nombreCorto: 'Campeche', abreviatura: 'CAMP', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'chiapas', nombre: 'Chiapas', nombreCorto: 'Chiapas', abreviatura: 'CHIS', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'chihuahua', nombre: 'Chihuahua', nombreCorto: 'Chihuahua', abreviatura: 'CHIH', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'ciudad-de-mexico', nombre: 'Ciudad de México', nombreCorto: 'CDMX', abreviatura: 'CDMX', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'coahuila', nombre: 'Coahuila de Zaragoza', nombreCorto: 'Coahuila', abreviatura: 'COAH', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'colima', nombre: 'Colima', nombreCorto: 'Colima', abreviatura: 'COL', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'durango', nombre: 'Durango', nombreCorto: 'Durango', abreviatura: 'DGO', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'guanajuato', nombre: 'Guanajuato', nombreCorto: 'Guanajuato', abreviatura: 'GTO', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'guerrero', nombre: 'Guerrero', nombreCorto: 'Guerrero', abreviatura: 'GRO', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'hidalgo', nombre: 'Hidalgo', nombreCorto: 'Hidalgo', abreviatura: 'HGO', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'jalisco', nombre: 'Jalisco', nombreCorto: 'Jalisco', abreviatura: 'JAL', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'estado-de-mexico', nombre: 'Estado de México', nombreCorto: 'Edo. de México', abreviatura: 'EDOMEX', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'michoacan', nombre: 'Michoacán de Ocampo', nombreCorto: 'Michoacán', abreviatura: 'MICH', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'morelos', nombre: 'Morelos', nombreCorto: 'Morelos', abreviatura: 'MOR', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'nayarit', nombre: 'Nayarit', nombreCorto: 'Nayarit', abreviatura: 'NAY', region: 'occidente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'nuevo-leon', nombre: 'Nuevo León', nombreCorto: 'Nuevo León', abreviatura: 'NL', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'oaxaca', nombre: 'Oaxaca', nombreCorto: 'Oaxaca', abreviatura: 'OAX', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'puebla', nombre: 'Puebla', nombreCorto: 'Puebla', abreviatura: 'PUE', region: 'oriente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'queretaro', nombre: 'Querétaro', nombreCorto: 'Querétaro', abreviatura: 'QRO', region: 'centro', leyesCount: 33, ultimaActualizacion: '2026-02-14', leyes: QUERETARO_LEYES },
    { slug: 'quintana-roo', nombre: 'Quintana Roo', nombreCorto: 'Quintana Roo', abreviatura: 'QROO', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'san-luis-potosi', nombre: 'San Luis Potosí', nombreCorto: 'San Luis Potosí', abreviatura: 'SLP', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'sinaloa', nombre: 'Sinaloa', nombreCorto: 'Sinaloa', abreviatura: 'SIN', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'sonora', nombre: 'Sonora', nombreCorto: 'Sonora', abreviatura: 'SON', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tabasco', nombre: 'Tabasco', nombreCorto: 'Tabasco', abreviatura: 'TAB', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tamaulipas', nombre: 'Tamaulipas', nombreCorto: 'Tamaulipas', abreviatura: 'TAMPS', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'tlaxcala', nombre: 'Tlaxcala', nombreCorto: 'Tlaxcala', abreviatura: 'TLAX', region: 'centro', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'veracruz', nombre: 'Veracruz de Ignacio de la Llave', nombreCorto: 'Veracruz', abreviatura: 'VER', region: 'oriente', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'yucatan', nombre: 'Yucatán', nombreCorto: 'Yucatán', abreviatura: 'YUC', region: 'sur', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
    { slug: 'zacatecas', nombre: 'Zacatecas', nombreCorto: 'Zacatecas', abreviatura: 'ZAC', region: 'norte', leyesCount: 0, leyes: LEYES_PLACEHOLDER },
];

export function getEstadoBySlug(slug: string): Estado | undefined {
    return ESTADOS.find(e => e.slug === slug);
}

export function getTotalLeyes(leyes: CategoriaLeyes): number {
    return (
        leyes.constitucion.length +
        leyes.leyes.length +
        leyes.codigos.length +
        leyes.reglamentos.length +
        leyes.otros.length
    );
}

// Iconos por región para tarjetas
export const REGION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    norte: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    centro: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    sur: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    occidente: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    oriente: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export const CATEGORIA_META: Record<keyof CategoriaLeyes, { label: string; icon: string; color: string }> = {
    constitucion: { label: 'Constitución Local', icon: '🏛️', color: 'text-amber-600' },
    leyes: { label: 'Leyes', icon: '📜', color: 'text-blue-600' },
    codigos: { label: 'Códigos', icon: '📕', color: 'text-red-600' },
    reglamentos: { label: 'Reglamentos', icon: '📋', color: 'text-green-600' },
    otros: { label: 'Otros', icon: '📎', color: 'text-gray-600' },
};
