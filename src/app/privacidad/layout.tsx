import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Aviso de privacidad | Iurexia',
    description: 'Qué datos personales trata Iurexia, para qué y cómo ejercer tus derechos.',
    alternates: { canonical: '/privacidad' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Aviso de privacidad | Iurexia', description: 'Qué datos personales trata Iurexia, para qué y cómo ejercer tus derechos.', url: '/privacidad' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
