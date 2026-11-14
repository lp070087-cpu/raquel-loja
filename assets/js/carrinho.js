/* ============================================================================
   CARRINHO / ESTADO — carrinho, favoritos, pedidos, moto e cliente
   ----------------------------------------------------------------------------
   Clientes autenticados usam carrinho e favoritos do servidor. O carrinho
   anônimo e a seleção de moto continuam disponíveis no navegador. Os métodos
   antigos de pedidos abaixo são exclusivos da demonstração administrativa;
   checkout e conta do cliente consultam a API.

   ---------------------------------------------------------------------------
   O QUE MUDA NA VERSÃO REAL  (leia antes de integrar)
   ---------------------------------------------------------------------------
   1) O PEDIDO passa a ser gravado no banco, não no navegador. Este arquivo
      vira uma camada fina sobre a API.
   2) O CÓDIGO DE RETIRADA passa a ser GERADO E VALIDADO NO SERVIDOR.
      Gerar no navegador (como aqui) é aceitável numa demonstração, nunca em
      produção: quem abre o console conseguiria forjar um código válido, e o
      código precisa ser único no banco (índice único) e ter validade.
      Ver `gerarCodigoRetirada()` abaixo, marcado como DEMONSTRAÇÃO.
   3) O TOTAL passa a ser CALCULADO NO SERVIDOR a partir dos preços do banco.
      Confiar no preço que vem do navegador é falha de segurança conhecida
      (o cliente pode alterar o preço antes de enviar).
   ============================================================================ */

import { PRODUTOS, CHAVES, LOJA, produtoPorId, ehUniversal } from './dados.js';
import { api } from './api.js';
import { comercio, inicializarComercio as iniciar, sincronizarConta as sincronizar, esquecerConta, aguardarSincronizacao } from './comercio-api.js';
export { esquecerConta, aguardarSincronizacao };
const confirmarMescla = {
  carrinho: () => gravar(CHAVES.carrinho, []),
  favorito: id => gravar(CHAVES.favoritos, ler(CHAVES.favoritos, []).filter(i => i !== id)),
};

export async function sincronizarConta() {
  const ok = await sincronizar(ler(CHAVES.carrinho, []), ler(CHAVES.favoritos, []), confirmarMescla);
  // Remove anonymous data only after a confirmed merge, so it cannot be merged twice.
  if (ok) {
    gravar(CHAVES.carrinho, []);
    gravar(CHAVES.favoritos, []);
  }
  return ok;
}
export async function inicializarComercio() {
  const ok = await iniciar(ler(CHAVES.carrinho, []), ler(CHAVES.favoritos, []), confirmarMescla);
  if (ok) { gravar(CHAVES.carrinho, []); gravar(CHAVES.favoritos, []); }
  return ok;
}
function salvarCarrinho(lista, id) {
  if (!comercio.autenticado()) return gravar(CHAVES.carrinho, lista);
  comercio.atualizarItens(lista);
  const quantity = lista.find(i => i.id === id)?.qtd || 0;
  comercio.enfileirar(() => api('/cart/items/' + encodeURIComponent(id), { method: 'PUT', body: { quantity } })).catch(() => {});
}

/* --------------------------------------------------------- armazenamento -- */
let memoria = {};
let temStorage = (() => {
  try {
    const k = '__teste__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
})();

function ler(chave, padrao) {
  try {
    const bruto = temStorage ? window.localStorage.getItem(chave) : memoria[chave];
    if (bruto == null) return padrao;
    return JSON.parse(bruto);
  } catch (e) {
    return padrao;
  }
}

function gravar(chave, valor) {
  const bruto = JSON.stringify(valor);
  if (temStorage) {
    try {
      window.localStorage.setItem(chave, bruto);
      return true;
    } catch (e) {
      temStorage = false; // cota estourou: segue só em memória
    }
  }
  memoria[chave] = bruto;
  return false;
}

export function armazenamentoDisponivel() {
  return temStorage;
}

/* ------------------------------------------------------------ carrinho ---- */
/* O carrinho guarda só {id, qtd}. O PREÇO nunca é guardado: ele é lido do
   catálogo toda vez. Assim, mudar o preço em dados.js muda o site inteiro,
   e não existe preço velho congelado num carrinho antigo. */
export const carrinho = {
  itens() {
    if (comercio.autenticado()) return comercio.itens();
    const lista = ler(CHAVES.carrinho, []);
    if (!Array.isArray(lista)) return [];
    // descarta item que não existe mais no catálogo
    return lista.filter((i) => i && produtoPorId(i.id) && Number(i.qtd) > 0);
  },

  adicionar(id, qtd = 1) {
    const produto = produtoPorId(id);
    if (!produto) return { ok: false, mensagem: 'Produto não encontrado.' };
    const n = Math.min(99, Math.max(1, Math.floor(Number(qtd) || 1)));
    if (Number(produto.estoque) <= 0) {
      return { ok: false, mensagem: 'Produto sem estoque no momento.' };
    }
    const lista = this.itens();
    const existente = lista.find((i) => i.id === id);
    if (existente) {
      const desejado = existente.qtd + n;
      const limite = Math.min(99, Number(produto.estoque));
      existente.qtd = Math.min(desejado, limite);
      salvarCarrinho(lista, id);
      return {
        ok: true,
        mensagem:
          desejado > limite
            ? `Só há ${limite} unidades em estoque. Ajustamos a quantidade.`
            : 'Quantidade atualizada no carrinho.',
      };
    }
    lista.push({ id, qtd: Math.min(n, Number(produto.estoque)) });
    salvarCarrinho(lista, id);
    return { ok: true, mensagem: `${produto.nome} foi adicionado ao carrinho.` };
  },

  alterarQtd(id, qtd) {
    const produto = produtoPorId(id);
    if (!produto) return { ok: false, mensagem: 'Produto não encontrado.' };
    const lista = this.itens();
    const item = lista.find((i) => i.id === id);
    if (!item) return { ok: false, mensagem: 'Item não está no carrinho.' };
    const limite = Math.min(99, Number(produto.estoque) || 0);
    let n = Math.floor(Number(qtd));
    if (!isFinite(n) || n < 1) n = 1;
    if (n > limite) {
      item.qtd = limite;
      salvarCarrinho(lista, id);
      return { ok: false, mensagem: `Só há ${limite} unidades em estoque.` };
    }
    item.qtd = n;
    salvarCarrinho(lista, id);
    return { ok: true };
  },

  remover(id) {
    salvarCarrinho(this.itens().filter((i) => i.id !== id), id);
    return { ok: true, mensagem: 'Item removido do carrinho.' };
  },

  limpar() {
    if (comercio.autenticado()) {
      const ids = this.itens().map(i => i.id);
      comercio.atualizarItens([]);
      ids.forEach(id => salvarCarrinho([], id));
      return;
    }
    gravar(CHAVES.carrinho, []);
  },

  quantidadeTotal() {
    return this.itens().reduce((s, i) => s + Number(i.qtd || 0), 0);
  },

  /* Itens enriquecidos com os dados do catálogo, já com subtotal. */
  detalhados() {
    return this.itens()
      .map((i) => {
        const p = produtoPorId(i.id) || { id: i.id, nome: 'Produto indisponível — remova do carrinho', preco: 0, estoque: 0 };
        const preco = Number(p.preco) || 0;
        const qtd = Number(i.qtd) || 0;
        return {
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          arte: p.arte,
          foto: p.foto || null,
          preco,
          qtd,
          subtotal: Math.round(preco * qtd * 100) / 100,
          estoque: Number(p.estoque) || 0,
          universal: !p.compat || p.compat.length === 0,
        };
      })
      .filter((i) => i.qtd > 0);
  },

  subtotal() {
    return Math.round(this.detalhados().reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  },

  pesoEstimado() {
    // peso simbólico por item, só para a simulação de frete
    return Math.max(1, this.quantidadeTotal()) * 0.8;
  },

  freteGratis() {
    return this.subtotal() >= Number(LOJA.freeShippingFrom);
  },
};

/* ----------------------------------------------------------- favoritos ---- */
export const favoritos = {
  lista() {
    if (comercio.autenticado()) return comercio.favoritos();
    const l = ler(CHAVES.favoritos, []);
    if (!Array.isArray(l)) return [];
    return l.filter((id) => !!produtoPorId(id));
  },
  ehFavorito(id) {
    return this.lista().indexOf(id) !== -1;
  },
  alternar(id) {
    const lista = this.lista();
    const i = lista.indexOf(id);
    if (i === -1) lista.push(id);
    else lista.splice(i, 1);
    if (comercio.autenticado()) {
      comercio.atualizarFavoritos(lista);
      comercio.enfileirar(() => api('/favorites/' + encodeURIComponent(id), { method: i === -1 ? 'POST' : 'DELETE' })).catch(() => {});
    } else gravar(CHAVES.favoritos, lista);
    return i === -1;
  },
  produtos() {
    return this.lista().map((id) => produtoPorId(id)).filter(Boolean);
  },
};

/* -------------------------------------------------------- moto do cliente -- */
/*
   Assinatura de "a moto mudou".
   Existe porque a compatibilidade pode mudar SEM trocar de tela — o
   localizador é um formulário em drawer. Sem este aviso, o checkout ficaria
   mostrando "compatibilidade não confirmada" depois de a cliente já ter
   escolhido a moto.

   É uma LISTA DE FUNÇÕES, e não um evento no `document`, de propósito:
   `CustomEvent` é do navegador e não existe em todo ambiente. A primeira
   versão usava um evento dentro de `try/catch` e o `catch` engolia a falha em
   silêncio — o aviso simplesmente não atualizava e nada acusava. Chamada
   direta não tem esse buraco.
*/
const assinantesMoto = [];

/** Registra um retorno chamado sempre que a moto ativa mudar. */
export function aoTrocarMoto(fn) {
  if (typeof fn === 'function' && assinantesMoto.indexOf(fn) === -1) {
    assinantesMoto.push(fn);
  }
  return fn;
}

function anunciarTrocaDeMoto(m) {
  assinantesMoto.forEach((fn) => {
    try { fn(m); } catch (e) { /* um assinante com erro não derruba os outros */ }
  });
}

export const moto = {
  ler() {
    const m = ler(CHAVES.moto, null);
    if (!m || !m.marca || !m.modelo) return null;
    return m;
  },
  /* Guarda marca, modelo, VERSÃO e ano.
     A versão precisa entrar aqui: sem ela, "CG 160 Fan 2024" virava só
     "CG 160 2024" e a compatibilidade que distingue Fan de Titan se perdia
     ao recarregar a página. Foi um defeito real. */
  /* Guarda marca, modelo, VERSÃO e ano.
     A versão precisa entrar aqui: sem ela, "CG 160 Fan 2024" virava só
     "CG 160 2024" e a compatibilidade que distingue Fan de Titan se perdia
     ao recarregar a página. Foi um defeito real. */
  salvar(m) {
    if (!m || !m.marca || !m.modelo) return null;
    const guardado = {
      marca: m.marca,
      modelo: m.modelo,
      versao: m.versao || null,
      ano: m.ano != null ? Number(m.ano) : null,
      cilindrada: m.cilindrada || '',
    };
    gravar(CHAVES.moto, guardado);
    anunciarTrocaDeMoto(guardado);
    return guardado;
  },
  limpar() {
    gravar(CHAVES.moto, null);
    anunciarTrocaDeMoto(null);
  },
};

/* ------------------------------------------------------- dados do cliente -- */
export const cliente = {
  ler() {
    return ler(CHAVES.cliente, null) || {};
  },
  salvar(c) {
    gravar(CHAVES.cliente, c || {});
    return c;
  },
};

/* ------------------------------------------------------------- pedidos ---- */
/*
   DEMONSTRAÇÃO: o pedido é gravado no navegador. Na versão real ele vai para
   o banco, e é o servidor que calcula totais e gera o código de retirada.
*/
const STATUS = {
  'aguardando-retirada': 'Aguardando retirada',
  'aguardando-envio': 'Aguardando envio',
  'em-transito': 'Em trânsito',
  'concluido': 'Concluído',
  cancelado: 'Cancelado',
};

export function nomeStatus(chave) {
  return STATUS[chave] || chave;
}

export function corStatus(chave) {
  if (chave === 'concluido') return 'selo--ok';
  if (chave === 'aguardando-retirada') return 'selo--alerta';
  if (chave === 'aguardando-envio') return 'selo--marinho';
  if (chave === 'cancelado') return 'selo--erro';
  return 'selo--neutro';
}

export const pedidos = {
  lista() {
    const l = ler(CHAVES.pedidos, []);
    return Array.isArray(l) ? l : [];
  },

  porId(id) {
    return this.lista().find((p) => p.id === id) || null;
  },

  gravar(pedido) {
    const l = this.lista();
    l.unshift(pedido);
    gravar(CHAVES.pedidos, l);
    return pedido;
  },

  atualizar(id, mudancas) {
    const l = this.lista();
    const i = l.findIndex((p) => p.id === id);
    if (i === -1) return null;
    l[i] = Object.assign({}, l[i], mudancas);
    gravar(CHAVES.pedidos, l);
    return l[i];
  },

  /* Marca no histórico quem mudou o quê — o admin mostra essa linha do tempo. */
  registrar(id, texto) {
    const p = this.porId(id);
    if (!p) return null;
    const hist = Array.isArray(p.historico) ? p.historico.slice() : [];
    hist.push({ em: new Date().toISOString(), texto });
    return this.atualizar(id, { historico: hist });
  },

  ultimoId() {
    return ler(CHAVES.ultimoPedido, null);
  },

  definirUltimoId(id) {
    gravar(CHAVES.ultimoPedido, id);
  },
};

/* ------------------------------------------------- código de retirada ----- */
/*
   DEMONSTRAÇÃO — gerado no navegador.
   NA VERSÃO REAL: gerado no servidor, único no banco, com validade e registro
   de quem validou e quando. Este bloco sai inteiro.
*/
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0 e 1 (confundem)
const DIGITOS = '123456789';

function sorteia(fonte, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += fonte.charAt(Math.floor(Math.random() * fonte.length));
  }
  return s;
}

/* Formato: 4 caracteres + "-" + 2 dígitos.  Ex.: R7K4-29 */
export function gerarCodigoRetirada() {
  return `${sorteia(ALFABETO, 4)}-${sorteia(DIGITOS, 2)}`;
}

/* Número do pedido: PED- + 5 dígitos, sem repetir o que já existe. */
export function gerarNumeroPedido() {
  const existentes = pedidos.lista().map((p) => p.id);
  let n;
  let tentativas = 0;
  do {
    n = 'PED-' + String(10000 + Math.floor(Math.random() * 89999));
    tentativas++;
  } while (existentes.indexOf(n) !== -1 && tentativas < 60);
  return n;
}

/* ------------------------------------------------------------ formatação -- */
export function formatarCodigo(v) {
  const limpo = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (limpo.length <= 4) return limpo;
  return `${limpo.slice(0, 4)}-${limpo.slice(4)}`;
}

/* Compara ignorando hífen, maiúscula e espaço. */
export function codigoConfere(digitado, correto) {
  const a = String(digitado || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const b = String(correto || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return a.length > 0 && a === b;
}

/* --------------------------------------------------- montar o pedido ------ */
export function montarPedido({
  tipo,
  dadosCliente,
  endereco,
  freteEscolhido,
  pagamento,
  desconto = 0,        /* valor do cupom, já calculado por quem chama */
  cupomCodigo = '',    /* só para registrar no pedido qual cupom foi usado */
}) {
  const itens = carrinho.detalhados();
  const subtotal = Math.round(itens.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  const entrega = tipo === 'entrega';
  const valorFrete = entrega && freteEscolhido ? Number(freteEscolhido.valor) || 0 : 0;
  /* O desconto nunca passa do subtotal: não existe pedido com total negativo. */
  const valorDesconto = Math.min(Math.max(0, Number(desconto) || 0), subtotal);
  const total = Math.round((subtotal - valorDesconto + valorFrete) * 100) / 100;

  const pedido = {
    id: gerarNumeroPedido(),
    criadoEm: new Date().toISOString(),
    tipo: entrega ? 'entrega' : 'retirada',
    cliente: {
      nome: dadosCliente.nome || '',
      telefone: dadosCliente.telefone || '',
      email: dadosCliente.email || '',
      cpf: dadosCliente.cpf || '',
    },
    itens,
    subtotal,
    desconto: valorDesconto,
    cupom: valorDesconto > 0 ? String(cupomCodigo || '').toUpperCase() : null,
    frete: valorFrete,
    total,
    pagamento: entrega
      ? (pagamento || 'A combinar com a loja')
      : 'Na retirada, no balcão',
    status: entrega ? 'aguardando-envio' : 'aguardando-retirada',
    codigoRetirada: entrega ? null : gerarCodigoRetirada(),
    codigoValidadoEm: null,
    entrega: entrega
      ? {
          endereco: endereco || null,
          transportadora: freteEscolhido ? freteEscolhido.transportadora : '',
          servico: freteEscolhido ? freteEscolhido.nome : '',
          prazo: freteEscolhido ? `${freteEscolhido.diasMin}–${freteEscolhido.diasMax} dias úteis` : '',
          demonstrativo: true,
        }
      : null,
    historico: [
      { em: new Date().toISOString(), texto: 'Pedido criado na loja online (apresentação).' },
    ],
    demonstrativo: true,
  };

  pedidos.gravar(pedido);
  pedidos.definirUltimoId(pedido.id);
  carrinho.limpar();
  return pedido;
}

/* Resumo usado em telas de admin (números que NÃO se recalculam da tela). */
export function resumoPedidos() {
  const lista = pedidos.lista();
  const hoje = new Date();
  const mesmoDia = (iso) => {
    const d = new Date(iso);
    return (
      d.getDate() === hoje.getDate() &&
      d.getMonth() === hoje.getMonth() &&
      d.getFullYear() === hoje.getFullYear()
    );
  };
  const deHoje = lista.filter((p) => mesmoDia(p.criadoEm));
  const faturamento = lista
    .filter((p) => p.status !== 'cancelado')
    .reduce((s, p) => s + (Number(p.total) || 0), 0);

  return {
    total: lista.length,
    hoje: deHoje.length,
    aguardandoRetirada: lista.filter((p) => p.status === 'aguardando-retirada').length,
    paraEnvio: lista.filter((p) => p.status === 'aguardando-envio' || p.status === 'em-transito').length,
    faturamento: Math.round(faturamento * 100) / 100,
    faturamentoHoje:
      Math.round(deHoje.reduce((s, p) => s + (Number(p.total) || 0), 0) * 100) / 100,
  };
}

/* --------------------------------------------------------------- busca ---- */
/* Procura por nome, marca, SKU, categoria e pela moto (ex.: "CG 160"). */
export function buscarProdutos(termo, lista) {
  const base = lista || PRODUTOS;
  const t = String(termo || '').trim().toLowerCase();
  if (!t) return base;
  const palavras = t.split(/\s+/).filter(Boolean);
  return base.filter((p) => {
    const alvo = [
      p.nome,
      p.marca,
      p.sku,
      p.categoria,
      p.descricao,
      (p.compat || []).map((c) => `${c.marca} ${c.modelo}`).join(' '),
      ehUniversal(p) ? 'universal' : '',
    ]
      .join(' ')
      .toLowerCase();
    return palavras.every((pal) => alvo.indexOf(pal) !== -1);
  });
}

export { PRODUTOS };
