import { describe, it, expect } from 'vitest';
import { discountFor, encrypt, decrypt, csrfToken, csrfValid, hash, equal, publicProduct } from '../src/domain.js';
import * as v from '../src/validation.js';
import { assertIsolatedTestDatabase } from '../src/test-database.js';
const coupon = {
    code: 'MOTO10', active: true, startsAt: null, expiresAt: null, minimumCents: 10000, usageLimit: 2, type: 'PERCENT', value: 10
};
describe('Server commercial/security rules', () => {
    it('rejects test databases pointing to production through a pooler alias', () => {
        expect(() => assertIsolatedTestDatabase('postgresql://test:other@ep-example-pooler.eu.neon.tech/store?sslmode=require', 'postgresql://main:secret@ep-example.eu.neon.tech/store')).toThrow();
        expect(() => assertIsolatedTestDatabase('postgresql://test:secret@ep-test.eu.neon.tech/store', 'postgresql://main:secret@ep-main.eu.neon.tech/store')).not.toThrow();
    });
    it('requires actual phone digits and trims email', () => {
        expect(() => v.register.parse({
            name: 'Raquel', email: 'x@example.com', phone: '----------', password: 'senha-segura-123'
        })).toThrow();
        expect(v.email.parse(' X@EXAMPLE.COM ')).toBe('x@example.com');
    });
    it('calculates money in integer cents, floors percentage and caps discount', () => {
        expect(discountFor(coupon, 10001, 0)).toBe(1000);
        expect(discountFor({
            ...coupon, type: 'FIXED', value: 20000
        }, 10000, 0)).toBe(10000);
    });
    it('rejects invalid coupons and exhausted/expired/first-purchase conditions', () => {
        for (const c of [{
                ...coupon, active: false
            }, {
                ...coupon, expiresAt: new Date(0)
            }, {
                ...coupon, startsAt: new Date('2100-01-01')
            }, {
                ...coupon, minimumCents: 20000
            }])
            expect(() => discountFor(c, 10000, 0)).toThrow();
        expect(() => discountFor(coupon, 10000, 2)).toThrow();
        expect(() => discountFor({
            ...coupon, code: 'PRIMEIRA'
        }, 10000, 0, 1)).toThrow();
    });
    it('encrypts pickup codes and detects tampering', () => {
        const encrypted = encrypt('123456', 'a'.repeat(40));
        expect(encrypted).not.toContain('123456');
        expect(decrypt(encrypted, 'a'.repeat(40))).toBe('123456');
        expect(() => decrypt(encrypted, 'b'.repeat(40))).toThrow();
    });
    it('signs CSRF and rejects forged token', () => {
        const t = csrfToken('secret');
        expect(csrfValid(t, 'secret')).toBe(true);
        expect(csrfValid(t, 'other')).toBe(false);
        expect(csrfValid('forged', 'secret')).toBe(false);
        expect(equal(hash('a'), hash('b'))).toBe(false);
    });
    it('normalizes email and rejects malformed or excessive fields', () => {
        expect(v.register.parse({
            name: 'Raquel', email: 'RAQUEL@example.com', phone: '81999999999', password: 'senha-segura-123'
        }).email).toBe('raquel@example.com');
        expect(() => v.register.parse({
            name: 'R', email: "' OR 1=1 --", phone: 'abc', password: '1'
        })).toThrow();
        expect(() => v.address.parse({})).toThrow();
        expect(() => v.motorcycle.parse({
            brand: 'Honda', model: 'CG', year: 1800
        })).toThrow();
    });
    it('requires idempotency and real payment selection without accepting totals', () => {
        const o = v.orderInput.parse({
            fulfillmentType: 'PICKUP', paymentMethod: 'PIX', idempotencyKey: 'test-unique-key-123', totalCents: 1
        });
        expect(o).not.toHaveProperty('totalCents');
        expect(() => v.orderInput.parse({
            fulfillmentType: 'PICKUP', paymentMethod: 'PAID'
        })).toThrow();
    });
    it('maps current authoritative product prices over legacy metadata', () => {
        const p = publicProduct({
            id: 'x', metadata: {
                preco: 1, estoque: 99
            }, priceCents: 8950, stock: 2, name: 'Peça'
        });
        expect(p.preco).toBe(89.5);
        expect(p.estoque).toBe(2);
    });
});
