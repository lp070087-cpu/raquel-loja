import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
test('produção: vitrine e navegação por leitura, sem usuários ou pedidos de teste',async({page})=>{
 const folder='evidence/deployment/production-browser';await mkdir(folder,{recursive:true});const errors=[],blocked=[];
 page.on('pageerror',error=>errors.push(error.name));await page.route('**/*',route=>{if(['GET','HEAD','OPTIONS'].includes(route.request().method()))return route.continue();blocked.push(new URL(route.request().url()).pathname);return route.abort();});
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');await expect(page.locator('#grade-categorias .categoria-card')).toHaveCount(3);
 await expect(page.locator('#grade-destaques .produto-card').first()).toBeVisible();await expect(page.locator('#palco-hero')).not.toContainText('TESTING');
 const measurements=[];for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));expect(state.scrollWidth).toBeLessThanOrEqual(width);measurements.push(state);}
 await page.setViewportSize({width:390,height:950});await page.locator('#secao-categorias').scrollIntoViewIfNeeded();await page.locator('#secao-categorias').screenshot({path:folder+'/categories-390.png'});
 await page.locator('#palco-hero').scrollIntoViewIfNeeded();await page.locator('#palco-hero').screenshot({path:folder+'/banner-390.png'});
 await page.locator('[data-abrir-menu]').click();await page.locator('#menu-mobile a[href="conta.html"]').click({noWaitAfter:true});await expect(page).toHaveURL(/\/conta(?:\.html)?$/);await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();await expect(page.locator('#menu-mobile')).toHaveAttribute('aria-hidden','true');
 await page.goto('/admin/login',{waitUntil:'domcontentloaded'});await expect(page.locator('#form-login')).toHaveAttribute('data-auth-ready','true');expect(errors).toEqual([]);expect(blocked).toEqual([]);
 await writeFile(folder+'/result.json',JSON.stringify({passed:true,publicDomain:true,readOnly:true,productionTestUsersCreated:false,productionTestOrdersCreated:false,threeCategories:true,realCatalog:true,menuCloses:true,accountLogin:true,staffLogin:true,measurements,scriptErrors:errors},null,2));
});
