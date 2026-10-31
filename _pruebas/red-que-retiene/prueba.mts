/**
 * LA RED QUE RETIENE EL FLUJO, PROBADA DE PUNTA A PUNTA (28-oct-2026).
 *
 * Folio 3640-01: tras Cisco Umbrella la respuesta llega entera al terminar.
 * Se perdieron tres análisis de documento (la pantalla abortaba a los 75 s) y
 * una respuesta de chat de 29,833 caracteres (la página reclamó la copia del
 * servidor sin tener texto). Esta prueba lo reproduce con un proxy que hace lo
 * mismo que Umbrella y comprueba:
 *
 *   (a) un análisis de más de 75 s tras el proxy aparece en la conversación
 *       con el texto del documento —llegue por el flujo, por la copia del
 *       servidor o, si la espera se acaba, por la recuperación—;
 *   (b) detener a la mitad una consulta del chat deja que la recuperación
 *       traiga la respuesta completa, sin pregunta duplicada.
 *
 * Todo es código real salvo la base (en memoria, `base-falsa.mts`), el motor y
 * el acervo (`servidor_api.py`): la ruta /analyze-document y el respaldo de la
 * API; `analizarDocumento`, `reclamarRespuesta`, `copiaYaGuardada`,
 * `recuperarRespuestas` y el guardado de `conversations.ts`. Lo que la página
 * hace con ellos —qué guarda y cuándo reclama— se repite aquí con las mismas
 * llamadas (`guardarComoLaPagina…`).
 *
 * USO (≈ 2 min; sin red y sin gasto):
 *   node --import ./_pruebas/red-que-retiene/registrar.mjs \
 *        _pruebas/red-que-retiene/prueba.mts <carpeta-de-la-api> [python]
 */
import { spawn } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BaseDeDatos, ahora, crearCliente, micro, servirPorHttp, type Fila } from './base-falsa.mts';
import { proxyQueRetiene, type Modo } from './proxy-que-retiene.mts';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const API = path.resolve(process.argv[2] || '');
if (!existsSync(path.join(API, 'main.py'))) {
    console.error('Uso: … prueba.mts <carpeta-de-la-api> [python]');
    process.exit(2);
}
function pythonDeLaApi(): string {
    if (process.argv[3]) return process.argv[3];
    for (let d = API; d !== path.dirname(d); d = path.dirname(d)) {
        const p = path.join(d, '.venv/bin/python');
        if (existsSync(p)) return p;
    }
    return 'python3';
}

const USR = randomUUID();
/* UN TOKEN CON FORMA DE JWT (30-oct-2026). Desde la puerta de sesión de la API
   (puerta_sesion.py, 29-oct) lo que no es un JWT o ya venció se rechaza sin
   preguntar a Supabase, y con «token-de-prueba» todos los análisis salían
   401: la prueba fallaba igual en main. La firma no se mira aquí; la base de
   mentira lo reconoce por su texto, como Supabase por su firma. */
const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOKEN = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: USR, exp: Math.floor(Date.now() / 1000) + 6 * 3600 })}.firma-de-prueba`;
const SESION = { access_token: TOKEN, user: { id: USR, email: 'prueba@ejemplo.mx' } };
const ESPERA_MOTOR_S = 85;           // el servidor tarda > 75 s en contestar

const FALLOS: string[] = [];
function ok(cond: boolean, que: string) {
    console.log(`   ${cond ? 'PASA ' : 'FALLA'}  ${que}`);
    if (!cond) FALLOS.push(que);
}
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const seg = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;

// ── La base, compartida por el front (en proceso) y la API (por HTTP) ────

const bd = new BaseDeDatos();
bd.filas('user_profiles').push({ id: USR, subscription_type: 'platinum_monthly', email: SESION.user.email, estado: 'TLAXCALA' });
bd.rpcs.consume_query = () => ({ allowed: true, used: 6, limit: 560 });
bd.rpcs.devolver_consulta = () => ({ devuelta: false });
(globalThis as any).__clienteFalso__ = crearCliente(async (c) => bd.ejecutar(c), SESION);

const rs = await import('../../src/lib/respuestas-servidor.ts');
const conv = await import('../../src/lib/conversations.ts');
const { analizarDocumento } = await import('../../src/lib/analisis-documento.ts');
const { mensajeConDocumento } = await import('../../src/lib/memoria-conversacion.ts');

function nuevaConversacion(previos: { role: string; content: string }[] = []): string {
    const id = randomUUID();
    bd.filas('conversations').push({ id, user_id: USR, title: 'Nueva conversación', estado: 'TLAXCALA', created_at: ahora(-3_600_000), updated_at: ahora(-3_600_000) });
    previos.forEach((m, i) => bd.filas('messages').push({
        id: randomUUID(), conversation_id: id, role: m.role, content: m.content, created_at: ahora(-3_000_000 + i * 1000),
    }));
    return id;
}
const mensajes = (convId: string) => bd.filas('messages').filter((m) => m.conversation_id === convId)
    .sort((a, b) => (micro(a.created_at) < micro(b.created_at) ? -1 : 1));
const fila = (peticion: string): Fila | undefined => bd.filas('respuestas_chat').find((f) => f.peticion_id === peticion);

// ── La API real y los proxies ─────────────────────────────────────────────

const base = await servirPorHttp(bd, { [TOKEN]: USR });
const PUERTO_API = 18_000 + Math.floor(Math.random() * 1000);
const bitacoraApi = path.join(os.tmpdir(), `red-que-retiene-api-${process.pid}.log`);
const api = spawn(pythonDeLaApi(), [path.join(AQUI, 'servidor_api.py'), API, `http://127.0.0.1:${base.puerto}`, String(PUERTO_API)], {
    env: { ...process.env, ESPERA_MOTOR: String(ESPERA_MOTOR_S), PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', openSync(bitacoraApi, 'w'), openSync(bitacoraApi, 'a')],
});
const cerrarTodo: (() => void)[] = [() => api.kill(), () => base.cerrar()];
process.on('exit', () => cerrarTodo.forEach((f) => { try { f(); } catch { /* */ } }));

for (let i = 0; ; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PUERTO_API}/_prueba/vivo`)).ok) break; } catch { /* aún no */ }
    if (i > 120 || api.exitCode !== null) { console.error(`La API de prueba no arrancó: ver ${bitacoraApi}`); process.exit(1); }
    await dormir(500);
}
console.log(`API real en :${PUERTO_API} (motor de mentira que calla ${ESPERA_MOTOR_S} s) · ${seg()}`);
const PDF = new Uint8Array(await (await fetch(`http://127.0.0.1:${PUERTO_API}/_prueba/pdf`)).arrayBuffer());

const proxies: Record<string, number> = {};
const registros: Record<string, import('./proxy-que-retiene.mts').Paso[]> = {};
for (const [nombre, modo, retraso] of [['al_final', 'al_final', 0], ['tarde', 'tarde', 30_000], ['nunca', 'nunca', 0]] as [string, Modo, number][]) {
    const p = await proxyQueRetiene(PUERTO_API, modo, retraso);
    proxies[nombre] = p.puerto;
    registros[nombre] = p.registro;
    cerrarTodo.push(p.cerrar);
}

// ── (a) El análisis de un documento, como lo hace la página ──────────────

const PREGUNTA_DOC = '¿Qué agravios hace valer la recurrente?';
const VISIBLE = `📄 **Documento adjunto:** agravios.pdf\n\n${PREGUNTA_DOC}`;

interface Corrida { convId: string; peticion: string; via: string; ms: number; avisos: string[]; error?: string; redRetuvo?: boolean }

async function analizarComoLaPagina(puerto: number, tiempos?: { topeCopia?: number }): Promise<Corrida> {
    const convId = nuevaConversacion();
    const peticion = rs.nuevoId();
    const cuerpo = new FormData();
    cuerpo.append('file', new Blob([PDF], { type: 'application/pdf' }), 'agravios.pdf');
    cuerpo.append('prompt', PREGUNTA_DOC);
    cuerpo.append('user_id', USR);
    cuerpo.append('estado', 'TLAXCALA');
    cuerpo.append('fuentes', '');
    cuerpo.append('peticion_id', peticion);
    cuerpo.append('mensaje_visible', VISIBLE);
    cuerpo.append('conversation_id', convId);

    let preguntaGuardada = { role: 'user' as const, content: VISIBLE };
    let texto = '';
    const avisos: string[] = [];
    const inicio = Date.now();
    let fin: any = null;
    try {
        fin = await analizarDocumento({
            url: `http://127.0.0.1:${puerto}/analyze-document`,
            cuerpo,
            cabeceras: { Authorization: `Bearer ${TOKEN}` },
            peticionId: peticion,
            copias: rs.copiasDelServidor,
            tiempos,
            eventos: {
                token: (t) => { texto += t; },
                progreso: () => {},
                aviso: (a) => { avisos.push(`${Math.round((Date.now() - inicio) / 1000)} s · ${a}`); },
                documento: (d) => { preguntaGuardada = { role: 'user', content: mensajeConDocumento(VISIBLE, d.nombre || 'agravios.pdf', d.texto, d.recortado) }; },
                limitePlan: () => {},
                error: (m) => { texto = `❌ Error al analizar documento: ${m}`; },
            },
        });
    } catch (e) {
        return { convId, peticion, via: 'error', ms: Date.now() - inicio, avisos, error: String((e as Error)?.message || e) };
    }
    // Lo que hace la página al terminar (`finally` de handleDocumentSubmit).
    if (fin.via === 'copia') {
        preguntaGuardada = { role: 'user', content: fin.copia.pregunta || preguntaGuardada.content };
        texto = rs.textoDeCopia(fin.copia);
    }
    if (fin.via !== 'sigue') {
        if (texto.trim()) {
            if ((await rs.reclamarRespuesta(peticion)) !== 'ajena') {
                await conv.addMessageBatch(convId, preguntaGuardada, { role: 'assistant', content: texto });
            }
        } else {
            await conv.addMessageToConversation(convId, preguntaGuardada);
        }
    }
    return { convId, peticion, via: fin.via, ms: Date.now() - inicio, avisos, redRetuvo: fin.redRetuvo };
}

function revisarConversacionDelDocumento(c: Corrida, que: string) {
    const m = mensajes(c.convId);
    const doc = m[0]?.content || '';
    ok(m.length === 2 && m[0].role === 'user' && m[1].role === 'assistant',
        `${que}: la conversación tiene la pregunta y el análisis (${m.map((x) => x.role).join(', ') || 'vacía'})`);
    ok(doc.startsWith(VISIBLE) && doc.includes('<!-- DOCUMENTO_INICIO -->') && doc.includes('SEGUNDO AGRAVIO')
        && doc.includes('Apizaco') && doc.endsWith('<!-- DOCUMENTO_FIN -->'),
        `${que}: la pregunta guarda el texto leído del documento`);
    ok((m[1]?.content || '').includes('**Segundo.** Alega la incompetencia por territorio'),
        `${que}: el análisis llegó entero`);
    ok(!!fila(c.peticion)?.guardada_at, `${que}: la copia del servidor quedó reclamada (la recuperación no la repetirá)`);
}

// ── (b) Detener a la mitad una consulta del chat ─────────────────────────

const RESPUESTA_LARGA = ('## Proyecto de resolución\n\n' + 'El agravio es fundado porque la autoridad omitió valorar las pruebas. '.repeat(500))
    .slice(0, 29_833);
const PREGUNTA_CHAT = '[ESFUERZO:platinum] Redacta el proyecto de resolución del recurso de revisión con los agravios del escrito.';

// `espera`: lo que tarda el servidor; distinta en cada chat para que sus dos
// recuperaciones no coincidan (`recuperarRespuestas` junta las simultáneas).
async function chatDetenidoALaMitad(puerto: number, comoAntes: boolean, espera: number) {
    const convId = nuevaConversacion([
        { role: 'user', content: '¿Qué plazo hay para interponer la revisión?' },
        { role: 'assistant', content: 'Diez días, conforme al artículo 86 de la Ley de Amparo.' },
    ]);
    const peticion = rs.nuevoId();
    const parado = new AbortController();
    const trozos: string[] = [];
    for (let i = 0; i < RESPUESTA_LARGA.length; i += 600) trozos.push(RESPUESTA_LARGA.slice(i, i + 600));
    let recibido = '';
    const lectura = (async () => {
        try {
            const r = await fetch(`http://127.0.0.1:${puerto}/_prueba/chat`, {
                method: 'POST', signal: parado.signal,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                body: JSON.stringify({ peticion_id: peticion, conversation_id: convId, pregunta: PREGUNTA_CHAT, espera, trozos }),
            });
            const lector = r.body!.getReader();
            for (;;) { const { done, value } = await lector.read(); if (done) break; recibido += new TextDecoder().decode(value); }
        } catch { /* el abogado detuvo la consulta */ }
    })();
    await dormir(15_000);       // la pantalla, vacía: el abogado pulsa «Detener»
    parado.abort();
    await lectura;
    const texto = recibido.replace(/<!--PING-->/g, '').trim();

    // Lo que hace la página al volver `sendMessage` sin texto.
    if (comoAntes) {
        // Antes: reclamaba siempre y guardaba la pregunta sola.
        await rs.reclamarRespuesta(peticion);
        await conv.addMessageToConversation(convId, { role: 'user', content: PREGUNTA_CHAT });
    } else if (!texto) {
        if (!(await rs.copiaYaGuardada(peticion))) {
            await conv.addMessageToConversation(convId, { role: 'user', content: PREGUNTA_CHAT });
        }
    }
    // El abogado sigue trabajando en la misma conversación: escribe otra pregunta
    // (en la base de mentira no hay latencia; sin esta pausa la siguiente podría
    // caer en el mismo milisegundo que la pregunta sola, cosa que en producción no pasa).
    await dormir(2_000);
    await conv.addMessageBatch(convId, { role: 'user', content: 'Agrega la tesis de jurisprudencia aplicable.' },
        { role: 'assistant', content: 'Se agrega la tesis 2a./J. 58/2010.' });

    // El servidor termina ~40 s después de empezar (el proxy siguió leyendo).
    for (let i = 0; i < 120 && fila(peticion)?.estado !== 'terminada' && fila(peticion)?.estado !== 'interrumpida'; i++) await dormir(500);
    const terminada = fila(peticion);
    // En vez de esperar el minuto de gracia de la recuperación, se adelanta su reloj.
    if (terminada?.terminada_at) terminada.terminada_at = ahora(Date.parse(terminada.terminada_at) - Date.now() - 61_000);
    const tocadas = await rs.recuperarRespuestas();
    const otraVez = await rs.recuperarRespuestas();
    return { convId, peticion, textoAntesDeDetener: texto, terminada, tocadas, otraVez };
}

// ── (c) El teléfono que se va (30-oct-2026) ──────────────────────────────
// Rubén Ávila, Android: la página se recargó al volver de WhatsApp a los
// 1.8 s del envío, y el servidor dejaba de escribir. Aquí la conexión se
// cierra DE VERDAD —sin proxy que la sostenga—, la página «recargada» no
// guarda nada, y lo que sabe es lo que le diga el servidor.

async function documentoYLaPantallaSeVa() {
    const convId = nuevaConversacion();
    const peticion = rs.nuevoId();
    const cuerpo = new FormData();
    cuerpo.append('file', new Blob([PDF], { type: 'application/pdf' }), 'agravios.pdf');
    cuerpo.append('prompt', PREGUNTA_DOC);
    cuerpo.append('user_id', USR);
    cuerpo.append('estado', 'TLAXCALA');
    cuerpo.append('fuentes', '');
    cuerpo.append('peticion_id', peticion);
    cuerpo.append('mensaje_visible', VISIBLE);
    cuerpo.append('conversation_id', convId);
    const corte = new AbortController();
    let primerosBytes = 0;
    try {
        const r = await fetch(`http://127.0.0.1:${PUERTO_API}/analyze-document`, {
            method: 'POST', body: cuerpo, headers: { Authorization: `Bearer ${TOKEN}` }, signal: corte.signal,
        });
        const { value } = await r.body!.getReader().read();      // el primer avance
        primerosBytes = value?.length ?? 0;
    } catch { /* */ }
    corte.abort();                                               // se va a WhatsApp
    await dormir(4_000);
    const pendientesDurante = await rs.respuestasPendientes();
    const enCursoDurante = fila(peticion)?.estado;
    for (let i = 0; i < 400 && fila(peticion)?.estado === 'en_curso'; i++) await dormir(500);
    const terminada = { ...fila(peticion) } as Fila | undefined;
    const f = fila(peticion);
    if (f?.terminada_at) f.terminada_at = ahora(Date.parse(f.terminada_at) - Date.now() - 61_000);
    const tocadas = await rs.recuperarRespuestas();
    return { convId, peticion, primerosBytes, pendientesDurante, enCursoDurante, terminada, tocadas };
}

// ── (d) Detener de verdad (30-oct-2026) ──────────────────────────────────
// Con el servidor escribiendo sin pantalla, cerrar la conexión ya no lo para:
// «Detener» se lo dice (`detenerEnServidor`, lo que hace `stopGeneration`).

async function chatDetenidoDeVerdad() {
    const convId = nuevaConversacion();
    const peticion = rs.nuevoId();
    const parado = new AbortController();
    const lectura = (async () => {
        try {
            const r = await fetch(`http://127.0.0.1:${PUERTO_API}/_prueba/chat`, {
                method: 'POST', signal: parado.signal,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                body: JSON.stringify({ peticion_id: peticion, conversation_id: convId, pregunta: PREGUNTA_CHAT,
                    espera: 25, trozos: ['Esto ', 'no ', 'debería ', 'escribirse.'] }),
            });
            const lector = r.body!.getReader();
            for (;;) { const { done } = await lector.read(); if (done) break; }
        } catch { /* detenida */ }
    })();
    await dormir(5_000);
    const pedida = rs.detenerEnServidor(peticion);   // stopGeneration: primero al servidor…
    parado.abort();                                   // …y luego corta la conexión
    await Promise.all([lectura, pedida]);
    // La página: sin texto, guarda la pregunta sola.
    if (!(await rs.copiaYaGuardada(peticion))) {
        await conv.addMessageToConversation(convId, { role: 'user', content: PREGUNTA_CHAT });
    }
    for (let i = 0; i < 60 && fila(peticion)?.estado === 'en_curso'; i++) await dormir(500);
    const cerrada = { ...fila(peticion) } as Fila | undefined;
    await dormir(30_000);                             // más que la espera del motor
    const f = fila(peticion);
    if (f?.terminada_at) f.terminada_at = ahora(Date.parse(f.terminada_at) - Date.now() - 61_000);
    await rs.recuperarRespuestas();
    return { convId, peticion, cerrada, despues: { ...fila(peticion) } as Fila | undefined };
}

// ── Las corridas, a la vez ────────────────────────────────────────────────

console.log(`\nCorriendo: tres análisis tras proxies que retienen, uno con la espera corta, y dos chats detenidos · ${seg()}`);
const [alFinal, tarde, nunca, corta, chat, chatAntes, seVa, detenido] = await Promise.all([
    analizarComoLaPagina(proxies.al_final),
    analizarComoLaPagina(proxies.tarde),
    analizarComoLaPagina(proxies.nunca),
    analizarComoLaPagina(proxies.al_final, { topeCopia: 80_000 }),
    chatDetenidoALaMitad(proxies.al_final, false, 40),
    chatDetenidoALaMitad(proxies.al_final, true, 47),
    documentoYLaPantallaSeVa(),
    chatDetenidoDeVerdad(),
]);
console.log(`Terminado · ${seg()}`);

const resumen = (c: Corrida) => `vía ${c.via} a los ${(c.ms / 1000).toFixed(0)} s${c.error ? ` · ${c.error}` : ''}`;
console.log('\n(a) EL ANÁLISIS DE MÁS DE 75 s TRAS UNA RED QUE RETIENE');

console.log(`\n  1 · Umbrella: retiene y suelta al terminar (${resumen(alFinal)})`);
alFinal.avisos.forEach((a) => console.log(`        aviso ${a}`));
ok(alFinal.ms > 75_000 && alFinal.via === 'flujo', 'a los 75 s de silencio ya no se aborta: el flujo llega entero');
ok(alFinal.avisos.some((a) => a.includes('Su red está reteniendo la respuesta')), 'la pantalla avisa que la red retiene');
ok(alFinal.redRetuvo === true, 'y al final se sabe que la red retuvo (sale la nota de AvisoRedRetiene)');
revisarConversacionDelDocumento(alFinal, 'Umbrella');

console.log(`\n  2 · retiene y suelta 30 s después de terminar (${resumen(tarde)})`);
ok(tarde.ms > 75_000 && tarde.via === 'copia' && tarde.ms < ESPERA_MOTOR_S * 1000 + 25_000,
    'llega la copia del servidor antes que el flujo retenido');
revisarConversacionDelDocumento(tarde, 'escaneo lento');

console.log(`\n  3 · la tira: cierra sin responder (${resumen(nunca)})`);
ok(nunca.via === 'copia', 'sin respuesta del proxy, el análisis llega por la copia');
revisarConversacionDelDocumento(nunca, 'proxy que la tira');

console.log(`\n  4 · la espera se acaba antes que el servidor (${resumen(corta)})`);
ok(corta.via === 'sigue' && mensajes(corta.convId).length === 0, 'la página no guarda nada ni reclama');
const tocadasDoc = await (async () => {
    for (let i = 0; i < 60 && fila(corta.peticion)?.estado === 'en_curso'; i++) await dormir(500);
    const f = fila(corta.peticion);
    if (f?.terminada_at) f.terminada_at = ahora(Date.parse(f.terminada_at) - Date.now() - 61_000);
    return rs.recuperarRespuestas();
})();
ok(tocadasDoc.includes(corta.convId), 'la recuperación lo pasa a la conversación');
revisarConversacionDelDocumento(corta, 'espera agotada');

console.log('\n(b) DETENER A LA MITAD UNA CONSULTA DEL CHAT');
const m = mensajes(chat.convId);
const veces = m.filter((x) => x.role === 'user' && x.content === PREGUNTA_CHAT).length;
console.log(`        al detener a los 15 s llevaba ${chat.textoAntesDeDetener.length} caracteres en pantalla; `
    + `el servidor terminó con ${(chat.terminada?.respuesta || '').length.toLocaleString('es-MX')}`);
ok(chat.textoAntesDeDetener === '' && chat.terminada?.estado === 'terminada',
    'la red retuvo todo y el servidor terminó aunque la página se detuvo');
ok(chat.tocadas.includes(chat.convId) && chat.otraVez.length === 0, 'la recuperación la trae una vez, y sólo una');
ok(veces === 1, `la pregunta está una sola vez (está ${veces})`);
ok(m.map((x) => x.role).join(',') === 'user,assistant,user,assistant,user,assistant'
    && m[2]?.content === PREGUNTA_CHAT && m[3]?.content === RESPUESTA_LARGA,
    'la respuesta completa (29,833 car.) queda justo detrás de su pregunta, antes de lo que se preguntó después');
const antes = mensajes(chatAntes.convId);
ok(!antes.some((x) => x.content === RESPUESTA_LARGA),
    'contraprueba: reclamando sin texto, como antes, la respuesta se pierde');

console.log('\n(c) EL TELÉFONO QUE SE VA: la conexión se cierra de verdad y la página se recarga');
console.log(`        la pantalla vio ${seVa.primerosBytes} bytes antes de irse; `
    + `a los 4 s la copia estaba «${seVa.enCursoDurante}» y había ${seVa.pendientesDurante} pendiente(s)`);
ok(seVa.enCursoDurante === 'en_curso' && seVa.pendientesDurante >= 1,
    'sin pantalla, el servidor sigue y la página recargada sabe que viene una respuesta');
ok(seVa.terminada?.estado === 'terminada' && (seVa.terminada?.respuesta || '').includes('**Segundo.** Alega la incompetencia por territorio'),
    'el servidor terminó el análisis entero aunque nadie lo leyera');
ok(seVa.tocadas.includes(seVa.convId), 'la recuperación lo pone en su conversación');
revisarConversacionDelDocumento({ convId: seVa.convId, peticion: seVa.peticion, via: 'recuperacion', ms: 0, avisos: [] },
    'teléfono que se va');

console.log('\n(d) DETENER DE VERDAD: la página se lo dice al servidor');
ok(detenido.cerrada?.estado === 'interrumpida' && !(detenido.cerrada?.respuesta || '').includes('debería'),
    'el servidor paró antes de escribir: la copia queda interrumpida y vacía');
ok(detenido.despues?.estado === 'interrumpida', 'y no se reanuda: sigue interrumpida pasada la espera del motor');
const md = mensajes(detenido.convId);
ok(md.length === 1 && md[0].content === PREGUNTA_CHAT, `la conversación queda con la pregunta sola (${md.map((x) => x.role).join(', ')})`);

console.log('\nLo que vio cada proxy (ms que tardó el servidor · ¿el cliente ya se había ido? · ¿se soltó?):');
for (const [nombre, pasos] of Object.entries(registros)) {
    for (const x of pasos) console.log(`   ${nombre.padEnd(8)} ${x.ruta.padEnd(18)} ${String(x.msServidor).padStart(6)} ms · ${(x.bytes / 1024).toFixed(0)} KB · cliente ${x.clienteSeFue ? 'ido' : 'esperando'} · ${x.soltada ? 'soltada' : 'no soltada'}`);
}
console.log(`   (la API escribió en ${bitacoraApi})`);
console.log(FALLOS.length ? `\nFALLOS (${FALLOS.length}):\n  · ${FALLOS.join('\n  · ')}` : '\nTodo pasa: una respuesta que el servidor terminó no se pierde aunque la red retenga el flujo.');
process.exit(FALLOS.length ? 1 : 0);
