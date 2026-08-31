/**
 * Lo que el secretario teclea. Ni un campo más.
 *
 * POR QUÉ SE LE PIDEN ESTOS DATOS Y NO SE DEDUCEN
 * ═══════════════════════════════════════════════
 * La fecha de presentación se lee de un sello en un segundo; pagar el OCR de un
 * expediente entero para sacarla es tirar el dinero. Y la VÍA de notificación y
 * el PLAZO viajan como campos porque está medido: infiriendo la vía por palabra
 * clave el cómputo se iba ±1 día en la mitad de los casos, y un plazo mal
 * contado invalida la sentencia. Los confirma quien los tiene delante.
 */
'use client';

import React from 'react';
import { Tarjeta, Rotulo } from './primitivas';

export interface Encargo {
    numero: string;
    encabezado: string;
    quejoso: string;
    magistrado: string;
    secretario: string;
    notificacion: string;
    presentacion: string;
    reglaSurtimiento: string;
    plazo: number;
    esRecurso: boolean;
    /** EL TRIBUNAL QUE RESUELVE. Sin él la competencia sale incompleta y el
     *  documento hereda la identidad de otro circuito. */
    tribunal?: string;
    ciudad?: string;
    /** LA AUTORIDAD RESPONSABLE ES OBLIGATORIA: sin ella la competencia, los
     *  efectos y el resolutivo salen con hueco, y es dato de sello. */
    responsable?: string;
}

export const ENCARGO_VACIO: Encargo = {
    numero: '', encabezado: '', quejoso: '', magistrado: '', secretario: '',
    notificacion: '', presentacion: '', reglaSurtimiento: 'personal',
    plazo: 15, esRecurso: false,
};

/** Las reglas de surtimiento que el pipeline sabe computar. */
const VIAS = [
    { v: 'personal', t: 'Personal — surte al día hábil siguiente' },
    { v: 'lista', t: 'Por lista — surte al día hábil siguiente' },
    { v: 'tja_qro_boletin', t: 'Boletín del TJA de Querétaro — al tercer día' },
    { v: 'lfpca', t: 'LFPCA — al día hábil siguiente' },
];

const campo = 'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 ' +
    'text-[13px] text-white/90 outline-none transition placeholder:text-white/25 ' +
    'focus:border-accent-gold/40 focus:bg-white/[0.06]';

function Campo({ etiqueta, ayuda, children }: {
    etiqueta: string; ayuda?: string; children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                {etiqueta}
            </span>
            {children}
            {ayuda && <span className="mt-1 block text-[11px] text-white/30">{ayuda}</span>}
        </label>
    );
}

export default function FormularioEncargo({ valor, onCambiar, deshabilitado }: {
    valor: Encargo;
    onCambiar: (e: Encargo) => void;
    deshabilitado?: boolean;
}) {
    const set = <K extends keyof Encargo>(k: K, v: Encargo[K]) =>
        onCambiar({ ...valor, [k]: v });

    return (
        <Tarjeta>
            <Rotulo accion={<span className="text-[11px] text-white/30">lo lees de un sello</span>}>
                Ficha del asunto
            </Rotulo>

            <fieldset disabled={deshabilitado} className="grid gap-3 disabled:opacity-50">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Campo etiqueta="Expediente" ayuda="Como «174/2026»">
                        <input className={campo} value={valor.numero} placeholder="174/2026"
                               onChange={(e) => set('numero', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Encabezado">
                        <input className={campo} value={valor.encabezado}
                               placeholder="AMPARO DIRECTO CIVIL: 174/2026"
                               onChange={(e) => set('encabezado', e.target.value)} />
                    </Campo>
                </div>

                <Campo etiqueta="Parte quejosa" ayuda="El representado, no quien promueve por él">
                    <input className={campo} value={valor.quejoso}
                           onChange={(e) => set('quejoso', e.target.value)} />
                </Campo>

                {/* EL TRIBUNAL QUE RESUELVE. Sin este dato la competencia sale
                    incompleta y el documento hereda la identidad del tribunal
                    cuyo corpus alimentó las fórmulas. Es lo que hace que esto
                    sirva a un secretario de cualquier circuito. */}
                <Campo etiqueta="Autoridad responsable"
                       ayuda="Quien dictó el acto reclamado. Obligatorio: aparece en la competencia, en los efectos y en el resolutivo">
                    <input className={campo} value={valor.responsable ?? ''}
                           placeholder="Junta Especial Número Uno de la Federal de Conciliación y Arbitraje"
                           onChange={(e) => set('responsable', e.target.value)} />
                </Campo>

                <Campo etiqueta="Tribunal que resuelve"
                       ayuda="Como aparece en tus sentencias: «Primer Tribunal Colegiado en Materia Civil del Décimo Cuarto Circuito»">
                    <input className={campo} value={valor.tribunal ?? ''}
                           placeholder="Tercer Tribunal Colegiado en Materias Administrativa y Civil del Vigésimo Segundo Circuito"
                           onChange={(e) => set('tribunal', e.target.value)} />
                </Campo>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Campo etiqueta="Ciudad" ayuda="Donde se dicta la resolución">
                        <input className={campo} value={valor.ciudad ?? ''}
                               placeholder="Santiago de Querétaro, Querétaro"
                               onChange={(e) => set('ciudad', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Magistrado ponente">
                        <input className={campo} value={valor.magistrado}
                               onChange={(e) => set('magistrado', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Secretario">
                        <input className={campo} value={valor.secretario}
                               onChange={(e) => set('secretario', e.target.value)} />
                    </Campo>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Campo etiqueta="Notificación de la reclamada">
                        <input type="date" className={campo} value={valor.notificacion}
                               onChange={(e) => set('notificacion', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Presentación de la demanda">
                        <input type="date" className={campo} value={valor.presentacion}
                               onChange={(e) => set('presentacion', e.target.value)} />
                    </Campo>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                    <Campo etiqueta="Cómo se notificó"
                           ayuda="No se adivina: mueve el cómputo un día entero">
                        <select className={campo} value={valor.reglaSurtimiento}
                                onChange={(e) => set('reglaSurtimiento', e.target.value)}>
                            {VIAS.map(({ v, t }) => (
                                <option key={v} value={v} className="bg-charcoal-900">{t}</option>
                            ))}
                        </select>
                    </Campo>
                    <Campo etiqueta="Plazo" ayuda="30 en agrario">
                        <input type="number" min={1} max={90} className={campo} value={valor.plazo}
                               onChange={(e) => set('plazo', Number(e.target.value) || 15)} />
                    </Campo>
                </div>

                <label className="flex items-center gap-2.5 pt-1 text-[13px] text-white/70">
                    <input type="checkbox" checked={valor.esRecurso}
                           onChange={(e) => set('esRecurso', e.target.checked)}
                           className="h-4 w-4 rounded border-white/20 bg-white/[0.06]
                                      accent-accent-gold" />
                    Es un recurso — se dirá «agravios» y no «conceptos de violación»
                </label>
            </fieldset>
        </Tarjeta>
    );
}

/** Qué falta antes de poder pedir el adelanto. */
export function faltaEnEncargo(e: Encargo): string[] {
    const falta: string[] = [];
    if (!/^\d{1,4}\s*\/\s*\d{4}$/.test(e.numero.trim())) falta.push('el número de expediente');
    if (!e.quejoso.trim()) falta.push('la parte quejosa');
    if (!e.notificacion) falta.push('la fecha de notificación');
    if (!e.presentacion) falta.push('la fecha de presentación');
    // Sin la responsable el proyecto sale con cuatro huecos en la parte que se
    // ejecuta: la competencia, la existencia del acto, los efectos y el
    // resolutivo. Es un dato de sello y pedirlo cuesta un segundo.
    if (!(e.responsable ?? '').trim()) falta.push('la autoridad responsable');
    if (e.notificacion && e.presentacion && e.presentacion < e.notificacion) {
        falta.push('una presentación posterior a la notificación');
    }
    return falta;
}
