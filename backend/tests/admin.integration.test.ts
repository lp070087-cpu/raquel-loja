import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { token } from '../src/domain.js';
import { assertTestingBranch } from '../src/test-database.js';
import { assertRealNeonIsolation } from '../src/neon-isolation.js';
import { boundedDatabaseUrl } from '../src/database.js';
describe.skipIf(process.env.RUN_DATABASE_INTEGRATION !== 'true')('Real ADMIN management and STAFF isolation', () => {
    const db = new PrismaClient({ datasourceUrl: boundedDatabaseUrl(process.env.TEST_DATABASE_URL || 'postgresql://localhost/unused') });
    const prefix = ('admin-test-' + Date.now() + '-' + token().replace(/[^a-z0-9]/gi, '').slice(0, 4)).toLowerCase();
    const password = token(), userIds: string[] = [], productIds: string[] = [], categoryIds: string[] = [], couponIds: string[] = [];
    let app: Awaited<ReturnType<typeof buildApp>>, admin: any, staff: any, customer: any, createdProduct: any, createdCategory: any, order: any;
    let ip = 1;
    let originalSettings: {
        key: string;
        value: string;
    }[] = [];
    async function client(role: 'ADMIN' | 'STAFF' | 'CUSTOMER') {
        const user = await db.user.create({ data: {
                name: `Testing ${role}`, email: `${prefix}-${role.toLowerCase()}@example.test`, phone: '81999999999', role, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), cart: { create: {} }
            } });
        userIds.push(user.id);
        const csrfResult = await app.inject({ url: '/api/auth/csrf' }), csrf = csrfResult.json().csrfToken;
        let cookie = '';
        const c = {
            id: user.id, email: user.email, async request(method: any, path: string, payload?: any) {
                const r = await app.inject({
                    method, url: '/api' + path, remoteAddress: `192.0.2.${++ip % 250 + 1}`, headers: {
                        origin: 'http://localhost:8000', cookie: `raquel_csrf=${csrf};${cookie}`, 'x-csrf-token': csrf
                    }, payload
                });
                const s = r.cookies.find(c => c.name === 'raquel_session');
                if (s)
                    cookie = 'raquel_session=' + s.value;
                return r;
            }
        };
        expect((await c.request('POST', '/auth/login', {
            email: user.email, password
        })).statusCode).toBe(200);
        return c;
    }
    beforeAll(async () => {
        assertTestingBranch(process.env.TEST_DATABASE_URL!, process.env.DATABASE_URL, process.env.TEST_DATABASE_BRANCH);
        await assertRealNeonIsolation(process.env.DATABASE_URL!, process.env.TEST_DATABASE_URL!);
        app = await buildApp(db, {
            origins: ['http://localhost:8000'], frontendUrl: 'http://localhost:8000', production: false, secret: process.env.SESSION_SECRET!
        });
        originalSettings = await db.storeSetting.findMany({ select: {
                key: true, value: true
            } });
        admin = await client('ADMIN');
        staff = await client('STAFF');
        customer = await client('CUSTOMER');
    }, 120000);
    afterAll(async () => {
        if (userIds.length) {
            await db.adminAudit.deleteMany({ where: { actorId: { in: userIds } } });
            await db.order.deleteMany({ where: { userId: { in: userIds } } });
            await db.user.deleteMany({ where: { id: { in: userIds } } });
        }
        await db.product.deleteMany({ where: { id: { in: productIds } } });
        await db.category.deleteMany({ where: { id: { in: categoryIds } } });
        await db.coupon.deleteMany({ where: { id: { in: couponIds } } });
        if (admin) {
            await db.storeSetting.deleteMany({ where: { key: { in: ['name', 'phone', 'email', 'address', 'openingHours','city','state','zipCode','neighborhood'] } } });
            for (const s of originalSettings)
                await db.storeSetting.upsert({
                    where: { key: s.key }, create: s, update: { value: s.value }
                });
        }
        await app?.close();
        await db.$disconnect();
    }, 120000);
    it('denies CUSTOMER and STAFF every management read and write', async () => {
        for (const c of [customer, staff]) {
            for (const path of ['/admin/dashboard', '/admin/products', '/admin/categories', '/admin/stock', '/admin/orders', '/admin/customers', '/admin/employees', '/admin/coupons', '/admin/payments', '/admin/pickups', '/admin/reports', '/admin/settings', '/admin/audit'])
                expect((await c.request('GET', path)).statusCode).toBe(403);
            for (const [method, path] of [['POST', '/admin/products'], ['PATCH', '/admin/products/unknown'], ['POST', '/admin/categories'], ['POST', '/admin/stock/unknown'], ['PATCH', '/admin/employees/unknown'], ['PATCH', '/admin/settings'], ['PATCH', '/admin/orders/unknown/status'], ['POST', '/admin/coupons']])
                expect((await c.request(method, path, {})).statusCode).toBe(403);
        }
    });
    it('requires actual current password and rejects unknown sensitive settings', async () => {
        expect((await admin.request('POST', '/admin/categories', {
            name: 'Blocked', slug: prefix, currentPassword: 'incorrect'
        })).statusCode).toBe(401);
        expect((await admin.request('PATCH', '/admin/settings', {
            settings: { DATABASE_URL: 'forbidden' }, currentPassword: password
        })).statusCode).toBe(400);
        expect((await admin.request('GET', '/admin/products?take=101')).statusCode).toBe(400);
    });
    it('creates and edits categories and products with server money/images/compatibility', async () => {
        const cr = await admin.request('POST', '/admin/categories', {
            name: 'Categoria testing', slug: prefix, currentPassword: password
        });
        expect(cr.statusCode).toBe(201);
        createdCategory = cr.json().category;
        categoryIds.push(createdCategory.id);
        const pr = await admin.request('POST', '/admin/products', {
            name: 'Peça de testing', slug: prefix, sku: prefix, description: 'Produto controlado', priceCents: 7654, initialStock: 12, categoryId: createdCategory.id, images: [{
                    imageUrl: 'public/produtos/oleos/oleo-01.jpg', position: 0
                }], compatibilities: [{
                    brand: 'Honda', model: 'CG 160', version: null, yearFrom: 2020, yearTo: 2024
                }], currentPassword: password
        });
        expect(pr.statusCode).toBe(201);
        createdProduct = pr.json().product;
        productIds.push(createdProduct.id);
        expect(createdProduct.priceCents).toBe(7654);
        expect(createdProduct.categoria).toBe(prefix);
        expect(createdProduct.compat).toHaveLength(1);
        expect((await admin.request('PATCH', '/admin/products/' + createdProduct.id, {
            priceCents: 8000, currentPassword: password
        })).statusCode).toBe(200);
        expect((await admin.request('PATCH', '/admin/products/' + createdProduct.id, {
            stock: 500, currentPassword: password
        })).statusCode).toBe(400);
        expect((await admin.request('PATCH', '/admin/categories/' + createdCategory.id, {
            name: 'Categoria renomeada', currentPassword: password
        })).statusCode).toBe(200);
        expect((await admin.request('GET', '/admin/products/' + createdProduct.id)).json().product.images).toHaveLength(1);
    });
    it('adjusts stock atomically, audits before/after and refuses negative inventory', async () => {
        const path = '/admin/stock/' + createdProduct.id;
        expect((await admin.request('POST', path, {
            delta: -100, reason: 'Invalid adjustment', currentPassword: password
        })).statusCode).toBe(422);
        const results = await Promise.all([2, 3].map(delta => admin.request('POST', path, {
            delta, reason: 'Testing restock', currentPassword: password
        })));
        expect(results.every(r => r.statusCode === 200)).toBe(true);
        expect((await db.product.findUniqueOrThrow({ where: { id: createdProduct.id } })).stock).toBe(17);
        const logs = await db.adminAudit.findMany({ where: {
                actorId: admin.id, action: 'STOCK_ADJUSTED', entityId: createdProduct.id
            } });
        expect(logs).toHaveLength(2);
        expect(logs.every((l: any) => l.details.after - l.details.before === l.details.delta)).toBe(true);
    });
    it('creates, validates, edits and deactivates coupons persistently', async () => {
        const r = await admin.request('POST', '/admin/coupons', {
            code: prefix, type: 'PERCENT', value: 10, minimumCents: 100, currentPassword: password
        });
        expect(r.statusCode).toBe(201);
        const c = r.json().coupon;
        couponIds.push(c.id);
        expect((await admin.request('PATCH', '/admin/coupons/' + c.id, {
            value: 101, currentPassword: password
        })).statusCode).toBe(400);
        expect((await admin.request('PATCH', '/admin/coupons/' + c.id, {
            value: 15, currentPassword: password
        })).statusCode).toBe(200);
        expect((await admin.request('DELETE', '/admin/coupons/' + c.id, { currentPassword: password })).statusCode).toBe(200);
        expect((await db.coupon.findUniqueOrThrow({ where: { id: c.id } })).active).toBe(false);
    });
    it('prepares real orders without bypassing payment or pickup', async () => {
        expect((await customer.request('PUT', '/cart/items/' + createdProduct.id, { quantity: 1 })).statusCode).toBe(200);
        const r = await customer.request('POST', '/orders', {
            fulfillmentType: 'PICKUP', idempotencyKey: token()
        });
        expect(r.statusCode).toBe(201);
        order = r.json().order;
        expect((await admin.request('PATCH', `/admin/orders/${order.id}/status`, {
            status: 'READY', currentPassword: password
        })).statusCode).toBe(200);
        const stored = await db.order.findUniqueOrThrow({ where: { id: order.id } });
        expect(stored.paymentStatus).toBe('PENDING');
        expect(stored.pickedUpAt).toBeNull();
        expect((await admin.request('PATCH', `/admin/orders/${order.id}/status`, {
            status: 'COMPLETED', currentPassword: password
        })).statusCode).toBe(400);
        expect((await admin.request('PATCH', `/admin/orders/${order.id}/status`, {
            status: 'CONFIRMED', currentPassword: password
        })).statusCode).toBe(409);
        const detail = (await admin.request('GET', '/admin/orders/' + order.id)).json().order;
        expect(detail).not.toHaveProperty('pickupCodeEncrypted');
        expect(detail).not.toHaveProperty('pickupCodeHash');
        expect(detail.items[0].unitPriceCents).toBe(8000);
    });
    it('limits STAFF queues and history while retaining authorized counter operations', async () => {
        expect((await customer.request('GET', '/staff/orders')).statusCode).toBe(403);
        const queue = (await staff.request('GET', '/staff/orders')).json().orders;
        expect(queue.some((o: any) => o.id === order.id)).toBe(true);
        expect(JSON.stringify(queue)).not.toMatch(/pickupCode|passwordHash|tokenHash/);
        expect(queue.find((o: any) => o.id === order.id).user).not.toHaveProperty('email');
        expect((await staff.request('POST', `/staff/orders/${order.id}/payment`, {
            code: order.pickupCode, method: 'CASH'
        })).statusCode).toBe(200);
        const history = (await staff.request('GET', '/staff/history')).json().events;
        expect(history.some((e: any) => e.type === 'COUNTER_PAYMENT' && e.order.id === order.id)).toBe(true);
        expect(history.every((e: any) => e.actor.id === staff.id)).toBe(true);
        expect((await admin.request('GET', '/staff/history')).json().events.some((e: any) => e.type === 'PREPARATION_STATUS' && e.actor.id === admin.id)).toBe(true);
    });
    it('lists customers/payments/reports and only limited personal data', async () => {
        const c = (await admin.request('GET', '/admin/customers/' + customer.id)).json();
        expect(c.customer.id).toBe(customer.id);
        expect(c.customer).not.toHaveProperty('passwordHash');
        expect(c.customer).not.toHaveProperty('sessions');
        expect(c.orders.some((o: any) => o.id === order.id)).toBe(true);
        expect((await admin.request('GET', '/admin/payments')).json().payments.some((p: any) => p.orderId === order.id)).toBe(true);
        expect((await admin.request('GET', '/admin/dashboard')).json().metrics.paidCents).toBeGreaterThanOrEqual(8000);
        const report = (await admin.request('GET', '/admin/reports')).json();
        expect(report.summary._count).toBeGreaterThan(0);
        expect(report.statuses.length).toBeGreaterThan(0);
        expect((await admin.request('GET', '/admin/pickups')).statusCode).toBe(200);
    });
    it('updates allowlisted store settings with audit and persistence', async () => {
        const r = await admin.request('PATCH', '/admin/settings', {
            settings: {
                name: 'Loja Testing', phone: '81999999999', openingHours: 'Segunda a sexta',city:'Olinda',state:'PE',zipCode:'53160-010',neighborhood:'Centro'
            }, currentPassword: password
        });
        expect(r.statusCode).toBe(200);
        expect((await admin.request('GET', '/admin/settings')).json().settings.name).toBe('Loja Testing');
        expect(await db.adminAudit.count({ where: {
                actorId: admin.id, action: 'STORE_SETTINGS_UPDATED'
            } })).toBe(1);
    });
    it('grants and revokes existing STAFF access, invalidating sessions and never promotes ADMIN', async () => {
        expect((await admin.request('GET', '/admin/employees/find?email=' + encodeURIComponent(staff.email))).json().user.id).toBe(staff.id);
        expect((await admin.request('PATCH', '/admin/employees/' + staff.id, {
            role: 'CUSTOMER', currentPassword: password
        })).statusCode).toBe(200);
        expect((await staff.request('GET', '/staff/orders')).statusCode).toBe(401);
        expect((await admin.request('PATCH', '/admin/employees/' + staff.id, {
            role: 'STAFF', currentPassword: password
        })).statusCode).toBe(200);
        expect((await admin.request('PATCH', '/admin/employees/' + admin.id, {
            role: 'CUSTOMER', currentPassword: password
        })).statusCode).toBe(409);
        expect((await admin.request('PATCH', '/admin/employees/' + customer.id, {
            role: 'ADMIN', currentPassword: password
        })).statusCode).toBe(400);
    });
    it('soft-disables referenced products and categories without destroying order snapshots', async () => {
        expect((await admin.request('DELETE', '/admin/products/' + createdProduct.id, { currentPassword: password })).statusCode).toBe(200);
        expect((await db.product.findUniqueOrThrow({ where: { id: createdProduct.id } })).active).toBe(false);
        expect((await customer.request('GET', '/orders/' + order.id)).json().order.items[0].unitPriceCents).toBe(8000);
        expect((await admin.request('DELETE', '/admin/categories/' + createdCategory.id, { currentPassword: password })).statusCode).toBe(200);
        expect((await db.category.findUniqueOrThrow({ where: { id: createdCategory.id } })).active).toBe(false);
        expect((await admin.request('GET', '/admin/audit')).json().events.some((e: any) => e.entityId === createdProduct.id)).toBe(true);
    });
});
