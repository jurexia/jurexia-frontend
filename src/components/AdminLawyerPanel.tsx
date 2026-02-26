'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Check, AlertTriangle, Loader2, Trash2, Pencil, X, RefreshCw, Phone, MapPin } from 'lucide-react';
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

interface LawyerRecord {
    id: string;
    full_name: string;
    cedula_number: string;
    specialties: string[];
    bio: string;
    phone: string;
    estado: string;
    municipio: string;
    cp: string;
    verification_status: string;
    is_pro_active: boolean;
    created_at: string;
}

export default function AdminLawyerPanel() {
    // ── Form State ───────────────────────────────────────────────────────────
    const [cedula, setCedula] = useState('');
    const [fullName, setFullName] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [bio, setBio] = useState('');
    const [estado, setEstado] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [cp, setCp] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoValidating, setAutoValidating] = useState(false);
    const [sepPreview, setSepPreview] = useState<{ nombre: string; profesion: string; institucion: string } | null>(null);
    const [sepUnavailable, setSepUnavailable] = useState(false);

    // ── List State ───────────────────────────────────────────────────────────
    const [lawyers, setLawyers] = useState<LawyerRecord[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'register' | 'manage'>('register');

    // ── Load existing lawyers ────────────────────────────────────────────────
    const loadLawyers = useCallback(async () => {
        setLoadingList(true);
        try {
            const { data, error: err } = await supabase
                .from('lawyer_profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (!err && data) setLawyers(data as LawyerRecord[]);
        } catch { /* ignore */ }
        setLoadingList(false);
    }, []);

    useEffect(() => { loadLawyers(); }, [loadLawyers]);

    const toggleSpecialty = (s: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    // ── Pre-validate cédula ──────────────────────────────────────────────────
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
                setSepUnavailable(true);
            } else if (!data.valid) {
                setError(data.error || 'Cédula inválida');
            }
        } catch {
            setSepUnavailable(true);
        }
        setAutoValidating(false);
    };

    // ── Register lawyer ──────────────────────────────────────────────────────
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
                setCedula('');
                setFullName('');
                setBio('');
                setPhone('');
                setSepPreview(null);
                setSepUnavailable(false);
                await loadLawyers();
            }
        } catch {
            setError('Error de conexión al servidor');
        }
        setLoading(false);
    };

    // ── Edit lawyer (load into form) ─────────────────────────────────────────
    const handleEdit = (lawyer: LawyerRecord) => {
        setEditingId(lawyer.id);
        setCedula(lawyer.cedula_number);
        setFullName(lawyer.full_name);
        setSelectedSpecialties(lawyer.specialties || []);
        setBio(lawyer.bio || '');
        setEstado(lawyer.estado || '');
        setMunicipio(lawyer.municipio || '');
        setCp(lawyer.cp || '');
        setPhone(lawyer.phone || '');
        setActiveTab('register');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Update lawyer ────────────────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!editingId) return;
        setLoading(true);
        setError('');
        try {
            const { error: err } = await supabase
                .from('lawyer_profiles')
                .update({
                    full_name: fullName.trim(),
                    specialties: selectedSpecialties,
                    bio: bio.trim(),
                    estado,
                    municipio: municipio.trim(),
                    cp: cp.trim(),
                    phone: phone.trim(),
                    phone_visible: !!phone.trim(),
                })
                .eq('id', editingId);
            if (err) {
                setError('Error al actualizar: ' + err.message);
            } else {
                setEditingId(null);
                setCedula('');
                setFullName('');
                setBio('');
                setPhone('');
                setSepPreview(null);
                await loadLawyers();
            }
        } catch {
            setError('Error de conexión');
        }
        setLoading(false);
    };

    // ── Delete lawyer ────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            const { error: err } = await supabase
                .from('lawyer_profiles')
                .delete()
                .eq('id', id);
            if (!err) {
                setDeleteConfirm(null);
                await loadLawyers();
            }
        } catch { /* ignore */ }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setCedula('');
        setFullName('');
        setBio('');
        setPhone('');
        setSepPreview(null);
        setSepUnavailable(false);
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border-2 border-blue-200 p-6 mb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h2 className="font-serif text-2xl font-medium text-charcoal-900">
                        Registro de Abogados
                    </h2>
                    <p className="text-xs text-charcoal-500">
                        Panel de administración — Ingreso de cédulas al directorio Connect
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
                <button
                    onClick={() => setActiveTab('register')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'register'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Plus className="w-4 h-4 inline mr-1" />
                    {editingId ? 'Editando' : 'Registrar'}
                </button>
                <button
                    onClick={() => setActiveTab('manage')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'manage'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Directorio ({lawyers.length})
                </button>
            </div>

            {/* ═══ REGISTER TAB ═══ */}
            {activeTab === 'register' && (
                <div className="space-y-4">
                    {/* Editing banner */}
                    {editingId && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center justify-between">
                            <span className="text-blue-700 font-medium">
                                ✏️ Editando: {fullName || cedula}
                            </span>
                            <button onClick={cancelEdit} className="text-blue-600 hover:text-blue-800 text-xs underline">
                                Cancelar edición
                            </button>
                        </div>
                    )}

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
                                disabled={!!editingId}
                                className="flex-1 px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg disabled:bg-gray-100"
                            />
                            {!editingId && (
                                <button
                                    onClick={handlePreValidate}
                                    disabled={!cedula.trim() || cedula.length < 6 || autoValidating}
                                    className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                                >
                                    {autoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar SEP'}
                                </button>
                            )}
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
                                    Puedes registrar al abogado ingresando los datos manualmente.
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
                            <label className="block text-sm font-medium text-charcoal-700 mb-1">Estado</label>
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
                            <label className="block text-sm font-medium text-charcoal-700 mb-1">Municipio</label>
                            <input
                                type="text"
                                value={municipio}
                                onChange={(e) => setMunicipio(e.target.value)}
                                placeholder="Ej: Querétaro"
                                className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1">Código Postal</label>
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
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Teléfono</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="442 123 4567"
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Bio / Descripción</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Experiencia, enfoque profesional, áreas de práctica..."
                            rows={3}
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
                        />
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
                        onClick={editingId ? handleUpdate : handleRegister}
                        disabled={loading || (!editingId && (!cedula.trim() || cedula.length < 6))}
                        className={`w-full px-6 py-3 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 ${editingId
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> {editingId ? 'Actualizando...' : 'Registrando...'}</>
                        ) : editingId ? (
                            <><Pencil className="w-5 h-5" /> Guardar Cambios</>
                        ) : (
                            <><Plus className="w-5 h-5" /> Registrar Abogado</>
                        )}
                    </button>
                    <p className="text-xs text-charcoal-400 text-center">
                        {editingId
                            ? 'Los cambios se guardarán directamente en Supabase.'
                            : 'Al registrar, la cédula se valida contra el Registro Nacional de Profesionistas. Los campos Estado, Municipio y Especialidades se mantienen para ingreso consecutivo.'
                        }
                    </p>
                </div>
            )}

            {/* ═══ MANAGE TAB ═══ */}
            {activeTab === 'manage' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-charcoal-700">
                            Abogados registrados ({lawyers.length})
                        </h3>
                        <button
                            onClick={loadLawyers}
                            disabled={loadingList}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>

                    {loadingList ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                    ) : lawyers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                            No hay abogados registrados aún.
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {lawyers.map(lawyer => (
                                <div
                                    key={lawyer.id}
                                    className={`p-4 rounded-xl border transition-colors ${lawyer.verification_status === 'verified'
                                        ? 'bg-green-50/50 border-green-200'
                                        : 'bg-amber-50/50 border-amber-200'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-medium text-charcoal-900 text-sm">
                                                    {lawyer.full_name}
                                                </h4>
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${lawyer.verification_status === 'verified'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {lawyer.verification_status === 'verified' ? '✓ Verificado' : '⏳ Pendiente'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                                Cédula: {lawyer.cedula_number}
                                            </p>

                                            {/* Details row */}
                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                                                {(lawyer.estado || lawyer.municipio) && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {[lawyer.municipio, lawyer.estado].filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                                {lawyer.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {lawyer.phone}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Specialties */}
                                            {lawyer.specialties?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {lawyer.specialties.map((s, i) => (
                                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Bio preview */}
                                            {lawyer.bio && (
                                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                                                    {lawyer.bio}
                                                </p>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-col gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleEdit(lawyer)}
                                                className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                            {deleteConfirm === lawyer.id ? (
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => handleDelete(lawyer.id)}
                                                        className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                        title="Confirmar eliminar"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                                                        title="Cancelar"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(lawyer.id)}
                                                    className="p-2 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
