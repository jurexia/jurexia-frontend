'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegistroPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!acceptTerms) {
            setError('Debes aceptar los términos y condiciones');
            return;
        }

        setLoading(true);
        setError('');

        // For demo, we'll sign in directly after "registration"
        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError('Error al registrar. Intenta de nuevo.');
            setLoading(false);
        } else {
            router.push('/chat');
        }
    };

    const handleSocialLogin = (provider: string) => {
        signIn(provider, { callbackUrl: '/chat' });
    };

    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <span className="font-serif text-3xl font-semibold text-charcoal-900">
                        Jurex<span className="text-accent-gold">ia</span>
                    </span>
                </Link>

                {/* Register Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-black/5">
                    <h1 className="font-serif text-2xl font-medium text-charcoal-900 text-center mb-2">
                        Crea tu cuenta
                    </h1>
                    <p className="text-charcoal-500 text-center mb-6">
                        Comienza con 5 consultas gratis
                    </p>

                    {/* Benefits */}
                    <div className="bg-green-50 rounded-xl p-4 mb-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Check className="w-4 h-4" />
                                <span>5 consultas mensuales gratis</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Check className="w-4 h-4" />
                                <span>Búsqueda híbrida RAG</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Check className="w-4 h-4" />
                                <span>Filtros jurisdiccionales</span>
                            </div>
                        </div>
                    </div>

                    {/* Social Login Buttons */}
                    <div className="space-y-3 mb-6">
                        <button
                            onClick={() => handleSocialLogin('google')}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-charcoal-700 font-medium">Registrarse con Google</span>
                        </button>

                        <button
                            onClick={() => handleSocialLogin('twitter')}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span className="text-charcoal-700 font-medium">Registrarse con X</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-charcoal-400">o regístrate con email</span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-charcoal-700 mb-2">
                                Nombre completo
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all"
                                placeholder="Juan Pérez"
                                required
                            />
                        </div>

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
                            <label htmlFor="terms" className="text-sm text-charcoal-600">
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
                            className="w-full py-3 px-4 bg-charcoal-900 text-white font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                        </button>
                    </form>

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
