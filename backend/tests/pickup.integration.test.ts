import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {buildApp} from '../src/app.js';
import {token,decrypt} from '../src/domain.js';
import {pickupHash,reservePickupCode,generatePickupCode} from '../src/pickup.js';
import {assertTestingBranch} from '../src/test-database.js';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {boundedDatabaseUrl} from '../src/database.js';
const enabled=process.env.RUN_DATABASE_INTEGRATION==='true';
describe.skipIf(!enabled)('Pickup with real isolated Neon',()=>{
 const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL||'postgresql://localhost/unused')});
 const prefix='pickup-'+Date.now()+'-'+token().slice(0,5);
 const secret='pickup-integration-stable-secret-32-characters';
 const password='pickup-test-password-123';
 let app:Awaited<ReturnType<typeof buildApp>>,a:any,b:any,staff:any,admin:any;
 const users:string[]=[], orders:any[]=[]; let address=0;
 async function client(suffix:string) {
   const r=await app.inject({url:'/api/auth/csrf'}); const csrf=r.json().csrfToken; let session='';
   const c={id:'',async request(method:any,path:string,payload?:any){
     const result=await app.inject({method,url:'/api'+path,remoteAddress:`192.0.2.${Math.floor(++address/4)%250+1}`,
       headers:{origin:'http://localhost:8000',cookie:`raquel_csrf=${csrf}; ${session}`,'x-csrf-token':csrf},payload});
     const cookie=result.cookies.find(c=>c.name==='raquel_session');if(cookie)session=`raquel_session=${cookie.value}`;
     return result;
   }};
   const registration=await c.request('POST','/auth/register',{name:'Pickup Test',email:`${prefix}-${suffix}@example.com`,phone:'81999999999',password});
   expect(registration.statusCode).toBe(201);c.id=registration.json().user.id;users.push(c.id);return c;
 }
 beforeAll(async()=>{
   assertTestingBranch(process.env.TEST_DATABASE_URL!,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);
   await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
   app=await buildApp(db,{origins:['http://localhost:8000'],frontendUrl:'http://localhost:8000',production:false,secret});
   a=await client('a');b=await client('b');staff=await client('staff');admin=await client('admin');
   await db.user.update({where:{id:staff.id},data:{role:'STAFF'}});await db.user.update({where:{id:admin.id},data:{role:'ADMIN'}});
   await db.product.create({data:{id:prefix,slug:prefix,sku:prefix,name:'Controlled pickup fixture',description:'Testing only',priceCents:1999,stock:110,metadata:{}}});
 },120000);
 afterAll(async()=>{
   if(users.length){await db.order.deleteMany({where:{userId:{in:users}}});await db.user.deleteMany({where:{id:{in:users}}});}
   await db.product.deleteMany({where:{id:prefix}});await app?.close();await db.$disconnect();
 },120000);
 it('creates 100 independent orders via checkout with 100 unique five-digit codes',async()=>{
   for(let i=0;i<100;i++){
     const customer=i%2?a:b;
     expect((await customer.request('PUT','/cart/items/'+prefix,{quantity:1})).statusCode).toBe(200);
     const result=await customer.request('POST','/orders',{fulfillmentType:'PICKUP',paymentMethod:'CASH',idempotencyKey:prefix+'-'+i});
     expect(result.statusCode).toBe(201);const order=result.json().order;
     expect(order.pickupCode).toMatch(/^\d{5}$/);expect(order.paymentStatus).toBe('PENDING');orders.push(order);
   }
   expect(new Set(orders.map(o=>o.pickupCode)).size).toBe(100);
   expect((await db.product.findUniqueOrThrow({where:{id:prefix}})).stock).toBe(10);
 },600000);
 it('preserves leading zeroes, retries collisions and never reallocates consumed reservations',async()=>{
   let zero='';
   for(let i=0;i<10000;i++){const c=String(i).padStart(5,'0');if(!await db.pickupCodeReservation.findUnique({where:{codeHash:pickupHash(c,secret)}})){zero=c;break;}}
   expect(zero).toMatch(/^0\d{4}$/);
   const code=await db.$transaction(tx=>reservePickupCode(tx,secret,()=>zero));
   expect(decrypt(code.encrypted,secret)).toBe(zero);
   // Reassign only this controlled fixture to demonstrate retrieval of leading zeroes.
   const fixture=orders[4];
   await db.$transaction(async tx=>{
     await tx.pickupCodeReservation.updateMany({where:{orderId:fixture.id},data:{orderId:null}});
     await tx.pickupCodeReservation.update({where:{codeHash:code.codeHash},data:{orderId:fixture.id}});
     await tx.order.update({where:{id:fixture.id},data:{pickupCodeHash:code.codeHash,pickupCodeEncrypted:code.encrypted}});
   });
   expect((await b.request('GET','/orders/'+fixture.id)).json().order.pickupCode).toBe(zero);
   await db.pickupCodeReservation.update({where:{codeHash:code.codeHash},data:{consumedAt:new Date()}});
   let attempts=0;
   const next=await db.$transaction(tx=>reservePickupCode(tx,secret,()=>++attempts===1?zero:generatePickupCode()));
   expect(attempts).toBeGreaterThan(1);expect(next.codeHash).not.toBe(code.codeHash);
   await expect(db.$transaction(tx=>reservePickupCode(tx,secret,()=>zero),{timeout:20000})).rejects.toMatchObject({code:'PICKUP_CODE_UNAVAILABLE'});
 },120000);
 it('exposes codes only to the owner and denies customer staff access',async()=>{
   const order=orders[0];
   expect((await a.request('GET','/orders/'+order.id)).statusCode).toBe(404);
   const own=await b.request('GET','/orders/'+order.id);expect(own.json().order.pickupCode).toBe(order.pickupCode);
   expect(own.json().order).not.toHaveProperty('pickupCodeHash');expect(own.json().order).not.toHaveProperty('pickupCodeEncrypted');
   expect((await b.request('POST',`/staff/orders/${order.id}/pickup`,{code:order.pickupCode})).statusCode).toBe(403);
   expect((await app.inject({method:'POST',url:`/api/staff/orders/${order.id}/pickup`,headers:{origin:'http://localhost:8000'},payload:{code:order.pickupCode}})).statusCode).toBeGreaterThanOrEqual(400);
 });
 it('blocks pending payments and cancelled orders',async()=>{
   expect((await staff.request('POST',`/staff/orders/${orders[0].id}/pickup`,{code:orders[0].pickupCode})).statusCode).toBe(409);
   await db.order.update({where:{id:orders[1].id},data:{paymentStatus:'PAID',status:'CANCELLED'}});
   expect((await staff.request('POST',`/staff/orders/${orders[1].id}/pickup`,{code:orders[1].pickupCode})).statusCode).toBe(409);
 });
 it('allows one concurrent confirmation, records employee/time, hides used code and blocks replay',async()=>{
   const order=orders[2];await db.order.update({where:{id:order.id},data:{paymentStatus:'PAID'}});
   const responses=await Promise.all([staff,admin].map(c=>c.request('POST',`/staff/orders/${order.id}/pickup`,{code:order.pickupCode})));
   expect(responses.map(r=>r.statusCode).sort()).toEqual([200,409]);
   const stored=await db.order.findUniqueOrThrow({where:{id:order.id}});
   expect(stored.status).toBe('COMPLETED');expect(stored.pickedUpAt).toBeInstanceOf(Date);expect([staff.id,admin.id]).toContain(stored.pickedUpById);
   expect((await b.request('GET','/orders/'+order.id)).json().order.pickupCode).toBeNull();
   expect((await staff.request('POST',`/staff/orders/${order.id}/pickup`,{code:order.pickupCode})).statusCode).toBe(409);
   expect((await db.pickupCodeReservation.findUniqueOrThrow({where:{orderId:order.id}})).consumedAt).toBeInstanceOf(Date);
 });
 it('locks guessing after five incorrect attempts, persists across API restart',async()=>{
   const order=orders[3];await db.order.update({where:{id:order.id},data:{paymentStatus:'PAID'}});
   const wrong=order.pickupCode==='00000'?'00001':'00000';
   for(let i=0;i<5;i++) expect((await staff.request('POST',`/staff/orders/${order.id}/pickup`,{code:wrong})).statusCode).toBe(i===4?429:422);
   await app.close();app=await buildApp(db,{origins:['http://localhost:8000'],frontendUrl:'http://localhost:8000',production:false,secret});
   expect((await staff.request('POST',`/staff/orders/${order.id}/pickup`,{code:order.pickupCode})).statusCode).toBe(429);
   expect((await a.request('GET','/orders/'+order.id)).json().order.pickupCode).toBe(order.pickupCode);
 });
});
