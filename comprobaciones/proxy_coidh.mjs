// LA PUERTA DEL PROXY PARA LA CORTE IDH, SIN LEVANTAR NEXT (25-sep-2026).
//
//   node --experimental-strip-types comprobaciones/proxy_coidh.mjs
//
// Comprueba `puertaCorteIDH` y `urlProxyPdf` (src/lib/proxyPdf.ts):
//   · qué pasa la puerta y qué da 403;
//   · que toda forma no canónica redirige a la canónica, y que la canónica
//     ya no redirige (sin bucles: se aplica la redirección y se vuelve a
//     preguntar);
//   · que lo que pide el visor (`urlProxyPdf`) NUNCA provoca un 308.
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { puertaCorteIDH, urlProxyPdf, traerCorteIDH } = await import(path.join(RAIZ, 'src/lib/proxyPdf.ts'));

const CANON = 'https://www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf';
const q = (u, extra = '') => `?u=${encodeURIComponent(u)}${extra}`;

// [consulta del proxy, lo esperado: 'sirve' | 'redirige' | 'prohibe', canónica esperada]
const casos = [
    [q(CANON), 'sirve', CANON],
    [q(CANON, '&v=8b4e9e05'), 'sirve', CANON],
    [q('http://www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf'), 'redirige', CANON],
    [q('https://corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf'), 'redirige', CANON],
    [q('http://corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf'), 'redirige', CANON],
    [q('HTTPS://WWW.CORTEIDH.OR.CR/docs/casos/articulos/seriec_154_esp.pdf'), 'redirige', CANON],
    [q(CANON + '?x=1'), 'redirige', CANON],
    [q(CANON + '#page=53'), 'redirige', CANON],
    [q(CANON, '&x=1'), 'redirige', CANON],
    [q(CANON, '&v=8B4E9E05'), 'redirige', CANON],
    [q(CANON, '&v=zzz'), 'redirige', CANON],
    [q(CANON, '&v='), 'redirige', CANON],
    [`?v=8b4e9e05&u=${encodeURIComponent(CANON)}`, 'redirige', CANON],
    [q(CANON, `&u=${encodeURIComponent(CANON)}`), 'redirige', CANON],
    // Sin codificar: la misma dirección y otra llave del CDN, pero se SIRVE.
    // Unificarla exigiría comparar la cadena cruda del query, y eso puede
    // redirigir en bucle si el navegador o el borde de Vercel recodifican
    // algo (la comilla simple, `%3A`). El visor siempre pide la forma
    // codificada; sólo un enlace escrito a mano cae aquí.
    [`?u=${CANON}`, 'sirve', CANON],
    [q('https://www.corteidh.or.cr/docs/opiniones/seriea_32_es.pdf'), 'sirve', 'https://www.corteidh.or.cr/docs/opiniones/seriea_32_es.pdf'],
    [q('https://www.corteidh.or.cr/docs/supervisiones/gelman_20_03_13.pdf'), 'sirve', 'https://www.corteidh.or.cr/docs/supervisiones/gelman_20_03_13.pdf'],
    [q('https://www.corteidh.or.cr/docs/casos/articulos/SERIEC_113_ESP1.PDF'), 'sirve', 'https://www.corteidh.or.cr/docs/casos/articulos/SERIEC_113_ESP1.PDF'],
    // Un nombre con comilla simple: el navegador la recodifica en el query.
    [q("https://www.corteidh.or.cr/docs/casos/articulos/o'neill.pdf"), 'sirve', "https://www.corteidh.or.cr/docs/casos/articulos/o'neill.pdf"],
    [`?u=${encodeURIComponent("https://www.corteidh.or.cr/docs/casos/articulos/o'neill.pdf").replace(/'/g, '%27')}`, 'sirve', "https://www.corteidh.or.cr/docs/casos/articulos/o'neill.pdf"],
    // La puerta.
    [q('https://www.corteidh.or.cr/ver_ficha_tecnica.cfm?nId_Ficha=186'), 'prohibe'],
    [q('https://www.corteidh.or.cr/docs/medidas/algo.pdf'), 'prohibe'],
    [q('https://www.corteidh.or.cr/docs/asuntos/algo.pdf'), 'prohibe'],
    [q('https://www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.docx'), 'prohibe'],
    [q('https://www.corteidh.or.cr:8443/docs/casos/articulos/seriec_154_esp.pdf'), 'prohibe'],
    [q('https://usuario:clave@www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf'), 'prohibe'],
    [q('https://www.corteidh.or.cr/docs/casos/../../index.cfm?.pdf'), 'prohibe'],
    [q('https://www.corteidh.or.cr/docs/casos/%2e%2e/%2e%2e/index.cfm'), 'prohibe'],
    [q('ftp://www.corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf'), 'prohibe'],
    // `%2F` y `%5C` no los decodifica `URL`: pasaban la puerta (revisión del 25-sep-2026).
    [q('https://www.corteidh.or.cr/docs/casos/..%2F..%2Fsitios%2Fx.pdf'), 'prohibe'],
    [q('https://www.corteidh.or.cr/docs/casos/..%2f..%2fsitios%2fx.pdf'), 'prohibe'],
    [q('https://www.corteidh.or.cr/docs/casos/..%5C..%5Cx.pdf'), 'prohibe'],
    // `%20` y `%c3%b1` sí vienen en el catálogo y siguen pasando.
    [q('https://www.corteidh.or.cr/docs/supervisiones/casta%c3%b1eda_28_08_13.pdf'), 'sirve', 'https://www.corteidh.or.cr/docs/supervisiones/casta%c3%b1eda_28_08_13.pdf'],
    [q('https://www.corteidh.or.cr/docs/supervisiones/gomez_%2021_12_10.pdf'), 'sirve', 'https://www.corteidh.or.cr/docs/supervisiones/gomez_%2021_12_10.pdf'],
];

let fallos = 0;
for (const [consulta, esperado, canon] of casos) {
    const p = puertaCorteIDH(new URLSearchParams(consulta.slice(1)));
    const obtenido = !p ? 'prohibe' : p.ubicacion ? 'redirige' : 'sirve';
    let bien = obtenido === esperado && (!canon || (p && p.canonica === canon));
    // La redirección tiene que llevar a algo que ya se sirva, a la primera.
    if (bien && p && p.ubicacion) {
        const segunda = puertaCorteIDH(new URLSearchParams(p.ubicacion.slice(1)));
        bien = Boolean(segunda && segunda.ubicacion === null && segunda.canonica === canon);
    }
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', esperado.padEnd(8), obtenido.padEnd(8), consulta.slice(0, 110));
}

// Lo que pide el visor nunca se redirige.
const delVisor = [
    [CANON, null],
    [CANON, '8b4e9e056dbeb5d38cb2f5190bfa7c624ddece36'],
    ['http://corteidh.or.cr/docs/casos/articulos/seriec_154_esp.pdf', null],
    ['https://www.corteidh.or.cr/docs/supervisiones/gelman_20_03_13.pdf', 'no-es-hex'],
];
for (const [u, sha1] of delVisor) {
    const pedida = urlProxyPdf(u, sha1);
    const p = puertaCorteIDH(new URLSearchParams(pedida.split('?')[1]));
    const bien = Boolean(p && p.ubicacion === null);
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', 'visor   ', pedida);
}
// Las leyes siguen igual: https → proxy, lo demás tal cual.
const ley = 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CPEUM.pdf';
const bienLey = urlProxyPdf(ley) === `/api/ley/pdf?u=${encodeURIComponent(ley)}` && urlProxyPdf('http://x.mx/a.pdf') === 'http://x.mx/a.pdf';
if (!bienLey) fallos++;
console.log(bienLey ? 'ok   ' : 'FALLA', 'leyes    sin cambio');

// La Corte fuera de la puerta (medidas, asuntos): el visor no la pide al proxy.
const bienFuera = urlProxyPdf('https://www.corteidh.or.cr/docs/medidas/algo.pdf') === null
    && urlProxyPdf('http://corteidh.or.cr/docs/asuntos/algo.pdf') === null;
if (!bienFuera) fallos++;
console.log(bienFuera ? 'ok   ' : 'FALLA', 'visor    medidas/asuntos → null (enlace directo)');

// Las redirecciones del origen, seguidas sólo si pasan la misma puerta.
const falso = (mapa) => async (u, init) => {
    if (init.redirect !== 'manual') throw new Error('sin redirect manual');
    const r = mapa[u];
    if (!r) return new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } });
    return new Response(null, { status: r[0], headers: { location: r[1] } });
};
const redirecciones = [
    // [mapa de redirecciones, esperado]
    [{}, 'sirve'],
    [{ [CANON]: [301, '/docs/casos/articulos/seriec_154_esp1.pdf'] }, 'sirve'],
    [{ [CANON]: [302, 'http://127.0.0.1/interno.pdf'] }, 'bloquea'],
    [{ [CANON]: [302, 'https://www.corteidh.or.cr/ver_ficha_tecnica.cfm?id=1'] }, 'bloquea'],
    [{ [CANON]: [302, 'https://www.corteidh.or.cr/docs/medidas/x.pdf'] }, 'bloquea'],
    [{ [CANON]: [302, CANON] }, 'bloquea'],
    [{ [CANON]: [302, ''] }, 'bloquea'],
];
for (const [mapa, esperado] of redirecciones) {
    const r = await traerCorteIDH(CANON, {}, falso(mapa));
    const obtenido = 'bloqueada' in r ? 'bloquea' : r.status === 200 ? 'sirve' : String(r.status);
    const bien = obtenido === esperado;
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', 'redirige', esperado.padEnd(8), obtenido.padEnd(8), JSON.stringify(Object.values(mapa)[0] || 'sin redirección'));
}

console.log(fallos ? `${fallos} FALLOS` : `todo bien (${casos.length + delVisor.length + 2 + redirecciones.length} casos)`);
process.exit(fallos ? 1 : 0);
