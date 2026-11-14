import {api} from './api.js';
import {esc,moeda} from './utils.js';
export async function montarAtendimento(root) {
  root.innerHTML='<p role="status">Verificando acesso ao atendimento…</p>';
  try {
    const {user}=await api('/auth/me');
    if(!['STAFF','ADMIN'].includes(user.role))throw new Error('Entre com sua conta individual autorizada da equipe.');
  } catch(error){root.innerHTML=`<div class="mensagem mensagem--erro" role="alert">${esc(error.message)} <a href="login.html">Entrar como funcionário</a></div>`;return;}
  root.innerHTML=`<section class="bloco atendimento-real"><h2>Atendimento de retirada</h2><p>Pagamento realizado na retirada, diretamente na loja</p>
    <form id="atendimento-busca"><div class="campo"><label class="campo__rotulo" for="atendimento-pedido">Número ou identificação do pedido</label><input class="entrada" id="atendimento-pedido" required maxlength="100"></div>
    <div class="campo"><label class="campo__rotulo" for="atendimento-codigo">Código de retirada</label><input class="entrada" id="atendimento-codigo" inputmode="numeric" pattern="[0-9]{5}" minlength="5" maxlength="5" autocomplete="off" required></div>
    <button class="btn" type="submit">Consultar pedido</button></form><p id="atendimento-feedback" role="status" aria-live="polite"></p><div id="atendimento-resultado"></div></section>`;
  const form=root.querySelector('form'),feedback=root.querySelector('#atendimento-feedback'),result=root.querySelector('#atendimento-resultado');let order,code;
  const names={CASH:'Dinheiro',PIX:'Pix presencial',CARD:'Cartão na maquininha',ON_PICKUP:'Definido no balcão'};
  function draw(){
    const closed=['COMPLETED','CANCELLED'].includes(order.status);
    result.innerHTML=`<h3>Pedido ${esc(order.orderNumber)}</h3><p>Cliente: ${esc(order.user.name)}</p><ul>${order.items.map(i=>`<li>${esc(i.nameSnapshot)} — ${i.quantity} × ${moeda(i.unitPriceCents/100)}</li>`).join('')}</ul><p><strong>Total: ${moeda(order.totalCents/100)}</strong></p><p>Situação: ${esc(({COMPLETED:'Retirado',CANCELLED:'Cancelado',PENDING:'Aguardando atendimento',CONFIRMED:'Pagamento recebido',READY:'Pronto para retirada'})[order.status]||order.status)}</p><p>Pagamento: ${order.paymentStatus==='PAID'?'Confirmado':'Pendente'} · ${esc(names[order.paymentMethod]||order.paymentMethod)}</p>
    ${!closed&&order.paymentStatus==='PENDING'?`<div class="campo"><label class="campo__rotulo" for="atendimento-metodo">Método recebido no balcão</label><select class="entrada" id="atendimento-metodo"><option value="CASH">Dinheiro</option><option value="PIX">Pix presencial</option><option value="CARD">Cartão na maquininha</option></select></div><button class="btn" type="button" data-balcao="payment">Confirmar recebimento do pagamento</button> `:''}
    ${!closed&&order.paymentStatus==='PAID'?'<button class="btn" type="button" data-balcao="pickup">Confirmar entrega dos produtos</button>':''}
    ${!closed&&order.paymentStatus==='PENDING'?'<button class="btn btn--contorno" type="button" data-balcao="cancel">Cancelar pedido e devolver estoque</button>':''}
    ${order.counterPayment?`<p class="micro">Recebimento registrado em ${esc(new Date(order.counterPayment.createdAt).toLocaleString('pt-BR'))}. Funcionário: ${esc(order.counterPayment.employeeId)}.</p>`:''}
    ${order.pickedUpAt?`<p>Entrega registrada em ${esc(new Date(order.pickedUpAt).toLocaleString('pt-BR'))}.</p>`:''}`;
  }
  async function lookup(identifier){const data=await api('/staff/orders/lookup',{method:'POST',body:{identifier,code}});order=data.order;draw();}
  async function busy(fn){for(const b of root.querySelectorAll('button'))b.disabled=true;feedback.textContent='Consultando o servidor…';try{await fn();feedback.textContent='Operação confirmada pelo servidor.';}catch(e){feedback.textContent=e.message;result.querySelectorAll('[data-balcao]').forEach(b=>b.disabled=true);}finally{for(const b of form.querySelectorAll('button'))b.disabled=false;}}
  form.addEventListener('submit',e=>{e.preventDefault();code=form.querySelector('#atendimento-codigo').value;result.innerHTML='';busy(()=>lookup(form.querySelector('#atendimento-pedido').value.trim()));});
  result.addEventListener('click',e=>{const button=e.target.closest('[data-balcao]');if(!button||button.disabled)return;const action=button.dataset.balcao;let body={code};
    if(action==='payment'){body.method=result.querySelector('select').value;if(!confirm(`Confirma que recebeu ${moeda(order.totalCents/100)} em ${names[body.method]}?`))return;}
    if(action==='pickup'&&!confirm('Confirma que está entregando todos os produtos deste pedido?'))return;
    if(action==='cancel'){const reason=prompt('Motivo do cancelamento (mínimo 3 caracteres):');if(!reason||reason.trim().length<3)return;body.reason=reason.trim();if(!confirm('Cancelar o pedido e devolver os itens ao estoque?'))return;}
    busy(async()=>{await api(`/staff/orders/${encodeURIComponent(order.id)}/${action}`,{method:'POST',body});await lookup(order.id);});
  });
}
