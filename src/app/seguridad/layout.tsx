import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Seguridad y privacidad | Iurexia',
    description: 'Cómo protege Iurexia tus consultas y documentos: cifrado en tránsito, sin entrenamiento con tus datos y borrado cuando tú quieras.',
    alternates: { canonical: '/seguridad' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Seguridad y privacidad | Iurexia', description: 'Cómo protege Iurexia tus consultas y documentos: cifrado en tránsito, sin entrenamiento con tus datos y borrado cuando tú quieras.', url: '/seguridad' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
