# Definição Dirigida por Domínio (Domain-Driven Design)

## 1. Contexto do Domínio  
O propósito central do sistema “Kaizen Lists” é **automatizar o controle de estoque**, **geração de pedidos** e **cálculo de cotações** de forma integrada, refletindo o fluxo de trabalho de diferentes áreas (Cozinha, Salão) e fornecedores.

### 1.1. Subdomínios e Bounded Contexts  
1. **Gestão de Estoque (Core Subdomain)**  
   - Responsável por manter informações de itens, áreas, quantidades e níveis mínimos.  
   - Bounded Context: *InventoryContext*  
2. **Processamento de Pedidos (Core Subdomain)**  
   - Calcula necessidades de compra, agrupa por fornecedor e rastreia ciclo de vida do pedido.  
   - Bounded Context: *OrderContext*  
3. **Cotações e Custos (Supporting Subdomain)**  
   - Permite registrar preços, gerar relatórios financeiros e comparativos de fornecedores.  
   - Bounded Context: *QuotationContext*  
4. **Autenticação e Administração (Generic Subdomain)**  
   - Gerencia usuários, perfis e permissões.  
   - Bounded Context: *AuthContext*  

## 2. Ubiquitous Language  
- **Item**: produto ou insumo controlado pelo sistema.  
- **Área**: setor de consumo (ex.: Cozinha, Salão).  
- **Estoque**: estado de um Item em uma Área, com quantidade atual e mínima.  
- **Pedido**: solicitação de compra de um Item a um Fornecedor, gerada quando o estoque mínimo não está atendido.  
- **Fornecedor**: entidade que supre um ou mais Itens.  
- **Cotação**: proposta de preço para um Pedido, agrupada por Fornecedor.  

## 3. Entidades, Value Objects e Agregados  

### 3.1. Inventário (InventoryContext)  
- Agregado **EstoqueAggregate**  
  - Raiz: **Estoque** (Entity)  
  - Entidade interna: **Item**  
  - Value Object: **Quantidade** (contém valor e unidade)  

### 3.2. Pedidos (OrderContext)  
- Agregado **PedidoAggregate**  
  - Raiz: **Pedido** (Entity)  
  - Entidade interna: **PedidoItem** (Item + QuantidadeSolicitada)  
  - Value Object: **StatusPedido** (Criado, Enviado, Cotado, Aprovado, Finalizado)  

### 3.3. Cotações (QuotationContext)  
- Agregado **CotacaoAggregate**  
  - Raiz: **Cotacao** (Entity)  
  - Entidade interna: **CotacaoItem** (Item, Quantidade, PrecoUnitario, Total)  
  - Value Object: **ValorMonetario** (moeda, quantidade decimal)  

### 3.4. Autenticação (AuthContext)  
- Agregado **UsuarioAggregate**  
  - Raiz: **Usuario** (Entity)  
  - Value Object: **Credenciais** (email, passwordHash)  
  - Value Object: **Permissao** (role, escopo)  

## 4. Serviços de Domínio e Regras de Negócio  
1. **CalcularPedidoService** (OrderContext)  
   - Entrada: Estoque → Saída: PedidoItem com QuantidadeSolicitada = max(EstoqueMin–Atual,0)  
2. **GerarListaFornecedorService** (OrderContext)  
   - Agrupa PedidoItems por Fornecedor e formata exportação.  
3. **RegistrarPrecoService** (QuotationContext)  
   - Atualiza CotacaoItem com PrecoUnitario e recalcula Total.  
4. **AutenticacaoService** (AuthContext)  
   - Valida Credenciais, emite Token JWT, gerencia sessão do usuário.  

## 5. Repositórios e Interfaces  
- **IEstoqueRepository**: métodos para obter e atualizar registros de Estoque.  
- **IPedidoRepository**: persistência de objetos Pedido e consulta por status.  
- **ICotacaoRepository**: CRUD de Cotacao e CotacaoItem.  
- **IUsuarioRepository**: CRUD de Usuario e validação de permissões.  

## 6. Mapeamento de Contextos e Integrações  
- *InventoryContext* publica evento **EstoqueBaixo** quando QuantidadeAtual < QuantidadeMinima.  
- *OrderContext* assina **EstoqueBaixo**, dispara **PedidoCriado**.  
- *QuotationContext* consome **PedidoCriado** para inicializar cotação.  

## 7. Conclusão  
A abordagem de **Domain-Driven Design** garante:
- **Clareza** na comunicação entre equipe técnica e stakeholders, por meio de uma linguagem onipresente.  
- **Isolamento** de responsabilidades em Bounded Contexts, reduzindo acoplamentos.  
- **Escalabilidade** e **facilidade de manutenção**, permitindo evoluir cada subdomínio de forma independente.