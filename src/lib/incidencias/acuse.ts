/**
 * El acuse al usuario (16-oct-2026). Lo llaman las dos vueltas del circuito:
 * la diaria (/api/cron/incidencias) y la ligera cada dos horas
 * (/api/cron/incidencias-acuse). Ver `correoAcuse` para qué dice.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { correoAcuse, SIN_ACUSE } from './correos';
import { esPrueba } from '../correo/segmentos';

/** Tope de acuses por vuelta: el atraso de septiembre se reparte en varias. */
const MAXIMO_ACUSES = 30;

/** Lo más viejo que todavía recibe acuse. Un «lo recibimos» de hace dos meses ya no ayuda. */
const DIAS_ACUSE = 30;

export async function acusar(
    cliente: SupabaseClient,
    resend: Resend | null,
    remitente: string,
    simulacro: boolean,
): Promise<Record<string, unknown>> {
    if (process.env.INCIDENCIAS_ACUSES_PAUSA === '1') return { pausado: true };

    const desde = new Date(Date.now() - DIAS_ACUSE * 86400_000).toISOString();
    const { data, error } = await cliente
        .from('incidencias')
        .select('id, folio, user_email, familia, clase, confianza, creado_at')
        .is('acuse_at', null)
        .is('cierre_at', null)
        .not('user_email', 'is', null)
        .not('familia', 'in', `(${[...SIN_ACUSE].join(',')})`)
        .gte('creado_at', desde)
        .order('creado_at', { ascending: false })
        .limit(MAXIMO_ACUSES * 3);
    if (error) return { error: error.message };

    // Uno por persona y vuelta: quien mandó cinco mensajes seguidos sobre lo
    // mismo recibe UN acuse, no cinco. Los demás se marcan con el mismo sello.
    type Fila = { id: string; folio: string | null; user_email: string; familia: string;
        clase: string; confianza: number | null; creado_at: string };
    const porPersona = new Map<string, Fila[]>();
    for (const f of (data ?? []) as Fila[]) {
        const e = f.user_email.trim().toLowerCase();
        // Triaje con poca confianza: lo mira un humano antes, no se le escribe a ciegas.
        if (esPrueba(e) || (f.confianza ?? 1) < 0.5) continue;
        porPersona.set(e, [...(porPersona.get(e) ?? []), f]);
    }

    const correos = [...porPersona.keys()].slice(0, MAXIMO_ACUSES);
    const perfiles = new Map<string, { full_name: string | null; tratamiento: string | null }>();
    if (correos.length) {
        const { data: ps } = await cliente.from('user_profiles')
            .select('email, full_name, tratamiento').in('email', correos);
        for (const p of (ps ?? []) as Array<{ email: string; full_name: string | null; tratamiento: string | null }>) {
            perfiles.set(p.email.toLowerCase(), p);
        }
    }

    const enviados: Array<{ clase: string; folio: string | null; dias: number }> = [];
    const errores: string[] = [];
    for (const email of correos) {
        const filas = porPersona.get(email)!;
        // De varias, la que más pesa: un fallo manda sobre una duda de ley,
        // y ésta sobre una pregunta de soporte.
        const orden = ['defecto', 'calidad', 'soporte', 'mejora'];
        const principal = [...filas].sort((a, b) => orden.indexOf(a.familia) - orden.indexOf(b.familia))[0];
        const masVieja = filas.reduce((m, f) => (f.creado_at < m ? f.creado_at : m), principal.creado_at);
        const dias = Math.floor((Date.now() - new Date(masVieja).getTime()) / 86400_000);
        const p = perfiles.get(email);
        const correo = correoAcuse({
            nombre: p?.full_name ?? null, email, tratamiento: p?.tratamiento ?? null,
            familia: principal.familia, clase: principal.clase, folio: principal.folio,
            diasDeRetraso: dias,
        });
        if (!simulacro) {
            const { error: e } = await resend!.emails.send({
                from: remitente, to: email, replyTo: 'soporte@iurexia.com',
                subject: correo.asunto, html: correo.html, text: correo.texto,
            });
            if (e) { errores.push(`${principal.folio ?? principal.id}: ${e.message}`); continue; }
            await cliente.from('incidencias')
                .update({ acuse_at: new Date().toISOString() })
                .in('id', filas.map(f => f.id));
            await new Promise(r => setTimeout(r, 600));   // Resend: 2/s
        }
        enviados.push({ clase: principal.clase, folio: principal.folio, dias });
    }

    return {
        cuantos: enviados.length,
        enviado: !simulacro,
        por_familia: enviados.reduce<Record<string, number>>((m, x) => {
            const fam = x.clase.split('/')[0]; m[fam] = (m[fam] ?? 0) + 1; return m;
        }, {}),
        pendientes_tras_vuelta: Math.max(0, porPersona.size - correos.length),
        errores,
    };
}
