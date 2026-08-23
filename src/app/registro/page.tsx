'use client';

import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, ArrowLeft, Mail } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInWithApple, supabase } from '@/lib/supabase';
import { destinoTrasEntrar } from '@/lib/destino-tras-entrar';

export default function RegistroPage() {
    const router = useRouter();

    // Se lee una sola vez al montar: en el servidor no hay `window`, y
    // useSearchParams obligaría a envolver la página en <Suspense>.
    const [codigoReferido, setCodigoReferido] = useState<string | null>(null);
    // Y por lo mismo, a dónde volver si se registró para comprar un plan.
    const [destino, setDestino] = useState('/chat');
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const ref = q.get('ref');
        if (ref) setCodigoReferido(ref.trim().toUpperCase());
        setDestino(destinoTrasEntrar(q.get('redirect')));
    }, []);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);

    // OTP state
    const [otpStep, setOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // Auto-focus first OTP input
    useEffect(() => {
        if (otpStep && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [otpStep]);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!acceptTerms) {
            setError('Debes aceptar los términos y condiciones');
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setOtpSending(true);
        setError('');

        try {
            const res = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al enviar el código');
                return;
            }

            setOtpStep(true);
            setResendCooldown(60);
            setOtpCode(['', '', '', '', '', '']);
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setOtpSending(false);
        }
    };

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;

        setOtpSending(true);
        setError('');

        try {
            const res = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al reenviar');
                return;
            }

            setResendCooldown(60);
            setOtpCode(['', '', '', '', '', '']);
        } catch {
            setError('Error de conexión.');
        } finally {
            setOtpSending(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newCode = [...otpCode];
        newCode[index] = value;
        setOtpCode(newCode);

        // Auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (value && index === 5 && newCode.every(d => d !== '')) {
            verifyOTP(newCode.join(''));
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newCode = pasted.split('');
            setOtpCode(newCode);
            inputRefs.current[5]?.focus();
            verifyOTP(pasted);
        }
    };

    const verifyOTP = async (code: string) => {
        setOtpVerifying(true);
        setError('');

        try {
            const res = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code,
                    password,
                    // Código de invitación, si llegó por el enlace de un
                    // colega (/registro?ref=XXXXXXXX). Se lee de la URL en
                    // vez de guardarse en estado para que sobreviva a que el
                    // usuario recargue a medio registro.
                    ref: codigoReferido,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al verificar');
                if (res.status === 409) {
                    // Already registered — redirect to login
                    setTimeout(() => router.push('/login'), 2000);
                }
                setOtpCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                return;
            }

            // Account created! Now sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (signInError) {
                setError('Cuenta creada. Inicia sesión manualmente.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

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

            router.push(destino);
        } catch {
            setError('Error de conexión.');
        } finally {
            setOtpVerifying(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch {
            setError('Error al conectar con Google');
        }
    };

    const handleAppleLogin = async () => {
        try {
            await signInWithApple();
        } catch {
            setError('Error al conectar con Apple');
        }
    };

    return (
        <main className="min-h-screen bg-cream-300 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
                    <img src="/logo-iurexia.png" alt="Iurexia Logo" className="h-12 w-auto object-contain transition-transform group-hover:scale-105" />
                    <span className="font-serif text-3xl font-semibold text-charcoal-900 tracking-tight">
                        Iurex<span className="text-accent-gold">ia</span>
                    </span>
                </Link>

                {/* Register Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-black/5">
                    {otpStep ? (
                        /* ── OTP VERIFICATION STEP ── */
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <button
                                onClick={() => { setOtpStep(false); setError(''); }}
                                className="flex items-center gap-1 text-sm text-charcoal-400 hover:text-charcoal-600 transition-colors mb-6"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Volver
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-7 h-7 text-green-600" />
                                </div>
                                <h1 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                    Verifica tu email
                                </h1>
                                <p className="text-charcoal-500 text-sm">
                                    Enviamos un código de 6 dígitos a
                                </p>
                                <p className="text-charcoal-800 font-medium text-sm mt-1">
                                    {email}
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center mb-4">
                                    {error}
                                </div>
                            )}

                            {/* OTP Input */}
                            <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                                {otpCode.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { inputRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        disabled={otpVerifying}
                                        className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                                            ${digit ? 'border-accent-gold bg-amber-50/50' : 'border-gray-200 bg-white'}
                                            focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20
                                            disabled:opacity-50`}
                                    />
                                ))}
                            </div>

                            {/* Verify button (fallback for manual submit) */}
                            <button
                                onClick={() => {
                                    const code = otpCode.join('');
                                    if (code.length === 6) verifyOTP(code);
                                }}
                                disabled={otpVerifying || otpCode.some(d => !d)}
                                className="w-full py-2.5 px-4 bg-charcoal-900 text-white text-sm font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                            >
                                {otpVerifying ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verificando...
                                    </span>
                                ) : (
                                    'Verificar y crear cuenta'
                                )}
                            </button>

                            {/* Resend */}
                            <div className="text-center">
                                <p className="text-xs text-charcoal-400 mb-1">¿No recibiste el código?</p>
                                {resendCooldown > 0 ? (
                                    <p className="text-xs text-charcoal-400">
                                        Reenviar en <span className="font-medium text-charcoal-600">{resendCooldown}s</span>
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleResendOTP}
                                        disabled={otpSending}
                                        className="text-xs text-accent-brown font-medium hover:underline disabled:opacity-50"
                                    >
                                        {otpSending ? 'Enviando...' : 'Reenviar código'}
                                    </button>
                                )}
                                <p className="text-xs text-charcoal-400 mt-2">
                                    Revisa tu carpeta de spam si no lo encuentras
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* ── REGISTRATION STEP ── */
                        <>
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
                                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 mb-3 shadow-sm hover:shadow-md bg-white border border-gray-300 text-charcoal-700 hover:bg-gray-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="font-medium">Continuar con Google</span>
                            </button>

                            {/* ★ Apple Login ★ */}
                            <button
                                onClick={handleAppleLogin}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-medium mb-3 shadow-md hover:shadow-lg transition-all duration-200 bg-black text-white hover:bg-gray-900"
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
                                    <form onSubmit={handleSendOTP} className="space-y-4 mt-4 animate-in slide-in-from-top-2 duration-300">
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
                                            disabled={otpSending}
                                            className="w-full py-2.5 px-4 bg-charcoal-900 text-white text-sm font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {otpSending ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Enviando código...
                                                </span>
                                            ) : (
                                                'Continuar'
                                            )}
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
                        </>
                    )}
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
