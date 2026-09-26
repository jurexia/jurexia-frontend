// LA PUERTA DEL PROXY PARA LA DOCTRINA DE LA UNAM, SIN LEVANTAR NEXT (25-sep-2026).
//
//   node --experimental-strip-types comprobaciones/proxy_unam.mjs
//
// Comprueba `puertaUNAM`, `canonUNAM`, `urlProxyPdf` y `traerUNAM`
// (src/lib/proxyPdf.ts), como `proxy_coidh.mjs` lo hace con la Corte IDH:
//   · sólo https, sólo `/www/bjv/libros/…/*.pdf`, sin `%`, sin puerto y sin
//     credenciales;
//   · la forma no canónica (con `#page=N`, con consulta, con `&v=`) redirige a
//     la canónica, y la canónica ya no redirige;
//   · lo que pide el visor NUNCA provoca un 308, tampoco con las fuentes
//     viejas que traen `#page=N` pegado a `pdf_url`;
//   · las redirecciones del origen sólo se siguen si pasan la misma puerta.
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { puertaUNAM, puertaCorteIDH, canonUNAM, urlProxyPdf, traerUNAM } = await import(path.join(RAIZ, 'src/lib/proxyPdf.ts'));

const CANON = 'https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf';
const q = (u, extra = '') => `?u=${encodeURIComponent(u)}${extra}`;

// [consulta del proxy, lo esperado: 'sirve' | 'redirige' | 'prohibe', canónica esperada]
const casos = [
    [q(CANON), 'sirve', CANON],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/2/710/9.pdf'), 'sirve', 'https://archivos.juridicas.unam.mx/www/bjv/libros/2/710/9.pdf'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/7/3384/11.pdf'), 'sirve', 'https://archivos.juridicas.unam.mx/www/bjv/libros/7/3384/11.pdf'],
    // Mayúsculas en el host: `URL` las baja; es otra forma del mismo archivo.
    [q('https://ARCHIVOS.JURIDICAS.UNAM.MX/www/bjv/libros/8/3632/11.pdf'), 'redirige', CANON],
    // Las fuentes viejas: la página pegada a `pdf_url`.
    [q(CANON + '#page=313'), 'redirige', CANON],
    [q(CANON + '?x=1'), 'redirige', CANON],
    [q(CANON, '&x=1'), 'redirige', CANON],
    // Sin sha1 de los capítulos no hay versión que valga.
    [q(CANON, '&v=8b4e9e05'), 'redirige', CANON],
    [`?v=8b4e9e05&u=${encodeURIComponent(CANON)}`, 'redirige', CANON],
    [q(CANON, `&u=${encodeURIComponent(CANON)}`), 'redirige', CANON],
    // Sin codificar: se sirve (mismo criterio que la Corte, ver proxy_coidh.mjs).
    [`?u=${CANON}`, 'sirve', CANON],
    // La puerta.
    [q('http://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf'), 'prohibe'],
    [q('ftp://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx:8443/www/bjv/libros/8/3632/11.pdf'), 'prohibe'],
    [q('https://usuario:clave@archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.docx'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.PDF'), 'prohibe'],
    // Un PDF suelto bajo /libros/, sin carpeta de libro: ninguno de los 92 es así.
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/11.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/revistas/8/3632/11.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/site/index.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/web.config'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/../../web.config?.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/%2e%2e/%2e%2e/x.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/..%2F..%2Fx.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/..%2f..%2fx.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/..%5C..%5Cx.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11%00.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/a%20b.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf.exe'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/.pdf'), 'prohibe'],
    [q('https://archivos.juridicas.unam.mx.evil.com/www/bjv/libros/8/3632/11.pdf'), 'prohibe'],
    [q('https://evil.com/archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf'), 'prohibe'],
    [q('https://juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf'), 'prohibe'],
];

let fallos = 0;
for (const [consulta, esperado, canon] of casos) {
    const p = puertaUNAM(new URLSearchParams(consulta.slice(1)));
    const obtenido = !p ? 'prohibe' : p.ubicacion ? 'redirige' : 'sirve';
    let bien = obtenido === esperado && (!canon || (p && p.canonica === canon));
    // La redirección tiene que llevar a algo que ya se sirva, a la primera.
    if (bien && p && p.ubicacion) {
        const segunda = puertaUNAM(new URLSearchParams(p.ubicacion.slice(1)));
        bien = Boolean(segunda && segunda.ubicacion === null && segunda.canonica === canon);
    }
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', esperado.padEnd(8), obtenido.padEnd(8), consulta.slice(0, 110));
}

// Lo que pide el visor nunca se redirige, y la página nunca va en la llave.
const delVisor = [
    [CANON, null],
    [CANON + '#page=313', null],
    [CANON + '#page=12', '8b4e9e056dbeb5d38cb2f5190bfa7c624ddece36'],
];
const pedidas = new Set();
for (const [u, sha1] of delVisor) {
    const pedida = urlProxyPdf(u, sha1);
    const p = puertaUNAM(new URLSearchParams(pedida.split('?')[1]));
    const bien = Boolean(p && p.ubicacion === null && p.canonica === CANON);
    pedidas.add(pedida);
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', 'visor   ', pedida);
}
const unaLlave = pedidas.size === 1;
if (!unaLlave) fallos++;
console.log(unaLlave ? 'ok   ' : 'FALLA', 'visor    una sola llave de CDN por capítulo, con y sin #page');

// La UNAM fuera de la puerta: el visor no la pide al proxy (enlace directo).
const bienFuera = urlProxyPdf('http://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf') === null
    && urlProxyPdf('https://archivos.juridicas.unam.mx/www/bjv/revistas/1/2.pdf') === null;
if (!bienFuera) fallos++;
console.log(bienFuera ? 'ok   ' : 'FALLA', 'visor    fuera de /www/bjv/libros → null (enlace directo)');

// Las copias de la Corte IDH en legal-docs pasan por la puerta de siempre
// (Supabase ya está permitido), sin forma canónica de la Corte.
const copia = 'https://ukcuzhwmmfwvcedvhfll.supabase.co/storage/v1/object/public/legal-docs/CorteIDH/seriec_154_esp.pdf';
const bienCopia = urlProxyPdf(copia, '8b4e9e056dbeb5d38cb2f5190bfa7c624ddece36') === `/api/ley/pdf?u=${encodeURIComponent(copia)}`;
if (!bienCopia) fallos++;
console.log(bienCopia ? 'ok   ' : 'FALLA', 'copia    legal-docs/CorteIDH → proxy de siempre');

// Las puertas no se cruzan: la UNAM no pasa la de la Corte ni al revés.
const cruce = puertaCorteIDH(new URLSearchParams(q(CANON).slice(1))) === null
    && puertaUNAM(new URLSearchParams(q('https://www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf').slice(1))) === null
    && canonUNAM(copia) === null;
if (!cruce) fallos++;
console.log(cruce ? 'ok   ' : 'FALLA', 'puertas  la UNAM, la Corte y Supabase no se cruzan');

// Las redirecciones del origen, seguidas sólo si pasan la misma puerta.
const falso = (mapa) => async (u, init) => {
    if (init.redirect !== 'manual') throw new Error('sin redirect manual');
    const r = mapa[u];
    if (!r) return new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } });
    return new Response(null, { status: r[0], headers: { location: r[1] } });
};
const redirecciones = [
    [{}, 'sirve'],
    [{ [CANON]: [301, '/www/bjv/libros/8/3632/12.pdf'] }, 'sirve'],
    [{ [CANON]: [302, 'http://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf'] }, 'bloquea'],
    [{ [CANON]: [302, 'http://127.0.0.1/interno.pdf'] }, 'bloquea'],
    [{ [CANON]: [302, 'https://archivos.juridicas.unam.mx/www/site/login.aspx'] }, 'bloquea'],
    [{ [CANON]: [302, 'https://www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf'] }, 'bloquea'],
    [{ [CANON]: [302, CANON] }, 'bloquea'],
    [{ [CANON]: [302, ''] }, 'bloquea'],
];
for (const [mapa, esperado] of redirecciones) {
    const r = await traerUNAM(CANON, {}, falso(mapa));
    const obtenido = 'bloqueada' in r ? 'bloquea' : r.status === 200 ? 'sirve' : String(r.status);
    const bien = obtenido === esperado;
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', 'redirige', esperado.padEnd(8), obtenido.padEnd(8), JSON.stringify(Object.values(mapa)[0] || 'sin redirección'));
}

console.log(fallos ? `${fallos} FALLOS` : `todo bien (${casos.length + delVisor.length + 4 + redirecciones.length} casos)`);
process.exit(fallos ? 1 : 0);
