import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { boundedDatabaseUrl } from '../src/database.js';
import { assertAdditiveMigration } from '../src/migration-safety.js';

const apply = process.argv.includes('--apply');
let db: PrismaClient | undefined;
try {
  if (!process.env.DATABASE_URL) throw new Error('MISSING_DATABASE_URL');
  const folders = (await readdir('prisma/migrations', { withFileTypes: true })).filter(f=>f.isDirectory()).map(f=>f.name).sort();
  for (const folder of folders) {
    assertAdditiveMigration(await readFile(`prisma/migrations/${folder}/migration.sql`, 'utf8'));
  }
  if (apply) {
    if (!['development','testing'].includes(process.env.DATABASE_BRANCH || '')) throw new Error('CONFIRM_DEVELOPMENT_OR_TESTING_BRANCH');
    db = new PrismaClient({ datasourceUrl: boundedDatabaseUrl(process.env.DATABASE_URL), errorFormat:'minimal' });
    const tables = await db.$queryRaw<{table_name:string}[]>`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
    // Applying this initial release is allowed only to an empty target. Existing
    // schemas require a separate compatibility check, never a reset or baseline.
    if (tables.some(t=>t.table_name !== '_prisma_migrations')) throw new Error('EXISTING_SCHEMA_REQUIRES_REVIEW');
    await db.$disconnect(); db=undefined;
  }
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js','migrate',apply?'deploy':'status'], { encoding:'utf8',env:{...process.env,DATABASE_URL:boundedDatabaseUrl(process.env.DATABASE_URL)} });
  const output = String(result.stdout || '') + String(result.stderr || '');
  const state = /Database schema is up to date|No pending migrations/.test(output) ? 'up-to-date' : /successfully applied/.test(output) ? 'applied' : /have not yet been applied|not yet managed/.test(output) ? 'pending' : result.status===0?'success':'failed';
  console.log(JSON.stringify({operation:apply?'deploy':'status',state,exitCode:result.status,localMigrations:folders,additiveSqlReviewed:true,rawOutputSuppressed:true},null,2));
  if(result.status && !(state==='pending' && !apply)) process.exitCode=1;
} catch(error:any) {
  const safe = String(error.message || '');
  console.log(JSON.stringify({operation:apply?'deploy':'status',error:/^[A-Z_]{3,60}$/.test(safe)?safe:'MIGRATION_CHECK_FAILED',credentialsSuppressed:true}));
  process.exitCode=1;
} finally { await db?.$disconnect(); }
