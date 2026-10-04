import type { Metadata } from 'next';
import { BellRing, FolderOpen, ListChecks } from 'lucide-react';
import PlantillaModulo from '@/components/web/PlantillaModulo';

const TITULO = 'Carpetas inteligentes y seguimiento de expedientes | Iurexia';
const DESCRIPCION =
    'Cada asunto en su carpeta: Iurexia lee los documentos, te dice qué falta, responde con todo el expediente a la vista y revisa tus expedientes ante el Poder Judicial de la Federación.';

export const metadata: Metadata = {
    title: TITULO,
    description: DESCRIPCION,
    alternates: { canonical: '/plataforma/carpetas' },
    openGraph: { siteName: 'Iurexia', locale: 'es_MX', type: 'website', images: [{ url: '/og/carpetas.jpg', width: 1200, height: 630, alt: 'Iurexia' }], title: TITULO, description: DESCRIPCION, url: '/plataforma/carpetas' },
    twitter: { card: 'summary_large_image', images: ['/og/carpetas.jpg'] },
};

export default function CarpetasPage() {
    return (
        <PlantillaModulo
            ruta="/plataforma/carpetas"
            nombre="Carpetas y seguimiento"
            titulo="Cada asunto en su carpeta"
            heroArte="/web/arte/escalinata.webp"
            heroTono="piedra"
            entrada="Sube los documentos del asunto y fija el objetivo. Iurexia los lee, te dice qué falta, responde con todo el expediente a la vista y revisa tus expedientes ante el Poder Judicial de la Federación."
            visual={{
                tipo: 'imagen',
                src: '/web/producto/carpetas.webp',
                ancho: 2000,
                alto: 1250,
                barra: 'iurexia.com/carpetas',
                alt: 'Mis carpetas inteligentes: tres asuntos de amparo, cada uno con sus documentos y su porcentaje de avance.',
            }}
            beneficios={[
                { Icono: FolderOpen, titulo: 'Por cliente, juicio o proyecto', texto: 'Cada carpeta guarda sus documentos, su objetivo y las consultas que se hicieron dentro de ella.' },
                { Icono: ListChecks, titulo: 'Lo que ve Iurexia', texto: 'Al leer la carpeta, Iurexia dice cuánto avanza el asunto y qué documentos o datos le faltan.' },
                { Icono: BellRing, titulo: 'Expedientes vigilados', texto: 'Iurexia revisa los portales oficiales cada día hábil y deja a la vista lo nuevo de cada expediente.' },
            ]}
            filas={[
                {
                    id: 'lo-que-ve-iurexia',
                    antetitulo: 'Lectura de la carpeta',
                    titulo: 'Iurexia te dice qué falta',
                    texto: 'Con el objetivo del asunto y los documentos que subiste, Iurexia mide el avance y enumera lo que todavía no está: la constancia de notificación, la copia certificada, el dictamen pericial. Cada pendiente, con la razón por la que importa.',
                    visual: {
                        tipo: 'imagen',
                        src: '/web/producto/carpeta.webp',
                        ancho: 2000,
                        alto: 1250,
                        barra: 'iurexia.com/carpetas',
                        alt: 'El detalle de una carpeta de amparo directo: el objetivo, el 60% de avance y la lista de lo que falta, cada pendiente con su explicación.',
                    },
                    lamina: { tono: 'piedra', arte: '/web/arte/cupula.webp' },
                },
                {
                    id: 'consultas-con-expediente',
                    antetitulo: 'Del expediente al escrito',
                    titulo: 'Consultas y escritos que ya conocen el asunto',
                    texto: 'Desde la carpeta haces una consulta o inicias un flujo de trabajo, y Iurexia responde con los documentos del asunto a la vista. Lo que redacta vuelve a la carpeta con sus citas.',
                    visual: { tipo: 'video', src: '/demo/carpeta.mp4', poster: '/demo/carpeta-poster.jpg' },
                    lamina: { tono: 'tinta', arte: '/web/arte/grabado.webp' },
                },
                {
                    id: 'seguimiento',
                    antetitulo: 'Seguimiento',
                    titulo: 'Tus expedientes, revisados cada día hábil',
                    texto: 'Agrega el expediente y el órgano jurisdiccional. Iurexia consulta los portales oficiales cada día laborable a las 9:10, hora de la Ciudad de México, y deja a la vista lo nuevo. La información es de carácter informativo y no sustituye la consulta del expediente.',
                    visual: { tipo: 'video', src: '/demo/seguimiento.mp4', poster: '/demo/seguimiento-poster.jpg' },
                    lamina: { tono: 'piedra', arte: '/web/arte/fachada.webp' },
                },
            ]}
        />
    );
}
