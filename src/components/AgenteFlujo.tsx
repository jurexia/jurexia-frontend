'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    FileText,
    FileUp,
    Loader2,
    Plus,
    RotateCcw,
    Square,
    Workflow,
} from 'lucide-react';
import type { FlujoTrabajo, CampoFlujo } from '@/lib/flujos';
import { esObligatorio } from '@/lib/flujos';
import {
    faltantes,
    tieneValor,
    valoresIniciales,
    type CampoDeducido,
    type EstadoAgente,
    type Valor,
} from '@/lib/flujo-agente';

/* ═══ EL AGENTE DEL FLUJO, EN EL HILO (25-sep-2026) ═══════════════════════
   David: «lo que debió de ir requiriendo es los datos faltantes y, para mayor
   comodidad, ofrecer opciones de palomeado… a una opción predeterminada».

   Una tarjeta por flujo, debajo de la conversación:
   - arriba, las partes del escrito y cuál va;
   - el PROCESO: lo que Iurexia está revisando y concluyendo. Es proceso, no
     documento: se borra cuando la parte queda escrita;
   - las PREGUNTAS de la parte: lo deducido ya viene marcado, lo que no consta
     se pide, y si falta un documento clave se pide el documento o su texto;
   - el botón que redacta la parte con todo el acervo.
   ═════════════════════════════════════════════════════════════════════════ */

const ORIGEN: Record<string, { texto: string; clase: string }> = {
    encargo: { texto: 'Del encargo', clase: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
    carpeta: { texto: 'De la carpeta', clase: 'bg-sky-50 text-sky-800 ring-sky-200' },
    confirmado: { texto: 'Confirmado', clase: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
    criterio: { texto: 'Sugerido', clase: 'bg-[#c9a962]/15 text-[#6f5725] ring-[#c9a962]/30' },
};

export const CONSTA_EN_CARPETA = 'Consta en la carpeta';

function Campo({
    campo,
    valor,
    deducido,
    onCambiar,
    hayCarpeta,
    onSubir,
    subiendo,
}: {
    campo: CampoFlujo;
    valor: Valor;
    deducido: CampoDeducido | undefined;
    onCambiar: (v: Valor) => void;
    hayCarpeta: boolean;
    onSubir: () => void;
    subiendo: boolean;
}) {
    const [otra, setOtra] = useState('');
    const [pegando, setPegando] = useState(false);
    const falta = esObligatorio(campo) && !tieneValor(valor);
    const origen = deducido && deducido.propuesta !== null ? ORIGEN[deducido.origen] : undefined;
    const opciones = useMemo(() => {
        const base = deducido?.opciones?.length ? deducido.opciones : campo.opciones ?? [];
        const actuales = Array.isArray(valor) ? valor : valor ? [valor] : [];
        // Lo que el abogado escribió en «Otra» también se ve como opción.
        return [...base, ...actuales.filter((a) => !base.some((b) => b.toLowerCase() === a.toLowerCase()))];
    }, [deducido, campo.opciones, valor]);

    const entrada =
        'w-full rounded-lg border bg-white px-3 text-[14px] text-charcoal-900 outline-none transition-colors placeholder:text-charcoal-900/35 focus:border-[#c9a962]';
    const borde = falta ? 'border-amber-400/70' : 'border-charcoal-900/[0.14]';

    let control: React.ReactNode = null;
    if (campo.tipo === 'texto') {
        control = <input value={valor as string} onChange={(e) => onCambiar(e.target.value)} className={`${entrada} ${borde} h-10`} />;
    } else if (campo.tipo === 'parrafo') {
        control = (
            <textarea
                value={valor as string}
                onChange={(e) => onCambiar(e.target.value)}
                rows={Math.min(8, Math.max(3, Math.ceil(String(valor).length / 90)))}
                className={`${entrada} ${borde} resize-y py-2 leading-relaxed`}
            />
        );
    } else if (campo.tipo === 'fecha') {
        control = <input type="date" value={valor as string} onChange={(e) => onCambiar(e.target.value)} className={`${entrada} ${borde} h-10 max-w-[220px]`} />;
    } else if (campo.tipo === 'opcion') {
        const elegido = valor as string;
        control = (
            <div className="space-y-1.5">
                {opciones.map((o) => (
                    <label
                        key={o}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-[13.5px] leading-snug transition-colors ${
                            elegido === o ? 'border-[#c9a962] bg-[#c9a962]/[0.08] text-charcoal-900' : 'border-charcoal-900/[0.1] bg-white text-charcoal-900/80 hover:border-charcoal-900/25'
                        }`}
                    >
                        <input type="radio" checked={elegido === o} onChange={() => onCambiar(o)} className="mt-0.5 accent-[#a8863f]" />
                        {o}
                    </label>
                ))}
                <div className="flex gap-1.5">
                    <input
                        value={otra}
                        onChange={(e) => setOtra(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && otra.trim()) { e.preventDefault(); onCambiar(otra.trim()); setOtra(''); } }}
                        placeholder="Otra…"
                        className={`${entrada} border-charcoal-900/[0.1] h-9 text-[13px]`}
                    />
                    <button type="button" disabled={!otra.trim()} onClick={() => { onCambiar(otra.trim()); setOtra(''); }} className="h-9 shrink-0 rounded-lg border border-charcoal-900/[0.12] px-3 text-[12.5px] font-medium text-charcoal-900/70 hover:bg-cream-100 disabled:opacity-40">
                        Usar
                    </button>
                </div>
            </div>
        );
    } else if (campo.tipo === 'varias') {
        const marcadas = Array.isArray(valor) ? valor : [];
        const alternar = (o: string) =>
            onCambiar(marcadas.includes(o) ? marcadas.filter((m) => m !== o) : [...marcadas, o]);
        control = (
            <div className="space-y-1.5">
                {opciones.map((o) => (
                    <label
                        key={o}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-[13.5px] leading-snug transition-colors ${
                            marcadas.includes(o) ? 'border-[#c9a962] bg-[#c9a962]/[0.08] text-charcoal-900' : 'border-charcoal-900/[0.1] bg-white text-charcoal-900/75 hover:border-charcoal-900/25'
                        }`}
                    >
                        <input type="checkbox" checked={marcadas.includes(o)} onChange={() => alternar(o)} className="mt-0.5 accent-[#a8863f]" />
                        {o}
                    </label>
                ))}
                <div className="flex gap-1.5">
                    <input
                        value={otra}
                        onChange={(e) => setOtra(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && otra.trim()) { e.preventDefault(); onCambiar([...marcadas, otra.trim()]); setOtra(''); } }}
                        placeholder="Agregar otra…"
                        className={`${entrada} border-charcoal-900/[0.1] h-9 text-[13px]`}
                    />
                    <button type="button" aria-label="Agregar" disabled={!otra.trim()} onClick={() => { onCambiar([...marcadas, otra.trim()]); setOtra(''); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-charcoal-900/[0.12] text-charcoal-900/70 hover:bg-cream-100 disabled:opacity-40">
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    } else if (campo.tipo === 'documento') {
        const texto = valor as string;
        const enCarpeta = texto === CONSTA_EN_CARPETA;
        control = (
            <div className="space-y-2">
                {deducido?.propuesta && hayCarpeta && (
                    <p className="rounded-lg bg-sky-50 px-3 py-2 text-[12.5px] leading-snug text-sky-900 ring-1 ring-sky-200">
                        <span className="font-semibold">En la carpeta:</span> {String(deducido.propuesta)}
                    </p>
                )}
                {pegando || (texto && !enCarpeta) ? (
                    <textarea
                        autoFocus={pegando && !texto}
                        value={enCarpeta ? '' : texto}
                        onChange={(e) => onCambiar(e.target.value)}
                        rows={6}
                        placeholder="Pega el texto del documento, o al menos su contenido esencial…"
                        className={`${entrada} ${borde} resize-y py-2 text-[13px] leading-relaxed`}
                    />
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                    {hayCarpeta && (
                        <button type="button" onClick={onSubir} disabled={subiendo} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-charcoal-900 px-3 text-[12.5px] font-semibold text-white hover:bg-charcoal-800 disabled:opacity-50">
                            {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5 text-[#c9a962]" />}
                            {subiendo ? 'Leyendo el documento…' : 'Subir a la carpeta · 1 consulta'}
                        </button>
                    )}
                    {!pegando && !(texto && !enCarpeta) && (
                        <button type="button" onClick={() => setPegando(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal-900/[0.14] bg-white px-3 text-[12.5px] font-medium text-charcoal-900/80 hover:bg-cream-100">
                            <FileText className="h-3.5 w-3.5" /> Pegar su contenido
                        </button>
                    )}
                    {hayCarpeta && deducido?.propuesta && (
                        <button type="button" onClick={() => { setPegando(false); onCambiar(enCarpeta ? '' : CONSTA_EN_CARPETA); }} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium ${enCarpeta ? 'border-[#c9a962] bg-[#c9a962]/[0.08] text-charcoal-900' : 'border-charcoal-900/[0.14] bg-white text-charcoal-900/80 hover:bg-cream-100'}`}>
                            {enCarpeta && <Check className="h-3.5 w-3.5 text-[#a8863f]" />} Usar el de la carpeta
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[13.5px] font-semibold text-charcoal-900">{campo.etiqueta}</span>
                {!esObligatorio(campo) && <span className="text-[11.5px] text-charcoal-900/40">opcional</span>}
                {origen && <span className={`rounded-full px-1.5 py-px text-[10.5px] font-semibold ring-1 ${origen.clase}`}>{origen.texto}</span>}
                {falta && <span className="rounded-full bg-amber-50 px-1.5 py-px text-[10.5px] font-semibold text-amber-800 ring-1 ring-amber-200">Falta</span>}
            </div>
            {campo.ayuda && <p className="mb-1.5 text-[12px] leading-snug text-charcoal-900/50">{campo.ayuda}</p>}
            {control}
            {deducido?.nota && <p className="mt-1.5 text-[12px] leading-snug text-charcoal-900/55">{deducido.nota}</p>}
        </div>
    );
}

export default function AgenteFlujo({
    flujo,
    estado,
    carpetaNombre,
    ocupado,
    subiendo,
    pendientesEnDocumento,
    onConfirmar,
    onSubirDocumento,
    onReintentar,
    onVerDocumento,
    onDetener,
}: {
    flujo: FlujoTrabajo;
    estado: EstadoAgente;
    carpetaNombre: string | null;
    /** El chat está ocupado con otra cosa: no se puede redactar todavía. */
    ocupado: boolean;
    subiendo: boolean;
    pendientesEnDocumento: number;
    onConfirmar: (valoresParte: Record<string, Valor>) => void;
    onSubirDocumento: (archivo: File) => void;
    onReintentar: () => void;
    onVerDocumento: () => void;
    onDetener: () => void;
}) {
    const parte = flujo.partes[Math.min(estado.parte, flujo.partes.length - 1)];
    const deduccion = estado.deduccion;
    const [valores, setValores] = useState<Record<string, Valor>>({});
    const [aporte, setAporte] = useState('');
    const [verAporte, setVerAporte] = useState(false);
    const [visibles, setVisibles] = useState(0);
    const archivoRef = useRef<HTMLInputElement>(null);

    // Cada deducción nueva rellena el formulario con lo propuesto.
    useEffect(() => {
        if (estado.fase !== 'preguntando') return;
        setValores(valoresIniciales(parte.campos, deduccion, estado.valores));
        setAporte(typeof estado.valores[`aporte_${parte.id}`] === 'string' ? (estado.valores[`aporte_${parte.id}`] as string) : '');
        setVerAporte(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deduccion, estado.parte, estado.fase]);

    // El razonamiento entra línea por línea, como se piensa.
    useEffect(() => {
        const total = deduccion?.pensamiento.length ?? 0;
        // La primera línea entra de inmediato: una caja «Proceso» vacía
        // parece un fallo, no un pensamiento en curso.
        setVisibles(total ? 1 : 0);
        if (total <= 1) return;
        let n = 1;
        const t = window.setInterval(() => {
            n += 1;
            setVisibles(n);
            if (n >= total) window.clearInterval(t);
        }, 650);
        return () => window.clearInterval(t);
    }, [deduccion]);

    const porCampo = useMemo(() => new Map((deduccion?.campos ?? []).map((c) => [c.id, c])), [deduccion]);
    const sinDar = estado.fase === 'preguntando' ? faltantes(parte.campos, valores) : [];
    const listoParaPreguntar = estado.fase === 'preguntando' && visibles >= (deduccion?.pensamiento.length ?? 0);

    const confirmar = () => {
        const salida = { ...valores };
        if (aporte.trim()) salida[`aporte_${parte.id}`] = aporte.trim();
        onConfirmar(salida);
    };

    /* ── Terminado ── */
    if (estado.fase === 'terminado') {
        return (
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
                        <Check className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-charcoal-900">{flujo.entrega}: terminada</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-charcoal-900/60">
                            Las {flujo.partes.length} partes están en el documento, con sus citas.
                            {pendientesEnDocumento > 0
                                ? ` Quedan ${pendientesEnDocumento} ${pendientesEnDocumento === 1 ? 'dato pendiente marcado' : 'datos pendientes marcados'} [DATO PENDIENTE] que debes completar antes de presentar.`
                                : ' Revísalo completo antes de presentarlo.'}
                        </p>
                        <button type="button" onClick={onVerDocumento} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-charcoal-900 px-3.5 text-[13px] font-semibold text-white hover:bg-charcoal-800">
                            <FileText className="h-4 w-4 text-[#c9a962]" /> Ver el documento
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-charcoal-900/[0.1] bg-[#fbfaf7] shadow-sm">
            {/* ── Cabecera: el escrito y sus partes ── */}
            <div className="border-b border-charcoal-900/[0.08] bg-white px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-charcoal-900 text-[#c9a962]">
                        <Workflow className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-charcoal-900">{flujo.entrega}</p>
                        <p className="truncate text-[12px] text-charcoal-900/50">
                            Parte {estado.parte + 1} de {flujo.partes.length} · {parte.titulo}
                            {carpetaNombre ? ` · ${carpetaNombre}` : ''}
                        </p>
                    </div>
                    <button type="button" onClick={onDetener} title="Detener el flujo" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-charcoal-900/50 hover:bg-charcoal-900/[0.05] hover:text-charcoal-900">
                        <Square className="h-3 w-3" /> Detener
                    </button>
                </div>
                <ol className="mt-3 flex gap-1.5" aria-label="Partes del escrito">
                    {flujo.partes.map((p, i) => {
                        const hecha = estado.hechas.includes(i);
                        const actual = i === estado.parte;
                        return (
                            <li key={p.id} className="min-w-0 flex-1" title={p.titulo}>
                                <span className={`block h-1.5 rounded-full ${hecha ? 'bg-emerald-500' : actual ? 'bg-[#c9a962]' : 'bg-charcoal-900/10'}`} />
                                <span className={`mt-1 hidden truncate text-[11px] sm:block ${actual ? 'font-medium text-charcoal-900/80' : 'text-charcoal-900/40'}`}>
                                    {p.titulo}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5">
                {/* ── El proceso: se ve mientras se piensa y se borra al escribir la parte ── */}
                {(estado.fase === 'deduciendo' || estado.fase === 'redactando' || (deduccion?.pensamiento.length ?? 0) > 0) && (
                    <div className="rounded-xl bg-charcoal-900/[0.035] px-3.5 py-3">
                        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-charcoal-900/40">Proceso</p>
                        {estado.fase === 'deduciendo' ? (
                            <ul className="space-y-1 text-[12.5px] leading-snug text-charcoal-900/60">
                                <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-900/40" /> Leo el encargo{carpetaNombre ? ` y la carpeta «${carpetaNombre}»` : ''}</li>
                                {estado.hechas.length > 0 && <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-900/40" /> Reviso lo que ya está redactado</li>}
                                <li className="flex gap-2 text-charcoal-900/80"><Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[#a8863f]" /> Decido qué necesito para «{parte.titulo}»…</li>
                            </ul>
                        ) : (
                            <ul className={`space-y-1 text-[12.5px] leading-snug ${estado.fase === 'redactando' ? 'text-charcoal-900/40' : 'text-charcoal-900/65'}`}>
                                {(deduccion?.pensamiento ?? []).slice(0, visibles).map((l, i) => (
                                    <li key={i} className="flex gap-2 animate-in fade-in duration-500">
                                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-charcoal-900/30" />
                                        {l}
                                    </li>
                                ))}
                                {estado.fase === 'redactando' && (
                                    <li className="flex gap-2 pt-1 text-charcoal-900/80">
                                        <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[#a8863f]" />
                                        Redacto «{parte.titulo}» con todo el acervo; el texto va apareciendo en el documento.
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                )}

                {estado.aviso && (
                    <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] leading-snug text-amber-900 ring-1 ring-amber-200">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {estado.aviso}
                    </p>
                )}

                {/* ── Las preguntas de la parte ── */}
                {listoParaPreguntar && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        {deduccion?.pedir_documento && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                                <p className="text-[13.5px] font-semibold text-amber-950">Necesito un documento: {deduccion.pedir_documento.nombre}</p>
                                {deduccion.pedir_documento.motivo && <p className="mt-0.5 text-[12.5px] leading-snug text-amber-900/80">{deduccion.pedir_documento.motivo}</p>}
                                {verAporte || aporte ? (
                                    <textarea
                                        autoFocus={!aporte}
                                        value={aporte}
                                        onChange={(e) => setAporte(e.target.value)}
                                        rows={6}
                                        placeholder="Pega el texto del documento, o al menos su contenido esencial…"
                                        className="mt-2.5 w-full resize-y rounded-lg border border-amber-300 bg-white px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-[#c9a962]"
                                    />
                                ) : null}
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {estado.expedienteId && (
                                        <button type="button" onClick={() => archivoRef.current?.click()} disabled={subiendo} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-charcoal-900 px-3 text-[12.5px] font-semibold text-white hover:bg-charcoal-800 disabled:opacity-50">
                                            {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5 text-[#c9a962]" />}
                                            {subiendo ? 'Leyendo el documento…' : 'Subirlo a la carpeta · 1 consulta'}
                                        </button>
                                    )}
                                    {!verAporte && !aporte && (
                                        <button type="button" onClick={() => setVerAporte(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-[12.5px] font-medium text-amber-950 hover:bg-amber-50">
                                            <FileText className="h-3.5 w-3.5" /> Pegar su contenido
                                        </button>
                                    )}
                                </div>
                                {!estado.expedienteId && (
                                    <p className="mt-2 text-[11.5px] leading-snug text-amber-900/70">
                                        Para subir el archivo, el flujo tiene que ir en una carpeta. Sin ella, pega su texto.
                                    </p>
                                )}
                            </div>
                        )}

                        {parte.campos.map((c) => (
                            <Campo
                                key={`${estado.parte}-${c.id}`}
                                campo={c}
                                valor={valores[c.id] ?? (c.tipo === 'varias' ? [] : '')}
                                deducido={porCampo.get(c.id)}
                                onCambiar={(v) => setValores((prev) => ({ ...prev, [c.id]: v }))}
                                hayCarpeta={!!estado.expedienteId}
                                onSubir={() => archivoRef.current?.click()}
                                subiendo={subiendo}
                            />
                        ))}

                        <div className="flex flex-col-reverse gap-2 border-t border-charcoal-900/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <button type="button" onClick={onReintentar} className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg px-2.5 text-[12.5px] font-medium text-charcoal-900/55 hover:bg-charcoal-900/[0.05] hover:text-charcoal-900">
                                <RotateCcw className="h-3.5 w-3.5" /> Volver a deducir
                            </button>
                            <div className="flex items-center gap-3">
                                {sinDar.length > 0 && (
                                    <span className="text-[12.5px] text-amber-800">
                                        {sinDar.length === 1 ? 'Falta 1 dato' : `Faltan ${sinDar.length} datos`}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={confirmar}
                                    disabled={sinDar.length > 0 || ocupado}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-charcoal-900 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Redactar esta parte
                                    <ArrowRight className="h-4 w-4 text-[#c9a962]" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <input
                ref={archivoRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) onSubirDocumento(f);
                }}
            />
        </div>
    );
}
