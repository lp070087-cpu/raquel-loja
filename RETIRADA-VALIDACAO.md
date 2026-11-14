# Código de retirada — implementação e validação

Escopo: projeto existente, sem alterar o painel administrativo, sem push e sem deploy. A migração e os dados de teste ficam exclusivamente na branch Neon `testing`. `production` foi consultada somente para confirmar o isolamento real.

## Implementação

- Geração no servidor com `crypto.randomInt(0, 100000)` e `padStart(5, "0")`.
- Código recuperável protegido com AES-256-GCM, e verificação com HMAC-SHA256 e comparação de tempo constante.
- `PickupCodeReservation` mantém a reserva exclusiva de cada código permanentemente, inclusive após o consumo ou exclusão de um pedido de teste. A restrição primária resolve colisões no banco; a geração repete até 128 tentativas e falha com segurança sem criar pedido se não conseguir reservar.
- Reserva, pedido, itens, baixa de estoque e limpeza do carrinho participam da mesma transação.
- Consultas do cliente continuam limitadas ao proprietário. O código desaparece da resposta e da interface após retirada ou cancelamento.
- `POST /api/staff/orders/:id/pickup`, com corpo `{ "code": "00007" }`, exige sessão e CSRF válidos e papel `STAFF` ou `ADMIN`. O cliente não pode escolher papel ao se cadastrar.
- O endpoint exige pagamento `PAID`, pedido de retirada ativo e código correto. Trava a linha do pedido, consome a reserva e grava `COMPLETED`, `pickedUpAt` e `pickedUpById` na mesma transação.
- Cinco erros consecutivos bloqueiam o pedido por 15 minutos no banco, preservando o bloqueio entre instâncias/reinícios. Há também limite HTTP por IP e pedido. Não registra o código nos logs.
- A página de confirmação e Meus Pedidos usam os estilos existentes, mostram cinco dígitos e orientam a apresentação na loja e a necessidade de pagamento confirmado.

## Migração

`backend/prisma/migrations/20261028180000_pickup_codes/migration.sql`: aditiva; inclui papel STAFF, quatro campos de retirada no pedido, vínculo do funcionário e a tabela de reservas com índices e constraints. As migrações anteriores não foram alteradas.

O script `backend/scripts/pickup-backfill-testing.ts` verifica os identificadores reais das branches e atualiza somente pedidos de retirada pendentes sem reserva. Quatro pedidos antigos de testing foram convertidos de seis para cinco dígitos. A execução é idempotente.

O executor `backend/scripts/test-integration.ts` verifica checksums das migrações já aplicadas para evitar solicitar uma trava de migração desnecessária. Quando há migrações a aplicar, usa conexão direta do mesmo destino testing; a API mantém conexão com pool. Referência: [Neon — Prisma](https://github.com/neondatabase/website/blob/main/content/docs/guides/prisma.md).

## Arquivos desta etapa

Backend: `src/pickup.ts`, `src/app.ts`, `prisma/schema.prisma`, migração acima, `scripts/pickup-backfill-testing.ts`, `scripts/test-integration.ts`, `tests/pickup.test.ts`, `tests/pickup.integration.test.ts`, `tests/integration.test.ts`.
Frontend: `assets/js/pagina-pedido.js`, `assets/js/pagina-conta.js`, `tests/frontend-live.spec.mjs`, `playwright.live.config.mjs`.
Evidências: `evidence/integration-real-result.json`, `evidence/neon-targets-2026-10-28.json`, `evidence/live-neon/`.

## Limites operacionais

Exatamente cinco dígitos permitem 100.000 códigos no total. Como a regra impede reutilização permanente, esse é o limite de códigos da loja sob esta política; o sistema recusa novas reservas quando não consegue obter código livre. É necessário rever a regra ou ampliar o código antes do esgotamento. Cancelamentos também preservam a reserva por segurança.

A chave estável do servidor protege a recuperação e a identificação dos códigos: deve ser guardada em segredo e em backup. Trocar ou perder `SESSION_SECRET` exige migração explícita dos códigos; não basta reiniciar com outra chave. Todas as instâncias da mesma loja devem usar a mesma chave.

O pagamento nunca é aprovado pela seleção do método ou apresentação do código. Integração de pagamentos e provisionamento real de funcionários permanecem tarefas operacionais separadas. Esta etapa fornece a API autorizada de retirada; não modifica o painel administrativo e não cria uma tela de atendimento.

## Resultados

- **16/16 testes com Neon real aprovados**, incluindo os 10 anteriores e seis novos de retirada. Criação de 100 pedidos pelo checkout, com 100 códigos independentes e únicos, em dois clientes; estoque reduzido exatamente em 100 unidades.
- Zeros à esquerda preservados até a consulta HTTP; colisão forçada resolvida; código consumido recusado na tentativa de nova reserva; esgotamento de tentativas tratado com erro seguro.
- Proprietário autorizado e outro cliente bloqueado; cliente comum impedido de validar retirada; STAFF/ADMIN autorizados.
- Pagamento pendente e cancelamento bloqueados; confirmação simultânea retorna exatamente um sucesso e um conflito; auditoria e consumo persistidos; reapresentação bloqueada; código não aparece após retirada.
- Bloqueio por cinco erros persistiu após recriar a API. A bateria anterior também conferiu persistência por nova conexão Prisma, isolamento, cupons, carrinho, transações e concorrência de estoque.
- **24/24 testes de backend sem banco aprovados**, incluindo geração, criptografia, colisões e limites de tentativas.
- **Navegador real aprovado** com Fastify/Neon, sem API simulada: cadastro, login em outra sessão, perfil, endereço, moto, favorito, carrinho, cupom, pedido pendente, consulta do código e logout. Reiniciou o processo da API e recuperou a mesma conta e seus pedidos. Outro cliente recebeu 404.
- Código de cinco dígitos conferido na confirmação em 375 px e nos detalhes em 320 px. Visão geral validada sem rolagem horizontal em 320, 375, 390, 430, 768, 1024 e 1440 px. Capturas revisadas visualmente em `evidence/live-neon/`.
- **11/11 testes dos serviços frontend aprovados**: sete de comércio e quatro do cliente HTTP.
- TypeScript (`typecheck`) e compilação (`build`) aprovados; 35 verificações de sintaxe do frontend sem falhas.
- Verificação final dos destinos: branches reais diferentes; production com **zero tabelas e nenhuma migração**; testing com **18 tabelas e três migrações concluídas**. O `.env` permanece ignorado e não foi publicado.

As primeiras rodadas encontraram um teste que comparava e-mail sem normalizar caixa e um timeout curto na simulação de colisões. Ambos foram corrigidos e os 16 testes passaram na repetição completa. A máquina também apresentou falta de memória; a compilação e o navegador passaram quando executados separadamente. O teste de navegador passou a esperar DOMContentLoaded e componentes visíveis, evitando bloqueio no carregamento de recursos externos. Não foi necessário alterar o comportamento visual da loja.

O Neon retornou P1002 ao tentar obter novamente uma trava de migração já desnecessária. O executor agora confere os checksums aplicados e pula apenas migrações exatamente idênticas e concluídas. Não encerrou sessões do banco nem desativou travas de segurança. Se uma futura migração realmente pendente encontrar essa trava, será necessário investigar sua sessão proprietária; isso não impediu a migração desta etapa, já concluída, nem os testes.


## Repetir a validação local

Com o frontend servido em `http://127.0.0.1:8000`:

```powershell
npm --prefix backend run db:generate
npm --prefix backend run test:integration
npm --prefix backend run typecheck
npm --prefix backend run build
npm run test:frontend:real
```

Execute as tarefas pesadas separadamente nesta máquina. O teste de navegador inicia e encerra a API real em `http://127.0.0.1:3001`; não inicie outra instância na mesma porta. O servidor de frontend é iniciado com `npm run dev` em outro terminal. Os testes de banco usam somente TEST_DATABASE_URL após confirmar isolamento real. Para repetir somente o backfill seguro, use `node --import tsx scripts/pickup-backfill-testing.ts` dentro de `backend`; não use o servidor padrão apontado para DATABASE_URL nesta etapa.
