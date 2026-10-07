/* ============================================================================
   PÁGINA — CATÁLOGO
   ----------------------------------------------------------------------------
   Os filtros filtram DE VERDADE: o estado vive na URL, então voltar no
   navegador, recarregar ou mandar o link para alguém reabre a mesma lista.
   Isso também é o que faz o localizador funcionar — ele chega por URL
   (?moto=1&marca=Honda&modelo=CG%20160&ano=2025).
   ============================================================================ */

import { CATEGORIAS, PRODUTOS, precoPix, produtoServeEm } from './dados.js';
import { icone, esc, $, $$, moeda, prepararRevelar, cascata, temDesconto, descontoPct } from './utils.js';
import { cardProduto, estadoVazio } from './componentes.js';
import { buscarProdutos, moto as motoStore } from './carrinho.js';
import { ligarLocalizador } from './localizador.js';

const ORDEM = [
  { v: 'relevancia', t: 'Mais relevantes' },
  { v: 'menor', t: 'Menor preço' },
  { v: 'maior', t: 'Maior preço' },
  { v: 'nome', t: 'Nome (A–Z)' },
  { v: 'novidades', t: 'Novidades' },
];

const FAIXAS = [
  { id: 'ate50',   rotulo: 'Até R$ 50',            teste: (p) => p.preco <= 50 },
  { id: '50a150',  rotulo: 'R$ 50 a R$ 150',       teste: (p) => p.preco > 50 && p.preco <= 150 },
  { id: '150a300', rotulo: 'R$ 150 a R$ 300',      teste: (p) => p.preco > 150 && p.preco <= 300 },
  { id: 'ac300',   rotulo: 'Acima de R$ 300',      teste: (p) => p.preco > 300 },
];

/* --------------------------------------------------------------- estado -- */
function estadoDaURL() {
  const q = new URLSearchParams(window.location.search);
  return {
    categorias: (q.get('categoria') || '').split(',').filter(Boolean),
    marcas: (q.get('marcaProduto') || '').split(',').filter(Boolean),
    faixas: (q.get('faixa') || '').split(',').filter(Boolean),
    compat: q.get('compat') || '',            // '' | 'universal' | 'especifica' | 'minhamoto'
    busca: q.get('busca') || '',
    ofertas: q.get('ofertas') === '1',
    ordenar: q.get('ordenar') || 'relevancia',
    moto: q.get('moto') === '1'
      ? { marca: q.get('marca') || '', modelo: q.get('modelo') || '', ano: q.get('ano') ? Number(q.get('ano')) : null }
      : null,
  };
}

function escreverURL(estado) {
  const q = new URLSearchParams();
  if (estado.categorias.length) q.set('categoria', estado.categorias.join(','));
  if (estado.marcas.length) q.set('marcaProduto', estado.marcas.join(','));
  if (estado.faixas.length) q.set('faixa', estado.faixas.join(','));
  if (estado.compat) q.set('compat', estado.compat);
  if (estado.busca) q.set('busca', estado.busca);
  if (estado.ofertas) q.set('ofertas', '1');
  if (estado.ordenar !== 'relevancia') q.set('ordenar', estado.ordenar);
  if (estado.moto) {
    q.set('moto', '1');
    q.set('marca', estado.moto.marca);
    q.set('modelo', estado.moto.modelo);
    if (estado.moto.ano) q.set('ano', String(estado.moto.ano));
  }
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
}

/* -------------------------------------------------------------- filtros -- */
function aplicar(estado) {
  let lista = PRODUTOS.slice();
  const moto = estado.moto || motoStore.ler();

  if (estado.busca) lista = buscarProdutos(estado.busca, lista);

  if (estado.categorias.length) {
    lista = lista.filter((p) => estado.categorias.indexOf(p.categoria) !== -1);
  }

  if (estado.marcas.length) {
    lista = lista.filter((p) => estado.marcas.indexOf(p.marca) !== -1);
  }

  if (estado.faixas.length) {
    const testes = FAIXAS.filter((f) => estado.faixas.indexOf(f.id) !== -1);
    lista = lista.filter((p) => testes.some((f) => f.teste(p)));
  }

  if (estado.ofertas) {
    lista = lista.filter((p) => temDesconto(p));
  }

  if (estado.compat === 'universal') {
    lista = lista.filter((p) => !p.compat || p.compat.length === 0);
  } else if (estado.compat === 'especifica') {
    lista = lista.filter((p) => p.compat && p.compat.length > 0);
  } else if (estado.compat === 'minhamoto' && moto) {
    lista = lista.filter((p) => produtoServeEm(p, moto));
  }

  /* Quando o cliente escolheu a moto, a lista mostra o que serve nela MAIS os
     universais. Se ele pediu "só específica", respeitamos o pedido. */
  if (moto && estado.compat !== 'universal' && estado.compat !== 'especifica') {
    lista = lista.filter((p) => produtoServeEm(p, moto));
  }

  return ordenar(lista, estado.ordenar);
}

function ordenar(lista, modo) {
  const l = lista.slice();
  if (modo === 'menor') return l.sort((a, b) => a.preco - b.preco);
  if (modo === 'maior') return l.sort((a, b) => b.preco - a.preco);
  if (modo === 'nome') return l.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (modo === 'novidades') return l.reverse();
  // relevante: desconto maior primeiro, depois quem tem estoque
  return l.sort((a, b) => {
    const da = temDesconto(a) ? descontoPct(a) : 0;
    const db = temDesconto(b) ? descontoPct(b) : 0;
    if (db !== da) return db - da;
    return (Number(b.estoque) > 0 ? 1 : 0) - (Number(a.estoque) > 0 ? 1 : 0);
  });
}

/* ------------------------------------------------------------- desenho --- */
function desenharFiltros(estado, aoMudar) {
  const moto = estado.moto || motoStore.ler();

  /* categorias */
  const alvoCat = document.getElementById('filtro-categoria');
  if (alvoCat) {
    alvoCat.innerHTML = CATEGORIAS.map((c) => {
      const qtd = PRODUTOS.filter((p) => p.categoria === c.slug).length;
      const marcado = estado.categorias.indexOf(c.slug) !== -1;
      return `
      <label class="marcador">
        <input type="checkbox" data-filtro="categoria" value="${esc(c.slug)}"${marcado ? ' checked' : ''}>
        <span>${esc(c.nome)}</span>
        <span class="marcador__qtd">${qtd}</span>
      </label>`;
    }).join('');
  }

  /* marcas de produto (o fabricante da peça, não a moto) */
  const alvoMarca = document.getElementById('filtro-marca');
  if (alvoMarca) {
    const marcas = Array.from(new Set(PRODUTOS.map((p) => p.marca))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
    alvoMarca.innerHTML = marcas
      .map((m) => {
        const qtd = PRODUTOS.filter((p) => p.marca === m).length;
        const marcado = estado.marcas.indexOf(m) !== -1;
        return `
        <label class="marcador">
          <input type="checkbox" data-filtro="marca" value="${esc(m)}"${marcado ? ' checked' : ''}>
          <span>${esc(m)}</span>
          <span class="marcador__qtd">${qtd}</span>
        </label>`;
      })
      .join('');
  }

  /* compatibilidade */
  const alvoCompat = document.getElementById('filtro-compat');
  if (alvoCompat) {
    const opcoes = [
      { v: '', t: 'Tudo', q: PRODUTOS.length },
      { v: 'minhamoto', t: 'Serve na minha moto', q: moto ? PRODUTOS.filter((p) => produtoServeEm(p, moto)).length : 0, soComMoto: true },
      { v: 'universal', t: 'Acessório universal', q: PRODUTOS.filter((p) => !p.compat || !p.compat.length).length },
      { v: 'especifica', t: 'Peça específica de moto', q: PRODUTOS.filter((p) => p.compat && p.compat.length).length },
    ];
    alvoCompat.innerHTML = opcoes
      .filter((o) => !o.soComMoto || moto)
      .map(
        (o) => `
      <label class="marcador">
        <input type="radio" name="compat" data-filtro="compat" value="${esc(o.v)}"${estado.compat === o.v ? ' checked' : ''}>
        <span>${esc(o.t)}</span>
        <span class="marcador__qtd">${o.q}</span>
      </label>`
      )
      .join('');
  }

  /* faixa de preço */
  const alvoPreco = document.getElementById('filtro-preco');
  if (alvoPreco) {
    alvoPreco.innerHTML = FAIXAS.map((f) => {
      const q = PRODUTOS.filter(f.teste).length;
      const marcado = estado.faixas.indexOf(f.id) !== -1;
      return `
      <label class="marcador">
        <input type="checkbox" data-filtro="faixa" value="${esc(f.id)}"${marcado ? ' checked' : ''}>
        <span>${esc(f.rotulo)}</span>
        <span class="marcador__qtd">${q}</span>
      </label>`;
    }).join('');
  }

  /* moto */
  const alvoMoto = document.getElementById('filtro-moto');
  if (alvoMoto) {
    if (moto) {
      const q = PRODUTOS.filter((p) => produtoServeEm(p, moto)).length;
      alvoMoto.innerHTML = `
        <div class="marcador" style="background:var(--amarelo-suave);align-items:flex-start">
          <span style="color:var(--marinho);display:flex">${icone('moto', 18)}</span>
          <span>
            <strong>${esc(moto.marca)} ${esc(moto.modelo)}${moto.ano ? ' ' + moto.ano : ''}</strong><br>
            <span class="micro texto-3">${q} produtos compatíveis</span>
          </span>
        </div>
        <button class="btn btn--contorno btn--bloco btn--pequeno mt-1" type="button" data-limpar-moto>
          Trocar de moto
        </button>`;
    } else {
      alvoMoto.innerHTML = `
        <p class="micro texto-3 mb-2">Diga qual é a sua moto e mostramos só o que serve nela.</p>
        <a class="btn btn--bloco btn--pequeno" href="localizador.html">${icone('moto', 16)} Escolher minha moto</a>`;
    }
  }

  /* ordenação */
  const selOrdem = document.getElementById('ordenar');
  if (selOrdem) {
    selOrdem.innerHTML = ORDEM.map(
      (o) => `<option value="${o.v}"${estado.ordenar === o.v ? ' selected' : ''}>${o.t}</option>`
    ).join('');
  }
}

function desenharChips(estado, aoMudar) {
  const alvo = document.getElementById('filtros-ativos');
  if (!alvo) return;
  const chips = [];

  estado.categorias.forEach((slug) => {
    const c = CATEGORIAS.find((x) => x.slug === slug);
    chips.push({ t: c ? c.nome : slug, tipo: 'categoria', v: slug });
  });
  estado.marcas.forEach((m) => chips.push({ t: m, tipo: 'marca', v: m }));
  estado.faixas.forEach((f) => {
    const faixa = FAIXAS.find((x) => x.id === f);
    chips.push({ t: faixa ? faixa.rotulo : f, tipo: 'faixa', v: f });
  });
  if (estado.compat) {
    const nomes = {
      universal: 'Acessório universal',
      especifica: 'Peça específica',
      minhamoto: 'Serve na minha moto',
    };
    chips.push({ t: nomes[estado.compat] || estado.compat, tipo: 'compat', v: estado.compat });
  }
  if (estado.busca) chips.push({ t: `Busca: ${estado.busca}`, tipo: 'busca', v: estado.busca });
  if (estado.ofertas) chips.push({ t: 'Só ofertas', tipo: 'ofertas', v: '1' });

  alvo.innerHTML = chips.length
    ? chips
        .map(
          (c) => `
      <span class="chip-filtro">
        ${esc(c.t)}
        <button type="button" data-remover-chip="${esc(c.tipo)}" data-valor="${esc(c.v)}"
                aria-label="Remover filtro ${esc(c.t)}">×</button>
      </span>`
        )
        .join('') +
      `<button class="filtros__limpar" type="button" data-limpar-filtros>Limpar tudo</button>`
    : '';
}

/* ---------------------------------------------------------- cabeçalho ---- */
function desenharTitulo(estado, quantidade, total) {
  const t = document.getElementById('titulo-pagina');
  const s = document.getElementById('subtitulo-pagina');
  const m = document.getElementById('migalha-atual');
  const moto = estado.moto || motoStore.ler();

  let titulo = 'Catálogo de peças';
  let sub = 'Peças e acessórios para a sua moto. Use os filtros ou o localizador para ver só o que serve.';

  if (estado.busca) {
    titulo = `Resultados para “${estado.busca}”`;
    sub = `${quantidade} ${quantidade === 1 ? 'produto encontrado' : 'produtos encontrados'}.`;
  } else if (moto && estado.moto) {
    titulo = `Peças para ${moto.marca} ${moto.modelo}${moto.ano ? ' ' + moto.ano : ''}`;
    sub = `${quantidade} ${quantidade === 1 ? 'produto' : 'produtos'} compatíveis, incluindo os acessórios universais.`;
  } else if (estado.ofertas) {
    titulo = 'Ofertas da loja';
    sub = 'Produtos com preço promocional. Os valores são demonstrativos nesta apresentação.';
  } else if (estado.categorias.length === 1) {
    const c = CATEGORIAS.find((x) => x.slug === estado.categorias[0]);
    titulo = c ? c.nome : 'Catálogo';
    sub = c ? `${c.chamada}. ${quantidade} de ${total} produtos.` : sub;
  } else if (estado.categorias.length > 1) {
    titulo = `${estado.categorias.length} categorias selecionadas`;
    sub = `${quantidade} produtos encontrados.`;
  }

  if (t) t.textContent = titulo;
  if (s) s.textContent = sub;
  if (m) m.textContent = titulo;
  document.title = `${titulo} — Moto Peças`;
}

/* -------------------------------------------------------------- montar --- */
export function montarCatalogo() {
  let estado = estadoDaURL();

  /* o localizador da página também salva a moto */
  const alvoCurto = document.getElementById('localizador-curto');
  if (alvoCurto) {
    // a página já tem filtros: aqui basta um atalho, não o formulário inteiro
    alvoCurto.innerHTML = atalhoMoto();
  }

  const iconeFiltros = document.getElementById('icone-filtros');
  if (iconeFiltros) iconeFiltros.innerHTML = icone('ajuste', 18);

  function redesenhar() {
    escreverURL(estado);
    const lista = aplicar(estado);
    const total = PRODUTOS.length;

    desenharTitulo(estado, lista.length, total);
    desenharFiltros(estado, mudar);
    desenharChips(estado, mudar);
    desenharAvisoMoto(estado);

    const contagem = document.getElementById('contagem');
    if (contagem) {
      const n = lista.length;
      contagem.innerHTML = `<strong>${n}</strong> ${n === 1 ? 'produto' : 'produtos'} encontrados${
        n !== total ? ` de ${total}` : ''
      }`;
    }

    const alvo = document.getElementById('resultados');
    if (alvo) {
      if (!lista.length) {
        const moto = estado.moto || motoStore.ler();
        alvo.innerHTML = estadoVazio({
          icone: 'buscar',
          titulo: 'Nenhum produto com esses filtros',
          texto: moto
            ? `Não encontramos peças para ${moto.marca} ${moto.modelo} com os filtros escolhidos. Tente limpar um filtro ou veja o catálogo completo.`
            : 'Tente remover um filtro ou buscar por outro termo.',
          acao: { href: 'catalogo.html', rotulo: 'Ver catálogo completo' },
        });
      } else {
        alvo.innerHTML = `<div class="grade grade--3">${lista
          .map((p) => cardProduto(p, { moto: estado.moto || motoStore.ler() }))
          .join('')}</div>`;
        cascata(alvo.firstElementChild, 45);
      }
    }

    const selOrdem = document.getElementById('ordenar');
    if (selOrdem) selOrdem.value = estado.ordenar;

    prepararRevelar();
  }

  function mudar(mudancas) {
    estado = Object.assign({}, estado, mudancas);
    redesenhar();
  }

  /* --- eventos --- */
  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-filtro]');
    if (el) {
      const tipo = el.getAttribute('data-filtro');
      const valor = el.value;
      if (tipo === 'compat') {
        mudar({ compat: valor });
      } else if (tipo === 'categoria') {
        mudar({ categorias: alternar(estado.categorias, valor) });
      } else if (tipo === 'marca') {
        mudar({ marcas: alternar(estado.marcas, valor) });
      } else if (tipo === 'faixa') {
        mudar({ faixas: alternar(estado.faixas, valor) });
      }
      return;
    }
    if (ev.target.id === 'ordenar') mudar({ ordenar: ev.target.value });
  });

  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-limpar-filtros]')) {
      mudar({ categorias: [], marcas: [], faixas: [], compat: '', busca: '', ofertas: false, ordenar: 'relevancia' });
      return;
    }
    const chip = ev.target.closest('[data-remover-chip]');
    if (chip) {
      const tipo = chip.getAttribute('data-remover-chip');
      const v = chip.getAttribute('data-valor');
      if (tipo === 'categoria') mudar({ categorias: estado.categorias.filter((x) => x !== v) });
      else if (tipo === 'marca') mudar({ marcas: estado.marcas.filter((x) => x !== v) });
      else if (tipo === 'faixa') mudar({ faixas: estado.faixas.filter((x) => x !== v) });
      else if (tipo === 'compat') mudar({ compat: '' });
      else if (tipo === 'busca') mudar({ busca: '' });
      else if (tipo === 'ofertas') mudar({ ofertas: false });
      return;
    }
    if (ev.target.closest('[data-abrir-filtros]')) {
      const p = document.getElementById('painel-filtros');
      if (p) { p.setAttribute('data-aberto', 'true'); ev.target.closest('button').setAttribute('aria-expanded', 'true'); }
      return;
    }
    if (ev.target.closest('[data-fechar-filtros]')) {
      const p = document.getElementById('painel-filtros');
      if (p) { p.setAttribute('data-aberto', 'false'); }
      const b = document.querySelector('[data-abrir-filtros]');
      if (b) b.setAttribute('aria-expanded', 'false');
      return;
    }
    if (ev.target.closest('[data-limpar-moto]')) {
      motoStore.limpar();
      mudar({ moto: null, compat: '' });
      return;
    }
  });

  redesenhar();
}

function alternar(lista, v) {
  return lista.indexOf(v) === -1 ? lista.concat([v]) : lista.filter((x) => x !== v);
}

/* --------------------------------------------------- aviso "sua moto" ---- */
function desenharAvisoMoto(estado) {
  const alvo = document.getElementById('aviso-moto');
  if (!alvo) return;
  const moto = estado.moto || motoStore.ler();
  if (!moto) { alvo.innerHTML = ''; return; }

  alvo.innerHTML = `
  <div class="aviso-moto">
    ${icone('moto', 24)}
    <p>Mostrando peças para <strong>${esc(moto.marca)} ${esc(moto.modelo)}${moto.ano ? ' ' + moto.ano : ''}</strong>.
       Os acessórios universais também aparecem, porque servem em qualquer moto.</p>
    <a class="btn btn--pequeno btn--contorno" href="localizador.html">Trocar de moto</a>
  </div>`;
}

/* --------------------------------------------------- atalho da moto ------ */
function atalhoMoto() {
  const moto = motoStore.ler();
  if (moto) return '';
  return `
  <div class="aviso-moto">
    ${icone('moto', 24)}
    <p><strong>Não sabe o nome da peça?</strong> Escolha a sua moto e mostramos só o que serve nela.</p>
    <a class="btn btn--pequeno" href="localizador.html">Encontrar minha peça</a>
  </div>`;
}
