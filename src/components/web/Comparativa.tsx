import { Antetitulo, Boton } from '@/components/web/sistema';

/* ═══ COMPARATIVA: UN MODELO GENERAL FRENTE A IUREXIA (3-oct-2026) ═══
   Reescrita para no contradecir el «now powered by OpenAI»: no compara a
   Iurexia contra la tecnología que usa, sino un modelo GENERAL contra el
   mismo poder con el derecho mexicano verificado detrás, y lo dice con
   justicia («puede citar» en vez de «inventa»). El logotipo de ChatGPT se
   queda: David, «no quites logos». */

const FILAS: [string, string, string][] = [
    ['Jurisprudencia mexicana real y verificada', 'Puede citar tesis y registros que no existen', 'Acervo verificado: más de 2 millones de fragmentos de leyes, jurisprudencia y sentencias'],
    ['Cita artículos exactos de leyes vigentes', 'No comprueba si el artículo sigue vigente', 'Artículos textuales de códigos y leyes actualizados'],
    ['Filtro por estado y fuero', 'No separa la legislación de cada estado', 'Sólo la legislación de tu estado, más la federal'],
    ['Redacción de escritos con fundamento', 'Redacta sin anclar cada cita a su fuente', 'Escritos con artículos y tesis verificados'],
    ['Análisis de sentencias y demandas', 'Análisis general, sin el acervo mexicano', 'Auditoría con fortalezas, debilidades y mejoras'],
    ['Flujos de trabajo', 'Sin flujos para escritos mexicanos', 'Demandas y escritos completos, parte por parte'],
    ['Precio', '~$400 MXN/mes (Plus)', 'Desde $79 MXN/mes con todo incluido'],
];

function LogoChatGPT({ className }: { className: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
    );
}

const Cruz = () => (
    <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-piedra-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const Palomita = () => (
    <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
);

const MarcaIurexia = ({ className }: { className: string }) => (
    <span className={`font-marca font-semibold ${className}`}>
        <span className="text-white">Iurex</span><span className="text-accent-gold">ia</span>
    </span>
);

export default function Comparativa() {
    return (
        <section className="bg-cream-300 py-16 sm:py-32">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <Antetitulo className="mb-4">Comparativa</Antetitulo>
                    <h2 className="font-serif text-[2.1rem] font-normal leading-[1.1] tracking-[-0.015em] text-tinta [text-wrap:balance] sm:text-display-m">
                        Un modelo general frente a Iurexia
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-piedra-700 sm:text-lg">
                        ChatGPT es una herramienta general extraordinaria, pero no fue diseñada para el sistema jurídico
                        mexicano. Iurexia usa modelos de OpenAI y no los deja responder de memoria: los pone a razonar
                        sobre el derecho mexicano verificado.
                    </p>
                </div>

                {/* En teléfono la tabla (640 px) se cortaba por la derecha sin que nada dijera que
                    se desliza: allí cada capacidad va en su fila, con las dos respuestas lado a lado. */}
                <div className="mt-10 overflow-hidden rounded-xl border border-tinta/10 bg-white sm:hidden">
                    <div className="grid grid-cols-2 bg-tinta">
                        <p className="flex items-center justify-center gap-1.5 px-3 py-4 text-base font-semibold tracking-tight text-white">
                            <LogoChatGPT className="h-4 w-4" />
                            ChatGPT
                        </p>
                        <p className="flex items-center justify-center bg-white/[0.06] px-3 py-4">
                            <MarcaIurexia className="text-lg" />
                        </p>
                    </div>
                    <ul>
                        {FILAS.map(([capacidad, general, iurexia], i) => (
                            <li key={capacidad} className={i < FILAS.length - 1 ? 'border-b border-tinta/[0.06]' : ''}>
                                <p className="px-4 pt-4 text-[13.5px] font-medium text-tinta">{capacidad}</p>
                                <div className="mt-1 grid grid-cols-2 text-[13px] leading-snug">
                                    <p className="flex items-start gap-1.5 px-4 pb-4 pt-2 text-piedra-600"><Cruz /><span>{general}</span></p>
                                    <p className="flex items-start gap-1.5 bg-accent-gold/[0.05] px-4 pb-4 pt-2 text-tinta"><Palomita /><span>{iurexia}</span></p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-12 hidden overflow-hidden rounded-xl border border-tinta/10 bg-white sm:block">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="bg-tinta text-cream-100">
                                    <th scope="col" className="w-[34%] px-5 py-5 text-left text-[12px] font-medium uppercase tracking-[0.16em] text-white/55">Capacidad</th>
                                    <th scope="col" className="w-[33%] px-4 py-5 text-center">
                                        <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                                            <LogoChatGPT className="h-5 w-5 sm:h-6 sm:w-6" />
                                            <span>ChatGPT</span>
                                        </span>
                                    </th>
                                    <th scope="col" className="w-[33%] bg-white/[0.06] px-4 py-5 text-center">
                                        <MarcaIurexia className="text-xl sm:text-2xl" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {FILAS.map(([capacidad, general, iurexia], i) => (
                                    <tr key={capacidad} className={i < FILAS.length - 1 ? 'border-b border-tinta/[0.06]' : ''}>
                                        <td className="px-5 py-4 text-sm font-medium text-tinta">{capacidad}</td>
                                        <td className="px-4 py-4 text-sm text-piedra-600">
                                            <span className="flex items-start gap-1.5">
                                                <Cruz />
                                                <span>{general}</span>
                                            </span>
                                        </td>
                                        <td className="bg-accent-gold/[0.05] px-4 py-4 text-sm text-tinta">
                                            <span className="flex items-start gap-1.5">
                                                <Palomita />
                                                <span>{iurexia}</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-10 flex flex-col items-center gap-5 text-center">
                    <p className="max-w-xl text-[0.9375rem] leading-relaxed text-piedra-700">
                        En derecho, un artículo equivocado puede costar un caso. Por eso cada cita de Iurexia abre su documento oficial.
                    </p>
                    <Boton href="/registro">Probar Iurexia gratis</Boton>
                </div>
            </div>
        </section>
    );
}
