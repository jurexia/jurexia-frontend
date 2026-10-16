'use client';

import type { CarpetaDelEscrito } from '@/lib/documento/carpeta-del-escrito';

/**
 * «A LA CARPETA»: guarda el escrito de la hoja como documento del expediente
 * (16-oct-2026). Sólo aparece cuando el escrito se abrió desde una carpeta.
 * La implementación vive en la rama `plantillas-abogado`.
 */
export interface GuardarEnCarpetaProps {
    obtenerDocx: () => Promise<Blob | null>;
    titulo: string;
    carpeta?: CarpetaDelEscrito | null;
    avisar: (texto: string) => void;
}

export function GuardarEnCarpeta(_props: GuardarEnCarpetaProps) {
    return null;
}
