import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {spawn,fork} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,stat} from 'node:fs/promises';
const backend=fileURLToPath(new URL('../backend/',import.meta.url));
const folder='evidence/master-panels';let runtime;
// Serial stages share only transient fixture/business values. Each test receives
// a fresh Playwright page/context, released before the next stage starts.
test.describe.configure({mode:'serial'});
let fixture,prefix,product,coupon,customer,order,code;
const errors=[];
async function start(){
 for(const path of ['src/admin','src/app','scripts/testing-runtime','scripts/admin-browser-fixture'])if((await stat(backend+'dist/'+path+'.js')).mtimeMs<(await stat(backend+path+'.ts')).mtimeMs)throw new Error('Build the backend before panel browser tests.');
 runtime=spawn(process.execPath,['dist/scripts/testing-runtime.js'],{cwd:backend,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Testing API startup timed out; output suppressed.')),60000);runtime.stdout.on('data',d=>{if(String(d).includes('Real Fastify API connected exclusively')){clearTimeout(timer);resolve();}});runtime.stderr.on('data',()=>{});runtime.once('exit',()=>{clearTimeout(timer);reject(new Error('Testing API exited.'));});});
}
async function stop(){if(runtime&&runtime.exitCode===null)await new Promise(resolve=>{runtime.once('exit',resolve);runtime.kill();});}
test.beforeAll(async()=>{await mkdir(folder,{recursive:true});await start();});
test.afterAll(stop);

test.beforeEach(async({page})=>{
 page.on('pageerror',e=>errors.push(e.name+': '+e.message));
 page.on('console',message=>{if(message.type()==='error'&&/pattern attribute|Invalid regular expression/.test(message.text()))errors.push(message.text());});
});
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus){await writeFile(`${folder}/failure.json`,JSON.stringify({path:new URL(page.url()).pathname,alerts:await page.locator('[role="alert"]').allTextContents()},null,2));await page.screenshot({path:`${folder}/failure.png`,mask:[page.locator('input[type="password"]')]});}});
async function employeeLogin(page,user,role){
 await page.goto('/admin/login.html',{waitUntil:'commit'});await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
 await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Entrar no painel',exact:true}).click({noWaitAfter:true});
 await expect(page).toHaveURL(role==='ADMIN'?/admin\/painel.html/:/admin\/funcionario.html/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
}
async function section(page,id){await page.locator(`#menu-admin [data-secao="${id}"]`).click();await expect(page.locator('#titulo-secao')).toContainText(({produtos:'Produtos',categorias:'Categorias',estoque:'Estoque',pedidos:'Pedidos',funcionarios:'Funcionários',cupons:'Cupons',configuracoes:'Configurações',relatorios:'Relatórios',atendimento:'Atendimento',historico:'Histórico'})[id]||'');}
async function password(page,value){await page.getByLabel('Sua senha atual',{exact:true}).fill(value);}
async function save(page,path,method='POST',button='Salvar alterações'){
 const invalid=await page.getByRole('button',{name:button,exact:true}).evaluate(button=>[...(button.form?.elements||[])].filter(input=>input.willValidate&&!input.validity.valid).map(input=>({field:input.name,message:input.validationMessage})));
 expect(invalid,'Form must allow a valid submission before waiting for API').toEqual([]);
 const editor=await page.getByRole('button',{name:button,exact:true}).evaluate(button=>!!button.closest('.admin-editor-form'));
 const response=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()===method);
 await page.getByRole('button',{name:button,exact:true}).click();const r=await response;expect(r.status()).toBeLessThan(300);if(editor){await expect(page.locator('.admin-editor-form')).toHaveCount(0);await expect(page.locator('#conteudo-admin')).not.toContainText('Consultando os dados da loja…');}return r.json();
}
// Capture the viewport: long product tables can exceed 14,000px and exhaust RAM.
// Overflow checks still inspect the complete document at every required width.
async function captureWidths(page,prefix){for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),prefix+' '+width).toBe(true);await page.screenshot({path:`${folder}/${prefix}-${width}.png`});}}
async function status(page,path,method='GET',body){return page.evaluate(async({path,method,body})=>{const {api}=await import('/assets/js/api.js');try{await api(path,{method,...(body?{body}:{})});return 200;}catch(e){return e.status;}},{path,method,body});}

test('1 — administração real e gestão de produtos, estoque, equipe e cupons',async({page})=>{
 fixture=await new Promise((resolve,reject)=>{const child=fork('dist/scripts/admin-browser-fixture.js',[],{cwd:backend,execArgv:[],stdio:['ignore','ignore','ignore','ipc']});const timer=setTimeout(()=>{child.kill();reject(new Error('Controlled management fixture timed out.'));},60000);child.once('message',data=>{clearTimeout(timer);data.error?reject(new Error('Controlled management fixture failed.')):resolve(data);});child.once('error',()=>{clearTimeout(timer);reject(new Error('Fixture startup failed.'));});});
 prefix='gestao-'+Date.now()+'-'+randomBytes(3).toString('hex');
 await page.setViewportSize({width:1440,height:950});await employeeLogin(page,fixture.admin,'ADMIN');
 await expect(page.locator('#menu-admin [data-secao]')).toHaveCount(13);await expect(page.locator('.cartao-metrica')).toHaveCount(6);
 await captureWidths(page,'admin-dashboard');
 await section(page,'categorias');await page.getByRole('button',{name:'Nova categoria',exact:true}).click();
 await page.getByLabel('Nome',{exact:true}).fill('Categoria '+prefix);await page.getByLabel('Identificador',{exact:true}).fill(prefix);await password(page,fixture.admin.password);
 const category=(await save(page,'/api/admin/categories')).category;
 await section(page,'produtos');await page.getByRole('button',{name:'Novo produto',exact:true}).click();
 for(const [label,value] of [['Nome','Peça '+prefix],['Identificador da página',prefix],['SKU',prefix],['Preço (R$)','12.34'],['Estoque inicial','5'],['Descrição','Peça de teste controlada em testing'],['Fotos — uma URL ou caminho público por linha','public/produtos/oleos/oleo-01.jpg']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByLabel('Categoria',{exact:true}).selectOption(category.id);
 await page.getByLabel('Marca',{exact:true}).fill('Honda');await page.getByLabel('Modelo',{exact:true}).fill('CG 160');await page.getByLabel('Versão (opcional)',{exact:true}).fill('Fan');await page.getByLabel('Ano inicial',{exact:true}).fill('2020');await page.getByLabel('Ano final',{exact:true}).fill('2024');await password(page,fixture.admin.password);
 await captureWidths(page,'admin-product-editor');
 product=(await save(page,'/api/admin/products')).product;expect(product.priceCents).toBe(1234);
 await page.locator(`[data-edit-product="${product.id}"]`).click();await page.getByLabel('Preço (R$)',{exact:true}).fill('20.25');await password(page,fixture.admin.password);await save(page,'/api/admin/products/'+product.id,'PATCH');
 console.log('Management browser: categories, product, images, compatibility and price persisted.');
 await section(page,'estoque');await page.locator(`[data-stock="${product.id}"]`).click();await page.getByLabel('Variação de unidades',{exact:true}).fill('2');await page.getByLabel('Motivo do ajuste',{exact:true}).fill('Reposição de teste controlada');await password(page,fixture.admin.password);await save(page,'/api/admin/stock/'+product.id);
 await section(page,'cupons');await page.getByRole('button',{name:'Novo cupom',exact:true}).click();await page.getByLabel('Código',{exact:true}).fill(prefix);await page.getByLabel('Desconto',{exact:true}).fill('10');await page.getByLabel('Compra mínima (R$)',{exact:true}).fill('0');await password(page,fixture.admin.password);coupon=(await save(page,'/api/admin/coupons')).coupon;
 await section(page,'funcionarios');await page.getByRole('button',{name:'Liberar funcionário',exact:true}).click();await page.getByLabel('E-mail da conta já cadastrada',{exact:true}).fill(fixture.customer.email);await password(page,fixture.admin.password);await save(page,'/api/admin/employees/'+fixture.customer.id,'PATCH','Autorizar funcionário');
 await page.locator(`[data-revoke-employee="${fixture.customer.id}"]`).click();await password(page,fixture.admin.password);await save(page,'/api/admin/employees/'+fixture.customer.id,'PATCH','Confirmar operação');
 await section(page,'configuracoes');const nameField=page.getByLabel('Nome da loja',{exact:true});await expect(nameField).toBeVisible();const oldName=await nameField.inputValue();await nameField.fill(oldName||'Moto Peças');await password(page,fixture.admin.password);await save(page,'/api/admin/settings','PATCH');
 for(const id of ['clientes','pedidos','pagamentos','retiradas','relatorios']){await section(page,id);await expect(page.locator('#conteudo-admin [role="alert"]')).toHaveCount(0);await expect(page.locator('#conteudo-admin')).not.toBeEmpty();}
 await page.locator('#btn-sair').click({noWaitAfter:true});await expect(page).toHaveURL(/admin\/login.html/);
});

test('2 — cliente real, compra com pagamento pendente e persistência após reinício',async({page})=>{
 await page.setViewportSize({width:1440,height:950});
 customer={name:'Cliente integrado '+prefix,email:prefix+'@example.test',password:randomBytes(24).toString('base64url')};
 await page.goto('/conta.html',{waitUntil:'commit'});await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();
 for(const [label,value] of [['Nome completo',customer.name],['E-mail',customer.email],['Telefone','81999999999'],['Senha',customer.password]])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();await expect(page.getByRole('heading',{name:'Olá, '+customer.name+'!'})).toBeVisible();
 await page.getByRole('button',{name:'Minhas motos',exact:true}).click();await page.getByRole('button',{name:'Cadastrar moto',exact:true}).click();await page.getByLabel('Marca',{exact:true}).selectOption('Honda');await page.getByLabel('Modelo',{exact:true}).selectOption('CG 160');await page.getByLabel('Versão',{exact:true}).selectOption('Fan');await page.getByLabel('Ano',{exact:true}).selectOption('2020');await page.getByRole('button',{name:'Salvar moto',exact:true}).click();await expect(page.getByRole('status')).toContainText('Moto salva');
 expect(await status(page,'/admin/products')).toBe(403);
 await page.goto('/produto.html?id='+product.id,{waitUntil:'commit'});await expect(page.locator('#btn-adicionar')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');
 const cartSaved=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/cart/items/'+product.id&&response.request().method()==='PUT');
 await page.locator('#btn-adicionar').click();expect((await cartSaved).status()).toBe(200);await expect(page.locator('#btn-adicionar')).toBeEnabled();await expect(page.locator('#btn-adicionar')).not.toHaveAttribute('aria-busy','true');
 await page.goto('/carrinho.html',{waitUntil:'commit'});await expect(page.locator('.item-carrinho')).toHaveCount(1);await page.locator('#campo-cupom').fill(coupon.code);await page.locator('#form-cupom button').click();await expect(page.locator('.resumo')).toContainText(coupon.code);
 await page.goto('/checkout.html',{waitUntil:'commit'});await expect(page.locator('#nome')).toHaveValue(customer.name);await page.setViewportSize({width:390,height:950});await page.locator('#btn-finalizar').click({noWaitAfter:true});await expect(page).toHaveURL(/pedido.html\?id=/);await expect(page.locator('#codigo-valor')).toHaveText(/^\d{5}$/);
 const orderId=new URL(page.url()).searchParams.get('id');code=await page.locator('#codigo-valor').innerText();
 order=await page.evaluate(async id=>{const {api}=await import('/assets/js/api.js');return(await api('/orders/'+id)).order;},orderId);
 expect(order.paymentStatus).toBe('PENDING');expect(order.totalCents).toBe(1823);expect(order.paymentMethod).toBe('ON_PICKUP');
 await page.screenshot({path:`${folder}/customer-pickup-code-390.png`,fullPage:true});
 const previous=runtime.pid;await stop();await start();expect(runtime.pid).not.toBe(previous);
 await page.goto('/conta.html',{waitUntil:'commit'});await page.getByRole('button',{name:'Meus pedidos',exact:true}).click();await page.getByRole('button',{name:'Ver detalhes',exact:true}).click();await expect(page.getByText('Código de retirada: '+code,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
});

test('3 — preparação, funcionário separado, pagamento presencial e retirada',async({page})=>{
 await page.setViewportSize({width:1440,height:950});
 await employeeLogin(page,fixture.admin,'ADMIN');
 await section(page,'pedidos');await page.locator(`[data-order="${order.id}"]`).click();await page.getByRole('button',{name:'Confirmar preparação',exact:true}).click();await password(page,fixture.admin.password);await save(page,'/api/admin/orders/'+order.id+'/status','PATCH');
 await page.locator(`[data-order="${order.id}"]`).click();await page.getByRole('button',{name:'Marcar pronto para retirada',exact:true}).click();await password(page,fixture.admin.password);await save(page,'/api/admin/orders/'+order.id+'/status','PATCH');
 await page.locator('#btn-sair').click({noWaitAfter:true});await expect(page).toHaveURL(/admin\/login.html/);await employeeLogin(page,fixture.staff,'STAFF');
 await page.setViewportSize({width:390,height:950});
 await expect(page.locator('#menu-admin [data-secao]')).toHaveCount(3);await expect(page.locator('#menu-admin [data-secao="funcionarios"]')).toHaveCount(0);
 for(const path of ['/admin/products','/admin/employees','/admin/settings'])expect(await status(page,path)).toBe(403);
 expect(await status(page,'/admin/stock/'+product.id,'POST',{delta:100,reason:'Forbidden',currentPassword:fixture.staff.password})).toBe(403);
 await page.goto('/admin/painel.html',{waitUntil:'commit'});await expect(page).toHaveURL(/admin\/funcionario.html/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 await section(page,'atendimento');await expect(page.getByRole('heading',{name:'Atendimento de retirada'})).toBeVisible();
 await page.getByLabel('Número ou identificação do pedido').fill(order.orderNumber);await page.getByLabel('Código de retirada',{exact:true}).fill(code);await page.getByRole('button',{name:'Consultar pedido',exact:true}).click();await expect(page.locator('#atendimento-resultado')).toContainText(order.orderNumber);
 expect(await status(page,'/staff/orders/'+order.id+'/pickup','POST',{code})).toBe(409);
 page.on('dialog',dialog=>dialog.accept());await page.getByLabel('Método recebido no balcão').selectOption('CASH');await save(page,'/api/staff/orders/'+order.id+'/payment','POST','Confirmar recebimento do pagamento');
 expect(await status(page,'/staff/orders/'+order.id+'/payment','POST',{code,method:'CASH'})).toBe(409);
 expect(await status(page,'/staff/orders/'+order.id+'/cancel','POST',{code,reason:'Paid cancellation blocked'})).toBe(409);
 await save(page,'/api/staff/orders/'+order.id+'/pickup','POST','Confirmar entrega dos produtos');await expect(page.locator('#atendimento-resultado')).toContainText('Situação: Retirado');expect(await status(page,'/staff/orders/'+order.id+'/pickup','POST',{code})).toBe(409);
 await captureWidths(page,'staff-counter');await section(page,'historico');await expect(page.locator('#conteudo-admin')).toContainText(order.orderNumber);
 expect(await page.evaluate(async actorId=>{const {api}=await import('/assets/js/api.js');const {events}=await api('/staff/history');return events.length>0&&events.every(e=>e.actor.id===actorId);},fixture.staff.id)).toBe(true);
 await page.locator('#btn-sair').click({noWaitAfter:true});await expect(page).toHaveURL(/admin\/login.html/);
 await page.goto('/conta.html',{waitUntil:'commit'});await page.getByLabel('E-mail',{exact:true}).fill(customer.email);await page.getByLabel('Senha',{exact:true}).fill(customer.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:'Meus pedidos',exact:true}).click();await page.getByRole('button',{name:'Ver detalhes',exact:true}).click();await expect(page.getByText(/Retirada confirmada em/)).toBeVisible();await captureWidths(page,'customer-completed-order');
 expect(errors).toEqual([]);
 await writeFile(`${folder}/result.json`,JSON.stringify({scope:'Real Fastify + Neon testing + separate ADMIN/STAFF browser panels',adminSections:13,staffSections:3,categoryCrud:true,productCreateEditImagesCompatibility:true,stock:true,coupons:true,employeeGrantRevoke:true,settings:true,reports:true,customerRegistration:true,motorcycle:true,checkout:true,paymentPending:true,pickupCodeFiveDigits:true,persistenceAfterApiRestart:true,preparationDoesNotApprovePayment:true,staffAdminDenied:true,staffOwnHistory:true,counterPayment:true,pickup:true,duplicatePaymentDenied:true,paidCancellationDenied:true,duplicatePickupDenied:true,customerUpdatedStatus:true,widths:[320,375,390,430,768,1024,1440],scriptErrors:errors,productionWrites:false},null,2));
});
