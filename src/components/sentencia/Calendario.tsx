'use client';

/**
 * UN CALENDARIO PROPIO, POSICIONABLE.
 *
 * David, 15-sep-2026: «me gustaría que, ya teniendo el dato de la fecha en
 * que se presentó el recurso, en lugar de llenar el calendario desplegarlo en
 * el mes y año del recurso para que el secretario sólo seleccione cuándo fue
 * notificado, pudiendo cambiar de mes».
 *
 * Un <input type="date"> nativo no se puede abrir posicionado en un mes que
 * no sea el de su propio valor: si el campo está vacío, abre en el mes de
 * hoy, y el secretario tiene que pasear el calendario del navegador desde
 * ahí hasta junio de 2025 a mano. No hay ninguna librería de fechas en el
 * proyecto (no hace falta: es un calendario, no un huso horario), así que
 * éste es de cero, con las mismas piezas que el resto del taller.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './primitivas';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoDe = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/* ── DÍAS SUELTOS ↔ TRAMOS ───────────────────────────────────────────────
   El campo de la responsable viaja al servidor como texto —«2025-12-16..
   2026-01-05, 2026-02-12»— porque un periodo vacacional es un tramo. El
   secretario ya no escribe esa sintaxis: marca los días en el calendario y
   aquí se comprimen los consecutivos. Comprimir es sólo para que el texto
   quepa y se lea; el servidor entiende igual las dos formas. */
export function expandirTramos(texto: string): string[] {
    const fuera = new Set<string>();
    for (const trozo of (texto || '').split(',')) {
        const t = trozo.trim();
        if (!t) continue;
        const [a, b] = t.split('..').map((x) => x.trim());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(a)) continue;
        if (!b) { fuera.add(a); continue; }
        const d = new Date(`${a}T00:00:00`), fin = new Date(`${b}T00:00:00`);
        // Un tramo al revés o absurdamente largo no se expande: se deja el día.
        if (isNaN(fin.getTime()) || fin < d) { fuera.add(a); continue; }
        for (let i = 0; d <= fin && i < 400; i++) {
            fuera.add(d.toISOString().slice(0, 10));
            d.setDate(d.getDate() + 1);
        }
    }
    return Array.from(fuera).sort();
}

export function comprimirTramos(dias: string[]): string {
    const ds = Array.from(new Set(dias.filter(Boolean))).sort();
    const tramos: string[] = [];
    let i = 0;
    while (i < ds.length) {
        let j = i;
        while (j + 1 < ds.length) {
            const sig = new Date(`${ds[j]}T00:00:00`);
            sig.setDate(sig.getDate() + 1);
            if (sig.toISOString().slice(0, 10) !== ds[j + 1]) break;
            j++;
        }
        tramos.push(i === j ? ds[i] : `${ds[i]}..${ds[j]}`);
        i = j + 1;
    }
    return tramos.join(', ');
}

function mesDe(v?: string): [number, number] | null {
    if (!v || v.length < 7) return null;
    const [y, m] = v.split('-').map(Number);
    return y && m ? [y, m - 1] : null;
}

export default function Calendario({ valor, onCambiar, mesInicial, placeholder,
                                    multiple = false, valores, onValores }: {
    /** ISO AAAA-MM-DD, o cadena vacía. Ignorado en modo múltiple. */
    valor?: string;
    onCambiar?: (iso: string) => void;
    /** AAAA-MM: el mes en que abre la PRIMERA VEZ si `valor` sigue vacío. Por
     *  ejemplo, el mes de la fecha de presentación, para el campo de
     *  notificación. */
    mesInicial?: string;
    placeholder?: string;
    /** VARIOS DÍAS DE UNA SENTADA. David, 16-sep-2026: «que el secretario
     *  pueda seleccionarlos en conjunto en el calendario y cuando termine un
     *  botón de Listo, y así se suman todos sin tener que ingresar uno por
     *  uno». Cada clic marca o desmarca; el panel no se cierra hasta Listo. */
    multiple?: boolean;
    valores?: string[];
    onValores?: (isos: string[]) => void;
}) {
    const hoy = new Date();
    const marcados = React.useMemo(() => valores ?? [], [valores]);
    const anclaMes = multiple ? (marcados[0] || '') : (valor || '');
    const inicial = mesDe(anclaMes) ?? mesDe(mesInicial) ?? [hoy.getFullYear(), hoy.getMonth()];
    const [abierto, setAbierto] = React.useState(false);
    const [vista, setVista] = React.useState({ y: inicial[0], m: inicial[1] });
    const cajaRef = React.useRef<HTMLDivElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);
    // EL PANEL VIVE EN UN PORTAL, así que hay que decirle dónde pintarse.
    const [sitio, setSitio] = React.useState({ top: 0, left: 0 });

    // SI `mesInicial` LLEGA DESPUÉS —el auto de admisión tarda en leerse, o el
    // secretario lo sube tras haber abierto ya el formulario— y este campo
    // sigue vacío, la vista salta a su mes en cuanto llega.
    React.useEffect(() => {
        if (multiple ? marcados.length > 0 : !!valor) return;
        const m = mesDe(mesInicial);
        if (m) setVista({ y: m[0], m: m[1] });
    }, [mesInicial, valor, multiple, marcados]);

    // EL PANEL ESTÁ FUERA DE `cajaRef` —es un portal—, así que «clic fuera»
    // tiene que mirar las dos cajas o el primer clic en un día lo cerraría.
    React.useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            const t = e.target as Node;
            if (cajaRef.current?.contains(t) || panelRef.current?.contains(t)) return;
            setAbierto(false);
        };
        document.addEventListener('mousedown', fuera);
        return () => document.removeEventListener('mousedown', fuera);
    }, [abierto]);

    const situar = React.useCallback(() => {
        const r = cajaRef.current?.getBoundingClientRect();
        if (!r) return;
        // Abre hacia abajo salvo que no quepa; el panel mide 320 de alto.
        const alto = multiple ? 360 : 326;
        const abajo = window.innerHeight - r.bottom > alto + 10;
        setSitio({
            top: abajo ? r.bottom + 6 : Math.max(8, r.top - alto),
            left: Math.min(r.left, Math.max(8, window.innerWidth - 296)),
        });
    }, [multiple]);

    React.useEffect(() => {
        if (!abierto) return;
        situar();
        window.addEventListener('scroll', situar, true);
        window.addEventListener('resize', situar);
        return () => {
            window.removeEventListener('scroll', situar, true);
            window.removeEventListener('resize', situar);
        };
    }, [abierto, situar]);

    const abrir = () => {
        const m = mesDe(anclaMes) ?? mesDe(mesInicial);
        if (m) setVista({ y: m[0], m: m[1] });
        situar();
        setAbierto(true);
    };

    const primerDia = new Date(vista.y, vista.m, 1);
    const corrimiento = (primerDia.getDay() + 6) % 7;   // semana en lunes
    const diasDelMes = new Date(vista.y, vista.m + 1, 0).getDate();
    const celdas: (number | null)[] = [
        ...Array(corrimiento).fill(null),
        ...Array.from({ length: diasDelMes }, (_, i) => i + 1),
    ];

    const legible = multiple
        ? (marcados.length
            ? `${marcados.length} día${marcados.length === 1 ? '' : 's'} marcado${marcados.length === 1 ? '' : 's'}`
            : (placeholder || 'Elegir días en el calendario'))
        : (valor
            ? new Date(`${valor}T00:00:00`).toLocaleDateString('es-MX',
                  { day: 'numeric', month: 'long', year: 'numeric' })
            : (placeholder || 'Elegir fecha'));

    const alternar = (iso: string) => {
        const ya = marcados.includes(iso);
        onValores?.(ya ? marcados.filter((x) => x !== iso) : [...marcados, iso].sort());
    };

    return (
        /* NO SE ACTIVA EL LABEL QUE NOS ENVUELVA. Un <label> se asocia con su
           PRIMER control, y este calendario son cuarenta botones: al pulsar un
           día, el navegador reenviaba la activación al desplegable —que se
           cerraba— y React desmontaba el día ANTES de que su onClick llegara
           al handler delegado. Resultado medido en el formulario real: el
           panel se cerraba y la fecha no se fijaba NUNCA. `preventDefault`
           cancela sólo esa activación por defecto; los onClick de dentro
           siguen corriendo. El formulario además ya no envuelve las fechas en
           un <label>, pero esto deja el componente a salvo donde se monte. */
        /* Y SE ELEVA SOBRE LOS CAMPOS DE ABAJO. Medido en el formulario real:
           con el panel abierto, `document.elementFromPoint` sobre el día 15
           devolvía el <input> del campo siguiente, no el día — el clic del
           ratón se lo comía ese input y la fecha no se elegía nunca (el clic
           por programa sí funcionaba, que es lo que despistaba). El panel ya
           era `absolute z-20`, pero su contenedor no creaba contexto de
           apilamiento propio: se le da uno mientras está abierto. */
        <div className={cn('relative', abierto && 'z-50')} ref={cajaRef}
             onClick={(e) => e.preventDefault()}>
            <button type="button" onClick={() => (abierto ? setAbierto(false) : abrir())}
                    className={cn(
                        'flex w-full items-center gap-2 rounded-lg border border-white/10',
                        'bg-white/[0.04] px-3 py-2 text-left text-[14px] outline-none transition',
                        'hover:border-white/20 focus:border-accent-gold/40 focus:bg-white/[0.06]',
                        valor ? 'text-white/90' : 'text-white/45')}>
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white/45" />
                <span className="flex-1 truncate first-letter:uppercase">{legible}</span>
            </button>
            {/* EL PANEL SE PINTA EN EL BODY, NO AQUÍ DENTRO.
                Medido en el formulario real: con el panel dentro de la
                tarjeta, `document.elementsFromPoint` sobre el día 15 devolvía
                ENCIMA el <input type="date"> del campo de abajo, aunque el
                panel fuera `absolute z-50` — la tarjeta tiene backdrop-blur y
                su contexto de apilamiento se comía la capa. El clic del ratón
                se lo quedaba ese input y la fecha NO SE PODÍA ELEGIR (el clic
                por programa sí entraba, que es lo que lo escondió en la
                primera prueba). Un portal a `document.body` lo saca de todo
                contexto ajeno, que es como se resuelve un desplegable. */}
            {abierto && typeof document !== 'undefined' && createPortal(
                <div ref={panelRef} style={{ top: sitio.top, left: sitio.left }}
                     className="fixed z-[9999] w-72 rounded-xl border border-white/10
                                bg-charcoal-900 p-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
                    <div className="mb-2 flex items-center justify-between">
                        <button type="button" aria-label="Mes anterior"
                                onClick={() => setVista((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
                                className="rounded-lg p-1 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-[13px] font-medium text-white/90 first-letter:uppercase">
                            {MESES[vista.m]} {vista.y}
                        </span>
                        <button type="button" aria-label="Mes siguiente"
                                onClick={() => setVista((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
                                className="rounded-lg p-1 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {DIAS.map((d) => (
                            <span key={d} className="text-center text-[10px] font-medium uppercase text-white/35">
                                {d}
                            </span>
                        ))}
                        {celdas.map((d, i) => {
                            const iso = d ? isoDe(vista.y, vista.m, d) : '';
                            const elegido = d !== null
                                && (multiple ? marcados.includes(iso) : iso === valor);
                            return (
                                <button key={i} type="button" disabled={d === null}
                                        onClick={() => {
                                            if (multiple) { alternar(iso); return; }
                                            onCambiar?.(iso);
                                            setAbierto(false);
                                        }}
                                        className={cn(
                                            'aspect-square rounded-lg text-[12px] transition',
                                            d === null
                                                ? 'invisible'
                                                : elegido
                                                    ? 'bg-accent-gold font-semibold text-charcoal-900'
                                                    : 'text-white/75 hover:bg-white/[0.08]')}>
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                    {multiple ? (
                        <div className="mt-2 flex items-center gap-2 border-t border-white/[0.07] pt-2">
                            <span className="flex-1 text-[12px] text-white/45">
                                {marcados.length
                                    ? `${marcados.length} marcado${marcados.length === 1 ? '' : 's'}`
                                    : 'Toca los días; se marcan y se desmarcan'}
                            </span>
                            {marcados.length > 0 && (
                                <button type="button" onClick={() => onValores?.([])}
                                        className="rounded-lg px-2 py-1 text-[12px] text-white/45
                                                   transition hover:text-white/75">
                                    Limpiar
                                </button>
                            )}
                            <button type="button" onClick={() => setAbierto(false)}
                                    className="rounded-lg bg-accent-gold px-3 py-1 text-[12px]
                                               font-semibold text-charcoal-900 transition
                                               hover:brightness-110">
                                Listo
                            </button>
                        </div>
                    ) : valor ? (
                        <button type="button" onClick={() => { onCambiar?.(''); setAbierto(false); }}
                                className="mt-2 w-full rounded-lg border border-white/10 py-1.5 text-[12px]
                                           text-white/45 transition hover:text-white/75">
                            Quitar fecha
                        </button>
                    ) : null}
                </div>, document.body)}
        </div>
    );
}
