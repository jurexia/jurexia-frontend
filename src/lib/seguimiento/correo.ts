/**
 * Los dos correos del seguimiento.
 *
 * POR QUÉ SON DOS Y NO UNO. Para que el silencio de Iurexia signifique UNA sola
 * cosa. Si sólo existiera el de «hay novedad», un día sin correo sería a la vez
 * «no pasó nada» y «no pudimos mirar», y el abogado no podría distinguirlos.
 *
 * SIN NOMBRES DE PARTES EN EL ASUNTO: viaja por servidores ajenos y se lee en
 * la pantalla de bloqueo del móvil. Van el número y el órgano, que son públicos.
 *
 * EL DESCARGO VA ÍNTEGRO. Lo impone el propio Consejo de la Judicatura y además
 * protege al producto.
 */

const REMITENTE = 'Iurexia <avisos@iurexia.com>';
const RESPONDER_A = 'soporte@iurexia.com';

const DESCARGO =
    'El Consejo de la Judicatura Federal advierte que esta información «es '
    + 'únicamente de carácter informativo y que si bien es la misma que se '
    + 'encuentra en los Estrados de los Juzgados y Tribunales Federales, no se '
    + 'debe tomar como oficial. Por lo tanto, no será válida para ser utilizada '
    + 'en ningún tipo de proceso jurídico.» Iurexia no sustituye la consulta del '
    + 'expediente.';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function enLetra(iso: string | null) {
    const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : (iso || '');
}

function envolver(t: string, ancho = 72) {
    const salida: string[] = [];
    let linea = '';
    for (const p of t.split(/\s+/)) {
        if ((linea + ' ' + p).trim().length > ancho) { salida.push(linea); linea = p; }
        else linea = `${linea} ${p}`.trim();
    }
    if (linea) salida.push(linea);
    return salida;
}

export type SegParaCorreo = {
    id: string;
    numero: string;
    alias: string;
    fecha_local: string;
    url_fuente?: string | null;
};

export function correoActuacion(
    seg: SegParaCorreo, organo: string, actuaciones: {
        fecha_auto: string | null; cuaderno: string | null;
        fecha_publicacion: string | null; resumen: string; version?: number;
    }[], revisadoALas: string, base = 'https://iurexia.com',
) {
    const n = actuaciones.length;
    const asunto = n === 1
        ? `Movimiento en el ${seg.numero} — ${organo}`
        : `${n} movimientos en el ${seg.numero} — ${organo}`;

    const l: string[] = ['Licenciado:', ''];
    l.push(n === 1
        ? 'Hay una actuación nueva en un expediente que sigue con Iurexia.'
        : `Hay ${n} actuaciones nuevas en un expediente que sigue con Iurexia.`);
    l.push('', `  Expediente     ${seg.numero}`,
        `  Órgano         ${organo}`,
        `  Su referencia  «${seg.alias}»`, '');

    for (const a of actuaciones) {
        let rotulo = `  Acuerdo del ${enLetra(a.fecha_auto)}`;
        if (a.cuaderno) rotulo += ` · ${a.cuaderno}`;
        if ((a.version || 1) > 1) rotulo += ' · CORREGIDO por el juzgado';
        l.push(rotulo);
        if (a.fecha_publicacion) {
            l.push(`  Publicado en estrados el ${enLetra(a.fecha_publicacion)}`);
        }
        l.push('');
        const t = (a.resumen || '').trim();
        for (const trozo of envolver(t.slice(0, 420) + (t.length > 420 ? '...' : ''))) {
            l.push(`   ${trozo}`);
        }
        if ((a.version || 1) > 1) {
            l.push('', '   El juzgado modificó este acuerdo después de publicarlo.');
        }
        l.push('');
    }

    l.push('  → Verlo en Iurexia', `    ${base}/carpetas`, '');
    if (seg.url_fuente) {
        l.push('  → Verlo en el portal oficial', `    ${seg.url_fuente}`, '');
    }
    l.push(`Revisado hoy, ${enLetra(seg.fecha_local)}, a las ${revisadoALas},`,
        'hora de la Ciudad de México.', '',
        '—',
        'Iurexia le escribe sólo cuando hay algo nuevo. Si un día no le escribimos,',
        'es que no hubo actuación; y si no pudimos revisar, también se lo decimos.',
        '', DESCARGO, '');

    return { asunto, cuerpo: l.join('\n') };
}

export function correoNoSePudo(
    seg: SegParaCorreo, organo: string, intentos: string[],
    diasSeguidos: number, urlManual: string,
) {
    const asunto = diasSeguidos >= 2
        ? `No pudimos revisar el ${seg.numero} — segundo día`
        : `Hoy no pudimos revisar el ${seg.numero} (y no sabemos si hubo movimiento)`;

    const l = ['Licenciado:', '',
        `Hoy, ${enLetra(seg.fecha_local)}, no conseguimos consultar este expediente:`,
        '', `  Expediente ${seg.numero} · ${organo}`,
        `  Su referencia «${seg.alias}»`, ''];
    if (intentos.length) {
        l.push(`Lo intentamos ${intentos.length} `
            + (intentos.length === 1 ? 'vez' : 'veces')
            + `: a las ${intentos.join(', a las ')}, hora de la Ciudad de México.`);
    }
    l.push('El portal no respondió como esperábamos.', '',
        'Le escribimos porque nuestro silencio significa siempre «no hubo',
        'movimiento», y hoy no podemos afirmarlo. Puede que no haya pasado',
        'nada; puede que sí.', '',
        '  → Consultarlo usted mismo ahora, con el formulario ya preparado',
        `    ${urlManual}`, '',
        'Mañana a las 9:10 volvemos a intentarlo, y si el portal se recupera',
        'le avisaremos de cualquier actuación que aparezca con fecha de estos',
        'días: no se pierde nada, sólo se retrasa.', '', '—', 'Iurexia');
    return { asunto, cuerpo: l.join('\n') };
}

function htmlDe(t: string) {
    const esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<div style="background:#f6f5f1;padding:28px 16px;font-family:'
        + 'ui-monospace,SFMono-Regular,Menlo,monospace">'
        + '<div style="max-width:640px;margin:0 auto;background:#fffefb;'
        + 'border:1px solid #e2ded4;border-radius:10px;padding:26px 28px">'
        + '<div style="font:600 11px/1 ui-monospace,monospace;letter-spacing:.16em;'
        + 'text-transform:uppercase;color:#9a7526;margin-bottom:18px">'
        + 'Iurexia · Seguimiento de expedientes</div>'
        + `<pre style="margin:0;white-space:pre-wrap;word-wrap:break-word;`
        + `font:13px/1.6 ui-monospace,monospace;color:#17181c">${esc}</pre>`
        + '</div></div>';
}

export async function enviar(destinatario: string, asunto: string, cuerpo: string) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) throw new Error('falta RESEND_API_KEY');
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: REMITENTE, to: [destinatario], subject: asunto,
            text: cuerpo, html: htmlDe(cuerpo), reply_to: RESPONDER_A,
        }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).id as string;
}
