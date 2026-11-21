/* ============================================================================
   MARCA — logotipo tipográfico gerado a partir do nome da loja
   ----------------------------------------------------------------------------
   O nome vem de LOJA.nome, que o painel pode trocar em Configurações > Nome da
   loja. Por isso o logo não é uma imagem fixa: ele é montado com o nome atual.

   • Símbolo: selo amarelo com o monograma (ex.: "RM"), inclinado para frente
     como o movimento da moto, com um traço de velocidade embaixo.
   • Nome: primeira palavra em peso forte, o resto em caixa alta espaçada
     (ex.: RM  MOTOS). Um nome de uma palavra só fica todo em peso forte.
   ============================================================================ */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function palavras(nome) {
  return String(nome || '').trim().split(/\s+/).filter(Boolean);
}

/** "RM Motos" -> "RM"; "Moto Peças" -> "MP"; "Raquel" -> "R". */
export function monograma(nome) {
  const p = palavras(nome);
  if (!p.length) return '';
  const primeira = p[0].replace(/[^\p{L}\p{N}]/gu, '');
  if (primeira.length >= 2 && primeira.length <= 3 && primeira === primeira.toUpperCase()) return primeira;
  return p.slice(0, 2).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').charAt(0)).join('').toUpperCase();
}

/** O selo com o monograma. */
export function htmlSimbolo(nome) {
  const m = monograma(nome);
  return `<span class="marca__mono" data-letras="${m.length}" aria-hidden="true">${esc(m)}</span>`;
}

/** O nome com a hierarquia da marca: destaque + complemento. */
export function htmlNome(nome) {
  const p = palavras(nome);
  if (p.length < 2) return `<span class="marca__forte">${esc(p[0] || '')}</span>`;
  return `<span class="marca__forte">${esc(p[0])}</span><span class="marca__resto">${esc(p.slice(1).join(' '))}</span>`;
}

/** Preenche um elemento .marca já existente (usado nas páginas do painel). */
export function aplicarMarca(raiz, nome) {
  if (!raiz) return;
  const simbolo = raiz.querySelector('.marca__simbolo');
  const rotulo = raiz.querySelector('.marca__nome');
  if (simbolo) simbolo.innerHTML = htmlSimbolo(nome);
  if (rotulo) { rotulo.innerHTML = htmlNome(nome); rotulo.setAttribute('aria-label', nome); }
}
