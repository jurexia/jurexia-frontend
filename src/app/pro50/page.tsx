/**
 * /pro50 era el aterrizaje de «Pro al 50 % el primer mes», que venció el
 * 17-oct-2026 y siguió en línea enseñando una oferta que Stripe ya no
 * aceptaba. Ahora sólo reenvía: al Buen Fin mientras dure, y a /precios
 * después. Se conserva la ruta porque hay correos viejos que la enlazan.
 */
import { redirect } from 'next/navigation';
import { buenFinVigente } from '@/lib/buen-fin';

export const dynamic = 'force-dynamic';

export default function Pro50Page() {
    redirect(buenFinVigente() ? '/buen-fin' : '/precios');
}
