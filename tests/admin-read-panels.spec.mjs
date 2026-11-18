import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {spawn,fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,stat} from 'node:fs/promises';

const backend=fileURLToPath(new URL('../backend/',import.meta.url));
const folder='evidence';
let runtime;

test.beforeAll(async()=>{
 await mkdir(folder,{recursive:true});
 for(const path of ['src/admin','src/app','scripts/testing-runtime','scripts/admin-browser-fixture'])if((await stat(backend+'dist/'+path+'.js')).mtimeMs<(await stat(backend+path+'.ts')).mtimeMs)throw new Error('Build the backend before admin read browser tests.');
 runtime=spawn(process.execPath,['dist/scripts/testing-runtime.js'],{cwd:backend,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Testing API startup timed out; output suppressed.')),60000);
  runtime.stdout.on('data',data=>{if(String(data).includes('Real Fastify API connected exclusively')){clearTimeout(timer);resolve();}});
  runtime.stderr.on('data',()=>{});
  runtime.once('exit',()=>{clearTimeout(timer);reject(new Error('Testing API exited; output suppressed.'));});
 });
});
test.afterAll(async()=>{if(runtime&&runtime.exitCode===null)await new Promise(resolve=>{runtime.once('exit',resolve);runtime.kill();});});
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus){await writeFile(`${folder}/admin-read-failure.json`,JSON.stringify({path:new URL(page.url()).pathname,alerts:await page.locator('[role="alert"]').allTextContents()},null,2));await page.screenshot({path:`${folder}/admin-read-failure.png`,mask:[page.locator('input[type="password"]')]});}});

test('13 módulos ADMIN carregam dados reais e terminam o estado de carregamento',async({page})=>{
 const fixture=await new Promise((resolve,reject)=>{
  const child=fork('dist/scripts/admin-browser-fixture.js',[],{cwd:backend,execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
  const timer=setTimeout(()=>{child.kill();reject(new Error('Controlled admin fixture timed out.'));},60000);
  child.once('message',data=>{clearTimeout(timer);data.error?reject(new Error('Controlled admin fixture failed.')):resolve(data);});
  child.once('error',()=>{clearTimeout(timer);reject(new Error('Controlled admin fixture startup failed.'));});
 });
 const errors=[];
 page.on('pageerror',error=>errors.push(error.name+': '+error.message));
 page.on('console',message=>{if(message.type()==='error'&&/pattern attribute|Invalid regular expression/.test(message.text()))errors.push(message.text());});
 await page.setViewportSize({width:1440,height:950});
 await page.goto('/admin/login.html',{waitUntil:'commit'});
 await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
 await page.getByLabel('E-mail',{exact:true}).fill(fixture.admin.email);
 await page.getByLabel('Senha',{exact:true}).fill(fixture.admin.password);
 await page.getByRole('button',{name:'Entrar no painel',exact:true}).click({noWaitAfter:true});
 await expect(page).toHaveURL(/admin\/painel.html/);
 await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
 await expect(page.locator('#menu-admin [data-secao]')).toHaveCount(13);
 const modules=[
  ['dashboard','dashboard','metrics'],['produtos','products','products'],['categorias','categories','categories'],
  ['estoque','stock','products'],['pedidos','orders','orders'],['clientes','customers','customers'],
  ['funcionarios','employees','employees'],['cupons','coupons','coupons'],['atendimento',null,null],
  ['pagamentos','payments','payments'],['retiradas','pickups','orders'],['relatorios','reports','summary'],
  ['configuracoes','settings','settings']
 ];
 const results=[];
 for(const [name,endpoint,key] of modules){
  const responsePromise=endpoint?page.waitForResponse(response=>new URL(response.url()).pathname===`/api/admin/${endpoint}`&&response.request().method()==='GET'):null;
  await page.locator(`#menu-admin [data-secao="${name}"]`).click();
  if(responsePromise){
   const response=await responsePromise;
   expect(response.status(),name+' real GET').toBe(200);
   const data=await response.json();
   expect(data).toHaveProperty(key);
   if(!['dashboard','relatorios','configuracoes'].includes(name))expect(Array.isArray(data[key]),name+' server collection').toBe(true);
  }
  const content=page.locator('#conteudo-admin');
  await expect(content).not.toContainText('Consultando os dados da loja…');
  await expect(content).not.toContainText('Consultando o servidor…');
  if(name==='dashboard')await expect(content.locator('.cartao-metrica')).toHaveCount(6);
  else if(name==='relatorios'){
   await expect(content.locator('.cartao-metrica')).toHaveCount(4);
   for(const heading of ['Pedidos por situação','Recebimentos por método','10 produtos mais pedidos'])await expect(content.getByRole('heading',{name:heading,exact:true})).toBeVisible();
  }else if(name==='configuracoes'){
   await expect(content.locator('.admin-editor-form')).toBeVisible();
   for(const label of ['Nome da loja','Telefone','E-mail público','Rua e número','Bairro','Cidade','Estado (UF)','CEP','Horário de atendimento'])await expect(content.getByLabel(label,{exact:true})).toBeVisible();
  }else if(name==='atendimento'){
   await expect(content.getByRole('heading',{name:'Atendimento de retirada',exact:true})).toBeVisible();
   await expect(content.getByLabel('Código de retirada',{exact:true})).toBeVisible();
   await expect(content.getByRole('button',{name:'Consultar pedido',exact:true})).toBeEnabled();
  }else if(name==='produtos'||name==='categorias'){
   await expect.poll(async()=>await content.locator('.admin-item-card').count()>0||await content.getByText('Nenhum registro encontrado.',{exact:true}).count()>0,{message:name+' rendered cards or legitimate empty state'}).toBe(true);
  }else{
   await expect.poll(async()=>await content.locator('table tbody tr').count()>0||await content.getByText('Nenhum registro encontrado.',{exact:true}).count()>0,{message:name+' rendered table or legitimate empty state'}).toBe(true);
  }
  // Settings intentionally contains an empty form error node; only messages are errors.
  expect((await content.locator('[role="alert"]').allTextContents()).filter(text=>text.trim()),name+' alerts').toEqual([]);
  results.push({module:name,status:endpoint?200:null,realGetValidated:!!endpoint,rendered:true});
  if(name==='relatorios'||name==='pagamentos'){
   await page.setViewportSize({width:name==='relatorios'?375:1440,height:950});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`${folder}/admin-read-${name}.png`,mask:[page.locator('input[type="password"]')]});
  }
 }
 expect(errors).toEqual([]);
 await page.locator('#btn-sair').click({noWaitAfter:true});
 await expect(page).toHaveURL(/admin\/login.html/);
 await writeFile(`${folder}/admin-read-result.json`,JSON.stringify({scope:'Real Fastify and Neon testing ADMIN read modules',modules:results,scriptErrors:errors,passed:true,mocked:false,productionWrites:false},null,2));
});
