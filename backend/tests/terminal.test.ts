import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import argon2 from 'argon2';
import {randomBytes} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import {registerTerminal} from '../src/terminal.js';
import {buildApp} from '../src/app.js';
import {hash,ApiError} from '../src/domain.js';

// HTTP behavior with an explicitly simulated ORM; not proof of Neon persistence.
async function fixture(){
 const secret=randomBytes(24).toString('hex'),raw=randomBytes(24).toString('hex');
 const terminal:any={id:'terminal-controlled',name:'Balcão controlado',tokenHash:hash(raw),createdById:'admin-controlled',expiresAt:new Date(Date.now()+86400000),revokedAt:null};
 const credential:any={userId:'staff-controlled',pinHash:await argon2.hash('508294',{type:argon2.argon2id}),enabled:true,failedAttempts:0,lockedUntil:null};
 const staff:any={id:credential.userId,name:'Atendente controlado',role:'STAFF',staffPin:credential};
 const db:any={
  counterTerminal:{findUnique:vi.fn(async()=>terminal),findMany:vi.fn(async()=>[{id:terminal.id,name:terminal.name}]),create:vi.fn(async({data})=>({...data,id:'new-terminal'})),updateMany:vi.fn(async({data})=>{Object.assign(terminal,data);return {count:1};})},
  user:{findUnique:vi.fn(async({where})=>where.id===staff.id?staff:null),findMany:vi.fn(async()=>[{id:staff.id,name:staff.name}])},
  staffPin:{update:vi.fn(async({data})=>Object.assign(credential,data)),upsert:vi.fn(async({update})=>Object.assign(credential,update)),updateMany:vi.fn(async({data})=>{Object.assign(credential,data);return {count:1};})},
  session:{create:vi.fn(async({data})=>data),updateMany:vi.fn(async()=>({count:1}))},adminAudit:{create:vi.fn(async({data})=>data)},$queryRaw:vi.fn(async()=>[])
 };db.$transaction=async(run:any)=>run(db);
 const app=Fastify();await app.register(cookie);await app.register(rateLimit,{max:1000});
 app.setErrorHandler((error:any,_req,reply)=>reply.code(error.statusCode||(error.name==='ZodError'?400:500)).send({code:error.code||error.name}));
 registerTerminal(app,db,async req=>{if(!req.headers['x-test-role'])throw new ApiError(401,'UNAUTHORIZED','Acesso necessário');return {userId:'admin-controlled',user:{role:req.headers['x-test-role'],passwordHash:await argon2.hash(secret)}};},true);
 const browserCookie=`raquel_counter_terminal=${raw}; raquel_csrf=controlled-csrf; raquel_session=previous-session`;
 return {app,db,secret,raw,terminal,credential,staff,browserCookie};
}
describe('counter PIN and authorized computers — simulated ORM',()=>{
 it('requires an authorized unexpired computer before listing names or attempting PIN',async()=>{
  const f=await fixture();try{
   expect((await f.app.inject('/api/counter/access')).statusCode).toBe(401);
   expect((await f.app.inject({url:'/api/counter/login',method:'POST',payload:{employeeId:f.staff.id,pin:'508294'}})).statusCode).toBe(401);
   expect(f.db.session.create).not.toHaveBeenCalled();
   f.terminal.revokedAt=new Date();expect((await f.app.inject({url:'/api/counter/access',headers:{cookie:f.browserCookie}})).statusCode).toBe(401);
   f.terminal.revokedAt=null;f.terminal.expiresAt=new Date(0);expect((await f.app.inject({url:'/api/counter/access',headers:{cookie:f.browserCookie}})).statusCode).toBe(401);
  }finally{await f.app.close();}
 });
 it('returns only names and identifiers on the authorized computer',async()=>{
  const f=await fixture();try{const r=await f.app.inject({url:'/api/counter/access',headers:{cookie:f.browserCookie}});expect(r.statusCode).toBe(200);expect(r.json().employees).toEqual([{id:f.staff.id,name:f.staff.name}]);expect(JSON.stringify(r.json())).not.toContain('Hash');expect(f.db.user.findMany.mock.calls[0][0]).toMatchObject({where:{role:'STAFF'},select:{id:true,name:true}});}finally{await f.app.close();}
 });
 it('rotates the previous browser session and issues a staff session bound to the terminal',async()=>{
  const f=await fixture();try{
   const r=await f.app.inject({url:'/api/counter/login',method:'POST',headers:{cookie:f.browserCookie},payload:{employeeId:f.staff.id,pin:'508294'}});expect(r.statusCode).toBe(200);expect(r.json().user.role).toBe('STAFF');
   const c=r.cookies.find(c=>c.name==='raquel_session');expect(c?.httpOnly).toBe(true);expect(c?.secure).toBe(true);expect(c?.sameSite).toBe('Lax');
   expect(f.db.session.updateMany).toHaveBeenCalledWith({where:{tokenHash:hash('previous-session'),revokedAt:null},data:{revokedAt:expect.any(Date)}});
   expect(f.db.session.updateMany).toHaveBeenCalledWith({where:{terminalId:f.terminal.id,revokedAt:null},data:{revokedAt:expect.any(Date)}});
   expect(f.db.session.create.mock.calls[0][0].data).toMatchObject({userId:f.staff.id,terminalId:f.terminal.id,csrfHash:hash('controlled-csrf')});expect(f.db.session.create.mock.calls[0][0].data.tokenHash).not.toBe(c?.value);
   expect(JSON.stringify(f.db.adminAudit.create.mock.calls)).not.toContain('508294');
  }finally{await f.app.close();}
 });
 it('persists failed attempts, locks the profile at five, and does not issue a session',async()=>{
  const f=await fixture();try{
   for(let i=1;i<=5;i++){const r=await f.app.inject({url:'/api/counter/login',method:'POST',headers:{cookie:f.browserCookie},payload:{employeeId:f.staff.id,pin:'999992'}});expect(r.statusCode).toBe(i===5?429:401);expect(f.credential.failedAttempts).toBe(i);}
   expect(f.credential.lockedUntil.getTime()).toBeGreaterThan(Date.now());expect(f.db.session.create).not.toHaveBeenCalled();
   expect((await f.app.inject({url:'/api/counter/login',method:'POST',headers:{cookie:f.browserCookie},payload:{employeeId:f.staff.id,pin:'508294'}})).statusCode).toBe(429);
   f.credential.lockedUntil=new Date(0);expect((await f.app.inject({url:'/api/counter/login',method:'POST',headers:{cookie:f.browserCookie},payload:{employeeId:f.staff.id,pin:'508294'}})).statusCode).toBe(200);expect(f.credential.failedAttempts).toBe(0);
  }finally{await f.app.close();}
 });
 it('never authenticates ADMIN or a disabled PIN and rejects malformed PIN',async()=>{
  const f=await fixture();try{
   const login=(pin='508294')=>f.app.inject({url:'/api/counter/login',method:'POST',headers:{cookie:f.browserCookie},payload:{employeeId:f.staff.id,pin}});
   f.staff.role='ADMIN';expect((await login()).statusCode).toBe(401);f.staff.role='STAFF';f.credential.enabled=false;expect((await login()).statusCode).toBe(401);expect((await login('123')).statusCode).toBe(400);expect(f.db.session.create).not.toHaveBeenCalled();
  }finally{await f.app.close();}
 });
 it('requires ADMIN and the current password for device enrollment and never returns its token hash',async()=>{
  const f=await fixture();try{
   const post=(role:string,currentPassword:string)=>f.app.inject({url:'/api/admin/terminals',method:'POST',headers:{'x-test-role':role},payload:{name:'Balcão 2',currentPassword}});
   expect((await post('STAFF',f.secret)).statusCode).toBe(403);expect((await post('ADMIN','incorrect')).statusCode).toBe(401);
   const r=await post('ADMIN',f.secret);expect(r.statusCode).toBe(201);expect(r.json().terminal).not.toHaveProperty('tokenHash');
   const c=r.cookies.find(c=>c.name==='raquel_counter_terminal');expect(c?.httpOnly).toBe(true);expect(c?.secure).toBe(true);expect(c?.sameSite).toBe('Strict');expect(c?.path).toBe('/api');expect(f.db.counterTerminal.create.mock.calls[0][0].data.tokenHash).toBe(hash(c!.value));
  }finally{await f.app.close();}
 });
 it('configures and disables a STAFF PIN with session invalidation and no plaintext audit',async()=>{
  const f=await fixture();try{
   const r=await f.app.inject({url:'/api/admin/employees/'+f.staff.id+'/pin',method:'PUT',headers:{'x-test-role':'ADMIN'},payload:{pin:'583920',currentPassword:f.secret}});expect(r.statusCode).toBe(200);expect(await argon2.verify(f.credential.pinHash,'583920')).toBe(true);expect(f.db.session.updateMany).toHaveBeenCalled();expect(JSON.stringify(f.db.adminAudit.create.mock.calls)).not.toContain('583920');
   const disabled=await f.app.inject({url:'/api/admin/employees/'+f.staff.id+'/pin',method:'DELETE',headers:{'x-test-role':'ADMIN'},payload:{currentPassword:f.secret}});expect(disabled.statusCode).toBe(200);expect(f.credential.enabled).toBe(false);
   const device=await f.app.inject({url:'/api/admin/terminals/'+f.terminal.id,method:'DELETE',headers:{'x-test-role':'ADMIN'},payload:{currentPassword:f.secret}});expect(device.statusCode).toBe(200);expect(f.terminal.revokedAt).toBeInstanceOf(Date);
  }finally{await f.app.close();}
 });
 it('global HTTP integration rejects PIN mutation without CSRF and rejects a PIN session on another computer',async()=>{
  const f=await fixture();let app;try{
   f.db.session.findUnique=vi.fn(async()=>({user:f.staff,terminalId:f.terminal.id,expiresAt:new Date(Date.now()+60000),revokedAt:null,csrfHash:'unused'}));
   app=await buildApp(f.db,{origins:['https://shop.example.test'],frontendUrl:'https://shop.example.test',production:true,secret:randomBytes(32).toString('hex')});
   expect((await app.inject({url:'/api/counter/login',method:'POST',payload:{employeeId:f.staff.id,pin:'508294'}})).statusCode).toBe(403);
   expect((await app.inject({url:'/api/auth/me',headers:{cookie:'raquel_session=controlled'}})).statusCode).toBe(401);
   expect((await app.inject({url:'/api/auth/me',headers:{cookie:'raquel_session=controlled; '+f.browserCookie.split(';')[0]}})).statusCode).toBe(200);
   f.terminal.revokedAt=new Date();expect((await app.inject({url:'/api/auth/me',headers:{cookie:'raquel_session=controlled; '+f.browserCookie.split(';')[0]}})).statusCode).toBe(401);
  }finally{await app?.close();await f.app.close();}
 });
});
