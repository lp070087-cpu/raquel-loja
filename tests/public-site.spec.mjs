import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {spawn,fork} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,stat} from 'node:fs/promises';
const backend=fileURLToPath(new URL('../backend/',import.meta.url));
let runtime;
const stage=process.env.PUBLIC_STAGE==='before'?'before':'after';
const folder=`evidence/public-site/${stage}`;
async function noOverflow(page,label){
 const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('main *,header *,footer *')].filter(el=>{if(el.getBoundingClientRect().right<=innerWidth+1)return false;for(let p=el.parentElement;p;p=p.parentElement){if(['hidden','clip'].includes(getComputedStyle(p).overflowX)&&p.getBoundingClientRect().right<=innerWidth+1)return false;}return true;}).slice(0,25).map(el=>({tag:el.tagName,class:el.className,id:el.id,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width}))}));
 if(state.scrollWidth>state.width){await writeFile(`${folder}/overflow-${label}.json`,JSON.stringify(state,null,2));await page.screenshot({path:`${folder}/overflow-${label}.png`,fullPage:true});}
 expect(state.scrollWidth,label).toBeLessThanOrEqual(state.width);
}
test.beforeAll(async()=>{
 await mkdir(folder,{recursive:true});
 for(const path of ['src/admin','src/app','scripts/testing-runtime','scripts/counter-browser-fixture'])if((await stat(backend+'dist/'+path+'.js')).mtimeMs<(await stat(backend+path+'.ts')).mtimeMs)throw new Error('Build the backend before public browser tests.');
 runtime=spawn(process.execPath,['dist/scripts/testing-runtime.js'],{cwd:backend,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Testing API startup timed out; sensitive output suppressed.')),60000);runtime.stdout.on('data',d=>{if(String(d).includes('Real Fastify API connected exclusively')){clearTimeout(timer);resolve();}});runtime.stderr.on('data',()=>{});runtime.once('exit',()=>{clearTimeout(timer);reject(new Error('Testing API exited.'));});});
});
test.afterAll(async()=>{if(runtime&&runtime.exitCode===null)await new Promise(resolve=>{runtime.once('exit',resolve);runtime.kill();});});
test('banner e categorias nas sete larguras',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.name+': '+e.message));
 await page.goto('/index.html',{waitUntil:'commit'});
 await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');
 await expect(page.locator('.categoria-card').first()).toBeVisible();
 const measurements=[];
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:950});
  await page.locator('#secao-categorias').scrollIntoViewIfNeeded();
  await page.locator('#grade-categorias img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.categoria-card')].map(c=>{const r=c.getBoundingClientRect(),img=c.querySelector('img'),m=c.querySelector('.categoria-card__midia').getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,mediaHeight:m.height,loaded:img?img.complete&&img.naturalWidth>0:null,placeholder:!!c.querySelector('.foto-vazia'),fit:img?getComputedStyle(img).objectFit:null};})}));
  measurements.push({width,...geometry});
  if(geometry.overflow)measurements.at(-1).overflowElements=await page.evaluate(()=>[...document.querySelectorAll('main *,header *,footer *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,30).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})));
  await writeFile(`${folder}/layout.json`,JSON.stringify({stage,measurements,scriptErrors:errors},null,2));
  await page.locator('#secao-categorias').screenshot({path:`${folder}/categorias-${width}.png`});
  await page.locator('#hero').screenshot({path:`${folder}/banner-${width}.png`});
  if(stage==='after'){
   await expect(page.locator('#titulo-hero')).toHaveText('Sua moto pronta para qualquer caminho.');
   expect(await page.locator('#titulo-hero .destaque').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
   const frame=await page.locator('.palco__palco').boundingBox(),info=await page.locator('.palco__info').boundingBox();
   expect(Math.abs(frame.width-frame.height)).toBeLessThan(2);expect(info.y).toBeGreaterThanOrEqual(frame.y+frame.height);
   expect(geometry.overflow).toBe(false);
   expect(geometry.cards.every(c=>c.placeholder||(c.loaded&&c.fit==='contain'))).toBe(true);
   expect(Math.max(...geometry.cards.map(c=>c.height))-Math.min(...geometry.cards.map(c=>c.height))).toBeLessThan(2);
   expect(geometry.cards.every(c=>c.height<280&&c.mediaHeight>70)).toBe(true);
   expect(geometry.cards.filter(c=>Math.abs(c.top-geometry.cards[0].top)<2).length).toBe(width>=1024?4:2);
  }
 }
 await writeFile(`${folder}/layout.json`,JSON.stringify({stage,measurements,scriptErrors:errors},null,2));
 expect(errors).toEqual([]);
 if(stage==='after'){
  const points=page.locator('.palco__ponto');
  for(let i=0;i<await points.count();i++){
   await points.nth(i).click();await expect(points.nth(i)).toHaveAttribute('aria-current','true');
   const active=page.locator('.palco__item--ativo');await expect(active).toHaveAttribute('aria-hidden','false');
   expect(await active.locator('img').evaluate(async img=>{await img.decode();return img.naturalWidth>0&&getComputedStyle(img).objectFit==='contain';})).toBe(true);
   expect(await page.locator('[data-palco-etiqueta]').getAttribute('href')).toContain(await active.getAttribute('data-produto'));
  }
 }
});

test('navegação pública até pedido real e conta do cliente',async({page,request})=>{
 test.skip(stage==='before','Baseline visual only.');
 test.setTimeout(300000);
 const fixture=await new Promise((resolve,reject)=>{
  const child=fork('dist/scripts/counter-browser-fixture.js',['--catalog'],{cwd:backend,execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
  const timer=setTimeout(()=>{child.kill();reject(new Error('Controlled catalog fixture timed out.'));},60000);
  child.once('message',data=>{clearTimeout(timer);data.error?reject(new Error('Controlled catalog fixture failed.')):resolve(data);});
 });
 const errors=[],badResponses=[];
 page.on('pageerror',e=>errors.push(e.name));
 page.on('response',r=>{const u=new URL(r.url());if(['127.0.0.1','localhost'].includes(u.hostname)&&r.status()>=400&&!(r.status()===401&&u.pathname==='/api/auth/me'))badResponses.push({path:u.pathname,status:r.status()});});
 await page.setViewportSize({width:1440,height:950});
 await page.goto('/index.html',{waitUntil:'commit'});
 const expectedCategories=(await(await request.get('http://127.0.0.1:3001/api/categories')).json()).categories.length;
 await expect(page.locator('.categoria-card')).toHaveCount(expectedCategories);
 const links=await page.locator('header a[href],footer a[href],.categoria-card').evaluateAll(els=>[...new Set(els.map(el=>el.href).filter(url=>url.startsWith(location.origin)))]);
 for(const link of links)expect((await request.get(link)).status(),new URL(link).pathname).toBe(200);
 await page.locator('.categoria-card[href="catalogo.html?categoria=oleos"]').click({noWaitAfter:true});
 await expect(page).toHaveURL(/categoria=oleos/);await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');
 await expect(page.locator(`[data-produto-card="${fixture.productId}"]`)).toBeVisible();
 await page.getByRole('button',{name:'Buscar peças',exact:true}).click();
 await page.locator('#busca-input').fill('universal');await page.locator('[data-form-busca] button').click({noWaitAfter:true});
 await expect(page).toHaveURL(/busca=universal/);await expect(page.locator('.produto-card').first()).toBeVisible();
 expect(await page.evaluate(async()=>{const {PRODUTOS,ehUniversal}=await import('/assets/js/dados.js');return [...document.querySelectorAll('[data-produto-card]')].every(el=>ehUniversal(PRODUTOS.find(p=>p.id===el.dataset.produtoCard)));})).toBe(true);
 await page.locator('header .nav a[href="localizador.html"]').click({noWaitAfter:true});
 await page.locator('#moto-marca').selectOption('Honda');await page.locator('#moto-modelo').selectOption('CG 160');await page.locator('#moto-versao').selectOption('Fan');await page.locator('#moto-ano').selectOption('2020');
 await page.locator('#form-moto button[type="submit"]').click({noWaitAfter:true});
 await expect(page).toHaveURL(/moto=1/);await expect(page.locator('.produto-card').first()).toBeVisible();
 await page.locator('[data-filtro="compat"][value="especifica"]').check();
 await expect(page.locator('[data-produto-card="disco-freio-xre300"]')).toHaveCount(0);
 expect(await page.evaluate(async()=>{const {PRODUTOS,produtoServeEm}=await import('/assets/js/dados.js');const {moto}=await import('/assets/js/carrinho.js');const cards=[...document.querySelectorAll('[data-produto-card]')];return cards.length>0&&cards.every(el=>produtoServeEm(PRODUTOS.find(p=>p.id===el.dataset.produtoCard),moto.ler()));})).toBe(true);
 await page.locator('[data-filtro="compat"][value=""]').check();
 await page.locator(`[data-produto-card="${fixture.productId}"] a`).first().click({noWaitAfter:true});
 await expect(page.locator('#btn-adicionar')).toBeVisible();
 await page.locator(`[data-favoritar="${fixture.productId}"]`).click();await page.locator('#btn-adicionar').click();
 await page.goto('/carrinho.html',{waitUntil:'commit'});await expect(page.locator('.item-carrinho')).toHaveCount(1);
 await page.getByRole('link',{name:'Finalizar pedido',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(/conta.html\?next=checkout.html/);
 const name='Cliente Site Publico',email='public-site-'+randomUUID()+'@example.test',password=randomBytes(24).toString('base64url');
 await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();
 for(const [label,value] of [['Nome completo',name],['E-mail',email],['Telefone','81999999999'],['Senha',password]])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'Criar conta',exact:true}).click({noWaitAfter:true});
 await expect(page).toHaveURL(/checkout.html/);await expect(page.locator('#nome')).toHaveValue(name);
 await expect(page.locator('#checkout-container')).toContainText('Pagamento realizado na retirada');
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:950});await noOverflow(page,'checkout-'+width);
  await page.screenshot({path:`${folder}/checkout-${width}.png`,fullPage:true});
 }
 await page.locator('#btn-finalizar').click({noWaitAfter:true});await expect(page).toHaveURL(/pedido.html\?id=/);
 console.log('Public journey: anonymous cart, registration and real pickup order validated.');
 await expect(page.locator('#codigo-valor')).toHaveText(/^\d{5}$/);const code=await page.locator('#codigo-valor').innerText();
 await expect(page.locator('#pedido-container')).toContainText('pendente');
 await page.setViewportSize({width:390,height:950});await page.screenshot({path:`${folder}/pedido-390.png`,fullPage:true});
 await page.locator('header a[aria-label="Minha conta"]').click({noWaitAfter:true});
 await page.getByRole('button',{name:'Meus pedidos',exact:true}).click();await page.getByRole('button',{name:'Ver detalhes',exact:true}).click();
 await expect(page.getByText('Código de retirada: '+code,{exact:true})).toBeVisible();
 await page.screenshot({path:`${folder}/meus-pedidos-390.png`,fullPage:true});
 await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:'Visão geral',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Olá, '+name+'!'})).toBeVisible();
 await page.setViewportSize({width:375,height:950});
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(page.locator('#menu-mobile')).toHaveAttribute('data-aberto','true');
 await page.locator('#menu-mobile a[href="contato.html"]').click({noWaitAfter:true});await expect(page).toHaveURL(/contato.html/);await expect(page.locator('#menu-mobile')).toHaveAttribute('data-aberto','false');
 await expect(page.locator('main')).toContainText('WhatsApp');
 await page.screenshot({path:`${folder}/contato-375.png`,fullPage:true});
 await page.goto('/catalogo.html?moto=1',{waitUntil:'commit'});await expect(page.locator('[data-abrir-filtros]')).toBeVisible();
 await expect(page.locator('.produto-card').first()).toBeVisible();
 await page.locator('[data-abrir-filtros]').click();await expect(page.locator('[data-abrir-filtros]')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#filtro-moto a[href="localizador.html"]')).toBeVisible();
 await page.locator('[data-fechar-filtros]').click();await expect(page.locator('[data-abrir-filtros]')).toHaveAttribute('aria-expanded','false');
 for(const route of ['/catalogo.html','/produto.html?id='+fixture.productId,'/carrinho.html','/localizador.html','/contato.html']){
  await page.goto(route,{waitUntil:'commit'});if(!route.startsWith('/localizador')&&!route.startsWith('/contato'))await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');await expect(page.locator('main')).not.toBeEmpty();
  if(route.startsWith('/catalogo'))await expect(page.locator('.produto-card').first()).toBeVisible();
  if(route.startsWith('/produto'))await expect(page.locator('#btn-adicionar')).toBeVisible();
  if(route.startsWith('/carrinho'))await expect(page.getByRole('heading',{name:'Seu carrinho está vazio',exact:true})).toBeVisible();
  if(route.startsWith('/localizador'))await expect(page.locator('#moto-marca')).toBeVisible();
  if(route.startsWith('/contato'))await expect(page.locator('#contato-container')).not.toBeEmpty();
  for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});await noOverflow(page,route.split('?')[0].slice(1)+'-'+width);if([390,1440].includes(width))await page.screenshot({path:`${folder}/${route.split('?')[0].slice(1)}-${width}.png`,fullPage:true});}
 }
 expect(errors).toEqual([]);expect(badResponses).toEqual([]);
 await writeFile(`${folder}/journey.json`,JSON.stringify({realFastify:true,neonTesting:true,categoryLinks:expectedCategories,internalLinksChecked:links.length,search:true,motorcycleCompatibility:true,guestCartMerged:true,registration:true,login:true,favorite:true,checkout:true,paymentPending:true,pickupCodeFiveDigits:true,customerOrders:true,mobileMenu:true,mobileFilters:true,responsiveWidths:[320,375,390,430,768,1024,1440],scriptErrors:errors,unexpectedHttpResponses:badResponses,productionWrites:false},null,2));
});

test('imagens reais do catálogo disponíveis por HTTP',async({request})=>{
 test.skip(stage==='before','Baseline visual only.');
 const response=await request.get('http://127.0.0.1:3001/api/products');expect(response.status()).toBe(200);
 const products=(await response.json()).products;
 const urls=[...new Set(products.flatMap(p=>(p.images||[]).map(i=>i.imageUrl)))];
 expect(urls.length).toBeGreaterThan(0);
 for(const path of urls){const url=new URL(path,'http://127.0.0.1:8000/');if(url.origin!=='http://127.0.0.1:8000')continue;const image=await request.get(url.href);expect(image.status(),url.pathname).toBe(200);expect(image.headers()['content-type']).toMatch(/^image\//);}
 await writeFile(`${folder}/images.json`,JSON.stringify({products:products.length,uniqueImages:urls.length,failed:0},null,2));
});

test('carrossel automático preserva preferência por movimento reduzido',async({page})=>{
 test.skip(stage==='before','Baseline visual only.');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/index.html',{waitUntil:'commit'});await expect(page.locator('.palco__item--ativo')).toBeVisible();
 const first=await page.locator('.palco__item--ativo').getAttribute('data-indice');
 await expect.poll(()=>page.locator('.palco__item--ativo').getAttribute('data-indice'),{timeout:12000}).not.toBe(first);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'commit'});
 await expect(page.locator('.palco__item--ativo')).toBeVisible();
 const reduced=await page.locator('.palco__item--ativo').getAttribute('data-indice');
 await page.waitForTimeout(5000);
 expect(await page.locator('.palco__item--ativo').getAttribute('data-indice')).toBe(reduced);
 await writeFile(`${folder}/carousel.json`,JSON.stringify({automaticRotation:true,reducedMotionStopsRotation:true},null,2));
});
