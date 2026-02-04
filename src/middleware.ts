import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Handle auth callback - exchange code for session
    if (request.nextUrl.pathname === '/auth/callback') {
        const code = request.nextUrl.searchParams.get('code')

        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)

            if (!error) {
                // Redirect to chat after successful auth
                const redirectUrl = request.nextUrl.clone()
                redirectUrl.pathname = '/chat'
                redirectUrl.searchParams.delete('code')
                return NextResponse.redirect(redirectUrl)
            }
        }
    }

    // Check auth for protected routes
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect /chat route
    if (request.nextUrl.pathname.startsWith('/chat') && !user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
    }

    // Redirect logged-in users away from login page
    if (request.nextUrl.pathname === '/login' && user) {
        const chatUrl = request.nextUrl.clone()
        chatUrl.pathname = '/chat'
        return NextResponse.redirect(chatUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/chat/:path*', '/login', '/auth/callback'],
}
