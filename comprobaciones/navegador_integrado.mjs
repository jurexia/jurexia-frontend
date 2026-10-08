// EL NAVEGADOR INTEGRADO, SIN RED (7-oct-2026).
//   node --experimental-strip-types comprobaciones/navegador_integrado.mjs
import path from 'path';
import { fileURLToPath } from 'url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = await import(path.join(RAIZ, 'src/lib/navegador-integrado.ts'));
let fallos = 0;
const comprueba = (bien, e, d = '') => { if (!bien) fallos++; console.log(bien ? 'ok   ' : 'FALLA', e, d ? `— ${d}` : ''); };

const IG_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22A3354 Instagram 350.0.0.20.113 (iPhone15,2; iOS 18_0; es_MX; es; scale=3.00; 1170x2532; 123456789)';
const FB_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.40.108;]';
const FB_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F79 [FBAN/FBIOS;FBAV/470.0;FBBV/1;FBDV/iPhone14,5]';
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const TIKTOK = 'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 trill_340 BytedanceWebview/d8a21c6';

comprueba(N.appDelNavegadorIntegrado(IG_IOS) === 'Instagram', 'Instagram en iPhone');
comprueba(N.appDelNavegadorIntegrado(FB_ANDROID) === 'Facebook', 'Facebook en Android (FB_IAB)');
comprueba(N.appDelNavegadorIntegrado(FB_IOS) === 'Facebook', 'Facebook en iPhone (FBAN/FBIOS)');
comprueba(N.appDelNavegadorIntegrado(TIKTOK) === 'TikTok', 'TikTok (BytedanceWebview)');
comprueba(N.appDelNavegadorIntegrado(CHROME) === null, 'Chrome de escritorio: no es integrado');
comprueba(N.appDelNavegadorIntegrado(SAFARI) === null, 'Safari del iPhone: no es integrado');
comprueba(N.appDelNavegadorIntegrado(CHROME_AND) === null, 'Chrome de Android: no es integrado');
comprueba(N.appDelNavegadorIntegrado('') === null && N.appDelNavegadorIntegrado(null) === null && N.appDelNavegadorIntegrado(undefined) === null, 'vacío o nulo: no es integrado');
comprueba(N.esAndroid(FB_ANDROID) && !N.esAndroid(IG_IOS), 'Android sí, iPhone no');
const h = 'https://www.iurexia.com/registro?utm_source=meta&utm_campaign=v78&fbclid=IwAR_x';
comprueba(N.enlaceParaChrome(h) === 'intent://www.iurexia.com/registro?utm_source=meta&utm_campaign=v78&fbclid=IwAR_x#Intent;scheme=https;package=com.android.chrome;end', 'enlace para Chrome conserva ruta, utm y fbclid');
comprueba(N.enlaceParaChrome('javascript:alert(1)') === null && N.enlaceParaChrome('no es url') === null, 'esquemas raros o basura: nada');
console.log(fallos ? `\n${fallos} FALLOS` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
