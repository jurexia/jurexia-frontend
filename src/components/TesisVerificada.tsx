'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, Loader2, Scale } from 'lucide-react';

/**
 * Comprueba una tesis contra el Semanario Judicial de la Federación y muestra
 * su ficha oficial dentro del panel.
 *
 * El panel ya mostraba el texto de la tesis, pero venía de nuestra propia base
 * (Qdrant) y el abogado sólo tenía un enlace para ir a comprobarlo fuera. Aquí
 * el texto se trae del Semanario en el momento, así que lo que se lee ES lo
 * que publica la Corte, no nuestra copia.
 *
 * De paso resuelve lo que ninguna instrucción al modelo puede garantizar: si
 * el registro no existe, el Semanario no lo encuentra y se dice claramente.
 * Una tesis inventada deja de parecer verificada.
 *
 * (El Semanario no sirve un PDF descargable desde su servidor: lo arma en el
 * navegador con JavaScript. Por eso se reconstruye aquí la ficha en lugar de
 * incrustar un archivo que no existe.)
 */

interface Ficha {
    verificada: true;
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
    url: string;
}

interface Fallo {
    verificada: false;
    motivo: 'no_encontrada' | 'registro_invalido' | 'semanario_no_disponible';
    registro?: string;
}

type Estado = { fase: 'cargando' } | { fase: 'lista'; datos: Ficha } | { fase: 'fallo'; datos: Fallo };

export function TesisVerificada({ registro, urlSemanario }: { registro: string; urlSemanario: string }) {
    const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

    useEffect(() => {
        let vivo = true;
        setEstado({ fase: 'cargando' });

        fetch(`/api/tesis/${registro}`)
            .then((r) => r.json())
            .then((d) => {
                if (!vivo) return;
                setEstado(d?.verificada ? { fase: 'lista', datos: d } : { fase: 'fallo', datos: d });
            })
            .catch(() => {
                if (!vivo) return;
                setEstado({ fase: 'fallo', datos: { verificada: false, motivo: 'semanario_no_disponible', registro } });
            });

        return () => { vivo = false; };
    }, [registro]);

    if (estado.fase === 'cargando') {
        return (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-cream-400 bg-white p-5 text-xs text-charcoal-500">
                <Loader2 className="h-4 w-4 animate-spin text-accent-gold" />
                Comprobando en el Semanario Judicial…
            </div>
        );
    }

    if (estado.fase === 'fallo') {
        const { motivo } = estado.datos;
        const noExiste = motivo === 'no_encontrada' || motivo === 'registro_invalido';
        return (
            <div className={`rounded-2xl border p-4 ${noExiste ? 'border-red-700/25 bg-red-50/60' : 'border-cream-400 bg-cream-200'}`}>
                <div className="flex items-start gap-3">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${noExiste ? 'text-red-700' : 'text-charcoal-500'}`} />
                    <div className="min-w-0">
                        <p className={`text-sm font-semibold ${noExiste ? 'text-red-800' : 'text-charcoal-800'}`}>
                            {noExiste
                                ? 'No se encontró esta tesis en el Semanario'
                                : 'El Semanario no respondió'}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-charcoal-600">
                            {noExiste
                                ? 'El registro citado no aparece en el Semanario Judicial de la Federación. No la uses sin comprobarla tú.'
                                : 'No se pudo comprobar ahora mismo. Puedes verificarla directamente en el sitio de la Corte.'}
                        </p>
                        <a
                            href={urlSemanario}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-800 underline decoration-charcoal-400 underline-offset-2 hover:text-accent-brown"
                        >
                            Abrir el Semanario <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const t = estado.datos;
    const datos: [string, string | null][] = [
        ['Registro digital', t.registro],
        ['Instancia', t.instancia],
        ['Época', t.epoca],
        ['Tesis', t.clave],
        ['Tipo', t.tipoTesis],
        ['Materia(s)', t.materias],
        ['Fuente', t.fuente],
        ['Publicación', [t.volumen, t.subVolumen, t.pagina ? `Pág. ${t.pagina}` : null].filter(Boolean).join(', ') || null],
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-cream-400 bg-white">
            {/* Sello: lo que sigue viene del Semanario, no de nuestra base */}
            <div className="flex items-center gap-2 border-b border-cream-400 bg-accent-gold/10 px-4 py-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-gold/25">
                    <Check className="h-3 w-3 text-accent-brown" strokeWidth={3.5} />
                </span>
                <p className="text-xs font-semibold text-charcoal-900">
                    Verificada en el Semanario Judicial de la Federación
                </p>
            </div>

            {/* Carátula, con el aire de la ficha oficial */}
            <div className="border-b border-cream-400 px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                    <Scale className="h-4 w-4 flex-shrink-0 text-charcoal-700" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600">
                        Suprema Corte de Justicia de la Nación
                    </p>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {datos.filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex gap-1.5 text-[11.5px] leading-snug">
                            <dt className="flex-shrink-0 font-semibold text-charcoal-800">{k}:</dt>
                            <dd className="min-w-0 text-charcoal-600">{v}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* Rubro y texto, tal como los publica la Corte */}
            <div className="px-5 py-4">
                <h4 className="mb-3 text-[13px] font-bold leading-snug text-charcoal-900">{t.rubro}</h4>
                {t.texto.split('\n\n').filter(Boolean).map((p, i) => (
                    <p key={i} className="mb-2.5 text-[12.5px] leading-relaxed text-charcoal-700 last:mb-0" style={{ textAlign: 'justify' }}>
                        {p}
                    </p>
                ))}

                {t.precedentes && (
                    <div className="mt-4 border-t border-cream-400 pt-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-charcoal-500">
                            Precedentes
                        </p>
                        {t.precedentes.split('\n\n').filter(Boolean).map((p, i) => (
                            <p key={i} className="mb-1.5 text-[11.5px] leading-relaxed text-charcoal-600 last:mb-0">{p}</p>
                        ))}
                    </div>
                )}

                {t.publicacion && (
                    <p className="mt-4 border-t border-cream-400 pt-3 text-[10.5px] italic leading-relaxed text-charcoal-500">
                        {t.publicacion}
                    </p>
                )}
            </div>

            <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 border-t border-cream-400 bg-cream-200/60 px-5 py-3 transition-colors hover:bg-cream-200"
            >
                <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-charcoal-900 group-hover:text-accent-brown">
                        Consultarla en el Semanario
                    </span>
                    <span className="block text-[10.5px] text-charcoal-500">sjf2.scjn.gob.mx · imprimir o descargar</span>
                </span>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-charcoal-400 group-hover:text-accent-brown" />
            </a>
        </div>
    );
}
