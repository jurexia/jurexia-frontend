// EL ESCRITO POR CORREO, CON APROBACIÓN, SIN RED (16-oct-2026).
//
//   node --experimental-strip-types comprobaciones/correo_escrito.mjs
//
// Corre EL MISMO código que usan el diálogo (EnviarPorCorreo.tsx) y la ruta
// /api/correo/escrito —src/lib/correo/escrito.ts, escrito-envio.ts y cupo.ts—
// con un Supabase, un Resend y un modelo de mentira. No sale nada a la red.
//
//   1. Direcciones: válidas e inválidas, pegadas de Outlook, repetidas, tope de 3.
//   2. Topes: asunto 200, mensaje 5,000, adjunto sólo .docx y hasta 8 MB, carpeta.
//   3. Escapado: HTML en el asunto, el mensaje, el nombre y el archivo; sin
//      píxeles ni enlaces con parámetros.
//   4. El remitente: «{Nombre} vía Iurexia» <escritos@iurexia.com> y
//      CORREO_ESCRITOS_FROM.
//   5. El cupo de Resend: las dos reservas, el mes, y consumoDelCupo con
//      páginas y sin la tabla.
//   6. El orden del envío: nada se gasta con una petición mala; nada sale sin
//      cupo o sin llave, y lo que no sale se devuelve.
//   7. «Proponer mensaje»: el encargo, la limpieza y lo que se devuelve.
import path from 'path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Los imports sin extensión de los .ts, como los resuelve Next.
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

const E = await import(path.join(RAIZ, 'src/lib/correo/escrito.ts'));
const F = await import(path.join(RAIZ, 'src/lib/correo/escrito-envio.ts'));
const K = await import(path.join(RAIZ, 'src/lib/correo/cupo.ts'));

let fallos = 0;
function comprueba(bien, etiqueta, detalle = '') {
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', etiqueta, detalle ? `— ${detalle}` : '');
}

// ─── 1. Direcciones ─────────────────────────────────────────────────────────
console.log('\n1. Direcciones');
const validas = ['juan.perez@gmail.com', 'ana+despacho@bufete.com.mx', 'o\'brien@correo.mx', 'x_y-z@sub.dominio.org'];
const invalidas = ['juan', 'juan@', '@gmail.com', 'juan@gmail', 'ju an@gmail.com', 'juan@@gmail.com', 'juan@gmail..com',
    '.juan@gmail.com', 'juan.@gmail.com', 'ju..an@gmail.com', 'juan@-gmail.com', 'juan@gmail.c', 'juan@gmail.com>', 'a@b.123',
    `${'a'.repeat(65)}@gmail.com`, `juan@${'a'.repeat(250)}.com`];
comprueba(validas.every(E.esCorreoValido), 'acepta las válidas', validas.filter((v) => !E.esCorreoValido(v)).join(', '));
comprueba(invalidas.every((v) => !E.esCorreoValido(v)), 'rechaza las inválidas', invalidas.filter(E.esCorreoValido).join(', '));
comprueba(E.normalizarCorreo('  <Juan.Perez@Gmail.COM>; ') === 'juan.perez@gmail.com', 'normaliza: sin ángulos, sin puntuación al final, minúsculas');
comprueba(E.normalizarCorreo('mailto:ana@x.mx') === 'ana@x.mx', 'quita «mailto:»');
const pegado = E.separarDirecciones('Juan Pérez <juan@x.com>; "Ana, Lic." <ana@y.mx>');
comprueba(JSON.stringify(pegado) === '["juan@x.com","ana@y.mx"]', 'lo que copia Outlook: «Nombre <correo>; …»', JSON.stringify(pegado));
comprueba(JSON.stringify(E.separarDirecciones('a@x.com, b@y.com;c@z.mx  d@w.org')) === '["a@x.com","b@y.com","c@z.mx","d@w.org"]', 'lista suelta: comas, puntos y coma, espacios');
const cl = E.clasificarDirecciones(['A@x.com', 'a@x.com', 'malo', 'b@y.com']);
comprueba(JSON.stringify(cl) === '{"validas":["a@x.com","b@y.com"],"invalidas":["malo"]}', 'clasifica: repetidas una vez, inválidas aparte', JSON.stringify(cl));
comprueba(E.validarDestinatarios(['a@x.com', 'b@x.com', 'c@x.com']).ok, 'tres destinatarios: pasa');
const cuatro = E.validarDestinatarios(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com']);
comprueba(!cuatro.ok && /Hasta 3/.test(cuatro.error), 'cuatro: «Hasta 3 destinatarios»', cuatro.error);
const repetidas = E.validarDestinatarios(['a@x.com', 'A@X.com', 'a@x.com', 'b@x.com']);
comprueba(repetidas.ok && repetidas.valor.length === 2, 'las repetidas no cuentan para el tope');
comprueba(!E.validarDestinatarios([]).ok && !E.validarDestinatarios('a@x.com').ok && !E.validarDestinatarios([1]).ok, 'vacío, texto suelto o no-texto: no pasa');
const mala = E.validarDestinatarios(['a@x.com', 'b@']);
comprueba(!mala.ok && mala.error.includes('«b@»'), 'nombra la dirección mala', mala.error);
const dest = E.destinatariosFinales(['cliente@x.com'], true, 'Abogada@Despacho.mx');
comprueba(JSON.stringify(dest) === '{"to":["cliente@x.com"],"cc":["abogada@despacho.mx"]}', 'copia para el abogado en CC', JSON.stringify(dest));
comprueba(E.destinatariosFinales(['abogada@despacho.mx'], true, 'abogada@despacho.mx').cc.length === 0, 'si ya va en «Para», no se copia a sí mismo');
comprueba(E.destinatariosFinales(['cliente@x.com'], false, 'abogada@despacho.mx').cc.length === 0, 'sin copia pedida, sin CC');

// ─── 2. Topes ───────────────────────────────────────────────────────────────
console.log('\n2. Topes');
comprueba(E.validarAsunto('x'.repeat(200)).ok && !E.validarAsunto('x'.repeat(201)).ok, 'asunto: 200 sí, 201 no');
comprueba(E.validarAsunto('Línea uno\r\nBcc: otro@x.com').ok && E.validarAsunto('Línea uno\r\nBcc: otro@x.com').valor === 'Línea uno Bcc: otro@x.com', 'asunto en una sola línea (sin saltos que inyecten cabeceras)');
comprueba(!E.validarAsunto('   ').ok && !E.validarAsunto(null).ok, 'asunto vacío o ausente: no pasa');
comprueba(E.validarMensaje('m'.repeat(5000)).ok && !E.validarMensaje('m'.repeat(5001)).ok, 'mensaje: 5,000 sí, 5,001 no');
const largo = E.validarMensaje('m'.repeat(5200));
comprueba(!largo.ok && largo.error.includes('5,000') && largo.error.includes('5,200'), 'el aviso dice el tope y lo que lleva', largo.error);
comprueba(E.validarMensaje('Hola\r\n\r\nAdiós  \r\n').valor === 'Hola\n\nAdiós', 'mensaje: saltos de Windows y espacios al final');
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(2044, 7)]);
const b64 = docx.toString('base64');
comprueba(E.bytesDeBase64(b64) === docx.length, 'bytes de un base64 sin decodificarlo', `${E.bytesDeBase64(b64)} vs ${docx.length}`);
comprueba(E.bytesDeBase64(Buffer.alloc(10).toString('base64')) === 10 && E.bytesDeBase64(Buffer.alloc(11).toString('base64')) === 11, 'bytes con relleno = y ==');
const ok = E.validarAdjunto({ nombre: 'Demanda de divorcio.docx', base64: b64 });
comprueba(ok.ok && ok.valor.bytes === 2048 && ok.valor.nombre === 'Demanda de divorcio.docx', 'adjunto .docx: pasa con su tamaño');
comprueba(!E.validarAdjunto({ nombre: 'virus.exe', base64: b64 }).ok && !E.validarAdjunto({ nombre: 'escrito.pdf', base64: b64 }).ok
    && !E.validarAdjunto({ nombre: 'escrito.docx.exe', base64: b64 }).ok, 'sólo .docx');
const enorme = 'A'.repeat(Math.ceil((8 * 1024 * 1024 + 3) / 3) * 4);
const t0 = Date.now();
const grande = E.validarAdjunto({ nombre: 'a.docx', base64: enorme });
comprueba(!grande.ok && /máximo es de 8 MB/.test(grande.error) && Date.now() - t0 < 200, 'más de 8 MB: no pasa, y se mide antes de leer el base64', `${grande.error} (${Date.now() - t0} ms)`);
const justo = 'A'.repeat((8 * 1024 * 1024 / 3 | 0) * 4);
comprueba(E.validarAdjunto({ nombre: 'a.docx', base64: justo }).ok, 'justo debajo de 8 MB: pasa');
comprueba(!E.validarAdjunto({ nombre: 'a.docx', base64: 'no es base64!' }).ok, 'base64 roto: no pasa');
comprueba(E.validarAdjunto(null).ok && E.validarAdjunto(null).valor === null, 'sin adjunto: pasa (null)');
comprueba(E.nombreDeAdjunto('C:\\Users\\x\\Demanda.docx') === 'Demanda.docx' && E.nombreDeAdjunto('../../etc/x.docx') === 'x.docx', 'el nombre pierde la ruta');
comprueba(E.esDocx(docx) && !E.esDocx(Buffer.from('%PDF-1.7 ...')), 'un .docx empieza por PK');
comprueba(E.tamanoLegible(512) === '512 B' && E.tamanoLegible(24_000) === '23 KB' && E.tamanoLegible(1_300_000) === '1.2 MB', 'tamaño legible', [512, 24_000, 1_300_000].map(E.tamanoLegible).join(' · '));
const base = { accion: 'enviar', para: ['cliente@x.com'], copia_para_mi: true, asunto: 'Demanda', mensaje: 'Le envío la demanda.' };
comprueba(E.validarEnvio(base).ok && E.validarEnvio(base).envio.expedienteId === null, 'envío mínimo: pasa');
const conCarpeta = E.validarEnvio({ ...base, expediente_id: '8F14E45F-CEEA-467A-9E6B-1D2A3C4B5D6E' });
comprueba(conCarpeta.ok && conCarpeta.envio.expedienteId === '8f14e45f-ceea-467a-9e6b-1d2a3c4b5d6e', 'carpeta uuid: pasa, en minúsculas');
const carpetaMala = E.validarEnvio({ ...base, expediente_id: "1' or '1'='1" });
comprueba(!carpetaMala.ok && carpetaMala.campo === 'expediente_id', 'carpeta que no es uuid: no pasa');
comprueba(E.validarEnvio({ ...base, copia_para_mi: 'sí' }).envio.copiaParaMi === false, 'copia sólo con true de verdad');
comprueba(E.validarEnvio({ ...base, clave: 'abc' }).envio.clave === null && E.validarEnvio({ ...base, clave: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }).envio.clave !== null, 'clave de reintento: sólo con forma de uuid');

// ─── 3. Escapado ────────────────────────────────────────────────────────────
console.log('\n3. Escapado');
const ataque = E.armarCorreo({
    firma: E.nombreDeFirma('Ana <b>Pérez</b> "jefa"', 'ana@x.mx'),
    asunto: '</title><script>alert(1)</script>',
    mensaje: 'Estimado <img src=x onerror=alert(1)>:\n\nVer <a href="https://malo.com">aquí</a> & "más"\nsegunda línea',
    adjunto: { nombre: '<svg onload=alert(1)>.docx', bytes: 2048 },
});
const h = ataque.html;
comprueba(!/<script|<img|<svg|<a href="https:\/\/malo/i.test(h), 'ninguna etiqueta del abogado llega viva al HTML');
comprueba(h.includes('&lt;/title&gt;&lt;script&gt;') && h.includes('&lt;img src=x onerror=alert(1)&gt;') && h.includes('&amp; &quot;más&quot;'), 'asunto y mensaje escapados');
comprueba(h.includes('&lt;svg onload=alert(1)&gt;.docx'), 'el nombre del archivo, escapado');
comprueba(h.includes('segunda línea') && /aquí&lt;\/a&gt; &amp; &quot;más&quot;<br>segunda línea/.test(h), 'un salto suelto es <br>');
comprueba((h.match(/<p style=/g) || []).length === 2, 'dos párrafos: la línea en blanco separa');
comprueba(!/<img|utm_|pixel|track|open\?|width="1" height="1"/i.test(h), 'sin píxeles ni enlaces con parámetros');
comprueba(h.includes('Este correo lo envió Ana b Pérez /b jefa desde Iurexia. Para responder, contesta este mensaje: le llega directamente.'), 'el pie, con el nombre limpio', (h.match(/Este correo lo envió[^<]*/) || [''])[0]);
comprueba(ataque.texto.startsWith('Estimado <img src=x onerror=alert(1)>:') && ataque.texto.includes('Archivo adjunto: <svg onload=alert(1)>.docx (2 KB)') && ataque.texto.trimEnd().endsWith('le llega directamente.'), 'el texto plano va tal cual (no es HTML)');
const sinAdjunto = E.armarCorreo({ firma: 'Ana', asunto: 'A', mensaje: 'Hola', adjunto: null });
comprueba(!sinAdjunto.html.includes('Archivo adjunto') && !sinAdjunto.texto.includes('Archivo adjunto'), 'sin adjunto no se menciona archivo');
comprueba(h.includes('<span style="font-family:Georgia,\'Times New Roman\',serif;font-weight:600;color:#1a1a1a;">Iurexia</span>'), 'la marca en Georgia 600 (regla del wordmark)');
comprueba((h.match(/width:100%;max-width:600px/g) || []).length === 2 && !/width:600px;max-width:100%/.test(h)
    && h.includes('<!--[if mso]><table role="presentation" width="600"') && h.includes('<!--[if mso]></td></tr></table><![endif]-->'),
    'fluido en el teléfono (100% hasta 600) y 600 fijos para Outlook');

// ─── 4. El remitente ────────────────────────────────────────────────────────
console.log('\n4. El remitente');
const r1 = E.remitenteDe('José David Alcántar', 'jdm@x.com');
comprueba(r1.cabecera === '"José David Alcántar vía Iurexia" <escritos@iurexia.com>', 'por omisión', r1.cabecera);
const r2 = E.remitenteDe('Ana "La Jefa" <ana@banco.com>\r\nBcc: todos@x.com', 'ana@x.mx');
comprueba(!/["<>@\r\n].*vía/.test(r2.nombre) && r2.cabecera.startsWith('"Ana La Jefa ana banco.com Bcc: todos x.com vía Iurexia" <escritos@iurexia.com>'), 'comillas, ángulos, arrobas y saltos fuera del nombre', r2.cabecera);
comprueba(E.remitenteDe(null, 'lic.ana_perez@gmail.com').nombre === 'lic ana perez vía Iurexia', 'sin nombre: la parte local del correo', E.remitenteDe(null, 'lic.ana_perez@gmail.com').nombre);
comprueba(E.remitenteDe('', '').nombre === 'Tu abogado vía Iurexia', 'sin nada: «Tu abogado»');
const largoN = E.nombreDeFirma('María de los Ángeles Guadalupe Hernández Fernández de Córdoba y Sotomayor', null);
comprueba(largoN.length <= 60 && !largoN.endsWith(' '), 'nombre largo: cortado en palabra', largoN);
comprueba(E.remitenteDe('Ana', 'a@x.mx', 'avisos@iurexia.com').cabecera === '"Ana vía Iurexia" <avisos@iurexia.com>', 'CORREO_ESCRITOS_FROM con dirección sola');
comprueba(E.remitenteDe('Ana', 'a@x.mx', '"{nombre} · Despacho" <escritos@iurexia.com>').cabecera === '"Ana · Despacho" <escritos@iurexia.com>', 'CORREO_ESCRITOS_FROM con plantilla {nombre}');
comprueba(E.remitenteDe('Ana', 'a@x.mx', 'esto no es un remitente').cabecera === '"Ana vía Iurexia" <escritos@iurexia.com>', 'CORREO_ESCRITOS_FROM roto: el de omisión');

// ─── 5. El cupo de Resend ───────────────────────────────────────────────────
console.log('\n5. El cupo de Resend');
const L = { diario: 100, mensual: 3000, reservaTransaccional: 30, reservaEscritos: 20 };
const c0 = { campaniasHoy: 0, campaniasMes: 0, escritosHoy: 0, escritosMes: 0, escritosActivos: true, fallo: null };
comprueba(K.cupoDeCampanias(c0, L).cupo === 50 && K.cupoDeCampanias(c0, L).tope_diario === 50, 'campañas: 100 − 30 − 20 = 50');
comprueba(K.cupoDeCampanias({ ...c0, escritosActivos: false }, L).cupo === 70, 'sin tabla de escritos: las campañas siguen con 70, como antes');
comprueba(K.cupoDeCampanias({ ...c0, escritosHoy: 12 }, L).cupo === 50, 'escritos dentro de su reserva: no restan a campañas');
comprueba(K.cupoDeCampanias({ ...c0, escritosHoy: 26 }, L).cupo === 44, 'escritos por encima de la reserva: lo de más sale de campañas');
comprueba(K.margenDeEscritos({ ...c0, campaniasHoy: 50 }, L) === 20, 'tras el bloque de las 7:00 quedan 20 para escritos');
comprueba(K.margenDeEscritos({ ...c0, campaniasHoy: 50, escritosHoy: 21 }, L) === -1, 'el que no cabe da negativo');
comprueba(K.margenDeEscritos({ ...c0, campaniasHoy: 10, escritosHoy: 60 }, L) === 0, 'si las campañas no gastaron, los escritos pueden pasar de su reserva sin tocar los 30');
for (const [campHoy, escHoy] of [[0, 0], [50, 0], [0, 25], [45, 25], [50, 20], [10, 60]]) {
    const c = { ...c0, campaniasHoy: campHoy, escritosHoy: escHoy };
    const totalSiCampanias = campHoy + escHoy + K.cupoDeCampanias(c, L).cupo;
    const totalSiEscritos = campHoy + escHoy + Math.max(0, K.margenDeEscritos(c, L));
    comprueba(totalSiCampanias <= 70 && totalSiEscritos <= 70, `la reserva de 30 queda intacta (campañas ${campHoy}, escritos ${escHoy})`, `${totalSiCampanias} / ${totalSiEscritos}`);
}
comprueba(K.margenDeEscritos({ ...c0, campaniasMes: 2000, escritosMes: 99 }, L) === 1, 'el mes también manda: 3,000 − 900 − lo gastado');
comprueba(K.unidadesDe({ para: ['a', 'b'], cc: ['c'] }) === 3, 'cada destinatario es un correo (para + cc)');
comprueba(K.inicioDelDiaUTC(new Date('2026-10-16T23:30:00-06:00')) === '2026-10-17T00:00:00.000Z', 'el día es el UTC de Resend: las 23:30 de México ya son el 17');

function dbDeMentira({ campHoy = 0, campMes = 0, escritos = [], errorEscritos = null }) {
    const llamadas = [];
    return {
        llamadas,
        from(tabla) {
            const e = { tabla, filtros: {}, rango: null };
            const q = {
                select() { return q; },
                eq(k, v) { e.filtros[k] = v; return q; },
                in(k, v) { e.filtros[k] = v; return q; },
                gte(k, v) { e.filtros['>=' + k] = v; return q; },
                order() { return q; },
                range(a, b) { e.rango = [a, b]; return q; },
                then(ok, mal) {
                    llamadas.push(e);
                    let r;
                    if (tabla === 'correo_envios') {
                        r = { count: e.filtros['>=enviado_at'].slice(8, 10) === '01' ? campMes : campHoy, error: null };
                    } else if (errorEscritos) {
                        r = { data: null, error: errorEscritos };
                    } else {
                        const filas = escritos.filter((f) => e.filtros.estado.includes(f.estado) && Date.parse(f.created_at) >= Date.parse(e.filtros['>=created_at']));
                        r = { data: filas.slice(e.rango[0], e.rango[1] + 1), error: null };
                    }
                    return Promise.resolve(r).then(ok, mal);
                },
            };
            return q;
        },
    };
}
const AHORA = new Date('2026-10-16T19:00:00Z');
const muchos = Array.from({ length: 2150 }, (_, i) => ({
    estado: i % 10 === 0 ? 'fallido' : i % 7 === 0 ? 'enviando' : 'enviado',
    para: ['a@x.com'], cc: i % 2 ? ['b@x.com'] : [],
    created_at: i < 2100 ? '2026-10-05T12:00:00+00:00' : '2026-10-16T15:00:00+00:00',
}));
const esperadoMes = muchos.filter((f) => f.estado !== 'fallido').reduce((s, f) => s + 1 + f.cc.length, 0);
const esperadoHoy = muchos.slice(2100).filter((f) => f.estado !== 'fallido').reduce((s, f) => s + 1 + f.cc.length, 0);
const db = dbDeMentira({ campHoy: 40, campMes: 700, escritos: muchos });
const cons = await K.consumoDelCupo(db, AHORA);
comprueba(cons.campaniasHoy === 40 && cons.campaniasMes === 700, 'campañas: hoy y mes de correo_envios');
const filasQueCuentan = muchos.filter((f) => f.estado !== 'fallido').length;
comprueba(cons.escritosMes === esperadoMes && cons.escritosHoy === esperadoHoy, 'escritos: suma de destinatarios, sin los fallidos', `${cons.escritosHoy}/${esperadoHoy} hoy · ${cons.escritosMes}/${esperadoMes} mes`);
const paginas = db.llamadas.filter((l) => l.tabla === 'correos_abogado').length;
comprueba(paginas === Math.floor(filasQueCuentan / 1000) + 1 && cons.fallo === null && cons.escritosActivos, 'pagina de mil en mil', `${filasQueCuentan} renglones en ${paginas} páginas`);
const exacto = Array.from({ length: 2000 }, () => ({ estado: 'enviado', para: ['a@x.com'], cc: [], created_at: '2026-10-16T15:00:00+00:00' }));
const dbExacto = dbDeMentira({ escritos: exacto });
const consExacto = await K.consumoDelCupo(dbExacto, AHORA);
comprueba(consExacto.escritosHoy === 2000 && dbExacto.llamadas.filter((l) => l.tabla === 'correos_abogado').length === 3, 'con 2,000 justos pide una página más y para');
const sinTabla = await K.consumoDelCupo(dbDeMentira({ errorEscritos: { code: 'PGRST205', message: "Could not find the table 'public.correos_abogado' in the schema cache" } }), AHORA);
comprueba(!sinTabla.escritosActivos && sinTabla.fallo === null, 'sin la tabla: escritos inactivos, sin fallo (las campañas siguen)');
const caida = await K.consumoDelCupo(dbDeMentira({ errorEscritos: { code: '57014', message: 'canceling statement due to statement timeout' } }), AHORA);
comprueba(caida.escritosActivos && /timeout/.test(caida.fallo ?? ''), 'base caída: queda el fallo (un escrito no sale a ciegas)');

// ─── 6. El orden del envío ──────────────────────────────────────────────────
console.log('\n6. El orden del envío');
const ABOGADA = { id: 'u-1', plan: 'pro_monthly', nombre: 'Ana Pérez', correo: 'ana@despacho.mx', correoConfirmado: true };
function deps(over = {}) {
    const reg = { gastos: [], devoluciones: [], reservas: [], marcas: [], envios: [] };
    const d = {
        gastar: async (f) => { reg.gastos.push(f); return { permitido: true }; },
        devolver: async (f) => { reg.devoluciones.push(f); },
        carpetaEsSuya: async (id) => id === '8f14e45f-ceea-467a-9e6b-1d2a3c4b5d6e',
        reservar: async (fila) => { reg.reservas.push(fila); return { id: 'fila-1' }; },
        marcar: async (id, c) => { reg.marcas.push({ id, ...c }); },
        consumo: async () => ({ ...c0, campaniasHoy: 50, escritosHoy: 2 }),
        hayLlave: true,
        enviar: async (correo, idem) => { reg.envios.push({ correo, idem }); return { id: 're_123' }; },
        remitente: null,
        limites: L,
        ahora: () => new Date('2026-10-16T20:32:00Z'),
        ...over,
    };
    return { d, reg };
}
const pedido = {
    accion: 'enviar', para: ['Cliente@Correo.com'], copia_para_mi: true, asunto: 'Demanda de divorcio',
    mensaje: 'Estimado Sr. García:\n\nLe envío la demanda para su revisión.\n\nAtentamente,\nAna Pérez',
    adjunto: { nombre: 'Demanda de divorcio.docx', base64: b64 },
    expediente_id: '8f14e45f-ceea-467a-9e6b-1d2a3c4b5d6e', clave: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
};
{
    const { d, reg } = deps();
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 200 && r.cuerpo.ok && r.cuerpo.id === 'fila-1' && r.cuerpo.enviado_at === '2026-10-16T20:32:00.000Z', 'envío bueno: 200 con id y hora', JSON.stringify(r.cuerpo));
    const c = reg.envios[0]?.correo;
    comprueba(c?.from === '"Ana Pérez vía Iurexia" <escritos@iurexia.com>' && c?.replyTo === 'ana@despacho.mx', 'de Iurexia, con respuesta al abogado');
    comprueba(JSON.stringify(c?.to) === '["cliente@correo.com"]' && JSON.stringify(c?.cc) === '["ana@despacho.mx"]', 'para el cliente, copia al abogado');
    comprueba(c?.attachments?.[0]?.filename === 'Demanda de divorcio.docx' && Buffer.isBuffer(c.attachments[0].content) && c.attachments[0].content.equals(docx)
        && c.attachments[0].contentType === F.TIPO_DOCX, 'el Word va como Buffer, idéntico');
    comprueba(c?.html.includes('Le envío la demanda para su revisión.') && c?.text.includes('Archivo adjunto: Demanda de divorcio.docx (2 KB)'), 'HTML y texto');
    comprueba(reg.envios[0]?.idem === 'escrito-f47ac10b-58cc-4372-a567-0e02b2c3d479', 'la clave de reintento llega a Resend');
    comprueba(JSON.stringify(reg.gastos) === '["correo"]' && reg.devoluciones.length === 0, 'gasta un «correo» y no devuelve nada');
    comprueba(reg.reservas[0]?.adjunto_bytes === 2048 && reg.reservas[0]?.expediente_id === pedido.expediente_id && JSON.stringify(reg.reservas[0]?.cc) === '["ana@despacho.mx"]', 'el renglón «enviando» con lo que va a salir');
    comprueba(reg.marcas[0]?.estado === 'enviado' && reg.marcas[0]?.resend_id === 're_123', 'y queda «enviado» con el id de Resend');
}
const malos = [
    ['sin destinatarios', { ...pedido, para: [] }, 400],
    ['cuatro destinatarios', { ...pedido, para: ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'] }, 400],
    ['asunto de 201', { ...pedido, asunto: 'x'.repeat(201) }, 400],
    ['mensaje de 5,001', { ...pedido, mensaje: 'x'.repeat(5001) }, 400],
    ['adjunto .pdf', { ...pedido, adjunto: { nombre: 'a.pdf', base64: b64 } }, 400],
    ['adjunto que no es Word', { ...pedido, adjunto: { nombre: 'a.docx', base64: Buffer.from('%PDF-1.7 hola mundo').toString('base64') } }, 400],
    ['carpeta ajena', { ...pedido, expediente_id: '00000000-0000-4000-8000-000000000000' }, 404],
];
for (const [nombre, cuerpo, esperado] of malos) {
    const { d, reg } = deps();
    const r = await F.enviarEscrito(ABOGADA, cuerpo, d);
    comprueba(r.status === esperado && reg.gastos.length === 0 && reg.reservas.length === 0 && reg.envios.length === 0, `${nombre}: ${esperado} y no gasta nada`, `${r.status} ${r.cuerpo.error}`);
}
{
    const { d, reg } = deps();
    const r = await F.enviarEscrito({ ...ABOGADA, plan: 'gratuito' }, pedido, d);
    comprueba(r.status === 403 && r.cuerpo.codigo === 'plan' && /desde el plan Básico/.test(r.cuerpo.error) && reg.gastos.length === 0, 'plan gratuito: 403 con el mensaje de Básico, sin gastar', r.cuerpo.error);
}
{
    const { d, reg } = deps();
    const r = await F.enviarEscrito({ ...ABOGADA, correoConfirmado: false }, pedido, d);
    comprueba(r.status === 403 && r.cuerpo.codigo === 'correo_sin_confirmar' && reg.gastos.length === 0, 'correo sin confirmar: no se presta el «responder a»');
}
{
    const { d, reg } = deps({ gastar: async (f) => { reg.gastos.push(f); return { permitido: false, mensaje: 'Llegaste a tus 30 correos de hoy. Con un plan superior tienes más.' }; } });
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 429 && r.cuerpo.codigo === 'limite' && reg.reservas.length === 0 && reg.envios.length === 0, 'tope del plan: 429 con su mensaje, sin renglón ni envío', r.cuerpo.error);
}
{
    const { d, reg } = deps({ consumo: async () => ({ ...c0, campaniasHoy: 50, escritosHoy: 21 }) });
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 503 && r.cuerpo.codigo === 'cupo' && reg.envios.length === 0, 'sin cupo de Resend: 503 amable y no sale', r.cuerpo.error);
    comprueba(reg.marcas[0]?.estado === 'fallido' && /sin cupo/.test(reg.marcas[0]?.error) && JSON.stringify(reg.devoluciones) === '["correo"]', 'renglón «fallido» y el envío del día devuelto');
}
{
    const { d, reg } = deps({ consumo: async () => ({ ...c0, fallo: 'timeout' }) });
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 503 && reg.envios.length === 0 && reg.devoluciones.length === 1, 'cupo ilegible: no sale a ciegas');
}
{
    const { d, reg } = deps({ hayLlave: false });
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 503 && reg.envios.length === 0 && reg.marcas[0]?.error === 'falta RESEND_API_KEY' && reg.devoluciones.length === 1, 'sin RESEND_API_KEY: 503, «fallido» y devuelto', r.cuerpo.error);
}
{
    const { d, reg } = deps({ enviar: async () => ({ error: 'The iurexia.com domain is not verified' }) });
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 503 && reg.marcas[0]?.estado === 'fallido' && /resend: The iurexia/.test(reg.marcas[0]?.error) && reg.devoluciones.length === 1, 'Resend falla: 503 amable, el error en el renglón y devuelto');
    comprueba(!/iurexia\.com domain/.test(r.cuerpo.error), 'el error técnico no se le enseña al abogado', r.cuerpo.error);
}
{
    const { d, reg } = deps({ enviar: async () => { throw new Error('fetch failed'); } });
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 503 && reg.marcas[0]?.estado === 'fallido' && reg.devoluciones.length === 1, 'Resend lanza: igual');
}
{
    const { d, reg } = deps({ reservar: async () => null });
    const r = await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(r.status === 503 && reg.envios.length === 0 && reg.devoluciones.length === 1, 'sin renglón no hay envío (el cupo no se podría contar)');
}
{
    const orden = [];
    const { d } = deps({
        gastar: async () => { orden.push('gastar'); return { permitido: true }; },
        reservar: async () => { orden.push('reservar'); return { id: 'f' }; },
        consumo: async () => { orden.push('cupo'); return { ...c0 }; },
        enviar: async () => { orden.push('enviar'); return { id: 'r' }; },
        marcar: async () => { orden.push('marcar'); },
    });
    await F.enviarEscrito(ABOGADA, pedido, d);
    comprueba(orden.join(' → ') === 'gastar → reservar → cupo → enviar → marcar', 'el orden: gastar → renglón → cupo → enviar → marcar', orden.join(' → '));
}
{
    const { d, reg } = deps();
    const { adjunto, ...sinAdj } = pedido;
    const r = await F.enviarEscrito(ABOGADA, { ...sinAdj, copia_para_mi: false, expediente_id: null }, d);
    comprueba(r.status === 200 && !reg.envios[0].correo.attachments && !reg.envios[0].correo.cc && reg.reservas[0].adjunto_nombre === null, 'sin adjunto ni copia: sólo el mensaje');
}
const g = F.datosDeEnvio({ ...ABOGADA, plan: 'gratuito' }, null, null);
comprueba(!g.disponible && g.mensaje === 'Enviar escritos por correo desde Iurexia está disponible desde el plan Básico.', 'GET, gratuito: no disponible, con el texto de mensajeLimite');
const p = F.datosDeEnvio(ABOGADA, null, 3);
comprueba(p.disponible && p.limite === 30 && p.usados === 3 && p.de === '"Ana Pérez vía Iurexia" <escritos@iurexia.com>' && p.responder_a === 'ana@despacho.mx', 'GET, Pro: 30 al día, quién firma y a quién se responde');

// ─── 7. «Proponer mensaje» ──────────────────────────────────────────────────
console.log('\n7. «Proponer mensaje»');
const escrito = 'DEMANDA DE DIVORCIO INCAUSADO. C. JUEZ DE LO FAMILIAR. ' + 'Hechos y fundamentos. '.repeat(600) + 'PUNTOS PETITORIOS. PROTESTO LO NECESARIO. Ana Pérez.';
const enc = E.encargoDePropuesta({ abogado: 'Ana Pérez', destinatario: 'Sr. Luis García', titulo: 'Demanda de divorcio', texto: escrito, adjunto: true });
comprueba(enc.usuario.includes('Abogado que firma: Ana Pérez') && enc.usuario.includes('Destinatario: Sr. Luis García') && enc.usuario.includes('Adjunto: sí'), 'los datos del envío');
comprueba(enc.usuario.includes('DEMANDA DE DIVORCIO INCAUSADO') && enc.usuario.includes('PROTESTO LO NECESARIO') && enc.usuario.includes('[…]') && enc.usuario.length < 7200, 'extracto: el principio y el final, no el escrito entero', `${enc.usuario.length} caracteres de ${escrito.length}`);
comprueba(E.encargoDePropuesta({ abogado: 'A', titulo: 't', texto: 'x', adjunto: false }).usuario.includes('Destinatario: no se conoce su nombre'), 'sin destinatario: no se inventa');
comprueba(E.extractoDelEscrito('DEMANDA\n\n\n\nC. JUEZ  \n  PRESENTE  hoy') === 'DEMANDA\n\nC. JUEZ\nPRESENTE hoy', 'el texto de la hoja (innerText): párrafos separados, sin blancos de sobra', JSON.stringify(E.extractoDelEscrito('DEMANDA\n\n\n\nC. JUEZ  \n  PRESENTE  hoy')));
comprueba(/usted/.test(enc.sistema) && /sin añadirle títulos/.test(enc.sistema) && /Ningún dato que no esté/.test(enc.sistema) && /consejo/.test(enc.sistema) && /JSON/.test(enc.sistema), 'el encargo: usted, firma tal cual, sin datos inventados ni consejo, JSON');
comprueba(!/Estimad[oa]|Atentamente|Le envío|Por medio del presente/i.test(enc.sistema), 'el encargo no trae un correo de ejemplo que copiar');
const limpia = E.propuestaDe({ asunto: 'Asunto: «Demanda de divorcio para su revisión»', mensaje: '**Estimado Sr. García:**\\n\\nLe envío…\n\n\n\nAtentamente,\nAna Pérez' });
comprueba(limpia?.asunto === 'Demanda de divorcio para su revisión' && limpia?.mensaje === 'Estimado Sr. García:\n\nLe envío…\n\nAtentamente,\nAna Pérez', 'limpia «Asunto:», comillas, negritas y saltos', JSON.stringify(limpia));
comprueba(E.propuestaDe({ asunto: 'x' }) === null && E.propuestaDe(null) === null && E.propuestaDe({ asunto: '', mensaje: 'm' }) === null, 'lo que no sirve: null');
comprueba((E.propuestaDe({ asunto: 'palabra '.repeat(40), mensaje: 'm'.repeat(6000) })?.asunto.length ?? 999) <= 200 && E.propuestaDe({ asunto: 'a', mensaje: 'm'.repeat(6000) }).mensaje.length === 5000, 'dentro de los topes');
{
    const reg = { gastos: [], devoluciones: [], encargos: [] };
    const dp = (over = {}) => ({
        gastar: async (f) => { reg.gastos.push(f); return { permitido: true }; },
        devolver: async (f) => { reg.devoluciones.push(f); },
        completar: async (e) => { reg.encargos.push(e); return '```json\n{"asunto":"Demanda de divorcio","mensaje":"Estimado Sr. García:\\n\\nLe envío la demanda.\\n\\nAtentamente,\\nAna Pérez"}\n```'; },
        jsonDe: (t) => { const l = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); try { return JSON.parse(l); } catch { return null; } },
        ...over,
    });
    const r = await F.proponerMensaje(ABOGADA, { accion: 'proponer', titulo: 'Demanda', texto: escrito, destinatario: 'Sr. Luis García' }, dp());
    comprueba(r.status === 200 && r.cuerpo.asunto === 'Demanda de divorcio' && r.cuerpo.mensaje.startsWith('Estimado Sr. García:'), 'propuesta buena: 200 con asunto y mensaje');
    comprueba(JSON.stringify(reg.gastos) === '["redaccion"]' && reg.encargos[0]?.json === true && reg.encargos[0]?.maxTokens <= 1200, 'gasta «redaccion» (no «correo») y pide JSON');
    const g1 = reg.gastos.length;
    const r2 = await F.proponerMensaje({ ...ABOGADA, plan: 'gratuito' }, { texto: escrito }, dp());
    comprueba(r2.status === 403 && reg.gastos.length === g1, 'gratuito: 403 sin gastar redacción en un correo que no podría enviar');
    const r3 = await F.proponerMensaje(ABOGADA, { texto: '   ' }, dp());
    comprueba(r3.status === 400 && reg.gastos.length === g1, 'documento vacío: 400 sin gastar');
    const r4 = await F.proponerMensaje(ABOGADA, { texto: escrito }, dp({ completar: async () => { throw new Error('OpenRouter 502'); } }));
    comprueba(r4.status === 503 && JSON.stringify(reg.devoluciones) === '["redaccion"]' && !/OpenRouter/.test(r4.cuerpo.error), 'el modelo falla: 503 amable y se devuelve la redacción', r4.cuerpo.error);
    const r5 = await F.proponerMensaje(ABOGADA, { texto: escrito }, dp({ completar: async () => 'no es json' }));
    comprueba(r5.status === 503 && reg.devoluciones.length === 2, 'respuesta ilegible: igual');
    const r6 = await F.proponerMensaje(ABOGADA, { texto: escrito }, dp({ gastar: async () => ({ permitido: false, mensaje: 'Llegaste a tus 150 cambios de redacción de hoy.' }) }));
    comprueba(r6.status === 429 && r6.cuerpo.codigo === 'limite', 'tope de redacción: 429 con su mensaje');
}

console.log(fallos ? `\n${fallos} FALLA(S)` : '\nTodo en orden.');
process.exit(fallos ? 1 : 0);
