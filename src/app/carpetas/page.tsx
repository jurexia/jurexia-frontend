'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, FolderOpen, HardDrive, LayoutTemplate, Plus, Search } from 'lucide-react'

import Navbar from '@/components/Navbar'
import SeguimientoPanel from '@/components/SeguimientoPanel'
import ProtectedRoute from '@/components/ProtectedRoute'
import NuevaCarpetaModal from '@/components/NuevaCarpetaModal'
import TarjetaCarpeta, { TarjetaNueva } from '@/components/carpetas/TarjetaCarpeta'
import { BOTON_CLARO, BOTON_CLARO_SUAVE, Cifra, FondoMesa, Portada } from '@/components/carpetas/Mesa'
import { useAuth } from '@/lib/useAuth'
import {
    ExpedientesNoConfigurado,
    TIPOS_CARPETA,
    getExpedientes,
    nombreCarpeta,
    usoAlmacenamiento,
    type Expediente,
    type TipoCarpeta,
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
 * EL REDISEÑO (12-oct-2026). David: que el abogado «se sienta en un ambiente
 * profesional», como en la Agenda y en las tarjetas de Connect. La portada es
 * la de Connect (grabado del archivo, rótulo dorado, Playfair); cada carpeta es
 * una tarjeta con su propio grabado, y el dibujo de la carpeta se queda dentro
 * de ella: es lo que hace que alguien entienda de un vistazo qué puede hacer
 * aquí sin leer instrucciones.
 */
export default function CarpetasPage() {
    return (
        <ProtectedRoute>
            <Escritorio />
        </ProtectedRoute>
    )
}

type Orden = 'recientes' | 'avance' | 'nombre'

function Escritorio() {
    const router = useRouter()
    const { profile } = useAuth()

    const [carpetas, setCarpetas] = useState<Expediente[]>([])
    const [cargando, setCargando] = useState(true)
    const [pestana, setPestana] = useState<'carpetas' | 'seguimiento'>('carpetas')
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [filtro, setFiltro] = useState<TipoCarpeta | 'todas'>('todas')
    const [orden, setOrden] = useState<Orden>('recientes')
    const [nuevaAbierta, setNuevaAbierta] = useState(false)
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
                    : 'No se pudo abrir su escritorio. Recargue la página.'
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

    // Sin tutorial de bienvenida (David, 25-sep-2026): minimalismo.

    const documentos = useMemo(() => carpetas.reduce((n, c) => n + (c.totalDocumentos ?? 0), 0), [carpetas])
    const porTipo = useMemo(() => {
        const cuenta = new Map<TipoCarpeta, number>()
        for (const c of carpetas) cuenta.set(c.tipo, (cuenta.get(c.tipo) ?? 0) + 1)
        return cuenta
    }, [carpetas])

    const filtradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase()
        const lista = carpetas.filter((c) => {
            if (filtro !== 'todas' && c.tipo !== filtro) return false
            if (!q) return true
            const campos = [nombreCarpeta(c), c.objetivo ?? '', c.materia ?? '']
            return campos.some((v) => v.toLowerCase().includes(q))
        })
        if (orden === 'avance') return [...lista].sort((a, b) => (b.avance ?? -1) - (a.avance ?? -1))
        if (orden === 'nombre') return [...lista].sort((a, b) => nombreCarpeta(a).localeCompare(nombreCarpeta(b), 'es'))
        return [...lista].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    }, [carpetas, busqueda, filtro, orden])

    return (
        <FondoMesa>
            <Navbar plataforma />

            <main className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6">
                {/* ── La portada ───────────────────────────────────────────── */}
                <Portada
                    arte="/web/arte/archivo.webp"
                    rotulo="Iurexia · Mi trabajo"
                    titulo={<>Mis carpetas <em>inteligentes</em></>}>
                    <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#d2cabe] sm:text-[15px]">
                        Cada asunto con su objetivo, sus documentos leídos por Iurexia y lo que le falta
                        para llegar. Lo que pregunte o redacte desde una carpeta se queda guardado en ella.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Cifra valor={cargando ? '…' : carpetas.length} rotulo={carpetas.length === 1 ? 'carpeta' : 'carpetas'} />
                        <Cifra valor={cargando ? '…' : documentos} rotulo={documentos === 1 ? 'documento' : 'documentos'} />
                        {/* El contador vive aquí porque aquí es donde se gasta: analizar
                            una carpeta y redactar un documento consumen una consulta
                            cada uno, igual que preguntar en el chat. */}
                        <Cifra valor={restantes} rotulo={restantes === 1 ? 'consulta disponible' : 'consultas disponibles'} alerta={restantes <= 3} />
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setNuevaAbierta(true)} className={BOTON_CLARO}>
                            <Plus className="h-4 w-4" /> Nueva carpeta
                        </button>
                        <Link href="/agenda" className={BOTON_CLARO_SUAVE}>
                            <CalendarDays className="h-4 w-4" /> Mi agenda de términos
                        </Link>
                        {/* Los formatos de Word del despacho (16-oct-2026). */}
                        <Link href="/plantillas" className={BOTON_CLARO_SUAVE}>
                            <LayoutTemplate className="h-4 w-4" /> Mis plantillas
                        </Link>
                    </div>
                </Portada>

                {/*
                  Dos cosas distintas, y conviene que se noten distintas: las
                  carpetas son el archivo del despacho («¿qué tengo yo de este
                  asunto?») y el seguimiento es una vigilancia («¿qué ha hecho
                  el juzgado?»). Se vinculan, no se funden.
                */}
                <div role="tablist" className="mt-7 flex flex-wrap gap-2">
                    {([['carpetas', 'Mis carpetas'],
                       ['seguimiento', 'Seguimiento ante órganos jurisdiccionales']] as const).map(([clave, rotulo]) => (
                        <button
                            key={clave}
                            role="tab"
                            aria-selected={pestana === clave}
                            aria-current={pestana === clave ? 'page' : undefined}
                            onClick={() => setPestana(clave)}
                            className={`relieve ${pestana === clave ? 'relieve-tinta' : 'relieve-papel'} px-4`}>
                            {rotulo}
                        </button>
                    ))}
                </div>

                {pestana === 'seguimiento' ? (
                    <div className="mt-6">
                        <SeguimientoPanel />
                    </div>
                ) : (
                    <>
                        {/* ── Buscar, filtrar, ordenar ─────────────────────── */}
                        {carpetas.length > 0 ? (
                            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-piedra-500" />
                                    <input
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        placeholder="Buscar por nombre, objetivo o materia…"
                                        className="w-full rounded-full border-0 bg-white/90 py-2.5 pl-11 pr-4 text-[14px] text-charcoal-900 shadow-sm outline-none ring-1 ring-charcoal-900/10 transition placeholder:text-piedra-500 focus:ring-2 focus:ring-accent-gold"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {porTipo.size > 1 ? (
                                        <>
                                            <Filtro activo={filtro === 'todas'} onClick={() => setFiltro('todas')}>
                                                Todas · {carpetas.length}
                                            </Filtro>
                                            {TIPOS_CARPETA.filter((t) => porTipo.has(t.value)).map((t) => (
                                                <Filtro key={t.value} activo={filtro === t.value} onClick={() => setFiltro(t.value)}>
                                                    {t.label} · {porTipo.get(t.value)}
                                                </Filtro>
                                            ))}
                                        </>
                                    ) : null}
                                    <label className="ml-1 flex items-center gap-2 text-[12px] text-piedra-600">
                                        Ordenar
                                        <select
                                            value={orden}
                                            onChange={(e) => setOrden(e.target.value as Orden)}
                                            className="rounded-full border-0 bg-white/90 py-1.5 pl-3 pr-8 text-[12.5px] font-medium text-charcoal-900 ring-1 ring-charcoal-900/10 focus:ring-2 focus:ring-accent-gold">
                                            <option value="recientes">Recientes</option>
                                            <option value="avance">Más avanzadas</option>
                                            <option value="nombre">Por nombre</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        ) : null}

                        {/* ── Las carpetas ─────────────────────────────────── */}
                        <div className="mt-6">
                            {error ? (
                                <Aviso titulo="No se pudo abrir su escritorio" mensaje={error} />
                            ) : cargando ? (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-[300px] animate-pulse rounded-xl bg-white/60 ring-1 ring-charcoal-900/5" />
                                    ))}
                                </div>
                            ) : carpetas.length === 0 ? (
                                <Vacio onCrear={() => setNuevaAbierta(true)} />
                            ) : filtradas.length === 0 ? (
                                <Aviso
                                    titulo="Ninguna carpeta coincide"
                                    mensaje={busqueda
                                        ? `No hay carpetas que digan «${busqueda}». Pruebe con otra palabra.`
                                        : 'No hay carpetas de este tipo.'}
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                    {filtradas.map((c) => (
                                        <TarjetaCarpeta key={c.id} carpeta={c} />
                                    ))}
                                    {!busqueda && filtro === 'todas' ? <TarjetaNueva onCrear={() => setNuevaAbierta(true)} /> : null}
                                </div>
                            )}
                        </div>

                        {/* ── Almacenamiento ───────────────────────────────── */}
                        {uso && carpetas.length > 0 ? (
                            <div className="mt-10 flex flex-col gap-3 rounded-2xl bg-white/80 px-5 py-4 ring-1 ring-charcoal-900/10 sm:flex-row sm:items-center">
                                <span className="flex items-center gap-2 text-[13px] font-semibold text-charcoal-900">
                                    <HardDrive className="h-4 w-4 text-accent-brown" />
                                    Espacio de su plan
                                </span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7e0d2]">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            uso.proporcion > 0.9 ? 'bg-red-500' : 'bg-gradient-to-r from-accent-brown to-accent-gold'
                                        }`}
                                        style={{ width: `${Math.max(1, Math.round(uso.proporcion * 100))}%` }}
                                    />
                                </div>
                                <span className="text-[12px] text-piedra-600">
                                    {uso.usadoMB.toFixed(1)} de {uso.cuotaMB} MB
                                </span>
                            </div>
                        ) : null}
                    </>
                )}
            </main>

            <NuevaCarpetaModal
                abierto={nuevaAbierta}
                onCerrar={() => setNuevaAbierta(false)}
                onCreada={(exp) => {
                    setNuevaAbierta(false)
                    router.push(`/carpetas/${exp.id}`)
                }}
            />
        </FondoMesa>
    )
}

function Filtro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={activo}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                activo
                    ? 'bg-charcoal-900 text-white'
                    : 'bg-white/80 text-piedra-700 ring-1 ring-charcoal-900/10 hover:bg-white'
            }`}>
            {children}
        </button>
    )
}

function Vacio({ onCrear }: { onCrear: () => void }) {
    return (
        <div className="overflow-hidden rounded-2xl bg-white/85 ring-1 ring-charcoal-900/10 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/web/arte/escritorio.webp" alt="" className="h-44 w-full object-cover sm:h-full" />
            <div className="p-6 sm:p-9">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-brown">Su escritorio</p>
                <h2 className="mt-1 font-serif text-[28px] font-normal leading-tight text-charcoal-900">Aquí vive su trabajo</h2>
                <p className="mt-3 max-w-md text-[14px] leading-relaxed text-piedra-700">
                    Una carpeta de Iurexia no guarda documentos: los lee. Usted le dice qué quiere lograr,
                    le sube lo que tiene, y ella le dice qué le falta, qué riesgos ve y le redacta los
                    escritos que hacen falta.
                </p>
                <button
                    type="button"
                    onClick={onCrear}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-charcoal-900 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg transition hover:bg-charcoal-800">
                    <Plus className="h-4 w-4" />
                    Crear mi primera carpeta
                </button>
            </div>
        </div>
    )
}

function Aviso({ titulo, mensaje }: { titulo: string; mensaje: string }) {
    return (
        <div className="rounded-2xl bg-white/80 px-6 py-12 text-center ring-1 ring-charcoal-900/10">
            <FolderOpen className="mx-auto mb-3 h-8 w-8 text-piedra-400" />
            <h2 className="font-serif text-[22px] font-normal text-charcoal-900">{titulo}</h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-piedra-600">{mensaje}</p>
        </div>
    )
}
