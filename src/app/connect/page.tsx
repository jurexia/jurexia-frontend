'use client';

import { BadgeCheck, MessageSquare, Search, Shield, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Navbar from '@/components/Navbar';

/* Reescrita el 3-ago-2026. La página era la única del sitio en azul: 62
   estilos en línea con hex a mano (#60a5fa, #2563eb, degradados azul→dorado)
   que el barrido de paleta no podía tocar porque no eran clases de Tailwind.
   Ahora usa el mismo sistema que el resto: crema, carbón y dorado; un solo
   radio; el hover cambia color y no mueve nada.

   Cambio de fondo, no sólo de forma: la red deja de ser cerrada. Cualquier
   abogado puede formar parte con su cédula verificada. */

export default function ConnectPage() {
    const { user } = useAuth();
    const router = useRouter();

    const entrar = () => {
        router.push(user ? '/connect/buscar' : '/login?redirect=/connect/buscar');
    };

    return (
        <main className="min-h-screen bg-cream-300">
            <Navbar />

            {/* ── Hero ── */}
            <section className="px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-40">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="mb-6 inline-flex items-center gap-2 rounded-lg border border-charcoal-900/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-600">
                        <Shield className="h-3 w-3 text-accent-gold" />
                        Iurexia Connect
                    </span>

                    <h1 className="mb-6 font-serif text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-charcoal-900 sm:text-5xl md:text-6xl">
                        La justicia exige seriedad.
                        <br />
                        <span className="text-accent-gold">Encuentra representación real.</span>
                    </h1>

                    <p className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-charcoal-600 sm:text-lg">
                        La libertad, la salud y el patrimonio no son un juego. Iurexia te
                        conecta <strong className="font-semibold text-charcoal-900">sin costo</strong> con
                        abogados cuya cédula profesional ha sido verificada.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                        <button
                            onClick={entrar}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-charcoal-900 px-7 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800"
                        >
                            <Search className="h-4 w-4 text-accent-gold" />
                            Buscar abogado
                        </button>
                        <Link
                            href={user ? '/perfil' : '/registro'}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-charcoal-900/15 px-7 text-[0.9375rem] font-medium text-charcoal-800 transition-colors hover:border-charcoal-900/30 hover:bg-charcoal-900/[0.03]"
                        >
                            <BadgeCheck className="h-4 w-4" />
                            Soy abogado
                        </Link>
                    </div>

                    <p className="mt-4 text-xs text-charcoal-500">
                        {user ? 'Acceso directo al directorio verificado' : 'Inicia sesión para acceder al directorio'}
                    </p>
                </div>
            </section>

            {/* ── La red abierta ──
                Antes la entrada era por invitación; ahora el requisito es la
                cédula, no el contacto. Va arriba porque es lo que cambió. */}
            <section className="border-y border-charcoal-900/[0.07] bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                    <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent-brown">
                                Para abogados
                            </p>
                            <h2 className="mb-4 font-serif text-2xl font-semibold leading-tight text-charcoal-900 sm:text-3xl">
                                La red está abierta. El requisito es tu <span className="text-accent-gold">cédula</span>
                            </h2>
                            <p className="max-w-xl text-[0.9375rem] leading-relaxed text-charcoal-600 sm:text-base">
                                Cualquier abogado puede formar parte de Connect: no hace falta
                                invitación ni contactos. Verificamos tu cédula profesional contra
                                el registro oficial y, una vez validada, tu perfil entra al
                                directorio y empieza a recibir asuntos de tu materia y tu estado.
                            </p>
                            <ol className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-6">
                                {[
                                    ['1', 'Crea tu perfil', 'Materias, estado y trayectoria.'],
                                    ['2', 'Verificamos tu cédula', 'Contra el registro oficial.'],
                                    ['3', 'Recibes asuntos', 'Ya planteados por quien consulta.'],
                                ].map(([n, titulo, texto]) => (
                                    <li key={n} className="flex flex-1 gap-3">
                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-accent-gold/15 text-[11px] font-bold text-accent-brown">
                                            {n}
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold text-charcoal-900">{titulo}</span>
                                            <span className="block text-[13px] leading-snug text-charcoal-600">{texto}</span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <Link
                            href={user ? '/perfil' : '/registro'}
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-charcoal-900 px-6 text-[0.9375rem] font-medium text-white transition-colors hover:bg-charcoal-800 md:w-48"
                        >
                            Verificar mi cédula
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Por qué existe ── */}
            <section className="py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                    <div className="mx-auto mb-12 max-w-2xl text-center">
                        <h2 className="mb-5 font-serif text-2xl font-semibold text-charcoal-900 sm:text-3xl md:text-4xl">
                            Por qué creamos <span className="text-accent-gold">Connect</span>
                        </h2>
                        <p className="mb-4 leading-relaxed text-charcoal-600">
                            En México miles de personas pierden su patrimonio, su libertad o su
                            tranquilidad simplemente porque{' '}
                            <strong className="font-medium text-charcoal-900">
                                no logran contactar a un abogado profesional y responsable
                            </strong>{' '}
                            que les dé una representación de calidad.
                        </p>
                        <p className="leading-relaxed text-charcoal-600">
                            Connect es el puente: la IA lee el caso y encuentra al especialista
                            correcto, y cada abogado del directorio tiene sus credenciales
                            validadas.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            {
                                icono: Shield,
                                titulo: 'Cero engaños',
                                texto: 'La representación legal no se simula. Sólo entran al directorio abogados que han demostrado documentalmente su cédula profesional y su trayectoria.',
                            },
                            {
                                icono: Star,
                                titulo: 'Match por especialidad',
                                texto: 'La IA lee tu caso, no busca palabras sueltas. Encuentra al abogado que por su perfil y experiencia está preparado justo para lo que necesitas.',
                            },
                            {
                                icono: MessageSquare,
                                titulo: 'Reseñas reales',
                                texto: 'El sistema se alimenta de quienes ya contrataron: honestidad, trato en el primer acercamiento y transparencia en el costo ofrecido.',
                            },
                        ].map((c) => (
                            <div
                                key={c.titulo}
                                className="rounded-xl border border-cream-400 bg-white p-6 transition-colors duration-300 hover:border-accent-gold/50"
                            >
                                <c.icono className="mb-4 h-5 w-5 text-accent-gold" />
                                <h3 className="mb-2 font-serif text-lg font-semibold text-charcoal-900">{c.titulo}</h3>
                                <p className="text-[0.9375rem] leading-relaxed text-charcoal-600">{c.texto}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── El problema, en dos bloques ── */}
            <section className="border-t border-charcoal-900/[0.07] bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-5xl space-y-14 px-4 sm:px-6">
                    <div className="grid items-start gap-8 md:grid-cols-2">
                        <div>
                            <h3 className="mb-4 font-serif text-xl font-semibold text-charcoal-900 sm:text-2xl">
                                El coyotaje y la informalidad
                            </h3>
                            <p className="mb-4 text-[0.9375rem] leading-relaxed text-charcoal-600">
                                Buscar abogado en redes sociales o foros sin regular expone a la
                                gente al fraude. Hay quien toma el anticipo y desaparece, o
                                carece de la cédula necesaria para litigar ante juzgados
                                federales.
                            </p>
                            <p className="text-[0.9375rem] leading-relaxed text-charcoal-600">
                                Con Connect, quien tiene una urgencia ve en segundos a los
                                abogados verificados de su estado.
                            </p>
                        </div>
                        <div className="rounded-xl border border-cream-400 bg-cream-200 p-8">
                            <div className="flex items-center gap-3 rounded-lg border border-charcoal-900/10 bg-white px-4 py-3">
                                <Search className="h-4 w-4 flex-shrink-0 text-charcoal-400" />
                                <span className="text-sm text-charcoal-500">
                                    Me acaban de despedir sin darme finiquito…
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid items-start gap-8 md:grid-cols-2">
                        <div className="md:order-2">
                            <h3 className="mb-4 font-serif text-xl font-semibold text-charcoal-900 sm:text-2xl">
                                IA que entiende el derecho
                            </h3>
                            <p className="mb-4 text-[0.9375rem] leading-relaxed text-charcoal-600">
                                Nadie tiene por qué saber qué rama del derecho le toca. Quien
                                describe «problemas con los linderos de mi rancho» no sabe que
                                necesita a un agrarista o a un civilista.
                            </p>
                            <p className="text-[0.9375rem] leading-relaxed text-charcoal-600">
                                La búsqueda semántica lee la petición, determina la materia y
                                ordena a los abogados validados según su especialización.
                            </p>
                        </div>
                        <div className="rounded-xl border border-cream-400 bg-cream-200 p-8 md:order-1">
                            <div className="rounded-lg border border-charcoal-900/10 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-charcoal-900">Lic. A. Ramírez</p>
                                        <p className="text-xs text-charcoal-500">Querétaro</p>
                                    </div>
                                    <span className="flex-shrink-0 rounded-md bg-accent-gold/15 px-2 py-0.5 text-xs font-semibold text-accent-brown">
                                        95% afinidad
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {['Civil', 'Corporativo'].map((m) => (
                                        <span key={m} className="rounded-md border border-charcoal-900/10 px-2 py-0.5 text-[11px] text-charcoal-600">
                                            {m}
                                        </span>
                                    ))}
                                    <span className="inline-flex items-center gap-1 rounded-md border border-accent-gold/30 bg-accent-gold/[0.08] px-2 py-0.5 text-[11px] text-charcoal-700">
                                        <BadgeCheck className="h-3 w-3 text-accent-gold" /> Cédula verificada
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Cierre ── */}
            <section className="bg-charcoal-900 py-16 text-white sm:py-20">
                <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
                    <h2 className="mb-4 font-serif text-2xl font-semibold sm:text-3xl">
                        ¿Eres abogado o <span className="text-accent-gold">necesitas uno</span>?
                    </h2>
                    <p className="mx-auto mb-8 max-w-xl leading-relaxed text-white/60">
                        Connect existe para profesionalizar el enlace entre litigantes éticos y
                        quien enfrenta un problema de salud, patrimonio o libertad.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                        <button
                            onClick={entrar}
                            className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-7 text-[0.9375rem] font-medium text-charcoal-900 transition-colors hover:bg-cream-200"
                        >
                            Entrar a Connect
                        </button>
                        <Link
                            href={user ? '/perfil' : '/registro'}
                            className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 px-7 text-[0.9375rem] font-medium text-white transition-colors hover:border-white/50 hover:bg-white/10"
                        >
                            Verificar mi cédula
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
