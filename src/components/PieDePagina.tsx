import Link from 'next/link';
import LemaOpenAI from '@/components/LemaOpenAI';

/* ═══ EL PIE, UNO SOLO PARA TODO EL SITIO (3-oct-2026) ═══
   Era el pie de la portada —el catálogo entero por columnas— y cada página
   pública llevaba además su propia versión corta, con enlaces distintos y sin
   redes. Ahora es uno: lo que se añade aquí (el canal de YouTube, «Estudiar y
   pensar») aparece en todas a la vez.

   Sólo enlaza a rutas que existen. Y dentro de la plataforma no se pinta
   (clase `solo-publico`): quien trabaja con la barra de trabajo no necesita el
   catálogo de la web al pie de su carpeta. */

export const REDES = {
    youtube: 'https://www.youtube.com/@iurexia',
    instagram: 'https://www.instagram.com/iurex.ia',
    facebook: 'https://www.facebook.com/profile.php?id=61588222127518',
} as const;

const COLUMNAS: { titulo: string; enlaces: [string, string][] }[] = [
    {
        titulo: 'Plataforma',
        enlaces: [
            ['Visión general', '/plataforma'],
            ['Consulta jurídica', '/plataforma/consulta'],
            ['Redacción y flujos', '/plataforma/redaccion'],
            ['Carpetas y seguimiento', '/plataforma/carpetas'],
            ['Jurimetría y precedentes', '/plataforma/consulta#precedentes'],
            ['Agente de amparo', '/agente'],
            ['Taller de sentencias', '/tcc-beta'],
            ['Normativa', '/normativa'],
        ],
    },
    {
        titulo: 'Para quién',
        enlaces: [
            ['Soluciones', '/soluciones'],
            ['Abogados litigantes', '/soluciones/litigantes'],
            ['Despachos', '/soluciones/despachos'],
            ['Secretarios del PJF', '/secretarios'],
            ['Directorio Connect', '/connect'],
            ['Vitrina de despachos', '/vitrina'],
            ['Sálvame', '/salvame'],
            ['Planes y precios', '/precios'],
        ],
    },
    {
        titulo: 'Aprender',
        enlaces: [
            ['Recursos', '/recursos'],
            ['Estudiar y pensar', '/estudiar'],
            ['Canal de YouTube', REDES.youtube],
            ['Lo último', '/ultimo'],
            ['Cómo usar el chat', '/tutorial'],
        ],
    },
    {
        titulo: 'Iurexia',
        enlaces: [
            ['Conócenos', '/conocenos'],
            ['Seguridad', '/seguridad'],
            ['Aviso de privacidad', '/privacidad'],
            ['Términos y condiciones', '/terminos'],
            ['Crear cuenta', '/registro'],
            ['Iniciar sesión', '/login'],
            ['soporte@iurexia.com', 'mailto:soporte@iurexia.com'],
        ],
    },
];

const BOTON_RED =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-charcoal-700 transition-colors hover:border-charcoal-900 hover:text-charcoal-900';

export default function PieDePagina({ className = '' }: { className?: string }) {
    return (
        <footer className={`solo-publico border-t border-black/5 bg-cream-300 pt-16 pb-10 ${className}`}>
            <div className="mx-auto max-w-6xl px-4">
                <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.35fr_repeat(4,1fr)]">
                    <div className="max-w-xs sm:col-span-2 md:col-span-1">
                        <span className="font-marca text-2xl font-semibold tracking-wide text-charcoal-900">
                            Iurex<span className="text-accent-gold">ia</span>
                        </span>
                        <LemaOpenAI tamano="text-[11px]" className="mt-2" />
                        <p className="mt-4 text-[13.5px] leading-relaxed text-charcoal-900/70">
                            Inteligencia artificial jurídica para México. Legislación federal y de
                            las 32 entidades, jurisprudencia del Semanario y cada cita verificada
                            contra su fuente.
                        </p>
                        <div className="mt-5 flex items-center gap-2.5">
                            <a href={REDES.facebook} target="_blank" rel="noopener noreferrer" aria-label="Iurexia en Facebook" className={BOTON_RED}>
                                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                                    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
                                </svg>
                            </a>
                            <a href={REDES.instagram} target="_blank" rel="noopener noreferrer" aria-label="Iurexia en Instagram" className={BOTON_RED}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                    <rect x="3" y="3" width="18" height="18" rx="5" />
                                    <circle cx="12" cy="12" r="3.6" />
                                    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
                                </svg>
                            </a>
                            <a href={REDES.youtube} target="_blank" rel="noopener noreferrer" aria-label="Iurexia en YouTube" className={BOTON_RED}>
                                <IconoYouTube className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {COLUMNAS.map((c) => (
                        <div key={c.titulo}>
                            <h3 className="font-sans text-[12px] font-medium uppercase tracking-[0.16em] text-piedra-600">
                                {c.titulo}
                            </h3>
                            <ul className="mt-4 space-y-2.5">
                                {c.enlaces.map(([texto, href]) => (
                                    <li key={href + texto}>
                                        {href.startsWith('/') ? (
                                            <Link href={href} className="text-[13.5px] text-charcoal-700 transition-colors hover:text-charcoal-900">
                                                {texto}
                                            </Link>
                                        ) : (
                                            <a
                                                href={href}
                                                {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                                className="text-[13.5px] text-charcoal-700 transition-colors hover:text-charcoal-900"
                                            >
                                                {texto}
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col gap-3 border-t border-black/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12.5px] text-charcoal-900/60">
                        © 2026 Iurexia. Todos los derechos reservados.
                    </p>
                    <p className="max-w-xl text-[12px] leading-relaxed text-charcoal-900/60">
                        Iurexia orienta y fortalece el análisis jurídico. No sustituye la asesoría
                        de un profesional del derecho ni constituye asesoría legal.
                    </p>
                </div>
            </div>
        </footer>
    );
}

/* El de YouTube, dibujado a trazo como el de Instagram: un rectángulo
   redondeado y el triángulo de reproducir. */
export function IconoYouTube({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
            <rect x="2.5" y="5.25" width="19" height="13.5" rx="4" />
            <path d="M10.25 9.35v5.3l4.6-2.65-4.6-2.65Z" fill="currentColor" stroke="none" />
        </svg>
    );
}
