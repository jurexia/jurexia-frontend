/* ═══ EL PERFIL DEL DESPACHO (28-sep-2026) ════════════════════════════════
   Lo que el abogado escribe igual en todos sus escritos —con qué nombre y
   cédula firma, el domicilio para oír notificaciones, sus autorizados, su
   ciudad— y el modelo no puede saber. Sin esto cada escrito llegaba con los
   mismos [DATO PENDIENTE] y el abogado los llenaba a mano cada vez.

   SE GUARDA EN LA CUENTA, en `user_metadata` de Supabase: viaja con la
   sesión, sirve en cualquier navegador y no pide tablas nuevas. La pantalla
   lo fija al iniciar sesión (AuthProvider) y viaja en cada consulta como
   campo `despacho`; el servidor sólo lo usa al redactar
   (`bloque_despacho` en esfuerzo_redaccion.py del API, que vuelve a
   recortar cada campo a su tope).

   EL ROL decide el registro cuando el encargo es ambiguo: quien trabaja en un
   juzgado redacta resoluciones; quien litiga, escritos de parte. */

export type RolDespacho = 'postulante' | 'jurisdiccional' | 'autoridad' | 'otro';

export interface Despacho {
    rol?: RolDespacho;
    nombre?: string;
    cedula?: string;
    domicilio?: string;
    contacto?: string;
    autorizados?: string;
    ciudad?: string;
}

export type CampoDespacho = Exclude<keyof Despacho, 'rol'>;

/** Los mismos topes que el servidor (`DESPACHO_TOPES`). */
export const TOPES_DESPACHO: Record<CampoDespacho, number> = {
    nombre: 120,
    cedula: 40,
    domicilio: 300,
    contacto: 160,
    autorizados: 400,
    ciudad: 80,
};

export const ROLES_DESPACHO: ReadonlyArray<{ valor: RolDespacho; etiqueta: string; detalle: string }> = [
    { valor: 'postulante', etiqueta: 'Abogado postulante', detalle: 'Ante la duda, escritos de parte: demandas, recursos, promociones.' },
    { valor: 'jurisdiccional', etiqueta: 'Órgano jurisdiccional', detalle: 'Ante la duda, resoluciones: proyectos, considerandos, estudios de fondo.' },
    { valor: 'autoridad', etiqueta: 'Autoridad', detalle: 'Voz institucional: informes, oficios, recursos de la autoridad.' },
    { valor: 'otro', etiqueta: 'Otro', detalle: 'Decide el encargo.' },
];

/** Cada campo en un renglón, sin blancos de sobra y recortado a su tope;
 *  sin nada que guardar, null. Lo que no es un campo conocido se ignora. */
export function normalizarDespacho(x: unknown): Despacho | null {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
    const o = x as Record<string, unknown>;
    const d: Despacho = {};
    for (const campo of Object.keys(TOPES_DESPACHO) as CampoDespacho[]) {
        const v = typeof o[campo] === 'string' ? (o[campo] as string).split(/\s+/).join(' ').trim() : '';
        if (v) d[campo] = v.slice(0, TOPES_DESPACHO[campo]);
    }
    if (ROLES_DESPACHO.some((r) => r.valor === o.rol)) d.rol = o.rol as RolDespacho;
    return Object.keys(d).length ? d : null;
}

/* El que está vigente en esta pestaña: lo fija la sesión y lo lee el envío.
   Este módulo no toca Supabase (lo importa `api.ts`, que se prueba en Node):
   guardar en la cuenta lo hace el formulario del perfil. */
let vigente: Despacho | null = null;

export function fijarDespacho(x: unknown): void {
    vigente = normalizarDespacho(x);
}

/** Lo que viaja en el request; `undefined` sin perfil. */
export function despachoParaEnviar(): Despacho | undefined {
    return vigente ?? undefined;
}
