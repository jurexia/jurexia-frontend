'use client'

/* ═══ LA TABLA DE REVISIÓN (oct-2026) ═════════════════════════════════════
   Filas = documentos de la Bóveda; columnas = preguntas del abogado. Cada
   celda trae la respuesta, la CITA LITERAL que la sostiene y la página; la
   cita se comprobó contra el texto real («verificada») o se dice que no.
   Clic en la celda: el documento abierto en esa página con el pasaje
   resaltado. Completar la tabla cobra 1 consulta por cada 10 celdas, y se
   cotiza antes. */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    AlertTriangle, ArrowLeft, BadgeCheck, Download, FileSpreadsheet, Loader2, Play, Plus, Trash2, X,
} from 'lucide-react'

import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { VisorBoveda } from '@/components/boveda/VisorBoveda'
import {
    ErrorBoveda, columnasSugeridas, cotizarTabla, editarTabla, ejecutarTabla, exportarTabla, leerTabla,
    type Celda, type Columna, type TablaRevision, type TipoColumna,
} from '@/lib/boveda'

export default function TablaPage() {
    return (
        <ProtectedRoute>
            <Tabla />
        </ProtectedRoute>
    )
}

const TIPOS: { valor: TipoColumna; rotulo: string }[] = [
    { valor: 'texto', rotulo: 'Texto' },
    { valor: 'fecha', rotulo: 'Fecha' },
    { valor: 'monto', rotulo: 'Monto' },
    { valor: 'si_no', rotulo: 'Sí / No' },
    { valor: 'lista', rotulo: 'Lista' },
]

function Tabla() {
    const params = useParams<{ id: string; tablaId: string }>()
    const carpetaId = String(params?.id ?? '')
    const tablaId = String(params?.tablaId ?? '')

    const [datos, setDatos] = useState<TablaRevision | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cotizacion, setCotizacion] = useState<{ celdas: number; consultas: number; disponibles: number | null; alcanza: boolean; sin_costo: boolean } | null>(null)
    const [confirmando, setConfirmando] = useState(false)
    const [ejecutando, setEjecutando] = useState(false)
    const [exportando, setExportando] = useState<'xlsx' | 'docx' | null>(null)
    const [abierta, setAbierta] = useState<{ fila: string; columna: string } | null>(null)
    const [nuevaColumna, setNuevaColumna] = useState(false)
    const [sugeridas, setSugeridas] = useState<Columna[]>([])
    const [editandoTitulo, setEditandoTitulo] = useState(false)
    const [titulo, setTitulo] = useState('')

    const cargar = useCallback(async () => {
        try {
            const d = await leerTabla(tablaId)
            setDatos(d)
            setTitulo(d.tabla.titulo)
            if (d.pendientes === 0) setCotizacion(await cotizarTabla(tablaId))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo abrir la tabla.')
        }
    }, [tablaId])

    useEffect(() => { void cargar() }, [cargar])
    useEffect(() => { columnasSugeridas().then((r) => setSugeridas(r.columnas)).catch(() => {}) }, [])

    // Mientras haya celdas en cola, se pregunta cada 3 s.
    const pendientes = datos?.pendientes ?? 0
    useEffect(() => {
        if (!pendientes) return
        const t = setInterval(() => void cargar(), 3000)
        return () => clearInterval(t)
    }, [pendientes, cargar])

    const celdas = useMemo(() => {
        const m = new Map<string, Celda>()
        for (const c of datos?.celdas ?? []) m.set(`${c.documento_id}|${c.columna_id}`, c)
        return m
    }, [datos])

    async function guardarColumnas(columnas: Columna[]) {
        try {
            await editarTabla(tablaId, { columnas })
            await cargar()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo cambiar la tabla.')
        }
    }

    async function ejecutar() {
        if (!cotizacion) return
        setEjecutando(true)
        setError(null)
        try {
            await ejecutarTabla(tablaId, cotizacion.consultas)
            setConfirmando(false)
        } catch (e) {
            if (e instanceof ErrorBoveda && e.codigo === 'cotizacion_cambio') {
                setCotizacion(await cotizarTabla(tablaId))
                setError('La cotización cambió; revísala de nuevo.')
            } else {
                setError(e instanceof Error ? e.message : 'No se pudo completar la tabla.')
                setConfirmando(false)
            }
        } finally {
            setEjecutando(false)
            await cargar()
        }
    }

    async function exportar(formato: 'xlsx' | 'docx') {
        setExportando(formato)
        try {
            await exportarTabla(tablaId, formato, titulo || 'Tabla de revisión')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo exportar.')
        } finally {
            setExportando(null)
        }
    }

    if (!datos) {
        return (
            <div className="min-h-screen bg-cream-300">
                <Navbar plataforma />
                <div className="flex items-center justify-center gap-2 pt-40 text-sm text-charcoal-700/70">
                    {error ? <span className="text-red-700">{error}</span> : <><Loader2 className="h-4 w-4 animate-spin" /> Abriendo la tabla…</>}
                </div>
            </div>
        )
    }

    const cols = datos.tabla.columnas
    const sel = abierta ? celdas.get(`${abierta.fila}|${abierta.columna}`) : undefined
    const colSel = abierta ? cols.find((c) => c.id === abierta.columna) : undefined
    const filaSel = abierta ? datos.filas.find((f) => f.id === abierta.fila) : undefined
    const sinUsar = sugeridas.filter((s) => !cols.some((c) => c.id === s.id))

    return (
        <div className="min-h-screen bg-cream-300">
            <Navbar plataforma />
            <main className="px-4 pb-20 pt-24 sm:px-6">
                <Link href={`/carpetas/${carpetaId}`}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-700/70 transition hover:text-charcoal-900">
                    <ArrowLeft className="h-4 w-4" /> Volver a la carpeta
                </Link>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 shrink-0 text-accent-brown" />
                        {editandoTitulo ? (
                            <input
                                autoFocus
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                onBlur={async () => {
                                    setEditandoTitulo(false)
                                    if (titulo.trim() && titulo !== datos.tabla.titulo) {
                                        await editarTabla(tablaId, { titulo: titulo.trim() }).catch(() => {})
                                        await cargar()
                                    }
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                className="min-w-0 rounded-lg border border-cream-400 bg-cream-50 px-2 py-1 font-serif text-xl font-semibold text-charcoal-900 outline-none focus:border-accent-gold"
                            />
                        ) : (
                            <h1 onClick={() => setEditandoTitulo(true)} title="Cambiar el título"
                                className="cursor-text truncate font-serif text-2xl font-semibold text-charcoal-900">
                                {datos.tabla.titulo}
                            </h1>
                        )}
                        <span className="shrink-0 text-sm text-charcoal-700/60">
                            {datos.filas.length} documentos × {cols.length} columnas
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setNuevaColumna(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200">
                            <Plus className="h-4 w-4" /> Columna
                        </button>
                        <button onClick={() => void exportar('xlsx')} disabled={exportando !== null}
                            className="flex items-center gap-1.5 rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200 disabled:opacity-50">
                            {exportando === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Excel
                        </button>
                        <button onClick={() => void exportar('docx')} disabled={exportando !== null}
                            className="flex items-center gap-1.5 rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200 disabled:opacity-50">
                            {exportando === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Word
                        </button>
                        {pendientes ? (
                            <span className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50">
                                <Loader2 className="h-4 w-4 animate-spin text-accent-gold" /> Respondiendo {pendientes} celdas…
                            </span>
                        ) : cotizacion && cotizacion.celdas > 0 ? (
                            <button onClick={() => setConfirmando(true)}
                                className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800">
                                <Play className="h-4 w-4 text-accent-gold" />
                                Completar {cotizacion.celdas} celdas · {cotizacion.consultas} {cotizacion.consultas === 1 ? 'consulta' : 'consultas'}
                            </button>
                        ) : null}
                    </div>
                </div>

                {error ? (
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
                    </div>
                ) : null}

                {confirmando && cotizacion ? (
                    <div className="mb-4 rounded-lg border border-accent-gold/50 bg-accent-gold/10 px-4 py-3">
                        <p className="text-sm font-semibold text-charcoal-900">
                            {cotizacion.celdas} celdas → {cotizacion.consultas} {cotizacion.consultas === 1 ? 'consulta' : 'consultas'}
                        </p>
                        <p className="mt-1 text-xs text-charcoal-700/70">
                            {cotizacion.sin_costo || cotizacion.disponibles === null
                                ? 'Sin costo para tu cuenta.'
                                : `Te quedan ${cotizacion.disponibles.toLocaleString('es-MX')} consultas.`}
                            {!cotizacion.alcanza ? ' No te alcanzan.' : ''} Si alguna celda falla, se devuelve al terminar.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => void ejecutar()} disabled={ejecutando || !cotizacion.alcanza}
                                className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-charcoal-800 disabled:opacity-50">
                                {ejecutando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-accent-gold" />} Confirmar
                            </button>
                            <button onClick={() => setConfirmando(false)}
                                className="rounded-lg border border-cream-400 px-4 py-2 text-sm font-semibold text-charcoal-700 hover:bg-cream-100">
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : null}

                {/* ── La rejilla ─────────────────────────────────────── */}
                <div className="overflow-auto rounded-xl border border-cream-400 bg-white" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    <table className="border-separate border-spacing-0 text-sm">
                        <thead>
                            <tr>
                                <th className="sticky left-0 top-0 z-20 min-w-[220px] border-b border-r border-cream-400 bg-cream-100 px-3 py-2 text-left text-[11px] uppercase tracking-wider text-accent-brown">
                                    Documento
                                </th>
                                {cols.map((c) => (
                                    <th key={c.id} title={c.pregunta}
                                        className="group sticky top-0 z-10 min-w-[240px] max-w-[320px] border-b border-r border-cream-400 bg-cream-100 px-3 py-2 text-left align-top">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-brown">{c.titulo}</span>
                                            <button title="Quitar la columna"
                                                onClick={() => {
                                                    if (confirm(`¿Quitar la columna «${c.titulo}» y sus respuestas?`)) {
                                                        void guardarColumnas(cols.filter((x) => x.id !== c.id))
                                                    }
                                                }}
                                                className="hidden rounded p-0.5 text-charcoal-700/40 hover:text-red-600 group-hover:block">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <p className="mt-0.5 line-clamp-2 text-[11px] font-normal normal-case text-charcoal-700/60">{c.pregunta}</p>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {datos.filas.map((f) => (
                                <tr key={f.id}>
                                    <td className="sticky left-0 z-10 max-w-[260px] border-b border-r border-cream-400 bg-white px-3 py-2 align-top">
                                        <span className="line-clamp-2 font-medium text-charcoal-900" title={f.nombre}>{f.nombre}</span>
                                        <span className="text-[11px] text-charcoal-700/50">{f.paginas ?? '?'} pág.</span>
                                    </td>
                                    {cols.map((c) => {
                                        const x = celdas.get(`${f.id}|${c.id}`)
                                        const activa = abierta?.fila === f.id && abierta?.columna === c.id
                                        return (
                                            <td key={c.id}
                                                onClick={() => x?.estado === 'lista' && setAbierta({ fila: f.id, columna: c.id })}
                                                className={`max-w-[320px] border-b border-r border-cream-400 px-3 py-2 align-top ${x?.estado === 'lista' ? 'cursor-pointer hover:bg-cream-50' : ''} ${activa ? 'bg-accent-gold/10' : ''}`}>
                                                <ContenidoCelda celda={x} />
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {datos.filas.length === 0 ? (
                    <p className="mt-4 text-sm text-charcoal-700/60">Todavía no hay documentos listos en la Bóveda de esta carpeta.</p>
                ) : null}
            </main>

            {/* ── La celda abierta, con su documento ─────────────────── */}
            {abierta && sel && colSel && filaSel ? (
                <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-cream-400 bg-cream-50 shadow-2xl">
                    <div className="flex items-start justify-between gap-3 border-b border-cream-400 px-5 py-4">
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-accent-brown">{colSel.titulo}</p>
                            <p className="truncate text-sm font-semibold text-charcoal-900" title={filaSel.nombre}>{filaSel.nombre}</p>
                        </div>
                        <button onClick={() => setAbierta(null)} className="rounded p-1 text-charcoal-700/60 hover:bg-cream-200"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="space-y-3 px-5 py-4">
                            <p className="text-xs text-charcoal-700/60">{colSel.pregunta}</p>
                            <p className="text-[15px] leading-relaxed text-charcoal-900">{sel.respuesta?.valor || '—'}</p>
                            {sel.respuesta?.cita ? (
                                <blockquote className="border-l-[3px] border-accent-gold bg-cream-100 px-3 py-2 font-serif text-[13.5px] italic leading-relaxed text-charcoal-800">
                                    «{sel.respuesta.cita}»
                                    <span className="mt-1 block text-[11px] not-italic text-charcoal-700/70">
                                        {sel.respuesta.pagina ? `p. ${sel.respuesta.pagina}${filaSel.aproximadas ? ' (aprox.)' : ''} · ` : ''}
                                        {sel.respuesta.verificada
                                            ? <span className="text-green-700">cita verificada contra el documento</span>
                                            : <span className="text-amber-700">cita no verificada: cotéjala antes de usarla</span>}
                                    </span>
                                </blockquote>
                            ) : null}
                        </div>
                        <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-cream-400 bg-cream-200">
                            <VisorBoveda docId={filaSel.id} pagina={sel.respuesta?.pagina ?? 1} pasaje={sel.respuesta?.cita ?? null} alto={520} />
                        </div>
                    </div>
                </aside>
            ) : null}

            {nuevaColumna ? (
                <NuevaColumna
                    sugeridas={sinUsar}
                    onCerrar={() => setNuevaColumna(false)}
                    onAgregar={async (c) => {
                        setNuevaColumna(false)
                        await guardarColumnas([...cols, c])
                    }}
                />
            ) : null}
        </div>
    )
}

function ContenidoCelda({ celda }: { celda?: Celda }) {
    if (!celda) return <span className="text-charcoal-700/30">—</span>
    if (celda.estado === 'en_cola' || celda.estado === 'procesando') {
        return <Loader2 className="h-4 w-4 animate-spin text-charcoal-700/40" />
    }
    if (celda.estado === 'error' || celda.respuesta?.error) {
        return <span className="text-xs text-red-700">No se pudo responder; vuelve a completar la tabla.</span>
    }
    const r = celda.respuesta || {}
    if (!r.encontrado) return <span className="text-xs italic text-charcoal-700/50">{r.valor || 'No se menciona'}</span>
    return (
        <div>
            <p className="line-clamp-4 leading-snug text-charcoal-900">{r.valor}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px]">
                {r.pagina ? <span className="text-charcoal-700/60">p. {r.pagina}</span> : null}
                {r.verificada
                    ? <BadgeCheck className="h-3.5 w-3.5 text-green-700" aria-label="cita verificada" />
                    : <span className="text-amber-700">cita no verificada</span>}
            </p>
        </div>
    )
}

function NuevaColumna({ sugeridas, onCerrar, onAgregar }: {
    sugeridas: Columna[]
    onCerrar: () => void
    onAgregar: (c: Columna) => void | Promise<void>
}) {
    const [titulo, setTitulo] = useState('')
    const [pregunta, setPregunta] = useState('')
    const [tipo, setTipo] = useState<TipoColumna>('texto')
    const valida = titulo.trim().length > 0 && pregunta.trim().length >= 3
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4" onClick={onCerrar}>
            <div className="w-full max-w-lg rounded-xl bg-cream-50 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-serif text-lg font-semibold text-charcoal-900">Nueva columna</h2>
                {sugeridas.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {sugeridas.map((s) => (
                            <button key={s.id} onClick={() => void onAgregar(s)}
                                className="rounded-full border border-cream-400 bg-white px-3 py-1 text-xs font-semibold text-charcoal-700 hover:bg-cream-100">
                                + {s.titulo}
                            </button>
                        ))}
                    </div>
                ) : null}
                <label className="mt-4 block text-xs font-semibold text-charcoal-700">Título</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} placeholder="Causales de rescisión"
                    className="mt-1 w-full rounded-lg border border-cream-400 bg-white px-3 py-2 text-sm outline-none focus:border-accent-gold" />
                <label className="mt-3 block text-xs font-semibold text-charcoal-700">Pregunta</label>
                <textarea value={pregunta} onChange={(e) => setPregunta(e.target.value)} rows={3} maxLength={600}
                    placeholder="¿Qué causales de rescisión se pactaron y quién puede invocarlas?"
                    className="mt-1 w-full resize-none rounded-lg border border-cream-400 bg-white px-3 py-2 text-sm outline-none focus:border-accent-gold" />
                <label className="mt-3 block text-xs font-semibold text-charcoal-700">Formato de la respuesta</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoColumna)}
                    className="mt-1 w-full rounded-lg border border-cream-400 bg-white px-3 py-2 text-sm">
                    {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                </select>
                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onCerrar} className="rounded-lg border border-cream-400 px-4 py-2 text-sm font-semibold text-charcoal-700 hover:bg-cream-100">Cancelar</button>
                    <button disabled={!valida}
                        onClick={() => void onAgregar({ id: '', titulo: titulo.trim(), pregunta: pregunta.trim(), tipo })}
                        className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-charcoal-800 disabled:opacity-50">
                        Agregar
                    </button>
                </div>
            </div>
        </div>
    )
}
