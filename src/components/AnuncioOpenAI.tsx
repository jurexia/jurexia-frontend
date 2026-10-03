import Link from 'next/link';
import { ArrowRight, Landmark, ShieldCheck, Sparkles } from 'lucide-react';

/* ═══ EL ANUNCIO: IUREXIA, AHORA CON OPENAI (3-oct-2026) ═══
   David: «la estrategia es apalancarnos de OpenAI para impulsar confianza…
   un mensaje inteligente que nos proteja pero que a su vez dé al usuario la
   confianza de que está ante modelos de punta (porque sí lo está)».

   El orden del mensaje es el argumento:
   1. QUÉ CAMBIÓ: los modelos de punta de OpenAI, la empresa detrás de ChatGPT,
      en el núcleo de la consulta y de la redacción. Es lo que da confianza.
   2. QUÉ NO CAMBIÓ: el modelo no responde de memoria; trabaja sobre el acervo
      mexicano verificado y cada cita se coteja. Es lo que nos protege: la
      respuesta sigue siendo de Iurexia y con sus fuentes, no «lo que dijo
      ChatGPT».
   3. LA PRIVACIDAD, con las palabras de David: la integración cumple la
      política de privacidad; los datos no se comparten ni entrenan modelos,
      ni propios ni de terceros, incluido OpenAI.

   El alcance se dice con precisión («el núcleo de la consulta y de la
   redacción») porque no todos los módulos corren con OpenAI: Sálvame, por
   ejemplo, no. Va justo bajo la portada de vídeo: es lo primero que se lee. */

const PUNTOS = [
    {
        Icono: Sparkles,
        titulo: 'Modelos de punta',
        texto: 'Los de OpenAI, en el núcleo de la consulta y de la redacción: razonan con más profundidad y escriben con más precisión.',
    },
    {
        Icono: Landmark,
        titulo: 'Con fuentes mexicanas',
        texto: 'El modelo razona sobre el acervo de Iurexia —legislación federal y de las 32 entidades, jurisprudencia y precedentes— y cada cita abre su documento oficial.',
    },
    {
        Icono: ShieldCheck,
        titulo: 'Tu información, protegida',
        texto: 'Tus datos no se comparten ni se usan para entrenar modelos, ni propios ni de terceros, incluido OpenAI.',
    },
];

export default function AnuncioOpenAI() {
    return (
        <section id="openai" aria-labelledby="anuncio-openai" className="scroll-mt-20 bg-cream-300 px-4 pb-10 pt-6 sm:px-6 sm:pb-14">
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl bg-charcoal-950 px-6 py-10 text-white shadow-[0_30px_60px_-30px_rgba(15,14,13,0.6)] sm:px-12 sm:py-14">
                {/* Un filete de oro arriba: la noticia, sin estridencias. */}
                <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent-gold to-transparent" />

                <div className="mx-auto max-w-3xl text-center">
                    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" aria-hidden />
                        Novedad · Now powered by OpenAI
                    </p>
                    <h2 id="anuncio-openai" className="mt-5 font-serif text-3xl font-semibold leading-tight [text-wrap:balance] sm:text-[2.6rem]">
                        Iurexia ahora trabaja con los modelos de punta de <span className="text-accent-gold">OpenAI</span>
                    </h2>
                    <p className="mt-5 text-[1rem] leading-relaxed text-white/70 sm:text-[1.0625rem]">
                        Incorporamos a la arquitectura de Iurexia los modelos de lenguaje de última generación de
                        OpenAI, la empresa detrás de ChatGPT. Y no responden de memoria: trabajan sobre nuestro
                        acervo jurídico, y cada cita se coteja con su documento oficial antes de llegar a ti.
                    </p>
                </div>

                <ul className="mt-10 grid gap-6 border-t border-white/10 pt-8 md:grid-cols-3 md:gap-8">
                    {PUNTOS.map(({ Icono, titulo, texto }) => (
                        <li key={titulo}>
                            <Icono className="h-5 w-5 text-accent-gold" aria-hidden />
                            <h3 className="mt-3 font-sans text-[15px] font-semibold text-white">{titulo}</h3>
                            <p className="mt-1.5 text-[14px] leading-relaxed text-white/65">{texto}</p>
                        </li>
                    ))}
                </ul>

                <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
                    <p className="max-w-2xl text-[13.5px] leading-relaxed text-white/60">
                        La implementación de los servicios de OpenAI se realizó asegurando el cumplimiento de nuestra
                        rigurosa política de privacidad.
                    </p>
                    <Link
                        href="/seguridad"
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/20 px-4 text-[0.875rem] font-medium text-white/85 transition-colors hover:border-white/40 hover:text-white"
                    >
                        Cómo protegemos tu información
                        <ArrowRight className="h-4 w-4 text-accent-gold" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
