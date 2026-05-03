'use client';

import Link from 'next/link';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle, signInWithApple } from '@/lib/supabase';

export default function RegistroPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!acceptTerms) {
            setError('Debes aceptar los términos y condiciones');
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await signUpWithEmail(email, password, name);
            
            // Google Ads Conversion tracking: Registro
            if (typeof (window as any).gtag === 'function') {
                (window as any).gtag('event', 'conversion', {
                    'send_to': 'AW-18019843576/jCevCMPy4Z4cEPj7w5BD',
                    'value': 1.0,
                    'currency': 'MXN'
                });
                (window as any).gtag('event', 'conversion', {
                    'send_to': 'AW-18019843576/TidqCP3ZhaMaEMj0xOQo',
                    'value': 1.0,
                    'currency': 'MXN'
                });
            }

            // With email confirmation disabled, user is signed in immediately
            router.push('/chat');
        } catch (err: any) {
            if (err.message?.includes('already registered')) {
                setError('Este email ya está registrado. Intenta iniciar sesión.');
            } else {
                setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError('Error al conectar con Google');
        }
    };

    const handleAppleLogin = async () => {
        try {
            await signInWithApple();
        } catch (err: any) {
            setError('Error al conectar con Apple');
        }
    };

    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <span className="font-serif text-3xl font-semibold text-charcoal-900">
                        Iurex<span className="text-accent-gold">ia</span>
                    </span>
                </Link>

                {/* Register Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-black/5">
                    <h1 className="font-serif text-2xl font-medium text-charcoal-900 text-center mb-2">
                        Crea tu cuenta
                    </h1>
                    <p className="text-charcoal-500 text-center text-sm mb-6">
                        Comienza con 5 consultas gratis
                    </p>

                    {/* Benefits */}
                    <div className="bg-green-50 rounded-xl p-4 mb-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Check className="w-4 h-4 flex-shrink-0" />
                                <span>5 consultas mensuales gratis</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Check className="w-4 h-4 flex-shrink-0" />
                                <span>Búsqueda jurídica con IA</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Check className="w-4 h-4 flex-shrink-0" />
                                <span>Filtros jurisdiccionales</span>
                            </div>
                        </div>
                    </div>

                    {/* ★ Google Login — PRIMARY ACTION ★ */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 mb-3 border-2 border-charcoal-900 bg-charcoal-900 text-white hover:bg-charcoal-800 hover:border-charcoal-800 shadow-md hover:shadow-lg"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar con Google
                    </button>

                    {/* ★ Apple Login ★ */}
                    <button
                        onClick={handleAppleLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 mb-3 border-2 border-black bg-black text-white hover:bg-gray-900 hover:border-gray-900 shadow-md hover:shadow-lg"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        Continuar con Apple
                    </button>

                    {/* Trust signal */}
                    <p className="text-center text-xs text-charcoal-400 mb-5">
                        Registro instantáneo · Sin contraseñas
                    </p>

                    {error && !showEmailForm && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center mb-4">
                            {error}
                        </div>
                    )}

                    {/* Collapsible Email Registration */}
                    <div className="border-t border-gray-100 pt-4">
                        <button
                            onClick={() => setShowEmailForm(!showEmailForm)}
                            className="w-full flex items-center justify-center gap-2 text-sm text-charcoal-400 hover:text-charcoal-600 transition-colors py-1"
                        >
                            <span>Registrarse con email</span>
                            {showEmailForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showEmailForm && (
                            <form onSubmit={handleRegister} className="space-y-4 mt-4 animate-in slide-in-from-top-2 duration-300">
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                                        Nombre completo
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all text-sm"
                                        placeholder="Juan Pérez"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all text-sm"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                                        Contraseña
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all text-sm"
                                        placeholder="Mínimo 8 caracteres"
                                        minLength={8}
                                        required
                                    />
                                </div>

                                <div className="flex items-start gap-3">
                                    <input
                                        id="terms"
                                        type="checkbox"
                                        checked={acceptTerms}
                                        onChange={(e) => setAcceptTerms(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-accent-brown focus:ring-accent-brown"
                                    />
                                    <label htmlFor="terms" className="text-xs text-charcoal-600">
                                        Acepto los{' '}
                                        <Link href="/terminos" className="text-accent-brown hover:underline">
                                            términos y condiciones
                                        </Link>{' '}
                                        y la{' '}
                                        <Link href="/privacidad" className="text-accent-brown hover:underline">
                                            política de privacidad
                                        </Link>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 bg-charcoal-900 text-white text-sm font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Login Link */}
                    <p className="text-center text-sm text-charcoal-500 mt-6">
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" className="text-accent-brown font-medium hover:underline">
                            Inicia sesión
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
