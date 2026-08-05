'use client';

/**
 * La insignia del plan: la marca visible de a qué escalón pertenece el abogado.
 *
 * Sustituye a la píldora de texto («Platinum Anual» sobre crema), que decía el
 * plan pero no significaba nada. Una insignia sí: se reconoce de un vistazo,
 * se distingue de la del vecino y da algo que subir de nivel.
 *
 *   gratuito  →  I de mármol, blanca y sobria
 *   básico    →  I de plata
 *   pro       →  moneda de oro con la I de Iurexia
 *   platinum  →  diamante que destella
 *
 * Todo es SVG, sin imágenes: pesa nada, escala a cualquier tamaño y hereda el
 * color. El destello del diamante y el brillo del oro se anulan con
 * prefers-reduced-motion (regla en globals.css).
 */

export type NivelInsignia = 'gratuito' | 'basico' | 'pro' | 'platinum';

/** El plan de Supabase → el nivel de insignia. */
export function nivelDePlan(plan?: string | null): NivelInsignia {
    const p = plan ?? 'gratuito';
    if (p.startsWith('platinum') || p === 'ultra_secretarios') return 'platinum';
    if (p.startsWith('pro')) return 'pro';
    if (p.startsWith('basico')) return 'basico';
    return 'gratuito';
}

/** Jerarquía, para saber si un cambio de plan es ascenso o descenso. */
export const RANGO: Record<NivelInsignia, number> = {
    gratuito: 0, basico: 1, pro: 2, platinum: 3,
};

export const INSIGNIAS: Record<NivelInsignia, {
    nombre: string; material: string; frase: string;
}> = {
    gratuito: {
        nombre: 'Mármol',
        material: 'gratuito',
        frase: 'Su lugar en Iurexia, sin costo y sin caducidad.',
    },
    basico: {
        nombre: 'Plata',
        material: 'Básico',
        frase: 'Más consultas para el trabajo de todos los días.',
    },
    pro: {
        nombre: 'Oro',
        material: 'Pro',
        frase: 'Redacción fundada y capacidad para un despacho en marcha.',
    },
    platinum: {
        nombre: 'Diamante',
        material: 'Platinum',
        frase: 'Todo lo que Iurexia sabe hacer, sin reservas.',
    },
};

interface Props {
    nivel: NivelInsignia;
    /** Lado del cuadro en píxeles. 22 para la barra, 120 para la ceremonia. */
    tam?: number;
    /** Enciende el destello. Se apaga en la barra para no distraer. */
    animada?: boolean;
    className?: string;
}

export function Insignia({ nivel, tam = 24, animada = false, className = '' }: Props) {
    const id = `ins-${nivel}`;   // los degradados necesitan id único por nivel

    return (
        <svg
            width={tam}
            height={tam}
            viewBox="0 0 48 48"
            fill="none"
            className={`${className} ${animada ? 'insignia-viva' : ''}`}
            aria-hidden
        >
            <defs>
                <linearGradient id={`${id}-fondo`} x1="0" y1="0" x2="1" y2="1">
                    {nivel === 'platinum' && (<>
                        <stop offset="0%" stopColor="#e8f4f8" />
                        <stop offset="45%" stopColor="#b8d8e8" />
                        <stop offset="100%" stopColor="#8fb8d0" />
                    </>)}
                    {nivel === 'pro' && (<>
                        <stop offset="0%" stopColor="#f2d98a" />
                        <stop offset="45%" stopColor="#c9a962" />
                        <stop offset="100%" stopColor="#9a7b3a" />
                    </>)}
                    {nivel === 'basico' && (<>
                        <stop offset="0%" stopColor="#f0f0f2" />
                        <stop offset="45%" stopColor="#c8ccd2" />
                        <stop offset="100%" stopColor="#9aa0a8" />
                    </>)}
                    {nivel === 'gratuito' && (<>
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="55%" stopColor="#f4f2ee" />
                        <stop offset="100%" stopColor="#ddd9d2" />
                    </>)}
                </linearGradient>

                {/* El barrido de luz que recorre la insignia. */}
                <linearGradient id={`${id}-brillo`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                    <stop offset="50%" stopColor="#fff" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
            </defs>

            {nivel === 'platinum' ? (
                /* Diamante: talla de brillante vista de frente — corona, mesa
                   y pabellón. Las facetas son líneas, no relleno: a 22 px se
                   siguen leyendo. */
                <>
                    <path d="M24 4 L40 18 L24 44 L8 18 Z" fill={`url(#${id}-fondo)`} />
                    <path d="M24 4 L40 18 L24 44 L8 18 Z" stroke="#6f97b0" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M8 18 H40 M24 4 L16 18 L24 44 M24 4 L32 18 L24 44"
                          stroke="#6f97b0" strokeWidth="0.9" strokeOpacity="0.75" />
                    <path d="M24 4 L40 18 L24 44 L8 18 Z" fill={`url(#${id}-brillo)`} className="insignia-barrido" />
                </>
            ) : (
                /* Moneda con la I de Iurexia. El aro interior le da relieve y
                   la separa del fondo oscuro de la barra. */
                <>
                    <circle cx="24" cy="24" r="20" fill={`url(#${id}-fondo)`} />
                    <circle cx="24" cy="24" r="20" stroke={
                        nivel === 'pro' ? '#8a6a2e' : nivel === 'basico' ? '#8b9099' : '#c9c4bb'
                    } strokeWidth="1.6" />
                    <circle cx="24" cy="24" r="16" stroke={
                        nivel === 'pro' ? '#8a6a2e' : nivel === 'basico' ? '#8b9099' : '#c9c4bb'
                    } strokeWidth="0.8" strokeOpacity="0.6" />
                    <text
                        x="24" y="24" textAnchor="middle" dominantBaseline="central"
                        fontFamily="Georgia, 'Times New Roman', serif"
                        fontSize="21" fontWeight="600"
                        fill={nivel === 'pro' ? '#6b4f18' : nivel === 'basico' ? '#5c626b' : '#8a857c'}
                    >I</text>
                    <circle cx="24" cy="24" r="20" fill={`url(#${id}-brillo)`} className="insignia-barrido" />
                </>
            )}
        </svg>
    );
}
