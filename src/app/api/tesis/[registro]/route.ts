import { NextRequest, NextResponse } from 'next/server';
import { comprobarTesis } from '@/lib/tesisDelAcervo';

/**
 * Comprobación de una tesis por su registro digital.
 *
 * Y por qué importa más de lo que parece: **esto es una comprobación real de
 * que la tesis existe**. Si el chat cita un registro inventado, no aparece, y
 * la interfaz puede decirlo en vez de mostrar una ficha con apariencia de
 * verificada. Es la diferencia entre pedirle al modelo que no alucine y
 * comprobar que no lo hizo.
 *
 * DE DÓNDE SALE LA RESPUESTA (28-sep-2026). Primero del acervo propio —la
 * copia del Semanario que se descargó en agosto de 2026—, porque el Semanario
 * reta con Incapsula a las IP de Vercel y Render desde el 2-sep y el sello
 * llevaba semanas diciendo «sin comprobar» de tesis perfectamente buenas. Sólo
 * lo que el acervo no tiene se pregunta al Semanario en vivo. La historia y la
 * regla de oro están en `@/lib/tesisDelAcervo`.
 *
 * Contrato: `verificada: true` con la ficha; o `verificada: false` con
 * `motivo: 'no_encontrada'` (SÓLO si el Semanario lo prueba) o
 * `'semanario_no_disponible'` (no se pudo comprobar). `?ficha=1` añade texto,
 * clave y PDF para el panel; el sello no lo pide.
 */

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com').replace(/\/+$/, '');

export async function GET(
    req: NextRequest,
    { params }: { params: { registro: string } }
) {
    const registro = (params.registro || '').trim();

    // El registro digital es sólo dígitos. Filtrarlo aquí evita reenviar
    // cualquier cosa que venga en la URL al acervo o al servidor de la Corte.
    if (!/^\d{5,8}$/.test(registro)) {
        return NextResponse.json(
            { verificada: false, motivo: 'registro_invalido' },
            { status: 400 }
        );
    }

    const { cuerpo, guardable } = await comprobarTesis(registro, {
        api: API,
        ficha: req.nextUrl.searchParams.get('ficha') === '1',
    });

    // Una tesis comprobada no cambia: el CDN la guarda un día y cada
    // respuesta del chat deja de costar una consulta por registro. Lo que no
    // se pudo comprobar no se guarda, para no congelar un fallo pasajero.
    return NextResponse.json(cuerpo, {
        status: 200,
        headers: { 'Cache-Control': guardable ? 'public, max-age=3600, s-maxage=86400' : 'no-store' },
    });
}
