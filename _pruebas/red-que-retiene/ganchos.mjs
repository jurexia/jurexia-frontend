// Cómo se resuelven los imports de src/ fuera de Next, para correr el código
// REAL del front con Node (que ya entiende TypeScript): «./conversations» →
// conversations.ts, «@/lib/x» → src/lib/x.ts, y las dos piezas que tocan el
// exterior —«./supabase» y «./api»— por las de la prueba.
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '../../src');
const SUSTITUTOS = {
    supabase: pathToFileURL(path.join(AQUI, 'supabase-falso.mts')).href,
    api: pathToFileURL(path.join(AQUI, 'api-falsa.mts')).href,
};

function archivo(ruta) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
        if (existsSync(ruta + ext)) return ruta + ext;
    }
    return existsSync(ruta) && statSync(ruta).isFile() ? ruta : null;
}

export async function resolve(especificador, contexto, siguiente) {
    const padre = contexto.parentURL?.startsWith('file:') ? fileURLToPath(contexto.parentURL) : null;
    if (padre && padre.startsWith(SRC + path.sep)) {
        const base = especificador.startsWith('@/') ? path.join(SRC, especificador.slice(2))
            : especificador.startsWith('.') ? path.resolve(path.dirname(padre), especificador)
                : null;
        if (base) {
            const nombre = path.relative(path.join(SRC, 'lib'), base);
            if (nombre === 'supabase' || nombre === 'api') return { url: SUSTITUTOS[nombre], shortCircuit: true };
            const real = archivo(base);
            if (real) return { url: pathToFileURL(real).href, shortCircuit: true };
        }
    }
    return siguiente(especificador, contexto);
}

export async function load(url, contexto, siguiente) {
    // Los .ts de src/ son módulos ES aunque el package.json no lo diga.
    if (url.startsWith(pathToFileURL(SRC).href) && /\.tsx?$/.test(url)) {
        return siguiente(url, { ...contexto, format: 'module-typescript' });
    }
    return siguiente(url, contexto);
}
