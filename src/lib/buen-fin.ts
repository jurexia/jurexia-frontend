/**
 * BUEN FIN 2026 (13 al 17 de noviembre). Aprobado por David el 9-nov-2026:
 * «crea el cupón del Buen Fin al 30 % y crea la mejor campaña».
 *
 * Lo hace cumplir Stripe, no esta página: el código BUENFIN30 (cupón
 * BUENFIN2026) da 30 % en el PRIMER pago (`duration: once`) de Básico, Pro y
 * Platinum, mensuales y anuales; sólo a cuentas sin pagos previos
 * (`first_time_transaction`), y vence el 17-nov a las 23:59:59 de México.
 * Si cambia allá, cambia aquí.
 *
 * La idea de la campaña: que quien compra se sienta listo por comprar. No se
 * le empuja con adjetivos: se le enseña la cuenta, con números que puede
 * comprobar, y se le dice sin letra chiquita qué paga y cuándo. Todas las
 * cifras salen de PLANS; ninguna se escribe a mano.
 */
import { PLANS } from '@/lib/stripe';

export const BUEN_FIN = {
    codigo: 'BUENFIN30',
    /** 13-nov-2026 00:00 de la Ciudad de México. */
    inicio: new Date('2026-11-13T06:00:00Z'),
    /** 17-nov-2026 23:59:59 de la Ciudad de México. */
    fin: new Date('2026-11-18T05:59:59Z'),
    descuento: 0.3,
    finEnLetra: 'martes 17 de noviembre a las 23:59',
} as const;

export function buenFinVigente(ahora = new Date()): boolean {
    return ahora >= BUEN_FIN.inicio && ahora <= BUEN_FIN.fin;
}

/** Fecha de la Ciudad de México, «2026-11-17». */
export function fechaCDMX(ahora = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(ahora);
}

export function esUltimoDiaBuenFin(ahora = new Date()): boolean {
    return buenFinVigente(ahora) && fechaCDMX(ahora) === '2026-11-17';
}

/** Lo que se paga la primera vez, con el 30 %. Redondeo a centavos como Stripe. */
export function conDescuento(precio: number): number {
    return Math.round(precio * (1 - BUEN_FIN.descuento) * 100) / 100;
}

export function pesos(n: number): string {
    const entero = Number.isInteger(n);
    return '$' + n.toLocaleString('es-MX', {
        minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: 2,
    });
}

export type PlanBuenFin = 'basico' | 'pro' | 'platinum';

const CLAVES: Record<PlanBuenFin, { mensual: keyof typeof PLANS; anual: keyof typeof PLANS; nombre: string; consultas: number }> = {
    basico: { mensual: 'basico_monthly', anual: 'basico_annual', nombre: 'Básico', consultas: 70 },
    pro: { mensual: 'pro_monthly', anual: 'pro_annual', nombre: 'Pro', consultas: 140 },
    platinum: { mensual: 'platinum_monthly', anual: 'platinum_annual', nombre: 'Platinum', consultas: 560 },
};

/**
 * La cuenta de un plan en Buen Fin.
 *   · `anioMesAMes`: doce meses al precio mensual de hoy.
 *   · `anualBuenFin`: el plan anual con el 30 % en su (único) pago del año.
 *   · `ahorro` y `ahorroPct`: la diferencia entre las dos.
 *   · `porConsulta`: el anual de Buen Fin entre las consultas del año.
 */
export function cuenta(plan: PlanBuenFin) {
    const c = CLAVES[plan];
    const mensual = PLANS[c.mensual].price;
    const anual = PLANS[c.anual].price;
    const anioMesAMes = mensual * 12;
    const anualBuenFin = conDescuento(anual);
    const ahorro = Math.round((anioMesAMes - anualBuenFin) * 100) / 100;
    return {
        nombre: c.nombre,
        consultas: c.consultas,
        mensual,
        anual,
        primerMes: conDescuento(mensual),
        anioMesAMes,
        anualBuenFin,
        ahorro,
        ahorroPct: Math.round((ahorro / anioMesAMes) * 100),
        porConsulta: Math.round((anualBuenFin / (c.consultas * 12)) * 100) / 100,
        priceIdMensual: PLANS[c.mensual].priceId,
        priceIdAnual: PLANS[c.anual].priceId,
    };
}
