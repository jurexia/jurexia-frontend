/**
 * EL ANÁLISIS QUE YA TERMINÓ NO SE CAMBIA POR UN ERROR (29-oct-2026).
 *
 * `analizarDocumento` con un fetch de mentira: el flujo trae su análisis y su
 * `done`, y la red falla al cerrar («network error» de Chrome). Antes se
 * lanzaba el error y la página sustituía el análisis por «❌ Error al analizar
 * documento. network error»; ahora vuelve como terminado. Y un flujo que se
 * cierra sin `done`, sin error y sin una letra se devuelve como no terminado,
 * que la página convierte en un aviso con el documento de vuelta en la caja.
 *
 * USO (sin red):
 *   node --import ./_pruebas/red-que-retiene/registrar.mjs _pruebas/documentos-sin-errores/prueba.mts
 */
import { analizarDocumento, type EventosAnalisis } from '../../src/lib/analisis-documento.ts';

const FALLOS: string[] = [];
function ok(cond: boolean, que: string) {
    console.log(`   ${cond ? 'PASA ' : 'FALLA'}  ${que}`);
    if (!cond) FALLOS.push(que);
}

function flujo(tramas: string[], alFinal: 'error' | 'cierre'): Response {
    const enc = new TextEncoder();
    let i = 0;
    const cuerpo = new ReadableStream<Uint8Array>({
        pull(c) {
            if (i < tramas.length) { c.enqueue(enc.encode(tramas[i++])); return; }
            if (alFinal === 'error') c.error(new TypeError('network error'));
            else c.close();
        },
    });
    return new Response(cuerpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function eventos(): { ev: EventosAnalisis; tokens: string[]; errores: string[] } {
    const tokens: string[] = [];
    const errores: string[] = [];
    return {
        tokens, errores,
        ev: {
            token: (t) => tokens.push(t), progreso: () => {}, documento: () => {}, limitePlan: () => {},
            error: (m) => errores.push(m), aviso: () => {},
        },
    };
}

console.log('\n1 · done recibido y la red falla al cerrar: el análisis se queda');
{
    const e = eventos();
    const fin = await analizarDocumento({
        url: 'http://prueba/analyze-document', cuerpo: new FormData(), eventos: e.ev,
        fetchImpl: async () => flujo([': latido\n\n', 'data: {"token":"## Análisis\\n\\n"}\n\n',
            'data: {"token":"Completo."}\n\n', 'data: {"done":true}\n\n'], 'error'),
    });
    ok(fin.via === 'flujo' && (fin as { terminado: boolean }).terminado, 'vuelve como terminado, sin lanzar');
    ok(e.tokens.join('') === '## Análisis\n\nCompleto.', 'con todo su texto');
}

console.log('\n2 · sin done y la red falla a media lectura: sigue siendo un error (o la copia, si la hay)');
{
    const e = eventos();
    let lanzo = false;
    try {
        await analizarDocumento({
            url: 'http://prueba/analyze-document', cuerpo: new FormData(), eventos: e.ev,
            fetchImpl: async () => flujo(['data: {"token":"Medio"}\n\n'], 'error'),
        });
    } catch (err) {
        lanzo = (err as Error).message === 'network error';
    }
    ok(lanzo, 'lanza «network error» como antes: la página dice lo que pasó');
}

console.log('\n3 · el flujo se cierra sin done, sin error y sin una letra');
{
    const e = eventos();
    const fin = await analizarDocumento({
        url: 'http://prueba/analyze-document', cuerpo: new FormData(), eventos: e.ev,
        fetchImpl: async () => flujo([': latido\n\n', 'data: {"progreso":"Leyendo el documento…"}\n\n'], 'cierre'),
    });
    ok(fin.via === 'flujo' && !(fin as { terminado: boolean }).terminado && e.tokens.length === 0,
       'vuelve como NO terminado y sin texto: la página avisa y devuelve el documento a la caja');
}

console.log('\n4 · los latidos del modelo pensando rearman el reloj del silencio');
{
    const e = eventos();
    const enc = new TextEncoder();
    let n = 0;
    const cuerpo = new ReadableStream<Uint8Array>({
        async pull(c) {
            await new Promise((r) => setTimeout(r, 40));
            if (n < 8) { n++; c.enqueue(enc.encode(': latido\n\n')); return; }
            if (n === 8) { n++; c.enqueue(enc.encode('data: {"token":"Llegó."}\n\ndata: {"done":true}\n\n')); return; }
            c.close();
        },
    });
    const fin = await analizarDocumento({
        url: 'http://prueba/analyze-document', cuerpo: new FormData(), eventos: e.ev,
        tiempos: { silencio: 150 },      // sin latidos, 360 ms de silencio lo habrían abortado
        fetchImpl: async () => new Response(cuerpo, { status: 200 }),
    });
    ok(fin.via === 'flujo' && (fin as { terminado: boolean }).terminado && e.tokens.join('') === 'Llegó.',
       'con un latido cada 40 ms, un silencio de 150 ms no corta un análisis que tarda 360 ms');
}

console.log();
if (FALLOS.length) {
    console.log('FALLOS:\n  · ' + FALLOS.join('\n  · '));
    process.exit(1);
}
console.log('El análisis terminado no se cambia por un error, y el que no llega se dice.');
