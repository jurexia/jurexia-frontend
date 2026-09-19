'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL REDACTOR DE ESCRITOS, PASO A PASO (19-sep-2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * David, después de un primer arreglo que sólo tocó la pintura: «yo te pedí un
 * cambio profundo, un botón completamente diferente […] que en cada uno de sus
 * rubros aparezcan letras blancas con un fondo incandescente […] y que cuando
 * seleccione cada uno haya un caminito que seguir y no se despliegue todo lo
 * que tiene que hacer el abogado de momento».
 *
 * QUÉ ESTABA MAL, Y NO ERA EL COLOR. La pantalla enseñaba a la vez: seis tipos
 * de escrito con su icono, los subtipos del elegido con el suyo, el selector
 * de motor, el de jurisdicción y el cuadro de hechos. Todo abierto desde el
 * primer segundo. El abogado no tenía que ELEGIR, tenía que DESCARTAR, que es
 * un trabajo distinto y peor. Y los iconos —una casita para el arrendamiento,
 * un carrito para la compraventa— se leen como una aplicación de reparto, no
 * como una herramienta de despacho. Se van enteros: queda el nombre del
 * escrito y, debajo, qué produce.
 *
 * CÓMO FUNCIONA AHORA. Una pregunta por pantalla. Al elegir demanda, las otras
 * cinco desaparecen y entran las materias; al elegir civil, entran las vías; y
 * sólo al final se piden los hechos. Lo andado queda arriba en un rastro que
 * se puede pulsar para volver, porque un asistente que cierra puertas sin
 * dejar volver es peor que una pantalla llena.
 *
 * EL CAMINO NO ES EL MISMO PARA TODOS, y fingir que sí sería mentir sobre el
 * oficio: un contrato no tiene vía procesal, y una denuncia disciplinaria
 * pregunta ámbito, cargo y faltas. Por eso cada tipo declara sus propios pasos
 * en `FLUJOS` y el asistente recorre los que haya.
 *
 * La materia física de las losas —el negro con textura, el filo incandescente—
 * vive en `globals.css` bajo `.losa`, con su porqué escrito allí.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronRight, ArrowLeft, Lock, Check } from 'lucide-react';

interface DraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDraft: (draftRequest: DraftRequest) => void;
    estado?: string;
    /** Plan Pro o superior: habilita los escalones de redacción. */
    isPro?: boolean;
}

/** Con qué motor se escribe. Es la misma escalera del compositor: mandarlo
 *  desde aquí es lo que hace que el botón redacte tan bien como escribirlo a
 *  mano con «Redactar» encendido. */
export type NivelEscrito = 'profesional' | 'pro' | 'platinum';

export interface DraftRequest {
    /** Con qué motor se redacta. Ver `NivelEscrito`. */
    nivel: NivelEscrito;
    tipo: 'contrato' | 'demanda' | 'amparo' | 'impugnacion' | 'peticion_oficio' | 'denuncia_administrativa';
    subtipo: string;
    estado: string;
    descripcion: string;
    /** La vía procesal, cuando el tipo de escrito tiene una. */
    via?: string;
    // Campos adicionales para denuncia administrativa
    nivel_autoridad?: string;
    cargo_denunciado?: string;
    materia_denuncia?: string;
    faltas?: string[];
}

type DocumentType = DraftRequest['tipo'];

interface Opcion {
    valor: string;
    nombre: string;
    /** Qué produce o cuándo se usa. Sin esto la lista es un examen de memoria. */
    glosa: string;
}

interface Paso {
    /** Dónde se guarda lo elegido. */
    clave: 'subtipo' | 'via' | 'ambito' | 'cargo' | 'faltas';
    /** La pregunta, tal como se le hace al abogado. */
    titulo: string;
    rastro: string;
    glosa: string;
    /** Fijas, o distintas según lo elegido en los pasos anteriores. */
    opciones: Opcion[] | ((elegido: Record<string, string>) => Opcion[]);
    /** Varias a la vez, como las faltas de una denuncia. */
    multiple?: boolean;
}

// ── El catálogo de escritos ────────────────────────────────────────────────
const TIPOS: { valor: DocumentType; nombre: string; glosa: string }[] = [
    { valor: 'demanda', nombre: 'Demanda', glosa: 'Hechos, derecho, pruebas y puntos petitorios' },
    { valor: 'amparo', nombre: 'Amparo', glosa: 'Acto reclamado, autoridades y conceptos de violación' },
    { valor: 'impugnacion', nombre: 'Impugnación', glosa: 'Agravios construidos contra la resolución' },
    { valor: 'contrato', nombre: 'Contrato', glosa: 'Cláusulas, obligaciones y penas convencionales' },
    { valor: 'peticion_oficio', nombre: 'Petición u oficio', glosa: 'Escritos del artículo 8º y comunicaciones oficiales' },
    { valor: 'denuncia_administrativa', nombre: 'Denuncia disciplinaria', glosa: 'Queja por la actuación de un servidor judicial' },
];

const MATERIAS_DEMANDA: Opcion[] = [
    { valor: 'civil', nombre: 'Civil', glosa: 'Obligaciones, propiedad, responsabilidad' },
    { valor: 'familiar', nombre: 'Familiar', glosa: 'Alimentos, custodia, divorcio, filiación' },
    { valor: 'laboral', nombre: 'Laboral', glosa: 'Despido, prestaciones, riesgos de trabajo' },
    { valor: 'mercantil', nombre: 'Mercantil', glosa: 'Títulos de crédito, sociedades, contratos' },
    { valor: 'agrario', nombre: 'Agrario', glosa: 'Ejidos, comunidades y derechos parcelarios' },
];

/* LAS VÍAS SON DE VERDAD, no una lista decorativa: de la vía dependen el plazo,
   el tribunal y la forma del escrito. Preguntarla aquí es lo que evita que el
   abogado reciba una demanda bien escrita por la vía equivocada. */
const VIAS: Record<string, Opcion[]> = {
    civil: [
        { valor: 'ordinario civil', nombre: 'Ordinario civil', glosa: 'La vía general cuando la ley no señala otra' },
        { valor: 'sumario civil', nombre: 'Sumario civil', glosa: 'Plazos cortos, para los casos que la ley enumera' },
        { valor: 'ejecutivo civil', nombre: 'Ejecutivo civil', glosa: 'Con documento que trae aparejada ejecución' },
        { valor: 'especial hipotecario', nombre: 'Especial hipotecario', glosa: 'Cobro con garantía real inscrita' },
        { valor: 'controversia de arrendamiento', nombre: 'Controversia de arrendamiento', glosa: 'Desocupación, rentas y prórroga' },
    ],
    familiar: [
        { valor: 'controversia del orden familiar', nombre: 'Controversia del orden familiar', glosa: 'La vía ordinaria de lo familiar' },
        { valor: 'divorcio incausado', nombre: 'Divorcio incausado', glosa: 'Sin expresión de causa, con propuesta de convenio' },
        { valor: 'juicio ordinario familiar', nombre: 'Ordinario familiar', glosa: 'Nulidad, filiación y acciones de estado' },
        { valor: 'jurisdicción voluntaria', nombre: 'Jurisdicción voluntaria', glosa: 'Sin contención entre partes' },
    ],
    laboral: [
        { valor: 'ordinario laboral', nombre: 'Ordinario laboral', glosa: 'Ante el Tribunal Laboral, agotada la conciliación' },
        { valor: 'procedimiento especial', nombre: 'Procedimiento especial', glosa: 'Los supuestos que la ley reserva a esta vía' },
        { valor: 'conflicto colectivo', nombre: 'Conflicto colectivo', glosa: 'De naturaleza económica o de titularidad' },
    ],
    mercantil: [
        { valor: 'oral mercantil', nombre: 'Oral mercantil', glosa: 'La vía por defecto del comercio' },
        { valor: 'ejecutivo mercantil', nombre: 'Ejecutivo mercantil', glosa: 'Con título ejecutivo: pagaré, cheque, factura' },
        { valor: 'ordinario mercantil', nombre: 'Ordinario mercantil', glosa: 'Cuando la ley excluye la oralidad' },
    ],
    agrario: [
        { valor: 'juicio agrario', nombre: 'Juicio agrario', glosa: 'Ante el Tribunal Unitario Agrario' },
    ],
};

const FLUJOS: Record<DocumentType, Paso[]> = {
    demanda: [
        {
            clave: 'subtipo', rastro: 'Materia', titulo: '¿De qué materia es la demanda?',
            glosa: 'De aquí sale la legislación con la que se funda el escrito.',
            opciones: MATERIAS_DEMANDA,
        },
        {
            clave: 'via', rastro: 'Vía', titulo: '¿Por qué vía se promueve?',
            glosa: 'La vía manda sobre el plazo, el tribunal y la forma del escrito.',
            opciones: (elegido) => VIAS[elegido.subtipo] ?? [],
        },
    ],
    amparo: [
        {
            clave: 'subtipo', rastro: 'Clase', titulo: '¿Qué amparo vas a promover?',
            glosa: 'Indirecto ante Juez de Distrito; directo ante Tribunal Colegiado.',
            opciones: [
                { valor: 'amparo_indirecto', nombre: 'Amparo indirecto', glosa: 'Contra actos fuera de juicio o de imposible reparación' },
                { valor: 'amparo_directo', nombre: 'Amparo directo', glosa: 'Contra sentencias definitivas y laudos' },
            ],
        },
        {
            clave: 'via', rastro: 'Suspensión', titulo: '¿Qué pides sobre la suspensión?',
            glosa: 'Decide si el escrito lleva capítulo de suspensión y con qué alcance.',
            opciones: [
                { valor: 'suspensión de plano', nombre: 'De plano', glosa: 'Actos prohibidos por el artículo 22 constitucional' },
                { valor: 'suspensión a petición de parte', nombre: 'A petición de parte', glosa: 'Con apariencia del buen derecho y ponderación' },
                { valor: 'sin suspensión', nombre: 'Sin suspensión', glosa: 'Sólo el fondo del amparo' },
            ],
        },
    ],
    impugnacion: [
        {
            clave: 'subtipo', rastro: 'Recurso', titulo: '¿Qué recurso vas a interponer?',
            glosa: 'Cada recurso tiene su plazo y su tribunal.',
            opciones: [
                { valor: 'apelacion', nombre: 'Apelación', glosa: 'Contra sentencias y autos de primera instancia' },
                { valor: 'revocacion', nombre: 'Revocación', glosa: 'Ante el mismo juez que dictó la resolución' },
                { valor: 'queja', nombre: 'Queja', glosa: 'En amparo, contra los supuestos que la ley enumera' },
                { valor: 'revision', nombre: 'Revisión', glosa: 'Contra la sentencia del juez de amparo' },
                { valor: 'agravio', nombre: 'Agravios', glosa: 'El cuerpo de agravios, sin escrito de interposición' },
            ],
        },
        {
            clave: 'via', rastro: 'Materia', titulo: '¿En qué materia se dictó la resolución?',
            glosa: 'Orienta la legislación aplicable y los criterios que se buscan.',
            opciones: [
                { valor: 'civil', nombre: 'Civil', glosa: '' },
                { valor: 'familiar', nombre: 'Familiar', glosa: '' },
                { valor: 'mercantil', nombre: 'Mercantil', glosa: '' },
                { valor: 'penal', nombre: 'Penal', glosa: '' },
                { valor: 'laboral', nombre: 'Laboral', glosa: '' },
                { valor: 'administrativa', nombre: 'Administrativa', glosa: '' },
            ],
        },
    ],
    contrato: [
        {
            clave: 'subtipo', rastro: 'Contrato', titulo: '¿Qué contrato necesitas?',
            glosa: 'Un contrato no tiene vía procesal: de aquí se pasa directo a los hechos.',
            opciones: [
                { valor: 'arrendamiento', nombre: 'Arrendamiento', glosa: 'Renta, plazo, garantía y causas de rescisión' },
                { valor: 'compraventa', nombre: 'Compraventa', glosa: 'Precio, entrega, saneamiento y evicción' },
                { valor: 'prestacion_servicios', nombre: 'Prestación de servicios', glosa: 'Alcance, contraprestación y confidencialidad' },
                { valor: 'comodato', nombre: 'Comodato', glosa: 'Uso gratuito con obligación de restituir' },
                { valor: 'mutuo', nombre: 'Mutuo', glosa: 'Préstamo con o sin interés, y su garantía' },
            ],
        },
    ],
    peticion_oficio: [
        {
            clave: 'subtipo', rastro: 'Escrito', titulo: '¿Qué escrito vas a presentar?',
            glosa: 'Todos se fundan en el derecho de petición del artículo 8º.',
            opciones: [
                { valor: 'peticion_ciudadana', nombre: 'Petición de ciudadano', glosa: 'Dirigida a una autoridad, con respuesta obligada' },
                { valor: 'oficio_autoridad', nombre: 'Oficio entre autoridades', glosa: 'Comunicación oficial con fundamento y petición' },
                { valor: 'respuesta_peticion', nombre: 'Respuesta a una petición', glosa: 'La contestación fundada y motivada de la autoridad' },
            ],
        },
    ],
    denuncia_administrativa: [
        {
            clave: 'ambito', rastro: 'Ámbito', titulo: '¿Ante qué órgano se denuncia?',
            glosa: 'Decide la ley disciplinaria y el órgano competente.',
            opciones: [
                { valor: 'federal', nombre: 'Federal', glosa: 'Órgano de disciplina del Poder Judicial de la Federación' },
                { valor: 'estatal', nombre: 'Estatal', glosa: 'Consejo de la Judicatura de tu entidad' },
            ],
        },
        {
            clave: 'cargo', rastro: 'Cargo', titulo: '¿Qué cargo tiene la persona denunciada?',
            glosa: 'De esto depende quién resuelve la queja.',
            opciones: [
                { valor: 'juez', nombre: 'Juez o jueza', glosa: '' },
                { valor: 'magistrado', nombre: 'Magistrado o magistrada', glosa: '' },
                { valor: 'secretario', nombre: 'Secretario de acuerdos', glosa: '' },
                { valor: 'actuario', nombre: 'Actuario o notificador', glosa: '' },
                { valor: 'otro', nombre: 'Otro servidor público', glosa: '' },
            ],
        },
        {
            clave: 'faltas', rastro: 'Faltas', titulo: '¿Qué faltas vas a denunciar?', multiple: true,
            glosa: 'Elige todas las que correspondan. Cada una se desarrolla por separado.',
            opciones: [
                { valor: 'dilacion', nombre: 'Dilación procesal excesiva', glosa: 'Plazos vencidos sin proveer' },
                { valor: 'ineptitud', nombre: 'Notoria ineptitud o descuido', glosa: 'Errores graves y reiterados' },
                { valor: 'parcialidad', nombre: 'Parcialidad manifiesta', glosa: 'Trato desigual entre las partes' },
                { valor: 'negligencia', nombre: 'Negligencia administrativa', glosa: 'Pérdida o desorden del expediente' },
                { valor: 'corrupcion', nombre: 'Corrupción o cohecho', glosa: 'Dádivas o gestión indebida' },
                { valor: 'abuso_autoridad', nombre: 'Abuso de autoridad', glosa: 'Exceso en el ejercicio del cargo' },
                { valor: 'violacion_derechos', nombre: 'Violación de derechos humanos', glosa: 'Afectación a derechos en el proceso' },
                { valor: 'otro', nombre: 'Otra falta', glosa: 'Se describe en los hechos' },
            ],
        },
    ],
};

const MOTORES: { valor: NivelEscrito; nombre: string; glosa: string; requierePro: boolean }[] = [
    { valor: 'profesional', nombre: 'Profesional', glosa: 'En todos los planes', requierePro: false },
    { valor: 'pro', nombre: 'Pro', glosa: 'Más extensión y criterios', requierePro: true },
    { valor: 'platinum', nombre: 'Platinum', glosa: 'El más desarrollado', requierePro: true },
];

/* LOS ESTADOS Y CUÁL VALE.
   Una denuncia de nivel estatal salió al API como «Nivel: Estatal ()», sin
   estado, y el redactor dejó veinte huecos «[INSERTAR ARTÍCULO APLICABLE]»
   (medido el 16-sep-2026 sobre los escritos guardados). Pasaba porque el
   selector no tenía opción vacía: si el estado del chat llegaba vacío —o
   llegaba «FEDERAL», el valor por omisión, o «CIUDAD_DE_MEXICO», que aquí se
   llama «CDMX»—, la pantalla enseñaba «Aguascalientes» como elegido mientras
   por dentro no había ninguno. El abogado creía haber elegido estado. */
const ESTADOS: ReadonlyArray<readonly [string, string]> = [
    ['AGUASCALIENTES', 'Aguascalientes'], ['BAJA_CALIFORNIA', 'Baja California'],
    ['BAJA_CALIFORNIA_SUR', 'Baja California Sur'], ['CAMPECHE', 'Campeche'],
    ['CHIAPAS', 'Chiapas'], ['CHIHUAHUA', 'Chihuahua'], ['COAHUILA', 'Coahuila'],
    ['COLIMA', 'Colima'], ['CDMX', 'Ciudad de México'], ['DURANGO', 'Durango'],
    ['ESTADO_DE_MEXICO', 'Estado de México'], ['GUANAJUATO', 'Guanajuato'],
    ['GUERRERO', 'Guerrero'], ['HIDALGO', 'Hidalgo'], ['JALISCO', 'Jalisco'],
    ['MICHOACAN', 'Michoacán'], ['MORELOS', 'Morelos'], ['NAYARIT', 'Nayarit'],
    ['NUEVO_LEON', 'Nuevo León'], ['OAXACA', 'Oaxaca'], ['PUEBLA', 'Puebla'],
    ['QUERETARO', 'Querétaro'], ['QUINTANA_ROO', 'Quintana Roo'],
    ['SAN_LUIS_POTOSI', 'San Luis Potosí'], ['SINALOA', 'Sinaloa'],
    ['SONORA', 'Sonora'], ['TABASCO', 'Tabasco'], ['TAMAULIPAS', 'Tamaulipas'],
    ['TLAXCALA', 'Tlaxcala'], ['VERACRUZ', 'Veracruz'], ['YUCATAN', 'Yucatán'],
    ['ZACATECAS', 'Zacatecas'],
];
const ALIAS_ESTADO: Record<string, string> = { CIUDAD_DE_MEXICO: 'CDMX' };

function estadoDelSelector(estado?: string): string {
    const v = ALIAS_ESTADO[estado ?? ''] ?? estado ?? '';
    return ESTADOS.some(([valor]) => valor === v) ? v : '';
}

/* QUÉ CONTAR EN LOS HECHOS, según lo que se está redactando. Son ejemplos
   escritos para cada figura, no un «describe tu caso» genérico: lo que el
   abogado olvida mencionar es justo lo que el escrito acaba dejando en
   blanco. Venían del redactor anterior y se conservan tal cual. */
const GUIAS: Record<string, Record<string, string>> = {
    contrato: {
        arrendamiento: 'Ejemplo: arrendamiento de un departamento en Calle Juárez 123, Querétaro. Arrendador: Juan Pérez. Arrendataria: María García. Renta: $8,000 mensuales. Plazo: 12 meses. Depósito: dos meses.',
        compraventa: 'Ejemplo: compraventa de un vehículo Honda Civic 2020. Vendedor: Carlos López. Compradora: Ana Martínez. Precio: $250,000, pagadero en una exhibición.',
        prestacion_servicios: 'Ejemplo: consultoría legal por seis meses. Prestador: Despacho Legal S.C. Cliente: Empresa ABC S.A. de C.V. Honorarios: $15,000 mensuales.',
        comodato: 'Describe las partes, el bien prestado, el plazo y las condiciones de uso gratuito.',
        mutuo: 'Describe las partes, el monto del préstamo, la tasa de interés si la hay, el plazo y la forma de pago.',
    },
    demanda: {
        civil: 'Ejemplo: incumplimiento de contrato. Juan Pérez demanda a María García por rentas vencidas de $24,000, correspondientes a tres meses.',
        familiar: 'Ejemplo: divorcio incausado. María García pide la disolución del vínculo. Hay dos hijos menores, bienes que liquidar y pensión que fijar.',
        laboral: 'Ejemplo: despido injustificado. Trabajador con cinco años de antigüedad, salario diario de $500, despedido el 15 de enero de 2025.',
        mercantil: 'Ejemplo: pagaré vencido por $150,000 más intereses moratorios, suscrito el 2 de febrero de 2025 y no pagado a su vencimiento.',
        agrario: 'Ejemplo: conflicto por derechos parcelarios. Describe el ejido, la parcela, la asamblea que resolvió y la afectación.',
    },
    amparo: {
        amparo_indirecto: 'Ejemplo: orden de clausura de un negocio dictada sin audiencia previa. Describe el acto, la autoridad responsable y los derechos violados.',
        amparo_directo: 'Ejemplo: sentencia de segunda instancia que confirmó la condena. Describe la resolución, el tribunal que la dictó y los conceptos de violación.',
    },
    impugnacion: {
        apelacion: 'Ejemplo: sentencia que desestimó la demanda por falta de pruebas. Describe la resolución, el juzgado y los agravios que te causa.',
        revocacion: 'Ejemplo: auto que negó la admisión de la prueba pericial. Describe el auto y por qué debe revocarse.',
        queja: 'Ejemplo: el juez no admitió el recurso de apelación. Describe el acto procesal contra el que te quejas.',
        revision: 'Ejemplo: el Juzgado de Distrito negó el amparo. Describe la sentencia y los agravios.',
        agravio: 'Describe la resolución impugnada: qué se resolvió, qué norma se viola, cómo se viola y qué perjuicio causa.',
    },
    peticion_oficio: {
        peticion_ciudadana: 'Ejemplo: solicito al IMSS copia certificada de mi expediente clínico, con fundamento en la Ley de Transparencia.',
        oficio_autoridad: 'Ejemplo: oficio del juzgado al Registro Público solicitando la inscripción de un embargo.',
        respuesta_peticion: 'Describe la petición recibida, qué solicitó la persona y en qué sentido se responderá.',
    },
};

function guiaDeHechos(tipo: DocumentType | null, subtipo: string): string {
    if (tipo === 'denuncia_administrativa') {
        return 'Fechas, número de expediente, qué se pidió, cuándo, y qué hizo o dejó de hacer la persona servidora pública. Con constancias si las tienes a la vista.';
    }
    return GUIAS[tipo ?? '']?.[subtipo]
        ?? 'Nombres, fechas, cantidades y qué se pide. Cuanto más concreto, menos huecos deja el escrito.';
}

// ── La losa ────────────────────────────────────────────────────────────────
function Losa({ nombre, glosa, encendida, bloqueada, onClick, insignia, compacta }: {
    nombre: string;
    glosa?: string;
    encendida?: boolean;
    bloqueada?: boolean;
    onClick: () => void;
    insignia?: React.ReactNode;
    compacta?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={bloqueada}
            aria-pressed={encendida}
            className={`losa group w-full text-left ${compacta ? 'px-3 py-2.5' : 'px-4 py-3.5 sm:px-5'}`}
        >
            <span aria-hidden className="filo" />
            <span className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                    <span className={`flex items-center gap-1.5 font-semibold leading-tight text-white ${compacta ? 'text-[13px]' : 'text-[15px]'}`}>
                        {nombre}
                        {bloqueada && <Lock className="h-3 w-3 flex-none text-white/40" />}
                    </span>
                    {glosa ? (
                        <span className={`glosa mt-1 block leading-snug text-white/55 ${compacta ? 'text-[11px]' : 'text-[12.5px]'}`}>
                            {glosa}
                        </span>
                    ) : null}
                </span>
                {insignia}
                {!bloqueada && !insignia && !compacta && (
                    <ChevronRight className="h-4 w-4 flex-none text-white/25 transition-colors group-hover:text-accent-gold" />
                )}
            </span>
        </button>
    );
}

// ── El asistente ───────────────────────────────────────────────────────────
export default function DraftModal({ isOpen, onClose, onDraft, estado = 'FEDERAL', isPro = false }: DraftModalProps) {
    const [tipo, setTipo] = useState<DocumentType | null>(null);
    const [elegido, setElegido] = useState<Record<string, string>>({});
    const [faltas, setFaltas] = useState<string[]>([]);
    const [indice, setIndice] = useState(0);
    const [enHechos, setEnHechos] = useState(false);
    const [descripcion, setDescripcion] = useState('');
    const [nivel, setNivel] = useState<NivelEscrito>('profesional');
    const [selectedEstado, setSelectedEstado] = useState(() => estadoDelSelector(estado));

    // El estado del chat puede llegar DESPUÉS de montar. Se toma al abrir si
    // todavía no hay uno elegido; nunca pisa la elección del abogado.
    useEffect(() => {
        if (isOpen) setSelectedEstado((actual) => actual || estadoDelSelector(estado));
    }, [isOpen, estado]);

    const flujo = useMemo(() => (tipo ? FLUJOS[tipo] : []), [tipo]);
    const paso = !tipo || enHechos ? null : (flujo[indice] ?? null);

    const opcionesDelPaso = useMemo(() => {
        if (!paso) return [];
        return typeof paso.opciones === 'function' ? paso.opciones(elegido) : paso.opciones;
    }, [paso, elegido]);

    const reiniciar = () => {
        setTipo(null); setElegido({}); setFaltas([]); setIndice(0);
        setEnHechos(false); setDescripcion('');
    };

    const cerrar = () => { reiniciar(); onClose(); };

    /** El siguiente paso con opciones que enseñar, o los hechos si no queda ninguno. */
    const irAlSiguiente = (desde: number, conLoElegido: Record<string, string>) => {
        let n = desde + 1;
        while (n < flujo.length) {
            const p = flujo[n];
            const ops = typeof p.opciones === 'function' ? p.opciones(conLoElegido) : p.opciones;
            if (ops.length > 0) break;
            n += 1;
        }
        if (n >= flujo.length) setEnHechos(true);
        else setIndice(n);
    };

    const elegirTipo = (t: DocumentType) => {
        setTipo(t); setElegido({}); setFaltas([]); setIndice(0);
        setEnHechos(FLUJOS[t].length === 0);
    };

    const elegirOpcion = (valor: string) => {
        if (!paso) return;
        if (paso.multiple) {
            // Con varias, se marca y se avanza con el botón de abajo.
            setFaltas((f) => f.includes(valor) ? f.filter((x) => x !== valor) : [...f, valor]);
            return;
        }
        // Se avanza con el valor NUEVO y no con el del cierre: la vía de una
        // demanda civil se calculaba con la materia todavía vacía, así que el
        // paso se saltaba solo y el abogado nunca veía las vías.
        const siguiente = { ...elegido, [paso.clave]: valor };
        setElegido(siguiente);
        irAlSiguiente(indice, siguiente);
    };

    /** Volver a un punto del rastro. -1 es la elección de tipo. */
    const volverA = (n: number) => {
        setEnHechos(false);
        if (n < 0) { setTipo(null); setElegido({}); setFaltas([]); setIndice(0); return; }
        setIndice(n);
    };

    const esDenuncia = tipo === 'denuncia_administrativa';
    const necesitaEstado = !esDenuncia || elegido.ambito === 'estatal';
    const listoParaRedactar = Boolean(
        tipo && descripcion.trim().length > 10
        && (!esDenuncia || faltas.length > 0)
        && (!necesitaEstado || selectedEstado)
    );

    const enviar = () => {
        if (!tipo || !listoParaRedactar) return;
        if (esDenuncia) {
            onDraft({
                nivel, tipo: 'denuncia_administrativa',
                subtipo: faltas.join(','),
                estado: elegido.ambito === 'estatal' ? selectedEstado : 'FEDERAL',
                descripcion: descripcion.trim(),
                nivel_autoridad: elegido.ambito || 'federal',
                cargo_denunciado: elegido.cargo || 'juez',
                materia_denuncia: 'civil',
                faltas,
            });
        } else {
            onDraft({
                nivel, tipo,
                subtipo: elegido.subtipo || '',
                estado: selectedEstado,
                descripcion: descripcion.trim(),
                ...(elegido.via ? { via: elegido.via } : {}),
            });
        }
        reiniciar();
        onClose();
    };

    if (!isOpen) return null;

    // El rastro: lo andado, pulsable para volver.
    const migas: { texto: string; ir: () => void }[] = [];
    if (tipo) {
        migas.push({ texto: TIPOS.find((t) => t.valor === tipo)!.nombre, ir: () => volverA(-1) });
        flujo.forEach((p, n) => {
            if (n >= indice && !enHechos) return;
            if (p.multiple) {
                if (faltas.length) {
                    migas.push({ texto: `${faltas.length} ${faltas.length === 1 ? 'falta' : 'faltas'}`, ir: () => volverA(n) });
                }
                return;
            }
            const v = elegido[p.clave];
            if (!v) return;
            const ops = typeof p.opciones === 'function' ? p.opciones(elegido) : p.opciones;
            migas.push({ texto: ops.find((o) => o.valor === v)?.nombre ?? v, ir: () => volverA(n) });
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-charcoal-950 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.9)]">

                {/* ═══ CABECERA ═══ */}
                <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
                    <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-accent-gold" />
                    <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-gold/80">
                            Redacción asistida
                        </div>
                        <h2 className="mt-1 font-serif text-[21px] font-semibold leading-tight text-cream-100">
                            {tipo ? TIPOS.find((t) => t.valor === tipo)!.nombre : 'Nuevo escrito'}
                        </h2>
                    </div>
                    <button
                        onClick={cerrar}
                        className="flex-none rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ═══ EL RASTRO ═══ */}
                {migas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-white/[0.06] bg-white/[0.02] px-5 py-2.5 sm:px-6">
                        <button
                            onClick={() => volverA(-1)}
                            className="mr-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-accent-gold"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Empezar de nuevo
                        </button>
                        {migas.map((m, n) => (
                            <React.Fragment key={n}>
                                <ChevronRight className="h-3 w-3 flex-none text-white/20" />
                                <button
                                    onClick={m.ir}
                                    className="rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold text-accent-gold/90 transition-colors hover:bg-accent-gold/10"
                                >
                                    {m.texto}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* ═══ EL PASO QUE TOCA ═══ */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">

                    {/* 1 · El tipo de escrito */}
                    {!tipo && (
                        <>
                            <p className="mb-4 text-[13px] leading-relaxed text-white/50">
                                Elige qué vas a redactar. Iurexia lo escribe completo, con los preceptos
                                y criterios de tu jurisdicción, y después lo editas en la hoja.
                            </p>
                            <div className="grid gap-2">
                                {TIPOS.map((t) => (
                                    <Losa key={t.valor} nombre={t.nombre} glosa={t.glosa}
                                          onClick={() => elegirTipo(t.valor)} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* 2 · Los pasos propios de cada tipo */}
                    {paso && (
                        <>
                            <h3 className="font-serif text-[17px] font-semibold leading-snug text-cream-100">
                                {paso.titulo}
                            </h3>
                            <p className="mb-4 mt-1 text-[12.5px] leading-relaxed text-white/45">
                                {paso.glosa}
                            </p>
                            <div className="grid gap-2">
                                {opcionesDelPaso.map((o) => (
                                    <Losa
                                        key={o.valor}
                                        nombre={o.nombre}
                                        glosa={o.glosa || undefined}
                                        encendida={paso.multiple ? faltas.includes(o.valor) : elegido[paso.clave] === o.valor}
                                        onClick={() => elegirOpcion(o.valor)}
                                        insignia={paso.multiple && faltas.includes(o.valor)
                                            ? <Check className="h-4 w-4 flex-none text-white" />
                                            : undefined}
                                    />
                                ))}
                            </div>
                            {paso.multiple && (
                                <button
                                    onClick={() => irAlSiguiente(indice, elegido)}
                                    disabled={faltas.length === 0}
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gold px-4 py-3 text-sm font-bold text-charcoal-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Continuar
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </>
                    )}

                    {/* 3 · Los hechos, la jurisdicción y el motor */}
                    {enHechos && (
                        <>
                            <h3 className="font-serif text-[17px] font-semibold leading-snug text-cream-100">
                                Cuéntale el caso
                            </h3>
                            <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-white/45">
                                {guiaDeHechos(tipo, elegido.subtipo || '')}
                            </p>
                            <textarea
                                id="hechos-del-escrito"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                rows={6}
                                placeholder="Escribe aquí los hechos, con nombres, fechas y cantidades…"
                                className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[14px] leading-relaxed text-cream-100 placeholder:text-white/25 focus:border-accent-gold/60 focus:outline-none focus:ring-1 focus:ring-accent-gold/40"
                            />

                            {necesitaEstado && (
                                <div className="mt-4">
                                    <label htmlFor="jurisdiccion-escrito" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                                        Jurisdicción
                                    </label>
                                    <select
                                        id="jurisdiccion-escrito"
                                        value={selectedEstado}
                                        onChange={(e) => setSelectedEstado(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-[14px] text-cream-100 focus:border-accent-gold/60 focus:outline-none"
                                    >
                                        <option value="">Elige la entidad…</option>
                                        {!esDenuncia && <option value="FEDERAL">Federal</option>}
                                        {ESTADOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="mt-4">
                                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                                    Con qué motor se escribe
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {MOTORES.map((m) => {
                                        const bloqueado = m.requierePro && !isPro;
                                        return (
                                            <Losa
                                                key={m.valor}
                                                compacta
                                                nombre={m.nombre}
                                                glosa={bloqueado ? 'Requiere plan Pro' : m.glosa}
                                                encendida={nivel === m.valor}
                                                bloqueada={bloqueado}
                                                onClick={() => setNivel(m.valor)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ═══ PIE ═══ */}
                {enHechos && (
                    <div className="flex items-center gap-3 border-t border-white/10 bg-black/30 px-5 py-3.5 sm:px-6">
                        <span className="flex-1 text-[11.5px] text-white/40">
                            Cuenta como una consulta.
                        </span>
                        <button
                            onClick={enviar}
                            disabled={!listoParaRedactar}
                            className="inline-flex items-center gap-2 rounded-xl bg-accent-gold px-5 py-2.5 text-sm font-bold text-charcoal-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Redactar el escrito
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
