/* Reúne lo que muestra la pestaña Finanzas: Stripe para lo cobrado y las tablas
   `finanzas_*` para lo gastado. Un mes cerrado no cambia, así que su resumen de
   Stripe se guarda en `finanzas_meses` y sólo el mes en curso se pide cada vez. */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import {
    armarCalendario, calcularMes, ConfigFinanzas, hoyMexico, mesSiguiente, MesStripe, Movimiento, Proveedor,
    resumirStripe, TxStripe, venceImpuesto,
} from './calculo';

export function servicioFinanzas(): SupabaseClient {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Tipo de cambio de la fecha (ECB vía Frankfurter); si no responde, el de respaldo. */
export async function tipoCambio(fecha: string, respaldo: number) {
    try {
        const r = await fetch(`https://api.frankfurter.dev/v1/${fecha}?base=USD&symbols=MXN`,
            { signal: AbortSignal.timeout(4000), cache: 'no-store' });
        if (r.ok) {
            const j = await r.json();
            const v = j?.rates?.MXN;
            if (typeof v === 'number' && v > 5 && v < 60) return { valor: v, fuente: String(j.date) };
        }
    } catch { /* cae al respaldo */ }
    return { valor: respaldo, fuente: 'respaldo' };
}

const inicioDeMes = (mes: string) => Math.floor(Date.parse(`${mes}-01T06:00:00Z`) / 1000);

async function stripeDelMes(mes: string): Promise<MesStripe> {
    const stripe = getStripe();
    const txs: TxStripe[] = [];
    const lista = stripe.balanceTransactions.list({
        created: { gte: inicioDeMes(mes), lt: inicioDeMes(mesSiguiente(mes)) }, limit: 100,
    });
    for await (const t of lista) txs.push(t as unknown as TxStripe);
    return resumirStripe(mes, txs);
}

async function stripePorMes(db: SupabaseClient, primerMes: string, mesActual: string) {
    const { data: guardados } = await db.from('finanzas_meses').select('mes,datos');
    const cache = new Map<string, MesStripe>((guardados ?? []).map((f: any) => [f.mes, f.datos]));
    const salida: MesStripe[] = [];
    for (let m = primerMes; m <= mesActual; m = mesSiguiente(m)) {
        if (m < mesActual && cache.has(m)) { salida.push(cache.get(m)!); continue; }
        const r = await stripeDelMes(m);
        salida.push(r);
        if (m < mesActual) await db.from('finanzas_meses').upsert({ mes: m, datos: r });
    }
    return salida;
}

export async function armarFinanzas(db: SupabaseClient) {
    const [cfgR, provR, movR] = await Promise.all([
        db.from('finanzas_config').select('*').eq('id', 1).single(),
        db.from('finanzas_proveedores').select('*').order('orden'),
        db.from('finanzas_movimientos').select('*').order('fecha', { ascending: false }).limit(3000),
    ]);
    if (cfgR.error) throw new Error(`finanzas_config: ${cfgR.error.message}`);
    if (provR.error) throw new Error(`finanzas_proveedores: ${provR.error.message}`);
    if (movR.error) throw new Error(`finanzas_movimientos: ${movR.error.message}`);

    const config = cfgR.data as ConfigFinanzas & { primer_mes_stripe: string };
    const proveedores = (provR.data ?? []) as Proveedor[];
    const movimientos = ((movR.data ?? []) as Movimiento[]).map((m) => ({
        ...m, monto: Number(m.monto), iva: Number(m.iva ?? 0), tipo_cambio: m.tipo_cambio === null ? null : Number(m.tipo_cambio),
    }));
    for (const p of proveedores) p.presupuesto = Number(p.presupuesto);

    const hoy = hoyMexico();
    const mesActual = hoy.slice(0, 7);
    const tc = await tipoCambio('latest', Number(config.tc_respaldo));
    const stripe = await stripePorMes(db, config.primer_mes_stripe, mesActual);

    const todos = stripe.map((s) => calcularMes({
        mes: s.mes, stripe: s, movimientos, proveedores, tc: tc.valor, regimen: config.regimen, parcial: s.mes === mesActual,
    }));

    const pagadoHasta = config.impuestos_pagados_hasta;
    const debe = (mes: string) => !pagadoHasta || mes > pagadoHasta;
    const impuestoDe = (mes: string) => {
        const m = todos.find((x) => x.mes === mes);
        return m && !m.parcial && debe(mes) ? m.total_impuestos : null;
    };

    // Lo que ya venció sin marcarse como pagado; el mes cuyo plazo corre va en el calendario.
    const pendientes = todos.filter((m) => !m.parcial && venceImpuesto(m.mes) < hoy && debe(m.mes));
    const rezago = {
        meses: pendientes.map((m) => ({ mes: m.mes, cobrado_neto: m.cobrado_neto, iva: m.iva, isr: m.isr })),
        iva: pendientes.reduce((s, m) => s + m.iva, 0),
        isr: pendientes.reduce((s, m) => s + m.isr, 0),
    };

    return {
        hoy, tc, config, proveedores, movimientos,
        meses: todos.filter((m) => m.mes >= config.primer_mes),
        rezago,
        calendario: armarCalendario({ hoy, horizonte: 45, proveedores, movimientos, tc: tc.valor, impuestoDe }),
    };
}
