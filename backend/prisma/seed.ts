import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const db = new PrismaClient();
try {
    const source = await import(pathToFileURL(resolve('..', 'assets', 'js', 'dados.js')).href);
    const products = source.PRODUTOS as any[];
    await db.$transaction(async (tx) => {
        const categories = new Map<string, string>();
        for (const c of source.CATEGORIAS || []) {
            const category = await tx.category.upsert({
                where: { slug: c.slug }, create: {
                    slug: c.slug, name: c.nome || c.slug
                }, update: {}
            });
            categories.set(c.slug, category.id);
        }
        for (const p of products) {
            // Management edits are authoritative after first import. Repeated
            // seeds never overwrite names, images, compatibility or availability.
            if (await tx.product.findUnique({ where: { id: p.id } }))
                continue;
            const metadata = JSON.parse(JSON.stringify(p));
            delete metadata.custo;
            delete metadata.estoqueMinimo;
            await tx.product.upsert({
                where: { id: p.id }, create: {
                    id: p.id, name: p.nome, slug: p.id, sku: p.sku, description: p.descricao || '', priceCents: Math.round(p.preco * 100), stock: p.estoque, metadata, categoryId: categories.get(p.categoria) || null
                }, update: {
                    name: p.nome, sku: p.sku, description: p.descricao || '', metadata
                }
            });
            // Never reset real stock/prices on repeated seed. Original commercial values are examples.
            await tx.productImage.deleteMany({ where: { productId: p.id } });
            await tx.productImage.createMany({ data: [...new Set<string>(p.fotos?.length ? p.fotos : [p.foto])].map((imageUrl, position) => ({
                    productId: p.id, imageUrl, position
                })) });
            await tx.productCompatibility.deleteMany({ where: { productId: p.id } });
            if (p.compat?.length)
                await tx.productCompatibility.createMany({ data: p.compat.map((c: any) => ({
                        productId: p.id, brand: c.marca, model: c.modelo, version: c.versao || null, yearFrom: c.anoInicio, yearTo: c.anoFim
                    })) });
        }
        for (const c of source.CUPONS || [])
            await tx.coupon.upsert({
                where: { code: c.codigo }, create: {
                    code: c.codigo, type: c.tipo === 'percentual' ? 'PERCENT' : 'FIXED', value: c.tipo === 'percentual' ? Math.round(c.valor * 100) : Math.round(c.valor * 100), minimumCents: Math.round(c.minimo * 100)
                }, update: {}
            });
    }, { timeout: 60000 });
    console.log(`Imported ${products.length} products; stable IDs, SKUs and original source preserved.`);
}
finally {
    await db.$disconnect();
}
