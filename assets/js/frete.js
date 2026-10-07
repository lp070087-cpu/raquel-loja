/* ============================================================================
   FRETE — SIMULAÇÃO
   ----------------------------------------------------------------------------
   ATENÇÃO: aqui NÃO existe integração com os Correios nem com o Melhor Envio.
   O valor é calculado localmente, a partir de uma tabela em dados.js, só para
   a apresentação ter o que mostrar. Toda tela que exibe esse valor escreve
   "valores demonstrativos".

   ---------------------------------------------------------------------------
   COMO TROCAR PELA API DO MELHOR ENVIO (na versão real)
   ---------------------------------------------------------------------------
   Esta é a única função a reescrever: `calcularFrete()`.

       1) A chamada de verdade acontece no SERVIDOR, nunca aqui. O token do
          Melhor Envio não pode chegar ao navegador.
       2) O servidor calcula o frete a partir do CEP de origem (o da loja) e do
          CEP de destino, mais peso, medidas e valor segurado de cada item.
       3) `calcularFrete()` passa a ser assíncrona:

             export async function calcularFrete(cep, itens) {
               const r = await fetch('/api/frete', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ cep, itens }),
               });
               if (!r.ok) throw new Error('Falha ao calcular o frete');
               return await r.json();
             }

       4) Quem chama já precisa lidar com espera e erro. É por isso que esta
          função devolve uma Promessa desde já, mesmo resolvendo na hora —
          trocar o corpo depois não obriga a mexer nas telas.
       5) Sem CEP válido o Melhor Envio devolve erro. A validação de formato
          abaixo continua útil, mas a resposta final é do servidor.

   A loja precisa do CEP de origem preenchido em dados.js (LOJA.endereco.cep).
   ============================================================================ */

import { LOJA, OPCOES_FRETE_DEMO } from './dados.js';
import { cepValido } from './utils.js';

/* Zona de CEP: quanto mais longe do CEP da loja, maior o fator.
   É um cálculo grosseiro de propósito — serve para a demonstração ter
   variação realista entre um CEP perto e um CEP do outro estado. */
function fatorDistancia(cep) {
  const d = String(cep || '').replace(/\D/g, '');
  if (d.length !== 8) return 1;
  const regiao = Number(d.charAt(0)); // 1º dígito = região dos Correios

  // CEP da loja (Recife/PE começa com 5)
  const origem = Number(String(LOJA.endereco.cep).replace(/\D/g, '').charAt(0)) || 5;
  const salto = Math.abs(regiao - origem);

  if (salto === 0) return 1;      // mesma região
  if (salto === 1) return 1.25;
  if (salto === 2) return 1.6;
  if (salto === 3) return 1.95;
  return 2.3;                     // Norte/Nordeste -> Sul/Sudeste distante etc.
}

/* Acréscimo de prazo conforme a distância (dias). */
function diasExtras(cep) {
  const f = fatorDistancia(cep);
  if (f <= 1) return 0;
  if (f <= 1.25) return 1;
  if (f <= 1.6) return 2;
  if (f <= 1.95) return 4;
  return 6;
}

function arredondar(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Calcula as opções de frete para um CEP.
 * DEMONSTRAÇÃO: resolve localmente, sem rede.
 * @param {string} cep
 * @param {{peso?: number, subtotal?: number}} dados
 * @returns {Promise<Array>} opções com {id, nome, transportadora, diasMin, diasMax, valor, gratis}
 */
export function calcularFrete(cep, dados) {
  const info = dados || {};
  return new Promise((resolve, reject) => {
    if (!cepValido(cep)) {
      reject(new Error('Informe um CEP válido com 8 dígitos.'));
      return;
    }

    const fator = fatorDistancia(cep);
    const extra = diasExtras(cep);
    const peso = Math.max(0.5, Number(info.peso) || 1);
    const subtotal = Number(info.subtotal) || 0;
    /* Frete grátis só para PAC e quando o pedido passa do valor definido
       em dados.js (LOJA.freeShippingFrom). Na versão real, essa regra é da
       loja e pode ser aplicada também no servidor. */
    const valeFreteGratis = subtotal >= Number(LOJA.freeShippingFrom);

    const opcoes = OPCOES_FRETE_DEMO.map((o) => {
      const bruto = (o.base + o.porKg * peso) * fator;
      const gratis = valeFreteGratis && o.id === 'pac';
      return {
        id: o.id,
        nome: o.nome,
        transportadora: o.transportadora,
        diasMin: o.diasMin + extra,
        diasMax: o.diasMax + extra,
        valor: gratis ? 0 : arredondar(bruto),
        gratis,
        demonstrativo: true,
      };
    });

    resolve(opcoes);
  });
}

/* Prazo em texto pronto para a tela. */
export function prazoTexto(opcao) {
  if (!opcao) return '';
  return `${opcao.diasMin}–${opcao.diasMax} dias úteis`;
}

/* Texto do valor, já tratando o frete grátis. */
export function valorTexto(opcao, moeda) {
  if (!opcao) return '';
  if (opcao.gratis || Number(opcao.valor) === 0) return 'Grátis';
  return moeda ? moeda(opcao.valor) : String(opcao.valor);
}
