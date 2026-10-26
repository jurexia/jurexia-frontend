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

const TIPO_POR_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * EL ARCHIVO SE LEE AL ELEGIRLO, NO AL ENVIARLO (25-oct-2026).
 *
 * En Chrome de Android el `File` del selector es una referencia al proveedor
 * del teléfono (WhatsApp, Drive, Descargas) y sus bytes se leen hasta el
 * envío. Si entre una cosa y otra el proveedor cambia la fecha del archivo o
 * retira el permiso, `fetch` falla al instante con «Failed to fetch» y se ve
 * «Se cortó la conexión» sin que la petición salga del teléfono. Le pasó a una
 * usuaria del plan gratuito el 25-oct con un PDF de WhatsApp: dos intentos de
 * menos de un segundo cada uno, y ninguno llegó al servidor.
 *
 * Copiados a memoria al elegirlo, el envío ya no depende del proveedor; y si
 * leerlo falla, falla aquí, donde se le puede decir qué hacer.
 */
export async function fijarAdjunto(archivo: File): Promise<File> {
    const bytes = await archivo.arrayBuffer();
    const extension = (archivo.name.split('.').pop() || '').toLowerCase();
    return new File([bytes], archivo.name, {
        type: archivo.type || TIPO_POR_EXTENSION[extension] || 'application/octet-stream',
        lastModified: archivo.lastModified || Date.now(),
    });
}

export const AVISO_ADJUNTO_ILEGIBLE =
    'No pudimos abrir el archivo desde su teléfono. Si lo recibió por WhatsApp, guárdelo '
    + 'primero en Descargas (o en Archivos) y vuelva a adjuntarlo desde ahí.';

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
