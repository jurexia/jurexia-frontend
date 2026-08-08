/**
 * Los logotipos que SÍ se pueden mostrar en el inicio.
 *
 * Filtro doble y deliberado: estado «publicada» Y sin revocar. Si un abogado
 * retira su autorización, deja de aparecer en la siguiente carga — no hay que
 * acordarse de bajarlo a mano, que es como se quedan publicadas las cosas que
 * ya nadie autorizó.
 *
 * El cubo es privado, así que se firman enlaces de 24 h. Un logotipo en una
 * URL pública y adivinable sería exponer material de un tercero por comodidad
 * nuestra; la firma caduca y se renueva sola en cada carga.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const db = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const { data } = await db
            .from('vitrina_autorizaciones')
            .select('despacho, logo_path, enlace')
            .eq('estado', 'publicada')
            .eq('consiente_logo', true)
            .is('revocado_at', null)
            .not('logo_path', 'is', null)
            .order('actualizado_at', { ascending: false })
            .limit(24);

        const firmas = await Promise.all((data ?? []).map(async (v: any) => {
            const { data: s } = await db.storage
                .from('vitrina').createSignedUrl(v.logo_path, 86400);
            return s?.signedUrl
                ? { despacho: v.despacho ?? '', logo_url: s.signedUrl, enlace: v.enlace ?? null }
                : null;
        }));

        return NextResponse.json({ firmas: firmas.filter(Boolean) });
    } catch (e) {
        // La franja es adorno de confianza: si falla, la portada sigue igual.
        console.error('vitrina/publicadas:', e);
        return NextResponse.json({ firmas: [] });
    }
}
