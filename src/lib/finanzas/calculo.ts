/**
 * Las cuentas de la pestaña Finanzas. Funciones puras: sin base de datos, sin
 * Stripe y sin cifras de la empresa, porque este repositorio es público. Los
 * montos, los nombres y las tarjetas viven en las tablas `finanzas_*`.
 *
 * LO QUE ES UN ESTIMADO. El impuesto de cada mes se calcula para saber cuánto
 * apartar, no para presentar la declaración. Art. 106 LISR acumula de enero al
 * mes declarado; aquí se aplica la tarifa mensual a ese mes solo, que da lo
 * mismo cuando la utilidad es pareja y se aleja cuando sube y baja.
 */

export type Categoria = 'infraestructura' | 'ia' | 'herramientas' | 'publicidad' | 'otros';
export type Deducible = 'si' | 'pendiente' | 'no';
export type Regimen = 'actividad_empresarial' | 'resico';

export interface Proveedor {
    id: string; nombre: string; categoria: Categoria; tipo_cobro: 'fijo' | 'uso' | 'recarga' | 'campana';
    dia_cobro: number | null; moneda: 'USD' | 'MXN'; presupuesto: number; deducible: Deducible;
    a_nombre: string | null; tarjeta: string | null; por_confirmar: boolean; nota: string | null;
    activo: boolean; orden: number;
}

export interface Movimiento {
    id: string; proveedor_id: string; tipo: 'gasto' | 'ingreso'; fecha: string; monto: number;
    moneda: 'USD' | 'MXN'; tipo_cambio: number | null; iva: number; concepto: string | null;
}

export interface MesStripe {
    mes: string; cobrado: number; devoluciones: number; comisiones: number; iva_comisiones: number; cargos: number;
}

export interface ConfigFinanzas {
    regimen: Regimen; correos_aviso: string[]; tc_respaldo: number; primer_mes: string;
    impuestos_pagados_hasta: string | null; titular: string | null;
}

/** Lo mínimo de una transacción de saldo de Stripe que importa aquí. */
export interface TxStripe {
    type: string; amount: number; fee: number; created: number;
    fee_details?: { type: string; amount: number }[];
}

const DEVOLUCION = new Set(['refund', 'payment_refund', 'payment_failure_refund', 'adjustment', 'dispute']);
const COBRO = new Set(['charge', 'payment']);

/** Mes de México (UTC-6 todo el año desde 2022) de un instante de Stripe. */
export const mesDe = (segundos: number) => new Date((segundos - 6 * 3600) * 1000).toISOString().slice(0, 7);

export function resumirStripe(mes: string, txs: TxStripe[]): MesStripe {
    let cobrado = 0, devoluciones = 0, comisiones = 0, iva = 0, cargos = 0;
    for (const t of txs) {
        if (COBRO.has(t.type)) { cobrado += t.amount; cargos += 1; }
        else if (DEVOLUCION.has(t.type)) devoluciones += t.amount;
        // La cuota de Billing llega como movimiento propio, en negativo.
        else if (t.type === 'stripe_fee') comisiones -= t.amount;
        comisiones += t.fee;
        for (const d of t.fee_details ?? []) if (d.type === 'tax') iva += d.amount;
    }
    return { mes, cobrado: cobrado / 100, devoluciones: devoluciones / 100, comisiones: comisiones / 100, iva_comisiones: iva / 100, cargos };
}

/* Anexo 8 RMF 2026 (DOF 28-dic-2025), art. 96 LISR: límite inferior, cuota fija, % sobre el excedente. */
const TARIFA_MENSUAL: [number, number, number][] = [
    [0.01, 0, 1.92], [844.60, 16.22, 6.40], [7168.52, 420.95, 10.88], [12598.03, 1011.68, 16],
    [14644.65, 1339.14, 17.92], [17533.65, 1856.84, 21.36], [35362.84, 5665.16, 23.52],
    [55736.69, 10457.09, 30], [106410.51, 25659.23, 32], [141880.67, 37009.69, 34], [425642, 133488.54, 35],
];

export function isrTarifaMensual(base: number): number {
    if (base <= 0) return 0;
    let fila = TARIFA_MENSUAL[0];
    for (const f of TARIFA_MENSUAL) if (base >= f[0]) fila = f;
    return fila[1] + (base - fila[0]) * fila[2] / 100;
}

/* Art. 113-E LISR: sobre lo cobrado sin IVA y sin deducciones. */
export function tasaResico(ingresoMensual: number): number {
    if (ingresoMensual <= 25000) return 1;
    if (ingresoMensual <= 50000) return 1.1;
    if (ingresoMensual <= 83333.33) return 1.5;
    if (ingresoMensual <= 208333.33) return 2;
    return 2.5;
}

export function calcularImpuestos(args: {
    cobradoNeto: number; ivaConfirmado: number; ivaPosible: number; deduccionConfirmada: number; deduccionPosible: number;
}) {
    const cobrado = Math.max(0, args.cobradoNeto);
    const sinIva = cobrado / 1.16;
    const trasladado = cobrado - sinIva;
    const empresarial = (ded: number) => isrTarifaMensual(Math.max(0, sinIva - ded));
    const tasa = tasaResico(sinIva);
    return {
        ingreso_sin_iva: sinIva,
        iva: {
            trasladado,
            acreditable: args.ivaConfirmado,
            por_pagar: Math.max(0, trasladado - args.ivaConfirmado),
            por_pagar_si_todo_factura: Math.max(0, trasladado - args.ivaPosible),
        },
        deduccion_confirmada: args.deduccionConfirmada,
        deduccion_posible: args.deduccionPosible,
        isr_empresarial_hoy: empresarial(args.deduccionConfirmada),
        isr_empresarial_si_todo_factura: empresarial(args.deduccionPosible),
        isr_resico: sinIva * tasa / 100,
        tasa_resico: tasa,
    };
}

export const aPesos = (m: Pick<Movimiento, 'monto' | 'moneda' | 'tipo_cambio'>, tc: number) =>
    m.moneda === 'MXN' ? m.monto : m.monto * (m.tipo_cambio ?? tc);

export function calcularMes(args: {
    mes: string; stripe: MesStripe; movimientos: Movimiento[]; proveedores: Proveedor[]; tc: number; regimen: Regimen; parcial: boolean;
}) {
    const { mes, stripe, tc, regimen, parcial } = args;
    const prov = new Map(args.proveedores.map((p) => [p.id, p]));
    const delMes = args.movimientos.filter((m) => m.fecha.startsWith(mes));

    const porProveedor: Record<string, number> = {};
    const porCategoria: Record<string, number> = {};
    let gastos = 0, extra = 0, ivaConf = 0, ivaPos = 0, dedConf = 0, dedPos = 0;
    for (const m of delMes) {
        const pesos = aPesos(m, tc);
        if (m.tipo === 'ingreso') { extra += pesos; continue; }
        const p = prov.get(m.proveedor_id);
        gastos += pesos;
        porProveedor[m.proveedor_id] = (porProveedor[m.proveedor_id] ?? 0) + pesos;
        const cat = p?.categoria ?? 'otros';
        porCategoria[cat] = (porCategoria[cat] ?? 0) + pesos;
        const iva = aPesos({ monto: m.iva || 0, moneda: m.moneda, tipo_cambio: m.tipo_cambio }, tc);
        if (p?.deducible === 'si') { dedConf += pesos - iva; ivaConf += iva; }
        if (p?.deducible !== 'no') { dedPos += pesos - iva; ivaPos += iva; }
    }

    const cobradoNeto = stripe.cobrado + stripe.devoluciones + extra;
    const comisionSinIva = stripe.comisiones - stripe.iva_comisiones;
    const impuestos = calcularImpuestos({
        cobradoNeto,
        ivaConfirmado: ivaConf + stripe.iva_comisiones,
        ivaPosible: ivaPos + stripe.iva_comisiones,
        deduccionConfirmada: dedConf + comisionSinIva,
        deduccionPosible: dedPos + comisionSinIva,
    });
    const isr = regimen === 'resico' ? impuestos.isr_resico : impuestos.isr_empresarial_hoy;
    const iva = impuestos.iva.por_pagar;
    const utilidad = cobradoNeto - stripe.comisiones - gastos;
    return {
        mes, parcial, cobrado: stripe.cobrado, devoluciones: stripe.devoluciones, extra, cobrado_neto: cobradoNeto,
        comisiones: stripe.comisiones, cargos: stripe.cargos, gastos, por_categoria: porCategoria, por_proveedor: porProveedor,
        utilidad, impuestos, iva, isr, total_impuestos: iva + isr, neta: utilidad - iva - isr,
    };
}

/* ── Calendario ─────────────────────────────────────────────────────────── */

const fechaUTC = (iso: string) => new Date(`${iso}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const hoyMexico = (ahora = Date.now()) => new Date(ahora - 6 * 3600_000).toISOString().slice(0, 10);
export const entreDias = (a: string, b: string) => Math.round((fechaUTC(b).getTime() - fechaUTC(a).getTime()) / 86_400_000);
export const mesSiguiente = (mes: string, n = 1) => {
    const [a, m] = mes.split('-').map(Number);
    return iso(new Date(Date.UTC(a, m - 1 + n, 1, 12))).slice(0, 7);
};

function diaDelMes(mes: string, dia: number): string {
    const [a, m] = mes.split('-').map(Number);
    const ultimo = new Date(Date.UTC(a, m, 0, 12)).getUTCDate();
    return iso(new Date(Date.UTC(a, m - 1, Math.min(dia, ultimo), 12)));
}

/** El 17; si cae en sábado o domingo, el lunes (art. 12 CFF). */
export function venceImpuesto(mesDeclarado: string): string {
    const d = fechaUTC(diaDelMes(mesSiguiente(mesDeclarado), 17));
    while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
    return iso(d);
}

export interface EntradaCalendario {
    clave: string; fecha: string; faltan: number; nombre: string; tipo: 'pago' | 'impuesto';
    monto_mxn: number; monto_original: number; moneda: 'USD' | 'MXN'; por_confirmar: boolean; nota: string | null;
}

export function armarCalendario(args: {
    hoy: string; horizonte: number; proveedores: Proveedor[]; movimientos: Movimiento[]; tc: number;
    impuestoDe: (mes: string) => number | null;
}): EntradaCalendario[] {
    const { hoy, horizonte, tc } = args;
    const salida: EntradaCalendario[] = [];
    const mesHoy = hoy.slice(0, 7);

    for (const p of args.proveedores) {
        if (!p.activo || !p.dia_cobro || p.presupuesto <= 0) continue;
        for (let n = 0; n < 3; n++) {
            const fecha = diaDelMes(mesSiguiente(mesHoy, n), p.dia_cobro);
            const faltan = entreDias(hoy, fecha);
            if (faltan < 0 || faltan > horizonte) continue;
            // El cargo real se mueve uno o dos días: ±6 evita anunciar lo ya cobrado.
            const yaPagado = args.movimientos.some((m) => m.proveedor_id === p.id && m.tipo === 'gasto'
                && Math.abs(entreDias(m.fecha, fecha)) <= 6);
            if (yaPagado) continue;
            salida.push({
                clave: `${p.id}:${fecha}`, fecha, faltan, nombre: p.nombre, tipo: 'pago',
                monto_mxn: aPesos({ monto: p.presupuesto, moneda: p.moneda, tipo_cambio: null }, tc),
                monto_original: p.presupuesto, moneda: p.moneda, por_confirmar: p.por_confirmar, nota: p.nota,
            });
        }
    }

    for (let n = -1; n < 2; n++) {
        const mes = mesSiguiente(mesHoy, n);
        const fecha = venceImpuesto(mes);
        const faltan = entreDias(hoy, fecha);
        if (faltan < 0 || faltan > horizonte) continue;
        const monto = args.impuestoDe(mes);
        if (monto === null) continue;
        salida.push({
            clave: `impuestos:${mes}`, fecha, faltan, nombre: `IVA e ISR de ${nombreMes(mes)}`, tipo: 'impuesto',
            monto_mxn: monto, monto_original: monto, moneda: 'MXN', por_confirmar: true,
            nota: 'Estimado para apartar; el monto final sale de la declaración.',
        });
    }
    return salida.sort((a, b) => a.fecha.localeCompare(b.fecha) || b.monto_mxn - a.monto_mxn);
}

const DIAS_AVISO = { pago: [3, 0], impuesto: [7, 3, 0] } as const;

/** Lo que toca avisar hoy. La clave lleva los días que faltan: cada aviso sale una sola vez. */
export function avisosDeHoy(calendario: EntradaCalendario[], enviadas: Set<string>) {
    return calendario
        .filter((e) => (DIAS_AVISO[e.tipo] as readonly number[]).includes(e.faltan))
        .map((e) => ({ ...e, clave_aviso: `${e.clave}:${e.faltan}` }))
        .filter((e) => !enviadas.has(e.clave_aviso));
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
export function fechaEnLetra(f: string) {
    const d = fechaUTC(f);
    return `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}
export const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
