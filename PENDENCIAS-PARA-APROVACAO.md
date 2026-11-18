# Ajustes e pendências para aprovação — 18/11/2026

## Preparados nesta revisão

- Produtos menores, três por linha no desktop, categorias como filtros e categoria previamente selecionada ao cadastrar.
- Identificação do usuário no rodapé do menu, acima de Voltar para a loja; ordem das abas administrativas preservada.
- Relatórios com quatro indicadores equilibrados, situação de pedidos, recebimentos e ranking; pagamentos em cards; configurações agrupadas.
- Seis seções operacionais para funcionário, com autorização no servidor e dados de cliente limitados ao atendimento.
- Acesso por nome e PIN em dispositivo autorizado; revogação, troca de atendente, bloqueio por tentativas e sessões vinculadas ao computador.
- Consulta de pedidos por número, cliente, produto/SKU e situação.

## Lista histórica de pendências (atualização abaixo)

1. **Venda avulsa/PDV diretamente no balcão:** o atendimento atual recebe pedidos criados pelo cliente no site. Montar um carrinho novo para cliente que chega à loja, calcular troco e emitir venda avulsa ainda não está implementado.
2. **Cadastro por cópia/variações de produto:** é possível cadastrar/editar produtos e escolher categoria. Ainda não existe botão para duplicar um produto e alterar apenas marca, volume ou tamanho. O exemplo no campo de nome não é um cadastro automático.
3. **Catálogo Marquinho em produção:** 128 produtos copiados com estoque central permanecem em testing. Não importar em produção sem revisar a lista; seis sem preço estão inativos, 120 sem foto e aplicações sem comprovação sinalizadas. Não alterar a origem Marquinho.
4. **Preços comerciais e estoque inicial:** os 23 produtos originais publicados têm valores de apresentação. Revisar comercialmente, incluindo óleos, antes de tratar como preço definitivo. Não inventar preço, saldo ou aplicação.
5. **PIN em produção:** a nova migração aditiva de dispositivos/PIN/sessões foi aplicada somente em testing. Após a validação real, a estrutura de produção e ativação dos computadores reais dependem de autorização específica. Nenhum funcionário real recebeu PIN fixo ou conta de teste.
6. **Fotos e dados da loja:** nome comercial, WhatsApp, endereço definitivo, horários e CNPJ aguardam confirmação. A rota Como chegar permanece sem endereço inventado.
7. **E-mail:** provedor SMTP e entrega real de recuperação/verificação não configurados/validados.
8. **Reembolso:** falta política e processo de reembolso; cancelamento automático de pedido pago continua bloqueado. Não existe estorno fictício.
9. **Cashback:** não implementado por ausência de regra comercial. A conta mostra benefícios efetivamente existentes, conforme combinado.
10. **Integrações completas:** a suíte local de 42 integrações Prisma permanece sem nova aprovação por conexão TCP intermitente. Os testes HTTP/Vercel/Neon reais devem ser descritos pelo que efetivamente executarem, sem substituir essa contagem.

Entrega está desativada por decisão comercial. Pagamento exclusivamente presencial. Não introduzir cobrança online ou reconstruir o projeto para tratar essas pendências.


## Atualização efetiva — 18/11/2026
Itens3e5resolvidos:catálogoMarquinhoimportadoemprodução e estruturaPIN/publicação concluídas.128copiados,122ativos,6inativossem preço,23originais mantidos. Preços eestoque centralconferidoscomorigemread-only. Continuam revisão comercialdos23originais e dadosfaltantes(6preços/120fotos/aplicações),PDVavulso,cadastroporcópia,dadoscomerciais,SMTP,reembolso ecashbacksemregra. Não repetir migraçãoouimportação,nem restaurarsaldos por nova carga.
