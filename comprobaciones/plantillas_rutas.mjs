// LAS RUTAS /api/plantillas, DE VERDAD Y SIN RED (16-oct-2026).
//
//   node --experimental-strip-types comprobaciones/plantillas_rutas.mjs
//
// Corre los MISMOS manejadores de src/app/api/plantillas/** con un `fetch` de
// mentira que hace de Supabase (auth, PostgREST, storage y la función
// gastar_uso_funcion) y de OpenRouter. Nada sale de la máquina: las llaves son
// de relleno y cualquier otra dirección revienta la prueba.
//
//   1. Sin sesión: 401. Archivo que no es Word: 400 y no gasta nada.
//   2. Subir: valida, cuenta el tope de guardadas, gasta UNA detección, llama
//      al modelo, guarda el original en plantillas/<uid>/<id>/ y devuelve la
//      propuesta con la vista previa. El modelo caído: igual se sube, con aviso.
//   3. Un usuario no ve, ni cambia, ni borra, ni usa la plantilla de otro, ni
//      llena con la carpeta de otro.
//   4. Campos: revalida, marca, guarda marcado.docx. Generar: lo que falta lo
//      toma de la carpeta, gasta UN uso por documento, suma veces_usada; tope
//      del día; 409 si no está revisada; formato json.
//   5. Renombrar, borrar (con sus archivos) y la migración sin aplicar (503).
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
        const extensiones = /^(\\.|\\/|file:)/.test(spec) ? ['.ts', '.tsx', '/index.ts'] : ['.js'];
        for (const ext of extensiones) { try { return await next(spec + ext, ctx); } catch {} }
        throw e;
    }
}`));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://falso.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-de-relleno';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'servicio-de-relleno';
process.env.OPENROUTER_API_KEY = 'openrouter-de-relleno';

let fallos = 0;
function comprueba(bien, etiqueta, detalle = '') {
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', etiqueta, detalle ? `— ${detalle}` : '');
}

// ─── El mundo de mentira ────────────────────────────────────────────────────
const ANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const BETO = 'bbbbbbbb-0000-4000-8000-000000000002';
const EXP_ANA = 'eeeeeeee-0000-4000-8000-00000000000a';
const EXP_BETO = 'eeeeeeee-0000-4000-8000-00000000000b';
const TOKENS = { 'token-ana': ANA, 'token-beto': BETO };
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const tablas = {
    user_profiles: [
        { id: ANA, subscription_type: 'pro_monthly', full_name: 'Lic. Ana', email: 'ana@prueba.test', suspendido_at: null },
        { id: BETO, subscription_type: 'gratuito', full_name: 'Beto', email: 'beto@prueba.test', suspendido_at: null },
    ],
    expedientes: [
        { id: EXP_ANA, user_id: ANA, tipo: 'cliente', titulo: 'Ana Sofía Méndez Robles', cliente_nombre: 'Ana Sofía Méndez Robles', cliente_domicilio: 'Calle Morelos 45, Centro', cliente_correo: 'ana.mendez@ejemplo.mx', cliente_telefono: '442 123 4567', materia: 'civil', pretension: 'Alimentos' },
        { id: EXP_BETO, user_id: BETO, tipo: 'asunto', titulo: 'Amparo contra el IMSS', cliente_nombre: 'Amparo contra el IMSS', materia: 'amparo' },
    ],
    plantillas_abogado: [],
    uso_funciones: [],
};
const archivos = new Map();
const llamadas = { modelo: 0, ajenas: [] };
let modeloCaido = false;
let sinEsquema = false;

const json = (cuerpo, status = 200, extra = {}) => new Response(cuerpo === null ? null : JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', ...extra } });

function filtrar(filas, q) {
    let fuera = filas;
    for (const [k, v] of q.entries()) {
        if (['select', 'order', 'limit', 'offset', 'columns'].includes(k)) continue;
        if (v.startsWith('eq.')) fuera = fuera.filter((f) => String(f[k]) === v.slice(3));
        else if (v.startsWith('in.(')) { const xs = v.slice(4, -1).split(',').map((x) => x.replace(/^"|"$/g, '')); fuera = fuera.filter((f) => xs.includes(String(f[k]))); }
        else if (v.startsWith('gte.')) fuera = fuera.filter((f) => String(f[k]) >= v.slice(4));
    }
    return fuera;
}

const SUGERENCIA = {
    descripcion: 'Demanda de pensión alimenticia', materia: 'familiar',
    huecos: [{ n: 1, clave: 'fecha_escrito', etiqueta: 'Fecha del escrito', origen: 'fecha_hoy' }],
    campos: [
        { texto: 'MARÍA GUADALUPE TORRES RUIZ', clave: 'actora_nombre', etiqueta: 'Nombre de la actora', origen: 'carpeta.cliente_nombre', ejemplo: 'MARÍA GUADALUPE TORRES RUIZ' },
        { texto: 'Avenida Zaragoza 210, Colonia Centro', clave: 'actora_domicilio', etiqueta: 'Domicilio de la actora', origen: 'carpeta.cliente_domicilio' },
        { texto: '412/2025', clave: 'expediente', etiqueta: 'Expediente', origen: 'manual' },
        { texto: 'No existe en el documento', clave: 'fantasma', etiqueta: 'Fantasma', origen: 'manual' },
    ],
};

globalThis.fetch = async (entrada, init = {}) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada.url);
    const metodo = (init.method || (typeof entrada === 'object' && entrada.method) || 'GET').toUpperCase();
    const cab = new Headers(init.headers || (typeof entrada === 'object' ? entrada.headers : undefined));
    if (url.origin === 'https://openrouter.ai') {
        llamadas.modelo++;
        if (modeloCaido) return json({ error: 'caído' }, 503);
        return json({ choices: [{ message: { content: '```json\n' + JSON.stringify(SUGERENCIA) + '\n```' } }] });
    }
    if (url.origin !== 'https://falso.supabase.co') { llamadas.ajenas.push(url.href); throw new Error(`Red prohibida en la prueba: ${url.href}`); }
    const ruta = url.pathname;
    if (ruta === '/auth/v1/user') {
        const uid = TOKENS[(cab.get('Authorization') || '').replace('Bearer ', '')];
        return uid ? json({ id: uid, aud: 'authenticated', email: `${uid}@prueba.test`, user_metadata: {} }) : json({ msg: 'invalid' }, 401);
    }
    if (ruta.startsWith('/storage/v1/object/')) {
        const resto = decodeURIComponent(ruta.slice('/storage/v1/object/'.length));
        if (metodo === 'DELETE') {
            const { prefixes } = JSON.parse(String(init.body));
            const bucket = resto;
            for (const p of prefixes) archivos.delete(`${bucket}/${p}`);
            return json(prefixes.map((p) => ({ name: p })));
        }
        if (sinEsquema) return json({ statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' }, 400);
        if (metodo === 'GET') {
            const b = archivos.get(resto);
            return b ? new Response(b, { status: 200 }) : json({ statusCode: '404', error: 'not_found', message: 'Object not found' }, 400);
        }
        const cuerpo = init.body;
        const bytes = cuerpo instanceof Uint8Array ? cuerpo : new Uint8Array(await new Response(cuerpo).arrayBuffer());
        archivos.set(resto, bytes);
        return json({ Key: resto, Id: crypto.randomUUID() });
    }
    if (ruta === '/rest/v1/rpc/gastar_uso_funcion') {
        const { p_user, p_funcion, p_limite, p_periodo } = JSON.parse(String(init.body));
        const suyas = tablas.uso_funciones.filter((u) => u.user_id === p_user && u.funcion === p_funcion && (p_periodo === 'mes' ? u.dia.slice(0, 7) === hoy.slice(0, 7) : u.dia === hoy));
        const n = suyas.reduce((s, u) => s + u.n, 0);
        if (n >= p_limite) return json([{ permitido: false, usados: n }]);
        const fila = tablas.uso_funciones.find((u) => u.user_id === p_user && u.funcion === p_funcion && u.dia === hoy);
        if (fila) fila.n++; else tablas.uso_funciones.push({ user_id: p_user, funcion: p_funcion, dia: hoy, n: 1 });
        return json([{ permitido: true, usados: n + 1 }]);
    }
    if (!ruta.startsWith('/rest/v1/')) throw new Error(`Supabase: ruta inesperada ${ruta}`);
    const tabla = ruta.slice('/rest/v1/'.length);
    if (sinEsquema && tabla === 'plantillas_abogado') return json({ code: 'PGRST205', message: "Could not find the table 'public.plantillas_abogado' in the schema cache" }, 404);
    const filas = tablas[tabla];
    if (!filas) throw new Error(`Supabase: tabla inesperada ${tabla}`);
    const objeto = (cab.get('Accept') || '').includes('vnd.pgrst.object');
    const prefer = cab.get('Prefer') || '';
    const responder = (sel, status = 200) => {
        if (objeto) return sel.length === 1 ? json(sel[0], status) : json({ code: 'PGRST116', details: `The result contains ${sel.length} rows`, message: 'JSON object requested, multiple (or no) rows returned' }, 406);
        return json(sel, status, { 'Content-Range': `0-${Math.max(0, sel.length - 1)}/${sel.length}` });
    };
    if (metodo === 'HEAD') {
        const sel = filtrar(filas, url.searchParams);
        return new Response(null, { status: 200, headers: { 'Content-Range': `*/${sel.length}` } });
    }
    if (metodo === 'GET') return responder(filtrar(filas, url.searchParams));
    if (metodo === 'POST') {
        const cuerpo = JSON.parse(String(init.body));
        const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).map((f) => ({ veces_usada: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...f }));
        filas.push(...nuevas);
        return prefer.includes('return=representation') ? responder(nuevas, 201) : new Response(null, { status: 201 });
    }
    if (metodo === 'PATCH') {
        const cambios = JSON.parse(String(init.body));
        const sel = filtrar(filas, url.searchParams);
        for (const f of sel) Object.assign(f, cambios);
        return prefer.includes('return=representation') ? responder(sel) : new Response(null, { status: 204 });
    }
    if (metodo === 'DELETE') {
        const sel = new Set(filtrar(filas, url.searchParams));
        tablas[tabla] = filas.filter((f) => !sel.has(f));
        return new Response(null, { status: 204 });
    }
    throw new Error(`Supabase: método inesperado ${metodo}`);
};

// ─── Los manejadores reales ─────────────────────────────────────────────────
const { NextRequest } = await import('next/server.js');
const Lista = await import(path.join(RAIZ, 'src/app/api/plantillas/route.ts'));
const Una = await import(path.join(RAIZ, 'src/app/api/plantillas/[id]/route.ts'));
const Campos = await import(path.join(RAIZ, 'src/app/api/plantillas/[id]/campos/route.ts'));
const Generar = await import(path.join(RAIZ, 'src/app/api/plantillas/[id]/generar/route.ts'));
const PizZip = (await import('pizzip')).default;
const D = await import(path.join(RAIZ, 'src/lib/plantillas/docx.ts'));

const pedido = (url, { token, metodo = 'GET', cuerpo, form } = {}) => new NextRequest(`http://localhost${url}`, {
    method: metodo,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
    body: form ?? (cuerpo ? JSON.stringify(cuerpo) : undefined),
});
const leer = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const ctx = (id) => ({ params: { id } });

// El .docx de prueba: el mismo escrito de muestra, armado a mano (ver plantillas.mjs).
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const r = (t, b = false) => `<w:r>${b ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const p = (x) => `<w:p>${x}</w:p>`;
function docx() {
    const z = new PizZip();
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${[
        p(r('C. JUEZ DE LO FAMILIAR EN TURNO', true)),
        p(r('MARÍA GUADALUPE', true) + r(' TORRES RUIZ', true) + r(', con domicilio en Avenida Zaragoza 210, Colonia Centro, expediente 412/2025, demando lo siguiente.')),
        p(r('Querétaro, a [FECHA].')),
    ].join('')}<w:sectPr/></w:body></w:document>`);
    return z.generate({ type: 'uint8array' });
}
const formDe = (bytes, nombre = 'Demanda de alimentos.docx', titulo) => {
    const f = new FormData();
    f.append('archivo', new File([bytes], nombre, { type: D.MIME_DOCX }));
    if (titulo) f.append('nombre', titulo);
    return f;
};
const usos = (uid, funcion) => tablas.uso_funciones.filter((u) => u.user_id === uid && u.funcion === funcion).reduce((s, u) => s + u.n, 0);

// ─── 1. Sin sesión, y lo que no es Word ─────────────────────────────────────
console.log('\n1. Puertas');
comprueba((await Lista.GET(pedido('/api/plantillas'))).status === 401, 'GET sin sesión: 401');
comprueba((await Lista.POST(pedido('/api/plantillas', { metodo: 'POST', form: formDe(docx()) }))).status === 401, 'POST sin sesión: 401');
const malo = await Lista.POST(pedido('/api/plantillas', { token: 'token-ana', metodo: 'POST', form: formDe(new TextEncoder().encode('%PDF-1.7'), 'Contrato.docx') }));
const maloCuerpo = await leer(malo);
comprueba(malo.status === 400 && /No es un documento de Word/.test(maloCuerpo.error), 'un PDF con nombre .docx: 400 con el porqué', maloCuerpo.error);
comprueba((await Lista.POST(pedido('/api/plantillas', { token: 'token-ana', metodo: 'POST', form: formDe(docx(), 'Macro.docm') }))).status === 400, '.docm: 400');
comprueba(llamadas.modelo === 0 && usos(ANA, 'plantilla_deteccion') === 0 && archivos.size === 0, 'lo rechazado no gasta ni guarda nada');

// ─── 2. Subir ───────────────────────────────────────────────────────────────
console.log('\n2. Subir');
const alta = await Lista.POST(pedido('/api/plantillas', { token: 'token-ana', metodo: 'POST', form: formDe(docx(), 'Demanda_de_alimentos.docx') }));
const altaCuerpo = await leer(alta);
const P = altaCuerpo.plantilla;
comprueba(alta.status === 201 && P && P.lista === false, 'POST: 201 y la plantilla todavía no está lista', String(alta.status));
comprueba(P?.nombre === 'Demanda de alimentos', 'nombre: el del archivo, sin guiones bajos ni extensión', P?.nombre);
comprueba(P?.materia === 'familiar' && P?.descripcion === 'Demanda de pensión alimenticia', 'materia y descripción del modelo');
const claves = (P?.campos ?? []).map((c) => c.clave);
comprueba(claves.includes('actora_nombre') && claves.includes('fecha_escrito') && !claves.includes('fantasma'), 'propuesta validada (sin el fantasma) y con el hueco [FECHA] nombrado', claves.join(','));
comprueba(llamadas.modelo === 1 && usos(ANA, 'plantilla_deteccion') === 1, 'una llamada al modelo y una detección gastada');
comprueba(archivos.has(`plantillas/${ANA}/${P?.id}/original.docx`), 'el original en plantillas/<uid>/<id>/original.docx');
comprueba(typeof altaCuerpo.vista?.html === 'string' && altaCuerpo.vista.html.includes('<strong>C. JUEZ'), 'la vista previa (mammoth) viene con la respuesta');
comprueba(altaCuerpo.aviso === null && altaCuerpo.revisadaPorIurexia === true, 'sin aviso, revisada por Iurexia');
const fila = tablas.plantillas_abogado.find((f) => f.id === P?.id);
comprueba(fila?.user_id === ANA && fila?.archivo_marcado === null && Array.isArray(fila?.campos), 'el renglón: del usuario, sin marcar, con la propuesta');

modeloCaido = true;
const sinModelo = await leer(await Lista.POST(pedido('/api/plantillas', { token: 'token-ana', metodo: 'POST', form: formDe(docx(), 'Otra.docx') })));
modeloCaido = false;
comprueba(sinModelo.plantilla && /no pudo revisar/.test(sinModelo.aviso ?? '') && sinModelo.plantilla.campos.some((c) => c.fuente === 'marcador'), 'modelo caído: se sube igual, con aviso y con los huecos que ya traía', sinModelo.aviso);
comprueba(usos(ANA, 'plantilla_deteccion') === 1, 'modelo caído: la detección se devuelve (sigue en 1)', String(usos(ANA, 'plantilla_deteccion')));

// El plan gratuito guarda una.
const b1 = await Lista.POST(pedido('/api/plantillas', { token: 'token-beto', metodo: 'POST', form: formDe(docx()) }));
const b2 = await Lista.POST(pedido('/api/plantillas', { token: 'token-beto', metodo: 'POST', form: formDe(docx()) }));
const b2c = await leer(b2);
comprueba(b1.status === 201 && b2.status === 403 && b2c.tope === true && /hasta 1 plantilla/.test(b2c.error), 'gratuito: la segunda plantilla se rechaza (403) antes de gastar', b2c.error);
comprueba(usos(BETO, 'plantilla_deteccion') === 1, 'el rechazo por tope no gastó detección');
const PB = (await leer(b1)).plantilla;

// ─── 3. Cada quien lo suyo ──────────────────────────────────────────────────
console.log('\n3. Aislamiento');
const lista = await leer(await Lista.GET(pedido('/api/plantillas', { token: 'token-ana' })));
comprueba(lista.plantillas.length === 2 && lista.plantillas.every((x) => tablas.plantillas_abogado.find((f) => f.id === x.id)?.user_id === ANA), 'GET: sólo las suyas', String(lista.plantillas.length));
comprueba(lista.limites.guardadas.maximo === 30 && lista.limites.guardadas.usadas === 2 && lista.limites.deteccion.usados === 1 && lista.limites.deteccion.limite === 30, 'los topes y lo usado', JSON.stringify(lista.limites));
comprueba((await Una.GET(pedido(`/api/plantillas/${P.id}`, { token: 'token-beto' }), ctx(P.id))).status === 404, 'otro usuario no la abre (404)');
comprueba((await Una.PATCH(pedido(`/api/plantillas/${P.id}`, { token: 'token-beto', metodo: 'PATCH', cuerpo: { nombre: 'Mía' } }), ctx(P.id))).status === 404, 'ni la renombra');
comprueba((await Una.DELETE(pedido(`/api/plantillas/${P.id}`, { token: 'token-beto', metodo: 'DELETE' }), ctx(P.id))).status === 404 && tablas.plantillas_abogado.some((f) => f.id === P.id), 'ni la borra');
comprueba((await Campos.POST(pedido(`/api/plantillas/${P.id}/campos`, { token: 'token-beto', metodo: 'POST', cuerpo: { campos: P.campos } }), ctx(P.id))).status === 404, 'ni le cambia los campos');
const abierta = await leer(await Una.GET(pedido(`/api/plantillas/${P.id}`, { token: 'token-ana' }), ctx(P.id)));
comprueba(abierta.plantilla?.id === P.id && abierta.vista?.html.length > 50, 'su dueña sí la abre, con la vista previa');
comprueba((await Una.GET(pedido('/api/plantillas/no-es-un-id', { token: 'token-ana' }), ctx('no-es-un-id'))).status === 404, 'un id raro: 404 sin preguntar a la base');

// ─── 4. Campos y generar ────────────────────────────────────────────────────
console.log('\n4. Campos y generar');
const antes = await Generar.POST(pedido(`/api/plantillas/${P.id}/generar`, { token: 'token-ana', metodo: 'POST', cuerpo: { valores: {} } }), ctx(P.id));
comprueba(antes.status === 409, 'generar sin revisar los campos: 409');
const confirmados = [
    ...P.campos.filter((c) => c.clave !== 'expediente'),
    { clave: '', etiqueta: 'Manual que no existe', origen: 'manual', textos: ['Texto que no está'], fuente: 'manual' },
];
const cr = await Campos.POST(pedido(`/api/plantillas/${P.id}/campos`, { token: 'token-ana', metodo: 'POST', cuerpo: { campos: confirmados } }), ctx(P.id));
const crc = await leer(cr);
comprueba(cr.status === 200 && crc.plantilla?.lista === true, 'campos: 200 y la plantilla queda lista');
comprueba(crc.descartados?.includes('Manual que no existe'), 'lo que no está en el documento se descarta y se dice', JSON.stringify(crc.descartados));
comprueba(archivos.has(`plantillas/${ANA}/${P.id}/marcado.docx`) && tablas.plantillas_abogado.find((f) => f.id === P.id)?.archivo_marcado === `${ANA}/${P.id}/marcado.docx`, 'marcado.docx guardado y anotado');
const marcadoXml = new PizZip(archivos.get(`plantillas/${ANA}/${P.id}/marcado.docx`)).file('word/document.xml').asText();
comprueba(marcadoXml.includes('{{actora_nombre|mayus}}') && marcadoXml.includes('412/2025') && !marcadoXml.includes('{{expediente'), 'el marcado: el campo quitado se queda como texto');
comprueba((await Campos.POST(pedido(`/api/plantillas/${P.id}/campos`, { token: 'token-ana', metodo: 'POST', cuerpo: { campos: [] } }), ctx(P.id))).status === 400, 'sin campos: 400');

const g = await Generar.POST(pedido(`/api/plantillas/${P.id}/generar`, { token: 'token-ana', metodo: 'POST', cuerpo: { valores: { actora_domicilio: 'Domicilio escrito a mano' }, expediente_id: EXP_ANA } }), ctx(P.id));
const nombre = decodeURIComponent(g.headers.get('X-Nombre-Archivo') || '');
const lleno = new Uint8Array(await g.arrayBuffer());
const textoLleno = D.textoPlano(D.leerPartes(D.abrirDocx(lleno)));
comprueba(g.status === 200 && g.headers.get('Content-Type') === D.MIME_DOCX, 'generar: 200 con el .docx');
comprueba(nombre === 'Demanda de alimentos — Ana Sofía Méndez Robles.docx', 'el nombre lleva al cliente de la carpeta', nombre);
comprueba(textoLleno.includes('ANA SOFÍA MÉNDEZ ROBLES, con domicilio en Domicilio escrito a mano'), 'lo que faltaba sale de la carpeta (en mayúsculas donde iba así) y lo escrito manda', textoLleno.slice(0, 160));
comprueba(/Querétaro, a \d{1,2} de \w+ de \d{4}\./.test(textoLleno), 'la fecha de hoy en español largo', textoLleno.split('\n').pop());
comprueba(tablas.plantillas_abogado.find((f) => f.id === P.id)?.veces_usada === 1 && usos(ANA, 'plantilla_generar') === 1, 'una vez usada, un documento gastado');
const ajena = await Generar.POST(pedido(`/api/plantillas/${P.id}/generar`, { token: 'token-ana', metodo: 'POST', cuerpo: { valores: {}, expediente_id: EXP_BETO } }), ctx(P.id));
comprueba(ajena.status === 404 && usos(ANA, 'plantilla_generar') === 1, 'con la carpeta de otro: 404 y no gasta');
const gj = await leer(await Generar.POST(pedido(`/api/plantillas/${P.id}/generar`, { token: 'token-ana', metodo: 'POST', cuerpo: { valores: { actora_nombre: 'Rosa Elena Díaz' }, formato: 'json' } }), ctx(P.id)));
comprueba(typeof gj.docx === 'string' && gj.html.includes('ROSA ELENA DÍAZ') && gj.texto.includes('ROSA ELENA DÍAZ') && gj.nombre === 'Demanda de alimentos — Rosa Elena Díaz.docx', 'formato json: docx en base64, HTML para el editor y texto');

// El tope del día (gratuito: 3).
await Campos.POST(pedido(`/api/plantillas/${PB.id}/campos`, { token: 'token-beto', metodo: 'POST', cuerpo: { campos: PB.campos } }), ctx(PB.id));
const estados = [];
for (let i = 0; i < 4; i++) estados.push((await Generar.POST(pedido(`/api/plantillas/${PB.id}/generar`, { token: 'token-beto', metodo: 'POST', cuerpo: { valores: {} } }), ctx(PB.id))).status);
comprueba(estados.join(',') === '200,200,200,429', 'gratuito: el cuarto documento del día se rechaza (429)', estados.join(','));

// ─── 5. Renombrar, borrar, sin migración ────────────────────────────────────
console.log('\n5. Renombrar, borrar y sin migración');
const ren = await leer(await Una.PATCH(pedido(`/api/plantillas/${P.id}`, { token: 'token-ana', metodo: 'PATCH', cuerpo: { nombre: '  Alimentos   provisionales ', materia: 'inventada' } }), ctx(P.id)));
comprueba(ren.plantilla?.nombre === 'Alimentos provisionales' && ren.plantilla?.materia === null, 'PATCH: nombre limpio; una materia que no existe queda vacía');
comprueba((await Una.PATCH(pedido(`/api/plantillas/${P.id}`, { token: 'token-ana', metodo: 'PATCH', cuerpo: { nombre: '   ' } }), ctx(P.id))).status === 400, 'nombre vacío: 400');
const borrada = await Una.DELETE(pedido(`/api/plantillas/${P.id}`, { token: 'token-ana', metodo: 'DELETE' }), ctx(P.id));
comprueba(borrada.status === 200 && !tablas.plantillas_abogado.some((f) => f.id === P.id) && !archivos.has(`plantillas/${ANA}/${P.id}/original.docx`) && !archivos.has(`plantillas/${ANA}/${P.id}/marcado.docx`), 'DELETE: renglón y archivos fuera');
sinEsquema = true;
const se = await Lista.GET(pedido('/api/plantillas', { token: 'token-ana' }));
const sec = await leer(se);
comprueba(se.status === 503 && sec.sinEsquema === true && /todavía no están activadas/.test(sec.error), 'sin la migración: 503 con un aviso legible', sec.error);
sinEsquema = false;

comprueba(llamadas.ajenas.length === 0, 'ninguna petición salió de la máquina', llamadas.ajenas.join(', '));
console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo en orden.');
process.exit(fallos ? 1 : 0);
