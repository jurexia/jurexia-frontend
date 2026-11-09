import { NextRequest, NextResponse } from 'next/server';
import { exigirAdmin } from '@/lib/guardia-admin';
import { armarFinanzas, servicioFinanzas, tipoCambio } from '@/lib/finanzas/datos';
import { correoPagos, enviarAviso } from '@/lib/finanzas/correo';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const yo = await exigirAdmin(req);
    if (yo instanceof NextResponse) return yo;
    try {
        return NextResponse.json(await armarFinanzas(servicioFinanzas()));
    } catch (e) {
        console.error('Finanzas:', e);
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
    }
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-\d{2}$/;
const DEDUCIBLE = ['si', 'pendiente', 'no'];

export async function POST(req: NextRequest) {
    const yo = await exigirAdmin(req);
    if (yo instanceof NextResponse) return yo;
    const db = servicioFinanzas();
    const b = await req.json().catch(() => ({}));
    const falla = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

    try {
        if (b.accion === 'registrar') {
            const monto = Number(b.monto);
            const iva = Number(b.iva || 0);
            if (!b.proveedor_id || !FECHA.test(b.fecha || '') || !(monto > 0) || !(iva >= 0) || iva > monto) return falla('Revise proveedor, fecha, monto e IVA.');
            if (!['gasto', 'ingreso'].includes(b.tipo)) return falla('Tipo no válido.');
            const { data: p } = await db.from('finanzas_proveedores').select('moneda').eq('id', b.proveedor_id).single();
            if (!p) return falla('Proveedor no encontrado.');
            const { data: cfg } = await db.from('finanzas_config').select('tc_respaldo').eq('id', 1).single();
            const tc = p.moneda === 'USD' ? (await tipoCambio(b.fecha, Number(cfg?.tc_respaldo ?? 18.7))).valor : null;
            const { error } = await db.from('finanzas_movimientos').insert({
                proveedor_id: b.proveedor_id, tipo: b.tipo, fecha: b.fecha, monto, moneda: p.moneda, tipo_cambio: tc,
                iva, concepto: String(b.concepto || '').slice(0, 200) || null,
            });
            if (error) return falla(error.message, 500);
        } else if (b.accion === 'borrar') {
            if (!b.id) return falla('Falta el movimiento.');
            const { error } = await db.from('finanzas_movimientos').delete().eq('id', b.id);
            if (error) return falla(error.message, 500);
        } else if (b.accion === 'proveedor') {
            const presupuesto = Number(b.presupuesto);
            const dia = b.dia_cobro === '' || b.dia_cobro === null ? null : Number(b.dia_cobro);
            if (!b.id || !(presupuesto >= 0) || (dia !== null && !(dia >= 1 && dia <= 31)) || !DEDUCIBLE.includes(b.deducible)) return falla('Revise presupuesto, día y deducible.');
            const { error } = await db.from('finanzas_proveedores')
                .update({ presupuesto, dia_cobro: dia, deducible: b.deducible, por_confirmar: false }).eq('id', b.id);
            if (error) return falla(error.message, 500);
        } else if (b.accion === 'config') {
            const hasta = b.impuestos_pagados_hasta || null;
            if (!['actividad_empresarial', 'resico'].includes(b.regimen) || (hasta && !MES.test(hasta))) return falla('Configuración no válida.');
            const { error } = await db.from('finanzas_config').update({ regimen: b.regimen, impuestos_pagados_hasta: hasta }).eq('id', 1);
            if (error) return falla(error.message, 500);
        } else if (b.accion === 'probar_aviso') {
            const { calendario } = await armarFinanzas(db);
            if (!calendario.length) return falla('No hay pagos próximos en el calendario.');
            const { asunto, html } = correoPagos(calendario.slice(0, 5), true);
            await enviarAviso([yo.email], asunto, html);
            return NextResponse.json({ ok: true, enviado_a: yo.email });
        } else {
            return falla('Acción desconocida.');
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('Finanzas POST:', e);
        return falla(e instanceof Error ? e.message : 'Error', 500);
    }
}
