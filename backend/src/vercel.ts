import type {FastifyInstance} from 'fastify';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {PrismaClient} from '@prisma/client';
import {buildApp,type Config} from './app.js';
import {boundedDatabaseUrl} from './database.js';

const configurationErrors=new Set(['DEPLOYMENT_TARGET_REQUIRED','DATABASE_BRANCH_MISMATCH','SERVER_CONFIGURATION_REQUIRED','SECURE_NEON_CONNECTION_REQUIRED','INVALID_PREVIEW_HOST','HTTPS_ORIGINS_REQUIRED','REAL_NEON_BRANCH_MISMATCH']);
export function safeDeploymentDetail(error:unknown,env:NodeJS.ProcessEnv=process.env){
 let detail=String((error as Error)?.message||'');
 const secrets=Object.entries(env).filter(([key,value])=>/SECRET|PASSWORD|TOKEN|DATABASE_URL/.test(key)&&value&&value.length>3).map(([,value])=>value!);
 for(const key of ['DATABASE_URL','TEST_DATABASE_URL']){try{const url=new URL(env[key]||'');if(url.password){secrets.push(url.password,decodeURIComponent(url.password));}}catch{}}
 for(const secret of secrets.sort((a,b)=>b.length-a.length))detail=detail.split(secret).join('[redacted]');
 return detail.replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi,'[database]').replace(/\s+/g,' ').slice(0,600);
}
export function serverlessConfig(env:NodeJS.ProcessEnv){
 const target=env.VERCEL_ENV;
 if(!['production','preview'].includes(target||''))throw new Error('DEPLOYMENT_TARGET_REQUIRED');
 const branch=target==='production'?'production':'testing';
 if(env.DATABASE_BRANCH!==branch||!env.NEON_BRANCH_ID)throw new Error('DATABASE_BRANCH_MISMATCH');
 if(!env.DATABASE_URL||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)throw new Error('SERVER_CONFIGURATION_REQUIRED');
 const database=new URL(env.DATABASE_URL);
 if(!['postgres:','postgresql:'].includes(database.protocol)||!database.hostname.endsWith('.neon.tech')||!['require','verify-ca','verify-full'].includes(database.searchParams.get('sslmode')||''))throw new Error('SECURE_NEON_CONNECTION_REQUIRED');
 const origins=(env.FRONTEND_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
 let frontendUrl=env.FRONTEND_URL||'';
 if(target==='preview'&&env.VERCEL_URL){
  if(!/^[a-z0-9.-]+\.vercel\.app$/i.test(env.VERCEL_URL))throw new Error('INVALID_PREVIEW_HOST');
  frontendUrl='https://'+env.VERCEL_URL;origins.push(frontendUrl);
 }
 if(!frontendUrl||new URL(frontendUrl).protocol!=='https:'||!origins.length||origins.some(v=>new URL(v).origin!==v||!v.startsWith('https://')))throw new Error('HTTPS_ORIGINS_REQUIRED');
 const config:Config={origins:[...new Set(origins)],frontendUrl,production:true,secret:env.SESSION_SECRET,trustProxy:env.VERCEL==='1'};
 if(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASSWORD&&env.SMTP_FROM)config.mail={host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),user:env.SMTP_USER,pass:env.SMTP_PASSWORD,from:env.SMTP_FROM};
 return {databaseUrl:boundedDatabaseUrl(env.DATABASE_URL),branchId:env.NEON_BRANCH_ID,config};
}

async function loadApplication(){
 const runtime=serverlessConfig(process.env);
 const db=new PrismaClient({datasourceUrl:runtime.databaseUrl,errorFormat:'minimal'});
 try{
  const rows=await db.$queryRaw<{id:string|null}[]>`SELECT current_setting('neon.branch_id',true) AS id`;
  if(rows[0]?.id!==runtime.branchId)throw new Error('REAL_NEON_BRANCH_MISMATCH');
  const app=await buildApp(db,runtime.config);await app.ready();return app;
 }catch(error){await db.$disconnect();throw error;}
}

export function createNodeHandler(load:()=>Promise<FastifyInstance>){
 let application:Promise<FastifyInstance>|undefined;
 return async function handle(request:IncomingMessage,response:ServerResponse):Promise<void>{
  response.setHeader('Cache-Control','no-store');
  try{
   application??=load().catch(error=>{application=undefined;throw error;});
   const app=await application;
   await new Promise<void>(resolve=>{
    const finished=()=>{response.off('finish',finished);response.off('close',finished);resolve();};
    response.once('finish',finished);response.once('close',finished);
    app.server.emit('request',request,response);
   });
  }catch(error){
   const message=String((error as Error)?.message||''),code=String((error as {code?:string;errorCode?:string})?.code||(error as {errorCode?:string})?.errorCode||'');
   const engineUnavailable=/Query Engine|query engine|libquery_engine|Unable to require|binary target/i.test(message);
   const type=String((error as Error)?.name||'');
   console.error(JSON.stringify({event:'API_INITIALIZATION_FAILED',type:/^[A-Za-z]{1,60}$/.test(type)?type:'Error',code:configurationErrors.has(message)?message:/^(ERR_[A-Z0-9_]+|FST_ERR_[A-Z0-9_]+|P\d{4})$/.test(code)?code:engineUnavailable?'PRISMA_ENGINE_UNAVAILABLE':message.includes('Invalid URL')?'INVALID_URL':'UNAVAILABLE',...(process.env.VERCEL_ENV==='preview'?{detail:safeDeploymentDetail(error)}:{})}));
   if(!response.headersSent){response.statusCode=503;response.setHeader('Content-Type','application/json; charset=utf-8');response.end(JSON.stringify({error:'API_UNAVAILABLE',message:'Serviço temporariamente indisponível.'}));}else response.destroy();
  }
 };
}

export const nodeHandler=createNodeHandler(loadApplication);
