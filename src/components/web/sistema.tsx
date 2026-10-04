import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

/* ═══ EL SISTEMA DE LA WEB PÚBLICA (3-oct-2026) ═══
   Nace del barrido de harvey.ai que pidió David («que tenga un aspecto mucho
   más profesional»). Medido: Harvey usa 5 estilos de título, 2 alturas de
   botón y 8 colores de texto en todo su sitio; la web de Iurexia, 13, 9 y 21.
   La diferencia no era el gusto, era la falta de reglas. Estas son las reglas:

   · Títulos siempre en peso 400, en cinco tamaños (tailwind: display-*),
     sin palabras resaltadas en dorado. El dorado queda para el «ia» de la
     marca y los detalles finos. La letra es Newsreader desde la segunda
     vuelta (src/lib/fuentes-web.ts); la marca sigue en Playfair.
   · Dos botones —el principal en tinta y el de contorno— y dos alturas: 48 px
     en la página, 36 px en la barra. Un solo radio, rounded-lg: sin óvalos
     (regla de David desde la barra de agosto).
   · Tres fondos: el crema de la casa, blanco y tinta. Grises sólo de la escala
     cálida «piedra».
   · El mismo aire entre secciones en todas las páginas. */

export type Tono = 'marfil' | 'blanco' | 'tinta';

const FONDO: Record<Tono, string> = {
    marfil: 'bg-cream-300 text-tinta',
    blanco: 'bg-white text-tinta',
    tinta: 'bg-tinta text-cream-100',
};

// En teléfono, dos secciones amplias seguidas dejaban casi 200 px de vacío,
// que al deslizar parece una página rota: allí el aire es la mitad.
const ESPACIO = {
    compacto: 'py-12 sm:py-20',
    normal: 'py-14 sm:py-28',
    amplio: 'py-16 sm:py-32',
} as const;

const ANCHO = {
    estrecho: 'max-w-4xl',
    normal: 'max-w-7xl',
} as const;

export function Seccion({
    id,
    tono = 'marfil',
    espacio = 'normal',
    ancho = 'normal',
    className = '',
    children,
    etiqueta,
}: {
    id?: string;
    tono?: Tono;
    espacio?: keyof typeof ESPACIO;
    ancho?: keyof typeof ANCHO;
    className?: string;
    children: ReactNode;
    /** aria-label cuando la sección no tiene un título visible. */
    etiqueta?: string;
}) {
    return (
        <section id={id} aria-label={etiqueta} className={`scroll-mt-20 ${FONDO[tono]} ${ESPACIO[espacio]} ${className}`}>
            <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${ANCHO[ancho]}`}>{children}</div>
        </section>
    );
}

/* La línea pequeña sobre el título: gris, en versales espaciadas, sin cápsula
   ni color. Dice de qué va la sección; no adorna. */
export function Antetitulo({ children, oscuro = false, className = '' }: { children: ReactNode; oscuro?: boolean; className?: string }) {
    return (
        <p className={`text-[12px] font-medium uppercase tracking-[0.16em] ${oscuro ? 'text-white/55' : 'text-piedra-600'} ${className}`}>
            {children}
        </p>
    );
}

const ESCALA = {
    portada: 'text-[2.6rem] leading-[1.05] tracking-[-0.02em] sm:text-display-l lg:text-display-xl',
    seccion: 'text-[2.1rem] leading-[1.1] tracking-[-0.015em] sm:text-display-m',
    bloque: 'text-display-xs sm:text-display-s',
    tarjeta: 'text-display-xs',
} as const;

export function Titulo({
    como: Etiqueta = 'h2',
    escala = 'seccion',
    oscuro = false,
    id,
    className = '',
    children,
}: {
    como?: 'h1' | 'h2' | 'h3' | 'p';
    escala?: keyof typeof ESCALA;
    oscuro?: boolean;
    id?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <Etiqueta id={id} className={`font-serif font-normal [text-wrap:balance] ${ESCALA[escala]} ${oscuro ? 'text-cream-100' : 'text-tinta'} ${className}`}>
            {children}
        </Etiqueta>
    );
}

export function Entrada({ children, oscuro = false, className = '' }: { children: ReactNode; oscuro?: boolean; className?: string }) {
    return (
        <p className={`text-[1.0625rem] leading-relaxed sm:text-lg ${oscuro ? 'text-white/65' : 'text-piedra-700'} ${className}`}>{children}</p>
    );
}

/* Antetítulo + título + entrada (+ acciones), alineados a la izquierda o al
   centro. Es la cabecera de casi todas las secciones. */
export function Encabezado({
    antetitulo,
    titulo,
    entrada,
    centrado = false,
    oscuro = false,
    como = 'h2',
    escala = 'seccion',
    id,
    className = '',
    children,
}: {
    antetitulo?: ReactNode;
    titulo: ReactNode;
    entrada?: ReactNode;
    centrado?: boolean;
    oscuro?: boolean;
    como?: 'h1' | 'h2' | 'h3';
    escala?: keyof typeof ESCALA;
    id?: string;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <div className={`${centrado ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'} ${className}`}>
            {antetitulo && <Antetitulo oscuro={oscuro} className="mb-4">{antetitulo}</Antetitulo>}
            <Titulo como={como} escala={escala} oscuro={oscuro} id={id}>{titulo}</Titulo>
            {entrada && <Entrada oscuro={oscuro} className={`mt-5 ${centrado ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{entrada}</Entrada>}
            {children && <div className={`mt-8 flex flex-col gap-3 sm:flex-row sm:items-center ${centrado ? 'sm:justify-center' : ''}`}>{children}</div>}
        </div>
    );
}

const BOTON_BASE =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-200 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/70 focus-visible:ring-offset-2 disabled:opacity-60';

/** Las clases de un botón, para los componentes que pintan el suyo (BotonProbar). */
export function clasesBoton({
    variante = 'primario',
    oscuro = false,
    tamano = 'md',
}: { variante?: 'primario' | 'secundario'; oscuro?: boolean; tamano?: 'md' | 'sm' } = {}) {
    const tam = tamano === 'sm' ? 'h-9 px-4 text-sm' : 'h-12 px-6 text-[0.9375rem]';
    const estilo =
        variante === 'primario'
            ? oscuro
                ? 'bg-cream-100 text-tinta hover:bg-white focus-visible:ring-offset-tinta'
                : 'bg-tinta text-cream-100 hover:bg-charcoal-800 focus-visible:ring-offset-cream-300'
            : oscuro
                ? 'border border-white/25 text-cream-100 hover:border-white/50 hover:bg-white/[0.06] focus-visible:ring-offset-tinta'
                : 'border border-tinta/20 text-tinta hover:border-tinta/40 hover:bg-tinta/[0.03] focus-visible:ring-offset-cream-300';
    return `${BOTON_BASE} ${tam} ${estilo}`;
}

export function Boton({
    href,
    variante = 'primario',
    oscuro = false,
    tamano = 'md',
    externo = false,
    className = '',
    children,
}: {
    href: string;
    variante?: 'primario' | 'secundario';
    oscuro?: boolean;
    tamano?: 'md' | 'sm';
    externo?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const clases = `${clasesBoton({ variante, oscuro, tamano })} ${className}`;
    if (externo) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={clases}>
                {children}
            </a>
        );
    }
    return (
        <Link href={href} className={clases}>
            {children}
        </Link>
    );
}

/* El enlace de texto con flecha («Conocer más →»). Sin desplazamientos al
   pasar el cursor: sólo el subrayado. */
export function EnlaceFlecha({ href, oscuro = false, className = '', children }: { href: string; oscuro?: boolean; className?: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-1.5 text-[0.9375rem] font-medium underline-offset-4 hover:underline ${oscuro ? 'text-cream-100' : 'text-tinta'} ${className}`}
        >
            {children}
            <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
    );
}
