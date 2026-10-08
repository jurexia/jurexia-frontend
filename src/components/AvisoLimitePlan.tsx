'use client';

import Link from 'next/link';
import { Crown, ShieldCheck } from 'lucide-react';

/* ═══ EL AVISO DE LÍMITE, CON EL PLAN DE QUIEN LO LEE (7-oct-2026) ═══
   Eran dos copias casi iguales en chat/page.tsx y las dos mentían a quien paga:

   · La de «se acabaron las consultas» decía «Tu plan actual: Gratuito · 5
     consultas/mes», FIJO. Pero el gratuito NUNCA la ve —al agotarse pasa al
     motor básico (`gratuitoAgotado`)—, así que sólo la leía un cliente de pago.
   · Las dos ofrecían «Plan Pro — $249/mes» a todos, Pro incluido. En /precios
     Pro cuesta $149; $249 es el precio tachado.
   · Y le pedían a quien ya paga que se uniera a «más de 1,500 profesionales
     con suscripción activa», cifra que /precios desmiente (177 de 219).

   Ahora se pinta el plan y el cupo reales, y se recomienda el plan de ARRIBA:
   Pro a quien tiene Básico, Platinum a quien tiene Pro. A Platinum y a Ultra
   no hay plan con más consultas que ofrecerles: se les dice y se les da el
   correo de soporte. Cifras y precios: los de /precios y PLAN_CONFIG. */

const NOMBRE: Record<string, string> = {
    gratuito: 'Gratuito',
    basico_monthly: 'Básico',
    basico_annual: 'Básico anual',
    pro_monthly: 'Pro',
    pro_annual: 'Pro anual',
    platinum_monthly: 'Platinum',
    platinum_annual: 'Platinum anual',
    ultra_secretarios: 'Ultra Secretarios',
};

type Mejora = {
    nombre: string;
    consultas: number;
    precio: string;
    distintivo?: string;
    ventajas: { icono: string; titulo: string; detalle: string }[];
};

const PRO: Mejora = {
    nombre: 'Pro',
    consultas: 140,
    precio: '$149/mes',
    distintivo: 'Más elegido',
    ventajas: [
        { icono: '⚡', titulo: 'Flujos de trabajo', detalle: '30 al mes: demandas, contestaciones y agravios completos, paso a paso' },
        { icono: '🏛️', titulo: 'Precedentes de Colegiados de Circuito', detalle: 'Búsqueda directa en sentencias reales de 7 circuitos' },
        { icono: '🔍', titulo: 'Análisis y auditoría de documentos', detalle: 'Sube contratos o sentencias de hasta 100 hojas para revisión con IA' },
    ],
};

const PLATINUM: Mejora = {
    nombre: 'Platinum',
    consultas: 560,
    precio: '$599/mes',
    ventajas: [
        { icono: '⚡', titulo: 'Cuatro veces las consultas de Pro', detalle: '560 al mes y 60 flujos de trabajo' },
        { icono: '📊', titulo: 'Jurimetría', detalle: 'Predicción del sentido a partir de los precedentes del circuito' },
        { icono: '📁', titulo: 'Expedientes completos', detalle: 'Lee documentos de hasta 600 hojas' },
    ],
};

function mejoraDe(plan: string): Mejora | null {
    if (plan.startsWith('platinum') || plan === 'ultra_secretarios') return null;
    if (plan.startsWith('pro')) return PLATINUM;
    return PRO;
}

export default function AvisoLimitePlan({
    plan,
    limite,
    causa,
    onClose,
}: {
    plan: string | null | undefined;
    limite: number;
    /** `agotado`: el contador local llegó al tope. `servidor`: el API lo rechazó. */
    causa: 'agotado' | 'servidor';
    onClose: () => void;
}) {
    const clave = plan || 'gratuito';
    const nombre = NOMBRE[clave] ?? 'Tu plan';
    const mejora = mejoraDe(clave);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                <div className="relative px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1a1510 0%, #0f0f0f 100%)' }}>
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c56d, #c9a84c)' }} />
                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-7 h-7 text-accent-gold" />
                    </div>
                    <h3 className="font-serif text-2xl font-semibold text-white text-center mb-2">
                        {mejora ? 'Tu talento jurídico merece herramientas a su altura' : 'Llegaste al tope de tu plan'}
                    </h3>
                    <p className="text-white/50 text-xs text-center">
                        {causa === 'servidor'
                            ? 'La consulta no pudo completarse — límite de plan alcanzado'
                            : `Usaste las ${limite} consultas de tu plan ${nombre} en este periodo`}
                    </p>
                </div>

                <div className="px-8 py-5">
                    <div className={`grid gap-3 mb-5 ${mejora ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Tu plan actual</p>
                            <p className="text-white font-bold text-sm">{nombre}</p>
                            <p className="text-white/40 text-xs mt-1">{limite} consultas/mes</p>
                            <p className="text-red-400/80 text-xs mt-2 font-medium">0 restantes</p>
                        </div>
                        {mejora && (
                            <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-xl p-4 relative">
                                {mejora.distintivo && (
                                    <div className="absolute -top-2 right-3 px-2 py-0.5 bg-accent-gold rounded-full text-[9px] font-bold text-black uppercase">{mejora.distintivo}</div>
                                )}
                                <p className="text-[10px] font-semibold text-accent-gold uppercase tracking-wider mb-2">Recomendado</p>
                                <p className="text-white font-bold text-sm">{mejora.nombre}</p>
                                <p className="text-accent-gold/80 text-xs mt-1">{mejora.consultas} consultas/mes</p>
                                <p className="text-accent-gold text-sm mt-2 font-bold">{mejora.precio}</p>
                            </div>
                        )}
                    </div>

                    {mejora ? (
                        <>
                            <div className="space-y-2 mb-5">
                                {mejora.ventajas.map((v) => (
                                    <div key={v.titulo} className="flex items-start gap-2.5 bg-white/[0.03] rounded-lg px-3 py-2.5">
                                        <span className="text-accent-gold text-sm mt-0.5">{v.icono}</span>
                                        <div>
                                            <p className="text-white text-xs font-semibold">{v.titulo}</p>
                                            <p className="text-white/40 text-[11px]">{v.detalle}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Link
                                href="/precios"
                                className="block w-full py-3.5 rounded-xl text-center font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-95 mb-3"
                                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)', color: '#1a1a1a' }}
                            >
                                Activar Plan {mejora.nombre} — {mejora.precio}
                            </Link>
                        </>
                    ) : (
                        <>
                            <p className="text-white/60 text-sm leading-relaxed text-center mb-5">
                                Ya tienes el plan con más consultas de Iurexia. Si este periodo necesitas
                                más, escríbenos y lo resolvemos contigo.
                            </p>
                            <a
                                href="mailto:soporte@iurexia.com"
                                className="block w-full py-3.5 rounded-xl text-center font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-95 mb-3"
                                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c56d)', color: '#1a1a1a' }}
                            >
                                Escribir a soporte@iurexia.com
                            </a>
                        </>
                    )}

                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Link href="/precios" className="text-white/40 hover:text-white/70 text-xs transition-colors">Ver todos los planes →</Link>
                        <span className="text-white/20">·</span>
                        <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xs transition-colors">Cerrar</button>
                    </div>
                    {mejora && (
                        <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-1.5 text-white/30 text-xs">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Pago seguro con Stripe</span>
                            </div>
                            <span className="text-white/15">·</span>
                            <span className="text-white/30 text-xs">Cancela cuando quieras</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
