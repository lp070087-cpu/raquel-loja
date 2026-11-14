# Finalização do site público — Loja Raquel

## Escopo e resultado

Retomada em 28/10/2026, preservando o projeto HTML/CSS/JavaScript, os dados e as alterações locais anteriores. Nenhum módulo administrativo ou código de negócio do backend foi alterado nesta missão. Sem dependências novas, migrações, push ou deploy.

Os três cenários reais de layout/jornada/imagens passaram em 2,4 minutos com servidor HTTP, Chrome, um worker, Fastify e Neon **testing**. Um quarto cenário, de rotação automática e movimento reduzido, passou separadamente. O servidor de testes confere os identificadores reais distintos das branches antes de operar. As escritas foram exclusivamente dados controlados de teste em testing; nenhuma escrita em production.

## Correções visuais e funcionais

- Categorias: a mídia era um `span` sem caixa de layout definida. As fotos ocupavam a área dos títulos. Agora cada card separa mídia e texto, com altura compacta, padding consistente, imagem inteira centralizada com `contain`, nomes e quantidades alinhados, hover discreto e links existentes preservados. Quatro colunas em desktop e duas em tablet/celular.
- Medidas registradas: em 320 px, altura de 356 para cerca de 195 px; em 1440 px, de 340 para cerca de 249 px. A largura desktop de 272 px foi preservada.
- Banner: foto dimensionada pela janela circular, sem tetos em pixels que reduziam o enquadramento no celular. Removida a sombra que revelava o retângulo do JPEG. Sem deformar imagens ou editar arquivos originais. Indicadores quebram para sua própria linha no celular; texto destacado pode quebrar sem deixar o ponto isolado. Animações, troca manual, links e movimento reduzido preservados.
- Cabeçalho: com moto selecionada, o atalho duplicado para o localizador deixa de competir com o nome da moto e provocar transbordamento no desktop. Os acessos pelo chip da moto e navegação continuam disponíveis.
- Home e contato: regras carregadas depois anulavam as colunas responsivas. Contato, equipamento e promoção agora passam para uma coluna em telas menores, sem cortar conteúdo ou botões.
- Produtos: links das fotos possuem camada própria. Favoritos e selos voltaram a ser sobreposições absolutas, sem ocupar células extras da grade. A área expandida de clique do restante do card e os controles foram preservados.
- Comunicação de preço: removidas simulações de desconto Pix e parcelamento das vitrines/detalhes. As telas orientam pagamento presencial, sem cobrança online.
- Busca: o termo “universal” não é mais adicionado às peças específicas.
- Filtros: escolher “Peça específica” mantém a restrição da moto ativa; “Trocar de moto” abre o localizador preservando a seleção; botão mobile reflete `aria-expanded` e aguarda a montagem do catálogo antes de habilitar.

## Verificação real executada

- Sete larguras: **320, 375, 390, 430, 768, 1024 e 1440 px**.
- Home, categorias e banner sem rolagem horizontal; medidas dos cards registradas em `evidence/public-site/after/layout.json`.
- Troca manual dos slides, imagem carregada, estado acessível ativo e link correspondente ao produto.
- **15 links internos** e as sete categorias consultados por HTTP.
- **27 imagens únicas** do catálogo disponíveis por HTTP, com tipo de conteúdo de imagem; nenhuma falha.
- Navegação por categoria e busca, seleção Honda CG 160 Fan 2020, filtro de peças específicas sem incluir peça da XRE 300, abertura pela foto do produto e favorito.
- Carrinho anônimo, redirecionamento para cadastro, mescla no servidor, checkout sem pagamento antecipado, pedido real com pagamento pendente e código de cinco dígitos, consulta em Meus Pedidos, logout e login.
- Menu mobile fecha ao selecionar Contato; filtros abrem/fecham com o estado acessível correto.
- Catálogo, produto, carrinho, localizador, contato e checkout sem transbordamento nas sete larguras.
- Nenhum erro de JavaScript ou resposta HTTP local inesperada na jornada aprovada. O 401 esperado ao consultar uma sessão anônima foi explicitamente distinguido de falhas.

Evidências sanitizadas: `evidence/public-site/after/journey.json`, `images.json` e `layout.json`. Capturas anteriores em `evidence/public-site/before/`; posteriores em `evidence/public-site/after/`. São dados de testing, não pedidos comerciais reais.

## Regressão e testes complementares

- **27 cenários existentes de navegador aprovados ao final**: 26 passaram na rodada completa; um teste simulado estava desatualizado e passou na repetição após corrigir a fixture. Preservado o caso de favoritos, carrinho, detalhes e exclusão; agora usa código `01234`, `ON_PICKUP`, pagamento pendente e o texto presencial atual. Não houve alteração de backend para satisfazer uma expectativa antiga.
- A suíte acima usa API simulada para conta/comércio; um cenário separado valida CORS, cookie HttpOnly e CSRF com Fastify real sem banco. Não confundir esses resultados com os quatro cenários do site público usando Neon real.
- **16 testes nativos aprovados**: comércio, cliente HTTP, servidor estático e três regressões novas de busca.
- **24 testes unitários backend aprovados**. As 26 integrações completas de banco ficam explicitamente puladas nesse comando; não foram repetidas nesta missão, pois não houve mudança no backend. O fluxo público foi validado com banco real pelos testes específicos acima.
- **36 verificações de sintaxe aprovadas**. Nenhum teste desta missão permanece falhando.
- A primeira execução revelou transbordamentos de layout e áreas de clique sobrepostas; os testes foram repetidos após as correções. Também foram corrigidas expectativas da nova jornada que presumiam saudação fora de Visão geral e carregamento de catálogo em páginas que não o usam. Falhas de teste não foram contornadas com cliques forçados ou aumentos sucessivos de timeout.

## Arquivos desta missão

- Estilos: `assets/css/app.css`, `assets/css/art.css`.
- Interface: `assets/js/hero.js`, `componentes.js`, `pagina-produto.js`, `pagina-catalogo.js`, `carrinho.js` e `catalogo.html`.
- Testes/configuração: `tests/public-site.spec.mjs`, `tests/public-search.test.mjs`, ajuste de fixture em `tests/frontend-account.spec.mjs`, `playwright.public.config.mjs` e script `test:public:real` em `package.json`.
- Documentação: este arquivo, README e `ARQUITETURA-PAINEIS.md`.

## Repetir a validação

Com o ambiente backend já configurado e o frontend iniciado em `http://127.0.0.1:8000` por `npm run dev`:

```powershell
npm run test:public:real
```

O comando inicia e encerra sua própria API de testing na porta 3001. Essa porta precisa estar livre. O Chrome instalado é usado com um worker; não execute outros navegadores/testes pesados em paralelo nesta máquina. Credenciais de teste são aleatórias, somente em memória/IPC; traces e gravações de sessão ficam desabilitados nos testes reais.

```powershell
npm run check
node --test tests/commerce.test.mjs tests/api-client.test.mjs tests/static-server.test.mjs tests/public-search.test.mjs
npm run test:frontend -- --workers=1
```

## Pendências externas e próxima fase

- Confirmar os dados públicos reais: nome comercial, WhatsApp, e-mail, endereço, horários e CNPJ. O cadastro atual declara nome/telefone/CNPJ de exemplo; não foram inventados substitutos. Foi solicitada confirmação ao responsável. Abrir um link do WhatsApp não comprova que o número é o da loja.
- Confirmar preços, estoque e conteúdo comercial reais antes da publicação. As capturas e pedidos desta missão usam o catálogo/fixtures de testing, não uma validação de mercadoria física.
- SMTP continua dependendo de provedor; este trabalho não validou envio real de e-mails. Entrega/frete online continuam indisponíveis, sem promessas fictícias.
- Publicação e qualquer mudança em production dependem de autorização específica.
- A próxima fase será o Admin completo. A separação Admin/Funcionário está documentada em `ARQUITETURA-PAINEIS.md`; não foi iniciada reconstrução dos painéis.
