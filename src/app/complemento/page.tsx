'use client';

/**
 * LA PÁGINA DE INSTALACIÓN, EN IUREXIA.
 *
 * A un secretario se le está pidiendo que cargue en su navegador un programa
 * que va a leer el expediente de un particular. Lo mínimo es que el enlace sea
 * del sitio que ya conoce, que la página diga qué hace el programa con esos
 * datos, y que no le prometa nada que no sea cierto.
 */

import Link from 'next/link';
import { Download, ArrowRight, ShieldCheck, MousePointerClick, FolderOpen } from 'lucide-react';
import Navbar from '@/components/Navbar';

const PASOS = [
    {
        titulo: 'Descarga y descomprime',
        texto: 'El archivo trae una carpeta llamada iurexia-sise. Guárdala donde no la vayas a borrar: Chrome la lee de ahí cada vez que abre.',
    },
    {
        titulo: 'Abre chrome://extensions',
        texto: 'Copia esa dirección en la barra de Chrome y enciende Modo de desarrollador, arriba a la derecha.',
    },
    {
        titulo: 'Cargar descomprimida',
        texto: 'Pulsa ese botón y elige la carpeta iurexia-sise. Ya está: no hay nada que configurar.',
    },
];

export default function ComplementoPage() {
    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            <section className="px-4 pt-32 pb-16">
                <div className="mx-auto max-w-3xl">
                    <p className="mb-3 font-medium tracking-wide text-accent-brown">COMPLEMENTO PARA CHROME</p>
                    <h1 className="mb-6 font-serif text-4xl font-medium leading-tight text-charcoal-900 md:text-5xl">
                        Trae el expediente al taller
                        <br />
                        <span className="text-accent-gold">sin teclear nada</span>
                    </h1>
                    <p className="mb-8 max-w-2xl text-lg text-charcoal-600">
                        Abres tu expediente en SISE, pulsas <strong>Vista Expediente Electrónico</strong> y
                        mandas las constancias al taller. El número, el tipo de asunto, el órgano, el
                        magistrado ponente y el secretario de acuerdos salen de los propios autos.
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        <a href="/api/complemento" download
                           className="inline-flex items-center gap-2 rounded-xl bg-charcoal-900 px-6 py-3.5
                                      font-medium text-cream-100 transition hover:bg-charcoal-800">
                            <Download className="h-5 w-5" />
                            Descargar el complemento
                        </a>
                        <span className="text-sm text-charcoal-500">Chrome de escritorio · 25&nbsp;KB</span>
                    </div>
                </div>
            </section>

            <section className="border-t border-charcoal-900/10 px-4 py-16">
                <div className="mx-auto max-w-3xl">
                    <h2 className="mb-8 font-serif text-2xl font-medium text-charcoal-900">
                        Tres pasos, una sola vez
                    </h2>
                    <ol className="space-y-7">
                        {PASOS.map((p, i) => (
                            <li key={p.titulo} className="flex gap-5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                                                 bg-accent-gold/20 font-serif text-lg text-accent-brown">
                                    {i + 1}
                                </span>
                                <div>
                                    <h3 className="mb-1 font-medium text-charcoal-900">{p.titulo}</h3>
                                    <p className="text-charcoal-600">{p.texto}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    {/* POR QUÉ NO ES UN CLIC, dicho en vez de disimulado. */}
                    <p className="mt-8 rounded-xl bg-charcoal-900/[0.04] px-5 py-4 text-sm text-charcoal-600">
                        Son tres pasos y no uno porque Chrome sólo instala de un clic lo que viene de su
                        tienda, y publicar ahí exige cuenta de desarrollador y revisión. Mientras tanto,
                        esto es lo más corto que permite el navegador.
                    </p>
                </div>
            </section>

            <section className="border-t border-charcoal-900/10 px-4 py-16">
                <div className="mx-auto max-w-3xl">
                    <h2 className="mb-3 flex items-center gap-2.5 font-serif text-2xl font-medium text-charcoal-900">
                        <ShieldCheck className="h-6 w-6 text-accent-brown" />
                        Qué hace con tus datos
                    </h2>
                    <div className="space-y-4 text-charcoal-600">
                        <p>
                            <strong className="text-charcoal-900">No guarda ni envía tu usuario, tu
                            contraseña ni tu sesión del Consejo.</strong> Usa la sesión que ya tienes
                            abierta en tu navegador, y sólo para pedirle al propio Consejo los documentos
                            que marques. Tu contraseña no pasa por aquí en ningún momento.
                        </p>
                        <p>
                            <strong className="text-charcoal-900">No se manda ningún correo a nadie.</strong>{' '}
                            Las constancias viajan cifradas de esa pestaña al servidor y quedan sólo en tu
                            taller. Tampoco se descarga nada a tu disco: el complemento no pide permiso
                            para escribir en tus carpetas.
                        </p>
                        <p>
                            <strong className="text-charcoal-900">Se usan una vez y se borran.</strong> Las
                            constancias se sueltan en cuanto el taller las toma; lo que no llegues a usar
                            se borra a las 48 horas. No se comparten con nadie ni se usan para entrenar
                            nada.
                        </p>
                        <p>
                            De Iurexia lee dos cosas, y sólo desde iurexia.com: tu correo, para poder
                            enseñártelo antes de enviar, y el identificador de tu sesión, para que el
                            servidor compruebe por sí mismo de quién son las constancias en vez de fiarse
                            de un texto escrito a mano.
                        </p>
                    </div>
                    <p className="mt-6 text-sm text-charcoal-500">
                        Los permisos que pide Chrome al instalarlo son los mínimos para eso:{' '}
                        <code className="rounded bg-charcoal-900/[0.06] px-1.5 py-0.5">storage</code>, y
                        acceso al visor del Consejo y a Iurexia. Nada más.
                    </p>
                </div>
            </section>

            <section className="border-t border-charcoal-900/10 px-4 py-16">
                <div className="mx-auto max-w-3xl">
                    <h2 className="mb-6 font-serif text-2xl font-medium text-charcoal-900">
                        Y después
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="rounded-xl border border-charcoal-900/10 bg-cream-100 p-5">
                            <MousePointerClick className="mb-3 h-5 w-5 text-accent-brown" />
                            <h3 className="mb-1.5 font-medium text-charcoal-900">En el visor</h3>
                            <p className="text-sm text-charcoal-600">
                                Abajo a la derecha aparece el botón <strong>Iurexia</strong>. Vienen
                                marcados los acuerdos y las promociones; las notificaciones, no. Desmarca
                                lo que sobre y pulsa <strong>Mandar constancias seleccionadas al
                                taller</strong>.
                            </p>
                        </div>
                        <div className="rounded-xl border border-charcoal-900/10 bg-cream-100 p-5">
                            <FolderOpen className="mb-3 h-5 w-5 text-accent-brown" />
                            <h3 className="mb-1.5 font-medium text-charcoal-900">En el taller</h3>
                            <p className="text-sm text-charcoal-600">
                                Al volver a la pestaña, el módulo se actualiza solo y el expediente está
                                esperando, con cada documento y sus páginas. Sólo se pregunta la fecha de
                                notificación: es la única que no está en los escaneos.
                            </p>
                        </div>
                    </div>
                    <Link href="/tcc-beta"
                          className="mt-8 inline-flex items-center gap-2 font-medium text-accent-brown
                                     transition hover:gap-3">
                        Ir al taller de sentencias
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}
