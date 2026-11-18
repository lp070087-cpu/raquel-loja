import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {randomUUID} from 'node:crypto';
import {createFixture,retireFixture,employeeLogin,section,password,submit,apiStatus,browserApi,evidence,screenshot} from './helpers/real-panels.mjs';
let fixture;
test.beforeAll(async()=>{fixture=await createFixture();});
test.afterAll(async()=>{await retireFixture(fixture);});
test.afterEach(async({page})=>{await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(input=>{input.value='';input.removeAttribute('value');}));});
test('etapa pendente — preparação, funcionário, pagamento, retirada e retorno do cliente',async({page,request})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.name+': '+error.message));
 // Only prerequisites of stage3: no rerun of management or customer purchase UI.
 const csrf=await request.get('http://127.0.0.1:3001/api/auth/csrf');expect(csrf.status()).toBe(200);
 const headers={origin:'http://127.0.0.1:8000','x-csrf-token':(await csrf.json()).csrfToken};
 expect((await request.post('http://127.0.0.1:3001/api/auth/login',{headers,data:{email:fixture.customer.email,password:fixture.customer.password}})).status()).toBe(200);
 expect((await request.put('http://127.0.0.1:3001/api/cart/items/'+fixture.productId,{headers,data:{quantity:1}})).status()).toBe(200);
 const created=await request.post('http://127.0.0.1:3001/api/orders',{headers,data:{fulfillmentType:'PICKUP',idempotencyKey:randomUUID()}});expect(created.status()).toBe(201);
 const {order}=await created.json(),code=order.pickupCode;expect(code).toMatch(/^\d{5}$/);expect(order.paymentStatus).toBe('PENDING');
 await page.setViewportSize({width:1440,height:950});await employeeLogin(page,fixture.admin);
 for(const name of ['Confirmar preparação','Marcar pronto para retirada']){
  await section(page,'pedidos');await page.locator(`[data-order="${order.id}"]`).click();await page.getByRole('button',{name,exact:true}).click();await password(page,fixture.admin.password);await submit(page,'/admin/orders/'+order.id+'/status');
 }
 await page.locator('#btn-sair').click({noWaitAfter:true});await expect(page).toHaveURL(/admin\/login.html/);
 await employeeLogin(page,fixture.staff,'STAFF');await page.setViewportSize({width:390,height:950});
 await expect(page.locator('#menu-admin [data-secao]')).toHaveCount(3);
 for(const path of ['/admin/products','/admin/employees','/admin/settings'])expect(await apiStatus(page,path)).toBe(403);
 expect(await apiStatus(page,'/admin/stock/'+fixture.productId,'POST',{delta:100,reason:'Forbidden',currentPassword:fixture.staff.password})).toBe(403);
 await page.goto('/admin/painel.html',{waitUntil:'commit'});await expect(page).toHaveURL(/admin\/funcionario.html/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 await section(page,'atendimento');await page.getByLabel('Código de retirada',{exact:true}).fill(code);await page.getByRole('button',{name:'Consultar pedido',exact:true}).click();await expect(page.locator('#atendimento-resultado')).toContainText(order.orderNumber);
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/pickup','POST',{code})).toBe(409);
 page.on('dialog',dialog=>dialog.accept());await page.getByLabel('Método recebido no balcão').selectOption('CASH');await page.locator('[data-confirm-delivery]').check();await submit(page,'/staff/orders/'+order.id+'/complete','POST','Receber e entregar');
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/payment','POST',{code,method:'CASH'})).toBe(409);
 expect(await apiStatus(page,'/staff/orders/'+order.id+'/cancel','POST',{code,reason:'Paid cancellation blocked'})).toBe(409);
 await expect(page.locator('#atendimento-resultado')).toContainText('Atendimento concluído');expect(await apiStatus(page,'/staff/orders/'+order.id+'/pickup','POST',{code})).toBe(409);
 for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:950});await screenshot(page,'pending-staff-pickup-390');
 await section(page,'historico');await expect(page.locator('#conteudo-admin')).toContainText(order.orderNumber);
 const {events}=await browserApi(page,'/staff/history');expect(events.length).toBeGreaterThan(0);expect(events.every(event=>event.actor.id===fixture.staff.id)).toBe(true);
 await page.locator('#btn-sair').click({noWaitAfter:true});await expect(page).toHaveURL(/admin\/login.html/);
 console.log('Pending stage: preparation, authorized payment, pickup and history passed.');
 await page.goto('/conta.html',{waitUntil:'commit'});await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
 await page.getByLabel('E-mail',{exact:true}).fill(fixture.customer.email);await page.getByLabel('Senha',{exact:true}).fill(fixture.customer.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:'Meus pedidos',exact:true}).click();await page.locator(`[data-order="${order.id}"]`).click();await expect(page.getByText(/Retirada confirmada em/)).toBeVisible();
 const stored=(await browserApi(page,'/orders/'+order.id)).order;expect(stored.status).toBe('COMPLETED');expect(stored.paymentStatus).toBe('PAID');expect(stored.pickupCode).toBeNull();
 for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:950});await screenshot(page,'pending-customer-completed-390');await page.setViewportSize({width:1440,height:950});await screenshot(page,'pending-customer-completed-1440');
 expect(errors).toEqual([]);
 await evidence('pending-master-result',{passed:true,scope:'Only pending master stage, real Fastify and verified Neon testing',prerequisites:'Controlled customer/cart/order via real HTTP; stages1/2 UI not repeated',preparation:true,staffAuthorization:true,unpaidPickupDenied:true,payment:true,pickup:true,duplicatePaymentDenied:true,paidCancellationDenied:true,duplicatePickupDenied:true,staffOwnHistory:true,customerLoginAfterStaffLogout:true,customerUpdatedOrder:true,widths:[320,375,390,430,768,1024,1440],scriptErrors:errors,productionWrites:false});
});
