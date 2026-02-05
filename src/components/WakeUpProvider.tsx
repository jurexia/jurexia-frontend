'use client';

import { useWakeUpBackend } from '@/hooks/useWakeUpBackend';

/**
 * Client component that wakes up the backend on app load.
 * Wraps children and triggers warm-up request to prevent cold starts.
 */
export function WakeUpProvider({ children }: { children: React.ReactNode }) {
    useWakeUpBackend();
    return <>{children}</>;
}
