import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026).
   Desde el 2-nov-2026 la página también vende el Plan Estudio, en su propia
   pestaña: la descripción lo nombra. */
const DESCRIPCION = 'Empieza gratis. Planes Básico, Pro y Platinum, y el nuevo Plan Estudio para despachos, con consultas ilimitadas. Investigación, redacción y flujos de trabajo jurídicos en México.';

export const metadata: Metadata = {
    title: 'Planes y precios | Iurexia',
    description: DESCRIPCION,
    alternates: { canonical: '/precios' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og/precios.jpg', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Planes y precios | Iurexia', description: DESCRIPCION, url: '/precios' },
    twitter: { card: 'summary_large_image', images: ['/og/precios.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
