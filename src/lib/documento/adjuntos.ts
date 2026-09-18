/**
 * QUÉ DOCUMENTO SE ACEPTA, EN UN SOLO SITIO (18-sep-2026).
 *
 * La regla la aplican ahora dos caminos —el clip, que abre la ventana de
 * subida, y el arrastre sobre la pantalla— y tienen que decir lo mismo: un
 * archivo admitido por uno y rechazado por el otro es un fallo que el usuario
 * lee como capricho.
 *
 * El tope de 25 MB es el del backend, que recibe el archivo crudo y hace ahí
 * la extracción y el OCR.
 */

export const EXTENSIONES_ADJUNTO = ['.pdf', '.doc', '.docx'] as const;
export const LIMITE_ADJUNTO_MB = 25;

/** Devuelve el motivo del rechazo, o null si el archivo sirve. */
export function validarAdjunto(archivo: File): string | null {
    const extension = '.' + (archivo.name.split('.').pop() || '').toLowerCase();
    if (!(EXTENSIONES_ADJUNTO as readonly string[]).includes(extension)) {
        return `Formato no admitido. Se aceptan ${EXTENSIONES_ADJUNTO.join(', ')}.`;
    }
    if (archivo.size > LIMITE_ADJUNTO_MB * 1024 * 1024) {
        return `El archivo pesa demasiado. El máximo son ${LIMITE_ADJUNTO_MB} MB.`;
    }
    return null;
}
