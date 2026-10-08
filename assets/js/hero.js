/* ============================================================================
   HERO — BANNER ANIMADO
   ----------------------------------------------------------------------------
   Matéria-prima: as 8 imagens de "public/imagem de referencia para animação do
   banner" (em public/banner/). São fotos de produto com splash de óleo.

   ALTURA CONTROLADA. A referência usa `min-height: 100vh`, mas lá o herói é a
   única coisa na primeira dobra. Aqui o que vem depois é um catálogo — herói de
   tela cheia empurra tudo para baixo sem necessidade. A proporção vem de um
   teto em `px` (ver .palco--hero em art.css), não de `vh`.

   O texto e a imagem formam UMA composição: os dois lados nascem alinhados
   pela mesma linha de base do grid, com o texto ancorado à esquerda e o palco
   ocupando a coluna direita — nada de imagem solta flutuando na página.

   Movimento (discreto, em camadas):
     • entrada escalonada do texto (5 degraus de 90 ms);
     • produto entra de lado, troca a cada 4,2 s, flutua 8 px;
     • brilho girando devagar atrás do produto (profundidade);
     • formas amarelas com parallax de mouse;
     • para sozinho depois de 40 s sem interação e quando a aba perde o foco.
   ============================================================================ */

import { PRODUTOS, IMAGENS_BANNER, precoPix } from './dados.js';
import { icone, moeda, embaralhar, esc } from './utils.js';

export const INTERVALO_MS = 4200;
const PAUSA_APOS_MS = 40000;

/* ---------------------------------------------------------------- HTML ---- */
export function htmlHero() {
  /* Prioriza as imagens do banner (produto + splash). Completa com fotos de
     produto se faltar, para o palco nunca ficar com 1 item — com 1 item não
     existe troca, e a troca é o ponto desta seção. */
  const porImagem = new Map();
  PRODUTOS.forEach((p) => { if (IMAGENS_BANNER.indexOf(p.foto) !== -1) porImagem.set(p.foto, p); });

  let escolhidos = IMAGENS_BANNER.map((f) => porImagem.get(f)).filter(Boolean);
  if (escolhidos.length < 4) {
    const extras = PRODUTOS.filter((p) => escolhidos.indexOf(p) === -1 && Number(p.estoque) > 0);
    escolhidos = escolhidos.concat(embaralhar(extras));
  }
  escolhidos = escolhidos.slice(0, 6);

  const itens = escolhidos.map((p, i) => `
    <div class="palco__item${i === 0 ? ' palco__item--ativo' : ''}" data-indice="${i}"
         data-produto="${esc(p.id)}" aria-hidden="${i === 0 ? 'false' : 'true'}">
      <img src="${esc(p.foto)}" alt="${esc(p.nome)}" ${i === 0 ? '' : 'loading="lazy"'} decoding="async">
    </div>`).join('');

  const pontos = escolhidos.map((p, i) => `
    <button class="palco__ponto" type="button" data-ir-para="${i}"
            aria-current="${i === 0 ? 'true' : 'false'}"
            aria-label="Ver ${esc(p.nome)}"></button>`).join('');

  const primeiro = escolhidos[0] || PRODUTOS[0];

  return `
<section class="hero" aria-labelledby="titulo-hero">
  <div class="hero__formas" aria-hidden="true">
    <span class="hero__forma hero__forma--grande" data-parallax="0.016"></span>
    <span class="hero__forma hero__forma--media" data-parallax="0.03"></span>
    <span class="hero__forma hero__forma--pequena" data-parallax="0.042"></span>
  </div>

  <div class="container">
    <div class="hero__grade">

      <div class="hero__texto">
        <span class="hero__badge hero__entra hero__entra--1">${icone('moto', 14)} Tudo para sua moto</span>

        <h1 class="hero__titulo hero__entra hero__entra--2" id="titulo-hero">
          Sua moto pronta<br>para <span class="destaque">qualquer caminho</span>.
        </h1>

        <p class="hero__sub hero__entra hero__entra--3">
          Peças, acessórios e equipamentos para você cuidar da sua moto do seu jeito.
          Escolha a sua moto e veja só o que serve nela.
        </p>

        <div class="hero__ctas hero__entra hero__entra--4">
          <a class="btn btn--grande btn--brilho" href="localizador.html">
            ${icone('moto', 19)} Encontrar minha peça
          </a>
          <a class="btn btn--grande btn--contorno" href="catalogo.html">
            ${icone('ferramenta', 19)} Ver produtos
          </a>
        </div>

        <ul class="hero__beneficios hero__entra hero__entra--5">
          <li>${icone('check', 18)} Peça certa</li>
          <li>${icone('loja', 18)} Retirada rápida</li>
          <li>${icone('caminhao', 18)} Envio nacional</li>
          <li>${icone('cartao', 18)} Compra fácil</li>
        </ul>
      </div>

      <div class="palco palco--hero hero__entra hero__entra--3" id="palco-hero" aria-label="Produtos em destaque">
        <span class="palco__area-amarela" aria-hidden="true"></span>
        <span class="palco__brilho" aria-hidden="true"></span>

        <div class="palco__itens" data-palco-itens>${itens}</div>

        <span class="palco__selo"><span class="palco__selo-ponto"></span> Em destaque</span>

        <a class="palco__etiqueta" href="produto.html?id=${encodeURIComponent(primeiro.id)}" data-palco-etiqueta>
          <span class="palco__etiqueta-simbolo">${icone('ferramenta', 18)}</span>
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

  const produtos = itens.map((el) => PRODUTOS.find((p) => p.id === el.getAttribute('data-produto')) || null);

  let atual = 0;
  let timer = null;
  let parado = false;
  let ultimaInteracao = Date.now();

  const reduzido = typeof window.matchMedia === 'function' &&
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

  function parar() { if (timer) { clearInterval(timer); timer = null; } }
  function reiniciar() { ultimaInteracao = Date.now(); parado = false; tocar(); }

  palco.addEventListener('mouseenter', parar);
  palco.addEventListener('mouseleave', () => { if (!parado) tocar(); });
  pontos.forEach((pt, i) => pt.addEventListener('click', () => { mostrar(i); reiniciar(); }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) parar(); else if (!parado) tocar();
  });

  /* ---------------------------------------------------------- parallax --- */
  /* Desligado em tela pequena e para quem pediu menos movimento. */
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
        palcoItens.style.transform = `translate3d(${(x * 9).toFixed(2)}px, ${(y * 7).toFixed(2)}px, 0)`;
      }
      if (Math.abs(alvoX - x) > 0.001 || Math.abs(alvoY - y) > 0.001) requestAnimationFrame(animar);
      else rodando = false;
    };

    window.addEventListener('mousemove', (ev) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      alvoX = (ev.clientX - cx) / cx;
      alvoY = (ev.clientY - cy) / cy;
      if (!rodando) { rodando = true; requestAnimationFrame(animar); }
    }, { passive: true });
  }

  tocar();
  return true;
}
