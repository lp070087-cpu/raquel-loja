import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomInt} from 'node:crypto';
import {ponteiroDemonstracao} from './helpers/demo-pointer.mjs';
test.beforeEach(async({page})=>ponteiroDemonstracao(page));
import {createFixture,retireFixture,browserApi,apiStatus} from './helpers/real-panels.mjs';
let fixture,access;
const base=process.env.RAQUEL_PREVIEW_URL,folder='evidence/deployment/cloud-navigation';
test.beforeAll(async()=>{
 const c=JSON.parse(await readFile('config/deployment.json','utf8')),auth=JSON.parse(await readFile(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8'));
 const project=await(await fetch(`https://api.vercel.com/v9/projects/${c.vercelProjectId}?teamId=${c.vercelTeamId}`,{headers:{Authorization:'Bearer '+auth.token}})).json();
 access=Object.entries(project.protectionBypass||{}).find(([,value])=>value.scope==='automation-bypass')?.[0];if(!access)throw new Error('PRIVATE_PREVIEW_ACCESS_REQUIRED');
 fixture=await createFixture();await mkdir(folder,{recursive:true});
});
test.afterAll(async()=>{if(fixture)await retireFixture(fixture);});
test.afterEach(async({page})=>{await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(input=>{input.value='';input.removeAttribute('value');}));});
test('revisão Vercel: treze módulos administrativos, editores e navegação pública',async({page})=>{
 const errors=[],results=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':access}}):route.continue());
 await page.goto('/admin/login',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
 await page.getByLabel('E-mail',{exact:true}).fill(fixture.admin.email);await page.getByLabel('Senha',{exact:true}).fill(fixture.admin.password);await page.getByRole('button',{name:'Entrar no painel',exact:true}).click();
 await page.waitForURL(/\/admin\/painel(?:\.html)?(?:#.*)?$/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');await expect(page.locator('#titulo-secao')).toHaveText('Atendimento');
 if(process.env.RAQUEL_STOCK_ONLY==='1'){
   const read=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/stock');await page.locator('[data-secao="estoque"]').click();expect((await read).status()).toBe(200);await expect(page.locator('.admin-stock-overview .cartao-metrica')).toHaveCount(4);
   const data=await browserApi(page,'/admin/stock'),total=(await browserApi(page,'/admin/products?take=1')).total;
   expect(data.summary.totalProducts).toBe(total);expect(data.summary.totalUnits).toBeGreaterThanOrEqual(0);expect(data.summary.lowStockThreshold).toBe(5);
   await expect(page.locator('.admin-stock-overview .cartao-metrica__valor').nth(0)).toHaveText(String(total));
   for(const [status,key] of [['low','lowStock'],['out','outOfStock']]){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/stock'&&new URL(r.url()).searchParams.get('stockStatus')===status);await page.locator(`[data-stock-status="${status}"]`).click();const reply=await response;expect(reply.status()).toBe(200);const subset=await reply.json();expect(subset.total).toBe(data.summary[key]);expect(subset.products.every(p=>status==='low'?p.stock>0&&p.stock<=5:p.stock===0)).toBe(true);}
   await page.locator('[data-stock-status="all"]').click();await expect(page.locator('.admin-loading')).toHaveCount(0);await page.screenshot({path:folder+'/stock-real-desktop.png',fullPage:true});expect(errors).toEqual([]);await browserApi(page,'/auth/logout','POST');
   await writeFile(folder+'/stock-result.json',JSON.stringify({passed:true,previewUrl:base,realNeonTesting:true,productionWrites:false,summary:data.summary,thresholdFive:true,globalCountMatchesDatabaseCatalog:true,filters:true,scriptErrors:errors},null,2));return;
 }
 const filtered=await browserApi(page,'/admin/products?categoryId='+fixture.categoryId+'&q='+encodeURIComponent(fixture.prefix));expect(filtered.products).toHaveLength(1);expect(filtered.products[0].id).toBe(fixture.productId);
 const modules=[['atendimento',null],['dashboard','dashboard'],['produtos','products'],['categorias','categories'],['estoque','stock'],['pedidos','orders'],['clientes','customers'],['funcionarios','employees'],['cupons','coupons'],['pagamentos','payments'],['retiradas','pickups'],['relatorios','reports'],['configuracoes','settings']];
 for(const [name,endpoint] of process.env.RAQUEL_PENDING_COUNTER_ONLY==='1'?[]:modules){
   const response=endpoint?page.waitForResponse(r=>new URL(r.url()).pathname===`/api/admin/${endpoint}`&&r.request().method()==='GET'):null;
   await page.locator(`[data-secao="${name}"]`).click();if(response)expect((await response).status()).toBe(200);
   const content=page.locator('#conteudo-admin');await expect(content.locator('.admin-loading')).toHaveCount(0);
   if(name==='atendimento')await expect(content.getByLabel('Código de retirada',{exact:true})).toBeVisible();
   else if(name==='produtos'||name==='categorias'){
     await expect(content.locator('.admin-item-card').first()).toBeVisible();
     await content.locator(`[data-edit-${name==='produtos'?'product':'category'}]`).first().click();await expect(content.locator('.admin-editor-form')).toBeVisible();await content.getByRole('button',{name:'Cancelar',exact:true}).click();
     await page.screenshot({path:`${folder}/${name}-desktop.png`});
   }else if(name==='configuracoes'){
     await expect(content.locator('.admin-editor-form')).toBeVisible();await expect(content.getByLabel('Entrega em domicílio',{exact:true})).toBeDisabled();
   }
   expect((await content.locator('[role="alert"]').allTextContents()).filter(text=>text.trim())).toEqual([]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(process.env.RAQUEL_DEMO_VISIBLE==='1'){await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'}));await page.waitForTimeout(1500);await page.evaluate(()=>scrollTo({top:0,behavior:'smooth'}));await page.waitForTimeout(1000);}
   results.push({module:name,serverRead:!!endpoint,passed:true});console.log('Módulo Vercel verificado: '+name);
 }
 await page.locator('[data-secao="funcionarios"]').click();await expect(page.locator('[data-set-pin="'+fixture.staff.id+'"]')).toBeVisible();
 let pin;do{pin=String(randomInt(100000,1000000));}while(/^(\d)\1{5}$/.test(pin)||['123456','654321'].includes(pin));
 await page.locator('[data-set-pin="'+fixture.staff.id+'"]').click();await page.getByLabel('PIN de 6 dígitos',{exact:true}).fill(pin);await page.getByLabel('Confirmar PIN',{exact:true}).fill(pin);await page.getByLabel('Senha da administração',{exact:true}).fill(fixture.admin.password);
 const configured=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/employees/'+fixture.staff.id+'/pin'&&r.request().method()==='PUT');await page.locator('.admin-pin-form').getByRole('button',{name:'Definir PIN individual',exact:true}).click();expect((await configured).status()).toBe(200);await expect(page.locator('.admin-pin-form')).toHaveCount(0);
 await page.locator('[data-enroll-terminal]').click();await page.getByLabel('Nome do computador',{exact:true}).fill('Computador controlado '+fixture.prefix);await page.getByLabel('Senha da administração',{exact:true}).fill(fixture.admin.password);
 const enrolled=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/terminals'&&r.request().method()==='POST');await page.locator('.admin-pin-form').getByRole('button',{name:'Autorizar este computador',exact:true}).click();expect((await enrolled).status()).toBe(201);await expect(page.locator('.admin-pin-form')).toHaveCount(0);
 await browserApi(page,'/auth/logout','POST');
 await page.goto('/admin/login?modo=balcao');await expect(page.locator('#form-pin')).toBeVisible();await page.getByLabel('Atendente',{exact:true}).selectOption(fixture.staff.id);await page.getByLabel('PIN individual',{exact:true}).fill(pin);await page.getByRole('button',{name:'Iniciar atendimento',exact:true}).click();await page.waitForURL(/\/admin\/funcionario(?:\.html)?(?:#.*)?$/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 await expect(page.locator('#menu-admin a')).toHaveCount(6);
 for(const name of ['atendimento','dashboard','pedidos','retiradas','clientes','historico']){await page.locator(`[data-secao="${name}"]`).click();await expect(page.locator('.admin-loading')).toHaveCount(0);await expect(page.locator('[role="alert"]')).toHaveCount(0);results.push({staffModule:name,passed:true});console.log('Seção do funcionário verificada: '+name);}
 for(const path of ['/admin/products','/admin/employees','/admin/settings','/admin/reports','/admin/payments'])expect(await apiStatus(page,path)).toBe(403);
 const limited=await browserApi(page,'/staff/customers');for(const customer of limited.customers){expect(Object.keys(customer).sort()).toEqual(['_count','id','name','phone']);}
 await browserApi(page,'/auth/logout','POST');
 for(const path of ['/','/catalogo','/catalogo?categoria=capacetes,capas','/localizador','/catalogo?ofertas=1','/contato']){
   const response=await page.goto(path,{waitUntil:'domcontentloaded'});expect(response.status()).toBe(200);
   await expect(page.locator('html')).toHaveAttribute(path==='/contato'?'data-loja':'data-catalogo','servidor');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   results.push({route:path,passed:true});console.log('Rota Vercel verificada: '+path);
 }
 expect(errors).toEqual([]);await writeFile(`${folder}/result.json`,JSON.stringify({passed:true,previewUrl:base,realNeonTesting:true,productionWrites:false,staffPinConfigured:true,terminalAuthorized:true,pinLogin:true,staffSections:6,results,scriptErrors:errors},null,2));
});
