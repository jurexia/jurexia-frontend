import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { AvisoCookies } from '@/components/AvisoCookies'
import { WakeUpProvider } from '@/components/WakeUpProvider'
import GoogleAnalytics from '@/components/GoogleAnalytics'

export const metadata: Metadata = {
    metadataBase: new URL('https://iurexia.com'),
    title: 'Iurexia - Inteligencia Artificial para el Derecho Mexicano',
    description: 'La IA jurídica más precisa para México. Investigación legal, análisis de documentos y conexión con abogados verificados. Especializada en legislación mexicana.',
    keywords: ['iurexia', 'inteligencia artificial derecho mexicano', 'ia juridica mexico', 'asistente legal inteligencia artificial', 'abogado virtual mexico', 'jurisprudencia mexico', 'legal tech mexico', 'analisis documentos legales', 'codigo civil mexico', 'derecho mexicano ia', 'busqueda juridica mexico'],
    authors: [{ name: 'Iurexia' }],
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
    openGraph: {
        title: 'Iurexia - IA Jurídica para México',
        description: 'Investigación legal, análisis de documentos y conexión con abogados verificados. La inteligencia artificial más precisa para el sistema jurídico mexicano.',
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
        title: 'Iurexia - IA Jurídica para México',
        description: 'La inteligencia artificial más precisa para el sistema jurídico mexicano',
        images: ['/og-image.png'],
    },
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/icon.png', type: 'image/png' },
        ],
        apple: [
            { url: '/apple-icon.png' }
        ],
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
                {/* Dublin Core metadata for academic/institutional recognition */}
                <meta name="DC.type" content="Service" />
                <meta name="DC.subject" content="Legal Technology, Mexican Law, Legal Research, Artificial Intelligence" />
                <meta name="DC.creator" content="Iurexia" />
                <meta name="DC.language" content="es-MX" />

                {/* JSON-LD Structured Data for Organization */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "Organization",
                            "name": "Iurexia",
                            "url": "https://iurexia.com",
                            "logo": "https://iurexia.com/icon.png",
                            "description": "La IA jurídica más precisa para México. Investigación legal, análisis de documentos y conexión con abogados verificados.",
                            "sameAs": [
                                "https://iurexia.com"
                            ]
                        })
                    }}
                />
            </head>
            <body className="min-h-screen bg-cream-300">
                <GoogleAnalytics />
                <AuthProvider>
                    <WakeUpProvider>
                        {children}
                    </WakeUpProvider>
                    {/* Va fuera del árbol de la aplicación y dentro del
                        proveedor: se pinta sobre cualquier página, también
                        sobre el acceso, que es justo donde llega el visitante
                        que aún no ha decidido nada. */}
                    <AvisoCookies />
                </AuthProvider>
            </body>
        </html>
    )
}
