import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../src/app.js';
import { boundedDatabaseUrl } from '../src/database.js';

// Opt-in additive check: creates only its own tagged customer/address/motorcycle.
// No DELETE, reset, seed, product mutation, stock change, or order is executed.
const report: Record<string,unknown> = { scope:'Controlled development account persistence',destructiveOperations:false };
let db:PrismaClient|undefined, app:Awaited<ReturnType<typeof buildApp>>|undefined;
try {
  if(process.env.DATABASE_BRANCH !== 'development') throw new Error('CONFIRM_DEVELOPMENT_BRANCH_REQUIRED');
  if(!process.env.DATABASE_URL || !process.env.SESSION_SECRET) throw new Error('MISSING_CONFIGURATION');
  process.env.NODE_ENV='test';
  db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.DATABASE_URL),errorFormat:'minimal'});
  app=await buildApp(db,{origins:['http://localhost:8000'],frontendUrl:'http://localhost:8000',production:false,secret:process.env.SESSION_SECRET});
  const marker='raquel-controlled-'+randomUUID();
  const email=marker+'@example.test';
  const password=randomBytes(24).toString('base64url');
  async function client() {
    const issued=await app!.inject({url:'/api/auth/csrf'});
    assert.equal(issued.statusCode,200);
    const csrf=issued.json().csrfToken;
    let session='';
    return async(method:any,path:string,payload?:any)=>{
      const response=await app!.inject({method,url:'/api'+path,headers:{origin:'http://localhost:8000',cookie:`raquel_csrf=${csrf}; ${session}`,'x-csrf-token':csrf},payload});
      const cookie=response.cookies.find(c=>c.name==='raquel_session');
      if(cookie) session='raquel_session='+cookie.value;
      return response;
    };
  }
  const first=await client();
  const registered=await first('POST','/auth/register',{name:marker,email,phone:'81999999999',password});
  assert.equal(registered.statusCode,201);
  const userId=registered.json().user.id;
  report.registration='passed';
  report.controlledUserId=userId;
  const record=await db.user.findUniqueOrThrow({where:{id:userId}});
  assert.ok(record.passwordHash.startsWith('$argon2id$'));
  assert.notEqual(record.passwordHash,password);
  report.passwordHash='argon2id';
  const second=await client();
  assert.equal((await second('POST','/auth/login',{email,password,remember:true})).statusCode,200);
  assert.equal((await second('GET','/auth/me')).json().user.id,userId);
  report.login='passed';
  assert.equal((await second('PATCH','/profile',{name:marker+' verified',phone:'81988888888'})).statusCode,200);
  const address=await second('POST','/addresses',{recipientName:marker,phone:'81988888888',zipCode:'53160010',street:'Endereço de teste controlado',number:'1',neighborhood:'Teste',city:'Olinda',state:'PE',isDefault:true});
  assert.equal(address.statusCode,201);
  const motorcycle=await second('POST','/motorcycles',{brand:'Honda',model:'CG 160',version:'Fan',year:2020,nickname:'Teste controlado',isPrimary:true});
  assert.equal(motorcycle.statusCode,201);
  const independent=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.DATABASE_URL),errorFormat:'minimal'});
  try {
    const saved=await independent.user.findUniqueOrThrow({where:{id:userId},include:{addresses:true,motorcycles:true}});
    assert.equal(saved.name,marker+' verified');
    assert.equal(saved.addresses.length,1); assert.equal(saved.motorcycles.length,1);
    report.independentConnectionPersistence='passed';
    report.profileAddressMotorcycle='passed';
  } finally {await independent.$disconnect();}
  assert.equal((await second('POST','/auth/logout',{})).statusCode,200);
  assert.equal((await second('GET','/auth/me')).statusCode,401);
  report.logout='passed';
  report.testRowsRetained=true;
} catch(error:any) {
  const code=String(error.code || error.errorCode || '');
  const message=String(error.message || '');
  report.error=/^[A-Z_]{3,60}$/.test(message)?message:/^[A-Z0-9_]{2,40}$/.test(code)?code:'CONTROLLED_VALIDATION_FAILED';
  process.exitCode=1;
} finally {
  await app?.close(); await db?.$disconnect();
  console.log(JSON.stringify(report,null,2));
}
