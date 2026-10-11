/* IUREXIA AGENDA (11-oct-2026) — los términos del abogado.

   Vive en Supabase (`agenda_terminos`, con RLS: cada quien ve lo suyo). El
   cómputo de la fecha lo hace la API (`POST /plazos/calcular`, reglas de cada
   código con su artículo) y la lectura del acuerdo `POST /agenda/extraer`.
   Los avisos al correo los manda el cron `/api/cron/agenda` cada mañana. */

import { supabase } from '@/lib/supabase';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1390';

export type EstadoTermino = 'pendiente' | 'cumplido' | 'cancelado';

export interface Termino {
    id: string;
    user_id: string;
    titulo: string;
    expediente: string | null;
    organo: string | null;
    entidad: string | null;
    materia: string | null;
    acto: string | null;
    regla: string | null;
    fecha_notificacion: string | null;
    tipo_notificacion: string | null;
    cantidad: number | null;
    unidad: string | null;
    tipo_dias: string | null;
    surte_efectos: string | null;
    inicio: string | null;
    vencimiento: string;
    fundamento: string[];
    avisos: string[];
    notas: string | null;
    origen: 'manual' | 'acuerdo' | 'calculadora' | 'chat';
    documento_nombre: string | null;
    estado: EstadoTermino;
    recordar_dias: number[];
    avisos_enviados: Record<string, string>;
    created_at: string;
}

export type TerminoNuevo = Omit<Termino, 'id' | 'user_id' | 'created_at' | 'avisos_enviados' | 'estado'> & { estado?: EstadoTermino };

export const REGLAS: { v: string; t: string }[] = [
    { v: 'LAmp', t: 'Ley de Amparo' },
    { v: 'CNPCF', t: 'Código Nacional de Procedimientos Civiles y Familiares' },
    { v: 'CNPP', t: 'Código Nacional de Procedimientos Penales' },
    { v: 'LFT', t: 'Ley Federal del Trabajo' },
    { v: 'LFPCA', t: 'Contencioso administrativo federal (LFPCA)' },
    { v: 'CFF', t: 'Código Fiscal de la Federación' },
    { v: 'LFPA', t: 'Ley Federal de Procedimiento Administrativo' },
    { v: 'CCom', t: 'Código de Comercio' },
    { v: 'CFPC', t: 'Código Federal de Procedimientos Civiles' },
    { v: 'LAgra', t: 'Agrario (CFPC supletorio)' },
    { v: 'LOCAL', t: 'Código procesal local (regla genérica)' },
    { v: 'FECHA', t: 'Fecha fija (audiencia o diligencia)' },
];

/* ── Fechas sin husos: todo se trata como fecha local AAAA-MM-DD ── */
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export function hoyISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function aFecha(iso: string): Date {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
}
export function aISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function diasEntre(desdeISO: string, hastaISO: string): number {
    return Math.round((aFecha(hastaISO).getTime() - aFecha(desdeISO).getTime()) / 86_400_000);
}
export function fechaLarga(iso?: string | null): string {
    if (!iso) return '';
    return aFecha(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function fechaCorta(iso?: string | null): string {
    if (!iso) return '';
    return aFecha(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/** Qué tan cerca está: decide el color y la frase. */
export function urgencia(t: Pick<Termino, 'vencimiento' | 'estado'>, hoy = hoyISO()) {
    if (t.estado === 'cumplido') return { clase: 'cumplido', frase: 'Cumplido', color: 'bg-emerald-600' } as const;
    if (t.estado === 'cancelado') return { clase: 'cancelado', frase: 'Cancelado', color: 'bg-gray-400' } as const;
    const n = diasEntre(hoy, t.vencimiento);
    if (n < 0) return { clase: 'vencido', frase: `Venció hace ${-n} ${-n === 1 ? 'día' : 'días'}`, color: 'bg-red-700' } as const;
    if (n === 0) return { clase: 'hoy', frase: 'Vence HOY', color: 'bg-red-600' } as const;
    if (n === 1) return { clase: 'manana', frase: 'Vence mañana', color: 'bg-amber-500' } as const;
    if (n <= 5) return { clase: 'pronto', frase: `En ${n} días`, color: 'bg-amber-400' } as const;
    return { clase: 'lejos', frase: `En ${n} días`, color: 'bg-accent-brown' } as const;
}

/* ── Supabase ── */
export async function listarTerminos(): Promise<Termino[]> {
    const { data, error } = await supabase
        .from('agenda_terminos')
        .select('*')
        .neq('estado', 'cancelado')
        .order('vencimiento', { ascending: true })
        .limit(1000);
    if (error) throw error;
    return (data || []) as Termino[];
}

export async function crearTermino(t: TerminoNuevo): Promise<Termino> {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) throw new Error('Inicie sesión para guardar en su agenda.');
    const { data, error } = await supabase.from('agenda_terminos')
        .insert({ ...t, user_id: uid }).select('*').single();
    if (error) throw error;
    return data as Termino;
}

export async function actualizarTermino(id: string, cambios: Partial<Termino>): Promise<void> {
    const { error } = await supabase.from('agenda_terminos').update(cambios).eq('id', id);
    if (error) throw error;
}

export async function borrarTermino(id: string): Promise<void> {
    const { error } = await supabase.from('agenda_terminos').delete().eq('id', id);
    if (error) throw error;
}

/* ── API ── */
export interface ResultadoCalculo {
    regla: string; vencimiento: string | null; surte_efectos?: string; inicio?: string; tipo_dias?: string;
    inhabiles_saltados?: { fecha: string; motivo: string }[]; fundamento: string[]; explicacion: string; avisos: string[];
}

export async function calcularPlazo(p: {
    fecha_notificacion: string; cantidad: number; unidad: string; regla: string; tipo_notificacion: string;
    tipo_dias?: string | null; familiar_urgente?: boolean; sabados_habiles?: boolean;
    inhabiles_extra?: string[]; periodos_inhabiles?: [string, string][];
}): Promise<ResultadoCalculo> {
    const r = await fetch(`${API_URL}/plazos/calcular`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.detail || 'No se pudo calcular el plazo');
    return d;
}

export interface PropuestaTermino {
    acto: string; parte?: string; cantidad: number; unidad: string; tipo_dias: string;
    fundamento_citado?: string; texto_literal?: string; apercibimiento?: string;
    verificado: boolean; regla: string; regla_motivo: string; calculo: ResultadoCalculo | null;
}
export interface LecturaAcuerdo {
    expediente: string | null; organo: string | null; entidad: string | null; materia: string | null;
    fecha_acuerdo: string | null; fecha_notificacion: string | null; tipo_notificacion: string;
    resumen: string | null; terminos: PropuestaTermino[]; audiencias: { fecha: string; hora?: string; tipo?: string }[];
    avisos: string[]; documento: string;
}

export async function leerAcuerdo(archivo: File | null, texto: string, estado?: string): Promise<LecturaAcuerdo> {
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) throw new Error('Inicie sesión para usar la agenda.');
    const fd = new FormData();
    if (archivo) fd.append('archivo', archivo);
    if (texto) fd.append('texto', texto);
    if (estado) fd.append('estado', estado);
    const r = await fetch(`${API_URL}/agenda/extraer`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.detail || 'No se pudo leer el acuerdo');
    return d as LecturaAcuerdo;
}

/* El grabado de cada mes: el calendario se hojea como uno de pared. */
export const ARTE_DEL_MES = ['escritorio', 'tintero', 'manuscrito', 'archivo', 'biblioteca', 'columnata',
    'claustro', 'cupula', 'escalinata', 'fachada', 'lomos', 'puertas'];
