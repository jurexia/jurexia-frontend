'use client';

/**
 * Las piezas de la entrada con código por correo (17-sep-2026), compartidas por
 * /registro y /login. Ver `@/lib/entrada-con-codigo` para el porqué.
 *
 *   PasoCodigo        las seis casillas, «Verificar» y «Reenviar código»
 *   OfertaContrasena  después de entrar: contraseña opcional para la próxima vez
 *   EntrarConCodigo   el recorrido entero de /login
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Mail } from 'lucide-react';
import { updatePassword } from '@/lib/supabase';
import { entrarConCodigo, pedirCodigo } from '@/lib/entrada-con-codigo';

const CIFRAS = 6;
const VACIO: string[] = Array(CIFRAS).fill('');
const ESPERA_REENVIO_S = 60;

export function PasoCodigo({
    email,
    error,
    verificando,
    textoBoton,
    onVerificar,
    onReenviar,
    onVolver,
}: {
    email: string;
    error: string;
    verificando: boolean;
    textoBoton: string;
    /** Devuelve si entró; si no, las casillas se vacían para el siguiente intento. */
    onVerificar: (codigo: string) => Promise<boolean>;
    /** Devuelve si el código salió; sólo entonces vuelve a contar la espera. */
    onReenviar: () => Promise<boolean>;
    onVolver: () => void;
}) {
    const [cifras, setCifras] = useState<string[]>(VACIO);
    const [espera, setEspera] = useState(ESPERA_REENVIO_S);
    const [reenviando, setReenviando] = useState(false);
    const casillas = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (espera <= 0) return;
        const timer = setTimeout(() => setEspera(espera - 1), 1000);
        return () => clearTimeout(timer);
    }, [espera]);

    // Al abrir el paso y tras un código fallido, el foco va a la primera
    // casilla. Tiene que esperar a que acabe de verificar: deshabilitada no lo
    // acepta.
    useEffect(() => {
        if (!verificando && cifras.every(c => !c)) casillas.current[0]?.focus();
    }, [verificando, cifras]);

    const verificar = async (codigo: string) => {
        if (!(await onVerificar(codigo))) setCifras(VACIO);
    };

    const cambiar = (i: number, valor: string) => {
        const digitos = valor.replace(/\D/g, '');
        if (valor && !digitos) return;

        // El autocompletado del teléfono mete el código entero en una casilla.
        // Por eso las casillas no llevan `maxLength`: lo recortaría a una cifra
        // antes de llegar aquí.
        if (digitos.length >= CIFRAS) {
            const codigo = digitos.slice(0, CIFRAS);
            setCifras(codigo.split(''));
            casillas.current[CIFRAS - 1]?.focus();
            verificar(codigo);
            return;
        }

        // Escribir sobre una casilla llena deja dos cifras: se queda la nueva,
        // esté el cursor antes o después de la vieja.
        const anterior = cifras[i];
        const cifra = digitos.length > 1 ? (digitos.replace(anterior, '') || anterior).slice(-1) : digitos;

        const nuevo = [...cifras];
        nuevo[i] = cifra;
        setCifras(nuevo);

        if (cifra && i < CIFRAS - 1) casillas.current[i + 1]?.focus();
        if (cifra && nuevo.every(c => c)) verificar(nuevo.join(''));
    };

    const retroceder = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !cifras[i] && i > 0) {
            casillas.current[i - 1]?.focus();
        }
    };

    const pegar = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CIFRAS);
        if (pegado.length === CIFRAS) {
            setCifras(pegado.split(''));
            casillas.current[CIFRAS - 1]?.focus();
            verificar(pegado);
        }
    };

    const reenviar = async () => {
        if (espera > 0 || reenviando) return;
        setReenviando(true);
        if (await onReenviar()) {
            setEspera(ESPERA_REENVIO_S);
            setCifras(VACIO);
        }
        setReenviando(false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button
                onClick={onVolver}
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

            {/* Seis casillas de 40 px en el teléfono: las de 48 px no cabían en
                una pantalla de 375 px dentro de la tarjeta. */}
            <div className="flex justify-center gap-1.5 sm:gap-2 mb-6" onPaste={pegar}>
                {cifras.map((cifra, i) => (
                    <input
                        key={i}
                        ref={el => { casillas.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        aria-label={`Cifra ${i + 1} del código`}
                        value={cifra}
                        onChange={e => cambiar(i, e.target.value)}
                        onKeyDown={e => retroceder(i, e)}
                        disabled={verificando}
                        className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                            ${cifra ? 'border-accent-gold bg-amber-50/50' : 'border-gray-200 bg-white'}
                            focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20
                            disabled:opacity-50`}
                    />
                ))}
            </div>

            {/* Verify button (fallback for manual submit) */}
            <button
                onClick={() => {
                    const codigo = cifras.join('');
                    if (codigo.length === CIFRAS) verificar(codigo);
                }}
                disabled={verificando || cifras.some(c => !c)}
                className="w-full py-2.5 px-4 bg-charcoal-900 text-white text-sm font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
                {verificando ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verificando...
                    </span>
                ) : (
                    textoBoton
                )}
            </button>

            <div className="text-center">
                <p className="text-xs text-charcoal-400 mb-1">¿No recibiste el código?</p>
                {espera > 0 ? (
                    <p className="text-xs text-charcoal-400">
                        Reenviar en <span className="font-medium text-charcoal-600">{espera}s</span>
                    </p>
                ) : (
                    <button
                        onClick={reenviar}
                        disabled={reenviando}
                        className="text-xs text-accent-brown font-medium hover:underline disabled:opacity-50"
                    >
                        {reenviando ? 'Enviando...' : 'Reenviar código'}
                    </button>
                )}
                <p className="text-xs text-charcoal-400 mt-2">
                    Revisa tu carpeta de spam si no lo encuentras
                </p>
            </div>
        </div>
    );
}

/**
 * Ya dentro: la contraseña para las próximas sesiones, OPCIONAL. Quien entró
 * con código puede seguir haciéndolo siempre; esto es para quien prefiere
 * escribir una. Guardarla sustituye la que hubiera —la aleatoria de las
 * cuentas creadas por código, o la que ya tenía y quizá olvidó—, igual que en
 * Perfil → Contraseña, donde también se puede hacer más tarde.
 */
export function OfertaContrasena({
    email,
    titulo,
    aviso,
    onListo,
}: {
    email: string;
    titulo: string;
    aviso?: string;
    onListo: () => void;
}) {
    const [contrasena, setContrasena] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (contrasena.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (contrasena !== confirmacion) {
            setError('Las dos contraseñas no coinciden.');
            return;
        }

        setGuardando(true);
        setError('');
        try {
            await updatePassword(contrasena);
            onListo();
        } catch (err) {
            // Supabase contesta en inglés; aquí no tiene por qué leerse.
            const crudo = err instanceof Error ? err.message : String(err);
            const codigo = (err as { code?: string } | null)?.code;
            if (codigo === 'same_password' || /should be different|same as the old/i.test(crudo)) {
                // Escribió la que ya tenía: lo que quería ya está hecho.
                onListo();
                return;
            }
            setError(
                codigo === 'weak_password' || /weak|pwned|leaked/i.test(crudo)
                    ? 'Esa contraseña es fácil de adivinar o aparece en filtraciones. Elige otra.'
                    : 'No pudimos guardar la contraseña. Inténtalo de nuevo o hazlo después desde tu perfil.'
            );
            setGuardando(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-green-600" />
                </div>
                <h1 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                    {titulo}
                </h1>
                {aviso && (
                    <p className="text-charcoal-800 text-sm mb-2">{aviso}</p>
                )}
                <p className="text-charcoal-500 text-sm">
                    Si quieres, crea una contraseña para tus próximas sesiones. Si no,
                    puedes volver a entrar con un código cuando lo necesites.
                </p>
            </div>

            <form onSubmit={guardar} className="space-y-4">
                {/* Para que el gestor de contraseñas la guarde con su correo. */}
                <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={email}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                />

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="nueva-contrasena" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                        Contraseña
                    </label>
                    <input
                        id="nueva-contrasena"
                        type="password"
                        autoComplete="new-password"
                        value={contrasena}
                        onChange={(e) => { setContrasena(e.target.value); setError(''); }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all text-sm"
                        placeholder="Mínimo 8 caracteres"
                    />
                </div>

                <div>
                    <label htmlFor="confirmar-contrasena" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                        Repite la contraseña
                    </label>
                    <input
                        id="confirmar-contrasena"
                        type="password"
                        autoComplete="new-password"
                        value={confirmacion}
                        onChange={(e) => { setConfirmacion(e.target.value); setError(''); }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={guardando || !contrasena || !confirmacion}
                    className="w-full py-2.5 px-4 bg-charcoal-900 text-white text-sm font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {guardando ? 'Guardando...' : 'Guardar contraseña y continuar'}
                </button>
            </form>

            <button
                type="button"
                onClick={onListo}
                disabled={guardando}
                className="w-full text-center text-sm text-charcoal-500 hover:text-charcoal-700 font-medium mt-4 py-1 transition-colors disabled:opacity-50"
            >
                Ahora no
            </button>
        </div>
    );
}

/**
 * /login → «Entrar con un código por correo». Sólo entra a cuentas que ya
 * existen: aquí no se aceptan los términos. Si el correo no tiene cuenta, se
 * dice después del código —ya probó que el correo es suyo— y se le manda a
 * registrarse.
 */
export function EntrarConCodigo({
    emailInicial,
    onVolver,
    onDentro,
}: {
    emailInicial: string;
    onVolver: () => void;
    onDentro: () => void;
}) {
    const [paso, setPaso] = useState<'correo' | 'codigo' | 'contrasena'>('correo');
    const [email, setEmail] = useState(emailInicial);
    const [error, setError] = useState('');
    const [sinCuenta, setSinCuenta] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [verificando, setVerificando] = useState(false);

    const enviar = async (): Promise<boolean> => {
        setError('');
        setSinCuenta(false);
        const r = await pedirCodigo({ email, modo: 'entrar' });
        if (!r.ok) setError(r.error);
        return r.ok;
    };

    const pedir = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        if (await enviar()) setPaso('codigo');
        setEnviando(false);
    };

    const verificar = async (codigo: string): Promise<boolean> => {
        setVerificando(true);
        setError('');
        const r = await entrarConCodigo({ email, code: codigo, modo: 'entrar' });
        setVerificando(false);
        if (r.ok) {
            setPaso('contrasena');
            return true;
        }
        setError(r.error);
        if (r.sinCuenta) {
            // El código ya se gastó: se vuelve al correo, por si era una errata.
            setSinCuenta(true);
            setPaso('correo');
        }
        return false;
    };

    if (paso === 'codigo') {
        return (
            <PasoCodigo
                email={email.trim().toLowerCase()}
                error={error}
                verificando={verificando}
                textoBoton="Verificar y entrar"
                onVerificar={verificar}
                onReenviar={enviar}
                onVolver={() => { setPaso('correo'); setError(''); }}
            />
        );
    }

    if (paso === 'contrasena') {
        return (
            <OfertaContrasena
                email={email.trim().toLowerCase()}
                titulo="Ya estás dentro"
                onListo={onDentro}
            />
        );
    }

    return (
        <>
            <h1 className="font-serif text-2xl font-medium text-charcoal-900 text-center mb-2">
                Entrar con un código
            </h1>
            <p className="text-charcoal-500 text-center mb-8 text-sm">
                Te enviaremos a tu correo un código de 6 dígitos. No necesitas contraseña.
            </p>

            <form onSubmit={pedir} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
                        {error}
                        {sinCuenta && (
                            <>
                                {' '}
                                <Link href="/registro" className="font-medium underline">
                                    Crear cuenta
                                </Link>
                            </>
                        )}
                    </div>
                )}

                <div>
                    <label htmlFor="codigoEmail" className="block text-sm font-medium text-charcoal-700 mb-2">
                        Email
                    </label>
                    <input
                        id="codigoEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-brown/50 focus:border-accent-brown transition-all"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        required
                        autoFocus
                    />
                </div>

                <button
                    type="submit"
                    disabled={enviando}
                    className="w-full py-3 px-4 bg-charcoal-900 text-white font-medium rounded-xl hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {enviando ? 'Enviando...' : 'Enviarme el código'}
                </button>
            </form>

            <button
                onClick={onVolver}
                className="w-full text-center text-sm text-accent-brown font-medium mt-6 hover:underline"
            >
                ← Volver al login
            </button>
        </>
    );
}
