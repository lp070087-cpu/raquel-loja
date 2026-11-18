import { test, expect } from '../backend/node_modules/@playwright/test/index.mjs';
import { mkdir } from 'node:fs/promises';

// Visual/UI regression with explicit API fixtures, never writes to Neon.
test('gestão limpa, menu prioritário e vitrine mobile em duas colunas', async ({ page }) => {
  const categories=Array.from({length:4},(_,i)=>({id:`cat-${i}`,name:`Categoria ${i+1}`,slug:`categoria-${i}`,active:true}));
  const products=Array.from({length:4},(_,i)=>({id:`prod-${i}`,name:`Produto de teste ${i+1}`,sku:`SKU-${i}`,slug:`produto-${i}`,description:'Descrição controlada',priceCents:4590,stock:12,active:true,category:categories[0],categoryId:categories[0].id,images:[],compatibilities:[]}));
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const data=path.endsWith('/auth/me')?{user:{name:'Administradora Teste',role:'ADMIN'}}:path.endsWith('/admin/categories')?{categories}:path.endsWith('/admin/products')?{products,total:4}:path.endsWith('/admin/orders')||path.endsWith('/admin/pickups')?{orders:[{id:'order-1',orderNumber:'RAQ-123',user:{name:'Cliente Teste'},createdAt:new Date().toISOString(),totalCents:4590,status:'PENDING',paymentStatus:'PENDING'}],total:1}:{};
    await route.fulfill({json:data,headers:{'access-control-allow-origin':'http://127.0.0.1:8000','access-control-allow-credentials':'true'}});
  });
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/admin/painel.html');
  await expect(page).toHaveURL(/#atendimento$/);
  await expect(page.getByLabel('Código de retirada',{exact:true})).toBeVisible();
  await expect(page.locator('#atendimento-pedido')).toHaveCount(0);
  await page.locator('[data-secao="produtos"]').click();
  await expect(page.locator('.admin-item-card')).toHaveCount(4);
  await expect(page.locator('#menu-admin a').nth(0)).toHaveAttribute('href','#atendimento');
  await expect(page.locator('#menu-admin a').nth(1)).toHaveAttribute('href','#dashboard');
  await expect(page.locator('#menu-admin a').nth(2)).toHaveAttribute('href','#pedidos');
  await expect(page.locator('#menu-admin a').nth(3)).toHaveAttribute('href','#retiradas');
  await page.locator('[data-edit-product]').first().click();
  await expect(page.locator('[name="sku"]')).toHaveValue('SKU-0');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await mkdir('evidence/admin-layout',{recursive:true});
  for(const width of [320,375,390,430,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const columns=await page.locator('.admin-card-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width<=620?1:2);
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'evidence/admin-layout/products-1440.png'});
  await page.locator('[data-secao="categorias"]').click();
  await expect(page.locator('.admin-item-card')).toHaveCount(4);
  await page.locator('[data-edit-category]').first().click();
  await expect(page.locator('[name="slug"]')).toHaveValue('categoria-0');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'evidence/admin-layout/categories-1440.png'});
  await page.locator('[data-secao="pedidos"]').click();
  await expect(page.getByRole('cell',{name:'RAQ-123',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:900});
  await expect(page.getByRole('button',{name:'Ver detalhes'})).toBeVisible();
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.admin-orders-list').scrollIntoViewIfNeeded();
  await page.screenshot({path:'evidence/admin-layout/orders-390.png'});
  // Render the real shared storefront card in an isolated grid, without identity or DB changes.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async()=>{
    history.replaceState(null,'','/index.html');
    const {cardProduto}=await import('/assets/js/componentes.js');
    const data=await import('/assets/js/dados.js');
    const products=Object.values(data).find(value=>Array.isArray(value)&&value[0]?.preco!==undefined);
    if(!products)throw new Error('Produtos originais não encontrados');
    document.body.innerHTML=`<main class="container"><div class="grade grade--4">${products.slice(0,4).map(p=>cardProduto(p)).join('')}</div></main>`;
  });
  for(const width of [320,375,390,430]){
    await page.setViewportSize({width,height:900});
    expect(await page.locator('.grade').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.evaluate(()=>scrollTo(0,0));
  await expect(page.locator('.produto-card').first()).toBeInViewport();
  await expect(page.locator('.produto-card').first()).toHaveCSS('opacity','1');
  await expect.poll(()=>page.locator('.produto-card img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
  await page.screenshot({path:'evidence/admin-layout/storefront-430.png'});
  expect(errors).toEqual([]);
});
