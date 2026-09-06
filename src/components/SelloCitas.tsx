'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, Shield } from 'lucide-react';

/**
 * El sello de verificación de una respuesta.
 *
 * Comprueba DOS cosas distintas, y la distinción importa:
 *
 * 1. **Trazabilidad** — que cada `[Doc ID: uuid]` corresponda a un documento
 *    realmente recuperado del acervo. Lo calcula el backend (CITATION_META) y
 *    hasta ahora sólo se escribía en un log del servidor: el abogado nunca se
 *    enteraba de que su respuesta venía comprobada.
 *
 * 2. **Existencia de la tesis** — que cada «Registro digital: NNNNNNN» citado
 *    en la prosa exista de verdad en el Semanario Judicial de la Federación.
 *    Esto NO lo cubría nada: el validador del backend sólo mira los UUID del
 *    acervo, y un registro inventado en el texto pasaba entero. Se comprueba
 *    contra la API oficial (proxy `/api/tesis/[registro]`, caché de una hora).
 *
 * Regla de oro: sólo un 404 del Semanario prueba que la tesis no existe.
 * Cualquier otro fallo se reporta como «no se pudo comprobar», nunca como
 * invento. Acusar en falso destruye justo la confianza que esto vende.
 */

type Estado = 'comprobando' | 'listo';

interface Resultado {
    registro: string;
    /**
     * `no_corresponde` es el hallazgo del 8-ago-2026 y el motivo de este
     * cambio: el registro EXISTE pero la respuesta le atribuyó el rubro de
     * otra tesis. Comprobado con un abogado que reportó «al solicitarle
     * tesis, siempre se equivoca»: de 12 pares revisados, 12 mal
     * emparejados —«TUTELA JUDICIAL EFECTIVA» resultó ser «CHEQUES. SON
     * TÍTULOS PAGADEROS A LA VISTA»—.
     *
     * Es MÁS grave que un número inventado: la cita parece verificable, y
     * el sello anterior la sellaba en verde por existir. Un abogado que la
     * copia a un escrito queda expuesto.
     */
    estado: 'existe' | 'no_existe' | 'no_corresponde' | 'sin_comprobar';
    rubroReal?: string;
}

interface Props {
    /** Citas [Doc ID:] que el backend pudo trazar al acervo. */
    trazadas: number;
    /** Citas que NO se pudieron trazar. */
    noTrazadas: number;
    /** Registros digitales mencionados en la prosa de la respuesta. */
    registros: string[];
    /** Rubro que la respuesta atribuyó a cada registro, para contrastarlo. */
    rubros?: Record<string, string>;
    /**
     * Registros que el BACKEND detectó fuera del contexto recuperado. Es la
     * comprobación fuerte: si el número no viajaba en el acervo, el modelo lo
     * escribió de memoria, exista o no en el Semanario. Manda sobre cualquier
     * otra: un registro puede existir y aun así no ser trazable a lo que se
     * consultó.
     */
    fueraDelAcervo?: string[];
    /**
     * Tesis citadas SIN registro digital. No se pueden comprobar: no hay
     * número que consultar. Se dicen igual, porque callarlas fue justo lo que
     * dejó pasar cinco tesis inventadas el 4-sep-2026.
     */
    sinRegistro?: string[];
    onVerTesis?: (registro: string) => void;
}

export function SelloCitas({ trazadas, noTrazadas, registros, rubros, fueraDelAcervo, sinRegistro, onVerTesis }: Props) {
    const [fase, setFase] = useState<Estado>(registros.length ? 'comprobando' : 'listo');
    const [resultados, setResultados] = useState<Resultado[]>([]);

    useEffect(() => {
        if (!registros.length) { setFase('listo'); setResultados([]); return; }
        let vigente = true;
        setFase('comprobando');

        Promise.all(
            registros.map(async (registro): Promise<Resultado> => {
                try {
                    const r = await fetch(`/api/tesis/${registro}`);
                    const d = await r.json();
                    // El acervo manda: si no venía en el contexto, no es
                    // trazable aunque el Semanario lo encuentre.
                    if (fueraDelAcervo?.includes(registro)) {
                        return { registro, estado: 'no_corresponde' };
                    }
                    if (d?.verificada) {
                        // Existir no basta. Se contrasta el rubro: es donde
                        // fallaba de verdad.
                        const citado = rubros?.[registro];
                        if (citado && !rubroCorresponde(citado, d.rubro || '')) {
                            return { registro, estado: 'no_corresponde', rubroReal: d.rubro };
                        }
                        return { registro, estado: 'existe' };
                    }
                    // El proxy distingue el 404 (no existe) de un fallo del
                    // servidor de la Corte (no se pudo comprobar).
                    if (d?.motivo === 'no_encontrada') return { registro, estado: 'no_existe' };
                    return { registro, estado: 'sin_comprobar' };
                } catch {
                    return { registro, estado: 'sin_comprobar' };
                }
            })
        ).then(res => {
            if (!vigente) return;
            setResultados(res);
            setFase('listo');
        });

        return () => { vigente = false; };
    }, [registros.join(','), (fueraDelAcervo ?? []).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const sinReg = sinRegistro ?? [];

    // Sin nada que sellar, no se pinta un adorno vacío. Pero una tesis sin
    // registro SÍ es algo que sellar: es precisamente lo que antes salía mudo.
    if (!trazadas && !noTrazadas && !registros.length && !sinReg.length) return null;

    const inventadas = resultados.filter(r => r.estado === 'no_existe');
    const desviadas = resultados.filter(r => r.estado === 'no_corresponde');
    const confirmadas = resultados.filter(r => r.estado === 'existe');
    const dudosas = resultados.filter(r => r.estado === 'sin_comprobar');

    const hayProblema = noTrazadas > 0 || inventadas.length > 0 || desviadas.length > 0 || sinReg.length > 0;
    const comprobando = fase === 'comprobando';

    const partes: string[] = [];
    if (trazadas) partes.push(`${trazadas} ${trazadas === 1 ? 'cita trazada' : 'citas trazadas'} al acervo`);
    if (comprobando && registros.length) {
        partes.push(`comprobando ${registros.length} ${registros.length === 1 ? 'tesis' : 'tesis'} en el Semanario…`);
    } else {
        if (confirmadas.length) partes.push(`${confirmadas.length} ${confirmadas.length === 1 ? 'tesis confirmada' : 'tesis confirmadas'} en el Semanario`);
        if (desviadas.length) partes.push(
            `${desviadas.length} ${desviadas.length === 1 ? 'registro que NO corresponde' : 'registros que NO corresponden'} al rubro citado`);
        if (dudosas.length) partes.push(`${dudosas.length} sin comprobar`);
    }
    if (sinReg.length) {
        partes.push(`${sinReg.length} ${sinReg.length === 1
            ? 'tesis citada sin registro digital: NO se pudo comprobar'
            : 'tesis citadas sin registro digital: NO se pudieron comprobar'}`);
    }

    const color = hayProblema ? '#b45309' : '#1f7a4d';
    const fondo = hayProblema ? 'rgba(180, 83, 9, 0.07)' : 'rgba(31, 122, 77, 0.06)';
    const borde = hayProblema ? 'rgba(180, 83, 9, 0.25)' : 'rgba(31, 122, 77, 0.2)';

    const Icono = comprobando ? Loader2 : hayProblema ? ShieldAlert : ShieldCheck;

    return (
        <div
            className="mx-4 mb-2 mt-3 rounded-xl px-3 py-2.5"
            style={{ background: fondo, border: `1px solid ${borde}` }}
        >
            <div className="flex items-start gap-2">
                <Icono
                    className={`w-4 h-4 flex-shrink-0 mt-[1px] ${comprobando ? 'animate-spin' : ''}`}
                    style={{ color: comprobando ? 'rgba(0,0,0,0.35)' : color }}
                />
                <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] font-medium leading-snug" style={{ color: comprobando ? 'rgba(0,0,0,0.55)' : color }}>
                        {comprobando
                            ? 'Comprobando las citas…'
                            : hayProblema ? 'Revisa estas citas antes de usarlas' : 'Citas verificadas'}
                    </p>

                    {partes.length > 0 && (
                        <p className="text-[0.6875rem] mt-0.5 leading-relaxed" style={{ color: 'rgba(0,0,0,0.5)' }}>
                            {partes.join(' · ')}
                        </p>
                    )}

                    {/* Lo que hay que mirar se dice explícito, no escondido en un color. */}
                    {!comprobando && noTrazadas > 0 && (
                        <p className="text-[0.6875rem] mt-1.5 leading-relaxed" style={{ color: '#b45309' }}>
                            {noTrazadas} {noTrazadas === 1 ? 'cita no corresponde' : 'citas no corresponden'} a ningún
                            documento del acervo. No las des por buenas.
                        </p>
                    )}
                    {!comprobando && inventadas.length > 0 && (
                        <p className="text-[0.6875rem] mt-1.5 leading-relaxed" style={{ color: '#b45309' }}>
                            {inventadas.length === 1
                                ? 'El registro '
                                : 'Los registros '}
                            {inventadas.map(r => r.registro).join(', ')}
                            {inventadas.length === 1 ? ' no aparece' : ' no aparecen'} en el Semanario Judicial.
                            No {inventadas.length === 1 ? 'lo cites' : 'los cites'} sin comprobarlo tú.
                        </p>
                    )}

                    {/* Los registros confirmados, para poder abrirlos. */}
                    {!comprobando && confirmadas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {confirmadas.map(r => (
                                /* Abre la ficha oficial: la comprobación se hizo contra
                                   el Semanario, así que el enlace lleva a la misma
                                   fuente que respalda el sello, no a una copia. */
                                <a
                                    key={r.registro}
                                    href={`https://sjf2.scjn.gob.mx/detalle/tesis/${r.registro}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => onVerTesis?.(r.registro)}
                                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-mono no-underline transition-colors hover:brightness-95"
                                    style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        border: '1px solid rgba(31, 122, 77, 0.22)',
                                        color: 'rgba(0,0,0,0.6)',
                                    }}
                                    title={`Registro digital ${r.registro} — confirmado en el Semanario Judicial. Abre la ficha oficial.`}
                                >
                                    <Shield className="w-2.5 h-2.5" style={{ color }} />
                                    {r.registro}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Citas de tesis SIN registro digital: el punto ciego que costó un cliente.
 *
 * EL CASO. El 4-sep-2026 una respuesta le dio a un abogado cinco tesis con su
 * Época, su Instancia, su Fuente y su rubro —«Tesis: I.3o.C.493 C», «1a./J.
 * 82/2014»— y ninguna existía. El sello no dijo nada, y no por un fallo: por
 * diseño. Sólo comprobaba lo escrito como «Registro digital: NNNNNNN», y esas
 * citas no llevaban ninguno. Peor todavía, sin registros el sello ni siquiera
 * se pintaba, así que la respuesta salió limpia, sin insignia y sin aviso.
 *
 * Una cita sin registro NO se puede comprobar: no hay número que consultar en
 * el Semanario. Y lo que no se puede comprobar hay que decirlo, no callarlo.
 *
 * Se buscan las dos formas en que se numeran las tesis mexicanas:
 *   · Salas y Pleno .... 1a./J. 82/2014 · 2a./J. 8/2020 · P./J. 20/2014
 *   · Colegiados ....... I.3o.C.493 C · VI.2o.C. J/207 · I.11o.C.145 C
 * y se da por buena la que lleve un «Registro digital» a menos de 400
 * caracteres: ésa ya la comprueba el resto del sello.
 */
const PATRON_TESIS = new RegExp(
    '(?:(?:1a|2a|3a|4a|P|PC)\\.?\\s*\\/\\s*J\\.?\\s*\\d{1,4}\\/\\d{4})'
    + '|(?:[IVXLC]{1,7}\\.\\d{0,3}[oa]?\\.[A-ZÁÉÍÓÚ]{1,5}\\.\\s*(?:J\\/)?\\s*\\d{1,4}(?:\\s*[A-Z]{1,3})?)',
    'g');

export function citasSinRegistro(texto: string): string[] {
    const fuera = new Set<string>();
    const patron = new RegExp(PATRON_TESIS.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = patron.exec(texto)) !== null) {
        const cerca = texto.slice(Math.max(0, m.index - 400), m.index + 400);
        if (!/[Rr]egistro(?:\s+digital)?\s*(?:n[úu]m(?:ero)?\.?)?\s*[:.]?\s*\d{6,8}/.test(cerca)) {
            fuera.add(m[0].replace(/\s+/g, ' ').trim());
        }
    }
    return Array.from(fuera);
}

/**
 * Registros digitales citados en la prosa de una respuesta.
 *
 * Se aceptan las formas en que el modelo los escribe de verdad —medido contra
 * producción—: «Registro digital: 2021472», «registro digital 162822» y
 * «Registro: 2006227». Se exigen 6 u 8 dígitos porque el registro del
 * Semanario está en ese rango; así un número de expediente o un artículo no
 * se cuelan como si fueran tesis.
 */
export function registrosDeLaRespuesta(texto: string): string[] {
    const encontrados = new Set<string>();
    const patron = /[Rr]egistro(?:\s+digital)?\s*(?:n[úu]m(?:ero)?\.?)?\s*[:.]?\s*(\d{6,8})/g;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(texto)) !== null) encontrados.add(m[1]);
    return Array.from(encontrados);
}

/**
 * El RUBRO que la respuesta atribuye a cada registro.
 *
 * Se busca hacia atrás desde el número: el rubro es el último texto en
 * mayúsculas que aparece antes de «Registro digital: N», que es como se
 * escriben las citas de tesis. Si no se encuentra ninguno, se devuelve
 * cadena vacía y ese registro sólo se comprueba por existencia.
 */
export function rubrosPorRegistro(texto: string): Record<string, string> {
    const mapa: Record<string, string> = {};
    const patron = /[Rr]egistro(?:\s+digital)?\s*(?:n[úu]m(?:ero)?\.?)?\s*[:.]?\s*(\d{6,8})/g;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(texto)) !== null) {
        const antes = texto.slice(Math.max(0, m.index - 700), m.index);
        // Tramos largos en mayúsculas: así se escriben los rubros del Semanario.
        const mays = antes.match(/[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9 ,.;:()«»"'\-\/]{24,}/g);
        if (mays?.length) mapa[m[1]] = mays[mays.length - 1].trim();
    }
    return mapa;
}

/** Normaliza para comparar: sin acentos, sin puntuación, sin dobles espacios. */
function norm(t: string): string {
    return (t || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/).filter(Boolean).join(' ');
}

/**
 * ¿El rubro citado se corresponde con el real?
 *
 * Basta con que las primeras palabras coincidan: el modelo a veces recorta el
 * rubro, y exigir identidad literal marcaría como falso un recorte legítimo.
 * Lo que se persigue es el caso grave —registro real con rubro de OTRA
 * tesis—, y ahí las primeras palabras ya no se parecen en nada.
 */
export function rubroCorresponde(citado: string, real: string): boolean {
    const a = norm(citado), b = norm(real);
    if (!a || !b) return true;                 // sin dato, no se acusa
    const inicio = a.split(' ').slice(0, 5).join(' ');
    if (inicio.length < 12) return true;
    return b.includes(inicio) || a.includes(b.split(' ').slice(0, 5).join(' '));
}
