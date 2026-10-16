'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FolderInput, Loader2 } from 'lucide-react';
import type { CarpetaDelEscrito } from '@/lib/documento/carpeta-del-escrito';
import { useAuth } from '@/lib/useAuth';
import { nombreDeArchivo } from '@/lib/plantillas/campos';
import { textoDeWord } from '@/lib/plantillas/cliente';
import { guardarWordEnCarpeta, motivoAlGuardar, nombreDeGaveta } from '@/lib/plantillas/en-carpeta';

/**
 * «A LA CARPETA»: guarda el escrito de la hoja como documento del expediente
 * (16-oct-2026). Sólo aparece cuando el escrito se abrió desde una carpeta.
 *
 * Es el MISMO Word que baja el botón azul (`obtenerDocx`, que ya avisa si la
 * hoja está vacía o tiene cambios propuestos sin resolver). Cae en la gaveta
 * de escritos de la carpeta —«Demandas y promociones» en un litigio— con su
 * texto como extracto: cuenta de inmediato para el análisis y no se vuelve a
 * leer ni a cobrar. La cuota de almacenamiento del plan la revisa
 * `subirDocumento` antes de subir.
 */
export interface GuardarEnCarpetaProps {
    obtenerDocx: () => Promise<Blob | null>;
    titulo: string;
    carpeta?: CarpetaDelEscrito | null;
    avisar: (texto: string) => void;
}

export function GuardarEnCarpeta({ obtenerDocx, titulo, carpeta, avisar }: GuardarEnCarpetaProps) {
    const { profile } = useAuth();
    const [estado, setEstado] = useState<'libre' | 'guardando' | 'guardado'>('libre');
    const reloj = useRef<number | null>(null);
    useEffect(() => () => { if (reloj.current) window.clearTimeout(reloj.current); }, []);

    if (!carpeta) return null;
    const destino = carpeta;

    async function guardar() {
        if (estado === 'guardando') return;
        const blob = await obtenerDocx();
        if (!blob) return; // obtenerDocx ya dijo por qué
        setEstado('guardando');
        try {
            const nombre = nombreDeArchivo(titulo || 'Escrito');
            const texto = await textoDeWord(blob);
            const { gaveta } = await guardarWordEnCarpeta({
                expedienteId: destino.id, blob, nombre, plan: profile?.subscription_type, texto,
            });
            setEstado('guardado');
            avisar(`Guardado en «${nombreDeGaveta(gaveta)}» de ${destino.titulo}.`);
            if (reloj.current) window.clearTimeout(reloj.current);
            reloj.current = window.setTimeout(() => setEstado('libre'), 2600);
        } catch (e) {
            setEstado('libre');
            avisar(motivoAlGuardar(e));
        }
    }

    return (
        <button
            type="button"
            onClick={() => void guardar()}
            disabled={estado === 'guardando'}
            title={`Guardar este escrito en la carpeta «${destino.titulo}»`}
            aria-label="Guardar en la carpeta"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal-900/15 bg-white px-2.5 text-[12.5px] font-semibold text-charcoal-900 transition-colors hover:border-charcoal-900/35 disabled:opacity-60"
        >
            {estado === 'guardando'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : estado === 'guardado'
                    ? <Check className="h-4 w-4 text-emerald-700" />
                    : <FolderInput className="h-4 w-4" />}
            <span className="hidden sm:inline">{estado === 'guardado' ? 'En la carpeta' : 'A la carpeta'}</span>
        </button>
    );
}
