/* ============================================================================
   PÁGINA — PRODUTO
   ----------------------------------------------------------------------------
   Duas colunas, como nos grandes e-commerces:
     ESQUERDA: galeria (foto grande + miniaturas quando há mais de uma foto)
     DIREITA:  categoria · nome · avaliação · preço/Pix/parcelamento ·
               disponibilidade · quantidade · CTA · compatibilidade

   A compatibilidade é o coração da página: ela responde, sem rodeio, as duas
   perguntas que a cliente faz no balcão — "serve na minha moto?" e
   "e se eu não souber?".
   ============================================================================ */

import {
  LOJA, produtoPorId, precoPix, parcelaDe, produtoServeEm, ehUniversal,
  rotuloMoto, nomeCategoria, aplicacoesDoProduto, PRODUTOS,
} from './dados.js';
import {
  moeda, esc, icone, avisar, temDesconto, descontoPct, prepararRevelar, cascata, estrelas,
} from './utils.js';
import { midiaProduto, galeriaProduto } from './artes.js';
import { carrinho, favoritos, moto as motoStore } from './carrinho.js';
import {
  cardProduto, estadoVazio, linhaProduto, blocoCompatibilidade, drawerAplicacoes, tituloSecao,
} from './componentes.js';
import { abrirDrawer } from './shell.js';

export function montarProduto() {
  const q = new URLSearchParams(window.location.search);
  const produto = produtoPorId(q.get('id'));
  const alvo = document.getElementById('produto-container');

  if (!produto) {
    if (alvo) {
      alvo.innerHTML = `<div class="secao">${estadoVazio({
        icone: 'buscar',
        titulo: 'Produto não encontrado',
        texto: 'O link pode estar incompleto ou o produto saiu do catálogo.',
        acao: { href: 'catalogo.html', rotulo: 'Ver o catálogo' },
      })}</div>`;
    }
    return;
  }

  document.title = `${produto.nome} — ${LOJA.nome}`;

  const moto = motoStore.ler();
  const universal = ehUniversal(produto);
  const serve = moto && !universal ? produtoServeEm(produto, moto) : false;
  const esgotado = Number(produto.estoque) <= 0;
  const fav = favoritos.ehFavorito(produto.id);
  const pix = precoPix(produto.preco);
  const parcela = parcelaDe(produto.preco);
  const nota = produto.avaliacao || { nota: 5, total: 0 };
  const galeria = galeriaProduto(produto);
  const apps = aplicacoesDoProduto(produto);

  /* ---------------------------------------------------------- migalhas --- */
  const migalhas = document.getElementById('migalhas');
  if (migalhas) {
    migalhas.innerHTML = `
      <a href="index.html">Início</a> <span aria-hidden="true">/</span>
      <a href="catalogo.html">Catálogo</a> <span aria-hidden="true">/</span>
      <a href="catalogo.html?categoria=${esc(produto.categoria)}">${esc(nomeCategoria(produto.categoria))}</a>
      <span aria-hidden="true">/</span> <span>${esc(produto.nome)}</span>`;
  }

  const especificacoes = Object.keys(produto.especificacoes || {});

  alvo.innerHTML = `
<article class="produto mt-4">

  <div class="galeria">
    <div class="galeria__principal caixa-foto" id="galeria-principal">
      ${midiaProduto(produto, { alt: produto.nome })}
    </div>
    ${
      galeria.length > 1
        ? `<div class="galeria__miniaturas" role="group" aria-label="Fotos do produto">
            ${galeria.map((f, i) => `
              <button class="galeria__miniatura caixa-foto" type="button" data-miniatura="${i}"
                      aria-current="${i === 0 ? 'true' : 'false'}" aria-label="Ver foto ${i + 1}">
                ${midiaProduto({ foto: f.src, nome: produto.nome }, { alt: '', classe: 'foto-produto--mini' })}
              </button>`).join('')}
          </div>`
        : ''
    }
  </div>

  <div>
    <span class="produto__cat">${esc(nomeCategoria(produto.categoria))} · ${esc(produto.marca)}</span>
    <h1 class="produto__nome">${esc(produto.nome)}</h1>

    <div class="produto__avaliacao">
      <span class="estrelas" role="img" aria-label="Nota ${nota.nota} de 5">${estrelas(Math.round(nota.nota))}</span>
      <span>${String(nota.nota).replace('.', ',')} · ${nota.total} avaliações</span>
      <span class="texto-3">· Cód. ${esc(produto.sku)}</span>
    </div>

    <div class="produto__bloco-preco">
      ${temDesconto(produto) ? `<span class="produto__de">${moeda(produto.precoDe)}</span>` : ''}
      <div class="produto__preco">${moeda(produto.preco)}</div>
      <div class="produto__pix">${moeda(pix)} no Pix — ${Math.round(LOJA.pixDesconto * 100)}% de desconto</div>
      <div class="produto__parcela">ou ${LOJA.parcelas}x de ${moeda(parcela)} sem juros</div>
    </div>

    <p class="estoque-linha ${esgotado ? 'estoque-linha--fora' : Number(produto.estoque) <= Number(produto.estoqueMinimo) ? 'estoque-linha--baixo' : ''}">
      <span class="ponto"></span>
      ${
        esgotado ? 'Sem estoque no momento'
        : Number(produto.estoque) <= Number(produto.estoqueMinimo)
          ? `Últimas ${produto.estoque} unidades em estoque`
          : `${produto.estoque} unidades em estoque`
      }
    </p>

    <div class="compra-linha">
      <div class="quantidade" role="group" aria-label="Quantidade">
        <button type="button" data-qtd-menos aria-label="Diminuir quantidade">${icone('menos', 16)}</button>
        <label class="oculto" for="qtd">Quantidade</label>
        <input id="qtd" type="number" inputmode="numeric" min="1" max="${Math.max(1, Number(produto.estoque))}" value="1" ${esgotado ? 'disabled' : ''}>
        <button type="button" data-qtd-mais aria-label="Aumentar quantidade">${icone('mais', 16)}</button>
      </div>
      <button class="btn btn--grande" type="button" id="btn-adicionar" ${esgotado ? 'disabled aria-disabled="true"' : ''}>
        ${icone('carrinho', 19)} ${esgotado ? 'Sem estoque' : 'Adicionar ao carrinho'}
      </button>
    </div>
    <button class="btn btn--marinho btn--bloco btn--grande" type="button" id="btn-comprar" ${esgotado ? 'disabled aria-disabled="true"' : ''}>
      Comprar agora
    </button>

    <div class="linha mt-4" style="gap:10px">
      <span class="selo selo--ok">${icone('check', 12)} Retirada na loja</span>
      <span class="selo selo--neutro">${icone('caminhao', 12)} Envio para todo o Brasil</span>
      <span class="selo selo--neutro">${icone('escudo', 12)} Garantia do fabricante</span>
    </div>

    <div class="mt-4">${blocoCompatibilidade(produto, moto)}</div>

    <ul class="lista-especificacoes mt-4">
      <li><span class="rot">Código (SKU)</span><span class="val">${esc(produto.sku)}</span></li>
      <li><span class="rot">Categoria</span><span class="val">${esc(nomeCategoria(produto.categoria))}</span></li>
      <li><span class="rot">Marca</span><span class="val">${esc(produto.marca)}</span></li>
      ${especificacoes.map((k) => `<li><span class="rot">${esc(k)}</span><span class="val">${esc(produto.especificacoes[k])}</span></li>`).join('')}
      <li><span class="rot">Compatibilidade</span><span class="val">${universal ? 'Universal' : `${apps.length} aplicações`}</span></li>
    </ul>
  </div>
</article>

<!-- abas -->
<div class="abas" role="tablist" aria-label="Informações do produto">
  <button class="aba" role="tab" aria-selected="true" data-aba="descricao">Descrição</button>
  <button class="aba" role="tab" aria-selected="false" data-aba="compat">Compatibilidade</button>
  <button class="aba" role="tab" aria-selected="false" data-aba="entrega">Entrega e retirada</button>
</div>

<div class="painel-aba" data-painel="descricao">
  <h3>Sobre esta peça</h3>
  <p class="texto-2 mt-2">${esc(produto.descricao)}</p>
  ${
    especificacoes.length
      ? `<table class="tabela-compat mt-4"><tbody>
          ${especificacoes.map((k) => `<tr><td class="texto-3">${esc(k)}</td><td class="forte">${esc(produto.especificacoes[k])}</td></tr>`).join('')}
        </tbody></table>`
      : ''
  }
</div>

<div class="painel-aba" data-painel="compat" hidden>
  <h3>Motos compatíveis</h3>
  ${
    universal
      ? `<p class="texto-2 mt-2">Este é um <strong>produto universal</strong>: não depende do modelo da moto, serve em qualquer uma.</p>`
      : `<p class="texto-2 mt-2 mb-3">${apps.length} aplicações confirmadas. Confira a versão e a faixa de anos:</p>
         <table class="tabela-compat">
           <thead><tr><th>Marca</th><th>Modelo</th><th>Versão</th><th>Anos</th><th>Motor</th></tr></thead>
           <tbody>
             ${apps.map((a) => `<tr>
               <td>${esc(a.marca)}</td><td>${esc(a.modelo)}</td>
               <td>${esc(a.versao)}</td><td class="forte">${esc(a.anos)}</td>
               <td class="texto-3">${esc(a.cilindrada || '—')}</td>
             </tr>`).join('')}
           </tbody>
         </table>
         ${
           moto && serve
             ? `<div class="mensagem mensagem--ok mt-3">${icone('checkCirculo', 17)}
                <span>Sua <strong>${esc(rotuloMoto(moto))}</strong> está nesta lista.</span></div>`
             : ''
         }`
  }
</div>

<div class="painel-aba" data-painel="entrega" hidden>
  <h3>Como você recebe</h3>
  <div class="detalhe-pedido mt-3">
    <div class="painel-dados">
      <h3>${icone('loja', 19)} Retirada na loja</h3>
      <p class="texto-2 pequeno">Sem pagamento online: você reserva agora e paga no balcão, na hora de retirar. O site gera um código de retirada para apresentar na loja.</p>
      <div class="painel-dados__linha"><span class="rot">Endereço</span><span class="val">${esc(LOJA.endereco.rua)} — ${esc(LOJA.endereco.bairro)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Cidade</span><span class="val">${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Horário</span><span class="val">${esc(LOJA.horario[0].dia)}: ${esc(LOJA.horario[0].hora)}</span></div>
    </div>
    <div class="painel-dados">
      <h3>${icone('caminhao', 19)} Receber em casa</h3>
      <p class="texto-2 pequeno">Enviamos para todo o Brasil. No checkout você informa o CEP e vê as transportadoras com prazo e valor antes de fechar.</p>
      <div class="painel-dados__linha"><span class="rot">Frete grátis</span><span class="val">Acima de ${moeda(LOJA.freeShippingFrom)} no PAC</span></div>
      <div class="painel-dados__linha"><span class="rot">Prazo</span><span class="val">2 a 8 dias úteis</span></div>
    </div>
  </div>
</div>

<div id="relacionados"></div>`;

  /* -------------------------------------------------------- relacionados */
  const alvoRel = document.getElementById('relacionados');
  const mesmos = PRODUTOS.filter((p) => p.categoria === produto.categoria && p.id !== produto.id).slice(0, 4);
  if (alvoRel && mesmos.length) {
    alvoRel.innerHTML = `
    <section class="secao">
      ${tituloSecao({ etiqueta: 'Combina com', titulo: `Outros produtos de ${esc(nomeCategoria(produto.categoria))}` })}
      <div class="grade grade--4">${mesmos.map((p) => cardProduto(p, { moto })).join('')}</div>
    </section>`;
    cascata(alvoRel.querySelector('.grade'), 50);
  }

  /* --------------------------------------------------------- interação --- */
  const campoQtd = document.getElementById('qtd');
  const maximo = Math.max(1, Number(produto.estoque));

  function lerQtd() {
    let n = Math.floor(Number(campoQtd && campoQtd.value) || 1);
    if (!isFinite(n) || n < 1) n = 1;
    if (n > maximo) n = maximo;
    if (campoQtd) campoQtd.value = String(n);
    return n;
  }

  const bMenos = document.querySelector('[data-qtd-menos]');
  const bMais = document.querySelector('[data-qtd-mais]');
  if (bMenos) bMenos.addEventListener('click', () => { campoQtd.value = String(Math.max(1, lerQtd() - 1)); });
  if (bMais) bMais.addEventListener('click', () => { campoQtd.value = String(Math.min(maximo, lerQtd() + 1)); });
  if (campoQtd) campoQtd.addEventListener('change', lerQtd);

  const btnAdd = document.getElementById('btn-adicionar');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const r = carrinho.adicionar(produto.id, lerQtd());
      if (r.ok) { avisar(r.mensagem); import('./shell.js').then((m) => m.atualizarContadorCarrinho()).catch(() => {}); }
      else avisar(r.mensagem, 'erro');
    });
  }

  const btnComprar = document.getElementById('btn-comprar');
  if (btnComprar) {
    btnComprar.addEventListener('click', () => {
      carrinho.adicionar(produto.id, lerQtd());
      window.location.href = 'checkout.html';
    });
  }

  /* abas */
  document.querySelectorAll('.aba').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.aba').forEach((x) => x.setAttribute('aria-selected', 'false'));
      b.setAttribute('aria-selected', 'true');
      const alvoAba = b.getAttribute('data-aba');
      document.querySelectorAll('.painel-aba').forEach((p) => { p.hidden = p.getAttribute('data-painel') !== alvoAba; });
    });
  });

  /* miniaturas */
  document.querySelectorAll('[data-miniatura]').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-miniatura]').forEach((x) => x.setAttribute('aria-current', 'false'));
      b.setAttribute('aria-current', 'true');
      const i = Number(b.getAttribute('data-miniatura'));
      const f = galeria[i];
      const principal = document.getElementById('galeria-principal');
      if (principal && f) {
        principal.innerHTML = midiaProduto({ foto: f.src, nome: produto.nome }, { alt: produto.nome });
      }
    });
  });

  /* drawer de aplicações (o botão está dentro do bloco de compatibilidade) */
  document.addEventListener('click', (ev) => {
    const ver = ev.target.closest('[data-ver-aplicacoes]');
    if (ver) {
      ev.preventDefault();
      abrirDrawer(drawerAplicacoes(produto));
    }
  });

  prepararRevelar();
}
