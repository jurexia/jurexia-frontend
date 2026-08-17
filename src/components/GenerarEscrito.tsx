'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, FileSignature, Loader2, PencilLine, X } from 'lucide-react'

import { useAuth } from '@/lib/useAuth'
import {
    CATEGORIAS_ESCRITO,
    borradorAHtml,
    borradorAMarkdown,
    escritosDe,
    generarEscrito,
    type EscritoGenerado,
    type TipoEscrito,
} from '@/lib/escritos-carpeta'
import {
    categoriasDe,
    subirDocumento,
    SinEspacio,
    type CategoriaDocumento,
    type DocumentoExpediente,
    type Expediente,
} from '@/lib/expedientes'
import { construirDocx } from '@/components/GuardarEnCarpeta'

/**
 * Redactar un escrito del procedimiento sin salir de la carpeta.
 *
 * TRES PANTALLAS, EN EL ORDEN EN QUE PIENSA EL ABOGADO
 * ----------------------------------------------------
 * 1. Qué necesita presentar (el catálogo, agrupado como se agrupa en la
 *    práctica: trámite, incidentes, medidas, vistas, impugnaciones).
 * 2. Contra qué o para qué —sólo si ese escrito lo necesita—.
 * 3. El borrador, con los huecos señalados arriba y no escondidos al final.
 *
 * LOS HUECOS VAN PRIMERO Y EN ROJO
 * --------------------------------
 * Un escrito generado que se ve completo es peligroso: se firma sin leer. Los
 * datos que no constaban en la carpeta se listan ANTES del texto, porque son
 * lo único que el abogado tiene que hacer antes de presentarlo.
 */
export default function GenerarEscrito({
    expediente,
    documentos,
    onCerrar,
    onGuardado,
}: {
    expediente: Expediente
    documentos: DocumentoExpediente[]
    onCerrar: () => void
    onGuardado?: (doc: DocumentoExpediente) => void
}) {
    const { session, profile } = useAuth()
    const [tipo, setTipo] = useState<TipoEscrito | null>(null)
    const [instruccion, setInstruccion] = useState('')
    const [generando, setGenerando] = useState(false)
    const [escrito, setEscrito] = useState<EscritoGenerado | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [guardado, setGuardado] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // El markdown sigue siendo la fuente de verdad —es lo que viaja al .docx—,
    // pero ahora puede haberlo tocado el abogado.
    const [textoEditado, setTextoEditado] = useState('')
    const refBorrador = useRef<HTMLDivElement | null>(null)

    // El HTML se inyecta UNA vez por borrador. Volver a pintarlo desde el
    // estado en cada tecla devolvería el cursor al principio en cada letra.
    useEffect(() => {
        if (!escrito) { setTextoEditado(''); return }
        setTextoEditado(escrito.markdown)
        if (refBorrador.current) refBorrador.current.innerHTML = borradorAHtml(escrito.markdown)
    }, [escrito])

    // Cada tipo de carpeta tiene sus propias gavetas. Un escrito va donde
    // mejor encaje de las que existan, no a una fija que puede no estar.
    const disponibles = categoriasDe(expediente.tipo).map((c) => c.value)
    const gaveta: CategoriaDocumento =
        (['borradores', 'impugnacion', 'demandas', 'notas', 'base'] as CategoriaDocumento[])
            .find((g) => disponibles.includes(g)) ?? disponibles[0]

    const conTexto = documentos.filter((d) => d.extracto && d.extracto.trim()).length
    const restantes = Math.max(
        0,
        (profile?.queries_limit ?? 5) - (profile?.queries_used ?? 0)
    )

    async function redactar() {
        if (!tipo) return
        if (restantes === 0) {
            setError('Se te acabaron las consultas de este periodo. Redactar un escrito cuesta una.')
            return
        }
        setGenerando(true)
        setError(null)
        try {
            setEscrito(
                await generarEscrito(
                    expediente,
                    documentos,
                    tipo,
                    instruccion,
                    profile?.estado,
                    session?.access_token,
                    session?.user?.id
                )
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo redactar el escrito.')
        } finally {
            setGenerando(false)
        }
    }

    /** El .docx tal cual, para abrirlo en Word. Sale con sus negritas y
     *  justificado, así que no hay que reformatear nada al llegar. */
    async function descargarWord() {
        if (!escrito) return
        const blob = await construirDocx({
            titulo: escrito.titulo,
            markdown: textoEditado || escrito.markdown,
        })
        const limpio = escrito.titulo.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.-]/g, '').slice(0, 70).trim()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${limpio || 'Escrito'}.docx`
        a.click()
        URL.revokeObjectURL(url)
    }

    async function guardarEnCarpeta() {
        if (!escrito) return
        setGuardando(true)
        setError(null)
        try {
            const blob = await construirDocx({ titulo: escrito.titulo, markdown: textoEditado || escrito.markdown })
            const limpio = escrito.titulo
                .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.-]/g, '')
                .slice(0, 70)
                .trim()
            const archivo = new File([blob], `${limpio || 'Escrito'}.docx`, {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            })
            // El texto ya lo tenemos: viaja como extracto y no vuelve a pasar
            // por el lector, así que guardar aquí no cuesta otra consulta.
            const doc = await subirDocumento(
                expediente.id,
                gaveta,
                archivo,
                profile?.subscription_type,
                textoEditado || escrito.markdown
            )
            setGuardado(true)
            onGuardado?.(doc)
        } catch (e) {
            setError(
                e instanceof SinEspacio
                    ? 'Tu almacenamiento está lleno. Libera espacio o mejora tu plan.'
                    : e instanceof Error
                      ? e.message
                      : 'No se pudo guardar.'
            )
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal-900/40 p-4 backdrop-blur-sm">
            <div className="my-8 w-full max-w-2xl rounded-xl border border-charcoal-900/10 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-charcoal-900/10 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <FileSignature className="h-5 w-5 text-accent-brown" />
                        <h2 className="font-serif text-lg font-semibold text-charcoal-900">
                            {escrito ? escrito.titulo : 'Redactar un escrito'}
                        </h2>
                    </div>
                    <button
                        onClick={onCerrar}
                        className="rounded-lg p-1.5 text-charcoal-700/50 transition hover:bg-charcoal-900/5"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-5">
                    {error ? (
                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="flex-1">{error}</span>
                        </div>
                    ) : null}

                    {/* ── 3 · El borrador ──────────────────────────────── */}
                    {escrito ? (
                        <>
                            {escrito.huecos.length > 0 ? (
                                <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                                    <p className="text-sm font-semibold text-amber-900">
                                        Complete {escrito.huecos.length}{' '}
                                        {escrito.huecos.length === 1 ? 'dato' : 'datos'} antes de presentarlo
                                    </p>
                                    <p className="mt-1 text-xs text-amber-800/80">
                                        No constaban en la carpeta, así que se dejaron marcados en el
                                        texto en lugar de suponerlos.
                                    </p>
                                    <ul className="mt-2.5 space-y-1 text-sm text-amber-900">
                                        {escrito.huecos.map((h) => (
                                            <li key={h} className="flex gap-2">
                                                <span className="text-amber-600">·</span>
                                                <span>{h}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-charcoal-700/45">
                                <PencilLine className="h-3.5 w-3.5" />
                                Puede editarlo aquí mismo antes de guardarlo
                            </div>
                            <div
                                ref={refBorrador}
                                contentEditable
                                suppressContentEditableWarning
                                spellCheck={false}
                                onInput={() => {
                                    if (refBorrador.current) {
                                        setTextoEditado(borradorAMarkdown(refBorrador.current))
                                    }
                                }}
                                className="max-h-[45vh] overflow-y-auto rounded-lg border border-charcoal-900/10 bg-white px-6 py-5 font-serif text-[14px] leading-[1.75] text-charcoal-900 outline-none focus:border-accent-gold/60 focus:ring-2 focus:ring-accent-gold/15"
                            />

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={guardarEnCarpeta}
                                    disabled={guardando || guardado}
                                    className="inline-flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-charcoal-800 disabled:opacity-50"
                                >
                                    {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {guardado ? 'Guardado en la carpeta' : 'Guardar en la carpeta'}
                                </button>
                                <button
                                    onClick={descargarWord}
                                    className="inline-flex items-center gap-2 rounded-lg border border-charcoal-900/15 px-4 py-2.5 text-sm font-medium text-charcoal-800 transition hover:bg-cream-200"
                                >
                                    <Download className="h-4 w-4" />
                                    Descargar en Word
                                </button>
                                <button
                                    onClick={() => {
                                        setEscrito(null)
                                        setGuardado(false)
                                    }}
                                    className="text-sm text-charcoal-700/70 underline-offset-4 hover:underline"
                                >
                                    Redactar otro
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* ── 1 · Qué necesita presentar ───────────── */}
                            <p className="mb-4 text-sm text-charcoal-700/70">
                                Iurexia redacta con los{' '}
                                <b>
                                    {conTexto} {conTexto === 1 ? 'documento' : 'documentos'}
                                </b>{' '}
                                que ya tiene esta carpeta. Cuesta una consulta; te quedan {restantes}.
                            </p>

                            <div className="space-y-4">
                                {CATEGORIAS_ESCRITO.map((cat) => (
                                    <div key={cat.value}>
                                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal-700/50">
                                            {cat.label}
                                        </p>
                                        <div className="grid gap-1.5 sm:grid-cols-2">
                                            {escritosDe(cat.value).map((t) => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => {
                                                        setTipo(t)
                                                        setInstruccion('')
                                                    }}
                                                    className={`rounded-lg border px-3 py-2 text-left transition ${
                                                        tipo?.value === t.value
                                                            ? 'border-accent-brown bg-accent-brown/5'
                                                            : 'border-charcoal-900/10 hover:border-charcoal-900/25'
                                                    }`}
                                                >
                                                    <span className="block text-sm font-medium text-charcoal-900">
                                                        {t.label}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs leading-snug text-charcoal-700/60">
                                                        {t.cuando}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── 2 · Contra qué o para qué ────────────── */}
                            {tipo ? (
                                <div className="mt-5 border-t border-charcoal-900/10 pt-5">
                                    <label className="block text-sm font-medium text-charcoal-900">
                                        {tipo.pide ?? 'Algo que deba tomar en cuenta (opcional)'}
                                    </label>
                                    <textarea
                                        value={instruccion}
                                        onChange={(e) => setInstruccion(e.target.value)}
                                        rows={3}
                                        placeholder="Lo que no esté en los documentos de la carpeta."
                                        className="mt-2 w-full rounded-lg border border-charcoal-900/15 px-3 py-2 text-sm outline-none focus:border-accent-brown"
                                    />
                                    <button
                                        onClick={redactar}
                                        disabled={generando || conTexto === 0}
                                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-charcoal-800 disabled:opacity-50"
                                    >
                                        {generando ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Redactando con el expediente…
                                            </>
                                        ) : (
                                            <>Redactar {tipo.label.toLowerCase()}</>
                                        )}
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
