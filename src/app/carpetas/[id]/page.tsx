'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
    AlertTriangle,
    MessagesSquare,
    SquarePen,
    Workflow,
    ArrowLeft,
    ChevronRight,
    Download,
    Loader2,
    Sparkles,
    FileSignature,
    GanttChartSquare,
    Lock,
    Target,
    Trash2,
    Upload,
} from 'lucide-react'

import GenerarEscrito from '@/components/GenerarEscrito'
import PanelCronologia from '@/components/cronologia/PanelCronologia'
import SeccionBoveda from '@/components/boveda/SeccionBoveda'
import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArchivoIcono, CarpetaIcono } from '@/components/CarpetaIcono'
import { useAuth } from '@/lib/useAuth'
import { CalendarDays, FolderOpen, Pencil, Vault } from 'lucide-react'
import { BOTON, BOTON_CLARO, BOTON_CLARO_SUAVE, BOTON_SUAVE, Cifra, FondoMesa, Portada, Seccion } from '@/components/carpetas/Mesa'
import { arteDeCarpeta, haceCuanto } from '@/lib/arte-carpeta'
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
import { consultasDeCarpeta, tituloLimpio, type ConsultaDeCarpeta } from '@/lib/consultas-carpeta'
import { flujoPorId } from '@/lib/flujos'
import { lista as listarCronologias, puedeCronologia, type TrabajoCrono } from '@/lib/cronologia'

/**
 * Dentro de una carpeta.
 *
 * Tres bloques, en el orden en que le importan al abogado: qué quiere lograr,
 * qué le dice Iurexia sobre dónde está, y sus documentos por gaveta.
 *
 * El análisis va **arriba de los documentos** a propósito. Si el abogado abre y
 * lo primero que ve es una lista de archivos, esto es un Dropbox; si lo primero
 * que ve es «te falta el acuse de recibo del 12 de marzo», es otra cosa.
 *
 * EL REDISEÑO (12-oct-2026), el de la Agenda y Connect: la portada oscura con
 * el grabado de la carpeta, la columna de trabajo en secciones <Seccion> y, al
 * lado, la ficha con el avance, el índice de la carpeta y los atajos. Una
 * sección nueva se arma con <Seccion> para que la carpeta hable igual.
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
    const { session, profile, user } = useAuth()

    const [expediente, setExpediente] = useState<Expediente | null>(null)
    const [documentos, setDocumentos] = useState<DocumentoExpediente[]>([])
    const [cargando, setCargando] = useState(true)
    const [analizando, setAnalizando] = useState(false)
    const [progreso, setProgreso] = useState<ProgresoResumen | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [subiendoEn, setSubiendoEn] = useState<CategoriaDocumento | null>(null)
    const [redactando, setRedactando] = useState(false)
    const [editandoObjetivo, setEditandoObjetivo] = useState(false)
    const [borradorObjetivo, setBorradorObjetivo] = useState('')
    /* Las consultas que viven en esta carpeta (25-sep-2026). `null`: la base
       todavía no guarda el vínculo, y la sección no se enseña. */
    const [consultas, setConsultas] = useState<ConsultaDeCarpeta[] | null>(null)
    // La Cronología del expediente (12-oct-2026, Platinum): lee los PDF de la
    // carpeta sin volver a subirlos. `cronologiaDe` abre una ya hecha.
    const [cronologiaAbierta, setCronologiaAbierta] = useState(false)
    const [cronologiaDe, setCronologiaDe] = useState<string | null>(null)
    const [cronologias, setCronologias] = useState<TrabajoCrono[]>([])

    useEffect(() => {
        if (!id) return
        let vigente = true
        consultasDeCarpeta(id).then((c) => { if (vigente) setConsultas(c) })
        return () => { vigente = false }
    }, [id])

    const conCronologia = puedeCronologia(profile?.subscription_type, user?.email)
    useEffect(() => {
        if (!id || !conCronologia || cronologiaAbierta) return
        let vigente = true
        listarCronologias(id).then((c) => { if (vigente) setCronologias(c) }).catch(() => {})
        return () => { vigente = false }
    }, [id, conCronologia, cronologiaAbierta])

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

        // CADA ARCHIVO SE JUZGA SOLO.
        //
        // Antes un `for` dentro de un `try` cortaba la tanda entera: si el
        // abogado soltaba diez documentos y el tercero pasaba del tope de
        // hojas de su plan, los siete siguientes NO se subían y él veía un
        // solo mensaje —del tercero— sin enterarse de que le faltaban siete.
        // Un expediente se sube de golpe, no de uno en uno, así que el fallo
        // era silencioso y del peor tipo: la carpeta parecía completa.
        //
        // Ahora se intenta con todos y al final se dice qué entró y qué no,
        // con el motivo de cada rechazo.
        const rechazos: string[] = []
        for (const archivo of archivos) {
            try {
                const doc = await subirDocumento(
                    expediente.id,
                    categoria,
                    archivo,
                    profile?.subscription_type
                )
                setDocumentos((prev) => [doc, ...prev])
            } catch (err) {
                const motivo = err instanceof Error ? err.message : 'no se pudo subir'
                rechazos.push(`${archivo.name}: ${motivo}`)
            }
        }
        setSubiendoEn(null)

        if (rechazos.length === 0) return
        const entraron = archivos.length - rechazos.length
        setError(
            (entraron > 0
                ? `Se guardaron ${entraron} de ${archivos.length} documentos. `
                : '') +
            (rechazos.length === 1
                ? `No se guardó ${rechazos[0]}`
                : `No se guardaron ${rechazos.length}:\n· ${rechazos.join('\n· ')}`)
        )
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
            <FondoMesa>
                <Navbar plataforma />
                <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
                    <div className="h-64 animate-pulse rounded-2xl bg-[#2a2620]/80" />
                    <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="h-72 animate-pulse rounded-2xl bg-white/60" />
                        <div className="hidden h-72 animate-pulse rounded-2xl bg-white/60 lg:block" />
                    </div>
                </div>
            </FondoMesa>
        )
    }

    if (!expediente) {
        return (
            <FondoMesa>
                <Navbar plataforma />
                <div className="mx-auto max-w-xl px-4 pt-32 text-center">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-brown">Mis carpetas</p>
                    <h1 className="mt-2 font-serif text-[30px] font-normal text-charcoal-900">
                        Esta carpeta ya no existe
                    </h1>
                    <button onClick={() => router.push('/carpetas')} className={`${BOTON} mt-6`}>
                        <ArrowLeft className="h-4 w-4" />
                        Volver a mis carpetas
                    </button>
                </div>
            </FondoMesa>
        )
    }

    const tipo = tipoCarpeta(expediente.tipo)
    const gavetas = categoriasDe(expediente.tipo)
    const leidos = documentos.filter((d) => d.extracto).length
    const materia = expediente.materia ? etiquetaMateria(expediente.materia) : null

    return (
        <FondoMesa>
            <Navbar plataforma />

            <input
                ref={entradaArchivo}
                type="file"
                multiple
                onChange={alElegirArchivo}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />

            {redactando ? (
                <GenerarEscrito
                    expediente={expediente}
                    documentos={documentos}
                    onCerrar={() => setRedactando(false)}
                    onGuardado={(doc) => setDocumentos((prev) => [doc, ...prev])}
                />
            ) : null}

            <main className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6">
                {/* ── La portada: el grabado de la carpeta, su nombre y lo que
                    se hace desde aquí. El mismo grabado que su tarjeta en el
                    escritorio, para que se reconozca al entrar. */}
                <Portada
                    arte={arteDeCarpeta(expediente.id, expediente.tipo)}
                    arriba={
                        <button
                            onClick={() => router.push('/carpetas')}
                            className="mb-5 inline-flex items-center gap-1.5 border-b border-[#bdab86]/70 pb-0.5 text-[12px] text-[#e4d4b6] transition hover:text-white">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Mis carpetas inteligentes
                        </button>
                    }
                    rotulo={[tipo.label, materia].filter(Boolean).join(' · ')}
                    titulo={nombreCarpeta(expediente)}>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Cifra valor={documentos.length} rotulo={documentos.length === 1 ? 'documento' : 'documentos'} />
                        {documentos.length > 0 ? <Cifra valor={`${leidos} de ${documentos.length}`} rotulo="leídos por Iurexia" /> : null}
                        {expediente.avance !== null ? <Cifra valor={`${expediente.avance}%`} rotulo="de avance" /> : null}
                        <Cifra valor={`Actualizada ${haceCuanto(expediente.updated_at)}`} />
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <Link href={`/chat?carpeta=${id}`} className={BOTON_CLARO}>
                            <SquarePen className="h-4 w-4" />
                            Nueva consulta
                        </Link>
                        <button onClick={() => setRedactando(true)} disabled={leidos === 0} className={BOTON_CLARO_SUAVE}
                            title={leidos === 0 ? 'Suba un documento primero' : 'Cuesta una consulta'}>
                            <FileSignature className="h-4 w-4" />
                            Redactar un escrito
                        </button>
                        <button onClick={() => pedirArchivo(gavetas[0]?.value ?? 'base')} disabled={subiendoEn !== null} className={BOTON_CLARO_SUAVE}>
                            {subiendoEn !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Subir documentos
                        </button>
                    </div>
                </Portada>

                {error ? (
                    <div className="mt-6 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-800 ring-1 ring-red-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="flex-1 whitespace-pre-line">{error}</span>
                    </div>
                ) : null}

                <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-6">

                {/* ── El objetivo ──────────────────────────────────────────── */}
                <Seccion
                    id="objetivo"
                    rotulo="El objetivo"
                    titulo="Qué quiere lograr"
                    acciones={!editandoObjetivo ? (
                        <button
                            onClick={() => {
                                setBorradorObjetivo(expediente.objetivo ?? '')
                                setEditandoObjetivo(true)
                            }}
                            className={BOTON_SUAVE}>
                            <Pencil className="h-3.5 w-3.5" />
                            {expediente.objetivo ? 'Editar' : 'Escribir el objetivo'}
                        </button>
                    ) : null}>
                    {editandoObjetivo ? (
                        <div className="space-y-3">
                            <textarea
                                value={borradorObjetivo}
                                onChange={(e) => setBorradorObjetivo(e.target.value)}
                                rows={3}
                                autoFocus
                                placeholder={tipo.ejemploObjetivo}
                                className="w-full resize-none rounded-xl border-0 bg-[#fbf8f1] px-4 py-3 text-[14px] leading-relaxed text-charcoal-900 outline-none ring-1 ring-charcoal-900/15 focus:ring-2 focus:ring-accent-gold"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => void guardarObjetivo()} className={BOTON}>
                                    Guardar
                                </button>
                                <button onClick={() => setEditandoObjetivo(false)} className={BOTON_SUAVE}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : expediente.objetivo ? (
                        <p className="border-l-2 border-accent-gold pl-4 text-[15.5px] leading-relaxed text-charcoal-900">
                            {expediente.objetivo}
                        </p>
                    ) : (
                        <p className="text-[13.5px] italic leading-relaxed text-piedra-500">
                            Sin objetivo. Escríbalo y Iurexia podrá medir qué le falta para llegar, en vez de
                            sólo describirle lo que ya tiene.
                        </p>
                    )}
                </Seccion>

                {/* ── El análisis ──────────────────────────────────────────── */}
                <Seccion
                    id="analisis"
                    rotulo="El análisis"
                    titulo="Lo que ve Iurexia"
                    acciones={expediente.avance !== null ? (
                        <span className="rounded-full bg-[#f3e8cc] px-3 py-1 text-[12px] font-semibold text-[#6b5530] ring-1 ring-[#c9a962]/40">
                            {expediente.avance}% de avance
                        </span>
                    ) : null}>
                    {analizando ? (
                        <div className="flex items-center gap-3 rounded-xl bg-[#fbf8f1] px-4 py-5 text-[13.5px] text-piedra-700 ring-1 ring-charcoal-900/5">
                            <Loader2 className="h-5 w-5 animate-spin text-accent-brown" />
                            {progreso?.fase === 'leyendo'
                                ? `Leyendo ${progreso.actual} de ${progreso.total}: ${progreso.documento}`
                                : progreso?.fase === 'sintetizando'
                                  ? 'Analizando el caso contra su objetivo…'
                                  : 'Preparando el análisis…'}
                        </div>
                    ) : expediente.resumen_ia ? (
                        <div className="space-y-5">
                            {expediente.faltantes?.length || expediente.riesgos?.length ? (
                                <div className="space-y-4">
                                    {expediente.faltantes?.length ? (
                                        <Lista titulo="Qué le falta" puntos={expediente.faltantes} tono="falta" />
                                    ) : null}
                                    {expediente.riesgos?.length ? (
                                        <Lista titulo="Riesgos que quizá no vio" puntos={expediente.riesgos} tono="riesgo" />
                                    ) : null}
                                </div>
                            ) : null}

                            <details className="group rounded-xl ring-1 ring-charcoal-900/10">
                                <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-[13px] font-semibold text-charcoal-900">
                                    <ChevronRight className="h-4 w-4 text-accent-brown transition-transform group-open:rotate-90" />
                                    Ver el análisis completo
                                    {expediente.resumen_at ? (
                                        <span className="ml-auto text-[11.5px] font-normal text-piedra-500">
                                            Hecho {haceCuanto(expediente.resumen_at)}
                                        </span>
                                    ) : null}
                                </summary>
                                <div className="whitespace-pre-wrap border-t border-charcoal-900/10 bg-[#fbf8f1] px-4 py-4 text-[13.5px] leading-relaxed text-piedra-800">
                                    {expediente.resumen_ia}
                                </div>
                            </details>

                            <button onClick={() => void analizar()} disabled={documentos.length === 0} className={BOTON_SUAVE}>
                                <Sparkles className="h-4 w-4 text-accent-brown" />
                                Actualizar el análisis · 1 consulta
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[14px] leading-relaxed text-piedra-700">
                                Suba los documentos e Iurexia los leerá para darle el resumen del caso, su
                                estado, qué le falta y qué riesgos corre.
                            </p>
                            <button onClick={() => void analizar()} disabled={documentos.length === 0} className={`${BOTON} mt-4`}>
                                <Sparkles className="h-4 w-4 text-accent-gold" />
                                {documentos.length === 0
                                    ? 'Suba un documento primero'
                                    : 'Analizar la carpeta · 1 consulta'}
                            </button>
                        </div>
                    )}

                    {documentos.length > 0 && leidos < documentos.length && !analizando ? (
                        <p className="mt-3 text-[12px] text-piedra-500">
                            {leidos} de {documentos.length} documentos ya fueron leídos por la IA.
                        </p>
                    ) : null}
                </Seccion>

                {/* ── Consultas de la carpeta ───────────────────────────────
                    Como un asunto en Astra for Law: la consulta que nace aquí
                    lleva al modelo el objetivo, el análisis y los documentos
                    leídos, y se queda guardada en la carpeta. */}
                {consultas !== null ? (
                    <Seccion
                        id="consultas"
                        rotulo="Consultas"
                        titulo="Consultas de esta carpeta"
                        acciones={<>
                            <Link href={`/chat?carpeta=${id}&flujos=1`} className={BOTON_SUAVE}>
                                <Workflow className="h-4 w-4 text-accent-brown" />
                                Iniciar un flujo
                            </Link>
                            <Link href={`/chat?carpeta=${id}`} className={BOTON}>
                                <SquarePen className="h-4 w-4 text-accent-gold" />
                                Nueva consulta
                            </Link>
                        </>}>
                        <p className="text-[13.5px] leading-relaxed text-piedra-700">
                            Lo que pregunte aquí, Iurexia lo responde con el objetivo, el análisis y los
                            documentos leídos de esta carpeta, y la consulta se queda guardada en ella.
                        </p>
                        {consultas.length > 0 ? (
                            <ul className="mt-4 divide-y divide-[#ece6da] overflow-hidden rounded-xl bg-[#fffefa] ring-1 ring-[#e4ddcf]">
                                {consultas.map((c) => {
                                    const flujo = flujoPorId(c.flujo)
                                    return (
                                        <li key={c.id}>
                                            <Link
                                                href={`/chat?c=${c.id}`}
                                                className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[#faf6ee]">
                                                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${flujo ? 'bg-[#f3e8cc] text-[#6b5530]' : 'bg-[#f1efe9] text-piedra-600'}`}>
                                                    {flujo ? <Workflow className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13.5px] font-medium text-charcoal-900">
                                                        {tituloLimpio(c.title)}
                                                    </span>
                                                    <span className="block truncate text-[11.5px] text-piedra-500">
                                                        {flujo ? `${flujo.nombre} · ` : ''}
                                                        {new Date(c.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </span>
                                                <ChevronRight className="h-4 w-4 shrink-0 text-piedra-400 transition-transform group-hover:translate-x-0.5" />
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : null}
                    </Seccion>
                ) : null}

                {/* ── Redactar ─────────────────────────────────────────────
                    Sección propia y no un botón dentro del análisis: para
                    redactar basta con que haya documentos LEÍDOS. Estaba
                    dentro de la rama «ya hay análisis», así que una carpeta
                    recién creada ni lo mostraba y obligaba a analizar antes
                    —una consulta que no hacía falta—. Se vio probándolo en
                    producción, no leyendo el código. */}
                <Seccion id="redactar" rotulo="Escritos" titulo="Redactar con esta carpeta">
                    <p className="text-[13.5px] leading-relaxed text-piedra-700">
                        Incidentes, medidas provisionales, contestación de vistas, apelaciones.
                        Iurexia los redacta con los documentos de esta carpeta y marca lo que
                        usted debe completar antes de presentarlos.
                    </p>
                    <button onClick={() => setRedactando(true)} disabled={leidos === 0} className={`${BOTON} mt-4`}>
                        <FileSignature className="h-4 w-4 text-accent-gold" />
                        {leidos === 0
                            ? 'Suba un documento primero'
                            : 'Redactar un escrito · 1 consulta'}
                    </button>
                </Seccion>

                {/* ── Cronología del expediente (12-oct-2026, Platinum) ─────
                    Los PDF de la carpeta se leen donde ya están guardados: no
                    se vuelven a subir. Cuesta una consulta por cada N páginas y
                    el panel lo dice antes de cobrar. */}
                <section className="mb-8 rounded-xl border border-cream-400 bg-white p-5">
                    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent-brown">
                        <GanttChartSquare className="h-4 w-4" />
                        Cronología del expediente
                        {!conCronologia && <span className="ml-1 flex items-center gap-1 rounded-full bg-charcoal-900 px-2 py-0.5 text-[10px] tracking-wider text-[#c9a962]"><Lock className="h-2.5 w-2.5" /> Platinum</span>}
                    </h2>
                    <p className="mt-2.5 text-sm leading-relaxed text-charcoal-700/80">
                        Los hechos del expediente en orden, cada uno con la página donde consta; las
                        cuestiones en disputa y los plazos que corren, para Word y para su agenda.
                        Se cobra en proporción a las páginas, y se le dice cuánto antes de cobrar.
                    </p>
                    {cronologias.length > 0 && (
                        <ul className="mt-3 divide-y divide-cream-300 rounded-lg border border-cream-300">
                            {cronologias.slice(0, 5).map((c) => (
                                <li key={c.id}>
                                    <button
                                        onClick={() => { setCronologiaDe(c.id); setCronologiaAbierta(true) }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cream-100">
                                        <span className="min-w-0 flex-1 truncate">{c.titulo || 'Cronología'}</span>
                                        <span className="flex-shrink-0 text-xs text-charcoal-700/60">
                                            {c.paginas} págs. · {c.estado === 'lista'
                                                ? new Date(c.created_at).toLocaleDateString('es-MX')
                                                : c.estado === 'error' ? 'falló' : 'en proceso'}
                                        </span>
                                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-charcoal-700/40" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        onClick={() => { setCronologiaDe(null); setCronologiaAbierta(true) }}
                        disabled={conCronologia && documentos.length === 0}
                        className="mt-4 flex items-center gap-2 rounded-lg bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800 disabled:opacity-50">
                        {conCronologia ? <GanttChartSquare className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {!conCronologia
                            ? 'Disponible en Platinum'
                            : documentos.length === 0
                                ? 'Sube un documento primero'
                                : 'Construir la cronología'}
                    </button>
                </section>

                <PanelCronologia
                    abierto={cronologiaAbierta}
                    onCerrar={() => setCronologiaAbierta(false)}
                    carpetaId={id}
                    documentosCarpeta={documentos.map((d) => ({ id: d.id, nombre: d.nombre, mime_type: d.mime_type }))}
                    trabajoInicial={cronologiaDe}
                />

                {/* ── La Bóveda (oct-2026, Platinum) ─────────────────────────
                    Cientos de documentos para preguntarles juntos (chat) y en
                    tabla de revisión. Para quien no es Platinum, la invitación. */}
                <SeccionBoveda carpetaId={id} />

                {/* ── Las gavetas ──────────────────────────────────────────── */}
                <Seccion id="documentos" rotulo="El expediente" titulo="Documentos">
                <div className="space-y-6">
                    {gavetas.map((g) => {
                        const suyos = documentos.filter((d) => d.categoria === g.value)
                        return (
                            <div key={g.value}>
                                <div className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-[14px] font-semibold text-charcoal-900">
                                            {g.label}
                                            <span className="ml-2 rounded-full bg-[#f1efe9] px-2 py-0.5 text-[11px] font-medium text-piedra-600">
                                                {suyos.length}
                                            </span>
                                        </h3>
                                        <p className="mt-0.5 text-[12px] text-piedra-500">{g.descripcion}</p>
                                    </div>
                                    <button onClick={() => pedirArchivo(g.value)} disabled={subiendoEn !== null} className={BOTON_SUAVE}>
                                        {subiendoEn === g.value ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                        {/* El costo va en el botón. Subir un documento lo
                                            manda a leer —con OCR si viene escaneado— y eso
                                            consume una consulta; enterarse después, al ver
                                            el contador bajar, se siente a cobro escondido. */}
                                        Subir · 1 consulta
                                    </button>
                                </div>

                                {suyos.length === 0 ? (
                                    <button
                                        onClick={() => pedirArchivo(g.value)}
                                        disabled={subiendoEn !== null}
                                        className="w-full rounded-xl border border-dashed border-[#d6ccb8] bg-[#fbf8f1]/60 px-4 py-4 text-left text-[12.5px] italic text-piedra-500 transition hover:border-accent-brown hover:bg-[#fbf8f1]">
                                        Nada aquí todavía.
                                    </button>
                                ) : (
                                    <ul className="divide-y divide-[#ece6da] overflow-hidden rounded-xl bg-[#fffefa] ring-1 ring-[#e4ddcf]">
                                        {suyos.map((d) => (
                                            <li key={d.id} className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-[#faf6ee]">
                                                <button onClick={() => void abrir(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                                    <span className="shrink-0"><ArchivoIcono nombre={d.nombre} tamano={26} /></span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-[13.5px] font-medium text-charcoal-900">{d.nombre}</span>
                                                        <span className="block text-[11.5px] text-piedra-500">
                                                            {[haceCuanto(d.created_at), peso(d.tamano)].filter(Boolean).join(' · ')}
                                                        </span>
                                                    </span>
                                                </button>
                                                {d.extracto ? (
                                                    <span title="Iurexia ya leyó este documento"
                                                        className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800 ring-1 ring-emerald-700/15 sm:inline">
                                                        Leído
                                                    </span>
                                                ) : (
                                                    <span title="Iurexia todavía no lee este documento"
                                                        className="hidden shrink-0 rounded-full bg-[#f1efe9] px-2 py-0.5 text-[10.5px] font-semibold text-piedra-600 sm:inline">
                                                        Sin leer
                                                    </span>
                                                )}
                                                <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                                                    <button onClick={() => void abrir(d)} title="Abrir" aria-label={`Abrir ${d.nombre}`}
                                                        className="grid h-8 w-8 place-items-center rounded-full text-piedra-500 hover:bg-white hover:text-charcoal-900">
                                                        <Download className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => void quitar(d)} title="Quitar" aria-label={`Quitar ${d.nombre}`}
                                                        className="grid h-8 w-8 place-items-center rounded-full text-piedra-500 hover:bg-red-50 hover:text-red-700">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}
                </div>
                </Seccion>
                </div>

                {/* ── La ficha: dónde está cada cosa y los atajos ─────────── */}
                <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                    <div className="rounded-2xl bg-white/90 p-5 ring-1 ring-charcoal-900/10">
                        <div className="flex items-center gap-4">
                            <Avance valor={expediente.avance} />
                            <div className="min-w-0">
                                <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-brown">Ficha</p>
                                <p className="mt-0.5 font-serif text-[18px] leading-tight text-charcoal-900">{tipo.label}</p>
                                {materia ? <p className="text-[12px] text-piedra-500">{materia}</p> : null}
                            </div>
                        </div>
                        <dl className="mt-4 space-y-1.5 border-t border-charcoal-900/10 pt-4 text-[12.5px]">
                            {expediente.tipo === 'cliente' && expediente.cliente_nombre ? (
                                <Dato termino="Cliente" valor={expediente.cliente_nombre} />
                            ) : null}
                            <Dato termino="Documentos" valor={`${documentos.length} · ${leidos} leídos`} />
                            <Dato termino="Análisis" valor={expediente.resumen_at ? haceCuanto(expediente.resumen_at) : 'Sin hacer'} />
                            <Dato termino="Creada" valor={haceCuanto(expediente.created_at)} />
                        </dl>
                    </div>

                    <nav aria-label="En esta carpeta" className="rounded-2xl bg-white/90 p-2 ring-1 ring-charcoal-900/10">
                        <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-brown">En esta carpeta</p>
                        <Indice href="#objetivo" icono={<Target className="h-4 w-4" />} texto="El objetivo" />
                        <Indice href="#analisis" icono={<Sparkles className="h-4 w-4" />} texto="Lo que ve Iurexia" />
                        {consultas !== null ? (
                            <Indice href="#consultas" icono={<MessagesSquare className="h-4 w-4" />} texto="Consultas" cuenta={consultas.length} />
                        ) : null}
                        <Indice href="#redactar" icono={<FileSignature className="h-4 w-4" />} texto="Redactar" />
                        <Indice href="#boveda" icono={<Vault className="h-4 w-4" />} texto="Bóveda" />
                        <Indice href="#documentos" icono={<FolderOpen className="h-4 w-4" />} texto="Documentos" cuenta={documentos.length} />
                    </nav>

                    <div className="rounded-2xl bg-white/90 p-2 ring-1 ring-charcoal-900/10">
                        <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-brown">Atajos</p>
                        <Indice href={`/chat?carpeta=${id}&flujos=1`} icono={<Workflow className="h-4 w-4" />} texto="Iniciar un flujo de trabajo" />
                        <Indice href="/agenda?nuevo=1" icono={<CalendarDays className="h-4 w-4" />} texto="Agendar un término" />
                        <button
                            onClick={() => void eliminarCarpeta()}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] text-red-700 transition hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                            Eliminar la carpeta
                        </button>
                    </div>
                </aside>
                </div>
            </main>
        </FondoMesa>
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
    const riesgo = tono === 'riesgo'
    // Tres a la vista y el resto a un clic: con seis párrafos largos por lista
    // la sección se volvía una pared y nadie llegaba a los documentos.
    const [todos, setTodos] = useState(false)
    const vistos = todos ? puntos : puntos.slice(0, 3)
    return (
        <div className={`rounded-xl p-4 ring-1 ${riesgo ? 'bg-red-50/70 ring-red-200/80' : 'bg-[#faf6ee] ring-[#e8dcc4]'}`}>
            <h3 className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${riesgo ? 'text-red-800' : 'text-[#6b5530]'}`}>
                {titulo}
            </h3>
            <ol className="mt-3 space-y-2.5">
                {vistos.map((p, i) => (
                    <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-piedra-800">
                        <span className={`mt-px w-5 shrink-0 font-serif text-[15px] ${riesgo ? 'text-red-700' : 'text-accent-brown'}`}>
                            {i + 1}.
                        </span>
                        <span className="min-w-0">{p}</span>
                    </li>
                ))}
            </ol>
            {puntos.length > 3 ? (
                <button
                    onClick={() => setTodos(!todos)}
                    className={`mt-3 pl-8 text-[12.5px] font-semibold underline-offset-4 hover:underline ${riesgo ? 'text-red-800' : 'text-[#6b5530]'}`}>
                    {todos ? 'Ver sólo los tres primeros' : `Ver los ${puntos.length - 3} restantes`}
                </button>
            ) : null}
        </div>
    )
}

/** El avance como un sello: el anillo dorado que se llena. */
function Avance({ valor }: { valor: number | null }) {
    const r = 26
    const largo = 2 * Math.PI * r
    const lleno = valor === null ? 0 : Math.max(0, Math.min(100, valor)) / 100
    return (
        <div className="relative h-16 w-16 shrink-0" aria-label={valor === null ? 'Sin analizar' : `${valor}% de avance`}>
            <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r={r} fill="none" stroke="#ece6da" strokeWidth="5" />
                <circle
                    cx="32" cy="32" r={r} fill="none" stroke="#c9a962" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={largo} strokeDashoffset={largo * (1 - lleno)}
                    className="transition-[stroke-dashoffset] duration-700"
                />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold tabular-nums text-charcoal-900">
                {valor === null ? '—' : `${valor}%`}
            </span>
        </div>
    )
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-piedra-500">{termino}</dt>
            <dd className="truncate text-right font-medium text-charcoal-900">{valor}</dd>
        </div>
    )
}

function Indice({ href, icono, texto, cuenta }: { href: string; icono: React.ReactNode; texto: string; cuenta?: number }) {
    return (
        <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-charcoal-900 transition hover:bg-[#faf6ee]">
            <span className="text-accent-brown">{icono}</span>
            <span className="min-w-0 flex-1 truncate">{texto}</span>
            {cuenta !== undefined ? <span className="text-[11.5px] tabular-nums text-piedra-500">{cuenta}</span> : null}
        </Link>
    )
}

/** «1.2 MB», «340 KB». */
function peso(bytes: number | null): string {
    if (!bytes) return ''
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
