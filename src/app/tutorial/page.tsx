import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TutorialNuevoChat from '@/components/TutorialNuevoChat';

/* /tutorial — EL TUTORIAL DEL NUEVO CHAT (27-sep-2026).

   Sustituye a la «Guía Iurexia Pro» (public/guia-pro/, capturas de marzo de
   2026), que enseñaba una interfaz que ya no existe: Buscar/Redactar, Genios.
   Sus direcciones viejas redirigen aquí (next.config.js). Lo enlaza la liga
   azul «Ver tutorial de uso del nuevo chat» bajo la caja de consulta. */

const TITULO = 'Tutorial del nuevo chat · Iurexia';
const DESCRIPCION =
    'En un minuto y medio: Fuentes, Esfuerzo de redacción, las herramientas y los Flujos de trabajo del nuevo chat de Iurexia, grabado en la interfaz real.';

export const metadata: Metadata = {
    title: TITULO,
    description: DESCRIPCION,
    alternates: { canonical: '/tutorial' },
    openGraph: {
        title: TITULO,
        description: DESCRIPCION,
        url: 'https://www.iurexia.com/tutorial',
        siteName: 'Iurexia',
        locale: 'es_MX',
        type: 'video.other',
        images: [{ url: '/video/tutorial-nuevo-chat-og.jpg', width: 1200, height: 630, alt: 'El nuevo chat de Iurexia' }],
        videos: [{ url: 'https://www.iurexia.com/video/tutorial-nuevo-chat.mp4', type: 'video/mp4', width: 1920, height: 1080 }],
    },
    twitter: {
        card: 'summary_large_image',
        title: TITULO,
        description: DESCRIPCION,
        images: ['/video/tutorial-nuevo-chat-og.jpg'],
    },
};

const VIDEO_LD = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Tutorial del nuevo chat de Iurexia',
    description: DESCRIPCION,
    thumbnailUrl: ['https://www.iurexia.com/video/tutorial-nuevo-chat-og.jpg'],
    uploadDate: '2026-09-27',
    duration: 'PT1M25S',
    contentUrl: 'https://www.iurexia.com/video/tutorial-nuevo-chat.mp4',
    inLanguage: 'es-MX',
};

export default function TutorialPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(VIDEO_LD) }} />
            <Navbar plataforma />

            <section className="px-4 pb-8 pt-28 sm:px-6 sm:pt-32">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-brown">
                        Tutorial · 1 min 25 s
                    </p>
                    <h1 className="font-serif text-4xl font-semibold leading-[1.1] text-charcoal-900 sm:text-5xl md:text-6xl">
                        Así se usa el <span className="text-accent-gold">nuevo chat</span>
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-charcoal-700 sm:text-lg">
                        Fuentes, Esfuerzo de redacción, las herramientas y los Flujos de trabajo, en un minuto y medio
                        y sobre la interfaz real.
                    </p>
                </div>
            </section>

            <section className="px-4 pb-16 sm:px-6 sm:pb-20">
                <TutorialNuevoChat />
            </section>

            <section className="border-t border-charcoal-900/10 px-4 py-14 sm:px-6 sm:py-16">
                <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                    <p className="font-serif text-2xl font-semibold text-charcoal-900 sm:text-3xl">
                        Pruébalo en tu próxima consulta
                    </p>
                    <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                        <Link
                            href="/chat"
                            className="group inline-flex items-center gap-2 rounded-full bg-charcoal-900 px-7 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-black hover:shadow-lg"
                        >
                            Abrir el chat
                            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                        <Link
                            href="/precios"
                            className="text-sm font-medium text-charcoal-700 underline-offset-4 transition-colors hover:text-charcoal-900 hover:underline"
                        >
                            Ver los planes
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
