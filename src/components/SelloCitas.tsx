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
    onVerTesis?: (registro: string) => void;
}

export function SelloCitas({ trazadas, noTrazadas, registros, rubros, onVerTesis }: Props) {
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
    }, [registros.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sin nada que sellar, no se pinta un adorno vacío.
    if (!trazadas && !noTrazadas && !registros.length) return null;

    const inventadas = resultados.filter(r => r.estado === 'no_existe');
    const desviadas = resultados.filter(r => r.estado === 'no_corresponde');
    const confirmadas = resultados.filter(r => r.estado === 'existe');
    const dudosas = resultados.filter(r => r.estado === 'sin_comprobar');

    const hayProblema = noTrazadas > 0 || inventadas.length > 0 || desviadas.length > 0;
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
