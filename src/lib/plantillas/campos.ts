/**
 * LOS CAMPOS DE UNA PLANTILLA DEL ABOGADO (16-oct-2026).
 *
 * David: «Agregar plantillas y trabajar sobre ellas es fundamental para los
 * abogados». La plantilla es el Word del despacho; los campos son lo que
 * cambia de un asunto a otro: el cliente, la contraparte, el juzgado, el
 * expediente, los montos, la fecha.
 *
 * ESTE ARCHIVO NO DEPENDE DE NADA: lo usan el servidor (marcar y llenar el
 * .docx), la revisión en el navegador (resaltar en oro) y la prueba de
 * `comprobaciones/plantillas.mjs`. Por eso la regla de qué cuenta como una
 * aparición vive AQUÍ y en ningún otro sitio: si el resaltado de la revisión
 * y el marcado del Word la decidieran por separado, el abogado aprobaría unas
 * apariciones y se llenarían otras.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** De dónde sale el valor de un campo cuando se usa la plantilla. */
export type OrigenCampo =
    | 'carpeta.cliente_nombre'
    | 'carpeta.cliente_domicilio'
    | 'carpeta.cliente_correo'
    | 'carpeta.cliente_telefono'
    | 'carpeta.materia'
    | 'carpeta.pretension'
    | 'carpeta.titulo'
    | 'fecha_hoy'
    | 'fecha_hoy.dia'
    | 'fecha_hoy.mes'
    | 'fecha_hoy.anio'
    | 'manual'

/** Quién propuso el campo: el modelo, la plantilla misma o el abogado. */
export type FuenteCampo = 'modelo' | 'marcador' | 'raya' | 'manual'

export interface CampoPlantilla {
    /** snake_case, única en la plantilla. Es lo que va dentro de {{ }}. */
    clave: string
    /** Cómo se le pregunta al abogado: «Nombre del actor». */
    etiqueta: string
    origen: OrigenCampo
    /** El valor tal como venía en el documento (o vacío si era un hueco). */
    ejemplo: string
    /** Lo que se reemplaza: CADA aparición de cada uno de estos textos. */
    textos: string[]
    /** Sólo las rayas: lo que va justo antes (o después) y se queda. Así
        «Nombre: ______» y «Domicilio: ______» son dos campos y no uno. */
    antes?: string
    despues?: string
    fuente: FuenteCampo
    /** Cuántas veces aparece en el documento (cuerpo, encabezados y pies). */
    apariciones: number
}

/** Una aparición en el texto de un párrafo. */
export interface Aparicion {
    desde: number
    hasta: number
    clave: string
    /** Cómo escribir el valor ahí: en mayúsculas, con inicial o tal cual. */
    forma: 'mayus' | 'inicial' | null
}

/** Lo que la interfaz y el servidor necesitan de una plantilla guardada. */
export interface PlantillaResumen {
    id: string
    nombre: string
    descripcion: string | null
    materia: string | null
    campos: CampoPlantilla[]
    /** false mientras el abogado no haya revisado los campos (no se puede usar). */
    lista: boolean
    veces_usada: number
    created_at: string
    updated_at: string
}

export interface LimitesPlantillas {
    escalon: string
    guardadas: { usadas: number; maximo: number }
    deteccion: { usados: number | null; limite: number; periodo: 'dia' | 'mes' }
    generar: { usados: number | null; limite: number; periodo: 'dia' | 'mes' }
}

/** La vista previa para revisar: el cuerpo (mammoth) y, aparte, los
    encabezados y pies, que mammoth no convierte. */
export interface VistaPlantilla {
    html: string
    encabezados: string[]
    pies: string[]
}

// ─── Los orígenes ────────────────────────────────────────────────────────────

export const ORIGENES: { valor: OrigenCampo; rotulo: string; grupo: 'carpeta' | 'fecha' | 'manual' }[] = [
    { valor: 'manual', rotulo: 'Lo escribo cada vez', grupo: 'manual' },
    { valor: 'carpeta.cliente_nombre', rotulo: 'Nombre del cliente', grupo: 'carpeta' },
    { valor: 'carpeta.cliente_domicilio', rotulo: 'Domicilio del cliente', grupo: 'carpeta' },
    { valor: 'carpeta.cliente_correo', rotulo: 'Correo del cliente', grupo: 'carpeta' },
    { valor: 'carpeta.cliente_telefono', rotulo: 'Teléfono del cliente', grupo: 'carpeta' },
    { valor: 'carpeta.materia', rotulo: 'Materia del asunto', grupo: 'carpeta' },
    { valor: 'carpeta.pretension', rotulo: 'Pretensión del cliente', grupo: 'carpeta' },
    { valor: 'carpeta.titulo', rotulo: 'Nombre de la carpeta', grupo: 'carpeta' },
    { valor: 'fecha_hoy', rotulo: 'Fecha de hoy', grupo: 'fecha' },
    { valor: 'fecha_hoy.dia', rotulo: 'Día de hoy', grupo: 'fecha' },
    { valor: 'fecha_hoy.mes', rotulo: 'Mes en curso', grupo: 'fecha' },
    { valor: 'fecha_hoy.anio', rotulo: 'Año en curso', grupo: 'fecha' },
]

const VALIDOS = new Set<string>(ORIGENES.map((o) => o.valor))

export function origenValido(o: unknown): OrigenCampo {
    return typeof o === 'string' && VALIDOS.has(o) ? (o as OrigenCampo) : 'manual'
}

export function rotuloDeOrigen(o: OrigenCampo): string {
    return ORIGENES.find((x) => x.valor === o)?.rotulo ?? 'Lo escribo cada vez'
}

/** Los datos de la carpeta que puede tomar una plantilla (las columnas de
    `expedientes` con el mismo nombre). */
export interface DatosCarpeta {
    titulo?: string | null
    cliente_nombre?: string | null
    cliente_domicilio?: string | null
    cliente_correo?: string | null
    cliente_telefono?: string | null
    materia?: string | null
    pretension?: string | null
}

/**
 * Lo que una carpeta (`expedientes`) le da a una plantilla. OJO con el
 * cliente: al crear una carpeta que NO es de cliente, `cliente_nombre` se
 * llena con el título («Amparo contra el IMSS»), así que sólo cuenta como
 * nombre del cliente en una carpeta de cliente o si es distinto del título.
 */
export function datosDeCarpeta(e: (DatosCarpeta & { tipo?: string | null }) | null | undefined): DatosCarpeta | null {
    if (!e) return null
    const titulo = e.titulo?.trim() || e.cliente_nombre?.trim() || null
    const nombre = e.cliente_nombre?.trim() || null
    const esCliente = e.tipo === 'cliente' || (!!nombre && nombre !== (e.titulo ?? '').trim())
    return {
        titulo,
        cliente_nombre: esCliente ? nombre : null,
        cliente_domicilio: e.cliente_domicilio ?? null,
        cliente_correo: e.cliente_correo ?? null,
        cliente_telefono: e.cliente_telefono ?? null,
        materia: e.materia ?? null,
        pretension: e.pretension ?? null,
    }
}

/* La materia va en minúscula: casi siempre cae dentro de una frase («en
   materia civil»). Donde la plantilla la escribía con mayúscula o toda en
   mayúsculas, la forma de esa aparición se encarga (ver `formaDe`). */
const MATERIAS: Record<string, string> = {
    penal: 'penal', civil: 'civil', laboral: 'laboral', administrativo: 'administrativa',
    agrario: 'agraria', amparo: 'amparo', familiar: 'familiar', mercantil: 'mercantil', fiscal: 'fiscal',
}

const ZONA = 'America/Mexico_City'

/** «16 de octubre de 2026», en la hora de la Ciudad de México. */
export function fechaLarga(d = new Date()): string {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA }).format(d)
}

function parteDeFecha(d: Date, parte: 'day' | 'month' | 'year'): string {
    const fmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA })
    return fmt.formatToParts(d).find((p) => p.type === parte)?.value ?? ''
}

/** El valor que un origen propone. `undefined` = no hay de dónde sacarlo. */
export function valorDeOrigen(origen: OrigenCampo, carpeta: DatosCarpeta | null | undefined, hoy = new Date()): string | undefined {
    const limpio = (v: string | null | undefined) => (v && v.trim() ? v.trim() : undefined)
    switch (origen) {
        case 'fecha_hoy': return fechaLarga(hoy)
        case 'fecha_hoy.dia': return parteDeFecha(hoy, 'day')
        case 'fecha_hoy.mes': return parteDeFecha(hoy, 'month')
        case 'fecha_hoy.anio': return parteDeFecha(hoy, 'year')
        case 'manual': return undefined
    }
    if (!carpeta) return undefined
    switch (origen) {
        case 'carpeta.cliente_nombre': return limpio(carpeta.cliente_nombre)
        case 'carpeta.cliente_domicilio': return limpio(carpeta.cliente_domicilio)
        case 'carpeta.cliente_correo': return limpio(carpeta.cliente_correo)
        case 'carpeta.cliente_telefono': return limpio(carpeta.cliente_telefono)
        case 'carpeta.pretension': return limpio(carpeta.pretension)
        case 'carpeta.titulo': return limpio(carpeta.titulo) ?? limpio(carpeta.cliente_nombre)
        case 'carpeta.materia': {
            const m = limpio(carpeta.materia)
            return m ? MATERIAS[m.toLowerCase()] ?? m : undefined
        }
    }
    return undefined
}

// ─── Letras ──────────────────────────────────────────────────────────────────

/* Con la bandera «u» por constructor: el tsconfig del repo no fija `target` y
   tsc rechaza esa bandera en una expresión literal. */
export const LETRA = new RegExp('\\p{L}', 'u')
export const LETRAS = new RegExp('\\p{L}', 'gu')
export const LETRA_O_CIFRA = new RegExp('[\\p{L}\\p{N}]', 'u')
const SIGLAS = new RegExp('(^|[^\\p{L}])(rfc|curp|clabe|nss|ine|imss|issste|infonavit|sat|cfe|cp)(?=$|[^\\p{L}])', 'giu')

// ─── Claves y etiquetas ──────────────────────────────────────────────────────

/** «Nombre del Actor» → «nombre_del_actor». Siempre empieza con letra. */
export function aClave(texto: string): string {
    const s = texto
        .replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1_$2') // NombreCliente → Nombre_Cliente
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40)
        .replace(/_+$/g, '')
    if (!s) return 'campo'
    return /^[a-z]/.test(s) ? s : `campo_${s}`.slice(0, 40)
}

/** Claves únicas: la segunda «actor_nombre» pasa a «actor_nombre_2». */
export function claveUnica(base: string, usadas: Set<string>): string {
    let clave = aClave(base)
    if (!usadas.has(clave)) { usadas.add(clave); return clave }
    for (let n = 2; ; n++) {
        const otra = `${clave.slice(0, 36)}_${n}`
        if (!usadas.has(otra)) { clave = otra; break }
    }
    usadas.add(clave)
    return clave
}

/** «NOMBRE DEL ACTOR» → «Nombre del actor»; «NombreCliente» → «Nombre cliente». */
export function etiquetaDe(texto: string): string {
    let t = texto
        .replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1 $2')
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    if (!t) return ''
    if (esMayusculas(t) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+$/.test(t)) t = t.toLocaleLowerCase('es-MX')
    // Las siglas siguen siendo siglas: «RFC del actor», no «Rfc del actor».
    t = t.replace(SIGLAS,
        (_m, a: string, s: string) => a + s.toUpperCase())
    return (t.charAt(0).toLocaleUpperCase('es-MX') + t.slice(1)).slice(0, 60)
}

// ─── Mayúsculas ──────────────────────────────────────────────────────────────

/** Tiene al menos dos letras y todas van en mayúscula. */
export function esMayusculas(s: string): boolean {
    const letras = s.match(LETRAS)
    if (!letras || letras.length < 2) return false
    return s === s.toLocaleUpperCase('es-MX') && s !== s.toLocaleLowerCase('es-MX')
}

/* LA FORMA DE CADA APARICIÓN. Un escrito viejo trae «JUAN PÉREZ LÓPEZ» en el
   proemio y «Juan Pérez López» en la firma: es el mismo campo, pero donde
   estaba en mayúsculas el nombre del cliente nuevo tiene que salir en
   mayúsculas. Sólo para los datos de verdad (los que detectó el modelo o
   marcó el abogado): en un hueco como «[NOMBRE DEL ACTOR]» la mayúscula es
   convención de plantilla, no forma del escrito. */
export function formaDe(campo: Pick<CampoPlantilla, 'fuente'>, aparicion: string): Aparicion['forma'] {
    if (campo.fuente !== 'modelo' && campo.fuente !== 'manual') return null
    if (esMayusculas(aparicion)) return 'mayus'
    const primera = aparicion.match(LETRA)?.[0]
    if (primera && primera === primera.toLocaleUpperCase('es-MX') && primera !== primera.toLocaleLowerCase('es-MX')) return 'inicial'
    return null
}

/** Escribe el valor con la forma de la aparición. */
export function aplicarForma(valor: string, forma: Aparicion['forma']): string {
    if (forma === 'mayus') return valor.toLocaleUpperCase('es-MX')
    if (forma === 'inicial') {
        // Sólo la primera letra, y sólo si no es un correo (que va como venga).
        if (/@/.test(valor)) return valor
        const i = valor.search(LETRA)
        if (i < 0) return valor
        return valor.slice(0, i) + valor.charAt(i).toLocaleUpperCase('es-MX') + valor.slice(i + 1)
    }
    return valor
}

// ─── Qué cuenta como una aparición ───────────────────────────────────────────


/* SIN DISTINGUIR MAYÚSCULAS SÓLO LO LARGO. «Juan Pérez López» y «JUAN PÉREZ
   LÓPEZ» son el mismo dato; «Centro» (la colonia) y «centro» (el de trabajo)
   no. Con dos palabras o diez letras ya no hay coincidencias por azar. */
function sinDistinguir(t: string): boolean {
    if (!LETRA.test(t)) return false
    return t.trim().split(/\s+/).length >= 2 || t.length >= 10
}

/* LOS ESPACIOS Y LAS COMILLAS NO CUENTAN. Un escrito tecleado a mano trae
   dobles espacios y espacios duros («C.\u00a0JUEZ»), y el modelo devuelve
   el texto con espacios sencillos y comillas rectas. Cualquier hueco en
   blanco empata con cualquier otro, y “ ” con ". */
const ESPECIALES = /[.*+?^${}()|[\]\\]/g
const cacheRe = new Map<string, RegExp>()
function patronDe(t: string, flexible: boolean): RegExp {
    const llave = (flexible ? 'i' : 's') + t
    let re = cacheRe.get(llave)
    if (re) return re
    const fuente = t
        .split(/[\s\u00a0]+/)
        .map((trozo) => trozo
            .replace(ESPECIALES, '\\$&')
            .replace(/["“”]/g, '["“”]')
            .replace(/['’‘]/g, "['’‘]"))
        .join('[\\s\\u00a0]+')
    re = new RegExp(fuente, flexible ? 'giu' : 'gu')
    if (cacheRe.size > 2000) cacheRe.clear()
    cacheRe.set(llave, re)
    return re
}

/**
 * Las apariciones de un campo en el texto de UN párrafo. Reglas:
 *   · palabra entera: «Ana» no cae dentro de «Mariana»;
 *   · sin distinguir mayúsculas cuando el texto es largo (ver arriba);
 *   · los espacios y las comillas no cuentan (ver arriba);
 *   · las rayas, sólo con su rótulo al lado (`antes` / `despues`);
 *   · `prohibidas`: posiciones que no son texto (un tabulador, un salto de
 *     línea del Word): una aparición que las cruce no se puede reemplazar sin
 *     romper el párrafo, así que no cuenta.
 */
export function aparicionesEn(
    parrafo: string,
    campo: Pick<CampoPlantilla, 'clave' | 'textos' | 'antes' | 'despues' | 'fuente'>,
    prohibidas?: readonly number[],
): Aparicion[] {
    const fuera: Aparicion[] = []
    if (!parrafo) return fuera
    for (const bruto of campo.textos) {
        const t = bruto.trim()
        if (!t) continue
        const re = patronDe(t, sinDistinguir(t))
        re.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = re.exec(parrafo)) !== null) {
            const i = m.index, j = i + m[0].length
            if (j === i) { re.lastIndex = i + 1; continue }
            if (bordesLimpios(parrafo, i, j) && contextoCumple(parrafo, i, j, campo) && !cruza(prohibidas, i, j)) {
                fuera.push({ desde: i, hasta: j, clave: campo.clave, forma: formaDe(campo, m[0]) })
            }
            // Se sigue desde el carácter siguiente: dos apariciones encimadas
            // las resuelve `sinEncimar`, no el orden de búsqueda.
            re.lastIndex = i + 1
        }
    }
    return fuera
}

function bordesLimpios(s: string, i: number, j: number): boolean {
    const dentroIni = s.charAt(i), dentroFin = s.charAt(j - 1)
    if (LETRA_O_CIFRA.test(dentroIni) && i > 0 && LETRA_O_CIFRA.test(s.charAt(i - 1))) return false
    if (LETRA_O_CIFRA.test(dentroFin) && j < s.length && LETRA_O_CIFRA.test(s.charAt(j))) return false
    // Una raya no se parte: «____» dentro de «________» no es otra raya.
    if ((dentroIni === '_' || dentroIni === '*') && i > 0 && s.charAt(i - 1) === dentroIni) return false
    if ((dentroFin === '_' || dentroFin === '*') && j < s.length && s.charAt(j) === dentroFin) return false
    return true
}

function contextoCumple(s: string, i: number, j: number, c: Pick<CampoPlantilla, 'antes' | 'despues'>): boolean {
    if (c.antes && s.slice(Math.max(0, i - c.antes.length), i) !== c.antes) return false
    if (c.despues && s.slice(j, j + c.despues.length) !== c.despues) return false
    return true
}

function cruza(prohibidas: readonly number[] | undefined, i: number, j: number): boolean {
    if (!prohibidas || prohibidas.length === 0) return false
    for (const p of prohibidas) if (p >= i && p < j) return true
    return false
}

/**
 * De todas las apariciones de todos los campos en un párrafo, las que se
 * quedan: GANA LA MÁS LARGA. «Juan Pérez López» le gana a «Pérez» si se
 * enciman; si empatan, la que va primero. Devuelve en el orden del texto.
 */
export function sinEncimar(todas: Aparicion[]): Aparicion[] {
    const orden = [...todas].sort((a, b) => (b.hasta - b.desde) - (a.hasta - a.desde) || a.desde - b.desde)
    const quedan: Aparicion[] = []
    for (const a of orden) {
        if (quedan.some((q) => a.desde < q.hasta && q.desde < a.hasta)) continue
        quedan.push(a)
    }
    return quedan.sort((a, b) => a.desde - b.desde)
}

/** Todas las apariciones que se quedan en un párrafo, para todos los campos. */
export function aparicionesDelParrafo(
    parrafo: string,
    campos: readonly Pick<CampoPlantilla, 'clave' | 'textos' | 'antes' | 'despues' | 'fuente'>[],
    prohibidas?: readonly number[],
): Aparicion[] {
    const todas: Aparicion[] = []
    for (const c of campos) todas.push(...aparicionesEn(parrafo, c, prohibidas))
    return sinEncimar(todas)
}

/** La etiqueta que va en el Word: {{clave}} o {{clave|mayus}}. */
export function etiquetaWord(a: Pick<Aparicion, 'clave' | 'forma'>): string {
    return a.forma ? `{{${a.clave}|${a.forma}}}` : `{{${a.clave}}}`
}

// ─── Saneamiento de lo que llega de fuera (modelo o navegador) ──────────────

const MAX_TEXTO = 200

/** Un campo que llega del navegador o del modelo, ya limpio; null si no sirve. */
export function campoLimpio(bruto: unknown, usadas: Set<string>): CampoPlantilla | null {
    if (!bruto || typeof bruto !== 'object') return null
    const b = bruto as Record<string, unknown>
    const textos = (Array.isArray(b.textos) ? b.textos : typeof b.texto === 'string' ? [b.texto] : [])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.replace(/\r/g, ''))
        .filter((t) => t.trim().length > 0 && t.length <= MAX_TEXTO && !/[\n\t]/.test(t))
    if (textos.length === 0) return null
    const etiqueta = (typeof b.etiqueta === 'string' ? b.etiqueta : '').replace(/\s+/g, ' ').trim().slice(0, 60)
    const fuente: FuenteCampo = b.fuente === 'marcador' || b.fuente === 'raya' || b.fuente === 'manual' ? b.fuente : 'modelo'
    const base = typeof b.clave === 'string' && b.clave.trim() ? b.clave : etiqueta || textos[0]
    const corto = (v: unknown, n: number) => (typeof v === 'string' && v ? v.slice(0, n) : undefined)
    return {
        clave: claveUnica(base, usadas),
        etiqueta: etiqueta || etiquetaDe(textos[0]) || 'Dato',
        origen: origenValido(b.origen),
        ejemplo: typeof b.ejemplo === 'string' ? b.ejemplo.slice(0, MAX_TEXTO) : '',
        textos: Array.from(new Set(textos)).slice(0, 6),
        antes: corto(b.antes, 80),
        despues: corto(b.despues, 80),
        fuente,
        apariciones: typeof b.apariciones === 'number' ? b.apariciones : 0,
    }
}

/** El valor que escribió el abogado, sin lo que el XML no admite. */
export function valorLimpio(v: unknown): string | undefined {
    if (typeof v !== 'string') return undefined
    const t = v
        .replace(/\r\n?/g, '\n')
        .replace(/\t/g, ' ')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .slice(0, 4000)
    return t.trim() ? t : undefined
}

/** El nombre del archivo, sin lo que un sistema de archivos no admite. */
export function nombreDeArchivo(texto: string, extension = 'docx'): string {
    const limpio = texto
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 90)
        .trim()
    return `${limpio || 'Documento'}.${extension}`
}
