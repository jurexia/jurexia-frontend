'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Zap, HelpCircle, HardDrive, FolderOpen } from 'lucide-react'

import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { CarpetaIcono } from '@/components/CarpetaIcono'
import NuevaCarpetaModal from '@/components/NuevaCarpetaModal'
import TutorialCarpetas from '@/components/TutorialCarpetas'
import { useAuth } from '@/lib/useAuth'
import {
    ExpedientesNoConfigurado,
    getExpedientes,
    nombreCarpeta,
    tipoCarpeta,
    usoAlmacenamiento,
    type Expediente,
    type UsoAlmacenamiento,
} from '@/lib/expedientes'

/**
 * Mis carpetas inteligentes — el escritorio.
 *
 * Es la misma pantalla que «Mi trabajo» en la app, y a propósito: el abogado que
 * empieza en el celular y luego abre la laptop tiene que encontrarse lo mismo,
 * con las mismas carpetas y el mismo avance. Comparten tabla, así que lo que
 * crea en un lado aparece en el otro.
 *
 * La cuadrícula de carpetas dibujadas no es nostalgia: es lo único que hace que
 * alguien entienda de un vistazo qué puede hacer aquí sin leer instrucciones.
 */
export default function CarpetasPage() {
    return (
        <ProtectedRoute>
            <Escritorio />
        </ProtectedRoute>
    )
}

function Escritorio() {
    const router = useRouter()
    const { profile } = useAuth()

    const [carpetas, setCarpetas] = useState<Expediente[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [nuevaAbierta, setNuevaAbierta] = useState(false)
    const [tutorialAbierto, setTutorialAbierto] = useState(false)
    const [uso, setUso] = useState<UsoAlmacenamiento | null>(null)

    const limite = profile?.queries_limit ?? 5
    const restantes = Math.max(0, limite - (profile?.queries_used ?? 0))

    const cargar = useCallback(async () => {
        setCargando(true)
        setError(null)
        try {
            setCarpetas(await getExpedientes())
        } catch (err) {
            setError(
                err instanceof ExpedientesNoConfigurado
                    ? err.message
                    : 'No se pudo abrir tu escritorio. Recarga la página.'
            )
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        void cargar()
    }, [cargar])

    useEffect(() => {
        void usoAlmacenamiento(profile?.subscription_type).then(setUso)
    }, [profile?.subscription_type, carpetas.length])

    // La primera visita se explica; las siguientes no molestan.
    useEffect(() => {
        if (cargando || carpetas.length > 0) return
        if (typeof window === 'undefined') return
        if (window.localStorage.getItem('iurexia.tutorial.carpetas.v1') === '1') return
        const id = setTimeout(() => setTutorialAbierto(true), 500)
        return () => clearTimeout(id)
    }, [cargando, carpetas.length])

    const filtradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        if (!q) return carpetas
        return carpetas.filter((c) => {
            const campos = [nombreCarpeta(c), c.objetivo ?? '', c.materia ?? '']
            return campos.some((v) => v.toLowerCase().includes(q))
        })
    }, [carpetas, busqueda])

    return (
        <div className="min-h-screen bg-cream-300">
            <Navbar />

            <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
                {/* ── Barra superior ───────────────────────────────────────── */}
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="font-serif text-3xl font-semibold text-charcoal-900">
                            Mis carpetas inteligentes
                        </h1>
                        <p className="mt-1 text-sm text-charcoal-700/70">
                            {cargando
                                ? 'Abriendo tu escritorio…'
                                : carpetas.length === 0
                                  ? 'Tu escritorio está vacío'
                                  : `${carpetas.length} ${carpetas.length === 1 ? 'carpeta' : 'carpetas'}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/*
                          El contador vive aquí porque aquí es donde se gasta:
                          analizar una carpeta y redactar un documento consumen
                          una consulta cada uno, igual que preguntar en el chat.
                        */}
                        <div
                            title={`Te quedan ${restantes} consultas de tu plan`}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
                                restantes <= 3
                                    ? 'border-red-200 bg-red-50 text-red-700'
                                    : 'border-cream-400 bg-cream-100 text-charcoal-700'
                            }`}>
                            <Zap className="h-4 w-4 text-accent-brown" />
                            {restantes}
                        </div>

                        <button
                            onClick={() => setTutorialAbierto(true)}
                            title="Cómo funcionan las carpetas inteligentes"
                            className="rounded-lg border border-cream-400 bg-cream-100 p-2 text-charcoal-700 transition hover:bg-cream-200">
                            <HelpCircle className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => setNuevaAbierta(true)}
                            className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800">
                            <Plus className="h-4 w-4" />
                            Nueva carpeta
                        </button>
                    </div>
                </div>

                {/* ── Buscador ─────────────────────────────────────────────── */}
                {carpetas.length > 0 ? (
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-700/40" />
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, objetivo o materia…"
                            className="w-full rounded-lg border border-cream-400 bg-cream-100 py-2.5 pl-10 pr-4 text-sm text-charcoal-900 outline-none transition placeholder:text-charcoal-700/40 focus:border-accent-gold"
                        />
                    </div>
                ) : null}

                {/* ── Contenido ────────────────────────────────────────────── */}
                {error ? (
                    <Aviso titulo="No se pudo abrir tu escritorio" mensaje={error} />
                ) : cargando ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-40 animate-pulse rounded-xl border border-cream-400 bg-cream-100"
                            />
                        ))}
                    </div>
                ) : carpetas.length === 0 ? (
                    <Vacio onCrear={() => setNuevaAbierta(true)} />
                ) : filtradas.length === 0 ? (
                    <Aviso
                        titulo="Ninguna carpeta coincide"
                        mensaje={`No hay carpetas que digan «${busqueda}». Prueba con otra palabra.`}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {filtradas.map((c) => (
                            <Carpeta
                                key={c.id}
                                carpeta={c}
                                onAbrir={() => router.push(`/carpetas/${c.id}`)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Almacenamiento ───────────────────────────────────────── */}
                {uso && carpetas.length > 0 ? (
                    <div className="mt-10 rounded-xl border border-cream-400 bg-cream-100 p-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-semibold text-charcoal-900">
                                <HardDrive className="h-4 w-4 text-accent-brown" />
                                Espacio de tu plan
                            </span>
                            <span className="text-charcoal-700/70">
                                {uso.usadoMB.toFixed(1)} de {uso.cuotaMB} MB
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-cream-400">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    uso.proporcion > 0.9 ? 'bg-red-500' : 'bg-accent-gold'
                                }`}
                                style={{ width: `${Math.round(uso.proporcion * 100)}%` }}
                            />
                        </div>
                    </div>
                ) : null}
            </main>

            <NuevaCarpetaModal
                abierto={nuevaAbierta}
                onCerrar={() => setNuevaAbierta(false)}
                onCreada={(exp) => {
                    setNuevaAbierta(false)
                    router.push(`/carpetas/${exp.id}`)
                }}
            />

            <TutorialCarpetas
                abierto={tutorialAbierto}
                onCerrar={() => setTutorialAbierto(false)}
                onCrear={() => {
                    setTutorialAbierto(false)
                    setNuevaAbierta(true)
                }}
            />
        </div>
    )
}

/** Una carpeta del escritorio: el dibujo, su nombre y qué tanto avanzó. */
function Carpeta({ carpeta, onAbrir }: { carpeta: Expediente; onAbrir: () => void }) {
    const tipo = tipoCarpeta(carpeta.tipo)
    const docs = carpeta.totalDocumentos ?? 0

    return (
        <button
            onClick={onAbrir}
            className="group flex flex-col items-center rounded-xl border border-transparent p-4 text-center transition hover:border-cream-400 hover:bg-cream-100">
            <div className="transition-transform group-hover:-translate-y-0.5">
                <CarpetaIcono
                    tipo={carpeta.tipo}
                    tamano={88}
                    documentos={docs}
                    avance={carpeta.avance}
                />
            </div>

            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-charcoal-900">
                {nombreCarpeta(carpeta)}
            </p>
            <p className="mt-0.5 text-xs text-charcoal-700/60">
                {docs === 0 ? 'Vacía' : `${docs} ${docs === 1 ? 'documento' : 'documentos'}`}
                {carpeta.avance !== null ? ` · ${carpeta.avance}%` : ''}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-charcoal-700/40">
                {tipo.label}
            </p>
        </button>
    )
}

function Vacio({ onCrear }: { onCrear: () => void }) {
    return (
        <div className="rounded-xl border border-dashed border-cream-500 bg-cream-100 px-6 py-16 text-center">
            <div className="mx-auto mb-4 w-fit opacity-70">
                <CarpetaIcono tipo="cliente" tamano={96} documentos={0} avance={null} />
            </div>
            <h2 className="font-serif text-xl font-semibold text-charcoal-900">
                Aquí vive tu trabajo
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-charcoal-700/70">
                Una carpeta de Iurexia no guarda documentos: los lee. Le dices qué quieres lograr,
                le subes lo que tienes, y te dice qué te falta, qué riesgos ve y te redacta los
                escritos que hacen falta.
            </p>
            <button
                onClick={onCrear}
                className="mx-auto mt-6 flex items-center gap-2 rounded-lg bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800">
                <Plus className="h-4 w-4" />
                Crear mi primera carpeta
            </button>
        </div>
    )
}

function Aviso({ titulo, mensaje }: { titulo: string; mensaje: string }) {
    return (
        <div className="rounded-xl border border-cream-400 bg-cream-100 px-6 py-12 text-center">
            <FolderOpen className="mx-auto mb-3 h-8 w-8 text-charcoal-700/30" />
            <h2 className="font-semibold text-charcoal-900">{titulo}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-charcoal-700/70">{mensaje}</p>
        </div>
    )
}
