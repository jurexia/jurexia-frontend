/**
 * La carpeta (expediente) a la que pertenece un escrito abierto en la hoja,
 * cuando se abre desde una carpeta: permite guardarlo ahí y proponer al
 * cliente como destinatario del correo.
 */
export interface CarpetaDelEscrito {
    id: string;
    titulo: string;
    clienteNombre?: string | null;
    clienteCorreo?: string | null;
}
