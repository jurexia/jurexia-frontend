/* ═══ «NOW POWERED BY OPENAI» (3-oct-2026) ═══
   David: «que en todo Iurexia debajo diga Now powered by OpenAI desde el login
   hasta la plataforma misma o el taller». Va bajo la marca, en pequeño, en las
   barras de la web y de la plataforma, en el pie, en las pantallas de acceso y
   en el taller.

   Es verdad y por eso se puede decir: la consulta del chat, la redacción Pro y
   Platinum, el análisis de documentos, los precedentes, el auditor y la
   búsqueda en el acervo corren con modelos de OpenAI (jurexia-api, motores.py).
   NO se pone en Sálvame, que corre con otro proveedor: ahí sería falso.

   Sin el logotipo de OpenAI, sólo el texto: el nombre describe un hecho. El
   anuncio largo —qué cambia y cómo se cuida la privacidad— está en la
   portada (AnuncioOpenAI). La marca «Iurexia» no cambia: Playfair 600, como
   siempre. */

export const LEMA_OPENAI = 'Now powered by OpenAI';

export default function LemaOpenAI({
    sobreOscuro = false,
    tamano = 'text-[10px]',
    className = '',
}: {
    /** Sobre fondo oscuro (la barra del chat, el taller, el vídeo de portada). */
    sobreOscuro?: boolean;
    /** La clase del tamaño de letra. Va aparte para que no compita con la de
        por omisión: dos `text-[…]` en la misma etiqueta no se sabe cuál gana. */
    tamano?: string;
    className?: string;
}) {
    return (
        <span
            className={`block whitespace-nowrap font-sans font-medium leading-none tracking-[0.03em] ${tamano} ${
                sobreOscuro ? 'text-white/55' : 'text-accent-brown'
            } ${className}`}
        >
            Now powered by <span className={`font-semibold ${sobreOscuro ? 'text-white/80' : 'text-charcoal-900/80'}`}>OpenAI</span>
        </span>
    );
}
