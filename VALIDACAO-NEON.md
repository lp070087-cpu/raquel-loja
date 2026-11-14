# Continuação Neon — 28/10/2026

Atualização posterior: o isolamento foi confirmado por IDs reais e as migrações/testes foram executados somente em `testing`. Consulte `VALIDACAO-TESTING-REAL.md` para o resultado atual; o restante deste arquivo preserva o diagnóstico anterior à correção das conexões.

## Confirmado nesta execução

- `DATABASE_URL` está preenchida, tem formato PostgreSQL válido, aponta para Neon e exige TLS.
- A conexão real passou em `SELECT 1`. Nenhum valor de conexão, senha ou conteúdo do `.env` foi exibido ou registrado.
- A consulta somente de leitura encontrou zero tabelas públicas e nenhum histórico de migração.
- `prisma migrate status`, executado com saída capturada e sanitizada, confirmou as duas migrações pendentes: `20261027180000_initial` e `20261027180100_constraints`.
- O SQL foi revisado: criação de tipos/tabelas/índices e adição de constraints, sem reset, DROP, TRUNCATE, DELETE ou UPDATE de dados.
- 21 testes não destrutivos passaram: domínio, fronteira HTTP, proteção de branches e revisão de migrações. TypeScript verificado.
- Frontend, painel administrativo e alterações anteriores foram preservados. Nenhum push ou deploy.

## Bloqueio identificado

`TEST_DATABASE_URL` está preenchida, mas aponta para o **mesmo destino** de `DATABASE_URL`, depois de normalizar os endereços pooled/direct. Isso não constitui isolamento e os testes de banco foram bloqueados.

Não há chave da API Neon nem identificação confirmada da branch atual no ambiente. A URL identifica o endpoint, não comprova o nome da branch. A tentativa de consultar o painel pelo navegador não conseguiu estabelecer a sessão de automação. Foi solicitada somente a confirmação dos nomes das branches, sem credenciais.

Até essa confirmação, nenhuma migração foi aplicada e nenhum cliente de teste foi criado. Cadastro, login e persistência real ainda não foram validados nesta etapa.

## Configuração preparada para testing

No painel Neon, crie ou selecione uma branch isolada chamada `testing`, confira que não é `production` e copie sua conexão para `TEST_DATABASE_URL` **somente no arquivo local**. Não derive a conexão alterando texto da URL atual.

Preencha os rótulos locais após conferir o painel:

```text
DATABASE_BRANCH=development
TEST_DATABASE_BRANCH=testing
```

O primeiro valor só deve ser usado se a conexão principal realmente pertencer à branch de desenvolvimento. O `.env.example` contém os campos; o `.env` fornecido pelo usuário não foi sobrescrito.

As novas travas exigem branch `testing`, destino diferente do principal e habilitação explícita para a suíte PostgreSQL. `npm test` não executa testes de banco automaticamente só porque uma URL foi preenchida. A execução de integração usa saída sanitizada e não imprime erros brutos do banco.

## Próximas ações já preparadas

Em `backend/`:

1. `npm run db:preflight` e `npm run db:status`: consultas somente de leitura.
2. Após confirmar a branch de desenvolvimento: `npm run db:migrate`, protegido para instalação inicial aditiva em banco vazio.
3. `npm run test:development`: cria apenas registros novos controlados, verifica cadastro/login/perfil/endereço/moto e persistência por cliente Prisma independente. Mantém os registros e não altera produtos, estoque ou pedidos existentes.
4. Após configurar testing isolada: `npm run test:integration`, que aplica migrações nesse destino e executa os dez testes de persistência, isolamento e concorrência.

Não foi executado teste destrutivo em `production` nem em qualquer outra branch. A conclusão da persistência real depende da confirmação da branch principal; a suíte completa depende também da conexão isolada `testing`.
