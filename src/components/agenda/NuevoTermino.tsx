'use client';

/* NUEVO TÉRMINO (11-oct-2026). Dos caminos:
   · «Desde un acuerdo»: foto o PDF del acuerdo (o su texto) → la API lo lee
     (POST /agenda/extraer), propone cada término con su plazo VERIFICADO contra
     el texto, el código que rige y el vencimiento calculado. El abogado corrige
     la fecha de notificación si hace falta y guarda.
   · «A mano»: los datos del plazo y el cálculo en vivo (POST /plazos/calcular).
   Nada se guarda sin que el abogado lo confirme. */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CheckCircle2, FileUp, Loader2, AlertTriangle, X } from 'lucide-react';
import {
    REGLAS, calcularPlazo, crearTermino, fechaLarga, hoyISO, leerAcuerdo,
    type LecturaAcuerdo, type ResultadoCalculo, type TerminoNuevo,
} from '@/lib/agenda';

const AVISOS_POSIBLES = [5, 3, 2, 1, 0];

function ChipsAviso({ valor, onCambio }: { valor: number[]; onCambio: (v: number[]) => void }) {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] text-gray-600">Avisarme por correo:</span>
            {AVISOS_POSIBLES.map((d) => {
                const on = valor.includes(d);
                return (
                    <button key={d} type="button"
                        onClick={() => onCambio(on ? valor.filter((x) => x !== d) : [...valor, d].sort((a, b) => b - a))}
                        className={`rounded-full border px-2.5 py-0.5 text-[11.5px] ${on ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-charcoal-900/15 bg-white text-gray-600'}`}>
                        {d === 0 ? 'el mismo día' : `${d} ${d === 1 ? 'día' : 'días'} antes`}
                    </button>
                );
            })}
        </div>
    );
}

const campo = 'w-full rounded-lg border border-charcoal-900/15 bg-white px-2.5 py-1.5 text-[13px] text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-accent-brown/30';

interface Fila {
    incluir: boolean; titulo: string; acto: string; cantidad: number; unidad: string; tipo_dias: string;
    regla: string; regla_motivo: string; verificado: boolean; literal: string; apercibimiento?: string;
    fundamento_citado?: string; calc: ResultadoCalculo | null; fecha_fija?: string;
}

export default function NuevoTermino({ abierto, onCerrar, onGuardado, estado, prellenado }: {
    abierto: boolean; onCerrar: () => void; onGuardado: () => void; estado?: string;
    prellenado?: Partial<TerminoNuevo> | null;
}) {
    const [modo, setModo] = useState<'acuerdo' | 'mano'>('acuerdo');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [texto, setTexto] = useState('');
    const [leyendo, setLeyendo] = useState(false);
    const [lectura, setLectura] = useState<LecturaAcuerdo | null>(null);
    const [filas, setFilas] = useState<Fila[]>([]);
    const [fechaNot, setFechaNot] = useState(hoyISO());
    const [tipoNot, setTipoNot] = useState('personal');
    const [recordar, setRecordar] = useState<number[]>([3, 1, 0]);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    // a mano
    const [m, setM] = useState({ titulo: '', expediente: '', organo: '', regla: 'LOCAL', cantidad: 3, unidad: 'dias',
        tipo_dias: '', fecha_fija: hoyISO(), familiar: false, notas: '' });
    const [calcMano, setCalcMano] = useState<ResultadoCalculo | null>(null);

    useEffect(() => {
        if (!abierto) return;
        setError(''); setLectura(null); setFilas([]); setArchivo(null); setTexto('');
        if (prellenado) {
            setModo('mano');
            setM((v) => ({ ...v, titulo: prellenado.titulo || '', regla: prellenado.regla || v.regla,
                cantidad: prellenado.cantidad || v.cantidad, unidad: prellenado.unidad || v.unidad,
                tipo_dias: prellenado.tipo_dias || '' }));
            if (prellenado.fecha_notificacion) setFechaNot(prellenado.fecha_notificacion);
            if (prellenado.tipo_notificacion) setTipoNot(prellenado.tipo_notificacion);
        }
    }, [abierto, prellenado]);

    // El cálculo a mano, en vivo
    useEffect(() => {
        if (!abierto || modo !== 'mano' || m.regla === 'FECHA' || !fechaNot || !m.cantidad) { setCalcMano(null); return; }
        const t = window.setTimeout(() => {
            calcularPlazo({ fecha_notificacion: fechaNot, cantidad: m.cantidad, unidad: m.unidad, regla: m.regla,
                tipo_notificacion: tipoNot, tipo_dias: m.tipo_dias || null, familiar_urgente: m.familiar })
                .then(setCalcMano).catch(() => setCalcMano(null));
        }, 350);
        return () => window.clearTimeout(t);
    }, [abierto, modo, m.regla, m.cantidad, m.unidad, m.tipo_dias, m.familiar, fechaNot, tipoNot]);

    // Recalcular las propuestas del acuerdo cuando el abogado corrige la notificación
    useEffect(() => {
        if (!lectura) return;
        const t = window.setTimeout(async () => {
            const nuevas = await Promise.all(filas.map(async (f) => {
                if (f.fecha_fija || !f.cantidad) return f;
                try {
                    const calc = await calcularPlazo({ fecha_notificacion: fechaNot, cantidad: f.cantidad, unidad: f.unidad,
                        regla: f.regla, tipo_notificacion: tipoNot, tipo_dias: f.tipo_dias === 'no_especifica' ? null : f.tipo_dias });
                    return { ...f, calc };
                } catch { return f; }
            }));
            setFilas(nuevas);
        }, 350);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechaNot, tipoNot, filas.map((f) => f.regla).join(',')]);

    if (!abierto || typeof document === 'undefined') return null;

    const leer = async () => {
        setLeyendo(true); setError('');
        try {
            const l = await leerAcuerdo(archivo, texto, estado);
            setLectura(l);
            setFechaNot(l.fecha_notificacion || l.fecha_acuerdo || hoyISO());
            setTipoNot(l.tipo_notificacion || 'personal');
            const exp = l.expediente ? ` — ${l.expediente}` : '';
            setFilas([
                ...l.terminos.map((t): Fila => ({
                    incluir: true, titulo: `${t.acto}${exp}`.slice(0, 280), acto: t.acto, cantidad: t.cantidad, unidad: t.unidad,
                    tipo_dias: t.tipo_dias, regla: t.regla, regla_motivo: t.regla_motivo, verificado: t.verificado,
                    literal: t.texto_literal || '', apercibimiento: t.apercibimiento, fundamento_citado: t.fundamento_citado,
                    calc: t.calculo,
                })),
                ...l.audiencias.map((a): Fila => ({
                    incluir: true, titulo: `${a.tipo || 'Audiencia'}${a.hora ? ` · ${a.hora}` : ''}${exp}`.slice(0, 280),
                    acto: a.tipo || 'Audiencia', cantidad: 0, unidad: 'dias', tipo_dias: '', regla: 'FECHA',
                    regla_motivo: 'Fecha fijada en el acuerdo', verificado: true, literal: '', calc: null, fecha_fija: a.fecha,
                })),
            ]);
            if (!l.terminos.length && !l.audiencias.length) setError('El acuerdo no concede plazos ni fija audiencias. Puede capturarlo a mano.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo leer el acuerdo');
        } finally { setLeyendo(false); }
    };

    const guardarAcuerdo = async () => {
        setGuardando(true); setError('');
        try {
            for (const f of filas.filter((x) => x.incluir)) {
                const venc = f.fecha_fija || f.calc?.vencimiento;
                if (!venc) continue;
                await crearTermino({
                    titulo: f.titulo || f.acto, expediente: lectura?.expediente || null, organo: lectura?.organo || null,
                    entidad: lectura?.entidad || estado || null, materia: lectura?.materia || null, acto: f.acto,
                    regla: f.regla, fecha_notificacion: f.fecha_fija ? null : fechaNot, tipo_notificacion: f.fecha_fija ? null : tipoNot,
                    cantidad: f.fecha_fija ? null : f.cantidad, unidad: f.fecha_fija ? null : f.unidad,
                    tipo_dias: f.calc?.tipo_dias || null, surte_efectos: f.calc?.surte_efectos || null, inicio: f.calc?.inicio || null,
                    vencimiento: venc, fundamento: f.calc?.fundamento || (f.fundamento_citado ? [f.fundamento_citado] : []),
                    avisos: [...(f.calc?.avisos || []), ...(f.verificado ? [] : ['El plazo no se encontró literal en el acuerdo: verifíquelo.'])],
                    notas: [f.literal ? `«${f.literal}»` : '', f.apercibimiento ? `Apercibimiento: ${f.apercibimiento}` : '']
                        .filter(Boolean).join('\n') || null,
                    origen: 'acuerdo', documento_nombre: lectura?.documento || null, recordar_dias: recordar,
                });
            }
            onGuardado(); onCerrar();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar');
        } finally { setGuardando(false); }
    };

    const guardarMano = async () => {
        setGuardando(true); setError('');
        try {
            const venc = m.regla === 'FECHA' ? m.fecha_fija : calcMano?.vencimiento;
            if (!venc) throw new Error('Falta la fecha de vencimiento');
            await crearTermino({
                titulo: m.titulo || 'Término', expediente: m.expediente || null, organo: m.organo || null, entidad: estado || null,
                materia: null, acto: m.titulo || null, regla: m.regla,
                fecha_notificacion: m.regla === 'FECHA' ? null : fechaNot, tipo_notificacion: m.regla === 'FECHA' ? null : tipoNot,
                cantidad: m.regla === 'FECHA' ? null : m.cantidad, unidad: m.regla === 'FECHA' ? null : m.unidad,
                tipo_dias: calcMano?.tipo_dias || null, surte_efectos: calcMano?.surte_efectos || null, inicio: calcMano?.inicio || null,
                vencimiento: venc, fundamento: calcMano?.fundamento || [], avisos: calcMano?.avisos || [], notas: m.notas || null,
                origen: prellenado ? (prellenado.origen || 'calculadora') : 'manual', documento_nombre: null, recordar_dias: recordar,
            });
            onGuardado(); onCerrar();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar');
        } finally { setGuardando(false); }
    };

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-charcoal-900/45 sm:items-center sm:p-4" onClick={onCerrar}>
            <div role="dialog" aria-modal="true" aria-label="Nuevo término" onClick={(e) => e.stopPropagation()}
                className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#fbf8f1] shadow-2xl sm:rounded-3xl">
                <div className="relative flex-shrink-0 overflow-hidden px-5 pb-3 pt-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/web/arte/tintero.webp" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div>
                            <h2 className="font-serif text-xl text-charcoal-900">Nuevo término</h2>
                            <p className="text-[12px] text-gray-600">Contado con las reglas de su código · aviso a su correo</p>
                        </div>
                        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-white/70"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="relative mt-3 inline-flex rounded-full bg-white/80 p-1 ring-1 ring-charcoal-900/10">
                        {(['acuerdo', 'mano'] as const).map((k) => (
                            <button key={k} type="button" onClick={() => setModo(k)}
                                className={`rounded-full px-3.5 py-1 text-[12.5px] font-medium ${modo === k ? 'bg-charcoal-900 text-white' : 'text-gray-600'}`}>
                                {k === 'acuerdo' ? 'Desde un acuerdo' : 'A mano'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {modo === 'acuerdo' && !lectura && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-accent-brown/40 bg-white/80 px-3 py-4 text-center hover:bg-white sm:px-4 sm:py-6">
                                    <FileUp className="h-6 w-6 text-accent-brown" />
                                    <span className="max-w-full break-words text-[13px] font-medium">{archivo ? archivo.name : 'Subir PDF, Word o imagen'}</span>
                                    <span className="text-[11px] text-gray-500">El acuerdo, la cédula o la lista</span>
                                    <input type="file" accept="application/pdf,image/*,.doc,.docx" className="hidden"
                                        onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
                                </label>
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-charcoal-900/15 bg-white/80 px-3 py-4 text-center hover:bg-white sm:px-4 sm:py-6">
                                    <Camera className="h-6 w-6 text-accent-brown" />
                                    <span className="text-[13px] font-medium">Tomar foto</span>
                                    <span className="text-[11px] text-gray-500">Desde el teléfono, en el juzgado</span>
                                    <input type="file" accept="image/*" capture="environment" className="hidden"
                                        onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                            <textarea className={`${campo} min-h-[5rem]`} placeholder="…o pegue aquí el texto del acuerdo"
                                value={texto} onChange={(e) => setTexto(e.target.value)} />
                            <button type="button" disabled={leyendo || (!archivo && texto.trim().length < 40)} onClick={leer}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-charcoal-900 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40">
                                {leyendo ? <><Loader2 className="h-4 w-4 animate-spin" /> Leyendo el acuerdo…</> : 'Leer el acuerdo'}
                            </button>
                        </>
                    )}

                    {modo === 'acuerdo' && lectura && (
                        <>
                            <div className="rounded-2xl bg-white p-3.5 ring-1 ring-charcoal-900/10">
                                <p className="text-[12px] text-gray-500">{[lectura.expediente, lectura.organo, lectura.entidad].filter(Boolean).join(' · ')}</p>
                                {lectura.resumen && <p className="mt-1 text-[13px] text-charcoal-900">{lectura.resumen}</p>}
                                <div className="mt-2.5 grid grid-cols-2 gap-2">
                                    <label className="text-[11.5px] text-gray-600">Fecha de notificación
                                        <input type="date" className={campo} value={fechaNot} onChange={(e) => setFechaNot(e.target.value)} />
                                    </label>
                                    <label className="text-[11.5px] text-gray-600">Tipo de notificación
                                        <select className={campo} value={tipoNot} onChange={(e) => setTipoNot(e.target.value)}>
                                            <option value="personal">Personal o emplazamiento</option>
                                            <option value="lista">Lista, boletín o estrados</option>
                                            <option value="electronica">Electrónica</option>
                                        </select>
                                    </label>
                                </div>
                                {lectura.avisos.map((a) => <p key={a} className="mt-2 text-[11.5px] text-amber-800">{a}</p>)}
                            </div>
                            {filas.map((f, i) => (
                                <div key={i} className={`rounded-2xl bg-white p-3.5 ring-1 ${f.incluir ? 'ring-accent-brown/40' : 'opacity-60 ring-charcoal-900/10'}`}>
                                    <div className="flex items-start gap-2.5">
                                        <input type="checkbox" className="mt-1" checked={f.incluir}
                                            onChange={(e) => setFilas(filas.map((x, j) => j === i ? { ...x, incluir: e.target.checked } : x))} />
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <input className={campo} value={f.titulo}
                                                onChange={(e) => setFilas(filas.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x))} />
                                            {f.fecha_fija ? (
                                                <p className="text-[12.5px]">📅 {fechaLarga(f.fecha_fija)}</p>
                                            ) : (
                                                <>
                                                    <p className="flex items-center gap-1.5 text-[12px] text-gray-600">
                                                        {f.verificado
                                                            ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Plazo verificado en el acuerdo</>
                                                            : <><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Revise el plazo: no apareció literal</>}
                                                        {f.literal && <span className="truncate italic">«{f.literal}»</span>}
                                                    </p>
                                                    <select className={campo} value={f.regla}
                                                        onChange={(e) => setFilas(filas.map((x, j) => j === i ? { ...x, regla: e.target.value } : x))}>
                                                        {REGLAS.filter((r) => r.v !== 'FECHA').map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                                                    </select>
                                                    <p className="text-[11px] text-gray-500">{f.regla_motivo}</p>
                                                    {f.calc?.vencimiento && (
                                                        <p className="rounded-lg bg-cream-100 px-2.5 py-1.5 text-[13px]">
                                                            Vence: <strong>{fechaLarga(f.calc.vencimiento)}</strong>
                                                            <span className="block text-[11px] text-gray-600">{f.calc.explicacion}</span>
                                                        </p>
                                                    )}
                                                    {f.apercibimiento && <p className="text-[11.5px] text-red-800">Apercibimiento: {f.apercibimiento}</p>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => { setLectura(null); setFilas([]); }} className="text-[12px] text-gray-600 underline">
                                Leer otro acuerdo
                            </button>
                        </>
                    )}

                    {modo === 'mano' && (
                        <div className="grid grid-cols-2 gap-2.5">
                            <label className="col-span-2 text-[11.5px] text-gray-600">Qué hay que hacer
                                <input className={campo} value={m.titulo} placeholder="Contestar la demanda — exp. 123/2026"
                                    onChange={(e) => setM({ ...m, titulo: e.target.value })} />
                            </label>
                            <label className="text-[11.5px] text-gray-600">Expediente
                                <input className={campo} value={m.expediente} onChange={(e) => setM({ ...m, expediente: e.target.value })} />
                            </label>
                            <label className="text-[11.5px] text-gray-600">Juzgado o tribunal
                                <input className={campo} value={m.organo} onChange={(e) => setM({ ...m, organo: e.target.value })} />
                            </label>
                            <label className="col-span-2 text-[11.5px] text-gray-600">Código que rige
                                <select className={campo} value={m.regla} onChange={(e) => setM({ ...m, regla: e.target.value })}>
                                    {REGLAS.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                                </select>
                            </label>
                            {m.regla === 'FECHA' ? (
                                <label className="col-span-2 text-[11.5px] text-gray-600">Fecha
                                    <input type="date" className={campo} value={m.fecha_fija} onChange={(e) => setM({ ...m, fecha_fija: e.target.value })} />
                                </label>
                            ) : (
                                <>
                                    <label className="text-[11.5px] text-gray-600">Notificación
                                        <input type="date" className={campo} value={fechaNot} onChange={(e) => setFechaNot(e.target.value)} />
                                    </label>
                                    <label className="text-[11.5px] text-gray-600">Tipo
                                        <select className={campo} value={tipoNot} onChange={(e) => setTipoNot(e.target.value)}>
                                            <option value="personal">Personal</option>
                                            <option value="lista">Lista o boletín</option>
                                            <option value="electronica">Electrónica</option>
                                        </select>
                                    </label>
                                    <label className="text-[11.5px] text-gray-600">Plazo
                                        <input type="number" min={1} max={400} className={campo} value={m.cantidad}
                                            onChange={(e) => setM({ ...m, cantidad: Number(e.target.value) })} />
                                    </label>
                                    <label className="text-[11.5px] text-gray-600">Unidad
                                        <select className={campo} value={m.unidad} onChange={(e) => setM({ ...m, unidad: e.target.value })}>
                                            <option value="dias">Días</option><option value="meses">Meses</option><option value="anos">Años</option>
                                        </select>
                                    </label>
                                    <label className="col-span-2 text-[11.5px] text-gray-600">Días
                                        <select className={campo} value={m.tipo_dias} onChange={(e) => setM({ ...m, tipo_dias: e.target.value })}>
                                            <option value="">Los que fije el código</option><option value="habiles">Hábiles</option><option value="naturales">Naturales</option>
                                        </select>
                                    </label>
                                    {m.regla === 'CNPCF' && (
                                        <label className="col-span-2 flex items-center gap-2 text-[12px]">
                                            <input type="checkbox" checked={m.familiar} onChange={(e) => setM({ ...m, familiar: e.target.checked })} />
                                            Alimentos, menores, controversia o violencia familiar (días naturales, art. 150)
                                        </label>
                                    )}
                                    {calcMano?.vencimiento && (
                                        <p className="col-span-2 rounded-lg bg-cream-100 px-3 py-2 text-[13px]">
                                            Vence: <strong>{fechaLarga(calcMano.vencimiento)}</strong>
                                            <span className="block text-[11px] text-gray-600">{calcMano.explicacion}</span>
                                        </p>
                                    )}
                                </>
                            )}
                            <label className="col-span-2 text-[11.5px] text-gray-600">Notas
                                <textarea className={`${campo} min-h-[3.5rem]`} value={m.notas} onChange={(e) => setM({ ...m, notas: e.target.value })} />
                            </label>
                        </div>
                    )}
                    {error && <p className="text-[12.5px] text-red-700">{error}</p>}
                </div>

                {(modo === 'mano' || lectura) && (
                    <div className="flex-shrink-0 space-y-2.5 border-t border-charcoal-900/10 bg-white/70 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                        <ChipsAviso valor={recordar} onCambio={setRecordar} />
                        <button type="button" disabled={guardando} onClick={modo === 'mano' ? guardarMano : guardarAcuerdo}
                            className="w-full rounded-xl bg-[#b8892d] py-2.5 text-[13.5px] font-semibold text-charcoal-900 shadow-sm hover:brightness-105 disabled:opacity-50">
                            {guardando ? 'Guardando…' : modo === 'mano' ? 'Guardar en mi agenda'
                                : `Guardar ${filas.filter((f) => f.incluir).length} en mi agenda`}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
