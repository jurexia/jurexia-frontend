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

/* ─── Estudio: la columnata (2-nov-2026) ──────────────────────────────────
   La tarjeta de Estudio va sola en su pestaña y es ancha: el nombre y el
   precio a la izquierda, lo que trae a la derecha. Columnata y no cúpula: la
   cúpula es lápiz sobre marfil y en negro había que invertirla; la columnata
   ya nace de noche, con el mismo grabado sepia de Themis, y sus columnas
   dicen «institución», que es lo que un despacho quiere ver.

   En escritorio la obra ocupa la tarjeta entera y la lista va encima en un
   cristal oscuro (`TarjetaEstudio`): la arquitectura se sigue viendo, borrosa,
   detrás de lo que trae el plan. En el teléfono va arriba, detrás del nombre,
   y se funde hacia abajo (`.estudio-obra`, en globals.css, porque la forma
   cambia con el ancho).

   En espejo: el cielo negro de la obra queda arriba a la izquierda, detrás
   del nombre y el precio, y las columnas grandes a la derecha. Sin el espejo
   las columnas cruzaban el nombre. Encima, un haz de luz dorada desde
   arriba —el mismo gesto que el de Themis— y un baño de oro en `soft-light`
   que dora el grabado sin teñir el negro. */
export function ObraEstudio({ arte }: { arte: string }) {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            <div className="estudio-obra">
                <img src={arte} alt="" loading="lazy" decoding="async" className="h-full w-full -scale-x-100 object-cover object-[35%_30%] lg:object-[50%_38%]" />
                <div className="absolute inset-0 mix-blend-soft-light" style={{ background: 'linear-gradient(135deg, rgba(232,203,135,0.7) 0%, rgba(201,169,98,0.35) 50%, rgba(201,169,98,0.1) 100%)' }} />
                {/* En el teléfono el nombre y el precio cruzan la obra a todo lo
                    ancho: un velo parejo, más denso a la izquierda. */}
                <div className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(90deg, rgba(15,14,13,0.62) 0%, rgba(15,14,13,0.38) 55%, rgba(15,14,13,0.22) 100%)' }} />
                <div className="absolute inset-0 mix-blend-screen" style={{ background: 'radial-gradient(40% 75% at 34% -10%, rgba(240,214,150,0.42) 0%, rgba(201,169,98,0.14) 45%, rgba(201,169,98,0) 75%)' }} />
            </div>
            {/* Velo de lectura: denso a la izquierda, donde van el nombre y el
                precio, y al pie, donde está el botón. */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 80% at 10% 45%, rgba(15,14,13,0.78) 0%, rgba(15,14,13,0.5) 45%, rgba(15,14,13,0.08) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,14,13,0.10) 0%, rgba(15,14,13,0) 35%, rgba(15,14,13,0.40) 75%, rgba(15,14,13,0.75) 100%)' }} />
        </div>
    );
}
