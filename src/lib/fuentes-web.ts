import { Inter_Tight, Newsreader } from 'next/font/google';

/* ═══ LA LETRA DE LA WEB PÚBLICA (3-oct-2026) ═══
   Tras comparar tres parejas sobre el mismo contenido, David eligió la opción
   B: Newsreader para los títulos e Inter Tight para el texto. Playfair Display
   es una letra de revista de lujo —mucho contraste, trazos finos— y se leía
   como invitación, no como despacho tecnológico; Newsreader es sobria e
   institucional, con un corte de exhibición (el eje «opsz») que se activa solo
   en los tamaños grandes, y ya es la letra de los PDF de Estudiar y pensar.

   La MARCA «Iurexia» no cambia: sigue en Playfair 600 (clase `font-marca`).

   Se cargan aquí, y no en el layout raíz, para que sólo las descarguen las
   páginas públicas: la plataforma (el chat, las carpetas) sigue con su letra.
   Cada página pública pone `claseWeb` en su <main>; la clase `.web`
   (globals.css) redirige --font-serif y --font-sans a estas dos. */
export const fuenteTitulo = Newsreader({
    subsets: ['latin', 'latin-ext'],
    style: ['normal', 'italic'],
    axes: ['opsz'],
    display: 'swap',
    variable: '--font-titulo',
    fallback: ['Georgia', 'serif'],
    // next/font no trae las métricas de Newsreader para calcular el ajuste de la
    // letra de respaldo y lo avisaba en cada compilación; sin ellas no lo hace igual.
    adjustFontFallback: false,
});

export const fuenteTexto = Inter_Tight({
    subsets: ['latin', 'latin-ext'],
    weight: ['400', '500', '600'],
    display: 'swap',
    variable: '--font-texto',
});

export const claseWeb = `${fuenteTitulo.variable} ${fuenteTexto.variable} web`;
