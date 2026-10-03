'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, NotebookPen } from 'lucide-react';

/* Lo que el estudiante lleva consigo: qué lecciones ya estudió y sus apuntes a
   las preguntas para pensar. Vive sólo en su navegador (localStorage), sin
   cuenta: es una comodidad, no un expediente. Si el navegador no deja guardar
   —ventana privada, almacenamiento bloqueado—, todo funciona igual y
   simplemente no se recuerda. */

const CLAVE_ESTUDIADAS = 'iurexia-estudiar-estudiadas';
const EVENTO = 'iurexia-estudio';

function leerEstudiadas(): string[] {
    try {
        const v = JSON.parse(localStorage.getItem(CLAVE_ESTUDIADAS) || '[]');
        return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function guardarEstudiadas(ids: string[]) {
    try {
        localStorage.setItem(CLAVE_ESTUDIADAS, JSON.stringify(ids));
    } catch { /* sin almacenamiento: no se recuerda */ }
    window.dispatchEvent(new Event(EVENTO));
}

function useEstudiadas(): string[] | null {
    const [ids, setIds] = useState<string[] | null>(null);
    useEffect(() => {
        const leer = () => setIds(leerEstudiadas());
        leer();
        window.addEventListener(EVENTO, leer);
        window.addEventListener('storage', leer);
        return () => {
            window.removeEventListener(EVENTO, leer);
            window.removeEventListener('storage', leer);
        };
    }, []);
    return ids;
}

/** El botón del final de cada lección. */
export function MarcarEstudiada({ id }: { id: string }) {
    const ids = useEstudiadas();
    const hecha = !!ids?.includes(id);
    return (
        <button
            type="button"
            onClick={() => {
                const actuales = leerEstudiadas();
                guardarEstudiadas(hecha ? actuales.filter((x) => x !== id) : [...actuales, id]);
            }}
            aria-pressed={hecha}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[0.875rem] font-medium transition-colors ${
                hecha
                    ? 'border border-accent-gold/50 bg-accent-gold/10 text-charcoal-900 hover:bg-accent-gold/15'
                    : 'bg-charcoal-900 text-white hover:bg-charcoal-800'
            }`}
        >
            {hecha ? <CheckCircle2 className="h-4 w-4 text-accent-brown" /> : <Check className="h-4 w-4 text-accent-gold" />}
            {hecha ? 'Lección estudiada' : 'Marcar como estudiada'}
        </button>
    );
}

/** La palomita junto a cada lección del temario. */
export function MarcaEstudiada({ id }: { id: string }) {
    const ids = useEstudiadas();
    if (!ids?.includes(id)) return null;
    return (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent-brown">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Estudiada
        </span>
    );
}

/** El avance, arriba del temario. No aparece hasta que hay algo que contar. */
export function ProgresoEstudio({ total, ids: validos }: { total: number; ids: string[] }) {
    const ids = useEstudiadas();
    const hechas = (ids ?? []).filter((x) => validos.includes(x)).length;
    if (!hechas) return null;
    return (
        <div className="flex items-center gap-3 text-[13px] text-charcoal-900/70">
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-charcoal-900/10" aria-hidden>
                <span className="block h-full rounded-full bg-accent-gold" style={{ width: `${(hechas / total) * 100}%` }} />
            </span>
            <span>
                Llevas <strong className="font-semibold text-charcoal-900">{hechas}</strong> de {total} lecciones estudiadas
            </span>
        </div>
    );
}

/** «Estreno: 6 oct» mientras el video no se publique. Se decide en el navegador. */
export function EstadoEstreno({ publicado }: { publicado: string }) {
    const [futuro, setFuturo] = useState(false);
    useEffect(() => setFuturo(Date.now() < new Date(publicado).getTime()), [publicado]);
    if (!futuro) return null;
    const fecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' })
        .format(new Date(publicado));
    return (
        <span className="inline-flex items-center rounded-md border border-accent-gold/40 bg-accent-gold/10 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent-brown">
            Estreno · {fecha}
        </span>
    );
}

/** Las preguntas del final de la lectura, con un espacio para pensarlas por escrito. */
export function PreguntasParaPensar({ id, preguntas }: { id: string; preguntas: string[] }) {
    return (
        <ol className="space-y-4">
            {preguntas.map((p, i) => (
                <Pregunta key={i} clave={`iurexia-estudiar-notas:${id}:${i}`} numero={i + 1} html={p} />
            ))}
        </ol>
    );
}

function Pregunta({ clave, numero, html }: { clave: string; numero: number; html: string }) {
    const [abierta, setAbierta] = useState(false);
    const [texto, setTexto] = useState('');
    const [guardado, setGuardado] = useState(false);

    useEffect(() => {
        try {
            const v = localStorage.getItem(clave);
            if (v) {
                setTexto(v);
                setAbierta(true);
            }
        } catch { /* sin almacenamiento */ }
    }, [clave]);

    useEffect(() => {
        if (!abierta) return;
        const t = window.setTimeout(() => {
            try {
                if (texto.trim()) localStorage.setItem(clave, texto);
                else localStorage.removeItem(clave);
                setGuardado(!!texto.trim());
            } catch { /* sin almacenamiento */ }
        }, 500);
        return () => window.clearTimeout(t);
    }, [texto, abierta, clave]);

    return (
        <li className="grid grid-cols-[2rem_1fr] gap-x-3">
            <span className="pt-0.5 font-serif text-lg font-semibold leading-none lining-nums text-accent-gold" aria-hidden>
                {numero}
            </span>
            <div>
                <p className="font-lectura text-[1.0625rem] leading-relaxed text-charcoal-900" dangerouslySetInnerHTML={{ __html: html }} />
                {abierta ? (
                    <div className="mt-2.5">
                        <textarea
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            rows={3}
                            placeholder="Escribe tu respuesta. Pensarla por escrito es la mitad del estudio."
                            aria-label={`Tu respuesta a la pregunta ${numero}`}
                            className="block w-full resize-y rounded-lg border border-charcoal-900/15 bg-white px-3.5 py-2.5 font-lectura text-[1rem] leading-relaxed text-charcoal-900 outline-none transition-colors placeholder:text-charcoal-900/35 focus:border-accent-gold/70"
                        />
                        <p className="mt-1.5 text-[11.5px] text-charcoal-900/45">
                            {guardado ? 'Guardado en este navegador.' : 'Se guarda sólo en este navegador; nadie más lo ve.'}
                        </p>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setAbierta(true)}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-brown transition-colors hover:text-charcoal-900"
                    >
                        <NotebookPen className="h-3.5 w-3.5" />
                        Escribir mi respuesta
                    </button>
                )}
            </div>
        </li>
    );
}

/** Copiar al portapapeles, para «cómo citar». */
export function CopiarTexto({ texto, etiqueta = 'Copiar' }: { texto: string; etiqueta?: string }) {
    const [hecho, setHecho] = useState(false);
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(texto);
                    setHecho(true);
                    window.setTimeout(() => setHecho(false), 2000);
                } catch { /* sin permiso de portapapeles */ }
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-charcoal-900/15 px-3 text-[12.5px] font-medium text-charcoal-900/80 transition-colors hover:border-charcoal-900/30 hover:bg-charcoal-900/[0.03]"
        >
            {hecho ? <Check className="h-3.5 w-3.5 text-accent-brown" /> : <Copy className="h-3.5 w-3.5" />}
            {hecho ? 'Copiado' : etiqueta}
        </button>
    );
}
