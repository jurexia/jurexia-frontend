'use client';

import { useState } from 'react';
import {
    Search, MapPin, Shield, Star, MessageSquare, ChevronDown, Check
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Navbar from '@/components/Navbar';

export default function ConnectPage() {
    const { user } = useAuth();
    const router = useRouter();

    const handleEntrar = () => {
        if (!user) {
            router.push('/login?redirect=/connect/buscar');
            return;
        }
        router.push('/connect/buscar');
    };

    return (
        <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f5f5f5', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <Navbar />

            {/* ── Hero Section ── */}
            <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', paddingTop: '140px', paddingBottom: '60px', background: 'linear-gradient(180deg, #0a0a0a 0%, #0d1117 50%, #0a0a0a 100%)' }}>
                <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1, width: '100%' }}>
                    {/* Brand Badge — Iurexia Connect */}
                    <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <div style={{ padding: '8px 20px', borderRadius: '9999px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                <span style={{ color: '#d4af37' }}>Iurexia</span>{' '}
                                <span style={{ color: '#60a5fa' }}>Connect</span>
                            </span>
                        </div>
                    </div>

                    <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#e5e5e5', fontFamily: 'Georgia, serif', marginBottom: '24px' }}>
                        La justicia exige seriedad.<br />
                        <span style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #d4af37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block', marginTop: '8px' }}>Encuentra representación real.</span>
                    </h1>

                    <p style={{ fontSize: '1.25rem', color: '#a3a3a3', fontWeight: 400, margin: '0 auto 40px', lineHeight: 1.7, maxWidth: '640px' }}>
                        La libertad, la salud y el patrimonio no son un juego. Nuestra IA te conecta <strong style={{ color: '#d4af37' }}>gratuitamente</strong> con abogados cuyas cédulas han sido rigurosamente verificadas.
                    </p>

                    {/* Primary CTA in hero — scrolls to bottom CTA or enters search */}
                    <button
                        onClick={handleEntrar}
                        className="hover:-translate-y-1 hover:shadow-lg"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '18px 44px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 8px 30px rgba(37, 99, 235, 0.3)' }}
                    >
                        <Search className="w-5 h-5" />
                        Buscar Abogado
                    </button>

                    <p style={{ marginTop: '16px', color: '#555', fontSize: '0.85rem' }}>
                        {user ? 'Acceso directo al directorio verificado' : 'Inicia sesión para acceder al directorio'}
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section style={{ padding: '100px 5%', background: '#111', borderTop: '1px solid #222', borderBottom: '1px solid #222' }}>
                <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 60px' }}>
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '2.5rem', fontWeight: 300, color: '#f5f5f5', marginBottom: '24px' }}>Por qué creamos CONNECT</h2>
                    <p style={{ color: '#a3a3a3', fontSize: '1.15rem', lineHeight: 1.8, marginBottom: '24px' }}>
                        Enfrentamos una dura realidad social en México: miles de personas pierden su patrimonio, libertad o tranquilidad simplemente porque <strong style={{ color: '#e5e5e5' }}>no logran contactar a un abogado profesional y responsable</strong> que les brinde una representación de calidad.
                    </p>
                    <p style={{ color: '#a3a3a3', fontSize: '1.15rem', lineHeight: 1.8 }}>
                        El equipo de Iurexia decidió crear un puente confiable, usando inteligencia artificial para asegurar que cada ciudadano encuentre al especialista correcto, y que cada abogado en la plataforma tenga sus credenciales validadas.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', padding: '40px 30px', transition: 'transform 0.3s ease', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                        <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', color: '#f5f5f5', marginBottom: '12px', fontWeight: 600 }}>Cero Engaños</h3>
                            <p style={{ color: '#a3a3a3', fontSize: '0.95rem', lineHeight: 1.6 }}>La representación legal no se simula. Protegemos a los usuarios listando únicamente abogados que han demostrado documentalmente su cédula profesional y trayectoria real.</p>
                        </div>
                    </div>

                    <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', padding: '40px 30px', transition: 'transform 0.3s ease', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                        <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', color: '#f5f5f5', marginBottom: '12px', fontWeight: 600 }}>Matching por Especialidad</h3>
                            <p style={{ color: '#a3a3a3', fontSize: '0.95rem', lineHeight: 1.6 }}>Nuestra IA lee tu caso y no busca palabras clave al azar. Encuentra al abogado que, por su biografía y perfil estadístico de experiencia, está preparado justo para lo que requieres.</p>
                        </div>
                    </div>

                    <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', padding: '40px 30px', transition: 'transform 0.3s ease', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                        <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37' }}>
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', color: '#f5f5f5', marginBottom: '12px', fontWeight: 600 }}>Reseñas y Evaluación Directa</h3>
                            <p style={{ color: '#a3a3a3', fontSize: '0.95rem', lineHeight: 1.6 }}>El sistema se alimenta de reseñas reales. Podrás calificar la honestidad, el trato del primer acercamiento y la transparencia en el costo ofrecido por el litigante.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem/Solution Section */}
            <section style={{ padding: '100px 5%', maxWidth: '1200px', margin: '0 auto' }}>
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16 mb-24">
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '2rem', marginBottom: '24px', color: '#f5f5f5', fontFamily: 'Georgia, serif' }}>El problema del coyotaje y la informalidad</h3>
                        <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: '24px', lineHeight: 1.7 }}>Buscar representación legal en redes sociales o foros no regulados expone a las personas a fraudes. Muchos &ldquo;abogados&rdquo; toman anticipos y desaparecen, o carecen de la cédula necesaria para litigar ante juzgados federales.</p>
                        <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: '24px', lineHeight: 1.7 }}>Con <span style={{ color: '#60a5fa', fontWeight: 500 }}>Iurexia Connect</span>, cerramos la puerta a las estafas. Si un usuario tiene una urgencia legal, le mostramos a los abogados confiables de su estado en segundos.</p>
                    </div>
                    <div style={{ flex: 1, background: 'linear-gradient(145deg, #111, #0a0a0a)', border: '1px solid #222', borderRadius: '24px', padding: '40px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ width: '100%', maxWidth: '400px', background: '#0f0f0f', border: '1px solid #333', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#666', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            <Search className="w-5 h-5 text-gray-500" />
                            <span className="text-sm md:text-base">Ej: Me acaban de despedir sin darme finiquito...</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row-reverse items-center gap-12 md:gap-16">
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '2rem', marginBottom: '24px', color: '#f5f5f5', fontFamily: 'Georgia, serif' }}>IA que entiende el Derecho</h3>
                        <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: '24px', lineHeight: 1.7 }}>Las personas no siempre saben qué rama del derecho necesitan buscar. Alguien describiendo &ldquo;problemas con los linderos de mi rancho&rdquo; no tiene por qué saber que necesita a un agrarista o civilista.</p>
                        <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: '24px', lineHeight: 1.7 }}>Nuestro algoritmo de <span style={{ color: '#60a5fa', fontWeight: 500 }}>búsqueda semántica</span> analiza la petición del usuario, determina la materia jurídica y clasifica a los abogados validados dándoles un &ldquo;Match Score&rdquo; basado en su especialización certificada.</p>
                    </div>
                    <div style={{ flex: 1, background: 'linear-gradient(145deg, #111, #0a0a0a)', border: '1px solid #222', borderRadius: '24px', padding: '40px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div className="hover:translate-y-[-5px] hover:rotate-0" style={{ width: '80%', maxWidth: '350px', background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '20px', position: 'absolute', transform: 'rotate(-2deg)', boxShadow: '0 15px 35px rgba(0,0,0,0.6)', transition: 'transform 0.3s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ width: '120px', height: '16px', background: '#333', borderRadius: '4px', marginBottom: '8px' }}></div>
                                    <div style={{ width: '80px', height: '12px', background: '#222', borderRadius: '4px' }}></div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px', fontSize: '14px' }}>
                                    95% Match
                                </div>
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                                <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>Civil</span>
                                <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>Corporativo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Action Section */}
            <section style={{ padding: '100px 5%', textAlign: 'center', background: 'linear-gradient(to bottom, #0a0a0a, #0f172a)', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(20, 20, 20, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #222', padding: '60px 40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '10px 20px', borderRadius: '30px', fontSize: '0.95rem', fontWeight: 600, marginBottom: '30px' }}>
                        <Shield className="w-5 h-5" />
                        Tu puente seguro a la justicia
                    </div>

                    <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>¿Eres abogado o necesitas uno?</h2>
                    <p style={{ fontSize: '1.125rem', color: '#a3a3a3', marginBottom: '40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                        Nuestra plataforma está 100% enfocada en profesionalizar y asegurar el enlace entre litigantes éticos y ciudadanos en necesidad médica, patrimonial o de libertad.
                    </p>

                    <button
                        onClick={handleEntrar}
                        className="hover:-translate-y-1 hover:shadow-lg"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', textDecoration: 'none', padding: '20px 50px', borderRadius: '16px', fontSize: '1.25rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                        Entrar a Connect
                    </button>

                    <p style={{ marginTop: '32px', color: '#666', fontSize: '0.9rem' }}>
                        Iniciativa y responsabilidad ética de <strong style={{ color: '#f5f5f5' }}>Iurexia Technologies</strong>
                    </p>
                </div>
            </section>
        </div>
    );
}
