// El `supabase` que ven respuestas-servidor.ts y conversations.ts en la prueba:
// delega en el cliente que la prueba deja en `globalThis.__clienteFalso__`.
export const supabase: any = new Proxy({}, {
    get: (_blanco, clave) => (globalThis as any).__clienteFalso__[clave],
});

// memoria-conversacion.ts lo importa de @/lib/supabase.
export async function getSession() {
    return (globalThis as any).__clienteFalso__.auth.getSession().then((r: any) => r.data.session);
}
