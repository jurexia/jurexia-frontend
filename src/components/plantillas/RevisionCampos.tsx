'use client'

/* LA REVISIÓN DE CAMPOS (16-oct-2026). El paso que hace confiable a una
   plantilla: el abogado ve SU documento con los campos en oro —exactamente lo
   que se va a llenar, con la misma regla con que se marcará el Word— y a un
   lado la lista para aceptar, quitar o renombrar cada uno y decir de dónde
   sale su valor. Lo que Iurexia no vio, se marca seleccionándolo en el
   documento.

   A pantalla completa y en un portal: sobre la barra de trabajo y la lateral,
   sin depender del apilamiento de la página que la abre. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, ChevronLeft, Eye, Highlighter, Loader2, Plus, Sparkles, X } from 'lucide-react'

import { BOTON } from '@/components/carpetas/Mesa'
import { claveUnica, ORIGENES, type CampoPlantilla, type OrigenCampo, type PlantillaResumen, type VistaPlantilla } from '@/lib/plantillas/campos'
import { cambiarPlantilla, guardarCampos } from '@/lib/plantillas/cliente'
import { parrafosAHtml, resaltar, seleccionComoCampo } from '@/lib/plantillas/resaltado'

type CampoEnRevision = CampoPlantilla & { aceptado: boolean }

interface Props {
    plantilla: PlantillaResumen
    vista: VistaPlantilla
    /** Lo que el servidor quiso decir (el modelo no respondió, el tope del mes…). */
    aviso?: string | null
    revisadaPorIurexia?: boolean
    onCerrar: () => void
    onGuardada: (p: PlantillaResumen, descartados: string[]) => void
}

const FUENTE: Record<CampoPlantilla['fuente'], { texto: string; clase: string }> = {
    modelo: { texto: 'Iurexia', clase: 'bg-[#f3e8cc] text-[#6b5530]' },
    marcador: { texto: 'Ya marcado', clase: 'bg-piedra-100 text-piedra-700' },
    raya: { texto: 'Ya marcado', clase: 'bg-piedra-100 text-piedra-700' },
    manual: { texto: 'Tuyo', clase: 'bg-charcoal-900 text-[#e3c994]' },
}

/** Cómo se ve el campo en el documento, para reconocerlo en la lista. */
function muestraDe(c: CampoPlantilla): string {
    const t = c.textos[0] ?? ''
    if (c.fuente === 'raya') {
        const antes = (c.antes ?? '').slice(-28).trimStart()
        const despues = (c.despues ?? '').slice(0, 28).trimEnd()
        return `${antes.length < (c.antes ?? '').length ? '…' : ''}${antes}${t}${despues}${despues.length < (c.despues ?? '').length ? '…' : ''}`
    }
    if (c.fuente === 'marcador') return t
    return `«${c.ejemplo || t}»`
}

export default function RevisionCampos({ plantilla, vista, aviso, revisadaPorIurexia, onCerrar, onGuardada }: Props) {
    const [montado, setMontado] = useState(false)
    const [campos, setCampos] = useState<CampoEnRevision[]>(() => plantilla.campos.map((c) => ({ ...c, aceptado: true })))
    const [nombre, setNombre] = useState(plantilla.nombre)
    const [activo, setActivo] = useState<string | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [nota, setNota] = useState<string | null>(null)
    const [panel, setPanel] = useState<'documento' | 'campos'>('documento')
    const [seleccion, setSeleccion] = useState<{ texto: string; x: number; y: number } | null>(null)
    const [cambiado, setCambiado] = useState(false)
    const lienzoRef = useRef<HTMLDivElement | null>(null)
    const ordinal = useRef<Record<string, number>>({})
    const nuevoRef = useRef<string | null>(null)
    // El campo que se acaba de marcar: su nombre se escribe enseguida.
    const [recien, setRecien] = useState<string | null>(null)

    useEffect(() => { setMontado(true) }, [])

    // La página de atrás no se desplaza mientras la revisión la tapa.
    useEffect(() => {
        const previo = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = previo }
    }, [])

    const salir = useCallback(() => {
        if (cambiado && !window.confirm('Saldrás sin guardar los cambios de los campos. ¿Continuar?')) return
        onCerrar()
    }, [cambiado, onCerrar])

    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') salir() }
        window.addEventListener('keydown', alTeclear)
        return () => window.removeEventListener('keydown', alTeclear)
    }, [salir])

    // ── El documento con los campos en oro ────────────────────────────────
    const cuerpo = useMemo(() => resaltar(vista.html, campos, activo), [vista.html, campos, activo])
    const encabezado = useMemo(() => resaltar(parrafosAHtml(vista.encabezados), campos, activo), [vista.encabezados, campos, activo])
    const pie = useMemo(() => resaltar(parrafosAHtml(vista.pies), campos, activo), [vista.pies, campos, activo])
    const vistas = useMemo(() => ({
        cuerpo: { __html: cuerpo.html || '<p><em>El documento no tiene texto que se pueda mostrar.</em></p>' },
        encabezado: { __html: encabezado.html },
        pie: { __html: pie.html },
    }), [cuerpo.html, encabezado.html, pie.html])
    const cuentaDe = (clave: string) =>
        (cuerpo.cuenta.get(clave) ?? 0) + (encabezado.cuenta.get(clave) ?? 0) + (pie.cuenta.get(clave) ?? 0)

    const aceptados = campos.filter((c) => c.aceptado).length

    function cambiar(clave: string, cambio: Partial<CampoEnRevision>) {
        setCampos((prev) => prev.map((c) => (c.clave === clave ? { ...c, ...cambio } : c)))
        setCambiado(true)
    }

    /** Lleva el documento a la siguiente aparición del campo y la hace parpadear. */
    function verEnDocumento(clave: string) {
        setActivo(clave)
        setPanel('documento')
        window.requestAnimationFrame(() => {
            const marcas = Array.from(lienzoRef.current?.querySelectorAll<HTMLElement>(`mark[data-campo="${clave}"]`) ?? [])
            if (!marcas.length) { setNota('Este campo no se ve en la vista previa (está en una nota al pie o dentro de otro campo).'); return }
            const i = (ordinal.current[clave] ?? -1) + 1
            ordinal.current[clave] = i % marcas.length
            const m = marcas[i % marcas.length]
            m.scrollIntoView({ block: 'center', behavior: 'smooth' })
            m.animate?.([{ boxShadow: '0 0 0 6px rgba(201,169,98,0.55)' }, { boxShadow: '0 0 0 0 rgba(201,169,98,0)' }], { duration: 900, easing: 'ease-out' })
        })
    }

    function alPulsarDocumento(e: React.MouseEvent<HTMLDivElement>) {
        const marca = (e.target as HTMLElement).closest('mark[data-campo]') as HTMLElement | null
        if (!marca) return
        const clave = marca.getAttribute('data-campo')
        if (!clave) return
        setActivo(clave)
        window.requestAnimationFrame(() => document.getElementById(`campo-${clave}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
    }

    // ── Marcar un campo seleccionando texto ───────────────────────────────
    useEffect(() => {
        let reloj: number | null = null
        const revisar = () => {
            if (reloj) window.clearTimeout(reloj)
            reloj = window.setTimeout(() => {
                const s = seleccionComoCampo(lienzoRef.current)
                if (!s) { setSeleccion(null); return }
                const arriba = s.rect.top > 70
                setSeleccion({ texto: s.texto, x: s.rect.left + s.rect.width / 2, y: arriba ? s.rect.top - 44 : s.rect.bottom + 8 })
            }, 120)
        }
        const esconder = () => setSeleccion(null)
        document.addEventListener('selectionchange', revisar)
        const lienzo = lienzoRef.current
        lienzo?.addEventListener('scroll', esconder, { passive: true })
        return () => {
            if (reloj) window.clearTimeout(reloj)
            document.removeEventListener('selectionchange', revisar)
            lienzo?.removeEventListener('scroll', esconder)
        }
    }, [])

    function agregarSeleccion() {
        if (!seleccion) return
        const texto = seleccion.texto
        const igual = campos.find((c) => c.textos.some((t) => t.trim().toLocaleLowerCase('es-MX') === texto.toLocaleLowerCase('es-MX')))
        window.getSelection()?.removeAllRanges()
        setSeleccion(null)
        if (igual) {
            cambiar(igual.clave, { aceptado: true })
            setActivo(igual.clave)
            setNota(`Eso ya es el campo «${igual.etiqueta}».`)
            return
        }
        const usadas = new Set(campos.map((c) => c.clave))
        const clave = claveUnica(`dato_${campos.length + 1}`, usadas)
        const nuevo: CampoEnRevision = {
            clave, etiqueta: '', origen: 'manual', ejemplo: texto, textos: [texto], fuente: 'manual', apariciones: 0, aceptado: true,
        }
        nuevoRef.current = clave
        setRecien(clave)
        setCampos((prev) => [...prev, nuevo])
        setActivo(clave)
        setCambiado(true)
        setPanel('campos')
    }

    // El campo recién marcado pide su nombre de inmediato.
    useEffect(() => {
        const clave = nuevoRef.current
        if (!clave) return
        nuevoRef.current = null
        /* Con el ratón, el clic en «Marcar como campo» termina después de que
           el campo nuevo existe: se enfoca en el siguiente cuadro y, si algo se
           lleva el foco, otra vez un momento después. */
        const enfocar = () => {
            const entrada = document.getElementById(`etiqueta-${clave}`) as HTMLInputElement | null
            if (!entrada || document.activeElement === entrada) return
            entrada.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            entrada.focus({ preventScroll: true })
        }
        window.requestAnimationFrame(enfocar)
        const otra = window.setTimeout(enfocar, 260)
        if (cuentaDe(clave) === 0) setNota('Ese texto ya es parte de otro campo más largo: se llenará con aquél.')
        return () => window.clearTimeout(otra)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campos])

    useEffect(() => {
        if (!nota) return
        const t = window.setTimeout(() => setNota(null), 4200)
        return () => window.clearTimeout(t)
    }, [nota])

    async function guardar() {
        // Los que marcó el abogado llevan una clave provisional («dato_11»): el
        // servidor la rehace con su nombre («abogado_autorizado»).
        const elegidos: CampoPlantilla[] = campos.filter((c) => c.aceptado).map(({ aceptado: _a, ...c }, i) => ({
            ...c,
            clave: c.fuente === 'manual' && c.clave.startsWith('dato_') && c.etiqueta.trim() ? '' : c.clave,
            etiqueta: c.etiqueta.trim() || `Dato ${i + 1}`,
        }))
        if (elegidos.length === 0) { setError('Deja al menos un campo: sin campos, la plantilla siempre saldría igual.'); return }
        setGuardando(true)
        setError(null)
        try {
            const r = await guardarCampos(plantilla.id, elegidos)
            let p = r.plantilla
            const limpio = nombre.replace(/\s+/g, ' ').trim()
            if (limpio && limpio !== plantilla.nombre) p = await cambiarPlantilla(plantilla.id, { nombre: limpio })
            onGuardada(p, r.descartados ?? [])
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar la plantilla.')
        } finally {
            setGuardando(false)
        }
    }

    const activoCampo = campos.find((c) => c.clave === activo) ?? null

    if (!montado) return null
    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Revisión de campos" className="fixed inset-0 z-50 flex flex-col bg-[#efe9dc]">
            {/* ── Cabecera ─────────────────────────────────────────────── */}
            <header className="grid h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-charcoal-900/10 bg-cream-100 px-2 sm:gap-4 sm:px-5">
                <button type="button" onClick={salir}
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-charcoal-900/75 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Mis plantillas</span>
                </button>
                <div className="min-w-0 text-center">
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-accent-brown">Revisión de campos</p>
                    <input
                        value={nombre}
                        onChange={(e) => { setNombre(e.target.value); setCambiado(true) }}
                        aria-label="Nombre de la plantilla"
                        className="mx-auto mt-0.5 block w-full max-w-[460px] truncate rounded-md bg-transparent px-2 py-0.5 text-center font-serif text-[17px] text-charcoal-900 outline-none hover:bg-charcoal-900/[0.04] focus:bg-white focus:ring-1 focus:ring-accent-gold/60"
                    />
                </div>
                <button type="button" onClick={() => void guardar()} disabled={guardando} className={BOTON}>
                    {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-accent-gold" />}
                    <span className="hidden sm:inline">Guardar la plantilla</span>
                    <span className="sm:hidden">Guardar</span>
                </button>
            </header>

            {aviso || error ? (
                <div className={`flex shrink-0 items-start gap-2 px-4 py-2.5 text-[12.5px] sm:px-6 ${error ? 'bg-red-50 text-red-800' : 'bg-[#f6eedb] text-[#5c4a2a]'}`}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="flex-1">{error || aviso}</span>
                    {error ? <button type="button" onClick={() => setError(null)} aria-label="Cerrar el aviso" className="rounded p-0.5 hover:bg-red-100"><X className="h-4 w-4" /></button> : null}
                </div>
            ) : null}

            {/* En el teléfono, documento y campos se alternan. */}
            <div className="flex shrink-0 gap-1 border-b border-charcoal-900/10 bg-cream-100/70 p-1.5 lg:hidden" role="tablist">
                {(['documento', 'campos'] as const).map((p) => (
                    <button key={p} type="button" role="tab" aria-selected={panel === p} onClick={() => setPanel(p)}
                        className={`h-9 flex-1 rounded-lg text-[13px] font-semibold transition ${panel === p ? 'bg-charcoal-900 text-white' : 'text-charcoal-900/70 hover:bg-charcoal-900/5'}`}>
                        {p === 'documento' ? 'Documento' : `Campos · ${aceptados}`}
                    </button>
                ))}
            </div>

            <div className="flex min-h-0 flex-1">
                {/* ── El documento ─────────────────────────────────────── */}
                <section ref={lienzoRef} aria-label="Vista previa del documento"
                    className={`min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-4 sm:px-8 sm:pt-7 ${panel === 'documento' ? '' : 'hidden lg:block'}`}>
                    <p className="mx-auto mb-3 flex max-w-[816px] items-start gap-2 text-[12.5px] leading-snug text-piedra-600">
                        <Highlighter className="mt-0.5 h-4 w-4 shrink-0 text-accent-brown" />
                        <span>Lo que está en oro se llenará cada vez que uses la plantilla. ¿Falta algo? Selecciona ese texto en el documento y márcalo como campo.</span>
                    </p>
                    <div className="mx-auto w-full max-w-[816px] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.06),0_18px_44px_-18px_rgba(20,18,16,0.28)] ring-1 ring-charcoal-900/[0.06]">
                        {vista.encabezados.length ? (
                            <div className="border-b border-dashed border-charcoal-900/15 px-[9%] pb-2 pt-5">
                                <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-piedra-400">Encabezado</p>
                                <div onClick={alPulsarDocumento} className="hoja-escrito !text-[13px] !leading-snug text-piedra-700 [&_p]:!mb-1" dangerouslySetInnerHTML={vistas.encabezado} />
                            </div>
                        ) : null}
                        <div onClick={alPulsarDocumento}
                            className="hoja-escrito min-h-[60vh] px-[9.3%] pb-[9%] pl-[13.9%] pt-[9%]"
                            dangerouslySetInnerHTML={vistas.cuerpo} />
                        {vista.pies.length ? (
                            <div className="border-t border-dashed border-charcoal-900/15 px-[9%] pb-4 pt-2">
                                <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-piedra-400">Pie de página</p>
                                <div onClick={alPulsarDocumento} className="hoja-escrito !text-[13px] !leading-snug text-piedra-700 [&_p]:!mb-1" dangerouslySetInnerHTML={vistas.pie} />
                            </div>
                        ) : null}
                    </div>
                </section>

                {/* ── Los campos ───────────────────────────────────────── */}
                <aside aria-label="Campos de la plantilla"
                    className={`min-h-0 w-full shrink-0 flex-col border-l border-charcoal-900/10 bg-[#fbf8f1] lg:flex lg:w-[400px] ${panel === 'campos' ? 'flex' : 'hidden'}`}>
                    <div className="shrink-0 border-b border-charcoal-900/10 px-5 pb-4 pt-5">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-brown">Campos</p>
                        <h2 className="mt-1 font-serif text-[21px] leading-tight text-charcoal-900">
                            {aceptados} {aceptados === 1 ? 'dato se llenará' : 'datos se llenarán'}
                        </h2>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-piedra-600">
                            {revisadaPorIurexia
                                ? 'Iurexia leyó tu documento y propone estos datos. Quita lo que no cambie de un asunto a otro y dile a cada uno de dónde sale.'
                                : 'Éstos son los huecos que tu plantilla ya traía. Quita lo que no cambie y dile a cada uno de dónde sale.'}
                        </p>
                    </div>
                    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                        {campos.length === 0 ? (
                            <li className="rounded-xl border border-dashed border-[#d6ccb8] bg-white/70 px-4 py-6 text-center text-[13px] leading-relaxed text-piedra-600">
                                No se encontraron datos variables. Selecciona en el documento lo que cambia de un asunto a otro —el nombre del cliente, el expediente, una fecha— y márcalo como campo.
                            </li>
                        ) : null}
                        {campos.map((c) => {
                            const n = cuentaDe(c.clave) || c.apariciones
                            const fuente = FUENTE[c.fuente]
                            const esActivo = activo === c.clave
                            return (
                                <li key={c.clave} id={`campo-${c.clave}`}
                                    onClick={() => setActivo(c.clave)}
                                    className={`rounded-xl bg-white p-3 transition ${esActivo ? 'shadow-[0_10px_26px_-18px_rgba(17,17,17,0.5)] ring-2 ring-accent-gold' : 'ring-1 ring-charcoal-900/10 hover:ring-charcoal-900/20'} ${c.aceptado ? '' : 'bg-white/60'}`}>
                                    <div className="flex items-start gap-2.5">
                                        <button type="button" role="checkbox" aria-checked={c.aceptado}
                                            aria-label={c.aceptado ? `Quitar «${c.etiqueta || 'campo'}»` : `Volver a poner «${c.etiqueta || 'campo'}»`}
                                            onClick={(e) => { e.stopPropagation(); cambiar(c.clave, { aceptado: !c.aceptado }) }}
                                            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md transition ${c.aceptado ? 'bg-charcoal-900 text-[#e3c994]' : 'bg-white text-transparent ring-1 ring-charcoal-900/25 hover:ring-charcoal-900/45'}`}>
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <input
                                                id={`etiqueta-${c.clave}`}
                                                autoFocus={c.clave === recien}
                                                value={c.etiqueta}
                                                onChange={(e) => cambiar(c.clave, { etiqueta: e.target.value.slice(0, 60) })}
                                                onFocus={() => setActivo(c.clave)}
                                                placeholder="¿Qué dato es? (p. ej. «Nombre del actor»)"
                                                aria-label="Nombre del campo"
                                                className={`-mx-1 w-[calc(100%+0.5rem)] rounded-md bg-transparent px-1 py-0.5 text-[13.5px] font-semibold outline-none placeholder:font-normal placeholder:text-piedra-400 hover:bg-[#faf6ee] focus:bg-[#faf6ee] focus:ring-1 focus:ring-accent-gold/60 ${c.aceptado ? 'text-charcoal-900' : 'text-piedra-500 line-through decoration-piedra-300'}`}
                                            />
                                            <p className="mt-0.5 truncate text-[12px] text-piedra-500" title={muestraDe(c)}>{muestraDe(c)}</p>
                                        </div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); verEnDocumento(c.clave) }}
                                            title={n === 1 ? 'Aparece una vez: verla en el documento' : `Aparece ${n} veces: ir a la siguiente`}
                                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#f3e8cc] px-2 text-[11px] font-semibold tabular-nums text-[#6b5530] ring-1 ring-[#c9a962]/30 transition hover:bg-[#ecdcb4]">
                                            <Eye className="h-3.5 w-3.5" /> {n}
                                        </button>
                                    </div>
                                    {c.aceptado ? (
                                        <div className="mt-2.5 flex items-center gap-2 pl-[30px]">
                                            <label htmlFor={`origen-${c.clave}`} className="shrink-0 text-[11px] text-piedra-500">Se llena con</label>
                                            <select id={`origen-${c.clave}`} value={c.origen}
                                                onChange={(e) => cambiar(c.clave, { origen: e.target.value as OrigenCampo })}
                                                className="h-7 min-w-0 flex-1 rounded-md border border-charcoal-900/10 bg-[#fbf8f1] px-1.5 text-base text-charcoal-900 [@media(pointer:fine)]:text-[12px]">
                                                <option value="manual">Lo escribo cada vez</option>
                                                <optgroup label="De la carpeta del cliente">
                                                    {ORIGENES.filter((o) => o.grupo === 'carpeta').map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                                                </optgroup>
                                                <optgroup label="La fecha">
                                                    {ORIGENES.filter((o) => o.grupo === 'fecha').map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                                                </optgroup>
                                            </select>
                                            <span className={`shrink-0 rounded-full px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide ${fuente.clase}`}>
                                                {c.fuente === 'modelo' ? <Sparkles className="-mt-px mr-0.5 inline h-2.5 w-2.5" /> : null}{fuente.texto}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="mt-1.5 pl-[30px] text-[11.5px] italic text-piedra-500">Se queda como está en el documento.</p>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </aside>
            </div>

            {/* En el teléfono, el campo que se tocó en el documento, sin cambiar de pestaña. */}
            {activoCampo && panel === 'documento' ? (
                <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 lg:hidden">
                    <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-charcoal-900 py-1.5 pl-4 pr-1.5 text-[13px] text-white shadow-xl">
                        <span className="min-w-0 truncate font-medium">{activoCampo.etiqueta || 'Campo nuevo'}</span>
                        <button type="button" onClick={() => cambiar(activoCampo.clave, { aceptado: !activoCampo.aceptado })}
                            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#e3c994] transition hover:bg-white/20">
                            {activoCampo.aceptado ? 'Quitar' : 'Volver a poner'}
                        </button>
                        <button type="button" onClick={() => { setPanel('campos'); window.requestAnimationFrame(() => document.getElementById(`campo-${activoCampo.clave}`)?.scrollIntoView({ block: 'center' })) }}
                            className="shrink-0 rounded-full bg-[#f3e4c8] px-3 py-1.5 text-[12px] font-semibold text-[#171614] transition hover:bg-white">
                            Editar
                        </button>
                    </div>
                </div>
            ) : null}

            {seleccion ? (
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={agregarSeleccion}
                    style={{ left: Math.min(Math.max(seleccion.x, 90), window.innerWidth - 90), top: Math.max(8, seleccion.y) }}
                    className="fixed z-[60] inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-charcoal-900 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] ring-1 ring-[#c9a962]/50 transition hover:bg-charcoal-800">
                    <Plus className="h-4 w-4 text-accent-gold" /> Marcar como campo
                </button>
            ) : null}

            <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[56] flex justify-center px-4 lg:bottom-6">
                {nota ? (
                    <div className="flex max-w-md items-center gap-2 rounded-full bg-charcoal-900 px-4 py-2.5 text-[13px] text-white shadow-lg">
                        <Check className="h-4 w-4 shrink-0 text-accent-gold" /> <span>{nota}</span>
                    </div>
                ) : null}
            </div>
        </div>,
        document.body,
    )
}
