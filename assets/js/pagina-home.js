/* ============================================================================
   PÁGINA — HOME
   ----------------------------------------------------------------------------
   Sequência completa de e-commerce. Cada seção usa o mesmo padrão de título
   (etiqueta → título → subtítulo) e o mesmo respiro — é isso que dá o ritmo.

   A seção "Produtos para sua moto" só entra em cena quando existe moto ativa:
   sem moto escolhida ela fica escondida, e a home segue normal.
   ============================================================================ */

import {
  LOJA, CATEGORIAS, PRODUTOS, AVALIACOES, FAQ, produtosDaCategoria, produtoServeEm,
  ehUniversal, rotuloMoto, MARCAS,
} from './dados.js';
import { icone, esc, prepararRevelar, cascata, temDesconto, descontoPct, moeda } from './utils.js';
import { htmlHero, ligarHero } from './hero.js';
import { htmlLocalizador, ligarLocalizador } from './localizador.js';
import {
  cardProduto, blocoFaq, cardAvaliacao, marqueeMarcas, tituloSecao, estadoVazio,
} from './componentes.js';
import { midiaProduto } from './artes.js';
import { moto as motoStore } from './carrinho.js';

export function montarHome() {
  const moto = motoStore.ler();

  /* ----------------------------------------------------------- 1. hero --- */
  const alvoHero = document.getElementById('hero');
  if (alvoHero) { alvoHero.innerHTML = htmlHero(); ligarHero(); }

  /* --------------------------------------------------- 2. faixa marcas --- */
  const alvoMarcas = document.getElementById('faixa-marcas');
  if (alvoMarcas) alvoMarcas.innerHTML = marqueeMarcas(MARCAS.map((m) => m.nome));

  /* ---------------------------------------------------- 3. localizador -- */
  const alvoLocal = document.getElementById('localizador-container');
  if (alvoLocal) {
    alvoLocal.innerHTML = htmlLocalizador();
    ligarLocalizador({ destino: 'catalogo' });
  }

  /* ----------------------------------------------------- 4. categorias -- */
  document.getElementById('titulo-categorias').innerHTML = tituloSecao({
    etiqueta: 'Categorias',
    titulo: 'Do que sua moto precisa hoje?',
    texto: 'Escolha por tipo de peça — ou use o localizador acima e veja só o que serve na sua moto.',
    linha: true,
    acao: { href: 'catalogo.html', rotulo: 'Ver catálogo completo' },
  });
  const alvoCat = document.getElementById('grade-categorias');
  alvoCat.innerHTML = CATEGORIAS.map((c) => {
    const qtd = produtosDaCategoria(c.slug).length;
    return `
    <a class="categoria-card revelar" href="catalogo.html?categoria=${esc(c.slug)}">
      <span class="categoria-card__midia caixa-foto">${midiaProduto({ foto: c.foto, nome: c.nome })}</span>
      <span class="categoria-card__corpo">
        <span>
          <span class="categoria-card__nome">${esc(c.nome)}</span>
          <span class="categoria-card__qtd">${qtd} ${qtd === 1 ? 'produto' : 'produtos'}</span>
        </span>
        <span class="categoria-card__seta">${icone('seta', 16)}</span>
      </span>
    </a>`;
  }).join('');
  cascata(alvoCat, 50);

  /* ------------------------------------------- 5. produtos para sua moto - */
  const secaoMoto = document.getElementById('secao-sua-moto');
  if (moto) {
    const compativeis = PRODUTOS.filter((p) => produtoServeEm(p, moto) && !ehUniversal(p));
    const universais = PRODUTOS.filter((p) => ehUniversal(p));

    document.getElementById('sua-moto-topo').innerHTML = `
      ${tituloSecao({
        etiqueta: 'Selecionado para você',
        titulo: `Peças para sua<br><span style="color:var(--texto-3)">${esc(rotuloMoto(moto))}</span>`,
        linha: true,
        acao: { href: 'catalogo.html?moto=1', rotulo: 'Ver todas as peças da minha moto' },
      })}`;

    const destaquesMoto = compativeis.filter((p) => Number(p.estoque) > 0).slice(0, 4);
    const grade = destaquesMoto.length ? destaquesMoto : universais.slice(0, 4);
    document.getElementById('sua-moto-grade').innerHTML =
      `<div class="grade grade--4">${grade.map((p) => cardProduto(p, { moto })).join('')}</div>`;
    cascata(document.querySelector('#sua-moto-grade .grade'), 50);
    secaoMoto.classList.remove('oculto');
  } else {
    secaoMoto.classList.add('oculto');
  }

  /* ---------------------------------------------------- 6. mais vendidos */
  document.getElementById('titulo-destaques').innerHTML = tituloSecao({
    etiqueta: 'Mais vendidos',
    titulo: 'O que sai todo dia na loja',
    texto: 'As peças que a oficina e os clientes mais levam — com estoque pronto para retirada.',
    linha: true,
    acao: { href: 'catalogo.html?ordenar=relevancia', rotulo: 'Ver todos os produtos' },
  });
  const ordenados = PRODUTOS.filter((p) => Number(p.estoque) > 0)
    .slice()
    .sort((a, b) => (b.avaliacao ? b.avaliacao.total : 0) - (a.avaliacao ? a.avaliacao.total : 0))
    .slice(0, 8);
  const alvoDest = document.getElementById('grade-destaques');
  alvoDest.innerHTML = `<div class="grade grade--4">${ordenados.map((p) => cardProduto(p, { moto })).join('')}</div>`;
  cascata(alvoDest.firstElementChild, 40);

  /* ---------------------------------------------- 7. manutenção --------- */
  document.getElementById('titulo-manutencao').innerHTML = tituloSecao({
    etiqueta: 'Manutenção',
    titulo: 'Cuide da sua moto em cada detalhe',
    texto: 'Óleo, filtro e freio são o básico que mantém a moto rodando. Veja o que a loja separou.',
    linha: true,
    acao: { href: 'catalogo.html?categoria=oleos,filtros,freios', rotulo: 'Ver manutenção' },
  });
  const manut = PRODUTOS.filter((p) => ['oleos', 'filtros', 'freios'].indexOf(p.categoria) !== -1).slice(0, 4);
  const alvoMan = document.getElementById('grade-manutencao');
  alvoMan.innerHTML = `<div class="grade grade--4">${manut.map((p) => cardProduto(p, { moto })).join('')}</div>`;
  cascata(alvoMan.firstElementChild, 40);

  /* --------------------------------------- 8. capacetes e equipamentos -- */
  document.getElementById('lista-equipamento').innerHTML = [
    'Capacetes fechados, abertos e off-road',
    'Capa de chuva para o piloto e conjunto com calça',
    'Equipamento com certificação INMETRO',
  ].map((t) => `<li>${icone('check', 19)} ${esc(t)}</li>`).join('');

  const alvoBanda = document.getElementById('arte-banda');
  if (alvoBanda) {
    alvoBanda.innerHTML =
      `<div class="banda-moto__foto">${midiaProduto({ foto: 'public/produtos/capacetes/capacete-04.jpg', nome: 'Capacete Off-Road' })}</div>`;
  }

  /* ------------------------------------------------------- 9. ofertas --- */
  const ofertas = PRODUTOS.filter((p) => temDesconto(p) && Number(p.estoque) > 0)
    .sort((a, b) => descontoPct(b) - descontoPct(a)).slice(0, 4);
  document.getElementById('titulo-ofertas').innerHTML = tituloSecao({
    etiqueta: 'Ofertas',
    titulo: 'Preço promocional nesta semana',
    texto: 'Descontos aplicados direto no preço. Os valores são demonstrativos nesta apresentação.',
    linha: true,
    acao: { href: 'catalogo.html?ofertas=1', rotulo: 'Ver todas as ofertas' },
  });
  const alvoOf = document.getElementById('grade-ofertas');
  alvoOf.innerHTML = `<div class="grade grade--4">${ofertas.map((p) => cardProduto(p, { moto })).join('')}</div>`;
  cascata(alvoOf.firstElementChild, 40);

  /* ---------------------------------------------------- 10. benefícios -- */
  document.getElementById('titulo-beneficios').innerHTML = tituloSecao({
    etiqueta: 'Por que comprar aqui',
    titulo: 'Uma loja feita para quem depende da moto',
    centro: true,
  });
  const alvoBen = document.getElementById('grade-beneficios');
  alvoBen.innerHTML = [
    { icone: 'check', titulo: 'Peças certas', texto: 'Filtro por marca, modelo, versão e ano. Menos troca e menos devolução.' },
    { icone: 'loja', titulo: 'Retirada rápida', texto: 'Peça reservada com código. Você apresenta no balcão e paga na hora de retirar.' },
    { icone: 'caminhao', titulo: 'Envio para todo Brasil', texto: 'Transportadoras com prazo e valor à vista antes de fechar o pedido.' },
    { icone: 'escudo', titulo: 'Compra segura', texto: 'Garantia do fabricante em peças e acessórios. Nota fiscal em todo pedido.' },
  ].map((b) => `
    <div class="beneficio revelar">
      <span class="beneficio__icone">${icone(b.icone, 23)}</span>
      <span><h3>${esc(b.titulo)}</h3><p>${esc(b.texto)}</p></span>
    </div>`).join('');
  cascata(alvoBen, 60);

  /* --------------------------------------------------- 11. avaliações --- */
  document.getElementById('titulo-avaliacoes').innerHTML = tituloSecao({
    etiqueta: 'Quem já comprou',
    titulo: 'O que dizem os clientes',
    texto: 'Avaliações de exemplo, mostrando como a loja vai exibir a opinião de quem compra.',
    centro: true,
  });
  const alvoAval = document.getElementById('grade-avaliacoes');
  alvoAval.innerHTML = AVALIACOES.slice(0, 6).map(cardAvaliacao).join('');
  cascata(alvoAval, 50);

  /* ---------------------------------------------------------- 12. FAQ --- */
  document.getElementById('titulo-faq').innerHTML = tituloSecao({
    etiqueta: 'Dúvidas',
    titulo: 'Perguntas frequentes',
    centro: true,
  });
  document.getElementById('bloco-faq').innerHTML = blocoFaq(FAQ);

  /* ------------------------------------------------------ 13. contato --- */
  document.getElementById('titulo-contato').innerHTML = tituloSecao({
    etiqueta: 'Fale com a loja',
    titulo: 'Como falar com a gente',
    centro: true,
  });
  document.getElementById('lista-contato').innerHTML = `
    <div class="contato-card__item">${icone('telefone', 21)}
      <span><strong>WhatsApp</strong><span>${esc(LOJA.whatsappExibicao)} — resposta no horário comercial</span></span></div>
    <div class="contato-card__item">${icone('email', 21)}
      <span><strong>E-mail</strong><span>${esc(LOJA.email)}</span></span></div>
    <div class="contato-card__item">${icone('local', 21)}
      <span><strong>Endereço</strong><span>${esc(LOJA.endereco.rua)} — ${esc(LOJA.endereco.bairro)}, ${esc(LOJA.endereco.cidade)}/${esc(LOJA.endereco.estado)}</span></span></div>
    <div class="contato-card__item">${icone('relogio', 21)}
      <span><strong>Horário</strong><span>${LOJA.horario.map((h) => `${esc(h.dia)}: ${esc(h.hora)}`).join('<br>')}</span></span></div>`;

  const btnWhats = document.getElementById('btn-whats');
  if (btnWhats) {
    btnWhats.setAttribute('href',
      `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent('Olá! Quero confirmar uma peça para minha moto.')}`);
  }
  const alvoEnd = document.getElementById('texto-endereco');
  if (alvoEnd) {
    alvoEnd.textContent = `${LOJA.endereco.rua}, ${LOJA.endereco.bairro} — ${LOJA.endereco.cidade}/${LOJA.endereco.estado} · CEP ${LOJA.endereco.cep}`;
  }
  const alvoMapa = document.getElementById('mapa-falso');
  if (alvoMapa) alvoMapa.innerHTML = mapaIlustrado();

  prepararRevelar();
}

/* --------------------------------------------------------------- mapa ---- */
function mapaIlustrado() {
  return `<svg viewBox="0 0 400 250" role="img" aria-label="Mapa ilustrado da região da loja" style="width:100%;height:100%;display:block">
    <rect width="400" height="250" fill="#EFF2F6"/>
    <path d="M0 168 h400" stroke="#DFE4EC" stroke-width="26"/>
    <path d="M0 168 h400" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"/>
    <path d="M118 0 v250" stroke="#DFE4EC" stroke-width="20"/>
    <path d="M118 0 v250" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"/>
    <path d="M278 0 v250" stroke="#E6EAF0" stroke-width="14"/>
    <g fill="#E3E8EF">
      <rect x="140" y="40" width="60" height="46" rx="5"/>
      <rect x="216" y="40" width="46" height="46" rx="5"/>
      <rect x="140" y="192" width="72" height="40" rx="5"/>
      <rect x="230" y="196" width="52" height="36" rx="5"/>
      <rect x="24" y="52" width="66" height="42" rx="5"/>
      <rect x="24" y="200" width="66" height="34" rx="5"/>
      <rect x="300" y="52" width="72" height="42" rx="5"/>
      <rect x="300" y="200" width="72" height="34" rx="5"/>
    </g>
    <path d="M40 226 q60 -30 120 -20" stroke="#D2D8E1" stroke-width="4" fill="none"/>
    <g transform="translate(196,116)">
      <path d="M0 0a26 26 0 1 1 0.1 0z" fill="#FFD400" stroke="#0C1425" stroke-width="4"/>
      <circle cx="0" cy="0" r="9" fill="#0C1425"/>
      <path d="M0 26 v22" stroke="#0C1425" stroke-width="4"/>
    </g>
  </svg>`;
}
