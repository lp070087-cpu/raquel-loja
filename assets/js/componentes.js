/* ============================================================================
   COMPONENTES — pedaços de tela reaproveitados por várias páginas
   ----------------------------------------------------------------------------
   Um card de produto é o MESMO na home, no catálogo, na busca e nas ofertas.
   Se ele morasse em cada página, os quatro já teriam divergido.
   ============================================================================ */

import { LOJA, precoPix, produtoServeEm } from './dados.js';
import { moeda, esc, icone, temDesconto, descontoPct, estrelas } from './utils.js';
import { midiaProduto } from './artes.js';
import { favoritos, moto as motoStore } from './carrinho.js';

/* --------------------------------------------------- card de produto ----- */
/**
 * @param {object} p produto
 * @param {object} opcoes { moto, compacto }
 */
export function cardProduto(p, opcoes = {}) {
  const moto = opcoes.moto || motoStore.ler();
  const universal = !p.compat || p.compat.length === 0;
  const serve = moto && !universal ? produtoServeEm(p, moto) : false;
  const esgotado = Number(p.estoque) <= 0;
  const fav = favoritos.ehFavorito(p.id);
  const pix = precoPix(p.preco);

  /* Selo de compatibilidade — muda conforme exista uma moto escolhida */
  let seloCompat;
  if (universal) {
    seloCompat = `<span class="selo selo--neutro">Universal</span>`;
  } else if (serve) {
    seloCompat = `<span class="selo selo--ok">${icone('check', 12)} Compatível com sua moto</span>`;
  } else {
    seloCompat = `<span class="selo selo--vazio">Peça específica</span>`;
  }

  const seloDesconto = temDesconto(p)
    ? `<span class="selo">-${descontoPct(p)}%</span>`
    : '';
  const seloEsgotado = esgotado ? `<span class="selo selo--marinho">Esgotado</span>` : '';

  /* Linha de compatibilidade em texto, abaixo do nome */
  let linhaCompat;
  if (universal) {
    linhaCompat = `<p class="produto-card__compat">Serve em qualquer moto</p>`;
  } else if (serve) {
    linhaCompat = `<p class="produto-card__compat produto-card__compat--ok">${icone('check', 14)} Serve na sua ${esc(moto.marca)} ${esc(moto.modelo)}${moto.ano ? ' ' + moto.ano : ''}</p>`;
  } else {
    const c = p.compat[0];
    const mais = p.compat.length > 1 ? ` e mais ${p.compat.length - 1}` : '';
    linhaCompat = `<p class="produto-card__compat">${esc(c.marca)} ${esc(c.modelo)}${mais}</p>`;
  }

  return `
<article class="produto-card${esgotado ? ' produto-card--esgotado' : ''} revelar">
  <div class="produto-card__midia">
    <a href="produto.html?id=${encodeURIComponent(p.id)}" aria-label="Ver ${esc(p.nome)}">
      ${midiaProduto(p, { alt: p.nome })}
    </a>
    <div class="produto-card__selos">${seloDesconto}${seloEsgotado}</div>
    <button class="produto-card__favorito" type="button" data-favoritar="${esc(p.id)}"
            aria-pressed="${fav ? 'true' : 'false'}" aria-label="Salvar ${esc(p.nome)} nos favoritos">
      ${icone('coracao', 19)}
    </button>
  </div>

  <div class="produto-card__corpo">
    <span class="produto-card__cat">${esc(p.marca)}</span>
    <h3 class="produto-card__nome">
      <a href="produto.html?id=${encodeURIComponent(p.id)}">${esc(p.nome)}</a>
    </h3>
    ${linhaCompat}

    <div class="produto-card__precos">
      ${temDesconto(p) ? `<span class="produto-card__de">${moeda(p.precoDe)}</span>` : ''}
      <span class="produto-card__preco">${moeda(p.preco)}</span>
    </div>
    <span class="produto-card__pix">${moeda(pix)} no Pix</span>

    <div class="produto-card__rodape">
      ${
        esgotado
          ? `<button class="btn btn--contorno btn--bloco btn--pequeno" type="button" disabled>Sem estoque</button>`
          : `<button class="btn btn--bloco btn--pequeno" type="button" data-add-carrinho="${esc(p.id)}" data-qtd="1">
               ${icone('carrinho', 18)} Adicionar
             </button>`
      }
    </div>
  </div>
</article>`;
}

/* ------------------------------------------------- grade de produtos ----- */
export function gradeProdutos(lista, opcoes = {}) {
  if (!lista.length) return estadoVazio(opcoes);
  const classe = opcoes.classe || 'grade--4';
  return `<div class="grade ${classe}">${lista
    .map((p) => cardProduto(p, opcoes))
    .join('')}</div>`;
}

/* ---------------------------------------------------- estado vazio -------- */
export function estadoVazio({
  icone: ic = 'buscar',
  titulo = 'Nada encontrado',
  texto = '',
  acao = null,
} = {}) {
  return `
<div class="estado-vazio">
  <div class="estado-vazio__icone">${icone(ic, 36)}</div>
  <h3>${esc(titulo)}</h3>
  ${texto ? `<p>${esc(texto)}</p>` : ''}
  ${acao ? `<a class="btn" href="${acao.href}">${esc(acao.rotulo)}</a>` : ''}
</div>`;
}

/* ------------------------------------------------------- cabeçalho ------- */
export function cabecalhoSecao({ badge, titulo, texto, centro = false, claro = false }) {
  return `
<div class="cabecalho-secao${centro ? ' cabecalho-secao--centro' : ''} revelar">
  ${badge ? `<span class="selo${claro ? '' : ''}">${esc(badge)}</span>` : ''}
  <h2${badge ? ' class="mt-2"' : ''}>${titulo}</h2>
  ${texto ? `<p>${texto}</p>` : ''}
</div>`;
}

/* ----------------------------------------------------------- avaliação --- */
export function cardAvaliacao(a) {
  const iniciais = String(a.nome || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();

  return `
<article class="avaliacao revelar">
  <div class="avaliacao__topo">
    <span class="avaliacao__avatar">${esc(iniciais)}</span>
    <span>
      <span class="avaliacao__nome">${esc(a.nome)}</span>
      <span class="avaliacao__local">${esc(a.local)}</span>
    </span>
  </div>
  <div class="avaliacao__estrelas" role="img" aria-label="Nota ${a.nota} de 5">${estrelas(a.nota)}</div>
  <p class="avaliacao__texto">“${esc(a.texto)}”</p>
  <span class="avaliacao__produto">${esc(a.produto)}</span>
</article>`;
}

/* --------------------------------------------------------------- FAQ ----- */
export function blocoFaq(lista) {
  return `<div class="faq">${lista
    .map(
      (f) => `
    <details class="faq__item revelar">
      <summary class="faq__pergunta">${esc(f.p)}</summary>
      <div class="faq__resposta"><p>${esc(f.r)}</p></div>
    </details>`
    )
    .join('')}</div>`;
}

/* ------------------------------------------------- faixa de marcas ------- */
export function marqueeMarcas(marcas) {
  const nomes = marcas.map((m) => `<span class="marquee__item">${esc(m.nome)}</span>`).join('');
  // duplicado para o laço ficar contínuo (a animação vai até -50%)
  return `<div class="marquee" aria-hidden="true"><div class="marquee__trilha">${nomes}${nomes}</div></div>`;
}

/* ------------------------------------------------- aviso demonstrativo --- */
export function avisoDemo(texto) {
  return `<div class="aviso-demostrativo">${icone('info', 16)}<span>${esc(texto)}</span></div>`;
}

/* -------------------------------------------------- linha de produto ----- */
/* Usada no resumo do checkout, no pedido e no admin. */
export function linhaProduto(item, { mostrarPreco = true } = {}) {
  const p = { arte: item.arte, foto: item.foto, nome: item.nome };
  return `
<div class="linha-produto">
  <div class="linha-produto__midia">${midiaProduto(p, { alt: item.nome })}</div>
  <div class="linha-produto__corpo">
    <p class="linha-produto__nome">${esc(item.nome)}</p>
    <span class="linha-produto__qtd">${item.qtd} × ${moeda(item.preco)}</span>
  </div>
  ${mostrarPreco ? `<span class="linha-produto__preco">${moeda(item.subtotal)}</span>` : ''}
</div>`;
}

/* ---------------------------------------------------- resumo de valores -- */
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

export { motoStore };
