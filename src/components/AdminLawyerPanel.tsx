'use client';

import { useState } from 'react';
import { Shield, Plus, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api-634779006258.us-central1.run.app';

const ESTADOS_MX = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'CDMX', 'Coahuila', 'Colima', 'Durango',
    'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
    'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora',
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

const SPECIALTIES = [
    'Civil', 'Penal', 'Laboral', 'Familiar', 'Mercantil', 'Fiscal',
    'Administrativo', 'Constitucional', 'Amparo', 'Corporativo',
    'Agrario', 'Propiedad Intelectual', 'Inmobiliario', 'Migratorio',
    'Ambiental', 'Internacional',
];

interface RegisterResult {
    success: boolean;
    cedula: string;
    full_name: string;
    verification_status: string;
    action: string;
    sep_data?: {
        nombre: string;
        profesion: string;
        institucion: string;
    } | null;
}

export default function AdminLawyerPanel() {
    const [cedula, setCedula] = useState('');
    const [fullName, setFullName] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [bio, setBio] = useState('');
    const [estado, setEstado] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [cp, setCp] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<RegisterResult[]>([]);
    const [error, setError] = useState('');
    const [autoValidating, setAutoValidating] = useState(false);
    const [sepPreview, setSepPreview] = useState<{ nombre: string; profesion: string; institucion: string } | null>(null);

    const toggleSpecialty = (s: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    const [sepUnavailable, setSepUnavailable] = useState(false);

    const handlePreValidate = async () => {
        if (!cedula.trim() || cedula.length < 6) return;
        setAutoValidating(true);
        setSepPreview(null);
        setSepUnavailable(false);
        try {
            const resp = await fetch(`${API_URL}/connect/validate-cedula`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula: cedula.trim() }),
            });
            const data = await resp.json();
            if (data.valid && data.nombre) {
                setSepPreview({
                    nombre: data.nombre,
                    profesion: data.profesion || '',
                    institucion: data.institucion || '',
                });
                if (!fullName) setFullName(data.nombre);
            } else if (data.valid && data.pending_verification) {
                // SEP API unavailable - cédula accepted as pending
                setSepUnavailable(true);
            } else if (!data.valid) {
                setError(data.error || 'Cédula inválida');
            }
        } catch {
            setSepUnavailable(true);
        }
        setAutoValidating(false);
    };

    const handleRegister = async () => {
        if (!cedula.trim()) return;
        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setError('No hay sesión activa de administrador');
                setLoading(false);
                return;
            }

            const resp = await fetch(`${API_URL}/connect/admin/register-lawyer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    cedula_number: cedula.trim(),
                    full_name: fullName.trim(),
                    specialties: selectedSpecialties,
                    bio: bio.trim(),
                    estado,
                    municipio: municipio.trim(),
                    cp: cp.trim(),
                    phone: phone.trim(),
                }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                setError(data.detail || 'Error al registrar');
            } else {
                setResults(prev => [data, ...prev]);
                // Clear form for next entry
                setCedula('');
                setFullName('');
                setBio('');
                setPhone('');
                setSepPreview(null);
                setSepUnavailable(false);
                // Keep specialties, estado, municipio, cp for consecutive entries
            }
        } catch (err) {
            setError('Error de conexión al servidor');
        }

        setLoading(false);
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border-2 border-blue-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                        Registro de Abogados
                    </h2>
                    <p className="text-xs text-charcoal-500">
                        Panel de administración — Ingreso de cédulas al directorio Connect
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Cédula + Pre-validate */}
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        Cédula Profesional <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={cedula}
                            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej: 14652328"
                            maxLength={9}
                            className="flex-1 px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                        />
                        <button
                            onClick={handlePreValidate}
                            disabled={!cedula.trim() || cedula.length < 6 || autoValidating}
                            className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            {autoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar SEP'}
                        </button>
                    </div>

                    {/* SEP preview */}
                    {sepPreview && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                            <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                                <Check className="w-4 h-4" />
                                Cédula encontrada en la SEP
                            </div>
                            <p className="text-green-800">
                                <strong>{sepPreview.nombre}</strong> — {sepPreview.profesion}
                            </p>
                            <p className="text-green-600 text-xs">{sepPreview.institucion}</p>
                        </div>
                    )}

                    {/* SEP unavailable */}
                    {sepUnavailable && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                            <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                El Registro Nacional de la SEP no está disponible en este momento
                            </div>
                            <p className="text-amber-600 text-xs">
                                Puedes registrar al abogado ingresando los datos manualmente. La cédula se marcará como &quot;pendiente de verificación&quot; y se validará automáticamente cuando la SEP responda.
                            </p>
                        </div>
                    )}
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Se auto-llena si la SEP responde"
                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Specialties */}
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-2">
                        Especialidades
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {SPECIALTIES.map(s => (
                            <button
                                key={s}
                                onClick={() => toggleSpecialty(s)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedSpecialties.includes(s)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Estado + Municipio */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Estado
                        </label>
                        <select
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        >
                            <option value="">Seleccionar</option>
                            {ESTADOS_MX.map(e => (
                                <option key={e} value={e}>{e}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Municipio
                        </label>
                        <input
                            type="text"
                            value={municipio}
                            onChange={(e) => setMunicipio(e.target.value)}
                            placeholder="Ej: Querétaro"
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Código Postal
                        </label>
                        <input
                            type="text"
                            value={cp}
                            onChange={(e) => setCp(e.target.value.replace(/\D/g, ''))}
                            placeholder="76000"
                            maxLength={5}
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Phone + Bio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Teléfono
                        </label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="442 123 4567"
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">
                            Bio / Descripción
                        </label>
                        <input
                            type="text"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Experiencia y enfoque"
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleRegister}
                    disabled={loading || !cedula.trim() || cedula.length < 6}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
                    ) : (
                        <><Plus className="w-5 h-5" /> Registrar Abogado</>
                    )}
                </button>
                <p className="text-xs text-charcoal-400 text-center">
                    Al registrar, la cédula se valida contra el Registro Nacional de Profesionistas de la SEP. Los campos Estado, Municipio y Especialidades se mantienen para ingreso consecutivo.
                </p>
            </div>

            {/* Results Feed */}
            {results.length > 0 && (
                <div className="mt-6 border-t border-cream-300 pt-4">
                    <h3 className="text-sm font-medium text-charcoal-700 mb-3">
                        Últimos registrados ({results.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {results.map((r, i) => (
                            <div
                                key={i}
                                className={`p-3 rounded-lg text-sm flex items-center justify-between ${r.verification_status === 'verified'
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-amber-50 border border-amber-200'
                                    }`}
                            >
                                <div>
                                    <span className="font-medium text-charcoal-900">{r.full_name}</span>
                                    <span className="text-charcoal-500 ml-2">#{r.cedula}</span>
                                    {r.sep_data?.profesion && (
                                        <span className="text-charcoal-400 ml-2 text-xs">
                                            — {r.sep_data.profesion}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.verification_status === 'verified'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {r.verification_status === 'verified' ? '✓ Verificado' : '⏳ Pendiente'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
