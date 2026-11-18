/* ============================================================================
   PÁGINA — PEDIDO (confirmação)
   ----------------------------------------------------------------------------
   É a tela que a cliente vê depois de fechar. Mostra o CÓDIGO DE RETIRADA
   quando o pedido é para retirada na loja, ou os dados de envio quando é
   entrega.

   O pedido pertence à sessão autenticada e é consultado na API. Código de
   retirada e totais vêm do servidor, sem consultar pedidos do navegador.
   ============================================================================ */

import { LOJA, produtoPorId } from './dados.js';
import { moeda, esc, icone, $, avisar, dataHora, prepararRevelar } from './utils.js';
import { nomeStatus, corStatus } from './carrinho.js';
import { api } from './api.js';
import { linhaProduto, estadoVazio } from './componentes.js';
import {localRetirada} from './retirada-local.js';

export async function montarPedido() {
  const alvo = document.getElementById('pedido-container');
  if (!alvo) return;

  const q = new URLSearchParams(window.location.search);
  const id = q.get('id');
  alvo.innerHTML = '<p class="mensagem" role="status">Consultando seu pedido…</p>';
  let pedido;
  try {
    if (!id) throw new Error('Selecione um pedido em Minha Conta.');
    const [resultado,perfilResult] = await Promise.all([api('/orders/' + encodeURIComponent(id)),api('/profile')]);
    const remoto = resultado.order || resultado;
    const endereco = remoto.addressSnapshot || {};
    const perfil = perfilResult.user;
    pedido = {
      id: remoto.orderNumber, criadoEm: remoto.createdAt,
      tipo: remoto.fulfillmentType === 'PICKUP' ? 'retirada' : 'entrega',
      status: ({ PENDING: 'aguardando-retirada', CONFIRMED: 'aguardando-retirada', READY: 'aguardando-retirada', READY_FOR_PICKUP: 'aguardando-retirada', SHIPPED: 'em-transito', COMPLETED: 'concluido', CANCELLED: 'cancelado' })[remoto.status] || remoto.status,
      codigoRetirada: remoto.pickupCode || null,
      retiradoEm: remoto.pickedUpAt, pago: remoto.paymentStatus === 'PAID',
      cliente: { nome: perfil?.name || '', telefone: perfil?.phone || '', email: perfil?.email || '' },
      itens: remoto.items.map(i => ({ id: i.productId, nome: i.nameSnapshot, foto: produtoPorId(i.productId)?.foto, preco: i.unitPriceCents / 100, qtd: i.quantity, subtotal: i.totalCents / 100 })),
      subtotal: remoto.subtotalCents / 100, frete: remoto.shippingCents / 100,
      desconto: remoto.discountCents / 100, total: remoto.totalCents / 100,
      pagamento: `${({ ON_PICKUP:'Na retirada, diretamente na loja', CASH: 'Dinheiro no balcão', PIX: 'Pix presencial', CARD: 'Cartão na maquininha' })[remoto.paymentMethod] || remoto.paymentMethod} — ${remoto.paymentStatus === 'PAID' ? 'confirmado' : 'pendente'}`,
      entrega: { transportadora: 'A confirmar', servico: '', prazo: 'A confirmar', endereco: { rua: endereco.street, numero: endereco.number, complemento: endereco.complement, bairro: endereco.neighborhood, cidade: endereco.city, estado: endereco.state, cep: endereco.zipCode } },
    };
  } catch (error) {
    if (error.status === 401) { window.location.href = 'conta.html?next=' + encodeURIComponent('pedido.html?id=' + (id || '')); return; }
    alvo.innerHTML = `<div class="mensagem mensagem--erro" role="alert">${esc(error.message)}</div><a class="btn" href="conta.html">Ir para Minha Conta</a>`;
    return;
  }

  if (!pedido) {
    alvo.innerHTML = estadoVazio({
      icone: 'busca',
      titulo: 'Pedido não encontrado',
      texto: 'Não encontramos este pedido na sua conta.',
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
      <h1 class="mt-2">${pedido.status === 'cancelado' ? 'Pedido cancelado' : pedido.retiradoEm ? 'Pedido retirado!' : retirada ? 'Pedido reservado!' : 'Pedido realizado!'}</h1>
      <p class="texto-2">
        ${
          retirada
            ? (pedido.status === 'cancelado' ? 'Este pedido foi cancelado e não está disponível para retirada.' : pedido.retiradoEm ? 'Retirada confirmada pela equipe da loja.' : 'Apresente seu código no balcão. Pagamento realizado na retirada, diretamente na loja.')
            : 'Recebemos seu pedido. Assim que ele for postado, enviamos o código de rastreio para você.'
        }
      </p>
    </div>

    ${
      retirada && pedido.codigoRetirada
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

    ${localRetirada()}
    <div class="mensagem mensagem--alerta mb-3">
      ${icone('info', 18)}
      <span>${pedido.pago ? 'Pagamento confirmado. Apresente o código para retirar seu pedido.' : 'Código protegido pelo servidor. A retirada exige pagamento confirmado pela loja.'}</span>
    </div>`
        : retirada ? `<div class="mensagem mb-3" role="status">${pedido.retiradoEm ? 'Retirada registrada em ' + esc(dataHora(pedido.retiradoEm)) + '. Este código foi encerrado.' : 'Código indisponível para este pedido.'}</div>` : `
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
      <span>Consulte a loja para confirmar a entrega. Nenhum pagamento online é processado.</span>
    </div>`
    }

    <div class="detalhe-pedido">
      <div class="painel-dados">
        <h3>Itens do pedido</h3>
        ${pedido.itens.map((i) => linhaProduto(i)).join('')}
        <div class="painel-dados__linha mt-2"><span class="rot">Subtotal</span><span class="val">${moeda(pedido.subtotal)}</span></div>
        ${pedido.desconto > 0 ? `<div class="painel-dados__linha"><span class="rot">Desconto</span><span class="val">− ${moeda(pedido.desconto)}</span></div>` : ''}
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
