/* ═══ LA GALAXIA DE «NOW POWERED BY OPENAI» (4-oct-2026) ═══
   David: «cuando pase el puntero o el dedo en powered by OpenAI, que aparezca
   un efecto de galaxia o estrellas en remolino: que aparezcan como un big bang,
   efecto potente visual, y luego las estrellas en movimiento distorsionando el
   OpenAI».

   Tres tiempos, en un lienzo detrás del texto:
   1. El estallido: un destello en la palabra, una onda de choque que abre el
      espacio (la franja se vuelve noche desde «OpenAI» hacia fuera) y cientos
      de estrellas que salen disparadas con su estela.
   2. El remolino: frenan, se curvan y quedan girando en una galaxia de dos
      brazos vista de canto, más rápido cerca del centro, como las de verdad.
   3. La lente: la palabra «OpenAI» actúa como una masa que curva la luz. Las
      estrellas que pasan por detrás se abren y se apiñan en un anillo a su
      alrededor —el anillo de Einstein—, y ninguna cruza las letras.

   Lo que NO se hace, por las pautas de marca de OpenAI (memoria
   reference_marca_openai): deformar las letras de su nombre o su símbolo, o
   poner efectos encima de ellos. Lo que se distorsiona es la luz de las
   estrellas, no la palabra. Y la caja del símbolo (con su margen de respeto)
   no recibe ni estrellas ni destellos: sólo el fondo liso de la noche, sobre
   el que va su versión blanca oficial. */

export type Punto = { x: number; y: number };
export type Caja = { x: number; y: number; w: number; h: number };

/** Dónde están, en coordenadas del lienzo, el centro de la galaxia, la palabra que hace de lente y la caja que no se pinta. */
export type Anclas = { nucleo: Punto; lente: Caja; reserva: Caja | null };

export type Galaxia = {
    /** Enciende el estallido. `alFrente` recibe en cada cuadro el radio del espacio abierto (0 al terminar de apagarse). */
    encender(anclas: () => Anclas, alFrente?: (radio: number) => void): void;
    apagar(): void;
    activa(): boolean;
    destruir(): void;
};

const TAU = Math.PI * 2;
const BRAZOS = 2;
const CANTO = 0.42; // la galaxia vista de canto: el disco aplastado en vertical
const GIRO = -0.2; // inclinación del disco, en radianes
const T_ESPACIO = 0.95; // s que tarda la noche en cubrir la franja
const T_ESTALLIDO = 0.9; // s del vuelo hacia fuera
const T_ASIENTO = 2.1; // s: a esta altura ya giran en órbita
const T_COLAPSO = 0.8; // s que tarda en recogerse al irse el puntero
const ESPIRAL = 1.1; // cuánto se enrollan los brazos
/** Velocidad de giro según la distancia al centro (rad/s): el remolino se nota sin marear. */
const vueltas = (r: number) => 1.05 / Math.pow(1 + r / 110, 0.85);
const TINTES = ['#f5f1e8', '#d9b86c', '#cfdcff']; // marfil, oro de la casa, un azul pálido para el brillo

const acotar = (x: number) => Math.min(1, Math.max(0, x));
const suave = (a: number, b: number, x: number) => {
    const t = acotar((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};
const salidaCubica = (t: number) => 1 - Math.pow(1 - acotar(t), 3);
const entradaCubica = (t: number) => Math.pow(acotar(t), 3);
const salidaExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * acotar(t)));
function gauss() {
    let u = 0;
    while (u === 0) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random());
}

/** El color de la noche a una fracción del radio (los tres tonos de su degradado), como «r,g,b». */
function colorDeNoche(f: number) {
    const tonos: [number, number[]][] = [[0, [30, 26, 22]], [0.45, [18, 16, 14]], [1, [11, 10, 9]]];
    const x = acotar(f);
    for (let i = 1; i < tonos.length; i++) {
        const [f0, c0] = tonos[i - 1];
        const [f1, c1] = tonos[i];
        if (x <= f1) {
            const k = (x - f0) / (f1 - f0);
            return c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',');
        }
    }
    return tonos[tonos.length - 1][1].join(',');
}

export function crearGalaxia(lienzo: HTMLCanvasElement): Galaxia {
    const c = lienzo.getContext('2d');
    let ancho = 0;
    let alto = 0;
    let n = 0;
    let radio = new Float32Array(0);
    let angulo = new Float32Array(0);
    let velocidad = new Float32Array(0);
    let tamano = new Float32Array(0);
    let fase = new Float32Array(0);
    let retraso = new Float32Array(0);
    let tinte = new Uint8Array(0);
    let antX = new Float32Array(0);
    let antY = new Float32Array(0);
    let fotoX = new Float32Array(0);
    let fotoY = new Float32Array(0);
    // El polvo de los brazos: nubes doradas muy tenues, pintadas con un único sprite.
    let polvo: HTMLCanvasElement | null = null;
    let nubeR = new Float32Array(0);
    let nubeA = new Float32Array(0);
    let nubeT = new Float32Array(0);

    let anclas: (() => Anclas) | null = null;
    let alFrente: ((r: number) => void) | undefined;
    let t0 = 0;
    let tApagado = -1;
    let rAlApagar = 0;
    let cuadro = 0;
    let primero = true;
    let encendida = false;

    function medir() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        ancho = lienzo.clientWidth;
        alto = lienzo.clientHeight;
        lienzo.width = Math.round(ancho * dpr);
        lienzo.height = Math.round(alto * dpr);
        c?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function sembrar() {
        n = Math.round(Math.min(1600, Math.max(480, (ancho * alto) / 520)));
        radio = new Float32Array(n);
        angulo = new Float32Array(n);
        velocidad = new Float32Array(n);
        tamano = new Float32Array(n);
        fase = new Float32Array(n);
        retraso = new Float32Array(n);
        tinte = new Uint8Array(n);
        antX = new Float32Array(n);
        antY = new Float32Array(n);
        fotoX = new Float32Array(n);
        fotoY = new Float32Array(n);
        const rMax = Math.hypot(ancho, alto) * 0.55;
        for (let i = 0; i < n; i++) {
            // tres poblaciones: el bulbo (una nube redonda en el núcleo), los brazos y un halo de estrellas sueltas
            const tipo = Math.random();
            const bulbo = tipo < 0.14;
            const halo = tipo > 0.8;
            const r = bulbo
                ? Math.abs(gauss()) * rMax * 0.07 + 6
                : halo
                  ? rMax * (0.15 + 0.85 * Math.random())
                  : rMax * (0.08 + 0.92 * Math.pow(Math.random(), 0.8));
            const brazo = Math.floor(Math.random() * BRAZOS);
            radio[i] = r;
            angulo[i] = bulbo || halo ? Math.random() * TAU : (brazo * TAU) / BRAZOS + Math.log(r / 30) * ESPIRAL + gauss() * 0.2;
            velocidad[i] = vueltas(r); // rad/s: más deprisa cerca del centro
            tamano[i] = Math.random() < 0.04 ? 2.1 + Math.random() : 0.5 + Math.random() * 1.1;
            fase[i] = Math.random() * TAU;
            retraso[i] = Math.random() * 0.16;
            tinte[i] = Math.random() < 0.06 ? 2 : Math.random() < 0.28 ? 1 : 0;
        }
        const nubes = BRAZOS * 34;
        nubeR = new Float32Array(nubes);
        nubeA = new Float32Array(nubes);
        nubeT = new Float32Array(nubes);
        for (let i = 0; i < nubes; i++) {
            const r = rMax * (0.1 + 0.75 * (i % 34) / 34 + Math.random() * 0.03);
            nubeR[i] = r;
            nubeA[i] = (Math.floor(i / 34) * TAU) / BRAZOS + Math.log(r / 30) * ESPIRAL + gauss() * 0.12;
            nubeT[i] = 70 + Math.random() * 90;
        }
        if (!polvo) {
            polvo = document.createElement('canvas');
            polvo.width = polvo.height = 128;
            const cp = polvo.getContext('2d');
            if (cp) {
                const gp = cp.createRadialGradient(64, 64, 0, 64, 64, 64);
                gp.addColorStop(0, 'rgba(217,184,108,1)');
                gp.addColorStop(0.4, 'rgba(217,184,108,0.35)');
                gp.addColorStop(1, 'rgba(217,184,108,0)');
                cp.fillStyle = gp;
                cp.fillRect(0, 0, 128, 128);
            }
        }
    }

    /** Dónde está la estrella i a los t segundos del estallido (antes de la lente). */
    function enOrbita(i: number, t: number, a: Anclas, sal: Punto) {
        const th = angulo[i] + velocidad[i] * t;
        const s = Math.max(0, t - retraso[i]);
        // vuela hacia fuera con rebote y se asienta en su órbita
        const f = s < T_ESTALLIDO ? 1.16 * salidaExpo(s / T_ESTALLIDO) : 1 + 0.16 * (1 - suave(T_ESTALLIDO, T_ASIENTO, s));
        const ox = radio[i] * f * Math.cos(th);
        const oy = radio[i] * f * Math.sin(th) * CANTO;
        sal.x = a.nucleo.x + ox * Math.cos(GIRO) - oy * Math.sin(GIRO);
        sal.y = a.nucleo.y + ox * Math.sin(GIRO) + oy * Math.cos(GIRO);
    }

    /** La lente: la palabra curva la luz. Con la fórmula de una masa puntual, ρ' = (ρ + √(ρ² + 4)) / 2, ninguna estrella queda dentro del anillo. */
    function lente(p: Punto, a: Anclas, fuerza: number) {
        if (fuerza <= 0) return;
        const cx = a.lente.x + a.lente.w / 2;
        const cy = a.lente.y + a.lente.h / 2;
        const ra = a.lente.w * 0.66;
        const rb = a.lente.h * 1.1;
        const dx = (p.x - cx) / ra;
        const dy = (p.y - cy) / rb;
        const rho = Math.hypot(dx, dy) + 1e-4;
        if (rho > 6) return;
        const rho2 = (rho + Math.sqrt(rho * rho + 4)) / 2;
        const k = 1 + (rho2 / rho - 1) * fuerza * (1 - suave(3, 6, rho));
        p.x = cx + dx * ra * k;
        p.y = cy + dy * rb * k;
    }

    function detener() {
        cancelAnimationFrame(cuadro);
        cuadro = 0;
        encendida = false;
        tApagado = -1;
        c?.clearRect(0, 0, ancho, alto);
        alFrente?.(0);
    }

    const p: Punto = { x: 0, y: 0 };

    function pintar(ahora: number) {
        if (!c || !anclas) return;
        cuadro = requestAnimationFrame(pintar);
        const a = anclas();
        const t = (ahora - t0) / 1000;
        let colapso = 0;
        if (tApagado >= 0) {
            colapso = acotar((ahora - tApagado) / 1000 / T_COLAPSO);
            if (colapso >= 1) {
                detener();
                return;
            }
        }

        // 1. La noche, abriéndose desde la palabra (o cerrándose hacia ella)
        const rCubre = Math.max(
            Math.hypot(a.nucleo.x, a.nucleo.y),
            Math.hypot(ancho - a.nucleo.x, a.nucleo.y),
            Math.hypot(a.nucleo.x, alto - a.nucleo.y),
            Math.hypot(ancho - a.nucleo.x, alto - a.nucleo.y),
        ) + 24;
        const r = tApagado < 0 ? rCubre * salidaCubica(t / T_ESPACIO) : rAlApagar * (1 - entradaCubica(colapso));
        alFrente?.(r);
        c.clearRect(0, 0, ancho, alto);
        if (r > 0.5) {
            const g = c.createRadialGradient(a.nucleo.x, a.nucleo.y, 0, a.nucleo.x, a.nucleo.y, Math.max(1, rCubre));
            g.addColorStop(0, '#1e1a16');
            g.addColorStop(0.45, '#12100e');
            g.addColorStop(1, '#0b0a09');
            c.fillStyle = g;
            c.beginPath();
            c.arc(a.nucleo.x, a.nucleo.y, r, 0, TAU);
            c.fill();
        }

        // Lo demás no entra en la caja del símbolo de OpenAI
        c.save();
        if (a.reserva) {
            c.beginPath();
            c.rect(0, 0, ancho, alto);
            c.rect(a.reserva.x, a.reserva.y, a.reserva.w, a.reserva.h);
            c.clip('evenodd');
        }
        c.globalCompositeOperation = 'lighter';

        // 2. El destello y la onda de choque, sólo al encender
        if (tApagado < 0 && t < 1.25) {
            const td = acotar(t / 0.7);
            if (td < 1) {
                const rf = 40 + 300 * salidaCubica(td);
                const gd = c.createRadialGradient(a.nucleo.x, a.nucleo.y, 0, a.nucleo.x, a.nucleo.y, rf);
                const af = Math.pow(1 - td, 2);
                gd.addColorStop(0, `rgba(255,252,240,${0.95 * af})`);
                gd.addColorStop(0.25, `rgba(217,184,108,${0.55 * af})`);
                gd.addColorStop(1, 'rgba(217,184,108,0)');
                c.fillStyle = gd;
                c.beginPath();
                c.arc(a.nucleo.x, a.nucleo.y, rf, 0, TAU);
                c.fill();
            }
            const ao = Math.pow(1 - acotar(t / 1.25), 1.5);
            if (r > 2 && ao > 0) {
                c.lineWidth = 2.2;
                c.strokeStyle = `rgba(217,184,108,${0.75 * ao})`;
                c.beginPath();
                c.arc(a.nucleo.x, a.nucleo.y, r, 0, TAU);
                c.stroke();
                c.lineWidth = 9;
                c.strokeStyle = `rgba(217,184,108,${0.12 * ao})`;
                c.stroke();
            }
        }

        // 3. El núcleo: un brillo tenue detrás de la palabra (bajo, para que el texto siga leyéndose)
        const an = tApagado < 0 ? suave(0.3, 1.4, t) : 1 - colapso;
        if (an > 0) {
            const rn = Math.max(a.lente.w * 0.9, 120);
            const gn = c.createRadialGradient(a.nucleo.x, a.nucleo.y, 0, a.nucleo.x, a.nucleo.y, rn);
            gn.addColorStop(0, `rgba(217,184,108,${0.13 * an})`);
            gn.addColorStop(1, 'rgba(217,184,108,0)');
            c.fillStyle = gn;
            c.beginPath();
            c.ellipse(a.nucleo.x, a.nucleo.y, rn, rn * 0.55, GIRO, 0, TAU);
            c.fill();
        }

        // 4. El polvo de los brazos, girando con ellos
        const ap = tApagado < 0 ? suave(0.45, 1.7, t) : 1 - colapso;
        if (polvo && ap > 0) {
            const f = tApagado < 0 ? Math.min(1.16 * salidaExpo(t / T_ESTALLIDO), 1 + 0.16 * (1 - suave(T_ESTALLIDO, T_ASIENTO, t))) : 1 - entradaCubica(colapso);
            for (let i = 0; i < nubeR.length; i++) {
                const th = nubeA[i] + vueltas(nubeR[i]) * t;
                const ox = nubeR[i] * f * Math.cos(th);
                const oy = nubeR[i] * f * Math.sin(th) * CANTO;
                const x = a.nucleo.x + ox * Math.cos(GIRO) - oy * Math.sin(GIRO);
                const y = a.nucleo.y + ox * Math.sin(GIRO) + oy * Math.cos(GIRO);
                const tam = nubeT[i];
                c.globalAlpha = 0.07 * ap;
                c.drawImage(polvo, x - tam / 2, y - tam * 0.3, tam, tam * 0.6);
            }
            c.globalAlpha = 1;
        }

        // 5. Las estrellas
        const fuerzaLente = tApagado < 0 ? suave(0.35, 1.6, t) : 1 - colapso;
        const recoge = entradaCubica(colapso);
        c.lineCap = 'round';
        for (let tn = 0; tn < TINTES.length; tn++) {
            c.strokeStyle = TINTES[tn];
            c.fillStyle = TINTES[tn];
            for (let i = 0; i < n; i++) {
                if (tinte[i] !== tn) continue;
                if (tApagado < 0) {
                    enOrbita(i, t, a, p);
                    lente(p, a, fuerzaLente);
                } else {
                    // se recogen girando hacia el núcleo
                    const giro = recoge * 1.6;
                    const dx = fotoX[i] - a.nucleo.x;
                    const dy = fotoY[i] - a.nucleo.y;
                    const k = 1 - recoge;
                    p.x = a.nucleo.x + (dx * Math.cos(giro) - dy * Math.sin(giro)) * k;
                    p.y = a.nucleo.y + (dx * Math.sin(giro) + dy * Math.cos(giro)) * k;
                }
                // sólo dentro de la noche: fuera, sobre el crema, no se verían
                const dn = Math.hypot(p.x - a.nucleo.x, p.y - a.nucleo.y);
                const dentro = r <= 0 ? 0 : 1 - suave(r * 0.92, r, dn);
                const titila = 0.72 + 0.28 * Math.sin(ahora / 1000 * (1.3 + (i % 7) * 0.31) + fase[i]);
                const alfa = dentro * titila * (tApagado < 0 ? suave(0, 0.12, t - retraso[i]) : 1 - colapso * 0.6);
                if (alfa > 0.01) {
                    c.globalAlpha = alfa;
                    c.lineWidth = tamano[i];
                    c.beginPath();
                    const ox = primero ? p.x : antX[i];
                    const oy = primero ? p.y : antY[i];
                    const mov = Math.hypot(p.x - ox, p.y - oy);
                    c.moveTo(mov > 60 ? p.x - ((p.x - ox) / mov) * 60 : ox, mov > 60 ? p.y - ((p.y - oy) / mov) * 60 : oy);
                    c.lineTo(mov < 0.4 ? p.x + 0.01 : p.x, p.y);
                    c.stroke();
                    if (tamano[i] > 2) {
                        c.globalAlpha = alfa * 0.16;
                        c.beginPath();
                        c.arc(p.x, p.y, tamano[i] * 3.2, 0, TAU);
                        c.fill();
                    }
                }
                antX[i] = p.x;
                antY[i] = p.y;
            }
        }
        c.globalAlpha = 1;
        c.restore();

        // La caja del símbolo queda sin estrellas (el recorte de arriba), pero su arista se
        // notaba como un cuadrado: un halo del mismo color de la noche la funde con lo de alrededor.
        if (a.reserva && r > 0.5) {
            const cx = a.reserva.x + a.reserva.w / 2;
            const cy = a.reserva.y + a.reserva.h / 2;
            const rr = Math.max(a.reserva.w, a.reserva.h) / 2;
            const noche = colorDeNoche(Math.hypot(cx - a.nucleo.x, cy - a.nucleo.y) / rCubre);
            const gh = c.createRadialGradient(cx, cy, rr * 1.45, cx, cy, rr * 2.5);
            gh.addColorStop(0, `rgba(${noche},1)`);
            gh.addColorStop(1, `rgba(${noche},0)`);
            c.save();
            c.beginPath();
            c.arc(a.nucleo.x, a.nucleo.y, r, 0, TAU); // sólo dentro de la noche
            c.clip();
            c.fillStyle = gh;
            c.fillRect(cx - rr * 2.5, cy - rr * 2.5, rr * 5, rr * 5);
            c.restore();
        }
        primero = false;
    }

    return {
        encender(fn, cb) {
            if (!c) return;
            anclas = fn;
            alFrente = cb;
            if (encendida && tApagado < 0) return; // ya está abierta
            // Si vuelve el puntero mientras se recogía, estalla de nuevo desde el principio.
            medir();
            sembrar();
            primero = true;
            t0 = performance.now();
            tApagado = -1;
            encendida = true;
            cancelAnimationFrame(cuadro);
            cuadro = requestAnimationFrame(pintar);
        },
        apagar() {
            if (!encendida || tApagado >= 0 || !anclas) return;
            const a = anclas();
            const t = (performance.now() - t0) / 1000;
            for (let i = 0; i < n; i++) {
                enOrbita(i, t, a, p);
                lente(p, a, suave(0.35, 1.6, t));
                fotoX[i] = p.x;
                fotoY[i] = p.y;
            }
            const rCubre = Math.hypot(Math.max(a.nucleo.x, ancho - a.nucleo.x), Math.max(a.nucleo.y, alto - a.nucleo.y)) + 24;
            rAlApagar = rCubre * salidaCubica(t / T_ESPACIO);
            tApagado = performance.now();
        },
        activa: () => encendida,
        destruir() {
            cancelAnimationFrame(cuadro);
            cuadro = 0;
            encendida = false;
        },
    };
}
