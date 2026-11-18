import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {ponteiroDemonstracao} from './helpers/demo-pointer.mjs';
const network=new WeakMap();
test.beforeEach(async({page})=>{
 await ponteiroDemonstracao(page);const events=[];network.set(page,events);
 page.on('response',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/'))events.push({path:url.pathname,status:r.status()});});
 page.on('requestfailed',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/'))events.push({path:url.pathname,error:r.failure()?.errorText});});
});
import {createFixture,retireFixture,browserApi,apiStatus,section,password,submit} from './helpers/real-panels.mjs';
const base=process.env.RAQUEL_PREVIEW_URL,visibleDemo=process.env.RAQUEL_DEMO_VISIBLE==='1',folder=visibleDemo?'evidence/deployment/cloud-desktop':'evidence/deployment/cloud';let fixture,access;
async function demonstrate(page,label){
 if(process.env.RAQUEL_DEMO_VISIBLE!=='1')return;
 console.log('Demonstração testing: '+label);
 await page.waitForTimeout(8000);
}
test.beforeAll(async()=>{
 const c=JSON.parse(await readFile('config/deployment.json','utf8')),a=JSON.parse(await readFile(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8'));
 const project=await(await fetch('https://api.vercel.com/v9/projects/'+c.vercelProjectId+'?teamId='+c.vercelTeamId,{headers:{Authorization:'Bearer '+a.token}})).json();
 access=Object.entries(project.protectionBypass||{}).find(([,value])=>value.scope==='automation-bypass')?.[0];if(!access)throw new Error('PRIVATE_PREVIEW_ACCESS_REQUIRED');
 fixture=await createFixture();await mkdir(folder,{recursive:true});
});

for(const [round,method] of [[1,'PIX'],[2,'CARD']])test(`rodada adicional ${round}: busca, favoritos, quantidades, remoção e retirada ${method}`,async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':access}}):route.continue());
 await page.goto('/conta',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();
 const email=`${fixture.prefix}-round-${round}@example.test`,secret=fixture.customer.password;
 for(const [label,value] of [['Nome completo',`Cliente Rodada ${round} Teste`],['E-mail',email],['Telefone','11900000000'],['Senha',secret]])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(page.locator('.conta-nav')).toBeVisible();
 const catalog=(await browserApi(page,'/products')).products;
 const choices=catalog.filter(p=>p.id.startsWith('oleo-')&&p.stock>=5).slice((round-1)*2,(round-1)*2+2);expect(choices).toHaveLength(2);
 const [first,second]=choices;
 await page.goto('/catalogo',{waitUntil:'domcontentloaded'});
 await page.locator('[data-abrir-busca]').click();await page.locator('#busca-input').fill(first.name);await page.locator('#busca-input').press('Enter');
 await expect(page).toHaveURL(/busca=/);
 await page.locator('.produto-card').filter({hasText:first.name}).locator('.produto-card__nome a').click();
 await expect(page.locator('#btn-adicionar')).toBeVisible();
 const favorited=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/favorites/'+first.id&&r.request().method()==='POST');
 await page.locator('[data-favoritar]').filter({has:page.locator('[data-rotulo-favorito]')}).click();expect((await favorited).status()).toBe(200);
 expect((await browserApi(page,'/favorites')).products.some(p=>p.id===first.id)).toBe(true);
 await page.locator('#qtd').fill('2');
 const add=async id=>{const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/cart/items/'+id&&r.request().method()==='PUT');await page.locator('#btn-adicionar').click();expect((await response).status()).toBe(200);};
 await add(first.id);await page.goto('/produto?id='+second.id,{waitUntil:'domcontentloaded'});await add(second.id);
 await page.goto('/carrinho',{waitUntil:'domcontentloaded'});await expect(page.locator('.item-carrinho')).toHaveCount(2);
 const row=id=>page.locator(`[data-item="${id}"]`);
 for(const [selector,quantity] of [['[data-mais]',3],['[data-menos]',2]]){
   const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/cart/items/'+first.id&&r.request().method()==='PUT');
   await row(first.id).locator(selector).click();expect((await response).status()).toBe(200);await expect(row(first.id).locator('[data-qtd]')).toHaveValue(String(quantity));
 }
 const removed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/cart/items/'+second.id&&r.request().method()==='PUT'&&r.request().postDataJSON()?.quantity===0);
 await row(second.id).locator('[data-remover]').click();expect((await removed).status()).toBe(200);await expect(page.locator('.item-carrinho')).toHaveCount(1);
 const reloadedCart=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/cart'&&r.request().method()==='GET');await page.reload();expect((await reloadedCart).status()).toBe(200);await expect(row(first.id).locator('[data-qtd]')).toHaveValue('2');
 await page.goto('/produto?id='+second.id,{waitUntil:'domcontentloaded'});await add(second.id);
 await page.goto('/carrinho',{waitUntil:'domcontentloaded'});await expect(page.locator('.item-carrinho')).toHaveCount(2);
 await page.locator('#campo-cupom').fill('INVALIDO-RODADA-'+round);await page.locator('#form-cupom button').click();await expect(page.locator('#caixa-avisos')).toContainText(/cupom|válido|disponível/i);
 const savedCart=await browserApi(page,'/cart');expect(savedCart.items.find(i=>i.productId===first.id).quantity).toBe(2);expect(savedCart.items.find(i=>i.productId===second.id).quantity).toBe(1);
 await demonstrate(page,`rodada ${round} — dois produtos, quantidade alterada, item removido e recolocado`);
 await page.getByRole('link',{name:'Finalizar pedido',exact:true}).click();await expect(page.locator('#btn-finalizar')).toBeVisible();
 await expect(page.locator('[name="tipo"][value="entrega"]')).toBeDisabled();
 await page.locator('#btn-finalizar').click();await expect(page).toHaveURL(/\/pedido(?:\.html)?\?id=/);
 const {order}=await browserApi(page,'/orders/'+new URL(page.url()).searchParams.get('id'));
 expect(order.paymentStatus).toBe('PENDING');expect(order.items).toHaveLength(2);expect(order.totalCents).toBe(first.priceCents*2+second.priceCents);expect(order.pickupCode).toMatch(/^\d{5}$/);
 await page.screenshot({path:`${folder}/round-${round}-customer-order.png`});await demonstrate(page,`rodada ${round} — novo pedido e código independente`);
 await browserApi(page,'/auth/logout','POST');await loginEmployee(page,fixture.staff,'STAFF');
 await expect(page.locator('#titulo-secao')).toHaveText('Atendimento');
 await page.getByLabel('Código de retirada',{exact:true}).fill(order.pickupCode);await page.getByRole('button',{name:'Consultar pedido',exact:true}).click();await expect(page.locator('#atendimento-resultado')).toContainText(order.orderNumber);
 await expect(page.locator('#atendimento-resultado')).toContainText(first.name);await expect(page.locator('#atendimento-resultado')).toContainText(second.name);
 await page.getByLabel('Método recebido no balcão').selectOption(method);await demonstrate(page,`rodada ${round} — atendimento pelo código, método ${method}`);
 await page.locator('[data-confirm-delivery]').check();await submit(page,'/staff/orders/'+order.id+'/complete','POST','Receber e entregar');
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/pickup','POST',{code:order.pickupCode})).toBe(409);
 await browserApi(page,'/auth/logout','POST');await page.goto('/conta',{waitUntil:'domcontentloaded'});
 await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(secret);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.locator('.conta-nav [data-section="orders"]').click();await expect(page.locator('.conta-panel')).toContainText(order.orderNumber);
 const final=(await browserApi(page,'/orders/'+order.id)).order;expect(final.status).toBe('COMPLETED');expect(final.paymentStatus).toBe('PAID');expect(final.paymentMethod).toBe(method);expect(final.pickupCode).toBeNull();expect(errors).toEqual([]);
 await page.screenshot({path:`${folder}/round-${round}-customer-completed.png`});await demonstrate(page,`rodada ${round} — cliente vê pedido concluído`);
 await browserApi(page,'/auth/logout','POST');
 await writeFile(`${folder}/round-${round}-result.json`,JSON.stringify({passed:true,realNeonTesting:true,previewUrl:base,method,search:true,favorites:true,multipleItems:true,increasedAndDecreased:true,removedAndReadded:true,cartPersistedAfterReload:true,invalidCoupon:true,serverTotal:true,codeOnlyLookup:true,pickup:true,duplicatePickupDenied:true,customerUpdated:true,productionWrites:false,scriptErrors:errors},null,2));
});
test.afterAll(async()=>{if(fixture)await retireFixture(fixture);});
test.afterEach(async({page},info)=>{await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(input=>{input.value='';input.removeAttribute('value');}));if(info.status!==info.expectedStatus){await mkdir(folder,{recursive:true});await writeFile(folder+'/network-failure-'+Date.now()+'.json',JSON.stringify({test:info.title,requests:network.get(page)||[]},null,2));}});
async function loginEmployee(page,user,role){
 await page.goto('/admin/login',{waitUntil:'domcontentloaded'});await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
 await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Entrar no painel',exact:true}).click({noWaitAfter:true});
 await expect(page).toHaveURL(role==='ADMIN'?/\/admin\/painel(?:\.html)?$/:/\/admin\/funcionario(?:\.html)?$/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
}
test('Vercel + Neon testing: cadastro, compra, pagamento e retirada reais',async({page,context})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.name));
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':access}}):route.continue());
 if(!visibleDemo)await page.setViewportSize({width:390,height:950});await page.goto('/conta',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();const email=fixture.prefix+'-cloud@example.test',secret=fixture.customer.password;
 for(const [label,value]of [['Nome completo','Cliente Cloud Teste'],['E-mail',email],['Telefone','11900000000'],['Senha',secret]])await page.getByLabel(label,{exact:true}).fill(value);
 const registered=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/register'&&r.request().method()==='POST');await page.getByRole('button',{name:'Criar conta',exact:true}).click();expect((await registered).status()).toBe(201);await expect(page.locator('.conta-nav')).toBeVisible();
 expect((await context.cookies(base+'/api/')).some(c=>/session/i.test(c.name)&&c.httpOnly&&c.secure)).toBe(true);
 for(const name of ['overview','profile','addresses','motorcycles','favorites','orders','security']){
   await page.locator(`.conta-nav [data-section="${name}"]`).click();await expect(page.locator('[data-body] .conta-skeleton')).toHaveCount(0);await expect(page.locator('[data-message][data-error="true"]')).toHaveCount(0);
   if(visibleDemo){await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'}));await page.waitForTimeout(1000);}
   console.log('Seção do cliente verificada: '+name);
 }
 await demonstrate(page,'1 — conta do cliente criada');
 await page.goto('/produto?id='+fixture.productId,{waitUntil:'domcontentloaded'});await expect(page.locator('#btn-adicionar')).toBeVisible();
 const added=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/cart/items/'+fixture.productId&&r.request().method()==='PUT');await page.locator('#btn-adicionar').click();expect((await added).status()).toBe(200);
 await page.goto('/carrinho',{waitUntil:'domcontentloaded'});await expect(page.locator('.item-carrinho')).toHaveCount(1);await page.getByRole('link',{name:'Finalizar pedido',exact:true}).click({noWaitAfter:true});await expect(page).toHaveURL(/\/checkout(?:\.html)?$/);await expect(page.locator('#checkout-container')).toContainText('Pagamento realizado na retirada');
 await expect(page.locator('[name="tipo"][value="entrega"]')).toBeDisabled();
 await demonstrate(page,'2 — checkout: somente retirada e pagamento no balcão');
 const placed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/orders'&&r.request().method()==='POST');await page.locator('#btn-finalizar').click({noWaitAfter:true});const response=await placed;expect(response.status()).toBe(201);await expect(page).toHaveURL(/\/pedido(?:\.html)?\?id=/);await expect(page.locator('.codigo-retirada')).toBeVisible();const {order}=await browserApi(page,'/orders/'+new URL(page.url()).searchParams.get('id'));expect(order.paymentStatus).toBe('PENDING');expect(order.pickupCode).toMatch(/^\d{5}$/);await expect(page.locator('body')).toContainText(order.pickupCode);await page.screenshot({path:folder+'/customer-order-390.png'});
 await demonstrate(page,'3 — pedido confirmado: código de retirada e pagamento pendente');
 await browserApi(page,'/auth/logout','POST');await loginEmployee(page,fixture.admin,'ADMIN');if(!visibleDemo)await page.setViewportSize({width:1440,height:950});
 expect((await browserApi(page,'/admin/orders?q='+encodeURIComponent(fixture.prefix)+'&status=PENDING')).orders.some(o=>o.id===order.id)).toBe(true);
 expect((await browserApi(page,'/admin/orders?q='+encodeURIComponent('Cliente Cloud Teste'))).orders.some(o=>o.id===order.id)).toBe(true);
 for(const name of ['Confirmar preparação','Marcar pronto para retirada']){await section(page,'pedidos');await page.locator(`[data-order="${order.id}"]`).click();await page.getByRole('button',{name,exact:true}).click();await password(page,fixture.admin.password);await submit(page,'/admin/orders/'+order.id+'/status');}
 await browserApi(page,'/auth/logout','POST');await loginEmployee(page,fixture.staff,'STAFF');if(!visibleDemo)await page.setViewportSize({width:390,height:950});
 expect(await apiStatus(page,'/admin/products')).toBe(403);expect(await apiStatus(page,'/orders/'+order.id)).toBe(404);
 await section(page,'atendimento');await page.getByLabel('Código de retirada',{exact:true}).fill(order.pickupCode);await page.getByRole('button',{name:'Consultar pedido',exact:true}).click();await expect(page.locator('#atendimento-resultado')).toContainText(order.orderNumber);
 await expect(page.locator('#atendimento-pedido')).toHaveCount(0);
 await demonstrate(page,'4 — atendente consulta somente pelo código e confere os produtos');
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/pickup','POST',{code:order.pickupCode})).toBe(409);
 page.on('dialog',dialog=>dialog.accept());await page.getByLabel('Método recebido no balcão').selectOption('CASH');await page.locator('[data-confirm-delivery]').check();await submit(page,'/staff/orders/'+order.id+'/complete','POST','Receber e entregar');
 await demonstrate(page,'5 — pagamento e retirada registrados em um botão, somente em testing');
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/payment','POST',{code:order.pickupCode,method:'CASH'})).toBe(409);
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/pickup','POST',{code:order.pickupCode})).toBe(409);await expect(page.getByLabel('Código de retirada',{exact:true})).toHaveValue('');await page.screenshot({path:folder+'/staff-completed-390.png'});
 await browserApi(page,'/auth/logout','POST');await page.goto('/conta',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(secret);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.conta-nav [data-section="orders"]').click();await expect(page.locator('.conta-panel')).toContainText(order.orderNumber);
 const saved=(await browserApi(page,'/orders/'+order.id)).order;expect(saved.status).toBe('COMPLETED');expect(saved.paymentStatus).toBe('PAID');expect(saved.pickupCode).toBeNull();expect(errors).toEqual([]);await page.screenshot({path:folder+'/customer-updated-390.png'});
 await demonstrate(page,'6 — cliente visualiza pedido retirado e pagamento confirmado');
 const sessions=(await browserApi(page,'/sessions')).sessions;for(const session of sessions.filter(s=>!s.current))await browserApi(page,'/sessions/'+session.id,'DELETE');await browserApi(page,'/auth/logout','POST');
 await writeFile(folder+'/result.json',JSON.stringify({passed:true,previewUrl:base,realNeonTesting:true,productionWrites:false,registration:true,secureSession:true,checkoutPending:true,fiveDigitCode:true,staffRestricted:true,customerIsolation:true,unpaidPickupDenied:true,paymentConfirmed:true,duplicatePaymentDenied:true,pickupConfirmed:true,duplicatePickupDenied:true,customerUpdated:true,scriptErrors:errors},null,2));
});
