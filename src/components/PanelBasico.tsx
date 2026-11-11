'use client';
/**
 * LO QUE ESTÁ DETRÁS DEL CANDADO (18-sep-2026)
 *
 * David: «el objetivo es lograr que se suscriba porque verá todo el mundo de
 * herramientas que tendrá bloqueadas».
 *
 * Por eso esto no es un cartel de «actualiza tu plan». Es el inventario, con
 * nombre y letra, de lo que Iurexia hace y esta versión no: el abogado tiene
 * que poder LEER lo que se está perdiendo mientras usa lo que sí tiene. Y por
 * eso también se dice sin adornos qué SÍ puede hacer aquí, que es lo que hace
 * creíble lo demás.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Lock, Workflow, Network, Search, PenTool, BarChart2, BookOpen, Scale,
    FolderPlus, History, FileSignature, FileDown, MapPin, ArrowRight, Check,
} from 'lucide-react';
import { redirectToCheckout } from '@/lib/stripe-client';
import { BUEN_FIN, buenFinVigente, cuenta, pesos } from '@/lib/buen-fin';
import { fechaEnLetra, proximaRenovacion } from '@/lib/periodo-consultas';
import { CHATGPT } from '@/lib/comparativa';

/* LO QUE ABRE LA CUENTA GRATUITA (8-oct-2026). David: «empuja a que en la
   versión de prueba creen una cuenta gratis para desbloquear la plataforma de
   trabajo gratis». Sin cuenta no se enseña el inventario de los planes —la
   mitad de esos candados se abren gratis y la otra mitad no, y mezclados no se
   entiende qué gana registrándose—, sino lo que da la cuenta gratuita. Cada
   punto está comprobado contra el mapa del soporte (src/lib/soporte/
   conocimiento.ts): 5 consultas, la ley del estado, el panel Documento con su
   Word, el PDF de cada cita, las carpetas (20 MB) y Sálvame. */
const CON_CUENTA_GRATIS = [
    '5 consultas al mes con el motor completo y la ley de tu estado',
    'El documento editable, con descarga a Word y las citas como notas al pie',
    'El PDF oficial de cada tesis y de cada artículo que se cita',
    'Tus carpetas por cliente o por asunto, con sus documentos',
    'Sálvame: el amparo de salud de urgencia, listo en Word',
];

const ICONOS: Record<string, typeof Lock> = {
    'Redacción de escritos': PenTool,
    'Flujos de trabajo': Workflow,
    'Toulmin': Network,
    'Modo consulta': Search,
    'Modo redacción': PenTool,
    'Jurimetría': BarChart2,
    'Precedentes': Scale,
    'Legislación de tu estado': MapPin,
    'Seguimiento de expedientes': BookOpen,
    'Carpetas': FolderPlus,
    'Memoria de consultas': History,
    'Editor Word': FileSignature,
    'Descarga del PDF de la tesis': FileDown,
};

export default function PanelBasico({
    bloqueado, sinCuenta, compacto = false, inicioPeriodo, correo,
}: {
    bloqueado: string[];
    /** Sin cuenta se invita a registrarse; con cuenta gratuita, a suscribirse. */
    sinCuenta: boolean;
    compacto?: boolean;
    /** `subscription_start` del perfil: de ahí sale el día en que vuelven sus consultas. */
    inicioPeriodo?: string | null;
    /** Para abrir el pago en un clic sin pasar por /precios. */
    correo?: string | null;
}) {
    if (sinCuenta) {
        return (
            <section className="rounded-2xl border border-[#c9a962]/45 bg-white p-5 shadow-[0_10px_30px_-18px_rgba(26,26,26,0.35)] sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-brown">
                    Estás en la versión de prueba
                </p>
                <h2 className="mt-2 font-serif text-[20px] font-semibold leading-snug text-charcoal-900">
                    Crea tu cuenta gratis y desbloquea la plataforma de trabajo
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-charcoal-700">
                    Aquí Iurexia te contesta con criterios del Semanario Judicial y su registro digital.
                    Con tu cuenta gratuita, sin tarjeta, trabajas con Iurexia completa:
                </p>
                <ul className={`mt-4 grid gap-x-5 gap-y-2.5 ${compacto ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                    {CON_CUENTA_GRATIS.map((n) => (
                        <li key={n} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-charcoal-800">
                            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-gold" />
                            <span className="min-w-0 flex-1">{n}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cream-200 pt-4">
                    <Link
                        href="/registro"
                        className="relieve relieve-tinta !h-11 !px-5 !text-[14.5px] !font-semibold"
                    >
                        Crear mi cuenta gratis
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <span className="text-[12.5px] text-charcoal-500">Sin tarjeta y sin costo.</span>
                </div>
                <p className="mt-3 text-[12px] text-charcoal-500">
                    Y con un plan, además: flujos de trabajo, Precedentes y Jurimetría.{' '}
                    <Link href="/precios" className="underline underline-offset-2 hover:text-charcoal-800">Ver los planes</Link>
                </p>
            </section>
        );
    }

    return <PanelLimite bloqueado={bloqueado} compacto={compacto} inicioPeriodo={inicioPeriodo} correo={correo} />;
}

/* ═══ EL MOMENTO DEL LÍMITE (11-nov-2026) ═══
   David: «hacer sentir inteligente, o más inteligente que a otros, a la
   persona que se suscriba». Antes, al gastar sus cinco consultas, el usuario
   pasaba en silencio a la versión básica y veía una lista de candados con
   «Desde $79 al mes». Nadie le decía lo que había hecho ni lo que le costaría
   seguir.

   Ahora, en el mismo lugar:
   · se le reconoce, con un dato medido: de 3,134 cuentas abiertas antes del
     11-oct, sólo el 29 % llegó alguna vez a cinco preguntas (contadas como
     mensajes, que es contar de más). «La mayoría nunca llega» es verdad;
   · se le pone frente a sus colegas sin denigrar a nadie: él trabaja con la
     fuente a la vista; muchos preguntan a herramientas que contestan de
     memoria;
   · se le enseña la cuenta (lo mismo que dice /precios: $1.06 y $0.89 por
     consulta en Pro; del 13 al 17-nov, la cuenta del Buen Fin);
   · el pago se abre en un clic, con el código ya aplicado en Buen Fin;
   · y se le dice cuándo vuelven sus consultas, para que seguir gratis sea una
     decisión y no un castigo. Los candados se quedan, debajo. */
function PanelLimite({
    bloqueado, compacto, inicioPeriodo, correo,
}: {
    bloqueado: string[];
    compacto: boolean;
    inicioPeriodo?: string | null;
    correo?: string | null;
}) {
    const [buenFin, setBuenFin] = useState(false);
    const [renueva, setRenueva] = useState<string | null>(null);
    const [abriendo, setAbriendo] = useState(false);
    const [error, setError] = useState('');

    // La fecha y el Buen Fin se deciden en el navegador: el servidor no sabe
    // qué hora es para quien lee, y así no se pintan dos cosas distintas.
    useEffect(() => {
        setBuenFin(buenFinVigente());
        const d = inicioPeriodo ? proximaRenovacion(inicioPeriodo) : null;
        setRenueva(d ? fechaEnLetra(d) : null);
    }, [inicioPeriodo]);

    const pro = cuenta('pro');

    const pagar = async () => {
        setError('');
        if (!correo) {
            window.location.href = '/login?redirect=/chat';
            return;
        }
        const priceId = buenFin ? pro.priceIdAnual : pro.priceIdMensual;
        if (!priceId) {
            window.location.href = buenFin ? '/buen-fin' : '/precios';
            return;
        }
        setAbriendo(true);
        try {
            await redirectToCheckout(priceId, correo, buenFin ? BUEN_FIN.codigo : undefined);
        } catch {
            setError('No pudimos abrir el pago. Inténtalo de nuevo o entra a Ver todos los planes.');
            setAbriendo(false);
        }
    };

    const candados = bloqueado.map((x) => (x === 'Genios' ? 'Flujos de trabajo' : x));

    return (
        <section className="rounded-2xl border border-[#c9a962]/45 bg-white p-5 shadow-[0_10px_30px_-18px_rgba(26,26,26,0.35)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-brown">
                Usaste tus 5 consultas de este mes
            </p>
            <h2 className={`mt-2 font-serif font-semibold leading-snug text-charcoal-900 ${compacto ? 'text-[19px]' : 'text-[22px]'}`}>
                La mayoría nunca llega hasta aquí. Tú sí.
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-charcoal-700">
                La mayoría de quienes abren su cuenta en Iurexia no llega a sus cinco consultas. Tú ya las
                usaste en tus asuntos: sabes lo que es trabajar con la fuente a la vista, mientras muchos
                colegas siguen preguntando a herramientas que contestan de memoria.
            </p>

            <div className="mt-4 rounded-xl border border-cream-300 bg-cream-100 px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-brown">
                    {buenFin ? 'Haz la cuenta · Buen Fin' : 'Haz la cuenta'}
                </p>
                {buenFin ? (
                    <p className="mt-1.5 text-[14px] leading-relaxed text-charcoal-800">
                        Un año de Pro mes a mes: <span className="line-through">{pesos(pro.anioMesAMes)}</span>.
                        El anual con 30 %: <strong className="text-charcoal-900">{pesos(pro.anualBuenFin)}</strong>.
                        Te quedas con {pesos(pro.ahorro)} y cada consulta te sale en {pesos(pro.porConsulta)}:
                        un año entero por menos que un solo mes de ChatGPT Pro (desde {pesos(CHATGPT.proDesde)}).
                    </p>
                ) : (
                    <p className="mt-1.5 text-[14px] leading-relaxed text-charcoal-800">
                        Con Pro tienes {pro.consultas} consultas al mes por {pesos(pro.mensual)}:{' '}
                        <strong className="text-charcoal-900">{pesos(pro.porConsultaMensual)} cada una</strong>.
                        Con Pro anual, {pesos(pro.porConsultaAnual)}: un año entero ({pesos(pro.anual)}) por menos que
                        un solo mes de ChatGPT Pro (desde {pesos(CHATGPT.proDesde)}).
                    </p>
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                    onClick={pagar}
                    disabled={abriendo}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-gold px-4 py-2.5 text-[13.5px] font-bold text-charcoal-900 transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                    {abriendo ? 'Abriendo el pago seguro…'
                        : buenFin ? 'Elegir Pro anual con 30 %' : `Seguir con Iurexia Pro · ${pesos(pro.mensual)} al mes`}
                    {!abriendo && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
                <Link href={buenFin ? '/buen-fin' : '/precios'} className="text-[13px] text-charcoal-700 underline underline-offset-2 hover:text-charcoal-900">
                    Ver todos los planes
                </Link>
            </div>
            {error && <p className="mt-2 text-[12.5px] text-red-700">{error}</p>}

            <p className="mt-3 text-[12.5px] leading-relaxed text-charcoal-700">
                O sigue aquí, en la versión básica: te contesta con criterios del Semanario Judicial y su
                registro digital.{renueva ? ` Tus 5 consultas completas vuelven el ${renueva}.` : ''} Si contratas,
                cancelas cuando quieras.
            </p>

            {candados.length > 0 && (
                <details className="mt-4 border-t border-cream-200 pt-3" open={!compacto}>
                    <summary className="cursor-pointer text-[12.5px] font-semibold text-charcoal-800">
                        Lo que Iurexia completa hace y aquí está con candado
                    </summary>
                    <ul className={`mt-3 grid gap-x-4 gap-y-2 ${compacto ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                        {candados.map((n) => {
                            const Icono = ICONOS[n] ?? Lock;
                            return (
                                <li key={n} className="flex items-center gap-2.5 text-[13.5px] text-charcoal-700">
                                    <Icono className="h-3.5 w-3.5 flex-shrink-0 text-charcoal-700/60" />
                                    <span className="min-w-0 flex-1">{n}</span>
                                    <Lock className="h-3 w-3 flex-shrink-0 text-accent-gold/70" />
                                </li>
                            );
                        })}
                    </ul>
                </details>
            )}
        </section>
    );
}
