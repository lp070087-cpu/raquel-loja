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
      <div class="mapa" id="mapa-contato" data-mapa aria-label="Mapa do endereço de retirada"></div>
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
  /* O mapa é montado por assets/js/mapa.js — mapa real do OpenStreetMap, com
     marcador no endereço demonstrativo.
     A chamada é AQUI, não no HTML: o container do mapa (#mapa-contato) só
     existe depois que esta função desenha a página. Chamar do HTML não
     encontraria nada e o card ficaria vazio. */
  import('./mapa.js').then((m) => m.ligarMapas()).catch(() => {});


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
