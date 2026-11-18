import {esc,moeda} from './utils.js';
import {dataEquipe,statusPedido} from './admin-funcionario.js';
const money=value=>moeda(Number(value||0)/100);
const method=value=>({CASH:'Dinheiro',PIX:'Pix presencial',CARD:'Cartão na maquininha'})[value]||value;
const section=(title,body)=>`<section class="admin-summary-panel"><h2>${esc(title)}</h2>${body}</section>`;
export function cardsPagamentos(payments){
  if(!payments.length)return section('Recebimentos','<p class="texto-2">Nenhum pagamento encontrado nesta consulta.</p>');
  return `<div class="admin-payment-grid">${payments.map(p=>`<article class="admin-payment-card"><div class="admin-item-card__top"><span class="admin-tag admin-tag--active">Recebido</span><span>${esc(method(p.method))}</span></div><h2>${money(p.amountCents)}</h2><strong>${esc(p.order?.orderNumber||p.orderId)}</strong><p>${esc(dataEquipe(p.createdAt))}</p><p class="micro texto-2">Atendente: ${esc(p.employee?.name||'Equipe')}</p></article>`).join('')}</div>`;
}
export function resumoRelatorios({summary={},statuses=[],payments=[],topProducts=[],notice}){
  const values=[['Pedidos',summary._count||0],['Total em pedidos',money(summary._sum?.totalCents)],['Descontos',money(summary._sum?.discountCents)],['Recebido no balcão',money(payments.reduce((sum,p)=>sum+Number(p._sum?.amountCents||0),0))]];
  const max=Math.max(1,...statuses.map(s=>Number(s._count||0)));
  return `<p class="admin-section-note">${esc(notice||'Valores de pedidos incluem situações pendentes ou canceladas. Recebimentos consideram somente pagamentos confirmados.')}</p><div class="admin-metrics">${values.map(([title,value])=>`<article class="cartao-metrica"><span class="cartao-metrica__rotulo">${esc(title)}</span><strong class="cartao-metrica__valor">${esc(value)}</strong></article>`).join('')}</div><div class="admin-report-grid">${section('Pedidos por situação',statuses.length?statuses.map(s=>`<div class="admin-report-row"><span>${esc(statusPedido(s.status))}</span><strong>${esc(s._count||0)}</strong><div class="admin-report-track" aria-hidden="true"><i style="width:${Math.round(Number(s._count||0)/max*100)}%"></i></div></div>`).join(''):'<p>Nenhum pedido registrado.</p>')}${section('Recebimentos por método',payments.length?payments.map(p=>`<div class="admin-report-row"><span>${esc(method(p.method))}<small>${esc(p._count||0)} recebimentos</small></span><strong>${money(p._sum?.amountCents)}</strong></div>`).join(''):'<p>Nenhum recebimento confirmado.</p>')}${section('Produtos mais pedidos',topProducts.length?`<ol class="admin-ranking">${topProducts.map(p=>`<li><div><strong>${esc(p.nameSnapshot||p.productId)}</strong><small>${esc(p._sum?.quantity||0)} unidades</small></div><span>${money(p._sum?.totalCents)}</span></li>`).join('')}</ol>`:'<p>Os produtos aparecerão após os primeiros pedidos.</p>')}</div>`;
}
export function organizarConfiguracoes(form){
  const grid=form.querySelector('.admin-field-grid');
  const groups=[['Identidade e contato',['name','phone','email']],['Endereço da loja',['address','neighborhood','city','state','zipCode','addressConfirmed']],['Horários e confirmação',['openingHours','currentPassword']]];
  const fields=groups.map(([title,names])=>{const fieldset=document.createElement('fieldset');fieldset.className='admin-settings-group';const legend=document.createElement('legend');legend.textContent=title;fieldset.append(legend);for(const name of names){const label=form.elements[name]?.closest('label');if(label)fieldset.append(label);}return fieldset;});
  grid.replaceChildren(...fields);grid.classList.add('admin-settings-fields');
}
