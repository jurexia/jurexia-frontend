'use client';
/**
 * «PROBAR IUREXIA» — ENTRAR SIN NADA (18-sep-2026)
 *
 * David: «hay un enorme cuello de usuarios que nunca hace auth. Basta con que
 * haga clic en probar la plataforma en su versión más básica».
 *
 * Medido el mismo día: 2,320 cuentas creadas y sólo 438 que llegaron a
 * escribir una consulta. Cuatro de cada cinco se registran y no ven nunca el
 * producto, así que el registro no es el embudo, es el tapón. Este botón lo
 * quita: abre una visita anónima y entra al chat. Ni correo, ni tarjeta, ni
 * código de verificación.
 *
 * Lo que encuentra dentro está limitado por CAPACIDAD, no por cantidad, y las
 * herramientas de pago se ven con candado. Ver `@/lib/gratis`.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { abrirSesionBasica } from '@/lib/gratis';

export default function BotonProbar({
    children = 'Probar sin registrarme',
    className = '',
    sub,
}: {
    children?: React.ReactNode;
    className?: string;
    /** Una línea debajo, para decir qué cuesta: nada. */
    sub?: string;
}) {
    const router = useRouter();
    const [abriendo, setAbriendo] = useState(false);
    const [error, setError] = useState('');

    const entrar = async () => {
        setError('');
        setAbriendo(true);
        try {
            await abrirSesionBasica();
            router.push('/chat');
        } catch {
            setError('No pudimos abrir la prueba. Inténtalo de nuevo.');
            setAbriendo(false);
        }
    };

    return (
        <div className="inline-flex flex-col items-center gap-1.5">
            <button
                type="button"
                onClick={entrar}
                disabled={abriendo}
                className={className || 'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent-gold px-6 text-[0.9375rem] font-bold text-charcoal-900 transition-opacity hover:opacity-90 disabled:opacity-60'}
            >
                {abriendo
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : null}
                {abriendo ? 'Abriendo…' : children}
                {!abriendo && <ArrowRight className="h-4 w-4" />}
            </button>
            {sub && !error && <span className="text-xs text-charcoal-500">{sub}</span>}
            {error && <span className="text-xs text-red-700">{error}</span>}
        </div>
    );
}
