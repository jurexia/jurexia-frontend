'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { User, CreditCard, Shield, AlertTriangle, Check, X, FileText, Building2, KeyRound, Gift, ChevronRight, MessageCircle, Mail, Copy } from 'lucide-react';
import DialogoRetencion from '@/components/DialogoRetencion';
import { Insignia, nivelDePlan } from '@/components/Insignia';
import { updatePassword } from '@/lib/supabase';
import ConnectLawyerSection from '@/components/ConnectLawyerSection';
import AdminLawyerPanel from '@/components/AdminLawyerPanel';

const ADMIN_EMAIL = 'administracion@iurexia.com';

const planColors: Record<string, { bg: string; text: string; label: string }> = {
    gratuito: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Gratuito' },
    pro_monthly: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro Mensual' },
    pro_annual: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro Anual' },
    platinum_monthly: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum Mensual' },
    platinum_annual: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', label: 'Platinum Anual' },
    ultra_secretarios: { bg: 'bg-gradient-to-r from-purple-100 to-indigo-100', text: 'text-purple-700', label: 'Ultra Secretarios' },
};

const REGIMENES_FISCALES = [
    { clave: '601', nombre: 'General de Ley Personas Morales' },
    { clave: '603', nombre: 'Personas Morales con Fines no Lucrativos' },
    { clave: '605', nombre: 'Sueldos y Salarios' },
    { clave: '606', nombre: 'Arrendamiento' },
    { clave: '612', nombre: 'Personas Físicas con Actividades Empresariales y Profesionales' },
    { clave: '616', nombre: 'Sin obligaciones fiscales' },
    { clave: '620', nombre: 'Sociedades Cooperativas de Producción' },
    { clave: '621', nombre: 'Incorporación Fiscal' },
    { clave: '625', nombre: 'Régimen de las Actividades Empresariales (plataformas)' },
    { clave: '626', nombre: 'Régimen Simplificado de Confianza (RESICO)' },
];

const USOS_CFDI = [
    { clave: 'G01', nombre: 'Adquisición de mercancías' },
    { clave: 'G03', nombre: 'Gastos en general' },
    { clave: 'I04', nombre: 'Equipo de computo y accesorios' },
    { clave: 'P01', nombre: 'Por definir' },
    { clave: 'S01', nombre: 'Sin efectos fiscales' },
];

/* ── La tarjeta del perfil ────────────────────────────────────────────────
 *
 * Todas las secciones eran la misma caja blanca del mismo peso, apiladas en
 * una columna larguísima: no había forma de saber de un vistazo dónde está
 * cada cosa. Aquí el color no decora, CLASIFICA — cada naturaleza de dato
 * tiene el suyo, y se queda en el icono y en una línea superior de 2px, nunca
 * en el fondo. Así la página sigue siendo de Iurexia: crema, carbón y oro.
 *
 * Por qué estos colores:
 *   oro     — la suscripción. Es el color de la casa y marca lo que vale.
 *   azul    — los datos de uso y el programa de referidos. El azul se lee
 *             como calma y confianza, que es justo lo que debe transmitir un
 *             contador de consumo; en rojo o naranja parecería una alarma.
 *   pizarra — lo administrativo (fiscal, cuenta). Serio y sin ruido.
 *   carbón  — la identidad. Neutro, porque es el punto de partida.
 *   rojo    — sólo lo irreversible, y apagado hasta que se toca.
 */
/**
 * El texto que el abogado manda por WhatsApp o correo.
 *
 * Vive aquí y no en lib/correo/referidos.ts porque aquél importa `crypto` de
 * Node en el módulo, y esta página es un componente de cliente: importarlo
 * arrastraría Node al navegador.
 *
 * Redactado como lo escribiría él, no como lo escribiría una campaña: primero
 * el regalo, luego el motivo y el enlace al final. Sin signos de admiración ni
 * promesas — va dirigido a un colega y quien lo manda pone su prestigio.
 */
function textoInvitacion(nombre: string | null | undefined, codigo: string): string {
    const enlace = `https://www.iurexia.com/registro?ref=${codigo}`;
    const firma = nombre?.trim() ? `\n\n— ${nombre.trim()}` : '';
    return (
        `Colega, le comparto 6 días de Iurexia Pro sin costo ni tarjeta.\n\n` +
        `Es el asistente jurídico con el que trabajo: responde con la ley y la ` +
        `jurisprudencia mexicanas citadas y verificables, no de memoria.\n\n` +
        `Actívelos aquí: ${enlace}${firma}`
    );
}

const ACENTO = {
    carbon: { linea: '#1a1a1a', chip: 'rgba(26,26,26,0.06)', icono: '#1a1a1a' },
    oro: { linea: '#c9a962', chip: 'rgba(201,169,98,0.14)', icono: '#8a6d2e' },
    azul: { linea: '#3b6ea5', chip: 'rgba(59,110,165,0.10)', icono: '#3b6ea5' },
    pizarra: { linea: '#6b7280', chip: 'rgba(107,114,128,0.10)', icono: '#4b5563' },
    rojo: { linea: '#b91c1c', chip: 'rgba(185,28,28,0.08)', icono: '#b91c1c' },
} as const;

function Tarjeta({
    icono: Icono,
    titulo,
    descripcion,
    acento = 'carbon',
    accion,
    children,
}: {
    icono: typeof User;
    titulo: string;
    descripcion?: string;
    acento?: keyof typeof ACENTO;
    accion?: React.ReactNode;
    children: React.ReactNode;
}) {
    const c = ACENTO[acento];
    return (
        <section
            className="overflow-hidden rounded-2xl bg-white"
            style={{ border: '1px solid rgba(26,26,26,0.07)', boxShadow: '0 1px 2px rgba(26,26,26,0.04)' }}
        >
            <div style={{ height: 2, background: c.linea, opacity: 0.75 }} />
            <div className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="mb-4 flex items-start gap-3">
                    <span
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: c.chip }}
                    >
                        <Icono className="h-[18px] w-[18px]" style={{ color: c.icono }} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2
                            className="text-[1.0625rem] font-semibold leading-tight text-charcoal-900"
                            style={{ letterSpacing: '-0.01em' }}
                        >
                            {titulo}
                        </h2>
                        {descripcion && (
                            <p className="mt-0.5 text-[0.8125rem] leading-snug text-charcoal-500">
                                {descripcion}
                            </p>
                        )}
                    </div>
                    {accion && <div className="flex-shrink-0">{accion}</div>}
                </div>
                {children}
            </div>
        </section>
    );
}

/** Fila de dato: etiqueta a la izquierda, valor a la derecha. Como en Ajustes. */
function Fila({ etiqueta, children, ultima = false }: {
    etiqueta: string; children: React.ReactNode; ultima?: boolean;
}) {
    return (
        <div
            className="flex items-center justify-between gap-4 py-2.5"
            style={ultima ? undefined : { borderBottom: '1px solid rgba(26,26,26,0.06)' }}
        >
            <span className="text-[0.8125rem] text-charcoal-500">{etiqueta}</span>
            <span className="min-w-0 text-right text-[0.8125rem] font-medium text-charcoal-900">
                {children}
            </span>
        </div>
    );
}

export default function PerfilPage() {
    const { user, profile, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    // El aviso se pintaba SIEMPRE en verde, así que «Error al guardar» salía
    // con color de éxito: el usuario leía un fallo vestido de acierto.
    const [saveOk, setSaveOk] = useState(true);
    const [subiendoAvatar, setSubiendoAvatar] = useState(false);
    const [avatarPropio, setAvatarPropio] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [loadingPortal, setLoadingPortal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingSubscription, setCancellingSubscription] = useState(false);
    const [cancelMessage, setCancelMessage] = useState('');
    const [referidos, setReferidos] = useState<{
        codigo: string; invitados: number; activos: number; suscritos: number;
        meta: number; diasDeBienvenida: number;
        escalera: { nivel: number; dias: number }[];
        siguiente: { nivel: number; dias: number; faltan: number } | null;
        premio: { vence_at: string; plan_previo: string; plan_premio: string; nivel: number } | null;
    } | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [otraCuenta, setOtraCuenta] = useState<{ hay_otra: boolean; correo_oculto?: string } | null>(null);
    const [tratamiento, setTratamiento] = useState<'lic' | 'licenciado' | 'licenciada'>('lic');
    const [tratamientoGuardando, setTratamientoGuardando] = useState(false);
    const [nuevaPass, setNuevaPass] = useState('');
    const [confirmaPass, setConfirmaPass] = useState('');
    const [passCargando, setPassCargando] = useState(false);
    const [passMsg, setPassMsg] = useState<{ ok: boolean; texto: string } | null>(null);

    // Fiscal data state
    const [showFiscalForm, setShowFiscalForm] = useState(false);
    const [fiscalData, setFiscalData] = useState({
        rfc: '',
        razon_social: '',
        regimen_fiscal: '',
        codigo_postal_fiscal: '',
        uso_cfdi: 'G03',
    });
    const [fiscalSaving, setFiscalSaving] = useState(false);
    const [fiscalMessage, setFiscalMessage] = useState('');
    const [fiscalLoaded, setFiscalLoaded] = useState(false);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    useEffect(() => {
        if (profile?.full_name) {
            setNewName(profile.full_name);
        }
        if (profile?.tratamiento) {
            setTratamiento(profile.tratamiento);
        }
    }, [profile]);

    const guardarTratamiento = async (valor: 'lic' | 'licenciado' | 'licenciada') => {
        if (!user) return;
        const previo = tratamiento;
        setTratamiento(valor);          // respuesta inmediata en pantalla
        setTratamientoGuardando(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ tratamiento: valor })
                .eq('id', user.id);
            if (error) setTratamiento(previo);
        } catch {
            setTratamiento(previo);
        } finally {
            setTratamientoGuardando(false);
        }
    };

    // Avance del programa de referidos. Sólo se pide para quien paga: a un
    // usuario gratuito la sección no le aplica y no vale la pena la llamada.
    useEffect(() => {
        if (!user || !profile || profile.subscription_type === 'gratuito') return;

        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;
                const r = await fetch('/api/referidos/estado', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (r.ok) setReferidos(await r.json());
            } catch {
                // Que no cargue el avance de referidos no debe romper el perfil.
            }
        })();
    }, [user, profile]);

    // ¿Tiene otra cuenta con plan de pago? Sólo se pregunta si esta es
    // gratuita: la ruta lo vuelve a verificar en el servidor, pero así se
    // ahorra la llamada para la mayoría.
    useEffect(() => {
        if (!user || !profile || profile.subscription_type !== 'gratuito') return;

        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;
                const r = await fetch('/api/cuenta/otra-cuenta', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (r.ok) setOtraCuenta(await r.json());
            } catch {
                // El aviso es una ayuda, no un requisito: si falla, el perfil
                // se ve igual.
            }
        })();
    }, [user, profile]);

    // Load existing fiscal data
    useEffect(() => {
        if (!user || fiscalLoaded) return;

        const loadFiscalData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;

                const response = await fetch('/api/fiscal/save', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });

                if (response.ok) {
                    const { data } = await response.json();
                    if (data?.rfc) {
                        setFiscalData({
                            rfc: data.rfc || '',
                            razon_social: data.razon_social || '',
                            regimen_fiscal: data.regimen_fiscal || '',
                            codigo_postal_fiscal: data.codigo_postal_fiscal || '',
                            uso_cfdi: data.uso_cfdi || 'G03',
                        });
                    }
                }
            } catch (err) {
                console.error('Error loading fiscal data:', err);
            }
            setFiscalLoaded(true);
        };

        loadFiscalData();
    }, [user, fiscalLoaded]);

    // Show skeleton ONLY while auth is initializing
    if (loading) {
        return (
            <div className="min-h-screen bg-cream-200">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Not authenticated — useEffect redirect will fire, render nothing
    if (!isAuthenticated || !user) {
        return null;
    }

    // Authenticated but profile failed to load — show retry UI
    if (!profile) {
        return (
            <div className="min-h-screen bg-cream-200">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="bg-white rounded-2xl shadow-sm border border-cream-300 p-8 text-center">
                        <p className="text-charcoal-700 mb-4">
                            No se pudo cargar tu perfil. Esto puede ocurrir por una conexión lenta.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const planStyle = planColors[profile.subscription_type] || planColors.gratuito;
    const queryPercentage = profile.queries_limit === -1
        ? 0
        : (profile.queries_used / profile.queries_limit) * 100;
    const isPro = ['pro_monthly', 'pro_annual', 'platinum_monthly', 'platinum_annual'].includes(profile.subscription_type);

    /**
     * Subir la foto de perfil.
     *
     * El bucket `avatars` ya existía —público, tope de 5 MB, sólo imágenes, y
     * con políticas que acotan cada carpeta a su dueño—, pero la pantalla
     * nunca lo usó: el avatar se leía de `user_metadata.avatar_url`, que es lo
     * que trae Google al entrar, y no había forma de cambiarlo. Quien entrara
     * con correo se quedaba con sus iniciales para siempre.
     *
     * El archivo va a `<uid>/avatar.<ext>` porque la política de storage exige
     * que la primera carpeta sea el id del usuario. Se sobrescribe en vez de
     * acumular versiones, y la URL lleva un sello de tiempo para que el
     * navegador no siga enseñando la anterior desde su caché.
     */
    const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        if (!archivo || !user) return;

        if (!/^image\/(jpeg|png|webp|heic)$/.test(archivo.type)) {
            setSaveMessage('Formato no admitido: usa JPG, PNG o WebP');
            setSaveOk(false);
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            setSaveMessage('La imagen pesa más de 5 MB');
            setSaveOk(false);
            return;
        }

        setSubiendoAvatar(true);
        setSaveMessage('');
        try {
            const ext = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
            const ruta = `${user.id}/avatar.${ext}`;

            const { error: errSubida } = await supabase.storage
                .from('avatars')
                .upload(ruta, archivo, { upsert: true, contentType: archivo.type });
            if (errSubida) throw errSubida;

            const { data } = supabase.storage.from('avatars').getPublicUrl(ruta);
            const url = `${data.publicUrl}?v=${Date.now()}`;

            const { error: errPerfil } = await supabase
                .from('user_profiles')
                .update({ avatar_url: url })
                .eq('id', user.id);
            if (errPerfil) throw errPerfil;

            setAvatarPropio(url);
            setSaveMessage('Foto actualizada ✓');
            setSaveOk(true);
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            console.error('Error subiendo el avatar:', err);
            setSaveMessage('No se pudo subir la imagen');
            setSaveOk(false);
        } finally {
            setSubiendoAvatar(false);
            e.target.value = '';
        }
    };

    const handleSaveName = async () => {
        if (!newName.trim()) return;

        setSaving(true);
        setSaveMessage('');

        // `.eq('id', …)` y no `user_id`: esa columna NO EXISTE en
        // `user_profiles`, cuya clave primaria es el propio `id` del usuario de
        // auth. La consulta fallaba siempre con «column does not exist», así
        // que editar el nombre nunca funcionó desde que existe esta pantalla.
        const { error } = await supabase
            .from('user_profiles')
            .update({ full_name: newName.trim() })
            .eq('id', user.id);

        if (error) {
            setSaveMessage('Error al guardar');
            setSaveOk(false);
            console.error('Error updating name:', error);
        } else {
            setSaveMessage('Guardado ✓');
            setSaveOk(true);
            setEditingName(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }

        setSaving(false);
    };

    const handleOpenPortal = async () => {
        if (!profile.stripe_customer_id) {
            alert('No tienes una suscripción activa');
            return;
        }

        setLoadingPortal(true);

        try {
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: profile.stripe_customer_id }),
            });

            const { url } = await response.json();
            if (url) {
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Error opening portal:', error);
            alert('Error al abrir el portal de facturación');
        }

        setLoadingPortal(false);
    };

    const handleCancelSubscription = async () => {
        if (!profile.stripe_subscription_id) return;

        setCancellingSubscription(true);
        setCancelMessage('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setCancelMessage('Error: no hay sesión activa');
                setCancellingSubscription(false);
                return;
            }

            const response = await fetch('/api/stripe/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ subscriptionId: profile.stripe_subscription_id }),
            });

            const result = await response.json();

            if (!response.ok) {
                setCancelMessage(result.error || 'No pudimos procesar la cancelación. Por favor, intenta de nuevo en unos minutos.');
            } else {
                const cancelDate = result.cancelAt
                    ? new Date(result.cancelAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'el final del periodo';
                const alreadyMsg = result.alreadyCancelled ? ' (ya estaba programada)' : '';
                setCancelMessage(`Tu suscripción se cancelará el ${cancelDate}${alreadyMsg}. Mantendrás el acceso hasta esa fecha. No se realizarán más cobros.`);
                setShowCancelModal(false);
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            setCancelMessage('Hubo un problema de conexión. Tu suscripción podría haberse cancelado correctamente. Verifica en el portal de facturación.');
        }

        setCancellingSubscription(false);
    };

    const handleSaveFiscal = async () => {
        setFiscalSaving(true);
        setFiscalMessage('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setFiscalMessage('Error: no hay sesión activa');
                setFiscalSaving(false);
                return;
            }

            const response = await fetch('/api/fiscal/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(fiscalData),
            });

            const result = await response.json();

            if (!response.ok) {
                setFiscalMessage(result.error || 'Error al guardar');
            } else {
                setFiscalMessage(result.synced_to_stripe
                    ? 'Datos fiscales guardados y sincronizados con Stripe ✓'
                    : 'Datos fiscales guardados ✓ (se sincronizarán con Stripe cuando tengas suscripción activa)');
                setTimeout(() => setFiscalMessage(''), 5000);
            }
        } catch (err) {
            console.error('Error saving fiscal data:', err);
            setFiscalMessage('Error de conexión');
        }

        setFiscalSaving(false);
    };

    const cambiarContrasena = async () => {
        if (nuevaPass.length < 8) {
            setPassMsg({ ok: false, texto: 'La contraseña debe tener al menos ocho caracteres.' });
            return;
        }
        if (nuevaPass !== confirmaPass) {
            setPassMsg({ ok: false, texto: 'Las dos contraseñas no coinciden.' });
            return;
        }

        setPassCargando(true);
        setPassMsg(null);
        try {
            await updatePassword(nuevaPass);
            setNuevaPass('');
            setConfirmaPass('');
            setPassMsg({ ok: true, texto: 'Contraseña actualizada.' });
        } catch (e) {
            // Supabase devuelve en inglés; el usuario no tiene por qué leerlo.
            const crudo = e instanceof Error ? e.message : String(e);
            const texto = /should be different|same as the old/i.test(crudo)
                ? 'La contraseña nueva debe ser distinta de la actual.'
                : /session|not authenticated/i.test(crudo)
                    ? 'Su sesión expiró. Vuelva a entrar e inténtelo de nuevo.'
                    : 'No pudimos actualizar la contraseña. Inténtelo de nuevo.';
            setPassMsg({ ok: false, texto });
        } finally {
            setPassCargando(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'ELIMINAR') return;

        // TODO: Implement account deletion
        alert('Funcionalidad de eliminación de cuenta próximamente');
        setShowDeleteModal(false);
    };

    const getInitials = () => {
        if (profile.full_name) {
            const names = profile.full_name.split(' ');
            if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
            }
            return profile.full_name.substring(0, 2).toUpperCase();
        }
        return user.email?.substring(0, 2).toUpperCase() || 'U';
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-cream-200">
            <Navbar />

            {/* pt-24: el encabezado fijo tapaba «Mi Perfil». */}
            <main className="mx-auto max-w-5xl px-4 pb-16 pt-24">
                {/* ── Identidad ──────────────────────────────────────────────
                    Quién eres y en qué plan estás, de un vistazo y sin
                    competir con nada. Antes esto vivía dentro de una tarjeta
                    más, al mismo nivel que los datos fiscales. */}
                <div
                    className="mb-6 overflow-hidden rounded-3xl"
                    style={{
                        background: 'linear-gradient(135deg, #1c1c1e 0%, #262628 55%, #1a1a1a 100%)',
                        border: '1px solid rgba(201,169,98,0.18)',
                    }}
                >
                    <div className="flex flex-col items-center gap-5 px-6 py-7 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
                        <div
                            className="flex h-[68px] w-[68px] flex-shrink-0 items-center justify-center rounded-full text-[1.35rem] font-semibold text-white"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,169,98,0.35)' }}
                        >
                            {(profile?.full_name || user.email || '?')
                                .split(' ').filter(Boolean).slice(0, 2)
                                .map(p => p[0]).join('').toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1
                                className="truncate text-[1.5rem] font-semibold text-white"
                                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                            >
                                {profile?.full_name || 'Su perfil'}
                            </h1>
                            <p className="mt-0.5 truncate text-[0.8125rem]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                {user.email}
                            </p>
                        </div>

                        {/* La insignia dice el plan sin una palabra. */}
                        <div className="flex flex-shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2"
                             style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                            <Insignia nivel={nivelDePlan(profile?.subscription_type)} tam={22} animada />
                            <span className="text-[0.8125rem] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                                {planColors[profile?.subscription_type || 'gratuito']?.label ?? 'Gratuito'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Aviso de cuenta duplicada. Va arriba del todo porque quien
                    llega aquí creyendo que perdió su plan tiene que verlo antes
                    que nada — si no, escribe a soporte convencido de que se lo
                    quitamos. Salió de un caso real. */}
                {otraCuenta?.hay_otra && (
                    <div className="mb-6 p-5 rounded-2xl border border-accent-gold/60 bg-cream-100">
                        <p className="text-charcoal-900 font-medium mb-2">
                            Tiene otra cuenta con plan de pago
                        </p>
                        <p className="text-sm text-charcoal-700">
                            Está usando una cuenta gratuita, pero encontramos otra a su nombre
                            con una suscripción activa en{' '}
                            <strong className="text-charcoal-900">{otraCuenta.correo_oculto}</strong>.
                            Cierre sesión e ingrese con ese correo para recuperar todas sus
                            funciones. Su suscripción no ha sufrido ningún cambio.
                        </p>
                        <p className="text-sm text-charcoal-700 mt-2">
                            ¿Prefiere usar este correo? Escríbanos a{' '}
                            <a href="mailto:soporte@iurexia.com" className="text-accent-brown underline">
                                soporte@iurexia.com
                            </a>{' '}
                            y trasladamos su suscripción sin costo ni interrupción.
                        </p>
                    </div>
                )}

                {/* ── Rejilla ──────────────────────────────────────────────
                    Antes era UNA columna de nueve tarjetas idénticas: había
                    que rodar toda la página para saber qué hay. En escritorio
                    van a dos columnas, y sólo lo que de verdad manda —la
                    suscripción y el programa de referidos— ocupa el ancho.
                    En móvil vuelve a una sola, que es lo que cabe. */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* Información Personal */}
                <Tarjeta icono={User} titulo="Información personal" acento="carbon"
                    descripcion="Cómo aparece en la plataforma">

                    <div className="space-y-4">
                        {/* Avatar. La foto propia manda sobre la de Google: si el
                            usuario se molestó en subir una, es la que quiere ver. */}
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 rounded-full bg-charcoal-900 flex items-center justify-center text-white font-medium text-2xl overflow-hidden">
                                {(avatarPropio || profile.avatar_url || user.user_metadata?.avatar_url) ? (
                                    <img
                                        src={avatarPropio || profile.avatar_url || user.user_metadata.avatar_url}
                                        alt={profile.full_name || 'Usuario'}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    getInitials()
                                )}
                                {subiendoAvatar && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs">
                                        …
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-charcoal-600">Avatar</p>
                                <p className="text-xs text-charcoal-400 mt-1 mb-2">
                                    {avatarPropio || profile.avatar_url
                                        ? 'Tu foto'
                                        : user.user_metadata?.avatar_url ? 'Desde Google' : 'Iniciales'}
                                </p>
                                <label className={`inline-block cursor-pointer rounded-lg border border-charcoal-300 px-3 py-1.5 text-xs font-medium text-charcoal-800 transition-colors hover:bg-cream-300 ${subiendoAvatar ? 'pointer-events-none opacity-60' : ''}`}>
                                    {subiendoAvatar ? 'Subiendo…' : 'Cambiar foto'}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/heic"
                                        onChange={handleAvatar}
                                        className="hidden"
                                    />
                                </label>
                                <p className="mt-1 text-[11px] text-charcoal-400">JPG, PNG o WebP · hasta 5 MB</p>
                            </div>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                Nombre completo
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={!editingName || saving}
                                    className="flex-1 px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 disabled:bg-gray-50 disabled:text-charcoal-600"
                                />
                                {editingName ? (
                                    <>
                                        <button
                                            onClick={handleSaveName}
                                            disabled={saving}
                                            className="px-4 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingName(false);
                                                setNewName(profile.full_name || '');
                                            }}
                                            className="px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setEditingName(true)}
                                        className="px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                                    >
                                        Editar
                                    </button>
                                )}
                            </div>
                            {saveMessage && (
                                <p className={`text-sm mt-2 ${saveOk ? 'text-green-600' : 'text-red-600'}`}>
                                    {saveMessage}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={user.email || ''}
                                disabled
                                className="w-full px-4 py-2 border border-cream-300 rounded-lg bg-gray-50 text-charcoal-600"
                            />
                            <p className="text-xs text-charcoal-400 mt-1">
                                El correo no puede modificarse
                            </p>
                        </div>
                    </div>
                </Tarjeta>

                {/* Mi Suscripción */}
                <div className="lg:col-span-2">
                <Tarjeta icono={CreditCard} titulo="Mi suscripción" acento="oro"
                    descripcion="Su plan y el consumo del periodo">

                    <div className="space-y-4">
                        {/* Plan actual */}
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${planStyle.bg} ${planStyle.text}`}>
                                Plan {planStyle.label}
                            </span>
                            <span className="text-sm text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Activo
                            </span>
                        </div>

                        {/* Uso de consultas */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-charcoal-700">
                                    Consultas este mes
                                </span>
                                <span className="text-sm text-charcoal-600">
                                    {profile.queries_used}/{profile.queries_limit === -1 ? '∞' : profile.queries_limit}
                                </span>
                            </div>

                            {profile.queries_limit !== -1 && (
                                <>
                                    <div className="w-full bg-cream-300 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-accent-gold h-3 rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(queryPercentage, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-charcoal-500 mt-1">
                                        {queryPercentage.toFixed(0)}% utilizado
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Uso de redacciones (solo Ultra) */}
                        {profile.subscription_type === 'ultra_secretarios' && profile.drafts_limit > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-charcoal-700">
                                        Redacciones de sentencia este mes
                                    </span>
                                    <span className="text-sm text-charcoal-600">
                                        {profile.drafts_used}/{profile.drafts_limit}
                                    </span>
                                </div>
                                <div className="w-full bg-cream-300 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min((profile.drafts_used / profile.drafts_limit) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-charcoal-500 mt-1">
                                    {((profile.drafts_used / profile.drafts_limit) * 100).toFixed(0)}% utilizado
                                </p>
                            </div>
                        )}

                        {/* Detalles de suscripción */}
                        {profile.stripe_subscription_id && (
                            <div className="pt-4 border-t border-cream-300 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-charcoal-600">ID de suscripción</span>
                                    <span className="text-charcoal-900 font-mono text-xs">
                                        {profile.stripe_subscription_id.substring(0, 20)}...
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Cancel success/error message */}
                        {cancelMessage && (
                            <div className={`p-3 rounded-lg text-sm ${cancelMessage.includes('Error') || cancelMessage.includes('error')
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                {cancelMessage}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => router.push('/precios')}
                                className="flex-1 px-4 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors"
                            >
                                Actualizar Plan
                            </button>
                            {profile.stripe_customer_id && (
                                <button
                                    onClick={handleOpenPortal}
                                    disabled={loadingPortal}
                                    className="flex-1 px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50"
                                >
                                    {loadingPortal ? 'Cargando...' : 'Portal de Facturación'}
                                </button>
                            )}
                        </div>

                        {/* Cancel subscription button — only for paid plans */}
                        {profile.stripe_subscription_id && profile.subscription_type !== 'gratuito' && (
                            <div className="pt-3 border-t border-cream-300">
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="text-sm text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Cancelar mi suscripción
                                </button>
                            </div>
                        )}
                    </div>
                </Tarjeta>

                </div>

                {/* Datos Fiscales */}
                <Tarjeta
                    icono={FileText}
                    titulo="Datos fiscales"
                    acento="pizarra"
                    descripcion="Para la factura de su suscripción"
                    accion={
                        <button
                            onClick={() => setShowFiscalForm(!showFiscalForm)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-medium text-charcoal-600 transition-colors hover:bg-charcoal-900/[0.04] hover:text-charcoal-900"
                        >
                            {showFiscalForm ? 'Ocultar' : (fiscalData.rfc ? 'Editar' : 'Agregar')}
                            {!showFiscalForm && <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                    }
                >

                    {/* Summary when collapsed */}
                    {!showFiscalForm && fiscalData.rfc && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-charcoal-600">RFC</span>
                                <span className="text-charcoal-900 font-mono">{fiscalData.rfc}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-charcoal-600">Razón Social</span>
                                <span className="text-charcoal-900">{fiscalData.razon_social}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-charcoal-600">Régimen Fiscal</span>
                                <span className="text-charcoal-900">
                                    {REGIMENES_FISCALES.find(r => r.clave === fiscalData.regimen_fiscal)?.nombre || fiscalData.regimen_fiscal}
                                </span>
                            </div>
                            <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Datos fiscales configurados
                            </p>
                        </div>
                    )}

                    {!showFiscalForm && !fiscalData.rfc && (
                        <p className="text-sm text-charcoal-500">
                            Agrega tus datos fiscales para que tus facturas incluyan tu RFC y razón social.
                        </p>
                    )}

                    {/* Fiscal Data Form */}
                    {showFiscalForm && (
                        <div className="space-y-4">
                            {/* RFC */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    RFC <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={fiscalData.rfc}
                                    onChange={(e) => setFiscalData({ ...fiscalData, rfc: e.target.value.toUpperCase() })}
                                    placeholder="XAXX010101000"
                                    maxLength={13}
                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 font-mono uppercase"
                                />
                                <p className="text-xs text-charcoal-400 mt-1">12 caracteres (persona moral) o 13 (persona física)</p>
                            </div>

                            {/* Razón Social */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    Razón Social / Nombre <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={fiscalData.razon_social}
                                    onChange={(e) => setFiscalData({ ...fiscalData, razon_social: e.target.value })}
                                    placeholder="Nombre como aparece en la Constancia de Situación Fiscal"
                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                                />
                            </div>

                            {/* Régimen Fiscal */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    Régimen Fiscal <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={fiscalData.regimen_fiscal}
                                    onChange={(e) => setFiscalData({ ...fiscalData, regimen_fiscal: e.target.value })}
                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 bg-white"
                                >
                                    <option value="">Selecciona un régimen</option>
                                    {REGIMENES_FISCALES.map((r) => (
                                        <option key={r.clave} value={r.clave}>
                                            {r.clave} — {r.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Código Postal Fiscal */}
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                        Código Postal Fiscal <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={fiscalData.codigo_postal_fiscal}
                                        onChange={(e) => setFiscalData({ ...fiscalData, codigo_postal_fiscal: e.target.value.replace(/\D/g, '') })}
                                        placeholder="06600"
                                        maxLength={5}
                                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 font-mono"
                                    />
                                </div>

                                {/* Uso del CFDI */}
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                        Uso del CFDI
                                    </label>
                                    <select
                                        value={fiscalData.uso_cfdi}
                                        onChange={(e) => setFiscalData({ ...fiscalData, uso_cfdi: e.target.value })}
                                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 bg-white"
                                    >
                                        {USOS_CFDI.map((u) => (
                                            <option key={u.clave} value={u.clave}>
                                                {u.clave} — {u.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Save button */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={handleSaveFiscal}
                                    disabled={fiscalSaving || !fiscalData.rfc || !fiscalData.razon_social || !fiscalData.regimen_fiscal || !fiscalData.codigo_postal_fiscal}
                                    className="px-6 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {fiscalSaving ? 'Guardando...' : 'Guardar Datos Fiscales'}
                                </button>
                                <button
                                    onClick={() => setShowFiscalForm(false)}
                                    className="px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>

                            {fiscalMessage && (
                                <p className={`text-sm mt-2 ${fiscalMessage.includes('Error') || fiscalMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                                    {fiscalMessage}
                                </p>
                            )}

                            <p className="text-xs text-charcoal-400 mt-2">
                                Estos datos se usan para generar tus facturas. Asegúrate de que coincidan con tu Constancia de Situación Fiscal.
                            </p>
                        </div>
                    )}
                </Tarjeta>

                {/* IUREXIA Connect — Solo para PRO/Platinum */}
                {isPro && (
                    <div className="lg:col-span-2">
                    <ConnectLawyerSection
                        userId={user.id}
                        userName={profile.full_name || user.email || ''}
                        avatarUrl={user.user_metadata?.avatar_url}
                    />
                    </div>
                )}

                {/* Admin: Registro de Abogados — Solo para admin */}
                {user.email === ADMIN_EMAIL && (
                    <div className="lg:col-span-2"><AdminLawyerPanel /></div>
                )}

                {/* Detalles de Cuenta */}
                <Tarjeta icono={Shield} titulo="Detalles de cuenta" acento="pizarra"
                    descripcion="Identificadores y estado de verificación">

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-charcoal-600">ID de usuario</span>
                            <span className="text-charcoal-900 font-mono text-xs">
                                {user.id.substring(0, 20)}...
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-charcoal-600">Cuenta creada</span>
                            <span className="text-charcoal-900">
                                {formatDate(user.created_at)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-charcoal-600">Email verificado</span>
                            <span className="text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Verificado
                            </span>
                        </div>
                    </div>
                </Tarjeta>

                {/* Regale Iurexia.
                    Ahora la ve CUALQUIER usuario, no sólo quien paga: el
                    programa anterior estaba cerrado a los clientes y produjo
                    cero invitaciones en seis meses, en parte porque el 91% de
                    los usuarios ni siquiera tenía código.

                    Los días y su vencimiento van al mismo tamaño que el resto,
                    nunca en letra chica: ocultar un término material de una
                    promoción es publicidad engañosa (art. 32 LFPC) y aquí el
                    destinatario es un abogado. */}
                {referidos && (
                    <div className="lg:col-span-2">
                    <Tarjeta icono={Gift} titulo="Regale Iurexia" acento="azul"
                        descripcion={`Regale ${referidos.diasDeBienvenida} días de Pro a un colega y gane los suyos`}>

                        {referidos.premio && (
                            <div className="mb-5 p-4 rounded-lg border border-accent-gold/50 bg-cream-100">
                                <p className="text-sm text-charcoal-900 font-medium mb-1">
                                    Sus días de Pro están activos.
                                </p>
                                <p className="text-sm text-charcoal-700">
                                    Vigentes hasta el{' '}
                                    {new Date(referidos.premio.vence_at).toLocaleDateString('es-MX', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                    {referidos.premio.plan_previo !== 'gratuito'
                                        ? '. Su plan de cobro no cambió: sigue pagando lo mismo de siempre.'
                                        : '. Al terminar, su cuenta vuelve sola al plan gratuito. No se le cobrará nada.'}
                                </p>
                            </div>
                        )}

                        <p className="text-sm text-charcoal-700 mb-5">
                            Cada colega que invite entra con{' '}
                            <strong className="text-charcoal-900">{referidos.diasDeBienvenida} días de Iurexia Pro</strong>,
                            sin tarjeta. Y usted gana los suyos conforme lo vayan usando:
                        </p>

                        {/* La escalera. Se pinta completa para que se vea que
                            paga desde el primero — con la valla anterior en
                            tres, quien traía dos se quedaba sin nada. */}
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            {referidos.escalera.map((p) => {
                                const logrado = referidos.activos >= p.nivel;
                                return (
                                    <div key={p.nivel}
                                        className={`rounded-lg border p-3 text-center transition-colors ${
                                            logrado
                                                ? 'border-accent-gold bg-accent-gold/10'
                                                : 'border-cream-400 bg-cream-50'
                                        }`}>
                                        {/* nowrap y tipografía menor: con «colegas»
                                            completo, los peldaños 3 y 5 partían en
                                            dos líneas y los días quedaban a distinta
                                            altura que los del peldaño 1. */}
                                        <p className={`text-[10px] sm:text-xs uppercase tracking-wider mb-1 whitespace-nowrap ${
                                            logrado ? 'text-accent-brown' : 'text-charcoal-700'
                                        }`}>
                                            {p.nivel} {p.nivel === 1 ? 'colega' : 'colegas'}
                                        </p>
                                        <p className={`text-lg font-medium ${
                                            logrado ? 'text-charcoal-900' : 'text-charcoal-700'
                                        }`}>
                                            {p.dias} días
                                        </p>
                                        {logrado && (
                                            <Check className="w-4 h-4 text-accent-gold mx-auto mt-1" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            {Array.from({ length: referidos.meta }).map((_, i) => (
                                <div key={i}
                                    className={`h-2 flex-1 rounded-full ${
                                        i < referidos.activos ? 'bg-accent-gold' : 'bg-cream-400'
                                    }`}
                                />
                            ))}
                            <span className="text-sm text-charcoal-700 ml-2 whitespace-nowrap">
                                {referidos.activos} de {referidos.meta}
                            </span>
                        </div>
                        <p className="text-sm text-charcoal-700 mb-5">
                            {referidos.siguiente
                                ? <>Le {referidos.siguiente.faltan === 1 ? 'falta' : 'faltan'}{' '}
                                    <strong className="text-charcoal-900">
                                        {referidos.siguiente.faltan} {referidos.siguiente.faltan === 1 ? 'colega' : 'colegas'}
                                    </strong>{' '}
                                    para sus {referidos.siguiente.dias} días.</>
                                : <>Completó la escalera. Gracias por cada colega que nos recomendó.</>}
                            {' '}Cuenta quien verifique su correo y haga al menos una consulta.
                        </p>

                        {/* Compartir. WhatsApp primero y ancho completo en
                            móvil: es donde de verdad se pasan estas cosas
                            entre abogados, y la mayoría abre esto en el
                            teléfono. El texto va redactado como lo escribiría
                            el propio abogado, no como una campaña. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(textoInvitacion(profile?.full_name, referidos.codigo))}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:brightness-95 transition-all"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Enviar por WhatsApp
                            </a>
                            <a
                                href={`mailto:?subject=${encodeURIComponent('Le comparto ' + referidos.diasDeBienvenida + ' días de Iurexia Pro')}&body=${encodeURIComponent(textoInvitacion(profile?.full_name, referidos.codigo))}`}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-cream-400 bg-cream-50 text-charcoal-900 text-sm font-medium hover:bg-cream-100 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                Enviar por correo
                            </a>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-accent-brown mb-2">
                                    O copie su enlace
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={`https://www.iurexia.com/registro?ref=${referidos.codigo}`}
                                        onFocus={(e) => e.currentTarget.select()}
                                        className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-cream-400 bg-cream-50 text-charcoal-900 text-sm font-mono"
                                    />
                                    <button
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(
                                                `https://www.iurexia.com/registro?ref=${referidos.codigo}`,
                                            );
                                            setCopiado(true);
                                            setTimeout(() => setCopiado(false), 2000);
                                        }}
                                        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-charcoal-900 text-cream-100 text-sm font-medium hover:bg-charcoal-800 transition-colors whitespace-nowrap"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        {copiado ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-charcoal-700">
                                O que su colega escriba el código{' '}
                                <strong className="text-charcoal-900 tracking-widest">{referidos.codigo}</strong>{' '}
                                al registrarse.
                            </p>

                            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-sm">
                                <span className="text-charcoal-700">
                                    Invitados:{' '}
                                    <strong className="text-charcoal-900">{referidos.invitados}</strong>
                                </span>
                                <span className="text-charcoal-700">
                                    Ya usándolo:{' '}
                                    <strong className="text-charcoal-900">{referidos.activos}</strong>
                                </span>
                            </div>
                        </div>
                    </Tarjeta>
                    </div>
                )}


                {/* Tratamiento profesional. El nombre no dice el género, y
                    llamarle «El abogado» a una abogada en cada consulta es
                    peor que no personalizar: por eso lo elige cada quien, y
                    el neutro «Lic.» es el valor por omisión. */}
                <Tarjeta icono={User} titulo="¿Cómo prefiere ser nombrado?" acento="carbon"
                    descripcion="Encabeza cada una de sus consultas">
                    <p className="text-sm text-charcoal-700 mb-5">
                        Así encabezaremos sus consultas: «{
                            tratamiento === 'licenciado' ? 'El abogado'
                            : tratamiento === 'licenciada' ? 'La abogada' : 'Lic.'
                        } {profile.full_name || 'su nombre'} pregunta:»
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {([
                            { valor: 'lic', etiqueta: 'Lic. (neutro)' },
                            { valor: 'licenciado', etiqueta: 'El abogado' },
                            { valor: 'licenciada', etiqueta: 'La abogada' },
                        ] as const).map((op) => (
                            <button
                                key={op.valor}
                                onClick={() => guardarTratamiento(op.valor)}
                                disabled={tratamientoGuardando}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    tratamiento === op.valor
                                        ? 'bg-charcoal-900 text-cream-100 border-charcoal-900'
                                        : 'bg-cream-50 text-charcoal-900 border-cream-400 hover:border-accent-gold'
                                }`}
                            >
                                {op.etiqueta}
                            </button>
                        ))}
                    </div>
                </Tarjeta>

                {/* Contraseña — cerraba el ciclo que faltaba: el helper
                    updatePassword() ya existía en lib/supabase, pero no había
                    ninguna pantalla que lo llamara. Sin esto, cambiar de
                    contraseña obligaba a fingir que se había olvidado. */}
                <Tarjeta icono={KeyRound} titulo="Contraseña" acento="pizarra"
                    descripcion="Acceso a su cuenta">

                    <p className="text-sm text-charcoal-700 mb-5">
                        Elija una contraseña nueva de al menos ocho caracteres. Al guardarla,
                        sus otras sesiones seguirán abiertas.
                    </p>

                    <div className="space-y-3 max-w-md">
                        <input
                            type="password"
                            value={nuevaPass}
                            onChange={(e) => { setNuevaPass(e.target.value); setPassMsg(null); }}
                            placeholder="Contraseña nueva"
                            autoComplete="new-password"
                            className="w-full px-4 py-2.5 rounded-lg border border-cream-400 bg-cream-50 text-charcoal-900 text-sm focus:outline-none focus:border-accent-gold"
                        />
                        <input
                            type="password"
                            value={confirmaPass}
                            onChange={(e) => { setConfirmaPass(e.target.value); setPassMsg(null); }}
                            placeholder="Repita la contraseña nueva"
                            autoComplete="new-password"
                            className="w-full px-4 py-2.5 rounded-lg border border-cream-400 bg-cream-50 text-charcoal-900 text-sm focus:outline-none focus:border-accent-gold"
                        />

                        {passMsg && (
                            <p className={`text-sm ${passMsg.ok ? 'text-accent-brown' : 'text-red-700'}`}>
                                {passMsg.texto}
                            </p>
                        )}

                        <button
                            onClick={cambiarContrasena}
                            disabled={passCargando || !nuevaPass || !confirmaPass}
                            className="px-5 py-2.5 rounded-lg bg-charcoal-900 text-cream-100 text-sm font-medium hover:bg-charcoal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {passCargando ? 'Guardando…' : 'Guardar contraseña'}
                        </button>
                    </div>
                </Tarjeta>

                </div>

                {/* Lo irreversible va al final y CALLADO: un botón rojo sólido
                    compitiendo con el resto invita a pulsarlo. Se enciende al
                    pasar el cursor, no antes. */}
                <Tarjeta
                    icono={AlertTriangle}
                    titulo="Eliminar cuenta"
                    acento="rojo"
                    descripcion="Esta acción no se puede deshacer"
                >
                    <p className="mb-4 text-[0.8125rem] leading-relaxed text-charcoal-500">
                        Se borrarán de forma permanente sus conversaciones, carpetas y
                        preferencias. Si sólo desea dejar de pagar, cancele la suscripción
                        desde «Mi suscripción» y conserve su cuenta y su historial.
                    </p>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="rounded-lg border border-red-300 px-3.5 py-2 text-[0.8125rem] font-medium text-red-700 transition-colors hover:bg-red-600 hover:border-red-600 hover:text-white"
                    >
                        Eliminar mi cuenta
                    </button>
                </Tarjeta>
            </main>

            {/* Cancel Subscription Modal */}
            {/* El MISMO diálogo que usa el menú del avatar. Tener dos fue
                justo el error que hizo que la retención no apareciera. */}
            <DialogoRetencion
                abierto={showCancelModal}
                onCerrar={() => setShowCancelModal(false)}
                subscriptionId={profile?.stripe_subscription_id}
                nombrePlan={planStyle.label}
            />

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <h3 className="font-serif text-2xl font-medium text-charcoal-900">
                                ¿Estás seguro?
                            </h3>
                        </div>

                        <p className="text-charcoal-600 mb-4">
                            Esta acción eliminará permanentemente tu cuenta y todos tus datos. No podrás recuperar tu información.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                Escribe <span className="font-mono bg-red-100 px-1">ELIMINAR</span> para confirmar
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                                placeholder="ELIMINAR"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmation('');
                                }}
                                className="flex-1 px-4 py-2 border border-charcoal-300 text-charcoal-900 rounded-lg hover:bg-cream-300 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== 'ELIMINAR'}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Eliminar Cuenta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
