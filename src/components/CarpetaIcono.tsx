'use client'

import type { TipoCarpeta } from '@/lib/expedientes'

/**
 * La carpeta, dibujada como carpeta.
 *
 * Es el mismo dibujo que la app móvil, y existe por la misma razón: un abogado
 * que ve una lista de filas piensa «otra tabla más»; uno que ve carpetas con su
 * nombre debajo sabe qué hacer sin que nadie se lo explique. La metáfora del
 * escritorio lleva cuarenta años funcionando y no hace falta reinventarla.
 *
 * Tres capas, como una carpeta de verdad: el lomo con su pestaña, los papeles
 * que asoman —cuantos más documentos, más asoman— y la tapa del frente. La
 * banda de avance sólo aparece cuando la IA ya leyó la carpeta.
 */

const COLORES: Record<TipoCarpeta, { lomo: string; tapaAlta: string; tapaBaja: string }> = {
    cliente: { lomo: '#3d6ea3', tapaAlta: '#6fa3d8', tapaBaja: '#4f86c0' },
    asunto: { lomo: '#a8863f', tapaAlta: '#dcc078', tapaBaja: '#c9a962' },
    academico: { lomo: '#4a8560', tapaAlta: '#7dbb95', tapaBaja: '#5da179' },
    documento: { lomo: '#5f6670', tapaAlta: '#9aa2ad', tapaBaja: '#7b838e' },
}

export function CarpetaIcono({
    tipo = 'cliente',
    tamano = 84,
    documentos = 0,
    avance = null,
}: {
    tipo?: TipoCarpeta
    tamano?: number
    documentos?: number
    /** 0–100, o null si la carpeta todavía no se ha analizado. */
    avance?: number | null
}) {
    const c = COLORES[tipo] ?? COLORES.cliente
    const w = tamano
    const h = tamano * 0.82
    const id = `carpeta-${tipo}`

    // Cuántos papeles asoman. Se corta en tres: con más, el dibujo se ensucia y
    // deja de leerse de un vistazo, que es justo para lo que sirve.
    const papeles = Math.min(3, documentos)

    return (
        <svg width={w} height={h} viewBox="0 0 100 82" aria-hidden="true">
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.tapaAlta} />
                    <stop offset="100%" stopColor={c.tapaBaja} />
                </linearGradient>
            </defs>

            {/* Panel de atrás, con la pestaña */}
            <path
                d="M4 18 A4 4 0 0 1 8 14 H38 L45 21 H92 A4 4 0 0 1 96 25 V70 A4 4 0 0 1 92 74 H8 A4 4 0 0 1 4 70 Z"
                fill={c.lomo}
            />

            {/* Los papeles que asoman */}
            {Array.from({ length: papeles }).map((_, i) => (
                <rect
                    key={i}
                    x={16 + i * 5}
                    y={26 - i * 3}
                    width={68 - i * 10}
                    height={40}
                    rx="2"
                    fill={i === 0 ? '#ffffff' : i === 1 ? '#f7f5ef' : '#efece3'}
                />
            ))}

            {/* Tapa del frente */}
            <path
                d="M4 34 H96 V70 A4 4 0 0 1 92 74 H8 A4 4 0 0 1 4 70 Z"
                fill={`url(#${id})`}
            />

            {/* Banda de avance: sólo si la carpeta ya fue leída por la IA */}
            {avance !== null && avance !== undefined ? (
                <>
                    <rect x="14" y="63" width="72" height="5" rx="2.5" fill="rgba(255,255,255,0.34)" />
                    <rect
                        x="14"
                        y="63"
                        width={Math.max(0, Math.min(72, (avance / 100) * 72))}
                        height="5"
                        rx="2.5"
                        fill="#ffffff"
                    />
                </>
            ) : null}
        </svg>
    )
}

/** Un archivo suelto, con su esquina doblada y la banda del tipo de archivo. */
export function ArchivoIcono({ nombre, tamano = 56 }: { nombre: string; tamano?: number }) {
    const ext = (nombre.split('.').pop() ?? '').toLowerCase().slice(0, 4)
    const color =
        ext === 'pdf'
            ? '#b4453c'
            : ext === 'docx' || ext === 'doc'
              ? '#2b579a'
              : ext === 'jpg' || ext === 'jpeg' || ext === 'png'
                ? '#4a7c59'
                : '#7a7a7a'

    const w = tamano
    const h = tamano * 1.28

    return (
        <svg width={w} height={h} viewBox="0 0 56 72" aria-hidden="true">
            <path
                d="M6 4 A3 3 0 0 1 9 1 H36 L52 17 V68 A3 3 0 0 1 49 71 H9 A3 3 0 0 1 6 68 Z"
                fill="#ffffff"
                stroke="#e8e6e0"
                strokeWidth="1.5"
            />
            {/* La esquina doblada */}
            <path d="M36 1 L52 17 H39 A3 3 0 0 1 36 14 Z" fill="#e8e6e0" />
            {/* La banda con la extensión */}
            <rect x="6" y="44" width="46" height="16" rx="2" fill={color} />
            <text
                x="29"
                y="56"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif">
                {ext.toUpperCase()}
            </text>
        </svg>
    )
}
