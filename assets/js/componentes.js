/* ============================================================================
   COMPONENTES — pedaços reaproveitados por várias páginas
   ----------------------------------------------------------------------------
   O card de produto é o MESMO na home, no catálogo, na busca e nas ofertas.
   Se ele morasse em cada página, os quatro já teriam divergido.
   ============================================================================ */

import { LOJA, precoPix, parcelaDe, produtoServeEm, ehUniversal, rotuloMoto, aplicacoesDoProduto } from './dados.js';
import { moeda, esc, icone, temDesconto, descontoPct, estrelas } from './utils.js';
import { midiaProduto } from './artes.js';
import { favoritos, moto as motoStore } from './carrinho.js';

/* -------------------------------------------------------------- card ----- */
export function cardProduto(p, opcoes = {}) {
  const moto = opcoes.moto !== undefined ? opcoes.moto : motoStore.ler();
  const universal = ehUniversal(p);
  const serve = moto && !universal ? produtoServeEm(p, moto) : false;
  const esgotado = Number(p.estoque) <= 0;
  const fav = favoritos.ehFavorito(p.id);
  const pix = precoPix(p.preco);
  const nota = p.avaliacao ? p.avaliacao.nota : null;

  /* Compatibilidade em UMA linha, discreta — informação técnica, não alarme. */
  let compat;
  if (universal) {
    compat = `<span class="compat compat--universal">${icone('check', 13)} Produto universal</span>`;
  } else if (serve) {
    compat = `<span class="compat compat--serve">${icone('check', 13)} Serve na sua moto</span>`;
  } else if (moto) {
    compat = `<span class="compat compat--outra">${icone('moto', 13)} Não serve na sua moto</span>`;
  } else {
    const c = p.compat[0];
    const mais = p.compat.length > 1 ? ` +${p.compat.length - 1}` : '';
    compat = `<span class="compat compat--outra">${icone('moto', 13)} ${esc(c.marca)} ${esc(c.modelo)}${mais}</span>`;
  }

  const selos = [];
  if (temDesconto(p)) selos.push(`<span class="selo">-${descontoPct(p)}%</span>`);
  if (esgotado) selos.push(`<span class="selo selo--marinho">Esgotado</span>`);
  else if (Number(p.estoque) <= Number(p.estoqueMinimo)) selos.push(`<span class="selo selo--alerta">Últimas</span>`);

  return `
<article class="produto-card revelar${esgotado ? ' produto-card--esgotado' : ''}">
  <div class="produto-card__midia">
    <a href="produto.html?id=${encodeURIComponent(p.id)}" aria-label="Ver ${esc(p.nome)}">
      ${midiaProduto(p, { alt: p.nome })}
    </a>
    <span class="produto-card__brilho" aria-hidden="true"></span>
    <div class="produto-card__selos">${selos.join('')}</div>
    <button class="produto-card__favorito" type="button" data-favoritar="${esc(p.id)}"
            aria-pressed="${fav ? 'true' : 'false'}" aria-label="Salvar ${esc(p.nome)} nos favoritos">
      ${icone('coracao', 18)}
    </button>
  </div>

  <div class="produto-card__corpo">
    <span class="produto-card__cat">${esc(p.marca)}</span>
    <h3 class="produto-card__nome">
      <a href="produto.html?id=${encodeURIComponent(p.id)}">${esc(p.nome)}</a>
    </h3>
    <div class="produto-card__compat">${compat}</div>

    <div class="produto-card__precos">
      ${temDesconto(p) ? `<span class="produto-card__de">${moeda(p.precoDe)}</span>` : ''}
      <span class="produto-card__preco">${moeda(p.preco)}</span>
      <span class="produto-card__pix">${moeda(pix)} no Pix</span>
    </div>

    <div class="produto-card__rodape">
      ${
        esgotado
          ? `<button class="btn btn--contorno btn--bloco btn--pequeno" type="button" disabled>Sem estoque</button>`
          : `<button class="btn btn--bloco btn--pequeno" type="button" data-add-carrinho="${esc(p.id)}" data-qtd="1">
               ${icone('carrinho', 17)} Adicionar
             </button>`
      }
    </div>
  </div>
</article>`;
}

export function gradeProdutos(lista, opcoes = {}) {
  if (!lista.length) return estadoVazio(opcoes.vazio || {});
  const classe = opcoes.classe || 'grade--4';
  return `<div class="grade ${classe}">${lista.map((p) => cardProduto(p, opcoes)).join('')}</div>`;
}

/* ----------------------------------------------------- estado vazio ------ */
export function estadoVazio({
  icone: ic = 'buscar', titulo = 'Nada encontrado', texto = '', acao = null,
} = {}) {
  return `
<div class="estado-vazio">
  <div class="estado-vazio__icone">${icone(ic, 34)}</div>
  <h3>${esc(titulo)}</h3>
  ${texto ? `<p>${esc(texto)}</p>` : ''}
  ${acao ? `<a class="btn" href="${acao.href}">${esc(acao.rotulo)}</a>` : ''}
</div>`;
}

/* -------------------------------------------------- título de seção ------ */
/* Etiqueta + título + subtítulo. É o padrão que dá ritmo à página inteira. */
export function tituloSecao({ etiqueta, titulo, texto, centro = false, linha = false, acao = null }) {
  const corpo = `
    ${etiqueta ? `<span class="etiqueta">${esc(etiqueta)}</span>` : ''}
    <h2>${titulo}</h2>
    ${texto ? `<p>${texto}</p>` : ''}`;

  if (linha) {
    return `<div class="titulo-secao titulo-secao--linha revelar">
      <div>${corpo}</div>
      ${acao ? `<a class="link-seta" href="${acao.href}">${esc(acao.rotulo)} ${icone('seta', 16)}</a>` : ''}
    </div>`;
  }
  return `<div class="titulo-secao${centro ? ' titulo-secao--centro' : ''} revelar">${corpo}</div>`;
}

/* ------------------------------------------------------------ avaliação -- */
export function cardAvaliacao(a) {
  const iniciais = String(a.nome || '').split(/\s+/).slice(0, 2)
    .map((p) => p.charAt(0)).join('').toUpperCase();

  return `
<article class="avaliacao revelar">
  <div class="avaliacao__topo">
    <span class="avaliacao__avatar">${esc(iniciais)}</span>
    <span>
      <span class="avaliacao__nome">${esc(a.nome)}</span>
      <span class="avaliacao__local">${esc(a.local)}</span>
    </span>
  </div>
  <div class="estrelas" role="img" aria-label="Nota ${a.nota} de 5">${estrelas(a.nota)}</div>
  <p class="avaliacao__texto">“${esc(a.texto)}”</p>
  <span class="avaliacao__produto">${esc(a.produto)}</span>
</article>`;
}

/* ---------------------------------------------------------------- FAQ ---- */
export function blocoFaq(lista) {
  return `<div class="faq">${lista.map((f) => `
    <details class="faq__item revelar">
      <summary class="faq__pergunta">${esc(f.p)}</summary>
      <div class="faq__resposta"><p>${esc(f.r)}</p></div>
    </details>`).join('')}</div>`;
}

/* ---------------------------------------------------- faixa de marcas ---- */
export function marqueeMarcas(nomes) {
  const itens = nomes.map((n) => `<span class="marquee__item">${esc(n)}</span>`).join('');
  return `<div class="marquee" aria-hidden="true"><div class="marquee__trilha">${itens}${itens}</div></div>`;
}

export function avisoDemo(texto) {
  return `<div class="aviso-demostrativo">${icone('info', 15)}<span>${esc(texto)}</span></div>`;
}

/* --------------------------------------------------- linha de produto ---- */
export function linhaProduto(item, { mostrarPreco = true, prefixo = '' } = {}) {
  return `
<div class="linha-produto">
  <div class="linha-produto__midia">${midiaProduto({ foto: item.foto, nome: item.nome }, { alt: item.nome, classe: 'foto-produto--mini', prefixo })}</div>
  <div class="linha-produto__corpo">
    <p class="linha-produto__nome">${esc(item.nome)}</p>
    <span class="linha-produto__qtd">${item.qtd} × ${moeda(item.preco)}</span>
  </div>
  ${mostrarPreco ? `<span class="linha-produto__preco">${moeda(item.subtotal)}</span>` : ''}
</div>`;
}

/* ------------------------------------------------ resumo do pedido ------- */
export function resumoValores({ subtotal, frete, freteRotulo, total, pix }) {
  return `
<div class="resumo__linha"><span>Subtotal</span><span>${moeda(subtotal)}</span></div>
${
  frete != null
    ? `<div class="resumo__linha"><span>Frete${freteRotulo ? ` (${esc(freteRotulo)})` : ''}</span><span>${frete === 0 ? 'Grátis' : moeda(frete)}</span></div>`
    : ''
}
${
  pix != null
    ? `<div class="resumo__linha"><span>No Pix (${Math.round(LOJA.pixDesconto * 100)}% off)</span><span>${moeda(pix)}</span></div>`
    : ''
}`;
}

/* ------------------------------------- compatibilidade: texto do produto -- */
/*
   Devolve o bloco que responde, sem rodeio, "serve na minha moto?" — nos três
   casos possíveis: universal, serve, ou não serve (com o caminho de saída).
*/
export function blocoCompatibilidade(produto, moto) {
  const universal = ehUniversal(produto);

  if (universal) {
    return `<div class="caixa-compat caixa-compat--universal">
      ${icone('checkCirculo', 20)}
      <div>
        <strong>Produto universal</strong>
        <p>Não depende do modelo da moto — serve em qualquer uma. É o caso de capacete, capa de chuva e equipamento de uso geral.</p>
      </div>
    </div>`;
  }

  if (!moto) {
    return `<div class="caixa-compat caixa-compat--aviso">
      ${icone('moto', 20)}
      <div>
        <strong>Confira se esta peça serve na sua moto.</strong>
        <p>Escolha marca, modelo, versão e ano — o site confirma na hora.</p>
        <div class="linha mt-3">
          <a class="btn btn--pequeno" href="localizador.html">${icone('moto', 16)} Selecionar minha moto</a>
          <button class="btn btn--pequeno btn--contorno" type="button" data-ver-aplicacoes="${esc(produto.id)}">
            Ver todas as motos compatíveis
          </button>
        </div>
      </div>
    </div>`;
  }

  if (produtoServeEm(produto, moto)) {
    return `<div class="caixa-compat caixa-compat--serve">
      ${icone('checkCirculo', 20)}
      <div>
        <strong>Esta peça serve na sua moto</strong>
        <p>Compatível com <strong>${esc(rotuloMoto(moto))}</strong>. Pode comprar tranquilo.</p>
        <button class="btn btn--pequeno btn--contorno mt-3" type="button" data-ver-aplicacoes="${esc(produto.id)}">
          Ver todas as motos compatíveis
        </button>
      </div>
    </div>`;
  }

  return `<div class="caixa-compat caixa-compat--aviso">
    ${icone('alerta', 20)}
    <div>
      <strong>Atenção: esta peça não serve na sua moto</strong>
      <p>Ela é feita para outro modelo. Você pode ver para quais motos ela serve ou buscar a peça certa para a sua.</p>
      <div class="linha mt-3">
        <a class="btn btn--pequeno" href="catalogo.html?moto=1">${icone('moto', 16)} Ver peças para a minha moto</a>
        <button class="btn btn--pequeno btn--contorno" type="button" data-ver-aplicacoes="${esc(produto.id)}">
          Ver motos compatíveis
        </button>
      </div>
    </div>
  </div>`;
}

/* --------------------------------------------- drawer: aplicações --------- */
export function drawerAplicacoes(produto) {
  const apps = aplicacoesDoProduto(produto);

  if (!apps.length) {
    return {
      titulo: 'Aplicações',
      corpo: `<p class="texto-2">Este é um <strong>produto universal</strong>: não depende do modelo da moto, serve em qualquer uma.</p>`,
    };
  }

  /* Agrupa por marca+modelo para a leitura ficar limpa na tela. */
  const porModelo = new Map();
  apps.forEach((a) => {
    const chave = `${a.marca}|${a.modelo}`;
    if (!porModelo.has(chave)) porModelo.set(chave, { marca: a.marca, modelo: a.modelo, itens: [] });
    porModelo.get(chave).itens.push(a);
  });

  const corpo = `
    <p class="texto-2 pequeno mb-3">${apps.length} aplicações confirmadas para <strong>${esc(produto.nome)}</strong>.</p>
    ${Array.from(porModelo.values())
      .map(
        (g) => `
      <div class="painel-dados mb-3">
        <h3>${esc(g.marca)} ${esc(g.modelo)}</h3>
        <table class="tabela-compat">
          <thead><tr><th>Versão</th><th>Anos</th><th>Motor</th></tr></thead>
          <tbody>
            ${g.itens
              .map(
                (i) => `<tr>
                  <td>${esc(i.versao)}</td>
                  <td class="forte">${esc(i.anos)}</td>
                  <td class="texto-3">${esc(i.cilindrada || '—')}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
        ${g.itens.some((i) => i.observacao)
          ? `<p class="micro texto-3 mt-2 mb-0">Obs.: ${esc(g.itens.filter((i) => i.observacao).map((i) => i.observacao).join(' · '))}</p>`
          : ''}
      </div>`
      )
      .join('')}`;

  return { titulo: 'Motos compatíveis', corpo };
}
