# Ajustes visuais e teste do link público — 16–17/11/2026

## Ajustes locais solicitados

- Home mostra somente Óleos, Freios e Transmissão. Cards horizontais de aproximadamente 74 px no desktop e 66 px no celular; imagens inteiras. Todas as categorias permanecem no catálogo.
- Banner mantém a moldura circular, agora uniforme e estável, sem pulsação, brilho giratório ou sombras internas fortes. Troca de produtos por fade de opacidade, sem deslocamento ou flutuação.
- O destaque usa os produtos originais da vitrine; fixtures do catálogo testing não entram no sorteio do banner. Isso corrige o rótulo indevido “TESTING” observado na primeira captura.
- Demais seções não foram redesenhadas. Sem alteração de schema, API, dados ou migrações de produção.

## Evidências locais

- Categorias: Playwright 1/1 aprovado, 53,1 s. Sete larguras, três cards, imagens contain, sem overflow, link para catálogo e categorias do servidor preservadas. Houve uma falha intermediária por quebra de título no tablet, corrigida sem relaxar a altura exigida.
- Banner: primeira validação visual 1/1 aprovada em 56,5 s; repetição após restringir a seleção editorial APROVADA em 19,7 s (24 s total). Nenhum slide com ID de fixture; todas as imagens/links, moldura e sete larguras conferidos.
- Pastas: `evidence/home-categories-2026-11-16/` e `evidence/home-banner-2026-11-16/`. Screenshots desktop/mobile inspecionadas. Um worker e um navegador por vez; nenhum timeout aumentado.

## Link público efetivamente testado

Endereço: https://raquel-loja-ew91.vercel.app/

Esta é uma versão estática antiga. `/api/health` e `/assets/js/api.js` retornam 404. O código público da conta informa que não existe login real; pedidos e dados são armazenados exclusivamente no navegador. Não confundir este resultado com a implementação real Fastify/Neon presente no projeto local.

O script `scripts/check-public-demo.mjs` abriu uma sessão isolada e bloqueou toda requisição de escrita de rede. Resultado aprovado:

- Dois produtos adicionados pelo navegador ao carrinho.
- Nome, telefone e e-mail inválidos rejeitados no checkout, com mensagens nos campos e sem concluir a reserva.
- Reserva demonstrativa para retirada criada com dados sintéticos e e-mail reservado example.test.
- Código demonstrativo gerado com **sete caracteres**, diferente do código real de cinco dígitos do backend novo.
- Pedido demonstrativo consultado na página da conta, que confirma ausência de login real.
- Sem erros de JavaScript. Nenhum pedido, pagamento ou alteração de estoque criado no servidor; nenhuma escrita de rede realizada.

Evidências locais: `evidence/public-demo-2026-11-16/result.json`, `invalid-checkout-390.png`, `demo-pickup-code.png`, `demo-order.png` e `demo-customer-account-390.png`. `demo-order.json` contém somente o pedido sintético dessa sessão, sem senha nem token. Os arquivos de evidência não são versionados nem publicados.

A primeira tentativa da automação esperava a extensão .html, mas Vercel redireciona para URLs limpas. Corrigida a verificação da URL; não é falha do checkout.

## Próxima etapa interativa

Usuário pediu que o teste pare para solicitar o código antes do atendimento. Solicitar o código exibido na captura demonstrativa. Não marcar pagamento real: nesta URL não existem sessão real, backend nem integração Neon. A simulação de balcão deve continuar identificada como demonstração e restrita ao pedido sintético salvo.

## Commit e redeploy

Commit e redeploy autorizados expressamente pelo usuário. Nova verificação do acesso Vercel: HTTP 403, código forbidden, tanto em `/v2/user` quanto no projeto `raquel-loja-ew91`, com a equipe local configurada. Nenhum token foi exibido.

O redeploy está bloqueado por autenticação. Além disso, o destino atual é estático e não hospeda a API nova. Publicar o frontend atual sem configurar a API deixaria o fluxo real incompleto; não conectar a publicação ao Neon testing. Restabelecer o acesso Vercel e preparar a hospedagem/rotas e variáveis secretas da API antes da publicação completa.

Nenhum push ou alteração de produção realizado nesta rodada.
