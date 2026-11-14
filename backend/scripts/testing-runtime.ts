import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { assertTestingBranch } from '../src/test-database.js';
import { assertRealNeonIsolation } from '../src/neon-isolation.js';
import { boundedDatabaseUrl } from '../src/database.js';
import { buildApp } from '../src/app.js';
try {
  const url=process.env.TEST_DATABASE_URL!;
  assertTestingBranch(url,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);
  await assertRealNeonIsolation(process.env.DATABASE_URL!,url);
  if(process.argv.includes('--seed')) {
    const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','prisma/seed.ts'],{encoding:'utf8',env:{...process.env,DATABASE_URL:url,DATABASE_BRANCH:'testing'}});
    console.log(JSON.stringify({operation:'testing-seed',exitCode:result.status,rawOutputSuppressed:true}));
    process.exitCode=result.status||0;
  } else {
    if(!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET_REQUIRED');
    process.env.NODE_ENV='test';
    const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(url),errorFormat:'minimal'});
    const app=await buildApp(db,{origins:['http://127.0.0.1:8000','http://localhost:8000'],frontendUrl:'http://127.0.0.1:8000',production:false,secret:process.env.SESSION_SECRET});
    await db.$queryRaw`SELECT 1`;
    const stop=async()=>{await app.close();await db.$disconnect();process.exit(0);};
    process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
    await app.listen({host:'127.0.0.1',port:3001});
    console.log('Real Fastify API connected exclusively to verified testing branch on port 3001.');
  }
} catch(error:any) {
  const value=String(error.code||error.errorCode||''), message=String(error.message||'');
  console.error(JSON.stringify({error:/^[A-Z_]{3,60}$/.test(message)?message:/^[A-Z0-9_]{2,40}$/.test(value)?value:'TESTING_RUNTIME_FAILED',credentialsSuppressed:true}));
  process.exitCode=1;
}
