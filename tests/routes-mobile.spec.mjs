import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {PRODUTOS} from '../assets/js/dados.js';
import {createFixture,retireFixture,browserApi} from './helpers/real-panels.mjs';
const folder='evidence/routes-mobile-2026-11-14',widths=[320,375,390,430,768,1024,1440];
let fixture;const results=[];
test.beforeAll(async()=>{await mkdir(folder,{recursive:true});});
test.afterAll(async()=>{try{if(fixture)await retireFixture(fixture);}finally{await writeFile(folder+'/results.json',JSON.stringify(results,null,2));}});
test.afterEach(async({page})=>{if(fixture)await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(input=>{input.value='';input.removeAttribute('value');}));});
async function geometry(page,label){
 const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,broken:[...document.querySelectorAll('main img')].filter(img=>img.complete&&img.naturalWidth===0).map(img=>new URL(img.src).pathname)}));
 results.push({label,...state});expect(state.scrollWidth,label).toBeLessThanOrEqual(state.width);expect(state.broken,label+' images').toEqual([]);
}
async function publicRoutes(page,request,paths){
 const errors=[];page.on('pageerror',e=>errors.push(e.name));

 const links=new Set();
 for(const path of paths){
  console.log('Verificando rota:',path.split('?')[0]);
  expect((await request.get(path)).status(),path).toBe(200);await page.goto(path,{waitUntil:'domcontentloaded'});await expect(page.locator('body')).not.toBeEmpty();
  if(path.startsWith('/pedido.html')){await expect(page).toHaveURL(/conta.html\?next=/);await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();}
  if(!path.startsWith('/admin'))await expect(page.locator('#cabecalho')).toBeVisible();
  else await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
  for(const href of await page.locator('a[href]').evaluateAll(els=>els.map(el=>el.href).filter(h=>h.startsWith(location.origin))))links.add(href);
  for(const width of widths){await page.setViewportSize({width,height:844});await geometry(page,path+' '+width);}
  await page.setViewportSize({width:390,height:844});
  if(!path.startsWith('/admin')){
   await page.locator('[data-abrir-menu]').click();await expect(page.locator('#menu-mobile')).toHaveAttribute('aria-hidden','false');
   const nav=page.locator('#menu-mobile .menu-mobile__links a');expect(await nav.count()).toBeGreaterThanOrEqual(7);
   const boxes=await nav.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height};}));
   expect(Math.max(...boxes.map(b=>b.x))-Math.min(...boxes.map(b=>b.x))).toBeLessThan(2);expect(boxes.every(b=>b.height>=40)).toBe(true);
   await page.locator('[data-fechar-menu]').click();await expect(page.locator('#menu-mobile')).toHaveAttribute('aria-hidden','true');
  }
  if(['/','/catalogo.html','/conta.html','/contato.html'].includes(path))await page.screenshot({path:folder+'/'+(path==='/'?'home':path.slice(1,-5))+'-390.png'});
 }
 for(const href of links)expect((await request.get(href)).status(),new URL(href).pathname).toBe(200);
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.locator('[data-abrir-menu]').click();await page.locator('#menu-mobile a[href="conta.html"]').click({noWaitAfter:true});await expect(page).toHaveURL(/conta/);await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();await expect(page.locator('#menu-mobile')).toHaveAttribute('aria-hidden','true');
 expect(errors).toEqual([]);results.push({publicRoutes:paths.length,internalLinks:links.size,menuPassed:true,errors});
}
const publicPaths=['/','/catalogo.html','/catalogo.html?ofertas=1','/catalogo.html?categoria=freios','/localizador.html','/contato.html','/carrinho.html','/conta.html','/produto.html?id='+PRODUTOS[0].id,'/produto.html?id=nao-existe','/pedido.html?id=nao-existe','/admin/login.html'];
for(let i=0;i<publicPaths.length;i+=4)test('rotas públicas grupo '+(i/4+1)+' — menus e sete larguras',async({page,request})=>publicRoutes(page,request,publicPaths.slice(i,i+4)));

test('menu completo da conta, checkout e pedido real no celular',async({page})=>{
 fixture=await createFixture();
 const errors=[];page.on('pageerror',e=>errors.push(e.name));await page.setViewportSize({width:390,height:844});await page.goto('/conta.html');
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();await page.getByLabel('E-mail',{exact:true}).fill(fixture.customer.email);await page.getByLabel('Senha',{exact:true}).fill(fixture.customer.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.locator('.conta-nav')).toBeVisible();
 for(const section of ['overview','profile','addresses','motorcycles','favorites','orders','security']){
  console.log('Verificando seção da conta:',section);
  await page.locator(`.conta-nav [data-section="${section}"]`).click();await expect(page.locator(`.conta-nav [data-section="${section}"]`)).toHaveAttribute('aria-current','page');await expect(page.locator('.conta-skeleton')).toHaveCount(0);
  for(const width of widths){await page.setViewportSize({width,height:844});await geometry(page,'account '+section+' '+width);}
  await page.setViewportSize({width:390,height:844});
  if(section==='overview')await page.screenshot({path:folder+'/account-'+section+'-390.png',mask:[page.locator('input[type="password"]')]});
 }
 await browserApi(page,'/cart/items/'+fixture.productId,'PUT',{quantity:1});await page.goto('/carrinho.html');await expect(page.locator('.item-carrinho')).toHaveCount(1);
 await page.getByRole('link',{name:'Finalizar pedido',exact:true}).click();await expect(page).toHaveURL(/checkout/);await expect(page.locator('#checkout-container')).toContainText('Pagamento realizado na retirada');
 for(const width of widths){await page.setViewportSize({width,height:844});await geometry(page,'checkout '+width);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:folder+'/checkout-390.png'});await page.locator('#btn-finalizar').click();await expect(page).toHaveURL(/pedido.html\?id=/);
 const id=new URL(page.url()).searchParams.get('id');const {order}=await browserApi(page,'/orders/'+id);expect(order.paymentStatus).toBe('PENDING');expect(order.pickupCode).toMatch(/^\d{5}$/);await expect(page.locator('body')).toContainText(order.pickupCode);await geometry(page,'order 390');await page.screenshot({path:folder+'/order-390.png'});
 await page.goto('/conta.html');await page.locator('.conta-nav [data-section="orders"]').click();await expect(page.locator('.conta-panel')).toContainText(order.orderNumber);expect(errors).toEqual([]);results.push({accountSections:7,realOrder:true,paymentPending:true,fiveDigitCode:true,errors});
});
