'use client';

/**
 * Soporte de Iurexia: de buzón a conversación.
 *
 * Antes esto era un formulario que guardaba el mensaje y no respondía nada.
 * Entre los 91 reportes reales hay gente escribiendo «nadie me responde» y
 * «llevo días esperando»: creían que había alguien leyendo en vivo. Ahora lo
 * hay —contesta al instante y, si no puede, escala al equipo con la
 * conversación entera.
 *
 * Y no estorba: la burbuja se arrastra a donde el usuario quiera (se recuerda
 * el sitio), se pliega a un punto discreto y se puede ocultar del todo por lo
 * que queda de la visita.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Minus, EyeOff, GripHorizontal } from 'lucide-react';

interface FeedbackWidgetProps {
    userId?: string;
    userEmail?: string;
    userName?: string;
    plan?: string;
}

interface Turno { rol: 'usuario' | 'soporte'; texto: string }

const CLAVE_POSICION = 'iurexia-soporte-pos';
const CLAVE_OCULTO = 'iurexia-soporte-oculto';
const SALUDO =
    'Hola. Soy de soporte de Iurexia. Cuénteme qué está fallando y lo vemos ahora mismo.';

export default function FeedbackWidget({ userId, userEmail, userName, plan }: FeedbackWidgetProps) {
    const [abierto, setAbierto] = useState(false);
    const [oculto, setOculto] = useState(false);
    const [turnos, setTurnos] = useState<Turno[]>([{ rol: 'soporte', texto: SALUDO }]);
    const [texto, setTexto] = useState('');
    const [pensando, setPensando] = useState(false);
    const [cerrado, setCerrado] = useState(false);

    // Posición de la burbuja: derecha/abajo en píxeles desde la esquina.
    const [pos, setPos] = useState({ derecha: 24, abajo: 24 });
    const arrastre = useRef<{ x: number; y: number; d: number; b: number } | null>(null);
    const [arrastrando, setArrastrando] = useState(false);

    const finRef = useRef<HTMLDivElement>(null);
    const entradaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        try {
            if (sessionStorage.getItem(CLAVE_OCULTO) === '1') setOculto(true);
            const g = localStorage.getItem(CLAVE_POSICION);
            if (g) {
                const p = JSON.parse(g);
                if (typeof p.derecha === 'number' && typeof p.abajo === 'number') setPos(p);
            }
        } catch { }
    }, []);

    useEffect(() => {
        finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [turnos, pensando]);

    useEffect(() => {
        if (abierto) setTimeout(() => entradaRef.current?.focus(), 250);
    }, [abierto]);

    // ── Arrastre de la burbuja ────────────────────────────────────────
    // Se mide contra la ventana y se recorta a los bordes: no puede quedar
    // fuera de la pantalla ni tapando el borde del navegador.
    const alMover = useCallback((e: PointerEvent) => {
        if (!arrastre.current) return;
        const dx = arrastre.current.x - e.clientX;
        const dy = arrastre.current.y - e.clientY;
        setPos({
            derecha: Math.min(Math.max(arrastre.current.d + dx, 8), window.innerWidth - 80),
            abajo: Math.min(Math.max(arrastre.current.b + dy, 8), window.innerHeight - 80),
        });
    }, []);

    const alSoltar = useCallback(() => {
        arrastre.current = null;
        setArrastrando(false);
        window.removeEventListener('pointermove', alMover);
        window.removeEventListener('pointerup', alSoltar);
        setPos(p => {
            try { localStorage.setItem(CLAVE_POSICION, JSON.stringify(p)); } catch { }
            return p;
        });
    }, [alMover]);

    const empezarArrastre = (e: React.PointerEvent) => {
        arrastre.current = { x: e.clientX, y: e.clientY, d: pos.derecha, b: pos.abajo };
        setArrastrando(true);
        window.addEventListener('pointermove', alMover);
        window.addEventListener('pointerup', alSoltar);
    };

    const ocultar = () => {
        setOculto(true);
        setAbierto(false);
        try { sessionStorage.setItem(CLAVE_OCULTO, '1'); } catch { }
    };

    const enviar = async () => {
        const limpio = texto.trim();
        if (!limpio || pensando || cerrado) return;

        const nuevos: Turno[] = [...turnos, { rol: 'usuario', texto: limpio }];
        setTurnos(nuevos);
        setTexto('');
        setPensando(true);

        try {
            const r = await fetch('/api/soporte/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversacion: nuevos,
                    userId, email: userEmail, nombre: userName, plan,
                }),
            });
            const d = await r.json();
            setTurnos(t => [...t, { rol: 'soporte', texto: d.respuesta || 'No pude responder ahora.' }]);
            if (d.cerrado) setCerrado(true);
        } catch {
            setTurnos(t => [...t, {
                rol: 'soporte',
                texto: 'Se cortó la conexión. Escríbanos a soporte@iurexia.com y lo atendemos por ahí.',
            }]);
            setCerrado(true);
        } finally {
            setPensando(false);
        }
    };

    if (oculto) return null;

    return (
        <>
            {/* ── Burbuja ─────────────────────────────────────────────── */}
            {!abierto && (
                <div
                    className="fixed z-[90] flex flex-col items-center gap-1.5"
                    style={{ right: pos.derecha, bottom: pos.abajo }}
                >
                    {/* Asa de arrastre: sólo aparece al acercar el cursor, para
                        no ensuciar la pantalla cuando no se usa. */}
                    <button
                        onPointerDown={empezarArrastre}
                        aria-label="Mover el botón de soporte"
                        title="Arrastre para moverlo"
                        className="opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
                        style={{ cursor: arrastrando ? 'grabbing' : 'grab', touchAction: 'none' }}
                    >
                        <GripHorizontal className="h-4 w-4" style={{ color: 'rgba(26,26,26,0.35)' }} />
                    </button>

                    <div className="group relative">
                        <button
                            onClick={() => setAbierto(true)}
                            aria-label="Soporte de Iurexia"
                            className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, #2a2a2c 0%, #1a1a1a 100%)',
                                border: '1px solid rgba(201,169,98,0.35)',
                            }}
                        >
                            <MessageCircle className="h-5 w-5" style={{ color: '#c9a962' }} />
                        </button>

                        {/* Ocultar del todo por esta visita. */}
                        <button
                            onClick={ocultar}
                            aria-label="Ocultar soporte"
                            title="Ocultar hasta que recargue"
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.18)' }}
                        >
                            <EyeOff className="h-2.5 w-2.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Panel ───────────────────────────────────────────────── */}
            {abierto && (
                <div
                    className="fixed z-[90] flex flex-col overflow-hidden rounded-2xl shadow-2xl"
                    style={{
                        right: Math.min(pos.derecha, 24),
                        bottom: Math.min(pos.abajo, 24),
                        width: 'min(380px, calc(100vw - 32px))',
                        height: 'min(560px, calc(100vh - 100px))',
                        background: 'linear-gradient(180deg, #1c1c1e 0%, #141415 100%)',
                        border: '1px solid rgba(201,169,98,0.28)',
                    }}
                >
                    {/* Cabecera */}
                    <div
                        className="flex flex-shrink-0 items-center gap-3 px-4 py-3"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        <span
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
                            style={{ background: 'linear-gradient(135deg,#c9a962,#8b7355)', color: '#1a1a1a' }}
                        >
                            I
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[0.9375rem] font-semibold leading-tight text-white">Soporte Iurexia</p>
                            <p className="text-[0.6875rem]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {pensando ? 'Escribiendo…' : 'Le respondemos al momento'}
                            </p>
                        </div>
                        <button onClick={() => setAbierto(false)} aria-label="Minimizar"
                            className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                            style={{ color: 'rgba(255,255,255,0.45)' }}>
                            <Minus className="h-4 w-4" />
                        </button>
                        <button onClick={ocultar} aria-label="Cerrar"
                            className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                            style={{ color: 'rgba(255,255,255,0.45)' }}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Conversación */}
                    <div className="sidebar-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
                        {turnos.map((t, i) => (
                            <div key={i} className={`flex ${t.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.8125rem] leading-relaxed"
                                    style={t.rol === 'usuario'
                                        ? { background: 'rgba(201,169,98,0.16)', color: '#f0e9da', borderBottomRightRadius: 6 }
                                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.88)', borderBottomLeftRadius: 6 }}
                                >
                                    {t.texto}
                                </div>
                            </div>
                        ))}
                        {pensando && (
                            <div className="flex justify-start">
                                <div className="flex gap-1 rounded-2xl px-3.5 py-3"
                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className="h-1.5 w-1.5 rounded-full"
                                            style={{
                                                background: 'rgba(255,255,255,0.45)',
                                                animation: `typing 1.4s ${i * 0.2}s infinite`,
                                            }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={finRef} />
                    </div>

                    {/* Entrada */}
                    <div className="flex-shrink-0 px-3 pb-3">
                        {cerrado ? (
                            <p className="rounded-xl px-3.5 py-3 text-center text-[0.75rem] leading-relaxed"
                                style={{ background: 'rgba(201,169,98,0.10)', color: 'rgba(255,255,255,0.65)' }}>
                                Su caso ya está con el equipo. Le escribirán a{' '}
                                <span style={{ color: '#c9a962' }}>{userEmail || 'su correo'}</span>.
                            </p>
                        ) : (
                            <div className="flex items-end gap-2 rounded-xl p-2"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                <textarea
                                    ref={entradaRef}
                                    value={texto}
                                    onChange={e => setTexto(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
                                    }}
                                    rows={1}
                                    placeholder="Cuéntenos qué ocurre…"
                                    maxLength={2000}
                                    className="max-h-24 flex-1 resize-none bg-transparent px-1.5 py-1 text-[0.8125rem] outline-none"
                                    style={{ color: 'rgba(255,255,255,0.9)' }}
                                />
                                <button
                                    onClick={enviar}
                                    disabled={!texto.trim() || pensando}
                                    aria-label="Enviar"
                                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-30"
                                    style={{ background: 'linear-gradient(135deg,#c9a962,#8b7355)' }}
                                >
                                    <Send className="h-3.5 w-3.5" style={{ color: '#1a1a1a' }} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
