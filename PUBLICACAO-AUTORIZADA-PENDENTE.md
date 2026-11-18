# Publicação autorizada e concluída — 18/11/2026

**Estado atual: CONCLUÍDA.** A migração PIN foi aplicada em produção e o deploy `dpl_3N8A7wptcNvpEbWPAMWiS6dKS1To` está READY no endereço https://raquel-loja-ew91.vercel.app . Os arquivos públicos dos painéis foram comparados com o código local e são idênticos. Não repetir a migração.

Os 128 produtos selecionados do Marquinho também foram importados para produção após nova conferência somente leitura dos preços e estoque central na origem: 128/128 verificados, 122 ativos e seis sem preço inativos. Os 23 produtos originais foram preservados (151 cadastrados ao todo); pedidos e usuários mantiveram as contagens anteriores. Nenhum dado de teste nem acesso real com PIN fixo foi criado. A origem Marquinho permaneceu intacta.

Os 122 importados ativos foram conferidos pela API oficial e páginas reais de óleo/capacete e busca do catálogo passaram no navegador. Evidência: evidence/deployment/production-browser/import-result.json. Nenhuma compra fictícia em produção.

## Histórico do bloqueio já resolvido

O usuário respondeu **“Autorizar estrutura e publicação”** para aplicar em produção a migração aditiva do PIN/dispositivos e publicar todos os ajustes na URL oficial. Essa autorização está vigente; não solicitar novamente para a mesma operação.

A ferramenta Neon recusou a consulta preparatória por falha na revisão automática: limite de uso atingido. A mensagem esclareceu que a ação não foi executada e que isso não é uma determinação de insegurança. Não contornar a revisão com outro caminho de acesso. Nenhuma nova migração ou publicação em produção foi feita nesta retomada.

## Estado comprovado

- Branch GitHub: `finalizacao-balcao-pin`; commit da aplicação `c3d4c68` já enviado.
- Prévia READY: https://raquel-loja-ew91-9ne8ttb2h-lp070087-5894s-projects.vercel.app
- Deploy de prévia: `dpl_4DMzuK3p3xTYtNsNPMP4x3RpzDYu`.
- Três compras reais Vercel + Neon testing aprovadas (Pix, cartão, dinheiro), inclusive carrinho, códigos, pagamento/retirada e atualização do cliente. Total9,8min, um navegador maximizado e cliques lentos.
- Cenário768px pendente repetido e aprovado.
- Novo Estoque aprovado por teste HTTP/backend dirigido, interface em sete larguras e navegador com Neon testing real. Quatro indicadores globais e filtros de1a5/zerados; consulta SQL independente confirmou os mesmos totais da API.
- Todas as fixtures desta rodada tiveram seus privilégios temporários removidos e sessões revogadas. Nenhuma conta ou pedido de teste deve ser copiado para produção.
- Marquinho permaneceu somente leitura. Catálogo importado128 continua somente testing.
- Relatórios mais recentes estão em PROGRESSO-CODEX.md e FINALIZACAO-VALIDACAO.md; as últimas anotações desses arquivos e este checkpoint ainda precisam de commit/push documental.

## Procedimento executado após restabelecer a revisão das ferramentas (histórico)

1. Fazer a consulta preparatória na produção Raquel `steep-hill-55153393`, branch `br-lucky-art-b6u83tc8`; confirmar identidade, seis migrações concluídas e ausência da nova estrutura. Preservar contagens de produtos/pedidos/usuários.
2. Aplicar exclusivamente a migração `20261118090000_counter_pin` em transação com guarda de branch e limite de bloqueio. Arquivo: backend/prisma/migrations/20261118090000_counter_pin/migration.sql. SHA256: `fba1086fa0b707f66db8c34e2c40d9e47db45aaf1d6aa23edb35f6158a5a2b3e`. Duas tabelas novas e Session.terminalId nullable; sem exclusão de dados. Registrar corretamente a migração no histórico Prisma, sem duplicação.
3. Publicar via Vercel CLI com `deploy --prod --yes`. Projeto existente, sem recriação. Verificar READY e alias https://raquel-loja-ew91.vercel.app .
4. Executar somente leitura na produção: API/catalogo/categorias, negação de ADMIN anônimo, proteção de arquivos privados e Playwright production-read com um worker. Não criar compras fictícias em produção.
5. Registrar resultado, verificar contagens preservadas e fazer commit/push dos documentos na branch de revisão. Não realizar merge em main sem instrução específica.

Não redefinir senhas nem criar PINs fixos para funcionários reais. A administradora configurará os próprios dispositivos e PINs pelo painel após a publicação. Pendências comerciais e operacionais continuam em PENDENCIAS-PARA-APROVACAO.md.
