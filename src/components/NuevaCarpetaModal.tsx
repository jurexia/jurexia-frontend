'use client'

import { useEffect, useState } from 'react'
import { X, Target, Loader2 } from 'lucide-react'

import {
    crearExpediente,
    MATERIAS_LITIGIO,
    TIPOS_CARPETA,
    tipoCarpeta,
    type Expediente,
    type MateriaLitigio,
    type TipoCarpeta,
} from '@/lib/expedientes'

/**
 * Crear una carpeta.
 *
 * Dos pasos, y el orden importa. Primero el tipo, porque de él dependen las
 * gavetas y el criterio con el que la IA va a juzgar si está completa: no se
 * revisa igual un juicio de amparo que una tesis de maestría.
 *
 * Después el objetivo, que es la pieza que convierte esto en una carpeta
 * inteligente y no en un cajón. Sin objetivo la IA sólo puede describir lo que
 * hay; con objetivo puede medir la distancia y decir qué falta. Por eso el campo
 * lleva ejemplo propio de cada tipo, y por eso se insiste tanto en él.
 */
export default function NuevaCarpetaModal({
    abierto,
    onCerrar,
    onCreada,
    /** Para prellenar desde otro sitio (por ejemplo, el recorrido guiado). */
    inicial,
}: {
    abierto: boolean
    onCerrar: () => void
    onCreada: (exp: Expediente) => void
    inicial?: { titulo?: string; objetivo?: string; tipo?: TipoCarpeta }
}) {
    const [paso, setPaso] = useState<1 | 2>(1)
    const [tipo, setTipo] = useState<TipoCarpeta>('cliente')
    const [titulo, setTitulo] = useState('')
    const [objetivo, setObjetivo] = useState('')
    const [materia, setMateria] = useState<MateriaLitigio | ''>('')
    const [pretension, setPretension] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!abierto) return
        setPaso(inicial?.titulo ? 2 : 1)
        setTipo(inicial?.tipo ?? 'cliente')
        setTitulo(inicial?.titulo ?? '')
        setObjetivo(inicial?.objetivo ?? '')
        setMateria('')
        setPretension('')
        setError(null)
    }, [abierto, inicial])

    // Escape cierra, como en cualquier diálogo del sistema.
    useEffect(() => {
        if (!abierto) return
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCerrar()
        }
        window.addEventListener('keydown', alTeclear)
        return () => window.removeEventListener('keydown', alTeclear)
    }, [abierto, onCerrar])

    if (!abierto) return null

    const def = tipoCarpeta(tipo)

    async function crear() {
        if (!titulo.trim()) {
            setError('Ponle un nombre a la carpeta.')
            return
        }
        setGuardando(true)
        setError(null)
        try {
            const exp = await crearExpediente({
                tipo,
                titulo,
                objetivo,
                materia: materia || undefined,
                pretension,
            })
            onCreada(exp)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo crear la carpeta.')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(26,26,26,0.35)' }}
            onClick={onCerrar}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-cream-100 shadow-xl">
                <div className="sticky top-0 flex items-center justify-between border-b border-cream-400 bg-cream-100 px-6 py-4">
                    <div>
                        <h2 className="font-serif text-xl font-semibold text-charcoal-900">
                            {paso === 1 ? 'Nueva carpeta' : def.etiquetaTitulo}
                        </h2>
                        <p className="text-xs text-charcoal-700/60">Paso {paso} de 2</p>
                    </div>
                    <button
                        onClick={onCerrar}
                        className="rounded-lg p-1.5 text-charcoal-700/60 transition hover:bg-cream-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-5 px-6 py-5">
                    {paso === 1 ? (
                        <>
                            <p className="text-sm leading-relaxed text-charcoal-700/80">
                                ¿Qué vas a guardar aquí? De esto dependen las gavetas que verás
                                dentro y con qué criterio Iurexia va a revisar la carpeta.
                            </p>
                            <div className="grid gap-2.5">
                                {TIPOS_CARPETA.map((t) => (
                                    <button
                                        key={t.value}
                                        onClick={() => setTipo(t.value)}
                                        className={`rounded-xl border p-4 text-left transition ${
                                            tipo === t.value
                                                ? 'border-accent-gold bg-cream-200'
                                                : 'border-cream-400 bg-cream-50 hover:bg-cream-200'
                                        }`}>
                                        <p className="font-semibold text-charcoal-900">{t.label}</p>
                                        <p className="mt-0.5 text-sm text-charcoal-700/70">
                                            {t.descripcion}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <Campo
                                etiqueta={def.etiquetaTitulo}
                                valor={titulo}
                                onCambio={setTitulo}
                                placeholder={
                                    tipo === 'cliente'
                                        ? 'Lic. Nombre del cliente'
                                        : 'Cómo lo vas a reconocer'
                                }
                                autoFocus
                            />

                            {/* El objetivo: lo que hace inteligente a la carpeta. */}
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-charcoal-900">
                                    <Target className="h-4 w-4 text-accent-brown" />
                                    ¿Qué quieres lograr?
                                </label>
                                <textarea
                                    value={objetivo}
                                    onChange={(e) => setObjetivo(e.target.value)}
                                    rows={3}
                                    placeholder={def.ejemploObjetivo}
                                    className="w-full resize-none rounded-lg border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm text-charcoal-900 outline-none transition placeholder:text-charcoal-700/35 focus:border-accent-gold"
                                />
                                <p className="mt-1.5 text-xs leading-relaxed text-charcoal-700/60">
                                    Contra esto se mide todo. Iurexia lo usa para decirte qué te
                                    falta y qué riesgos corres; sin objetivo sólo puede describirte
                                    lo que ya tienes.
                                </p>
                            </div>

                            {def.pideMateria ? (
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-charcoal-900">
                                        Materia
                                    </label>
                                    <select
                                        value={materia}
                                        onChange={(e) =>
                                            setMateria(e.target.value as MateriaLitigio | '')
                                        }
                                        className="w-full rounded-lg border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm text-charcoal-900 outline-none focus:border-accent-gold">
                                        <option value="">Sin especificar</option>
                                        {MATERIAS_LITIGIO.map((m) => (
                                            <option key={m.value} value={m.value}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}

                            {def.pideCliente ? (
                                <Campo
                                    etiqueta="Pretensión (opcional)"
                                    valor={pretension}
                                    onCambio={setPretension}
                                    placeholder="Qué reclama tu cliente"
                                />
                            ) : null}
                        </>
                    )}

                    {error ? (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </p>
                    ) : null}
                </div>

                <div className="sticky bottom-0 flex justify-between gap-3 border-t border-cream-400 bg-cream-100 px-6 py-4">
                    <button
                        onClick={() => (paso === 1 ? onCerrar() : setPaso(1))}
                        className="rounded-lg border border-cream-400 px-4 py-2.5 text-sm font-semibold text-charcoal-700 transition hover:bg-cream-200">
                        {paso === 1 ? 'Cancelar' : 'Atrás'}
                    </button>
                    <button
                        onClick={() => (paso === 1 ? setPaso(2) : void crear())}
                        disabled={guardando}
                        className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800 disabled:opacity-60">
                        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {paso === 1 ? 'Siguiente' : 'Crear carpeta'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function Campo({
    etiqueta,
    valor,
    onCambio,
    placeholder,
    autoFocus,
}: {
    etiqueta: string
    valor: string
    onCambio: (v: string) => void
    placeholder?: string
    autoFocus?: boolean
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-900">
                {etiqueta}
            </label>
            <input
                value={valor}
                onChange={(e) => onCambio(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="w-full rounded-lg border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm text-charcoal-900 outline-none transition placeholder:text-charcoal-700/35 focus:border-accent-gold"
            />
        </div>
    )
}
