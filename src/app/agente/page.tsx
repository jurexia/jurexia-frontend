'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FileText, Loader2, Scale, Square } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ChatMessage from '@/components/ChatMessage';
import PdfViewerPanel from '@/components/PdfViewerPanel';
import { Message, streamChat } from '@/lib/api';
import { getSession } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useAuth';
import { ESTADOS_MEXICO } from '@/lib/estados';
import {
    DATOS_VACIOS,
    avisoDePlazo,
    construirPlan,
    faltantes108,
    instruccionDesdePlan,
    requisitos108,
    type ClaveVia,
    type DatosAmparo,
} from '@/lib/agente-amparo';

/* El agente de Iurexia: describir la tarea, VER EL PLAN, aprobarlo y recibir
   el trabajo. Es la idea que hace fuerte a Harvey —delegas el trabajo, conservas
   el criterio— adaptada al escrito que más se promueve en México.

   Esta primera versión no toca el backend: el plan se arma de forma
   determinista con la Ley de Amparo y la ejecución va por el mismo chat que ya
   existe, con el marcador de Redacción Pro. */

type Etapa = 'datos' | 'plan' | 'trabajo';

export default function AgentePage() {
    const { loading: cargandoAuth, isAuthenticated } = useRequireAuth();

    const [etapa, setEtapa] = useState<Etapa>('datos');
    const [datos, setDatos] = useState<DatosAmparo>(DATOS_VACIOS);
    const [desactivados, setDesactivados] = useState<ClaveVia[]>([]);
    const [mensaje, setMensaje] = useState<Message | null>(null);
    const [trabajando, setTrabajando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdf, setPdf] = useState<Parameters<typeof PdfViewerPanel>[0]['source']>(null);
    const abortRef = useRef<AbortController | null>(null);

    const planCompleto = useMemo(() => construirPlan(datos), [datos]);
    const pasosAprobados = useMemo(
        () => planCompleto.filter((p) => p.obligatorio || !desactivados.includes(p.clave)),
        [planCompleto, desactivados]
    );
    const aviso = useMemo(() => avisoDePlazo(datos), [datos]);

    const faltan = useMemo(() => faltantes108(datos), [datos]);
    const listoParaPlan = faltan.length === 0;

    function alternar(clave: ClaveVia) {
        setDesactivados((d) => (d.includes(clave) ? d.filter((c) => c !== clave) : [...d, clave]));
    }

    async function ejecutar() {
        setEtapa('trabajo');
        setTrabajando(true);
        setError(null);
        setMensaje(null);

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        try {
            const sesion = await getSession();
            const instruccion = instruccionDesdePlan(datos, pasosAprobados);
            let texto = '';

            for await (const trozo of streamChat(
                [{ role: 'user', content: instruccion }],
                datos.estado || undefined,
                30,
                sesion?.access_token,
                false,
                sesion?.user?.id,
                undefined,
                undefined,
                undefined,
                abortRef.current.signal
            )) {
                // El agente se apoya en el chat existente, así que llegan sus
                // marcadores de control; aquí sólo interesa el texto.
                const limpio = trozo.replace(/<!--[A-Z_:0-9]+-->/g, '');
                if (!limpio) continue;
                texto += limpio;
                setMensaje({ role: 'assistant', content: texto, isPro: true });
            }
        } catch (e) {
            if ((e as Error)?.name !== 'AbortError') {
                setError(e instanceof Error ? e.message : 'No se pudo completar el trabajo.');
            }
        } finally {
            setTrabajando(false);
        }
    }

    if (cargandoAuth || !isAuthenticated) return null;

    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">

                {/* Cabecera con las tres etapas */}
                <div className="mb-8">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-brown">
                        Agente · Beta
                    </p>
                    <h1 className="mb-5 font-serif text-3xl font-semibold text-charcoal-900 sm:text-4xl">
                        Demanda de amparo indirecto
                    </h1>
                    <ol className="flex items-center gap-2 text-[13px]">
                        {(
                            [
                                ['datos', 'Datos del caso'],
                                ['plan', 'Plan'],
                                ['trabajo', 'Trabajo'],
                            ] as [Etapa, string][]
                        ).map(([clave, nombre], i) => {
                            const orden: Etapa[] = ['datos', 'plan', 'trabajo'];
                            const hecho = orden.indexOf(etapa) > i;
                            const activo = etapa === clave;
                            return (
                                <li key={clave} className="flex items-center gap-2">
                                    {i > 0 && <span className="h-px w-5 bg-charcoal-900/15" aria-hidden />}
                                    <span
                                        className={`flex h-5 w-5 items-center justify-center rounded-lg text-[10px] font-bold ${
                                            hecho
                                                ? 'bg-accent-gold/20 text-accent-brown'
                                                : activo
                                                    ? 'bg-charcoal-900 text-white'
                                                    : 'bg-charcoal-900/[0.06] text-charcoal-500'
                                        }`}
                                    >
                                        {hecho ? <Check className="h-3 w-3" strokeWidth={3.5} /> : i + 1}
                                    </span>
                                    <span className={activo ? 'font-medium text-charcoal-900' : 'text-charcoal-500'}>
                                        {nombre}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                {/* ── 1. Datos ── */}
                {etapa === 'datos' && (
                    <div className="rounded-xl border border-cream-400 bg-white p-6 sm:p-7">
                        <p className="mb-6 text-[0.9375rem] leading-relaxed text-charcoal-600">
                            Con estos datos Iurexia arma un plan de trabajo. Podrás revisarlo y
                            ajustarlo antes de que empiece a redactar.
                        </p>

                        <div className="flex flex-col gap-4">
                            {/* ── Fracción I ── */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Campo etiqueta="Persona quejosa" obligatorio nota="art. 108, fr. I">
                                    <input
                                        value={datos.quejoso}
                                        onChange={(e) => setDatos({ ...datos, quejoso: e.target.value })}
                                        placeholder="Nombre completo"
                                        className={CLASE_INPUT}
                                    />
                                </Campo>
                                <Campo etiqueta="Domicilio para oír notificaciones" obligatorio nota="art. 108, fr. I">
                                    <input
                                        value={datos.domicilioQuejoso}
                                        onChange={(e) => setDatos({ ...datos, domicilioQuejoso: e.target.value })}
                                        placeholder="Calle, número, colonia, ciudad"
                                        className={CLASE_INPUT}
                                    />
                                </Campo>
                            </div>

                            <Campo etiqueta="Promueve en su nombre" nota="sólo si no promueve la propia quejosa; deberá acreditar su representación">
                                <input
                                    value={datos.promovente}
                                    onChange={(e) => setDatos({ ...datos, promovente: e.target.value })}
                                    placeholder="Nombre del representante, si aplica"
                                    className={CLASE_INPUT}
                                />
                            </Campo>

                            {/* ── Fracción II ── */}
                            <Campo etiqueta="Persona tercera interesada" obligatorio nota="art. 108, fr. II">
                                <input
                                    value={datos.terceroInteresado}
                                    onChange={(e) => setDatos({ ...datos, terceroInteresado: e.target.value })}
                                    placeholder="Nombre y domicilio"
                                    disabled={datos.terceroDesconocido}
                                    className={`${CLASE_INPUT} disabled:bg-cream-200 disabled:text-charcoal-400`}
                                />
                                <label className="mt-2 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-charcoal-700">
                                    <input
                                        type="checkbox"
                                        checked={datos.terceroDesconocido}
                                        onChange={(e) => setDatos({ ...datos, terceroDesconocido: e.target.checked })}
                                        className="mt-0.5 accent-charcoal-900"
                                    />
                                    No se conocen. Se manifestará así bajo protesta de decir verdad, como exige la fracción II.
                                </label>
                            </Campo>

                            {/* ── Fracciones III y IV ── */}
                            <Campo etiqueta="Autoridades responsables" obligatorio nota="art. 108, fr. III">
                                <textarea
                                    value={datos.autoridades}
                                    onChange={(e) => setDatos({ ...datos, autoridades: e.target.value })}
                                    placeholder="Una por línea, con su denominación oficial. Indica si es ordenadora o ejecutora."
                                    rows={2}
                                    className={`${CLASE_INPUT} resize-none`}
                                />
                            </Campo>

                            <Campo etiqueta="Acto u omisión reclamado" obligatorio nota="art. 108, fr. IV — lo que de cada autoridad se reclama">
                                <textarea
                                    value={datos.actoReclamado}
                                    onChange={(e) => setDatos({ ...datos, actoReclamado: e.target.value })}
                                    placeholder="Qué hizo u omitió cada autoridad. Ej.: la negativa a dar acceso al expediente…"
                                    rows={3}
                                    className={`${CLASE_INPUT} resize-none`}
                                />
                            </Campo>

                            {/* ── Fracción V: el relato ── */}
                            <Campo
                                etiqueta="Hechos"
                                obligatorio
                                nota="art. 108, fr. V — irán bajo protesta de decir verdad"
                            >
                                <textarea
                                    value={datos.hechos}
                                    onChange={(e) => setDatos({ ...datos, hechos: e.target.value })}
                                    placeholder={'Relata en orden lo que pasó: cuándo, dónde, quién y qué. Escríbelo como lo contarías; Iurexia lo ordena y lo numera.\n\nEj.: El 3 de marzo solicité por escrito el acceso al expediente. El 12 de marzo la autoridad respondió negándolo sin fundar…'}
                                    rows={7}
                                    className={`${CLASE_INPUT} resize-y`}
                                />
                                <p className="mt-2 rounded-lg border border-accent-gold/30 bg-accent-gold/[0.07] px-3 py-2 text-[12px] leading-relaxed text-charcoal-700">
                                    Estos hechos se presentarán <strong className="font-semibold">bajo protesta de decir verdad</strong>.
                                    Relata sólo lo que te conste; el agente no inventará ninguno y lo que falte lo dejará entre corchetes.
                                </p>
                            </Campo>

                            <Campo etiqueta="Notas para el agente">
                                <textarea
                                    value={datos.notas}
                                    onChange={(e) => setDatos({ ...datos, notas: e.target.value })}
                                    placeholder="Opcional: lo que quieras que tome en cuenta"
                                    rows={2}
                                    className={`${CLASE_INPUT} resize-none`}
                                />
                            </Campo>
                        </div>

                        {faltan.length > 0 && (
                            <div className="mt-6 rounded-lg border border-accent-gold/30 bg-accent-gold/[0.07] px-4 py-3">
                                <p className="text-[12.5px] font-semibold text-charcoal-900">
                                    Faltan requisitos del artículo 108
                                </p>
                                <p className="mt-1 text-[12px] leading-relaxed text-charcoal-600">
                                    Sin ellos el órgano previene conforme al artículo 114 y, de no
                                    subsanarse en cinco días, la demanda se tiene por no presentada.
                                </p>
                                <ul className="mt-2 flex flex-col gap-1">
                                    {faltan.map((r) => (
                                        <li key={r.fraccion} className="text-[12px] text-charcoal-700">
                                            <span className="font-semibold">Fr. {r.fraccion}</span> · {r.texto}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-7 flex items-center justify-between gap-3">
                            <Link href="/chat" className="text-[13px] text-charcoal-500 hover:text-charcoal-800">
                                Volver al chat
                            </Link>
                            <button
                                onClick={() => setEtapa('plan')}
                                disabled={!listoParaPlan}
                                className="inline-flex h-11 items-center gap-2 rounded-lg bg-charcoal-900 px-6 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800 disabled:opacity-40"
                            >
                                Ver el plan <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── 2. Plan ── */}
                {etapa === 'plan' && (
                    <div className="rounded-xl border border-cream-400 bg-white">
                        <div className="border-b border-cream-400 px-6 py-4">
                            <h2 className="font-serif text-lg font-semibold text-charcoal-900">
                                Esto es lo que voy a hacer
                            </h2>
                            <p className="mt-1 text-[13px] text-charcoal-600">
                                Revisa el plan y quita lo que no quieras. Los pasos marcados como
                                obligatorios son requisitos de la demanda y no se pueden desactivar.
                            </p>
                        </div>

                        {aviso && (
                            <div
                                className={`flex items-start gap-2.5 border-b px-6 py-3 ${
                                    aviso.tono === 'urgente'
                                        ? 'border-red-700/20 bg-red-50/60'
                                        : aviso.tono === 'atencion'
                                            ? 'border-accent-gold/30 bg-accent-gold/[0.07]'
                                            : 'border-cream-400 bg-cream-200/60'
                                }`}
                            >
                                <AlertTriangle
                                    className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                                        aviso.tono === 'urgente' ? 'text-red-700' : 'text-accent-brown'
                                    }`}
                                />
                                <p className="text-[13px] leading-relaxed text-charcoal-700">{aviso.texto}</p>
                            </div>
                        )}

                        <ol className="flex flex-col">
                            {planCompleto.map((paso, i) => {
                                const activo = paso.obligatorio || !desactivados.includes(paso.clave);
                                return (
                                    <li key={paso.clave} className="border-b border-cream-400 px-6 py-4 last:border-b-0">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-charcoal-900/[0.06] text-[10px] font-bold text-charcoal-600">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className={`text-[0.9375rem] font-semibold ${activo ? 'text-charcoal-900' : 'text-charcoal-400 line-through'}`}>
                                                        {paso.titulo}
                                                    </h3>
                                                    {paso.obligatorio && (
                                                        <span className="rounded border border-charcoal-900/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-charcoal-500">
                                                            Obligatorio
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`mt-1 text-[13px] leading-relaxed ${activo ? 'text-charcoal-600' : 'text-charcoal-400'}`}>
                                                    {paso.detalle}
                                                </p>
                                                {paso.fuentes.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {paso.fuentes.map((f) => (
                                                            <span key={f} className="inline-flex items-center gap-1 rounded-md border border-charcoal-900/10 px-2 py-0.5 text-[11px] text-charcoal-600">
                                                                <FileText className="h-2.5 w-2.5 text-accent-gold" />
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {!paso.obligatorio && (
                                                <button
                                                    onClick={() => alternar(paso.clave)}
                                                    className="flex-shrink-0 rounded-md border border-charcoal-900/10 px-2.5 py-1 text-[11px] font-medium text-charcoal-600 transition-colors hover:bg-charcoal-900/[0.04]"
                                                >
                                                    {activo ? 'Quitar' : 'Añadir'}
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>

                        {/* Los ocho requisitos, a la vista. Es lo que separa una
                            demanda que se admite de una que se previene. */}
                        <div className="border-t border-cream-400 bg-cream-200/40 px-6 py-4">
                            <p className="mb-3 text-[12.5px] font-semibold text-charcoal-900">
                                Requisitos del artículo 108
                            </p>
                            <ul className="flex flex-col gap-1.5">
                                {requisitos108(datos).map((r) => (
                                    <li key={r.fraccion} className="flex items-start gap-2 text-[12px] leading-snug">
                                        <span className="mt-[3px] flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-accent-gold/20">
                                            <Check className="h-2 w-2 text-accent-brown" strokeWidth={4} />
                                        </span>
                                        <span className="text-charcoal-700">
                                            <span className="font-semibold">Fr. {r.fraccion}</span> · {r.texto}
                                            <span className="ml-1.5 text-charcoal-500">
                                                {r.condicional ? '(sólo si aplica)' : r.origen === 'datos' ? '— lo aportaste tú' : '— lo redacta el agente'}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-cream-400 bg-cream-200/50 px-6 py-4">
                            <button
                                onClick={() => setEtapa('datos')}
                                className="inline-flex items-center gap-1.5 text-[13px] text-charcoal-600 hover:text-charcoal-900"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Cambiar datos
                            </button>
                            <button
                                onClick={ejecutar}
                                className="inline-flex h-11 items-center gap-2 rounded-lg bg-charcoal-900 px-6 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800"
                            >
                                Aprobar y ejecutar · {pasosAprobados.length} pasos
                            </button>
                        </div>
                    </div>
                )}

                {/* ── 3. Trabajo ── */}
                {etapa === 'trabajo' && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-cream-400 bg-white px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                {trabajando ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-accent-brown" />
                                ) : (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold/20">
                                        <Check className="h-3 w-3 text-accent-brown" strokeWidth={3.5} />
                                    </span>
                                )}
                                <p className="text-[0.9375rem] font-medium text-charcoal-900">
                                    {trabajando
                                        ? `Ejecutando el plan aprobado — ${pasosAprobados.length} pasos`
                                        : 'Plan completado'}
                                </p>
                                {trabajando && (
                                    <button
                                        onClick={() => abortRef.current?.abort()}
                                        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-charcoal-900/10 px-2.5 py-1 text-[11px] font-medium text-charcoal-600 hover:bg-charcoal-900/[0.04]"
                                    >
                                        <Square className="h-2.5 w-2.5 fill-current" /> Detener
                                    </button>
                                )}
                            </div>
                            <p className="mt-2 text-[12.5px] leading-relaxed text-charcoal-500">
                                El escrito es un borrador. Revísalo, complétalo donde quedaron
                                corchetes y verifica cada cita antes de presentarlo.
                            </p>
                        </div>

                        {error && (
                            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                        )}

                        {mensaje ? (
                            <ChatMessage message={mensaje} isStreaming={trabajando} onCitationClick={setPdf} />
                        ) : (
                            trabajando && (
                                <div className="flex items-center gap-2.5 rounded-xl border border-cream-400 bg-white px-5 py-6 text-sm text-charcoal-500">
                                    <Scale className="h-4 w-4 text-accent-gold" />
                                    Consultando la Ley de Amparo, la Constitución y los precedentes…
                                </div>
                            )
                        )}

                        {!trabajando && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => { setEtapa('plan'); setMensaje(null); }}
                                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-charcoal-900/15 px-4 text-[13px] font-medium text-charcoal-800 hover:bg-charcoal-900/[0.03]"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" /> Ajustar el plan
                                </button>
                                <Link
                                    href="/carpetas"
                                    className="inline-flex h-10 items-center rounded-lg border border-charcoal-900/15 px-4 text-[13px] font-medium text-charcoal-800 hover:bg-charcoal-900/[0.03]"
                                >
                                    Ir a Mi trabajo
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <PdfViewerPanel isOpen={pdf !== null} onClose={() => setPdf(null)} source={pdf} />
        </main>
    );
}

const CLASE_INPUT =
    'w-full rounded-lg border border-charcoal-900/12 bg-white px-3 py-2.5 text-[0.9375rem] text-charcoal-900 placeholder:text-charcoal-400 focus:border-accent-gold/60 focus:outline-none';

function Campo({
    etiqueta,
    obligatorio,
    nota,
    children,
}: {
    etiqueta: string;
    obligatorio?: boolean;
    /** La fracción del 108 que cubre el campo, para que se vea por qué se pide. */
    nota?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[12.5px] font-semibold text-charcoal-700">
                    {etiqueta}
                    {obligatorio && <span className="ml-1 text-accent-brown">*</span>}
                </span>
                {nota && <span className="text-[11px] text-charcoal-500">{nota}</span>}
            </span>
            {children}
        </label>
    );
}
