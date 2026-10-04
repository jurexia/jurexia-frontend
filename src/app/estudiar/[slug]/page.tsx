import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, ExternalLink, FileText, Play } from 'lucide-react';

import Navbar from '@/components/Navbar';
import PieDePagina from '@/components/PieDePagina';
import VideoLeccion from '@/components/estudiar/VideoLeccion';
import { CopiarTexto, MarcarEstudiada, PreguntasParaPensar } from '@/components/estudiar/Estudio';
import { claseWeb } from '@/lib/fuentes-web';
import {
    LECCIONES,
    duracionISO,
    ejeDe,
    leccionPorSlug,
    numeroDe,
    plano,
    reloj,
    vecinas,
} from '@/lib/estudiar/catalogo';

/* Una lección: el video, su material de lectura y lo necesario para
   estudiarla —resumen, ideas, personajes, documentos, preguntas, glosario,
   fuentes y cómo citarla—. Todo sale de la misma lectura que el PDF. */

export function generateStaticParams() {
    return LECCIONES.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
    const l = leccionPorSlug(params.slug);
    if (!l) return {};
    const descripcion = l.resumenPlano.length > 158 ? `${l.resumenPlano.slice(0, 155).replace(/\s+\S*$/, '')}…` : l.resumenPlano;
    return {
        title: `${l.tituloPlano} · Estudiar y pensar | Iurexia`,
        description: descripcion,
        alternates: { canonical: `/estudiar/${l.slug}` },
        openGraph: {
            title: `${l.tituloPlano} · Lección ${numeroDe(l)}`,
            description: descripcion,
            url: `https://www.iurexia.com/estudiar/${l.slug}`,
            siteName: 'Iurexia',
            locale: 'es_MX',
            type: 'article',
            images: l.miniatura ? [{ url: l.miniatura, width: 1280, height: 720, alt: l.tituloPlano }] : undefined,
        },
        twitter: { card: 'summary_large_image', title: l.tituloPlano, description: descripcion, images: l.miniatura ? [l.miniatura] : undefined },
    };
}

const ETIQUETA = 'font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brown';
const TITULO_SECCION = 'font-serif text-[1.75rem] font-semibold leading-tight text-charcoal-900';

export default function LeccionPage({ params }: { params: { slug: string } }) {
    const l = leccionPorSlug(params.slug);
    if (!l) notFound();

    const eje = ejeDe(l);
    const numero = numeroDe(l);
    const { anterior, siguiente } = vecinas(l);
    const url = `https://www.iurexia.com/estudiar/${l.slug}`;
    const cita = `Iurexia, «${plano(l.titulo)}. ${plano(l.subtitulo)}», Estudiar y pensar, lección ${numero}: video (${reloj(l.duracion)}) y material de lectura, actualizado al ${l.actualizado}. ${url}`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'LearningResource',
                name: l.tituloPlano,
                alternativeHeadline: plano(l.subtitulo),
                description: l.resumenPlano,
                url,
                inLanguage: 'es-MX',
                educationalLevel: 'Licenciatura en Derecho',
                learningResourceType: ['Lección en video', 'Material de lectura'],
                isAccessibleForFree: true,
                keywords: l.claves.join(', '),
                isPartOf: { '@type': 'Course', name: 'Estudiar y pensar', url: 'https://www.iurexia.com/estudiar', provider: { '@type': 'Organization', name: 'Iurexia', url: 'https://www.iurexia.com' } },
                hasPart: [{ '@type': 'DigitalDocument', name: `Material de lectura: ${l.tituloPlano}`, encodingFormat: 'application/pdf', url: `https://www.iurexia.com${l.lectura.pdf}`, numberOfPages: l.lectura.paginas }],
            },
            {
                '@type': 'VideoObject',
                name: l.tituloVideo,
                description: l.resumenPlano,
                thumbnailUrl: l.miniatura ? [`https://www.iurexia.com${l.miniatura}`] : undefined,
                uploadDate: l.publicado,
                duration: duracionISO(l.duracion),
                embedUrl: `https://www.youtube-nocookie.com/embed/${l.youtube}`,
                contentUrl: `https://www.youtube.com/watch?v=${l.youtube}`,
                inLanguage: 'es-MX',
                publisher: { '@type': 'Organization', name: 'Iurexia', url: 'https://www.iurexia.com' },
            },
        ],
    };

    return (
        <main className={claseWeb}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Navbar plataforma />

            <article className="px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
                <div className="mx-auto max-w-6xl">
                    {/* ── Migas ── */}
                    <nav aria-label="Ruta" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-charcoal-900/55">
                        <Link href="/estudiar" className="font-medium text-charcoal-900/70 transition-colors hover:text-charcoal-900">
                            Estudiar y pensar
                        </Link>
                        <span aria-hidden>/</span>
                        <Link href={`/estudiar#eje-${eje.id}`} className="transition-colors hover:text-charcoal-900">
                            {eje.numero}. {eje.titulo}
                        </Link>
                    </nav>

                    {/* ── Cabecera ── */}
                    <header className="mt-6 max-w-4xl">
                        <p className={ETIQUETA}>Lección {numero}</p>
                        <h1
                            className="mt-3 font-serif text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.01em] text-charcoal-900 [text-wrap:balance] sm:text-5xl"
                            dangerouslySetInnerHTML={{ __html: l.titulo }}
                        />
                        <p className="mt-4 font-lectura text-[1.25rem] leading-snug text-charcoal-900/75 [text-wrap:balance] sm:text-[1.375rem]" dangerouslySetInnerHTML={{ __html: l.subtitulo }} />
                        <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-charcoal-900/60">
                            <span className="inline-flex items-center gap-1.5"><Play className="h-3 w-3 fill-current" /> Video de {reloj(l.duracion)}</span>
                            <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Lectura de {l.lectura.paginas} páginas · {l.lectura.minutos} min</span>
                            <span>Nivel: {l.nivel}</span>
                            <span>Actualizada al {l.actualizado}</span>
                        </p>
                    </header>

                    <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
                        {/* ── El video ── */}
                        <div className="min-w-0">
                            <VideoLeccion
                                youtube={l.youtube}
                                titulo={l.tituloVideo}
                                miniatura={l.miniatura}
                                publicado={l.publicado}
                                duracion={reloj(l.duracion)}
                                capitulos={l.capitulosVideo}
                            />
                        </div>

                        {/* ── La lectura: al lado en escritorio, bajo el video en el teléfono ── */}
                        <aside aria-label="Material de lectura" className="lg:row-span-2">
                            <div className="space-y-8 lg:sticky lg:top-24">
                                <div className="rounded-xl border border-charcoal-900/10 bg-white p-5">
                                    <p className={ETIQUETA}>Material de lectura</p>
                                    <a href={l.lectura.pdf} target="_blank" rel="noopener" className="group mt-4 block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={l.portada}
                                            alt={`Portada de la lectura «${l.tituloPlano}»`}
                                            width={935}
                                            height={1210}
                                            className="mx-auto w-[11.5rem] rounded-sm shadow-[0_1px_2px_rgba(15,14,13,0.12),0_10px_28px_-10px_rgba(15,14,13,0.4)] ring-1 ring-charcoal-900/10 transition-transform duration-300 group-hover:-translate-y-0.5"
                                        />
                                    </a>
                                    <p className="mt-4 text-center text-[12.5px] text-charcoal-900/60">
                                        PDF · {l.lectura.paginas} páginas · {formatoPeso(l.lectura.kb)}
                                    </p>
                                    <div className="mt-4 grid gap-2">
                                        <a
                                            href={l.lectura.pdf}
                                            target="_blank"
                                            rel="noopener"
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-charcoal-900 px-4 text-[0.875rem] font-medium text-white transition-colors hover:bg-charcoal-800"
                                        >
                                            <ExternalLink className="h-4 w-4 text-accent-gold" />
                                            Leer en el navegador
                                        </a>
                                        <a
                                            href={l.lectura.pdf}
                                            download
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-charcoal-900/15 px-4 text-[0.875rem] font-medium text-charcoal-800 transition-colors hover:border-charcoal-900/30 hover:bg-charcoal-900/[0.03]"
                                        >
                                            <Download className="h-4 w-4" />
                                            Descargar
                                        </a>
                                    </div>
                                </div>

                                <div>
                                    <p className={ETIQUETA}>Contenido de la lectura</p>
                                    <ol className="mt-3 space-y-1.5">
                                        {l.secciones.map((s, i) => (
                                            <li key={s} className="grid grid-cols-[1.5rem_1fr] text-[13.5px] leading-snug text-charcoal-900/80">
                                                <span className="font-serif font-semibold lining-nums text-accent-gold">{i + 1}</span>
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                        {l.anexos.length > 0 && (
                                            <li className="pt-1 text-[12.5px] text-charcoal-900/55">{l.anexos.join(' · ')}</li>
                                        )}
                                    </ol>
                                </div>

                                <div>
                                    <p className={ETIQUETA}>Palabras clave</p>
                                    <ul className="mt-3 flex flex-wrap gap-1.5">
                                        {l.claves.map((c) => (
                                            <li key={c} className="rounded-md border border-charcoal-900/10 bg-cream-100 px-2 py-1 text-[12px] text-charcoal-900/75">
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </aside>

                        {/* ── El estudio ── */}
                        <div className="min-w-0 space-y-16 lg:col-start-1">
                            <section aria-labelledby="resumen">
                                <h2 id="resumen" className={ETIQUETA}>Resumen</h2>
                                <p className="mt-3 font-lectura text-[1.1875rem] leading-[1.7] text-charcoal-900" dangerouslySetInnerHTML={{ __html: l.resumen }} />
                            </section>

                            {l.ideas.length > 0 && (
                                <section aria-labelledby="ideas">
                                    <h2 id="ideas" className={TITULO_SECCION}>Lo que vas a aprender</h2>
                                    <ul className="mt-6 space-y-4">
                                        {l.ideas.map((idea, i) => (
                                            <li key={i} className="grid grid-cols-[1.25rem_1fr] gap-x-3">
                                                <span className="mt-[0.7rem] h-[7px] w-[7px] rotate-45 bg-accent-gold" aria-hidden />
                                                <span className="font-lectura text-[1.0625rem] leading-relaxed text-charcoal-900" dangerouslySetInnerHTML={{ __html: idea }} />
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {l.semblanzas.length > 0 && (
                                <section id="personajes" aria-labelledby="t-personajes" className="scroll-mt-24">
                                    <h2 id="t-personajes" className={TITULO_SECCION}>Personajes</h2>
                                    <p className="mt-2 text-[14px] text-charcoal-900/60">Quién fue cada uno, en qué campo trabajó y qué aportó.</p>
                                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                                        {l.semblanzas.map((s) => (
                                            <article key={s.nombre} className="rounded-xl border border-charcoal-900/10 bg-white p-5">
                                                <h3 className="font-serif text-[1.25rem] font-semibold leading-snug text-charcoal-900">{s.nombre}</h3>
                                                <p className="mt-0.5 text-[12.5px] tabular-nums text-charcoal-900/55">{s.fechas}</p>
                                                {s.campo && <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.1em] text-accent-brown" dangerouslySetInnerHTML={{ __html: s.campo.replace(/\.$/, '') }} />}
                                                <dl className="mt-4 space-y-3">
                                                    {[['Quién fue', s.quien], ['Qué aportó', s.aporte]].filter(([, v]) => v).map(([k, v]) => (
                                                        <div key={k}>
                                                            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-900/50">{k}</dt>
                                                            <dd className="mt-1 font-lectura text-[1rem] leading-relaxed text-charcoal-900/90" dangerouslySetInnerHTML={{ __html: v }} />
                                                        </div>
                                                    ))}
                                                </dl>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {l.documentos.length > 0 && (
                                <section aria-labelledby="documentos">
                                    <h2 id="documentos" className={TITULO_SECCION}>Documentos que se estudian</h2>
                                    <p className="mt-2 text-[14px] text-charcoal-900/60">
                                        Un extracto de cada uno. El texto completo de los extractos, con su fuente, está en la lectura.
                                    </p>
                                    <ol className="mt-6 space-y-6">
                                        {l.documentos.map((d, i) => (
                                            <li key={i} className="border-l-2 border-accent-gold/60 pl-5">
                                                <span className="inline-block rounded border border-charcoal-900/15 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-charcoal-900/65">
                                                    {d.etiqueta || d.tipoNombre}
                                                </span>
                                                <h3 className="mt-2 font-sans text-[15px] font-semibold leading-snug text-charcoal-900" dangerouslySetInnerHTML={{ __html: d.titulo }} />
                                                {d.extracto && (
                                                    <blockquote className="mt-2 font-lectura text-[1.0625rem] italic leading-relaxed text-charcoal-900/80" dangerouslySetInnerHTML={{ __html: d.extracto }} />
                                                )}
                                                {d.traducido && (
                                                    <p className="mt-1.5 text-[12px] text-charcoal-900/50">
                                                        Traducción propia{d.idioma ? ` del ${d.idioma}` : ''}; el texto original está en la lectura.
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            )}

                            {l.cronologias.map((c, i) => (
                                <section key={i} aria-label={plano(c.titulo) || 'Cronología'}>
                                    <h2 className={TITULO_SECCION}>{c.titulo ? <span dangerouslySetInnerHTML={{ __html: c.titulo }} /> : 'Cronología'}</h2>
                                    <div className="mt-5 overflow-x-auto">
                                        <table className="w-full text-left">
                                            <tbody>
                                                {c.filas.map((f, j) => (
                                                    <tr key={j} className="border-b border-charcoal-900/[0.08] align-baseline">
                                                        <td className="w-24 py-2.5 pr-4 font-serif text-[15px] font-semibold lining-nums tabular-nums text-accent-brown">{f.anio}</td>
                                                        <td className="py-2.5 font-lectura text-[1rem] leading-relaxed text-charcoal-900/90" dangerouslySetInnerHTML={{ __html: f.texto }} />
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            ))}

                            {l.preguntas.length > 0 && (
                                <section aria-labelledby="pensar" className="rounded-2xl bg-cream-200 p-6 ring-1 ring-charcoal-900/[0.06] sm:p-8">
                                    <p className={ETIQUETA}>Para pensar</p>
                                    <h2 id="pensar" className={`mt-2 ${TITULO_SECCION}`}>Preguntas para el repaso</h2>
                                    <p className="mt-2 max-w-2xl text-[14px] text-charcoal-900/60">
                                        Respóndelas por escrito antes de volver a la lectura. Lo que escribas se queda en tu navegador.
                                    </p>
                                    <div className="mt-7">
                                        <PreguntasParaPensar id={l.id} preguntas={l.preguntas} />
                                    </div>
                                </section>
                            )}

                            {l.glosario.length > 0 && (
                                <section id="glosario" aria-labelledby="t-glosario" className="scroll-mt-24">
                                    <h2 id="t-glosario" className={TITULO_SECCION}>Glosario</h2>
                                    <dl className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
                                        {l.glosario.map((g, i) => (
                                            <div key={i} className="border-t border-charcoal-900/10 pt-3">
                                                <dt className="text-[14px] font-semibold text-charcoal-900" dangerouslySetInnerHTML={{ __html: g.termino }} />
                                                <dd className="mt-1 font-lectura text-[1rem] leading-relaxed text-charcoal-900/80" dangerouslySetInnerHTML={{ __html: g.definicion }} />
                                            </div>
                                        ))}
                                    </dl>
                                </section>
                            )}

                            <section aria-labelledby="t-fuentes">
                                <details className="group rounded-xl border border-charcoal-900/10 bg-white">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                                        <span>
                                            <span id="t-fuentes" className="font-serif text-[1.25rem] font-semibold text-charcoal-900">Fuentes</span>
                                            <span className="ml-2 text-[13px] text-charcoal-900/55">{l.fuentes.length}, en el orden en que la lectura las cita</span>
                                        </span>
                                        <span className="text-[12.5px] font-medium text-accent-brown group-open:hidden">Ver todas</span>
                                        <span className="hidden text-[12.5px] font-medium text-accent-brown group-open:inline">Ocultar</span>
                                    </summary>
                                    <ol className="space-y-3 border-t border-charcoal-900/[0.07] px-5 py-5">
                                        {l.fuentes.map((f, i) => (
                                            <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-x-2 text-[13.5px] leading-relaxed text-charcoal-900/85">
                                                <span className="tabular-nums text-charcoal-900/45">{i + 1}.</span>
                                                <span>
                                                    <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-brown">{f.tipoNombre}</span>
                                                    <span dangerouslySetInnerHTML={{ __html: f.referencia }} />
                                                    {f.url && (
                                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 break-all text-[12.5px] font-medium text-charcoal-900/60 underline decoration-charcoal-900/20 underline-offset-2 hover:text-charcoal-900">
                                                            {dominio(f.url)} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </details>
                            </section>

                            <section aria-labelledby="citar" className="border-t border-charcoal-900/10 pt-8">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 id="citar" className={ETIQUETA}>Cómo citar esta lección</h2>
                                    <CopiarTexto texto={cita} etiqueta="Copiar la cita" />
                                </div>
                                <p className="mt-3 font-lectura text-[1rem] leading-relaxed text-charcoal-900/80">{cita}</p>
                                <p className="mt-4 text-[12.5px] leading-relaxed text-charcoal-900/50">
                                    Material académico e informativo; no sustituye la asesoría de un abogado. Las traducciones de
                                    textos en otros idiomas son propias.
                                </p>
                            </section>

                            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-charcoal-900/10 bg-white px-5 py-4">
                                <p className="text-[14px] text-charcoal-900/70">¿Terminaste la lección? Márcala para llevar tu avance en el programa.</p>
                                <MarcarEstudiada id={l.id} />
                            </div>

                            {/* ── Anterior y siguiente ── */}
                            <nav aria-label="Otras lecciones" className="grid gap-3 sm:grid-cols-2">
                                {anterior ? <Vecina l={anterior} rotulo="Lección anterior" lado="izq" /> : <span />}
                                {siguiente ? <Vecina l={siguiente} rotulo="Siguiente lección" lado="der" /> : <span />}
                            </nav>

                            <aside className="rounded-2xl bg-charcoal-950 p-6 text-white sm:p-8">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-gold">Del aula al caso</p>
                                <p className="mt-3 max-w-2xl font-serif text-2xl font-semibold leading-snug [text-wrap:balance]">
                                    ¿Un asunto real sobre este tema? Pregúntale a Iurexia.
                                </p>
                                <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/65">
                                    Responde con la legislación y la jurisprudencia vigentes de tu entidad, y cada cita abre su
                                    documento oficial.
                                </p>
                                <Link
                                    href="/chat"
                                    className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-[0.9375rem] font-semibold text-charcoal-900 transition-colors hover:bg-cream-200"
                                >
                                    Consultar en Iurexia
                                    <ArrowRight className="h-4 w-4 text-accent-brown" />
                                </Link>
                            </aside>
                        </div>
                    </div>
                </div>
            </article>

            <PieDePagina />
        </main>
    );
}

function Vecina({ l, rotulo, lado }: { l: NonNullable<ReturnType<typeof leccionPorSlug>>; rotulo: string; lado: 'izq' | 'der' }) {
    return (
        <Link
            href={`/estudiar/${l.slug}`}
            className={`group rounded-xl border border-charcoal-900/10 px-5 py-4 transition-colors hover:border-charcoal-900/25 hover:bg-white ${lado === 'der' ? 'text-right' : ''}`}
        >
            <span className={`flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent-brown ${lado === 'der' ? 'justify-end' : ''}`}>
                {lado === 'izq' && <ArrowLeft className="h-3.5 w-3.5" />}
                {rotulo} · {numeroDe(l)}
                {lado === 'der' && <ArrowRight className="h-3.5 w-3.5" />}
            </span>
            <span className="mt-1.5 block font-serif text-[1.0625rem] font-semibold leading-snug text-charcoal-900" dangerouslySetInnerHTML={{ __html: l.titulo }} />
        </Link>
    );
}

function dominio(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'enlace';
    }
}

function formatoPeso(kb: number): string {
    return kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.0', '')} MB` : `${kb} KB`;
}
