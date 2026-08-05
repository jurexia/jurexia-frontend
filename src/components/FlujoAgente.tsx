'use client';

import { useMemo } from 'react';
import { BookText, Check, Globe, Loader2, Scale, Link2, Landmark, PenLine, Search } from 'lucide-react';
import { ESTADOS_MEXICO } from '@/lib/estados';

/**
 * El pipeline, visible mientras trabaja.
 *
 * Sustituye a PasosAgente, cuya línea avanzaba con un TEMPORIZADOR: se veía
 * bien, pero si la búsqueda tardaba el doble los pasos seguían corriendo solos.
 * Aquí cada fila se enciende con un marcador real que el backend emite desde
 * el punto exacto del pipeline (`<!--PASO:nombre|detalle-->`).
 *
 * ─── QUÉ SE TOMA DEL REFERENTE Y QUÉ NO ─────────────────────────────────
 * De Harvey se conservan las tres cosas que hacen que su flujo se lea como
 * una máquina seria: la tarjeta oscura que ancla la petición arriba, la
 * columna vertical con el hilo, y las fichas con icono colgando de cada
 * etapa. Lo que no se toma es su semántica de herramienta de ventas —píldoras
 * rojas de «prioridad alta», logos de Salesforce y Slack—: a un abogado
 * revisando un plazo eso le estorba.
 *
 * La traducción está en el contenido de las fichas. Donde ellos ponen sus
 * integraciones, aquí van las FUENTES JURÍDICAS que de verdad se consultaron:
 * la legislación, el Semanario Judicial, los dominios oficiales que devolvió
 * la búsqueda web. El icono comunica de un vistazo qué clase de fuente es.
 *
 * Sobre el Semanario: se usa una balanza genérica y el nombre escrito, NO el
 * emblema del SJF ni el escudo nacional. Reproducir la marca de un órgano del
 * Estado en material comercial es un problema que no hace falta tener, y la
 * balanza comunica lo mismo.
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
        // Dominios REALES devueltos por el anclaje de la búsqueda. Ver
        // «dof.gob.mx» convence; ver «3 sitios» no dice nada.
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

interface Props {
    pasos: Paso[];
    sourcesCount: number | null;
    /** La consulta del abogado, para la tarjeta que encabeza el flujo. */
    consulta?: string;
    redactando?: boolean;
    retryMessage?: string;
    retryType?: string;
}

export function FlujoAgente({ pasos, sourcesCount, consulta, redactando, retryMessage, retryType }: Props) {
    const filas = useMemo(() => {
        const vistos = new Map(pasos.map((p) => [p.nombre, p.detalle]));
        const ultimo = pasos.length ? pasos[pasos.length - 1].nombre : null;

        /* Sólo se muestran las etapas que de verdad ocurrieron. Un pipeline sin
           precedentes no debe pintar una fila apagada de precedentes:
           prometería un trabajo que nadie hizo. */
        return ETAPAS.filter((e) => vistos.has(e.nombre) || (e.nombre === 'redactar' && redactando))
            .map((e) => ({
                ...e,
                activo: e.nombre === 'redactar' ? !!redactando : e.nombre === ultimo && !redactando,
                fichas: fichasDe(e.nombre, vistos.get(e.nombre), e.nombre === 'buscar' ? sourcesCount : null),
            }));
    }, [pasos, sourcesCount, redactando]);

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

    return (
        <div className="animate-slide-up w-full max-w-[640px]">
            {/* La consulta, anclada arriba en oscuro. Da peso al bloque y
                recuerda al abogado qué preguntó mientras el motor trabaja. */}
            {consulta && (
                <div className="rounded-xl bg-charcoal-900 px-5 py-4 mb-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Search className="h-3 w-3 text-accent-gold" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-accent-gold">
                            Consulta recibida
                        </span>
                    </div>
                    <p className="text-[0.9375rem] leading-relaxed text-cream-100/90 line-clamp-3">
                        {consulta}
                    </p>
                </div>
            )}

            <ol className="relative flex flex-col pl-1 pt-3">
                {filas.length === 0 && (
                    <li className="flex items-center gap-3 py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-brown" />
                        <span className="text-sm text-charcoal-700">Leyendo la consulta…</span>
                    </li>
                )}

                {filas.map((fila, i) => {
                    const hecho = !fila.activo;
                    const ultimaFila = i === filas.length - 1;
                    return (
                        <li key={fila.nombre} className="relative flex items-start gap-3.5 pb-5 last:pb-1">
                            {/* El hilo se ilumina en el tramo recorrido y queda
                                apagado por delante: el avance se lee de un vistazo. */}
                            {!ultimaFila && (
                                <span
                                    aria-hidden
                                    className={`absolute left-[9px] top-[20px] bottom-0 w-px transition-colors duration-700 ${
                                        hecho ? 'bg-accent-gold/45' : 'bg-charcoal-900/10'
                                    }`}
                                />
                            )}

                            <span className="relative z-10 mt-[2px] flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center">
                                {hecho ? (
                                    <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full border border-accent-gold/50 bg-accent-gold/15">
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

                            <div className="flex-1 min-w-0 pt-px">
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

                                {/* Fichas de fuente: donde el referente pone sus
                                    integraciones, aquí va lo que se consultó. */}
                                {fila.fichas.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                        {fila.fichas.map((f) => {
                                            const Icono = ICONOS[f.icono];
                                            return (
                                                <span
                                                    key={f.texto}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-cream-400 bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal-900"
                                                >
                                                    <Icono className="h-3 w-3 text-accent-brown" />
                                                    {f.texto}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
