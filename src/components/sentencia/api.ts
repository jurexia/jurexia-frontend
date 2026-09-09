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
/** La predicción del acervo sobre UN problema. No es un pronóstico de lo que
 *  este tribunal hará: es la distribución de lo que hicieron otros sobre el
 *  mismo tema, y por eso la frase dice cuántas sentencias hay detrás. */
export interface PrediccionAcervo {
    sentido: string;
    porcentaje: number;
    n: number;
    confianza: 'alta' | 'media' | 'baja';
    frase: string;
}

export interface PropuestaDeSolucion {
    problema: string;
    sentido: string;
    razon: string;
    apoyos: string[];
    confianza: string;
    alcanza: boolean;
    /** La jurimetría de ESTE problema. Vacía si el acervo no dio base. */
    prediccion?: PrediccionAcervo;
    /** «principal» es aquel del que dependen los demás: si prospera, el
     *  estudio de los otros queda sin materia. */
    jerarquia?: 'principal' | 'accesorio';
}

/** Los tres modos de decidir el sentido. */
export type ModoDecision = 'acervo' | 'global' | 'por_problema';

/** La propuesta del ASUNTO ENTERO, no la de un problema.
 *  Antes no existía: la pantalla enseñaba la propuesta del problema principal
 *  con la etiqueta «solución global», que no es lo mismo —con tres problemas,
 *  el secretario veía el sentido de uno solo—. */
export interface SolucionGlobal {
    sentido: string;
    razon: string;
    /** De qué problema cuelga el resultado del asunto. */
    problema_que_decide: string;
    /** Qué les pasa a los demás problemas si ése se resuelve así. */
    efecto: string;
    apoyos: string[];
    confianza: string;
    /** El mejor argumento de quien resolvería al revés. Va en pantalla:
     *  quien lee es quien firma, y una propuesta sin su contra se acepta por
     *  inercia. */
    en_contra: string;
    /** false = el motor no alcanzó a proponerla. Se declara el hueco; no se
     *  rellena con la del problema principal. */
    alcanza: boolean;
    /** EL CONTEXTO EN PROSA. Cuatro párrafos que sustituyen al volcado del
     *  acervo: es lo primero que lee el secretario y con lo que forma su
     *  criterio, sin volver al expediente. */
    contexto: {
        hechos: string;
        resolvio: string;
        combate: string;
        tema_principal: string;
    };
    /** LA VÍA CONTRARIA, YA ESCRITA. Si el secretario no está de acuerdo,
     *  marca lo contrario y aparece en el acto —no espera otra llamada—.
     *  No es la propuesta negada: es cómo se sostendría la solución opuesta. */
    alternativa: {
        sentido: string;
        razon: string;
        efecto: string;
        apoyos: string[];
    };
    /** LA LISTA DE COMPROBACIÓN. Todos los temas con su suerte en las DOS
     *  vías. El servidor la completa contra los problemas reales: si el modelo
     *  omitió uno, aparece con la suerte SIN DETERMINAR. */
    checklist: {
        tema: string;
        papel: string;
        con_propuesta: string;
        con_alternativa: string;
        tema_distinto?: boolean;
    }[];
}

export interface RespuestaPropuesta {
    propuestas: PropuestaDeSolucion[];
    global?: SolucionGlobal | null;
    resumen: string;
    avisos: string[];
    /** Esto se devuelve tal cual —o editado— para resolver con ella. */
    criteriosJson: string;
    modelo: string;
    /** El recurso levanta un sobreseimiento y hay que estudiar los conceptos
     *  de violación por primera vez, pero no constan. El servidor ya daba el
     *  aviso; esto es lo que hace que la pantalla ofrezca DÓNDE pegarlos. */
    necesitaConceptos: boolean;
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
        global: j.global?.alcanza ? (j.global as SolucionGlobal) : null,
        resumen: j.resumen ?? '',
        avisos: j.avisos ?? [],
        criteriosJson: j.criterios_json ?? '',
        modelo: j.modelo ?? '',
        necesitaConceptos: Boolean(j.necesita_conceptos),
    };
}


/** La sentencia, con el criterio del secretario dentro. */
/** EL SENTIDO GLOBAL. El secretario dicta uno para el proyecto entero y el
 *  servidor lo reparte; si el problema PRINCIPAL resulta fundado, los
 *  accesorios quedan sin materia y el proyecto lo DICE en una frase en vez de
 *  contestarlos uno por uno. Los frenos —lo que pide mayor beneficio no se
 *  declara innecesario— viven en el servidor, que es donde se pueden probar. */
export async function resolverConSentidoGlobal(
    numero: string, userEmail: string, sentidoGlobal: string, contexto = '',
    razonGlobal = '', resolvioDeclarado = '', globalJson = '',
): Promise<ResultadoProyecto> {
    return resolverConCriterio(numero, userEmail, null, undefined, contexto,
                               sentidoGlobal, razonGlobal, resolvioDeclarado,
                               globalJson);
}

const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument'
                + '.wordprocessingml.document';


/** LA RESOLUCIÓN POR FLUJO, que es la que debe usarse.
 *
 *  POR QUÉ EXISTE ESTE CAMINO. El servidor lo tenía escrito y probado desde
 *  hacía tiempo y la pantalla no lo llamaba nunca: todo salía por
 *  /taller/resolver, que devuelve el .docx en una sola respuesta al cabo de
 *  varios minutos. Medido el 7-sep-2026 sobre la revisión 410/2026: dos veces
 *  seguidas el servidor TERMINÓ el trabajo —«POST /taller/resolver 200 · 4,031
 *  palabras», sin `WORKER TIMEOUT` ni traza en los registros— y la respuesta no
 *  llegó nunca. El proyecto existía y era inalcanzable.
 *
 *  El flujo no deja ese hueco largo: va emitiendo el estudio según se escribe,
 *  y al final manda el documento dentro del propio flujo. Además el secretario
 *  ve trabajar al sistema en vez de mirar cuatro minutos de pantalla quieta,
 *  que es lo que se siente como una avería.
 *
 *  `onTexto` recibe cada trozo del estudio según llega. */
export async function resolverEnVivo(
    numero: string, userEmail: string,
    opciones: {
        criterio?: Criterio | null; criteriosJson?: string; contexto?: string;
        sentidoGlobal?: string; razonGlobal?: string;
        resolvioDeclarado?: string; globalJson?: string;
        /* Los conceptos de violación, que el secretario pega cuando el
           recurso levanta un sobreseimiento: no constan en el expediente del
           recurso, y sin ellos el proyecto levanta el sobreseimiento sin
           resolver lo único que quedaba por resolver. */
        conceptosViolacion?: string;
    },
    onTexto?: (trozo: string) => void,
    onComponiendo?: () => void,
): Promise<ResultadoProyecto> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    const o = opciones || {};
    if (o.sentidoGlobal) {
        fd.append('modo_decision', 'global');
        fd.append('sentido_global', o.sentidoGlobal);
        if (o.razonGlobal?.trim()) fd.append('razonamiento', o.razonGlobal.trim());
    } else if (o.criteriosJson) {
        fd.append('criterios_json', o.criteriosJson);
    } else if (o.criterio) {
        fd.append('sentido', o.criterio.sentido);
        fd.append('problema', o.criterio.problema ?? '');
        fd.append('razonamiento', o.criterio.razonamiento ?? '');
    }
    if (o.contexto) fd.append('contexto', o.contexto);
    if (o.resolvioDeclarado?.trim())
        fd.append('resolvio_declarado', o.resolvioDeclarado.trim());
    if (o.globalJson?.trim()) fd.append('global_json', o.globalJson.trim());
    if (o.conceptosViolacion?.trim())
        fd.append('conceptos_violacion', o.conceptosViolacion.trim());

    const res = await fetch(`${BASE}/taller/resolver/stream`,
                            { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    if (!res.body) throw new Error('El servidor no devolvió un flujo.');

    const lector = res.body.getReader();
    const dec = new TextDecoder();
    let resto = '';
    let listo: Record<string, unknown> | null = null;

    for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        resto += dec.decode(value, { stream: true });
        /* Los eventos van separados por una línea en blanco. Se guarda lo que
           quede a medias: un trozo puede cortar un evento por la mitad. */
        const partes = resto.split('\n\n');
        resto = partes.pop() ?? '';
        for (const bruto of partes) {
            const linea = bruto.trim();
            if (!linea.startsWith('data:')) continue;
            let ev: Record<string, unknown>;
            try {
                ev = JSON.parse(linea.slice(5).trim());
            } catch {
                continue;               // un evento ilegible no tumba la corrida
            }
            if (ev.tipo === 'texto' && typeof ev.dato === 'string') {
                onTexto?.(ev.dato);
            } else if (ev.tipo === 'componiendo') {
                onComponiendo?.();
            } else if (ev.tipo === 'error') {
                throw new Error(String(ev.mensaje || 'Falló la generación.'));
            } else if (ev.tipo === 'listo') {
                listo = ev;
            }
        }
    }
    if (!listo) {
        throw new Error('El flujo terminó sin entregar el proyecto. '
                        + 'Puedes recuperarlo con «Descargar de nuevo».');
    }

    /* EL DOCUMENTO VIENE DENTRO DEL FLUJO, en base64. Si por lo que sea no
       viniera, se pide por /taller/descargar, que ahora lo busca también en el
       almacén y no sólo en el disco del proceso que lo generó. */
    let documento: Blob;
    const b64 = String(listo.docx_b64 || '');
    if (b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        documento = new Blob([bytes], { type: TIPO_DOCX });
    } else {
        const r2 = await fetch(
            `${BASE}/taller/descargar?numero=${encodeURIComponent(numero)}`
            + `&user_email=${encodeURIComponent(userEmail)}`);
        if (!r2.ok) return _fallo(r2);
        documento = await r2.blob();
    }
    const avisos = Array.isArray(listo.avisos) ? listo.avisos : [];
    const huecos = Array.isArray(listo.huecos) ? listo.huecos : [];
    return {
        documento,
        nombre: String(listo.nombre || `${numero.replace('/', '-')}.docx`),
        esBorrador: true,
        palabras: Number(listo.palabras || 0),
        avisos: avisos.length,
        huecos: huecos.length,
        tieneAdvertencias: Boolean(listo.advertencias),
    };
}


export async function resolverConCriterio(
    numero: string, userEmail: string, criterio: Criterio | null,
    criteriosJson?: string, contexto?: string,
    // TRES CAMINOS, UN SOLO ENDPOINT. El modo global no es una llamada aparte:
    // es el mismo /taller/resolver con otro campo. Duplicar la función habría
    // duplicado también el manejo de las cabeceras y de los avisos, que es
    // donde vive todo lo que el secretario tiene que leer.
    sentidoGlobal?: string,
    /* LA RAZÓN DEL SENTIDO GLOBAL. Viaja por el mismo campo `razonamiento` que
     * el criterio por problema: el servidor la pone sobre el problema
     * PRINCIPAL, que es del que cuelga todo lo demás. Sin ella el proyecto
     * salía con un sentido dictado y ninguna explicación detrás, y el estudio
     * se la inventaba. */
    razonGlobal?: string,
    /* QUÉ RESOLVIÓ EL ÓRGANO RECURRIDO —«sobreseyó», «negó», «concedió»—, tal
     * como lo resumió el motor al preparar la propuesta.
     *
     * Viaja de vuelta como `criteriosJson` y por la misma razón: el servidor
     * corre con dos workers y lo que guardó el que atendió /taller/proponer
     * puede no existir en el que atienda esto.
     *
     * Decide el VERBO DEL RESOLUTIVO cuando los antecedentes no llegan a
     * decirlo. En la revisión 410/2026 salió «Se ********* la sentencia
     * recurrida» tres párrafos después de que el estudio dijera «se confirma
     * la sentencia recurrida» y «debe mantener el sobreseimiento decretado»:
     * el dato estaba, pero no llegaba hasta aquí. */
    resolvioDeclarado?: string,
    /* LA PROPUESTA GLOBAL ENTERA, para que la vea el ESTUDIO —no sólo la
     * pantalla—. De qué problema cuelga el resultado, qué les pasa a los
     * demás, y la objeción más seria a la solución.
     *
     * Hasta ahora se calculaba, se enseñaba aquí y ahí se moría: en el
     * servidor `Global.bloque()` no lo llamaba nadie. El estudio escribía el
     * razonamiento sin saber cuál era la objeción que tenía que vencer, y por
     * eso declaraba los accesorios inoperantes con una etiqueta en vez de con
     * una razón. */
    globalJson?: string,
): Promise<ResultadoProyecto> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    if (sentidoGlobal) {
        fd.append('modo_decision', 'global');
        fd.append('sentido_global', sentidoGlobal);
    }
    // DOS CAMINOS Y NINGUNO ES «QUE SIGA COMO ESTÉ»: o el secretario dicta su
    // criterio, o devuelve la propuesta que acaba de leer —editada o no—.
    if (sentidoGlobal) {
        // ya va dictado arriba: no se manda criterio por problema, sólo la
        // razón, que es la que alinea el estudio entero.
        if (razonGlobal?.trim()) fd.append('razonamiento', razonGlobal.trim());
    } else if (criteriosJson) {
        fd.append('criterios_json', criteriosJson);
    } else if (criterio) {
        fd.append('sentido', criterio.sentido);
        fd.append('problema', criterio.problema ?? '');
        fd.append('razonamiento', criterio.razonamiento ?? '');
    }
    if (contexto) fd.append('contexto', contexto);
    if (resolvioDeclarado?.trim()) {
        fd.append('resolvio_declarado', resolvioDeclarado.trim());
    }
    if (globalJson?.trim()) fd.append('global_json', globalJson.trim());
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
    // NO «force-cache». El catálogo de asuntos CAMBIA: cuando se le añadió
    // `caratula` —las figuras de parte de cada tipo—, los navegadores que ya
    // tenían la respuesta guardada siguieron sirviendo la versión vieja, sin
    // ese campo. Efecto visible: en un amparo en REVISIÓN la ficha seguía
    // pidiendo «Quejoso» y «Autoridad responsable» —el respaldo escrito a
    // mano— en vez de «Recurrente» y «Recurrente adhesivo», y el secretario
    // tecleaba una figura que no existe en su asunto.
    //
    // Lo caro no es la petición —es un JSON pequeño— sino servir un catálogo
    // viejo sin que nadie se entere: no falla, sólo miente.
    // SE REINTENTA, PORQUE EL SERVIDOR ARRANCA EN FRÍO. Se pedía una sola vez
    // y, si fallaba, la ficha se quedaba muerta: sin tipos que elegir y sin
    // manera de volver a intentarlo. A David le pasó en mitad de una tarde de
    // despliegues —cada uno reinicia el servidor, y una petición que cae en ese
    // hueco falla—, y lo que vio fue su barra de trabajo de siempre sin nada
    // dentro. Un arranque en frío puede tardar cerca de un minuto: tres
    // intentos con esperas crecientes lo cubren de sobra.
    const esperas = [0, 2000, 5000, 12000];
    let ultimo = '';
    for (const espera of esperas) {
        if (espera) await new Promise((r) => setTimeout(r, espera));
        try {
            const r = await fetch(`${BASE}/taller/tipos`, { cache: 'no-cache' });
            if (r.ok) {
                const d = await r.json();
                const tipos = (d.tipos ?? []) as TipoAsunto[];
                if (tipos.length) return tipos;
                ultimo = 'el catálogo vino vacío';
            } else {
                ultimo = `el servidor respondió ${r.status}`;
            }
        } catch (e) {
            ultimo = e instanceof Error ? e.message : 'no hubo respuesta';
        }
    }
    throw new Error(`No se pudo leer el catálogo de asuntos (${ultimo}).`);
}

// ═══════════════════════════════════════════════════════════════════════════
// DESDE SISE · el expediente que ya está esperando
//
// David, mirando la pantalla después de que todo el servidor estuviera hecho:
// «no veo cómo generar el proyecto desde tcc-beta utilizando sise. No hay nada
// desplegado para conectar con SISE. Debería tener algún botón que diga
// "Generar desde SISE"».
//
// Tenía razón. La extensión dejaba el expediente en Iurexia, el servidor lo
// depuraba y lo sabía leer, y la pantalla no se había enterado de nada. Un
// camino al que no se puede entrar no existe.
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentoDepurado {
    que: string;
    paginas: string;
    n: number;
    caracteres: number;
}

export interface PendienteSISE {
    numero: string;
    tipoSise: string;
    organo: string;
    /** dd/mm/aaaa, tal como lo escribió SISE. Es una PISTA, no el dato. */
    presentacion: string;
    documentos: DocumentoDepurado[];
    /** Cuántas actuaciones traía el índice del Expediente Electrónico. */
    actuaciones: number;
    creadoEn: string;
}

/** Lo que el secretario tiene esperando, traído por la extensión. */
export async function sisePendiente(userEmail: string): Promise<PendienteSISE[]> {
    const url = `${BASE}/taller/sise-pendiente?user_email=${encodeURIComponent(userEmail)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json().catch(() => ({}));
    return ((j?.pendientes ?? []) as Record<string, unknown>[]).map((p) => ({
        numero: String(p.numero ?? ''),
        tipoSise: String(p.tipo_sise ?? ''),
        organo: String(p.organo ?? ''),
        presentacion: String(p.presentacion_sise ?? ''),
        actuaciones: Array.isArray(p.actuaciones) ? p.actuaciones.length : 0,
        creadoEn: String(p.creado_en ?? ''),
        documentos: (Array.isArray(p.inventario) ? p.inventario : [])
            .map((d) => {
                const x = d as Record<string, unknown>;
                return {
                    que: String(x.tipo ?? x.que ?? ''),
                    paginas: x.desde ? `${x.desde}-${x.hasta}` : '',
                    n: Number(x.paginas ?? 0),
                    caracteres: Number(x.caracteres ?? 0),
                };
            }),
    }));
}

/** Lo que el servidor ya sabe cuando todavía le falta la fecha. */
export interface FaltaLaFecha {
    dice: string;
    yaSabemos: Record<string, string>;
    documentos: DocumentoDepurado[];
}

export class NecesitaNotificacion extends Error {
    readonly datos: FaltaLaFecha;
    constructor(datos: FaltaLaFecha) {
        super(datos.dice);
        this.name = 'NecesitaNotificacion';
        this.datos = datos;
    }
}

export interface AdelantoDesdeSISE extends ResultadoAdelanto {
    /** Lo que se leyó de los autos, con su procedencia. */
    leido: string;
    /** El mapa del tomo: qué páginas son qué. */
    depuracion: string;
}

/**
 * Del expediente al adelanto sin formulario.
 *
 * La única fecha que se pide es la de notificación: no está en los escaneos y
 * es la que decide la extemporaneidad. Cuando falta, el servidor no la supone
 * —contesta 422 diciendo qué falta y enseñando todo lo que ya sabe—, y eso es
 * lo que `NecesitaNotificacion` trae de vuelta a la pantalla.
 */
export async function generarDesdeExpediente(
    numero: string,
    userEmail: string,
    notificacion: string,
    extra?: { magistrado?: string; secretario?: string; reglaSurtimiento?: string },
): Promise<AdelantoDesdeSISE> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('notificacion', notificacion);
    if (extra?.magistrado) fd.append('magistrado', extra.magistrado);
    if (extra?.secretario) fd.append('secretario', extra.secretario);
    if (extra?.reglaSurtimiento) fd.append('regla_surtimiento', extra.reglaSurtimiento);

    const res = await fetch(`${BASE}/taller/desde-expediente`, { method: 'POST', body: fd });

    if (res.status === 422) {
        // El 422 de la fecha viaja como JSON DENTRO de `detail`, porque así lo
        // empaqueta HTTPException. Si no es ése, se propaga tal cual.
        const j = await res.json().catch(() => ({}));
        try {
            const d = JSON.parse(String(j?.detail ?? ''));
            if (d?.falta === 'notificacion') {
                throw new NecesitaNotificacion({
                    dice: String(d.dice ?? ''),
                    yaSabemos: (d.ya_sabemos ?? {}) as Record<string, string>,
                    documentos: (d.documentos ?? []) as DocumentoDepurado[],
                });
            }
        } catch (e) {
            if (e instanceof NecesitaNotificacion) throw e;
        }
        throw new Error(String(j?.detail ?? 'Faltan datos del expediente.'));
    }
    if (!res.ok) {
        let detalle = `Error ${res.status}`;
        try { detalle = (await res.json())?.detail ?? detalle; } catch { /* no JSON */ }
        throw new Error(String(detalle));
    }

    const c = res.headers;
    const disp = c.get('content-disposition') || '';
    const nombre = /filename="?([^";]+)"?/.exec(disp)?.[1]
        ?? `${numero.replace('/', '-')} ADELANTO.docx`;
    return {
        documento: await res.blob(),
        nombre,
        oportunidad: (c.get('X-Oportunidad') as ResultadoAdelanto['oportunidad']) ?? null,
        problemas: Number(c.get('X-Problemas') ?? 0),
        huecos: Number(c.get('X-Huecos') ?? 0),
        avisos: Number(c.get('X-Avisos') ?? 0),
        leido: c.get('X-Leido') ?? '',
        depuracion: c.get('X-Depuracion') ?? '',
    };
}

/** De dónde se baja el complemento.
 *
 *  Va por Iurexia, no por la URL del API. A un secretario se le está pidiendo
 *  que cargue en su navegador un programa que leerá el expediente de un
 *  particular: que el enlace sea del sitio que ya conoce no es cosmética, es lo
 *  que permite reconocer de quién viene. La ruta hace de puente al API, que lo
 *  empaqueta al vuelo; no hay copia que se quede vieja. */
export const URL_EXTENSION = '/api/complemento';
/** La página con los pasos y la política, por si prefiere leer antes. */
export const URL_COMPLEMENTO = '/complemento';

/** A dónde se vuelve para tomar otro asunto. */
export const URL_SISE =
    'https://sise.cjf.gob.mx/Sise/ExpedienteElectronico/PanelCentralDeConsultas/PanelCentralDeConsultas.aspx';

/**
 * Borra el expediente que esperaba, para trabajar en otro.
 *
 * Borra la fila entera, no sólo los PDF: cuando el secretario dice que ese
 * asunto ya no le interesa, no queda nada que auditar y sí un expediente ajeno
 * del que Iurexia no tiene por qué conservar el rastro.
 */
export async function descartarPendiente(numero: string, userEmail: string): Promise<void> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    const res = await fetch(`${BASE}/taller/sise-descartar`, { method: 'POST', body: fd });
    if (!res.ok) {
        let detalle = `Error ${res.status}`;
        try { detalle = (await res.json())?.detail ?? detalle; } catch { /* no JSON */ }
        throw new Error(String(detalle));
    }
}
