/* ============================================================================
   PÁGINA — MINHA CONTA
   ----------------------------------------------------------------------------
   Sem login real nesta etapa (decisão do escopo). O que esta tela prova é o
   vínculo entre o pedido do site e o painel: o mesmo pedido que aparece aqui
   aparece no admin.
   ============================================================================ */

import { LOJA, precoPix } from './dados.js';
import { moeda, esc, icone, dataHora, prepararRevelar, cascata } from './utils.js';
import { pedidos, nomeStatus, corStatus, favoritos, moto as motoStore } from './carrinho.js';
import { cardProduto, estadoVazio } from './componentes.js';

export function montarConta() {
  const alvo = document.getElementById('conta-container');
  if (!alvo) return;

  const lista = pedidos.lista();
  const moto = motoStore.ler();
  const favoritosLista = favoritos.produtos();

  alvo.innerHTML = `
    <div class="abas" role="tablist" aria-label="Seções da conta">
      <button class="aba" role="tab" aria-selected="true" data-aba="pedidos">Meus pedidos (${lista.length})</button>
      <button class="aba" role="tab" aria-selected="false" data-aba="favoritos">Favoritos (${favoritosLista.length})</button>
      <button class="aba" role="tab" aria-selected="false" data-aba="moto">Minha moto</button>
    </div>

    <!-- PEDIDOS -->
    <div class="painel-aba" data-painel="pedidos">
      ${
        lista.length
          ? `<div class="painel-lista">${lista.map(cartaoPedido).join('')}</div>`
          : estadoVazio({
              icone: 'sacola',
              titulo: 'Você ainda não fez pedidos',
              texto: 'Quando você finalizar um pedido, ele aparece aqui — e também no painel da loja.',
              acao: { href: 'catalogo.html', rotulo: 'Ver produtos' },
            })
      }
    </div>

    <!-- FAVORITOS -->
    <div class="painel-aba" data-painel="favoritos" hidden>
      ${
        favoritosLista.length
          ? `<div class="grade grade--4">${favoritosLista.map((p) => cardProduto(p, { moto })).join('')}</div>`
          : estadoVazio({
              icone: 'coracao',
              titulo: 'Nenhum favorito ainda',
              texto: 'Toque no coração de um produto para salvá-lo aqui.',
              acao: { href: 'catalogo.html', rotulo: 'Ver produtos' },
            })
      }
    </div>

    <!-- MINHA MOTO -->
    <div class="painel-aba" data-painel="moto" hidden>
      <div class="painel-dados" style="max-width:560px">
        <h3>${icone('moto', 20)} Sua moto</h3>
        ${
          moto
            ? `<div class="painel-dados__linha"><span class="rot">Marca</span><span class="val">${esc(moto.marca)}</span></div>
               <div class="painel-dados__linha"><span class="rot">Modelo</span><span class="val">${esc(moto.modelo)}</span></div>
               <div class="painel-dados__linha"><span class="rot">Ano</span><span class="val">${moto.ano || '—'}</span></div>
               <p class="micro texto-3 mt-2">Usamos esta moto para mostrar só as peças compatíveis no catálogo.</p>
               <div class="hero__ctas mt-2">
                 <a class="btn btn--pequeno" href="localizador.html">Trocar de moto</a>
                 <button class="btn btn--pequeno btn--contorno" type="button" data-limpar-moto>Remover</button>
               </div>`
            : `<p class="texto-2 pequeno">Você ainda não escolheu a sua moto. Escolhendo, o catálogo passa a mostrar só o que serve nela.</p>
               <a class="btn btn--pequeno" href="localizador.html">${icone('moto', 16)} Escolher minha moto</a>`
        }
      </div>
    </div>

    <div class="aviso-demostrativo mt-4">
      ${icone('info', 16)}
      <span>Nesta apresentação não existe login. Os pedidos ficam guardados neste navegador. Na versão final, a conta fica no banco de dados com login real.</span>
    </div>`;

  /* ------------------------------------------------------- abas --------- */
  document.querySelectorAll('.aba').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.aba').forEach((x) => x.setAttribute('aria-selected', 'false'));
      b.setAttribute('aria-selected', 'true');
      const alvoAba = b.getAttribute('data-aba');
      document.querySelectorAll('.painel-aba').forEach((p) => {
        p.hidden = p.getAttribute('data-painel') !== alvoAba;
      });
    });
  });

  /* ---------------------------------------------- remover a moto -------- */
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-limpar-moto]')) {
      motoStore.limpar();
      window.location.reload();
    }
  });

  cascata(alvo.querySelector('.painel-lista') || alvo, 50);
  prepararRevelar();
}

/* ---------------------------------------------------------- cartão ------ */
function cartaoPedido(p) {
  const retirada = p.tipo === 'retirada';
  return `
  <article class="painel-pedido revelar">
    <span class="painel-pedido__num">${esc(p.id)}</span>
    <span>
      <span class="painel-pedido__meta">${dataHora(p.criadoEm)}</span><br>
      <span class="selo ${corStatus(p.status)}">${esc(nomeStatus(p.status))}</span>
      <span class="pilula-tipo ${retirada ? 'pilula-tipo--retirada' : 'pilula-tipo--entrega'}">
        ${retirada ? icone('loja', 12) : icone('caminhao', 12)}
        ${retirada ? 'Retirada' : 'Entrega'}
      </span>
    </span>
    <span class="painel-pedido__meta">${p.itens.length} ${p.itens.length === 1 ? 'item' : 'itens'}</span>
    <span class="painel-pedido__total">${moeda(p.total)}</span>
    <a class="btn btn--pequeno btn--contorno" href="pedido.html?id=${encodeURIComponent(p.id)}">Ver pedido</a>
  </article>`;
}
