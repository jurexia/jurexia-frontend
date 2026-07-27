'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    AlertTriangle,
    ArrowLeft,
    ChevronRight,
    Download,
    Loader2,
    Sparkles,
    Target,
    Trash2,
    Upload,
} from 'lucide-react'

import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArchivoIcono, CarpetaIcono } from '@/components/CarpetaIcono'
import { useAuth } from '@/lib/useAuth'
import {
    actualizarObjetivo,
    borrarDocumento,
    borrarExpediente,
    categoriasDe,
    etiquetaMateria,
    generarResumenCaso,
    getDocumentos,
    getExpediente,
    nombreCarpeta,
    subirDocumento,
    tipoCarpeta,
    urlFirmada,
    type CategoriaDocumento,
    type DocumentoExpediente,
    type Expediente,
    type ProgresoResumen,
} from '@/lib/expedientes'

/**
 * Dentro de una carpeta.
 *
 * Tres bloques, en el orden en que le importan al abogado: qué quiere lograr,
 * qué le dice Iurexia sobre dónde está, y sus documentos por gaveta.
 *
 * El análisis va **arriba de los documentos** a propósito. Si el abogado abre y
 * lo primero que ve es una lista de archivos, esto es un Dropbox; si lo primero
 * que ve es «te falta el acuse de recibo del 12 de marzo», es otra cosa.
 */
export default function CarpetaPage() {
    return (
        <ProtectedRoute>
            <Detalle />
        </ProtectedRoute>
    )
}

function Detalle() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const id = String(params?.id ?? '')
    const { session, profile } = useAuth()

    const [expediente, setExpediente] = useState<Expediente | null>(null)
    const [documentos, setDocumentos] = useState<DocumentoExpediente[]>([])
    const [cargando, setCargando] = useState(true)
    const [analizando, setAnalizando] = useState(false)
    const [progreso, setProgreso] = useState<ProgresoResumen | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [subiendoEn, setSubiendoEn] = useState<CategoriaDocumento | null>(null)
    const [editandoObjetivo, setEditandoObjetivo] = useState(false)
    const [borradorObjetivo, setBorradorObjetivo] = useState('')

    const entradaArchivo = useRef<HTMLInputElement>(null)
    const gavetaDestino = useRef<CategoriaDocumento>('base')

    const limite = profile?.queries_limit ?? 5
    const sinCupo = Math.max(0, limite - (profile?.queries_used ?? 0)) === 0

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const exp = await getExpediente(id)
            setExpediente(exp)
            if (exp) setDocumentos(await getDocumentos(id))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo abrir la carpeta.')
        } finally {
            setCargando(false)
        }
    }, [id])

    useEffect(() => {
        void cargar()
    }, [cargar])

    async function analizar() {
        if (!expediente) return
        if (sinCupo) {
            setError(
                'Se te acabaron las consultas de este periodo. Analizar una carpeta cuesta una.'
            )
            return
        }
        setAnalizando(true)
        setError(null)
        setProgreso(null)
        try {
            const r = await generarResumenCaso(
                expediente,
                documentos,
                session?.access_token,
                session?.user?.id,
                setProgreso
            )
            setExpediente({
                ...expediente,
                resumen_ia: r.resumen,
                estado_ia: r.estado,
                faltantes: r.faltantes,
                riesgos: r.riesgos,
                avance: r.avance,
                resumen_at: new Date().toISOString(),
            })
            // Los extractos quedaron guardados; recargamos para reflejarlo.
            setDocumentos(await getDocumentos(id))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo analizar la carpeta.')
        } finally {
            setAnalizando(false)
            setProgreso(null)
        }
    }

    function pedirArchivo(categoria: CategoriaDocumento) {
        gavetaDestino.current = categoria
        entradaArchivo.current?.click()
    }

    async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
        const archivos = Array.from(e.target.files ?? [])
        e.target.value = '' // permite volver a subir el mismo archivo
        if (archivos.length === 0 || !expediente) return

        const categoria = gavetaDestino.current
        setSubiendoEn(categoria)
        setError(null)
        try {
            for (const archivo of archivos) {
                const doc = await subirDocumento(
                    expediente.id,
                    categoria,
                    archivo,
                    profile?.subscription_type
                )
                setDocumentos((prev) => [doc, ...prev])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.')
        } finally {
            setSubiendoEn(null)
        }
    }

    async function abrir(doc: DocumentoExpediente) {
        const url = await urlFirmada(doc)
        if (url) window.open(url, '_blank', 'noopener')
        else setError('No se pudo abrir el documento en este momento.')
    }

    async function quitar(doc: DocumentoExpediente) {
        if (!window.confirm(`Se quitará «${doc.nombre}» de la carpeta. ¿Continuar?`)) return
        try {
            await borrarDocumento(doc)
            setDocumentos((prev) => prev.filter((d) => d.id !== doc.id))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo eliminar.')
        }
    }

    async function guardarObjetivo() {
        if (!expediente) return
        try {
            await actualizarObjetivo(expediente.id, borradorObjetivo)
            setExpediente({ ...expediente, objetivo: borradorObjetivo.trim() || null })
            setEditandoObjetivo(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el objetivo.')
        }
    }

    async function eliminarCarpeta() {
        if (!expediente) return
        if (
            !window.confirm(
                `Se eliminará «${nombreCarpeta(expediente)}» con todos sus documentos. Esto no se puede deshacer.`
            )
        )
            return
        try {
            await borrarExpediente(expediente.id)
            router.push('/carpetas')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo eliminar la carpeta.')
        }
    }

    if (cargando) {
        return (
            <div className="min-h-screen bg-cream-300">
                <Navbar />
                <div className="mx-auto max-w-4xl px-4 pt-28">
                    <div className="h-48 animate-pulse rounded-xl border border-cream-400 bg-cream-100" />
                </div>
            </div>
        )
    }

    if (!expediente) {
        return (
            <div className="min-h-screen bg-cream-300">
                <Navbar />
                <div className="mx-auto max-w-4xl px-4 pt-28 text-center">
                    <h1 className="font-serif text-2xl text-charcoal-900">
                        Esta carpeta ya no existe
                    </h1>
                    <button
                        onClick={() => router.push('/carpetas')}
                        className="mt-4 text-sm font-semibold text-accent-brown hover:underline">
                        Volver a mis carpetas
                    </button>
                </div>
            </div>
        )
    }

    const tipo = tipoCarpeta(expediente.tipo)
    const gavetas = categoriasDe(expediente.tipo)
    const leidos = documentos.filter((d) => d.extracto).length

    return (
        <div className="min-h-screen bg-cream-300">
            <Navbar />

            <input
                ref={entradaArchivo}
                type="file"
                multiple
                onChange={alElegirArchivo}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />

            <main className="mx-auto max-w-4xl px-4 pb-20 pt-24 sm:px-6">
                {/* ── Ruta ─────────────────────────────────────────────────── */}
                <button
                    onClick={() => router.push('/carpetas')}
                    className="mb-5 flex items-center gap-1.5 text-sm text-charcoal-700/70 transition hover:text-charcoal-900">
                    <ArrowLeft className="h-4 w-4" />
                    Mis carpetas inteligentes
                </button>

                {/* ── Encabezado ───────────────────────────────────────────── */}
                <div className="mb-6 flex items-start gap-5">
                    <CarpetaIcono
                        tipo={expediente.tipo}
                        tamano={84}
                        documentos={documentos.length}
                        avance={expediente.avance}
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl font-semibold leading-tight text-charcoal-900">
                            {nombreCarpeta(expediente)}
                        </h1>
                        <p className="mt-1 text-sm text-charcoal-700/60">
                            {tipo.label}
                            {expediente.materia ? ` · ${etiquetaMateria(expediente.materia)}` : ''}
                            {` · ${documentos.length} ${documentos.length === 1 ? 'documento' : 'documentos'}`}
                        </p>
                    </div>
                    <button
                        onClick={() => void eliminarCarpeta()}
                        title="Eliminar la carpeta"
                        className="rounded-lg p-2 text-charcoal-700/40 transition hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                {error ? (
                    <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="flex-1">{error}</span>
                    </div>
                ) : null}

                {/* ── El objetivo ──────────────────────────────────────────── */}
                <section className="mb-6 rounded-xl border border-cream-400 bg-cream-100 p-5">
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent-brown">
                        <Target className="h-4 w-4" />
                        Objetivo
                    </h2>
                    {editandoObjetivo ? (
                        <div className="space-y-3">
                            <textarea
                                value={borradorObjetivo}
                                onChange={(e) => setBorradorObjetivo(e.target.value)}
                                rows={3}
                                placeholder={tipo.ejemploObjetivo}
                                className="w-full resize-none rounded-lg border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-accent-gold"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => void guardarObjetivo()}
                                    className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50">
                                    Guardar
                                </button>
                                <button
                                    onClick={() => setEditandoObjetivo(false)}
                                    className="rounded-lg border border-cream-400 px-4 py-2 text-sm font-semibold text-charcoal-700">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setBorradorObjetivo(expediente.objetivo ?? '')
                                setEditandoObjetivo(true)
                            }}
                            className="w-full text-left">
                            {expediente.objetivo ? (
                                <p className="leading-relaxed text-charcoal-900">
                                    {expediente.objetivo}
                                </p>
                            ) : (
                                <p className="text-sm italic leading-relaxed text-charcoal-700/50">
                                    Sin objetivo. Escríbelo y Iurexia podrá medir qué te falta para
                                    llegar, en vez de sólo describirte lo que ya tienes.
                                </p>
                            )}
                        </button>
                    )}
                </section>

                {/* ── El análisis ──────────────────────────────────────────── */}
                <section className="mb-8 rounded-xl border border-cream-400 bg-cream-100 p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent-brown">
                            <Sparkles className="h-4 w-4" />
                            Lo que ve Iurexia
                        </h2>
                        {expediente.avance !== null ? (
                            <span className="rounded-full bg-accent-gold/20 px-3 py-1 text-sm font-bold text-accent-brown">
                                {expediente.avance}% de avance
                            </span>
                        ) : null}
                    </div>

                    {analizando ? (
                        <div className="flex items-center gap-3 py-6 text-sm text-charcoal-700/70">
                            <Loader2 className="h-5 w-5 animate-spin text-accent-brown" />
                            {progreso?.fase === 'leyendo'
                                ? `Leyendo ${progreso.actual} de ${progreso.total}: ${progreso.documento}`
                                : progreso?.fase === 'sintetizando'
                                  ? 'Analizando el caso contra tu objetivo…'
                                  : 'Preparando el análisis…'}
                        </div>
                    ) : expediente.resumen_ia ? (
                        <div className="space-y-5">
                            {expediente.faltantes?.length ? (
                                <Lista
                                    titulo="Qué te falta"
                                    puntos={expediente.faltantes}
                                    tono="falta"
                                />
                            ) : null}
                            {expediente.riesgos?.length ? (
                                <Lista
                                    titulo="Riesgos que quizá no viste"
                                    puntos={expediente.riesgos}
                                    tono="riesgo"
                                />
                            ) : null}

                            <details className="group">
                                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-accent-brown">
                                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                    Ver el análisis completo
                                </summary>
                                <div className="mt-3 whitespace-pre-wrap rounded-lg border border-cream-400 bg-cream-50 p-4 text-sm leading-relaxed text-charcoal-700/90">
                                    {expediente.resumen_ia}
                                </div>
                            </details>

                            <button
                                onClick={() => void analizar()}
                                disabled={documentos.length === 0}
                                className="rounded-lg border border-cream-400 px-4 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200 disabled:opacity-50">
                                Actualizar análisis · 1 consulta
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm leading-relaxed text-charcoal-700/80">
                                Sube los documentos y Iurexia los leerá para darte el resumen del
                                caso, su estado, qué te falta y qué riesgos corres.
                            </p>
                            <button
                                onClick={() => void analizar()}
                                disabled={documentos.length === 0}
                                className="mt-4 flex items-center gap-2 rounded-lg bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800 disabled:opacity-50">
                                <Sparkles className="h-4 w-4" />
                                {documentos.length === 0
                                    ? 'Sube un documento primero'
                                    : 'Analizar la carpeta · 1 consulta'}
                            </button>
                        </div>
                    )}

                    {documentos.length > 0 && leidos < documentos.length && !analizando ? (
                        <p className="mt-3 text-xs text-charcoal-700/50">
                            {leidos} de {documentos.length} documentos ya fueron leídos por la IA.
                        </p>
                    ) : null}
                </section>

                {/* ── Las gavetas ──────────────────────────────────────────── */}
                <h2 className="mb-4 font-serif text-xl font-semibold text-charcoal-900">
                    Documentos
                </h2>
                <div className="space-y-4">
                    {gavetas.map((g) => {
                        const suyos = documentos.filter((d) => d.categoria === g.value)
                        return (
                            <section
                                key={g.value}
                                className="rounded-xl border border-cream-400 bg-cream-100 p-5">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold text-charcoal-900">
                                            {g.label}
                                            <span className="ml-2 text-sm font-normal text-charcoal-700/50">
                                                {suyos.length}
                                            </span>
                                        </h3>
                                        <p className="mt-0.5 text-xs text-charcoal-700/60">
                                            {g.descripcion}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => pedirArchivo(g.value)}
                                        disabled={subiendoEn !== null}
                                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200 disabled:opacity-50">
                                        {subiendoEn === g.value ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                        Subir
                                    </button>
                                </div>

                                {suyos.length === 0 ? (
                                    <p className="py-3 text-sm italic text-charcoal-700/40">
                                        Nada aquí todavía.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                        {suyos.map((d) => (
                                            <div
                                                key={d.id}
                                                className="group relative flex flex-col items-center rounded-lg border border-transparent p-3 text-center transition hover:border-cream-400 hover:bg-cream-50">
                                                <button
                                                    onClick={() => void abrir(d)}
                                                    className="flex flex-col items-center">
                                                    <ArchivoIcono nombre={d.nombre} tamano={48} />
                                                    <span className="mt-2 line-clamp-2 text-xs leading-snug text-charcoal-900">
                                                        {d.nombre}
                                                    </span>
                                                </button>
                                                {d.extracto ? (
                                                    <span
                                                        title="Iurexia ya leyó este documento"
                                                        className="mt-1 text-[10px] font-semibold text-green-700">
                                                        Leído
                                                    </span>
                                                ) : null}
                                                <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                                                    <button
                                                        onClick={() => void abrir(d)}
                                                        title="Abrir"
                                                        className="rounded p-1 text-charcoal-700/50 hover:bg-cream-300">
                                                        <Download className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => void quitar(d)}
                                                        title="Quitar"
                                                        className="rounded p-1 text-charcoal-700/50 hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )
                    })}
                </div>
            </main>
        </div>
    )
}

/** Los faltantes y los riesgos: lo que de verdad venden la carpeta. */
function Lista({
    titulo,
    puntos,
    tono,
}: {
    titulo: string
    puntos: string[]
    tono: 'falta' | 'riesgo'
}) {
    return (
        <div>
            <h3
                className={`mb-2 text-sm font-bold ${
                    tono === 'riesgo' ? 'text-red-700' : 'text-charcoal-900'
                }`}>
                {titulo}
            </h3>
            <ul className="space-y-2">
                {puntos.map((p, i) => (
                    <li
                        key={i}
                        className={`rounded-lg border-l-[3px] bg-cream-50 px-3 py-2 text-sm leading-relaxed text-charcoal-700/90 ${
                            tono === 'riesgo' ? 'border-red-400' : 'border-accent-gold'
                        }`}>
                        {p}
                    </li>
                ))}
            </ul>
        </div>
    )
}
