/**
 * Recogida: vacía las tres puertas de entrada en el libro de incidencias.
 *
 * Lo único que hace es COPIAR y CLASIFICAR. No verifica, no arregla, no
 * escribe a nadie. Esa separación es deliberada: la recogida corre a menudo y
 * tiene que ser aburrida y barata. Si algo se rompe aquí, se rompe sin causar
 * daño — como mucho, una incidencia se queda sin recoger hasta la vuelta
 * siguiente.
 *
 * La reentrada la garantiza el índice único (origen, origen_id): el cron puede
 * dispararse dos veces seguidas y no duplica nada.
 */

import { createClient } from '@supabase/supabase-js';
import { clasificar, requiereVistoBueno } from './triaje';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
}

/** Tope por vuelta. Sin esto, la primera corrida intenta clasificar 182 de golpe. */
const MAXIMO_POR_VUELTA = 40;

export interface Recogida {
    vistos: number;
    nuevos: number;
    por_familia: Record<string, number>;
    por_regla: number;
    por_modelo: number;
    errores: string[];
}

interface Entrada {
    origen: 'reporte' | 'correccion' | 'correo';
    origen_id: string;
    folio: string | null;
    user_email: string | null;
    user_id: string | null;
    texto: string;
    contexto: string | null;
    creado_at: string;
}

/** Reportes de la plataforma que aún no están en el libro. */
async function deReportes(cliente: ReturnType<typeof admin>): Promise<Entrada[]> {
    const { data, error } = await cliente
        .from('user_feedback')
        .select('id, folio, user_email, user_id, message, created_at')
        .eq('status', 'pendiente')
        .order('created_at', { ascending: true })
        .limit(200);
    if (error) throw new Error(`reportes: ${error.message}`);
    return (data ?? []).map((r: Record<string, unknown>) => ({
        origen: 'reporte' as const,
        origen_id: String(r.id),
        folio: (r.folio as string) ?? null,
        user_email: (r.user_email as string) ?? null,
        user_id: (r.user_id as string) ?? null,
        texto: String(r.message ?? ''),
        contexto: null,
        creado_at: String(r.created_at),
    }));
}

/**
 * Correcciones: cuando un abogado le discute una respuesta a la máquina.
 *
 * Es la señal de más calidad que entra, y por una razón concreta: viene con
 * `respuesta_previa`, es decir, con la prueba del delito. Una queja sin la
 * respuesta que la provocó sólo se puede creer; con ella se puede verificar.
 */
async function deCorrecciones(cliente: ReturnType<typeof admin>): Promise<Entrada[]> {
    const { data, error } = await cliente
        .from('correcciones_usuario')
        .select('id, correo, user_id, texto, respuesta_previa, senal, creado_at')
        .order('creado_at', { ascending: true })
        .limit(200);
    if (error) throw new Error(`correcciones: ${error.message}`);
    return (data ?? []).map((r: Record<string, unknown>) => ({
        origen: 'correccion' as const,
        origen_id: String(r.id),
        folio: null,
        user_email: (r.correo as string) ?? null,
        user_id: (r.user_id as string) ?? null,
        texto: [r.senal ? `[${r.senal}] ` : '', String(r.texto ?? '')].join(''),
        contexto: (r.respuesta_previa as string) ?? null,
        creado_at: String(r.creado_at),
    }));
}

export async function recoger(): Promise<Recogida> {
    const cliente = admin();
    const res: Recogida = {
        vistos: 0, nuevos: 0, por_familia: {}, por_regla: 0, por_modelo: 0, errores: [],
    };

    let candidatos: Entrada[] = [];
    for (const cargar of [deReportes, deCorrecciones]) {
        try {
            candidatos = candidatos.concat(await cargar(cliente));
        } catch (e) {
            // Una puerta rota no debe cerrar las otras.
            res.errores.push(e instanceof Error ? e.message : String(e));
        }
    }
    res.vistos = candidatos.length;

    // Qué hay ya en el libro, para no gastar una llamada al modelo en algo
    // que ya está clasificado. El índice único lo impediría igualmente, pero
    // lo caro no es el insert: es el triaje.
    const { data: yaEstan } = await cliente
        .from('incidencias').select('origen, origen_id').limit(5000);
    const conocidas = new Set((yaEstan ?? []).map(
        (r: { origen: string; origen_id: string }) => `${r.origen}:${r.origen_id}`));

    const frescas = candidatos
        .filter(c => !conocidas.has(`${c.origen}:${c.origen_id}`))
        .slice(0, MAXIMO_POR_VUELTA);

    for (const c of frescas) {
        try {
            const cl = await clasificar(c.contexto ? `${c.texto}\n\n---\n${c.contexto.slice(0, 600)}` : c.texto);

            const { error } = await cliente.from('incidencias').insert({
                origen: c.origen, origen_id: c.origen_id, folio: c.folio,
                user_email: c.user_email, user_id: c.user_id,
                texto: c.texto, contexto: c.contexto, creado_at: c.creado_at,
                familia: cl.familia, clase: cl.clase,
                triaje_por: cl.por, confianza: cl.confianza,
                estado: 'triada',
                requiere_vb: requiereVistoBueno(cl.clase),
            });
            // 23505 = choque con el índice único. Es la reentrada funcionando,
            // no un fallo: otra vuelta la metió primero.
            if (error && error.code !== '23505') { res.errores.push(error.message); continue; }
            if (error) continue;

            res.nuevos++;
            res.por_familia[cl.familia] = (res.por_familia[cl.familia] ?? 0) + 1;
            if (cl.por === 'regla') res.por_regla++; else res.por_modelo++;
        } catch (e) {
            res.errores.push(e instanceof Error ? e.message : String(e));
        }
    }

    return res;
}
