'use client'

/* MIS PLANTILLAS (16-oct-2026). David: «Agregar plantillas y trabajar sobre
   ellas es fundamental para los abogados». La biblioteca del despacho: los
   formatos de Word que ya usa, cada uno con sus campos revisados, listos para
   llenarse con los datos de una carpeta.

   Con el lenguaje de Mis carpetas (la Mesa): la portada oscura con su grabado,
   las secciones en <Seccion> y los botones de tinta. La página es este
   componente entero para que la prueba lo monte tal cual. */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
    AlertTriangle, Check, FolderOpen, LayoutTemplate, Loader2, Pencil, Plus, ScanText, Trash2, Upload, X,
} from 'lucide-react'

import Navbar from '@/components/Navbar'
import { ArchivoIcono } from '@/components/CarpetaIcono'
import { BOTON, BOTON_CLARO, BOTON_CLARO_SUAVE, BOTON_SUAVE, Cifra, FondoMesa, Portada, Seccion } from '@/components/carpetas/Mesa'
import RevisionCampos from '@/components/plantillas/RevisionCampos'
import UsarPlantilla, { etiquetaMateriaPlantilla } from '@/components/plantillas/UsarPlantilla'
import { haceCuanto } from '@/lib/arte-carpeta'
import type { LimitesPlantillas, PlantillaResumen } from '@/lib/plantillas/campos'
import {
    abrirPlantilla, borrarPlantilla, cambiarPlantilla, ErrorPlantillas, listarPlantillas, subirPlantilla,
    type PlantillaEnRevision,
} from '@/lib/plantillas/cliente'

/* Vercel no deja pasar cuerpos de más de 4.5 MB a una función: arriba de eso
   la subida se cortaría sin explicación. Se dice antes, con el remedio. */
const MAX_MB = 4

const MENSAJES_SUBIDA = [
    'Leyendo tu documento…',
    'Buscando los datos que cambian de un asunto a otro…',
    'Preparando la vista previa con los campos…',
]

export default function MisPlantillas() {
    const [plantillas, setPlantillas] = useState<PlantillaResumen[] | null>(null)
    const [limites, setLimites] = useState<LimitesPlantillas | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sinEsquema, setSinEsquema] = useState(false)
    const [subiendo, setSubiendo] = useState<string | null>(null)
    const [mensaje, setMensaje] = useState(0)
    const [arrastrando, setArrastrando] = useState(false)
    const [revision, setRevision] = useState<PlantillaEnRevision | null>(null)
    const [abriendo, setAbriendo] = useState<string | null>(null)
    const [usando, setUsando] = useState<PlantillaResumen | null>(null)
    const [renombrando, setRenombrando] = useState<string | null>(null)
    const [borrador, setBorrador] = useState('')
    const [aviso, setAviso] = useState<string | null>(null)
    const entrada = useRef<HTMLInputElement | null>(null)

    const cargar = useCallback(async () => {
        try {
            const r = await listarPlantillas()
            setPlantillas(r.plantillas)
            setLimites(r.limites)
            setSinEsquema(false)
        } catch (e) {
            setPlantillas([])
            if (e instanceof ErrorPlantillas && e.sinEsquema) setSinEsquema(true)
            else setError(e instanceof Error ? e.message : 'No se pudieron cargar tus plantillas.')
        }
    }, [])
    useEffect(() => { void cargar() }, [cargar])

    // «?revisar=<id>»: desde la carpeta, para terminar de revisar una plantilla.
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('revisar')
        if (id) void revisar(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!subiendo) { setMensaje(0); return }
        const t = window.setInterval(() => setMensaje((m) => Math.min(m + 1, MENSAJES_SUBIDA.length - 1)), 3500)
        return () => window.clearInterval(t)
    }, [subiendo])

    useEffect(() => {
        if (!aviso) return
        const t = window.setTimeout(() => setAviso(null), 4200)
        return () => window.clearTimeout(t)
    }, [aviso])

    const guardadas = plantillas?.length ?? 0
    const maximo = limites?.guardadas.maximo ?? null
    const lleno = maximo !== null && guardadas >= maximo
    const usos = (plantillas ?? []).reduce((n, p) => n + p.veces_usada, 0)
    const quedanDeteccion = limites && limites.deteccion.usados !== null ? Math.max(0, limites.deteccion.limite - limites.deteccion.usados) : null

    async function subir(archivo: File) {
        setError(null)
        if (/\.(docm|dotm)$/i.test(archivo.name)) { setError('El documento tiene macros (.docm). Por seguridad no se aceptan: guárdalo como «Documento de Word (.docx)».'); return }
        if (/\.doc$/i.test(archivo.name)) { setError('Es un Word antiguo (.doc). Ábrelo en Word y guárdalo como «Documento de Word (.docx)».'); return }
        if (!/\.(docx|dotx)$/i.test(archivo.name)) { setError('Sólo se aceptan documentos de Word (.docx).'); return }
        if (archivo.size > MAX_MB * 1024 * 1024) {
            setError(`«${archivo.name}» pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_MB} MB. Casi siempre lo que pesa son las imágenes del membrete: en Word, Archivo → Comprimir imágenes, y vuelve a subirlo.`)
            return
        }
        if (lleno) { setError(`Tu plan guarda hasta ${maximo} ${maximo === 1 ? 'plantilla' : 'plantillas'}. Borra una que ya no uses o mejora tu plan.`); return }
        setSubiendo(archivo.name)
        try {
            const r = await subirPlantilla(archivo)
            setRevision(r)
            void cargar()
        } catch (e) {
            if (e instanceof ErrorPlantillas && e.sinEsquema) setSinEsquema(true)
            setError(e instanceof Error ? e.message : 'No se pudo subir la plantilla.')
        } finally {
            setSubiendo(null)
        }
    }

    async function revisar(id: string) {
        setAbriendo(id)
        setError(null)
        try { setRevision(await abrirPlantilla(id)) } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo abrir la plantilla.')
        } finally { setAbriendo(null) }
    }

    async function renombrar(p: PlantillaResumen) {
        const nombre = borrador.replace(/\s+/g, ' ').trim()
        setRenombrando(null)
        if (!nombre || nombre === p.nombre) return
        setPlantillas((prev) => prev?.map((x) => (x.id === p.id ? { ...x, nombre } : x)) ?? prev)
        try { await cambiarPlantilla(p.id, { nombre }) } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo cambiar el nombre.')
            void cargar()
        }
    }

    async function borrar(p: PlantillaResumen) {
        if (!window.confirm(`Se borrará la plantilla «${p.nombre}». Los documentos que ya generaste con ella no se tocan. ¿Continuar?`)) return
        try {
            await borrarPlantilla(p.id)
            setPlantillas((prev) => prev?.filter((x) => x.id !== p.id) ?? prev)
            setLimites((l) => (l ? { ...l, guardadas: { ...l.guardadas, usadas: Math.max(0, l.guardadas.usadas - 1) } } : l))
            setAviso(`Se borró «${p.nombre}».`)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo borrar.')
        }
    }

    function alSoltar(e: React.DragEvent) {
        e.preventDefault()
        setArrastrando(false)
        const archivo = e.dataTransfer.files?.[0]
        if (archivo) void subir(archivo)
    }

    const zonaDeSubida = (
        <div
            onDragOver={(e) => { e.preventDefault(); if (!subiendo) setArrastrando(true) }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
            className={`relative rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${arrastrando ? 'border-accent-gold bg-[#f6eedb]' : 'border-[#d6ccb8] bg-[#fbf8f1]/80 hover:border-accent-brown/60'}`}>
            {subiendo ? (
                <div className="flex flex-col items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-charcoal-900 text-accent-gold"><Loader2 className="h-6 w-6 animate-spin" /></span>
                    <div>
                        <p className="font-serif text-[18px] text-charcoal-900">{MENSAJES_SUBIDA[mensaje]}</p>
                        <p className="mt-1 truncate text-[12.5px] text-piedra-500">{subiendo} · suele tardar entre 10 y 30 segundos</p>
                    </div>
                </div>
            ) : (
                <>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-accent-brown ring-1 ring-charcoal-900/10"><Upload className="h-5 w-5" /></span>
                    <p className="mt-3 font-serif text-[19px] text-charcoal-900">Arrastra aquí un Word del despacho</p>
                    <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-piedra-600">
                        Un escrito que ya usaste o un formato con huecos. Sólo .docx, hasta {MAX_MB} MB.
                        {quedanDeteccion !== null ? ` Este mes Iurexia puede revisar ${quedanDeteccion} ${quedanDeteccion === 1 ? 'plantilla nueva' : 'plantillas nuevas'} más.` : ''}
                    </p>
                    <button type="button" onClick={() => entrada.current?.click()} disabled={lleno || sinEsquema} className={`${BOTON} mt-4`}>
                        <Plus className="h-4 w-4 text-accent-gold" /> Elegir el archivo
                    </button>
                    {lleno ? <p className="mt-2 text-[12px] text-red-700">Tu plan guarda hasta {maximo} {maximo === 1 ? 'plantilla' : 'plantillas'}: borra una para subir otra.</p> : null}
                </>
            )}
        </div>
    )

    return (
        <FondoMesa>
            <Navbar plataforma />
            <input ref={entrada} type="file" accept=".docx,.dotx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void subir(f) }} />

            <main className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6">
                <Portada
                    arte="/web/arte/manuscrito.webp"
                    rotulo="Iurexia · Mi trabajo"
                    titulo={<>Mis <em>plantillas</em></>}>
                    <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#d2cabe] sm:text-[15px]">
                        Los formatos de Word de tu despacho. Iurexia encuentra los datos que cambian de un asunto a otro y, cada vez
                        que usas una plantilla, te devuelve el documento con tu formato y los datos de tu cliente.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Cifra valor={plantillas === null ? '…' : maximo !== null ? `${guardadas} de ${maximo}` : guardadas} rotulo={guardadas === 1 && maximo === null ? 'plantilla' : 'plantillas'} />
                        <Cifra valor={plantillas === null ? '…' : usos} rotulo={usos === 1 ? 'documento generado' : 'documentos generados'} />
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <button type="button" onClick={() => entrada.current?.click()} disabled={!!subiendo || lleno || sinEsquema} className={BOTON_CLARO}>
                            <Upload className="h-4 w-4" /> Subir una plantilla
                        </button>
                        <Link href="/carpetas" className={BOTON_CLARO_SUAVE}>
                            <FolderOpen className="h-4 w-4" /> Mis carpetas
                        </Link>
                    </div>
                </Portada>

                {/* Los tres pasos, como los ve el abogado. */}
                <ol className="mt-7 grid gap-3 sm:grid-cols-3">
                    {[
                        ['Sube tu formato', 'El Word que ya usas, con tu membrete, tus estilos y tus tablas.'],
                        ['Revisa los campos', 'Iurexia marca en oro lo que cambia de un asunto a otro; tú confirmas.'],
                        ['Úsala desde la carpeta', 'Los datos del cliente ya puestos y el documento con tu formato, en su carpeta.'],
                    ].map(([titulo, texto], i) => (
                        <li key={titulo} className="flex gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-charcoal-900/10">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-charcoal-900 font-serif text-[15px] text-[#e3c994]">{i + 1}</span>
                            <span className="min-w-0">
                                <span className="block text-[14px] font-semibold text-charcoal-900">{titulo}</span>
                                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-piedra-600">{texto}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                {error ? (
                    <div className="mt-6 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-800 ring-1 ring-red-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button type="button" onClick={() => setError(null)} aria-label="Cerrar el aviso" className="rounded p-0.5 hover:bg-red-100"><X className="h-4 w-4" /></button>
                    </div>
                ) : null}

                <div className="mt-6">
                    <Seccion
                        id="plantillas"
                        rotulo="Biblioteca del despacho"
                        titulo="Tus plantillas"
                        acciones={plantillas && plantillas.length > 0 ? (
                            <button type="button" onClick={() => entrada.current?.click()} disabled={!!subiendo || lleno || sinEsquema} className={BOTON_SUAVE}>
                                <Upload className="h-4 w-4 text-accent-brown" /> Subir otra
                            </button>
                        ) : null}>
                        {sinEsquema ? (
                            <div className="rounded-xl bg-[#f6eedb] px-4 py-4 text-[13.5px] leading-relaxed text-[#5c4a2a] ring-1 ring-[#e8dcc4]">
                                Las plantillas todavía no están activadas en tu cuenta. Escríbenos desde Soporte y las activamos.
                            </div>
                        ) : plantillas === null ? (
                            <div className="space-y-2">
                                {[0, 1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-[#fbf8f1] ring-1 ring-charcoal-900/5" />)}
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {plantillas.length > 0 ? (
                                    <ul className="divide-y divide-[#ece6da] overflow-hidden rounded-xl bg-[#fffefa] ring-1 ring-[#e4ddcf]">
                                        {plantillas.map((p) => {
                                            /* Cambiar el nombre y borrar: en el teléfono van arriba, junto al
                                               nombre, para que «Usar» y «Campos» queden de dos en dos. */
                                            const herramientas = (
                                                <>
                                                    <button type="button" onClick={() => { setRenombrando(p.id); setBorrador(p.nombre) }} title="Cambiar el nombre" aria-label={`Cambiar el nombre de ${p.nombre}`}
                                                        className="grid h-9 w-9 place-items-center rounded-full text-piedra-500 transition hover:bg-white hover:text-charcoal-900 hover:ring-1 hover:ring-charcoal-900/10">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => void borrar(p)} title="Borrar" aria-label={`Borrar ${p.nombre}`}
                                                        className="grid h-9 w-9 place-items-center rounded-full text-piedra-500 transition hover:bg-red-50 hover:text-red-700">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )
                                            return (
                                            <li key={p.id} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-[#faf6ee] sm:flex-row sm:items-center">
                                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                                    <span className="shrink-0 pt-0.5"><ArchivoIcono nombre="plantilla.docx" tamano={30} /></span>
                                                    <div className="min-w-0 flex-1">
                                                        {renombrando === p.id ? (
                                                            <input autoFocus value={borrador} onChange={(e) => setBorrador(e.target.value)}
                                                                onBlur={() => void renombrar(p)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') void renombrar(p); if (e.key === 'Escape') setRenombrando(null) }}
                                                                aria-label="Nombre de la plantilla"
                                                                className="w-full rounded-md bg-white px-2 py-1 text-base font-semibold text-charcoal-900 outline-none ring-2 ring-accent-gold [@media(pointer:fine)]:text-[14.5px]" />
                                                        ) : (
                                                            <p className="truncate text-[14.5px] font-semibold text-charcoal-900">{p.nombre}</p>
                                                        )}
                                                        {p.descripcion ? <p className="mt-0.5 line-clamp-1 text-[12.5px] text-piedra-600">{p.descripcion}</p> : null}
                                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                                                            {p.lista ? null : (
                                                                <span className="rounded-full bg-[#f6eedb] px-2 py-0.5 font-semibold text-[#8a5a12] ring-1 ring-[#e3c994]">Falta revisar los campos</span>
                                                            )}
                                                            {etiquetaMateriaPlantilla(p.materia) ? (
                                                                <span className="rounded-full bg-[#f3e8cc] px-2 py-0.5 font-semibold text-[#6b5530]">{etiquetaMateriaPlantilla(p.materia)}</span>
                                                            ) : null}
                                                            <span className="rounded-full bg-piedra-100 px-2 py-0.5 text-piedra-700">{p.campos.length} {p.campos.length === 1 ? 'campo' : 'campos'}</span>
                                                            <span className="rounded-full bg-piedra-100 px-2 py-0.5 text-piedra-700">
                                                                {p.veces_usada ? `Usada ${p.veces_usada} ${p.veces_usada === 1 ? 'vez' : 'veces'}` : 'Sin usar'}
                                                            </span>
                                                            <span className="text-piedra-500">· {haceCuanto(p.updated_at)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="-mr-2 -mt-1 flex shrink-0 sm:hidden">{herramientas}</div>
                                                </div>
                                                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1.5">
                                                    {p.lista ? (
                                                        <>
                                                            <button type="button" onClick={() => setUsando(p)} className={BOTON}>
                                                                <LayoutTemplate className="h-4 w-4 text-accent-gold" /> Usar
                                                            </button>
                                                            <button type="button" onClick={() => void revisar(p.id)} disabled={abriendo === p.id} className={BOTON_SUAVE}>
                                                                {abriendo === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4 text-accent-brown" />} Campos
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button type="button" onClick={() => void revisar(p.id)} disabled={abriendo === p.id} className={`${BOTON} col-span-2`}>
                                                            {abriendo === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4 text-accent-gold" />} Revisar campos
                                                        </button>
                                                    )}
                                                    <div className="hidden items-center gap-1.5 sm:flex">{herramientas}</div>
                                                </div>
                                            </li>
                                            )
                                        })}
                                    </ul>
                                ) : null}
                                {zonaDeSubida}
                            </div>
                        )}
                    </Seccion>
                </div>
            </main>

            {revision ? (
                <RevisionCampos
                    key={revision.plantilla.id}
                    plantilla={revision.plantilla}
                    vista={revision.vista}
                    aviso={revision.aviso}
                    revisadaPorIurexia={revision.revisadaPorIurexia ?? revision.plantilla.campos.some((c) => c.fuente === 'modelo')}
                    onCerrar={() => { setRevision(null); void cargar() }}
                    onGuardada={(p, descartados) => {
                        setRevision(null)
                        setPlantillas((prev) => {
                            const resto = (prev ?? []).filter((x) => x.id !== p.id)
                            return [p, ...resto]
                        })
                        setAviso(descartados.length
                            ? `Plantilla lista con ${p.campos.length} campos. No se encontraron en el documento: ${descartados.join(', ')}.`
                            : `Plantilla lista: ${p.campos.length} ${p.campos.length === 1 ? 'campo' : 'campos'}. Ya puedes usarla desde cualquier carpeta.`)
                    }}
                />
            ) : null}

            {usando ? (
                <UsarPlantilla
                    plantilla={usando}
                    onCerrar={() => { setUsando(null); void cargar() }}
                    rotuloVolver="Volver a mis plantillas"
                />
            ) : null}

            <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
                {aviso ? (
                    <div className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-full bg-charcoal-900 px-4 py-2.5 text-[13px] text-white shadow-lg">
                        <Check className="h-4 w-4 shrink-0 text-accent-gold" />
                        <span className="min-w-0">{aviso}</span>
                    </div>
                ) : null}
            </div>
        </FondoMesa>
    )
}
