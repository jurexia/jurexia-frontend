'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

/**
 * Hook to wake up the backend on cold start.
 * Makes a fire-and-forget request to /api/wake endpoint.
 * This prevents the user from experiencing cold start delays on Render.
 */
export function useWakeUpBackend() {
    useEffect(() => {
        // Fire-and-forget: wake up backend without waiting for response
        fetch(`${API_URL}/api/wake`, {
            method: 'GET',
            credentials: 'include',
        }).catch(() => {
            // Silently ignore errors - this is just a warm-up request
        });
    }, []);
}
