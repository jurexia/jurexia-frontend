/* LOS TRES ESFUERZOS EN CÍRCULOS (16-oct-2026). David cambió la estrella, la
   pluma y el diamante por círculos que se llenan: Básico un tercio en negro,
   Pro la mitad en rojo, Platinum entero en espiral de negro y rojo. Misma firma
   que un ícono de lucide (`className`), así entran donde estaban aquéllos. */

const NEGRO = '#1a1a1a';
const ROJO = '#b8382c';

type P = { className?: string };

export function CirculoBasico({ className }: P) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
            <clipPath id="esf-b"><rect x="0" y="16" width="24" height="8" /></clipPath>
            <circle cx="12" cy="12" r="10" fill={NEGRO} clipPath="url(#esf-b)" />
            <circle cx="12" cy="12" r="10" fill="none" stroke={NEGRO} strokeWidth="1.6" />
        </svg>
    );
}

export function CirculoPro({ className }: P) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
            <path d="M2 12 A10 10 0 0 0 22 12 Z" fill={ROJO} />
            <circle cx="12" cy="12" r="10" fill="none" stroke={NEGRO} strokeWidth="1.6" />
        </svg>
    );
}

export function CirculoPlatinum({ className }: P) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
            <clipPath id="esf-p"><circle cx="12" cy="12" r="10" /></clipPath>
            <circle cx="12" cy="12" r="10" fill={NEGRO} />
            <path d="M12.50 12.00 L12.55 12.06 L12.60 12.13 L12.63 12.21 L12.66 12.29 L12.67 12.39 L12.67 12.49 L12.66 12.59 L12.63 12.70 L12.59 12.81 L12.53 12.91 L12.45 13.02 L12.36 13.11 L12.25 13.20 L12.13 13.27 L12.00 13.33 L11.85 13.38 L11.70 13.41 L11.54 13.43 L11.37 13.42 L11.19 13.40 L11.02 13.35 L10.85 13.28 L10.68 13.19 L10.52 13.08 L10.36 12.94 L10.22 12.79 L10.10 12.62 L9.99 12.43 L9.90 12.22 L9.83 12.00 L9.79 11.77 L9.77 11.53 L9.78 11.28 L9.82 11.03 L9.88 10.78 L9.98 10.53 L10.10 10.29 L10.25 10.06 L10.43 9.84 L10.64 9.64 L10.87 9.46 L11.12 9.31 L11.40 9.17 L11.69 9.07 L12.00 9.00 L12.32 8.96 L12.65 8.96 L12.98 8.99 L13.31 9.06 L13.64 9.16 L13.96 9.30 L14.27 9.48 L14.56 9.70 L14.83 9.94 L15.08 10.22 L15.30 10.53 L15.49 10.87 L15.64 11.23 L15.76 11.61 L15.83 12.00 L15.87 12.41 L15.86 12.82 L15.80 13.24 L15.70 13.65 L15.56 14.06 L15.37 14.45 L15.14 14.83 L14.86 15.18 L14.55 15.51 L14.19 15.80 L13.81 16.06 L13.39 16.28 L12.95 16.46 L12.48 16.59 L12.00 16.67 L11.51 16.70 L11.01 16.67 L10.51 16.60 L10.01 16.47 L9.53 16.28 L9.06 16.05 L8.62 15.76 L8.20 15.42 L7.82 15.04 L7.48 14.61 L7.18 14.15 L6.93 13.65 L6.73 13.12 L6.59 12.57 L6.50 12.00 L6.47 11.42 L6.51 10.83 L6.61 10.25 L6.77 9.67 L7.00 9.11 L7.28 8.57 L7.62 8.06 L8.02 7.58 L8.47 7.15 L8.97 6.76 L9.51 6.42 L10.09 6.14 L10.71 5.91 L11.34 5.76 L12.00 5.67 L12.67 5.65 L13.34 5.70 L14.01 5.82 L14.67 6.01 L15.31 6.27 L15.92 6.61 L16.50 7.00 L17.04 7.46 L17.53 7.98 L17.97 8.56 L18.34 9.18 L18.66 9.84 L18.90 10.53 L19.07 11.26 L19.17 12.00 L19.18 12.75 L19.12 13.51 L18.97 14.27 L18.75 15.01 L18.45 15.72 L18.07 16.41 L17.61 17.06 L17.09 17.66 L16.51 18.20 L15.86 18.69 L15.16 19.11 L14.42 19.45 L13.64 19.72 L12.83 19.90 L12.00 20.00 L11.16 20.01 L10.31 19.93 L9.48 19.77 L8.66 19.51 L7.86 19.17 L7.10 18.74 L6.39 18.23 L5.72 17.65 L5.12 17.00 L4.59 16.28 L4.13 15.50 L3.76 14.68 L3.47 13.81 L3.27 12.92 L3.17 12.00 L3.16 11.07 L3.25 10.14 L3.44 9.22 L3.73 8.32 L4.11 7.44 L4.58 6.61 L5.15 5.83 L5.79 5.11 L6.51 4.45 L7.31 3.87 L8.16 3.37 L9.06 2.96 L10.01 2.65 L11.00 2.44 L12.00 2.33 L13.02 2.33 L14.03 2.44 L15.04 2.65 L16.02 2.97 L16.97 3.39 L17.88 3.91 L18.73 4.53 L19.51 5.23 L20.23 6.02 L20.85 6.89 L21.39 7.82 L21.83 8.81 L22.16 9.84 L22.39 10.91 L22.50 12.00" fill="none" stroke={ROJO} strokeWidth="1.7" strokeLinecap="round" clipPath="url(#esf-p)" />
            <circle cx="12" cy="12" r="10" fill="none" stroke={NEGRO} strokeWidth="1.6" />
        </svg>
    );
}
