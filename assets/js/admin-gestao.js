import { api } from './api.js';
import { esc, moeda, avisar } from './utils.js';
import { montarAtendimento } from './admin-atendimento.js';
import { tabelaEquipe, tabelaPedidos, dataEquipe, statusPedido, caminhoLista, controlesLista } from './admin-funcionario.js';
import {camposFotos,enviarFotos} from './admin-fotos.js';
import {carregamentoPainel} from './admin-carregamento.js';

const money = value => moeda(Number(value || 0)/100);
const button = (name,id,title) => `<button class="btn btn--pequeno btn--contorno" type="button" data-${name}="${esc(id)}">${title}</button>`;
const input = (name,title,value='',attrs='required') => `<label>${title}<input class="entrada" name="${name}" value="${esc(value ?? '')}" ${attrs}></label>`;
const check = (name,title,value) => `<label class="admin-check"><input type="checkbox" name="${name}" ${value?'checked':''}> ${title}</label>`;
const select = (name,title,options,value) => `<label>${title}<select class="entrada" name="${name}" aria-label="${title}">${options.map(([id,text])=>`<option value="${esc(id)}" ${String(value)===String(id)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const password = () => input('currentPassword','Sua senha atual','','type="password" autocomplete="current-password" required maxlength="128"');
const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const cents = value => Math.round(numeric(value)*100);
function cardsGestao(items,type) {
  if(!items.length)return '<div class="painel"><div class="painel__corpo">Nenhum registro encontrado.</div></div>';
  return `<div class="admin-card-grid">${items.map(item=>{
    const product=type==='product';
    const photo=product?item.images?.[0]?.imageUrl:item.imageUrl;
    const image=photo?`<img class="admin-item-card__photo" src="${esc(photo.startsWith('public/')?'../'+photo:photo)}" alt="${esc(item.name)}" loading="lazy" decoding="async">`:'<div class="admin-item-card__photo admin-item-card__photo--empty">Sem foto</div>';
    return `<article class="admin-item-card"><div class="admin-item-card__top"><span class="admin-tag ${item.active?'admin-tag--active':''}">${item.active?'Ativo':'Inativo'}</span><span class="micro texto-2">${product?'Produto':'Categoria'}</span></div>${image}<h2>${esc(item.name)}</h2><p class="micro texto-2">${esc(product?item.sku:item.slug)}</p>${product?`<p class="admin-item-card__category">${esc(item.category?.name||'Sem categoria')}</p><dl class="admin-item-card__values"><div><dt>Preço</dt><dd>${money(item.priceCents)}</dd></div><div><dt>Estoque</dt><dd>${esc(item.stock)} un.</dd></div></dl>`:''}<div class="admin-item-card__actions">${button(`edit-${type}`,item.id,'Editar')}${item.active?button(`disable-${type}`,item.id,'Desativar'):''}</div></article>`;
  }).join('')}</div>`;
}
function mount(root,html,actions='') {
  root.innerHTML=`<div data-feedback role="status" aria-live="polite"></div><div class="admin-actions">${actions}</div><div data-editor></div><div data-list>${html}</div>`;
}
function metrics(items) {
  return `<div class="admin-metrics">${items.map(([title,value])=>`<article class="cartao-metrica"><span class="cartao-metrica__rotulo">${esc(title)}</span><strong class="cartao-metrica__valor">${esc(value)}</strong></article>`).join('')}</div>`;
}
function feedback(root,message,error=false) {
  const target=root.querySelector('[data-feedback]');
  if(target) { target.className=`mensagem mensagem--${error?'erro':'ok'}`; target.textContent=message; }
}
function editor(root,title,fields,handler,submit='Salvar alterações') {
  const target=root.querySelector('[data-editor]');
  target.innerHTML=`<section class="painel admin-editor"><div class="painel__topo"><h2>${esc(title)}</h2></div><div class="painel__corpo"><form class="admin-editor-form"><div class="admin-field-grid">${fields}</div><p class="micro texto-2">A operação é validada no servidor e vinculada à sua conta.</p><p data-form-error role="alert"></p><div class="admin-actions"><button class="btn" type="submit">${submit}</button><button class="btn btn--contorno" type="button" data-close-editor>Cancelar</button></div></form></div></section>`;
  const form=target.querySelector('form');
  form.querySelector('[data-close-editor]').addEventListener('click',()=>target.replaceChildren());
  form.addEventListener('submit',async event=>{
    event.preventDefault(); if(!form.reportValidity())return;
    const controls=[...form.querySelectorAll('button')]; controls.forEach(control=>control.disabled=true);
    form.querySelector('[data-form-error]').textContent='Salvando no servidor…';
    try { await handler(Object.fromEntries(new FormData(form)),form); }
    catch(error) { form.querySelector('[data-form-error]').textContent=error.message; }
    finally { controls.forEach(control=>control.disabled=false); }
  });
  target.querySelector('input,select,textarea')?.focus({preventScroll:true});
  target.scrollIntoView({block:'nearest',behavior:'auto'});
  return form;
}
function confirmChange(root,title,handler,extra='') {
  editor(root,title,extra+password(),async data=>{await handler(data);avisar('Operação confirmada pelo servidor.');},'Confirmar operação');
}
function safeUrl(value) {
  const text=value.trim();
  if(!text)return '';
  if(/^\/api\/media\/[0-9a-f]{64}$/.test(text))return text;
  if(text.startsWith('public/')) {
    const decoded=decodeURIComponent(text);
    if(!/^public\/[a-zA-Z0-9_./ -]+$/.test(decoded)||decoded.includes('..'))throw new Error('Use um caminho válido dentro de public/, sem subir pastas.');
    return text;
  }
  const url=new URL(text);
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use uma URL HTTPS ou um caminho iniciado por public/.');
  return text;
}
function compatibilityRows(items=[]) {
  const rows=items.length?items:[{}];
  return `<fieldset class="admin-compat"><legend>Compatibilidades confirmadas</legend><p class="micro texto-2">Deixe sem marca e modelo para produto universal. Só cadastre aplicações verificadas.</p><div data-compat-rows>${rows.map(c=>compatibilityRow(c)).join('')}</div><button class="btn btn--pequeno btn--contorno" type="button" data-add-compat>Adicionar aplicação</button></fieldset>`;
}
function compatibilityRow(c={}) {
  return `<div class="admin-compat-row">${input('compatBrand','Marca',c.brand,'maxlength="100"')}${input('compatModel','Modelo',c.model,'maxlength="100"')}${input('compatVersion','Versão (opcional)',c.version,'maxlength="100"')}${input('compatFrom','Ano inicial',c.yearFrom,'type="number" min="1950" max="2100"')}${input('compatTo','Ano final',c.yearTo,'type="number" min="1950" max="2100"')}<button class="link-simples" type="button" data-remove-compat>Remover aplicação</button></div>`;
}
function readCompatibilities(form) {
  const rows=[...form.querySelectorAll('.admin-compat-row')];
  return rows.filter(row=>row.querySelector('[name="compatBrand"]').value.trim()||row.querySelector('[name="compatModel"]').value.trim()).map(row=>{
    const value=name=>row.querySelector(`[name="${name}"]`).value.trim();
    const result={brand:value('compatBrand'),model:value('compatModel'),version:value('compatVersion')||null,yearFrom:Number(value('compatFrom')),yearTo:Number(value('compatTo'))};
    if(!result.brand||!result.model||result.yearFrom<1950||result.yearTo<result.yearFrom)throw new Error('Complete a marca, o modelo e um intervalo válido de anos para cada aplicação.');
    return result;
  });
}

export async function montarGestao(root,section,refresh) {
  root.innerHTML=carregamentoPainel('Consultando os dados da loja');
  const save=async(path,method,body)=>{await api(path,{method,body});avisar('Alteração salva no servidor.');await refresh();};
  try {
    if(section==='atendimento') { await montarAtendimento(root); return; }
    if(section==='dashboard') {
      const {metrics:m,recentOrders}=await api('/admin/dashboard');
      mount(root,`${metrics([['Pedidos',m.orders],['Aguardando atendimento',m.pendingOrders],['Clientes',m.customers],['Produtos',m.products],['Estoque baixo',m.lowStock],['Recebimentos confirmados',money(m.paidCents)]])}<h2>Últimos pedidos</h2>${tabelaPedidos(recentOrders,true)}`);
      bindOrders(root,refresh); return;
    }
    if(section==='produtos') {
      const [data,{categories}]=await Promise.all([api(caminhoLista('/admin/products','admin-products')),api('/admin/categories')]),{products}=data;
      mount(root,cardsGestao(products,'product'),button('new-product','','Novo produto'));
      controlesLista(root,'admin-products',products,data,refresh,{search:'Buscar por nome ou SKU'});
      const editProduct=p=>{
        const form=editor(root,p.id?'Editar produto':'Novo produto',`${input('name','Nome',p.name,'required maxlength="200"')}${input('slug','Identificador da página',p.slug,'required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="150"')}${input('sku','SKU',p.sku,'required maxlength="100"')}${input('price','Preço (R$)',p.priceCents===undefined?'':(p.priceCents/100).toFixed(2),'required type="number" min="0.01" max="1000000" step="0.01"')}${select('categoryId','Categoria',[['','Sem categoria'],...categories.map(c=>[c.id,c.name])],p.categoryId||'')}${!p.id?input('initialStock','Estoque inicial',0,'required type="number" min="0" step="1"'):''}${check('active','Produto ativo',p.active!==false)}<label class="admin-span">Descrição<textarea class="entrada" name="description" required maxlength="10000" rows="4">${esc(p.description||'')}</textarea></label>${camposFotos((p.images||[]).map(image=>image.imageUrl))}${compatibilityRows(p.compatibilities)}${password()}`,async(data,form)=>{
          const photoUrls=await enviarFotos(form); const body={name:data.name.trim(),slug:data.slug.trim(),sku:data.sku.trim(),description:data.description.trim(),priceCents:cents(data.price),categoryId:data.categoryId||null,active:form.elements.active.checked,images:photoUrls.map(safeUrl).filter(Boolean).map((imageUrl,position)=>({imageUrl,position})),compatibilities:readCompatibilities(form),currentPassword:data.currentPassword};
          if(!p.id)body.initialStock=Number(data.initialStock);
          await save(`/admin/products${p.id?`/${encodeURIComponent(p.id)}`:''}`,p.id?'PATCH':'POST',body);
        });
        form.querySelector('[data-add-compat]').addEventListener('click',()=>form.querySelector('[data-compat-rows]').insertAdjacentHTML('beforeend',compatibilityRow()));
        form.addEventListener('click',event=>{const remove=event.target.closest('[data-remove-compat]');if(remove)remove.closest('.admin-compat-row').remove();});
      };
      root.querySelector('[data-new-product]').addEventListener('click',()=>editProduct({}));
      root.addEventListener('click',event=>{
        const edit=event.target.closest('[data-edit-product]'),disable=event.target.closest('[data-disable-product]');
        if(edit)editProduct(products.find(p=>p.id===edit.dataset.editProduct));
        if(disable)confirmChange(root,'Desativar produto? O histórico dos pedidos será preservado.',data=>save(`/admin/products/${encodeURIComponent(disable.dataset.disableProduct)}`,'DELETE',data));
      }); return;
    }
    if(section==='categorias') {
      const {categories}=await api('/admin/categories');
      mount(root,cardsGestao(categories,'category'),button('new-category','','Nova categoria'));
      const editCategory=c=>editor(root,c.id?'Editar categoria':'Nova categoria',input('name','Nome',c.name,'required maxlength="100"')+input('slug','Identificador',c.slug,'required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="100"')+camposFotos(c.imageUrl?[c.imageUrl]:[],false)+check('active','Categoria ativa',c.active!==false)+password(),async(data,form)=>{const urls=await enviarFotos(form,false);return save(`/admin/categories${c.id?`/${encodeURIComponent(c.id)}`:''}`,c.id?'PATCH':'POST',{name:data.name.trim(),slug:data.slug.trim(),imageUrl:urls[0]||null,active:form.elements.active.checked,currentPassword:data.currentPassword});});
      root.querySelector('[data-new-category]').addEventListener('click',()=>editCategory({}));
      root.addEventListener('click',event=>{const edit=event.target.closest('[data-edit-category]'),disable=event.target.closest('[data-disable-category]');if(edit)editCategory(categories.find(c=>c.id===edit.dataset.editCategory));if(disable)confirmChange(root,'Desativar esta categoria?',data=>save(`/admin/categories/${encodeURIComponent(disable.dataset.disableCategory)}`,'DELETE',data));});return;
    }
    if(section==='estoque') {
      const data=await api(caminhoLista('/admin/stock','admin-stock')),{products,movements}=data;
      mount(root,`<div data-stock-list>${tabelaEquipe(['Produto','Código / SKU','Preço','Disponível','Ação'],products.map(p=>[esc(p.name),esc(p.sku),money(p.priceCents),`<span class="admin-tag ${p.stock>5?'admin-tag--active':''}">${esc(p.stock)} un.</span>`,button('stock',p.id,'Ajustar estoque')]))}</div><h2>Últimas 50 movimentações</h2>${tabelaEquipe(['Data','Produto','Quantidade','Motivo','Responsável'],movements.map(m=>[dataEquipe(m.createdAt),esc(products.find(p=>p.id===m.entityId)?.name||m.entityId),esc(m.details?.delta),esc(m.details?.reason),esc(m.actor?.name||m.actorId||'Equipe')]))}`);
      controlesLista(root.querySelector('[data-stock-list]'),'admin-stock',products,data,refresh,{search:'Buscar produto ou código'});
      root.addEventListener('click',event=>{const target=event.target.closest('[data-stock]');if(!target)return;const product=products.find(p=>p.id===target.dataset.stock);editor(root,`Ajustar estoque: ${product.name}`,`<p class="admin-span">Estoque atual: ${product.stock}. Use uma quantidade positiva para entrada ou negativa para saída.</p>${input('delta','Variação de unidades','','required type="number" min="-1000000" max="1000000" step="1"')}${input('reason','Motivo do ajuste','','required minlength="3" maxlength="300"')}${password()}`,async data=>{if(!Number.isInteger(Number(data.delta))||Number(data.delta)===0)throw new Error('Informe uma quantidade inteira diferente de zero.');await save(`/admin/stock/${encodeURIComponent(product.id)}`,'POST',{delta:Number(data.delta),reason:data.reason.trim(),currentPassword:data.currentPassword});});});return;
    }
    if(section==='pedidos'||section==='retiradas') {
      const key=`admin-${section}`,data=await api(caminhoLista(section==='retiradas'?'/admin/pickups':'/admin/orders',key)),{orders}=data;
      mount(root,`<p class="texto-2">Pagamentos e entregas de produtos são confirmados no Atendimento, com o código apresentado pelo cliente.</p>${tabelaPedidos(orders,true)}`,`<a class="btn" href="#atendimento">Abrir atendimento</a>`);
      controlesLista(root,key,orders,data,refresh,section==='pedidos'?{search:'Buscar número do pedido',statuses:true}:{});bindOrders(root,refresh);return;
    }
    if(section==='clientes') {
      const data=await api(caminhoLista('/admin/customers','admin-customers')),{customers}=data;
      mount(root,tabelaEquipe(['Nome','E-mail','Telefone','Cadastro','Ação'],customers.map(c=>[esc(c.name),esc(c.email),esc(c.phone||'—'),dataEquipe(c.createdAt),button('customer',c.id,'Ver pedidos')])));
      controlesLista(root,'admin-customers',customers,data,refresh,{search:'Buscar por nome ou e-mail'});
      root.addEventListener('click',async event=>{const target=event.target.closest('[data-customer]');if(!target)return;target.disabled=true;try{const {customer,orders}=await api(`/admin/customers/${encodeURIComponent(target.dataset.customer)}`);const box=root.querySelector('[data-editor]');box.innerHTML=`<section class="painel admin-editor"><div class="painel__corpo"><h2>${esc(customer.name)}</h2><p>${esc(customer.email)} · ${esc(customer.phone||'')}</p><h3>Pedidos do cliente</h3>${tabelaPedidos(orders,true)}</div></section>`;bindOrders(box,refresh);}catch(error){feedback(root,error.message,true);}finally{target.disabled=false;}});return;
    }
    if(section==='funcionarios') {
      const data=await api(caminhoLista('/admin/employees','admin-employees')),{employees}=data;
      mount(root,`<p class="texto-2">Cada funcionário deve primeiro <a href="../conta.html" target="_blank" rel="noopener">criar sua própria conta na loja</a>. Depois, libere o acesso pelo e-mail cadastrado. A senha individual nunca é definida aqui.</p>${tabelaEquipe(['Nome','E-mail','Perfil','Ação'],employees.map(e=>[esc(e.name),esc(e.email),e.role==='ADMIN'?'Administração':'Funcionário',e.role==='STAFF'?button('revoke-employee',e.id,'Remover acesso da equipe'):'Conta administrativa protegida']))}`,button('grant-employee','','Liberar funcionário'));
      root.querySelector('[data-grant-employee]').addEventListener('click',()=>editor(root,'Liberar acesso de funcionário',input('email','E-mail da conta já cadastrada','','required type="email" maxlength="254"')+password(),async data=>{const {user}=await api(`/admin/employees/find?email=${encodeURIComponent(data.email.trim())}`);await save(`/admin/employees/${encodeURIComponent(user.id)}`,'PATCH',{role:'STAFF',currentPassword:data.currentPassword});},'Autorizar funcionário'));
      controlesLista(root,'admin-employees',employees,data,refresh,{search:'Buscar funcionário por nome ou e-mail'});
      root.addEventListener('click',event=>{const target=event.target.closest('[data-revoke-employee]');if(target)confirmChange(root,'Remover o acesso de funcionário? As sessões da equipe serão invalidadas pelo servidor.',data=>save(`/admin/employees/${encodeURIComponent(target.dataset.revokeEmployee)}`,'PATCH',{role:'CUSTOMER',currentPassword:data.currentPassword}));});return;
    }
    if(section==='cupons') {
      const data=await api(caminhoLista('/admin/coupons','admin-coupons')),{coupons}=data;
      mount(root,tabelaEquipe(['Código','Desconto','Mínimo','Limite','Validade','Situação','Ações'],coupons.map(c=>[esc(c.code),c.type==='PERCENT'?`${esc(c.value)}%`:money(c.value),money(c.minimumCents),esc(c.usageLimit??'Sem limite'),c.expiresAt?dataEquipe(c.expiresAt):'Sem expiração',c.active?'Ativo':'Inativo',`${button('edit-coupon',c.id,'Editar')} ${c.active?button('disable-coupon',c.id,'Desativar'):''}`])),button('new-coupon','','Novo cupom'));
      const dateValue=value=>value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
      const editCoupon=c=>{
        const form=editor(root,c.id?'Editar cupom':'Novo cupom',input('code','Código',c.code,'required maxlength="40" pattern="(?:[A-Za-z0-9_]|-)+"')+select('type','Tipo',[['PERCENT','Percentual (%)'],['FIXED','Valor fixo (R$)']],c.type||'PERCENT')+input('value','Desconto',c.value===undefined?'':c.type==='FIXED'?(c.value/100).toFixed(2):c.value,'required type="number" min="0.01" step="0.01"')+input('minimum','Compra mínima (R$)',(numeric(c.minimumCents)/100).toFixed(2),'required type="number" min="0" step="0.01"')+input('usageLimit','Limite total de usos (opcional)',c.usageLimit,'type="number" min="1" step="1"')+input('startsAt','Início (opcional)',dateValue(c.startsAt),'type="datetime-local"')+input('expiresAt','Expiração (opcional)',dateValue(c.expiresAt),'type="datetime-local"')+check('active','Cupom ativo',c.active!==false)+password(),async(data,form)=>{
          const value=data.type==='FIXED'?cents(data.value):Number(data.value);
          if(data.type==='PERCENT'&&(!Number.isInteger(value)||value<1||value>100))throw new Error('Informe um percentual inteiro entre 1 e 100.');
          const startsAt=data.startsAt?new Date(data.startsAt).toISOString():null,expiresAt=data.expiresAt?new Date(data.expiresAt).toISOString():null;
          if(startsAt&&expiresAt&&new Date(expiresAt)<=new Date(startsAt))throw new Error('A expiração deve ocorrer depois do início.');
          await save(`/admin/coupons${c.id?`/${encodeURIComponent(c.id)}`:''}`,c.id?'PATCH':'POST',{code:data.code.trim().toUpperCase(),type:data.type,value,minimumCents:cents(data.minimum),usageLimit:data.usageLimit?Number(data.usageLimit):null,startsAt,expiresAt,active:form.elements.active.checked,currentPassword:data.currentPassword});
        });
        const update=()=>{const percent=form.elements.type.value==='PERCENT';form.elements.value.step=percent?'1':'0.01';form.elements.value.min=percent?'1':'0.01';form.elements.value.max=percent?'100':'1000000';};form.elements.type.addEventListener('change',update);update();
      };
      root.querySelector('[data-new-coupon]').addEventListener('click',()=>editCoupon({}));
      controlesLista(root,'admin-coupons',coupons,data,refresh,{search:'Buscar código do cupom'});
      root.addEventListener('click',event=>{const edit=event.target.closest('[data-edit-coupon]'),disable=event.target.closest('[data-disable-coupon]');if(edit)editCoupon(coupons.find(c=>c.id===edit.dataset.editCoupon));if(disable)confirmChange(root,'Desativar este cupom?',data=>save(`/admin/coupons/${encodeURIComponent(disable.dataset.disableCoupon)}`,'DELETE',data));});return;
    }
    if(section==='pagamentos') {
      const data=await api(caminhoLista('/admin/payments','admin-payments')),{payments}=data;
      mount(root,`<p class="texto-2">Recebimentos confirmados no balcão. Reembolsos e pagamentos online exigem integração e política próprias; não são executados por esta tela.</p>${tabelaEquipe(['Data','Pedido','Método','Valor','Funcionário'],payments.map(p=>[dataEquipe(p.createdAt),esc(p.order?.orderNumber||p.orderId),esc(({CASH:'Dinheiro',PIX:'Pix presencial',CARD:'Maquininha'})[p.method]||p.method),money(p.amountCents),esc(p.employee?.name||p.employeeId||'Equipe')]))}`);controlesLista(root,'admin-payments',payments,data,refresh);return;
    }
    if(section==='relatorios') {
      const {summary,statuses,payments,topProducts,notice}=await api('/admin/reports');
      mount(root,`<p class="texto-2">${esc(notice||'O valor em pedidos inclui pedidos ainda pendentes ou cancelados. Recebimentos são somente pagamentos confirmados no balcão.')}</p>${metrics([['Pedidos',summary._count],['Subtotal dos pedidos',money(summary._sum?.subtotalCents)],['Descontos',money(summary._sum?.discountCents)],['Valor total em pedidos',money(summary._sum?.totalCents)]])}<h2>Pedidos por situação</h2>${tabelaEquipe(['Situação','Quantidade'],statuses.map(s=>[esc(statusPedido(s.status)),esc(s._count??0)]))}<h2>Recebimentos por método</h2>${tabelaEquipe(['Método','Quantidade','Total'],payments.map(p=>[esc(({CASH:'Dinheiro',PIX:'Pix presencial',CARD:'Maquininha'})[p.method]||p.method),esc(p._count??0),money(p._sum?.amountCents)]))}<h2>10 produtos mais pedidos</h2>${tabelaEquipe(['Produto','Quantidade','Total'],topProducts.map(p=>[esc(p.nameSnapshot||p.productId),esc(p._sum?.quantity??0),money(p._sum?.totalCents)]))}`);return;
    }
    if(section==='configuracoes') {
      const {settings}=await api('/admin/settings');
      mount(root,'<section class="painel"><div class="painel__corpo"><h2>Formas de atendimento</h2><p>Retirada na loja ativa, com pagamento presencial e código de 5 dígitos.</p><label class="admin-check"><input type="checkbox" checked disabled> Retirada na loja ativa</label><label class="admin-check"><input type="checkbox" disabled aria-describedby="delivery-setting-notice"> Entrega em domicílio</label><p id="delivery-setting-notice" class="micro texto-2">Entrega desativada. A ativação ficará disponível após configurar as áreas atendidas, os valores e o processo de entrega. Nenhum frete é cobrado pelo site.</p></div></section><p class="texto-2">Dados públicos de contato da loja. Banco e segurança são gerenciados separadamente.</p>');
      const form=editor(root,'Informações da loja',input('name','Nome da loja',settings.name,'maxlength="200"')+input('phone','Telefone',settings.phone,'type="tel" maxlength="100"')+input('email','E-mail público',settings.email,'type="email" maxlength="254"')+input('address','Rua e número',settings.address,'maxlength="500"')+input('neighborhood','Bairro',settings.neighborhood,'maxlength="100"')+input('city','Cidade',settings.city,'maxlength="100"')+input('state','Estado (UF)',settings.state,'maxlength="2" pattern="[A-Za-z]{2}"')+input('zipCode','CEP',settings.zipCode,'inputmode="numeric" pattern="[0-9]{5}-?[0-9]{3}" maxlength="9"')+input('openingHours','Horário de atendimento',settings.openingHours,'maxlength="500"')+check('addressConfirmed','Endereço definitivo confirmado para mostrar a rota',settings.addressConfirmed==='true')+password(),async(data,form)=>{
        const settings=Object.fromEntries(['name','phone','email','address','openingHours','city','neighborhood'].filter(key=>data[key].trim()||['phone','address','openingHours'].includes(key)).map(key=>[key,data[key].trim()]));
        settings.addressConfirmed=form.elements.addressConfirmed.checked?'true':'false';
        if(data.state.trim())settings.state=data.state.trim().toUpperCase();
        if(data.zipCode.trim())settings.zipCode=data.zipCode.replace(/\D/g,'');
        await save('/admin/settings','PATCH',{settings,currentPassword:data.currentPassword});
      });form.querySelector('[data-close-editor]').remove();return;
    }
    throw new Error('Seção não encontrada. Selecione uma opção do menu.');
  } catch(error) {
    root.innerHTML=`<div class="mensagem mensagem--erro" role="alert">${esc(error.message)}</div><button class="btn btn--contorno" type="button" data-retry>Tentar novamente</button>`;
    root.querySelector('[data-retry]').addEventListener('click',refresh);
  }
}

function bindOrders(root,refresh) {
  if(root.dataset.ordersBound==='true')return;
  root.dataset.ordersBound='true';
  root.addEventListener('click',async event=>{
    const target=event.target.closest('[data-order]');if(!target)return;
    target.disabled=true;
    try {
      const {order}=await api(`/admin/orders/${encodeURIComponent(target.dataset.order)}`);
      let area=root.querySelector('[data-editor]');
      if(!area){area=document.createElement('div');root.prepend(area);}
      area.innerHTML=`<section class="painel admin-editor"><div class="painel__corpo"><h2>Pedido ${esc(order.orderNumber)}</h2><p>${esc(order.user?.name||'Cliente')} · ${dataEquipe(order.createdAt)}</p><p>Situação: ${esc(statusPedido(order.status))} · Pagamento: ${order.paymentStatus==='PAID'?'recebido':'pendente'}</p>${tabelaEquipe(['Produto / SKU','Quantidade','Preço unitário','Total'],order.items.map(i=>[`${esc(i.nameSnapshot)}<br>${esc(i.skuSnapshot)}`,esc(i.quantity),money(i.unitPriceCents),money(i.totalCents)]))}<p>Subtotal: ${money(order.subtotalCents)} · Desconto: ${money(order.discountCents)} · Frete: ${money(order.shippingCents)}</p><p><strong>Total: ${money(order.totalCents)}</strong></p><div class="admin-actions"><a class="btn" href="#atendimento">Atender com código do cliente</a>${order.status==='PENDING'?button('status-order',order.id,'Confirmar preparação'):order.status==='CONFIRMED'?button('status-order',order.id,'Marcar pronto para retirada'):''}<button class="btn btn--contorno" type="button" data-close-order>Fechar detalhes</button></div><div data-status-form></div></div></section>`;
      area.querySelector('[data-close-order]').addEventListener('click',()=>area.replaceChildren());
      area.querySelector('[data-status-order]')?.addEventListener('click',()=>{
        const slot=area.querySelector('[data-status-form]');slot.innerHTML='<div data-editor></div>';
        editor(slot,'Atualizar etapa de preparação',password(),async data=>{await api(`/admin/orders/${encodeURIComponent(order.id)}/status`,{method:'PATCH',body:{status:order.status==='PENDING'?'CONFIRMED':'READY',currentPassword:data.currentPassword}});avisar('Etapa atualizada. O pagamento não foi alterado.');await refresh();});
      });
      area.scrollIntoView({block:'nearest',behavior:'auto'});
    } catch(error) { feedback(root,error.message,true); }
    finally {target.disabled=false;}
  });
}
