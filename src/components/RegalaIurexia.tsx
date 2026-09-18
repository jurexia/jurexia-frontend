'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, Mail, MessageCircle, X } from 'lucide-react';
import { getSession } from '@/lib/supabase';

/**
 * REGALA IUREXIA (18-sep-2026).
 *
 * David: «el botón simple de Regala Iurexia, básico, con 25 consultas para el
 * beneficiario; y si ese colega y dos más se suscriben a cualquier plan, el
 * que invita obtiene plan Pro o superior —según la cuenta que tenga— gratis
 * durante dos meses».
 *
 * POR QUÉ ESTÁ EN LA BARRA Y NO SÓLO EN EL PERFIL. La versión de agosto vivía
 * en /perfil, donde el abogado entra a cambiar su contraseña una vez al mes:
 * seis meses y cero invitaciones. Aquí está donde se trabaja todos los días.
 *
 * QUÉ SE DICE Y QUÉ NO. Los dos términos que cuestan dinero —que el premio
 * del padrino exige SUSCRIPCIONES, no altas, y que sus días vencen— van en el
 * mismo cuerpo de letra que el resto. Ocultar un término material de una
 * promoción es publicidad engañosa (art. 32 de la Ley Federal de Protección
 * al Consumidor) y el destinatario aquí es un abogado.
 */

type Estado = {
    codigo: string;
    invitados: number;
    activos: number;
    suscritos: number;
    escalera: { nivel: number; dias: number }[];
    consultasDeBienvenida: number;
    planDelPremio: string;
    premio: { vence_at: string; plan_premio: string; plan_previo: string } | null;
};

const NOMBRE_PLAN: Record<string, string> = {
    pro_monthly: 'Pro',
    pro_annual: 'Pro',
    platinum_monthly: 'Platinum',
    platinum_annual: 'Platinum',
};

export function IconoRegalo({ className = 'w-4 h-4' }: { className?: string }) {
    /* Regalo NEGRO con listón DORADO, como lo pidió David (18-sep-2026). Va en
       SVG propio y no en un icono de la librería porque ninguno trae los dos
       colores. El contorno dorado es lo que lo hace visible sobre la barra
       lateral oscura: en negro sobre negro la caja desaparecía. */
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            {/* la caja */}
            <rect x="3.5" y="10" width="17" height="10.5" rx="1.4" fill="#141414" stroke="#c9a962" strokeWidth="1" />
            {/* la tapa */}
            <rect x="2.2" y="6.6" width="19.6" height="3.9" rx="1.1" fill="#1d1d1d" stroke="#c9a962" strokeWidth="1" />
            {/* el listón, de arriba abajo */}
            <rect x="10.6" y="6.6" width="2.8" height="13.9" fill="#c9a962" />
            {/* el moño: dos lazos */}
            <path d="M12 6.6C10.4 6.6 8.9 6.2 8.2 5.3c-.7-.9-.2-2.1 1-2.2 1.3-.1 2.3 1.5 2.8 3.5z"
                  fill="#e0c27c" stroke="#c9a962" strokeWidth=".7" strokeLinejoin="round" />
            <path d="M12 6.6c1.6 0 3.1-.4 3.8-1.3.7-.9.2-2.1-1-2.2-1.3-.1-2.3 1.5-2.8 3.5z"
                  fill="#c9a962" stroke="#c9a962" strokeWidth=".7" strokeLinejoin="round" />
        </svg>
    );
}

export default function RegalaIurexia({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
    const [estado, setEstado] = useState<Estado | null>(null);
    const [error, setError] = useState('');
    const [copiado, setCopiado] = useState(false);

    useEffect(() => {
        if (!abierto || estado) return;
        (async () => {
            try {
                const sesion = await getSession();
                const token = sesion?.access_token;
                if (!token) { setError('Inicie sesión para obtener su enlace.'); return; }
                const r = await fetch('/api/referidos/estado', { headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                if (!r.ok) { setError(d?.error || 'No pudimos preparar su enlace.'); return; }
                setEstado(d as Estado);
            } catch {
                setError('No pudimos preparar su enlace. Inténtelo de nuevo.');
            }
        })();
    }, [abierto, estado]);

    const enlace = estado ? `https://www.iurexia.com/registro?ref=${estado.codigo}` : '';
    const mensaje = estado
        ? `Le comparto Iurexia, la IA jurídica mexicana que uso para investigar y redactar. `
          + `Con mi enlace entra con ${estado.consultasDeBienvenida} consultas, sin tarjeta: ${enlace}`
        : '';

    const copiar = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(enlace);
            setCopiado(true);
            window.setTimeout(() => setCopiado(false), 2200);
        } catch { /* el campo queda seleccionable a mano */ }
    }, [enlace]);

    useEffect(() => {
        if (!abierto) return;
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, [abierto, onCerrar]);

    if (!abierto) return null;

    const premio = NOMBRE_PLAN[estado?.planDelPremio ?? 'pro_monthly'] ?? 'Pro';
    const meta = estado?.escalera[estado.escalera.length - 1]?.nivel ?? 3;
    const faltan = Math.max(0, meta - (estado?.suscritos ?? 0));

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
             role="dialog" aria-modal="true" aria-label="Regala Iurexia"
             onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cream-300 bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-start gap-3">
                    <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-cream-100">
                        <IconoRegalo className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-serif text-xl text-charcoal-900">Regala Iurexia</h2>
                        <p className="text-sm text-charcoal-600">
                            {estado ? `${estado.consultasDeBienvenida} consultas para su colega` : 'Preparando su enlace…'}
                        </p>
                    </div>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar"
                            className="grid h-8 w-8 place-items-center rounded-lg text-charcoal-500 hover:bg-cream-100">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

                {!estado && !error && (
                    <div className="flex items-center gap-2 py-6 text-sm text-charcoal-600">
                        <Loader2 className="h-4 w-4 animate-spin text-accent-brown" /> Preparando su enlace…
                    </div>
                )}

                {estado && (
                    <>
                        <div className="mb-5 space-y-2 text-sm text-charcoal-700">
                            <p>
                                Su colega entra con{' '}
                                <strong className="text-charcoal-900">{estado.consultasDeBienvenida} consultas</strong>{' '}
                                de regalo, sin tarjeta. No caducan.
                            </p>
                            <p>
                                Y si ese colega y dos más se suscriben a cualquier plan, usted obtiene{' '}
                                <strong className="text-charcoal-900">{premio} gratis durante dos meses</strong>.
                                Su cobro no cambia: si ya paga, sigue pagando lo mismo.
                            </p>
                        </div>

                        {estado.premio && (
                            <p className="mb-5 rounded-lg border border-accent-gold/50 bg-accent-gold/10 px-3 py-2 text-sm text-charcoal-800">
                                Su premio está activo hasta el{' '}
                                {new Date(estado.premio.vence_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>
                        )}

                        <div className="mb-5 grid grid-cols-2 gap-2">
                            {estado.escalera.map((p) => {
                                const logrado = estado.suscritos >= p.nivel;
                                return (
                                    <div key={p.nivel}
                                         className={`rounded-lg border p-3 text-center ${logrado ? 'border-accent-gold bg-accent-gold/10' : 'border-cream-300 bg-cream-50'}`}>
                                        <p className="text-[11px] uppercase tracking-wider text-charcoal-500">
                                            {p.nivel} {p.nivel === 1 ? 'colega suscrito' : 'colegas suscritos'}
                                        </p>
                                        <p className="font-serif text-lg text-charcoal-900">
                                            {p.dias === 60 ? '2 meses' : `${p.dias} días`}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-accent-brown">Su enlace</p>
                        <div className="mb-3 flex gap-2">
                            <input readOnly value={enlace} aria-label="Su enlace de invitación"
                                   onFocus={(e) => e.currentTarget.select()}
                                   className="min-w-0 flex-1 rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 font-mono text-[12.5px] text-charcoal-800" />
                            <button type="button" onClick={copiar}
                                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-charcoal-900 px-3 py-2 text-xs font-semibold text-white hover:bg-charcoal-800">
                                {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copiado ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-2">
                            <a href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                                <MessageCircle className="h-4 w-4" /> WhatsApp
                            </a>
                            <a href={`mailto:?subject=${encodeURIComponent('Le regalo consultas de Iurexia')}&body=${encodeURIComponent(mensaje)}`}
                               className="inline-flex items-center justify-center gap-2 rounded-lg border border-cream-300 px-3 py-2.5 text-sm font-medium text-charcoal-800 hover:bg-cream-100">
                                <Mail className="h-4 w-4" /> Correo
                            </a>
                        </div>

                        <p className="text-xs text-charcoal-600">
                            O que su colega escriba el código <strong className="font-mono text-charcoal-900">{estado.codigo}</strong> al registrarse.
                        </p>
                        <p className="mt-3 border-t border-cream-200 pt-3 text-xs text-charcoal-500">
                            Invitados: <strong className="text-charcoal-800">{estado.invitados}</strong> ·
                            {' '}Suscritos: <strong className="text-charcoal-800">{estado.suscritos}</strong>
                            {faltan > 0 && <> · le {faltan === 1 ? 'falta' : 'faltan'} {faltan} para sus dos meses</>}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
