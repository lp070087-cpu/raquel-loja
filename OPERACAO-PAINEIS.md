# Operação dos painéis — Loja Raquel

Este documento descreve os procedimentos existentes no código. A aprovação dos fluxos reais no navegador deve ser consultada em `PROGRESSO-CODEX.md` e nas evidências de execução; a existência das telas não comprova aprovação dos testes.

## Ambiente local seguro

Pré-requisito: Node.js compatível com `engines` dos pacotes (>=22.12), dependências instaladas e ambiente local configurado pelo responsável. Nunca copie valores de `.env` para documentação, capturas de tela ou Git.

Na raiz do projeto:

```powershell
npm run dev
```

Em outro terminal, na pasta `backend`:

```powershell
npm run typecheck
npm run build
node dist/scripts/testing-runtime.js
```

Alternativa de desenvolvimento: `npm run dev:testing` em `backend`. O executor protegido confere o destino real das duas conexões e utiliza exclusivamente `TEST_DATABASE_URL` para iniciar a API. Essa comparação realiza consultas de identificação; não migra nem altera dados de produção. Não use `npm run dev`, `npm start` em `backend` ou `npm run dev:api` na raiz para esta validação: esses caminhos utilizam a configuração normal de `DATABASE_URL`.

- Loja: `http://127.0.0.1:8000/`
- Conta do cliente: `http://127.0.0.1:8000/conta.html`
- Login da equipe: `http://127.0.0.1:8000/admin/login.html`
- Painel da administradora: `http://127.0.0.1:8000/admin/painel.html`
- Painel do funcionário: `http://127.0.0.1:8000/admin/funcionario.html`
- Saúde da API: `http://127.0.0.1:3001/api/health`

Abra sempre por HTTP, nunca por `file://`. Mantenha o mesmo hostname durante o fluxo para que os cookies correspondam à sessão. O runtime de testes autoriza as origens locais nas portas acima. O backend utiliza cookies HttpOnly, CSRF e autorização por papel. O modo de produção exige HTTPS; não é habilitado por este procedimento.

## Primeira administradora em testing

1. A responsável cadastra sua própria conta pela loja, escolhendo uma senha individual e secreta. O cadastro público cria uma conta de cliente, sem privilégios administrativos.
2. Um operador local de confiança confirma a identidade da responsável. Não utilize contas geradas por fixtures de testes.
3. Na pasta `backend`, com build atualizado (`npm run build`), execute o bootstrap compilado, substituindo apenas o e-mail pelo endereço da conta confirmada:

```powershell
node dist/scripts/bootstrap-admin-testing.js --testing --confirm-admin-bootstrap --email=EMAIL_DA_CONTA_CONFIRMADA
```

O argumento contém um e-mail, nunca uma senha. Evite compartilhar o histórico desse terminal por conter um dado pessoal.

O script exige conta existente, verifica o isolamento real de `testing`, impede a existência de outra conta ADMIN, promove a conta em uma transação, registra auditoria e revoga suas sessões. Não cria senha nem altera a senha escolhida pela responsável. Após a operação, ela deve entrar novamente pelo login da equipe.

Se aparecer a mensagem genérica de falha, verifique conta cadastrada, parâmetros, conectividade e existência de outra administradora; não contorne a proteção promovendo contas diretamente no banco. Contas ADMIN temporárias das evidências precisam ter seus privilégios retirados pelo procedimento restrito abaixo antes do bootstrap humano.

**Este bootstrap é exclusivo de testing.** A ativação da administradora em produção não está autorizada nem é fornecida por esse comando. Exige procedimento específico aprovado para o ambiente de produção e identificação confirmada da responsável.

## Autorizar e remover funcionários

1. Cada funcionário cadastra sua conta individual em `conta.html`, com seu próprio e-mail e senha.
2. A administradora entra em `admin/login.html`, abre **Funcionários → Liberar funcionário**, informa o e-mail já cadastrado e confirma com a **senha atual da própria administradora**.
3. O backend localiza a conta e altera seu papel para STAFF. A operação registra auditoria e invalida as sessões anteriores dessa conta.
4. O funcionário entra novamente pelo login da equipe e é direcionado ao painel separado de atendimento.
5. Para remover acesso, a administradora usa **Remover acesso da equipe** e confirma com sua senha. A conta retorna a CUSTOMER e as sessões são revogadas; os pedidos, pagamentos e registros de auditoria continuam preservados.

O módulo não define senhas dos funcionários, não promove ADMIN e não permite alterar a própria conta administrativa ou outra conta ADMIN. Funcionários não recebem acesso a gestão de produtos, preços, estoque, clientes, cupons, permissões ou configurações. A restrição existe no servidor, além da navegação separada. O histórico de STAFF limita-se às operações do próprio atendente; a administração tem consulta ampliada.

## Rotina do balcão

1. Cliente confirma o pedido no site, sem cobrança online, e recebe número do pedido e código de cinco dígitos. O pagamento permanece PENDING.
2. A administradora pode confirmar preparação e marcar o pedido pronto para retirada, sem aprovar pagamento por essa mudança de status.
3. **Atendimento** é a primeira opção e a tela inicial para administradora e funcionário. Informe somente o código completo de cinco dígitos, incluindo zeros à esquerda. O servidor localiza o pedido reservado usando o HMAC único, sem expor o código armazenado. Confira visualmente o nome do cliente e os produtos antes de confirmar qualquer recebimento ou entrega. O número do pedido continua disponível para referência, mas não precisa ser digitado na busca.
4. Confere os itens, quantidades, total e situação retornados pelo servidor.
5. Somente após receber o pagamento, seleciona dinheiro, Pix presencial ou cartão na maquininha e confirma. O servidor usa o total persistido e registra método, valor, funcionário e horário. Dados de cartão não são armazenados.
6. Após entregar os produtos, confirma a retirada. O servidor exige pagamento confirmado e impede uma segunda retirada. O cliente consulta o estado atualizado em Meus Pedidos.

Não confirme pagamento para simular um recebimento. O registro do balcão não integra gateway nem comprova recebimento bancário automaticamente. Tentativas incorretas de código são limitadas, com bloqueio temporário; não remova a proteção para continuar tentando.

Pedidos não pagos podem ser cancelados pelo atendimento com motivo, devolvendo estoque uma única vez. Pedidos já retirados não têm estoque devolvido por esse fluxo. Pedidos pagos bloqueiam cancelamento automático com `REFUND_REQUIRED`: exigem política operacional de reembolso ainda não definida. Não há estorno financeiro automático ou fictício.

## Senhas, sessões e e-mail

Logout invalida a sessão. Alterações de papel revogam as sessões da conta afetada. A senha de um usuário nunca deve ser solicitada por outro funcionário para ser inserida no painel; a confirmação administrativa utiliza a senha da administradora autenticada.

Recuperação de senha e verificação de e-mail dependem de provedor SMTP configurado no servidor: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM`. O servidor normal monta o transporte quando os campos necessários estão presentes. O runtime `testing-runtime.ts` não fornece transporte de e-mail a `buildApp`; portanto não comprova entrega SMTP real. A resposta genérica de recuperação não comprova envio ou existência de conta. Nunca registre tokens de recuperação.

Sem provedor validado, documente a recuperação como dependência operacional; não prometa envio funcionando e não crie uma senha padrão para contornar o bloqueio.

## Retirar privilégios das fixtures de painéis

Execute somente depois de terminar os testes de navegador e encerrar suas sessões. Na pasta `backend`, com build atualizado (`npm run build`):

```powershell
node dist/scripts/retire-panel-fixtures.js --testing --confirm-retire-fixtures
```

O script existente restringe a seleção a e-mails no padrão `admin-browser-...-(admin|staff|customer)@example.test`, nomes exatos das fixtures e papéis correspondentes. A identidade `customer` só é elegível quando o nome é exatamente `Cliente de teste` e o papel é STAFF, cobrindo interrupção do teste entre concessão e revogação. Um cliente comum ou essa identidade com papel ADMIN não é selecionado. Opcionalmente aceita `--prefix=PREFIXO_EXATO_DA_FIXTURE`. Demove para CUSTOMER e revoga sessões, preservando contas, pedidos e auditorias. Não exclui dados e não deve ser adaptado para selecionar contas reais por papel genérico. A saída informa apenas contagens. Não confunda a existência desse procedimento com sua execução: confira o checkpoint.

A limpeza sem `--prefix` também considera a família estrita `counter-browser-<timestamp>-<sufixo de cinco caracteres>@example.test`, somente com nome exato `Atendente Teste` e papel STAFF. O sufixo permite letras minúsculas, números, `_` e `-`, conforme a fixture gerada. Não seleciona ADMIN dessa família, contas comuns ou outros padrões. Quando `--prefix` administrativo é informado, nenhuma fixture counter é selecionada. As mesmas verificações atômicas de identidade e revogação de sessões são preservadas.

## Verificações de operação

### Smoke real do bootstrap, sem contas reais

O procedimento de primeiro acesso foi validado de fato em Neon testing: [evidence/access-bootstrap-result.json](evidence/access-bootstrap-result.json). A execução confirmou promoção de uma conta controlada, preservação do hash da senha, revogação de sessões, auditoria e bloqueio da promoção de uma segunda administradora. A primeira conta foi automaticamente devolvida a CUSTOMER ao final; contas e auditoria foram preservadas. Isso não ativa acesso humano ou produção.

Para repetir, somente após concluir os navegadores, retirar privilégios das fixtures e atualizar o build, execute na pasta `backend`:

```powershell
node dist/scripts/access-bootstrap-smoke.js --testing --confirm-access-smoke
```

O smoke exige **nenhuma conta ADMIN existente**: se houver uma, recusa antes de criar ou alterar contas. Confere as conexões por destino real e cria duas contas CUSTOMER exclusivas de controle, com senhas aleatórias nunca impressas. Invoca o bootstrap compilado com saídas suprimidas, valida a primeira promoção e a recusa da segunda, e retira em `finally` o privilégio da primeira identidade exata, revogando suas sessões. As duas contas e os registros ficam preservados, sem exclusões. Não execute ao mesmo tempo que testes que criam ADMIN. Falhas devem ser investigadas sem contornar o requisito ou tocar contas reais.

### Suítes do projeto

Na raiz:

```powershell
npm run check
npm run test:commerce
npm run test:api-client
npm run test:static
npm run test:frontend -- --workers=1
npm run test:public:real
npm run test:frontend:real -- --workers=1
node backend/node_modules/@playwright/test/cli.js test --config=playwright.master.config.mjs --workers=1
```

Em `backend`:

```powershell
npm run typecheck
npm run build
npm test
npm run test:integration
```

Execute os testes pesados sequencialmente. Os testes reais podem gerenciar uma API própria na porta 3001: consulte a configuração do teste e pare somente a API local iniciada por você antes de executá-los. Não encerre programas pessoais. O teste master exige build atualizado. As integrações utilizam os guardas de isolamento de testing; não substitua a conexão por production.

## Dados comerciais: última etapa

Não foram confirmados nome comercial, WhatsApp, endereço, horários e CNPJ. Permanecem provisórios até o responsável fornecê-los; não inventar dados nem considerar o site publicável com exemplos fiscais.

Locais a revisar após confirmação:

- `assets/js/dados.js`, objeto LOJA: conteúdo padrão, telefone, e-mail, endereço e horários.
- **Configurações** no painel: nome, telefone, e-mail público, endereço, bairro, cidade, UF, CEP e horários persistidos em StoreSetting. `assets/js/loja-api.js` aplica esses dados ao site. CNPJ não integra esse formulário neste momento.
- `assets/js/shell.js`: CNPJ de exemplo no rodapé.
- Títulos das páginas HTML públicas e administrativas, marca fixa nas páginas administrativas e título dinâmico em `assets/js/pagina-catalogo.js`.
- Revisão visual final de contato, links WhatsApp/mapa, rodapé, checkout e instruções de retirada para confirmar que não restou conteúdo demonstrativo nem número de endereço herdado.

## Preparação para futura publicação

Publicação, push, merge, migrações de production e ativação de contas reais não estão autorizados.

Antes de solicitar autorização final, revisar build, evidências, compatibilidade do host estático/frontend e hospedagem Node separada, domínio HTTPS e origem da API no cliente. No backend, definir por canal secreto `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`, `FRONTEND_ORIGINS`, `FRONTEND_URL` e, quando aprovado, os campos SMTP. Conexões de testes permanecem isoladas em `TEST_DATABASE_URL`/`TEST_DATABASE_BRANCH`; não transportar credenciais de testes para arquivos públicos. Verificar a estratégia de cookies para os domínios finais, sem liberar CORS com `*`.

Permanecem dependências externas: dados comerciais/fiscais confirmados, provedor e entrega SMTP real, política de reembolso e processo de concessão do primeiro acesso em produção. O pagamento continua exclusivamente presencial; integração financeira online não faz parte da preparação.

## Retomada comprovada — 29/10/2026

- Cenário pendente do mestre: **1/1 aprovado**, 49,2 s (execução total 1,3 min), Fastify compilado + Neon testing real, um worker. As etapas já aprovadas de gestão e compra não foram repetidas; pré-requisitos controlados foram criados por HTTP real, sem persistir credenciais.
- Preparação ADMIN, atendimento STAFF, restrições 403, pagamento presencial em dinheiro, bloqueios de retirada sem pagamento, pagamento duplicado, cancelamento pago e segunda retirada, histórico próprio e atualização COMPLETED/PAID na conta do cliente: aprovados. Código com cinco dígitos validado antes da retirada e removido após consumo.
- Overflow verificado em 320, 375, 390, 430, 768, 1024 e 1440 px no atendimento e pedido do cliente. Screenshots reais em 390 e 1440 px; nenhum pageerror nesse cenário.
- Operações administrativas novas: **cinco casos validados entre duas execuções**. Primeira execução: quatro aprovados (categorias 16,7 s; cupons 6 s; estoque 7,4 s; busca/paginação/snapshots 26,4 s), último bloqueado antes da operação pelo rate limit de login. Repetição somente de configurações: aprovada em 33,5 s. Não equivale a uma execução única de cinco casos sem falhas.
- Cobertura nova: edição/desativação de categoria e sincronização de metadados; cupom fixo em centavos e desativação; saída de estoque e rejeição de saldo negativo; busca/paginação de produtos/pedidos, detalhes de cliente e preservação do snapshot após desativar produto; nove campos de configurações com gravação dos mesmos valores e sem inventar dados comerciais.
- Correções restritas à automação: aguardar atualização da interface após gravação; aguardar formulário de login pronto; conferir resposta HTTP da autenticação; preparar pedido do cliente em contexto HTTP independente, evitando relogin redundante do administrador; limpar campos de senha antes dos diagnósticos e mascarar capturas. Diagnóstico intermediário sanitizado. Nenhuma regra de segurança ou timeout foi relaxada.
- Memória disponível: aproximadamente 484 MB no início e 399 MB antes da repetição. Reiniciada somente a API testing identificada desta execução para isolar o orçamento de rate limiting entre execuções independentes. Nenhum programa pessoal encerrado.
- As fixtures de cada execução retiram seus próprios privilégios temporários e revogam sessões no afterAll, preservando contas, pedidos e auditoria. Nenhuma conta de teste serve como acesso definitivo.
- Nenhuma migração ou alteração de backend/negócio nesta retomada; sem escrita em production, push, merge ou deploy. Resultados anteriores permanecem históricos, sem alegar nova execução das 37 integrações ou suítes não afetadas.

### Evidências novas

Pasta: evidence/final-targeted/. Resultados: pending-master-result.json, admin-category-operations.json, admin-coupon-operations.json, admin-stock-operations.json, admin-search-snapshot-operations.json e admin-settings-operations.json.

Capturas: pending-staff-pickup-390.png, pending-customer-completed-390.png, pending-customer-completed-1440.png, admin-operations-order-filter.png e admin-operations-existing-settings.png.

### Retomada dirigida

Frontend HTTP e API testing devem estar iniciados antes destes testes. Em backend, build atualizado e node dist/scripts/testing-runtime.js; na raiz, npm run dev. O runtime verifica os destinos reais do Neon antes de iniciar e usa somente testing para operações.

Cenário isolado (somente quando afetado):

```powershell
node backend/node_modules/@playwright/test/cli.js test --config=playwright.finish.config.mjs pending-master.spec.mjs --workers=1
```

Operações administrativas (execução separada, API testing recém-iniciada para isolamento de limites em memória; não enfraquecer limites):

```powershell
node backend/node_modules/@playwright/test/cli.js test --config=playwright.finish.config.mjs admin-operations.spec.mjs --workers=1
```

Próxima ação: manter dados comerciais, SMTP, política de reembolso, provisionamento real e publicação como pendências externas. Não repetir o mestre completo sem mudança relevante. Ativação real e qualquer operação em production continuam exigindo autorização.


### Arquivos exclusivos desta retomada dirigida

Criados: playwright.finish.config.mjs, tests/helpers/real-panels.mjs, tests/pending-master.spec.mjs, tests/admin-operations.spec.mjs e evidence/final-targeted/. Atualizados: FINALIZACAO-VALIDACAO.md, OPERACAO-PAINEIS.md e PROGRESSO-CODEX.md. Nenhuma migração criada. Verificação HTTP final: loja/API/catálogo 200, origem local autorizada com credenciais e ADMIN anônimo 401; evidence/final-targeted/local-runtime-result.json. Servidores mantidos em http://127.0.0.1:8000/ e http://127.0.0.1:3001/api/health. Quatro arquivos de automação passaram na verificação de sintaxe; git diff --check sem erros. backend/.env permanece fora dos arquivos versionados.

Regressão direcionada após corrigir logins redundantes: somente busca/paginação/detalhe/snapshot repetido e APROVADO em 20,4 s (execução 38,3 s), um worker, com limpeza final das próprias permissões e sessões aprovada. Configurações encerrou com 1/1 aprovado (execução total 2,6 min, incluindo preparação e limpeza). A lista dos cinco casos permanece aprovada entre execuções, não uma suíte única sem interrupção.

## Operação atual — 17/11/2026 (nova versão em prévia)

Esta atualização substitui as instruções antigas de pagamento e entrega separados na interface. A produção continua na versão anteriormente publicada até a liberação da nova migração de fotos.

1. No Atendimento, digite os cinco dígitos do código, incluindo zeros iniciais. A consulta é automática após uma breve pausa; o botão de consulta permanece disponível.
2. Confira o nome do cliente, os produtos e o total calculado pelo servidor.
3. Receba o pagamento presencial e selecione dinheiro, Pix presencial ou cartão na maquininha. Não digite dados de cartão.
4. Marque a confirmação de que conferiu o cliente, recebeu o pagamento e está entregando os produtos.
5. Clique em **Receber e entregar**. O servidor registra pagamento e retirada na mesma transação e o campo fica pronto para o próximo cliente.
6. Se o pagamento já foi registrado anteriormente, a ação será **Concluir retirada**, sem gerar novo recebimento.

Não clique antes do recebimento real e da entrega. Cancelamento de pedido pago continua bloqueado até definição de política de reembolso. Os endpoints antigos separados foram preservados para compatibilidade.

### Fotos e estoque

Produtos e categorias aceitam arquivos JPG. A interface otimiza a imagem sem deformar antes do envio; o servidor valida o formato e limita cada foto a 512 KB. As fotos existentes são preservadas. Estoque permite procurar nome ou código e mostra preço e saldo.

### Catálogo copiado do Marquinho

Consulta de origem estritamente somente leitura. Copiados 128 produtos para Raquel testing usando preço de venda e **estoque central**, sem somar a quantidade da loja. Os 23 produtos originais foram preservados. Seis produtos sem preço permanecem inativos; 120 não possuem foto na origem. Não foram inventadas imagens nem compatibilidades: aplicações sem confirmação aparecem como “Confirme a aplicação”. A repetição da importação não duplicou registros nem restaurou estoques consumidos.

### Área do Cliente

O código aparece diretamente no card do pedido enquanto estiver disponível. A indicação de como chegar só terá link de rota após confirmação expressa do endereço em Configurações. Até lá, mostra aviso de endereço demonstrativo. Benefícios apresentados são os recursos reais da conta; não existe promessa de cashback sem uma regra comercial definida.

## Nome e PIN no balcão (em homologação)

Na aba Funcionários, a administradora define um PIN individual de seis dígitos para cada funcionário autorizado e confirma sua própria senha. Em cada computador da loja, usa Autorizar este computador e informa um nome como Balcão1. A autorização dura sete dias e pode ser revogada. Nenhum PIN deve ser compartilhado nem enviado no chat.

Na tela de acesso, Entrar com nome e PIN mostra somente os funcionários habilitados, em dispositivo autorizado. O funcionário seleciona seu nome, digita oPIN e recebe somente as seis seções operacionais. Trocar atendente encerra a sessão atual. A mesma conta pode atender em dispositivos diferentes, mas cada computador tem apenas um operadorPIN ativo por vez. Administração completa continua com e-mail e senha. CincoPINs incorretos bloqueiam o perfil por15minutos; revogar dispositivo/desativarPIN invalida as sessões correspondentes.

A nova estrutura foi aplicada somenteemtesting. Ativação de dispositivos reais e definição dePINs reais ficam com a administradora, após a publicação autorizada. Não converter as contas nem os dispositivos controlados dos testes em acessos reais.
