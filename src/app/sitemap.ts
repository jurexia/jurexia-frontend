import { MetadataRoute } from 'next'
import { LECCIONES } from '@/lib/estudiar/catalogo'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://iurexia.com'

    // Rutas públicas que queremos que Google indexe
    const publicRoutes = [
        { path: '', priority: 1.0, changefreq: 'weekly' as const },
        { path: '/plataforma', priority: 0.9, changefreq: 'monthly' as const },
        { path: '/plataforma/consulta', priority: 0.8, changefreq: 'monthly' as const },
        { path: '/plataforma/redaccion', priority: 0.8, changefreq: 'monthly' as const },
        { path: '/plataforma/carpetas', priority: 0.8, changefreq: 'monthly' as const },
        { path: '/connect', priority: 0.9, changefreq: 'weekly' as const },
        { path: '/soluciones', priority: 0.8, changefreq: 'monthly' as const },
        { path: '/salvame', priority: 0.8, changefreq: 'monthly' as const },
        { path: '/precios', priority: 0.8, changefreq: 'monthly' as const },
        { path: '/estudiar', priority: 0.8, changefreq: 'weekly' as const },
        { path: '/tutorial', priority: 0.7, changefreq: 'monthly' as const },
        { path: '/conocenos', priority: 0.7, changefreq: 'monthly' as const },
        { path: '/secretarios', priority: 0.7, changefreq: 'monthly' as const },
        { path: '/registro', priority: 0.6, changefreq: 'monthly' as const },
        { path: '/login', priority: 0.5, changefreq: 'monthly' as const },
        { path: '/privacidad', priority: 0.3, changefreq: 'yearly' as const },
        { path: '/terminos', priority: 0.3, changefreq: 'yearly' as const },
    ]

    // Cada lección de «Estudiar y pensar» tiene su página.
    const lecciones = LECCIONES.map((l) => ({
        path: `/estudiar/${l.slug}`, priority: 0.7, changefreq: 'monthly' as const,
    }))

    return [...publicRoutes, ...lecciones].map((route) => ({
        url: `${baseUrl}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changefreq,
        priority: route.priority,
    }))
}
