/**
 * LAS VISTAS PREVIAS DE LAS OCHO PLANTILLAS DE LA ATENCIÓN AUTOMÁTICA (2-nov-2026).
 *
 * Toda plantilla nueva la aprueba David una vez antes de enviarse sola, y la
 * aprueba viéndola: este script pinta cada una con datos de ejemplo —todas
 * sus variantes, una debajo de otra— con la plantilla de la casa, y escribe:
 *
 *   ~/Documents/IUREXIA-MAC/soporte-nov02/plantillas/T1.html … T8.html
 *   ~/Documents/IUREXIA-MAC/soporte-nov02/plantillas/index.html     las ocho, con su hash
 *   ~/Documents/IUREXIA-MAC/soporte-nov02/plantillas/plantillas_soporte.sql
 *
 * Con --migracion rehace además la semilla de supabase_atencion_automatica.sql
 * (el texto canónico y su sha256), para que la tabla y el código no se separen.
 *
 * No manda nada, no toca la base, no llama a ningún modelo.
 *
 * USO   node scripts/atencion-vistas-previas.mts [--migracion] [--salida <carpeta>]
 */
import { register } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// «../correo/plantilla» sin extensión, como lo escribe Next: Node lo busca con .ts.
register('data:text/javascript,' + encodeURIComponent(`
const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ + '/').href)};
export async function resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) spec = RAIZ + 'src/' + spec.slice(2);
    try { return await next(spec, ctx); }
    catch (e) {
        if (!/^(\\.|\\/|file:)/.test(spec)) throw e;
        for (const ext of ['.ts', '.tsx', '/index.ts']) { try { return await next(spec + ext, ctx); } catch {} }
        throw e;
    }
}`));

const { PLANTILLAS, pintar, huella, textoCanonico, saludoPara } = await import('../src/lib/soporte/plantillas-atencion.ts');
type Valores = Record<string, string | number | string[]>;

const args = process.argv.slice(2);
const i = args.indexOf('--salida');
const SALIDA = i >= 0 ? path.resolve(args[i + 1]) : path.join(os.homedir(), 'Documents/IUREXIA-MAC/soporte-nov02/plantillas');

const COMUNES: Valores = {
    folio: '4126-02',
    saludo: saludoPara('Ana Robles', 'licenciada'),
    fecha_reporte: '2026-11-02T18:30:00Z',
};

/** Cada variante de cada plantilla, con datos de ejemplo (ficticios). */
const VARIANTES: Record<string, Array<[string, Valores]>> = {
    T1: [
        ['chat · le quedan consultas · confundió el folio con un código', { apertura: 'chat', situacion: 'con-consultas', consultas_restantes: 3, nota_folio: 'si' }],
        ['chat · sin consultas este periodo', { apertura: 'chat', situacion: 'sin-consultas' }],
        ['correo · sin cuenta con ese correo', { apertura: 'correo', situacion: 'sin-cuenta' }],
    ],
    T2: [
        ['todas las secciones (para revisarlas de una vez; un correo real lleva hasta tres)', {
            secciones: ['tutorial', 'consulta', 'escrito', 'documento', 'historial', 'movil', 'contador', 'carpetas', 'agenda',
                'seguimiento', 'flujos', 'boveda', 'plantillas', 'redactor', 'herramientas', 'entidad', 'plan-y-pagos'],
        }],
        ['un caso típico: un documento por consulta', { secciones: ['documento'] }],
    ],
    T3: [
        ['quiere contratar, sin tarjeta, y pidió teléfono', { situacion: 'contratar', sin_tarjeta: 'si', contacto: 'si' }],
        ['ya paga y pregunta por otro plan', { situacion: 'cambiar', plan: 'Pro' }],
    ],
    T4: [
        ['el pago está y el plan también: falta recargar la sesión', { estado: 'activo', plan: 'Platinum', correo_oculto: 'ana•••••@gmail.com' }],
        ['el plan está en otra cuenta del mismo buzón', { estado: 'otra-cuenta', correo_oculto: 'ana•••••••@gmail.com' }],
        ['cuenta suspendida por un cobro rechazado', { estado: 'suspendida' }],
        ['el cobro quedó pendiente', { estado: 'pendiente' }],
        ['no hay ningún cobro (hoy va a una persona: confianza baja)', { estado: 'sin-pago', correo_oculto: 'ana•••••@gmail.com' }],
    ],
    T5: [
        ['reloj del equipo, con el desfase de la cabecera de su correo', { causa: 'reloj-desfase', desfase: 'unas 9 horas adelantado' }],
        ['reloj del equipo, por la ráfaga de renovaciones', { causa: 'reloj' }],
        ['lo que ve es el muro de cuenta suspendida', { causa: 'suspendida' }],
        ['otra cuenta del mismo buzón', { causa: 'otra-cuenta', correo_oculto: 'ana•••••••@gmail.com' }],
        ['sin señal: los caminos de siempre', { causa: 'contrasena' }],
    ],
    T6: [
        ['la respuesta terminó y no se guardó: se recupera sola', { estado: 'recuperable', fecha_consulta: '2026-11-02T17:39:00Z' }],
        ['la respuesta está en su historial', { estado: 'en-historial', fecha_consulta: '2026-11-02T17:39:00Z' }],
        ['se interrumpió con texto', { estado: 'a-medias', fecha_consulta: '2026-11-02T17:39:00Z' }],
        ['se interrumpió sin una letra', { estado: 'sin-texto', fecha_consulta: '2026-11-02T17:39:00Z' }],
    ],
    T7: [
        ['se cortó la conexión', { causa: 'red' }],
        ['no se pudo leer el texto', { causa: 'texto' }],
        ['el archivo no abre como PDF ni Word', { causa: 'formato' }],
        ['más hojas de las que lee su plan', { causa: 'hojas', hojas_documento: 31, hojas_plan: 20 }],
        ['por su tamaño', { causa: 'tamano' }],
        ['sin consultas en el periodo', { causa: 'cuota' }],
        ['un fallo de la plataforma', { causa: 'fallo' }],
        ['sin rastro del error (hoy va a una persona)', { causa: 'sin-rastro' }],
    ],
    T8: [
        ['los pasos, con la fecha de fin del periodo', { estado: 'pasos', fin: 'con-fecha', fin_periodo: '2026-11-24T06:00:00Z' }],
        ['los pasos, sin fecha (no se pudo leer el cobro)', { estado: 'pasos', fin: 'sin-fecha' }],
        ['ya está cancelada', { estado: 'ya-cancelada', fin_periodo: '2026-11-24T06:00:00Z' }],
        ['no tiene suscripción', { estado: 'sin-suscripcion' }],
    ],
};

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ESTILO = `body{margin:0;background:#ece9e1;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a}
.cabeza{max-width:760px;margin:0 auto;padding:28px 20px 8px}
.cabeza h1{font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px}
.cabeza p{font-size:13px;line-height:1.6;margin:4px 0;color:#404040}
code{font-family:Menlo,monospace;font-size:12px;background:#fefdfb;border:1px solid #e8e6e0;padding:1px 5px;word-break:break-all}
.variante{max-width:760px;margin:22px auto;padding:0 20px}
.variante h2{font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#8b7355;font-weight:normal;margin:0 0 6px}
.variante .asunto{font-size:13px;margin:0 0 10px}
details{max-width:640px;margin:8px auto 0;font-size:12px}
pre{white-space:pre-wrap;background:#fefdfb;border:1px solid #e8e6e0;padding:12px;font-size:12px;line-height:1.5}`;

mkdirSync(SALIDA, { recursive: true });
const ids = Object.keys(PLANTILLAS) as Array<keyof typeof PLANTILLAS>;
const indice: string[] = [];

for (const id of ids) {
    const p = PLANTILLAS[id];
    const h = huella(p);
    const variantes = (VARIANTES[id] ?? []).map(([nombre, v]) => ({ nombre, correo: pintar(id, { ...COMUNES, ...v }) }));
    const cuerpo = variantes.map(({ nombre, correo }) => `
<div class="variante">
  <h2>Variante: ${esc(nombre)}</h2>
  <p class="asunto"><strong>Asunto:</strong> ${esc(correo.asunto)}<br><strong>De:</strong> Soporte de Iurexia &lt;soporte@iurexia.com&gt; · <strong>Responder a:</strong> soporte@iurexia.com</p>
  ${correo.html}
  <details><summary>Texto plano</summary><pre>${esc(correo.texto)}</pre></details>
</div>`).join('\n');
    const variables = Object.entries(p.variables)
        .map(([k, d]) => `${k} (${d.tipo}${d.opcional ? ', opcional' : ''}${d.nota ? ` — ${d.nota}` : ''})`).join('; ');
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(`${id} · ${p.nombre}`)}</title><style>${ESTILO}</style></head><body>
<div class="cabeza">
  <h1>${esc(`${id} · ${p.nombre}`)}</h1>
  <p>Versión ${p.version} · sha256 <code>${h.sha256}</code></p>
  <p>Variables: ${esc(variables)}</p>
  <p>Datos de ejemplo, ficticios. Para aprobarla, en Supabase:
     <code>update public.plantillas_soporte set aprobada_at = now(), aprobada_por = 'David' where id = '${id}' and version = ${p.version};</code></p>
</div>
${cuerpo}
</body></html>`;
    writeFileSync(path.join(SALIDA, `${id}.html`), html);
    indice.push(`<li><a href="${id}.html">${esc(`${id} · ${p.nombre}`)}</a> — versión ${p.version} · <code>${h.sha256.slice(0, 16)}…</code> · ${variantes.length} ${variantes.length === 1 ? 'variante' : 'variantes'}</li>`);
    console.log(`${id} v${p.version} ${h.sha256}  ${variantes.length} variantes`);
}

writeFileSync(path.join(SALIDA, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plantillas de atención</title><style>${ESTILO} ul{max-width:760px;margin:0 auto;padding:0 40px;font-size:14px;line-height:2}</style></head><body>
<div class="cabeza"><h1>Atención automática · las ocho plantillas</h1>
<p>Cada una con todas sus variantes y datos de ejemplo. Ninguna sale sola hasta que su sha256 esté aprobado en
<code>plantillas_soporte</code> y Vercel tenga <code>ATENCION_MODO=enviar</code>.</p></div>
<ul>${indice.join('\n')}</ul></body></html>`);

/* La semilla: el texto canónico entre dólares, para que no haya nada que escapar. */
const semilla = [
    'insert into public.plantillas_soporte (id, version, sha256, texto) values',
    ids.map(id => {
        const p = PLANTILLAS[id];
        const t = textoCanonico(p);
        const etiqueta = `$plantilla_${id}_v${p.version}$`;
        if (t.includes(etiqueta)) throw new Error(`${id}: el texto contiene su propia etiqueta`);
        return `    ('${id}', ${p.version}, '${huella(p).sha256}', ${etiqueta}${t}${etiqueta})`;
    }).join(',\n'),
    'on conflict (id, version) do nothing;',
].join('\n');
writeFileSync(path.join(SALIDA, 'plantillas_soporte.sql'), `-- Semilla de plantillas_soporte (sin aprobar). Ya va dentro de supabase_atencion_automatica.sql.\n${semilla}\n`);

if (args.includes('--migracion')) {
    const ruta = path.join(RAIZ, 'supabase_atencion_automatica.sql');
    const sql = readFileSync(ruta, 'utf8');
    const ini = '-- SEMILLA (generada; no editar a mano)\n';
    const fin = '-- FIN DE LA SEMILLA';
    const a = sql.indexOf(ini);
    const b = sql.indexOf(fin);
    if (a < 0 || b < a) throw new Error('no encuentro las marcas de la semilla en la migración');
    writeFileSync(ruta, sql.slice(0, a + ini.length) + semilla + '\n' + sql.slice(b));
    console.log(`semilla escrita en ${path.relative(process.cwd(), ruta)}`);
}
console.log(`vistas previas en ${SALIDA}`);
