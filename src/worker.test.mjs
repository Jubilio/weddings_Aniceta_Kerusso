import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.js';
const sqlite=new DatabaseSync(':memory:');
const db={exec:async sql=>{for(const statement of sql.split("\n").filter(s=>s.trim()))sqlite.exec(statement)},prepare(sql){const s=sqlite.prepare(sql);return {bind(...args){return {first:async()=>s.get(...args)||null,all:async()=>({results:s.all(...args)}),run:async()=>({meta:{changes:s.run(...args).changes}})}},all:async()=>({results:s.all()})}},async batch(items){sqlite.exec('BEGIN');try{const r=[];for(const x of items)r.push(await x.run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const env={DB:db,ADMIN_PASSWORD:'1234',ASSETS:{fetch:()=>new Response('asset')}};
async function request(path,{method='GET',body,token,cookie,origin}={}){const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(token)headers['X-Invite-Token']=token;if(cookie)headers.Cookie=cookie;if(origin)headers.Origin=origin;const r=await worker.fetch(new Request('https://wedding.test'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')}}
test('Personal invitations, authentication, RSVP and atomic gift reservations',async()=>{
 assert.equal((await request('/api/admin/guests')).status,401);
 assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'wrong'}})).status,401);
 const login=await request('/api/admin/login',{method:'POST',body:{password:env.ADMIN_PASSWORD}});assert.equal(login.status,200);assert.match(login.cookie,/HttpOnly; Secure; SameSite=Strict/);const cookie=login.cookie.split(';')[0];
 const create=name=>request('/api/admin/guests',{method:'POST',cookie,body:{name,phone:''}});
 const a=await create('Convidado A'),b=await create('Convidado B');assert.equal(a.status,201);
 assert.equal((await request('/api/invite',{token:a.data.token})).data.guest.name,'Convidado A');
 assert.equal((await request('/api/invite',{token:'invalid'})).status,403);
 assert.equal((await request('/api/rsvp',{method:'POST',token:a.data.token,body:{rsvp:'yes'}})).status,200);
 assert.equal((await request('/api/invite',{token:a.data.token})).data.guest.rsvp,'yes');
 assert.equal((await request('/api/rsvp',{method:'POST',token:a.data.token,origin:'https://evil.test',body:{rsvp:'no'}})).status,403);
 const action=(token,what,id='mock-1')=>request('/api/gifts/'+id,{method:'POST',token,body:{action:what}});
 const race=await Promise.all([action(a.data.token,'reserve'),action(b.data.token,'reserve')]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 assert.equal((await action(b.data.token,'purchased')).status,409);
 const publicList=await request('/api/gifts');assert.equal(publicList.data.gifts.length,6);assert.ok(publicList.data.gifts.every(g=>!('guest_id'in g)&&!('guest_name'in g)));
 assert.equal((await action(a.data.token,'purchased')).status,200);assert.equal((await action(a.data.token,'release')).status,409);
 assert.equal((await action(a.data.token,'reserve','mock-2')).status,200);
 assert.equal((await request('/api/admin/guests/'+a.data.id,{method:'PATCH',cookie,body:{active:false}})).status,200);
 assert.equal((await request('/api/invite',{token:a.data.token})).status,403);
 assert.equal((await action(b.data.token,'reserve','mock-2')).status,200);
 assert.equal((await action(b.data.token,'reserve','mock-1')).status,409);
 assert.equal((await request('/api/admin/gifts/mock-1',{method:'PATCH',cookie,body:{reset:true}})).status,200);
 assert.equal((await action(b.data.token,'reserve','mock-1')).status,200);
 assert.equal((await request('/api/admin/guests',{cookie})).data.guests.length,2);
});

test('Four-digit PIN login is limited to five attempts per IP window',async()=>{
 for(let i=0;i<3;i++)assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'0000'}})).status,401);
 assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'1234'}})).status,429);
});
