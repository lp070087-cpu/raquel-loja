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

## Redeploy concluído — 18/11/2026

Autorização específica recebida para migração aditiva de fotos e publicação. Aplicação commit0618aef publicada como dpl_4n2zUEDYLGDtZvpomRtbUAkf14kr, READY, no domínio https://raquel-loja-ew91.vercel.app . Migração20261118010000_catalog_media concluída com checksum844b083f0a0490b7706ba382dd853748b50fc2c4a22f55970ce8175b60a2a684. Produtos/pedidos/usuários preservados; Marquinho sem alterações e importação128ainda apenas testing. Sem push.

Pós-publicação: APIhealth/catálogo/categorias200,ADMINanônimo401,arquivoambiente404. Navegador somente leitura1/1PASS22,1s total, incluindo sete larguras, catálogo real, três categorias, menu mobile, acessos de cliente/equipe e zero erros de script. Evidência evidence/deployment/production-browser/result.json. Não foram executadas compras nem criadas contas de teste em produção. Pendências comerciais, SMTP e integrações locais permanecem descritas no relatório.


## Liberação efetiva em produção — 18/11/2026
Bloqueio anterior de revisão por limite de uso resolvido. Autorização do usuário reutilizada, sem nova solicitação. Produção confirmadabr-lucky-art-b6u83tc8 com6migrações antes daação. Migração20261118090000_counter_pin aplicada emtransaçãoaditiva comguarda,locktimeout5s,checksumfba1086fa0b707f66db8c34e2c40d9e47db45aaf1d6aa23edb35f6158a5a2b3e ehistóricoPrisma. Nenhum PINoucomputadorreal foi criado automaticamente.
Deploydpl_3N8A7wptcNvpEbWPAMWiS6dKS1To READY; oficial https://raquel-loja-ew91.vercel.app . Arquivosadmin-gestao.js,admin.js,admin-resumos.js,admin-balcao.js eadmin.css HTTP200 ehashesidênticos ao códigolocal(normalizaçãoCRLF). Agora Estoque,Relatórios,Configurações,footeridentidade,3cardsprodutos,filtros ePIN estão naURLoficial. Nãoorientarusuárioa usaroutraURL para veressesajustes.
Usuário reiterou que os valorescopiadosnãoapareciamno site. ReconsultadaorigemMarquinho SOMENTESELECT128registros:preçoVenda,estoquecentral,código eimagem idênticosaosnapshot validado. Preflightprodução0conflitosID/SKU,7categoriasexistentes. Importação128Product+8ProductImage em1transaçãoguardada(138statements);nenhumaescritaMarquinho. Verificação128/128id/SKU/centavos/quantidade/atividade/hash semdivergências. Produçãoagora151produtos(23originais+128copiados),1pedido e1usuáriopreservados,0StaffPin/0CounterTerminal.122copiadosativos,6sem preço inativos,120semfotonaorigem,compatibilidadependente explícita. Nãoinventarpreços/fotos/aplicações. Não copiarclientes/pedidos/cuponsteste.
Browserpúblicosomenteleitura verificouAPI122importadoscompreços/stockiguais,detalhesóleo ecapacete,busca,zeroerrosdescript. Evidências evidence/deployment/production-browser/import-result.json,capturasimported-oleos.png/imported-capacetes.png epublished-assets.json. Health/categorias200,ADMINanônimo401,backend/.env404. Testepúblicogeral7larguras emandamento(verresultadoantesdeafirmarPASS).

Verificação pública final1/1PASS(31,4scenário,1,2mintotal),Playwright1worker,somenteleitura,7larguras,3categorias,catálogo,banner,menumobile,logincliente/equipe,zeroerrosdescript. MigraçãoPINreadbackchecksumcorretofinished=true. Importaçãoprod151total/128copiados/122copiadosativosconfirmada. Nenhum pedidoouusuáriode testecriadoemprodução. Dadosanteriorespreservados.
