import { api } from './api.js';
import { esc, icone } from './utils.js';
import {carregamentoPainel} from './admin-carregamento.js';

const adminMenu = [
  ['atendimento','Atendimento','loja'], ['dashboard','Dashboard','painel'], ['pedidos','Pedidos','sacola'], ['retiradas','Retiradas','caixa'],
  ['produtos','Produtos','caixa'], ['categorias','Categorias','etiqueta'], ['estoque','Estoque','grafico'], ['clientes','Clientes','usuarios'],
  ['funcionarios','Funcionários','usuarios'], ['cupons','Cupons','etiqueta'],
  ['pagamentos','Pagamentos','carteira'], ['relatorios','Relatórios','grafico'],
  ['configuracoes','Configurações','ajuste'],
];
const staffMenu = [['atendimento','Atendimento','loja'], ['dashboard','Dashboard','painel'], ['pedidos','Pedidos','sacola'], ['retiradas','Retiradas','caixa'], ['clientes','Clientes','usuarios'], ['historico','Histórico','relogio']];
export const destinoPorPerfil = user => user?.role === 'ADMIN' ? 'painel.html' : user?.role === 'STAFF' ? 'funcionario.html' : null;

export async function montarAdmin() { return montarPainel('ADMIN'); }
export async function montarPainel(role) {
  const content = document.getElementById('conteudo-admin');
  content.innerHTML = carregamentoPainel('Verificando sua sessão');
  let user;
  try { user = (await api('/auth/me')).user; }
  catch (error) {
    if (error.status === 401) { location.replace('login.html'); return; }
    content.innerHTML = `<div class="mensagem mensagem--erro" role="alert">${esc(error.message)} <a href="${role === 'ADMIN' ? 'painel.html' : 'funcionario.html'}">Tentar novamente</a></div>`;
    return;
  }
  const destination = destinoPorPerfil(user);
  if (!destination) { location.replace('login.html?acesso=negado'); return; }
  if (user.role !== role) { location.replace(destination); return; }
  // Authenticate and redirect before downloading the management interface.
  const render = role === 'ADMIN'
    ? (await import('./admin-gestao.js')).montarGestao
    : (await import('./admin-funcionario.js')).montarFuncionario;
  // Old presentation flags never authorize the real panel.
  try { sessionStorage.removeItem('motopecas-admin-sessao'); } catch {}
  document.getElementById('simbolo-admin').innerHTML = icone('moto',23);
  document.querySelector('.admin__usuario .forte').textContent = user.name;
  document.querySelector('.admin__usuario .micro').textContent = role === 'ADMIN' ? 'Administradora · sessão individual' : 'Funcionário · sessão individual';
  const avatar = document.querySelector('.admin__usuario .avaliacao__avatar');
  if (avatar) avatar.textContent = user.name.trim().slice(0,2).toUpperCase();
  document.querySelector('.admin__rodape').prepend(document.querySelector('.admin__usuario'));
  if(role==='STAFF'){
    const switchButton=document.createElement('button');switchButton.type='button';switchButton.className='link-simples';switchButton.textContent='Trocar atendente';
    document.querySelector('.admin__usuario').append(switchButton);
    switchButton.addEventListener('click',async()=>{switchButton.disabled=true;try{await api('/auth/logout',{method:'POST'});location.replace('login.html?modo=balcao');}catch(error){switchButton.disabled=false;content.prepend(Object.assign(document.createElement('p'),{textContent:error.message,role:'alert'}));}});
  }
  const menu = role === 'ADMIN' ? adminMenu : staffMenu;
  const nav = document.getElementById('menu-admin');
  nav.innerHTML = menu.map(([id,title,icon]) => `<a class="admin__menu-item" href="#${id}" data-secao="${id}" aria-label="${title}">${icone(icon,18)}<span class="admin__menu-rotulo">${title}</span></a>`).join('');
  const draw = async () => {
    const requested = location.hash.slice(1), section = menu.find(item => item[0] === requested) || menu[0];
    if (requested !== section[0]) history.replaceState(null,'',`#${section[0]}`);
    for (const item of nav.querySelectorAll('[data-secao]')) {
      const selected = item.dataset.secao === section[0];
      item.setAttribute('aria-current',String(selected));
    }
    document.getElementById('titulo-secao').textContent = section[1];
    const subtitles={atendimento:'Consulte o código, receba e entregue os produtos.',dashboard:'Pedidos e movimentação da loja em um só lugar.',produtos:'Organize os produtos por categoria e atualize o catálogo.',categorias:'Organize as categorias e suas imagens.',pedidos:'Encontre pedidos por número, produto, cliente ou situação.',retiradas:'Acompanhe os pedidos para retirada na loja.',pagamentos:'Consulte os recebimentos confirmados no balcão.',relatorios:'Entenda os pedidos, produtos e recebimentos.',configuracoes:'Mantenha os dados públicos e o atendimento organizados.'};
    document.getElementById('subtitulo-secao').textContent = subtitles[section[0]] || 'Consulte e gerencie os registros autorizados para sua conta.';
    const slot = document.createElement('div');
    slot.innerHTML = carregamentoPainel(`Carregando ${section[1].toLowerCase()}`);
    content.replaceChildren(slot);
    window.scrollTo({top:0,behavior:'instant'});
    try { await render(slot,section[0],draw); }
    catch(error) {
      slot.innerHTML=`<div class="mensagem mensagem--erro" role="alert">${esc(error.message)}</div><button class="btn btn--contorno" type="button">Tentar novamente</button>`;
      slot.querySelector('button').addEventListener('click',draw);
    }
  };
  document.getElementById('btn-sair').addEventListener('click',async event => {
    const button = event.currentTarget; button.disabled = true;
    try { await api('/auth/logout',{method:'POST'}); location.replace('login.html'); }
    catch (error) { button.disabled = false; content.prepend(Object.assign(document.createElement('p'),{textContent:error.message,role:'alert'})); }
  });
  window.addEventListener('hashchange',draw);
  nav.addEventListener('click',event=>{const link=event.target.closest('[data-secao]');if(link&&location.hash===`#${link.dataset.secao}`){event.preventDefault();draw();}});
  window.addEventListener('raquel:session-expired',()=>location.replace('login.html?acesso=expirado'));
  await draw();
  document.documentElement.dataset.adminReady = 'true';
}
