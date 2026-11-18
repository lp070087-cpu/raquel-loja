import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Prisma, PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import nodemailer from 'nodemailer';
import { reservePickupCode, pickupHash } from './pickup.js';
import { z } from 'zod';
import { ApiError, hash, token, equal, csrfToken, csrfValid, decrypt, discountFor, publicUser, publicProduct } from './domain.js';
import * as v from './validation.js';
import {registerCounter} from './counter.js';
import {registerAdmin} from './admin.js';
import {registerTerminal} from './terminal.js';
export interface Config {
    origins: string[];
    frontendUrl: string;
    production: boolean;
    secret: string;
    trustProxy?: boolean;
    mail?: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
    };
}
const productInclude = {
    images: { orderBy: { position: 'asc' as const } }, compatibilities: true
};
export async function buildApp(db: PrismaClient, config: Config) {
    if (config.secret.length < 32)
        throw new Error('Session secret must contain at least 32 characters.');
    if (!config.origins.length || config.origins.some(o => o === '*' || new URL(o).origin !== o || (config.production && new URL(o).protocol !== 'https:')))
        throw new Error('Explicit origins required; production origins must use HTTPS.');
    const app = Fastify({
        logger: process.env.NODE_ENV !== 'test', bodyLimit: 32768, trustProxy: config.trustProxy ?? false
    });
    await app.register(cookie);
    await app.register(cors, {
        origin: config.origins, credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    });
    await app.register(rateLimit, {
        max: 150, timeWindow: '1 minute'
    });
    const cookieOptions = {
        httpOnly: true, secure: config.production, sameSite: 'lax' as const, path: '/api'
    };
    const mailer = config.mail ? nodemailer.createTransport({
        host: config.mail.host, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, port: config.mail.port, secure: config.mail.port === 465, auth: {
            user: config.mail.user, pass: config.mail.pass
        }
    }) : null;
    app.setErrorHandler((e: any, req, reply) => {
        if (e instanceof z.ZodError)
            return reply.code(400).send({
                error: 'VALIDATION', message: 'Dados inválidos. Revise os campos.', fields: e.issues.map(i => ({
                    path: i.path.join('.'), message: i.message
                }))
            });
        if (e instanceof ApiError)
            return reply.code(e.statusCode).send({
                error: e.code, message: e.message
            });
        if (e.code === 'P2002')
            return reply.code(409).send({
                error: 'CONFLICT', message: 'Não foi possível concluir com esses dados.'
            });
        if (e.statusCode === 429)
            return reply.code(429).send({
                error: 'RATE_LIMIT', message: 'Muitas tentativas. Aguarde antes de tentar novamente.'
            });
        if (e.statusCode && e.statusCode < 500)
            return reply.code(e.statusCode).send({
                error: 'REQUEST', message: 'Requisição inválida.'
            });
        req.log.error({
            code: e.code, name: e.name
        }, 'Request failed');
        return reply.code(503).send({
            error: 'UNAVAILABLE', message: 'Serviço temporariamente indisponível.'
        });
    });
    app.addHook('onRequest', async (req, reply) => {
        reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const origin = req.headers.origin;
            const csrf = req.headers['x-csrf-token'];
            if (!origin || !config.origins.includes(origin) || typeof csrf !== 'string' || !req.cookies.raquel_csrf || (!equal(csrf, req.cookies.raquel_csrf) || !csrfValid(csrf, config.secret)))
                throw new ApiError(403, 'CSRF', 'Requisição não autorizada. Recarregue a página.');
        }
    });
    async function auth(req: any) {
        const raw = req.cookies.raquel_session;
        if (!raw)
            throw new ApiError(401, 'UNAUTHORIZED', 'Entre na sua conta.');
        const session = await db.session.findUnique({
            where: { tokenHash: hash(raw) }, include: { user: true }
        });
        if (!session || session.revokedAt || session.expiresAt <= new Date())
            throw new ApiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.');
        if(session.terminalId){
            const terminal=await db.counterTerminal.findUnique({where:{id:session.terminalId}});
            if(session.user.role!=='STAFF'||!terminal||terminal.revokedAt||terminal.expiresAt<=new Date()||!equal(hash(req.cookies.raquel_counter_terminal||''),terminal.tokenHash))throw new ApiError(401,'SESSION_EXPIRED','Acesso de balcão expirado ou revogado.');
        }
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !equal(hash(req.cookies.raquel_csrf || ''), session.csrfHash))
            throw new ApiError(403, 'CSRF', 'Sessão de segurança inválida. Recarregue a página.');
        return session;
    }
    async function startSession(userId: string, remember: boolean, reply: any, csrf: string) {
        const raw = token();
        const seconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
        await db.session.create({ data: {
                userId, tokenHash: hash(raw), csrfHash: hash(csrf), expiresAt: new Date(Date.now() + seconds * 1000)
            } });
        reply.setCookie('raquel_session', raw, {
            ...cookieOptions, ...(remember ? { maxAge: seconds } : {})
        });
    }
    async function sendToken(user: any, purpose: 'RESET_PASSWORD' | 'VERIFY_EMAIL') {
        if (!mailer || !config.mail)
            return false;
        const raw = token();
        await db.authToken.create({ data: {
                userId: user.id, purpose, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 30 * 60 * 1000)
            } });
        const url = `${config.frontendUrl}/conta.html?${purpose === 'RESET_PASSWORD' ? 'reset' : 'verify'}=${encodeURIComponent(raw)}`;
        try {
            await mailer.sendMail({
                from: config.mail.from, to: user.email, subject: purpose === 'RESET_PASSWORD' ? 'Redefinir senha — Loja Raquel' : 'Confirmar e-mail — Loja Raquel', text: `Use o link em até 30 minutos: ${url}`
            });
            return true;
        }
        catch {
            app.log.warn('E-mail delivery failed; provider configuration must be checked.');
            return false;
        }
    }
    app.get('/api/health', async () => {
        await db.$queryRaw `SELECT 1`;
        return {
            ok: true, database: 'connected', emailConfigured: !!mailer
        };
    });
    app.get('/api/auth/csrf', async (req, reply) => {
        let csrf = req.cookies.raquel_csrf;
        if (!csrf || !csrfValid(csrf, config.secret)) {
            csrf = csrfToken(config.secret);
            if (req.cookies.raquel_session)
                await db.session.updateMany({
                    where: {
                        tokenHash: hash(req.cookies.raquel_session), revokedAt: null, expiresAt: { gt: new Date() }
                    }, data: { csrfHash: hash(csrf) }
                });
        }
        reply.setCookie('raquel_csrf', csrf, {
            ...cookieOptions, maxAge: 86400
        });
        return { csrfToken: csrf };
    });
    const sensitive = { config: { rateLimit: {
                max: 10, timeWindow: '15 minutes'
            } } };
    app.post('/api/auth/register', sensitive, async (req, reply) => {
        const data = v.register.parse(req.body);
        if (await db.user.findUnique({ where: { email: data.email } }))
            throw new ApiError(409, 'REGISTRATION_FAILED', 'Não foi possível criar a conta. Tente entrar ou recuperar o acesso.');
        const user = await db.user.create({ data: {
                name: data.name, email: data.email, phone: data.phone, passwordHash: await argon2.hash(data.password, { type: argon2.argon2id }), cart: { create: {} }
            } });
        await startSession(user.id, false, reply, req.cookies.raquel_csrf!);
        if (mailer)
            await sendToken(user, 'VERIFY_EMAIL');
        return reply.code(201).send({
            user: publicUser(user), emailVerificationPending: !!mailer
        });
    });
    // A valid Argon2 hash is evaluated even for unknown emails to reduce timing leakage.
    const dummyHash = await argon2.hash(token(), { type: argon2.argon2id });
    app.post('/api/auth/login', sensitive, async (req, reply) => {
        const data = v.login.parse(req.body);
        const user = await db.user.findUnique({ where: { email: data.email } });
        const valid = await argon2.verify(user?.passwordHash || dummyHash, data.password);
        if (!user || !valid)
            throw new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
        await startSession(user.id, !!(data.remember || data.rememberMe), reply, req.cookies.raquel_csrf!);
        return { user: publicUser(user) };
    });
    app.get('/api/auth/me', async (req) => ({ user: publicUser((await auth(req)).user) }));
    app.post('/api/auth/logout', async (req, reply) => {
        const raw = req.cookies.raquel_session;
        if (raw)
            await db.session.updateMany({
                where: {
                    tokenHash: hash(raw), revokedAt: null
                }, data: { revokedAt: new Date() }
            });
        reply.clearCookie('raquel_session', cookieOptions);
        return { ok: true };
    });
    app.post('/api/auth/forgot-password', sensitive, async (req) => {
        const { email } = z.object({ email: v.email }).parse(req.body);
        const user = await db.user.findUnique({ where: { email } });
        if (user && mailer)
            void sendToken(user, 'RESET_PASSWORD').catch(() => app.log.warn('Recovery delivery could not be scheduled.'));
        return {
            message: 'Se o endereço estiver cadastrado e o serviço de e-mail estiver configurado, você receberá instruções.', emailConfigured: !!mailer
        };
    });
    app.post('/api/auth/reset-password', sensitive, async (req) => {
        const data = z.object({
            token: z.string().min(20).max(200), password: v.password
        }).parse(req.body);
        const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
        await db.$transaction(async (tx) => {
            const t = await tx.authToken.findUnique({ where: { tokenHash: hash(data.token) } });
            if (!t || t.purpose !== 'RESET_PASSWORD' || t.usedAt || t.expiresAt <= new Date())
                throw new ApiError(400, 'INVALID_TOKEN', 'Link inválido ou expirado.');
            const used = await tx.authToken.updateMany({
                where: {
                    id: t.id, usedAt: null, expiresAt: { gt: new Date() }
                }, data: { usedAt: new Date() }
            });
            if (used.count !== 1)
                throw new ApiError(400, 'INVALID_TOKEN', 'Link já utilizado.');
            await tx.user.update({
                where: { id: t.userId }, data: { passwordHash }
            });
            await tx.session.updateMany({
                where: {
                    userId: t.userId, revokedAt: null
                }, data: { revokedAt: new Date() }
            });
        });
        return { message: 'Senha redefinida. Entre novamente.' };
    });
    app.post('/api/auth/request-verification', sensitive, async (req) => {
        const s = await auth(req);
        if (!s.user.emailVerifiedAt)
            await sendToken(s.user, 'VERIFY_EMAIL');
        return {
            emailConfigured: !!mailer, message: mailer ? 'Confira seu e-mail.' : 'Serviço de e-mail ainda não configurado.'
        };
    });
    app.post('/api/auth/verify-email', sensitive, async (req) => {
        const { token: raw } = z.object({ token: z.string().min(20).max(200) }).parse(req.body);
        await db.$transaction(async (tx) => {
            const t = await tx.authToken.findUnique({ where: { tokenHash: hash(raw) } });
            if (!t || t.purpose !== 'VERIFY_EMAIL' || t.usedAt || t.expiresAt <= new Date())
                throw new ApiError(400, 'INVALID_TOKEN', 'Link inválido ou expirado.');
            const used = await tx.authToken.updateMany({
                where: {
                    id: t.id, usedAt: null
                }, data: { usedAt: new Date() }
            });
            if (!used.count)
                throw new ApiError(400, 'INVALID_TOKEN', 'Link já utilizado.');
            await tx.user.update({
                where: { id: t.userId }, data: { emailVerifiedAt: new Date() }
            });
        });
        return { message: 'E-mail confirmado.' };
    });
    app.get('/api/profile', async (req) => ({ user: publicUser((await auth(req)).user) }));
    app.patch('/api/profile', async (req) => {
        const s = await auth(req);
        const data = z.object({
            name: v.register.shape.name.optional(), phone: v.register.shape.phone.optional(), email: v.email.optional(), currentPassword: z.string().max(128).optional()
        }).parse(req.body);
        const { currentPassword, ...patch } = data;
        const changed = patch.email && patch.email !== s.user.email;
        if (changed && (!currentPassword || !await argon2.verify(s.user.passwordHash, currentPassword)))
            throw new ApiError(401, 'PASSWORD_REQUIRED', 'Confirme a senha atual para alterar o e-mail.');
        const user = await db.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id: s.userId }, data: {
                    ...patch, ...(changed ? { emailVerifiedAt: null } : {})
                }
            });
            if (changed)
                await tx.authToken.updateMany({
                    where: {
                        userId: s.userId, usedAt: null
                    }, data: { usedAt: new Date() }
                });
            return updated;
        });
        if (changed && mailer)
            await sendToken(user, 'VERIFY_EMAIL');
        return { user: publicUser(user) };
    });
    app.post('/api/profile/password', sensitive, async (req) => {
        const s = await auth(req);
        const data = z.object({
            currentPassword: z.string().max(128), password: v.password
        }).parse(req.body);
        if (!await argon2.verify(s.user.passwordHash, data.currentPassword))
            throw new ApiError(401, 'INVALID_CREDENTIALS', 'Senha atual incorreta.');
        await db.$transaction([db.user.update({
                where: { id: s.userId }, data: { passwordHash: await argon2.hash(data.password, { type: argon2.argon2id }) }
            }), db.session.updateMany({
                where: {
                    userId: s.userId, id: { not: s.id }
                }, data: { revokedAt: new Date() }
            }), db.authToken.updateMany({
                where: {
                    userId: s.userId, usedAt: null
                }, data: { usedAt: new Date() }
            })]);
        return { message: 'Senha alterada. Outras sessões foram encerradas.' };
    });
    app.get('/api/sessions', async (req) => {
        const s = await auth(req);
        return { sessions: (await db.session.findMany({
                where: {
                    userId: s.userId, revokedAt: null, expiresAt: { gt: new Date() }
                }, select: {
                    id: true, createdAt: true, expiresAt: true
                }, orderBy: { createdAt: 'desc' }
            })).map(x => ({
                ...x, current: x.id === s.id
            })) };
    });
    app.delete('/api/sessions/:id', async (req) => {
        const s = await auth(req);
        await db.session.updateMany({
            where: {
                id: (req.params as any).id, userId: s.userId
            }, data: { revokedAt: new Date() }
        });
        return { ok: true };
    });
    for (const kind of ['addresses', 'motorcycles'] as const) {
        const schema = kind === 'addresses' ? v.address : v.motorcycle;
        const flag = kind === 'addresses' ? 'isDefault' : 'isPrimary';
        const singular = kind === 'addresses' ? 'address' : 'motorcycle';
        const table = (tx: any) => kind === 'addresses' ? tx.address : tx.customerMotorcycle;
        app.get(`/api/${kind}`, async (req) => {
            const s = await auth(req);
            return { [kind]: await table(db).findMany({
                    where: { userId: s.userId }, orderBy: { [flag]: 'desc' }
                }) };
        });
        app.post(`/api/${kind}`, async (req, reply) => {
            const s = await auth(req);
            const data = schema.parse(req.body);
            const item = await db.$transaction(async (tx) => {
                const model = table(tx);
                const first = await model.count({ where: { userId: s.userId } }) === 0;
                const primary = !!(data as any)[flag] || first;
                if (primary)
                    await model.updateMany({
                        where: { userId: s.userId }, data: { [flag]: false }
                    });
                return model.create({ data: {
                        ...data, userId: s.userId, [flag]: primary
                    } });
            }, { isolationLevel: 'Serializable' });
            return reply.code(201).send({ [singular]: item });
        });
        app.patch(`/api/${kind}/:id`, async (req) => {
            const s = await auth(req);
            const id = (req.params as any).id;
            const data = schema.partial().parse(req.body);
            const item = await db.$transaction(async (tx) => {
                const model = table(tx);
                if (!await model.findFirst({ where: {
                        id, userId: s.userId
                    } }))
                    throw new ApiError(404, 'NOT_FOUND', 'Cadastro não encontrado.');
                if ((data as any)[flag])
                    await model.updateMany({
                        where: { userId: s.userId }, data: { [flag]: false }
                    });
                return model.update({
                    where: { id }, data
                });
            }, { isolationLevel: 'Serializable' });
            return { [singular]: item };
        });
        app.delete(`/api/${kind}/:id`, async (req) => {
            const s = await auth(req);
            const result = await table(db).deleteMany({ where: {
                    id: (req.params as any).id, userId: s.userId
                } });
            if (!result.count)
                throw new ApiError(404, 'NOT_FOUND', 'Cadastro não encontrado.');
            return { ok: true };
        });
    }
    app.get('/api/products', async () => ({ products: (await db.product.findMany({
            where: { active: true }, include: productInclude, orderBy: { name: 'asc' }
        })).map(publicProduct) }));
    app.get('/api/products/:id', async (req) => {
        const product = await db.product.findFirst({
            where: {
                id: (req.params as any).id, active: true
            }, include: productInclude
        });
        if (!product)
            throw new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.');
        return { product: publicProduct(product) };
    });
    app.get('/api/favorites', async (req) => {
        const s = await auth(req);
        const favorites = await db.favorite.findMany({
            where: { userId: s.userId }, include: { product: { include: productInclude } }
        });
        return { products: favorites.map(f => publicProduct(f.product)) };
    });
    app.post('/api/favorites/:productId', async (req) => {
        const s = await auth(req);
        const productId = (req.params as any).productId;
        if (!await db.product.findFirst({ where: {
                id: productId, active: true
            } }))
            throw new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.');
        await db.favorite.upsert({
            where: { userId_productId: {
                    userId: s.userId, productId
                } }, create: {
                userId: s.userId, productId
            }, update: {}
        });
        return { ok: true };
    });
    app.delete('/api/favorites/:productId', async (req) => {
        const s = await auth(req);
        await db.favorite.deleteMany({ where: {
                userId: s.userId, productId: (req.params as any).productId
            } });
        return { ok: true };
    });
    async function cart(userId: string) {
        return db.cart.upsert({
            where: { userId }, create: { userId }, update: {}, include: { items: { include: { product: { include: productInclude } } } }
        });
    }
    async function cartResponse(userId: string) {
        const c = await cart(userId);
        return {
            id: c.id, items: c.items.map(i => ({
                productId: i.productId, quantity: i.quantity, product: publicProduct(i.product)
            })), subtotalCents: c.items.reduce((n, i) => n + i.quantity * i.product.priceCents, 0)
        };
    }
    app.get('/api/cart', async (req) => cartResponse((await auth(req)).userId));
    app.put('/api/cart/items/:productId', async (req) => {
        const s = await auth(req);
        const { quantity } = z.object({ quantity: z.number().int().min(0).max(99) }).parse(req.body);
        const productId = (req.params as any).productId;
        const c = await cart(s.userId);
        if (quantity === 0)
            await db.cartItem.deleteMany({ where: {
                    cartId: c.id, productId
                } });
        else {
            const p = await db.product.findFirst({ where: {
                    id: productId, active: true
                } });
            if (!p || p.stock < quantity)
                throw new ApiError(422, 'INSUFFICIENT_STOCK', 'Quantidade indisponível em estoque.');
            await db.cartItem.upsert({
                where: { cartId_productId: {
                        cartId: c.id, productId
                    } }, create: {
                    cartId: c.id, productId, quantity
                }, update: { quantity }
            });
        }
        return cartResponse(s.userId);
    });
    app.post('/api/cart/merge', async (req) => {
        const s = await auth(req);
        const { items, mergeKey } = z.object({
            mergeKey: z.string().min(16).max(100), items: z.array(z.object({
                productId: z.string().max(100), quantity: z.number().int().min(1).max(99)
            })).max(100)
        }).parse(req.body);
        await db.$transaction(async (tx) => {
            const c = await tx.cart.upsert({
                where: { userId: s.userId }, create: { userId: s.userId }, update: {}
            });
            if (await tx.cartMerge.findUnique({ where: { cartId_mergeKey: {
                        cartId: c.id, mergeKey
                    } } }))
                return;
            await tx.cartMerge.create({ data: {
                    cartId: c.id, mergeKey
                } });
            for (const item of items) {
                const p = await tx.product.findFirst({ where: {
                        id: item.productId, active: true
                    } });
                if (!p || p.stock === 0)
                    continue;
                const existing = await tx.cartItem.findUnique({ where: { cartId_productId: {
                            cartId: c.id, productId: p.id
                        } } });
                const quantity = Math.min(99, p.stock, (existing?.quantity || 0) + item.quantity);
                await tx.cartItem.upsert({
                    where: { cartId_productId: {
                            cartId: c.id, productId: p.id
                        } }, create: {
                        cartId: c.id, productId: p.id, quantity
                    }, update: { quantity }
                });
            }
        }, { isolationLevel: 'Serializable' });
        return cartResponse(s.userId);
    });
    async function couponDiscount(tx: any, code: string, subtotal: number, userId: string) {
        const c = await tx.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (!c)
            throw new ApiError(422, 'INVALID_COUPON', 'Cupom inválido ou indisponível.');
        const usages = await tx.couponRedemption.count({ where: { couponId: c.id } });
        const userUsages = await tx.order.count({ where: {
                userId, status: { not: 'CANCELLED' }
            } });
        return {
            coupon: c, discountCents: discountFor(c, subtotal, usages, userUsages)
        };
    }
    app.post('/api/coupons/validate', async (req) => {
        const s = await auth(req);
        const { code } = z.object({ code: z.string().trim().min(1).max(40) }).parse(req.body);
        const c = await cart(s.userId);
        const subtotal = c.items.reduce((n, i) => n + i.quantity * i.product.priceCents, 0);
        const result = await couponDiscount(db, code, subtotal, s.userId);
        return {
            code: result.coupon.code, discountCents: result.discountCents, subtotalCents: subtotal, totalCents: subtotal - result.discountCents
        };
    });
    function orderResponse(o: any) {
        const { pickupCodeEncrypted, pickupCodeHash, pickupAttempts, pickupLockedUntil, ...rest } = o;
        return {
            ...rest, pickupCode: pickupCodeEncrypted && !o.pickedUpAt && !['CANCELLED','COMPLETED'].includes(o.status) ? decrypt(pickupCodeEncrypted, config.secret) : null, paymentNotice: o.paymentStatus === 'PAID' ? 'Pagamento confirmado.' : 'Pagamento realizado na retirada, diretamente na loja', shippingNotice: 'Frete por transportadora ainda não integrado.'
        };
    }
    app.get('/api/orders', async (req) => {
        const s = await auth(req);
        return { orders: (await db.order.findMany({
                where: { userId: s.userId }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 100
            })).map(orderResponse) };
    });
    app.get('/api/orders/:id', async (req) => {
        const s = await auth(req);
        const order = await db.order.findFirst({
            where: {
                id: (req.params as any).id, userId: s.userId
            }, include: { items: true }
        });
        if (!order)
            throw new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.');
        return { order: orderResponse(order) };
    });
    app.post('/api/orders', { config: { rateLimit: {
                max: 20, timeWindow: '1 minute'
            } } }, async (req, reply) => {
        const s = await auth(req);
        const input = v.orderInput.parse(req.body);
        const previous = await db.order.findUnique({
            where: { userId_idempotencyKey: {
                    userId: s.userId, idempotencyKey: input.idempotencyKey
                } }, include: { items: true }
        });
        if (previous)
            return {
                order: orderResponse(previous), replayed: true
            };
        if (input.fulfillmentType === 'DELIVERY')
            throw new ApiError(422, 'SHIPPING_UNAVAILABLE', 'Entrega e cálculo de frete aguardam integração. Selecione retirada na loja.');
        let order: any;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                order = await db.$transaction(async (tx) => {
                    const existing = await tx.order.findUnique({
                        where: { userId_idempotencyKey: {
                                userId: s.userId, idempotencyKey: input.idempotencyKey
                            } }, include: { items: true }
                    });
                    if (existing)
                        return existing;
                    const c = await tx.cart.findUnique({
                        where: { userId: s.userId }, include: { items: { include: { product: true } } }
                    });
                    if (!c?.items.length)
                        throw new ApiError(422, 'EMPTY_CART', 'Seu carrinho está vazio.');
                    let subtotalCents = 0;
                    for (const i of c.items) {
                        if (!i.product.active || i.quantity < 1 || i.quantity > 99)
                            throw new ApiError(422, 'PRODUCT_UNAVAILABLE', 'Produto indisponível.');
                        const result = await tx.product.updateMany({
                            where: {
                                id: i.productId, active: true, stock: { gte: i.quantity }
                            }, data: { stock: { decrement: i.quantity } }
                        });
                        if (!result.count)
                            throw new ApiError(422, 'INSUFFICIENT_STOCK', `Estoque insuficiente: ${i.product.name}`);
                        subtotalCents += i.quantity * i.product.priceCents;
                    }
                    const coupon = input.couponCode ? await couponDiscount(tx, input.couponCode, subtotalCents, s.userId) : null;
                    const discountCents = coupon?.discountCents || 0;
                    const pickupCode = await reservePickupCode(tx, config.secret);
                    const created = await tx.order.create({
                        data: {
                            userId: s.userId, idempotencyKey: input.idempotencyKey, orderNumber: `RQ-${Date.now()}-${token().slice(0, 6).toUpperCase()}`, fulfillmentType: input.fulfillmentType, paymentMethod: 'ON_PICKUP', subtotalCents, discountCents, shippingCents: 0, totalCents: subtotalCents - discountCents, pickupCodeHash: pickupCode.codeHash, pickupCodeEncrypted: pickupCode.encrypted, items: { create: c.items.map(i => ({
                                    productId: i.productId, skuSnapshot: i.product.sku, nameSnapshot: i.product.name, unitPriceCents: i.product.priceCents, quantity: i.quantity, totalCents: i.quantity * i.product.priceCents
                                })) }
                        }, include: { items: true }
                    });
                    await tx.pickupCodeReservation.update({where:{codeHash:pickupCode.codeHash},data:{orderId:created.id}});
                    await tx.orderEvent.create({data:{orderId:created.id,actorId:s.userId,type:'CREATED_STOCK_RESERVED',details:{totalCents:created.totalCents,items:c.items.map(i=>({productId:i.productId,quantity:i.quantity}))}}});
                    if (coupon)
                        await tx.couponRedemption.create({ data: {
                                couponId: coupon.coupon.id, userId: s.userId, orderId: created.id
                            } });
                    await tx.cartItem.deleteMany({ where: { cartId: c.id } });
                    return created;
                }, {
                    isolationLevel: 'Serializable', timeout: 15000
                });
                break;
            }
            catch (e: any) {
                if (e.code === 'P2034' && attempt < 2)
                    continue;
                if (e.code === 'P2002') {
                    const existing = await db.order.findUnique({
                        where: { userId_idempotencyKey: {
                                userId: s.userId, idempotencyKey: input.idempotencyKey
                            } }, include: { items: true }
                    });
                    if (existing) {
                        order = existing;
                        break;
                    }
                }
                throw e;
            }
        }
        return reply.code(201).send({ order: orderResponse(order) });
    });
    // Roles are assigned by trusted operators, never by customer registration.
    app.post('/api/staff/orders/:id/pickup', {config:{rateLimit:{max:10,timeWindow:'15 minutes',keyGenerator:(req:any)=>`${req.ip}:${req.params.id}`}}}, async(req) => {
        const session=await auth(req);
        if(!['STAFF','ADMIN'].includes(session.user.role)) throw new ApiError(403,'FORBIDDEN','Acesso restrito à equipe da loja.');
        const {code}=z.object({code:z.string().regex(/^\d{5}$/)}).strict().parse(req.body);
        const id=z.string().min(1).max(100).parse((req.params as any).id);
        // Row locking protects against concurrent confirmations across API instances.
        // Invalid attempts commit before returning an error, preserving the lockout.
        const result=await db.$transaction(async(tx)=>{
            const rows=await tx.$queryRaw<any[]>`SELECT * FROM "Order" WHERE "id"=${id} FOR UPDATE`;
            const order=rows[0];
            if(!order) return {error:404,code:'NOT_FOUND'};
            if(order.fulfillmentType!=='PICKUP'||order.pickedUpAt||['CANCELLED','COMPLETED','SHIPPED'].includes(order.status)) return {error:409,code:'PICKUP_UNAVAILABLE'};
            if(order.paymentStatus!=='PAID') return {error:409,code:'PAYMENT_REQUIRED'};
            const now=new Date();
            if(order.pickupLockedUntil && order.pickupLockedUntil>now) return {error:429,code:'PICKUP_LOCKED'};
            if(!equal(order.pickupCodeHash||'',pickupHash(code,config.secret))) {
                const attempts=order.pickupLockedUntil ? 1 : order.pickupAttempts+1;
                await tx.order.update({where:{id},data:{pickupAttempts:attempts,pickupLockedUntil:attempts>=5?new Date(now.getTime()+15*60000):null}});
                return {error:attempts>=5?429:422,code:attempts>=5?'PICKUP_LOCKED':'INVALID_PICKUP_CODE'};
            }
            const reservation=await tx.pickupCodeReservation.updateMany({where:{codeHash:order.pickupCodeHash,orderId:id,consumedAt:null},data:{consumedAt:now}});
            if(reservation.count!==1) return {error:409,code:'PICKUP_UNAVAILABLE'};
            await tx.order.update({where:{id},data:{status:'COMPLETED',pickedUpAt:now,pickedUpById:session.userId,pickupAttempts:0,pickupLockedUntil:null}});
            await tx.orderEvent.create({data:{orderId:id,actorId:session.userId,type:'PICKED_UP',details:{paymentStatus:order.paymentStatus}}});
            return {orderId:id,orderNumber:order.orderNumber,status:'COMPLETED',pickedUpAt:now,pickedUpById:session.userId};
        },{timeout:15000});
        if('error' in result) throw new ApiError(result.error!,result.code!,'Retirada não autorizada. Confira pedido, pagamento e código ou aguarde o desbloqueio.');
        return {pickup:result};
    });
    registerCounter(app,db,auth,config.secret);
    registerAdmin(app,db,auth);
    registerTerminal(app,db,auth,config.production);
    return app;
}
