/* ============================================================================
   PÁGINA — HOME
   ----------------------------------------------------------------------------
   Monta cada seção da home a partir dos dados. A home não tem conteúdo cravado
   no HTML: o HTML dela é só a ordem das seções.
   ============================================================================ */

import { LOJA, CATEGORIAS, PRODUTOS, AVALIACOES, FAQ, produtosDaCategoria } from './dados.js';
import { icone, esc, $, moeda, prepararRevelar, cascata, temDesconto } from './utils.js';
import { htmlHero, ligarHero } from './hero.js';
import { htmlLocalizador, ligarLocalizador } from './localizador.js';
import {
  cardProduto, blocoFaq, cardAvaliacao, marqueeMarcas,
} from './componentes.js';
import { midiaProduto } from './artes.js';
import { moto as motoStore } from './carrinho.js';

export function montarHome() {
  const moto = motoStore.ler();

  /* ---------------------------------------------------------- 1. hero --- */
  const alvoHero = document.getElementById('hero');
  if (alvoHero) {
    alvoHero.innerHTML = htmlHero();
    ligarHero();
  }

  /* ------------------------------------------------- 2. faixa de marcas - */
  const alvoMarcas = document.getElementById('faixa-marcas');
  if (alvoMarcas) {
    alvoMarcas.innerHTML = marqueeMarcas([
      { nome: 'Honda' }, { nome: 'Yamaha' }, { nome: 'Suzuki' }, { nome: 'Kawasaki' },
      { nome: 'BMW' }, { nome: 'Dafra' }, { nome: 'Shineray' },
      { nome: 'Motul' }, { nome: 'Bosch' }, { nome: 'Pirelli' },
    ]);
  }

  /* ---------------------------------------------------- 3. localizador - */
  const alvoLocal = document.getElementById('localizador-container');
  if (alvoLocal) {
    alvoLocal.innerHTML = htmlLocalizador();
    ligarLocalizador({ destino: 'catalogo' });
  }

  /* ----------------------------------------------------- 4. categorias - */
  const alvoCategorias = document.getElementById('grade-categorias');
  if (alvoCategorias) {
    alvoCategorias.innerHTML = CATEGORIAS.map((c) => {
      const qtd = produtosDaCategoria(c.slug).length;
      return `
      <a class="categoria-card revelar" href="catalogo.html?categoria=${esc(c.slug)}">
        <span class="categoria-card__midia caixa-foto">${midiaProduto({ foto: c.foto, nome: c.nome })}</span>
        <span class="categoria-card__corpo">
          <span>
            <span class="categoria-card__nome">${esc(c.nome)}</span>
            <span class="categoria-card__qtd">${qtd} ${qtd === 1 ? 'produto' : 'produtos'}</span>
          </span>
          <span class="categoria-card__seta">${icone('seta', 18)}</span>
        </span>
      </a>`;
    }).join('');
    cascata(alvoCategorias, 55);
  }

  /* ----------------------------------------------------- 5. destaques --- */
  const alvoDestaques = document.getElementById('grade-destaques');
  if (alvoDestaques) {
    // os 8 com maior desconto e com estoque — é o que a loja quer empurrar
    const destaques = PRODUTOS.filter((p) => Number(p.estoque) > 0 && temDesconto(p))
      .sort((a, b) => (b.precoDe - b.preco) / b.precoDe - (a.precoDe - a.preco) / a.precoDe)
      .slice(0, 8);
    alvoDestaques.innerHTML = `<div class="grade grade--4">${destaques
      .map((p) => cardProduto(p, { moto }))
      .join('')}</div>`;
    cascata(alvoDestaques.firstElementChild, 60);
  }

  /* ---------------------------------------------------- 6. benefícios --- */
  const alvoBeneficios = document.getElementById('grade-beneficios');
  if (alvoBeneficios) {
    alvoBeneficios.innerHTML = [
      { icone: 'check', titulo: 'Peça certa', texto: 'Filtro por marca, modelo e ano. Menos troca e menos devolução.' },
      { icone: 'cartao', titulo: 'Compra fácil', texto: 'Carrinho direto, Pix com desconto e retirada sem fila.' },
      { icone: 'loja', titulo: 'Retirada rápida', texto: 'Peça reservada com código. Você paga no balcão, na hora de retirar.' },
      { icone: 'caminhao', titulo: 'Envio nacional', texto: 'Prazo e valor das transportadoras à vista antes de fechar.' },
    ].map(
      (b) => `
      <div class="beneficio revelar">
        <span class="beneficio__icone">${icone(b.icone, 25)}</span>
        <span>
          <h3>${esc(b.titulo)}</h3>
          <p>${esc(b.texto)}</p>
        </span>
      </div>`
    ).join('');
    cascata(alvoBeneficios, 70);
  }

  /* ------------------------------------------------ 7. banda escura ----- */
  /* Foto real do capacete de trilha: é o equipamento que a seção vende. */
  const alvoArteBanda = document.getElementById('arte-banda');
  if (alvoArteBanda) {
    alvoArteBanda.innerHTML =
      `<div class="banda-moto__foto">${midiaProduto({ foto: 'public/produtos/capacetes/capacete-04.jpg', nome: 'Capacete Off-Road' })}</div>`;
  }
  ['i1', 'i2', 'i3'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icone('check', 20);
  });

  /* -------------------------------------------- 8. foto do secundário --- */
  const alvoArteSec = document.getElementById('arte-secundaria');
  if (alvoArteSec) {
    alvoArteSec.innerHTML =
      `<div class="caixa-foto" style="aspect-ratio:4/3;border-radius:var(--raio-g);border:1px solid var(--borda)">${
        midiaProduto({ foto: 'public/banner/banner-02.jpg', nome: 'Óleo para moto em destaque' })
      }</div>`;
  }

  /* -------------------------------------------------- 9. avaliações ---- */
  const alvoAval = document.getElementById('grade-avaliacoes');
  if (alvoAval) {
    alvoAval.innerHTML = AVALIACOES.slice(0, 6).map(cardAvaliacao).join('');
    cascata(alvoAval, 60);
  }

  /* --------------------------------------------------------- 10. FAQ ---- */
  const alvoFaq = document.getElementById('bloco-faq');
  if (alvoFaq) alvoFaq.innerHTML = blocoFaq(FAQ);

  /* ---------------------------------------------------- 11. contato ----- */
  const alvoContato = document.getElementById('lista-contato');
  if (alvoContato) {
    alvoContato.innerHTML = `
      <div class="contato-card__item">${icone('telefone', 22)}
        <span><strong>WhatsApp</strong><span>${esc(LOJA.whatsappExibicao)}</span></span></div>
      <div class="contato-card__item">${icone('email', 22)}
        <span><strong>E-mail</strong><span>${esc(LOJA.email)}</span></span></div>
      <div class="contato-card__item">${icone('local', 22)}
        <span><strong>Endereço</strong><span>${esc(LOJA.endereco.rua)} — ${esc(LOJA.endereco.bairro)}, ${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></span></div>
      <div class="contato-card__item">${icone('relogio', 22)}
        <span><strong>Horário</strong><span>${LOJA.horario.map((h) => `${esc(h.dia)}: ${esc(h.hora)}`).join('<br>')}</span></span></div>`;
  }

  const btnWhats = document.getElementById('btn-whats');
  if (btnWhats) btnWhats.setAttribute('href', `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent('Olá! Quero confirmar uma peça para minha moto.')}`);

  const alvoEndereco = document.getElementById('texto-endereco');
  if (alvoEndereco) {
    alvoEndereco.textContent = `${LOJA.endereco.rua}, ${LOJA.endereco.bairro} — ${LOJA.endereco.cidade}/${LOJA.endereco.estado} · CEP ${LOJA.endereco.cep}`;
  }

  /* mapa ilustrado (não é mapa real — é um desenho que indica o endereço) */
  const alvoMapa = document.getElementById('mapa-falso');
  if (alvoMapa) alvoMapa.innerHTML = mapaIlustrado();

  /* setas dos links */
  const setaCat = document.getElementById('seta-cat');
  if (setaCat) setaCat.innerHTML = icone('seta', 18);
  const setaDest = document.getElementById('seta-dest');
  if (setaDest) setaDest.innerHTML = icone('seta', 18);

  /* revelar ao rolar (por último: o DOM já está pronto) */
  prepararRevelar();
}

/* --------------------------------------------------------------- mapa ---- */
/* Desenho simples de mapa, só para localizar a loja na apresentação. */
function mapaIlustrado() {
  return `<svg viewBox="0 0 400 250" role="img" aria-label="Mapa ilustrado da região da loja" style="width:100%;height:100%;display:block">
    <rect width="400" height="250" fill="#EDF1F6"/>
    <path d="M0 168 h400" stroke="#D8DEE8" stroke-width="26"/>
    <path d="M0 168 h400" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"/>
    <path d="M118 0 v250" stroke="#D8DEE8" stroke-width="20"/>
    <path d="M118 0 v250" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"/>
    <path d="M278 0 v250" stroke="#E2E8F0" stroke-width="14"/>
    <g fill="#DCE3EC">
      <rect x="140" y="40" width="60" height="46" rx="5"/>
      <rect x="216" y="40" width="46" height="46" rx="5"/>
      <rect x="140" y="192" width="72" height="40" rx="5"/>
      <rect x="230" y="196" width="52" height="36" rx="5"/>
      <rect x="24" y="52" width="66" height="42" rx="5"/>
      <rect x="24" y="200" width="66" height="34" rx="5"/>
      <rect x="300" y="52" width="72" height="42" rx="5"/>
      <rect x="300" y="200" width="72" height="34" rx="5"/>
    </g>
    <path d="M40 226 q60 -30 120 -20" stroke="#C9D3E0" stroke-width="4" fill="none"/>
    <g transform="translate(196,116)">
      <path d="M0 0a26 26 0 1 1 0.1 0z" fill="#FFD200" stroke="#0B1526" stroke-width="4"/>
      <circle cx="0" cy="0" r="9" fill="#0B1526"/>
      <path d="M0 26 v22" stroke="#0B1526" stroke-width="4"/>
    </g>
  </svg>`;
}
