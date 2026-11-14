import { api } from './api.js';

// Cookie HttpOnly identifies the customer. No identity or session is stored here.
let conta = false;
let fila = Promise.resolve();
let inicializacao;
let cesta = [];
let salvos = [];
let erroSincronizacao;
let geracao = 0;
let chaveMescla;
const CHAVE_MESCLA = 'raquel-anonymous-cart-merge';
function obterChaveMescla() {
  try { chaveMescla ||= window.localStorage.getItem(CHAVE_MESCLA); } catch { /* anonymous in-memory storage */ }
  chaveMescla ||= crypto.randomUUID();
  try { window.localStorage.setItem(CHAVE_MESCLA, chaveMescla); } catch { /* browser storage disabled */ }
  return chaveMescla;
}
const avisar = () => window.dispatchEvent(new CustomEvent('comerciochange'));
function falha(error) {
  window.dispatchEvent(new CustomEvent('comercioerro', { detail: { message: error.message || 'Não foi possível sincronizar com a loja.' } }));
  throw error;
}
function itensResposta(data) {
  return (Array.isArray(data) ? data : data.items || data.cart?.items || []).map(i => ({ id: i.productId || i.product?.id || i.id, qtd: i.quantity || i.qtd }));
}
function favoritosResposta(data) {
  return (Array.isArray(data) ? data : data.products || data.favorites || data.items || []).map(i => typeof i === 'string' ? i : i.productId || i.product?.id || i.id);
}
export const comercio = {
  autenticado: () => conta,
  itens: () => cesta.map(i => ({ ...i })),
  favoritos: () => [...salvos],
  atualizarItens(items) { cesta = items.map(i => ({ ...i })); avisar(); },
  atualizarFavoritos(items) { salvos = [...items]; avisar(); },
  enfileirar(fn) {
    const versao = geracao;
    const tarefa = fila.then(() => versao === geracao ? fn() : undefined).then(result => {
      if (versao === geracao) erroSincronizacao = null;
      return result;
    });
    // Keep the queue usable after a failed request, but surface that failure.
    fila = tarefa.catch(async error => {
      if (versao !== geracao) return;
      erroSincronizacao = error;
      try {
        const [cart, favorites] = await Promise.all([api('/cart'), api('/favorites')]);
        if (versao !== geracao) return;
        cesta = itensResposta(cart);
        salvos = favoritosResposta(favorites);
      } catch { /* keep pending visual state, block checkout */ }
      avisar();
      window.dispatchEvent(new CustomEvent('comercioerro', { detail: { message: error.message } }));
    });
    return tarefa;
  },
};
export async function aguardarSincronizacao() { await fila; if (erroSincronizacao) throw erroSincronizacao; }
export async function sincronizarConta(anonimos = [], favoritosAnonimos = [], confirmado = {}) {
  const versao = geracao;
  await api('/auth/me');
  if (versao !== geracao) return false;
  conta = true;
  if (anonimos.length) {
    await api('/cart/merge', { method: 'POST', body: { mergeKey: obterChaveMescla(), items: anonimos.map(i => ({ productId: i.id, quantity: i.qtd })) } });
    confirmado.carrinho?.();
    chaveMescla = undefined;
    try { window.localStorage.removeItem(CHAVE_MESCLA); } catch { /* browser storage disabled */ }
  }
  for (const id of favoritosAnonimos) {
    if (versao !== geracao) return false;
    await api('/favorites/' + encodeURIComponent(id), { method: 'POST' });
    confirmado.favorito?.(id);
  }
  const [cart, favorites] = await Promise.all([api('/cart'), api('/favorites')]);
  if (versao !== geracao) return false;
  cesta = itensResposta(cart);
  salvos = favoritosResposta(favorites);
  avisar();
  return true;
}
export function esquecerConta() { geracao++; erroSincronizacao = null; conta = false; cesta = []; salvos = []; inicializacao = undefined; avisar(); }
export function inicializarComercio(anonimos = [], favoritosAnonimos = [], confirmado = {}) {
  if (!inicializacao) inicializacao = sincronizarConta(anonimos, favoritosAnonimos, confirmado).catch(error => {
    if (error.status === 401) { esquecerConta(); return false; }
    return falha(error);
  });
  return inicializacao;
}
export async function obterPedido(id) { return api('/orders/' + encodeURIComponent(id)); }
export async function criarPedido(body) { await aguardarSincronizacao(); return api('/orders', { method: 'POST', body }); }
window.addEventListener('raquel:session-expired', esquecerConta);
