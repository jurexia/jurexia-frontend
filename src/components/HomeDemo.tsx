'use client';

import { useEffect, useRef, useState } from 'react';
import {
    BarChart2, BookOpen, Check, FileEdit, FileText, FolderPlus, Gavel,
    Loader2, MapPin, Paperclip, PenTool, Plus, Search, Zap,
} from 'lucide-react';

/* Demo animada de la plataforma.
 *
 * Reescrita el 3-ago-2026 porque la anterior mostraba una versión de Iurexia
 * que ya no existe: un «Searching…» genérico donde hoy van los pasos del
 * agente, sin consulta rápida, sin los tres escalones de redacción y sin las
 * carpetas. Connect salió de la demo —tiene su propia sección en la portada y
 * no es el producto principal.
 *
 * Regla que la sostiene: **todo lo que aparece aquí existe en la plataforma**.
 * Los controles son los mismos del chat real (fuero, materia, las cinco
 * herramientas, los genios), los pasos son los que el chat pinta de verdad y
 * los artículos citados son correctos. Si algo cambia en el chat, cambia aquí.
 */

type Herramienta = 'rapida' | 'escrito' | 'sentencia' | 'precedentes' | 'jurimetria' | null;

interface Cita {
    ley: string;
    articulo: string;
}

interface Escena {
    id: string;
    etiqueta: string;
    jurisdiccion: string;
    fuero: string[];
    materia: string;
    herramienta: Herramienta;
    modo: 'buscar' | 'redactar';
    /** Escalón de redacción resaltado; sólo en modo redactar. */
    nivel?: 'Profesional' | 'Pro' | 'Platinum';
    genios: string[];
    adjunto?: string;
    consulta: string;
    pasos: string[];
    fuentes: number;
    respuesta: string;
    citas: Cita[];
    /** Cierra con la animación de guardado en una carpeta. */
    guardaEnCarpeta?: string;
}

const ESCENAS: Escena[] = [
    {
        id: 'consulta',
        etiqueta: 'Investigación',
        jurisdiccion: 'Oaxaca',
        fuero: ['estatal', 'federal'],
        materia: 'Familiar',
        herramienta: null,
        modo: 'buscar',
        genios: [],
        consulta: 'Viví tres años con mi pareja sin casarme y me dediqué al hogar. ¿Qué puedo reclamar del patrimonio común?',
        pasos: [
            'Entendiendo la consulta',
            'Consultando la legislación de Oaxaca',
            'Consultando la legislación federal',
            'Buscando jurisprudencia y precedentes',
        ],
        fuentes: 14,
        respuesta:
            'El concubinato genera derechos patrimoniales y sucesorios cuando hay convivencia pública, continua y permanente. Acreditados los tres años y la dedicación al hogar, procede reclamar alimentos y la parte proporcional del patrimonio generado durante la convivencia.',
        citas: [
            { ley: 'Código Civil de Oaxaca', articulo: 'Artículo 143 Bis' },
            { ley: 'Jurisprudencia SCJN', articulo: '1a./J. 45/2019' },
        ],
    },
    {
        id: 'rapida',
        etiqueta: 'Consulta rápida',
        jurisdiccion: 'Todas',
        fuero: ['federal'],
        materia: 'Auto',
        herramienta: 'rapida',
        modo: 'buscar',
        genios: [],
        consulta: '¿Plazo para demandar por despido injustificado?',
        pasos: ['Entendiendo la consulta', 'Localizando el artículo'],
        fuentes: 3,
        respuesta:
            'Dos meses contados a partir del día siguiente a la separación. El plazo es de caducidad, no de prescripción: transcurrido, la acción se extingue.',
        citas: [{ ley: 'Ley Federal del Trabajo', articulo: 'Artículo 518' }],
    },
    {
        id: 'redaccion',
        etiqueta: 'Redacción',
        jurisdiccion: 'Jalisco',
        fuero: [],
        materia: 'Auto',
        herramienta: 'escrito',
        modo: 'redactar',
        nivel: 'Pro',
        genios: ['Amparo'],
        consulta: 'Contestación a demanda laboral por despido injustificado, oponiendo excepción de falta de acción',
        pasos: [
            'Entendiendo la consulta',
            'Consultando la legislación federal',
            'Buscando jurisprudencia y precedentes',
            'Con el genio de Amparo',
        ],
        fuentes: 21,
        respuesta:
            'CONTESTACIÓN DE DEMANDA · Se niega la existencia del despido y se opone la excepción de falta de acción, ofreciendo como prueba el aviso de rescisión con acuse de recibo. Petitorios y capítulo probatorio incluidos.',
        citas: [{ ley: 'Ley Federal del Trabajo', articulo: 'Artículo 47' }],
        guardaEnCarpeta: 'Martínez Ruiz · Laboral',
    },
    {
        id: 'documento',
        etiqueta: 'Análisis',
        jurisdiccion: 'Nuevo León',
        fuero: [],
        materia: 'Civil',
        herramienta: 'sentencia',
        modo: 'buscar',
        genios: [],
        adjunto: 'Sentencia-1ra-instancia.pdf',
        consulta: 'Revisa esta sentencia y dime si conviene apelar',
        pasos: [
            'Leyendo el documento',
            'Entendiendo la consulta',
            'Buscando jurisprudencia y precedentes',
        ],
        fuentes: 9,
        respuesta:
            'La sentencia está bien fundada en cuanto a la existencia del adeudo, pero la valoración de la prueba testimonial es deficiente: no razona por qué desestima a dos de los tres testigos. Ese punto es apelable.',
        citas: [{ ley: 'Código de Procedimientos Civiles de Nuevo León', articulo: 'Artículo 444' }],
    },
];

const HERRAMIENTAS: { id: Exclude<Herramienta, null>; label: string; icono: typeof Zap }[] = [
    { id: 'rapida', label: 'Rápida', icono: Zap },
    { id: 'escrito', label: 'Escrito legal', icono: FileEdit },
    { id: 'sentencia', label: 'Sentencia', icono: Gavel },
    { id: 'precedentes', label: 'Precedentes', icono: BookOpen },
    { id: 'jurimetria', label: 'Jurimetría', icono: BarChart2 },
];

/** Las mismas claves que usa el chat para el filtro de fuero. */
const FUEROS = [
    { clave: 'constitucional', label: 'Const.' },
    { clave: 'federal', label: 'Federal' },
    { clave: 'estatal', label: 'Estatal' },
];

const GENIOS = ['CIDH', 'Amparo', 'Civil', 'Penal', 'Laboral', 'Fiscal'];
const NIVELES = ['Profesional', 'Pro', 'Platinum'] as const;

type Fase = 'escribiendo' | 'pasos' | 'respuesta' | 'guardando' | 'guardado';

export default function HomeDemo() {
    const [indice, setIndice] = useState(0);
    const [fase, setFase] = useState<Fase>('escribiendo');
    const [tecleado, setTecleado] = useState('');
    const [pasosHechos, setPasosHechos] = useState(0);
    const vivo = useRef(true);

    const escena = ESCENAS[indice];

    useEffect(() => {
        vivo.current = true;
        const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

        const correr = async () => {
            for (let i = 0; vivo.current; i = (i + 1) % ESCENAS.length) {
                const e = ESCENAS[i];
                if (!vivo.current) return;

                setIndice(i);
                setFase('escribiendo');
                setTecleado('');
                setPasosHechos(0);
                await esperar(900);

                // Tecleo de la consulta
                for (let c = 0; c <= e.consulta.length; c += 2) {
                    if (!vivo.current) return;
                    setTecleado(e.consulta.slice(0, c));
                    await esperar(18);
                }
                await esperar(500);

                // Pasos del agente, uno a uno
                if (!vivo.current) return;
                setFase('pasos');
                for (let p = 1; p <= e.pasos.length; p++) {
                    if (!vivo.current) return;
                    setPasosHechos(p);
                    await esperar(650);
                }
                await esperar(500);

                // Respuesta
                if (!vivo.current) return;
                setFase('respuesta');
                await esperar(e.guardaEnCarpeta ? 3600 : 5200);

                // Cierre opcional: la respuesta entra a una carpeta
                if (e.guardaEnCarpeta) {
                    if (!vivo.current) return;
                    setFase('guardando');
                    await esperar(1100);
                    if (!vivo.current) return;
                    setFase('guardado');
                    await esperar(2200);
                }
            }
        };

        void correr();
        return () => { vivo.current = false; };
    }, []);

    return (
        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-charcoal-900/10 bg-cream-300 shadow-[0_20px_50px_-20px_rgba(26,26,26,0.25)]">

            {/* ── Encabezado: el mismo del chat real ── */}
            <div className="flex items-center justify-between gap-2 border-b border-charcoal-900/[0.07] bg-cream-300/80 px-3 py-2.5 sm:px-4">
                <span className="font-serif text-lg font-semibold text-charcoal-900">
                    Iurex<span className="text-accent-gold">ia</span>
                </span>

                <div className="flex items-center gap-1.5">
                    <Chip tono="rojo"><Plus className="h-3 w-3 stroke-[3]" /><span className="hidden sm:inline">Sálvame</span></Chip>
                    <Chip tono="solido"><FileText className="h-3 w-3 text-accent-gold" /><span className="hidden sm:inline">Mi trabajo</span></Chip>
                    <Chip tono="contorno"><BookOpen className="h-3 w-3" /><span className="hidden md:inline">Normativa</span></Chip>
                    <Chip tono="dorado">
                        <MapPin className="h-3 w-3 text-accent-gold" />
                        <span className="max-w-[92px] truncate">{escena.jurisdiccion}</span>
                    </Chip>
                </div>
            </div>

            {/* ── Conversación ──
                Los mensajes se apoyan abajo, como en un chat de verdad: así no
                queda un hueco muerto entre la burbuja y el cuadro de entrada
                mientras se teclea. */}
            <div className="flex min-h-[300px] flex-col justify-end gap-3 px-3 py-4 sm:min-h-[330px] sm:px-6">

                {/* Documento adjunto, si la escena lo tiene */}
                {escena.adjunto && fase !== 'escribiendo' && (
                    <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-charcoal-900/10 bg-white px-2.5 py-1.5 text-[11px] font-medium text-charcoal-700">
                            <Paperclip className="h-3 w-3 text-charcoal-500" />
                            {escena.adjunto}
                        </span>
                    </div>
                )}

                {/* La consulta sube a burbuja sólo al enviarse; mientras se
                    teclea vive en el cuadro de entrada, como en el chat real. */}
                {fase !== 'escribiendo' && (
                    <div className="flex justify-end">
                        <p className="max-w-[85%] rounded-xl rounded-br-sm bg-charcoal-900 px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-white">
                            {escena.consulta}
                        </p>
                    </div>
                )}

                {/* Pasos del agente — el equivalente de lo que pinta el chat */}
                {(fase === 'pasos' || fase === 'respuesta' || fase === 'guardando' || fase === 'guardado') && (
                    <div className="flex gap-2.5">
                        <Avatar />
                        <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-charcoal-900/[0.07] bg-white px-3.5 py-3">
                            <ol className="flex flex-col gap-0">
                                {escena.pasos.map((paso, i) => {
                                    const hecho = fase !== 'pasos' || pasosHechos > i + 1;
                                    const activo = fase === 'pasos' && pasosHechos === i + 1;
                                    return (
                                        <li key={paso} className="relative flex items-start gap-2 pb-2 last:pb-0">
                                            {i < escena.pasos.length && (
                                                <span aria-hidden className="absolute bottom-0 left-[6px] top-[15px] w-px bg-charcoal-900/10" />
                                            )}
                                            <span className="relative z-10 mt-[2px] flex h-[13px] w-[13px] flex-shrink-0 items-center justify-center">
                                                {hecho ? (
                                                    <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full bg-accent-gold/15">
                                                        <Check className="h-2 w-2 text-accent-gold" strokeWidth={3.5} />
                                                    </span>
                                                ) : activo ? (
                                                    <Loader2 className="h-[11px] w-[11px] animate-spin text-accent-brown" />
                                                ) : (
                                                    <span className="h-[6px] w-[6px] rounded-full bg-charcoal-900/15" />
                                                )}
                                            </span>
                                            <span className={`text-[12px] leading-snug ${activo ? 'font-medium text-charcoal-900' : hecho ? 'text-charcoal-700' : 'text-charcoal-500/60'}`}>
                                                {paso}
                                            </span>
                                        </li>
                                    );
                                })}
                                {/* La cifra real de fuentes cierra la lista, como en el chat */}
                                <li className="relative flex items-start gap-2 pt-0">
                                    <span className="relative z-10 mt-[2px] flex h-[13px] w-[13px] flex-shrink-0 items-center justify-center">
                                        {fase !== 'pasos' ? (
                                            <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full bg-accent-gold/15">
                                                <Check className="h-2 w-2 text-accent-gold" strokeWidth={3.5} />
                                            </span>
                                        ) : (
                                            <span className="h-[6px] w-[6px] rounded-full bg-charcoal-900/15" />
                                        )}
                                    </span>
                                    <span className={`text-[12px] leading-snug ${fase !== 'pasos' ? 'text-charcoal-700' : 'text-charcoal-500/60'}`}>
                                        {escena.fuentes} fuentes encontradas
                                    </span>
                                </li>
                            </ol>

                            {/* Respuesta */}
                            {(fase === 'respuesta' || fase === 'guardando' || fase === 'guardado') && (
                                <div className="mt-3 border-t border-charcoal-900/[0.07] pt-3">
                                    <p className="text-[12.5px] leading-relaxed text-charcoal-800">{escena.respuesta}</p>

                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {escena.citas.map((c) => (
                                            <span
                                                key={c.articulo}
                                                className="inline-flex items-center gap-1.5 rounded-md border border-accent-gold/40 bg-accent-gold/[0.08] px-2 py-1 text-[10.5px] text-charcoal-800"
                                            >
                                                <FileText className="h-2.5 w-2.5 flex-shrink-0 text-accent-gold" />
                                                <span className="font-medium">{c.articulo}</span>
                                                <span className="text-charcoal-500">· {c.ley}</span>
                                            </span>
                                        ))}
                                    </div>

                                    {/* El cierre del ecosistema: la respuesta entra a la carpeta */}
                                    {escena.guardaEnCarpeta && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-medium transition-all duration-500 ${
                                                    fase === 'guardado'
                                                        ? 'border-accent-gold bg-accent-gold/15 text-charcoal-900'
                                                        : 'border-accent-gold/40 bg-accent-gold/[0.08] text-charcoal-800'
                                                }`}
                                            >
                                                {fase === 'guardando' ? (
                                                    <Loader2 className="h-2.5 w-2.5 animate-spin text-accent-gold" />
                                                ) : fase === 'guardado' ? (
                                                    <Check className="h-2.5 w-2.5 text-accent-gold" strokeWidth={3.5} />
                                                ) : (
                                                    <FolderPlus className="h-2.5 w-2.5 text-accent-gold" />
                                                )}
                                                A mi carpeta
                                            </span>
                                            {fase === 'guardado' && (
                                                <span className="text-[10.5px] text-charcoal-600">
                                                    Guardado en «{escena.guardaEnCarpeta}»
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Cuadro de entrada: los controles reales del chat ── */}
            <div className="border-t border-charcoal-900/[0.07] bg-cream-300 px-3 pb-3 pt-2.5 sm:px-6 sm:pb-4">
                <div className="rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

                    {/* Fuero + Materia */}
                    <div className="mb-2 flex items-center gap-2 overflow-hidden border-b border-charcoal-900/[0.06] pb-1.5">
                        <span className="hidden flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider text-charcoal-400 sm:inline">Fuero</span>
                        <div className="flex flex-shrink-0 gap-0.5 rounded-lg bg-charcoal-900/[0.04] p-0.5">
                            {FUEROS.map((f) => (
                                <Segmento key={f.clave} activo={escena.fuero.includes(f.clave)}>{f.label}</Segmento>
                            ))}
                        </div>
                        <span className="h-3.5 w-px flex-shrink-0 bg-charcoal-900/10" />
                        <span className="hidden flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider text-charcoal-400 sm:inline">Materia</span>
                        <div className="flex flex-shrink-0 gap-0.5 rounded-lg bg-charcoal-900/[0.04] p-0.5">
                            {['Auto', 'Civil', 'Penal', 'Familiar'].map((m) => (
                                <Segmento key={m} activo={escena.materia === m}>{m}</Segmento>
                            ))}
                        </div>
                    </div>

                    {/* Línea de escritura */}
                    <div className="flex items-center gap-2 py-1">
                        <p className="min-w-0 flex-1 truncate text-[13px] text-charcoal-400">
                            {fase === 'escribiendo' && tecleado ? (
                                <span className="text-charcoal-900">
                                    {tecleado}
                                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-accent-gold align-middle" />
                                </span>
                            ) : (
                                'Escribe tu consulta legal o sube tu documento para análisis'
                            )}
                        </p>
                        <Paperclip className="h-4 w-4 flex-shrink-0 text-charcoal-400" />
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-charcoal-900 text-white">
                            <Search className="h-3.5 w-3.5" />
                        </span>
                    </div>

                    {/* Buscar / Redactar + escalones */}
                    <div className="mt-2 flex items-center gap-1.5 border-t border-charcoal-900/[0.06] pt-2">
                        <div className="inline-flex overflow-hidden rounded-md border border-charcoal-900/10">
                            <span className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium ${escena.modo === 'buscar' ? 'bg-charcoal-900 text-white' : 'bg-white text-charcoal-500'}`}>
                                <Search className="h-2.5 w-2.5" />Buscar
                            </span>
                            <span className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium ${escena.modo === 'redactar' ? 'bg-charcoal-900 text-white' : 'bg-white text-charcoal-500'}`}>
                                <PenTool className="h-2.5 w-2.5" />Redactar
                            </span>
                        </div>

                        {escena.modo === 'redactar' && (
                            <div className="flex items-center gap-1">
                                {NIVELES.map((n) => (
                                    <span
                                        key={n}
                                        className={`rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors duration-300 ${
                                            escena.nivel === n
                                                ? 'border-accent-gold bg-accent-gold/15 text-charcoal-900'
                                                : 'border-charcoal-900/10 bg-white text-charcoal-500'
                                        }`}
                                    >
                                        {n}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Las cinco herramientas */}
                    <div className="mt-2 grid grid-cols-5 gap-1">
                        {HERRAMIENTAS.map((h) => {
                            const activa = escena.herramienta === h.id;
                            const Icono = h.icono;
                            return (
                                <span
                                    key={h.id}
                                    className={`flex items-center justify-center gap-1 rounded-md px-1 py-[5px] text-[9px] font-medium transition-colors duration-300 ${
                                        activa ? 'bg-accent-gold text-charcoal-900' : 'bg-charcoal-900/90 text-white/90'
                                    }`}
                                >
                                    <Icono className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate">{h.label}</span>
                                </span>
                            );
                        })}
                    </div>

                    {/* Genios */}
                    <div className="mt-2 flex items-center gap-1.5 overflow-hidden border-t border-charcoal-900/[0.06] pt-2">
                        <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-charcoal-500">Genios</span>
                        <span className="h-3 w-px flex-shrink-0 bg-charcoal-900/10" />
                        {GENIOS.map((g) => (
                            <span
                                key={g}
                                className={`flex-shrink-0 text-[10px] transition-colors duration-300 ${
                                    escena.genios.includes(g) ? 'font-bold text-accent-gold' : 'text-charcoal-500'
                                }`}
                            >
                                {g}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Indicador de escena */}
                <div className="mt-2.5 flex items-center justify-center gap-2">
                    {ESCENAS.map((e, i) => (
                        <span key={e.id} className="flex items-center gap-1.5">
                            <span className={`h-1 rounded-full transition-all duration-500 ${i === indice ? 'w-6 bg-accent-gold' : 'w-1.5 bg-charcoal-900/15'}`} />
                            {i === indice && (
                                <span className="text-[10px] font-medium text-charcoal-600">{e.etiqueta}</span>
                            )}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Avatar() {
    return (
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-charcoal-900">
            <Gavel className="h-3 w-3 text-accent-gold" />
        </span>
    );
}

function Chip({ tono, children }: { tono: 'rojo' | 'solido' | 'contorno' | 'dorado'; children: React.ReactNode }) {
    const estilos = {
        rojo: 'border border-red-700/25 bg-red-50/60 text-red-700',
        solido: 'bg-charcoal-900 text-white',
        contorno: 'border border-charcoal-900/10 text-charcoal-700',
        dorado: 'border border-accent-gold/40 bg-accent-gold/10 text-charcoal-900',
    }[tono];
    return (
        <span className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium ${estilos}`}>
            {children}
        </span>
    );
}

function Segmento({ activo, children }: { activo: boolean; children: React.ReactNode }) {
    return (
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-300 ${activo ? 'bg-charcoal-900 text-white' : 'text-charcoal-500'}`}>
            {children}
        </span>
    );
}
