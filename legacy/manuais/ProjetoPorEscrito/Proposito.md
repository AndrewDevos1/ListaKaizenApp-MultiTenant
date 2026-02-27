# Relatório Executivo do Projeto “Kaizen Lists” Web App

## 1. O Que o Projeto Faz  
O sistema “Kaizen Lists” Web App automatiza o fluxo de gestão de estoque, geração de pedidos e controle de cotações para organizações que precisam acompanhar consumos em diferentes áreas (por exemplo, Cozinha e Salão). Em vez de distribuir planilhas Excel manuais, o aplicativo web consolida dados de múltiplos colaboradores, gera pedidos quando os níveis mínimos de estoque são atingidos e permite o cálculo de custos por fornecedor.

## 2. Como o Projeto Funciona  
1. **Cadastro e Controle de Acesso**  
   - Colaboradores criam conta e solicitam autorização.  
   - Administradores aprovam acesso e definem permissões (colaborador ou administrador).  
   - Autenticação via JWT garante sessões seguras e filtros de autorização em cada operação.

2. **Gestão de Estoques e Preenchimento de Listas**  
   - Cada área (Cozinha, Salão) possui sua própria lista de itens e níveis mínimos.  
   - Colaboradores acessam apenas as listas liberadas e preenchem as quantidades atuais.  
   - Dados de rascunho são salvos continuamente, permitindo retomada a qualquer momento.

3. **Geração Automática de Pedidos**  
   - Sempre que a quantidade atual fica abaixo do estoque mínimo, o sistema calcula o pedido necessário ($$Pedido = \max(EstoqueMin – QuantAtual,0)$$).  
   - Itens com pedido positivo são agrupados por fornecedor.

4. **Submissão e Consolidação**  
   - Ao concluir o preenchimento, o colaborador submete sua lista.  
   - O sistema atualiza o modelo mestre, consolidando todos os pedidos em um dashboard para o administrador.

5. **Exportação de Pedidos**  
   - Administradores podem filtrar pedidos por fornecedor e gerar um texto organizado (item e quantidade) para copiar e colar em mensagens ou sistemas de comunicação.  
   - Não há integração direta com WhatsApp ou outros canais externos; a saída é um relatório simples e legível.

6. **Cálculo de Cotações e Relatórios de Custo**  
   - Com base nos pedidos, o administrador registra preços unitários por fornecedor.  
   - O sistema calcula automaticamente os totais por item, por fornecedor e um total geral de custos.  
   - Relatórios interativos permitem análise rápida de orçamentos.

## 3. Por Que o Projeto Existe  
1. **Padronização e Confiabilidade**  
   - Substituir várias planilhas descentralizadas por uma única plataforma central evita erros de versão, fórmulas quebradas e duplicações indevidas.  
2. **Automação e Eficiência**  
   - Cálculo automático de pedidos reduz trabalho manual e garante reposição oportuna de insumos sem excessos ou faltas.  
3. **Transparência e Controle**  
   - Dashboard unificado fornece visão em tempo real dos consumos e necessidades, facilitando decisões de compra e planejamento.  
4. **Escalabilidade e Manutenção**  
   - Arquitetura modular em 3FN permite expansão para novos fornecedores, áreas ou integrações futuras (ex.: bots de mensagens ou ERPs).  
5. **Flexibilidade Operacional**  
   - Interface web responsiva atende diferentes dispositivos, possibilitando preenchimento de listas in loco (tablet, celular) e acesso remoto.

***

**Conclusão**  
O “Kaizen Lists” Web App transforma um processo manual e propenso a erros em um fluxo digital integrado, melhorando a acurácia de pedidos, otimizando custos e garantindo a satisfação de equipes operacionais e administrativas.