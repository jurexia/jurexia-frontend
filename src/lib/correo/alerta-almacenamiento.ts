import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * Avisa cuando el almacenamiento de expedientes deje de ser despreciable.
 *
 * LA DECISIÓN QUE ESTO VIGILA (16-ago-2026)
 * -----------------------------------------
 * Hoy se guarda el PDF de todos los planes. Medido: 145 MB sobre los 100 GB
 * que incluye el plan Pro de Supabase, y 1.17 USD/mes aunque los 1,981
 * usuarios llenaran su cuota completa. Contra un MRR de 36,650 pesos eso es
 * ruido, así que cambiarlo ahora sería trabajo sin retorno.
 *
 * Cuando crezca sí conviene, y el plan ya está pensado: guardar el PDF sólo a
 * Platinum y para el resto conservar el texto extraído, que pesa el **1.14 %**
 * del archivo. Eso recorta la exposición de 155 GB a 48 y convierte el
 * almacenamiento en una razón concreta para pagar Platinum.
 *
 * Esto existe para que ese momento no se descubra en una factura. No manda
 * nada mientras no haga falta.
 *
 * POR QUÉ AQUÍ Y NO EN UN CRON PROPIO
 * -----------------------------------
 * El bloque diario ya corre por cron de Vercel y ya tiene la clave de Resend.
 * Meter un cron nuevo sólo para esto sería duplicar secreto e infraestructura
 * para un correo que quizá no salga en un año.
 *
 * Y no gasta cupo: Resend da 100 correos al día en el plan gratuito, de los
 * que el bloque diario ya reserva 70. Éste manda **como mucho uno cada 30
 * días**, y sólo si se cruza un umbral.
 */

/** A partir de aquí conviene ponerse a ello: el 20 % de lo incluido. */
const TOPE_GB_TOTAL = 20;

/** O si pega un estirón: cinco gigas en un mes es otra escala de problema. */
const TOPE_GB_EN_30_DIAS = 5;

/** No se repite el aviso antes de esto, aunque el umbral siga cruzado. */
const DIAS_ENTRE_AVISOS = 30;

const DESTINO = 'jdm.juridico@gmail.com';
const ASUNTO = 'almacenamiento-expedientes';

interface Foto {
    gb_total: number;
    gb_platinum: number;
    gb_resto: number;
    gb_ultimos_30: number;
    documentos: number;
    usuarios: number;
    mb_texto: number;
}

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

function cuerpo(f: Foto, motivo: string): string {
    const pct = ((f.gb_total / 100) * 100).toFixed(1);
    const ahorro = f.gb_resto > 0 ? ((f.gb_resto / f.gb_total) * 100).toFixed(0) : '0';
    return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:620px;margin:0 auto;
            color:#141312;font-size:15px;line-height:1.7">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">
    AVISO DE INFRAESTRUCTURA</p>
  <p style="margin:0 0 20px;font-size:21px"><b>Toca revisar el almacenamiento de expedientes</b></p>

  <p style="margin:0 0 18px">${motivo}</p>

  <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin:0 0 22px">
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Guardado en total</td>
        <td style="padding:5px 0"><b>${f.gb_total} GB</b> · ${pct}% de los 100 GB incluidos</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">De Platinum</td>
        <td style="padding:5px 0">${f.gb_platinum} GB</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Del resto de planes</td>
        <td style="padding:5px 0"><b>${f.gb_resto} GB</b> — esto es lo que se dejaría de guardar</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Añadido en 30 días</td>
        <td style="padding:5px 0">${f.gb_ultimos_30} GB</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Documentos</td>
        <td style="padding:5px 0">${f.documentos} de ${f.usuarios} usuarios</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Peso del texto</td>
        <td style="padding:5px 0">${f.mb_texto} MB — lo que Iurexia realmente usa</td></tr>
  </table>

  <div style="border-left:3px solid #c9a962;padding:4px 0 4px 18px;margin:0 0 22px;color:#4a463d">
    <p style="margin:0 0 10px"><b>El plan que ya estaba pensado</b></p>
    <p style="margin:0">Guardar el PDF sólo a los Platinum y, para el resto, conservar
    únicamente el texto extraído. Hoy eso quitaría de encima el <b>${ahorro}%</b> de lo
    almacenado. Tres condiciones acordadas: aplicar <b>hacia adelante</b> (lo ya subido se
    respeta), avisar al abogado en el momento de subir, y mostrar una ficha con el texto en
    vez de una miniatura de PDF que no existe.</p>
  </div>

  <p style="margin:0 0 8px;font-size:13px;color:#8a8578">
    Este aviso no se repetirá en ${DIAS_ENTRE_AVISOS} días. Se dispara solo desde el bloque
    diario de correos.</p>
</div>`;
}

/**
 * Mira el almacenamiento y avisa si toca. Devuelve qué hizo, para el registro
 * del bloque diario.
 */
export async function revisarAlmacenamiento(): Promise<string> {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) return 'almacenamiento: sin RESEND_API_KEY, no se revisa';

    const sb = admin();
    const { data, error } = await sb.rpc('medir_almacenamiento_expedientes');
    if (error || !data) return `almacenamiento: no se pudo medir (${error?.message ?? 'sin datos'})`;

    const f = data as Foto;

    let motivo = '';
    if (f.gb_total >= TOPE_GB_TOTAL) {
        motivo =
            `El almacenamiento de expedientes llegó a <b>${f.gb_total} GB</b>, que es el ` +
            `umbral fijado (${TOPE_GB_TOTAL} GB, el 20% de lo que incluye el plan). Todavía ` +
            `hay margen de sobra, y por eso avisa ahora: para hacerlo con calma.`;
    } else if (f.gb_ultimos_30 >= TOPE_GB_EN_30_DIAS) {
        motivo =
            `En los últimos 30 días se añadieron <b>${f.gb_ultimos_30} GB</b>. No es el total ` +
            `lo que preocupa —van ${f.gb_total} GB— sino el ritmo: a esta velocidad el umbral ` +
            `llega pronto.`;
    } else {
        return `almacenamiento: ${f.gb_total} GB, por debajo del umbral — sin aviso`;
    }

    // Un aviso cada 30 días como mucho: repetirlo cada día lo volvería ruido y
    // acabaría en la papelera justo cuando importa.
    const desde = new Date(Date.now() - DIAS_ENTRE_AVISOS * 86400_000).toISOString();
    const { data: previos } = await sb
        .from('avisos_infraestructura')
        .select('id')
        .eq('asunto', ASUNTO)
        .gte('enviado_at', desde)
        .limit(1);
    if (previos && previos.length > 0) {
        return `almacenamiento: umbral cruzado (${f.gb_total} GB) pero ya se avisó hace menos de ${DIAS_ENTRE_AVISOS} días`;
    }

    try {
        await new Resend(clave).emails.send({
            from: 'Iurexia <soporte@iurexia.com>',
            to: [DESTINO],
            subject: `Toca revisar el almacenamiento de expedientes (${f.gb_total} GB)`,
            html: cuerpo(f, motivo),
        });
        await sb.from('avisos_infraestructura').insert({ asunto: ASUNTO, detalle: f });
        return `almacenamiento: AVISO ENVIADO — ${f.gb_total} GB`;
    } catch (e) {
        return `almacenamiento: no se pudo enviar el aviso (${e instanceof Error ? e.message : e})`;
    }
}
