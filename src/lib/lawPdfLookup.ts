/**
 * lawPdfLookup.ts — Resolves (origen, entidad) → PDF URL
 * 
 * Uses estadosData.ts as a lookup table.
 * The `origen` field from the API matches the `nombre` field in estadosData.
 * The `entidad` field (e.g. "QUERETARO") maps to a state in the ESTADOS array.
 */

import { ESTADOS, type CategoriaLeyes } from '@/app/leyesestatales/estadosData';

// Map from uppercase entidad names to estado slugs
const ENTIDAD_TO_SLUG: Record<string, string> = {
    'AGUASCALIENTES': 'aguascalientes',
    'BAJA CALIFORNIA': 'baja-california',
    'BAJA CALIFORNIA SUR': 'baja-california-sur',
    'CAMPECHE': 'campeche',
    'CHIAPAS': 'chiapas',
    'CHIHUAHUA': 'chihuahua',
    'CIUDAD DE MEXICO': 'cdmx',
    'CIUDAD_DE_MEXICO': 'cdmx',
    'CDMX': 'cdmx',
    'FEDERAL': 'federal',
    'NACIONAL': 'federal',
    'COAHUILA': 'coahuila',
    'COAHUILA DE ZARAGOZA': 'coahuila',
    'COLIMA': 'colima',
    'DURANGO': 'durango',
    'GUANAJUATO': 'guanajuato',
    'GUERRERO': 'guerrero',
    'HIDALGO': 'hidalgo',
    'JALISCO': 'jalisco',
    'ESTADO DE MEXICO': 'estado-de-mexico',
    'MEXICO': 'estado-de-mexico',
    'MICHOACAN': 'michoacan',
    'MORELOS': 'morelos',
    'NAYARIT': 'nayarit',
    'NUEVO LEON': 'nuevo-leon',
    'OAXACA': 'oaxaca',
    'PUEBLA': 'puebla',
    'QUERETARO': 'queretaro',
    'QUINTANA ROO': 'quintana-roo',
    'SAN LUIS POTOSI': 'san-luis-potosi',
    'SINALOA': 'sinaloa',
    'SONORA': 'sonora',
    'TABASCO': 'tabasco',
    'TAMAULIPAS': 'tamaulipas',
    'TLAXCALA': 'tlaxcala',
    'VERACRUZ': 'veracruz',
    'YUCATAN': 'yucatan',
    'ZACATECAS': 'zacatecas',
};

/**
 * Normalize a string for fuzzy comparison:
 * lowercase, strip accents, collapse whitespace
 */
function normalize(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Look up the PDF URL for a law given its origen (law name) and entidad (state).
 * Returns the URL string if found, null otherwise.
 */
export function findLawPdfUrl(origen: string | null | undefined, entidad: string | null | undefined): string | null {
    if (!origen || !entidad) return null;

    // Find the estado
    const slug = ENTIDAD_TO_SLUG[entidad.toUpperCase().trim()];
    if (!slug) return null;

    const estado = ESTADOS.find(e => e.slug === slug);
    if (!estado || estado.leyesCount === 0) return null;

    // Search across all categories
    const categories: (keyof CategoriaLeyes)[] = ['constitucion', 'leyes', 'codigos', 'reglamentos', 'otros'];
    const normalizedOrigen = normalize(origen);

    for (const cat of categories) {
        const leyes = estado.leyes[cat];
        for (const ley of leyes) {
            if (ley.url && normalize(ley.nombre) === normalizedOrigen) {
                return ley.url;
            }
        }
    }

    // Fuzzy fallback: check if the normalized origen contains or is contained by a law name
    for (const cat of categories) {
        const leyes = estado.leyes[cat];
        for (const ley of leyes) {
            if (ley.url) {
                const normalizedNombre = normalize(ley.nombre);
                if (normalizedOrigen.includes(normalizedNombre) || normalizedNombre.includes(normalizedOrigen)) {
                    return ley.url;
                }
            }
        }
    }

    return null;
}

/**
 * Get the display name for a state from its entidad code.
 */
export function getEstadoDisplayName(entidad: string | null | undefined): string | null {
    if (!entidad) return null;
    const slug = ENTIDAD_TO_SLUG[entidad.toUpperCase().trim()];
    if (!slug) return null;
    const estado = ESTADOS.find(e => e.slug === slug);
    return estado?.nombre ?? null;
}
