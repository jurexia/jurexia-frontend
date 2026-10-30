'use client';

import { X } from 'lucide-react';

/**
 * LA RED QUE RETIENE LAS RESPUESTAS, DICHA EN PANTALLA (28-oct-2026).
 *
 * Tras Cisco Umbrella (folio 3640-01, Tribunal Colegiado de Tlaxcala) la
 * respuesta no se ve escribirse: el filtro la retiene y la entrega entera al
 * terminar. El abogado veía la pantalla quieta un minuto y medio y creía que
 * la plataforma no le cargaba nada. Cuando lo primero llega tarde y todo de
 * golpe —o hay que traer la respuesta de la copia del servidor—, esta nota le
 * dice qué pasa y qué pedirle a su área de sistemas.
 *
 * Como `AvisoDocumentoGratis`: va bajo la última respuesta y NO se guarda en
 * la conversación.
 */
export default function AvisoRedRetiene({ onCerrar }: { onCerrar: () => void }) {
    return (
        <div className="mx-5 sm:mx-6 mt-4 rounded-xl border border-charcoal-900/10 bg-charcoal-900/[0.03] px-4 py-3.5" role="note">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="font-serif text-[15px] font-medium text-charcoal-900">
                        Su red retuvo la respuesta hasta el final.
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-charcoal-700">
                        Suele ser un filtro de seguridad o un proxy de la oficina: entrega la respuesta completa sólo
                        cuando termina, por eso no la ve escribirse. Para recibirla en vivo, pida a su área de sistemas
                        que exceptúe del filtro iurexia.com y jurexia-api.onrender.com.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar el aviso"
                    className="-mr-1 -mt-1 rounded-md p-1 text-charcoal-400 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-700"
                >
                    <X className="h-4 w-4" aria-hidden />
                </button>
            </div>
        </div>
    );
}
