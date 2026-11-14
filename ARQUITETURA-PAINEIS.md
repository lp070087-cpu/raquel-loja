# Arquitetura dos painéis — Loja Raquel

Atualizado em 29/10/2026. Os painéis estão implementados sobre a API existente e têm validações reais em Fastify/Neon **testing**. **A última repetição master terminou 2/3, sem aprovação integral**: gestão e compra/persistência passaram; a etapa de balcão chegou à retirada/histórico, mas o login final do cliente excedeu 30s, sob memória livre próxima de 42 MB. O master anterior de caso único passou, e seu `result.json` é evidência histórica. Estado final: [FINALIZACAO-VALIDACAO.md](FINALIZACAO-VALIDACAO.md), [PROGRESSO-CODEX.md](PROGRESSO-CODEX.md); operação: [OPERACAO-PAINEIS.md](OPERACAO-PAINEIS.md).

## O que existe hoje

O projeto mantém a vitrine em HTML, CSS e módulos JavaScript e uma API separada em Node.js, TypeScript, Fastify e Prisma/PostgreSQL. Autenticação, sessões e autorização das operações reais ficam no servidor.

**Atendimento** atende contas autorizadas com papel `STAFF` ou `ADMIN`: consulta por identificação do pedido e código, pagamento presencial, confirmação separada de retirada e cancelamento de pedido não pago com devolução transacional do estoque. Há auditoria, limitação de tentativas e proteção contra repetição. A administração possui tela para conceder/revogar STAFF em contas já cadastradas. A operação exige senha atual da administradora, revoga sessões da conta afetada e não define senhas nem promove ADMIN.

`admin/login.html` autentica a conta individual e direciona ADMIN para `admin/painel.html` e STAFF para `admin/funcionario.html`. CUSTOMER não recebe acesso à equipe. As seções utilizam a API real, sem autorização por sinalizador demonstrativo no navegador. Não houve implantação dos painéis em produção.

## Painéis implementados

| Área | Administradora Raquel — `ADMIN` | Funcionário — `STAFF` |
| --- | --- | --- |
| Dashboard | Indicadores reais e pedidos recentes | Sem dashboard gerencial |
| Produtos e categorias | Cadastrar, editar e organizar | Consulta necessária ao atendimento |
| Estoque | Gerir movimentações e disponibilidade | Consulta; movimentos decorrentes de operações autorizadas |
| Pedidos e atendimento | Gestão completa | Operações restritas ao atendimento |
| Clientes | Gestão dos dados necessários à operação | Somente dados necessários ao pedido em atendimento |
| Funcionários e permissões | Conceder STAFF e revogar para CUSTOMER; não promove ADMIN | Sem acesso de gestão |
| Pagamentos | Gestão e acompanhamento | Registrar recebimento presencial autorizado |
| Retiradas | Gerir e acompanhar | Consultar pedido com código e confirmar retirada conforme regras do servidor |
| Cupons | Criar, editar e acompanhar utilização | Sem gestão |
| Relatórios | Agregações existentes de pedidos, estados, pagamentos e produtos | Sem acesso gerencial |
| Configurações | Nove campos públicos da loja | Sem acesso |

O painel ADMIN possui **13 seções**: dashboard, produtos, categorias, estoque, pedidos, clientes, funcionários, cupons, atendimento, pagamentos, retiradas, relatórios e configurações. O painel STAFF possui **3 seções**: pedidos, atendimento e histórico individual. Funcionários não administram produtos, preços, permissões, outros funcionários ou configurações, inclusive por chamadas diretas à API.

Produtos incluem imagens por caminho/URL e compatibilidades, edição de preço e desativação; categorias integram a vitrine. Estoque tem ajustes com motivo e auditoria. Clientes são consultados, sem edição irrestrita das contas. Pedidos permitem atualização de preparação para CONFIRMED/READY, sem aprovar pagamento. Pagamentos e retiradas possuem consultas próprias. Relatórios não representam contabilidade ou conciliação bancária. Configurações abrangem nome, telefone, e-mail, endereço, bairro, cidade, UF, CEP e horários; não incluem CNPJ, credenciais ou infraestrutura.

A migração aditiva `20261029010000_admin_management` criou Category, StoreSetting, AdminAudit e a relação opcional de categoria do produto, exclusivamente em testing. O bootstrap da primeira administradora é um procedimento local protegido para uma conta existente em testing; não habilita contas reais em produção.

## Contratos preservados

- Reutilizar a API, as sessões, os componentes visuais e as regras transacionais existentes. Os dois painéis podem compartilhar componentes, mas devem ter navegação e ações compatíveis com cada papel.
- Autorizar cada leitura e alteração no servidor. Ocultar um menu não é controle de acesso; `STAFF` não pode executar ações exclusivas de `ADMIN` por chamadas diretas à API.
- Exibir somente os dados pessoais necessários ao atendimento. Operações sensíveis devem registrar ator, horário e resultado em auditoria.
- Manter pagamento presencial separado da entrega. Selecionar Pix ou cartão no site não comprova recebimento. A retirada segue as condições de pagamento, código e consumo único existentes.
- Preservar as proteções de estoque e repetição. Reembolso de pedido pago exige fluxo explícito a ser definido; não deve ser simulado por cancelamento ou devolução automática.
- Validar módulos gerenciais com testes de autorização e isolamento por papel; existência de uma tela não substitui execução dos testes.

## Evidências e limites

As **37 integrações Neon** passaram anteriormente em testing, com resultado preservado e sem nova execução nesta retomada. O master anterior passou em um cenário real de aproximadamente **2,1 minutos**, cobrindo categoria, produto, imagens, compatibilidade, preço, estoque, cupom, concessão/revogação STAFF, configurações, consulta de relatórios e compra até pagamento/retirada. Isso não representa aprovação do último reteste serial2/3 descrito acima.

Também confirmou persistência após reiniciar a API, preparação sem aprovação automática do pagamento, bloqueio de endpoints ADMIN para STAFF, histórico individual, rejeição de pagamento duplicado, cancelamento pago e retirada duplicada, e atualização do pedido do cliente. Houve capturas em 320, 375, 390, 430, 768, 1024 e 1440 px nos estados percorridos; isso não representa teste exaustivo de todas as combinações de tela/largura.

Resultado master histórico: [evidence/master-panels/result.json](evidence/master-panels/result.json); falha mais recente: `evidence/master-panels/failure.json/png`. A correção do cupom percentual foi validada. Nesta retomada passaram 13 leituras administrativas reais e bootstrap controlado, além de 4 cenários públicos, 2 de cliente/balcão, 27 regressões de navegador, 16 testes nativos, 56 backend, 40 verificações de sintaxe e TypeScript/build. Evidências e limites estão no relatório final. Privilégios e sessões temporários foram retirados por limpeza protegida, preservando registros. Falta repetir o master serial com memória disponível e confirmar 3/3.

Dados comerciais confirmados ficam para o final. SMTP real, política de reembolso e ativação de acessos reais em produção continuam como dependências operacionais. Não há autorização de push, merge, deploy ou migração em production; a validação em testing não é declaração de prontidão operacional de produção.
