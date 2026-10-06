'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Navbar from '@/components/Navbar';
import { fuenteTitulo, fuenteTexto } from '@/lib/fuentes-web';
import '../connect-editorial.css';

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

    useEffect(() => {
        if (!loading && !user) router.push('/login?redirect=/connect/buscar');
    }, [user, loading, router]);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (selectedEstado) params.set('estado', selectedEstado);
        router.push('/connect/resultados?' + params.toString());
    };

    if (loading || !user) {
        return <div className="connect-editorial connect-loading">Verificando acceso...</div>;
    }

    return (
        <div className={'connect-editorial ' + fuenteTitulo.variable + ' ' + fuenteTexto.variable}>
            <Navbar plataforma />
            <main className="connect-page">
                <header className="connect-hero connect-hero--buscar">
                    <div className="connect-hero__content">
                        <span className="connect-eyebrow">IUREXIA CONNECT / DIRECTORIO VERIFICADO</span>
                        <h1>Encuentre a quien <em>defienda su causa.</em></h1>
                        <p>Cuéntenos qué sucede. Le ayudaremos a encontrar profesionales con cédula verificada y experiencia en su asunto.</p>
                    </div>
                </header>

                <section className="connect-search-panel" aria-labelledby="connect-search-title">
                    <div className="connect-section-heading">
                        <div>
                            <span className="connect-eyebrow">01 / COMIENCE AQUÍ</span>
                            <h2 id="connect-search-title">Su búsqueda, con criterio.</h2>
                        </div>
                        <p>Describa el problema en sus palabras y elija un estado si necesita atención local.</p>
                    </div>

                    <form onSubmit={(event) => { event.preventDefault(); handleSearch(); }} className="connect-search-form">
                        <div className="connect-field connect-field--query">
                            <label htmlFor="connect-consulta">¿Qué necesita resolver?</label>
                            <input
                                id="connect-consulta"
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Por ejemplo: necesito revisar un contrato de renta"
                                autoFocus
                            />
                        </div>
                        <div className="connect-field connect-field--state">
                            <label htmlFor="connect-estado">Estado</label>
                            <select id="connect-estado" value={selectedEstado} onChange={(event) => setSelectedEstado(event.target.value)}>
                                {ESTADOS.map((estado) => <option key={estado.value} value={estado.value}>{estado.label}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="connect-primary-button">Buscar abogados</button>
                    </form>

                    <div className="connect-examples">
                        <span>También puede comenzar con:</span>
                        <div>
                            {['Despido sin finiquito', 'Convenio de divorcio', 'Robo a mi negocio', 'Problemas con el SAT'].map((example) => (
                                <button key={example} type="button" onClick={() => setSearchQuery(example)}>{example}</button>
                            ))}
                        </div>
                    </div>
                </section>
                <p className="connect-footer-note">Directorio de abogados con cédula profesional verificada · Acceso sin costo para quien busca</p>
            </main>
        </div>
    );
}
