'use client'

/* El archivo del abogado, abierto en la página citada y con el pasaje
   resaltado. PDF: el mismo `VisorArticulo` de las leyes y la doctrina, pero
   leyendo la URL firmada DIRECTO (sin el proxy, que guarda en la CDN). Word:
   no tiene páginas de verdad; se enseña el texto de la «página» (~3,000
   caracteres) con la cita marcada. */

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

import { VisorArticulo } from '@/components/VisorArticulo'
import { abrirDocumento, paginasDe, type DocumentoBoveda } from '@/lib/boveda'

interface Props {
    docId: string
    pagina?: number | null
    /** El texto que se busca y se pinta: la cita literal o el fragmento. */
    pasaje?: string | null
    alto?: number
}

function sinAcentos(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Dónde está `aguja` en `texto`, tolerando acentos, mayúsculas y espacios. */
function ubicar(texto: string, aguja: string): [number, number] | null {
    const a = sinAcentos(aguja).replace(/\s+/g, ' ').trim()
    if (a.length < 8) return null
    // Mapa de la versión plana a la original, letra por letra.
    let plano = ''
    const mapa: number[] = []
    let espacio = false
    for (let i = 0; i < texto.length; i++) {
        const c = sinAcentos(texto[i])
        if (/\s/.test(c)) {
            if (espacio) continue
            espacio = true
            plano += ' '
            mapa.push(i)
            continue
        }
        espacio = false
        for (const ch of c) {
            plano += ch
            mapa.push(i)
        }
    }
    let i = plano.indexOf(a)
    let largo = a.length
    if (i < 0) {
        // Al menos el arranque de la cita (las primeras ~8 palabras).
        const corto = a.split(' ').slice(0, 8).join(' ')
        i = corto.length >= 12 ? plano.indexOf(corto) : -1
        largo = corto.length
    }
    if (i < 0) return null
    return [mapa[i], (mapa[i + largo - 1] ?? texto.length - 1) + 1]
}

export function VisorBoveda({ docId, pagina = null, pasaje = null, alto = 440 }: Props) {
    const [doc, setDoc] = useState<(DocumentoBoveda & { url: string }) | null>(null)
    const [textoPagina, setTextoPagina] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let vigente = true
        setDoc(null)
        setTextoPagina(null)
        setError(null)
        abrirDocumento(docId)
            .then(async (d) => {
                if (!vigente) return
                setDoc(d)
                if (d.aproximadas) {
                    const p = await paginasDe(docId)
                    if (vigente) setTextoPagina(p.paginas[Math.max(0, (pagina ?? 1) - 1)] ?? '')
                }
            })
            .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo abrir el documento.'))
        return () => { vigente = false }
    }, [docId, pagina])

    const marcado = useMemo(() => {
        if (textoPagina === null) return null
        const r = pasaje ? ubicar(textoPagina, pasaje) : null
        if (!r) return { antes: textoPagina, dentro: '', despues: '' }
        return { antes: textoPagina.slice(0, r[0]), dentro: textoPagina.slice(r[0], r[1]), despues: textoPagina.slice(r[1]) }
    }, [textoPagina, pasaje])

    if (error) {
        return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    }
    if (!doc) {
        return (
            <div className="flex items-center justify-center gap-2 text-sm text-charcoal-700/60" style={{ height: alto }}>
                <Loader2 className="h-4 w-4 animate-spin" /> Abriendo el documento…
            </div>
        )
    }
    if (doc.aproximadas) {
        return (
            <div className="flex flex-col" style={{ height: alto }}>
                <div className="flex items-center justify-between gap-2 border-b border-cream-400 bg-cream-100 px-3 py-2 text-[11px] text-charcoal-700/70">
                    <span>Word · página aproximada {pagina ?? 1} (~3,000 caracteres)</span>
                    <a href={doc.url} className="inline-flex items-center gap-1 underline hover:text-charcoal-900">
                        <ExternalLink className="h-3 w-3" /> Descargar
                    </a>
                </div>
                <div className="flex-1 overflow-y-auto whitespace-pre-wrap bg-white px-5 py-4 font-serif text-[13.5px] leading-relaxed text-charcoal-900">
                    {marcado === null ? (
                        <span className="flex items-center gap-2 text-sm text-charcoal-700/60">
                            <Loader2 className="h-4 w-4 animate-spin" /> Leyendo…
                        </span>
                    ) : (
                        <>
                            {marcado.antes}
                            {marcado.dentro ? (
                                <mark
                                    ref={(el) => el?.scrollIntoView({ block: 'center' })}
                                    className="rounded bg-accent-gold/40 px-0.5 text-charcoal-900">
                                    {marcado.dentro}
                                </mark>
                            ) : null}
                            {marcado.despues}
                        </>
                    )}
                </div>
            </div>
        )
    }
    return (
        <VisorArticulo
            url={doc.url}
            articulo={null}
            textoArticulo={pasaje || null}
            pasaje
            pagina={pagina}
            ancla={pasaje ? pasaje.split(/\s+/).slice(0, 15).join(' ') : null}
            rotuloParrafo={pagina ? `pasaje de la p. ${pagina}` : 'pasaje citado'}
            urlOriginal={doc.url}
            alto={alto}
        />
    )
}
