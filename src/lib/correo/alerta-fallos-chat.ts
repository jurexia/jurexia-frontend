import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * Vigila que el chat esté respondiendo.
 *
 * POR QUÉ EXISTE (3-sep-2026)
 * ---------------------------
 * Ese día, 45 consultas de 14 abogados —cinco de ellos Platinum— se quedaron
 * sin respuesta. Nos enteramos porque una de ellas lo reportó, después de
 * haberlo intentado siete veces. El dato estaba en la base desde la primera
 * hora y nadie lo estaba mirando.
 *
 * Los avisos que ya existen vigilan el dinero y la infraestructura: el saldo
 * del motor de voz, el almacenamiento, los cobros. Ninguno vigilaba lo único
 * por lo que el abogado paga, que es que la consulta vuelva contestada.
 *
 * LOS TRES DISPAROS
 * -----------------
 * Se miran tres cosas distintas porque una caída se presenta de tres formas:
 *
 *   · VOLUMEN — muchos fallos en una hora. La caída general.
 *   · PERSONA — un mismo abogado que falla tres veces. No sale en el volumen
 *     si la plataforma va bien, y es justo la forma que tuvo el caso del
 *     3-sep: una sola persona reintentando contra un fallo que sólo la tocaba
 *     a ella. Es el disparo que más importa, porque es el que no se ve.
 *   · PROPORCIÓN — pocos fallos pero sobre poquísimas consultas. De madrugada
 *     hay tan poco tráfico que tres fallos de cinco consultas es una caída, y
 *     por volumen no saltaría.
 *
 * Calibrado contra los cuatro días anteriores al incidente: de 88 ventanas de
 * una hora, dispara en las 3 del incidente y calla en las 13 que tenían uno o
 * dos fallos sueltos. Un aviso que salta por un fallo aislado se acaba
 * ignorando, y entonces no avisa de nada.
 *
 * EL PUNTO CIEGO, DICHO PARA QUE NO SORPRENDA
 * -------------------------------------------
 * Contar fallos no ve la caída total: si la API se muere del todo no se
 * escribe ningún mensaje, y una alarma que cuenta fallos vería cero y se
 * quedaría callada. Por eso hay una segunda comprobación —`revisarSilencio`—
 * que mira lo contrario: que no haya dejado de haber respuestas.
 */

/** La ventana que se mira. Una hora es bastante para que se note un patrón. */
const MINUTOS = 60;

/** El texto con el que el backend cierra una consulta que no salió. */
const MARCA_DE_FALLO = 'No pudimos completar esta consulta';

const DISPARO_VOLUMEN = 5;
const DISPARO_POR_PERSONA = 3;
const DISPARO_PROPORCION = 0.20;
const MINIMO_PARA_PROPORCION = 3;

/** El aviso no se repite antes de esto. Una caída larga avisa cada 2 h. */
const HORAS_ENTRE_AVISOS = 2;

const DESTINO = 'jdm.juridico@gmail.com';
const ASUNTO = 'fallos-chat';
const ASUNTO_SILENCIO = 'silencio-chat';

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
}

type Sb = ReturnType<typeof admin>;

/** ¿Se avisó de esto hace poco? El aviso repetido se vuelve ruido. */
async function seAvisoHacePoco(sb: Sb, asunto: string, horas: number) {
    const desde = new Date(Date.now() - horas * 3600_000).toISOString();
    const { data } = await sb
        .from('avisos_infraestructura')
        .select('id').eq('asunto', asunto).gte('enviado_at', desde).limit(1);
    return (data?.length ?? 0) > 0;
}

async function mandar(sb: Sb, asunto: string, subject: string, html: string, detalle: object) {
    const clave = process.env.RESEND_API_KEY;
    if (!clave) return false;
    await new Resend(clave).emails.send({
        from: 'Iurexia <soporte@iurexia.com>',
        to: [DESTINO],
        subject,
        html,
    });
    await sb.from('avisos_infraestructura').insert({ asunto, detalle });
    return true;
}

const CAJA = `font-family:Georgia,'Times New Roman',serif;max-width:620px;margin:0 auto;` +
    `color:#141312;font-size:15px;line-height:1.7`;

export async function revisarFallosDeChat(): Promise<string> {
    const sb = admin();
    const desde = new Date(Date.now() - MINUTOS * 60_000).toISOString();

    // El contenido NO se trae: un mensaje del asistente puede pesar cientos de
    // miles de caracteres y aquí sólo hace falta saber cuáles fallaron. El
    // filtro va en el servidor y de vuelta vienen tres columnas.
    const { data: fallidos, error: eF } = await sb
        .from('messages')
        .select('id, conversation_id, created_at')
        .eq('role', 'assistant')
        .gte('created_at', desde)
        .like('content', `%${MARCA_DE_FALLO}%`);
    if (eF) return `fallos-chat: no pude leer los mensajes (${eF.message})`;

    const { count: total, error: eT } = await sb
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'assistant')
        .gte('created_at', desde);
    if (eT) return `fallos-chat: no pude contar el total (${eT.message})`;

    const fallos = fallidos?.length ?? 0;
    const consultas = total ?? 0;
    const resumen = `${fallos} de ${consultas} en ${MINUTOS} min`;
    if (fallos === 0) return `fallos-chat: bien — 0 de ${consultas} en ${MINUTOS} min`;

    // De la conversación sale a quién le pasó. Sin esto un aviso dice «hubo
    // seis fallos» y no dice si fueron seis personas o una sola seis veces,
    // que es una diferencia de diagnóstico entera.
    const ids = Array.from(new Set(fallidos!.map(f => f.conversation_id)));
    const { data: convs } = await sb
        .from('conversations').select('id, user_id').in('id', ids);
    const duenio = new Map((convs ?? []).map(c => [c.id, c.user_id as string]));

    const porAbogado = new Map<string, number>();
    for (const f of fallidos!) {
        const u = duenio.get(f.conversation_id);
        if (u) porAbogado.set(u, (porAbogado.get(u) ?? 0) + 1);
    }

    const peorRacha = Math.max(0, ...Array.from(porAbogado.values()));
    const proporcion = consultas > 0 ? fallos / consultas : 0;

    const motivos: string[] = [];
    if (fallos >= DISPARO_VOLUMEN) motivos.push(`${fallos} fallos en la última hora`);
    if (peorRacha >= DISPARO_POR_PERSONA) motivos.push(`un mismo abogado falló ${peorRacha} veces`);
    if (fallos >= MINIMO_PARA_PROPORCION && proporcion >= DISPARO_PROPORCION) {
        motivos.push(`${Math.round(proporcion * 100)}% de las consultas fallaron`);
    }
    if (motivos.length === 0) {
        return `fallos-chat: ${resumen} — por debajo de umbral, ${porAbogado.size} abogado(s)`;
    }

    if (await seAvisoHacePoco(sb, ASUNTO, HORAS_ENTRE_AVISOS)) {
        return `fallos-chat: DISPARADO (${resumen}) pero ya se avisó hace menos de ${HORAS_ENTRE_AVISOS} h`;
    }

    const { data: perfiles } = await sb
        .from('user_profiles').select('id, email, subscription_type, queries_used, queries_limit')
        .in('id', Array.from(porAbogado.keys()));
    const quien = new Map((perfiles ?? []).map(p => [p.id, p]));

    const filas = Array.from(porAbogado.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => {
            const p = quien.get(id);
            const plan = (p?.subscription_type ?? '—').replace('_monthly', '').replace('_annual', ' anual');
            const dePago = plan.startsWith('platinum') || plan.startsWith('pro');
            return `<tr>` +
                `<td style="padding:5px 14px 5px 0;color:#8a8578">${p?.email ?? id.slice(0, 8)}</td>` +
                `<td style="padding:5px 14px 5px 0;${dePago ? 'color:#8a6d2f;font-weight:bold' : 'color:#8a8578'}">${plan}</td>` +
                `<td style="padding:5px 0"><b>${n}</b> ${n === 1 ? 'fallo' : 'fallos'}</td></tr>`;
        }).join('');

    const html = `<div style="${CAJA}">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">AVISO DE SERVICIO</p>
  <p style="margin:0 0 6px;font-size:21px"><b>El chat está devolviendo errores</b></p>
  <p style="margin:0 0 20px;color:#8a8578;font-size:14px">${motivos.join(' · ')}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin:0 0 22px">
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Consultas sin respuesta</td>
        <td style="padding:5px 0"><b>${fallos}</b> de ${consultas} en los últimos ${MINUTOS} min</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Abogados afectados</td>
        <td style="padding:5px 0">${porAbogado.size}</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Peor racha</td>
        <td style="padding:5px 0">${peorRacha} ${peorRacha === 1 ? 'fallo' : 'fallos'} de una misma persona</td></tr>
  </table>
  <p style="margin:0 0 8px;font-size:11.5px;color:#8a8578;letter-spacing:2px">A QUIÉN LE ESTÁ PASANDO</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 22px">${filas}</table>
  <p style="margin:0 0 18px"><b>Dónde mirar:</b> los registros de Render, línea
  <code>Fallo del stream</code>: ahí va la excepción real, que es lo único que dice si es
  tamaño de petición, rechazo del modelo o caída del proveedor. La consulta se le devuelve
  al abogado automáticamente, así que esto no es un problema de cobro.</p>
  <p style="margin:0;font-size:13px;color:#8a8578">Este aviso no se repetirá en ${HORAS_ENTRE_AVISOS} h.
  Umbrales: ${DISPARO_VOLUMEN} fallos en la ventana, o ${DISPARO_POR_PERSONA} de una misma persona,
  o ${Math.round(DISPARO_PROPORCION * 100)}% de las consultas.</p>
</div>`;

    try {
        const ok = await mandar(sb, ASUNTO,
            `${fallos} consultas sin respuesta en la última hora`, html,
            { fallos, consultas, abogados: porAbogado.size, peor_racha: peorRacha, motivos });
        return ok ? `fallos-chat: AVISO ENVIADO — ${resumen}`
                  : `fallos-chat: DISPARADO (${resumen}) pero falta RESEND_API_KEY`;
    } catch (e) {
        return `fallos-chat: no se pudo enviar (${e instanceof Error ? e.message : e})`;
    }
}

/**
 * El tercer vigía: cuántas veces la plataforma tuvo que recuperarse sola.
 *
 * POR QUÉ HACE FALTA (4-sep-2026)
 * -------------------------------
 * El mismo día que se arregló el rechazo de caché se abrió un punto ciego, y
 * lo abrió el arreglo. Cuando Google rechaza la petición con corpus cacheado,
 * el servidor repite por otro camino y responde: la consulta sale, no se
 * escribe ningún error, y `revisarFallosDeChat` —que cuenta consultas SIN
 * respuesta— ve cero. Mientras tanto el genio contesta sin sus leyes
 * precargadas. Una avería ruidosa se había convertido en una degradación
 * silenciosa, que es la clase de avería que dura meses.
 *
 * Así que se mide lo que ya no se ve: cada recuperación deja una fila en
 * `incidencias_modelo`, y aquí se cuenta.
 *
 * Los dos disparos son los mismos que arriba y por la misma razón: el volumen
 * ve la rotura general, y la persona ve al abogado concreto que está
 * recibiendo respuestas peores sin que nadie lo note. Del 2 al 4 de septiembre
 * hubo 15 rechazos en total, así que ocho en una hora es claramente otra cosa.
 */
const DISPARO_CACHES = 8;
const DISPARO_CACHES_POR_PERSONA = 3;
const HORAS_ENTRE_AVISOS_CACHE = 3;
const ASUNTO_CACHE = 'caches-rechazadas';

export async function revisarCachesRechazadas(): Promise<string> {
    const sb = admin();
    const desde = new Date(Date.now() - MINUTOS * 60_000).toISOString();

    const { data, error } = await sb
        .from('incidencias_modelo')
        .select('genio, user_id, detalle')
        .eq('tipo', 'cache_rechazada')
        .gte('ocurrido_at', desde);
    if (error) return `caches-rechazadas: no pude leer las incidencias (${error.message})`;

    const filas = data ?? [];
    if (filas.length === 0) return 'caches-rechazadas: bien — 0 recuperaciones en la última hora';

    const porAbogado = new Map<string, number>();
    const porGenio = new Map<string, number>();
    for (const f of filas) {
        if (f.user_id) porAbogado.set(f.user_id, (porAbogado.get(f.user_id) ?? 0) + 1);
        const g = (f.genio as string | null) ?? '—';
        porGenio.set(g, (porGenio.get(g) ?? 0) + 1);
    }
    const peorRacha = Math.max(0, ...Array.from(porAbogado.values()));
    const resumen = `${filas.length} recuperaciones · ${porAbogado.size} abogado(s)`;

    const motivos: string[] = [];
    if (filas.length >= DISPARO_CACHES) motivos.push(`${filas.length} recuperaciones en una hora`);
    if (peorRacha >= DISPARO_CACHES_POR_PERSONA) {
        motivos.push(`un mismo abogado se recuperó ${peorRacha} veces`);
    }
    if (motivos.length === 0) return `caches-rechazadas: ${resumen} — por debajo de umbral`;

    if (await seAvisoHacePoco(sb, ASUNTO_CACHE, HORAS_ENTRE_AVISOS_CACHE)) {
        return `caches-rechazadas: DISPARADO (${resumen}) pero ya se avisó hace menos de ${HORAS_ENTRE_AVISOS_CACHE} h`;
    }

    const { data: perfiles } = await sb
        .from('user_profiles').select('id, email, subscription_type')
        .in('id', Array.from(porAbogado.keys()));
    const quien = new Map((perfiles ?? []).map(p => [p.id, p]));

    const filasGenio = Array.from(porGenio.entries()).sort((a, b) => b[1] - a[1])
        .map(([g, n]) => `<tr><td style="padding:4px 14px 4px 0;color:#8a8578">${g}</td>` +
            `<td style="padding:4px 0"><b>${n}</b></td></tr>`).join('');

    const filasAbogado = Array.from(porAbogado.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([id, n]) => {
            const p = quien.get(id);
            const plan = (p?.subscription_type ?? '—').replace('_monthly', '').replace('_annual', ' anual');
            return `<tr><td style="padding:4px 14px 4px 0;color:#8a8578">${p?.email ?? id.slice(0, 8)}</td>` +
                `<td style="padding:4px 14px 4px 0;color:#8a6d2f">${plan}</td>` +
                `<td style="padding:4px 0"><b>${n}</b></td></tr>`;
        }).join('');

    const html = `<div style="${CAJA}">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">AVISO DE SERVICIO</p>
  <p style="margin:0 0 6px;font-size:21px"><b>Las cachés de los genios están siendo rechazadas</b></p>
  <p style="margin:0 0 20px;color:#8a8578;font-size:14px">${motivos.join(' · ')}</p>
  <p style="margin:0 0 18px">Nadie se ha quedado sin respuesta: el servidor repite por otro camino y
  contesta. Pero <b>contesta sin el corpus precargado</b>, con lo recuperado y su propio conocimiento.
  Es una respuesta peor, y sin este aviso no se vería en ninguna parte.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin:0 0 22px">
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Recuperaciones</td>
        <td style="padding:5px 0"><b>${filas.length}</b> en los últimos ${MINUTOS} min</td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Peor racha</td>
        <td style="padding:5px 0">${peorRacha} de una misma persona</td></tr>
  </table>
  <p style="margin:0 0 8px;font-size:11.5px;color:#8a8578;letter-spacing:2px">POR GENIO</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 18px">${filasGenio}</table>
  <p style="margin:0 0 8px;font-size:11.5px;color:#8a8578;letter-spacing:2px">A QUIÉN LE ESTÁ PASANDO</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 22px">${filasAbogado}</table>
  <p style="margin:0 0 18px"><b>Dónde mirar:</b> los registros de Render, línea
  <code>Se repite sin caché</code>. Si el rechazo es de todos los genios a la vez, mira si las
  cachés de Vertex siguen vivas; si es de uno solo, mira esa caché.</p>
  <p style="margin:0;font-size:13px;color:#8a8578">Este aviso no se repetirá en ${HORAS_ENTRE_AVISOS_CACHE} h.
  Umbrales: ${DISPARO_CACHES} recuperaciones en la ventana, o ${DISPARO_CACHES_POR_PERSONA} de una misma persona.</p>
</div>`;

    try {
        const ok = await mandar(sb, ASUNTO_CACHE,
            `${filas.length} cachés rechazadas en la última hora`, html,
            { recuperaciones: filas.length, abogados: porAbogado.size, peor_racha: peorRacha, motivos });
        return ok ? `caches-rechazadas: AVISO ENVIADO — ${resumen}`
                  : `caches-rechazadas: DISPARADO (${resumen}) pero falta RESEND_API_KEY`;
    } catch (e) {
        return `caches-rechazadas: no se pudo enviar (${e instanceof Error ? e.message : e})`;
    }
}

/**
 * El otro lado del punto ciego: que no haya dejado de haber respuestas.
 *
 * Contar fallos no ve la caída total —sin API no se escribe ningún mensaje y
 * el contador de fallos se queda en cero, tan tranquilo—. Aquí se compara la
 * actividad de las últimas horas contra la MISMA franja de los tres días
 * anteriores, que es la única forma de distinguir «se cayó» de «son las
 * cuatro de la mañana de un domingo».
 *
 * Con tres días de referencia y un mínimo de actividad para siquiera opinar,
 * un festivo o un puente no lo disparan: si esos tres días tampoco tuvieron
 * tráfico en esa franja, no hay nada con qué comparar y se calla.
 */
const HORAS_SILENCIO = 3;
const MINIMO_HISTORICO = 4;
const HORAS_ENTRE_AVISOS_SILENCIO = 6;

export async function revisarSilencioDeChat(): Promise<string> {
    const sb = admin();
    const ahora = Date.now();
    const ventana = HORAS_SILENCIO * 3600_000;

    const contar = async (finHaceMs: number) => {
        const fin = new Date(ahora - finHaceMs).toISOString();
        const ini = new Date(ahora - finHaceMs - ventana).toISOString();
        const { count } = await sb
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'assistant').gte('created_at', ini).lt('created_at', fin);
        return count ?? 0;
    };

    const ahoraN = await contar(0);
    if (ahoraN > 0) return `silencio-chat: bien — ${ahoraN} respuestas en ${HORAS_SILENCIO} h`;

    const dia = 24 * 3600_000;
    const previos = [await contar(dia), await contar(2 * dia), await contar(3 * dia)];
    const media = previos.reduce((s, n) => s + n, 0) / previos.length;

    if (media < MINIMO_HISTORICO) {
        return `silencio-chat: 0 respuestas, pero esta franja suele estar vacía (media ${media.toFixed(1)})`;
    }
    if (await seAvisoHacePoco(sb, ASUNTO_SILENCIO, HORAS_ENTRE_AVISOS_SILENCIO)) {
        return `silencio-chat: DISPARADO pero ya se avisó hace menos de ${HORAS_ENTRE_AVISOS_SILENCIO} h`;
    }

    const html = `<div style="${CAJA}">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">AVISO DE SERVICIO</p>
  <p style="margin:0 0 20px;font-size:21px"><b>El chat lleva ${HORAS_SILENCIO} horas sin responder a nadie</b></p>
  <table style="width:100%;border-collapse:collapse;font-size:14.5px;margin:0 0 22px">
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Respuestas ahora</td>
        <td style="padding:5px 0"><b>0</b></td></tr>
    <tr><td style="padding:5px 14px 5px 0;color:#8a8578">Misma franja, 3 días antes</td>
        <td style="padding:5px 0">${previos.join(' · ')} (media ${media.toFixed(1)})</td></tr>
  </table>
  <p style="margin:0 0 18px">Cero respuestas donde suele haber ${media.toFixed(0)}. Puede ser la API
  caída, el despliegue roto o el proveedor del modelo fuera. <b>Dónde mirar:</b> el estado del
  servicio en Render y su último despliegue.</p>
  <p style="margin:0;font-size:13px;color:#8a8578">Este aviso no se repetirá en ${HORAS_ENTRE_AVISOS_SILENCIO} h.</p>
</div>`;

    try {
        const ok = await mandar(sb, ASUNTO_SILENCIO,
            `El chat lleva ${HORAS_SILENCIO} horas sin responder`, html,
            { ventana_horas: HORAS_SILENCIO, previos, media });
        return ok ? 'silencio-chat: AVISO ENVIADO' : 'silencio-chat: DISPARADO pero falta RESEND_API_KEY';
    } catch (e) {
        return `silencio-chat: no se pudo enviar (${e instanceof Error ? e.message : e})`;
    }
}
