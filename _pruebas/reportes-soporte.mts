/**
 * Las reglas de «que todo reporte llegue y se atienda» (29-oct-2026), sin red
 * ni base de datos: sólo `atencion-logica.ts` y el envío de `aviso.ts` con un
 * Resend de mentira. No manda correos, no toca Supabase, no llama a modelos.
 *
 * USO   node _pruebas/reportes-soporte.mts      (Node 22.18+, que quita los tipos solo)
 */
import assert from 'node:assert/strict';
import {
    extraerFolios, esConversacionNueva, debeAvisar, aplicarObservacion, motivoDeCierre, prioridad,
    type ReporteAtencion, type Observacion,
} from '../src/lib/soporte/atencion-logica.ts';
import {
    enviarConReintento, asuntoAviso, correoDeAviso, claveDeAviso, turnosDelHilo,
} from '../src/lib/soporte/aviso.ts';

let pasadas = 0;
const prueba = async (nombre: string, f: () => void | Promise<void>) => {
    try { await f(); pasadas++; console.log(`  ok  ${nombre}`); }
    catch (e) { console.error(`  MAL ${nombre}\n`, e); process.exitCode = 1; }
};

const T0 = Date.parse('2026-10-29T15:00:00Z');
const min = (n: number) => new Date(T0 + n * 60_000).toISOString();
const base = (o: Partial<ReporteAtencion> = {}): ReporteAtencion => ({
    folio: '3856-01', folios: ['3856-01'], user_email: 'abogado@ejemplo.mx', turnos: 1, escalado: false,
    creado_at: min(0), ultimo_turno_at: min(0), aviso_at: null, aviso_turnos: 0, aviso_intentos: 0,
    aviso_via: null, estado: 'pendiente', respondido_at: null, cerrado_at: null, usuario_volvio_at: null, ...o,
});

console.log('folios');
await prueba('del asunto del aviso', () =>
    assert.deepEqual(extraerFolios('[Soporte] Soporte no disponible — escalado directo — folio 3831-01 — x@y.mx'), ['3831-01']));
await prueba('de una respuesta escrita a mano', () =>
    assert.deepEqual(extraerFolios('Folio 3640-01: por qué no le cargaba Iurexia'), ['3640-01']));
await prueba('varios en una frase, sin fechas sueltas', () =>
    assert.deepEqual(extraerFolios('sobre sus folios 14-07 y 14-16. Pagó el 2026-10-03'), ['14-07', '14-16']));
await prueba('sin la palabra folio no hay folio', () => assert.deepEqual(extraerFolios('llamé al 55-12'), []));

console.log('conversaciones');
await prueba('primer mensaje: nueva', () => assert.equal(esConversacionNueva(null, { at: min(0), turnos: 1 }), true));
await prueba('siguiente mensaje: la misma', () =>
    assert.equal(esConversacionNueva({ ultimo_turno_at: min(0), turnos: 1 }, { at: min(3), turnos: 2 }), false));
await prueba('pulsó «Nueva»: el contador vuelve a 1', () =>
    assert.equal(esConversacionNueva({ ultimo_turno_at: min(0), turnos: 4 }, { at: min(3), turnos: 1 }), true));
await prueba('una hora de silencio: nueva', () =>
    assert.equal(esConversacionNueva({ ultimo_turno_at: min(0), turnos: 2 }, { at: min(61), turnos: 3 }), true));

console.log('cuándo se avisa');
await prueba('conversación viva: todavía no', () => assert.equal(debeAvisar(base(), T0 + 5 * 60_000), null));
await prueba('veinte minutos quieta: primer aviso, aunque el asistente la «resolviera»', () =>
    assert.equal(debeAvisar(base(), T0 + 20 * 60_000), 'primero'));
await prueba('escalada que el chat no pudo avisar: el cron la recoge a los 2 min', () => {
    assert.equal(debeAvisar(base({ escalado: true }), T0 + 60_000), null);
    assert.equal(debeAvisar(base({ escalado: true }), T0 + 3 * 60_000), 'primero');
});
await prueba('ya avisada y sin mensajes nuevos: nada', () =>
    assert.equal(debeAvisar(base({ aviso_at: min(21), aviso_turnos: 1 }), T0 + 90 * 60_000), null));
await prueba('siguió escribiendo tras el aviso: continuación, cuando se aquieta', () => {
    const r = base({ aviso_at: min(21), aviso_turnos: 1, turnos: 3, ultimo_turno_at: min(40) });
    assert.equal(debeAvisar(r, T0 + 45 * 60_000), null);
    assert.equal(debeAvisar(r, T0 + 61 * 60_000), 'continuacion');
});
await prueba('lo histórico no se avisa uno por uno (va al resumen)', () =>
    assert.equal(debeAvisar(base({ aviso_via: 'historico' }), T0 + 60 * 60_000), null));
await prueba('más de tres días: al resumen', () => assert.equal(debeAvisar(base(), T0 + 4 * 86400_000), null));
await prueba('veinte intentos fallidos: deja de insistir', () =>
    assert.equal(debeAvisar(base({ aviso_intentos: 20 }), T0 + 60 * 60_000), null));
await prueba('cerrado: nada', () => assert.equal(debeAvisar(base({ estado: 'cerrado' }), T0 + 60 * 60_000), null));

console.log('atención');
const resp = (o: Partial<Observacion> = {}): Observacion =>
    ({ tipo: 'respuesta', fecha: min(120), correos: [], folios: [], hilo: 'h1', ...o });
await prueba('respuesta que cita el folio: respondido', () =>
    assert.deepEqual(aplicarObservacion(base(), resp({ folios: ['3856-01'] })),
        { estado: 'respondido', respondido_at: min(120), gmail_hilo: 'h1' }));
await prueba('respuesta que cita OTRO folio de la misma conversación: respondido', () =>
    assert.equal(aplicarObservacion(base({ folios: ['3856-01', '3856-02'] }), resp({ folios: ['3856-02'] }))?.estado, 'respondido'));
await prueba('respuesta al correo del abogado (mayúsculas da igual): respondido', () =>
    assert.equal(aplicarObservacion(base(), resp({ correos: ['Abogado@Ejemplo.MX'] }))?.estado, 'respondido'));
await prueba('un correo al abogado ANTERIOR al reporte no lo atiende', () =>
    assert.equal(aplicarObservacion(base({ creado_at: min(200) }), resp({ correos: ['abogado@ejemplo.mx'] })), null));
await prueba('la misma observación dos veces no cambia nada (el script la repite)', () => {
    const r = base({ estado: 'respondido', respondido_at: min(120) });
    assert.equal(aplicarObservacion(r, resp({ folios: ['3856-01'] })), null);
});
await prueba('el abogado vuelve a escribir tras la respuesta: pendiente otra vez', () => {
    const r = base({ estado: 'respondido', respondido_at: min(120) });
    assert.deepEqual(aplicarObservacion(r, { tipo: 'usuario', fecha: min(300), correos: ['abogado@ejemplo.mx'], folios: [] }),
        { estado: 'pendiente', usuario_volvio_at: min(300) });
});
await prueba('lo que escribió ANTES de la respuesta no reabre', () => {
    const r = base({ estado: 'respondido', respondido_at: min(120) });
    assert.equal(aplicarObservacion(r, { tipo: 'usuario', fecha: min(100), correos: ['abogado@ejemplo.mx'], folios: [] }), null);
});
await prueba('reabierto: una respuesta vieja no lo da por atendido; una nueva sí', () => {
    const r = base({ estado: 'pendiente', respondido_at: min(120), usuario_volvio_at: min(300) });
    assert.equal(aplicarObservacion(r, resp({ folios: ['3856-01'], fecha: min(120) })), null);
    assert.equal(aplicarObservacion(r, resp({ folios: ['3856-01'], fecha: min(400) }))?.estado, 'respondido');
});
await prueba('cerrado no se toca', () =>
    assert.equal(aplicarObservacion(base({ estado: 'cerrado' }), resp({ folios: ['3856-01'] })), null));

console.log('cierre');
await prueba('respondido y 72 h sin noticias: se cierra', () =>
    assert.equal(motivoDeCierre(base({ estado: 'respondido', respondido_at: min(0) }), {}, T0 + 73 * 3600_000),
        'sin_respuesta_del_usuario_72h'));
await prueba('respondido hace 10 h: sigue abierto', () =>
    assert.equal(motivoDeCierre(base({ estado: 'respondido', respondido_at: min(0) }), {}, T0 + 10 * 3600_000), null));
await prueba('lo que NADIE contestó no se cierra nunca por tiempo', () =>
    assert.equal(motivoDeCierre(base(), {}, T0 + 60 * 86400_000), null));
await prueba('resuelto en el panel o por el circuito: se cierra', () => {
    assert.equal(motivoDeCierre(base(), { cerradoEnPanel: true }), 'panel');
    assert.equal(motivoDeCierre(base(), { cerradoPorCircuito: true }), 'circuito');
});
await prueba('en el resumen, un fallo de pago va antes que una consulta mal puesta de un gratuito', () =>
    assert.ok(prioridad('defecto', 'pro_monthly') < prioridad('buzon-equivocado', 'gratuito')));

console.log('envío');
type Llamada = { from: string; clave?: string };
const doble = (respuestas: Array<'ok' | 'throw' | { name: string; message?: string }>) => {
    const llamadas: Llamada[] = [];
    let i = 0;
    const cliente = {
        emails: {
            send: async (p: { from: string }, o?: { idempotencyKey?: string }) => {
                llamadas.push({ from: p.from, clave: o?.idempotencyKey });
                const r = respuestas[Math.min(i++, respuestas.length - 1)];
                if (r === 'throw') throw new Error('ECONNRESET');
                if (r === 'ok') return { data: { id: `re_${i}` }, error: null, headers: null };
                return { data: null, error: { name: r.name, message: r.message ?? r.name, statusCode: 429 }, headers: null };
            },
        },
    };
    return { cliente: cliente as never, llamadas };
};
const correo = { to: ['soporte@iurexia.com'], subject: 'x', html: '<p>x</p>' };
const rapido = { esperas: [1, 1], dormir: async () => { }, respaldo: 'Iurexia <noreply@iurexia.com>', idempotencia: 'k' };

await prueba('un 429 pasajero: reintenta y sale, con la MISMA clave de idempotencia', async () => {
    const { cliente, llamadas } = doble([{ name: 'rate_limit_exceeded' }, 'ok']);
    const r = await enviarConReintento(cliente, correo, rapido);
    assert.equal(r.ok, true); assert.equal(r.intentos, 2); assert.equal(r.via, 'principal');
    assert.equal(llamadas[0].clave, llamadas[1].clave);
});
await prueba('la red se cae dos veces: al tercer intento sale', async () => {
    const { cliente } = doble(['throw', 'throw', 'ok']);
    const r = await enviarConReintento(cliente, correo, rapido);
    assert.equal(r.ok, true); assert.equal(r.intentos, 3);
});
await prueba('remitente rechazado: sale por el de respaldo', async () => {
    const { cliente, llamadas } = doble([{ name: 'invalid_from_address' }, 'ok']);
    const r = await enviarConReintento(cliente, correo, rapido);
    assert.equal(r.ok, true); assert.equal(r.via, 'respaldo');
    assert.match(llamadas[1].from, /noreply@/);
});
await prueba('cuota agotada: no insiste en vano y lo reporta (el cron reintentará)', async () => {
    const { cliente, llamadas } = doble([{ name: 'daily_quota_exceeded' }]);
    const r = await enviarConReintento(cliente, correo, rapido);
    assert.equal(r.ok, false); assert.equal(llamadas.length, 1); assert.match(r.error!, /daily_quota/);
});
await prueba('Resend ya lo tenía con esa clave: se da por enviado, sin duplicar', async () => {
    const { cliente } = doble([{ name: 'invalid_idempotent_request' }]);
    const r = await enviarConReintento(cliente, correo, rapido);
    assert.equal(r.ok, true); assert.equal(r.duplicado, true);
});
await prueba('todo falla: ok=false con el último error, tras 3 intentos por remitente', async () => {
    const { cliente, llamadas } = doble([{ name: 'internal_server_error' }]);
    const r = await enviarConReintento(cliente, correo, rapido);
    assert.equal(r.ok, false); assert.equal(llamadas.length, 6); assert.match(r.error!, /internal_server_error/);
});
await prueba('si Resend rechazara las cabeceras de hilo, el aviso sale sin ellas', async () => {
    const { cliente, llamadas } = doble([{ name: 'validation_error', message: 'Invalid header: References' }, 'ok']);
    const r = await enviarConReintento(cliente, { ...correo, headers: { References: '<x@y>' } }, rapido);
    assert.equal(r.ok, true); assert.equal(llamadas.length, 2); assert.notEqual(llamadas[0].clave, llamadas[1].clave);
});
await prueba('sin clave de Resend: falla sin lanzar', async () => {
    const r = await enviarConReintento(null, correo, rapido);
    assert.equal(r.ok, false); assert.equal(r.intentos, 0);
});

console.log('el correo');
await prueba('el asunto lleva el folio (así lo reconoce el Apps Script) y no firma como persona', () => {
    const d = {
        folio: '3856-01', folios: ['3856-01', '3856-02'], correo: 'abogado@ejemplo.mx', motivo: 'Conversación con el asistente',
        tipo: 'asistente' as const, turnos: 2, conversacion: turnosDelHilo('Usuario: no sube\nSoporte: ¿qué error ve?\nlínea 2'),
    };
    const c = correoDeAviso(d);
    assert.equal(c.subject, '[Soporte] Conversación con el asistente — folio 3856-01 — abogado@ejemplo.mx');
    assert.equal(asuntoAviso({ ...d, tipo: 'continuacion' }), c.subject);   // mismo hilo en Gmail
    assert.equal(c.headers?.References, '<reporte-3856-01@iurexia.com>');
    assert.equal(c.replyTo, 'abogado@ejemplo.mx');
    assert.match(c.html, /Otros folios/);
    assert.doesNotMatch(c.html + c.text, /David|fundador|Alc[aá]ntar/i);
    assert.equal(d.conversacion.length, 2);
    assert.equal(d.conversacion[1].texto, '¿qué error ve?\nlínea 2');
    assert.equal(claveDeAviso(d), 'aviso-soporte/3856-01/2/p');
});
await prueba('la escalada conserva su asunto de siempre', () =>
    assert.equal(asuntoAviso({ tipo: 'escalado', motivo: 'Soporte no pudo resolverlo', folio: '721-07', correo: 'a@b.mx' }),
        '[Soporte] Soporte no pudo resolverlo — folio 721-07 — a@b.mx'));

console.log(`\n${pasadas} pruebas pasadas${process.exitCode ? ', con fallos' : ''}.`);
