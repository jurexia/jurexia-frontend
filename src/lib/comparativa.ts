/**
 * LA COMPARACIÓN CON CHATGPT (11-nov-2026, pedido de David).
 *
 * «Darle la comparación de que planes como ChatGPT, en sus versiones Pro, son
 * arriba de $2,000». Verificado antes de escribirlo: en la App Store de México
 * (https://apps.apple.com/mx/app/chatgpt/id6448311069), consultada el
 * 11-nov-2026, ChatGPT Plus cuesta $399 al mes y ChatGPT Pro tiene tres
 * niveles: $1,989, $3,999 y $9,899 al mes. Como el Pro más barato queda en
 * $1,989, se dice «desde $1,989», nunca «más de $2,000».
 *
 * La publicidad tiene que ser veraz y comprobable (art. 32 de la LFPC): por
 * eso cada texto que usa estas cifras dice de dónde salen y en qué fecha. Si
 * OpenAI cambia sus precios, se cambian aquí y en ningún otro lugar.
 */
export const CHATGPT = {
    plus: 399,
    proDesde: 1989,
    proHasta: 9899,
    fuente: 'App Store de México',
    fecha: '11 de noviembre de 2026',
} as const;

/** La nota al pie que acompaña a cualquier texto con estos precios. */
export const NOTA_PRECIOS_CHATGPT =
    `Precios de ChatGPT: ${CHATGPT.fuente}, consultada el ${CHATGPT.fecha}.`;

/**
 * El estudio de Stanford sobre errores de los modelos generales en preguntas
 * jurídicas: Dahl, Magesh, Suzgun y Ho, «Large Legal Fictions», Journal of
 * Legal Analysis 16 (2024). Probó modelos generales de 2023 (GPT-3.5, PaLM 2 y
 * Llama 2) y midió entre 69 % y 88 % de respuestas erróneas en preguntas
 * verificables. Se dice el año del estudio y, en la nota, el de los modelos.
 */
export const STANFORD = {
    rango: 'entre 69 % y 88 %',
    nota: 'Dahl, Magesh, Suzgun y Ho, Journal of Legal Analysis (2024), con modelos generales de 2023',
} as const;
