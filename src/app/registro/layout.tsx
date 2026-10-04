import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Crear cuenta gratis | Iurexia',
    description: 'Crea tu cuenta gratis y empieza a investigar el derecho mexicano con fuentes verificadas.',
    alternates: { canonical: '/registro' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Crear cuenta gratis | Iurexia', description: 'Crea tu cuenta gratis y empieza a investigar el derecho mexicano con fuentes verificadas.', url: '/registro' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
