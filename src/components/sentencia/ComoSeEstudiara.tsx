'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from './primitivas';
import type { ProblemaJuridico } from './tipos';
import type { PlanDelEstudio, PropuestaDelPlan, RespuestaPlan, SegmentoDelPlan } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   «CÓMO SE ESTUDIARÁ»: EL PLAN DEL ESTUDIO, ANTES DE GENERAR (26-sep-2026)
   ═══════════════════════════════════════════════════════════════════════════
   Medido hoy (8 casos × 2 corridas, localizador ciego con 675 citas
   verificadas): la v2 acorta la Solución a la mitad pero contesta con razón
   propia sólo el 73 % de los argumentos autónomos, y duplica las omisiones
   graves. Al acortar sin saber qué argumentos hay, funde en una respuesta
   global los que traen dato propio.

   El plan decide eso ANTES de redactar, sobre la decisión que está en
   pantalla: qué argumentos se contestan juntos y por qué, dónde se expone
   cada premisa —una sola vez—, qué dato propio trae cada uno. Y esta pantalla
   se lo enseña al secretario ANTES de generar, porque separar un argumento
   que el plan fundió cuesta un clic aquí y un estudio entero después.

   Lo que el panel NO hace: decidir el sentido. La etiqueta de cada argumento
   es la del criterio de su problema; si el plan cree que otra calificación
   encaja mejor, la PROPONE con un botón, y sólo cambia si él lo pulsa.

   Sólo aparece si la cuenta escribe con plan (variante v4; hoy, cuentas de
   casa que la eligen). Contrato: diag/contrato_paso2.md. */

/* ── EL PEDIDO, CON ANTIRREBOTE ────────────────────────────────────────────
   Cada corrida del planificador cuesta una llamada al modelo y el servidor
   corta en 4 por sesión. Si se pidiera con cada pastilla o cada tecla, dos
   cambios de sentido y una razón a medio escribir agotarían el tope antes de
   generar. Se pide cuando la decisión lleva ~8 segundos quieta, está
   completa y el motor no está redactando una razón (w2_final §4.5: «nunca
   mientras /taller/razonar está en curso»). El primer pedido va a los 2 s:
   al llegar a la pantalla la decisión suele ser la propuesta tal cual, y el
   servidor pudo dejarla hecha al proponer —si la clave ya está calculada,
   contesta «listo» sin gastar corrida—. */
const ANTIRREBOTE_MS = 8_000;
const PRIMER_PEDIDO_MS = 2_000;
const CADENCIA_MS = 4_000;
/* El servidor tiene un tope de 120 s para el plan síncrono; aquí se espera
   algo más antes de dejar de preguntar. No es un error: al generar, el
   servidor espera ese mismo plan o lo hace. */
const ESPERA_MAXIMA_MS = 150_000;

export interface EnlacePlan {
    /** La cuenta escribe con plan (v4). Sin esto no se pide nada ni se pinta el panel. */
    activo: boolean;
    /** Huella de todo lo que decide el plan —el formulario del proyecto—:
     *  cuando cambia, el plan que hay deja de ser el de esta decisión. */
    firma: string;
    /** Pide el plan de la decisión que está AHORA en pantalla. */
    pedir: () => Promise<RespuestaPlan>;
    /** Lee el plan que hay en la sesión (GET /taller/plan). */
    leer: () => Promise<RespuestaPlan>;
}

export type FaseDelPlan = 'inactivo' | 'esperando' | 'pidiendo' | 'en_curso' | 'listo' | 'fallo' | 'sin_plan';

export interface EstadoDelPlan {
    fase: FaseDelPlan;
    /** La última respuesta que trajo plan. Se conserva al cambiar la
     *  decisión, marcada como desactualizada, en vez de dejar el panel vacío. */
    respuesta: RespuestaPlan | null;
    /** La decisión cambió después de ese plan: se rehace tras el antirrebote. */
    desactualizado: boolean;
    error: string;
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** El plan de la decisión en pantalla. `listo` = la decisión está completa y
 *  nada la está cambiando ahora mismo; si no, se espera sin pedir. */
export function usePlanDelEstudio(enlace: EnlacePlan, listo: boolean): EstadoDelPlan {
    const [fase, setFase] = useState<FaseDelPlan>('inactivo');
    const [respuesta, setRespuesta] = useState<RespuestaPlan | null>(null);
    const [firmaDeRespuesta, setFirmaDeRespuesta] = useState('');
    const [error, setError] = useState('');
    /* Las funciones cambian en cada pintado de la página; el temporizador
       tiene que llamar a las de AHORA, no a las del momento en que se armó. */
    const pedirRef = useRef(enlace.pedir);
    const leerRef = useRef(enlace.leer);
    pedirRef.current = enlace.pedir;
    leerRef.current = enlace.leer;
    /* La firma que ya se pidió: la misma decisión no se pide dos veces. */
    const pedida = useRef('');
    const primero = useRef(true);
    /* Cada pedido lleva su turno; una respuesta de un turno viejo se tira.
       Sin esto, el plan de la decisión anterior podía llegar tarde y pintarse
       encima del de la nueva. */
    const turno = useRef(0);

    const { activo, firma } = enlace;
    useEffect(() => {
        if (!activo) {
            /* Se apagó (otra variante elegida): lo que esté en camino ya no se
               pinta, y al volver a encender se pide de nuevo. */
            turno.current += 1;
            pedida.current = '';
            setFase('inactivo');
            return;
        }
        if (!listo) {
            /* La decisión está incompleta o el motor redacta una razón: no se
               programa nada. Lo que ya esté en camino NO se corta: es de una
               firma que puede seguir valiendo cuando esto acabe, y cortarlo
               dejaría esa firma como «ya pedida» y el panel vacío. */
            setFase((f) => (f === 'inactivo' ? 'esperando' : f));
            return;
        }
        if (!firma || firma === pedida.current) return;
        const t = setTimeout(async () => {
            const mio = ++turno.current;
            pedida.current = firma;
            primero.current = false;
            setFase('pidiendo');
            setError('');
            try {
                let r = await pedirRef.current();
                if (mio !== turno.current) return;
                const clave = r.clave;
                const limite = Date.now() + ESPERA_MAXIMA_MS;
                /* EN CURSO: se pregunta a la fila, que es la única fuente de
                   verdad con dos workers. Vale sólo el plan de NUESTRA clave:
                   la fila puede traer uno anterior mientras corre el nuevo. */
                while ((r.estado === 'en_curso' || (r.estado === 'listo' && !r.plan))
                       && Date.now() < limite) {
                    setFase('en_curso');
                    await esperar(r.estado === 'listo' ? 0 : CADENCIA_MS);
                    if (mio !== turno.current) return;
                    const l = await leerRef.current();
                    if (mio !== turno.current) return;
                    if (!clave || l.clave === clave) r = l;
                    else r = { ...r, estado: 'en_curso' };
                }
                if (mio !== turno.current) return;
                if (r.estado === 'listo' && r.plan) {
                    setRespuesta(r);
                    setFirmaDeRespuesta(firma);
                    setFase('listo');
                } else if (r.estado === 'en_curso') {
                    // Tardó más de lo que se espera aquí: al generar se esperará allá.
                    setFase('en_curso');
                } else {
                    setFase(r.estado === 'fallo' ? 'fallo' : 'sin_plan');
                    setError(r.avisos.join(' · '));
                    if (r.plan) { setRespuesta(r); setFirmaDeRespuesta(firma); }
                }
            } catch (e) {
                if (mio !== turno.current) return;
                // No se reintenta solo: con el tope de corridas, reintentar
                // en bucle sería gastar las que quedan en el mismo error.
                setFase('fallo');
                setError(e instanceof Error ? e.message : 'No se pudo pedir el plan.');
            }
        }, primero.current ? PRIMER_PEDIDO_MS : ANTIRREBOTE_MS);
        // Con un plan en pantalla se queda «listo» (y se marca desactualizado);
        // un fallo anterior no se sigue enseñando mientras llega el nuevo.
        setFase((f) => (f === 'listo' || f === 'pidiendo' || f === 'en_curso' ? f : 'esperando'));
        return () => clearTimeout(t);
    }, [activo, firma, listo]);

    // Al desmontar, lo que esté en camino ya no tiene dónde pintarse.
    useEffect(() => () => { turno.current += 1; }, []);

    return {
        fase,
        respuesta,
        desactualizado: !!respuesta && firmaDeRespuesta !== firma,
        error,
    };
}

/* ── ETIQUETAS LEGIBLES ────────────────────────────────────────────────────
   Los catálogos del plan son cerrados (w2_final §4.2) y viajan como claves.
   Aquí sólo se dicen en castellano; lo que no esté en la tabla se enseña tal
   cual, con los guiones bajos como espacios, en vez de esconderse. */
const TRAT: Record<string, string> = {
    aplica: 'aplica la premisa',
    remite: 'remite',
    desarrolla: 'desarrollo propio',
    residual: 'residual',
    no_se_estudia: 'no se estudia',
    no_se_expresa_art79: 'no se expresa (art. 79, último párrafo)',
};
const DIFERENCIA: Record<string, string> = {
    hecho: 'trae un hecho propio',
    prueba: 'trae una prueba propia',
    norma: 'invoca una norma propia',
    precedente: 'invoca un precedente propio',
    procesal: 'plantea una cuestión procesal propia',
    consecuencia: 'pide una consecuencia distinta',
};
const VICIO: Record<string, string> = {
    procedencia: 'procedencia', procesal: 'violación procesal', forma: 'forma',
    omision: 'omisión', fondo: 'fondo',
};
const RAZON: Record<string, string> = {
    fondo_desestimado: 'se desestima en el fondo',
    omision_inexistente: 'la omisión no existe',
    fundado: 'fundado',
    esencialmente_fundado: 'esencialmente fundado',
    fundado_insuficiente: 'fundado pero insuficiente: otra consideración sostiene el acto',
    no_combate: 'no combate la consideración',
    ataca_accesoria: 'ataca una consideración accesoria',
    generico: 'genérico',
    reitera_sin_combatir: 'reitera sin combatir',
    falsa_premisa: 'parte de una premisa falsa',
    novedoso: 'novedoso',
    cosa_juzgada_amparo_previo: 'cosa juzgada por un amparo previo',
    procesal_171_172: 'violación procesal no preparada o sin trascendencia (arts. 171 y 172)',
    adhesivo_fuera_182: 'el adhesivo no se ajusta al art. 182',
    innecesario_mayor_beneficio: 'innecesario: la concesión de fondo da mayor beneficio (art. 189)',
    cae_con_principal: 'cae con el principal',
    sin_materia: 'sin materia',
    adhesivo_sin_materia: 'el adhesivo queda sin materia',
};

const humano = (s: string) => s.replace(/_/g, ' ');
export function razonLegible(r: string): string {
    const m = /^([a-z0-9_]+)\s*\(\s*([^)]*)\)\s*$/i.exec(r || '');
    const base = m ? m[1] : (r || '');
    const arg = m ? m[2] : '';
    const t = RAZON[base] ?? humano(base);
    return arg ? `${t} (${arg})` : t;
}
export function etiquetaLegible(s: string): string {
    const x = (s || '').toLowerCase();
    if (x === 'fundado_insuficiente') return 'fundado pero insuficiente';
    return humano(x);
}

const norm = (t: string) => (t || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** EL PROBLEMA DE UN SEGMENTO, del lado de la pantalla. Lo fija el servidor
 *  (`problema_id`), no el modelo. Si trae la pregunta, se empareja por ella;
 *  si trae un número, es el índice de `fases.problemas`, que es el orden en
 *  que esta pantalla los recibe (base 0, como en Python). */
export function problemaDelSegmento(
    s: Pick<SegmentoDelPlan, 'problema' | 'problemaId'>, problemas: ProblemaJuridico[],
): { p: ProblemaJuridico; n: number } | null {
    if (s.problema) {
        const k = norm(s.problema);
        const i = problemas.findIndex((q) => norm(q.pregunta) === k);
        if (i >= 0) return { p: problemas[i], n: i + 1 };
    }
    const id = s.problemaId;
    if (typeof id === 'number' && id >= 0 && id < problemas.length) return { p: problemas[id], n: id + 1 };
    if (typeof id === 'string') {
        const i = problemas.findIndex((q) => q.id === id || norm(q.pregunta) === norm(id));
        if (i >= 0) return { p: problemas[i], n: i + 1 };
    }
    return null;
}

/** Los argumentos que el plan pide razonar (Decisión 6) y que siguen sin razón. */
export function pendientesDeRazon(plan: PlanDelEstudio | null | undefined,
                                  razones: Record<string, string>): SegmentoDelPlan[] {
    return (plan?.segmentos ?? []).filter((s) => s.pendiente === 'razon' && !(razones[s.id] || '').trim());
}

function Cita({ texto, pagina }: { texto: string; pagina?: string }) {
    if (!texto) return null;
    return (
        <p className="mt-1 border-l-2 border-white/10 pl-2 text-[12px] italic leading-relaxed text-white/55">
            «{texto}»{pagina ? <span className="not-italic text-white/40"> · {pagina}</span> : null}
        </p>
    );
}

function Seccion({ titulo, nota, children, tono = 'neutro' }: {
    titulo: string; nota?: string; children: React.ReactNode; tono?: 'neutro' | 'ambar' | 'oro';
}) {
    return (
        <section className={cn('rounded-xl border p-3',
            tono === 'ambar' ? 'border-amber-400/30 bg-amber-400/[0.05]'
            : tono === 'oro' ? 'border-accent-gold/30 bg-accent-gold/[0.04]'
            : 'border-white/[0.07] bg-black/20')}>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide',
                tono === 'ambar' ? 'text-amber-300/90' : tono === 'oro' ? 'text-accent-gold/90' : 'text-white/45')}>
                {titulo}
            </p>
            {nota && <p className="mt-1 text-[12px] leading-relaxed text-white/50">{nota}</p>}
            <div className="mt-2">{children}</div>
        </section>
    );
}

/** Un renglón por argumento: qué es, cómo se trata y con qué dato. */
function RenglonSegmento({ s, esRecurso }: { s: SegmentoDelPlan; esRecurso: boolean }) {
    const trat = TRAT[s.trat] ?? humano(s.trat);
    return (
        <li className="rounded-lg px-1 py-1.5">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
                <span className="shrink-0 font-semibold tabular-nums text-accent-gold/90">{s.id}</span>
                {s.etiqueta && <span className="shrink-0 font-medium text-white/90">{etiquetaLegible(s.etiqueta)}</span>}
                {trat && <span className="shrink-0 text-white/60">· {trat}</span>}
                {s.trat === 'desarrolla' && s.diferencia && (
                    <span className="text-white/60">: {DIFERENCIA[s.diferencia] ?? humano(s.diferencia)}</span>
                )}
                {s.reitera && <span className="text-white/45">· reitera {s.reitera}</span>}
                {s.vicio && s.vicio !== 'fondo' && <span className="text-white/45">· {VICIO[s.vicio] ?? humano(s.vicio)}</span>}
            </p>
            {(s.sostiene || s.texto) && (
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">
                    {s.sostiene || s.texto}
                </p>
            )}
            {s.razon && (
                <p className="mt-0.5 text-[12px] text-white/50">
                    Razón: <span className="text-white/70">{razonLegible(s.razon)}</span>
                </p>
            )}
            {s.dato && (
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">
                    <span className="text-white/45">Dato propio{s.dato.fuente ? ` (${s.dato.fuente})` : ''}: </span>
                    {s.dato.texto}
                </p>
            )}
            {!s.dato && !s.sostiene && !s.texto && s.cita && <Cita texto={s.cita} pagina={s.pagina} />}
            {!s.dato && (s.sostiene || s.texto) && s.cita && (
                <details className="group mt-0.5">
                    <summary className="cursor-pointer list-none text-[12px] text-white/40 hover:text-white/70">
                        <span className="group-open:hidden">ver la cita del {esRecurso ? 'agravio' : 'concepto'}</span>
                        <span className="hidden group-open:inline">ocultar la cita</span>
                    </summary>
                    <Cita texto={s.cita} pagina={s.pagina} />
                </details>
            )}
        </li>
    );
}

export default function ComoSeEstudiara({
    estado, problemas, razones, onRazon, onAceptarPropuesta, puedeAceptar, esRecurso = false,
}: {
    estado: EstadoDelPlan;
    problemas: ProblemaJuridico[];
    /** Lo que escribió para cada argumento pendiente de razón, por id. */
    razones: Record<string, string>;
    onRazon: (id: string, texto: string) => void;
    /** Aceptar una afinación del plan cambia el sentido EN PANTALLA, igual
     *  que pulsar esa calificación a mano. */
    onAceptarPropuesta: (p: ProblemaJuridico, a: string) => void;
    /** Si esa calificación existe en la pantalla (las diez de siempre). */
    puedeAceptar: (a: string) => boolean;
    esRecurso?: boolean;
}) {
    const { fase, respuesta, desactualizado, error } = estado;
    if (fase === 'inactivo') return null;
    const plan = respuesta?.plan ?? null;
    const porId = new Map<string, SegmentoDelPlan>();
    (plan?.segmentos ?? []).forEach((s) => porId.set(s.id, s));
    const proposicion = (id: string) => plan?.proposiciones.find((p) => p.id === id);
    const quien = esRecurso ? 'agravio' : 'concepto';

    const pendRazon = (plan?.segmentos ?? []).filter((s) => s.pendiente === 'razon');
    const pendSentido = (plan?.segmentos ?? []).filter((s) => s.pendiente === 'sentido');
    const enUnidad = new Set<string>();
    (plan?.unidades ?? []).forEach((u) => u.segmentos.forEach((id) => enUnidad.add(id)));
    const sueltos = (plan?.segmentos ?? []).filter((s) => !enUnidad.has(s.id) && !s.pendiente);
    /* DÓNDE SE EXPONE CADA PREMISA: en la primera unidad que la usa; en las
       demás se remite a ésa. Es lo que evita escribir dos veces la misma
       regla, que era la mitad de la repetición medida. */
    const expuestaEn = new Map<string, string>();
    (plan?.unidades ?? []).forEach((u) => {
        if (u.premisa && !expuestaEn.has(u.premisa)) expuestaEn.set(u.premisa, u.id);
    });
    const avisos = [...(plan?.avisos ?? []), ...(respuesta?.avisos ?? [])]
        .filter((a, i, xs) => a && xs.indexOf(a) === i);

    const insignia = fase === 'pidiendo' || fase === 'en_curso' ? 'ordenando…'
        : fase === 'esperando' && !plan ? 'en espera'
        : desactualizado ? 'se reordenará'
        : fase === 'listo' ? 'listo'
        : fase === 'fallo' ? 'no se pudo'
        : fase === 'sin_plan' ? 'sin plan' : '';

    return (
        <div id="como-se-estudiara" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">Cómo se estudiará</p>
                {insignia && (
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
                        fase === 'listo' && !desactualizado ? 'border-accent-gold/45 text-accent-gold'
                            : fase === 'fallo' ? 'border-amber-400/40 text-amber-300'
                            : 'border-white/15 text-white/50')}>
                        {(fase === 'pidiendo' || fase === 'en_curso') && <Loader2 className="h-3 w-3 animate-spin" />}
                        {insignia}
                    </span>
                )}
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                El orden del estudio con tu decisión: qué {quien}s se contestan juntos y por qué, dónde se
                expone cada premisa —una sola vez— y qué dato propio trae cada argumento. El sentido sigue
                siendo el tuyo; lo que el plan crea que debe calificarse distinto, te lo propone abajo.
            </p>

            {/* ── SIN PLAN TODAVÍA ── */}
            {!plan && fase === 'esperando' && (
                <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                    Se ordena solo unos segundos después de tu último cambio, cuando cada problema tiene su
                    sentido y, donde te apartas de la propuesta, tu razón.
                </p>
            )}
            {!plan && (fase === 'pidiendo' || fase === 'en_curso') && (
                <div className="mt-3 flex items-center gap-2 text-[13px] text-white/60">
                    <Loader2 className="h-4 w-4 animate-spin text-accent-gold" />
                    Ordenando el estudio con tu decisión. Suele tardar menos de un minuto; puedes seguir revisando.
                </div>
            )}
            {(fase === 'fallo' || fase === 'sin_plan') && (
                <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-amber-300/90">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                        {fase === 'fallo' ? 'No se pudo ordenar el estudio' : 'Aún no hay plan para esta decisión'}
                        {error ? `: ${error}` : '.'} Al generar se intenta otra vez; si tampoco sale, el estudio se
                        escribe sin plan y lo dice en los avisos.
                    </span>
                </p>
            )}

            {plan && (
                <div className={cn('mt-3 space-y-3 transition-opacity', desactualizado && 'opacity-60')}>
                    {desactualizado && (
                        <p className="text-[12px] leading-relaxed text-white/50">
                            Es el orden de tu decisión anterior. Se rehace unos segundos después de tu último cambio.
                        </p>
                    )}

                    {/* ── 1 · DECISIÓN 6: LA RAZÓN QUE TU CRITERIO NO CONTESTA ──
                        David, opción a: «el panel pide la razón que falta antes
                        de generar; si no la escribe, el estudio desarrolla ese
                        argumento con el material y lo pone PRIMERO en
                        ADVERTENCIAS». Va arriba porque es lo único del panel que
                        le pide algo. No bloquea: avisa. */}
                    {pendRazon.length > 0 && (
                        <Seccion tono="ambar" titulo={`Razón que tu criterio no contesta · ${pendRazon.length}`}
                                 nota={`Su problema ya tiene sentido, pero tu razón no responde lo que ${pendRazon.length === 1 ? 'este argumento plantea' : 'estos argumentos plantean'} por su cuenta. Escríbela aquí y el estudio la seguirá como tuya. Si la dejas en blanco, el estudio lo desarrolla con el material y te lo dice primero en las advertencias.`}>
                            <ul className="space-y-3">
                                {pendRazon.map((s) => {
                                    const pr = problemaDelSegmento(s, problemas);
                                    return (
                                        <li key={s.id}>
                                            <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                                                <span className="font-semibold text-accent-gold/90">{s.id}</span>
                                                {pr && <span className="text-white/50">problema {pr.n}</span>}
                                                {s.etiqueta && <span className="text-white/75">· {etiquetaLegible(s.etiqueta)}</span>}
                                                {s.diferencia && <span className="text-white/50">· {DIFERENCIA[s.diferencia] ?? humano(s.diferencia)}</span>}
                                            </p>
                                            {(s.sostiene || s.texto) && (
                                                <p className="mt-0.5 text-[12px] leading-relaxed text-white/65">{s.sostiene || s.texto}</p>
                                            )}
                                            <Cita texto={s.cita} pagina={s.pagina} />
                                            <label htmlFor={`razon-${s.id}`} className="sr-only">Tu razón para {s.id}</label>
                                            <textarea id={`razon-${s.id}`} rows={2} value={razones[s.id] ?? ''}
                                                      onChange={(e) => onRazon(s.id, e.target.value)}
                                                      placeholder="Por qué se resuelve así este argumento…"
                                                      className="mt-1.5 w-full resize-y rounded-xl border border-amber-400/30 bg-black/30 px-3 py-2 text-[13px] leading-relaxed text-white/90 outline-none placeholder:text-white/40 focus:border-accent-gold/45" />
                                        </li>
                                    );
                                })}
                            </ul>
                        </Seccion>
                    )}

                    {/* ── 2 · SIN SENTIDO FIJADO ── */}
                    {pendSentido.length > 0 && (
                        <Seccion tono="ambar" titulo={`Sin sentido fijado · ${pendSentido.length}`}
                                 nota="Ningún problema decide la suerte de estos argumentos. Revisa si falta un problema o si alguno debe cubrirlos: sin sentido no hay calificación que demostrar.">
                            <ul className="space-y-1">
                                {pendSentido.map((s) => <RenglonSegmento key={s.id} s={s} esRecurso={esRecurso} />)}
                            </ul>
                        </Seccion>
                    )}

                    {/* ── 3 · LAS PROPUESTAS DEL PLAN ──
                        El plan no toca la calificación: si cree que otra encaja
                        mejor, lo dice aquí y el botón hace exactamente lo mismo
                        que pulsar esa pastilla en la pantalla. */}
                    {plan.propuestas.length > 0 && (
                        <Seccion tono="oro" titulo={`Propuestas del plan · ${plan.propuestas.length}`}
                                 nota="No se aplican solas. Si aceptas una, cambia la calificación de todo su problema, como si la marcaras a mano.">
                            <ul className="space-y-2.5">
                                {plan.propuestas.map((pp: PropuestaDelPlan, k) => {
                                    const s = porId.get(pp.seg);
                                    const pr = s ? problemaDelSegmento(s, problemas) : null;
                                    const hecha = !!pr && (pr.p.sentido || '').toLowerCase() === pp.a.toLowerCase();
                                    const cabe = !!pr && puedeAceptar(pp.a);
                                    return (
                                        <li key={`${pp.seg}-${k}`} className="text-[13px]">
                                            <p className="flex flex-wrap items-baseline gap-x-2">
                                                <span className="font-semibold text-accent-gold/90">{pp.seg}</span>
                                                <span className="text-white/75">
                                                    de {etiquetaLegible(pp.de) || 'su calificación'} a <span className="font-medium text-white">{etiquetaLegible(pp.a)}</span>
                                                </span>
                                            </p>
                                            {pp.porQue && <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">{pp.porQue}</p>}
                                            <div className="mt-1.5">
                                                {hecha ? (
                                                    <span className="inline-flex items-center gap-1 text-[12px] text-accent-gold/90">
                                                        <Check className="h-3.5 w-3.5" /> Aceptada: el problema {pr?.n} va {etiquetaLegible(pp.a)}.
                                                    </span>
                                                ) : cabe && pr ? (
                                                    <button type="button" onClick={() => onAceptarPropuesta(pr.p, pp.a)}
                                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent-gold/40 px-3 text-[12px] font-medium text-accent-gold transition-colors hover:bg-accent-gold/10">
                                                        <Check className="h-3.5 w-3.5" />
                                                        Aceptar: el problema {pr.n} pasa a {etiquetaLegible(pp.a)}
                                                    </button>
                                                ) : (
                                                    <span className="text-[12px] text-white/45">
                                                        {pr ? 'Esa calificación no está entre las de la pantalla: si la compartes, márcala a mano.'
                                                            : 'No se pudo ubicar su problema en la pantalla: revísalo a mano.'}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Seccion>
                    )}

                    {/* ── 4 · LOS APARTADOS: QUÉ VA JUNTO Y POR QUÉ ── */}
                    {plan.unidades.length > 0 && (
                        <div className="space-y-2">
                            {plan.unidades.map((u) => {
                                const segs = u.segmentos.map((id) => porId.get(id)).filter((s): s is SegmentoDelPlan => !!s);
                                const atacan = Array.from(new Set(segs.map((s) => s.ataca).filter(Boolean)));
                                const razonesU = Array.from(new Set(segs.map((s) => s.razon).filter(Boolean)));
                                const vicios = Array.from(new Set(segs.map((s) => s.vicio).filter(Boolean)));
                                const mezcla = atacan.length > 1 || razonesU.length > 1 || vicios.length > 1;
                                const p1 = atacan.length === 1 ? proposicion(atacan[0]) : undefined;
                                const premisa = u.premisa ? plan.premisas.find((m) => m.id === u.premisa) : undefined;
                                const expone = !!u.premisa && expuestaEn.get(u.premisa) === u.id;
                                const nums = u.problemas.map((x) => (typeof x === 'number' ? String(x + 1) : x));
                                return (
                                    <section key={u.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                                        <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                                            <span className="font-semibold text-white/90">{u.id}</span>
                                            {nums.length > 0 && (
                                                <span className="text-white/50">
                                                    {nums.length === 1 ? `problema ${nums[0]}` : `problemas ${nums.join(', ')}`}
                                                </span>
                                            )}
                                            <span className="text-white/45">· {segs.length} {segs.length === 1 ? 'argumento' : 'argumentos'}</span>
                                        </p>
                                        {/* POR QUÉ VAN JUNTOS. Si comparten consideración,
                                            razón y vicio, se dice; si no, es porque él los
                                            juntó, y entonces cada consideración lleva su
                                            respuesta dentro del mismo apartado (V0 e). */}
                                        {segs.length > 1 && (
                                            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                                                {mezcla
                                                    ? 'Los juntaste tú: van en un solo apartado, pero cada consideración que atacan recibe su propia respuesta.'
                                                    : <>Van juntos porque atacan la misma consideración{atacan[0] ? <> ({atacan[0]}{p1?.dice ? <>: «{p1.dice}»</> : null})</> : null}
                                                        {vicios[0] ? <>, con el mismo vicio ({VICIO[vicios[0]] ?? humano(vicios[0])})</> : null}
                                                        {razonesU[0] ? <>, y los decide la misma razón: {razonLegible(razonesU[0])}</> : null}.</>}
                                            </p>
                                        )}
                                        {segs.length === 1 && atacan[0] && p1?.dice && (
                                            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                                                Ataca {atacan[0]}: «{p1.dice}».
                                            </p>
                                        )}
                                        {u.premisa && (
                                            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                                                {expone
                                                    ? <><span className="font-medium text-accent-gold/90">Aquí se expone la premisa {u.premisa}</span>
                                                        {premisa?.respondeA.length ? <> · responde a {premisa.respondeA.join(', ')}</> : null}
                                                        {premisa?.tesis.length ? <> · tesis {premisa.tesis.join(', ')}</> : null}
                                                        {premisa?.normas.length ? <> · {premisa.normas.join(', ')}</> : null}
                                                        {premisa?.anclas.length ? <> · anclas: {premisa.anclas.join(' | ')}</> : null}</>
                                                    : <>Remite a la premisa {u.premisa}, expuesta en {expuestaEn.get(u.premisa)}: no se vuelve a escribir.</>}
                                            </p>
                                        )}
                                        {u.objecion?.de && (
                                            <p className="mt-1 text-[12px] leading-relaxed text-white/50">
                                                La objeción ({u.objecion.de}) se contesta aquí, una sola vez.
                                            </p>
                                        )}
                                        <ul className="mt-1.5 divide-y divide-white/[0.05]">
                                            {segs.map((s) => <RenglonSegmento key={s.id} s={s} esRecurso={esRecurso} />)}
                                        </ul>
                                    </section>
                                );
                            })}
                        </div>
                    )}

                    {/* ── 5 · LO QUE NO VA EN NINGÚN APARTADO ── */}
                    {sueltos.length > 0 && (
                        <details className="group rounded-xl border border-white/[0.07] bg-black/20">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[13px] text-white/60 hover:text-white">
                                <span>Residuales y lo que no se estudia · {sueltos.length}</span>
                                <span className="text-[12px] text-white/45">
                                    <span className="group-open:hidden">ver</span><span className="hidden group-open:inline">ocultar</span>
                                </span>
                            </summary>
                            <ul className="divide-y divide-white/[0.05] px-3 pb-2">
                                {sueltos.map((s) => <RenglonSegmento key={s.id} s={s} esRecurso={esRecurso} />)}
                            </ul>
                        </details>
                    )}

                    {plan.orden?.porQue && (
                        <p className="text-[12px] leading-relaxed text-white/50">
                            Orden: {plan.orden.criterio ? `${humano(plan.orden.criterio)} · ` : ''}{plan.orden.porQue}
                        </p>
                    )}

                    {/* ── 6 · AVISOS AL SECRETARIO ── */}
                    {avisos.length > 0 && (
                        <ul className="space-y-1 text-[12px] leading-relaxed text-white/60">
                            {avisos.map((a, k) => (
                                <li key={k} className="flex gap-2">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold/70" />
                                    <span>{a}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {respuesta?.corridas != null && respuesta?.tope != null && (
                        <p className="text-[12px] text-white/40">
                            Ordenado {respuesta.corridas} de {respuesta.tope} veces posibles en este asunto.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
