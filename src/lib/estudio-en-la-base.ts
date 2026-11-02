/* ¿YA ACEPTA LA BASE EL PLAN ESTUDIO? (2-nov-2026)
   ═══════════════════════════════════════════════════════════════════════════
   El front puede salir antes que la migración `sql/supabase_estudio.sql`
   (precios-nov2/estudio-hoy/sql). Sin ella, la base rechaza
   `platinum_estudio` (`user_profiles_subscription_type_check`) y
   `consumir_flujo` corta en 60. Si alguien compra Estudio en ese hueco:

     · el webhook no puede escribir el plan; el cliente paga 1,499 y se queda
       en gratuito o en el plan que tenía;
     · si venía de Platinum, el auto-cancelado de la suscripción vieja nunca
       corre (va después de escribir el plan): le quedan vivas las dos.

   Por eso el checkout pregunta antes de abrir el cobro. La pregunta es
   `limite_flujos('platinum_estudio')`: 60 hoy, 100 con la migración. Es la
   pieza D4, la última de una migración que va en UNA transacción con su
   comprobación final, así que 100 quiere decir también que el CHECK (D1) y el
   disparador (D2) ya están. Y es justo la cifra que promete la tarjeta.

   Un «sí» se recuerda mientras viva la instancia: la migración no se deshace
   sola (y su rollback aborta si ya hay clientes de Estudio). Un «no» o un
   error de red NO se recuerdan: se vuelve a preguntar en el siguiente clic,
   para que el botón se abra solo en cuanto se aplique la migración, sin
   variables de entorno ni otro despliegue. Ante la duda, no se cobra. */

import { FLUJOS_ESTUDIO, PLAN_ESTUDIO } from './plan-estudio';

/** Lo único que hace falta del cliente de Supabase (con la llave de servicio). */
type ConRpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

let confirmada = false;

export async function baseAceptaEstudio(db: ConRpc): Promise<boolean> {
    if (confirmada) return true;
    try {
        const { data, error } = await db.rpc('limite_flujos', { p_plan: PLAN_ESTUDIO });
        if (error) {
            console.error('⚠️ No pude preguntar a la base si acepta Estudio; no se abre el cobro:', error);
            return false;
        }
        confirmada = Number(data) === FLUJOS_ESTUDIO;
        if (!confirmada) {
            console.warn(`⏳ La base todavía no acepta Estudio (limite_flujos = ${String(data)}, se esperaba ${FLUJOS_ESTUDIO}): falta sql/supabase_estudio.sql`);
        }
        return confirmada;
    } catch (e) {
        console.error('⚠️ No pude preguntar a la base si acepta Estudio; no se abre el cobro:', e);
        return false;
    }
}

/** Sólo para las pruebas: olvida el «sí» recordado. */
export function olvidarConfirmacionEstudio(): void {
    confirmada = false;
}
