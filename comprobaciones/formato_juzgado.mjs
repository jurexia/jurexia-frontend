// EL FORMATO DE JUZGADO (28-sep-2026): lo que no necesita navegador.
//
// `markdownAHtml` borraba la raya de la firma —«______» es una raya de
// markdown— y convertía en rubro el nombre en mayúsculas que va debajo. Ahora
// la raya de ocho o más guiones bajos se queda, en su párrafo, con el nombre;
// las rayas cortas y las de guiones siguen separando. El resto del formato
// —rubro a la derecha, destinatario en negritas, cierre centrado, sin notas
// al pie— trabaja sobre el árbol de la hoja y se prueba en el navegador.
//
//   node --experimental-strip-types comprobaciones/formato_juzgado.mjs
import path from 'path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
let fallas = 0;
const ok = (cond, texto) => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}`);
    if (!cond) fallas++;
};

const cierre = 'PROTESTO LO NECESARIO\nCiudad de México, a 28 de septiembre de 2026\n\n______________________________\nJUAN PÉREZ GARCÍA\nCédula profesional 1234567';
const html = M.markdownAHtml(cierre);
ok(html.includes('<h2>PROTESTO LO NECESARIO</h2>'), 'el «PROTESTO» sigue siendo rubro');
ok(html.includes('<p>______________________________<br>JUAN PÉREZ GARCÍA<br>Cédula profesional 1234567</p>'),
    'la raya de la firma se queda, con el nombre y la cédula en su párrafo');
ok(!html.includes('<h2>JUAN PÉREZ GARCÍA</h2>'), 'el nombre en mayúsculas bajo la raya no es rubro');
ok(!M.markdownAHtml('Texto\n\n---\n\nMás').includes('---') && !M.markdownAHtml('Texto\n\n___\n\nMás').includes('___'),
    'las rayas de markdown siguen separando');
ok(M.markdownAHtml('Uno\n\nHECHOS\n\nDos').includes('<h2>HECHOS</h2>'), 'los rubros de siempre, como siempre');
ok(M.markdownAHtml('1. Primero\n________________\n2. Segundo').includes('<ol>'), 'una raya entre renglones de lista no rompe nada');

console.log(fallas ? `\n✘ ${fallas} falla(s)` : '\n✔ todo bien');
process.exit(fallas ? 1 : 0);
