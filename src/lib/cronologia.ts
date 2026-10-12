/* CRONOLOGÍA DEL EXPEDIENTE (12-oct-2026) — sólo Platinum.

   De uno o varios PDF de cientos de páginas: la cronología con la página de
   cada hecho, las cuestiones en disputa y los plazos que corren. La lectura,
   la verificación literal de cada hecho contra su página y el cobro viven en
   la API (`/expediente/cronologia*`). Aquí sólo se cuenta, se confirma, se
   espera y se pinta.

   EL COBRO ES PROPORCIONAL: una consulta por cada N páginas (N lo dice la
   API en la cotización). Se cuenta en el navegador para cotizar sin subir
   nada; al subir, el servidor recuenta y, si sale más caro de lo confirmado,
   no cobra y devuelve la cifra nueva (409). */

import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/app/leyesestatales/adminGuard';
import { crearTermino } from '@/lib/agenda';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jurexia-api.onrender.com';

export const PLANES_CRONOLOGIA = ['platinum_monthly', 'platinum_annual', 'ultra_secretarios'];

/** Lo mismo que comprueba la API (`exigir_platinum`): aquí sólo decide qué se
    pinta; la puerta de verdad está en el servidor. */
export function puedeCronologia(plan?: string | null, correo?: string | null): boolean {
    return isAdmin(correo ?? undefined) || PLANES_CRONOLOGIA.includes(plan ?? '');
}

export interface HechoCrono {
    id: string; fecha: string; hecho: string; actuacion: string; actor: string;
    documento: number; pagina: number; foja: string; relevancia: 'alta' | 'media' | 'baja';
    cita: string; verificacion: 'exacta' | 'aproximada'; pagina_corregida: boolean;
}
export interface CitaCrono { documento: number; pagina: number; cita: string }
export interface CuestionCrono {
    id: string; cuestion: string; sostiene: string; postura: string; contraparte: string; citas: CitaCrono[];
}
export interface CalculoPlazo {
    regla: string; vencimiento: string | null; surte_efectos?: string; inicio?: string; tipo_dias?: string;
    fundamento: string[]; explicacion: string; avisos: string[];
}
export interface PlazoCrono {
    id: string; acto: string; parte: string | null; cantidad: number; unidad: string; tipo_dias: string | null;
    fundamento_citado: string | null; apercibimiento: string | null; texto_literal: string;
    documento: number; pagina: number; fecha_base: string | null; tipo_notificacion: string;
    regla: string; regla_motivo: string; calculo: CalculoPlazo | null;
    estado: 'corre' | 'vencido' | 'sin_computo'; avisos: string[];
}
export interface ResultadoCrono {
    datos: { expediente: string; organo: string; entidad: string; materia: string; partes: string[] };
    documentos: { nombre: string; paginas: number; ocr: string; sin_texto: number }[];
    hechos: HechoCrono[]; cuestiones: CuestionCrono[]; plazos: PlazoCrono[];
    descartes: { hechos: number; cuestiones: number; plazos: number };
    lotes_fallidos: { documento: number; desde: number; hasta: number }[];
    consultas_devueltas?: number;
    costo: { paginas: number; segundos: number };
    generado: string;
}
export interface ProgresoCrono {
    fase?: 'en_cola' | 'guardando' | 'leyendo' | 'analizando' | 'consolidando' | 'lista' | 'error' | 'reanudando';
    documento?: number; documentos?: number; lotes_hechos?: number; lotes_total?: number; reintentos?: number;
}
export interface TrabajoCrono {
    id: string; estado: 'en_cola' | 'procesando' | 'lista' | 'error'; titulo: string | null;
    carpeta_id: string | null; documentos: { nombre: string; paginas: number; ruta?: string | null }[];
    paginas: number; consultas: number; progreso: ProgresoCrono; error: string | null;
    created_at: string; resultado?: ResultadoCrono | null;
}
export interface CotizacionCrono {
    paginas: number; consultas: number; paginas_por_consulta: number; max_paginas: number; excede: boolean;
    saldo: { ilimitado: boolean; del_plan: number | null; recargadas: number; disponibles: number | null; suspendida?: boolean };
    alcanza: boolean;
}

/** Un error de la API con su código (`requiere_platinum`, `saldo_insuficiente`,
    `cotizacion_distinta`…) para que la pantalla sepa qué decir. */
export class ErrorCrono extends Error {
    constructor(mensaje: string, public status: number, public codigo?: string, public datos?: Record<string, unknown>) {
        super(mensaje);
    }
}

async function token(): Promise<string> {
    const { data: s } = await supabase.auth.getSession();
    const t = s.session?.access_token;
    if (!t) throw new ErrorCrono('Inicie sesión para usar la Cronología del expediente.', 401);
    return t;
}

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(`${API_URL}${ruta}`, {
        ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${await token()}` },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
        const det = d?.detail;
        if (det && typeof det === 'object') {
            throw new ErrorCrono(String(det.mensaje || 'No se pudo completar la operación.'), r.status, det.codigo, det);
        }
        throw new ErrorCrono(typeof det === 'string' ? det : 'No se pudo completar la operación.', r.status);
    }
    return d as T;
}

/** Páginas de un PDF, contadas en el navegador (no se sube nada). */
export async function contarPaginas(archivo: File): Promise<number> {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
    const n = doc.numPages;
    await doc.destroy();
    return n;
}

export function cotizar(p: { paginas?: number; documento_ids?: string[] }): Promise<CotizacionCrono> {
    return llamar('/expediente/cronologia/cotizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paginas: p.paginas || 0, documento_ids: p.documento_ids || [] }),
    });
}

export function crear(p: {
    archivos: File[]; documento_ids?: string[]; consultas_aceptadas: number; titulo?: string; carpeta_id?: string;
}): Promise<{ id: string; paginas: number; consultas: number; restantes: number | null; titulo: string }> {
    const fd = new FormData();
    for (const a of p.archivos) fd.append('archivos', a);
    if (p.documento_ids?.length) fd.append('documento_ids', JSON.stringify(p.documento_ids));
    fd.append('consultas_aceptadas', String(p.consultas_aceptadas));
    if (p.titulo) fd.append('titulo', p.titulo);
    if (p.carpeta_id) fd.append('carpeta_id', p.carpeta_id);
    return llamar('/expediente/cronologia', { method: 'POST', body: fd });
}

export function estado(id: string): Promise<TrabajoCrono> {
    return llamar(`/expediente/cronologia/${id}`);
}

export async function lista(carpetaId?: string): Promise<TrabajoCrono[]> {
    const d = await llamar<{ cronologias: TrabajoCrono[] }>(
        `/expediente/cronologias${carpetaId ? `?carpeta_id=${encodeURIComponent(carpetaId)}` : ''}`);
    return d.cronologias || [];
}

/** Liga firmada (una hora) al PDF guardado del documento `indice`. */
export async function urlPdf(id: string, indice: number): Promise<string> {
    const d = await llamar<{ url: string }>(`/expediente/cronologia/${id}/pdf/${indice}`);
    return d.url;
}

/** Lo que dice la barra mientras corre. */
export function textoProgreso(t: Pick<TrabajoCrono, 'estado' | 'progreso'>): { texto: string; fraccion: number } {
    const p = t.progreso || {};
    switch (p.fase) {
        case 'guardando': return { texto: 'Guardando los documentos…', fraccion: 0.04 };
        case 'leyendo': return {
            texto: `Leyendo el documento ${p.documento || 1} de ${p.documentos || 1} (con OCR si está escaneado)…`,
            fraccion: 0.05 + 0.2 * ((p.documento || 1) - 1) / Math.max(1, p.documentos || 1),
        };
        case 'analizando': return {
            texto: `Analizando el expediente · ${p.lotes_hechos || 0} de ${p.lotes_total || 0} tramos`,
            fraccion: 0.25 + 0.65 * (p.lotes_hechos || 0) / Math.max(1, p.lotes_total || 1),
        };
        case 'consolidando': return { texto: 'Ordenando la cronología y agrupando las cuestiones…', fraccion: 0.93 };
        case 'reanudando': return { texto: 'El trabajo se interrumpió; se reanuda…', fraccion: 0.1 };
        case 'lista': return { texto: 'Lista', fraccion: 1 };
        default: return { texto: 'En cola…', fraccion: 0.02 };
    }
}

/** Fecha AAAA-MM-DD a «15 mar 2024», sin husos. */
export function fechaCorta(iso: string | null | undefined): string {
    if (!iso) return '';
    const [a, m, d] = iso.split('-').map(Number);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return a && m && d ? `${d} ${meses[m - 1]} ${a}` : iso;
}

/** Los plazos elegidos, a `agenda_terminos`. Sólo los que tienen vencimiento:
    la agenda no guarda un término sin fecha. */
export async function enviarPlazosAAgenda(res: ResultadoCrono, plazos: PlazoCrono[], tituloExpediente: string): Promise<number> {
    let n = 0;
    for (const t of plazos) {
        const c = t.calculo;
        if (!c?.vencimiento) continue;
        const doc = res.documentos[t.documento]?.nombre || null;
        await crearTermino({
            titulo: `${t.acto}`.slice(0, 280) || 'Término',
            expediente: res.datos.expediente || tituloExpediente || null,
            organo: res.datos.organo || null, entidad: res.datos.entidad || null, materia: res.datos.materia || null,
            acto: t.acto || null, regla: t.regla, fecha_notificacion: t.fecha_base, tipo_notificacion: t.tipo_notificacion,
            cantidad: t.cantidad, unidad: t.unidad, tipo_dias: c.tipo_dias || null,
            surte_efectos: c.surte_efectos || null, inicio: c.inicio || null, vencimiento: c.vencimiento,
            fundamento: c.fundamento || (t.fundamento_citado ? [t.fundamento_citado] : []),
            avisos: [...(c.avisos || []), ...(t.avisos || [])],
            notas: [`Cronología del expediente · ${doc || 'documento'}, pág. ${t.pagina}`,
                    t.texto_literal ? `«${t.texto_literal}»` : '',
                    t.apercibimiento ? `Apercibimiento: ${t.apercibimiento}` : ''].filter(Boolean).join('\n'),
            // La agenda acepta manual|acuerdo|calculadora|chat: el plazo sale
            // de un acuerdo del expediente.
            origen: 'acuerdo', documento_nombre: doc, recordar_dias: [3, 1, 0],
        });
        n++;
    }
    return n;
}
