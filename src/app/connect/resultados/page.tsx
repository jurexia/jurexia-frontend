'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/useAuth';
import { LawyerProfile, sendConnectRequest } from '@/lib/api';
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

// ── Legal problem → specialty mapping for intelligent matching ──
const LEGAL_KEYWORDS: Record<string, string[]> = {
    'penal': ['penal', 'criminal', 'delito', 'homicidio', 'robo', 'fraude', 'violencia', 'abuso', 'extorsión', 'extorsion', 'secuestro', 'narcotráfico', 'narcotrafico', 'preso', 'cárcel', 'carcel', 'denuncia', 'ministerio público', 'ministerio publico', 'víctima', 'victima', 'agresión', 'agresion'],
    'civil': ['civil', 'contrato', 'propiedad', 'arrendamiento', 'renta', 'inmueble', 'compraventa', 'daños', 'danos', 'perjuicios', 'responsabilidad', 'obligaciones', 'prescripción', 'prescripcion', 'usucapión', 'usucapion', 'servidumbre', 'hipoteca', 'fianza', 'nulidad'],
    'familiar': ['familiar', 'familia', 'divorcio', 'custodia', 'pensión alimenticia', 'pension alimenticia', 'alimentos', 'matrimonio', 'patria potestad', 'adopción', 'adopcion', 'violencia familiar', 'guarda', 'convivencia', 'separación', 'separacion', 'hijos', 'esposo', 'esposa', 'pareja'],
    'laboral': ['laboral', 'trabajo', 'trabajador', 'despido', 'despidieron', 'liquidación', 'liquidacion', 'indemnización', 'indemnizacion', 'salario', 'sueldo', 'patrón', 'patron', 'empresa', 'sindicato', 'huelga', 'acoso laboral', 'aguinaldo', 'vacaciones', 'imss', 'seguro social', 'junta de conciliación', 'reinstalación', 'reinstalacion', 'injustificado', 'injustificadamente'],
    'mercantil': ['mercantil', 'comercial', 'sociedad', 'empresa', 'quiebra', 'concurso', 'pagaré', 'pagare', 'cheque', 'letra de cambio', 'título de crédito', 'titulo de credito', 'marca', 'patente', 'franquicia'],
    'amparo': ['amparo', 'constitucional', 'derechos humanos', 'garantías', 'garantias', 'suspensión', 'suspension', 'acto de autoridad', 'inconstitucional'],
    'fiscal': ['fiscal', 'impuesto', 'impuestos', 'sat', 'tributario', 'iva', 'isr', 'factura', 'contribución', 'contribucion', 'auditoría', 'auditoria', 'hacienda', 'crédito fiscal', 'credito fiscal', 'devolución', 'devolucion'],
    'administrativo': ['administrativo', 'gobierno', 'permiso', 'licencia', 'concesión', 'concesion', 'licitación', 'licitacion', 'expropiación', 'expropiacion', 'sanción', 'sancion', 'multa', 'trámite', 'tramite'],
};

function ResultadosContent() {
    const { user } = useRequireAuth('/login?redirect=/connect');
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const estado = searchParams.get('estado') || '';

    const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalResults, setTotalResults] = useState(0);
    const [contactLawyer, setContactLawyer] = useState<LawyerProfile | null>(null);

    // Score a lawyer against a search query (0 to 100)
    const scoreLawyer = (lawyer: LawyerProfile, queryText: string, estadoFilter: string): number => {
        const queryLower = queryText.toLowerCase();
        const words = queryLower.split(/\s+/).filter(w => w.length >= 2);
        if (words.length === 0 && !estadoFilter) return 0;

        let score = 0;
        const maxScore = 100;

        const lawyerSpecs = (lawyer.specialties || []).map(s => s.toLowerCase());
        const bioLower = (lawyer.bio || '').toLowerCase();
        const nameLower = (lawyer.full_name || '').toLowerCase();

        // 1. Specialty matching via synonym map (up to 50 points)
        let specScore = 0;
        for (const [area, keywords] of Object.entries(LEGAL_KEYWORDS)) {
            const queryMatchesArea = words.some(w =>
                keywords.some(kw => kw.includes(w) || w.includes(kw))
            );
            const lawyerHasArea = lawyerSpecs.some(s => s.includes(area));
            if (queryMatchesArea && lawyerHasArea) {
                specScore = Math.max(specScore, 50);
            }
        }
        for (const word of words) {
            if (lawyerSpecs.some(s => s.includes(word))) {
                specScore = Math.max(specScore, 40);
            }
        }
        score += specScore;

        // 2. Bio keyword matching (up to 30 points)
        let bioHits = 0;
        for (const word of words) {
            if (bioLower.includes(word)) bioHits++;
        }
        if (words.length > 0) {
            score += Math.min(30, Math.round((bioHits / words.length) * 30));
        }

        // 3. Name matching (up to 10 points)
        for (const word of words) {
            if (nameLower.includes(word)) { score += 10; break; }
        }

        // 4. Estado match bonus (10 points)
        if (estadoFilter) {
            const lawyerEstado = (lawyer.office_address?.estado || '').toUpperCase().replace(/\s+/g, '_');
            if (lawyerEstado === estadoFilter || lawyerEstado.replace(/_/g, '') === estadoFilter.replace(/_/g, '')) {
                score += 10;
            }
        }

        // Generic term baseline 
        const genericTerms = ['abogado', 'abogada', 'licenciado', 'licenciada', 'asesoría', 'asesoria', 'legal', 'jurídico', 'juridico', 'consulta', 'asesor', 'defensa', 'demanda', 'juicio', 'proceso'];
        if (words.some(w => genericTerms.includes(w))) {
            score = Math.max(score, 20);
        }

        return Math.min(maxScore, score);
    };

    // Load lawyers and run search
    useEffect(() => {
        async function loadAndSearch() {
            setIsLoading(true);
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                const { data, error } = await supabase
                    .from('lawyer_profiles')
                    .select('*')
                    .eq('is_pro_active', true)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    const mapped: LawyerProfile[] = data.map((row: Record<string, unknown>) => ({
                        id: row.id as string,
                        full_name: row.full_name as string,
                        cedula_number: (row.cedula_number || '') as string,
                        specialties: (row.specialties || []) as string[],
                        bio: (row.bio || '') as string,
                        office_address: {
                            estado: (row.estado || (row.office_address as Record<string, string>)?.estado || '') as string,
                            municipio: (row.municipio || (row.office_address as Record<string, string>)?.municipio || '') as string,
                            cp: (row.cp || (row.office_address as Record<string, string>)?.cp || '') as string,
                        },
                        verification_status: (row.verification_status || '') as string,
                        is_pro_active: row.is_pro_active as boolean,
                        avatar_url: (row.avatar_url || undefined) as string | undefined,
                        phone: (row.phone || undefined) as string | undefined,
                        phone_visible: (row.phone_visible || false) as boolean,
                    }));

                    // Score all lawyers
                    const scored = mapped.map(lawyer => ({
                        lawyer,
                        score: scoreLawyer(lawyer, query, estado),
                    }));

                    // Filter by estado if selected
                    let results = estado
                        ? scored.filter(s => {
                            const lawyerEstado = (s.lawyer.office_address?.estado || '').toUpperCase().replace(/\s+/g, '_');
                            return lawyerEstado === estado || lawyerEstado.replace(/_/g, '') === estado.replace(/_/g, '');
                        })
                        : scored;

                    // If there's a text query, filter to score > 0 and sort by score desc
                    if (query.length >= 2) {
                        results = results.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
                    }

                    const finalLawyers = results.map(s => ({
                        ...s.lawyer,
                        score: s.score,
                    }));

                    setLawyers(finalLawyers);
                    setTotalResults(finalLawyers.length);
                }
            } catch (err) {
                console.error('Error loading lawyers:', err);
            } finally {
                setIsLoading(false);
            }
        }

        loadAndSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, estado]);


    const estadoLabel = ESTADOS.find(e => e.value === estado)?.label || '';

    return (
        <div className={'connect-editorial ' + fuenteTitulo.variable + ' ' + fuenteTexto.variable}>
            <Navbar plataforma />
            <main className="connect-page">
                <header className="connect-hero connect-hero--resultados">
                    <div className="connect-hero__content">
                        <Link href="/connect/buscar" className="connect-hero__back">Volver a la búsqueda</Link>
                        <br />
                        <span className="connect-eyebrow">IUREXIA CONNECT / DIRECTORIO VERIFICADO</span>
                        <h1>{query ? <>Profesionales para <em>su asunto.</em></> : <>Encuentre representación <em>con criterio.</em></>}</h1>
                        <p>{query ? 'Búsqueda: “' + query + '”' : 'Explore los perfiles profesionales disponibles.'}{estadoLabel ? ' · ' + estadoLabel : ''}</p>
                    </div>
                </header>

                <section className="connect-results-panel">
                    <div className="connect-section-heading">
                        <div>
                            <span className="connect-eyebrow">02 / DIRECTORIO</span>
                            <h2>Abogados disponibles</h2>
                        </div>
                        {!isLoading && <p className="connect-results-summary">{totalResults} abogado{totalResults !== 1 ? 's' : ''} en esta búsqueda</p>}
                    </div>
                    {isLoading ? (
                        <div className="connect-loading-state">Buscando perfiles profesionales…</div>
                    ) : lawyers.length === 0 ? (
                        <div className="connect-empty-state">
                            <h3>Sin resultados por ahora</h3>
                            <p>Pruebe con una descripción más amplia o consulte el directorio sin filtrar por estado.</p>
                            <Link href="/connect/buscar" className="connect-secondary-button">Intentar otra búsqueda</Link>
                        </div>
                    ) : (
                        <div className="connect-results-grid">
                            {lawyers.map((lawyer, index) => (
                                <LawyerCard key={lawyer.id} lawyer={lawyer} artIndex={index} onContact={() => setContactLawyer(lawyer)} />
                            ))}
                        </div>
                    )}
                </section>
                <p className="connect-footer-note">Perfiles profesionales con cédula verificada · La búsqueda es gratuita</p>
            </main>

            {contactLawyer && (
                <ContactModal lawyer={contactLawyer} searchQuery={query} userId={user?.id} onClose={() => setContactLawyer(null)} />
            )}
        </div>
    );
}

export default function ResultadosPage() {
    return (
        <Suspense fallback={<div className="connect-editorial connect-loading">Cargando directorio…</div>}>
            <ResultadosContent />
        </Suspense>
    );
}

const ARTES_ABOGADOS = [
    '/web/arte/escalinata.webp',
    '/web/arte/archivo.webp',
    '/web/arte/columnata.webp',
    '/web/arte/biblioteca.webp',
    '/web/arte/claustro.webp',
    '/web/arte/boveda.webp',
];

function LawyerCard({ lawyer, artIndex, onContact }: { lawyer: LawyerProfile; artIndex: number; onContact: () => void }) {
    const estadoRaw = lawyer.office_address?.estado || '';
    const municipio = lawyer.office_address?.municipio || '';
    const estadoNormalized = estadoRaw.toUpperCase().replace(/\s+/g, '_');
    const estadoLabel = ESTADOS.find(e => e.value === estadoNormalized || e.value === estadoRaw)?.label || estadoRaw;
    const location = [municipio, estadoLabel].filter(Boolean).join(', ');
    const isVerified = lawyer.verification_status === 'verified';
    const matchScore = Math.max(0, Math.min(100, Math.round(lawyer.score || 0)));
    const initials = lawyer.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <article className="connect-lawyer-card">
            <div className="connect-lawyer-art" style={{ backgroundImage: 'url(' + ARTES_ABOGADOS[artIndex % ARTES_ABOGADOS.length] + ')' }}>
                <span className="connect-lawyer-avatar">
                    {lawyer.avatar_url ? <img src={lawyer.avatar_url} alt="" /> : initials}
                </span>
                {matchScore > 0 && <span className="connect-lawyer-match">{matchScore}% de afinidad</span>}
            </div>
            <div className="connect-lawyer-body">
                <h3>{lawyer.full_name}</h3>
                <p className="connect-lawyer-meta">{location || 'México'}{lawyer.cedula_number ? ' · Cédula ' + lawyer.cedula_number : ''}</p>
                {isVerified && <span className="connect-lawyer-verified">Cédula verificada</span>}
                {lawyer.specialties.length > 0 && (
                    <div className="connect-lawyer-specialties">
                        {lawyer.specialties.slice(0, 4).map((spec, i) => <span key={i}>{spec}</span>)}
                        {lawyer.specialties.length > 4 && <span>+{lawyer.specialties.length - 4} más</span>}
                    </div>
                )}
                {lawyer.bio && <p className="connect-lawyer-bio">{lawyer.bio}</p>}
                {lawyer.phone_visible && lawyer.phone && <a className="connect-lawyer-contact" href={'tel:' + lawyer.phone}>{lawyer.phone}</a>}
                <div className="connect-lawyer-footer">
                    <button type="button" className="connect-primary-button" onClick={onContact}>Contactar al profesional</button>
                </div>
            </div>
        </article>
    );
}

// ─────────────────────────────────────────
// Contact Request Modal
// ─────────────────────────────────────────

function ContactModal({ lawyer, searchQuery, userId, onClose }: { lawyer: LawyerProfile; searchQuery: string; userId?: string; onClose: () => void }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) { setError('Todos los campos son obligatorios'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email inválido'); return; }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) { setError('Teléfono inválido (mínimo 10 dígitos)'); return; }

        setSending(true);
        try {
            await sendConnectRequest({
                lawyer_id: lawyer.id,
                client_id: userId,
                client_name: name.trim(),
                client_email: email.trim(),
                client_phone: phone.trim(),
                message: message.trim(),
                search_query: searchQuery || undefined,
            });
            setSent(true);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Error al enviar la solicitud';
            setError(errMsg);
        } finally {
            setSending(false);
        }
    };


    return (
        <div className="connect-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-contact-title">
                <button type="button" className="connect-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
                {sent ? (
                    <div className="connect-modal-success">
                        <span className="connect-eyebrow">SOLICITUD ENVIADA</span>
                        <h2 id="connect-contact-title">El primer paso está dado.</h2>
                        <p>Enviamos su solicitud a {lawyer.full_name}. Podrá contactarle directamente.</p>
                        <button type="button" className="connect-primary-button" onClick={onClose}>Cerrar</button>
                    </div>
                ) : (
                    <>
                        <div className="connect-modal-header">
                            <span className="connect-eyebrow">IUREXIA CONNECT</span>
                            <h2 id="connect-contact-title">Contactar a {lawyer.full_name}</h2>
                            <p>{lawyer.specialties.slice(0, 3).join(' · ')}</p>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="connect-contact-name">Nombre completo *</label>
                                <input id="connect-contact-name" type="text" value={name} onChange={event => setName(event.target.value)} placeholder="Su nombre completo" required />
                            </div>
                            <div>
                                <label htmlFor="connect-contact-email">Correo electrónico *</label>
                                <input id="connect-contact-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="correo@ejemplo.com" required />
                            </div>
                            <div>
                                <label htmlFor="connect-contact-phone">Teléfono *</label>
                                <input id="connect-contact-phone" type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="55 1234 5678" required />
                            </div>
                            <div>
                                <label htmlFor="connect-contact-message">Describa su caso *</label>
                                <textarea id="connect-contact-message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Comparta lo necesario para que el abogado pueda evaluar su asunto." rows={4} required />
                            </div>
                            {error && <p className="connect-modal-error" role="alert">{error}</p>}
                            <p className="connect-modal-note">Su información se compartirá únicamente con el profesional seleccionado. Al enviar acepta nuestros <Link href="/terminos">Términos</Link> y <Link href="/privacidad">Aviso de privacidad</Link>.</p>
                            <button type="submit" disabled={sending} className="connect-primary-button">{sending ? 'Enviando…' : 'Enviar solicitud'}</button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
