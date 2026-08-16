import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * Vigila el saldo del proveedor del motor y avisa ANTES de que se acabe.
 *
 * POR QUÉ EXISTE (16-ago-2026, reportes 1850-01 y 38-01)
 * ------------------------------------------------------
 * La cuenta del proveedor tocó fondo un sábado por la mañana. Nadie lo vio
 * venir porque nada lo vigilaba: el primer síntoma fueron usuarios de pago
 * con el análisis de documentos caído, y el segundo —peor— un error crudo
 * del proveedor en pantalla pidiéndole al usuario recargar créditos que no
 * eran suyos.
 *
 * La aritmética del incidente: el fallo decía «can only afford 13383
 * tokens». Con el gasto de salida del modelo de análisis (~12 USD por
 * millón), eso sitúa el saldo en ese momento en unos VEINTE CENTAVOS. Los
 * ~27 USD que había horas después ya incluían una recarga posterior. Es
 * decir: no fue un límite raro del proveedor, fue el tanque en cero.
 *
 * EL UMBRAL SE MIDE EN DÍAS, NO EN DÓLARES
 * ----------------------------------------
 * Un tope fijo envejece mal: el gasto semanal cambia con el uso. Aquí se
 * calcula el ritmo real de los últimos 7 días (lo da el propio proveedor) y
 * se avisa cuando queden menos de DIAS_DE_MARGEN al ritmo actual. Hoy eso
 * son ~3.7 USD/día; si el uso se duplica, el aviso se adelanta solo.
 *
 * No manda nada mientras haya margen, y no repite el aviso cada día: usa la
 * misma bitácora `avisos_infraestructura` que la alarma de almacenamiento.
 */

/** Se avisa cuando el saldo cubra menos de esto al ritmo de la última semana. */
const DIAS_DE_MARGEN = 10;

/** Suelo absoluto: por debajo de esto se avisa aunque el ritmo diga otra cosa. */
const PISO_USD = 15;

/** El aviso no se repite antes de esto, aunque siga bajo el umbral. */
const DIAS_ENTRE_AVISOS = 3;

const DESTINO = 'jdm.juridico@gmail.com';
const ASUNTO = 'saldo-motor';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export async function revisarSaldoMotor(): Promise<string> {
    const claveMotor = process.env.OPENROUTER_API_KEY;
    const claveCorreo = process.env.RESEND_API_KEY;
    if (!claveMotor) return 'saldo-motor: sin clave del proveedor, no se revisa';
    if (!claveCorreo) return 'saldo-motor: sin RESEND_API_KEY, no se revisa';

    let restante = 0, semanal = 0;
    try {
        const cab = { Authorization: `Bearer ${claveMotor}` };
        const [rc, rk] = await Promise.all([
            fetch('https://openrouter.ai/api/v1/credits', { headers: cab }),
            fetch('https://openrouter.ai/api/v1/auth/key', { headers: cab }),
        ]);
        const dc = (await rc.json())?.data;
        const dk = (await rk.json())?.data;
        restante = (dc?.total_credits || 0) - (dc?.total_usage || 0);
        semanal = dk?.usage_weekly || 0;
    } catch (e) {
        return `saldo-motor: no pude consultar al proveedor (${e instanceof Error ? e.message : e})`;
    }

    const porDia = Math.max(semanal / 7, 0.01);
    const diasQueQuedan = restante / porDia;

    if (diasQueQuedan >= DIAS_DE_MARGEN && restante >= PISO_USD) {
        return `saldo-motor: ${restante.toFixed(2)} USD (~${diasQueQuedan.toFixed(0)} días al ritmo actual) — sin aviso`;
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
        return `saldo-motor: bajo umbral (${restante.toFixed(2)} USD) pero ya se avisó hace menos de ${DIAS_ENTRE_AVISOS} días`;
    }

    const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:620px;margin:0 auto;
        color:#141312;font-size:15px;line-height:1.7">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">AVISO DE INFRAESTRUCTURA</p>
  <p style="margin:0 0 20px;font-size:21px"><b>El saldo del motor se está acabando</b></p>
  <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin:0 0 22px">
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Saldo restante</td>
        <td style="padding:5px 0"><b>${restante.toFixed(2)} USD</b></td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Gasto de los últimos 7 días</td>
        <td style="padding:5px 0">${semanal.toFixed(2)} USD (${porDia.toFixed(2)} USD/día)</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Alcanza para</td>
        <td style="padding:5px 0"><b>~${diasQueQuedan.toFixed(1)} días</b> al ritmo actual</td></tr>
  </table>
  <p style="margin:0 0 18px">Cuando llega a cero, el análisis de documentos y la redacción
  fallan para todos los planes, y el primer aviso son clientes de pago reportando. Recargar
  hoy cuesta un minuto; que se apague un sábado costó dos reportes críticos.</p>
  <p style="margin:0;font-size:13px;color:#8a8578">Este aviso no se repetirá en ${DIAS_ENTRE_AVISOS} días.
  Umbral: ${DIAS_DE_MARGEN} días de margen o ${PISO_USD} USD, lo que ocurra primero.</p>
</div>`;

    try {
        await new Resend(claveCorreo).emails.send({
            from: 'Iurexia <soporte@iurexia.com>',
            to: [DESTINO],
            subject: `El saldo del motor alcanza para ~${diasQueQuedan.toFixed(1)} días (${restante.toFixed(2)} USD)`,
            html,
        });
        await sb.from('avisos_infraestructura').insert({
            asunto: ASUNTO,
            detalle: { restante_usd: Number(restante.toFixed(2)), gasto_semanal_usd: Number(semanal.toFixed(2)), dias: Number(diasQueQuedan.toFixed(1)) },
        });
        return `saldo-motor: AVISO ENVIADO — ${restante.toFixed(2)} USD, ~${diasQueQuedan.toFixed(1)} días`;
    } catch (e) {
        return `saldo-motor: no se pudo enviar el aviso (${e instanceof Error ? e.message : e})`;
    }
}
