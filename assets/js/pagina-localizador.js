/* ============================================================================
   PÁGINA — LOCALIZADOR
   ----------------------------------------------------------------------------
   Mostra a lista de motos cobertas e as peças mais buscadas, para a cliente
   entender que existe catálogo de verdade por trás.
   ============================================================================ */

import { MARCAS, PRODUTOS, produtoServeEm, produtosDaCategoria } from './dados.js';
import { icone, esc, prepararRevelar, cascata } from './utils.js';
import { htmlLocalizador, ligarLocalizador } from './localizador.js';
import { cardProduto } from './componentes.js';
import { moto as motoStore } from './carrinho.js';

export function montarLocalizador() {
  const alvo = document.getElementById('localizador-container');
  if (alvo) {
    alvo.innerHTML = htmlLocalizador({ compacto: true });
    // os selects já vêm preenchidos com a moto guardada, se houver
    ligarLocalizador({ destino: 'catalogo' });
  }

  /* ------------------------------------------------- vantagens --------- */
  const vantagens = document.getElementById('vantagens');
  if (vantagens) {
    vantagens.innerHTML = [
      { i: 'escudo', t: 'Peça certa, sem tentativa', d: 'A compatibilidade é por marca, modelo e ano — a mesma informação que a loja usa no balcão.' },
      { i: 'catalogo', t: 'Peças e acessórios juntos', d: 'Peças mecânicas por moto e equipamento universal, tudo na mesma busca.' },
      { i: 'loja', t: 'Retira hoje ou recebe em casa', d: 'Reserve com código de retirada ou receba pela transportadora.' },
    ].map(
      (v) => `
      <div class="beneficio revelar">
        <span class="beneficio__icone">${icone(v.i === 'catalogo' ? 'ferramenta' : v.i, 25)}</span>
        <span><h3>${esc(v.t)}</h3><p>${esc(v.d)}</p></span>
      </div>`
    ).join('');
    cascata(vantagens, 70);
  }

  /* ---------------------------------------------- motos atendidas ------ */
  const alvoMotos = document.getElementById('motos-atendidas');
  if (alvoMotos) {
    alvoMotos.innerHTML = MARCAS.map((m) => {
      const total = m.modelos.length;
      return `
      <div class="painel-dados revelar">
        <h3>${esc(m.nome)} <span class="micro texto-3">${total} ${total === 1 ? 'modelo' : 'modelos'}</span></h3>
        <div class="etiquetas-moto">
          ${m.modelos
            .map((mo) => `<span class="etiqueta-moto"><strong>${esc(mo.nome)}</strong> ${mo.anos[0]}–${mo.anos[mo.anos.length - 1]}</span>`)
            .join('')}
        </div>
      </div>`;
    }).join('');
    cascata(alvoMotos, 40);
  }

  /* ------------------------------------------------ mais buscados ------ */
  const alvoPop = document.getElementById('grade-populares');
  if (alvoPop) {
    const moto = motoStore.ler();
    const populares = PRODUTOS.filter((p) => Number(p.estoque) > 0).slice(0, 8);
    alvoPop.innerHTML = `<div class="grade grade--4">${populares
      .map((p) => cardProduto(p, { moto }))
      .join('')}</div>`;
    cascata(alvoPop.firstElementChild, 50);
  }

  prepararRevelar();
}
