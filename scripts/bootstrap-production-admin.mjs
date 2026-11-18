import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const {parse}=require('dotenv'),{PrismaClient}=require('@prisma/client'),{z}=require('zod');
let db;
try{
 const args=process.argv.slice(2);if(!args.includes('--production')||!args.includes('--confirm-first-admin'))throw new Error('EXPLICIT_OWNER_AUTHORIZATION_REQUIRED');
 const email=z.email().parse(args.find(a=>a.startsWith('--email='))?.slice(8)).toLowerCase();
 if(email.endsWith('.test')||email.endsWith('.invalid'))throw new Error('REAL_OWNER_ACCOUNT_REQUIRED');
 const config=JSON.parse(await readFile(new URL('../config/deployment.json',import.meta.url),'utf8'));
 const env=parse(await readFile(new URL('../backend/.env',import.meta.url),'utf8'));
 db=new PrismaClient({datasourceUrl:env.DATABASE_URL,errorFormat:'minimal'});
 const rows=await db.$queryRaw`SELECT current_setting('neon.branch_id',true) AS id`;if(rows[0]?.id!==config.productionBranchId)throw new Error('WRONG_PRODUCTION_BRANCH');
 const revoked=await db.$transaction(async tx=>{
  if(await tx.user.count({where:{role:'ADMIN'}}))throw new Error('ADMIN_ALREADY_EXISTS');
  const user=await tx.user.findUnique({where:{email},select:{id:true,role:true}});
  if(!user||user.role!=='CUSTOMER')throw new Error('SELF_REGISTERED_OWNER_ACCOUNT_REQUIRED');
  await tx.user.update({where:{id:user.id},data:{role:'ADMIN'}});
  const sessions=await tx.session.updateMany({where:{userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});
  await tx.adminAudit.create({data:{actorId:user.id,action:'PRODUCTION_FIRST_ADMIN_BOOTSTRAP',entityType:'User',entityId:user.id,details:{branch:'production',humanOwnerConfirmed:true}}});
  return sessions.count;
 },{isolationLevel:'Serializable'});
 console.log(JSON.stringify({role:'ADMIN',sessionsRevoked:revoked,passwordChanged:false,auditRecorded:true,personalDataSuppressed:true}));
}catch(error){const code=String(error.message||'');console.error(JSON.stringify({error:/^[A-Z0-9_]+$/.test(code)?code:'FIRST_ADMIN_CONFIGURATION_FAILED',personalDataSuppressed:true}));process.exitCode=1;}
finally{await db?.$disconnect();}
