'use client';

import { useEffect, useMemo, useRef } from 'react';
import { BadgeCheck, BookText, Check, Globe, Loader2, Link2, Landmark, Search } from 'lucide-react';
import { ESTADOS_MEXICO } from '@/lib/estados';
import { claveEntidad, escudoDe, fuentesElegidas, leerRecorrido, type Fuente } from '@/lib/fuentes';

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
 * SIN BALANZAS (David, 23-sep-2026): la balanza es el tópico gráfico del
 * derecho y la marca no la usa. Las instituciones van con su emblema oficial
 * (/fuentes/*.png, a petición de David el 18-sep) y lo verificado con un
 * sello.
 */

export type Paso = { nombre: string; detalle?: string };

type Ficha = { texto: string; icono: 'ley' | 'balanza' | 'web' | 'enlace' | 'sede'; /** El icono del sitio oficial de la institución consultada. */ imagen?: string };

const ETAPAS: { nombre: string; titulo: string; glosa: string }[] = [
    { nombre: 'entender', titulo: 'Leyendo la consulta', glosa: 'Materia, jurisdicción y artículos citados' },
    { nombre: 'jurisdiccion', titulo: 'Fijando la jurisdicción', glosa: 'Para no mezclar legislación de otro estado' },
    { nombre: 'expandir', titulo: 'Ampliando la búsqueda', glosa: 'Sinónimos jurídicos y figuras equivalentes' },
    { nombre: 'buscar', titulo: 'Recorriendo el acervo', glosa: 'Artículo por artículo, con su fuente' },
    // LA ETAPA QUE SE EMITÍA Y NO SE VEÍA (19-sep-2026)
    // El backend manda `PASO:verificadas|15` desde que la segunda vuelta de una
    // conversación reaprovecha lo que el sello ya firmó. Esta lista es cerrada
    // —línea 173: se filtra ETAPAS, no lo que llegó— así que el paso entraba,
    // se guardaba y se tiraba. David, mirando la pantalla: «no veo los cambios».
    // Tenía razón: el trabajo estaba hecho y no se veía por ningún lado.
    { nombre: 'verificadas', titulo: 'Reusando lo ya verificado', glosa: 'Las fuentes que esta conversación ya comprobó no se vuelven a buscar' },
    { nombre: 'precedentes', titulo: 'Buscando precedentes', glosa: 'Jurisprudencia y tesis aisladas' },
    { nombre: 'doctrina', titulo: 'Consultando doctrina', glosa: 'Obras jurídicas de referencia, con autor y página' },
    { nombre: 'web', titulo: 'Buscando en internet', glosa: 'Las fuentes aparecen conforme se consultan — sólo dominios oficiales' },
    { nombre: 'cruzar', titulo: 'Cruzando artículos citados', glosa: 'Trae el texto de lo que el precedente invoca' },
    { nombre: 'ordenar', titulo: 'Ordenando por pertinencia', glosa: 'Lo aplicable primero' },
    { nombre: 'redactar', titulo: 'Redactando con sus citas', glosa: 'Cada afirmación con su fuente' },
];

const ICONOS = {
    ley: BookText,
    // Sin balanzas (David, 23-sep-2026): el sello dice «verificado» sin el
    // tópico gráfico del derecho.
    balanza: BadgeCheck,
    web: Globe,
    enlace: Link2,
    sede: Landmark,
} as const;

/* LO RECORRIDO, NO UNA LISTA FIJA (23-sep-2026). La etapa decía siempre
   «Legislación federal · 32 entidades», se buscara lo que se buscara. Con el
   selector de fuentes eso mentía: David apagó todo menos lo federal y la
   pantalla le seguía anunciando las 32 entidades. Ahora las fichas salen de
   lo que el servidor dice que recorrió; con un servidor viejo, de lo que el
   abogado dejó encendido. */
const FICHA_FUENTE: Record<Exclude<Fuente, 'estatal'>, Ficha> = {
    constitucional: { texto: 'Bloque de constitucionalidad', icono: 'balanza', imagen: '/fuentes/corteidh.png' },
    jurisprudencia: { texto: 'Jurisprudencia', icono: 'balanza', imagen: '/fuentes/scjn.png' },
    federal: { texto: 'Legislación federal', icono: 'ley', imagen: '/fuentes/diputados.png' },
};

function fichasDelRecorrido(detalle: string | undefined): Ficha[] {
    const r = leerRecorrido(detalle) ?? { fuentes: fuentesElegidas(), entidad: null, entidades: 0 };
    return r.fuentes.map((f): Ficha => {
        if (f !== 'estatal') return FICHA_FUENTE[f];
        if (r.entidad) {
            const clave = claveEntidad(r.entidad);
            const etiqueta = ESTADOS_MEXICO.find((e) => e.value === clave)?.label ?? r.entidad;
            return { texto: etiqueta, icono: 'sede', imagen: escudoDe(r.entidad) ?? undefined };
        }
        return { texto: r.entidades > 1 ? `${r.entidades} entidades` : 'Legislación estatal', icono: 'sede' };
    });
}

/** Las fichas de cada etapa, construidas con lo que el backend informó. */
function fichasDe(nombre: string, detalle: string | undefined, fuentes: number | null): Ficha[] {
    if (nombre === 'buscar') {
        const f = fichasDelRecorrido(detalle);
        if (fuentes !== null) f.push({ texto: `${fuentes} fuentes`, icono: 'enlace' });
        return f;
    }
    if (nombre === 'verificadas' && detalle && detalle !== '0') {
        return [
            { texto: `${detalle} ${detalle === '1' ? 'fuente ya firmada' : 'fuentes ya firmadas'}`, icono: 'balanza' },
            { texto: 'Sin volver a buscarlas', icono: 'enlace' },
        ];
    }
    if (nombre === 'precedentes' && detalle && detalle !== '0') {
        return [
            { texto: 'Semanario Judicial', icono: 'balanza', imagen: '/fuentes/scjn.png' },
            { texto: `${detalle} precedentes`, icono: 'enlace' },
        ];
    }
    if (nombre === 'doctrina' && detalle) {
        // El detalle llega como «Atienza;Ferrer Mac-Gregor»: un chip por autor
        // es lo que hace visible que la respuesta lleva doctrina de verdad.
        return detalle.split(';').filter(Boolean).slice(0, 3)
            .map((a) => ({ texto: a.trim(), icono: 'ley' as const }));
    }
    if (nombre === 'web') {
        // La etapa se siembra desde el cliente al enviar (useChat) con este
        // centinela: los agentes aún no reportan, pero el abogado ya ve que
        // su globo encendido está trabajando.
        if (detalle === '__buscando__') {
            return [{ texto: 'Consultando dominios oficiales…', icono: 'web' }];
        }
        // Se consultó y no había nada oficial que aportar. Se dice, en vez de
        // dejar una ficha vacía con sólo el globo.
        if (!detalle || detalle === '__sin_novedades__') {
            return [{ texto: 'Sin fuentes oficiales aplicables', icono: 'web' }];
        }
        // El detalle llega POR AGENTE («vigencia:dof.gob.mx;criterios:scjn…»):
        // una ficha por agente que aportó es lo que hace visible el
        // multiagente. Se tolera también el formato viejo de dominios sueltos.
        if (detalle.includes(':')) {
            const NOMBRES: Record<string, string> = {
                vigencia: 'Vigencia', criterios: 'Criterios', local: 'Ámbito local',
            };
            return detalle.split(';').filter(Boolean).slice(0, 3).map((par) => {
                const [agente, doms] = par.split(':');
                const dom = (doms || '').split(',')[0]?.trim();
                return {
                    texto: `${NOMBRES[agente?.trim()] ?? agente} — ${dom}`,
                    icono: 'web' as const,
                };
            });
        }
        const ds = detalle.split(',').map((d) => d.trim()).filter(Boolean);
        return ds.length
            ? ds.slice(0, 3).map((d) => ({ texto: d, icono: 'web' as const }))
            : [{ texto: 'Sin fuentes oficiales aplicables', icono: 'web' }];
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
    /** Lo que está pasando, contado por el servidor. El análisis de un
     *  documento no emite etapas de la ramificación: emite estas líneas
     *  («Reconociendo el texto de 50 páginas…»), y son lo único que hay
     *  que leer mientras tanto. */
    etiqueta?: string;
    retryMessage?: string;
    retryType?: string;
    /** Columna simple también en escritorio: el proceso en orden, no en
     *  ramas. David, 18-sep-2026: «similar al proceso de ramificado pero
     *  ordenado». */
    ordenado?: boolean;
}

export function FlujoAgente({
    pasos, sourcesCount, consulta, nombre, avatarUrl, tratamiento,
    redactando, etiqueta, retryMessage, retryType, ordenado = false,
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
        /* Mismo ancho y mismo arranque que la burbuja de la respuesta que lo
           sustituye (avatar de 32px + hueco de 16 desde sm): así el cambio
           flujo → respuesta no salta. Antes medía 680px pegado al borde. */
        <div className="animate-slide-up w-full sm:pl-12">
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

            {/* LA RUEDITA, SIEMPRE (17-sep-2026). David: «algunos navegadores no
                tienen tecnología para visualizar la ramificación; no está de
                más dejar la ruedita». Vive fuera de la rejilla, con colores
                sólidos, margen en vez de `gap` y `animate-spin` a secas: es lo
                que se ve aunque las ramas no se pinten. Antes sólo salía si no
                había filas, y como la página exigía pasos para montar esto,
                en la práctica nunca. */}
            <div className="flex items-center py-2 pl-1">
                <Loader2 className="h-4 w-4 animate-spin text-accent-brown mr-3 flex-shrink-0" />
                <span className="text-sm text-charcoal-700">
                    {etiqueta
                        ? etiqueta
                        : filas.length === 0
                            ? 'Leyendo la consulta…'
                            : redactando ? 'Redactando la respuesta…' : 'Iurexia está trabajando en su consulta…'}
                </span>
            </div>

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
                                                {f.imagen
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    ? <img src={f.imagen} alt="" className="h-3.5 w-3.5 rounded-[3px]" />
                                                    : <Icono className="h-3 w-3 text-accent-brown" />}
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
                            className={`absolute left-1/2 top-[21px] bottom-[-18px] w-[2px] -translate-x-1/2 rounded-full transition-colors duration-700 ${
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
                        <li key={fila.nombre} className="relative pb-4 last:pb-1">
                            {/* ── Pantalla ancha: rama a un lado de la espina ── */}
                            <div className={ordenado ? 'hidden' : 'hidden sm:grid sm:grid-cols-[1fr_44px_1fr]'}>
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
                            <div className={ordenado ? 'flex gap-3.5' : 'flex gap-3.5 sm:hidden'}>
                                <div className="relative flex justify-center self-stretch">
                                    {!ultimaFila && (
                                        <span
                                            aria-hidden
                                            className={`absolute left-1/2 top-[21px] bottom-[-18px] w-[2px] -translate-x-1/2 rounded-full transition-colors duration-700 ${
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
