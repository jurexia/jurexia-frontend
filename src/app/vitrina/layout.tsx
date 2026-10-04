import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Vitrina de despachos | Iurexia',
    description: 'Aparezca en la portada de Iurexia entre los despachos que ejercen con inteligencia artificial y fuentes verificadas.',
    alternates: { canonical: '/vitrina' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Vitrina de despachos | Iurexia', description: 'Aparezca en la portada de Iurexia entre los despachos que ejercen con inteligencia artificial y fuentes verificadas.', url: '/vitrina' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
