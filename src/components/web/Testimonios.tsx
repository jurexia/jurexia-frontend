'use client';

import { useEffect, useState } from 'react';

/* ═══ UN TESTIMONIO A LA VEZ (3-oct-2026) ═══
   Antes eran tres tarjetas con letra pequeña. Harvey enseña una sola cita
   grande, con nombre y cargo, y rota entre varias con una barra de avance:
   una voz se lee; tres a la vez se ojean. Son las citas de siempre, recortadas
   al final cuando eran largas, sin cambiar una palabra. Sin fotos: no hay retratos autorizados, y unas
   iniciales no se hacen pasar por una cara. */

const TESTIMONIOS = [
    {
        cita: 'En un amparo contra una autoridad fiscal, necesitaba jurisprudencia de la Décima Época sobre competencia territorial. Iurexia me encontró tres tesis aplicables que ni mi equipo había localizado en dos días de búsqueda manual. Ganamos el caso. Esa sola consulta pagó un año de suscripción.',
        nombre: 'Lic. Ulises Alejandro',
        cargo: 'Abogado litigante',
        iniciales: 'UA',
    },
    {
        cita: 'Lo que más me impresionó fue la precisión del filtro jurisdiccional. Trabajo en materia penal en Querétaro y cada respuesta viene fundamentada con legislación de mi estado, no con artículos de otros códigos. Esa seguridad jurídica no la encuentras en ninguna otra herramienta de IA.',
        nombre: 'Lic. Jorge Adrián Morales',
        cargo: 'Abogado penalista',
        iniciales: 'JM',
    },
    {
        cita: 'Antes de Iurexia, pasaba horas buscando tesis en bases de datos obsoletas. La primera vez que activé un Genio de Amparo y me citó el artículo exacto con la tesis aplicable en segundos, supe que mi forma de litigar había cambiado para siempre.',
        nombre: 'Lic. Daniel Vecker',
        cargo: 'Abogado litigante',
        iniciales: 'DV',
    },
];

const DURACION = 9000;

export default function Testimonios() {
    const [actual, setActual] = useState(0);
    const [pausa, setPausa] = useState(false);
    const [quieto, setQuieto] = useState(false);

    useEffect(() => {
        setQuieto(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }, []);

    useEffect(() => {
        if (pausa || quieto) return;
        const t = setTimeout(() => setActual((a) => (a + 1) % TESTIMONIOS.length), DURACION);
        return () => clearTimeout(t);
    }, [actual, pausa, quieto]);

    const t = TESTIMONIOS[actual];
    return (
        <section aria-label="Testimonios" className="bg-white py-16 sm:py-32" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">Lo que dicen quienes lo usan</p>
                <figure className="mt-8 min-h-[16rem] sm:min-h-[14rem]" aria-live="polite">
                    <blockquote key={actual} className="animate-[fadeIn_500ms_ease-out] font-serif text-[1.3rem] font-normal leading-[1.4] tracking-[-0.01em] text-tinta sm:text-[2.1rem] sm:leading-[1.25]">
                        «{t.cita}»
                    </blockquote>
                    <figcaption className="mt-8 flex items-center gap-3">
                        <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-tinta font-serif text-sm text-cream-100">{t.iniciales}</span>
                        <span>
                            <span className="block text-[15px] font-medium text-tinta">{t.nombre}</span>
                            <span className="block text-[13px] text-piedra-600">{t.cargo}</span>
                        </span>
                    </figcaption>
                </figure>
                <div className="mt-10 grid grid-cols-3 gap-3" role="tablist" aria-label="Elegir testimonio">
                    {TESTIMONIOS.map((x, i) => (
                        <button
                            key={x.nombre}
                            type="button"
                            role="tab"
                            aria-selected={i === actual}
                            aria-label={`Testimonio de ${x.nombre}`}
                            onClick={() => setActual(i)}
                            className="group py-2 focus-visible:outline-none"
                        >
                            <span className="block h-px w-full overflow-hidden bg-tinta/15">
                                <span
                                    key={`${actual}-${i}`}
                                    className={`block h-full bg-tinta ${i < actual ? 'w-full' : i === actual ? (pausa || quieto ? 'w-full' : 'w-0 animate-[avance_9s_linear_forwards]') : 'w-0'}`}
                                />
                            </span>
                            <span className={`mt-3 block text-left text-[13px] ${i === actual ? 'text-tinta' : 'text-piedra-500 group-hover:text-tinta'}`}>{x.nombre}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
