/* ═══ EL ESFUERZO DE REDACCIÓN (25-sep-2026) ═══════════════════════════════
   David: «que no sea necesario consultar o redactar, sino que baste con que
   quien introduzca "redacta" en el prompt active estas funciones […] esos
   botones no desaparecen, sólo los reconfiguras a esfuerzo básico, pro y
   platino, con un rediseño más minimalista, desplegable».

   Fuera el interruptor Buscar/Redactar: el servidor reconoce el encargo en
   el propio mensaje («Redacta una demanda…», «Agrega un concepto…») y sólo
   entonces aplica el esfuerzo. Las preguntas siguen siendo consultas.

   El esfuerzo se elige en el desplegable del compositor y viaja en CADA
   consulta como campo `esfuerzo` (api.ts lo lee al enviar, como las fuentes).
   El plan pone el techo: Básico lo tiene todo el mundo, Pro desde el plan
   Pro, Platinum sólo en Platinum. El servidor vuelve a comprobarlo.

   SE GUARDA EN EL NAVEGADOR y NO se apaga al recargar: quien paga Platinum no
   tiene que volver a elegirlo en cada visita. Sin elección guardada, se usa
   el más alto que permite su plan. */

import { isAdmin } from '@/app/leyesestatales/adminGuard';

export type Esfuerzo = 'basico' | 'pro' | 'platinum';

export const ESFUERZOS: readonly Esfuerzo[] = ['basico', 'pro', 'platinum'];

const CLAVE = 'iurexia-esfuerzo';

/** Lo dispara `guardarEsfuerzo`: otras piezas de la pantalla pueden escucharlo. */
export const EVENTO_ESFUERZO = 'iurexia:esfuerzo';

/* Lo que el desplegable enseña ahora mismo, ya acotado al plan. Sólo la
   elección EXPLÍCITA se guarda en el navegador: si se guardara también el
   valor por omisión, quien sube de Pro a Platinum se quedaría en Pro. */
let enPantalla: Esfuerzo | null = null;

const PLANES_PRO = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual', 'ultra_secretarios'];
const PLANES_PLATINUM = ['platinum_monthly', 'platinum_annual', 'ultra_secretarios'];

/** El escalón más alto que permite el plan. */
export function techoDelPlan(plan?: string | null, correo?: string | null): Esfuerzo {
    if (isAdmin(correo ?? undefined) || PLANES_PLATINUM.includes(plan ?? '')) return 'platinum';
    if (PLANES_PRO.includes(plan ?? '')) return 'pro';
    return 'basico';
}

export function permitido(e: Esfuerzo, techo: Esfuerzo): boolean {
    return ESFUERZOS.indexOf(e) <= ESFUERZOS.indexOf(techo);
}

function leerGuardado(): Esfuerzo | null {
    try {
        const v = localStorage.getItem(CLAVE);
        return (ESFUERZOS as readonly string[]).includes(v ?? '') ? (v as Esfuerzo) : null;
    } catch {
        return null;
    }
}

/** Lo elegido, sin pasar del techo; sin elección, el techo mismo. */
export function esfuerzoVigente(techo: Esfuerzo): Esfuerzo {
    const guardado = leerGuardado();
    if (!guardado) return techo;
    return permitido(guardado, techo) ? guardado : techo;
}

export function guardarEsfuerzo(e: Esfuerzo): Esfuerzo {
    enPantalla = e;
    try { localStorage.setItem(CLAVE, e); } catch { }
    try { window.dispatchEvent(new CustomEvent(EVENTO_ESFUERZO, { detail: e })); } catch { }
    return e;
}

export function fijarEnPantalla(e: Esfuerzo): void {
    enPantalla = e;
}

/** Lo que viaja en el request. `undefined` si aún no hay nada: el servidor
 *  sirve entonces el escalón base. */
export function esfuerzoParaEnviar(): Esfuerzo | undefined {
    return enPantalla ?? leerGuardado() ?? undefined;
}

/* Los caminos que FUERZAN la redacción —«Desarrollar a partir de este
   fundamento», la tarjeta «Escrito legal»— la piden con el marcador de
   siempre; el del escalón elegido. */
export function marcadorDeEsfuerzo(e: Esfuerzo | undefined): string {
    return e === 'platinum'
        ? '[MODO_REDACCION_PLATINUM]'
        : e === 'pro'
            ? '[MODO_REDACCION_PRO]'
            : '[MODO_REDACCION]';
}
