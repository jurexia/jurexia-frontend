'use client';

/**
 * EL AVISO DEL RELOJ DEL EQUIPO (2-nov-2026).
 *
 * Un abogado con el reloj de Windows nueve horas adelantado creyó que su
 * contraseña no servía: entraba, la sesión se renovaba sin parar y acababa
 * borrada (ver `@/lib/reloj`). Nada en pantalla le decía por qué.
 *
 * Aquí se mide el reloj al abrir la página —si hay sesión guardada o se está
 * entrando— y se vuelve a medir si alguien lo mueve con la página abierta.
 * También cuentan las mediciones de cada sesión que entrega el servidor
 * (`candado-sesion.ts`). Con más de cinco minutos de desfase se pinta este
 * aviso, con el mismo aspecto que el muro de la suspensión: qué pasa, la hora
 * real, cómo corregirla en Windows, Mac y teléfono, y un botón para comprobar.
 *
 * NO ES UN MURO. La sesión ya funciona con el reloj mal (se guarda en la hora
 * del equipo), y en la computadora de un juzgado o de un despacho quizá el
 * usuario no tenga permiso para cambiar la hora. Por eso «Continuar de todos
 * modos» lo cierra en esta pestaña; vuelve si el reloj se mueve otros cinco
 * minutos.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { haySesionGuardada, ponerSesionEnHoraDelEquipo } from '@/lib/supabase';
import {
    alMedirDesfase,
    avisoVisible,
    describirDesfase,
    desfaseConocido,
    hayQueAvisar,
    medirDesfase,
    relojMovido,
} from '@/lib/reloj';

/** Donde se mide aunque aún no haya sesión: justo donde el usuario cree que su contraseña falla. */
const RUTAS_DE_ENTRADA = ['/entrar', '/login', '/registro', '/auth'];
const CLAVE_DESCARTADO = 'iurexia-reloj-descartado';
const ZONA_CDMX = 'America/Mexico_City';
const ZONAS_DE_MEXICO = new Set([
    'America/Mexico_City', 'America/Monterrey', 'America/Merida', 'America/Cancun', 'America/Matamoros',
    'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga', 'America/Mazatlan', 'America/Bahia_Banderas',
    'America/Hermosillo', 'America/Tijuana', 'America/Ensenada', 'America/Santa_Isabel',
]);

type Sistema = 'windows' | 'mac' | 'telefono';
type Estado = 'listo' | 'comprobando' | 'sigue' | 'sin-red';

function leerDescartado(): number | null {
    try {
        const v = sessionStorage.getItem(CLAVE_DESCARTADO);
        return v === null ? null : Number(v);
    } catch {
        return null;
    }
}

function guardarDescartado(desfase: number): void {
    try { sessionStorage.setItem(CLAVE_DESCARTADO, String(desfase)); } catch { /* sin almacén: dura lo que la página */ }
}

function sistemaDelEquipo(): Sistema {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|Android/i.test(ua)) return 'telefono';
    // El iPad se presenta como Mac; se le nota por la pantalla táctil.
    if (/Macintosh|Mac OS X/i.test(ua)) return navigator.maxTouchPoints > 1 ? 'telefono' : 'mac';
    return 'windows';
}

function zonaDelEquipo(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
        return '';
    }
}

function fechaHora(ms: number, zona?: string, conAnio = false): string {
    return new Intl.DateTimeFormat('es-MX', {
        timeZone: zona,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        ...(conAnio ? { year: 'numeric' as const } : {}),
        hour: 'numeric',
        minute: '2-digit',
    }).format(ms);
}

const PASOS: Record<Sistema, { titulo: string; pasos: React.ReactNode[] }> = {
    windows: {
        titulo: 'En Windows',
        pasos: [
            <>Haz clic derecho en la hora, abajo a la derecha, y elige <strong>«Ajustar fecha y hora»</strong>.</>,
            <>Activa <strong>«Establecer la hora automáticamente»</strong> y <strong>«Establecer la zona horaria automáticamente»</strong>.</>,
            <>Pulsa <strong>«Sincronizar ahora»</strong>.</>,
        ],
    },
    mac: {
        titulo: 'En Mac',
        pasos: [
            <>Abre el menú Apple y entra a <strong>Configuración del Sistema › General › Fecha y hora</strong> (en versiones anteriores, Preferencias del Sistema › Fecha y hora).</>,
            <>Activa <strong>«Ajustar fecha y hora automáticamente»</strong> y que la zona horaria se ajuste con tu ubicación.</>,
        ],
    },
    telefono: {
        titulo: 'En el teléfono o la tableta',
        pasos: [
            <><strong>iPhone o iPad:</strong> Ajustes › General › Fecha y hora › activa <strong>«Ajuste automático»</strong>.</>,
            <><strong>Android:</strong> Ajustes › Sistema › Fecha y hora › activa la fecha, la hora y la zona horaria automáticas (el nombre cambia un poco según la marca).</>,
        ],
    },
};

function Pasos({ sistema }: { sistema: Sistema }) {
    return (
        <ol className="list-decimal space-y-1 pl-5">
            {PASOS[sistema].pasos.map((paso, i) => <li key={i}>{paso}</li>)}
        </ol>
    );
}

export function AvisoRelojDesfasado() {
    const ruta = usePathname() || '';
    const [desfase, setDesfase] = useState<number | null>(null);
    const [descartado, setDescartado] = useState<number | null>(null);
    const [estado, setEstado] = useState<Estado>('listo');
    const [, setTic] = useState(0);
    const enCurso = useRef<Promise<number | null> | null>(null);
    const medidoAlAbrir = useRef(false);

    /** Mide (una medición a la vez) y, si la sesión guardada quedó en otra
     *  hora del equipo, la renueva. */
    const medir = useCallback((): Promise<number | null> => {
        if (!enCurso.current) {
            enCurso.current = (async () => {
                const d = await medirDesfase();
                if (d !== null && haySesionGuardada()) await ponerSesionEnHoraDelEquipo(d).catch(() => false);
                return d;
            })().finally(() => { enCurso.current = null; });
        }
        return enCurso.current;
    }, []);

    // Lo que midan las sesiones que entrega el servidor también cuenta.
    useEffect(() => {
        setDescartado(leerDescartado());
        const ya = desfaseConocido();
        if (ya !== null) setDesfase(ya);
        return alMedirDesfase((m) => setDesfase(m.desfase));
    }, []);

    // AL ABRIR: una vez por página, si hay sesión guardada o se está entrando.
    useEffect(() => {
        if (medidoAlAbrir.current) return;
        if (!haySesionGuardada() && !RUTAS_DE_ENTRADA.some((r) => ruta.startsWith(r))) return;
        medidoAlAbrir.current = true;
        medir();
    }, [ruta, medir]);

    // SI MUEVEN EL RELOJ con la página abierta (al corregirlo, por ejemplo): se
    // nota sin red —`Date.now()` deja de cuadrar con `performance.now()`— y
    // sólo entonces se vuelve a preguntar la hora, una vez por salto. También
    // en las pestañas de fondo: su sesión guardada pudo quedar en la hora vieja.
    useEffect(() => {
        const revisar = () => {
            if (relojMovido()) medir();
        };
        const intervalo = setInterval(revisar, 30_000);
        document.addEventListener('visibilitychange', revisar);
        return () => {
            clearInterval(intervalo);
            document.removeEventListener('visibilitychange', revisar);
        };
    }, [medir]);

    const visible = avisoVisible(desfase, descartado);

    // La hora real corre mientras el aviso está a la vista.
    useEffect(() => {
        if (!visible) return;
        const t = setInterval(() => setTic((n) => n + 1), 15_000);
        return () => clearInterval(t);
    }, [visible]);

    if (!visible || desfase === null) return null;

    const comprobar = async () => {
        setEstado('comprobando');
        const d = await medir();
        if (d === null) return setEstado('sin-red');
        setEstado(hayQueAvisar(d) ? 'sigue' : 'listo');
        if (!hayQueAvisar(d)) console.info('[reloj] El usuario corrigió la hora del equipo.');
    };

    const continuar = () => {
        guardarDescartado(desfase);
        setDescartado(desfase);
        console.info(`[reloj] El usuario siguió sin corregir la hora (va ${describirDesfase(desfase)}).`);
    };

    const ahora = Date.now();
    const real = ahora - desfase;
    const zona = zonaDelEquipo();
    const zonaMexicana = zona.startsWith('Mexico/') || ZONAS_DE_MEXICO.has(zona);
    const otroAnio = new Date(ahora).getFullYear() !== new Date(real).getFullYear();
    const sistema = sistemaDelEquipo();
    const otros = (['windows', 'mac', 'telefono'] as Sistema[]).filter((s) => s !== sistema);

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-reloj"
            aria-describedby="texto-reloj"
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-charcoal-900/95 p-4 backdrop-blur-sm"
        >
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl sm:p-8">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100">
                        <span className="font-serif text-lg text-amber-800">!</span>
                    </div>
                    <h2 id="titulo-reloj" className="font-serif text-2xl font-medium text-charcoal-900">
                        La fecha y hora de tu equipo no son correctas
                    </h2>
                </div>

                <p id="texto-reloj" className="mb-4 text-base leading-relaxed text-charcoal-700">
                    Tu equipo va <strong className="text-charcoal-900">{describirDesfase(desfase)}</strong>.
                    Con la hora equivocada, tu sesión puede cerrarse sola aunque tu contraseña sea
                    correcta, y las fechas que veas pueden no cuadrar. No es un problema de tu cuenta:
                    es la hora de este equipo.
                </p>

                <dl className="mb-5 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed">
                    <div>
                        <dt className="text-charcoal-600">
                            Hora real{zonaMexicana ? '' : ' en el centro de México'}
                        </dt>
                        <dd className="font-medium text-charcoal-900">
                            {fechaHora(real, zonaMexicana ? zona : ZONA_CDMX, otroAnio)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-charcoal-600">Tu equipo marca</dt>
                        <dd className="text-charcoal-800">{fechaHora(ahora, undefined, otroAnio)}</dd>
                    </div>
                </dl>

                <p className="mb-2 text-sm font-medium text-charcoal-900">
                    Cómo corregirla {PASOS[sistema].titulo.replace(/^En /, 'en ')}
                </p>
                <div className="mb-3 text-sm leading-relaxed text-charcoal-700">
                    <Pasos sistema={sistema} />
                </div>
                {otros.map((s) => (
                    <details key={s} className="mb-2 text-sm leading-relaxed text-charcoal-700">
                        <summary className="cursor-pointer text-charcoal-600 hover:text-charcoal-900">{PASOS[s].titulo}</summary>
                        <div className="mt-2"><Pasos sistema={s} /></div>
                    </details>
                ))}
                {zona && !zonaMexicana && (
                    <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
                        Además, tu equipo tiene la zona horaria de «{zona.split('/').pop()?.replace(/_/g, ' ')}».
                        Si estás en México, elige la de tu ciudad.
                    </p>
                )}

                <p className="mb-4 mt-4 text-sm leading-relaxed text-charcoal-600">
                    Cuando la corrijas, pulsa el botón: comprobamos la hora y tu sesión sigue donde estaba.
                </p>

                {estado === 'sigue' && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
                        Tu equipo todavía no tiene la hora correcta. Revisa que la hora automática esté
                        activada y vuelve a intentarlo.
                    </p>
                )}
                {estado === 'sin-red' && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
                        No pudimos comprobar la hora. Revisa tu conexión e inténtalo de nuevo.
                    </p>
                )}

                <button
                    onClick={comprobar}
                    disabled={estado === 'comprobando'}
                    className="w-full rounded-lg bg-charcoal-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-charcoal-800 disabled:opacity-60"
                >
                    {estado === 'comprobando' ? 'Comprobando la hora…' : 'Ya la corregí'}
                </button>

                <div className="mt-5 flex items-center justify-between border-t border-charcoal-100 pt-4 text-xs text-charcoal-500">
                    <span>
                        ¿Necesitas ayuda? Escríbenos a{' '}
                        <a href="mailto:soporte@iurexia.com" className="underline">
                            soporte@iurexia.com
                        </a>
                    </span>
                    <button onClick={continuar} className="ml-3 flex-shrink-0 underline hover:text-charcoal-700">
                        Continuar de todos modos
                    </button>
                </div>
            </div>
        </div>
    );
}
