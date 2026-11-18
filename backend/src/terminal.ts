import type {FastifyInstance} from 'fastify';
import type {PrismaClient,Prisma} from '@prisma/client';
import argon2 from 'argon2';
import {z} from 'zod';
import {ApiError,hash,token,publicUser} from './domain.js';

const identity=z.string().trim().min(1).max(100);
const password=z.string().min(1).max(128);
const pin=z.string().regex(/^\d{6}$/);
const terminalCookie='raquel_counter_terminal';
const limit={config:{rateLimit:{max:10,timeWindow:'15 minutes',keyGenerator:(req:any)=>`${req.ip}:${hash(req.cookies?.[terminalCookie]||'none')}`}}};
const loginLimit={config:{rateLimit:{max:50,timeWindow:'15 minutes',keyGenerator:(req:any)=>`${req.ip}:${hash(req.cookies?.[terminalCookie]||'none')}`}}};
const safeTerminal={id:true,name:true,createdAt:true,expiresAt:true,revokedAt:true} as const;
export function registerTerminal(app:FastifyInstance,db:PrismaClient,auth:(req:any)=>Promise<any>,production:boolean){
 const cookieOptions={httpOnly:true,secure:production,sameSite:'strict' as const,path:'/api'};
 const transaction=<T>(run:(tx:Prisma.TransactionClient)=>Promise<T>)=>db.$transaction(run,{timeout:15000,maxWait:10000});
 const audit=(tx:Prisma.TransactionClient,actorId:string,action:string,entityId:string,details:Prisma.InputJsonValue={})=>tx.adminAudit.create({data:{actorId,action,entityType:'CounterAccess',entityId,details}});
 async function admin(req:any,currentPassword?:string){
   const s=await auth(req);if(s.user.role!=='ADMIN')throw new ApiError(403,'FORBIDDEN','Acesso restrito à administração.');
   if(currentPassword!==undefined&&!await argon2.verify(s.user.passwordHash,currentPassword))throw new ApiError(401,'PASSWORD_REQUIRED','Confirme sua senha atual.');return s;
 }
 async function terminal(req:any){
   const raw=req.cookies?.[terminalCookie];if(!raw)throw new ApiError(401,'TERMINAL_REQUIRED','Autorize este computador com a conta administrativa.');
   const t=await db.counterTerminal.findUnique({where:{tokenHash:hash(raw)}});
   if(!t||t.revokedAt||t.expiresAt<=new Date())throw new ApiError(401,'TERMINAL_REQUIRED','A autorização deste computador expirou ou foi revogada.');return t;
 }
 app.get('/api/admin/terminals',async req=>{await admin(req);return {terminals:await db.counterTerminal.findMany({select:safeTerminal,orderBy:{createdAt:'desc'},take:100})};});
 app.post('/api/admin/terminals',limit,async(req,reply)=>{
   const data=z.object({name:z.string().trim().min(2).max(80),currentPassword:password}).strict().parse(req.body),s=await admin(req,data.currentPassword),raw=token();
   const created=await transaction(async tx=>{const t=await tx.counterTerminal.create({data:{name:data.name,tokenHash:hash(raw),createdById:s.userId,expiresAt:new Date(Date.now()+7*86400000)}});await audit(tx,s.userId,'COUNTER_TERMINAL_AUTHORIZED',t.id,{name:t.name});return t;});
   reply.setCookie(terminalCookie,raw,{...cookieOptions,maxAge:7*86400});return reply.code(201).send({terminal:{id:created.id,name:created.name,expiresAt:created.expiresAt}});
 });
 app.delete('/api/admin/terminals/:id',limit,async req=>{
   const data=z.object({currentPassword:password}).strict().parse(req.body),s=await admin(req,data.currentPassword),id=identity.parse((req.params as any).id);
   await transaction(async tx=>{const changed=await tx.counterTerminal.updateMany({where:{id,revokedAt:null},data:{revokedAt:new Date()}});if(!changed.count)throw new ApiError(404,'NOT_FOUND','Computador não encontrado ou já revogado.');await tx.session.updateMany({where:{terminalId:id,revokedAt:null},data:{revokedAt:new Date()}});await audit(tx,s.userId,'COUNTER_TERMINAL_REVOKED',id);});return {ok:true};
 });
 app.put('/api/admin/employees/:id/pin',limit,async req=>{
   const data=z.object({pin,currentPassword:password}).strict().parse(req.body),s=await admin(req,data.currentPassword),id=identity.parse((req.params as any).id);
   if(/^(\d)\1{5}$/.test(data.pin)||['123456','654321'].includes(data.pin))throw new ApiError(400,'WEAK_PIN','Escolha seis números menos previsíveis.');
   const pinHash=await argon2.hash(data.pin,{type:argon2.argon2id});
   await transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR UPDATE`;const user=await tx.user.findUnique({where:{id},select:{role:true}});if(user?.role!=='STAFF')throw new ApiError(422,'STAFF_REQUIRED','O PIN é exclusivo de funcionários autorizados.');await tx.staffPin.upsert({where:{userId:id},create:{userId:id,pinHash},update:{pinHash,enabled:true,failedAttempts:0,lockedUntil:null}});await tx.session.updateMany({where:{userId:id,terminalId:{not:null},revokedAt:null},data:{revokedAt:new Date()}});await audit(tx,s.userId,'STAFF_PIN_CONFIGURED',id);});return {ok:true};
 });
 app.delete('/api/admin/employees/:id/pin',limit,async req=>{
   const data=z.object({currentPassword:password}).strict().parse(req.body),s=await admin(req,data.currentPassword),id=identity.parse((req.params as any).id);
   await transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR UPDATE`;await tx.staffPin.updateMany({where:{userId:id},data:{enabled:false}});await tx.session.updateMany({where:{userId:id,terminalId:{not:null},revokedAt:null},data:{revokedAt:new Date()}});await audit(tx,s.userId,'STAFF_PIN_DISABLED',id);});return {ok:true};
 });
 app.get('/api/counter/access',async req=>{
   const t=await terminal(req);return {terminal:{id:t.id,name:t.name,expiresAt:t.expiresAt},employees:await db.user.findMany({where:{role:'STAFF',staffPin:{is:{enabled:true}}},select:{id:true,name:true},orderBy:{name:'asc'},take:100})};
 });
 app.post('/api/counter/login',loginLimit,async(req,reply)=>{
   const t=await terminal(req),data=z.object({employeeId:identity,pin}).strict().parse(req.body),raw=token();
   const result=await transaction(async tx=>{
     await tx.$queryRaw`SELECT id FROM "CounterTerminal" WHERE id=${t.id} FOR UPDATE`;
     const current=await tx.counterTerminal.findUnique({where:{id:t.id}});if(!current||current.revokedAt||current.expiresAt<=new Date())return {error:401};
     await tx.$queryRaw`SELECT id FROM "User" WHERE id=${data.employeeId} FOR UPDATE`;
     const user=await tx.user.findUnique({where:{id:data.employeeId},include:{staffPin:true}}),credential=user?.staffPin;
     if(!user||user.role!=='STAFF'||!credential?.enabled)return {error:401};
     if(credential.lockedUntil&&credential.lockedUntil>new Date())return {error:429};
     const valid=await argon2.verify(credential.pinHash,data.pin);
     if(!valid){const attempts=credential.lockedUntil?1:Math.min(5,credential.failedAttempts+1);await tx.staffPin.update({where:{userId:user.id},data:{failedAttempts:attempts,lockedUntil:attempts>=5?new Date(Date.now()+15*60000):null}});return {error:attempts>=5?429:401};}
     await tx.staffPin.update({where:{userId:user.id},data:{failedAttempts:0,lockedUntil:null}});
     const previous=req.cookies.raquel_session;if(previous)await tx.session.updateMany({where:{tokenHash:hash(previous),revokedAt:null},data:{revokedAt:new Date()}});
     // The terminal row is locked: simultaneous switches cannot leave two active operators.
     await tx.session.updateMany({where:{terminalId:t.id,revokedAt:null},data:{revokedAt:new Date()}});
     await tx.session.create({data:{userId:user.id,tokenHash:hash(raw),csrfHash:hash(req.cookies.raquel_csrf||''),expiresAt:new Date(Math.min(Date.now()+12*3600000,current.expiresAt.getTime())),terminalId:t.id}});
     await audit(tx,user.id,'STAFF_PIN_LOGIN',t.id);return {user:publicUser(user)};
   });
   if(result.error)throw new ApiError(result.error,result.error===429?'PIN_LOCKED':'INVALID_CREDENTIALS',result.error===429?'Aguarde 15 minutos antes de tentar novamente.':'Nome ou PIN inválido.');
   reply.setCookie('raquel_session',raw,{...cookieOptions,sameSite:'lax'});return {user:result.user};
 });
}
