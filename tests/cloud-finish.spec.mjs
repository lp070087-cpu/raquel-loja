import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createFixture,retireFixture,browserApi,apiStatus,section,password,submit} from './helpers/real-panels.mjs';
const base=process.env.RAQUEL_PREVIEW_URL,folder='evidence/cloud-finish';let fixture,access;
test.beforeAll(async()=>{
 const config=JSON.parse(await readFile('config/deployment.json','utf8')),auth=JSON.parse(await readFile(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8'));
 const project=await(await fetch(`https://api.vercel.com/v9/projects/${config.vercelProjectId}?teamId=${config.vercelTeamId}`,{headers:{Authorization:'Bearer '+auth.token}})).json();
 access=Object.entries(project.protectionBypass||{}).find(([,value])=>value.scope==='automation-bypass')?.[0];if(!access)throw new Error('PREVIEW_ACCESS_REQUIRED');
 fixture=await createFixture();await mkdir(folder,{recursive:true});
});
test.afterAll(async()=>{if(fixture)await retireFixture(fixture);});
test.afterEach(async({page})=>{await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(i=>{i.value='';i.removeAttribute('value');}));});
async function employeeLogin(page,user){await page.goto('/admin/login');await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login'&&r.request().method()==='POST');await page.getByRole('button',{name:'Entrar no painel',exact:true}).click();expect((await response).status()).toBe(200);await page.waitForURL(/\/admin\/(painel|funcionario)(\.html)?(#.*)?$/);await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');}
async function customerClient(){
 const cookies=new Map();let csrf;
 const req=async(path,method='GET',body)=>{const r=await fetch(base+'/api'+path,{method,headers:{Origin:base,'x-vercel-protection-bypass':access,Cookie:[...cookies].map(([k,v])=>k+'='+v).join(';'),...(csrf?{'x-csrf-token':csrf}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});for(const line of r.headers.getSetCookie()){const pair=line.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}return {status:r.status,data:await r.json()};};
 csrf=(await req('/auth/csrf')).data.csrfToken;expect((await req('/auth/login','POST',{email:fixture.customer.email,password:fixture.customer.password})).status).toBe(200);return req;
}
test('acabamento real Vercel: JPG, estoque, catálogo importado e conclusão atômica',async({page})=>{
 const errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':access}}):route.continue());
 await employeeLogin(page,fixture.admin);
 expect(await apiStatus(page,'/admin/media','POST',{base64:Buffer.from('<svg/>').toString('base64')})).toBe(400);
 await section(page,'produtos');await page.getByRole('searchbox').fill(fixture.prefix);await page.getByRole('button',{name:'Buscar / aplicar',exact:true}).click();await page.locator(`[data-edit-product="${fixture.productId}"]`).click();
 await page.locator('[name="photoFiles"]').setInputFiles('public/produtos/pneus/pneu-01.jpg');await password(page,fixture.admin.password);await submit(page,'/admin/products/'+fixture.productId);
 const product=(await browserApi(page,'/admin/products/'+fixture.productId)).product;expect(product.images).toHaveLength(2);expect(product.images.some(i=>i.imageUrl.startsWith('/api/media/'))).toBe(true);
 await section(page,'categorias');await page.locator(`[data-edit-category="${fixture.categoryId}"]`).click();await page.locator('[name="photoFiles"]').setInputFiles('public/produtos/pneus/pneu-02.jpg');await password(page,fixture.admin.password);await submit(page,'/admin/categories/'+fixture.categoryId);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 const category=(await browserApi(page,'/admin/categories')).categories.find(c=>c.id===fixture.categoryId);expect(category.imageUrl).toMatch(/^\/api\/media\/[0-9a-f]{64}$/);
 const image=await page.evaluate(async path=>{const r=await fetch(path);return {status:r.status,type:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength};},category.imageUrl);expect(image.status).toBe(200);expect(image.type).toContain('image/jpeg');expect(image.bytes).toBeGreaterThan(100);
 await page.screenshot({path:folder+'/category-jpg-desktop.png'});
 const stock=await browserApi(page,'/admin/stock?q='+encodeURIComponent(fixture.prefix));expect(stock.products).toHaveLength(1);expect(stock.products[0].priceCents).toBe(4567);
 const catalog=(await browserApi(page,'/products')).products,imported=catalog.filter(p=>p.source==='marquinho');expect(imported).toHaveLength(122);expect(imported.every(p=>p.compatibilidadePendente)).toBe(true);
 await page.goto('/catalogo');await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');await expect(page.getByText('Confirme a aplicação',{exact:true}).first()).toBeVisible();
 const customer=await customerClient(),makeOrder=async quantity=>{expect((await customer('/cart/items/'+fixture.productId,'PUT',{quantity})).status).toBe(200);const r=await customer('/orders','POST',{fulfillmentType:'PICKUP',idempotencyKey:randomUUID()});expect(r.status).toBe(201);return r.data.order;};
 await browserApi(page,'/auth/logout','POST');await employeeLogin(page,fixture.staff);expect(await apiStatus(page,'/admin/media','POST',{base64:'PHN2Zy8+'})).toBe(403);
 const race=await makeOrder(1);expect((await customer('/staff/orders/'+race.id+'/complete','POST',{code:race.pickupCode,method:'PIX',receivedAndDelivered:true})).status).toBe(403);
 const statuses=await page.evaluate(async({id,code})=>{const {api}=await import('/assets/js/api.js');return Promise.all([1,2].map(async()=>{try{await api('/staff/orders/'+id+'/complete',{method:'POST',body:{code,method:'PIX',receivedAndDelivered:true}});return 200;}catch(e){return e.status;}}));},{id:race.id,code:race.pickupCode});expect(statuses.sort()).toEqual([200,409]);
 const card=await makeOrder(2);await page.getByLabel('Código de retirada',{exact:true}).fill(card.pickupCode);await expect(page.locator('#atendimento-resultado')).toContainText(card.orderNumber);await page.getByLabel('Método recebido no balcão').selectOption('CARD');await page.locator('[data-confirm-delivery]').check();await submit(page,'/staff/orders/'+card.id+'/complete','POST','Receber e entregar');await expect(page.getByLabel('Código de retirada',{exact:true})).toHaveValue('');
 const paid=await makeOrder(1);expect(await apiStatus(page,'/staff/orders/'+paid.id+'/payment','POST',{code:paid.pickupCode,method:'CASH'})).toBe(200);await page.getByLabel('Código de retirada',{exact:true}).fill(paid.pickupCode);await expect(page.locator('#atendimento-resultado')).toContainText('Pagamento: Confirmado');await page.locator('[data-confirm-delivery]').check();await submit(page,'/staff/orders/'+paid.id+'/complete','POST','Concluir retirada');
 for(const order of [race,card,paid]){const saved=(await customer('/orders/'+order.id)).data.order;expect(saved.status).toBe('COMPLETED');expect(saved.paymentStatus).toBe('PAID');expect(saved.pickupCode).toBeNull();expect(await apiStatus(page,'/staff/orders/'+order.id+'/complete','POST',{code:order.pickupCode,method:'PIX',receivedAndDelivered:true})).toBe(409);}
 const pending=await makeOrder(1);await browserApi(page,'/auth/logout','POST');await page.goto('/conta');await page.getByLabel('E-mail',{exact:true}).fill(fixture.customer.email);await page.getByLabel('Senha',{exact:true}).fill(fixture.customer.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.conta-nav [data-section="orders"]').click();await expect(page.locator('.conta-pickup strong')).toHaveText(pending.pickupCode);await page.locator('.conta-pickup').scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/customer-code-visible-desktop.png'});
 await page.goto('/pedido?id='+pending.id);await expect(page.locator('.retirada-local')).toContainText('demonstração');await expect(page.locator('.retirada-local a')).toHaveCount(0);
 const timings=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/api/')).map(r=>({path:new URL(r.name).pathname,durationMs:Math.round(r.duration),bytes:r.transferSize})));
 await page.locator('.retirada-local').scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/pickup-directions-provisional.png'});expect(errors).toEqual([]);expect(dialogs).toEqual([]);
 await browserApi(page,'/auth/logout','POST');await writeFile(folder+'/result.json',JSON.stringify({passed:true,previewUrl:base,testingOnly:true,productionWrites:false,sourceMarquinhoWrites:false,jpgProduct:true,jpgCategory:true,jpgPersistedAfterReload:true,stockSearchAndPrice:true,importedActiveProducts:imported.length,unknownCompatibilityNotUniversal:true,concurrentCompletionStatuses:statuses,methods:['PIX','CARD','CASH'],alreadyPaidCompletedWithoutNewPayment:true,codeVisibleWithoutDetails:true,provisionalDirections:true,scriptErrors:errors,dialogs,timings},null,2));
});
