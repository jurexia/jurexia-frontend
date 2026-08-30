'use client';

/**
 * El diálogo de cancelación. UNO solo, para toda la aplicación.
 *
 * POR QUÉ EXISTE (8-ago-2026)
 * ---------------------------
 * Había DOS modales de cancelación —uno en `perfil/page.tsx` y otro en
 * `UserAvatar.tsx`— y nadie lo sabía. Se construyó la retención en el del
 * perfil, David canceló desde el menú del avatar y no vio nada. Dos
 * pantallas que hacen lo mismo siempre divergen; la única defensa es que
 * haya una.
 *
 * LA REGLA QUE GOBIERNA EL DISEÑO
 * -------------------------------
 * «Cancelar de todas formas» está visible en TODOS los pasos, a un clic y
 * sin trucos. El art. 76 bis fr. VII de la LFPC exige que la baja sea tan
 * sencilla como el alta, y el público de Iurexia litiga eso por oficio. La
 * retención convence o no convence; jamás estorba.
 *
 * Y el tono no es de vendedor: se pregunta el motivo, se hace UNA oferta
 * pertinente, y si dice que no, se cancela limpio. A un abogado se le
 * retiene con argumentos, no con fricción — el que se va sin obstáculos
 * vuelve; el que se sintió atrapado, no.
 *
 * EL ENCUADRE, y por qué va en un PORTAL: el diálogo se pintaba en
 * `top: -238px` con una ventana de 620 y un alto de 531 — cabía de sobra
 * pero salía cortado por arriba. La causa no es el CSS del diálogo: un
 * ancestro del menú del avatar tiene `backdrop-blur`, y cualquier ancestro
 * con `transform`, `filter` o `backdrop-filter` hace que `position: fixed`
 * se ancle a ESE elemento en vez de a la ventana. Montarlo en
 * `document.body` con un portal lo inmuniza, viva donde viva el botón que
 * lo abre.
 *
 * Además el cuerpo lleva `max-h` con scroll propio y el pie queda fijo: en
 * una pantalla baja el texto se desplaza, pero los botones nunca se van.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Paso = 'cargando' | 'motivo' | 'oferta' | 'pausada' | 'procesando'
    | 'cancelada' | 'ya_cancelada' | 'error';

const MOTIVOS: [string, string][] = [
    ['precio', 'El precio no me conviene'],
    ['poco_uso', 'Casi no lo uso'],
    ['fallo', 'Algo no funcionó o me dio resultados incorrectos'],
    ['falta_algo', 'Le falta algo que necesito'],
    ['otro', 'Otro motivo'],
];

export default function DialogoRetencion({
    abierto, onCerrar, subscriptionId, nombrePlan,
}: {
    abierto: boolean;
    onCerrar: () => void;
    subscriptionId?: string | null;
    nombrePlan?: string;
}) {
    const [paso, setPaso] = useState<Paso>('cargando');
    const [motivo, setMotivo] = useState('');
    const [texto, setTexto] = useState('');
    const [enviado, setEnviado] = useState(false);
    const [pausando, setPausando] = useState(false);
    const [aviso, setAviso] = useState('');
    const [reanuda, setReanuda] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [yaPausada, setYaPausada] = useState(false);

    // El portal necesita el DOM montado; en el primer render del servidor no
    // existe `document`.
    const [montado, setMontado] = useState(false);
    useEffect(() => setMontado(true), []);

    // EL DIÁLOGO MIRA EL ESTADO ANTES DE HABLAR (30-ago-2026)
    // -------------------------------------------------------
    // Antes abría siempre en «Antes de cancelar», dijera lo que dijera Stripe.
    // Un cliente canceló, cerró el diálogo, y como ni el diálogo ni la página
    // de perfil dejaban rastro de la cancelación, volvió a abrirlo y se
    // encontró la misma pantalla de siempre: concluyó que no había funcionado.
    // Lo recorrió cinco veces en cinco minutos —aceptando de paso una pausa
    // que no quería— y terminó reportando el motivo «algo no funcionó».
    // Su cancelación SÍ estaba registrada desde el segundo intento.
    //
    // Preguntar el estado cuesta una llamada y ahorra esa escena entera. Si la
    // llamada falla se sigue al paso normal: no saber el estado no puede
    // impedirle cancelar (art. 76 bis fr. VII LFPC).
    useEffect(() => {
        if (!abierto) return;
        let vivo = true;
        (async () => {
            setPaso('cargando');
            try {
                const tk = (await supabase.auth.getSession()).data.session?.access_token;
                const r = await fetch('/api/stripe/subscription', {
                    headers: tk ? { Authorization: `Bearer ${tk}` } : undefined,
                });
                if (!vivo) return;
                const j = r.ok ? await r.json() : null;
                const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-MX',
                    { day: 'numeric', month: 'long', year: 'numeric' });
                if (j?.pausedUntil) { setYaPausada(true); setReanuda(fmt(j.pausedUntil)); }
                if (j?.cancelAtPeriodEnd) {
                    setFechaFin(fmt(j.cancelAt || j.currentPeriodEnd));
                    setPaso('ya_cancelada');
                    return;
                }
            } catch { /* sin estado se sigue igual: cancelar nunca se bloquea */ }
            if (vivo) setPaso('motivo');
        })();
        return () => { vivo = false; };
    }, [abierto]);

    if (!abierto || !montado) return null;

    const cerrar = () => {
        // Se vuelve a 'cargando', no a 'motivo': al reabrir se consulta el
        // estado otra vez. Si acaba de cancelar, lo que verá es su
        // cancelación, no la invitación a cancelar de nuevo.
        setPaso('cargando'); setMotivo(''); setTexto('');
        setEnviado(false); setAviso('');
        onCerrar();
    };

    const token = async () => (await supabase.auth.getSession()).data.session?.access_token;

    /** El motivo es un dato, no un requisito: si falla, el flujo sigue. */
    const guardarMotivo = async (m: string, t = '') => {
        try {
            const tk = await token();
            if (!tk) return;
            await fetch('/api/stripe/retencion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
                body: JSON.stringify({ accion: 'motivo', motivo: m, texto: t }),
            });
        } catch { /* silencioso a propósito */ }
    };

    const pausar = async () => {
        if (!subscriptionId) {
            setAviso('No encontramos una suscripción activa. Escríbanos a soporte@iurexia.com.');
            return;
        }
        setPausando(true); setAviso('');
        try {
            const r = await fetch('/api/stripe/retencion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
                body: JSON.stringify({ accion: 'pausar', subscriptionId }),
            });
            const j = await r.json();
            if (!r.ok) setAviso(j.error || 'No se pudo pausar. Escríbanos a soporte@iurexia.com.');
            else {
                setReanuda(new Date(j.reanuda).toLocaleDateString('es-MX',
                    { day: 'numeric', month: 'long', year: 'numeric' }));
                setYaPausada(true);
                setPaso('pausada');
            }
        } catch {
            setAviso('Problema de conexión. Intente de nuevo o escríbanos a soporte@iurexia.com.');
        }
        setPausando(false);
    };

    const cancelar = async () => {
        if (!subscriptionId) { setAviso('No se encontró una suscripción activa'); setPaso('error'); return; }
        setPaso('procesando');
        try {
            const r = await fetch('/api/stripe/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
                body: JSON.stringify({ subscriptionId }),
            });
            const j = await r.json();
            if (!r.ok) { setAviso(j.error || 'No pudimos procesar la cancelación.'); setPaso('error'); return; }
            setFechaFin(j.cancelAt
                ? new Date(j.cancelAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'el final de su periodo');
            setPaso('cancelada');
        } catch {
            setAviso('Problema de conexión. Su cancelación podría haberse registrado — verifíquelo en unos minutos.');
            setPaso('error');
        }
    };

    const salidaVisible = paso === 'motivo' || paso === 'oferta';

    return createPortal((
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            {/* max-h + flex: el cuerpo hace scroll y los botones nunca se salen. */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
                style={{ maxHeight: 'calc(100vh - 2rem)' }}>

                <div className="overflow-y-auto px-6 pt-6">
                    {paso === 'cargando' && (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-charcoal-400" />
                            <p className="text-sm text-charcoal-600">Consultando su suscripción…</p>
                        </div>
                    )}

                    {/* Ya canceló. Se le dice, y no se le vuelve a pedir el
                        motivo ni se le ofrece nada: eso es lo que le hizo creer
                        que no había funcionado. */}
                    {paso === 'ya_cancelada' && (
                        <div className="text-center pb-2">
                            <div className="w-14 h-14 bg-cream-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-7 h-7 text-charcoal-700" />
                            </div>
                            <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                Su cancelación ya está registrada
                            </h3>
                            <p className="text-sm text-charcoal-600 mb-5 leading-relaxed">
                                No habrá más cargos. Conserva su acceso completo
                                {nombrePlan ? <> a <strong className="text-charcoal-900">{nombrePlan}</strong></> : null}
                                {' '}hasta el <strong className="text-charcoal-900">{fechaFin}</strong>, y su cuenta,
                                sus conversaciones y sus carpetas se mantienen después.
                            </p>
                            <p className="text-sm text-charcoal-600 mb-5">
                                Si quiere reactivarla o tiene dudas, escríbanos a{' '}
                                <a href="mailto:soporte@iurexia.com" className="underline text-accent-brown">soporte@iurexia.com</a>.
                            </p>
                        </div>
                    )}

                    {paso === 'motivo' && (
                        <>
                            <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                Antes de cancelar
                            </h3>
                            <p className="text-sm text-charcoal-600 mb-4 leading-relaxed">
                                ¿Nos dice por qué se va? Es una pregunta honesta: lo que responden
                                quienes se van es lo que decide qué arreglamos.
                            </p>
                            <div className="space-y-2 mb-4">
                                {MOTIVOS.map(([clave, etiqueta]) => (
                                    <button key={clave}
                                        onClick={() => { setMotivo(clave); guardarMotivo(clave); setPaso('oferta'); }}
                                        className="w-full text-left px-4 py-2.5 rounded-lg border border-cream-400 text-sm text-charcoal-900 hover:bg-cream-100 transition-colors">
                                        {etiqueta}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {paso === 'oferta' && (
                        <>
                            {/* La pausa sólo se ofrece si de verdad se puede dar.
                                Ofrecerla a quien ya la usó devolvía un 409 —«esta
                                suscripción ya usó su pausa»— que el cliente lee
                                como un fallo nuestro cuando no hizo nada mal. */}
                            {yaPausada && (
                                <p className="text-sm text-charcoal-600 mb-4 leading-relaxed bg-cream-100 border border-cream-400 rounded-lg px-3 py-2">
                                    Su suscripción ya está <strong className="text-charcoal-900">en pausa</strong>
                                    {reanuda ? <> hasta el {reanuda}</> : null}: no se le está cobrando y conserva
                                    su acceso. Si aun así quiere cancelar, el botón sigue abajo.
                                </p>
                            )}
                            {!yaPausada && (motivo === 'precio' || motivo === 'poco_uso') && (
                                <>
                                    <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                        {motivo === 'precio' ? 'Una alternativa antes de irse' : '¿Y si lo pausamos?'}
                                    </h3>
                                    <p className="text-sm text-charcoal-600 mb-4 leading-relaxed">
                                        {motivo === 'precio' ? (
                                            <>Podemos <strong className="text-charcoal-900">pausar su suscripción un mes,
                                            sin cargo</strong>: conserva su cuenta, su historial y su acceso, y el
                                            siguiente cobro se recorre un mes completo. Si al reanudarse sigue sin
                                            convenirle, cancela entonces.</>
                                        ) : (
                                            <>Si este mes no lo va a usar, no tiene por qué pagarlo:{' '}
                                            <strong className="text-charcoal-900">pausamos un mes sin cargo</strong> y su
                                            cuenta queda intacta. La plataforma cambia rápido — esta semana entró la
                                            biblioteca doctrinal y la app móvil está a semanas de publicarse.</>
                                        )}
                                    </p>
                                    {motivo === 'precio' && (
                                        <p className="text-xs text-charcoal-500 mb-4">
                                            También existe el plan Básico en{' '}
                                            <a href="/precios" className="underline text-accent-brown">iurexia.com/precios</a>.
                                        </p>
                                    )}
                                    <button onClick={pausar} disabled={pausando}
                                        className="w-full mb-4 px-4 py-3 rounded-xl bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-800 disabled:opacity-50">
                                        {pausando ? 'Pausando…' : 'Pausar un mes sin cargo'}
                                    </button>
                                </>
                            )}

                            {motivo === 'fallo' && (
                                <>
                                    <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                        Eso es exactamente lo que queremos saber
                                    </h3>
                                    <p className="text-sm text-charcoal-600 mb-3 leading-relaxed">
                                        Se lo decimos sin rodeos: esta semana corregimos dos fallas que
                                        reportaron usuarios — citas de tesis que no correspondían al criterio, y
                                        un botón de cancelación que confirmaba mal. Se detectaron porque alguien
                                        se tomó la molestia de decirlo.
                                    </p>
                                    <p className="text-sm text-charcoal-600 mb-3 leading-relaxed">
                                        Si lo suyo fue otra cosa, cuéntenoslo.{' '}
                                        <strong className="text-charcoal-900">Lo revisa una persona, no un robot.</strong>
                                    </p>
                                </>
                            )}

                            {(motivo === 'falta_algo' || motivo === 'otro') && (
                                <>
                                    <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                        {motivo === 'falta_algo' ? '¿Qué le falta?' : 'Cuéntenos'}
                                    </h3>
                                    <p className="text-sm text-charcoal-600 mb-3 leading-relaxed">
                                        La plataforma se construye con lo que piden quienes la usan: la legislación
                                        de las 32 entidades, el bloque de constitucionalidad y la doctrina entraron
                                        así. Una línea basta.
                                    </p>
                                </>
                            )}

                            {(motivo === 'fallo' || motivo === 'falta_algo' || motivo === 'otro') && (
                                <>
                                    <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3}
                                        placeholder={motivo === 'fallo' ? '¿Qué falló? Entre más concreto, más rápido lo corregimos.' : 'Escríbalo aquí…'}
                                        className="w-full px-3 py-2 rounded-lg border border-cream-400 text-sm text-charcoal-900 mb-3" />
                                    <button
                                        onClick={() => { if (texto.trim()) { guardarMotivo(`${motivo}_detalle`, texto); setEnviado(true); } }}
                                        disabled={!texto.trim() || enviado}
                                        className="w-full mb-4 px-4 py-3 rounded-xl bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-800 disabled:opacity-50">
                                        {enviado ? 'Recibido — le escribiremos' : 'Enviar'}
                                    </button>
                                </>
                            )}

                            {aviso && (
                                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{aviso}</p>
                            )}
                        </>
                    )}

                    {paso === 'pausada' && (
                        <div className="text-center pb-2">
                            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-7 h-7 text-green-600" />
                            </div>
                            <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">Pausada</h3>
                            <p className="text-sm text-charcoal-600 mb-5 leading-relaxed">
                                Su suscripción queda en pausa: <strong className="text-charcoal-900">sin cargo este
                                mes</strong> y con su acceso intacto. Se reanuda el {reanuda}. Si para entonces
                                decide cancelar, el botón seguirá aquí mismo.
                            </p>
                        </div>
                    )}

                    {paso === 'procesando' && (
                        <div className="text-center py-6">
                            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-charcoal-400" />
                            <p className="text-sm text-charcoal-600">Procesando su cancelación…</p>
                        </div>
                    )}

                    {paso === 'cancelada' && (
                        <div className="text-center pb-2">
                            <div className="w-14 h-14 bg-cream-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-7 h-7 text-charcoal-700" />
                            </div>
                            <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">
                                Suscripción cancelada
                            </h3>
                            <p className="text-sm text-charcoal-600 mb-5 leading-relaxed">
                                No se generarán más cargos. Conserva su acceso completo hasta el{' '}
                                <strong className="text-charcoal-900">{fechaFin}</strong>, y su cuenta e historial
                                se mantienen. Si más adelante quiere volver, entra con el mismo correo y nada se
                                habrá perdido.
                            </p>
                            <p className="text-sm text-charcoal-600 mb-5">Gracias por el tiempo que confió en nosotros.</p>
                        </div>
                    )}

                    {paso === 'error' && (
                        <div className="text-center pb-2">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="font-serif text-2xl font-medium text-charcoal-900 mb-2">No pudimos completarlo</h3>
                            <p className="text-sm text-charcoal-600 mb-5 leading-relaxed">{aviso}</p>
                            <p className="text-sm text-charcoal-600 mb-5">
                                Escríbanos a <a href="mailto:soporte@iurexia.com" className="underline text-accent-brown">soporte@iurexia.com</a>{' '}
                                y lo resolvemos nosotros el mismo día.
                            </p>
                        </div>
                    )}
                </div>

                {/* Pie fijo: nunca se sale de la pantalla, pase lo que pase arriba. */}
                <div className="px-6 py-4 border-t border-cream-300 bg-white rounded-b-2xl">
                    {salidaVisible ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={cerrar}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-charcoal-700 rounded-xl hover:bg-cream-100 transition-colors">
                                Conservar mi plan
                            </button>
                            <button onClick={cancelar}
                                className="flex-1 px-4 py-2.5 text-sm border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors">
                                Cancelar de todas formas
                            </button>
                        </div>
                    ) : (
                        <button onClick={cerrar}
                            className="w-full px-4 py-2.5 rounded-xl bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-800">
                            Entendido
                        </button>
                    )}
                </div>
            </div>
        </div>
    ), document.body);
}
