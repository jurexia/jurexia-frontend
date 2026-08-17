'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, FolderPlus, Loader2, X } from 'lucide-react';
import {
    Expediente,
    ExpedientesNoConfigurado,
    SinEspacio,
    categoriasDe,
    getExpedientes,
    nombreCarpeta,
    subirDocumento,
    tipoCarpeta,
    type CategoriaDocumento,
} from '@/lib/expedientes';
import { CarpetaIcono } from '@/components/CarpetaIcono';
import { useAuth } from '@/lib/useAuth';

/**
 * Mandar una respuesta del chat a una carpeta inteligente — la versión web del
 * flujo que la app ya tiene. Es la pieza que cierra el ecosistema: hasta ahora
 * la respuesta sólo podía copiarse o descargarse, con lo que salía de Iurexia
 * y no volvía; ahora entra al expediente donde sirve, y como el texto viaja en
 * `extracto`, el siguiente análisis de esa carpeta ya la toma en cuenta.
 *
 * Se guarda como .docx —no texto suelto— para que el abogado pueda abrirlo y
 * trabajarlo en Word si quiere.
 */

export interface ContenidoParaCarpeta {
    /** Nombre que llevará el documento dentro de la carpeta. */
    titulo: string;
    /** El cuerpo en el markdown ligero que emite el chat. */
    markdown: string;
}

/** Parte una línea de markdown en tramos con y sin negrita.
 *
 *  Antes el .docx se armaba quitando los pares de asteriscos con un replace:
 *  es decir, se BORRABA la negrita a propósito y el escrito llegaba a Word
 *  como un bloque plano. En un escrito jurídico la negrita no es adorno
 *  —marca el proemio, los puntos petitorios, los fundamentos— y sin ella el
 *  abogado tiene que reformatear a mano lo que Iurexia ya sabía.
 *
 *  Se admite `**fuerte**` y `*énfasis*`. El resto del markdown no aparece en
 *  estos escritos, y añadir un intérprete completo por si acaso sería peor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runsDeMarkdown(linea: string, forzarNegrita: boolean, TextRun: any): any[] {
    const runs: any[] = []
    const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g
    let ultimo = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(linea)) !== null) {
        if (m.index > ultimo) {
            runs.push(new TextRun({ text: linea.slice(ultimo, m.index), size: 22, bold: forzarNegrita }))
        }
        if (m[1] !== undefined) runs.push(new TextRun({ text: m[1], size: 22, bold: true }))
        else runs.push(new TextRun({ text: m[2], size: 22, italics: true, bold: forzarNegrita }))
        ultimo = m.index + m[0].length
    }
    if (ultimo < linea.length) {
        runs.push(new TextRun({ text: linea.slice(ultimo), size: 22, bold: forzarNegrita }))
    }
    return runs.length ? runs : [new TextRun({ text: linea, size: 22, bold: forzarNegrita })]
}

/** El .docx sobrio: título, fecha y el texto con su formato.
 *  Exportado porque el generador de escritos de la carpeta produce el mismo
 *  tipo de documento y no tiene sentido tener dos maneras de armar un .docx. */
export async function construirDocx(contenido: ContenidoParaCarpeta): Promise<Blob> {
    const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');

    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

    const parrafos = [
        new Paragraph({ text: contenido.titulo, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 300 },
            children: [new TextRun({ text: `Consulta de Iurexia · ${fecha}`, italics: true, size: 18, color: '666666' })],
        }),
        ...contenido.markdown
            .split(/\n+/)
            .map((linea) => linea.trim())
            .filter(Boolean)
            .map((linea) => {
                // Un encabezado de markdown es un encabezado, no una línea con
                // almohadillas: sale en negrita y sin justificar, porque
                // justificar un título de tres palabras lo deja con huecos.
                const encabezado = /^#{1,4}\s+/.test(linea);
                const cuerpo = linea.replace(/^#{1,4}\s*/, '');
                return new Paragraph({
                    spacing: { after: encabezado ? 120 : 160, before: encabezado ? 220 : 0 },
                    alignment: encabezado ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
                    children: runsDeMarkdown(cuerpo, encabezado, TextRun),
                });
            }),
    ];

    const doc = new Document({ sections: [{ children: parrafos }] });
    return Packer.toBlob(doc);
}

/** La gaveta que mejor le queda a una consulta dentro de cada tipo de carpeta. */
function gavetaPara(exp: Expediente): CategoriaDocumento {
    const disponibles = categoriasDe(exp.tipo).map((c) => c.value);
    const preferidas: CategoriaDocumento[] = ['notas', 'borradores', 'base'];
    return preferidas.find((p) => disponibles.includes(p)) ?? disponibles[0];
}

export function GuardarEnCarpetaModal({
    abierto,
    onCerrar,
    contenido,
}: {
    abierto: boolean;
    onCerrar: () => void;
    contenido: ContenidoParaCarpeta | null;
}) {
    const { profile } = useAuth();
    const [carpetas, setCarpetas] = useState<Expediente[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardandoEn, setGuardandoEn] = useState<string | null>(null);
    const [guardadoEn, setGuardadoEn] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            setCarpetas(await getExpedientes());
        } catch (e) {
            if (e instanceof ExpedientesNoConfigurado) setCarpetas([]);
            else setError('No se pudieron cargar tus carpetas. Intenta de nuevo.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (abierto) {
            setGuardadoEn(null);
            setGuardandoEn(null);
            void cargar();
        }
    }, [abierto, cargar]);

    const guardar = useCallback(async (exp: Expediente) => {
        if (!contenido || guardandoEn) return;
        setGuardandoEn(exp.id);
        setError(null);
        try {
            const blob = await construirDocx(contenido);
            const limpio = contenido.titulo.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.-]/g, '').slice(0, 70).trim();
            const archivo = new File([blob], `${limpio || 'Consulta'}.docx`, {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            // El texto ya lo tenemos: viaja como extracto y cuenta de inmediato
            // para el análisis de la carpeta, sin pasar por el OCR.
            await subirDocumento(exp.id, gavetaPara(exp), archivo, profile?.subscription_type, contenido.markdown);
            setGuardadoEn(nombreCarpeta(exp));
            setTimeout(onCerrar, 1400);
        } catch (e) {
            if (e instanceof SinEspacio) {
                setError('Tu almacenamiento está lleno. Libera espacio en Mi trabajo o mejora tu plan.');
            } else {
                setError(e instanceof Error ? e.message : 'No se pudo guardar. Intenta de nuevo.');
            }
            setGuardandoEn(null);
        }
    }, [contenido, guardandoEn, profile?.subscription_type, onCerrar]);

    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onCerrar}>
            <div
                className="w-full max-w-md rounded-xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Guardar en carpeta"
            >
                <div className="flex items-center justify-between border-b border-charcoal-900/[0.07] px-5 py-3.5">
                    <div className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-accent-gold" />
                        <h2 className="text-[0.9375rem] font-semibold text-charcoal-900">Guardar en carpeta</h2>
                    </div>
                    <button
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="rounded-lg p-1.5 text-charcoal-500 transition-colors hover:bg-charcoal-900/[0.04] hover:text-charcoal-900"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-3">
                    {guardadoEn ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-gold/15">
                                <Check className="h-5 w-5 text-accent-gold" strokeWidth={3} />
                            </span>
                            <p className="text-sm font-medium text-charcoal-900">Guardado en «{guardadoEn}»</p>
                            <p className="text-xs text-charcoal-500">Ya cuenta para el análisis de esa carpeta.</p>
                        </div>
                    ) : cargando ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-charcoal-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando tus carpetas…
                        </div>
                    ) : carpetas.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <p className="text-sm text-charcoal-600">Aún no tienes carpetas de trabajo.</p>
                            <Link
                                href="/carpetas"
                                className="inline-flex h-9 items-center rounded-lg bg-charcoal-900 px-4 text-sm font-medium text-white transition-colors hover:bg-charcoal-800"
                            >
                                Crear mi primera carpeta
                            </Link>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-1">
                            {carpetas.map((exp) => {
                                const tipo = tipoCarpeta(exp.tipo);
                                const ocupado = guardandoEn === exp.id;
                                return (
                                    <li key={exp.id}>
                                        <button
                                            onClick={() => guardar(exp)}
                                            disabled={!!guardandoEn}
                                            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-charcoal-900/10 hover:bg-cream-200/60 disabled:opacity-60"
                                        >
                                            <span aria-hidden className="flex-shrink-0">
                                                <CarpetaIcono tipo={exp.tipo} tamano={34} documentos={exp.totalDocumentos ?? 0} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-charcoal-900">{nombreCarpeta(exp)}</span>
                                                <span className="block text-xs text-charcoal-500">
                                                    {tipo?.label ?? 'Carpeta'}{typeof exp.totalDocumentos === 'number' ? ` · ${exp.totalDocumentos} documentos` : ''}
                                                </span>
                                            </span>
                                            {ocupado && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-accent-gold" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {error && (
                        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
