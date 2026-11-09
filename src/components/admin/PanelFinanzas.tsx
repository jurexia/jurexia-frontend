'use client';

/**
 * La pestaña Finanzas: cuánto entró, cuánto salió, qué se viene y cuánto queda.
 * Los datos llegan de /api/admin/finanzas; aquí no se calcula nada.
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Send, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fechaEnLetra, nombreMes } from '@/lib/finanzas/calculo';

const pesos = (n: number) => `$${Math.round(n ?? 0).toLocaleString('es-MX')}`;
const CATEGORIAS: Record<string, string> = {
    infraestructura: 'Infraestructura', ia: 'Inteligencia artificial', herramientas: 'Herramientas',
    publicidad: 'Publicidad', otros: 'Otros',
};
const DEDUCIBLE: Record<string, string> = { si: 'Sí', pendiente: 'Por corregir', no: 'No' };
const caja = 'rounded-xl border border-cream-400 bg-white p-5 mb-6';
const rotulo = 'text-[11px] uppercase tracking-wider text-accent-brown mb-3';
const campo = 'border border-cream-400 rounded-lg px-2.5 py-1.5 text-sm bg-white text-charcoal-900';
const tenue = 'text-charcoal-900/60';

function Tarjeta({ etiqueta, valor, pie, oro }: { etiqueta: string; valor: string; pie?: string; oro?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${oro ? 'border-accent-gold bg-charcoal-900' : 'border-cream-400 bg-white'}`}>
            <p className={`text-[11px] uppercase tracking-wider mb-1.5 ${oro ? 'text-accent-gold' : 'text-accent-brown'}`}>{etiqueta}</p>
            <p className={`text-2xl font-medium tabular-nums ${oro ? 'text-cream-100' : 'text-charcoal-900'}`}>{valor}</p>
            {pie && <p className={`text-xs mt-1 ${oro ? 'text-cream-100/70' : tenue}`}>{pie}</p>}
        </div>
    );
}

function Fila({ a, b, fuerte, nota }: { a: string; b: string; fuerte?: boolean; nota?: string }) {
    return (
        <tr className="border-b border-cream-200 last:border-0">
            <td className={`py-2 pr-3 ${fuerte ? 'font-medium text-charcoal-900' : 'text-charcoal-800'}`}>
                {a}{nota && <span className={`block text-xs ${tenue}`}>{nota}</span>}
            </td>
            <td className={`py-2 text-right tabular-nums whitespace-nowrap ${fuerte ? 'font-medium text-charcoal-900' : 'text-charcoal-800'}`}>{b}</td>
        </tr>
    );
}

export default function PanelFinanzas() {
    const [d, setD] = useState<any>(null);
    const [planes, setPlanes] = useState<any>(null);
    const [error, setError] = useState('');
    const [mes, setMes] = useState('');
    const [editando, setEditando] = useState<any>(null);
    const [form, setForm] = useState({ proveedor_id: '', tipo: 'gasto', fecha: '', monto: '', iva: '', concepto: '' });
    const [ocupado, setOcupado] = useState(false);
    const [aviso, setAviso] = useState('');

    const cabecera = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' };
    }, []);

    const cargar = useCallback(async () => {
        setError('');
        try {
            const headers = await cabecera();
            const [r, f] = await Promise.all([
                fetch('/api/admin/finanzas', { headers }),
                fetch('/api/admin/finances', { headers }),
            ]);
            const j = await r.json();
            if (!r.ok) { setError(j.error || 'No se pudieron leer las finanzas.'); return; }
            setD(j);
            if (f.ok) setPlanes(await f.json());
        } catch { setError('No se pudo conectar.'); }
    }, [cabecera]);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        if (!d || mes) return;
        // Se abre en el último mes cerrado: el mes en curso todavía no dice nada.
        const cerrados = d.meses.filter((m: any) => !m.parcial);
        setMes((cerrados[cerrados.length - 1] ?? d.meses[d.meses.length - 1])?.mes ?? '');
        setForm((x) => ({ ...x, fecha: d.hoy, proveedor_id: d.proveedores[0]?.id ?? '' }));
    }, [d, mes]);

    const enviar = async (cuerpo: any, despues?: () => void) => {
        setOcupado(true); setError(''); setAviso('');
        try {
            const r = await fetch('/api/admin/finanzas', { method: 'POST', headers: await cabecera(), body: JSON.stringify(cuerpo) });
            const j = await r.json();
            if (!r.ok) { setError(j.error || 'La acción falló.'); return; }
            if (j.enviado_a) setAviso(`Aviso de prueba enviado a ${j.enviado_a}.`);
            despues?.();
            await cargar();
        } catch { setError('No se pudo conectar.'); }
        finally { setOcupado(false); }
    };

    if (error && !d) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>;
    if (!d) return <div className={`flex items-center gap-2 py-16 justify-center ${tenue}`}><Loader2 className="w-4 h-4 animate-spin" /> Consultando Stripe…</div>;

    const m = d.meses.find((x: any) => x.mes === mes) ?? d.meses[d.meses.length - 1];
    const imp = m.impuestos;
    const empresarial = d.config.regimen === 'actividad_empresarial';
    const prox30 = d.calendario.filter((e: any) => e.faltan <= 30).reduce((s: number, e: any) => s + e.monto_mxn, 0);
    const aMxn = (p: any) => (p.moneda === 'USD' ? p.presupuesto * d.tc.valor : p.presupuesto);
    const activos = d.proveedores.filter((p: any) => p.activo);
    const presupuestoTotal = activos.reduce((s: number, p: any) => s + aMxn(p), 0);
    const categorias = Object.keys(CATEGORIAS).filter((c) => activos.some((p: any) => p.categoria === c));
    const movimientos = d.movimientos.filter((x: any) => x.fecha.startsWith(m.mes));
    const nombreProv = (id: string) => d.proveedores.find((p: any) => p.id === id)?.nombre ?? id;
    const sinConfirmar = activos.filter((p: any) => p.por_confirmar);
    const rezagoTotal = d.rezago.iva + d.rezago.isr;

    return (
        <>
            {error && <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">{error}</div>}
            {aviso && <div className="mb-4 px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800">{aviso}</div>}

            <div className="flex flex-wrap items-center gap-2 mb-4">
                {d.meses.map((x: any) => (
                    <button key={x.mes} onClick={() => setMes(x.mes)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium ${x.mes === m.mes ? 'bg-charcoal-900 text-cream-100' : 'bg-white border border-cream-400 text-charcoal-800 hover:bg-cream-100'}`}>
                        {nombreMes(x.mes)}{x.parcial ? ' (en curso)' : ''}
                    </button>
                ))}
                <span className={`text-xs ml-auto ${tenue}`}>Dólar: {d.tc.valor.toFixed(2)} MXN</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Tarjeta etiqueta="Cobrado" valor={pesos(m.cobrado_neto)} pie={`${m.cargos} cargos · ${pesos(Math.abs(m.devoluciones))} devueltos`} />
                <Tarjeta etiqueta="Gastos" valor={pesos(m.gastos + m.comisiones)} pie={`${pesos(m.comisiones)} de comisiones de Stripe`} />
                <Tarjeta etiqueta="Impuestos a apartar" valor={pesos(m.total_impuestos)} pie={`IVA ${pesos(m.iva)} · ISR ${pesos(m.isr)}`} />
                <Tarjeta etiqueta="Ganancia neta" valor={pesos(m.neta)} oro pie={m.parcial ? 'Va en curso: faltan cobros y gastos' : 'Después de gastos e impuestos'} />
            </div>

            {sinConfirmar.length > 0 && (
                <div className="mb-6 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
                    Falta confirmar el gasto de {sinConfirmar.map((p: any) => p.nombre).join(', ')}. Hasta entonces la ganancia real es menor que la que aparece aquí.
                </div>
            )}

            <div className={caja}>
                <div className="flex items-center justify-between gap-3 mb-3">
                    <p className={`${rotulo} !mb-0`}>Próximos pagos · 30 días: {pesos(prox30)}</p>
                    <button disabled={ocupado} onClick={() => enviar({ accion: 'probar_aviso' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-400 text-[13px] text-charcoal-800 hover:bg-cream-100 disabled:opacity-50">
                        <Send className="w-3.5 h-3.5" /> Enviarme un aviso de prueba
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm"><tbody>
                        {d.calendario.map((e: any) => (
                            <tr key={e.clave} className="border-b border-cream-200 last:border-0">
                                <td className="py-2 pr-3">
                                    <span className="block text-charcoal-900">{e.nombre}{e.por_confirmar && <span className={`ml-2 text-xs ${tenue}`}>estimado</span>}</span>
                                    <span className={`block text-xs ${tenue}`}>{fechaEnLetra(e.fecha)}</span>
                                </td>
                                <td className="py-2 text-right tabular-nums whitespace-nowrap">
                                    <span className="block text-charcoal-900">{pesos(e.monto_mxn)}</span>
                                    <span className={`block text-xs ${e.faltan <= 3 ? 'text-red-700 font-medium' : tenue}`}>{e.faltan === 0 ? 'hoy' : e.faltan === 1 ? 'mañana' : `en ${e.faltan} días`}{e.moneda === 'USD' ? ` · ${e.monto_original} USD` : ''}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
                <p className={`text-xs mt-3 ${tenue}`}>Los avisos llegan por correo a las 8:00: 3 días antes y el mismo día; los impuestos, también 7 días antes. Las recargas por uso, como OpenAI, no tienen fecha fija.</p>
            </div>

            <div className={caja}>
                <p className={rotulo}>Presupuesto mensual · {pesos(presupuestoTotal)}</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className={`text-left text-xs ${tenue}`}>
                            <th className="py-1 pr-3 font-normal">Concepto</th><th className="py-1 pr-3 font-normal">Se cobra</th>
                            <th className="py-1 pr-3 font-normal text-right">Presupuesto</th><th className="py-1 pr-3 font-normal text-right">{nombreMes(m.mes)}</th>
                            <th className="py-1 pr-3 font-normal">¿Deducible?</th><th />
                        </tr></thead>
                        <tbody>
                            {categorias.map((c) => (
                                <FragmentoCategoria key={c} titulo={CATEGORIAS[c]} real={m.por_categoria[c] ?? 0}
                                    filas={activos.filter((p: any) => p.categoria === c)} m={m} aMxn={aMxn}
                                    editando={editando} setEditando={setEditando} guardar={(e: any) => enviar({ accion: 'proveedor', ...e }, () => setEditando(null))} ocupado={ocupado} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={caja}>
                <p className={rotulo}>Impuestos de {nombreMes(m.mes)}</p>
                <div className="grid lg:grid-cols-2 gap-6">
                    <table className="w-full text-sm"><tbody>
                        <Fila a="Cobrado, con IVA incluido" b={pesos(m.cobrado_neto)} />
                        <Fila a="Ingreso sin IVA" b={pesos(imp.ingreso_sin_iva)} />
                        <Fila a="IVA cobrado a clientes" b={pesos(imp.iva.trasladado)} />
                        <Fila a="IVA acreditable" b={`-${pesos(imp.iva.acreditable)}`} nota="Por ahora, sólo el IVA de las comisiones de Stripe" />
                        <Fila a="IVA a pagar" b={pesos(m.iva)} fuerte />
                    </tbody></table>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className={`text-xs ${tenue}`}>Régimen</label>
                            <select className={campo} value={d.config.regimen} disabled={ocupado}
                                onChange={(e) => enviar({ accion: 'config', regimen: e.target.value, impuestos_pagados_hasta: d.config.impuestos_pagados_hasta })}>
                                <option value="actividad_empresarial">Actividad empresarial</option>
                                <option value="resico">RESICO</option>
                            </select>
                        </div>
                        <table className="w-full text-sm"><tbody>
                            <Fila a="Actividad empresarial, hoy" b={pesos(imp.isr_empresarial_hoy)} fuerte={empresarial} nota={`Deduce ${pesos(imp.deduccion_confirmada)}`} />
                            <Fila a="Actividad empresarial, con todo bien facturado" b={pesos(imp.isr_empresarial_si_todo_factura)} nota={`Deduciría ${pesos(imp.deduccion_posible)}`} />
                            <Fila a={`RESICO, ${imp.tasa_resico}% sin deducciones`} b={pesos(imp.isr_resico)} fuerte={!empresarial} />
                        </tbody></table>
                    </div>
                </div>
                <p className={`text-xs mt-4 ${tenue}`}>
                    Estimado para apartar: lo confirma quien lleve la contabilidad. Vence el día 17 del mes siguiente.
                    {d.config.titular && <> Los ingresos entran a nombre de {d.config.titular}: para deducir un gasto, su factura debe llevar ese RFC y pagarse desde sus cuentas.</>}
                </p>
                {rezagoTotal > 0 && (
                    <div className="mt-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900">
                        <strong>Meses vencidos sin marcar como pagados: {pesos(rezagoTotal)}</strong> (IVA {pesos(d.rezago.iva)} · ISR {pesos(d.rezago.isr)}), sin recargos ni actualización. Va de {nombreMes(d.rezago.meses[0].mes)} a {nombreMes(d.rezago.meses[d.rezago.meses.length - 1].mes)}. Antes de septiembre no hay gastos cargados, así que no se restan.
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <label className={`text-xs ${tenue}`}>Impuestos pagados hasta</label>
                    <input type="month" className={campo} defaultValue={d.config.impuestos_pagados_hasta ?? ''} disabled={ocupado}
                        onBlur={(e) => { if ((e.target.value || null) !== d.config.impuestos_pagados_hasta) enviar({ accion: 'config', regimen: d.config.regimen, impuestos_pagados_hasta: e.target.value }); }} />
                </div>
            </div>

            <div className={caja}>
                <p className={rotulo}>Mes por mes</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className={`text-right text-xs ${tenue}`}>
                            <th className="py-1 pr-3 font-normal text-left">Mes</th><th className="py-1 pr-3 font-normal">Cobrado</th><th className="py-1 pr-3 font-normal">Comisiones</th>
                            <th className="py-1 pr-3 font-normal">Gastos</th><th className="py-1 pr-3 font-normal">Impuestos</th><th className="py-1 font-normal">Ganancia neta</th>
                        </tr></thead>
                        <tbody>{d.meses.map((x: any) => (
                            <tr key={x.mes} className="border-b border-cream-200 last:border-0 text-right tabular-nums text-charcoal-800">
                                <td className="py-2 pr-3 text-left whitespace-nowrap">{nombreMes(x.mes)}{x.parcial ? ' (en curso)' : ''}</td>
                                <td className="py-2 pr-3">{pesos(x.cobrado_neto)}</td><td className="py-2 pr-3">{pesos(x.comisiones)}</td>
                                <td className="py-2 pr-3">{pesos(x.gastos)}</td><td className="py-2 pr-3">{pesos(x.total_impuestos)}</td>
                                <td className={`py-2 font-medium ${x.neta < 0 ? 'text-red-700' : 'text-charcoal-900'}`}>{pesos(x.neta)}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
                {planes && <p className={`text-xs mt-3 ${tenue}`}>Hoy: {planes.totalSubscribers} suscripciones activas · {pesos((planes.totalMRR ?? 0) / 100)} de ingreso mensual recurrente.</p>}
            </div>

            <div className={caja}>
                <p className={rotulo}>Registrar un pago</p>
                <form className="flex flex-wrap gap-2 items-end mb-5" onSubmit={(e) => {
                    e.preventDefault();
                    enviar({ accion: 'registrar', ...form }, () => setForm((x) => ({ ...x, monto: '', iva: '', concepto: '' })));
                }}>
                    <select className={campo} value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}>
                        {activos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre} ({p.moneda})</option>)}
                    </select>
                    <select className={campo} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                        <option value="gasto">Gasto</option><option value="ingreso">Ingreso</option>
                    </select>
                    <input className={campo} type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                    <input className={`${campo} w-28`} type="number" step="0.01" min="0" required placeholder="Monto" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
                    <input className={`${campo} w-24`} type="number" step="0.01" min="0" placeholder="IVA" value={form.iva} onChange={(e) => setForm({ ...form, iva: e.target.value })} />
                    <input className={`${campo} flex-1 min-w-[160px]`} placeholder="Concepto (opcional)" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
                    <button disabled={ocupado} className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">Registrar</button>
                </form>
                <p className={rotulo}>Movimientos de {nombreMes(m.mes)}</p>
                <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
                    {movimientos.length === 0 && <tr><td className={`py-2 ${tenue}`}>Sin movimientos registrados.</td></tr>}
                    {movimientos.map((x: any) => (
                        <tr key={x.id} className="border-b border-cream-200 last:border-0 text-charcoal-800">
                            <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">{x.fecha.slice(8)}</td>
                            <td className="py-1.5 pr-3">{nombreProv(x.proveedor_id)}{x.concepto && <span className={`text-xs ${tenue}`}> · {x.concepto}</span>}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">{x.tipo === 'ingreso' ? '+' : ''}{x.monto.toLocaleString('es-MX')} {x.moneda}</td>
                            <td className="py-1.5 text-right w-8">
                                <button disabled={ocupado} title="Quitar" onClick={() => { if (window.confirm('¿Quitar este movimiento?')) enviar({ accion: 'borrar', id: x.id }); }}
                                    className="p-1 text-charcoal-900/40 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody></table></div>
            </div>
        </>
    );
}

function FragmentoCategoria({ titulo, real, filas, m, aMxn, editando, setEditando, guardar, ocupado }: any) {
    return (
        <>
            <tr className="bg-cream-100">
                <td colSpan={2} className="py-1.5 px-2 text-xs font-medium text-charcoal-900">{titulo}</td>
                <td className="py-1.5 pr-3 text-right text-xs font-medium tabular-nums">{pesos(filas.reduce((s: number, p: any) => s + aMxn(p), 0))}</td>
                <td className="py-1.5 pr-3 text-right text-xs font-medium tabular-nums">{pesos(real)}</td>
                <td colSpan={2} />
            </tr>
            {filas.map((p: any) => editando?.id === p.id ? (
                <tr key={p.id} className="border-b border-cream-200">
                    <td className="py-1.5 pr-3 text-charcoal-900">{p.nombre}</td>
                    <td className="py-1.5 pr-3"><input className={`${campo} w-16`} type="number" min="1" max="31" placeholder="Día" value={editando.dia_cobro ?? ''} onChange={(e) => setEditando({ ...editando, dia_cobro: e.target.value })} /></td>
                    <td className="py-1.5 pr-3 text-right"><input className={`${campo} w-24 text-right`} type="number" step="0.01" min="0" value={editando.presupuesto} onChange={(e) => setEditando({ ...editando, presupuesto: e.target.value })} /> <span className="text-xs">{p.moneda}</span></td>
                    <td />
                    <td className="py-1.5 pr-3"><select className={campo} value={editando.deducible} onChange={(e) => setEditando({ ...editando, deducible: e.target.value })}><option value="si">Sí</option><option value="pendiente">Por corregir</option><option value="no">No</option></select></td>
                    <td className="py-1.5 whitespace-nowrap text-right">
                        <button disabled={ocupado} onClick={() => guardar(editando)} className="p-1 text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditando(null)} className="p-1 text-charcoal-900/50"><X className="w-4 h-4" /></button>
                    </td>
                </tr>
            ) : (
                <tr key={p.id} className="border-b border-cream-200 last:border-0">
                    <td className="py-2 pr-3 text-charcoal-900">{p.nombre}{p.por_confirmar && <span className="ml-2 text-xs text-amber-700">por confirmar</span>}{p.nota && <span className={`block text-xs ${tenue}`}>{p.nota}</span>}</td>
                    <td className={`py-2 pr-3 whitespace-nowrap text-xs ${tenue}`}>{p.dia_cobro ? `día ${p.dia_cobro}` : p.tipo_cobro === 'campana' ? 'por campaña' : 'por uso'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{pesos(aMxn(p))}{p.moneda === 'USD' && <span className={`block text-xs ${tenue}`}>{p.presupuesto} USD</span>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{pesos(m.por_proveedor[p.id] ?? 0)}</td>
                    <td className={`py-2 pr-3 text-xs ${p.deducible === 'si' ? 'text-green-700' : p.deducible === 'no' ? tenue : 'text-amber-700'}`}>{DEDUCIBLE[p.deducible]}</td>
                    <td className="py-2 text-right"><button title="Editar" onClick={() => setEditando({ id: p.id, presupuesto: p.presupuesto, dia_cobro: p.dia_cobro, deducible: p.deducible })} className="p-1 text-charcoal-900/40 hover:text-charcoal-900"><Pencil className="w-3.5 h-3.5" /></button></td>
                </tr>
            ))}
        </>
    );
}
