'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, User, CreditCard, Settings } from 'lucide-react';

const planColors: Record<string, { bg: string; text: string; label: string }> = {
    gratuito: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Gratuito' },
    pro: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro' },
    pro_anual: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro' },
    platinum: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum' },
    platinum_anual: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum' },
};

export function UserAvatar() {
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (status === 'loading') {
        return (
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
        );
    }

    if (!session?.user) {
        return null;
    }

    const user = session.user;
    const plan = (user as any).plan || 'gratuito';
    const planStyle = planColors[plan] || planColors.gratuito;

    // Get initials from name or email
    const getInitials = () => {
        if (user.name) {
            const names = user.name.split(' ');
            if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
            }
            return user.name.substring(0, 2).toUpperCase();
        }
        if (user.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 focus:outline-none"
            >
                {/* Avatar Circle */}
                <div className="w-10 h-10 rounded-full bg-charcoal-900 flex items-center justify-center text-white font-medium text-sm hover:bg-charcoal-800 transition-colors">
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name || 'Avatar'}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        getInitials()
                    )}
                </div>

                {/* Plan Badge */}
                <span className={`hidden md:inline-flex px-3 py-1 rounded-full text-xs font-semibold ${planStyle.bg} ${planStyle.text}`}>
                    {planStyle.label}
                </span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-black/5 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-medium text-charcoal-900 truncate">
                            {user.name || 'Usuario'}
                        </p>
                        <p className="text-sm text-charcoal-500 truncate">
                            {user.email}
                        </p>
                        <div className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold ${planStyle.bg} ${planStyle.text}`}>
                            Plan {planStyle.label}
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <Link
                            href="/perfil"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-charcoal-700 hover:bg-gray-50 transition-colors"
                        >
                            <User className="w-4 h-4" />
                            <span>Mi perfil</span>
                        </Link>
                        <Link
                            href="/precios"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-charcoal-700 hover:bg-gray-50 transition-colors"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Planes y facturación</span>
                        </Link>
                        <Link
                            href="/configuracion"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-charcoal-700 hover:bg-gray-50 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Configuración</span>
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-2">
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
