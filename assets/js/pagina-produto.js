/* ============================================================================
   PÁGINA — PRODUTO
   ----------------------------------------------------------------------------
   A compatibilidade é o coração desta página. Ela responde, sem rodeio, as
   duas perguntas que a cliente faz no balcão:
       "serve na minha moto?"   e   "e se eu não souber?"
   ============================================================================ */

import { LOJA, produtoPorId, precoPix, produtoServeEm, nomeCategoria } from './dados.js';
import { moeda, esc, icone, $, $$, avisar, temDesconto, descontoPct, prepararRevelar, cascata } from './utils.js';
import { midiaProduto, galeriaProduto } from './artes.js';
import { carrinho, favoritos, moto as motoStore, PRODUTOS } from './carrinho.js';
import { cardProduto, estadoVazio, linhaProduto } from './componentes.js';

export function montarProduto() {
  const q = new URLSearchParams(window.location.search);
  const id = q.get('id');
  const produto = produtoPorId(id);
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
  const universal = !produto.compat || produto.compat.length === 0;
  const serve = moto && !universal ? produtoServeEm(produto, moto) : false;
  const esgotado = Number(produto.estoque) <= 0;
  const fav = favoritos.ehFavorito(produto.id);
  const pix = precoPix(produto.preco);

  /* ------------------------------------------------------- migalhas ----- */
  const migalhas = document.getElementById('migalhas');
  if (migalhas) {
    migalhas.innerHTML = `
      <a href="index.html">Início</a> <span aria-hidden="true">/</span>
      <a href="catalogo.html">Catálogo</a> <span aria-hidden="true">/</span>
      <a href="catalogo.html?categoria=${esc(produto.categoria)}">${esc(nomeCategoria(produto.categoria))}</a>
      <span aria-hidden="true">/</span> <span>${esc(produto.nome)}</span>`;
  }

  /* -------------------------------------------------------- galeria ----- */
  /* Galeria com as FOTOS REAIS do produto. Quando existe mais de uma foto da
     mesma peça (frente, verso, embalagem), todas entram como miniatura.
     Quando há só uma, a miniatura é a própria — sem inventar ângulo falso. */
  const miniaturas = galeriaProduto(produto);

  const caixaCompat = montarCaixaCompat(produto, moto, universal, serve);

  const especificacoes = Object.keys(produto.especificacoes || {});
  const tabelaComps = (produto.compat || []).length
    ? `<table class="tabela-compat">
        <thead><tr><th>Marca</th><th>Modelo</th><th>Anos</th><th></th></tr></thead>
        <tbody>
          ${produto.compat
            .map(
              (c) => `<tr>
                <td>${esc(c.marca)}</td>
                <td>${esc(c.modelo)}</td>
                <td>${c.de} a ${c.ate}</td>
                <td>${
                  moto && moto.marca === c.marca && moto.modelo === c.modelo
                    ? `<span class="selo selo--ok">${icone('check', 12)} Sua moto</span>`
                    : ''
                }</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : `<p class="texto-2">Este é um produto universal: não depende do modelo da moto. Serve em qualquer uma.</p>`;

  if (alvo) {
    alvo.innerHTML = `
<nav class="produto-topo"></nav>
<div class="produto mt-3">

  <div class="galeria">
    <div class="galeria__principal caixa-foto" id="galeria-principal">
      ${midiaProduto(produto, { alt: produto.nome })}
    </div>
    ${
      miniaturas.length > 1
        ? `<div class="galeria__miniaturas" role="group" aria-label="Fotos do produto">
            ${miniaturas
              .map(
                (m, i) => `
            <button class="galeria__miniatura caixa-foto" type="button" data-miniatura="${i}"
                    aria-current="${i === 0 ? 'true' : 'false'}" aria-label="Ver ${esc(m.rotulo)}">
              ${midiaProduto({ foto: m.src, nome: produto.nome }, { alt: '', classe: 'foto-produto--mini' })}
            </button>`
              )
              .join('')}
          </div>`
        : ''
    }
  </div>

  <div>
    <div class="espaco-entre mb-2">
      <span class="selo selo--neutro">${esc(produto.marca)}</span>
      <button class="produto-card__favorito" type="button" data-favoritar="${esc(produto.id)}"
              aria-pressed="${fav ? 'true' : 'false'}"
              style="position:static;background:var(--fundo-2);width:auto;padding:0 14px;height:38px;border-radius:999px;display:inline-flex;gap:8px;align-items:center;font-size:.82rem;font-weight:650"
              aria-label="Salvar nos favoritos">
        ${icone('coracao', 17)} <span>${fav ? 'Salvo' : 'Salvar'}</span>
      </button>
    </div>

    <h1>${esc(produto.nome)}</h1>
    <p class="texto-2">${esc(produto.descricao)}</p>

    ${caixaCompat}

    <div class="produto__preco-linha">
      <span class="produto__preco">${moeda(produto.preco)}</span>
      ${temDesconto(produto) ? `<span class="produto__de">${moeda(produto.precoDe)}</span>` : ''}
      ${temDesconto(produto) ? `<span class="selo">-${descontoPct(produto)}%</span>` : ''}
    </div>
    <p class="produto__pix">
      ${icone('dinheiro', 15)} ${moeda(pix)} no Pix (${Math.round(LOJA.pixDesconto * 100)}% de desconto) ·
      ou ${moeda(produto.preco)} em até 3x sem juros
    </p>

    <p class="estoque-linha ${esgotado ? 'estoque-linha--fora' : Number(produto.estoque) <= Number(produto.estoqueMinimo) ? 'estoque-linha--baixo' : ''}">
      <span class="ponto"></span>
      ${
        esgotado
          ? 'Sem estoque no momento'
          : Number(produto.estoque) <= Number(produto.estoqueMinimo)
          ? `Últimas ${produto.estoque} unidades em estoque`
          : `${produto.estoque} unidades em estoque`
      }
    </p>

    <div class="compra-linha">
      <div class="quantidade" role="group" aria-label="Quantidade">
        <button type="button" data-qtd-menos aria-label="Diminuir quantidade">${icone('menos', 18)}</button>
        <label class="oculto" for="qtd">Quantidade</label>
        <input id="qtd" type="number" inputmode="numeric" min="1" max="${Math.max(1, Number(produto.estoque))}" value="1"
               ${esgotado ? 'disabled' : ''}>
        <button type="button" data-qtd-mais aria-label="Aumentar quantidade">${icone('mais', 18)}</button>
      </div>
      <button class="btn btn--grande" type="button" id="btn-adicionar"
              ${esgotado ? 'disabled aria-disabled="true"' : ''}>
        ${icone('carrinho', 20)} ${esgotado ? 'Sem estoque' : 'Adicionar ao carrinho'}
      </button>
    </div>
    <button class="btn btn--marinho btn--bloco btn--grande" type="button" id="btn-comprar"
            ${esgotado ? 'disabled aria-disabled="true"' : ''}>
      Comprar agora
    </button>

    <div class="linha mt-3" style="gap:10px">
      <span class="selo selo--ok">${icone('check', 12)} Retirada na loja</span>
      <span class="selo selo--neutro">${icone('caminhao', 12)} Envio para todo o Brasil</span>
      <span class="selo selo--neutro">${icone('escudo', 12)} Garantia do fabricante</span>
    </div>

    <ul class="lista-especificacoes mt-3">
      <li><span class="rot">Código (SKU)</span><span class="val">${esc(produto.sku)}</span></li>
      <li><span class="rot">Categoria</span><span class="val">${esc(nomeCategoria(produto.categoria))}</span></li>
      <li><span class="rot">Marca</span><span class="val">${esc(produto.marca)}</span></li>
      ${especificacoes
        .map((k) => `<li><span class="rot">${esc(k)}</span><span class="val">${esc(produto.especificacoes[k])}</span></li>`)
        .join('')}
      <li><span class="rot">Compatibilidade</span><span class="val">${universal ? 'Universal' : `${produto.compat.length} motos`}</span></li>
    </ul>

    <div class="caixa-compat caixa-compat--aviso">
      ${icone('alerta', 22)}
      <div>
        <strong>Não sabe se serve na sua moto?</strong>
        <p>Escolha marca, modelo e ano e conferimos para você. Também pode mandar no WhatsApp que a equipe responde.</p>
        <div class="hero__ctas mt-2">
          <a class="btn btn--pequeno" href="localizador.html">${icone('moto', 16)} Encontrar minha peça</a>
          <a class="btn btn--pequeno btn--contorno" target="_blank" rel="noopener"
             href="https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(`Olá! Quero confirmar se a peça ${produto.nome} (${produto.sku}) serve na minha moto.`)}">
            ${icone('telefone', 16)} Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="abas" role="tablist" aria-label="Informações do produto">
  <button class="aba" role="tab" aria-selected="true" data-aba="descricao">Descrição</button>
  <button class="aba" role="tab" aria-selected="false" data-aba="compat">Compatibilidade</button>
  <button class="aba" role="tab" aria-selected="false" data-aba="entrega">Entrega e retirada</button>
</div>

<div class="painel-aba" data-painel="descricao">
  <h3>Sobre esta peça</h3>
  <p class="texto-2">${esc(produto.descricao)}</p>
  ${
    especificacoes.length
      ? `<table class="tabela-compat mt-3">
          <tbody>${especificacoes
            .map((k) => `<tr><td class="texto-3">${esc(k)}</td><td class="forte">${esc(produto.especificacoes[k])}</td></tr>`)
            .join('')}</tbody>
        </table>`
      : ''
  }
</div>

<div class="painel-aba" data-painel="compat" hidden>
  <h3>Em quais motos esta peça serve</h3>
  <p class="texto-2">${universal ? 'Produto universal — não depende do modelo.' : 'Confira abaixo a lista completa de motos compatíveis.'}</p>
  ${tabelaComps}
</div>

<div class="painel-aba" data-painel="entrega" hidden>
  <h3>Como você recebe</h3>
  <div class="detalhe-pedido mt-2">
    <div class="painel-dados">
      <h3>${icone('loja', 20)} Retirada na loja</h3>
      <p class="texto-2 pequeno">Sem pagamento online: você reserva agora e paga no balcão, na hora de retirar. O site gera um código de retirada para apresentar na loja.</p>
      <div class="painel-dados__linha"><span class="rot">Endereço</span><span class="val">${esc(LOJA.endereco.rua)} — ${esc(LOJA.endereco.bairro)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Cidade</span><span class="val">${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Horário</span><span class="val">${esc(LOJA.horario[0].dia)}: ${esc(LOJA.horario[0].hora)}</span></div>
    </div>
    <div class="painel-dados">
      <h3>${icone('caminhao', 20)} Receber em casa</h3>
      <p class="texto-2 pequeno">Enviamos para todo o Brasil. No checkout você informa o CEP e vê as transportadoras com prazo e valor antes de fechar o pedido.</p>
      <div class="painel-dados__linha"><span class="rot">Frete grátis</span><span class="val">Acima de ${moeda(LOJA.freeShippingFrom)} no PAC</span></div>
      <div class="painel-dados__linha"><span class="rot">Prazo</span><span class="val">2 a 8 dias úteis</span></div>
    </div>
  </div>
</div>`;
  }

  /* ------------------------------------------------------- relacionados -- */
  const alvoRel = document.getElementById('relacionados');
  if (alvoRel) {
    const mesmaCat = PRODUTOS.filter((p) => p.categoria === produto.categoria && p.id !== produto.id).slice(0, 4);
    if (mesmaCat.length) {
      alvoRel.innerHTML = `
      <section class="secao">
        <div class="cabecalho-secao revelar">
          <span class="selo">Combina com</span>
          <h2 class="mt-2">Outros produtos de ${esc(nomeCategoria(produto.categoria))}</h2>
        </div>
        <div class="grade grade--4">${mesmaCat.map((p) => cardProduto(p, { moto })).join('')}</div>
      </section>`;
      cascata(alvoRel.querySelector('.grade'), 60);
    }
  }

  /* ------------------------------------------------------- interação ----- */
  const campoQtd = document.getElementById('qtd');
  const maximo = Math.max(1, Number(produto.estoque));

  function lerQtd() {
    let n = Math.floor(Number(campoQtd && campoQtd.value) || 1);
    if (!isFinite(n) || n < 1) n = 1;
    if (n > maximo) n = maximo;
    if (campoQtd) campoQtd.value = String(n);
    return n;
  }

  const btnMenos = document.querySelector('[data-qtd-menos]');
  const btnMais = document.querySelector('[data-qtd-mais]');
  if (btnMenos) btnMenos.addEventListener('click', () => { campoQtd.value = String(Math.max(1, lerQtd() - 1)); });
  if (btnMais) btnMais.addEventListener('click', () => { campoQtd.value = String(Math.min(maximo, lerQtd() + 1)); });
  if (campoQtd) campoQtd.addEventListener('change', lerQtd);

  const btnAdd = document.getElementById('btn-adicionar');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const r = carrinho.adicionar(produto.id, lerQtd());
      if (r.ok) {
        avisar(r.mensagem);
        atualizarContadores();
      } else {
        avisar(r.mensagem, 'erro');
      }
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
  $$('.aba').forEach((b) => {
    b.addEventListener('click', () => {
      $$('.aba').forEach((x) => x.setAttribute('aria-selected', 'false'));
      b.setAttribute('aria-selected', 'true');
      const alvoAba = b.getAttribute('data-aba');
      $$('.painel-aba').forEach((p) => {
        p.hidden = p.getAttribute('data-painel') !== alvoAba;
      });
    });
  });

  /* miniaturas: troca a foto grande pela foto escolhida */
  $$('[data-miniatura]').forEach((b) => {
    b.addEventListener('click', () => {
      $$('[data-miniatura]').forEach((x) => x.setAttribute('aria-current', 'false'));
      b.setAttribute('aria-current', 'true');
      const i = Number(b.getAttribute('data-miniatura'));
      const escolhida = miniaturas[i];
      const principal = document.getElementById('galeria-principal');
      if (principal && escolhida) {
        principal.innerHTML = midiaProduto(
          { foto: escolhida.src, nome: produto.nome },
          { alt: produto.nome }
        );
      }
    });
  });

  prepararRevelar();
}

/* --------------------------------------------------- caixa de compat ----- */
function montarCaixaCompat(produto, moto, universal, serve) {
  if (universal) {
    return `
    <div class="caixa-compat caixa-compat--universal">
      ${icone('checkCirculo', 22)}
      <div>
        <strong>Acessório universal</strong>
        <p>Não depende do modelo da moto — serve em qualquer uma. Ideal para equipamento e item de uso geral.</p>
      </div>
    </div>`;
  }

  if (serve) {
    return `
    <div class="caixa-compat">
      ${icone('checkCirculo', 22)}
      <div>
        <strong>Serve na sua ${esc(moto.marca)} ${esc(moto.modelo)}${moto.ano ? ' ' + moto.ano : ''}</strong>
        <p>Esta peça é compatível com a moto que você cadastrou. Pode comprar tranquilo.</p>
      </div>
    </div>`;
  }

  if (moto) {
    return `
    <div class="caixa-compat caixa-compat--aviso">
      ${icone('alerta', 22)}
      <div>
        <strong>Atenção: não serve na sua ${esc(moto.marca)} ${esc(moto.modelo)}</strong>
        <p>Esta peça é feita para outro modelo. Veja abaixo para quais motos ela serve, ou busque a peça para a sua moto.</p>
        <a class="btn btn--pequeno mt-2" href="localizador.html">${icone('moto', 16)} Buscar peça para a minha moto</a>
      </div>
    </div>`;
  }

  const c = produto.compat[0];
  const outras = produto.compat.slice(1, 4).map((x) => `${x.marca} ${x.modelo}`);
  return `
  <div class="caixa-compat caixa-compat--aviso">
    ${icone('moto', 22)}
    <div>
      <strong>Peça específica: ${esc(c.marca)} ${esc(c.modelo)} (${c.de}–${c.ate})</strong>
      <p>Também serve em ${outras.map(esc).join(', ')}${produto.compat.length > 4 ? ' e outras' : ''}.
         Informe a sua moto para confirmar.</p>
      <a class="btn btn--pequeno mt-2" href="localizador.html">${icone('moto', 16)} Confirmar na minha moto</a>
    </div>
  </div>`;
}

function atualizarContadores() {
  import('./shell.js').then((m) => m.atualizarContadorCarrinho()).catch(() => {});
}
