import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Normativa federal y de las 32 entidades | Iurexia',
    description: 'Legislación federal y de las 32 entidades de México, artículo por artículo y con su texto oficial.',
    alternates: { canonical: '/normativa' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Normativa federal y de las 32 entidades | Iurexia', description: 'Legislación federal y de las 32 entidades de México, artículo por artículo y con su texto oficial.', url: '/normativa' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
