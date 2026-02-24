'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AnimatedSection } from '@/components/AnimatedSection';
import { getEstadoBySlug, CategoriaLeyes, CATEGORIA_META, Ley, getTotalLeyes } from '../estadosData';
import { ChevronDown, ChevronRight, ArrowLeft, BookOpen, FileText, ExternalLink, Scale, Search } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '../adminGuard';

export default function EstadoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const slug = params.estado as string;
    const estado = getEstadoBySlug(slug);
    const stateHasContent = estado ? getTotalLeyes(estado.leyes) > 0 : false;

    useEffect(() => {
        // States with content are public; empty states require admin
        if (!loading && !stateHasContent && !isAdmin(user?.email)) {
            router.push('/');
        }
    }, [loading, user, router, stateHasContent]);

    // Show spinner while loading auth (only for admin-gated states)
    if (loading && !stateHasContent) {
        return (
            <main className="min-h-screen bg-cream-300">
                <Navbar />
                <div className="pt-32 flex justify-center">
                    <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        );
    }
    // Block non-admin on empty states
    if (!stateHasContent && !isAdmin(user?.email)) {
        return null;
    }

    if (!estado) {
        return (
            <main className="min-h-screen bg-cream-300">
                <Navbar />
                <div className="pt-32 text-center px-4">
                    <h1 className="font-serif text-3xl text-charcoal-900 mb-4">Estado no encontrado</h1>
                    <p className="text-charcoal-600 mb-8">El estado que buscas no existe en nuestro repositorio.</p>
                    <Link href="/leyesestatales" className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-white font-medium rounded-full hover:bg-charcoal-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Volver al directorio
                    </Link>
                </div>
            </main>
        );
    }

    const totalLeyes = getTotalLeyes(estado.leyes);
    const hasContent = totalLeyes > 0;

    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* Header */}
            <section className="relative pt-24 sm:pt-32 pb-8 sm:pb-12 px-4 sm:px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900 via-charcoal-900 to-charcoal-800" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-accent-gold/8 to-transparent rounded-full -translate-y-48 translate-x-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent-gold/5 to-transparent rounded-full translate-y-32 -translate-x-32" />

                <div className="relative max-w-5xl mx-auto">
                    {/* Breadcrumb */}
                    <AnimatedSection animation="fade-in">
                        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                            <Link href="/leyesestatales" className="hover:text-white transition-colors flex items-center gap-1">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Leyes Estatales
                            </Link>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                            <span className="text-accent-gold font-medium">{estado.nombreCorto}</span>
                        </nav>
                    </AnimatedSection>

                    {/* Title */}
                    <AnimatedSection animation="slide-up" delay={100}>
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-6">
                            <div>
                                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                                    {estado.nombre}
                                </h1>
                                <p className="text-gray-400 mt-2 text-base sm:text-lg">
                                    Legislación estatal organizada por categoría
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <span className="inline-block font-serif text-5xl sm:text-6xl font-bold text-accent-gold/20">
                                    {estado.abreviatura}
                                </span>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Stats bar */}
                    <AnimatedSection animation="fade-in" delay={200}>
                        <div className="flex flex-wrap gap-4 sm:gap-6">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <BookOpen className="w-4 h-4 text-accent-gold" />
                                <span><strong className="text-white">{totalLeyes}</strong> documentos</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Scale className="w-4 h-4 text-accent-gold" />
                                <span><strong className="text-white">5</strong> categorías</span>
                            </div>
                            {estado.ultimaActualizacion && (
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span>Actualizado {estado.ultimaActualizacion}</span>
                                </div>
                            )}
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Law Categories */}
            <section className="py-8 sm:py-12 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    {hasContent ? (
                        <div className="space-y-6">
                            {(Object.keys(CATEGORIA_META) as Array<keyof CategoriaLeyes>).map((catKey, catIndex) => {
                                const meta = CATEGORIA_META[catKey];
                                const leyesList = estado.leyes[catKey];
                                if (leyesList.length === 0) return null;

                                return (
                                    <AnimatedSection key={catKey} animation="slide-up" delay={catIndex * 100}>
                                        <CategorySection
                                            icon={meta.icon}
                                            label={meta.label}
                                            color={meta.color}
                                            leyes={leyesList}
                                            defaultOpen={catKey === 'constitucion' || catKey === 'codigos'}
                                        />
                                    </AnimatedSection>
                                );
                            })}
                        </div>
                    ) : (
                        /* Empty state */
                        <AnimatedSection animation="fade-in">
                            <div className="text-center py-16 px-4">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-cream-200 flex items-center justify-center">
                                    <FileText className="w-10 h-10 text-charcoal-700/30" />
                                </div>
                                <h3 className="font-serif text-2xl text-charcoal-900 mb-3">
                                    Próximamente
                                </h3>
                                <p className="text-charcoal-600 max-w-md mx-auto mb-8">
                                    Estamos indexando la legislación de {estado.nombre}.
                                    Pronto podrás acceder a toda su normativa desde aquí.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                    <Link
                                        href="/chat"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-charcoal-900 text-white font-medium rounded-full hover:bg-charcoal-800 transition-colors"
                                    >
                                        <Search className="w-4 h-4" />
                                        Consultar con IA
                                    </Link>
                                    <a
                                        href="mailto:soporte@iurexia.com?subject=Solicitud de indexación: ${estado.nombre}"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-charcoal-900 font-medium rounded-full border border-cream-400 hover:border-charcoal-900/20 hover:bg-cream-200 transition-all"
                                    >
                                        Solicitar indexación
                                    </a>
                                </div>
                            </div>
                        </AnimatedSection>
                    )}
                </div>
            </section>

            {/* CTA */}
            <section className="py-10 sm:py-14 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <AnimatedSection animation="fade-in">
                        <div className="rounded-2xl bg-white border border-cream-400 p-8 sm:p-10 text-center">
                            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-charcoal-900 mb-3">
                                ¿Necesitas consultar un artículo específico?
                            </h3>
                            <p className="text-charcoal-600 max-w-lg mx-auto mb-6">
                                Usa nuestro chat con IA para buscar artículos, conceptos jurídicos o situaciones
                                específicas dentro de la legislación de {estado.nombreCorto}.
                            </p>
                            <Link
                                href="/chat"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-gold text-charcoal-900 font-semibold rounded-full hover:bg-accent-gold/90 transition-all duration-300 hover:shadow-lg hover:shadow-accent-gold/20"
                            >
                                Ir al Chat con IA
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-cream-300 border-t border-black/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="font-serif text-xl font-semibold">Iurex<span className="text-accent-gold">ia</span></span>
                        </div>
                        <div className="flex gap-8 text-sm text-charcoal-600">
                            <Link href="/privacidad" className="hover:text-charcoal-900 transition-colors">Privacidad</Link>
                            <Link href="/terminos" className="hover:text-charcoal-900 transition-colors">Términos</Link>
                            <Link href="/conocenos" className="hover:text-charcoal-900 transition-colors">Conócenos</Link>
                            <a href="mailto:soporte@iurexia.com" className="hover:text-charcoal-900 transition-colors">Contacto</a>
                        </div>
                        <p className="text-sm text-charcoal-500">
                            © 2026 Iurexia. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}

// ─── Category Section Component ───────────────────────────────────
function CategorySection({
    icon,
    label,
    color,
    leyes,
    defaultOpen = false,
}: {
    icon: string;
    label: string;
    color: string;
    leyes: Ley[];
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="rounded-2xl bg-white border border-cream-400 overflow-hidden transition-shadow hover:shadow-md">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-4 p-5 sm:p-6 text-left hover:bg-cream-50 transition-colors"
            >
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                    <h3 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-900">
                        {label}
                    </h3>
                    <p className="text-sm text-charcoal-600 mt-0.5">
                        {leyes.length} {leyes.length === 1 ? 'documento' : 'documentos'}
                    </p>
                </div>
                <div className={`w-8 h-8 rounded-lg bg-cream-200 flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-charcoal-700" />
                </div>
            </button>

            {/* Content */}
            {isOpen && (
                <div className="border-t border-cream-400/60">
                    <ul className="divide-y divide-cream-400/40">
                        {leyes.map((ley, index) => (
                            <li key={index} className="group">
                                <div className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-cream-50/80 transition-colors">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cream-200 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-charcoal-700/50" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm sm:text-base font-medium text-charcoal-900 leading-snug">
                                            {ley.nombre}
                                        </p>
                                        {ley.fecha && (
                                            <p className="text-xs text-charcoal-600/60 mt-1">
                                                Actualizado: {ley.fecha}
                                            </p>
                                        )}
                                    </div>
                                    {ley.url ? (
                                        <a
                                            href={ley.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-gold bg-accent-gold/10 rounded-full hover:bg-accent-gold/20 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Ver PDF
                                        </a>
                                    ) : (
                                        <span className="flex-shrink-0 text-xs text-charcoal-700/30 px-3 py-1.5">
                                            PDF pronto
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
