'use client';

/* La sala de demostraciones: cuatro funciones, un solo marco.

   POR QUÉ CAPÍTULOS Y NO CUATRO VÍDEOS APILADOS. Iudex pone un vídeo debajo de
   otro y cada uno arranca solo: cuatro reproducciones simultáneas compitiendo
   por la atención y por el ancho de banda. Aquí sólo vive el capítulo activo
   —el `key` lo desmonta al cambiar—, así que se descarga un vídeo, no cuatro,
   y el abogado elige qué quiere ver en vez de bajar buscándolo.

   EL RAÍL DICE FUNCIONES, NO NÚMEROS. Quien llega a esta página busca «¿puede
   redactar un amparo?», no «capítulo 2». Por eso el botón lleva el nombre de la
   función y debajo, en pequeño, lo que se lleva de ella. */

import { useState } from 'react';
import DemoEnVivo, { type Rotulo } from '@/components/DemoEnVivo';

export type Capitulo = {
    id: string;
    /** Lo que se lee en el raíl: el nombre de la función. */
    funcion: string;
    /** La línea de debajo, en el raíl: qué se lleva de ella. */
    gancho: string;
    titulo: React.ReactNode;
    entradilla: string;
    src: string;
    poster: string;
    descripcion: string;
    rotulos: Rotulo[];
    url: string;
};

export default function DemoCapitulos({
    capitulos,
    fondo = 'bg-cream-300',
}: {
    capitulos: Capitulo[];
    fondo?: string;
}) {
    const [activo, setActivo] = useState(0);
    const cap = capitulos[activo];

    return (
        <div className={fondo}>
            {/* El raíl. En móvil se desliza; en escritorio caben las cuatro. */}
            <div
                role="tablist"
                aria-label="Funciones de Iurexia en vídeo"
                className={`mx-auto grid max-w-[1100px] grid-cols-2 gap-2 px-4 sm:px-6 ${
                    capitulos.length === 3 ? 'lg:grid-cols-3'
                        : capitulos.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-4'
                }`}
            >
                {capitulos.map((c, i) => {
                    const puesto = i === activo;
                    return (
                        <button
                            key={c.id}
                            role="tab"
                            id={`cap-${c.id}`}
                            aria-selected={puesto}
                            aria-controls={`panel-${c.id}`}
                            onClick={() => setActivo(i)}
                            className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                                puesto
                                    ? 'border-accent-gold/50 bg-white shadow-[0_8px_24px_-12px_rgba(17,17,17,0.3)]'
                                    : 'border-charcoal-900/[0.08] bg-white/50 hover:border-charcoal-900/20 hover:bg-white/80'
                            }`}
                        >
                            <span
                                className={`font-mono text-[10px] tracking-wide ${
                                    puesto ? 'text-accent-gold' : 'text-charcoal-900/35'
                                }`}
                            >
                                0{i + 1}
                            </span>
                            <span className="mt-0.5 block font-serif text-sm font-bold leading-tight text-charcoal-900">
                                {c.funcion}
                            </span>
                            <span className="mt-1 block text-[12px] leading-snug text-charcoal-900/55">
                                {c.gancho}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div role="tabpanel" id={`panel-${cap.id}`} aria-labelledby={`cap-${cap.id}`}>
                {/* `key` fuerza el remontaje: el vídeo anterior se descarga de
                    memoria y el nuevo arranca desde su primer fotograma. */}
                <DemoEnVivo
                    key={cap.id}
                    src={cap.src}
                    poster={cap.poster}
                    descripcion={cap.descripcion}
                    titulo={cap.titulo}
                    entradilla={cap.entradilla}
                    rotulos={cap.rotulos}
                    url={cap.url}
                    cta={null}
                    fondo="bg-transparent"
                    espaciado="px-4 pb-2 pt-8 sm:px-6 sm:pt-10"
                />
            </div>
        </div>
    );
}
