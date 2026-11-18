import {expect} from '../../backend/node_modules/@playwright/test/index.mjs';
import {fork,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,stat} from 'node:fs/promises';
const backend=fileURLToPath(new URL('../../backend/',import.meta.url));
export async function createFixture(){
 if(process.env.RAQUEL_CLOUD_HTTP_FIXTURE==='1')return(await import('../../scripts/cloud-fixture.mjs')).createCloudFixture();
 for(const path of ['src/admin','src/app','scripts/admin-browser-fixture','scripts/retire-panel-fixtures','scripts/panel-fixture-selector'])if((await stat(backend+'dist/'+path+'.js')).mtimeMs<(await stat(backend+path+'.ts')).mtimeMs)throw new Error('Build required before real panel tests.');
 return new Promise((resolve,reject)=>{
  const child=fork('dist/scripts/admin-browser-fixture.js',[],{cwd:backend,execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
  const timer=setTimeout(()=>{child.kill();reject(new Error('Controlled fixture timed out; output suppressed.'));},60000);
  child.once('message',data=>{clearTimeout(timer);data.error?reject(new Error('Controlled fixture failed; output suppressed.')):resolve(data);});
  child.once('error',()=>{clearTimeout(timer);reject(new Error('Controlled fixture startup failed.'));});
 });
}
export async function retireFixture(fixture){
 if(!fixture)return;
 if(fixture.cloudHttp)return(await import('../../scripts/cloud-fixture.mjs')).retireCloudFixture(fixture);
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['dist/scripts/retire-panel-fixtures.js','--testing','--confirm-retire-fixtures','--prefix='+fixture.prefix],{cwd:backend,stdio:'ignore'});
  const timer=setTimeout(()=>{child.kill();reject(new Error('Controlled privilege cleanup timed out.'));},60000);
  child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Controlled privilege cleanup failed.'));});
  child.once('error',()=>{clearTimeout(timer);reject(new Error('Controlled cleanup startup failed.'));});
 });
}
export async function employeeLogin(page,user,role='ADMIN'){
 await page.goto('/admin/login.html',{waitUntil:'commit'});
 await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');
 await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);
 const loginResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Entrar no painel',exact:true}).click({noWaitAfter:true});
 expect((await loginResponse).status(),'Employee login HTTP status').toBe(200);
 await expect(page).toHaveURL(role==='ADMIN'?/admin\/painel.html/:/admin\/funcionario.html/);
 await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');
}
const titles={dashboard:'Dashboard',produtos:'Produtos',categorias:'Categorias',estoque:'Estoque',pedidos:'Pedidos',clientes:'Clientes',funcionarios:'Funcionários',cupons:'Cupons',pagamentos:'Pagamentos',retiradas:'Retiradas',relatorios:'Relatórios',configuracoes:'Configurações',atendimento:'Atendimento',historico:'Histórico'};
export async function section(page,id){
 await page.locator(`#menu-admin [data-secao="${id}"]`).click();await expect(page.locator('#titulo-secao')).toHaveText(titles[id]);
 await expect(page.locator('#conteudo-admin')).not.toContainText('Consultando os dados da loja…');
}
export async function password(page,value){await page.getByLabel('Sua senha atual',{exact:true}).fill(value);}
export async function submit(page,path,method='PATCH',button='Salvar alterações'){
 const target=page.getByRole('button',{name:button,exact:true});
 const invalid=await target.evaluate(button=>[...(button.form?.elements||[])].filter(input=>input.willValidate&&!input.validity.valid).map(input=>input.name));
 expect(invalid,'Native form validation').toEqual([]);
 const apiPath=path.startsWith('/api/')?path:'/api'+path;
 const received=page.waitForResponse(r=>new URL(r.url()).pathname===apiPath&&r.request().method()===method);
 await target.click();const response=await received;expect(response.status(),method+' '+apiPath).toBeLessThan(300);
 const result=await response.json();
 await expect.poll(()=>page.locator('[data-form-error]').allTextContents()).not.toContain('Salvando no servidor…');
 if(apiPath.startsWith('/api/admin/')&&apiPath!=='/api/admin/settings')await expect(page.locator('.admin-editor-form')).toHaveCount(0);
 await expect(page.locator('#conteudo-admin')).not.toContainText('Consultando os dados da loja…');
 if(apiPath==='/api/admin/settings')await expect(page.getByRole('button',{name:button,exact:true})).toBeEnabled();
 return result;
}
export async function browserApi(page,path,method='GET',body){return page.evaluate(async({path,method,body})=>{const {api}=await import('/assets/js/api.js');return api(path,{method,...(body===undefined?{}:{body})});},{path,method,body});}
export async function apiStatus(page,path,method='GET',body){return page.evaluate(async({path,method,body})=>{const {api}=await import('/assets/js/api.js');try{await api(path,{method,...(body===undefined?{}:{body})});return 200;}catch(error){return error.status;}},{path,method,body});}
export async function evidence(name,value){await mkdir('evidence/final-targeted',{recursive:true});await writeFile(`evidence/final-targeted/${name}.json`,JSON.stringify(value,null,2));}
export async function screenshot(page,name){await mkdir('evidence/final-targeted',{recursive:true});await page.screenshot({path:`evidence/final-targeted/${name}.png`,mask:[page.locator('input[type="password"]')]});}
