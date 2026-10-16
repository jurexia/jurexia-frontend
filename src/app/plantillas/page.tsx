'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import MisPlantillas from '@/components/plantillas/MisPlantillas'

/**
 * Mis plantillas: los formatos de Word del despacho, con sus campos, para
 * llenarlos con los datos de una carpeta (16-oct-2026). La página es el
 * componente entero: así la prueba en el montaje real lo monta tal cual.
 */
export default function PlantillasPage() {
    return (
        <ProtectedRoute>
            <MisPlantillas />
        </ProtectedRoute>
    )
}
