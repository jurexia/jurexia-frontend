/**
 * Lanza la campaña «vitrina» con el MISMO motor que usa el cron.
 *
 * Se corre desde aquí y no por la ruta HTTP porque la CLI de Vercel no está
 * enlazada y no puedo leer ADMIN_CAMPAIGN_KEY. Los frenos son los mismos —
 * viven en enviarCampania, no en la ruta: no se escribe a quien se dio de
 * baja, no se repite a quien ya recibió esta campaña (índice único de
 * correo_envios) y no se escribe a los administradores.
 *
 *   npx tsx _campana.mts            → simulacro (no envía)
 *   npx tsx _campana.mts real       → envía de verdad
 */
import fs from 'fs';
const e = Object.fromEntries(fs.readFileSync('/Users/josedavidalcantarmendoza/Documents/IUREXIA-MAC/jurexia-api-git/.env','utf8')
  .split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
process.env.NEXT_PUBLIC_SUPABASE_URL = e.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = e.SUPABASE_SERVICE_KEY;
process.env.RESEND_API_KEY = e.RESEND_API_KEY;
process.env.FROM_EMAIL = e.FROM_EMAIL || 'Iurexia <noreply@iurexia.com>';
process.env.NEXT_PUBLIC_SITE_URL = 'https://www.iurexia.com';

const simulacro = process.argv[2] !== 'real';
const { CAMPANIAS } = await import('./src/lib/correo/campanias');
const { segmento } = await import('./src/lib/correo/segmentos');
const { enviarCampania } = await import('./src/lib/correo/enviar');

const destinatarios = await segmento('vitrina' as any);
console.log(`\n${simulacro ? 'SIMULACRO' : '>>> ENVÍO REAL <<<'} · campaña «vitrina»`);
console.log(`candidatos en el segmento: ${destinatarios.length}`);
const porPlan: Record<string, number> = {};
for (const d of destinatarios) porPlan[(d as any).subscription_type ?? '?'] = (porPlan[(d as any).subscription_type ?? '?'] ?? 0) + 1;

const r = await enviarCampania({
  campania: 'vitrina',
  destinatarios,
  construir: (CAMPANIAS as any).vitrina.construir,
  simulacro,
  maximo: 300,
});
console.log('\nresultado:', JSON.stringify(r, null, 2));
