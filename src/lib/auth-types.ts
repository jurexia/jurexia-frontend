// Type extensions for NextAuth
import 'next-auth';

declare module 'next-auth' {
    interface User {
        plan?: string;
    }

    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            plan?: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        plan?: string;
    }
}
