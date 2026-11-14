/* ============================================================================
   PÁGINA — CHECKOUT
   ----------------------------------------------------------------------------
   Dois caminhos bem separados, porque a cliente da loja usa os dois:
     RETIRAR NA LOJA → sem pagamento online, gera CÓDIGO DE RETIRADA
     RECEBER EM CASA → informa CEP, escolhe transportadora, gera pedido de envio

   Carrinho e pedido são validados no servidor. Entrega aguarda integração.
   ============================================================================ */

import { LOJA, produtoPorId, produtoServeEm, ehUniversal, rotuloMoto } from './dados.js';
import {
  moeda, esc, icone, $, $$, avisar, prepararRevelar,
  nomeValido, telefoneValido, emailValido, cepValido, cpfValido,
  mascaraTelefone, mascaraCep, mascaraCpf,
} from './utils.js';
import { carrinho, moto as motoStore, inicializarComercio, aoTrocarMoto } from './carrinho.js';
import { api } from './api.js';
import { comercio, criarPedido } from './comercio-api.js';
import { estadoVazio, linhaProduto } from './componentes.js';
import * as cupom from './cupom.js';

export async function montarCheckout() {
  const alvo = document.getElementById('checkout-container');
  if (!alvo) return;
  alvo.innerHTML = '<p class="mensagem" role="status">Carregando seu carrinho seguro…</p>';
  try {
    if (!await inicializarComercio()) {
      window.location.href = 'conta.html?next=checkout.html';
      return;
    }
  } catch (error) {
    alvo.innerHTML = `<div class="mensagem mensagem--erro" role="alert">${esc(error.message)} <a href="checkout.html">Tentar novamente</a></div>`;
    return;
  }

  const itens = carrinho.detalhados();
  if (!itens.length) {
    alvo.innerHTML = estadoVazio({
      icone: 'carrinho',
      titulo: 'Não há itens para finalizar',
      texto: 'Adicione uma peça ao carrinho para seguir para o checkout.',
      acao: { href: 'catalogo.html', rotulo: 'Ver produtos' },
    });
    return;
  }

  let perfil, enderecos;
  try {
    [perfil, enderecos] = await Promise.all([api('/profile'), api('/addresses')]);
  } catch (error) {
    alvo.innerHTML = `<div class="mensagem mensagem--erro" role="alert">${esc(error.message)}</div>`;
    return;
  }
  perfil = perfil.user || perfil;
  enderecos = Array.isArray(enderecos) ? enderecos : enderecos.addresses || [];
  const salvo = { nome: perfil.name, telefone: perfil.phone, email: perfil.email };
  await cupom.revalidarSeguro();
  const subtotalInicial = carrinho.subtotal();

  alvo.innerHTML = `
  <form class="checkout" id="form-checkout" novalidate>
    <div>

      <!-- 1. SEUS DADOS -->
      <section class="bloco">
        <div class="bloco__titulo">
          <span class="bloco__n">1</span>
          <h2>Seus dados</h2>
        </div>

        <div class="grade-campos">
          <div class="campo col-4">
            <label class="campo__rotulo" for="nome">Nome completo *</label>
            <input class="entrada" id="nome" name="nome" type="text" autocomplete="name"
                   placeholder="Ex.: Maria Silva" value="${esc(salvo.nome || '')}" required>
            <span class="ajuda-campo" data-erro="nome"></span>
          </div>

          <div class="campo col-2">
            <label class="campo__rotulo" for="telefone">Telefone / WhatsApp *</label>
            <input class="entrada" id="telefone" name="telefone" type="tel" inputmode="tel"
                   autocomplete="tel" placeholder="(81) 90000-0000"
                   value="${esc(salvo.telefone || '')}" required>
            <span class="ajuda-campo" data-erro="telefone"></span>
          </div>

          <div class="campo col-4">
            <label class="campo__rotulo" for="email">E-mail *</label>
            <input class="entrada" id="email" name="email" type="email" autocomplete="email"
                   placeholder="voce@email.com" value="${esc(salvo.email || '')}" required>
            <span class="ajuda-campo" data-erro="email"></span>
          </div>

          <div class="campo col-2">
            <label class="campo__rotulo" for="cpf">CPF (opcional)</label>
            <input class="entrada" id="cpf" name="cpf" type="text" inputmode="numeric"
                   placeholder="000.000.000-00" value="${esc(salvo.cpf || '')}">
            <span class="ajuda-campo">Só para a nota fiscal.</span>
          </div>
        </div>
      </section>

      <!-- 2. COMO QUER RECEBER -->
      <section class="bloco">
        <div class="bloco__titulo">
          <span class="bloco__n">2</span>
          <h2>Como quer receber?</h2>
        </div>

        <div class="opcoes-recebimento">
          <label class="opcao-entrega">
            <input type="radio" name="tipo" value="retirada" checked>
            <span class="opcao-entrega__topo">
              ${icone('loja', 22)}
              <span class="opcao-entrega__nome">Retirar na loja</span>
            </span>
            <p>Reserve agora e pague no balcão, na hora de retirar. O site gera um código de retirada.</p>
            <span class="selo mt-2">Sem pagamento online</span>
          </label>

          <label class="opcao-entrega">
            <input type="radio" name="tipo" value="entrega">
            <span class="opcao-entrega__topo">
              ${icone('caminhao', 22)}
              <span class="opcao-entrega__nome">Receber em casa</span>
            </span>
            <p>Entrega online ainda indisponível. Escolha retirada ou consulte a loja.</p>
            <span class="selo selo--neutro mt-2">Transportadora ainda não integrada</span>
          </label>
        </div>
      </section>

      <!-- 3. RETIRADA -->
      <section class="bloco" id="bloco-retirada">
        <div class="bloco__titulo">
          <span class="bloco__n">3</span>
          <h2>Retirada na loja</h2>
        </div>
        <div class="mensagem mensagem--ok mb-3">
          ${icone('checkCirculo', 18)}
          <span><strong>Retire seu pedido na loja e pague no momento da retirada.</strong>
          Nada é cobrado agora — nem online, nem no cartão.</span>
        </div>

        <div class="detalhe-pedido">
          <div class="painel-dados">
            <h3>${icone('local', 20)} Endereço de retirada</h3>
            <div class="painel-dados__linha"><span class="rot">Loja</span><span class="val">${esc(LOJA.nome)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Endereço</span><span class="val">${esc(LOJA.endereco.rua)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Bairro</span><span class="val">${esc(LOJA.endereco.bairro)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Cidade</span><span class="val">${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></div>
            <div class="painel-dados__linha"><span class="rot">CEP</span><span class="val">${esc(LOJA.endereco.cep)}</span></div>
          </div>
          <div class="painel-dados">
            <h3>${icone('relogio', 20)} Horário de funcionamento</h3>
            ${LOJA.horario
              .map((h) => `<div class="painel-dados__linha"><span class="rot">${esc(h.dia)}</span><span class="val">${esc(h.hora)}</span></div>`)
              .join('')}
            <p class="micro texto-3 mt-2 mb-0">
              Guarde o código de retirada que vamos gerar. Ele será pedido no balcão.
            </p>
          </div>
        </div>
      </section>

      <!-- 3b. ENTREGA -->
      <section class="bloco oculto" id="bloco-entrega">
        <div class="bloco__titulo">
          <span class="bloco__n">3</span>
          <h2>Endereço de entrega</h2>
        </div>

        <div class="grade-campos">
          <div class="campo col-2">
            <label class="campo__rotulo" for="cep">CEP *</label>
            <input class="entrada" id="cep" name="cep" type="text" inputmode="numeric"
                   autocomplete="postal-code" placeholder="00000-000"
                   value="${esc((salvo.endereco && salvo.endereco.cep) || '')}">
            <span class="ajuda-campo" data-erro="cep"></span>
          </div>

          <div class="campo col-4">
            <label class="campo__rotulo" for="rua">Rua / Avenida *</label>
            <input class="entrada" id="rua" name="rua" type="text" autocomplete="address-line1"
                   placeholder="Rua das Flores" value="${esc((salvo.endereco && salvo.endereco.rua) || '')}">
            <span class="ajuda-campo" data-erro="rua"></span>
          </div>

          <div class="campo col-2">
            <label class="campo__rotulo" for="numero">Número *</label>
            <input class="entrada" id="numero" name="numero" type="text"
                   placeholder="123" value="${esc((salvo.endereco && salvo.endereco.numero) || '')}">
            <span class="ajuda-campo" data-erro="numero"></span>
          </div>

          <div class="campo col-2">
            <label class="campo__rotulo" for="complemento">Complemento</label>
            <input class="entrada" id="complemento" name="complemento" type="text"
                   placeholder="Apto 4B" value="${esc((salvo.endereco && salvo.endereco.complemento) || '')}">
          </div>

          <div class="campo col-2">
            <label class="campo__rotulo" for="bairro">Bairro *</label>
            <input class="entrada" id="bairro" name="bairro" type="text"
                   placeholder="${esc(LOJA.endereco.bairro)}" value="${esc((salvo.endereco && salvo.endereco.bairro) || '')}">
            <span class="ajuda-campo" data-erro="bairro"></span>
          </div>

          <div class="campo col-3">
            <label class="campo__rotulo" for="cidade">Cidade *</label>
            <input class="entrada" id="cidade" name="cidade" type="text"
                   placeholder="${esc(LOJA.endereco.cidade)}" value="${esc((salvo.endereco && salvo.endereco.cidade) || '')}">
            <span class="ajuda-campo" data-erro="cidade"></span>
          </div>

          <div class="campo col-1" style="grid-column:span 1">
            <label class="campo__rotulo" for="uf">UF *</label>
            <input class="entrada" id="uf" name="uf" type="text" maxlength="2"
                   placeholder="PE" style="text-transform:uppercase"
                   value="${esc((salvo.endereco && salvo.endereco.estado) || '')}">
            <span class="ajuda-campo" data-erro="uf"></span>
          </div>

          <div class="campo col-2">
            <button class="btn btn--contorno btn--bloco" type="button" id="btn-calcular-frete">
              ${icone('caminhao', 18)} Calcular frete
            </button>
        </div>
        </div>

        <div id="resultado-frete" class="mt-3"></div>
      </section>

      <!-- 4. PAGAMENTO -->
      <section class="bloco">
        <div class="bloco__titulo">
          <span class="bloco__n">4</span>
          <h2>Pagamento</h2>
        </div>
        <div id="bloco-pagamento"></div>
      </section>

      <div id="aviso-compat" hidden></div>
      <div id="erros-checkout"></div>
    </div>

    <!-- RESUMO -->
    <aside class="resumo" aria-label="Resumo do pedido">
      <h3>Resumo do pedido</h3>

      <div>${itens.map((i) => linhaProduto(i)).join('')}</div>

      <div class="resumo__linha mt-2"><span>Subtotal</span><span>${moeda(subtotalInicial)}</span></div>
      <div class="resumo__linha" id="linha-desconto" hidden>
        <span>Cupom <span id="nome-cupom"></span></span><span class="forte" id="valor-desconto">—</span>
      </div>
      <div class="resumo__linha" id="linha-frete" hidden><span>Frete</span><span id="valor-frete">—</span></div>
      <div class="resumo__linha resumo__linha--total">
        <span>Total</span><span id="valor-total">${moeda(subtotalInicial)}</span>
      </div>
      <p class="resumo__nota" id="nota-pix">
        Pagamento no balcão. Nenhum pagamento online será processado.
      </p>

      <div class="resumo__rodape">
        <button class="btn btn--grande btn--bloco" type="submit" id="btn-finalizar">
          ${icone('check', 20)} <span id="texto-finalizar">Finalizar pedido</span>
        </button>
        <a class="btn btn--contorno btn--bloco" href="carrinho.html">Voltar ao carrinho</a>
      </div>

      <div class="aviso-demostrativo mt-3">
        ${icone('info', 16)}
        <span>Pedido registrado no servidor. Nenhum pagamento é processado online. Entrega e frete serão confirmados pela loja.</span>
      </div>

      ${
        false
          ? `<div class="mensagem mensagem--alerta mt-2">${icone('alerta', 18)}
             <span>Este navegador está bloqueando o armazenamento. O pedido funciona, mas não ficará salvo ao recarregar a página.</span></div>`
          : ''
      }
    </aside>
  </form>`;

  /* ===================================================== comportamento === */
  const form = document.getElementById('form-checkout');
  ['nome', 'telefone', 'email'].forEach(id => {
    const campo = document.getElementById(id);
    campo.readOnly = true;
    campo.setAttribute('aria-describedby', 'origem-dados-checkout');
  });
  document.getElementById('cpf').closest('.campo').hidden = true;
  document.getElementById('cpf').closest('.campo').style.display = 'none';
  const origemDados = document.createElement('p');
  origemDados.id = 'origem-dados-checkout';
  origemDados.className = 'resumo__nota';
  origemDados.innerHTML = 'Dados da sua conta. <a href="conta.html">Atualizar meu perfil</a>. Não coletamos dados de cartão.';
  document.querySelector('#form-checkout .bloco').append(origemDados);
  let freteEscolhido = null;
  const chavePedido = crypto.randomUUID();
  const seletor = document.createElement('div');
  seletor.className = 'campo mb-3';
  seletor.innerHTML = `<label for="endereco-salvo">Endereço cadastrado</label><select class="entrada" id="endereco-salvo"><option value="">Cadastrar um novo endereço</option>${enderecos.map(a => `<option value="${esc(a.id)}"${a.isDefault ? ' selected' : ''}>${esc(a.street)}, ${esc(a.number)} — ${esc(a.city)}/${esc(a.state)}</option>`).join('')}</select>`;
  document.querySelector('#bloco-entrega .grade-campos').before(seletor);
  function selecionarEndereco() {
    const a = enderecos.find(a => a.id === document.getElementById('endereco-salvo').value);
    const campos = { cep: 'zipCode', rua: 'street', numero: 'number', complemento: 'complement', bairro: 'neighborhood', cidade: 'city', uf: 'state' };
    Object.entries(campos).forEach(([campo, key]) => { document.getElementById(campo).value = a?.[key] || ''; });
  }
  document.getElementById('endereco-salvo').addEventListener('change', selecionarEndereco);
  selecionarEndereco();

  /* ---- tipo de entrega ---- */
  function tipoAtual() {
    const el = form.querySelector('input[name="tipo"]:checked');
    return el ? el.value : 'retirada';
  }

  function desenharPagamento() {
    const bloco = document.getElementById('bloco-pagamento');
    if (!bloco) return;
    if (tipoAtual() === 'retirada') {
      bloco.innerHTML = `
        <div class="mensagem mensagem--ok">
          ${icone('checkCirculo', 18)}
          <span>
            <strong>Pagamento realizado na retirada, diretamente na loja</strong>
            Você não paga nada agora. Ao retirar na loja, paga no balcão em dinheiro,
            cartão de débito, crédito ou Pix.
          </span>
        </div>`;
    } else {
      bloco.innerHTML = `
        <div class="aviso-demostrativo mb-3">
          ${icone('info', 16)}
          <span>Não há pagamento pelo site. Para concluir, escolha retirada na loja.</span>
        </div>
        <div class="opcoes-frete">
          <label class="opcao-frete">
            <input type="radio" name="pagamento" value="Pix" checked>
            <span>
              <span class="opcao-frete__nome">Pix</span>
              <span class="opcao-frete__prazo">Pendente de confirmação da loja</span>
            </span>
            <span class="opcao-frete__preco">Pendente</span>
          </label>
          <label class="opcao-frete">
            <input type="radio" name="pagamento" value="Cartão de crédito">
            <span>
              <span class="opcao-frete__nome">Cartão de crédito</span>
              <span class="opcao-frete__prazo">Condições a combinar com a loja</span>
            </span>
            <span class="opcao-frete__preco">Pendente</span>
          </label>
          <label class="opcao-frete">
            <input type="radio" name="pagamento" value="Combinar com a loja">
            <span>
              <span class="opcao-frete__nome">Combinar com a loja</span>
              <span class="opcao-frete__prazo">A equipe entra em contato para acertar o pagamento</span>
            </span>
            <span class="opcao-frete__preco">—</span>
          </label>
        </div>`;
    }
  }

  function desenharTipo() {
    const retirada = tipoAtual() === 'retirada';
    const bRet = document.getElementById('bloco-retirada');
    const bEnt = document.getElementById('bloco-entrega');
    if (bRet) bRet.classList.toggle('oculto', !retirada);
    if (bEnt) bEnt.classList.toggle('oculto', retirada);

    if (retirada) {
      freteEscolhido = null;
      atualizarTotais();
    }
    desenharPagamento();
  }

  form.querySelectorAll('input[name="tipo"]').forEach((r) => {
    r.addEventListener('change', desenharTipo);
  });

  /* ---- máscaras ---- */
  const campoTelefone = document.getElementById('telefone');
  campoTelefone.addEventListener('input', () => {
    const pos = campoTelefone.selectionStart;
    campoTelefone.value = mascaraTelefone(campoTelefone.value);
  });
  const campoCpf = document.getElementById('cpf');
  campoCpf.addEventListener('input', () => { campoCpf.value = mascaraCpf(campoCpf.value); });
  const campoCep = document.getElementById('cep');
  campoCep.addEventListener('input', () => { campoCep.value = mascaraCep(campoCep.value); });
  campoCep.addEventListener('blur', () => {
    if (cepValido(campoCep.value)) calcular();
  });

  /* ---- frete ---- */
  function enderecoAtual() {
    return {
      cep: document.getElementById('cep').value,
      rua: document.getElementById('rua').value.trim(),
      numero: document.getElementById('numero').value.trim(),
      complemento: document.getElementById('complemento').value.trim(),
      bairro: document.getElementById('bairro').value.trim(),
      cidade: document.getElementById('cidade').value.trim(),
      estado: document.getElementById('uf').value.trim().toUpperCase(),
    };
  }

  function calcular() {
    const alvoFrete = document.getElementById('resultado-frete');
    alvoFrete.innerHTML = '<div class="mensagem mensagem--alerta">Frete e prazo não disponíveis online. A loja precisará confirmar o valor e a viabilidade da entrega antes do pagamento.</div>';
    freteEscolhido = { valor: 0, demonstrativo: true };
    atualizarTotais();
    return;
  }

  document.getElementById('btn-calcular-frete').addEventListener('click', calcular);

  /* ---- aviso de compatibilidade (não bloqueia) ----------------------------
     A regra do dono: quando a compatibilidade NÃO está confirmada, isso precisa
     aparecer claramente. Este aviso aparece assim que a página abre — não só
     quando alguém tenta finalizar — para a cliente saber disso enquanto
     preenche os dados, e não depois de levar um "não" no botão. */
  function pecasSemMoto() {
    const moto = motoStore.ler();
    if (moto) return [];
    return carrinho.detalhados()
      .filter((i) => {
        const p = produtoPorId(i.id);
        return p && !ehUniversal(p);
      })
      .map((i) => i.nome);
  }

  function pintarAvisoCompat(semMoto) {
    const caixa = document.getElementById('aviso-compat');
    if (!caixa) return;
    const lista = semMoto || pecasSemMoto();
    if (!lista.length) { caixa.hidden = true; caixa.innerHTML = ''; return; }
    caixa.hidden = false;
    caixa.innerHTML = `
      <div class="mensagem mensagem--alerta">
        ${icone('alerta', 17)}
        <span><strong>Compatibilidade não confirmada.</strong>
          ${lista.map(esc).join(', ')} ${lista.length === 1 ? 'é peça' : 'são peças'}
          específica de moto e você ainda não escolheu a sua.
          <a href="localizador.html" style="text-decoration:underline">Escolher minha moto</a>
          — ou siga, se você já conhece o código da peça.</span>
      </div>`;
  }

  /* ---- totais ---- */
  function atualizarTotais() {
    const subtotal = carrinho.subtotal();
    const cupomAplicado = cupom.atual();
    const desconto = cupomAplicado ? cupomAplicado.desconto : 0;
    const retirada = tipoAtual() === 'retirada';
    const frete = retirada ? 0 : (freteEscolhido ? Number(freteEscolhido.valor) || 0 : null);
    const base = Math.round((subtotal - desconto) * 100) / 100;
    const total = frete == null ? base : Math.round((base + frete) * 100) / 100;

    const linhaFrete = document.getElementById('linha-frete');
    const valorFrete = document.getElementById('valor-frete');
    const valorTotal = document.getElementById('valor-total');
    const notaPix = document.getElementById('nota-pix');
    const textoFinalizar = document.getElementById('texto-finalizar');

    if (linhaFrete && valorFrete) {
      if (retirada) {
        linhaFrete.hidden = true;
      } else if (frete == null) {
        linhaFrete.hidden = false;
        valorFrete.textContent = 'A calcular';
      } else {
        linhaFrete.hidden = false;
        valorFrete.textContent = 'A combinar (não incluído)';
      }
    }

    const linhaDesconto = document.getElementById('linha-desconto');
    const valorDesconto = document.getElementById('valor-desconto');
    const nomeCupom = document.getElementById('nome-cupom');
    if (linhaDesconto && valorDesconto && nomeCupom) {
      if (desconto > 0) {
        linhaDesconto.hidden = false;
        valorDesconto.textContent = '− ' + moeda(desconto);
        nomeCupom.textContent = cupomAplicado.cupom.codigo;
      } else {
        linhaDesconto.hidden = true;
      }
    }

    if (valorTotal) valorTotal.textContent = moeda(total);
    if (notaPix) {
      notaPix.textContent = 'Valores finais validados pelo servidor. Pagamento permanece pendente.';
    }
    if (textoFinalizar) {
      textoFinalizar.textContent = retirada ? 'Reservar e gerar código' : 'Finalizar pedido';
    }
  }

  /* ---- erros ---- */
  function mostrarErro(campo, msg) {
    const el = document.querySelector(`[data-erro="${campo}"]`);
    if (el) { el.textContent = msg || ''; el.style.color = msg ? 'var(--erro)' : ''; }
    const input = document.getElementById(campo);
    if (input) input.style.borderColor = msg ? 'var(--erro)' : '';
  }

  function limparErros() {
    $$('[data-erro]').forEach((el) => { el.textContent = ''; });
    $$('.entrada').forEach((el) => { el.style.borderColor = ''; });
    const erros = document.getElementById('erros-checkout');
    if (erros) erros.innerHTML = '';
  }

  /* ---- validação e envio ---- */
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limparErros();

    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const email = document.getElementById('email').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const retirada = tipoAtual() === 'retirada';
    const problemas = [];

    // These read-only fields come from the authenticated profile. The API
    // already validated them, and order ownership is derived from the session.
    // Legacy presentation rules must not reject a valid saved account here.
    if (!perfil.id) problemas.push('Entre novamente para confirmar os dados da conta.');
    if (cpf && !cpfValido(cpf)) {
      problemas.push('O CPF está incompleto.');
    }

    /* CONFERÊNCIA DE COMPATIBILIDADE (antes de fechar o pedido).
       Enquanto a cliente navega, a moto ativa pode mudar. Aqui o carrinho é
       reconferido contra a moto de AGORA, com dois pesos diferentes:

       • moto escolhida e a peça não consta como compatível → BLOQUEIA.
         Aqui existe uma incompatibilidade AFIRMADA, e vender assim seria
         entregar a peça errada.
       • nenhuma moto escolhida e a peça é específica → AVISA, não bloqueia.
         Não estamos afirmando que serve nem que não serve: a compatibilidade
         simplesmente não foi confirmada. Quem sabe o número da peça de cor
         (balcão, mecânico) não pode ser impedido de comprar por isso.

       Universal não passa por nenhuma das duas. */
    const motoAgora = motoStore.ler();
    const semMoto = [];
    const naoServe = [];
    carrinho.detalhados().forEach((i) => {
      const p = produtoPorId(i.id);
      if (!p || ehUniversal(p)) return;
      if (!motoAgora) { semMoto.push(i.nome); return; }
      if (!produtoServeEm(p, motoAgora)) naoServe.push(i.nome);
    });

    if (naoServe.length) {
      problemas.push(
        `Confira a compatibilidade: ${naoServe.map(esc).join(', ')} ` +
        `não consta como compatível com a sua ${esc(rotuloMoto(motoAgora))}. ` +
        'Tire a peça do carrinho ou troque a moto para continuar.'
      );
    }

    /* Aviso que NÃO bloqueia: fica registrado e a cliente decide. */
    pintarAvisoCompat(semMoto);

    let endereco = null;
    if (!retirada) {
      problemas.push('Entrega online ainda indisponível. Escolha retirada na loja para concluir.');
      endereco = enderecoAtual();
      if (!cepValido(endereco.cep)) { mostrarErro('cep', 'CEP com 8 dígitos.'); problemas.push('Confira o CEP.'); }
      if (!endereco.rua) { mostrarErro('rua', 'Informe a rua.'); problemas.push('Confira a rua.'); }
      if (!endereco.numero) { mostrarErro('numero', 'Informe o número.'); problemas.push('Confira o número.'); }
      if (!endereco.bairro) { mostrarErro('bairro', 'Informe o bairro.'); problemas.push('Confira o bairro.'); }
      if (!endereco.cidade) { mostrarErro('cidade', 'Informe a cidade.'); problemas.push('Confira a cidade.'); }
      if (!/^[A-Z]{2}$/.test(endereco.estado)) { mostrarErro('uf', 'UF com 2 letras.'); problemas.push('Confira a UF.'); }
    }

    if (problemas.length) {
      const erros = document.getElementById('erros-checkout');
      if (erros) {
        erros.innerHTML = `
          <div class="mensagem mensagem--erro">
            ${icone('alerta', 18)}
            <span><strong>Faltou alguma coisa:</strong><br>${problemas.map(esc).join('<br>')}</span>
          </div>`;
      }
      const primeiro = document.querySelector('.entrada[style*="rgb(192"]') || form.querySelector('[data-erro]:not(:empty)');
      if (primeiro) primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
      avisar('Confira os campos destacados.', 'erro');
      return;
    }

    /* tudo certo: cria o pedido */
    const pagamentoEl = form.querySelector('input[name="pagamento"]:checked');

    /* Última conferência do cupom antes de fechar: se ele deixou de valer
       (carrinho encolheu e o mínimo não é mais atingido), NÃO entra no pedido. */
    const cupomFinal = cupom.atual();

    const botao = document.getElementById('btn-finalizar');
    if (botao.disabled) return;
    botao.disabled = true;
    botao.setAttribute('aria-busy', 'true');
    try {
      let addressId = document.getElementById('endereco-salvo').value || undefined;
      if (!retirada && !addressId) {
        const criado = await api('/addresses', { method: 'POST', body: {
          recipientName: nome, phone: telefone, zipCode: endereco.cep.replace(/\D/g, ''), street: endereco.rua,
          number: endereco.numero, complement: endereco.complemento, neighborhood: endereco.bairro,
          city: endereco.cidade, state: endereco.estado, isDefault: enderecos.length === 0,
        } });
        addressId = (criado.address || criado).id;
        document.getElementById('endereco-salvo').add(new Option(`${endereco.rua}, ${endereco.numero}`, addressId, true, true));
      }
      const resultado = await criarPedido({
        fulfillmentType: retirada ? 'PICKUP' : 'DELIVERY',
        paymentMethod: retirada ? 'CASH' : pagamentoEl?.value === 'Pix' ? 'PIX' : pagamentoEl?.value === 'Cartão de crédito' ? 'CARD' : 'CASH',
        addressId: retirada ? undefined : addressId,
        couponCode: cupom.codigoSalvo() || undefined,
        idempotencyKey: chavePedido,
      });
      const pedido = resultado.order || resultado;
      comercio.atualizarItens([]);
      cupom.limpar();
      window.location.href = `pedido.html?id=${encodeURIComponent(pedido.id)}`;
    } catch (error) {
      document.getElementById('erros-checkout').innerHTML = `<div class="mensagem mensagem--erro" role="alert">${esc(error.message)}</div>`;
      if (error.status === 401) window.location.href = 'conta.html?next=checkout.html';
    } finally { botao.disabled = false; botao.removeAttribute('aria-busy'); }
  });

  /* ---- primeira pintura ---- */
  desenharTipo();
  atualizarTotais();
  /* O aviso de compatibilidade não confirmada aparece JÁ na abertura, para a
     cliente saber antes de preencher tudo — e some se ela escolher a moto. */
  pintarAvisoCompat();
  aoTrocarMoto(() => {
    pintarAvisoCompat();
    atualizarTotais();
  });
  prepararRevelar();
}
