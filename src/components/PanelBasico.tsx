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

import Link from 'next/link';
import {
    Lock, Workflow, Network, Search, PenTool, BarChart2, BookOpen, Scale,
    FolderPlus, History, FileSignature, FileDown, MapPin, ArrowRight, Check,
} from 'lucide-react';

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
    bloqueado, sinCuenta, compacto = false,
}: {
    bloqueado: string[];
    /** Sin cuenta se invita a registrarse; con cuenta gratuita, a suscribirse. */
    sinCuenta: boolean;
    compacto?: boolean;
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

    return (
        <section className="rounded-2xl border border-cream-300 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cream-200">
                    <Lock className="h-3 w-3 text-accent-brown" />
                </span>
                <h2 className="font-serif text-[17px] font-semibold text-charcoal-900">
                    Estás en la versión básica
                </h2>
            </div>

            <p className="mt-2 text-[14px] leading-relaxed text-charcoal-700">
                Aquí Iurexia te contesta con criterios del Semanario Judicial y te da su
                registro digital para que los consultes en la fuente oficial. Es útil y no
                cuesta nada. Lo que sigue es lo que hace Iurexia completa.
            </p>

            <ul className={`mt-4 grid gap-x-4 gap-y-2 ${compacto ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                {bloqueado.map((x) => (x === 'Genios' ? 'Flujos de trabajo' : x)).map((n) => {
                    const Icono = ICONOS[n] ?? Lock;
                    return (
                        <li key={n} className="flex items-center gap-2.5 text-[13.5px] text-charcoal-600">
                            <Icono className="h-3.5 w-3.5 flex-shrink-0 text-charcoal-400" />
                            <span className="min-w-0 flex-1">{n}</span>
                            <Lock className="h-3 w-3 flex-shrink-0 text-accent-gold/70" />
                        </li>
                    );
                })}
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-cream-200 pt-4">
                <Link
                    href="/precios"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-gold px-4 py-2.5 text-[13.5px] font-bold text-charcoal-900 transition-opacity hover:opacity-90"
                >
                    Ver los planes
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-[12.5px] text-charcoal-500">
                    Desde $79 al mes. Cancelas cuando quieras.
                </span>
            </div>
        </section>
    );
}
