# Modelo Entidade-Relacionamento (3FN) para “Kaizen Lists” Web App

## 1. Visão Geral  
O modelo a seguir reflete em 3ª Forma Normal (3FN) a lógica do Excel “LISTA-KAIZEN-2024”, permitindo gerenciar estoques, pedidos, fornecedores e cotações.

## 2. Entidades e Atributos

1. **Item**  
   - ItemID (PK)  
   - Nome (único)  
   - UnidadeMedida  

2. **Área**  
   - AreaID (PK)  
   - Nome (ex.: “Cozinha”, “Salão”)  

3. **Fornecedor**  
   - FornecedorID (PK)  
   - Nome  
   - Contato  
   - MeioEnvio (e.g., WhatsApp)  

4. **Estoque**  
   - EstoqueID (PK)  
   - ItemID (FK → Item.ItemID)  
   - AreaID (FK → Área.AreaID)  
   - QuantidadeAtual  
   - QuantidadeMinima  

5. **Pedido**  
   - PedidoID (PK)  
   - ItemID (FK → Item.ItemID)  
   - QuantidadeSolicitada  
   - DataPedido  
   - FornecedorID (FK → Fornecedor.FornecedorID)  

6. **Cotação**  
   - CotacaoID (PK)  
   - FornecedorID (FK → Fornecedor.FornecedorID)  
   - DataCotacao  

7. **CotacaoItem**  
   - CotacaoItemID (PK)  
   - CotacaoID (FK → Cotacao.CotacaoID)  
   - ItemID (FK → Item.ItemID)  
   - Quantidade (ref.: Pedido.QuantidadeSolicitada)  
   - PrecoUnitario  
   - TotalItem (derivado = Quantidade × PrecoUnitario)  

## 3. Relacionamentos

- Um **Item** pode pertencer a vários **Estoque** (uma por Área).  
- Uma **Área** agrega vários **Estoque**.  
- Quando `QuantidadeMinima − QuantidadeAtual > 0`, gera-se um **Pedido** para cada **Item** e **Fornecedor**.  
- Um **Fornecedor** provê múltiplos **Pedido** e várias **Cotação**.  
- Cada **Cotacao** engloba múltiplos **CotacaoItem**, vinculados a **Item**.  

## 4. Normalização

1. **1FN**:  
   - Todos os atributos são atômicos (ex.: QuantidadeAtual, PrecoUnitario).  
2. **2FN**:  
   - Cada entidade com PK simples; não há dependência parcial em chaves compostas.  
3. **3FN**:  
   - Não existem dependências transitivas:  
     - Atributos não-chave (e.g., TotalItem) são derivados, mas podem ser calculados on-the-fly, não armazenados.  
     - Dados do Fornecedor permanecem isolados na entidade **Fornecedor**.  

***

Este modelo ER atende ao fluxo de leitura de consumos (áreas), geração de pedidos automáticos, consolidação por fornecedor e cálculo de cotações, garantindo integridade e desempenho em 3FN.