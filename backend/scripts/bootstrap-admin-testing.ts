import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { assertTestingBranch } from '../src/test-database.js';
import { assertRealNeonIsolation } from '../src/neon-isolation.js';
import { boundedDatabaseUrl } from '../src/database.js';
// Local trusted operator only. Existing self-registered account; no fixed password.
async function main() {
    const args = process.argv.slice(2);
    if (!args.includes('--testing') || !args.includes('--confirm-admin-bootstrap'))
        throw new Error('CONFIRMATION_REQUIRED');
    const email = z.email().parse(args.find(a => a.startsWith('--email='))?.slice(8)).toLowerCase();
    assertTestingBranch(process.env.TEST_DATABASE_URL!, process.env.DATABASE_URL, process.env.TEST_DATABASE_BRANCH);
    await assertRealNeonIsolation(process.env.DATABASE_URL!, process.env.TEST_DATABASE_URL!);
    const db = new PrismaClient({ datasourceUrl: boundedDatabaseUrl(process.env.TEST_DATABASE_URL!) });
    try {
        await db.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { email } });
            if (!user)
                throw new Error('EXISTING_ACCOUNT_REQUIRED');
            if (await tx.user.count({ where: {
                    role: 'ADMIN', id: { not: user.id }
                } }) > 0)
                throw new Error('ADMIN_ALREADY_EXISTS');
            await tx.user.update({
                where: { id: user.id }, data: { role: 'ADMIN' }
            });
            await tx.session.updateMany({
                where: {
                    userId: user.id, revokedAt: null
                }, data: { revokedAt: new Date() }
            });
            await tx.adminAudit.create({ data: {
                    actorId: user.id, action: 'TESTING_ADMIN_BOOTSTRAP', entityType: 'User', entityId: user.id, details: { branch: 'testing' }
                } });
        }, { isolationLevel: 'Serializable' });
        console.log('Admin autorizado exclusivamente em testing; sessões revogadas. Entre novamente com sua senha existente.');
    }
    finally {
        await db.$disconnect();
    }
}
main().catch(() => {
    console.error('Bootstrap não realizado. Verifique conta existente, confirmação e isolamento de testing. Dados sensíveis suprimidos.');
    process.exitCode = 1;
});
