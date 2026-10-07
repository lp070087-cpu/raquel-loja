/* ============================================================================
   PÁGINA — PEDIDO (confirmação)
   ----------------------------------------------------------------------------
   É a tela que a cliente vê depois de fechar. Mostra o CÓDIGO DE RETIRADA
   quando o pedido é para retirada na loja, ou os dados de envio quando é
   entrega.

   O código vem de `pedido.codigoRetirada`, gerado em carrinho.js no momento
   do pedido — nunca está escrito no HTML.
   ============================================================================ */

import { LOJA } from './dados.js';
import { moeda, esc, icone, $, avisar, dataHora, prepararRevelar } from './utils.js';
import { pedidos, nomeStatus, corStatus, formatarCodigo } from './carrinho.js';
import { linhaProduto, estadoVazio } from './componentes.js';

export function montarPedido() {
  const alvo = document.getElementById('pedido-container');
  if (!alvo) return;

  const q = new URLSearchParams(window.location.search);
  const id = q.get('id') || pedidos.ultimoId();
  const pedido = id ? pedidos.porId(id) : null;

  if (!pedido) {
    alvo.innerHTML = estadoVazio({
      icone: 'busca',
      titulo: 'Pedido não encontrado',
      texto: 'Não encontramos este pedido neste navegador. Faça um novo pedido ou consulte a sua conta.',
      acao: { href: 'catalogo.html', rotulo: 'Voltar ao catálogo' },
    });
    return;
  }

  document.title = `Pedido ${pedido.id} — ${LOJA.nome}`;

  const retirada = pedido.tipo === 'retirada';

  alvo.innerHTML = `
  <div class="confirmacao">

    <div class="confirmacao__topo">
      <div class="confirmacao__icone${retirada ? '' : ' confirmacao__icone--entrega'}">
        ${icone(retirada ? 'checkCirculo' : 'caminhao', 48)}
      </div>
      <span class="selo ${corStatus(pedido.status)}">${esc(nomeStatus(pedido.status))}</span>
      <h1 class="mt-2">${retirada ? 'Pedido reservado!' : 'Pedido realizado!'}</h1>
      <p class="texto-2">
        ${
          retirada
            ? 'Apresente este código no balcão para retirar e pagar seu pedido.'
            : 'Recebemos seu pedido. Assim que ele for postado, enviamos o código de rastreio para você.'
        }
      </p>
    </div>

    ${
      retirada
        ? `
    <div class="codigo-retirada">
      <div class="codigo-retirada__formas" aria-hidden="true"><span></span><span></span></div>
      <p class="codigo-retirada__rotulo">Código de retirada</p>
      <p class="codigo-retirada__valor" id="codigo-valor" data-codigo="${esc(pedido.codigoRetirada)}">${esc(pedido.codigoRetirada)}</p>
      <p class="codigo-retirada__nota">
        Guarde este código. Ele será pedido no balcão da loja para liberar o seu pedido.
      </p>
      <div class="codigo-retirada__acoes">
        <button class="btn" type="button" id="btn-copiar-codigo">${icone('copiar', 18)} Copiar código</button>
        <button class="btn btn--claro" type="button" id="btn-imprimir">${icone('lista', 18)} Imprimir</button>
      </div>
    </div>

    <div class="mensagem mensagem--alerta mb-3">
      ${icone('info', 18)}
      <span>${esc('Apresentação demonstrativa: neste protótipo o código é gerado no próprio navegador. Na versão final ele é gerado e conferido no servidor, com validade e registro de quem retirou.')}</span>
    </div>`
        : `
    <div class="painel-dados mb-3">
      <h3>${icone('caminhao', 20)} Entrega</h3>
      <div class="painel-dados__linha"><span class="rot">Transportadora</span><span class="val">${esc(pedido.entrega.transportadora)} — ${esc(pedido.entrega.servico)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Prazo estimado</span><span class="val">${esc(pedido.entrega.prazo)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Endereço</span><span class="val">${esc(pedido.entrega.endereco.rua)}, ${esc(pedido.entrega.endereco.numero)}${pedido.entrega.endereco.complemento ? ' — ' + esc(pedido.entrega.endereco.complemento) : ''}</span></div>
      <div class="painel-dados__linha"><span class="rot">Bairro</span><span class="val">${esc(pedido.entrega.endereco.bairro)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Cidade</span><span class="val">${esc(pedido.entrega.endereco.cidade)}/${esc(pedido.entrega.endereco.estado)}</span></div>
      <div class="painel-dados__linha"><span class="rot">CEP</span><span class="val">${esc(pedido.entrega.endereco.cep)}</span></div>
    </div>

    <div class="aviso-demostrativo mb-3">
      ${icone('info', 16)}
      <span>Entrega e valores demonstrativos. Na versão final o frete é calculado pela API oficial do Melhor Envio.</span>
    </div>`
    }

    <div class="detalhe-pedido">
      <div class="painel-dados">
        <h3>Itens do pedido</h3>
        ${pedido.itens.map((i) => linhaProduto(i)).join('')}
        <div class="painel-dados__linha mt-2"><span class="rot">Subtotal</span><span class="val">${moeda(pedido.subtotal)}</span></div>
        ${
          !retirada
            ? `<div class="painel-dados__linha"><span class="rot">Frete</span><span class="val">${pedido.frete === 0 ? 'Grátis' : moeda(pedido.frete)}</span></div>`
            : ''
        }
        <div class="painel-dados__linha" style="font-size:1.1rem">
          <span class="rot forte">Total</span><span class="val forte">${moeda(pedido.total)}</span>
        </div>
      </div>

      <div class="painel-dados">
        <h3>Dados do pedido</h3>
        <div class="painel-dados__linha"><span class="rot">Número do pedido</span><span class="val forte">${esc(pedido.id)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Cliente</span><span class="val">${esc(pedido.cliente.nome)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Telefone</span><span class="val">${esc(pedido.cliente.telefone)}</span></div>
        <div class="painel-dados__linha"><span class="rot">E-mail</span><span class="val">${esc(pedido.cliente.email)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Data</span><span class="val">${dataHora(pedido.criadoEm)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Forma</span><span class="val">${retirada ? 'Retirada na loja' : 'Entrega em casa'}</span></div>
        <div class="painel-dados__linha"><span class="rot">Pagamento</span><span class="val">${esc(pedido.pagamento)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Status</span><span class="val"><span class="selo ${corStatus(pedido.status)}">${esc(nomeStatus(pedido.status))}</span></span></div>
      </div>
    </div>

    ${
      retirada
        ? `
    <div class="painel-dados mt-3">
      <h3>${icone('loja', 20)} Onde retirar</h3>
      <div class="painel-dados__linha"><span class="rot">Loja</span><span class="val">${esc(LOJA.nome)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Endereço</span><span class="val">${esc(LOJA.endereco.rua)} — ${esc(LOJA.endereco.bairro)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Cidade</span><span class="val">${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></div>
      <div class="painel-dados__linha"><span class="rot">Horário</span><span class="val">${esc(LOJA.horario[0].dia)}: ${esc(LOJA.horario[0].hora)}</span></div>
    </div>`
        : ''
    }

    <div class="hero__ctas mt-4" style="justify-content:center">
      <a class="btn btn--grande" href="conta.html">${icone('lista', 20)} Ver meus pedidos</a>
      <a class="btn btn--grande btn--contorno" href="catalogo.html">Continuar comprando</a>
      <a class="btn btn--grande btn--contorno" target="_blank" rel="noopener"
         href="https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(`Olá! Fiz o pedido ${pedido.id}${retirada ? ' (retirada na loja)' : ''} e queria confirmar.`)}">
        ${icone('telefone', 20)} Falar com a loja
      </a>
    </div>

  </div>`;

  /* ---------------------------------------------------------- copiar ----- */
  const btnCopiar = document.getElementById('btn-copiar-codigo');
  if (btnCopiar) {
    btnCopiar.addEventListener('click', () => {
      const codigo = pedido.codigoRetirada;
      copiar(codigo)
        .then(() => {
          btnCopiar.innerHTML = `${icone('check', 18)} Código copiado!`;
          avisar('Código copiado. É este que você apresenta no balcão.');
          setTimeout(() => {
            btnCopiar.innerHTML = `${icone('copiar', 18)} Copiar código`;
          }, 2600);
        })
        .catch(() => {
          // navegador antigo sem área de transferência moderna
          const campo = document.getElementById('codigo-valor');
          if (campo) {
            const faixa = document.createRange();
            faixa.selectNodeContents(campo);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(faixa);
          }
          avisar('Selecione o código e copie manualmente.', 'alerta');
        });
    });
  }

  const btnImprimir = document.getElementById('btn-imprimir');
  if (btnImprimir) btnImprimir.addEventListener('click', () => window.print());

  prepararRevelar();
}

/* Copia texto usando a API moderna, com alternativa antiga. */
function copiar(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(String(texto));
  }
  return new Promise((resolve, reject) => {
    try {
      const area = document.createElement('textarea');
      area.value = String(texto);
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      ok ? resolve() : reject(new Error('copia indisponivel'));
    } catch (e) {
      reject(e);
    }
  });
}
