/* ============================================================================
   LOCALIZADOR — "Encontre a peça certa para sua moto"
   ----------------------------------------------------------------------------
   O mesmo componente aparece na home, na página própria e na página de produto.
   A regra é: nada de campo solto. O MODELO só destrava depois da marca, o ANO
   só depois do modelo. Isso evita a combinação impossível (Fazer 250 da Honda)
   que faria a loja parecer errada na frente da cliente.
   ============================================================================ */

import { MARCAS, modelosDaMarca, anosDoModelo } from './dados.js';
import { icone, esc, $, $$, avisar } from './utils.js';
import { moto as motoStore } from './carrinho.js';

const ID_MARCA = 'moto-marca';
const ID_MODELO = 'moto-modelo';
const ID_ANO = 'moto-ano';

/* ------------------------------------------------------------- HTML ------- */
export function htmlLocalizador({ compacto = false, irParaCatalogo = true } = {}) {
  const atual = motoStore.ler();

  const opcoesMarca = MARCAS.map(
    (m) => `<option value="${esc(m.nome)}">${esc(m.nome)}</option>`
  ).join('');

  return `
<div class="localizador revelar" id="localizador">
  <span class="localizador__fundo"></span>
  <span class="localizador__fundo localizador__fundo--2"></span>

  <div class="localizador__conteudo">
    <span class="selo">${icone('moto', 14)} Compatibilidade</span>
    <h2 class="mt-2">Encontre a peça certa para sua moto</h2>
    <p class="localizador__sub">
      Escolha a marca, o modelo e o ano. Mostramos só as peças que servem na sua moto —
      sem você ter que conferir código de peça.
    </p>

    <div class="passos" id="passos-moto" role="list">
      <span class="passo" data-passo="marca" data-estado="ativo" role="listitem">
        <span class="passo__n">1</span> Marca
      </span>
      <span class="passo" data-passo="modelo" data-estado="pendente" role="listitem">
        <span class="passo__n">2</span> Modelo
      </span>
      <span class="passo" data-passo="ano" data-estado="pendente" role="listitem">
        <span class="passo__n">3</span> Ano
      </span>
    </div>

    <form class="localizador__campos" id="form-moto" novalidate>
      <div class="campo">
        <label class="campo__rotulo" for="${ID_MARCA}">Marca</label>
        <select class="entrada" id="${ID_MARCA}" name="marca" required>
          <option value="">Escolha a marca</option>
          ${opcoesMarca}
        </select>
      </div>

      <div class="campo">
        <label class="campo__rotulo" for="${ID_MODELO}">Modelo</label>
        <select class="entrada" id="${ID_MODELO}" name="modelo" required disabled>
          <option value="">Escolha a marca primeiro</option>
        </select>
      </div>

      <div class="campo">
        <label class="campo__rotulo" for="${ID_ANO}">Ano</label>
        <select class="entrada" id="${ID_ANO}" name="ano" required disabled>
          <option value="">Escolha o modelo primeiro</option>
        </select>
      </div>

      <button class="btn btn--grande" type="submit">
        ${icone('buscar', 20)} Ver peças compatíveis
      </button>
    </form>

    <div class="localizador__resultado" id="resultado-moto" hidden></div>

    ${
      compacto
        ? ''
        : `<p class="ajuda-campo mt-3">
             Não sabe o ano exato? Escolha o mais próximo — a maioria das peças cobre uma faixa de anos.
             ${irParaCatalogo ? '' : ''}
           </p>`
    }
  </div>
</div>`;
}

/* --------------------------------------------------- ligar o componente --- */
/*
 * @param {object} opcoes
 *   destino: 'catalogo' (vai para catalogo.html) | 'aviso' (fica na página)
 *   aoEscolher: callback(opcional) chamado com {marca, modelo, ano}
 */
export function ligarLocalizador(opcoes = {}) {
  const destino = opcoes.destino || 'catalogo';
  const form = document.getElementById('form-moto');
  if (!form) return false;

  const selMarca = document.getElementById(ID_MARCA);
  const selModelo = document.getElementById(ID_MODELO);
  const selAno = document.getElementById(ID_ANO);
  const resultado = document.getElementById('resultado-moto');

  /* --- estado dos passos --- */
  function marcarPassos() {
    const temMarca = !!selMarca.value;
    const temModelo = !!selModelo.value;
    const temAno = !!selAno.value;

    const estados = {
      marca: temMarca ? (temModelo ? 'feito' : 'ativo') : 'ativo',
      modelo: temModelo ? (temAno ? 'feito' : 'ativo') : 'pendente',
      ano: temAno ? 'ativo' : 'pendente',
    };
    $$('#passos-moto .passo').forEach((el) => {
      const chave = el.getAttribute('data-passo');
      el.setAttribute('data-estado', estados[chave] || 'pendente');
    });
  }

  /* --- marca mudou: repovoa modelo e limpa ano --- */
  selMarca.addEventListener('change', () => {
    const modelos = modelosDaMarca(selMarca.value);
    selModelo.innerHTML =
      `<option value="">Escolha o modelo</option>` +
      modelos.map((m) => `<option value="${esc(m.nome)}">${esc(m.nome)}</option>`).join('');
    selModelo.disabled = modelos.length === 0;

    selAno.innerHTML = `<option value="">Escolha o modelo primeiro</option>`;
    selAno.disabled = true;

    marcarPassos();
    if (resultado) resultado.hidden = true;
  });

  /* --- modelo mudou: repovoa ano --- */
  selModelo.addEventListener('change', () => {
    const anos = anosDoModelo(selMarca.value, selModelo.value);
    selAno.innerHTML =
      `<option value="">Escolha o ano</option>` +
      anos
        .slice()
        .sort((a, b) => b - a)
        .map((a) => `<option value="${a}">${a}</option>`)
        .join('');
    selAno.disabled = anos.length === 0;
    marcarPassos();
    if (resultado) resultado.hidden = true;
  });

  selAno.addEventListener('change', marcarPassos);

  /* --- enviar --- */
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    if (!selMarca.value) { avisar('Escolha a marca da sua moto.', 'alerta'); selMarca.focus(); return; }
    if (!selModelo.value) { avisar('Escolha o modelo da sua moto.', 'alerta'); selModelo.focus(); return; }
    if (!selAno.value) { avisar('Escolha o ano da sua moto.', 'alerta'); selAno.focus(); return; }

    const escolha = {
      marca: selMarca.value,
      modelo: selModelo.value,
      ano: Number(selAno.value),
    };

    // guarda a moto escolhida: o catálogo, os cards e a página de produto usam
    motoStore.salvar(escolha);

    if (typeof opcoes.aoEscolher === 'function') opcoes.aoEscolher(escolha);

    if (destino === 'catalogo') {
      const q = new URLSearchParams({
        moto: '1',
        marca: escolha.marca,
        modelo: escolha.modelo,
        ano: String(escolha.ano),
      });
      window.location.href = `catalogo.html?${q.toString()}`;
      return;
    }

    // destino 'aviso': mostra o resultado aqui mesmo
    if (resultado) {
      resultado.hidden = false;
      resultado.innerHTML =
        `Mostrando peças para <strong>${esc(escolha.marca)} ${esc(escolha.modelo)} ${escolha.ano}</strong>.`;
    }
  });

  /* --- se já existe moto guardada, deixa o formulário pronto --- */
  const atual = motoStore.ler();
  if (atual && MARCAS.some((m) => m.nome === atual.marca)) {
    selMarca.value = atual.marca;
    selMarca.dispatchEvent(new Event('change'));
    if (modelosDaMarca(atual.marca).some((m) => m.nome === atual.modelo)) {
      selModelo.value = atual.modelo;
      selModelo.dispatchEvent(new Event('change'));
      if (atual.ano && anosDoModelo(atual.marca, atual.modelo).indexOf(atual.ano) !== -1) {
        selAno.value = String(atual.ano);
      }
    }
  }
  marcarPassos();

  return true;
}

/* -------------------------------------------------- barra "sua moto" ----- */
/* Faixa mostrada no catálogo quando existe moto escolhida. */
export function htmlAvisoMoto(moto, raiz = '') {
  if (!moto || !moto.marca || !moto.modelo) return '';
  return `
<div class="aviso-moto">
  ${icone('moto', 24)}
  <p>Mostrando peças para <strong>${esc(moto.marca)} ${esc(moto.modelo)}${moto.ano ? ' ' + moto.ano : ''}</strong>.
     Também listamos os acessórios universais, que servem em qualquer moto.</p>
  <button class="btn btn--pequeno btn--contorno" type="button" data-limpar-moto>
    ${icone('fechar', 16)} Ver todos os produtos
  </button>
</div>`;
}
