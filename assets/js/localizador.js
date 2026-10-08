/* ============================================================================
   LOCALIZADOR — "Qual é a sua moto?"
   ----------------------------------------------------------------------------
   Esta é a função comercial mais importante do site: é ela que transforma
   "tenho uma Honda" em "esta pastilha serve na sua moto".

       MARCA → MODELO → VERSÃO → ANO

   Regra de dependência: cada passo só destrava depois do anterior. Isso impede
   a combinação impossível (Fazer 250 da Honda) que faria a loja parecer errada
   na frente da cliente.

   O passo VERSÃO é PULÁVEL: quando o modelo não tem versões (Biz 125, Fazer
   250...), ele nem aparece — o formulário anda de modelo para ano. Quando tem
   (CG 160 é Fan/Titan/Start/Cargo), o passo aparece mas aceita "Todas as
   versões", e os anos passam a ser a união das versões.

   Ao enviar, a moto fica salva (`motopecas-moto`) e vale para o site inteiro:
   header, catálogo, card, página de produto, carrinho.
   ============================================================================ */

import {
  MARCAS, modelosDaMarca, versoesDoModelo, anosDoModelo, cilindradaDoModelo, rotuloMoto,
} from './dados.js';
import { icone, esc, avisar } from './utils.js';
import { moto as motoStore } from './carrinho.js';

const IDM = 'moto-marca';
const IDMO = 'moto-modelo';
const IDV = 'moto-versao';
const IDA = 'moto-ano';

const OPCAO_TODAS = '__todas__';

/* ------------------------------------------------------------- HTML ------- */
export function htmlLocalizador({ compacto = false } = {}) {
  const opcoesMarca = MARCAS.map(
    (m) => `<option value="${esc(m.nome)}">${esc(m.nome)}</option>`
  ).join('');

  return `
<div class="localizador revelar" id="localizador">
  <span class="localizador__marca-dagua"></span>
  <span class="localizador__marca-dagua localizador__marca-dagua--2"></span>

  <div class="localizador__conteudo">
    <div class="localizador__topo">
      <div>
        <h2>Qual é a sua moto?</h2>
        <p class="localizador__sub">
          Escolha a moto e o site passa a mostrar só as peças certas para ela —
          na marca, no modelo, na versão e no ano.
        </p>
      </div>
      <span class="selo">${icone('moto', 13)} Compatibilidade</span>
    </div>

    <div class="passos" id="passos-moto">
      <span class="passo" data-passo="marca" data-estado="ativo"><span class="passo__n">1</span> Marca</span>
      <span class="passo" data-passo="modelo" data-estado="pendente"><span class="passo__n">2</span> Modelo</span>
      <span class="passo" data-passo="versao" data-estado="pendente" hidden><span class="passo__n">3</span> Versão</span>
      <span class="passo" data-passo="ano" data-estado="pendente"><span class="passo__n">4</span> Ano</span>
    </div>

    <form class="localizador__campos" id="form-moto" novalidate>
      <div class="campo">
        <label class="campo__rotulo" for="${IDM}">Marca</label>
        <select class="entrada" id="${IDM}" name="marca" required>
          <option value="">Escolha a marca</option>
          ${opcoesMarca}
        </select>
      </div>

      <div class="campo">
        <label class="campo__rotulo" for="${IDMO}">Modelo</label>
        <select class="entrada" id="${IDMO}" name="modelo" required disabled>
          <option value="">Escolha a marca primeiro</option>
        </select>
      </div>

      <div class="campo" id="campo-versao" hidden>
        <label class="campo__rotulo" for="${IDV}">Versão</label>
        <select class="entrada" id="${IDV}" name="versao" disabled>
          <option value="">Todas as versões</option>
        </select>
        <span class="ajuda-campo" id="ajuda-versao" hidden>Todas as versões servem.</span>
      </div>

      <div class="campo">
        <label class="campo__rotulo" for="${IDA}">Ano</label>
        <select class="entrada" id="${IDA}" name="ano" required disabled>
          <option value="">Escolha o modelo primeiro</option>
        </select>
      </div>

      <button class="btn btn--grande btn--brilho" type="submit">
        ${icone('buscar', 19)} Encontrar peças
      </button>
    </form>

    <p class="localizador__resultado" id="resultado-moto" hidden></p>
    ${compacto ? '' : `<p class="ajuda-campo">Não sabe a versão? Deixe "Todas as versões" — a maioria das peças serve em qualquer uma.</p>`}
  </div>
</div>`;
}

/* --------------------------------------------------------- ligar ---------- */
/* @param {object} opcoes { destino: 'catalogo' | 'aviso', aoEscolher } */
export function ligarLocalizador(opcoes = {}) {
  const destino = opcoes.destino || 'catalogo';
  const form = document.getElementById('form-moto');
  if (!form) return false;

  const selMarca = document.getElementById(IDM);
  const selModelo = document.getElementById(IDMO);
  const selVersao = document.getElementById(IDV);
  const selAno = document.getElementById(IDA);
  const campoVersao = document.getElementById('campo-versao');
  const passoVersao = document.querySelector('.passo[data-passo="versao"]');
  const ajudaVersao = document.getElementById('ajuda-versao');
  const resultado = document.getElementById('resultado-moto');

  const modelos = () => modelosDaMarca(selMarca.value);
  const versoes = () => versoesDoModelo(selMarca.value, selModelo.value);
  /* A versão só entra no fluxo quando o modelo realmente tem versões. */
  const temVersoes = () => versoes().length > 0;

  function marcarPassos() {
    const temMarca = !!selMarca.value;
    const temModelo = !!selModelo.value;
    const precisaVersao = temVersoes();
    const temAno = !!selAno.value;
    const versaoOk = !precisaVersao || true; // "Todas as versões" já é válido

    const estados = {
      marca: temMarca ? (temModelo ? 'feito' : 'ativo') : 'ativo',
      modelo: temModelo ? (temAno ? 'feito' : 'ativo') : 'pendente',
      versao: !precisaVersao ? 'pendente' : (temAno ? 'feito' : 'ativo'),
      ano: temAno ? 'ativo' : 'pendente',
    };
    document.querySelectorAll('#passos-moto .passo').forEach((el) => {
      const chave = el.getAttribute('data-passo');
      el.setAttribute('data-estado', estados[chave] || 'pendente');
    });
  }

  /* --- passo 1: marca --- */
  selMarca.addEventListener('change', () => {
    const lista = modelos();
    selModelo.innerHTML =
      `<option value="">Escolha o modelo</option>` +
      lista.map((m) => `<option value="${esc(m.nome)}">${esc(m.nome)}</option>`).join('');
    selModelo.disabled = lista.length === 0;

    // limpa versão e ano
    campoVersao.hidden = true;
    if (passoVersao) passoVersao.hidden = true;
    selVersao.innerHTML = `<option value="">Todas as versões</option>`;
    selVersao.disabled = true;
    selAno.innerHTML = `<option value="">Escolha o modelo primeiro</option>`;
    selAno.disabled = true;

    marcarPassos();
    if (resultado) resultado.hidden = true;
  });

  /* --- passo 2: modelo (define se a versão existe) --- */
  selModelo.addEventListener('change', () => {
    const vs = versoes();
    const mostraVersao = vs.length > 0;

    campoVersao.hidden = !mostraVersao;
    if (passoVersao) passoVersao.hidden = !mostraVersao;

    if (mostraVersao) {
      selVersao.innerHTML =
        `<option value="">${OPCAO_TODAS === '' ? '' : 'Todas as versões'}</option>` +
        vs.map((v) => `<option value="${esc(v.nome)}">${esc(v.nome)}</option>`).join('');
      selVersao.disabled = false;
      if (ajudaVersao) ajudaVersao.hidden = false;
    } else {
      selVersao.innerHTML = `<option value="">Todas as versões</option>`;
      selVersao.disabled = true;
    }

    repovoarAnos();
    marcarPassos();
    if (resultado) resultado.hidden = true;
  });

  /* --- passo 3: versão (opcional) — só muda a lista de anos --- */
  selVersao.addEventListener('change', () => {
    repovoarAnos();
    marcarPassos();
    if (resultado) resultado.hidden = true;
  });

  function repovoarAnos() {
    const anos = anosDoModelo(selMarca.value, selModelo.value, selVersao.value || null);
    selAno.innerHTML =
      `<option value="">Escolha o ano</option>` +
      anos.slice().sort((a, b) => b - a)
        .map((a) => `<option value="${a}">${a}</option>`).join('');
    selAno.disabled = anos.length === 0;
  }

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
      versao: selVersao.value || null,
      ano: Number(selAno.value),
      cilindrada: cilindradaDoModelo(selMarca.value, selModelo.value),
    };

    motoStore.salvar(escolha);
    if (typeof opcoes.aoEscolher === 'function') opcoes.aoEscolher(escolha);
    sincronizarHeader();
    if (typeof opcoes.aoAtualizar === 'function') opcoes.aoAtualizar(escolha);

    if (destino === 'catalogo') {
      const q = new URLSearchParams({ moto: '1' });
      window.location.href = `catalogo.html?${q.toString()}`;
      return;
    }
    if (resultado) {
      resultado.hidden = false;
      resultado.innerHTML = `Mostrando peças para <strong>${esc(rotuloMoto(escolha))}</strong>.`;
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
      if (atual.versao && versoes().some((v) => v.nome === atual.versao)) {
        selVersao.value = atual.versao;
        repovoarAnos();
      }
      if (atual.ano && anosDoModelo(atual.marca, atual.modelo, selVersao.value || null).indexOf(atual.ano) !== -1) {
        selAno.value = String(atual.ano);
      }
    }
  }
  marcarPassos();

  return true;
}

/* --------------------------------------------- moto ativa: faixas e header -- */
/* Faixa completa, usada no catálogo. */
export function htmlMotoAtiva(moto, { acoes = true } = {}) {
  if (!moto) return '';
  return `
<div class="moto-ativa revelar">
  <span class="moto-ativa__icone">${icone('moto', 24)}</span>
  <span class="moto-ativa__texto">
    <span class="moto-ativa__rot">Sua moto</span>
    <span class="moto-ativa__nome">${esc(rotuloMoto(moto))}</span>
  </span>
  ${
    acoes
      ? `<span class="moto-ativa__acoes">
           <a class="btn btn--pequeno btn--contorno" href="localizador.html">Trocar moto</a>
           <button class="btn btn--pequeno btn--contorno" type="button" data-limpar-moto>Ver tudo</button>
         </span>`
      : ''
  }
</div>`;
}

/* Resumo para o cabeçalho — discreto, mas sempre presente. */
export function htmlMotoHeader(moto) {
  if (!moto || !moto.marca) {
    return `<a class="moto-header" href="localizador.html" title="Escolher minha moto">
      <span class="moto-header__icone">${icone('moto', 17)}</span>
      <span class="moto-header__texto">
        <span class="moto-header__rot">Sua moto</span>
        <span class="moto-header__nome">Escolher moto</span>
      </span>
    </a>`;
  }
  return `<a class="moto-header" href="localizador.html" title="Trocar de moto">
    <span class="moto-header__icone">${icone('moto', 17)}</span>
    <span class="moto-header__texto">
      <span class="moto-header__rot">Sua moto</span>
      <span class="moto-header__nome">${esc(rotuloMoto(moto))}</span>
    </span>
  </a>`;
}

/* Redesenha a faixa do header depois que a moto muda (sem recarregar). */
export function sincronizarHeader() {
  const alvo = document.querySelector('[data-moto-header]');
  if (!alvo) return;
  alvo.innerHTML = htmlMotoHeader(motoStore.ler());
}
