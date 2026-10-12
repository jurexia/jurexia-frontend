'use client'

/* ═══ LA BÓVEDA DE LA CARPETA ═════════════════════════════════════════════
   De 50 a 500 documentos por carpeta, para preguntarles juntos (chat) o en
   tabla. Platinum: quien no lo es ve la sección con candado y la invitación.

   El costo SIEMPRE se dice antes: subir no cobra nada; la API cuenta las
   páginas (cuáles van a OCR) y aquí se enseña «47 documentos · 312 páginas
   (40 escaneadas) → 8 consultas». Sólo al confirmar se cobra. */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    AlertTriangle, FileSpreadsheet, FileUp, FolderUp, Loader2, Lock, MessagesSquare, Plus,
    Trash2, Vault,
} from 'lucide-react'

import { isAdmin } from '@/app/leyesestatales/adminGuard'
import { useAuth } from '@/lib/useAuth'
import {
    ErrorBoveda, PLANES_PLATINUM, ROTULO_ESTADO, borrarDocumentoBoveda, columnasSugeridas,
    confirmarIngesta, crearTabla, abrirDocumento, documentosGuardados, leerBoveda, leerReglas, quitarDocumentos,
    separarArchivos, subirArchivos, textoCotizacion, vaciarBoveda,
    type BovedaCarpeta, type DocumentoBoveda, type ProgresoSubida, type Reglas,
} from '@/lib/boveda'

const COLOR_ESTADO: Record<string, string> = {
    listo: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-700',
    revisado: 'bg-accent-gold/20 text-accent-brown',
    procesando: 'bg-blue-50 text-blue-800',
    en_cola: 'bg-cream-300 text-charcoal-700',
}

export default function SeccionBoveda({ carpetaId }: { carpetaId: string }) {
    const { user, profile } = useAuth()
    const router = useRouter()
    const platinumLocal = isAdmin(user?.email) || PLANES_PLATINUM.includes(profile?.subscription_type ?? '')

    const [reglas, setReglas] = useState<Reglas | null>(null)
    const [datos, setDatos] = useState<BovedaCarpeta | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [subida, setSubida] = useState<ProgresoSubida | null>(null)
    const [ignorados, setIgnorados] = useState<string[]>([])
    const [cobrando, setCobrando] = useState(false)
    const [creandoTabla, setCreandoTabla] = useState(false)
    const [arrastrando, setArrastrando] = useState(false)
    const [guardados, setGuardados] = useState(0)
    const entradaArchivos = useRef<HTMLInputElement>(null)
    const entradaCarpeta = useRef<HTMLInputElement>(null)

    const cargar = useCallback(async () => {
        try {
            setDatos(await leerBoveda(carpetaId))
        } catch (e) {
            if (e instanceof ErrorBoveda && e.codigo === 'requiere_platinum') return
            setError(e instanceof Error ? e.message : 'No se pudo leer la Bóveda.')
        }
    }, [carpetaId])

    useEffect(() => {
        if (!user) return
        leerReglas().then(setReglas).catch(() => setReglas(null))
    }, [user])

    useEffect(() => {
        if (reglas?.platinum) void cargar()
        // Quien dejó de ser Platinum conserva el derecho a borrar lo que subió.
        else if (reglas && !reglas.platinum) documentosGuardados(carpetaId).then(setGuardados).catch(() => {})
    }, [reglas, cargar, carpetaId])

    // Mientras haya algo contando páginas o leyéndose, se pregunta cada 3 s.
    const ocupada = Boolean(datos && (datos.resumen.por_revisar > 0 || datos.resumen.en_proceso > 0))
    useEffect(() => {
        if (!ocupada || subida) return
        const t = setInterval(() => void cargar(), 3000)
        return () => clearInterval(t)
    }, [ocupada, subida, cargar])

    // El atributo no estándar se pone a mano: React no lo tipa.
    useEffect(() => {
        entradaCarpeta.current?.setAttribute('webkitdirectory', '')
        entradaCarpeta.current?.setAttribute('directory', '')
    }, [reglas?.platinum])

    const platinum = reglas ? reglas.platinum : platinumLocal

    if (!platinum) {
        return (
            <section className="mb-8 rounded-xl border border-cream-400 bg-white p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent-brown">
                    <Vault className="h-4 w-4" />
                    Bóveda
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-accent-gold/40 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal">
                        <Lock className="h-2.5 w-2.5" /> Plan Platinum
                    </span>
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-charcoal-700/80">
                    Sube el expediente completo —hasta 500 documentos en PDF o Word— y pregúntale a todos a
                    la vez: Iurexia responde citando el documento y la página. Arma tablas de revisión
                    (partes, vigencias, penas convencionales, jurisdicción…) con la cita literal de cada
                    respuesta, y expórtalas a Excel o Word.
                </p>
                <Link
                    href="/precios"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800">
                    <Lock className="h-4 w-4 text-accent-gold" />
                    Ver el plan Platinum
                </Link>
                {guardados > 0 ? (
                    <p className="mt-4 text-xs text-charcoal-700/70">
                        Esta carpeta conserva {guardados} documento(s) en su Bóveda.{' '}
                        <button
                            onClick={async () => {
                                if (!confirm('¿Borrar los documentos de la Bóveda de esta carpeta, con su índice y sus tablas?')) return
                                try { await vaciarBoveda(carpetaId); setGuardados(0) } catch { /* sigue */ }
                            }}
                            className="font-semibold text-red-700 underline">
                            Borrarlos
                        </button>
                    </p>
                ) : null}
            </section>
        )
    }

    async function subir(lista: File[]) {
        const { validos, ignorados: fuera } = separarArchivos(lista)
        setIgnorados(fuera)
        setError(null)
        if (!validos.length) {
            if (fuera.length) setError('La Bóveda sólo admite PDF y Word (.docx).')
            return
        }
        try {
            const fin = await subirArchivos(carpetaId, validos, setSubida)
            if (fin.fallidos.length) {
                setError(`No se pudieron subir ${fin.fallidos.length}: ${fin.fallidos.slice(0, 5).join(', ')}${fin.fallidos.length > 5 ? '…' : ''}`)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo subir.')
        } finally {
            setSubida(null)
            await cargar()
        }
    }

    async function confirmar() {
        if (!datos?.cotizacion) return
        setCobrando(true)
        setError(null)
        try {
            await confirmarIngesta(carpetaId, datos.cotizacion.ids, datos.cotizacion.consultas)
        } catch (e) {
            if (e instanceof ErrorBoveda && e.codigo === 'saldo_insuficiente') {
                setError(e.message)   // «hacen falta N y te quedan M»
            } else {
                setError(e instanceof Error ? e.message : 'No se pudo confirmar.')
            }
        } finally {
            setCobrando(false)
            await cargar()
        }
    }

    async function descartarPendientes() {
        if (!datos?.cotizacion) return
        if (!confirm(`¿Quitar los ${datos.cotizacion.documentos} documentos sin indexar? No se cobra nada.`)) return
        try {
            await quitarDocumentos(carpetaId, datos.cotizacion.ids)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron quitar.')
        }
        await cargar()
    }

    async function quitar(d: DocumentoBoveda) {
        if (!confirm(`¿Quitar «${d.nombre}» de la Bóveda? Se borran el archivo y su índice.`)) return
        try {
            await borrarDocumentoBoveda(d.id)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo quitar.')
        }
        await cargar()
    }

    async function vaciar() {
        if (!confirm('¿Vaciar la Bóveda de esta carpeta? Se borran todos sus documentos, su índice y sus tablas. Las consultas cobradas no se devuelven.')) return
        try {
            await vaciarBoveda(carpetaId)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo vaciar.')
        }
        await cargar()
    }

    async function nuevaTabla() {
        setCreandoTabla(true)
        try {
            const { columnas } = await columnasSugeridas()
            const t = await crearTabla(carpetaId, 'Tabla de revisión', columnas)
            router.push(`/carpetas/${carpetaId}/tabla/${t.id}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear la tabla.')
            setCreandoTabla(false)
        }
    }

    async function abrir(d: DocumentoBoveda) {
        try {
            const r = await abrirDocumento(d.id)
            window.open(r.url, '_blank', 'noopener')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo abrir.')
        }
    }

    const r = datos?.resumen
    const cot = datos?.cotizacion
    const contando = (r?.por_revisar ?? 0) > 0

    return (
        <section
            className={`mb-8 rounded-xl border bg-white p-5 transition ${arrastrando ? 'border-accent-gold ring-2 ring-accent-gold/40' : 'border-cream-400'}`}
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
                e.preventDefault()
                setArrastrando(false)
                void subir(Array.from(e.dataTransfer.files))
            }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent-brown">
                    <Vault className="h-4 w-4" />
                    Bóveda
                    {r ? (
                        <span className="ml-1 text-xs font-normal normal-case tracking-normal text-charcoal-700/60">
                            {r.listos.toLocaleString('es-MX')} documentos · {r.paginas_listas.toLocaleString('es-MX')} páginas
                        </span>
                    ) : null}
                </h2>
                <div className="flex flex-wrap gap-2">
                    {r && r.listos > 0 ? (
                        <Link
                            href={`/chat?carpeta=${carpetaId}&boveda=1`}
                            className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-3.5 py-2 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800">
                            <MessagesSquare className="h-4 w-4 text-accent-gold" />
                            Preguntar a la Bóveda
                        </Link>
                    ) : null}
                </div>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-charcoal-700/80">
                Hasta {reglas?.cuotas.docs_carpeta ?? 500} documentos (PDF o Word) para preguntarles juntos.
                Subir no cuesta: Iurexia cuenta las páginas y te dice cuánto costará antes de indexar
                (1 consulta por cada {reglas?.reglas.paginas_ocr_por_consulta ?? 10} páginas escaneadas
                o {reglas?.reglas.paginas_texto_por_consulta ?? 100} con texto).
            </p>

            {error ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="flex-1 whitespace-pre-line">{error}</span>
                </div>
            ) : null}

            {/* ── Subir ─────────────────────────────────────────────── */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <input ref={entradaArchivos} type="file" multiple accept=".pdf,.docx" className="hidden"
                    onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void subir(f) }} />
                <input ref={entradaCarpeta} type="file" multiple className="hidden"
                    onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void subir(f) }} />
                <button
                    onClick={() => entradaArchivos.current?.click()}
                    disabled={subida !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200 disabled:opacity-50">
                    <FileUp className="h-4 w-4" /> Subir documentos
                </button>
                <button
                    onClick={() => entradaCarpeta.current?.click()}
                    disabled={subida !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200 disabled:opacity-50">
                    <FolderUp className="h-4 w-4" /> Subir una carpeta
                </button>
                <span className="text-xs text-charcoal-700/50">o arrástralos aquí</span>
            </div>

            {subida ? (
                <Barra
                    texto={`Subiendo ${subida.subidos.toLocaleString('es-MX')} de ${subida.total.toLocaleString('es-MX')}…`}
                    valor={subida.total ? subida.subidos / subida.total : 0} />
            ) : null}
            {ignorados.length ? (
                <p className="mt-2 text-xs text-charcoal-700/60">
                    No se subieron {ignorados.length} archivo(s) que no son PDF ni Word.
                </p>
            ) : null}

            {/* ── Cotización ─────────────────────────────────────────── */}
            {contando && !subida ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-cream-100 px-4 py-3 text-sm text-charcoal-700">
                    <Loader2 className="h-4 w-4 animate-spin text-accent-brown" />
                    Contando las páginas de {r!.por_revisar} documento(s)…
                </div>
            ) : null}
            {cot && !contando && !subida ? (
                <div className="mt-4 rounded-lg border border-accent-gold/50 bg-accent-gold/10 px-4 py-3">
                    <p className="text-sm font-semibold text-charcoal-900">{textoCotizacion(cot)}</p>
                    <p className="mt-1 text-xs text-charcoal-700/70">
                        {cot.sin_costo || cot.disponibles === null
                            ? 'Sin costo para tu cuenta.'
                            : `Te quedan ${cot.disponibles.toLocaleString('es-MX')} consultas.`}
                        {cot.excede_cuota && cot.mensaje_cuota ? ` ${cot.mensaje_cuota}` : ''}
                        {!cot.alcanza ? ' No te alcanzan: compra una recarga o espera tu siguiente periodo.' : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            onClick={() => void confirmar()}
                            disabled={cobrando || !cot.alcanza || cot.excede_cuota}
                            className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800 disabled:opacity-50">
                            {cobrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vault className="h-4 w-4 text-accent-gold" />}
                            Indexar · {cot.consultas} {cot.consultas === 1 ? 'consulta' : 'consultas'}
                        </button>
                        <button
                            onClick={() => void descartarPendientes()}
                            disabled={cobrando}
                            className="rounded-lg border border-cream-400 px-4 py-2 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-100">
                            Descartar
                        </button>
                    </div>
                </div>
            ) : null}

            {r && r.en_proceso > 0 ? (
                <Barra
                    texto={`Leyendo e indexando: ${r.listos.toLocaleString('es-MX')} listos, ${r.en_proceso.toLocaleString('es-MX')} en proceso`}
                    valor={r.listos / Math.max(1, r.listos + r.en_proceso)} />
            ) : null}

            {/* ── Tablas de revisión ─────────────────────────────────── */}
            {r && r.listos > 0 ? (
                <div className="mt-5">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-charcoal-900">
                            <FileSpreadsheet className="h-4 w-4 text-accent-brown" /> Tablas de revisión
                        </h3>
                        <button
                            onClick={() => void nuevaTabla()}
                            disabled={creandoTabla}
                            className="flex items-center gap-1.5 rounded-lg border border-cream-400 px-3 py-1.5 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-100 disabled:opacity-50">
                            {creandoTabla ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Nueva tabla
                        </button>
                    </div>
                    {datos!.tablas.length ? (
                        <ul className="mt-2 divide-y divide-cream-400/70 overflow-hidden rounded-lg border border-cream-400">
                            {datos!.tablas.map((t) => (
                                <li key={t.id}>
                                    <Link href={`/carpetas/${carpetaId}/tabla/${t.id}`}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-cream-100">
                                        <span className="truncate font-medium text-charcoal-900">{t.titulo}</span>
                                        <span className="shrink-0 text-xs text-charcoal-700/50">{t.columnas} columnas</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-1.5 text-xs text-charcoal-700/60">
                            Filas = documentos; columnas = tus preguntas. Cada respuesta con su cita literal y su página.
                        </p>
                    )}
                </div>
            ) : null}

            {/* ── Los documentos ─────────────────────────────────────── */}
            {datos && datos.documentos.length ? (
                <details className="group mt-5" open={datos.documentos.length <= 30}>
                    <summary className="cursor-pointer list-none text-sm font-semibold text-charcoal-900">
                        Documentos ({datos.documentos.length.toLocaleString('es-MX')})
                        {r && r.errores ? <span className="ml-2 text-xs font-normal text-red-700">{r.errores} con error</span> : null}
                    </summary>
                    <div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-cream-400">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-cream-100 text-[11px] uppercase tracking-wider text-accent-brown">
                                <tr>
                                    <th className="px-3 py-2 text-left">Documento</th>
                                    <th className="px-3 py-2 text-right">Páginas</th>
                                    <th className="px-3 py-2 text-left">Estado</th>
                                    <th className="w-8" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-400/60">
                                {datos.documentos.map((d) => (
                                    <tr key={d.id} className="hover:bg-cream-50">
                                        <td className="max-w-0 px-3 py-1.5">
                                            <button onClick={() => void abrir(d)} className="block w-full truncate text-left text-charcoal-900 hover:underline" title={d.nombre}>
                                                {d.nombre}
                                            </button>
                                            {d.error ? <span className="block truncate text-xs text-red-700" title={d.error}>{d.error}</span> : null}
                                        </td>
                                        <td className="px-3 py-1.5 text-right tabular-nums text-charcoal-700/70">
                                            {d.paginas ?? '—'}
                                            {d.paginas_ocr ? <span className="text-[10px] text-charcoal-700/50"> ({d.paginas_ocr} esc.)</span> : null}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_ESTADO[d.estado] ?? 'bg-cream-200 text-charcoal-700'}`}>
                                                {ROTULO_ESTADO[d.estado]}
                                            </span>
                                        </td>
                                        <td className="px-1 py-1.5">
                                            <button onClick={() => void quitar(d)} title="Quitar de la Bóveda"
                                                className="rounded p-1 text-charcoal-700/40 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={() => void vaciar()}
                        className="mt-3 text-xs font-semibold text-red-700/80 hover:text-red-700 hover:underline">
                        Vaciar la Bóveda de esta carpeta
                    </button>
                </details>
            ) : null}
        </section>
    )
}

function Barra({ texto, valor }: { texto: string; valor: number }) {
    return (
        <div className="mt-4">
            <div className="mb-1 text-xs text-charcoal-700/70">{texto}</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream-300">
                <div className="h-full rounded-full bg-accent-gold transition-all" style={{ width: `${Math.round(Math.min(1, valor) * 100)}%` }} />
            </div>
        </div>
    )
}
