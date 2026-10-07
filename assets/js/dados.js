/* ============================================================================
   DADOS — TUDO QUE A LOJA MOSTRA SAI DAQUI
   ----------------------------------------------------------------------------
   Único arquivo a mexer para trocar conteúdo. Nenhuma página tem produto,
   preço ou texto de loja cravado no HTML.

   ---------------------------------------------------------------------------
   AS FOTOS SÃO REAIS
   ---------------------------------------------------------------------------
   Saíram de ../public/ (as pastas originais do projeto) e foram copiadas com
   nome limpo para public/produtos/<categoria>/. O mapeamento foi:

       public/oleo/                 -> public/produtos/oleos/         (5 fotos)
       public/filtro de oleo/       -> public/produtos/filtros/       (2)
       public/disco de freio/       -> public/produtos/freios/        (4)
       public/pastilha de freio/    -> public/produtos/freios/        (3)
       public/tração...retentor/    -> public/produtos/transmissao/   (2)
       public/pneu/                 -> public/produtos/pneus/         (5)
       public/capacete/             -> public/produtos/capacetes/     (4)
       public/capa de chuva/        -> public/produtos/capas/         (2)
       public/imagem de referencia
         para animação do banner/   -> public/banner/                 (8)

   Cada foto real virou um produto. Onde a mesma peça aparece em mais de uma
   foto (frente/verso/verso da embalagem), o produto tem GALERIA — é a mesma
   peça vista de ângulos diferentes, não dois produtos inventados.

   AVISO HONESTO: preços, estoque, avaliações e pedidos são EXEMPLOS desta
   apresentação. Na versão real vêm do banco, nunca deste arquivo.
   ============================================================================ */

/* ---------------------------------------------------------------- LOJA ---- */
export const LOJA = {
  nome: 'Moto Peças',                 // placeholder — troque quando houver marca
  slogan: 'Peças e acessórios para sua moto',
  cidade: 'Recife',
  estado: 'PE',
  whatsapp: '5581900000000',
  whatsappExibicao: '(81) 90000-0000',
  email: 'contato@motopecas.com.br',
  endereco: {
    rua: 'Av. das Motos, 1200',
    bairro: 'Boa Viagem',
    cidade: 'Recife',
    estado: 'PE',
    cep: '51020-000',
  },
  horario: [
    { dia: 'Segunda a sexta', hora: '8h às 18h' },
    { dia: 'Sábado', hora: '8h às 13h' },
    { dia: 'Domingo', hora: 'Fechado' },
  ],
  freeShippingFrom: 299,
  pixDesconto: 0.05,
  demonstrativo: true,
};

/* --------------------------------------------------------------- MARCAS --- */
/* Cada modelo traz os anos que a loja atende — é o que alimenta o localizador
   (marca → modelo → ano). */
export const MARCAS = [
  {
    nome: 'Honda',
    modelos: [
      { nome: 'CG 160', anos: [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026] },
      { nome: 'Biz 125', anos: [2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'Bros 160', anos: [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'XRE 300', anos: [2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'CB 300F', anos: [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026] },
      { nome: 'Pop 110i', anos: [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'Titan 160', anos: [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
    ],
  },
  {
    nome: 'Yamaha',
    modelos: [
      { nome: 'Fazer 250', anos: [2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'Factor 150', anos: [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'Crosser 150', anos: [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'Lander 250', anos: [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'XTZ 150', anos: [2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023] },
    ],
  },
  {
    nome: 'Suzuki',
    modelos: [
      { nome: 'Yes 125', anos: [2013,2014,2015,2016,2017,2018,2019,2020,2021] },
      { nome: 'Intruder 125', anos: [2013,2014,2015,2016,2017,2018,2019,2020] },
      { nome: 'GSX 150', anos: [2016,2017,2018,2019,2020,2021,2022,2023] },
      { nome: 'Burgman 125', anos: [2015,2016,2017,2018,2019,2020,2021,2022] },
    ],
  },
  {
    nome: 'Kawasaki',
    modelos: [
      { nome: 'Ninja 400', anos: [2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'Z400', anos: [2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'Versys 300', anos: [2017,2018,2019,2020,2021,2022,2023] },
    ],
  },
  {
    nome: 'BMW',
    modelos: [
      { nome: 'G 310 R', anos: [2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'G 310 GS', anos: [2017,2018,2019,2020,2021,2022,2023,2024,2025] },
      { nome: 'F 850 GS', anos: [2019,2020,2021,2022,2023,2024,2025] },
    ],
  },
  {
    nome: 'Dafra',
    modelos: [
      { nome: 'Citycom 300', anos: [2013,2014,2015,2016,2017,2018,2019,2020] },
      { nome: 'Next 250', anos: [2014,2015,2016,2017,2018,2019,2020] },
      { nome: 'Zig 50', anos: [2013,2014,2015,2016,2017,2018] },
    ],
  },
  {
    nome: 'Shineray',
    modelos: [
      { nome: 'XY 50', anos: [2013,2014,2015,2016,2017,2018,2019,2020] },
      { nome: 'Jet 125', anos: [2014,2015,2016,2017,2018,2019,2020] },
      { nome: 'Phoenix 50', anos: [2013,2014,2015,2016,2017,2018] },
    ],
  },
];

/* ----------------------------------------------------------- CATEGORIAS --- */
/*
   7 categorias — exatamente as que têm FOTO REAL em public/. A oitava
   ("Acessórios") não ficou vazia: ela é um AGRUPAMENTO de capacetes + capas no
   menu, e o catálogo já entende categoria separada por vírgula.
   Nada de categoria sem produto por trás.
*/
export const CATEGORIAS = [
  { slug: 'oleos',       nome: 'Óleos',           chamada: 'Lubrificantes e fluidos', foto: 'public/produtos/oleos/oleo-01.jpg' },
  { slug: 'filtros',     nome: 'Filtros',         chamada: 'Óleo e ar',               foto: 'public/produtos/filtros/filtro-oleo-01.jpg' },
  { slug: 'freios',      nome: 'Freios',          chamada: 'Pastilhas e discos',      foto: 'public/produtos/freios/disco-freio-02.jpg' },
  { slug: 'transmissao', nome: 'Transmissão',     chamada: 'Kits, coroas e correntes',foto: 'public/produtos/transmissao/transmissao-02.jpg' },
  { slug: 'pneus',       nome: 'Pneus',           chamada: 'Asfalto e trilha',        foto: 'public/produtos/pneus/pneu-01.jpg' },
  { slug: 'capacetes',   nome: 'Capacetes',       chamada: 'Proteção para o piloto',  foto: 'public/produtos/capacetes/capacete-01.jpg' },
  { slug: 'capas',       nome: 'Capas de chuva',  chamada: 'Para o piloto e para a moto', foto: 'public/produtos/capas/capa-chuva-01.jpg' },
];

/* Agrupamentos usados no menu (não são categoria de produto, são atalhos). */
export const AGRUPAMENTOS = {
  acessorios: {
    nome: 'Acessórios',
    categorias: ['capacetes', 'capas'],
    foto: 'public/produtos/capacetes/capacete-04.jpg',
  },
  equipamento: {
    nome: 'Equipamento',
    categorias: ['capacetes', 'capas'],
    foto: 'public/produtos/capacetes/capacete-02.jpg',
  },
};

/* -------------------------------------------------------------- PRODUTOS -- */
/*
   compat: []                          -> UNIVERSAL (serve em qualquer moto)
   compat: [{marca, modelo, de, ate}]  -> peça específica

   `foto`   = caminho da foto real (sempre presente aqui).
   `fotos`  = galeria, quando existe mais de uma foto da mesma peça.

   >>> CONFIRMAR COM A DONA: preços, estoque e o que cada foto representa. <<<
*/
export const PRODUTOS = [
  /* ==================================================================== ÓLEOS */
  {
    id: 'oleo-motul-7100-10w40',
    nome: 'Óleo Motul 7100 10W40 Sintético',
    categoria: 'oleos',
    marca: 'Motul',
    sku: 'OL-MOTUL-7100',
    preco: 89.9,
    precoDe: 109.9,
    custo: 55,
    estoque: 24,
    estoqueMinimo: 8,
    foto: 'public/produtos/oleos/oleo-01.jpg',
    descricao: 'Óleo sintético 10W40 da linha 7100, para motores de alta rotação. Mantém a viscosidade em uso severo e protege a embreagem.',
    especificacoes: { Viscosidade: '10W40', Tipo: 'Sintético', Volume: '1 litro', Linha: '7100' },
    compat: [],
  },
  {
    id: 'oleo-mobil-super-5w30',
    nome: 'Óleo Mobil Super Moto 5W30',
    categoria: 'oleos',
    marca: 'Mobil',
    sku: 'OL-MOBIL-5W30',
    preco: 54.9,
    precoDe: 64.9,
    custo: 33,
    estoque: 31,
    estoqueMinimo: 10,
    foto: 'public/produtos/oleos/oleo-02.jpg',
    descricao: 'Semissintético 5W30 para motores modernos de baixa cilindrada. Partida a frio mais fácil e menor consumo.',
    especificacoes: { Viscosidade: '5W30', Tipo: 'Semissintético', Volume: '1 litro', Linha: 'Super Moto' },
    compat: [],
  },
  {
    id: 'oleo-motul-20w50',
    nome: 'Óleo Motul 20W50 Mineral — caixa com 4',
    categoria: 'oleos',
    marca: 'Motul',
    sku: 'OL-MOTUL-20W50',
    preco: 159.9,
    precoDe: 189.9,
    custo: 98,
    estoque: 12,
    estoqueMinimo: 6,
    foto: 'public/produtos/oleos/oleo-03.jpg',
    descricao: 'Caixa fechada com quatro unidades de 20W50 mineral. Rende quatro trocas — sai mais barato para quem roda muito.',
    especificacoes: { Viscosidade: '20W50', Tipo: 'Mineral', Volume: '4 x 1 litro', Linha: 'Moto' },
    compat: [],
  },
  {
    id: 'oleo-lubrax-10w40',
    nome: 'Óleo Lubrax 10W40 Semissintético',
    categoria: 'oleos',
    marca: 'Lubrax',
    sku: 'OL-LUBRAX-10W40',
    preco: 46.9,
    precoDe: 56.9,
    custo: 28,
    estoque: 27,
    estoqueMinimo: 10,
    foto: 'public/produtos/oleos/oleo-04.jpg',
    descricao: 'Semissintético 10W40 para o uso urbano do dia a dia. Boa proteção contra desgaste e preço acessível.',
    especificacoes: { Viscosidade: '10W40', Tipo: 'Semissintético', Volume: '1 litro', Linha: 'Moto' },
    compat: [],
  },
  {
    id: 'oleo-mobil-20w50',
    nome: 'Óleo Mobil Super Moto 20W50',
    categoria: 'oleos',
    marca: 'Mobil',
    sku: 'OL-MOBIL-20W50',
    preco: 39.9,
    precoDe: 49.9,
    custo: 24,
    estoque: 38,
    estoqueMinimo: 12,
    foto: 'public/produtos/oleos/oleo-05.jpg',
    descricao: 'Mineral 20W50 para motores 4 tempos. O óleo mais vendido da loja para CG, Titan e Factor.',
    especificacoes: { Viscosidade: '20W50', Tipo: 'Mineral', Volume: '1 litro', Linha: 'Super Moto' },
    compat: [],
  },

  /* ================================================================= FILTROS */
  {
    id: 'filtro-oleo-tecfil',
    nome: 'Filtro de Óleo Tecfil CG 160 / Titan 160',
    categoria: 'filtros',
    marca: 'Tecfil',
    sku: 'FI-TECFIL-CG160',
    preco: 19.9,
    precoDe: 25.9,
    custo: 10.5,
    estoque: 62,
    estoqueMinimo: 20,
    foto: 'public/produtos/filtros/filtro-oleo-01.jpg',
    fotos: [
      'public/produtos/filtros/filtro-oleo-01.jpg',
      'public/produtos/filtros/filtro-oleo-02.jpg',
    ],
    descricao: 'Filtro de óleo com elemento filtrante de papel especial. Retém impurezas e preserva a vida útil do motor.',
    especificacoes: { Aplicação: 'Honda 160', Roscas: 'M20 x 1,5', Tipo: 'Elemento filtrante' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
      { marca: 'Honda', modelo: 'Bros 160', de: 2015, ate: 2025 },
      { marca: 'Honda', modelo: 'XRE 300', de: 2013, ate: 2025 },
      { marca: 'Honda', modelo: 'CB 300F', de: 2015, ate: 2026 },
    ],
  },

  /* ================================================================== FREIOS */
  {
    id: 'pastilha-cobreq-cg160',
    nome: 'Pastilha de Freio Cobreq CG 160 Dianteira',
    categoria: 'freios',
    marca: 'Cobreq',
    sku: 'FR-PAST-CG160-D',
    preco: 54.9,
    precoDe: 69.9,
    custo: 31,
    estoque: 38,
    estoqueMinimo: 12,
    foto: 'public/produtos/freios/pastilha-01.jpg',
    fotos: [
      'public/produtos/freios/pastilha-01.jpg',
      'public/produtos/freios/pastilha-02.jpg',
    ],
    descricao: 'Pastilha dianteira com composto orgânico de alta performance. Frenagem firme, baixo ruído e pouca poeira na roda.',
    especificacoes: { Posição: 'Dianteira', Composto: 'Orgânico', Par: 'Jogo com 2 pastilhas', Marca: 'Cobreq' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
      { marca: 'Honda', modelo: 'Bros 160', de: 2015, ate: 2025 },
    ],
  },
  {
    id: 'pastilha-cobreq-traseira',
    nome: 'Pastilha de Freio Traseira — Linha Cobreq',
    categoria: 'freios',
    marca: 'Cobreq',
    sku: 'FR-PAST-TRAS',
    preco: 49.9,
    precoDe: 59.9,
    custo: 28,
    estoque: 29,
    estoqueMinimo: 12,
    foto: 'public/produtos/freios/pastilha-03.jpg',
    descricao: 'Jogo de pastilhas traseiras com a mesma formulação da linha dianteira. Desgaste parelho entre os dois eixos.',
    especificacoes: { Posição: 'Traseira', Composto: 'Orgânico', Par: 'Jogo com 4 pastilhas' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Factor 150', de: 2014, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Fazer 250', de: 2013, ate: 2025 },
    ],
  },
  {
    id: 'disco-freio-cg160',
    nome: 'Disco de Freio Dianteiro CG 160',
    categoria: 'freios',
    marca: 'Fremax',
    sku: 'FR-DISCO-CG160',
    preco: 189.9,
    precoDe: 229.9,
    custo: 112,
    estoque: 12,
    estoqueMinimo: 5,
    foto: 'public/produtos/freios/disco-freio-02.jpg',
    fotos: [
      'public/produtos/freios/disco-freio-02.jpg',
      'public/produtos/freios/disco-freio-03.jpg',
      'public/produtos/freios/disco-freio-04.jpg',
      'public/produtos/freios/disco-freio-01.jpg',
    ],
    descricao: 'Disco ventilado em aço inox, com espessura dentro da tolerância de fábrica. Recupera a frenagem original da moto.',
    especificacoes: { Diâmetro: '240 mm', Espessura: '3,5 mm', Material: 'Aço inox', Furação: '6 furos' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
      { marca: 'Honda', modelo: 'Biz 125', de: 2016, ate: 2025 },
      { marca: 'Honda', modelo: 'Pop 110i', de: 2016, ate: 2025 },
    ],
  },
  {
    id: 'disco-freio-xre300',
    nome: 'Disco de Freio Dianteiro XRE 300 / Bros',
    categoria: 'freios',
    marca: 'Fremax',
    sku: 'FR-DISCO-XRE300',
    preco: 229.9,
    precoDe: 279.9,
    custo: 138,
    estoque: 7,
    estoqueMinimo: 5,
    foto: 'public/produtos/freios/disco-freio-03.jpg',
    descricao: 'Disco dianteiro para uso misto asfalto e terra. Tratamento anticorrosivo e boa dissipação de calor.',
    especificacoes: { Diâmetro: '256 mm', Espessura: '4 mm', Material: 'Aço inox', Furação: '6 furos' },
    compat: [
      { marca: 'Honda', modelo: 'XRE 300', de: 2013, ate: 2025 },
      { marca: 'Honda', modelo: 'Bros 160', de: 2015, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Lander 250', de: 2015, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Crosser 150', de: 2015, ate: 2025 },
      { marca: 'Yamaha', modelo: 'XTZ 150', de: 2013, ate: 2023 },
    ],
  },

  /* ============================================================ TRANSMISSÃO */
  {
    id: 'kit-transmissao-cg160',
    nome: 'Kit Transmissão Completo CG 160',
    categoria: 'transmissao',
    marca: 'Riffel',
    sku: 'TR-KIT-CG160',
    preco: 219.9,
    precoDe: 269.9,
    custo: 132,
    estoque: 19,
    estoqueMinimo: 6,
    foto: 'public/produtos/transmissao/transmissao-02.jpg',
    descricao: 'Kit com relação, coroa e pinhão. Conjunto balanceado, que reduz ruído e alonga a vida dos três componentes.',
    especificacoes: { Relação: '14 x 39', Passo: '428H', Elos: '110', Retentor: 'Com retentor' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
      { marca: 'Honda', modelo: 'Bros 160', de: 2015, ate: 2025 },
    ],
  },
  {
    id: 'corrente-sem-retentor',
    nome: 'Corrente de Transmissão sem Retentor',
    categoria: 'transmissao',
    marca: 'Riffel',
    sku: 'TR-COR-SEM-RET',
    preco: 89.9,
    precoDe: 109.9,
    custo: 52,
    estoque: 26,
    estoqueMinimo: 10,
    foto: 'public/produtos/transmissao/transmissao-01.jpg',
    descricao: 'Corrente sem retentor, com elo de encaixe. Mais leve, silenciosa e de manutenção simples — a mais usada na cidade.',
    especificacoes: { Passo: '428H', Elos: '110', Retentor: 'Sem retentor', Fechamento: 'Elo clip' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Biz 125', de: 2013, ate: 2025 },
      { marca: 'Honda', modelo: 'Pop 110i', de: 2016, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Factor 150', de: 2014, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Crosser 150', de: 2015, ate: 2025 },
    ],
  },

  /* =================================================================== PNEUS */
  {
    id: 'pneu-90-90-18',
    nome: 'Pneu 90/90-18 Dianteiro Asfalto',
    categoria: 'pneus',
    marca: 'Pirelli',
    sku: 'PN-909018',
    preco: 289.9,
    precoDe: 349.9,
    custo: 175,
    estoque: 14,
    estoqueMinimo: 6,
    foto: 'public/produtos/pneus/pneu-01.jpg',
    descricao: 'Pneu dianteiro 90/90-18 com desenho para asfalto. Boa aderência em piso molhado e desgaste uniforme.',
    especificacoes: { Medida: '90/90-18', Posição: 'Dianteiro', Tipo: 'Asfalto', Carga: '57P' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
      { marca: 'Honda', modelo: 'Biz 125', de: 2013, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Factor 150', de: 2014, ate: 2025 },
    ],
  },
  {
    id: 'pneu-par-cg160',
    nome: 'Par de Pneus CG 160 — Dianteiro e Traseiro',
    categoria: 'pneus',
    marca: 'Pirelli',
    sku: 'PN-PAR-CG160',
    preco: 589.9,
    precoDe: 699.9,
    custo: 356,
    estoque: 8,
    estoqueMinimo: 4,
    foto: 'public/produtos/pneus/pneu-02.jpg',
    descricao: 'Par completo para trocar os dois pneus de uma vez. Medidas originais, com o mesmo desenho na frente e atrás.',
    especificacoes: { Dianteiro: '90/90-18', Traseiro: '110/90-17', Tipo: 'Asfalto', Par: '2 pneus' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
    ],
  },
  {
    id: 'pneu-110-90-17',
    nome: 'Pneu 110/90-17 Traseiro',
    categoria: 'pneus',
    marca: 'Pirelli',
    sku: 'PN-1109017',
    preco: 329.9,
    precoDe: 399.9,
    custo: 198,
    estoque: 11,
    estoqueMinimo: 6,
    foto: 'public/produtos/pneus/pneu-03.jpg',
    descricao: 'Pneu traseiro 110/90-17 para uso urbano. Sulcos que escoam água e mantêm a estabilidade na chuva.',
    especificacoes: { Medida: '110/90-17', Posição: 'Traseiro', Tipo: 'Asfalto', Carga: '60P' },
    compat: [
      { marca: 'Honda', modelo: 'CG 160', de: 2016, ate: 2026 },
      { marca: 'Honda', modelo: 'Titan 160', de: 2016, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Factor 150', de: 2014, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Fazer 250', de: 2013, ate: 2025 },
    ],
  },
  {
    id: 'pneu-trilha-120-80-18',
    nome: 'Pneu 120/80-18 Trilha',
    categoria: 'pneus',
    marca: 'Metzeler',
    sku: 'PN-1208018-TR',
    preco: 449.9,
    precoDe: 529.9,
    custo: 276,
    estoque: 6,
    estoqueMinimo: 4,
    foto: 'public/produtos/pneus/pneu-04.jpg',
    descricao: 'Pneu de trilha com cravos altos. Tração na terra solta, na lama e em subida íngreme.',
    especificacoes: { Medida: '120/80-18', Posição: 'Traseiro', Tipo: 'Trilha', Cravos: 'Altos' },
    compat: [
      { marca: 'Honda', modelo: 'XRE 300', de: 2013, ate: 2025 },
      { marca: 'Honda', modelo: 'Bros 160', de: 2015, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Lander 250', de: 2015, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Crosser 150', de: 2015, ate: 2025 },
      { marca: 'Yamaha', modelo: 'XTZ 150', de: 2013, ate: 2023 },
    ],
  },
  {
    id: 'pneu-trilha-dianteiro',
    nome: 'Pneu de Trilha Dianteiro',
    categoria: 'pneus',
    marca: 'Metzeler',
    sku: 'PN-TRILHA-DIANT',
    preco: 379.9,
    precoDe: null,
    custo: 232,
    estoque: 3,
    estoqueMinimo: 5,
    foto: 'public/produtos/pneus/pneu-05.jpg',
    descricao: 'Pneu dianteiro de trilha, para acompanhar o traseiro cravejado. Direção firme na terra e no cascalho.',
    especificacoes: { Posição: 'Dianteiro', Tipo: 'Trilha', Cravos: 'Altos' },
    compat: [
      { marca: 'Honda', modelo: 'XRE 300', de: 2013, ate: 2025 },
      { marca: 'Honda', modelo: 'Bros 160', de: 2015, ate: 2025 },
      { marca: 'Yamaha', modelo: 'Lander 250', de: 2015, ate: 2025 },
    ],
  },

  /* =============================================================== CAPACETES */
  {
    id: 'capacete-ls2-fechado',
    nome: 'Capacete LS2 Fechado Preto Fosco',
    categoria: 'capacetes',
    marca: 'LS2',
    sku: 'CP-LS2-FECH',
    preco: 449.9,
    precoDe: 549.9,
    custo: 276,
    estoque: 14,
    estoqueMinimo: 5,
    foto: 'public/produtos/capacetes/capacete-01.jpg',
    descricao: 'Capacete fechado com viseira antirrisco e forro removível para lavagem. Certificado pelo INMETRO.',
    especificacoes: { Tipo: 'Fechado', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Viseira: 'Antirrisco' },
    compat: [],
  },
  {
    id: 'capacete-esportivo-vermelho',
    nome: 'Capacete Esportivo Vermelho',
    categoria: 'capacetes',
    marca: 'LS2',
    sku: 'CP-ESP-VERM',
    preco: 519.9,
    precoDe: 629.9,
    custo: 318,
    estoque: 6,
    estoqueMinimo: 4,
    foto: 'public/produtos/capacetes/capacete-02.jpg',
    descricao: 'Casco esportivo com pintura vermelha e entradas de ar. Mais leve e estável em velocidade de estrada.',
    especificacoes: { Tipo: 'Fechado', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Ventilação: 'Frontal e traseira' },
    compat: [],
  },
  {
    id: 'capacete-asx-preto',
    nome: 'Capacete ASX Fechado',
    categoria: 'capacetes',
    marca: 'ASX',
    sku: 'CP-ASX-FECH',
    preco: 289.9,
    precoDe: 349.9,
    custo: 175,
    estoque: 18,
    estoqueMinimo: 6,
    foto: 'public/produtos/capacetes/capacete-03.jpg',
    descricao: 'Capacete fechado de entrada, com acabamento fosco e forro macio. Bom custo-benefício para o dia a dia.',
    especificacoes: { Tipo: 'Fechado', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Acabamento: 'Fosco' },
    compat: [],
  },
  {
    id: 'capacete-off-road',
    nome: 'Capacete Off-Road com Viseira',
    categoria: 'capacetes',
    marca: 'Stealth',
    sku: 'CP-OFF-01',
    preco: 389.9,
    precoDe: 469.9,
    custo: 238,
    estoque: 1,
    estoqueMinimo: 4,
    foto: 'public/produtos/capacetes/capacete-04.jpg',
    descricao: 'Capacete de trilha com queixeira elevada e viseira. Ventilação reforçada para uso em terra.',
    especificacoes: { Tipo: 'Off-road', Tamanhos: '56 ao 62', Certificação: 'INMETRO', Viseira: 'Com queixeira' },
    compat: [],
  },

  /* ============================================================ CAPAS DE CHUVA */
  {
    id: 'capa-chuva-piloto',
    nome: 'Capa de Chuva para Piloto',
    categoria: 'capas',
    marca: 'Braslux',
    sku: 'CA-PILOTO-01',
    preco: 89.9,
    precoDe: 119.9,
    custo: 52,
    estoque: 34,
    estoqueMinimo: 12,
    foto: 'public/produtos/capas/capa-chuva-01.jpg',
    descricao: 'Capa de chuva com costura selada e capuz com elástico. Mantém você seco sem atrapalhar o movimento nos comandos.',
    especificacoes: { Tamanhos: 'M ao GG', Material: 'PVC', Costura: 'Selada', Capuz: 'Com elástico' },
    compat: [],
  },
  {
    id: 'capa-chuva-conjunto',
    nome: 'Conjunto de Chuva Blusa e Calça',
    categoria: 'capas',
    marca: 'Braslux',
    sku: 'CA-CONJ-01',
    preco: 149.9,
    precoDe: 179.9,
    custo: 88,
    estoque: 21,
    estoqueMinimo: 8,
    foto: 'public/produtos/capas/capa-chuva-02.jpg',
    descricao: 'Conjunto completo: blusa e calça impermeáveis. Cobre pernas e tronco, indicado para quem roda todos os dias.',
    especificacoes: { Tamanhos: 'M ao GG', Material: 'Poliéster impermeável', Peças: 'Blusa + calça' },
    compat: [],
  },
];

/* ------------------------------------------------------------ AVALIAÇÕES -- */
/* Fictícias. Nomes comuns, sem cliente real. */
export const AVALIACOES = [
  {
    nome: 'Rafael Andrade', local: 'Recife, PE', nota: 5,
    texto: 'Achei a pastilha pela moto dele no site e deu certinho. Retirei na loja no mesmo dia e paguei lá. Atendimento rápido.',
    produto: 'Pastilha de Freio Cobreq CG 160 Dianteira',
  },
  {
    nome: 'Juliana Prado', local: 'Olinda, PE', nota: 5,
    texto: 'Comprei o capacete e a capa de chuva juntos. Chegou antes do prazo e a embalagem veio bem protegida.',
    produto: 'Capacete LS2 Fechado Preto Fosco',
  },
  {
    nome: 'Marcos Vinícius', local: 'Jaboatão, PE', nota: 4,
    texto: 'Bom preço no kit de transmissão, mais barato que na oficina que eu ia antes. Só demorou um dia a mais.',
    produto: 'Kit Transmissão Completo CG 160',
  },
  {
    nome: 'Camila Torres', local: 'Paulista, PE', nota: 5,
    texto: 'Gostei de escolher a moto antes de ver as peças. Comprei o filtro sem medo de errar o modelo.',
    produto: 'Filtro de Óleo Tecfil CG 160 / Titan 160',
  },
  {
    nome: 'Diego Freitas', local: 'Caruaru, PE', nota: 5,
    texto: 'Pedido pelo site, retirei no balcão com o código. Passou em dois minutos, sem fila e sem enrolação.',
    produto: 'Óleo Mobil Super Moto 20W50',
  },
  {
    nome: 'Patrícia Lima', local: 'Recife, PE', nota: 4,
    texto: 'O disco de freio veio certo e bem embalado. Achei o prazo do PAC um pouco longo, mas valeu o preço.',
    produto: 'Disco de Freio Dianteiro CG 160',
  },
];

/* ------------------------------------------------------------------ FAQ --- */
export const FAQ = [
  {
    p: 'Como eu sei se a peça serve na minha moto?',
    r: 'Use o localizador "Encontre a peça certa para sua moto". Você escolhe marca, modelo e ano e o site mostra só o que serve. Se preferir, chame no WhatsApp com o modelo e o ano que a gente confirma para você.',
  },
  {
    p: 'Posso retirar na loja em vez de receber em casa?',
    r: 'Pode. Escolhendo "Retirar na loja" no checkout, o site gera um código de retirada. Você apresenta esse código no balcão, confere a peça e paga na hora. Não é cobrado nada online nesse caso.',
  },
  {
    p: 'Quanto tempo leva para chegar em casa?',
    r: 'Depende da transportadora e do CEP. No checkout você vê as opções com prazo e valor antes de fechar o pedido. Depois de postado, enviamos o código de rastreio.',
  },
  {
    p: 'Quais são as formas de pagamento?',
    r: 'Na retirada, você paga no balcão em dinheiro, débito, crédito ou Pix. Na entrega, combinamos no atendimento. Pedidos no Pix têm desconto na hora de fechar.',
  },
  {
    p: 'A peça tem garantia?',
    r: 'Sim. Peças e acessórios têm a garantia do fabricante. Se houver defeito de fabricação, guarde o comprovante e fale com a gente para trocar.',
  },
  {
    p: 'Consigo comprar para outra cidade?',
    r: 'Enviamos para todo o Brasil. Basta informar o CEP no checkout para ver as transportadoras disponíveis e o prazo para o seu endereço.',
  },
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
/*
   SIMULAÇÃO. Nenhuma API é chamada — o cálculo é local e está marcado como
   demonstrativo na tela. Na versão real este bloco é substituído pela API
   oficial do Melhor Envio. Ver: assets/js/frete.js
*/
export const OPCOES_FRETE_DEMO = [
  { id: 'pac', nome: 'PAC', transportadora: 'Correios', diasMin: 5, diasMax: 8, base: 22.9, porKg: 4.2 },
  { id: 'sedex', nome: 'SEDEX', transportadora: 'Correios', diasMin: 2, diasMax: 4, base: 34.9, porKg: 7.8 },
  { id: 'transportadora', nome: 'Transportadora parceira', transportadora: 'Rodo Expresso', diasMin: 3, diasMax: 6, base: 27.5, porKg: 5.6 },
];

/* ------------------------------------------------------ IMAGENS DO BANNER -- */
/* As 8 imagens de referência para animação, usadas no hero. */
export const IMAGENS_BANNER = [
  'public/banner/banner-01.jpg',
  'public/banner/banner-02.jpg',
  'public/banner/banner-03.jpg',
  'public/banner/banner-04.jpg',
  'public/banner/banner-05.jpg',
  'public/banner/banner-06.jpg',
  'public/banner/banner-07.jpg',
  'public/banner/banner-08.jpg',
];

/* --------------------------------------------------------- TEXTO DO SITE -- */
export const TEXTOS = {
  hero: {
    badge: 'Tudo para sua moto',
    tituloA: 'Sua moto pronta',
    tituloB: 'para qualquer caminho.',
    sub: 'Peças, acessórios e equipamentos para você cuidar da sua moto do seu jeito.',
    cta1: 'Encontrar minha peça',
    cta2: 'Ver produtos',
  },
  beneficios: [
    { icone: 'check', titulo: 'Peças certas', texto: 'Filtro por marca, modelo e ano antes de você comprar. Menos troca e menos devolução.' },
    { icone: 'loja', titulo: 'Retirada rápida', texto: 'Peça reservada com código. Você apresenta no balcão e paga na hora de retirar.' },
    { icone: 'caminhao', titulo: 'Envio para todo Brasil', texto: 'Transportadoras com prazo e valor à vista antes de fechar o pedido.' },
    { icone: 'cartao', titulo: 'Compra segura', texto: 'Carrinho, checkout e Pix com desconto. Sem cadastro complicado para comprar.' },
  ],
  avisoFrete: 'Valores demonstrativos nesta apresentação.',
  avisoPrecos: 'Preços, estoque e avaliações são exemplos desta demonstração.',
};

/* -------------------------------------------------- CONSTANTES DO SISTEMA -- */
export const CHAVES = {
  carrinho: 'motopecas-carrinho',
  pedidos: 'motopecas-pedidos',
  favoritos: 'motopecas-favoritos',
  moto: 'motopecas-moto',
  cliente: 'motopecas-cliente',
  ultimoPedido: 'motopecas-ultimo-pedido',
};

/* ------------------------------------------------------------- CONSULTAS -- */
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

export function anosDoModelo(marca, modelo) {
  const m = modelosDaMarca(marca).find((x) => x.nome === modelo);
  return m ? m.anos : [];
}

/* Desconto Pix, calculado em CENTAVOS INTEIROS (ponto flutuante dá resultado
   instável justamente nos valores terminados em 5). */
export function precoPix(preco) {
  const centavos = Math.round(Number(preco) * 100);
  const desconto = Math.round(centavos * LOJA.pixDesconto);
  return (centavos - desconto) / 100;
}

/* Todas as fotos de um produto (galeria ou a principal). */
export function fotosDoProduto(p) {
  if (!p) return [];
  if (p.fotos && p.fotos.length) return p.fotos;
  return p.foto ? [p.foto] : [];
}

/* Um produto serve numa moto? (marca + modelo + ano dentro da faixa) */
export function produtoServeEm(produto, moto) {
  if (!produto) return false;
  if (!produto.compat || produto.compat.length === 0) return true;
  if (!moto || !moto.marca || !moto.modelo) return false;
  return produto.compat.some(
    (c) =>
      c.marca === moto.marca &&
      c.modelo === moto.modelo &&
      (moto.ano == null || (moto.ano >= c.de && moto.ano <= c.ate))
  );
}
