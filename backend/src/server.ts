import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { buildApp } from './app.js';
import { boundedDatabaseUrl } from './database.js';
const secret = process.env.SESSION_SECRET;
if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required. Configure backend/.env with a PostgreSQL connection.');
if (!secret || secret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters. Keep it stable and private.');
const db = new PrismaClient({ datasourceUrl: boundedDatabaseUrl(process.env.DATABASE_URL) });
await db.$connect();
const app = await buildApp(db, {
    origins: (process.env.FRONTEND_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000').split(',').map(s => s.trim()), frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000', production: process.env.NODE_ENV === 'production', secret, mail: process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM ? {
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD, from: process.env.SMTP_FROM
    } : undefined
});
const stop = async () => {
    await app.close();
    await db.$disconnect();
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
await app.listen({
    port: Number(process.env.PORT || 3001), host: '127.0.0.1'
});
