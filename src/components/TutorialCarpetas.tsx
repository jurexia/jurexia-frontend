'use client'

import { useEffect, useState } from 'react'
import {
    AlertCircle,
    ArrowRight,
    BarChart3,
    ChevronLeft,
    FileText,
    Flag,
    FolderOpen,
    Network,
    Plus,
    ScanLine,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react'

import { CarpetaIcono } from '@/components/CarpetaIcono'

/**
 * El recorrido de las carpetas inteligentes — el mismo que la app.
 *
 * No señala botones: cuenta una historia. Al entrar por primera vez la pantalla
 * está vacía y no hay nada que señalar; lo que hay que transmitir es *para qué
 * sirve llenarla*. El arco va del desorden que el abogado ya padece, al objetivo
 * como pieza que lo cambia todo, a lo que la IA hace con eso, y termina en la
 * promesa concreta.
 *
 * La carpeta del fondo se va llenando conforme avanzan los pasos: es el mismo
 * argumento, contado sin palabras.
 */

const CLAVE = 'iurexia.tutorial.carpetas.v1'

interface Paso {
    Icono: typeof FolderOpen
    seccion: string
    titulo: string
    texto: string
    /** Un caso concreto, con nombre y apellido. Es lo que hace clic. */
    ejemplo?: string
    /** El remate: qué gana el abogado. */
    gana?: string
}

const PASOS: Paso[] = [
    {
        Icono: FolderOpen,
        seccion: 'EL PROBLEMA',
        titulo: 'Adiós al expediente disperso',
        texto:
            'El contrato en el correo, el acuse en WhatsApp, las pruebas en una carpeta del escritorio y el plazo en un papelito. Así se pierden los asuntos: no por falta de derecho, por falta de orden.',
        gana: 'Aquí cada asunto vive en un solo lugar, contigo a donde vayas.',
    },
    {
        Icono: Flag,
        seccion: 'LO QUE CAMBIA TODO',
        titulo: 'Dile a la carpeta qué quieres lograr',
        texto:
            'Al crearla escribes tu objetivo en una línea. Ése es el corazón: sin él, esto sería un archivero; con él, Iurexia tiene contra qué medir todo lo que subas.',
        ejemplo:
            '«Obtener la suspensión definitiva contra la negativa del IMSS a reconocer la enfermedad de trabajo.»',
    },
    {
        Icono: ScanLine,
        seccion: 'ALIMENTAR',
        titulo: 'Sube lo que tengas, como lo tengas',
        texto:
            'Arrastra el PDF del contrato, la demanda escaneada, la foto del acuerdo. Iurexia lee hasta lo escaneado a mano y guarda el texto, no la imagen — por eso pesa poco y se busca rápido.',
        ejemplo: 'Y desde el chat, cualquier respuesta se guarda aquí con un clic.',
    },
    {
        Icono: Sparkles,
        seccion: 'LA CARPETA TRABAJA',
        titulo: 'Iurexia lee todo y te dice dónde estás',
        texto:
            'Con un clic analiza el expediente completo contra tu objetivo: te da el resumen del caso, su estado procesal y un porcentaje honesto de avance.',
        gana: 'Dejas de preguntarte «¿en qué iba este asunto?» al abrir el expediente.',
    },
    {
        Icono: AlertCircle,
        seccion: 'LA CARPETA TRABAJA',
        titulo: 'Qué te falta y qué se te está pasando',
        texto:
            'No te dice «faltan pruebas». Te dice qué prueba, para acreditar qué hecho y por qué la necesitas. Y aparte te advierte lo que quizá no viste: plazos corriendo, documentos vencidos, contradicciones entre lo que subiste.',
        ejemplo:
            '«Falta el acuse de recibo del escrito de 12 de marzo: sin él no se acredita la oportunidad del recurso.»',
        gana: 'Es leer tu propio expediente con los ojos del abogado contrario.',
    },
    {
        Icono: FileText,
        seccion: 'LA CARPETA TRABAJA',
        titulo: 'Y lo que falta, lo redacta',
        texto:
            'Cada pendiente que detecta trae un botón. Lo pulsas y escribe la promoción, el recurso, el capítulo de pruebas o el plan de trabajo — con los datos de tu propio expediente, en Word, listo para que lo corrijas y lo presentes.',
        gana: 'El documento se guarda en la carpeta y cuenta para tu avance. La carpeta se completa sola.',
    },
    {
        Icono: BarChart3,
        seccion: 'SI LITIGAS',
        titulo: 'Jurimetría: tus probabilidades reales',
        texto:
            'Antes de invertir meses en un asunto, pregúntale a los hechos. Jurimetría mide miles de sentencias terminales de Tribunales Colegiados en casos análogos al tuyo y te dice en qué sentido se resolvieron, con cuántos precedentes y qué factor pesó más.',
        ejemplo:
            'Sirve para decidir si conviene litigar, para qué agravio insistir, y para poner expectativas al cliente con datos y no con optimismo.',
        gana: 'Incluida en el plan Platinum.',
    },
    {
        Icono: Network,
        seccion: 'TODO CONECTADO',
        titulo: 'Un ecosistema, no seis herramientas',
        texto:
            'Preguntas en el chat y guardas la respuesta en la carpeta. Subes un acuerdo y entra al análisis. Lo que empiezas en el celular lo sigues aquí: son las mismas carpetas.',
        gana: 'Cada cosa que agregas hace más lista a la carpeta.',
    },
    {
        Icono: ShieldCheck,
        seccion: 'LA PROMESA',
        titulo: 'Si la alimentas, no se te pierde nada',
        texto:
            'Documentos donde deben estar, plazos a la vista, lo que falta señalado y redactado. Ése es el trato: tú subes, Iurexia ordena, analiza y escribe.',
        gana: 'Empieza con una carpeta. La del asunto que más te preocupa hoy.',
    },
]

export default function TutorialCarpetas({
    abierto,
    onCerrar,
    onCrear,
}: {
    abierto: boolean
    onCerrar: () => void
    onCrear: () => void
}) {
    const [paso, setPaso] = useState(0)

    useEffect(() => {
        if (abierto) setPaso(0)
    }, [abierto])

    useEffect(() => {
        if (!abierto) return
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === 'Escape') terminar()
            if (e.key === 'ArrowRight') setPaso((p) => Math.min(PASOS.length - 1, p + 1))
            if (e.key === 'ArrowLeft') setPaso((p) => Math.max(0, p - 1))
        }
        window.addEventListener('keydown', alTeclear)
        return () => window.removeEventListener('keydown', alTeclear)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto])

    if (!abierto) return null

    const actual = PASOS[paso]
    const ultimo = paso === PASOS.length - 1
    // El avance de la carpeta del fondo acompaña al avance del recorrido.
    const avance = Math.round(((paso + 1) / PASOS.length) * 100)

    function terminar() {
        try {
            window.localStorage.setItem(CLAVE, '1')
        } catch {
            /* sin persistencia se repetirá; no es grave */
        }
        onCerrar()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(26,26,26,0.35)' }}>
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-cream-100 shadow-xl">
                <div className="flex items-center justify-between px-6 pt-5">
                    <span className="text-xs font-bold tracking-widest text-charcoal-700/50">
                        {paso + 1} DE {PASOS.length}
                    </span>
                    <button
                        onClick={terminar}
                        className="rounded-lg p-1.5 text-charcoal-700/50 transition hover:bg-cream-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-4 pt-2">
                    {/* La carpeta que se va llenando: el argumento sin palabras. */}
                    <div className="mb-6 flex justify-center">
                        <CarpetaIcono
                            tipo="cliente"
                            tamano={110}
                            documentos={Math.min(3, paso)}
                            avance={paso === 0 ? null : avance}
                        />
                    </div>

                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gold/20">
                            <actual.Icono className="h-5 w-5 text-accent-brown" />
                        </span>
                        <span className="text-xs font-extrabold tracking-widest text-accent-brown">
                            {actual.seccion}
                        </span>
                    </div>

                    <h2 className="font-serif text-2xl font-semibold leading-snug text-charcoal-900">
                        {actual.titulo}
                    </h2>

                    <p className="mt-3 leading-relaxed text-charcoal-700/85">{actual.texto}</p>

                    {actual.ejemplo ? (
                        <p className="mt-4 rounded-lg border border-cream-400 bg-cream-50 px-4 py-3 text-sm italic leading-relaxed text-charcoal-700/75">
                            {actual.ejemplo}
                        </p>
                    ) : null}

                    {actual.gana ? (
                        <p className="mt-4 border-l-[3px] border-accent-gold pl-4 text-sm font-semibold leading-relaxed text-accent-brown">
                            {actual.gana}
                        </p>
                    ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-cream-400 px-6 py-4">
                    <div className="flex gap-1.5">
                        {PASOS.map((_, i) => (
                            <span
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === paso ? 'w-5 bg-accent-brown' : 'w-1.5 bg-cream-400'
                                }`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {paso > 0 ? (
                            <button
                                onClick={() => setPaso((p) => p - 1)}
                                className="rounded-lg border border-cream-400 p-2.5 text-charcoal-700 transition hover:bg-cream-200">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        ) : null}
                        <button
                            onClick={() => {
                                if (!ultimo) return setPaso((p) => p + 1)
                                terminar()
                                onCrear()
                            }}
                            className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-charcoal-800">
                            {ultimo ? 'Crear mi primera carpeta' : 'Siguiente'}
                            {ultimo ? (
                                <Plus className="h-4 w-4" />
                            ) : (
                                <ArrowRight className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
