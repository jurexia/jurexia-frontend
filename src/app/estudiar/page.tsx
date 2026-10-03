import Link from 'next/link';
import { ArrowRight, BookOpenText, FileText, Play } from 'lucide-react';

import Navbar from '@/components/Navbar';
import PieDePagina, { IconoYouTube } from '@/components/PieDePagina';
import { EstadoEstreno, MarcaEstudiada, ProgresoEstudio } from '@/components/estudiar/Estudio';
import {
    CANAL_YOUTUBE,
    EJES,
    LECCIONES,
    clave,
    leccionesDelEje,
    numeroDe,
    plano,
    reloj,
    totales,
    type Leccion,
} from '@/lib/estudiar/catalogo';

/* ═══ ESTUDIAR Y PENSAR (3-oct-2026) ═══
   Los videos de conocimiento jurídico del canal, organizados como un programa
   de estudio, cada uno con su material de lectura. David: «elegante con su
   formato estándar pero agregando elementos académicos usuales en las páginas
   pedagógicas».

   Lo académico no es adorno, es estructura que sirve para estudiar:
   · un TEMARIO por ejes (I, II…) y lecciones numeradas (II.3), porque el
     orden importa: la historia del amparo va antes que sus límites;
   · un MÉTODO de tres pasos —ver, leer, pensar—, que es el orden en que el
     material está pensado para usarse;
   · ÍNDICES de personajes y de términos, que remiten a la lección donde se
     explican, como el índice analítico de un libro;
   · y en cada lección, preguntas para pensar con espacio para responderlas,
     glosario, fuentes y cómo citarla.

   Los videos se ven aquí sin volver a subirlos: son los de YouTube,
   incrustados. Las lecturas son los mismos PDF del canal. */

export default function EstudiarPage() {
    const t = totales();
    const primera = LECCIONES[0];

    // Índices: quién aparece y qué términos se definen, con su lección.
    const personajes = LECCIONES.flatMap((l) => l.semblanzas.map((s) => ({ ...s, leccion: l })))
        .sort((a, b) => apellido(a.nombre).localeCompare(apellido(b.nombre), 'es'));
    // Un término que se define en varias lecciones es una sola entrada del
    // índice, con el número de cada lección donde aparece.
    const porTermino = new Map<string, { termino: string; definicion: string; lecciones: Leccion[] }>();
    for (const l of LECCIONES) {
        for (const g of l.glosario) {
            const k = clave(g.termino);
            const ya = porTermino.get(k);
            if (ya) { if (!ya.lecciones.includes(l)) ya.lecciones.push(l); }
            else porTermino.set(k, { termino: g.termino, definicion: g.definicion, lecciones: [l] });
        }
    }
    const terminos = Array.from(porTermino.values())
        .sort((a, b) => clave(a.termino).localeCompare(clave(b.termino), 'es'));

    return (
        <main>
            <Navbar plataforma />

            {/* ── Cabecera ── */}
            <header className="border-b border-charcoal-900/[0.07] px-4 pb-14 pt-28 sm:px-6 sm:pt-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-brown">
                            Iurexia · Material de estudio
                        </p>
                        <h1 className="mt-4 font-serif text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.01em] text-charcoal-900 [text-wrap:balance] sm:text-6xl">
                            Estudiar <span className="text-accent-gold">y</span> pensar
                        </h1>
                        <p className="mt-6 max-w-2xl font-lectura text-[1.25rem] leading-relaxed text-charcoal-900/80 sm:text-[1.375rem]">
                            Lecciones de derecho mexicano en video, cada una con su material de lectura: los
                            antecedentes, los personajes, los documentos y las fuentes en que se apoya. Para
                            estudiarlas aquí mismo, a tu ritmo.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            {primera && (
                                <Link
                                    href={`/estudiar/${primera.slug}`}
                                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-charcoal-900 px-5 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800"
                                >
                                    Empezar por la lección {numeroDe(primera)}
                                    <ArrowRight className="h-4 w-4 text-accent-gold" />
                                </Link>
                            )}
                            <a
                                href="#programa"
                                className="inline-flex h-11 items-center rounded-lg border border-charcoal-900/15 px-5 text-[0.9375rem] font-medium text-charcoal-800 transition-colors hover:border-charcoal-900/30 hover:bg-charcoal-900/[0.03]"
                            >
                                Ver el programa
                            </a>
                            <a
                                href={CANAL_YOUTUBE}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-[0.9375rem] font-medium text-charcoal-800 transition-colors hover:text-charcoal-900"
                            >
                                <IconoYouTube className="h-[18px] w-[18px] text-[#c4302b]" />
                                Canal de YouTube
                            </a>
                        </div>

                        <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-y-6 border-t border-charcoal-900/10 pt-6 sm:grid-cols-4">
                            {[
                                [String(t.lecciones), 'lecciones'],
                                [`${t.minutosVideo} min`, 'de video'],
                                [String(t.paginas), 'páginas de lectura'],
                                [String(t.fuentes), 'fuentes citadas'],
                            ].map(([n, r]) => (
                                <div key={r}>
                                    <dd className="font-serif text-3xl font-semibold lining-nums tabular-nums text-charcoal-900">{n}</dd>
                                    <dt className="mt-0.5 text-[12.5px] text-charcoal-900/60">{r}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* El epígrafe: la definición de jurisprudencia de Ulpiano, que
                        une las dos palabras del nombre de esta sección. */}
                    <figure className="self-center border-l border-accent-gold/60 pl-6">
                        <blockquote className="font-lectura text-[1.1875rem] italic leading-relaxed text-charcoal-900">
                            «Iuris prudentia est divinarum atque humanarum rerum notitia, iusti atque iniusti scientia.»
                        </blockquote>
                        <p className="mt-3 font-lectura text-[0.98rem] leading-relaxed text-charcoal-900/65">
                            La jurisprudencia es el conocimiento de las cosas divinas y humanas, la ciencia de lo
                            justo y de lo injusto.
                        </p>
                        <figcaption className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-brown">
                            Ulpiano · Digesto 1.1.10.2
                        </figcaption>
                    </figure>
                </div>
            </header>

            {/* ── El método ── */}
            <section aria-labelledby="metodo" className="border-b border-charcoal-900/[0.07] bg-cream-200 px-4 py-14 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <h2 id="metodo" className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-brown">
                        Cómo estudiar cada lección
                    </h2>
                    <ol className="mt-6 grid gap-8 md:grid-cols-3 md:gap-10">
                        {[
                            [Play, 'Mira la lección', 'Un video de entre dos y veinte minutos que plantea el problema y cuenta su historia. Se reproduce aquí, sin salir de la página.'],
                            [BookOpenText, 'Lee el material', 'Un PDF de siete a dieciséis páginas: quién fue cada personaje, los extractos de los documentos y cada fuente con su enlace.'],
                            [FileText, 'Piensa las preguntas', 'Cada lección cierra con preguntas para el repaso y un glosario. Escribe tus respuestas: se guardan en tu navegador.'],
                        ].map(([Icono, titulo, texto], i) => {
                            const I = Icono as typeof Play;
                            return (
                                <li key={i} className="grid grid-cols-[2.75rem_1fr] gap-x-4">
                                    <span className="grid h-11 w-11 place-items-center rounded-full border border-accent-gold/50 bg-white font-serif text-lg font-semibold lining-nums text-charcoal-900">
                                        {i + 1}
                                    </span>
                                    <div>
                                        <h3 className="flex items-center gap-2 text-[1rem] font-semibold text-charcoal-900">
                                            <I className="h-4 w-4 text-accent-gold" />
                                            {titulo as string}
                                        </h3>
                                        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-charcoal-900/70">{texto as string}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </section>

            {/* ── El programa ── */}
            <section id="programa" aria-labelledby="titulo-programa" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-brown">Programa</p>
                            <h2 id="titulo-programa" className="mt-2 font-serif text-3xl font-semibold text-charcoal-900 sm:text-4xl">
                                {t.ejes} ejes, {t.lecciones} lecciones
                            </h2>
                        </div>
                        <ProgresoEstudio total={LECCIONES.length} ids={LECCIONES.map((l) => l.id)} />
                    </div>

                    <div className="mt-12 space-y-16">
                        {EJES.filter((e) => leccionesDelEje(e.id).length > 0).map((eje) => (
                            <section key={eje.id} id={`eje-${eje.id}`} aria-labelledby={`t-${eje.id}`} className="scroll-mt-20">
                                <div className="grid gap-x-8 gap-y-2 border-t-2 border-charcoal-900 pt-5 md:grid-cols-[5rem_1fr]">
                                    <span className="font-serif text-4xl font-semibold leading-none text-accent-gold" aria-hidden>
                                        {eje.numero}
                                    </span>
                                    <div>
                                        <h3 id={`t-${eje.id}`} className="font-serif text-2xl font-semibold text-charcoal-900">
                                            <span className="sr-only">Eje {eje.numero}. </span>{eje.titulo}
                                        </h3>
                                        <p className="mt-1.5 max-w-3xl font-lectura text-[1.0625rem] leading-relaxed text-charcoal-900/70">
                                            {eje.descripcion}
                                        </p>
                                    </div>
                                </div>

                                <ol className="mt-6 md:ml-[7rem]">
                                    {leccionesDelEje(eje.id).map((l) => (
                                        <FilaLeccion key={l.id} l={l} />
                                    ))}
                                </ol>
                            </section>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Índices ── */}
            <section aria-labelledby="indices" className="border-t border-charcoal-900/[0.07] bg-cream-200 px-4 py-16 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-brown">Índices</p>
                    <h2 id="indices" className="mt-2 font-serif text-3xl font-semibold text-charcoal-900">
                        Quién aparece y qué se define
                    </h2>

                    <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_1.35fr]">
                        <div>
                            <h3 className="border-b border-charcoal-900/15 pb-2 font-sans text-[13px] font-semibold text-charcoal-900">
                                Personajes <span className="font-normal text-charcoal-900/50">· {personajes.length}</span>
                            </h3>
                            <ul className="mt-2">
                                {personajes.map((p) => (
                                    <li key={p.nombre + p.leccion.id} className="border-b border-charcoal-900/[0.06]">
                                        <Link
                                            href={`/estudiar/${p.leccion.slug}#personajes`}
                                            className="group grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5"
                                        >
                                            <span>
                                                <span className="font-serif text-[1.0625rem] font-semibold text-charcoal-900 group-hover:underline group-hover:decoration-accent-gold group-hover:underline-offset-4">
                                                    {p.nombre}
                                                </span>
                                                <span className="ml-2 text-[12.5px] tabular-nums text-charcoal-900/55">{p.fechas}</span>
                                                <span className="mt-0.5 block text-[12.5px] text-charcoal-900/60" dangerouslySetInnerHTML={{ __html: p.campo }} />
                                            </span>
                                            <span className="text-[12px] font-medium tabular-nums text-accent-brown">{numeroDe(p.leccion)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="border-b border-charcoal-900/15 pb-2 font-sans text-[13px] font-semibold text-charcoal-900">
                                Términos <span className="font-normal text-charcoal-900/50">· {terminos.length}</span>
                            </h3>
                            <ul className="mt-2 columns-1 gap-x-8 sm:columns-2">
                                {terminos.map((g) => (
                                    <li key={plano(g.termino)} className="flex break-inside-avoid items-baseline justify-between gap-3 border-b border-charcoal-900/[0.06] py-2">
                                        <Link
                                            href={`/estudiar/${g.lecciones[0].slug}#glosario`}
                                            title={plano(g.definicion)}
                                            className="text-[13.5px] text-charcoal-900/85 hover:text-charcoal-900 hover:underline hover:decoration-accent-gold hover:underline-offset-4"
                                            dangerouslySetInnerHTML={{ __html: g.termino }}
                                        />
                                        <span className="flex shrink-0 gap-2">
                                            {g.lecciones.map((l) => (
                                                <Link
                                                    key={l.id}
                                                    href={`/estudiar/${l.slug}#glosario`}
                                                    className="text-[11.5px] font-medium tabular-nums text-accent-brown hover:text-charcoal-900"
                                                >
                                                    {numeroDe(l)}
                                                </Link>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── El canal ── */}
            <section className="bg-charcoal-950 px-4 py-16 text-white sm:px-6">
                <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1fr_auto]">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Derecho mexicano, explicado</p>
                        <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight [text-wrap:balance]">
                            Cada lección nace en el canal de Iurexia en YouTube
                        </h2>
                        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-white/65">
                            Suscríbete para enterarte cuando se publique la siguiente. Aquí la encontrarás después,
                            con su material de lectura. Todo el contenido es informativo y no sustituye la asesoría
                            de un abogado.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2.5 sm:flex-row md:flex-col">
                        <a
                            href={CANAL_YOUTUBE}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-[0.9375rem] font-semibold text-charcoal-900 transition-colors hover:bg-cream-200"
                        >
                            <IconoYouTube className="h-[18px] w-[18px] text-[#c4302b]" />
                            Ir al canal
                        </a>
                        <Link
                            href="/chat"
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-5 text-[0.9375rem] font-medium text-white/85 transition-colors hover:border-white/40 hover:text-white"
                        >
                            Consultar un tema en Iurexia
                        </Link>
                    </div>
                </div>
            </section>

            <PieDePagina />
        </main>
    );
}

function FilaLeccion({ l }: { l: Leccion }) {
    return (
        <li className="border-b border-charcoal-900/[0.08] last:border-b-0">
            <Link href={`/estudiar/${l.slug}`} className="group grid gap-4 py-5 sm:grid-cols-[15rem_1fr] sm:gap-6">
                <span className="relative block aspect-video overflow-hidden rounded-lg bg-charcoal-950 ring-1 ring-charcoal-900/10">
                    {l.miniatura640 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={l.miniatura640}
                            alt=""
                            width={640}
                            height={360}
                            loading="lazy"
                            className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                        />
                    )}
                    <span className="absolute bottom-2 right-2 rounded bg-charcoal-950/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                        {reloj(l.duracion)}
                    </span>
                </span>

                <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-brown">
                            Lección {numeroDe(l)}
                        </span>
                        <EstadoEstreno publicado={l.publicado} />
                        <MarcaEstudiada id={l.id} />
                    </span>
                    <span
                        className="mt-1.5 block font-serif text-[1.375rem] font-semibold leading-snug text-charcoal-900 [text-wrap:balance] group-hover:underline group-hover:decoration-accent-gold group-hover:decoration-2 group-hover:underline-offset-[6px]"
                        dangerouslySetInnerHTML={{ __html: l.titulo }}
                    />
                    <span className="mt-1 block font-lectura text-[1.0625rem] leading-snug text-charcoal-900/70" dangerouslySetInnerHTML={{ __html: l.subtitulo }} />
                    <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-charcoal-900/60">
                        <span className="inline-flex items-center gap-1.5">
                            <Play className="h-3 w-3 fill-current" /> Video de {reloj(l.duracion)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Lectura de {l.lectura.paginas} páginas · {l.lectura.minutos} min
                        </span>
                        <span>{l.fuentes.length} fuentes</span>
                    </span>
                </span>
            </Link>
        </li>
    );
}

/* Para ordenar los personajes por apellido. La regla general es la última
   palabra («Hans Kelsen» → Kelsen); los apellidos compuestos se dicen aquí,
   porque ningún algoritmo sabe que «Camacho Solís» son dos apellidos y
   «Wendell Holmes» no. */
const APELLIDOS: Record<string, string> = {
    'Sergio García Ramírez': 'García Ramírez',
    'Manuel Camacho Solís': 'Camacho Solís',
    'Oliver Wendell Holmes Jr.': 'Holmes',
};

function apellido(nombre: string): string {
    if (APELLIDOS[nombre]) return APELLIDOS[nombre];
    const partes = nombre.replace(/\s+(Jr\.|Sr\.)$/, '').split(/\s+/);
    return partes[partes.length - 1];
}
