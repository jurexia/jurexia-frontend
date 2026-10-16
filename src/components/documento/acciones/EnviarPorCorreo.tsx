'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle, ArrowLeft, ArrowRight, Check, CornerUpLeft, FileText, Loader2, Lock, Mail, Paperclip, Send,
    Sparkles, Undo2, X,
} from 'lucide-react';
import type { CarpetaDelEscrito } from '@/lib/documento/carpeta-del-escrito';
import { nombreDeArchivo } from '@/lib/documento/exportarDocx';
import { cabecerasConSesion } from '@/lib/cliente/sesion';
import { useAuth } from '@/lib/useAuth';
import { escalonDe, mensajeLimite, type Escalon } from '@/lib/uso-funciones-config';
import {
    MAX_ADJUNTO_BYTES, MAX_ASUNTO, MAX_DESTINATARIOS, MAX_MENSAJE, armarCorreo, clasificarDirecciones,
    destinatariosFinales, esCorreoValido, extractoDelEscrito, nombreDeFirma, normalizarCorreo, remitenteDe,
    limpiarAsunto, separarDirecciones, tamanoLegible, validarAsunto, validarDestinatarios, validarMensaje,
} from '@/lib/correo/escrito';

/**
 * «ENVIAR» EL ESCRITO POR CORREO, CON APROBACIÓN (16-oct-2026).
 *
 * David, 16-oct-2026: «automatizar las tareas como enviar correos». La escena,
 * como en Bufete: «Preparé el correo para el cliente y pedí tu aprobación →
 * lo aprobaste → se envió». Tres pasos, y NADA SALE SIN EL CLIC de «Aprobar y
 * enviar»:
 *   1. REDACTAR: para quién (hasta 3), copia para el abogado, asunto, mensaje
 *      —con «Proponer mensaje», que lo redacta el modelo ligero en su voz— y
 *      el Word de la hoja adjunto, el mismo que se descargaría.
 *   2. REVISAR Y APROBAR: cómo le llegará, con el HTML de verdad
 *      (`armarCorreo`, el mismo que arma el servidor), su remitente y a quién
 *      responde el cliente.
 *   3. ENVIADO: la hora, y que la respuesta del cliente le llega a su correo.
 * En el plan gratuito el botón se ve y el diálogo explica desde qué plan se
 * puede, con el enlace a los planes.
 *
 * El diálogo va en un PORTAL a `body` (los paneles de la hoja son `fixed` con
 * su propio apilamiento) y sus teclas no suben al panel: Esc cierra el
 * diálogo, no el documento. El borrador sobrevive a cerrarlo y volverlo a
 * abrir mientras sea el mismo escrito.
 *
 * Punto de montaje en la cabecera de `PanelDocumento` y de `EditorEscrito`.
 */
export interface EnviarPorCorreoProps {
    /** El escrito como .docx, exactamente como se descargaría; null si está vacío o hay cambios sin resolver. */
    obtenerDocx: () => Promise<Blob | null>;
    /** El texto plano de la hoja, para proponer asunto y mensaje. */
    obtenerTexto: () => string;
    titulo: string;
    carpeta?: CarpetaDelEscrito | null;
    deshabilitado?: boolean;
    avisar: (texto: string) => void;
}

interface Borrador {
    /** El escrito para el que se empezó: otro escrito, otro borrador. */
    clave: string;
    para: string[];
    /** Lo tecleado en «Para» que aún no es una dirección confirmada. */
    textoPara: string;
    copia: boolean;
    asunto: string;
    mensaje: string;
    adjuntar: boolean;
}

function claveDe(titulo: string, carpeta: CarpetaDelEscrito | null | undefined) {
    return `${carpeta?.id ?? ''}::${titulo}`;
}

function borradorNuevo(titulo: string, carpeta: CarpetaDelEscrito | null | undefined): Borrador {
    const cliente = normalizarCorreo(carpeta?.clienteCorreo ?? '');
    return {
        clave: claveDe(titulo, carpeta),
        para: cliente && esCorreoValido(cliente) ? [cliente] : [],
        textoPara: '',
        copia: true,
        asunto: titulo.trim().slice(0, MAX_ASUNTO),
        mensaje: '',
        adjuntar: true,
    };
}

export function EnviarPorCorreo({ obtenerDocx, obtenerTexto, titulo, carpeta = null, deshabilitado = false, avisar }: EnviarPorCorreoProps) {
    const [abierto, setAbierto] = useState(false);
    const [borrador, setBorrador] = useState<Borrador | null>(null);
    const boton = useRef<HTMLButtonElement | null>(null);

    function abrir() {
        const clave = claveDe(titulo, carpeta);
        if (!borrador || borrador.clave !== clave) setBorrador(borradorNuevo(titulo, carpeta));
        setAbierto(true);
    }
    const cerrar = useCallback((enviadoA?: string) => {
        setAbierto(false);
        if (enviadoA) { setBorrador(null); avisar(`Correo enviado a ${enviadoA}.`); }
    }, [avisar]);
    // Al cerrar, el foco vuelve al botón. Desde un efecto y no con
    // requestAnimationFrame, que en una pestaña de fondo no corre.
    const estabaAbierto = useRef(false);
    useEffect(() => {
        if (estabaAbierto.current && !abierto) boton.current?.focus();
        estabaAbierto.current = abierto;
    }, [abierto]);

    return (
        <>
            <button
                ref={boton}
                type="button"
                onClick={abrir}
                disabled={deshabilitado}
                title="Enviar por correo"
                aria-label="Enviar por correo"
                aria-haspopup="dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-charcoal-900/15 bg-white text-[12.5px] font-semibold text-charcoal-900 transition-colors hover:border-charcoal-900/35 disabled:opacity-40 sm:w-auto sm:px-3"
            >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Enviar</span>
            </button>
            {abierto && borrador && (
                <DialogoCorreo
                    obtenerDocx={obtenerDocx}
                    obtenerTexto={obtenerTexto}
                    titulo={titulo}
                    carpeta={carpeta}
                    borrador={borrador}
                    setBorrador={(f) => setBorrador((b) => (b ? f(b) : b))}
                    onCerrar={cerrar}
                />
            )}
        </>
    );
}

/* ═══ EL DIÁLOGO ═══════════════════════════════════════════════════════ */

type Paso = 'redactar' | 'revisar' | 'enviado';

interface DatosDelServidor {
    de_nombre: string;
    de_correo: string;
    responder_a: string | null;
    firma: string;
    escalon: Escalon;
    limite: number;
    usados: number | null;
    disponible: boolean;
    mensaje: string | null;
    correo_confirmado: boolean;
}

interface Aviso {
    texto: string;
    /** Lleva el enlace a los planes. */
    planes?: boolean;
}

interface Errores {
    para?: string;
    asunto?: string;
    mensaje?: string;
}

const PASOS: { id: Paso; nombre: string; corto: string }[] = [
    { id: 'redactar', nombre: 'Redactar', corto: 'Redactar' },
    { id: 'revisar', nombre: 'Revisar y aprobar', corto: 'Revisar' },
    { id: 'enviado', nombre: 'Enviado', corto: 'Enviado' },
];

const SIN_CONEXION = 'No hubo conexión con Iurexia. Revisa tu internet y vuelve a intentarlo: no se envió nada.';

function avisoDeError(status: number, j: { error?: unknown; codigo?: unknown; escalon?: unknown }): Aviso {
    if (status === 401) return { texto: 'Tu sesión se cerró. Vuelve a entrar y envíalo de nuevo: no se envió nada.' };
    if (status === 413) return { texto: 'El Word es demasiado grande para enviarlo desde aquí. Descárgalo y adjúntalo desde tu correo.' };
    const texto = typeof j?.error === 'string' && j.error ? j.error : 'Algo falló al hablar con Iurexia. Vuelve a intentarlo: no se envió nada.';
    return { texto, planes: (j?.codigo === 'plan' || j?.codigo === 'limite') && j?.escalon !== 'platinum' };
}

function base64De(blob: Blob): Promise<string> {
    return new Promise((ok, mal) => {
        const r = new FileReader();
        r.onload = () => { const s = String(r.result || ''); ok(s.slice(s.indexOf(',') + 1)); };
        r.onerror = () => mal(r.error);
        r.readAsDataURL(blob);
    });
}

function claveDeIntento(): string {
    const c = typeof window !== 'undefined' ? window.crypto : undefined;
    if (c && 'randomUUID' in c) return c.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CAMPO = 'w-full rounded-xl border bg-white px-3 py-2 text-base text-charcoal-900 placeholder:text-charcoal-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-gold/25 [@media(pointer:fine)]:text-[13px]';
const BORDE = (error?: string) => (error ? 'border-red-400 focus:border-red-500' : 'border-charcoal-900/15 focus:border-charcoal-900/35');

function DialogoCorreo({ obtenerDocx, obtenerTexto, titulo, carpeta, borrador, setBorrador, onCerrar }: {
    obtenerDocx: () => Promise<Blob | null>;
    obtenerTexto: () => string;
    titulo: string;
    carpeta: CarpetaDelEscrito | null;
    borrador: Borrador;
    setBorrador: (f: (b: Borrador) => Borrador) => void;
    onCerrar: (enviadoA?: string) => void;
}) {
    const auth = useAuth();
    const ids = useId();
    const idTitulo = `${ids}-titulo`, idPara = `${ids}-para`, idAsunto = `${ids}-asunto`, idMensaje = `${ids}-mensaje`, idAdjunto = `${ids}-adjunto`;
    const panel = useRef<HTMLDivElement | null>(null);
    const cuerpoRef = useRef<HTMLDivElement | null>(null);
    const inputPara = useRef<HTMLInputElement | null>(null);
    const listo = useRef<HTMLButtonElement | null>(null);
    const alerta = useRef<HTMLDivElement | null>(null);
    const pulsadoEnFondo = useRef(false);

    const [datos, setDatos] = useState<DatosDelServidor | null>(null);
    const [paso, setPaso] = useState<Paso>('redactar');
    const [docx, setDocx] = useState<{ blob: Blob; nombre: string; bytes: number } | null>(null);
    const [sinDocx, setSinDocx] = useState<string | null>(null);
    const [preparando, setPreparando] = useState(true);
    const [errores, setErrores] = useState<Errores>({});
    const [proponiendo, setProponiendo] = useState(false);
    const [avisoPropuesta, setAvisoPropuesta] = useState<Aviso | null>(null);
    const [previo, setPrevio] = useState<{ asunto: string; mensaje: string } | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState<Aviso | null>(null);
    const [resultado, setResultado] = useState<{ enviadoAt: string; para: string[]; cc: string[] } | null>(null);
    const [clave, setClave] = useState('');
    /* A dónde va el foco tras el siguiente pintado (un campo con error, el de
       «Para» al quitar una dirección). */
    const [enfocar, setEnfocar] = useState<string | null>(null);
    useEffect(() => {
        if (!enfocar) return;
        document.getElementById(enfocar)?.focus();
        setEnfocar(null);
    }, [enfocar]);

    /* ── QUIÉN FIRMA: lo dice el servidor; mientras, lo mismo desde el perfil ── */
    const nombrePerfil = auth.profile?.full_name || (auth.user?.user_metadata?.full_name as string | undefined) || null;
    const correoCuenta = auth.user?.email || auth.profile?.email || null;
    const deLocal = remitenteDe(nombrePerfil, correoCuenta);
    const de = datos ? { nombre: datos.de_nombre, correo: datos.de_correo } : { nombre: deLocal.nombre, correo: deLocal.correo };
    const responderA = datos ? datos.responder_a : correoCuenta;
    const firma = datos?.firma ?? nombreDeFirma(nombrePerfil, correoCuenta);
    const escalonLocal = auth.profile ? escalonDe(auth.profile.subscription_type) : null;
    const bloqueado = datos ? !datos.disponible : escalonLocal === 'gratuito';
    const sinConfirmar = !!datos && !datos.correo_confirmado;

    const { para, textoPara, copia, asunto, mensaje, adjuntar } = borrador;
    const actualizar = (cambios: Partial<Borrador>) => setBorrador((b) => ({ ...b, ...cambios }));

    /* El mensaje crece con lo escrito (de 10.5 a 24 rem): la propuesta se lee
       entera sin desplazarse dentro del campo. */
    const areaMensaje = useRef<HTMLTextAreaElement | null>(null);
    useLayoutEffect(() => {
        const ta = areaMensaje.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(Math.max(ta.scrollHeight + 2, 168), 384)}px`;
    }, [mensaje, paso]);

    /* ── AL ABRIR: la página no se mueve, el foco entra, el Word y los datos ── */
    useEffect(() => {
        const previoOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previoOverflow; };
    }, []);

    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const r = await fetch('/api/correo/escrito', { headers: await cabecerasConSesion(false), cache: 'no-store' });
                if (!r.ok) return;
                const j = await r.json() as DatosDelServidor;
                if (vivo && j && typeof j.disponible === 'boolean') setDatos(j);
            } catch { /* sin datos: se usan los del perfil, que son los mismos */ }
        })();
        return () => { vivo = false; };
    }, []);

    useEffect(() => {
        if (bloqueado) return;
        let vivo = true;
        (async () => {
            setPreparando(true);
            try {
                const blob = await obtenerDocx();
                if (!vivo) return;
                if (!blob) {
                    setDocx(null);
                    setSinDocx(obtenerTexto().trim()
                        ? 'Hay cambios de redacción sin resolver: acéptalos o recházalos en la hoja para adjuntar el Word.'
                        : 'El documento está vacío: no hay nada que adjuntar.');
                } else if (blob.size > MAX_ADJUNTO_BYTES) {
                    setDocx(null);
                    setSinDocx(`El Word pesa ${tamanoLegible(blob.size)} y el máximo es de ${tamanoLegible(MAX_ADJUNTO_BYTES)}.`);
                } else {
                    setDocx({ blob, nombre: nombreDeArchivo(titulo, 'docx'), bytes: blob.size });
                    setSinDocx(null);
                }
            } catch {
                if (vivo) { setDocx(null); setSinDocx('No se pudo preparar el Word. Cierra y vuelve a intentarlo.'); }
            } finally {
                if (vivo) setPreparando(false);
            }
        })();
        return () => { vivo = false; };
        // Una vez por apertura: con el diálogo encima, la hoja no puede cambiar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bloqueado]);

    // Si el envío no salió, el aviso se ve sin buscarlo: queda junto a los botones.
    useEffect(() => {
        if (errorEnvio) alerta.current?.scrollIntoView({ block: 'nearest' });
    }, [errorEnvio]);

    // Al abrir y en cada paso: arriba del todo y el foco en el diálogo (no en
    // un campo, para que en el teléfono no salte el teclado); en el último, en «Listo».
    useEffect(() => {
        cuerpoRef.current?.scrollTo({ top: 0 });
        if (paso === 'enviado') listo.current?.focus();
        else panel.current?.focus();
    }, [paso]);

    function cerrar() {
        if (enviando) return;
        onCerrar(paso === 'enviado' && resultado ? resultado.para.join(', ') : undefined);
    }

    function teclas(e: React.KeyboardEvent<HTMLDivElement>) {
        // Nada sube al panel de la hoja: su Esc lo cerraría y su Tab atrapa el foco allá.
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
        if (e.key !== 'Tab' || !panel.current) return;
        const foco = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES))
            .filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (!foco.length) return;
        const primero = foco[0], ultimo = foco[foco.length - 1];
        const activo = document.activeElement;
        if (e.shiftKey && (activo === primero || activo === panel.current)) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus(); }
    }

    /* ── «PARA» ────────────────────────────────────────────────────────── */
    function confirmarPara(texto: string, base: string[] = para): string[] {
        const { validas, invalidas } = clasificarDirecciones(separarDirecciones(texto));
        const lista = base.slice();
        for (const v of validas) if (!lista.includes(v)) lista.push(v);
        let error: string | undefined;
        if (lista.length > MAX_DESTINATARIOS) error = `Hasta ${MAX_DESTINATARIOS} destinatarios por envío.`;
        if (invalidas.length) error = `«${invalidas[0].slice(0, 80)}» no parece una dirección de correo.`;
        const final = lista.slice(0, MAX_DESTINATARIOS);
        actualizar({ para: final, textoPara: invalidas.join(', ') });
        setErrores((e) => ({ ...e, para: error }));
        return final;
    }
    function quitarPara(d: string) {
        actualizar({ para: para.filter((x) => x !== d) });
        setErrores((e) => ({ ...e, para: undefined }));
        setEnfocar(idPara);
    }
    function teclaPara(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
            e.preventDefault();
            if (textoPara.trim()) confirmarPara(textoPara);
        } else if (e.key === 'Tab' && textoPara.trim()) {
            confirmarPara(textoPara);
        } else if (e.key === 'Backspace' && !textoPara && para.length) {
            quitarPara(para[para.length - 1]);
        }
    }
    function pegarPara(e: React.ClipboardEvent<HTMLInputElement>) {
        const pegado = e.clipboardData.getData('text');
        if (!/[\s,;<]/.test(pegado)) return;
        e.preventDefault();
        confirmarPara(`${textoPara} ${pegado}`);
    }

    /* ── «PROPONER MENSAJE» ───────────────────────────────────────────── */
    async function proponer() {
        if (proponiendo) return;
        setAvisoPropuesta(null);
        const texto = extractoDelEscrito(obtenerTexto());
        if (!texto.trim()) { setAvisoPropuesta({ texto: 'El documento está vacío: escribe el escrito antes de proponer el correo.' }); return; }
        // El nombre del cliente sólo si el correo va a él.
        const delCliente = normalizarCorreo(carpeta?.clienteCorreo ?? '');
        const destinatario = carpeta?.clienteNombre && (delCliente ? para.includes(delCliente) : para.length === 1)
            ? carpeta.clienteNombre : null;
        setProponiendo(true);
        try {
            const r = await fetch('/api/correo/escrito', {
                method: 'POST',
                headers: await cabecerasConSesion(),
                body: JSON.stringify({ accion: 'proponer', titulo, texto, destinatario, adjunto: adjuntar && !!docx }),
            });
            const j = await r.json().catch(() => ({}));
            if (r.ok && typeof j.asunto === 'string' && typeof j.mensaje === 'string') {
                const habiaAlgo = mensaje.trim() || (asunto.trim() && asunto.trim() !== titulo.trim());
                setPrevio(habiaAlgo ? { asunto, mensaje } : null);
                actualizar({ asunto: j.asunto, mensaje: j.mensaje });
                setErrores((e) => ({ ...e, asunto: undefined, mensaje: undefined }));
                return;
            }
            setAvisoPropuesta(avisoDeError(r.status, j));
        } catch {
            setAvisoPropuesta({ texto: 'No hubo conexión con Iurexia. Vuelve a intentarlo.' });
        } finally {
            setProponiendo(false);
        }
    }
    function deshacerPropuesta() {
        if (!previo) return;
        actualizar({ asunto: previo.asunto, mensaje: previo.mensaje });
        setPrevio(null);
    }

    /* ── DE REDACTAR A REVISAR ────────────────────────────────────────── */
    function revisar() {
        // Lo que quedó escrito en «Para» sin confirmar también cuenta.
        const { validas, invalidas } = clasificarDirecciones([...para, ...separarDirecciones(textoPara)]);
        const e: Errores = {};
        if (invalidas.length) e.para = `«${invalidas[0].slice(0, 80)}» no parece una dirección de correo.`;
        else {
            const vp = validarDestinatarios(validas);
            if (!vp.ok) e.para = vp.error;
        }
        const va = validarAsunto(asunto);
        if (!va.ok) e.asunto = va.error;
        const vm = validarMensaje(mensaje);
        if (!vm.ok) e.mensaje = vm.error;
        actualizar({ para: validas.slice(0, MAX_DESTINATARIOS), textoPara: invalidas.join(', ') });
        setErrores(e);
        if (e.para || e.asunto || e.mensaje) {
            setEnfocar(e.para ? idPara : e.asunto ? idAsunto : idMensaje);
            return;
        }
        setErrorEnvio(null);
        setClave(claveDeIntento());
        setPaso('revisar');
    }

    /* ── APROBAR Y ENVIAR: el único camino por el que sale algo ────────── */
    async function aprobar() {
        if (enviando || sinConfirmar) return;
        setEnviando(true);
        setErrorEnvio(null);
        try {
            const adjunto = adjuntar && docx ? { nombre: docx.nombre, base64: await base64De(docx.blob) } : null;
            const r = await fetch('/api/correo/escrito', {
                method: 'POST',
                headers: await cabecerasConSesion(),
                body: JSON.stringify({
                    accion: 'enviar', para, copia_para_mi: copia && !!responderA, asunto, mensaje, adjunto,
                    expediente_id: carpeta?.id ?? null, clave,
                }),
            });
            const j = await r.json().catch(() => ({}));
            if (r.ok && j.ok) {
                setResultado({
                    enviadoAt: typeof j.enviado_at === 'string' ? j.enviado_at : new Date().toISOString(),
                    para: Array.isArray(j.para) ? j.para : para,
                    cc: Array.isArray(j.cc) ? j.cc : [],
                });
                setPaso('enviado');
                return;
            }
            const aviso = avisoDeError(r.status, j);
            if (r.status === 400 && (j.campo === 'para' || j.campo === 'asunto' || j.campo === 'mensaje')) {
                setErrores({ [j.campo]: aviso.texto });
                setPaso('redactar');
                return;
            }
            setErrorEnvio(aviso);
        } catch {
            setErrorEnvio({ texto: SIN_CONEXION });
        } finally {
            setEnviando(false);
        }
    }

    /* ── LA VISTA PREVIA: el HTML que sale, no una imitación ───────────── */
    const conAdjunto = adjuntar && !!docx;
    const { to, cc } = destinatariosFinales(para, copia && !!responderA, responderA);
    const vista = paso === 'revisar'
        // El asunto como lo deja el servidor (en un renglón, sin dobles
        // espacios): si no, el <title> de la vista previa no sería el que sale.
        ? armarCorreo({ firma, asunto: limpiarAsunto(asunto), mensaje, adjunto: conAdjunto && docx ? { nombre: docx.nombre, bytes: docx.bytes } : null })
        : null;

    const restantes = datos && datos.usados !== null && datos.limite > 0 ? Math.max(0, datos.limite - datos.usados) : null;
    const largo = mensaje.length;
    const hora = resultado
        ? new Date(resultado.enviadoAt).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
        : '';

    return createPortal(
        <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-charcoal-900/45 backdrop-blur-[2px] sm:items-center sm:p-4"
            onMouseDown={(e) => { pulsadoEnFondo.current = e.target === e.currentTarget; }}
            onClick={(e) => { if (pulsadoEnFondo.current && e.target === e.currentTarget) cerrar(); pulsadoEnFondo.current = false; }}
            onKeyDown={teclas}
        >
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                tabIndex={-1}
                className={`flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#fbf8f1] shadow-2xl ring-1 ring-charcoal-900/10 focus:outline-none sm:max-h-[min(92dvh,880px)] sm:rounded-3xl ${bloqueado ? 'sm:max-w-md' : 'sm:max-w-[640px]'}`}
            >
                {bloqueado ? (
                    /* ── PLAN GRATUITO: qué es y desde qué plan ───────────── */
                    <div className="relative px-6 pb-6 pt-7 text-center sm:px-8">
                        <button type="button" onClick={cerrar} aria-label="Cerrar"
                            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-charcoal-900/60 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                            <X className="h-4 w-4" />
                        </button>
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-charcoal-900 text-accent-gold">
                            <Mail className="h-5 w-5" />
                        </span>
                        <h2 id={idTitulo} className="mt-4 font-serif text-[22px] leading-tight text-charcoal-900">Envía tus escritos por correo</h2>
                        <p className="mx-auto mt-2.5 max-w-sm text-[14px] leading-relaxed text-charcoal-900">
                            {datos?.mensaje || mensajeLimite('correo', 'gratuito')}
                        </p>
                        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-charcoal-900/65">
                            Iurexia prepara el correo para tu cliente, tú lo revisas tal como le llegará y lo apruebas: sale con tu nombre y el Word adjunto, y su respuesta llega a tu correo.
                        </p>
                        <div className="mt-6 flex flex-col items-center gap-1.5">
                            <a href="/precios" className="relieve relieve-tinta h-11 w-full max-w-xs rounded-xl text-[14px] font-semibold">
                                Ver los planes <ArrowRight className="h-4 w-4" />
                            </a>
                            <button type="button" onClick={cerrar}
                                className="h-9 px-3 text-[12.5px] font-medium text-charcoal-900/60 transition-colors hover:text-charcoal-900">
                                Ahora no
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── CABECERA: qué se envía y en qué paso va ─────── */}
                        <div className="shrink-0 border-b border-charcoal-900/[0.08] px-5 pb-3.5 pt-4 sm:px-6">
                            <div className="flex items-start gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-charcoal-900 text-accent-gold">
                                    <Mail className="h-[18px] w-[18px]" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h2 id={idTitulo} className="font-serif text-[19px] leading-tight text-charcoal-900">Enviar el escrito por correo</h2>
                                    <p className="mt-0.5 truncate text-[12.5px] text-charcoal-900/60" title={titulo}>{titulo}</p>
                                </div>
                                <button type="button" onClick={cerrar} aria-label="Cerrar" disabled={enviando}
                                    className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-charcoal-900/60 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 disabled:opacity-40">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <ol className="mt-3.5 flex items-center gap-1.5 text-[11.5px]" aria-label="Pasos">
                                {PASOS.map((p, i) => {
                                    const indice = PASOS.findIndex((x) => x.id === paso);
                                    const activo = i === indice, hecho = i < indice;
                                    return (
                                        <li key={p.id} className="flex min-w-0 items-center gap-1.5" aria-current={activo ? 'step' : undefined}>
                                            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold ${activo
                                                ? 'bg-charcoal-900 text-white'
                                                : hecho ? 'bg-accent-gold/30 text-charcoal-900' : 'bg-charcoal-900/[0.07] text-charcoal-900/50'}`}>
                                                {hecho ? <Check className="h-3 w-3" /> : i + 1}
                                            </span>
                                            <span className={`truncate ${activo ? 'font-semibold text-charcoal-900' : hecho ? 'text-charcoal-900/70' : 'text-charcoal-900/45'}`}>
                                                <span className="sm:hidden">{p.corto}</span><span className="hidden sm:inline">{p.nombre}</span>
                                            </span>
                                            {i < PASOS.length - 1 && <span aria-hidden className="mx-1 h-px w-4 shrink-0 bg-charcoal-900/15 sm:w-6" />}
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        {/* ── CUERPO ──────────────────────────────────────── */}
                        <div ref={cuerpoRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
                            {paso === 'redactar' && (
                                <div className="space-y-4">
                                    {sinConfirmar && (
                                        <p className="flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <span>Confirma tu correo{responderA ? ` (${responderA})` : ''} para poder enviar: es la dirección a la que tu cliente responderá.</span>
                                        </p>
                                    )}

                                    {/* Para */}
                                    <div>
                                        <label htmlFor={idPara} className="mb-1 block text-[12px] font-medium text-charcoal-900/70">Para</label>
                                        <div
                                            onClick={(e) => { if (e.target === e.currentTarget) inputPara.current?.focus(); }}
                                            className={`flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-accent-gold/25 ${errores.para ? 'border-red-400' : 'border-charcoal-900/15 focus-within:border-charcoal-900/35'}`}
                                        >
                                            {para.map((d) => (
                                                <span key={d} className="inline-flex max-w-full items-center gap-1 rounded-full bg-charcoal-900/[0.06] py-1 pl-2.5 pr-1 text-[12.5px] text-charcoal-900">
                                                    <span className="truncate">{d}</span>
                                                    <button type="button" onClick={() => quitarPara(d)} aria-label={`Quitar a ${d}`}
                                                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-charcoal-900/55 transition-colors hover:bg-charcoal-900/10 hover:text-charcoal-900">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {para.length < MAX_DESTINATARIOS ? (
                                                <input
                                                    id={idPara}
                                                    ref={inputPara}
                                                    type="text"
                                                    inputMode="email"
                                                    autoComplete="email"
                                                    autoCapitalize="none"
                                                    autoCorrect="off"
                                                    spellCheck={false}
                                                    enterKeyHint="next"
                                                    value={textoPara}
                                                    onChange={(e) => { actualizar({ textoPara: e.target.value }); if (errores.para) setErrores((x) => ({ ...x, para: undefined })); }}
                                                    onKeyDown={teclaPara}
                                                    onBlur={() => { if (textoPara.trim()) confirmarPara(textoPara); }}
                                                    onPaste={pegarPara}
                                                    placeholder={para.length ? 'Otro destinatario' : 'correo@cliente.com'}
                                                    aria-invalid={!!errores.para}
                                                    aria-describedby={errores.para ? `${idPara}-error` : `${idPara}-ayuda`}
                                                    className="min-w-[9rem] flex-1 bg-transparent px-1 py-1 text-base text-charcoal-900 placeholder:text-charcoal-900/40 focus:outline-none [@media(pointer:fine)]:text-[13px]"
                                                />
                                            ) : (
                                                <span id={idPara} tabIndex={-1} className="px-1 text-[12px] text-charcoal-900/50">Máximo {MAX_DESTINATARIOS}</span>
                                            )}
                                        </div>
                                        {errores.para
                                            ? <p id={`${idPara}-error`} role="alert" className="mt-1 text-[12px] text-red-700">{errores.para}</p>
                                            : <p id={`${idPara}-ayuda`} className="mt-1 text-[11.5px] text-charcoal-900/50">Hasta {MAX_DESTINATARIOS} direcciones. Pulsa Enter o coma para añadir otra.</p>}
                                    </div>

                                    {/* Copia */}
                                    {responderA && (
                                        <button type="button" role="switch" aria-checked={copia} onClick={() => actualizar({ copia: !copia })}
                                            className="flex w-full min-w-0 items-center gap-2.5 rounded-lg text-left">
                                            <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${copia ? 'bg-charcoal-900' : 'bg-charcoal-900/20'}`}>
                                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${copia ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                                            </span>
                                            <span className="min-w-0 truncate text-[13px] text-charcoal-900">
                                                Enviarme una copia <span className="text-charcoal-900/50">· {responderA}</span>
                                            </span>
                                        </button>
                                    )}

                                    {/* Asunto */}
                                    <div>
                                        <label htmlFor={idAsunto} className="mb-1 block text-[12px] font-medium text-charcoal-900/70">Asunto</label>
                                        <input
                                            id={idAsunto}
                                            value={asunto}
                                            maxLength={MAX_ASUNTO}
                                            onChange={(e) => { actualizar({ asunto: e.target.value }); if (errores.asunto) setErrores((x) => ({ ...x, asunto: undefined })); }}
                                            aria-invalid={!!errores.asunto}
                                            aria-describedby={errores.asunto ? `${idAsunto}-error` : undefined}
                                            className={`${CAMPO} ${BORDE(errores.asunto)}`}
                                        />
                                        {errores.asunto && <p id={`${idAsunto}-error`} role="alert" className="mt-1 text-[12px] text-red-700">{errores.asunto}</p>}
                                    </div>

                                    {/* Mensaje */}
                                    <div>
                                        <div className="mb-1 flex items-end justify-between gap-3">
                                            <label htmlFor={idMensaje} className="text-[12px] font-medium text-charcoal-900/70">Mensaje</label>
                                            <button type="button" onClick={proponer} disabled={proponiendo}
                                                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-accent-gold/50 bg-accent-gold/[0.12] px-2.5 text-[12.5px] font-semibold text-charcoal-900 transition-colors hover:bg-accent-gold/[0.22] disabled:opacity-70">
                                                {proponiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-accent-brown" />}
                                                {proponiendo ? 'Redactando…' : 'Proponer mensaje'}
                                            </button>
                                        </div>
                                        <textarea
                                            ref={areaMensaje}
                                            id={idMensaje}
                                            rows={7}
                                            value={mensaje}
                                            readOnly={proponiendo}
                                            onChange={(e) => { actualizar({ mensaje: e.target.value }); if (errores.mensaje) setErrores((x) => ({ ...x, mensaje: undefined })); }}
                                            placeholder="Escribe el mensaje para tu cliente, o pide que se te proponga uno a partir del escrito."
                                            aria-invalid={!!errores.mensaje}
                                            aria-describedby={errores.mensaje ? `${idMensaje}-error` : undefined}
                                            className={`${CAMPO} ${BORDE(errores.mensaje)} block min-h-[10.5rem] resize-none leading-relaxed ${proponiendo ? 'animate-pulse' : ''}`}
                                        />
                                        {(errores.mensaje || avisoPropuesta || previo || largo > MAX_MENSAJE * 0.8) && (
                                            <div className="mt-1 flex items-start justify-between gap-3 text-[12px]">
                                                <div className="min-w-0">
                                                    {errores.mensaje && <p id={`${idMensaje}-error`} role="alert" className="text-red-700">{errores.mensaje}</p>}
                                                    {!errores.mensaje && avisoPropuesta && (
                                                        <p role="alert" className="text-red-700">
                                                            {avisoPropuesta.texto}
                                                            {avisoPropuesta.planes && <> <a href="/precios" className="font-semibold underline">Ver los planes</a></>}
                                                        </p>
                                                    )}
                                                    {!errores.mensaje && !avisoPropuesta && previo && (
                                                        <button type="button" onClick={deshacerPropuesta}
                                                            className="inline-flex items-center gap-1 text-charcoal-900/60 underline-offset-2 hover:text-charcoal-900 hover:underline">
                                                            <Undo2 className="h-3 w-3" /> Volver a lo que tenía escrito
                                                        </button>
                                                    )}
                                                </div>
                                                {largo > MAX_MENSAJE * 0.8 && (
                                                    <span className={`shrink-0 tabular-nums ${largo > MAX_MENSAJE ? 'text-red-700' : 'text-charcoal-900/50'}`}>
                                                        {largo.toLocaleString('es-MX')} / {MAX_MENSAJE.toLocaleString('es-MX')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Adjunto */}
                                    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${docx ? 'border-charcoal-900/[0.12] bg-white' : 'border-dashed border-charcoal-900/20 bg-white/60'}`}>
                                        <input
                                            id={idAdjunto}
                                            type="checkbox"
                                            checked={conAdjunto}
                                            disabled={!docx}
                                            onChange={(e) => actualizar({ adjuntar: e.target.checked })}
                                            className="h-4 w-4 shrink-0 accent-charcoal-900 disabled:opacity-40"
                                        />
                                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${docx ? 'bg-blue-600/10 text-blue-700' : 'bg-charcoal-900/[0.05] text-charcoal-900/40'}`}>
                                            {preparando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                        </span>
                                        <label htmlFor={idAdjunto} className={`min-w-0 flex-1 ${docx ? 'cursor-pointer' : ''}`}>
                                            <span className="block text-[13px] font-medium text-charcoal-900">Adjuntar el escrito (Word)</span>
                                            <span className={`block text-[12px] ${docx ? 'truncate text-charcoal-900/60' : 'text-amber-800'}`}>
                                                {preparando ? 'Preparando el Word…' : docx ? `${docx.nombre} · ${tamanoLegible(docx.bytes)}` : sinDocx}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {paso === 'revisar' && vista && (
                                <div className="space-y-3">
                                    <p className="text-[12.5px] leading-relaxed text-charcoal-900/70">
                                        Así le llegará. Revísalo: <strong className="font-semibold text-charcoal-900">nada sale hasta que lo apruebes</strong>.
                                    </p>
                                    <div className="overflow-hidden rounded-2xl border border-charcoal-900/10 bg-white shadow-[0_1px_2px_rgba(26,26,26,0.05)]">
                                        <dl className="divide-y divide-charcoal-900/[0.07] text-[13px]">
                                            <Fila nombre="De">
                                                <span className="font-semibold text-charcoal-900">{de.nombre}</span>{' '}
                                                <span className="text-charcoal-900/55">&lt;{de.correo}&gt;</span>
                                            </Fila>
                                            {responderA && <Fila nombre="Responder a">{responderA}</Fila>}
                                            <Fila nombre="Para">{to.join(', ')}</Fila>
                                            {cc.length > 0 && <Fila nombre="CC">{cc.join(', ')}</Fila>}
                                            <Fila nombre="Asunto"><span className="font-semibold text-charcoal-900">{limpiarAsunto(asunto)}</span></Fila>
                                        </dl>
                                        <VistaDelCorreo html={vista.html} />
                                        {conAdjunto && docx && (
                                            <div className="flex items-center gap-2 border-t border-charcoal-900/[0.07] bg-cream-100 px-4 py-2.5 text-[12.5px] text-charcoal-900">
                                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-charcoal-900/55" />
                                                <span className="min-w-0 truncate font-medium">{docx.nombre}</span>
                                                <span className="shrink-0 text-charcoal-900/55">· {tamanoLegible(docx.bytes)}</span>
                                            </div>
                                        )}
                                    </div>
                                    {errorEnvio && (
                                        <div ref={alerta} role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-relaxed text-red-900">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <div className="min-w-0">
                                                <p>{errorEnvio.texto}</p>
                                                {errorEnvio.planes && <a href="/precios" className="mt-1 inline-block font-semibold underline">Ver los planes</a>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paso === 'enviado' && resultado && (
                                <div className="flex flex-col items-center px-2 py-8 text-center sm:py-10">
                                    <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-600/10 text-emerald-700 ring-8 ring-emerald-600/[0.05]">
                                        <Check className="h-7 w-7" />
                                    </span>
                                    <h3 className="mt-5 font-serif text-[26px] leading-tight text-charcoal-900">Enviado</h3>
                                    <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-charcoal-900/75">
                                        Salió a las <strong className="font-semibold text-charcoal-900">{hora}</strong> a{' '}
                                        <span className="break-words text-charcoal-900">{resultado.para.join(', ')}</span>
                                        {resultado.cc.length > 0 ? ', con copia para ti' : ''}.
                                    </p>
                                    <p className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-cream-200 px-4 py-2 text-[13px] text-charcoal-900 ring-1 ring-charcoal-900/[0.06]">
                                        <CornerUpLeft className="h-4 w-4 shrink-0 text-accent-brown" />
                                        <span>Si tu cliente responde, le llega a tu correo.</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ── PIE: lo que se puede hacer en cada paso ─────── */}
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-charcoal-900/[0.08] bg-[#f8f4ea] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                            {paso === 'redactar' && (
                                <>
                                    <p className="mr-auto min-w-0 basis-full text-[11.5px] text-charcoal-900/55 sm:basis-auto">
                                        {restantes !== null ? `Te quedan ${restantes} de ${datos?.limite} envíos de hoy.` : 'Lo revisas antes de que salga.'}
                                    </p>
                                    <button type="button" onClick={cerrar}
                                        className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-charcoal-900/70 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900">
                                        Cancelar
                                    </button>
                                    <button type="button" onClick={revisar} disabled={proponiendo}
                                        className="relieve relieve-tinta h-10 rounded-xl px-4 text-[13px] font-semibold disabled:opacity-60">
                                        Revisar <ArrowRight className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                            {paso === 'revisar' && (
                                <>
                                    <p className="mr-auto flex min-w-0 basis-full items-center gap-1.5 text-[11.5px] text-charcoal-900/55 sm:basis-auto">
                                        <Lock className="h-3.5 w-3.5 shrink-0" />
                                        {sinConfirmar ? 'Confirma tu correo para poder enviarlo.' : 'Sale con tu aprobación.'}
                                    </p>
                                    <button type="button" onClick={() => { setErrorEnvio(null); setPaso('redactar'); }} disabled={enviando}
                                        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-medium text-charcoal-900/70 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900 disabled:opacity-40">
                                        <ArrowLeft className="h-4 w-4" /> Volver a editar
                                    </button>
                                    <button type="button" onClick={aprobar} disabled={enviando || sinConfirmar}
                                        className="relieve relieve-tinta h-10 rounded-xl px-4 text-[13px] font-semibold disabled:opacity-60">
                                        {enviando ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <><Send className="h-4 w-4" /> Aprobar y enviar</>}
                                    </button>
                                </>
                            )}
                            {paso === 'enviado' && (
                                <button ref={listo} type="button" onClick={cerrar}
                                    className="relieve relieve-tinta h-10 rounded-xl px-6 text-[13px] font-semibold">
                                    Listo
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

function Fila({ nombre, children }: { nombre: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-3 px-4 py-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
            <dt className="text-charcoal-900/55">{nombre}</dt>
            <dd className="min-w-0 break-words text-charcoal-900">{children}</dd>
        </div>
    );
}

/**
 * El correo tal cual, en un marco aislado: sin scripts (no los lleva, y el
 * `sandbox` tampoco los dejaría correr) y sin clics, a la altura de lo que
 * mide, para que el diálogo sea el único que se desplaza.
 */
function VistaDelCorreo({ html }: { html: string }) {
    const marco = useRef<HTMLIFrameElement | null>(null);
    const [alto, setAlto] = useState(420);
    // Lo que mide el contenido, no el documento: el `scrollHeight` del
    // documento nunca baja de la altura del propio marco, así que un correo
    // corto dejaba el hueco del largo anterior.
    const medir = useCallback(() => {
        const cuerpo = marco.current?.contentDocument?.body;
        if (!cuerpo) return;
        const h = Math.ceil(cuerpo.getBoundingClientRect().height);
        if (h > 0) setAlto(h);
    }, []);
    useEffect(() => {
        const el = marco.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => medir());
        ro.observe(el);
        return () => ro.disconnect();
    }, [medir]);
    return (
        <iframe
            ref={marco}
            title="Vista previa del correo"
            srcDoc={html}
            sandbox="allow-same-origin"
            onLoad={medir}
            tabIndex={-1}
            className="pointer-events-none block w-full border-t border-charcoal-900/[0.07] bg-cream-200"
            style={{ height: alto }}
        />
    );
}
