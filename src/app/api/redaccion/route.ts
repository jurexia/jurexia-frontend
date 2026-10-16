/**
 * «CAMBIAR REDACCIÓN» SOBRE LO SELECCIONADO EN LA HOJA (16-oct-2026).
 *
 * David: «Seleccionamos el texto y que se despliegue un botón que diga cambiar
 * redacción; al clicar, con un prompt, que se cambie». El menú
 * (`MenuRedaccion.tsx`) manda aquí el fragmento —con sus fichas de cita como
 * marcadores ⟦n⟧, ver `@/lib/redaccion/marcadores`— y lo de alrededor, y recibe:
 *
 *   · `reescribir` → { propuesta, reinsertadas? }: el texto que reemplazaría al
 *     fragmento. La hoja lo enseña como cambio marcado y el abogado lo acepta o
 *     lo rechaza: aquí no se escribe nada en ningún documento.
 *   · `explicar`   → { explicacion }: qué dice el fragmento, en 120 palabras.
 *
 * EL ORDEN DE LAS PUERTAS: se valida (400, no gasta), se identifica al usuario
 * (401), se gasta una unidad del tope de su plan (429 con el mensaje que ve) y
 * sólo entonces se llama al modelo. Si el modelo no responde, 503.
 *
 * DESPUÉS DEL MODELO SE COMPRUEBA, no se confía. Si la propuesta perdió una
 * cita, o «acortar» no acortó, se pide una vez más con el aviso; si la cita
 * sigue faltando, se reinserta al final de su párrafo y la respuesta lo dice
 * (`reinsertadas`) para que la pantalla pida revisarla. Un reintento no gasta
 * otra unidad: el abogado pidió una sola cosa.
 *
 * EN LOS REGISTROS NO VA EL TEXTO: es el expediente del cliente. Sólo la acción,
 * los tamaños, el tiempo y si hubo reintento.
 */
import { NextRequest, NextResponse } from 'next/server';
import { solicitanteDe } from '@/lib/servidor/peticion';
import { gastarUso } from '@/lib/servidor/uso';
import { completar, ModeloNoDisponible } from '@/lib/servidor/modelo';
import { encargoDeExplicacion, encargoDeReescritura, excedeAcortar, validarPedido, type PedidoRedaccion } from '@/lib/redaccion/prompts';
import { depurarMarcadores, marcador, numerosEn, palabrasDe, reinsertarMarcadores, revisarMarcadores, unicos } from '@/lib/redaccion/marcadores';
import { limpiarExplicacion, limpiarSalida } from '@/lib/redaccion/salida';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_RESPONDE = 'El servicio de redacción no responde. Vuelve a intentarlo en un momento.';
const TITULO = 'Iurexia Redacción';
/** El minuto de Vercel, con margen para responder: el reintento sólo cabe si queda tiempo. */
const PRESUPUESTO_MS = 54_000;
const PRIMERA_MS = 32_000;
const MINIMO_REINTENTO_MS = 9_000;

function json(estado: number, cuerpo: Record<string, unknown>) {
    return NextResponse.json(cuerpo, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

async function reescribir(p: PedidoRedaccion, refuerzo: string, tiempoMs: number): Promise<string> {
    const e = encargoDeReescritura(p, refuerzo);
    const bruto = await completar({
        sistema: e.sistema, usuario: e.usuario, temperatura: e.temperatura, maxTokens: e.maxTokens,
        titulo: TITULO, tiempoMs,
    });
    return limpiarSalida(bruto, p.texto);
}

/** Lo que la propuesta incumple de lo que sí se puede medir. */
function reparos(p: PedidoRedaccion, propuesta: string): string[] {
    const salida: string[] = [];
    const r = revisarMarcadores(p.texto, propuesta);
    if (r.faltan.length) {
        salida.push(`ATENCIÓN: en tu intento anterior faltaron estos marcadores de cita: ${r.faltan.map(marcador).join(' ')}. Inclúyelos todos, una vez cada uno, junto a la idea que respaldan.`);
    }
    if (r.sobran.length) {
        salida.push(`ATENCIÓN: en tu intento anterior apareció ${r.sobran.map(marcador).join(' ')}, que no existe en el fragmento. No inventes marcadores.`);
    }
    if (!p.instruccion && p.opcion === 'acortar' && excedeAcortar(p.texto, propuesta)) {
        const tope = Math.max(1, Math.floor(palabrasDe(p.texto) * 0.7));
        salida.push(`ATENCIÓN: tu intento anterior tenía ${palabrasDe(propuesta)} palabras; el máximo es ${tope}. Acórtalo de verdad.`);
    }
    return salida;
}

export async function POST(req: NextRequest) {
    const inicio = Date.now();
    let cuerpo: unknown;
    try { cuerpo = await req.json(); } catch { return json(400, { mensaje: 'La petición llegó mal formada.' }); }
    const v = validarPedido(cuerpo);
    if ('error' in v) return json(400, { mensaje: v.error });
    const pedido = v.pedido;

    const quien = await solicitanteDe(req).catch(() => null);
    if (!quien) return json(401, { mensaje: 'Tu sesión terminó. Vuelve a entrar para cambiar la redacción.' });

    let uso;
    try {
        uso = await gastarUso(quien.user.id, quien.plan, 'redaccion');
    } catch {
        return json(503, { mensaje: 'No se pudo registrar el uso. Vuelve a intentarlo en un momento.' });
    }
    if (!uso.permitido) {
        return json(429, { mensaje: uso.mensaje || 'Llegaste al tope de cambios de redacción de hoy.', limite: uso.limite, usados: uso.usados });
    }

    try {
        if (pedido.accion === 'explicar') {
            const e = encargoDeExplicacion(pedido);
            const bruto = await completar({
                sistema: e.sistema, usuario: e.usuario, temperatura: e.temperatura, maxTokens: e.maxTokens,
                titulo: TITULO, tiempoMs: PRIMERA_MS,
            });
            const explicacion = limpiarExplicacion(bruto);
            if (!explicacion) throw new ModeloNoDisponible('Explicación vacía');
            console.info(`[redaccion] explicar ${pedido.texto.length} car. → ${palabrasDe(explicacion)} palabras · ${Date.now() - inicio} ms`);
            return json(200, { explicacion });
        }

        let propuesta = await reescribir(pedido, '', PRIMERA_MS);
        if (!propuesta) throw new ModeloNoDisponible('Propuesta vacía');
        let reintento = false;
        const avisos = reparos(pedido, propuesta);
        const queda = PRESUPUESTO_MS - (Date.now() - inicio);
        if (avisos.length && queda >= MINIMO_REINTENTO_MS) {
            reintento = true;
            try {
                const segunda = await reescribir(pedido, avisos.join('\n'), Math.min(PRIMERA_MS, queda));
                // Se queda la que menos incumple; a igualdad, la segunda (ya leyó el aviso).
                if (segunda && reparos(pedido, segunda).length <= avisos.length) propuesta = segunda;
            } catch (e) {
                if (!(e instanceof ModeloNoDisponible)) throw e;
                // Sin segunda vuelta se sigue con la primera: sus citas se reinsertan abajo.
            }
        }

        const esperados = unicos(numerosEn(pedido.texto));
        propuesta = depurarMarcadores(propuesta, esperados);
        const reinsertadas = revisarMarcadores(pedido.texto, propuesta).faltan;
        if (reinsertadas.length) propuesta = reinsertarMarcadores(propuesta, pedido.texto, reinsertadas);

        console.info(`[redaccion] reescribir ${pedido.instruccion ? 'instrucción' : pedido.opcion}${pedido.anterior ? ' (otra versión)' : ''} · ${pedido.texto.length}→${propuesta.length} car. · ${Date.now() - inicio} ms${reintento ? ' · reintento' : ''}${reinsertadas.length ? ` · ${reinsertadas.length} cita(s) reinsertada(s)` : ''}`);
        return json(200, { propuesta, ...(reinsertadas.length ? { reinsertadas } : {}) });
    } catch (e) {
        if (e instanceof ModeloNoDisponible) {
            console.warn(`[redaccion] el modelo no respondió: ${e.message} · ${Date.now() - inicio} ms`);
            return json(503, { mensaje: NO_RESPONDE });
        }
        console.error('[redaccion] fallo inesperado:', (e as Error)?.message);
        return json(500, { mensaje: 'No se pudo preparar la propuesta. Vuelve a intentarlo.' });
    }
}
