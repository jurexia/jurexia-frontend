import Link from 'next/link';
import { ArrowRight, ChevronRight, KeyRound, Lock, ShieldCheck, Trash2, CreditCard, EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';
import BotonProbar from '@/components/BotonProbar';
import { Antetitulo, Boton, clasesBoton, EnlaceFlecha, Entrada, Seccion, Titulo } from '@/components/web/sistema';

/* ═══ LOS MÓDULOS QUE SE REPITEN (3-oct-2026) ═══
   Harvey cierra cada página con los mismos bloques —la plataforma, la
   seguridad, la llamada final— y por eso todo su sitio se lee como una sola
   pieza. Aquí viven los de Iurexia, para que la portada y las páginas de cada
   módulo digan lo mismo con las mismas palabras. */

/* ── La captura enmarcada: el producto real, nunca un dibujo ── */
export function Captura({
    src,
    alt,
    ancho,
    alto,
    barra,
    prioridad = false,
    className = '',
}: {
    src: string;
    alt: string;
    ancho: number;
    alto: number;
    /** La dirección que se pinta en la barra de la ventana («iurexia.com/chat»). */
    barra?: string;
    prioridad?: boolean;
    className?: string;
}) {
    return (
        <figure className={`overflow-hidden rounded-xl bg-white shadow-[0_30px_70px_-25px_rgba(15,14,13,0.55)] ring-1 ring-black/10 ${className}`}>
            {barra && (
                <div className="flex items-center gap-2 border-b border-black/5 bg-piedra-50 px-3 py-2" aria-hidden>
                    <span className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-tinta/15" />
                        <span className="h-2.5 w-2.5 rounded-full bg-tinta/10" />
                        <span className="h-2.5 w-2.5 rounded-full bg-tinta/[0.07]" />
                    </span>
                    <span className="flex-1 text-center text-[11px] font-medium text-piedra-500">{barra}</span>
                    <span className="w-10" />
                </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} width={ancho} height={alto} loading={prioridad ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
        </figure>
    );
}

/* ── Las migas de las páginas internas ── */
export function Miga({ pasos }: { pasos: { href?: string; texto: string }[] }) {
    return (
        <nav aria-label="Ruta" className="mb-8 text-[13px] text-piedra-600">
            <ol className="flex flex-wrap items-center gap-1.5">
                {pasos.map((p, i) => (
                    <li key={p.texto} className="flex items-center gap-1.5">
                        {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-piedra-400" aria-hidden />}
                        {p.href ? (
                            <Link href={p.href} className="underline-offset-4 hover:text-tinta hover:underline">{p.texto}</Link>
                        ) : (
                            <span aria-current="page" className="text-tinta">{p.texto}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

/* ── Las cifras: grandes, en Playfair, cada una con lo que mide ──
   Sólo números que ya publica la web y que se pueden comprobar: el acervo
   (Qdrant), las entidades, el rango de fuentes de una consulta ordinaria que
   dio David, el corpus de precedentes y la auditoría de citas. Si una deja de
   ser cierta, se cambia el número, no el adjetivo. */
export const CIFRAS: { cifra: string; texto: string }[] = [
    { cifra: '2M+', texto: 'Fragmentos de leyes, jurisprudencia y sentencias en el acervo' },
    { cifra: '32', texto: 'Entidades federativas con su legislación, además de la federal' },
    { cifra: '60–100', texto: 'Fuentes verificadas en una consulta ordinaria, según lo que se pregunte' },
    { cifra: '111,000+', texto: 'Sentencias de Tribunales Colegiados en el corpus de precedentes' },
    { cifra: '97%', texto: 'De las citas abren su documento oficial' },
];

export function Cifras({ titulo = 'El acervo, medido', entrada }: { titulo?: ReactNode; entrada?: ReactNode }) {
    return (
        <Seccion tono="tinta" espacio="amplio">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
                <div>
                    <Antetitulo oscuro className="mb-4">En cifras</Antetitulo>
                    <Titulo oscuro escala="bloque">{titulo}</Titulo>
                    {entrada && <Entrada oscuro className="mt-5 max-w-md">{entrada}</Entrada>}
                </div>
                <dl className="divide-y divide-white/10 border-y border-white/10">
                    {CIFRAS.map((c) => (
                        <div key={c.texto} className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <dt className="order-2 text-[15px] leading-snug text-white/60 sm:order-1">{c.texto}</dt>
                            <dd className="order-1 whitespace-nowrap font-serif text-[2.25rem] font-normal leading-none tracking-[-0.02em] text-cream-100 sm:order-2 sm:text-display-l">{c.cifra}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </Seccion>
    );
}

/* ── La seguridad, como lista de controles ──
   Sólo lo que la página de Seguridad ya afirma. Sin sellos ni certificaciones
   que Iurexia no tiene (SOC 2, ISO): exhibirlas sería mentir. */
const CONTROLES = [
    { Icono: Lock, titulo: 'Cifrado en tránsito', texto: 'Tus consultas y documentos viajan cifrados con TLS.' },
    { Icono: ShieldCheck, titulo: 'Sin entrenamiento con tus datos', texto: 'Lo que escribes no se usa para entrenar modelos, ni propios ni de terceros.' },
    { Icono: EyeOff, titulo: 'Sólo tú lo ves', texto: 'Ni el equipo de Iurexia ni otros usuarios leen tus consultas ni tus carpetas.' },
    { Icono: Trash2, titulo: 'Borras cuando quieras', texto: 'Historial, documentos y cuenta se eliminan desde tu perfil, sin pedirlo por correo.' },
    { Icono: CreditCard, titulo: 'Pagos con Stripe', texto: 'Iurexia no ve ni guarda los datos de tu tarjeta.' },
];

export function BloqueSeguridad({ tono = 'tinta' }: { tono?: 'tinta' | 'marfil' }) {
    const oscuro = tono === 'tinta';
    return (
        <Seccion tono={tono} espacio="amplio" className={oscuro ? 'border-t border-white/[0.06]' : ''}>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-20">
                <div>
                    <Antetitulo oscuro={oscuro} className="mb-4">Seguridad</Antetitulo>
                    <Titulo oscuro={oscuro} escala="bloque">Tu información, protegida en cada paso</Titulo>
                    <Entrada oscuro={oscuro} className="mt-5 max-w-md">
                        El secreto profesional no se negocia. Iurexia se construyó para que lo que escribes de un cliente
                        se quede entre tú y tu cliente.
                    </Entrada>
                    <div className="mt-8">
                        <Boton href="/seguridad" variante="secundario" oscuro={oscuro} tamano="sm">
                            Cómo protegemos tu información
                        </Boton>
                    </div>
                </div>
                <ul className={`divide-y border-y ${oscuro ? 'divide-white/10 border-white/10' : 'divide-tinta/10 border-tinta/10'}`}>
                    {CONTROLES.map(({ Icono, titulo, texto }) => (
                        <li key={titulo} className="flex items-start gap-4 py-5">
                            <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${oscuro ? 'text-cream-100/80' : 'text-tinta/70'}`} strokeWidth={1.5} aria-hidden />
                            <div className="min-w-0">
                                <p className={`text-[15px] font-medium ${oscuro ? 'text-cream-100' : 'text-tinta'}`}>{titulo}</p>
                                <p className={`mt-1 text-[14px] leading-relaxed ${oscuro ? 'text-white/55' : 'text-piedra-600'}`}>{texto}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </Seccion>
    );
}

/* ── La familia de módulos, para saltar de uno a otro ── */
export const MODULOS = [
    { href: '/plataforma/consulta', titulo: 'Consulta con fuentes', texto: 'Cada respuesta con su fundamento, y cada cita abre su documento oficial.', imagen: '/web/producto/consulta.webp' },
    { href: '/plataforma/redaccion', titulo: 'Redacción y flujos', texto: 'Del encargo al escrito terminado, parte por parte y con el esfuerzo que elijas.', imagen: '/web/producto/flujos.webp' },
    { href: '/plataforma/carpetas', titulo: 'Carpetas y seguimiento', texto: 'Cada asunto con sus documentos, lo que le falta y sus expedientes vigilados.', imagen: '/web/producto/carpeta.webp' },
    { href: '/secretarios', titulo: 'Taller de sentencias', texto: 'El estudio de fondo y el proyecto de resolución, para el Poder Judicial.', imagen: '/web/producto/taller-recorrido.webp' },
];

export function OtrosModulos({ actual, titulo = 'Una plataforma para todo el trabajo jurídico' }: { actual?: string; titulo?: ReactNode }) {
    const lista = MODULOS.filter((m) => m.href !== actual);
    return (
        <Seccion tono="marfil" espacio="amplio">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Titulo escala="bloque" className="max-w-xl">{titulo}</Titulo>
                <EnlaceFlecha href="/plataforma">Ver la plataforma</EnlaceFlecha>
            </div>
            <div className={`mt-10 grid gap-5 ${lista.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                {lista.map((m) => (
                    <Link key={m.href} href={m.href} className="group flex flex-col overflow-hidden rounded-xl border border-tinta/10 bg-white transition-colors hover:border-tinta/25">
                        <div className="aspect-[16/10] overflow-hidden border-b border-tinta/10 bg-piedra-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.imagen} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-left-top" />
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                            <p className="font-serif text-xl font-normal text-tinta">{m.titulo}</p>
                            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-piedra-600">{m.texto}</p>
                            <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-tinta group-hover:underline group-hover:underline-offset-4">
                                Conocer <ArrowRight className="h-4 w-4" aria-hidden />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </Seccion>
    );
}

/* ── La llamada final, igual en todas las páginas ── */
export function CierreCTA({ titulo = 'Empieza hoy con Iurexia', entrada = 'Pregunta como se lo plantearías a un colega y comprueba cada fuente.' }: { titulo?: ReactNode; entrada?: ReactNode }) {
    return (
        <section className="bg-tinta text-cream-100">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <div className="max-w-2xl">
                    <p className="font-serif text-display-xs font-normal sm:text-display-s">{titulo}</p>
                    <p className="mt-3 text-[1.0625rem] text-white/60">{entrada}</p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row">
                    <BotonProbar className={clasesBoton({ oscuro: true })} sub="Sin correo, sin tarjeta." subClassName="text-xs text-white/50">
                        Probar sin registrarme
                    </BotonProbar>
                    <Boton href="/registro" variante="secundario" oscuro>Crear cuenta gratis</Boton>
                </div>
            </div>
        </section>
    );
}

/* ── Un beneficio con su icono, para las filas de tres ── */
export function Beneficio({ Icono = KeyRound, titulo, children }: { Icono?: typeof KeyRound; titulo: string; children: ReactNode }) {
    return (
        <div>
            <Icono className="h-5 w-5 text-tinta/70" strokeWidth={1.5} aria-hidden />
            <p className="mt-4 text-[1.0625rem] font-medium text-tinta">{titulo}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-piedra-600">{children}</p>
        </div>
    );
}
