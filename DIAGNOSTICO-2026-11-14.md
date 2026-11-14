# Diagnóstico e finalização — 14/11/2026

## Escopo e autorização atual

Revisar rotas, vitrine e Área do Cliente, priorizando celular; corrigir falhas, testar, fazer commit e tentar publicação. A autorização atual de commit/deploy substitui a restrição histórica desses atos. Testes e fixtures continuam exclusivos de Neon testing; nenhuma alteração de dados ou migração em production foi executada.

## Comprovado nesta execução

- TypeScript e build: aprovados.
- Sintaxe: 40 verificações aprovadas.
- Testes locais: 16 aprovados; os dois testes HTTP foram repetidos com acesso local autorizado após EACCES da sandbox.
- Backend: 56 aprovados. As 37 integrações Neon são ignoradas por esse comando; não são nova aprovação dessas integrações.
- Fastify compilado confirmou isolamento dos identificadores reais de Neon antes de conectar exclusivamente a testing.
- Loja iniciada em http://127.0.0.1:8000/ e API testing em http://127.0.0.1:3001/api/health.
- Nenhum processo de navegador Playwright remanescente foi encontrado; nenhum programa pessoal foi encerrado.

## Testes mobile em andamento

Automação em `tests/routes-mobile.spec.mjs` com um worker e timeouts finitos, sete larguras (320, 375, 390, 430, 768, 1024, 1440), menus, alinhamento de links, imagens, links internos, seções da conta, checkout e pedido real.

Tentativa inicial: binário Chromium esperado pela versão atual ausente. Chrome instalado foi usado. A primeira execução real verificou dez rotas e perfil nas sete larguras sem overflow/imagens quebradas, mas não terminou aprovada: o teste não aguardava o redirecionamento de pedido anônimo; captura do perfil excedeu 30 s quando memória livre caiu a aproximadamente 13 MB. Corrigida a espera de redirecionamento; reduzidas capturas redundantes, mantendo as assertivas de todas as larguras e seções. Sem aumento de timeout. Não declarar aprovação integral dessa tentativa.

Evidências locais: `evidence/routes-mobile-2026-11-14/`. Evidências, ambiente, dependências, builds e relatórios temporários permanecem fora do Git. Os arquivos são preservados no disco.

## Publicação: bloqueios concretos

- Projeto possui publicações históricas na Vercel e GitHub autenticado.
- Token Vercel local retornou HTTP 403 ao consultar projetos. Não foram mostrados tokens nem tentado contornar permissões.
- Configuração Vercel atual é estática; `.vercelignore` exclui backend. Frontend usa `/api` fora de localhost, sem backend hospedado ou rewrite configurado neste projeto. Publicar somente esse pacote não entrega cadastro, conta e pedidos funcionais.
- Necessário restabelecer acesso ao projeto Vercel e definir/configurar hospedagem da API e suas variáveis secretas pelo canal apropriado. Não publicar a API de testing como produção.
- Dados comerciais/fiscais continuam provisórios por decisão anterior: nome, WhatsApp, endereço, horários e CNPJ. SMTP real, política de reembolso e acessos definitivos continuam pendências operacionais.

## Comando de validação direcionada

Com frontend e API testing ativos e build atualizado:

```powershell
node backend/node_modules/@playwright/test/cli.js test --config=playwright.routes.config.mjs --workers=1
```

`PLAYWRIGHT_EXECUTABLE_PATH` permite selecionar navegador já instalado sem instalar dependências; na ausência usa Chrome. Não executar outro navegador em paralelo em ambiente com pouca RAM.

## Atualização comprovada

- Conta real: sete seções do menu, sete larguras sem overflow, carrinho, checkout e pedido PENDING com código de cinco dígitos APROVADOS em 28,6 s. Evidência preservada em evidence/routes-mobile-2026-11-14/account-approved.json.
- Rotas públicas grupos 1 e 2 APROVADOS (1,6 min e 56,3 s). Grupo 3 em execução. Agrupamento separa cenários independentes; mantém timeouts por operação e não aumenta limites para ocultar falhas.
- Memória tornou a cair a 13 MB. Nenhum aplicativo pessoal encerrado.
- Limpeza complementar exclusiva da fixture que restou desta execução: 2 privilégios temporários removidos, 0 sessões ativas; contas, pedidos e auditoria preservados.
- Revisão pré-commit: 136 arquivos preparados, nenhum arquivo proibido (.env, dependências, builds ou evidências); os dois apontamentos da busca por strings de conexão eram exemplos falsos intencionais dos testes. Três linhas vazias finais corrigidas.

## Resultado final comprovado desta retomada

- **12 rotas públicas aprovadas**, em três grupos independentes: grupos 1/2 na execução anterior (1,6 min e 56,3 s), grupo 3 repetido sozinho e aprovado em 15,6 s. Não é alegada uma única execução limpa de todos os casos. Inclui produto válido/inválido, pedido anônimo redirecionado, login da equipe, links internos e abertura/fechamento/seleção do menu mobile.
- **7 seções da conta e checkout/pedido real aprovados**, 28,6 s: perfil, endereços, motos, favoritos, pedidos, segurança e visão geral; carrinho, pagamento PENDING e código de exatamente cinco dígitos consultado no pedido do cliente. Esta rodada verifica navegação dessas seções; não é nova execução de todos os CRUDs ou das 37 integrações de banco.
- Sete larguras verificadas, sem overflow nas medições aprovadas e sem imagens quebradas detectadas. Nenhum pageerror nos cenários aprovados. Capturas da home e menu da conta em 390 px também inspecionadas visualmente; botões/menu alinhados, identidade preservada.
- Falhas intermediárias e correções: binário esperado ausente (usado navegador leve já instalado), redirecionamento aguardado explicitamente, clique de navegação validado pela URL/formulário em vez de aguardar load de todos os recursos externos, captura redundante reduzida e teste público dividido em grupos independentes. **Nenhum timeout aumentado.**
- Evidências: account-approved.json, public-groups-1-2-approved.json, public-group-3-approved.json e summary.json em evidence/routes-mobile-2026-11-14/. Screenshots home-390.png, catalogo-390.png, account-overview-390.png, checkout-390.png e order-390.png. Evidências locais não entram no commit nem no pacote público.
- TypeScript/build, 40 verificações de sintaxe, 16 testes locais e 56 testes backend aprovados. Nova aprovação da conexão testing por identificadores reais e pedido persistido; 37 integrações não reexecutadas. Sem migrações nesta rodada.
- Commit local autorizado: consolida trabalho anterior preservado, testes e diagnóstico. Sem push automático para evitar disparar a publicação estática com API ausente. Deploy completo bloqueado por Vercel 403 e ausência de hospedagem/rewrite da API; autorização do usuário existe, acesso/configuração ainda faltam. Nenhuma alteração em production.

### Próxima ação operacional

Restabelecer autenticação do projeto Vercel e confirmar/configurar hospedagem da API, origem HTTPS e segredos pelo canal seguro. Depois substituir dados comerciais/fiscais provisórios confirmados, configurar SMTP e acessos definitivos, validar no domínio final e publicar. Política de reembolso continua necessária; pedidos pagos permanecem sem cancelamento automático. Não conectar publicação pública ao Neon testing.
