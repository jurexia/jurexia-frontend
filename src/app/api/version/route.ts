import { NextRequest, NextResponse } from 'next/server';
import { UMBRAL_AVISO_MS, describirDesfase } from '@/lib/reloj';

/* LA VERSIÓN QUE ESTÁ PUBLICADA (29-oct-2026).
 *
 * Una pestaña abierta antes de un despliegue sigue con el código viejo hasta
 * que se recarga. Un abogado Platinum mandó cinco veces el mismo Word desde
 * Chrome de Android el 27-oct y ninguno llegó al servidor: su pantalla todavía
 * decía «No es tu archivo», el texto retirado el 26-oct junto con el arreglo
 * que copia el archivo al elegirlo (d8c8ca4). El arreglo existía; su pestaña
 * no lo tenía. Con esto la pantalla compara su versión con la publicada y, si
 * es vieja, se lo dice (ver `@/lib/version`).
 *
 * Y LA HORA (2-nov-2026). La pantalla compara su reloj con `hora` para saber
 * si el del equipo está mal (ver `@/lib/reloj`). Manda el suyo en `?reloj=`:
 * si difiere más de cinco minutos, queda en el registro de Vercel con
 * `[reloj]`, para poder contar cuántos equipos lo tienen mal.
 */
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
    const hora = Date.now();
    const delEquipo = Number(req.nextUrl.searchParams.get('reloj'));
    if (delEquipo > 0 && Math.abs(delEquipo - hora) > UMBRAL_AVISO_MS) {
        console.warn(`[reloj] Un equipo va ${describirDesfase(delEquipo - hora)} `
            + `(${req.headers.get('user-agent') ?? 'sin agente'}).`);
    }
    return NextResponse.json(
        { version: process.env.VERCEL_GIT_COMMIT_SHA || '', hora },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
