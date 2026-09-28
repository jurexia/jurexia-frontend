/**
 * LA TESIS SE COMPRUEBA EN NUESTRO ACERVO, NO EN EL SEMANARIO EN VIVO
 * (28-sep-2026)
 * -------------------------------------------------------------------
 * Grabando los anuncios v59, el sello de citas dijo «No se pudieron comprobar
 * todas las citas» en TODA respuesta con jurisprudencia: una pensión con
 * cuatro tesis de la Corte, un fraude con otras cuatro. Ninguna estaba mal.
 * Fallaba la comprobación: desde el 2-sep el Semanario está detrás de
 * Incapsula y a las IP de Vercel y Render les contesta un reto en HTML (200,
 * text/html). El proxy no podía leer ni una ficha y cada registro salía «sin
 * comprobar». Desde el 26-sep eso se pinta en gris en la cabecera del sello,
 * así que el aviso salía en casi todas las respuestas.
 *
 * Las tesis del acervo se DESCARGARON del propio Semanario en agosto de 2026
 * (`jurisprudencia_nacional_v3`, ingesta `v3_semanario_2026-08`): registro,
 * rubro, texto, clave, instancia y el PDF oficial en nuestro bucket. La v2
 * —la que mira `POST /acervo/registros`— tiene exactamente los mismos 71,655
 * registros (contados el 28-sep-2026: cero de diferencia). Es la misma
 * pregunta que se le hacía a la Corte, contestada con su propia ficha, y el
 * endpoint ya está en producción: lo usa el circuito de incidencias.
 *
 * LA REGLA DE ORO NO CAMBIA: sólo una ausencia PROBADA acusa. Que un registro
 * no esté en el acervo no prueba que no exista —el acervo empieza en la
 * Novena Época; la «FUNDAMENTACION Y MOTIVACION.» de la Séptima (238212)
 * existe y no está, y tampoco las tesis publicadas después de la descarga—.
 * Fuera del acervo se sigue preguntando al Semanario y sólo su «no existe»
 * acusa. Hoy casi nunca llega: Incapsula reta también a los registros
 * inexistentes, incluso desde una conexión doméstica (medido el 28-sep). Así
 * que un registro fuera del acervo sale «sin comprobar», que es lo honesto.
 * Contra la invención, la comprobación fuerte es la del backend: marca los
 * registros que no venían en el contexto (`fueraDelAcervo` en el sello).
 *
 * Sin React ni Next: la ruta es una envoltura, y `comprobaciones/tesis_acervo.mjs`
 * corre este mismo código en Node.
 */

import { createHash } from 'node:crypto';

const SEMANARIO = 'https://sjf2.scjn.gob.mx';
const API_SEMANARIO = `${SEMANARIO}/services/sjftesismicroservice/api/public/tesis`;

/** La tesis comprobada. Las llaves de siempre, más `origen` y `pdf`. */
export interface FichaTesis {
    verificada: true;
    /** De dónde sale: la copia del Semanario que guarda Iurexia, o el Semanario en vivo. */
    origen: 'acervo' | 'semanario';
    registro: string;
    rubro: string;
    texto: string;
    precedentes: string;
    localizacion: string;
    clave: string | null;
    epoca: string | null;
    fuente: string | null;
    instancia: string | null;
    volumen: string | null;
    subVolumen: string | null;
    pagina: string | null;
    materias: string | null;
    tipoTesis: string | null;
    publicacion: string;
    /** El PDF oficial en nuestro bucket, cuando lo tenemos y se pidió la ficha. */
    pdf: string | null;
    url: string;
}

export interface FalloTesis {
    verificada: false;
    motivo: 'no_encontrada' | 'semanario_no_disponible';
    /** Para nosotros, no para el abogado: qué falló y dónde. */
    detalle?: string;
    registro: string;
}

type Pedir = typeof fetch;
type PedirAlSemanario = (url: string, registro: string) => Promise<{ status: number; texto: string }>;

export interface Opciones {
    /** Base del API de Iurexia (`NEXT_PUBLIC_API_URL`). */
    api: string;
    /** Además de existencia y rubro, la ficha del panel: texto, clave, PDF. */
    ficha?: boolean;
    /** Milisegundos por llamada al API. */
    tiempo?: number;
    /** Inyectables, para las comprobaciones. */
    pedir?: Pedir;
    semanario?: PedirAlSemanario;
}

/** El Semanario, y a veces el acervo, traen HTML dentro de sus campos; aquí sólo hace falta el texto. */
export function aTextoPlano(html: unknown): string {
    if (typeof html !== 'string' || !html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function limpio(v: unknown): string | null {
    const t = typeof v === 'string' ? v.trim() : '';
    return t || null;
}

function causaDe(e: unknown): string {
    if (!(e instanceof Error)) return String(e);
    const codigo = (e as { cause?: { code?: string } }).cause?.code;
    return `${e.name}: ${e.message}${codigo ? ` (${codigo})` : ''}`;
}

/**
 * El id del punto de la tesis en `jurisprudencia_nacional_v3`:
 * uuid5(NAMESPACE_URL, "tesis:{registro}"), como lo escribe
 * `redactor-sentencias/rag/ingesta.py`. Sirve para pedir la ficha completa a
 * `GET /cita/{id}`. Si algún día cambia el esquema, `/cita` contesta 404 y
 * la ficha se queda corta; la comprobación no depende de esto.
 */
const NAMESPACE_URL = '6ba7b8119dad11d180b400c04fd430c8';

export function idTesisV3(registro: string): string {
    const h = createHash('sha1')
        .update(Buffer.from(NAMESPACE_URL, 'hex'))
        .update(`tesis:${registro}`, 'utf8')
        .digest();
    h[6] = (h[6] & 0x0f) | 0x50;
    h[8] = (h[8] & 0x3f) | 0x80;
    const x = h.subarray(0, 16).toString('hex');
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

/**
 * `/cita` compone el texto como «[TIPO: …] [REGISTRO: …]⏎RUBRO⏎cuerpo»
 * (`_con_rubro` en main.py). La ficha pinta el rubro aparte; aquí va el cuerpo.
 */
export function cuerpoDeTesis(texto: string, rubro: string): string {
    const lineas = texto.split('\n');
    let i = 0;
    if (/^\s*\[(?:TIPO|MATERIA|INSTANCIA|TESIS|REGISTRO):/.test(lineas[0] ?? '')) i = 1;
    const inicio = rubro.trim().slice(0, 40).toUpperCase();
    if (inicio && (lineas[i] ?? '').trim().toUpperCase().startsWith(inicio)) i += 1;
    return lineas.slice(i).join('\n').trim();
}

export type Acervo =
    | { estado: 'esta'; ficha: FichaTesis }
    /** El acervo contestó y no la tiene. NO prueba que no exista. */
    | { estado: 'no_esta' }
    /** No se pudo mirar el acervo. */
    | { estado: 'sin_consultar'; detalle: string };

/**
 * ¿Está el registro en el acervo, y con qué rubro?
 *
 * `POST /acervo/registros` responde `{ok, consultado, registros: {N: {valid,
 * rubro_real}}}`. Se exigen las dos llaves, como en `incidencias/verificacion.ts`:
 * `consultado` es lo que distingue «no está» de «Qdrant no respondió». Sin
 * ella, un acervo caído parecería una ausencia.
 */
export async function consultarAcervo(registro: string, o: Opciones): Promise<Acervo> {
    const pedir = o.pedir ?? fetch;
    const tiempo = o.tiempo ?? 8000;
    let rubro = '';
    try {
        const r = await pedir(`${o.api}/acervo/registros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registros: [registro] }),
            signal: AbortSignal.timeout(tiempo),
            cache: 'no-store',
        });
        if (!r.ok) return { estado: 'sin_consultar', detalle: `acervo_http_${r.status}` };
        const d = await r.json();
        if (d?.ok !== true || d?.consultado !== true) {
            return { estado: 'sin_consultar', detalle: 'acervo_no_consultado' };
        }
        const fila = d?.registros?.[registro];
        if (!fila || typeof fila !== 'object') return { estado: 'sin_consultar', detalle: 'acervo_sin_fila' };
        if (fila.valid !== true) return { estado: 'no_esta' };
        rubro = aTextoPlano(fila.rubro_real);
    } catch (e) {
        return { estado: 'sin_consultar', detalle: `acervo: ${causaDe(e)}` };
    }

    const ficha: FichaTesis = {
        verificada: true,
        origen: 'acervo',
        registro,
        rubro,
        texto: '',
        precedentes: '',
        localizacion: '',
        clave: null,
        epoca: null,
        fuente: null,
        instancia: null,
        volumen: null,
        subVolumen: null,
        pagina: null,
        materias: null,
        tipoTesis: null,
        publicacion: '',
        pdf: null,
        url: `${SEMANARIO}/detalle/tesis/${registro}`,
    };
    // El sello sólo necesita existencia y rubro, y pide una vez por registro.
    // La ficha completa cuesta una consulta a ~50 colecciones en `/cita`: sólo
    // la paga el panel, que la pide con `?ficha=1`.
    if (o.ficha) await completarFicha(ficha, o.api, pedir, tiempo);
    return { estado: 'esta', ficha };
}

async function completarFicha(f: FichaTesis, api: string, pedir: Pedir, tiempo: number): Promise<void> {
    try {
        const r = await pedir(`${api}/cita/${idTesisV3(f.registro)}`, {
            signal: AbortSignal.timeout(tiempo),
            cache: 'no-store',
        });
        if (!r.ok) return;
        const c = await r.json();
        // El id sale del registro, pero se comprueba igual que es ESTA tesis.
        if (String(c?.registro ?? '') !== f.registro) return;
        // La v3 trae el rubro entero; el de la v2 viene a veces recortado.
        f.rubro = aTextoPlano(c.ref) || f.rubro;
        f.texto = cuerpoDeTesis(aTextoPlano(c.texto), f.rubro);
        f.clave = limpio(c.tesis_num);
        f.tipoTesis = limpio(c.tipo_criterio);
        f.instancia = limpio(c.instancia);
        f.materias = limpio(c.materia);
        const pdf = typeof c.pdf_url === 'string' ? c.pdf_url : '';
        if (/^https:\/\/storage\.googleapis\.com\/iurexia-leyes\//.test(pdf)) f.pdf = pdf;
    } catch {
        // La ficha se queda corta; la comprobación ya está hecha.
    }
}

export type LecturaSemanario =
    | { tipo: 'existe'; datos: Record<string, unknown> }
    | { tipo: 'no_existe' }
    | { tipo: 'sin_comprobar'; detalle: string };

/**
 * Qué dijo el Semanario, leído con la regla de oro.
 *
 * Antes, cualquier JSON sin `ius` se leía como «no existe». Pero la API
 * también contesta JSON sin `ius` cuando NO atiende —«Acceso denegado:
 * Formato inválido.»— y eso acusaría al chat de inventar un registro real.
 * Ahora sólo prueban la ausencia un 404 o el «no encontrado» de la propia
 * API; el reto de Incapsula (200 con HTML), cualquier otro código y
 * cualquier otro JSON quedan «sin comprobar».
 */
export function leerRespuestaDelSemanario(status: number, texto: string): LecturaSemanario {
    if (status === 404) return { tipo: 'no_existe' };
    if (status < 200 || status >= 300) return { tipo: 'sin_comprobar', detalle: `upstream_${status}` };
    let d: unknown;
    try {
        d = JSON.parse(texto);
    } catch {
        return { tipo: 'sin_comprobar', detalle: 'upstream_no_json' };
    }
    if (!d || typeof d !== 'object') return { tipo: 'sin_comprobar', detalle: 'upstream_json_raro' };
    const o = d as Record<string, unknown>;
    if (o.ius) return { tipo: 'existe', datos: o };
    const pista = [o.title, o.message, o.error, o.detail].filter((x) => typeof x === 'string').join(' ');
    if (Number(o.status) === 404 || /not ?found|no se encontr|no encontr|error\.http\.404/i.test(pista)) {
        return { tipo: 'no_existe' };
    }
    return { tipo: 'sin_comprobar', detalle: 'upstream_json_sin_ius' };
}

function fichaDelSemanario(d: Record<string, unknown>): FichaTesis {
    return {
        verificada: true,
        origen: 'semanario',
        registro: String(d.ius),
        rubro: aTextoPlano(d.rubro),
        texto: aTextoPlano(d.texto),
        precedentes: aTextoPlano(d.precedentes),
        localizacion: (typeof d.localizacion === 'string' ? d.localizacion : '').trim(),
        clave: limpio(d.claveTesis),
        epoca: limpio(d.epoca),
        fuente: limpio(d.fuente),
        instancia: limpio(d.instancia),
        volumen: limpio(d.volumen),
        subVolumen: limpio(d.subVolumen),
        pagina: String(d.pagina ?? '').trim() || null,
        materias: limpio(d.materias),
        tipoTesis: limpio(d.tipoTesis),
        publicacion: aTextoPlano(d.textoPublicacion),
        pdf: null,
        url: `${SEMANARIO}/detalle/tesis/${d.ius}`,
    };
}

/**
 * QUÉ SE ROMPIÓ, Y NO FUE NUESTRO CÓDIGO (2-sep-2026)
 * ---------------------------------------------------
 * Esta función y la del PDF se escribieron entre el 3 y el 7 de agosto de
 * 2026 y funcionaron. No se han tocado desde entonces. Lo que cambió está al
 * otro lado: **el Semanario puso Incapsula delante y ahora reta a las IP de
 * centro de datos.** Medido contra su servidor con el mismo registro:
 *
 *                          desde una laptop     desde Render / Vercel
 *   sin cabeceras .......... 403                 403
 *   sólo User-Agent ........ 403                 302 → 403
 *   Referer + User-Agent ... 200                 302 → 403
 *
 * Desde una conexión doméstica pasa a la primera; desde un servidor recibe un
 * 302 de reto que acaba en 403 se siga o no. No hay combinación de cabeceras
 * que lo salve: se probó la matriz entera. (28-sep-2026: el reto ya llega
 * como 200 con una página HTML, y a los registros inexistentes se les reta
 * también desde una laptop.)
 *
 * Y OJO CON LA COOKIE, que es lo contrario de lo que parece: llevar el
 * `incap_ses_*` que planta la redirección da 403, y con el tarro vacío da
 * 200. La cookie no abre la puerta, la cierra. Por eso las redirecciones se
 * siguen SIN arrastrar cookies.
 *
 * Se usa `node:https` y no `fetch` por una razón menor pero real: permite ver
 * el código de estado de cada salto y decidir sobre la redirección, que con
 * `fetch` queda oculta.
 *
 * LA SALIDA era servir la tesis desde nuestro propio almacenamiento: es
 * `consultarAcervo`, arriba. Esto queda para lo que el acervo no tiene.
 */
export async function pedirAlSemanario(
    url: string,
    registro: string,
    saltos = 0
): Promise<{ status: number; texto: string }> {
    const { request } = await import('node:https');

    const res = await new Promise<{ status: number; texto: string; destino?: string }>((resolve, reject) => {
        const req = request(
            url,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language': 'es-MX,es;q=0.9',
                    Referer: `${SEMANARIO}/detalle/tesis/${registro}`,
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
                timeout: 12_000,
            },
            (r) => {
                const trozos: Buffer[] = [];
                r.on('data', (c: Buffer) => trozos.push(c));
                r.on('end', () =>
                    resolve({
                        status: r.statusCode ?? 0,
                        texto: Buffer.concat(trozos).toString('utf8'),
                        destino: (r.headers.location as string) || undefined,
                    })
                );
            }
        );
        req.on('timeout', () => req.destroy(new Error('ETIMEDOUT')));
        req.on('error', reject);
        req.end();
    });

    // Las redirecciones se siguen, pero SIN arrastrar las cookies (ver arriba).
    if (res.status >= 300 && res.status < 400 && res.destino && saltos < 3) {
        return pedirAlSemanario(new URL(res.destino, url).toString(), registro, saltos + 1);
    }
    return { status: res.status, texto: res.texto };
}

export interface Comprobacion {
    cuerpo: FichaTesis | FalloTesis;
    /** Una tesis comprobada es un hecho estable: se puede guardar en el CDN. Un fallo, no. */
    guardable: boolean;
}

/** Lo que responde `/api/tesis/[registro]`: el acervo primero; el Semanario sólo para lo que el acervo no tiene. */
export async function comprobarTesis(registro: string, o: Opciones): Promise<Comprobacion> {
    const acervo = await consultarAcervo(registro, o);
    if (acervo.estado === 'esta') return { cuerpo: acervo.ficha, guardable: true };

    // No estar en el acervo NO prueba nada: se pregunta a quien sí puede probarlo.
    const porQue = acervo.estado === 'no_esta' ? 'fuera_del_acervo' : acervo.detalle;
    const semanario = o.semanario ?? pedirAlSemanario;
    try {
        const r = await semanario(`${API_SEMANARIO}/${registro}?isSemanal=false&hostName=${SEMANARIO}`, registro);
        const l = leerRespuestaDelSemanario(r.status, r.texto);
        if (l.tipo === 'existe') return { cuerpo: fichaDelSemanario(l.datos), guardable: true };
        if (l.tipo === 'no_existe') {
            return { cuerpo: { verificada: false, motivo: 'no_encontrada', registro }, guardable: false };
        }
        // El `detalle` es para nosotros: sin él, un reto de Incapsula, un
        // acervo caído y una excepción de red se ven idénticos desde fuera.
        return {
            cuerpo: { verificada: false, motivo: 'semanario_no_disponible', detalle: `${porQue}; ${l.detalle}`, registro },
            guardable: false,
        };
    } catch (e) {
        const causa = causaDe(e);
        console.error(`[tesis/${registro}] ${porQue}, y el Semanario no respondió →`, causa);
        return {
            cuerpo: { verificada: false, motivo: 'semanario_no_disponible', detalle: `${porQue}; ${causa}`, registro },
            guardable: false,
        };
    }
}
