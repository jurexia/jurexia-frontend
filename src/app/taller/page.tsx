'use client';

/**
 * Taller de sentencias — la pantalla del redactor desde el adelanto.
 *
 * EL CIRCUITO ESTÁ PARTIDO EN DOS A PROPÓSITO, porque entre las dos mitades hay
 * una PERSONA. La máquina lee y ordena; el secretario decide; la máquina
 * redacta la demostración de lo que él decidió.
 *
 *     1. adelanto    los dos PDF y su plantilla → ficha, resúmenes, problemas
 *     2. acervo      lo que la jurisprudencia dice de SUS problemas
 *     3. criterio    ⏸ él decide, viendo ya la obligatoria del tema
 *     4. proyecto    el estudio de fondo dentro de su propio .docx
 *
 * El paso 2 va ANTES del 3 y no al revés: pedirle el sentido sin enseñarle la
 * jurisprudencia obligatoria es justo el error que este taller existe para
 * evitar.
 *
 * Y lo que sale NO es un proyecto firmable. La medición sobre tres expedientes
 * reales lo dejó claro, así que el aviso va encima del documento, cada vez, con
 * los números de ESE borrador.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Download, Search, FileText, AlertCircle } from 'lucide-react';
import { useRequireAuth } from '@/lib/useAuth';
import BarraSuperior from '@/components/sentencia/BarraSuperior';
import PanelDocumentos from '@/components/sentencia/PanelDocumentos';
import LineaDeFases from '@/components/sentencia/LineaDeFases';
import VentanaCriterio from '@/components/sentencia/VentanaCriterio';
import FormularioEncargo, { ENCARGO_VACIO, faltaEnEncargo } from '@/components/sentencia/FormularioEncargo';
import type { TipoAsunto } from '@/components/sentencia/api';
import type { Encargo } from '@/components/sentencia/FormularioEncargo';
import AvisoBorrador, { AvisoPiloto } from '@/components/sentencia/AvisoBorrador';
import { Tarjeta, Rotulo, cn } from '@/components/sentencia/primitivas';
import type { Asunto, Documento, Fase, ProblemaJuridico, RolDocumento } from '@/components/sentencia/tipos';
import {
    generarAdelanto, descargar, consultarAcervo, resolverConCriterio,
    resolverConSentidoGlobal,
    proponerSolucion, aportarContexto, resolverEnVivo,
    type RespuestaPropuesta,
    estadoPiloto, descargarProyecto,
} from '@/components/sentencia/api';
import type { MaterialDelCaso, ResultadoProyecto, EstadoPiloto } from '@/components/sentencia/api';

type Paso = 'ficha' | 'adelanto' | 'acervo' | 'criterio' | 'proyecto';

const FASES_BASE: Fase[] = [
    { id: 'ficha', titulo: 'Ficha y oportunidad', detalle: 'Partes, fechas y cómputo de días hábiles. Sin modelo: aritmética.', estado: 'pendiente' },
    { id: 'ratio', titulo: 'Ratio del acto reclamado', detalle: 'Qué resolvió la responsable y con qué razones, anclado a su página.', estado: 'pendiente' },
    { id: 'conceptos', titulo: 'Síntesis de conceptos', detalle: 'Un párrafo por concepto, en el registro de tus engroses.', estado: 'pendiente' },
    { id: 'problemas', titulo: 'Problemas jurídicos', detalle: 'Del contraste entre lo resuelto y lo combatido.', estado: 'pendiente' },
    { id: 'busqueda', titulo: 'Búsqueda por problema', detalle: 'Un RAG dirigido a cada problema, con registro verificado.', estado: 'pendiente' },
    { id: 'criterio', titulo: 'Tu criterio', detalle: 'El único paso que no se automatiza. Decide y explica por qué.', estado: 'pendiente', requiereHumano: true },
    { id: 'estudio', titulo: 'Estudio de fondo', detalle: 'Tu criterio manda el sentido; el corpus, la forma; la ley, el fundamento.', estado: 'pendiente' },
    { id: 'ensamblado', titulo: 'Ensamblado en tu plantilla', detalle: 'Se rellenan los huecos del adelanto. No se construye un Word nuevo.', estado: 'pendiente' },
];

/** Qué fases están hechas según dónde vamos. */
function fasesSegun(paso: Paso, corriendo: boolean): Fase[] {
    const hasta: Record<Paso, number> = { ficha: 0, adelanto: 4, acervo: 5, criterio: 5, proyecto: 8 };
    const n = hasta[paso];
    return FASES_BASE.map((f, i) => ({
        ...f,
        estado: i < n ? 'lista'
            : i === n && corriendo ? 'corriendo'
                : f.requiereHumano && i === n ? 'espera'
                    : 'pendiente',
    }));
}

const boton = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 ' +
    'text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40';

export default function TallerDeSentencias() {
    const { user, loading: authLoading } = useRequireAuth();
    const correo = user?.email ?? '';

    const [paso, setPaso] = useState<Paso>('ficha');
    const [propuesta, setPropuesta] = useState<RespuestaPropuesta | null>(null);
    // CÓMO DECIDE EL SECRETARIO. Por omisión, problema por problema, que es
    // como funcionaba: nadie se encuentra con un flujo distinto sin pedirlo.
    const [modo, setModo] = useState<'acervo' | 'global' | 'por_problema'>('por_problema');
    const [sentidoGlobal, setSentidoGlobal] = useState('');
    /* LA RAZÓN DE LA SOLUCIÓN GLOBAL. El sentido dice QUÉ se resuelve y esto,
     * POR QUÉ: es lo que alinea el estudio entero. Se insertaba la propuesta
     * del motor en el modo «acervo» —problema por problema— y en el global no
     * había dónde ponerla, así que el proyecto salía con un sentido dictado y
     * ninguna explicación detrás. */
    const [razonGlobal, setRazonGlobal] = useState('');
    /* EL ESTUDIO, SEGÚN SE ESCRIBE. Cuatro minutos de pantalla quieta se
       sienten como una avería; viéndose escribir se sienten como trabajo. Y de
       paso el secretario va leyendo y puede parar si ve que va mal encaminado. */
    const [avance, setAvance] = useState('');
    /* PROPONER Y GENERAR NO SON LO MISMO, y el botón decía «Redactando la
       sentencia…» mientras lo que corría era la PROPUESTA. Los dos comparten
       `corriendo`, así que hacía falta distinguirlos: un rótulo que miente
       sobre lo que está pasando hace que el secretario espere lo que no va a
       llegar. */
    const [proponiendo, setProponiendo] = useState(false);

    /* LLEVAR AL SECRETARIO ADONDE ACABA DE PASAR ALGO.
     *
     * David: «no se sabe en qué momento puede hacer scrolling. Si el
     * secretario no baja, no se percata de todo el pipeline existente».
     *
     * Es exacto, y se nota conduciendo la pantalla: cada paso deja lo nuevo
     * fuera de vista. Quien no baje no ve las dos vías, ni la lista de
     * comprobación, ni el estudio escribiéndose — y no tiene forma de saber
     * que están ahí.
     *
     * Se mueve la pantalla SOLA, y sólo cuando aparece algo que hay que leer o
     * decidir. Nunca mientras el secretario escribe: eso es arrebatarle el
     * cursor. */
    const irA = useCallback((id: string, retraso = 350) => {
        window.setTimeout(() => {
            const el = document.getElementById(id);
            if (!el) return;
            const activo = document.activeElement;
            // Si está escribiendo, no se le mueve el suelo bajo los pies.
            if (activo && /INPUT|TEXTAREA/.test(activo.tagName)) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, retraso);
    }, []);
    // Lo que el secretario aporta porque el acervo no lo tenía. Vive aquí y
    // viaja con cada petición: el servidor no lo guarda.
    const [contexto, setContexto] = useState('');
    const [aportando, setAportando] = useState(false);
    const [corriendo, setCorriendo] = useState(false);
    const [error, setError] = useState('');
    const [piloto, setPiloto] = useState<EstadoPiloto | null>(null);

    const [encargo, setEncargo] = useState<Encargo>(ENCARGO_VACIO);
    /* EL TIPO ELEGIDO, que gobierna cómo se llama cada cosa en pantalla. */
    const [tipoSel, setTipoSel] = useState<TipoAsunto | undefined>(undefined);
    const voz = useMemo(() => tipoSel ? {
        recurrido: tipoSel.recurrido,
        combate: tipoSel.combate,
        esRecurso: /revision|queja/i.test(tipoSel.clave),
    } : undefined, [tipoSel]);
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [ficheros, setFicheros] = useState<Partial<Record<RolDocumento | 'plantilla', File>>>({});
    const [material, setMaterial] = useState<MaterialDelCaso | null>(null);
    const [problemas, setProblemas] = useState<ProblemaJuridico[]>([]);
    const [proyecto, setProyecto] = useState<ResultadoProyecto | null>(null);

    useEffect(() => {
        if (!correo) return;
        estadoPiloto(correo).then(setPiloto).catch(() => setPiloto(null));
    }, [correo]);

    const soltar = useCallback((rol: RolDocumento, f: File) => {
        setFicheros((p) => ({ ...p, [rol]: f }));
        setDocumentos((prev) => [
            ...prev.filter((d) => d.rol !== rol),
            { id: `${rol}-${f.name}`, nombre: f.name, rol, bytes: f.size, progreso: 100, estado: 'listo' },
        ]);
    }, []);

    const quitar = useCallback((id: string) => {
        setDocumentos((prev) => {
            const d = prev.find((x) => x.id === id);
            if (d) setFicheros((f) => ({ ...f, [d.rol]: undefined }));
            return prev.filter((x) => x.id !== id);
        });
    }, []);

    const falta = useMemo(() => {
        const f = faltaEnEncargo(encargo);
        // La plantilla NO se exige: hay una precargada por familia de asunto.
        // CON EL NOMBRE DEL TIPO. Decía «falta el acto reclamado» aunque el
        // secretario estuviera proyectando una revisión, donde lo que falta es
        // la sentencia recurrida.
        if (!ficheros.acto) f.push(voz?.recurrido ?? 'el acto reclamado');
        if (!ficheros.conceptos) f.push(`los ${voz?.combate ?? 'conceptos de violación'}`);
        return f;
    }, [encargo, ficheros, voz]);

    const pedirAdelanto = useCallback(async () => {
        setError(''); setCorriendo(true);
        try {
            const r = await generarAdelanto(
                { ...encargo, reglaSurtimiento: encargo.reglaSurtimiento,
                  // EL TIPO LO ELIGE EL SECRETARIO, NO SE DEDUCE DE UN
                  // INTERRUPTOR. Esta línea decía
                  // `encargo.esRecurso ? 'amparo_revision' : 'amparo_directo'`,
                  // así que una QUEJA o una REVISIÓN FISCAL eran imposibles de
                  // pedir desde la pantalla: el interruptor sólo alternaba
                  // entre amparo directo y amparo en revisión. Todo el trabajo
                  // hecho para esos dos tipos era inalcanzable para un
                  // secretario y sólo existía desde una petición a mano.
                  tipoAsunto: encargo.tipoAsunto,
                  // El documento se escribe entero. La ruta de plantilla queda
                  // sólo para quien suba la suya a propósito.
                  modo: ficheros.plantilla ? 'plantilla' : 'generado' },
                { plantilla: ficheros.plantilla, acto: ficheros.acto!, conceptos: ficheros.conceptos! },
                correo,
            );
            descargar(r);
            if (r.oportunidad === 'EXTEMPORANEA') {
                setError('El cómputo da EXTEMPORÁNEA. Compruébalo antes de seguir: si es correcto, el asunto no se resuelve en el fondo.');
            }
            setPaso('adelanto');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo generar el adelanto.');
        } finally { setCorriendo(false); }
    }, [encargo, ficheros, correo]);

    const pedirAcervo = useCallback(async () => {
        setError(''); setCorriendo(true);
        try {
            const m = await consultarAcervo(encargo.numero, correo);
            setMaterial(m);
            const candidatos = m.tesis.slice(0, 4).map((t) => ({
                tipo: 'tesis' as const, registro: t.registro, rubro: t.rubro,
                instancia: t.instancia,
                porQue: t.obligatoria
                    ? 'Jurisprudencia obligatoria del tema: vincula a este Tribunal.'
                    : 'Tesis orientadora: ilustra, no vincula.',
                verificado: true,
            }));
            setProblemas([
                ...(m.problema_global ? [{
                    id: 'global', pregunta: m.problema_global, resolvio: '', combate: '',
                    candidatos, criterio: '',
                }] : []),
                ...m.problemas.map((p, i) => ({
                    id: `p${i}`, pregunta: p.pregunta, resolvio: p.resolvio,
                    combate: p.combate,
                    impedimento: p.impedimento ?? undefined,
                    candidatos, criterio: '',
                })),
            ]);
            setPaso('acervo');
            // El adelanto está: lo siguiente es el botón rojo.
            irA('recorrido');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo consultar el acervo.');
        } finally { setCorriendo(false); }
    }, [encargo.numero, correo]);

    const cambiarCriterio = useCallback((id: string, campo: 'criterio' | 'sentido', valor: string) => {
        setProblemas((prev) => prev.map((p) => p.id === id ? { ...p, [campo]: valor } : p));
    }, []);

    // LA PROPUESTA DE SOLUCIÓN. El motor sugiere el sentido de cada problema
    // con su razón y los registros que lo apoyan; el secretario la acepta tal
    // cual, la edita o dicta el suyo. Sin este paso el proyecto salía con la
    // calificación que trajera la plantilla, y así nacían las incongruencias.
    const pedirPropuesta = useCallback(async () => {
        setError(''); setCorriendo(true); setProponiendo(true);
        try {
            const p = await proponerSolucion(encargo.numero, correo, contexto);
            setPropuesta(p);
            /* SE ENTRA DIRECTO A LA DECISIÓN, con la propuesta del motor ya
               puesta. Es lo que automatiza el trabajo: el caso frecuente es
               seguirla, y el secretario llega a una pantalla que ya dice cómo
               se resuelve, por qué, y qué pasa con cada tema. Si no está de
               acuerdo, la vía contraria está a un clic.
               Antes caía en 'acervo', que es el volcado de tesis: la pantalla
               donde se perdía. */
            // La propuesta llegó: ahí es donde toca leer y decidir.
            irA('criterio', 500);
            if (p.global?.alcanza) {
                setModo('global');
                setSentidoGlobal(p.global.sentido || '');
                setRazonGlobal(p.global.razon || '');
            } else {
                // SIN PROPUESTA GLOBAL NO HAY CAMINO GLOBAL QUE OFRECER: se cae
                // al de problema por problema, que es el que siempre funciona.
                // Antes caía en «acervo», que era el volcado de tesis y ya no
                // existe como modo.
                setModo('por_problema');
            }
            // Se vuelca sobre los problemas para que se vean y se puedan editar.
            setProblemas((prev) => prev.map((q, i) => {
                const s = p.propuestas[i];
                // El sentido es una unión cerrada: lo que venga de fuera se
                // valida antes de entrar, no se castea a ciegas.
                const valido = (['fundado', 'esencialmente_fundado',
                                 'sustancialmente_fundado', 'parcialmente_fundado',
                                 'fundado_insuficiente', 'infundado', 'inoperante',
                                 'inatendible', 'ineficaz', 'sin_materia'] as const)
                    .find((x) => x === s?.sentido);
                // LA PREDICCIÓN Y LA JERARQUÍA SE VUELCAN SIEMPRE, alcance o
                // no la propuesta: son lo que el secretario necesita para
                // decidir, y perderlas aquí dejaría la tabla a medias —es el
                // fallo que ya costó una ronda en el servidor—.
                const base = { ...q, prediccion: s?.prediccion ?? q.prediccion,
                               jerarquia: (s?.jerarquia as 'principal' | 'accesorio')
                                          ?? q.jerarquia };
                return s && s.alcanza && valido
                    ? { ...base, sentido: valido, criterio: q.criterio || s.razon }
                    : base;
            }));
            if (!p.propuestas.length) {
                setError('El motor no propuso ningún sentido. Dicta tu criterio.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo obtener la propuesta.');
        } finally { setCorriendo(false); setProponiendo(false); }
    }, [encargo.numero, correo, contexto]);

    const aportarYProponer = useCallback(async (doc: File | null, texto: string) => {
        setError(''); setAportando(true);
        try {
            const c = await aportarContexto(correo, doc, texto);
            setContexto(c.texto);
            const p = await proponerSolucion(encargo.numero, correo, c.texto);
            setPropuesta(p);
            setProblemas((prev) => prev.map((q, i) => {
                const s2 = p.propuestas[i];
                const valido = (['fundado', 'esencialmente_fundado',
                                 'sustancialmente_fundado', 'parcialmente_fundado',
                                 'fundado_insuficiente', 'infundado', 'inoperante',
                                 'inatendible', 'ineficaz', 'sin_materia'] as const)
                    .find((x) => x === s2?.sentido);
                return s2 && s2.alcanza && valido
                    ? { ...q, sentido: valido, criterio: q.criterio || s2.razon }
                    : q;
            }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo leer el documento.');
        } finally { setAportando(false); }
    }, [correo, encargo.numero]);

    const pedirProyecto = useCallback(async () => {
        setError(''); setCorriendo(true);
        try {
            // SE MANDAN TODOS LOS SENTIDOS, NO EL PRIMERO. Antes se tomaba
            // `problemas.find(p => p.sentido)` y los demás se perdían: el
            // secretario calificaba seis problemas y el estudio recibía uno.
            // Con varios criterios el resolutivo sale mixto donde debe salir
            // mixto, que es lo que hace que concuerde con el estudio.
            // EL MODO GLOBAL NO PASA POR AQUÍ. El secretario dictó un sentido
            // para el proyecto entero y el servidor lo reparte: mandar además
            // los criterios por problema sería dar dos órdenes distintas.
            if (modo === 'global') {
                if (!sentidoGlobal) {
                    setError('Elige el sentido del problema principal.');
                    setCorriendo(false);
                    return;
                }
                // POR EL FLUJO, NO POR LA LLAMADA BLOQUEANTE. El servidor
                // tenía este camino escrito y nadie lo llamaba: todo salía por
                // /taller/resolver, que devuelve el .docx en una sola respuesta
                // al cabo de varios minutos. Medido el 7-sep-2026 en la
                // revisión 410/2026: el servidor TERMINÓ el trabajo dos veces
                // —«200 · 4,031 palabras», sin timeout ni traza— y la respuesta
                // no llegó. El proyecto existía y era inalcanzable.
                setAvance('');
                const rg = await resolverEnVivo(
                    encargo.numero, correo, {
                        sentidoGlobal, contexto, razonGlobal,
                        // Qué resolvió el órgano recurrido, del contexto que
                        // escribió el motor. Decide el verbo del resolutivo.
                        resolvioDeclarado: propuesta?.global?.contexto?.resolvio ?? '',
                        // Y la propuesta global entera, para el estudio.
                        globalJson: propuesta?.global
                            ? JSON.stringify(propuesta.global) : '',
                    },
                    (t) => setAvance((x) => {
                        // AL PRIMER TROZO, y sólo al primero: si se moviera en cada uno la
                        // pantalla temblaría durante los dos minutos que dura el estudio.
                        if (!x) irA('estudio', 120);
                        return x + t;
                    }),
                    () => setAvance((x) => x + '\n\n… componiendo el documento'));
                setProyecto(rg);
                descargarProyecto(rg);
                setPaso('proyecto');
                // Terminó: al aviso de borrador, que es lo que hay que leer
                // ANTES de abrir el documento.
                irA('proyecto', 400);
                setCorriendo(false);
                return;
            }
            const conSentido = problemas.filter((p) => p.sentido);
            const criteriosJson = conSentido.length
                ? JSON.stringify(conSentido.map((p) => ({
                      problema: p.pregunta,
                      sentido: p.sentido,
                      razonamiento: p.criterio ?? '',
                      // LO QUE SE SEMBRÓ TIENE QUE VOLVER. Este objeto se
                      // reconstruía con tres campos y perdía la jerarquía y la
                      // predicción, que es lo que ordena el estudio por
                      // prelación lógica y lo que avisa de ir contra la
                      // corriente del acervo. Es el gemelo exacto del fallo que
                      // ya costó una ronda en el servidor: un arreglo
                      // reconstruye una lista y descarta lo que otro sembró.
                      jerarquia: p.jerarquia ?? 'accesorio',
                      prediccion: p.prediccion ?? {},
                  })))
                : undefined;
            setAvance('');
            const r = await resolverEnVivo(
                encargo.numero, correo, {
                    criterio: criteriosJson ? null : {
                        sentido: problemas[0]?.sentido ?? 'infundado',
                        problema: problemas[0]?.pregunta ?? '',
                        razonamiento: problemas.filter((p) => p.criterio)
                            .map((p) => `${p.pregunta}\n${p.criterio}`).join('\n\n'),
                    },
                    criteriosJson, contexto,
                },
                (t) => setAvance((x) => {
                    // AL PRIMER TROZO, y sólo al primero: si se moviera en cada uno la
                    // pantalla temblaría durante los dos minutos que dura el estudio.
                    if (!x) irA('estudio', 120);
                    return x + t;
                }),
                () => setAvance((x) => x + '\n\n… componiendo el documento'));
            setProyecto(r);
            descargarProyecto(r);
            irA('proyecto', 400);
            setPaso('proyecto');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo redactar el proyecto.');
        } finally { setCorriendo(false); }
    }, [problemas, encargo.numero, correo, contexto, modo, sentidoGlobal, razonGlobal]);

    const asunto: Asunto = useMemo(() => ({
        numero: encargo.numero || '—',
        tipo: (encargo.tipoAsunto || 'amparo_directo') as Asunto['tipo'],
        quejoso: encargo.quejoso || '—',
        magistrado: encargo.magistrado, secretario: encargo.secretario,
        autoridades: [], actoReclamado: '',
        oportunidad: {
            notificacion: encargo.notificacion, presentacion: encargo.presentacion,
            plazo: encargo.plazo, enTiempo: true,
        },
    }), [encargo]);

    if (authLoading) {
        return <div className="grid min-h-screen place-items-center bg-charcoal-900">
            <Loader2 className="h-6 w-6 animate-spin text-accent-gold" />
        </div>;
    }

    const sinAcceso = piloto && !piloto.tiene_acceso;

    return (
        <div className="min-h-screen bg-charcoal-900 font-sans text-white antialiased">
            <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-[0.55]"
                 style={{ background: 'radial-gradient(70% 100% at 50% 0%, rgba(201,169,98,0.10) 0%, transparent 70%)' }} />

            <BarraSuperior asunto={asunto} />

            <main className="relative mx-auto grid max-w-[1500px] gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(320px,400px)_1fr]">
                <div className="flex flex-col gap-4 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto lg:pr-1">
                    {piloto && <AvisoPiloto secretarios={piloto.secretarios} cupo={piloto.cupo} />}
                    <FormularioEncargo valor={encargo} onCambiar={setEncargo} onTipo={setTipoSel}
                                       deshabilitado={corriendo || paso !== 'ficha'} />
                    <PanelDocumentos documentos={documentos} onSoltar={soltar} onQuitar={quitar}
                                     extractos={[]} vocabulario={voz} />
                    <label className={cn('block cursor-pointer rounded-xl border border-dashed',
                        'border-white/15 bg-white/[0.02] px-4 py-3 text-[12px] text-white/50',
                        'transition hover:border-accent-gold/30 hover:text-white/70')}>
                        <input type="file" accept=".docx" className="hidden"
                               onChange={(e) => e.target.files?.[0] &&
                                   setFicheros((p) => ({ ...p, plantilla: e.target.files![0] }))} />
                        {ficheros.plantilla
                            ? <>Plantilla propia: <span className="text-white/80">{ficheros.plantilla.name}</span></>
                            : <>Se usará la plantilla del tribunal ya cargada. Sube una .docx sólo si quieres otra.</>}
                    </label>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    {sinAcceso && (
                        <Tarjeta className="border-amber-400/30 bg-amber-400/[0.06]">
                            <p className="text-[13px] text-amber-100">
                                El taller de sentencias es una función Platinum.
                            </p>
                        </Tarjeta>
                    )}

                    {error && (
                        <Tarjeta className="border-red-400/30 bg-red-400/[0.06]">
                            <div className="flex gap-2.5">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                                <p className="text-[13px] leading-relaxed text-red-100">{error}</p>
                            </div>
                        </Tarjeta>
                    )}

                    <Tarjeta>
                        <Rotulo accion={<span className="text-[11px] text-white/30">se detiene una sola vez</span>}>
                            Recorrido del asunto
                        </Rotulo>
                        <span id="recorrido" />
                        <LineaDeFases fases={fasesSegun(paso, corriendo)} />

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
                            <button className={cn(boton, 'bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}
                                    disabled={corriendo || falta.length > 0 || !!sinAcceso || paso !== 'ficha'}
                                    onClick={pedirAdelanto}>
                                {corriendo && paso === 'ficha'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <FileText className="h-4 w-4" />}
                                Generar adelanto
                            </button>
            {/* ═══ EL PASO QUE SE PERDÍA ═══
                David: «después del adelanto viene la parte de consultar
                acervo. Sin embargo, el secretario se pierde».

                Dos motivos, y los dos eran de la pantalla. El botón se llamaba
                «Consultar el acervo», que dice lo que hace la máquina por
                dentro y no lo que el secretario viene a buscar; y estaba en
                gris de segunda acción, al lado de uno dorado, así que después
                de generar el adelanto la vista no tenía a dónde ir.

                Ahora dice a qué sirve —buscar la solución jurídica— y late
                mientras es EL paso que toca. El latido para en cuanto se pulsa:
                una animación que no se apaga deja de ser una guía y pasa a ser
                un adorno molesto. */}
                            <button className={cn(
                                        boton,
                                        paso === 'adelanto' && !corriendo
                                            ? 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_0_0_rgba(220,38,38,0.7)] animate-[latido_1.8s_ease-out_infinite]'
                                            : 'border border-white/12 bg-white/[0.05] text-white/85 hover:bg-white/[0.08]')}
                                    disabled={corriendo || paso === 'ficha'}
                                    onClick={pedirAcervo}>
                                {corriendo && paso === 'adelanto'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Search className="h-4 w-4" />}
                                Buscar solución jurídica
                            </button>
                        </div>

                        {falta.length > 0 && paso === 'ficha' && (
                            <p className="mt-3 text-[12px] text-white/40">
                                Falta {falta.join(', ')}.
                            </p>
                        )}
                    </Tarjeta>

                    {/* EL ACERVO, PLEGADO. Antes se desplegaba entero al pulsar
                        el botón rojo y era donde el secretario se perdía: ocho
                        tesis y treinta preceptos como pantalla de decisión.
                        No sobra —es lo que impide citar de memoria— pero es
                        material de FUNDAR, no de DECIDIR, así que va detrás de
                        un pliegue y se abre cuando se quiere comprobar algo. */}
                    {material && (
                        <Tarjeta>
                          <details className="group">
                            <summary className="-m-1 cursor-pointer list-none rounded-lg p-1 transition-colors hover:bg-white/[0.02]">
                              <Rotulo accion={
                                <span className="text-[11px] text-white/30">
                                    {material.tesis.filter((t) => t.obligatoria).length} obligatorias
                                    {' · '}{material.tesis.length} en total
                                    {' · '}<span className="text-white/45 group-open:hidden">ver</span>
                                    <span className="hidden text-white/45 group-open:inline">ocultar</span>
                                </span>
                              }>
                                En qué se apoya
                              </Rotulo>
                            </summary>
                            <ul className="grid gap-2">
                                {material.tesis.slice(0, 12).map((t) => (
                                    <li key={t.registro}
                                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                                                t.obligatoria
                                                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                                    : 'border-white/10 bg-white/[0.05] text-white/50')}>
                                                {t.obligatoria ? 'Obligatoria' : 'Orientadora'}
                                            </span>
                                            <span className="text-[11px] text-white/35">
                                                Reg. {t.registro} · {t.instancia}
                                            </span>
                                        </div>
                                        <p className="text-[12px] leading-snug text-white/75">{t.rubro}</p>
                                    </li>
                                ))}
                            </ul>
                            {material.normas.length > 0 && (
                                <p className="mt-3 text-[11px] text-white/35">
                                    Y {material.normas.length} preceptos:{' '}
                                    {material.normas.slice(0, 6).map((n) => `art. ${n.articulo}`).join(' · ')}
                                </p>
                            )}
                          </details>
                        </Tarjeta>
                    )}

                    <span id="criterio" />
                    {problemas.length > 0 && (
                        <VentanaCriterio problemas={problemas} onCambiar={cambiarCriterio}
                                         onGenerar={pedirProyecto} generando={corriendo && paso === 'acervo'}
                                         onProponer={pedirPropuesta} propuesta={propuesta}
                                         proponiendo={proponiendo}
                                         onAportar={aportarYProponer} aportando={aportando}
                                         modo={modo} onModo={setModo}
                                         sentidoGlobal={sentidoGlobal}
                                         razonGlobal={razonGlobal}
                                         onRazonGlobal={setRazonGlobal}
                                         onSentidoGlobal={setSentidoGlobal}
                                         contextoAportado={contexto.length} />
                    )}

                    {/* EL ESTUDIO, VIÉNDOSE ESCRIBIR. Antes aquí no había nada
                        durante cuatro minutos y el secretario no sabía si el
                        sistema trabajaba o se había caído. Ahora lee mientras
                        se escribe: si ve que va mal encaminado, no espera al
                        final para saberlo. */}
                    <span id="estudio" />
                    {corriendo && avance && (
                        <Tarjeta>
                            <Rotulo accion={
                                <span className="text-[11px] tabular-nums text-white/30">
                                    {avance.trim().split(/\s+/).length} palabras
                                </span>
                            }>
                                Escribiendo el estudio
                            </Rotulo>
                            <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/70">
                                    {avance}
                                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent-gold align-middle" />
                                </p>
                            </div>
                        </Tarjeta>
                    )}

                    <span id="proyecto" />
                    {proyecto && (
                        <>
                            <AvisoBorrador datos={{
                                palabras: proyecto.palabras, avisos: proyecto.avisos,
                                huecos: proyecto.huecos, tieneAdvertencias: proyecto.tieneAdvertencias,
                            }} />
                            <button className={cn(boton, 'self-start bg-accent-gold text-charcoal-900 hover:bg-accent-gold/90')}
                                    onClick={() => descargarProyecto(proyecto)}>
                                <Download className="h-4 w-4" />
                                Descargar de nuevo
                            </button>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
