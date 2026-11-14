# Pagamento presencial e retirada

Decisão aplicada: **Pagamento realizado na retirada, diretamente na loja**. O site reserva o pedido e seu estoque, gera o código criptográfico de cinco dígitos e mantém o pagamento pendente. Não existe cobrança pelo site nem coleta de dados de cartão.

## Fluxo implementado

1. Checkout mantém os componentes existentes, calcula preços, descontos e estoque no servidor e grava `PENDING` / `ON_PICKUP`.
2. Na seção **Atendimento real** do painel existente, o funcionário entra com e-mail e senha reais. O acesso demonstrativo não autoriza operações no banco.
3. Informa número/identificação do pedido e código. O servidor valida ambos e exibe cliente, produtos, quantidades, total e situação.
4. Após receber presencialmente, confirma dinheiro, Pix presencial ou cartão na maquininha. O servidor copia o total persistido, registra método, funcionário e horário, e muda o pagamento para `PAID`. Essa ação não entrega o pedido.
5. Confirma separadamente a entrega. A validação existente consome o código, grava funcionário e horário e conclui o pedido. O cliente vê o status atualizado e deixa de receber o código.

## Segurança e estoque

- Sessões reais, CSRF e autorização `STAFF`/`ADMIN` no servidor em todas as operações de atendimento.
- Consultas exigem código e identificação do pedido; códigos não são localizados isoladamente.
- Reaproveita HMAC, criptografia recuperável, reserva permanente e política de cinco dígitos existentes.
- Tentativas inválidas compartilham o contador e bloqueio persistente de 15 minutos. Há também limitação HTTP.
- Pagamento tem registro único por pedido e trava a linha do pedido durante a transação. Valores enviados pelo navegador são rejeitados.
- Estoque é baixado na criação do pedido. Cancelamento de pedido não pago devolve as quantidades dos itens dentro de uma transação, grava `stockRestoredAt` e auditoria. Repetição, inclusive concorrente, não devolve novamente.
- Pedidos entregues não podem ser cancelados nem devolver estoque. Cancelamento de pedido já pago é bloqueado com `REFUND_REQUIRED`: depende de um fluxo explícito de reembolso presencial, que esta etapa não inventa nem executa automaticamente.
- Auditoria registra criação/reserva, recebimento, entrega e cancelamento/devolução, com ator, data e detalhes do servidor.

## Migração

`20261028210000_counter_payment`, exclusivamente em Neon **testing**:

- `PaymentMethod.ON_PICKUP`;
- `Order.stockRestoredAt`;
- `CounterPayment`, com pedido único, valor em centavos, método presencial, funcionário e data;
- `OrderEvent`, com pedido, ator, tipo, detalhes e data;
- chaves estrangeiras, índice de auditoria e constraints de valor/método.

As migrações anteriores e os dados originais foram preservados. Nenhuma alteração em production, push ou deploy faz parte desta entrega.

## Arquivos desta etapa

Backend: `prisma/schema.prisma`, migração acima, `src/app.ts`, `src/counter.ts`, `src/validation.ts`, `scripts/test-integration.ts`, `scripts/counter-browser-fixture.ts`, `tests/counter.integration.test.ts`, limites de tempo de `vitest.config.ts` e dos testes de integração existentes.

Frontend: `assets/js/admin-atendimento.js`, integração em `assets/js/admin.js`, autenticação em `admin/login.html`, indicação de escopo em `admin/painel.html`, estilos responsivos restritos ao atendimento em `assets/css/admin.css`, textos e métodos em `pagina-checkout.js`, `pagina-carrinho.js`, `pagina-pedido.js`, `pagina-conta.js`.

Navegador: teste acrescentado em `tests/frontend-live.spec.mjs`, preservando o cenário anterior. Dados controlados e credenciais temporárias do funcionário são preparados somente em testing e transmitidos por IPC, sem arquivos ou logs de credenciais.

## Validação final — 28/10/2026

**Fluxo completo validado com navegador real, Fastify e Neon testing. Nenhum teste obrigatório desta etapa ficou pendente ou bloqueado.**

- **26/26 integrações Neon aprovadas**, zero falhas ou casos pulados. Preservam os 25 anteriores e acrescentam concessão/revogação de STAFF sem alterar senha, com invalidação das sessões.
- **24/24 testes de backend aprovados**. As 26 integrações ficam puladas no comando unitário e foram executadas separadamente com banco real.
- **13/13 testes frontend/servidor aprovados**: sete de comércio, quatro de API e dois do servidor estático. **36 verificações de sintaxe**, TypeScript e build aprovados.
- **2/2 cenários Playwright reais aprovados em 4,1 minutos**, sequenciais, um worker e um navegador Chrome. Sem mocks, interceptações ou credenciais persistidas em arquivos.
- Cliente: cadastro, login, perfil, endereço, moto, favorito, catálogo, carrinho entre sessões, cupom, checkout sem pagamento antecipado, código de cinco dígitos, consulta em Meus Pedidos, logout e negação de pedidos de outro cliente.
- Atendimento: funcionário autorizado, pedido identificado com código, dinheiro/Pix/cartão presencial, pagamento separado da entrega, persistência após reiniciar a API, atualização do cliente e cancelamento não pago com reposição do estoque.
- Pelo navegador foram negados retirada não paga, pagamento duplicado, cancelamento pago e segunda retirada. Banco confirmou concorrência de pagamento/entrega/cancelamento, estoque, 100 pedidos com códigos distintos, zeros iniciais, colisões, isolamento e bloqueio de tentativas.
- Capturas reais e ausência de rolagem horizontal em **320, 375, 390, 430, 768, 1024 e 1440 px**. Conferidas visualmente a confirmação, o atendimento mobile e a retirada concluída na conta.
- A rodada começou com 181 MB de RAM livre; a máquina continuou sob pressão de memória. Os timeouts anteriores foram superados nesta execução sem aumentar limites nem encerrar programas pessoais. Não foram executados testes pesados em paralelo.
- Migrações existentes conferidas por checksum somente em testing; **nenhuma migração criada ou aplicada nesta retomada**. Guardas conferiram os identificadores reais distintos dos destinos Neon. Production recebeu apenas a consulta de identificação necessária à guarda, sem escrita.
- Verificados 210 arquivos de entrega: nenhuma correspondência com credenciais reais do ambiente. O arquivo de ambiente continua ignorado pelo Git. Sem push ou deploy.

Evidências: `evidence/integration-real-result.json`, `evidence/live-neon/result.json`, `counter-result.json`, `browser-counter-status.json` e screenshots em `evidence/live-neon/`.

### Arquivos alterados nesta retomada

- Novos: `backend/src/staff-access.ts` e `backend/scripts/authorize-staff.ts`.
- Atualizados: fixture `backend/scripts/counter-browser-fixture.ts`, teste `backend/tests/counter.integration.test.ts`, cenário `tests/frontend-live.spec.mjs`, este documento, README e evidências.
- As alterações anteriores e os demais módulos administrativos foram preservados. Não foram criadas contas reais da equipe; somente fixtures controladas em testing, com senhas aleatórias.

## Executar localmente

O ambiente permanece em `backend/.env`, ignorado pelo Git. Não publique esse arquivo.

```powershell
npm --prefix backend run db:generate
npm --prefix backend run test:integration
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend test
```

Com o frontend iniciado por `npm run dev` em outro terminal:

```powershell
npm run test:frontend:real
```

O frontend usa `http://127.0.0.1:8000`. O teste inicia/reinicia/encerra a API real em `http://127.0.0.1:3001`, com guardas que conferem os identificadores reais das branches antes de usar testing. Execute tarefas pesadas sequencialmente nesta máquina.

Para repetir somente o atendimento no Chrome instalado, depois de liberar memória:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'
node backend/node_modules/@playwright/test/cli.js test --config=playwright.live.config.mjs --grep 'pagamento presencial'
```

Pendências operacionais: cadastrar e autorizar as contas reais da equipe, configurar a hospedagem quando autorizada e definir a política de reembolso para pedidos pagos. Recuperação/verificação por e-mail requer provedor SMTP; nenhum envio real foi validado nesta retomada. As demais seções do painel continuam demonstrativas e não foram convertidas nesta etapa.

## Autorização de funcionários em testing

O funcionário cadastra sua própria conta pelo formulário normal, com senha pessoal. O cadastro público sempre cria CUSTOMER: nenhum campo enviado pelo navegador concede acesso de equipe. Um operador com acesso local autorizado ao banco pode conceder STAFF à conta existente, sem conhecer, criar ou alterar sua senha:

```powershell
cd backend
node --import tsx scripts/authorize-staff.ts --testing --email=funcionario@example.test --role=STAFF --confirm-role-change
```

O e-mail acima é ilustrativo; o comando não cria contas. Para revogar o acesso, repetir com `--role=CUSTOMER`. Ambas as operações invalidam as sessões da conta e exigem novo login. O comando confere os destinos Neon reais e opera exclusivamente em testing; não promove ADMIN nem modifica contas ADMIN. Erros são sanitizados. Nenhum comando de provisionamento em production está habilitado nesta entrega.

STAFF e ADMIN autenticados podem consultar pedidos mediante identificação e código, registrar pagamento e confirmar entrega. CUSTOMER e a sessão demonstrativa do painel não concedem essas permissões. Cookies HttpOnly, CSRF e limites de tentativas continuam obrigatórios. O funcionário de navegador é temporário, com senha aleatória por execução transmitida somente por IPC.
