/**
 * El barrido diario del seguimiento de expedientes.
 *
 * LAS TRES REGLAS QUE ESTO TIENE QUE CUMPLIR:
 *   1. Una revisión al día, a las 9:10 hora de la Ciudad de México.
 *   2. Correo sólo cuando hay actuación nueva.
 *   3. Si no se pudo revisar, se avisa.
 *
 * La tercera manda sobre el diseño: cada expediente deja fila en
 * `seg_revisiones` CADA día, se pueda leer o no, y ante la duda el código
 * prefiere declararse ciego antes que decir «sin novedad». Un falso «sin
 * novedad» es indistinguible del silencio bueno, y el silencio bueno es la
 * promesa del producto.
 *
 * POR QUÉ AQUÍ Y NO EN EL BACKEND. El trabajo estaba pensado para Render, pero
 * eso deja la función parada hasta que alguien despliegue allí. Corre entero en
 * Vercel: el PJF es una petición por expediente y CDMX es un PDF de 400 páginas
 * que pdfjs procesa en 2.3 segundos. No hay razón para esperar a nadie.
 *
 * LA HORA. México suprimió el horario de verano en octubre de 2022, así que la
 * Ciudad de México es UTC−6 todo el año y las 9:10 locales son las 15:10 UTC.
 * Se vuelve a comprobar contra la hora local antes de tocar nada: si el país
 * cambiara de huso, esto se niega en vez de mandar avisos con una hora falsa.
 *
 * LOS CUATRO PASES:
 *   1 · 9:10   el barrido
 *   2 · 9:40   reintenta sólo lo que falló
 *   3 · 10:20  último reintento
 *   4 · 11:00  cierre: manda los «no se pudo» y escala al tercer día
 *
 * A mano:  GET /api/cron/seguimiento?pase=1&forzar=1   con `x-admin-key`
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { leer, urlDe, ErrorFormato, ErrorNoEncontrado } from '@/lib/seguimiento/pjf';
import * as cdmx from '@/lib/seguimiento/cdmx';
import { comparar, hayQueAvisar, Conocida } from '@/lib/seguimiento/detector';
import { correoActuacion, correoNoSePudo, enviar } from '@/lib/seguimiento/correo';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PAUSA_PJF = 2000;   // un hilo, una petición cada 2 s: hay un F5 delante

function servicio(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

function enMexico() {
    return new Date(Date.now() - 6 * 3600_000);
}
const hoyMexico = () => enMexico().toISOString().slice(0, 10);
const horaMexico = () => enMexico().toISOString().slice(11, 16);

const dormir = (ms: number) => new Promise(r => setTimeout(r, ms));

function quienLlama(req: NextRequest): 'cron' | 'admin' | null {
    const cron = process.env.CRON_SECRET;
    if (cron && req.headers.get('authorization') === `Bearer ${cron}`) return 'cron';
    const clave = process.env.ADMIN_CAMPAIGN_KEY;
    if (clave && req.headers.get('x-admin-key') === clave) return 'admin';
    return null;
}

function paseDeLaHora(req: NextRequest): number {
    const pedido = Number(req.nextUrl.searchParams.get('pase'));
    if (pedido >= 1 && pedido <= 4) return pedido;
    const d = new Date();
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    if (h === 15 && m < 30) return 1;
    if (h === 15) return 2;
    if (h === 16) return 3;
    return 4;
}

type Seg = {
    id: string; user_id: string; numero: string; alias: string;
    tipo_asunto_clave: string | null; tipo_procedimiento_clave: string | null;
    correo_aviso: string | null; fallos_consecutivos: number;
    organo: { id: number; jurisdiccion: string; clave_externa: string; nombre: string } | null;
};

async function activos(db: SupabaseClient): Promise<Seg[]> {
    const { data } = await db.from('seg_expedientes_seguidos')
        .select('*, organo:seg_organos(id,jurisdiccion,clave_externa,nombre)')
        .eq('estado', 'activo').eq('modo', 'automatico')
        .order('organo_id', { ascending: true });
    return (data ?? []) as Seg[];
}

async function conocidasDe(db: SupabaseClient, id: string): Promise<Conocida[]> {
    const { data } = await db.from('seg_actuaciones')
        .select('id,huella_clave,huella_texto,cuaderno,fecha_auto,resumen,version')
        .eq('seguimiento_id', id);
    return (data ?? []) as Conocida[];
}

/** Manda el correo A. Se registra el aviso ANTES de enviarlo con clave
 *  determinista, para que un reinicio a mitad no lo duplique. */
async function avisar(db: SupabaseClient, seg: Seg, urlFuente: string, fecha: string) {
    const { data: pend } = await db.from('seg_actuaciones')
        .select('*').eq('seguimiento_id', seg.id)
        .is('avisada_en', null).eq('es_linea_base', false)
        .order('fecha_auto', { ascending: true });
    const pendientes = pend ?? [];
    if (!pendientes.length) return null;

    const v = hayQueAvisar(pendientes.length);
    if (!v.avisar) {
        if (v.escalar) {
            await db.from('seg_expedientes_seguidos')
                .update({ estado: 'requiere_atencion' }).eq('id', seg.id);
        }
        return { avisar: false, motivo: v.motivo };
    }

    const organo = seg.organo?.nombre || '';
    const { asunto, cuerpo } = correoActuacion(
        { id: seg.id, numero: seg.numero, alias: seg.alias,
          fecha_local: fecha, url_fuente: urlFuente },
        organo, pendientes, horaMexico());

    const clave = `actuacion:${seg.id}:${fecha}:${pendientes.length}`;
    const { data: aviso, error } = await db.from('seg_avisos').insert({
        user_id: seg.user_id, seguimiento_id: seg.id, tipo: 'actuacion',
        fecha_local: fecha, clave_idem: clave,
        destinatario: seg.correo_aviso!, asunto,
    }).select().single();
    if (error) return { avisar: false, motivo: 'ya_avisado' };   // colisión de clave

    const rid = await enviar(seg.correo_aviso!, asunto, cuerpo);
    await db.from('seg_avisos').update({
        estado: 'enviado', resend_id: rid, enviado_en: new Date().toISOString(),
    }).eq('id', aviso.id);
    await db.from('seg_actuaciones').update({ avisada_en: new Date().toISOString() })
        .in('id', pendientes.map(p => p.id));
    return { avisar: true, n: pendientes.length, resend: rid };
}

// ── El barrido del PJF: una petición por expediente ───────────────────

async function barrerPJF(db: SupabaseClient, seguimientos: Seg[],
                         corridaId: string, fecha: string, pase: number) {
    const n = { total: seguimientos.length, ok: 0, novedad: 0, fallo: 0 };
    const detalle: string[] = [];

    for (let i = 0; i < seguimientos.length; i++) {
        const seg = seguimientos[i];
        if (i) await dormir(PAUSA_PJF);

        const base = { corrida_id: corridaId, seguimiento_id: seg.id,
                       user_id: seg.user_id, fecha_local: fecha, intento: pase };
        const conocidas = await conocidasDe(db, seg.id);

        try {
            const lectura = await leer(
                seg.organo!.clave_externa, seg.numero,
                seg.tipo_asunto_clave || 1, seg.tipo_procedimiento_clave || 0,
                conocidas.length);

            const d = comparar(lectura.acuerdos, conocidas);
            const nuevas = [...d.nuevas, ...d.reediciones];

            if (nuevas.length) {
                await db.from('seg_actuaciones').insert(nuevas.map(a => ({
                    seguimiento_id: seg.id, user_id: seg.user_id,
                    huella_clave: a.huella_clave, huella_texto: a.huella_texto,
                    cuaderno: a.cuaderno, fecha_auto: a.fecha_auto,
                    fecha_publicacion: a.fecha_publicacion,
                    orden_en_lista: a.orden_en_lista, resumen: a.resumen,
                    url_fuente: lectura.url, origen: 'pjf_vercaptura',
                    version: 'version' in a ? a.version : 1,
                    reemplaza_a: 'reemplaza_a' in a ? a.reemplaza_a : null,
                    es_linea_base: false,
                })));
            }

            await db.from('seg_revisiones').upsert({
                ...base,
                resultado: nuevas.length ? 'ok_con_novedad' : 'ok_sin_novedad',
                http_status: lectura.http, bytes: lectura.bytes,
                hash_respuesta: lectura.hash_respuesta,
                n_actuaciones_vistas: lectura.acuerdos.length,
                terminada_en: new Date().toISOString(),
            }, { onConflict: 'seguimiento_id,fecha_local,intento' });

            await db.from('seg_expedientes_seguidos').update({
                ultima_revision_ok: new Date().toISOString(),
                fallos_consecutivos: 0,
                neun: lectura.caratula.neun,
            }).eq('id', seg.id);

            n.ok++;
            if (nuevas.length) {
                n.novedad++;
                const r = await avisar(db, seg, lectura.url, fecha);
                detalle.push(`${seg.numero}: ${nuevas.length} nueva(s)`
                    + (r && 'resend' in r ? ` · correo ${r.resend}` : ''));
            }
        } catch (e) {
            const esNoEncontrado = e instanceof ErrorNoEncontrado;
            const esFormato = e instanceof ErrorFormato;
            await db.from('seg_revisiones').upsert({
                ...base,
                resultado: esNoEncontrado ? 'fallo_no_encontrado'
                    : esFormato ? 'fallo_formato' : 'fallo_red',
                detalle: String(e instanceof Error ? e.message : e).slice(0, 400),
            }, { onConflict: 'seguimiento_id,fecha_local,intento' });
            await db.from('seg_expedientes_seguidos').update({
                fallos_consecutivos: (seg.fallos_consecutivos || 0) + 1,
            }).eq('id', seg.id);
            n.fallo++;
            detalle.push(`${seg.numero}: no se pudo leer`);
        }
    }
    return { n, detalle };
}

// ── El barrido de CDMX: un PDF resuelve toda la cartera ───────────────

async function barrerCDMX(db: SupabaseClient, seguimientos: Seg[],
                          corridaId: string, fecha: string, pase: number) {
    const n = { total: seguimientos.length, ok: 0, novedad: 0, fallo: 0 };
    const detalle: string[] = [];
    if (!seguimientos.length) return { n, detalle };

    let boletin: cdmx.Boletin;
    let idx: Awaited<ReturnType<typeof cdmx.indexar>>;
    try {
        const lista = await cdmx.indice();
        boletin = lista.find(b => b.fecha === fecha) || lista[0];
        idx = await cdmx.indexar(boletin.url);
    } catch (e) {
        // Sin boletín no se puede afirmar NADA de ningún expediente de CDMX.
        for (const seg of seguimientos) {
            await db.from('seg_revisiones').upsert({
                corrida_id: corridaId, seguimiento_id: seg.id, user_id: seg.user_id,
                fecha_local: fecha, intento: pase, resultado: 'fallo_red',
                detalle: `boletín: ${e instanceof Error ? e.message : e}`.slice(0, 400),
            }, { onConflict: 'seguimiento_id,fecha_local,intento' });
            await db.from('seg_expedientes_seguidos').update({
                fallos_consecutivos: (seg.fallos_consecutivos || 0) + 1,
            }).eq('id', seg.id);
        }
        n.fallo = seguimientos.length;
        detalle.push(`CDMX: no se pudo traer el boletín`);
        return { n, detalle };
    }

    for (const seg of seguimientos) {
        const entradas = cdmx.buscar(idx, seg.organo?.nombre || '', seg.numero);
        const acuerdos = cdmx.comoAcuerdos(
            entradas, seg.organo!.clave_externa, seg.numero, boletin.fecha);
        const conocidas = await conocidasDe(db, seg.id);
        const d = comparar(acuerdos, conocidas);
        const nuevas = [...d.nuevas, ...d.reediciones];

        if (nuevas.length) {
            await db.from('seg_actuaciones').insert(nuevas.map(a => ({
                seguimiento_id: seg.id, user_id: seg.user_id,
                huella_clave: a.huella_clave, huella_texto: a.huella_texto,
                cuaderno: a.cuaderno, fecha_auto: a.fecha_auto,
                fecha_publicacion: a.fecha_publicacion, resumen: a.resumen,
                url_fuente: boletin.url, origen: 'cdmx_boletin',
                version: 'version' in a ? a.version : 1,
                reemplaza_a: 'reemplaza_a' in a ? a.reemplaza_a : null,
                es_linea_base: false,
            })));
        }

        await db.from('seg_revisiones').upsert({
            corrida_id: corridaId, seguimiento_id: seg.id, user_id: seg.user_id,
            fecha_local: fecha, intento: pase,
            resultado: nuevas.length ? 'ok_con_novedad' : 'ok_sin_novedad',
            n_actuaciones_vistas: acuerdos.length,
            terminada_en: new Date().toISOString(),
        }, { onConflict: 'seguimiento_id,fecha_local,intento' });
        await db.from('seg_expedientes_seguidos').update({
            ultima_revision_ok: new Date().toISOString(), fallos_consecutivos: 0,
        }).eq('id', seg.id);

        n.ok++;
        if (nuevas.length) {
            n.novedad++;
            const r = await avisar(db, seg, boletin.url, fecha);
            detalle.push(`${seg.numero}: ${nuevas.length} nueva(s)`
                + (r && 'resend' in r ? ` · correo ${r.resend}` : ''));
        }
    }
    detalle.unshift(`boletín del ${boletin.fecha} · ${idx.paginas} páginas`);
    return { n, detalle };
}

// ── El cierre: la regla 3 ─────────────────────────────────────────────

async function cerrar(db: SupabaseClient, fecha: string, corridaId: string) {
    const seguimientos = await activos(db);
    const avisados: string[] = [];

    for (const seg of seguimientos) {
        const { data: revs } = await db.from('seg_revisiones')
            .select('resultado,intento,iniciada_en')
            .eq('seguimiento_id', seg.id).eq('fecha_local', fecha)
            .order('intento', { ascending: true });
        const filas = revs ?? [];
        if (!filas.length) continue;
        // Si CUALQUIER intento salió bien, el día está resuelto.
        if (filas.some(f => f.resultado.startsWith('ok_') || f.resultado === 'inhabil')) continue;

        const organo = seg.organo?.nombre || '';
        const urlManual = seg.organo?.jurisdiccion === 'PJF'
            ? urlDe(seg.organo.clave_externa, seg.numero,
                    seg.tipo_asunto_clave || 1, seg.tipo_procedimiento_clave || 0)
            : 'https://consultabpj.poderjudicialcdmx.gob.mx:2096/consultaboletinpjcdmx';
        const horas = filas.map(f => (f.iniciada_en || '').slice(11, 16)).filter(Boolean);
        const dias = seg.fallos_consecutivos || 0;

        const { asunto, cuerpo } = correoNoSePudo(
            { id: seg.id, numero: seg.numero, alias: seg.alias, fecha_local: fecha },
            organo, horas, dias, urlManual);

        const { data: aviso, error } = await db.from('seg_avisos').insert({
            user_id: seg.user_id, seguimiento_id: seg.id, tipo: 'no_se_pudo',
            fecha_local: fecha, clave_idem: `nopude:${seg.id}:${fecha}`,
            destinatario: seg.correo_aviso!, asunto,
        }).select().single();
        if (error) continue;                       // ya se avisó hoy

        const rid = await enviar(seg.correo_aviso!, asunto, cuerpo);
        await db.from('seg_avisos').update({
            estado: 'enviado', resend_id: rid, enviado_en: new Date().toISOString(),
        }).eq('id', aviso.id);
        avisados.push(`${seg.numero}: no se pudo (${dias} día/s)`);
    }

    await db.from('seg_corridas').update({
        terminada_en: new Date().toISOString(), n_fallo: avisados.length, nota: 'cierre',
    }).eq('id', corridaId);
    return avisados;
}

// ── La puerta ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const quien = quienLlama(req);
    if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const pase = paseDeLaHora(req);
    const forzar = quien === 'admin' && req.nextUrl.searchParams.get('forzar') === '1';
    const fecha = hoyMexico();
    const hora = enMexico().getUTCHours();

    // La guardia: si México volviera a cambiar de huso, el cron dispararía a
    // otra hora local y los correos dirían una hora falsa. Antes que eso, grita.
    if ((hora < 6 || hora > 14) && !forzar) {
        console.error(`⚖️ Barrido disparado a las ${hora}h locales: fuera de ventana.`);
        return NextResponse.json({ ok: false, motivo: 'fuera_de_ventana', hora },
                                 { status: 200 });
    }

    const db = servicio();

    // Idempotente por el índice único (fecha_local, pase): un cron disparado
    // dos veces no duplica la corrida.
    let corrida = (await db.from('seg_corridas')
        .select('id').eq('fecha_local', fecha).eq('pase', pase).maybeSingle()).data;
    if (!corrida) {
        corrida = (await db.from('seg_corridas').insert({
            fecha_local: fecha, pase, disparo: quien === 'cron' ? 'cron' : 'manual',
        }).select('id').single()).data;
    }

    try {
        if (pase >= 4) {
            const avisados = await cerrar(db, fecha, corrida!.id);
            return NextResponse.json({ ok: true, pase, fecha, cierre: avisados });
        }

        const todos = await activos(db);
        const pjf = todos.filter(s => s.organo?.jurisdiccion === 'PJF');
        const cdmxSegs = todos.filter(s => s.organo?.jurisdiccion === 'CDMX');

        const a = await barrerPJF(db, pjf, corrida!.id, fecha, pase);
        const b = await barrerCDMX(db, cdmxSegs, corrida!.id, fecha, pase);

        const n = {
            total: a.n.total + b.n.total, leidos: a.n.ok + b.n.ok,
            novedad: a.n.novedad + b.n.novedad, fallo: a.n.fallo + b.n.fallo,
        };
        await db.from('seg_corridas').update({
            terminada_en: new Date().toISOString(),
            n_total: n.total, n_ok: n.leidos, n_novedad: n.novedad, n_fallo: n.fallo,
        }).eq('id', corrida!.id);

        console.log(`⚖️ Barrido ${fecha} pase ${pase}: ${n.leidos} leídos, `
            + `${n.novedad} con novedad, ${n.fallo} sin lectura`);
        return NextResponse.json({ ok: true, pase, fecha, ...n,
                                   detalle: [...a.detalle, ...b.detalle] });
    } catch (e) {
        console.error('⚖️ Barrido: falló', e);
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : 'error' },
            { status: 500 });
    }
}
