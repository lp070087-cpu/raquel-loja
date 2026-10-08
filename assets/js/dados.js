/* ============================================================================
   DADOS — TUDO QUE A LOJA MOSTRA SAI DAQUI
   ----------------------------------------------------------------------------
   Único arquivo a mexer para trocar conteúdo.

   ---------------------------------------------------------------------------
   A RELAÇÃO CENTRAL DESTE SISTEMA
   ---------------------------------------------------------------------------
       MOTO  ←── COMPATIBILIDADE ──→  PEÇA

   Uma moto tem várias peças compatíveis; uma peça serve em várias motos. Tudo
   nesta base existe para responder "esta peça serve na minha moto?" — no site,
   no balcão e (adiante) na oficina.

   Por isso a moto NÃO é uma string solta ("CG 160"). É uma árvore:

       MARCA -> MODELO -> VERSÃO -> ANOS

   E a compatibilidade da peça guarda o mesmo caminho:

       { marca, modelo, versao, anoInicio, anoFim, cilindrada, observacao }

   `versao: null` significa "todas as versões deste modelo" — é o caso comum.
   `compat: []` significa produto UNIVERSAL (serve em qualquer moto).

   POR QUE ASSIM: guardar só "CG 160" não permitiria, amanhã, distinguir Fan de
   Titan numa peça que só serve em uma delas — e a oficina precisaria saber
   exatamente qual moto está na bancada. Com a árvore, a mesma peça cadastrada
   para o e-commerce já serve para a OS da oficina (CLIENTE -> MOTO -> OS ->
   PEÇAS COMPATÍVEIS -> ESTOQUE).

   ---------------------------------------------------------------------------
   AS FOTOS SÃO REAIS (de ../public/, copiadas para public/produtos/)
   Preços, estoque e avaliações são EXEMPLOS desta apresentação.
   ============================================================================ */

export const LOJA = {
  nome: 'Moto Peças',                 // placeholder — troque quando houver marca
  slogan: 'Peças e acessórios para sua moto',
  cidade: 'Olinda',
  estado: 'PE',
  whatsapp: '5581900000000',
  whatsappExibicao: '(81) 90000-0000',
  email: 'contato@motopecas.com.br',
  /* ENDEREÇO DEMONSTRATIVO — usado em TODO o site (contato, rodapé, retirada
     na loja, checkout, pedido e painel). Um lugar só: mudar aqui muda tudo.
     Não é localização comercial verificada. */
  endereco: {
    rua: 'Rua das Meninas',
    numero: '27',
    bairro: 'Águas Compridas',
    cidade: 'Olinda',
    estado: 'PE',
    cep: '53160-010',
  },
  horario: [
    { dia: 'Segunda a sexta', hora: '8h às 18h' },
    { dia: 'Sábado', hora: '8h às 13h' },
    { dia: 'Domingo', hora: 'Fechado' },
  ],
  freeShippingFrom: 299,
  pixDesconto: 0.05,
  parcelas: 3,                        // parcelamento sem juros (demonstrativo)
  demonstrativo: true,
};

/* Endereço completo numa linha — usado nos links de mapa e "como chegar".
   Fica aqui para não haver duas versões do mesmo endereço pelo site. */
export function enderecoEmLinha(l) {
  const e = (l || LOJA).endereco;
  const num = e.numero ? `, ${e.numero}` : '';
  return `${e.rua}${num} — ${e.bairro}, ${e.cidade} — ${e.estado}, ${e.cep}`;
}

/* ----------------------------------------------------------------- MAPA ---
   O mapa é REAL (OpenStreetMap, desenhado pelo Leaflet) e o ponto é obtido
   por GEOCODIFICAÇÃO em tempo de execução, no navegador do cliente.

   POR QUE NÃO HÁ COORDENADA FIXA AQUI:
   não foi possível confirmar a latitude/longitude deste endereço — o serviço
   de geocodificação não é acessível do ambiente onde o site foi montado, e
   inventar um número colocaria o marcador no lugar errado, que é pior do que
   não ter marcador. Então o site pergunta ao serviço oficial do OpenStreetMap
   (Nominatim) a posição do endereço NA HORA, e usa o que ele responder.

   Consequência honesta: com internet, o pino cai no ponto que o serviço
   devolve; sem internet, o mapa ainda abre no centro de Olinda e o site avisa
   que a posição exata não pôde ser carregada.

   Na versão final: geocodificar no servidor UMA vez, guardar lat/lon no banco
   e desenhar o marcador com o valor guardado. Ver assets/js/mapa.js. */
export const MAPA = {
  /* consulta enviada ao geocodificador — o endereço demonstrativo */
  consulta: 'Rua das Meninas, 27, Águas Compridas, Olinda - PE, 53160-010, Brasil',
  /* Centro de Olinda/PE: só o PONTO DE PARTIDA do mapa quando a consulta ainda
     não respondeu ou falhou. Não é a posição da loja. */
  centroReserva: [-7.9958, -34.8453],
  zoom: 16,
  zoomReserva: 12,
  atribuicao: '&copy; colaboradores do OpenStreetMap',
};

/* Gera a lista de anos de uma faixa — evita escrever 11 números à mão. */
export function anos(de, ate) {
  const lista = [];
  for (let y = de; y <= ate; y++) lista.push(y);
  return lista;
}

/* --------------------------------------------------------------- MARCAS --- */
/*
   versoes: [] -> o modelo não varia por versão; o localizador pula o passo.
   Cada versão pode ter a própria faixa de anos (a Fan saiu antes da Titan).
*/
export const MARCAS = [
  {
    nome: 'Honda',
    modelos: [
      {
        nome: 'CG 160', cilindrada: '160cc',
        versoes: [
          { nome: 'Fan',   anos: anos(2016, 2026) },
          { nome: 'Titan', anos: anos(2016, 2026) },
          { nome: 'Start', anos: anos(2018, 2026) },
          { nome: 'Cargo', anos: anos(2017, 2026) },
        ],
      },
      { nome: 'Biz 125', cilindrada: '125cc', versoes: [], anos: anos(2013, 2025) },
      { nome: 'Bros 160', cilindrada: '160cc', versoes: [], anos: anos(2015, 2025) },
      { nome: 'XRE 300', cilindrada: '300cc', versoes: [], anos: anos(2013, 2025) },
      {
        nome: 'CB 300F', cilindrada: '300cc',
        versoes: [
          { nome: 'Twister', anos: anos(2015, 2026) },
          { nome: 'ABS',     anos: anos(2018, 2026) },
        ],
      },
      { nome: 'Pop 110i', cilindrada: '110cc', versoes: [], anos: anos(2016, 2025) },
      { nome: 'Titan 160', cilindrada: '160cc', versoes: [], anos: anos(2016, 2025) },
    ],
  },
  {
    nome: 'Yamaha',
    modelos: [
      { nome: 'Fazer 250', cilindrada: '250cc', versoes: [], anos: anos(2013, 2025) },
      { nome: 'Factor 150', cilindrada: '150cc', versoes: [], anos: anos(2014, 2025) },
      { nome: 'Crosser 150', cilindrada: '150cc', versoes: [], anos: anos(2015, 2025) },
      { nome: 'Lander 250', cilindrada: '250cc', versoes: [], anos: anos(2015, 2025) },
      { nome: 'XTZ 150', cilindrada: '150cc', versoes: [], anos: anos(2013, 2023) },
    ],
  },
  {
    nome: 'Suzuki',
    modelos: [
      { nome: 'Yes 125', cilindrada: '125cc', versoes: [], anos: anos(2013, 2021) },
      { nome: 'Intruder 125', cilindrada: '125cc', versoes: [], anos: anos(2013, 2020) },
      { nome: 'GSX 150', cilindrada: '150cc', versoes: [], anos: anos(2016, 2023) },
      { nome: 'Burgman 125', cilindrada: '125cc', versoes: [], anos: anos(2015, 2022) },
    ],
  },
  {
    nome: 'Kawasaki',
    modelos: [
      { nome: 'Ninja 400', cilindrada: '400cc', versoes: [], anos: anos(2018, 2025) },
      { nome: 'Z400', cilindrada: '400cc', versoes: [], anos: anos(2019, 2025) },
      { nome: 'Versys 300', cilindrada: '300cc', versoes: [], anos: anos(2017, 2023) },
    ],
  },
  {
    nome: 'BMW',
    modelos: [
      { nome: 'G 310 R', cilindrada: '310cc', versoes: [], anos: anos(2017, 2025) },
      { nome: 'G 310 GS', cilindrada: '310cc', versoes: [], anos: anos(2017, 2025) },
      { nome: 'F 850 GS', cilindrada: '850cc', versoes: [], anos: anos(2019, 2025) },
    ],
  },
  {
    nome: 'Dafra',
    modelos: [
      { nome: 'Citycom 300', cilindrada: '300cc', versoes: [], anos: anos(2013, 2020) },
      { nome: 'Next 250', cilindrada: '250cc', versoes: [], anos: anos(2014, 2020) },
      { nome: 'Zig 50', cilindrada: '50cc', versoes: [], anos: anos(2013, 2018) },
    ],
  },
  {
    nome: 'Shineray',
    modelos: [
      { nome: 'XY 50', cilindrada: '50cc', versoes: [], anos: anos(2013, 2020) },
      { nome: 'Jet 125', cilindrada: '125cc', versoes: [], anos: anos(2014, 2020) },
      { nome: 'Phoenix 50', cilindrada: '50cc', versoes: [], anos: anos(2013, 2018) },
    ],
  },
];

/* ----------------------------------------------------------- CATEGORIAS --- */
export const CATEGORIAS = [
  { slug: 'oleos',       nome: 'Óleos',           chamada: 'Lubrificantes e fluidos',     grupo: 'manutencao', foto: 'public/produtos/oleos/oleo-01.jpg' },
  { slug: 'filtros',     nome: 'Filtros',         chamada: 'Óleo e ar',                   grupo: 'manutencao', foto: 'public/produtos/filtros/filtro-oleo-01.jpg' },
  { slug: 'freios',      nome: 'Freios',          chamada: 'Pastilhas e discos',          grupo: 'freios',     foto: 'public/produtos/freios/disco-freio-02.jpg' },
  { slug: 'transmissao', nome: 'Transmissão',     chamada: 'Kits, coroas e correntes',    grupo: 'transmissao',foto: 'public/produtos/transmissao/transmissao-02.jpg' },
  { slug: 'pneus',       nome: 'Pneus',           chamada: 'Asfalto e trilha',            grupo: 'rodagem',    foto: 'public/produtos/pneus/pneu-01.jpg' },
  { slug: 'capacetes',   nome: 'Capacetes',       chamada: 'Proteção para o piloto',      grupo: 'acessorios', foto: 'public/produtos/capacetes/capacete-01.jpg' },
  { slug: 'capas',       nome: 'Capas de chuva',  chamada: 'Para o piloto e para a moto', grupo: 'acessorios', foto: 'public/produtos/capas/capa-chuva-01.jpg' },
];

/*
   Agrupamento usado para ORGANIZAR o catálogo quando existe moto ativa.
   Sem isto, tudo caía numa grade só — que era exatamente a reclamação de
   "catálogo parecendo grade genérica".
   A ordem aqui é a ordem em que os grupos aparecem na página.
*/
export const GRUPOS = [
  { slug: 'manutencao',  nome: 'Manutenção',           categorias: ['oleos', 'filtros'] },
  { slug: 'freios',      nome: 'Freios',               categorias: ['freios'] },
  { slug: 'transmissao', nome: 'Transmissão',          categorias: ['transmissao'] },
  { slug: 'rodagem',     nome: 'Rodagem',              categorias: ['pneus'] },
  { slug: 'acessorios',  nome: 'Acessórios universais', categorias: ['capacetes', 'capas'], universal: true },
];

/* -------------------------------------------------------------- PRODUTOS -- */
/*
   compat: []  -> UNIVERSAL (serve em qualquer moto)
   compat: [{ marca, modelo, versao, anoInicio, anoFim, cilindrada, observacao }]
              `versao: null` = todas as versões do modelo.

   fotos: mais de uma foto da MESMA peça -> vira galeria na página do produto.
*/
export const PRODUTOS = [
  /* ==================================================================== ÓLEOS */
  {
    id: 'oleo-motul-7100-10w40',
    nome: 'Óleo Motul 7100 10W40 Sintético',
    categoria: 'oleos', marca: 'Motul', sku: 'OL-MOTUL-7100',
    preco: 89.9, precoDe: 109.9, custo: 55, estoque: 24, estoqueMinimo: 8,
    foto: 'public/produtos/oleos/oleo-01.jpg',
    descricao: 'Óleo sintético 10W40 da linha 7100, para motores de alta rotação. Mantém a viscosidade em uso severo e protege a embreagem.',
    especificacoes: { Viscosidade: '10W40', Tipo: 'Sintético', Volume: '1 litro', Linha: '7100' },
    avaliacao: { nota: 4.8, total: 37 },
    compat: [],
  },
  {
    id: 'oleo-mobil-super-5w30',
    nome: 'Óleo Mobil Super Moto 5W30',
    categoria: 'oleos', marca: 'Mobil', sku: 'OL-MOBIL-5W30',
    preco: 54.9, precoDe: 64.9, custo: 33, estoque: 31, estoqueMinimo: 10,
    foto: 'public/produtos/oleos/oleo-02.jpg',
    descricao: 'Semissintético 5W30 para motores modernos de baixa cilindrada. Partida a frio mais fácil e menor consumo.',
    especificacoes: { Viscosidade: '5W30', Tipo: 'Semissintético', Volume: '1 litro', Linha: 'Super Moto' },
    avaliacao: { nota: 4.6, total: 22 },
    compat: [],
  },
  {
    id: 'oleo-motul-20w50',
    nome: 'Óleo Motul 20W50 Mineral — caixa com 4',
    categoria: 'oleos', marca: 'Motul', sku: 'OL-MOTUL-20W50',
    preco: 159.9, precoDe: 189.9, custo: 98, estoque: 12, estoqueMinimo: 6,
    foto: 'public/produtos/oleos/oleo-03.jpg',
    descricao: 'Caixa fechada com quatro unidades de 20W50 mineral. Rende quatro trocas — sai mais barato para quem roda muito.',
    especificacoes: { Viscosidade: '20W50', Tipo: 'Mineral', Volume: '4 x 1 litro' },
    avaliacao: { nota: 4.9, total: 41 },
    compat: [],
  },
  {
    id: 'oleo-lubrax-10w40',
    nome: 'Óleo Lubrax 10W40 Semissintético',
    categoria: 'oleos', marca: 'Lubrax', sku: 'OL-LUBRAX-10W40',
    preco: 46.9, precoDe: 56.9, custo: 28, estoque: 27, estoqueMinimo: 10,
    foto: 'public/produtos/oleos/oleo-04.jpg',
    descricao: 'Semissintético 10W40 para o uso urbano do dia a dia. Boa proteção contra desgaste e preço acessível.',
    especificacoes: { Viscosidade: '10W40', Tipo: 'Semissintético', Volume: '1 litro' },
    avaliacao: { nota: 4.4, total: 18 },
    compat: [],
  },
  {
    id: 'oleo-mobil-20w50',
    nome: 'Óleo Mobil Super Moto 20W50',
    categoria: 'oleos', marca: 'Mobil', sku: 'OL-MOBIL-20W50',
    preco: 39.9, precoDe: 49.9, custo: 24, estoque: 38, estoqueMinimo: 12,
    foto: 'public/produtos/oleos/oleo-05.jpg',
    descricao: 'Mineral 20W50 para motores 4 tempos. O óleo mais vendido da loja para CG, Titan e Factor.',
    especificacoes: { Viscosidade: '20W50', Tipo: 'Mineral', Volume: '1 litro' },
    avaliacao: { nota: 4.7, total: 63 },
    compat: [],
  },

  /* ================================================================= FILTROS */
  {
    id: 'filtro-oleo-tecfil',
    nome: 'Filtro de Óleo Tecfil CG 160 / Titan 160',
    categoria: 'filtros', marca: 'Tecfil', sku: 'FI-TECFIL-CG160',
    preco: 19.9, precoDe: 25.9, custo: 10.5, estoque: 62, estoqueMinimo: 20,
    foto: 'public/produtos/filtros/filtro-oleo-01.jpg',
    fotos: ['public/produtos/filtros/filtro-oleo-01.jpg', 'public/produtos/filtros/filtro-oleo-02.jpg'],
    descricao: 'Filtro de óleo com elemento filtrante de papel especial. Retém impurezas e preserva a vida útil do motor.',
    especificacoes: { Aplicação: 'Honda 160', Roscas: 'M20 x 1,5', Tipo: 'Elemento filtrante' },
    avaliacao: { nota: 4.7, total: 54 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Bros 160', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'XRE 300', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '300cc' },
      { marca: 'Honda', modelo: 'CB 300F', versao: null, anoInicio: 2015, anoFim: 2026, cilindrada: '300cc' },
    ],
  },

  /* ================================================================== FREIOS */
  {
    id: 'pastilha-cobreq-cg160',
    nome: 'Pastilha de Freio Cobreq CG 160 Dianteira',
    categoria: 'freios', marca: 'Cobreq', sku: 'FR-PAST-CG160-D',
    preco: 54.9, precoDe: 69.9, custo: 31, estoque: 38, estoqueMinimo: 12,
    foto: 'public/produtos/freios/pastilha-01.jpg',
    fotos: ['public/produtos/freios/pastilha-01.jpg', 'public/produtos/freios/pastilha-02.jpg'],
    descricao: 'Pastilha dianteira com composto orgânico de alta performance. Frenagem firme, baixo ruído e pouca poeira na roda.',
    especificacoes: { Posição: 'Dianteira', Composto: 'Orgânico', Par: 'Jogo com 2 pastilhas' },
    avaliacao: { nota: 4.9, total: 88 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: 'Fan', anoInicio: 2016, anoFim: 2026, cilindrada: '160cc', observacao: 'Freio a disco dianteiro' },
      { marca: 'Honda', modelo: 'CG 160', versao: 'Titan', anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'CG 160', versao: 'Start', anoInicio: 2018, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Bros 160', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '160cc' },
    ],
  },
  {
    id: 'pastilha-cobreq-traseira',
    nome: 'Pastilha de Freio Traseira — Linha Cobreq',
    categoria: 'freios', marca: 'Cobreq', sku: 'FR-PAST-TRAS',
    preco: 49.9, precoDe: 59.9, custo: 28, estoque: 29, estoqueMinimo: 12,
    foto: 'public/produtos/freios/pastilha-03.jpg',
    descricao: 'Jogo de pastilhas traseiras com a mesma formulação da linha dianteira. Desgaste parelho entre os dois eixos.',
    especificacoes: { Posição: 'Traseira', Composto: 'Orgânico', Par: 'Jogo com 4 pastilhas' },
    avaliacao: { nota: 4.6, total: 34 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Yamaha', modelo: 'Factor 150', versao: null, anoInicio: 2014, anoFim: 2025, cilindrada: '150cc' },
      { marca: 'Yamaha', modelo: 'Fazer 250', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '250cc' },
    ],
  },
  {
    id: 'disco-freio-cg160',
    nome: 'Disco de Freio Dianteiro CG 160',
    categoria: 'freios', marca: 'Fremax', sku: 'FR-DISCO-CG160',
    preco: 189.9, precoDe: 229.9, custo: 112, estoque: 12, estoqueMinimo: 5,
    foto: 'public/produtos/freios/disco-freio-02.jpg',
    fotos: [
      'public/produtos/freios/disco-freio-02.jpg',
      'public/produtos/freios/disco-freio-03.jpg',
      'public/produtos/freios/disco-freio-04.jpg',
      'public/produtos/freios/disco-freio-01.jpg',
    ],
    descricao: 'Disco ventilado em aço inox, com espessura dentro da tolerância de fábrica. Recupera a frenagem original da moto.',
    especificacoes: { Diâmetro: '240 mm', Espessura: '3,5 mm', Material: 'Aço inox', Furação: '6 furos' },
    avaliacao: { nota: 4.8, total: 26 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Biz 125', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '125cc' },
      { marca: 'Honda', modelo: 'Pop 110i', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '110cc' },
    ],
  },
  {
    id: 'disco-freio-xre300',
    nome: 'Disco de Freio Dianteiro XRE 300 / Bros',
    categoria: 'freios', marca: 'Fremax', sku: 'FR-DISCO-XRE300',
    preco: 229.9, precoDe: 279.9, custo: 138, estoque: 7, estoqueMinimo: 5,
    foto: 'public/produtos/freios/disco-freio-03.jpg',
    descricao: 'Disco dianteiro para uso misto asfalto e terra. Tratamento anticorrosivo e boa dissipação de calor.',
    especificacoes: { Diâmetro: '256 mm', Espessura: '4 mm', Material: 'Aço inox', Furação: '6 furos' },
    avaliacao: { nota: 4.5, total: 19 },
    compat: [
      { marca: 'Honda', modelo: 'XRE 300', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '300cc' },
      { marca: 'Honda', modelo: 'Bros 160', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Yamaha', modelo: 'Lander 250', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '250cc' },
      { marca: 'Yamaha', modelo: 'Crosser 150', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '150cc' },
      { marca: 'Yamaha', modelo: 'XTZ 150', versao: null, anoInicio: 2013, anoFim: 2023, cilindrada: '150cc' },
    ],
  },

  /* ============================================================ TRANSMISSÃO */
  {
    id: 'kit-transmissao-cg160',
    nome: 'Kit Transmissão Completo CG 160',
    categoria: 'transmissao', marca: 'Riffel', sku: 'TR-KIT-CG160',
    preco: 219.9, precoDe: 269.9, custo: 132, estoque: 19, estoqueMinimo: 6,
    foto: 'public/produtos/transmissao/transmissao-02.jpg',
    descricao: 'Kit com relação, coroa e pinhão. Conjunto balanceado, que reduz ruído e alonga a vida dos três componentes.',
    especificacoes: { Relação: '14 x 39', Passo: '428H', Elos: '110', Retentor: 'Com retentor' },
    avaliacao: { nota: 4.7, total: 45 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Bros 160', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '160cc' },
    ],
  },
  {
    id: 'corrente-sem-retentor',
    nome: 'Corrente de Transmissão sem Retentor',
    categoria: 'transmissao', marca: 'Riffel', sku: 'TR-COR-SEM-RET',
    preco: 89.9, precoDe: 109.9, custo: 52, estoque: 26, estoqueMinimo: 10,
    foto: 'public/produtos/transmissao/transmissao-01.jpg',
    descricao: 'Corrente sem retentor, com elo de encaixe. Mais leve, silenciosa e de manutenção simples — a mais usada na cidade.',
    especificacoes: { Passo: '428H', Elos: '110', Retentor: 'Sem retentor', Fechamento: 'Elo clip' },
    avaliacao: { nota: 4.5, total: 28 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Biz 125', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '125cc' },
      { marca: 'Honda', modelo: 'Pop 110i', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '110cc' },
      { marca: 'Yamaha', modelo: 'Factor 150', versao: null, anoInicio: 2014, anoFim: 2025, cilindrada: '150cc' },
      { marca: 'Yamaha', modelo: 'Crosser 150', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '150cc' },
    ],
  },

  /* =================================================================== PNEUS */
  {
    id: 'pneu-90-90-18',
    nome: 'Pneu 90/90-18 Dianteiro Asfalto',
    categoria: 'pneus', marca: 'Pirelli', sku: 'PN-909018',
    preco: 289.9, precoDe: 349.9, custo: 175, estoque: 14, estoqueMinimo: 6,
    foto: 'public/produtos/pneus/pneu-01.jpg',
    descricao: 'Pneu dianteiro 90/90-18 com desenho para asfalto. Boa aderência em piso molhado e desgaste uniforme.',
    especificacoes: { Medida: '90/90-18', Posição: 'Dianteiro', Tipo: 'Asfalto', Carga: '57P' },
    avaliacao: { nota: 4.6, total: 31 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Biz 125', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '125cc' },
      { marca: 'Yamaha', modelo: 'Factor 150', versao: null, anoInicio: 2014, anoFim: 2025, cilindrada: '150cc' },
    ],
  },
  {
    id: 'pneu-par-cg160',
    nome: 'Par de Pneus CG 160 — Dianteiro e Traseiro',
    categoria: 'pneus', marca: 'Pirelli', sku: 'PN-PAR-CG160',
    preco: 589.9, precoDe: 699.9, custo: 356, estoque: 8, estoqueMinimo: 4,
    foto: 'public/produtos/pneus/pneu-02.jpg',
    descricao: 'Par completo para trocar os dois pneus de uma vez. Medidas originais, com o mesmo desenho na frente e atrás.',
    especificacoes: { Dianteiro: '90/90-18', Traseiro: '110/90-17', Tipo: 'Asfalto', Par: '2 pneus' },
    avaliacao: { nota: 4.8, total: 17 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
    ],
  },
  {
    id: 'pneu-110-90-17',
    nome: 'Pneu 110/90-17 Traseiro',
    categoria: 'pneus', marca: 'Pirelli', sku: 'PN-1109017',
    preco: 329.9, precoDe: 399.9, custo: 198, estoque: 11, estoqueMinimo: 6,
    foto: 'public/produtos/pneus/pneu-03.jpg',
    descricao: 'Pneu traseiro 110/90-17 para uso urbano. Sulcos que escoam água e mantêm a estabilidade na chuva.',
    especificacoes: { Medida: '110/90-17', Posição: 'Traseiro', Tipo: 'Asfalto', Carga: '60P' },
    avaliacao: { nota: 4.5, total: 23 },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', versao: null, anoInicio: 2016, anoFim: 2026, cilindrada: '160cc' },
      { marca: 'Honda', modelo: 'Titan 160', versao: null, anoInicio: 2016, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Yamaha', modelo: 'Factor 150', versao: null, anoInicio: 2014, anoFim: 2025, cilindrada: '150cc' },
      { marca: 'Yamaha', modelo: 'Fazer 250', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '250cc' },
    ],
  },
  {
    id: 'pneu-trilha-120-80-18',
    nome: 'Pneu 120/80-18 Trilha',
    categoria: 'pneus', marca: 'Metzeler', sku: 'PN-1208018-TR',
    preco: 449.9, precoDe: 529.9, custo: 276, estoque: 6, estoqueMinimo: 4,
    foto: 'public/produtos/pneus/pneu-04.jpg',
    descricao: 'Pneu de trilha com cravos altos. Tração na terra solta, na lama e em subida íngreme.',
    especificacoes: { Medida: '120/80-18', Posição: 'Traseiro', Tipo: 'Trilha', Cravos: 'Altos' },
    avaliacao: { nota: 4.7, total: 21 },
    compat: [
      { marca: 'Honda', modelo: 'XRE 300', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '300cc' },
      { marca: 'Honda', modelo: 'Bros 160', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Yamaha', modelo: 'Lander 250', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '250cc' },
      { marca: 'Yamaha', modelo: 'Crosser 150', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '150cc' },
      { marca: 'Yamaha', modelo: 'XTZ 150', versao: null, anoInicio: 2013, anoFim: 2023, cilindrada: '150cc' },
    ],
  },
  {
    id: 'pneu-trilha-dianteiro',
    nome: 'Pneu de Trilha Dianteiro',
    categoria: 'pneus', marca: 'Metzeler', sku: 'PN-TRILHA-DIANT',
    preco: 379.9, precoDe: null, custo: 232, estoque: 3, estoqueMinimo: 5,
    foto: 'public/produtos/pneus/pneu-05.jpg',
    descricao: 'Pneu dianteiro de trilha, para acompanhar o traseiro cravejado. Direção firme na terra e no cascalho.',
    especificacoes: { Posição: 'Dianteiro', Tipo: 'Trilha', Cravos: 'Altos' },
    avaliacao: { nota: 4.4, total: 12 },
    compat: [
      { marca: 'Honda', modelo: 'XRE 300', versao: null, anoInicio: 2013, anoFim: 2025, cilindrada: '300cc' },
      { marca: 'Honda', modelo: 'Bros 160', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '160cc' },
      { marca: 'Yamaha', modelo: 'Lander 250', versao: null, anoInicio: 2015, anoFim: 2025, cilindrada: '250cc' },
    ],
  },

  /* =============================================================== CAPACETES */
  {
    id: 'capacete-ls2-fechado',
    nome: 'Capacete LS2 Fechado Preto Fosco',
    categoria: 'capacetes', marca: 'LS2', sku: 'CP-LS2-FECH',
    preco: 449.9, precoDe: 549.9, custo: 276, estoque: 14, estoqueMinimo: 5,
    foto: 'public/produtos/capacetes/capacete-01.jpg',
    descricao: 'Capacete fechado com viseira antirrisco e forro removível para lavagem. Certificado pelo INMETRO.',
    especificacoes: { Tipo: 'Fechado', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Viseira: 'Antirrisco' },
    avaliacao: { nota: 4.9, total: 72 },
    compat: [],
  },
  {
    id: 'capacete-esportivo-vermelho',
    nome: 'Capacete Esportivo Vermelho',
    categoria: 'capacetes', marca: 'LS2', sku: 'CP-ESP-VERM',
    preco: 519.9, precoDe: 629.9, custo: 318, estoque: 6, estoqueMinimo: 4,
    foto: 'public/produtos/capacetes/capacete-02.jpg',
    descricao: 'Casco esportivo com pintura vermelha e entradas de ar. Mais leve e estável em velocidade de estrada.',
    especificacoes: { Tipo: 'Fechado', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Ventilação: 'Frontal e traseira' },
    avaliacao: { nota: 4.7, total: 19 },
    compat: [],
  },
  {
    id: 'capacete-asx-preto',
    nome: 'Capacete ASX Fechado',
    categoria: 'capacetes', marca: 'ASX', sku: 'CP-ASX-FECH',
    preco: 289.9, precoDe: 349.9, custo: 175, estoque: 18, estoqueMinimo: 6,
    foto: 'public/produtos/capacetes/capacete-03.jpg',
    descricao: 'Capacete fechado de entrada, com acabamento fosco e forro macio. Bom custo-benefício para o dia a dia.',
    especificacoes: { Tipo: 'Fechado', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Acabamento: 'Fosco' },
    avaliacao: { nota: 4.3, total: 41 },
    compat: [],
  },
  {
    id: 'capacete-off-road',
    nome: 'Capacete Off-Road com Viseira',
    categoria: 'capacetes', marca: 'Stealth', sku: 'CP-OFF-01',
    preco: 389.9, precoDe: 469.9, custo: 238, estoque: 1, estoqueMinimo: 4,
    foto: 'public/produtos/capacetes/capacete-04.jpg',
    descricao: 'Capacete de trilha com queixeira elevada e viseira. Ventilação reforçada para uso em terra.',
    especificacoes: { Tipo: 'Off-road', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Viseira: 'Com queixeira' },
    avaliacao: { nota: 4.6, total: 15 },
    compat: [],
  },

  /* ============================================================ CAPAS DE CHUVA */
  {
    id: 'capa-chuva-piloto',
    nome: 'Capa de Chuva para Piloto',
    categoria: 'capas', marca: 'Braslux', sku: 'CA-PILOTO-01',
    preco: 89.9, precoDe: 119.9, custo: 52, estoque: 34, estoqueMinimo: 12,
    foto: 'public/produtos/capas/capa-chuva-01.jpg',
    descricao: 'Capa de chuva com costura selada e capuz com elástico. Mantém você seco sem atrapalhar o movimento nos comandos.',
    especificacoes: { Tamanhos: 'M ao GG', Material: 'PVC', Costura: 'Selada', Capuz: 'Com elástico' },
    avaliacao: { nota: 4.5, total: 38 },
    compat: [],
  },
  {
    id: 'capa-chuva-conjunto',
    nome: 'Conjunto de Chuva Blusa e Calça',
    categoria: 'capas', marca: 'Braslux', sku: 'CA-CONJ-01',
    preco: 149.9, precoDe: 179.9, custo: 88, estoque: 21, estoqueMinimo: 8,
    foto: 'public/produtos/capas/capa-chuva-02.jpg',
    descricao: 'Conjunto completo: blusa e calça impermeáveis. Cobre pernas e tronco, indicado para quem roda todos os dias.',
    especificacoes: { Tamanhos: 'M ao GG', Material: 'Poliéster impermeável', Peças: 'Blusa + calça' },
    avaliacao: { nota: 4.7, total: 26 },
    compat: [],
  },
];

/* ------------------------------------------------------------ AVALIAÇÕES -- */
/* Fictícias. Nomes comuns, sem cliente real. */
export const AVALIACOES = [
  { nome: 'Rafael Andrade', local: 'Recife, PE', nota: 5,
    texto: 'Achei a pastilha pela moto dele no site e deu certinho. Retirei na loja no mesmo dia e paguei lá. Atendimento rápido.',
    produto: 'Pastilha de Freio Cobreq CG 160 Dianteira' },
  { nome: 'Juliana Prado', local: 'Olinda, PE', nota: 5,
    texto: 'Comprei o capacete e a capa de chuva juntos. Chegou antes do prazo e a embalagem veio bem protegida.',
    produto: 'Capacete LS2 Fechado Preto Fosco' },
  { nome: 'Marcos Vinícius', local: 'Jaboatão, PE', nota: 4,
    texto: 'Bom preço no kit de transmissão, mais barato que na oficina que eu ia antes. Só demorou um dia a mais.',
    produto: 'Kit Transmissão Completo CG 160' },
  { nome: 'Camila Torres', local: 'Paulista, PE', nota: 5,
    texto: 'Gostei de escolher a moto antes de ver as peças. Comprei o filtro sem medo de errar o modelo.',
    produto: 'Filtro de Óleo Tecfil CG 160 / Titan 160' },
  { nome: 'Diego Freitas', local: 'Caruaru, PE', nota: 5,
    texto: 'Pedido pelo site, retirei no balcão com o código. Passou em dois minutos, sem fila e sem enrolação.',
    produto: 'Óleo Mobil Super Moto 20W50' },
  { nome: 'Patrícia Lima', local: 'Recife, PE', nota: 4,
    texto: 'O disco de freio veio certo e bem embalado. Achei o prazo do PAC um pouco longo, mas valeu o preço.',
    produto: 'Disco de Freio Dianteiro CG 160' },
];

/* ------------------------------------------------------------------ FAQ --- */
export const FAQ = [
  { p: 'Como eu sei se a peça serve na minha moto?',
    r: 'Escolha marca, modelo, versão e ano no localizador "Qual é a sua moto?". O site guarda a sua moto e passa a mostrar só as peças que servem nela — cada produto vem marcado com "Serve na sua moto".' },
  { p: 'Posso retirar na loja em vez de receber em casa?',
    r: 'Pode. Escolhendo "Retirar na loja" no checkout, o site gera um código de retirada. Você apresenta esse código no balcão, confere a peça e paga na hora. Não é cobrado nada online nesse caso.' },
  { p: 'Quanto tempo leva para chegar em casa?',
    r: 'Depende da transportadora e do CEP. No checkout você vê as opções com prazo e valor antes de fechar o pedido. Depois de postado, enviamos o código de rastreio.' },
  { p: 'Quais são as formas de pagamento?',
    r: 'Na retirada, você paga no balcão em dinheiro, débito, crédito ou Pix. Na entrega, combinamos no atendimento. Pedidos no Pix têm desconto na hora de fechar.' },
  { p: 'A peça tem garantia?',
    r: 'Sim. Peças e acessórios têm a garantia do fabricante. Se houver defeito de fabricação, guarde o comprovante e fale com a gente para trocar.' },
  { p: 'Consigo comprar para outra cidade?',
    r: 'Enviamos para todo o Brasil. Basta informar o CEP no checkout para ver as transportadoras disponíveis e o prazo para o seu endereço.' },
];

/* --------------------------------------------------------- DADOS DO ADMIN -- */
/* Credenciais da demonstração. NÃO é autenticação real. */
export const ADMIN_DEMO = { usuario: 'admin', senha: 'demo123' };

export const CLIENTES_DEMO = [
  { nome: 'Rafael Andrade', telefone: '(81) 98812-4477', cidade: 'Recife', uf: 'PE', pedidos: 3, total: 486.7, desde: '2024-03-11' },
  { nome: 'Juliana Prado', telefone: '(81) 99640-1203', cidade: 'Olinda', uf: 'PE', pedidos: 2, total: 339.8, desde: '2024-07-02' },
  { nome: 'Marcos Vinícius', telefone: '(81) 98118-5566', cidade: 'Jaboatão', uf: 'PE', pedidos: 4, total: 812.4, desde: '2023-11-19' },
  { nome: 'Camila Torres', telefone: '(81) 99273-8841', cidade: 'Paulista', uf: 'PE', pedidos: 1, total: 18.9, desde: '2025-01-08' },
  { nome: 'Diego Freitas', telefone: '(81) 98660-2290', cidade: 'Caruaru', uf: 'PE', pedidos: 5, total: 1043.5, desde: '2023-06-24' },
  { nome: 'Patrícia Lima', telefone: '(81) 99452-7712', cidade: 'Recife', uf: 'PE', pedidos: 2, total: 649.8, desde: '2024-09-30' },
];

/* --------------------------------------------------------- FRETE (DEMO) ---- */
/* SIMULAÇÃO — nenhuma API é chamada. Ver assets/js/frete.js */
export const OPCOES_FRETE_DEMO = [
  { id: 'pac', nome: 'PAC', transportadora: 'Correios', diasMin: 5, diasMax: 8, base: 22.9, porKg: 4.2 },
  { id: 'sedex', nome: 'SEDEX', transportadora: 'Correios', diasMin: 2, diasMax: 4, base: 34.9, porKg: 7.8 },
  { id: 'transportadora', nome: 'Transportadora parceira', transportadora: 'Rodo Expresso', diasMin: 3, diasMax: 6, base: 27.5, porKg: 5.6 },
];

/* ------------------------------------------------ IMAGENS DO BANNER/ANIMAÇÃO */
export const IMAGENS_BANNER = [
  'public/banner/banner-01.jpg','public/banner/banner-02.jpg',
  'public/banner/banner-03.jpg','public/banner/banner-04.jpg',
  'public/banner/banner-05.jpg','public/banner/banner-06.jpg',
  'public/banner/banner-07.jpg','public/banner/banner-08.jpg',
];

/* -------------------------------------------------- CONSTANTES DO SISTEMA -- */
export const CHAVES = {
  carrinho: 'motopecas-carrinho',
  pedidos: 'motopecas-pedidos',
  favoritos: 'motopecas-favoritos',
  moto: 'motopecas-moto',
  cliente: 'motopecas-cliente',
  ultimoPedido: 'motopecas-ultimo-pedido',
};

/* ==========================================================================
   CONSULTAS
   ========================================================================== */

export function produtoPorId(id) {
  return PRODUTOS.find((p) => p.id === id) || null;
}
export function categoriaPorSlug(slug) {
  return CATEGORIAS.find((c) => c.slug === slug) || null;
}
export function nomeCategoria(slug) {
  const c = categoriaPorSlug(slug);
  return c ? c.nome : slug;
}
export function produtosDaCategoria(slug) {
  return PRODUTOS.filter((p) => p.categoria === slug);
}
export function modelosDaMarca(nomeMarca) {
  const m = MARCAS.find((x) => x.nome === nomeMarca);
  return m ? m.modelos : [];
}

/* Versões de um modelo. Lista vazia = modelo sem versões (pula o passo). */
export function versoesDoModelo(marca, modelo) {
  const m = modelosDaMarca(marca).find((x) => x.nome === modelo);
  if (!m) return [];
  return m.versoes || [];
}

/* Anos aceitos para (marca, modelo, versão). */
export function anosDoModelo(marca, modelo, versao) {
  const m = modelosDaMarca(marca).find((x) => x.nome === modelo);
  if (!m) return [];
  const versoes = m.versoes || [];
  if (!versoes.length) return m.anos || [];
  if (versao) {
    const v = versoes.find((x) => x.nome === versao);
    return v ? v.anos : [];
  }
  // sem versão escolhida: une os anos de todas (para o passo ser opcional)
  const todos = new Set();
  versoes.forEach((v) => v.anos.forEach((a) => todos.add(a)));
  return Array.from(todos).sort((a, b) => a - b);
}

export function cilindradaDoModelo(marca, modelo) {
  const m = modelosDaMarca(marca).find((x) => x.nome === modelo);
  return m ? m.cilindrada || '' : '';
}

/* Desconto Pix em CENTAVOS INTEIROS (ponto flutuante erra em valores redondos). */
export function precoPix(preco) {
  const centavos = Math.round(Number(preco) * 100);
  const desconto = Math.round(centavos * LOJA.pixDesconto);
  return (centavos - desconto) / 100;
}

export function parcelaDe(preco) {
  return Math.round((Number(preco) / LOJA.parcelas) * 100) / 100;
}

export function fotosDoProduto(p) {
  if (!p) return [];
  if (p.fotos && p.fotos.length) return p.fotos;
  return p.foto ? [p.foto] : [];
}

export function ehUniversal(produto) {
  return !produto || !produto.compat || produto.compat.length === 0;
}

/* Rótulo curto da moto: "Honda CG 160 Fan 2024" */
export function rotuloMoto(moto) {
  if (!moto || !moto.marca || !moto.modelo) return '';
  return [moto.marca, moto.modelo, moto.versao, moto.ano].filter(Boolean).join(' ');
}

/*
   A PERGUNTA CENTRAL: esta peça serve nesta moto?
   Universal serve em qualquer uma. Específica precisa bater marca, modelo,
   versão (quando a compatibilidade restringe) e ano dentro da faixa.
*/
export function produtoServeEm(produto, moto) {
  if (!produto) return false;
  if (ehUniversal(produto)) return true;
  if (!moto || !moto.marca || !moto.modelo) return false;

  return produto.compat.some((c) => {
    if (c.marca !== moto.marca) return false;
    if (c.modelo !== moto.modelo) return false;
    // versão: só restringe se a compatibilidade citar uma versão específica
    if (c.versao && moto.versao && c.versao !== moto.versao) return false;
    if (moto.ano == null) return true;
    return moto.ano >= c.anoInicio && moto.ano <= c.anoFim;
  });
}

/* Lista as aplicações de uma peça, pronta para a tabela do produto e do admin. */
export function aplicacoesDoProduto(produto) {
  if (!produto || ehUniversal(produto)) return [];
  return produto.compat.map((c) => ({
    marca: c.marca,
    modelo: c.modelo,
    versao: c.versao || 'Todas as versões',
    anos: `${c.anoInicio} a ${c.anoFim}`,
    cilindrada: c.cilindrada || '',
    observacao: c.observacao || '',
  }));
}
