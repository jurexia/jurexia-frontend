/**
 * Las orillas de la recuperación (`recuperarRespuestas`, `copiaYaGuardada`)
 * con la base en memoria: que nada se pierda y nada se repita.
 *
 *   node --import ./_pruebas/red-que-retiene/registrar.mjs _pruebas/red-que-retiene/recuperacion.mts
 */
import { randomUUID } from 'node:crypto';
import { BaseDeDatos, ahora, crearCliente, micro } from './base-falsa.mts';

const USR = randomUUID();
const bd = new BaseDeDatos();
(globalThis as any).__clienteFalso__ = crearCliente(async (c) => bd.ejecutar(c), { access_token: 't', user: { id: USR } });
const rs = await import('../../src/lib/respuestas-servidor.ts');
const conv = await import('../../src/lib/conversations.ts');

const FALLOS: string[] = [];
function ok(cond: boolean, que: string) {
    console.log(`   ${cond ? 'PASA ' : 'FALLA'}  ${que}`);
    if (!cond) FALLOS.push(que);
}
function conversacion(): string {
    const id = randomUUID();
    bd.filas('conversations').push({ id, user_id: USR, title: 't', created_at: ahora(-9e6), updated_at: ahora(-9e6) });
    return id;
}
/** Una copia del servidor creada hace `haceS` segundos y terminada hace 2 minutos. */
function copia(convId: string | null, pregunta: string, respuesta: string, estado = 'terminada', haceS = 300) {
    const peticion_id = randomUUID();
    bd.filas('respuestas_chat').push({ peticion_id, user_id: USR, conversation_id: convId, expediente_id: null, estado_mx: null,
        pregunta, respuesta, estado, creada_at: ahora(-haceS * 1000), terminada_at: ahora(-120_000), guardada_at: null });
    return peticion_id;
}
const de = (convId: string) => bd.filas('messages').filter((m) => m.conversation_id === convId)
    .sort((a, b) => (micro(a.created_at) < micro(b.created_at) ? -1 : 1)).map((m) => `${m.role[0]}:${m.content}`);
const fila = (p: string) => bd.filas('respuestas_chat').find((f) => f.peticion_id === p)!;

console.log('\n1 · copias sin nada escrito: se retiran, y no tapan a las que sí tienen respuesta');
{
    const c = conversacion();
    const vacias = Array.from({ length: 22 }, () => copia(c, 'detenida', '', 'interrumpida', 600));
    const buena = copia(c, 'Q', 'R', 'terminada', 60);
    await rs.recuperarRespuestas();          // las 20 más viejas: todas vacías
    await rs.recuperarRespuestas();          // las 2 que quedaban y la buena
    ok(vacias.every((p) => !!fila(p).guardada_at), 'las 22 vacías quedan reclamadas (retiradas)');
    ok(de(c).join(' | ') === 'u:Q | a:R' && !!fila(buena).guardada_at, `la buena llega: ${de(c).join(' | ')}`);
}

console.log('\n2 · la recuperación se adelantó a la pestaña sin texto: la pestaña no repite la pregunta');
{
    const c = conversacion();
    const p = copia(c, 'Q', 'R');
    await rs.recuperarRespuestas();          // otra pestaña la pasa al historial
    if (!(await rs.copiaYaGuardada(p))) await conv.addMessageToConversation(c, { role: 'user', content: 'Q' });
    ok(de(c).join(' | ') === 'u:Q | a:R', `${de(c).join(' | ')}`);
}

console.log('\n3 · la misma pregunta dos veces, las dos detenidas: cada respuesta tras la suya');
{
    const c = conversacion();
    const p1 = copia(c, 'Q', 'R1', 'terminada', 300);
    await conv.addMessageToConversation(c, { role: 'user', content: 'Q' }, { creadaEn: ahora(-290_000) });
    const p2 = copia(c, 'Q', 'R2', 'terminada', 200);
    await conv.addMessageToConversation(c, { role: 'user', content: 'Q' }, { creadaEn: ahora(-190_000) });
    await rs.recuperarRespuestas();
    ok(de(c).join(' | ') === 'u:Q | a:R1 | u:Q | a:R2', `${de(c).join(' | ')}`);
    ok(!!fila(p1).guardada_at && !!fila(p2).guardada_at, 'las dos reclamadas');
}

console.log('\n4 · interrumpida con texto tras una pregunta guardada sola: la respuesta parcial, con su nota');
{
    const c = conversacion();
    copia(c, 'Q', 'La mitad', 'interrumpida', 300);
    await conv.addMessageToConversation(c, { role: 'user', content: 'Q' }, { creadaEn: ahora(-290_000) });
    await rs.recuperarRespuestas();
    ok(de(c).length === 2 && de(c)[1].startsWith('a:La mitad') && de(c)[1].includes('Respuesta incompleta'), `${de(c).join(' | ').slice(0, 80)}`);
}

console.log('\n5 · la conversación ya no existe (la borró la limpieza): se recrea con su id y el par entero');
{
    const id = randomUUID();
    copia(id, 'Q', 'R');
    await rs.recuperarRespuestas();
    ok(bd.filas('conversations').some((x) => x.id === id) && de(id).join(' | ') === 'u:Q | a:R', `${de(id).join(' | ')}`);
}

console.log('\n6 · una pregunta guardada CON respuesta no se toma por sola');
{
    const c = conversacion();
    await conv.addMessageBatch(c, { role: 'user', content: 'Q' }, { role: 'assistant', content: 'A vieja' }, { creadaEn: ahora(-295_000) });
    copia(c, 'Q', 'R nueva', 'terminada', 300);
    await rs.recuperarRespuestas();
    ok(de(c).join(' | ') === 'u:Q | a:R nueva | u:Q | a:A vieja', `el par nuevo, en su sitio: ${de(c).join(' | ')}`);
}

console.log(FALLOS.length ? `\nFALLOS: ${FALLOS.join(' · ')}` : '\nLa recuperación no pierde ni repite.');
process.exit(FALLOS.length ? 1 : 0);
