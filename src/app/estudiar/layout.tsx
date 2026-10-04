import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';

/* La letra de lectura de «Estudiar y pensar» es Newsreader, la misma del
   cuerpo de los PDF: la ficha de la web y el material que se descarga se leen
   como una sola obra. Se carga sólo en estas páginas —el resto del sitio sigue
   en Inter y Playfair— y únicamente se usa para texto que se lee despacio:
   resúmenes, ideas, preguntas, semblanzas y citas. La marca, los títulos y los
   controles siguen en la letra de la casa. */
const lectura = Newsreader({
    subsets: ['latin', 'latin-ext'],
    weight: ['400', '500'],
    style: ['normal', 'italic'],
    display: 'swap',
    variable: '--font-lectura',
    // next/font no trae las medidas de Newsreader para calcular el respaldo
    // («Failed to find font override values»): se respalda en Georgia a secas.
    adjustFontFallback: false,
    fallback: ['Georgia', 'serif'],
});

export const metadata: Metadata = {
    title: 'Estudiar y pensar · Lecciones de derecho mexicano con sus fuentes | Iurexia',
    description:
        'Lecciones de derecho mexicano en video, cada una con su material de lectura: antecedentes, personajes, documentos y fuentes oficiales. Para estudiar a tu ritmo.',
    alternates: { canonical: '/estudiar' },
    openGraph: {
        title: 'Estudiar y pensar · Iurexia',
        description:
            'Lecciones de derecho mexicano en video, cada una con su material de lectura en PDF y sus fuentes.',
        url: 'https://www.iurexia.com/estudiar',
        siteName: 'Iurexia',
        locale: 'es_MX',
        type: 'website',
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia · Estudiar y pensar' }],
    },
};

export default function EstudiarLayout({ children }: { children: React.ReactNode }) {
    return <div className={`${lectura.variable} min-h-screen bg-cream-300`}>{children}</div>;
}
