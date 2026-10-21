import { NextRequest, NextResponse } from 'next/server';

/* EL ESTADO PROBABLE DE QUIEN ENTRA (20-oct-2026).
 *
 * La primera consulta de una cuenta nueva pide antes la entidad federativa, y
 * elegirla entre 32 casillas era un paso más justo en el momento en que el
 * usuario quiere su respuesta. Vercel ya trae en cada petición la región de la
 * IP (`x-vercel-ip-country-region`, ISO 3166-2 sin el «MX-»); con ella la
 * ventana llega con el estado marcado y basta un toque para confirmarlo.
 *
 * Es sólo una SUGERENCIA: el usuario la ve escrita en el botón («Continuar con
 * Jalisco») y la cambia si no es la suya. No se guarda nada: ni la IP ni la
 * región salen de esta respuesta.
 */
const ESTADO_DE_REGION: Record<string, string> = {
    AGU: 'AGUASCALIENTES',
    BCN: 'BAJA_CALIFORNIA',
    BCS: 'BAJA_CALIFORNIA_SUR',
    CAM: 'CAMPECHE',
    CHP: 'CHIAPAS',
    CHH: 'CHIHUAHUA',
    CMX: 'CIUDAD_DE_MEXICO',
    DIF: 'CIUDAD_DE_MEXICO',   // el código anterior a 2016, que algunas bases siguen usando
    COA: 'COAHUILA',
    COL: 'COLIMA',
    DUR: 'DURANGO',
    GUA: 'GUANAJUATO',
    GRO: 'GUERRERO',
    HID: 'HIDALGO',
    JAL: 'JALISCO',
    MEX: 'MEXICO',
    MIC: 'MICHOACAN',
    MOR: 'MORELOS',
    NAY: 'NAYARIT',
    NLE: 'NUEVO_LEON',
    OAX: 'OAXACA',
    PUE: 'PUEBLA',
    QUE: 'QUERETARO',
    ROO: 'QUINTANA_ROO',
    SLP: 'SAN_LUIS_POTOSI',
    SIN: 'SINALOA',
    SON: 'SONORA',
    TAB: 'TABASCO',
    TAM: 'TAMAULIPAS',
    TLA: 'TLAXCALA',
    VER: 'VERACRUZ',
    YUC: 'YUCATAN',
    ZAC: 'ZACATECAS',
};

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
    const pais = req.headers.get('x-vercel-ip-country');
    const region = (req.headers.get('x-vercel-ip-country-region') || '').toUpperCase();
    const estado = pais === 'MX' ? ESTADO_DE_REGION[region] ?? null : null;
    return NextResponse.json({ estado }, { headers: { 'Cache-Control': 'private, no-store' } });
}
