/* ═══ EL PLAN ESTUDIO (2-nov-2026) ══════════════════════════════════════════
   David, 2-nov-2026: lanzar hoy el Plan Estudio SIN tocar nada más del
   catálogo. Estudio es Platinum y además: consultas ilimitadas, la IA de
   última generación primero y 100 flujos de trabajo al mes. $1,499 al mes,
   sólo mensual. Stripe ya tiene el producto (prod_VYPXZl4MLsf1Tu) y el precio
   (price_1UXIiI3uD85CqvjMrXLzuClJ); el precio vive en `lib/stripe.ts`, como
   los demás.

   EL ID EMPIEZA CON «platinum» A PROPÓSITO. Media aplicación decide «¿es
   Platinum?» por prefijo (`startsWith('platinum')`: 50 MB por archivo, la
   insignia, el escalón de las funciones de despacho, el tema del correo) y la
   API y la base hacen lo mismo (`like 'platinum%'`). Con `platinum_estudio`
   todo eso le toca a Estudio sin editarlo; las listas EXPLÍCITAS sí se
   editaron una por una (ver precios-nov2/estudio-hoy/front-plomeria).

   «ILIMITADAS» NO ES −1. Con `queries_limit = -1` el chat de la web calcula
   «límite − usadas» < 0 y abre el aviso de límite, y la app instalada
   (`max(0, -1 - usadas)`) bloquea; esa app no se puede actualizar hoy. Por eso
   se guarda un tope alto y finito, 3,100 (100 al día × 31 días), y la
   pantalla dice «Ilimitadas». El tope es el de uso razonable: lo que la
   tarjeta y los Términos prometen («hasta 100 consultas al día»).

   EL FRENO DE 560. Las primeras 560 consultas del periodo van con la IA
   Jurídica de Élite, como en Platinum; desde ahí el chat, los documentos y
   la redacción siguen sin límite con la IA Jurídica Avanzada (la de Pro), y
   Bóveda, Cronología y el OCR de documentos escaneados esperan al siguiente
   periodo. Lo aplica la API, que es quien elige el motor; aquí sólo vive la
   cifra para que la pantalla diga lo mismo.

   Este módulo no importa nada: lo usan componentes del navegador, rutas del
   servidor y la comprobación de `comprobaciones/plan_estudio.mjs`. */

/** El id del plan en Supabase, en `PLANS` y en `PLAN_CONFIG`. */
export const PLAN_ESTUDIO = 'platinum_estudio';

/** Lo que se guarda en `queries_limit`: el tope de uso razonable del mes. */
export const TOPE_CONSULTAS_ESTUDIO = 3100;

/** Consultas del periodo con la IA Jurídica de Élite; las mismas que Platinum. */
export const CONSULTAS_ELITE_ESTUDIO = 560;

/** Flujos de trabajo al mes (Platinum y Ultra, 60; Pro, 30). */
export const FLUJOS_ESTUDIO = 100;

/** Espacio para expedientes, en MB: 20 GB, como Ultra (Platinum tiene 2 GB). */
export const CUOTA_MB_ESTUDIO = 20480;

/** Hojas que se leen de un documento: las de Platinum. */
export const PAGINAS_ESTUDIO = 600;

/** El texto que acompaña a «Ilimitadas» donde hay sitio para decirlo. */
export const USO_RAZONABLE_ESTUDIO =
    'Consultas ilimitadas con uso razonable: las primeras 560 de cada mes con la IA Jurídica de Élite; ' +
    'después, sin límite con la IA Jurídica Avanzada. Hasta 100 consultas al día, sin automatización ni extracción masiva.';

/* LOS «TODAVÍA NO» DEL COBRO DE ESTUDIO (2-nov-2026). Los dice la ruta del
   checkout y la tarjeta los enseña tal cual, sin el «Error al procesar el
   pago» de los fallos de verdad: por eso viven aquí, donde los leen las dos.

   · La base aún no acepta el plan (falta `sql/supabase_estudio.sql`): cobrar
     dejaría el pago sin plan. Ver `lib/estudio-en-la-base.ts`. */
export const MENSAJE_ESTUDIO_NO_DISPONIBLE =
    'El Plan Estudio se está activando y abre en unos minutos. ' +
    'Vuelve a intentarlo en un momento o escríbenos a soporte@iurexia.com.';

/** Los mensajes del checkout que la tarjeta enseña tal cual. */
export const AVISOS_DEL_COBRO_ESTUDIO: readonly string[] = [MENSAJE_ESTUDIO_NO_DISPONIBLE];

export function esEstudio(plan?: string | null): boolean {
    return (plan ?? '').trim() === PLAN_ESTUDIO;
}

/** ¿El contador debe decir «Ilimitadas» en vez de «usadas/límite»? */
export function consultasIlimitadas(plan?: string | null): boolean {
    return esEstudio(plan);
}

/**
 * El cupo, como se enseña: «Ilimitadas» en Estudio, «∞» con el −1 heredado
 * (ningún perfil lo tiene hoy, pero las pantallas ya lo contemplaban) y la
 * cifra en los demás.
 */
export function textoDelCupo(plan: string | null | undefined, limite: number | null | undefined): string {
    if (consultasIlimitadas(plan)) return 'Ilimitadas';
    if (limite === -1) return '∞';
    return String(limite ?? 0);
}

/** ¿Ya pasó de las 560 de élite este periodo? Lo decide la API; esto lo dice. */
export function pasoDeLaElite(plan: string | null | undefined, usadas: number | null | undefined): boolean {
    return esEstudio(plan) && (usadas ?? 0) >= CONSULTAS_ELITE_ESTUDIO;
}
