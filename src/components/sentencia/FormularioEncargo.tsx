/**
 * Lo que el secretario teclea. Ni un campo más — y ahora, además, sólo los que
 * SU asunto necesita.
 *
 * EL TIPO DE ASUNTO ES LO PRIMERO, Y MANDA
 * ════════════════════════════════════════
 * David, 31-ago-2026: «los campos están pensados para un amparo directo; sólo
 * hay un botoncito para señalar que es una revisión. La lógica está mal
 * pensada. Lo primero sería preguntarle al usuario qué tipo de asunto va a
 * proyectar y, una vez que seleccione, desplegar los campos que lleva cada uno».
 *
 * Tenía razón, y el precio de la lógica vieja está medido: el resolutivo salía
 * cableado al amparo directo y una QUEJA decía «La Justicia de la Unión ampara
 * y protege», que no existe en derecho; y el plazo por omisión eran quince días
 * para todo, cuando la queja tiene CINCO.
 *
 * Aquí eso desaparece. Se elige el asunto y la ficha se reescribe: cambia el
 * vocabulario —«parte quejosa» o «parte recurrente», «sentencia reclamada» o
 * «auto recurrido»—, cambia lo que hay que subir y el plazo se pone solo.
 *
 * EL PLAZO NO ES UN CAMPO. Lo dice la ley y depende del tipo: quince días el
 * amparo (artículo 17), diez la revisión (86), cinco la queja (98). Se muestra
 * como lo que es —un dato con su artículo al lado, no una casilla que rellenar—
 * y sólo se pregunta lo que la ley no resuelve: si el asunto cae en una
 * EXCEPCIÓN. Ésas sí las sabe el secretario y no el expediente.
 *
 * Y NO HAY CASILLA «ES UN RECURSO». Era un campo independiente que podía
 * contradecir al tipo: un amparo directo marcado como recurso escribía
 * «agravios» donde van conceptos de violación. Lo dice el tipo.
 *
 * El catálogo se pide al servidor: la pantalla no sabe derecho. Si mañana
 * cambia un plazo se cambia en un sitio y esto se entera solo.
 */
'use client';

import React from 'react';
import { Tarjeta, Rotulo, cn } from './primitivas';
import { obtenerTipos, type TipoAsunto } from './api';

export interface Encargo {
    tipoAsunto: string;
    numero: string;
    encabezado: string;
    quejoso: string;
    magistrado: string;
    secretario: string;
    notificacion: string;
    presentacion: string;
    reglaSurtimiento: string;
    /** Cero = el que la ley da a este tipo. Sólo se manda si se declara otro. */
    plazo: number;
    /** La excepción de plazo, cuando el tipo tiene alguna. */
    excepcionPlazo?: string;
    /** EL TRIBUNAL QUE RESUELVE. Sin él la competencia sale incompleta y el
     *  documento hereda la identidad de otro circuito. */
    tribunal?: string;
    ciudad?: string;
    /** LA AUTORIDAD RESPONSABLE se lee del acto; esto sólo la corrige. */
    responsable?: string;
    /** LOS INHÁBILES QUE EL SISTEMA NO PUEDE SABER. Trae los del artículo 19
     *  de la Ley de Amparo, los sábados y domingos y los periodos vacacionales
     *  del PJF; lo que no puede saber es que ESTE tribunal suspendió labores
     *  un martes. Eso lo declara quien estuvo ahí. */
    /* LAS FECHAS DE SESIÓN SE FUERON. Las añadí por la mañana y David las
     * retiró por la tarde: «no me sirven porque estas, al final, quedarán
     * hasta el momento en que se revisen por los magistrados. Son campos
     * innecesarios». Un campo que sólo se puede rellenar inventando no es un
     * campo. El párrafo del resultando sale con sus dos huecos y su aviso, y
     * se completan al engrosar. */
    /** Tercero interesado, o parte actora en la revisión fiscal. */
    tercero?: string;
    diasInhabilesExtra?: string[];
}

export const ENCARGO_VACIO: Encargo = {
    tipoAsunto: '', numero: '', encabezado: '', quejoso: '', magistrado: '',
    secretario: '', notificacion: '', presentacion: '',
    reglaSurtimiento: 'personal', plazo: 0, diasInhabilesExtra: [],
};

/** Las reglas de surtimiento que el pipeline sabe computar. */
const VIAS = [
    { v: 'personal', t: 'Personal — surte al día hábil siguiente' },
    { v: 'lista', t: 'Por lista — surte al día hábil siguiente' },
    { v: 'lfpca', t: 'LFPCA — al día hábil siguiente' },
    { v: 'tja_qro_boletin', t: 'Boletín del TJA de Querétaro — al tercer día' },
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

/* ── El selector de asunto ────────────────────────────────────────────────
   Cuatro tarjetas, no un desplegable: la elección gobierna todo lo demás y
   merece verse entera de un vistazo. Cada una lleva su plazo, que es la
   diferencia que más cuesta cuando se yerra. */
function SelectorTipo({ tipos, valor, onElegir }: {
    tipos: TipoAsunto[]; valor: string; onElegir: (clave: string) => void;
}) {
    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {tipos.map((t) => {
                const activo = t.clave === valor;
                return (
                    <button
                        key={t.clave}
                        type="button"
                        onClick={() => onElegir(t.clave)}
                        className={cn(
                            'rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                            activo
                                ? 'border-accent-gold/45 bg-accent-gold/[0.07] shadow-[0_0_30px_-14px_rgba(201,169,98,0.5)]'
                                : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 '
                                  + 'hover:bg-white/[0.05] hover:-translate-y-px',
                        )}
                    >
                        <span className={cn(
                            // SIN `capitalize`: el servidor manda «amparo en
                            // revisión» bien escrito y la clase lo convertía en
                            // «Amparo En Revisión», con la preposición en alta.
                            // Se pone en alta sólo la primera letra.
                            'block text-[13px] font-medium first-letter:uppercase',
                            activo ? 'text-accent-gold' : 'text-white/80',
                        )}>
                            {t.nombre}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-white/35">
                            {t.plazo.dias} días · {t.plazo.fundamento}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default function FormularioEncargo({ valor, onCambiar, deshabilitado }: {
    valor: Encargo;
    onCambiar: (e: Encargo) => void;
    deshabilitado?: boolean;
}) {
    const [tipos, setTipos] = React.useState<TipoAsunto[]>([]);
    const [errorCatalogo, setErrorCatalogo] = React.useState('');

    React.useEffect(() => {
        obtenerTipos().then(setTipos).catch(() =>
            setErrorCatalogo('No se pudo leer el catálogo de asuntos.'));
    }, []);

    const set = <K extends keyof Encargo>(k: K, v: Encargo[K]) =>
        onCambiar({ ...valor, [k]: v });

    const tipo = tipos.find((t) => t.clave === valor.tipoAsunto);
    // EL VOCABULARIO SALE DEL TIPO. Mientras no se elija, la ficha no se pinta:
    // pedir «la parte quejosa» antes de saber si hay quejoso o recurrente es
    // exactamente la lógica que había que quitar.
    const promovente = tipo ? tipo.promovente : 'parte';
    const recurrido = tipo ? tipo.recurrido : 'la resolución';
    // «de el auto recurrido» no es español. La contracción depende del artículo
    // que traiga el nombre, así que se hace aquí y no en la frase.
    const deRecurrido = recurrido.startsWith('el ')
        ? `del ${recurrido.slice(3)}` : `de ${recurrido}`;

    return (
        <Tarjeta>
            <Rotulo accion={
                <span className="text-[11px] text-white/30">
                    {tipo ? 'lo lees de un sello' : 'empieza por aquí'}
                </span>
            }>
                Ficha del asunto
            </Rotulo>

            <fieldset disabled={deshabilitado} className="grid gap-4 disabled:opacity-50">
                <Campo etiqueta="¿Qué vas a proyectar?"
                       ayuda={errorCatalogo || 'Cada asunto lleva sus apartados, su vocabulario y su plazo'}>
                    <SelectorTipo tipos={tipos} valor={valor.tipoAsunto}
                                  onElegir={(clave) => onCambiar({
                                      ...valor, tipoAsunto: clave, excepcionPlazo: '', plazo: 0,
                                  })} />
                </Campo>

                {/* NADA MÁS SE PINTA HASTA QUE HAY TIPO. Y cuando se pinta,
                    entra escalonado de arriba abajo: la vista sigue el orden en
                    que hay que llenar los campos. `key` fuerza el remontaje al
                    cambiar de asunto, así que la animación se repite y se ve
                    que la ficha ES OTRA, no la misma con etiquetas cambiadas. */}
                {tipo && (
                <div key={tipo.clave} className="ficha-entra grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Campo etiqueta="Expediente" ayuda="Como «174/2026»">
                        <input className={campo} value={valor.numero} placeholder="174/2026"
                               onChange={(e) => set('numero', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Encabezado">
                        <input className={campo} value={valor.encabezado}
                               placeholder={`${tipo.nombre.toUpperCase()}: 174/2026`}
                               onChange={(e) => set('encabezado', e.target.value)} />
                    </Campo>
                </div>

                {/* LAS FIGURAS SON DEL TIPO, Y LAS DICE EL SERVIDOR. Estaban
                    escritas aquí: «Autoridad responsable», con un Juez de
                    Distrito de ejemplo, en los cuatro. En un recurso no hay
                    autoridad responsable —hay un órgano cuya resolución se
                    recurre— y pedir el dato con el nombre equivocado hace que
                    el secretario teclee una cosa y firme otra. */}
                {(tipo.caratula ?? [
                    { etiqueta: 'QUEJOSO', clave: 'quejoso', obligatoria: true },
                    { etiqueta: 'AUTORIDAD RESPONSABLE', clave: 'responsable', obligatoria: true },
                ]).map((f) => (
                    <Campo key={f.clave}
                           etiqueta={f.etiqueta.charAt(0) + f.etiqueta.slice(1).toLowerCase()}
                           ayuda={f.clave === 'quejoso'
                               ? 'El representado, no quien promueve por él'
                               : f.clave === 'responsable'
                                   ? `Se lee ${deRecurrido}. Escríbelo sólo para corregir lo que se lea`
                                   : 'Si no consta, déjalo vacío'}>
                        <input className={campo}
                               value={(valor as unknown as Record<string, string>)[f.clave] ?? ''}
                               onChange={(e) => set(f.clave as keyof Encargo, e.target.value)} />
                    </Campo>
                ))}

                {/* EL TRIBUNAL QUE RESUELVE. Es lo que hace que esto sirva a un
                    secretario de cualquier circuito y no herede la identidad
                    del tribunal cuyo corpus alimentó las fórmulas. */}
                <Campo etiqueta="Tribunal que resuelve"
                       ayuda="Como aparece en tus sentencias: «Primer Tribunal Colegiado en Materia Civil del Décimo Cuarto Circuito»">
                    <input className={campo} value={valor.tribunal ?? ''}
                           onChange={(e) => set('tribunal', e.target.value)} />
                </Campo>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Campo etiqueta="Ciudad" ayuda="Donde se dicta la resolución">
                        <input className={campo} value={valor.ciudad ?? ''}
                               placeholder="Mérida, Yucatán"
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
                    <Campo etiqueta={`Notificación ${deRecurrido}`}>
                        <input type="date" className={campo} value={valor.notificacion}
                               onChange={(e) => set('notificacion', e.target.value)} />
                    </Campo>
                    <Campo etiqueta={`Presentación: ${tipo.escrito}`}>
                        <input type="date" className={campo} value={valor.presentacion}
                               onChange={(e) => set('presentacion', e.target.value)} />
                    </Campo>
                </div>

                <Campo etiqueta="Cómo se notificó"
                       ayuda="No se adivina: mueve el cómputo un día entero">
                    <select className={campo} value={valor.reglaSurtimiento}
                            onChange={(e) => set('reglaSurtimiento', e.target.value)}>
                        {VIAS.map(({ v, t }) => (
                            <option key={v} value={v} className="bg-charcoal-900">{t}</option>
                        ))}
                    </select>
                </Campo>

                <Campo etiqueta="Días inhábiles adicionales"
                       ayuda="Los del artículo 19, sábados y domingos y las vacaciones del Poder Judicial ya van contados. Aquí sólo los de tu tribunal.">
                    <div className="flex flex-wrap items-center gap-2">
                        {(valor.diasInhabilesExtra ?? []).map((d) => (
                            <span key={d}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent-gold/25 bg-accent-gold/10 px-2.5 py-1 text-[12px] text-accent-gold">
                                {d}
                                <button type="button" aria-label={`Quitar ${d}`}
                                        className="text-accent-gold/60 transition hover:text-accent-gold"
                                        onClick={() => set('diasInhabilesExtra',
                                            (valor.diasInhabilesExtra ?? []).filter((x) => x !== d))}>
                                    ×
                                </button>
                            </span>
                        ))}
                        <input type="date" className={`${campo} w-auto`} value=""
                               onChange={(e) => {
                                   const d = e.target.value;
                                   if (!d) return;
                                   const ya = valor.diasInhabilesExtra ?? [];
                                   if (!ya.includes(d)) set('diasInhabilesExtra', [...ya, d].sort());
                               }} />
                    </div>
                </Campo>

                {/* EL PLAZO SE MUESTRA, NO SE PIDE. Es la ley. */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-white/45">
                        Plazo
                    </span>
                    <p className="mt-1 text-[13px] text-white/80">
                        <span className="text-accent-gold">
                            {valor.excepcionPlazo
                                ? (() => {
                                    const e = tipo.excepciones_de_plazo
                                        .find((x) => x.clave === valor.excepcionPlazo);
                                    return e?.en_cualquier_tiempo
                                        ? 'En cualquier tiempo' : `${e?.dias} días`;
                                })()
                                : `${tipo.plazo.dias} días`}
                        </span>
                        {' · '}
                        <span className="text-white/45">
                            {valor.excepcionPlazo
                                ? tipo.excepciones_de_plazo
                                    .find((x) => x.clave === valor.excepcionPlazo)?.fundamento
                                : tipo.plazo.fundamento}
                        </span>
                    </p>

                    {tipo.excepciones_de_plazo.length > 0 && (
                        <div className="mt-3 border-t border-white/[0.06] pt-3">
                            <span className="mb-1.5 block text-[11px] text-white/35">
                                ¿El asunto cae en alguna excepción? Esto no se deduce del
                                expediente: lo sabes tú.
                            </span>
                            <select className={campo} value={valor.excepcionPlazo ?? ''}
                                    onChange={(e) => set('excepcionPlazo', e.target.value)}>
                                <option value="" className="bg-charcoal-900">
                                    No — el plazo ordinario
                                </option>
                                {tipo.excepciones_de_plazo.map((e) => (
                                    <option key={e.clave} value={e.clave} className="bg-charcoal-900">
                                        {e.cuando} → {e.en_cualquier_tiempo
                                            ? 'en cualquier tiempo' : `${e.dias} días`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <p className="text-[11px] leading-relaxed text-white/25">
                    Este proyecto llevará {tipo.apartados.considerandos.length} considerandos
                    —{tipo.apartados.considerandos.join(', ').toLowerCase()}— y se dirá
                    «{tipo.combate}», no otra cosa. Medido sobre {tipo.medido_sobre} adelantos
                    reales de esta clase de asunto.
                </p>
                </div>
                )}
            </fieldset>
        </Tarjeta>
    );
}

/** Qué falta antes de poder pedir el adelanto. */
export function faltaEnEncargo(e: Encargo): string[] {
    const falta: string[] = [];
    // EL TIPO ES LO PRIMERO Y SIN ÉL NO HAY NADA QUE PEDIR: de él dependen los
    // apartados, el vocabulario y el plazo.
    if (!e.tipoAsunto) falta.push('el tipo de asunto');
    if (!/^\d{1,4}\s*\/\s*\d{4}$/.test(e.numero.trim())) falta.push('el número de expediente');
    /* LA PARTE PROMOVENTE YA NO SE EXIGE: el pipeline la lee de los
     * documentos —3 de 5 exacta y 2 parcial sobre los expedientes reales, con
     * cero invenciones— y la propone con su aviso para que se confirme. Si el
     * secretario la escribe, manda él. */
    if (!e.notificacion) falta.push('la fecha de notificación');
    if (!e.presentacion) falta.push('la fecha de presentación');
    /* EL TRIBUNAL, EL MAGISTRADO Y EL SECRETARIO se toman del último asunto
     * de este secretario. Sólo se exigen la primera vez, y de eso se encarga
     * el servidor, que es quien sabe si hay asunto anterior. */
    return falta;
}
