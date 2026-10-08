/* ============================================================================
   SHELL — cabeçalho, rodapé, menu mobile e barra inferior
   ----------------------------------------------------------------------------
   Existe UMA descrição do header e UMA do footer. Toda página chama
   `montarShell()`. Mudar o menu em um lugar muda o site inteiro.

   O cabeçalho carrega a MOTO ATIVA: depois que a cliente escolhe a moto, ela
   aparece aqui em todas as páginas, com "Trocar moto" a um clique.
   ============================================================================ */

import { LOJA } from './dados.js';
import { icone, esc, $, $$, avisar } from './utils.js';
import { carrinho, moto as motoStore } from './carrinho.js';
import { htmlMotoHeader, htmlMotoAtiva } from './localizador.js';

export const MENU = [
  { id: 'inicio',      rotulo: 'Início',            href: 'index.html' },
  { id: 'pecas',       rotulo: 'Peças',             href: 'catalogo.html' },
  { id: 'acessorios',  rotulo: 'Acessórios',        href: 'catalogo.html?categoria=capacetes,capas' },
  { id: 'localizador', rotulo: 'Encontre sua peça', href: 'localizador.html' },
  { id: 'ofertas',     rotulo: 'Ofertas',           href: 'catalogo.html?ofertas=1' },
  { id: 'contato',     rotulo: 'Contato',           href: 'contato.html' },
];

/* Caminho relativo até a raiz, conforme a página esteja na raiz ou em /admin. */
export function prefixo(raiz) {
  return raiz === '..' ? '../' : '';
}

/* ------------------------------------------------------------- cabeçalho -- */
function htmlHeader(pagina, raiz) {
  const p = prefixo(raiz);
  const moto = motoStore.ler();

  const links = MENU.map(
    (m) => `<a class="nav__link" href="${p}${m.href}"${
      m.id === pagina ? ' aria-current="page"' : ''
    }>${m.rotulo}</a>`
  ).join('');

  return `
<div class="topo">
  <div class="container">
    <div class="topo__itens">
      <span class="topo__item">${icone('caminhao', 14)} Envio para todo o Brasil</span>
      <span class="topo__item">${icone('loja', 14)} Retire na loja em ${esc(LOJA.cidade)}</span>
    </div>
    <div class="topo__itens">
      <a class="topo__item" href="${p}localizador.html">${icone('moto', 14)} Peças para a sua moto</a>
      <a class="topo__item" href="https://wa.me/${LOJA.whatsapp}" target="_blank" rel="noopener">${icone('telefone', 14)} ${esc(LOJA.whatsappExibicao)}</a>
    </div>
  </div>
</div>

<header class="header" id="cabecalho">
  <div class="container">
    <a class="marca" href="${p}index.html" aria-label="${esc(LOJA.nome)} — página inicial">
      <span class="marca__simbolo">${icone('moto', 23)}</span>
      <span class="marca__texto">
        <span class="marca__nome">${esc(LOJA.nome)}</span>
        <span class="marca__tag">Peças e acessórios</span>
      </span>
    </a>

    <nav class="nav" aria-label="Menu principal">${links}</nav>

    <div class="acoes-topo">
      <span data-moto-header>${htmlMotoHeader(moto)}</span>
      <button class="icone-btn" type="button" data-abrir-busca aria-label="Buscar peças">${icone('buscar')}</button>
      <a class="icone-btn" href="${p}conta.html" aria-label="Minha conta">${icone('conta')}</a>
      <a class="icone-btn" href="${p}carrinho.html" aria-label="Carrinho">
        ${icone('carrinho')}
        <span class="icone-btn__contador" data-contador-carrinho hidden>0</span>
      </a>
      <a class="btn btn--pequeno btn--header" href="${p}localizador.html">Encontrar minha peça</a>
      <button class="icone-btn hamburguer" type="button" data-abrir-menu aria-label="Abrir menu" aria-expanded="false">${icone('menu')}</button>
    </div>
  </div>

  <div class="oculto" id="busca-topo">
    <div class="container" style="padding-block:14px">
      <form class="linha" data-form-busca role="search">
        <label class="oculto" for="busca-input">Buscar peças</label>
        <input class="entrada" id="busca-input" type="search" placeholder="Busque por peça, marca ou moto. Ex.: pastilha CG 160" autocomplete="off">
        <button class="btn" type="submit">${icone('buscar', 17)} Buscar</button>
      </form>
    </div>
  </div>
</header>

<div class="menu-mobile" id="menu-mobile" data-aberto="false" aria-hidden="true">
  <div class="menu-mobile__topo">
    <a class="marca" href="${p}index.html">
      <span class="marca__simbolo">${icone('moto', 23)}</span>
      <span class="marca__nome">${esc(LOJA.nome)}</span>
    </a>
    <button class="icone-btn" type="button" data-fechar-menu aria-label="Fechar menu">${icone('fechar')}</button>
  </div>

  <div data-moto-header>${htmlMotoHeader(moto)}</div>

  <nav class="menu-mobile__links mt-3" aria-label="Menu principal (celular)">
    ${MENU.map((m) => `<a class="menu-mobile__link" href="${p}${m.href}">${m.rotulo}</a>`).join('')}
    <a class="menu-mobile__link" href="${p}conta.html">Minha conta</a>
    <a class="menu-mobile__link" href="${p}admin/login.html">Painel da loja</a>
  </nav>

  <div class="menu-mobile__rodape">
    <a class="btn btn--bloco" href="${p}localizador.html">${icone('moto', 18)} Encontrar minha peça</a>
    <a class="btn btn--contorno btn--bloco" href="${p}carrinho.html">${icone('carrinho', 18)} Ver carrinho</a>
  </div>
</div>`;
}

/* ---------------------------------------------------------------- rodapé -- */
function htmlFooter(raiz) {
  const p = prefixo(raiz);
  const ano = new Date().getFullYear();

  const colunas = [
    { t: 'Peças', links: [['Óleos', 'catalogo.html?categoria=oleos'], ['Filtros', 'catalogo.html?categoria=filtros'], ['Freios', 'catalogo.html?categoria=freios'], ['Transmissão', 'catalogo.html?categoria=transmissao']] },
    { t: 'Rodagem e equipamento', links: [['Pneus', 'catalogo.html?categoria=pneus'], ['Capacetes', 'catalogo.html?categoria=capacetes'], ['Capas de chuva', 'catalogo.html?categoria=capas'], ['Ofertas', 'catalogo.html?ofertas=1']] },
  ];

  return `
<footer class="footer">
  <div class="container">
    <div class="footer__grade">
      <div>
        <a class="marca" href="${p}index.html">
          <span class="marca__simbolo">${icone('moto', 23)}</span>
          <span class="marca__texto">
            <span class="marca__nome">${esc(LOJA.nome)}</span>
            <span class="marca__tag">Peças e acessórios</span>
          </span>
        </a>
        <p class="footer__sobre">${esc(LOJA.slogan)}. Encontre a peça pela sua moto, retire na loja ou receba em casa.</p>
      </div>

      ${colunas
        .map(
          (c) => `<div>
            <h3>${esc(c.t)}</h3>
            <div class="footer__links">
              ${c.links.map(([n, h]) => `<a href="${p}${h}">${n}</a>`).join('')}
            </div>
          </div>`
        )
        .join('')}

      <div>
        <h3>Contato</h3>
        <div class="footer__contato">
          <span class="footer__contato-item">${icone('local', 17)}<span>${esc(LOJA.endereco.rua)}<br>${esc(LOJA.endereco.bairro)} — ${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></span>
          <a class="footer__contato-item" href="https://wa.me/${LOJA.whatsapp}" target="_blank" rel="noopener">${icone('telefone', 17)}<span>${esc(LOJA.whatsappExibicao)}</span></a>
          <span class="footer__contato-item">${icone('email', 17)}<span>${esc(LOJA.email)}</span></span>
          <span class="footer__contato-item">${icone('relogio', 17)}<span>${LOJA.horario.map((h) => `${esc(h.dia)}: ${esc(h.hora)}`).join('<br>')}</span></span>
        </div>
      </div>
    </div>

    <div class="footer__base">
      <span>© ${ano} ${esc(LOJA.nome)} — CNPJ 00.000.000/0001-00 (exemplo)</span>
      <span class="footer__aviso">Apresentação demonstrativa. Preços, estoque e avaliações são exemplos e serão substituídos pelos dados reais da loja.</span>
    </div>
  </div>
</footer>`;
}

/* ------------------------------------------------------- barra do celular -- */
function htmlBarraMobile(pagina, raiz) {
  const p = prefixo(raiz);
  const itens = [
    { id: 'inicio',      rotulo: 'Início',    href: 'index.html',      ic: 'painel' },
    { id: 'pecas',       rotulo: 'Peças',     href: 'catalogo.html',   ic: 'ferramenta' },
    { id: 'localizador', rotulo: 'Minha moto',href: 'localizador.html',ic: 'moto' },
    { id: 'carrinho',    rotulo: 'Carrinho',  href: 'carrinho.html',   ic: 'carrinho' },
  ];
  return `<nav class="barra-mobile" aria-label="Navegação rápida">
    ${itens
      .map((i) => `<a href="${p}${i.href}"${i.id === pagina ? ' aria-current="page"' : ''}>${icone(i.ic, 20)}<span>${i.rotulo}</span></a>`)
      .join('')}
  </nav>`;
}

/* --------------------------------------------------------------- montagem -- */
export function montarShell({ pagina = '', raiz = '.', titulo } = {}) {
  if (titulo) document.title = `${titulo} — ${LOJA.nome}`;

  const topo = document.getElementById('topo');
  const rodape = document.getElementById('rodape');
  if (topo) topo.innerHTML = htmlHeader(pagina, raiz);
  if (rodape) rodape.innerHTML = htmlFooter(raiz);

  if (!document.querySelector('.barra-mobile')) {
    document.body.insertAdjacentHTML('beforeend', htmlBarraMobile(pagina, raiz));
  }

  /* A marca fica no documento, não numa variável do módulo: remontar o shell
     em outra página (ou num teste) não fica preso ao estado anterior. */
  if (!document.documentElement.hasAttribute('data-shell-ligado')) {
    document.documentElement.setAttribute('data-shell-ligado', '1');
    ligarComportamentos();
  }

  if (pagina) document.body.setAttribute('data-pagina', pagina);
  atualizarContadorCarrinho();
  return true;
}

/* --------------------------------------------------------- comportamentos -- */
function ligarComportamentos() {
  /* sombra no header ao rolar — mesmo comportamento da referência */
  const cabecalho = document.getElementById('cabecalho');
  if (cabecalho) {
    const aoRolar = () => cabecalho.classList.toggle('header--rolado', window.scrollY > 8);
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();
  }

  /* menu mobile */
  const abrirMenu = (aberto) => {
    const menu = document.getElementById('menu-mobile');
    if (!menu) return;
    menu.setAttribute('data-aberto', aberto ? 'true' : 'false');
    menu.setAttribute('aria-hidden', aberto ? 'false' : 'true');
    document.body.style.overflow = aberto ? 'hidden' : '';
    const btn = document.querySelector('[data-abrir-menu]');
    if (btn) btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  };

  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-abrir-menu]')) return abrirMenu(true);
    if (ev.target.closest('[data-fechar-menu]')) return abrirMenu(false);

    if (ev.target.closest('[data-abrir-busca]')) {
      const busca = document.getElementById('busca-topo');
      if (!busca) return;
      const vaiAbrir = busca.classList.contains('oculto');
      busca.classList.toggle('oculto', !vaiAbrir);
      if (vaiAbrir) {
        const campo = busca.querySelector('input');
        if (campo) campo.focus();
      }
      return;
    }

    const menu = document.getElementById('menu-mobile');
    if (menu && menu.getAttribute('data-aberto') === 'true') {
      if (ev.target.closest('.menu-mobile a')) abrirMenu(false);
    }

    /* fechar drawers */
    if (ev.target.closest('[data-fechar-drawer]')) {
      fecharDrawer();
      return;
    }
    const gatilho = ev.target.closest('[data-abrir-drawer]');
    if (gatilho) {
      abrirDrawer(gatilho.getAttribute('data-abrir-drawer'));
      return;
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const menu = document.getElementById('menu-mobile');
    if (menu && menu.getAttribute('data-aberto') === 'true') abrirMenu(false);
    fecharDrawer();
  });

  /* busca */
  document.addEventListener('submit', (ev) => {
    const form = ev.target.closest('[data-form-busca]');
    if (!form) return;
    ev.preventDefault();
    const campo = form.querySelector('input');
    const termo = campo ? campo.value.trim() : '';
    const raiz = document.body.getAttribute('data-raiz') || '.';
    if (!termo) { avisar('Digite o que você procura.', 'alerta'); return; }
    window.location.href = `${prefixo(raiz)}catalogo.html?busca=${encodeURIComponent(termo)}`;
  });

  /* carrinho e favoritos aparecem em todas as páginas */
  document.addEventListener('click', (ev) => {
    const add = ev.target.closest('[data-add-carrinho]');
    if (add) {
      ev.preventDefault();
      const id = add.getAttribute('data-add-carrinho');
      const qtd = Number(add.getAttribute('data-qtd') || 1);
      const r = carrinho.adicionar(id, qtd);
      if (r && r.ok) avisar(r.mensagem || 'Produto adicionado ao carrinho.');
      else avisar((r && r.mensagem) || 'Não foi possível adicionar.', 'erro');
      return;
    }
    const fav = ev.target.closest('[data-favoritar]');
    if (fav) {
      ev.preventDefault();
      const id = fav.getAttribute('data-favoritar');
      const marcado = carrinho.alternarFavorito(id);
      fav.setAttribute('aria-pressed', marcado ? 'true' : 'false');
      const txt = fav.querySelector('[data-rotulo-favorito]');
      if (txt) txt.textContent = marcado ? 'Salvo' : 'Salvar';
      avisar(marcado ? 'Salvo nos favoritos.' : 'Removido dos favoritos.');
    }
  });
}

/* --------------------------------------------------------------- drawers -- */
/* Um só drawer no documento, reaproveitado por todas as páginas.
   O conteúdo é montado por quem abre (motos compatíveis, filtros, etc.). */
export function garantirDrawer() {
  let d = document.getElementById('drawer-global');
  if (d) return d;
  d = document.createElement('div');
  d.id = 'drawer-global';
  d.className = 'drawer';
  d.setAttribute('data-aberto', 'false');
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.innerHTML = `
    <div class="drawer__veu" data-fechar-drawer></div>
    <div class="drawer__caixa">
      <div class="drawer__topo">
        <h3 id="drawer-titulo">Título</h3>
        <button class="icone-btn" type="button" data-fechar-drawer aria-label="Fechar">${icone('fechar')}</button>
      </div>
      <div class="drawer__corpo" id="drawer-corpo"></div>
      <div class="drawer__rodape" id="drawer-rodape"></div>
    </div>`;
  document.body.appendChild(d);
  return d;
}

export function abrirDrawer({ titulo = '', corpo = '', rodape = '' } = {}) {
  const d = garantirDrawer();
  const t = document.getElementById('drawer-titulo');
  const c = document.getElementById('drawer-corpo');
  const r = document.getElementById('drawer-rodape');
  if (t) t.textContent = titulo;
  if (c) c.innerHTML = corpo;
  if (r) { r.innerHTML = rodape; r.hidden = !rodape; }
  d.setAttribute('data-aberto', 'true');
  document.body.style.overflow = 'hidden';
  const foco = d.querySelector('.icone-btn');
  if (foco) foco.focus();
  return d;
}

export function fecharDrawer() {
  const d = document.getElementById('drawer-global');
  if (!d) return;
  d.setAttribute('data-aberto', 'false');
  document.body.style.overflow = '';
}

/* Contador do carrinho no header. */
export function atualizarContadorCarrinho() {
  const total = carrinho.quantidadeTotal();
  $$('[data-contador-carrinho]').forEach((el) => {
    el.textContent = String(total);
    el.hidden = total === 0;
  });
}

export { htmlMotoAtiva };
