import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { WakeUpProvider } from '@/components/WakeUpProvider'

export const metadata: Metadata = {
    metadataBase: new URL('https://iurexia.com'),
    title: 'Iurexia - IA para el Derecho Mexicano',
    description: 'Plataforma de inteligencia artificial diseñada para profesionales del derecho en México. Investigación jurídica, análisis de documentos y consultoría legal avanzada.',
    keywords: ['derecho mexicano', 'inteligencia artificial', 'legal tech', 'jurisprudencia', 'abogados'],
    authors: [{ name: 'Iurexia' }],
    robots: {
        index: false,
        follow: false,
    },
    openGraph: {
        title: 'Iurexia - IA para el Derecho Mexicano',
        description: 'Avanza tu práctica jurídica con IA especializada en Derecho Mexicano',
        url: 'https://iurexia.com',
        siteName: 'Iurexia',
        locale: 'es_MX',
        type: 'website',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Iurexia - IA Legal para México',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Iurexia - IA para el Derecho Mexicano',
        description: 'Avanza tu práctica jurídica con IA especializada en Derecho Mexicano',
        images: ['/og-image.png'],
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <head>
                <link rel="icon" href="/favicon.ico" />
                {/* Content categorization for web filters */}
                <meta name="classification" content="Legal, Education, Business, Professional Services" />
                <meta name="category" content="LegalTech, Legal Research, Law, Professional Services, Education" />
                <meta name="rating" content="General" />
                <meta name="robots" content="noindex, nofollow" />
                {/* Dublin Core metadata for academic/institutional recognition */}
                <meta name="DC.type" content="Service" />
                <meta name="DC.subject" content="Legal Technology, Mexican Law, Legal Research, Artificial Intelligence" />
                <meta name="DC.creator" content="Iurexia" />
                <meta name="DC.language" content="es-MX" />
            </head>
            <body className="min-h-screen bg-cream-300">
                <AuthProvider>
                    <WakeUpProvider>
                        {children}
                    </WakeUpProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
