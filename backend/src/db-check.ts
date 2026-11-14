import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { boundedDatabaseUrl } from './database.js';
if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is not configured.');
const db = new PrismaClient({ datasourceUrl: boundedDatabaseUrl(process.env.DATABASE_URL) });
try {
    await db.$connect();
    await db.$queryRaw `SELECT 1`;
    console.log('PostgreSQL connection verified by SELECT 1.');
}
catch (error: any) {
    const code = error.code || error.errorCode;
    console.error(JSON.stringify({ databaseConnection: 'failed', code: typeof code === 'string' && /^[A-Z0-9_]{2,40}$/.test(code) ? code : 'CONNECTION_ERROR', credentialsSuppressed: true }));
    process.exitCode = 1;
}
finally {
    await db.$disconnect();
}
