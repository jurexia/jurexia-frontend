import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Para secretarios del Poder Judicial de la Federación | Iurexia',
    description: 'El taller de sentencias de Iurexia: estudio de fondo, jurisprudencia aplicable y proyecto de resolución, con cada cita verificada.',
    alternates: { canonical: '/secretarios' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Para secretarios del Poder Judicial de la Federación | Iurexia', description: 'El taller de sentencias de Iurexia: estudio de fondo, jurisprudencia aplicable y proyecto de resolución, con cada cita verificada.', url: '/secretarios' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
