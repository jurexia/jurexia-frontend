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
    },

    // Environment variables accessible client-side
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
}

module.exports = nextConfig
