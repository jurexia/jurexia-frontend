// EL RETOQUE, EN SU LUGAR (28-sep-2026).
//
// Un retoque que modifica el escrito —«agrega un concepto…»— llega marcado
// (`MARCA_REEMPLAZA`) con el escrito entero ya corregido, y la hoja lo pone EN
// LUGAR del anterior en vez de anexarlo debajo. Aquí, sin navegador:
//
//   · la marca se reconoce al principio (con el razonamiento detrás) y en
//     ningún otro sitio;
//   · el dossier: el retoque sustituye a la respuesta anterior, en cadena; la
//     que llega va aparte; la nota para el abogado no entra; la memoria
//     guarda sólo las respuestas de ahora y no recalcula las terminadas;
//   · las burbujas: cuáles quedaron sustituidas;
//   · useChat guarda la marca con el mensaje y no crea la burbuja antes de
//     que haya texto.
//
// Lo que necesita el DOM —la hoja que sustituye el bloque en su sitio, el
// escrito de la hoja de vuelta a markdown con sus citas— se prueba en el
// navegador.
//
//   node --experimental-strip-types comprobaciones/retoque.mjs
import fs from 'fs';
import path from 'path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// «@/…» → src/…, y los imports sin extensión de los .ts, como los resuelve Next.
register('data:text/javascript,' + encodeURIComponent(`
const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ + '/').href)};
export async function resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) spec = RAIZ + 'src/' + spec.slice(2);
    try { return await next(spec, ctx); }
    catch (e) {
        if (/^(\\.|\\/|file:)/.test(spec)) {
            for (const ext of ['.ts', '.tsx', '/index.ts']) {
                try { return await next(spec + ext, ctx); } catch {}
            }
        }
        throw e;
    }
}`));

const M = await import(path.join(RAIZ, 'src/lib/documento/marcado.ts'));
const D = await import(path.join(RAIZ, 'src/lib/documento/dossier.ts'));

let fallas = 0;
const ok = (cond, texto) => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}`);
    if (!cond) fallas++;
};

const MARCA = M.MARCA_REEMPLAZA;
const ESCRITO = (n) => `C. JUEZ DE DISTRITO\n\n**HECHOS**\n\n1. Versión ${n} del escrito, con suficiente texto para contar como escrito de verdad y no como un saludo; ${'se narran los hechos del caso. '.repeat(6)}\n\nPROTESTO LO NECESARIO`;
const NOTA = '\n\n## NOTA PARA EL ABOGADO\n- Verifique el plazo.';

// ── la marca ─────────────────────────────────────────────────────────────
{
    ok(MARCA === '<!--REEMPLAZA_ESCRITO-->', 'la marca es la que emite el API (esfuerzo_redaccion.MARCA_REEMPLAZA)');
    ok(M.reemplazaEscrito(MARCA + ESCRITO(2)), 'al principio, se reconoce');
    ok(M.reemplazaEscrito(`\n ${MARCA}<!--THINKING_START-->pensé<!--THINKING_END-->${ESCRITO(2)}`), 'con blancos delante y el razonamiento detrás, también');
    ok(!M.reemplazaEscrito(ESCRITO(2) + MARCA), 'al final, no: la marca va delante');
    ok(!M.reemplazaEscrito('') && !M.reemplazaEscrito(null), 'vacío o nulo, no');
    ok(!M.markdownAHtml(MARCA + '**HECHOS**').includes('REEMPLAZA'), 'la hoja no la pinta');
}

// ── el dossier ───────────────────────────────────────────────────────────
{
    const conversacion = [
        { role: 'user', content: '¿Qué plazo hay?' },
        { role: 'assistant', content: 'Quince días.' },
        { role: 'user', content: 'Redacta la demanda' },
        { role: 'assistant', content: ESCRITO(1) + NOTA },
        { role: 'user', content: 'agrega un concepto' },
        { role: 'assistant', content: MARCA + ESCRITO(2) + NOTA },
    ];
    const { bloques, memoria } = D.bloquesDelDossier(conversacion, false);
    ok(bloques.length === 2, `dos bloques, no tres (${bloques.length})`);
    ok(bloques[0].id === 'm1' && bloques[0].markdown === 'Quince días.' && !bloques[0].reemplaza, 'la consulta sigue en su sitio');
    ok(bloques[1].id === 'm5' && bloques[1].reemplaza === 'm3', 'el retoque ocupa el lugar del escrito que corrige');
    ok(bloques[1].markdown.includes('Versión 2') && !bloques[1].markdown.includes('Versión 1'), 'con el texto corregido');
    ok(!bloques.some((b) => b.markdown.includes('NOTA PARA EL ABOGADO')), 'la nota para el abogado no entra a la hoja');
    ok(memoria.size === 3, 'la memoria guarda las tres respuestas de ahora');

    // En cadena: el retoque de un retoque sustituye al retoque.
    const cadena = [...conversacion,
        { role: 'user', content: 'corrige el nombre' },
        { role: 'assistant', content: MARCA + ESCRITO(3) }];
    const c = D.bloquesDelDossier(cadena, false).bloques;
    ok(c.length === 2 && c[1].id === 'm7' && c[1].reemplaza === 'm5', 'el retoque del retoque sustituye al retoque');

    // Mientras llega, el retoque va aparte y el escrito anterior sigue.
    const llegando = D.bloquesDelDossier(cadena, true).bloques;
    ok(llegando.length === 2 && llegando[1].id === 'm5', 'mientras llega, la hoja conserva la versión anterior');

    // «Continúa» no lleva marca: se anexa.
    const sigue = [...conversacion, { role: 'user', content: 'continúa' }, { role: 'assistant', content: 'SEGUNDO. …' }];
    const s = D.bloquesDelDossier(sigue, false).bloques;
    ok(s.length === 3 && !s[2].reemplaza, 'la continuación se anexa');

    // Un retoque sin nada antes (conversación rara) no rompe: entra solo.
    const solo = D.bloquesDelDossier([{ role: 'assistant', content: MARCA + ESCRITO(1) }], false).bloques;
    ok(solo.length === 1 && !solo[0].reemplaza, 'un retoque sin escrito anterior entra como bloque propio');

    // La memoria: las respuestas terminadas no se vuelven a separar.
    const memo = new Map([[conversacion[3].content, 'DE LA MEMORIA']]);
    const conMemoria = D.bloquesDelDossier(conversacion.slice(0, 4), false, memo).bloques;
    ok(conMemoria[1].markdown === 'DE LA MEMORIA', 'lo ya separado sale de la memoria');
    const vieja = new Map([['texto que ya no está', 'x']]);
    ok(!D.bloquesDelDossier(conversacion, false, vieja).memoria.has('texto que ya no está'), 'y la memoria suelta lo que ya no está');
}

// ── las burbujas sustituidas ─────────────────────────────────────────────
{
    const conversacion = [
        { role: 'assistant', content: 'Quince días.' },
        { role: 'assistant', content: ESCRITO(1) },
        { role: 'assistant', content: '' },
        { role: 'assistant', content: MARCA + ESCRITO(2) },
        { role: 'assistant', content: MARCA + ESCRITO(3) },
    ];
    const s = D.respuestasSustituidas(conversacion);
    ok(s.has(1) && s.has(3) && !s.has(0) && !s.has(4) && s.size === 2,
        'la sustituida es la respuesta anterior (sin contar las vacías), en cadena');
}

// ── useChat guarda la marca con el mensaje ───────────────────────────────
{
    const fuente = fs.readFileSync(path.join(RAIZ, 'src/hooks/useChat.ts'), 'utf8');
    ok(/chunk\.includes\(MARCA_REEMPLAZA\)[\s\S]{0,200}reemplazaEscrito = true/.test(fuente), 'el trozo con la marca la aparta');
    ok(/conMarca\(parser\.getDisplayContent\(\)\)/.test(fuente) && /let finalDisplay = conMarca\(/.test(fuente),
        'y la antepone al texto, en vivo y al terminar (lo que se guarda)');
    ok(/reemplazaEscrito && t\.trim\(\)/.test(fuente), 'sin texto no la antepone: no crea la burbuja antes de tiempo');
}

console.log(fallas ? `\n✘ ${fallas} falla(s)` : '\n✔ todo bien');
process.exit(fallas ? 1 : 0);
