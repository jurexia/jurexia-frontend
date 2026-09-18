/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Harvey.AI inspired palette
                cream: {
                    50: '#fefdfb',
                    100: '#fdfbf7',
                    200: '#f9f7f1',
                    300: '#f5f4f0',
                    400: '#e8e6e0',
                    500: '#d4d2cc',
                },
                charcoal: {
                    // EL SUELO, MÁS PROFUNDO. David: «colores más profundos».
                    // El 900 era #1a1a1a, un gris plano y sin matiz, y las
                    // tarjetas se pintan encima con bg-white/[0.035] —o sea
                    // #232323—: trece puntos de diferencia. Con tan poco
                    // desnivel nada parece levantado del fondo y la pantalla
                    // se lee chata por mucho que se ordenen las tarjetas.
                    //
                    // El 950 es el suelo nuevo: casi negro y con un sesgo
                    // cálido —más rojo que azul— para que case con el oro de
                    // la casa en vez de pelearse con él. Sobre él, la misma
                    // tarjeta ya salta de verdad.
                    950: '#0f0e0d',
                    900: '#1a1a1a',
                    800: '#2d2d2d',
                    700: '#404040',
                },
                accent: {
                    brown: '#8b7355',
                    gold: '#c9a962',
                },
            },
            fontFamily: {
                serif: ['var(--font-serif)', 'Playfair Display', 'Georgia', 'serif'],
                sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-subtle': 'pulseSubtle 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseSubtle: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
            },
        },
    },
    plugins: [],
}
