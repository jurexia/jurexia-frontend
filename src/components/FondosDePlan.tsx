'use client';

/* ─── Los fondos de las dos tarjetas de arriba ────────────────────────────
   Antes cada tarjeta se anunciaba con un icono de 48 px en la esquina: un
   rayo, un escudo, una estrella, una corona. Cuatro adornos que no decían
   nada del plan y que se leían como plantilla. Se van, y en su lugar las dos
   tarjetas que hay que vender llevan el adorno donde sí se ve —el fondo
   entero—, cada una con la textura que le corresponde:

   · Pro      — una retícula de cubos isométricos sobre gris. Es geometría
                fría, ordenada, sin movimiento: la herramienta del que trabaja
                solo y necesita que el sistema no lo distraiga.
   · Platinum — trazas de circuito en oro y una red neuronal en azul, las dos
                encendiéndose. Es lo que la tarjeta cobra: la máquina completa.

   Ambos son decoración. Van con `aria-hidden` y sin eventos de puntero, y
   toda la información sigue estando en el texto que se dibuja encima. */

/* ── Pro · la retícula de cubos ───────────────────────────────────────────
   Cubos isométricos: cada uno son tres rombos (techo, cara izquierda, cara
   derecha) inscritos en un hexágono, y los hexágonos teselan el plano sin
   dejar hueco. Por eso la retícula es simétrica de verdad y no una repetición
   con costuras.

   Las medidas salen de la arista: un hexágono de circunradio `s` mide √3·s de
   ancho y 2s de alto, y la tesela se repite cada √3·s en horizontal y cada
   1.5·s en vertical con las hileras alternas corridas media anchura. */
const ARISTA = 26;
const MEDIA = (Math.sqrt(3) / 2) * ARISTA;
const PASO_X = 2 * MEDIA;
const PASO_Y = 3 * ARISTA;

/* Los siete centros que tocan la tesela. Los de fuera hacen falta: el patrón
   recorta lo que sobresale, y sin ellos los cubos del borde saldrían partidos
   por la mitad en lugar de continuar en la tesela vecina. */
const CENTROS: [number, number][] = [
    [0, 0],
    [PASO_X, 0],
    [-MEDIA, 1.5 * ARISTA],
    [MEDIA, 1.5 * ARISTA],
    [PASO_X + MEDIA, 1.5 * ARISTA],
    [0, PASO_Y],
    [PASO_X, PASO_Y],
];

/* Techo, izquierda y derecha. Las tres con el mismo blanco y distinta
   opacidad: eso es todo lo que hace falta para que el ojo lea volumen. */
function caras(cx: number, cy: number): [string, string, string] {
    const p = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
    return [
        `M${p(cx, cy - ARISTA)} L${p(cx + MEDIA, cy - ARISTA / 2)} L${p(cx, cy)} L${p(cx - MEDIA, cy - ARISTA / 2)} Z`,
        `M${p(cx - MEDIA, cy - ARISTA / 2)} L${p(cx, cy)} L${p(cx, cy + ARISTA)} L${p(cx - MEDIA, cy + ARISTA / 2)} Z`,
        `M${p(cx + MEDIA, cy - ARISTA / 2)} L${p(cx, cy)} L${p(cx, cy + ARISTA)} L${p(cx + MEDIA, cy + ARISTA / 2)} Z`,
    ];
}

export function RejillaCubos() {
    return (
        <div className="absolute inset-0 -z-10 rounded-3xl overflow-hidden pointer-events-none" aria-hidden="true">
            {/* El gris no es plano: arranca claro arriba y cae a negro abajo,
                para que el precio se lea sobre superficie y la lista larga de
                características termine sobre fondo limpio. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#3e3b39_0%,#302e2c_36%,#1c1b1a_72%,#0e0e0d_100%)]" />

            <svg className="absolute inset-0 w-full h-full" width="100%" height="100%">
                <defs>
                    <pattern
                        id="cubos-pro"
                        patternUnits="userSpaceOnUse"
                        width={PASO_X}
                        height={PASO_Y}
                    >
                        {CENTROS.map(([cx, cy], i) => {
                            const [techo, izq, der] = caras(cx, cy);
                            return (
                                <g key={i} stroke="#ffffff" strokeOpacity="0.13" strokeWidth="0.75">
                                    <path d={techo} fill="#ffffff" fillOpacity="0.105" />
                                    <path d={izq} fill="#ffffff" fillOpacity="0.045" />
                                    <path d={der} fill="#ffffff" fillOpacity="0.018" />
                                </g>
                            );
                        })}
                    </pattern>

                    {/* Los cubos se apagan hacia abajo. Blanco arriba, negro
                        abajo: la retícula existe donde hay aire y desaparece
                        antes de llegar al botón. */}
                    <linearGradient id="cubos-desvanecido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="42%" stopColor="#ffffff" stopOpacity="0.62" />
                        <stop offset="78%" stopColor="#ffffff" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </linearGradient>
                    <mask id="cubos-mascara">
                        <rect width="100%" height="100%" fill="url(#cubos-desvanecido)" />
                    </mask>
                </defs>

                <rect width="100%" height="100%" fill="url(#cubos-pro)" mask="url(#cubos-mascara)" />
            </svg>

            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,17,16,0.30)_0%,rgba(18,17,16,0.44)_26%,rgba(18,17,16,0.34)_58%,rgba(18,17,16,0)_100%)]" />
        </div>
    );
}

/* ── Platinum · circuitos y red neuronal ──────────────────────────────────
   Dos capas con dos oficios distintos y dos colores distintos, porque son dos
   cosas distintas:

   · Las trazas en oro son el circuito —recorridos ortogonales con quiebres a
     45°, como una placa de verdad— y por ellas viaja un pulso. El oro es el
     color de la marca: el circuito es Iurexia.
   · La red neuronal va en azul, tres capas de nodos conectados todos con
     todos, latiendo. Es lo que corre por encima del circuito.

   Todo se dibuja con opacidades bajas. El fondo tiene que notarse al mirarlo
   y desaparecer al leer; si compite con la lista de características, sobra. */

const TRAZAS = [
    'M22,-20 L22,116 L74,168 L74,286 L44,316 L44,470',
    'M298,-14 L298,84 L252,130 L252,252 L288,288 L288,432',
    'M-12,58 L58,58 L94,94 L206,94',
    'M332,176 L236,176 L202,210 L124,210 L124,300',
    'M18,548 L18,628 L62,672 L62,772 L108,818 L108,916',
    'M302,536 L302,616 L264,654 L264,742 L302,780 L302,916',
    'M-12,704 L46,704 L82,740 L152,740',
    'M332,372 L266,372 L230,408 L158,408 L158,466',
    'M164,904 L164,812 L204,772 L286,772',
];

/* Los contactos: el punto donde una traza termina en algo. Parpadean fuera de
   fase para que la placa parezca viva y no un letrero intermitente. */
const CONTACTOS: [number, number][] = [
    [44, 470], [288, 432], [206, 94], [124, 300],
    [108, 916], [152, 740], [158, 466], [286, 772], [22, 116],
];

/* Tres capas de neuronas, conectadas todas con todas. Las posiciones son
   fijas —nada de aleatorio— porque el servidor y el navegador tienen que
   dibujar exactamente lo mismo. */
const CAPAS: { x: number; ys: number[] }[] = [
    { x: 48, ys: [516, 606, 696] },
    { x: 162, ys: [484, 574, 664, 754] },
    { x: 276, ys: [516, 606, 696] },
];

const SINAPSIS: { d: string; i: number }[] = [];
for (let c = 0; c < CAPAS.length - 1; c++) {
    const izq = CAPAS[c];
    const der = CAPAS[c + 1];
    izq.ys.forEach((y1) => {
        der.ys.forEach((y2) => {
            const mx = (izq.x + der.x) / 2;
            // Una curva suave en vez de una recta: la red se lee orgánica
            // frente a la ortogonalidad del circuito que tiene debajo.
            SINAPSIS.push({
                d: `M${izq.x},${y1} Q${mx},${(y1 + y2) / 2} ${der.x},${y2}`,
                i: SINAPSIS.length,
            });
        });
    });
}

const NEURONAS = CAPAS.flatMap((capa, c) =>
    capa.ys.map((y, f) => ({ x: capa.x, y, orden: c * 4 + f }))
);

export function CircuitoNeuronal() {
    return (
        <div className="absolute inset-0 -z-10 rounded-3xl overflow-hidden pointer-events-none" aria-hidden="true">
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 320 920"
                preserveAspectRatio="xMidYMid slice"
            >
                {/* ── Circuito en oro ── */}
                <g fill="none" stroke="#c9a962" strokeLinecap="square" strokeLinejoin="miter">
                    {TRAZAS.map((d, i) => (
                        <path key={`base-${i}`} d={d} strokeWidth="1" strokeOpacity="0.16" />
                    ))}
                    {/* El pulso es la misma traza otra vez, en un tramo corto y
                        brillante que la recorre. Duplicar el trazado sale más
                        barato que animar un punto por una curva. */}
                    {TRAZAS.map((d, i) => (
                        <path
                            key={`pulso-${i}`}
                            d={d}
                            pathLength={100}
                            strokeWidth="1.6"
                            strokeOpacity="0.9"
                            className="traza-pulso"
                            style={{
                                animationDuration: `${5.5 + (i % 4) * 1.4}s`,
                                animationDelay: `${(i * 0.83) % 5}s`,
                            }}
                        />
                    ))}
                </g>

                <g fill="#c9a962">
                    {CONTACTOS.map(([x, y], i) => (
                        <rect
                            key={i}
                            x={x - 2.6}
                            y={y - 2.6}
                            width="5.2"
                            height="5.2"
                            className="contacto-oro"
                            style={{ animationDelay: `${(i * 0.71) % 4}s` }}
                        />
                    ))}
                </g>

                {/* ── Red neuronal en azul ── */}
                <g fill="none" stroke="#5eb0ef" strokeWidth="0.8">
                    {SINAPSIS.map(({ d, i }) => (
                        <path
                            key={i}
                            d={d}
                            className="sinapsis"
                            style={{
                                animationDuration: `${4.2 + (i % 5) * 0.9}s`,
                                animationDelay: `${(i * 0.29) % 4.5}s`,
                            }}
                        />
                    ))}
                </g>

                {NEURONAS.map(({ x, y, orden }) => (
                    <g
                        key={`${x}-${y}`}
                        className="neurona"
                        style={{ animationDelay: `${(orden * 0.37) % 3.2}s` }}
                    >
                        {/* El halo hace de resplandor. Un círculo grande y casi
                            transparente cuesta mucho menos que un filtro de
                            desenfoque animado en cada nodo. */}
                        <circle cx={x} cy={y} r="9" fill="#5eb0ef" fillOpacity="0.07" />
                        <circle cx={x} cy={y} r="2.8" fill="#8fcbff" fillOpacity="0.55" />
                    </g>
                ))}
            </svg>

            {/* El velo. Sin él la lista de características se lee sobre el
                dibujo; con él el fondo queda donde tiene que quedar. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(26,26,26,0.15)_0%,rgba(26,26,26,0.62)_46%,rgba(26,26,26,0.58)_74%,rgba(26,26,26,0.25)_100%)]" />
        </div>
    );
}
