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
    let lista: { tipo: 'ul' | 'ol'; items: string[] } | null = null
    let cita: string[] = []

    const cerrarParrafo = () => {
        if (parrafo.length) out.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`)
        parrafo = []
    }
    const cerrarLista = () => {
        if (lista) out.push(`<${lista.tipo}>${lista.items.map((i) => `<li>${enLinea(i)}</li>`).join('')}</${lista.tipo}>`)
        lista = null
    }
    const cerrarCita = () => {
        if (cita.length) out.push(`<blockquote>${cita.map(enLinea).join('<br>')}</blockquote>`)
        cita = []
    }
    const cerrarTodo = () => { cerrarParrafo(); cerrarLista(); cerrarCita() }

    for (const bruta of lineas) {
        const linea = bruta.trimEnd()
        const t = linea.trim()
        if (t === '') { cerrarTodo(); continue }
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
        const vi = /^[-*•]\s+(.*)$/.exec(t)
        const nu = /^\d+[.)]\s+(.*)$/.exec(t)
        if (vi || nu) {
            cerrarParrafo(); cerrarCita()
            const tipo = vi ? 'ul' : 'ol'
            if (!lista || lista.tipo !== tipo) { cerrarLista(); lista = { tipo, items: [] } }
            lista.items.push((vi ?? nu)![1])
            continue
        }
        cerrarLista(); cerrarCita()
        parrafo.push(t)
    }
    cerrarTodo()
    return out.join('')
}

/** Texto plano (para enviar el documento al chat en la revisión). */
export function textoDeHtml(raiz: HTMLElement): string {
    const partes: string[] = []
    raiz.querySelectorAll('h1,h2,h3,p,li,blockquote').forEach((n) => {
        const t = (n as HTMLElement).innerText.trim()
        if (t) partes.push(n.tagName === 'LI' ? `- ${t}` : t)
    })
    return partes.join('\n\n')
}
