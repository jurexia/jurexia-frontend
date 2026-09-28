'use client';

/* ═══ LOS DATOS DEL DESPACHO, EN EL PERFIL (28-sep-2026) ══════════════════
   Lo que el abogado escribe igual en todos sus escritos. Se guarda en la
   cuenta y la redacción lo usa en el proemio, el domicilio procesal, los
   autorizados, la firma, el lugar y la fecha. Ver `@/lib/despacho`. */

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    ROLES_DESPACHO, TOPES_DESPACHO, fijarDespacho, normalizarDespacho,
    type CampoDespacho, type Despacho,
} from '@/lib/despacho';

const CAMPOS: ReadonlyArray<{ campo: CampoDespacho; etiqueta: string; ayuda: string; renglones?: number }> = [
    { campo: 'nombre', etiqueta: 'Nombre con que firma', ayuda: 'Lic. María López Hernández' },
    { campo: 'cedula', etiqueta: 'Cédula profesional', ayuda: '1234567' },
    { campo: 'domicilio', etiqueta: 'Domicilio para oír y recibir notificaciones', ayuda: 'Calle, número, colonia, alcaldía o municipio, código postal', renglones: 2 },
    { campo: 'contacto', etiqueta: 'Correo o teléfono para notificaciones', ayuda: 'notificaciones@despacho.mx · 55 1234 5678' },
    { campo: 'autorizados', etiqueta: 'Autorizados para oír notificaciones', ayuda: 'Lic. Pedro Ruiz (cédula 7654321) y Ana Soto, pasante', renglones: 2 },
    { campo: 'ciudad', etiqueta: 'Ciudad, para el lugar y la fecha', ayuda: 'Ciudad de México' },
];

/** Lo guarda en la cuenta; el evento de sesión lo vuelve a fijar, y aquí se
 *  fija en seguida para que la siguiente consulta ya lo lleve. */
async function guardarEnLaCuenta(d: Despacho | null): Promise<string | null> {
    const { error } = await supabase.auth.updateUser({ data: { despacho: d } });
    if (error) return error.message;
    fijarDespacho(d);
    return null;
}

interface Props {
    /** Lo guardado en la cuenta (`user.user_metadata.despacho`). */
    inicial: unknown;
    /** Para probarlo sin cuenta; por omisión, Supabase. */
    guardar?: (d: Despacho | null) => Promise<string | null>;
}

export default function DespachoFormulario({ inicial, guardar = guardarEnLaCuenta }: Props) {
    const [datos, setDatos] = useState<Despacho>(() => normalizarDespacho(inicial) ?? {});
    const [estado, setEstado] = useState<'quieto' | 'guardando' | 'guardado' | 'error'>('quieto');
    const [error, setError] = useState('');
    // Si la sesión llega después de montar, lo guardado aparece. Por su
    // contenido y no por el objeto: cada renovación del token trae un objeto
    // nuevo, y reescribir aquí borraría lo que el abogado está tecleando.
    const guardado = JSON.stringify(normalizarDespacho(inicial));
    useEffect(() => { setDatos(normalizarDespacho(JSON.parse(guardado)) ?? {}); }, [guardado]);

    const cambiar = (campo: keyof Despacho, valor: string) => {
        setDatos((d) => ({ ...d, [campo]: valor }));
        setEstado('quieto');
    };

    const enviar = async () => {
        setEstado('guardando');
        const fallo = await guardar(normalizarDespacho(datos));
        if (fallo) { setError(fallo); setEstado('error'); return; }
        setEstado('guardado');
    };

    return (
        <div className="space-y-5">
            <p className="text-sm text-charcoal-700">
                Lo que escribe igual en todos sus escritos. Al redactar, Iurexia lo pone en el
                proemio, el domicilio procesal, los autorizados, la firma y la fecha, en vez de
                dejarlo como <span className="whitespace-nowrap font-medium">[DATO PENDIENTE]</span>.
                Los datos de su cliente siguen saliendo de cada caso.
            </p>

            <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-charcoal-900">¿Desde dónde escribe?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                    {ROLES_DESPACHO.map((r) => (
                        <label key={r.valor}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${datos.rol === r.valor
                                ? 'border-charcoal-900 bg-cream-50'
                                : 'border-cream-400 hover:border-accent-gold'}`}>
                            <input type="radio" name="rol-despacho" value={r.valor} checked={datos.rol === r.valor}
                                onChange={() => cambiar('rol', r.valor)} className="mt-1 accent-charcoal-900" />
                            <span>
                                <span className="block text-sm font-medium text-charcoal-900">{r.etiqueta}</span>
                                <span className="block text-xs text-charcoal-500">{r.detalle}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                {CAMPOS.map(({ campo, etiqueta, ayuda, renglones }) => (
                    <label key={campo} className={`block ${renglones ? 'sm:col-span-2' : ''}`}>
                        <span className="mb-1 block text-[13px] font-medium text-charcoal-900">{etiqueta}</span>
                        {renglones ? (
                            <textarea
                                name={campo}
                                value={datos[campo] ?? ''}
                                onChange={(e) => cambiar(campo, e.target.value)}
                                placeholder={ayuda}
                                maxLength={TOPES_DESPACHO[campo]}
                                rows={renglones}
                                className="w-full resize-y rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm text-charcoal-900 focus:border-accent-gold focus:outline-none"
                            />
                        ) : (
                            <input
                                name={campo}
                                value={datos[campo] ?? ''}
                                onChange={(e) => cambiar(campo, e.target.value)}
                                placeholder={ayuda}
                                maxLength={TOPES_DESPACHO[campo]}
                                className="w-full rounded-lg border border-cream-400 bg-cream-50 px-3 py-2 text-sm text-charcoal-900 focus:border-accent-gold focus:outline-none"
                            />
                        )}
                    </label>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={enviar} disabled={estado === 'guardando'}
                    className="rounded-lg bg-charcoal-900 px-5 py-2.5 text-sm font-medium text-cream-100 transition-colors hover:bg-charcoal-800 disabled:opacity-40">
                    {estado === 'guardando' ? 'Guardando…' : 'Guardar datos del despacho'}
                </button>
                {estado === 'guardado' && (
                    <span role="status" className="inline-flex items-center gap-1.5 text-sm text-accent-brown">
                        <Check className="h-4 w-4" /> Guardados. Los próximos escritos ya los llevan.
                    </span>
                )}
                {estado === 'error' && (
                    <span role="alert" className="text-sm text-red-700">No se guardaron: {error}</span>
                )}
            </div>
        </div>
    );
}
