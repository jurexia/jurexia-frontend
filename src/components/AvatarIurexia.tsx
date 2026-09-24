/* ═══ QUIEN CONTESTA ES IUREXIA (23-sep-2026) ════════════════════════════
   David: «Ya habíamos prohibido balanzas. Allí quien contesta es Iurexia.
   Debe salir una I en su tipografía de iurexia con el círculo negro detrás».

   La «I» NO es una letra de una fuente parecida: se recortó del logotipo
   (public/logo-iurexia.png), con su franja dorada, y se pasó a blanco para
   leerse sobre el negro. Vive en public/marca/ a dos resoluciones.

   `className` trae el tamaño y la visibilidad (p. ej. «hidden sm:flex w-8
   h-8»): el componente no fija `display` para no pelearse con quien lo usa. */

interface Props {
    className?: string;
    /** Late mientras Iurexia está trabajando. */
    latido?: boolean;
}

export function AvatarIurexia({ className = 'flex h-8 w-8', latido = false }: Props) {
    return (
        <div
            aria-hidden="true"
            className={`${className} flex-shrink-0 items-center justify-center rounded-full bg-charcoal-900`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/marca/i-iurexia-96.png"
                srcSet="/marca/i-iurexia-96.png 1x, /marca/i-iurexia-192.png 2x"
                alt=""
                draggable={false}
                className={`h-[58%] w-auto select-none ${latido ? 'animate-pulse' : ''}`}
            />
        </div>
    );
}

export default AvatarIurexia;
