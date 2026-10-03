/**
 * El trámite en este tribunal: lo que pasó desde que el asunto llegó.
 *
 * LOS DATOS PRIMERO, LA PROSA DESPUÉS (3-oct-2026)
 * ════════════════════════════════════════════════
 * David: «que el "adelanto" —que ahora serán resultandos y considerandos de
 * procedencia, no adelanto— vayan impecables, disminuyendo el margen de error
 * si el secretario introduce el auto de admisión y los datos correctos
 * (fechas)».
 *
 * Medido en los diez proyectos de octubre: los resultandos de trámite y de
 * turno se escribían sin el auto de admisión ni el de turno delante. Salieron
 * fechas imposibles declaradas «oportunas», el Ministerio Público «omitió
 * formular pedimento» sin fuente en 71 de 72, una «Oficialía de Partes de
 * este Tribunal» inventada y el amparo adhesivo ignorado. Aquí el secretario
 * ve —prellenado con lo que se leyó del auto— cada dato con el que se van a
 * componer esos resultandos, y lo corrige antes de que se escriba nada.
 *
 * NADA SE SUPONE. Un campo vacío no es «no hubo»: el servidor lo busca en los
 * papeles y, si no consta en ninguno, el proyecto sale con el hueco
 * «*********» y un aviso que nombra el dato. Por eso el Ministerio Público
 * tiene una tercera opción —«no consta»— que hace callar al proyecto en vez de
 * afirmar lo que nadie leyó.
 *
 * UN DATO, UN CAMPO. El órgano que dictó el acto se pide aquí en los tres
 * recursos; en el amparo directo es la autoridad responsable de la carátula
 * de la ficha y pedirlo dos veces es invitar a escribirlo de dos formas.
 * (Hasta el 3-oct-2026 la queja y la revisión fiscal también lo llevaban en
 * la carátula —«órgano que dictó el auto», «Sala responsable»—; David quitó
 * esos renglones del rubro —C3 y C4— y su único campo pasó a ser éste.)
 *
 * SEGUNDA RONDA (3-oct-2026): tres datos más, cada uno donde se usa. En el
 * amparo directo, el PRECEPTO QUE RIGE EL SURTIMIENTO de la notificación de la
 * sentencia reclamada —lo rige la ley del acto, que cambia de una entidad a
 * otra, y el considerando de oportunidad lo citaba de memoria—. En la revisión
 * fiscal, la FRACCIÓN DEL ARTÍCULO 63 de la LFPCA que hace procedente el
 * recurso y, sólo con la fracción I, la CUANTÍA. Los tres son opcionales: lo
 * que se deja vacío lo busca el proyecto y, si no consta, lo deja en hueco.
 *
 * Y TODO ESTO SÓLO CON LA BANDERA `procedencia_por_tipo` de la cuenta: la
 * página no pinta esta tarjeta si el servidor no la va a usar.
 *
 * TERCERA RONDA (3-oct-2026): AL RETOMAR UN ASUNTO, LO LEÍDO SIGUE SIENDO
 * LEÍDO. La sesión devolvía la ficha entera y la tarjeta la ponía sin marca:
 * al generar otra vez, lo que se había leído de los papeles viajaba como dato
 * del secretario y le ganaba a la relectura del acto corregido (rev_6, AR con
 * el juzgado y el juicio cambiados sin aviso). Ahora cada dato leído lleva la
 * marca de DÓNDE se leyó —el auto, la sentencia, el escrito— y, al retomar, no
 * viaja hasta que el secretario lo cambie o lo confirme.
 *
 * CUARTA RONDA (3-oct-2026, FIXES_R4 E7): EL AUTO QUE FORMA Y REGISTRA, APARTE
 * DEL QUE ADMITE. Un solo campo para los dos hacía que el resultando dijera
 * que el auto de admisión también registró el asunto: falso en la queja de la
 * fracción II (Q_335: registro y petición del informe el 14 de octubre,
 * admisión el 3 de noviembre; salió el 3 de noviembre en los dos) y en la
 * revisión fiscal con declinatoria (RF_7: radicado el 10 de febrero, admitido
 * el 15 de mayo). Es opcional: vacío, un mismo auto registró y admitió.
 * Y EL PONENTE, CON SU CARGO (E3): el rótulo «MAGISTRADA PONENTE» o
 * «MAGISTRADO PONENTE» sale de lo escrito, nunca del nombre de pila; la ayuda
 * pide copiarlo con el cargo, como lo dice el auto.
 *
 * QUINTA RONDA (3-oct-2026, C6): LOS ASUNTOS RELACIONADOS, CON UN CLIC. David:
 * «siempre y cuando haya asuntos relacionados. No vamos a meter conexidad en
 * automático. Hay que habilitar en el taller la opción de con un clic precisar
 * si existen asuntos relacionados y con ello se genera el considerando». Un
 * interruptor apagado por omisión; encendido, hasta cuatro filas con el tipo,
 * el número y si se resuelve en la misma sesión o ya se resolvió. Es dato del
 * secretario y de nadie más: nunca se lee de los papeles ni lleva la marca de
 * «leído».
 */
'use client';

import React from 'react';
import { Tarjeta, Rotulo } from './primitivas';
import Calendario from './Calendario';
import {
    familiaDelTramite, clavesDelTramite, FRACCIONES_63, type Tramite, type ClaveTramite, type TipoAsunto,
    type FuentesTramite, type TramiteRetomado,
    TIPOS_RELACIONADO, ESTADOS_RELACIONADO, MAX_RELACIONADOS, NUMERO_RELACIONADO,
    filasDeRelacionados, filasARelacionados, tipoRelacionadoDe, numeroRelacionadoDe,
    type FilaRelacionado, type TipoRelacionado,
} from './api';

/* El mismo campo que la ficha del asunto (FormularioEncargo): mismo borde,
   mismo fondo, mismo foco dorado. Dos tarjetas seguidas con dos estilos de
   campo se leen como dos pantallas distintas. */
const campo = 'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 ' +
    'text-[14px] text-white/90 outline-none transition placeholder:text-white/45 ' +
    'focus:border-accent-gold/40 focus:bg-white/[0.06]';

/* EL CAMPO DICE DE DÓNDE SE LEYÓ EL DATO, mientras siga siendo el leído.
   Si el secretario lo cambia, la marca se va: lo que queda ya es suyo. Va
   DEBAJO del campo y no junto al rótulo: en las dos columnas del raíl la
   marca se montaba sobre el rótulo de al lado (visto en la muestra del AR).
   `marca` es el origen ya escrito («del auto», «de la sentencia
   recurrida»…); vacía, no hay marca. */
function Campo({ etiqueta, ayuda, children, sinLabel, marca }: {
    etiqueta: string; ayuda?: string; children: React.ReactNode;
    /** Los campos con calendario se pintan como grupo: un <label> reenvía
     *  cada clic al primer control y el día no se podía fijar (ver
     *  FormularioEncargo). */
    sinLabel?: boolean;
    marca?: string;
}) {
    const rotulo = (
        <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-white/45">
            {etiqueta}
        </span>
    );
    const pie = (
        <>
            {marca && (
                <span className="mt-1 block text-[12px] text-emerald-300/80">{marca} · compruébalo</span>
            )}
            {ayuda && <span className="mt-1 block text-[12px] leading-relaxed text-white/45">{ayuda}</span>}
        </>
    );
    if (sinLabel) {
        return (
            <div className="block" role="group" aria-label={etiqueta}>
                {rotulo}{children}{pie}
            </div>
        );
    }
    return <label className="block">{rotulo}{children}{pie}</label>;
}

/* Un apartado dentro de la tarjeta: rótulo pequeño y una línea encima. */
function Apartado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-3 border-t border-white/[0.07] pt-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">{titulo}</p>
            {children}
        </div>
    );
}

/* LO QUE NO SIEMPRE OCURRE SE ABRE A PROPÓSITO. El returno y el adhesivo no
   están en la mayoría de los asuntos: enseñar sus cinco campos vacíos cada
   vez hace creer que faltan datos. Se abren con un clic, y se abren solos si
   el auto ya los trae. */
function Opcional({ abierto, onAbrir, onQuitar, rotulo, quitar, children }: {
    abierto: boolean; onAbrir: () => void; onQuitar: () => void;
    rotulo: string; quitar: string; children: React.ReactNode;
}) {
    if (!abierto) {
        return (
            <button type="button" onClick={onAbrir}
                    className="w-full rounded-xl border border-dashed border-white/15 bg-white/[0.02]
                               px-3.5 py-2.5 text-left text-[13px] text-white/60 transition-colors
                               hover:border-accent-gold/35 hover:text-white/75">
                + {rotulo}
            </button>
        );
    }
    return (
        <div className="grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
            {children}
            <button type="button" onClick={onQuitar}
                    className="justify-self-start text-[12px] text-white/45 underline underline-offset-2
                               transition-colors hover:text-white/75">
                {quitar}
            </button>
        </div>
    );
}

const ADHESIVO: ClaveTramite[] = ['adhesivo_quien', 'adhesivo_presentacion',
                                  'adhesivo_admision', 'adhesivo_notificacion'];
const RETURNO: ClaveTramite[] = ['fecha_returno', 'ponente_returno'];

/** La clave del catálogo de cada familia: la fila nueva propone el mismo
 *  tipo que este asunto, y con el número se sabe si se nombra a sí mismo. */
const TIPO_DE_FAMILIA: Record<'AD' | 'AR' | 'Q' | 'RF', TipoRelacionado> = {
    AD: 'amparo_directo', AR: 'amparo_revision', Q: 'queja', RF: 'revision_fiscal',
};

/** LO QUE ESTÁ MAL EN UNA FILA, dicho donde se escribió, o '' si vale (o si
 *  el número aún está vacío: recién abierta no se regaña). La fila que no
 *  vale no viaja (`relacionadosDe`); la que repite otra cuenta una vez; la que
 *  nombra este mismo asunto la tira el servidor con un aviso. */
export function problemaDeFila(filas: FilaRelacionado[], i: number,
                               propio: { tipo: string; numero?: string }): string {
    const f = filas[i];
    const n = f.numero.trim();
    if (!n) return '';
    if (!NUMERO_RELACIONADO.test(n)) return 'Escríbelo como 452/2025: número, barra y año. Así no viaja.';
    const t = tipoRelacionadoDe(f.tipo);
    const k = numeroComparable(n);
    if (filas.slice(0, i).some((g) => tipoRelacionadoDe(g.tipo) === t && numeroComparable(g.numero) === k)) {
        return 'Repetido: ya está en otra fila y cuenta una vez.';
    }
    if (t === propio.tipo && k && k === numeroComparable(propio.numero ?? '')) {
        return 'Es el número de este asunto: no se relaciona consigo mismo.';
    }
    return '';
}

/** EL NÚMERO PARA COMPARAR, NO PARA ESCRIBIR (revisión del front, 3-oct-2026):
 *  sin espacios y sin ceros a la izquierda, como `tipos_asunto._numero_normalizado`
 *  en el servidor. La ficha acepta «24 / 2026» y «024/2026» como número del
 *  asunto, y la fila ya viene sin espacios: comparadas tal cual, el aviso del
 *  propio número no saltaba. */
export function numeroComparable(x: string): string {
    const n = numeroRelacionadoDe(x);
    const m = /^(\d{1,6})\/(\d{4})$/.exec(n);
    return m ? `${parseInt(m[1], 10)}/${m[2]}` : n;
}

/* LOS IDS DE LA TARJETA (accesibilidad, revisión del front, 3-oct-2026): el
   interruptor y su ayuda, y el aviso de cada fila, ligados por
   `aria-describedby`; el rótulo ya no se traga la ayuda como nombre. */
const ID_INTERRUPTOR = 'relacionados-interruptor';
const ID_AYUDA = 'relacionados-ayuda';

/* ═══ LOS ASUNTOS RELACIONADOS (3-oct-2026, C6) ═══
   Un interruptor y, encendido, las filas. Todo vive en UNA cadena —la del
   contrato, «tipo|numero|estado;…»— para que viaje, se retome y se compare
   en la huella igual que las demás claves; aquí se lee con
   `filasDeRelacionados`, que conserva lo que aún no vale (el número a medio
   teclear), y lo que viaja pasa por `relacionadosDe`, que sólo deja lo que
   vale. Apagado no queda nada: no viaja nada.
   EL INTERRUPTOR ES LAS FILAS: encenderlo abre la primera, quitar la última
   lo apaga y, al retomar, vuelve encendido si hay filas. Sin estado propio,
   no puede decir «encendido» sobre una lista vacía ni al revés. (Se exporta
   para la comprobación: sin hooks, se llama como función y se pulsa.) */
export function AsuntosRelacionados({ valor, onCambiar, propio, numeroAsunto }: {
    valor: string;
    onCambiar: (v: string) => void;
    propio: TipoRelacionado;
    numeroAsunto?: string;
}) {
    const filas = filasDeRelacionados(valor);
    const encendido = filas.length > 0;
    const nueva = (): FilaRelacionado => ({ tipo: propio, numero: '', estado: 'misma_sesion' });
    const poner = (fs: FilaRelacionado[]) => onCambiar(filasARelacionados(fs));
    const alternar = (si: boolean) => poner(si ? (filas.length ? filas : [nueva()]) : []);
    const cambiarFila = (i: number, cambio: Partial<FilaRelacionado>) =>
        poner(filas.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
    /* AL QUITAR LA ÚLTIMA, EL FOCO VUELVE AL INTERRUPTOR (accesibilidad): el
       botón que se pulsó desaparece con la fila y el foco se perdía. Sin hooks
       —la comprobación llama al componente como función—, por su id y sólo
       en el navegador. */
    const quitarFila = (i: number) => {
        poner(filas.filter((_, j) => j !== i));
        if (filas.length === 1 && typeof document !== 'undefined') {
            setTimeout(() => document.getElementById(ID_INTERRUPTOR)?.focus(), 0);
        }
    };

    return (
        <div className="grid gap-3 border-t border-white/[0.07] pt-4">
            <div className="flex items-start gap-2.5">
                <input type="checkbox" role="switch" id={ID_INTERRUPTOR} checked={encendido}
                       aria-describedby={ID_AYUDA}
                       onChange={(e) => alternar(e.target.checked)}
                       className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#c9a962] [color-scheme:dark]" />
                <div>
                    <label htmlFor={ID_INTERRUPTOR}
                           className="block cursor-pointer text-[13px] leading-snug text-white/80">
                        Hay asuntos relacionados
                    </label>
                    <p id={ID_AYUDA} className="mt-1 block text-[12px] leading-relaxed text-white/45">
                        Sólo si existen. Con esto el proyecto lleva el considerando de conexidad (o de
                        hecho notorio) y el rubro dice “RELACIONADO CON…”.
                    </p>
                </div>
            </div>

            {encendido && filas.map((f, i) => {
                const problema = problemaDeFila(filas, i, { tipo: propio, numero: numeroAsunto });
                const tipo = tipoRelacionadoDe(f.tipo) || propio;
                return (
                    <div key={i} role="group" aria-label={`Asunto relacionado ${i + 1}`}
                         className="grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Campo etiqueta="Tipo">
                                <select className={campo} value={tipo}
                                        onChange={(e) => cambiarFila(i, { tipo: e.target.value })}>
                                    {TIPOS_RELACIONADO.map((t) => (
                                        <option key={t.clave} value={t.clave} className="bg-charcoal-900">
                                            {t.etiqueta}
                                        </option>
                                    ))}
                                </select>
                            </Campo>
                            {/* EL AVISO ES DESCRIPCIÓN, NO NOMBRE (accesibilidad): fuera del
                                rótulo y ligado por `aria-describedby`. Y LA FILA VACÍA LO DICE
                                AL SALIR (revisión del front, 3-oct-2026): con el interruptor
                                encendido y el número en blanco la fila no viaja y el proyecto
                                salía sin rubro ni conexidad, sin una señal. Recién abierta no
                                se regaña: la fila nueva recibe el foco y el aviso sólo se ve
                                con el campo vacío y sin foco (`peer-placeholder-shown`,
                                `peer-focus`). */}
                            <div>
                                <label htmlFor={`relacionado-${i}-numero`}
                                       className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-white/45">
                                    Número
                                </label>
                                <input id={`relacionado-${i}-numero`} className={`peer ${campo}`} value={f.numero}
                                       placeholder="452/2025"
                                       autoFocus={!f.numero.trim() && i === filas.length - 1}
                                       aria-invalid={problema ? true : undefined}
                                       aria-describedby={problema ? `relacionado-${i}-problema`
                                           : !f.numero.trim() ? `relacionado-${i}-vacio` : undefined}
                                       onChange={(e) => cambiarFila(i, { numero: e.target.value })} />
                                {problema ? (
                                    <span id={`relacionado-${i}-problema`}
                                          className="mt-1 block text-[12px] leading-relaxed text-amber-300/90">
                                        {problema}
                                    </span>
                                ) : !f.numero.trim() && (
                                    <span id={`relacionado-${i}-vacio`}
                                          className="mt-1 hidden text-[12px] leading-relaxed text-amber-300/90
                                                     peer-placeholder-shown:block peer-focus:hidden">
                                        Falta el número: así no viaja.
                                    </span>
                                )}
                            </div>
                        </div>
                        <Campo etiqueta="Estado">
                            <select className={campo} value={f.estado === 'resuelto' ? 'resuelto' : 'misma_sesion'}
                                    onChange={(e) => cambiarFila(i, { estado: e.target.value })}>
                                {ESTADOS_RELACIONADO.map((s) => (
                                    <option key={s.clave} value={s.clave} className="bg-charcoal-900">
                                        {s.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                        <button type="button" onClick={() => quitarFila(i)}
                                aria-label={`Quitar el asunto relacionado ${i + 1}`}
                                className="justify-self-start text-[12px] text-white/45 underline underline-offset-2
                                           transition-colors hover:text-white/75">
                            Quitar
                        </button>
                    </div>
                );
            })}

            {encendido && filas.length < MAX_RELACIONADOS && (
                <button type="button" onClick={() => poner([...filas, nueva()])}
                        className="w-full rounded-xl border border-dashed border-white/15 bg-white/[0.02]
                                   px-3.5 py-2.5 text-left text-[13px] text-white/60 transition-colors
                                   hover:border-accent-gold/35 hover:text-white/75">
                    + Añadir otro
                </button>
            )}
        </div>
    );
}

export default function TramiteDelTribunal({ valor, onCambiar, tipoAsunto, tipo, leido, fuentes,
                                             sinConfirmar, onConfirmarLeido,
                                             adherente, deshabilitado, mesInicial, numeroAsunto }: {
    valor: Tramite;
    onCambiar: (t: Tramite) => void;
    /** La clave del tipo: decide qué apartados lleva el trámite. */
    tipoAsunto: string;
    /** El tipo del catálogo, para el vocabulario («la sentencia reclamada»,
     *  «el auto recurrido»). Si aún no llega, se usa uno neutro. */
    tipo?: TipoAsunto;
    /** Lo que se leyó de los papeles, tal cual llegó: la marca se ve mientras
     *  el campo conserve ese valor. */
    leido?: Tramite;
    /** De dónde se leyó cada dato de `leido` («auto», «acto», «escrito»,
     *  «papeles»). Sin fuente, «del auto»: es lo que propone el auto de
     *  admisión recién subido. */
    fuentes?: FuentesTramite;
    /** AL RETOMAR: lo leído que NO viaja mientras el secretario no lo cambie
     *  o lo confirme (ver `sinLoNoTocado`). */
    sinConfirmar?: Tramite;
    /** Confirma lo leído que está A LA VISTA (las claves que recibe): desde
     *  ahí viaja como suyo. */
    onConfirmarLeido?: (claves: ClaveTramite[]) => void;
    /** Amparo en revisión: el recurrente adhesivo que se escribió en la
     *  carátula. Es la misma persona: se propone aquí para no teclearla dos
     *  veces, y la pantalla la manda si este campo se deja intacto. */
    adherente?: string;
    deshabilitado?: boolean;
    /** AAAA-MM en que abren los calendarios vacíos: el de la presentación. */
    mesInicial?: string;
    /** El número de este asunto («24/2026»), si ya se sabe: una fila de
     *  «asuntos relacionados» con el mismo tipo y número se señala ahí mismo
     *  (el servidor la tiraría con un aviso). Opcional. */
    numeroAsunto?: string;
}) {
    const familia = familiaDelTramite(tipoAsunto);

    const set = (k: ClaveTramite, v: string) => onCambiar({ ...valor, [k]: v });
    const quitarClaves = (ks: ClaveTramite[]) => {
        const t: Record<string, string> = { ...(valor as Record<string, string>) };
        for (const k of ks) t[k] = '';
        onCambiar(t as Tramite);
    };
    const esLeido = (k: ClaveTramite) =>
        !!leido?.[k] && leido[k] === valor[k];
    const v = (k: ClaveTramite) => (valor[k] ?? '') as string;
    /* Lo leído al retomar que sigue sin tocarse: no viaja. Si hay, la tarjeta
       lo dice y ofrece confirmarlo. */
    const vista = new Set(clavesALaVista(tipoAsunto, valor));
    const pendientes = (Object.keys(sinConfirmar ?? {}) as ClaveTramite[])
        .filter((k) => vista.has(k) && !!sinConfirmar?.[k] && sinConfirmar[k] === valor[k]);

    /* EL ADHESIVO DE LA REVISIÓN YA PUEDE ESTAR EN LA CARÁTULA. Mientras el
       campo de aquí no se haya tocado (`undefined`), se enseña ése. */
    const quienAdhesivo = valor.adhesivo_quien !== undefined
        ? valor.adhesivo_quien : (familia === 'AR' ? (adherente ?? '') : '');
    const hayAdhesivo = ADHESIVO.some((k) => !!v(k)) || (familia === 'AR' && !!quienAdhesivo);
    const hayReturno = RETURNO.some((k) => !!v(k));
    const [abreAdhesivo, setAbreAdhesivo] = React.useState(false);
    const [abreReturno, setAbreReturno] = React.useState(false);

    if (!familia) return null;

    // EL VOCABULARIO DEL TIPO. «de el auto recurrido» no es español: la
    // contracción depende del artículo del nombre (igual que en la ficha).
    const recurrido = tipo?.recurrido
        || ({ AD: 'la sentencia reclamada', AR: 'la sentencia recurrida',
              Q: 'el auto recurrido', RF: 'la sentencia recurrida' } as const)[familia];
    const deRecurrido = recurrido.startsWith('el ') ? `del ${recurrido.slice(3)}` : `de ${recurrido}`;
    const nombreAdhesivo = familia === 'AD' ? 'amparo adhesivo' : 'revisión adhesiva';
    const loPrincipal = familia === 'AD' ? 'la demanda' : 'el recurso';
    /* DE DÓNDE SE LEYÓ, dicho como lo diría el secretario. «papeles» cuando
       el servidor no lo precisa: nunca se afirma un origen que no consta. */
    const origen = (k: ClaveTramite) => {
        const f = fuentes?.[k];
        if (!f || f === 'auto') return 'del auto';
        if (f === 'acto') return deRecurrido;
        if (f === 'escrito') return 'del escrito';
        return 'de los papeles';
    };
    const marcaDe = (k: ClaveTramite) => (esLeido(k) ? origen(k) : '');
    const fecha = (k: ClaveTramite, etiqueta: string, ayuda?: string, mes?: string) => (
        <Campo etiqueta={etiqueta} ayuda={ayuda} sinLabel marca={marcaDe(k)}>
            <Calendario valor={v(k)}
                        mesInicial={mes || mesInicial}
                        onCambiar={(iso) => set(k, iso)} />
        </Campo>
    );
    const texto = (k: ClaveTramite, etiqueta: string, ayuda?: string, placeholder?: string,
                   inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']) => (
        <Campo etiqueta={etiqueta} ayuda={ayuda} marca={marcaDe(k)}>
            <input className={campo} value={v(k)} placeholder={placeholder} inputMode={inputMode}
                   onChange={(e) => set(k, e.target.value)} />
        </Campo>
    );
    const conLeido = (Object.keys(leido ?? {}) as ClaveTramite[]).filter((k) => vista.has(k) && !!leido?.[k]);
    const todoDelAuto = conLeido.every((k) => !fuentes?.[k] || fuentes[k] === 'auto');

    return (
        <Tarjeta className="emerge emerge-2">
            {/* La acción, corta: en el raíl de 400 px un rótulo largo partía
                el título en dos renglones. */}
            <Rotulo accion={conLeido.length
                ? <span className="shrink-0 text-[12px] text-emerald-300/80">
                      {todoDelAuto ? 'leído del auto' : 'leído de los papeles'}
                  </span>
                : undefined}>
                Trámite en este tribunal
            </Rotulo>

            <fieldset disabled={deshabilitado} className="grid gap-4 disabled:opacity-50">
                <p className="text-[12px] leading-relaxed text-white/45">
                    Con estos datos se escriben los resultandos y considerandos de
                    procedencia, sin redactarlos de memoria. Lo que dejes vacío se busca
                    en los papeles que subas; si no consta en ninguno, el proyecto sale
                    con el hueco «*********» y un aviso que nombra el dato. Nada se supone.
                </p>

                {/* ═══ AL RETOMAR (3-oct-2026) ═══
                    Lo leído vuelve como propuesta y no viaja como dato suyo:
                    si viajara, le ganaría a la relectura de los papeles que
                    suba ahora (rev_6). Se le dice, y se le deja confirmarlo
                    de una vez cuando ya lo comprobó. */}
                {pendientes.length > 0 && onConfirmarLeido && (
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] p-3.5">
                        <p className="text-[12px] leading-relaxed text-white/60">
                            Retomaste este asunto. Lo marcado como leído no viaja como dato
                            tuyo: al generar otra vez se lee de nuevo de los papeles que
                            subas, y lo que no conste en ellos saldrá en hueco con su aviso.
                            Corrige lo que esté mal; si lo comprobaste y es correcto,
                            confírmalo.
                        </p>
                        <button type="button" onClick={() => onConfirmarLeido(pendientes)}
                                className="mt-2 text-[12px] font-medium text-emerald-200 underline
                                           underline-offset-2 transition-colors hover:text-emerald-100">
                            Confirmar lo leído ({pendientes.length} {pendientes.length === 1 ? 'dato' : 'datos'})
                        </button>
                    </div>
                )}

                {/* ═══ REGISTRO, ADMISIÓN, TURNO Y MINISTERIO PÚBLICO ═══
                    EL REGISTRO VA APARTE Y PRIMERO (cuarta ronda, E7): es el
                    auto más antiguo. A todo el ancho: su rótulo es largo y, en
                    media columna del raíl, partido en renglones bajaría su
                    calendario respecto del de al lado. En la queja la ayuda
                    nombra el informe del 101: en la de la fracción II el
                    registro siempre es otro auto. */}
                {fecha('fecha_registro', 'Auto de Presidencia que forma y registra',
                       familia === 'Q'
                           ? 'Sólo si es distinto del que admite; en la queja contra la autoridad '
                             + 'responsable de un amparo directo es el que pide el informe del artículo 101. '
                             + 'Si un mismo auto registró y admitió, déjalo vacío.'
                           : 'Sólo si es distinto del que admite (por ejemplo, si hubo una prevención o '
                             + 'una declinatoria de por medio). Si un mismo auto registró y admitió, déjalo vacío.')}
                <div className="grid gap-3 sm:grid-cols-2">
                    {fecha('fecha_admision', 'Auto de Presidencia (admisión)',
                           'El que lo admite a trámite (si también lo registró, basta con éste)',
                           v('fecha_registro').slice(0, 7))}
                    {fecha('fecha_turno', 'Auto de turno',
                           'Si el turno va en el mismo auto, la misma fecha', v('fecha_admision').slice(0, 7))}
                </div>
                {/* EL CARGO DECIDE EL RÓTULO (E3): «MAGISTRADA PONENTE» o
                    «MAGISTRADO PONENTE» sale de lo escrito, nunca del nombre
                    de pila. Sin cargo, el proyecto lo pone por omisión y avisa. */}
                {texto('ponente_turno', 'Ponente a quien se turnó',
                       'Con su cargo, como lo nombra el auto de turno («Magistrada …», «Magistrado …»): '
                       + 'el cargo no se deduce del nombre')}
                <Campo etiqueta="Ministerio Público" marca={marcaDe('ministerio_publico')}
                       ayuda="Sólo lo que diga el expediente. Si no consta, el proyecto no dice nada: no afirma que omitió el pedimento.">
                    <select className={campo} value={valor.ministerio_publico ?? ''}
                            onChange={(e) => set('ministerio_publico', e.target.value)}>
                        <option value="" className="bg-charcoal-900">No consta — no se menciona</option>
                        <option value="pedimento" className="bg-charcoal-900">Formuló pedimento</option>
                        <option value="sin_pedimento" className="bg-charcoal-900">No formuló pedimento</option>
                    </select>
                </Campo>

                {/* ═══ LO RECLAMADO O RECURRIDO ═══
                    La fecha va en el V I S T O (y, en el amparo directo, en la
                    existencia; el amparo en revisión ya no la lleva: está en
                    la sentencia recurrida, C1); el juicio de origen, en el
                    V I S T O y en el resolutivo. */}
                <Apartado titulo={`${recurrido.charAt(0).toUpperCase()}${recurrido.slice(1)}`}>
                    {fecha('fecha_acto', `Fecha ${deRecurrido}`,
                           'El día en que se dictó, no el de su notificación')}
                    {/* EL ÓRGANO, EN LOS TRES RECURSOS (3-oct-2026, C3 y C4):
                        la carátula de la queja y la de la revisión fiscal ya
                        no lo llevan, y éste es su único campo. Va en el
                        V I S T O y en la competencia. */}
                    {familia === 'AR' && texto('organo_acto', 'Juzgado que la dictó',
                        'Con su nombre completo, como firma la sentencia')}
                    {familia === 'Q' && texto('organo_acto', 'Órgano que lo dictó',
                        'Con su nombre completo, como firma el auto: el juzgado de distrito o, en la queja '
                        + 'contra la autoridad responsable de un amparo directo, esa autoridad')}
                    {familia === 'RF' && texto('organo_acto', 'Sala que la dictó',
                        'Con su nombre completo, como firma la sentencia')}
                    {familia === 'AD' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {texto('toca', 'Toca de apelación',
                                   'Vacío si el juicio fue de única instancia')}
                            {texto('expediente_origen', 'Expediente de origen',
                                   'El del juicio natural')}
                        </div>
                    )}
                    {/* EL SURTIMIENTO LO RIGE LA LEY DEL ACTO (3-oct-2026), y
                        cambia de una entidad a otra: el considerando de
                        oportunidad lo citaba de memoria. Se escribe como irá en
                        el proyecto y se copia tal cual. Sólo en el amparo
                        directo: en los recursos lo rige la Ley de Amparo. */}
                    {familia === 'AD' && texto('fundamento_surtimiento',
                        'Precepto que rige el surtimiento de la notificación',
                        'Como lo diría el considerando, con su artículo y su ley: "el artículo … del '
                        + 'Código de Procedimientos Civiles del Estado de …"')}
                    {familia === 'AR' && texto('expediente_origen', 'Juicio de amparo indirecto',
                        'El número que le dio el juzgado')}
                    {familia === 'Q' && texto('expediente_origen', 'Juicio de amparo de origen',
                        'Indirecto o directo: el juicio en que se dictó el auto')}
                    {familia === 'RF' && texto('expediente_origen', 'Juicio contencioso administrativo',
                        'El número que le dio la Sala')}
                    {familia === 'RF' && fecha('deposito_postal', 'Depósito en el Servicio Postal Mexicano',
                        'Sólo si el recurso se envió por correo: cuenta esta fecha, no la de recepción')}
                    {familia === 'Q' && fecha('fecha_informe_101',
                        'Auto que tuvo por rendido el informe con justificación',
                        'Sólo en la queja contra la autoridad responsable de un amparo directo '
                        + '(artículo 97, fracción II): se le pide el informe del artículo 101 '
                        + 'antes de admitir. En la de la fracción I, déjalo vacío.',
                        v('fecha_admision').slice(0, 7))}
                </Apartado>

                {/* ═══ LA PROCEDENCIA DE LA REVISIÓN FISCAL (3-oct-2026) ═══
                    El 63 de la LFPCA obliga a decir POR QUÉ procede el
                    recurso. Si el secretario ya sabe la fracción, la dice
                    aquí; si no, «que lo decida el proyecto» (vacío) y el
                    servidor la busca en los papeles. La cuantía sólo cuenta
                    para la fracción I, y sólo con ella se pide. */}
                {familia === 'RF' && (
                    <Apartado titulo="Procedencia del recurso">
                        <Campo etiqueta="Fracción del artículo 63 de la LFPCA" marca={marcaDe('fraccion_63')}
                               ayuda="La que hace procedente el recurso. Si no la sabes, el proyecto la busca en los papeles; si no consta, deja el hueco con su aviso.">
                            <select className={campo} value={valor.fraccion_63 ?? ''}
                                    onChange={(e) => set('fraccion_63', e.target.value)}>
                                <option value="" className="bg-charcoal-900">No sé / que lo decida el proyecto</option>
                                {FRACCIONES_63.map((r) => (
                                    <option key={r} value={r} className="bg-charcoal-900">
                                        {r === 'I' ? 'Fracción I · cuantía' : `Fracción ${r}`}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                        {v('fraccion_63') === 'I' && texto('cuantia', 'Cuantía (pesos)',
                            'El monto del asunto, en pesos, como consta en autos.', undefined, 'decimal')}
                    </Apartado>
                )}

                {/* ═══ EL ADHESIVO ═══ En la queja no existe. */}
                {familia !== 'Q' && (
                    <Opcional abierto={abreAdhesivo || hayAdhesivo}
                              onAbrir={() => setAbreAdhesivo(true)}
                              onQuitar={() => { setAbreAdhesivo(false); quitarClaves(ADHESIVO); }}
                              rotulo={`Hubo ${nombreAdhesivo}`}
                              quitar={`no hubo ${nombreAdhesivo}`}>
                        <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                            {nombreAdhesivo.charAt(0).toUpperCase() + nombreAdhesivo.slice(1)}
                        </p>
                        <Campo etiqueta={familia === 'AD' ? 'Quién lo promovió' : 'Quién la interpuso'}
                               marca={marcaDe('adhesivo_quien')}
                               ayuda={familia === 'AR' && adherente && valor.adhesivo_quien === undefined
                                   ? 'Es el recurrente adhesivo que escribiste en la ficha'
                                   : undefined}>
                            <input className={campo} value={quienAdhesivo}
                                   onChange={(e) => set('adhesivo_quien', e.target.value)} />
                        </Campo>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {fecha('adhesivo_presentacion', 'Presentación', undefined,
                                   v('fecha_admision').slice(0, 7))}
                            {fecha('adhesivo_admision', 'Auto que lo admitió', undefined,
                                   v('fecha_admision').slice(0, 7))}
                        </div>
                        {fecha('adhesivo_notificacion',
                               `Notificación, a quien se adhiere, del auto que admitió ${loPrincipal}`,
                               'De aquí corre su plazo', v('fecha_admision').slice(0, 7))}
                    </Opcional>
                )}

                {/* ═══ EL RETURNO ═══ */}
                <Opcional abierto={abreReturno || hayReturno}
                          onAbrir={() => setAbreReturno(true)}
                          onQuitar={() => { setAbreReturno(false); quitarClaves(RETURNO); }}
                          rotulo="Hubo returno"
                          quitar="no hubo returno">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">Returno</p>
                    {fecha('fecha_returno', 'Acuerdo de returno', undefined,
                           (v('fecha_turno') || v('fecha_admision')).slice(0, 7))}
                    {texto('ponente_returno', 'Ponente a quien se returnó',
                           'Con su cargo, como lo nombra el acuerdo («Magistrada …», «Magistrado …»): '
                           + 'es quien firma el proyecto')}
                </Opcional>

                {/* ═══ LOS ASUNTOS RELACIONADOS (C6) ═══ Al final: no siempre
                    los hay, y cuando los hay los marca él, no los papeles. */}
                <AsuntosRelacionados valor={v('relacionados')}
                                     onCambiar={(r) => set('relacionados', r)}
                                     propio={TIPO_DE_FAMILIA[familia]}
                                     numeroAsunto={numeroAsunto} />
            </fieldset>
        </Tarjeta>
    );
}

/** El trámite que la pantalla manda: el de la tarjeta, con lo que la ficha ya
 *  dice cuando aquí no hay campo propio (un dato, un campo).
 *  · `organo_acto` en el amparo directo ES la autoridad responsable de la
 *    carátula, y sólo ella: si el auto propuso otro órgano, el secretario no
 *    lo vio aquí y no puede viajar como dato suyo. Sin esa figura, no se
 *    manda. En los tres recursos es el campo de la tarjeta: desde el
 *    3-oct-2026 (C3 y C4) la carátula de la queja y la de la revisión fiscal
 *    ya no lo piden, y la responsable que la ficha leyera del auto —que el
 *    secretario ya no ve en ningún sitio— no puede viajar por esta puerta.
 *  · `adhesivo_quien` en el amparo en revisión, si no se tocó en la tarjeta,
 *    es el recurrente adhesivo de la carátula. Lo escrito en la tarjeta
 *    manda siempre, incluso vaciado a propósito («no hubo revisión
 *    adhesiva»). */
export function tramiteConLaFicha(t: Tramite, tipoAsunto: string,
                                  ficha: { responsable?: string; adherente?: string }): Tramite {
    const f = familiaDelTramite(tipoAsunto);
    const x: Tramite = { ...t };
    if (f === 'AD') x.organo_acto = (ficha.responsable ?? '').trim();
    if (f === 'AR' && x.adhesivo_quien === undefined && (ficha.adherente ?? '').trim()) {
        x.adhesivo_quien = (ficha.adherente ?? '').trim();
    }
    return x;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EL ESTADO DE LA TARJETA Y LO QUE VIAJA (3-oct-2026, tercera ronda)
   ═══════════════════════════════════════════════════════════════════════════
   Cuatro cosas que cambian juntas, por eso van juntas y en funciones puras:
     · `valor`        — lo que se ve en los campos;
     · `leido`        — lo propuesto por los papeles, para la marca;
     · `fuentes`      — de qué papel salió cada dato leído;
     · `sinConfirmar` — lo leído AL RETOMAR, que no viaja mientras siga igual.
   Lo propuesto por un auto recién subido SÍ viaja (el secretario lo tiene
   delante y el auto viaja con él): así fue desde la primera ronda. */
export interface EstadoTramite {
    valor: Tramite;
    leido: Tramite;
    fuentes: FuentesTramite;
    sinConfirmar: Tramite;
}

export const TRAMITE_VACIO: EstadoTramite = { valor: {}, leido: {}, fuentes: {}, sinConfirmar: {} };

const _con = (t: Tramite, k: ClaveTramite, v: string | undefined): Tramite => {
    const x: Record<string, string> = { ...(t as Record<string, string>) };
    if (v === undefined) delete x[k]; else x[k] = v;
    return x as Tramite;
};

/** AL RETOMAR: lo del secretario, sin marca; lo leído, marcado con su
 *  origen y pendiente de confirmar. Lo suyo manda sobre lo leído. */
export function alRetomar(r: TramiteRetomado): EstadoTramite {
    let leido: Tramite = {};
    const fuentes: FuentesTramite = {};
    for (const [k, v] of Object.entries(r.leido ?? {}) as [ClaveTramite, string][]) {
        if (!v || (r.suyo ?? {})[k]) continue;
        leido = _con(leido, k, v);
        fuentes[k] = r.fuentes?.[k] || 'papeles';
    }
    return { valor: { ...leido, ...(r.suyo ?? {}) }, leido, fuentes, sinConfirmar: { ...leido } };
}

/** LLEGA LO LEÍDO DE UN AUTO RECIÉN SUBIDO. No pisa lo que el secretario
 *  escribió; sí lo leído al retomar que sigue sin tocarse —la lectura nueva le
 *  gana a la vieja, que es justo lo que pedía rev_6—. La marca de los demás
 *  datos que aún esperan confirmación se conserva: un campo que no viaja
 *  nunca se queda sin decirlo.
 *  LOS RELACIONADOS NO SE LEEN (C6, 3-oct-2026): si un auto los trajera, no
 *  se proponen ni pisan lo que el secretario marcó. */
export function conLoLeidoDelAuto(e: EstadoTramite, delAuto: Tramite): EstadoTramite {
    let valor: Tramite = { ...e.valor };
    let sinConfirmar: Tramite = { ...e.sinConfirmar };
    let leido: Tramite = {};
    const fuentes: FuentesTramite = {};
    const nuevos = (Object.entries(delAuto ?? {}) as [ClaveTramite, string][])
        .filter(([k, v]) => !!v && k !== 'relacionados');
    for (const [k, v] of nuevos) {
        const libre = !String(valor[k] ?? '').trim()
            || (!!sinConfirmar[k] && valor[k] === sinConfirmar[k]);
        if (libre) valor = _con(valor, k, v);
        sinConfirmar = _con(sinConfirmar, k, undefined);
    }
    for (const [k, v] of Object.entries(sinConfirmar) as [ClaveTramite, string][]) {
        if (!v) continue;
        leido = _con(leido, k, e.leido[k] ?? v);
        fuentes[k] = e.fuentes[k] || 'papeles';
    }
    for (const [k, v] of nuevos) {
        leido = _con(leido, k, v);
        fuentes[k] = 'auto';
    }
    return { valor, leido, fuentes, sinConfirmar };
}

/** «Confirmar lo leído»: desde aquí viaja como suyo y deja de marcarse.
 *  SÓLO LO QUE ESTÁ A LA VISTA (`claves`, las que la tarjeta enseña): un dato
 *  leído en un campo que no se pinta —la cuantía sin la fracción I, el órgano
 *  fuera del amparo en revisión— no se confirma sin haberse visto; si después
 *  aparece, aparece con su marca. Sin `claves`, todo lo pendiente. */
export function confirmarLoLeido(e: EstadoTramite, claves?: ClaveTramite[]): EstadoTramite {
    let leido: Tramite = { ...e.leido };
    const fuentes: FuentesTramite = { ...e.fuentes };
    let sinConfirmar: Tramite = { ...e.sinConfirmar };
    const cuales = claves ? new Set(claves) : null;
    for (const [k, v] of Object.entries(e.sinConfirmar) as [ClaveTramite, string][]) {
        if (cuales && !cuales.has(k)) continue;
        sinConfirmar = _con(sinConfirmar, k, undefined);
        if (v && e.valor[k] === v) {
            leido = _con(leido, k, undefined);
            delete fuentes[k];
        }
    }
    return { ...e, leido, fuentes, sinConfirmar };
}

/** LAS CLAVES QUE LA TARJETA ENSEÑA para este tipo y este valor: las del
 *  tipo, menos el órgano del acto en el amparo directo (ahí es la autoridad
 *  responsable de la carátula: un dato, un campo) y la cuantía sin la
 *  fracción I. Desde C3 y C4 (3-oct-2026) el órgano está a la vista en los
 *  tres recursos. */
export function clavesALaVista(tipoAsunto: string, valor: Tramite): ClaveTramite[] {
    const f = familiaDelTramite(tipoAsunto);
    return clavesDelTramite(tipoAsunto).filter((k) =>
        (k !== 'organo_acto' || f !== 'AD') && (k !== 'cuantia' || valor.fraccion_63 === 'I'));
}

/** LO QUE VIAJA: el valor de la tarjeta menos lo leído al retomar que sigue
 *  sin tocarse. Se manda vacío —no se borra la clave— para que nada lo
 *  rellene después (el adherente de la carátula, en `tramiteConLaFicha`):
 *  lo que la tarjeta enseña como «leído · compruébalo» no puede viajar como
 *  dato del secretario por otra puerta. */
export function sinLoNoTocado(valor: Tramite, sinConfirmar: Tramite): Tramite {
    let x: Tramite = { ...valor };
    for (const [k, v] of Object.entries(sinConfirmar ?? {}) as [ClaveTramite, string][]) {
        if (v && x[k] === v) x = _con(x, k, '');
    }
    return x;
}
