// LAS PLANTILLAS DEL ABOGADO, SIN RED (16-oct-2026).
//
//   node --experimental-strip-types comprobaciones/plantillas.mjs [otro.docx …]
//
// Corre EL MISMO código que usan /api/plantillas y la revisión del navegador
// (`src/lib/plantillas/*`). No toca Supabase, ni OpenRouter, ni nada fuera de
// la máquina: el «modelo» es una respuesta escrita aquí, que pasa por la misma
// validación que la de verdad.
//
//   1. Un .docx armado aquí: un campo partido en TRES corridas con formato
//      distinto, el mismo dato en mayúsculas, una tabla, un encabezado y un
//      pie, un cuadro de texto (mc:AlternateContent), una raya con rótulo,
//      una raya de firma (que NO es campo), [FECHA], llaves sueltas, & y <.
//   2. Detecta, combina con el «modelo» (y descarta lo que no existe), marca,
//      llena y comprueba el texto del resultado y su formato.
//   3. El XML de cada parte sigue bien formado (xmldom estricto), docxtemplater
//      lo vuelve a abrir y mammoth lo convierte.
//   4. Validación: .doc viejo, zip sin cuerpo, .docm con macros, vacío.
//   5. Los formatos internos de jurexia-api-git/plantillas/*.docx (y los que se
//      pasen por la línea de órdenes): leer, detectar, marcar y llenar.
import fs from 'fs';
import path from 'path';
import { createRequire, register } from 'node:module';
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
            for (const ext of ['.ts', '.tsx', '/index.ts']) { try { return await next(spec + ext, ctx); } catch {} }
        }
        throw e;
    }
}`));

const C = await import(path.join(RAIZ, 'src/lib/plantillas/campos.ts'));
const D = await import(path.join(RAIZ, 'src/lib/plantillas/docx.ts'));
const T = await import(path.join(RAIZ, 'src/lib/plantillas/deteccion.ts'));
const V = await import(path.join(RAIZ, 'src/lib/plantillas/vista.ts'));
const requerir = createRequire(path.join(RAIZ, 'package.json'));
const PizZip = requerir('pizzip');
const mammoth = requerir('mammoth');
const { DOMParser } = requerir(requerir.resolve('@xmldom/xmldom', { paths: [path.dirname(requerir.resolve('docxtemplater/package.json'))] }));

let fallos = 0;
function comprueba(bien, etiqueta, detalle = '') {
    if (!bien) fallos++;
    console.log(bien ? 'ok   ' : 'FALLA', etiqueta, detalle ? `— ${detalle}` : '');
}

// ─── El .docx de prueba ─────────────────────────────────────────────────────
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" mc:Ignorable="wps"';
const r = (t, rpr = '') => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const p = (contenido, ppr = '') => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${contenido}</w:p>`;
const celda = (contenido) => `<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${contenido}</w:tc>`;

const CUERPO = [
    // El nombre partido en tres corridas: negrita, normal y cursiva.
    p(r('C. JUEZ PRIMERO DE LO CIVIL', '<w:b/>'), '<w:jc w:val="center"/>'),
    p(r('Juan ', '<w:b/>') + r('Pé') + r('rez López', '<w:i/>') + r(', por mi propio derecho, con domicilio en Avenida Juárez 120, Colonia Centro, ante usted comparezco.')),
    // El mismo dato en mayúsculas, y otra vez en otra parte.
    p(r('Que vengo a demandar en nombre de JUAN PÉREZ LÓPEZ el pago de $15,000.00 (QUINCE MIL PESOS 00/100 M.N.).')),
    // Un tabulador y un salto de línea dentro del párrafo.
    p(r('Actor:') + '<w:r><w:tab/></w:r>' + r('Juan Pérez López') + '<w:r><w:br/></w:r>' + r('Domicilio: ____________')),
    // Una raya de firma, sola en su renglón: NO es campo.
    p(r('________________________'), '<w:jc w:val="center"/>'),
    p(r('[FECHA]') + r(' — Pérez &amp; Asociados &lt;despacho&gt;')),
    // Un marcador de docxtemplater que ya traía, y llaves sueltas que no son
    // campos (una de ellas partida entre dos corridas).
    p(r('Testigo: {{ Nombre del testigo }}; llaves sueltas: }} y {') + r('{ y {un} dato.')),
    // Una tabla con el expediente.
    `<w:tbl><w:tblPr><w:tblW w:w="8000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>` +
        `<w:tr>${celda(p(r('Expediente')))}${celda(p(r('123/') + r('2026')))}</w:tr></w:tbl>`,
    // Un cuadro de texto con su copia de respaldo (mc:Fallback).
    p(`<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:inline><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:txbx><w:txbxContent>${p(r('Cuadro: Juan Pérez López'))}</w:txbxContent></wps:txbx></wps:wsp></a:graphicData></a:graphic></wp:inline></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape><v:textbox><w:txbxContent>${p(r('Cuadro: Juan Pérez López'))}</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r>`),
    p(r('Deleted ') + '<w:del w:id="1" w:author="x" w:date="2026-10-16T00:00:00Z"><w:r><w:delText>Juan Pérez López</w:delText></w:r></w:del>' + r('fin.')),
    p(r('PROTESTO LO NECESARIO'), '<w:jc w:val="center"/>'),
].join('');

function armarDocx({ cuerpo = CUERPO, tipoPrincipal = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml', sinCuerpo = false, macros = false } = {}) {
    const zip = new PizZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${tipoPrincipal}"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`);
    if (!sinCuerpo) zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>${cuerpo}<w:sectPr><w:headerReference w:type="default" r:id="rId8"/><w:footerReference w:type="default" r:id="rId9"/></w:sectPr></w:body></w:document>`);
    zip.file('word/header1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr ${W}>${p(r('Juicio ordinario civil · Exp. ') + r('123/2026', '<w:b/>'))}</w:hdr>`);
    zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${W}>${p(r('Juan Pérez López · hoja '))}</w:ftr>`);
    if (macros) zip.file('word/vbaProject.bin', 'MZ');
    return zip.generate({ type: 'uint8array' });
}

// El modelo ve los huecos como ⟦n⟧ en el orden en que se detectaron: `n` sale
// de esos marcadores, como lo leería el modelo en el texto.
const SUGERENCIA = (marcadores) => ({
    descripcion: 'Demanda de pago de pesos en juicio ordinario civil',
    materia: 'civil',
    huecos: [{ n: marcadores.findIndex((m) => m.textos[0] === '[FECHA]') + 1, clave: 'fecha_escrito', etiqueta: 'Fecha del escrito', origen: 'fecha_hoy' }],
    campos: [
        { texto: 'Juan Pérez López', clave: 'actor_nombre', etiqueta: 'Nombre del actor', origen: 'carpeta.cliente_nombre', ejemplo: 'Juan Pérez López' },
        // Con dos espacios, y en el documento va uno: los espacios no cuentan.
        { texto: 'Avenida Juárez 120,  Colonia Centro', clave: 'actor_domicilio', etiqueta: 'Domicilio del actor', origen: 'carpeta.cliente_domicilio' },
        { texto: '$15,000.00', clave: 'monto', etiqueta: 'Monto reclamado', origen: 'manual' },
        { texto: 'QUINCE MIL PESOS 00/100 M.N.', clave: 'monto_letra', etiqueta: 'Monto con letra', origen: 'manual' },
        { texto: '123/2026', clave: 'expediente', etiqueta: 'Número de expediente', origen: 'manual' },
        // Lo que el modelo inventa: no existe en el documento y se descarta.
        { texto: 'María Inventada Ruiz', clave: 'testigo', etiqueta: 'Testigo', origen: 'manual' },
        // Lo genérico: se descarta aunque exista.
        { texto: 'C. JUEZ', clave: 'juez', etiqueta: 'Juez', origen: 'manual' },
        // El mismo dato con otra clave igual: se une al primero.
        { texto: 'JUAN PÉREZ LÓPEZ', clave: 'actor_nombre', etiqueta: 'Nombre del actor', origen: 'carpeta.cliente_nombre' },
    ],
});

const textoDe = async (bytes) => (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
function xmlBienFormado(xml, ruta) {
    const errores = [];
    new DOMParser({ onError: (nivel, msg) => { if (nivel !== 'warning') errores.push(msg); } }).parseFromString(xml, 'text/xml');
    return { bien: errores.length === 0, ruta, errores };
}
function todasLasPartes(bytes) {
    const zip = new PizZip(bytes);
    return Object.keys(zip.files).filter((n) => /\.xml$|\.rels$/.test(n)).map((n) => xmlBienFormado(zip.file(n).asText(), n));
}

// ─── 1-3. El recorrido completo ─────────────────────────────────────────────
console.log('\n1. Leer');
const ORIGINAL = armarDocx();
const abierto = D.abrirDocx(ORIGINAL);
const partes = D.leerPartes(abierto);
comprueba(partes.map((x) => x.tipo).join(',') === 'encabezado,cuerpo,pie', 'partes en orden: encabezado, cuerpo, pie', partes.map((x) => x.tipo).join(','));
const cuerpo = partes.find((x) => x.tipo === 'cuerpo');
const segundo = cuerpo.parrafos[1];
comprueba(segundo.texto.startsWith('Juan Pérez López, por mi propio derecho') && segundo.segmentos.length === 4, 'el nombre partido en tres corridas se lee seguido', JSON.stringify(segundo.texto.slice(0, 40)));
const conTab = cuerpo.parrafos.find((x) => x.texto.startsWith('Actor:'));
comprueba(conTab && conTab.texto === 'Actor:\tJuan Pérez López\nDomicilio: ____________' && conTab.virtuales.length === 2, 'tabulador y salto como \\t y \\n (posiciones virtuales)', JSON.stringify(conTab?.texto));
const conEntidades = cuerpo.parrafos.find((x) => x.texto.startsWith('[FECHA]'));
comprueba(conEntidades?.texto.includes('Pérez & Asociados <despacho>'), 'las entidades se decodifican (&amp; &lt; &gt;)');
const cuadros = cuerpo.parrafos.filter((x) => x.texto === 'Cuadro: Juan Pérez López');
comprueba(cuadros.length === 2 && cuadros.filter((x) => x.respaldo).length === 1, 'cuadro de texto: dos copias, una de respaldo');
comprueba(!cuerpo.parrafos.some((x) => x.texto.includes('DeletedJuan')), 'el texto borrado (w:delText) no se lee');
comprueba(cuerpo.parrafos.some((x) => x.enTabla && x.texto === '123/2026'), 'la celda de la tabla, con el número partido en dos corridas');

console.log('\n2. Detectar y combinar');
const marcadores = T.detectarMarcadores(partes);
const etiquetas = marcadores.map((m) => `${m.fuente}:${m.textos[0]}:${m.antes ?? ''}`);
comprueba(marcadores.some((m) => m.fuente === 'marcador' && m.textos[0] === '[FECHA]'), '[FECHA] es un marcador', etiquetas.join(' | '));
comprueba(marcadores.some((m) => m.fuente === 'raya' && m.antes === 'Domicilio: ' && m.etiqueta === 'Domicilio'), 'la raya con rótulo es un campo («Domicilio»)');
comprueba(!marcadores.some((m) => m.textos[0] === '________________________'), 'la raya de firma, sola en su renglón, no es campo');
comprueba(marcadores.some((m) => m.textos[0] === '{{ Nombre del testigo }}' && m.etiqueta === 'Nombre del testigo'), '«{{ Nombre del testigo }}» es un marcador', etiquetas.join(' | '));
comprueba(!marcadores.some((m) => /llaves|\{un\}/.test(m.textos[0])), 'las llaves sueltas no son marcadores');
const paraModelo = T.textoParaModelo(partes, marcadores);
comprueba(paraModelo.includes('⟦') && !paraModelo.includes('[FECHA]'), 'el modelo ve los huecos como ⟦n⟧');
comprueba(paraModelo.indexOf('C. JUEZ') < paraModelo.indexOf('[ENCABEZADO]'), 'el cuerpo va antes que el encabezado (si hay que recortar, se pierde el pie)');
const det = T.combinar(partes, marcadores, SUGERENCIA(marcadores));
const porClave = Object.fromEntries(det.campos.map((c) => [c.clave, c]));
comprueba(det.materia === 'civil' && det.descripcion?.startsWith('Demanda'), 'materia y descripción del modelo');
comprueba(porClave.fecha_escrito?.origen === 'fecha_hoy' && porClave.fecha_escrito?.textos[0] === '[FECHA]', 'el hueco ⟦1⟧ toma el nombre y el origen que le dio el modelo');
comprueba(!porClave.testigo, 'lo que no existe en el documento se descarta');
comprueba(!porClave.juez, 'lo genérico («C. JUEZ») se descarta');
comprueba(porClave.actor_nombre?.textos.length === 2, 'el mismo dato con la misma clave se une', JSON.stringify(porClave.actor_nombre?.textos));
// Juan Pérez López: párrafo 2, «JUAN PÉREZ…», «Actor:», el cuadro (sin el respaldo) y el pie.
comprueba(porClave.actor_nombre?.apariciones === 5, 'apariciones del actor: 5 (sin la copia de respaldo ni lo borrado)', String(porClave.actor_nombre?.apariciones));
comprueba(porClave.expediente?.apariciones === 2, 'el expediente: en la tabla y en el encabezado', String(porClave.expediente?.apariciones));
comprueba(porClave.actor_domicilio?.apariciones === 1, 'el domicilio con dos espacios en la sugerencia empata con el del documento');
comprueba(det.campos[0].clave === 'expediente', 'el orden es el de lectura (el encabezado primero)', det.campos.map((c) => c.clave).join(','));

console.log('\n3. Marcar, llenar y abrir');
const t0 = Date.now();
const { docx: MARCADO, apariciones } = D.marcar(ORIGINAL, det.campos);
comprueba(apariciones.get('actor_nombre') === 5, 'marcar cuenta lo mismo que la revisión', String(apariciones.get('actor_nombre')));
const marcadoXml = new PizZip(MARCADO).file('word/document.xml').asText();
comprueba(/<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">\{\{actor_nombre\|inicial\}\}, por mi propio derecho/.test(marcadoXml) || /<w:b\/><\/w:rPr><w:t xml:space="preserve">\{\{actor_nombre\|inicial\}\}<\/w:t>/.test(marcadoXml),
    'la etiqueta cae en la PRIMERA corrida (la de negrita)');
comprueba(marcadoXml.includes('{{actor_nombre|mayus}}'), 'la aparición en mayúsculas lleva |mayus');
comprueba((marcadoXml.match(/\{\{actor_nombre/g) || []).length === 5, 'cinco etiquetas del actor en el cuerpo (cuadro y respaldo incluidos)', String((marcadoXml.match(/\{\{actor_nombre/g) || []).length));
comprueba(marcadoXml.includes('<w:delText>Juan Pérez López</w:delText>'), 'el texto borrado se queda como estaba');
comprueba(D.clavesMarcadas(MARCADO).sort().join(',') === det.campos.map((c) => c.clave).sort().join(','), 'clavesMarcadas devuelve las claves confirmadas');
comprueba(todasLasPartes(MARCADO).every((x) => x.bien), 'el marcado: todas las partes son XML bien formado', todasLasPartes(MARCADO).filter((x) => !x.bien).map((x) => x.ruta + ' ' + x.errores[0]).join('; '));

const VALORES = {
    actor_nombre: 'María Fernanda Ruiz',
    actor_domicilio: 'Calle Hidalgo 5,\nSan Juan del Río',
    monto: '$80,000.00',
    expediente: '456/2026',
    fecha_escrito: C.valorDeOrigen('fecha_hoy', null, new Date('2026-10-16T18:00:00Z')),
    domicilio: 'Av. Universidad <3> & Cía',
    // monto_letra no viene: debe salir «__________»
};
const LLENO = D.llenar(MARCADO, VALORES);
console.log(`     (marcar + llenar: ${Date.now() - t0} ms)`);
const texto = await textoDe(LLENO);
comprueba(texto.includes('María Fernanda Ruiz, por mi propio derecho'), 'el actor queda en su lugar, con el formato de la primera corrida');
comprueba(texto.includes('en nombre de MARÍA FERNANDA RUIZ el pago de $80,000.00'), 'en mayúsculas donde la plantilla lo tenía en mayúsculas');
comprueba(texto.includes('(__________)'), 'lo que no se dio sale como «__________»', texto.match(/\(.{0,20}\)/)?.[0]);
comprueba(texto.includes('16 de octubre de 2026 — Pérez & Asociados <despacho>'), 'la fecha larga, y & < > intactos');
comprueba(texto.includes('Domicilio: Av. Universidad <3> & Cía'), 'la raya con rótulo se llena y el rótulo se queda');
comprueba(texto.includes('________________________'), 'la raya de firma sigue ahí');
comprueba(texto.replace(/\u200b/g, '').includes('Testigo: __________; llaves sueltas: }} y {{ y {un} dato.'), 'las llaves sueltas no rompen el llenado y se quedan como estaban');
comprueba(!/\{\{[a-z0-9_|]+\}\}/.test(texto), 'no queda ninguna etiqueta sin llenar', (texto.match(/\{\{[^}]*\}\}/g) || []).join(' '));
const llenoZip = new PizZip(LLENO);
const docLleno = llenoZip.file('word/document.xml').asText();
comprueba(/Calle Hidalgo 5,<\/w:t><\/w:r><w:r><w:br\/><\/w:r><w:r><w:t[^>]*>San Juan del Río/.test(docLleno), 'el salto de línea del valor es un <w:br/> de Word');
comprueba(/<w:b\/><\/w:rPr><w:t[^>]*>María Fernanda Ruiz/.test(docLleno), 'el valor conserva la negrita de la primera corrida');
comprueba(/<w:i\/><\/w:rPr>(<w:t\/>|<w:t[^>]*><\/w:t>)/.test(docLleno), 'la corrida en cursiva que tenía «rez López» queda vacía (no duplica)');
comprueba(llenoZip.file('word/header1.xml').asText().includes('456/2026') && llenoZip.file('word/footer1.xml').asText().includes('María Fernanda Ruiz'),
    'encabezado y pie también se llenan');
comprueba(docLleno.includes('Cuadro: María Fernanda Ruiz') && (docLleno.match(/Cuadro: María Fernanda Ruiz/g) || []).length === 2, 'el cuadro de texto y su respaldo se llenan los dos');
comprueba(docLleno.includes('<w:t xml:space="preserve">456/</w:t>') === false && docLleno.includes('456/2026'), 'el número partido en dos corridas queda entero en la primera');
comprueba(todasLasPartes(LLENO).every((x) => x.bien), 'el lleno: todas las partes son XML bien formado', todasLasPartes(LLENO).filter((x) => !x.bien).map((x) => x.ruta).join(','));
const html = await V.htmlDeDocx(mammoth, { buffer: Buffer.from(LLENO) });
comprueba(html.includes('<p style="text-align: center"><strong>C. JUEZ PRIMERO DE LO CIVIL</strong></p>'), 'mammoth lo abre, con la alineación centrada viajando', html.slice(0, 120));
comprueba(!/<img|<a\b|javascript:/i.test(html), 'la vista previa va sin imágenes ni enlaces');
comprueba(D.llenar(MARCADO, {}).length > 0, 'sin ningún valor también se llena (todo «__________»)');
comprueba(C.valorDeOrigen('carpeta.materia', { materia: 'administrativo' }) === 'administrativa'
    && C.valorDeOrigen('fecha_hoy.mes', null, new Date('2026-10-16T18:00:00Z')) === 'octubre'
    && C.valorDeOrigen('fecha_hoy.dia', null, new Date('2026-10-17T03:00:00Z')) === '16', 'orígenes: materia en minúscula, mes, y el día en la hora de México');

console.log('\n4. Lo que no entra');
const rechaza = (bytes, re, etiqueta) => {
    try { D.abrirDocx(bytes); comprueba(false, etiqueta, 'lo aceptó'); }
    catch (e) { comprueba(e instanceof D.PlantillaInvalida && re.test(e.message), etiqueta, e.message); }
};
rechaza(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2, 3, 4]), /Word antiguo|contraseña/, '.doc viejo o con contraseña');
rechaza(new TextEncoder().encode('%PDF-1.7'), /No es un documento de Word/, 'un PDF con otro nombre');
rechaza(new Uint8Array(), /vacío/, 'archivo vacío');
rechaza(armarDocx({ sinCuerpo: true }), /falta el cuerpo/, 'zip sin word/document.xml');
rechaza(armarDocx({ macros: true }), /macros/, 'con vbaProject.bin (macros)');
rechaza(armarDocx({ tipoPrincipal: 'application/vnd.ms-word.document.macroEnabled.main+xml' }), /macros/, '.docm por su tipo de contenido');
const dotx = D.abrirDocx(armarDocx({ tipoPrincipal: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml' }));
comprueba(dotx.eraDotx && dotx.zip.file('[Content_Types].xml').asText().includes('document.main+xml'), 'un .dotx se acepta y se guarda como documento');

console.log('\n5. Formatos reales');
const reales = [
    ...fs.readdirSync(path.join(RAIZ, '..', 'jurexia-api-git', 'plantillas'), { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.endsWith('.docx')).map((d) => path.join(RAIZ, '..', 'jurexia-api-git', 'plantillas', d.name)),
    ...process.argv.slice(2),
].filter((f) => fs.existsSync(f));
if (!reales.length) console.log('     (no hay formatos reales a la mano)');
for (const f of reales) {
    const t1 = Date.now();
    const bytes = new Uint8Array(fs.readFileSync(f));
    const a = D.abrirDocx(bytes);
    const ps = D.leerPartes(a);
    const ms = T.detectarMarcadores(ps);
    const txt = D.textoPlano(ps);
    // Un «modelo» que propone tres frases que de verdad están en el documento
    // (y que a veces se enciman con las rayas: gana la más larga).
    const lineas = txt.split('\n').filter((l) => l.length > 25 && l.length < 140);
    const propuestas = lineas.slice(2, 5).map((l, i) => ({ texto: l.split(/[,.;]/)[0].trim(), clave: `dato_${i + 1}`, etiqueta: `Dato ${i + 1}`, origen: 'manual' }))
        .filter((x) => x.texto.length >= 2);
    const d = T.combinar(ps, ms, { campos: propuestas });
    const { docx: m } = D.marcar(bytes, d.campos);
    const valores = Object.fromEntries(d.campos.map((c) => [c.clave, `«${c.etiqueta}»`]));
    const lleno = D.llenar(m, valores);
    const malos = todasLasPartes(lleno).filter((x) => !x.bien);
    const t = await textoDe(lleno);
    // Donde la aparición iba en mayúsculas el valor sale en mayúsculas: se compara sin distinguir.
    const tMin = t.toLocaleLowerCase('es-MX');
    const quedaron = d.campos.filter((c) => !tMin.includes(`«${c.etiqueta}»`.toLocaleLowerCase('es-MX'))).map((c) => c.clave);
    const html2 = await V.htmlDeDocx(mammoth, { buffer: Buffer.from(lleno) });
    comprueba(malos.length === 0 && quedaron.length === 0 && html2.length > 1000 && !/\{\{[a-z0-9_|]+\}\}/.test(t),
        `${path.basename(f)}: ${ps.reduce((n, x) => n + x.parrafos.length, 0)} párrafos, ${ms.length} huecos, ${d.campos.length} campos → marcado, lleno y legible (${Date.now() - t1} ms)`,
        malos.length ? malos.map((x) => x.ruta).join(',') : quedaron.length ? `sin llenar: ${quedaron.join(',')}` : '');
}

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo en orden.');
process.exit(fallos ? 1 : 0);
