/**
 * QUÉ CAMBIA DE UN ASUNTO A OTRO (16-oct-2026).
 *
 * Dos fuentes, en este orden:
 *
 *   1. LO QUE LA PLANTILLA YA TRAE MARCADO, sin modelo y sin costo: {{x}},
 *      [NOMBRE], «Nombre», <<nombre>>, las rayas de cuatro o más guiones bajos
 *      con su rótulo al lado («Nombre: ________») y las XXXX.
 *   2. LO QUE PROPONE EL MODELO LIGERO (gasta 'plantilla_deteccion'): en un
 *      escrito viejo que el abogado reutiliza, los datos reales de aquel
 *      asunto —partes, domicilios, fechas, montos, expediente, juzgado, RFC,
 *      CURP, inmueble, plazos—. El modelo ve los huecos del paso 1 como ⟦n⟧ y
 *      les pone nombre por su contexto.
 *
 * NADA DEL MODELO ENTRA SIN COMPROBARSE: cada `texto` tiene que existir tal
 * cual en el documento (con la misma regla con que luego se marca), o se
 * descarta. El abogado revisa después cada campo antes de guardar.
 */

import {
    aClave, aparicionesDelParrafo, aparicionesEn, campoLimpio, claveUnica, esMayusculas, etiquetaDe, LETRA, LETRAS, origenValido,
    type CampoPlantilla, type OrigenCampo,
} from './campos'
import type { Parte } from './docx'

// ─── 1. Los marcadores que ya trae ───────────────────────────────────────────

/* Las palabras que delatan un hueco entre comillas o corchetes. Sin ellas,
   «la ley» entre comillas es una cita, no un campo. */
const PISTAS = /(nombre|fecha|domicilio|direcci[oó]n|n[uú]mero|numero|no\.|expediente|juicio|toca|folio|amparo|juzgado|tribunal|sala|monto|cantidad|importe|pesos|rfc|curp|clabe|cuenta|cliente|actor|actora|demandad|quejos|promovente|parte|ciudad|estado|municipio|colonia|calle|c[oó]digo|tel[eé]fono|correo|email|edad|nacionalidad|ocupaci[oó]n|estado civil|inmueble|predio|veh[ií]culo|placas|contrato|cl[aá]usula|plazo|d[ií]a|mes|a[nñ]o|hora|renta|arrendador|arrendatario|vendedor|comprador|deudor|acreedor|testigo|notario|escritura|registro|apoderado|abogado|c[eé]dula|insertar|se[nñ]alar|indicar|anotar|escribir|llenar|completar|dato)/i

const NO_SON = /^(sic|\.\.\.|…|énfasis añadido|énfasis propio|lo resaltado es propio|lo subrayado es propio|lo subrayado es nuestro|sin número|s\/n|ídem|idem|ibidem|ibídem)$/i

interface Patron {
    re: RegExp
    acepta: (interior: string) => boolean
}

const PATRONES: Patron[] = [
    // {{nombre}}: ya viene preparada para docxtemplater.
    { re: /\{\{\s*([^{}\n\t]{1,60}?)\s*\}\}/g, acepta: (x) => LETRA.test(x) },
    // [NOMBRE DEL ACTOR], [fecha]: los corchetes son el hueco clásico.
    { re: /\[([^[\]\n\t]{3,60})\]/g, acepta: (x) => (x.match(LETRAS) ?? []).length >= 2 && !NO_SON.test(x.trim()) && (esMayusculas(x) || PISTAS.test(x)) },
    // «NombreCliente» (los campos de combinar correspondencia de Word) o «NOMBRE».
    { re: /«([^«»\n\t]{2,60})»/g, acepta: (x) => !/[.;:]\s/.test(x) && (esMayusculas(x) || (PISTAS.test(x) && x.trim().split(/\s+/).length <= 6)) },
    { re: /<<([^<>\n\t]{2,60})>>/g, acepta: (x) => LETRA.test(x) },
]

/* Las rayas: cuatro o más guiones bajos, XXXX, o los asteriscos de las
   versiones públicas del Poder Judicial («QUEJOSO: *********»). Sin cuantificadores
   anidados: sobre una sentencia entera, `(\*+\s*)+` se cuelga. */
const RAYAS = new RegExp('_{4,}|(?<![\\p{L}\\p{N}])(?:[Xx]{4,}|\\*{5,})(?![\\p{L}\\p{N}])', 'gu')

const SEPARA_PALABRAS = new RegExp('[^\\p{L}\\p{N}.]+', 'u')

const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'a', 'al', 'en', 'y', 'o', 'por', 'con', 'que', 'se', 'su', 'sus', 'un', 'una', 'para', 'no', 'no.', 'núm', 'núm.', 'num.'])

const MES = '(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)'
const HUECO = '(_{3,}|[Xx]{4,}|\\*{5,})'

/* Las fechas con huecos, que en México se escriben así: «a los ____ días del
   mes de ______ de ____», «el ____ de ______ de dos mil veintiséis». */
function rotuloDeFecha(antes: string, despues: string): string {
    const a = antes.toLowerCase(), d = despues.toLowerCase()
    if (/^\s*d[ií]as?\b/.test(d)) return 'Día'
    if (new RegExp(`mes de\\s*$`).test(a)) return 'Mes'
    if (new RegExp(`(${HUECO}|\\b\\d{1,2})\\s+de\\s*$`).test(a) && new RegExp(`^\\s+de\\s+(dos mil|20\\d\\d|${HUECO})`).test(d)) return 'Mes'
    if (new RegExp(`^\\s+de\\s+(${HUECO}|${MES}|dos mil|20\\d\\d)`).test(d)) return 'Día'
    if (new RegExp(`(${HUECO}|${MES})\\s+de(l año)?\\s*$`).test(a)) return 'Año'
    return ''
}

/** La palabra que nombra a una raya: «Nombre: ____» → «Nombre». */
function rotuloDeRaya(antes: string, despues: string): string {
    const fecha = rotuloDeFecha(antes, despues)
    if (fecha) return fecha
    const palabras = (s: string) => s.replace(/_{4,}|[Xx]{4,}|\*{5,}/g, ' ').split(SEPARA_PALABRAS).filter(Boolean)
    const previas = palabras(antes).slice(-4).filter((w) => !VACIAS.has(w.toLowerCase()))
    if (previas.length) return etiquetaDe(previas.slice(-3).join(' '))
    const siguientes = palabras(despues).slice(0, 3).filter((w) => !VACIAS.has(w.toLowerCase()))
    if (siguientes.length) return etiquetaDe(siguientes.slice(0, 2).join(' '))
    return ''
}

/** Lo que rodea a una raya en su renglón: hasta el tabulador o salto de línea
    más cercano (ahí el texto de Word y el de la vista previa ya no coinciden),
    60 caracteres antes y 40 después, en palabras enteras. */
function renglonDe(texto: string, desde: number, hasta: number): { antes: string; despues: string } {
    const corte = /[\t\n\u2011\ufffc]/
    let ini = desde
    while (ini > 0 && !corte.test(texto[ini - 1]) && desde - ini < 60) ini--
    let antes = texto.slice(ini, desde)
    if (desde - ini >= 60) antes = antes.replace(/^\S*\s/, '')
    let fin = hasta
    while (fin < texto.length && !corte.test(texto[fin]) && fin - hasta < 40) fin++
    let despues = texto.slice(hasta, fin)
    if (fin - hasta >= 40) despues = despues.replace(/\s\S*$/, '')
    return { antes, despues }
}

/** Lo que IDENTIFICA a una raya: su rótulo de antes o, si no tiene, el de
    después. Sin ninguno de los dos, nada (es una raya de firma). */
function contextoDeRaya(renglon: { antes: string; despues: string }): { antes?: string; despues?: string } {
    if (renglon.antes.trim()) return { antes: renglon.antes }
    if (renglon.despues.trim()) return { despues: renglon.despues }
    return {}
}

const ORIGEN_POR_PISTA: [RegExp, OrigenCampo][] = [
    [/correo|e-?mail/i, 'carpeta.cliente_correo'],
    [/tel[eé]fono|celular/i, 'carpeta.cliente_telefono'],
    [/^fecha(\s+(de\s+)?(hoy|actual|del escrito))?$/i, 'fecha_hoy'],
    [/nombre del cliente|^cliente$/i, 'carpeta.cliente_nombre'],
    [/domicilio del cliente/i, 'carpeta.cliente_domicilio'],
    [/^materia$/i, 'carpeta.materia'],
    [/pretensi[oó]n|prestaciones/i, 'carpeta.pretension'],
]

function origenPorPista(etiqueta: string): OrigenCampo {
    for (const [re, o] of ORIGEN_POR_PISTA) if (re.test(etiqueta.trim())) return o
    return 'manual'
}

/** Los huecos que ya trae la plantilla, sin modelo. Mismo texto = mismo campo. */
export function detectarMarcadores(partes: readonly Parte[]): CampoPlantilla[] {
    const porTexto = new Map<string, CampoPlantilla>()
    const usadas = new Set<string>()
    let rayas = 0
    for (const parte of partes) {
        for (const p of parte.parrafos) {
            if (p.respaldo) continue
            const t = p.texto
            for (const { re, acepta } of PATRONES) {
                for (const m of Array.from(t.matchAll(re))) {
                    const interior = m[1].trim()
                    if (!acepta(interior)) continue
                    const id = m[0]
                    if (porTexto.has(id)) continue
                    const etiqueta = etiquetaDe(interior) || 'Dato'
                    porTexto.set(id, {
                        clave: claveUnica(interior, usadas),
                        etiqueta,
                        origen: origenPorPista(etiqueta),
                        ejemplo: '',
                        textos: [id],
                        fuente: 'marcador',
                        apariciones: 0,
                    })
                }
            }
            for (const m of Array.from(t.matchAll(RAYAS))) {
                const desde = m.index ?? 0
                const hasta = desde + m[0].length
                const renglon = renglonDe(t, desde, hasta)
                const ctx = contextoDeRaya(renglon)
                // Una raya sola en su renglón es para firmar, no para llenar.
                if (!ctx.antes && !ctx.despues) continue
                // Los asteriscos de una versión pública tapan lo que sea (hasta
                // el nombre de una ley): sólo valen como hueco tras un rótulo
                // («QUEJOSO: *********»).
                if (m[0][0] === '*' && !/:\s*$/.test(ctx.antes ?? '')) continue
                const id = `${m[0]}\u0000${ctx.antes ?? ''}\u0000${ctx.despues ?? ''}`
                if (porTexto.has(id)) continue
                rayas++
                // El rótulo se busca con todo el renglón, no sólo con lo que la identifica.
                const etiqueta = rotuloDeRaya(renglon.antes, renglon.despues) || `Dato ${rayas}`
                porTexto.set(id, {
                    clave: claveUnica(etiqueta, usadas),
                    etiqueta,
                    origen: origenPorPista(etiqueta),
                    ejemplo: '',
                    textos: [m[0]],
                    ...ctx,
                    fuente: 'raya',
                    apariciones: 0,
                })
            }
        }
    }
    return Array.from(porTexto.values())
}

// ─── 2. Lo que propone el modelo ─────────────────────────────────────────────

/** Cuánto texto se le manda: ~30 mil caracteres caben de sobra en un escrito
    de veinte hojas y cuestan centavos. */
export const MAX_TEXTO_MODELO = 30_000

/**
 * El texto que lee el modelo: el documento con los huecos ya detectados
 * cambiados por ⟦n⟧ (n = su lugar en `marcadores`, desde 1).
 */
export function textoParaModelo(partes: readonly Parte[], marcadores: readonly CampoPlantilla[]): string {
    const bloques: string[] = []
    const rotulo: Record<string, string> = { encabezado: '[ENCABEZADO]', pie: '[PIE DE PÁGINA]', nota: '[NOTAS AL PIE]' }
    for (const parte of partes) {
        const lineas: string[] = []
        for (const p of parte.parrafos) {
            if (p.respaldo) continue
            const aps = aparicionesDelParrafo(p.texto, marcadores, p.virtuales)
            let t = '', cursor = 0
            for (const a of aps) {
                t += p.texto.slice(cursor, a.desde) + `⟦${marcadores.findIndex((c) => c.clave === a.clave) + 1}⟧`
                cursor = a.hasta
            }
            t += p.texto.slice(cursor)
            t = t.replace(/\u2011/g, '-').replace(/\ufffc/g, '').replace(/[ \t]+/g, ' ').trim()
            if (t || (lineas.length && lineas[lineas.length - 1] !== '')) lineas.push(t)
        }
        const cuerpo = lineas.join('\n').trim()
        if (!cuerpo) continue
        bloques.push(parte.tipo === 'cuerpo' ? cuerpo : `${rotulo[parte.tipo]}\n${cuerpo}`)
    }
    // El cuerpo primero: si hay que recortar, que se pierda el pie y no el proemio.
    const orden = [...bloques].sort((a, b) => Number(a.startsWith('[')) - Number(b.startsWith('[')))
    let texto = orden.join('\n\n')
    if (texto.length > MAX_TEXTO_MODELO) {
        texto = texto.slice(0, MAX_TEXTO_MODELO)
        const corte = texto.lastIndexOf('\n')
        if (corte > MAX_TEXTO_MODELO * 0.8) texto = texto.slice(0, corte)
        texto += '\n[…el documento sigue; el resto no se incluyó]'
    }
    return texto
}

export const SISTEMA_DETECCION = `Eres el asistente de un despacho de abogados en México. Te paso el texto de una PLANTILLA: un escrito, contrato o formato que el despacho reutiliza de un asunto a otro. Tu tarea es encontrar los DATOS VARIABLES: lo que cambia de un asunto a otro y hay que llenar cada vez.

Son datos variables: los nombres de las partes y de terceros (actor, demandado, quejoso, cliente, testigos, apoderados), domicilios, fechas concretas, montos y cantidades, números de expediente, juicio, toca, folio o amparo, el juzgado o tribunal y su residencia, RFC, CURP, datos del inmueble o del vehículo, números de escritura o de registro, plazos y términos concretos, cuentas, correos y teléfonos.

NO son datos variables: el texto legal fijo, los fundamentos (artículos, leyes, tesis, jurisprudencias), las fórmulas («Protesto lo necesario», «ante usted con el debido respeto comparezco»), los títulos de capítulo («HECHOS», «DERECHO», «PUNTOS PETITORIOS»), ni el nombre, la cédula o los datos del abogado o despacho que firma: ésos son iguales en todos sus escritos.

Los huecos que la plantilla ya trae marcados (rayas, corchetes, etc.) aparecen como ⟦1⟧, ⟦2⟧…: ponles nombre según su contexto en "huecos" y no los repitas en "campos".

Responde SÓLO con JSON, con esta forma:
{
  "descripcion": "qué documento es, en una frase de máximo 12 palabras",
  "materia": "civil" | "familiar" | "mercantil" | "penal" | "laboral" | "amparo" | "administrativo" | "fiscal" | "agrario" | "notarial" | "otra",
  "huecos": [{ "n": 1, "clave": "...", "etiqueta": "...", "origen": "..." }],
  "campos": [{ "texto": "...", "clave": "...", "etiqueta": "...", "origen": "...", "ejemplo": "..." }]
}

Reglas de "campos":
- "texto" es una subcadena EXACTA del documento, copiada carácter por carácter: mismas mayúsculas, acentos, espacios y puntuación. Si el mismo dato aparece varias veces o en mayúsculas, basta con una.
- Sólo el dato, sin el rótulo ni las palabras que lo introducen: de «con domicilio en Avenida Juárez 120, Colonia Centro» el texto es «Avenida Juárez 120, Colonia Centro».
- Un dato por campo: no juntes dos datos en uno.
- "clave": snake_case en minúsculas y sin acentos, que diga qué es («actor_nombre», «expediente_numero», «monto_adeudo»).
- "etiqueta": cómo se lo preguntarías al abogado, breve («Nombre del actor», «Número de expediente»).
- "ejemplo": el valor tal como aparece en el documento.
- "origen", de dónde sale el dato cuando se usa la plantilla desde la carpeta del cliente:
  "carpeta.cliente_nombre": el nombre del cliente del despacho, la persona a la que representa (el actor, promovente o quejoso; si el despacho representa al demandado, el demandado).
  "carpeta.cliente_domicilio", "carpeta.cliente_correo", "carpeta.cliente_telefono": los de ese cliente.
  "carpeta.materia": la materia del asunto. "carpeta.pretension": lo que el cliente reclama. "carpeta.titulo": el nombre del asunto.
  "fecha_hoy": la fecha del escrito (la de firma o presentación). "fecha_hoy.dia", "fecha_hoy.mes", "fecha_hoy.anio": sólo el día, el mes o el año de esa fecha, cuando la plantilla los pide por separado.
  "manual": todo lo demás (la contraparte, el juzgado, el expediente, los montos…).
- A lo sumo 40 campos, los más importantes primero. Si no hay datos variables, "campos" va vacío.`

export interface SugerenciaModelo {
    descripcion?: unknown
    materia?: unknown
    huecos?: unknown
    campos?: unknown
}

const MATERIAS = new Set(['civil', 'familiar', 'mercantil', 'penal', 'laboral', 'amparo', 'administrativo', 'fiscal', 'agrario', 'notarial', 'otra'])

/* Lo que nunca es un dato variable aunque el modelo lo crea. */
const GENERICOS = /^(c\.?\s*)?(juez|jueza|juzgado|tribunal|presente|actor|actora|demandado|demandada|quejoso|quejosa|hechos|derecho|puntos petitorios|protesto lo necesario|atentamente|méxico|estados unidos mexicanos)$/i

export interface Deteccion {
    campos: CampoPlantilla[]
    descripcion: string | null
    materia: string | null
}

/**
 * Junta los marcadores con lo que propuso el modelo, valida cada texto contra
 * el documento y cuenta las apariciones con la misma regla del marcado. Lo
 * que no aparece ni una vez (porque no existe o porque otro campo más largo
 * se lo come) se descarta.
 */
export function combinar(partes: readonly Parte[], marcadores: readonly CampoPlantilla[], sugerencia: SugerenciaModelo | null): Deteccion {
    const usadas = new Set<string>()
    const fuera: CampoPlantilla[] = []

    // Los huecos, con el nombre que les puso el modelo (si se lo puso bien).
    const huecos = new Map<number, Record<string, unknown>>()
    if (sugerencia && Array.isArray(sugerencia.huecos)) {
        for (const h of sugerencia.huecos.slice(0, 200)) {
            if (h && typeof h === 'object' && typeof (h as Record<string, unknown>).n === 'number') huecos.set((h as Record<string, unknown>).n as number, h as Record<string, unknown>)
        }
    }
    marcadores.forEach((m, i) => {
        const h = huecos.get(i + 1)
        const etiqueta = typeof h?.etiqueta === 'string' && h.etiqueta.trim() ? h.etiqueta.trim().slice(0, 60) : m.etiqueta
        const clave = typeof h?.clave === 'string' && h.clave.trim() ? h.clave : etiqueta
        const origen = h?.origen !== undefined ? origenValido(h.origen) : m.origen
        fuera.push({ ...m, clave: claveUnica(clave, usadas), etiqueta, origen })
    })

    // Los datos reales que vio el modelo.
    const parrafos = partes.flatMap((p) => p.parrafos.filter((q) => !q.respaldo))
    const existe = (texto: string) => parrafos.some((q) =>
        aparicionesEn(q.texto, { clave: '_', textos: [texto], fuente: 'modelo' }, q.virtuales).length > 0)
    const yaVistos = new Set(fuera.flatMap((c) => c.textos))
    const porClave = new Map<string, CampoPlantilla>()
    const brutos = sugerencia && Array.isArray(sugerencia.campos) ? sugerencia.campos.slice(0, 60) : []
    for (const bruto of brutos) {
        if (!bruto || typeof bruto !== 'object') continue
        const b = bruto as Record<string, unknown>
        const texto = typeof b.texto === 'string' ? b.texto.trim() : ''
        if (texto.length < 2 || texto.length > 160) continue
        if (/[⟦⟧]|_{3,}|[\n\t]/.test(texto) || GENERICOS.test(texto) || yaVistos.has(texto)) continue
        if (!existe(texto)) continue
        yaVistos.add(texto)
        // Dos textos con la misma clave son el mismo dato escrito de dos formas.
        const claveBase = aClave(typeof b.clave === 'string' && b.clave ? b.clave : String(b.etiqueta ?? texto))
        const previo = porClave.get(claveBase)
        if (previo) { if (previo.textos.length < 6) previo.textos.push(texto); continue }
        const c = campoLimpio({ ...b, texto, fuente: 'modelo', ejemplo: typeof b.ejemplo === 'string' && b.ejemplo ? b.ejemplo : texto }, usadas)
        if (!c) continue
        porClave.set(claveBase, c)
        fuera.push(c)
    }

    // Las apariciones efectivas: con la misma regla del marcado, de una vez.
    const cuenta = new Map<string, number>(fuera.map((c) => [c.clave, 0]))
    const primera = new Map<string, number>()
    let orden = 0
    for (const parte of ordenDeLectura(partes)) {
        for (const p of parte.parrafos) {
            if (p.respaldo) continue
            for (const a of aparicionesDelParrafo(p.texto, fuera, p.virtuales)) {
                cuenta.set(a.clave, (cuenta.get(a.clave) ?? 0) + 1)
                if (!primera.has(a.clave)) primera.set(a.clave, orden * 100_000 + a.desde)
            }
            orden++
        }
    }
    const campos = fuera
        .map((c) => ({ ...c, apariciones: cuenta.get(c.clave) ?? 0 }))
        .filter((c) => c.apariciones > 0)
        .sort((a, b) => (primera.get(a.clave) ?? 0) - (primera.get(b.clave) ?? 0))
        .slice(0, 60)

    const descripcion = typeof sugerencia?.descripcion === 'string' && sugerencia.descripcion.trim()
        ? sugerencia.descripcion.replace(/\s+/g, ' ').trim().slice(0, 140) : null
    const materia = typeof sugerencia?.materia === 'string' && MATERIAS.has(sugerencia.materia.trim().toLowerCase())
        ? sugerencia.materia.trim().toLowerCase() : null
    return { campos, descripcion, materia: materia === 'otra' ? null : materia }
}

/** El orden en que se lee: encabezado, cuerpo, notas y pie. */
function ordenDeLectura(partes: readonly Parte[]): Parte[] {
    const peso: Record<string, number> = { encabezado: 0, cuerpo: 1, nota: 2, pie: 3 }
    return [...partes].sort((a, b) => peso[a.tipo] - peso[b.tipo])
}

/**
 * Los campos que manda el navegador al guardar la revisión: limpios, con
 * clave única, y SÓLO los que aparecen en el documento. Las apariciones se
 * vuelven a contar aquí: el navegador no decide qué se reemplaza.
 */
export function camposConfirmados(partes: readonly Parte[], brutos: unknown): { campos: CampoPlantilla[]; descartados: string[] } {
    const usadas = new Set<string>()
    const limpios: CampoPlantilla[] = []
    const descartados: string[] = []
    for (const b of Array.isArray(brutos) ? brutos.slice(0, 80) : []) {
        const c = campoLimpio(b, usadas)
        if (c) limpios.push(c)
        else if (b && typeof b === 'object' && typeof (b as Record<string, unknown>).etiqueta === 'string') descartados.push(String((b as Record<string, unknown>).etiqueta))
    }
    const cuenta = new Map<string, number>(limpios.map((c) => [c.clave, 0]))
    for (const parte of partes) {
        for (const p of parte.parrafos) {
            if (p.respaldo) continue
            for (const a of aparicionesDelParrafo(p.texto, limpios, p.virtuales)) cuenta.set(a.clave, (cuenta.get(a.clave) ?? 0) + 1)
        }
    }
    const campos: CampoPlantilla[] = []
    for (const c of limpios) {
        const n = cuenta.get(c.clave) ?? 0
        if (n > 0) campos.push({ ...c, apariciones: n })
        else descartados.push(c.etiqueta)
    }
    return { campos, descartados }
}
