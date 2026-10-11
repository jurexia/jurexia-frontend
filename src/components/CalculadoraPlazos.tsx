'use client';

/* CALCULADORA DE PLAZOS (11-oct-2026, fase 3).
   David: «precisión impecable con plazos». El modelo da el plazo; la FECHA la
   calcula el servidor (`POST /plazos/calcular`, plazos_calculo.py) con las
   reglas de cada código —cuándo surte efectos la notificación, desde cuándo
   corre, qué días no se cuentan— y su artículo al lado. Lo que la ley deja al
   calendario de cada tribunal (vacaciones, suspensiones) lo agrega el abogado.
   Se abre desde las fichas «Calcular vencimiento» del flujo de la respuesta
   (evento `iurexia:calcular-plazo`, con el artículo) o desde el botón «Plazos»
   junto a las fuentes. */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, CalendarPlus, X } from 'lucide-react';
import { crearTermino } from '@/lib/agenda';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

const REGLAS: { v: string; t: string }[] = [
    { v: 'LAmp', t: 'Ley de Amparo' },
    { v: 'CNPCF', t: 'Código Nacional de Procedimientos Civiles y Familiares' },
    { v: 'CNPP', t: 'Código Nacional de Procedimientos Penales' },
    { v: 'LFT', t: 'Ley Federal del Trabajo' },
    { v: 'LFPCA', t: 'Juicio contencioso administrativo federal (LFPCA)' },
    { v: 'CFF', t: 'Código Fiscal de la Federación' },
    { v: 'LFPA', t: 'Ley Federal de Procedimiento Administrativo' },
    { v: 'CCom', t: 'Código de Comercio' },
    { v: 'CFPC', t: 'Código Federal de Procedimientos Civiles' },
    { v: 'LAgra', t: 'Agrario (CFPC supletorio)' },
    { v: 'LOCAL', t: 'Código procesal local (regla genérica)' },
];

interface PlazoTabla { acto: string; cantidad: number; unidad: string; tipo_dias: string; computo?: string; texto_literal: string }
interface Resultado {
    regla: string; vencimiento: string | null; surte_efectos?: string; inicio?: string; tipo_dias?: string;
    inhabiles_saltados?: { fecha: string; motivo: string }[]; fundamento: string[]; explicacion: string; avisos: string[];
}

const hoy = () => new Date().toISOString().slice(0, 10);
const largo = (iso?: string | null) => {
    if (!iso) return '';
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export default function CalculadoraPlazos({ conBoton = true }: { conBoton?: boolean }) {
    const [abierta, setAbierta] = useState(false);
    const [articulo, setArticulo] = useState<{ abrev: string; ref: string } | null>(null);
    const [opciones, setOpciones] = useState<PlazoTabla[]>([]);
    const [regla, setRegla] = useState('LAmp');
    const [cantidad, setCantidad] = useState(15);
    const [unidad, setUnidad] = useState('dias');
    const [tipoDias, setTipoDias] = useState('');
    const [fecha, setFecha] = useState(hoy());
    const [notif, setNotif] = useState('personal');
    const [familiar, setFamiliar] = useState(false);
    const [sabados, setSabados] = useState(false);
    const [extra, setExtra] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [res, setRes] = useState<Resultado | null>(null);
    const [titulo, setTitulo] = useState('');
    const [guardado, setGuardado] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const elegir = (p: PlazoTabla) => {
        setCantidad(p.cantidad);
        setUnidad(p.unidad);
        setTipoDias(p.tipo_dias === 'habiles' || p.tipo_dias === 'naturales' ? p.tipo_dias : '');
        setRes(null);
    };

    const abrirCon = useCallback(async (a: { abrev: string; ref: string } | null) => {
        setAbierta(true);
        setRes(null);
        setError('');
        setArticulo(a);
        setOpciones([]);
        if (!a) return;
        try {
            const r = await fetch(`${API_URL}/plazos/tabla?abrev=${encodeURIComponent(a.abrev)}&ref=${encodeURIComponent(a.ref)}`);
            const d = await r.json();
            if (d?.regla) setRegla(d.regla);
            const lista: PlazoTabla[] = Array.isArray(d?.plazos) ? d.plazos : [];
            setOpciones(lista);
            if (lista[0]) elegir(lista[0]);
        } catch { /* sin tabla: se captura a mano */ }
    }, []);

    useEffect(() => {
        const oir = (e: Event) => abrirCon((e as CustomEvent).detail ?? null);
        window.addEventListener('iurexia:calcular-plazo', oir);
        return () => window.removeEventListener('iurexia:calcular-plazo', oir);
    }, [abrirCon]);

    const calcular = async () => {
        setCargando(true);
        setError('');
        setRes(null);
        setGuardado('');
        try {
            const fechas = extra.split(/[\s,;]+/).map((x) => x.trim()).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
            const r = await fetch(`${API_URL}/plazos/calcular`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha_notificacion: fecha, cantidad, unidad, regla, tipo_notificacion: notif,
                    tipo_dias: tipoDias || null, inhabiles_extra: fechas,
                    periodos_inhabiles: desde && hasta ? [[desde, hasta]] : [],
                    familiar_urgente: familiar, sabados_habiles: sabados,
                }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.detail || 'No se pudo calcular');
            setRes(d);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo calcular');
        } finally {
            setCargando(false);
        }
    };

    const campo = 'w-full rounded-lg border border-charcoal-900/15 bg-white px-2.5 py-1.5 text-[13px] text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-accent-brown/30';

    return (
        <>
            {conBoton && (
                <button
                    type="button"
                    onClick={() => abrirCon(null)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-charcoal-900/10 bg-white px-2.5 py-1 text-[12px] font-medium text-charcoal-900 hover:bg-cream-100"
                    title="Calcular el vencimiento de un plazo procesal"
                >
                    <CalendarClock className="h-3.5 w-3.5 text-accent-brown" /> Plazos
                </button>
            )}
            {abierta && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-charcoal-900/40 p-0 sm:items-center sm:p-4" onClick={() => setAbierta(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Calculadora de plazos"
                        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-cream-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-[15px] font-semibold text-charcoal-900">Calcular vencimiento</h2>
                                <p className="text-[11.5px] text-gray-500">
                                    {articulo ? `${articulo.abrev} ${articulo.ref}` : 'Elija el código y capture el plazo'} · reglas de cómputo del propio código
                                </p>
                            </div>
                            <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar" className="rounded-full p-1 hover:bg-cream-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {opciones.length > 0 && (
                            <div className="mb-3 space-y-1.5">
                                <p className="text-[11.5px] font-semibold text-charcoal-900">Plazos verificados de este artículo</p>
                                {opciones.map((p, i) => (
                                    <button key={i} type="button" onClick={() => elegir(p)}
                                        className="block w-full rounded-lg border border-charcoal-900/10 bg-white px-3 py-2 text-left text-[12px] hover:bg-cream-100">
                                        <span className="font-medium">{p.acto}</span>
                                        <span className="block text-gray-500">«{p.texto_literal}»{p.computo ? ` · corre: ${p.computo}` : ''}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5">
                            <label className="col-span-2 text-[11.5px] text-gray-600">Código que rige
                                <select className={campo} value={regla} onChange={(e) => setRegla(e.target.value)}>
                                    {REGLAS.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                                </select>
                            </label>
                            <label className="text-[11.5px] text-gray-600">Fecha de notificación
                                <input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                            </label>
                            <label className="text-[11.5px] text-gray-600">Tipo de notificación
                                <select className={campo} value={notif} onChange={(e) => setNotif(e.target.value)}>
                                    <option value="personal">Personal o emplazamiento</option>
                                    <option value="lista">Lista, boletín o estrados</option>
                                    <option value="electronica">Electrónica</option>
                                </select>
                            </label>
                            <label className="text-[11.5px] text-gray-600">Plazo
                                <input type="number" min={1} max={400} className={campo} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
                            </label>
                            <label className="text-[11.5px] text-gray-600">Unidad
                                <select className={campo} value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                                    <option value="dias">Días</option>
                                    <option value="horas">Horas</option>
                                    <option value="meses">Meses</option>
                                    <option value="anos">Años</option>
                                </select>
                            </label>
                            <label className="col-span-2 text-[11.5px] text-gray-600">Días
                                <select className={campo} value={tipoDias} onChange={(e) => setTipoDias(e.target.value)}>
                                    <option value="">Los que fije el código</option>
                                    <option value="habiles">Hábiles</option>
                                    <option value="naturales">Naturales</option>
                                </select>
                            </label>
                            <label className="col-span-2 text-[11.5px] text-gray-600">Días inhábiles adicionales del tribunal (AAAA-MM-DD, separados por coma)
                                <input className={campo} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="2026-11-02, 2026-12-12" />
                            </label>
                            <label className="text-[11.5px] text-gray-600">Vacaciones desde
                                <input type="date" className={campo} value={desde} onChange={(e) => setDesde(e.target.value)} />
                            </label>
                            <label className="text-[11.5px] text-gray-600">hasta
                                <input type="date" className={campo} value={hasta} onChange={(e) => setHasta(e.target.value)} />
                            </label>
                            {regla === 'CNPCF' && (
                                <label className="col-span-2 flex items-center gap-2 text-[12px] text-charcoal-900">
                                    <input type="checkbox" checked={familiar} onChange={(e) => setFamiliar(e.target.checked)} />
                                    Alimentos, niñas, niños y adolescentes, controversia o violencia familiar (todos los días son hábiles, art. 150)
                                </label>
                            )}
                            <label className="col-span-2 flex items-center gap-2 text-[12px] text-charcoal-900">
                                <input type="checkbox" checked={sabados} onChange={(e) => setSabados(e.target.checked)} />
                                Mi tribunal labora los sábados
                            </label>
                        </div>

                        <button type="button" onClick={calcular} disabled={cargando || !fecha || !cantidad}
                            className="mt-4 w-full rounded-xl bg-charcoal-900 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
                            {cargando ? 'Calculando…' : 'Calcular vencimiento'}
                        </button>
                        {error && <p className="mt-2 text-[12px] text-red-700">{error}</p>}

                        {res && (
                            <div className="mt-4 space-y-2 rounded-xl border border-charcoal-900/10 bg-white p-3.5 text-[12.5px] text-charcoal-900">
                                {res.vencimiento && (
                                    <p className="text-[14px]"><span className="text-gray-500">Vence:</span> <strong>{largo(res.vencimiento)}</strong></p>
                                )}
                                <p>{res.explicacion}</p>
                                {res.surte_efectos && <p className="text-gray-600">Surte efectos: {largo(res.surte_efectos)} · Empieza a correr: {largo(res.inicio)}</p>}
                                {(res.inhabiles_saltados || []).filter((x) => !/^(sábado|domingo)$/.test(x.motivo)).length > 0 && (
                                    <p className="text-gray-600">No se contaron: {(res.inhabiles_saltados || []).filter((x) => !/^(sábado|domingo)$/.test(x.motivo)).map((x) => `${x.fecha} (${x.motivo})`).join('; ')}</p>
                                )}
                                <div>
                                    <p className="font-semibold">Fundamento · {res.regla}</p>
                                    <ul className="list-disc pl-4 text-gray-700">{res.fundamento.map((f) => <li key={f}>{f}</li>)}</ul>
                                </div>
                                {res.avisos.length > 0 && (
                                    <ul className="list-disc pl-4 text-[11.5px] text-amber-800">{res.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
                                )}
                                {res.vencimiento && (
                                    <div className="space-y-1.5 border-t border-charcoal-900/10 pt-2.5">
                                        <input className={campo} placeholder="¿Qué hay que hacer? (p. ej. Apelar — exp. 123/2026)"
                                            value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                                        <button type="button" disabled={!!guardado}
                                            onClick={async () => {
                                                try {
                                                    await crearTermino({
                                                        titulo: titulo || (articulo ? `${articulo.abrev} ${articulo.ref}` : 'Término'),
                                                        expediente: null, organo: null, entidad: null, materia: null, acto: titulo || null,
                                                        regla, fecha_notificacion: fecha, tipo_notificacion: notif, cantidad, unidad,
                                                        tipo_dias: res.tipo_dias || null, surte_efectos: res.surte_efectos || null,
                                                        inicio: res.inicio || null, vencimiento: res.vencimiento as string,
                                                        fundamento: res.fundamento, avisos: res.avisos, notas: null,
                                                        origen: 'calculadora', documento_nombre: null, recordar_dias: [3, 1, 0],
                                                    });
                                                    setGuardado('Guardado en su agenda · le avisaremos por correo');
                                                } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); }
                                            }}
                                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#b8892d] py-2 text-[13px] font-semibold text-charcoal-900 disabled:opacity-60">
                                            <CalendarPlus className="h-4 w-4" /> {guardado || 'Guardar en mi agenda'}
                                        </button>
                                        {guardado && <a href="/agenda" className="block text-center text-[12px] text-accent-brown underline">Abrir mi agenda</a>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
