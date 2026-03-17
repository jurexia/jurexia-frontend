'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signInWithGoogle, resendConfirmationEmail } from '@/lib/supabase';
import { RefreshCw, Mail } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Resend state
    const [showResend, setShowResend] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendSuccess, setResendSuccess] = useState(false);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowResend(false);
        setResendSuccess(false);

        try {
            await signInWithEmail(email, password);
            router.push('/chat');
        } catch (err: any) {
            if (err.message?.includes('Invalid login')) {
                setError('Email o contraseña incorrectos');
            } else if (err.message?.includes('Email not confirmed')) {
                setError('Tu email aún no está confirmado.');
                setShowResend(true);
            } else {
                setError(err.message || 'Error al iniciar sesión');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;
        setResendSuccess(false);

        try {
            await resendConfirmationEmail(email);
            setResendSuccess(true);
            setResendCooldown(60);
        } catch (err: any) {
            setError('Error al reenviar el correo. Intenta de nuevo.');
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError('Error al conectar con Google');
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

                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-black/5">
                    <h1 className="font-serif text-2xl font-medium text-charcoal-900 text-center mb-2">
                        Bienvenido de vuelta
                    </h1>
                    <p className="text-charcoal-500 text-center mb-8">
                        Inicia sesión para continuar
                    </p>

                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="text-charcoal-700 font-medium">Continuar con Google</span>
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-charcoal-400">o continúa con email</span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        {error && (
                            <div className={`p-3 ${showResend ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-600'} text-sm rounded-xl text-center`}>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    {showResend && <Mail className="w-4 h-4" />}
                                    <span>{error}</span>
                                </div>
                                {showResend && (
                                    <div className="mt-3">
                                        <p className="text-xs text-amber-600 mb-2">
                                            Revisa tu correo (incluye SPAM). ¿No lo recibes?
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleResendEmail}
                                            disabled={resendCooldown > 0}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            {resendCooldown > 0
                                                ? `Reenviar en ${resendCooldown}s`
                                                : 'Reenviar correo de confirmación'
                                            }
                                        </button>
                                        {resendSuccess && (
                                            <p className="text-green-600 text-xs mt-2">
                                                ✅ Correo reenviado exitosamente
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-charcoal-700 mb-2">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-charcoal-900 text-white font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {/* Register Link */}
                    <p className="text-center text-sm text-charcoal-500 mt-6">
                        ¿No tienes cuenta?{' '}
                        <Link href="/registro" className="text-accent-brown font-medium hover:underline">
                            Regístrate gratis
                        </Link>
                    </p>
                </div>

                {/* Back to home */}
                <p className="text-center text-sm text-charcoal-400 mt-6">
                    <Link href="/" className="hover:text-charcoal-600 transition-colors">
                        ← Volver al inicio
                    </Link>
                </p>
            </div>
        </main>
    );
}

