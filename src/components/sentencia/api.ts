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
    /** La excepción de plazo declarada, si el tipo tiene alguna: en la queja,
     *  «suspension» (dos días) u «omision_tramite» (en cualquier tiempo). */
    excepcionPlazo?: string;
    /** Los inhábiles que sólo conoce quien estuvo en el tribunal: el día que
     *  suspendió labores por una contingencia. Los del artículo 19, los fines
     *  de semana y las vacaciones del Poder Judicial ya los trae el servidor. */
    diasInhabilesExtra?: string[];
    /** Familia del asunto: decide el esqueleto del documento. */
    tipoAsunto?: string;
    responsable?: string;
    /** Ya no se manda: lo dice el tipo de asunto. Se conserva la clave para no
     *  romper llamadas viejas, pero el servidor la ignora. */
    esRecurso?: boolean;
    /** EL TRIBUNAL QUE RESUELVE. Sin él la competencia sale incompleta: es el
     *  dato que hace que esto sirva fuera de un solo circuito. */
    tribunal?: string;
    ciudad?: string;
    /** `generado` escribe el documento entero; `plantilla` rellena la vieja. */
    modo?: 'generado' | 'plantilla';
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
    /** `plantilla` es OPCIONAL: si no se manda, se usa la precargada de esa
     *  familia. Pedírsela era además la causa de un defecto real: quien subía
     *  un ADELANTO —que se detiene antes del resolutivo— recibía una sentencia
     *  sin RESUELVE ni puntos resolutivos. */
    documentos: { plantilla?: File; acto: File; conceptos: File },
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
    // LA OMISIÓN NO PUEDE SER LA REGLA DE UN TRIBUNAL. `tja_qro_boletin` es el
    // Boletín Jurisdiccional del Tribunal de Justicia Administrativa de
    // QUERÉTARO, y esto lo usan secretarios de toda la república: el cómputo de
    // uno de Yucatán se hacía con la regla de otro estado. La general es la
    // notificación personal, artículo 31, fracción I, de la Ley de Amparo.
    fd.append('regla_surtimiento', encargo.reglaSurtimiento ?? 'personal');
    // EL PLAZO NO SE MANDA SI NO SE DECLARA: cero significa «el que la ley da a
    // este tipo de asunto», y el servidor lo resuelve con el catálogo. Antes se
    // mandaban quince para todo, y una queja tiene cinco.
    fd.append('plazo', String(encargo.plazo ?? 0));
    if (encargo.excepcionPlazo) fd.append('excepcion_plazo', encargo.excepcionPlazo);
    // LOS INHÁBILES DE ESTE TRIBUNAL. El servidor trae los del artículo 19, los
    // fines de semana y las vacaciones del Poder Judicial; el día que ESTE
    // tribunal suspendió labores no lo sabe nadie más que quien estuvo ahí, y
    // sin él el plazo sale corto. Viajan separados por coma, en ISO.
    if (encargo.diasInhabilesExtra?.length) {
        fd.append('dias_inhabiles_extra', encargo.diasInhabilesExtra.join(','));
    }
    if (encargo.responsable) fd.append('responsable', encargo.responsable);
    fd.append('tipo_asunto', encargo.tipoAsunto ?? 'amparo_directo');
    // EL DOCUMENTO SE ESCRIBE ENTERO, NO SE RELLENA UNA PLANTILLA AJENA. Sin
    // este campo el taller cae en la ruta vieja: encabezado con el expediente
    // de otro asunto, catorce huecos y la estructura de un tribunal que no es
    // el tuyo. Todo lo ganado vive en `generado`, y la pantalla no lo pedía.
    fd.append('modo', encargo.modo ?? 'generado');
    if (encargo.tribunal) fd.append('tribunal', encargo.tribunal);
    if (encargo.ciudad) fd.append('ciudad', encargo.ciudad);
    if (documentos.plantilla) fd.append('plantilla', documentos.plantilla);
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

/** Lo que el acervo no tiene y el secretario sí.
 *
 * Cuando el motor no alcanza a proponer dice con precisión qué le falta —«el
 * acervo no contiene la cláusula 64»—. Esto permite dárselo: el contrato, el
 * convenio o el acta, o el contexto escrito a mano. No se guarda en el
 * servidor; vuelve aquí y viaja con la propuesta y con el estudio.
 */
export async function aportarContexto(
    userEmail: string, documento: File | null, texto: string,
): Promise<{ texto: string; caracteres: number }> {
    const fd = new FormData();
    fd.append('user_email', userEmail);
    if (texto.trim()) fd.append('texto', texto.trim());
    if (documento) fd.append('documento', documento);
    const res = await fetch(`${BASE}/taller/contexto`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = await res.json();
    return { texto: j.texto ?? '', caracteres: j.caracteres ?? 0 };
}


/** Lo que el motor propone para cada problema, antes de que el secretario decida. */
export interface PropuestaDeSolucion {
    problema: string;
    sentido: string;
    razon: string;
    apoyos: string[];
    confianza: string;
    alcanza: boolean;
}

export interface RespuestaPropuesta {
    propuestas: PropuestaDeSolucion[];
    resumen: string;
    avisos: string[];
    /** Esto se devuelve tal cual —o editado— para resolver con ella. */
    criteriosJson: string;
    modelo: string;
}

/** Pide al motor que proponga el sentido de cada problema.
 *
 * NO decide: propone. El secretario la acepta, la corrige o dicta la suya. Sin
 * este paso el proyecto salía con la calificación que trajera la plantilla, que
 * es como nacían las sentencias incongruentes.
 */
export async function proponerSolucion(
    numero: string, userEmail: string, contexto?: string,
): Promise<RespuestaPropuesta> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    if (contexto) fd.append('contexto', contexto);
    const res = await fetch(`${BASE}/taller/proponer`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = await res.json();
    return {
        propuestas: j.propuestas ?? [],
        resumen: j.resumen ?? '',
        avisos: j.avisos ?? [],
        criteriosJson: j.criterios_json ?? '',
        modelo: j.modelo ?? '',
    };
}


/** La sentencia, con el criterio del secretario dentro. */
export async function resolverConCriterio(
    numero: string, userEmail: string, criterio: Criterio | null,
    criteriosJson?: string, contexto?: string,
): Promise<ResultadoProyecto> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    // DOS CAMINOS Y NINGUNO ES «QUE SIGA COMO ESTÉ»: o el secretario dicta su
    // criterio, o devuelve la propuesta que acaba de leer —editada o no—.
    if (criteriosJson) {
        fd.append('criterios_json', criteriosJson);
    } else if (criterio) {
        fd.append('sentido', criterio.sentido);
        fd.append('problema', criterio.problema ?? '');
        fd.append('razonamiento', criterio.razonamiento ?? '');
    }
    if (contexto) fd.append('contexto', contexto);
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


/* ═══════════════════════════════════════════════════════════════════════════
   EL CATÁLOGO DE TIPOS DE ASUNTO
   ═══════════════════════════════════════════════════════════════════════════
   David: «lo primero sería preguntarle al usuario qué tipo de asunto va a
   proyectar; una vez que seleccione, desplegar los campos que lleva cada uno».

   La pantalla no necesita saber derecho —ni qué plazo tiene una queja, ni que
   una revisión fiscal no lleva «existencia del acto reclamado»—. Lo pregunta al
   servidor, donde vive la tabla, y lo pinta. Si mañana cambia un plazo se
   cambia en un sitio y la pantalla se entera sola. */

export interface ExcepcionPlazo {
    clave: string;
    cuando: string;
    dias: number | null;
    fundamento: string;
    en_cualquier_tiempo: boolean;
}

export interface TipoAsunto {
    clave: string;
    nombre: string;
    promovente: string;      // «quejoso» o «recurrente»
    combate: string;         // «conceptos de violación» o «agravios»
    recurrido: string;
    escrito: string;         // lo que el secretario sube
    plazo: { dias: number; fundamento: string };
    excepciones_de_plazo: ExcepcionPlazo[];
    apartados: { resultandos: string[]; considerandos: string[] };
    /** LAS FIGURAS DE PARTE DE ESTE TIPO. En un recurso no hay autoridad
     *  responsable: hay un órgano cuya resolución se recurre. Si la pantalla
     *  lo sigue pidiendo con el nombre del amparo, el secretario teclea una
     *  cosa y firma otra. */
    caratula?: { etiqueta: string; clave: string; obligatoria: boolean }[];
    medido_sobre: number;
}

export async function obtenerTipos(): Promise<TipoAsunto[]> {
    const r = await fetch(`${BASE}/taller/tipos`, { cache: 'force-cache' });
    if (!r.ok) throw new Error('No se pudo leer el catálogo de asuntos.');
    const d = await r.json();
    return (d.tipos ?? []) as TipoAsunto[];
}
