import type { Metadata } from 'next';

/* Un título y una descripción propios para la pestaña y para Google: antes
   seis páginas públicas se llamaban igual que la portada (3-oct-2026). */
export const metadata: Metadata = {
    title: 'Agente de amparo | Iurexia',
    description: 'La demanda de amparo indirecto, estructurada parte por parte conforme a la Ley de Amparo.',
    alternates: { canonical: '/agente' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Iurexia' }], title: 'Agente de amparo | Iurexia', description: 'La demanda de amparo indirecto, estructurada parte por parte conforme a la Ley de Amparo.', url: '/agente' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
