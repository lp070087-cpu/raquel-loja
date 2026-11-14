import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import argon2 from 'argon2';
import {randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {assertTestingBranch} from '../src/test-database.js';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {boundedDatabaseUrl} from '../src/database.js';

const random=()=>randomBytes(32).toString('hex');
const digest=()=>createHash('sha256').update(random()).digest('hex');
const check=(condition:unknown)=>{if(!condition)throw new Error('BOOTSTRAP_SMOKE_ASSERTION');};

async function bootstrap(email:string):Promise<number>{
 return new Promise((resolveExit,reject)=>{
  const child=spawn(process.execPath,['dist/scripts/bootstrap-admin-testing.js','--testing','--confirm-admin-bootstrap',`--email=${email}`],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
  // Suppress both streams; CLI output must never escape into evidence/logs.
  child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill();},90000);
  child.once('error',()=>{clearTimeout(timer);reject(new Error('BOOTSTRAP_CLI_START_FAILED'));});
  child.once('exit',code=>{clearTimeout(timer);timedOut?reject(new Error('BOOTSTRAP_CLI_TIMEOUT')):resolveExit(code??1);});
 });
}

async function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||!args.includes('--testing')||!args.includes('--confirm-access-smoke'))throw new Error('CONFIRMATION_REQUIRED');
 assertTestingBranch(process.env.TEST_DATABASE_URL!,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);
 await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
 const source=await stat(resolve('scripts/bootstrap-admin-testing.ts'));
 const compiled=await stat(resolve('dist/scripts/bootstrap-admin-testing.js'));
 if(compiled.mtimeMs<source.mtimeMs)throw new Error('BUILD_REQUIRED');
 const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL!),errorFormat:'minimal'});
 const prefix=`access-bootstrap-${Date.now()}-${randomBytes(8).toString('hex')}`;
 const name='Bootstrap smoke controlado';
 const firstEmail=`${prefix}-first@example.test`,secondEmail=`${prefix}-second@example.test`;
 let firstId:string|undefined;
 let cleanup={accountsDemoted:0,sessionsRevoked:0};
 let verified=false;
 try{
  // Refuse before creating or updating anything when an administrator exists.
  if(await db.user.count({where:{role:'ADMIN'}}))throw new Error('EXISTING_ADMIN_BLOCKED');
  const hashes=await Promise.all([argon2.hash(random(),{type:argon2.argon2id}),argon2.hash(random(),{type:argon2.argon2id})]);
  const users=await db.$transaction(async tx=>{
   if(await tx.user.count({where:{role:'ADMIN'}}))throw new Error('EXISTING_ADMIN_BLOCKED');
   const first=await tx.user.create({data:{name,email:firstEmail,phone:'81999999999',passwordHash:hashes[0],role:'CUSTOMER'}});
   const second=await tx.user.create({data:{name,email:secondEmail,phone:'81999999999',passwordHash:hashes[1],role:'CUSTOMER'}});
   await tx.session.createMany({data:[first,second].map(user=>({userId:user.id,tokenHash:digest(),csrfHash:digest(),expiresAt:new Date(Date.now()+3600000)}))});
   return {first,second};
  },{isolationLevel:'Serializable',timeout:15000,maxWait:10000});
  firstId=users.first.id;
  check(await bootstrap(firstEmail)===0);
  const promoted=await db.user.findUniqueOrThrow({where:{id:firstId}});
  check(promoted.role==='ADMIN'&&promoted.passwordHash===hashes[0]);
  check(await db.session.count({where:{userId:firstId,revokedAt:null}})===0);
  check(await db.adminAudit.count({where:{actorId:firstId,action:'TESTING_ADMIN_BOOTSTRAP',entityType:'User',entityId:firstId}})===1);
  check(await bootstrap(secondEmail)!==0);
  const refused=await db.user.findUniqueOrThrow({where:{id:users.second.id}});
  check(refused.role==='CUSTOMER'&&refused.passwordHash===hashes[1]);
  check(await db.session.count({where:{userId:refused.id,revokedAt:null}})===1);
  check(await db.adminAudit.count({where:{actorId:refused.id,action:'TESTING_ADMIN_BOOTSTRAP'}})===0);
  verified=true;
 }finally{
  try{
   if(firstId){
    cleanup=await db.$transaction(async tx=>{
     // This invocation's exact generated identity only. Preserve business/audit records.
     const selected=await tx.user.findFirst({where:{id:firstId,email:firstEmail,name,role:{in:['ADMIN','CUSTOMER']}}});
     if(!selected)throw new Error('SMOKE_CLEANUP_IDENTITY_MISMATCH');
     const changed=selected.role==='ADMIN'?await tx.user.updateMany({where:{id:selected.id,email:firstEmail,name,role:'ADMIN'},data:{role:'CUSTOMER'}}):{count:0};
     const sessions=await tx.session.updateMany({where:{userId:selected.id,revokedAt:null},data:{revokedAt:new Date()}});
     return {accountsDemoted:changed.count,sessionsRevoked:sessions.count};
    },{isolationLevel:'Serializable',timeout:15000,maxWait:10000});
   }
  }finally{await db.$disconnect();}
 }
 check(verified&&cleanup.accountsDemoted===1);
 console.log(JSON.stringify({operation:'access-bootstrap-smoke',branch:'testing',passed:true,accountsCreated:2,bootstrapVerified:true,originalPasswordHashPreserved:true,sessionsRevoked:true,auditVerified:true,secondAdminBlocked:true,secondCustomerUnchanged:true,cleanup,accountsAndAuditPreserved:true,productionWrites:false,credentialsSuppressed:true}));
}

main().catch(error=>{
 const known=['CONFIRMATION_REQUIRED','BUILD_REQUIRED','EXISTING_ADMIN_BLOCKED','BOOTSTRAP_SMOKE_ASSERTION','BOOTSTRAP_CLI_START_FAILED','BOOTSTRAP_CLI_TIMEOUT','SMOKE_CLEANUP_IDENTITY_MISMATCH'];
 console.error(JSON.stringify({operation:'access-bootstrap-smoke',passed:false,error:known.includes(error?.message)?error.message:'ACCESS_SMOKE_FAILED',credentialsSuppressed:true}));
 process.exitCode=1;
});
