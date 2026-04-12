// Admin access control for Leyes Estatales section
// Only @iurexia.com domain emails can access this section

const ADMIN_DOMAIN = '@iurexia.com';

// Specific admin emails (fallback if domain check isn't enough)
const ADMIN_EMAILS: string[] = [
    'jenycampos@hotmail.com',
];

export function isAdmin(email: string | undefined | null): boolean {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();

    // Check domain
    if (lowerEmail.endsWith(ADMIN_DOMAIN)) return true;

    // Check specific emails
    if (ADMIN_EMAILS.some(admin => admin.toLowerCase() === lowerEmail)) return true;

    return false;
}
