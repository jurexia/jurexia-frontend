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
import { obtenerTipos, reglasSurtimiento, type TipoAsunto, type ReglaSurtimiento } from './api';
import Calendario, { comprimirTramos, expandirTramos } from './Calendario';

export interface Encargo {
    tipoAsunto: string;
    numero: string;
    encabezado: string;
    quejoso: string;
    /** Quien recurre, cuando NO es el quejoso (23-sep-2026, 711/2025: recurrió
     *  la UIF contra la concesión). Vacío = son la misma persona. */
    recurrente?: string;
    magistrado: string;
    secretario: string;
    notificacion: string;
    presentacion: string;
    reglaSurtimiento: string;
    /** SÓLO CUANDO reglaSurtimiento === 'otra'. La fecha, ISO, en que el
     *  propio secretario declara que la notificación surtió efectos: ninguna
     *  regla del catálogo es la suya y el redactor no se la inventa. */
    surteEfectos?: string;
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
    /** LOS DÍAS EN QUE NO LABORÓ LA AUTORIDAD RESPONSABLE.
     *
     *  En amparo directo la demanda se presenta POR SU CONDUCTO (artículo 176
     *  de la Ley de Amparo), así que del plazo se excluyen DOS listas que se
     *  suman: los inhábiles del artículo 19 y los días en que ella suspendió
     *  actividades — P./J. 4/2022 (11a.), registro digital 2024494. En la
     *  revisión fiscal vale lo mismo, porque el recurso se presenta ante la
     *  Sala (artículo 63 de la LFPCA). En amparo en revisión y en queja NO:
     *  ahí el escrito se presenta ante órgano federal.
     *
     *  No hay catálogo nacional de calendarios de responsables y no se puede
     *  fabricar: lo declara quien lo sabe. Tramos y días sueltos, separados
     *  por coma: «2025-12-16..2026-01-05, 2026-02-12». */
    inhabilesResponsable?: string;
    /** LA MATERIA, QUE DECIDE CON QUÉ LEY SE FUNDA EL PROYECTO.
     *
     *  Vacía significa «dedúcela»: el sistema la saca del nombre del tribunal
     *  y del encabezado. Eso acierta casi siempre —un colegiado de trabajo no
     *  ve otra cosa— y falla justo en un tribunal MIXTO, donde el nombre trae
     *  dos materias y decide la palabra del encabezado.
     *
     *  Medido en el ADC 93/2026: el encabezado decía «AMPARO DIRECTO CIVIL» en
     *  un asunto regido por la Ley Federal de Procedimiento Contencioso
     *  Administrativo, y el acervo le entregó el Código Federal de
     *  Procedimientos Civiles. El proyecto se fundó con la ley equivocada sin
     *  que nada lo dijera. */
    materia?: string;
}

export const ENCARGO_VACIO: Encargo = {
    tipoAsunto: '', numero: '', encabezado: '', quejoso: '', recurrente: '', magistrado: '',
    secretario: '', notificacion: '', presentacion: '',
    reglaSurtimiento: 'personal', surteEfectos: '', plazo: 0, diasInhabilesExtra: [],
    inhabilesResponsable: '', materia: '',
};

/** Las reglas de surtimiento que el pipeline sabe computar, y una salida
 *  manual para cuando ninguna es la del asunto. `tja_qro_boletin` dice de
 *  quién es en su propia etiqueta —no es una regla genérica de «boletín»,
 *  es del Tribunal de Justicia Administrativa DE QUERÉTARO— para que no se
 *  elija por descuido en un asunto de otro estado; el servidor además la
 *  rechaza si la materia es administrativa y el estado declarado no es
 *  Querétaro. */
/* LAS REGLAS LAS DICE EL SERVIDOR, SEGÚN LA LEY DEL ACTO. Esta lista fija
   ofrecía siempre las mismas cinco —con la del boletín de Querétaro para
   todos—. David (22-sep-2026): «este redactor no es exclusivamente para
   Querétaro (…) en materia federal no hay duda: la LFPCA establece que la
   notificación por boletín surte efectos a los tres días. Esa es la opción
   que debe desplegarse». Se pide a /taller/reglas-surtimiento con el tipo y
   la responsable; esto queda sólo como respaldo mientras llega o si falla. */
const VIAS_RESPALDO: ReglaSurtimiento[] = [
    { clave: 'personal', etiqueta: 'Personal — surte al día hábil siguiente', dias_habiles: 1, fundamento: '' },
    { clave: 'lista', etiqueta: 'Por lista — surte al día hábil siguiente', dias_habiles: 1, fundamento: '' },
    { clave: 'lfpca_boletin', etiqueta: 'Boletín Jurisdiccional del TFJA — surte al tercer día hábil (art. 65 LFPCA)', dias_habiles: 3, fundamento: '' },
    { clave: 'otra', etiqueta: 'Otra regla — yo declaro cuándo surtió efectos', dias_habiles: -1, fundamento: '' },
];

const campo = 'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 ' +
    'text-[14px] text-white/90 outline-none transition placeholder:text-white/45 ' +
    'focus:border-accent-gold/40 focus:bg-white/[0.06]';

function Campo({ etiqueta, ayuda, children, sinLabel }: {
    etiqueta: string; ayuda?: string; children: React.ReactNode;
    /** UN <label> NO PUEDE ETIQUETAR CUARENTA BOTONES. El calendario propio
     *  lo es, y dentro de un <label> el navegador reenvía cada clic al primer
     *  control —el desplegable—, que se cerraba antes de que el día se
     *  fijara: la fecha no se podía elegir. Los campos que traen calendario
     *  se pintan como grupo, con su rótulo asociado por aria-labelledby. */
    sinLabel?: boolean;
}) {
    const rotulo = (
        <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-white/45">
            {etiqueta}
        </span>
    );
    const pie = ayuda
        ? <span className="mt-1 block text-[12px] text-white/45">{ayuda}</span>
        : null;
    if (sinLabel) {
        return (
            <div className="block" role="group" aria-label={etiqueta}>
                {rotulo}{children}{pie}
            </div>
        );
    }
    return (
        <label className="block">
            {rotulo}{children}{pie}
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
    /* UNA COLUMNA, NO DOS. Estas tarjetas viven en el raíl izquierdo, que mide
       400px: en dos columnas cada una se queda en 190 y ahí no caben el nombre
       y el plazo en la misma línea —«Amparo en revisión» se partía en dos
       renglones y «Revisión fiscal» arrastraba cuatro—. En una columna entran
       de largo, las cuatro miden igual y se siguen viendo todas de un vistazo,
       que era el motivo de no usar un desplegable. */
    return (
        <div className="grid gap-2">
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
                                : 'border-white/[0.07] bg-white/[0.03] hover:border-white/20 '
                                  + 'hover:bg-white/[0.05] hover:-translate-y-px',
                        )}
                    >
                        {/* EL PLAZO ES UN DATO, NO UNA FRASE. Iba pegado a su
                            fundamento en una sola línea —«15 días · artículo 63
                            de la Ley Federal de Procedimiento Contencioso
                            Administrativo»— y ese nombre largo rompía en cuatro
                            renglones: la tarjeta de revisión fiscal crecía, la
                            de al lado se estiraba para igualarla y la rejilla
                            quedaba visiblemente desigual.

                            Ahora el número va arriba, alineado a la derecha y
                            en cifras tabulares, que es lo que se busca de un
                            vistazo —y lo que más cuesta cuando se yerra—; el
                            fundamento queda debajo, a dos renglones como mucho.
                            Todas las tarjetas miden lo mismo. */}
                        <span className="flex items-baseline justify-between gap-2">
                            <span className={cn(
                                // SIN `capitalize`: el servidor manda «amparo en
                                // revisión» bien escrito y la clase lo convertía
                                // en «Amparo En Revisión», con la preposición en
                                // alta. Se pone en alta sólo la primera letra.
                                'text-[14px] font-medium first-letter:uppercase',
                                activo ? 'text-accent-gold' : 'text-white/90',
                            )}>
                                {t.nombre}
                            </span>
                            <span className={cn(
                                'shrink-0 text-[12px] font-semibold tabular-nums',
                                activo ? 'text-accent-gold' : 'text-white/60',
                            )}>
                                {t.plazo.dias} días
                            </span>
                        </span>
                        {/* SIN `block`: las dos clases ponen `display` y la
                            que ganaba era `block`, así que el recorte no
                            recortaba nada —se veían los cuatro renglones—.
                            `line-clamp-2` ya trae el suyo. */}
                        <span className="mt-1 line-clamp-2 text-[12px] leading-snug
                                         text-white/45">
                            {t.plazo.fundamento}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default function FormularioEncargo({ valor, onCambiar, deshabilitado, onTipo, activa,
                                            delAuto, onDelAuto }: {
    valor: Encargo;
    onCambiar: (e: Encargo) => void;
    deshabilitado?: boolean;
    /** Si éste es el paso en el que está el secretario ahora mismo. Los pasos
     *  numerados viven en la columna derecha y lo que hay que rellenar está en
     *  el raíl izquierdo: sin una señal común, el ojo no une las dos mitades
     *  —se lee «1 · La ficha del asunto» y hay que buscar dónde se llena—. */
    activa?: boolean;
    /** El secretario vino por el auto de admisión. Entonces el tipo no se
     *  pregunta: se lee del papel y se enseña para que lo compruebe. */
    delAuto?: boolean;
    /** Para que pueda salirse del camino del auto si éste no sirve. */
    onDelAuto?: (v: boolean) => void;
    /** El tipo elegido, para que la pantalla rotule los documentos con el
     *  vocabulario que le corresponde. */
    onTipo?: (t: TipoAsunto | undefined) => void;
}) {
    const [tipos, setTipos] = React.useState<TipoAsunto[]>([]);
    const [errorCatalogo, setErrorCatalogo] = React.useState('');
    const [cargandoCatalogo, setCargandoCatalogo] = React.useState(true);

    /* Y SI AUN ASÍ FALLA, HAY POR DÓNDE SALIR. Un mensaje que sólo dice que
       algo salió mal, en la pantalla donde se empieza a trabajar, deja al
       secretario sin nada que hacer más que recargar y esperar acertar. */
    const cargarCatalogo = React.useCallback(() => {
        setCargandoCatalogo(true);
        setErrorCatalogo('');
        obtenerTipos()
            .then((ts) => { setTipos(ts); setErrorCatalogo(''); })
            .catch((e) => setErrorCatalogo(
                e instanceof Error ? e.message : 'No se pudo leer el catálogo de asuntos.'))
            .finally(() => setCargandoCatalogo(false));
    }, []);

    React.useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);

    const set = <K extends keyof Encargo>(k: K, v: Encargo[K]) =>
        onCambiar({ ...valor, [k]: v });

    const tipo = tipos.find((t) => t.clave === valor.tipoAsunto);

    /* ═══ LAS REGLAS DE NOTIFICACIÓN, SEGÚN TIPO Y RESPONSABLE ═══
       Cada vez que cambia uno de los dos se le pregunta al servidor qué
       reglas ofrece y cuál va por omisión; si la que hay puesta es la
       genérica («personal») o ya no está entre las ofrecidas, se cambia a la
       del fuero. Lo que el secretario eligió a propósito entre las ofrecidas
       no se toca. */
    const [vias, setVias] = React.useState<ReglaSurtimiento[]>(VIAS_RESPALDO);
    const [fueroReglas, setFueroReglas] = React.useState('');
    const reglaActual = React.useRef(valor.reglaSurtimiento);
    reglaActual.current = valor.reglaSurtimiento;
    const onCambiarRef = React.useRef(onCambiar);
    onCambiarRef.current = onCambiar;
    const valorRef = React.useRef(valor);
    valorRef.current = valor;
    React.useEffect(() => {
        if (!valor.tipoAsunto) return;
        let vivo = true;
        const t = setTimeout(() => {
            reglasSurtimiento(valor.tipoAsunto, valor.responsable || '')
                .then((r) => {
                    if (!vivo || !r?.reglas?.length) return;
                    setVias(r.reglas);
                    setFueroReglas(r.fuero || '');
                    const claves = r.reglas.map((x) => x.clave);
                    const actual = reglaActual.current;
                    if (r.por_omision && (!actual || actual === 'personal' || !claves.includes(actual))) {
                        if (actual !== r.por_omision) {
                            onCambiarRef.current({ ...valorRef.current, reglaSurtimiento: r.por_omision });
                        }
                    }
                })
                .catch(() => { /* se queda el respaldo */ });
        }, 350);
        return () => { vivo = false; clearTimeout(t); };
    }, [valor.tipoAsunto, valor.responsable]);
    /* EL TIPO SUBE. La pantalla de arriba lo necesita para rotular los dos
       documentos con el nombre que les corresponde: en un recurso no se sube
       «el acto reclamado» sino la SENTENCIA RECURRIDA, y no se suben
       «conceptos de violación» sino AGRAVIOS. Pedir un papel con el nombre
       equivocado es la manera más barata de que suban el papel equivocado. */
    React.useEffect(() => { onTipo?.(tipo); }, [tipo, onTipo]);
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
        <Tarjeta className={cn('emerge emerge-1', activa && 'respira')}>
            <Rotulo accion={
                <span className="text-[12px] text-white/45">
                    {tipo ? 'lo lees de un sello' : 'empieza por aquí'}
                </span>
            }>
                Ficha del asunto
            </Rotulo>

            <fieldset disabled={deshabilitado} className="grid gap-4 disabled:opacity-50">
                {/* ═══ EL TIPO LO DIJO EL AUTO ═══
                    David: «si el secretario tiene el auto de admisión, ni
                    siquiera son necesarios los botones de tipo de asunto».
                    Exacto: el servidor devuelve `ficha.tipo_asunto` y la
                    pantalla ya lo aplicaba, así que la rejilla de cuatro
                    quedaba pidiendo que eligiera algo que el papel ya decía.
                    Se sustituye por una línea que informa de lo leído y deja
                    corregirlo —leído no es lo mismo que correcto—. */}
                {delAuto && !tipo ? (
                    /* AÚN NO HAY AUTO, PERO YA DIJO QUE LO TIENE. Aquí estaba
                       la rejilla de cuatro tipos, y enseñarla es contradecir lo
                       que el secretario acaba de elegir: va a subir el papel que
                       dice el tipo, así que pedirle que lo escoja a mano son
                       cuatro botones que no debe tocar. Se dice qué va a pasar
                       y se deja la salida a mano por si el auto no sirve. */
                    <div className="rounded-2xl border border-dashed border-white/20
                                    bg-white/[0.02] px-4 py-3.5">
                        <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                            ¿Qué vas a proyectar?
                        </p>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">
                            Lo dirá el auto de admisión. En cuanto lo subas aparece
                            aquí, con su plazo y su fundamento.
                        </p>
                        <button type="button" onClick={() => onDelAuto?.(false)}
                                className="mt-2 text-[12px] text-white/45 underline
                                           underline-offset-2 transition-colors
                                           hover:text-white/75">
                            prefiero elegirlo a mano
                        </button>
                    </div>
                ) : delAuto && tipo ? (
                    <div className="rounded-2xl border border-emerald-400/25
                                    bg-emerald-400/[0.05] px-4 py-3.5">
                        <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                            Lo dice el auto
                        </p>
                        <p className="mt-1.5 flex items-baseline justify-between gap-2">
                            <span className="text-[16px] font-medium tracking-[0.01em]
                                             text-white first-letter:uppercase">
                                {tipo.nombre}
                            </span>
                            <span className="shrink-0 text-[12px] font-semibold tabular-nums
                                             text-white/60">
                                {tipo.plazo.dias} días
                            </span>
                        </p>
                        <p className="mt-1 text-[12px] leading-snug text-white/45">
                            {tipo.plazo.fundamento}
                        </p>
                        <button type="button"
                                onClick={() => onCambiar({ ...valor, tipoAsunto: '',
                                                           excepcionPlazo: '', plazo: 0 })}
                                className="mt-2 text-[12px] text-white/45 underline
                                           underline-offset-2 transition-colors
                                           hover:text-white/75">
                            no es éste · elegirlo a mano
                        </button>
                    </div>
                ) : (
                <Campo etiqueta="¿Qué vas a proyectar?"
                       ayuda={errorCatalogo
                           ? ''
                           : cargandoCatalogo && !tipos.length
                               ? 'Cargando los tipos de asunto…'
                               : 'Cada asunto lleva sus apartados, su vocabulario y su plazo'}>
                {errorCatalogo && (
                    <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/[0.06] px-3 py-2.5">
                        <p className="text-[13px] leading-relaxed text-red-100">{errorCatalogo}</p>
                        <button type="button" onClick={cargarCatalogo} disabled={cargandoCatalogo}
                                className="mt-1.5 text-[13px] font-medium text-red-200 underline
                                           underline-offset-2 hover:text-red-100 disabled:opacity-40">
                            {cargandoCatalogo ? 'reintentando…' : 'Reintentar'}
                        </button>
                    </div>
                )}
                    <SelectorTipo tipos={tipos} valor={valor.tipoAsunto}
                                  onElegir={(clave) => onCambiar({
                                      ...valor, tipoAsunto: clave, excepcionPlazo: '', plazo: 0,
                                  })} />
                </Campo>
                )}

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
                    {/* EL ENCABEZADO NO SE PIDE: se compone del tipo y el
                        número —el servidor lo hace al generar si va vacío, y
                        lo trae leído del auto de admisión—. Se enseña lo que
                        va a salir y se puede corregir, pero no es un hueco
                        que rellenar. */}
                    <Campo etiqueta="Encabezado" ayuda="Se compone solo; tócalo sólo si hace falta">
                        <input className={campo}
                               value={valor.encabezado}
                               placeholder={`${tipo.nombre.toUpperCase()} ${valor.numero.trim() || '174/2026'}`}
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

                {/* ═══ LA MATERIA, QUE ES LO QUE ELIGE EL ACERVO ═══
                    Es el campo que decide CON QUÉ LEY se funda el proyecto, y
                    no estaba: se deducía del nombre del tribunal, que en uno
                    mixto trae dos materias y no decide nada. */}
                <Campo etiqueta="Materia"
                       ayuda="Decide en qué acervo se busca la ley. En un tribunal mixto no se puede adivinar del nombre: si el asunto es fiscal o administrativo y aquí queda «civil», el proyecto se funda con el código equivocado y nada lo avisa.">
                    <select className={campo} value={valor.materia ?? ''}
                            onChange={(e) => set('materia', e.target.value)}>
                        <option value="" className="bg-charcoal-900">
                            Dedúcela del asunto
                        </option>
                        <option value="administrativa" className="bg-charcoal-900">
                            Administrativa y fiscal
                        </option>
                        <option value="civil" className="bg-charcoal-900">Civil y mercantil</option>
                        <option value="laboral" className="bg-charcoal-900">Laboral</option>
                        <option value="penal" className="bg-charcoal-900">Penal</option>
                    </select>
                </Campo>

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
                    {/* EL CALENDARIO ABRE EN EL MES DEL DATO QUE YA SE TIENE.
                        David: «ya teniendo la fecha en que se presentó el
                        recurso, desplegar el calendario en su mes y año para
                        que el secretario sólo seleccione cuándo fue
                        notificado, pudiendo cambiar de mes». La presentación
                        suele llegar antes —del auto de admisión, o del auto
                        de turno— así que es ella la que posiciona a la
                        notificación, y no al revés. */}
                    <Campo etiqueta={`Notificación ${deRecurrido}`} sinLabel>
                        <Calendario valor={valor.notificacion}
                                    mesInicial={valor.presentacion ? valor.presentacion.slice(0, 7) : undefined}
                                    onCambiar={(iso) => set('notificacion', iso)} />
                    </Campo>
                    <Campo etiqueta={`Presentación: ${tipo.escrito}`} sinLabel>
                        <Calendario valor={valor.presentacion}
                                    onCambiar={(iso) => set('presentacion', iso)} />
                    </Campo>
                </div>

                <Campo etiqueta="Cómo se notificó"
                       ayuda={fueroReglas === 'tfja'
                           ? 'Tribunal Federal de Justicia Administrativa: el Boletín Jurisdiccional surte al tercer día hábil (art. 65 LFPCA)'
                           : fueroReglas === 'tja_estatal'
                               ? 'Tribunal estatal: cómo surte efectos lo dice la ley de esa entidad; declara tú la fecha'
                               : 'No se adivina: mueve el cómputo hasta tres días'}>
                    <select className={campo} value={valor.reglaSurtimiento}
                            onChange={(e) => set('reglaSurtimiento', e.target.value)}>
                        {(vias.some((x) => x.clave === valor.reglaSurtimiento) ? vias
                            : [...vias, { clave: valor.reglaSurtimiento, etiqueta: valor.reglaSurtimiento, dias_habiles: 0, fundamento: '' }]
                        ).map(({ clave, etiqueta }) => (
                            <option key={clave} value={clave} className="bg-charcoal-900">{etiqueta}</option>
                        ))}
                    </select>
                </Campo>

                {/* ═══ OTRA REGLA: DOS FECHAS, DECLARADAS ═══
                    David: «hay que darle la opción al secretario de "Otra
                    regla" y que se despliegue un calendario para que
                    selecciones primero cuándo se notificó y luego cuándo
                    surte efectos». El «cuándo se notificó» es el campo de
                    arriba —siempre está—; aquí sólo falta el segundo: cuándo
                    surtió efectos, sin que el sistema se lo invente. */}
                {valor.reglaSurtimiento === 'otra' && (
                    <div className="rounded-xl border border-accent-gold/25 bg-accent-gold/[0.04] p-3.5">
                        <p className="mb-3 text-[12px] leading-relaxed text-white/60">
                            Ninguna regla del catálogo es la de este asunto: declara tú
                            cuándo surtió efectos la notificación. El considerando lo dirá
                            así —«según lo manifestado»— y no le inventará una regla que
                            no aplicaste.
                        </p>
                        <Campo etiqueta="¿Cuándo surtió efectos la notificación?" sinLabel>
                            <Calendario valor={valor.surteEfectos ?? ''}
                                        mesInicial={valor.notificacion ? valor.notificacion.slice(0, 7) : undefined}
                                        onCambiar={(iso) => set('surteEfectos', iso)} />
                        </Campo>
                    </div>
                )}

                {/* ═══ LOS DÍAS, MARCADOS EN EL CALENDARIO ═══
                    David, 16-sep-2026: «que el secretario pueda
                    seleccionarlos en conjunto en calendario y cuando termine
                    un botón de "Listo", y así se suman todos de forma más
                    cómoda sin tener que ingresar uno por uno». Antes era un
                    <input type="date"> que admitía UN día por vez: una
                    quincena de vacaciones eran quince aperturas del
                    calendario del navegador. */}
                <Campo etiqueta="Días inhábiles adicionales de TU tribunal" sinLabel
                       ayuda={['amparo_directo', 'revision_fiscal'].includes(valor.tipoAsunto)
                           ? 'Los del artículo 19, sábados y domingos y las vacaciones del Poder Judicial ya van contados. Aquí sólo los de tu propio tribunal; los de la responsable van en el campo de abajo.'
                           : 'Los del artículo 19, sábados y domingos y las vacaciones del Poder Judicial ya van contados. Aquí sólo los de tu tribunal.'}>
                    <Calendario multiple
                                valores={valor.diasInhabilesExtra ?? []}
                                onValores={(ds) => set('diasInhabilesExtra', ds)}
                                mesInicial={(valor.notificacion || valor.presentacion || '').slice(0, 7) || undefined}
                                placeholder="Ninguno · marcarlos en el calendario" />
                    {(valor.diasInhabilesExtra ?? []).length > 0 && (
                        <p className="mt-1 text-[12px] leading-relaxed text-accent-gold/80">
                            {comprimirTramos(valor.diasInhabilesExtra ?? [])}
                        </p>
                    )}
                </Campo>

                {/* ═══ LOS DÍAS EN QUE NO LABORÓ LA RESPONSABLE ═══
                    Sólo se pinta en los dos tipos donde el escrito se presenta
                    ANTE ELLA. Un campo que no se puede aplicar es una trampa:
                    el secretario lo rellena, no pasa nada, y no sabe por qué. */}
                {/* EL PERIODO VACACIONAL YA NO SE ESCRIBE. Era un campo de
                    texto con sintaxis propia —«2025-12-16..2026-01-05»— y
                    David lo señaló: marcando los días en el calendario se hace
                    igual de rápido y no hay sintaxis que aprender ni que
                    equivocar. Al servidor sigue viajando como texto, con los
                    días consecutivos comprimidos en tramos, que es lo que
                    `leer_inhabiles_responsable` entiende. */}
                {['amparo_directo', 'revision_fiscal'].includes(valor.tipoAsunto) && (
                    <Campo etiqueta="Días en que NO laboró la autoridad responsable" sinLabel
                           ayuda={valor.tipoAsunto === 'revision_fiscal'
                               ? 'El recurso se presenta ante la Sala responsable (artículo 63 de la LFPCA) y son hábiles los días en que sus oficinas están abiertas al público. Sus periodos vacacionales no se computan.'
                               : 'La demanda se presenta por conducto de la responsable (artículo 176 de la Ley de Amparo), así que sus vacaciones y suspensiones tampoco cuentan — P./J. 4/2022, registro 2024494.'}>
                        <Calendario multiple
                                    valores={expandirTramos(valor.inhabilesResponsable ?? '')}
                                    onValores={(ds) => set('inhabilesResponsable', comprimirTramos(ds))}
                                    mesInicial={(valor.notificacion || valor.presentacion || '').slice(0, 7) || undefined}
                                    placeholder="Ninguno · marcar sus vacaciones y suspensiones" />
                        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                            {(valor.inhabilesResponsable ?? '').trim()
                                ? <span className="text-accent-gold/80">{valor.inhabilesResponsable}</span>
                                : 'Marca el periodo vacacional día por día: se suman a los inhábiles del artículo 19, no los sustituyen, y sólo pueden alargar el plazo, nunca acortarlo.'}
                        </p>
                    </Campo>
                )}

                {/* EL PLAZO SE MUESTRA, NO SE PIDE. Es la ley. */}
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <span className="block text-[12px] font-medium uppercase tracking-wide text-white/45">
                        Plazo
                    </span>
                    <p className="mt-1 text-[14px] text-white/75">
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
                        <div className="mt-3 border-t border-white/[0.07] pt-3">
                            <span className="mb-1.5 block text-[12px] text-white/45">
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

                <p className="text-[12px] leading-relaxed text-white/45">
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
    if (e.reglaSurtimiento === 'otra' && !e.surteEfectos)
        falta.push('cuándo surtió efectos la notificación (elegiste «otra regla»)');
    /* EL TRIBUNAL, EL MAGISTRADO Y EL SECRETARIO se toman del último asunto
     * de este secretario. Sólo se exigen la primera vez, y de eso se encarga
     * el servidor, que es quien sabe si hay asunto anterior. */
    return falta;
}
