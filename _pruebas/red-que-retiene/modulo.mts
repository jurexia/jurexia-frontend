/**
 * Los caminos de `analizarDocumento` que la prueba de punta a punta no
 * recorre, con un fetch de mentira y relojes cortos (unos segundos en total):
 *
 *   · sin copia que esperar (la API de antes, o sin sesión): el silencio
 *     aborta como antes y la pantalla dice lo de siempre;
 *   · la API no guardó copia: tras unas consultas sin fila, también;
 *   · el flujo revive tras el silencio: manda el flujo y se deja de vigilar;
 *   · el flujo se cierra sin su final: se va por la copia;
 *   · un 413 sale con su `status`, como antes;
 *   · si el envío falla con la copia ya vigilada, no se reenvía (se cobraría
 *     dos veces).
 *
 *   node --import ./_pruebas/red-que-retiene/registrar.mjs _pruebas/red-que-retiene/modulo.mts
 */
import type { CopiaDeRespuesta, FuenteDeCopias } from '../../src/lib/analisis-documento.ts';

const { analizarDocumento } = await import('../../src/lib/analisis-documento.ts');

const FALLOS: string[] = [];
function ok(cond: boolean, que: string) {
    console.log(`   ${cond ? 'PASA ' : 'FALLA'}  ${que}`);
    if (!cond) FALLOS.push(que);
}
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sse = (d: unknown) => `data: ${JSON.stringify(d)}\n\n`;
const TIEMPOS = { silencio: 300, avisoRed: 10_000, cadaCopia: 50, consultasSinFila: 3, topeCopia: 3_000, reintentoEnvio: 10 };

/** Un fetch que contesta con estos trozos, cada uno tras su espera, y respeta el abort. */
function fetchDe(trozos: [number, string][], opciones: { status?: number; cierraSinMas?: boolean } = {}) {
    let llamadas = 0;
    const f = (async (_url: string, init: RequestInit) => {
        llamadas++;
        const senal = init.signal as AbortSignal;
        const cuerpo = new ReadableStream<Uint8Array>({
            async start(ctrl) {
                const abortar = () => { try { ctrl.error(new DOMException('aborted', 'AbortError')); } catch { /* */ } };
                senal.addEventListener('abort', abortar, { once: true });
                for (const [ms, t] of trozos) {
                    await dormir(ms);
                    if (senal.aborted) return;
                    ctrl.enqueue(new TextEncoder().encode(t));
                }
                if (!senal.aborted) ctrl.close();
            },
        });
        return new Response(cuerpo, { status: opciones.status ?? 200 });
    }) as unknown as typeof fetch;
    return { f, llamadas: () => llamadas };
}

function copias(guion: (n: number) => Partial<CopiaDeRespuesta> | null): FuenteDeCopias & { consultas: () => number } {
    let n = 0;
    return {
        consultas: () => n,
        estado: async () => { const c = guion(++n); return { estado: (c?.estado as any) ?? null, error: false }; },
        completa: async () => {
            const c = guion(n);
            return c ? { peticion_id: 'p', conversation_id: null, expediente_id: null, estado_mx: null,
                pregunta: 'P', respuesta: null, estado: 'terminada', guardada_at: null, ...c } as CopiaDeRespuesta : null;
        },
    };
}

function eventos() {
    const vistos = { tokens: '', avisos: [] as string[], errores: [] as string[] };
    return {
        vistos,
        e: {
            token: (t: string) => { vistos.tokens += t; },
            progreso: () => {},
            documento: () => {},
            limitePlan: () => {},
            error: (m: string) => { vistos.errores.push(m); },
            aviso: (a: string) => { vistos.avisos.push(a); },
        },
    };
}
async function correr(o: Parameters<typeof analizarDocumento>[0]) {
    try { return { fin: await analizarDocumento(o), err: null as any }; } catch (err) { return { fin: null, err: err as any }; }
}
const base = { url: 'http://x/analyze-document', cuerpo: new FormData(), tiempos: TIEMPOS };

console.log('\n1 · sin copia que esperar (la API de antes o sin sesión): el silencio aborta como antes');
{
    const { e } = eventos();
    const r = await correr({ ...base, fetchImpl: fetchDe([[2_000, sse({ token: 'tarde' })]]).f, eventos: e });
    ok(r.err?.name === 'AbortError', `AbortError a los ${TIEMPOS.silencio} ms → «Se perdió el contacto» (${r.err?.name})`);
}

console.log('\n2 · la API no guardó copia: tras tres consultas sin fila, lo mismo');
{
    const c = copias(() => null);
    const { e, vistos } = eventos();
    const r = await correr({ ...base, peticionId: 'p', copias: c, fetchImpl: fetchDe([[5_000, sse({ token: 'x' })]]).f, eventos: e });
    ok(r.err?.name === 'AbortError' && c.consultas() === 3, `AbortError tras ${c.consultas()} consultas`);
    ok(vistos.avisos.some((a) => a.startsWith('Su red está reteniendo')), 'antes se avisó que la red retiene');
}

console.log('\n3 · el flujo revive tras el silencio: manda el flujo');
{
    const c = copias(() => ({ estado: 'en_curso' }));
    const { e, vistos } = eventos();
    const r = await correr({ ...base, peticionId: 'p', copias: c, eventos: e,
        fetchImpl: fetchDe([[10, sse({ progreso: 'Leyendo…' })], [500, sse({ token: 'Uno. ' })], [10, sse({ token: 'Dos.' })], [10, sse({ done: true })]]).f });
    ok(r.fin?.via === 'flujo' && (r.fin as any).terminado === true && vistos.tokens === 'Uno. Dos.', `vía ${r.fin?.via}, «${vistos.tokens}»`);
    const antes = c.consultas();
    await dormir(200);
    ok(c.consultas() === antes, 'y se deja de mirar la copia');
}

console.log('\n4 · el flujo se cierra sin su final (la red lo cortó): se va por la copia');
{
    const c = copias(() => ({ estado: 'terminada', respuesta: 'El análisis completo.' }));
    const { e, vistos } = eventos();
    const r = await correr({ ...base, peticionId: 'p', copias: c, eventos: e,
        fetchImpl: fetchDe([[10, sse({ token: 'El aná' })]]).f });
    ok(r.fin?.via === 'copia' && (r.fin as any).copia.respuesta === 'El análisis completo.', `vía ${r.fin?.via}`);
    ok(vistos.avisos.some((a) => a.startsWith('Se cortó la conexión')), 'con su aviso');
}

console.log('\n5 · un 413 sale con su status, como antes');
{
    const { e } = eventos();
    const f = (async () => new Response(JSON.stringify({ detail: 'Este documento tiene 140 páginas' }), { status: 413 })) as unknown as typeof fetch;
    const r = await correr({ ...base, peticionId: 'p', copias: copias(() => null), fetchImpl: f, eventos: e });
    ok(r.err?.status === 413 && /140 páginas/.test(r.err?.message), `${r.err?.status}: ${r.err?.message}`);
}

console.log('\n6 · el envío falla con la copia ya vigilada: no se reenvía');
{
    let llamadas = 0;
    const f = ((_u: string, init: RequestInit) => {
        llamadas++;
        return new Promise((_res, rej) => {
            setTimeout(() => rej(new TypeError('Failed to fetch')), 600);   // tras el silencio
            (init.signal as AbortSignal).addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        });
    }) as unknown as typeof fetch;
    let n = 0;
    const c = copias(() => (++n > 12 ? { estado: 'terminada', respuesta: 'Listo.' } : { estado: 'en_curso' }));
    const { e } = eventos();
    const r = await correr({ ...base, peticionId: 'p', copias: c, fetchImpl: f, eventos: e });
    ok(llamadas === 1 && r.fin?.via === 'copia', `${llamadas} envío, vía ${r.fin?.via ?? r.err?.message}`);
}

console.log('\n7 · el envío no salió y no hay vigilancia: un reintento, como desde el 25-oct');
{
    let llamadas = 0;
    const bueno = fetchDe([[10, sse({ token: 'Hecho.' })], [5, sse({ done: true })]]).f;
    const f = (async (u: string, init: RequestInit) => {
        if (++llamadas === 1) throw new TypeError('Failed to fetch');
        return bueno(u, init);
    }) as unknown as typeof fetch;
    const { e, vistos } = eventos();
    const r = await correr({ ...base, peticionId: 'p', copias: copias(() => null), fetchImpl: f, eventos: e });
    ok(llamadas === 2 && r.fin?.via === 'flujo' && vistos.tokens === 'Hecho.', `${llamadas} envíos, vía ${r.fin?.via}`);
}

console.log(FALLOS.length ? `\nFALLOS: ${FALLOS.join(' · ')}` : '\nLos caminos de analizarDocumento se portan como deben.');
process.exit(FALLOS.length ? 1 : 0);
