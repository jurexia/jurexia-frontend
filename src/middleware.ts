import { NextRequest, NextResponse } from 'next/server'

// MODO MANTENIMIENTO (15-oct-2026, pedido de David).
//
// Mientras se resuelve la falla, nadie entra a la plataforma: el login, el
// registro y todas las rutas de la aplicación llevan a /mantenimiento con el
// aviso. Siguen abiertas la portada, los legales, /api (webhooks de Stripe,
// crons) y los archivos estáticos.
//
// Encendido por omisión mientras este archivo esté desplegado. Para apagarlo:
// MANTENIMIENTO=0 en Vercel y redesplegar, o revertir el commit.
// Pase para probar en producción: MANTENIMIENTO_PASE=<clave> en Vercel y abrir
// /mantenimiento?pase=<clave> (deja una galleta de 12 horas).

const ABIERTAS = ['/', '/mantenimiento', '/privacidad', '/terminos']
const GALLETA = 'iurexia_pase'

export function middleware(req: NextRequest) {
    if (process.env.MANTENIMIENTO === '0') return NextResponse.next()

    const { pathname, searchParams } = req.nextUrl
    const pase = process.env.MANTENIMIENTO_PASE

    if (pathname === '/mantenimiento' && pase && searchParams.get('pase') === pase) {
        const res = NextResponse.redirect(new URL('/chat', req.url))
        res.cookies.set(GALLETA, pase, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 12 })
        return res
    }
    if (pase && req.cookies.get(GALLETA)?.value === pase) return NextResponse.next()
    if (ABIERTAS.includes(pathname)) return NextResponse.next()

    const url = req.nextUrl.clone()
    url.pathname = '/mantenimiento'
    url.search = ''
    return NextResponse.redirect(url)
}

export const config = {
    // Fuera: /api, lo de Next y cualquier archivo con extensión (logos, vídeos, favicon).
    matcher: ['/((?!api/|_next/|.*\\..*).*)'],
}
