'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { MessageSquare, ArrowRight, ChevronDown, ChevronUp, FileText, Gem, Mic, Paperclip } from 'lucide-react';

interface HeroCTAProps {
    className?: string;
}

// Conditional CTA: "Ir al chat" for logged-in users, demo prompt for guests
export function HeroCTA({ className = '' }: HeroCTAProps) {
    const { isAuthenticated, loading } = useAuth();

    // Authenticated user: Show "Continuar al chat" button
    if (!loading && isAuthenticated) {
        return (
            <Link href="/chat" className={className}>
                <div className="chat-input-container p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-accent-brown/10 rounded-full flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-accent-brown" />
                            </div>
                            <div>
                                <h3 className="font-serif text-xl font-semibold text-charcoal-900">
                                    Continuar al chat
                                </h3>
                                <p className="text-charcoal-600 text-sm">
                                    Comienza una nueva consulta legal
                                </p>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-charcoal-900 rounded-full flex items-center justify-center group-hover:bg-accent-brown transition-colors">
                            <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    // Default state (loading OR unauthenticated): Show demo prompt with login link
    // No skeleton/pulse — this is the stable default that everyone sees first
    /* LA CAJA DE HOY (3-oct-2026). Esto imitaba la caja de antes —«📎 Subir
       documento», «🔍 Buscar» en azul, el interruptor Buscar/Redactar que el
       chat ya no tiene—. Ahora es la caja que ve quien entra: el texto, el
       documento listo, micrófono, clip y enviar; y abajo Fuentes, Esfuerzo y
       «Desplegar herramientas». Sin emojis, como el resto de la web. */
    return (
        <Link href="/login" className={`block ${className}`} aria-label="Probar Iurexia: entra y haz tu consulta">
            <div className="rounded-2xl border border-charcoal-900/10 bg-white px-4 pb-3 pt-3.5 text-left shadow-[0_10px_30px_-14px_rgba(15,14,13,0.22)] transition-shadow duration-300 hover:shadow-[0_16px_40px_-14px_rgba(15,14,13,0.3)]">
                <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 py-1 text-[15px] leading-relaxed text-charcoal-900">
                        ¿Qué fundamentos le faltan a esta demanda? Señálame los artículos mal citados y los que faltan.
                    </p>
                    <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
                        <span className="hidden items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 sm:flex">
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-blue-800">Doc listo</span>
                        </span>
                        <Mic className="hidden h-[18px] w-[18px] text-charcoal-900/40 sm:block" />
                        <Paperclip className="h-[18px] w-[18px] text-charcoal-900/40" />
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-charcoal-900">
                            <ArrowRight className="h-4 w-4 text-white" />
                        </span>
                    </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-charcoal-900/[0.06] pt-2.5">
                    <span className="flex h-7 items-center gap-1.5 rounded-full border border-charcoal-900/15 bg-white px-2 text-charcoal-700">
                        <span className="flex items-center -space-x-1.5">
                            {['/fuentes/corteidh.png', '/fuentes/scjn.png', '/fuentes/diputados.png'].map((src) => (
                                <span key={src} className="grid h-4 w-4 place-items-center rounded-full bg-white ring-1 ring-charcoal-900/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt="" className="h-3 w-3 object-contain" />
                                </span>
                            ))}
                        </span>
                        <span className="text-[11px] font-semibold">Fuentes</span>
                        <ChevronDown className="h-3 w-3" />
                    </span>
                    <span className="flex h-7 items-center gap-1.5 rounded-full border border-charcoal-900/15 bg-white px-2.5 text-[11px] text-charcoal-700">
                        <Gem className="h-3.5 w-3.5" />
                        Esfuerzo <span className="font-semibold text-charcoal-900">Platinum</span>
                        <ChevronDown className="h-3 w-3" />
                    </span>
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-charcoal-900/55">
                        <ChevronUp className="h-3 w-3" />
                        Desplegar herramientas
                    </span>
                </div>
            </div>
        </Link>
    );
}
