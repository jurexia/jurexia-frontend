'use client';

import { useState, useEffect } from 'react';
import {
    Search, MapPin, ChevronDown, Check, ArrowLeft, Shield
} from 'lucide-react';
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

export default function ConnectBuscarPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');
    const [showEstados, setShowEstados] = useState(false);
    const selectedEstadoLabel = ESTADOS.find(e => e.value === selectedEstado)?.label || 'Todos los estados';

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?redirect=/connect/buscar');
        }
    }, [user, loading, router]);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (selectedEstado) params.set('estado', selectedEstado);
        router.push(`/connect/resultados?${params.toString()}`);
    };

    // Show nothing while checking auth
    if (loading || !user) {
        return (
            <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#666', fontSize: '1rem' }}>Verificando acceso...</div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f5f5f5', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <Navbar />

            <section style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                paddingTop: '100px',
                paddingBottom: '60px',
                position: 'relative',
                background: 'linear-gradient(180deg, #0a0a0a 0%, #0d1117 50%, #0a0a0a 100%)',
            }}>
                {/* Subtle background glow */}
                <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1, width: '100%' }}>

                    {/* Back button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '40px' }}>
                        <button
                            onClick={() => router.push('/connect')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', transition: 'color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#888'}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver
                        </button>
                    </div>

                    {/* Branding — Iurexia Connect */}
                    <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '16px', fontFamily: 'Georgia, serif' }}>
                        <span style={{ color: '#d4af37' }}>Iurexia</span>{' '}
                        <span style={{ color: '#60a5fa' }}>Connect</span>
                    </h1>

                    <p style={{ fontSize: '1.1rem', color: '#888', marginBottom: '48px', lineHeight: 1.6 }}>
                        Describe tu situación legal y te conectaremos con el abogado ideal.
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
                                    style={{ width: '100%', paddingLeft: '48px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px', background: '#0F0F0F', border: '1px solid #333', borderRadius: '16px', color: '#fff', outline: 'none', transition: 'border-color 0.2s', fontSize: '1rem' }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#333'}
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 32px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', borderRadius: '16px', fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s', minHeight: '56px', border: 'none', fontSize: '1rem' }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                <Search className="w-5 h-5" />
                                <span>Buscar Abogado</span>
                            </button>
                        </div>
                    </div>

                    {/* Estado Selector — toggle button + grid panel */}
                    <div style={{ maxWidth: '800px', margin: '16px auto 0', position: 'relative' }}>
                        <button
                            onClick={() => setShowEstados(!showEstados)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px', borderRadius: '12px',
                                background: selectedEstado ? '#1e3a5f' : '#181818',
                                border: selectedEstado ? '1px solid #2563EB' : '1px solid #333',
                                color: selectedEstado ? '#93c5fd' : '#aaa',
                                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#ddd'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = selectedEstado ? '#2563EB' : '#333'; e.currentTarget.style.color = selectedEstado ? '#93c5fd' : '#aaa'; }}
                        >
                            <MapPin className="w-4 h-4" />
                            <span>{selectedEstadoLabel}</span>
                            <ChevronDown className="w-4 h-4" style={{ transform: showEstados ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>

                        {showEstados && (
                            <div style={{
                                marginTop: '12px', padding: '16px', background: '#111',
                                border: '1px solid #333', borderRadius: '16px',
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px',
                                textAlign: 'left'
                            }}>
                                {ESTADOS.map(estado => (
                                    <button
                                        key={estado.value}
                                        onClick={() => { setSelectedEstado(estado.value); setShowEstados(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '8px 12px', borderRadius: '10px',
                                            fontSize: '0.8rem', fontWeight: selectedEstado === estado.value ? 600 : 400,
                                            background: selectedEstado === estado.value ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                                            color: selectedEstado === estado.value ? '#60A5FA' : '#bbb',
                                            border: 'none', cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseOver={(e) => { if (selectedEstado !== estado.value) e.currentTarget.style.background = '#1a1a1a'; }}
                                        onMouseOut={(e) => { if (selectedEstado !== estado.value) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        {selectedEstado === estado.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                                        <span>{estado.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick examples */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                        {['Despido sin finiquito', 'Convenio de divorcio', 'Robaron mi negocio', 'Problemas con el SAT'].map((example) => (
                            <button
                                key={example}
                                onClick={() => { setSearchQuery(example); }}
                                style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.03)', border: '1px solid #333', borderRadius: '9999px', color: '#888', transition: 'all 0.2s', cursor: 'pointer' }}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
                            >
                                {example}
                            </button>
                        ))}
                    </div>

                    {/* User info bar */}
                    <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#555', fontSize: '0.8rem' }}>
                        <Shield className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                        <span>Conectado como <span style={{ color: '#aaa' }}>{user.email}</span></span>
                    </div>
                </div>
            </section>
        </div>
    );
}
