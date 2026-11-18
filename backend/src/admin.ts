import type { FastifyInstance } from 'fastify';
import type { PrismaClient, Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { z } from 'zod';
import { ApiError, publicProduct, publicUser, token } from './domain.js';
import {jpegUpload} from './media.js';
const text = z.string().trim().min(1).max(200);
const currentPassword = z.string().min(1).max(128);
const secureBody = z.object({ currentPassword }).strict();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const imageUrl = z.string().max(1000).refine(s => {
    try {
        if(/^\/api\/media\/[0-9a-f]{64}$/.test(s))return true;
        if (s.startsWith('public/')) {
            const decoded = decodeURIComponent(s);
            return /^public\/[a-zA-Z0-9_./ -]+$/.test(decoded) && !decoded.includes('..');
        }
        const url = new URL(s);
        return url.protocol === 'https:' && !url.username && !url.password;
    }
    catch {
        return false;
    }
}, 'Use caminho público local ou HTTPS.');
const image = z.object({
    imageUrl, position: z.number().int().min(0).max(50)
}).strict();
const compatibility = z.object({
    brand: text, model: text, version: text.nullable().optional(), yearFrom: z.number().int().min(1900).max(2100), yearTo: z.number().int().min(1900).max(2100)
}).strict().refine(c => c.yearTo >= c.yearFrom);
const productInput = z.object({
    name: text, slug, sku: text.max(80), description: z.string().trim().max(10000), priceCents: z.number().int().min(0).max(100000000), categoryId: text.nullable().optional(), active: z.boolean().optional(), images: z.array(image).max(20).optional(), compatibilities: z.array(compatibility).max(200).optional(), currentPassword
});
const couponInput = z.object({
    code: z.string().trim().regex(/^[A-Za-z0-9_-]{2,40}$/).transform(s => s.toUpperCase()), type: z.enum(['PERCENT', 'FIXED']), value: z.number().int().min(1).max(100000000), minimumCents: z.number().int().min(0).max(100000000).optional(), usageLimit: z.number().int().min(0).max(1000000).nullable().optional(), startsAt: z.iso.datetime().nullable().optional(), expiresAt: z.iso.datetime().nullable().optional(), active: z.boolean().optional(), currentPassword
});
const productInclude = {
    images: { orderBy: { position: 'asc' as const } }, compatibilities: true, category: true
};
const userSelect = {
    id: true, name: true, email: true, phone: true, role: true, createdAt: true
} as const;
const limited = { config: { rateLimit: {
            max: 30, timeWindow: '1 minute'
        } } };
function id(req: any) {
    return text.parse(req.params.id);
}
function pagination(query: any) {
    return z.object({
        take: z.coerce.number().int().min(1).max(100).default(50), skip: z.coerce.number().int().min(0).max(100000).default(0), q: z.string().trim().max(100).optional(), status: z.enum(['PENDING', 'CONFIRMED', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional()
    }).parse(query);
}
function safeOrder(order: any) {
    const { pickupCodeHash, pickupCodeEncrypted, pickupAttempts, pickupLockedUntil, idempotencyKey, ...safe } = order;
    return safe;
}
async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityType: string, entityId: string, details: Prisma.InputJsonValue) {
    await tx.adminAudit.create({ data: {
            actorId, action, entityType, entityId, details
        } });
}
function validateCoupon(c: any) {
    if (c.type === 'PERCENT' && c.value > 100 || c.startsAt && c.expiresAt && new Date(c.startsAt) >= new Date(c.expiresAt))
        throw new ApiError(400, 'VALIDATION', 'Confira percentual e datas do cupom.');
}
export function registerAdmin(app: FastifyInstance, db: PrismaClient, auth: (req: any) => Promise<any>) {
    function transaction<T>(run:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{return db.$transaction(run,{timeout:15000,maxWait:10000});}
    app.get('/api/categories', async () => ({ categories: await db.category.findMany({
            where: { active: true }, select: {
                id: true, name: true, slug: true, active: true, imageUrl:true
            }, orderBy: { name: 'asc' }
        }) }));
    app.get('/api/store', async () => ({ settings: Object.fromEntries((await db.storeSetting.findMany({ where: { key: { in: ['name', 'phone', 'email', 'address', 'openingHours', 'city', 'state', 'zipCode', 'neighborhood', 'addressConfirmed'] } } })).map(s => [s.key, s.value])) }));
    async function admin(req: any) {
        const session = await auth(req);
        if (session.user.role !== 'ADMIN')
            throw new ApiError(403, 'FORBIDDEN', 'Acesso restrito à administração.');
        return session;
    }
    async function staff(req: any) {
        const session = await auth(req);
        if (!['STAFF', 'ADMIN'].includes(session.user.role))
            throw new ApiError(403, 'FORBIDDEN', 'Acesso restrito à equipe.');
        return session;
    }
    async function sensitive(req: any, password: string) {
        const session = await admin(req);
        if (!await argon2.verify(session.user.passwordHash, password))
            throw new ApiError(401, 'PASSWORD_REQUIRED', 'Confirme sua senha atual para continuar.');
        return session;
    }
    app.post('/api/admin/media',{bodyLimit:750000,config:{rateLimit:{max:30,timeWindow:'1 hour'}}},async(req,reply)=>{
        const s=await admin(req),input=z.object({base64:z.string().min(4).max(700000)}).strict().parse(req.body),asset=jpegUpload(input.base64);
        await transaction(async tx=>{await tx.mediaAsset.upsert({where:{id:asset.id},create:asset,update:{}});await audit(tx,s.userId,'CATALOG_IMAGE_UPLOADED','MediaAsset',asset.id,{bytes:asset.content.length});});
        return reply.code(201).send({imageUrl:'/api/media/'+asset.id});
    });
    app.get('/api/media/:id',async(req,reply)=>{
        const assetId=z.string().regex(/^[0-9a-f]{64}$/).parse((req.params as any).id);
        const asset=await db.mediaAsset.findUnique({where:{id:assetId},select:{content:true}});if(!asset)throw new ApiError(404,'NOT_FOUND','Imagem não encontrada.');
        return reply.header('Cache-Control','public, max-age=31536000, immutable').header('X-Content-Type-Options','nosniff').header('Content-Security-Policy',"default-src 'none'; sandbox").type('image/jpeg').send(Buffer.from(asset.content));
    });
    async function categoryActive(tx: Prisma.TransactionClient, categoryId: string | null | undefined) {
        if (categoryId && !await tx.category.findFirst({ where: {
                id: categoryId, active: true
            } }))
            throw new ApiError(422, 'INVALID_CATEGORY', 'Selecione uma categoria ativa.');
    }
    app.get('/api/admin/dashboard', async (req) => {
        await admin(req);
        const [orders, pendingOrders, customers, products, lowStock, paid, recentOrders] = await Promise.all([db.order.count(), db.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'READY'] } } }), db.user.count({ where: { role: 'CUSTOMER' } }), db.product.count(), db.product.count({ where: {
                    active: true, stock: { lte: 5 }
                } }), db.counterPayment.aggregate({ _sum: { amountCents: true } }), db.order.findMany({
                take: 8, orderBy: { createdAt: 'desc' }, include: {
                    user: { select: {
                            id: true, name: true
                        } }, items: true
                }
            })]);
        return {
            metrics: {
                orders, pendingOrders, customers, products, lowStock, paidCents: paid._sum.amountCents || 0
            }, recentOrders: recentOrders.map(safeOrder)
        };
    });
    app.get('/api/admin/products', async (req) => {
        await admin(req);
        const p = pagination(req.query);
        const where = p.q ? { OR: [{ name: {
                        contains: p.q, mode: 'insensitive' as const
                    } }, { sku: {
                        contains: p.q, mode: 'insensitive' as const
                    } }] } : {};
        return {
            products: (await db.product.findMany({
                where, include: productInclude, take: p.take, skip: p.skip, orderBy: { name: 'asc' }
            })).map(p => ({
                ...publicProduct(p), categoryId: p.categoryId, category: p.category
            })), total: await db.product.count({ where })
        };
    });
    app.get('/api/admin/products/:id', async (req) => {
        await admin(req);
        const p = await db.product.findUnique({
            where: { id: id(req) }, include: productInclude
        });
        if (!p)
            throw new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.');
        return { product: {
                ...publicProduct(p), categoryId: p.categoryId, category: p.category
            } };
    });
    app.post('/api/admin/products', limited, async (req, reply) => {
        await admin(req);
        const parsed = productInput.extend({ initialStock: z.number().int().min(0).max(1000000).default(0) }).strict().parse(req.body);
        const s = await sensitive(req, parsed.currentPassword);
        const { currentPassword: _, images = [], compatibilities = [], initialStock, ...data } = parsed;
        const product = await transaction(async (tx) => {
            await categoryActive(tx, data.categoryId);
            const p = await tx.product.create({
                data: {
                    ...data, id: 'produto-' + token().slice(0, 16), stock: initialStock, metadata: {
                        categoria: data.categoryId ? (await tx.category.findUnique({ where: { id: data.categoryId } }))!.slug : '', marca: ''
                    }, images: { create: images }, compatibilities: { create: compatibilities }
                }, include: productInclude
            });
            await audit(tx, s.userId, 'PRODUCT_CREATED', 'Product', p.id, {
                sku: p.sku, priceCents: p.priceCents, stock: p.stock
            });
            return p;
        });
        return reply.code(201).send({ product: {
                ...publicProduct(product), categoryId: product.categoryId, category: product.category
            } });
    });
    app.patch('/api/admin/products/:id', limited, async (req) => {
        await admin(req);
        const parsed = productInput.partial().required({ currentPassword: true }).strict().parse(req.body);
        const s = await sensitive(req, parsed.currentPassword);
        const { currentPassword: _, images, compatibilities, ...data } = parsed;
        const product = await transaction(async (tx) => {
            const old = await tx.product.findUnique({ where: { id: id(req) } });
            if (!old)
                throw new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.');
            await categoryActive(tx, data.categoryId);
            if (images) {
                await tx.productImage.deleteMany({ where: { productId: old.id } });
                if (new Set(images.map(i => i.position)).size !== images.length)
                    throw new ApiError(400, 'VALIDATION', 'Posições de imagens devem ser únicas.');
            }
            if (compatibilities)
                await tx.productCompatibility.deleteMany({ where: { productId: old.id } });
            const category = data.categoryId ? await tx.category.findUnique({ where: { id: data.categoryId } }) : null;
            const metadata = {
                ...(old.metadata as any), ...(data.categoryId !== undefined ? { categoria: category?.slug || '' } : {}), ...(compatibilities?.length?{compatibilidadePendente:false}:{})
            };
            const p = await tx.product.update({
                where: { id: old.id }, data: {
                    ...data, metadata, ...(images ? { images: { create: images } } : {}), ...(compatibilities ? { compatibilities: { create: compatibilities } } : {})
                }, include: productInclude
            });
            await audit(tx, s.userId, 'PRODUCT_UPDATED', 'Product', p.id, {
                fields: Object.keys(data), oldPriceCents: old.priceCents, priceCents: p.priceCents, imageCount: images?.length ?? null, compatibilityCount: compatibilities?.length ?? null
            });
            return p;
        });
        return { product: {
                ...publicProduct(product), categoryId: product.categoryId, category: product.category
            } };
    });
    app.delete('/api/admin/products/:id', limited, async (req) => {
        await admin(req);
        const data = secureBody.parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        await transaction(async (tx) => {
            const result = await tx.product.updateMany({
                where: { id: id(req) }, data: { active: false }
            });
            if (!result.count)
                throw new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.');
            await audit(tx, s.userId, 'PRODUCT_DISABLED', 'Product', id(req), {});
        });
        return { ok: true };
    });
    app.get('/api/admin/categories', async (req) => {
        await admin(req);
        return { categories: await db.category.findMany({
                orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } }
            }) };
    });
    app.post('/api/admin/categories', limited, async (req, reply) => {
        await admin(req);
        const data = z.object({
            name: text, slug, active: z.boolean().optional(), imageUrl:imageUrl.nullable().optional(), currentPassword
        }).strict().parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        const { currentPassword: _, ...values } = data;
        const category = await transaction(async (tx) => {
            const c = await tx.category.create({ data: values });
            await audit(tx, s.userId, 'CATEGORY_CREATED', 'Category', c.id, {
                name: c.name, slug: c.slug
            });
            return c;
        });
        return reply.code(201).send({ category });
    });
    app.patch('/api/admin/categories/:id', limited, async (req) => {
        await admin(req);
        const data = z.object({
            name: text.optional(), slug: slug.optional(), active: z.boolean().optional(), imageUrl:imageUrl.nullable().optional(), currentPassword
        }).strict().parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        const { currentPassword: _, ...values } = data;
        const category = await transaction(async (tx) => {
            const previous = await tx.category.findUnique({ where: { id: id(req) } });
            if (!previous)
                throw new ApiError(404, 'NOT_FOUND', 'Categoria não encontrada.');
            const c = await tx.category.update({
                where: { id: previous.id }, data: values
            });
            if (c.slug !== previous.slug) {
                const products = await tx.product.findMany({ where: { categoryId: c.id } });
                for (const p of products)
                    await tx.product.update({
                        where: { id: p.id }, data: { metadata: {
                                ...(p.metadata as any), categoria: c.slug
                            } }
                    });
            }
            await audit(tx, s.userId, 'CATEGORY_UPDATED', 'Category', c.id, { fields: Object.keys(values) });
            return c;
        });
        return { category };
    });
    app.delete('/api/admin/categories/:id', limited, async (req) => {
        await admin(req);
        const data = secureBody.parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        await transaction(async (tx) => {
            const c = await tx.category.updateMany({
                where: { id: id(req) }, data: { active: false }
            });
            if (!c.count)
                throw new ApiError(404, 'NOT_FOUND', 'Categoria não encontrada.');
            await audit(tx, s.userId, 'CATEGORY_DISABLED', 'Category', id(req), {});
        });
        return { ok: true };
    });
    app.get('/api/admin/stock', async (req) => {
        await admin(req);
        const p = pagination(req.query);
        const where=p.q?{OR:[{name:{contains:p.q,mode:'insensitive' as const}},{sku:{contains:p.q,mode:'insensitive' as const}}]}:{};
        return {
            total:await db.product.count({where}),
            products: await db.product.findMany({
                where,
                select: {
                    id: true, name: true, sku: true, priceCents:true, stock: true, active: true
                }, orderBy: { stock: 'asc' }, take: p.take, skip: p.skip
            }), movements: await db.adminAudit.findMany({
                where: { action: 'STOCK_ADJUSTED' }, orderBy: { createdAt: 'desc' }, take: 50, include: { actor: { select: {
                            id: true, name: true
                        } } }
            })
        };
    });
    app.post('/api/admin/stock/:id', limited, async (req) => {
        await admin(req);
        const data = z.object({
            delta: z.number().int().min(-1000000).max(1000000).refine(n => n !== 0), reason: z.string().trim().min(3).max(300), currentPassword
        }).strict().parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        const product = await transaction(async (tx) => {
            const rows = await tx.$queryRaw<any[]> `SELECT id,stock FROM "Product" WHERE id=${id(req)} FOR UPDATE`;
            if (!rows[0])
                throw new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.');
            const before = rows[0].stock;
            const after = before + data.delta;
            if (after < 0 || after > 1000000)
                throw new ApiError(422, 'INVALID_STOCK', 'O ajuste produziria estoque inválido.');
            const p = await tx.product.update({
                where: { id: id(req) }, data: { stock: after }
            });
            await audit(tx, s.userId, 'STOCK_ADJUSTED', 'Product', p.id, {
                before, after, delta: data.delta, reason: data.reason
            });
            return {
                id: p.id, stock: p.stock
            };
        });
        return { product };
    });
    const orderInclude = {
        items: true, user: { select: {
                id: true, name: true, email: true, phone: true
            } }, counterPayment: { include: { employee: { select: {
                        id: true, name: true
                    } } } }, events: {
            orderBy: { createdAt: 'asc' as const }, include: { actor: { select: {
                        id: true, name: true
                    } } }
        }
    };
    app.get('/api/admin/orders', async (req) => {
        await admin(req);
        const p = pagination(req.query);
        const where = {
            ...(p.status ? { status: p.status } : {}), ...(p.q ? { orderNumber: {
                    contains: p.q, mode: 'insensitive' as const
                } } : {})
        };
        return {
            orders: (await db.order.findMany({
                where, include: orderInclude, orderBy: { createdAt: 'desc' }, take: p.take, skip: p.skip
            })).map(safeOrder), total: await db.order.count({ where })
        };
    });
    app.get('/api/admin/orders/:id', async (req) => {
        await admin(req);
        const order = await db.order.findUnique({
            where: { id: id(req) }, include: orderInclude
        });
        if (!order)
            throw new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.');
        return { order: safeOrder(order) };
    });
    app.patch('/api/admin/orders/:id/status', limited, async (req) => {
        await admin(req);
        const data = z.object({
            status: z.enum(['CONFIRMED', 'READY']), currentPassword
        }).strict().parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        const order = await transaction(async (tx) => {
            const rows = await tx.$queryRaw<any[]> `SELECT id,status,"pickedUpAt" FROM "Order" WHERE id=${id(req)} FOR UPDATE`;
            const old = rows[0];
            if (!old)
                throw new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.');
            if (old.pickedUpAt || !['PENDING', 'CONFIRMED', 'READY'].includes(old.status) || data.status === 'CONFIRMED' && old.status === 'READY')
                throw new ApiError(409, 'INVALID_TRANSITION', 'Esta mudança de preparação não é permitida.');
            const o = await tx.order.update({
                where: { id: old.id }, data: { status: data.status }, include: orderInclude
            });
            if (old.status !== data.status) {
                await tx.orderEvent.create({ data: {
                        orderId: old.id, actorId: s.userId, type: 'PREPARATION_STATUS', details: {
                            from: old.status, to: data.status
                        }
                    } });
                await audit(tx, s.userId, 'ORDER_PREPARATION', 'Order', old.id, {
                    from: old.status, to: data.status
                });
            }
            return o;
        });
        return { order: safeOrder(order) };
    });
    app.get('/api/admin/payments', async (req) => {
        await admin(req);
        const p = pagination(req.query);
        return { payments: await db.counterPayment.findMany({
                orderBy: { createdAt: 'desc' }, take: p.take, skip: p.skip, include: {
                    order: { select: {
                            id: true, orderNumber: true
                        } }, employee: { select: {
                            id: true, name: true
                        } }
                }
            }) };
    });
    app.get('/api/admin/pickups', async (req) => {
        await admin(req);
        const p = pagination(req.query);
        return { orders: (await db.order.findMany({
                where: { fulfillmentType: 'PICKUP' }, orderBy: { createdAt: 'desc' }, take: p.take, skip: p.skip, include: {
                    user: { select: {
                            id: true, name: true
                        } }, pickedUpBy: { select: {
                            id: true, name: true
                        } }
                }
            })).map(safeOrder) };
    });
    app.get('/api/admin/customers', async (req) => {
        await admin(req);
        const p = pagination(req.query);
        const where = {
            role: 'CUSTOMER' as const, ...(p.q ? { OR: [{ name: {
                            contains: p.q, mode: 'insensitive' as const
                        } }, { email: {
                            contains: p.q, mode: 'insensitive' as const
                        } }] } : {})
        };
        return {
            customers: await db.user.findMany({
                where, select: {
                    ...userSelect, _count: { select: { orders: true } }
                }, take: p.take, skip: p.skip, orderBy: { name: 'asc' }
            }), total: await db.user.count({ where })
        };
    });
    app.get('/api/admin/customers/:id', async (req) => {
        await admin(req);
        const customer = await db.user.findFirst({
            where: {
                id: id(req), role: 'CUSTOMER'
            }, select: userSelect
        });
        if (!customer)
            throw new ApiError(404, 'NOT_FOUND', 'Cliente não encontrado.');
        return {
            customer, orders: (await db.order.findMany({
                where: { userId: customer.id }, orderBy: { createdAt: 'desc' }, take: 50, include: { items: true }
            })).map(safeOrder)
        };
    });
    app.get('/api/admin/employees', async (req) => {
        await admin(req);
        const p=pagination(req.query);
        const where:Prisma.UserWhereInput={role:{in:['STAFF','ADMIN']},...(p.q?{OR:[{name:{contains:p.q,mode:'insensitive'}},{email:{contains:p.q,mode:'insensitive'}}]}:{})};
        return { employees: await db.user.findMany({
                where, select: userSelect, orderBy: { name: 'asc' }, take:p.take,skip:p.skip
            }),total:await db.user.count({where}) };
    });
    app.get('/api/admin/employees/find', async (req) => {
        await admin(req);
        const { email } = z.object({ email: z.email().transform(v => v.toLowerCase()) }).parse(req.query);
        const user = await db.user.findUnique({
            where: { email }, select: userSelect
        });
        if (!user)
            throw new ApiError(404, 'NOT_FOUND', 'Conta não encontrada. O funcionário deve cadastrar sua própria conta primeiro.');
        return { user };
    });
    app.patch('/api/admin/employees/:id', limited, async (req) => {
        await admin(req);
        const data = z.object({
            role: z.enum(['STAFF', 'CUSTOMER']), currentPassword
        }).strict().parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        const employee = await transaction(async (tx) => {
            const old = await tx.user.findUnique({ where: { id: id(req) } });
            if (!old || old.role === 'ADMIN' || old.id === s.userId)
                throw new ApiError(409, 'ACCOUNT_UNAVAILABLE', 'Esta conta não pode ser alterada por esta operação.');
            const user = await tx.user.update({
                where: { id: old.id }, data: { role: data.role }, select: userSelect
            });
            await tx.session.updateMany({
                where: {
                    userId: old.id, revokedAt: null
                }, data: { revokedAt: new Date() }
            });
            await audit(tx, s.userId, 'EMPLOYEE_ROLE_CHANGED', 'User', old.id, {
                from: old.role, to: data.role
            });
            return user;
        });
        return { employee };
    });
    app.get('/api/admin/coupons', async (req) => {
        await admin(req);
        const p=pagination(req.query);
        const where:Prisma.CouponWhereInput=p.q?{code:{contains:p.q,mode:'insensitive'}}:{};
        return { coupons: await db.coupon.findMany({
                where,take:p.take,skip:p.skip, orderBy: { code: 'asc' }, include: { _count: { select: { redemptions: true } } }
            }),total:await db.coupon.count({where}) };
    });
    app.post('/api/admin/coupons', limited, async (req, reply) => {
        await admin(req);
        const data = couponInput.strict().parse(req.body);
        validateCoupon(data);
        const s = await sensitive(req, data.currentPassword);
        const { currentPassword: _, ...values } = data;
        const coupon = await transaction(async (tx) => {
            const c = await tx.coupon.create({ data: values });
            await audit(tx, s.userId, 'COUPON_CREATED', 'Coupon', c.id, { code: c.code });
            return c;
        });
        return reply.code(201).send({ coupon });
    });
    app.patch('/api/admin/coupons/:id', limited, async (req) => {
        await admin(req);
        const data = couponInput.partial().required({ currentPassword: true }).strict().parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        const { currentPassword: _, ...values } = data;
        const coupon = await transaction(async (tx) => {
            const old = await tx.coupon.findUnique({ where: { id: id(req) } });
            if (!old)
                throw new ApiError(404, 'NOT_FOUND', 'Cupom não encontrado.');
            validateCoupon({
                ...old, ...values
            });
            const c = await tx.coupon.update({
                where: { id: old.id }, data: values
            });
            await audit(tx, s.userId, 'COUPON_UPDATED', 'Coupon', c.id, { fields: Object.keys(values) });
            return c;
        });
        return { coupon };
    });
    app.delete('/api/admin/coupons/:id', limited, async (req) => {
        await admin(req);
        const data = secureBody.parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        await transaction(async (tx) => {
            const c = await tx.coupon.updateMany({
                where: { id: id(req) }, data: { active: false }
            });
            if (!c.count)
                throw new ApiError(404, 'NOT_FOUND', 'Cupom não encontrado.');
            await audit(tx, s.userId, 'COUPON_DISABLED', 'Coupon', id(req), {});
        });
        return { ok: true };
    });
    app.get('/api/admin/reports', async (req) => {
        await admin(req);
        const [summary, statuses, payments, topProducts] = await Promise.all([db.order.aggregate({
                _sum: {
                    subtotalCents: true, discountCents: true, totalCents: true
                }, _count: true
            }), db.order.groupBy({
                by: ['status'], _count: true, _sum: { totalCents: true }
            }), db.counterPayment.groupBy({
                by: ['method'], _count: true, _sum: { amountCents: true }
            }), db.orderItem.groupBy({
                by: ['productId', 'nameSnapshot'], _sum: {
                    quantity: true, totalCents: true
                }, orderBy: { _sum: { quantity: 'desc' } }, take: 10
            })]);
        return {
            summary, statuses, payments, topProducts, notice: 'Totais de pedidos incluem pedidos pendentes/cancelados. Valores recebidos são somente pagamentos presenciais registrados.'
        };
    });
    app.get('/api/admin/settings', async (req) => {
        await admin(req);
        return { settings: Object.fromEntries((await db.storeSetting.findMany({ where: { key: { in: ['name', 'phone', 'email', 'address', 'openingHours', 'city', 'state', 'zipCode', 'neighborhood', 'addressConfirmed'] } } })).map(s => [s.key, s.value])) };
    });
    app.patch('/api/admin/settings', limited, async (req) => {
        await admin(req);
        const data = z.object({
            settings: z.object({
                name: text.optional(), phone: z.string().max(30).optional(), email: z.email().optional(), address: z.string().trim().max(500).optional(), openingHours: z.string().trim().max(500).optional(), city: text.optional(), state: z.string().regex(/^[A-Z]{2}$/).optional(), zipCode: z.string().regex(/^\d{5}-?\d{3}$/).optional(), neighborhood: text.optional(), addressConfirmed:z.enum(['true','false']).optional()
            }).strict(), currentPassword
        }).strict().parse(req.body);
        const s = await sensitive(req, data.currentPassword);
        await transaction(async (tx) => {
            for (const [key, value] of Object.entries(data.settings))
                if (value !== undefined)
                    await tx.storeSetting.upsert({
                        where: { key }, create: {
                            key, value
                        }, update: { value }
                    });
            await audit(tx, s.userId, 'STORE_SETTINGS_UPDATED', 'StoreSetting', 'store', { keys: Object.keys(data.settings) });
        });
        return { settings: Object.fromEntries((await db.storeSetting.findMany({ where: { key: { in: ['name', 'phone', 'email', 'address', 'openingHours', 'city', 'state', 'zipCode', 'neighborhood', 'addressConfirmed'] } } })).map(s => [s.key, s.value])) };
    });
    app.get('/api/admin/audit', async (req) => {
        await admin(req);
        const p = pagination(req.query);
        return { events: await db.adminAudit.findMany({
                take: p.take, skip: p.skip, orderBy: { createdAt: 'desc' }, include: { actor: { select: {
                            id: true, name: true
                        } } }
            }) };
    });
    app.get('/api/staff/orders', async (req) => {
        await staff(req);
        const p = pagination(req.query);
        const where = {
            fulfillmentType: 'PICKUP' as const, ...(p.status ? { status: p.status } : { status: { in: ['PENDING', 'CONFIRMED', 'READY'] as any } }), ...(p.q ? { orderNumber: {
                    contains: p.q, mode: 'insensitive' as const
                } } : {})
        };
        return { orders: await db.order.findMany({
                where, select: {
                    id: true, orderNumber: true, status: true, paymentStatus: true, fulfillmentType: true, totalCents: true, createdAt: true, pickedUpAt: true, user: { select: { name: true } }, _count: { select: { items: true } }
                }, orderBy: { createdAt: 'desc' }, take: p.take, skip: p.skip
            }) };
    });
    app.get('/api/staff/history', async (req) => {
        const s = await staff(req);
        const p = pagination(req.query);
        return { events: await db.orderEvent.findMany({
                where: {
                    ...(s.user.role === 'STAFF' ? { actorId: s.userId } : {}), type: { in: ['COUNTER_PAYMENT', 'PICKED_UP', 'CANCELLED_STOCK_RETURNED', 'PREPARATION_STATUS'] }
                }, select: {
                    id: true, type: true, createdAt: true, details: true, actor: { select: {
                            id: true, name: true
                        } }, order: { select: {
                            id: true, orderNumber: true, status: true, totalCents: true
                        } }
                }, orderBy: { createdAt: 'desc' }, take: p.take, skip: p.skip
            }) };
    });
}
