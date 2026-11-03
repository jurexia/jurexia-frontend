/**
 * LA ATENCIÓN AUTOMÁTICA DE SOPORTE (2-nov-2026), sin red: el clasificador con
 * mensajes reales, las ocho plantillas, el diagnóstico con una base, un cobro y
 * un Resend de mentira, el cron, y la ruta REAL con sus clientes sustituidos.
 *
 *   1. El clasificador contra 375 mensajes reales de soporte, en tres juegos
 *      (ver los _LEEME de cada JSON): la tasa de cada uno y los errores que
 *      mandarían una plantilla a quien necesitaba a una persona.
 *   2. Las plantillas: se pintan todas sus variantes; ni proveedores, ni
 *      personas, ni precios, ni tuteo, ni promesas con fecha; hash estable;
 *      la semilla de la migración es su texto exacto.
 *   3. El diagnóstico: el reloj adelantado (ráfaga de renovaciones), la sesión
 *      que no se renueva, el pago no reflejado en sus cinco formas, la
 *      respuesta cortada, el documento y la cancelación. Y que sólo LEE.
 *   4. El cron: en simulacro no le escribe a nadie; en «enviar» no manda una
 *      plantilla sin aprobar; con aprobación manda UNO por caso y por persona.
 *   5. La ruta /api/cron/atencion tal cual, con Supabase y Resend de mentira.
 *
 * Cualquier fetch revienta la prueba: no se llama a modelos, ni a Resend, ni
 * a Supabase, ni al cobro.
 *
 * USO   node _pruebas/atencion-automatica/prueba.mts      (Node 22.18+, que quita los tipos solo)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');

// «@/lib/x» → src/lib/x.ts, y lo que Next importa sin extensión, con .ts.
// Supabase y Resend, por los de la prueba (los toma de globalThis).
register('data:text/javascript,' + encodeURIComponent(`
const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ + '/').href)};
const FALSOS = {
    '@supabase/supabase-js': 'export function createClient() { return globalThis.__sbFalso; }',
    'resend': 'export class Resend { constructor(clave) { (globalThis.__resends ||= []).push(clave); this.emails = { send: (...a) => globalThis.__enviar(...a) }; } }',
};
export async function resolve(spec, ctx, next) {
    if (FALSOS[spec]) return { url: 'data:text/javascript,' + encodeURIComponent(FALSOS[spec]), shortCircuit: true };
    if (spec.startsWith('@/')) spec = RAIZ + 'src/' + spec.slice(2);
    try { return await next(spec, ctx); }
    catch (e) {
        const extensiones = /^(\\.|\\/|file:)/.test(spec) ? ['.ts', '.tsx', '/index.ts'] : ['.js'];
        for (const ext of extensiones) { try { return await next(spec + ext, ctx); } catch {} }
        throw e;
    }
}`));

globalThis.fetch = (async (url: unknown) => { throw new Error(`la prueba no sale a la red: ${String(url)}`); }) as typeof fetch;

const reglas = await import('../../src/lib/soporte/diagnostico-reglas.ts');
const { diagnosticar } = await import('../../src/lib/soporte/diagnostico.ts');
const P = await import('../../src/lib/soporte/plantillas-atencion.ts');
const A = await import('../../src/lib/soporte/atencion-automatica.ts');

let pasadas = 0;
const prueba = async (nombre: string, f: () => void | Promise<void>) => {
    try { await f(); pasadas++; console.log(`  ok  ${nombre}`); }
    catch (e) { console.error(`  MAL ${nombre}\n`, e); process.exitCode = 1; }
};

/* ═══════════════════ 1. el clasificador, con mensajes reales ═══════════════════ */

console.log('el clasificador');
type Mensaje = { texto: string; tipo: string; fuente: string };
const juego = (archivo: string) => (JSON.parse(readFileSync(path.join(AQUI, archivo), 'utf8')) as { mensajes: Mensaje[] }).mensajes;
const CON_PLANTILLA = new Set(['consulta-juridica', 'como-se-usa', 'contratar', 'pago', 'acceso', 'respuesta-cortada', 'documento', 'cancelar']);

function medir(mensajes: Mensaje[]) {
    let bien = 0;
    const peligrosos: string[] = [];
    const confusion = new Map<string, number>();
    for (const m of mensajes) {
        const dio = reglas.clasificar(m.texto).tipo;
        if (dio === m.tipo) bien++;
        else confusion.set(`${m.tipo} → ${dio}`, (confusion.get(`${m.tipo} → ${dio}`) ?? 0) + 1);
        // Peligroso: le saldría una plantilla a quien necesitaba a una persona.
        if (m.tipo === 'humano' && CON_PLANTILLA.has(dio)) peligrosos.push(`${dio}: ${m.texto.slice(0, 80)}`);
    }
    return { bien, total: mensajes.length, tasa: bien / mensajes.length, peligrosos, confusion };
}

/* LO HONESTO (2-nov-2026). Las reglas se escribieron mirando `mensajes-reales`
   (30 días). Contra `mensajes-control` (31–75 días), que NO se había mirado,
   dieron 45/93 = 48.4 %; contra `mensajes-ciegos` (más de 75 días), 67/115 =
   58.3 %, con 2 cancelaciones que fallaban contestadas como «cancelar». Con lo
   aprendido de esos dos juegos se generalizaron las reglas (no se tocaron las
   etiquetas), y ahora los tres son de entrenamiento —98.8 %, 94.6 % y 93.0 %—:
   estos mínimos sólo cuidan que no se vuelva atrás. La tasa fuera de muestra a
   esperar es la de arriba, y por eso nada sale solo sin el visto bueno de David
   y sin pasar por el simulacro. */
const JUEGOS: Array<[string, number]> = [['mensajes-reales.json', 0.95], ['mensajes-control.json', 0.9], ['mensajes-ciegos.json', 0.9]];
const totales = { bien: 0, total: 0, peligrosos: 0 };
for (const [archivo, minimo] of JUEGOS) {
    await prueba(`${archivo}: al menos ${Math.round(minimo * 100)} % y ninguna plantilla a quien necesitaba una persona por cobro o cancelación`, () => {
        const r = medir(juego(archivo));
        totales.bien += r.bien; totales.total += r.total; totales.peligrosos += r.peligrosos.length;
        console.log(`        ${r.bien}/${r.total} = ${(100 * r.tasa).toFixed(1)} % · enviaría plantilla a ${r.peligrosos.length} que necesitaban una persona`
            + (r.peligrosos.length ? `\n          ${r.peligrosos.join('\n          ')}` : ''));
        assert.ok(r.tasa >= minimo, `tasa ${r.tasa}`);
        assert.ok(!r.peligrosos.some(p => /^(pago|cancelar|acceso):/.test(p)), r.peligrosos.join('\n'));
    });
}
await prueba('al menos 30 mensajes reales por juego (pedido del 2-nov)', () => {
    for (const [archivo] of JUEGOS) assert.ok(juego(archivo).length >= 30, archivo);
});

await prueba('el folio del chat de soporte tomado por un «código» (caso del 2-nov): T1 con la nota del folio', () => {
    const c = reglas.clasificar('me dieron un numero de codigo pero no dice donde debo anexarlo');
    assert.equal(c.tipo, 'consulta-juridica');
    assert.equal(c.marcas.folio, true);
});
await prueba('un escrito pegado no dispara reglas de la cuenta: «falta de pago de rentas» es jurídico', () => {
    const escrito = 'C. JUEZ DE LO CIVIL. Que por medio del presente escrito vengo a demandar la rescisión del contrato de arrendamiento '
        + 'por falta de pago de rentas, así como el pago de las rentas vencidas y la desocupación del inmueble, con fundamento en el '
        + 'artículo 2489 del Código Civil, toda vez que el arrendatario no ha pagado desde el mes de junio y ya pagué yo el predial.';
    assert.equal(reglas.clasificar(escrito).tipo, 'consulta-juridica');
    // Y si alrededor dice que su documento falló, manda lo de alrededor.
    assert.equal(reglas.clasificar(`${escrito} ${escrito}\nadjunte el pdf y me marca error`).tipo, 'documento');
});
await prueba('«no me deja cancelar», «cancelen ese cobro que no autoricé»: una persona, nunca el instructivo', () => {
    for (const t of ['no me permite cancelar mi suscripción', 'quiero cancelar la suscripción y no me deja',
        'noté que me están cobrando otra vez, no lo autoricé, cancelen ese cobro', 'me causaron un daño al cancelar mi tarjeta']) {
        assert.equal(reglas.clasificar(t).tipo, 'humano', t);
    }
    assert.equal(reglas.clasificar('Como puedo cancelar mi suscripocion mensual?').tipo, 'cancelar');
});
await prueba('pagar sin tarjeta y pedir WhatsApp quedan marcados para T3', () => {
    const c = reglas.clasificar('quiero contratar el plan pro pero no tengo tarjeta, puedo pagar por transferencia? tienen whatsapp?');
    assert.equal(c.tipo, 'contratar');
    assert.equal(c.marcas.sinTarjeta, true);
    assert.equal(c.marcas.contacto, true);
});

/* ═══════════════════ 2. las plantillas ═══════════════════ */

console.log('las plantillas');
const IDS = Object.keys(P.PLANTILLAS) as Array<keyof typeof P.PLANTILLAS>;
const COMUNES = { folio: '4126-02', saludo: P.saludoPara('Ana Robles', 'licenciada'), fecha_reporte: '2026-11-02T18:30:00Z' };
const MUESTRA: Record<string, string | number | string[]> = {
    consultas_restantes: 3, plan: 'Pro', correo_oculto: 'ana•••••@gmail.com', desfase: 'unas 9 horas adelantado',
    fecha_consulta: '2026-11-02T17:39:00Z', hojas_documento: 31, hojas_plan: 20, fin_periodo: '2026-11-24T06:00:00Z',
};

/** Todas las combinaciones que puede pintar una plantilla: cada opción de cada fragmento. */
function variantes(id: keyof typeof P.PLANTILLAS) {
    const p = P.PLANTILLAS[id];
    const salida: Array<Record<string, string | number | string[]>> = [];
    const fragmentos = Object.entries(p.variables).filter(([, d]) => d.tipo === 'fragmento' || d.tipo === 'fragmentos');
    const base: Record<string, string | number | string[]> = { ...COMUNES };
    for (const [k, d] of Object.entries(p.variables)) {
        if (d.tipo === 'fragmentos') base[k] = P.opcionesDe(p, k);
        else if (d.tipo === 'fragmento') base[k] = P.opcionesDe(p, k)[0] ?? '';
        else if (k in MUESTRA) base[k] = MUESTRA[k];
    }
    salida.push(base);
    for (const [k, d] of fragmentos) {
        if (d.tipo !== 'fragmento') continue;
        for (const opcion of P.opcionesDe(p, k)) salida.push({ ...base, [k]: opcion });
        if (d.opcional) salida.push({ ...base, [k]: '' });
    }
    return salida;
}

const PROHIBIDO = /openrouter|google|gemini|openai|azure|supabase|vercel|qdrant|stripe|resend|anthropic|claude|\bgpt|\brender\b|cisco|umbrella|david|alc[aá]ntar|fundador|creador|\bdirector\b/i;
const PRECIO = /\$\s?\d|\bpesos\b|\bmxn\b|\d+\s?(al mes|mensuales|anuales)\b/i;
/** Una acción de una persona con plazo («le escribiremos mañana», «en 24 horas»). «Los avisos salen cada mañana» es un dato, no una promesa. */
const PROMESA_CON_FECHA = /\b(a más tardar|en breve|hoy mismo|en las próximas|dentro de (\d+|unas?|pocas) (horas|días)|en (\d+|unas?|pocas) (horas|días)|(escribiremos|responderemos|contestaremos|enviaremos|llamaremos|resolveremos|activaremos)\b.{0,30}\b(hoy|mañana|esta semana))\b/i;
/** Tuteo fuera de las comillas «»: lo que va entre comillas es el nombre de un botón («¿Olvidaste tu contraseña?»).
 *  Sólo formas que no pueden ser tercera persona («la cita abre su fuente» no es tuteo). */
const TUTEO = /\b(tú|tienes|puedes|quieres|necesitas|estás|tu (cuenta|correo|plan|consulta|documento|pago|suscripción)|te (escribimos|ayudamos|recomendamos|pedimos))\b/i;

await prueba('las 8 plantillas pintan todas sus variantes, sin variables sueltas', () => {
    let n = 0;
    for (const id of IDS) for (const v of variantes(id)) {
        const c = P.pintar(id, v);
        n++;
        for (const parte of [c.asunto, c.html, c.texto]) assert.doesNotMatch(parte, /\{\{|\}\}/, `${id}: quedó una variable`);
        assert.match(c.asunto, /\bfolio 4126-02\b/, `${id}: el asunto lleva el folio (así lo reconoce Atencion.gs)`);
    }
    assert.ok(n >= 40, `sólo ${n} variantes`);
});
await prueba('ni proveedores, ni personas, ni precios, ni tuteo, ni promesas con fecha; firma «Soporte de Iurexia»', () => {
    for (const id of IDS) for (const v of variantes(id)) {
        const c = P.pintar(id, v);
        const todo = `${c.asunto}\n${c.texto}`;
        assert.doesNotMatch(todo, PROHIBIDO, `${id}: nombra a quien no debe`);
        assert.doesNotMatch(c.html.replace(/https:\/\/ukcuzhwmmfwvcedvhfll\.supabase\.co[^"]+/g, ''), PROHIBIDO, `${id}: HTML`);
        assert.doesNotMatch(todo, PRECIO, `${id}: lleva un precio`);
        assert.doesNotMatch(todo, PROMESA_CON_FECHA, `${id}: promete con fecha`);
        assert.doesNotMatch(todo.replace(/«[^»]*»/g, ''), TUTEO, `${id}: tutea`);
        assert.match(c.texto, /Atentamente,\nSoporte de Iurexia/, `${id}: firma`);
        assert.match(c.html, /text-align:justify/, `${id}: párrafos justificados`);
        assert.match(c.html, /logo-iurexia-correo\.png/, `${id}: logotipo`);
    }
    assert.equal(P.REMITENTE_ATENCION, 'Soporte de Iurexia <soporte@iurexia.com>');
    assert.equal(P.RESPONDER_A, 'soporte@iurexia.com');
});
await prueba('los enlaces van sólo a iurexia.com', () => {
    for (const id of IDS) for (const v of variantes(id)) {
        const html = P.pintar(id, v).html;
        const enlaces = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
        for (const e of enlaces) assert.match(e, /^https:\/\/www\.iurexia\.com(\/|$)/, `${id}: ${e}`);
    }
});
await prueba('sha256: 64 hex, estable, distinto en cada plantilla, y cambia si cambia una coma', () => {
    const hs = P.huellas();
    assert.equal(new Set(hs.map(h => h.sha256)).size, 8);
    for (const h of hs) assert.match(h.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(P.huellas(), hs);
    const t1 = P.PLANTILLAS.T1;
    const otra = { ...t1, cuerpo: t1.cuerpo.replace('Ir a la caja de consulta', 'Ir a la caja de consulta.') };
    assert.notEqual(P.huella(otra).sha256, P.huella(t1).sha256);
});
await prueba('la semilla de la migración es el texto canónico exacto, con su hash', () => {
    const sql = readFileSync(path.join(RAIZ, 'supabase_atencion_automatica.sql'), 'utf8');
    for (const id of IDS) {
        const p = P.PLANTILLAS[id];
        const etiqueta = `$plantilla_${id}_v${p.version}$`;
        assert.ok(sql.includes(`'${id}', ${p.version}, '${P.huella(p).sha256}', ${etiqueta}${P.textoCanonico(p)}${etiqueta}`),
            `${id}: la semilla no es la actual (node scripts/atencion-vistas-previas.mts --migracion)`);
    }
    // Lo que se ejecuta (hasta el commit, sin comentarios) no aprueba nada: aprobar es a mano.
    const ejecutable = sql.split('\ncommit;')[0].replace(/--[^\n]*/g, '');
    assert.doesNotMatch(ejecutable, /aprobada_at\s*=\s*now\(\)|aprobada_por\s*=/, 'la migración no aprueba nada sola');
    assert.match(sql, /insert into public\.plantillas_soporte \(id, version, sha256, texto\) values/);
});
await prueba('los capítulos del tutorial son los de TutorialNuevoChat.tsx', () => {
    const tsx = readFileSync(path.join(RAIZ, 'src/components/TutorialNuevoChat.tsx'), 'utf8');
    for (const [titulo, t] of P.CAPITULOS_TUTORIAL) {
        assert.ok(new RegExp(`t: ${String(t).replace('.', '\\.')}, titulo: '${titulo}'`).test(tsx), `${titulo} (${t})`);
    }
});
await prueba('cada sección de uso tiene su fragmento en T2', () => {
    for (const s of reglas.SECCIONES_USO) assert.ok(`secciones.${s}` in P.PLANTILLAS.T2.fragmentos, s);
});
await prueba('las dos políticas de cobro sin aprobar se quedan vacías (T6 devolucion, T8 por_peticion)', () => {
    assert.deepEqual(P.opcionesDe(P.PLANTILLAS.T6, 'devolucion'), []);
    assert.deepEqual(P.opcionesDe(P.PLANTILLAS.T8, 'por_peticion'), []);
    assert.throws(() => P.pintar('T6', { ...COMUNES, estado: 'sin-texto', fecha_consulta: '2026-11-02T17:39:00Z', devolucion: 'si' }), /no existe el fragmento/);
});
await prueba('las variables se validan: nada de enlaces, correos, folios raros ni saludos inventados', () => {
    const v = { ...COMUNES, apertura: 'chat', situacion: 'sin-consultas' };
    assert.throws(() => P.pintar('T1', { ...v, plan: 'Pro' }), /no declara/);
    assert.throws(() => P.pintar('T3', { ...COMUNES, situacion: 'cambiar', plan: 'Pro https://evil.example' }), /no admitido/);
    assert.throws(() => P.pintar('T1', { ...v, folio: '<b>1</b>' }), /folio inválido/);
    assert.throws(() => P.pintar('T1', { ...v, saludo: 'Hola David:' }), /saludo/);
    assert.throws(() => P.pintar('T4', { ...COMUNES, estado: 'otra-cuenta', correo_oculto: 'ana@gmail.com' }), /enmascarado/);
    assert.equal(P.saludoPara(null, 'lic', 'jperez83@gmail.com'), 'Estimada, estimado:');
    assert.equal(P.saludoPara('JOSÉ luis', 'licenciado'), 'Estimado licenciado José:');
    assert.equal(P.saludoPara('Ana', 'lic'), 'Apreciable Lic. Ana:');
});

/* ═══════════════════ la base, el cobro y el correo de mentira ═══════════════════ */

type Fila = Record<string, any>;
interface Bitacora { tabla: string; op: string; valores?: unknown }

/** Un Supabase en memoria con lo que usan estos módulos, con la semántica de PostgREST. */
function crearBase(tablas: Record<string, Fila[]> = {}, rpcs: Record<string, (a: any) => any> = {}) {
    const bitacora: Bitacora[] = [];
    const LLAVES: Record<string, string> = { atencion_casos: 'folio', reportes_soporte: 'folio', plantillas_soporte: 'sha256' };
    const filas = (t: string) => (tablas[t] ||= []);
    const comparar = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);
    const como = (patron: string) => new RegExp('^' + patron.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'is');

    class Consulta {
        op = 'select'; valores: any; filtros: Array<(f: Fila) => boolean> = []; orden: [string, boolean] | null = null;
        limite: number | null = null; uno: 'single' | 'maybe' | null = null; devolver = false; conflicto: string | null = null; ignorar = false;
        tabla: string;
        constructor(tabla: string) { this.tabla = tabla; }
        select(_c = '*') { if (this.op !== 'select') this.devolver = true; return this; }
        insert(v: any) { this.op = 'insert'; this.valores = v; return this; }
        upsert(v: any, o?: { onConflict?: string; ignoreDuplicates?: boolean }) { this.op = 'upsert'; this.valores = v; this.conflicto = o?.onConflict ?? null; this.ignorar = !!o?.ignoreDuplicates; return this; }
        update(v: any) { this.op = 'update'; this.valores = v; return this; }
        delete() { this.op = 'delete'; return this; }
        eq(c: string, v: any) { this.filtros.push(f => f[c] !== null && f[c] !== undefined && comparar(f[c], v) === 0); return this; }
        neq(c: string, v: any) { this.filtros.push(f => f[c] != null && comparar(f[c], v) !== 0); return this; }
        is(c: string, v: any) { this.filtros.push(f => (v === null ? f[c] == null : f[c] === v)); return this; }
        not(c: string, op: string, v: any) { if (op !== 'is' || v !== null) throw new Error('not() sin implementar'); this.filtros.push(f => f[c] != null); return this; }
        in(c: string, vs: any[]) { this.filtros.push(f => vs.some(v => comparar(f[c], v) === 0)); return this; }
        gte(c: string, v: any) { this.filtros.push(f => f[c] != null && comparar(f[c], v) >= 0); return this; }
        lte(c: string, v: any) { this.filtros.push(f => f[c] != null && comparar(f[c], v) <= 0); return this; }
        gt(c: string, v: any) { this.filtros.push(f => f[c] != null && comparar(f[c], v) > 0); return this; }
        lt(c: string, v: any) { this.filtros.push(f => f[c] != null && comparar(f[c], v) < 0); return this; }
        ilike(c: string, patron: string) { const rx = como(patron); this.filtros.push(f => rx.test(String(f[c] ?? ''))); return this; }
        order(c: string, o?: { ascending?: boolean }) { this.orden = [c, o?.ascending !== false]; return this; }
        limit(n: number) { this.limite = n; return this; }
        single() { this.uno = 'single'; return this; }
        maybeSingle() { this.uno = 'maybe'; return this; }
        then<A, B>(ok?: (r: any) => A, mal?: (e: unknown) => B) { return Promise.resolve(this.ejecutar()).then(ok, mal); }
        ejecutar(): { data: any; error: any } {
            if (this.op !== 'select') bitacora.push({ tabla: this.tabla, op: this.op, valores: this.valores });
            if (!(this.tabla in tablas) && faltan.has(this.tabla)) {
                return { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${this.tabla}' in the schema cache` } };
            }
            const todas = filas(this.tabla);
            let afectadas: Fila[] = [];
            if (this.op === 'insert' || this.op === 'upsert') {
                const llave = this.conflicto || LLAVES[this.tabla] || 'id';
                for (const v of Array.isArray(this.valores) ? this.valores : [this.valores]) {
                    const previa = todas.find(f => f[llave] === v[llave]);
                    if (previa && this.op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate key' } };
                    if (previa && this.ignorar) continue;
                    if (previa) { Object.assign(previa, structuredClone(v)); afectadas.push(previa); continue; }
                    const nueva = structuredClone(v); todas.push(nueva); afectadas.push(nueva);
                }
            } else {
                afectadas = todas.filter(f => this.filtros.every(p => p(f)));
                if (this.op === 'update') {
                    for (const f of afectadas) {
                        const rechazo = antesDeActualizar(this.tabla, f, this.valores);
                        if (rechazo) return { data: null, error: { code: 'P0001', message: rechazo } };
                    }
                    afectadas.forEach(f => Object.assign(f, structuredClone(this.valores)));
                }
                if (this.op === 'delete') tablas[this.tabla] = todas.filter(f => !afectadas.includes(f));
            }
            if (this.op !== 'select' && !this.devolver) return { data: null, error: null };
            let salida = afectadas.map(f => structuredClone(f));
            if (this.orden) { const [c, asc] = this.orden; salida.sort((a, b) => comparar(a[c], b[c]) * (asc ? 1 : -1)); }
            if (this.limite != null) salida = salida.slice(0, this.limite);
            if (this.uno === 'single') return salida.length === 1 ? { data: salida[0], error: null } : { data: null, error: { message: 'single' } };
            if (this.uno === 'maybe') return { data: salida[0] ?? null, error: null };
            return { data: salida, error: null };
        }
    }

    /** El disparador de la migración: no se reclama un envío sin modo «enviar» y plantilla aprobada. */
    function antesDeActualizar(tabla: string, f: Fila, v: Fila): string | null {
        if (tabla !== 'atencion_casos' || !v.envio_reclamado_at || f.envio_reclamado_at) return null;
        if (f.modo !== 'enviar') return `atencion_casos ${f.folio}: no se reclama un envío en modo ${f.modo}`;
        const ok = filas('plantillas_soporte').some(p => p.sha256 === f.plantilla_sha256 && p.id === f.plantilla_id
            && p.version === f.plantilla_version && p.aprobada_at && p.aprobada_por);
        return ok ? null : `atencion_casos ${f.folio}: la plantilla ${f.plantilla_id} no está aprobada`;
    }

    const faltan = new Set<string>();
    const cliente = {
        from: (t: string) => new Consulta(t),
        rpc: async (nombre: string, args: any) => {
            bitacora.push({ tabla: nombre, op: 'rpc', valores: args });
            const fn = rpcs[nombre];
            return fn ? { data: fn(args), error: null } : { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${nombre}` } };
        },
    };
    return { cliente: cliente as never, tablas, bitacora, faltan, escrituras: () => bitacora.filter(b => b.op !== 'rpc') };
}

function crearCobro(subs: Record<string, any[]> = {}, clientes: Record<string, string> = {}, lanza = false) {
    const llamadas: string[] = [];
    return {
        llamadas,
        lector: {
            async clientePorCorreo(c: string) { llamadas.push(`cliente:${c}`); if (lanza) throw new Error('cobro caído'); return clientes[c] ?? null; },
            async suscripciones(c: string) { llamadas.push(`subs:${c}`); if (lanza) throw new Error('cobro caído'); return subs[c] ?? []; },
        },
    };
}

type Envio = { from: string; to: string[]; bcc?: string[]; subject: string; html?: string; replyTo?: string; clave?: string };
function crearCorreo() {
    const enviados: Envio[] = [];
    const cliente = {
        emails: {
            send: async (p: Envio, o?: { idempotencyKey?: string }) => {
                enviados.push({ ...p, clave: o?.idempotencyKey });
                return { data: { id: `re_${enviados.length}` }, error: null, headers: null };
            },
        },
    };
    return { cliente: cliente as never, enviados };
}

const AHORA = Date.parse('2026-11-02T19:00:00Z');
const hace = (min: number) => new Date(AHORA - min * 60_000).toISOString();
const PERFIL = (o: Fila = {}): Fila => ({
    id: 'u-1', email: 'ana.robles@gmail.com', full_name: 'Ana Robles', tratamiento: 'licenciada', subscription_type: 'gratuito',
    queries_used: 5, queries_limit: 5, consultas_recargadas: 0, suspendido_at: null, impago_desde: null,
    stripe_customer_id: null, stripe_subscription_id: null, ...o,
});
const SUB = (o: Fila = {}): Fila => ({
    id: 'sub_1', estado: 'active', planId: 'pro_monthly', cancelaAlFinal: false, finPeriodo: '2026-11-24T06:00:00.000Z',
    creadaAt: '2026-10-24T06:00:00.000Z', factura: { estado: 'paid', pagadaAt: '2026-10-24T06:05:00.000Z', intentos: 1, creadaAt: '2026-10-24T06:00:00.000Z' }, ...o,
});
const diag = (base: ReturnType<typeof crearBase>, texto: string, o: Partial<{ stripe: any; canal: 'chat' | 'correo'; cabeceraFecha: string; recibidoAt: string }> = {}) =>
    diagnosticar({ userId: 'u-1', email: 'ana.robles@gmail.com', texto, canal: o.canal ?? 'chat', referenciaAt: hace(30),
        cabeceraFecha: o.cabeceraFecha, recibidoAt: o.recibidoAt }, { sb: base.cliente, stripe: o.stripe ?? null, ahora: AHORA });

/* ═══════════════════ 3. el diagnóstico ═══════════════════ */

console.log('el diagnóstico');
const RAFAGA = {
    inicios: 11, inicios_sin_renovar: 3, horas_entre_inicios: 0.2, renovaciones: 140, revocaciones: 140, max_por_minuto: 42,
    minuto_pico: '2026-11-02T17:39:00+00:00', sesiones_en_pico: 6, vida_mediana_s: 0.14, sesiones_activas: 11, agentes: 2, ultimo_inicio: '2026-11-02T17:51:15Z',
};

await prueba('EL RELOJ: «no puedo iniciar sesión» con ráfaga de renovaciones → T5 reloj, y sólo LEE', async () => {
    const base = crearBase({ user_profiles: [PERFIL()], blocked_users: [] }, { auth_resumen_usuario: () => RAFAGA, cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'No puedo iniciar sesión, pongo la contraseña correcta y me vuelve a sacar');
    assert.equal(d.tipo, 'acceso');
    assert.equal(d.plantilla, 'T5');
    assert.equal(d.variables.causa, 'reloj');
    assert.ok(d.confianza >= 0.85);
    assert.match(d.diagnostico, /42 en un minuto/);
    assert.equal(base.escrituras().length, 0, 'el diagnóstico no escribe');
    const rpc = base.bitacora.find(b => b.tabla === 'auth_resumen_usuario')!.valores as { p_user: string; p_desde: string };
    assert.equal(rpc.p_user, 'u-1');
    assert.equal(rpc.p_desde, new Date(Date.parse(hace(30)) - 24 * 3600_000).toISOString(), 'las 24 h previas al reporte');
});
await prueba('EL RELOJ por correo: la cabecera Date 9 h adelantada lo confirma y lo cuantifica', async () => {
    const base = crearBase({ user_profiles: [PERFIL()] }, { auth_resumen_usuario: () => RAFAGA, cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'no puedo entrar a mi cuenta', { canal: 'correo', cabeceraFecha: '2026-11-03T03:05:00Z', recibidoAt: '2026-11-02T18:05:00Z' });
    assert.equal(d.variables.causa, 'reloj-desfase');
    assert.equal(d.variables.desfase, 'unas 9 horas adelantado');
    assert.equal(d.confianza, 0.95);
    const correo = P.pintar('T5', { ...COMUNES, ...d.variables });
    assert.match(correo.texto, /va unas 9 horas adelantado respecto de la hora real/);
});
await prueba('la sesión que no se renueva («me saca cada hora»): una persona, no una plantilla', async () => {
    const base = crearBase({ user_profiles: [PERFIL({ subscription_type: 'pro_monthly' })] }, {
        auth_resumen_usuario: () => ({ ...RAFAGA, inicios: 5, inicios_sin_renovar: 5, horas_entre_inicios: 6.02, renovaciones: 0, revocaciones: 0, max_por_minuto: 1, vida_mediana_s: null }),
        cuentas_mismo_correo: () => [],
    });
    const d = await diag(base, 'cada hora me saca de la sesión');
    assert.equal(d.tipo, 'humano');
    assert.equal(d.plantilla, null);
    assert.match(d.accion, /refresh_token_not_found/);
});
await prueba('sin la migración, el resumen de sesiones falta y se dice: no cuenta como «no hay ráfaga»', async () => {
    const base = crearBase({ user_profiles: [PERFIL()] });
    const d = await diag(base, 'no puedo iniciar sesión');
    assert.ok(d.hechos.faltantes.some(f => /auth_resumen_usuario: falta la migración/.test(f)), d.hechos.faltantes.join('; '));
    assert.equal(d.tipo, 'humano', 'escribió desde el chat y sin señal: confianza 0.70, lo ve una persona');
    assert.equal(d.borrador?.plantilla, 'T5');
});

console.log('  el pago no reflejado');
await prueba('pagó, el cobro dice pagado y el perfil sigue en gratuito → una persona aplica el plan (sin correo)', async () => {
    const cobro = crearCobro({ cus_1: [SUB()] }, { 'ana.robles@gmail.com': 'cus_1' });
    const base = crearBase({ user_profiles: [PERFIL()] }, { cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'ya hice el pago y sigo en el plan gratuito', { stripe: cobro.lector });
    assert.equal(d.tipo, 'humano');
    assert.equal(d.plantilla, null);
    assert.equal(d.borrador, null, 'no hay plantilla para esto: lo arregla una persona');
    assert.match(d.accion, /aplicar el plan a mano/);
    assert.deepEqual(cobro.llamadas, ['cliente:ana.robles@gmail.com', 'subs:cus_1']);
    assert.equal(d.hechos.stripe?.porCorreo, true);
});
await prueba('pagó y el perfil ya tiene el plan → T4 «activo»: cerrar sesión y volver a entrar', async () => {
    const cobro = crearCobro({ cus_1: [SUB()] });
    const base = crearBase({ user_profiles: [PERFIL({ subscription_type: 'pro_monthly', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })] }, { cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'ya pagué el pro y no se refleja', { stripe: cobro.lector });
    assert.equal(d.plantilla, 'T4');
    assert.deepEqual(d.variables, { estado: 'activo', plan: 'Pro', correo_oculto: 'ana•••••••@gmail.com' });
    assert.deepEqual(cobro.llamadas, ['subs:cus_1'], 'con stripe_customer_id no busca por correo');
});
await prueba('el plan está en otra cuenta del mismo buzón de Gmail → T4 «otra-cuenta» con el correo enmascarado', async () => {
    const base = crearBase({ user_profiles: [PERFIL()] }, {
        cuentas_mismo_correo: ({ p_correo }: { p_correo: string }) => (p_correo === 'ana.robles@gmail.com'
            ? [{ id: 'u-1', email: 'ana.robles@gmail.com', subscription_type: 'gratuito' }, { id: 'u-2', email: 'anarobles+trabajo@gmail.com', subscription_type: 'platinum_monthly' }]
            : []),
    });
    const d = await diag(base, 'pagué platinum y me aparece el gratuito', { stripe: crearCobro().lector });
    assert.equal(d.plantilla, 'T4');
    assert.equal(d.variables.estado, 'otra-cuenta');
    assert.equal(d.variables.correo_oculto, reglas.ocultarCorreo('anarobles+trabajo@gmail.com'));
    assert.match(String(d.variables.correo_oculto), /^ana•+@gmail\.com$/);
});
await prueba('cuenta suspendida y el cobro con la factura abierta → T4 «suspendida», confianza 0.9', async () => {
    const cobro = crearCobro({ cus_1: [SUB({ estado: 'past_due', factura: { estado: 'open', pagadaAt: null, intentos: 1, creadaAt: hace(3000) } })] });
    const base = crearBase({ user_profiles: [PERFIL({ subscription_type: 'pro_monthly', stripe_customer_id: 'cus_1', suspendido_at: hace(4000) })] }, { cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'ya cambié mi tarjeta y sigue diciendo cuenta suspendida, ya pagué', { stripe: cobro.lector });
    assert.equal(d.variables.estado, 'suspendida');
    assert.equal(d.confianza, 0.9);
});
await prueba('el cobro no contesta → una persona (un hueco no es un «no hay pago»)', async () => {
    const base = crearBase({ user_profiles: [PERFIL()] }, { cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'ya hice el pago y sigo en gratuito', { stripe: crearCobro({}, {}, true).lector });
    assert.equal(d.tipo, 'humano');
    assert.match(d.diagnostico, /No se pudo leer el cobro/);
});
await prueba('ningún cobro con ese correo → borrador T4 «sin-pago» para el parte, pero no sale solo', async () => {
    const base = crearBase({ user_profiles: [PERFIL()] }, { cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'ya hice el pago y sigo en gratuito', { stripe: crearCobro().lector });
    assert.equal(d.tipo, 'humano');
    assert.equal(d.borrador?.plantilla, 'T4');
    assert.equal(d.borrador?.variables.estado, 'sin-pago');
});
await prueba('una cuenta bloqueada por disputa la ve el equipo, pregunte lo que pregunte', async () => {
    const base = crearBase({ user_profiles: [PERFIL()], blocked_users: [{ user_id: 'u-1', reason: 'disputa', blocked_at: hace(9000) }] });
    const d = await diag(base, 'como cancelo mi suscripción');
    assert.equal(d.tipo, 'humano');
    assert.match(d.diagnostico, /bloqueada/);
});

console.log('  los demás');
await prueba('consulta jurídica de un gratuito sin consultas (caso del 2-nov) → T1 sin-consultas, sin leer el cobro', async () => {
    const cobro = crearCobro();
    const base = crearBase({ user_profiles: [PERFIL()] });
    const d = await diag(base, 'procedea redactar los escritos\nme dieron un numero de codigo pero no dice donde debo anexarlo', { stripe: cobro.lector });
    assert.equal(d.plantilla, 'T1');
    assert.deepEqual(d.variables, { apertura: 'chat', nota_folio: 'si', situacion: 'sin-consultas' });
    assert.equal(cobro.llamadas.length, 0, 'una consulta mal puesta no gasta llamadas al cobro');
});
await prueba('respuesta terminada que no se guardó → T6 «recuperable»; su texto no sale del diagnóstico', async () => {
    const base = crearBase({ user_profiles: [PERFIL()], respuestas_chat: [
        { peticion_id: 'aaaa1111-2222', user_id: 'u-1', estado: 'terminada', creada_at: hace(45), terminada_at: hace(40), guardada_at: null, respuesta: 'X'.repeat(18000) },
        { peticion_id: 'bbbb1111-2222', user_id: 'u-1', estado: 'terminada', creada_at: hace(400), terminada_at: hace(398), guardada_at: hace(398), respuesta: 'Y'.repeat(900) },
    ] });
    const d = await diag(base, 'no me aparece nada ni me carga nada');
    assert.equal(d.plantilla, 'T6');
    assert.equal(d.variables.estado, 'recuperable');
    assert.equal(d.variables.devolucion, '', 'devolver la consulta es política sin aprobar');
    assert.ok(!JSON.stringify(d).includes('XXXX'), 'el texto de la respuesta no entra al diagnóstico');
    assert.deepEqual(d.hechos.respuestas?.map(r => r.largo), [18000, 900]);
});
await prueba('documento: el aviso de la pantalla dice cuántas hojas tenía y cuántas lee su plan → T7 «hojas»', async () => {
    const base = crearBase({ user_profiles: [PERFIL()], conversations: [{ id: 'c-1', user_id: 'u-1', updated_at: hace(50) }], messages: [
        { conversation_id: 'c-1', role: 'assistant', created_at: hace(50), content: '❌ **Error al analizar documento.** Este documento tiene 31 páginas y tu plan lee hasta 20. El plan Básico lee documentos de este tamaño.' },
        { conversation_id: 'c-1', role: 'assistant', created_at: hace(60), content: 'Respuesta larga que menciona contacto con el servidor ' + 'z'.repeat(3000) },
    ] });
    const d = await diag(base, 'adjunte un archivo y dice error');
    assert.equal(d.plantilla, 'T7');
    assert.deepEqual(d.variables, { causa: 'hojas', hojas_documento: 31, hojas_plan: 20 });
    assert.equal(d.hechos.erroresDocumento?.length, 1, 'una respuesta larga que lo menciona no es un error');
});
await prueba('cancelar con suscripción viva → T8 «pasos» con la fecha de fin; suspendida → una persona', async () => {
    const cobro = crearCobro({ cus_1: [SUB()] });
    const base = crearBase({ user_profiles: [PERFIL({ subscription_type: 'pro_monthly', stripe_customer_id: 'cus_1' })] }, { cuentas_mismo_correo: () => [] });
    const d = await diag(base, 'como puedo cancelar mi suscripcion', { stripe: cobro.lector });
    assert.deepEqual(d.variables, { estado: 'pasos', fin: 'con-fecha', fin_periodo: '2026-11-24T06:00:00.000Z', por_peticion: '' });
    const base2 = crearBase({ user_profiles: [PERFIL({ subscription_type: 'pro_monthly', stripe_customer_id: 'cus_1', suspendido_at: hace(100) })] });
    const d2 = await diag(base2, 'quiero cancelar mi suscripción', { stripe: cobro.lector });
    assert.equal(d2.tipo, 'humano');
    assert.match(d2.accion, /política sin aprobar/);
});

/* ═══════════════════ 4. el cron ═══════════════════ */

console.log('el cron');
const REPORTE = (folio: string, mensaje: string, o: Fila = {}): Fila => ({
    folio, origen: 'chat', user_id: 'u-1', user_email: 'ana.robles@gmail.com', user_name: 'Ana Robles', plan: 'gratuito',
    primer_mensaje: mensaje, hilo: `Usuario: ${mensaje}\nSoporte: Le ayudo con la plataforma, su plan o un fallo.`, turnos: 1,
    creado_at: hace(90), ultimo_turno_at: hace(60), estado: 'pendiente', escalado: false, ...o,
});
const aprobar = (...ids: Array<keyof typeof P.PLANTILLAS>) => ids.map(id => {
    const h = P.huella(P.PLANTILLAS[id]);
    return { id, version: h.version, sha256: h.sha256, texto: P.textoCanonico(P.PLANTILLAS[id]), aprobada_at: hace(5), aprobada_por: 'David' };
});

function escenario(o: { aprobadas?: Fila[]; reportes?: Fila[]; perfiles?: Fila[] } = {}) {
    return crearBase({
        reportes_soporte: o.reportes ?? [
            REPORTE('4126-02', 'me dieron un numero de codigo pero no dice donde debo anexarlo'),
            REPORTE('721-04', 'ya hice el pago y sigo en el plan gratuito', { user_id: 'u-9', user_email: 'luis@ejemplo.com.mx' }),
            REPORTE('3800-02', 'Gracias', { user_id: 'u-8', user_email: 'otra.persona@gmail.com' }),
            REPORTE('5000-01', 'como cancelo', { ultimo_turno_at: hace(5) }),   // todavía escribiendo: no se toca
        ],
        user_profiles: o.perfiles ?? [PERFIL(), PERFIL({ id: 'u-9', email: 'luis@ejemplo.com.mx', full_name: 'Luis' }), PERFIL({ id: 'u-8', email: 'otra.persona@gmail.com' })],
        atencion_casos: [],
        plantillas_soporte: o.aprobadas ?? [],
        blocked_users: [],
    }, { cuentas_mismo_correo: () => [] });
}
const cron = (base: ReturnType<typeof crearBase>, modo: 'simulacro' | 'enviar', correo = crearCorreo(), extra: Partial<Parameters<typeof A.atenderPendientes>[0]> = {}) =>
    A.atenderPendientes({ sb: base.cliente, stripe: crearCobro().lector, correoUsuarios: correo.cliente, correoInterno: correo.cliente,
        modo, ahora: AHORA, dormir: async () => { }, ...extra });
const aUsuarios = (enviados: Envio[]) => enviados.filter(e => !A.soloInternos(e.to));

await prueba('SIMULACRO: diagnostica y anota, el parte va sólo a la casa, y a ningún usuario le llega nada (aun con todo aprobado)', async () => {
    const base = escenario({ aprobadas: aprobar('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8') });
    const correo = crearCorreo();
    const r: any = await cron(base, 'simulacro', correo);
    assert.equal(r.modo, 'simulacro');
    assert.equal(r.nuevos, 3, 'el que sigue escribiendo espera');
    assert.equal(aUsuarios(correo.enviados).length, 0, JSON.stringify(correo.enviados.map(e => e.to)));
    assert.equal(correo.enviados.length, 1, 'un parte');
    assert.deepEqual(correo.enviados[0].to, ['soporte@iurexia.com', 'jdm.juridico@gmail.com']);
    assert.match(correo.enviados[0].subject, /simulacro/);
    const casos = base.tablas.atencion_casos;
    assert.deepEqual(casos.map(c => c.folio).sort(), ['3800-02', '4126-02', '721-04']);
    const t1 = casos.find(c => c.folio === '4126-02')!;
    assert.equal(t1.plantilla_id, 'T1');
    assert.equal(t1.envio_motivo, 'simulacro');
    assert.match(t1.correo_asunto, /folio 4126-02/);
    assert.equal(casos.find(c => c.folio === '3800-02')!.envio_motivo, 'nada que contestar');
    assert.ok(casos.every(c => c.parte_at), 'quedan marcados como reportados');
    assert.ok(base.tablas.reportes_soporte.every(x => x.estado === 'pendiente'), 'en simulacro nadie pasa a respondido');
    assert.ok(!base.escrituras().some(b => b.tabla === 'reportes_soporte'), 'ni se escribe en reportes_soporte');
});
await prueba('SIMULACRO aunque le pasen un cliente para usuarios por error: sigue sin escribirle a nadie', async () => {
    const base = escenario({ aprobadas: aprobar('T1') });
    const usuarios = crearCorreo();
    const interno = crearCorreo();
    await A.atenderPendientes({ sb: base.cliente, stripe: null, correoUsuarios: usuarios.cliente, correoInterno: interno.cliente,
        modo: 'simulacro', ahora: AHORA, dormir: async () => { } });
    assert.equal(usuarios.enviados.length, 0);
    assert.equal(aUsuarios(interno.enviados).length, 0);
});
await prueba('la segunda vuelta no repite: ni diagnóstico, ni parte (nada nuevo)', async () => {
    const base = escenario();
    const correo = crearCorreo();
    await cron(base, 'simulacro', correo);
    const r: any = await cron(base, 'simulacro', correo);
    assert.equal(r.nuevos, 0);
    assert.equal(r.parte.motivo, 'nada nuevo');
    assert.equal(correo.enviados.length, 1);
});
await prueba('ENVIAR sin plantillas aprobadas: no sale nada a usuarios; el parte dice por qué', async () => {
    const base = escenario();
    const correo = crearCorreo();
    const r: any = await cron(base, 'enviar', correo);
    assert.equal(r.enviados, 0);
    assert.equal(aUsuarios(correo.enviados).length, 0);
    const t1 = base.tablas.atencion_casos.find(c => c.folio === '4126-02')!;
    assert.match(t1.envio_motivo, /^plantilla T1 v1 sin aprobar/);
    assert.match(correo.enviados[0].html, /Todavía no hay ninguna plantilla aprobada/);
});
await prueba('ENVIAR con una aprobación de OTRO texto (hash viejo): no sale', async () => {
    const vieja = { ...aprobar('T1')[0], sha256: 'a'.repeat(64) };
    const base = escenario({ aprobadas: [vieja] });
    const correo = crearCorreo();
    await cron(base, 'enviar', correo);
    assert.equal(aUsuarios(correo.enviados).length, 0);
});
await prueba('ENVIAR con T1 aprobada: UN correo, desde soporte@, con copia a soporte@, y el reporte pasa a respondido', async () => {
    const base = escenario({ aprobadas: aprobar('T1') });
    const correo = crearCorreo();
    const r: any = await cron(base, 'enviar', correo);
    const usuarios = aUsuarios(correo.enviados);
    assert.equal(usuarios.length, 1);
    const e = usuarios[0];
    assert.deepEqual(e.to, ['ana.robles@gmail.com']);
    assert.equal(e.from, 'Soporte de Iurexia <soporte@iurexia.com>');
    assert.equal(e.replyTo, 'soporte@iurexia.com');
    assert.deepEqual(e.bcc, ['soporte@iurexia.com']);
    assert.match(e.subject, /folio 4126-02/);
    assert.match(e.clave!, /^atencion\/4126-02\/[0-9a-f]{16}\/principal$/);
    assert.equal(r.enviados, 1);
    const rep = base.tablas.reportes_soporte.find(x => x.folio === '4126-02')!;
    assert.equal(rep.estado, 'respondido');
    assert.equal(rep.respondido_por, 'atencion-automatica');
    // El de pago (T4) no está aprobado: no sale, y su reporte sigue pendiente.
    assert.equal(base.tablas.reportes_soporte.find(x => x.folio === '721-04')!.estado, 'pendiente');
    const caso = base.tablas.atencion_casos.find(c => c.folio === '4126-02')!;
    assert.equal(caso.envio_estado, 'enviado');
    assert.ok(caso.envio_reclamado_at && caso.correo_enviado_at);
    // Otra vuelta: el caso ya está diagnosticado, no hay segundo correo.
    await cron(base, 'enviar', correo);
    assert.equal(aUsuarios(correo.enviados).length, 1);
});
await prueba('un correo por persona cada 24 h, aunque abra dos conversaciones', async () => {
    const base = escenario({ aprobadas: aprobar('T1'), reportes: [
        REPORTE('4126-02', 'me dieron un numero de codigo pero no dice donde debo anexarlo'),
        REPORTE('4126-03', 'Quiero promover apelación a esta sentencia', { creado_at: hace(80), ultimo_turno_at: hace(50) }),
    ] });
    const correo = crearCorreo();
    await cron(base, 'enviar', correo);
    assert.equal(aUsuarios(correo.enviados).length, 1);
    assert.match(base.tablas.atencion_casos.find(c => c.folio === '4126-03')!.envio_motivo, /ya recibió una respuesta automática/);
});
await prueba('cuentas de prueba y reportes de hace más de 3 días no reciben correo solo', async () => {
    const base = escenario({ aprobadas: aprobar('T1'), reportes: [
        REPORTE('1-01', 'Quiero promover apelación a esta sentencia', { user_email: 'demo@iurexia.com' }),
        REPORTE('1-02', 'Quiero promover apelación a esta sentencia', { user_email: 'otra@gmail.com', creado_at: hace(5 * 1440), ultimo_turno_at: hace(4 * 1440) }),
    ] });
    const correo = crearCorreo();
    await cron(base, 'enviar', correo);
    assert.equal(aUsuarios(correo.enviados).length, 0);
    const motivos = base.tablas.atencion_casos.map(c => c.envio_motivo).sort();
    assert.deepEqual(motivos, ['cuenta de prueba', 'reporte de hace más de 3 días']);
});
await prueba('si la base rechaza el reclamo (su disparador), no se manda nada', async () => {
    const base = escenario({ aprobadas: aprobar('T1') });
    // Se retira la aprobación justo antes del reclamo: el código la leyó aprobada, la base dice que no.
    const correo = crearCorreo();
    const original = base.cliente as any;
    const desde = original.from;
    original.from = (t: string) => {
        const q = desde(t);
        if (t === 'atencion_casos') {
            const actualizar = q.update.bind(q);
            q.update = (v: any) => { if (v.envio_reclamado_at) base.tablas.plantillas_soporte.length = 0; return actualizar(v); };
        }
        return q;
    };
    await cron(base, 'enviar', correo);
    assert.equal(aUsuarios(correo.enviados).length, 0);
    const caso = base.tablas.atencion_casos.find(c => c.folio === '4126-02')!;
    assert.equal(caso.envio_estado, 'fallido');
    assert.match(caso.correo_error, /no está aprobada/);
});
await prueba('enviarAlUsuario vuelve a comprobar el modo y la aprobación', async () => {
    const correo = crearCorreo();
    const pintado = P.pintar('T1', { ...COMUNES, apertura: 'chat', situacion: 'sin-consultas' });
    const aprobadas = { porHash: new Map([[pintado.plantilla.sha256, { id: 'T1', version: 1, por: 'David' }]]), error: null };
    const r1 = await A.enviarAlUsuario({ modo: 'simulacro', correoUsuarios: correo.cliente }, { folio: '1-01', correo: 'a@b.mx', pintado }, aprobadas);
    const r2 = await A.enviarAlUsuario({ modo: 'enviar', correoUsuarios: correo.cliente }, { folio: '1-01', correo: 'a@b.mx', pintado }, { porHash: new Map(), error: null });
    assert.equal(r1.ok, false); assert.equal(r2.ok, false);
    assert.equal(correo.enviados.length, 0);
});
await prueba('ATENCION_MODO: sólo «enviar», tal cual, enciende el envío', () => {
    assert.equal(A.modoAtencion(undefined), 'simulacro');
    assert.equal(A.modoAtencion(''), 'simulacro');
    assert.equal(A.modoAtencion('ENVIAR'), 'simulacro');
    assert.equal(A.modoAtencion('si'), 'simulacro');
    assert.equal(A.modoAtencion(' enviar '), 'enviar');
    assert.equal(A.modoAtencion('apagado'), 'apagado');
});
await prueba('sin la migración no hace nada: ni diagnostica, ni manda', async () => {
    const base = crearBase({ reportes_soporte: [REPORTE('4126-02', 'amparo')] });
    base.faltan.add('atencion_casos');
    const correo = crearCorreo();
    const r: any = await cron(base, 'enviar', correo);
    assert.equal(r.sinTabla, 'atencion_casos');
    assert.equal(correo.enviados.length, 0);
});
await prueba('el parte no sale más de una vez cada 3 h, salvo que se pida', async () => {
    const base = escenario();
    const correo = crearCorreo();
    await cron(base, 'simulacro', correo);
    base.tablas.reportes_soporte.push(REPORTE('9-01', 'Quiero promover apelación a esta sentencia', { user_email: 'nuevo@gmail.com', user_id: 'u-7' }));
    const r: any = await cron(base, 'simulacro', correo, { ahora: AHORA + 30 * 60_000 });
    assert.match(r.parte.motivo, /menos de 3 h/);
    const r2: any = await cron(base, 'simulacro', correo, { ahora: AHORA + 31 * 60_000, forzarParte: true });
    assert.equal(r2.parte.enviado, true);
    assert.equal(correo.enviados.length, 2);
});
await prueba('textoDelUsuario: sólo las líneas del abogado, no el saludo del asistente', () => {
    const t = A.textoDelUsuario({ primer_mensaje: 'no puedo entrar', hilo: 'Usuario: no puedo entrar\nSoporte: Le ayudo con su plan o un fallo.\nUsuario: desde ayer' });
    assert.equal(t, 'no puedo entrar\ndesde ayer');
});
await prueba('un escrito pegado con saltos de línea (como el del 2-nov) es UN turno: T1 aunque diga «falta de pago»', () => {
    const escrito = ['Acapulco de Juárez, Guerrero, a 2 de noviembre de 2026.', '', 'RECLAMACIÓN por daño moral contra el instituto',
        'asunto: reclamación de indemnización por daño moral derivada de actividad administrativa irregular.', '', 'C. DIRECTOR GENERAL', 'PRESENTE.', '',
        '[NOMBRE], por mi propio derecho, señalo domicilio para oír y recibir notificaciones. Con fundamento en el artículo 109 de la Constitución',
        'y en la Ley Federal de Responsabilidad Patrimonial del Estado, comparezco y expongo: HECHOS. 1. El arrendador promovió la rescisión por',
        'falta de pago de rentas, ya pagué lo que se me reclamaba y aun así se me suspendió el servicio médico.'].join('\n');
    const hilo = `Soporte: Hola. Le ayudo con la plataforma, su plan o un fallo.\nUsuario: ${escrito.slice(0, 700)}\nSoporte: Entiendo.\nUsuario: donde puedo escribir en la plataforma`;
    const texto = A.textoDelUsuario({ primer_mensaje: escrito, hilo });
    assert.equal(texto.split('\n').length, 2, 'un renglón por turno');
    assert.ok(texto.startsWith('Acapulco') && texto.includes('servicio médico'), 'el primer mensaje entero, no el del hilo recortado');
    const c = reglas.clasificar(texto);
    assert.equal(c.tipo, 'consulta-juridica');
    assert.equal(c.regla, 'escrito jurídico pegado en la caja de soporte');
});

/* ═══════════════════ 5. la ruta real ═══════════════════ */

console.log('la ruta /api/cron/atencion');
const { NextRequest } = await import('next/server.js');
const ruta = await import('../../src/app/api/cron/atencion/route.ts');
process.env.CRON_SECRET = 'secreto-de-prueba';
process.env.RESEND_API_KEY = 're_de_prueba';
delete process.env.STRIPE_SECRET_KEY;
const g = globalThis as any;

async function llamarRuta(modo: string | undefined, base: ReturnType<typeof crearBase>) {
    if (modo === undefined) delete process.env.ATENCION_MODO; else process.env.ATENCION_MODO = modo;
    g.__sbFalso = base.cliente;
    g.__resends = [];
    const enviados: Envio[] = [];
    g.__enviar = async (p: Envio, o?: { idempotencyKey?: string }) => { enviados.push({ ...p, clave: o?.idempotencyKey }); return { data: { id: 're_x' }, error: null }; };
    const r = await ruta.GET(new NextRequest('http://localhost/api/cron/atencion', { headers: { authorization: 'Bearer secreto-de-prueba' } }));
    return { status: r.status, cuerpo: await r.json() as any, enviados, clientes: (g.__resends as unknown[]).length };
}

await prueba('la ruta exporta lo que hace falta: dinámica y sin caché de datos', () => {
    assert.equal(ruta.dynamic, 'force-dynamic');
    assert.equal(ruta.fetchCache, 'force-no-store');
});
await prueba('sin credenciales: 401', async () => {
    const r = await ruta.GET(new NextRequest('http://localhost/api/cron/atencion'));
    assert.equal(r.status, 401);
});
await prueba('ATENCION_MODO sin definir: simulacro, UN cliente de correo (el del parte) y nada a usuarios', async () => {
    const r = await llamarRuta(undefined, escenario({ aprobadas: aprobar('T1', 'T4') }));
    assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
    assert.equal(r.cuerpo.modo, 'simulacro');
    assert.equal(r.clientes, 1, 'en simulacro no se crea el cliente para usuarios');
    assert.equal(aUsuarios(r.enviados).length, 0);
});
await prueba('ATENCION_MODO=enviar sin aprobaciones: nada a usuarios', async () => {
    const r = await llamarRuta('enviar', escenario());
    assert.equal(r.cuerpo.modo, 'enviar');
    assert.equal(aUsuarios(r.enviados).length, 0);
});
await prueba('ATENCION_MODO=enviar con T1 aprobada: un correo, al usuario de T1', async () => {
    const r = await llamarRuta('enviar', escenario({ aprobadas: aprobar('T1') }));
    assert.deepEqual(aUsuarios(r.enviados).map(e => e.to[0]), ['ana.robles@gmail.com']);
});

console.log(`\n${pasadas} pruebas pasaron${process.exitCode ? ' — HAY FALLOS' : ''}`);
console.log(`clasificador en los tres juegos: ${totales.bien}/${totales.total} = ${(100 * totales.bien / totales.total).toFixed(1)} %`
    + ` · plantilla a quien necesitaba una persona: ${totales.peligrosos}`);
