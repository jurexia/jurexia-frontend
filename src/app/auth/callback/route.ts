import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (code) {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) => {
                                cookieStore.set(name, value, options)
                            })
                        } catch {
                            // In middleware/server components, cookies may be read-only
                        }
                    },
                },
            }
        )

        await supabase.auth.exchangeCodeForSession(code)
    }

    // Redirect to chat after successful auth
    return NextResponse.redirect(`${origin}/chat`)
}
