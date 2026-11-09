/* Cada mañana a las 8:00 de la CDMX (14:00 UTC, vercel.json): un solo correo con
   los pagos que vencen en 3 días o hoy, y los impuestos a 7, 3 y 0 días. El día 2
   de cada mes, además, el cierre del mes anterior. Lo enviado se anota en
   `finanzas_avisos`: un cron que corra dos veces no repite. */

import { NextRequest, NextResponse } from 'next/server';
import { armarFinanzas, servicioFinanzas } from '@/lib/finanzas/datos';
import { avisosDeHoy, mesSiguiente } from '@/lib/finanzas/calculo';
import { correoCierre, correoPagos, enviarAviso } from '@/lib/finanzas/correo';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const secreto = process.env.CRON_SECRET;
    if (!secreto || req.headers.get('authorization') !== `Bearer ${secreto}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const db = servicioFinanzas();
    try {
        const datos = await armarFinanzas(db);
        const para = datos.config.correos_aviso;
        if (!para?.length) return NextResponse.json({ ok: true, enviados: 0, motivo: 'sin destinatarios' });

        const { data: filas, error } = await db.from('finanzas_avisos').select('clave');
        if (error) throw new Error(error.message);
        const enviadas = new Set<string>((filas ?? []).map((f: { clave: string }) => f.clave));

        let enviados = 0;
        const hoyToca = avisosDeHoy(datos.calendario, enviadas);
        if (hoyToca.length) {
            const { asunto, html } = correoPagos(hoyToca);
            await enviarAviso(para, asunto, html);
            await db.from('finanzas_avisos').insert(hoyToca.map((e) => ({ clave: e.clave_aviso })));
            enviados += 1;
        }

        const claveCierre = `cierre:${mesSiguiente(datos.hoy.slice(0, 7), -1)}`;
        if (datos.hoy.endsWith('-02') && !enviadas.has(claveCierre)) {
            const mes = datos.meses.find((m) => m.mes === claveCierre.slice(7));
            if (mes) {
                const { asunto, html } = correoCierre(mes);
                await enviarAviso(para, asunto, html);
                await db.from('finanzas_avisos').insert({ clave: claveCierre });
                enviados += 1;
            }
        }
        return NextResponse.json({ ok: true, hoy: datos.hoy, pagos: hoyToca.length, enviados });
    } catch (e) {
        console.error('Finanzas avisos:', e);
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
    }
}
