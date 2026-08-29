/**
 * La llamada del taller al backend.
 *
 * Un solo viaje: se mandan los dos documentos, la plantilla del propio tribunal
 * y los datos que el secretario confirma, y vuelve el .docx.
 *
 * LA VÍA Y EL PLAZO VIAJAN COMO CAMPOS, no se adivinan en el servidor. Está
 * medido: infiriendo la vía por palabra clave el cómputo se iba ±1 día en la
 * mitad de los casos, y un plazo mal contado invalida la sentencia. Los
 * confirma quien los tiene delante.
 */

export interface EncargoAdelanto {
    numero: string;                 // «512/2026»
    encabezado: string;             // «AMPARO DIRECTO ADMINISTRATIVO: 512/2026»
    quejoso: string;
    magistrado: string;
    secretario: string;
    notificacion: string;           // ISO, 2026-05-11
    presentacion: string;
    reglaSurtimiento?: string;
    plazo?: number;
    responsable?: string;
    esRecurso?: boolean;
}

export interface ResultadoAdelanto {
    /** El .docx, listo para descargar o previsualizar. */
    documento: Blob;
    nombre: string;
    /** Lo que hay que leer ANTES de abrir el documento. */
    oportunidad: 'en-tiempo' | 'EXTEMPORANEA' | null;
    problemas: number;
    huecos: number;
    avisos: number;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function generarAdelanto(
    encargo: EncargoAdelanto,
    documentos: { plantilla: File; acto: File; conceptos: File },
    userEmail: string,
): Promise<ResultadoAdelanto> {
    const fd = new FormData();
    fd.append('numero', encargo.numero);
    fd.append('encabezado', encargo.encabezado);
    fd.append('quejoso', encargo.quejoso);
    fd.append('magistrado', encargo.magistrado);
    fd.append('secretario', encargo.secretario);
    fd.append('notificacion', encargo.notificacion);
    fd.append('presentacion', encargo.presentacion);
    fd.append('user_email', userEmail);
    fd.append('regla_surtimiento', encargo.reglaSurtimiento ?? 'tja_qro_boletin');
    fd.append('plazo', String(encargo.plazo ?? 15));
    if (encargo.responsable) fd.append('responsable', encargo.responsable);
    fd.append('es_recurso', String(!!encargo.esRecurso));
    fd.append('plantilla', documentos.plantilla);
    fd.append('acto', documentos.acto);
    fd.append('conceptos', documentos.conceptos);

    const res = await fetch(`${BASE}/taller/adelanto`, { method: 'POST', body: fd });

    if (!res.ok) {
        // El backend contesta 403 sin plan y 400 si no pudo leer un documento.
        // Se propaga su mensaje, que es más útil que un «error» genérico.
        let detalle = `Error ${res.status}`;
        try { detalle = (await res.json())?.detail ?? detalle; } catch { /* cuerpo no JSON */ }
        throw new Error(detalle);
    }

    const cabecera = res.headers;
    const disp = cabecera.get('content-disposition') || '';
    const nombre = /filename="?([^";]+)"?/.exec(disp)?.[1]
        ?? `${encargo.numero.replace('/', '-')} ADELANTO.docx`;

    return {
        documento: await res.blob(),
        nombre,
        oportunidad: (cabecera.get('X-Oportunidad') as ResultadoAdelanto['oportunidad']) ?? null,
        problemas: Number(cabecera.get('X-Problemas') ?? 0),
        huecos: Number(cabecera.get('X-Huecos') ?? 0),
        avisos: Number(cabecera.get('X-Avisos') ?? 0),
    };
}

/** Ofrece el .docx al navegador. */
export function descargar(r: ResultadoAdelanto): void {
    const url = URL.createObjectURL(r.documento);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════
   La segunda mitad: entre estas dos llamadas hay una PERSONA

   El circuito está partido a propósito. La máquina lee y ordena; el secretario
   decide; la máquina redacta la demostración. `consultarAcervo` le enseña lo
   que la jurisprudencia dice de SUS problemas, y sólo después `resolver` recibe
   su criterio. Pedirle el sentido sin enseñarle antes la jurisprudencia
   obligatoria del tema es justo el error que este taller existe para evitar.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TesisDelAcervo {
    registro: string;
    rubro: string;
    instancia: string;
    /** Vincula al tribunal. La orientadora sólo ilustra: no se tratan igual. */
    obligatoria: boolean;
    localizacion: string;
    texto: string;
}

export interface ProblemaDelCaso {
    pregunta: string;
    /** Qué resolvió la responsable sobre este punto. */
    resolvio: string;
    /** El concepto o agravio que lo combate. */
    combate: string;
    /** Impedimento técnico que llevaría a inoperancia, si el pipeline lo advierte. */
    impedimento?: { motivo: string; explicacion: string } | null;
}

export interface MaterialDelCaso {
    expediente: string;
    problema_global: string;
    problemas: ProblemaDelCaso[];
    tesis: TesisDelAcervo[];
    normas: { cuerpo_legal: string; articulo: string; texto: string }[];
    avisos: string[];
}

export interface EstadoPiloto {
    activo: boolean;
    secretarios: number;
    cupo: number;
    tiene_acceso: boolean;
    aviso: string;
}

async function _fallo(res: Response): Promise<never> {
    let detalle = `Error ${res.status}`;
    try { detalle = (await res.json())?.detail ?? detalle; } catch { /* no JSON */ }
    throw new Error(detalle);
}

/** Si el piloto sigue abierto y cuántas plazas quedan. */
export async function estadoPiloto(userEmail: string): Promise<EstadoPiloto> {
    const res = await fetch(
        `${BASE}/taller/estado?user_email=${encodeURIComponent(userEmail)}`);
    if (!res.ok) return _fallo(res);
    return res.json();
}

/** Lo que el acervo dice sobre los problemas de ESTE asunto. */
export async function consultarAcervo(
    numero: string, userEmail: string, coleccionEstatal = 'leyes_queretaro',
): Promise<MaterialDelCaso> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('coleccion_estatal', coleccionEstatal);
    const res = await fetch(`${BASE}/taller/consultar`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    return res.json();
}

export interface Criterio {
    /** fundado | infundado | inoperante | ineficaz */
    sentido: string;
    problema?: string;
    /** El PORQUÉ. Es lo que de verdad alinea el estudio con su cabeza. */
    razonamiento?: string;
}

export interface ResultadoProyecto {
    documento: Blob;
    nombre: string;
    /** Siempre true por ahora: esto NO es un proyecto firmable. */
    esBorrador: boolean;
    palabras: number;
    avisos: number;
    huecos: number;
    /** El sistema encontró un obstáculo al sentido dictado y lo dice aparte. */
    tieneAdvertencias: boolean;
}

/** La sentencia, con el criterio del secretario dentro. */
export async function resolverConCriterio(
    numero: string, userEmail: string, criterio: Criterio,
): Promise<ResultadoProyecto> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('sentido', criterio.sentido);
    fd.append('problema', criterio.problema ?? '');
    fd.append('razonamiento', criterio.razonamiento ?? '');
    const res = await fetch(`${BASE}/taller/resolver`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);

    const h = res.headers;
    const disp = h.get('content-disposition') || '';
    return {
        documento: await res.blob(),
        nombre: /filename="?([^";]+)"?/.exec(disp)?.[1]
            ?? `${numero.replace('/', '-')} PROYECTO.docx`,
        esBorrador: h.get('X-Borrador') === '1',
        palabras: Number(h.get('X-Palabras') ?? 0),
        avisos: Number(h.get('X-Avisos') ?? 0),
        huecos: Number(h.get('X-Huecos') ?? 0),
        tieneAdvertencias: h.get('X-Advertencias') === '1',
    };
}

/** Ofrece cualquiera de los dos documentos al navegador. */
export function descargarProyecto(r: ResultadoProyecto): void {
    const url = URL.createObjectURL(r.documento);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
