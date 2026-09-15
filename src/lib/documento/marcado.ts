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

const RUBROS_DE_ESCRITO = /^(PROEMIO|HECHOS|PRESTACIONES|PRETENSIONES|DERECHO|FUNDAMENTOS DE DERECHO|CONSIDERACIONES DE DERECHO|CONCEPTOS DE VIOLACI[ÓO]N|AGRAVIOS|PRUEBAS|OFRECIMIENTO DE PRUEBAS|PUNTOS PETITORIOS|PETITORIOS|COMPETENCIA|V[ÍI]A|PERSONALIDAD|PROTESTO LO NECESARIO|PROTESTAMOS LO NECESARIO|ACTOS RECLAMADOS|AUTORIDADES RESPONSABLES|ANTECEDENTES|CAP[ÍI]TULO DE [A-ZÁÉÍÓÚÑ ]+|[A-ZÁÉÍÓÚÑ ]{4,40})\s*[:.]?$/

const ABRE_RAZON = '<!--thinking-->';
const CIERRA_RAZON = '<!--/thinking-->';

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
    return out.replace(/<!--[^>]*$/, '');          // un marcador partido al final
}

export function limpiarMarcadores(texto: string): string {
    return sinRazonamiento(texto || '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\[\s*Doc\s*ID\s*:\s*[^\]]*\]/gi, '')
        .replace(/⟦\d+⟧/g, '')
        .replace(/[ \t]+\n/g, '\n')
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

/** Markdown del chat → HTML de la hoja. */
export function markdownAHtml(md: string): string {
    const lineas = limpiarMarcadores(md).split('\n')
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

    const VINETA = /^[-*•]\s+(.*)$/
    const NUMERO = /^(\d+)[.)]\s+(.*)$/
    for (let k = 0; k < lineas.length; k++) {
        const t = lineas[k].trim()
        if (t === '') {
            /* UNA LÍNEA EN BLANCO ENTRE «1.» Y «2.» NO CIERRA LA LISTA. Es como
               escribe un modelo los HECHOS; cerrarla dejaba cada hecho en su
               propio `<ol>` y todos salían como «1.». */
            let s = k + 1
            while (s < lineas.length && lineas[s].trim() === '') s++
            const sigue = s < lineas.length ? lineas[s].trim() : ''
            if (lista && ((lista.tipo === 'ol' && NUMERO.test(sigue)) || (lista.tipo === 'ul' && VINETA.test(sigue)))) {
                cerrarParrafo(); cerrarCita()
                continue
            }
            cerrarTodo(); continue
        }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { cerrarTodo(); continue }

        const h = /^(#{1,6})\s+(.*)$/.exec(t)
        if (h) {
            cerrarTodo()
            const nivel = Math.min(3, h[1].length)
            out.push(`<h${nivel}>${enLinea(h[2].replace(/\*\*/g, ''))}</h${nivel}>`)
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
        const vi = VINETA.exec(t)
        const nu = NUMERO.exec(t)
        if (vi || nu) {
            cerrarParrafo(); cerrarCita()
            const tipo = vi ? 'ul' : 'ol'
            if (!lista || lista.tipo !== tipo) { cerrarLista(); lista = { tipo, items: [], inicio: nu ? parseInt(nu[1], 10) || 1 : 1 } }
            lista.items.push(vi ? vi[1] : nu![2])
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
const RX_ESTRATEGIA = /^[ \t]*(?:#{1,3}[ \t]*)?(?:\*\*)?[ \t]*(?:ESTRATEGIA(?:[ \t]+(?:PROCESAL|DE[ \t]+IMPUGNACI[ÓO]N|DEL[ \t]+AMPARO))|(?:EVALUACI[ÓO]N|AN[ÁA]LISIS)[ \t]+DE[ \t]+VIABILIDAD)\b.*$/im

export function separarEstrategia(md: string): { escrito: string; estrategia: string } {
    const t = md || ''
    const m = RX_ESTRATEGIA.exec(t)
    if (!m) return { escrito: t, estrategia: '' }
    // El separador «---» que suele ir justo antes también se queda fuera del escrito.
    const escrito = t.slice(0, m.index).replace(/(?:\n[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*)+\s*$/, '').trimEnd()
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
