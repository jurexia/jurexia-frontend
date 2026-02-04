import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    // Create redirect response first so we can add cookies to it
    const redirectUrl = `${origin}/chat`

    if (code) {
        const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
                        cookies.forEach((cookie) => {
                            cookiesToSet.push({
                                name: cookie.name,
                                value: cookie.value,
                                options: cookie.options || {}
                            })
                        })
                    },
                },
            }
        )

        await supabase.auth.exchangeCodeForSession(code)

        // Create response with cookies
        const response = NextResponse.redirect(redirectUrl)

        cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
                path: options.path as string || '/',
                httpOnly: options.httpOnly as boolean ?? true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: (options.sameSite as 'lax' | 'strict' | 'none') || 'lax',
                maxAge: options.maxAge as number
            })
        })

        return response
    }

    return NextResponse.redirect(redirectUrl)
}
