import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

test('home mostra três categorias compactas e mantém o catálogo completo',async({page,request})=>{
 const folder='evidence/home-categories-2026-11-16';await mkdir(folder,{recursive:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.name));
 const response=await request.get('http://127.0.0.1:3001/api/categories');expect(response.status()).toBe(200);
 const before=(await response.json()).categories.map(c=>c.id).sort();expect(before.length).toBeGreaterThan(3);
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');
 const cards=page.locator('#grade-categorias .categoria-card');await expect(cards).toHaveCount(3);
 expect(await cards.evaluateAll(els=>els.map(el=>new URL(el.href).searchParams.get('categoria')))).toEqual(['oleos','freios','transmissao']);
 await expect(page.locator('#grade-destaques .produto-card').first()).toBeVisible();
 await page.locator('#grade-categorias img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 const measurements=[];
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:844});await page.locator('#secao-categorias').scrollIntoViewIfNeeded();
  const state=await cards.evaluateAll(els=>({width:innerWidth,scroll:document.documentElement.scrollWidth,cards:els.map(el=>{const r=el.getBoundingClientRect(),img=el.querySelector('img');return {height:r.height,top:r.top,loaded:img.complete&&img.naturalWidth>0,fit:getComputedStyle(img).objectFit};})}));
  expect(state.scroll).toBeLessThanOrEqual(width);expect(state.cards.every(c=>c.loaded&&c.fit==='contain')).toBe(true);
  expect(state.cards.every(c=>c.height<=(width<=620?68:76)),JSON.stringify(state)).toBe(true);
  expect(state.cards.filter(c=>Math.abs(c.top-state.cards[0].top)<2).length).toBe(width<=620?1:3);
  measurements.push(state);
  if([390,1440].includes(width))await page.locator('#secao-categorias').screenshot({path:folder+'/categories-'+width+'.png'});
 }
 await page.locator('#titulo-categorias a').click({noWaitAfter:true});await expect(page).toHaveURL(/\/catalogo.html$/);
 await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');await expect(page.locator('.produto-card').first()).toBeVisible();
 const after=(await(await request.get('http://127.0.0.1:3001/api/categories')).json()).categories.map(c=>c.id).sort();expect(after).toEqual(before);expect(errors).toEqual([]);
 await writeFile(folder+'/result.json',JSON.stringify({passed:true,homeCategories:3,allCategoriesPreserved:before.length,fullCatalogLink:true,measurements,scriptErrors:errors},null,2));
});
