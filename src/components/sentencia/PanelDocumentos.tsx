'use client';

/**
 * Panel izquierdo — los dos documentos que abren el asunto.
 *
 * El secretario no sube «archivos»: sube el ACTO RECLAMADO y los CONCEPTOS DE
 * VIOLACIÓN, que son papeles distintos con funciones distintas. Por eso las
 * dos zonas de carga están separadas y rotuladas: pedir «arrastra tus
 * documentos» y adivinar cuál es cuál es una forma elegante de equivocarse.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
    FileText, Upload, ScanLine, Check, Loader2, X, ChevronDown, Gavel, Scale,
} from 'lucide-react';
import { Tarjeta, Pastilla, Rotulo, cn } from './primitivas';
import type { Documento, RolDocumento } from './tipos';

/** CÓMO SE LLAMAN LOS DOS DOCUMENTOS EN ESTE TIPO DE ASUNTO.
 *
 *  Estaban escritos a mano —«Acto reclamado» y «Conceptos de violación»— en
 *  los cuatro tipos. En un recurso eso es pedir el papel con el nombre
 *  equivocado: lo que se sube es la SENTENCIA RECURRIDA y los AGRAVIOS, y de
 *  la propia sentencia recurrida sale el acto reclamado, que no hay que
 *  teclear en ninguna parte.
 *
 *  El servidor ya manda este vocabulario por tipo (`recurrido`, `combate`);
 *  sólo faltaba usarlo. */
export interface VocabularioDocumentos {
    /** «la sentencia recurrida», «el acto reclamado»… */
    recurrido: string;
    /** «agravios», «conceptos de violación» */
    combate: string;
    esRecurso: boolean;
}

const mayus = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

function ranurasDe(v?: VocabularioDocumentos) {
    if (!v) return RANURAS;
    /* El artículo estorba en un rótulo: «la sentencia recurrida» se rotula
       «Sentencia recurrida». */
    const rec = mayus(v.recurrido.replace(/^(la|el|los|las)\s+/i, ''));
    return [
        { ...RANURAS[0], titulo: rec,
          ayuda: v.esRecurso
              ? `De aquí sale lo que resolvió el órgano recurrido Y el acto `
                + `reclamado: no hace falta teclearlo en ninguna parte.`
              : `El acto que se combate. De aquí sale la ratio decidendi.` },
        { ...RANURAS[1], titulo: mayus(v.combate),
          ayuda: `Lo que ${v.esRecurso ? 'el recurrente' : 'la parte quejosa'} `
               + `alega en su contra. De aquí salen los problemas jurídicos.` },
    ];
}

const RANURAS: { rol: RolDocumento; titulo: string; ayuda: string; icono: React.ComponentType<{ className?: string }> }[] = [
    {
        rol: 'acto',
        titulo: 'Acto reclamado',
        ayuda: 'La sentencia recurrida o el acto que se combate. De aquí sale la ratio decidendi.',
        icono: Gavel,
    },
    {
        rol: 'conceptos',
        titulo: 'Conceptos de violación',
        ayuda: 'O los agravios, según el asunto. Lo que plantea quien acude al tribunal.',
        icono: Scale,
    },
];

function pesoLegible(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
}

function Ranura({
    rol, titulo, ayuda, icono: Icono, doc, onSoltar, onQuitar,
}: {
    rol: RolDocumento; titulo: string; ayuda: string;
    icono: React.ComponentType<{ className?: string }>;
    doc?: Documento; onSoltar: (rol: RolDocumento, f: File) => void; onQuitar: (id: string) => void;
}) {
    const [encima, setEncima] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    const soltar = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setEncima(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onSoltar(rol, f);
    }, [rol, onSoltar]);

    if (doc) {
        return (
            <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5 transition-colors hover:border-accent-gold/25">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-gold/10">
                        <FileText className="h-5 w-5 text-accent-gold" />
                    </div>
                    <div className="min-w-0 flex-1">
                        {/* EL RÓTULO MANDA SOBRE EL NOMBRE DEL ARCHIVO. Antes
                            lo grande era «RECURSO DE REVISIÓN ESCANEADO_3.pdf»
                            y debajo, en gris, «Acto reclamado». El secretario
                            no busca su nombre de archivo: busca si ya está
                            puesto el acto reclamado. */}
                        <p className="text-[16px] font-medium tracking-[0.01em] text-white">{titulo}</p>
                        <p className="mt-0.5 truncate text-[12px] text-white/45">{doc.nombre}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Pastilla tono="neutro">{pesoLegible(doc.bytes)}</Pastilla>
                            {doc.paginas ? <Pastilla tono="neutro">{doc.paginas} pág.</Pastilla> : null}
                            {doc.via === 'ocr' && (
                                <Pastilla tono="ambar" icono={ScanLine}>reconocido</Pastilla>
                            )}
                            {doc.estado === 'listo' && <Pastilla tono="verde" icono={Check}>leído</Pastilla>}
                            {doc.estado === 'leyendo' && (
                                <Pastilla tono="oro" icono={Loader2}>leyendo…</Pastilla>
                            )}
                        </div>

                        {doc.estado !== 'listo' && (
                            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                                <div
                                    className="h-full rounded-full bg-accent-gold transition-[width] duration-500 ease-out"
                                    style={{ width: `${doc.progreso}%` }}
                                />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onQuitar(doc.id)}
                        className="rounded-lg p-1 text-white/45 opacity-0 transition-all hover:bg-white/[0.06] hover:text-white/75 group-hover:opacity-100"
                        aria-label={`Quitar ${doc.nombre}`}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <input
                ref={input} type="file" accept=".pdf,.docx,.doc" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onSoltar(rol, f); }}
            />
            <button
                onClick={() => input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
                onDragLeave={() => setEncima(false)}
                onDrop={soltar}
                /* ═══ A LA ESCALA DE LA ENTRADA ═══
                   David: «solo la primera parte me parece moderna». Y tenía
                   razón en dónde está la diferencia: la pantalla de entrada
                   trata lo que hay que PULSAR como el contenido —título de
                   16 px, qué hace en 14, por qué importa en 12, y aire—,
                   mientras que aquí, que es donde de verdad empieza el
                   trabajo, lo mismo estaba a 14/12 y apretado.
                   Estos dos recuadros son la puerta de todo: sin los dos PDF
                   no hay proyecto. Se les da el tamaño que les toca. */
                className={cn(
                    'w-full rounded-2xl border border-dashed px-5 py-6 text-left',
                    'transition-all duration-200',
                    encima
                        ? 'border-accent-gold/60 bg-accent-gold/[0.07] scale-[1.01]'
                        : 'border-white/20 bg-white/[0.02] hover:border-accent-gold/45 '
                          + 'hover:bg-accent-gold/[0.03]',
                )}
            >
                <div className="flex items-center gap-3.5">
                    <div className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        'transition-colors',
                        encima ? 'bg-accent-gold/20' : 'bg-white/[0.06]',
                    )}>
                        <Icono className={cn('h-5 w-5', encima ? 'text-accent-gold' : 'text-white/60')} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[16px] font-medium tracking-[0.01em] text-white">{titulo}</p>
                        <p className={cn(
                            'mt-1 flex items-center gap-1.5 text-[14px]',
                            encima ? 'text-accent-gold' : 'text-white/60',
                        )}>
                            <Upload className="h-3.5 w-3.5" />
                            {encima ? 'Suelta aquí' : 'Arrastra el PDF o haz clic'}
                        </p>
                    </div>
                </div>
                <p className="mt-3.5 text-[12px] leading-relaxed text-white/45">{ayuda}</p>
            </button>
        </>
    );
}

export default function PanelDocumentos({
    documentos, onSoltar, onQuitar, extractos, vocabulario, activa,
}: {
    documentos: Documento[];
    onSoltar: (rol: RolDocumento, f: File) => void;
    onQuitar: (id: string) => void;
    /** Fragmentos clave que el pipeline ya localizó, para cotejar sin releer. */
    extractos?: { etiqueta: string; texto: string; pagina: number }[];
    /** Cómo se llaman los dos documentos en ESTE tipo de asunto. Sin esto se
     *  le pide «el acto reclamado» a quien va a subir una sentencia
     *  recurrida. */
    vocabulario?: VocabularioDocumentos;
    /** El paso de ahora. Ver la nota en FormularioEncargo: enlaza el paso
     *  numerado de la derecha con el sitio donde se trabaja. */
    activa?: boolean;
}) {
    const [abierto, setAbierto] = useState(true);

    return (
        <div className="flex h-full flex-col gap-4">
            <Tarjeta className={cn('emerge emerge-2', activa && 'respira')}>
                <Rotulo contador={documentos.length}>Documentos del asunto</Rotulo>
                <div className="space-y-3.5">
                    {ranurasDe(vocabulario).map((r) => (
                        <Ranura
                            key={r.rol} {...r}
                            doc={documentos.find((d) => d.rol === r.rol)}
                            onSoltar={onSoltar} onQuitar={onQuitar}
                        />
                    ))}
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-white/45">
                    Se aceptan escaneados. Si el PDF no trae texto, se reconoce
                    antes de leerlo y la ficha lo indica.
                </p>
            </Tarjeta>

            {extractos && extractos.length > 0 && (
                <Tarjeta padding="p-0" className="min-h-0 flex-1 overflow-hidden">
                    <button
                        onClick={() => setAbierto((v) => !v)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
                            Extractos clave
                            <span className="rounded-lg bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-white/60">
                                {extractos.length}
                            </span>
                        </span>
                        <ChevronDown className={cn(
                            'h-4 w-4 text-white/45 transition-transform duration-300',
                            abierto && 'rotate-180',
                        )} />
                    </button>
                    {abierto && (
                        <div className="max-h-[38vh] space-y-2.5 overflow-y-auto px-5 pb-5">
                            {extractos.map((e, i) => (
                                <figure
                                    key={i}
                                    className="rounded-2xl border-l-2 border-accent-gold/50 bg-white/[0.03] py-3 pl-3.5 pr-3"
                                >
                                    <figcaption className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/45">
                                        {e.etiqueta}
                                        <span className="text-accent-gold/70">pág. {e.pagina}</span>
                                    </figcaption>
                                    <blockquote className="text-[13px] leading-relaxed text-white/60">
                                        {e.texto}
                                    </blockquote>
                                </figure>
                            ))}
                        </div>
                    )}
                </Tarjeta>
            )}
        </div>
    );
}
