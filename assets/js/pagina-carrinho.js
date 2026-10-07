/* ============================================================================
   PÁGINA — CARRINHO
   ----------------------------------------------------------------------------
   O carrinho guarda só id e quantidade. Todo preço é lido do catálogo na hora
   de desenhar — então nunca aparece preço velho, e mudar o preço em dados.js
   já reflete aqui.
   ============================================================================ */

import { LOJA, precoPix, produtoPorId } from './dados.js';
import { moeda, esc, icone, $, $$, avisar, prepararRevelar } from './utils.js';
import { midiaProduto } from './artes.js';
import { carrinho, PRODUTOS } from './carrinho.js';
import { cardProduto, estadoVazio } from './componentes.js';

export function montarCarrinho() {
  const alvo = document.getElementById('carrinho-container');
  if (!alvo) return;

  function desenhar() {
    const itens = carrinho.detalhados();
    const subtotal = carrinho.subtotal();
    const pix = precoPix(subtotal);
    const faltaFreteGratis = Number(LOJA.freeShippingFrom) - subtotal;

    const resumoTopo = document.getElementById('resumo-topo');
    if (resumoTopo) {
      const n = carrinho.quantidadeTotal();
      resumoTopo.textContent = n
        ? `${n} ${n === 1 ? 'item' : 'itens'} no carrinho.`
        : 'Seu carrinho está vazio.';
    }

    /* ------------------------------------------------------- vazio ------- */
    if (!itens.length) {
      alvo.innerHTML = estadoVazio({
        icone: 'carrinho',
        titulo: 'Seu carrinho está vazio',
        texto: 'Escolha a sua moto e encontre a peça certa, ou veja os produtos em destaque.',
        acao: { href: 'catalogo.html', rotulo: 'Ver produtos' },
      });
      prepararRevelar();
      return;
    }

    /* ------------------------------------------------------ com itens ---- */
    alvo.innerHTML = `
    <div class="carrinho">
      <div>
        <div class="espaco-entre mb-2">
          <h2 class="mb-0" style="font-size:1.3rem">Itens do pedido</h2>
          <button class="link-simples" type="button" data-limpar-carrinho>Esvaziar carrinho</button>
        </div>

        ${itens.map(itemCarrinho).join('')}

        <div class="linha mt-3">
          <a class="btn btn--contorno" href="catalogo.html">${icone('seta', 18)} Continuar comprando</a>
          <a class="btn btn--contorno" href="localizador.html">${icone('moto', 18)} Buscar peça pela moto</a>
        </div>
      </div>

      <aside class="resumo" aria-label="Resumo do pedido">
        <h3>Resumo</h3>

        <div class="resumo__linha"><span>Produtos (${carrinho.quantidadeTotal()})</span><span>${moeda(subtotal)}</span></div>
        <div class="resumo__linha"><span>Frete</span><span>${carrinho.freteGratis() ? 'Grátis no PAC' : 'Calculado no checkout'}</span></div>
        <div class="resumo__linha"><span>No Pix (${Math.round(LOJA.pixDesconto * 100)}% off)</span><span class="forte">${moeda(pix)}</span></div>

        <div class="resumo__linha resumo__linha--total">
          <span>Total</span><span>${moeda(subtotal)}</span>
        </div>

        ${
          faltaFreteGratis > 0
            ? `<div class="mensagem mensagem--alerta mt-2">
                 ${icone('caminhao', 18)}
                 <span>Faltam <strong>${moeda(faltaFreteGratis)}</strong> para o frete sair de graça no PAC.</span>
               </div>`
            : `<div class="mensagem mensagem--ok mt-2">
                 ${icone('check', 18)} <span>Você tem frete grátis no PAC.</span>
               </div>`
        }

        <div class="resumo__rodape">
          <a class="btn btn--grande btn--bloco" href="checkout.html">
            ${icone('check', 20)} Finalizar pedido
          </a>
          <p class="resumo__nota">
            Na retirada na loja não há pagamento online — você paga no balcão.
          </p>
        </div>
      </aside>
    </div>

    <section class="secao">
      <div class="cabecalho-secao revelar">
        <span class="selo">Aproveite também</span>
        <h2 class="mt-2">Quem compra isso costuma levar</h2>
      </div>
      <div class="grade grade--4" id="sugestoes"></div>
    </section>`;

    /* sugestões: outras categorias, fora do que já está no carrinho */
    const ids = itens.map((i) => i.id);
    const sug = PRODUTOS.filter((p) => ids.indexOf(p.id) === -1 && Number(p.estoque) > 0).slice(0, 4);
    const alvoSug = document.getElementById('sugestoes');
    if (alvoSug) alvoSug.innerHTML = sug.map((p) => cardProduto(p)).join('');

    ligar();
    prepararRevelar();
  }

  function itemCarrinho(item) {
    const p = produtoPorId(item.id);
    const max = Math.max(1, Number(p.estoque));
    const universal = !p.compat || p.compat.length === 0;

    return `
    <article class="item-carrinho" data-item="${esc(item.id)}">
      <a class="item-carrinho__midia" href="produto.html?id=${encodeURIComponent(item.id)}" aria-label="Ver ${esc(item.nome)}">
        ${midiaProduto(p, { alt: item.nome })}
      </a>

      <div>
        <h3 class="item-carrinho__nome">
          <a href="produto.html?id=${encodeURIComponent(item.id)}">${esc(item.nome)}</a>
        </h3>
        <p class="item-carrinho__compat">
          ${universal ? 'Produto universal' : 'Peça específica'} · ${moeda(item.preco)} cada
        </p>

        <div class="item-carrinho__acoes">
          <div class="quantidade" role="group" aria-label="Quantidade de ${esc(item.nome)}">
            <button type="button" data-menos aria-label="Diminuir">${icone('menos', 16)}</button>
            <label class="oculto" for="qtd-${esc(item.id)}">Quantidade</label>
            <input id="qtd-${esc(item.id)}" type="number" inputmode="numeric" min="1" max="${max}" value="${item.qtd}" data-qtd>
            <button type="button" data-mais aria-label="Aumentar">${icone('mais', 16)}</button>
          </div>

          <button class="item-carrinho__remover" type="button" data-remover>
            ${icone('lixeira', 14)} Remover
          </button>
        </div>

        ${
          max <= 5
            ? `<p class="micro" style="color:var(--alerta);margin:.5em 0 0">Restam ${max} unidades em estoque.</p>`
            : ''
        }
      </div>

      <div class="item-carrinho__preco">${moeda(item.subtotal)}</div>
    </article>`;
  }

  function ligar() {
    $$('.item-carrinho').forEach((el) => {
      const id = el.getAttribute('data-item');
      const campo = el.querySelector('[data-qtd]');
      const p = produtoPorId(id);
      const max = Math.max(1, Number(p.estoque));

      const aplicar = (n) => {
        let v = Math.floor(Number(n));
        if (!isFinite(v) || v < 1) v = 1;
        if (v > max) {
          v = max;
          avisar(`Só há ${max} unidades em estoque.`, 'alerta');
        }
        const r = carrinho.alterarQtd(id, v);
        if (!r.ok && r.mensagem) avisar(r.mensagem, 'alerta');
        desenhar();
        import('./shell.js').then((m) => m.atualizarContadorCarrinho()).catch(() => {});
      };

      el.querySelector('[data-menos]').addEventListener('click', () => aplicar(Number(campo.value) - 1));
      el.querySelector('[data-mais]').addEventListener('click', () => aplicar(Number(campo.value) + 1));
      campo.addEventListener('change', () => aplicar(campo.value));
      el.querySelector('[data-remover]').addEventListener('click', () => {
        carrinho.remover(id);
        avisar('Item removido do carrinho.');
        desenhar();
        import('./shell.js').then((m) => m.atualizarContadorCarrinho()).catch(() => {});
      });
    });
  }

  /* esvaziar */
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-limpar-carrinho]')) {
      carrinho.limpar();
      avisar('Carrinho esvaziado.');
      desenhar();
      import('./shell.js').then((m) => m.atualizarContadorCarrinho()).catch(() => {});
    }
  });

  desenhar();
}
