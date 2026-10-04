import type { Metadata } from 'next';
import { FileSearch, MapPin, ShieldQuestion } from 'lucide-react';
import PlantillaModulo from '@/components/web/PlantillaModulo';
import { Antetitulo, Seccion, Titulo } from '@/components/web/sistema';

const TITULO = 'Consulta jurídica con fuentes verificadas | Iurexia';
const DESCRIPCION =
    'Pregunta como a un colega: Iurexia responde con la legislación federal y de las 32 entidades, la jurisprudencia y los precedentes, y cada cita abre su documento oficial.';

export const metadata: Metadata = {
    title: TITULO,
    description: DESCRIPCION,
    alternates: { canonical: '/plataforma/consulta' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og/consulta.jpg', width: 1200, height: 630, alt: 'Iurexia' }], title: TITULO, description: DESCRIPCION, url: '/plataforma/consulta' },
    twitter: { card: 'summary_large_image', images: ['/og/consulta.jpg'] },
};

/* Preguntas reales de la cuenta demo: las mismas que se ven en las capturas. */
const PREGUNTAS = [
    { materia: 'Laboral', texto: '¿Qué jurisprudencia aplica cuando el patrón ofrece el trabajo con un salario menor al que percibía el trabajador?' },
    { materia: 'Constitucional', texto: '¿Es posible, desde el control de convencionalidad, inaplicar la prisión preventiva oficiosa del artículo 19 constitucional?' },
    { materia: 'Amparo', texto: '¿Qué plazo tengo para promover amparo indirecto contra la negativa de pensión del IMSS?' },
    { materia: 'Probatorio', texto: '¿Qué dice la Suprema Corte sobre el principio lógico y ontológico de la prueba y la carga de probar?' },
];

export default function ConsultaPage() {
    return (
        <PlantillaModulo
            ruta="/plataforma/consulta"
            nombre="Consulta"
            titulo="Cada respuesta, con su fuente"
            heroArte="/web/arte/biblioteca.webp"
            entrada="Pregunta como se lo plantearías a un colega. Iurexia fija la jurisdicción, recorre la legislación federal y de las 32 entidades, la jurisprudencia y los precedentes, y responde con cada cita verificada contra su documento oficial."
            visual={{
                tipo: 'imagen',
                src: '/web/producto/consulta.webp',
                ancho: 2000,
                alto: 1250,
                barra: 'iurexia.com/chat',
                alt: 'Una consulta resuelta en Iurexia: 2,158 palabras, 12 citas y las 12 verificadas, agrupadas por fuente oficial, con 8 tesis confirmadas en el Semanario.',
            }}
            beneficios={[
                { Icono: MapPin, titulo: 'Tu jurisdicción, nunca otra', texto: 'Si trabajas en Jalisco, ves la legislación de Jalisco y la federal; nunca artículos de otro código.' },
                { Icono: FileSearch, titulo: 'Cada cita abre su documento', texto: 'El artículo, la tesis o la sentencia se abren en su documento oficial, en la página exacta y con el texto resaltado.' },
                { Icono: ShieldQuestion, titulo: 'Si no está, lo dice', texto: 'Si la fuente no está en el acervo, Iurexia lo indica y te pide el dato en vez de inventarlo.' },
            ]}
            filas={[
                {
                    id: 'fuentes',
                    antetitulo: 'Comprobar la fuente',
                    titulo: 'La cita, junto a su documento oficial',
                    texto: 'Pulsa cualquier cita y se abre el documento oficial —la Constitución, la ley, la tesis del Semanario— en la página exacta y con el texto resaltado, sin salir de la consulta. Lo descargas, lo imprimes o lo abres aparte.',
                    visual: {
                        tipo: 'imagen',
                        src: '/web/producto/fuente-oficial.webp',
                        ancho: 900,
                        alto: 1406,
                        alt: 'El visor de la fuente: el artículo 19 de la Constitución resaltado en la página 23 de 414 del PDF oficial, con los botones para descargar, imprimir o abrir en otra pestaña.',
                    },
                    lamina: { tono: 'piedra', arte: '/web/arte/manuscrito.webp' },
                },
                {
                    id: 'busqueda-hibrida',
                    antetitulo: 'Búsqueda',
                    titulo: 'Busca por concepto y por palabra exacta',
                    texto: 'Iurexia entiende lo que preguntas, no sólo las palabras: busca por concepto y por término jurídico exacto, pone primero lo más pertinente y separa la legislación de cada estado de la federal.',
                    puntos: [
                        '32 entidades más la legislación federal, cada una aislada de las demás',
                        'Jurisprudencia y tesis del Semanario Judicial de la Federación',
                        'Bloque de constitucionalidad: tratados y criterios de la Corte Interamericana',
                    ],
                    visual: { tipo: 'video', src: '/demo/consulta.mp4', poster: '/demo/consulta-poster.jpg' },
                    lamina: { tono: 'tinta', arte: '/web/arte/columnata.webp' },
                },
                {
                    id: 'precedentes',
                    antetitulo: 'Pro y Platinum',
                    titulo: 'Precedentes de los tribunales colegiados',
                    texto: 'Más de 111,000 sentencias de Tribunales Colegiados, buscables por materia, acto reclamado, tribunal y sentido del fallo, con el PDF de cada una. En Platinum, la jurimetría compara el acto reclamado y los conceptos de violación con esos precedentes y estima el sentido probable, argumento por argumento.',
                    visual: {
                        tipo: 'libre',
                        contenido: (
                            <div className="rounded-xl bg-white/80 p-8 text-center ring-1 ring-black/5 backdrop-blur-sm sm:p-12">
                                <p className="font-serif text-[3.5rem] font-normal leading-none tracking-[-0.02em] text-tinta sm:text-[4.5rem]">111,000+</p>
                                <p className="mx-auto mt-4 max-w-xs text-[15px] leading-relaxed text-piedra-600">sentencias de Tribunales Colegiados, con su PDF, en el corpus de precedentes</p>
                            </div>
                        ),
                    },
                    lamina: { tono: 'piedra', arte: '/web/arte/fachada.webp' },
                },
            ]}
        >
            {/* Preguntas que se resuelven en Iurexia */}
            <Seccion tono="tinta" espacio="amplio">
                <Antetitulo oscuro className="mb-4">Cómo se pregunta</Antetitulo>
                <Titulo oscuro escala="bloque" className="max-w-2xl">Preguntas como éstas, con su fundamento</Titulo>
                <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-white/10 md:grid-cols-2">
                    {PREGUNTAS.map((p) => (
                        <div key={p.texto} className="bg-tinta p-7 sm:p-8">
                            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/45">{p.materia}</p>
                            <p className="mt-3 font-serif text-[1.35rem] font-normal leading-snug text-cream-100">«{p.texto}»</p>
                        </div>
                    ))}
                </div>
            </Seccion>
        </PlantillaModulo>
    );
}
