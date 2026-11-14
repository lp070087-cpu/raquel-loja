/* ============================================================================
   CUPOM — desconto demonstrativo
   ----------------------------------------------------------------------------
   Guarda o cupom aceito no carrinho e calcula o quanto ele tira do pedido.

   DEMONSTRAÇÃO. A lista de cupons está em dados.js, visível no código, e a
   conferência acontece no navegador. Em produção: o cupom vive no banco, com
   validade, limite de uso por cliente e por CPF, restrição por produto ou
   categoria, e a validação é do servidor — quem abre o console não pode forjar
   um desconto. Aqui isso é aceitável porque não existe dinheiro de verdade.

   Regra que vale mesmo na demonstração: o desconto nunca passa do subtotal
   (não existe pedido com total negativo).
   ============================================================================ */

import { CUPONS } from './dados.js';
import { carrinho } from './carrinho.js';
import { api } from './api.js';
import { comercio, aguardarSincronizacao } from './comercio-api.js';
let validadoServidor = null;
export async function aplicarSeguro(codigo) {
  const limpo = String(codigo || '').trim().toUpperCase();
  if (!comercio.autenticado()) return { ok: false, mensagem: 'Entre na sua conta para validar um cupom.' };
  try {
    await aguardarSincronizacao();
    const resposta = await api('/coupons/validate', { method: 'POST', body: { code: limpo } });
    validadoServidor = { cupom: { codigo: limpo }, desconto: resposta.discountCents / 100, subtotal: carrinho.subtotal() };
    guardar(limpo);
    return { ok: true, mensagem: `Cupom ${limpo} validado pela loja.`, ...validadoServidor };
  } catch (error) {
    validadoServidor = null;
    return { ok: false, mensagem: error.message };
  }
}
export async function revalidarSeguro() {
  const codigo = codigoSalvo();
  return codigo ? aplicarSeguro(codigo) : null;
}

const CHAVE = 'motopecas-cupom';

/* ------------------------------------------------------------- storage --- */
function guardar(codigo) {
  try { window.localStorage.setItem(CHAVE, codigo || ''); } catch (e) { /* segue */ }
}

export function codigoSalvo() {
  try { return window.localStorage.getItem(CHAVE) || ''; } catch (e) { return ''; }
}

export function limpar() {
  validadoServidor = null;
  guardar('');
}

/* ------------------------------------------------------------ validar ---- */
/**
 * Confere o código contra a lista demonstrativa.
 * @returns {{ok:boolean, mensagem:string, cupom?:object, desconto?:number}}
 */
export function aplicar(codigo) {
  const limpo = String(codigo || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!limpo) return { ok: false, mensagem: 'Digite o código do cupom.' };

  const cupom = CUPONS.find((c) => c.codigo === limpo);
  if (!cupom) {
    return { ok: false, mensagem: `O cupom "${limpo}" não existe ou expirou.` };
  }

  const subtotal = carrinho.subtotal();
  if (subtotal < cupom.minimo) {
    return {
      ok: false,
      mensagem: `Este cupom vale a partir de ${cupom.minimo.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL',
      })} em produtos.`,
    };
  }

  guardar(cupom.codigo);
  return {
    ok: true,
    cupom,
    desconto: descontoDe(cupom, subtotal),
    mensagem: `Cupom ${cupom.codigo} aplicado — ${cupom.rotulo}.`,
  };
}

/* ------------------------------------------------------------ calcular --- */
/* Desconto em reais, arredondado em centavos e nunca maior que o subtotal. */
export function descontoDe(cupom, subtotal) {
  if (!cupom) return 0;
  const base = Number(subtotal) || 0;
  const bruto = cupom.tipo === 'percentual' ? base * cupom.valor : Number(cupom.valor) || 0;
  const centavos = Math.min(Math.round(bruto * 100), Math.round(base * 100));
  return Math.max(0, centavos) / 100;
}

/**
 * Cupom aceito agora, já reconferido contra o subtotal atual.
 * Se o carrinho diminuiu e deixou de atingir o mínimo, o cupom sai sozinho —
 * é o que evita um desconto preso de um carrinho que não existe mais.
 */
export function atual() {
  if (comercio.autenticado()) return validadoServidor?.subtotal === carrinho.subtotal() ? validadoServidor : null;
  const codigo = codigoSalvo();
  if (!codigo) return null;
  const cupom = CUPONS.find((c) => c.codigo === codigo);
  if (!cupom) { limpar(); return null; }

  const subtotal = carrinho.subtotal();
  if (subtotal < cupom.minimo) return null;

  return { cupom, desconto: descontoDe(cupom, subtotal) };
}

/* Reaplica o cupom salvo quando o carrinho muda de valor. */
export function revalidar() {
  const a = atual();
  if (!a) guardar('');
  return a;
}
