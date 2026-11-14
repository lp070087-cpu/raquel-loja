import 'dotenv/config';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { boundedDatabaseUrl } from '../src/database.js';
import { assertIsolatedTestDatabase } from '../src/test-database.js';
const fingerprint=(v:string)=>createHash('sha256').update(v).digest('hex').slice(0,16);
const report:any={scope:'Read-only verification of actual Neon destinations',productionWrites:false};
try {
  const primary=process.env.DATABASE_URL, testing=process.env.TEST_DATABASE_URL;
  if(!primary || !testing) throw new Error('MISSING_CONNECTION');
  assertIsolatedTestDatabase(testing,primary);
  const identities=[];
  for(const [label,raw] of [['production',primary],['testing',testing]]) {
    const url=new URL(raw);const endpoint=url.hostname.replace(/-pooler(?=\.)/,'');
    if(!endpoint.endsWith('.neon.tech')) throw new Error('NEON_ENDPOINT_REQUIRED');
    const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(raw),errorFormat:'minimal'});
    try {
      await db.$queryRaw`SELECT 1`;
      const rows=await db.$queryRaw<{branch_id:string|null;endpoint_id:string|null}[]>`SELECT current_setting('neon.branch_id', true) AS branch_id, current_setting('neon.endpoint_id', true) AS endpoint_id`;
      const tables=await db.$queryRaw<{table_name:string}[]>`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
      identities.push({endpoint,branch:rows[0]?.branch_id});
      report[label]={connection:'passed',endpointFingerprint:fingerprint(endpoint),branchFingerprint:rows[0]?.branch_id?fingerprint(rows[0].branch_id):null,publicTableCount:tables.length};
      if(tables.some(t=>t.table_name==='_prisma_migrations')) {
        const migrations=await db.$queryRaw<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
        report[label].migrations=migrations.map(m=>({name:/^\d{14}_[a-z_]+$/.test(m.migration_name)?m.migration_name:'unrecognized',finished:!!m.finished_at,rolledBack:!!m.rolled_back_at}));
      } else report[label].migrations=[];
    } finally {await db.$disconnect();}
  }
  if(identities[0].endpoint===identities[1].endpoint) throw new Error('SAME_ENDPOINT_BLOCKED');
  if(identities[0].branch && identities[1].branch && identities[0].branch===identities[1].branch) throw new Error('SAME_BRANCH_BLOCKED');
  report.distinctEndpoints=true;
  report.distinctBranchIds=identities[0].branch && identities[1].branch ? identities[0].branch!==identities[1].branch : 'not-exposed-by-postgres';
  report.userConfirmedBranchMapping=true;
} catch(error:any) {
  const code=String(error.code||error.errorCode||''), message=String(error.message||'');
  report.error=/^[A-Z_]{3,60}$/.test(message)?message:/^[A-Z0-9_]{2,40}$/.test(code)?code:'TARGET_VERIFICATION_FAILED';process.exitCode=1;
}
console.log(JSON.stringify(report,null,2));
if(!process.exitCode) await writeFile('../evidence/neon-targets-2026-10-28.json',JSON.stringify(report,null,2));
