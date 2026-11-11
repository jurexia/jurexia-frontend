/**
 * Cuándo vuelven las consultas de un plan (11-nov-2026).
 *
 * Las reinicia el cron de Postgres `reset-per-user-monthly-queries` a las
 * 06:00 UTC (00:00 de la Ciudad de México), el día del mes en que cae
 * `subscription_start` —leído en UTC, como lo lee Postgres—. Quien se dio de
 * alta un 29, 30 o 31 y el mes es más corto, se reinicia el último día del
 * mes. Esta función repite esa regla para decirle al usuario la fecha exacta.
 */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function ultimoDia(anio: number, mes: number): number {
    return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
}

/** Hoy en la Ciudad de México: año, mes (0-11) y día. */
function hoyCDMX(ahora: Date): { anio: number; mes: number; dia: number } {
    const [a, m, d] = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(ahora).split('-').map(Number);
    return { anio: a, mes: m - 1, dia: d };
}

/** La próxima fecha de reinicio, siempre DESPUÉS de hoy. */
export function proximaRenovacion(inicio: string, ahora = new Date()): Date | null {
    const t = new Date(inicio);
    if (Number.isNaN(t.getTime())) return null;
    const diaAlta = t.getUTCDate();
    const hoy = hoyCDMX(ahora);

    const esteMes = Math.min(diaAlta, ultimoDia(hoy.anio, hoy.mes));
    if (esteMes > hoy.dia) return new Date(Date.UTC(hoy.anio, hoy.mes, esteMes, 12));

    const mes = (hoy.mes + 1) % 12;
    const anio = hoy.mes === 11 ? hoy.anio + 1 : hoy.anio;
    return new Date(Date.UTC(anio, mes, Math.min(diaAlta, ultimoDia(anio, mes)), 12));
}

/** «jueves 3 de diciembre». */
export function fechaEnLetra(d: Date): string {
    return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}
