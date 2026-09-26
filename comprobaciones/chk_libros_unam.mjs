// Sólo los cinco libros de la colección `doctrina` pasan la puerta (25-sep-2026).
import { canonUNAM } from '../src/lib/proxyPdf.ts';
const casos = [
  ['https://archivos.juridicas.unam.mx/www/bjv/libros/8/3632/11.pdf', true],
  ['https://archivos.juridicas.unam.mx/www/bjv/libros/2/710/4.pdf', true],
  ['https://archivos.juridicas.unam.mx/www/bjv/libros/9/4001/1.pdf', false],
  ['https://archivos.juridicas.unam.mx/www/bjv/libros/8/36320/1.pdf', false],
];
let mal = 0;
for (const [u, esperado] of casos) { const r = canonUNAM(u) !== null; if (r !== esperado) { mal++; console.log('MAL', u, r); } }
console.log(mal ? `${mal} mal` : 'libros: todo bien');
process.exit(mal ? 1 : 0);
