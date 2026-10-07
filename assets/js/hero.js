/* ============================================================================
   HERO — BANNER ANIMADO
   ----------------------------------------------------------------------------
   Matéria-prima: as 8 imagens de "public/imagem de referencia para animação do
   banner" (copiadas para public/banner/). São fotos de produto com splash de
   óleo — recortei o fundo branco em tempo de execução com CSS (mix-blend-mode),
   então o produto se apoia na forma amarela sem caixa branca em volta.

   Decisão técnica: animação em CSS + JS, NÃO em GIF.
   Motivo: GIF de produto em fundo branco fica pesado, serrilhado e não
   acompanha o tamanho da tela. Aqui é a própria foto real, nítida em qualquer
   resolução e em qualquer zoom, e o movimento respeita prefers-reduced-motion.

   O que se move:
     • a forma amarela orgânica no fundo (leve respiração);
     • o produto em destaque: entrada lateral, flutuação mínima e troca suave;
     • um brilho dourado girando devagar atrás do produto (profundidade);
     • o conjunto inteiro acompanha o mouse (parallax discreto);
     • a etiqueta de preço e o selo "em destaque" flutuam.
   ============================================================================ */

import { PRODUTOS, IMAGENS_BANNER, precoPix } from './dados.js';
import { icone, moeda, embaralhar, esc } from './utils.js';

export const INTERVALO_MS = 4200;
const PAUSA_APOS_MS = 40000;

/* ---------------------------------------------------------------- HTML ---- */
export function htmlHero() {
  /*
   Monta a lista do palco: usa as imagens do banner quando o produto tem uma
   delas; completa com fotos de produto para o palco nunca ficar com 1 item só
   (com 1 item não haveria troca, e a animação é o ponto desta seção).
  */
  const porImagem = new Map();
  PRODUTOS.forEach((p) => {
    if (IMAGENS_BANNER.indexOf(p.foto) !== -1) porImagem.set(p.foto, p);
  });

  let escolhidos = IMAGENS_BANNER.map((f) => porImagem.get(f)).filter(Boolean);

  if (escolhidos.length < 4) {
    const extras = PRODUTOS.filter(
      (p) => escolhidos.indexOf(p) === -1 && Number(p.estoque) > 0
    );
    escolhidos = escolhidos.concat(embaralhar(extras));
  }
  escolhidos = escolhidos.slice(0, 6);

  const itens = escolhidos
    .map(
      (p, i) => `
      <div class="palco__item${i === 0 ? ' palco__item--ativo' : ''}" data-indice="${i}"
           data-produto="${esc(p.id)}" aria-hidden="${i === 0 ? 'false' : 'true'}">
        <img src="${esc(p.foto)}" alt="${esc(p.nome)}" ${i === 0 ? '' : 'loading="lazy"'} decoding="async">
      </div>`
    )
    .join('');

  const pontos = escolhidos
    .map(
      (p, i) =>
        `<button class="palco__ponto" type="button" data-ir-para="${i}"
                 aria-current="${i === 0 ? 'true' : 'false'}"
                 aria-label="Ver ${esc(p.nome)}"></button>`
    )
    .join('');

  const primeiro = escolhidos[0] || PRODUTOS[0];

  return `
<section class="hero" aria-labelledby="titulo-hero">
  <div class="hero__formas" aria-hidden="true">
    <span class="hero__forma hero__forma--grande" data-parallax="0.015"></span>
    <span class="hero__forma hero__forma--media" data-parallax="0.028"></span>
    <span class="hero__forma hero__forma--pequena" data-parallax="0.04"></span>
  </div>

  <div class="container">
    <div class="hero__grade">

      <div class="hero__texto">
        <span class="hero__badge">${icone('moto', 15)} Tudo para sua moto</span>

        <h1 class="hero__titulo" id="titulo-hero">
          Sua moto pronta<br>
          <span class="hero__linha2">para <span class="destaque">qualquer caminho</span>.</span>
        </h1>

        <p class="hero__sub">
          Peças, acessórios e equipamentos para você cuidar da sua moto do seu jeito.
          Escolha a sua moto e veja só o que serve nela.
        </p>

        <div class="hero__ctas">
          <a class="btn btn--grande" href="localizador.html">
            ${icone('moto', 20)} Encontrar minha peça
          </a>
          <a class="btn btn--grande btn--contorno" href="catalogo.html">
            ${icone('ferramenta', 20)} Ver produtos
          </a>
        </div>

        <ul class="hero__beneficios">
          <li>${icone('check', 19)} Peça certa</li>
          <li>${icone('loja', 19)} Retirada rápida</li>
          <li>${icone('caminhao', 19)} Envio nacional</li>
          <li>${icone('cartao', 19)} Compra fácil</li>
        </ul>
      </div>

      <div class="palco" id="palco-hero" aria-label="Produtos em destaque">
        <span class="palco__area-amarela" aria-hidden="true"></span>
        <span class="palco__brilho" aria-hidden="true"></span>

        <div class="palco__itens" data-palco-itens>${itens}</div>

        <span class="palco__selo">
          <span class="palco__selo-ponto"></span> Em destaque
        </span>

        <a class="palco__etiqueta" href="produto.html?id=${encodeURIComponent(primeiro.id)}" data-palco-etiqueta>
          <span class="palco__etiqueta-simbolo">${icone('ferramenta', 20)}</span>
          <span class="palco__etiqueta-texto">
            <span class="palco__etiqueta-rotulo" data-palco-cat>${esc(primeiro.marca)}</span>
            <span class="palco__etiqueta-valor" data-palco-preco>${moeda(primeiro.preco)}</span>
          </span>
        </a>

        <div class="palco__pontos" role="tablist" aria-label="Escolher produto em destaque">${pontos}</div>
      </div>

    </div>
  </div>
</section>`;
}

/* -------------------------------------------------------------- ligar ---- */
export function ligarHero() {
  const palco = document.getElementById('palco-hero');
  if (!palco) return false;

  const itens = Array.prototype.slice.call(palco.querySelectorAll('.palco__item'));
  const pontos = Array.prototype.slice.call(palco.querySelectorAll('.palco__ponto'));
  const etiqueta = palco.querySelector('[data-palco-etiqueta]');
  const rotuloMarca = palco.querySelector('[data-palco-cat]');
  const rotuloPreco = palco.querySelector('[data-palco-preco]');
  if (itens.length < 2) return false;

  const produtos = itens.map((el) =>
    PRODUTOS.find((p) => p.id === el.getAttribute('data-produto')) || null
  );

  let atual = 0;
  let timer = null;
  let parado = false;
  let ultimaInteracao = Date.now();

  const reduzido =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mostrar(indice) {
    if (indice === atual) return;
    const anterior = atual;
    atual = indice;

    itens.forEach((el, i) => {
      el.classList.remove('palco__item--ativo', 'palco__item--saindo');
      if (i === indice) {
        el.classList.add('palco__item--ativo');
        el.setAttribute('aria-hidden', 'false');
      } else if (i === anterior) {
        el.classList.add('palco__item--saindo');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
    });

    pontos.forEach((pt, i) => pt.setAttribute('aria-current', i === indice ? 'true' : 'false'));

    const p = produtos[indice];
    if (p) {
      if (rotuloMarca) rotuloMarca.textContent = p.marca;
      if (rotuloPreco) rotuloPreco.textContent = moeda(p.preco);
      if (etiqueta) etiqueta.setAttribute('href', `produto.html?id=${encodeURIComponent(p.id)}`);
    }
  }

  function tocar() {
    if (reduzido || parado) return;
    parar();
    timer = setInterval(() => {
      if (Date.now() - ultimaInteracao > PAUSA_APOS_MS) { parar(); parado = true; return; }
      mostrar((atual + 1) % itens.length);
    }, INTERVALO_MS);
  }

  function parar() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function reiniciar() {
    ultimaInteracao = Date.now();
    parado = false;
    tocar();
  }

  palco.addEventListener('mouseenter', parar);
  palco.addEventListener('mouseleave', () => { if (!parado) tocar(); });

  pontos.forEach((pt, i) => {
    pt.addEventListener('click', () => { mostrar(i); reiniciar(); });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) parar();
    else if (!parado) tocar();
  });

  /* ---------------------------------------------------------- parallax --- */
  /* Movimento discreto, acompanhando o mouse. Desligado em tela pequena e
     para quem pediu menos movimento — não vale gastar em celular. */
  const comParallax = !reduzido && window.innerWidth > 900;
  if (comParallax) {
    const alvos = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    const palcoItens = palco.querySelector('.palco__itens');
    let alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;

    const animar = () => {
      x += (alvoX - x) * 0.08;
      y += (alvoY - y) * 0.08;
      alvos.forEach((el) => {
        const f = Number(el.getAttribute('data-parallax')) || 0.02;
        el.style.transform = `translate3d(${(-x * f * 100).toFixed(2)}px, ${(-y * f * 100).toFixed(2)}px, 0)`;
      });
      if (palcoItens) {
        palcoItens.style.transform = `translate3d(${(x * 10).toFixed(2)}px, ${(y * 8).toFixed(2)}px, 0)`;
      }
      if (Math.abs(alvoX - x) > 0.001 || Math.abs(alvoY - y) > 0.001) {
        requestAnimationFrame(animar);
      } else {
        rodando = false;
      }
    };

    const aoMover = (ev) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      alvoX = (ev.clientX - cx) / cx;
      alvoY = (ev.clientY - cy) / cy;
      if (!rodando) { rodando = true; requestAnimationFrame(animar); }
    };

    window.addEventListener('mousemove', aoMover, { passive: true });
  }

  tocar();
  return true;
}
