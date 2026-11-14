import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {randomUUID,randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createFixture,retireFixture,employeeLogin,section,password,submit,apiStatus,browserApi,evidence,screenshot} from './helpers/real-panels.mjs';

test.describe.configure({mode:'serial'});
let fixture;
test.beforeAll(async()=>{fixture=await createFixture();});
test.afterAll(async()=>{if(fixture)await retireFixture(fixture);});
let pageErrors=[];
test.beforeEach(async({page})=>{pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.name));await employeeLogin(page,fixture.admin,'ADMIN');});
test.afterEach(async({page})=>{await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(input=>{input.value='';input.removeAttribute('value');}));expect(pageErrors).toEqual([]);});

async function loaded(page){await expect(page.locator('#conteudo-admin')).not.toContainText('Consultando os dados da loja…');}
async function search(page,endpoint,label,value){
 await page.getByLabel(label,{exact:true}).fill(value);
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==='GET'&&new URL(r.url()).searchParams.get('q')===value);
 await page.getByRole('button',{name:'Buscar / aplicar',exact:true}).click();
 const response=await pending;expect(response.status()).toBe(200);await loaded(page);return response.json();
}
async function listAction(page,endpoint,action){
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==='GET');
 await action();const response=await pending;expect(response.status()).toBe(200);await loaded(page);return {data:await response.json(),query:new URL(response.url()).searchParams};
}

test('categoria controlada: editar, sincronizar metadados e desativar',async({page})=>{
 await section(page,'categorias');
 await page.locator(`[data-edit-category="${fixture.categoryId}"]`).click();
 const name='Categoria editada '+fixture.prefix,slug=fixture.prefix+'-edit';
 await page.getByLabel('Nome',{exact:true}).fill(name);await page.getByLabel('Identificador',{exact:true}).fill(slug);
 await password(page,fixture.admin.password);await submit(page,'/api/admin/categories/'+fixture.categoryId);
 let data=await browserApi(page,'/admin/categories');let category=data.categories.find(c=>c.id===fixture.categoryId);
 expect(category.name).toBe(name);expect(category.slug).toBe(slug);expect(category.active).toBe(true);
 expect((await browserApi(page,'/admin/products/'+fixture.productId)).product.categoria).toBe(slug);
 await page.locator(`[data-disable-category="${fixture.categoryId}"]`).click();await password(page,fixture.admin.password);
 await submit(page,'/api/admin/categories/'+fixture.categoryId,'DELETE','Confirmar operação');
 category=(await browserApi(page,'/admin/categories')).categories.find(c=>c.id===fixture.categoryId);expect(category.active).toBe(false);
 expect((await browserApi(page,'/categories')).categories.some(c=>c.id===fixture.categoryId)).toBe(false);
 await evidence('admin-category-operations',{passed:true,edited:true,metadataSynchronized:true,disabled:true,publicCategoryRemoved:true});
});

test('cupom controlado: editar valor fixo com centavos e desativar',async({page})=>{
 const code='OPS-'+Date.now()+'-'+randomBytes(3).toString('hex').toUpperCase();
 const {coupon}=await browserApi(page,'/admin/coupons','POST',{code,type:'PERCENT',value:5,minimumCents:0,currentPassword:fixture.admin.password});
 await section(page,'cupons');await search(page,'/api/admin/coupons','Buscar código do cupom',code);
 await page.locator(`[data-edit-coupon="${coupon.id}"]`).click();await page.getByLabel('Tipo',{exact:true}).selectOption('FIXED');
 await page.getByLabel('Desconto',{exact:true}).fill('12.34');await page.getByLabel('Compra mínima (R$)',{exact:true}).fill('56.78');
 await password(page,fixture.admin.password);await submit(page,'/api/admin/coupons/'+coupon.id);
 let saved=(await browserApi(page,'/admin/coupons?q='+encodeURIComponent(code))).coupons.find(c=>c.id===coupon.id);
 expect(saved.type).toBe('FIXED');expect(saved.value).toBe(1234);expect(saved.minimumCents).toBe(5678);
 await page.locator(`[data-disable-coupon="${coupon.id}"]`).click();await password(page,fixture.admin.password);
 await submit(page,'/api/admin/coupons/'+coupon.id,'DELETE','Confirmar operação');
 saved=(await browserApi(page,'/admin/coupons?q='+encodeURIComponent(code))).coupons.find(c=>c.id===coupon.id);expect(saved.active).toBe(false);
 await evidence('admin-coupon-operations',{passed:true,fixedCents:1234,minimumCents:5678,disabled:true});
});

test('estoque controlado: saída válida e rejeição de saldo negativo pela interface',async({page})=>{
 const before=(await browserApi(page,'/admin/products/'+fixture.productId)).product.stock;expect(before).toBeGreaterThan(1);
 await section(page,'estoque');
 await page.getByLabel('Registros por página',{exact:true}).selectOption('100');
 await listAction(page,'/api/admin/stock',()=>page.getByRole('button',{name:'Aplicar',exact:true}).click());
 for(let i=0;i<20&&!await page.locator(`[data-stock="${fixture.productId}"]`).count();i++){
  await expect(page.locator('[data-page-next]')).toBeEnabled();
  await listAction(page,'/api/admin/stock',()=>page.locator('[data-page-next]').click());
 }
 await page.locator(`[data-stock="${fixture.productId}"]`).click();
 await page.getByLabel('Variação de unidades',{exact:true}).fill('-1');await page.getByLabel('Motivo do ajuste',{exact:true}).fill('Saída controlada de validação');
 await password(page,fixture.admin.password);await submit(page,'/api/admin/stock/'+fixture.productId,'POST');
 expect((await browserApi(page,'/admin/products/'+fixture.productId)).product.stock).toBe(before-1);
 // Refresh may move the product to another page after sorting by stock.
 await section(page,'estoque');
 for(let i=0;i<20&&await page.locator('[data-page-prev]').isEnabled();i++)await listAction(page,'/api/admin/stock',()=>page.locator('[data-page-prev]').click());
 for(let i=0;i<20&&!await page.locator(`[data-stock="${fixture.productId}"]`).count();i++){
  await expect(page.locator('[data-page-next]')).toBeEnabled();await listAction(page,'/api/admin/stock',()=>page.locator('[data-page-next]').click());
 }
 await page.locator(`[data-stock="${fixture.productId}"]`).click();await page.getByLabel('Variação de unidades',{exact:true}).fill(String(-before));
 await page.getByLabel('Motivo do ajuste',{exact:true}).fill('Teste de bloqueio sem estoque');await password(page,fixture.admin.password);
 const rejected=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/stock/'+fixture.productId&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();expect((await rejected).status()).toBe(422);
 await expect(page.locator('[data-form-error]')).toContainText('estoque inválido');
 expect((await browserApi(page,'/admin/products/'+fixture.productId)).product.stock).toBe(before-1);
 await evidence('admin-stock-operations',{passed:true,negativeAdjustment:true,insufficientStockRejected:true,stockUnchangedOnFailure:true});
});

test('busca e paginação reais de produtos e pedidos, detalhe de cliente e snapshot após desativação',async({page,request})=>{
 // Create only a controlled customer's order; catalog creation/grants already have browser coverage.
 const csrf=await request.get('http://127.0.0.1:3001/api/auth/csrf');expect(csrf.status()).toBe(200);
 const headers={origin:'http://127.0.0.1:8000','x-csrf-token':(await csrf.json()).csrfToken};
 expect((await request.post('http://127.0.0.1:3001/api/auth/login',{headers,data:{email:fixture.customer.email,password:fixture.customer.password}})).status()).toBe(200);
 expect((await request.put('http://127.0.0.1:3001/api/cart/items/'+fixture.productId,{headers,data:{quantity:1}})).status()).toBe(200);
 const created=await request.post('http://127.0.0.1:3001/api/orders',{headers,data:{fulfillmentType:'PICKUP',idempotencyKey:randomUUID()}});expect(created.status()).toBe(201);
 const {order}=await created.json();
 const snapshot=order.items.map(i=>({productId:i.productId,skuSnapshot:i.skuSnapshot,nameSnapshot:i.nameSnapshot,unitPriceCents:i.unitPriceCents,quantity:i.quantity,totalCents:i.totalCents}));
 expect(snapshot).toHaveLength(1);expect(order.paymentStatus).toBe('PENDING');
 await section(page,'produtos');await page.getByLabel('Registros por página',{exact:true}).selectOption('25');
 let list=await listAction(page,'/api/admin/products',()=>page.getByRole('button',{name:'Buscar / aplicar',exact:true}).click());
 expect(list.query.get('take')).toBe('25');expect(list.data.products.length).toBeLessThanOrEqual(25);
 expect(list.data.total).toBeGreaterThan(25);await expect(page.locator('[data-page-next]')).toBeEnabled();
 list=await listAction(page,'/api/admin/products',()=>page.locator('[data-page-next]').click());expect(list.query.get('skip')).toBe('25');await expect(page.locator('#conteudo-admin')).toContainText('Página 2');
 list=await listAction(page,'/api/admin/products',()=>page.locator('[data-page-prev]').click());expect(list.query.get('skip')).toBe('0');
 const found=await search(page,'/api/admin/products','Buscar por nome ou SKU',fixture.productId);expect(found.products.map(p=>p.id)).toEqual([fixture.productId]);
 await page.locator(`[data-disable-product="${fixture.productId}"]`).click();await password(page,fixture.admin.password);
 await submit(page,'/api/admin/products/'+fixture.productId,'DELETE','Confirmar operação');
 expect((await browserApi(page,'/admin/products/'+fixture.productId)).product.active).toBe(false);
 expect(await apiStatus(page,'/products/'+fixture.productId)).toBe(404);
 const preserved=(await browserApi(page,'/admin/orders/'+order.id)).order;
 expect(preserved.items.map(i=>({productId:i.productId,skuSnapshot:i.skuSnapshot,nameSnapshot:i.nameSnapshot,unitPriceCents:i.unitPriceCents,quantity:i.quantity,totalCents:i.totalCents}))).toEqual(snapshot);
 expect(preserved.totalCents).toBe(order.totalCents);
 await section(page,'clientes');const customers=await search(page,'/api/admin/customers','Buscar por nome ou e-mail',fixture.customer.email);
 expect(customers.customers.map(c=>c.id)).toEqual([fixture.customer.id]);
 const detail=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/customers/'+fixture.customer.id&&r.request().method()==='GET');
 await page.locator(`[data-customer="${fixture.customer.id}"]`).click();expect((await detail).status()).toBe(200);
 await expect(page.locator('[data-editor]')).toContainText(fixture.customer.email);await expect(page.locator('[data-editor]')).toContainText(order.orderNumber);
 await section(page,'pedidos');await page.getByLabel('Registros por página',{exact:true}).selectOption('25');
 list=await listAction(page,'/api/admin/orders',()=>page.getByRole('button',{name:'Buscar / aplicar',exact:true}).click());expect(list.query.get('take')).toBe('25');expect(list.data.total).toBeGreaterThan(25);
 list=await listAction(page,'/api/admin/orders',()=>page.locator('[data-page-next]').click());expect(list.query.get('skip')).toBe('25');await expect(page.locator('#conteudo-admin')).toContainText('Página 2');
 await page.getByLabel('Situação',{exact:true}).selectOption('PENDING');
 const orders=await search(page,'/api/admin/orders','Buscar número do pedido',order.orderNumber);
 expect(orders.orders.map(o=>o.id)).toEqual([order.id]);expect(orders.orders.every(o=>o.status==='PENDING')).toBe(true);
 await page.getByLabel('Situação',{exact:true}).selectOption('COMPLETED');
 list=await listAction(page,'/api/admin/orders',()=>page.getByRole('button',{name:'Buscar / aplicar',exact:true}).click());
 expect(list.query.get('status')).toBe('COMPLETED');expect(list.data.orders).toEqual([]);await expect(page.getByText('Nenhum registro encontrado.',{exact:true})).toBeVisible();
 await screenshot(page,'admin-operations-order-filter');
 await evidence('admin-search-snapshot-operations',{passed:true,productPagination:true,productSearch:true,productDisabled:true,historicalSnapshotPreserved:true,customerDetail:true,orderPagination:true,orderSearch:true,orderStatusFilter:true});
});

test('configurações: nove campos e roundtrip dos valores existentes sem inventar dados comerciais',async({page})=>{
 const {settings:before}=await browserApi(page,'/admin/settings');
 // Empty mandatory payload keys must already exist; otherwise a roundtrip could
 // add settings rather than preserving the exact existing public configuration.
 for(const key of ['phone','address','openingHours'])expect(Object.hasOwn(before,key),'Existing settings required for an exact roundtrip: '+key).toBe(true);
 await section(page,'configuracoes');
 const fields={name:'Nome da loja',phone:'Telefone',email:'E-mail público',address:'Rua e número',neighborhood:'Bairro',city:'Cidade',state:'Estado (UF)',zipCode:'CEP',openingHours:'Horário de atendimento'};
 for(const [key,label] of Object.entries(fields))await expect(page.getByLabel(label,{exact:true})).toHaveValue(before[key]??'');
 try{
  await password(page,fixture.admin.password);await submit(page,'/api/admin/settings');
  expect((await browserApi(page,'/admin/settings')).settings).toEqual(before);
  for(const [key,label] of Object.entries(fields))await expect(page.getByLabel(label,{exact:true})).toHaveValue(before[key]??'');
  await screenshot(page,'admin-operations-existing-settings');
  await evidence('admin-settings-operations',{passed:true,publicFieldsValidated:9,existingValuesRoundtrip:true,commercialDataInvented:false});
 }finally{
  const {settings:after}=await browserApi(page,'/admin/settings');
  if(!isDeepStrictEqual(after,before))await browserApi(page,'/admin/settings','PATCH',{settings:before,currentPassword:fixture.admin.password});
 }
});
