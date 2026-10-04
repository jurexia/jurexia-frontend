'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/* ═══ LA LÁMINA (3-oct-2026) ═══
   Harvey monta sus capturas sobre cuadros con textura —pinturas, grabados—:
   el producto parece colgado en una galería, no pegado en una plantilla.
   Iurexia necesitaba lo suyo, y lo suyo está en el papel jurídico: el fondo
   de seguridad de los timbres, de los billetes y de las actas —el
   guilloché—, que en México dice «documento oficial» antes de leerlo.

   Se dibuja en un canvas: no pesa nada, sale nítido a cualquier tamaño y cada
   lámina varía con su `semilla`. Mientras el canvas no ha pintado, se ve el
   color de fondo: la página en reposo nunca queda en blanco.

   Desde la segunda vuelta (3-oct-2026) puede llevar, en vez del guilloché, una
   de las obras propias de public/web/arte (grabado y carboncillo de
   arquitectura jurídica, generadas con el visto bueno de David), con un velo
   que asegura que el texto de encima se lea. */

export type Patron = 'roseta' | 'ondas';
export type TonoLamina = 'tinta' | 'piedra' | 'marfil';

const FONDO: Record<TonoLamina, string> = {
    tinta: '#161513',
    piedra: '#e6e2d9',
    marfil: '#efece6',
};

// [trazo, acento]: el acento es el oro de la casa, muy bajo, en uno de cada pocos trazos.
const TRAZO: Record<TonoLamina, [string, string]> = {
    tinta: ['rgba(245, 244, 240, 0.075)', 'rgba(201, 169, 98, 0.17)'],
    piedra: ['rgba(15, 14, 13, 0.07)', 'rgba(139, 115, 85, 0.16)'],
    marfil: ['rgba(15, 14, 13, 0.06)', 'rgba(139, 115, 85, 0.13)'],
};

// La luz: más clara hacia el centro y apagada en los bordes, como un cuadro iluminado.
const LUZ: Record<TonoLamina, string> = {
    tinta: 'radial-gradient(120% 90% at 70% 35%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 100%)',
    piedra: 'radial-gradient(120% 90% at 70% 35%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 50%, rgba(15,14,13,0.06) 100%)',
    marfil: 'radial-gradient(120% 90% at 70% 35%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 50%, rgba(15,14,13,0.05) 100%)',
};

function azar(semilla: number) {
    let a = semilla >>> 0 || 1;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function dibujar(lienzo: HTMLCanvasElement, patron: Patron, tono: TonoLamina, semilla: number) {
    const ancho = lienzo.clientWidth;
    const alto = lienzo.clientHeight;
    if (!ancho || !alto) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    const c = lienzo.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, ancho, alto);
    c.lineWidth = 0.75;
    const [trazo, acento] = TRAZO[tono];
    const r = azar(semilla);
    const TAU = Math.PI * 2;

    if (patron === 'ondas') {
        /* El fondo de seguridad: decenas de ondas casi paralelas cuyas fases se
           corren poco a poco; al cruzarse forman el muaré de los timbres. */
        const n = Math.round(alto / 7) + 24;
        const k1 = 0.9 + r() * 0.6;
        const k2 = 2.4 + r() * 1.2;
        const a1 = alto * (0.05 + r() * 0.03);
        const a2 = alto * (0.025 + r() * 0.015);
        for (let i = 0; i < n; i++) {
            const fase = i * 0.19 + r() * 0.02;
            const y0 = (i / n) * alto * 1.35 - alto * 0.18;
            c.beginPath();
            for (let x = -12; x <= ancho + 12; x += 5) {
                const t = x / ancho;
                const y = y0 + a1 * Math.sin(TAU * t * k1 + fase) + a2 * Math.sin(TAU * t * k2 - fase * 1.6) * (0.6 + 0.4 * Math.sin(TAU * t * 0.5 + i * 0.07));
                if (x === -12) c.moveTo(x, y);
                else c.lineTo(x, y);
            }
            c.strokeStyle = i % 11 === 5 ? acento : trazo;
            c.stroke();
        }
        return;
    }

    /* La roseta: anillos tejidos —r(θ) = R + A·sen(mθ + φ)— repetidos con la
       fase corrida, como el medallón de un billete. El centro cae a la derecha
       y en parte fuera del cuadro, para que se lea como fondo y no como
       emblema. */
    const cx = ancho * (0.72 + r() * 0.14);
    const cy = alto * (0.42 + r() * 0.16);
    const R = Math.max(ancho, alto) * (0.62 + r() * 0.1);
    const anillos = [
        { radio: 1.0, amplitud: 0.07, lobulos: 22, copias: 46 },
        { radio: 0.76, amplitud: 0.06, lobulos: 17, copias: 40 },
        { radio: 0.54, amplitud: 0.05, lobulos: 13, copias: 34 },
        { radio: 0.34, amplitud: 0.045, lobulos: 9, copias: 28 },
        { radio: 0.17, amplitud: 0.04, lobulos: 7, copias: 22 },
    ];
    anillos.forEach((a, ia) => {
        for (let k = 0; k < a.copias; k++) {
            const fase = (TAU * k) / a.copias;
            c.beginPath();
            const pasos = 360;
            for (let p = 0; p <= pasos; p++) {
                const th = (TAU * p) / pasos;
                const rr = R * (a.radio + a.amplitud * Math.sin(a.lobulos * th + fase));
                const x = cx + rr * Math.cos(th);
                const y = cy + rr * Math.sin(th);
                if (p === 0) c.moveTo(x, y);
                else c.lineTo(x, y);
            }
            c.strokeStyle = (k + ia) % 13 === 0 ? acento : trazo;
            c.stroke();
        }
    });
}

// El velo sobre una obra: para que el texto que va encima se lea, o para bajarle el contraste.
const VELO: Record<'arriba' | 'suave', Record<TonoLamina, string>> = {
    arriba: {
        tinta: 'linear-gradient(180deg, rgba(15,14,13,0.92) 0%, rgba(15,14,13,0.72) 40%, rgba(15,14,13,0.25) 100%)',
        piedra: 'linear-gradient(180deg, rgba(239,236,230,0.94) 0%, rgba(239,236,230,0.7) 40%, rgba(239,236,230,0.2) 100%)',
        marfil: 'linear-gradient(180deg, rgba(239,236,230,0.94) 0%, rgba(239,236,230,0.7) 40%, rgba(239,236,230,0.2) 100%)',
    },
    suave: {
        tinta: 'linear-gradient(180deg, rgba(15,14,13,0.35), rgba(15,14,13,0.45))',
        piedra: 'linear-gradient(180deg, rgba(239,236,230,0.25), rgba(239,236,230,0.35))',
        marfil: 'linear-gradient(180deg, rgba(239,236,230,0.25), rgba(239,236,230,0.35))',
    },
};

export default function Lamina({
    patron = 'roseta',
    tono = 'tinta',
    semilla = 7,
    arte,
    velo = 'suave',
    prioridad = false,
    className = '',
    children,
}: {
    patron?: Patron;
    tono?: TonoLamina;
    semilla?: number;
    /** Una de las obras de public/web/arte: si se da, sustituye al guilloché. */
    arte?: string;
    velo?: 'arriba' | 'suave';
    prioridad?: boolean;
    className?: string;
    children?: ReactNode;
}) {
    const lienzo = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const el = lienzo.current;
        if (!el || arte) return;
        let cuadro = 0;
        const pintar = () => {
            cancelAnimationFrame(cuadro);
            cuadro = requestAnimationFrame(() => dibujar(el, patron, tono, semilla));
        };
        pintar();
        const obs = new ResizeObserver(pintar);
        obs.observe(el);
        return () => {
            cancelAnimationFrame(cuadro);
            obs.disconnect();
        };
    }, [patron, tono, semilla, arte]);

    return (
        <div className={`relative isolate overflow-hidden ${className}`} style={{ backgroundColor: FONDO[tono] }}>
            {arte ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={arte} alt="" aria-hidden loading={prioridad ? 'eager' : 'lazy'} decoding="async" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover" />
                    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: VELO[velo][tono] }} />
                </>
            ) : (
                <canvas ref={lienzo} aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
            )}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: LUZ[tono] }} />
            {children}
        </div>
    );
}
