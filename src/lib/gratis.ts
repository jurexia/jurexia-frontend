'use client';
/**
 * EL CARRIL BÁSICO: IUREXIA SIN CUENTA (18-sep-2026)
 *
 * David: «hay un enorme cuello de usuarios que nunca hace auth. Basta con que
 * haga clic en probar la plataforma en su versión más básica».
 *
 * El dato que lo justifica: 2,320 cuentas registradas y sólo 438 que llegaron
 * a escribir una consulta. Cuatro de cada cinco se registran y nunca ven el
 * producto. Aquí no se pide nada por delante: ni correo, ni tarjeta, ni
 * verificación.
 *
 * QUÉ LIMITA. No la cantidad —eso quitaría incentivo de compra sin enseñar
 * nada—, sino la CAPACIDAD: contesta con criterios del Semanario y sus
 * registros, y no redacta, no razona largo, no trae la legislación del estado
 * y no entrega el PDF de la tesis. Para consultarla y descargarla hay que ir
 * al Semanario Judicial, que es la fuente oficial. Todo lo demás —genios,
 * Toulmin, jurimetría, expedientes, carpetas, memoria— se ve con candado.
 *
 * EL TESTIGO no lleva un solo dato personal: es azar firmado por el servidor.
 * Vive en este navegador para que la misma visita conserve su cuenta del día.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || '';
const LLAVE = 'iurexia-basico-testigo';

export interface FuenteBasica {
    n: number;
    tipo: 'tesis' | 'bloque' | string;
    registro: string;
    rubro: string;
    clave: string;
    instancia: string;
    epoca: string;
    materia: string;
    /** Dónde consultarla y descargarla: la fuente oficial, no nosotros. */
    semanario: string | null;
    texto: string;
}

export interface RespuestaBasica {
    texto: string;
    fuentes: FuenteBasica[];
    usadas: number;
    tope: number;
    aviso: string;
    bloqueado: string[];
    anonimo: boolean;
}

/** Lo que el carril básico NO hace. El servidor manda la lista; ésta es el
 *  respaldo para pintar los candados antes de la primera consulta. */
export const BLOQUEADO_POR_OMISION = [
    'Redacción de escritos', 'Flujos de trabajo', 'Toulmin', 'Modo consulta', 'Modo redacción',
    'Jurimetría', 'Precedentes', 'Legislación de tu estado', 'Seguimiento de expedientes',
    'Carpetas', 'Memoria de consultas', 'Editor Word', 'Descarga del PDF de la tesis',
];

function leerTestigo(): string {
    try {
        return window.localStorage.getItem(LLAVE) || '';
    } catch {
        return '';   // ventana privada, almacenamiento bloqueado: se pide uno nuevo
    }
}

function guardarTestigo(t: string): void {
    try {
        window.localStorage.setItem(LLAVE, t);
    } catch {
        /* sin almacenamiento la visita no se recuerda; funciona igual */
    }
}

/** ¿Hay una visita de prueba abierta en este navegador? */
export function hayTestigoBasico(): boolean {
    return leerTestigo().length > 0;
}

/** Abre la visita de prueba. Es lo único que hace el botón «Probar Iurexia». */
export async function abrirSesionBasica(): Promise<string> {
    const guardado = leerTestigo();
    if (guardado) return guardado;
    const res = await fetch(`${BASE}/gratis/sesion`, { method: 'POST' });
    if (!res.ok) throw new Error('No pudimos abrir la sesión de prueba.');
    const j = await res.json();
    const t = String(j?.testigo || '');
    if (!t) throw new Error('No pudimos abrir la sesión de prueba.');
    guardarTestigo(t);
    return t;
}

/** Cierra la visita: se usa al registrarse, para no arrastrar el modo básico. */
export function cerrarSesionBasica(): void {
    try {
        window.localStorage.removeItem(LLAVE);
    } catch {
        /* nada que cerrar */
    }
}

/**
 * Una consulta del carril básico.
 *
 * Con `correo` cuando es un usuario registrado que agotó sus consultas
 * normales; con el testigo cuando es una visita sin cuenta.
 */
export async function preguntarBasico(consulta: string, correo?: string): Promise<RespuestaBasica> {
    const cuerpo: Record<string, string> = { consulta: consulta.trim() };
    if (correo) {
        cuerpo.user_email = correo;
    } else {
        cuerpo.testigo = await abrirSesionBasica();
    }

    const res = await fetch(`${BASE}/precedentes/gratis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
    });

    if (!res.ok) {
        let detalle = 'No pudimos consultar el acervo.';
        try { detalle = (await res.json())?.detail ?? detalle; } catch { /* sin JSON */ }
        throw new Error(detalle);
    }
    const j = await res.json();
    return {
        texto: String(j?.texto || ''),
        fuentes: Array.isArray(j?.fuentes) ? (j.fuentes as FuenteBasica[]) : [],
        usadas: Number(j?.usadas || 0),
        tope: Number(j?.tope || 0),
        aviso: String(j?.aviso || ''),
        bloqueado: Array.isArray(j?.bloqueado) ? j.bloqueado.map(String) : BLOQUEADO_POR_OMISION,
        anonimo: Boolean(j?.anonimo),
    };
}

/**
 * La respuesta, en el markdown que la burbuja del chat ya sabe pintar.
 *
 * Las fuentes van como una lista al final con su registro y su enlace al
 * Semanario. No se usan las fichas `[Doc ID: …]` del chat de pago a
 * propósito: aquélla abre el documento completo dentro de Iurexia, y aquí el
 * documento completo es justamente lo que no se entrega.
 */
export function markdownDeBasico(r: RespuestaBasica): string {
    const usadas = r.fuentes.filter((f) => f.tipo === 'tesis' && f.registro
        && new RegExp(`\\[${f.n}\\]`).test(r.texto));
    const lista = (usadas.length ? usadas : r.fuentes.filter((f) => f.tipo === 'tesis'))
        .map((f) => {
            const meta = [f.clave, f.instancia, f.epoca].filter(Boolean).join(' · ');
            const enlace = f.semanario
                ? `[Consultar en el Semanario Judicial](${f.semanario})`
                : '';
            return `**[${f.n}] ${f.rubro}**\n`
                + `Registro digital ${f.registro}${meta ? ` — ${meta}` : ''}. ${enlace}`;
        });
    if (!lista.length) return r.texto;
    return `${r.texto}\n\n## Criterios citados\n\n${lista.join('\n\n')}\n\n`
        + `> *${r.aviso}*`;
}
