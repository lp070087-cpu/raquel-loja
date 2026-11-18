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

## Produção inicializada mediante autorização específica

Após a leitura inicial do banco vazio, o usuário autorizou expressamente a estrutura e o catálogo original. As cinco migrações foram aplicadas uma única vez; importados **23 produtos originais e sete categorias**, sem copiar clientes, pedidos, sessões, pagamentos ou cupons de testing. A conferência real está em `evidence/deployment/production-database.json`. Não repetir a inicialização nem usar seed demonstrativo geral em produção.

Loja oficial: https://raquel-loja-ew91.vercel.app/ . A API de produção respondeu 200 com catálogo real; arquivos privados continuam inacessíveis. A administradora cadastrou sua própria conta e recebeu o papel ADMIN por autorização, com senha preservada e auditoria. Login individual em `/admin/login`; não existe senha compartilhada fornecida pelo projeto.

A autorização anterior de inicialização não permite futuras migrações ou testes destrutivos em produção. Nesta revisão do atendimento, as escritas e os pagamentos simulados ocorreram exclusivamente em testing.

Prévia atual do atendimento: https://raquel-loja-ew91-qn001cphk-lp070087-5894s-projects.vercel.app . Fluxos de compra e retirada executados em navegador visível/maximizado, incluindo CASH, PIX e CARD, e revisão real dos 13 módulos. Relatórios em `evidence/deployment/cloud-desktop/` e `cloud-navigation/`.

## Próximas informações operacionais

Demais funcionários devem ter contas individuais e permissões concedidas pela administradora; nunca usar as fixtures de testing como acessos reais. Dados comerciais/fiscais confirmados, revisão comercial de preços/estoques, SMTP e política de reembolso continuam pendentes. Entrega permanece desativada até existir configuração e operação próprias.
