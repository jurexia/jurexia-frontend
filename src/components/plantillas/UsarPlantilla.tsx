'use client'

/* USAR UNA PLANTILLA (16-oct-2026): «Llega el encargo → La plantilla
   completa → En la carpeta del cliente».

   Tres pasos en una sola ventana:
     1. elegir la plantilla (si no se abrió ya con una);
     2. los datos, PRELLENADOS con los de la carpeta —cliente, domicilio,
        correo, teléfono, materia, pretensión, nombre del asunto— y la fecha de
        hoy en español largo; lo demás se escribe;
     3. el documento: el Word con el formato original, abrirlo en el editor
        para retocarlo, o guardarlo directo en la carpeta.

   Desde «Mis plantillas» no hay carpeta, pero se puede tomar los datos de una. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
    AlertTriangle, ArrowLeft, Check, ChevronRight, FileDown, FolderInput, LayoutTemplate, Loader2, PencilLine, X,
} from 'lucide-react'

import EditorEscrito, { type EscritoEnEdicion } from '@/components/documento/EditorEscrito'
import { BOTON, BOTON_SUAVE } from '@/components/carpetas/Mesa'
import { useAuth } from '@/lib/useAuth'
import { getExpedientes, nombreCarpeta, type DocumentoExpediente, type Expediente } from '@/lib/expedientes'
import { datosDeCarpeta, fechaLarga, valorDeOrigen, type CampoPlantilla, type LimitesPlantillas, type PlantillaResumen } from '@/lib/plantillas/campos'
import { bajarArchivo, generarDocumento, htmlParaEditor, listarPlantillas, textoDeWord, type DocumentoGenerado } from '@/lib/plantillas/cliente'
import { guardarWordEnCarpeta, motivoAlGuardar, nombreDeGaveta } from '@/lib/plantillas/en-carpeta'

const MATERIA: Record<string, string> = {
    civil: 'Civil', familiar: 'Familiar', mercantil: 'Mercantil', penal: 'Penal', laboral: 'Laboral', amparo: 'Amparo',
    administrativo: 'Administrativo', fiscal: 'Fiscal', agrario: 'Agrario', notarial: 'Notarial',
}
export const etiquetaMateriaPlantilla = (m: string | null) => (m ? MATERIA[m] ?? m : null)

interface Props {
    /** La carpeta desde la que se usa: prellena y permite guardar ahí. */
    carpeta?: Expediente | null
    /** Empezar con esta plantilla (desde «Mis plantillas»). Sin ella, se elige. */
    plantilla?: PlantillaResumen | null
    onCerrar: () => void
    /** Se guardó un documento en la carpeta. */
    onGuardado?: (doc: DocumentoExpediente) => void
    /** Rótulo del botón de volver del editor. */
    rotuloVolver?: string
}

type Paso = 'elegir' | 'llenar' | 'listo'

const largo = (c: CampoPlantilla) =>
    c.origen === 'carpeta.cliente_domicilio' || c.origen === 'carpeta.pretension' || (c.ejemplo?.length ?? 0) > 48

/* SIN HUECOS EN EL FORMULARIO (regla de David: todo simétrico). Los datos
   cortos van de dos en dos; uno largo ocupa la fila entera y, si interrumpe a
   un corto que esperaba pareja, pasa primero y el corto se empareja con el
   siguiente. El último corto sin pareja va a todo el ancho. */
function acomodar(campos: CampoPlantilla[]): { campo: CampoPlantilla; ancho: boolean }[] {
    const fuera: { campo: CampoPlantilla; ancho: boolean }[] = []
    let espera: CampoPlantilla | null = null
    for (const c of campos) {
        if (largo(c)) { fuera.push({ campo: c, ancho: true }); continue }
        if (espera) { fuera.push({ campo: espera, ancho: false }, { campo: c, ancho: false }); espera = null }
        else espera = c
    }
    if (espera) fuera.push({ campo: espera, ancho: true })
    return fuera
}

export default function UsarPlantilla({ carpeta = null, plantilla: inicial = null, onCerrar, onGuardado, rotuloVolver }: Props) {
    const { profile } = useAuth()
    const [montado, setMontado] = useState(false)
    const [paso, setPaso] = useState<Paso>(inicial ? 'llenar' : 'elegir')
    const [plantillas, setPlantillas] = useState<PlantillaResumen[] | null>(null)
    const [limites, setLimites] = useState<LimitesPlantillas | null>(null)
    const [elegida, setElegida] = useState<PlantillaResumen | null>(inicial)
    const [valores, setValores] = useState<Record<string, string>>({})
    const tocados = useRef<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)
    const [generando, setGenerando] = useState(false)
    const [documento, setDocumento] = useState<DocumentoGenerado | null>(null)
    const [abriendoEditor, setAbriendoEditor] = useState(false)
    const [escrito, setEscrito] = useState<EscritoEnEdicion | null>(null)
    /* El último escrito abierto: volver a abrirlo con el MISMO id conserva lo
       que se retocó (la hoja sólo se rehace con otro id). */
    const ultimoEscrito = useRef<EscritoEnEdicion | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [guardadoEn, setGuardadoEn] = useState<string | null>(null)
    // Desde «Mis plantillas»: tomar los datos de una carpeta, si se quiere.
    const [carpetas, setCarpetas] = useState<Expediente[] | null>(null)
    const [deCarpeta, setDeCarpeta] = useState<Expediente | null>(carpeta)
    const fuente = carpeta ?? deCarpeta

    useEffect(() => { setMontado(true) }, [])

    useEffect(() => {
        let vigente = true
        listarPlantillas()
            .then((r) => { if (vigente) { setPlantillas(r.plantillas); setLimites(r.limites) } })
            .catch((e) => { if (vigente) { setPlantillas([]); if (!inicial) setError(e instanceof Error ? e.message : 'No se pudieron cargar tus plantillas.') } })
        return () => { vigente = false }
    }, [inicial])

    useEffect(() => {
        if (carpeta || paso !== 'llenar' || carpetas !== null) return
        getExpedientes().then(setCarpetas).catch(() => setCarpetas([]))
    }, [carpeta, paso, carpetas])

    // La ventana tapa la página; el editor, cuando se abre, toma su lugar.
    useEffect(() => {
        if (escrito) return
        const previo = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = previo }
    }, [escrito])

    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape' && !escrito) onCerrar() }
        window.addEventListener('keydown', alTeclear)
        return () => window.removeEventListener('keydown', alTeclear)
    }, [escrito, onCerrar])

    /* LOS VALORES DE PARTIDA: lo que dice la carpeta y la fecha de hoy. Lo que
       el abogado ya escribió a mano no se pisa al cambiar de carpeta. */
    const datos = useMemo(() => datosDeCarpeta(fuente), [fuente])
    useEffect(() => {
        if (!elegida) return
        setValores((prev) => {
            const sig: Record<string, string> = {}
            for (const c of elegida.campos) {
                sig[c.clave] = tocados.current.has(c.clave) ? prev[c.clave] ?? '' : valorDeOrigen(c.origen, datos) ?? ''
            }
            return sig
        })
    }, [elegida, datos])

    const ordenadas = useMemo(() => {
        const lista = [...(plantillas ?? [])]
        const materia = carpeta?.materia ?? null
        return lista.sort((a, b) =>
            Number(b.lista) - Number(a.lista)
            || Number(!!materia && b.materia === materia) - Number(!!materia && a.materia === materia)
            || b.veces_usada - a.veces_usada)
    }, [plantillas, carpeta?.materia])

    const quedanHoy = limites && limites.generar.usados !== null ? Math.max(0, limites.generar.limite - limites.generar.usados) : null
    const vacios = elegida ? elegida.campos.filter((c) => !valores[c.clave]?.trim()).length : 0

    function elegir(p: PlantillaResumen) {
        tocados.current = new Set()
        setElegida(p)
        setDocumento(null)
        setGuardadoEn(null)
        setError(null)
        setPaso('llenar')
    }

    async function generar() {
        if (!elegida) return
        setGenerando(true)
        setError(null)
        try {
            const doc = await generarDocumento(elegida.id, valores, fuente?.id ?? null)
            setDocumento(doc)
            setGuardadoEn(null)
            setEscrito(null)
            ultimoEscrito.current = null
            setPaso('listo')
            setLimites((l) => (l && l.generar.usados !== null ? { ...l, generar: { ...l.generar, usados: l.generar.usados + 1 } } : l))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo armar el documento.')
        } finally {
            setGenerando(false)
        }
    }

    async function abrirEditor() {
        if (!documento) return
        if (ultimoEscrito.current) { setEscrito(ultimoEscrito.current); return }
        setAbriendoEditor(true)
        setError(null)
        try {
            const html = await htmlParaEditor(documento.blob)
            const nuevo = { id: `${elegida?.id}:${documento.nombre}:${documento.blob.size}:${Date.now()}`, html, titulo: documento.nombre.replace(/\.docx$/i, '') }
            ultimoEscrito.current = nuevo
            setEscrito(nuevo)
        } catch {
            setError('No se pudo abrir el documento en el editor. El Word sí está listo: se baja con el primer botón.')
        } finally {
            setAbriendoEditor(false)
        }
    }

    async function guardarEnCarpeta() {
        if (!documento || !fuente) return
        setGuardando(true)
        setError(null)
        try {
            const texto = await textoDeWord(documento.blob)
            const { documento: doc, gaveta } = await guardarWordEnCarpeta({
                expedienteId: fuente.id, tipo: fuente.tipo, blob: documento.blob, nombre: documento.nombre,
                plan: profile?.subscription_type, texto,
            })
            setGuardadoEn(nombreDeGaveta(gaveta))
            onGuardado?.(doc)
        } catch (e) {
            setError(motivoAlGuardar(e))
        } finally {
            setGuardando(false)
        }
    }

    const carpetaDelEditor = fuente
        ? { id: fuente.id, titulo: nombreCarpeta(fuente), clienteNombre: datos?.cliente_nombre ?? null, clienteCorreo: fuente.cliente_correo ?? null }
        : null

    if (!montado) return null
    return createPortal(
        <>
            {/* El editor a pantalla completa: se esconde, no se desmonta, para
                conservar lo que se retocó (ver EditorEscrito). */}
            <EditorEscrito
                escrito={escrito}
                onCerrar={() => setEscrito(null)}
                carpeta={carpetaDelEditor}
                rotuloVolver={rotuloVolver ?? (carpeta ? 'Volver a la carpeta' : 'Volver a mis plantillas')}
            />

            {escrito ? null : (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal-950/45 p-3 backdrop-blur-[2px] sm:p-6"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
                    <div role="dialog" aria-modal="true" aria-label="Usar una plantilla"
                        className="my-4 w-full max-w-2xl overflow-hidden rounded-2xl bg-[#fbf8f1] shadow-[0_30px_80px_-30px_rgba(17,17,17,0.7)] ring-1 ring-charcoal-900/10 sm:my-10">
                        {/* ── Cabecera ─────────────────────────────────── */}
                        <div className="relative overflow-hidden bg-[#171614] px-5 pb-5 pt-5 text-[#f7f2e8] sm:px-7">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/web/arte/manuscrito.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,#11100e_0%,rgba(17,16,14,0.92)_45%,rgba(17,16,14,0.55)_100%)]" />
                            <div className="relative flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-[#c8ab73]">
                                        {carpeta ? `Plantilla del despacho · ${nombreCarpeta(carpeta)}` : 'Plantilla del despacho'}
                                    </p>
                                    <h2 className="mt-2 truncate font-serif text-[26px] font-normal leading-tight text-[#faf7ef]">
                                        {paso === 'elegir' ? '¿Con qué plantilla?' : elegida?.nombre ?? 'Plantilla'}
                                    </h2>
                                    <Pasos paso={paso} />
                                </div>
                                <button type="button" onClick={onCerrar} aria-label="Cerrar"
                                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#e4d4b6] transition hover:bg-white/10 hover:text-white">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-5 py-5 sm:px-7">
                            {error ? (
                                <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-800 ring-1 ring-red-200">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span className="flex-1">{error}</span>
                                </div>
                            ) : null}

                            {/* ── 1 · Elegir ──────────────────────────── */}
                            {paso === 'elegir' ? (
                                plantillas === null ? (
                                    <div className="space-y-2">
                                        {[0, 1, 2].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white/80 ring-1 ring-charcoal-900/5" />)}
                                    </div>
                                ) : ordenadas.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-[#d6ccb8] bg-white/70 px-5 py-8 text-center">
                                        <LayoutTemplate className="mx-auto h-8 w-8 text-accent-brown" />
                                        <p className="mt-3 font-serif text-[19px] text-charcoal-900">Aún no hay plantillas</p>
                                        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-piedra-600">
                                            Los formatos de Word del despacho se suben en Mis plantillas: Iurexia encuentra los datos que cambian y aquí se llenan con los de cada carpeta.
                                        </p>
                                        <Link href="/plantillas" className={`${BOTON} mt-5`}>Subir la primera plantilla</Link>
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {ordenadas.map((p) => (
                                            <li key={p.id}>
                                                {p.lista ? (
                                                    <button type="button" onClick={() => elegir(p)}
                                                        className="group flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left ring-1 ring-charcoal-900/10 transition hover:ring-accent-gold/70 hover:shadow-[0_10px_24px_-18px_rgba(17,17,17,0.45)]">
                                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f3e8cc] text-[#6b5530]"><LayoutTemplate className="h-5 w-5" /></span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[14px] font-semibold text-charcoal-900">{p.nombre}</span>
                                                            <span className="block truncate text-[12px] text-piedra-500">
                                                                {[etiquetaMateriaPlantilla(p.materia), `${p.campos.length} ${p.campos.length === 1 ? 'campo' : 'campos'}`, p.veces_usada ? `usada ${p.veces_usada} ${p.veces_usada === 1 ? 'vez' : 'veces'}` : null].filter(Boolean).join(' · ')}
                                                            </span>
                                                        </span>
                                                        {carpeta?.materia && p.materia === carpeta.materia ? (
                                                            <span className="hidden shrink-0 rounded-full bg-[#f3e8cc] px-2 py-0.5 text-[10.5px] font-semibold text-[#6b5530] sm:inline">De la materia</span>
                                                        ) : null}
                                                        <ChevronRight className="h-4 w-4 shrink-0 text-piedra-400 transition-transform group-hover:translate-x-0.5" />
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-3 ring-1 ring-charcoal-900/5">
                                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-piedra-100 text-piedra-500"><LayoutTemplate className="h-5 w-5" /></span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[14px] font-semibold text-piedra-600">{p.nombre}</span>
                                                            <span className="block text-[12px] text-piedra-500">Falta revisar sus campos</span>
                                                        </span>
                                                        <Link href={`/plantillas?revisar=${p.id}`} className="shrink-0 text-[12.5px] font-semibold text-accent-brown underline-offset-4 hover:underline">Revisar</Link>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )
                            ) : null}

                            {/* ── 2 · Los datos ───────────────────────── */}
                            {paso === 'llenar' && elegida ? (
                                <div>
                                    {!carpeta ? (
                                        <div className="mb-5 rounded-xl bg-white px-4 py-3 ring-1 ring-charcoal-900/10">
                                            <label htmlFor="plantilla-carpeta" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-brown">Tomar los datos de una carpeta</label>
                                            <select id="plantilla-carpeta" value={deCarpeta?.id ?? ''}
                                                onChange={(e) => setDeCarpeta((carpetas ?? []).find((c) => c.id === e.target.value) ?? null)}
                                                className="mt-1.5 h-10 w-full rounded-lg border border-charcoal-900/15 bg-[#fbf8f1] px-2 text-base text-charcoal-900 [@media(pointer:fine)]:text-[13.5px]">
                                                <option value="">{carpetas === null ? 'Cargando tus carpetas…' : 'Ninguna: los escribo a mano'}</option>
                                                {(carpetas ?? []).map((c) => <option key={c.id} value={c.id}>{nombreCarpeta(c)}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <p className="mb-4 flex items-start gap-2 rounded-xl bg-white px-4 py-3 text-[13px] leading-relaxed text-piedra-700 ring-1 ring-charcoal-900/10">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-brown" />
                                            <span>Los datos de la carpeta y la fecha de hoy ya vienen puestos. Lo demás se escribe aquí.</span>
                                        </p>
                                    )}

                                    {elegida.campos.length === 0 ? (
                                        <p className="text-[13px] text-piedra-600">Esta plantilla no tiene campos: el documento saldrá tal cual.</p>
                                    ) : (
                                        <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
                                            {acomodar(elegida.campos).map(({ campo: c, ancho }) => {
                                                const propuesto = valorDeOrigen(c.origen, datos)
                                                const deOrigen = !!propuesto && valores[c.clave] === propuesto
                                                const id = `valor-${c.clave}`
                                                return (
                                                    <div key={c.clave} className={ancho ? 'sm:col-span-2' : ''}>
                                                        <div className="mb-1 flex items-center justify-between gap-2">
                                                            <label htmlFor={id} className="truncate text-[12.5px] font-semibold text-charcoal-900">{c.etiqueta}</label>
                                                            {deOrigen ? (
                                                                <span className="shrink-0 rounded-full bg-[#f3e8cc] px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-[#6b5530]">
                                                                    {c.origen.startsWith('fecha') ? 'Hoy' : 'De la carpeta'}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {largo(c) ? (
                                                            <textarea id={id} rows={2} value={valores[c.clave] ?? ''}
                                                                onChange={(e) => { tocados.current.add(c.clave); setValores((v) => ({ ...v, [c.clave]: e.target.value })) }}
                                                                placeholder={c.ejemplo ? `Ej.: ${c.ejemplo}` : ''}
                                                                className="w-full resize-y rounded-lg border-0 bg-white px-3 py-2 text-base leading-snug text-charcoal-900 outline-none ring-1 ring-charcoal-900/15 placeholder:text-piedra-400 focus:ring-2 focus:ring-accent-gold [@media(pointer:fine)]:text-[13.5px]" />
                                                        ) : (
                                                            <input id={id} value={valores[c.clave] ?? ''}
                                                                onChange={(e) => { tocados.current.add(c.clave); setValores((v) => ({ ...v, [c.clave]: e.target.value })) }}
                                                                placeholder={c.ejemplo ? `Ej.: ${c.ejemplo}` : c.origen === 'fecha_hoy' ? fechaLarga() : ''}
                                                                className="h-10 w-full rounded-lg border-0 bg-white px-3 text-base text-charcoal-900 outline-none ring-1 ring-charcoal-900/15 placeholder:text-piedra-400 focus:ring-2 focus:ring-accent-gold [@media(pointer:fine)]:text-[13.5px]" />
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-charcoal-900/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-[12px] leading-snug text-piedra-500">
                                            {vacios > 0 ? <p>{vacios === 1 ? 'Un dato vacío saldrá como «__________» para llenarlo a mano.' : `${vacios} datos vacíos saldrán como «__________» para llenarlos a mano.`}</p> : <p>Todos los datos están puestos.</p>}
                                            {quedanHoy !== null ? <p className="mt-0.5">Quedan {quedanHoy} de {limites?.generar.limite} documentos por hoy.</p> : null}
                                        </div>
                                        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                                            {!inicial ? (
                                                <button type="button" onClick={() => { setPaso('elegir'); setError(null) }} className={BOTON_SUAVE}>
                                                    <ArrowLeft className="h-4 w-4" /> Otra
                                                </button>
                                            ) : null}
                                            <button type="button" onClick={() => void generar()} disabled={generando || quedanHoy === 0} className={`${BOTON} flex-1 py-2.5 sm:flex-none sm:py-2`}>
                                                {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4 text-accent-gold" />}
                                                {generando ? 'Armando el documento…' : 'Generar el documento'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* ── 3 · El documento ────────────────────── */}
                            {paso === 'listo' && documento ? (
                                <div>
                                    <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-charcoal-900/10">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/15"><Check className="h-5 w-5" strokeWidth={2.5} /></span>
                                        <div className="min-w-0">
                                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-accent-brown">El documento está listo</p>
                                            <p className="mt-0.5 break-words font-serif text-[18px] leading-snug text-charcoal-900">{documento.nombre}</p>
                                            <p className="mt-1 text-[12.5px] leading-relaxed text-piedra-600">
                                                Con el formato de la plantilla: membrete, estilos, tablas, encabezados y pies tal cual. Conviene revisarlo antes de firmar.
                                            </p>
                                        </div>
                                    </div>

                                    {/* El Word original manda: arriba y a todo el ancho; abajo, los
                                        otros dos caminos, del mismo tamaño. */}
                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                        <button type="button" onClick={() => bajarArchivo(documento.blob, documento.nombre)} className={`${BOTON} w-full py-2.5 sm:col-span-2`}>
                                            <FileDown className="h-4 w-4 text-accent-gold" /> Word con el formato original
                                        </button>
                                        <button type="button" onClick={() => void abrirEditor()} disabled={abriendoEditor} className={`${BOTON_SUAVE} w-full ${fuente ? '' : 'sm:col-span-2'}`}>
                                            {abriendoEditor ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4 text-accent-brown" />} Abrir en el editor
                                        </button>
                                        {fuente ? (
                                            <button type="button" onClick={() => void guardarEnCarpeta()} disabled={guardando || !!guardadoEn} className={`${BOTON_SUAVE} w-full`}>
                                                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : guardadoEn ? <Check className="h-4 w-4 text-emerald-700" /> : <FolderInput className="h-4 w-4 text-accent-brown" />}
                                                {guardadoEn ? 'En la carpeta' : 'Guardar en la carpeta'}
                                            </button>
                                        ) : null}
                                    </div>
                                    {guardadoEn ? (
                                        <p className="mt-3 text-[12.5px] text-emerald-800">Guardado en «{guardadoEn}» de {nombreCarpeta(fuente!)}.</p>
                                    ) : null}
                                    <p className="mt-4 text-[12px] leading-relaxed text-piedra-500">
                                        En el editor se retoca el texto y desde ahí se baja o se guarda en la carpeta; el membrete y el formato exacto viajan en el Word original.
                                    </p>
                                    <button type="button" onClick={() => { setPaso('llenar'); setError(null) }}
                                        className="mt-3 text-[12.5px] font-semibold text-accent-brown underline-offset-4 hover:underline">
                                        Cambiar los datos
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body,
    )
}

function Pasos({ paso }: { paso: Paso }) {
    const lista: [Paso, string][] = [['elegir', 'Plantilla'], ['llenar', 'Datos'], ['listo', 'Documento']]
    const actual = lista.findIndex(([p]) => p === paso)
    return (
        <ol className="mt-3 flex flex-nowrap items-center gap-x-1.5 whitespace-nowrap text-[11.5px] sm:gap-x-2">
            {lista.map(([p, rotulo], i) => (
                <li key={p} className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`inline-flex items-center gap-1.5 ${i <= actual ? 'text-[#f3e4c8]' : 'text-[#9d927f]'}`}>
                        <span className={`grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] font-bold ${i < actual ? 'bg-[#c9a962] text-[#171614]' : i === actual ? 'bg-[#f3e4c8] text-[#171614]' : 'ring-1 ring-[#9d927f]/60'}`}>
                            {i < actual ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                        </span>
                        {rotulo}
                    </span>
                    {i < lista.length - 1 ? <span className="h-px w-3 bg-[#9d927f]/50 sm:w-5" /> : null}
                </li>
            ))}
        </ol>
    )
}
