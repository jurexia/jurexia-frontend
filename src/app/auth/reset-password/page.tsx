'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, updatePassword } from '@/lib/supabase';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        // Listen for the PASSWORD_RECOVERY event — Supabase handles the hash/code exchange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'PASSWORD_RECOVERY' && session) {
                    setSessionReady(true);
                }
                // Also handle if user already has a session (e.g., page refresh)
                if (event === 'SIGNED_IN' && session) {
                    setSessionReady(true);
                }
            }
        );

        // Check if there's already a session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
            }
        });

        // Timeout fallback
        const timeout = setTimeout(() => {
            if (!sessionReady) {
                setError('El enlace ha expirado o es inválido. Solicita uno nuevo.');
            }
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [sessionReady]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            await updatePassword(password);
            setSuccess(true);
            setTimeout(() => {
                router.push('/chat');
            }, 2000);
        } catch (err: any) {
            if (err.message?.includes('same_password')) {
                setError('La nueva contraseña debe ser diferente a la actual');
            } else {
                setError(err.message || 'Error al actualizar la contraseña');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <span className="font-serif text-3xl font-semibold text-charcoal-900">
                        Iurex<span className="text-accent-gold">ia</span>
                    </span>
                </Link>

                {/* Reset Password Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-black/5">
                    {success ? (
                        /* Success State */
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                ¡Contraseña actualizada!
                            </h1>
                            <p className="text-charcoal-500 text-sm">
                                Redirigiendo a Iurexia...
                            </p>
                        </div>
                    ) : !sessionReady && !error ? (
                        /* Loading State */
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-brown mx-auto mb-4"></div>
                            <p className="text-charcoal-500 text-sm">Verificando enlace...</p>
                        </div>
                    ) : (
                        /* Form State */
                        <>
                            <h1 className="font-serif text-2xl font-medium text-charcoal-900 text-center mb-2">
                                Nueva contraseña
                            </h1>
                            <p className="text-charcoal-500 text-center mb-8 text-sm">
                                Ingresa tu nueva contraseña
                            </p>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-charcoal-700 mb-2">
                                        Nueva contraseña
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all"
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal-700 mb-2">
                                        Confirmar contraseña
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all"
                                        placeholder="Repite tu contraseña"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || (!sessionReady && !error)}
                                    className="w-full py-3 px-4 bg-charcoal-900 text-white font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Back to login */}
                <p className="text-center text-sm text-charcoal-400 mt-6">
                    <Link href="/login" className="hover:text-charcoal-600 transition-colors">
                        ← Volver al login
                    </Link>
                </p>
            </div>
        </main>
    );
}
