import {test,expect} from '../backend/node_modules/@playwright/test/index.mjs';
import {mkdir} from 'node:fs/promises';
test('atendimento automático e recebimento com entrega em um botão — API simulada',async({page})=>{
 let lookups=0,completed=0;const dialogs=[];page.on('dialog',async dialog=>{dialogs.push(dialog.type());await dialog.dismiss();});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let data={};
  if(path.endsWith('/auth/me'))data={user:{id:'staff-test',name:'Atendente Teste',role:'STAFF'}};
  else if(path.endsWith('/auth/csrf'))data={csrfToken:'mock-csrf'};
  else if(path.endsWith('/orders/lookup')){lookups++;data={order:{id:'o-test',orderNumber:'RQ-001',user:{name:'Cliente Teste'},items:[{nameSnapshot:'Peça de teste',quantity:2,unitPriceCents:2500}],totalCents:5000,status:'PENDING',paymentStatus:'PENDING',paymentMethod:'ON_PICKUP'}};}
  else if(path.endsWith('/o-test/complete')){completed++;expect(route.request().postDataJSON()).toEqual({code:'00123',method:'PIX',receivedAndDelivered:true});data={completed:{orderId:'o-test',orderNumber:'RQ-001',totalCents:5000,paymentMethod:'PIX'}};}
  await route.fulfill({json:data,headers:{'access-control-allow-origin':'http://127.0.0.1:8000','access-control-allow-credentials':'true'}});
 });
 await page.goto('/admin/funcionario.html');const code=page.getByLabel('Código de retirada',{exact:true});await code.fill('00123');
 await expect(page.locator('#atendimento-resultado')).toContainText('Cliente Teste');expect(lookups).toBe(1);
 const confirm=page.getByRole('button',{name:'Receber e entregar',exact:true});await expect(confirm).toBeDisabled();
 await page.getByLabel('Método recebido no balcão').selectOption('PIX');await expect(confirm).toBeDisabled();
 await page.locator('[data-confirm-delivery]').check();await expect(confirm).toBeEnabled();
 await mkdir('evidence/account-finish',{recursive:true});
 for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await confirm.click();await expect(page.locator('.atendimento-success')).toContainText('Atendimento concluído');await expect(code).toHaveValue('');await expect(code).toBeEnabled();expect(completed).toBe(1);expect(dialogs).toEqual([]);
 await page.screenshot({path:'evidence/account-finish/counter-completed-1440.png'});
});
