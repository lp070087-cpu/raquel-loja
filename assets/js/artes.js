/* ============================================================================
   FOTOS — mídia dos produtos
   ----------------------------------------------------------------------------
   Todo produto do catálogo tem FOTO REAL (ver dados.js). Este módulo é o único
   lugar que decide como uma foto entra na tela, para o enquadramento ficar
   igual no card, na página do produto, no carrinho, no pedido e no admin.

   Por que não existe mais arte desenhada:
   a primeira versão desta apresentação usava desenho vetorial porque as fotos
   não estavam acessíveis. Agora estão — então o desenho saiu de cena e a foto
   real entrou. `midiaProduto()` continua sendo a única porta, então trocar o
   enquadramento um dia é mexer só aqui.
   ============================================================================ */

/* --------------------------------------------------------------- escapes -- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* -------------------------------------------------------------- ajustes --- */
/*
   As fotos vieram de tamanhos diferentes (198 a 284 px de largura). As medidas
   abaixo só dizem como a foto se acomoda na caixa:
     --foto-zoom  aproxima o produto (fotos com muita borda branca pedem mais)
     --foto-y     empurra o enquadramento na vertical
   Se alguma foto ficar deslocada, ajuste SÓ na lista abaixo.
*/
const AJUSTE = {
  'oleo-01': { zoom: 1.06 },
  'oleo-02': { zoom: 1.06 },
  'oleo-03': { zoom: 1.04 },
  'oleo-04': { zoom: 1.06 },
  'oleo-05': { zoom: 1.06 },
  'filtro-oleo-01': { zoom: 1.12 },
  'filtro-oleo-02': { zoom: 1.18, y: '-4%' },
  'disco-freio-01': { zoom: 1.1 },
  'disco-freio-02': { zoom: 1.1 },
  'disco-freio-03': { zoom: 1.1 },
  'disco-freio-04': { zoom: 1.1 },
  'pastilha-01': { zoom: 1.12 },
  'pastilha-02': { zoom: 1.16 },
  'pastilha-03': { zoom: 1.12 },
  'transmissao-01': { zoom: 1.12 },
  'transmissao-02': { zoom: 1.14 },
  'pneu-01': { zoom: 1.08 },
  'pneu-02': { zoom: 1.08 },
  'pneu-03': { zoom: 1.08 },
  'pneu-04': { zoom: 1.1 },
  'pneu-05': { zoom: 1.1 },
  'capacete-01': { zoom: 1.04 },
  'capacete-02': { zoom: 1.04 },
  'capacete-03': { zoom: 1.04 },
  'capacete-04': { zoom: 1.08, y: '-3%' },
  'capa-chuva-01': { zoom: 1.06, y: '-2%' },
  'capa-chuva-02': { zoom: 1.04 },
};

/* Descobre o ajuste pela última parte do caminho: ".../oleo-01.jpg". */
function ajusteDe(caminho) {
  const m = /([a-z-]+-\d{2})\.(?:jpg|jpeg|png|webp)$/i.exec(String(caminho || ''));
  return (m && AJUSTE[m[1]]) || {};
}

/* ------------------------------------------------------------- principal -- */
/**
 * HTML de uma foto de produto, já enquadrada pelo CSS.
 * @param {object} produto  { foto, nome }
 * @param {object} opcoes   { alt, classe, leve, prefixo }
 *
 * `prefixo` resolve o caminho relativo para páginas que NÃO estão na raiz.
 * O admin mora em /admin/, então lá o prefixo é '../' — sem isso a foto vira
 * /admin/public/... e não carrega.
 */
export function midiaProduto(produto, opcoes = {}) {
  const bruto = produto && produto.foto;
  const alt = opcoes.alt != null ? opcoes.alt : (produto && produto.nome) || '';
  const prefixo = opcoes.prefixo || '';
  const caminho = bruto ? prefixo + bruto : null;

  if (!caminho) {
    // Só acontece se alguém cadastrar produto sem foto. Deixa um vazio discreto,
    // nunca um "placeholder cinza" que pareça defeito.
    return `<span class="foto-vazia" role="img" aria-label="${esc(alt)}"></span>`;
  }

  const a = ajusteDe(bruto);
  const estilo = [
    a.zoom ? `--foto-zoom:${a.zoom}` : '',
    a.y ? `--foto-y:${a.y}` : '',
  ].filter(Boolean).join(';');

  const classe = ['foto-produto'].concat(opcoes.classe ? [opcoes.classe] : []).join(' ');

  return (
    `<img class="${classe}" src="${esc(caminho)}" alt="${esc(alt)}"` +
    (estilo ? ` style="${estilo}"` : '') +
    (opcoes.leve ? '' : ' loading="lazy"') +
    ' decoding="async">'
  );
}

/* Foto quadrada usada nas miniaturas (carrinho, admin, linha de pedido). */
export function miniaturaProduto(produto, opcoes = {}) {
  return midiaProduto(produto, Object.assign({}, opcoes, { classe: 'foto-produto--mini' }));
}

/* --------------------------------------------------------------- galeria -- */
/* Todas as fotos de um produto, para a galeria da página de produto. */
export function galeriaProduto(produto) {
  const lista = (produto && produto.fotos && produto.fotos.length)
    ? produto.fotos
    : (produto && produto.foto ? [produto.foto] : []);
  return lista.map((f, i) => ({
    src: f,
    rotulo: i === 0 ? 'Principal' : `Vista ${i + 1}`,
    ajuste: ajusteDe(f),
  }));
}

export function artesDisponiveis() {
  return Object.keys(AJUSTE);
}
