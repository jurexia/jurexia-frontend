'use client';

import { useState } from 'react';
import {
    Search, MapPin, Shield, Star, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Navbar from '@/components/Navbar';

// Mexican states for filter
const ESTADOS = [
    { value: '', label: 'Todos los estados' },
    { value: 'AGUASCALIENTES', label: 'Aguascalientes' },
    { value: 'BAJA_CALIFORNIA', label: 'Baja California' },
    { value: 'BAJA_CALIFORNIA_SUR', label: 'Baja California Sur' },
    { value: 'CAMPECHE', label: 'Campeche' },
    { value: 'CHIAPAS', label: 'Chiapas' },
    { value: 'CHIHUAHUA', label: 'Chihuahua' },
    { value: 'CIUDAD_DE_MEXICO', label: 'Ciudad de México' },
    { value: 'COAHUILA', label: 'Coahuila' },
    { value: 'COLIMA', label: 'Colima' },
    { value: 'DURANGO', label: 'Durango' },
    { value: 'GUANAJUATO', label: 'Guanajuato' },
    { value: 'GUERRERO', label: 'Guerrero' },
    { value: 'HIDALGO', label: 'Hidalgo' },
    { value: 'JALISCO', label: 'Jalisco' },
    { value: 'MEXICO', label: 'Estado de México' },
    { value: 'MICHOACAN', label: 'Michoacán' },
    { value: 'MORELOS', label: 'Morelos' },
    { value: 'NAYARIT', label: 'Nayarit' },
    { value: 'NUEVO_LEON', label: 'Nuevo León' },
    { value: 'OAXACA', label: 'Oaxaca' },
    { value: 'PUEBLA', label: 'Puebla' },
    { value: 'QUERETARO', label: 'Querétaro' },
    { value: 'QUINTANA_ROO', label: 'Quintana Roo' },
    { value: 'SAN_LUIS_POTOSI', label: 'San Luis Potosí' },
    { value: 'SINALOA', label: 'Sinaloa' },
    { value: 'SONORA', label: 'Sonora' },
    { value: 'TABASCO', label: 'Tabasco' },
    { value: 'TAMAULIPAS', label: 'Tamaulipas' },
    { value: 'TLAXCALA', label: 'Tlaxcala' },
    { value: 'VERACRUZ', label: 'Veracruz' },
    { value: 'YUCATAN', label: 'Yucatán' },
    { value: 'ZACATECAS', label: 'Zacatecas' },
];

export default function ConnectPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');

    const handleSearch = () => {
        if (!user) {
            router.push('/login?redirect=/connect');
            return;
        }
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (selectedEstado) params.set('estado', selectedEstado);
        router.push(`/connect/resultados?${params.toString()}`);
    };

    return (
        <div style={{ backgroundColor: '#0A0A0A', minHeight: '100vh', color: '#f5f5f5', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <Navbar />

            {/* ── Hero Section ── */}
            <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '140px', paddingBottom: '60px', textAlign: 'center', background: 'linear-gradient(180deg, #0A0A0A 0%, #0d1117 50%, #0A0A0A 100%)' }}>
                {/* Blue glow */}
                <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '9999px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)', marginBottom: '32px' }}>
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#60A5FA', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Directorio legítimo y protegido</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 700, lineHeight: 1.15, marginBottom: '24px', fontFamily: 'Georgia, serif' }}>
                        <span style={{ color: '#E5E5E5' }}>La justicia exige seriedad.</span><br />
                        <span style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Encuentra representación real.</span>
                    </h1>

                    <p style={{ fontSize: '1.1rem', color: '#888', maxWidth: '640px', margin: '0 auto 40px', lineHeight: 1.7 }}>
                        La libertad, la salud y el patrimonio no son un juego. Nuestra IA te conecta <strong style={{ color: '#D4AF37' }}>gratuitamente</strong> con abogados cuyas cédulas han sido rigurosamente verificadas.
                    </p>

                    {/* Search Bar Box */}
                    <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Ej: Necesito revisar un contrato de renta..."
                                    style={{ width: '100%', paddingLeft: '48px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px', background: '#0F0F0F', border: '1px solid #333', borderRadius: '16px', color: '#fff', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#333'}
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 32px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', borderRadius: '16px', fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s', minHeight: '56px', border: 'none' }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                <Search className="w-4 h-4" />
                                <span>Buscar Abogado</span>
                            </button>
                        </div>
                    </div>

                    {/* Estado Selector — horizontal scrollable pills */}
                    <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '8px',
                                    overflowX: 'auto',
                                    paddingBottom: '8px',
                                    paddingTop: '4px',
                                    WebkitOverflowScrolling: 'touch',
                                }}
                                className="hide-scrollbar"
                            >
                                {ESTADOS.map(estado => (
                                    <button
                                        key={estado.value}
                                        onClick={() => setSelectedEstado(estado.value)}
                                        style={{
                                            whiteSpace: 'nowrap',
                                            padding: '6px 14px',
                                            borderRadius: '9999px',
                                            fontSize: '0.8rem',
                                            fontWeight: selectedEstado === estado.value ? 600 : 400,
                                            background: selectedEstado === estado.value ? '#2563EB' : 'transparent',
                                            color: selectedEstado === estado.value ? '#fff' : '#999',
                                            border: selectedEstado === estado.value ? '1px solid #2563EB' : '1px solid #333',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            flexShrink: 0,
                                        }}
                                        onMouseOver={(e) => {
                                            if (selectedEstado !== estado.value) {
                                                e.currentTarget.style.borderColor = '#555';
                                                e.currentTarget.style.color = '#ddd';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (selectedEstado !== estado.value) {
                                                e.currentTarget.style.borderColor = '#333';
                                                e.currentTarget.style.color = '#999';
                                            }
                                        }}
                                    >
                                        {estado.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick examples */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '24px' }}>
                        {['Despido sin finiquito', 'Convenio de divorcio', 'Robaron mi negocio', 'Problemas con el SAT'].map((example) => (
                            <button
                                key={example}
                                onClick={() => setSearchQuery(example)}
                                style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#111', border: '1px solid #333', borderRadius: '9999px', color: '#888', transition: 'all 0.2s', cursor: 'pointer' }}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hide scrollbar CSS */}
            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Value Proposition Section */}
            <section style={{ padding: '40px 24px', background: '#111111', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '12px', borderRadius: '12px', color: '#EF4444' }}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFF', marginBottom: '8px' }}>Cero Engaños</h3>
                            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>La representación legal no se simula. Protegemos a los usuarios listando únicamente abogados que han demostrado documentalmente su cédula y trayectoria.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px', color: '#3B82F6' }}>
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFF', marginBottom: '8px' }}>Matching de Especialidad</h3>
                            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>Nuestra IA lee tu caso y no busca palabras clave al azar. Encuentra al abogado que por su bio y perfil estadístico tiene la experiencia que requieres.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '12px', borderRadius: '12px', color: '#D4AF37' }}>
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFF', marginBottom: '8px' }}>Calificación Directa</h3>
                            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.5 }}>El sistema se alimenta de reseñas reales. Podrás calificar la honestidad, primer acercamiento y el costo ofrecido por el abogado.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
