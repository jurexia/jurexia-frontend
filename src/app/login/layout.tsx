import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Iniciar sesión | Iurexia',
    description: 'Entra a tu cuenta de Iurexia.',
    alternates: { canonical: '/login' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Iniciar sesión | Iurexia', description: 'Entra a tu cuenta de Iurexia.', url: '/login' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
