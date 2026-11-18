import { test,expect } from '../backend/node_modules/@playwright/test/index.mjs';
import { randomUUID,randomBytes } from 'node:crypto';
import { writeFile,mkdir,stat } from 'node:fs/promises';
import { spawn, fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backend=fileURLToPath(new URL('../backend/',import.meta.url));
let runtime;
async function startRuntime() {
  for(const path of ['src/admin','src/app','scripts/testing-runtime','scripts/counter-browser-fixture'])if((await stat(backend+'dist/'+path+'.js')).mtimeMs<(await stat(backend+path+'.ts')).mtimeMs)throw new Error('Build the backend before live browser tests.');
  runtime=spawn(process.execPath,['dist/scripts/testing-runtime.js'],{cwd:backend,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Testing API startup timed out; raw output suppressed.')),60000);
    runtime.stdout.on('data',data=>{if(String(data).includes('Real Fastify API connected exclusively')){clearTimeout(timer);resolve();}});
    runtime.once('exit',()=>{clearTimeout(timer);reject(new Error('Testing API exited before startup; raw output suppressed.'));});
    runtime.stderr.on('data',()=>{});
  });
}
async function stopRuntime() {
  if(!runtime || runtime.exitCode!==null) return;
  await new Promise(resolve=>{runtime.once('exit',resolve);runtime.kill();});
}
test.beforeEach(async()=>{await startRuntime();});
test.afterEach(async()=>{await stopRuntime();});

// No route interception, mock API, credential file, or storage-state artifact.
// API port 3001 must be served by the compiled testing runtime, never production.
test('cliente completo com Fastify e Neon testing reais',async({page,browser})=>{
  test.setTimeout(600000);
  const catalog=await new Promise((resolve,reject)=>{
    const child=fork('dist/scripts/counter-browser-fixture.js',['--catalog'],{cwd:backend,execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
    const timer=setTimeout(()=>{child.kill();reject(new Error('Catalog fixture timed out.'));},60000);
    child.once('message',data=>{clearTimeout(timer);if(data.error)reject(new Error('Catalog fixture failed.'));else resolve(data);});
    child.once('error',()=>{clearTimeout(timer);reject(new Error('Catalog fixture startup failed.'));});
  });
  const name='Cliente E2E '+randomUUID().slice(0,8);
  const email='raquel-live-'+randomUUID()+'@example.test';
  const password=randomBytes(24).toString('base64url');
  const errors=[];page.on('pageerror',e=>errors.push(e.name));
  await page.goto('/conta.html',{waitUntil:'commit'});
  await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();
  await page.getByLabel('Nome completo',{exact:true}).fill(name);
  await page.getByLabel('E-mail',{exact:true}).fill(email);
  await page.getByLabel('Telefone',{exact:true}).fill('81999999999');
  await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Olá, '+name+'!'})).toBeVisible({timeout:60000});
  console.log('Real browser: customer registered.');
  await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
  await page.getByLabel('Nome completo',{exact:true}).fill(name+' Atualizado');
  await page.getByRole('button',{name:'Salvar dados',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('atualizados');
  await page.getByRole('button',{name:'Endereços',exact:true}).click();
  await page.getByRole('button',{name:'Novo endereço',exact:true}).click();
  for(const [label,value] of Object.entries({'Destinatário':name,'Telefone':'81999999999','CEP':'53160-010','Rua':'Rua de teste isolado','Número':'27','Bairro':'Teste','Cidade':'Olinda','Estado (UF)':'PE'})) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Salvar endereço',exact:true}).click();
  await expect(page.getByText('Rua de teste isolado, 27')).toBeVisible();
  await page.getByRole('button',{name:'Minhas motos',exact:true}).click();
  await page.getByRole('button',{name:'Cadastrar moto',exact:true}).click();
  await page.getByLabel('Marca',{exact:true}).selectOption('Honda');
  await page.getByLabel('Modelo',{exact:true}).selectOption('CG 160');
  await page.getByLabel('Versão',{exact:true}).selectOption('Fan');
  await page.getByLabel('Ano',{exact:true}).selectOption('2020');
  await page.getByLabel('Apelido (opcional)').fill('Moto E2E real');
  await page.getByRole('button',{name:'Salvar moto',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Moto E2E real'})).toBeVisible();
  await page.goto('/produto.html?id='+catalog.productId,{waitUntil:'commit'});
  await expect(page.locator('#btn-adicionar')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');
  const favorite=page.locator(`[data-favoritar="${catalog.productId}"]`);
  await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname.includes('/api/favorites/') && r.request().method()==='POST'),favorite.click()]);
  await page.evaluate(async()=>{await (await import('/assets/js/carrinho.js')).aguardarSincronizacao();});
  expect(await page.evaluate(async()=>(await (await fetch('http://127.0.0.1:3001/api/favorites',{credentials:'include'})).json()).products.length)).toBe(1);
  await page.locator('#qtd').fill('2');
  await page.locator('#btn-adicionar').click();
  await expect(page.locator('#btn-adicionar')).toBeEnabled();
  console.log('Real browser: profile, address, motorcycle, favorite and product validated.');
  await page.goto('/carrinho.html',{waitUntil:'commit'});
  await expect(page.locator('.item-carrinho')).toHaveCount(1);
  await expect(page.locator('[data-qtd]').first()).toHaveValue('2');
  await page.locator('#campo-cupom').fill('MOTO10');
  await page.locator('#form-cupom button').click();
  await expect(page.locator('.resumo')).toContainText('MOTO10');
  await page.goto('/checkout.html',{waitUntil:'commit'});
  await expect(page.locator('#nome')).toHaveValue(name+' Atualizado');
  await page.locator('#btn-finalizar').click({noWaitAfter:true});
  await expect(page).toHaveURL(/pedido.html\?id=/,{timeout:60000});
  const orderId=new URL(page.url()).searchParams.get('id');
  console.log('Real browser: persisted order created.');
  await expect(page.locator('#pedido-container')).toContainText('pendente');
  await mkdir('evidence/live-neon',{recursive:true});
  await expect(page.locator('#codigo-valor')).toHaveText(/^\d{5}$/);
  await page.setViewportSize({width:375,height:950});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'evidence/live-neon/pedido-real-testing.png',fullPage:true});
  const previousProcess=runtime.pid;
  await stopRuntime();await startRuntime();
  expect(runtime.pid).not.toBe(previousProcess);
  await page.goto('/conta.html',{waitUntil:'commit'});
  await expect(page.getByRole('heading',{name:'Olá, '+name+' Atualizado!'})).toBeVisible();
  expect(await page.evaluate(async()=>(await (await fetch('http://127.0.0.1:3001/api/favorites',{credentials:'include'})).json()).products.length)).toBe(1);
  await page.getByRole('button',{name:'Favoritos',exact:true}).first().click();
  await expect(page.locator('[data-add-product]')).toHaveCount(1);
  await page.locator('[data-add-product]').click();
  await expect(page.getByRole('status')).toContainText('Produto adicionado');
  const second=await browser.newContext();
  const device=await second.newPage();
  await device.goto('http://127.0.0.1:8000/conta.html',{waitUntil:'commit'});
  await device.getByLabel('E-mail',{exact:true}).fill(email);
  await device.getByLabel('Senha',{exact:true}).fill(password);
  await device.getByLabel('Manter conectado neste dispositivo').check();
  await device.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(device.getByRole('heading',{name:'Olá, '+name+' Atualizado!'})).toBeVisible({timeout:60000});
  await device.goto('http://127.0.0.1:8000/carrinho.html',{waitUntil:'commit'});
  await expect(device.locator('[data-qtd]').first()).toHaveValue('1');
  await device.locator('[data-remover]').first().click();
  await expect(device.getByText('Seu carrinho está vazio.',{exact:false})).toBeVisible();
  await page.goto('/carrinho.html',{waitUntil:'commit'});
  await expect(page.getByRole('heading',{name:'Seu carrinho está vazio',exact:true})).toBeVisible();
  await page.goto('/produto.html?id='+catalog.productId,{waitUntil:'commit'});
  await page.locator('#btn-comprar').click({noWaitAfter:true});
  await expect(page).toHaveURL(/checkout.html/);
  await expect(page.locator('#nome')).toHaveValue(name+' Atualizado');
  await device.goto('http://127.0.0.1:8000/conta.html',{waitUntil:'commit'});
  await device.getByRole('button',{name:'Meus pedidos',exact:true}).click();
  await expect(device.getByRole('button',{name:'Ver detalhes',exact:true})).toHaveCount(1);
  await device.getByRole('button',{name:'Ver detalhes',exact:true}).click();
  await expect(device.getByText(/Código de retirada: \d{5}$/)).toBeVisible();
  await device.setViewportSize({width:320,height:950});
  expect(await device.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await device.screenshot({path:'evidence/live-neon/codigo-retirada-mobile.png',fullPage:true});
  console.log('Real browser: five-digit pickup code visible in customer account on mobile.');
  await device.getByRole('button',{name:'Visão geral',exact:true}).click();
  for(const width of [320,375,390,430,768,1024,1440]) {
    await device.setViewportSize({width,height:950});
    expect(await device.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await device.screenshot({path:`evidence/live-neon/conta-real-${width}.png`,fullPage:true});
  }
  await device.getByRole('button',{name:'Sair da conta',exact:true}).click();
  await expect(device.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
  const denied=await device.evaluate(async(id)=>(await fetch('http://127.0.0.1:3001/api/orders/'+id,{credentials:'include'})).status,orderId);
  expect(denied).toBe(401);
  await device.getByRole('button',{name:'Criar uma conta',exact:true}).click();
  await device.getByLabel('Nome completo',{exact:true}).fill('Outro Cliente Teste');
  await device.getByLabel('E-mail',{exact:true}).fill('raquel-other-'+randomUUID()+'@example.test');
  await device.getByLabel('Telefone',{exact:true}).fill('81999999999');
  await device.getByLabel('Senha',{exact:true}).fill(randomBytes(24).toString('base64url'));
  await device.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(device.getByRole('heading',{name:'Olá, Outro Cliente Teste!'})).toBeVisible();
  const foreign=await device.evaluate(async(id)=>(await fetch('http://127.0.0.1:3001/api/orders/'+id,{credentials:'include'})).status,orderId);
  expect(foreign).toBe(404);
  expect(errors).toEqual([]);
  await writeFile('evidence/live-neon/result.json',JSON.stringify({scope:'Real browser + Fastify + Neon testing; no mocks',registration:true,profile:true,addresses:true,motorcycles:true,favorites:true,cart:true,coupon:true,order:true,paymentPending:true,secondDeviceLogin:true,cartSyncBetweenDevices:true,buyNowWaitsForPersistence:true,sessionAndOrdersAfterApiRestart:true,foreignCustomerDenied:true,persistence:true,logout:true,responsiveWidths:[320,375,390,430,768,1024,1440],productionWrites:false},null,2));
  await second.close();
});


test('pagamento presencial e retirada no painel existente com Neon real',async({page,request})=>{
  test.setTimeout(600000);
  const fixture=await new Promise((resolve,reject)=>{
    const child=fork('dist/scripts/counter-browser-fixture.js',[],{cwd:backend,execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
    const timer=setTimeout(()=>{child.kill();reject(new Error('Controlled testing fixture timed out; secrets suppressed.'));},60000);
    child.once('message',data=>{clearTimeout(timer);if(data.error)reject(new Error('Controlled fixture failed.'));else resolve(data);});
    child.once('error',()=>{clearTimeout(timer);reject(new Error('Controlled fixture startup failed.'));});
  });
  const email='counter-customer-'+randomUUID()+'@example.test',password=randomBytes(24).toString('base64url');
  const name='Cliente Balcao Teste';
  const csrfResponse=await request.get('http://127.0.0.1:3001/api/auth/csrf');
  const csrf=(await csrfResponse.json()).csrfToken;
  const headers={origin:'http://127.0.0.1:8000','x-csrf-token':csrf};
  const registration=await request.post('http://127.0.0.1:3001/api/auth/register',{headers,data:{name,email,phone:'81999999999',password}});expect(registration.status()).toBe(201);
  console.log('Real counter browser: isolated customer registered through real HTTP.');
  const orders=[];
  for(let i=0;i<4;i++){
    expect((await request.put('http://127.0.0.1:3001/api/cart/items/'+fixture.productId,{headers,data:{quantity:1}})).status()).toBe(200);
    const response=await request.post('http://127.0.0.1:3001/api/orders',{headers,data:{fulfillmentType:'PICKUP',idempotencyKey:randomUUID()}});expect(response.status()).toBe(201);orders.push((await response.json()).order);
  }
  expect(orders.every(o=>o.paymentStatus==='PENDING'&&o.paymentMethod==='ON_PICKUP'&&/^\d{5}$/.test(o.pickupCode))).toBe(true);
  console.log('Real counter browser: four pending orders persisted.');
  page.on('pageerror',e=>console.log('Counter UI script error: '+e.name+': '+e.message.slice(0,160)));
  await page.goto('/admin/login.html',{waitUntil:'commit'});
  await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
  await page.getByLabel('E-mail',{exact:true}).fill(fixture.email);await page.getByLabel('Senha',{exact:true}).fill(fixture.password);
  await page.getByRole('button',{name:'Entrar no painel'}).click({noWaitAfter:true});
  await expect(page).toHaveURL(/admin\/funcionario.html/);
  await page.locator('#menu-admin [data-secao="atendimento"]').click();
  await expect(page.getByRole('heading',{name:'Atendimento de retirada'})).toBeVisible();
  console.log('Real counter browser: employee authenticated in existing panel.');
  page.on('dialog',d=>d.type()==='prompt'?d.accept('Cancelamento controlado no navegador'):d.accept());
  const lookup=async(o)=>{await page.getByLabel('Código de retirada',{exact:true}).fill(o.pickupCode);await page.getByRole('button',{name:'Consultar pedido',exact:true}).click();await expect(page.locator('#atendimento-resultado')).toContainText(o.orderNumber);};
  const rejected=async(o,action,body)=>page.evaluate(async({id,action,body})=>{const {api}=await import('/assets/js/api.js');try{await api(`/staff/orders/${id}/${action}`,{method:'POST',body});return 200;}catch(e){return e.status;}},{id:o.id,action,body});
  let index=0;
  for(const method of ['CASH','PIX','CARD']){
    const o=orders[index];await lookup(o);await expect(page.locator('#atendimento-resultado')).toContainText('45,67');
    expect(await rejected(o,'pickup',{code:o.pickupCode})).toBe(409);
    await page.getByLabel('Método recebido no balcão').selectOption(method);
    await page.locator('[data-confirm-delivery]').check();
    const paid=page.waitForResponse(r=>r.url().endsWith('/complete')&&r.request().method()==='POST');await page.getByRole('button',{name:'Receber e entregar',exact:true}).click();expect((await paid).status()).toBe(200);
    await expect(page.locator('#atendimento-resultado')).toContainText('Atendimento concluído');
    expect(await rejected(o,'payment',{code:o.pickupCode,method})).toBe(409);
    expect(await rejected(o,'cancel',{code:o.pickupCode,reason:'Paid cancellation must be blocked'})).toBe(409);
    if(index===0){const previous=runtime.pid;await stopRuntime();await startRuntime();expect(runtime.pid).not.toBe(previous);await page.reload({waitUntil:'commit'});await lookup(o);await expect(page.locator('#atendimento-resultado')).toContainText('Pagamento: Confirmado');}
    if(index===0)await expect(page.locator('#atendimento-resultado')).toContainText('Situação: Retirado');
    expect(await rejected(o,'pickup',{code:o.pickupCode})).toBe(409);
    if(index===0)for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`evidence/live-neon/balcao-real-${width}.png`,fullPage:true});}
    console.log('Real counter browser: payment and pickup confirmed for '+method);
    index++;
  }
  await lookup(orders[3]);const cancelled=page.waitForResponse(r=>r.url().endsWith('/cancel')&&r.request().method()==='POST');await page.getByRole('button',{name:'Cancelar pedido e devolver estoque',exact:true}).click();expect((await cancelled).status()).toBe(200);await expect(page.locator('#atendimento-resultado')).toContainText('Situação: Cancelado');
  expect(await page.evaluate(async id=>{const {api}=await import('/assets/js/api.js');return(await api('/products/'+id)).product.stock;},fixture.productId)).toBe(7);
  await page.locator('#btn-sair').click({noWaitAfter:true});await expect(page).toHaveURL(/admin\/login.html/);
  await page.goto('/conta.html',{waitUntil:'commit'});await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Olá, '+name+'!'})).toBeVisible();
  const stored=await page.evaluate(async()=>{const {api}=await import('/assets/js/api.js');return(await api('/orders')).orders;});
  expect(stored.filter(o=>o.status==='COMPLETED').length).toBe(3);expect(stored.filter(o=>o.status==='CANCELLED').length).toBe(1);expect(stored.every(o=>o.pickupCode===null)).toBe(true);
  await page.getByRole('button',{name:'Meus pedidos',exact:true}).click();await page.locator(`[data-order="${orders[0].id}"]`).click();await expect(page.getByText(/Retirada confirmada em/)).toBeVisible();
  await page.setViewportSize({width:375,height:950});await page.screenshot({path:'evidence/live-neon/cliente-retirada-concluida.png',fullPage:true});
  await writeFile('evidence/live-neon/counter-result.json',JSON.stringify({scope:'Real Fastify and Neon testing, existing admin UI',pendingCheckout:true,cash:true,pixInStore:true,cardTerminal:true,separateDeliveryConfirmation:true,unpaidPickupDenied:true,duplicatePaymentDenied:true,paidCancellationDenied:true,duplicatePickupDenied:true,cancelledStockReturnedOnce:true,paymentAfterApiRestart:true,customerUpdatedStatus:true,responsiveWidths:[320,375,390,430,768,1024,1440],productionWrites:false},null,2));
});
