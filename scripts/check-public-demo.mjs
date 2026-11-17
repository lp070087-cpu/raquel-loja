import {chromium,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

// Public legacy site: isolated browser data only, never a real order or payment.
const base='https://raquel-loja-ew91.vercel.app';
const folder='evidence/public-demo-2026-11-16';
await mkdir(folder,{recursive:true});
const executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browser=await chromium.launch({headless:true,args:['--disable-gpu'],...(executablePath?{executablePath}:{channel:'chrome'})});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const blockedWrites=[],errors=[];
await context.route('**/*',route=>{
 if(['GET','HEAD','OPTIONS'].includes(route.request().method()))return route.continue();
 blockedWrites.push({method:route.request().method(),path:new URL(route.request().url()).pathname});return route.abort();
});
const page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(30000);
page.on('pageerror',error=>errors.push(error.name));
try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await expect(page.locator('.produto-card').first()).toBeVisible();
 const links=await page.locator('.produto-card a[href^="produto.html"]').evaluateAll(els=>[...new Set(els.map(el=>el.href))].slice(0,2));expect(links).toHaveLength(2);
 for(const link of links){await page.goto(link,{waitUntil:'domcontentloaded'});await page.locator('#btn-adicionar').click();}
 await page.goto(base+'/carrinho.html',{waitUntil:'domcontentloaded'});await expect(page.locator('.item-carrinho')).toHaveCount(2);
 await page.getByRole('link',{name:'Finalizar pedido',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(/\/checkout(?:\.html)?(?:[?#]|$)/);await expect(page.locator('#form-checkout')).toBeVisible();
 await page.locator('#nome').fill('X');await page.locator('#telefone').fill('123');await page.locator('#email').fill('invalido');await page.locator('#btn-finalizar').click();
 await expect(page.locator('[data-erro="nome"]')).toContainText('nome');await expect(page.locator('[data-erro="telefone"]')).toContainText('DDD');await expect(page.locator('[data-erro="email"]')).toContainText('e-mail');await expect(page).toHaveURL(/\/checkout(?:\.html)?(?:[?#]|$)/);
 await page.screenshot({path:folder+'/invalid-checkout-390.png'});
 await page.locator('#nome').fill('Cliente Teste Automacao');await page.locator('#telefone').fill('11900000000');await page.locator('#email').fill('qa-'+Date.now()+'@example.test');
 await page.locator('input[name="tipo"][value="retirada"]').check();await page.locator('#btn-finalizar').click({noWaitAfter:true});await expect(page).toHaveURL(/\/pedido(?:\.html)?(?:[?#]|$)/);
 await expect(page.locator('.confirmacao')).toBeVisible();
 const order=await page.evaluate(async()=>{const {pedidos}=await import('/assets/js/carrinho.js');return pedidos.porId(new URL(location.href).searchParams.get('id'));});
 expect(order).toBeTruthy();expect(order.codigoRetirada).toBeTruthy();
 await writeFile(folder+'/demo-order.json',JSON.stringify({demonstrationOnly:true,base,order},null,2));
 await page.locator('.codigo-retirada').screenshot({path:folder+'/demo-pickup-code.png'});
 await page.locator('.confirmacao').screenshot({path:folder+'/demo-order.png'});
 await page.goto(base+'/conta.html',{waitUntil:'domcontentloaded'});await expect(page.locator('body')).toContainText('não existe login');
 await page.screenshot({path:folder+'/demo-customer-account-390.png'});
 expect(errors).toEqual([]);
 const result={passed:true,demonstrationOnly:true,serverOrderCreated:false,realLoginAvailable:false,invalidInputsRejected:true,products:2,codeGenerated:true,codeLength:String(order.codigoRetirada).length,blockedWrites,scriptErrors:errors,nextStep:'Ask user for the code shown in demo-order.png before the separate demonstration counter step.'};
 await writeFile(folder+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){await page.screenshot({path:folder+'/failure.png'}).catch(()=>{});console.error('Public demonstration test failed: '+String(error.message).slice(0,900));process.exitCode=1;}
finally{await browser.close();}
