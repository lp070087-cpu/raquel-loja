# Vercel + Neon — 17/11/2026

## Configuração realizada

Login oficial Vercel restabelecido por confirmação OAuth do usuário. Projeto existente `raquel-loja-ew91`; Neon existente `Raquel`, região São Paulo. Nenhum novo banco ou projeto criado.

Foram criadas sete variáveis em **production** e sete em **preview**:

- DATABASE_URL — secreta, conexão da branch correspondente.
- DATABASE_BRANCH — production ou testing.
- NEON_BRANCH_ID — identidade real esperada, conferida pelo servidor antes de aceitar requisições.
- SESSION_SECRET — secreta; produção possui chave independente, prévia preserva a chave do testing para pedidos já existentes.
- FRONTEND_URL, FRONTEND_ORIGINS e NODE_ENV.

Valores privados nunca são impressos. A cópia local de recuperação da chave de produção fica em `backend/.env.vercel.production.local`, ignorada pelo Git e pelo upload. O Neon fornece as conexões; as variáveis de aplicação ficam no servidor Vercel, não em JavaScript do navegador nem como parâmetros no PostgreSQL.

SMTP não foi inventado/configurado: faltam provedor e credenciais confirmados. Nenhuma NEON_API_KEY administrativa foi disponibilizada ao aplicativo.

## Implementação de hospedagem

- API única `api/index.mjs`, usando HTTP nativo do Fastify, sem porta de escuta permanente. Prisma e aplicação reutilizados por instância.
- Build gera cliente Prisma e backend, copiando somente HTML/assets/public/admin para `dist-public`. Código do backend, scripts, configurações, testes e segredos não são arquivos públicos.
- `/api/*` permanece no mesmo domínio. Cookies Secure/HttpOnly, CSRF e CORS explícito; a prévia inclui somente seu próprio domínio Vercel. Proxy confiável habilitado somente no ambiente Vercel.
- Node 24, alinhado ao ambiente local. A ponte inicial com `app.inject` falhou na nuvem por ERR_REQUIRE_ESM entre light-my-request e cookie; substituída pela entrada HTTP nativa, sem trocar dependências ou alterar modelos de banco.
- Diagnósticos privados da prévia removem URLs de banco, senhas e segredos; respostas públicas nunca exibem detalhes internos.

## Validação comprovada

- TypeScript e build aprovados; cinco testes do adaptador com HTTP real aprovados, incluindo cookies, CSRF, corpo excessivo e recuperação de inicialização.
- Verificação da prévia: health e catálogo 200, banco conectado, catálogo 64 itens antes das fixtures; ADMIN anônimo 401; arquivos privados 404.
- Playwright na nuvem: 1/1 aprovado em 1,6 min (1,7 min total), um worker. Cadastro real, sessão HTTPS, produto/carrinho, pedido PENDING/código de cinco dígitos, preparação ADMIN, atendimento STAFF, pagamento CASH e retirada, retorno do cliente com COMPLETED/PAID. Bloqueios 403/404, retirada sem pagamento e duplicidades 409 conferidos. Dados exclusivamente sintéticos em testing; privilégios temporários retirados no afterAll.
- Correções de automação: consultar cookies no caminho `/api/`; consultar pedido persistido após redirecionamento em vez de tentar reler a resposta de rede descartada pelo navegador. Não foram aumentados timeouts.
- A proteção de autenticação Vercel da prévia continua habilitada. A CLI criou uma credencial de automação de projeto para os testes privados, sem divulgar seu valor; ela fica sob controle de Deployment Protection e não é uma senha de cliente/funcionário.

Evidências locais, não versionadas: `evidence/deployment/environment-result.json`, `preview-probe.json`, `cloud/result.json` e capturas em `cloud/`.

Prévia validada: https://raquel-loja-ew91-p1o27qd8j-lp070087-5894s-projects.vercel.app

## Produção: bloqueio explícito preservado

Leitura real confirmou **zero tabelas e zero migrações** em production. Testing possui as cinco migrações e 23 tabelas. As identidades reais das branches são diferentes e conferem com `config/deployment.json`.

A regra anterior do usuário proíbe migrações em production. Não foi aplicada nenhuma nem promovida a prévia. O site principal permanece na versão anterior até autorização específica para inicializar o banco e publicar a versão integrada.

Plano revisado: cinco migrações existentes, sem DROP/TRUNCATE/DELETE de dados; criação de estrutura no banco vazio. Importação opcional somente dos **23 produtos originais e sete categorias**, com imagens, SKUs estáveis e compatibilidades; sem copiar usuários, pedidos, sessões, pagamentos ou cupons do testing. Preços/estoques são os atuais do arquivo original e precisam de confirmação comercial. Plano e checksums em `evidence/deployment/production-plan.json`.

Somente leitura, seguro para retomar:

```powershell
node scripts/prepare-production.mjs
```

**Executar o próximo comando apenas após autorização explícita de produção e confirmação de uso do catálogo original:**

```powershell
node scripts/prepare-production.mjs --apply-production --confirm-initialize-empty-production --with-catalog
```

O executor verifica branch real e banco vazio, revisa a lista exata de migrações, não reseta/baselina banco e suprime a saída bruta do Prisma. Depois é necessário conferir persistência/health de produção antes do deploy principal. Não usar seed demonstrativo geral em produção, pois ele inclui cupons.

## Próximas informações operacionais

Identificação/e-mail da administradora e cadastro individual com senha escolhida por ela; nenhum acesso real com senha fixa. Dados comerciais/fiscais confirmados, SMTP e política de reembolso continuam pendentes. Não declarar o projeto totalmente finalizado enquanto essas etapas e a produção real não forem validadas.
