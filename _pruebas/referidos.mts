/**
 * El ciclo completo de «Regale Iurexia», contra Supabase de verdad.
 *
 * POR QUÉ EXISTE
 * --------------
 * Este camino mueve dinero: otorga planes, los encadena y los revierte. Dos
 * fallos que sólo aparecieron al ejercitarlo de punta a punta, y que ningún
 * tipo habría detectado:
 *
 *   · al acumular un segundo premio, `plan_previo` guardaba el plan REGALADO
 *     en vez del real, así que la reversión habría dejado al usuario en Pro
 *     PARA SIEMPRE, gratis;
 *   · el primer tramo en vencer degradaba al usuario aunque otro siguiera
 *     corriendo.
 *
 * Crea usuarios de prueba con prefijo `zz-prueba-ref-` y los BORRA siempre,
 * incluso si una comprobación falla (va en `finally`). Aun así, corre contra
 * la base de producción: no lo dejes a medias.
 *
 * USO
 *   1. Un archivo con las dos variables (fuera del repo):
 *        NEXT_PUBLIC_SUPABASE_URL=...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *   2. npx tsx _pruebas/referidos.mts /ruta/al/archivo
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync(process.argv[2] ?? '.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
for (const k of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']) process.env[k]=env[k];

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  {auth:{autoRefreshToken:false,persistSession:false}});

const R = await import('../src/lib/referidos-backend');
const marca = 'zz-prueba-ref-' + Date.now();
const ids = [];
async function crear(plan='gratuito'){
  const {data,error} = await db.auth.admin.createUser({
    email:`${marca}-${ids.length}@ejemplo-borrar.mx`, password:'Pr'+Math.random().toString(36)+'!A9', email_confirm:true});
  if(error) throw error;
  await db.from('user_profiles').upsert({id:data.user.id,email:data.user.email,subscription_type:plan,queries_limit:plan==='gratuito'?5:140,is_active:true});
  ids.push(data.user.id); return data.user.id;
}
const plan = async id => (await db.from('user_profiles').select('subscription_type,queries_limit').eq('id',id).single()).data;

let ok=0,total=0;
const check=(n,c,d='')=>{total++;ok+=c;console.log((c?'  OK  ':'  MAL ')+n+(d?`  → ${d}`:''));};

try{
  console.log('\n── 1. El invitado cobra al registrarse ──');
  const padrino = await crear();
  const codigo = await R.asegurarCodigo(padrino);
  const a1 = await crear();
  const r1 = await R.registrarReferido(codigo, a1);
  check('se ató el referido', r1.atado);
  check('el invitado recibió el regalo', r1.regalo?.otorgado===true, `${r1.regalo?.dias} días de ${r1.regalo?.plan}`);
  const p1 = await plan(a1);
  check('el invitado quedó en Pro', p1.subscription_type==='pro_monthly' && p1.queries_limit===140);

  console.log('\n── 2. Sin consulta NO cuenta ──');
  let s = await R.sincronizarActivaciones(padrino);
  check('no se activó a nadie', s.activados===0);
  check('el padrino sigue gratuito', (await plan(padrino)).subscription_type==='gratuito');

  console.log('\n── 3. Con una consulta, el padrino cobra el peldaño 1 ──');
  await db.from('conversations').insert({user_id:a1,title:'prueba'});
  s = await R.sincronizarActivaciones(padrino);
  check('se activó 1 invitado', s.activados===1);
  const pp = await plan(padrino);
  check('el padrino subió a Pro', pp.subscription_type==='pro_monthly', `${pp.queries_limit} consultas`);

  console.log('\n── 4. El peldaño NO se paga dos veces ──');
  const antes = (await db.from('ascensos_referido').select('id').eq('usuario_id',padrino)).data.length;
  await R.evaluarEscalera(padrino); await R.evaluarEscalera(padrino);
  const despues = (await db.from('ascensos_referido').select('id').eq('usuario_id',padrino)).data.length;
  check('sigue habiendo un solo premio', antes===despues, `${antes} → ${despues}`);

  console.log('\n── 5. Acumular NO regala Pro para siempre ──');
  for (const n of [2,3]){ const a=await crear(); await R.registrarReferido(codigo,a); await db.from('conversations').insert({user_id:a,title:'p'}); }
  await R.sincronizarActivaciones(padrino);
  const filas = (await db.from('ascensos_referido').select('nivel,plan_previo,vence_at').eq('usuario_id',padrino).order('nivel')).data;
  check('cobró los peldaños 1 y 3', filas.map(f=>f.nivel).join(',')==='1,3', filas.map(f=>f.nivel).join(','));
  check('TODOS los plan_previo dicen gratuito', filas.every(f=>f.plan_previo==='gratuito'),
        filas.map(f=>f.plan_previo).join(' | '));
  check('los días se encadenan, no se pisan',
        new Date(filas[1].vence_at) > new Date(filas[0].vence_at));

  console.log('\n── 6. La reversión devuelve a gratuito, no a Pro ──');
  // Se vence el primer tramo a mano; el segundo sigue vivo.
  await db.from('ascensos_referido').update({vence_at:new Date(Date.now()-1000).toISOString()}).eq('usuario_id',padrino).eq('nivel',1);
  await R.revertirVencidos();
  check('NO se le degrada: aún le queda premio', (await plan(padrino)).subscription_type==='pro_monthly');
  await db.from('ascensos_referido').update({vence_at:new Date(Date.now()-1000).toISOString()}).eq('usuario_id',padrino).is('revertido_at',null);
  await R.revertirVencidos();
  const fin = await plan(padrino);
  check('ahora sí vuelve a gratuito', fin.subscription_type==='gratuito' && fin.queries_limit===5,
        `${fin.subscription_type} · ${fin.queries_limit}`);

  console.log('\n── 7. A un cliente Pro no se le regala Pro ──');
  const pro = await crear('pro_monthly');
  const cpro = await R.asegurarCodigo(pro);
  const a5 = await crear(); await R.registrarReferido(cpro,a5);
  await db.from('conversations').insert({user_id:a5,title:'p'});
  await R.sincronizarActivaciones(pro);
  const fp = (await db.from('ascensos_referido').select('id').eq('usuario_id',pro)).data;
  check('no se le otorgó nada', fp.length===0);
  check('sigue en su plan de pago', (await plan(pro)).subscription_type==='pro_monthly');
} finally {
  await db.from('conversations').delete().in('user_id',ids);
  await db.from('ascensos_referido').delete().in('usuario_id',ids);
  await db.from('referidos').delete().in('padrino_id',ids);
  await db.from('referidos').delete().in('ahijado_id',ids);
  await db.from('user_profiles').delete().in('id',ids);
  for (const id of ids) await db.auth.admin.deleteUser(id);
  console.log(`\n[limpieza] ${ids.length} usuarios de prueba borrados`);
}
console.log(`\n${ok}/${total} comprobaciones`);
process.exit(ok===total?0:1);
