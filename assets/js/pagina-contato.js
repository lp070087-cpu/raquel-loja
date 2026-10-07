/* ============================================================================
   PÁGINA — CONTATO
   ----------------------------------------------------------------------------
   O formulário monta a mensagem e ABRE o WhatsApp já preenchido. Não existe
   servidor de e-mail nesta apresentação — e é honesto dizer isso na tela.
   ============================================================================ */

import { LOJA } from './dados.js';
import { icone, esc, avisar, nomeValido, telefoneValido, mascaraTelefone, prepararRevelar } from './utils.js';

export function montarContato() {
  const alvo = document.getElementById('contato-container');
  if (!alvo) return;

  alvo.innerHTML = `
  <div class="contato-grade">

    <div class="contato-card">
      <span class="selo">Atendimento</span>
      <h2 class="mt-2">Como falar com a gente</h2>
      <div class="contato-card__lista">
        <a class="contato-card__item" href="https://wa.me/${LOJA.whatsapp}" target="_blank" rel="noopener">
          ${icone('telefone', 22)}
          <span><strong>WhatsApp</strong><span>${esc(LOJA.whatsappExibicao)} — resposta no horário comercial</span></span>
        </a>
        <a class="contato-card__item" href="mailto:${esc(LOJA.email)}">
          ${icone('email', 22)}
          <span><strong>E-mail</strong><span>${esc(LOJA.email)}</span></span>
        </a>
        <div class="contato-card__item">
          ${icone('local', 22)}
          <span><strong>Endereço</strong>
          <span>${esc(LOJA.endereco.rua)} — ${esc(LOJA.endereco.bairro)}<br>${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)} · CEP ${esc(LOJA.endereco.cep)}</span></span>
        </div>
        <div class="contato-card__item">
          ${icone('relogio', 22)}
          <span><strong>Horário</strong>
          <span>${LOJA.horario.map((h) => `${esc(h.dia)}: ${esc(h.hora)}`).join('<br>')}</span></span>
        </div>
      </div>
    </div>

    <div class="contato-card">
      <span class="selo">Mensagem</span>
      <h2 class="mt-2">Conte o que você precisa</h2>
      <form id="form-contato" novalidate>
        <div class="campo">
          <label class="campo__rotulo" for="c-nome">Seu nome *</label>
          <input class="entrada" id="c-nome" type="text" placeholder="Ex.: Maria Silva">
          <span class="ajuda-campo" data-erro="c-nome"></span>
        </div>
        <div class="campo mt-2">
          <label class="campo__rotulo" for="c-telefone">Telefone *</label>
          <input class="entrada" id="c-telefone" type="tel" placeholder="(81) 90000-0000">
          <span class="ajuda-campo" data-erro="c-telefone"></span>
        </div>
        <div class="campo mt-2">
          <label class="campo__rotulo" for="c-moto">Sua moto</label>
          <input class="entrada" id="c-moto" type="text" placeholder="Ex.: Honda CG 160 2020">
        </div>
        <div class="campo mt-2">
          <label class="campo__rotulo" for="c-msg">O que você procura? *</label>
          <textarea class="entrada" id="c-msg" placeholder="Ex.: preciso de pastilha de freio dianteira"></textarea>
          <span class="ajuda-campo" data-erro="c-msg"></span>
        </div>

        <button class="btn btn--grande btn--bloco mt-3" type="submit">
          ${icone('telefone', 20)} Enviar pelo WhatsApp
        </button>
        <div class="aviso-demostrativo mt-2">
          ${icone('info', 16)}
          <span>Ao enviar, abrimos o WhatsApp com a mensagem pronta. Nesta apresentação não há servidor de e-mail.</span>
        </div>
      </form>
    </div>

  </div>

  <section class="secao">
    <div class="cabecalho-secao revelar">
      <span class="selo">Onde estamos</span>
      <h2 class="mt-2">Retirada na loja</h2>
      <p>Peça reservada pelo site e retirada no balcão, com o código gerado no checkout.</p>
    </div>
    <div class="contato-grade">
      <div class="mapa-falso" id="mapa-contato" role="img" aria-label="Mapa ilustrado da região da loja"></div>
      <div class="painel-dados">
        <h3>Endereço e horário</h3>
        <div class="painel-dados__linha"><span class="rot">Loja</span><span class="val">${esc(LOJA.nome)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Endereço</span><span class="val">${esc(LOJA.endereco.rua)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Bairro</span><span class="val">${esc(LOJA.endereco.bairro)}</span></div>
        <div class="painel-dados__linha"><span class="rot">Cidade</span><span class="val">${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></div>
        <div class="painel-dados__linha"><span class="rot">CEP</span><span class="val">${esc(LOJA.endereco.cep)}</span></div>
        ${LOJA.horario.map((h) => `<div class="painel-dados__linha"><span class="rot">${esc(h.dia)}</span><span class="val">${esc(h.hora)}</span></div>`).join('')}
      </div>
    </div>
  </section>`;

  /* --------------------------------------------------------- mapa ------- */
  const mapa = document.getElementById('mapa-contato');
  if (mapa) {
    mapa.innerHTML = `<svg viewBox="0 0 400 250" role="img" aria-label="Mapa ilustrado" style="width:100%;height:100%;display:block">
      <rect width="400" height="250" fill="#EDF1F6"/>
      <path d="M0 168 h400" stroke="#D8DEE8" stroke-width="26"/>
      <path d="M0 168 h400" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"/>
      <path d="M118 0 v250" stroke="#D8DEE8" stroke-width="20"/>
      <path d="M118 0 v250" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"/>
      <g fill="#DCE3EC">
        <rect x="140" y="40" width="60" height="46" rx="5"/>
        <rect x="216" y="40" width="46" height="46" rx="5"/>
        <rect x="140" y="192" width="72" height="40" rx="5"/>
        <rect x="24" y="52" width="66" height="42" rx="5"/>
        <rect x="300" y="52" width="72" height="42" rx="5"/>
      </g>
      <g transform="translate(196,116)">
        <path d="M0 0a26 26 0 1 1 0.1 0z" fill="#FFD200" stroke="#0B1526" stroke-width="4"/>
        <circle cx="0" cy="0" r="9" fill="#0B1526"/>
        <path d="M0 26 v22" stroke="#0B1526" stroke-width="4"/>
      </g>
    </svg>`;
  }

  /* ----------------------------------------------------- formulário ----- */
  const form = document.getElementById('form-contato');
  const campoTelefone = document.getElementById('c-telefone');
  campoTelefone.addEventListener('input', () => {
    campoTelefone.value = mascaraTelefone(campoTelefone.value);
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = document.getElementById('c-nome').value.trim();
    const telefone = campoTelefone.value.trim();
    const moto = document.getElementById('c-moto').value.trim();
    const msg = document.getElementById('c-msg').value.trim();
    let ok = true;

    const marca = (campo, texto) => {
      const el = document.querySelector(`[data-erro="${campo}"]`);
      if (el) el.textContent = texto || '';
      if (texto) ok = false;
    };

    marca('c-nome', nomeValido(nome) ? '' : 'Informe nome e sobrenome.');
    marca('c-telefone', telefoneValido(telefone) ? '' : 'Informe DDD + número.');
    marca('c-msg', msg.length >= 5 ? '' : 'Conte o que você procura.');

    if (!ok) { avisar('Confira os campos destacados.', 'erro'); return; }

    const texto =
      `Olá! Meu nome é ${nome}.%0A` +
      `Telefone: ${telefone}%0A` +
      (moto ? `Minha moto: ${moto}%0A` : '') +
      `Preciso de: ${msg}`;

    window.open(`https://wa.me/${LOJA.whatsapp}?text=${texto}`, '_blank', 'noopener');
    avisar('Abrimos o WhatsApp com a sua mensagem.');
  });

  prepararRevelar();
}
