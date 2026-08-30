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
import type { Encargo } from '@/components/sentencia/FormularioEncargo';
import AvisoBorrador, { AvisoPiloto } from '@/components/sentencia/AvisoBorrador';
import { Tarjeta, Rotulo, cn } from '@/components/sentencia/primitivas';
import type { Asunto, Documento, Fase, ProblemaJuridico, RolDocumento } from '@/components/sentencia/tipos';
import {
    generarAdelanto, descargar, consultarAcervo, resolverConCriterio,
    proponerSolucion, aportarContexto, type RespuestaPropuesta,
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
    // Lo que el secretario aporta porque el acervo no lo tenía. Vive aquí y
    // viaja con cada petición: el servidor no lo guarda.
    const [contexto, setContexto] = useState('');
    const [aportando, setAportando] = useState(false);
    const [corriendo, setCorriendo] = useState(false);
    const [error, setError] = useState('');
    const [piloto, setPiloto] = useState<EstadoPiloto | null>(null);

    const [encargo, setEncargo] = useState<Encargo>(ENCARGO_VACIO);
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
        if (!ficheros.acto) f.push('el acto reclamado');
        if (!ficheros.conceptos) f.push('los conceptos de violación');
        return f;
    }, [encargo, ficheros]);

    const pedirAdelanto = useCallback(async () => {
        setError(''); setCorriendo(true);
        try {
            const r = await generarAdelanto(
                { ...encargo, reglaSurtimiento: encargo.reglaSurtimiento,
                  tipoAsunto: encargo.esRecurso ? 'amparo_revision' : 'amparo_directo',
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
        setError(''); setCorriendo(true);
        try {
            const p = await proponerSolucion(encargo.numero, correo, contexto);
            setPropuesta(p);
            // Se vuelca sobre los problemas para que se vean y se puedan editar.
            setProblemas((prev) => prev.map((q, i) => {
                const s = p.propuestas[i];
                // El sentido es una unión cerrada: lo que venga de fuera se
                // valida antes de entrar, no se castea a ciegas.
                const valido = (['fundado', 'infundado', 'inoperante', 'ineficaz'] as const)
                    .find((x) => x === s?.sentido);
                return s && s.alcanza && valido
                    ? { ...q, sentido: valido, criterio: q.criterio || s.razon }
                    : q;
            }));
            if (!p.propuestas.length) {
                setError('El motor no propuso ningún sentido. Dicta tu criterio.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo obtener la propuesta.');
        } finally { setCorriendo(false); }
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
                const valido = (['fundado', 'infundado', 'inoperante', 'ineficaz'] as const)
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
            const conSentido = problemas.filter((p) => p.sentido);
            const criteriosJson = conSentido.length
                ? JSON.stringify(conSentido.map((p) => ({
                      problema: p.pregunta,
                      sentido: p.sentido,
                      razonamiento: p.criterio ?? '',
                  })))
                : undefined;
            const r = await resolverConCriterio(
                encargo.numero, correo,
                criteriosJson ? null : {
                    sentido: problemas[0]?.sentido ?? 'infundado',
                    problema: problemas[0]?.pregunta ?? '',
                    razonamiento: problemas.filter((p) => p.criterio)
                        .map((p) => `${p.pregunta}\n${p.criterio}`).join('\n\n'),
                },
                criteriosJson, contexto,
            );
            setProyecto(r);
            descargarProyecto(r);
            setPaso('proyecto');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo redactar el proyecto.');
        } finally { setCorriendo(false); }
    }, [problemas, encargo.numero, correo, contexto]);

    const asunto: Asunto = useMemo(() => ({
        numero: encargo.numero || '—',
        tipo: encargo.esRecurso ? 'amparo_revision' : 'amparo_directo',
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
                    <FormularioEncargo valor={encargo} onCambiar={setEncargo}
                                       deshabilitado={corriendo || paso !== 'ficha'} />
                    <PanelDocumentos documentos={documentos} onSoltar={soltar} onQuitar={quitar}
                                     extractos={[]} />
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
                            <button className={cn(boton, 'border border-white/12 bg-white/[0.05] text-white/85 hover:bg-white/[0.08]')}
                                    disabled={corriendo || paso === 'ficha'}
                                    onClick={pedirAcervo}>
                                {corriendo && paso === 'adelanto'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Search className="h-4 w-4" />}
                                Consultar el acervo
                            </button>
                        </div>

                        {falta.length > 0 && paso === 'ficha' && (
                            <p className="mt-3 text-[12px] text-white/40">
                                Falta {falta.join(', ')}.
                            </p>
                        )}
                    </Tarjeta>

                    {material && (
                        <Tarjeta>
                            <Rotulo accion={
                                <span className="text-[11px] text-white/30">
                                    {material.tesis.filter((t) => t.obligatoria).length} obligatorias
                                    {' · '}{material.tesis.length} en total
                                </span>
                            }>
                                Lo que dice el acervo
                            </Rotulo>
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
                        </Tarjeta>
                    )}

                    {problemas.length > 0 && (
                        <VentanaCriterio problemas={problemas} onCambiar={cambiarCriterio}
                                         onGenerar={pedirProyecto} generando={corriendo && paso === 'acervo'}
                                         onProponer={pedirPropuesta} propuesta={propuesta}
                                         onAportar={aportarYProponer} aportando={aportando}
                                         contextoAportado={contexto.length} />
                    )}

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
