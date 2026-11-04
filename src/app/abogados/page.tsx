import type { Metadata } from 'next';
import Portada from '@/components/web/Portada';

/* ═══ LA PORTADA PARA EL TRÁFICO DE ANUNCIOS (4-nov-2026) ═══
   La misma portada, sin nombrar a OpenAI (Meta rechazó L3 por «imitar sitios
   conocidos»). Se llega de dos maneras:
   · src/middleware.ts reescribe aquí `/` cuando trae UTM de anuncio, sin
     cambiar la URL que ve el visitante;
   · o directamente en /abogados, si se prefiere ponerla como destino.

   Estática, como la portada: el rastreador de Meta recibe el HTML ya sin
   OpenAI. No se indexa porque duplica `/`. */

export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

export default function PortadaAnuncios() {
    return <Portada anuncio />;
}
