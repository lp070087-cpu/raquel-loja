/* ============================================================================
   SHELL — cabeçalho, rodapé, menu mobile e barra inferior
   ----------------------------------------------------------------------------
   Existe UMA descrição do header e UMA do footer. Toda página chama
   `montarShell()`. Mudar o menu em um lugar muda o site inteiro.

   Uso numa página:
     <body data-pagina="catalogo">
       <div id="topo"></div>
       ... conteúdo ...
       <div id="rodape"></div>
       <script type="module">
         import { montarShell } from './assets/js/shell.js';
         montarShell({ pagina: 'catalogo', raiz: '.' });
       </script>
   ============================================================================ */

import { LOJA } from './dados.js';
import { icone, esc, $, $$, avisar } from './utils.js';
import { carrinho } from './carrinho.js';

export const MENU = [
  { id: 'inicio',      rotulo: 'Início',            href: 'index.html' },
  { id: 'pecas',       rotulo: 'Peças',             href: 'catalogo.html' },
  // Acessórios é um agrupamento de capacetes + capas (ver AGRUPAMENTOS em dados.js)
  { id: 'acessorios',  rotulo: 'Acessórios',        href: 'catalogo.html?categoria=capacetes,capas' },
  { id: 'localizador', rotulo: 'Encontre sua peça', href: 'localizador.html' },
  { id: 'ofertas',     rotulo: 'Ofertas',           href: 'catalogo.html?ofertas=1' },
  { id: 'contato',     rotulo: 'Contato',           href: 'contato.html' },
];

/* Caminho relativo até a raiz, conforme a página esteja na raiz ou em /admin. */
function prefixo(raiz) {
  return raiz === '..' ? '../' : '';
}

/* ------------------------------------------------------------- cabeçalho -- */
function htmlHeader(pagina, raiz) {
  const p = prefixo(raiz);
  const links = MENU.map(
    (m) =>
      `<a class="nav__link" href="${p}${m.href}"${
        m.id === pagina ? ' aria-current="page"' : ''
      }>${m.rotulo}</a>`
  ).join('');

  return `
<div class="faixa-topo">
  <div class="container">
    <div class="faixa-topo__itens">
      <span class="faixa-topo__item">${icone('caminhao', 15)} Envio para todo o Brasil</span>
      <span class="faixa-topo__item">${icone('loja', 15)} Retirada na loja em ${esc(LOJA.cidade)}</span>
    </div>
    <div class="faixa-topo__itens">
      <a class="faixa-topo__item" href="https://wa.me/${LOJA.whatsapp}" target="_blank" rel="noopener">${icone('telefone', 15)} ${esc(LOJA.whatsappExibicao)}</a>
    </div>
  </div>
</div>

<header class="header" id="cabecalho">
  <div class="container">
    <a class="marca" href="${p}index.html" aria-label="${esc(LOJA.nome)} — página inicial">
      <span class="marca__simbolo">${icone('moto', 26)}</span>
      <span class="marca__texto">
        <span class="marca__nome">${esc(LOJA.nome)}</span>
        <span class="marca__tag">Peças e acessórios</span>
      </span>
    </a>

    <nav class="nav" aria-label="Menu principal">${links}</nav>

    <div class="acoes-topo">
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
    <div class="container" style="padding-block:12px">
      <form class="linha" data-form-busca role="search">
        <label class="oculto" for="busca-input">Buscar peças</label>
        <input class="entrada" id="busca-input" type="search" placeholder="Busque por peça, marca ou moto. Ex.: pastilha CG 160" autocomplete="off">
        <button class="btn" type="submit">${icone('buscar', 18)} Buscar</button>
      </form>
    </div>
  </div>
</header>

<div class="menu-mobile" id="menu-mobile" data-aberto="false" aria-hidden="true">
  <div class="menu-mobile__topo">
    <a class="marca" href="${p}index.html">
      <span class="marca__simbolo">${icone('moto', 26)}</span>
      <span class="marca__nome">${esc(LOJA.nome)}</span>
    </a>
    <button class="icone-btn" type="button" data-fechar-menu aria-label="Fechar menu">${icone('fechar')}</button>
  </div>
  <nav class="menu-mobile__links" aria-label="Menu principal (celular)">
    ${MENU.map((m) => `<a class="menu-mobile__link" href="${p}${m.href}">${m.rotulo}</a>`).join('')}
    <a class="menu-mobile__link" href="${p}conta.html">Minha conta</a>
    <a class="menu-mobile__link" href="${p}admin/login.html">Painel da loja</a>
  </nav>
  <div class="menu-mobile__rodape">
    <a class="btn btn--bloco" href="${p}localizador.html">${icone('moto', 18)} Encontrar minha peça</a>
    <a class="btn btn--contorno btn--bloco" href="${p}carrinho.html">${icone('carrinho', 18)} Ver carrinho</a>
    <a class="btn btn--contorno btn--bloco" href="https://wa.me/${LOJA.whatsapp}" target="_blank" rel="noopener">
      ${icone('telefone', 18)} Falar no WhatsApp
    </a>
  </div>
</div>`;
}

/* ---------------------------------------------------------------- rodapé -- */
function htmlFooter(raiz) {
  const p = prefixo(raiz);
  const ano = new Date().getFullYear();
  const cat = [
    ['Óleos', 'oleos'],
    ['Filtros', 'filtros'],
    ['Freios', 'freios'],
    ['Transmissão', 'transmissao'],
  ];
  const cat2 = [
    ['Pneus', 'pneus'],
    ['Capacetes', 'capacetes'],
    ['Capas de chuva', 'capas'],
    ['Acessórios', 'acessorios'],
  ];

  return `
<footer class="footer">
  <div class="container">
    <div class="footer__grade">
      <div>
        <a class="marca" href="${p}index.html">
          <span class="marca__simbolo">${icone('moto', 26)}</span>
          <span class="marca__texto">
            <span class="marca__nome">${esc(LOJA.nome)}</span>
            <span class="marca__tag">Peças e acessórios</span>
          </span>
        </a>
        <p class="footer__sobre">${esc(LOJA.slogan)}. Encontre a peça pela sua moto, retire na loja ou receba em casa.</p>
      </div>

      <div>
        <h3>Categorias</h3>
        <div class="footer__links">
          ${cat.map(([n, s]) => `<a href="${p}catalogo.html?categoria=${s}">${n}</a>`).join('')}
        </div>
      </div>

      <div>
        <h3>Mais peças</h3>
        <div class="footer__links">
          ${cat2.map(([n, s]) => `<a href="${p}catalogo.html?categoria=${s}">${n}</a>`).join('')}
        </div>
      </div>

      <div>
        <h3>Contato</h3>
        <div class="footer__contato">
          <span class="footer__contato-item">${icone('local', 18)}<span>${esc(LOJA.endereco.rua)}<br>${esc(LOJA.endereco.bairro)} — ${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></span>
          <a class="footer__contato-item" href="https://wa.me/${LOJA.whatsapp}" target="_blank" rel="noopener">${icone('telefone', 18)}<span>${esc(LOJA.whatsappExibicao)}</span></a>
          <span class="footer__contato-item">${icone('email', 18)}<span>${esc(LOJA.email)}</span></span>
          <span class="footer__contato-item">${icone('relogio', 18)}<span>${LOJA.horario.map((h) => `${esc(h.dia)}: ${esc(h.hora)}`).join('<br>')}</span></span>
        </div>
      </div>
    </div>

    <div class="footer__base">
      <span>© ${ano} ${esc(LOJA.nome)} — CNPJ 00.000.000/0001-00 (exemplo)</span>
      <span class="footer__aviso">${esc('Apresentação demonstrativa. Preços, estoque e avaliações são exemplos e serão substituídos pelos dados reais da loja.')}</span>
    </div>
  </div>
</footer>`;
}

/* ------------------------------------------------------- barra do celular -- */
function htmlBarraMobile(pagina, raiz) {
  const p = prefixo(raiz);
  const itens = [
    { id: 'inicio', rotulo: 'Início', href: 'index.html', ic: 'painel' },
    { id: 'catalogo', rotulo: 'Peças', href: 'catalogo.html', ic: 'ferramenta' },
    { id: 'localizador', rotulo: 'Minha moto', href: 'localizador.html', ic: 'moto' },
    { id: 'carrinho', rotulo: 'Carrinho', href: 'carrinho.html', ic: 'carrinho' },
  ];
  return `<nav class="barra-mobile" aria-label="Navegação rápida">
    ${itens
      .map(
        (i) =>
          `<a href="${p}${i.href}"${i.id === pagina ? ' aria-current="page"' : ''}>${icone(i.ic, 21)}<span>${i.rotulo}</span></a>`
      )
      .join('')}
  </nav>`;
}

/* --------------------------------------------------------------- montagem -- */
/* A marca fica no próprio documento, não numa variável do módulo: assim
   remontar o shell numa página diferente (ou num teste) não fica preso ao
   estado do documento anterior. */
export function montarShell({ pagina = '', raiz = '.', titulo } = {}) {
  if (titulo) document.title = `${titulo} — ${LOJA.nome}`;

  const topo = document.getElementById('topo');
  const rodape = document.getElementById('rodape');

  if (topo) topo.innerHTML = htmlHeader(pagina, raiz);
  if (rodape) rodape.innerHTML = htmlFooter(raiz);

  if (!document.querySelector('.barra-mobile')) {
    document.body.insertAdjacentHTML('beforeend', htmlBarraMobile(pagina, raiz));
  }

  if (!document.documentElement.hasAttribute('data-shell-ligado')) {
    document.documentElement.setAttribute('data-shell-ligado', '1');
    ligarComportamentos(raiz);
  }

  // marca a página no body — usado para ajustes finos de CSS
  if (pagina) document.body.setAttribute('data-pagina', pagina);

  atualizarContadorCarrinho();
  return true;
}

/* --------------------------------------------------------- comportamentos -- */
function ligarComportamentos(raiz) {
  const cabecalho = document.getElementById('cabecalho');
  const menu = document.getElementById('menu-mobile');
  const busca = document.getElementById('busca-topo');

  /* sombra no header ao rolar */
  if (cabecalho) {
    const aoRolar = () => {
      cabecalho.classList.toggle('header--rolado', window.scrollY > 8);
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();
  }

  /* menu mobile */
  const abrirMenu = (aberto) => {
    if (!menu) return;
    menu.setAttribute('data-aberto', aberto ? 'true' : 'false');
    menu.setAttribute('aria-hidden', aberto ? 'false' : 'true');
    document.body.style.overflow = aberto ? 'hidden' : '';
    const btn = document.querySelector('[data-abrir-menu]');
    if (btn) btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    if (aberto) {
      const primeiro = menu.querySelector('a, button');
      if (primeiro) primeiro.focus();
    }
  };

  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-abrir-menu]')) { abrirMenu(true); return; }
    if (ev.target.closest('[data-fechar-menu]')) { abrirMenu(false); return; }
    if (ev.target.closest('[data-abrir-busca]')) {
      if (!busca) return;
      const vaiAbrir = busca.classList.contains('oculto');
      busca.classList.toggle('oculto', !vaiAbrir);
      if (vaiAbrir) {
        const campo = busca.querySelector('input');
        if (campo) campo.focus();
      }
      return;
    }
    // fecha o menu ao clicar num link de dentro dele
    if (menu && menu.getAttribute('data-aberto') === 'true') {
      const link = ev.target.closest('.menu-mobile a');
      if (link) abrirMenu(false);
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (menu && menu.getAttribute('data-aberto') === 'true') abrirMenu(false);
    }
  });

  /* busca */
  document.addEventListener('submit', (ev) => {
    const form = ev.target.closest('[data-form-busca]');
    if (!form) return;
    ev.preventDefault();
    const campo = form.querySelector('input');
    const termo = campo ? campo.value.trim() : '';
    const p = prefixo(raiz);
    if (!termo) { avisar('Digite o que você procura.', 'alerta'); return; }
    window.location.href = `${p}catalogo.html?busca=${encodeURIComponent(termo)}`;
  });

  /* links "adicionar ao carrinho" e "favoritar" aparecem em todas as páginas */
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
      avisar(marcado ? 'Salvo nos favoritos.' : 'Removido dos favoritos.');
    }
  });
}

/* Contador do carrinho no header — chamado por todas as páginas. */
export function atualizarContadorCarrinho() {
  const total = carrinho.quantidadeTotal();
  $$('[data-contador-carrinho]').forEach((el) => {
    el.textContent = String(total);
    el.hidden = total === 0;
  });
}

/* Atalho usado pelas páginas para montar um selo de compatibilidade. */
export function seloCompat(produto, moto) {
  if (!produto) return '';
  if (!produto.compat || produto.compat.length === 0) {
    return `<span class="selo selo--neutro">Universal</span>`;
  }
  if (moto && moto.marca && moto.modelo) {
    return `<span class="selo selo--ok">${icone('check', 12)} Serve na sua</span>`;
  }
  return `<span class="selo selo--marinho">Peça específica</span>`;
}

export { prefixo };
