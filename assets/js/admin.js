/* ============================================================================
   ADMIN — PAINEL DEMONSTRATIVO
   ----------------------------------------------------------------------------
   O ponto central desta área é a VALIDAÇÃO DO CÓDIGO DE RETIRADA: o pedido
   criado no site aparece aqui, a equipe digita o código que a cliente
   apresenta e o sistema confirma — ou recusa.

   Sobre a segurança (leia antes de levar para produção)
   -----------------------------------------------------
   • `entrarAdmin()` NÃO é autenticação. É comparação de texto no navegador,
     com credencial escrita em dados.js. Qualquer pessoa lê.
     Em produção: login no servidor, senha com hash, sessão em cookie
     httpOnly e permissão por perfil (balcão não vê financeiro).
   • `validarCodigo()` roda no navegador. Em produção é o servidor que confere
     o código no banco, marca quem validou e quando, e impede duas retiradas
     do mesmo código (operação atômica).
   ============================================================================ */

import {
  LOJA, PRODUTOS, CATEGORIAS, ADMIN_DEMO, CLIENTES_DEMO,
  nomeCategoria, produtosDaCategoria, MARCAS, versoesDoModelo,
  aplicacoesDoProduto, ehUniversal, rotuloMoto,
} from './dados.js';
import {
  moeda, esc, icone, avisar, dataHora, dataCurta, prepararRevelar,
  cascata, temDesconto, descontoPct,
} from './utils.js';
import { midiaProduto } from './artes.js';
import { pedidos, nomeStatus, corStatus, resumoPedidos, codigoConfere, formatarCodigo } from './carrinho.js';

/* --------------------------------------------------------- sessão ------- */
const CHAVE_SESSAO = 'motopecas-admin-sessao';

export function jaLogado() {
  try { return window.sessionStorage.getItem(CHAVE_SESSAO) === '1'; } catch (e) { return false; }
}

export function entrarAdmin(usuario, senha) {
  const u = String(usuario || '').trim();
  const s = String(senha || '');
  if (!u || !s) return { ok: false, mensagem: 'Preencha usuário e senha.' };
  if (u === ADMIN_DEMO.usuario && s === ADMIN_DEMO.senha) {
    try { window.sessionStorage.setItem(CHAVE_SESSAO, '1'); } catch (e) { /* segue */ }
    return { ok: true };
  }
  return { ok: false, mensagem: 'Usuário ou senha inválidos. Nesta demonstração use admin / demo123.' };
}

export function sairAdmin() {
  try { window.sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* segue */ }
}

/* --------------------------------------------------------- validação ---- */
/* DEMONSTRAÇÃO. Em produção vira POST /api/pedidos/:id/validar { codigo }. */
export function validarCodigo(pedidoId, digitado) {
  const pedido = pedidos.porId(pedidoId);
  if (!pedido) return { ok: false, motivo: 'pedido-inexistente', mensagem: 'Pedido não encontrado.' };
  if (pedido.tipo !== 'retirada') {
    return { ok: false, motivo: 'nao-e-retirada', mensagem: 'Este pedido é de entrega, não tem código de retirada.' };
  }
  if (!pedido.codigoRetirada) {
    return { ok: false, motivo: 'sem-codigo', mensagem: 'Este pedido não gerou código de retirada.' };
  }
  if (pedido.status === 'concluido') {
    return { ok: false, motivo: 'ja-retirado', mensagem: 'Este pedido já foi retirado e pago.' };
  }
  if (!codigoConfere(digitado, pedido.codigoRetirada)) {
    return { ok: false, motivo: 'codigo-errado', mensagem: 'Código inválido. Confira e tente novamente.' };
  }
  return { ok: true, mensagem: 'Código confirmado.', pedido };
}

/* Confirma a retirada: só depois do código certo. */
export function confirmarRetirada(pedidoId) {
  const pedido = pedidos.porId(pedidoId);
  if (!pedido) return { ok: false, mensagem: 'Pedido não encontrado.' };
  if (pedido.status === 'concluido') return { ok: false, mensagem: 'Este pedido já foi retirado.' };
  /* A trava de verdade: sem código validado antes, não conclui.
     Em produção isso é checagem no servidor, não no navegador. */
  if (pedido.tipo === 'retirada' && !pedido.codigoValidadoEm) {
    return { ok: false, mensagem: 'Valide o código de retirada antes de concluir o pedido.' };
  }
  pedidos.atualizar(pedidoId, { status: 'concluido', retiradoEm: new Date().toISOString() });
  pedidos.registrar(pedidoId, 'Retirada confirmada no balcão. Pagamento recebido.');
  return { ok: true, mensagem: 'Pedido marcado como retirado e pago.' };
}

function marcarCodigoValidado(pedidoId) {
  pedidos.atualizar(pedidoId, { codigoValidadoEm: new Date().toISOString() });
  pedidos.registrar(pedidoId, 'Código de retirada conferido no balcão.');
}

/* --------------------------------------------------------------- menu --- */
const MENU = [
  { id: 'dashboard',       rotulo: 'Dashboard',       icone: 'painel' },
  { id: 'pedidos',         rotulo: 'Pedidos',         icone: 'sacola' },
  { id: 'produtos',        rotulo: 'Produtos',        icone: 'caixa' },
  { id: 'categorias',      rotulo: 'Categorias',      icone: 'etiqueta' },
  { id: 'compatibilidade', rotulo: 'Compatibilidade', icone: 'moto' },
  { id: 'estoque',         rotulo: 'Estoque',         icone: 'grafico' },
  { id: 'clientes',        rotulo: 'Clientes',        icone: 'usuarios' },
  { id: 'fretes',          rotulo: 'Fretes',          icone: 'caminhao' },
  { id: 'configuracoes',   rotulo: 'Configurações',   icone: 'ajuste' },
];

let secaoAtual = 'dashboard';
let pedidoAberto = null;
let filtroPedidos = 'todos';
let buscaAdmin = '';
let produtoCompat = PRODUTOS.find((p) => !ehUniversal(p));

/* ------------------------------------------------------------ montagem -- */
export function montarAdmin() {
  if (!jaLogado()) { window.location.href = 'login.html'; return; }

  const simb = document.getElementById('simbolo-admin');
  if (simb) simb.innerHTML = icone('moto', 23);

  desenharMenu();

  const btnSair = document.getElementById('btn-sair');
  if (btnSair) {
    btnSair.addEventListener('click', () => { sairAdmin(); window.location.href = 'login.html'; });
  }

  document.addEventListener('click', (ev) => {
    const item = ev.target.closest('[data-secao]');
    if (item) {
      secaoAtual = item.getAttribute('data-secao');
      pedidoAberto = null;
      desenharMenu();
      desenharSecao();
      return;
    }

    const abrir = ev.target.closest('[data-abrir-pedido]');
    if (abrir) { pedidoAberto = abrir.getAttribute('data-abrir-pedido'); desenharSecao(); return; }

    if (ev.target.closest('[data-voltar-pedidos]')) { pedidoAberto = null; desenharSecao(); return; }

    if (ev.target.closest('[data-validar-codigo]')) {
      const campo = document.getElementById('campo-codigo');
      const id = campo.getAttribute('data-pedido');
      const r = validarCodigo(id, campo.value);
      if (r.ok) {
        marcarCodigoValidado(id);
        avisar('Código confirmado.');
        desenharSecao();
        const res = document.getElementById('resultado-validacao');
        if (res) {
          res.innerHTML = `<div class="mensagem mensagem--ok">${icone('checkCirculo', 17)}
            <span><strong>Código confirmado.</strong> Agora marque o pedido como retirado e pago.</span></div>`;
        }
      } else {
        const res = document.getElementById('resultado-validacao');
        if (res) {
          res.innerHTML = `<div class="mensagem mensagem--erro">${icone('alerta', 17)}
            <span>${esc(r.mensagem)}</span></div>`;
        }
        avisar(r.mensagem, 'erro');
      }
      return;
    }

    if (ev.target.closest('[data-confirmar-retirada]')) {
      const id = ev.target.closest('[data-confirmar-retirada]').getAttribute('data-confirmar-retirada');
      const r = confirmarRetirada(id);
      avisar(r.mensagem, r.ok ? 'ok' : 'erro');
      if (r.ok) desenharSecao();
      return;
    }

    if (ev.target.closest('[data-mudar-status]')) {
      const el = ev.target.closest('[data-mudar-status]');
      const id = el.getAttribute('data-pedido');
      const novo = el.value;
      const p = pedidos.porId(id);
      if (!p) return;
      if (novo === 'concluido' && p.tipo === 'retirada' && !p.codigoValidadoEm) {
        avisar('Valide o código de retirada antes de concluir.', 'erro');
        desenharSecao();
        return;
      }
      pedidos.atualizar(id, { status: novo });
      pedidos.registrar(id, `Status alterado para "${nomeStatus(novo)}".`);
      avisar('Status atualizado.');
      desenharSecao();
      return;
    }

    if (ev.target.closest('[data-filtrar-pedidos]')) {
      filtroPedidos = ev.target.closest('[data-filtrar-pedidos]').getAttribute('data-filtrar-pedidos');
      desenharSecao();
      return;
    }

    /* Compatibilidade: escolher qual peça está sendo configurada */
    const escolheProduto = ev.target.closest('[data-produto-compat]');
    if (escolheProduto) {
      const id = escolheProduto.getAttribute('data-produto-compat');
      produtoCompat = PRODUTOS.find((p) => p.id === id) || produtoCompat;
      desenharSecao();
      return;
    }

    if (ev.target.closest('[data-demo]')) {
      avisar('Recurso demonstrativo: esta ação entra na versão final do sistema.', 'alerta');
    }
  });

  /* busca com espera curta e devolvendo o foco (sem isso cada letra redesenha
     a seção e o campo perde o foco) */
  let relogioBusca = null;
  document.addEventListener('input', (ev) => {
    if (ev.target && ev.target.id === 'campo-codigo') {
      ev.target.value = formatarCodigo(ev.target.value);
      return;
    }
    if (ev.target && ev.target.id === 'busca-admin') {
      buscaAdmin = ev.target.value;
      if (relogioBusca) clearTimeout(relogioBusca);
      relogioBusca = setTimeout(() => {
        desenharSecao();
        const campo = document.getElementById('busca-admin');
        if (campo) {
          campo.focus();
          const fim = campo.value.length;
          try { campo.setSelectionRange(fim, fim); } catch (e) { /* alguns tipos não suportam */ }
        }
      }, 260);
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target && ev.target.id === 'campo-codigo') {
      ev.preventDefault();
      const btn = document.querySelector('[data-validar-codigo]');
      if (btn) btn.click();
    }
  });

  desenharSecao();
}

function desenharMenu() {
  const alvo = document.getElementById('menu-admin');
  if (!alvo) return;
  alvo.innerHTML = MENU.map((m) => `
    <button class="admin__menu-item" type="button" data-secao="${m.id}"
            aria-current="${secaoAtual === m.id ? 'true' : 'false'}">
      ${icone(m.icone, 18)}<span class="admin__menu-rotulo">${esc(m.rotulo)}</span>
    </button>`).join('');
}

function definirTopo(titulo, subtitulo) {
  const t = document.getElementById('titulo-secao');
  const s = document.getElementById('subtitulo-secao');
  if (t) t.textContent = titulo;
  if (s) s.textContent = subtitulo;
  document.title = `${titulo} — Painel Moto Peças`;
}

function desenharSecao() {
  const alvo = document.getElementById('conteudo-admin');
  if (!alvo) return;
  const mapa = {
    dashboard: telaDashboard, pedidos: telaPedidos, produtos: telaProdutos,
    categorias: telaCategorias, compatibilidade: telaCompatibilidade,
    estoque: telaEstoque, clientes: telaClientes, fretes: telaFretes,
    configuracoes: telaConfiguracoes,
  };
  alvo.innerHTML = (mapa[secaoAtual] || telaDashboard)();
  prepararRevelar();
  cascata(alvo.querySelector('.grade'), 45);
}

/* ---------------------------------------------------------- dashboard --- */
function telaDashboard() {
  definirTopo('Dashboard', 'Resumo do movimento da loja.');
  const r = resumoPedidos();
  const semEstoque = PRODUTOS.filter((p) => Number(p.estoque) <= 0).length;
  const baixo = PRODUTOS.filter((p) => Number(p.estoque) > 0 && Number(p.estoque) <= Number(p.estoqueMinimo)).length;
  const ultimos = pedidos.lista().slice(0, 5);

  return `
  <div class="grade grade--3 mb-4">
    ${cartaoMetrica('sacola', 'Pedidos hoje', String(r.hoje), `${r.total} no total`)}
    ${cartaoMetrica('loja', 'Aguardando retirada', String(r.aguardandoRetirada), 'para o balcão')}
    ${cartaoMetrica('caminhao', 'Pedidos para envio', String(r.paraEnvio), 'para postar')}
  </div>

  <div class="grade grade--3 mb-4">
    ${cartaoMetrica('dinheiro', 'Faturamento (demo)', moeda(r.faturamento), `hoje: ${moeda(r.faturamentoHoje)}`)}
    ${cartaoMetrica('caixa', 'Produtos no catálogo', String(PRODUTOS.length), `${CATEGORIAS.length} categorias`)}
    ${cartaoMetrica('alerta', 'Estoque baixo', String(baixo + semEstoque), `${semEstoque} sem estoque`)}
  </div>

  <div class="painel mb-4">
    <div class="painel__topo">
      <h2>Últimos pedidos</h2>
      <button class="btn btn--pequeno btn--contorno" type="button" data-secao="pedidos">Ver todos</button>
    </div>
    ${
      ultimos.length
        ? `<div class="painel__corpo painel__corpo--sem">${tabelaPedidos(ultimos)}</div>`
        : `<div class="painel__corpo">${vazioDemo('Nenhum pedido ainda',
            'Faça um pedido na loja (retirada ou entrega) e ele aparece aqui na hora.')}</div>`
    }
  </div>

  <div class="painel">
    <div class="painel__topo"><h2>Estoque que precisa de atenção</h2></div>
    <div class="painel__corpo painel__corpo--sem">
      <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Situação</th></tr></thead>
        <tbody>
          ${PRODUTOS.filter((p) => Number(p.estoque) <= Number(p.estoqueMinimo)).map((p) => `
            <tr class="${Number(p.estoque) <= 0 ? 'linha-baixa' : ''}">
              <td><span class="tabela__produto">
                <span class="tabela__miniatura">${midiaProduto(p, { alt: '', prefixo: '../' })}</span>
                <span class="tabela__nome">${esc(p.nome)}</span>
              </span></td>
              <td>${esc(nomeCategoria(p.categoria))}</td>
              <td>${p.estoque} un.</td>
              <td>${Number(p.estoque) <= 0
                ? `<span class="selo selo--erro">Sem estoque</span>`
                : `<span class="selo selo--alerta">Repor</span>`}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>`;
}

function cartaoMetrica(ic, rotulo, valor, pe) {
  return `
  <div class="cartao-metrica revelar">
    <div class="cartao-metrica__topo">
      <span class="cartao-metrica__rotulo">${esc(rotulo)}</span>
      <span class="cartao-metrica__icone">${icone(ic, 20)}</span>
    </div>
    <span class="cartao-metrica__valor">${esc(valor)}</span>
    <span class="cartao-metrica__pe">${esc(pe)}</span>
  </div>`;
}

function vazioDemo(titulo, texto) {
  return `
  <div class="estado-vazio" style="border-style:dashed">
    <div class="estado-vazio__icone">${icone('info', 34)}</div>
    <h3>${esc(titulo)}</h3><p>${esc(texto)}</p>
  </div>`;
}

/* -------------------------------------------------------------- pedidos - */
function telaPedidos() {
  if (pedidoAberto) return telaDetalhePedido(pedidoAberto);
  definirTopo('Pedidos', 'Pedidos feitos no site aparecem aqui automaticamente.');

  const todos = pedidos.lista();
  const filtros = [
    { id: 'todos', t: 'Todos', q: todos.length },
    { id: 'retirada', t: 'Retirada', q: todos.filter((p) => p.tipo === 'retirada').length },
    { id: 'entrega', t: 'Entrega', q: todos.filter((p) => p.tipo === 'entrega').length },
    { id: 'aguardando-retirada', t: 'Aguardando retirada', q: todos.filter((p) => p.status === 'aguardando-retirada').length },
    { id: 'concluido', t: 'Concluídos', q: todos.filter((p) => p.status === 'concluido').length },
  ];

  let lista = todos;
  if (filtroPedidos !== 'todos') lista = lista.filter((p) => p.tipo === filtroPedidos || p.status === filtroPedidos);
  const t = buscaAdmin.trim().toLowerCase();
  if (t) {
    lista = lista.filter((p) => p.id.toLowerCase().indexOf(t) !== -1 ||
      (p.cliente.nome || '').toLowerCase().indexOf(t) !== -1 ||
      (p.cliente.telefone || '').indexOf(t) !== -1);
  }

  return `
  <div class="filtro-barra">
    ${filtros.map((f) => `
      <button class="btn btn--pequeno ${filtroPedidos === f.id ? '' : 'btn--contorno'}"
              type="button" data-filtrar-pedidos="${f.id}">
        ${esc(f.t)} <span class="micro">(${f.q})</span>
      </button>`).join('')}
    <input class="entrada" id="busca-admin" type="search" placeholder="Buscar por pedido, cliente ou telefone" value="${esc(buscaAdmin)}">
  </div>

  <div class="painel">
    <div class="painel__topo">
      <h2>${lista.length} ${lista.length === 1 ? 'pedido' : 'pedidos'}</h2>
      <span class="micro texto-3">Atualiza sozinho quando a loja cria um pedido</span>
    </div>
    ${lista.length
      ? `<div class="painel__corpo painel__corpo--sem">${tabelaPedidos(lista)}</div>`
      : `<div class="painel__corpo">${vazioDemo(
          todos.length ? 'Nenhum pedido com esse filtro' : 'Nenhum pedido ainda',
          todos.length ? 'Troque o filtro ou limpe a busca.'
            : 'Faça um pedido na loja e ele aparece aqui automaticamente — com o código de retirada, quando for o caso.')}</div>`}
  </div>`;
}

function tabelaPedidos(lista) {
  /* A tabela de pedidos tem 7 colunas: no celular ela não cabe. O contêiner
     rolável fica AQUI dentro, para que toda tabela de pedidos (dashboard,
     lista, filtros) já nasça com rolagem própria. */
  return `
  <div class="tabela-wrap">
  <table class="tabela">
    <thead><tr>
      <th>Pedido</th><th>Cliente</th><th>Data</th><th>Tipo</th>
      <th>Total</th><th>Status</th><th>Ações</th>
    </tr></thead>
    <tbody>
      ${lista.map((p) => `
        <tr>
          <td class="tabela__num">${esc(p.id)}</td>
          <td><span class="tabela__nome">${esc(p.cliente.nome)}</span><br>
              <span class="tabela__sub">${esc(p.cliente.telefone)}</span></td>
          <td>${dataCurta(p.criadoEm)}</td>
          <td><span class="pilula-tipo ${p.tipo === 'retirada' ? 'pilula-tipo--retirada' : 'pilula-tipo--entrega'}">
            ${p.tipo === 'retirada' ? 'Retirada' : 'Entrega'}</span></td>
          <td class="forte">${moeda(p.total)}</td>
          <td><span class="selo ${corStatus(p.status)}">${esc(nomeStatus(p.status))}</span></td>
          <td class="tabela__acoes">
            <button class="btn btn--pequeno btn--contorno" type="button" data-abrir-pedido="${esc(p.id)}">
              ${icone('olho', 14)} Abrir
            </button>
          </td>
        </tr>`).join('')}
    </tbody>
  </table>
  </div>`;
}

/* ------------------------------------------------------- detalhe pedido - */
function telaDetalhePedido(id) {
  const p = pedidos.porId(id);
  if (!p) { pedidoAberto = null; return telaPedidos(); }

  definirTopo(`Pedido ${p.id}`, p.tipo === 'retirada' ? 'Pedido para retirada na loja.' : 'Pedido para entrega.');

  const retirada = p.tipo === 'retirada';
  const concluido = p.status === 'concluido';
  const codigoOk = !!p.codigoValidadoEm;

  return `
  <button class="link-simples mb-3" type="button" data-voltar-pedidos>← Voltar para a lista de pedidos</button>

  ${retirada ? `
  <div class="validador">
    <h3>${icone('chave', 19)} Código de retirada</h3>
    ${concluido
      ? `<div class="mensagem mensagem--ok">${icone('checkCirculo', 17)}
           <span><strong>Pedido concluído.</strong> Retirado e pago em ${dataHora(p.retiradoEm)}.</span></div>`
      : `<p class="texto-2 pequeno mb-0">Digite o código apresentado pelo cliente no balcão.</p>
         <div class="validador__campo">
           <label class="oculto" for="campo-codigo">Código apresentado pelo cliente</label>
           <input class="entrada" id="campo-codigo" type="text" data-pedido="${esc(p.id)}"
                  inputmode="text" autocomplete="off" spellcheck="false" maxlength="6"
                  placeholder="XXXX-00" ${codigoOk ? 'value="' + esc(p.codigoRetirada) + '"' : ''}>
           <button class="btn" type="button" data-validar-codigo="${esc(p.id)}">
             ${icone('check', 17)} Validar retirada
           </button>
         </div>
         <div id="resultado-validacao" class="mt-3">
           ${codigoOk ? `<div class="mensagem mensagem--ok">${icone('checkCirculo', 17)}
             <span><strong>Código confirmado.</strong> Agora marque o pedido como retirado e pago.</span></div>` : ''}
         </div>
         <p class="micro texto-3 mt-3 mb-0">
           O código do cliente é conferido contra o código gerado no pedido.
           Nesta demonstração a conferência acontece no navegador; na versão final, no servidor.
         </p>`}
  </div>` : ''}

  <div class="detalhe-admin">
    <div class="painel">
      <div class="painel__topo">
        <h2>Itens do pedido</h2>
        <span class="selo ${corStatus(p.status)}">${esc(nomeStatus(p.status))}</span>
      </div>
      <div class="painel__corpo">
        ${p.itens.map((i) => `
          <div class="linha-produto">
            <span class="linha-produto__midia">${midiaProduto({ foto: i.foto, nome: i.nome }, { alt: '', classe: 'foto-produto--mini', prefixo: '../' })}</span>
            <span class="linha-produto__corpo">
              <span class="linha-produto__nome">${esc(i.nome)}</span>
              <span class="linha-produto__qtd">${i.qtd} × ${moeda(i.preco)}</span>
            </span>
            <span class="linha-produto__preco">${moeda(i.subtotal)}</span>
          </div>`).join('')}

        <div class="painel-dados__linha mt-3"><span class="rot">Subtotal</span><span class="val">${moeda(p.subtotal)}</span></div>
        ${!retirada ? `<div class="painel-dados__linha"><span class="rot">Frete</span><span class="val">${p.frete === 0 ? 'Grátis' : moeda(p.frete)}</span></div>` : ''}
        <div class="painel-dados__linha" style="font-size:1.15rem">
          <span class="rot forte">Total</span><span class="val forte">${moeda(p.total)}</span>
        </div>

        <div class="linha mt-3">
          <label class="rotulo mb-0" for="status-pedido">Alterar status</label>
          <select class="entrada" id="status-pedido" data-mudar-status data-pedido="${esc(p.id)}"
                  style="width:auto;padding:.6em 2.3em .6em .9em" ${concluido ? 'disabled' : ''}>
            <option value="aguardando-retirada"${p.status === 'aguardando-retirada' ? ' selected' : ''}>Aguardando retirada</option>
            <option value="aguardando-envio"${p.status === 'aguardando-envio' ? ' selected' : ''}>Aguardando envio</option>
            <option value="em-transito"${p.status === 'em-transito' ? ' selected' : ''}>Em trânsito</option>
            <option value="concluido"${p.status === 'concluido' ? ' selected' : ''}>Concluído</option>
            <option value="cancelado"${p.status === 'cancelado' ? ' selected' : ''}>Cancelado</option>
          </select>
        </div>

        ${retirada && !concluido ? `
          <button class="btn btn--grande btn--bloco mt-3" type="button"
                  data-confirmar-retirada="${esc(p.id)}"${codigoOk ? '' : ' disabled aria-disabled="true"'}>
            ${icone('checkCirculo', 19)} Marcar como retirado e pago
          </button>
          ${!codigoOk ? `<p class="micro texto-3 centro mt-2 mb-0">Disponível depois de validar o código acima.</p>` : ''}` : ''}
        ${concluido ? `<div class="mensagem mensagem--ok mt-3">${icone('checkCirculo', 17)}
          <span><strong>Concluído.</strong> Retirado e pago em ${dataHora(p.retiradoEm)}.</span></div>` : ''}
      </div>
    </div>

    <div>
      <div class="painel mb-3">
        <div class="painel__topo"><h2>Cliente</h2></div>
        <div class="painel__corpo">
          <div class="painel-dados__linha"><span class="rot">Nome</span><span class="val">${esc(p.cliente.nome)}</span></div>
          <div class="painel-dados__linha"><span class="rot">Telefone</span><span class="val">${esc(p.cliente.telefone)}</span></div>
          <div class="painel-dados__linha"><span class="rot">E-mail</span><span class="val">${esc(p.cliente.email)}</span></div>
          ${p.cliente.cpf ? `<div class="painel-dados__linha"><span class="rot">CPF</span><span class="val">${esc(p.cliente.cpf)}</span></div>` : ''}
        </div>
      </div>

      <div class="painel mb-3">
        <div class="painel__topo"><h2>${retirada ? 'Retirada' : 'Entrega'}</h2></div>
        <div class="painel__corpo">
          ${retirada ? `
            <div class="painel-dados__linha"><span class="rot">Forma</span><span class="val">Retirada na loja</span></div>
            <div class="painel-dados__linha"><span class="rot">Pagamento</span><span class="val">${esc(p.pagamento)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Código</span><span class="val forte">${esc(p.codigoRetirada || '—')}</span></div>
            <div class="painel-dados__linha"><span class="rot">Código conferido</span><span class="val">${p.codigoValidadoEm ? dataHora(p.codigoValidadoEm) : 'Ainda não'}</span></div>`
          : `
            <div class="painel-dados__linha"><span class="rot">Transportadora</span><span class="val">${esc(p.entrega.transportadora)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Serviço</span><span class="val">${esc(p.entrega.servico)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Prazo</span><span class="val">${esc(p.entrega.prazo)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Endereço</span><span class="val">${esc(p.entrega.endereco.rua)}, ${esc(p.entrega.endereco.numero)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Bairro</span><span class="val">${esc(p.entrega.endereco.bairro)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Cidade</span><span class="val">${esc(p.entrega.endereco.cidade)}/${esc(p.entrega.endereco.estado)}</span></div>
            <div class="painel-dados__linha"><span class="rot">CEP</span><span class="val">${esc(p.entrega.endereco.cep)}</span></div>
            <div class="painel-dados__linha"><span class="rot">Pagamento</span><span class="val">${esc(p.pagamento)}</span></div>`}
        </div>
      </div>

      <div class="painel">
        <div class="painel__topo"><h2>Histórico</h2></div>
        <div class="painel__corpo">
          ${(p.historico || []).slice().reverse().map((h) => `
            <div class="painel-dados__linha">
              <span class="rot">${esc(h.texto)}</span>
              <span class="val micro">${dataHora(h.em)}</span>
            </div>`).join('') || '<p class="micro texto-3 mb-0">Sem movimentações.</p>'}
        </div>
      </div>
    </div>
  </div>`;
}

/* -------------------------------------------------------------- produtos - */
function telaProdutos() {
  definirTopo('Produtos', 'Catálogo da loja. Os botões são demonstrativos.');

  const t = buscaAdmin.trim().toLowerCase();
  const lista = t
    ? PRODUTOS.filter((p) => p.nome.toLowerCase().indexOf(t) !== -1 || p.sku.toLowerCase().indexOf(t) !== -1)
    : PRODUTOS;

  return `
  <div class="filtro-barra">
    <input class="entrada" id="busca-admin" type="search" placeholder="Buscar por nome ou SKU" value="${esc(buscaAdmin)}">
    <button class="btn btn--pequeno btn--contorno" type="button" data-demo>${icone('mais', 15)} Novo produto</button>
  </div>

  <div class="painel">
    <div class="painel__topo">
      <h2>${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}</h2>
      <span class="micro texto-3">Preços e estoque demonstrativos</span>
    </div>
    <div class="painel__corpo painel__corpo--sem">
      <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Compatibilidade</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          ${lista.map((p) => {
            const universal = ehUniversal(p);
            const semEstoque = Number(p.estoque) <= 0;
            const baixoEstoque = !semEstoque && Number(p.estoque) <= Number(p.estoqueMinimo);
            return `
            <tr>
              <td><span class="tabela__produto">
                <span class="tabela__miniatura">${midiaProduto(p, { alt: '', prefixo: '../' })}</span>
                <span><span class="tabela__nome">${esc(p.nome)}</span><br>
                <span class="tabela__sub">${esc(p.sku)} · ${esc(p.marca)}</span></span>
              </span></td>
              <td>${esc(nomeCategoria(p.categoria))}</td>
              <td><span class="forte">${moeda(p.preco)}</span>
                ${temDesconto(p) ? `<br><span class="tabela__sub">-${descontoPct(p)}%</span>` : ''}</td>
              <td><span class="linha" style="gap:8px">
                <span class="barra-estoque ${semEstoque ? 'barra-estoque--fora' : baixoEstoque ? 'barra-estoque--baixo' : ''}">
                  <span style="width:${Math.min(100, (Number(p.estoque) / Math.max(1, Number(p.estoqueMinimo) * 4)) * 100)}%"></span>
                </span><span class="micro">${p.estoque}</span>
              </span></td>
              <td>${universal ? `<span class="selo selo--neutro">Universal</span>`
                : `<span class="micro texto-2">${p.compat.length} aplicações</span>`}</td>
              <td>${semEstoque ? `<span class="selo selo--erro">Sem estoque</span>`
                : baixoEstoque ? `<span class="selo selo--alerta">Repor</span>`
                : `<span class="selo selo--ok">Ativo</span>`}</td>
              <td class="tabela__acoes">
                <a class="btn btn--pequeno btn--contorno" href="../produto.html?id=${encodeURIComponent(p.id)}" target="_blank">${icone('olho', 14)} Ver</a>
                <button class="btn btn--pequeno btn--contorno" type="button" data-demo>${icone('lapis', 14)} Editar</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------ categorias - */
function telaCategorias() {
  definirTopo('Categorias', 'Como o catálogo da loja está organizado.');
  return `
  <div class="grade grade--3">
    ${CATEGORIAS.map((c) => {
      const lista = produtosDaCategoria(c.slug);
      const valor = lista.reduce((s, p) => s + p.preco * Number(p.estoque), 0);
      return `
      <div class="cartao-metrica revelar">
        <div class="cartao-metrica__topo">
          <span class="cartao-metrica__rotulo">${esc(c.chamada)}</span>
          <span class="cartao-metrica__icone">${icone('etiqueta', 20)}</span>
        </div>
        <span class="cartao-metrica__valor" style="font-size:1.35rem">${esc(c.nome)}</span>
        <span class="cartao-metrica__pe">${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'} · ${moeda(Math.round(valor))} em estoque</span>
        <button class="btn btn--pequeno btn--contorno mt-2" type="button" data-demo>Editar</button>
      </div>`;
    }).join('')}
  </div>`;
}

/* ------------------------------------------------------- compatibilidade - */
/*
   Esta é a tela que explica o sistema para a dona da loja: mostra a PEÇA e,
   embaixo, a lista de APLICAÇÕES (marca / modelo / versão / anos) e o botão
   de acrescentar uma nova. É o cadastro que alimenta o localizador do site.
*/
function telaCompatibilidade() {
  definirTopo('Compatibilidade', 'Onde a loja informa em quais motos cada peça serve.');

  const especificas = PRODUTOS.filter((p) => !ehUniversal(p));
  const universais = PRODUTOS.filter((p) => ehUniversal(p));
  const atual = produtoCompat || especificas[0];
  const apps = atual ? aplicacoesDoProduto(atual) : [];

  return `
  <div class="aviso-demostrativo mb-4">
    ${icone('info', 15)}
    <span>
      É este cadastro que faz o localizador do site funcionar: cada peça guarda
      <strong>marca, modelo, versão, ano inicial e ano final</strong>. Quando a cliente escolhe a moto,
      o site mostra só as peças que estão aqui.
    </span>
  </div>

  <div class="detalhe-admin">

    <div class="painel">
      <div class="painel__topo">
        <h2>Aplicações da peça</h2>
        <select class="entrada" data-produto-compat style="width:auto;padding:.6em 2.3em .6em .9em">
          ${especificas.map((p) => `<option value="${esc(p.id)}"${p.id === (atual && atual.id) ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}
        </select>
      </div>
      <div class="painel__corpo">
        ${atual ? `
          <div class="tabela__produto mb-4">
            <span class="tabela__miniatura" style="width:60px;height:60px">${midiaProduto(atual, { alt: '', prefixo: '../' })}</span>
            <span>
              <span class="tabela__nome">${esc(atual.nome)}</span><br>
              <span class="tabela__sub">${esc(atual.sku)} · ${esc(atual.marca)} · ${esc(nomeCategoria(atual.categoria))}</span>
            </span>
          </div>

          <div class="etiquetas-moto mb-4">
            ${apps.map((a) => `
              <span class="etiqueta-moto">
                <strong>${esc(a.marca)} ${esc(a.modelo)}</strong>
                ${esc(a.versao)} · ${esc(a.anos)}
                ${a.cilindrada ? ` · ${esc(a.cilindrada)}` : ''}
              </span>`).join('')}
          </div>

          <table class="tabela-compat">
            <thead><tr><th>Marca</th><th>Modelo</th><th>Versão</th><th>Anos</th><th>Observação</th></tr></thead>
            <tbody>
              ${apps.map((a) => `<tr>
                <td>${esc(a.marca)}</td><td>${esc(a.modelo)}</td>
                <td>${esc(a.versao)}</td><td class="forte">${esc(a.anos)}</td>
                <td class="texto-3">${esc(a.observacao || '—')}</td>
              </tr>`).join('')}
            </tbody>
          </table>

          <button class="btn mt-4" type="button" data-demo>${icone('mais', 17)} Adicionar compatibilidade</button>
        ` : '<p class="texto-2 mb-0">Nenhuma peça com compatibilidade específica cadastrada.</p>'}
      </div>
    </div>

    <div>
      <div class="painel mb-3">
        <div class="painel__topo"><h2>Como cadastrar</h2></div>
        <div class="painel__corpo">
          <div class="form-admin">
            <div class="campo col-3">
              <span class="campo__rotulo">Marca da moto</span>
              <select class="entrada">${MARCAS.map((m) => `<option>${esc(m.nome)}</option>`).join('')}</select>
            </div>
            <div class="campo col-3">
              <span class="campo__rotulo">Modelo</span>
              <select class="entrada" id="compat-modelo">
                ${(MARCAS[0].modelos || []).map((m) => `<option>${esc(m.nome)}</option>`).join('')}
              </select>
            </div>
            <div class="campo col-3">
              <span class="campo__rotulo">Versão</span>
              <select class="entrada">
                <option>Todas as versões</option>
                ${versoesDoModelo(MARCAS[0].nome, MARCAS[0].modelos[0].nome).map((v) => `<option>${esc(v.nome)}</option>`).join('')}
              </select>
            </div>
            <div class="campo col-3">
              <span class="campo__rotulo">Cilindrada</span>
              <input class="entrada" type="text" value="${esc(MARCAS[0].modelos[0].cilindrada || '')}">
            </div>
            <div class="campo col-3">
              <span class="campo__rotulo">Ano inicial</span>
              <input class="entrada" type="number" value="2016">
            </div>
            <div class="campo col-3">
              <span class="campo__rotulo">Ano final</span>
              <input class="entrada" type="number" value="2026">
            </div>
            <div class="campo col-6">
              <span class="campo__rotulo">Observação técnica (opcional)</span>
              <input class="entrada" type="text" placeholder="Ex.: somente freio a disco">
            </div>
            <div class="campo col-6">
              <button class="btn" type="button" data-demo>${icone('mais', 17)} Vincular esta moto à peça</button>
            </div>
          </div>
        </div>
      </div>

      <div class="painel">
        <div class="painel__topo">
          <h2>Produtos universais (${universais.length})</h2>
          <span class="micro texto-3">Não precisam de vínculo</span>
        </div>
        <div class="painel__corpo">
          <span class="etiquetas-moto">
            ${universais.map((p) => `<span class="etiqueta-moto"><strong>${esc(p.nome)}</strong></span>`).join('')}
          </span>
        </div>
      </div>
    </div>
  </div>`;
}

/* --------------------------------------------------------------- estoque - */
function telaEstoque() {
  definirTopo('Estoque', 'Posição de estoque por produto e por categoria.');
  const porCategoria = CATEGORIAS.map((c) => {
    const lista = produtosDaCategoria(c.slug);
    return { c, unidades: lista.reduce((s, p) => s + Number(p.estoque), 0), produtos: lista.length };
  });
  const totalUnidades = porCategoria.reduce((s, x) => s + x.unidades, 0);
  const valor = PRODUTOS.reduce((s, p) => s + Number(p.estoque) * Number(p.custo || 0), 0);
  const criticos = PRODUTOS.filter((p) => Number(p.estoque) <= Number(p.estoqueMinimo));

  return `
  <div class="grade grade--3 mb-4">
    ${cartaoMetrica('caixa', 'Unidades em estoque', String(totalUnidades), `${PRODUTOS.length} produtos`)}
    ${cartaoMetrica('dinheiro', 'Valor de custo', moeda(Math.round(valor)), 'estimado (demonstrativo)')}
    ${cartaoMetrica('alerta', 'Precisam de reposição', String(criticos.length), 'no mínimo ou abaixo')}
  </div>

  <div class="painel mb-4">
    <div class="painel__topo"><h2>Por categoria</h2></div>
    <div class="painel__corpo painel__corpo--sem">
      <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr><th>Categoria</th><th>Produtos</th><th>Unidades</th><th>Participação</th></tr></thead>
        <tbody>
          ${porCategoria.map((x) => `
            <tr>
              <td class="tabela__nome">${esc(x.c.nome)}</td>
              <td>${x.produtos}</td>
              <td class="forte">${x.unidades}</td>
              <td><span class="linha" style="gap:8px">
                <span class="barra-estoque"><span style="width:${totalUnidades ? Math.round((x.unidades / totalUnidades) * 100) : 0}%"></span></span>
                <span class="micro">${totalUnidades ? Math.round((x.unidades / totalUnidades) * 100) : 0}%</span>
              </span></td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>

  <div class="painel">
    <div class="painel__topo">
      <h2>Reposição sugerida (${criticos.length})</h2>
      <span class="micro texto-3">Estoque no mínimo ou abaixo</span>
    </div>
    <div class="painel__corpo painel__corpo--sem">
      <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr><th>Produto</th><th>SKU</th><th>Estoque</th><th>Mínimo</th><th>Sugestão</th></tr></thead>
        <tbody>
          ${criticos.map((p) => {
            const sug = Math.max(10, Number(p.estoqueMinimo) * 3 - Number(p.estoque));
            return `<tr class="${Number(p.estoque) <= 0 ? 'linha-baixa' : ''}">
              <td class="tabela__nome">${esc(p.nome)}</td>
              <td class="micro">${esc(p.sku)}</td>
              <td class="forte">${p.estoque}</td>
              <td>${p.estoqueMinimo}</td>
              <td><span class="selo selo--alerta">Comprar ${sug}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>`;
}

/* -------------------------------------------------------------- clientes - */
function telaClientes() {
  definirTopo('Clientes', 'Quem já comprou na loja.');

  const dosPedidos = {};
  pedidos.lista().forEach((p) => {
    const chave = p.cliente.telefone || p.cliente.nome;
    if (!chave) return;
    if (!dosPedidos[chave]) {
      dosPedidos[chave] = {
        nome: p.cliente.nome, telefone: p.cliente.telefone,
        cidade: p.entrega ? p.entrega.endereco.cidade : LOJA.endereco.cidade,
        uf: p.entrega ? p.entrega.endereco.estado : LOJA.endereco.estado,
        pedidos: 0, total: 0, desde: p.criadoEm, real: true,
      };
    }
    dosPedidos[chave].pedidos += 1;
    dosPedidos[chave].total += Number(p.total) || 0;
    if (p.criadoEm < dosPedidos[chave].desde) dosPedidos[chave].desde = p.criadoEm;
  });

  const lista = Object.keys(dosPedidos).map((k) => dosPedidos[k]).concat(CLIENTES_DEMO);

  return `
  <div class="painel">
    <div class="painel__topo">
      <h2>${lista.length} ${lista.length === 1 ? 'cliente' : 'clientes'}</h2>
      <span class="micro texto-3">Os primeiros são pedidos desta demonstração; o restante é exemplo</span>
    </div>
    <div class="painel__corpo painel__corpo--sem">
      <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr><th>Cliente</th><th>Telefone</th><th>Cidade</th><th>Pedidos</th><th>Total gasto</th><th>Cliente desde</th></tr></thead>
        <tbody>
          ${lista.map((c) => `
            <tr>
              <td><span class="tabela__nome">${esc(c.nome)}</span>
                ${c.real ? '<br><span class="selo selo--ok">Pedido desta demonstração</span>' : ''}</td>
              <td>${esc(c.telefone)}</td>
              <td>${esc(c.cidade)}/${esc(c.uf)}</td>
              <td>${c.pedidos}</td>
              <td class="forte">${moeda(c.total)}</td>
              <td>${dataCurta(c.desde)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- fretes - */
function telaFretes() {
  definirTopo('Fretes', 'Regras de envio da loja.');
  return `
  <div class="aviso-demostrativo mb-4">
    ${icone('info', 15)}
    <span>O cálculo de frete desta apresentação é uma <strong>simulação local</strong>: o valor sai de uma
    tabela de exemplo, sem consultar nenhuma transportadora. Na versão final, este módulo passa a
    usar a API oficial do Melhor Envio.</span>
  </div>

  <div class="grade grade--3 mb-4">
    ${cartaoMetrica('caminhao', 'Frete grátis no PAC', moeda(LOJA.freeShippingFrom), 'acima deste valor')}
    ${cartaoMetrica('dinheiro', 'Desconto no Pix', `${Math.round(LOJA.pixDesconto * 100)}%`, 'aplicado no checkout')}
    ${cartaoMetrica('local', 'CEP de origem', LOJA.endereco.cep, `${LOJA.endereco.cidade}/${LOJA.endereco.estado}`)}
  </div>

  <div class="painel">
    <div class="painel__topo">
      <h2>Opções cadastradas (demonstrativo)</h2>
      <button class="btn btn--pequeno btn--contorno" type="button" data-demo>${icone('mais', 15)} Nova regra</button>
    </div>
    <div class="painel__corpo painel__corpo--sem">
      <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr><th>Serviço</th><th>Transportadora</th><th>Prazo base</th><th>Valor base</th><th>Por kg</th><th>Status</th></tr></thead>
        <tbody>
          ${[
            { nome: 'PAC', transp: 'Correios', dias: '5–8 dias úteis', base: 22.9, kg: 4.2 },
            { nome: 'SEDEX', transp: 'Correios', dias: '2–4 dias úteis', base: 34.9, kg: 7.8 },
            { nome: 'Transportadora parceira', transp: 'Rodo Expresso', dias: '3–6 dias úteis', base: 27.5, kg: 5.6 },
          ].map((o) => `
            <tr>
              <td class="tabela__nome">${esc(o.nome)}</td>
              <td>${esc(o.transp)}</td>
              <td>${esc(o.dias)}</td>
              <td class="forte">${moeda(o.base)}</td>
              <td>${moeda(o.kg)}</td>
              <td><span class="selo selo--ok">Ativo</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>`;
}

/* --------------------------------------------------------- configurações - */
function telaConfiguracoes() {
  definirTopo('Configurações', 'Dados da loja usados em todo o site.');
  return `
  <div class="aviso-demostrativo mb-4">
    ${icone('info', 15)}
    <span>Estes valores são os mesmos que aparecem no site. Nesta demonstração eles vêm do arquivo
    <strong>assets/js/dados.js</strong> — um lugar só para trocar nome, WhatsApp, endereço e regras.
    Na versão final, ficam no banco e são editáveis por esta tela.</span>
  </div>

  <div class="detalhe-admin">
    <div class="painel">
      <div class="painel__topo"><h2>Dados da loja</h2></div>
      <div class="painel__corpo">
        <div class="form-admin">
          <div class="campo col-6">
            <span class="campo__rotulo">Nome da loja</span>
            <input class="entrada" type="text" value="${esc(LOJA.nome)}">
            <span class="ajuda-campo">Nome temporário — troque quando a marca estiver definida.</span>
          </div>
          <div class="campo col-3">
            <span class="campo__rotulo">WhatsApp</span>
            <input class="entrada" type="text" value="${esc(LOJA.whatsappExibicao)}">
          </div>
          <div class="campo col-3">
            <span class="campo__rotulo">E-mail</span>
            <input class="entrada" type="text" value="${esc(LOJA.email)}">
          </div>
          <div class="campo col-4">
            <span class="campo__rotulo">Endereço</span>
            <input class="entrada" type="text" value="${esc(LOJA.endereco.rua)}">
          </div>
          <div class="campo col-2">
            <span class="campo__rotulo">Bairro</span>
            <input class="entrada" type="text" value="${esc(LOJA.endereco.bairro)}">
          </div>
          <div class="campo col-3">
            <span class="campo__rotulo">Cidade</span>
            <input class="entrada" type="text" value="${esc(LOJA.endereco.cidade)}">
          </div>
          <div class="campo col-1">
            <span class="campo__rotulo">UF</span>
            <input class="entrada" type="text" value="${esc(LOJA.endereco.estado)}" maxlength="2">
          </div>
          <div class="campo col-2">
            <span class="campo__rotulo">CEP</span>
            <input class="entrada" type="text" value="${esc(LOJA.endereco.cep)}">
          </div>
          <div class="campo col-6">
            <button class="btn" type="button" data-demo>${icone('check', 15)} Salvar alterações</button>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="painel mb-3">
        <div class="painel__topo"><h2>Regras comerciais</h2></div>
        <div class="painel__corpo">
          <div class="painel-dados__linha"><span class="rot">Frete grátis (PAC)</span><span class="val">acima de ${moeda(LOJA.freeShippingFrom)}</span></div>
          <div class="painel-dados__linha"><span class="rot">Desconto no Pix</span><span class="val">${Math.round(LOJA.pixDesconto * 100)}%</span></div>
          <div class="painel-dados__linha"><span class="rot">Parcelamento</span><span class="val">até ${LOJA.parcelas}x sem juros</span></div>
          <div class="painel-dados__linha"><span class="rot">Pagamento na retirada</span><span class="val">Sim</span></div>
        </div>
      </div>

      <div class="painel">
        <div class="painel__topo"><h2>Acessos do painel</h2></div>
        <div class="painel__corpo">
          <div class="painel-dados__linha"><span class="rot">Usuário da demonstração</span><span class="val forte">${esc(ADMIN_DEMO.usuario)}</span></div>
          <div class="painel-dados__linha"><span class="rot">Senha da demonstração</span><span class="val forte">${esc(ADMIN_DEMO.senha)}</span></div>
          <div class="mensagem mensagem--alerta mt-3">
            ${icone('alerta', 17)}
            <span>Estas credenciais são só para a apresentação. Na versão final: login no servidor,
            senha com criptografia e permissão por perfil (dono, balcão, estoque).</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
