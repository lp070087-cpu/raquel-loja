import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {buildApp} from '../src/app.js';
import {token} from '../src/domain.js';
import {assertTestingBranch} from '../src/test-database.js';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {boundedDatabaseUrl} from '../src/database.js';
import {setStaffAccess} from '../src/staff-access.js';
describe.skipIf(process.env.RUN_DATABASE_INTEGRATION!=='true')('Real counter payments and cancellation',()=>{
 const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL||'postgresql://localhost/unused')});
 const prefix=('counter-'+Date.now()+'-'+token().slice(0,5)).toLowerCase(),users:string[]=[];
 const config={origins:['http://localhost:8000'],frontendUrl:'http://localhost:8000',production:false,secret:process.env.SESSION_SECRET!};
 let app:Awaited<ReturnType<typeof buildApp>>,a:any,b:any,staff:any,ip=1;
 async function client(suffix:string){let cookie='';const r=await app.inject({url:'/api/auth/csrf'});const csrf=r.json().csrfToken;
  const c={id:'',async req(method:any,path:string,payload?:any){const res=await app.inject({method,url:'/api'+path,remoteAddress:`192.0.2.${++ip%250+1}`,headers:{origin:config.frontendUrl,cookie:`raquel_csrf=${csrf};${cookie}`,'x-csrf-token':csrf},payload});const s=res.cookies.find(c=>c.name==='raquel_session');if(s)cookie='raquel_session='+s.value;return res;}};
  const reg=await c.req('POST','/auth/register',{name:'Counter Test',email:`${prefix}-${suffix}@example.test`,phone:'81999999999',password:'controlled-counter-password-123'});expect(reg.statusCode).toBe(201);c.id=reg.json().user.id;users.push(c.id);return c;
 }
 async function order(client=a){expect((await client.req('PUT','/cart/items/'+prefix,{quantity:1})).statusCode).toBe(200);const r=await client.req('POST','/orders',{fulfillmentType:'PICKUP',idempotencyKey:token()});expect(r.statusCode).toBe(201);return r.json().order;}
 beforeAll(async()=>{
  assertTestingBranch(process.env.TEST_DATABASE_URL!,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
  app=await buildApp(db,config);a=await client('a');b=await client('b');staff=await client('staff');await db.user.update({where:{id:staff.id},data:{role:'STAFF'}});
  await db.product.create({data:{id:prefix,name:'Counter fixture',sku:prefix,slug:prefix,description:'Testing only',priceCents:3210,stock:50,metadata:{}}});
 },120000);
 afterAll(async()=>{if(users.length){await db.order.deleteMany({where:{userId:{in:users}}});await db.user.deleteMany({where:{id:{in:users}}});}await db.product.deleteMany({where:{id:{in:[prefix]}}});await app?.close();await db.$disconnect();},120000);
 it('accepts checkout without advance payment or chosen method',async()=>{const o=await order();expect(o.paymentStatus).toBe('PENDING');expect(o.paymentMethod).toBe('ON_PICKUP');expect(o.pickupCode).toMatch(/^\d{5}$/);expect(o.status).toBe('PENDING');expect(await db.orderEvent.count({where:{orderId:o.id,type:'CREATED_STOCK_RESERVED'}})).toBe(1);});
 for(const method of ['CASH','PIX','CARD'])it(`records ${method} at the counter and prevents duplicate payment`,async()=>{
   const o=await order();const lookup=await staff.req('POST','/staff/orders/lookup',{identifier:o.orderNumber,code:o.pickupCode});expect(lookup.statusCode).toBe(200);expect(lookup.json().order.totalCents).toBe(3210);expect(lookup.json().order).not.toHaveProperty('pickupCodeHash');
   const responses=await Promise.all([1,2].map(()=>staff.req('POST',`/staff/orders/${o.id}/payment`,{code:o.pickupCode,method})));
   expect(responses.map(r=>r.statusCode).sort()).toEqual([200,409]);
   const payment=await db.counterPayment.findUniqueOrThrow({where:{orderId:o.id}});expect(payment.amountCents).toBe(3210);expect(payment.method).toBe(method);expect(payment.employeeId).toBe(staff.id);expect(payment.createdAt).toBeInstanceOf(Date);
   expect(await db.orderEvent.count({where:{orderId:o.id,type:'COUNTER_PAYMENT'}})).toBe(1);
 });
 it('blocks unpaid pickup, confirms separate delivery and never returns withdrawn stock',async()=>{
   const o=await order();const path=`/staff/orders/${o.id}`;
   expect((await staff.req('POST',path+'/pickup',{code:o.pickupCode})).statusCode).toBe(409);
   expect((await staff.req('POST',path+'/payment',{code:o.pickupCode,method:'CASH'})).statusCode).toBe(200);
   expect((await db.order.findUniqueOrThrow({where:{id:o.id}})).pickedUpAt).toBeNull();
   expect((await staff.req('POST',path+'/pickup',{code:o.pickupCode})).statusCode).toBe(200);
   const stock=(await db.product.findUniqueOrThrow({where:{id:prefix}})).stock;
   expect((await staff.req('POST',path+'/cancel',{code:o.pickupCode,reason:'Not allowed after delivery'})).statusCode).toBe(409);
   expect((await db.product.findUniqueOrThrow({where:{id:prefix}})).stock).toBe(stock);
   expect((await a.req('GET','/orders/'+o.id)).json().order.status).toBe('COMPLETED');
   expect((await a.req('GET','/orders/'+o.id)).json().order.pickupCode).toBeNull();
   expect(await db.orderEvent.count({where:{orderId:o.id,type:'PICKED_UP'}})).toBe(1);
 });
 it('cancels concurrently and restores stock exactly once',async()=>{
   const o=await order();const before=(await db.product.findUniqueOrThrow({where:{id:prefix}})).stock;
   const results=await Promise.all([1,2].map(()=>staff.req('POST',`/staff/orders/${o.id}/cancel`,{code:o.pickupCode,reason:'Controlled cancellation'})));
   expect(results.map(r=>r.statusCode)).toEqual([200,200]);expect(results.filter(r=>r.json().replayed).length).toBe(1);
   expect((await db.product.findUniqueOrThrow({where:{id:prefix}})).stock).toBe(before+1);
   expect(await db.orderEvent.count({where:{orderId:o.id,type:'CANCELLED_STOCK_RETURNED'}})).toBe(1);
   expect((await staff.req('POST',`/staff/orders/${o.id}/payment`,{code:o.pickupCode,method:'PIX'})).statusCode).toBe(409);
 });
 it('serializes cancellation against payment without inconsistent stock',async()=>{
   const o=await order();const before=(await db.product.findUniqueOrThrow({where:{id:prefix}})).stock;
   const results=await Promise.all([staff.req('POST',`/staff/orders/${o.id}/payment`,{code:o.pickupCode,method:'CARD'}),staff.req('POST',`/staff/orders/${o.id}/cancel`,{code:o.pickupCode,reason:'Racing cancellation'})]);
   expect(results.map(r=>r.statusCode).sort()).toEqual([200,409]);const stored=await db.order.findUniqueOrThrow({where:{id:o.id}});
   expect((await db.product.findUniqueOrThrow({where:{id:prefix}})).stock).toBe(before+(stored.status==='CANCELLED'?1:0));
 });
 it('rejects customer operators, foreign customers, mismatched codes and browser prices',async()=>{
   const o=await order(),other=await order(b);
   expect((await b.req('GET','/orders/'+o.id)).statusCode).toBe(404);
   expect((await a.req('POST',`/staff/orders/${o.id}/payment`,{code:o.pickupCode,method:'CASH'})).statusCode).toBe(403);
   expect((await a.req('POST','/staff/orders/lookup',{identifier:o.id,code:o.pickupCode})).statusCode).toBe(403);
   expect((await staff.req('POST',`/staff/orders/${o.id}/payment`,{code:other.pickupCode,method:'CASH'})).statusCode).toBe(422);
   expect((await staff.req('POST',`/staff/orders/${o.id}/payment`,{code:o.pickupCode,method:'CASH',amountCents:1})).statusCode).toBe(400);
 });
 it('persists counter payment after recreating the API and Prisma connection',async()=>{
   const o=await order();expect((await staff.req('POST',`/staff/orders/${o.id}/payment`,{code:o.pickupCode,method:'PIX'})).statusCode).toBe(200);
   await app.close();app=await buildApp(db,config);
   const other=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL!)});
   try{expect((await other.counterPayment.findUniqueOrThrow({where:{orderId:o.id}})).method).toBe('PIX');}finally{await other.$disconnect();}
   expect((await staff.req('POST','/staff/orders/lookup',{identifier:o.orderNumber,code:o.pickupCode})).json().order.paymentStatus).toBe('PAID');
 });
 it('grants and revokes staff access without changing passwords and invalidates sessions',async()=>{
   const user=await db.user.findUniqueOrThrow({where:{id:b.id}});
   await setStaffAccess(db,user.email,'STAFF');
   expect((await b.req('GET','/auth/me')).statusCode).toBe(401);
   const granted=await db.user.findUniqueOrThrow({where:{id:b.id}});
   expect(granted.role).toBe('STAFF');expect(granted.passwordHash).toBe(user.passwordHash);
   await setStaffAccess(db,user.email,'CUSTOMER');
   expect((await db.user.findUniqueOrThrow({where:{id:b.id}})).role).toBe('CUSTOMER');
   await expect(setStaffAccess(db,'missing-controlled@example.test','STAFF')).rejects.toThrow('ACCOUNT_UNAVAILABLE');
 });
});
