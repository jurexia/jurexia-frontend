import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * El parte diario de las correcciones que hacen los abogados.
 *
 * POR QUÉ EXISTE (23-ago-2026)
 * ----------------------------
 * El 29 de julio, Marie Mejía —litigante laboral en Nuevo León, tres meses de
 * plan Pro— escribió: «estás equivocado, ambas reformas sí existen». Tenía
 * razón: Iurexia había llamado «ficciones jurídicas» a dos reformas que no
 * tenía indexadas. Ella lo verificó, volvió y lo dijo.
 *
 * Nadie lo leyó. El 22 de agosto canceló sin dar motivos.
 *
 * Ésa es la pérdida que este aviso evita. Cuando un litigante se molesta en
 * discutirle a la máquina y explicar por qué, está haciendo gratis la
 * auditoría más cara que existe: alguien que conoce la materia, revisó la
 * fuente y encontró el fallo concreto. Auditar 13.723 mensajes a mano dio 13
 * casos como el suyo. Ninguno había llegado a nadie.
 *
 * QUÉ HACE
 * --------
 * Junta las correcciones sin revisar, las manda en un correo con la respuesta
 * que las provocó, y las marca. No juzga si el abogado tiene razón —eso hay
 * que leerlo— ni intenta arreglar nada solo: sólo se asegura de que lleguen.
 *
 * QUÉ NO HACE
 * -----------
 * No avisa si no hay nada nuevo. Un parte que llega todos los días diciendo
 * «cero» se deja de leer, y entonces el día que trae algo tampoco se lee.
 */

/** Ni una avalancha ilegible ni un goteo. Lo que sobre queda para mañana. */
const MAXIMO_POR_PARTE = 12;

const DESTINO = 'jdm.juridico@gmail.com';
const ASUNTO = 'correcciones-usuario';

type Correccion = {
    id: string;
    creado_at: string;
    user_id: string | null;
    estado: string | null;
    senal: string | null;
    texto: string;
    respuesta_previa: string | null;
};

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

function escapar(s: string) {
    return s.replace(/[&<>"]/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

/**
 * La respuesta previa se guarda tal cual la escribió el modelo, con su
 * markdown. En un correo eso llega como «los artículos **964, 965**» y
 * «### LEGISLACIÓN ESTATAL», que es ruido justo encima de lo único que hay
 * que leer con atención. Se quitan las marcas y se deja el texto.
 */
function sinMarcas(s: string) {
    return s
        .replace(/^#{1,6}\s*/gm, '')      // ### encabezados
        .replace(/^\s*[-*_]{3,}\s*$/gm, '')  // --- separadores
        .replace(/\*\*(.+?)\*\*/g, '$1')   // **negritas**
        .replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1')  // *cursivas*
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function revisarCorrecciones(): Promise<string> {
    const sb = admin();

    const { data, error } = await sb
        .from('correcciones_usuario')
        .select('id, creado_at, user_id, estado, senal, texto, respuesta_previa')
        .eq('revisado', false)
        .order('creado_at', { ascending: true })
        .limit(MAXIMO_POR_PARTE);

    if (error) return `correcciones: no pude leerlas (${error.message})`;

    const nuevas = (data || []) as Correccion[];
    if (nuevas.length === 0) return 'correcciones: ninguna sin revisar';

    // Cuántas quedan detrás, para saber si el parte va con retraso.
    const { count: pendientes } = await sb
        .from('correcciones_usuario')
        .select('id', { count: 'exact', head: true })
        .eq('revisado', false);

    // El correo y el plan no se guardan al anotar la corrección —eso metería
    // una consulta más dentro de la ruta del chat—, así que se resuelven aquí,
    // que es una vez al día.
    const ids = Array.from(new Set(nuevas.map(c => c.user_id).filter(Boolean))) as string[];
    const quien = new Map<string, { email: string; plan: string; numero: number | null }>();
    if (ids.length) {
        const { data: perfiles } = await sb
            .from('user_profiles')
            .select('id, email, subscription_type, numero_usuario')
            .in('id', ids);
        for (const p of perfiles || []) {
            quien.set(p.id, {
                email: p.email || '—',
                plan: p.subscription_type || 'free',
                numero: p.numero_usuario ?? null,
            });
        }
    }

    const claveCorreo = process.env.RESEND_API_KEY;
    if (!claveCorreo) return `correcciones: ${nuevas.length} sin revisar pero falta RESEND_API_KEY`;

    const fichas = nuevas.map(c => {
        const p = c.user_id ? quien.get(c.user_id) : undefined;
        const cuando = new Date(c.creado_at).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Mexico_City',
        });
        const limpia = sinMarcas(c.respuesta_previa || '');
        const previa = limpia.slice(0, 700);
        return `
  <div style="border-left:3px solid #b08d3f;padding:2px 0 2px 16px;margin:0 0 26px">
    <p style="margin:0 0 4px;font-size:12px;color:#8a8578;letter-spacing:1px">
      ${escapar(cuando)} · ${escapar(p?.email || 'sin identificar')}
      · <b style="color:#141312">${escapar((p?.plan || 'free').toUpperCase())}</b>
      ${p?.numero ? ` · usuario ${p.numero}` : ''}${c.estado ? ` · ${escapar(c.estado)}` : ''}
    </p>
    <p style="margin:0 0 12px;font-size:16px"><b>«${escapar(c.texto.slice(0, 400))}»</b></p>
    ${previa ? `<p style="margin:0 0 4px;font-size:11.5px;color:#8a8578;letter-spacing:2px">LO QUE ESTABA CORRIGIENDO</p>
    <div style="background:#f7f5f0;padding:12px 14px;font-size:13.5px;line-height:1.6;color:#4a463f">
      ${escapar(previa)}${limpia.length > 700 ? '…' : ''}
    </div>` : '<p style="margin:0;font-size:13px;color:#8a8578">(sin respuesta previa capturada)</p>'}
  </div>`;
    }).join('');

    const atrasadas = (pendientes || 0) - nuevas.length;
    const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:660px;margin:0 auto;
        color:#141312;font-size:15px;line-height:1.7">
  <p style="margin:0 0 6px;color:#8a8578;font-size:11.5px;letter-spacing:4px">CORRECCIONES DE ABOGADOS</p>
  <p style="margin:0 0 8px;font-size:21px"><b>${nuevas.length} ${nuevas.length === 1
        ? 'abogado le discutió una respuesta' : 'abogados le discutieron una respuesta'}</b></p>
  <p style="margin:0 0 26px;font-size:14px;color:#4a463f">Cada una es una revisión hecha por alguien que
  conoce la materia y fue a comprobar la fuente. Vale la pena leerlas enteras.</p>
  ${fichas}
  <p style="margin:0 0 10px;font-size:13.5px;color:#4a463f"><b>Qué hacer con esto:</b> si el abogado tiene
  razón, casi siempre el fallo es uno de dos — la norma no está en el acervo, o se citó un artículo de otra
  ley con el mismo número. Lo primero se ingiere; lo segundo ya lo vigila el sello de correspondencia.</p>
  <p style="margin:0;font-size:12.5px;color:#8a8578">
    ${atrasadas > 0 ? `Quedan ${atrasadas} sin revisar para el siguiente parte. ` : ''}
    Estas ${nuevas.length} quedan marcadas como revisadas.
    Para volver a verlas: <code>select * from correcciones_usuario order by creado_at desc</code>
  </p>
</div>`;

    try {
        await new Resend(claveCorreo).emails.send({
            from: 'Iurexia <soporte@iurexia.com>',
            to: [DESTINO],
            subject: `${nuevas.length} corrección${nuevas.length === 1 ? '' : 'es'} de abogados${atrasadas > 0 ? ` (+${atrasadas} en cola)` : ''}`,
            html,
        });
    } catch (e) {
        // Sin marcar: si el correo no salió, estas correcciones tienen que
        // volver a intentarlo mañana en lugar de perderse.
        return `correcciones: no se pudo enviar el parte (${e instanceof Error ? e.message : e})`;
    }

    await sb.from('correcciones_usuario')
        .update({ revisado: true })
        .in('id', nuevas.map(c => c.id));

    await sb.from('avisos_infraestructura').insert({
        asunto: ASUNTO,
        detalle: { enviadas: nuevas.length, en_cola: atrasadas },
    });

    return `correcciones: parte enviado con ${nuevas.length}${atrasadas > 0 ? ` (+${atrasadas} en cola)` : ''}`;
}
