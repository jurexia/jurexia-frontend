/* QUÉ DICE CADA AVISO DE PLAN (12-oct-2026).
   David: «si es gratuito y quiere utilizar herramienta Pro como redacción u otra,
   la tarjeta crema con "Pásate a Pro"; si quiere usar una Platinum, la que
   configuraste». Un solo aviso (`AvisoPlan`) para todos los candados del chat;
   aquí, qué es cada herramienta y a qué plan invita.

   Las de Platinum salen de `HERRAMIENTAS_PLATINUM` (el mismo texto de la
   tarjeta de /precios). La redacción Platinum va aparte para no meter un
   renglón más en esa tarjeta. Lo de Pro se dice con lo que la tarjeta Pro de
   /precios promete, nada más. */

import { HERRAMIENTAS_PLATINUM, type HerramientaPlatinum } from '@/lib/herramientas-platinum';

export type HerramientaPro =
    | 'redaccion_pro' | 'internet' | 'flujos' | 'documentos'
    | 'redaccion' | 'expedientes' | 'carpetas';

export type HerramientaConAviso = HerramientaPlatinum | 'redaccion_platinum' | HerramientaPro;

export interface FichaAviso {
    plan: 'pro' | 'platinum';
    nombre: string;
    explicacion: string;
}

const PRO: Record<HerramientaPro, { nombre: string; explicacion: string }> = {
    redaccion_pro: {
        nombre: 'Redacción Pro',
        explicacion: 'El motor de razonamiento profundo: piensa a fondo cada argumento antes de escribir el escrito.',
    },
    internet: {
        nombre: 'Internet',
        explicacion: 'Suma a la consulta los sitios oficiales al día: DOF, Suprema Corte, congresos y tribunales.',
    },
    flujos: {
        nombre: 'Flujos de trabajo',
        explicacion: 'Un amparo, una contestación, unos agravios o un dictamen, construidos contigo parte por parte.',
    },
    documentos: {
        nombre: 'Análisis de documentos',
        explicacion: 'Sube el escrito o la resolución y Iurexia lo audita y propone mejoras, con documentos de hasta 100 hojas.',
    },
    redaccion: {
        nombre: 'Redacción de escritos',
        explicacion: 'Escritos completos con fundamento verificado, listos para llevar a Word.',
    },
    expedientes: {
        nombre: 'Seguimiento de expedientes',
        explicacion: 'Cada asunto en su carpeta, con sus documentos, sus plazos y lo que va pasando.',
    },
    carpetas: {
        nombre: 'Carpetas',
        explicacion: 'Cada asunto en su carpeta: consultas, documentos y escritos juntos, a la mano.',
    },
};

export function fichaDelAviso(h: HerramientaConAviso): FichaAviso {
    if (h === 'redaccion_platinum') {
        return {
            plan: 'platinum',
            nombre: 'Redacción Platinum',
            explicacion: 'El motor más potente: escritos más extensos y argumentos en capas.',
        };
    }
    if (h in HERRAMIENTAS_PLATINUM) {
        const f = HERRAMIENTAS_PLATINUM[h as HerramientaPlatinum];
        return { plan: 'platinum', nombre: f.nombre, explicacion: f.explicacion };
    }
    return { plan: 'pro', ...PRO[h as HerramientaPro] };
}

/** Las herramientas de Platinum que NO son ésta, para «Viene en Platinum junto con…». */
export function otrasDePlatinum(h: HerramientaConAviso): string[] {
    return (Object.keys(HERRAMIENTAS_PLATINUM) as HerramientaPlatinum[])
        .filter((k) => k !== h)
        .map((k) => HERRAMIENTAS_PLATINUM[k].nombre);
}
