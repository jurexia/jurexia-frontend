/* LAS HERRAMIENTAS DE PLATINUM (12-oct-2026).
   David: «Todas estas herramientas bloquéalas a Pro y sólo déjaselas a Platinum,
   con excepción de Jenica Campos Juárez, a quien su cuenta Pro debes habilitarle
   todo. Igual los testers quedan con todo».

   Una sola regla para el chat, sus avisos y la página de precios:
   · Platinum (mensual o anual) y Ultra Secretarios, que incluye Platinum;
   · la administración y los testers: `esAdmin` (`@/lib/admins`), que admite
     el dominio @iurexia.com y los correos nominales; entre ellos está
     jenycampos@hotmail.com, la cuenta Pro de Jenica Campos Juárez.
   La API comprueba lo mismo con `exigir_platinum` (cobro_consultas.py). */

import { esAdmin } from '@/lib/admins'

export const PLANES_PLATINUM = ['platinum_monthly', 'platinum_annual', 'ultra_secretarios']

export function tieneHerramientasPlatinum(plan?: string | null, correo?: string | null): boolean {
    return esAdmin(correo) || PLANES_PLATINUM.includes(plan ?? '')
}

export type HerramientaPlatinum = 'sentencia' | 'precedentes' | 'jurimetria' | 'cronologia' | 'boveda' | 'toulmin'

/** Qué es cada una, dicho una vez: lo leen la tarjeta de Platinum y el aviso del candado. */
export const HERRAMIENTAS_PLATINUM: Record<HerramientaPlatinum, { nombre: string; explicacion: string }> = {
    sentencia: {
        nombre: 'Sentencia',
        explicacion: 'Audita una sentencia o un proyecto frente a los precedentes de su propio tribunal y entrega una nota editable, lista para Word.',
    },
    precedentes: {
        nombre: 'Precedentes',
        explicacion: 'Busca en las sentencias reales de los tribunales colegiados y filtra por circuito, tribunal, materia y sentido del fallo, con el PDF de cada una.',
    },
    jurimetria: {
        nombre: 'Jurimetría',
        explicacion: 'Estima el sentido probable de un asunto —concede, niega o sobresee— a partir de los precedentes del circuito, argumento por argumento.',
    },
    cronologia: {
        nombre: 'Cronología',
        explicacion: 'Ordena los hechos del expediente con la página donde consta cada uno, las cuestiones en disputa y los plazos que corren.',
    },
    boveda: {
        nombre: 'Bóveda',
        explicacion: 'Hasta 500 documentos de un asunto para preguntarles a todos a la vez, con documento y página, y tablas de revisión que se exportan a Excel o Word.',
    },
    toulmin: {
        nombre: 'Toulmin',
        explicacion: 'Construye la demanda o el recurso argumento por argumento —afirmación, hechos, regla, respaldo, fuerza y la objeción que hay que vencer—, citando sólo el acervo, y lo lleva a Word.',
    },
}
