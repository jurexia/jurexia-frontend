/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode
    reactStrictMode: true,

    // Standalone output for serverless deployment
    output: 'standalone',

    // Ignore TypeScript errors during build (for faster deployment)
    typescript: {
        ignoreBuildErrors: true,
    },

    // pdfjs-dist se deja fuera del empaquetado del servidor. Si webpack lo
    // procesa, su inicialización revienta con «Object.defineProperty called on
    // non-object» — comprobado al indexar el boletín de la Ciudad de México.
    // Fuera del bundle carga como módulo de Node y funciona.
    experimental: {
        serverComponentsExternalPackages: ['pdfjs-dist'],

        // Y ADEMÁS HAY QUE LLEVARSE EL WORKER. Dejar pdfjs fuera del bundle
        // hace que Next lo copie por rastreo de dependencias, y el rastreador
        // no ve `pdf.worker.mjs` porque pdfjs lo importa con una ruta que
        // construye en tiempo de ejecución. Resultado en producción: «Setting
        // up fake worker failed: Cannot find module …/pdf.worker.mjs», los
        // cuatro pases de todos los días. En local no pasa porque el archivo
        // está en node_modules.
        outputFileTracingIncludes: {
            '/api/seguimiento/salud': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
            '/api/cron/seguimiento': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
        },
    },

    // LA GUÍA VIEJA, AL TUTORIAL NUEVO (27-sep-2026). public/guia-pro/ era la
    // «Guía Iurexia Pro» con capturas de marzo de 2026 (Buscar/Redactar,
    // Genios): se borró, y quien tenga guardado su enlace llega a /tutorial.
    async redirects() {
        return [
            { source: '/guia-pro', destination: '/tutorial', permanent: true },
            { source: '/guia-pro/:ruta*', destination: '/tutorial', permanent: true },
        ];
    },

    // Environment variables accessible client-side
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
}

module.exports = nextConfig
