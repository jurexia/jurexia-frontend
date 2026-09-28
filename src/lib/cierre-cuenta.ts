/* EL CIERRE QUE PIDIÓ EL TITULAR (28-sep-2026).

   Quien pide cancelar y recibe el reembolso de su último cargo (cláusula 7.4
   de los Términos) se queda con la cuenta inhabilitada hasta que decida volver,
   y vuelve con un pago. Vive en `blocked_users` —como el bloqueo por disputa—
   y no en `suspendido_at`, porque el barrido diario de morosos levanta la
   suspensión de quien no tiene facturas abiertas, y una suscripción cancelada
   no deja ninguna: la cuenta se reabriría sola a la mañana siguiente.

   Lo distingue el motivo: `cierre_solicitado:<plan> · <nota>`. El plan es el
   que tenía, y es el que se le ofrece al reactivar. A diferencia de la
   disputa, este bloqueo SÍ se abre pagando: el webhook borra la fila en cuanto
   entra el pago de una suscripción (`levantarCierreSolicitado`). */

export const PREFIJO_CIERRE_SOLICITADO = 'cierre_solicitado';

export function esCierreSolicitado(motivo?: string | null): boolean {
    return (motivo || '').startsWith(PREFIJO_CIERRE_SOLICITADO);
}

/** El plan que tenía, si el motivo lo trae («cierre_solicitado:platinum_monthly · …»). */
export function planDelCierre(motivo?: string | null): string | null {
    const m = /^cierre_solicitado:([a-z_]+)/.exec(motivo || '');
    return m ? m[1] : null;
}
