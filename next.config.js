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

    // Environment variables accessible client-side
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
}

module.exports = nextConfig
