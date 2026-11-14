import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { boundedDatabaseUrl } from '../src/database.js';

// Never print raw connection strings, environment values, or database errors.
const report: Record<string, unknown> = { databaseConfigured: !!process.env.DATABASE_URL, testDatabaseConfigured: !!process.env.TEST_DATABASE_URL, neonApiConfigured: !!process.env.NEON_API_KEY };
let db: PrismaClient | undefined;
try {
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.pathname.length < 2) throw new Error('INVALID_CONFIGURATION');
  report.validConnectionFormat = true;
  report.neonEndpoint = url.hostname.endsWith('.neon.tech');
  report.tlsRequired = ['require', 'verify-full', 'verify-ca'].includes(url.searchParams.get('sslmode') || '');
  if(process.env.TEST_DATABASE_URL) {
    try {
      const candidate = new URL(process.env.TEST_DATABASE_URL);
      report.testConnectionFormatValid = ['postgres:', 'postgresql:'].includes(candidate.protocol) && !!candidate.username && !!candidate.password && candidate.pathname.length > 1;
      report.testNeonEndpoint = candidate.hostname.endsWith('.neon.tech');
      const identity = (u:URL)=>u.hostname.replace(/-pooler(?=\.)/,'') + ':' + (u.port || '5432') + u.pathname;
      report.testTargetDistinct = identity(candidate) !== identity(url);
      report.testBranchConfirmed = process.env.TEST_DATABASE_BRANCH === 'testing';
    } catch { report.testConnectionFormatValid = false; }
  }
  const hint = process.env.DATABASE_BRANCH || process.env.NEON_BRANCH;
  report.configuredBranch = ['production', 'development', 'testing'].includes(hint || '') ? hint : 'not-confirmed';
  db = new PrismaClient({ datasourceUrl: boundedDatabaseUrl(url.href), errorFormat: 'minimal' });
  await db.$connect();
  await db.$queryRaw`SELECT 1`;
  report.selectOne = 'passed';
  const tables = await db.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
  report.publicTableCount = tables.length;
  const known = new Set(['User','Session','AuthToken','Address','CustomerMotorcycle','Product','ProductImage','ProductCompatibility','Cart','CartItem','CartMerge','Favorite','Coupon','CouponRedemption','Order','OrderItem']);
  report.applicationTables = tables.map(t=>t.table_name).filter(name=>known.has(name));
  report.otherTableCount = tables.filter(t=>!known.has(t.table_name) && t.table_name !== '_prisma_migrations').length;
  if(tables.some(t=>t.table_name === '_prisma_migrations')) {
    const migrations = await db.$queryRaw<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
    report.migrations = migrations.map(m=>({name:/^\d{14}_[a-z_]+$/.test(m.migration_name)?m.migration_name:'unrecognized',finished:!!m.finished_at,rolledBack:!!m.rolled_back_at}));
  } else report.migrations = [];
} catch (error: any) {
  const code = error.code || error.errorCode;
  report.error = typeof code === 'string' && /^[A-Z0-9_]{2,40}$/.test(code) ? code : 'CONFIGURATION_OR_CONNECTION_FAILED';
  report.errorType = ['PrismaClientInitializationError','PrismaClientKnownRequestError','PrismaClientValidationError','TypeError','Error'].includes(error.name) ? error.name : 'OTHER';
  const message = String(error.message || '');
  report.failureCategory = /authentication failed|password authentication/i.test(message) ? 'AUTHENTICATION' : /can.t reach|ENOTFOUND|ECONNREFUSED|timed out|timeout/i.test(message) ? 'NETWORK_OR_TIMEOUT' : /TLS|SSL|certificate/i.test(message) ? 'TLS' : /engine|generated|Prisma Client did not initialize/i.test(message) ? 'CLIENT_ENGINE' : /invalid|URL|connection string/i.test(message) ? 'CONFIGURATION' : 'OTHER';
  process.exitCode = 1;
} finally {
  await db?.$disconnect();
  console.log(JSON.stringify(report, null, 2));
}
