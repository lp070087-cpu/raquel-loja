import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { token } from '../src/domain.js';
import { assertTestingBranch } from '../src/test-database.js';
import { assertRealNeonIsolation } from '../src/neon-isolation.js';
import { boundedDatabaseUrl } from '../src/database.js';
// Fixture credentials are transient IPC data, never stdout, CLI arguments or files.
async function main() {
    if (!process.send)
        throw new Error('IPC_REQUIRED');
    assertTestingBranch(process.env.TEST_DATABASE_URL!, process.env.DATABASE_URL, process.env.TEST_DATABASE_BRANCH);
    await assertRealNeonIsolation(process.env.DATABASE_URL!, process.env.TEST_DATABASE_URL!);
    const db = new PrismaClient({ datasourceUrl: boundedDatabaseUrl(process.env.TEST_DATABASE_URL!) });
    try {
        const prefix = ('admin-browser-' + Date.now() + '-' + token().replace(/[^a-z0-9]/gi, '').slice(0, 5)).toLowerCase();
        const accounts: any = {};
        for (const role of ['ADMIN', 'STAFF', 'CUSTOMER'] as const) {
            const password = token();
            const email = `${prefix}-${role.toLowerCase()}@example.test`;
            const user = await db.user.create({ data: {
                    name: role === 'ADMIN' ? 'Administradora de teste' : role === 'STAFF' ? 'Funcionário de teste' : 'Cliente de teste', email, phone: '81999999999', role, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), cart: { create: {} }
                } });
            accounts[role.toLowerCase()] = {
                id: user.id, email, password
            };
        }
        const category = await db.category.create({ data: {
                name: 'Categoria controlada', slug: prefix
            } });
        const source = await db.product.findFirst({
            where: { active: true }, include: { images: true }
        });
        const product = await db.product.create({ data: {
                id: prefix, slug: prefix, sku: prefix, name: 'Produto de gestão controlado', description: 'Fixture exclusiva em testing', priceCents: 4567, stock: 20, categoryId: category.id, metadata: {
                    categoria: category.slug, marca: 'Testing'
                }, images: { create: source?.images.map(i => ({
                        imageUrl: i.imageUrl, position: i.position
                    })) || [] }
            } });
        process.send({
            prefix, ...accounts, productId: product.id, categoryId: category.id
        });
    }
    finally {
        await db.$disconnect();
    }
}
main().catch(() => {
    if (process.send)
        process.send({ error: 'ADMIN_FIXTURE_FAILED' });
    process.exitCode = 1;
});
