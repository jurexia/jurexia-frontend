/* ─── Los fondos de las tarjetas de precios: obras, no texturas ───────────
   David, 7-oct-2026: «vamos a darle la elegancia que tiene todo Iurexia».
   Hasta hoy Pro llevaba una retícula de cubos isométricos en gris y Platinum
   un circuito con red neuronal: geometría de plantilla, ajena al resto de la
   web, que ya habla con obras de arquitectura jurídica en grabado sepia
   (`public/web/arte`). Ahora cada tarjeta que se vende lleva su obra:

   · Pro       — `fachada`: un palacio de justicia dibujado a lápiz sobre
                 marfil. Tarjeta CLARA: la obra asoma abajo, tras el botón, y
                 se funde con el papel hacia arriba para no cruzar la lista.
   · Platinum  — `themis`: la diosa de la justicia, vendada, con la balanza
                 encendida por un haz de oro sobre negro. Generada para esta
                 tarjeta (Gemini 3 Pro Image, con biblioteca y columnata como
                 referencia de estilo). Es la más llamativa a propósito: es la
                 que la página recomienda.
   · Ultra Secretarios (su sección propia) — `biblioteca`, en negro.

   Son decoración: `aria-hidden`, sin eventos de puntero, en z negativo (la
   tarjeta necesita `isolate`), y toda la información sigue en el texto. */

/* eslint-disable @next/next/no-img-element */

export function ObraClara({ arte }: { arte: string }) {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            {/* El edificio ENTERO, pequeño, al pie de la tarjeta —detrás del
                botón—, y fundido hacia arriba con el papel. Recortado a lo alto
                de la tarjeta se veían sólo columnas gigantes cruzando la lista. */}
            {/* Alto FIJO, no en porcentaje: en el teléfono la tarjeta es más baja
                y, medida en porcentaje, la obra trepaba sobre la lista. */}
            <div
                className="absolute inset-x-0 bottom-0 h-[200px] lg:h-[270px]"
                style={{
                    WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 48%)',
                    maskImage: 'linear-gradient(180deg, transparent 0%, #000 48%)',
                }}
            >
                <img src={arte} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_38%]" />
            </div>
            {/* Un velo del mismo marfil del dibujo (#f8f3eb, que es también el
                fondo de la tarjeta): el lápiz se ve y no queda borde. */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(248,243,235,0) 0%, rgba(248,243,235,0.25) 60%, rgba(248,243,235,0.15) 100%)' }} />
        </div>
    );
}

/* Themis vive a la DERECHA y arriba, y se funde con el negro de la tarjeta
   por la izquierda y por abajo: la letra empieza a la izquierda, sobre negro
   limpio, y la diosa queda entera a la vista —es la tarjeta que se recomienda—.
   La imagen se generó con la diosa en la mitad derecha y se recortó por su
   borde, así que no hay costura que esconder. */
export function ObraOscura({ arte }: { arte: string }) {
    const mascara = 'linear-gradient(90deg, transparent 0%, #000 34%), linear-gradient(180deg, #000 55%, transparent 100%)';
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            <div
                className="absolute right-0 top-0 h-[80%] w-[86%]"
                style={{
                    WebkitMaskImage: mascara,
                    maskImage: mascara,
                    WebkitMaskComposite: 'source-in',
                    maskComposite: 'intersect',
                }}
            >
                <img src={arte} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-[100%_0%]" />
            </div>
            {/* Velo de lectura: denso a la izquierda, donde va la letra, y
                creciente hacia el pie, donde están la lista y el botón. */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(15,14,13,0.70) 0%, rgba(15,14,13,0.32) 48%, rgba(15,14,13,0.04) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,14,13,0) 0%, rgba(15,14,13,0.18) 40%, rgba(15,14,13,0.55) 72%, rgba(15,14,13,0.78) 100%)' }} />
        </div>
    );
}
