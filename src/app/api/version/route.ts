import { NextResponse } from 'next/server';

/* LA VERSIÓN QUE ESTÁ PUBLICADA (29-oct-2026).
 *
 * Una pestaña abierta antes de un despliegue sigue con el código viejo hasta
 * que se recarga. Un abogado Platinum mandó cinco veces el mismo Word desde
 * Chrome de Android el 27-oct y ninguno llegó al servidor: su pantalla todavía
 * decía «No es tu archivo», el texto retirado el 26-oct junto con el arreglo
 * que copia el archivo al elegirlo (d8c8ca4). El arreglo existía; su pestaña
 * no lo tenía. Con esto la pantalla compara su versión con la publicada y, si
 * es vieja, se lo dice (ver `@/lib/version`).
 */
export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json(
        { version: process.env.VERCEL_GIT_COMMIT_SHA || '' },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
