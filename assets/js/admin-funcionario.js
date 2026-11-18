import { api } from './api.js';
import { esc, moeda } from './utils.js';
import { montarAtendimento } from './admin-atendimento.js';

const listStates = new Map();
export function estadoLista(key) {
  if(!listStates.has(key))listStates.set(key,{take:50,skip:0,q:'',status:''});
  return listStates.get(key);
}
export function caminhoLista(path,key) {
  const state=estadoLista(key),query=new URLSearchParams({take:String(state.take),skip:String(state.skip)});
  if(state.q)query.set('q',state.q);
  if(state.status)query.set('status',state.status);
  return `${path}?${query}`;
}
export function controlesLista(root,key,items,data,refresh,{search='',statuses=false}={}) {
  const state=estadoLista(key),list=root.querySelector('[data-list]')||root;
  const wrapper=document.createElement('div');wrapper.className='admin-list-controls';
  wrapper.innerHTML=`<form class="admin-list-search">${search?`<label>${esc(search)}<input class="entrada" name="q" type="search" maxlength="100" value="${esc(state.q)}" placeholder="${esc(search)}"></label>`:''}${statuses?`<label>Situação<select class="entrada" name="status" aria-label="Situação"><option value="">${key==='staff-orders'?'Em atendimento':'Todas'}</option>${['PENDING','CONFIRMED','READY','SHIPPED','COMPLETED','CANCELLED'].map(status=>`<option value="${status}" ${state.status===status?'selected':''}>${esc(statusPedido(status))}</option>`).join('')}</select></label>`:''}<label>Registros por página<select class="entrada" name="take" aria-label="Registros por página">${[25,50,100].map(take=>`<option value="${take}" ${state.take===take?'selected':''}>${take}</option>`).join('')}</select></label><button class="btn btn--pequeno btn--contorno" type="submit">${search?'Buscar / aplicar':'Aplicar'}</button></form>`;
  wrapper.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;state.q=form.elements.q?.value.trim()||'';state.status=form.elements.status?.value||'';state.take=Number(form.elements.take.value);state.skip=0;refresh();});
  list.prepend(wrapper);
  const footer=document.createElement('div');footer.className='admin-actions';
  const total=typeof data.total==='number'?data.total:null;
  const hasNext=total!==null?state.skip+items.length<total:items.length===state.take;
  footer.innerHTML=`<p role="status">${items.length?`${state.skip+1}–${state.skip+items.length}`:'Nenhum registro'}${total!==null?` de ${total}`:''} · Página ${Math.floor(state.skip/state.take)+1}</p><button class="btn btn--pequeno btn--contorno" type="button" data-page-prev ${state.skip===0?'disabled':''}>Anterior</button><button class="btn btn--pequeno btn--contorno" type="button" data-page-next ${!hasNext?'disabled':''}>Próxima</button>`;
  footer.querySelector('[data-page-prev]').addEventListener('click',()=>{state.skip=Math.max(0,state.skip-state.take);refresh();});
  footer.querySelector('[data-page-next]').addEventListener('click',()=>{state.skip+=state.take;refresh();});
  list.append(footer);
}

export const statusPedido = status => ({PENDING:'Aguardando atendimento',CONFIRMED:'Confirmado',READY:'Pronto para retirada',SHIPPED:'Enviado',COMPLETED:'Retirado',CANCELLED:'Cancelado'})[status] || status;
export const dataEquipe = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
export function tabelaEquipe(headers,rows) {
  if(!rows.length) return '<div class="painel"><div class="painel__corpo"><p>Nenhum registro encontrado.</p></div></div>';
  return `<div class="tabela-wrap"><table class="tabela"><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,index)=>`<td data-label="${esc(headers[index])}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
export function tabelaPedidos(orders,actions=false) {
  return `<div class="admin-orders-list">${tabelaEquipe(['Pedido','Cliente','Data','Total','Situação','Pagamento',...(actions?['Ações']:[])],orders.map(order=>[
    esc(order.orderNumber),esc(order.user?.name || order.customerName || 'Cliente'),dataEquipe(order.createdAt),moeda(order.totalCents/100),esc(statusPedido(order.status)),order.paymentStatus==='PAID'?'Recebido':'Pendente',
    ...(actions?[`<button class="btn btn--pequeno btn--contorno" type="button" data-order="${esc(order.id)}">Ver detalhes</button>`]:[]),
  ]))}</div>`;
}
export function tabelaHistorico(events) {
  const actions={PAYMENT:'Pagamento recebido',PICKUP:'Produtos entregues',CANCEL:'Pedido cancelado',COUNTER_PAYMENT:'Pagamento recebido',ORDER_CANCELLED:'Pedido cancelado',ORDER_PICKED_UP:'Produtos entregues',PICKED_UP:'Produtos entregues',CANCELLED_STOCK_RETURNED:'Cancelado e estoque devolvido',PREPARATION_STATUS:'Etapa de preparação atualizada'};
  return tabelaEquipe(['Data','Pedido','Operação','Responsável','Observação'],events.map(event=>[
    dataEquipe(event.createdAt),esc(event.order?.orderNumber||event.orderNumber||event.orderId||'—'),esc(actions[event.action||event.type]||event.action||event.type||'Operação registrada'),esc(event.employee?.name||event.actor?.name||event.employeeId||'Equipe'),esc(event.reason||event.details?.reason||'—'),
  ]));
}
export async function montarFuncionario(root,section) {
  root.innerHTML='<p role="status">Consultando o servidor…</p>';
  try {
    if(section==='atendimento') { await montarAtendimento(root); return; }
    if(section==='historico') {
      const data=await api(caminhoLista('/staff/history','staff-history')),{events}=data;
      root.innerHTML=`<p class="texto-2">Operações registradas no servidor com a sua identificação.</p>${tabelaHistorico(events)}`;
      controlesLista(root,'staff-history',events,data,()=>montarFuncionario(root,section));
    } else {
      const data=await api(caminhoLista('/staff/orders','staff-orders')),{orders}=data;
      root.innerHTML=`<div class="admin-actions"><a class="btn" href="#atendimento">Atender uma retirada</a></div><p class="texto-2">Consulte o pedido com o código apresentado pelo cliente. Os códigos não são exibidos nesta lista.</p>${tabelaPedidos(orders)}`;
      controlesLista(root,'staff-orders',orders,data,()=>montarFuncionario(root,section),{search:'Buscar número do pedido',statuses:true});
    }
  } catch(error) {
    root.innerHTML=`<div class="mensagem mensagem--erro" role="alert">${esc(error.message)}</div><button class="btn btn--contorno" data-retry>Tentar novamente</button>`;
    root.querySelector('[data-retry]')?.addEventListener('click',()=>montarFuncionario(root,section));
  }
}
