import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
// These test HTTP security without a database. Persistence tests are separate.
describe('HTTP boundary (no database)', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    beforeAll(async () => {
        app = await buildApp({} as any, {
            origins: ['http://localhost:8000'], frontendUrl: 'http://localhost:8000', production: false, secret: 'test-only-secret-with-at-least-32-characters'
        });
    });
    afterAll(async () => {
        await app.close();
    });
    it('issues HttpOnly signed CSRF cookie', async () => {
        const r = await app.inject({ url: '/api/auth/csrf' });
        expect(r.statusCode).toBe(200);
        expect(r.json().csrfToken).toMatch(/^[\w-]+\.[\w-]+$/);
        expect(r.headers['set-cookie']).toContain('HttpOnly');
        expect(r.headers['set-cookie']).toContain('SameSite=Lax');
    });
    it('sets Secure cookies for HTTPS production origins', async () => {
        const secure = await buildApp({} as any, {
            origins: ['https://shop.example.com'], frontendUrl: 'https://shop.example.com', production: true, secret: 'test-only-production-secret-at-least-32-characters'
        });
        try {
            const r = await secure.inject({ url: '/api/auth/csrf' });
            expect(r.headers['set-cookie']).toContain('Secure');
        }
        finally {
            await secure.close();
        }
    });
    it('rejects mutations without csrf, forged cookie, or external origin', async () => {
        for (const headers of [{}, {
                origin: 'http://localhost:8000', cookie: 'raquel_csrf=forged', 'x-csrf-token': 'forged'
            }, {
                origin: 'https://attacker.example', cookie: 'raquel_csrf=forged', 'x-csrf-token': 'forged'
            }]) {
            const r = await app.inject({
                method: 'POST', url: '/api/auth/login', headers, payload: {
                    email: 'x@example.com', password: 'x'
                }
            });
            expect(r.statusCode).toBe(403);
        }
    });
    it('denies unauthenticated access to every private resource', async () => {
        for (const url of ['/api/auth/me', '/api/profile', '/api/sessions', '/api/addresses', '/api/motorcycles', '/api/cart', '/api/favorites', '/api/orders', '/api/orders/third-party']) {
            const r = await app.inject({ url });
            expect(r.statusCode).toBe(401);
        }
    });
    it('rejects malformed input before reaching database', async () => {
        const c = await app.inject({ url: '/api/auth/csrf' });
        const t = c.json().csrfToken;
        const r = await app.inject({
            method: 'POST', url: '/api/auth/register', headers: {
                origin: 'http://localhost:8000', cookie: `raquel_csrf=${t}`, 'x-csrf-token': t
            }, payload: {
                name: 'x', email: "' OR 1=1 --", phone: 'x', password: 'x'
            }
        });
        expect(r.statusCode).toBe(400);
        expect(r.json().error).toBe('VALIDATION');
    });
    it('does not allow CORS credentials to unauthorized origins', async () => {
        const r = await app.inject({
            url: '/api/auth/csrf', headers: { origin: 'https://attacker.example' }
        });
        expect(r.headers['access-control-allow-origin']).toBeUndefined();
    });
    it('enforces sensitive endpoint rate limit', async () => {
        const c = await app.inject({ url: '/api/auth/csrf' });
        const t = c.json().csrfToken;
        let status = 0;
        for (let n = 0; n < 12; n++) {
            const r = await app.inject({
                method: 'POST', url: '/api/auth/forgot-password', headers: {
                    origin: 'http://localhost:8000', cookie: `raquel_csrf=${t}`, 'x-csrf-token': t
                }, payload: { email: 'invalid-email' }
            });
            status = r.statusCode;
        }
        expect(status).toBe(429);
    });
});
