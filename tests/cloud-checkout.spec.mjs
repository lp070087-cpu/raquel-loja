import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createFixture,retireFixture,browserApi,apiStatus,section,password,submit} from './helpers/real-panels.mjs';
const base=process.env.RAQUEL_PREVIEW_URL,folder='evidence/deployment/cloud';let fixture,access;
test.beforeAll(async()=>{
 const c=JSON.parse(await readFile('config/deployment.json','utf8')),a=JSON.parse(await readFile(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8'));
 const project=await(await fetch('https://api.vercel.com/v9/projects/'+c.vercelProjectId+'?teamId='+c.vercelTeamId,{headers:{Authorization:'Bearer '+a.token}})).json();
 access=Object.entries(project.protectionBypass||{}).find(([,value])=>value.scope==='automation-bypass')?.[0];if(!access)throw new Error('PRIVATE_PREVIEW_ACCESS_REQUIRED');
 fixture=await createFixture();await mkdir(folder,{recursive:true});
});
test.afterAll(async()=>{if(fixture)await retireFixture(fixture);});
test.afterEach(async({page})=>{await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(input=>{input.value='';input.removeAttribute('value');}));});
async function loginEmployee(page,user,role){
 await page.goto('/admin/login',{waitUntil:'domcontentloaded'});await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
 await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Entrar no painel',exact:true}).click({noWaitAfter:true});
 await expect(page).toHaveURL(role==='ADMIN'?/\/admin\/painel(?:\.html)?$/:/\/admin\/funcionario(?:\.html)?$/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
}
test('Vercel + Neon testing: cadastro, compra, pagamento e retirada reais no celular',async({page,context})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.name));
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':access}}):route.continue());
 await page.setViewportSize({width:390,height:950});await page.goto('/conta',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();const email=fixture.prefix+'-cloud@example.test',secret=fixture.customer.password;
 for(const [label,value]of [['Nome completo','Cliente Cloud Teste'],['E-mail',email],['Telefone','11900000000'],['Senha',secret]])await page.getByLabel(label,{exact:true}).fill(value);
 const registered=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/register'&&r.request().method()==='POST');await page.getByRole('button',{name:'Criar conta',exact:true}).click();expect((await registered).status()).toBe(201);await expect(page.locator('.conta-nav')).toBeVisible();
 expect((await context.cookies(base+'/api/')).some(c=>/session/i.test(c.name)&&c.httpOnly&&c.secure)).toBe(true);
 await page.goto('/produto?id='+fixture.productId,{waitUntil:'domcontentloaded'});await expect(page.locator('#btn-adicionar')).toBeVisible();
 const added=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/cart/items/'+fixture.productId&&r.request().method()==='PUT');await page.locator('#btn-adicionar').click();expect((await added).status()).toBe(200);
 await page.goto('/carrinho',{waitUntil:'domcontentloaded'});await expect(page.locator('.item-carrinho')).toHaveCount(1);await page.getByRole('link',{name:'Finalizar pedido',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(/\/checkout(?:\.html)?$/);await expect(page.locator('#checkout-container')).toContainText('Pagamento realizado na retirada');
 const placed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/orders'&&r.request().method()==='POST');await page.locator('#btn-finalizar').click({noWaitAfter:true});const response=await placed;expect(response.status()).toBe(201);await expect(page).toHaveURL(/\/pedido(?:\.html)?\?id=/);await expect(page.locator('.codigo-retirada')).toBeVisible();const {order}=await browserApi(page,'/orders/'+new URL(page.url()).searchParams.get('id'));expect(order.paymentStatus).toBe('PENDING');expect(order.pickupCode).toMatch(/^\d{5}$/);await expect(page.locator('body')).toContainText(order.pickupCode);await page.screenshot({path:folder+'/customer-order-390.png'});
 await browserApi(page,'/auth/logout','POST');await loginEmployee(page,fixture.admin,'ADMIN');await page.setViewportSize({width:1440,height:950});
 for(const name of ['Confirmar preparação','Marcar pronto para retirada']){await section(page,'pedidos');await page.locator(`[data-order="${order.id}"]`).click();await page.getByRole('button',{name,exact:true}).click();await password(page,fixture.admin.password);await submit(page,'/admin/orders/'+order.id+'/status');}
 await browserApi(page,'/auth/logout','POST');await loginEmployee(page,fixture.staff,'STAFF');await page.setViewportSize({width:390,height:950});
 expect(await apiStatus(page,'/admin/products')).toBe(403);expect(await apiStatus(page,'/orders/'+order.id)).toBe(404);
 await section(page,'atendimento');await page.getByLabel('Número ou identificação do pedido').fill(order.orderNumber);await page.getByLabel('Código de retirada',{exact:true}).fill(order.pickupCode);await page.getByRole('button',{name:'Consultar pedido',exact:true}).click();await expect(page.locator('#atendimento-resultado')).toContainText(order.orderNumber);
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/pickup','POST',{code:order.pickupCode})).toBe(409);
 page.on('dialog',dialog=>dialog.accept());await page.getByLabel('Método recebido no balcão').selectOption('CASH');await submit(page,'/staff/orders/'+order.id+'/payment','POST','Confirmar recebimento do pagamento');
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/payment','POST',{code:order.pickupCode,method:'CASH'})).toBe(409);
 await submit(page,'/staff/orders/'+order.id+'/pickup','POST','Confirmar entrega dos produtos');expect(await apiStatus(page,'/staff/orders/'+order.id+'/pickup','POST',{code:order.pickupCode})).toBe(409);await page.screenshot({path:folder+'/staff-completed-390.png'});
 await browserApi(page,'/auth/logout','POST');await page.goto('/conta',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(secret);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.conta-nav [data-section="orders"]').click();await expect(page.locator('.conta-panel')).toContainText(order.orderNumber);
 const saved=(await browserApi(page,'/orders/'+order.id)).order;expect(saved.status).toBe('COMPLETED');expect(saved.paymentStatus).toBe('PAID');expect(saved.pickupCode).toBeNull();expect(errors).toEqual([]);await page.screenshot({path:folder+'/customer-updated-390.png'});
 const sessions=(await browserApi(page,'/sessions')).sessions;for(const session of sessions.filter(s=>!s.current))await browserApi(page,'/sessions/'+session.id,'DELETE');await browserApi(page,'/auth/logout','POST');
 await writeFile(folder+'/result.json',JSON.stringify({passed:true,previewUrl:base,realNeonTesting:true,productionWrites:false,registration:true,secureSession:true,checkoutPending:true,fiveDigitCode:true,staffRestricted:true,customerIsolation:true,unpaidPickupDenied:true,paymentConfirmed:true,duplicatePaymentDenied:true,pickupConfirmed:true,duplicatePickupDenied:true,customerUpdated:true,scriptErrors:errors},null,2));
});
