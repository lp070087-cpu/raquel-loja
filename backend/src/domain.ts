import { createHash, createHmac, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export function csrfToken(secret: string) {
    const raw = token();
    return raw + '.' + createHmac('sha256', secret).update(raw).digest('base64url');
}
export function csrfValid(value: string, secret: string) {
    const [raw, sig] = value.split('.');
    return !!raw && !!sig && equal(sig, createHmac('sha256', secret).update(raw).digest('base64url'));
}
export function equal(a: string, b: string) {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}
export class ApiError extends Error {
    constructor(public statusCode: number, public code: string, message: string) {
        super(message);
    }
}
export function discountFor(coupon: {
    active: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
    minimumCents: number;
    usageLimit: number | null;
    type: string;
    value: number;
    code: string;
}, subtotal: number, usages: number, userUsages = 0, now = new Date()) {
    if (!coupon.active || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt <= now) || subtotal < coupon.minimumCents || (coupon.usageLimit !== null && usages >= coupon.usageLimit) || (coupon.code === 'PRIMEIRA' && userUsages > 0))
        throw new ApiError(422, 'INVALID_COUPON', 'Cupom inválido ou indisponível para este pedido.');
    return Math.min(subtotal, coupon.type === 'PERCENT' ? Math.floor(subtotal * coupon.value / 100) : coupon.value);
}
export function encrypt(value: string, secret: string) {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', Buffer.from(hash(secret), 'hex'), iv);
    const result = Buffer.concat([c.update(value, 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), result]).toString('base64url');
}
export function decrypt(value: string, secret: string) {
    const b = Buffer.from(value, 'base64url');
    const d = createDecipheriv('aes-256-gcm', Buffer.from(hash(secret), 'hex'), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
export const publicUser = (u: any) => ({
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, emailVerifiedAt: u.emailVerifiedAt, createdAt: u.createdAt
});
export const publicProduct = (p: any) => ({
    ...p.metadata, id: p.id, name: p.name, nome: p.name, slug: p.slug, sku: p.sku, description: p.description, descricao: p.description, priceCents: p.priceCents, preco: p.priceCents / 100, stock: p.stock, estoque: p.stock, active: p.active, foto: p.images?.[0]?.imageUrl || p.metadata?.foto, fotos: p.images?.map((i: any) => i.imageUrl) || p.metadata?.fotos, compat: p.compatibilities?.map((c: any) => ({
        marca: c.brand, modelo: c.model, versao: c.version, anoInicio: c.yearFrom, anoFim: c.yearTo
    })) || p.metadata?.compat, images: p.images, compatibilities: p.compatibilities
});
