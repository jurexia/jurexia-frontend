import { redirect } from 'next/navigation';

/**
 * /leyesestatales está reemplazada por /normativa.
 * Este redirect asegura compatibilidad con links existentes.
 */
export default function LeyesEstatalesRedirect() {
    redirect('/normativa');
}
