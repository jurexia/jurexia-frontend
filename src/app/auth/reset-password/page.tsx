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
        let listo = false;
        const marcar = () => { listo = true; setSessionReady(true); setError(''); };

        // Escuchar sigue siendo útil (flujo implícito con hash), pero ya no es
        // la única esperanza: abajo se canjea el token de forma EXPLÍCITA.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) marcar();
            }
        );

        (async () => {
            // ¿Ya hay sesión? (refresh de la página, p. ej.)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) { marcar(); return; }

            // Canje explícito según lo que traiga la URL. Esperar a que el SDK
            // «lo haga solo» era la causa de que el formulario apareciera sin
            // sesión y el guardar terminara en «Auth session missing!».
            const url = new URL(window.location.href);
            const tokenHash = url.searchParams.get('token_hash');
            const code = url.searchParams.get('code');
            try {
                if (tokenHash) {
                    const { error: e } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
                    if (!e) { marcar(); return; }
                } else if (code) {
                    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
                    if (!e) { marcar(); return; }
                }
            } catch { /* cae al timeout de abajo */ }
        })();

        // Si en 8 s no hubo sesión, el enlace no sirve EN ESTE navegador. El
        // caso típico: el correo lo pidió la app del teléfono (la sesión PKCE
        // vive allá) — por eso la app ahora restablece por código de 6 dígitos
        // sin pasar por aquí.
        const timeout = setTimeout(() => {
            if (!listo) {
                setError(
                    'Este enlace no se puede usar en este navegador o ya expiró. ' +
                    'Si pediste el cambio desde la app de Iurexia, usa ahí la opción ' +
                    '«Olvidé mi contraseña» con el código de 6 dígitos. O solicita un enlace nuevo.'
                );
            }
        }, 8000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Sin sesión no hay a quién cambiarle la contraseña: mejor decirlo
        // claro que dejar que updateUser devuelva «Auth session missing!».
        if (!sessionReady) {
            setError(
                'Este enlace no estableció sesión en este navegador. Si pediste el cambio ' +
                'desde la app, usa ahí «Olvidé mi contraseña» con el código de 6 dígitos.'
            );
            return;
        }

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
