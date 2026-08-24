import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * Vigila los créditos de ElevenLabs del Agente IA.
 *
 * POR QUÉ EXISTE (23-ago-2026)
 * ----------------------------
 * El 16 de agosto se acabó el saldo del motor un sábado y el primer aviso
 * fueron dos clientes de pago reportando. Aquí sería peor: un abogado de pie
 * en una audiencia al que la voz deja de responder a media pregunta.
 *
 * POR QUÉ NO SE LE PREGUNTA A ELEVENLABS
 * --------------------------------------
 * Porque la clave de la casa no tiene permiso `user_read` —devuelve 401 en
 * /v1/user/subscription— y porque, aunque lo tuviera, su saldo no dice QUIÉN
 * lo está gastando. Se cuenta lo que MANDAMOS, que es un dato que sí tenemos,
 * es exacto para esta función y además viene desglosado por abogado.
 *
 * El punto ciego, dicho para que no sorprenda: los créditos que gaste la
 * campaña de vídeo desde la misma cuenta NO se ven aquí. Si un mes se graban
 * muchas piezas, el margen real será menor que el que calcula este aviso.
 *
 * LA UNIDAD ES EL DÍA, NO EL PORCENTAJE
 * -------------------------------------
 * «Te queda el 20%» no dice nada: puede ser una semana o una tarde. «Te quedan
 * tres días al ritmo de esta semana» se entiende y se puede actuar.
 */

/** Los modelos flash cuestan medio crédito por carácter; los de calidad, uno. */
const CREDITOS_POR_CARACTER = 0.5;

/** La cuota del plan contratado. Creator = 121.000. Se cambia sin desplegar. */
const CUOTA_MES = Number(process.env.ELEVENLABS_CREDITOS_MES ?? 121_000);

/** Por debajo de esto, se avisa. */
const DIAS_DE_MARGEN = 7;

/** El aviso no se repite antes de esto. */
const DIAS_ENTRE_AVISOS = 3;

const DESTINO = 'jdm.juridico@gmail.com';
const ASUNTO = 'creditos-voz';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
}

export async function revisarCreditosVoz(): Promise<string> {
    const sb = admin();

    // El mes en curso, en hora de México — que es el día que cuenta la tabla.
    const ahora = new Date();
    const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1))
        .toISOString().slice(0, 10);

    const { data, error } = await sb
        .from('voz_uso')
        .select('user_id, dia, turnos, caracteres')
        .gte('dia', inicioMes);

    if (error) return `creditos-voz: no pude leer el uso (${error.message})`;

    const filas = data ?? [];
    if (filas.length === 0) return 'creditos-voz: nadie ha usado la voz este mes';

    const caracteres = filas.reduce((s, f) => s + (f.caracteres ?? 0), 0);
    const turnos = filas.reduce((s, f) => s + (f.turnos ?? 0), 0);
    const gastados = caracteres * CREDITOS_POR_CARACTER;
    const restantes = Math.max(0, CUOTA_MES - gastados);

    // El ritmo se mide sobre los últimos SIETE días con uso, no sobre el mes
    // entero: una función que se estrena a mitad de mes tendría una media
    // engañosamente baja y la alarma llegaría tarde.
    const hace7 = new Date(ahora.getTime() - 7 * 86400_000).toISOString().slice(0, 10);
    const recientes = filas.filter(f => f.dia >= hace7);
    const diasConUso = new Set(recientes.map(f => f.dia)).size || 1;
    const porDia = (recientes.reduce((s, f) => s + (f.caracteres ?? 0), 0) * CREDITOS_POR_CARACTER)
        / diasConUso;

    const diasQueQuedan = porDia > 0 ? restantes / porDia : Infinity;

    const resumen = `${Math.round(gastados).toLocaleString('es-MX')} de ` +
        `${CUOTA_MES.toLocaleString('es-MX')} créditos · ${turnos} turnos · ` +
        (Number.isFinite(diasQueQuedan) ? `~${diasQueQuedan.toFixed(0)} días de margen` : 'sin consumo diario');

    if (diasQueQuedan >= DIAS_DE_MARGEN) return `creditos-voz: bien — ${resumen}`;

    const desde = new Date(Date.now() - DIAS_ENTRE_AVISOS * 86400_000).toISOString();
    const { data: previos } = await sb
        .from('avisos_infraestructura')
        .select('id').eq('asunto', ASUNTO).gte('enviado_at', desde).limit(1);
    if (previos && previos.length > 0) {
        return `creditos-voz: bajo umbral (${resumen}) pero ya se avisó hace menos de ${DIAS_ENTRE_AVISOS} días`;
    }

    const claveCorreo = process.env.RESEND_API_KEY;
    if (!claveCorreo) return `creditos-voz: bajo umbral (${resumen}) pero falta RESEND_API_KEY`;

    // Quién lo está gastando. Es lo que la factura de ElevenLabs no dice y lo
    // que permite decidir entre subir de plan o bajar el tope diario.
    const porUsuario = new Map<string, number>();
    for (const f of filas) {
        porUsuario.set(f.user_id, (porUsuario.get(f.user_id) ?? 0) + (f.caracteres ?? 0));
    }
    const top = Array.from(porUsuario.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const { data: perfiles } = await sb
        .from('user_profiles').select('id, email, subscription_type')
        .in('id', top.map(([id]) => id));
    const quien = new Map((perfiles ?? []).map(p => [p.id, p]));

    const listaTop = top.map(([id, chars]) => {
        const p = quien.get(id);
        return `<tr><td style="padding:4px 14px 4px 0;color:#8a8578">${p?.email ?? id.slice(0, 8)}</td>` +
            `<td style="padding:4px 0"><b>${Math.round(chars * CREDITOS_POR_CARACTER).toLocaleString('es-MX')}</b> créditos` +
            ` · ${p?.subscription_type ?? '—'}</td></tr>`;
    }).join('');

    const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:620px;margin:0 auto;
        color:#141312;font-size:15px;line-height:1.7">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">AVISO DE INFRAESTRUCTURA</p>
  <p style="margin:0 0 20px;font-size:21px"><b>Al Agente IA le quedan ${diasQueQuedan.toFixed(0)} días de voz</b></p>
  <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin:0 0 22px">
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Gastado este mes</td>
        <td style="padding:5px 0"><b>${Math.round(gastados).toLocaleString('es-MX')}</b> de ${CUOTA_MES.toLocaleString('es-MX')} créditos</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Turnos hablados</td>
        <td style="padding:5px 0">${turnos}</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Ritmo</td>
        <td style="padding:5px 0">${Math.round(porDia).toLocaleString('es-MX')} créditos al día (últimos 7)</td></tr>
  </table>
  <p style="margin:0 0 8px;font-size:11.5px;color:#8a8578;letter-spacing:2px">QUIÉN LO ESTÁ GASTANDO</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 22px">${listaTop}</table>
  <p style="margin:0 0 18px"><b>Qué hacer:</b> subir de plan en ElevenLabs, o bajar
  <code>VOZ_TOPE_DIARIO</code> en Render. Con el tope en 5 en vez de 10, los Platinum caben
  en Pro; con 3, caben con margen.</p>
  <p style="margin:0;font-size:13px;color:#8a8578">Este aviso no se repetirá en ${DIAS_ENTRE_AVISOS} días.
  Umbral: menos de ${DIAS_DE_MARGEN} días de margen. No incluye lo que gaste la campaña de vídeo
  desde la misma cuenta.</p>
</div>`;

    try {
        await new Resend(claveCorreo).emails.send({
            from: 'Iurexia <soporte@iurexia.com>',
            to: [DESTINO],
            subject: `Al Agente IA le quedan ${diasQueQuedan.toFixed(0)} días de voz`,
            html,
        });
        await sb.from('avisos_infraestructura').insert({
            asunto: ASUNTO,
            detalle: { gastados: Math.round(gastados), cuota: CUOTA_MES, turnos, dias: Number(diasQueQuedan.toFixed(1)) },
        });
        return `creditos-voz: AVISO ENVIADO — ${resumen}`;
    } catch (e) {
        return `creditos-voz: no se pudo enviar (${e instanceof Error ? e.message : e})`;
    }
}
