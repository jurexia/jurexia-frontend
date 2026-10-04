import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText, Gauge, ScrollText } from 'lucide-react';
import PlantillaModulo from '@/components/web/PlantillaModulo';
import { Antetitulo, Seccion, Titulo } from '@/components/web/sistema';

const TITULO = 'Redacción de escritos y flujos de trabajo | Iurexia';
const DESCRIPCION =
    'Demandas, contestaciones y recursos completos, fundamentados con artículos y tesis verificados, con el esfuerzo de redacción que elijas y listos para llevar a Word.';

export const metadata: Metadata = {
    title: TITULO,
    description: DESCRIPCION,
    alternates: { canonical: '/plataforma/redaccion' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og/redaccion.jpg', width: 1200, height: 630, alt: 'Iurexia' }], title: TITULO, description: DESCRIPCION, url: '/plataforma/redaccion' },
    twitter: { card: 'summary_large_image', images: ['/og/redaccion.jpg'] },
};

/* Los siete flujos que arrancan en el chat (25-sep-2026). */
const FLUJOS = [
    ['Amparo', 'Demanda de amparo indirecto', 'Del acto de autoridad a la demanda completa: datos del artículo 108, antecedentes, conceptos de violación y suspensión. En cuatro partes.'],
    ['Amparo', 'Demanda de amparo directo', 'La demanda de amparo directo, en tres partes.'],
    ['Litigio', 'Contestación de demanda', 'El escrito de contestación de demanda, en cuatro partes.'],
    ['Litigio', 'Apelación: escrito de agravios', 'El escrito de expresión de agravios, en dos partes.'],
    ['Contratos', 'Revisión de contrato', 'El dictamen de revisión con las cláusulas propuestas.'],
    ['Penal', 'Teoría del caso', 'La teoría del caso para el sistema penal acusatorio.'],
    ['Investigación', 'Investigación jurídica y dictamen', 'El dictamen jurídico, con sus fuentes.'],
];

export default function RedaccionPage() {
    return (
        <PlantillaModulo
            ruta="/plataforma/redaccion"
            nombre="Redacción"
            titulo="Del encargo al escrito terminado"
            heroArte="/web/arte/grabado.webp"
            entrada="Pide la demanda, la contestación o el recurso, elige con qué esfuerzo se redacta y recibe un escrito completo, fundamentado con artículos y tesis verificados contra el acervo, editable y listo para llevar a Word."
            visual={{ tipo: 'video', src: '/demo/redaccion.mp4', poster: '/demo/redaccion-poster.jpg' }}
            beneficios={[
                { Icono: Gauge, titulo: 'El esfuerzo lo eliges tú', texto: 'Básico, Pro o Platinum: cuánto razona Iurexia antes de escribir, según lo que pida el asunto.' },
                { Icono: ScrollText, titulo: 'Fundamento verificado', texto: 'Cada artículo y cada tesis del escrito se cotejan contra el acervo antes de llegar a ti.' },
                { Icono: FileText, titulo: 'Tuyo para editar', texto: 'El escrito se abre en una hoja editable y se descarga en Word para darle tu forma final.' },
            ]}
            filas={[
                {
                    id: 'esfuerzo',
                    antetitulo: 'Básico · Pro · Platinum',
                    titulo: 'Tú decides cuánto razona Iurexia',
                    texto: 'Al pedir un escrito eliges con qué motor se redacta, en el selector que está junto a «Fuentes». Las demás consultas no cambian: el esfuerzo sólo se aplica cuando pides un escrito.',
                    puntos: [
                        'Básico: escrito completo, ágil y bien estructurado, en todos los planes',
                        'Pro: razona a fondo cada argumento antes de escribir',
                        'Platinum: el motor más potente, con escritos más extensos y argumentos en capas',
                    ],
                    visual: {
                        tipo: 'imagen',
                        src: '/web/producto/esfuerzo.webp',
                        ancho: 1400,
                        alto: 700,
                        alt: 'El selector «Esfuerzo de redacción» abierto en la caja del chat: Básico, Pro y Platinum, con Platinum marcado.',
                    },
                    lamina: { tono: 'piedra', arte: '/web/arte/escritorio.webp' },
                },
                {
                    id: 'flujos',
                    antetitulo: 'Pro y Platinum',
                    titulo: 'Flujos de trabajo: el escrito, parte por parte',
                    texto: 'Iurexia construye contigo el escrito por partes. En cada una propone lo que deduce de tu encargo y de tu carpeta —ya marcado, para que sólo confirmes—, te pide lo que falta y, si hace falta un documento, te lo pide en vez de suponerlo.',
                    puntos: ['Cada dato propuesto y marcado: tú sólo confirmas', 'Pide el documento que falta en vez de inventar el dato', '30 flujos al mes en Pro y 60 en Platinum, sin gastar consultas'],
                    visual: {
                        tipo: 'imagen',
                        src: '/web/producto/flujos.webp',
                        ancho: 1800,
                        alto: 1385,
                        alt: 'Los flujos de trabajo: la demanda de amparo indirecto en cuatro partes, cada una con los datos que necesita.',
                    },
                    lamina: { tono: 'tinta', arte: '/web/arte/biblioteca.webp' },
                },
            ]}
        >
            {/* Los siete flujos */}
            <Seccion tono="tinta" espacio="amplio" arte="/web/arte/tintero.webp">
                <Antetitulo oscuro className="mb-4">Siete flujos</Antetitulo>
                <Titulo oscuro escala="bloque" className="max-w-2xl">Los escritos de siempre, guiados paso a paso</Titulo>
                <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
                    {FLUJOS.map(([materia, nombre, texto]) => (
                        <div key={nombre} className="bg-tinta p-7">
                            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/45">{materia}</p>
                            <p className="mt-3 font-serif text-[1.35rem] font-normal leading-snug text-cream-100">{nombre}</p>
                            <p className="mt-2 text-[14px] leading-relaxed text-white/55">{texto}</p>
                        </div>
                    ))}
                    {/* La octava casilla cierra la rejilla con lo que hay que saber para usarlos. */}
                    <Link href="/precios" className="group flex flex-col justify-between bg-[#1c1b19] p-7 transition-colors hover:bg-[#23221f]">
                        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent-gold/80">Pro y Platinum</p>
                        <p className="mt-3 font-serif text-[1.35rem] font-normal leading-snug text-cream-100">30 flujos al mes en Pro y 60 en Platinum</p>
                        <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-cream-100 group-hover:underline group-hover:underline-offset-4">
                            Ver planes <ArrowRight className="h-4 w-4" aria-hidden />
                        </span>
                    </Link>
                </div>
            </Seccion>
        </PlantillaModulo>
    );
}
