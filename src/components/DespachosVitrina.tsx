'use client';

/**
 * La franja de despachos, justo debajo del vídeo del inicio.
 *
 * Es lo primero que ve un abogado que llega a evaluarnos, y contesta la
 * pregunta que se hace antes que ninguna otra: quién más está usando esto.
 *
 * REGLAS QUE NO SE NEGOCIAN
 * -------------------------
 * · Sólo aparecen los despachos con autorización en estado «publicada» y sin
 *   revocar. Nada se pinta por descuido.
 * · Si no hay ninguno, la franja NO se renderiza. Un escaparate con tres
 *   huecos grises dice lo contrario de lo que se pretende.
 * · `?vitrina=demo` enseña los huecos rotulados «su logotipo aquí». Sirve
 *   para la captura del correo de invitación: al abogado hay que ENSEÑARLE
 *   dónde va a estar su firma, no describírselo.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Firma = { despacho: string; logo_url: string; enlace: string | null };

export default function DespachosVitrina() {
    const params = useSearchParams();
    const demo = params?.get('vitrina') === 'demo';
    const [firmas, setFirmas] = useState<Firma[]>([]);

    useEffect(() => {
        if (demo) return;
        fetch('/api/vitrina/publicadas')
            .then(r => r.ok ? r.json() : { firmas: [] })
            .then(j => setFirmas(j.firmas ?? []))
            .catch(() => null);
    }, [demo]);

    if (!demo && firmas.length === 0) return null;

    return (
        <section className="border-y border-charcoal-900/[0.06] bg-cream-100/60 py-8 sm:py-10 px-4">
            <div className="max-w-5xl mx-auto">
                <p className="text-center text-[11px] uppercase tracking-[0.16em] text-accent-brown mb-6">
                    Despachos que ejercen con Iurexia
                </p>

                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
                    {demo
                        ? [0, 1, 2, 3].map(i => (
                            <div key={i}
                                className="h-12 w-36 rounded-lg border-2 border-dashed border-accent-gold/70 bg-white/70 flex items-center justify-center">
                                <span className="text-[10px] uppercase tracking-wider text-accent-brown text-center leading-tight px-2">
                                    Su logotipo<br />aquí
                                </span>
                            </div>
                        ))
                        : firmas.map((f, i) => {
                            const img = (
                                <img src={f.logo_url} alt={f.despacho}
                                    className="h-12 w-auto max-w-[150px] object-contain opacity-75 hover:opacity-100 transition-opacity" />
                            );
                            return f.enlace
                                ? <a key={i} href={f.enlace} target="_blank" rel="noopener noreferrer"
                                    title={f.despacho}>{img}</a>
                                : <span key={i} title={f.despacho}>{img}</span>;
                        })}
                </div>
            </div>
        </section>
    );
}
