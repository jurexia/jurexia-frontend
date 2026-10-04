import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Iurexia Connect: abogados con cédula verificada | Iurexia',
    description: 'Encuentra un abogado con cédula verificada para tu caso, o recibe asuntos que ya llegan con el problema planteado.',
    alternates: { canonical: '/connect' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Iurexia Connect: abogados con cédula verificada | Iurexia', description: 'Encuentra un abogado con cédula verificada para tu caso, o recibe asuntos que ya llegan con el problema planteado.', url: '/connect' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
