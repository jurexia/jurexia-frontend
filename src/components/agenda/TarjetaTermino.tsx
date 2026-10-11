'use client';

/* Tarjeta de un término de la Agenda: color de urgencia, marcar cumplido, detalle y borrar. */

import { useState } from 'react';
import { Check, ChevronDown, Mail, Trash2 } from 'lucide-react';
import { REGLAS, actualizarTermino, borrarTermino, fechaCorta, fechaLarga, urgencia, type Termino } from '@/lib/agenda';

export default function Tarjeta({ t, onCambio }: { t: Termino; onCambio: () => void }) {
    const [abierta, setAbierta] = useState(false);
    const u = urgencia(t);
    const regla = REGLAS.find((r) => r.v === t.regla)?.t;
    const marcar = async (estado: 'cumplido' | 'pendiente') => { await actualizarTermino(t.id, { estado }); onCambio(); };
    const quitar = async () => { if (window.confirm('¿Borrar este término de su agenda?')) { await borrarTermino(t.id); onCambio(); } };
    return (
        <article className={`relative overflow-hidden rounded-2xl bg-white/90 shadow-sm ring-1 ring-charcoal-900/10 backdrop-blur ${t.estado === 'cumplido' ? 'opacity-70' : ''}`}>
            <span className={`absolute inset-y-0 left-0 w-1.5 ${u.color}`} aria-hidden="true" />
            <div className="py-3 pl-4 pr-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className={`text-[11px] font-semibold uppercase tracking-wide ${u.clase === 'hoy' || u.clase === 'vencido' ? 'text-red-700' : u.clase === 'manana' || u.clase === 'pronto' ? 'text-amber-700' : 'text-gray-500'}`}>
                            {u.frase} · {fechaCorta(t.vencimiento)}
                        </p>
                        <h3 className={`mt-0.5 text-[14px] font-semibold leading-snug text-charcoal-900 ${t.estado === 'cumplido' ? 'line-through' : ''}`}>{t.titulo}</h3>
                        <p className="truncate text-[12px] text-gray-500">{[t.expediente, t.organo].filter(Boolean).join(' · ') || regla}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                        <button type="button" onClick={() => marcar(t.estado === 'cumplido' ? 'pendiente' : 'cumplido')}
                            title={t.estado === 'cumplido' ? 'Volver a pendiente' : 'Marcar como cumplido'}
                            className={`grid h-8 w-8 place-items-center rounded-full border ${t.estado === 'cumplido' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-charcoal-900/15 bg-white text-gray-500 hover:text-emerald-700'}`}>
                            <Check className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setAbierta(!abierta)} aria-label="Ver detalle"
                            className="grid h-8 w-8 place-items-center rounded-full border border-charcoal-900/15 bg-white text-gray-500">
                            <ChevronDown className={`h-4 w-4 transition-transform ${abierta ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>
                {abierta && (
                    <div className="mt-2.5 space-y-1.5 border-t border-charcoal-900/10 pt-2.5 text-[12px] text-gray-700">
                        <p><strong>Vence:</strong> {fechaLarga(t.vencimiento)}</p>
                        {t.fecha_notificacion && (
                            <p><strong>Notificación:</strong> {fechaLarga(t.fecha_notificacion)}{t.surte_efectos ? ` · surte efectos ${fechaCorta(t.surte_efectos)}` : ''}{t.inicio ? ` · corre desde ${fechaCorta(t.inicio)}` : ''}</p>
                        )}
                        {t.cantidad && <p><strong>Plazo:</strong> {t.cantidad} {t.unidad === 'dias' ? `días ${t.tipo_dias === 'naturales' ? 'naturales' : 'hábiles'}` : t.unidad} · {regla}</p>}
                        {t.fundamento?.length > 0 && <p><strong>Fundamento:</strong> {t.fundamento.join('; ')}</p>}
                        {t.notas && <p className="whitespace-pre-line text-gray-600">{t.notas}</p>}
                        {t.avisos?.map((a) => <p key={a} className="text-amber-800">{a}</p>)}
                        <p className="flex items-center gap-1.5 text-gray-500"><Mail className="h-3.5 w-3.5" />
                            Aviso: {t.recordar_dias.length ? t.recordar_dias.map((d) => d === 0 ? 'el mismo día' : `${d} d antes`).join(', ') : 'sin aviso'}
                        </p>
                        <button type="button" onClick={quitar} className="flex items-center gap-1 text-red-700"><Trash2 className="h-3.5 w-3.5" /> Borrar</button>
                    </div>
                )}
            </div>
        </article>
    );
}
