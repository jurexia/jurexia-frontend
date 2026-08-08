'use client';

/**
 * «Aparezca en Iurexia» — la página donde el abogado autoriza su testimonio.
 *
 * El tono es el de un acuerdo entre colegas, no el de un formulario de
 * marketing: se le dice qué se publica, dónde, por cuánto tiempo y cómo se
 * retira, todo al mismo tamaño de letra. El destinatario es abogado; el
 * primero que va a leer las condiciones es él.
 *
 * Las casillas van separadas porque los consentimientos son separados:
 * prestar el logo del despacho no obliga a prestar la cara.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { Gem, Check, Upload, Loader2, ShieldCheck, ExternalLink } from 'lucide-react';

type Autorizacion = {
    despacho: string | null; cargo: string | null; testimonio: string | null;
    enlace: string | null; logo_path: string | null; foto_path: string | null;
    consiente_nombre: boolean; consiente_logo: boolean;
    consiente_foto: boolean; consiente_testimonio: boolean;
    estado: string; revocado_at: string | null; beneficio_at: string | null;
};

/**
 * Una casilla de consentimiento.
 *
 * Vive FUERA del componente a propósito. Definida dentro, cada render crea un
 * tipo de componente NUEVO y React desmonta y vuelve a montar la casilla en
 * lugar de actualizarla — se pierde el foco a media lectura. Ya costó una
 * sesión de diagnóstico en el ChatSidebar; no se repite.
 */
function Casilla({ marcado, alCambiar, titulo, detalle }: {
    marcado: boolean; alCambiar: (v: boolean) => void; titulo: string; detalle: string;
}) {
    return (
        <label className="flex gap-3 p-3 rounded-lg border border-cream-400 bg-white cursor-pointer hover:border-charcoal-300 transition-colors">
            <input type="checkbox" checked={marcado} onChange={e => alCambiar(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-charcoal-900" />
            <span>
                <span className="block text-sm text-charcoal-900 font-medium">{titulo}</span>
                <span className="block text-sm text-charcoal-700 mt-0.5">{detalle}</span>
            </span>
        </label>
    );
}

export default function VitrinaPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [listo, setListo] = useState<{ dias?: number; yaLoTenia?: boolean } | null>(null);
    const [error, setError] = useState('');

    const [despacho, setDespacho] = useState('');
    const [cargo, setCargo] = useState('');
    const [testimonio, setTestimonio] = useState('');
    const [enlace, setEnlace] = useState('');
    const [logoPath, setLogoPath] = useState<string | null>(null);
    const [fotoPath, setFotoPath] = useState<string | null>(null);
    const [subiendo, setSubiendo] = useState<'logo' | 'foto' | null>(null);

    const [cNombre, setCNombre] = useState(false);
    const [cLogo, setCLogo] = useState(false);
    const [cFoto, setCFoto] = useState(false);
    const [cTestimonio, setCTestimonio] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [loading, user, router]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;
                const r = await fetch('/api/vitrina', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (r.ok) {
                    const { autorizacion } = await r.json();
                    const a: Autorizacion | null = autorizacion;
                    if (a) {
                        setDespacho(a.despacho || ''); setCargo(a.cargo || '');
                        setTestimonio(a.testimonio || ''); setEnlace(a.enlace || '');
                        setLogoPath(a.logo_path); setFotoPath(a.foto_path);
                        setCNombre(a.consiente_nombre); setCLogo(a.consiente_logo);
                        setCFoto(a.consiente_foto); setCTestimonio(a.consiente_testimonio);
                    }
                }
            } finally {
                setCargando(false);
            }
        })();
    }, [user]);

    const subir = useCallback(async (archivo: File, cual: 'logo' | 'foto') => {
        if (!user) return;
        setError('');
        if (archivo.size > 5 * 1024 * 1024) {
            setError('El archivo pesa más de 5 MB. Mándelo un poco más ligero.');
            return;
        }
        setSubiendo(cual);
        try {
            const ext = archivo.name.split('.').pop()?.toLowerCase() || 'png';
            // La ruta EMPIEZA con el id del usuario: es lo que la política de
            // almacenamiento comprueba para que nadie toque lo de otro.
            const ruta = `${user.id}/${cual}.${ext}`;
            const { error: e } = await supabase.storage
                .from('vitrina').upload(ruta, archivo, { upsert: true });
            if (e) throw e;
            cual === 'logo' ? setLogoPath(ruta) : setFotoPath(ruta);
        } catch {
            setError('No se pudo subir el archivo. Intente de nuevo.');
        } finally {
            setSubiendo(null);
        }
    }, [user]);

    const enviar = async () => {
        setError(''); setGuardando(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch('/api/vitrina', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    despacho, cargo, testimonio, enlace,
                    logo_path: logoPath, foto_path: fotoPath,
                    consiente_nombre: cNombre, consiente_logo: cLogo,
                    consiente_foto: cFoto, consiente_testimonio: cTestimonio,
                }),
            });
            const j = await r.json();
            if (!r.ok) { setError(j.error || 'No se pudo guardar.'); return; }
            setListo(j.beneficio || {});
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            setError('No se pudo guardar. Intente de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    if (loading || cargando) {
        return (
            <div className="min-h-screen bg-cream-50">
                <Navbar />
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-6 h-6 animate-spin text-charcoal-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {listo ? (
                    <div className="rounded-2xl border border-accent-gold/50 bg-white p-6 sm:p-8">
                        <div className="w-11 h-11 rounded-full bg-charcoal-900 flex items-center justify-center mb-4">
                            <Check className="w-5 h-5 text-cream-100" />
                        </div>
                        <h1 className="text-2xl font-serif text-charcoal-900 mb-3">
                            Recibido, y gracias.
                        </h1>
                        <p className="text-charcoal-700 mb-4">
                            {listo.yaLoTenia
                                ? 'Su cuenta ya está en Platinum, así que no hay nada que subirle — pero el reconocimiento queda.'
                                : <>Su periodo de prueba <strong className="text-charcoal-900">Platinum
                                    ya está activo</strong> —{listo.dias ?? 90} días—, sin cargo y sin
                                    renovación automática.</>}
                        </p>
                        <p className="text-sm text-charcoal-700">
                            Revisaremos lo que envió antes de publicarlo. Nada aparece en el sitio
                            hasta entonces, y puede retirarlo cuando quiera escribiéndonos a
                            soporte@iurexia.com.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal-900 text-cream-100 text-[11px] font-medium tracking-wide mb-4">
                                <Gem className="w-3 h-3" /> INVITACIÓN
                            </span>
                            <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900 mb-4 leading-tight">
                                Aparezca en Iurexia
                            </h1>
                            <p className="text-charcoal-700 leading-relaxed">
                                Le escribimos porque usted usa Iurexia de verdad, y eso pesa más que
                                cualquier cosa que podamos decir nosotros de nosotros mismos. Nos
                                gustaría que otros colegas lo supieran.
                            </p>
                        </div>

                        <div className="rounded-xl border border-accent-gold/50 bg-white p-5 mb-8">
                            <p className="text-xs uppercase tracking-wider text-accent-brown mb-3">
                                Lo que recibe a cambio
                            </p>
                            <ul className="space-y-2 text-sm text-charcoal-700">
                                <li className="flex gap-2">
                                    <Check className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
                                    <span><strong className="text-charcoal-900">Acceso a un periodo de
                                        prueba Platinum</strong>, si lo desea. Sin cargo y sin renovación
                                        automática: al terminar, su cuenta vuelve sola al plan que traía.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Check className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
                                    <span><strong className="text-charcoal-900">Su ficha enlazada</strong> desde
                                        nuestro sitio hacia su despacho o su perfil profesional. Quien
                                        llegue buscando un abogado, lo encuentra a usted.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-charcoal-900 mb-1.5">
                                    Su nombre, tal como quiere que aparezca
                                </label>
                                <input readOnly value={profile?.full_name || ''}
                                    className="w-full px-4 py-2.5 rounded-lg border border-cream-400 bg-cream-100 text-charcoal-700 text-sm" />
                                <p className="text-xs text-charcoal-500 mt-1">
                                    Si quiere cambiarlo, edítelo en su perfil antes de enviar.
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-900 mb-1.5">
                                        Despacho <span className="text-charcoal-500 font-normal">(opcional)</span>
                                    </label>
                                    <input value={despacho} onChange={e => setDespacho(e.target.value)}
                                        placeholder="Nombre de su firma"
                                        className="w-full px-4 py-2.5 rounded-lg border border-cream-400 bg-white text-charcoal-900 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-900 mb-1.5">
                                        Cargo <span className="text-charcoal-500 font-normal">(opcional)</span>
                                    </label>
                                    <input value={cargo} onChange={e => setCargo(e.target.value)}
                                        placeholder="Socio, litigante, asociado…"
                                        className="w-full px-4 py-2.5 rounded-lg border border-cream-400 bg-white text-charcoal-900 text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-900 mb-1.5">
                                    Su testimonio
                                </label>
                                <textarea value={testimonio} onChange={e => setTestimonio(e.target.value)} rows={5}
                                    placeholder="En qué le ha servido, con sus palabras. Lo concreto convence más que lo elogioso: qué hacía antes, qué hace ahora, cuánto tiempo le ahorra."
                                    className="w-full px-4 py-3 rounded-lg border border-cream-400 bg-white text-charcoal-900 text-sm resize-y" />
                                <p className="text-xs text-charcoal-500 mt-1">
                                    Lo escribe usted y se publica tal cual. No lo redactamos ni lo
                                    maquillamos: un testimonio escrito por nosotros no sería suyo.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-900 mb-1.5">
                                    Enlace a su despacho o perfil profesional
                                </label>
                                <input value={enlace} onChange={e => setEnlace(e.target.value)}
                                    placeholder="https://"
                                    className="w-full px-4 py-2.5 rounded-lg border border-cream-400 bg-white text-charcoal-900 text-sm" />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {([
                                    ['logo', 'Logo del despacho', 'PNG con fondo transparente', logoPath, 'image/png,image/svg+xml'],
                                    ['foto', 'Fotografía profesional', 'JPG o PNG, de frente', fotoPath, 'image/png,image/jpeg'],
                                ] as const).map(([cual, titulo, pista, ruta, acepta]) => (
                                    <div key={cual}>
                                        <label className="block text-sm font-medium text-charcoal-900 mb-1.5">
                                            {titulo} <span className="text-charcoal-500 font-normal">(opcional)</span>
                                        </label>
                                        <label className={`flex items-center justify-center gap-2 px-4 py-6 rounded-lg border border-dashed cursor-pointer transition-colors ${
                                            ruta ? 'border-accent-gold bg-accent-gold/5 text-charcoal-900'
                                                 : 'border-cream-400 bg-white text-charcoal-700 hover:border-charcoal-300'}`}>
                                            <input type="file" accept={acepta} className="hidden"
                                                onChange={e => { const f = e.target.files?.[0]; if (f) subir(f, cual); }} />
                                            {subiendo === cual
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : ruta ? <Check className="w-4 h-4 text-accent-gold" />
                                                       : <Upload className="w-4 h-4" />}
                                            <span className="text-sm">{ruta ? 'Recibido' : 'Subir archivo'}</span>
                                        </label>
                                        <p className="text-xs text-charcoal-500 mt-1">{pista}</p>
                                    </div>
                                ))}
                            </div>

                            {/* El consentimiento. Va desglosado y al mismo tamaño que todo lo
                                demás: esconder un término material de una promoción es
                                publicidad engañosa (art. 32 LFPC), y aquí el lector es abogado. */}
                            <div className="pt-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldCheck className="w-4 h-4 text-charcoal-500" />
                                    <p className="text-sm font-medium text-charcoal-900">
                                        Qué autoriza, exactamente
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Casilla marcado={cNombre} alCambiar={setCNombre}
                                        titulo="Mi nombre y mi estado"
                                        detalle="Lo mínimo para que la mención tenga sentido." />
                                    <Casilla marcado={cTestimonio} alCambiar={setCTestimonio}
                                        titulo="Mi testimonio, tal como lo escribí"
                                        detalle="Se publica íntegro; no se edita ni se recorta sin consultarle." />
                                    <Casilla marcado={cFoto} alCambiar={setCFoto}
                                        titulo="Mi fotografía"
                                        detalle="Sólo junto a mi testimonio. Nunca en publicidad pagada sin avisarle antes." />
                                    <Casilla marcado={cLogo} alCambiar={setCLogo}
                                        titulo="El logo de mi despacho"
                                        detalle="Declaro estar facultado para autorizar su uso con este fin." />
                                </div>

                                <p className="text-sm text-charcoal-700 mt-4 leading-relaxed">
                                    El alcance es la publicación en el sitio de Iurexia y sus materiales
                                    de difusión, <strong className="text-charcoal-900">mientras usted no
                                    lo revoque</strong>. Puede retirarlo cuando quiera, sin explicar por
                                    qué y conservando su periodo de prueba: si retirarlo costara el
                                    acceso, no sería un derecho sino una multa. Escriba a
                                    soporte@iurexia.com y lo bajamos.
                                </p>
                                <p className="text-sm text-charcoal-700 mt-2">
                                    Nada se publica de inmediato: primero lo revisamos con usted.
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                    {error}
                                </p>
                            )}

                            <button onClick={enviar} disabled={guardando || !cNombre}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-charcoal-900 text-cream-100 font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gem className="w-4 h-4" />}
                                {guardando ? 'Enviando…' : 'Autorizar mi participación'}
                            </button>

                            <a href="/privacidad" target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 text-xs text-charcoal-500 hover:text-charcoal-700">
                                Aviso de privacidad <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
