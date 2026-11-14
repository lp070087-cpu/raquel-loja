# Área do Cliente — validação real em Neon testing

Data: 28/10/2026. Esta etapa foi executada com Fastify, Prisma, PostgreSQL Neon e navegador reais. **Não houve migração nem escrita de dados em production, push ou deploy.**

## Isolamento confirmado

As duas conexões passaram em SELECT 1. Foram comparados os endpoints normalizados (pooled/direct tratados como o mesmo destino) e os valores reais de `current_setting('neon.branch_id', true)`, retornados separadamente por cada conexão. Os endpoints e os IDs de branch são diferentes. A comparação usa os valores completos em memória; a evidência contém somente fingerprints, sem URLs, usuários, senhas ou tokens.

A verificação final confirmou:

| Destino | Tabelas públicas | Migrações |
| --- | --- | --- |
| production | 0 | Nenhuma |
| testing | 17, incluindo o histórico Prisma | As duas finalizadas, sem rollback |

Evidência sanitizada: `evidence/neon-targets-2026-10-28.json`.

As novas rotinas de teste verificam IDs reais antes de qualquer escrita e recusam o mesmo branch mesmo quando as URLs usam endpoints ou credenciais diferentes. Os rótulos locais não substituem essa comparação. Somente os campos não secretos `DATABASE_BRANCH=production` e `TEST_DATABASE_BRANCH=testing` foram ajustados no `.env`; as conexões fornecidas foram preservadas.

## Migrações e catálogo

Aplicadas exclusivamente em testing:

- `20261027180000_initial` — 16 modelos e relacionamentos.
- `20261027180100_constraints` — integridade monetária, estoque/quantidade, validade e unicidade de endereço/moto padrão.

O catálogo original foi importado para testing: 23 produtos, imagens, categorias, compatibilidades e três cupons demonstrativos. Os arquivos originais não foram apagados. Não foi executado seed em production.

## Dez testes de integração: todos aprovados

1. Persistência de usuários, e-mail duplicado e login correto/incorreto.
2. CRUD de endereços e motos com bloqueio de dados de terceiros.
3. Favoritos e carrinho persistentes, estoque insuficiente e mescla idempotente.
4. Sincronização do mesmo cliente em uma segunda sessão autenticada.
5. Pedido atômico, preço recalculado, snapshots, cupom, idempotência e isolamento.
6. Concorrência de estoque: uma unidade não pode ser vendida a dois clientes.
7. Redefinição por token de uso único e revogação de sessões.
8. Persistência dos pedidos após desconectar e abrir outro cliente Prisma.
9. Constraints reais rejeitam estoque negativo e quantidade inválida.
10. Sessão expirada tem acesso negado.

Resultado final: **10 passaram, zero falhas, zero ignorados**. Relatório por caso: `evidence/integration-real-result.json`. Os testes usam registros com prefixos únicos e removem somente seus próprios fixtures em testing, sem truncar tabelas ou resetar schema.

## Navegador com API e banco reais: aprovado

`tests/frontend-live.spec.mjs` não intercepta rotas nem simula respostas. A suíte inicia uma API ligada somente à branch testing e verifica:

- Cadastro, sessão HttpOnly, perfil e login em contexto independente.
- Endereço e moto cadastrados pela interface.
- Catálogo efetivamente carregado da API, favoritos, carrinho e cupom.
- Checkout de retirada e pedido persistido com pagamento pendente.
- Reinício do processo Fastify: a sessão, os favoritos e os pedidos continuam disponíveis.
- Carrinho alterado em uma sessão e atualizado na outra.
- “Comprar agora” só abre o checkout depois da gravação no servidor.
- Logout: pedido privado retorna 401.
- Outro cliente autenticado: pedido alheio retorna 404.
- Conta sem rolagem horizontal em 320, 375, 390, 430, 768, 1024 e 1440 px.

Resultado final: **um cenário completo aprovado**, com muitas verificações de comportamento. O processo temporário da API é encerrado ao terminar. Registros do navegador são dados controlados de QA, mantidos apenas em testing. Nenhuma senha, cookie ou estado de autenticação é salvo como artefato.

Evidências atuais: `evidence/live-neon/result.json`, `pedido-real-testing.png` e as sete capturas `conta-real-*.png`. São capturas de dados realmente persistidos em testing, não screenshots com API simulada.

## Falhas e ajustes de integração

- O checkout aplicava regras antigas de nome aos dados somente de leitura de um perfil já validado pela API. Uma conta aceita pelo cadastro podia ser impedida de comprar. A validação conflitante foi retirada; a API continua determinando a identidade pela sessão.
- “Comprar agora” abria o checkout sem esperar a gravação do carrinho. Agora aguarda confirmação; a navegação interna também espera as gravações pendentes.
- A página de produto tinha a variável de favorito, mas a ação só aparecia em produtos relacionados. Foi adicionada a ação para salvar o próprio produto, mantendo o estilo existente.
- Botões de carrinho/favorito aguardam o servidor e impedem cliques repetidos durante a gravação. Falhas apresentam feedback em vez de confirmar sucesso prematuramente.
- As primeiras execuções da validação não concluíram. Foram acrescentados diagnósticos sanitizados por fase e por teste; a execução final dos dez casos e a execução final do navegador passaram.

## Regressão e qualidade

- 21 testes de domínio, HTTP e segurança das migrações/branches passaram.
- 11 testes nativos do cliente HTTP e sincronização passaram.
- 35 verificações de sintaxe frontend passaram.
- TypeScript e build do backend passaram.
- O cenário existente de catálogo → favorito → carrinho → cupom → pedido com API simulada passou novamente após os ajustes, como teste de regressão separado.
- Nenhum arquivo em `admin/` foi alterado; o painel continua demonstrativo. As alterações locais anteriores foram preservadas.
- `.env` continua ignorado pelo Git. Logs, relatórios e screenshots não contêm credenciais do arquivo de ambiente.

## Comandos para reproduzir

Em `backend/`:

```text
npm run db:targets
npm run test:integration
npm run db:testing:seed
npm run typecheck
npm run build
```

Para o navegador: inicie o frontend com `npm run dev` na raiz, mantenha a porta 3001 livre e execute `npm run test:frontend:real`. A suíte gerencia a API de testing automaticamente. Para inspeção manual, use `npm run dev:testing` em backend; não mantenha essa API simultaneamente com a suíte automática.

## Pendências para a conclusão operacional

- SMTP real para envio e recebimento de recuperação/verificação de e-mail. Os tokens e a redefinição persistida foram testados; o envio não foi declarado funcional.
- Pix, cartão e frete reais continuam sem integração; pagamento permanece pendente e a entrega online está bloqueada.
- Cancelamento/expiração com liberação de estoque antes de vendas sem acompanhamento.
- Fluxo operacional de retirada e gerenciamento dos novos pedidos: o painel administrativo antigo não os administra, conforme o escopo preservado.
- Confirmar marca, contato, endereço, compatibilidades e dados comerciais definitivos.
- Migrações em production e publicação continuam pendentes de autorização específica; não foram realizadas nesta etapa.

A Área do Cliente e o checkout de retirada foram validados com persistência real em testing. Isso não equivale a liberar a operação comercial em production.
