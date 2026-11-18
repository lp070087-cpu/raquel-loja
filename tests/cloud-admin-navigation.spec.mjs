import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createFixture,retireFixture,browserApi} from './helpers/real-panels.mjs';
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
 await expect(page.locator('html')).toHaveAttribute('data-admin-ready','true');await expect(page.locator('#titulo-secao')).toHaveText('Atendimento');
 const modules=[['atendimento',null],['dashboard','dashboard'],['produtos','products'],['categorias','categories'],['estoque','stock'],['pedidos','orders'],['clientes','customers'],['funcionarios','employees'],['cupons','coupons'],['pagamentos','payments'],['retiradas','pickups'],['relatorios','reports'],['configuracoes','settings']];
 for(const [name,endpoint] of modules){
   const response=endpoint?page.waitForResponse(r=>new URL(r.url()).pathname===`/api/admin/${endpoint}`&&r.request().method()==='GET'):null;
   await page.locator(`[data-secao="${name}"]`).click();if(response)expect((await response).status()).toBe(200);
   const content=page.locator('#conteudo-admin');await expect(content).not.toContainText('Consultando os dados da loja…');
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
   results.push({module:name,serverRead:!!endpoint,passed:true});console.log('Módulo Vercel verificado: '+name);
 }
 await browserApi(page,'/auth/logout','POST');
 for(const path of ['/','/catalogo','/catalogo?categoria=capacetes,capas','/localizador','/catalogo?ofertas=1','/contato']){
   const response=await page.goto(path,{waitUntil:'domcontentloaded'});expect(response.status()).toBe(200);
   await expect(page.locator('html')).toHaveAttribute(path==='/contato'?'data-loja':'data-catalogo','servidor');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   results.push({route:path,passed:true});console.log('Rota Vercel verificada: '+path);
 }
 expect(errors).toEqual([]);await writeFile(`${folder}/result.json`,JSON.stringify({passed:true,previewUrl:base,realNeonTesting:true,productionWrites:false,results,scriptErrors:errors},null,2));
});
