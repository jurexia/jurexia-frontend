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

import type { ApoyoDeLaVia, ConceptosOmitidos, FichaProcesal, FuerzaDelApoyo, ProbabilidadDeLaTarjeta, SolucionPosible, SuerteDelSecundario, TarjetaDecision, ViaDeLaTarjeta } from './tipos';

export interface EncargoAdelanto {
    numero: string;                 // «512/2026»
    encabezado: string;             // «AMPARO DIRECTO ADMINISTRATIVO: 512/2026»
    quejoso: string;
    /** Quien recurre, cuando NO es el quejoso (23-sep-2026, 711/2025: recurrió
     *  la UIF contra la concesión). El amparo se concede o niega al quejoso;
     *  el recurso se califica al recurrente. Vacío = son la misma persona. */
    recurrente?: string;
    magistrado: string;
    secretario: string;
    notificacion: string;           // ISO, 2026-05-11
    presentacion: string;
    reglaSurtimiento?: string;
    /** Sólo cuando reglaSurtimiento === 'otra': la fecha, ISO, en que el
     *  secretario declara que la notificación surtió efectos. */
    surteEfectos?: string;
    plazo?: number;
    /** La excepción de plazo declarada, si el tipo tiene alguna: en la queja,
     *  «suspension» (dos días) u «omision_tramite» (en cualquier tiempo). */
    excepcionPlazo?: string;
    /** Los inhábiles que sólo conoce quien estuvo en el tribunal: el día que
     *  suspendió labores por una contingencia. Los del artículo 19, los fines
     *  de semana y las vacaciones del Poder Judicial ya los trae el servidor. */
    diasInhabilesExtra?: string[];
    /** Los días en que NO laboró la responsable, en tramos. Sólo se aplican
     *  donde el escrito se presenta ante ella: amparo directo y revisión
     *  fiscal (P./J. 4/2022, registro 2024494). */
    inhabilesResponsable?: string;
    /** La materia, que decide en qué acervo se busca la ley. */
    materia?: string;
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
    if (encargo.recurrente?.trim()) fd.append('recurrente', encargo.recurrente.trim());
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
    if (encargo.reglaSurtimiento === 'otra' && encargo.surteEfectos)
        fd.append('surte_efectos', encargo.surteEfectos);
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
    // Y los de la RESPONSABLE, que son otra lista y se fundan en otro artículo.
    if (encargo.inhabilesResponsable?.trim())
        fd.append('inhabiles_responsable', encargo.inhabilesResponsable.trim());
    }
    if (encargo.responsable) fd.append('responsable', encargo.responsable);
    fd.append('tipo_asunto', encargo.tipoAsunto ?? 'amparo_directo');
    // LA MATERIA, que elige el acervo con el que se funda. Vacía = dedúcela.
    if (encargo.materia) fd.append('materia', encargo.materia);
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
    /** En qué acervo se buscó. Decide con qué ley se funda el proyecto. */
    materia?: string;
    /** ═══ EL ESPEJO DEL PROPIO TRIBUNAL ═══
     *  Las sentencias del tribunal que redacta sobre este mismo punto. No es
     *  un recuento y no acusa: son seis sentencias suyas que puede abrir.
     *  Llega vacío cuando el tribunal no ha visto el punto, cuando el asunto
     *  es de un circuito sin mapa de tribunales, o cuando el API es anterior
     *  a esta función: en los tres casos la tarjeta no se pinta. */
    espejo?: EspejoDelTribunal[];
    avisos: string[];
}

/** Una sentencia del propio tribunal en la tarjeta del espejo.
 *
 *  DOS FUENTES, UNA FORMA. Las filas del acervo viejo traen sólo los siete
 *  primeros campos; las del índice de la OAJ traen además `similitud` y lo que
 *  cuelga de ella. La pantalla distingue por `similitud`: si no viene, la fila
 *  se pinta como siempre. */
export interface FilaEspejo {
    tipo_asunto: string;
    expediente: string;
    /** ISO en el acervo viejo, dd-mm-aaaa en el de la OAJ. Puede venir vacía:
     *  hay sentencias sin fecha en el acervo. */
    fecha: string;
    /** La palabra que el acervo guardó, sin traducir. En la OAJ puede venir
     *  vacía. */
    sentido: string;
    tema: string;
    score: number;
    /** Vacío en las filas de la OAJ: no hay PDF por enlace directo. */
    pdf_url: string;
    /** ═══ SÓLO EN LAS FILAS DE LA OAJ ═══
     *  Porcentaje ENTERO, ya calibrado: no es el coseno. Es la probabilidad
     *  REAL de la tabla, redondeada hacia abajo: 85 o más en el nivel «mismo
     *  problema», de 50 a 84 en el «posible». Nunca pasa de 99: con un centenar
     *  de pares medidos no se afirma certeza. El nombre del campo es histórico:
     *  NO es un parecido de texto, y la pantalla no lo llama «similitud». */
    similitud?: number;
    /** True cuando la tabla no midió ESE coseno —cae en un hueco entre tramos,
     *  o por encima del último sostenido por tres pares— y `similitud` es el
     *  número del tramo de abajo: la probabilidad es ésa O MÁS. La pantalla
     *  escribe «57% o más». Sin el campo (un API anterior), exacta. */
    cota_inferior?: boolean;
    /** «planteamiento» si coincidió un planteamiento del precedente; «tema» si
     *  fue el respaldo por el tema del asunto (entonces no hay pregunta, razón
     *  ni calificación). */
    fuente?: 'planteamiento' | 'tema';
    /** El nivel de la fila (David, 28-sep-2026, «opción 1 + 2»):
     *  «mismo_problema», probabilidad calibrada de 85% o más, hasta seis por
     *  planteamiento; «posible», de 50% a 84%, hasta tres y sólo por
     *  planteamiento, para revisarlo a mano. Una sentencia sale en un solo
     *  nivel. Sin el campo —un API anterior— la fila es del nivel de arriba:
     *  entonces sólo llegaban las de 85% o más. */
    nivel?: 'mismo_problema' | 'posible';
    /** La pregunta del planteamiento del precedente. */
    pregunta?: string;
    /** Por qué se calificó así, en palabras del índice. */
    razon?: string;
    /** Fundado, infundado, inoperante… literal: no se traduce. */
    calificacion?: string;
    autoridad?: string;
    /** El número de expediente único de la OAJ, para pegarlo en su buscador:
     *  no hay enlace profundo por NEUN. */
    neun?: number;
    /** El Buscador de la OAJ. */
    enlace_oaj?: string;
}

export interface EspejoDelTribunal {
    /** El planteamiento al que corresponden estas sentencias. */
    problema: string;
    /** El nombre largo del tribunal, para leerlo. */
    tribunal: string;
    /** En la fuente de la OAJ, primero las «mismo_problema» y detrás las
     *  «posible». Un grupo puede traer sólo posibles. */
    filas: FilaEspejo[];
    /** El renglón que describe las filas. Vacío cuando no se puede resumir sin
     *  mentir: tipos de asunto mezclados, o etiqueta que ya trae el resultado.
     *  Y SIEMPRE vacío en la fuente de la OAJ: el sentido de la fila es el de
     *  la sentencia y la coincidencia es con uno de sus planteamientos, así que
     *  contarlos cruza dos escalas; cada fila trae ya su calificación. */
    resumen: string;
    cobertura: string;
}

export interface EstadoPiloto {
    activo: boolean;
    secretarios: number;
    cupo: number;
    tiene_acceso: boolean;
    aviso: string;
    /** El camino de SISE está cerrado salvo para administración y testers.
     *  Lo decide el servidor, no la pantalla. */
    puede_sise?: boolean;
    /** Cuántos proyectos le quedan y de dónde salen. */
    proyectos?: BolsaProyectos;
    /** Ocupó uno de los diez asientos del piloto y conserva el acceso. */
    del_piloto?: boolean;
    /** CUENTA DE CASA (26-sep-2026): administración y testers, las únicas a
     *  las que el servidor les admite elegir la variante del prompt del
     *  estudio. Si el servidor no lo manda, la pantalla usa `puede_sise`, que
     *  sale de la misma lista (`_taller_sin_tope`). */
    es_casa?: boolean;
}

/** LAS TRES BOLSAS. La del mes caduca, las recargas no, y la prueba es de por
 *  vida. `restantes` ya las suma: es lo que la pantalla enseña. */
export interface BolsaProyectos {
    mes_usados: number;
    mes_limite: number;
    recargados: number;
    prueba_usados: number;
    prueba_max: number;
    restantes: number;
    /** Administración y testers: no se les cuenta nada. */
    sin_limite: boolean;
    almacenamiento_bytes: number;
    almacenamiento_limite: number;
}

/* ═══ EL ERROR DEL SERVIDOR, LEGIBLE (26-sep-2026) ═══
   Tras un cambio de sentido, si la recalificación no llega, el servidor ya
   no genera con accesorios sin calificar: el flujo manda un evento «error» y
   el camino plano contesta 409, los dos con la lista de los que faltan. Hoy
   la lista viaja DENTRO del texto (`recalificar.aviso_sin_calificar`: «…SIN
   CALIFICAR TRAS TU CAMBIO DE SENTIDO: «P1» · «P2». Con el principal…»), en
   un solo renglón que no se lee; aquí se parte en un renglón por
   planteamiento (la pantalla lo pinta con los saltos). Y por si el servidor
   la manda aparte: un `detail` que no es texto se pintaba «[object
   Object]»; se acepta un objeto con el mensaje (`mensaje`, `message`,
   `detail` o `error`) y la lista (`sin_calificar`, `pendientes`,
   `problemas`, `accesorios` o `lista`: cada uno texto u objeto con
   `problema`/`pregunta`). */
const _CAMPOS_MENSAJE = ['mensaje', 'message', 'detail', 'error'] as const;
const _CAMPOS_LISTA = ['sin_calificar', 'pendientes', 'problemas', 'accesorios', 'lista'] as const;
const _LARGO_RENGLON = 220;
function _renglon(x: unknown): string {
    const o = (x && typeof x === 'object') ? x as Record<string, unknown> : null;
    const t = String((o ? (o.problema ?? o.pregunta ?? o.texto ?? '') : (x ?? '')) || '')
        .replace(/\s+/g, ' ').trim();
    const cps = Array.from(t);
    return cps.length > _LARGO_RENGLON ? `${cps.slice(0, _LARGO_RENGLON - 1).join('').trimEnd()}…` : t;
}
/** «…: «a» · «b». Sigue…» → «…:\n· «a»\n· «b»\nSigue…». Sólo la lista de
 *  planteamientos entre comillas latinas tras dos puntos —de dos o más, o de
 *  uno si lo que la abre dice «sin calificar»—; lo demás, igual. */
const _RX_LISTA_EN_TEXTO = /:\s+(«[^«»]*»(?:\s+·\s+«[^«»]*»)*)(?:\.\s+|\.?$)/;
function _listaEnRenglones(t: string): string {
    const m = _RX_LISTA_EN_TEXTO.exec(t);
    if (!m) return t;
    const items = m[1].split(/\s+·\s+(?=«)/);
    if (items.length < 2 && !/sin calificar/i.test(t.slice(0, m.index))) return t;
    return `${t.slice(0, m.index)}:\n${items.map((x) => `· ${x}`).join('\n')}\n${t.slice(m.index + m[0].length)}`.trim();
}
export function textoDelError(detalle: unknown, porOmision = 'Falló la petición.'): string {
    if (typeof detalle === 'string') return _listaEnRenglones(detalle.trim()) || porOmision;
    if (Array.isArray(detalle)) {
        // La validación de FastAPI: [{loc, msg, type}, …].
        const msgs = detalle.map((d) => (d && typeof d === 'object' && 'msg' in d
            ? String((d as Record<string, unknown>).msg) : _renglon(d))).filter(Boolean);
        return msgs.length ? msgs.join('\n') : porOmision;
    }
    if (!detalle || typeof detalle !== 'object') return porOmision;
    const o = detalle as Record<string, unknown>;
    let mensaje = '';
    for (const k of _CAMPOS_MENSAJE) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) { mensaje = _listaEnRenglones(v.trim()); break; }
        // Anidado: {detail: {mensaje, sin_calificar}}.
        if (v && typeof v === 'object' && !Array.isArray(v)) return textoDelError(v, porOmision);
    }
    let lista: string[] = [];
    for (const k of _CAMPOS_LISTA) {
        const v = o[k];
        if (Array.isArray(v)) { lista = v.map(_renglon).filter(Boolean); if (lista.length) break; }
    }
    // Si el mensaje ya trae el planteamiento, no se repite debajo.
    const renglones = lista.filter((r) => !mensaje.includes(r)).map((r) => `· ${r}`);
    if (!mensaje && !renglones.length) return porOmision;
    return [mensaje || porOmision, ...renglones].join('\n');
}

async function _fallo(res: Response): Promise<never> {
    let detalle: unknown = `Error ${res.status}`;
    try {
        const j = await res.json();
        if (j && typeof j === 'object' && 'detail' in j && j.detail != null) detalle = j.detail;
    } catch { /* no JSON */ }
    throw new Error(textoDelError(detalle, `Error ${res.status}`));
}

/* ═══ LA RED DEL DESPACHO PARPADEA, Y ESO NO ES UN FALLO DEL TALLER (2-oct-2026) ═══
   El 1-oct dos generaciones de la cuenta de casa acabaron en la pantalla con
   «Failed to fetch», y el secretario las volvió a pedir aunque el servidor las
   seguía escribiendo («se cortó la línea con la pantalla; el 253/2025 se sigue
   escribiendo en segundo plano»): dos proyectos por uno, y dos esperas. El
   despacho sale a internet por dos líneas y, cuando una parpadea, la petición
   que iba por ella muere SIN respuesta. «Failed to fetch» (Chrome), «Load
   failed» (Safari) y «NetworkError…» (Firefox) son eso: la red, no el servidor.

   Dos reglas: una LECTURA se repite sola (repetirla no cuesta nada) y el error
   de red se dice en castellano, con lo que conviene hacer. Un POST no se repite
   aquí: repetir /resolver podría lanzar dos generaciones y cobrar dos. */
export function esErrorDeRed(e: unknown): boolean {
    if (!(e instanceof TypeError)) return false;
    const m = (e.message || '').toLowerCase();
    return m.includes('failed to fetch') || m.includes('load failed')
        || m.includes('networkerror') || m.includes('network error')
        || m.includes('network request failed');
}

const MENSAJE_RED = 'Se perdió la conexión con el servidor por un momento.';

/** Lo que se le enseña al secretario cuando algo falla: el texto del servidor
 *  si lo hay; si fue la red, en castellano y con qué hacer. Durante una
 *  generación, lo que más importa decirle es que NO la repita a ciegas: el
 *  servidor la termina, la cobra y la guarda aunque la pantalla se desconecte. */
export function mensajeDeError(e: unknown, porOmision: string,
                               durante?: 'generacion'): string {
    if (esErrorDeRed(e)) {
        return durante === 'generacion'
            ? `${MENSAJE_RED} Si el proyecto ya se estaba escribiendo, el servidor lo `
              + 'termina y lo guarda igual: en unos minutos estará en el historial de '
              + 'este asunto. Revísalo antes de volver a generarlo.'
            : `${MENSAJE_RED} Vuelve a intentarlo.`;
    }
    return e instanceof Error && e.message ? e.message : porOmision;
}

/** El texto de un error tal como se va a pintar: si es el mensaje crudo del
 *  navegador por un corte de red, se dice en castellano. Cubre de una vez las
 *  acciones de la pantalla que pasan `e.message` tal cual (proponer, consultar,
 *  el adelanto…). */
export function textoVisibleDelError(t: string): string {
    const m = (t || '').trim().toLowerCase();
    const crudo = m === 'failed to fetch' || m === 'load failed' || m === 'network error'
        || m === 'network request failed' || m.startsWith('networkerror');
    return crudo ? `${MENSAJE_RED} Vuelve a intentarlo.` : t;
}

/** Una LECTURA (GET) que se repite sola si la red parpadea: hasta tres veces
 *  más, a 1, 3 y 6 segundos. Sólo para lecturas. */
export async function leerConReintento(url: string, init?: RequestInit): Promise<Response> {
    const esperas = [1_000, 3_000, 6_000];
    for (let i = 0; ; i++) {
        try {
            return await fetch(url, init);
        } catch (e) {
            if (!esErrorDeRed(e) || i >= esperas.length) throw e;
            await new Promise<void>((r) => setTimeout(r, esperas[i]));
        }
    }
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
    /** LO QUE EL SECRETARIO YA SABE, ANTES DE BUSCAR.
     *  Va aquí, en la llamada que consulta el acervo, y no sólo en la que
     *  propone: el servidor lo usa como ancla propia de la búsqueda. */
    contexto = '',
): Promise<MaterialDelCaso> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('coleccion_estatal', coleccionEstatal);
    if (contexto.trim()) fd.append('contexto', contexto.trim());
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
    /** QUÉ dicen esos avisos, no cuántos son.
     *
     *  Se contaban y se tiraban los textos. Entre ellos venía el único que
     *  importaba de verdad —«El criterio pedía X y esa calificación no aparece
     *  en el estudio»—, así que el secretario recibía «3 avisos» y un recuadro
     *  genérico de «no es firmable», sin manera de saber que el sistema había
     *  desobedecido su instrucción. */
    textoAvisos: string[];
    textoHuecos: string[];
    /** Con qué número de versión se archivó. Es la llave de la opinión del
     *  secretario: se opina sobre ESA versión, no sobre el expediente. */
    version?: number;
    /** DÓNDE CONTESTÓ EL ESTUDIO CADA ARGUMENTO (Paso 2, 26-sep-2026). Sólo con
     *  las variantes que escriben marcas (v3/v4); null en las demás. */
    mapa?: MapaDelEstudio | null;
    /** LO QUE CORRIGIÓ EL SUPERVISOR antes de entregar (2-oct-2026, CONTRATO
     *  D). null/undefined = no hubo supervisor (bandera apagada o un servidor
     *  anterior). */
    supervisor?: SupervisorDelProyecto | null;
}

/* ═══ LA OPINIÓN DEL SECRETARIO SOBRE CADA PROYECTO ═══
   David (24-sep-2026): «al término de cada proyecto abrir un cuadro de texto
   con formato visual profesional para que el usuario escriba sus puntos de
   vista y aspectos a mejorar en el taller y, particularmente, en la calidad
   de las sentencias que entrega». Se guarda contra la versión exacta, con la
   foto de sus avisos, y la lee el auditor del panel de administración. */
export type Correccion = 'nada' | 'poco' | 'mucho' | 'rehecho';
export interface OpinionProyecto {
    calificacion: number | null;
    correccion: Correccion | null;
    aspectos: Record<string, 'bien' | 'mejorar'>;
    sobre_sentencia: string;
    sobre_taller: string;
}
export interface AspectoCalificable { clave: string; etiqueta: string }

export async function leerOpinion(
    numero: string, userEmail: string, version = 0,
): Promise<{ opinion: (OpinionProyecto & { version: number }) | null; aspectos: AspectoCalificable[] }> {
    const q = new URLSearchParams({ numero, user_email: userEmail, version: String(version || 0) });
    const res = await fetch(`${BASE}/taller/opinion?${q.toString()}`);
    if (!res.ok) return _fallo(res);
    const j = await res.json();
    return { opinion: j.opinion ?? null, aspectos: (j.aspectos ?? []) as AspectoCalificable[] };
}

export async function guardarOpinion(
    numero: string, userEmail: string, version: number, o: OpinionProyecto,
): Promise<void> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('version', String(version || 0));
    if (o.calificacion) fd.append('calificacion', String(o.calificacion));
    if (o.correccion) fd.append('correccion', o.correccion);
    fd.append('aspectos_json', JSON.stringify(o.aspectos || {}));
    fd.append('sobre_sentencia', o.sobre_sentencia || '');
    fd.append('sobre_taller', o.sobre_taller || '');
    const res = await fetch(`${BASE}/taller/opinion`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
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
    /** Contra qué expediente. Sin esto el servidor no puede guardarlo,
     *  y entonces la BÚSQUEDA no se entera de lo que el secretario sabe. */
    numero = '',
    /** A qué constancia responde, cuando el motor la pidió por su nombre: el
     *  aporte viaja rotulado «[CONSTANCIA · …]» y así el estudio sabe cuál
     *  llegó y cuál sigue faltando. */
    etiqueta = ''
): Promise<{ texto: string; caracteres: number; clase: ClaseDeContexto; rotulo: string }> {
    const fd = new FormData();
    fd.append('user_email', userEmail);
    if (texto.trim()) fd.append('texto', texto.trim());
    if (documento) fd.append('documento', documento);
    if (numero) fd.append('numero', numero);
    if (etiqueta) fd.append('etiqueta', etiqueta);
    const res = await fetch(`${BASE}/taller/contexto`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = await res.json();
    return { texto: j.texto ?? '', caracteres: j.caracteres ?? 0,
             clase: (j.clase as ClaseDeContexto) ?? 'otro', rotulo: j.rotulo ?? '' };
}

/** QUÉ ES LO QUE EL SECRETARIO APORTÓ. El servidor lo clasifica: si es la
 *  resolución que decidió una violación procesal —la interlocutoria de la
 *  reclamación, el acuerdo de preclusión— el motor la trata como la razón
 *  toral a confrontar, no como un papel más. ADC 93/2026. */
export type ClaseDeContexto = 'resolucion_procesal' | 'constancia' | 'otro';

/** Un criterio tal como viaja a /taller/reparto y a /taller/resolver: con la
 *  marca de si lo puso el secretario a mano (`tocado`), que es lo que el
 *  árbol de decisión del servidor no toca. */
export interface CriterioEnviado {
    problema: string;
    sentido: string;
    razonamiento: string;
    jerarquia: 'principal' | 'accesorio';
    tocado: boolean;
    grupo?: string;
    prediccion?: PrediccionAcervo | Record<string, never>;
}

/** Lo que devuelve /taller/reparto por criterio: el sentido ya ajustado a la
 *  suerte del principal, de quién es y por qué. */
export interface CriterioRepartido extends CriterioEnviado {
    /** «por_recalificar»: el principal va por la vía CONTRARIA a la que propuso
     *  el motor y este accesorio, que él no tocó, traía la calificación escrita
     *  para la otra vía (o ninguna): se TUMBA —sentido y razón vacíos— y el
     *  motor lo vuelve a calificar con la premisa del secretario.
     *  «recalificada»: ya se recalificó con esa misma premisa (26-sep-2026,
     *  contrato_recalificar.md). */
    de: 'principal' | 'tuya' | 'distinto' | 'propio' | 'mayor_beneficio'
        | 'por_recalificar' | 'recalificada' | '';
    por_que: string;
    /** true = tumbado, a la espera de recalificarse con la premisa. */
    recalificar?: boolean;
    /** «procesal» / «mayor_beneficio_189»: la guarda procesal. */
    guarda?: string;
    /** «presupone» / «autonoma» / «mixta»: su relación con el principal. */
    relacion?: string;
}

/* ═══ RECALIFICAR CON LA PREMISA DEL CAMBIO DE SENTIDO (26-sep-2026) ═══
   David: «si cambio sentido hay que tumbar y regenerar con la premisa del
   cambio de sentido». Cuando el secretario resuelve el principal por la vía
   contraria a la que propuso el motor, los accesorios que no tocó conservaban
   la calificación escrita para la otra vía —en 5 de 16 casos del banco
   Kingston era «fundado», y el engrose real los negó en los 5—. Ahora esa
   calificación se tumba y el motor vuelve a calificar SÓLO esos accesorios con
   el principal, su sentido y su razón como hechos dados.

   El servidor espera como mucho 90 s y contesta con el estado de la
   recalificación de ESTA premisa (su clave) y los criterios ya con las
   recalificadas aplicadas, igual que /taller/reparto. No cobra. */
export type EstadoRecalificar = 'listo' | 'sin_cambios' | 'en_curso' | 'fallo';

export interface RespuestaRecalificar {
    estado: EstadoRecalificar;
    /** La huella de la premisa con que se recalificó (o se recalifica). */
    clave: string;
    criterios: CriterioRepartido[];
    avisos: string[];
    /** Si volver a pedir esta misma premisa serviría. Un fallo de validación
     *  vuelve igual al instante: entonces no se ofrece «volver a intentar».
     *  Sin el campo (servidor anterior), se da por reintentable. */
    reintentable: boolean;
}

/** La lectura tolerante de la respuesta: un estado que no se reconoce es un
 *  fallo —nunca un «listo» que pintaría calificaciones que no llegaron—. */
export function respuestaRecalificarDe(x: unknown): RespuestaRecalificar {
    const j = (x && typeof x === 'object' && !Array.isArray(x)) ? x as Record<string, unknown> : {};
    const e = String(j.estado ?? '').trim().toLowerCase();
    const estado: EstadoRecalificar = e === 'listo' || e === 'sin_cambios' || e === 'en_curso' ? e : 'fallo';
    const criterios = (Array.isArray(j.criterios) ? j.criterios : [])
        .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && !Array.isArray(c))
        .map((c) => ({
            ...(c as object),
            problema: String(c.problema ?? ''),
            sentido: String(c.sentido ?? '').trim().toLowerCase(),
            razonamiento: String(c.razonamiento ?? ''),
            jerarquia: c.jerarquia === 'principal' ? 'principal' : 'accesorio',
            tocado: !!c.tocado,
            de: String(c.de ?? '') as CriterioRepartido['de'],
            por_que: String(c.por_que ?? ''),
            recalificar: c.recalificar === true,
        }) as CriterioRepartido);
    const avisos = (Array.isArray(j.avisos) ? j.avisos : []).map((a) => {
        if (a && typeof a === 'object') {
            const o = a as Record<string, unknown>;
            return String(o.texto ?? o.mensaje ?? o.aviso ?? JSON.stringify(o));
        }
        return String(a ?? '');
    }).map((a) => a.trim()).filter(Boolean);
    return { estado, clave: String(j.clave ?? '').trim(), criterios, avisos,
             reintentable: j.reintentable !== false };
}

/** PIDE LA RECALIFICACIÓN con el MISMO formulario que generará el proyecto
 *  (`formularioDelResolver`): la clave que el servidor calcula aquí —el
 *  principal, su sentido, su razón y qué accesorios quedan por recalificar—
 *  es la que buscará al generar y al pedir el plan. Si la pantalla mandara
 *  otra cosa, el estudio volvería a recalificar —otra llamada al modelo y
 *  hasta minuto y medio más— sobre lo que ya estaba hecho. */
export async function recalificar(
    numero: string, userEmail: string, opciones: OpcionesResolver, signal?: AbortSignal,
): Promise<RespuestaRecalificar> {
    const fd = formularioDelResolver(numero, userEmail, opciones);
    const res = await fetch(`${BASE}/taller/recalificar`, { method: 'POST', body: fd, signal });
    if (!res.ok) return _fallo(res);
    return respuestaRecalificarDe(await res.json().catch(() => null));
}

/** LA SUERTE DE LOS ACCESORIOS CUANDO CAMBIA EL PRINCIPAL. No llama a ningún
 *  modelo: aplica en el servidor la MISMA regla que el resolver aplicará al
 *  generar —principal que prospera deja sin materia a los que dependen de
 *  él; principal que cae arrastra a los que descansaban en su premisa— y
 *  devuelve cada criterio con su sentido, de quién es y por qué. */
export async function repartirCriterios(
    numero: string, userEmail: string, criterios: CriterioEnviado[],
    global: SolucionGlobal | null,
): Promise<{ criterios: CriterioRepartido[]; avisos: string[] }> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('criterios_json', JSON.stringify(criterios));
    if (global) fd.append('global_json', JSON.stringify(global));
    const res = await fetch(`${BASE}/taller/reparto`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = await res.json();
    return { criterios: (j.criterios ?? []) as CriterioRepartido[], avisos: j.avisos ?? [] };
}

/** EL PROBLEMA JURÍDICO SE CORRIGE ANTES DE DECIDIRLO. Se corrige en la
 *  fuente —la fase 3 del servidor— y se persiste: la propuesta anterior se
 *  descarta y hay que volver a pedirla sobre la pregunta corregida. */
export async function corregirProblema(
    numero: string, userEmail: string, indice: number,
    pregunta: string, jerarquia?: 'principal' | 'accesorio',
): Promise<{ problemas: { pregunta: string; jerarquia: string; editado: boolean }[]; aviso: string }> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('indice', String(indice));
    if (pregunta.trim()) fd.append('pregunta', pregunta.trim());
    if (jerarquia) fd.append('jerarquia', jerarquia);
    const res = await fetch(`${BASE}/taller/problema`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = await res.json();
    return { problemas: j.problemas ?? [], aviso: j.aviso ?? '' };
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
    /** (2-oct-2026, CONTRATO A) Lo que antes quería decir `alcanza`: que el
     *  material sostiene el sentido con holgura. Con la propuesta por
     *  probabilidad `alcanza` es verdadero siempre que haya sentido, y esto
     *  queda como grado de certeza. undefined = un servidor anterior. */
    sostenida?: boolean;
    /** De dónde salió el sentido: el motor, la probabilidad (lo volteó) o el
     *  árbol de decisión. */
    origen?: 'motor' | 'probabilidad' | 'arbol' | '';
}

/** ¿Trae un sentido que se pueda volcar? (2-oct-2026, David: «el motor nunca
 *  se atreve a proponer»). Antes se miraba `alcanza`, y con `alcanza` falso se
 *  tiraba el sentido aunque viniera escrito: ahora la propuesta va siempre que
 *  haya un sentido, y `sostenida` dice con qué certeza. */
export function conSentido(x: { sentido?: string | null } | null | undefined): boolean {
    return !!(x?.sentido || '').trim();
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
     *  rellena con la del problema principal. (2-oct-2026) Desde el formato 3
     *  es verdadero siempre que haya sentido: lo que antes decía esto lo dice
     *  `sostenida`. */
    alcanza: boolean;
    /** Lo que antes significaba `alcanza` (CONTRATO A). En un servidor anterior
     *  se copia de `alcanza`. */
    sostenida?: boolean;
    /** LA PROBABILIDAD DEL SENTIDO (CONTRATO A): el lado con más del 50% es la
     *  propuesta. null/undefined = un servidor que aún no la manda. */
    probabilidad?: ProbabilidadDelSentido | null;
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
    /** LA VÍA PROTECTORA (24-sep-2026): cuál calificación favorece a quien
     *  reclama el derecho y si en ella cabe una interpretación conforme o pro
     *  persona. En la vía que valida una restricción esos principios no se
     *  invocan; la pantalla lo dice al cambiar de alternativa. */
    via_protectora?: ViaProtectora;
    /** LAS CONSTANCIAS DEL JUICIO DE ORIGEN QUE HARÍA FALTA VER para decidir
     *  con fidelidad: el motor las declara con su porqué; la pantalla las
     *  pide una por una (texto o documento); el estudio recibe las que no
     *  llegaron con la orden de no suponer su contenido. */
    constancias?: ConstanciaPedida[];
    /** LA LISTA DE COMPROBACIÓN. Todos los temas con su suerte en las DOS
     *  vías. El servidor la completa contra los problemas reales: si el modelo
     *  omitió uno, aparece con la suerte SIN DETERMINAR. */
    checklist: {
        /** El número del problema en la lista de la fase 3, 1-based. Es por
         *  donde se empareja: el `tema` viene resumido en una línea. */
        numero?: number;
        tema: string;
        papel: string;
        con_propuesta: string;
        con_alternativa: string;
        tema_distinto?: boolean;
        /** LA SUERTE CONDICIONAL, estructurada: qué le pasa a este tema si
         *  el principal prospera y si no. Es lo que el árbol de decisión
         *  aplica solo cuando el secretario fija el principal. */
        relacion?: 'depende' | 'distinto';
        si_prospera?: { sentido: string; razon: string };
        si_no_prospera?: { sentido: string; razon: string };
    }[];
}

/* EL CONTRASTE, por planteamiento: la razón toral de la sentencia, si el
   agravio la combate y si el fallo sobrevive por otra. Lo calcula la fase 5
   antes de proponer; la pantalla de decisión lo enseña detrás de «ver por
   qué». */
export interface ContrasteDelPlanteamiento {
    numero: number;
    razon_toral: string;
    la_combate: boolean;
    sobrevive: boolean;
    veredicto_previo: string;
    por_que: string;
}

/** La calificación que favorece a quien reclama el derecho y si en ella cabe
 *  una lectura más favorable de algún precepto. */
export interface ViaProtectora {
    sentido: string;
    posible: boolean;
    norma: string;
    lectura: string;
    limite: string;
    apoyos: string[];
}

export interface ConstanciaPedida {
    que: string;
    para_que: string;
    indispensable: boolean;
    problema: number;
}

export interface RespuestaPropuesta {
    propuestas: PropuestaDeSolucion[];
    global?: SolucionGlobal | null;
    contraste?: ContrasteDelPlanteamiento[];
    resumen: string;
    avisos: string[];
    /** Esto se devuelve tal cual —o editado— para resolver con ella. */
    criteriosJson: string;
    modelo: string;
    /** El recurso levanta un sobreseimiento y hay que estudiar los conceptos
     *  de violación por primera vez, pero no constan. El servidor ya daba el
     *  aviso; esto es lo que hace que la pantalla ofrezca DÓNDE pegarlos.
     *  OJO: el servidor lo calcula con el sentido DEL MOTOR. */
    necesitaConceptos: boolean;
    /** LO MISMO, CALCULADO PARA LA VÍA QUE PROSPERA (SPEC B §1; AR 631/2025,
     *  28-sep-2026): el motor propuso «infundado» —`necesitaConceptos` falso—
     *  y el secretario resolvió en sentido opuesto, que revoca una concesión.
     *  null = si el recurso prospera no hay conceptos que estudiar; undefined
     *  = un servidor que aún no lo manda (la pantalla se queda con
     *  `necesitaConceptos`). La pantalla los pide cuando lo que viaja
     *  prospera (`conceptosQueFaltan`). */
    conceptosOmitidos?: ConceptosOmitidos | null;
    /** (2-oct-2026, CONTRATO A) «preguntas» = el motor no propone hasta que el
     *  secretario conteste las indispensables: `propuestas` vacío y `global`
     *  null. Ausente = «lista», como siempre. */
    estado?: 'lista' | 'preguntas';
    /** 3 desde la propuesta por probabilidad; 2 o ausente, un servidor anterior. */
    formato?: number;
    /** Las preguntas al secretario (CONTRATO B). Con «lista», las no
     *  indispensables y las ya contestadas, para enseñarlas. */
    preguntas?: PreguntaAlSecretario[];
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
        global: globalDe(j.global),
        contraste: Array.isArray(j.contraste)
            ? (j.contraste as ContrasteDelPlanteamiento[]) : [],
        resumen: j.resumen ?? '',
        avisos: j.avisos ?? [],
        criteriosJson: j.criterios_json ?? '',
        modelo: j.modelo ?? '',
        necesitaConceptos: Boolean(j.necesita_conceptos),
        conceptosOmitidos: j && typeof j === 'object' && 'conceptos_omitidos' in j
            ? conceptosOmitidosDe(j.conceptos_omitidos) : undefined,
        estado: j.estado === 'preguntas' ? 'preguntas' : 'lista',
        formato: Number(j.formato) || 2,
        preguntas: preguntasDe(j.preguntas),
    };
}

/** LA GLOBAL NO SE TIRA SI TRAE SENTIDO (2-oct-2026). Se descartaba entera con
 *  `alcanza` falso, y con ella su sentido, su alternativa y las constancias
 *  que el servidor sí mandaba: la pantalla decía «el motor no se atrevió»
 *  sobre una propuesta que existía. Ahora se queda siempre que haya sentido;
 *  `sostenida` guarda lo que antes decía `alcanza` (un servidor anterior no
 *  la manda: se copia) y `alcanza` vale lo que dice el formato 3: hay sentido. */
export function globalDe(x: unknown): SolucionGlobal | null {
    const g = _o(x);
    if (!g || !(g.alcanza === true || _t(g.sentido))) return null;
    return {
        ...(g as unknown as SolucionGlobal),
        alcanza: true,
        sostenida: typeof g.sostenida === 'boolean' ? g.sostenida : g.alcanza === true,
        probabilidad: probabilidadDe(g.probabilidad),
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
/* ═══ LA RECUPERACIÓN DE UN PROYECTO CUYA LÍNEA SE CORTÓ ═══
   Ver el comentario largo dentro de `resolverEnVivo`. */

/** Un minuto sin un solo byte —ni texto ni latido— es línea muerta: el
 *  servidor late cada 15 segundos mientras el modelo calla. */
const SILENCIO_MAXIMO_MS = 60_000;
/** Cada cuánto se pregunta al almacén si el proyecto ya está. */
const CADENCIA_RECUPERACION_MS = 8_000;
/** Hasta cuándo se espera: el estudio son dos o tres minutos, y componer el
 *  documento otros dos; ocho minutos cubren con holgura la corrida más larga. */
const ESPERA_RECUPERACION_MS = 8 * 60_000;

/** El motor dijo que falló. No es un problema de la línea y no se recupera. */
class ErrorDelMotor extends Error {}

/** La ficha del último proyecto del asunto, o null si no hay ninguno. */
export async function fichaProyecto(numero: string, userEmail: string): Promise<FichaProyecto | null> {
    const res = await fetch(
        `${BASE}/taller/proyecto?numero=${encodeURIComponent(numero)}`
        + `&user_email=${encodeURIComponent(userEmail)}`);
    if (!res.ok) return _fallo(res);
    const j = await res.json().catch(() => null);
    const p = j?.proyecto as Record<string, unknown> | null | undefined;
    if (!p) return null;
    return {
        version: Number(p.version ?? 1),
        generadoEn: String(p.generado_en ?? ''),
        palabras: Number(p.palabras ?? 0),
        avisos: Array.isArray(p.avisos) ? p.avisos.map(String) : [],
        huecos: Array.isArray(p.huecos) ? p.huecos.map(String) : [],
        advertencias: Boolean(p.advertencias),
        nombre: String(p.nombre ?? ''),
        sentidoGlobal: String(p.sentido_global ?? ''),
        modo: String(p.modo ?? ''),
        criterios: [],
        mapa: mapaDe(p),
        supervisor: supervisorDe(p.supervisor),
    };
}

/** Qué versión había antes de arrancar: 0 si ninguna, null si no se pudo
 *  saber (y entonces se decide por la fecha, con margen para relojes). */
async function versionDelProyecto(numero: string, userEmail: string): Promise<number | null> {
    try {
        const f = await fichaProyecto(numero, userEmail);
        return f ? (f.version ?? 1) : 0;
    } catch {
        return null;
    }
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Va a buscar al almacén el proyecto que el servidor sigue escribiendo, y lo
 *  devuelve como si hubiera llegado por el flujo. */
async function recuperarProyecto(
    numero: string, userEmail: string, versionAntes: number | null,
    inicio: number, motivo: string, onTexto?: (trozo: string) => void,
): Promise<ResultadoProyecto> {
    onTexto?.(`\n\n… se cortó la conexión con el servidor (${motivo}). El proyecto `
              + 'se sigue escribiendo allá y se recuperará solo en cuanto termine; '
              + 'no hace falta volver a generarlo.');
    const limite = Date.now() + ESPERA_RECUPERACION_MS;
    let avisado = 0;
    for (;;) {
        const f = await fichaProyecto(numero, userEmail).catch(() => null);
        const esDeEstaCorrida = !!f && (
            versionAntes !== null
                ? (f.version ?? 1) > versionAntes
                /* Sin versión previa se decide por la fecha del servidor, con
                   dos minutos de margen por si este reloj va adelantado. */
                : Date.parse(f.generadoEn) >= inicio - 2 * 60_000);
        if (f && esDeEstaCorrida) {
            const r2 = await leerConReintento(
                `${BASE}/taller/descargar?numero=${encodeURIComponent(numero)}`
                + `&user_email=${encodeURIComponent(userEmail)}`
                + `&version=${f.version ?? 1}`);
            if (!r2.ok) return _fallo(r2);
            onTexto?.('\n\n… proyecto recuperado.');
            return {
                documento: await r2.blob(),
                nombre: f.nombre || `${numero.replace('/', '-')}.docx`,
                esBorrador: true,
                palabras: f.palabras,
                avisos: f.avisos.length,
                huecos: f.huecos.length,
                tieneAdvertencias: f.advertencias,
                textoAvisos: f.avisos,
                textoHuecos: f.huecos,
                version: f.version ?? undefined,
                /* El mapa del estudio también se recupera: la ficha lo guarda
                   igual que el «listo» lo traía (Paso 2). */
                mapa: f.mapa ?? null,
                // Y las correcciones del supervisor, que la ficha guarda igual.
                supervisor: f.supervisor ?? null,
            };
        }
        if (Date.now() >= limite) {
            throw new Error(
                `Se cortó la conexión con el servidor (${motivo}) y el proyecto `
                + 'no apareció en ocho minutos. Si el servidor llegó a terminarlo, '
                + 'estará en el historial de este asunto; si no, vuelve a generarlo.');
        }
        const minutos = Math.floor((Date.now() - inicio) / 60_000);
        if (minutos > avisado) {
            avisado = minutos;
            onTexto?.(`\n… sigue en marcha (${minutos} min).`);
        }
        await esperar(CADENCIA_RECUPERACION_MS);
    }
}

/** Las dos formas de la sentencia. Ver `formato_sentencia.py` en el API. */
export type FormatoSentencia = 'estandar' | 'moderna';

/** LO QUE VIAJA AL GENERAR EL PROYECTO, en un solo tipo (26-sep-2026).
 *  Era el parámetro en línea de `resolverEnVivo`; ahora lo comparte con
 *  `pedirPlan`, porque el servidor busca el plan del estudio por una CLAVE que
 *  sale de este mismo formulario (sentido, razón, grupo, suplencia, contexto…).
 *  Si la pantalla pidiera el plan con un formulario y generara con otro, las
 *  claves no casarían y el estudio rehará —o esperará— un plan que ya estaba
 *  hecho, gastando una de las cuatro corridas de la sesión. Un solo
 *  constructor, `formularioDelResolver`, para las dos puertas. */
export interface OpcionesResolver {
    criterio?: Criterio | null; criteriosJson?: string; contexto?: string;
    sentidoGlobal?: string; razonGlobal?: string;
    /** Si el secretario eligió ese sentido global a propósito. La pantalla
     *  también lo fija sola al llegar la propuesta, y ése es un eco del
     *  motor, no su palabra. */
    globalDictado?: boolean;
    resolvioDeclarado?: string; globalJson?: string;
    /* Los conceptos de violación, que el secretario pega cuando el
       recurso levanta un sobreseimiento: no constan en el expediente del
       recurso, y sin ellos el proyecto levanta el sobreseimiento sin
       resolver lo único que quedaba por resolver. */
    conceptosViolacion?: string;
    /** La autoridad corregida a mano, cuando la leída salió mal o en hueco. */
    responsable?: string;
    /** Lo que el secretario resolvió sobre un cómputo extemporáneo:
     *  'oportuna' rectifica y entra al fondo; 'reserva' deja la ejecutoria
     *  resolviendo la improcedencia y pone el estudio detrás de los
     *  resolutivos. Vacío = no hay nada que decidir. */
    oportunidadDecision?: string;
    /** Su razón, que va LITERAL al considerando cuando rectifica. */
    oportunidadMotivo?: string;
    /** EL ATAJO DE UN SOLO CLIC: que decida el motor. El servidor reparte
     *  con las propuestas que ya guardó al proponer —es la rama `else` de
     *  `modos_decision.repartir`—, así que no hace falta mandarle de vuelta
     *  lo que él mismo calculó. Nadie revisa el sentido: es el riesgo que
     *  el botón amarillo anuncia. */
    porJurimetria?: boolean;
    /** LA FORMA DE LA SENTENCIA (David, 25-sep-2026). 'estandar' va
     *  concepto por concepto con la extensión de siempre; 'moderna' abre
     *  cada punto con su pregunta, la responde enseguida y condensa lo que
     *  no es materia de estudio. Vacío = estándar. */
    formato?: FormatoSentencia;
    /** LA SUPLENCIA DE LA QUEJA (David, 26-sep-2026): la que el secretario
     *  confirmó en la pantalla de decisión, o la propuesta del motor sin
     *  confirmar. Sólo la confirmada cambia el estudio. */
    suplencia?: DecisionSuplencia | null;
    /** LA RAZÓN DEL SECRETARIO PARA UN ARGUMENTO CONCRETO. Era la Decisión 6
     *  (opción a, 26-sep-2026): el panel la pedía por argumento. SE RETIRÓ el
     *  28-sep-2026 (David, sobre el AR 631/2025: la caja rompía el diálogo por
     *  temas): el plan-6 resuelve los secundarios por dependencia del
     *  principal y la pantalla ya no la pide ni la guarda. El campo queda
     *  inerte —`razones_segmento` viaja vacío y el servidor lo recibe con
     *  `Form("")`— hasta retirarlo de los dos lados a la vez. */
    razonesSegmento?: Record<string, string>;
    /** LA VARIANTE DEL PROMPT DEL ESTUDIO («v1»…«v4»), sólo para cuentas de
     *  casa; al resto el servidor se la ignora (`_taller_variante_estudio`).
     *  Vacío = la global (ESTUDIO_PROMPT). */
    varianteEstudio?: string;
}

/** El formulario de `/taller/resolver/stream`, el mismo que recibe
 *  `/taller/plan/pedir`. Ver `OpcionesResolver`. */
export function formularioDelResolver(
    numero: string, userEmail: string, opciones: OpcionesResolver,
): FormData {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    const o = opciones || {};
    if (o.sentidoGlobal) {
        fd.append('modo_decision', 'global');
        fd.append('sentido_global', o.sentidoGlobal);
        if (o.razonGlobal?.trim()) fd.append('razonamiento', o.razonGlobal.trim());
        if (o.globalDictado) fd.append('global_dictado', '1');
        // Y LO QUE ÉL MARCÓ POR PROBLEMA VIAJA IGUAL. Este `else if` era el
        // último eslabón de la cadena que se tragaba la instrucción del
        // secretario: con un sentido global presente, `criterios_json` no se
        // mandaba nunca. El servidor usa el global de relleno y respeta cada
        // marca expresa, así que mandar los dos no son «dos órdenes
        // distintas»: es una orden con excepciones, que es como se decide un
        // asunto de verdad.
        if (o.criteriosJson) fd.append('criterios_json', o.criteriosJson);
    } else if (o.porJurimetria) {
        // Ni criterios ni sentido global: el servidor toma de sus propuestas.
        fd.append('modo_decision', 'acervo');
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
    if (o.responsable?.trim()) fd.append('responsable', o.responsable.trim());
    if (o.oportunidadDecision?.trim())
        fd.append('oportunidad_decision', o.oportunidadDecision.trim());
    if (o.oportunidadMotivo?.trim())
        fd.append('oportunidad_motivo', o.oportunidadMotivo.trim());
    fd.append('formato', o.formato === 'moderna' ? 'moderna' : 'estandar');
    /* SIEMPRE, aunque vaya vacía: el servidor la asigna en cada petición, y una
       suplencia confirmada en la vuelta anterior no puede sobrevivir a que el
       secretario la quite. */
    fd.append('suplencia', o.suplencia?.fraccion
        ? JSON.stringify({ fraccion: o.suplencia.fraccion,
                           a_favor_de: o.suplencia.aFavorDe,
                           confirmada: !!o.suplencia.confirmada })
        : '');
    /* LAS RAZONES POR ARGUMENTO, SIEMPRE, aunque vayan vacías: igual que la
       suplencia, el servidor las asigna en cada petición, y una razón escrita
       para el plan anterior no puede colarse en el siguiente si el secretario
       la borró. */
    const razones = Object.entries(o.razonesSegmento ?? {})
        .map(([id, t]) => [id.trim(), (t ?? '').trim()] as const)
        .filter(([id, t]) => id && t);
    fd.append('razones_segmento', razones.length ? JSON.stringify(Object.fromEntries(razones)) : '');
    if (o.varianteEstudio?.trim()) fd.append('variante_estudio', o.varianteEstudio.trim());
    return fd;
}

export async function resolverEnVivo(
    numero: string, userEmail: string,
    opciones: OpcionesResolver,
    onTexto?: (trozo: string) => void,
    onComponiendo?: () => void,
    /** EL SERVIDOR ESTÁ ORDENANDO EL ESTUDIO (evento «ordenando», sólo con el
     *  plan encendido): espera el plan de esta decisión, o lo hace, antes de
     *  escribir la primera línea. Puede tardar hasta dos minutos, y sin decirlo
     *  la pantalla parecería colgada justo antes del estudio. */
    onOrdenando?: () => void,
    /** EL SERVIDOR ESTÁ RECALIFICANDO LOS ACCESORIOS CON LA PREMISA DEL
     *  SECRETARIO (evento «recalificando», 26-sep-2026): el principal va por la
     *  vía contraria a la que propuso el motor y los accesorios que no tocó se
     *  vuelven a calificar antes del plan y del estudio. Hasta minuto y medio. */
    onRecalificando?: () => void,
    /** LA RECALIFICACIÓN TERMINÓ (evento «recalificado», si el servidor lo
     *  manda): la pantalla deja de decir «Recalificando…» aunque no venga
     *  «ordenando» —sin plan no viene— y el primer texto tarde un minuto. */
    onRecalificado?: () => void,
    /** EL SERVIDOR COMPLETA EL ESTUDIO (evento «completando», sólo v3/v4): una
     *  llamada más escribe la respuesta de los argumentos que quedaron sin su
     *  dato propio. Lo añadido va en el .docx, no en el texto que se vio
     *  escribirse (integración, 26-sep-2026). */
    onCompletando?: () => void,
    /** EL SUPERVISOR REVISA EL PROYECTO (evento «revisando», 2-oct-2026,
     *  CONTRATO D): con el estudio escrito, un modelo barato lo lee entero
     *  —congruencia, citas, hechos no acreditados, extensión— y corrige antes
     *  de componer el .docx. Sin decirlo, la pantalla parecería colgada justo
     *  cuando el texto ya terminó de llegar. */
    onRevisando?: () => void,
): Promise<ResultadoProyecto> {
    const fd = formularioDelResolver(numero, userEmail, opciones);

    /* ═══ LA LÍNEA PUEDE MORIRSE A MEDIAS, Y EL PROYECTO NO (17-sep-2026) ═══
       El 536/2025: el servidor escribió el estudio entero y lo archivó, y esta
       pantalla se quedó en «Escribiendo el proyecto…» con 141 palabras,
       cortadas a media frase, durante horas. La conexión murió sin que ningún
       extremo lo supiera —ni cierre ni error—, y `lector.read()` esperaba un
       trozo que ya no iba a llegar.

       Tres piezas lo arreglan, y las tres hacen falta:
         · El servidor late cada 15 segundos mientras el modelo calla, así que
           un minuto sin un solo byte ya no es «el modelo piensa»: es línea
           muerta. El vigilante corta entonces la espera.
         · El servidor termina, cobra y archiva el proyecto aunque la línea se
           haya ido: corre en una tarea aparte del flujo.
         · Si la línea se corta —por el vigilante, por un error de red o
           porque el flujo cierra sin `listo`—, se va a buscar el proyecto al
           almacén en vez de rendirse: `recuperarProyecto`.

       La versión previa se lee ANTES de arrancar: es la única forma segura de
       distinguir el proyecto de esta corrida del anterior del mismo
       expediente sin fiarse del reloj de este equipo. */
    const versionAntes = await versionDelProyecto(numero, userEmail);
    const inicio = Date.now();

    const control = new AbortController();
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const rearmar = () => {
        if (reloj) clearTimeout(reloj);
        reloj = setTimeout(() => control.abort(), SILENCIO_MAXIMO_MS);
    };

    const res = await fetch(`${BASE}/taller/resolver/stream`,
                            { method: 'POST', body: fd, signal: control.signal });
    if (!res.ok) return _fallo(res);
    if (!res.body) throw new Error('El servidor no devolvió un flujo.');

    const lector = res.body.getReader();
    const dec = new TextDecoder();
    let resto = '';
    let listo: Record<string, unknown> | null = null;
    /* Por qué se dejó de leer, cuando no fue porque terminó bien. */
    let corte = '';

    try {
        for (;;) {
            rearmar();
            const { done, value } = await lector.read();
            if (done) break;
            resto += dec.decode(value, { stream: true });
            /* Los eventos van separados por una línea en blanco. Se guarda lo
               que quede a medias: un trozo puede cortar un evento por la
               mitad. Los latidos del servidor (`: latido`) no empiezan por
               `data:` y se ignoran aquí; su trabajo ya lo hicieron al
               resolver el `read()` y rearmar el vigilante. */
            const partes = resto.split('\n\n');
            resto = partes.pop() ?? '';
            for (const bruto of partes) {
                const linea = bruto.trim();
                if (!linea.startsWith('data:')) continue;
                let ev: Record<string, unknown>;
                try {
                    ev = JSON.parse(linea.slice(5).trim());
                } catch {
                    continue;           // un evento ilegible no tumba la corrida
                }
                if (ev.tipo === 'texto' && typeof ev.dato === 'string') {
                    onTexto?.(ev.dato);
                } else if (ev.tipo === 'componiendo') {
                    onComponiendo?.();
                } else if (ev.tipo === 'ordenando') {
                    onOrdenando?.();
                } else if (ev.tipo === 'recalificando') {
                    onRecalificando?.();
                } else if (ev.tipo === 'recalificado') {
                    onRecalificado?.();
                } else if (ev.tipo === 'completando') {
                    onCompletando?.();
                } else if (ev.tipo === 'revisando') {
                    onRevisando?.();
                } else if (ev.tipo === 'error') {
                    /* El motor dice que falló: eso no se recupera, se cuenta.
                       Con la lista, si la trae (p. ej. los accesorios que
                       quedaron sin calificar tras el cambio de sentido). */
                    throw new ErrorDelMotor(textoDelError(ev, 'Falló la generación.'));
                } else if (ev.tipo === 'listo') {
                    listo = ev;
                }
            }
            if (listo) break;
        }
    } catch (e) {
        if (e instanceof ErrorDelMotor) throw e;
        corte = control.signal.aborted
            ? `${Math.round(SILENCIO_MAXIMO_MS / 1000)} segundos sin recibir nada`
            : (e instanceof Error ? e.message : 'error de red');
    } finally {
        if (reloj) clearTimeout(reloj);
        if (!listo) {
            control.abort();
            lector.cancel().catch(() => undefined);
        }
    }
    if (!listo) {
        return recuperarProyecto(numero, userEmail, versionAntes, inicio,
                                 corte || 'el flujo cerró sin entregar el proyecto',
                                 onTexto);
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
        const r2 = await leerConReintento(
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
        textoAvisos: avisos.map(String),
        textoHuecos: huecos.map(String),
        version: Number(listo.version || 0) || undefined,
        mapa: mapaDe(listo),
        supervisor: supervisorDe(listo.supervisor),
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
        // Los textos, no sólo el número. Viajan en cabecera, separados por
        // « | », con el saneado latin-1 que usa el resto de los avisos.
        textoAvisos: (h.get('X-Avisos-Detalle') || '')
            .split(' | ').map((x) => x.trim()).filter(Boolean),
        textoHuecos: [],
        // El camino plano sólo dice cuántas corrigió el supervisor.
        supervisor: supervisorDeCabecera(h.get('x-supervisor')),
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
    /** Plazos de AÑOS (art. 17, fr. II y III, LA): 8 o 7. Se cuentan de fecha
     *  a fecha, no en días hábiles; 0 o ausente en los demás. */
    anios?: number;
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

/**
 * La razón para el sentido que el secretario acaba de marcar.
 *
 * No propone otro ni discute el suyo: escribe la mejor demostración de ESE
 * sentido con el acervo delante. Antes, marcar un sentido dejaba un cuadro en
 * blanco y, si no se rellenaba, el estudio se inventaba el porqué.
 */
export async function razonarSentido(
    numero: string, userEmail: string, problema: string, sentido: string,
    /** LA BASE QUE ESCRIBIÓ EL SECRETARIO (23-sep-2026). David, 711/2025:
     *  «si yo le di un criterio y una directriz, el motor debe ser capaz de
     *  generar el razonamiento para validar por qué resolverá así». Viaja
     *  como `directriz` y el motor construye sobre ella en vez de ignorarla. */
    directriz = '',
): Promise<string> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('problema', problema);
    fd.append('sentido', sentido);
    if (directriz.trim()) fd.append('directriz', directriz.trim());
    const res = await fetch(`${BASE}/taller/razonar`, { method: 'POST', body: fd });
    if (!res.ok) return '';
    const j = await res.json().catch(() => ({}));
    return String(j?.razon ?? '');
}

/* ═══ LA SUPLENCIA DE LA QUEJA (David, 26-sep-2026) ═══
   «Sí»: un paso más en la pantalla de decisión. El motor PROPONE la fracción
   del artículo 79 y a favor de quién, con su porqué; el secretario la
   confirma, la cambia o dice que no hay. La propuesta llega con el asunto
   (/taller/contexto-del-asunto) y la decisión viaja en el formulario de
   `resolverEnVivo`. Ver `suplencia.py` en el API. */
export interface FraccionSuplencia {
    /** «I», «II», «III-a», «III-b», «IV-a», «IV-b», «V», «VI», «VII» o «ninguna». */
    id: string;
    rotulo: string;
    /** El supuesto, con el texto vigente de la ley. */
    texto: string;
    /** A favor de quién opera cuando lo fija la ley y no quien promueve: la
     *  II es en favor del menor o de la familia, promueva quien promueva.
     *  Vacío en las demás (revisión, 26-sep-2026). */
    aFavorDe: string;
}
export interface PropuestaSuplencia {
    fraccion: string;
    rotulo: string;
    texto: string;
    /** A favor de quién propone el motor; vacío si propone «sin suplencia». */
    aFavorDe: string;
    /** La parte que promueve, aunque no se proponga nada: la pantalla la usa
     *  si el secretario elige una fracción por su cuenta (salvo la II, cuyo
     *  beneficiario trae el catálogo). */
    parte: string;
    porque: string;
    /** Lo que conviene mirar también: la fracción que la parte pide, los
     *  indicios de la VII, el otro inciso. */
    alternativas: { fraccion: string; rotulo: string; porque: string }[];
    /** La fracción que el escrito pide expresamente, si pide una. */
    pedida: string;
    /** El catálogo entero, para el selector: la ley vive en el API. */
    fracciones: FraccionSuplencia[];
}
/** Lo que decidió el secretario. Sólo la confirmada cambia el estudio. */
export interface DecisionSuplencia {
    fraccion: string;
    aFavorDe: string;
    confirmada: boolean;
}

function _suplenciaDe(x: unknown): PropuestaSuplencia | null {
    const j = (x && typeof x === 'object') ? x as Record<string, unknown> : null;
    if (!j || !j.fraccion) return null;
    const lista = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];
    return {
        fraccion: String(j.fraccion),
        rotulo: String(j.rotulo ?? ''),
        texto: String(j.texto ?? ''),
        aFavorDe: String(j.a_favor_de ?? ''),
        parte: String(j.parte ?? j.a_favor_de ?? ''),
        porque: String(j.porque ?? ''),
        alternativas: lista(j.alternativas).map((a) => ({
            fraccion: String(a.fraccion ?? ''), rotulo: String(a.rotulo ?? ''),
            porque: String(a.porque ?? ''),
        })).filter((a) => a.fraccion),
        pedida: String(j.pedida ?? ''),
        fracciones: lista(j.fracciones).map((f) => ({
            id: String(f.id ?? ''), rotulo: String(f.rotulo ?? ''), texto: String(f.texto ?? ''),
            aFavorDe: String(f.a_favor_de ?? ''),
        })).filter((f) => f.id),
    };
}

/* ═══ DE DÓNDE VIENE LO RECLAMADO (30-sep-2026) ═══
   David, sobre un amparo directo contra un juicio oral mercantil: «Siempre,
   en amparo directo, partimos de la base de que hay una sala. Es decir, una
   segunda instancia. Pero no siempre es así. […] La autoridad responsable era
   el propio juez de oralidad mercantil. En segundo lugar, la sentencia había
   sido dictada en cumplimiento».

   El servidor lee del expediente quién dictó lo reclamado, si hubo alzada y si
   se dictó en cumplimiento de una ejecutoria de amparo (`origen_acto.py`), y
   lo manda con el asunto. Si con la ejecutoria vienen sus efectos, clasifica
   cada planteamiento: lo que la ejecutoria dejó atado (inoperante) y lo que
   la responsable resolvió con libertad de jurisdicción (se estudia).

   LA REGLA DE ORO: `origen` null —cuentas sin la bandera, asuntos anteriores—
   y la pantalla queda exactamente como estaba. Nada nuevo se pinta. */
export type InstanciaDelActo = 'unica' | 'alzada' | '';
/** Cómo quedó un planteamiento frente a la ejecutoria que se cumplía. */
export type VinculacionEjecutoria =
    | 'vinculado' | 'consentido' | 'libre' | 'mixto' | 'exceso_defecto' | 'constitucionalidad' | 'no_consta';
export interface ProblemaAnteLaEjecutoria {
    /** LA LLAVE: el texto de la pregunta tal como lo lleva el pipeline. */
    pregunta: string;
    vinculacion: VinculacionEjecutoria;
    /** El efecto de la ejecutoria que toca a este planteamiento. */
    efecto: string;
    porQue: string;
    /** En los «mixto»: qué parte quedó atada y cuál se resolvió con libertad. */
    parteVinculada: string;
    parteLibre: string;
}
export interface ClasificacionDelCumplimiento {
    problemas: ProblemaAnteLaEjecutoria[];
    hayLibertad: boolean;
    /** Todo lo reclamado se dictó vinculado: el amparo es improcedente
     *  (art. 61, fracción IX, de la Ley de Amparo) y se propone sobreseer. */
    todoVinculado: boolean;
    resumen: string;
}
export interface CumplimientoDeEjecutoria {
    consta: boolean;
    /** «amparo directo civil 590/2023»; vacío si no se leyó el número. */
    ejecutoria: string;
    /** Lo que la ejecutoria mandó hacer, hasta 3,000 caracteres. */
    efectos: string;
    /** null mientras no haya efectos con qué clasificar. */
    clasificacion: ClasificacionDelCumplimiento | null;
    /** El servidor PROPONE sobreseer: nada se resolvió con libertad. */
    sobreseerPropuesto: boolean;
    /** Él lo confirmó: sólo entonces el proyecto sobresee (arts. 61, fr. IX,
     *  y 63, fr. V, de la Ley de Amparo) en lugar de estudiar el fondo. */
    sobreseerConfirmado: boolean;
}
export interface OrigenDelActoReclamado {
    /** «juez», «sala_alzada», «sala_tfja», «junta»… o vacío. Es un código del
     *  servidor: la pantalla no lo enseña, enseña `organo`. */
    clase: string;
    instancia: InstanciaDelActo;
    /** Cómo se nombra en la prosa: «el Juez», «la Sala», «la Junta». */
    organo: string;
    /** Una frase: «La sentencia reclamada fue dictada en ÚNICA instancia (no
     *  hubo apelación) y en CUMPLIMIENTO de la ejecutoria del …». */
    aviso: string;
    /** 'leido' del expediente o 'secretario' si él lo corrigió. */
    fuente: 'leido' | 'secretario';
    cumplimiento: CumplimientoDeEjecutoria;
}
/** Lo que el secretario corrige en «De dónde viene lo reclamado». */
export interface CambiosDelOrigen {
    /** 'no_consta' lo afirma él (gana a la lectura); '' devuelve la decisión
     *  a lo que se lea del expediente. */
    instancia?: InstanciaDelActo | 'no_consta';
    cumplimiento?: boolean;
    ejecutoria?: string;
    efectos?: string;
    /** Confirma (true) o retira (false) el sobreseimiento propuesto. */
    sobreseer?: boolean;
}

const _VINCULACIONES: VinculacionEjecutoria[] =
    ['vinculado', 'consentido', 'libre', 'mixto', 'exceso_defecto', 'constitucionalidad', 'no_consta'];

/** Lee el `origen` que manda el servidor. null si no viene: la pantalla no
 *  pinta nada nuevo. Un valor fuera del catálogo cae en lo que no afirma nada
 *  («» de instancia, «no_consta» de vinculación), nunca en otro que sí afirme. */
export function origenDe(x: unknown): OrigenDelActoReclamado | null {
    const j = (x && typeof x === 'object') ? x as Record<string, unknown> : null;
    if (!j) return null;
    const c = (j.cumplimiento && typeof j.cumplimiento === 'object')
        ? j.cumplimiento as Record<string, unknown> : {};
    const k = (c.clasificacion && typeof c.clasificacion === 'object')
        ? c.clasificacion as Record<string, unknown> : null;
    const inst = String(j.instancia ?? '');
    const lista = (Array.isArray(k?.problemas) ? k.problemas : []) as Record<string, unknown>[];
    return {
        clase: String(j.clase ?? ''),
        instancia: inst === 'unica' || inst === 'alzada' ? inst : '',
        organo: String(j.organo ?? ''),
        aviso: String(j.aviso ?? ''),
        fuente: j.fuente === 'secretario' ? 'secretario' : 'leido',
        cumplimiento: {
            consta: !!c.consta,
            ejecutoria: String(c.ejecutoria ?? ''),
            efectos: String(c.efectos ?? ''),
            clasificacion: k ? {
                problemas: lista.filter((p) => p && typeof p === 'object').map((p) => {
                    const v = String(p.vinculacion ?? '') as VinculacionEjecutoria;
                    return {
                        pregunta: String(p.pregunta ?? ''),
                        vinculacion: _VINCULACIONES.includes(v) ? v : 'no_consta',
                        efecto: String(p.efecto ?? ''),
                        porQue: String(p.por_que ?? ''),
                        parteVinculada: String(p.parte_vinculada ?? ''),
                        parteLibre: String(p.parte_libre ?? ''),
                    };
                }).filter((p) => p.pregunta.trim()),
                hayLibertad: !!k.hay_libertad,
                todoVinculado: !!k.todo_vinculado,
                resumen: String(k.resumen ?? ''),
            } : null,
            sobreseerPropuesto: !!c.sobreseer_propuesto,
            sobreseerConfirmado: !!c.sobreseer_confirmado,
        },
    };
}

export interface ContextoDelAsunto {
    numero: string;
    tipoAsunto: string;
    voz: { combate: string; recurrido: string; promovente: string; organo: string };
    antecedentes: string;
    resumenActo: string;
    resumenConceptos: string;
    problemaGlobal: string;
    /** DE QUÉ VA EL ASUNTO, contado de corrido: origen, quién se quejó, qué
     *  le contestaron y por qué, y quién viene ahora con qué. La tarjeta
     *  grande del paso 2. Vacío en las sesiones anteriores al 17-sep-2026. */
    relato: string;
    /** CÓMO VA LO QUE CORRE SOLO tras el adelanto: la consulta del acervo, el
     *  contraste y la propuesta. Cada uno: '' (no empezó) · 'en_curso' ·
     *  'listo' · 'fallo' (y, en la propuesta, 'preguntas' desde el 2-oct-2026:
     *  espera las respuestas del secretario). La pantalla lo pregunta cada
     *  pocos segundos y, con la propuesta lista, la pide y pasa a decidir. */
    avance: { consulta: string; contraste: string; propuesta: string };
    /** LAS PREGUNTAS AL SECRETARIO, con su respuesta (2-oct-2026, CONTRATO C).
     *  Con `avance.propuesta` = «preguntas» la propuesta espera a que conteste
     *  las indispensables. Vacía en un servidor anterior. */
    preguntas?: PreguntaAlSecretario[];
    /** Rediseño, etapa 4: UNA insignia con el punto en que está el asunto y si
     *  lo hecho quedó desactualizado. null si el servidor no la manda. */
    estadoSesion: EstadoDeLaSesion | null;
    problemas: { pregunta: string; resolvio: string; combate: string; jerarquia: string }[];
    avisos: string[];
    /** LA FICHA, PARA QUE LA PANTALLA NO VUELVA EN BLANCO. Al retomar un asunto
     *  se restauraba el contexto y no el encargo: el quejoso y la responsable
     *  salían vacíos sobre un asunto que sí los tenía. */
    encargo?: Record<string, string> | null;
    /** El proyecto ya generado, si lo hay. Null mientras no se haya resuelto. */
    proyecto?: FichaProyecto | null;
    /** LA SUPLENCIA QUE PROPONE EL MOTOR para este asunto. Null si el servidor
     *  no pudo armarla (o es anterior al 26-sep-2026). */
    suplencia?: PropuestaSuplencia | null;
    /** CON QUÉ VARIANTE SE ESCRIBIRÍA EL ESTUDIO DE ESTE ASUNTO si nadie pide
     *  otra (26-sep-2026). Hoy todos van en «v1»; cuando se encienda el plan
     *  por tipo (`ESTUDIO_PROMPT_AD=v4`), es lo que le dice a la pantalla que
     *  enseñe «Cómo se estudiará» también a quien no es de casa. Vacío si el
     *  servidor no lo manda. */
    varianteEstudio?: string;
    /** DE DÓNDE VIENE LO RECLAMADO (30-sep-2026): única instancia o alzada,
     *  quién lo dictó y si fue en cumplimiento de una ejecutoria. null si el
     *  servidor no lo manda (la bandera no rige): entonces no se pinta nada. */
    origen?: OrigenDelActoReclamado | null;
}

/* ═══ LO QUE SE QUEDÓ A MEDIAS ═══
   La sesión del taller vive en `taller_sesiones` desde el primer adelanto —hay
   que serializarla de todos modos, porque con -w 2 el worker que resuelve no
   es el que leyó—, y la pantalla nunca la preguntaba: una recarga en mitad del
   asunto tiraba cuatro minutos de motor y volvía a la casilla de salida. */
/** ═══ LA FICHA DE UN PROYECTO YA GENERADO ═══
 *  David: «hay que tener un historial de proyectos elaborados; cada usuario
 *  podrá acceder a su pantalla terminada y, si lo desea, cambiar de sentido el
 *  proyecto y volver a generarlo».
 *
 *  UNA FICHA POR EXPEDIENTE, y se sobrescribe, igual que el .docx del almacén.
 *  Quien resuelve cinco veces el mismo asunto deja una ficha, no cinco: el
 *  historial que sirve es «mis asuntos», no «mis intentos». */
export interface FichaProyecto {
    generadoEn: string;
    palabras: number;
    avisos: string[];
    huecos: string[];
    advertencias: boolean;
    nombre: string;
    /** Con qué criterio salió. Es lo que permite cambiarlo con conocimiento:
     *  sin esto la pantalla no puede decir de qué se está cambiando. */
    modo: string;
    sentidoGlobal: string;
    criterios: { problema: string; sentido: string; jerarquia: string }[];
    /** Con qué número se archivó su .docx (1 el primero, 2 el del cambio de
     *  sentido…). Lo trae /taller/proyecto; el contexto del asunto no. */
    version?: number;
    /** PROYECTO ANTERIOR A QUE SE GUARDARA LA FICHA. Existe su .docx y consta
     *  cuándo se generó; de las palabras, los avisos y el criterio no hay
     *  registro. Se dice, no se rellena con ceros: un «0 palabras» en pantalla
     *  es peor que no enseñar nada, porque parece un dato. */
    parcial?: boolean;
    /** El mapa del estudio con que se guardó (Paso 2): lo mismo que traía el
     *  evento «listo», para que volver al asunto enseñe la misma pestaña. */
    mapa?: MapaDelEstudio | null;
    /** Lo que corrigió el supervisor (2-oct-2026), igual que en el «listo». */
    supervisor?: SupervisorDelProyecto | null;
}

export interface AsuntoEnCurso {
    numero: string;
    tipoAsunto: string;
    quejoso: string;
    problemas: number;
    consultado: boolean;
    actualizadoEn: string;
    /** Null mientras el asunto no tenga proyecto escrito. */
    proyecto: {
        generadoEn: string; palabras: number; avisos: number;
        huecos: number; sentidoGlobal: string; modo: string;
        /** Generado antes de que se guardara la ficha: consta cuándo y está su
         *  documento, pero de las palabras y los avisos no hay registro. */
        parcial: boolean;
    } | null;
    /** LOS PROYECTOS ANTERIORES DEL MISMO EXPEDIENTE, del más nuevo al más
     *  viejo. Son las veces que el secretario cambió de sentido y volvió a
     *  generar: cada uno con su calificación y su documento. Vacío en los
     *  asuntos anteriores a que esto se guardara. */
    versiones: {
        version: number; generadoEn: string; palabras: number;
        avisos: number; sentidoGlobal: string; modo: string; nombre: string;
        /** 'moderna' | 'estandar' | '' (los anteriores al 25-sep-2026). */
        formato: string;
        /** Consta lo que se resolvió, pero su .docx ya no existe: es el
         *  proyecto anterior a que se archivara una copia por versión, y el
         *  siguiente lo pisó en la ruta sin número. No se ofrece abrirlo. */
        sinCopia: boolean;
    }[];
}

export async function asuntosEnCurso(userEmail: string): Promise<AsuntoEnCurso[]> {
    if (!userEmail) return [];
    try {
        const res = await fetch(
            `${BASE}/taller/en-curso?user_email=${encodeURIComponent(userEmail)}`);
        if (!res.ok) return [];
        const j = await res.json().catch(() => null);
        return ((j?.asuntos ?? []) as Record<string, unknown>[]).map((a) => ({
            numero: String(a.numero ?? ''),
            tipoAsunto: String(a.tipo_asunto ?? 'amparo_directo'),
            quejoso: String(a.quejoso ?? ''),
            problemas: Number(a.problemas ?? 0),
            consultado: !!a.consultado,
            actualizadoEn: String(a.actualizado_en ?? ''),
            proyecto: a.proyecto
                ? {
                    generadoEn: String((a.proyecto as Record<string, unknown>).generado_en ?? ''),
                    palabras: Number((a.proyecto as Record<string, unknown>).palabras ?? 0),
                    avisos: Number((a.proyecto as Record<string, unknown>).avisos ?? 0),
                    huecos: Number((a.proyecto as Record<string, unknown>).huecos ?? 0),
                    sentidoGlobal: String((a.proyecto as Record<string, unknown>).sentido_global ?? ''),
                    modo: String((a.proyecto as Record<string, unknown>).modo ?? ''),
                    parcial: !!(a.proyecto as Record<string, unknown>).parcial,
                }
                : null,
            versiones: ((a.proyectos ?? []) as Record<string, unknown>[]).map((v) => ({
                version: Number(v.version ?? 0),
                generadoEn: String(v.generado_en ?? ''),
                palabras: Number(v.palabras ?? 0),
                avisos: Number(v.avisos ?? 0),
                sentidoGlobal: String(v.sentido_global ?? ''),
                modo: String(v.modo ?? ''),
                nombre: String(v.nombre ?? ''),
                formato: String(v.formato ?? ''),
                sinCopia: !!v.sin_copia,
            })).filter((v) => v.version > 0),
        })).filter((a) => a.numero);
    } catch {
        return [];
    }
}

/* ═══ LA DESCARGA DESDE EL ALMACÉN ═══
   Cuando el proyecto se acaba de generar, el .docx viene en la respuesta y se
   guarda como Blob. Desde el HISTORIAL no hay Blob: el documento vive en el
   almacén y se pide por su número. El servidor lo busca primero en el disco de
   su proceso y luego en el almacén, así que funciona con los dos workers. */
export function descargarDelAlmacen(numero: string, userEmail: string,
                                    version = 0): void {
    // `version` abre un proyecto ANTERIOR del mismo expediente: los que quedan
    // guardados cada vez que el secretario cambia de sentido y vuelve a
    // generar. Sin él viene el último, como siempre.
    const u = `${BASE}/taller/descargar`
        + `?numero=${encodeURIComponent(numero)}`
        + `&user_email=${encodeURIComponent(userEmail)}`
        + (version ? `&version=${version}` : '');
    // Se navega en una pestaña nueva en vez de pedirlo con fetch: así el
    // navegador hace su descarga de siempre y un 404 se ve como un 404, no
    // como un botón que no hace nada.
    window.open(u, '_blank', 'noopener');
}

/* ═══ LOS DOCUMENTOS DEL ASUNTO, Y LA PRIVACIDAD ═══
   David: «hay que guardar los archivos de cada secretario y sus proyectos para
   que pueda volver a trabajar, incluso cambiar de sentido. Dinámico y con
   historial —no eliminar su pdf—, pero con privacidad y no utilización de datos
   personales para ningún fin, sin excepción».

   Hasta ahora los PDF se leían y se tiraban con la petición. Ya se guardan en el
   mismo almacén privado del proyecto, con el correo cifrado en la ruta. */
export interface DocumentosDelAsunto {
    documentos: { rol: string; etiqueta: string; bytes: number }[];
    proyecto: boolean;
    aviso: string;
}

export async function documentosDelAsunto(
    numero: string, userEmail: string,
): Promise<DocumentosDelAsunto | null> {
    if (!numero || !userEmail) return null;
    try {
        const res = await fetch(`${BASE}/taller/documentos`
            + `?numero=${encodeURIComponent(numero)}`
            + `&user_email=${encodeURIComponent(userEmail)}`);
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

/** Abre uno de los documentos guardados. */
export function descargarDocumento(
    numero: string, rol: string, userEmail: string,
): void {
    window.open(`${BASE}/taller/documento`
        + `?numero=${encodeURIComponent(numero)}`
        + `&rol=${encodeURIComponent(rol)}`
        + `&user_email=${encodeURIComponent(userEmail)}`, '_blank', 'noopener');
}

/** LO QUE CONVIERTE LA PROMESA EN GARANTÍA. Destruye documentos, proyecto y
 *  sesión de ese asunto. No se puede deshacer. */
export async function olvidarAsunto(
    numero: string, userEmail: string,
): Promise<string> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    const res = await fetch(`${BASE}/taller/olvidar`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = await res.json().catch(() => null);
    return String(j?.mensaje ?? 'Se borró todo lo de ese asunto.');
}

/** El asunto, para leerlo antes de decidir nada. */
export async function contextoDelAsunto(
    numero: string, userEmail: string,
): Promise<ContextoDelAsunto | null> {
    const u = `${BASE}/taller/contexto-del-asunto`
        + `?numero=${encodeURIComponent(numero)}`
        + `&user_email=${encodeURIComponent(userEmail)}`;
    const res = await fetch(u);
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    if (!j) return null;
    return {
        numero: String(j.numero ?? numero),
        tipoAsunto: String(j.tipo_asunto ?? ''),
        voz: {
            combate: String(j.voz?.combate ?? 'conceptos de violación'),
            recurrido: String(j.voz?.recurrido ?? 'la sentencia reclamada'),
            promovente: String(j.voz?.promovente ?? 'quejoso'),
            organo: String(j.voz?.organo ?? 'la responsable'),
        },
        antecedentes: String(j.antecedentes ?? ''),
        resumenActo: String(j.resumen_acto ?? ''),
        resumenConceptos: String(j.resumen_conceptos ?? ''),
        problemaGlobal: String(j.problema_global ?? ''),
        relato: String(j.relato ?? ''),
        avance: {
            consulta: String(j.avance?.consulta?.estado ?? ''),
            contraste: String(j.avance?.contraste?.estado ?? ''),
            propuesta: String(j.avance?.propuesta?.estado ?? ''),
        },
        estadoSesion: estadoSesionDe(j.estado_sesion),
        preguntas: preguntasDe(j.preguntas),
        problemas: (j.problemas ?? []) as ContextoDelAsunto['problemas'],
        encargo: (j.encargo ?? null) as Record<string, string> | null,
        proyecto: j.proyecto
            ? {
                generadoEn: String(j.proyecto.generado_en ?? ''),
                palabras: Number(j.proyecto.palabras ?? 0),
                avisos: (j.proyecto.avisos ?? []).map(String),
                huecos: (j.proyecto.huecos ?? []).map(String),
                advertencias: !!j.proyecto.advertencias,
                nombre: String(j.proyecto.nombre ?? ''),
                modo: String(j.proyecto.modo ?? ''),
                sentidoGlobal: String(j.proyecto.sentido_global ?? ''),
                criterios: (j.proyecto.criterios ?? []) as FichaProyecto['criterios'],
                parcial: !!j.proyecto.parcial,
                mapa: mapaDe(j.proyecto),
                supervisor: supervisorDe(j.proyecto.supervisor),
            }
            : null,
        avisos: (j.avisos ?? []) as string[],
        suplencia: _suplenciaDe(j.suplencia),
        varianteEstudio: String(j.variante_estudio ?? ''),
        origen: origenDe(j.origen),
    };
}

/** EL SECRETARIO CORRIGE DE DÓNDE VIENE LO RECLAMADO (30-sep-2026). Lo leído
 *  del expediente es una propuesta: si dice «Sala» de un juez de oralidad, o
 *  no vio que la sentencia se dictó en cumplimiento, él lo corrige aquí y lo
 *  suyo manda. Vuelve el origen ya recalculado —con su aviso y, si hay
 *  efectos, la clasificación de los planteamientos—.
 *
 *  VA EN JSON, NO EN FORMULARIO como el resto de /taller/*: así lo fija el
 *  contrato del servidor, y un `false` o un «» deben llegar como tales, no
 *  como la cadena "false". */
export async function guardarOrigen(
    numero: string, userEmail: string, cambios: CambiosDelOrigen,
): Promise<OrigenDelActoReclamado | null> {
    const res = await fetch(`${BASE}/taller/origen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, user_email: userEmail, ...cambios }),
    });
    if (!res.ok) return _fallo(res);
    const j = await res.json().catch(() => null);
    return origenDe(j?.origen);
}


/* ═══════════════════════════════════════════════════════════════════════════
   LA FICHA, LEÍDA DEL AUTO DE ADMISIÓN
   ═══════════════════════════════════════════════════════════════════════════
   David: «basta con subir el auto de admisión y de allí derivar qué
   expediente, qué tribunal resolverá, la autoridad responsable, el o los
   terceros interesados. Pero sólo déjalo como posibilidad optativa».

   No crea sesión, no guarda nada y no gasta cuota: devuelve una PROPUESTA que
   la pantalla pone en los campos y el secretario corrige. Es el único papel
   del expediente que dice quién es quién en su primera página. */
/** UNA REGLA DE NOTIFICACIÓN, tal como la ofrece el servidor para ESTE
 *  asunto. La lista vive en `fase0_oportunidad.reglas_para`: depende de la
 *  ley que rige el acto —para el TFJA, el Boletín Jurisdiccional al tercer
 *  día hábil (art. 65 LFPCA)— y no de Querétaro. */
export interface ReglaSurtimiento {
    clave: string;
    etiqueta: string;
    dias_habiles: number;
    fundamento: string;
}
export interface ReglasOfrecidas {
    fuero: string;
    por_omision: string;
    reglas: ReglaSurtimiento[];
}

export async function reglasSurtimiento(
    tipoAsunto: string, responsable: string,
): Promise<ReglasOfrecidas> {
    const q = new URLSearchParams({ tipo_asunto: tipoAsunto || '', responsable: responsable || '' });
    const res = await fetch(`${BASE}/taller/reglas-surtimiento?${q.toString()}`);
    if (!res.ok) return _fallo(res);
    return (await res.json()) as ReglasOfrecidas;
}

export interface FichaLeida {
    numero?: string;
    tipo_asunto?: string;
    /** Compuesto por el servidor —tipo, materia y número— para que no se
     *  pida lo que ya se sabe. */
    encabezado?: string;
    tribunal?: string;
    ciudad?: string;
    quejoso?: string;
    recurrente?: string;
    responsable?: string;
    responsable_ejecutora?: string;
    tercero_interesado?: string;
    expediente_origen?: string;
    magistrado?: string;
    /** Leída del propio auto cuando trae la portada de la Oficina de
     *  Correspondencia Común — no siempre está, y cuando no está el
     *  secretario la teclea como hoy. ISO. */
    presentacion?: string;
}

export async function fichaDesdeAdmision(
    userEmail: string, archivo: File,
): Promise<{ ficha: FichaLeida; leidos: string[]; avisos: string[]; reglas: ReglasOfrecidas | null }> {
    const fd = new FormData();
    fd.append('user_email', userEmail);
    fd.append('admision', archivo);
    const res = await fetch(`${BASE}/taller/desde-admision`,
                            { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = await res.json();
    return {
        ficha: (j.ficha ?? {}) as FichaLeida,
        leidos: (j.leidos ?? []) as string[],
        avisos: (j.avisos ?? []) as string[],
        // La regla de notificación que corresponde a la responsable leída.
        reglas: (j.reglas_surtimiento ?? null) as ReglasOfrecidas | null,
    };
}


/* ═══════════════════════════════════════════════════════════════════════════
   EL PLAN DEL ESTUDIO: «CÓMO SE ESTUDIARÁ» Y EL MAPA (Paso 2, 26-sep-2026)
   ═══════════════════════════════════════════════════════════════════════════
   Medido hoy en 8 casos × 2 corridas con el localizador ciego: la v2 acorta
   la Solución a la mitad, pero contesta con razón propia sólo el 73 % de los
   argumentos autónomos (la v1, el 79 %) y duplica las omisiones graves (20
   frente a 10). Al acortar sin saber qué argumentos hay, funde los que traen
   dato propio en una respuesta global. El remedio que David aprobó es decidir
   ANTES de redactar, sobre SU criterio, qué argumentos hay, cuáles se
   contestan juntos y por qué, dónde se expone cada premisa una sola vez y qué
   dato trae cada uno; y marcar en el texto dónde se contestó cada uno.

   El plan NO decide el sentido: la etiqueta de cada argumento es la del
   criterio de su problema, y toda «afinación» llega como PROPUESTA que el
   secretario acepta con un clic o deja pasar. Tampoco redacta la regla.

   Los tipos siguen `diag/contrato_paso2.md` (y el esquema de w2_final §4.1).
   Se leen con tolerancia —campo que falta = vacío, nunca una excepción—
   porque el servidor que los produce se escribe en paralelo a esta pantalla. */

export type EstadoPlan = 'listo' | 'en_curso' | 'sin_plan' | 'fallo';

/** El dato propio de un argumento, verificado palabra por palabra en su
 *  fuente (el escrito, la reclamada, una constancia o los antecedentes). */
export interface DatoPropio { texto: string; cita: string; fuente: string }

export interface SegmentoDelPlan {
    /** «C1.a»: C = concepto, A = agravio, AD = adhesivo, S = suplido. */
    id: string;
    /** El problema que decide su suerte. Lo fija el servidor, no el modelo. */
    problemaId: number | string | null;
    /** La pregunta de ese problema, si el servidor la manda (desempata). */
    problema: string;
    parte: string;
    /** procedencia | procesal | forma | omision | fondo */
    vicio: string;
    /** «P2»: la consideración de la resolución que ataca; '' si ninguna. */
    ataca: string;
    /** El segmento que reitera, si sólo repite sin dato propio. */
    reitera: string;
    dato: DatoPropio | null;
    /** = el sentido del criterio de su problema. */
    etiqueta: string;
    /** Del catálogo cerrado (w2_final §4.2), p. ej. «no_combate(P2)». */
    razon: string;
    /** aplica | remite | desarrolla | residual | no_se_estudia | no_se_expresa_art79 */
    trat: string;
    /** Por qué pide desarrollo propio: hecho | prueba | norma | precedente | procesal | consecuencia. */
    diferencia: string;
    /** '' = decidido · «sentido»: ningún problema lo decide · «razon»: sólo
     *  en planes viejos (plan-4 y plan-5, Decisión 6, retirada el 28-sep-2026):
     *  se sigue leyendo porque los planes guardados y los mapas de proyectos
     *  anteriores lo traen, pero ya no se pide nada con él. */
    pendiente: '' | 'sentido' | 'razon';
    /** plan-6 (28-sep-2026): el argumento del que se sigue su suerte —el
     *  «portador» que decide su problema—, si el servidor lo manda. Lo llevan
     *  los que se contestan con el principal, los innecesarios por suficiencia
     *  y los que caen por derivar; el portador NO lo lleva (el servidor se lo
     *  quita). '' si no llega. */
    con: string;
    /** plan-6: la raíz toral de la que depende («P1»), si llega. */
    dependeDe: string;
    /** plan-6: el grupo en que el servidor lo resolvió
     *  (`plan_estudio.resolver_por_dependencia`). Manda sobre cualquier
     *  deducción de la pantalla: revisión del 28-sep-2026, la captura del
     *  462 —23 argumentos «con el principal» que conservaban trat
     *  «desarrolla» salían contados como autónomos—. '' en planes viejos. */
    dependencia: DependenciaDelSegmento;
    /** Del piso de segmentos: el párrafo del resumen y la cita LITERAL del escrito. */
    texto: string;
    cita: string;
    pagina: string;
    sostiene: string;
}

export type DependenciaDelSegmento =
    '' | 'decide' | 'con_el_principal' | 'innecesario' | 'deriva' | 'autonomo';
const _DEPENDENCIAS = new Set(['decide', 'con_el_principal', 'innecesario', 'deriva', 'autonomo']);

/** LA JERARQUÍA DE UN PROBLEMA, como la resuelve el servidor (plan-6): quién
 *  decide y qué se resolvió por consecuencia de él. La ficha del proyecto la
 *  manda sin `autonomo`; el plan entero (GET /taller/plan), con él. */
export interface JerarquiaDeProblema {
    problema: number | string;
    decide: string;
    raiz: string;
    conElPrincipal: string[];
    innecesario: string[];
    deriva: string[];
    autonomo: string[];
}

export interface ProposicionDelPlan {
    /** «P2»: una consideración del acto, con su carácter y su relación. */
    id: string; dice: string; caracter: string; relacion: string; fuente: string; cita: string;
}

/** Dónde se apoya la premisa de una unidad: fuentes y anclas, NUNCA el texto
 *  de la regla —ése lo escribe el estudio desde la razón del secretario—. */
export interface PremisaDelPlan {
    id: string; respondeA: string[]; tesis: string[]; normas: string[]; anclas: string[];
}

/** Lo que se contesta junto: misma consideración, misma razón, mismo vicio
 *  (o lo que el secretario juntó con «Estudiar juntos», que manda). */
export interface UnidadDelPlan {
    id: string;
    problemas: (number | string)[];
    segmentos: string[];
    premisa: string;
    objecion: { de: string; anclas: string[] } | null;
}

/** Una afinación que el plan PROPONE y no aplica: cambiar la calificación. */
export interface PropuestaDelPlan { seg: string; de: string; a: string; porQue: string }

/** LA TABLA DE PROBLEMAS DEL PLAN (revisión, 26-sep-2026). El servidor numera
 *  los problemas desde 1 («PROBLEMA 1…n», `plan_estudio.problemas_del_criterio`)
 *  y guarda aquí cada número con su pregunta. `problema_id` de un segmento y
 *  `problemas` de una unidad son ESE número, no el índice de la pantalla:
 *  leerlos como índice base 0 corría todo un problema —la propuesta del
 *  problema 1 se aceptaba sobre el 2—. La pantalla empareja por la pregunta. */
export interface ProblemaDelPlan {
    id: number | string;
    pregunta: string;
    sentido: string;
    jerarquia: string;
    grupo: string;
    /** El problema del que depende, si el servidor lo manda (plan-6). */
    dependeDe: number | string | null;
}

/** Rediseño, etapa 4: lo que el código le cambió al planificador sin que nadie
 *  lo justificara (`cambios_sin_justificar`). Sólo marca: no decide nada. */
export interface CambioDelPlan {
    objeto: 'segmento' | 'unidad' | 'plan' | string;
    id: string;
    campo: string;
    antes: string;
    despues: string;
    regla: string;
    /** Cómo lo dice el servidor; si no lo manda, la regla legible. */
    descripcion: string;
    /** true = cuenta como cambio que alguien tendría que justificar. */
    cuenta: boolean;
}

export interface PlanDelEstudio {
    version: string;
    clave: string;
    tipoAsunto: string;
    problemas: ProblemaDelPlan[];
    segmentos: SegmentoDelPlan[];
    proposiciones: ProposicionDelPlan[];
    premisas: PremisaDelPlan[];
    unidades: UnidadDelPlan[];
    propuestas: PropuestaDelPlan[];
    avisos: string[];
    orden: { criterio: string; porQue: string } | null;
    /** plan-6: vacía en planes viejos. */
    jerarquia: JerarquiaDeProblema[];
    /** Etapa 4: vacía si el servidor no la manda (bandera apagada). */
    cambios: CambioDelPlan[];
}

export interface RespuestaPlan {
    estado: EstadoPlan;
    /** La huella de la decisión con que se hizo (o se está haciendo) el plan. */
    clave: string;
    plan: PlanDelEstudio | null;
    avisos: string[];
    /** Cuántas corridas lleva la sesión y cuántas admite, si el servidor lo dice. */
    corridas: number | null;
    tope: number | null;
}

type _Obj = Record<string, unknown>;
const _o = (x: unknown): _Obj | null =>
    (x && typeof x === 'object' && !Array.isArray(x)) ? x as _Obj : null;
const _l = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const _t = (x: unknown): string => (x === null || x === undefined ? '' : String(x)).trim();
const _ts = (x: unknown): string[] => _l(x).map(_t).filter(Boolean);

/** Las soluciones posibles de la deliberación (rediseño, etapa 3), leídas con
 *  tolerancia: lo que no tiene id o lado no se pinta. */
export function solucionesDe(x: unknown): SolucionPosible[] {
    return _l(x).map((s) => {
        const o = _o(s);
        if (!o || !_t(o.id)) return null;
        const rv = _o(o.revision);
        const f = _o(o.falla);
        const papel = _t(o.papel);
        return {
            id: _t(o.id), prospera: o.prospera === true, sentido: _t(o.sentido),
            tipo_efecto: _t(o.tipo_efecto), rama: _t(o.rama), desenlace: _ts(o.desenlace).slice(0, 3),
            resumen: _t(o.resumen),
            revision: { estado: _t(rv?.estado) || 'sin_revisar', avisos: _ts(rv?.avisos).slice(0, 3) },
            falla: f && _t(f.que) ? { que: _t(f.que), fatal: f.fatal === true } : null,
            sostenible: o.sostenible !== false,
            papel: papel === 'propuesta' || papel === 'contraria' ? papel : null,
            razon: _t(o.razon),
        } as SolucionPosible;
    }).filter((s): s is SolucionPosible => s !== null);
}
const _n = (x: unknown): number | null => {
    const v = typeof x === 'number' ? x : (typeof x === 'string' && x.trim() ? Number(x) : NaN);
    return Number.isFinite(v) ? v : null;
};

/** Un aviso puede venir como texto o como objeto con su texto dentro. */
function _textoDeAviso(x: unknown): string {
    const o = _o(x);
    if (!o) return _t(x);
    return _t(o.texto ?? o.mensaje ?? o.aviso ?? o.que ?? '') || JSON.stringify(o);
}

/** «no_combate(P2)» puede llegar ya escrito, partido en {tipo, p} o —como lo
 *  guarda el servidor— con la proposición APARTE, en `razon_p` (revisión del
 *  28-sep-2026: sin leerla, «deriva_de_desestimado» salía sin decir de qué
 *  Pk derivaba). La ficha del proyecto no trae `razon_p`: al que cae por
 *  derivar le basta su `depende_de`, que es la misma raíz. */
function _razonDe(x: unknown, aparte: unknown = ''): string {
    const o = _o(x);
    const tipo = o ? _t(o.tipo ?? o.razon ?? o.id ?? '') : _t(x);
    const arg = (o ? _t(o.p ?? o.arg ?? o.proposicion ?? '') : '') || _t(aparte);
    return arg && tipo && !tipo.includes('(') ? `${tipo}(${arg})` : tipo;
}

function _idProblema(x: unknown): number | string | null {
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    const t = _t(x);
    if (!t) return null;
    return /^\d+$/.test(t) ? Number(t) : t;
}

function _texto(x: unknown): string {
    if (Array.isArray(x)) return x.map(_t).filter(Boolean).join(', ');
    return _t(x);
}

/** `cambios_sin_justificar` leído con tolerancia (sin campo o sin regla no pasa). */
export function cambiosDelPlan(x: unknown): CambioDelPlan[] {
    return _l(x).map((y) => {
        const c = _o(y);
        if (!c || !_t(c.campo)) return null;
        const objeto = ['segmento', 'unidad', 'plan'].find((k) => k in c) ?? '';
        return {
            objeto, id: objeto ? _t(c[objeto]) : '', campo: _t(c.campo),
            antes: _texto(c.antes), despues: _texto(c.despues), regla: _t(c.regla),
            /* SÓLO LA QUE MANDA EL SERVIDOR, en su lengua (revisión del envío,
               29-sep): la clave de la regla con los guiones cambiados por
               espacios es vocabulario interno, y el secretario no tiene por qué
               leerlo. Sin descripción, el cambio no se enseña. */
            descripcion: _t(c.descripcion),
            cuenta: c.cuenta === true,
        } as CambioDelPlan;
    }).filter((c): c is CambioDelPlan => c !== null);
}

/** ═══ EL ESTADO DE LA SESIÓN (rediseño, etapa 4) ═══
 *  `taller_estado.estado_sesion` en el servidor: en qué punto está el asunto
 *  y si lo hecho quedó desactualizado porque cambió algo que consumió. Sólo
 *  informa: no bloquea nada. «» = nada que decir (no se pinta insignia). */
export type EstadoSesion = '' | 'en_analisis' | 'faltan_insumos' | 'justificacion_pendiente'
    | 'borrador_sin_plan' | 'proyecto_verificado';

export interface EstadoDeLaSesion {
    estado: EstadoSesion;
    desactualizado: boolean;
    /** Por qué, en frases, de la causa al arrastre. */
    motivos: string[];
}

const _ESTADOS_SESION = new Set(['en_analisis', 'faltan_insumos', 'justificacion_pendiente',
                                 'borrador_sin_plan', 'proyecto_verificado']);
const _MARCA_LEGIBLE: Record<string, string> = {
    consulta: 'la consulta del acervo', contraste: 'el contraste', analisis: 'el análisis de la litis',
    propuesta: 'la propuesta', deliberacion: 'la deliberación', plan: 'el plan del estudio',
    proyecto: 'el proyecto', decisiva: 'la pregunta decisiva', requisitos: 'los requisitos',
};

function _motivoLegible(m: unknown): string {
    const o = _o(m);
    if (!o) return _t(m);
    if (_t(o.texto)) return _t(o.texto);
    const marca = _MARCA_LEGIBLE[_t(o.marca)] ?? _t(o.marca).replace(/_/g, ' ');
    const tipo = _t(o.tipo);
    if (tipo === 'arrastre') return `${marca}: depende de ${_MARCA_LEGIBLE[_t(o.de)] ?? _t(o.de)}, que cambió`;
    if (tipo === 'anterior_a_estados') return 'el proyecto es anterior a esta revisión: no se puede decir';
    const insumo = _t(o.insumo).replace(/_/g, ' ');
    return insumo ? `${marca}: cambió ${insumo} desde que se hizo` : `${marca}: ${tipo.replace(/_/g, ' ')}`;
}

export function estadoSesionDe(x: unknown): EstadoDeLaSesion | null {
    const o = _o(x);
    if (!o) return null;
    const e = _t(o.estado);
    const estado = (_ESTADOS_SESION.has(e) ? e : '') as EstadoSesion;
    const desactualizado = o.desactualizado === true;
    if (!estado && !desactualizado) return null;
    return { estado, desactualizado, motivos: _l(o.motivos).map(_motivoLegible).filter(Boolean).slice(0, 6) };
}

export function planDe(x: unknown): PlanDelEstudio | null {
    const j = _o(x);
    if (!j) return null;
    const segmentos: SegmentoDelPlan[] = _l(j.segmentos).map((y): SegmentoDelPlan => {
        const s = _o(y) ?? {};
        const d = _o(s.dato);
        const pend = _t(s.pendiente).toLowerCase();
        const dep = _t(s.dependencia).toLowerCase();
        const dependencia = (_DEPENDENCIAS.has(dep) ? dep : '') as DependenciaDelSegmento;
        return {
            id: _t(s.id),
            problemaId: _idProblema(s.problema_id),
            problema: _t(s.problema ?? s.pregunta ?? ''),
            parte: _t(s.parte),
            vicio: _t(s.vicio),
            ataca: _t(s.ataca),
            reitera: _t(s.reitera),
            dato: d && _t(d.texto) ? { texto: _t(d.texto), cita: _t(d.cita), fuente: _t(d.fuente) } : null,
            etiqueta: _t(s.etiqueta),
            razon: _razonDe(s.razon, s.razon_p
                ?? (dependencia === 'deriva' || /^deriva_de_desestimado$/i.test(_t(s.razon)) ? s.depende_de : '')),
            trat: _t(s.trat),
            diferencia: _t(s.diferencia),
            pendiente: pend === 'sentido' ? 'sentido' : pend === 'razon' ? 'razon' : '',
            con: _t(s.con),
            dependeDe: _t(s.depende_de),
            dependencia,
            /* El plan reparado trae el párrafo del resumen en `resumen` (el
               piso lo llama `texto`): se leen los dos. */
            texto: _t(s.texto ?? s.resumen),
            cita: _t(s.cita),
            pagina: _t(s.pagina),
            sostiene: _t(s.sostiene),
        };
    }).filter((s) => s.id);
    const orden = _o(j.orden);
    return {
        version: _t(j.version),
        clave: _t(j.clave),
        tipoAsunto: _t(j.tipo_asunto),
        problemas: _l(j.problemas).map((y): ProblemaDelPlan | null => {
            const p = _o(y);
            const id = p ? _idProblema(p.id) : null;
            return p && id !== null
                ? { id, pregunta: _t(p.pregunta), sentido: _t(p.sentido),
                    jerarquia: _t(p.jerarquia), grupo: _t(p.grupo),
                    dependeDe: _idProblema(p.depende_de) }
                : null;
        }).filter((p): p is ProblemaDelPlan => p !== null),
        segmentos,
        proposiciones: _l(j.proposiciones).map((y) => {
            const p = _o(y) ?? {};
            return { id: _t(p.id), dice: _t(p.dice), caracter: _t(p.caracter),
                     relacion: _t(p.relacion), fuente: _t(p.fuente), cita: _t(p.cita) };
        }).filter((p) => p.id),
        premisas: _l(j.premisas).map((y) => {
            const m = _o(y) ?? {};
            const f = _o(m.fuentes) ?? {};
            return { id: _t(m.id), respondeA: _ts(m.responde_a), tesis: _ts(f.tesis),
                     normas: _ts(f.normas), anclas: _ts(m.anclas) };
        }).filter((m) => m.id),
        unidades: _l(j.unidades).map((y) => {
            const u = _o(y) ?? {};
            const ob = _o(u.objecion);
            return {
                id: _t(u.id),
                problemas: _l(u.problemas).map(_idProblema).filter((p): p is number | string => p !== null),
                segmentos: _ts(u.segmentos),
                premisa: _t(u.premisa),
                objecion: ob ? { de: _t(ob.de), anclas: _ts(ob.anclas) } : null,
            };
        }).filter((u) => u.id),
        propuestas: _l(j.propuestas).map((y) => {
            const p = _o(y) ?? {};
            return { seg: _t(p.seg), de: _t(p.de), a: _t(p.a), porQue: _t(p.por_que ?? p.porque) };
        }).filter((p) => p.seg && p.a),
        avisos: _l(j.avisos_al_secretario).map(_textoDeAviso).filter(Boolean),
        orden: orden ? { criterio: _t(orden.criterio), porQue: _t(orden.por_que) } : null,
        cambios: cambiosDelPlan(j.cambios_sin_justificar),
        jerarquia: _l(j.jerarquia).map((y): JerarquiaDeProblema | null => {
            const g = _o(y);
            const problema = g ? _idProblema(g.problema) : null;
            return g && problema !== null
                ? { problema, decide: _t(g.decide), raiz: _t(g.raiz),
                    conElPrincipal: _ts(g.con_el_principal), innecesario: _ts(g.innecesario),
                    deriva: _ts(g.deriva), autonomo: _ts(g.autonomo) }
                : null;
        }).filter((g): g is JerarquiaDeProblema => g !== null),
    };
}

function _respuestaPlanDe(x: unknown): RespuestaPlan {
    const j = _o(x) ?? {};
    const e = _t(j.estado).toLowerCase();
    const estado: EstadoPlan = e === 'listo' || e === 'en_curso' || e === 'fallo' ? e : 'sin_plan';
    return {
        estado,
        clave: _t(j.clave),
        plan: planDe(j.plan),
        avisos: _l(j.avisos).map(_textoDeAviso).filter(Boolean),
        corridas: _n(j.corridas),
        tope: _n(j.tope),
    };
}

/** El plan que hay en la sesión, sea de la decisión que sea: la respuesta
 *  dice su `clave`, y quien pregunta compara con la que pidió. */
export async function leerPlan(numero: string, userEmail: string): Promise<RespuestaPlan> {
    const res = await leerConReintento(
        `${BASE}/taller/plan?numero=${encodeURIComponent(numero)}`
        + `&user_email=${encodeURIComponent(userEmail)}`);
    if (!res.ok) return _fallo(res);
    return _respuestaPlanDe(await res.json().catch(() => null));
}

/** PIDE EL PLAN DE ESTA DECISIÓN con el MISMO formulario que generará el
 *  proyecto (`formularioDelResolver`): así la clave que calcula el servidor
 *  aquí es la que buscará al generar. El servidor nunca recalcula una clave ya
 *  hecha —si lo está, contesta «listo» al momento— y corta en 4 corridas por
 *  sesión; el antirrebote de la pantalla es lo que evita gastarlas en cada
 *  tecla. */
export async function pedirPlan(
    numero: string, userEmail: string, opciones: OpcionesResolver,
): Promise<RespuestaPlan> {
    const fd = formularioDelResolver(numero, userEmail, opciones);
    const res = await fetch(`${BASE}/taller/plan/pedir`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    return _respuestaPlanDe(await res.json().catch(() => null));
}

/** Cuántos argumentos quedaron localizados en el texto, según las marcas. */
export interface CoberturaDelEstudio {
    /** Ids sin marca y sin rastro de sus anclas en el texto. */
    faltan: string[];
    /** Ids sin marca cuyas anclas o cuyo texto sí aparecen: probablemente
     *  contestados, sin la marca. */
    rescatados: string[];
    /** De 0 a 1; null si el servidor no la calculó. */
    cobertura: number | null;
}

/** EL MAPA DEL ESTUDIO: dónde contestó el estudio cada argumento. Las marcas
 *  ⟦C1.a⟧ las escribe el propio modelo al inicio del párrafo que contesta y el
 *  servidor las retira antes de componer: nunca llegan al .docx. */
export interface MapaDelEstudio {
    /** «C1.a» → índices de párrafo; también «M1» (premisa) y «U1» (efectos). */
    marcas: Record<string, number[]>;
    cobertura: CoberturaDelEstudio | null;
    /** El plan con que se escribió, si viaja con el resultado. */
    plan: PlanDelEstudio | null;
    /** La CLAVE del plan con que se escribió, si el resultado la dice (o la
     *  del plan que trae). Vacía si el estudio salió sin plan o el servidor no
     *  la manda. Ver `planDeSesionParaMapa`. */
    planClave: string;
    /** El principio de cada párrafo del estudio limpio, si el servidor lo
     *  manda: sin él la pestaña dice «párrafo 14» y no enseña su texto, porque
     *  reconstruirlo aquí desde lo que se vio escribirse podría enseñar el
     *  párrafo equivocado. */
    parrafos: string[];
    variante: string;
}

/** Lee el mapa del evento «listo» o de la ficha del proyecto. Null si no trae
 *  marcas ni cobertura (variantes v1/v2, o proyectos anteriores). */
export function mapaDe(x: unknown): MapaDelEstudio | null {
    const j = _o(x);
    if (!j) return null;
    let crudo = _o(j.mapa);
    if (crudo && _o(crudo.marcas)) crudo = _o(crudo.marcas);
    const marcas: Record<string, number[]> = {};
    Object.entries(crudo ?? {}).forEach(([id, v]) => {
        const idx = (Array.isArray(v) ? v : [v]).map(_n).filter((n): n is number => n !== null);
        if (id.trim()) marcas[id.trim()] = idx;
    });
    const c = j.cobertura ?? _o(j.mapa)?.cobertura;
    const co = _o(c);
    /* «faltan» del servidor son TODOS los que no llevan marca, rescatados
       incluidos (marcas.verificar); los que ni marca ni rastro vienen en
       «sin_rastro». Aquí «faltan» es lo segundo (integración, 26-sep-2026). */
    const _resc = co ? _ts(co.rescatados) : [];
    const cobertura: CoberturaDelEstudio | null = co
        ? { faltan: Array.isArray(co.sin_rastro) ? _ts(co.sin_rastro)
                                                 : _ts(co.faltan).filter((id) => !_resc.includes(id)),
            rescatados: _resc, cobertura: _n(co.cobertura) }
        : (_n(c) !== null ? { faltan: [], rescatados: [], cobertura: _n(c) } : null);
    if (!Object.keys(marcas).length && !cobertura) return null;
    const plan = planDe(j.plan ?? j.plan_usado);
    return {
        marcas,
        cobertura,
        plan,
        planClave: _t(j.plan_clave ?? j.clave_plan) || plan?.clave || '',
        parrafos: _l(j.parrafos).map(_t),
        variante: _t(j.variante ?? j.variante_estudio),
    };
}

/** EL PLAN DE LA SESIÓN SÓLO SIRVE AL MAPA SI ES EL QUE SE USÓ (revisión,
 *  26-sep-2026). La fila guarda UN plan, el último que se pudo escribir. Si al
 *  generar el plan de la decisión nueva no salió —V0 falló dos veces, venció
 *  el tope de 120 s o se agotaron las 4 corridas—, el estudio se escribe sin
 *  plan y la fila sigue guardando el de la decisión ANTERIOR: pintarlo en el
 *  mapa pondría junto a los párrafos del estudio nuevo las calificaciones de
 *  otra decisión. Sólo vale si la clave coincide con la que el resultado dice
 *  haber usado; sin esa clave, el mapa se enseña sin plan (ids y párrafos). */
export function planDeSesionParaMapa(mapa: MapaDelEstudio, r: RespuestaPlan | null): PlanDelEstudio | null {
    if (!r || r.estado !== 'listo' || !r.plan || !mapa.planClave) return null;
    return r.clave === mapa.planClave ? r.plan : null;
}

/* ═══ LA TARJETA DEL PROBLEMA PRINCIPAL (28-sep-2026, AR 631/2025) ═══
   `GET /taller/tarjeta` la arma el servidor sin llamar a ningún modelo (0 USD)
   con lo que ya calculó: la propuesta y su vía contraria, el contraste, el
   árbol de decisión corrido por las DOS vías, el espejo y la línea de
   internet. La pantalla la pide al llegar la propuesta y la pinta en
   ProblemaPrincipal.tsx (contrato_tarjeta.md, formato 1).

   Lectura tolerante, como la del plan: todo puede faltar o venir nulo. Un
   servidor anterior a la tarjeta contesta 404 —o 405—: eso NO es un error del
   asunto, es que aún no la sirve, y la pantalla sigue con la tarjeta que arma
   ella misma con la propuesta (`tarjetaDeLaPropuesta`). Por eso esos dos
   códigos devuelven null en vez de lanzar. */
const _FUERZAS = ['obliga', 'orienta', 'pleno_circuito', 'precedente_propio'] as const;
function _apoyoDe(x: unknown): ApoyoDeLaVia | null {
    const o = _o(x);
    // Un apoyo que llega como texto suelto es un registro o una norma: el
    // servidor ya no los manda así, pero una tarjeta vieja podría.
    if (!o) {
        const t = _t(x);
        if (!t) return null;
        const reg = /^\d{6,8}$/.test(t) ? t : '';
        return { registro: reg, rubro: '', instancia: '', tipo: '', fuerza: '', fuerza_texto: '',
                 vigencia: null, de_internet: false, en_acervo: !!reg, norma: reg ? null : t };
    }
    const f = _t(o.fuerza).toLowerCase();
    const norma = _t(o.norma);
    const registro = _t(o.registro);
    if (!registro && !norma) return null;
    return {
        registro,
        rubro: _t(o.rubro),
        instancia: _t(o.instancia),
        tipo: _t(o.tipo).toLowerCase(),
        fuerza: (_FUERZAS as readonly string[]).includes(f) ? f as FuerzaDelApoyo : '',
        fuerza_texto: _t(o.fuerza_texto),
        vigencia: _t(o.vigencia) || null,
        de_internet: o.de_internet === true,
        // Sin el campo se da por verificado sólo si trae registro: el servidor
        // no manda como cita lo que no está en el material.
        en_acervo: o.en_acervo === undefined ? !!registro : o.en_acervo === true,
        norma: norma || null,
    };
}
const _apoyosDe = (x: unknown): ApoyoDeLaVia[] =>
    _l(x).map(_apoyoDe).filter((a): a is ApoyoDeLaVia => !!a);

function _suerteDe(x: unknown): SuerteDelSecundario | null {
    const o = _o(x);
    if (!o) return null;
    return {
        sentido: _t(o.sentido).toLowerCase(),
        de: _t(o.de).toLowerCase(),
        por_que: _t(o.por_que ?? o.porQue),
        relacion: _t(o.relacion).toLowerCase(),
        guarda: _t(o.guarda).toLowerCase() || null,
        recalificar: o.recalificar === true,
        previsto: o.previsto === true,
    };
}

function _viaDe(x: unknown): ViaDeLaTarjeta | null {
    const o = _o(x);
    if (!o) return null;
    const sentido = _t(o.sentido).toLowerCase();
    const razon = _t(o.razon);
    if (!sentido && !razon) return null;
    const cad = _o(o.cadena);
    const obj = _o(o.objecion);
    const vp = _o(o.via_protectora);
    return {
        sentido,
        prospera: o.prospera === true ? true : o.prospera === false ? false : null,
        razon,
        efecto: _t(o.efecto),
        desenlace: _ts(o.desenlace),
        desenlace_nota: _t(o.desenlace_nota) || null,
        interpretacion: _t(o.interpretacion) || null,
        cadena: cad ? {
            regla: _t(cad.regla),
            hechos: _l(cad.hechos).map((h) => {
                const q = _o(h) ?? {};
                return { afirma: _t(q.afirma), cita: _t(q.cita), fuente: _t(q.fuente) };
            }).filter((h) => h.afirma || h.cita),
            subsuncion: _t(cad.subsuncion),
            conclusion: _t(cad.conclusion),
        } : null,
        objecion: obj && (_t(obj.de_la_otra_via) || _t(obj.respuesta))
            ? { de_la_otra_via: _t(obj.de_la_otra_via), respuesta: _t(obj.respuesta) } : null,
        apoyos: _apoyosDe(o.apoyos),
        via_protectora: vp ? {
            sentido: _t(vp.sentido).toLowerCase(), posible: vp.posible === true,
            norma: _t(vp.norma), lectura: _t(vp.lectura), limite: _t(vp.limite),
        } : null,
    };
}

/** El contrato de la SPEC B entero —{hacen_falta, tenemos, donde, por_que,
 *  fundamento, reasuncion}—, leído igual en /taller/proponer y en la tarjeta.
 *  Hasta el 28-sep-2026 sólo se tipaban los tres primeros y sólo en la
 *  tarjeta: el de /taller/proponer no lo leía nadie. */
export function conceptosOmitidosDe(x: unknown): ConceptosOmitidos | null {
    const co = _o(x);
    if (!co) return null;
    return {
        hacen_falta: co.hacen_falta === true, por_que: _t(co.por_que), tenemos: co.tenemos === true,
        donde: _t(co.donde).toLowerCase(), fundamento: _t(co.fundamento),
        reasuncion: _t(co.reasuncion).toLowerCase(),
    };
}

/** Una lista que puede venir como lista o como un solo elemento suelto. */
const _uno = (x: unknown): unknown[] => (Array.isArray(x) ? x : x === null || x === undefined || x === '' ? [] : [x]);
/** El nombre de una parte: texto, o un objeto con su nombre dentro. */
function _parte(x: unknown): string {
    const o = _o(x);
    return o ? _t(o.nombre ?? o.quien ?? o.autoridad) : _t(x);
}

/** LA FICHA PROCESAL (SPEC E2), leída con tolerancia: la arma la API en otra
 *  rama y aquí se acepta la forma del contrato y sus variantes razonables
 *  (lista o elemento suelto, texto u objeto, `materia_revision` u
 *  `organo_recurrida`). null = no trae nada que enseñar. AR 631/2025: sin ella,
 *  la pantalla no decía que recurre la TERCERA contra una concesión. */
export function fichaDe(x: unknown): FichaProcesal | null {
    const f = _o(x);
    if (!f) return null;
    const responsables = _uno(f.responsables ?? f.responsable).map((y) => {
        const o = _o(y);
        return o ? { autoridad: _t(o.autoridad ?? o.nombre), acto: _t(o.acto ?? o.acto_reclamado) }
                 : { autoridad: _t(y), acto: '' };
    }).filter((r) => r.autoridad || r.acto);
    const rec = _o(f.recurrida);
    const organo = _t(rec ? (rec.organo ?? rec.quien) : (f.organo_recurrida ?? f.recurrida));
    const resolvio = _uno(rec ? rec.resolvio : f.resolvio).map((y) => {
        const o = _o(y);
        return o ? { acto: _t(o.acto), sentido: _t(o.sentido).toLowerCase() } : { acto: '', sentido: _t(y) };
    }).filter((r) => r.acto || r.sentido);
    const rte = _o(f.recurrente);
    const quien = rte ? _t(rte.quien ?? rte.nombre) : _t(f.recurrente);
    const caracter = _t(rte ? rte.caracter : f.caracter_recurrente);
    // LO FIRME, APARTE (revisión adversarial de la fase E): el servidor lo
    // manda en `firme`; uno anterior lo metía en `materia` tras « · firme: ».
    let materia = _t(f.materia ?? f.materia_revision);
    let firme = _t(f.firme);
    const corte = materia.indexOf(' · firme: ');
    if (!firme && corte >= 0) {
        firme = materia.slice(corte + ' · firme: '.length).trim();
        materia = materia.slice(0, corte).trim();
    } else if (!firme && materia.startsWith('firme: ')) {
        firme = materia.slice('firme: '.length).trim();
        materia = '';
    }
    const a93 = _o(f.art_93);
    const art_93 = a93 && (_t(a93.fraccion) || _t(a93.previo) || _t(a93.si_prospera)) ? {
        fraccion: _t(a93.fraccion), previo: _t(a93.previo),
        si_prospera: _t(a93.si_prospera), si_no_prospera: _t(a93.si_no_prospera),
    } : null;
    const ficha: FichaProcesal = {
        tipo: _t(f.tipo ?? f.tipo_asunto).toLowerCase(),
        quejosa: _parte(f.quejosa ?? f.quejoso),
        responsables,
        terceros: _uno(f.terceros ?? f.tercero).map(_parte).filter(Boolean),
        recurrida: organo || resolvio.length ? { organo, resolvio } : null,
        recurrente: quien || caracter ? { quien, caracter } : null,
        materia,
        firme,
        art_93,
        avisos: _l(f.avisos).map(_textoDeAviso).filter(Boolean),
    };
    const vacia = !ficha.quejosa && !responsables.length && !ficha.terceros.length && !ficha.recurrida
        && !ficha.recurrente && !ficha.materia && !ficha.firme && !ficha.art_93;
    return vacia ? null : ficha;
}

export function tarjetaDe(x: unknown): TarjetaDecision | null {
    const j = _o(x);
    if (!j) return null;
    const ec = _t(j.estado_calculo).toLowerCase();
    const est = _t(j.estado).toLowerCase().replace('renido', 'reñido');
    const rec = _t(j.recomendada).toLowerCase();
    const p = _o(j.principal);
    const dm = p ? _o(p.discrepa_motor) : null;
    const con = p ? _o(p.contraste) : null;
    const pred = p ? _o(p.prediccion) : null;
    const vias = _o(j.vias) ?? {};
    const qc = _o(j.que_la_cambiaria);
    const crux = qc ? _o(qc.crux) : null;
    const lc = _o(j.linea_corte) ?? {};
    const del = _o(j.deliberacion);
    const pt = del ? _o(del.proposicion_toral) : null;
    const co = _o(j.conceptos_omitidos);
    return {
        formato: _n(j.formato) ?? 1,
        estado_calculo: ec === 'sin_propuesta' || ec === 'calculando' ? ec : 'listo',
        huella: _t(j.huella),
        principal: p ? {
            numero: _n(p.numero) ?? 0,
            pregunta: _t(p.pregunta),
            pregunta_recurrida: _t(p.pregunta_recurrida),
            figura: _t(p.figura),
            clase: _t(p.clase),
            jerarquia_de: _t(p.jerarquia_de),
            por_que_principal: _t(p.por_que_principal),
            discrepa_motor: dm && (_t(dm.nota) || _n(dm.numero_motor) !== null)
                ? { numero_motor: _n(dm.numero_motor), nota: _t(dm.nota) } : null,
            contraste: con && (_t(con.razon_toral) || con.la_combate !== undefined) ? {
                razon_toral: _t(con.razon_toral), la_combate: con.la_combate === true,
                sobrevive: con.sobrevive === true, veredicto_previo: _t(con.veredicto_previo),
            } : null,
            prediccion: pred && _t(pred.frase) ? { frase: _t(pred.frase), n: _n(pred.n) ?? 0 } : null,
        } : null,
        vias: { propuesta: _viaDe(vias.propuesta), opuesta: _viaDe(vias.opuesta) },
        recomendada: rec === 'propuesta' || rec === 'opuesta' ? rec : null,
        // Un estado que no se reconoce no se inventa: sin estado, la pantalla
        // no rotula ninguna vía como recomendada ni dice «claro».
        estado: est === 'claro' || est === 'reñido' || est === 'no_alcanza' ? est : '',
        estado_por_que: _ts(j.estado_por_que),
        secundarios: _l(j.secundarios).map((y) => {
            const s = _o(y) ?? {};
            return {
                numero: _n(s.numero) ?? 0, pregunta: _t(s.pregunta), clase: _t(s.clase),
                relacion: _t(s.relacion).toLowerCase(),
                en_propuesta: _suerteDe(s.en_propuesta), en_opuesta: _suerteDe(s.en_opuesta),
            };
        }).filter((s) => s.numero > 0 || s.pregunta),
        independientes: _l(j.independientes).map((y) => {
            const s = _o(y) ?? {};
            const pr = _o(s.propuesta);
            return {
                numero: _n(s.numero) ?? 0, pregunta: _t(s.pregunta),
                propuesta: pr ? { sentido: _t(pr.sentido).toLowerCase(), razon: _t(pr.razon),
                                  apoyos: _apoyosDe(pr.apoyos) } : null,
            };
        }).filter((s) => s.numero > 0 || s.pregunta),
        que_la_cambiaria: qc ? {
            en_contra: _t(qc.en_contra),
            crux: crux && _t(crux.que) ? { que: _t(crux.que), si_cambia: _t(crux.si_cambia),
                                            constancia: _t(crux.constancia) } : null,
            constancias_indispensables: _ts(qc.constancias_indispensables),
            limite_protector: _t(qc.limite_protector) || null,
        } : null,
        tu_tribunal: _l(j.tu_tribunal).map((y) => {
            const f = _o(y) ?? {};
            return {
                expediente: _t(f.expediente), fecha: _t(f.fecha), sentido: _t(f.sentido),
                // «parcialmente fundado» (así lo escribe la lectura de la OAJ) es
                // el id parcialmente_fundado de FINAS: sin esto no casaba con
                // ninguna vía.
                calificacion: _t(f.calificacion).toLowerCase().trim().replace(/\s+/g, '_'), razon: _t(f.razon),
                similitud: _n(f.similitud), nivel: _t(f.nivel) || null, neun: _t(f.neun),
                tipo_asunto: _t(f.tipo_asunto), cota_inferior: f.cota_inferior === true,
                fuente: _t(f.fuente), pregunta: _t(f.pregunta), autoridad: _t(f.autoridad),
                enlace_oaj: _t(f.enlace_oaj), pdf_url: _t(f.pdf_url), tema: _t(f.tema),
            };
        }).filter((f) => f.expediente),
        linea_corte: { confirmadas: _apoyosDe(lc.confirmadas), pistas: _ts(lc.pistas) },
        deliberacion: del ? {
            origen: _t(del.origen), pregunta_decisiva: _t(del.pregunta_decisiva), figura: _t(del.figura),
            proposicion_toral: pt && _t(pt.dice) ? { dice: _t(pt.dice), cita: _t(pt.cita) } : null,
            // Rediseño, etapa 3: sólo si el servidor las manda (bandera).
            ...(Array.isArray(del.soluciones) ? { soluciones: solucionesDe(del.soluciones) } : {}),
        } : null,
        conceptos_omitidos: co ? conceptosOmitidosDe(co) : null,
        ficha: fichaDe(j.ficha),
        deliberacion_estado: (['en_curso', 'listo', 'fallo', 'apagada'] as const)
            .find((x) => x === _t(j.deliberacion_estado).toLowerCase()) ?? '',
        avisos: _l(j.avisos).map(_textoDeAviso).filter(Boolean),
        probabilidad: probabilidadDeLaTarjetaDe(j.probabilidad),
        origen: 'servidor',
    };
}

/** CONTRATO E (2-oct-2026): la probabilidad del lado que la tarjeta recomienda.
 *  `p` se guarda tal cual —fracción—; quien la pinta la lee como la del lado
 *  que gana (`pctDelLado`, tarjetaDelPrincipal.ts), que por la regla del
 *  50.01% es siempre el mayor de los dos. Ilegible o sin número = null. */
function probabilidadDeLaTarjetaDe(x: unknown): ProbabilidadDeLaTarjeta | null {
    const o = _o(x);
    const p = o ? _n(o.p) : null;
    if (!o || p === null) return null;
    const lado = _t(o.lado).toLowerCase();
    return {
        p: Math.min(1, Math.max(0, p > 1 ? p / 100 : p)),
        lado: lado === 'prospera' || lado === 'no_prospera' ? lado : '',
        explicacion: _t(o.explicacion),
    };
}

/** Pide la tarjeta del asunto. null = el servidor aún no la sirve (404/405) o
 *  no trae nada legible: la pantalla sigue con la suya. */
export async function leerTarjeta(numero: string, userEmail: string): Promise<TarjetaDecision | null> {
    const res = await fetch(
        `${BASE}/taller/tarjeta?numero=${encodeURIComponent(numero)}`
        + `&user_email=${encodeURIComponent(userEmail)}`);
    if (res.status === 404 || res.status === 405) return null;
    if (!res.ok) return _fallo(res);
    return tarjetaDe(await res.json().catch(() => null));
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA MEJORA FINAL DEL REDACTOR (2-oct-2026)
   ═══════════════════════════════════════════════════════════════════════════
   David: «el motor siempre pide constancias (…) simplificarlo a preguntas
   como ¿El emplazamiento carece de cercioramiento?»; «el motor nunca se
   atreve a proponer (…) si hay un 50.01% de probabilidad hacia un lado sea
   esa la propuesta»; y un supervisor que revise el proyecto y corrija sus
   errores. Aquí viven los contratos que lo traen a la pantalla (A, B, C y D
   del paquete): la pregunta al secretario, la probabilidad del sentido y las
   correcciones del supervisor. TODO SE LEE CON TOLERANCIA: una sesión vieja o
   un servidor con las banderas apagadas no mandan nada de esto, y entonces la
   pantalla se queda exactamente como estaba. */

/** CONTRATO B. Una pregunta cerrada sobre lo que el acto reclamado no dice.
 *  `indispensable` la calcula el servidor por código (el principal, las dos
 *  respuestas llevan a desenlaces distintos y el acto no se pronuncia): con
 *  una indispensable sin contestar no hay propuesta. */
export interface PreguntaAlSecretario {
    /** Estable del servidor («P1»…): es por donde viaja la respuesta, nunca
     *  por el texto. */
    id: string;
    pregunta: string;
    tipo: 'si_no' | 'texto';
    para_que: string;
    /** El problema al que sirve, 1-based (0 = no lo dice). */
    problema: number;
    indispensable: boolean;
    /** Lo que sostiene la parte: se pregunta precisamente porque no se da
     *  por cierto (David, 2-oct-2026). */
    afirma_la_parte: string;
    cita_escrito: string;
    el_acto: string;
    /** Cómo se califica si la respuesta es sí / no. */
    si_si: string;
    si_no: string;
    /** Lo que supone el motor si nadie contesta: la carga de la prueba. */
    si_no_contesta: string;
    /** null = sin contestar; «si» · «no» · «no_consta» · o el texto. */
    respuesta: string | null;
}

/** La respuesta de una pregunta, como viaja a /taller/responder. */
export interface RespuestaAPregunta { id: string; respuesta: string }

export function preguntaDe(x: unknown): PreguntaAlSecretario | null {
    const o = _o(x);
    const id = o ? _t(o.id) : '';
    const pregunta = o ? _t(o.pregunta) : '';
    if (!o || !id || !pregunta) return null;
    const r = o.respuesta === null || o.respuesta === undefined ? '' : _t(o.respuesta);
    return {
        id, pregunta,
        tipo: _t(o.tipo).toLowerCase() === 'texto' ? 'texto' : 'si_no',
        para_que: _t(o.para_que),
        problema: _n(o.problema) ?? 0,
        indispensable: o.indispensable === true,
        afirma_la_parte: _t(o.afirma_la_parte),
        cita_escrito: _t(o.cita_escrito),
        el_acto: _t(o.el_acto),
        si_si: _t(o.si_si),
        si_no: _t(o.si_no),
        si_no_contesta: _t(o.si_no_contesta),
        respuesta: r || null,
    };
}

/** La lista, sin las ilegibles ni los ids repetidos (el primero manda). */
export function preguntasDe(x: unknown): PreguntaAlSecretario[] {
    const vistos = new Set<string>();
    const out: PreguntaAlSecretario[] = [];
    for (const y of _l(x)) {
        const p = preguntaDe(y);
        if (!p || vistos.has(p.id)) continue;
        vistos.add(p.id);
        out.push(p);
    }
    return out;
}

/** CONTRATO A. La probabilidad del sentido (probabilidad_sentido.py +
 *  examinador.py): la RAZONADA por el examen de las dos vías que el motor
 *  escribió (David, 2-oct-2026: «lo que resuelve es la inteligencia en el
 *  razonamiento jurídico»), no la tasa del tribunal. Sin examen, `fuente` es
 *  «motor» y no hay número. Los precedentes del tribunal sólo avisan
 *  (`precedentes_aviso`). `lado` es el que gana (más del 50%) y se propone. */
export interface ProbabilidadDelSentido {
    p_prospera: number | null;
    lado: 'prospera' | 'no_prospera' | null;
    fuente: 'examinador' | 'jurimetria' | 'motor' | '';
    tasa: number | null;
    n_tasa: number;
    precedentes: { n: number; a_favor: number; en_contra: number; filas: unknown[] };
    motor: 1 | 0 | null;
    explicacion: string;
    /** La propuesta del motor iba al otro lado y la probabilidad la volteó. */
    volteada: boolean;
    /** Lo que el motor había leído antes del volteo. */
    sentido_motor: string;
}

export function probabilidadDe(x: unknown): ProbabilidadDelSentido | null {
    const o = _o(x);
    if (!o) return null;
    const lado = _t(o.lado).toLowerCase();
    const p = _n(o.p_prospera);
    const pr = _o(o.precedentes);
    const fuente = _t(o.fuente).toLowerCase();
    const motor = _n(o.motor);
    const r: ProbabilidadDelSentido = {
        p_prospera: p === null ? null : Math.min(1, Math.max(0, p > 1 ? p / 100 : p)),
        lado: lado === 'prospera' || lado === 'no_prospera' ? lado : null,
        fuente: fuente === 'examinador' || fuente === 'jurimetria' || fuente === 'motor' ? fuente : '',
        tasa: _n(o.tasa),
        n_tasa: _n(o.n_tasa) ?? 0,
        precedentes: {
            n: _n(pr?.n) ?? 0, a_favor: _n(pr?.a_favor) ?? 0, en_contra: _n(pr?.en_contra) ?? 0,
            filas: _l(pr?.filas),
        },
        motor: motor === 1 ? 1 : motor === 0 ? 0 : null,
        explicacion: _t(o.explicacion),
        volteada: o.volteada === true,
        sentido_motor: _t(o.sentido_motor).toLowerCase(),
    };
    // Sin lado ni número no hay nada que decir: es como si no viniera.
    return r.lado || r.p_prospera !== null ? r : null;
}

/** CONTRATO D. Lo que el supervisor corrigió del proyecto antes de entregarlo. */
export type TipoDeCorreccion = 'error_juridico' | 'incongruencia' | 'hecho_no_acreditado' | 'cita'
    | 'repeticion' | 'extension' | 'redaccion';
export interface CorreccionDelSupervisor {
    tipo: TipoDeCorreccion | '';
    /** 1-based, el párrafo del estudio (0 = no lo dice). */
    parrafo: number;
    antes: string;
    despues: string;
    motivo: string;
}
export interface SupervisorDelProyecto {
    estado: 'aplicado' | 'sin_cambios' | 'fallo' | 'apagado' | 'vencido';
    modelo: string;
    segundos: number;
    correcciones: CorreccionDelSupervisor[];
    descartadas: number;
    /** Sólo el camino plano (cabecera x-supervisor): cuántas fueron, sin la
     *  lista. En los demás, la longitud de `correcciones`. */
    total: number;
}

const _TIPOS_CORRECCION: TipoDeCorreccion[] = ['error_juridico', 'incongruencia', 'hecho_no_acreditado',
    'cita', 'repeticion', 'extension', 'redaccion'];

export function supervisorDe(x: unknown): SupervisorDelProyecto | null {
    const o = _o(x);
    if (!o) return null;
    const est = _t(o.estado).toLowerCase();
    const estados = ['aplicado', 'sin_cambios', 'fallo', 'apagado', 'vencido'] as const;
    const estado = estados.find((e) => e === est);
    if (!estado) return null;
    const correcciones = _l(o.correcciones).map((y) => {
        const c = _o(y);
        if (!c) return null;
        const tipo = _t(c.tipo).toLowerCase();
        const r: CorreccionDelSupervisor = {
            tipo: _TIPOS_CORRECCION.find((k) => k === tipo) ?? '',
            parrafo: _n(c.parrafo) ?? 0,
            antes: _t(c.antes).slice(0, 400),
            despues: _t(c.despues).slice(0, 400),
            motivo: _t(c.motivo),
        };
        return r.antes || r.despues || r.motivo ? r : null;
    }).filter((c): c is CorreccionDelSupervisor => c !== null);
    return {
        estado, modelo: _t(o.modelo), segundos: _n(o.segundos) ?? 0, correcciones,
        descartadas: _n(o.descartadas) ?? 0, total: correcciones.length,
    };
}

/** El camino plano sólo dice cuántas: «3 correcciones». */
export function supervisorDeCabecera(h: string | null | undefined): SupervisorDelProyecto | null {
    const m = /(\d+)/.exec(h || '');
    if (!m) return null;
    const n = Number(m[1]);
    return { estado: n > 0 ? 'aplicado' : 'sin_cambios', modelo: '', segundos: 0, correcciones: [],
             descartadas: 0, total: n };
}

/** CONTRATO C. Las respuestas del secretario, todas en un solo envío. El
 *  servidor las guarda en la sesión (con -w 2 nada vive en la memoria de un
 *  worker), tira la propuesta guardada y la vuelve a pedir en segundo plano.
 *  `propuesta`: «en_curso» (ya se está proponiendo) o «preguntas» (aún falta
 *  alguna indispensable). */
export async function responderPreguntas(
    numero: string, userEmail: string, respuestas: RespuestaAPregunta[],
): Promise<{ ok: boolean; pendientes: number; propuesta: 'en_curso' | 'preguntas' }> {
    const fd = new FormData();
    fd.append('numero', numero);
    fd.append('user_email', userEmail);
    fd.append('respuestas_json', JSON.stringify(
        respuestas.filter((r) => r.id && (r.respuesta || '').trim())
            .map((r) => ({ id: r.id, respuesta: r.respuesta.trim() }))));
    const res = await fetch(`${BASE}/taller/responder`, { method: 'POST', body: fd });
    if (!res.ok) return _fallo(res);
    const j = _o(await res.json().catch(() => null)) ?? {};
    return {
        ok: j.ok !== false,
        pendientes: _n(j.pendientes) ?? 0,
        propuesta: _t(j.propuesta) === 'preguntas' ? 'preguntas' : 'en_curso',
    };
}
