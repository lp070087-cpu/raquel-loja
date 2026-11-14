# Loja Raquel — vitrine e área do cliente

## Encerramento factual — 29/10/2026

Os painéis ADMIN (13 seções) e STAFF (3 seções) estão integrados à API e ao Neon testing. **A última repetição master terminou com 2 etapas aprovadas e 1 falha**, no login final do cliente, sob memória livre próxima de 42 MB. Gestão e compra/persistência passaram; pagamento, retirada e histórico foram percorridos na etapa3, mas a consulta final do cliente não foi concluída no limite. Não declarar aprovação integral dessa repetição.

O caso único master havia passado anteriormente; `evidence/master-panels/result.json` preserva essa execução anterior e não comprova aprovação do último reteste serial. O estado final e a próxima ação estão em [FINALIZACAO-VALIDACAO.md](FINALIZACAO-VALIDACAO.md) e [PROGRESSO-CODEX.md](PROGRESSO-CODEX.md).

Nesta retomada passaram: 13 leituras administrativas reais, smoke do bootstrap, 4 cenários públicos, 2 de cliente/balcão, 27 regressões de navegador, 16 testes nativos, 56 backend e 40 verificações de sintaxe, além de TypeScript/build. As 37 integrações Neon anteriores foram preservadas, sem nova execução. A limpeza retirou privilégios/sessões das fixtures mantendo registros. Loja em `http://127.0.0.1:8000/` e API testing em `http://127.0.0.1:3001/api/health`, verificadas com HTTP200. Operação: [OPERACAO-PAINEIS.md](OPERACAO-PAINEIS.md). Dados comerciais ficam por último; SMTP, reembolso e preparação de produção são dependências externas. Push, merge, migrações em production e publicação continuam sem autorização.

Estado atual (28/10/2026): `DATABASE_URL` corresponde a `production`, mantida sem tabelas nem migrações nesta etapa. A validação real foi executada exclusivamente com `TEST_DATABASE_URL` em `testing`. Consulte `VALIDACAO-TESTING-REAL.md`. Para revisar localmente, use `npm run dev:testing` dentro de `backend/` e `npm run dev` na raiz; não use o servidor padrão contra production antes de uma futura autorização de migração.

Para repetir a validação: `npm run db:targets`, `npm run test:integration` e, se necessário preparar o catálogo de testing, `npm run db:testing:seed`, todos em `backend/`. Com o frontend na porta 8000 e a porta 3001 livre, execute `npm run test:frontend:real` na raiz. A suíte real inicia, reinicia e encerra sua própria API, sempre com verificação dos IDs das branches. Não inicie outra API na porta 3001 simultaneamente.

O frontend existente continua em HTML, CSS e módulos ES. A API fica em `backend/`, usa Node.js, TypeScript, Fastify, Prisma e PostgreSQL e nunca disponibiliza a conexão do banco ao navegador. Os painéis utilizam dados reais da API e autorização ADMIN/STAFF no servidor.

## Ambiente local

Pré-requisito: Node.js LTS compatível com `>=22.12`. A implementação foi preparada no Node 24.19.0.

1. Em `backend/`, execute `npm ci` depois de disponível o arquivo de lock (ou `npm install` para gerar o lock).
2. Copie `backend/.env.example` para `backend/.env` se esse arquivo ainda não existir. Não sobrescreva credenciais existentes.
3. Configure `DATABASE_URL` com uma conexão **Neon de desenvolvimento**, incluindo `sslmode=require`. Use o endereço fornecido pelo Neon, sem inventar host ou usuário.
4. Configure `TEST_DATABASE_URL` com um banco ou branch **isolado**. Não use o banco da loja para testes destrutivos.
5. Configure `SESSION_SECRET` com pelo menos 32 caracteres aleatórios, mantendo o mesmo segredo entre reinícios. Ele protege também os códigos de retirada cifrados; trocar o segredo torna códigos antigos ilegíveis.
6. Para esta missão, não execute comandos normais de migração ou seed com `DATABASE_URL`: ela aponta para production. Em `backend/`, use `npm run db:generate` e os executores protegidos de testing documentados em `OPERACAO-PAINEIS.md`. O runner `npm run test:integration` verifica os destinos reais e prepara somente testing.
7. Inicie a API com `npm run dev:testing` dentro de `backend/`, ou faça `npm run build` e execute `node dist/scripts/testing-runtime.js`. Ela atende em `http://127.0.0.1:3001/api`.
8. Em outro terminal, na raiz da loja, execute `npm run dev`. Abra `http://localhost:8000` e acesse `conta.html`.

Use o mesmo hostname nas duas pontas (`localhost` ou `127.0.0.1`). A API local segue o hostname do frontend para manter o funcionamento dos cookies SameSite. `FRONTEND_ORIGINS` contém apenas as origens permitidas, com porta exata.

O servidor estático de desenvolvimento serve somente os arquivos da vitrine e bloqueia `backend/`, arquivos ocultos e segredos. Não use um servidor estático genérico que exponha a pasta inteira.

## Publicação

Nenhum deploy faz parte desta implementação. `vercel.json` mantém a configuração estática anterior; `.vercelignore` exclui backend, testes e arquivos de ambiente. A API precisa de hospedagem própria e configuração de banco.

Por padrão, fora do ambiente local o frontend usa `/api`. Para uma API em subdomínio do **mesmo site**, configure antes dos módulos:

```html
<meta name="api-url" content="https://api.seu-dominio.com/api">
```

Configure a origem HTTPS real em `FRONTEND_ORIGINS`, a URL da loja em `FRONTEND_URL`, `NODE_ENV=production` e cookies Secure. Frontend e API devem permanecer no mesmo site para os cookies SameSite=Lax; hospedar em sites distintos exige adequação explícita da política de cookies. Não configure CORS com `*` e credenciais. HTTPS é obrigatório em produção.

## Dados e regras

- `assets/js/dados.js` e as imagens originais foram preservados. O seed importa produtos por ID/SKU estáveis, imagens, compatibilidades e cupons. Não cria clientes nem senhas padrão.
- Os preços e estoques iniciais do catálogo são exemplos. O seed repetido não deve redefinir o estoque ou os preços já existentes no banco. Confirme os dados comerciais antes de operar.
- Categorias, marca e especificações visuais são preservadas como metadados do produto. A API fornece preços e estoque atuais; o checkout recalcula tudo no servidor em centavos.
- A vitrine pode mostrar o catálogo demonstrativo com aviso quando a API está indisponível. Isso não autoriza a criação de pedidos locais.
- Carrinho anônimo guarda apenas produtos/quantidades no navegador. Ao entrar, as quantidades são somadas ao carrinho da conta e limitadas ao estoque e a 99 por produto. Favoritos são unidos. A cópia anônima só é removida após confirmação do servidor; uma chave identifica a mesclagem para evitar repetição.
- Carrinho e favoritos autenticados usam a API. Senhas e tokens de sessão nunca ficam no localStorage. Os dados antigos de demonstração não são convertidos em pedidos reais.
- O pedido é criado em transação serializável. A baixa de estoque ocorre **na criação**, mesmo com pagamento pendente. Uma chave por usuário impede submissão duplicada. O cancelamento permitido de pedido não pago devolve estoque uma única vez. Expiração automática não integra esse fluxo; pedidos pagos exigem política de reembolso.
- Pedidos preservam nome, SKU, preço unitário e totais no momento da compra. Não se armazenam dados de cartão.
- Códigos de retirada são gerados no servidor, armazenados como hash e também cifrados para exibição ao proprietário. O atendimento autorizado exige código e identificação do pedido para pagamento e retirada.
- Pix e cartão não processam cobranças; selecionar um método mantém o pagamento pendente. Entrega é bloqueada enquanto não houver cotação real de frete. Retirada é o fluxo de pedido disponível.

## Autenticação e e-mail

Senhas usam Argon2id; sessões usam token aleatório com hash no banco e cookie HttpOnly. Há validação Zod, CSRF com origem autorizada e token, limites de requisição e consultas com Prisma. Os recursos privados filtram pelo usuário autenticado.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM` para envio de recuperação e verificação. Sem SMTP, a interface informa a limitação e não afirma que enviou mensagens. Tokens de recuperação são temporários e de uso único; redefinir senha revoga sessões.

## Verificações

Na raiz:

```text
npm run check
npm run test:commerce
npm run test:api-client
npm run test:static
npm run test:frontend
```

Em `backend/`:

```text
npm run typecheck
npm run build
npm test
npm run test:integration
```

Os testes de navegador precisam do frontend na porta 8000 e do Chromium do Playwright (`npx playwright install chromium` dentro de `backend/`, se necessário). Testes com API simulada verificam a interface; não comprovam Neon, persistência ou autorização real do backend. Um teste separado inicia Fastify temporariamente na porta 3101 para validar CORS, cookies e CSRF reais, sem banco. Os testes de banco devem usar exclusivamente a conexão isolada de teste. `test:integration` verifica o isolamento, aplica migrações somente nesse destino e executa a suíte PostgreSQL.

Consulte `ENTREGA.md` para resultados efetivamente executados e bloqueios externos. Código escrito ou migração gerada não comprova banco funcional.

A implementação e as evidências do código de retirada de cinco dígitos estão em [RETIRADA-VALIDACAO.md](RETIRADA-VALIDACAO.md).

Pagamento presencial e atendimento: [PAGAMENTO-PRESENCIAL.md](PAGAMENTO-PRESENCIAL.md). Validação final: 26 integrações Neon, 24 testes backend, 13 testes frontend/servidor e dois cenários reais de navegador aprovados. Atendimento e cliente validados em desktop e mobile; sem alterações em production.

Finalização do site público: [SITE-PUBLICO-VALIDACAO.md](SITE-PUBLICO-VALIDACAO.md), com repetição após integração registrada em [FINALIZACAO-VALIDACAO.md](FINALIZACAO-VALIDACAO.md). Quatro cenários públicos reais, 27 regressões e 16 testes nativos passaram. Execute `npm run test:public:real` com backend compilado atualizado, frontend na porta 8000 e porta 3001 livre. A arquitetura implementada está em [ARQUITETURA-PAINEIS.md](ARQUITETURA-PAINEIS.md).
