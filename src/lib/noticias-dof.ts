/**
 * El Diario Oficial de la Federación, para el apartado «Lo último».
 *
 * DE DÓNDE SALE. Del servicio de datos abiertos del propio DOF:
 *
 *     https://sidof.segob.gob.mx/dof/sidof/notas/{dd-mm-aaaa}
 *
 * Es el servicio que la Secretaría de Gobernación publica y documenta en
 * https://sidof.segob.gob.mx/datos_abiertos — no se raspa el HTML del diario.
 * Devuelve las notas del día repartidas en matutina, vespertina y
 * extraordinaria, cada una con su título, la dependencia que la emite y la
 * página. Se descubrió probando las rutas documentadas: la de notas exige
 * `Accept: *​/*` (con `application/json` responde 406) y la fecha en
 * dd-mm-aaaa.
 *
 * POR QUÉ SE ENLAZA A sidof Y NO A www.dof.gob.mx. El certificado de
 * `www.dof.gob.mx` está roto —«no alternative certificate subject name matches
 * target host name»—, así que mandar ahí al abogado le pinta un aviso de sitio
 * inseguro. `sidof.segob.gob.mx/notas/{codNota}` sirve la misma nota oficial
 * con certificado válido.
 *
 * QUÉ SE DEJA FUERA, Y POR QUÉ. Este apartado promete una cosa —las normas
 * nuevas y sus reformas— y el DOF publica muchas más. Sobre 45 días reales:
 *
 *   · AVISOS JUDICIALES Y GENERALES ......... edictos, remates, notificaciones
 *   · Convocatorias de adquisiciones ........ 933 de 1,747 notas útiles
 *   · Convocatorias de plazas vacantes ......  90
 *
 * Entre las tres son casi el 60% del diario. No es que sobren en abstracto: es
 * que un litigante que abre esto quiere ver el acuerdo que suspende plazos, no
 * una licitación de papelería. Se filtran en el acopio, no en la interfaz; si
 * algún día se quieren, se quita el filtro y entran solas.
 *
 * Lo que SÍ se deja, aunque se repita a diario, es Banco de México: el tipo de
 * cambio y la TIIE son tres notas al día que se consultan para calcular
 * intereses y obligaciones en moneda extranjera.
 */

const SERVICIO = 'https://sidof.segob.gob.mx/dof/sidof/notas';
const NOTA = 'https://sidof.segob.gob.mx/notas';

/** Lo que el servicio devuelve por nota. Sólo se declara lo que se usa. */
type NotaDOF = {
    codNota: number;
    titulo?: string | null;
    fecha?: string | null;          // dd-mm-aaaa
    pagina?: number | null;
    codOrgaDos?: string | null;     // p. ej. «SECRETARIA DE ENERGIA»
    nombreCodOrgaUno?: string | null; // p. ej. «PODER EJECUTIVO»
};

export type FilaNoticia = {
    id: string;
    fuente: string;
    numero: number | null;
    orden: number | null;
    titulo: string;
    resumen: string | null;
    url: string;
    fecha: string | null;          // aaaa-mm-dd
};

const RUIDO_ORGANISMO = 'AVISOS JUDICIALES Y GENERALES';
/* En las convocatorias el DOF invierte la estructura: el «título» es la
   dependencia y `codOrgaDos` es la sección. Por eso se filtra por ahí. */
const RUIDO_SECCION = 'CONVOCATORIAS';

function ddmmaaaa(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function aISO(fecha: string | null | undefined): string | null {
    if (!fecha) return null;
    const m = fecha.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Título en mayúsculas sostenidas → capitalizado. El DOF mezcla ambos. */
function presentable(t: string): string {
    const limpio = t.replace(/\s+/g, ' ').trim();
    const letras = limpio.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
    const mayus = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
    // Sólo se toca si viene casi todo en mayúsculas; si ya trae minúsculas es
    // que el DOF lo publicó redactado y no hay que reescribirlo.
    if (letras.length < 8 || mayus / letras.length < 0.9) return limpio;
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

async function notasDelDia(dia: Date, señal?: AbortSignal): Promise<NotaDOF[]> {
    const r = await fetch(`${SERVICIO}/${ddmmaaaa(dia)}`, {
        headers: { Accept: '*/*', 'User-Agent': 'iurexia-noticias/1.0' },
        cache: 'no-store',
        signal: señal,
    });
    if (!r.ok) throw new Error(`DOF ${ddmmaaaa(dia)}: HTTP ${r.status}`);
    const d = await r.json();
    return [
        ...(d.NotasMatutinas ?? []),
        ...(d.NotasVespertinas ?? []),
        ...(d.NotasExtraordinarias ?? []),
    ];
}

function aFila(n: NotaDOF): FilaNoticia | null {
    const titulo = (n.titulo ?? '').trim();
    if (!titulo) return null;                                   // separadores de sección
    if ((n.nombreCodOrgaUno ?? '').toUpperCase().includes(RUIDO_ORGANISMO)) return null;
    if ((n.codOrgaDos ?? '').trim().toUpperCase().startsWith(RUIDO_SECCION)) return null;

    const organismo = (n.codOrgaDos || n.nombreCodOrgaUno || '').trim();
    const pagina = n.pagina && n.pagina > 0 ? `pág. ${n.pagina}` : '';

    return {
        id: `dof-${n.codNota}`,
        fuente: 'DOF',
        numero: n.codNota,
        // El código de nota crece con el tiempo, así que sirve de orden estable
        // incluso entre notas del mismo día.
        orden: n.codNota,
        titulo: presentable(titulo),
        resumen: [presentable(organismo), pagina].filter(Boolean).join(' · ') || null,
        url: `${NOTA}/${n.codNota}`,
        fecha: aISO(n.fecha),
    };
}

/**
 * Trae las notas de los últimos `dias` días naturales.
 *
 * Se miran varios días en cada pasada, no sólo el de hoy: si el cron falla un
 * día, o el DOF publica tarde, la siguiente ejecución lo recoge sola. Como el
 * guardado va por `id`, repetir un día no duplica nada.
 */
export async function traerDOF(dias = 8): Promise<{ filas: FilaNoticia[]; fallos: string[] }> {
    const filas: FilaNoticia[] = [];
    const fallos: string[] = [];
    const hoy = new Date();

    for (let i = 0; i < dias; i++) {
        const dia = new Date(hoy);
        dia.setDate(hoy.getDate() - i);
        // El DOF no publica en sábado ni domingo.
        if (dia.getDay() === 0 || dia.getDay() === 6) continue;

        try {
            for (const n of await notasDelDia(dia)) {
                const f = aFila(n);
                if (f) filas.push(f);
            }
        } catch (e) {
            fallos.push(`${ddmmaaaa(dia)}: ${e instanceof Error ? e.message : 'error'}`);
        }
    }

    // Una misma nota puede aparecer en dos días si el DOF la reedita.
    const porId = new Map<string, FilaNoticia>();
    for (const f of filas) porId.set(f.id, f);
    return { filas: Array.from(porId.values()), fallos };
}
