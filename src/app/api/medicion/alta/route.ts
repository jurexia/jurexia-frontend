/**
 * POST /api/medicion/alta — el origen de un alta nueva y su CompleteRegistration
 * por la API de Conversiones de Meta (6-oct-2026).
 *
 * Lo llama el navegador una sola vez, justo después de crearse la cuenta (por
 * correo o al volver de Google/Apple): ver `medirAlta` en `@/lib/origen-alta`.
 *
 * QUIÉN ES QUIÉN
 * --------------
 * El usuario sale del token de la sesión, nunca del cuerpo: un `user_id` en el
 * cuerpo permitiría escribir el origen de otra cuenta. Y sólo cuenta como alta
 * una cuenta creada hace menos de `VENTANA_ALTA_MS` según el reloj del servidor:
 * entrar con Google a una cuenta vieja no es registrarse.
 *
 * UNA VEZ
 * -------
 * `altas_origen` se escribe con ON CONFLICT DO NOTHING: el primer contacto no
 * se sobrescribe y, si la fila ya existía, el evento ya se mandó y no se repite.
 *
 * PERMISO
 * -------
 * `fbc`, `fbp` y el agente de usuario sólo se guardan, y el evento sólo va a
 * Meta, si el usuario dio permiso de Marketing en el aviso de cookies. Sin él
 * se guarda sólo la atribución propia (utm, fbclid, página y referrer).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { construirEvento, enviarEventosMeta, ipDelCliente } from '@/lib/meta-capi';
import { VENTANA_ALTA_MS } from '@/lib/origen-alta';

export const dynamic = 'force-dynamic';

const SITIO = 'https://www.iurexia.com';
const CAMPOS_TEXTO = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'landing_path', 'referrer'] as const;

function texto(v: unknown, largo = 200): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t ? t.slice(0, largo) : null;
}

/** `fb.1.<ms>.<fbclid>` */
function fbcValido(v: unknown): string | null {
    const t = texto(v, 600);
    return t && /^fb\.\d\.\d{10,}\.\S+$/.test(t) ? t : null;
}

/** `fb.1.<ms>.<aleatorio>` (las versiones nuevas del píxel pueden añadir un sufijo). */
function fbpValido(v: unknown): string | null {
    const t = texto(v, 200);
    return t && /^fb\.\d\.\d{10,}\.\S+$/.test(t) ? t : null;
}

function fechaValida(v: unknown): string | null {
    const t = texto(v, 40);
    if (!t) return null;
    const ms = Date.parse(t);
    // Ni ilegible ni en el futuro (con un día de holgura por relojes locales).
    if (!Number.isFinite(ms) || ms > Date.now() + 24 * 3600 * 1000) return null;
    return new Date(ms).toISOString();
}

/** Sólo páginas de Iurexia (o localhost), sin query: la del callback lleva el `code` de OAuth. */
function urlDelEvento(v: unknown): string {
    const t = texto(v, 500);
    if (!t) return `${SITIO}/registro`;
    try {
        const u = new URL(t);
        const h = u.hostname;
        const propia = h === 'iurexia.com' || h.endsWith('.iurexia.com') || h === 'localhost';
        return propia ? `${u.origin}${u.pathname}` : `${SITIO}/registro`;
    } catch {
        return `${SITIO}/registro`;
    }
}

export async function POST(req: NextRequest) {
    const cabecera = req.headers.get('authorization') ?? '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: sesion, error: eSesion } = await anon.auth.getUser(token);
    const usuario = sesion?.user;
    if (eSesion || !usuario) {
        return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
    }

    const creado = Date.parse(usuario.created_at ?? '');
    if (!Number.isFinite(creado) || Date.now() - creado > VENTANA_ALTA_MS) {
        return NextResponse.json({ registrada: false, motivo: 'no_es_alta_nueva' });
    }

    const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;
    const origen = (cuerpo.origen && typeof cuerpo.origen === 'object' ? cuerpo.origen : {}) as Record<string, unknown>;
    const marketing = cuerpo.consiente_marketing === true;

    const fbc = marketing ? (fbcValido(cuerpo.fbc) ?? fbcValido(origen.fbc)) : null;
    const fbp = marketing ? fbpValido(cuerpo.fbp) : null;
    const agente = marketing ? texto(req.headers.get('user-agent'), 500) : null;

    const fila: Record<string, unknown> = {
        user_id: usuario.id,
        primer_contacto: fechaValida(origen.primer_contacto),
        fbc,
        fbp,
        user_agent: agente,
        consiente_marketing: marketing,
    };
    for (const c of CAMPOS_TEXTO) fila[c] = texto(origen[c], c === 'fbclid' || c === 'gclid' ? 500 : 200);

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ON CONFLICT DO NOTHING: sólo devuelve la fila si la insertó ahora.
    let nueva = true;
    let guardada = false;
    try {
        const { data, error } = await admin
            .from('altas_origen')
            .upsert(fila, { onConflict: 'user_id', ignoreDuplicates: true })
            .select('user_id');
        if (error) {
            // Sin la tabla (migración pendiente) o fallo de la base: se mide
            // igual. El navegador sólo llama una vez y Meta deduplica por event_id.
            console.error(`[medicion/alta] no se guardó el origen (${error.code ?? 'sin código'})`);
        } else {
            guardada = true;
            nueva = Array.isArray(data) && data.length > 0;
        }
    } catch {
        console.error('[medicion/alta] no se guardó el origen (excepción)');
    }

    if (!nueva) return NextResponse.json({ registrada: false, motivo: 'ya_registrada' });

    let meta: string = 'sin_permiso';
    if (marketing) {
        const r = await enviarEventosMeta([
            construirEvento({
                nombre: 'CompleteRegistration',
                eventId: `reg_${usuario.id}`,
                url: urlDelEvento(cuerpo.url),
                usuario: {
                    email: usuario.email,
                    externalId: usuario.id,
                    fbc,
                    fbp,
                    ip: ipDelCliente(req.headers.get('x-forwarded-for'), req.headers.get('x-real-ip')),
                    userAgent: agente,
                },
            }),
        ]);
        meta = r.enviado ? 'enviado' : (r.motivo ?? 'no_enviado');
    }

    return NextResponse.json({ registrada: true, guardada, meta });
}
