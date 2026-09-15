'use client';

import { useState } from 'react';
import { Check, ChevronDown, ExternalLink, FilePlus2 } from 'lucide-react';
import type { ArgumentoToulmin, FuenteToulmin } from '@/lib/toulmin';
import { enlaceSemanario } from '@/lib/toulmin';

/**
 * UN ARGUMENTO, EN SUS SEIS PIEZAS.
 *
 * Lo que se lee primero es la AFIRMACIÓN: es lo que el abogado decide si
 * quiere sostener. Las seis piezas del modelo de Toulmin se despliegan debajo,
 * con sus nombres, porque aquí sí sirven para revisar el razonamiento; en el
 * documento no aparecen (la redacción va en prosa de escrito).
 *
 * CADA FUENTE ES UNA FICHA que abre su texto. La tesis enlaza además a su
 * ficha oficial del Semanario: el abogado comprueba antes de firmar.
 */

const ETIQUETA_CLASE: Record<string, string> = {
    constitucion: 'Constitución',
    tratado: 'Tratado',
    coidh: 'Corte IDH',
    ley: 'Ley',
    tesis: 'Jurisprudencia',
};

/* «JURISPRUDENCIA» SÓLO CUANDO LO ES. La ficha rotulaba igual una tesis aislada,
   que no obliga; el catálogo ya distingue el tipo (`toulmin._tipo_tesis`). */
function etiquetaDe(f: FuenteToulmin): string {
    if (f.clase !== 'tesis') return ETIQUETA_CLASE[f.clase];
    const tipo = (f.tipo || '').toLowerCase();
    return tipo.includes('jurisprudencia') ? 'Jurisprudencia' : tipo.includes('aislada') ? 'Tesis aislada' : 'Tesis';
}

function rotuloCorto(f: FuenteToulmin): string {
    switch (f.clase) {
        case 'tesis': return `Reg. ${f.registro}`;
        case 'constitucion': return `Art. ${f.articulo} CPEUM`;
        case 'ley': return `Art. ${f.articulo} · ${abreviar(f.fuente || '')}`;
        case 'tratado': {
            // «Art. 3 CDN» ya trae la sigla: repetirla daba «Art. 3 CDN · CDN».
            const art = (f.articulo || '').replace(/^art[íi]culo/i, 'Art.').trim();
            const sigla = abreviar(f.fuente || '');
            return art && sigla && art.toLowerCase().endsWith(sigla.toLowerCase()) ? art : `${art} · ${sigla}`.replace(/^ · | · $/g, '');
        }
        case 'coidh': {
            // El nombre del caso se corta por palabra, con puntos suspensivos, no a media palabra.
            const caso = (f.caso || 'Corte IDH').replace(/^Caso\s+/i, '');
            const corto = caso.length <= 34 ? caso : caso.slice(0, 34).replace(/\s+\S*$/, '') + '…';
            return corto + (f.parrafo ? `, párr. ${f.parrafo}` : '');
        }
        default: return f.id;
    }
}

function abreviar(nombre: string): string {
    const n = nombre.trim();
    if (n.length <= 26) return n;
    const siglas = n.split(/\s+/).filter((p) => p.length > 3 && /^[A-ZÁÉÍÓÚÑ]/.test(p)).map((p) => p[0]).join('');
    return siglas.length >= 2 ? siglas : n.slice(0, 24) + '…';
}

export function TarjetaToulmin({
    argumento, ordinal, fuentes, insertado, onInsertar, consideracion,
}: {
    argumento: ArgumentoToulmin;
    ordinal: string;
    /** En un recurso: la razón de la resolución que este agravio combate. */
    consideracion?: string;
    fuentes: Record<string, FuenteToulmin>;
    insertado: boolean;
    onInsertar: () => void;
}) {
    const [abierta, setAbierta] = useState(false);
    const [verRedaccion, setVerRedaccion] = useState(false);
    const [fuenteAbierta, setFuenteAbierta] = useState<string | null>(null);

    const Fichas = ({ ids }: { ids: string[] }) => (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ids.map((id) => {
                const f = fuentes[id];
                if (!f) return null;
                const activa = fuenteAbierta === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setFuenteAbierta(activa ? null : id)}
                        aria-expanded={activa}
                        title={f.cita}
                        className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-[3px] text-[11px] font-medium transition-colors ${
                            activa
                                ? 'border-charcoal-900 bg-charcoal-900 text-white'
                                : 'border-accent-gold/40 bg-accent-gold/[0.08] text-charcoal-900 hover:border-accent-gold hover:bg-accent-gold/15'
                        }`}
                    >
                        <span className={activa ? 'text-accent-gold' : 'text-accent-brown'}>{etiquetaDe(f)}</span>
                        <span className="truncate">{rotuloCorto(f)}</span>
                    </button>
                );
            })}
        </div>
    );

    const fuenteVista = fuenteAbierta ? fuentes[fuenteAbierta] : null;
    const semanario = fuenteVista?.clase === 'tesis' ? enlaceSemanario(fuenteVista.registro) : null;

    return (
        <article className="rounded-xl border border-charcoal-900/[0.08] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.04)]">
            {/* EL RÓTULO VA ENCIMA DEL TÍTULO, SIEMPRE. «SEGUNDO AGRAVIO» es tres veces
                «PRIMERO» y la columna de pasos mide 380 px también en escritorio:
                a su lado, el título quedaba en 160 px. Decidirlo por el ancho de
                la ventana no servía para esa columna. */}
            <header className="flex flex-col gap-1.5 px-4 pb-2 pt-3.5">
                <span className="mt-0.5 self-start shrink-0 whitespace-nowrap rounded-md bg-charcoal-900 px-1.5 py-[3px] text-[10px] font-semibold tracking-[0.08em] text-accent-gold">
                    {ordinal}
                </span>
                <div className="min-w-0 flex-1">
                    <h4 className="font-serif text-[15px] font-semibold leading-snug text-charcoal-900">{argumento.titulo}</h4>
                    <p className="mt-1 text-[13px] leading-relaxed text-charcoal-900/80">{argumento.afirmacion}</p>
                </div>
            </header>

            {consideracion && (
                <p className="mx-4 mb-1 border-l-2 border-accent-gold/60 pl-2.5 text-[12px] leading-relaxed text-charcoal-900/70">
                    <span className="font-semibold text-charcoal-900/80">Combate: </span>{consideracion}
                </p>
            )}

            <div className="px-4 pb-1">
                <Fichas ids={argumento.citadas} />
            </div>

            {fuenteVista && (
                <div className="mx-4 mt-2 rounded-lg border border-charcoal-900/10 bg-cream-100 px-3 py-2.5">
                    <p className="text-[12px] font-semibold leading-snug text-charcoal-900">{fuenteVista.cita}</p>
                    <p className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-line text-[12px] leading-relaxed text-charcoal-900/70">{fuenteVista.texto}</p>
                    {semanario && (
                        <a href={semanario} target="_blank" rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent-brown underline-offset-2 hover:underline">
                            Ficha oficial en el Semanario <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={() => setAbierta((v) => !v)}
                aria-expanded={abierta}
                className="mt-2 flex w-full items-center justify-between border-t border-charcoal-900/[0.06] px-4 py-2 text-[12px] font-medium text-charcoal-900/70 transition-colors hover:text-charcoal-900"
            >
                Estructura del argumento
                <ChevronDown className={`h-4 w-4 transition-transform ${abierta ? 'rotate-180' : ''}`} />
            </button>

            {abierta && (
                <dl className="grid gap-3 px-4 pb-3 text-[12.5px] leading-relaxed">
                    {argumento.datos.length > 0 && (
                        <Pieza nombre="Datos" ayuda="los hechos que la sostienen">
                            <ul className="list-disc space-y-0.5 pl-4">
                                {argumento.datos.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                        </Pieza>
                    )}
                    <Pieza nombre="Garantía" ayuda="la regla que une hechos y conclusión">
                        <p>{argumento.garantia.texto}</p>
                        {argumento.garantia.fuentes.length > 0 && <Fichas ids={argumento.garantia.fuentes} />}
                    </Pieza>
                    {argumento.respaldo.length > 0 && (
                        <Pieza nombre="Respaldo" ayuda="lo que da autoridad a la regla">
                            <ul className="space-y-1.5">
                                {argumento.respaldo.map((r, i) => (
                                    <li key={i}>
                                        <Fichas ids={[r.fuente]} />
                                        <p className="mt-0.5 text-charcoal-900/75">{r.como_apoya}</p>
                                    </li>
                                ))}
                            </ul>
                        </Pieza>
                    )}
                    {argumento.calificador && (
                        <Pieza nombre="Calificador" ayuda="con qué fuerza y de qué depende">
                            <p>{argumento.calificador}</p>
                        </Pieza>
                    )}
                    {(argumento.refutacion.objecion || argumento.refutacion.respuesta) && (
                        <Pieza nombre="Refutación" ayuda="la objeción previsible y su respuesta">
                            <p><span className="font-medium text-charcoal-900">Objeción:</span> {argumento.refutacion.objecion}</p>
                            <p className="mt-1"><span className="font-medium text-charcoal-900">Respuesta:</span> {argumento.refutacion.respuesta}</p>
                            {argumento.refutacion.fuentes.length > 0 && <Fichas ids={argumento.refutacion.fuentes} />}
                        </Pieza>
                    )}
                </dl>
            )}

            {verRedaccion && (
                <div className="hoja-escrito mx-4 mb-3 max-h-72 overflow-y-auto rounded-lg border border-charcoal-900/10 bg-white px-4 py-3 !text-[13px]">
                    {argumento.redaccion.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                </div>
            )}

            <footer className="grid grid-cols-2 gap-2 border-t border-charcoal-900/[0.06] p-3">
                <button
                    type="button"
                    onClick={() => setVerRedaccion((v) => !v)}
                    className="h-9 rounded-lg border border-charcoal-900/15 bg-white text-[12px] font-medium text-charcoal-900 transition-colors hover:border-charcoal-900/30"
                >
                    {verRedaccion ? 'Ocultar redacción' : 'Ver redacción'}
                </button>
                <button
                    type="button"
                    onClick={onInsertar}
                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                        insertado
                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100'
                            : 'bg-charcoal-900 text-white hover:bg-charcoal-800'
                    }`}
                >
                    {insertado ? <Check className="h-3.5 w-3.5" /> : <FilePlus2 className="h-3.5 w-3.5 text-accent-gold" />}
                    {insertado ? 'Insertado · otra vez' : 'Al documento'}
                </button>
            </footer>
        </article>
    );
}

function Pieza({ nombre, ayuda, children }: { nombre: string; ayuda: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-0.5">
            <dt className="flex items-baseline gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent-brown">{nombre}</span>
                <span className="text-[11px] text-charcoal-900/45">{ayuda}</span>
            </dt>
            <dd className="text-charcoal-900/85">{children}</dd>
        </div>
    );
}
