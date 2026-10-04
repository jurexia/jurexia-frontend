import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Soluciones para abogados, despachos y el Poder Judicial | Iurexia',
    description: 'Cómo usan Iurexia los litigantes, los despachos y los secretarios de tribunal: investigación, análisis de demandas y redacción con fundamento.',
    alternates: { canonical: '/soluciones' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Soluciones para abogados, despachos y el Poder Judicial | Iurexia', description: 'Cómo usan Iurexia los litigantes, los despachos y los secretarios de tribunal: investigación, análisis de demandas y redacción con fundamento.', url: '/soluciones' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
