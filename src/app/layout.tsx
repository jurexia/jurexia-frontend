import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
    title: 'Jurexia - IA para el Derecho Mexicano',
    description: 'Plataforma de inteligencia artificial diseñada para profesionales del derecho en México. Investigación jurídica, análisis de documentos y consultoría legal avanzada.',
    keywords: ['derecho mexicano', 'inteligencia artificial', 'legal tech', 'jurisprudencia', 'abogados'],
    authors: [{ name: 'Jurexia' }],
    openGraph: {
        title: 'Jurexia - IA para el Derecho Mexicano',
        description: 'Avanza tu práctica jurídica con IA especializada en Derecho Mexicano',
        url: 'https://jurexiagtp.com',
        siteName: 'Jurexia',
        locale: 'es_MX',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Jurexia - IA para el Derecho Mexicano',
        description: 'Avanza tu práctica jurídica con IA especializada en Derecho Mexicano',
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
                <meta name="robots" content="index, follow" />
                {/* Dublin Core metadata for academic/institutional recognition */}
                <meta name="DC.type" content="Service" />
                <meta name="DC.subject" content="Legal Technology, Mexican Law, Legal Research, Artificial Intelligence" />
                <meta name="DC.creator" content="Jurexia" />
                <meta name="DC.language" content="es-MX" />
            </head>
            <body className="min-h-screen bg-cream-300">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
