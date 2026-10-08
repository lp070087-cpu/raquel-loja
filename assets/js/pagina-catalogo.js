/* ============================================================================
   PÁGINA — CATÁLOGO
   ----------------------------------------------------------------------------
   Duas leituras, dependendo de existir moto ativa:

   COM MOTO ATIVA  →  o catálogo é ORGANIZADO POR GRUPO
       Manutenção · Freios · Transmissão · Rodagem · Acessórios universais
     e o título diz para qual moto está mostrando. Uma grade única com tudo
     misturado era exatamente o que fazia o catálogo parecer genérico.

   SEM MOTO ATIVA  →  grade única com os filtros normais.

   O estado vive na URL, então voltar no navegador, recarregar ou mandar o link
   reabre a mesma lista.
   ============================================================================ */

import {
  CATEGORIAS, PRODUTOS, GRUPOS, produtoServeEm, ehUniversal, rotuloMoto,
  categoriaPorSlug,
} from './dados.js';
import {
  icone, esc, moeda, prepararRevelar, cascata, temDesconto, descontoPct,
} from './utils.js';
import { cardProduto, estadoVazio, tituloSecao } from './componentes.js';
import { buscarProdutos, moto as motoStore } from './carrinho.js';
import { htmlMotoAtiva } from './localizador.js';
import { abrirDrawer } from './shell.js';

const ORDEM = [
  { v: 'relevancia', t: 'Mais relevantes' },
  { v: 'menor', t: 'Menor preço' },
  { v: 'maior', t: 'Maior preço' },
  { v: 'nome', t: 'Nome (A–Z)' },
];

const FAIXAS = [
  { id: 'ate50',   rotulo: 'Até R$ 50',        teste: (p) => p.preco <= 50 },
  { id: '50a150',  rotulo: 'R$ 50 a R$ 150',   teste: (p) => p.preco > 50 && p.preco <= 150 },
  { id: '150a300', rotulo: 'R$ 150 a R$ 300',  teste: (p) => p.preco > 150 && p.preco <= 300 },
  { id: 'ac300',   rotulo: 'Acima de R$ 300',  teste: (p) => p.preco > 300 },
];

/* --------------------------------------------------------------- estado -- */
function estadoDaURL() {
  const q = new URLSearchParams(window.location.search);
  const moto = motoStore.ler();
  return {
    categorias: (q.get('categoria') || '').split(',').filter(Boolean),
    marcas: (q.get('marcaProduto') || '').split(',').filter(Boolean),
    faixas: (q.get('faixa') || '').split(',').filter(Boolean),
    compat: q.get('compat') || '',
    busca: q.get('busca') || '',
    ofertas: q.get('ofertas') === '1',
    ordenar: q.get('ordenar') || 'relevancia',
    comMoto: q.get('moto') === '1' && !!moto,
  };
}

function escreverURL(e) {
  const q = new URLSearchParams();
  if (e.categorias.length) q.set('categoria', e.categorias.join(','));
  if (e.marcas.length) q.set('marcaProduto', e.marcas.join(','));
  if (e.faixas.length) q.set('faixa', e.faixas.join(','));
  if (e.compat) q.set('compat', e.compat);
  if (e.busca) q.set('busca', e.busca);
  if (e.ofertas) q.set('ofertas', '1');
  if (e.ordenar !== 'relevancia') q.set('ordenar', e.ordenar);
  if (e.comMoto) q.set('moto', '1');
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
}

/* -------------------------------------------------------------- filtros -- */
function aplicar(e, moto) {
  let lista = PRODUTOS.slice();

  if (e.busca) lista = buscarProdutos(e.busca, lista);
  if (e.categorias.length) lista = lista.filter((p) => e.categorias.indexOf(p.categoria) !== -1);
  if (e.marcas.length) lista = lista.filter((p) => e.marcas.indexOf(p.marca) !== -1);
  if (e.faixas.length) {
    const testes = FAIXAS.filter((f) => e.faixas.indexOf(f.id) !== -1);
    lista = lista.filter((p) => testes.some((f) => f.teste(p)));
  }
  if (e.ofertas) lista = lista.filter((p) => temDesconto(p));

  if (e.compat === 'universal') lista = lista.filter((p) => ehUniversal(p));
  else if (e.compat === 'especifica') lista = lista.filter((p) => !ehUniversal(p));
  else if (e.compat === 'minhamoto' && moto) lista = lista.filter((p) => produtoServeEm(p, moto));

  /* Com moto ativa: só o que serve nela (universal entra sempre). */
  if (e.comMoto && moto && e.compat !== 'universal' && e.compat !== 'especifica') {
    lista = lista.filter((p) => produtoServeEm(p, moto));
  }

  return ordenar(lista, e.ordenar);
}

function ordenar(lista, modo) {
  const l = lista.slice();
  if (modo === 'menor') return l.sort((a, b) => a.preco - b.preco);
  if (modo === 'maior') return l.sort((a, b) => b.preco - a.preco);
  if (modo === 'nome') return l.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return l.sort((a, b) => {
    const da = temDesconto(a) ? descontoPct(a) : 0;
    const db = temDesconto(b) ? descontoPct(b) : 0;
    if (db !== da) return db - da;
    return (Number(b.estoque) > 0 ? 1 : 0) - (Number(a.estoque) > 0 ? 1 : 0);
  });
}

/* ------------------------------------------------------------ desenho ---- */
function desenharFiltros(e, moto) {
  const alvoCat = document.getElementById('filtro-categoria');
  if (alvoCat) {
    alvoCat.innerHTML = CATEGORIAS.map((c) => {
      const qtd = PRODUTOS.filter((p) => p.categoria === c.slug).length;
      const marcado = e.categorias.indexOf(c.slug) !== -1;
      return `<label class="marcador">
        <input type="checkbox" data-filtro="categoria" value="${esc(c.slug)}"${marcado ? ' checked' : ''}>
        <span>${esc(c.nome)}</span><span class="marcador__qtd">${qtd}</span>
      </label>`;
    }).join('');
  }

  const alvoMarca = document.getElementById('filtro-marca');
  if (alvoMarca) {
    const marcas = Array.from(new Set(PRODUTOS.map((p) => p.marca))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    alvoMarca.innerHTML = marcas.map((m) => {
      const qtd = PRODUTOS.filter((p) => p.marca === m).length;
      const marcado = e.marcas.indexOf(m) !== -1;
      return `<label class="marcador">
        <input type="checkbox" data-filtro="marca" value="${esc(m)}"${marcado ? ' checked' : ''}>
        <span>${esc(m)}</span><span class="marcador__qtd">${qtd}</span>
      </label>`;
    }).join('');
  }

  const alvoCompat = document.getElementById('filtro-compat');
  if (alvoCompat) {
    const opcoes = [
      { v: '', t: 'Tudo', q: PRODUTOS.length },
      { v: 'minhamoto', t: 'Serve na minha moto', q: moto ? PRODUTOS.filter((p) => produtoServeEm(p, moto)).length : 0, soComMoto: true },
      { v: 'universal', t: 'Produto universal', q: PRODUTOS.filter((p) => ehUniversal(p)).length },
      { v: 'especifica', t: 'Peça específica', q: PRODUTOS.filter((p) => !ehUniversal(p)).length },
    ];
    alvoCompat.innerHTML = opcoes.filter((o) => !o.soComMoto || moto).map((o) => `
      <label class="marcador">
        <input type="radio" name="compat" data-filtro="compat" value="${esc(o.v)}"${e.compat === o.v ? ' checked' : ''}>
        <span>${esc(o.t)}</span><span class="marcador__qtd">${o.q}</span>
      </label>`).join('');
  }

  const alvoPreco = document.getElementById('filtro-preco');
  if (alvoPreco) {
    alvoPreco.innerHTML = FAIXAS.map((f) => {
      const q = PRODUTOS.filter(f.teste).length;
      const marcado = e.faixas.indexOf(f.id) !== -1;
      return `<label class="marcador">
        <input type="checkbox" data-filtro="faixa" value="${esc(f.id)}"${marcado ? ' checked' : ''}>
        <span>${esc(f.rotulo)}</span><span class="marcador__qtd">${q}</span>
      </label>`;
    }).join('');
  }

  const alvoMoto = document.getElementById('filtro-moto');
  if (alvoMoto) {
    alvoMoto.innerHTML = moto
      ? `<div class="marcador" style="background:var(--amarelo-suave);align-items:flex-start">
           <span style="color:var(--marinho);display:flex;margin-top:2px">${icone('moto', 17)}</span>
           <span><strong>${esc(rotuloMoto(moto))}</strong><br>
           <span class="micro texto-3">${PRODUTOS.filter((p) => produtoServeEm(p, moto)).length} produtos compatíveis</span></span>
         </div>
         <button class="btn btn--contorno btn--bloco btn--pequeno mt-2" type="button" data-limpar-moto>Trocar de moto</button>`
      : `<p class="micro texto-3 mb-2">Diga qual é a sua moto e mostramos só o que serve nela.</p>
         <a class="btn btn--bloco btn--pequeno" href="localizador.html">${icone('moto', 15)} Escolher minha moto</a>`;
  }

  const sel = document.getElementById('ordenar');
  if (sel) sel.innerHTML = ORDEM.map((o) => `<option value="${o.v}"${e.ordenar === o.v ? ' selected' : ''}>${o.t}</option>`).join('');
}

function desenharChips(e) {
  const alvo = document.getElementById('filtros-ativos');
  if (!alvo) return;
  const chips = [];
  e.categorias.forEach((s) => {
    const c = categoriaPorSlug(s);
    chips.push({ t: c ? c.nome : s, tipo: 'categoria', v: s });
  });
  e.marcas.forEach((m) => chips.push({ t: m, tipo: 'marca', v: m }));
  e.faixas.forEach((f) => {
    const x = FAIXAS.find((y) => y.id === f);
    chips.push({ t: x ? x.rotulo : f, tipo: 'faixa', v: f });
  });
  if (e.compat) {
    const nomes = { universal: 'Produto universal', especifica: 'Peça específica', minhamoto: 'Serve na minha moto' };
    chips.push({ t: nomes[e.compat] || e.compat, tipo: 'compat', v: e.compat });
  }
  if (e.busca) chips.push({ t: `Busca: ${e.busca}`, tipo: 'busca', v: e.busca });
  if (e.ofertas) chips.push({ t: 'Só ofertas', tipo: 'ofertas', v: '1' });

  alvo.innerHTML = chips.length
    ? chips.map((c) => `<span class="chip-filtro">${esc(c.t)}
        <button type="button" data-remover-chip="${esc(c.tipo)}" data-valor="${esc(c.v)}" aria-label="Remover filtro ${esc(c.t)}">×</button>
      </span>`).join('') +
      `<button class="filtros__limpar" type="button" data-limpar-filtros>Limpar tudo</button>`
    : '';
}

function desenharTitulo(e, moto, quantidade) {
  const t = document.getElementById('titulo-pagina');
  const s = document.getElementById('subtitulo-pagina');
  const m = document.getElementById('migalha-atual');
  const sec = document.getElementById('aviso-moto');

  let titulo = 'Catálogo de peças';
  let sub = 'Peças e acessórios para moto. Use os filtros ou escolha a sua moto para ver só o que serve.';

  if (e.busca) {
    titulo = `Resultados para “${e.busca}”`;
    sub = `${quantidade} ${quantidade === 1 ? 'produto encontrado' : 'produtos encontrados'}.`;
  } else if (e.comMoto && moto) {
    titulo = `Peças para sua ${rotuloMoto(moto)}`;
    sub = `${quantidade} ${quantidade === 1 ? 'produto compatível' : 'produtos compatíveis'}, organizados por tipo. Os acessórios universais aparecem no fim.`;
  } else if (e.ofertas) {
    titulo = 'Ofertas da loja';
    sub = 'Produtos com preço promocional. Os valores são demonstrativos nesta apresentação.';
  } else if (e.categorias.length === 1) {
    const c = categoriaPorSlug(e.categorias[0]);
    titulo = c ? c.nome : 'Catálogo';
    sub = c ? `${c.chamada}. ${quantidade} produtos.` : sub;
  }

  if (t) t.textContent = titulo;
  if (s) s.textContent = sub;
  if (m) m.textContent = titulo;
  document.title = `${titulo} — Moto Peças`;

  if (sec) sec.innerHTML = moto ? htmlMotoAtiva(moto) : '';
}

/* -------------------------------------------------------------- montar --- */
export function montarCatalogo() {
  const moto = motoStore.ler();
  let e = estadoDaURL();

  const ic = document.getElementById('icone-filtros');
  if (ic) ic.innerHTML = icone('ajuste', 17);

  function redesenhar() {
    escreverURL(e);
    const lista = aplicar(e, moto);

    desenharTitulo(e, e.comMoto ? moto : null, lista.length);
    desenharFiltros(e, moto);
    desenharChips(e);

    const contagem = document.getElementById('contagem');
    if (contagem) {
      contagem.innerHTML = `<strong>${lista.length}</strong> ${lista.length === 1 ? 'produto' : 'produtos'}${lista.length !== PRODUTOS.length ? ` de ${PRODUTOS.length}` : ''}`;
    }

    const alvo = document.getElementById('resultados');
    if (!lista.length) {
      alvo.innerHTML = estadoVazio({
        icone: 'buscar',
        titulo: 'Nenhum produto com esses filtros',
        texto: e.comMoto && moto
          ? `Não encontramos peças para ${rotuloMoto(moto)} com os filtros escolhidos. Tente limpar um filtro ou ver o catálogo completo.`
          : 'Tente remover um filtro ou buscar por outro termo.',
        acao: { href: 'catalogo.html', rotulo: 'Ver catálogo completo' },
      });
    } else if (e.comMoto && moto) {
      /* ---- ORGANIZADO POR GRUPO: é o que evita a "grade genérica" ---- */
      alvo.innerHTML = montarPorGrupo(lista, moto);
    } else {
      alvo.innerHTML = `<div class="grade grade--4">${lista.map((p) => cardProduto(p, { moto })).join('')}</div>`;
      cascata(alvo.firstElementChild, 35);
    }

    const sel = document.getElementById('ordenar');
    if (sel) sel.value = e.ordenar;

    prepararRevelar();
  }

  function mudar(m) { e = Object.assign({}, e, m); redesenhar(); }

  /* --- eventos --- */
  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-filtro]');
    if (el) {
      const tipo = el.getAttribute('data-filtro');
      const v = el.value;
      if (tipo === 'compat') mudar({ compat: v });
      else if (tipo === 'categoria') mudar({ categorias: alternar(e.categorias, v) });
      else if (tipo === 'marca') mudar({ marcas: alternar(e.marcas, v) });
      else if (tipo === 'faixa') mudar({ faixas: alternar(e.faixas, v) });
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
      if (tipo === 'categoria') mudar({ categorias: e.categorias.filter((x) => x !== v) });
      else if (tipo === 'marca') mudar({ marcas: e.marcas.filter((x) => x !== v) });
      else if (tipo === 'faixa') mudar({ faixas: e.faixas.filter((x) => x !== v) });
      else if (tipo === 'compat') mudar({ compat: '' });
      else if (tipo === 'busca') mudar({ busca: '' });
      else if (tipo === 'ofertas') mudar({ ofertas: false });
      return;
    }

    if (ev.target.closest('[data-abrir-filtros]')) {
      const p = document.getElementById('painel-filtros');
      if (p) p.setAttribute('data-aberto', 'true');
      return;
    }
    if (ev.target.closest('[data-fechar-filtros]')) {
      const p = document.getElementById('painel-filtros');
      if (p) p.setAttribute('data-aberto', 'false');
      return;
    }
    if (ev.target.closest('[data-limpar-moto]')) {
      motoStore.limpar();
      window.location.href = 'catalogo.html';
      return;
    }

    /* aplicações: drawer com as motos compatíveis */
    const ver = ev.target.closest('[data-ver-aplicacoes]');
    if (ver) {
      ev.preventDefault();
      const id = ver.getAttribute('data-ver-aplicacoes');
      const p = PRODUTOS.find((x) => x.id === id);
      if (!p) return;
      import('./componentes.js').then((m) => {
        const d = m.drawerAplicacoes(p);
        abrirDrawer(d);
      });
    }
  });

  redesenhar();
}

function alternar(lista, v) {
  return lista.indexOf(v) === -1 ? lista.concat([v]) : lista.filter((x) => x !== v);
}

/* ---------------------------------------- catálogo agrupado por tipo ----- */
function montarPorGrupo(lista, moto) {
  const universais = lista.filter((p) => ehUniversal(p));
  const especificos = lista.filter((p) => !ehUniversal(p));

  const blocos = [];
  const usados = new Set();

  GRUPOS.forEach((g) => {
    /* O grupo marcado `universal` é o bloco dos acessórios; os demais são
       os grupos técnicos, por categoria. */
    const doGrupo = g.universal
      ? universais
      : especificos.filter((p) => g.categorias.indexOf(p.categoria) !== -1);
    if (!doGrupo.length) return;
    doGrupo.forEach((p) => usados.add(p.id));
    blocos.push(blocoGrupo(g, doGrupo, moto, { universal: !!g.universal }));
  });

  /* Rede de segurança: produto que não caiu em nenhum grupo NUNCA some do
     catálogo — aparece no fim, num bloco "Outros produtos". */
  const sobraram = lista.filter((p) => !usados.has(p.id));
  if (sobraram.length) {
    blocos.push(blocoGrupo({ nome: 'Outros produtos' }, sobraram, moto));
  }

  return blocos.join('');
}

function blocoGrupo(grupo, produtos, moto, { universal = false } = {}) {
  return `
<section class="grupo-catalogo${universal ? ' grupo-catalogo--universal' : ''}">
  <div class="grupo-catalogo__topo">
    <h2 class="grupo-catalogo__nome">${esc(grupo.nome)}</h2>
    <span class="grupo-catalogo__qtd">${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}</span>
  </div>
  <div class="grade grade--4">
    ${produtos.map((p) => cardProduto(p, { moto })).join('')}
  </div>
</section>`;
}
