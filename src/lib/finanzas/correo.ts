import { boton, caja, envolver, esc, parrafo, rotulo, SITIO } from '@/lib/correo/plantilla';
import { EntradaCalendario, fechaEnLetra, nombreMes, pesos } from './calculo';

const PIE = 'Iurexia · Avisos de finanzas';
const cuando = (n: number) => (n === 0 ? 'HOY' : n === 1 ? 'Mañana' : `En ${n} días`);
const original = (e: EntradaCalendario) => (e.moneda === 'USD' ? ` · ${e.monto_original.toLocaleString('es-MX')} USD` : '');

export function correoPagos(items: EntradaCalendario[], prueba = false) {
    const total = items.reduce((s, e) => s + e.monto_mxn, 0);
    const lista = [...items].sort((a, b) => a.faltan - b.faltan);
    const primero = lista[0];
    const resto = lista.length > 1 ? ` y ${lista.length - 1} más` : '';
    const asunto = `${prueba ? '(Prueba) ' : ''}${cuando(primero.faltan)}: ${primero.nombre} ${pesos(primero.monto_mxn)}${resto}`;
    const bloques = lista.map((e) => caja(
        rotulo(`${cuando(e.faltan)} · ${fechaEnLetra(e.fecha)}`)
        + `<div style="font-size:17px;font-weight:bold;color:#1c1712;margin-bottom:6px;">${esc(e.nombre)}</div>`
        + `<div style="font-size:15px;color:#1c1712;">${pesos(e.monto_mxn)} MXN${esc(original(e))}</div>`
        + (e.por_confirmar ? '<div style="font-size:12px;color:#8b7355;margin-top:4px;">Monto estimado</div>' : '')
        + (e.nota ? `<div style="font-size:13px;color:#5b5348;margin-top:6px;">${esc(e.nota)}</div>` : ''),
    )).join('<div style="height:10px"></div>');
    const cuerpo = (prueba ? parrafo('Este es un aviso de prueba, con los próximos pagos reales del calendario.') : '')
        + parrafo(lista.length === 1 ? 'Se acerca este pago:' : 'Se acercan estos pagos:')
        + bloques
        + (lista.length > 1 ? parrafo(`Total: <strong>${pesos(total)} MXN</strong>.`, '18px 0 0 0') : '')
        + '<div style="height:18px"></div>'
        + boton('Abrir Finanzas', `${SITIO}/admin`);
    return { asunto, html: envolver({ cuerpo, pie: PIE, preencabezado: `Total: ${pesos(total)} MXN` }) };
}

export function correoCierre(m: {
    mes: string; cobrado_neto: number; comisiones: number; gastos: number; iva: number; isr: number; neta: number;
}) {
    const fila = (a: string, b: string, fuerte = false) => `<tr><td style="padding:6px 0;${fuerte ? 'font-weight:bold;color:#1c1712;' : ''}">${esc(a)}</td><td align="right" style="padding:6px 0;${fuerte ? 'font-weight:bold;color:#1c1712;' : ''}">${esc(b)}</td></tr>`;
    const tabla = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        + fila('Cobrado, ya sin devoluciones', pesos(m.cobrado_neto))
        + fila('Comisiones de Stripe', `-${pesos(m.comisiones)}`)
        + fila('Gastos registrados', `-${pesos(m.gastos)}`)
        + fila('IVA a pagar', `-${pesos(m.iva)}`)
        + fila('ISR estimado', `-${pesos(m.isr)}`)
        + fila('Ganancia neta', pesos(m.neta), true)
        + '</table>';
    const cuerpo = parrafo(`Así cerró ${esc(nombreMes(m.mes))}:`) + caja(tabla)
        + '<div style="height:18px"></div>' + boton('Abrir Finanzas', `${SITIO}/admin`);
    return { asunto: `Cierre de ${nombreMes(m.mes)}: ganancia neta ${pesos(m.neta)}`, html: envolver({ cuerpo, pie: PIE }) };
}

export async function enviarAviso(para: string[], asunto: string, html: string) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) throw new Error('falta RESEND_API_KEY');
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Iurexia Finanzas <avisos@iurexia.com>', to: para, subject: asunto, html, reply_to: 'soporte@iurexia.com' }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).id as string;
}
