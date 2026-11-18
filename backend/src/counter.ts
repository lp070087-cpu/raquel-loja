import type {FastifyInstance} from 'fastify';
import type {PrismaClient,Prisma} from '@prisma/client';
import {z} from 'zod';
import {ApiError,equal} from './domain.js';
import {pickupHash} from './pickup.js';
const codeInput=z.string().regex(/^\d{5}$/);
const limited={config:{rateLimit:{max:15,timeWindow:'15 minutes',keyGenerator:(r:any)=>`${r.ip}:${r.params?.id||'lookup'}`}}};
export function registerCounter(app:FastifyInstance,db:PrismaClient,auth:(r:any)=>Promise<any>,secret:string) {
 async function staff(req:any){const s=await auth(req);if(!['STAFF','ADMIN'].includes(s.user.role))throw new ApiError(403,'FORBIDDEN','Atendimento restrito à equipe autorizada.');return s;}
 async function locked(tx:Prisma.TransactionClient,identifier:string,code:string){
   const rows=await tx.$queryRaw<any[]>`SELECT * FROM "Order" WHERE "id"=${identifier} OR "orderNumber"=${identifier} FOR UPDATE`;
   const o=rows[0];if(!o)return {error:404,code:'NOT_FOUND'};
   if(o.pickupLockedUntil && o.pickupLockedUntil>new Date())return {error:429,code:'PICKUP_LOCKED'};
   if(!equal(o.pickupCodeHash||'',pickupHash(code,secret))){
     const attempts=o.pickupLockedUntil?1:o.pickupAttempts+1;
     await tx.order.update({where:{id:o.id},data:{pickupAttempts:attempts,pickupLockedUntil:attempts>=5?new Date(Date.now()+900000):null}});
     return {error:attempts>=5?429:422,code:attempts>=5?'PICKUP_LOCKED':'INVALID_PICKUP_CODE'};
   }
   return {order:o};
 }
 function checked(result:any){if(result.error)throw new ApiError(result.error,result.code,'Confira pedido, código e situação do atendimento.');return result;}
 app.post('/api/staff/orders/lookup',limited,async req=>{
   await staff(req);const input=z.object({identifier:z.string().trim().min(1).max(100).optional(),code:codeInput}).strict().parse(req.body);
   const result=await db.$transaction(async tx=>{
     // The reserved HMAC is unique across orders; never search by plaintext code.
     const reservation=input.identifier?null:await tx.pickupCodeReservation.findUnique({where:{codeHash:pickupHash(input.code,secret)},select:{orderId:true}});
     const identifier=input.identifier||reservation?.orderId;
     if(!identifier)return {error:404,code:'NOT_FOUND'};
     const r=await locked(tx,identifier,input.code);if(!r.order)return r;
     const o=await tx.order.findUniqueOrThrow({where:{id:r.order.id},include:{items:true,counterPayment:true,events:{orderBy:{createdAt:'asc'}},user:{select:{name:true,email:true}}}});
     const {pickupCodeHash,pickupCodeEncrypted,pickupAttempts,pickupLockedUntil,...safe}=o;
     return {order:safe};
   },{timeout:15000});return checked(result);
 });
 app.post('/api/staff/orders/:id/payment',limited,async req=>{
   const s=await staff(req);const input=z.object({code:codeInput,method:z.enum(['CASH','PIX','CARD'])}).strict().parse(req.body);
   const id=z.string().min(1).max(100).parse((req.params as any).id);
   const result=await db.$transaction(async tx=>{
     const r=await locked(tx,id,input.code);if(!r.order)return r;const o=r.order;
     if(o.fulfillmentType!=='PICKUP'||o.pickedUpAt||['CANCELLED','COMPLETED','SHIPPED'].includes(o.status))return {error:409,code:'ORDER_UNAVAILABLE'};
     if(o.paymentStatus!=='PENDING')return {error:409,code:'PAYMENT_ALREADY_RECORDED'};
     const payment=await tx.counterPayment.create({data:{orderId:o.id,employeeId:s.userId,method:input.method,amountCents:o.totalCents}});
     await tx.order.update({where:{id:o.id},data:{paymentStatus:'PAID',paymentMethod:input.method,status:o.status==='PENDING'?'CONFIRMED':o.status}});
     await tx.orderEvent.create({data:{orderId:o.id,actorId:s.userId,type:'COUNTER_PAYMENT',details:{method:input.method,amountCents:o.totalCents}}});
     return {payment};
   },{timeout:15000});return checked(result);
 });
 app.post('/api/staff/orders/:id/complete',limited,async req=>{
   const s=await staff(req);
   const input=z.object({code:codeInput,method:z.enum(['CASH','PIX','CARD']).optional(),receivedAndDelivered:z.literal(true)}).strict().parse(req.body);
   const id=z.string().min(1).max(100).parse((req.params as any).id);
   const result=await db.$transaction(async tx=>{
     const r=await locked(tx,id,input.code);if(!r.order)return r;const o=r.order;
     if(o.fulfillmentType!=='PICKUP'||o.pickedUpAt||['CANCELLED','COMPLETED','SHIPPED'].includes(o.status))return {error:409,code:'ORDER_UNAVAILABLE'};
     if(!['PENDING','PAID'].includes(o.paymentStatus))return {error:409,code:'PAYMENT_UNAVAILABLE'};
     if(o.paymentStatus==='PENDING'&&!input.method)return {error:400,code:'PAYMENT_METHOD_REQUIRED'};
     const now=new Date(),reserved=await tx.pickupCodeReservation.updateMany({where:{codeHash:o.pickupCodeHash,orderId:id,consumedAt:null},data:{consumedAt:now}});
     if(reserved.count!==1)return {error:409,code:'PICKUP_UNAVAILABLE'};
     const method=o.paymentStatus==='PAID'?o.paymentMethod:input.method!;
     if(o.paymentStatus==='PENDING'){
       await tx.counterPayment.create({data:{orderId:id,employeeId:s.userId,method,amountCents:o.totalCents}});
       await tx.orderEvent.create({data:{orderId:id,actorId:s.userId,type:'COUNTER_PAYMENT',details:{method,amountCents:o.totalCents,combined:true}}});
     }
     await tx.order.update({where:{id},data:{paymentStatus:'PAID',paymentMethod:method,status:'COMPLETED',pickedUpAt:now,pickedUpById:s.userId,pickupAttempts:0,pickupLockedUntil:null}});
     await tx.orderEvent.create({data:{orderId:id,actorId:s.userId,type:'PICKED_UP',details:{paymentStatus:'PAID',combined:true}}});
     return {completed:{orderId:id,orderNumber:o.orderNumber,totalCents:o.totalCents,paymentMethod:method,pickedUpAt:now}};
   },{timeout:15000});return checked(result);
 });
 app.post('/api/staff/orders/:id/cancel',limited,async req=>{
   const s=await staff(req);const input=z.object({code:codeInput,reason:z.string().trim().min(3).max(300)}).strict().parse(req.body);
   const id=z.string().min(1).max(100).parse((req.params as any).id);
   const result=await db.$transaction(async tx=>{
     const r=await locked(tx,id,input.code);if(!r.order)return r;const o=r.order;
     if(o.pickedUpAt||['COMPLETED','SHIPPED'].includes(o.status))return {error:409,code:'ORDER_UNAVAILABLE'};
     if(o.status==='CANCELLED')return {cancelled:true,replayed:true};
     // A paid order needs an explicit refund workflow, never an implicit refund.
     if(o.paymentStatus!=='PENDING')return {error:409,code:'REFUND_REQUIRED'};
     if(o.stockRestoredAt)return {error:409,code:'STOCK_ALREADY_RETURNED'};
     const items=await tx.orderItem.findMany({where:{orderId:o.id},orderBy:{productId:'asc'}});
     for(const item of items)await tx.product.update({where:{id:item.productId},data:{stock:{increment:item.quantity}}});
     await tx.order.update({where:{id:o.id},data:{status:'CANCELLED',stockRestoredAt:new Date()}});
     await tx.orderEvent.create({data:{orderId:o.id,actorId:s.userId,type:'CANCELLED_STOCK_RETURNED',details:{reason:input.reason,items:items.map(i=>({productId:i.productId,quantity:i.quantity}))}}});
     return {cancelled:true,replayed:false};
   },{timeout:15000});return checked(result);
 });
}
