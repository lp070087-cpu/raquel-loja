/* ============================================================================
   PÁGINA — CHECKOUT
   ----------------------------------------------------------------------------
   Dois caminhos bem separados, porque a cliente da loja usa os dois:
     RETIRAR NA LOJA → sem pagamento online, gera CÓDIGO DE RETIRADA
     RECEBER EM CASA → informa CEP, escolhe transportadora, gera pedido de envio

   O frete é SIMULADO (ver assets/js/frete.js). Nada de API aqui.
   ============================================================================ */

import { LOJA, precoPix, produtoPorId } from './dados.js';
import {
  moeda, esc, icone, $, $$, avisar, prepararRevelar,
  nomeValido, telefoneValido, emailValido, cepValido, cpfValido,
  mascaraTelefone, mascaraCep, mascaraCpf,
} from './utils.js';
import { midiaProduto } from './artes.js';
import { carrinho, cliente, moto as motoStore, montarPedido, pedidos, armazenamentoDisponivel } from './carrinho.js';
import { calcularFrete, prazoTexto } from './frete.js';
import { estadoVazio, linhaProduto } from './componentes.js';

export function montarCheckout() {
  const alvo = document.getElementById('checkout-container');
  if (!alvo) return;

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

  const salvo = cliente.ler();
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
            <p>Enviamos para todo o Brasil. Informe o CEP e escolha a transportadora.</p>
            <span class="selo selo--neutro mt-2">Frete calculado pelo CEP</span>
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
                   placeholder="Boa Viagem" value="${esc((salvo.endereco && salvo.endereco.bairro) || '')}">
            <span class="ajuda-campo" data-erro="bairro"></span>
          </div>

          <div class="campo col-3">
            <label class="campo__rotulo" for="cidade">Cidade *</label>
            <input class="entrada" id="cidade" name="cidade" type="text"
                   placeholder="Recife" value="${esc((salvo.endereco && salvo.endereco.cidade) || '')}">
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

      <div id="erros-checkout"></div>
    </div>

    <!-- RESUMO -->
    <aside class="resumo" aria-label="Resumo do pedido">
      <h3>Resumo do pedido</h3>

      <div>${itens.map((i) => linhaProduto(i)).join('')}</div>

      <div class="resumo__linha mt-2"><span>Subtotal</span><span>${moeda(subtotalInicial)}</span></div>
      <div class="resumo__linha" id="linha-frete" hidden><span>Frete</span><span id="valor-frete">—</span></div>
      <div class="resumo__linha resumo__linha--total">
        <span>Total</span><span id="valor-total">${moeda(subtotalInicial)}</span>
      </div>
      <p class="resumo__nota" id="nota-pix">
        ${moeda(precoPix(subtotalInicial))} no Pix (${Math.round(LOJA.pixDesconto * 100)}% de desconto)
      </p>

      <div class="resumo__rodape">
        <button class="btn btn--grande btn--bloco" type="submit" id="btn-finalizar">
          ${icone('check', 20)} <span id="texto-finalizar">Finalizar pedido</span>
        </button>
        <a class="btn btn--contorno btn--bloco" href="carrinho.html">Voltar ao carrinho</a>
      </div>

      <div class="aviso-demostrativo mt-3">
        ${icone('info', 16)}
        <span>Apresentação demonstrativa: nenhum pagamento é processado e nenhum dado sai do seu navegador.</span>
      </div>

      ${
        !armazenamentoDisponivel()
          ? `<div class="mensagem mensagem--alerta mt-2">${icone('alerta', 18)}
             <span>Este navegador está bloqueando o armazenamento. O pedido funciona, mas não ficará salvo ao recarregar a página.</span></div>`
          : ''
      }
    </aside>
  </form>`;

  /* ===================================================== comportamento === */
  const form = document.getElementById('form-checkout');
  let freteEscolhido = null;

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
            <strong>Pagamento na retirada.</strong>
            Você não paga nada agora. Ao retirar na loja, paga no balcão em dinheiro,
            cartão de débito, crédito ou Pix.
          </span>
        </div>`;
    } else {
      bloco.innerHTML = `
        <div class="aviso-demostrativo mb-3">
          ${icone('info', 16)}
          <span>Nesta apresentação não existe pagamento online. Escolha só para ver como a tela fica.</span>
        </div>
        <div class="opcoes-frete">
          <label class="opcao-frete">
            <input type="radio" name="pagamento" value="Pix" checked>
            <span>
              <span class="opcao-frete__nome">Pix</span>
              <span class="opcao-frete__prazo">${Math.round(LOJA.pixDesconto * 100)}% de desconto · aprovação na hora</span>
            </span>
            <span class="opcao-frete__preco">-${Math.round(LOJA.pixDesconto * 100)}%</span>
          </label>
          <label class="opcao-frete">
            <input type="radio" name="pagamento" value="Cartão de crédito">
            <span>
              <span class="opcao-frete__nome">Cartão de crédito</span>
              <span class="opcao-frete__prazo">Em até 3x sem juros</span>
            </span>
            <span class="opcao-frete__preco">3x</span>
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
    const cep = document.getElementById('cep').value;

    if (!cepValido(cep)) {
      alvoFrete.innerHTML = `<div class="mensagem mensagem--erro">${icone('alerta', 18)}
        <span>Informe um CEP válido com 8 dígitos para ver as opções de entrega.</span></div>`;
      return;
    }

    alvoFrete.innerHTML = `<p class="texto-2 pequeno">Calculando opções de entrega…</p>`;

    calcularFrete(cep, { peso: carrinho.pesoEstimado(), subtotal: carrinho.subtotal() })
      .then((opcoes) => {
        if (!opcoes.length) {
          alvoFrete.innerHTML = `<div class="mensagem mensagem--alerta">${icone('alerta', 18)}
            <span>Nenhuma transportadora atende este CEP nesta simulação.</span></div>`;
          return;
        }
        alvoFrete.innerHTML = `
          <h3 style="font-size:1rem">Escolha a transportadora</h3>
          <div class="opcoes-frete">
            ${opcoes
              .map(
                (o, i) => `
              <label class="opcao-frete">
                <input type="radio" name="frete" value="${esc(o.id)}"${i === 0 ? ' checked' : ''}>
                <span>
                  <span class="opcao-frete__nome">${esc(o.nome)}</span>
                  <span class="opcao-frete__prazo">${esc(o.transportadora)} · ${prazoTexto(o)}</span>
                </span>
                <span class="opcao-frete__preco">${o.gratis ? 'Grátis' : moeda(o.valor)}</span>
              </label>`
              )
              .join('')}
          </div>
          <div class="aviso-demostrativo mt-2">
            ${icone('info', 16)}
            <span>${esc('Valores demonstrativos nesta apresentação.')} Na versão final o cálculo vem da API oficial do Melhor Envio.</span>
          </div>`;

        alvoFrete.querySelectorAll('input[name="frete"]').forEach((r) => {
          r.addEventListener('change', () => {
            const escolhida = opcoes.find((o) => o.id === r.value);
            freteEscolhido = escolhida || null;
            atualizarTotais();
          });
        });

        freteEscolhido = opcoes[0];
        atualizarTotais();
      })
      .catch((err) => {
        alvoFrete.innerHTML = `<div class="mensagem mensagem--erro">${icone('alerta', 18)}
          <span>${esc(err && err.message ? err.message : 'Não foi possível calcular o frete.')}</span></div>`;
      });
  }

  document.getElementById('btn-calcular-frete').addEventListener('click', calcular);

  /* ---- totais ---- */
  function atualizarTotais() {
    const subtotal = carrinho.subtotal();
    const retirada = tipoAtual() === 'retirada';
    const frete = retirada ? 0 : (freteEscolhido ? Number(freteEscolhido.valor) || 0 : null);
    const total = frete == null ? subtotal : Math.round((subtotal + frete) * 100) / 100;

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
        valorFrete.textContent = frete === 0 ? 'Grátis' : moeda(frete);
      }
    }

    if (valorTotal) valorTotal.textContent = moeda(total);
    if (notaPix) {
      notaPix.textContent =
        `${moeda(precoPix(total))} no Pix (${Math.round(LOJA.pixDesconto * 100)}% de desconto)`;
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
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    limparErros();

    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const email = document.getElementById('email').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const retirada = tipoAtual() === 'retirada';
    const problemas = [];

    if (!nomeValido(nome)) {
      mostrarErro('nome', 'Informe nome e sobrenome.');
      problemas.push('Confira o nome completo.');
    }
    if (!telefoneValido(telefone)) {
      mostrarErro('telefone', 'Informe DDD + número.');
      problemas.push('Confira o telefone.');
    }
    if (!emailValido(email)) {
      mostrarErro('email', 'Informe um e-mail válido.');
      problemas.push('Confira o e-mail.');
    }
    if (cpf && !cpfValido(cpf)) {
      problemas.push('O CPF está incompleto.');
    }

    let endereco = null;
    if (!retirada) {
      endereco = enderecoAtual();
      if (!cepValido(endereco.cep)) { mostrarErro('cep', 'CEP com 8 dígitos.'); problemas.push('Confira o CEP.'); }
      if (!endereco.rua) { mostrarErro('rua', 'Informe a rua.'); problemas.push('Confira a rua.'); }
      if (!endereco.numero) { mostrarErro('numero', 'Informe o número.'); problemas.push('Confira o número.'); }
      if (!endereco.bairro) { mostrarErro('bairro', 'Informe o bairro.'); problemas.push('Confira o bairro.'); }
      if (!endereco.cidade) { mostrarErro('cidade', 'Informe a cidade.'); problemas.push('Confira a cidade.'); }
      if (!/^[A-Z]{2}$/.test(endereco.estado)) { mostrarErro('uf', 'UF com 2 letras.'); problemas.push('Confira a UF.'); }
      if (!freteEscolhido) {
        problemas.push('Calcule e escolha uma transportadora.');
        const alvoFrete = document.getElementById('resultado-frete');
        if (alvoFrete && !alvoFrete.querySelector('input[name="frete"]')) calcular();
      }
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

    const pedido = montarPedido({
      tipo: retirada ? 'retirada' : 'entrega',
      dadosCliente: { nome, telefone, email, cpf },
      endereco,
      freteEscolhido: retirada ? null : freteEscolhido,
      pagamento: pagamentoEl ? pagamentoEl.value : null,
    });

    cliente.salvar({ nome, telefone, email, cpf, endereco });

    window.location.href = `pedido.html?id=${encodeURIComponent(pedido.id)}`;
  });

  /* ---- primeira pintura ---- */
  desenharTipo();
  atualizarTotais();
  prepararRevelar();
}
