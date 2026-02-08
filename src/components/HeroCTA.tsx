'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { MessageSquare, ArrowRight } from 'lucide-react';

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
    return (
        <Link href="/login" className={className}>
            <div className="chat-input-container p-6 cursor-pointer hover:shadow-lg transition-shadow">
                {/* Sample prompt preview */}
                <div className="flex items-start gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                        <span className="text-red-500">📄</span>
                        <span className="text-sm text-charcoal-700">Demanda.pdf</span>
                        <span className="text-xs text-gray-400">2.4 MB</span>
                    </div>
                </div>

                <p className="text-charcoal-600 text-base leading-relaxed">
                    Analiza esta demanda de amparo indirecto y encuentra la jurisprudencia
                    aplicable de la Suprema Corte...
                </p>

                {/* Action buttons */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <span>📎</span> Subir documento
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                            <span>🔍</span> Buscar
                        </span>
                    </div>
                    <div className="w-10 h-10 bg-charcoal-900 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
