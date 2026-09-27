// LO QUE EL ABOGADO EDITA EN LA HOJA DEL CHAT, GUARDADO (27-sep-2026).
//
// `@/lib/documento/edicionHoja` guarda por conversación, en el navegador, la
// hoja que el abogado tocó. Aquí se prueba con un almacén en memoria que se
// llena como el de verdad:
//
//   · guarda y lee lo mismo, con cuántas respuestas contiene;
//   · la conversación «nueva» (sin identificador) no se guarda;
//   · un guardado ilegible cuenta como ninguno;
//   · sin sitio, suelta las ediciones MÁS VIEJAS —nunca la propia— y guarda;
//   · una hoja que no cabe ni sola no tira las de las demás;
//   · pasado el máximo de conversaciones, la más vieja sale;
//   · olvidar suelta la edición y la saca del índice.
//
//   node --experimental-strip-types comprobaciones/edicion_hoja.mjs
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(path.join(RAIZ, 'src/lib/documento/edicionHoja.ts'));

let fallas = 0;
const ok = (cond, texto) => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}`);
    if (!cond) fallas++;
};

/** Un localStorage en memoria con tope de caracteres, como el del navegador. */
function almacen(tope = Infinity) {
    const m = new Map();
    const usado = () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0);
    return {
        m,
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => {
            const antes = m.get(k);
            m.set(k, String(v));
            if (usado() > tope) {
                if (antes === undefined) m.delete(k); else m.set(k, antes);
                throw new Error('QuotaExceededError');
            }
        },
        removeItem: (k) => { m.delete(k); },
    };
}

// ── guardar y leer ───────────────────────────────────────────────────────
{
    const a = almacen();
    ok(E.guardarEdicion('c1', '<p>Hola</p>', 2, a) === true, 'guarda');
    const l = E.leerEdicion('c1', a);
    ok(l && l.html === '<p>Hola</p>' && l.bloques === 2 && l.t > 0, 'lee lo mismo, con sus respuestas');
    ok(E.leerEdicion('c2', a) === null, 'otra conversación no tiene nada');
    ok(E.guardarEdicion('nueva', '<p>x</p>', 0, a) === false && E.leerEdicion('nueva', a) === null,
        'la conversación «nueva» no se guarda');
    ok(E.guardarEdicion(null, '<p>x</p>', 0, a) === false, 'sin clave no se guarda');
    a.setItem('iurexia-hoja-rota', '{no es json');
    ok(E.leerEdicion('rota', a) === null, 'un guardado ilegible cuenta como ninguno');
    a.setItem('iurexia-hoja-rara', JSON.stringify({ html: 5, bloques: -1 }));
    ok(E.leerEdicion('rara', a) === null, 'un guardado con otra forma cuenta como ninguno');
    ok(E.guardarEdicion('c1', '<p>Hola otra vez</p>', 3, a) && E.leerEdicion('c1', a).bloques === 3,
        'volver a guardar reemplaza');
    ok(E.leerEdicion('c1', null) === null && E.guardarEdicion('c1', 'x', 1, null) === false,
        'sin almacenamiento no pasa nada');
}

// ── sin sitio: fuera las más viejas, nunca la propia ────────────────────
{
    const a = almacen(6000);
    const hoja = (n) => `<p>${'x'.repeat(n)}</p>`;
    E.guardarEdicion('vieja', hoja(1500), 1, a);
    E.guardarEdicion('media', hoja(1500), 1, a);
    E.guardarEdicion('reciente', hoja(1500), 1, a);
    ok(E.guardarEdicion('nueva2', hoja(2500), 1, a) === true, 'sin sitio, guarda igual');
    ok(E.leerEdicion('vieja', a) === null, 'soltó la más vieja');
    ok(E.leerEdicion('reciente', a) !== null && E.leerEdicion('nueva2', a) !== null,
        'conservó la más reciente y la propia');
    const indice = JSON.parse(a.getItem('iurexia-hojas'));
    ok(indice[0] === 'nueva2' && !indice.includes('vieja'), 'el índice va de la más nueva a la más vieja');
}

// ── la hoja que no cabe ni sola no tira las demás ────────────────────────
{
    const a = almacen(5000);
    E.guardarEdicion('una', '<p>uno</p>', 1, a);
    E.guardarEdicion('dos', '<p>dos</p>', 1, a);
    ok(E.guardarEdicion('enorme', `<p>${'x'.repeat(8000)}</p>`, 1, a) === false, 'la enorme no se guarda');
    ok(E.leerEdicion('una', a) !== null && E.leerEdicion('dos', a) !== null,
        'y las demás siguen ahí');
    const b = almacen();
    ok(E.guardarEdicion('gigante', 'x'.repeat(2_000_001), 1, b) === false && E.leerEdicion('gigante', b) === null,
        'pasado el máximo de caracteres ni se intenta');
}

// ── el máximo de conversaciones ─────────────────────────────────────────
{
    const a = almacen();
    for (let i = 0; i < 31; i++) E.guardarEdicion(`k${i}`, `<p>${i}</p>`, 1, a);
    ok(E.leerEdicion('k0', a) === null, 'con 31, la primera salió');
    ok(E.leerEdicion('k1', a) !== null && E.leerEdicion('k30', a) !== null, 'las otras 30 siguen');
    E.guardarEdicion('k1', '<p>otra vez</p>', 2, a);
    E.guardarEdicion('k31', '<p>31</p>', 1, a);
    ok(E.leerEdicion('k1', a) !== null && E.leerEdicion('k2', a) === null,
        'guardar otra vez la rejuvenece: sale la siguiente más vieja');
}

// ── olvidar ──────────────────────────────────────────────────────────────
{
    const a = almacen();
    E.guardarEdicion('borrada', '<p>x</p>', 1, a);
    E.guardarEdicion('queda', '<p>y</p>', 1, a);
    E.olvidarEdicion('borrada', a);
    ok(E.leerEdicion('borrada', a) === null && E.leerEdicion('queda', a) !== null, 'olvidar suelta sólo esa');
    ok(!JSON.parse(a.getItem('iurexia-hojas')).includes('borrada'), 'y la saca del índice');
    // La hoja de la conversación borrada se desmonta después y quiere guardar.
    ok(E.guardarEdicion('borrada', '<p>x</p>', 1, a) === false && E.leerEdicion('borrada', a) === null,
        'la conversación borrada no vuelve a guardarse al desmontar su hoja');
}

console.log(fallas ? `\n✘ ${fallas} falla(s)` : '\n✔ todo bien');
process.exit(fallas ? 1 : 0);
