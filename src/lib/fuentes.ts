/* ═══ EL SELECTOR DE FUENTES (23-sep-2026) ═══════════════════════════════
   David: «desde el lado izquierdo del chat habrá un botón con fuentes; cuando
   se presione se desplegará Bloque de constitucionalidad (logo de la CIDH),
   Jurisprudencia nacional (logo SCJN), Leyes federales (logo Congreso de la
   Unión) y Leyes estatales (el escudo de la entidad que, desde el inicio,
   selecciona el abogado). Si selecciona dos obtendrá datos de dos fuentes; si
   selecciona una, sólo de una; si selecciona todas, de todas».

   Nace del reporte de un magistrado (folio 1033): pedía fuero federal y le
   seguían llegando leyes de Hidalgo, la entidad de su perfil. El filtro
   «Fuero» existía, escondido tras «Desplegar herramientas», y aun encendido
   el servidor dejaba pasar lo estatal por seis caminos. El servidor ya no
   deja pasar nada de lo apagado (fuentes_elegidas.py en la API); esto es la
   mitad de la pantalla.

   SE GUARDA EN EL NAVEGADOR y se lee al enviar, igual que el globo: son
   varios los sitios que llaman al chat y un dato que cada uno tenga que
   acordarse de pasar es un dato que alguno perderá en silencio. Y a
   diferencia del globo, NO se apaga al recargar: quien trabaja sólo con
   derecho federal lo decide una vez, no en cada visita.

   NUNCA QUEDA VACÍO. Sin fuentes no hay consulta; si algo intenta apagarlas
   todas, vuelven las cuatro. */

export type Fuente = 'constitucional' | 'jurisprudencia' | 'federal' | 'estatal';

export const FUENTES: readonly Fuente[] = ['constitucional', 'jurisprudencia', 'federal', 'estatal'];

const CLAVE = 'iurexia-fuentes';

/** Lo dispara `guardarFuentes`: otras piezas de la pantalla pueden escucharlo. */
export const EVENTO_FUENTES = 'iurexia:fuentes';

function depurar(lista: unknown): Fuente[] {
    const validas = Array.isArray(lista) ? FUENTES.filter((f) => lista.includes(f)) : [];
    return validas.length ? validas : [...FUENTES];
}

export function fuentesElegidas(): Fuente[] {
    try {
        const crudo = localStorage.getItem(CLAVE);
        return crudo ? depurar(JSON.parse(crudo)) : [...FUENTES];
    } catch {
        return [...FUENTES];
    }
}

export function guardarFuentes(lista: Fuente[]): Fuente[] {
    const final = depurar(lista);
    try { localStorage.setItem(CLAVE, JSON.stringify(final)); } catch { /* ventana privada */ }
    try { window.dispatchEvent(new CustomEvent(EVENTO_FUENTES, { detail: final })); } catch { /* sin ventana */ }
    return final;
}

export function todasLasFuentes(lista: readonly Fuente[]): boolean {
    return FUENTES.every((f) => lista.includes(f));
}

/* ── LOS ESCUDOS ────────────────────────────────────────────────────────
   Los 32, de Wikimedia Commons, todos en dominio público (descargados el
   23-sep-2026 a 128 px; p. ej. «Coat of arms of Hidalgo.svg»). Se nombran
   por la clave de `ESTADOS_MEXICO` en guiones: HIDALGO → hidalgo.png,
   CIUDAD_DE_MEXICO → ciudad-de-mexico.png, MEXICO → mexico.png.

   Los perfiles viejos guardan la entidad de otras maneras —«CDMX», «EDOMEX»,
   «Nuevo León»—, así que la clave se normaliza antes de buscarla. */
const ESCUDOS = new Set([
    'AGUASCALIENTES', 'BAJA_CALIFORNIA', 'BAJA_CALIFORNIA_SUR', 'CAMPECHE', 'CHIAPAS',
    'CHIHUAHUA', 'CIUDAD_DE_MEXICO', 'COAHUILA', 'COLIMA', 'DURANGO', 'GUANAJUATO',
    'GUERRERO', 'HIDALGO', 'JALISCO', 'MEXICO', 'MICHOACAN', 'MORELOS', 'NAYARIT',
    'NUEVO_LEON', 'OAXACA', 'PUEBLA', 'QUERETARO', 'QUINTANA_ROO', 'SAN_LUIS_POTOSI',
    'SINALOA', 'SONORA', 'TABASCO', 'TAMAULIPAS', 'TLAXCALA', 'VERACRUZ', 'YUCATAN',
    'ZACATECAS',
]);

const ALIAS: Record<string, string> = {
    CDMX: 'CIUDAD_DE_MEXICO',
    DISTRITO_FEDERAL: 'CIUDAD_DE_MEXICO',
    EDOMEX: 'MEXICO',
    ESTADO_DE_MEXICO: 'MEXICO',
    NL: 'NUEVO_LEON',
    COAHUILA_DE_ZARAGOZA: 'COAHUILA',
    MICHOACAN_DE_OCAMPO: 'MICHOACAN',
    VERACRUZ_DE_IGNACIO_DE_LA_LLAVE: 'VERACRUZ',
};

export function claveEntidad(estado?: string | null): string | null {
    if (!estado) return null;
    const k = estado
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim().toUpperCase().replace(/[\s-]+/g, '_');
    const clave = ALIAS[k] ?? k;
    return ESCUDOS.has(clave) ? clave : null;
}

/** La ruta del escudo de la entidad, o null si no hay entidad reconocible. */
export function escudoDe(estado?: string | null): string | null {
    const clave = claveEntidad(estado);
    return clave ? `/escudos/${clave.toLowerCase().replace(/_/g, '-')}.png` : null;
}

/* ── LO QUE LA CONSULTA RECORRIÓ ─────────────────────────────────────────
   El servidor lo informa en el paso «buscar»: «federal,jurisprudencia,
   estatal=HIDALGO» (o «estatal=32» si abrió todas las entidades). Llega una
   vez por búsqueda y una consulta hace varias, así que se juntan. */
export interface Recorrido {
    fuentes: Fuente[];
    /** La entidad, si se recorrió exactamente una; el número si fueron varias. */
    entidad: string | null;
    entidades: number;
}

export function leerRecorrido(detalle?: string | null): Recorrido | null {
    // Formato viejo —sólo un número— o vacío: no dice qué se recorrió.
    if (!detalle || !/[a-z]/i.test(detalle)) return null;
    const r: Recorrido = { fuentes: [], entidad: null, entidades: 0 };
    for (const t of detalle.split(',')) {
        const [k, v] = t.trim().split('=');
        if (k === 'estatal') {
            if (!r.fuentes.includes('estatal')) r.fuentes.push('estatal');
            if (v && /^\d+$/.test(v)) r.entidades = Math.max(r.entidades, Number(v));
            else if (v) { r.entidad = v; r.entidades = Math.max(r.entidades, 1); }
        } else if ((FUENTES as readonly string[]).includes(k) && !r.fuentes.includes(k as Fuente)) {
            r.fuentes.push(k as Fuente);
        }
    }
    r.fuentes = FUENTES.filter((f) => r.fuentes.includes(f));
    if (r.entidades > 1) r.entidad = null;
    return r;
}

export function unirRecorrido(a: string, b: string): string {
    const ra = leerRecorrido(a);
    const rb = leerRecorrido(b);
    if (!ra || !rb) return b;
    const fuentes = FUENTES.filter((f) => ra.fuentes.includes(f) || rb.fuentes.includes(f));
    const entidadesDistintas = new Set([ra.entidad, rb.entidad].filter(Boolean)).size;
    const n = Math.max(ra.entidades, rb.entidades, entidadesDistintas);
    const entidad = n <= 1 ? (ra.entidad || rb.entidad) : null;
    return fuentes
        .map((f) => (f !== 'estatal' ? f : entidad ? `estatal=${entidad}` : n ? `estatal=${n}` : 'estatal'))
        .join(',');
}
