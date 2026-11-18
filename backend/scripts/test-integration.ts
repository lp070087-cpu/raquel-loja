import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { assertTestingBranch } from '../src/test-database.js';
import { assertRealNeonIsolation } from '../src/neon-isolation.js';
import { writeFile,readFile,readdir } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {boundedDatabaseUrl} from '../src/database.js';
async function main() {
if (!process.env.TEST_DATABASE_URL)
    throw new Error('Configure TEST_DATABASE_URL with a separate test database.');
assertTestingBranch(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, process.env.TEST_DATABASE_BRANCH);
await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL);
// Neon migrations require session continuity; only derive the direct hostname of
// the already verified testing endpoint. Never substitute the primary URL.
const migrationUrl=new URL(process.env.TEST_DATABASE_URL);
if(migrationUrl.hostname.endsWith('.neon.tech')) migrationUrl.hostname=migrationUrl.hostname.replace('-pooler.','.');
const env = {
    ...process.env, DATABASE_URL: migrationUrl.toString()
};
// Do not acquire a schema migration lock when the exact versioned SQL is already
// applied. Verify checksums and completion against testing before skipping it.
const probe=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL)});
let migrationsCurrent=false;
try {
    const applied=await probe.$queryRaw<{migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations"`;
    const directories=(await readdir('prisma/migrations',{withFileTypes:true})).filter(d=>d.isDirectory());
    migrationsCurrent=applied.every(m=>!!m.finished_at&&!m.rolled_back_at);
    for(const directory of directories) {
        const checksum=createHash('sha256').update(await readFile(`prisma/migrations/${directory.name}/migration.sql`)).digest('hex');
        if(!applied.some(m=>m.migration_name===directory.name&&m.checksum===checksum&&m.finished_at&&!m.rolled_back_at)) migrationsCurrent=false;
    }
} catch { migrationsCurrent=false; } finally {await probe.$disconnect();}
const counterOnly=process.argv.includes('--counter-only');
const suites=counterOnly?['tests/counter.integration.test.ts']:['tests/integration.test.ts','tests/pickup.integration.test.ts','tests/counter.integration.test.ts','tests/admin.integration.test.ts'];
for (const args of [...(counterOnly?[]:[['node_modules/prisma/build/index.js', 'migrate', 'deploy']]), ['node_modules/vitest/vitest.mjs', 'run', ...suites, '--reporter=json']]) {
    if(args[0].includes('prisma')&&migrationsCurrent) {console.log(JSON.stringify({phase:'testing-migrations',status:'already-applied',checksumsVerified:true}));continue;}
    if(args[0].includes('prisma'))await assertRealNeonIsolation(process.env.DATABASE_URL!,migrationUrl.toString());
    const result = spawnSync(process.execPath, args, {
        env: args[0].includes('prisma') ? env : { ...process.env, RUN_DATABASE_INTEGRATION: 'true' }, encoding: 'utf8'
    });
    const phase = args[0].includes('prisma') ? 'testing-migrations' : 'testing-integration';
    const diagnostics=String(result.stdout)+String(result.stderr);
    let counts:any = {diagnosticCodes:diagnostics.match(/P\d{4}|Test timed out in \d+ms|ERR_[A-Z_]+/g)||[],advisoryLockTimeout:/advisory lock|pg_advisory_lock/i.test(diagnostics)};
    if(phase==='testing-migrations'&&result.status!==0){
        let safe=diagnostics;
        const secrets=[process.env.DATABASE_URL,process.env.TEST_DATABASE_URL,migrationUrl.toString(),...Object.entries(process.env).filter(([key])=>/SECRET|TOKEN|PASSWORD/.test(key)).map(([,value])=>value)];
        for(const raw of [process.env.DATABASE_URL,process.env.TEST_DATABASE_URL,migrationUrl.toString()])if(raw){const url=new URL(raw);secrets.push(url.hostname,decodeURIComponent(url.username),decodeURIComponent(url.password));}
        for(const value of secrets.filter((v):v is string=>!!v&&v.length>3).sort((a,b)=>b.length-a.length))safe=safe.split(value).join('[REDACTED]');
        counts.migrationDiagnostic=safe.replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[REDACTED]').slice(-3000);
    }
    if (phase === 'testing-integration') {
        try {
            const json = result.stdout.slice(Math.max(0,result.stdout.lastIndexOf('\n{')+1)).trim();
            const parsed=JSON.parse(json);
            const cases=parsed.testResults.flatMap((file:any)=>file.assertionResults.map((item:any)=>({name:item.title,status:item.status,duration:item.duration,failureCodes:(item.failureMessages||[]).flatMap((m:string)=>m.match(/P\d{4}|expected \d+ to be \d+|Test timed out in \d+ms/g)||[])})));
            counts={ passed:parsed.numPassedTests, failed:parsed.numFailedTests, pending:parsed.numPendingTests,cases,fileFailures:parsed.testResults.filter((f:any)=>f.status==='failed').map((f:any)=>({codes:String(f.message||'').match(/P\d{4}|Hook timed out in \d+ms|Test timed out in \d+ms|out of memory|ENOMEM/g)||[]})) };
            await writeFile(counterOnly?'../evidence/counter-real-result.json':'../evidence/integration-real-result.json',JSON.stringify(counts,null,2));
        } catch {
            counts={diagnosticCodes:(String(result.stdout)+String(result.stderr)).match(/P\d{4}|Test timed out in \d+ms|ERR_[A-Z_]+|SyntaxError|Error: [A-Z_]{3,60}/g)||[],jsonReportParsed:false,outputCharacters:result.stdout?.length||0};
        }
    }
    console.log(JSON.stringify({phase,exitCode:result.status,...counts,rawOutputSuppressed:true}));
    if (result.status !== 0)
        process.exit(result.status || 1);
}

}
main().catch((error:any)=>{const code=String(error.code||error.errorCode||''),message=String(error.message||'');console.error(JSON.stringify({error:/^[A-Z_]{3,80}$/.test(message)?message:/^[A-Z0-9_]{2,40}$/.test(code)?code:'TESTING_RUNNER_FAILED',credentialsSuppressed:true}));process.exitCode=1;});
