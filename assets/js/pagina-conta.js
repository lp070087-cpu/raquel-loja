import { api } from './api.js';
import { carregarCatalogo } from './catalogo-api.js';
import { esc, moeda } from './utils.js';
import { MARCAS, modelosDaMarca, versoesDoModelo, anosDoModelo } from './dados.js';
import { moto as motoStore, sincronizarConta, esquecerConta } from './carrinho.js';

const sections = { overview:'Visão geral', profile:'Meu perfil', addresses:'Endereços', motorcycles:'Minhas motos', favorites:'Favoritos', orders:'Meus pedidos', security:'Segurança' };
const statusNames = { PENDING:'Recebido', CONFIRMED:'Confirmado', PROCESSING:'Em preparação', READY:'Pronto para retirada', SHIPPED:'Enviado', DELIVERED:'Entregue', COMPLETED:'Concluído', CANCELLED:'Cancelado', PENDING_PAYMENT:'Pagamento pendente', PAID:'Pago', UNPAID:'Pendente' };
const paymentNames = { PENDING:'Pendente', PAID:'Pago', FAILED:'Não concluído', REFUNDED:'Reembolsado', CANCELLED:'Cancelado' };
const methodNames = { PIX:'Pix presencial', CARD:'Cartão na maquininha', ON_PICKUP:'Na retirada, diretamente na loja',CASH:'Dinheiro na retirada' };
let root, user, active='overview', sequence=0;
const money = cents => moeda(cents / 100);
const date = value => new Date(value).toLocaleString('pt-BR');
const field = (name,title,value='',attrs='') => `<label>${title}<input class="entrada" name="${name}" value="${esc(value ?? '')}" ${attrs}></label>`;
const password = (name='password',title='Senha',autocomplete='current-password') => `<label>${title}<span class="conta-password"><input class="entrada" name="${name}" aria-label="${title}" type="password" required minlength="10" maxlength="128" autocomplete="${autocomplete}"><button type="button" data-reveal aria-label="Mostrar senha" aria-pressed="false">Mostrar</button></span></label>`;
const empty = text => `<div class="conta-empty"><p>${text}</p><a class="btn btn--pequeno" href="catalogo.html">Explorar catálogo</a></div>`;
const addressText = a => `${esc(a.street)}, ${esc(a.number)}${a.complement ? ` · ${esc(a.complement)}` : ''}<br>${esc(a.neighborhood)} · ${esc(a.city)}/${esc(a.state)}<br>CEP ${esc(a.zipCode)}`;
const motorcycleText = m => `${esc(m.brand)} ${esc(m.model)} ${esc(m.version || '')} · ${esc(m.year)}`;
function message(text='',error=false) { const el=root.querySelector('[data-message]'); if(el) { el.textContent=text; el.dataset.error=String(error); } }
function frame(html) { root.innerHTML=`<div data-message class="conta-message" role="status" aria-live="polite"></div>${html}`; }
function afterLogin() { const next=new URLSearchParams(location.search).get('next'); if(!next) return false; const target=new URL(next,location.href); if(target.origin===location.origin && !target.pathname.endsWith('/conta.html')) { location.assign(target.href); return true; } return false; }

export async function montarConta() {
  root=document.getElementById('conta-container'); if(!root) return;
  root.addEventListener('click',handleClick); root.addEventListener('submit',handleSubmit);
  window.addEventListener('raquel:session-expired',()=>{ if(user) { user=null; esquecerConta(); renderAuth(); message('Sua sessão expirou. Entre novamente para continuar.',true); } });
  root.addEventListener('change',event=>{ const form=event.target.closest('[data-form="motorcycle"]'); if(form && ['brand','model','version'].includes(event.target.name)) motorcycleOptions(form,event.target.name); });
  frame('<div class="conta-skeleton" aria-label="Carregando sua conta"></div><div class="conta-skeleton"></div>');
  const params=new URLSearchParams(location.search);
  if(params.get('reset')) { renderAuth('reset'); return; }
  if(params.get('verify')) { try { await api('/auth/verify-email',{method:'POST',body:{token:params.get('verify')}}); history.replaceState(null,'','conta.html'); renderAuth(); message('E-mail verificado. Entre para continuar.'); } catch(error) { renderAuth(); message(error.message,true); } return; }
  try { user=(await api('/auth/me')).user; } catch(error) { renderAuth(); if(error.status!==401) message(error.message,true); }
  if(user) await initializeAccount();
}
async function initializeAccount() {
  await carregarCatalogo();
  let synchronizationError;
  try { await sincronizarConta(); } catch(error) { synchronizationError=error; }
  if(!user) return;
  await renderAccount();
  if(synchronizationError) message(`Sua conta está conectada, mas o carrinho não foi sincronizado. ${synchronizationError.message}`,true);
}
function renderAuth(mode='login') {
  const register=mode==='register', forgot=mode==='forgot', reset=mode==='reset';
  frame(`<div class="conta-card conta-auth"><h2>${register?'Crie sua conta':forgot?'Recuperar acesso':reset?'Definir nova senha':'Bom ter você de volta'}</h2><p class="conta-note">${forgot?'Se o endereço estiver cadastrado, enviaremos instruções quando o serviço de e-mail estiver disponível.':reset?'Escolha uma senha com pelo menos 10 caracteres.':'Acesse seus pedidos e salve as peças certas para a sua moto.'}</p><form class="conta-form" data-form="${mode}">${register?field('name','Nome completo','','required minlength="2" maxlength="100" autocomplete="name"'):''}${!reset?field('email','E-mail','','type="email" required maxlength="254" autocomplete="email"'):''}${register?field('phone','Telefone','','type="tel" required minlength="10" maxlength="20" autocomplete="tel"'):''}${!forgot?password('password',reset?'Nova senha':'Senha',register||reset?'new-password':'current-password'):''}${register?'<span class="conta-note">Use ao menos 10 caracteres. Nunca compartilhe sua senha.</span>':''}${mode==='login'?'<label class="conta-check"><input type="checkbox" name="remember"> Manter conectado neste dispositivo</label>':''}<button class="btn" type="submit">${register?'Criar conta':forgot?'Solicitar recuperação':reset?'Salvar nova senha':'Entrar'}</button></form><div class="conta-links">${mode!=='login'?'<button class="conta-link" data-auth="login">Já tenho conta</button>':'<button class="conta-link" data-auth="register">Criar uma conta</button><button class="conta-link" data-auth="forgot">Esqueci minha senha</button>'}</div></div>`);
}
function orderCard(order) { return `<article class="conta-card"><span class="conta-badge">${esc(statusNames[order.status]||order.status)}</span><h3>Pedido ${esc(order.orderNumber)}</h3><p class="conta-note">${date(order.createdAt)} · ${order.fulfillmentType==='PICKUP'?'Retirada na loja':'Entrega'}</p><p class="conta-summary">${money(order.totalCents)}</p><button class="btn btn--pequeno btn--contorno" data-order="${esc(order.id)}">Ver detalhes</button><div data-order-details="${esc(order.id)}"></div></article>`; }
async function renderAccount(section=active) {
  active=sections[section]?section:'overview'; const current=++sequence;
  frame(`<div class="conta-layout"><nav class="conta-nav" aria-label="Minha conta">${Object.entries(sections).map(([id,title])=>`<button type="button" data-section="${id}" ${active===id?'aria-current="page"':''}>${title}</button>`).join('')}<button type="button" data-logout>Sair da conta</button></nav><section class="conta-panel" aria-label="${sections[active]}"><h2>${sections[active]}</h2><div data-body><div class="conta-skeleton" aria-label="Carregando"></div></div></section></div>`);
  try {
    let html;
    if(active==='overview') {
      const [orders,addresses,motorcycles]=await Promise.all([api('/orders'),api('/addresses'),api('/motorcycles')]);
      const address=addresses.addresses.find(a=>a.isDefault), motorcycle=motorcycles.motorcycles.find(m=>m.isPrimary);
      html=`<div class="conta-stack"><div class="conta-card"><h3>Olá, ${esc(user.name)}!</h3><p>Seu próximo passeio começa com a peça certa.</p><div class="conta-actions"><a class="btn btn--pequeno" href="catalogo.html">Ver catálogo</a><a class="btn btn--pequeno btn--contorno" href="carrinho.html">Meu carrinho</a><button class="btn btn--pequeno btn--contorno" data-section="favorites">Favoritos</button></div></div><div class="conta-grid"><div class="conta-card"><h3>Moto principal</h3><p>${motorcycle?motorcycleText(motorcycle):'Cadastre sua moto para encontrar peças compatíveis.'}</p><button class="conta-link" data-section="motorcycles">Gerenciar motos</button></div><div class="conta-card"><h3>Endereço padrão</h3><p>${address?addressText(address):'Cadastre um endereço para suas próximas compras.'}</p><button class="conta-link" data-section="addresses">Gerenciar endereços</button></div></div><h3>Últimos pedidos</h3>${orders.orders.slice(0,3).map(orderCard).join('')||empty('Seus pedidos aparecerão aqui após a confirmação do checkout.')}</div>`;
    } else if(active==='profile') html=`<div class="conta-card"><form class="conta-form" data-form="profile">${field('name','Nome completo',user.name,'required minlength="2" maxlength="100" autocomplete="name"')}${field('phone','Telefone',user.phone,'type="tel" required minlength="10" maxlength="20" autocomplete="tel"')}${field('email','E-mail',user.email,'type="email" required autocomplete="email"')}<label>Senha atual (obrigatória para trocar o e-mail)<input class="entrada" type="password" name="currentPassword" autocomplete="current-password"></label><p class="conta-note">${user.emailVerifiedAt?'E-mail verificado.':'E-mail ainda não verificado. A verificação depende do serviço de e-mail da loja.'}</p><button class="btn" type="submit">Salvar dados</button></form></div>`;
    else if(active==='addresses') {
      const {addresses}=await api('/addresses'); root._addresses=addresses;
      html=`<div class="conta-stack"><div class="conta-actions"><button class="btn" data-new-address>Novo endereço</button></div><div data-editor></div>${addresses.map(a=>`<article class="conta-card"><h3>${esc(a.recipientName)}</h3>${a.isDefault?'<span class="conta-badge">Padrão</span>':''}<p>${addressText(a)}</p><p class="conta-note">${esc(a.phone)}</p><div class="conta-actions"><button class="btn btn--pequeno btn--contorno" data-edit-address="${esc(a.id)}">Editar</button>${!a.isDefault?`<button class="conta-link" data-default-address="${esc(a.id)}">Definir como padrão</button>`:''}<button class="conta-link" data-delete-address="${esc(a.id)}">Excluir</button></div></article>`).join('')||empty('Nenhum endereço cadastrado.')}</div>`;
    } else if(active==='motorcycles') {
      const {motorcycles}=await api('/motorcycles'); root._motorcycles=motorcycles;
      html=`<div class="conta-stack"><div class="conta-actions"><button class="btn" data-new-motorcycle>Cadastrar moto</button></div><div data-editor></div>${motorcycles.map(m=>`<article class="conta-card"><h3>${esc(m.nickname||m.model)}</h3>${m.isPrimary?'<span class="conta-badge">Principal</span>':''}<p>${motorcycleText(m)}</p><div class="conta-actions"><button class="btn btn--pequeno" data-use-motorcycle="${esc(m.id)}">Ver peças compatíveis</button><button class="btn btn--pequeno btn--contorno" data-edit-motorcycle="${esc(m.id)}">Editar</button>${!m.isPrimary?`<button class="conta-link" data-primary-motorcycle="${esc(m.id)}">Definir principal</button>`:''}<button class="conta-link" data-delete-motorcycle="${esc(m.id)}">Excluir</button></div></article>`).join('')||empty('Cadastre sua primeira moto. Usamos somente as compatibilidades do catálogo.')}</div>`;
    } else if(active==='favorites') {
      const {products}=await api('/favorites');
      html=`<div class="conta-stack">${products.map(p=>`<article class="conta-card conta-product">${p.images?.[0]?.imageUrl?`<img src="${esc(p.images[0].imageUrl)}" alt="${esc(p.name)}" loading="lazy">`:''}<div><h3><a href="produto.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3><p>${money(p.priceCents)}</p><div class="conta-actions"><button class="btn btn--pequeno" data-add-product="${esc(p.id)}" ${p.stock<1?'disabled':''}>${p.stock<1?'Sem estoque':'Adicionar ao carrinho'}</button><button class="conta-link" data-delete-favorite="${esc(p.id)}">Remover favorito</button></div></div></article>`).join('')||empty('Salve seus produtos favoritos tocando no coração do catálogo.')}</div>`;
    } else if(active==='orders') { const {orders}=await api('/orders'); html=`<div class="conta-stack">${orders.map(orderCard).join('')||empty('Você ainda não tem pedidos nesta conta.')}</div>`; }
    else {
      const {sessions}=await api('/sessions');
      html=`<div class="conta-stack"><div class="conta-card"><h3>Alterar senha</h3><form class="conta-form" data-form="password">${password('currentPassword','Senha atual')}${password('password','Nova senha','new-password')}<button class="btn" type="submit">Alterar senha</button></form></div><div class="conta-card"><h3>Sessões conectadas</h3><p class="conta-note">Encerre o acesso de dispositivos que você não reconhece.</p>${sessions.map(s=>`<div class="conta-actions"><span>Sessão iniciada em ${date(s.createdAt)}${s.current?' · Este dispositivo':''}</span><button class="conta-link" data-delete-session="${esc(s.id)}">Encerrar sessão</button></div>`).join('')}<div class="conta-actions"><button class="btn btn--contorno" data-logout>Sair deste dispositivo</button></div></div></div>`;
    }
    if(current===sequence && root.querySelector('[data-body]')) {
      root.querySelector('[data-body]').innerHTML=html;
      if(active==='profile' && !user.emailVerifiedAt) root.querySelector('[data-body]').insertAdjacentHTML('beforeend','<div class="conta-actions"><button class="btn btn--contorno" type="button" data-request-verification>Solicitar verificação do e-mail</button></div>');
    }
  } catch(error) { if(current!==sequence) return; message(error.message,true); const body=root.querySelector('[data-body]'); if(body) body.innerHTML='<button class="btn btn--contorno" data-retry>Tentar novamente</button>'; }
}
function addressEditor(a={}) {
  root.querySelector('[data-editor]').innerHTML=`<div class="conta-card"><h3>${a.id?'Editar endereço':'Novo endereço'}</h3><form class="conta-form" data-form="address" data-id="${esc(a.id||'')}"><div class="conta-grid">${field('recipientName','Destinatário',a.recipientName||user.name,'required maxlength="100" autocomplete="shipping name"')}${field('phone','Telefone',a.phone||user.phone,'required type="tel" maxlength="20" autocomplete="shipping tel"')}${field('zipCode','CEP',a.zipCode,'required inputmode="numeric" pattern="[0-9]{5}-?[0-9]{3}" autocomplete="shipping postal-code"')}${field('street','Rua',a.street,'required maxlength="150" autocomplete="shipping address-line1"')}${field('number','Número',a.number,'required maxlength="20"')}${field('complement','Complemento',a.complement,'maxlength="100" autocomplete="shipping address-line2"')}${field('neighborhood','Bairro',a.neighborhood,'required maxlength="100"')}${field('city','Cidade',a.city,'required maxlength="100" autocomplete="shipping address-level2"')}${field('state','Estado (UF)',a.state,'required minlength="2" maxlength="2" pattern="[A-Za-z]{2}" autocomplete="shipping address-level1"')}</div><label class="conta-check"><input type="checkbox" name="isDefault" ${a.isDefault?'checked':''}> Usar como endereço padrão</label><div class="conta-actions"><button class="btn" type="submit">Salvar endereço</button><button class="conta-link" type="button" data-cancel-editor>Cancelar</button></div></form></div>`;
  root.querySelector('[data-editor] input').focus();
}
function motorcycleEditor(m={}) {
  root.querySelector('[data-editor]').innerHTML=`<div class="conta-card"><h3>${m.id?'Editar moto':'Cadastrar moto'}</h3><form class="conta-form" data-form="motorcycle" data-id="${esc(m.id||'')}"><div class="conta-grid"><label>Marca<select name="brand" class="entrada" required><option value="">Selecione</option>${MARCAS.map(b=>`<option value="${esc(b.nome)}" ${m.brand===b.nome?'selected':''}>${esc(b.nome)}</option>`).join('')}</select></label><label>Modelo<select name="model" class="entrada" required></select></label><label>Versão<select name="version" class="entrada"></select></label><label>Ano<select name="year" class="entrada" required></select></label>${field('nickname','Apelido (opcional)',m.nickname,'maxlength="60"')}</div><label class="conta-check"><input type="checkbox" name="isPrimary" ${m.isPrimary?'checked':''}> Minha moto principal</label><p class="conta-note">As opções vêm do localizador da loja. Cadastrar uma moto não cria compatibilidades novas.</p><div class="conta-actions"><button class="btn" type="submit">Salvar moto</button><button class="conta-link" type="button" data-cancel-editor>Cancelar</button></div></form></div>`;
  const form=root.querySelector('[data-form="motorcycle"]');
  for(const [name,title] of Object.entries({brand:'Marca',model:'Modelo',version:'Versão',year:'Ano'})) form.elements[name].setAttribute('aria-label',title);
  motorcycleOptions(form,'brand',m);
}
function motorcycleOptions(form,changed,saved={}) {
  const brand=form.elements.brand.value;
  if(changed==='brand') { form.elements.model.innerHTML='<option value="">Selecione</option>'+modelosDaMarca(brand).map(m=>{ const name=typeof m==='string'?m:m.nome; return `<option value="${esc(name)}">${esc(name)}</option>`; }).join(''); form.elements.model.value=saved.model||''; }
  const model=form.elements.model.value;
  if(changed!=='version') { form.elements.version.innerHTML='<option value="">Todas as versões</option>'+versoesDoModelo(brand,model).map(v=>{ const name=typeof v==='string'?v:v.nome; return `<option value="${esc(name)}">${esc(name)}</option>`; }).join(''); form.elements.version.value=saved.version||''; }
  form.elements.year.innerHTML='<option value="">Selecione</option>'+anosDoModelo(brand,model,form.elements.version.value||null).map(y=>`<option value="${y}">${y}</option>`).join(''); if(saved.year) form.elements.year.value=saved.year;
}
async function handleSubmit(event) {
  const form=event.target.closest('form[data-form]'); if(!form) return; event.preventDefault(); if(!form.reportValidity()) return;
  const button=form.querySelector('[type=submit]'); button.disabled=true; message();
  const body=Object.fromEntries(new FormData(form)), kind=form.dataset.form;
  try {
    if(kind==='login'||kind==='register') { if(kind==='login') body.remember=form.elements.remember.checked; user=(await api(`/auth/${kind}`,{method:'POST',body})).user; await initializeAccount(); window.dispatchEvent(new CustomEvent('raquel:auth-changed',{detail:{user}})); afterLogin(); }
    else if(kind==='forgot') { const result=await api('/auth/forgot-password',{method:'POST',body}); message(result.message||'Se o e-mail estiver cadastrado, você receberá instruções quando o serviço estiver configurado.'); }
    else if(kind==='reset') { await api('/auth/reset-password',{method:'POST',body:{token:new URLSearchParams(location.search).get('reset'),password:body.password}}); history.replaceState(null,'','conta.html'); renderAuth(); message('Senha redefinida. Entre com sua nova senha.'); }
    else if(kind==='profile') { if(!body.currentPassword) delete body.currentPassword; user=(await api('/profile',{method:'PATCH',body})).user; await renderAccount(); message('Seus dados foram atualizados.'); }
    else if(kind==='password') { await api('/profile/password',{method:'POST',body}); form.reset(); message('Senha alterada com segurança.'); }
    else if(kind==='address'||kind==='motorcycle') { const address=kind==='address'; body[address?'isDefault':'isPrimary']=form.elements[address?'isDefault':'isPrimary'].checked; if(address) body.state=body.state.toUpperCase(); else { body.year=Number(body.year); body.version=body.version||null; } await api(`/${address?'addresses':'motorcycles'}${form.dataset.id?`/${encodeURIComponent(form.dataset.id)}`:''}`,{method:form.dataset.id?'PATCH':'POST',body}); await renderAccount(); message(address?'Endereço salvo.':'Moto salva.'); }
  } catch(error) { message(error.message,true); } finally { if(button.isConnected) button.disabled=false; }
}
async function handleClick(event) {
  const button=event.target.closest('button'); if(!button||button.disabled) return;
  if(button.hasAttribute('data-reveal')) { const input=button.previousElementSibling; input.type=input.type==='password'?'text':'password'; button.textContent=input.type==='password'?'Mostrar':'Ocultar'; button.setAttribute('aria-label',`${button.textContent} senha`); button.setAttribute('aria-pressed',String(input.type==='text')); return; }
  if(button.dataset.auth) { renderAuth(button.dataset.auth); return; }
  if(button.dataset.section) { await renderAccount(button.dataset.section); return; }
  if(button.hasAttribute('data-retry')) { await renderAccount(); return; }
  if(button.hasAttribute('data-new-address')) { addressEditor(); return; }
  if(button.hasAttribute('data-new-motorcycle')) { motorcycleEditor(); return; }
  if(button.dataset.editAddress) { addressEditor(root._addresses.find(a=>a.id===button.dataset.editAddress)); return; }
  if(button.dataset.editMotorcycle) { motorcycleEditor(root._motorcycles.find(m=>m.id===button.dataset.editMotorcycle)); return; }
  if(button.hasAttribute('data-cancel-editor')) { root.querySelector('[data-editor]').innerHTML=''; return; }
  if(button.dataset.useMotorcycle) { const m=root._motorcycles.find(item=>item.id===button.dataset.useMotorcycle); motoStore.salvar({marca:m.brand,modelo:m.model,versao:m.version,ano:m.year}); location.assign('catalogo.html?moto=1'); return; }
  button.disabled=true;
  try {
    if(button.hasAttribute('data-request-verification')) { const result=await api('/auth/request-verification',{method:'POST'}); message(result.message||'Solicitação recebida. O envio depende do serviço de e-mail configurado.'); return; }
    if(button.hasAttribute('data-logout')) { await api('/auth/logout',{method:'POST'}); user=null; esquecerConta(); window.dispatchEvent(new CustomEvent('raquel:auth-changed',{detail:{user:null}})); renderAuth(); message('Você saiu da conta.'); return; }
    if(button.dataset.order) { const {order}=await api(`/orders/${encodeURIComponent(button.dataset.order)}`); const target=[...root.querySelectorAll('[data-order-details]')].find(el=>el.dataset.orderDetails===order.id); target.innerHTML=`<ul class="conta-order-items">${order.items.map(i=>`<li>${esc(i.nameSnapshot)} · ${i.quantity} × ${money(i.unitPriceCents)} = ${money(i.totalCents)}</li>`).join('')}</ul><p>Subtotal: ${money(order.subtotalCents)}<br>Desconto: ${money(order.discountCents)}<br>Frete: ${money(order.shippingCents)}</p><p>Pagamento: ${esc(methodNames[order.paymentMethod]||order.paymentMethod)} · ${esc(paymentNames[order.paymentStatus]||order.paymentStatus)}</p>${order.pickupCode?`<p><strong>Código de retirada: ${esc(order.pickupCode)}</strong></p><p class="conta-note">Apresente na loja. A retirada exige pagamento confirmado.</p>`:order.pickedUpAt?`<p>Retirada confirmada em ${esc(new Date(order.pickedUpAt).toLocaleString('pt-BR'))}.</p>`:''}${order.addressSnapshot?`<p>${addressText(order.addressSnapshot)}</p>`:''}<p class="conta-note">Pagamento realizado na retirada, diretamente na loja. O recebimento é confirmado pela equipe.</p>`; return; }
    if(button.dataset.addProduct) { const {carrinho,aguardarSincronizacao}=await import('./carrinho.js'); const result=carrinho.adicionar(button.dataset.addProduct,1); if(!result.ok) throw new Error(result.mensagem||'Não foi possível adicionar este produto. Verifique o estoque.'); await aguardarSincronizacao(); message('Produto adicionado ao carrinho.'); return; }
    const removal=button.dataset.deleteAddress?['addresses',button.dataset.deleteAddress,'Excluir este endereço?']:button.dataset.deleteMotorcycle?['motorcycles',button.dataset.deleteMotorcycle,'Excluir esta moto?']:button.dataset.deleteFavorite?['favorites',button.dataset.deleteFavorite,null]:button.dataset.deleteSession?['sessions',button.dataset.deleteSession,'Encerrar esta sessão?']:null;
    if(removal) { if(removal[2]&&!confirm(removal[2])) return; await api(`/${removal[0]}/${encodeURIComponent(removal[1])}`,{method:'DELETE'}); if(removal[0]==='favorites') await sincronizarConta(); await renderAccount(); message('Alteração concluída.'); }
    if(button.dataset.defaultAddress) { await api(`/addresses/${encodeURIComponent(button.dataset.defaultAddress)}`,{method:'PATCH',body:{isDefault:true}}); await renderAccount(); message('Endereço padrão atualizado.'); }
    if(button.dataset.primaryMotorcycle) { await api(`/motorcycles/${encodeURIComponent(button.dataset.primaryMotorcycle)}`,{method:'PATCH',body:{isPrimary:true}}); await renderAccount(); message('Moto principal atualizada.'); }
  } catch(error) { message(error.message,true); } finally { if(button.isConnected) button.disabled=false; }
}
