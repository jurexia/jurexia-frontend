'use client';

/**
 * LA TESIS, SIN SALIR DEL REDACTOR.
 *
 * David, 15-sep-2026: «sería muy útil que cada registro de tesis baste con un
 * clic para abrir una ventana que muestre la tesis sin salir del redactor y
 * poder cerrarla fácilmente. Esto ayuda para que el secretario no salga del
 * redactor a verificar la tesis».
 *
 * El texto ya viaja en `material.tesis[].texto` —es el mismo que el motor
 * verificó contra el Semanario antes de dejarlo entrar al material— así que
 * esta ventana no hace ninguna llamada de red: abre al instante con lo que ya
 * se trajo, y no puede decir «no disponible ahora mismo» por una caída del
 * Semanario. «Ver en el Semanario ↗» queda como salida aparte, para quien
 * quiera además la página oficial.
 */

import React from 'react';
import { ExternalLink, X } from 'lucide-react';
import { cn } from './primitivas';
import type { TesisDelAcervo } from './api';

export default function VentanaTesis({ tesis, onCerrar }: {
    tesis: TesisDelAcervo | null;
    onCerrar: () => void;
}) {
    React.useEffect(() => {
        if (!tesis) return;
        const porTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
        document.addEventListener('keydown', porTecla);
        return () => document.removeEventListener('keydown', porTecla);
    }, [tesis, onCerrar]);

    if (!tesis) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4
                        bg-black/60 backdrop-blur-sm"
             onClick={onCerrar}>
            <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl
                            border border-white/[0.09] bg-charcoal-900 p-5
                            shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
                 onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-lg border px-1.5 py-0.5 text-[10px] font-medium',
                            tesis.obligatoria
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                : 'border-white/10 bg-white/[0.05] text-white/60')}>
                            {tesis.obligatoria ? 'Obligatoria' : 'Orientadora'}
                        </span>
                        <span className="text-[12px] text-white/45">
                            Registro {tesis.registro} · {tesis.instancia}
                            {tesis.localizacion ? ` · ${tesis.localizacion}` : ''}
                        </span>
                    </div>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar"
                            className="shrink-0 rounded-lg p-1 text-white/45 transition
                                       hover:bg-white/[0.06] hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="mb-3 text-[14px] font-medium leading-snug text-white/90">
                    {tesis.rubro}
                </p>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-white/70">
                    {tesis.texto || 'El acervo no trae el texto completo de esta tesis, sólo su rubro y su registro.'}
                </p>
                <a href={`https://sjf2.scjn.gob.mx/detalle/tesis/${tesis.registro}`}
                   target="_blank" rel="noopener noreferrer"
                   className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium
                              text-accent-gold/85 transition hover:text-accent-gold">
                    Ver en el Semanario Judicial de la Federación
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>
        </div>
    );
}
