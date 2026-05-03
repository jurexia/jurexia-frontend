'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, X, Shield } from 'lucide-react';
import { getVerificationStatus, sendVerificationEmail, UNVERIFIED_QUERY_LIMIT } from '@/lib/emailVerification';

interface VerificationBannerProps {
    queriesUsed: number;
}

/**
 * Banner that nudges unverified email users to verify.
 * Shows progressively more urgently as they approach the unverified limit.
 * Google OAuth users never see this (they're auto-verified).
 */
export default function VerificationBanner({ queriesUsed }: VerificationBannerProps) {
    const [isVerified, setIsVerified] = useState(true); // Default to verified (don't show)
    const [provider, setProvider] = useState('unknown');
    const [dismissed, setDismissed] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const check = async () => {
            try {
                const status = await getVerificationStatus();
                setIsVerified(status.isVerified);
                setProvider(status.provider);
            } catch {
                // On error, assume verified (don't block)
            }
        };
        check();
    }, []);

    const handleSendVerification = useCallback(async () => {
        setSending(true);
        setError('');
        try {
            await sendVerificationEmail();
            setSent(true);
        } catch (err: any) {
            setError('Error al enviar. Intenta de nuevo.');
        } finally {
            setSending(false);
        }
    }, []);

    // Don't render for verified users or Google OAuth
    if (isVerified || provider === 'google' || dismissed) return null;

    const isUrgent = queriesUsed >= UNVERIFIED_QUERY_LIMIT - 1;
    const isBlocked = queriesUsed >= UNVERIFIED_QUERY_LIMIT;

    return (
        <div className="fixed top-14 left-0 right-0 md:left-72 z-25 animate-in slide-in-from-top duration-500">
            <div className={`border-b px-4 py-3 ${
                isBlocked
                    ? 'bg-gradient-to-r from-red-50 via-red-100/80 to-red-50 border-red-200'
                    : isUrgent
                    ? 'bg-gradient-to-r from-amber-50 via-amber-100/80 to-yellow-50 border-amber-200'
                    : 'bg-gradient-to-r from-blue-50 via-blue-100/80 to-indigo-50 border-blue-200'
            }`}>
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isBlocked ? 'bg-red-100' : isUrgent ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                            {isBlocked
                                ? <Shield className="w-4 h-4 text-red-600" />
                                : <Mail className="w-4 h-4 text-blue-600" />
                            }
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-medium ${
                                isBlocked ? 'text-red-800' : isUrgent ? 'text-amber-800' : 'text-blue-800'
                            }`}>
                                {isBlocked
                                    ? 'Verifica tu email para seguir consultando'
                                    : isUrgent
                                    ? `Te queda 1 consulta — verifica tu email para desbloquear las 5 consultas gratuitas`
                                    : 'Verifica tu email para acceder a todas tus consultas gratuitas'
                                }
                            </p>
                            {sent && (
                                <p className="text-xs text-green-600 mt-0.5">
                                    ✅ Correo enviado — revisa tu bandeja (incluye spam)
                                </p>
                            )}
                            {error && (
                                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={handleSendVerification}
                            disabled={sending || sent}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                                isBlocked
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            <Mail className="w-3 h-3" />
                            {sent ? 'Enviado' : sending ? 'Enviando...' : 'Enviar verificación'}
                        </button>
                        {!isBlocked && (
                            <button
                                onClick={() => setDismissed(true)}
                                className="text-charcoal-400 hover:text-charcoal-600 transition-colors text-lg leading-none"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
