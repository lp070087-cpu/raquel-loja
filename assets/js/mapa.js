/* ============================================================================
   MAPA — mapa REAL, interativo, do endereço demonstrativo
   ----------------------------------------------------------------------------
   O mapa é de verdade: OpenStreetMap desenhado pelo Leaflet. Dá para arrastar,
   dar zoom, e abrir a rota.

   DE ONDE VEM O PONTO (leia — é a decisão mais importante deste arquivo):
   o marcador NÃO está cravado no código. Não há latitude/longitude fixa aqui
   porque não foi possível CONFIRMAR a coordenada do endereço no ambiente onde
   o site foi montado — o serviço de geocodificação não é acessível de lá.
   Inventar um número colocaria o pino na casa errada, e isso é pior do que
   dizer que não deu.

   Então o site PERGUNTA a posição ao serviço oficial do OpenStreetMap
   (Nominatim) na hora, do navegador de quem abre a página, e usa a resposta.

   O QUE ACONTECE SE A CONSULTA FALHAR (sem internet, serviço fora do ar):
   o mapa abre centrado na região, SEM marcador da loja, com um aviso visível
   de que a posição exata não pôde ser carregada, e os botões de Google Maps
   continuam funcionando — porque eles buscam pelo ENDEREÇO em texto, não por
   coordenada. Nunca posicionamos o pino em chute sem avisar.

   NA VERSÃO FINAL: geocodificar uma vez no servidor, gravar lat/lon no banco e
   desenhar o marcador com o valor gravado — aí sim há coordenada confirmada e
   nenhuma chamada externa por visita.
   ============================================================================ */

import { LOJA, MAPA, enderecoEmLinha } from './dados.js';
import { esc, icone } from './utils.js';

/* -------------------------------------------------------------- endereço -- */
export function enderecoTexto(l) {
  return enderecoEmLinha(l);
}

/* Links que NÃO dependem de coordenada: buscam pelo endereço escrito.
   É por isso que o "sem internet" ainda consegue mandar o cliente ao lugar. */
export function linkGoogleMaps(l) {
  return 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(enderecoTexto(l));
}

export function linkComoChegar(l) {
  /* Só o destino. O Google usa a localização de quem clica como origem. */
  return 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(enderecoTexto(l));
}

export function linkWaze(l) {
  return 'https://waze.com/ul?q=' + encodeURIComponent(enderecoTexto(l)) + '&navigate=yes';
}

/* --------------------------------------------------------- guardar ponto -- */
/* Guarda a resposta do geocodificador para não repetir a consulta a cada
   visita — é o que a política de uso do serviço pede. Se o endereço mudar em
   dados.js, a chave muda e a consulta é refeita sozinha. */
const CHAVE_CACHE = 'motopecas-geo-' + MAPA.consulta.length + '-' + simples(MAPA.consulta);
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

function simples(s) {
  let h = 0;
  const t = String(s);
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function lerCache() {
  try {
    const bruto = window.localStorage.getItem(CHAVE_CACHE);
    if (!bruto) return null;
    const d = JSON.parse(bruto);
    if (!d || !d.lat || !d.lon) return null;
    if (Date.now() - Number(d.em || 0) > VALIDADE_MS) return null;
    return d;
  } catch (e) { return null; }
}

function gravarCache(lat, lon, rotulo) {
  try {
    window.localStorage.setItem(CHAVE_CACHE, JSON.stringify({ lat, lon, rotulo, em: Date.now() }));
  } catch (e) { /* sem armazenamento: segue sem cache */ }
}

/* -------------------------------------------------- geocodificar (runtime) - */
/* Devolve { lat, lon, rotulo } ou null. Nunca inventa: se não vier, é null. */
export async function geocodificar(consulta) {
  const guardado = lerCache();
  if (guardado) return guardado;

  const url = 'https://nominatim.openstreetmap.org/search' +
    '?format=jsonv2&limit=1&countrycodes=br&addressdetails=1' +
    '&q=' + encodeURIComponent(consulta || MAPA.consulta);

  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      /* não trava a página se o serviço demorar */
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout
        ? AbortSignal.timeout(9000) : undefined,
    });
  } catch (e) {
    return null;                     /* sem rede ou serviço fora do ar */
  }
  if (!resposta || !resposta.ok) return null;

  let lista;
  try { lista = await resposta.json(); } catch (e) { return null; }
  if (!Array.isArray(lista) || !lista.length) return null;

  const lat = Number(lista[0].lat);
  const lon = Number(lista[0].lon);
  if (!isFinite(lat) || !isFinite(lon)) return null;

  const d = { lat, lon, rotulo: String(lista[0].display_name || '').slice(0, 200) };
  gravarCache(d.lat, d.lon, d.rotulo);
  return d;
}

/* ------------------------------------------------------------- Leaflet ---- */
/*
   Três endereços, tentados em ordem. Um CDN fora do ar não pode derrubar o
   mapa: se o primeiro falhar, o próximo assume. O CSS vem do mesmo lugar que
   o JS, para a aparência não misturar versões.
*/
const CDNS = [
  'https://unpkg.com/leaflet@1.9.4/dist/',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/',
];

let carregando = null;

function tentarCdn(base) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = base + 'leaflet.css';
      css.crossOrigin = '';
      css.setAttribute('data-leaflet', '');
      document.head.appendChild(css);
    }
    const js = document.createElement('script');
    js.src = base + 'leaflet.js';
    js.crossOrigin = '';
    js.async = true;
    js.onload = () => (window.L && window.L.map)
      ? resolve(window.L)
      : reject(new Error('Leaflet não inicializou.'));
    js.onerror = () => reject(new Error('CDN indisponível.'));
    document.head.appendChild(js);
  });
}

/* Carrega o Leaflet (CSS + JS) só quando a página realmente tem mapa.
   Assim as outras telas não pagam o custo de baixar a biblioteca. */
export function carregarLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (carregando) return carregando;

  carregando = CDNS.reduce(
    (cadeia, base) => cadeia.catch(() => tentarCdn(base)),
    Promise.reject(new Error('início'))
  ).catch(() => {
    carregando = null;                 /* permite tentar de novo depois */
    throw new Error('Não foi possível baixar o mapa (sem internet?).');
  });

  return carregando;
}

/* --------------------------------------------------------------- desenho -- */
/**
 * Monta o mapa dentro do elemento.
 * @param {HTMLElement} alvo  o card do mapa
 * @param {object} opcoes     { altura, nivel }
 */
export async function montarMapa(alvo, opcoes = {}) {
  if (!alvo) return null;
  const l = LOJA;

  /* Esqueleto: o card mantém o formato aprovado e já mostra os botões,
     que são links — funcionam mesmo se o mapa não carregar. */
  alvo.classList.add('mapa');
  alvo.setAttribute('role', 'region');
  alvo.setAttribute('aria-label', 'Mapa do endereço de retirada');
  alvo.innerHTML = `
    <div class="mapa__tela" id="${alvo.id || 'mapa'}-tela"></div>
    <div class="mapa__aviso" hidden></div>
    <div class="mapa__acoes">
      <a class="btn btn--pequeno" href="${esc(linkComoChegar(l))}" target="_blank" rel="noopener">
        ${icone('local', 15)} Como chegar
      </a>
      <a class="btn btn--pequeno btn--contorno" href="${esc(linkGoogleMaps(l))}" target="_blank" rel="noopener">
        ${icone('olho', 15)} Abrir no Google Maps
      </a>
      <a class="btn btn--pequeno btn--contorno" href="${esc(linkWaze(l))}" target="_blank" rel="noopener">
        ${icone('seta', 15)} Waze
      </a>
    </div>
    <p class="mapa__nota">
      Endereço demonstrativo de retirada. A posição exata é buscada no
      OpenStreetMap ao abrir a página.
    </p>`;

  const tela = alvo.querySelector('.mapa__tela');
  const caixaAviso = alvo.querySelector('.mapa__aviso');

  const avisar = (texto, tipo) => {
    caixaAviso.hidden = false;
    caixaAviso.className = 'mapa__aviso mapa__aviso--' + (tipo || 'info');
    caixaAviso.innerHTML = `${icone('alerta', 15)}<span>${texto}</span>`;
  };

  let L;
  try {
    L = await carregarLeaflet();
  } catch (e) {
    tela.innerHTML = `
      <div class="mapa__sem">
        <span class="mapa__sem-icone">${icone('local', 30)}</span>
        <strong>Não foi possível carregar o mapa</strong>
        <span>O mapa precisa de internet. Use os botões abaixo para ver o endereço:</span>
        <span class="mapa__sem-end">${esc(enderecoTexto(l))}</span>
      </div>`;
    avisar('Mapa indisponível nesta conexão — os botões de rota continuam funcionando.', 'erro');
    return null;
  }

  const ponto = await geocodificar(MAPA.consulta);

  const centro = ponto ? [ponto.lat, ponto.lon] : MAPA.centroReserva;
  const mapa = L.map(tela, {
    center: centro,
    zoom: ponto ? MAPA.zoom : MAPA.zoomReserva,
    scrollWheelZoom: false,          /* não rouba a rolagem da página */
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: MAPA.atribuicao,
  }).addTo(mapa);

  /* habilita a rolagem do mouse só depois do clique, e devolve no mouseout */
  mapa.on('click', () => mapa.scrollWheelZoom.enable());
  mapa.on('mouseout', () => mapa.scrollWheelZoom.disable());

  const textoEnd = `${esc(l.endereco.rua)}, ${esc(l.endereco.numero)} — ${esc(l.endereco.bairro)}`;

  if (ponto) {
    /* Coordenada devolvida pelo serviço: pino no endereço. */
    L.marker(centro).addTo(mapa).bindPopup(
      `<strong>${esc(LOJA.nome)}</strong><br>${textoEnd}<br>${esc(l.endereco.cidade)}/${esc(l.endereco.estado)}`
    );
    avisar(`Posição do endereço obtida pelo OpenStreetMap. Endereço demonstrativo, não é a localização comercial confirmada da loja.`, 'ok');
  } else {
    /* Sem resposta: NÃO fincamos o pino. Mostramos a região e dizemos. */
    L.circle(centro, {
      radius: 1200, color: '#F0C200', weight: 1.5,
      fillColor: '#FFD400', fillOpacity: 0.16, dashArray: '5 5',
    }).addTo(mapa).bindPopup('Região aproximada — posição exata não confirmada.');
    avisar('Não foi possível confirmar a posição exata agora. O círculo marca apenas a região aproximada — use <strong>Como chegar</strong> para a rota pelo endereço.', 'alerta');
  }

  /* O Leaflet mede o container no momento em que nasce. Se o card estava
     escondido ou acabou de receber largura, ele desenha torto — por isso,
     depois do primeiro quadro, revalidamos o tamanho. */
  const revalidar = () => { try { mapa.invalidateSize(); } catch (e) { /* ok */ } };
  if (window.requestAnimationFrame) window.requestAnimationFrame(revalidar);
  setTimeout(revalidar, 300);
  window.addEventListener('resize', revalidar);

  return mapa;
}

/* Liga o mapa em todos os cards marcados na página. */
export function ligarMapas() {
  document.querySelectorAll('[data-mapa]').forEach((el) => montarMapa(el));
}
