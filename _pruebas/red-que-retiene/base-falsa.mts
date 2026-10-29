/**
 * Un Supabase de mentira, en memoria, para las pruebas de la red que retiene.
 *
 * Una sola base para los dos lados: el código REAL del front (`respuestas-
 * servidor.ts`, `conversations.ts`) la usa con un cliente que imita a
 * supabase-js, y la API REAL (servidor_api.py) le manda sus consultas por
 * HTTP. Sólo implementa lo que esos dos usan, con la semántica de PostgREST:
 * filtros eq/neq/is/in/lt/gt/gte/lte, orden, límite, count, single y
 * maybeSingle, insert/upsert/update/delete con `select` de vuelta.
 *
 * Las horas van con microsegundos, como las devuelve Postgres: la respuesta
 * que la recuperación pone «1 ms detrás» de su pregunta se prueba con la misma
 * precisión que en producción.
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';

export type Fila = Record<string, any>;

export interface Consulta {
    tabla: string;
    op: 'select' | 'insert' | 'upsert' | 'update' | 'delete' | 'rpc';
    columnas?: string;
    filtros: [string, string, any][];
    orden?: [string, boolean];
    limite?: number;
    uno?: 'single' | 'maybe';
    contar?: boolean;
    cabeza?: boolean;
    devolver?: boolean;
    valores?: Fila | Fila[];
    enConflicto?: string;
    args?: any;
}

export interface Resultado { data: any; error: { message: string } | null; count?: number | null }

const LLAVES: Record<string, string> = { respuestas_chat: 'peticion_id' };
const ES_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

/** Microsegundos desde 1970 de una hora ISO, sin perder los micro. */
export function micro(iso: string): bigint {
    const m = /^(.*T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})$/.exec(iso);
    if (!m) throw new Error(`hora ilegible: ${iso}`);
    const segundos = BigInt(Date.parse(`${m[1]}${m[3]}`)) * 1000n;
    const frac = (m[2] || '').padEnd(6, '0').slice(0, 6);
    return segundos + BigInt(frac);
}

let ultimo = 0n;
/** `now()` de Postgres: con microsegundos y siempre creciente. */
export function ahora(desfaseMs = 0): string {
    let us = BigInt(Date.now() + desfaseMs) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    if (desfaseMs === 0) { if (us <= ultimo) us = ultimo + 1n; ultimo = us; }
    const ms = Number(us / 1000n);
    const base = new Date(ms).toISOString().slice(0, 19);
    return `${base}.${(us % 1_000_000n).toString().padStart(6, '0')}+00:00`;
}

function comparar(a: any, b: any): number {
    if (typeof a === 'string' && typeof b === 'string' && ES_HORA.test(a) && ES_HORA.test(b)) {
        const x = micro(a), y = micro(b);
        return x < y ? -1 : x > y ? 1 : 0;
    }
    return a < b ? -1 : a > b ? 1 : 0;
}

function cumple(f: Fila, [col, op, v]: [string, string, any]): boolean {
    const x = f[col];
    switch (op) {
        case 'eq': return x !== null && x !== undefined && comparar(x, v) === 0;
        case 'neq': return x !== null && x !== undefined && comparar(x, v) !== 0;
        case 'is': return v === null ? x === null || x === undefined : x === v;
        case 'in': return (v as any[]).some((y) => comparar(x, y) === 0);
        case 'lt': return x != null && comparar(x, v) < 0;
        case 'gt': return x != null && comparar(x, v) > 0;
        case 'gte': return x != null && comparar(x, v) >= 0;
        case 'lte': return x != null && comparar(x, v) <= 0;
        default: throw new Error(`filtro no implementado: ${op}`);
    }
}

function proyectar(f: Fila, columnas?: string): Fila {
    if (!columnas || columnas.trim() === '*') return { ...f };
    const salida: Fila = {};
    for (const c of columnas.split(',').map((s) => s.trim()).filter(Boolean)) salida[c] = f[c] ?? null;
    return salida;
}

export class BaseDeDatos {
    tablas: Record<string, Fila[]> = {};
    rpcs: Record<string, (args: any) => any> = {};
    /** Cada consulta, por si la prueba quiere contarlas. */
    bitacora: Consulta[] = [];

    filas(tabla: string): Fila[] {
        if (!this.tablas[tabla]) this.tablas[tabla] = [];
        return this.tablas[tabla];
    }

    completar(tabla: string, f: Fila): Fila {
        const n = { ...f };
        if (tabla === 'messages' || tabla === 'conversations') n.id ??= randomUUID();
        if (tabla === 'messages') n.created_at ??= ahora();
        if (tabla === 'conversations') { n.created_at ??= ahora(); n.updated_at ??= ahora(); }
        if (tabla === 'respuestas_chat') {
            n.creada_at ??= ahora();
            for (const c of ['conversation_id', 'expediente_id', 'estado_mx', 'respuesta', 'terminada_at', 'guardada_at']) n[c] ??= null;
            n.estado ??= 'en_curso';
            n.pregunta ??= '';
        }
        return n;
    }

    ejecutar(c: Consulta): Resultado {
        this.bitacora.push(c);
        try {
            return this.ejecutarSinBitacora(c);
        } catch (e) {
            return { data: null, error: { message: (e as Error).message } };
        }
    }

    ejecutarSinBitacora(c: Consulta): Resultado {
        if (c.op === 'rpc') {
            const fn = this.rpcs[c.tabla];
            if (!fn) return { data: null, error: { message: `rpc desconocida: ${c.tabla}` } };
            return { data: fn(c.args), error: null };
        }
        const filas = this.filas(c.tabla);
        const llave = LLAVES[c.tabla] ?? 'id';
        let afectadas: Fila[] = [];

        if (c.op === 'insert' || c.op === 'upsert') {
            const nuevas = (Array.isArray(c.valores) ? c.valores : [c.valores ?? {}]);
            for (const v of nuevas) {
                const conflicto = c.enConflicto || llave;
                const previa = v[conflicto] != null ? filas.find((f) => f[conflicto] === v[conflicto]) : undefined;
                if (previa && c.op === 'insert') return { data: null, error: { message: `duplicate key ${conflicto}` } };
                if (previa) { Object.assign(previa, v); afectadas.push(previa); continue; }
                const f = this.completar(c.tabla, v);
                filas.push(f);
                afectadas.push(f);
            }
        } else {
            afectadas = filas.filter((f) => c.filtros.every((x) => cumple(f, x)));
            if (c.op === 'update') afectadas.forEach((f) => Object.assign(f, c.valores));
            if (c.op === 'delete') this.tablas[c.tabla] = filas.filter((f) => !afectadas.includes(f));
        }

        if (c.op !== 'select' && !c.devolver) return { data: null, error: null };
        let salida = [...afectadas];
        const count = c.contar ? salida.length : null;
        if (c.orden) {
            const [col, asc] = c.orden;
            salida.sort((a, b) => comparar(a[col], b[col]) * (asc ? 1 : -1));
        }
        if (c.limite != null) salida = salida.slice(0, c.limite);
        if (c.cabeza) return { data: null, error: null, count };
        const datos = salida.map((f) => proyectar(f, c.columnas));
        if (c.uno === 'single') {
            if (datos.length !== 1) return { data: null, error: { message: `single: ${datos.length} filas` }, count };
            return { data: datos[0], error: null, count };
        }
        if (c.uno === 'maybe') {
            if (datos.length > 1) return { data: null, error: { message: `maybeSingle: ${datos.length} filas` }, count };
            return { data: datos[0] ?? null, error: null, count };
        }
        return { data: datos, error: null, count };
    }
}

/* ── El cliente que imita a supabase-js ─────────────────────────────────── */

class Constructor {
    ejecutar: (c: Consulta) => Promise<Resultado>;
    c: Consulta;

    constructor(ejecutar: (c: Consulta) => Promise<Resultado>, tabla: string) {
        this.ejecutar = ejecutar;
        this.c = { tabla, op: 'select', filtros: [] };
    }
    select(columnas = '*', opciones?: { count?: string; head?: boolean }) {
        if (this.c.op === 'select') {
            this.c.columnas = columnas;
            this.c.contar = opciones?.count === 'exact';
            this.c.cabeza = !!opciones?.head;
        } else {
            this.c.devolver = true;
            this.c.columnas = columnas;
        }
        return this;
    }
    insert(valores: Fila | Fila[]) { this.c.op = 'insert'; this.c.valores = valores; return this; }
    upsert(valores: Fila | Fila[], o?: { onConflict?: string }) {
        this.c.op = 'upsert'; this.c.valores = valores; this.c.enConflicto = o?.onConflict; return this;
    }
    update(valores: Fila) { this.c.op = 'update'; this.c.valores = valores; return this; }
    delete() { this.c.op = 'delete'; return this; }
    eq(col: string, v: any) { this.c.filtros.push([col, 'eq', v]); return this; }
    neq(col: string, v: any) { this.c.filtros.push([col, 'neq', v]); return this; }
    is(col: string, v: any) { this.c.filtros.push([col, 'is', v]); return this; }
    in(col: string, v: any[]) { this.c.filtros.push([col, 'in', v]); return this; }
    lt(col: string, v: any) { this.c.filtros.push([col, 'lt', v]); return this; }
    gt(col: string, v: any) { this.c.filtros.push([col, 'gt', v]); return this; }
    gte(col: string, v: any) { this.c.filtros.push([col, 'gte', v]); return this; }
    lte(col: string, v: any) { this.c.filtros.push([col, 'lte', v]); return this; }
    order(col: string, o?: { ascending?: boolean }) { this.c.orden = [col, o?.ascending !== false]; return this; }
    limit(n: number) { this.c.limite = n; return this; }
    single() { this.c.uno = 'single'; return this; }
    maybeSingle() { this.c.uno = 'maybe'; return this; }
    then<A, B>(res?: (r: Resultado) => A, rej?: (e: unknown) => B) {
        return this.ejecutar(structuredClone(this.c)).then(res, rej);
    }
}

export interface Sesion { access_token: string; user: { id: string; email?: string } }

export function crearCliente(ejecutar: (c: Consulta) => Promise<Resultado>, sesion: Sesion) {
    return {
        from: (tabla: string) => new Constructor(ejecutar, tabla),
        rpc: (funcion: string, args: any) => ejecutar({ tabla: funcion, op: 'rpc', filtros: [], args }),
        auth: {
            getSession: async () => ({ data: { session: sesion }, error: null }),
            getUser: async () => ({ data: { user: sesion.user }, error: null }),
        },
    };
}

/** La base, servida por HTTP para la API (POST /consulta con una `Consulta`). */
export function servirPorHttp(bd: BaseDeDatos, usuarios: Record<string, string>): Promise<{ puerto: number; cerrar: () => void }> {
    const servidor = http.createServer((req, res) => {
        let cuerpo = '';
        req.on('data', (d) => { cuerpo += d; });
        req.on('end', () => {
            let salida: unknown;
            try {
                const c = JSON.parse(cuerpo);
                if (req.url === '/usuario') salida = { id: usuarios[c.token] ?? null };
                else salida = bd.ejecutar(c as Consulta);
            } catch (e) {
                salida = { data: null, error: { message: (e as Error).message } };
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(salida));
        });
    });
    return new Promise((resolve) => servidor.listen(0, '127.0.0.1', () => {
        const dir = servidor.address();
        resolve({ puerto: typeof dir === 'object' && dir ? dir.port : 0, cerrar: () => servidor.close() });
    }));
}
