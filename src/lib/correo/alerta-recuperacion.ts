import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * Vigila que la recuperación por concepto siga encendida.
 *
 * POR QUÉ EXISTE (22-ago-2026)
 * ----------------------------
 * HyDE —la pieza que convierte la pregunta del abogado en el concepto
 * jurídico antes de buscar— estuvo MESES apagada y nada lo dijo. Medido sobre
 * diez horas de tráfico de producción: cero documentos generados, ochenta y
 * ocho tiempos agotados. Cien por ciento de fallos, sin una sola alarma.
 *
 * Porque una capa apagada no rompe nada: la respuesta sigue saliendo, sólo que
 * peor. Se descubrió porque David preguntó por el derecho del tanto en
 * Querétaro y no recibió un solo artículo — el sistema, sin HyDE, buscaba con
 * las palabras crudas de la pregunta y devolvía la Ley del Deporte.
 *
 * Esta alarma existe para que el próximo apagón dure un día, no meses.
 *
 * QUÉ VIGILA
 * ----------
 * `tasa` es la fracción de intentos de HyDE que produjeron documento en las
 * últimas 24 h. Se avisa si cae por debajo del umbral con volumen suficiente
 * —una tasa baja sobre tres intentos no significa nada—, o si alguien apagó
 * la pasada por concepto, que es la red de seguridad que no depende de
 * ningún modelo.
 */

/** Por debajo de esto, con volumen, se avisa. */
const TASA_MINIMA = 0.15;

/** No se juzga la tasa con menos intentos que esto. */
const INTENTOS_MINIMOS = 20;

/** El aviso no se repite antes de esto. */
const DIAS_ENTRE_AVISOS = 2;

const DESTINO = 'jdm.juridico@gmail.com';
const ASUNTO = 'recuperacion-concepto';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export async function revisarRecuperacion(): Promise<string> {
    const base = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';
    const claveCorreo = process.env.RESEND_API_KEY;

    let salud: {
        hyde: { intentos: number; generados: number; plazo_agotado: number; tasa: number | null; plazo_seg: number; ms_mediana: number | null };
        pasada_concepto: { veces: number; activa: boolean };
    };
    try {
        const r = await fetch(`${base}/salud/recuperacion`, { cache: 'no-store' });
        if (!r.ok) return `recuperacion: el endpoint respondió ${r.status}`;
        salud = await r.json();
    } catch (e) {
        return `recuperacion: no pude leer la salud (${e instanceof Error ? e.message : e})`;
    }

    const { hyde, pasada_concepto: pasada } = salud;
    const motivos: string[] = [];

    if (!pasada.activa) {
        // Ésta es la grave: es la red que sostiene la calidad cuando el
        // proveedor del modelo falla.
        motivos.push('la PASADA POR CONCEPTO está apagada (PASADA_CONCEPTO=false)');
    }
    if (hyde.intentos >= INTENTOS_MINIMOS && (hyde.tasa ?? 1) < TASA_MINIMA) {
        motivos.push(
            `HyDE produjo documento en ${hyde.generados} de ${hyde.intentos} intentos ` +
            `(${Math.round((hyde.tasa ?? 0) * 100)}%), con plazo de ${hyde.plazo_seg}s`
        );
    }

    if (motivos.length === 0) {
        return `recuperacion: bien — HyDE ${hyde.generados}/${hyde.intentos}` +
            (hyde.tasa !== null ? ` (${Math.round(hyde.tasa * 100)}%)` : '') +
            `, pasada por concepto ${pasada.veces} veces`;
    }

    const sb = admin();
    const desde = new Date(Date.now() - DIAS_ENTRE_AVISOS * 86400_000).toISOString();
    const { data: previos } = await sb
        .from('avisos_infraestructura')
        .select('id')
        .eq('asunto', ASUNTO)
        .gte('enviado_at', desde)
        .limit(1);
    if (previos && previos.length > 0) {
        return `recuperacion: degradada pero ya se avisó hace menos de ${DIAS_ENTRE_AVISOS} días`;
    }

    const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:620px;margin:0 auto;
        color:#141312;font-size:15px;line-height:1.7">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">AVISO DE INFRAESTRUCTURA</p>
  <p style="margin:0 0 20px;font-size:21px"><b>La búsqueda volvió a quedarse sin concepto</b></p>
  <p style="margin:0 0 18px">${motivos.map(m => `• ${m}`).join('<br>')}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin:0 0 22px">
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">HyDE, últimas 24 h</td>
        <td style="padding:5px 0"><b>${hyde.generados} de ${hyde.intentos}</b> generados
        · ${hyde.plazo_agotado} con el plazo agotado</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Plazo configurado</td>
        <td style="padding:5px 0">${hyde.plazo_seg} s${hyde.ms_mediana ? ` · mediana real ${hyde.ms_mediana} ms` : ''}</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Pasada por concepto</td>
        <td style="padding:5px 0">${pasada.activa ? `encendida, ${pasada.veces} veces` : '<b>APAGADA</b>'}</td></tr>
  </table>
  <p style="margin:0 0 18px">Sin esto, la búsqueda usa las palabras crudas de la pregunta. Medido:
  «Que artículos regulan el derecho del tanto en el estao de querétaro?» devolvía la Ley del Deporte
  y la Ley de Profesiones en vez de los artículos 964 y 965 del Código Civil. El abogado recibe una
  respuesta que suena bien y no cita lo que debe.</p>
  <p style="margin:0 0 18px"><b>Qué hacer:</b> si la mediana real supera el plazo, subir
  <code>HYDE_PLAZO_SEG</code> en Render. Si la pasada está apagada, quitar
  <code>PASADA_CONCEPTO=false</code>. Después, correr <code>guardia.py</code>.</p>
  <p style="margin:0;font-size:13px;color:#8a8578">Este aviso no se repetirá en ${DIAS_ENTRE_AVISOS} días.
  Umbral: menos del ${Math.round(TASA_MINIMA * 100)}% de aciertos sobre al menos ${INTENTOS_MINIMOS} intentos.</p>
</div>`;

    if (!claveCorreo) return `recuperacion: degradada (${motivos.join('; ')}) pero falta RESEND_API_KEY`;

    try {
        await new Resend(claveCorreo).emails.send({
            from: 'Iurexia <soporte@iurexia.com>',
            to: [DESTINO],
            subject: `La búsqueda perdió el concepto — HyDE ${hyde.generados}/${hyde.intentos}`,
            html,
        });
        await sb.from('avisos_infraestructura').insert({
            asunto: ASUNTO,
            detalle: {
                hyde_generados: hyde.generados, hyde_intentos: hyde.intentos,
                hyde_tasa: hyde.tasa, plazo_seg: hyde.plazo_seg,
                pasada_activa: pasada.activa, motivos,
            },
        });
        return `recuperacion: AVISO ENVIADO — ${motivos.join('; ')}`;
    } catch (e) {
        return `recuperacion: no se pudo enviar el aviso (${e instanceof Error ? e.message : e})`;
    }
}
