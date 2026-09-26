/**
 * DEL TEXTO DEL CHAT A LA HOJA DEL CONSTRUCTOR.
 *
 * El chat devuelve markdown con sus marcadores de control (pasos, metadatos de
 * citas, razonamiento, identificadores de documento). En el editor sólo debe
 * entrar el escrito: esto limpia lo interno y convierte el markdown en el HTML
 * que la hoja edita y que `exportarDocx` sabe leer.
 *
 * SE ESCAPA PRIMERO Y SE MARCA DESPUÉS, como en SwitchMyAI: el texto de un
 * modelo nunca entra como HTML.
 */

import { MARCADORES_CON_IDS, expandirCitasAgrupadas, quitarBloques, sinComentarios, sinMarcadorAbiertoAlFinal } from '@/lib/idsDeCita'

const RUBROS_DE_ESCRITO = /^(PROEMIO|HECHOS|PRESTACIONES|PRETENSIONES|DERECHO|FUNDAMENTOS DE DERECHO|CONSIDERACIONES DE DERECHO|CONCEPTOS DE VIOLACI[ÓO]N|AGRAVIOS|PRUEBAS|OFRECIMIENTO DE PRUEBAS|PUNTOS PETITORIOS|PETITORIOS|COMPETENCIA|V[ÍI]A|PERSONALIDAD|PROTESTO LO NECESARIO|PROTESTAMOS LO NECESARIO|ACTOS RECLAMADOS|AUTORIDADES RESPONSABLES|ANTECEDENTES|CAP[ÍI]TULO DE [A-ZÁÉÍÓÚÑ ]+|[A-ZÁÉÍÓÚÑ ]{4,40})\s*[:.]?$/

const ABRE_RAZON = '<!--thinking-->';
const CIERRA_RAZON = '<!--/thinking-->';
/** Los marcadores que pueden quedar partidos al final del texto que llega:
 *  los del razonamiento y los que traen identificadores. Un «<!--» del
 *  modelo no es ninguno de ellos y no se toca (`sinMarcadorAbiertoAlFinal`). */
const MARCADORES_PARTIBLES: readonly string[] = ['thinking', '/thinking', 'THINKING_START', 'THINKING_END', ...MARCADORES_CON_IDS]

/**
 * EL RAZONAMIENTO NO ENTRA AL ESCRITO, NI A MEDIAS. El chat lo transmite en vivo
 * con `<!--thinking-->` delante de cada fragmento y lo cierra con
 * `<!--/thinking-->` (ver `ThinkingParser` en useChat). Mientras el cierre no
 * ha llegado, TODO lo que sigue es razonamiento: quitar sólo los bloques
 * cerrados dejaba el análisis interno del modelo, en inglés, en la hoja.
 */
export function sinRazonamiento(texto: string): string {
    let out = '';
    let i = 0;
    const t = texto || '';
    while (i < t.length) {
        const abre = t.indexOf(ABRE_RAZON, i);
        if (abre === -1) { out += t.slice(i); break; }
        out += t.slice(i, abre);
        const cierra = t.indexOf(CIERRA_RAZON, abre + ABRE_RAZON.length);
        if (cierra === -1) return out;           // sigue razonando: se descarta el resto
        i = cierra + CIERRA_RAZON.length;
    }
    return sinMarcadorAbiertoAlFinal(out, MARCADORES_PARTIBLES);   // un marcador partido al final
}

/** Sin los espacios y tabuladores que quedan antes de cada salto de línea:
 *  `t.replace(/[ \t]+\n/g, '\n')`, pero sin volver a recorrer la racha desde
 *  cada uno de sus caracteres cuando no la sigue un salto (cuadrático: 20.000
 *  espacios tardaban 0,3 s). */
function sinBlancosAlFinalDelRenglon(t: string): string {
    const renglones = t.split('\n')
    for (let k = 0; k < renglones.length - 1; k++) {
        const r = renglones[k]
        let fin = r.length
        while (fin > 0 && (r[fin - 1] === ' ' || r[fin - 1] === '\t')) fin--
        if (fin < r.length) renglones[k] = r.slice(0, fin)
    }
    return renglones.join('\n')
}

export function limpiarMarcadores(texto: string): string {
    // Tiempo lineal (26-sep-2026): los comentarios con `sinComentarios` (un
    // escáner) y los corchetes con contenido acotado que no cruza otro «[» ni
    // otro «(». Ver las reglas en `@/lib/idsDeCita`.
    const sinMarcas = sinComentarios(expandirCitasAgrupadas(sinRazonamiento(texto || '')))
        // Lo agrupado se abre antes en singulares (`@/lib/idsDeCita`), y los
        // restos con etiqueta —singulares, plurales o entre paréntesis— se van:
        // «[Doc IDs: …]» no casaba con `Doc ID:` y quedaba a la vista. Sin
        // cruzar renglones ni marcas de cita ⟦…⟧: un corchete sin cerrar se
        // llevaba lo que viniera en el siguiente, citas incluidas.
        .replace(/\[[ \t]{0,8}Doc[ \t]{0,8}IDs?[ \t]{0,8}:[^[\]\n⟦]{0,2000}\]/gi, '')
        .replace(/\([ \t]{0,8}Doc[ \t]{0,8}IDs?[ \t]{0,8}:[^()\n⟦]{0,2000}\)/gi, '')
        .replace(/⟦\d{1,9}⟧/g, '')
    return sinBlancosAlFinalDelRenglon(sinMarcas)
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

export function escapar(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function enLinea(s: string): string {
    return escapar(s)
        .replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>')
        .replace(/__([^_]+?)__/g, '<b>$1</b>')
        .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1<i>$2</i>')
        .replace(/`([^`]+)`/g, '$1')
}

/* Viñeta, número y título: el prefijo acaba en `\s+` y lo que sigue no puede
   llevar un fin de línea. Con `^[-*•]\s+(.*)$` y un «\r» a mitad del
   renglón, `\s+` se desandaba carácter a carácter y `.*` volvía a recorrer
   el resto cada vez (cuadrático). Con el prefijo aparte, `\s+` toma la racha
   entera de una vez y el resto se mira una sola vez: el resultado es el
   mismo, porque ceder espacios a `.*` no quita el fin de línea del resto. */
const VINETA = /^[-*•]\s+/
const NUMERO = /^(\d+)[.)]\s+/
const TITULO = /^(#{1,6})\s+/
const FIN_DE_LINEA = /[\n\r\u2028\u2029]/

function conPrefijo(t: string, prefijo: RegExp): { m: RegExpExecArray; resto: string } | null {
    const m = prefijo.exec(t)
    if (!m) return null
    const resto = t.slice(m[0].length)
    return FIN_DE_LINEA.test(resto) ? null : { m, resto }
}

/** Markdown del chat → HTML de la hoja. */
export function markdownAHtml(md: string): string {
    const lineas = limpiarMarcadores(md).split('\n')
    const recortadas = lineas.map((l) => l.trim())
    const out: string[] = []
    let parrafo: string[] = []
    let lista: { tipo: 'ul' | 'ol'; items: string[]; inicio: number } | null = null
    let cita: string[] = []

    const cerrarParrafo = () => {
        if (parrafo.length) out.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`)
        parrafo = []
    }
    const cerrarLista = () => {
        if (lista) {
            const inicio = lista.tipo === 'ol' && lista.inicio > 1 ? ` start="${lista.inicio}"` : ''
            out.push(`<${lista.tipo}${inicio}>${lista.items.map((i) => `<li>${enLinea(i)}</li>`).join('')}</${lista.tipo}>`)
        }
        lista = null
    }
    const cerrarCita = () => {
        if (cita.length) out.push(`<blockquote>${cita.map(enLinea).join('<br>')}</blockquote>`)
        cita = []
    }
    const cerrarTodo = () => { cerrarParrafo(); cerrarLista(); cerrarCita() }

    /* El siguiente renglón no vacío, calculado una vez por racha de renglones
       en blanco: buscarlo desde cada uno recorría la racha otra vez. */
    let siguiente = 0
    for (let k = 0; k < lineas.length; k++) {
        const t = recortadas[k]
        if (t === '') {
            /* UNA LÍNEA EN BLANCO ENTRE «1.» Y «2.» NO CIERRA LA LISTA. Es como
               escribe un modelo los HECHOS; cerrarla dejaba cada hecho en su
               propio `<ol>` y todos salían como «1.». */
            if (siguiente <= k) {
                siguiente = k + 1
                while (siguiente < lineas.length && recortadas[siguiente] === '') siguiente++
            }
            const sigue = siguiente < lineas.length ? recortadas[siguiente] : ''
            if (lista && ((lista.tipo === 'ol' && conPrefijo(sigue, NUMERO)) || (lista.tipo === 'ul' && conPrefijo(sigue, VINETA)))) {
                cerrarParrafo(); cerrarCita()
                continue
            }
            cerrarTodo(); continue
        }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { cerrarTodo(); continue }

        const h = conPrefijo(t, TITULO)
        if (h) {
            cerrarTodo()
            const nivel = Math.min(3, h.m[1].length)
            out.push(`<h${nivel}>${enLinea(h.resto.replace(/\*\*/g, ''))}</h${nivel}>`)
            continue
        }
        // «**HECHOS**» o «HECHOS:» solo en su renglón: es un rubro del escrito.
        const soloNegrita = /^\*\*([^*]+)\*\*:?$/.exec(t)
        const rubro = (soloNegrita ? soloNegrita[1] : t).trim()
        if ((soloNegrita || rubro === rubro.toUpperCase()) && rubro.length <= 60 && RUBROS_DE_ESCRITO.test(rubro) && /[A-ZÁÉÍÓÚÑ]{3}/.test(rubro)) {
            cerrarTodo()
            out.push(`<h2>${escapar(rubro.replace(/[:.]$/, ''))}</h2>`)
            continue
        }
        if (/^>\s?/.test(t)) {
            cerrarParrafo(); cerrarLista()
            cita.push(t.replace(/^>\s?/, ''))
            continue
        }
        const vi = conPrefijo(t, VINETA)
        const nu = conPrefijo(t, NUMERO)
        if (vi || nu) {
            cerrarParrafo(); cerrarCita()
            const tipo = vi ? 'ul' : 'ol'
            if (!lista || lista.tipo !== tipo) { cerrarLista(); lista = { tipo, items: [], inicio: nu ? parseInt(nu.m[1], 10) || 1 : 1 } }
            lista.items.push(vi ? vi.resto : nu!.resto)
            continue
        }
        cerrarLista(); cerrarCita()
        parrafo.push(t)
    }
    cerrarTodo()
    return out.join('')
}

/**
 * Texto plano del documento (para mandarlo a revisar).
 *
 * SE RECORRE EL ÁRBOL, NO UNA LISTA DE ETIQUETAS. Lo que el abogado escribe a
 * mano llega como texto suelto en la raíz o en `<div>`, y leer sólo
 * `p, h1…h3, li` lo dejaba fuera: Revisar contestaba «el documento es muy
 * corto» con páginas escritas. Y con `textContent`, no `innerText`: en
 * teléfono la hoja está oculta tras su pestaña, y `innerText` de algo oculto
 * devuelve vacío.
 */
export function textoDeHtml(raiz: HTMLElement): string {
    const partes: string[] = []
    let suelto = ''
    const volcar = () => { const t = suelto.replace(/[ \t]+\n/g, '\n').trim(); if (t) partes.push(t); suelto = '' }
    const textoDe = (n: Node): string => {
        if (n.nodeType === 3) return n.textContent || ''
        if (!(n instanceof HTMLElement)) return ''
        if (n.tagName === 'BR') return '\n'
        return Array.from(n.childNodes).map(textoDe).join('')
    }
    const BLOQUE = /^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|TABLE|SECTION|ARTICLE|HR)$/
    const recorrer = (padre: Node) => {
        for (const n of Array.from(padre.childNodes)) {
            if (n instanceof HTMLElement && (n.tagName === 'UL' || n.tagName === 'OL')) {
                volcar()
                const base = parseInt(n.getAttribute('start') || '1', 10) || 1
                Array.from(n.children).forEach((li, i) => {
                    const t = textoDe(li).trim()
                    if (t) partes.push(n.tagName === 'OL' ? `${base + i}. ${t}` : `- ${t}`)
                })
            } else if (n instanceof HTMLElement && BLOQUE.test(n.tagName)) {
                volcar()
                if (n.tagName === 'DIV' && n.querySelector('p,div,h1,h2,h3,ul,ol,blockquote,table')) recorrer(n)
                else { const t = textoDe(n).trim(); if (t) partes.push(t) }
            } else {
                suelto += textoDe(n)
            }
        }
        volcar()
    }
    recorrer(raiz)
    return partes.join('\n\n')
}

/**
 * LAS TARJETAS HTML DEL CHAT, FUERA DEL ESCRITO.
 *
 * Al final de la respuesta el chat pega en HTML la tarjeta «Doctrina
 * consultada» (doctrina.py) y la de fuentes web, con clases `fuentes-web`/`fw-*`.
 * Aquí el markdown se escapa, así que en la hoja salían «</div></div>» como
 * texto. Se sacan como lista legible —obra, editorial y página— para las notas.
 * Una tarjeta a medio llegar (streaming) se corta desde donde empieza.
 */
/* Con escáneres y no con `[\s\S]*?` (26-sep-2026): la expresión de antes
   —dos perezosos anidados— volvía a recorrer el texto desde cada apertura sin
   cierre. Hacen lo mismo que ella; ver las reglas en `@/lib/idsDeCita`. */
const ABRE_TARJETA = '<div class="fuentes-web">'
const CIERRA_DIV = '</div>'
const CIERRA_SPAN = '</span>'
const esBlanco = (c: string | undefined) => c !== undefined && /\s/.test(c)

/** El final de «</div>\s*</div>» en el primer «</div>» desde `desde` que lo
 *  cumpla, o -1. */
function finDeDobleCierre(t: string, desde: number): number {
    for (let c = t.indexOf(CIERRA_DIV, desde); c !== -1; c = t.indexOf(CIERRA_DIV, c + CIERRA_DIV.length)) {
        let k = c + CIERRA_DIV.length
        while (esBlanco(t[k])) k++
        if (t.startsWith(CIERRA_DIV, k)) return k + CIERRA_DIV.length
    }
    return -1
}

/** Cada tarjeta completa, fuera del texto: lo mismo que
 *  `t.replace(/<div class="fuentes-web">[\s\S]*?<div class="fw-nota">[\s\S]*?<\/div>\s*<\/div>/g, …)`. */
function sacarTarjetas(t: string, alSacar: (bloque: string) => void): string {
    let out = ''
    let i = 0
    for (;;) {
        const p = t.indexOf(ABRE_TARJETA, i)
        if (p === -1) break
        const q = t.indexOf('<div class="fw-nota">', p + ABRE_TARJETA.length)
        if (q === -1) break
        const fin = finDeDobleCierre(t, q + '<div class="fw-nota">'.length)
        if (fin === -1) break
        alSacar(t.slice(p, fin))
        out += t.slice(i, p)
        i = fin
    }
    return out + t.slice(i)
}

/** Lo que hay entre `abre` y el primer «</div>» que le sigue (`/abre([\s\S]*?)<\/div>/`). */
function dentroDeDiv(bloque: string, abre: string): string {
    const a = bloque.indexOf(abre)
    if (a === -1) return ''
    const b = bloque.indexOf(CIERRA_DIV, a + abre.length)
    return b === -1 ? '' : bloque.slice(a + abre.length, b)
}

/** Cada etiqueta, cambiada por un espacio: `s.replace(/<[^>]+>/g, ' ')`. */
function etiquetasAEspacios(s: string): string {
    let out = ''
    let i = 0
    for (;;) {
        const a = s.indexOf('<', i)
        if (a === -1) break
        const b = s.indexOf('>', a + 1)
        if (b === -1) break
        if (b === a + 1) { out += s.slice(i, b + 1); i = b + 1; continue }   // «<>» no es etiqueta
        out += s.slice(i, a) + ' '
        i = b + 1
    }
    return out + s.slice(i)
}

/** Título y dominio de cada fuente: los dos grupos de
 *  `/<span class="fw-tit">([\s\S]*?)<\/span>\s*<span class="fw-dom">([\s\S]*?)<\/span>/g`. */
function titulosYDominios(bloque: string): Array<[string, string]> {
    const TIT = '<span class="fw-tit">'
    const DOM = '<span class="fw-dom">'
    const pares: Array<[string, string]> = []
    let i = 0
    for (;;) {
        const p = bloque.indexOf(TIT, i)
        if (p === -1) break
        const desde = p + TIT.length
        let hallado = false
        for (let c = bloque.indexOf(CIERRA_SPAN, desde); c !== -1; c = bloque.indexOf(CIERRA_SPAN, c + CIERRA_SPAN.length)) {
            let k = c + CIERRA_SPAN.length
            while (esBlanco(bloque[k])) k++
            if (!bloque.startsWith(DOM, k)) continue
            const d = k + DOM.length
            const e = bloque.indexOf(CIERRA_SPAN, d)
            if (e === -1) return pares            // ni ésta ni las de después cierran
            pares.push([bloque.slice(desde, c), bloque.slice(d, e)])
            i = e + CIERRA_SPAN.length
            hallado = true
            break
        }
        if (!hallado) break
    }
    return pares
}

const decodificar = (s: string) => etiquetasAEspacios(s)
    .replace(/&#8599;/g, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

export function separarTarjetas(md: string): { sin: string; tarjetas: string; aviso: string } {
    let t = md || ''
    const listas: string[] = []
    let aviso = ''
    t = sacarTarjetas(t, (bloque) => {
        // La nota de la tarjeta avisa cuando una cita textual de doctrina no se pudo
        // verificar contra la obra: esa advertencia no se pierde con la tarjeta.
        // Es lo que casaba `/⚠️?\s*([\s\S]*no pudieron verificarse[\s\S]*)$/`:
        // desde el primer «⚠» que tenga la frase detrás.
        const nota = decodificar(dentroDeDiv(bloque, '<div class="fw-nota">'))
        const signo = nota.indexOf('⚠')
        if (signo !== -1 && nota.lastIndexOf('no pudieron verificarse') > signo) {
            let k = signo + 1
            if (nota[k] === '\uFE0F') k++
            while (esBlanco(nota[k])) k++
            aviso = nota.slice(k).trim()
        }
        const cab = decodificar(dentroDeDiv(bloque, '<div class="fw-cab">')).replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ]+/, '')
        const items = titulosYDominios(bloque)
            .map(([tit, dom]) => `- ${decodificar(tit)}${decodificar(dom) ? ` (${decodificar(dom)})` : ''}`)
        if (items.length) listas.push(`**${cab || 'Referencias consultadas'}**\n\n${items.join('\n')}`)
    })
    const abierta = t.indexOf(ABRE_TARJETA)
    if (abierta !== -1) t = t.slice(0, abierta)
    return { sin: t.replace(/\n{3,}/g, '\n\n').trimEnd(), tarjetas: listas.join('\n\n'), aviso }
}

/**
 * EL ESCRITO Y LA ESTRATEGIA, SEPARADOS.
 *
 * Los tres prompts de redacción del chat (demanda, amparo, impugnación)
 * terminan con «## ESTRATEGIA PROCESAL Y RECOMENDACIONES», «## ESTRATEGIA DEL
 * AMPARO» o «## ESTRATEGIA DE IMPUGNACIÓN»: tablas de fortaleza, probabilidad
 * de éxito y alternativas. En el chat es un buen consejo; en la hoja acababa
 * impreso dentro del Word que el abogado presenta. Aquí se corta en ese rubro
 * —y en la «evaluación de viabilidad» que alguno escribe antes— y lo de
 * después se enseña aparte.
 */
// SÓLO CON FORMA DE RUBRO Y EN MAYÚSCULAS (segunda revisión): un párrafo del escrito
// que empiece por «Estrategia procesal…» no puede mandar fuera todo lo que sigue.
// Se admite «FASE 3:», numeración romana o un emoji delante.
const RX_ESTRATEGIA = /^[ \t]*(?:#{1,3}[ \t]*)?(?:\*\*)?[ \t]*(?:[IVX]+\.[ \t]*|FASE[ \t]+\d+[ \t]*:[ \t]*|[^\sA-Za-zÁÉÍÓÚÑáéíóúñ0-9#*]{1,3}[ \t]*)?(?:ESTRATEGIA(?:[ \t]+(?:PROCESAL|DE[ \t]+IMPUGNACI[ÓO]N|DEL[ \t]+AMPARO))|(?:EVALUACI[ÓO]N|AN[ÁA]LISIS)[ \t]+DE[ \t]+VIABILIDAD)\b.*$/gm
const RX_CIERRE_ESCRITO = /^[ \t]*(?:#{1,3}[ \t]*)?(?:\*\*)?[ \t]*(?:PROTESTO|PROTESTAMOS|PUNTOS PETITORIOS|PETITORIOS)\b/gm

export function separarEstrategia(md: string): { escrito: string; estrategia: string } {
    const t = md || ''
    const candidatos = Array.from(t.matchAll(RX_ESTRATEGIA))
    if (!candidatos.length) return { escrito: t, estrategia: '' }
    // Si el escrito tiene su cierre, la estrategia es la que viene DESPUÉS de él.
    const cierres = Array.from(t.matchAll(RX_CIERRE_ESCRITO))
    const ultimoCierre = cierres.length ? cierres[cierres.length - 1].index ?? -1 : -1
    const m = candidatos.find((c) => (c.index ?? 0) > ultimoCierre) ?? (ultimoCierre === -1 ? candidatos[0] : null)
    if (!m || m.index === undefined) return { escrito: t, estrategia: '' }
    // Los separadores «---» o «═══» que van justo antes también se quedan fuera del escrito.
    const escrito = t.slice(0, m.index).replace(/(?:\n[ \t]*(?:-{3,}|\*{3,}|_{3,}|═{3,})[ \t]*)+\s*$/, '').trimEnd()
    return { escrito, estrategia: t.slice(m.index).trim() }
}

/**
 * ¿LO QUE DEVOLVIÓ EL CHAT ES UN ESCRITO, O UN AVISO?
 *
 * `/chat` no contesta con error HTTP cuando se acaban las consultas, la cuenta
 * está suspendida o falla la infraestructura: manda el aviso como texto dentro
 * del stream («❌ Has alcanzado tu límite…»). Tomar eso por la demanda
 * sustituía el documento entero por una línea. Y el aviso de respuesta
 * truncada («envía continúa») no tiene sentido dentro de la hoja.
 */
export function analizarRespuesta(bruto: string): { error: string | null; texto: string; truncada: boolean } {
    const crudo = bruto || ''
    if (/SUSCRIPCION_SUSPENDIDA/.test(crudo)) {
        return { error: 'Tu suscripción está suspendida por un cobro pendiente.', texto: '', truncada: false }
    }
    let limpio = limpiarMarcadores(crudo)
    const falla = /(^|\n)\s*❌\s*(.*)/.exec(limpio)
    if (falla) {
        const antes = limpio.slice(0, falla.index).trim()
        const mensaje = falla[2].replace(/\*\*/g, '').trim()
        // El aviso solo (corto, sin nada antes) o el de consulta fallida detrás
        // de un texto a medias: no hay escrito. Una revisión que usa ❌ como
        // viñeta es larga y sigue siendo respuesta.
        if ((!antes && limpio.length < 600) || /No pudimos completar/i.test(mensaje)) {
            const error = /consultas|l[íi]mite/i.test(mensaje) ? 'Se te acabaron las consultas de este periodo.'
                : /No pudimos completar/i.test(mensaje) ? 'No se pudo completar. No se te descontó la consulta: vuelve a intentarlo.'
                : (mensaje || 'No se pudo completar la consulta.')
            return { error, texto: '', truncada: false }
        }
    }
    let truncada = false
    const corte = /\n-{3,}\s*\n\s*⚠️\s*\*\*Respuesta truncada\*\*[\s\S]*$/.exec(limpio)
    if (corte) { limpio = limpio.slice(0, corte.index).trim(); truncada = true }
    return { error: null, texto: limpio, truncada }
}
