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
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-gold/10">
                        <FileText className="h-4 w-4 text-accent-gold" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white/90">{doc.nombre}</p>
                        <p className="mt-0.5 text-[11px] text-white/35">{titulo}</p>

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
                        className="rounded-lg p-1 text-white/25 opacity-0 transition-all hover:bg-white/[0.06] hover:text-white/70 group-hover:opacity-100"
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
                className={cn(
                    'w-full rounded-2xl border border-dashed p-5 text-left transition-all duration-200',
                    encima
                        ? 'border-accent-gold/60 bg-accent-gold/[0.07] scale-[1.01]'
                        : 'border-white/[0.12] bg-white/[0.015] hover:border-accent-gold/35 hover:bg-white/[0.03]',
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                        encima ? 'bg-accent-gold/20' : 'bg-white/[0.05]',
                    )}>
                        <Icono className={cn('h-4 w-4', encima ? 'text-accent-gold' : 'text-white/40')} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white/85">{titulo}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/35">
                            <Upload className="h-3 w-3" /> Arrastra el PDF o haz clic
                        </p>
                    </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-white/30">{ayuda}</p>
            </button>
        </>
    );
}

export default function PanelDocumentos({
    documentos, onSoltar, onQuitar, extractos,
}: {
    documentos: Documento[];
    onSoltar: (rol: RolDocumento, f: File) => void;
    onQuitar: (id: string) => void;
    /** Fragmentos clave que el pipeline ya localizó, para cotejar sin releer. */
    extractos?: { etiqueta: string; texto: string; pagina: number }[];
}) {
    const [abierto, setAbierto] = useState(true);

    return (
        <div className="flex h-full flex-col gap-4">
            <Tarjeta>
                <Rotulo contador={documentos.length}>Documentos del asunto</Rotulo>
                <div className="space-y-3">
                    {RANURAS.map((r) => (
                        <Ranura
                            key={r.rol} {...r}
                            doc={documentos.find((d) => d.rol === r.rol)}
                            onSoltar={onSoltar} onQuitar={onQuitar}
                        />
                    ))}
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-white/25">
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
                        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                            Extractos clave
                            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-white/50">
                                {extractos.length}
                            </span>
                        </span>
                        <ChevronDown className={cn(
                            'h-4 w-4 text-white/30 transition-transform duration-300',
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
                                    <figcaption className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/35">
                                        {e.etiqueta}
                                        <span className="text-accent-gold/70">pág. {e.pagina}</span>
                                    </figcaption>
                                    <blockquote className="text-[12px] leading-relaxed text-white/65">
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
