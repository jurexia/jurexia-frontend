import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const e = Object.fromEntries(fs.readFileSync('/Users/josedavidalcantarmendoza/Documents/IUREXIA-MAC/jurexia-api-git/.env','utf8')
  .split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const a = Object.fromEntries(fs.readFileSync('.env.local','utf8')
  .split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const correo='zz-plat-test@ejemplo-borrar.mx';
const {data:{users}} = await db.auth.admin.listUsers({perPage:1000});
for (const u of users.filter(u=>u.email===correo)){ await db.from('user_profiles').delete().eq('id',u.id); await db.auth.admin.deleteUser(u.id); }
const {data,error} = await db.auth.admin.createUser({email:correo,password:'Plat!Prueba9',email_confirm:true});
if(error) throw error;
await db.from('user_profiles').upsert({id:data.user.id,email:correo,full_name:'Prueba Platinum',subscription_type:'platinum_monthly',queries_limit:560,is_active:true,estado:'queretaro'});
const pub = createClient(a.NEXT_PUBLIC_SUPABASE_URL, a.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const {data:s,error:er} = await pub.auth.signInWithPassword({email:correo,password:'Plat!Prueba9'});
if(er) throw er;
fs.writeFileSync('/tmp/ses2.json', JSON.stringify(s.session));
console.log('LISTO id='+data.user.id);
