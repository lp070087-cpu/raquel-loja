import { z } from 'zod';
const text = z.string().trim().min(1).max(200);
export const password = z.string().min(10).max(128);
export const email = z.string().trim().pipe(z.email().max(254)).transform(v => v.toLowerCase());
const phone = z.string().regex(/^[+\d ()-]{10,25}$/).refine(p => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}, 'Informe um telefone com DDD.');
export const register = z.object({
    name: text.min(2), email, phone, password
});
export const login = z.object({
    email, password: z.string().min(1).max(128), remember: z.boolean().optional(), rememberMe: z.boolean().optional()
});
export const address = z.object({
    recipientName: text, phone, zipCode: z.string().regex(/^\d{5}-?\d{3}$/), street: text, number: text.max(30), complement: z.string().trim().max(150).nullable().optional(), neighborhood: text, city: text, state: z.string().regex(/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/), isDefault: z.boolean().optional()
});
export const motorcycle = z.object({
    brand: text, model: text, version: z.string().trim().max(100).nullable().optional(), year: z.number().int().min(1950).max(new Date().getFullYear() + 1), nickname: z.string().trim().max(80).nullable().optional(), isPrimary: z.boolean().optional()
});
export const orderInput = z.object({
    fulfillmentType: z.enum(['PICKUP', 'DELIVERY']), paymentMethod: z.enum(['PIX', 'CARD', 'CASH','ON_PICKUP']).optional(), addressId: text.optional(), couponCode: z.string().trim().max(40).optional(), idempotencyKey: z.string().min(16).max(100)
});
