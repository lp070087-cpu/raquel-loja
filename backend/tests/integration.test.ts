import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { hash, token } from '../src/domain.js';
import { assertTestingBranch } from '../src/test-database.js';
import { assertRealNeonIsolation } from '../src/neon-isolation.js';
const url = process.env.TEST_DATABASE_URL;
const enabled = process.env.RUN_DATABASE_INTEGRATION === 'true';
if (enabled) {
    if (!url) throw new Error('TEST_DATABASE_URL is required.');
    assertTestingBranch(url, process.env.DATABASE_URL, process.env.TEST_DATABASE_BRANCH);
}
// Never wipe databases. All test records use a unique prefix and only those are removed.
describe.skipIf(!enabled)('Real isolated PostgreSQL integration', () => {
    const db = new PrismaClient({ datasourceUrl: url });
    const prefix = `test-${Date.now()}-${token().slice(0, 5)}`.toLowerCase();
    const password = 'valid-password-123';
    const users: string[] = [];
    const products: string[] = [];
    let app: Awaited<ReturnType<typeof buildApp>>;
    let a: any, b: any;
    async function browser() {
        const csrf = await app.inject({ url: '/api/auth/csrf' });
        const csrfToken = csrf.json().csrfToken;
        let session = '';
        return { async request(method: any, path: string, payload?: any) {
                const r = await app.inject({
                    method, url: '/api' + path, headers: {
                        origin: 'http://localhost:8000', cookie: `raquel_csrf=${csrfToken}; ${session}`, 'x-csrf-token': csrfToken
                    }, payload
                });
                const cookies = r.cookies.find(c => c.name === 'raquel_session');
                if (cookies)
                    session = `raquel_session=${cookies.value}`;
                return r;
            } };
    }
    beforeAll(async () => {
        await assertRealNeonIsolation(process.env.DATABASE_URL!,url!);
        await db.$queryRaw `SELECT 1`;
        app = await buildApp(db, {
            origins: ['http://localhost:8000'], frontendUrl: 'http://localhost:8000', production: false, secret: 'integration-only-secret-at-least-32-characters'
        });
        a = await browser();
        b = await browser();
        for (const [client, suffix] of [[a, 'a'], [b, 'b']] as const) {
            const r = await client.request('POST', '/auth/register', {
                name: 'Test Customer', email: `${prefix}-${suffix}@example.com`, phone: '81999999999', password
            });
            expect(r.statusCode).toBe(201);
            users.push(r.json().user.id);
        }
        for (const suffix of ['cart', 'race']) {
            const id = prefix + '-' + suffix;
            products.push(id);
            await db.product.create({ data: {
                    id, name: 'Test product', slug: id, sku: id, description: 'Only isolated test', priceCents: 12345, stock: suffix === 'race' ? 1 : 10, metadata: {}
                } });
        }
    }, 120000);
    afterAll(async () => {
        if (users.length) {
            await db.couponRedemption.deleteMany({ where: { userId: { in: users } } });
            await db.orderItem.deleteMany({ where: { order: { userId: { in: users } } } });
            await db.order.deleteMany({ where: { userId: { in: users } } });
            await db.user.deleteMany({ where: { id: { in: users } } });
        }
        await db.product.deleteMany({ where: { id: { in: products } } });
        await db.coupon.deleteMany({ where: { code: { startsWith: prefix.toUpperCase() } } });
        await app?.close();
        await db.$disconnect();
    }, 120000);
    it('persists users and protects duplicate email/login', async () => {
        const r = await a.request('GET', '/auth/me');
        expect(r.json().user.email).toContain(prefix);
        expect(r.json().user).not.toHaveProperty('passwordHash');
        const duplicate = await a.request('POST', '/auth/register', {
            name: 'Test Customer', email: `${prefix}-a@example.com`, phone: '81999999999', password
        });
        expect(duplicate.statusCode).toBe(409);
        const c = await browser();
        expect((await c.request('POST', '/auth/login', {
            email: `${prefix}-a@example.com`, password: 'wrong'
        })).statusCode).toBe(401);
        expect((await c.request('POST', '/auth/login', {
            email: `${prefix}-a@example.com`, password
        })).statusCode).toBe(200);
    });
    it('CRUD addresses and motorcycles are private', async () => {
        const adr = await a.request('POST', '/addresses', {
            recipientName: 'Cliente', phone: '81999999999', zipCode: '53160010', street: 'Rua Teste', number: '1', neighborhood: 'Centro', city: 'Olinda', state: 'PE'
        });
        expect(adr.statusCode).toBe(201);
        const id = adr.json().address.id;
        expect((await b.request('PATCH', '/addresses/' + id, { city: 'Other' })).statusCode).toBe(404);
        expect((await a.request('PATCH', '/addresses/' + id, { isDefault: true })).statusCode).toBe(200);
        expect((await a.request('DELETE', '/addresses/' + id)).statusCode).toBe(200);
        const moto = await a.request('POST', '/motorcycles', {
            brand: 'Honda', model: 'CG 160', version: 'Fan', year: 2020
        });
        expect(moto.statusCode).toBe(201);
        const mid = moto.json().motorcycle.id;
        expect((await b.request('DELETE', '/motorcycles/' + mid)).statusCode).toBe(404);
        expect((await a.request('PATCH', '/motorcycles/' + mid, {
            nickname: 'Minha moto', isPrimary: true
        })).statusCode).toBe(200);
        expect((await a.request('DELETE', '/motorcycles/' + mid)).statusCode).toBe(200);
    });
    it('favorites and cart persist and do not cross customer boundaries', async () => {
        const id = products[0];
        expect((await a.request('POST', '/favorites/' + id, {})).statusCode).toBe(200);
        expect((await a.request('GET', '/favorites')).json().products).toHaveLength(1);
        expect((await b.request('GET', '/favorites')).json().products).toHaveLength(0);
        expect((await a.request('DELETE', '/favorites/' + id)).statusCode).toBe(200);
        expect((await a.request('PUT', '/cart/items/' + id, { quantity: 99 })).statusCode).toBe(422);
        expect((await a.request('PUT', '/cart/items/' + id, { quantity: 2 })).json().subtotalCents).toBe(24690);
        expect((await b.request('GET', '/cart')).json().items).toHaveLength(0);
        const key = token();
        await a.request('POST', '/cart/merge', {
            mergeKey: key, items: [{
                    productId: id, quantity: 1
                }]
        });
        await a.request('POST', '/cart/merge', {
            mergeKey: key, items: [{
                    productId: id, quantity: 1
                }]
        });
        expect((await a.request('GET', '/cart')).json().items[0].quantity).toBe(3);
    });
    it('syncs cart and favorites in a second authenticated browser session', async () => {
        const second = await browser();
        expect((await second.request('POST', '/auth/login', {
            email: `${prefix}-a@example.com`, password
        })).statusCode).toBe(200);
        await a.request('POST', '/favorites/' + products[0], {});
        expect((await second.request('GET', '/favorites')).json().products[0].id).toBe(products[0]);
        expect((await second.request('GET', '/cart')).json().items[0].quantity).toBe(3);
        await a.request('DELETE', '/favorites/' + products[0]);
        expect((await second.request('GET', '/favorites')).json().products).toHaveLength(0);
    });
    it('creates atomic order with immutable prices, idempotency and ownership', async () => {
        const code = prefix.toUpperCase();
        await db.coupon.create({ data: {
                code, type: 'PERCENT', value: 10, minimumCents: 100
            } });
        expect((await a.request('POST', '/coupons/validate', { code: 'INVALID' })).statusCode).toBe(422);
        expect((await a.request('POST', '/coupons/validate', { code })).json().discountCents).toBe(3703);
        const input = {
            fulfillmentType: 'PICKUP', paymentMethod: 'PIX', idempotencyKey: token(), couponCode: code, totalCents: 1
        };
        const result = await a.request('POST', '/orders', input);
        expect(result.statusCode).toBe(201);
        const order = result.json().order;
        expect(order.totalCents).toBe(33332);
        expect(order.paymentStatus).toBe('PENDING');
        expect(order.pickupCode).toMatch(/^\d{5}$/);
        expect((await a.request('POST', '/orders', input)).json().order.id).toBe(order.id);
        expect((await b.request('GET', '/orders/' + order.id)).statusCode).toBe(404);
        expect((await a.request('GET', '/cart')).json().items).toHaveLength(0);
        await db.product.update({
            where: { id: products[0] }, data: { priceCents: 1 }
        });
        expect((await a.request('GET', '/orders/' + order.id)).json().order.items[0].unitPriceCents).toBe(12345);
    });
    it('prevents overselling under concurrent checkout', async () => {
        const id = products[1];
        await a.request('PUT', '/cart/items/' + id, { quantity: 1 });
        await b.request('PUT', '/cart/items/' + id, { quantity: 1 });
        const results = await Promise.all([a.request('POST', '/orders', {
                fulfillmentType: 'PICKUP', paymentMethod: 'CASH', idempotencyKey: token()
            }), b.request('POST', '/orders', {
                fulfillmentType: 'PICKUP', paymentMethod: 'CASH', idempotencyKey: token()
            })]);
        expect(results.map(r => r.statusCode).sort()).toEqual([201, 422]);
        expect((await db.product.findUnique({ where: { id } }))?.stock).toBe(0);
    });
    it('resets password with one-time token and invalidates sessions', async () => {
        const raw = token();
        await db.authToken.create({ data: {
                userId: users[0], tokenHash: hash(raw), purpose: 'RESET_PASSWORD', expiresAt: new Date(Date.now() + 60000)
            } });
        expect((await a.request('POST', '/auth/reset-password', {
            token: raw, password: 'new-password-123'
        })).statusCode).toBe(200);
        expect((await a.request('GET', '/auth/me')).statusCode).toBe(401);
        expect((await a.request('POST', '/auth/reset-password', {
            token: raw, password
        })).statusCode).toBe(400);
        expect((await a.request('POST', '/auth/login', {
            email: `${prefix}-a@example.com`, password: 'new-password-123'
        })).statusCode).toBe(200);
        expect((await a.request('POST', '/auth/logout', {})).statusCode).toBe(200);
        expect((await a.request('GET', '/auth/me')).statusCode).toBe(401);
    });
    it('persists orders after disconnecting and creating another Prisma client', async () => {
        const second = new PrismaClient({ datasourceUrl: url });
        try {
            await second.$connect();
            const orders = await second.order.findMany({
                where: { userId: { in: users } }, include: { items: true }
            });
            expect(orders.length).toBeGreaterThan(0);
            expect(orders.every(o => o.totalCents === o.subtotalCents - o.discountCents + o.shippingCents)).toBe(true);
        }
        finally {
            await second.$disconnect();
        }
    });
    it('database rejects negative stock and invalid cart quantity', async () => {
        await expect(db.product.update({
            where: { id: products[0] }, data: { stock: -1 }
        })).rejects.toThrow();
        const cart = await db.cart.findUniqueOrThrow({ where: { userId: users[0] } });
        await expect(db.cartItem.create({ data: {
                cartId: cart.id, productId: products[0], quantity: 0
            } })).rejects.toThrow();
    });
    it('rejects expired session', async () => {
        await db.session.updateMany({
            where: { userId: users[1] }, data: {
                createdAt: new Date(0), expiresAt: new Date(1)
            }
        });
        expect((await b.request('GET', '/auth/me')).statusCode).toBe(401);
    });
});
