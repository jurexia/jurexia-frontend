import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import TwitterProvider from 'next-auth/providers/twitter';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
        TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID || '',
            clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
            version: '2.0',
        }),
        CredentialsProvider({
            name: 'Email',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Contraseña', type: 'password' },
            },
            async authorize(credentials) {
                // TODO: Replace with actual database lookup
                // For demo purposes, accept any email/password
                if (credentials?.email && credentials?.password) {
                    return {
                        id: '1',
                        name: credentials.email.split('@')[0],
                        email: credentials.email,
                        plan: 'gratuito',
                    };
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.plan = (user as any).plan || 'gratuito';
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).plan = token.plan || 'gratuito';
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        newUser: '/registro',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
