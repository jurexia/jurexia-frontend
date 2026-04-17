import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Keep-alive cron endpoint — pings the Render backend every 10 minutes
 * to prevent cold starts that cause "Failed to fetch" errors.
 * 
 * Configured in vercel.json with cron schedule.
 * Also accepts manual GET requests for testing.
 */
export async function GET() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.iurexia.com';
    const startTime = Date.now();

    try {
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            headers: { 'User-Agent': 'Iurexia-KeepAlive/1.0' },
            signal: AbortSignal.timeout(25000), // 25s timeout
        });

        const elapsed = Date.now() - startTime;
        const data = await response.json().catch(() => ({}));

        console.log(`[KeepAlive] Backend pinged in ${elapsed}ms — status: ${response.status}`);

        return NextResponse.json({
            ok: response.ok,
            status: response.status,
            latency_ms: elapsed,
            backend_status: data.status || 'unknown',
            qdrant: data.qdrant || 'unknown',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[KeepAlive] Backend ping FAILED after ${elapsed}ms:`, error.message);

        return NextResponse.json({
            ok: false,
            error: error.message,
            latency_ms: elapsed,
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    }
}
