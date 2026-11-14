import { api } from './api.js';
import { esc, icone } from './utils.js';

const adminMenu = [
  ['dashboard','Dashboard','painel'], ['produtos','Produtos','caixa'], ['categorias','Categorias','etiqueta'],
  ['estoque','Estoque','grafico'], ['pedidos','Pedidos','sacola'], ['clientes','Clientes','usuarios'],
  ['funcionarios','Funcionários','usuarios'], ['cupons','Cupons','etiqueta'], ['atendimento','Atendimento','loja'],
  ['pagamentos','Pagamentos','carteira'], ['retiradas','Retiradas','caixa'], ['relatorios','Relatórios','grafico'],
  ['configuracoes','Configurações','ajuste'],
];
const staffMenu = [['pedidos','Pedidos','sacola'], ['atendimento','Atendimento','loja'], ['historico','Histórico','relogio']];
export const destinoPorPerfil = user => user?.role === 'ADMIN' ? 'painel.html' : user?.role === 'STAFF' ? 'funcionario.html' : null;

export async function montarAdmin() { return montarPainel('ADMIN'); }
export async function montarPainel(role) {
  const content = document.getElementById('conteudo-admin');
  content.innerHTML = '<p role="status">Verificando sua sessão…</p>';
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
    document.getElementById('subtitulo-secao').textContent = role === 'ADMIN' ? 'Gestão com dados do servidor e ações identificadas.' : 'Atenda pedidos e acompanhe o histórico das suas operações.';
    const slot = document.createElement('div');
    content.replaceChildren(slot);
    await render(slot,section[0],draw);
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
