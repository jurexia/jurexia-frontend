'use client';

/**
 * Taller de sentencias — la pantalla del redactor desde el adelanto.
 *
 * El plan está en `IUREXIA-MAC/PLAN-REDACTOR-ADELANTO.md` y la forma de esta
 * pantalla sale de ahí, no al revés: rejilla bento de dos columnas, a la
 * izquierda lo que el secretario aporta y lo que la máquina dedujo, a la
 * derecha el recorrido del asunto, los problemas jurídicos y la ventana donde
 * entra su criterio.
 *
 * Ruta aparte de `/sentencia`, que es el AUDITOR de sentencias y está vivo.
 *
 * ESTADO: la interfaz está terminada y es navegable; los datos son de muestra
 * mientras se construyen las fases del backend. Todo lo que se pinta sale de
 * `tipos.ts`, que es el contrato con el pipeline: cuando las fases existan se
 * sustituye el estado inicial por la llamada, sin tocar un solo componente.
 */

import React, { useCallback, useMemo, useState } from 'react';
import BarraSuperior from '@/components/sentencia/BarraSuperior';
import PanelDocumentos from '@/components/sentencia/PanelDocumentos';
import FichaAsunto from '@/components/sentencia/FichaAsunto';
import LineaDeFases from '@/components/sentencia/LineaDeFases';
import ProblemasJuridicos from '@/components/sentencia/ProblemasJuridicos';
import VentanaCriterio from '@/components/sentencia/VentanaCriterio';
import { Tarjeta, Rotulo } from '@/components/sentencia/primitivas';
import type { Asunto, Documento, Fase, ProblemaJuridico, RolDocumento } from '@/components/sentencia/tipos';

const FASES: Fase[] = [
    { id: 'ficha', titulo: 'Ficha y oportunidad', detalle: 'Partes, fechas y cómputo de días hábiles. Sin modelo: aritmética.', estado: 'lista', segundos: 3 },
    { id: 'ratio', titulo: 'Ratio del acto reclamado', detalle: 'Qué resolvió la responsable y con qué razones, anclado a su página.', estado: 'lista', segundos: 41 },
    { id: 'conceptos', titulo: 'Síntesis de conceptos', detalle: 'Un párrafo por concepto, en el registro de tus engroses.', estado: 'lista', segundos: 28 },
    { id: 'problemas', titulo: 'Problemas jurídicos', detalle: 'Del contraste entre lo resuelto y lo combatido.', estado: 'lista', segundos: 19 },
    { id: 'busqueda', titulo: 'Búsqueda por problema', detalle: 'Un RAG dirigido a cada problema, con registro verificado.', estado: 'lista', segundos: 34 },
    { id: 'criterio', titulo: 'Tu criterio', detalle: 'El único paso que no se automatiza. Decide y explica por qué.', estado: 'espera', requiereHumano: true },
    { id: 'estudio', titulo: 'Estudio de fondo', detalle: 'Tu criterio manda el sentido; el corpus, la forma; la ley, el fundamento.', estado: 'pendiente' },
    { id: 'ensamblado', titulo: 'Ensamblado en tu plantilla', detalle: 'Se rellenan los huecos del adelanto. No se construye un Word nuevo.', estado: 'pendiente' },
    { id: 'verificacion', titulo: 'Verificación', detalle: 'Registros vivos, resolutivo concordante y ningún hueco sin llenar.', estado: 'pendiente' },
];

const ASUNTO: Asunto = {
    numero: 'ADA 240/2026',
    tipo: 'amparo_directo',
    quejoso: 'Edgar Soria Hernández',
    magistrado: 'Luis Armando Pérez Topete',
    secretario: 'José David Alcántar Mendoza',
    autoridades: ['Magistrado Instructor de la Segunda Sección de la Sala Superior', 'Sala Superior'],
    actoReclamado: 'La sentencia dictada el diecisiete de febrero de dos mil veintiséis en el expediente 2505/2025, que sobreseyó el juicio por consentimiento del acto impugnado.',
    oportunidad: { notificacion: '2 mar 2026', presentacion: '20 mar 2026', plazo: 15, enTiempo: true },
};

const DOCUMENTOS: Documento[] = [
    { id: 'd1', nombre: 'Acto reclamado ada 240-2026.pdf', rol: 'acto', bytes: 2_310_442, paginas: 11, via: 'ocr', progreso: 100, estado: 'listo' },
    { id: 'd2', nombre: 'Conceptos de violación ada 240-2026.pdf', rol: 'conceptos', bytes: 984_112, paginas: 10, via: 'digital', progreso: 100, estado: 'listo' },
];

const EXTRACTOS = [
    { etiqueta: 'Acto reclamado', pagina: 7, texto: 'La Sala consideró que el actor consintió tácitamente la boleta de infracción, al no haberla impugnado dentro del plazo de quince días previsto en el artículo 26 de la ley de la materia.' },
    { etiqueta: 'Conceptos', pagina: 3, texto: 'Aduce que la boleta no señalaba con claridad los medios de impugnación procedentes, por lo que el plazo no pudo correr en su perjuicio.' },
];

const PROBLEMAS_BASE: ProblemaJuridico[] = [
    {
        id: 'p1',
        pregunta: '¿Puede tenerse por consentido el acto cuando la notificación no informó los medios de impugnación procedentes?',
        resolvio: 'Que el plazo corrió desde la notificación de la boleta y que el actor no la impugnó en quince días, por lo que la consintió.',
        combate: 'Que la boleta omitió señalar los recursos procedentes, de modo que el plazo no pudo perjudicarle.',
        candidatos: [
            { tipo: 'tesis', registro: '2002341', rubro: 'NOTIFICACIÓN POR LISTA DEL ACUERDO QUE TIENE POR ADMITIDA LA CONTESTACIÓN DE LA DEMANDA. LA OMISIÓN DE REALIZARLA PERSONALMENTE ACTUALIZA UNA VIOLACIÓN PROCESAL QUE AMERITA LA REPOSICIÓN DEL PROCEDIMIENTO.', instancia: 'Tribunales Colegiados', porQue: 'fija que el vicio de la notificación impide que el plazo surta efectos en perjuicio del particular.', verificado: true },
            { tipo: 'norma', rubro: 'Artículo 14 constitucional — garantía de audiencia y formalidades esenciales del procedimiento', porQue: 'es el marco del que deriva el deber de informar los medios de defensa.', verificado: true },
        ],
        criterio: '',
    },
    {
        id: 'p2',
        pregunta: '¿Es correcto sobreseer por consentimiento cuando la demanda ya había sido admitida sin objeción?',
        resolvio: 'Que la admisión de la demanda no impide analizar de oficio las causales de improcedencia en la sentencia.',
        combate: 'Que al admitirse la demanda debió analizarse entonces la improcedencia, y hacerlo después vulnera la seguridad jurídica.',
        candidatos: [
            { tipo: 'tesis', registro: '2028456', rubro: 'IMPROCEDENCIA. SU ANÁLISIS OFICIOSO EN LA SENTENCIA NO SE VE IMPEDIDO POR LA ADMISIÓN PREVIA DE LA DEMANDA.', instancia: 'Primera Sala', porQue: 'resuelve exactamente el punto, y en contra del planteamiento.', verificado: true },
        ],
        impedimento: {
            motivo: 'inoperancia',
            explicacion: 'El planteamiento no combate la razón toral —que la improcedencia es de orden público y de estudio oficioso—, sino un aspecto accesorio del trámite.',
        },
        criterio: '',
    },
];

export default function TallerDeSentencias() {
    const [documentos, setDocumentos] = useState<Documento[]>(DOCUMENTOS);
    const [problemas, setProblemas] = useState<ProblemaJuridico[]>(PROBLEMAS_BASE);
    const [generando, setGenerando] = useState(false);

    const soltar = useCallback((rol: RolDocumento, f: File) => {
        const id = `${rol}-${f.name}`;
        setDocumentos((prev) => [
            ...prev.filter((d) => d.rol !== rol),
            { id, nombre: f.name, rol, bytes: f.size, progreso: 8, estado: 'subiendo' },
        ]);
        // Progreso de muestra; se sustituye por el del backend.
        let p = 8;
        const t = setInterval(() => {
            p = Math.min(100, p + 11);
            setDocumentos((prev) => prev.map((d) => d.id === id
                ? { ...d, progreso: p, estado: p < 60 ? 'subiendo' : p < 100 ? 'leyendo' : 'listo' }
                : d));
            if (p >= 100) clearInterval(t);
        }, 260);
    }, []);

    const quitar = useCallback((id: string) => {
        setDocumentos((prev) => prev.filter((d) => d.id !== id));
    }, []);

    const cambiarCriterio = useCallback((id: string, campo: 'criterio' | 'sentido', valor: string) => {
        setProblemas((prev) => prev.map((p) => p.id === id ? { ...p, [campo]: valor } : p));
    }, []);

    const fases = useMemo(() => FASES, []);

    return (
        <div className="min-h-screen bg-charcoal-900 font-sans text-white antialiased">
            {/* Resplandor ambiental: una sola fuente de luz, muy tenue. */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-[0.55]"
                style={{ background: 'radial-gradient(70% 100% at 50% 0%, rgba(201,169,98,0.10) 0%, transparent 70%)' }}
            />

            <BarraSuperior asunto={ASUNTO} />

            <main className="relative mx-auto grid max-w-[1500px] gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
                {/* Izquierda — lo que se aporta y lo que se dedujo */}
                <div className="flex flex-col gap-4 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto lg:pr-1">
                    <PanelDocumentos
                        documentos={documentos} onSoltar={soltar} onQuitar={quitar}
                        extractos={EXTRACTOS}
                    />
                    <FichaAsunto asunto={ASUNTO} />
                </div>

                {/* Derecha — el recorrido y la decisión */}
                <div className="flex min-w-0 flex-col gap-4">
                    <Tarjeta>
                        <Rotulo accion={<span className="text-[11px] text-white/30">se detiene una sola vez</span>}>
                            Recorrido del asunto
                        </Rotulo>
                        <LineaDeFases fases={fases} />
                    </Tarjeta>

                    <ProblemasJuridicos problemas={problemas} />

                    <VentanaCriterio
                        problemas={problemas}
                        onCambiar={cambiarCriterio}
                        onGenerar={() => { setGenerando(true); setTimeout(() => setGenerando(false), 2200); }}
                        generando={generando}
                    />
                </div>
            </main>
        </div>
    );
}
