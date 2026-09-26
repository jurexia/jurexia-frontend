/**
 * EL AUDITOR DEL TALLER — la experiencia de cada secretario, de un vistazo.
 *
 * POR QUÉ EXISTE (24-sep-2026)
 * ----------------------------
 * David preguntó si la cuenta seminarioderecho seguía usando el taller. Para
 * contestarlo hizo falta cruzar a mano cuatro tablas, y la respuesta fue más
 * interesante que la pregunta: la cuenta ocupa asiento del piloto, generó
 * dieciséis proyectos en ocho días… y desde el cierre del piloto su bolsa
 * mensual vale CERO. Le queda un proyecto de prueba. Dejó de entrar el 12-sep.
 * Nadie lo había visto porque nada lo enseñaba.
 *
 * Esto lo enseña para todos: quién usa el taller, cuánto, cuándo fue la
 * última vez, qué le queda en la bolsa, qué opinó de sus sentencias y qué le
 * avisó la máquina en cada proyecto. Y levanta BANDERAS solas —las que hoy
 * hubo que encontrar a mano—.
 *
 * Funciones puras: la ruta del panel consulta Supabase y llama aquí. Así se
 * prueban sin red.
 */

/** El cierre del piloto: quien usó el taller antes, ocupó asiento. Es la
 *  misma fecha que `TALLER_PILOTO_CIERRE` en el API. */
export const CIERRE_PILOTO = '2026-09-13';

/** Las cuentas de casa, sin bolsa que descontar. MISMA lista que el
 *  `TALLER_SIN_LIMITE` del API: si allá cambia, se sobrescribe aquí con la
 *  variable de entorno del mismo nombre en Vercel. */
export function sinLimite(correo: string): boolean {
    const c = (correo || '').trim().toLowerCase();
    const lista = (process.env.TALLER_SIN_LIMITE
        ?? 'jdm.juridico@gmail.com,jmd.juridico@gmail.com,alcantar117@gmail.com')
        .split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    return !!c && (lista.includes(c) || c.endsWith('@iurexia.com'));
}

export type Evento = { email: string; expediente: string; etapa: string; creado_en: string };
export type Perfil = {
    email: string; subscription_type?: string | null;
    proyectos_mes_usados?: number | null; proyectos_mes_limite?: number | null;
    proyectos_recargados?: number | null; proyectos_prueba_usados?: number | null;
};
export type Opinion = {
    email: string; expediente: string; version: number;
    calificacion?: number | null; correccion?: string | null;
    aspectos?: Record<string, string> | null;
    sobre_sentencia?: string | null; sobre_taller?: string | null;
    tipo_asunto?: string | null; sentido?: string | null; avisos_n?: number | null;
    creado_en: string; actualizado_en?: string;
};

export type Bandera = { clave: string; texto: string; tono: 'malo' | 'aviso' | 'neutro' };

export type FilaUsuario = {
    email: string; plan: string;
    adelantos: number; proyectos: number; expedientes: number;
    proyectos7: number; proyectos30: number;
    primerUso: string; ultimoUso: string; diasSinUso: number;
    delPiloto: boolean; sinLimite: boolean;
    mesUsados: number; mesLimite: number; recargados: number; pruebaRestante: number;
    restantes: number | null;
    opiniones: number; califMedia: number | null;
    banderas: Bandera[];
};

const DIA = 864e5;
const PRUEBA = 1;          // TALLER_PROYECTOS_GRATIS del API

/** Una fila por secretario, con sus banderas. */
export function usuarios(eventos: Evento[], perfiles: Perfil[], opiniones: Opinion[],
                         ahora: Date = new Date()): FilaUsuario[] {
    const porCorreo = new Map<string, Evento[]>();
    for (const e of eventos) {
        const c = (e.email || '').toLowerCase();
        if (!c) continue;
        if (!porCorreo.has(c)) porCorreo.set(c, []);
        porCorreo.get(c)!.push(e);
    }
    const perfil = new Map(perfiles.map((p) => [(p.email || '').toLowerCase(), p]));
    const ops = new Map<string, Opinion[]>();
    for (const o of opiniones) {
        const c = (o.email || '').toLowerCase();
        if (!ops.has(c)) ops.set(c, []);
        ops.get(c)!.push(o);
    }
    const t = ahora.getTime();
    const fuera: FilaUsuario[] = [];
    for (const [c, evs] of Array.from(porCorreo.entries())) {
        const fechas = evs.map((e) => new Date(e.creado_en).getTime()).sort((a, b) => a - b);
        const proy = evs.filter((e) => e.etapa === 'proyecto');
        const p = perfil.get(c) || ({ email: c } as Perfil);
        const sl = sinLimite(c);
        const mesU = Number(p.proyectos_mes_usados || 0);
        const mesL = Number(p.proyectos_mes_limite || 0);
        const rec = Number(p.proyectos_recargados || 0);
        const prueba = Math.max(PRUEBA - Number(p.proyectos_prueba_usados || 0), 0);
        const restantes = sl ? null : Math.max(mesL - mesU, 0) + rec + prueba;
        const delPiloto = evs.some((e) => e.creado_en < CIERRE_PILOTO);
        const ultimo = fechas[fechas.length - 1];
        const diasSinUso = Math.floor((t - ultimo) / DIA);
        const misOps = ops.get(c) || [];
        const cals = misOps.map((o) => Number(o.calificacion || 0)).filter((x) => x > 0);
        const fila: FilaUsuario = {
            email: c, plan: String(p.subscription_type || '—'),
            adelantos: evs.filter((e) => e.etapa === 'adelanto').length,
            proyectos: proy.length,
            expedientes: new Set(evs.map((e) => e.expediente)).size,
            proyectos7: proy.filter((e) => t - new Date(e.creado_en).getTime() <= 7 * DIA).length,
            proyectos30: proy.filter((e) => t - new Date(e.creado_en).getTime() <= 30 * DIA).length,
            primerUso: new Date(fechas[0]).toISOString(), ultimoUso: new Date(ultimo).toISOString(),
            diasSinUso, delPiloto, sinLimite: sl,
            mesUsados: mesU, mesLimite: mesL, recargados: rec, pruebaRestante: prueba,
            restantes,
            opiniones: misOps.length,
            califMedia: cals.length ? Math.round((cals.reduce((a, b) => a + b, 0) / cals.length) * 10) / 10 : null,
            banderas: [],
        };
        fila.banderas = banderas(fila);
        fuera.push(fila);
    }
    // Primero lo que pide atención: más banderas graves arriba, luego el uso.
    const peso = (f: FilaUsuario) => f.banderas.filter((b) => b.tono === 'malo').length * 10
        + f.banderas.filter((b) => b.tono === 'aviso').length;
    return fuera.sort((a, b) => peso(b) - peso(a) || b.proyectos30 - a.proyectos30);
}

/** Lo que hoy hubo que encontrar a mano, dicho solo.
 *
 *  LAS CUENTAS DE CASA NO SON CLIENTES. Las de David y las @iurexia.com se usan
 *  para probar: que «dejaran de entrar» o «no opinen» no dice nada de la
 *  experiencia de nadie, y en la primera corrida sobre los datos reales eran
 *  cuatro de las diez filas con bandera. Se marcan como casa y ya. */
export function banderas(f: FilaUsuario): Bandera[] {
    const b: Bandera[] = [];
    if (f.sinLimite) return [{ clave: 'casa', tono: 'neutro', texto: 'Cuenta de casa: sin bolsa ni banderas de cliente' }];
    if (f.delPiloto && !f.sinLimite && f.mesLimite === 0 && f.plan !== 'ultra_secretarios') {
        b.push({ clave: 'piloto_sin_bolsa', tono: 'malo',
                 texto: 'Asiento del piloto con bolsa mensual en 0: conserva el acceso pero sólo le queda la prueba' });
    }
    if (!f.sinLimite && f.mesLimite === 0 && f.mesUsados > 0) {
        b.push({ clave: 'sobreconsumo', tono: 'malo',
                 texto: `Consumió ${f.mesUsados} proyecto(s) del mes con un límite de 0` });
    }
    if (!f.sinLimite && f.restantes !== null && f.restantes <= 0) {
        b.push({ clave: 'sin_proyectos', tono: 'malo', texto: 'Sin proyectos disponibles: no puede generar' });
    }
    if (f.proyectos >= 3 && f.diasSinUso >= 7) {
        b.push({ clave: 'dejo_de_usar', tono: 'aviso',
                 texto: `Usuario activo que dejó de entrar hace ${f.diasSinUso} días` });
    }
    if (f.adelantos > 0 && f.proyectos === 0) {
        b.push({ clave: 'sin_proyecto', tono: 'aviso',
                 texto: 'Leyó expedientes pero nunca generó un proyecto' });
    }
    if (f.proyectos >= 2 && f.opiniones === 0) {
        b.push({ clave: 'sin_opinion', tono: 'neutro', texto: 'Genera proyectos y no ha opinado' });
    }
    if (f.califMedia !== null && f.califMedia <= 2.5) {
        b.push({ clave: 'mala_nota', tono: 'malo', texto: `Califica sus sentencias con ${f.califMedia}/5` });
    }
    return b;
}

// ── Los avisos de la máquina, agrupados por familia ────────────────────────

/**
 * La FAMILIA de un aviso: su rótulo en mayúsculas si lo trae —«PRECEPTOS
 * CITADOS QUE NO ESTÁN EN EL MATERIAL», «SINTAXIS», «FALTAN CONSTANCIAS
 * INDISPENSABLES»— y si no, sus primeras palabras sin números. Los números
 * fuera porque «3 tesis se citan sin registro» y «1 tesis se citan sin
 * registro» son el mismo defecto.
 */
export function familia(aviso: string): string {
    const t = String(aviso || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const sinNum = t.replace(/^\d+(?:\s+de\s+\d+)?\s+/i, '').replace(/\d+/g, 'N');
    const rotulo = sinNum.match(/^((?:[A-ZÁÉÍÓÚÑÜ«»()\-—,.]+\s+){0,9}[A-ZÁÉÍÓÚÑÜ]{3,}[A-ZÁÉÍÓÚÑÜ()]*)(?=[\s:.—,]|$)/);
    if (rotulo && rotulo[1].replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length >= 6) {
        return rotulo[1].replace(/[\s:.—,]+$/, '').slice(0, 80);
    }
    return sinNum.split(/[.:—«]/)[0].split(' ').slice(0, 7).join(' ').slice(0, 80);
}

export type FamiliaAviso = { familia: string; veces: number; proyectos: number; usuarios: number; ejemplo: string };

/** Las familias de avisos, de la más frecuente a la menos. */
export function avisosPorFamilia(fichas: { email: string; expediente: string; version: number; avisos: string[] }[]): FamiliaAviso[] {
    const m = new Map<string, { veces: number; proy: Set<string>; us: Set<string>; ej: string }>();
    for (const f of fichas) {
        for (const a of f.avisos || []) {
            const k = familia(a);
            if (!k) continue;
            if (!m.has(k)) m.set(k, { veces: 0, proy: new Set(), us: new Set(), ej: a });
            const x = m.get(k)!;
            x.veces++; x.proy.add(`${f.email}|${f.expediente}|${f.version}`); x.us.add(f.email);
        }
    }
    return Array.from(m.entries())
        .map(([k, x]) => ({ familia: k, veces: x.veces, proyectos: x.proy.size, usuarios: x.us.size,
                             ejemplo: x.ej.slice(0, 260) }))
        .sort((a, b) => b.proyectos - a.proyectos || b.veces - a.veces);
}

// ── Lo que dicen las opiniones, sumado ─────────────────────────────────────

// Las claves son las de `opiniones_taller.ASPECTOS` del API: el auditor suma
// por clave. «exhaustividad» y «sin_repeticion» entraron el 26-sep-2026
// (Decisión 5 de David): las dos cosas que el diagnóstico del estudio de fondo
// midió —argumentos sin contestar y razones repetidas— y que ningún aspecto
// preguntaba a quien firma. Etiquetas cortas, como las demás: caben en la
// columna del panel.
export const ASPECTOS: { clave: string; etiqueta: string }[] = [
    { clave: 'sentido', etiqueta: 'Sentido' },
    { clave: 'fundamentacion', etiqueta: 'Fundamentación' },
    { clave: 'exhaustividad', etiqueta: 'Exhaustividad' },
    { clave: 'sin_repeticion', etiqueta: 'Sin repetición' },
    { clave: 'citas', etiqueta: 'Citas' },
    { clave: 'redaccion', etiqueta: 'Redacción' },
    { clave: 'estructura', etiqueta: 'Estructura' },
    { clave: 'efectos', etiqueta: 'Efectos' },
    { clave: 'computo', etiqueta: 'Cómputo' },
];

export function resumenOpiniones(ops: Opinion[]) {
    const cals = ops.map((o) => Number(o.calificacion || 0)).filter((x) => x > 0);
    const corr: Record<string, number> = { nada: 0, poco: 0, mucho: 0, rehecho: 0 };
    for (const o of ops) if (o.correccion && o.correccion in corr) corr[o.correccion]++;
    const conCorr = Object.values(corr).reduce((a, b) => a + b, 0);
    const aspectos = ASPECTOS.map(({ clave, etiqueta }) => {
        let bien = 0, mejorar = 0;
        for (const o of ops) {
            const v = (o.aspectos || {})[clave];
            if (v === 'bien') bien++; else if (v === 'mejorar') mejorar++;
        }
        return { clave, etiqueta, bien, mejorar };
    });
    return {
        total: ops.length,
        califMedia: cals.length ? Math.round((cals.reduce((a, b) => a + b, 0) / cals.length) * 10) / 10 : null,
        correccion: corr,
        // LA CIFRA QUE MIDE A UN REDACTOR: cuántos proyectos se firman con
        // poca o ninguna corrección.
        firmables: conCorr ? Math.round(((corr.nada + corr.poco) / conCorr) * 100) : null,
        aspectos,
    };
}
