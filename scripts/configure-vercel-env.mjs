import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const {parse}=require('dotenv'),{PrismaClient}=require('@prisma/client');
const root=new URL('../',import.meta.url);
const report={applied:false,productionDatabaseWrites:false,variables:[]};
try{
 const config=JSON.parse(await readFile(new URL('config/deployment.json',root),'utf8'));
 const local=parse(await readFile(new URL('backend/.env',root),'utf8'));
 const auth=JSON.parse(await readFile(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8'));
 const headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
 const api='https://api.vercel.com/v10/projects/'+config.vercelProjectId+'/env?teamId='+config.vercelTeamId;
 const existingResponse=await fetch(api,{headers,signal:AbortSignal.timeout(15000)});
 if(!existingResponse.ok)throw new Error('VERCEL_AUTHENTICATION_REQUIRED');
 const existing=(await existingResponse.json()).envs||[];
 const targets=[['production',local.DATABASE_URL,config.productionBranchId,'production'],['preview',local.TEST_DATABASE_URL,config.testingBranchId,'testing']];
 for(const [target,url,id]of targets){
  if(!url)throw new Error('MISSING_DATABASE_CONFIGURATION');
  const parsed=new URL(url);if(!['require','verify-ca','verify-full'].includes(parsed.searchParams.get('sslmode')||''))throw new Error('DATABASE_TLS_REQUIRED');
  parsed.searchParams.set('connection_limit','3');parsed.searchParams.set('connect_timeout','10');
  const db=new PrismaClient({datasourceUrl:parsed.href,errorFormat:'minimal'});
  try{const rows=await db.$queryRaw`SELECT current_setting('neon.branch_id',true) AS id`;if(rows[0]?.id!==id)throw new Error('REAL_DATABASE_BRANCH_MISMATCH');}finally{await db.$disconnect();}
 }
 let productionSecret;
 if(!existing.some(e=>e.key==='SESSION_SECRET'&&e.target?.includes('production'))){
  const backup=new URL('backend/.env.vercel.production.local',root);
  try{productionSecret=parse(await readFile(backup,'utf8')).SESSION_SECRET;}catch{}
  if(!productionSecret){productionSecret=randomBytes(48).toString('base64url');await writeFile(backup,'SESSION_SECRET='+productionSecret+'\n',{mode:0o600,flag:'wx'});}
 }
 if(!local.SESSION_SECRET||local.SESSION_SECRET.length<32)throw new Error('TESTING_SESSION_SECRET_REQUIRED');
 for(const [target,url,id,branch]of targets){
  const values={DATABASE_URL:url,DATABASE_BRANCH:branch,NEON_BRANCH_ID:id,SESSION_SECRET:target==='production'?productionSecret:local.SESSION_SECRET,FRONTEND_URL:config.frontendUrl,FRONTEND_ORIGINS:config.frontendUrl,NODE_ENV:'production'};
  for(const [key,value]of Object.entries(values)){
   if(existing.some(e=>e.key===key&&e.target?.includes(target))){report.variables.push({key,target,status:'preserved-existing'});continue;}
   if(!value)throw new Error('MISSING_REQUIRED_VALUE');
   if(!process.argv.includes('--apply')){report.variables.push({key,target,status:'ready'});continue;}
   const secret=['DATABASE_URL','SESSION_SECRET'].includes(key);
   const response=await fetch(api,{method:'POST',headers,body:JSON.stringify({key,value,type:secret?'sensitive':'plain',target:[target]}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('VERCEL_VARIABLE_CREATE_FAILED_'+response.status);
   report.variables.push({key,target,status:'created'});
  }
 }
 report.applied=process.argv.includes('--apply');
}catch(error){const code=String(error.message||'');report.error=/^[A-Z0-9_]+$/.test(code)?code:'ENVIRONMENT_CONFIGURATION_FAILED';process.exitCode=1;}
await mkdir(new URL('evidence/deployment/',root),{recursive:true});
await writeFile(new URL('evidence/deployment/environment-result.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
