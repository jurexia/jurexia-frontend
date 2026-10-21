'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MapPin, Check, ArrowRight, X } from 'lucide-react';
import { ESTADOS_SOLO, getEstadoLabel } from '@/lib/estados';
import { updateUserEstado } from '@/lib/supabase';

interface WelcomeExperienceProps {
    userId: string;
    userName?: string;
    onComplete: (estado: string) => void;
    onStartTour?: () => void;
    /** El estado probable según la IP (ver /api/region): llega ya marcado. */
    estadoSugerido?: string | null;
    /** La consulta que espera esta respuesta para salir. */
    pregunta?: string;
}

/* LA PRIMERA CONSULTA NO SE DETIENE AQUÍ (20-oct-2026). Esta ventana sale justo
   cuando la cuenta nueva manda su primera pregunta. Llega con el estado probable
   marcado —un toque en «Continuar con …»—, enseña la pregunta que va a salir y,
   con ese estado ya marcado o en un teléfono, no abre el teclado del buscador:
   el teclado tapaba la mitad de la ventana, justo el botón de seguir. */
export default function WelcomeExperience({ userId, userName, onComplete, estadoSugerido, pregunta }: WelcomeExperienceProps) {
    const [selectedEstado, setSelectedEstado] = useState(estadoSugerido || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const marcadoRef = useRef<HTMLButtonElement | null>(null);
    const [tactil] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);

    // La sugerencia puede llegar con la ventana ya abierta: sólo se marca si
    // el usuario no ha elegido nada todavía.
    useEffect(() => {
        if (estadoSugerido) setSelectedEstado(prev => prev || estadoSugerido);
    }, [estadoSugerido]);

    // El estado marcado, a la vista dentro de la rejilla (que tiene su propio scroll).
    useEffect(() => {
        marcadoRef.current?.scrollIntoView({ block: 'nearest' });
    }, [estadoSugerido]);

    const firstName = userName?.split(' ')[0] || '';

    const filteredEstados = ESTADOS_SOLO.filter(e =>
        e.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirm = useCallback(async () => {
        if (!selectedEstado) return;
        setSaving(true);
        try {
            await updateUserEstado(userId, selectedEstado);
        } catch (err) {
            console.error('Error saving estado:', err);
        } finally {
            setSaving(false);
            onComplete(selectedEstado);
        }
    }, [selectedEstado, userId, onComplete]);

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center px-4"
            style={{ animation: 'welcomeFadeIn 0.3s ease-out' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md"
                style={{
                    background: 'linear-gradient(160deg, #1c1c1e 0%, #111 100%)',
                    borderRadius: 20,
                    border: '1px solid rgba(201,169,98,0.15)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                    overflow: 'hidden',
                }}
            >
                {/* Gold accent line */}
                <div style={{
                    height: 3,
                    background: 'linear-gradient(90deg, #c9a962, #e8c56d, #c9a962)',
                }} />

                <div style={{ padding: '28px 24px 24px' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'rgba(201,169,98,0.1)',
                            border: '1px solid rgba(201,169,98,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 14px',
                        }}>
                            <MapPin size={20} style={{ color: '#c9a962' }} />
                        </div>
                        <h2 style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: 20, fontWeight: 600, color: '#fff',
                            marginBottom: 6,
                        }}>
                            {firstName ? `${firstName}, ¿desde qué estado ejerces?` : '¿Desde qué estado ejerces?'}
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5 }}>
                            Así tus consultas priorizarán tu legislación local
                        </p>
                        {pregunta && (
                            <div style={{
                                marginTop: 14, padding: '9px 12px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                textAlign: 'left',
                            }}>
                                {/* El recorte va en el párrafo, no en la caja: con el
                                    relleno dentro, el tercer renglón asomaba a medias. */}
                                <p style={{
                                    color: 'rgba(255,255,255,0.72)', fontSize: 12.5, lineHeight: 1.45,
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Tu consulta sale al continuar: </span>
                                    {pregunta}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                        <MapPin size={13} style={{
                            position: 'absolute', left: 12, top: '50%',
                            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)',
                        }} />
                        <input
                            type="text"
                            placeholder="Buscar estado..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus={!selectedEstado && !tactil}
                            style={{
                                width: '100%', padding: '9px 14px 9px 32px',
                                borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)', color: '#fff',
                                fontSize: 13, outline: 'none',
                            }}
                        />
                    </div>

                    {/* States grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 5,
                        overflowY: 'auto',
                        maxHeight: '38vh',
                        padding: '2px 0',
                    }}>
                        {filteredEstados.map(estado => (
                            <button
                                key={estado.value}
                                ref={estado.value === selectedEstado ? marcadoRef : undefined}
                                onClick={() => setSelectedEstado(estado.value)}
                                style={{
                                    padding: '7px 8px',
                                    borderRadius: 8,
                                    border: selectedEstado === estado.value
                                        ? '1px solid #c9a962'
                                        : '1px solid rgba(255,255,255,0.06)',
                                    background: selectedEstado === estado.value
                                        ? 'rgba(201,169,98,0.12)'
                                        : 'rgba(255,255,255,0.02)',
                                    color: selectedEstado === estado.value ? '#c9a962' : 'rgba(255,255,255,0.65)',
                                    fontSize: 11.5,
                                    fontWeight: selectedEstado === estado.value ? 600 : 400,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    transition: 'all 0.12s ease',
                                }}
                            >
                                <span style={{ flex: 1 }}>{estado.label}</span>
                                {selectedEstado === estado.value && <Check size={12} />}
                            </button>
                        ))}
                    </div>

                    {/* Confirm */}
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedEstado || saving}
                        style={{
                            marginTop: 16,
                            width: '100%',
                            padding: '12px',
                            borderRadius: 12,
                            border: 'none',
                            cursor: selectedEstado ? 'pointer' : 'default',
                            fontSize: 14,
                            fontWeight: 700,
                            color: selectedEstado ? '#0f0f0f' : 'rgba(255,255,255,0.25)',
                            background: selectedEstado
                                ? 'linear-gradient(135deg, #c9a962 0%, #a8883e 100%)'
                                : 'rgba(255,255,255,0.05)',
                            boxShadow: selectedEstado ? '0 4px 16px rgba(201,169,98,0.3)' : 'none',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        {saving ? 'Guardando...' : selectedEstado
                            ? `Continuar con ${getEstadoLabel(selectedEstado)}`
                            : 'Selecciona tu estado para continuar'}
                        {selectedEstado && !saving && <ArrowRight size={15} />}
                    </button>

                    <p style={{
                        textAlign: 'center', color: 'rgba(255,255,255,0.2)',
                        fontSize: 10.5, marginTop: 10,
                    }}>
                        Puedes cambiar de estado en cualquier momento desde el menú
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes welcomeFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
