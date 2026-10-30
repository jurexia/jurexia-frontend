/**
 * LO QUE PASA EN EL BUZÓN DE soporte@, contado por su Apps Script (29-oct-2026).
 *
 * El servidor no puede leer Gmail; el Apps Script que ya corre en soporte@
 * cada 10 minutos sí. Este endpoint recibe lo que vio —«salió una respuesta
 * a fulano», «fulano volvió a escribir»— y mueve el estado de cada reporte:
 * pendiente → respondido, o respondido → pendiente si el abogado insiste.
 * Nadie marca nada a mano: contestar desde soporte@ ES marcarlo.
 *
 * QUIÉN PUEDE LLAMAR: la cuenta de Google soporte@iurexia.com, y sin secreto
 * compartido. El script manda `Authorization: Bearer <token>`, con el token
 * de identidad que Google firma para la cuenta que lo ejecuta
 * (`ScriptApp.getIdentityToken()`); aquí se verifica la firma con las llaves
 * públicas de Google y se exige ese correo, verificado (`autorizarAtencion`,
 * en lib/soporte/identidad-google.ts). No hay clave que escribir en Vercel ni
 * en el script. Si Vercel tiene SOPORTE_ATENCION_KEY, la clave de antes
 * (`x-atencion-key`) sigue valiendo; si no, la identidad es la única vía.
 * Todo lo demás: 401 (503 sólo si Google no dio sus llaves).
 *
 * LA AUDIENCIA. El `aud` del token es el client ID del proyecto de Apps
 * Script. Mientras `AUDIENCIAS` esté vacía se acepta cualquiera, y con ello
 * también un token de soporte@ emitido para otra aplicación; la primera que
 * llega a cada instancia se escribe en el registro de Vercel
 * («[soporte/atencion] identidad aceptada … aud=…»). Para fijarla se copia
 * aquí: no es un secreto.
 *
 * Con esta vía no se manda un correo ni se lee un dato: sólo se cambia el
 * estado de atención. El script manda las mismas observaciones en varias
 * vueltas; aplicarlas dos veces no cambia nada (ver `aplicarObservacion`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aplicarObservaciones } from '@/lib/soporte/reportes';
import { autorizarAtencion, audienciaNueva } from '@/lib/soporte/identidad-google';
import type { Observacion } from '@/lib/soporte/atencion-logica';

export const runtime = 'nodejs';   // node:crypto verifica la firma
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAXIMO = 500;

/** Los `aud` aceptados (client ID del proyecto «Soporte automático»). Vacía: cualquiera, y se registra. */
const AUDIENCIAS: readonly string[] = [
    // «Soporte automático» en soporte@iurexia.com: el de su primera llamada (29-oct-2026, hd=iurexia.com).
    '416982491944-k8dc8oedacluuq924b8k708mi9u7usmn.apps.googleusercontent.com',
];

function limpia(o: unknown): Observacion | null {
    if (!o || typeof o !== 'object') return null;
    const x = o as Record<string, unknown>;
    if (x.tipo !== 'respuesta' && x.tipo !== 'usuario') return null;
    const fecha = typeof x.fecha === 'string' && !Number.isNaN(Date.parse(x.fecha)) ? new Date(x.fecha).toISOString() : null;
    if (!fecha) return null;
    const correos = (Array.isArray(x.correos) ? x.correos : [])
        .filter((c): c is string => typeof c === 'string' && /^[^\s@]+@[^\s@]+$/.test(c.trim()))
        .map(c => c.trim().toLowerCase()).slice(0, 20);
    const folios = (Array.isArray(x.folios) ? x.folios : [])
        .filter((f): f is string => typeof f === 'string' && /^\d{1,6}-\d{2}$/.test(f)).slice(0, 20);
    if (!correos.length && !folios.length) return null;
    return {
        tipo: x.tipo, fecha, correos, folios,
        hilo: typeof x.hilo === 'string' ? x.hilo.slice(0, 64) : null,
    };
}

export async function POST(req: NextRequest) {
    const quien = await autorizarAtencion(
        { authorization: req.headers.get('authorization'), clave: req.headers.get('x-atencion-key') },
        { clave: process.env.SOPORTE_ATENCION_KEY, audiencias: AUDIENCIAS },
    );
    if (!quien.ok) {
        console.warn(`[soporte/atencion] ${quien.status}: ${quien.motivo}`
            + `${quien.email ? ` · email=${quien.email}` : ''}${quien.aud ? ` · aud=${quien.aud}` : ''}`);
        return NextResponse.json(
            { error: quien.status === 503 ? 'no se pudo verificar la identidad' : 'no autorizado', motivo: quien.motivo },
            { status: quien.status },
        );
    }
    if (quien.via === 'identidad' && audienciaNueva(quien.identidad.aud)) {
        const { email, aud, azp, hd } = quien.identidad;
        console.log(`[soporte/atencion] identidad aceptada: ${email} · aud=${aud}`
            + `${azp && azp !== aud ? ` · azp=${azp}` : ''}${hd ? ` · hd=${hd}` : ''}`
            + (AUDIENCIAS.length ? '' : ' · sin fijar: cópiela en AUDIENCIAS de src/app/api/soporte/atencion/route.ts'));
    }

    let cuerpo: { observaciones?: unknown[] };
    try { cuerpo = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

    const observaciones = (Array.isArray(cuerpo.observaciones) ? cuerpo.observaciones : [])
        .slice(0, MAXIMO).map(limpia).filter((o): o is Observacion => !!o);
    if (!observaciones.length) return NextResponse.json({ observaciones: 0, cambios: [] });

    const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
    const res = await aplicarObservaciones(sb, observaciones);
    if ('error' in res) return NextResponse.json(res, { status: 500 });
    return NextResponse.json(res);
}
