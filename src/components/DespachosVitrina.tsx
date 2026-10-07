'use client';

/**
 * La franja de despachos, justo debajo del vídeo del inicio.
 *
 * Es lo primero que ve un abogado que llega a evaluarnos, y contesta la
 * pregunta que se hace antes que ninguna otra: quién más está usando esto.
 *
 * REGLAS QUE NO SE NEGOCIAN
 * -------------------------
 * · Sólo aparecen despachos que autorizaron su aparición. Los de la base
 *   (`/api/vitrina/publicadas`) tienen el consentimiento asentado en
 *   `vitrina_autorizaciones`: «publicada», con logotipo y sin revocar.
 * · Los de AUTORIZADOS_DIRECTO lo dieron en persona a David (5-oct-2026) y no
 *   tenían logotipo: Iurexia se lo diseñó y se lo entregó
 *   (IUREXIA-MAC/logotipos-despachos). Si alguno retira el permiso, sale de
 *   la lista.
 * · Nunca un despacho inventado: la franja afirma que ejercen con Iurexia.
 * · `?vitrina=demo` enseña los huecos rotulados «su logotipo aquí». Sirve
 *   para la captura del correo de invitación: al abogado hay que ENSEÑARLE
 *   dónde va a estar su firma, no describírselo.
 *
 * LA TIRA (5-oct-2026, pedida por David): los logotipos desfilan de izquierda
 * a derecha, traslúcidos, y se detienen al pasar el puntero. Cada uno toma su
 * altura según su proporción —los muy anchos, más bajos; los verticales, más
 * altos— para que todos pesen parecido a la vista. Con «reducir movimiento»
 * no se mueven: quedan en una fila centrada (globals.css, «El desfile»).
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Firma = { despacho: string; logo_url: string; enlace: string | null };

const AUTORIZADOS_DIRECTO: Firma[] = [
    { despacho: 'Almazán y Leyva', logo_url: '/web/despachos/almazan-y-leyva.webp', enlace: null },
    { despacho: 'Dos Burgos y Asociados', logo_url: '/web/despachos/dos-burgos-y-asociados.webp', enlace: null },
    { despacho: 'Ramírez y Guerrero Consultores', logo_url: '/web/despachos/ramirez-y-guerrero-consultores.webp', enlace: null },
    { despacho: 'Pérez Rojas Corporativo', logo_url: '/web/despachos/perez-rojas-corporativo.webp', enlace: null },
];

const VELOCIDAD = 42; // px por segundo, la misma con pocos o con muchos despachos

/** a1, b1, a2, b2…: los de la base y los autorizados en persona, mezclados. */
function intercalar<T>(a: T[], b: T[]): T[] {
    const fuera: T[] = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (i < a.length) fuera.push(a[i]);
        if (i < b.length) fuera.push(b[i]);
    }
    return fuera;
}

/** La altura según la proporción (ancho/alto), entre 46 y 96 px. */
function alturaPara(ancho: number, alto: number) {
    if (!ancho || !alto) return 64;
    return Math.round(Math.min(96, Math.max(46, 72 * Math.pow(ancho / alto / 2.5, -0.4))));
}

function Logo({ firma, copia }: { firma: Firma; copia: boolean }) {
    const ref = useRef<HTMLImageElement>(null);
    const [alto, setAlto] = useState(64);

    // Si la imagen ya estaba cargada antes de hidratar, onLoad no llega: se mide aquí.
    useEffect(() => {
        const im = ref.current;
        if (im?.complete && im.naturalWidth) setAlto(alturaPara(im.naturalWidth, im.naturalHeight));
    }, []);

    const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            ref={ref}
            src={firma.logo_url}
            alt={copia ? '' : firma.despacho}
            draggable={false}
            onLoad={(e) => setAlto(alturaPara(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))}
            style={{ height: `calc(${alto}px * var(--escala-desfile, 1))` }}
            className="w-auto max-w-none select-none object-contain opacity-60 transition-opacity duration-300 hover:opacity-100"
        />
    );

    // Cada logotipo lleva su aire a los dos lados (no `gap`): así media pista mide
    // exactamente un ciclo y el desfile no salta al volver a empezar.
    return (
        <li data-copia={copia ? '' : undefined} aria-hidden={copia || undefined} className="flex shrink-0 items-center px-7 sm:px-11">
            {firma.enlace ? (
                <a href={firma.enlace} target="_blank" rel="noopener noreferrer" title={firma.despacho} tabIndex={copia ? -1 : undefined}>
                    {img}
                </a>
            ) : (
                <span title={firma.despacho}>{img}</span>
            )}
        </li>
    );
}

export default function DespachosVitrina() {
    const params = useSearchParams();
    const demo = params?.get('vitrina') === 'demo';
    const [firmas, setFirmas] = useState<Firma[]>([]);
    const pista = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (demo) return;
        fetch('/api/vitrina/publicadas')
            .then((r) => (r.ok ? r.json() : { firmas: [] }))
            .then((j) => setFirmas(j.firmas ?? []))
            .catch(() => null);
    }, [demo]);

    const lista = intercalar(firmas, AUTORIZADOS_DIRECTO);
    // Media pista tiene que cubrir pantallas anchas: con pocos despachos, la lista va dos veces.
    const mitad = lista.length < 10 ? [...lista, ...lista] : lista;

    // La duración sale del ancho real, para que la velocidad no dependa de cuántos haya.
    useEffect(() => {
        const el = pista.current;
        if (!el) return;
        const ajustar = () => el.style.setProperty('--duracion', `${Math.max(20, el.scrollWidth / 2 / VELOCIDAD).toFixed(1)}s`);
        ajustar();
        const obs = new ResizeObserver(ajustar);
        obs.observe(el);
        return () => obs.disconnect();
    }, [lista.length]);

    if (demo) {
        return (
            <section className="border-y border-charcoal-900/[0.06] bg-cream-100/60 px-4 py-8 sm:py-10">
                <div className="mx-auto max-w-5xl">
                    <p className="mb-6 text-center text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">Despachos que ejercen con Iurexia</p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex h-12 w-36 items-center justify-center rounded-lg border-2 border-dashed border-accent-gold/70 bg-white/70">
                                <span className="px-2 text-center text-[10px] uppercase leading-tight tracking-wider text-accent-brown">
                                    Su logotipo
                                    <br />
                                    aquí
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    const borde = 'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)';
    return (
        <section aria-labelledby="despachos-titulo" className="border-y border-charcoal-900/[0.06] bg-cream-100/60 py-9 sm:py-12">
            <p id="despachos-titulo" className="px-4 text-center text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">
                Despachos que ejercen con Iurexia
            </p>
            <div className="desfile-marco mt-7 overflow-hidden sm:mt-9" style={{ maskImage: borde, WebkitMaskImage: borde }}>
                <ul ref={pista} aria-labelledby="despachos-titulo" className="desfile flex w-max items-center">
                    {mitad.map((f, i) => (
                        <Logo key={`a${i}`} firma={f} copia={i >= lista.length} />
                    ))}
                    {mitad.map((f, i) => (
                        <Logo key={`b${i}`} firma={f} copia />
                    ))}
                </ul>
            </div>
        </section>
    );
}
