// EL ESCRITO LIMPIO Y LA NOTA PARA EL ABOGADO, SEPARADOS (28-sep-2026).
//
// El prompt de redacción cierra el escrito con «## NOTA PARA EL ABOGADO»
// (`ROTULO_NOTA` en esfuerzo_redaccion.py del API) y los de la tarjeta
// «Escrito legal» con su «ESTRATEGIA…». `separarNota` manda el escrito a la
// hoja —con lo que el servidor pega detrás, que la hoja necesita— y la nota a
// la burbuja. Aquí:
//
//   · el corte por el rótulo, en sus variantes, con el mapa de citas y las
//     tarjetas de fuentes de vuelta en el escrito;
//   · lo que NO se corta: una consulta con su apartado de estrategia, una nota
//     dentro del escrito, una nota sin escrito delante, el razonamiento;
//   · la estrategia de los prompts por tipo, tras el cierre del escrito, con
//     su rótulo de «FASE 3»;
//   · el constructor (`separarEstrategia`) también aparta la nota;
//   · la vista previa en vivo no enseña el rótulo a medio llegar;
//   · tiempo lineal con textos hostiles.
//
//   node --experimental-strip-types comprobaciones/nota_abogado.mjs
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
const { recortarABloque } = await import(path.join(RAIZ, 'src/lib/documento/revelado.ts'));
const { metaDeCitas } = await import(path.join(RAIZ, 'src/lib/documento/citas.ts'));

let fallas = 0;
const ok = (cond, texto) => {
    console.log(`${cond ? '  ✔' : '  ✘'} ${texto}`);
    if (!cond) fallas++;
};

const UUID = '0a1b2c3d-1111-4222-8333-444455556666';
const DEMANDA = `C. JUEZ DE DISTRITO EN MATERIA ADMINISTRATIVA EN TURNO
P R E S E N T E

[DATO PENDIENTE: nombre de la parte quejosa], por mi propio derecho, promuevo demanda de amparo indirecto contra la orden de clausura.

**HECHOS**

1. El día [DATO PENDIENTE: fecha de la visita] la autoridad clausuró el establecimiento sin mandamiento escrito [Doc ID: ${UUID}].

**CONCEPTOS DE VIOLACIÓN**

PRIMERO. La clausura viola el artículo 16 constitucional porque carece de fundamentación y motivación.

**PUNTOS PETITORIOS**

PRIMERO. Tenerme por presentado.

PROTESTO LO NECESARIO
[DATO PENDIENTE: lugar y fecha]`;
const META = `<!-- CITATION_META:{"valid":1,"invalid":0,"total":1,"invalid_ids":[],"sources":{"${UUID}":{"ref":"Art. 16 CPEUM"}}} -->`;
const TARJETA = '<div class="fuentes-web"><div class="fw-cab">Fuentes de internet</div><a><span class="fw-tit">DOF</span> <span class="fw-dom">dof.gob.mx</span></a><div class="fw-nota">nota</div></div></div>';
const NOTA = `- Elegí el amparo indirecto: la clausura no es sentencia definitiva.
- Verifique el plazo de quince días hábiles (artículo 17 de la Ley de Amparo) y anexe copias de traslado.
- El punto débil es la prueba de la falta de mandamiento: recabe el acta de la visita.`;

// ── el corte por el rótulo ───────────────────────────────────────────────
{
    const r = M.separarNota(`${DEMANDA}\n\n## NOTA PARA EL ABOGADO\n\n${NOTA}\n${META}`);
    ok(r.nota === NOTA, 'la nota sale entera y sin su rótulo');
    ok(!r.escrito.includes('NOTA PARA EL ABOGADO') && !r.escrito.includes('Elegí el amparo'),
        'el escrito no lleva ni el rótulo ni la nota');
    ok(r.escrito.startsWith(DEMANDA), 'el escrito queda intacto');
    ok(metaDeCitas(r.escrito)?.sources?.[UUID]?.ref === 'Art. 16 CPEUM',
        'el mapa de citas vuelve al escrito: la hoja sigue sabiendo de dónde es cada cita');

    const conTarjeta = M.separarNota(`${DEMANDA}\n\n**NOTA PARA EL ABOGADO**\n${NOTA}\n\n${TARJETA}\n${META}`);
    ok(conTarjeta.nota === NOTA && conTarjeta.escrito.includes(TARJETA) && conTarjeta.escrito.includes('CITATION_META'),
        'con «**…**» y tarjeta de fuentes: la nota acaba en la tarjeta, que vuelve al escrito');

    for (const rotulo of ['### Nota para el abogado:', 'NOTAS PARA EL ABOGADO (no forma parte del escrito)', '  ## **NOTA PARA EL ABOGADO**']) {
        const v = M.separarNota(`${DEMANDA}\n\n${rotulo}\n${NOTA}`);
        ok(v.nota === NOTA && v.escrito === DEMANDA, `rótulo «${rotulo.trim()}»`);
    }

    const conSeparador = M.separarNota(`${DEMANDA}\n\n---\n\n## NOTA PARA EL ABOGADO\n${NOTA}`);
    ok(conSeparador.escrito === DEMANDA, 'la raya «---» de antes de la nota tampoco se queda en el escrito');

    const truncada = M.separarNota(`${DEMANDA}\n\n## NOTA PARA EL ABOGADO\n${NOTA}\n\n---\n\n⚠️ **Respuesta truncada** — envía «continúa».`);
    ok(truncada.nota === NOTA && truncada.escrito.includes('**Respuesta truncada**'),
        'el aviso de respuesta truncada no se mete en la nota');

    const estudio = `SEXTO. Estudio.\n\nLos conceptos de violación son **fundados**. ${'La responsable omitió valorar la prueba pericial ofrecida por el quejoso. '.repeat(8)}`;
    const sentencia = M.separarNota(`${estudio}\n\n## NOTA PARA EL ABOGADO\n- Supuse que el acto es definitivo.`);
    ok(sentencia.nota === '- Supuse que el acto es definitivo.' && sentencia.escrito === estudio.trimEnd(),
        'una resolución (sin «PROTESTO») también suelta su nota');
}

// ── lo que no se corta ───────────────────────────────────────────────────
{
    const consulta = `El plazo para promover el amparo indirecto es de quince días.\n\n${'Se cuenta a partir del día siguiente a la notificación. '.repeat(6)}\n\n## ESTRATEGIA PROCESAL\n\n- Conviene pedir la suspensión desde la demanda.`;
    ok(M.separarNota(consulta).nota === '' && M.separarNota(consulta).escrito === consulta,
        'una consulta con su apartado de estrategia se queda entera');

    const dentro = `${DEMANDA.replace('**PUNTOS PETITORIOS**', '## NOTA PARA EL ABOGADO\n- algo\n\n**PUNTOS PETITORIOS**')}`;
    ok(M.separarNota(dentro).nota === '', 'una nota ANTES del cierre del escrito no manda fuera el cierre');

    const primero = `## NOTA PARA EL ABOGADO\n- Faltan los hechos.\n\n${DEMANDA}`;
    ok(M.separarNota(primero).nota === '', 'con la nota delante y sin escrito antes, no se toca nada');

    const pensando = `<!--thinking-->Primero el escrito y al final:\n## NOTA PARA EL ABOGADO\n- plan<!--/thinking-->${DEMANDA}\n\n## NOTA PARA EL ABOGADO\n${NOTA}`;
    const p = M.separarNota(pensando);
    ok(p.nota === NOTA && p.escrito.includes('<!--thinking-->Primero el escrito') && p.escrito.includes('PROTESTO LO NECESARIO'),
        'el rótulo que el modelo menciona razonando no cuenta; el de después del escrito, sí');
    const abierto = `<!--THINKING_START-->${DEMANDA}\n\n## NOTA PARA EL ABOGADO\n- plan`;
    ok(M.separarNota(abierto).nota === '', 'con el razonamiento todavía abierto, no hay nota');

    ok(M.separarNota('').nota === '' && M.separarNota(null).escrito === '', 'vacío o nulo, nada');
    const enPrecedente = `${'Texto de la consulta sobre el abogado patrono. '.repeat(10)}\nLa nota para el abogado patrono debe contener su cédula profesional y el domicilio, conforme al artículo 12 de la Ley de Amparo, y además la autorización expresa.`;
    ok(M.separarNota(enPrecedente).nota === '', 'una frase larga que empieza igual no es rótulo');
}

// ── la estrategia de los prompts por tipo ────────────────────────────────
{
    const estrategia = `## ESTRATEGIA PROCESAL Y RECOMENDACIONES\n\n### Pruebas Indispensables a Recabar\n- [ ] El acta de la visita`;
    const r = M.separarNota(`${DEMANDA}\n\n---\n\n${estrategia}`);
    ok(r.escrito === DEMANDA && r.nota === estrategia, 'tras el «PROTESTO», la estrategia sale con su rótulo');

    const fase = `═══════════════════════════════════\n   FASE 3: ESTRATEGIA Y RECOMENDACIONES POST-DEMANDA\n═══════════════════════════════════\n\n---\n\n${estrategia}`;
    const f = M.separarNota(`${DEMANDA}\n\n${fase}`);
    ok(f.escrito === DEMANDA && f.nota.startsWith('FASE 3: ESTRATEGIA Y RECOMENDACIONES') && f.nota.includes('El acta de la visita'),
        'el rótulo «FASE 3: ESTRATEGIA Y RECOMENDACIONES» se va con la estrategia, y la raya de «═» también');
    const amparo = M.separarNota(`${DEMANDA}\n\nFASE 3: ESTRATEGIA CONSTITUCIONAL\n\n## ESTRATEGIA DEL AMPARO\n- Viable.`);
    ok(amparo.escrito === DEMANDA && amparo.nota.includes('Viable.'), '«FASE 3: ESTRATEGIA CONSTITUCIONAL» también');
}

// ── el constructor también aparta la nota ────────────────────────────────
{
    const r = M.separarEstrategia(`${DEMANDA}\n\n## NOTA PARA EL ABOGADO\n${NOTA}`);
    ok(r.escrito === DEMANDA && r.estrategia.includes('Elegí el amparo indirecto'), '`separarEstrategia` aparta la nota como la estrategia');
}

// ── la vista previa en vivo ──────────────────────────────────────────────
{
    const aMedias = `${DEMANDA}\n\n## NOTA PARA EL ABO`;
    const vista = recortarABloque(M.separarNota(aMedias).escrito);
    ok(!vista.includes('NOTA'), 'el rótulo a medio llegar no se asoma en la hoja');
    const yaLlego = `${DEMANDA}\n\n## NOTA PARA EL ABOGADO\n- Elegí el amparo`;
    ok(!recortarABloque(M.separarNota(yaLlego).escrito).includes('NOTA'), 'y en cuanto llega entero, se corta');
}

// ── tiempo lineal ────────────────────────────────────────────────────────
{
    const hostiles = {
        'renglones de blancos': ' '.repeat(20000) + '\n'.repeat(5000),
        'rótulos a medias': ('## NOTA PARA EL ABOGAD\n').repeat(8000),
        'rótulos enteros': (DEMANDA + '\n## NOTA PARA EL ABOGADO\n- x\n').repeat(300),
        'cierres y estrategias': ('PROTESTO LO NECESARIO\n## ESTRATEGIA PROCESAL\n').repeat(8000),
        'comentarios abiertos': '<!--'.repeat(30000),
    };
    for (const [nombre, texto] of Object.entries(hostiles)) {
        const t0 = performance.now();
        M.separarNota(texto);
        M.separarEstrategia(texto);
        const ms = performance.now() - t0;
        ok(ms < 400, `${nombre} (${texto.length.toLocaleString('es-MX')} caracteres): ${ms.toFixed(0)} ms`);
    }
}

console.log(fallas ? `\n✘ ${fallas} falla(s)` : '\n✔ todo bien');
process.exit(fallas ? 1 : 0);
