import { test, expect } from '../backend/node_modules/@playwright/test/index.mjs';
import { mkdir } from 'node:fs/promises';

test('estoque com indicadores globais e filtro de baixo até cinco unidades — API simulada',async({page})=>{
 const products=[0,1,5,6].map((stock,i)=>({id:'stock-'+i,name:'Produto '+i,sku:'SKU-'+i,priceCents:1000,stock,active:true}));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname,status=url.searchParams.get('stockStatus');
  const selected=products.filter(p=>status==='low'?p.stock>0&&p.stock<=5:status==='out'?p.stock===0:true);
  await route.fulfill({json:path.endsWith('/auth/me')?{user:{name:'Admin Teste',role:'ADMIN'}}:path.endsWith('/admin/stock')?{summary:{totalProducts:40,totalUnits:500,lowStock:4,outOfStock:2,lowStockThreshold:5},products:selected,movements:[],total:selected.length}:{}});
 });
 await page.goto('/admin/painel.html#estoque');await expect(page.locator('.admin-stock-overview .cartao-metrica')).toHaveCount(4);
 await expect(page.locator('.admin-stock-overview')).toContainText('500');await expect(page.locator('.admin-stock-badge--low')).toHaveCount(2);await expect(page.locator('.admin-stock-badge--out')).toHaveCount(1);
 await page.locator('[data-stock-status="low"]').click();await expect(page.locator('[data-stock]')).toHaveCount(2);await expect(page.locator('.admin-stock-badge--out')).toHaveCount(0);
 await page.locator('[data-stock-status="out"]').click();await expect(page.locator('[data-stock]')).toHaveCount(1);await expect(page.locator('.admin-stock-badge--out')).toHaveCount(1);
 await page.locator('[data-stock-status="all"]').click();await expect(page.locator('[data-stock]')).toHaveCount(4);
 for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await mkdir('evidence/admin-layout',{recursive:true});await page.screenshot({path:'evidence/admin-layout/stock-overview-1440.png',fullPage:true});
});

// Visual/UI regression with explicit API fixtures, never writes to Neon.
test('gestão limpa, menu prioritário e vitrine mobile em duas colunas', async ({ page }) => {
  const categories=Array.from({length:4},(_,i)=>({id:`cat-${i}`,name:`Categoria ${i+1}`,slug:`categoria-${i}`,imageUrl:'public/produtos/pneus/pneu-01.jpg',active:true}));
  const products=Array.from({length:4},(_,i)=>({id:`prod-${i}`,name:`Produto de teste ${i+1}`,sku:`SKU-${i}`,slug:`produto-${i}`,description:'Descrição controlada',priceCents:4590,stock:12,active:true,category:categories[i],categoryId:categories[i].id,images:[{imageUrl:'public/produtos/pneus/pneu-01.jpg'}],compatibilities:[]}));
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const data=path.endsWith('/auth/me')?{user:{name:'Administradora Teste',role:'ADMIN'}}:path.endsWith('/admin/categories')?{categories}:path.endsWith('/admin/products')?{products:products.filter(p=>!new URL(route.request().url()).searchParams.get('categoryId')||p.categoryId===new URL(route.request().url()).searchParams.get('categoryId')),total:new URL(route.request().url()).searchParams.has('categoryId')?1:4}:path.endsWith('/admin/orders')||path.endsWith('/admin/pickups')?{orders:[{id:'order-1',orderNumber:'RAQ-123',user:{name:'Cliente Teste'},createdAt:new Date().toISOString(),totalCents:4590,status:'PENDING',paymentStatus:'PENDING'}],total:1}:{};
    await route.fulfill({json:data,headers:{'access-control-allow-origin':'http://127.0.0.1:8000','access-control-allow-credentials':'true'}});
  });
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/admin/painel.html');
  await expect(page).toHaveURL(/#atendimento$/);
  await expect(page.getByLabel('Código de retirada',{exact:true})).toBeVisible();
  await expect(page.locator('#atendimento-pedido')).toHaveCount(0);
  await page.locator('[data-secao="produtos"]').click();
  await expect(page.locator('.admin-item-card')).toHaveCount(4);
  await expect.poll(()=>page.locator('.admin-item-card__photo').first().evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  await expect(page.locator('#menu-admin a').nth(0)).toHaveAttribute('href','#atendimento');
  await expect(page.locator('#menu-admin a').nth(1)).toHaveAttribute('href','#dashboard');
  await expect(page.locator('#menu-admin a').nth(2)).toHaveAttribute('href','#pedidos');
  await expect(page.locator('#menu-admin a').nth(3)).toHaveAttribute('href','#retiradas');
  await page.locator('[data-edit-product]').first().click();
  await expect(page.locator('[name="sku"]')).toHaveValue('SKU-0');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.locator('[data-product-category="cat-0"]').click();
  await expect(page.locator('.admin-item-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Novo produto',exact:true}).click();await expect(page.locator('[name="categoryId"]')).toHaveValue('cat-0');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.locator('[data-product-category=""]').click();await expect(page.locator('.admin-item-card')).toHaveCount(4);
  await mkdir('evidence/admin-layout',{recursive:true});
  for(const width of [320,375,390,430,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const columns=await page.locator('.admin-card-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width<=620?1:width>=1100?3:2);
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'evidence/admin-layout/products-1440.png'});
  await page.locator('[data-secao="categorias"]').click();
  await expect(page.locator('.admin-item-card')).toHaveCount(4);
  await expect.poll(()=>page.locator('.admin-item-card__photo').first().evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  await page.locator('[data-edit-category]').first().click();
  await expect(page.locator('[name="slug"]')).toHaveValue('categoria-0');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'evidence/admin-layout/categories-1440.png'});
  await page.locator('[data-secao="pedidos"]').click();
  await expect(page.getByRole('cell',{name:'Pedido RAQ-123',exact:true})).toBeVisible();
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

test('troca rápida de abas mantém estrutura e ignora resposta da seção anterior',async({page})=>{
 let release;const pending=new Promise(resolve=>release=resolve);
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/admin/products')){await pending;await route.fulfill({json:{products:[],total:0}});return;}
  const data=path.endsWith('/auth/me')?{user:{name:'Administradora Teste',role:'ADMIN'}}:path.endsWith('/admin/categories')?{categories:[{id:'cat-visible',name:'Categoria visível',slug:'categoria-visivel',active:true}]}:{};
  await route.fulfill({json:data});
 });
 await page.goto('/admin/painel.html');await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 await page.locator('[data-secao="produtos"]').click();await expect(page.locator('.admin-loading-card')).toHaveCount(4);
 await page.locator('[data-secao="categorias"]').click();await expect(page.locator('.admin-item-card h2')).toHaveText('Categoria visível');
 release();await expect(page.locator('#titulo-secao')).toHaveText('Categorias');await expect(page.locator('.admin-item-card h2')).toHaveText('Categoria visível');
 await page.setViewportSize({width:390,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('acabamento de relatórios pagamentos e configurações com usuário no rodapé',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;const data=path.endsWith('/auth/me')?{user:{name:'Lucas Teste',role:'ADMIN'}}:path.endsWith('/admin/reports')?{summary:{_count:3,_sum:{totalCents:24000,discountCents:500}},statuses:[{status:'PENDING',_count:2},{status:'COMPLETED',_count:1}],payments:[{method:'PIX',_count:1,_sum:{amountCents:8000}}],topProducts:[{nameSnapshot:'Óleo de teste',_sum:{quantity:2,totalCents:8000}}]}:path.endsWith('/admin/payments')?{payments:[{orderId:'order-example',order:{orderNumber:'RQ-EXEMPLO'},amountCents:8000,method:'PIX',employee:{name:'Atendente'},createdAt:new Date().toISOString()}],total:1}:path.endsWith('/admin/settings')?{settings:{name:'Loja de teste',addressConfirmed:'false'}}:{};await route.fulfill({json:data});
 });
 await page.goto('/admin/painel.html');await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 await expect(page.locator('.admin__rodape .admin__usuario')).toContainText('Lucas Teste');await expect(page.locator('.admin__topo .admin__usuario')).toHaveCount(0);
 for(const section of ['relatorios','pagamentos','configuracoes']){
  await page.locator(`[data-secao="${section}"]`).click();
  await expect(page.locator('.admin-loading')).toHaveCount(0);
  if(section==='relatorios')await expect(page.locator('.admin-summary-panel')).toHaveCount(3);
  if(section==='pagamentos')await expect(page.locator('.admin-payment-card')).toHaveCount(1);
  if(section==='configuracoes'){await expect(page.locator('.admin-settings-group')).toHaveCount(3);await expect(page.getByLabel('Nome da loja',{exact:true})).toHaveValue('Loja de teste');}
  for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.screenshot({path:`evidence/admin-layout/${section}-compact-1440.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
});

test('funcionário usa seis seções no mesmo painel sem menus administrativos',async({page})=>{
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;await route.fulfill({json:path.endsWith('/auth/me')?{user:{name:'Atendente Teste',role:'STAFF'}}:path.endsWith('/staff/dashboard')?{metrics:{pending:2,ready:1,completed:3},recentOrders:[]}:path.endsWith('/staff/customers')?{customers:[{name:'Cliente',phone:'81999999999',_count:{orders:1}}],total:1}:path.endsWith('/staff/history')?{events:[]}:{orders:[],total:0}});
 });
 await page.goto('/admin/funcionario.html');await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 await expect(page.locator('#menu-admin a')).toHaveCount(6);await expect(page.locator('#menu-admin')).not.toContainText('Configurações');
 for(const section of ['dashboard','pedidos','retiradas','clientes','historico','atendimento']){await page.locator(`[data-secao="${section}"]`).click();await expect(page.locator('.admin-loading')).toHaveCount(0);await expect(page.locator('[role="alert"]')).toHaveCount(0);}
});

test('nome e PIN no computador autorizado, sem e-mail no atendimento — API simulada',async({page})=>{
 let logged=false,received;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/auth/me')&&!logged)return route.fulfill({status:401,json:{message:'Entre na conta'}});
  if(path.endsWith('/counter/login')){received=route.request().postDataJSON();logged=true;return route.fulfill({json:{user:{name:'Atendente Teste',role:'STAFF'}}});}
  const data=path.endsWith('/auth/csrf')?{csrfToken:'controlled-csrf'}:path.endsWith('/counter/access')?{terminal:{id:'terminal-test',name:'Balcão teste'},employees:[{id:'staff-test',name:'Atendente Teste'}]}:path.endsWith('/auth/me')?{user:{name:'Atendente Teste',role:'STAFF'}}:{};await route.fulfill({json:data});
 });
 await page.goto('/admin/login.html');await page.getByRole('button',{name:'Entrar com nome e PIN',exact:true}).click();await expect(page.getByLabel('E-mail',{exact:true})).toBeHidden();await page.getByLabel('Atendente',{exact:true}).selectOption('staff-test');await page.getByLabel('PIN individual',{exact:true}).fill('492716');await page.getByRole('button',{name:'Iniciar atendimento',exact:true}).click();await expect(page).toHaveURL(/funcionario\.html/);await expect(page.locator('#menu-admin a')).toHaveCount(6);expect(received).toEqual({employeeId:'staff-test',pin:'492716'});await expect(page.getByRole('button',{name:'Trocar atendente',exact:true})).toBeVisible();
});
