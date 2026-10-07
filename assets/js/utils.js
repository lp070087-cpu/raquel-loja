/* ============================================================================
   UTILS — formatação, ícones e ajudantes de DOM
   ----------------------------------------------------------------------------
   Ícones: SVG desenhado aqui, traço 2, grade 24. Nada de emoji e nada de
   biblioteca externa.
   ============================================================================ */

/* ------------------------------------------------------------ formatação -- */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function moeda(n) {
  const v = Number(n);
  if (!isFinite(v)) return BRL.format(0);
  return BRL.format(v);
}

/* Preço "de" riscado — só quando existe e é maior que o preço atual. */
export function temDesconto(p) {
  return p && p.precoDe != null && Number(p.precoDe) > Number(p.preco);
}

export function descontoPct(p) {
  if (!temDesconto(p)) return 0;
  return Math.round((1 - Number(p.preco) / Number(p.precoDe)) * 100);
}

export function dataCurta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ------------------------------------------------------------ segurança -- */
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------ DOM -- */
export function $(sel, raiz) { return (raiz || document).querySelector(sel); }
export function $$(sel, raiz) {
  return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
}

/* Escreve HTML dentro de um nó (substitui o conteúdo). */
export function pintar(no, html) {
  if (no) no.innerHTML = html;
  return no;
}

/* Trata clique sem exigir que o alvo exato já exista no HTML. */
export function aoClicar(sel, fn, raiz) {
  const alvo = raiz || document;
  alvo.addEventListener('click', (ev) => {
    const el = ev.target.closest ? ev.target.closest(sel) : null;
    if (el && alvo.contains(el)) fn(ev, el);
  });
}

/* Máscara simples de telefone brasileiro conforme digita. */
export function mascaraTelefone(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function mascaraCpf(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/* -------------------------------------------------------------- validação -- */
/* Nome: pelo menos duas palavras (nome e sobrenome), sem número. */
export function nomeValido(v) {
  const s = String(v || '').trim();
  if (s.length < 5) return false;
  if (/\d/.test(s)) return false;
  return s.split(/\s+/).filter((p) => p.length >= 2).length >= 2;
}

export function telefoneValido(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}

export function emailValido(v) {
  const s = String(v || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export function cepValido(v) {
  return String(v || '').replace(/\D/g, '').length === 8;
}

export function cpfValido(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 11;
}

/* ---------------------------------------------------------------- avisos -- */
/* Aviso no canto da tela. Sem biblioteca, com o visual da loja. */
let caixaAvisos = null;

export function avisar(texto, tipo = 'ok') {
  if (!caixaAvisos) {
    caixaAvisos = document.createElement('div');
    caixaAvisos.id = 'caixa-avisos';
    caixaAvisos.setAttribute('aria-live', 'polite');
    caixaAvisos.style.cssText =
      'position:fixed;z-index:200;right:16px;bottom:16px;display:flex;flex-direction:column;gap:10px;max-width:min(360px,calc(100vw - 32px));pointer-events:none';
    document.body.appendChild(caixaAvisos);
  }
  const cor = tipo === 'erro' ? '#C0271B' : tipo === 'alerta' ? '#B45309' : '#0B7A43';
  const el = document.createElement('div');
  el.style.cssText =
    `pointer-events:auto;background:#fff;border-left:5px solid ${cor};border-radius:14px;` +
    'padding:14px 16px;box-shadow:0 12px 32px rgba(11,21,38,.18);font-size:.9rem;' +
    'font-weight:600;color:#0B1526;display:flex;gap:10px;align-items:flex-start;' +
    'transition:opacity .3s,transform .3s;opacity:0;transform:translateY(10px)';
  const ic = document.createElement('span');
  ic.style.cssText = `color:${cor};flex:none;display:flex`;
  ic.innerHTML = icone('check', 18);
  const tx = document.createElement('span');
  tx.textContent = texto;
  el.appendChild(ic);
  el.appendChild(tx);
  caixaAvisos.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

/* --------------------------------------------------------------- revelar -- */
/* Anima a entrada dos blocos quando aparecem na tela. Se o navegador não
   tiver IntersectionObserver, tudo aparece de uma vez (sem quebrar). */
export function prepararRevelar(raiz) {
  const alvo = raiz || document;
  const nos = $$('.revelar', alvo);
  if (!nos.length) return;
  if (typeof IntersectionObserver !== 'function') {
    nos.forEach((n) => n.classList.add('revelar--dentro'));
    return;
  }
  const obs = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('revelar--dentro');
          obs.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
  );
  nos.forEach((n) => obs.observe(n));
}

/* Aplica um atraso em cascata nos irmãos de uma grade. */
export function cascata(container, passo = 60) {
  if (!container) return;
  const filhos = Array.prototype.slice.call(container.children);
  filhos.forEach((f, i) => {
    f.style.transitionDelay = `${Math.min(i * passo, 420)}ms`;
  });
}

/* --------------------------------------------------------------- ícones --- */
const TRACOS = {
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  conta: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  carrinho: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H5.2"/>',
  coracao: '<path d="M12 20s-7-4.6-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.4 12 20 12 20z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  local: '<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  telefone: '<path d="M6.5 3h3l1.5 4-2 1.4a12 12 0 0 0 6.6 6.6L17 13l4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.6 2.6L16 9.4"/>',
  alerta: '<path d="M12 4.5 2.8 20h18.4z"/><path d="M12 10v4.2M12 17.2v.6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.5"/>',
  moto: '<circle cx="5.5" cy="17" r="3.2"/><circle cx="18.5" cy="17" r="3.2"/><path d="M8.7 17h6.6l-2-5.5H9.5M13.3 11.5 15 6h3M6 13.5 8 6h3"/>',
  loja: '<path d="M4 9.5V20h16V9.5"/><path d="M3 9.5 5 4h14l2 5.5z"/><path d="M9.5 20v-6h5v6"/>',
  caminhao: '<path d="M3 6h10v10H3z"/><path d="M13 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>',
  escudo: '<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  ferramenta: '<path d="M14.5 6a4 4 0 1 0 4.6 4.6L21 8.7 15.3 3z"/><path d="m11 13-8 8 3 3 8-8"/>',
  gota: '<path d="M12 3.5S6 10.2 6 14a6 6 0 0 0 12 0c0-3.8-6-10.5-6-10.5z"/>',
  filtro: '<path d="M5 5h14l-5.5 6.5V19l-3-1.6v-5.9z"/>',
  disco: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/>',
  corrente: '<circle cx="7" cy="12" r="3.4"/><circle cx="17" cy="12" r="3.4"/><path d="M10.4 12h3.2"/>',
  pneu: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4"/>',
  capacete: '<path d="M4 14a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2h-3v-3H9v3H6a2 2 0 0 1-2-2z"/><path d="M8.5 13.5a3.5 3.5 0 0 1 7 0"/>',
  capa: '<path d="M12 3.5 8 6l-2 8 3 1 3-1.5 3 1.5 3-1 2-8-4-2.5z"/><path d="M12 3.5v12"/>',
  bau: '<rect x="3.5" y="9" width="17" height="11" rx="2.5"/><path d="M3.5 13h17M12 9v11"/>',
  lixeira: '<path d="M5 7h14M9.5 7V5h5v2M9 7l1 13h4l1-13"/>',
  seta: '<path d="M5 12h13M13 6.5 18.5 12 13 17.5"/>',
  setaBaixo: '<path d="M12 5v13M6.5 13 12 18.5 17.5 13"/>',
  mais: '<path d="M12 5.5v13M5.5 12h13"/>',
  menos: '<path d="M5.5 12h13"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 4h8A1.5 1.5 0 0 1 14.5 5.5V6"/>',
  estrela: '<path d="m12 4 2.5 5.1 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z"/>',
  sacola: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  caixa: '<path d="M3.5 7.5 12 3.5l8.5 4-8.5 4z"/><path d="M3.5 7.5V16l8.5 4 8.5-4V7.5"/><path d="M12 11.5V20"/>',
  dinheiro: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  grafico: '<path d="M4 19V5M4 19h16"/><path d="M8 16v-5M12.5 16V8M17 16v-3"/>',
  usuarios: '<circle cx="9" cy="9" r="3.4"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6.5a3.4 3.4 0 0 1 0 6.6M17.5 20a6 6 0 0 0-2-4.5"/>',
  etiqueta: '<path d="M4 4h8l8 8-8 8-8-8z"/><circle cx="8.5" cy="8.5" r="1.4"/>',
  ajuste: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M18.4 5.6 16.3 7.7M7.7 16.3 5.6 18.4"/>',
  sair: '<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 8 6 12l4 4M6 12h9"/>',
  painel: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  olho: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
  lapis: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m14.5 5.5 4 4"/>',
  codigo: '<path d="m9 7-5 5 5 5M15 7l5 5-5 5"/>',
  wifi: '<path d="M4 9.5a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 16.5a3.6 3.6 0 0 1 4 0M12 20h.01"/>',
  bateria: '<rect x="3" y="8" width="15" height="8" rx="2"/><path d="M20.5 11v2"/><path d="M6.5 11v2M9.5 11v2"/>',
  chave: '<circle cx="8" cy="15" r="3.6"/><path d="m10.6 12.4 8-8M15.5 7.5l2.5 2.5M18 5l2 2"/>',
};

/* Devolve o SVG do ícone. `tamanho` em px; se vazio, herda do CSS. */
export function icone(nome, tamanho) {
  const corpo = TRACOS[nome] || TRACOS.info;
  const dim = tamanho
    ? `width="${tamanho}" height="${tamanho}"`
    : 'width="24" height="24"';
  return (
    `<svg ${dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    `aria-hidden="true" focusable="false">${corpo}</svg>`
  );
}

export function estrelas(nota) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += `<svg viewBox="0 0 24 24" fill="${i <= nota ? 'currentColor' : 'none'}" ` +
      'stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="m12 4 2.5 5.1 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z"/></svg>';
  }
  return s;
}

/* --------------------------------------------------------------- diversos -- */
/* Deixa uma lista numa ordem aleatória (usado no palco do hero). */
export function embaralhar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
