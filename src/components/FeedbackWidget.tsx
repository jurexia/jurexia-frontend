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
 * Y no estorba: el botón se arrastra a donde el usuario quiera y recuerda el
 * sitio. Pero NUNCA desaparece —cerrar sólo repliega el panel—, porque tras
 * escalar un caso el abogado se quedaba sin canal para la siguiente duda.
 *
 * MOVIBLE DE VERDAD (7-oct-2026). David: «el botón de soporte hazlo movible».
 * Ya se podía mover, pero por un asa INVISIBLE hasta pasar el ratón encima: en
 * el teléfono no existía y en la computadora nadie la encontraba. Ahora se
 * arrastra el propio botón —con el dedo o con el ratón—; un toque sin moverlo
 * lo abre. El panel se abre del lado en el que está el botón y también se
 * arrastra por su cabecera. Y, como la barra del chat, sin iconos: el botón
 * dice «Soporte» y los controles dicen lo que hacen.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface FeedbackWidgetProps {
    userId?: string;
    userEmail?: string;
    userName?: string;
    plan?: string;
}

interface Turno { rol: 'usuario' | 'soporte'; texto: string }

const CLAVE_POSICION = 'iurexia-soporte-pos';
const SALUDO =
    'Hola. Soy de soporte de Iurexia. Cuénteme qué está fallando y lo vemos ahora mismo.';

export default function FeedbackWidget({ userId, userEmail, userName, plan }: FeedbackWidgetProps) {
    const [abierto, setAbierto] = useState(false);
    const [turnos, setTurnos] = useState<Turno[]>([{ rol: 'soporte', texto: SALUDO }]);
    const [texto, setTexto] = useState('');
    const [pensando, setPensando] = useState(false);
    const [cerrado, setCerrado] = useState(false);

    // Posición del botón: su esquina inferior derecha, en píxeles desde la
    // esquina inferior derecha de la ventana. Se guarda igual que antes, así
    // que quien ya lo había movido lo encuentra donde lo dejó.
    const [pos, setPos] = useState({ derecha: 24, abajo: 24 });
    const posRef = useRef(pos);
    posRef.current = pos;
    const arrastre = useRef<{ x: number; y: number; d: number; b: number; movido: boolean } | null>(null);
    const suprimirClic = useRef(false);
    const [arrastrando, setArrastrando] = useState(false);
    const [ventana, setVentana] = useState({ ancho: 1280, alto: 800 });
    const botonRef = useRef<HTMLButtonElement>(null);
    // La última medida del botón: con el panel abierto el botón no está
    // montado, y el panel necesita saber dónde estaba y cuánto medía.
    const tamBoton = useRef({ ancho: 104, alto: 40 });

    const finRef = useRef<HTMLDivElement>(null);
    const entradaRef = useRef<HTMLTextAreaElement>(null);

    /* Nunca fuera de la pantalla: se recorta a 8 px de cada borde, con la
       medida real del botón. */
    const recortar = useCallback((p: { derecha: number; abajo: number }) => {
        const r = botonRef.current?.getBoundingClientRect();
        if (r && r.width) tamBoton.current = { ancho: r.width, alto: r.height };
        const { ancho, alto } = tamBoton.current;
        return {
            derecha: Math.round(Math.min(Math.max(p.derecha, 8), window.innerWidth - ancho - 8)),
            abajo: Math.round(Math.min(Math.max(p.abajo, 8), window.innerHeight - alto - 8)),
        };
    }, []);

    useEffect(() => {
        try {
            const g = localStorage.getItem(CLAVE_POSICION);
            if (g) {
                const p = JSON.parse(g);
                if (typeof p.derecha === 'number' && typeof p.abajo === 'number') setPos(recortar(p));
            }
        } catch { }
        const medir = () => {
            setVentana({ ancho: window.innerWidth, alto: window.innerHeight });
            setPos(p => recortar(p));
        };
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    }, [recortar]);

    useEffect(() => {
        finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [turnos, pensando]);

    useEffect(() => {
        if (abierto) setTimeout(() => entradaRef.current?.focus(), 250);
    }, [abierto]);

    // ── Arrastre: del botón y de la cabecera del panel ────────────────
    // Hasta que el puntero se mueve 4 px no es arrastre, es un toque; así el
    // clic sigue abriendo el panel y un pulso tembloroso no lo mueve.
    const alPresionar = (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        if (e.currentTarget.tagName !== 'BUTTON' && (e.target as HTMLElement).closest('button, textarea')) return;
        arrastre.current = { x: e.clientX, y: e.clientY, d: posRef.current.derecha, b: posRef.current.abajo, movido: false };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
    };
    const alArrastrar = (e: React.PointerEvent<HTMLElement>) => {
        const a = arrastre.current;
        if (!a) return;
        const dx = a.x - e.clientX;
        const dy = a.y - e.clientY;
        if (!a.movido && Math.hypot(dx, dy) < 4) return;
        if (!a.movido) { a.movido = true; setArrastrando(true); }
        setPos(recortar({ derecha: a.d + dx, abajo: a.b + dy }));
    };
    const alSoltar = (e: React.PointerEvent<HTMLElement>) => {
        const a = arrastre.current;
        arrastre.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { }
        if (!a?.movido) return;
        suprimirClic.current = true;
        setArrastrando(false);
        try { localStorage.setItem(CLAVE_POSICION, JSON.stringify(posRef.current)); } catch { }
    };
    const alPulsarBoton = () => {
        if (suprimirClic.current) { suprimirClic.current = false; return; }
        const r = botonRef.current?.getBoundingClientRect();
        if (r && r.width) tamBoton.current = { ancho: r.width, alto: r.height };
        setAbierto(true);
    };

    /* El panel se abre del lado del botón: si el botón está a la izquierda,
       el panel crece hacia la derecha; si está arriba, hacia abajo. Y siempre
       dentro de la ventana, a 16 px de los bordes. */
    const anchoPanel = Math.min(380, ventana.ancho - 32);
    const altoPanel = Math.min(560, ventana.alto - 100);
    const derechaBoton = ventana.ancho - pos.derecha;
    const pieBoton = ventana.alto - pos.abajo;
    const anchoBoton = tamBoton.current.ancho;
    const altoBoton = tamBoton.current.alto;
    const izquierdaPanel = derechaBoton - anchoBoton / 2 > ventana.ancho / 2 ? derechaBoton - anchoPanel : derechaBoton - anchoBoton;
    const arribaPanel = pieBoton - altoBoton / 2 > ventana.alto / 2 ? pieBoton - altoPanel : pieBoton - altoBoton;
    const panel = {
        left: Math.min(Math.max(izquierdaPanel, 16), Math.max(16, ventana.ancho - anchoPanel - 16)),
        top: Math.min(Math.max(arribaPanel, 16), Math.max(16, ventana.alto - altoPanel - 16)),
    };

    /* El botón NUNCA desaparece. Antes podía ocultarse por toda la visita y,
       tras escalar un caso, el abogado se quedaba sin canal: ni podía volver a
       preguntar ni sabía cómo recuperarlo. Cerrar sólo repliega el panel. */
    const reiniciar = () => {
        setTurnos([{ rol: 'soporte', texto: SALUDO }]);
        setTexto('');
        setCerrado(false);
        setTimeout(() => entradaRef.current?.focus(), 100);
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

    return (
        <>
            {/* ── El botón ─────────────────────────────────────────────── */}
            {!abierto && (
                <button
                    ref={botonRef}
                    onPointerDown={alPresionar}
                    onPointerMove={alArrastrar}
                    onPointerUp={alSoltar}
                    onPointerCancel={alSoltar}
                    onClick={alPulsarBoton}
                    aria-label="Soporte de Iurexia (se puede arrastrar)"
                    title="Soporte — arrástrelo para moverlo"
                    className="soporte-boton fixed z-[90]"
                    data-arrastrando={arrastrando ? 'si' : undefined}
                    style={{ right: pos.derecha, bottom: pos.abajo, touchAction: 'none' }}
                >
                    Soporte
                </button>
            )}

            {/* ── Panel ───────────────────────────────────────────────── */}
            {abierto && (
                <div
                    className="fixed z-[90] flex flex-col overflow-hidden rounded-2xl shadow-2xl"
                    style={{
                        left: panel.left,
                        top: panel.top,
                        width: anchoPanel,
                        height: altoPanel,
                        background: 'linear-gradient(180deg, #1c1c1e 0%, #141415 100%)',
                        border: '1px solid rgba(201,169,98,0.28)',
                    }}
                >
                    {/* Cabecera: también es el asa para mover el panel */}
                    <div
                        onPointerDown={alPresionar}
                        onPointerMove={alArrastrar}
                        onPointerUp={alSoltar}
                        onPointerCancel={alSoltar}
                        title="Arrastre para mover el panel"
                        className="flex flex-shrink-0 select-none items-center gap-3 px-4 py-3"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: arrastrando ? 'grabbing' : 'grab', touchAction: 'none' }}
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
                        {turnos.length > 1 && (
                            <button onClick={reiniciar}
                                title="Empezar una consulta nueva"
                                className="soporte-control">
                                Nueva
                            </button>
                        )}
                        <button onClick={() => setAbierto(false)}
                            title="Replegar (el botón sigue disponible)"
                            className="soporte-control">
                            Cerrar
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
                            /* Escalar no puede ser un callejón sin salida: el
                               abogado suele tener otra duda distinta, y antes se
                               quedaba con la caja bloqueada y sin forma de
                               volver a empezar. */
                            <div className="rounded-xl px-3.5 py-3 text-center"
                                style={{ background: 'rgba(201,169,98,0.10)' }}>
                                <p className="text-[0.75rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                    Su caso ya está con el equipo. Le escribirán a{' '}
                                    <span style={{ color: '#c9a962' }}>{userEmail || 'su correo'}</span>.
                                </p>
                                <button onClick={reiniciar} className="soporte-control mt-2.5">
                                    Tengo otra consulta
                                </button>
                            </div>
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
                                    className="soporte-enviar"
                                >
                                    Enviar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
