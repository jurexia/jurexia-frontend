'use client';

// AuthProvider is now a pass-through since we migrated to Supabase Auth
// The next-auth SessionProvider was causing 500 errors on api/auth/session
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
