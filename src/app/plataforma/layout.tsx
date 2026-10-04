import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Plataforma: investigación, redacción y seguimiento jurídico | Iurexia',
    description: 'Consulta con fuentes verificadas, redacción de escritos, carpetas inteligentes y seguimiento de expedientes. Inteligencia artificial para el derecho mexicano.',
    alternates: { canonical: '/plataforma' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og/plataforma.jpg', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Plataforma: investigación, redacción y seguimiento jurídico | Iurexia', description: 'Consulta con fuentes verificadas, redacción de escritos, carpetas inteligentes y seguimiento de expedientes. Inteligencia artificial para el derecho mexicano.', url: '/plataforma' },
    twitter: { card: 'summary_large_image', images: ['/og/plataforma.jpg'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
