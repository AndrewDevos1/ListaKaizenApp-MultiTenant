# 📋 ARQUITETURA DE PEDIDOS - Como Funciona

**Pergunta:** "Essa lista de pedido gerada pela submissão do usuário ela gera uma nova lista no banco de dados?"

**Resposta:** ❌ **NÃO!** Pedido **NÃO cria nova Lista**. É uma tabela separada.

---

## 🏗️ ARQUITETURA COMPLETA

### 📊 **3 Entidades Principais:**

```
┌─────────────────────────────────────────────────────────────────┐
│  1️⃣  LISTA (Lista de Compras)                                   │
│  Tabela: listas                                                 │
│  Propósito: Organizar itens por categoria/fornecedor           │
├─────────────────────────────────────────────────────────────────┤
│  id              │ nome      │ descricao    │ data_criacao     │
│  4               │ Tokudai   │ NULL         │ 2025-12-24       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ contém
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2️⃣  LISTA_ITEM_REF (Itens da Lista)                           │
│  Tabela: lista_item_ref                                         │
│  Propósito: Relacionar lista com itens + quantidades           │
├─────────────────────────────────────────────────────────────────┤
│  lista_id │ item_id │ qtd_atual │ qtd_minima │ atualizado_em  │
│  4        │ 7       │ 2.0       │ 10.0       │ 2025-12-26     │ ← Arroz
│  4        │ 12      │ 0.0       │ 5.0        │ 2025-12-26     │ ← Alga Nori
│  4        │ 18      │ 15.0      │ 10.0       │ 2025-12-26     │ ← Cogumelo (OK!)
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ quando qtd_atual < qtd_minima
                            │ gera automaticamente
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3️⃣  PEDIDO (Ordem de Compra)                                  │
│  Tabela: pedidos                                                │
│  Propósito: Registrar necessidade de compra                    │
├─────────────────────────────────────────────────────────────────┤
│  id │ item_id │ qtd_solicitada │ fornecedor_id │ status │ ...  │
│  1  │ 7       │ 8.0           │ 5             │ PEND.  │ ...  │ ← Falta 8 de Arroz
│  2  │ 12      │ 5.0           │ 5             │ PEND.  │ ...  │ ← Falta 5 de Alga
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO COMPLETO: DO SUBMIT ATÉ O PEDIDO

### **PASSO 1: Colaborador Preenche Quantidades**

```
Tayan acessa Lista "Tokudai" (ID=4)
Frontend exibe 32 itens via ListaItemRef

Item: Arroz
  Qtd Atual: [  2  ] ← Tayan digita
  Qtd Mínima: 10
  Pedido: 8 (calculado automaticamente)
```

### **PASSO 2: Colaborador Submete Lista**

```javascript
// Frontend envia:
POST /listas/4/estoque/submit
{
  "items": [
    { "estoque_id": 7, "quantidade_atual": 2 },    // Arroz
    { "estoque_id": 12, "quantidade_atual": 0 },   // Alga Nori
    { "estoque_id": 18, "quantidade_atual": 15 }   // Cogumelo
  ]
}
```

### **PASSO 3: Backend Processa Submit**

```python
def submit_estoque_lista(lista_id, usuario_id, items_data):
    refs_atualizados = []
    pedidos_criados = []
    
    for item_data in items_data:
        # 1. Busca ListaItemRef
        ref = ListaItemRef.query.filter_by(
            lista_id=4,
            item_id=7  # Arroz
        ).first()
        
        # 2. Atualiza quantidade
        ref.quantidade_atual = 2  # Valor digitado por Tayan
        db.session.add(ref)
        refs_atualizados.append(ref)
        
        # 3. Verifica se precisa criar Pedido
        if 2 < 10:  # qtd_atual < qtd_minima
            quantidade_a_pedir = 10 - 2  # = 8
            
            # 4. Cria Pedido (⚠️ ATUALMENTE DESABILITADO)
            novo_pedido = Pedido(
                item_id=7,
                quantidade_solicitada=8,
                fornecedor_id=5,
                usuario_id=2,  # Tayan
                status=PedidoStatus.PENDENTE
            )
            db.session.add(novo_pedido)
            pedidos_criados.append(novo_pedido)
    
    db.session.commit()
    return {"pedidos_criados": len(pedidos_criados)}
```

### **PASSO 4: Resultado no Banco de Dados**

**ANTES DO SUBMIT:**
```sql
-- lista_item_ref
lista_id | item_id | qtd_atual | qtd_minima
4        | 7       | 0.0       | 10.0       ← Vazio
4        | 12      | 0.0       | 5.0        ← Vazio

-- pedidos
(vazio)
```

**DEPOIS DO SUBMIT:**
```sql
-- lista_item_ref (ATUALIZADO)
lista_id | item_id | qtd_atual | qtd_minima
4        | 7       | 2.0       | 10.0       ← ✅ Atualizado!
4        | 12      | 0.0       | 5.0        ← ✅ Atualizado!

-- pedidos (NOVOS REGISTROS)
id | item_id | qtd_solicitada | fornecedor_id | status   | usuario_id
1  | 7       | 8.0           | 5             | PENDENTE | 2
2  | 12      | 5.0           | 5             | PENDENTE | 2
```

---

## 📊 DIFERENÇA: LISTA vs PEDIDO

### ✅ **LISTA** (Lista de Compras)

**Propósito:** Organizar itens para controle de estoque

**Características:**
- Criada pelo **ADMIN**
- Atribuída a **COLABORADORES**
- Contém **múltiplos itens** (via ListaItemRef)
- **Permanente** (não é deletada após uso)
- Reutilizável (mesma lista usada múltiplas vezes)

**Exemplo:**
```
Lista "Tokudai"
├─ Arroz (qtd_min: 10)
├─ Alga Nori (qtd_min: 5)
├─ Cogumelo (qtd_min: 10)
└─ ... (32 itens no total)
```

**Atualização:**
- Colaborador **atualiza** `quantidade_atual` semanalmente
- Lista **permanece** no sistema

---

### 📦 **PEDIDO** (Ordem de Compra)

**Propósito:** Registrar necessidade de compra de UM item específico

**Características:**
- Criado **AUTOMATICAMENTE** ao submeter lista
- Um pedido = **UM item**
- Tem **status** (PENDENTE → APROVADO/REJEITADO)
- Vinculado a **fornecedor** específico
- **Transitório** (depois de aprovado/rejeitado, vira histórico)

**Exemplo:**
```
Pedido #1
├─ Item: Arroz (ID=7)
├─ Quantidade: 8 unidades
├─ Fornecedor: Fornecedor X (ID=5)
├─ Status: PENDENTE
├─ Solicitante: Tayan (ID=2)
└─ Data: 2025-12-26
```

**Fluxo de Vida:**
1. **CRIADO** → quando qtd_atual < qtd_minima
2. **PENDENTE** → aguardando aprovação do admin/gerente
3. **APROVADO** → pode gerar cotação/compra
4. **REJEITADO** → não será comprado (motivo X)

---

## 🔗 RELACIONAMENTOS

### **1. Lista ↔ ListaItemRef (1:N)**
```
Lista "Tokudai" (1)
  ↓ tem
ListaItemRef (N)
  - Arroz
  - Alga Nori
  - Cogumelo
  - ... (32 itens)
```

### **2. ListaItemRef ↔ ListaMaeItem (N:1)**
```
ListaItemRef (lista_id=4, item_id=7)
  ↓ referencia
ListaMaeItem (id=7)
  - nome: "Arroz"
  - unidade: "kg"
```

### **3. Pedido ↔ Item (N:1)** ⚠️ PROBLEMA ATUAL
```
Pedido (item_id=7)
  ↓ deveria referenciar
ListaMaeItem (id=7)  ← Catálogo global

MAS:
Pedido FK aponta para 'itens.id' (tabela legada, vazia!)
```

### **4. Pedido ↔ Fornecedor (N:1)**
```
Pedido (fornecedor_id=5)
  ↓ comprar de
Fornecedor (id=5)
  - nome: "Fornecedor X"
```

### **5. Pedido ↔ Usuario (N:1)**
```
Pedido (usuario_id=2)
  ↓ solicitado por
Usuario (id=2)
  - nome: "Tayan"
  - role: COLLABORATOR
```

---

## 📋 TABELAS NO BANCO (Resumo)

### Tabelas de Estrutura:
```sql
listas               -- Listas de compras (Tokudai, etc)
lista_mae_itens      -- Catálogo global (Arroz, Alga Nori...)
lista_item_ref       -- Liga lista ↔ item + quantidades
```

### Tabelas de Processo:
```sql
pedidos              -- Ordens de compra geradas
cotacoes             -- Cotações de preços (relacionado a pedidos)
fornecedores         -- Fornecedores disponíveis
```

### Tabelas de Usuário:
```sql
usuarios             -- Admin, Colaboradores
lista_colaborador    -- Liga usuário ↔ lista (quem tem acesso)
```

---

## 🎯 EXEMPLO COMPLETO DO FLUXO

### **Cenário: Tayan submete lista "Tokudai"**

#### **Estado Inicial:**
```
Lista "Tokudai" (id=4)
└─ ListaItemRef
   ├─ Arroz: qtd_atual=0, qtd_min=10  ← Precisa comprar 10!
   ├─ Alga: qtd_atual=0, qtd_min=5    ← Precisa comprar 5!
   └─ Cogumelo: qtd_atual=15, qtd_min=10  ← OK, não precisa

Pedidos: (vazio)
```

#### **Ação: Tayan preenche e submete**
```
Tayan digita:
- Arroz: 2 kg (tinha 2 no estoque)
- Alga: 0 (não tinha nada)
- Cogumelo: 15 kg (tinha bastante)

Clica em "Submeter Lista"
```

#### **Processamento Backend:**
```python
# 1. Atualiza ListaItemRef
ref_arroz.quantidade_atual = 2   # ✅ Salvo
ref_alga.quantidade_atual = 0    # ✅ Salvo
ref_cogumelo.quantidade_atual = 15  # ✅ Salvo

# 2. Verifica se precisa criar Pedidos
Arroz: 2 < 10 → Cria Pedido (qtd=8)
Alga: 0 < 5 → Cria Pedido (qtd=5)
Cogumelo: 15 >= 10 → NÃO cria Pedido (está OK!)
```

#### **Estado Final:**
```
Lista "Tokudai" (id=4) ← MESMA LISTA!
└─ ListaItemRef (ATUALIZADO)
   ├─ Arroz: qtd_atual=2, qtd_min=10
   ├─ Alga: qtd_atual=0, qtd_min=5
   └─ Cogumelo: qtd_atual=15, qtd_min=10

Pedidos: (NOVOS REGISTROS)
├─ Pedido #1: Arroz, qtd=8, status=PENDENTE
└─ Pedido #2: Alga, qtd=5, status=PENDENTE
```

---

## ⚠️ STATUS ATUAL (26/12/2024)

### ✅ O que funciona:
- ✅ Lista existe e é reutilizável
- ✅ Colaborador submete quantidades
- ✅ Quantidades são salvas em ListaItemRef
- ✅ Cálculo de pedido (qtd_min - qtd_atual)

### ⚠️ O que NÃO funciona:
- ❌ Criação automática de Pedidos DESABILITADA
- ❌ Motivo: FK de Pedido aponta para tabela 'itens' (vazia)
- ❌ Motivo 2: fornecedor_id é NOT NULL

### 🔧 Solução Temporária:
- ✅ Submit salva quantidades corretamente
- ⚠️ Admin precisa criar pedidos manualmente
- 🎯 Próximo passo: Refatorar modelo Pedido

---

## 💡 RESUMO FINAL

### **Lista de Compras:**
- ✅ Estrutura permanente
- ✅ Organiza itens por categoria/fornecedor
- ✅ Reutilizada semanalmente
- ✅ Atribuída a colaboradores

### **Pedido (Ordem de Compra):**
- ❌ NÃO é uma lista nova!
- ✅ Registro de necessidade de compra
- ✅ Um pedido = UM item específico
- ✅ Tem status (PENDENTE/APROVADO/REJEITADO)
- ✅ Vinculado a fornecedor
- ✅ Transitório (vira histórico após processado)

**Analogia:**
```
Lista de Compras = Formulário fixo (sempre o mesmo)
Pedido = Nota fiscal individual (novo a cada vez)
```

---

**Data:** 26/12/2024 às 01:04 BRT  
**Status:** ✅ Arquitetura explicada | ⚠️ Pedidos automáticos desabilitados
