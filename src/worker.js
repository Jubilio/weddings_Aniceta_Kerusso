import {schema} from './schema.js';
import {seedGuests} from './guest-seed.js';
let initialized;
async function initialize(db){
 if(!initialized)initialized=(async()=>{for(const sql of schema.split('\n').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();const {results}=await db.prepare('PRAGMA table_info(guests)').all();for(const [column,definition] of [['checked_in_at',"INTEGER"],['companion_checked_in_at',"INTEGER"],['group_name',"TEXT NOT NULL DEFAULT ''"],['is_placeholder',"INTEGER NOT NULL DEFAULT 0"],['import_key',"TEXT"],['companion',"TEXT NOT NULL DEFAULT ''"],['companion_rsvp',"TEXT NOT NULL DEFAULT 'pending' CHECK(companion_rsvp IN ('pending','yes','no'))"]])if(!results.some(c=>c.name===column)){try{await db.prepare('ALTER TABLE guests ADD COLUMN '+column+' '+definition).run()}catch(e){const current=await db.prepare('PRAGMA table_info(guests)').all();if(!current.results.some(c=>c.name===column))throw e}}await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS guests_import_key ON guests(import_key)').run();await db.prepare('CREATE TABLE IF NOT EXISTS wedding_groups(name TEXT PRIMARY KEY,expected_people INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 999)').run();await db.prepare('CREATE TABLE IF NOT EXISTS wedding_imports(id TEXT PRIMARY KEY)').run();await db.prepare('CREATE TABLE IF NOT EXISTS guest_messages(guest_id TEXT PRIMARY KEY REFERENCES guests(id),author TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL)').run()})().catch(e=>{initialized=null;console.error('Wedding database initialization failed',e.message);fail('Não foi possível preparar a base de dados do convite. Contacte o administrador.',503)});
 await initialized;
}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Wedding-Version':'2026-10-12-groups'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const clean=(v,max=200)=>String(v??'').trim().slice(0,max);
async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
async function equal(a,b){const x=await digest(a),y=await digest(b);let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0}
async function sign(value,key){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function admin(req,env){if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<4)fail('O acesso administrativo ainda não está disponível.',503);const cookie=req.headers.get('Cookie')?.match(/(?:^|;\s*)wedding_admin=([^;]+)/)?.[1]||'';const [expires,sig]=cookie.split('.');if(!expires||Number(expires)<Date.now()||!sig||!await equal(sig,await sign(expires,env.ADMIN_PASSWORD)))fail('Inicie sessão no painel administrativo.',401)}
async function body(req){if(Number(req.headers.get('content-length'))>10000)fail('Pedido demasiado grande.',413);const text=await req.text();if(text.length>10000)fail('Pedido demasiado grande.',413);try{return JSON.parse(text)}catch{fail('Pedido inválido.')}}
async function guest(req,env){const token=req.headers.get('X-Invite-Token');if(!token)fail('Abra o link pessoal do seu convite.',401);const g=await env.DB.prepare('SELECT id,name,companion,rsvp,companion_rsvp FROM guests WHERE token=? AND active=1 AND is_placeholder=0').bind(token).first();if(!g)fail('Convite inválido ou desactivado.',403);return g}
export default {async fetch(req,env){const url=new URL(req.url),path=url.pathname;
 if(!path.startsWith('/api/')){
  const response=await env.ASSETS.fetch(req);
  if((path==='/'||path==='/index.html')&&response.headers.get('Content-Type')?.includes('text/html')){
   const origin=url.origin;
   return new HTMLRewriter()
    .on('meta[property="og:image"],meta[property="og:image:secure_url"],meta[name="twitter:image"]',{element(e){e.setAttribute('content',origin+'/assets/og-wedding-20270227.jpg')}})
    .on('meta[property="og:url"]',{element(e){e.setAttribute('content',origin+'/')}})
    .transform(response);
  }
  return response;
 }
 try{
 if(!['GET','POST','PATCH'].includes(req.method))fail('Método não permitido.',405);
 if(req.method!=='GET'){const origin=req.headers.get('Origin');if(origin&&origin!==url.origin)fail('Origem não permitida.',403);if(!req.headers.get('Content-Type')?.startsWith('application/json'))fail('Use JSON.',415)}
 if(path==='/api/admin/login'&&req.method==='POST'){
  if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<4)fail('O acesso administrativo ainda não está disponível.',503);
  if(!env.DB)fail('Ligue a base de dados DB antes de iniciar sessão.',503);
  await initialize(env.DB);
  const ip=req.headers.get('CF-Connecting-IP')||'unknown';
  const key=[...await digest(ip)].map(x=>x.toString(16).padStart(2,'0')).join('')+':'+Math.floor(Date.now()/900000);
  const limit=await env.DB.prepare('INSERT INTO login_limits(key,attempts) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key).first();
  if(limit.attempts>5)fail('Demasiadas tentativas. Aguarde até 15 minutos antes de tentar novamente.',429);
  const b=await body(req);if(!await equal(clean(b.password,1000),env.ADMIN_PASSWORD))fail('Palavra-passe incorrecta.',401);
  const expires=String(Date.now()+8*3600000);const res=json({ok:true});res.headers.set('Set-Cookie',`wedding_admin=${expires}.${await sign(expires,env.ADMIN_PASSWORD)}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800`);return res;
 }
 if(path==='/api/admin/logout'&&req.method==='POST'){const res=json({ok:true});res.headers.set('Set-Cookie','wedding_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0');return res}
 if(path.startsWith('/api/admin/'))await admin(req,env);
 if(!env.DB)fail('A base de dados ainda não foi ligada ao convite.',503);
 await initialize(env.DB);
 if(path.startsWith('/api/admin/'))await seedGuests(env.DB);
 if(path==='/api/admin/groups'&&req.method==='GET')return json({groups:(await env.DB.prepare('SELECT * FROM wedding_groups ORDER BY sort_order,name').all()).results});
 if(path==='/api/messages/mine'&&req.method==='GET'){const g=await guest(req,env);return json({message:await env.DB.prepare('SELECT author,message,created_at FROM guest_messages WHERE guest_id=?').bind(g.id).first()});}
 if(path==='/api/messages'&&req.method==='GET'){const offset=Math.max(0,Math.min(100000,Number.parseInt(url.searchParams.get('offset')||'0',10)||0));const {results}=await env.DB.prepare('SELECT author,message,created_at FROM guest_messages ORDER BY created_at DESC,guest_id LIMIT 21 OFFSET ?').bind(offset).all();return json({messages:results.slice(0,20),hasMore:results.length>20});}
 if(path==='/api/messages'&&req.method==='POST'){const g=await guest(req,env),b=await body(req);if(typeof b.message!=='string'||!b.message.trim()||b.message.length>1000)fail('Escreva uma mensagem com até 1000 caracteres.');if(!['primary','companion'].includes(b.person)||b.person==='companion'&&!g.companion)fail('Seleccione quem assina a mensagem.');const author=b.person==='companion'?g.companion:g.name;await env.DB.prepare('INSERT INTO guest_messages(guest_id,author,message,created_at) VALUES(?,?,?,?) ON CONFLICT(guest_id) DO UPDATE SET author=excluded.author,message=excluded.message,created_at=excluded.created_at').bind(g.id,author,b.message.trim(),Date.now()).run();return json({ok:true});}
 if(path==='/api/invite'&&req.method==='GET'){const g=await guest(req,env);return json({guest:{name:g.name,companion:g.companion,rsvp:g.rsvp,companion_rsvp:g.companion_rsvp}})}
 if(path==='/api/rsvp'&&req.method==='POST'){const g=await guest(req,env),b=await body(req);if(!['yes','no'].includes(b.rsvp))fail('Seleccione uma resposta válida.');const companionRsvp=g.companion?(b.companion_rsvp??g.companion_rsvp):'pending';if(!['pending','yes','no'].includes(companionRsvp))fail('Seleccione uma resposta válida para o acompanhante.');await env.DB.prepare('UPDATE guests SET rsvp=?,companion_rsvp=? WHERE id=? AND active=1').bind(b.rsvp,companionRsvp,g.id).run();return json({ok:true,rsvp:b.rsvp,companion_rsvp:companionRsvp})}
 if(path==='/api/gifts'&&req.method==='GET'){let g=null;if(req.headers.has('X-Invite-Token'))g=await guest(req,env);const {results}=await env.DB.prepare("SELECT id,name,description,status,guest_id FROM gifts WHERE NOT (id IN (\'mock-1\',\'mock-2\',\'mock-3\',\'mock-4\',\'mock-5\',\'mock-6\') AND status=\'available\' AND guest_id IS NULL AND description LIKE \'Exemplo:%\') ORDER BY name").all();return json({gifts:results.map(({guest_id,...gift})=>({...gift,mine:!!g&&guest_id===g.id}))})}
 const giftMatch=path.match(/^\/api\/gifts\/([^/]+)$/);
 if(giftMatch&&req.method==='POST'){const g=await guest(req,env),b=await body(req),id=giftMatch[1];let sql;
 if(b.action==='reserve')sql="UPDATE gifts SET status='reserved',guest_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='available' AND guest_id IS NULL";
 else if(b.action==='purchased')sql="UPDATE gifts SET status='purchased',updated_at=CURRENT_TIMESTAMP WHERE guest_id=? AND id=? AND status='reserved'";
 else if(b.action==='release')sql="UPDATE gifts SET status='available',guest_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE guest_id=? AND id=? AND status='reserved'";
 else fail('Acção inválida.');
 const r=await env.DB.prepare(sql).bind(g.id,id).run();if(!r.meta.changes)fail('Este presente já não está disponível para esta acção. A lista foi actualizada.',409);return json({ok:true});}
 if(path==='/api/admin/guests'&&req.method==='GET')return json({guests:(await env.DB.prepare('SELECT * FROM guests ORDER BY created_at DESC').all()).results});
 if(path==='/api/admin/guests'&&req.method==='POST'){const b=await body(req),name=clean(b.name);if(!name)fail('Indique o nome do convidado.');const id=crypto.randomUUID(),token=crypto.randomUUID().replaceAll('-','');await env.DB.prepare('INSERT INTO guests(id,name,companion,phone,token,group_name) VALUES(?,?,?,?,?,?)').bind(id,name,clean(b.companion),clean(b.phone,40),token,clean(b.group_name)).run();return json({ok:true,id,token},201)}
 const checkMatch=path.match(/^\/api\/admin\/guests\/([^/]+)\/checkin$/);
 if(checkMatch&&req.method==='POST'){const b=await body(req),g=await env.DB.prepare('SELECT * FROM guests WHERE id=?').bind(checkMatch[1]).first();if(!g)fail('Convidado não encontrado.',404);if(!g.active||g.is_placeholder)fail('Este convite não está disponível para registar entrada.',403);if(!['primary','companion'].includes(b.person)||typeof b.present!=='boolean')fail('Registo de presença inválido.');if(b.person==='companion'&&!g.companion)fail('Este convite não tem acompanhante.');const column=b.person==='primary'?'checked_in_at':'companion_checked_in_at';await env.DB.prepare('UPDATE guests SET '+column+'='+(b.present?'COALESCE('+column+',?)':'NULL')+' WHERE id=? AND active=1 AND is_placeholder=0').bind(...(b.present?[Date.now(),g.id]:[g.id])).run();return json({ok:true});}
 const gm=path.match(/^\/api\/admin\/guests\/([^/]+)$/);
 if(gm&&req.method==='PATCH'){const b=await body(req);const g=await env.DB.prepare('SELECT * FROM guests WHERE id=?').bind(gm[1]).first();if(!g)fail('Convidado não encontrado.',404);const name=clean(b.name??g.name);if(!name)fail('Nome obrigatório.');const companion=clean(b.companion??g.companion);const companionRsvp=companion?(b.companion_rsvp??(companion===g.companion?g.companion_rsvp:'pending')):'pending';if(!['pending','yes','no'].includes(companionRsvp))fail('Resposta do acompanhante inválida.');const active=b.active===undefined?g.active:(b.active?1:0);const rsvp=b.rsvp??g.rsvp;if(!['pending','yes','no'].includes(rsvp))fail('Resposta inválida.');const ops=[env.DB.prepare('UPDATE guests SET name=?,companion=?,phone=?,active=?,rsvp=?,companion_rsvp=?,group_name=?,is_placeholder=?,companion_checked_in_at=CASE WHEN companion=? THEN companion_checked_in_at ELSE NULL END WHERE id=?').bind(name,companion,clean(b.phone??g.phone,40),active,rsvp,companionRsvp,clean(b.group_name??g.group_name),g.is_placeholder&&name===g.name?1:0,companion,g.id)];if(!active)ops.push(env.DB.prepare("UPDATE gifts SET status='available',guest_id=NULL WHERE guest_id=? AND status='reserved'").bind(g.id));await env.DB.batch(ops);return json({ok:true})}
 if(path==='/api/admin/gifts'&&req.method==='GET')return json({gifts:(await env.DB.prepare('SELECT gifts.*,guests.name AS guest_name,guests.companion AS guest_companion FROM gifts LEFT JOIN guests ON guests.id=gifts.guest_id ORDER BY gifts.name').all()).results});
 if(path==='/api/admin/gifts'&&req.method==='POST'){const b=await body(req),name=clean(b.name);if(!name)fail('Indique o nome do presente.');await env.DB.prepare('INSERT INTO gifts(id,name,description) VALUES(?,?,?)').bind(crypto.randomUUID(),name,clean(b.description,1000)).run();return json({ok:true},201)}
 const am=path.match(/^\/api\/admin\/gifts\/([^/]+)$/);
 if(am&&req.method==='PATCH'){const b=await body(req),g=await env.DB.prepare('SELECT * FROM gifts WHERE id=?').bind(am[1]).first();if(!g)fail('Presente não encontrado.',404);const name=clean(b.name??g.name);if(!name)fail('Nome obrigatório.');if(b.reset)await env.DB.prepare("UPDATE gifts SET name=?,description=?,status='available',guest_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name,clean(b.description??g.description,1000),g.id).run();else await env.DB.prepare('UPDATE gifts SET name=?,description=? WHERE id=?').bind(name,clean(b.description??g.description,1000),g.id).run();return json({ok:true})}
 fail('Página não encontrada.',404);
 }catch(e){if(!e.status)console.error('Wedding API error',e.message);return json({error:e.status?e.message:'Não foi possível concluir. Tente novamente.'},e.status||500)}
}};
