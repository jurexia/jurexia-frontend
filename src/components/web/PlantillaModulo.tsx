import type { ReactNode } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import PieDePagina from '@/components/PieDePagina';
import BotonProbar from '@/components/BotonProbar';
import Lamina, { type Patron, type TonoLamina } from '@/components/web/Lamina';
import VideoEnVista from '@/components/web/VideoEnVista';
import { BloqueSeguridad, Captura, CierreCTA, Miga, OtrosModulos } from '@/components/web/bloques';
import { Antetitulo, Boton, clasesBoton, Entrada, Seccion, Titulo } from '@/components/web/sistema';

import { claseWeb } from '@/lib/fuentes-web';
/* ═══ LA PLANTILLA DE CADA MÓDULO (3-oct-2026, fase 3) ═══
   La de harvey.ai para Agents, Vault o Litigation, adaptada: migas; la promesa
   en tres a seis palabras con la explicación al lado; el producto real sobre
   su lámina; tres beneficios; filas de función que alternan texto y captura;
   y los mismos cierres en todas (los otros módulos, la seguridad y la llamada
   final). Las páginas de cada módulo sólo ponen el contenido. */

export type Visual =
    | { tipo: 'imagen'; src: string; ancho: number; alto: number; alt: string; barra?: string }
    | { tipo: 'video'; src: string; poster: string }
    | { tipo: 'libre'; contenido: ReactNode };

export type FilaModulo = {
    id?: string;
    antetitulo?: string;
    titulo: string;
    texto: ReactNode;
    puntos?: string[];
    visual: Visual;
    lamina?: { tono?: TonoLamina; patron?: Patron; semilla?: number; arte?: string };
};

export type BeneficioModulo = { Icono: LucideIcon; titulo: string; texto: string };

function PintarVisual({ visual, prioridad = false }: { visual: Visual; prioridad?: boolean }) {
    if (visual.tipo === 'imagen') {
        // Las capturas verticales (el visor de la fuente) no ocupan toda la columna: se harían altísimas.
        const vertical = visual.alto > visual.ancho;
        return (
            <Captura
                src={visual.src}
                alt={visual.alt}
                ancho={visual.ancho}
                alto={visual.alto}
                barra={visual.barra}
                prioridad={prioridad}
                className={vertical ? 'mx-auto max-w-[380px]' : ''}
            />
        );
    }
    if (visual.tipo === 'video') {
        return (
            <VideoEnVista
                src={visual.src}
                poster={visual.poster}
                className="block h-auto w-full rounded-xl shadow-[0_30px_70px_-25px_rgba(0,0,0,0.6)] ring-1 ring-black/20"
            />
        );
    }
    return <>{visual.contenido}</>;
}

export default function PlantillaModulo({
    ruta,
    nombre,
    titulo,
    entrada,
    visual,
    heroArte,
    heroTono = 'tinta',
    migas,
    beneficios,
    filas,
    children,
}: {
    /** /plataforma/consulta, para las migas y para no repetirse en «otros módulos». */
    ruta: string;
    /** El nombre corto del módulo en las migas. */
    nombre: string;
    titulo: string;
    entrada: ReactNode;
    visual: Visual;
    /** La obra de fondo del producto en la cabecera (public/web/arte). */
    heroArte?: string;
    heroTono?: TonoLamina;
    /** Las migas, si no son «Plataforma › nombre» (las de Soluciones). */
    migas?: { href?: string; texto: string }[];
    beneficios: BeneficioModulo[];
    filas: FilaModulo[];
    /** Secciones propias del módulo, entre las filas y los cierres. */
    children?: ReactNode;
}) {
    return (
        <main className={`${claseWeb} min-h-screen bg-cream-300`}>
            <Navbar />

            {/* La promesa y el producto */}
            <section className="pt-28 sm:pt-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Miga pasos={migas ?? [{ href: '/plataforma', texto: 'Plataforma' }, { texto: nombre }]} />
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
                        <Titulo como="h1" escala="portada" className="aparecer">{titulo}</Titulo>
                        <div className="aparecer [animation-delay:120ms]">
                            <Entrada>{entrada}</Entrada>
                            <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
                                <BotonProbar className={clasesBoton()} sub="Sin correo, sin tarjeta." subClassName="text-xs text-piedra-600">
                                    Probar sin registrarme
                                </BotonProbar>
                                <Boton href="/precios" variante="secundario">Ver planes</Boton>
                            </div>
                        </div>
                    </div>
                    <Lamina tono={heroTono} patron="roseta" semilla={ruta.length * 3} arte={heroArte} prioridad className="mt-14 rounded-2xl">
                        <div className="px-4 pt-8 sm:px-12 sm:pt-14 lg:px-20">
                            <div className="mx-auto max-w-5xl translate-y-px">
                                <PintarVisual visual={visual} prioridad />
                            </div>
                        </div>
                    </Lamina>
                </div>
            </section>

            {/* Tres beneficios */}
            <Seccion tono="marfil" espacio="normal">
                <div className="grid gap-10 border-t border-tinta/10 pt-12 md:grid-cols-3 md:gap-12">
                    {beneficios.map(({ Icono, titulo: t, texto }) => (
                        <div key={t}>
                            <Icono className="h-5 w-5 text-tinta/70" strokeWidth={1.5} aria-hidden />
                            <h2 className="mt-4 font-sans text-[1.0625rem] font-medium tracking-normal text-tinta">{t}</h2>
                            <p className="mt-2 text-[15px] leading-relaxed text-piedra-600">{texto}</p>
                        </div>
                    ))}
                </div>
            </Seccion>

            {/* Las funciones, una por fila */}
            {filas.map((f, i) => {
                const invertida = i % 2 === 1;
                return (
                    <Seccion key={f.titulo} id={f.id} tono={i % 2 === 0 ? 'blanco' : 'marfil'} espacio="amplio">
                        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                            <div className={invertida ? 'lg:order-2' : ''}>
                                {f.antetitulo && <Antetitulo className="mb-4">{f.antetitulo}</Antetitulo>}
                                <Titulo escala="bloque">{f.titulo}</Titulo>
                                <div className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-piedra-700">{f.texto}</div>
                                {f.puntos && (
                                    <ul className="mt-6 space-y-3">
                                        {f.puntos.map((p) => (
                                            <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-piedra-700">
                                                <Check className="mt-1 h-4 w-4 shrink-0 text-accent-gold" strokeWidth={2} aria-hidden />
                                                <span>{p}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className={invertida ? 'lg:order-1' : ''}>
                                <Lamina tono={f.lamina?.tono ?? 'piedra'} patron={f.lamina?.patron ?? 'ondas'} semilla={f.lamina?.semilla ?? 13 + i * 7} arte={f.lamina?.arte} className="rounded-2xl">
                                    <div className="flex items-center justify-center p-6 sm:p-10">
                                        <div className="w-full">
                                            <PintarVisual visual={f.visual} />
                                        </div>
                                    </div>
                                </Lamina>
                            </div>
                        </div>
                    </Seccion>
                );
            })}

            {children}

            <OtrosModulos actual={ruta} />
            <BloqueSeguridad />
            <CierreCTA />
            <PieDePagina />
        </main>
    );
}
