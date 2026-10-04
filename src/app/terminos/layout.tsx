import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Términos y condiciones | Iurexia',
    description: 'Las condiciones de uso del servicio de Iurexia.',
    alternates: { canonical: '/terminos' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Términos y condiciones | Iurexia', description: 'Las condiciones de uso del servicio de Iurexia.', url: '/terminos' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
