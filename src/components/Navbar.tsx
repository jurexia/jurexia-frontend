'use client';

import Link from 'next/link';
import { Menu, X, MessageSquare, FileText, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { UserAvatar } from './UserAvatar';

const ADMIN_EMAIL = 'administracion@iurexia.com';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, profile, loading } = useAuth();
    const isLoggedIn = !!user;
    const isLoading = loading;
    const userIsAdmin = isAdmin(user?.email);
    const canAccessRedactor = userIsAdmin || profile?.subscription_type === 'ultra_secretarios';
    const isAdminEmail = user?.email === ADMIN_EMAIL;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-cream-300/80 backdrop-blur-md border-b border-black/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">

                    {/* ── Left: Logo + SALVAME ── */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Link href="/" className="flex items-center gap-2 group">
                            <span className="font-serif text-2xl font-semibold text-charcoal-900">
                                Iurex<span className="text-accent-gold">ia</span>
                            </span>
                        </Link>
                        <span className="hidden sm:block w-px h-6 bg-charcoal-300/50" />
                        <Link
                            href="/salvame"
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-charcoal-900 rounded-full hover:bg-charcoal-800 transition-all duration-200 shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                <rect x="9" y="2" width="6" height="20" rx="1" fill="#dc2626" />
                                <rect x="2" y="9" width="20" height="6" rx="1" fill="#dc2626" />
                            </svg>
                            <span className="text-xs font-bold text-white tracking-wide">SALVAME</span>
                        </Link>
                    </div>

                    {/* ── Center: Navigation links ── */}
                    <div className="hidden lg:flex items-center gap-1">
                        <NavLink href="/plataforma">Plataforma</NavLink>
                        <NavLink href="/soluciones">Soluciones</NavLink>
                        <Link
                            href="/connect"
                            className="text-sm font-semibold text-white bg-blue-600 rounded-full px-4 py-1.5 hover:bg-blue-700 transition-all duration-200 shadow-sm mx-1"
                        >
                            Connect
                        </Link>
                        <NavLink href="/precios">Precios</NavLink>
                        <NavLink href="/seguridad">Seguridad</NavLink>
                        {isAdminEmail && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-red-50"
                                style={{ color: '#dc2626' }}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* ── Right: Chat + User ── */}
                    <div className="hidden lg:flex items-center gap-3 shrink-0">
                        <Link
                            href="/chat"
                            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-white text-sm font-semibold rounded-lg hover:bg-charcoal-800 transition-colors shadow-sm"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Ir al Chat
                        </Link>
                        {isLoading ? (
                            <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
                        ) : isLoggedIn ? (
                            <UserAvatar />
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 transition-colors px-2"
                                >
                                    Acceder
                                </Link>
                                <Link
                                    href="/registro"
                                    className="btn-primary text-sm py-1.5 px-4"
                                >
                                    Probar Gratis
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* ── Mobile: hamburger ── */}
                    <div className="flex items-center gap-2 lg:hidden">
                        {isLoggedIn && <UserAvatar />}
                        <button
                            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* ═══ Mobile Navigation ═══ */}
                {isMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-black/5">
                        <div className="flex flex-col gap-1">

                            {/* Text links */}
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

                            {/* Divider */}
                            <div className="h-px bg-black/5 my-2" />

                            {/* Action buttons — compact grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    href="/connect"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="text-sm font-semibold text-white bg-blue-600 rounded-lg px-3 py-2.5 text-center hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    Connect
                                </Link>
                                <Link
                                    href="/salvame"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-charcoal-900 text-white text-sm font-bold rounded-lg hover:bg-charcoal-800 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                        <rect x="9" y="2" width="6" height="20" rx="1" fill="#dc2626" />
                                        <rect x="2" y="9" width="20" height="6" rx="1" fill="#dc2626" />
                                    </svg>
                                    SALVAME
                                </Link>
                            </div>

                            {/* Conditional admin links */}
                            {(userIsAdmin || canAccessRedactor || isAdminEmail) && (
                                <>
                                    <div className="h-px bg-black/5 my-2" />
                                    <div className="grid grid-cols-2 gap-2">
                                        {userIsAdmin && (
                                            <Link
                                                href="/leyesestatales"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="text-sm font-semibold text-accent-gold border border-accent-gold/30 rounded-lg px-3 py-2.5 text-center hover:bg-accent-gold/5 transition-colors"
                                            >
                                                Leyes Estatales
                                            </Link>
                                        )}
                                        {canAccessRedactor && (
                                            <Link
                                                href="/redactor-sentencia"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors border"
                                                style={{ color: '#7c3aed', borderColor: 'rgba(124, 58, 237, 0.3)' }}
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Redactor
                                            </Link>
                                        )}
                                        {isAdminEmail && (
                                            <Link
                                                href="/admin"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors border col-span-2"
                                                style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)', background: 'rgba(220, 38, 38, 0.04)' }}
                                            >
                                                <Shield className="w-3.5 h-3.5" />
                                                Administrador
                                            </Link>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Divider */}
                            <div className="h-px bg-black/5 my-2" />

                            {/* Chat CTA */}
                            <Link
                                href="/chat"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-charcoal-900 text-white text-base font-semibold rounded-lg hover:bg-charcoal-800 transition-colors"
                            >
                                <MessageSquare className="w-5 h-5" />
                                Ir al Chat
                            </Link>

                            {/* Login/Register (only if not logged in) */}
                            {!isLoggedIn && !isLoading && (
                                <>
                                    <div className="h-px bg-black/5 my-2" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Link
                                            href="/login"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="text-sm font-medium text-charcoal-700 text-center py-2.5 rounded-lg border border-black/10 hover:bg-black/5 transition-colors"
                                        >
                                            Iniciar Sesión
                                        </Link>
                                        <Link
                                            href="/registro"
                                            className="btn-primary text-sm text-center py-2.5"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Probar Gratis
                                        </Link>
                                    </div>
                                </>
                            )}
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
            className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5"
        >
            {children}
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
            className="text-base font-medium text-charcoal-700 hover:text-charcoal-900 hover:bg-black/5 transition-colors py-2.5 px-3 rounded-lg"
        >
            {children}
        </Link>
    );
}
