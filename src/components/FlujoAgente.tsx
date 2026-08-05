'use client';

import { useEffect, useMemo, useRef } from 'react';
import { BookText, Check, Globe, Loader2, Scale, Link2, Landmark, Search } from 'lucide-react';
import { ESTADOS_MEXICO } from '@/lib/estados';

/**
 * El pipeline, visible mientras trabaja — versión ramificada.
 *
 * Cada fila se enciende con un marcador real que el backend emite desde el
 * punto exacto del pipeline (`<!--PASO:nombre|detalle-->`). Nada avanza por
 * temporizador: si una etapa no ocurrió, no se pinta.
 *
 * ─── LA RAMIFICACIÓN ────────────────────────────────────────────────────
 * Una espina central dorada que se va llenando hacia abajo, con las etapas
 * alternando derecha e izquierda como ramas de un árbol de decisión. Es la
 * lectura visual del multiagente: consultas que se abren en paralelo y
 * convergen en la respuesta. En móvil colapsa a columna simple — la pantalla
 * no da para ramas y forzarlas la volvería ilegible.
 *
 * ─── LA MESURA DE LOS EFECTOS ───────────────────────────────────────────
 * Las fichas entran con rebote de resorte y las etapas completadas emiten una
 * onda dorada que se disuelve. Lo que NO hay: sacudidas de pantalla. En una
 * consulta sobre un embargo, el exceso de fuegos artificiales resta la
 * seriedad que la marca construye. El límite: efectos que digan «precisión de
 * máquina», no «videojuego». Todo respeta prefers-reduced-motion (los
 * keyframes se anulan en globals.css), y la vibración háptica en móvil dura
 * 10 ms — se siente, no molesta.
 *
 * ─── LA CABECERA ────────────────────────────────────────────────────────
 * «Lic. María García pregunta:» con su fotografía de perfil o su monograma.
 * El tratamiento lo elige el usuario en /perfil ('El abogado' / 'La abogada');
 * el neutro «Lic.» es el valor por omisión porque el nombre no dice el género
 * y equivocarse en cada consulta es peor que no personalizar.
 *
 * Sobre el Semanario: balanza genérica y nombre escrito, NO el emblema del
 * SJF. Reproducir la marca de un órgano del Estado en material comercial es
 * un problema que no hace falta tener.
 */

export type Paso = { nombre: string; detalle?: string };

type Ficha = { texto: string; icono: 'ley' | 'balanza' | 'web' | 'enlace' | 'sede' };

const ETAPAS: { nombre: string; titulo: string; glosa: string }[] = [
    { nombre: 'entender', titulo: 'Leyendo la consulta', glosa: 'Materia, jurisdicción y artículos citados' },
    { nombre: 'jurisdiccion', titulo: 'Fijando la jurisdicción', glosa: 'Para no mezclar legislación de otro estado' },
    { nombre: 'expandir', titulo: 'Ampliando la búsqueda', glosa: 'Sinónimos jurídicos y figuras equivalentes' },
    { nombre: 'buscar', titulo: 'Recorriendo el acervo', glosa: 'Artículo por artículo, con su fuente' },
    { nombre: 'precedentes', titulo: 'Buscando precedentes', glosa: 'Jurisprudencia y tesis aisladas' },
    { nombre: 'web', titulo: 'Consultando fuentes en línea', glosa: 'Reformas y publicaciones recientes' },
    { nombre: 'cruzar', titulo: 'Cruzando artículos citados', glosa: 'Trae el texto de lo que el precedente invoca' },
    { nombre: 'ordenar', titulo: 'Ordenando por pertinencia', glosa: 'Lo aplicable primero' },
    { nombre: 'redactar', titulo: 'Redactando con sus citas', glosa: 'Cada afirmación con su fuente' },
];

const ICONOS = {
    ley: BookText,
    balanza: Scale,
    web: Globe,
    enlace: Link2,
    sede: Landmark,
} as const;

/** Las fichas de cada etapa, construidas con lo que el backend informó. */
function fichasDe(nombre: string, detalle: string | undefined, fuentes: number | null): Ficha[] {
    if (nombre === 'buscar') {
        const f: Ficha[] = [
            { texto: 'Legislación federal', icono: 'ley' },
            { texto: '32 entidades', icono: 'sede' },
        ];
        if (fuentes !== null) f.push({ texto: `${fuentes} fuentes`, icono: 'enlace' });
        return f;
    }
    if (nombre === 'precedentes' && detalle && detalle !== '0') {
        return [
            { texto: 'Semanario Judicial', icono: 'balanza' },
            { texto: `${detalle} precedentes`, icono: 'enlace' },
        ];
    }
    if (nombre === 'web' && detalle) {
        // Dominios REALES devueltos por el anclaje. «dof.gob.mx» convence;
        // «3 sitios» no dice nada.
        return detalle.split(',').filter(Boolean).slice(0, 3)
            .map((d) => ({ texto: d.trim(), icono: 'web' as const }));
    }
    if (nombre === 'jurisdiccion' && detalle) {
        const nombreEstado = ESTADOS_MEXICO.find((e) => e.value === detalle)?.label ?? detalle;
        return [{ texto: nombreEstado, icono: 'sede' }];
    }
    if (nombre === 'cruzar' && detalle && detalle !== '0') {
        return [{ texto: `${detalle} artículos recuperados`, icono: 'ley' }];
    }
    if (nombre === 'ordenar' && detalle) {
        return [{ texto: `${detalle} resultados`, icono: 'enlace' }];
    }
    return [];
}

const TRATAMIENTOS: Record<string, string> = {
    licenciado: 'El abogado',
    licenciada: 'La abogada',
    lic: 'Lic.',
};

interface Props {
    pasos: Paso[];
    sourcesCount: number | null;
    consulta?: string;
    /** Para la cabecera personal: nombre, foto y tratamiento del perfil. */
    nombre?: string | null;
    avatarUrl?: string | null;
    tratamiento?: string | null;
    redactando?: boolean;
    retryMessage?: string;
    retryType?: string;
}

export function FlujoAgente({
    pasos, sourcesCount, consulta, nombre, avatarUrl, tratamiento,
    redactando, retryMessage, retryType,
}: Props) {
    const filas = useMemo(() => {
        const vistos = new Map(pasos.map((p) => [p.nombre, p.detalle]));
        const ultimo = pasos.length ? pasos[pasos.length - 1].nombre : null;

        /* Sólo las etapas que de verdad ocurrieron: una fila apagada de
           precedentes en un pipeline sin precedentes promete trabajo que
           nadie hizo. */
        return ETAPAS.filter((e) => vistos.has(e.nombre) || (e.nombre === 'redactar' && redactando))
            .map((e) => ({
                ...e,
                activo: e.nombre === 'redactar' ? !!redactando : e.nombre === ultimo && !redactando,
                fichas: fichasDe(e.nombre, vistos.get(e.nombre), e.nombre === 'buscar' ? sourcesCount : null),
            }));
    }, [pasos, sourcesCount, redactando]);

    /* Vibración háptica de 10 ms por etapa completada, sólo en móvil y sólo
       si el usuario no pidió movimiento reducido. Se siente, no molesta. */
    const completadasPrevias = useRef(0);
    useEffect(() => {
        const completadas = filas.filter((f) => !f.activo).length;
        if (completadas > completadasPrevias.current) {
            completadasPrevias.current = completadas;
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                navigator.vibrate(10);
            }
        }
    }, [filas]);

    if (retryMessage) {
        const esFrio = retryType === 'cold';
        return (
            <div className="flex gap-4 justify-start animate-slide-up">
                <div className="message-assistant px-4 py-4 border-l-2 border-accent-gold">
                    <p className="text-charcoal-900 font-medium text-sm">
                        {esFrio ? 'Despertando el servidor' : 'El servidor está atendiendo varias solicitudes'}
                    </p>
                    <p className="text-charcoal-700 text-xs mt-1">{retryMessage}</p>
                </div>
            </div>
        );
    }

    const nombreLimpio = (nombre ?? '').trim();
    const prefijo = TRATAMIENTOS[tratamiento ?? 'lic'] ?? 'Lic.';
    const inicial = (nombreLimpio || 'I').charAt(0).toUpperCase();

    return (
        <div className="animate-slide-up w-full max-w-[680px]">
            {/* La consulta, anclada arriba en oscuro y con su autor. Ver su
                propio nombre y su fotografía encabezando el trabajo convierte
                una espera en un acto de servicio personal. */}
            {consulta && (
                <div className="rounded-xl bg-charcoal-900 px-5 py-4 mb-2">
                    <div className="flex items-center gap-3 mb-2.5">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarUrl}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover ring-1 ring-accent-gold/60"
                            />
                        ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-gold/20 ring-1 ring-accent-gold/60 font-serif text-sm font-semibold text-accent-gold">
                                {inicial}
                            </span>
                        )}
                        <div className="min-w-0">
                            {nombreLimpio ? (
                                <p className="truncate text-[13px] font-medium text-cream-100">
                                    {prefijo} {nombreLimpio} <span className="text-cream-100/60">pregunta:</span>
                                </p>
                            ) : (
                                <p className="text-[13px] font-medium text-cream-100/80">Consulta recibida</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Search className="h-2.5 w-2.5 text-accent-gold" />
                                <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-accent-gold">
                                    Iurexia trabajando
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[0.9375rem] leading-relaxed text-cream-100/90 line-clamp-3">
                        {consulta}
                    </p>
                </div>
            )}

            {filas.length === 0 && (
                <div className="flex items-center gap-3 py-3 pl-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-brown" />
                    <span className="text-sm text-charcoal-700">Leyendo la consulta…</span>
                </div>
            )}

            {/* La espina y sus ramas. En pantallas anchas las etapas alternan
                derecha e izquierda de la espina central; en móvil, columna
                simple con la espina a la izquierda. */}
            <ol className="relative flex flex-col pt-2">
                {filas.map((fila, i) => {
                    const hecho = !fila.activo;
                    const ultimaFila = i === filas.length - 1;
                    const izquierda = i % 2 === 1; // la primera va a la derecha

                    const tarjeta = (
                        <div
                            className={`anima-rama min-w-0 ${izquierda ? 'sm:text-right' : ''}`}
                            style={{ ['--dir' as string]: izquierda ? '-10px' : '10px' }}
                        >
                            <span
                                className={`block text-[0.9375rem] leading-snug transition-colors duration-500 ${
                                    fila.activo ? 'font-medium text-charcoal-900' : 'text-charcoal-900/85'
                                }`}
                            >
                                {fila.titulo}
                            </span>
                            <p className="text-[11.5px] leading-snug text-charcoal-700/55 mt-1">
                                {fila.glosa}
                            </p>
                            {fila.fichas.length > 0 && (
                                <div className={`flex flex-wrap gap-1.5 mt-2.5 ${izquierda ? 'sm:justify-end' : ''}`}>
                                    {fila.fichas.map((f, j) => {
                                        const Icono = ICONOS[f.icono];
                                        return (
                                            <span
                                                key={f.texto}
                                                className="anima-brote inline-flex items-center gap-1.5 rounded-lg border border-cream-400 bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal-900"
                                                style={{ animationDelay: `${j * 90}ms` }}
                                            >
                                                <Icono className="h-3 w-3 text-accent-brown" />
                                                {f.texto}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );

                    const nodo = (
                        <span className="relative z-10 mt-[2px] flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center">
                            {hecho ? (
                                <span className="anima-onda flex h-[19px] w-[19px] items-center justify-center rounded-full border border-accent-gold/50 bg-accent-gold/15">
                                    <Check className="h-2.5 w-2.5 text-accent-brown" strokeWidth={3.5} />
                                </span>
                            ) : (
                                <>
                                    <span className="absolute inset-0 rounded-full bg-accent-gold/25 animate-ping" />
                                    <span className="relative flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-accent-gold bg-cream-100">
                                        <span className="h-[6px] w-[6px] rounded-full bg-accent-gold" />
                                    </span>
                                </>
                            )}
                        </span>
                    );

                    /* El tramo de espina bajo este nodo: dorado si la etapa ya
                       se completó, apagado por delante. Al completarse en
                       orden, el llenado desciende. El bottom NEGATIVO cruza el
                       padding de la fila para empalmar con el nodo siguiente —
                       sin él, cada tramo termina donde acaba su contenido y la
                       espina se ve punteada. */
                    const espina = !ultimaFila && (
                        <span
                            aria-hidden
                            className={`absolute left-1/2 top-[21px] bottom-[-26px] w-[2px] -translate-x-1/2 rounded-full transition-colors duration-700 ${
                                hecho ? 'bg-accent-gold/60' : 'bg-charcoal-900/10'
                            }`}
                        />
                    );

                    /* El conector de la rama: del nodo hacia la tarjeta. */
                    const conector = (
                        <span
                            aria-hidden
                            className={`absolute top-[11px] hidden h-px w-5 sm:block transition-colors duration-700 ${
                                hecho ? 'bg-accent-gold/60' : 'bg-charcoal-900/10'
                            } ${izquierda ? 'right-1/2 mr-[10px]' : 'left-1/2 ml-[10px]'}`}
                        />
                    );

                    return (
                        <li key={fila.nombre} className="relative pb-6 last:pb-1">
                            {/* ── Pantalla ancha: rama a un lado de la espina ── */}
                            <div className="hidden sm:grid sm:grid-cols-[1fr_44px_1fr]">
                                <div className={izquierda ? 'pr-7' : ''}>{izquierda && tarjeta}</div>
                                {/* self-stretch: sin él este div mide lo que el
                                    nodo (19px) y la espina queda de 2px. */}
                                <div className="relative flex justify-center self-stretch">
                                    {espina}
                                    {conector}
                                    {nodo}
                                </div>
                                <div className={izquierda ? '' : 'pl-7'}>{!izquierda && tarjeta}</div>
                            </div>

                            {/* ── Móvil: columna simple ── */}
                            <div className="flex gap-3.5 sm:hidden">
                                <div className="relative flex justify-center self-stretch">
                                    {!ultimaFila && (
                                        <span
                                            aria-hidden
                                            className={`absolute left-1/2 top-[21px] bottom-[-26px] w-[2px] -translate-x-1/2 rounded-full transition-colors duration-700 ${
                                                hecho ? 'bg-accent-gold/60' : 'bg-charcoal-900/10'
                                            }`}
                                        />
                                    )}
                                    {nodo}
                                </div>
                                <div className="flex-1 min-w-0 pt-px">{tarjeta}</div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
