'use client';

import type { CarpetaDelEscrito } from '@/lib/documento/carpeta-del-escrito';

/**
 * «ENVIAR» EL ESCRITO POR CORREO, CON APROBACIÓN (16-oct-2026).
 *
 * Punto de montaje en la cabecera de `PanelDocumento` y de `EditorEscrito`.
 * La implementación vive en la rama `correo-aprobacion`.
 */
export interface EnviarPorCorreoProps {
    /** El escrito como .docx, exactamente como se descargaría; null si está vacío o hay cambios sin resolver. */
    obtenerDocx: () => Promise<Blob | null>;
    /** El texto plano de la hoja, para proponer asunto y mensaje. */
    obtenerTexto: () => string;
    titulo: string;
    carpeta?: CarpetaDelEscrito | null;
    deshabilitado?: boolean;
    avisar: (texto: string) => void;
}

export function EnviarPorCorreo(_props: EnviarPorCorreoProps) {
    return null;
}
