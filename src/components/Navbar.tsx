'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { UserAvatar } from './UserAvatar';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, loading } = useAuth();
    const isLoggedIn = !!user;
    const isLoading = loading;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-cream-300/80 backdrop-blur-md border-b border-black/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="font-serif text-2xl font-semibold text-charcoal-900">
                            Iurex<span className="text-accent-gold">ia</span>
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <NavLink href="/plataforma">Plataforma</NavLink>
                        <NavLink href="/soluciones">Soluciones</NavLink>
                        <NavLink href="/precios">Precios</NavLink>
                        <NavLink href="/seguridad">Seguridad</NavLink>
                    </div>

                    {/* Desktop CTA / User Menu */}
                    <div className="hidden md:flex items-center gap-4">
                        {isLoading ? (
                            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                        ) : isLoggedIn ? (
                            <UserAvatar />
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 transition-colors"
                                >
                                    Iniciar Sesión
                                </Link>
                                <Link
                                    href="/registro"
                                    className="btn-primary text-sm py-2 px-5"
                                >
                                    Probar Gratis
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <X className="w-6 h-6" />
                        ) : (
                            <Menu className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-black/5">
                        <div className="flex flex-col gap-4">
                            <MobileNavLink href="/plataforma" onClick={() => setIsMenuOpen(false)}>
                                Plataforma
                            </MobileNavLink>
                            <MobileNavLink href="/soluciones" onClick={() => setIsMenuOpen(false)}>
                                Soluciones
                            </MobileNavLink>
                            <MobileNavLink href="/precios" onClick={() => setIsMenuOpen(false)}>
                                Precios
                            </MobileNavLink>
                            <MobileNavLink href="/seguridad" onClick={() => setIsMenuOpen(false)}>
                                Seguridad
                            </MobileNavLink>

                            <div className="pt-4 border-t border-black/5">
                                {isLoggedIn ? (
                                    <div className="flex items-center gap-3">
                                        <UserAvatar />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <Link
                                            href="/login"
                                            className="block text-center py-2 text-charcoal-700 font-medium"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Iniciar Sesión
                                        </Link>
                                        <Link
                                            href="/registro"
                                            className="btn-primary w-full text-center text-sm"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Probar Gratis
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 transition-colors relative group"
        >
            {children}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-charcoal-900 group-hover:w-full transition-all duration-300" />
        </Link>
    );
}

function MobileNavLink({
    href,
    children,
    onClick
}: {
    href: string;
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="text-base font-medium text-charcoal-700 hover:text-charcoal-900 transition-colors py-2"
        >
            {children}
        </Link>
    );
}
