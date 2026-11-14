# Loja Raquel API

Node.js 24 LTS, Fastify 5, TypeScript, Prisma 6.19 and PostgreSQL. The static frontend remains separate on port 8000; API is port 3001.

The lockfile records validated versions. Scoped overrides update Prisma CLI configuration dependencies (`effect` 3.x and `deepmerge-ts` 8.x) for known security fixes while retaining Prisma 6.19. Prisma validation, client generation and migration SQL generation were checked with these overrides. Recheck them when upgrading Prisma.

## Local setup

Atualização de segurança (28/10/2026): confirme o nome real da branch em `DATABASE_BRANCH` antes de qualquer escrita. Para os testes de integração, `TEST_DATABASE_URL` deve apontar para a branch Neon isolada `testing`, com `TEST_DATABASE_BRANCH=testing`. Não basta trocar o nome do banco na URL nem usar a versão pooled/direct do mesmo destino. `npm test` mantém a suíte de banco desativada por padrão; somente `npm run test:integration` habilita a execução após as travas de isolamento. Nunca use `production` nesse fluxo.

`npm run db:preflight` faz leitura real sem mostrar a conexão. `npm run db:status` consulta o Prisma com saída sanitizada. `npm run db:migrate` aceita apenas a instalação inicial aditiva em banco vazio, com branch confirmada `development` ou `testing`; bancos existentes exigem revisão específica. `npm run test:development` cria somente um cliente/endereço/moto identificados como teste controlado na branch `development`, verifica login/logout e persistência por conexão independente e mantém esses registros, sem exclusão. Nenhum desses comandos imprime senha, cookie ou URL de banco.

1. `npm install`
2. Copy `.env.example` to `.env` only if absent. Set `DATABASE_URL` to Neon server-side connection and a random `SESSION_SECRET` with at least 32 characters. Never commit `.env`.
3. `npm run db:generate`
4. `npm run db:check` — performs a real `SELECT 1`.
5. `npm run db:migrate`
6. `npm run db:seed`
7. `npm run dev`

Keep the session secret stable: it encrypts pickup codes and signs CSRF. Changing it invalidates tokens and prevents decrypting existing pickup codes. Use HTTPS in production, exact frontend origins, and host frontend/API on the same site. The server does not trust forwarded client-IP headers by default; configure trusted proxies before hosting behind a proxy. Cross-site cookie deployments need a reviewed cookie/CSRF configuration.

## Checks

`npm run typecheck`, `npm run build`, `npm test`.

Database integration tests are skipped unless `TEST_DATABASE_URL` is present. It must point to a separate database; pooled and direct aliases of the same target are rejected. Run `npm run test:integration` to deploy migrations to that test target and run the suite. Only uniquely prefixed test records are removed; no table truncation or schema reset is used. Never set a production connection as the test target.

## API conventions

All routes start with `/api`. Requests include credentials. Obtain `{csrfToken}` from `GET /auth/csrf`; send `X-CSRF-Token` on every mutation. CSRF is signed, paired to an HttpOnly cookie and bound to the authenticated session. Authentication cookies are HttpOnly, SameSite=Lax and Secure in production. Responses use `{error,message}` on errors. No token or password is stored in browser storage.

Authentication: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/request-verification`, `/auth/verify-email`. Profile: `/profile`, `/profile/password`, `/sessions`. Customer resources: `/addresses`, `/motorcycles`, `/favorites/:productId`, `/cart`, `/cart/items/:productId`, `/cart/merge`, `/coupons/validate`, `/orders`, `/orders/:id`, `/products`.

Anonymous cart merge sums matching quantities, capped by current stock and 99 items per product. A stable `mergeKey` is required; repeats do not add twice. Order creation requires a stable `idempotencyKey`; retries return the existing order. Every private query is scoped by authenticated user ID.

## Commercial limits

Checkout currently permits pickup only. Delivery is rejected until a real shipping calculation exists. Pix/card selections remain PENDING; no charge or receipt is fabricated. Stock is decremented atomically at order creation, so pending orders consume stock. There is no automatic expiry/cancellation restoration job yet; that is required before accepting unattended real sales. Order lines keep SKU, name, unit price and totals as immutable snapshots. No card data is accepted.

The importer preserves original files, product IDs, SKUs, images, categories and compatibility metadata. It creates initial example prices and stock, but repeated seeds never overwrite current prices or inventory. Coupons are initial safe demonstration offers. Product information and commercial data must be confirmed by the store before launch.

SMTP is optional. Without all SMTP fields, no password-reset or verification email is sent. Recovery responses state this limitation. Tokens are SHA256 hashes, expire in 30 minutes and are consumed atomically once; resetting a password revokes existing sessions. SMTP failures return generic responses and do not expose account existence.

No Neon connection, migrations, persistence or live browser flows should be declared verified until the corresponding command/test has actually succeeded against a configured service.
