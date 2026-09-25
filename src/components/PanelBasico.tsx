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
    FolderPlus, History, FileSignature, FileDown, MapPin, ArrowRight,
} from 'lucide-react';

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
                {sinCuenta ? (
                    <>
                        <Link
                            href="/registro"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-charcoal-900 px-4 py-2.5 text-[13.5px] font-semibold text-cream-100 transition-colors hover:bg-charcoal-800"
                        >
                            Crear mi cuenta gratis
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <span className="text-[12.5px] text-charcoal-500">
                            Con cuenta recibes consultas del motor completo, sin costo.
                        </span>
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </section>
    );
}
