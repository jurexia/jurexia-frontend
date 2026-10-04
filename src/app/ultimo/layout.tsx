import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Lo último: Corte, tesis y Diario Oficial | Iurexia',
    description: 'Comunicados de la Suprema Corte, tesis de la semana y publicaciones del Diario Oficial de la Federación, en un solo lugar.',
    alternates: { canonical: '/ultimo' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Lo último: Corte, tesis y Diario Oficial | Iurexia', description: 'Comunicados de la Suprema Corte, tesis de la semana y publicaciones del Diario Oficial de la Federación, en un solo lugar.', url: '/ultimo' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
