import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

test('banner mantém moldura estável, fade suave e produto inteiro',async({page})=>{
 const folder='evidence/home-banner-2026-11-16';await mkdir(folder,{recursive:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.name));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('html')).toHaveAttribute('data-catalogo','servidor');
 await expect(page.locator('.palco__item--ativo')).toBeVisible();
 expect(await page.locator('.palco__item').evaluateAll(els=>els.some(el=>/^(admin|counter)-browser-/.test(el.dataset.produto)))).toBe(false);
 const measurements=[];
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:950});await page.locator('#palco-hero').scrollIntoViewIfNeeded();
  const state=await page.locator('#palco-hero').evaluate(el=>{
   const frame=el.querySelector('.palco__palco'),card=el.querySelector('.palco__card'),active=el.querySelector('.palco__item--ativo'),info=el.querySelector('.palco__info');
   const r=frame.getBoundingClientRect(),c=card.getBoundingClientRect(),i=info.getBoundingClientRect(),style=getComputedStyle(active);
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,frameWidth:r.width,frameHeight:r.height,insetLeft:c.left-r.left,insetRight:r.right-c.right,infoBelow:i.top>=r.bottom-1,transform:style.transform,animation:style.animationName,transition:style.transitionProperty,ringAnimation:getComputedStyle(el.querySelector('.palco__area-amarela')).animationName,imageFit:getComputedStyle(active.querySelector('img')).objectFit};
  });
  expect(state.scrollWidth).toBeLessThanOrEqual(width);expect(Math.abs(state.frameWidth-state.frameHeight)).toBeLessThan(2);expect(Math.abs(state.insetLeft-state.insetRight)).toBeLessThan(1);expect(state.infoBelow).toBe(true);expect(state.transform).toBe('none');expect(state.animation).toBe('none');expect(state.ringAnimation).toBe('none');expect(state.transition).toBe('opacity');expect(state.imageFit).toBe('contain');measurements.push(state);
  if([390,1440].includes(width))await page.locator('#palco-hero').screenshot({path:folder+'/banner-'+width+'.png'});
 }
 const points=page.locator('.palco__ponto');expect(await points.count()).toBeGreaterThan(1);
 for(let index=0;index<await points.count();index++){
  await points.nth(index).click();await expect(points.nth(index)).toHaveAttribute('aria-current','true');
  const active=page.locator('.palco__item--ativo');await expect(active).toHaveAttribute('aria-hidden','false');
  expect(await active.locator('img').evaluate(async img=>{await img.decode();return img.naturalWidth>0;})).toBe(true);
  expect(await page.locator('[data-palco-etiqueta]').getAttribute('href')).toContain(await active.getAttribute('data-produto'));
 }
 await page.emulateMedia({reducedMotion:'reduce'});expect(errors).toEqual([]);
 await writeFile(folder+'/result.json',JSON.stringify({passed:true,stableFrame:true,opacityOnly:true,allSlidesVerified:true,measurements,scriptErrors:errors},null,2));
});
