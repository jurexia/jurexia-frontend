/**
 * Soporte conversacional de Iurexia.
 *
 * POR QUÉ VIVE AQUÍ Y NO EN main.py
 * ---------------------------------
 * Tres razones, en orden de peso:
 *   1. La clave de OpenRouter se queda en el servidor de Next y no viaja al
 *      navegador.
 *   2. El soporte NO comparte destino con el chat legal. Ese es el camino
 *      crítico del producto y ya se ha caído por despliegues ajenos a él.
 *   3. Publicar un cambio de soporte no reinicia el API ni corta una consulta
 *      en curso.
 *
 * LA REGLA DE LOS CINCO MENSAJES
 * ------------------------------
 * Se cuenta AQUÍ, con el historial que llega en la petición, y no en el
 * navegador: allá el usuario la puede burlar recargando. Al quinto turno del
 * usuario sin solución —o antes, si el modelo declara que no sabe— la
 * conversación se manda a soporte@iurexia.com y se le dice al usuario que ya
 * está en manos del equipo. Nunca se le deja esperando sin saber.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { conocimientoParaPrompt, exigeEquipo } from '@/lib/soporte/conocimiento';

export const runtime = 'nodejs';
export const maxDuration = 30;

/* Medido contra producción el 7-ago-2026 con una queja real de un usuario.
   No es el más barato del catálogo —`ling-2.6-flash` cuesta diez veces menos—
   pero ese TUTEA al abogado por más que el prompt le pida usted, y con un
   litigante mexicano eso se pierde en la primera línea. La diferencia son 36
   centavos de dólar por cada mil conversaciones. */
const MODELO = process.env.SOPORTE_MODELO || 'google/gemini-2.5-flash-lite';
const MAX_TURNOS_USUARIO = 5;
const CORREO_SOPORTE = 'soporte@iurexia.com';

interface Turno { rol: 'usuario' | 'soporte'; texto: string }

function sistema(): string {
    return [
        'Eres quien atiende soporte en Iurexia, una plataforma legal mexicana usada por abogados.',
        '',
        'CÓMO HABLAS',
        '· Español de México, de USTED siempre. Nunca tutees.',
        '· Cálido y directo. Máximo cuatro líneas, sin listas salvo que sean pasos.',
        '· Escribes como una persona del equipo, no como un manual.',
        '· Si el usuario está molesto, lo reconoces antes de explicar nada.',
        '',
        'LÍMITES QUE NO CRUZAS',
        '· NUNCA menciones modelos de inteligencia artificial, proveedores, bases de datos,',
        '  nombres de servicios ni cómo está construida la plataforma. Si preguntan, dices',
        '  que no es información que manejes y sigues con su problema.',
        '· NUNCA inventes una causa. Si no sabes por qué falla, lo dices y lo escalas.',
        '· NUNCA prometas plazos concretos de corrección.',
        '· No das asesoría jurídica: para eso está el chat de Iurexia.',
        '',
        'LO QUE SABES RESOLVER',
        conocimientoParaPrompt(),
        '',
        'CUÁNDO ESCALAR',
        'Si tras un par de intercambios no tienes una solución clara, o el usuario reporta',
        'algo que sólo el equipo puede revisar, termina tu mensaje con la marca exacta',
        '[ESCALAR] en una línea aparte. El sistema se encarga del resto; tú sólo avisas al',
        'usuario de que lo pasas al equipo y de que le escribirán a su correo.',
    ].join('\n');
}

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

function escaparHtml(s: string): string {
    return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function avisarAlEquipo(datos: {
    correo?: string | null; nombre?: string | null; userId?: string | null;
    plan?: string | null; conversacion: Turno[]; motivo: string; navegador?: string | null;
}) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) return false;

    const hilo = datos.conversacion
        .map(t => `<p style="margin:0 0 10px"><strong style="color:${t.rol === 'usuario' ? '#1a1a1a' : '#8a6d2e'}">` +
            `${t.rol === 'usuario' ? 'Usuario' : 'Soporte'}:</strong> ${escaparHtml(t.texto)}</p>`)
        .join('');

    const html = `
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px;color:#1a1a1a">
  <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6d2e;margin:0 0 6px">Soporte · escalado automático</p>
  <h2 style="font-family:Georgia,serif;font-size:19px;margin:0 0 14px">${escaparHtml(datos.motivo)}</h2>
  <table style="font-size:13px;border-collapse:collapse;margin-bottom:18px">
    <tr><td style="padding:3px 14px 3px 0;color:#666">Usuario</td><td>${escaparHtml(datos.nombre || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">Correo</td><td><a href="mailto:${escaparHtml(datos.correo || '')}">${escaparHtml(datos.correo || '—')}</a></td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">Plan</td><td>${escaparHtml(datos.plan || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">ID</td><td style="font-family:monospace;font-size:11px">${escaparHtml(datos.userId || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;color:#666">Navegador</td><td style="font-size:11px">${escaparHtml((datos.navegador || '—').slice(0, 120))}</td></tr>
  </table>
  <div style="border-left:3px solid #c9a962;padding-left:14px;font-size:13px;line-height:1.6">${hilo}</div>
  <p style="margin-top:20px;font-size:12px;color:#888">
    Responda directamente a este correo: llega al abogado.
  </p>
</div>`;

    try {
        await new Resend(clave).emails.send({
            from: 'Soporte Iurexia <soporte@iurexia.com>',
            to: [CORREO_SOPORTE],
            replyTo: datos.correo || undefined,
            subject: `[Soporte] ${datos.motivo} — ${datos.correo || 'sin correo'}`,
            html,
        });
        return true;
    } catch (e) {
        console.error('[soporte] no pude avisar al equipo:', e);
        return false;
    }
}

export async function POST(req: NextRequest) {
    let cuerpo: {
        conversacion?: Turno[]; userId?: string; email?: string;
        nombre?: string; plan?: string;
    };
    try {
        cuerpo = await req.json();
    } catch {
        return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
    }

    const conversacion = (cuerpo.conversacion || []).slice(-12);
    const ultimo = [...conversacion].reverse().find(t => t.rol === 'usuario');
    if (!ultimo?.texto?.trim()) {
        return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 });
    }

    const turnosUsuario = conversacion.filter(t => t.rol === 'usuario').length;
    const navegador = req.headers.get('user-agent');

    const comun = {
        correo: cuerpo.email, nombre: cuerpo.nombre,
        userId: cuerpo.userId, plan: cuerpo.plan,
        conversacion, navegador,
    };

    // Se guarda SIEMPRE, responda quien responda: el panel de admin tiene que
    // seguir viendo todo lo que reporta la gente.
    const guardar = async (texto: string, categoria: string) => {
        if (!cuerpo.userId) return;
        try {
            await admin().from('user_feedback').insert({
                user_id: cuerpo.userId,
                user_email: cuerpo.email || null,
                user_name: cuerpo.nombre || null,
                category: categoria,
                message: texto,
            });
        } catch (e) {
            console.error('[soporte] no pude guardar el reporte:', e);
        }
    };

    // ── Tope duro: al quinto turno se escala, diga lo que diga el modelo ──
    if (turnosUsuario > MAX_TURNOS_USUARIO) {
        await avisarAlEquipo({ ...comun, motivo: 'Sin resolver tras cinco mensajes' });
        await guardar(ultimo.texto.trim(), 'error');
        return NextResponse.json({
            respuesta:
                'Prefiero no hacerle perder más tiempo: esto lo tiene que ver el equipo. ' +
                'Ya les pasé toda nuestra conversación y le escribirán a su correo. Disculpe la vuelta.',
            escalado: true,
            cerrado: true,
        });
    }

    const clave = process.env.OPENROUTER_API_KEY;
    if (!clave) {
        await avisarAlEquipo({ ...comun, motivo: 'Soporte sin motor configurado' });
        await guardar(ultimo.texto.trim(), 'error');
        return NextResponse.json({
            respuesta:
                'Ahora mismo no puedo atenderle por aquí, así que mandé su mensaje directamente al equipo. ' +
                'Le escribirán a su correo.',
            escalado: true, cerrado: true,
        });
    }

    let texto = '';
    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${clave}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://www.iurexia.com',
                'X-Title': 'Iurexia Soporte',
            },
            body: JSON.stringify({
                model: MODELO,
                max_tokens: 320,
                temperature: 0.3,
                messages: [
                    { role: 'system', content: sistema() },
                    ...conversacion.map(t => ({
                        role: t.rol === 'usuario' ? 'user' : 'assistant',
                        content: t.texto,
                    })),
                ],
            }),
        });
        if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
        const d = await r.json();
        texto = (d?.choices?.[0]?.message?.content || '').trim();
    } catch (e) {
        // El motor falló: NO se le deja sin respuesta. Se escala y se le dice.
        console.error('[soporte] motor caído:', e);
        await avisarAlEquipo({ ...comun, motivo: 'Soporte no disponible — escalado directo' });
        await guardar(ultimo.texto.trim(), 'error');
        return NextResponse.json({
            respuesta:
                'Se me complicó revisarlo desde aquí, así que ya mandé su mensaje al equipo con todo el detalle. ' +
                'Le responderán a su correo.',
            escalado: true, cerrado: true,
        });
    }

    // El modelo pide ayuda, o el tema exige que el equipo lo vea igual.
    const pidioEscalar = /\[ESCALAR\]/i.test(texto);
    const temaDelicado = exigeEquipo(ultimo.texto);
    const escalado = pidioEscalar || temaDelicado;

    texto = texto.replace(/\[ESCALAR\]/gi, '').trim();
    if (!texto) {
        texto = 'Déjeme pasarlo al equipo para revisarlo con calma. Le escribirán a su correo.';
    }

    if (escalado) {
        await avisarAlEquipo({
            ...comun,
            motivo: pidioEscalar ? 'Soporte no pudo resolverlo' : 'Tema que requiere revisión del equipo',
        });
    }

    await guardar(ultimo.texto.trim(), escalado ? 'error' : 'otro');

    return NextResponse.json({
        respuesta: texto,
        escalado,
        cerrado: pidioEscalar,
        turnosRestantes: Math.max(0, MAX_TURNOS_USUARIO - turnosUsuario),
    });
}
