'use client';
import { useRef } from 'react';
import { useRevelado } from '@/lib/documento/revelado';

/**
 * El texto que está llegando, escrito párrafo a párrafo. Cada bloque nuevo
 * entra con su desvanecido; los anteriores no se vuelven a tocar.
 */
export function TextoRevelado({ html, className }: { html: string; className?: string }) {
    const nodo = useRef<HTMLDivElement | null>(null);
    useRevelado(nodo, html, true);
    return <div ref={nodo} className={className} />;
}
