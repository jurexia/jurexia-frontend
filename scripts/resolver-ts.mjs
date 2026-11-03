// Para las pruebas que importan src/lib/*.ts con `node --experimental-strip-types` (2-nov-2026).
// Node exige la extensión en los import; el código del front importa `./reloj` como lo resuelve
// Next. Este gancho prueba con `.ts` y conserva el `?tab=…` del que importa: así cada «pestaña»
// simulada tiene también su propio reloj.ts, como en el navegador.
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (e) {
    if (!especificador.startsWith('.') || /\\.[cm]?[jt]s$/.test(especificador)) throw e;
    const r = await siguiente(especificador + '.ts', contexto);
    const consulta = contexto.parentURL && new URL(contexto.parentURL).search;
    return consulta ? { ...r, url: r.url + consulta } : r;
  }
}`));
