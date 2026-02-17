# 📊 DIAGRAMA ER - Sistema de Listas de Compras

## 🏗️ Modelo Entidade-Relacionamento Atual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA DE 3 TABELAS                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│      📋 listas           │
│   (Listas de Compras)    │
├──────────────────────────┤
│ 🔑 id (PK)               │
│ 📝 nome (UNIQUE)         │
│ 📄 descricao             │
│ 📅 data_criacao          │
│ 🗑️  deletado (soft del)  │
│ 📅 data_delecao          │
└──────────────────────────┘
            │
            │ 1
            │
            │
            │ N
            ▼
┌──────────────────────────┐       N:M       ┌──────────────────────────┐
│  🔗 lista_item_ref       │◄────────────────│  📦 lista_mae_itens      │
│  (Tabela Intermediária)  │                 │   (Catálogo Global)      │
├──────────────────────────┤                 ├──────────────────────────┤
│ 🔑 lista_id (PK, FK)     │                 │ 🔑 id (PK)               │
│ 🔑 item_id (PK, FK)      │─────────────────│ 📝 nome (UNIQUE)         │
│ 📊 quantidade_atual      │                 │ 📏 unidade (kg/un/L)     │
│ 📊 quantidade_minima     │                 │ 📅 criado_em             │
│ 📅 criado_em             │                 │ 📅 atualizado_em         │
│ 📅 atualizado_em         │                 └──────────────────────────┘
└──────────────────────────┘
            │
            │ N
            │
            │ 1
            ▼
```

---

## 🔍 EXPLICAÇÃO DETALHADA

### 1️⃣ **lista_mae_itens** (Catálogo Global - 32 itens)
```sql
CREATE TABLE lista_mae_itens (
    id INTEGER PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL,  -- ⚠️ ÚNICO GLOBALMENTE
    unidade VARCHAR(50) NOT NULL,       -- kg, un, L
    criado_em DATETIME,
    atualizado_em DATETIME
);
```

**🎯 Propósito:** 
- Armazena TODOS os itens que podem ser usados no sistema
- Cada item existe **UMA VEZ** apenas (sem duplicação)
- É o "dicionário" ou "catálogo" de produtos

**📊 Exemplo de dados:**
```
ID  | Nome                              | Unidade
----+-----------------------------------+---------
7   | ARROZ GRAO CURTO HEISEI FARDO    | un
12  | Alga Nori                         | un
18  | Cogumelo 🍄 kg                    | un
20  | Cream Cheese (catupiry)           | un
```

---

### 2️⃣ **listas** (Listas de Compras - 3 listas ativas)
```sql
CREATE TABLE listas (
    id INTEGER PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao VARCHAR(255),
    data_criacao DATETIME NOT NULL,
    deletado BOOLEAN DEFAULT FALSE,     -- Soft delete
    data_delecao DATETIME
);
```

**🎯 Propósito:**
- Representa cada lista de compras criada pelo admin
- Contém metadados da lista (nome, descrição, data)
- Não armazena os itens diretamente!

**📊 Exemplo de dados:**
```
ID  | Nome                  | Descrição           | Deletado
----+-----------------------+---------------------+---------
1   | Lista Supermercado    | Compras semanais    | FALSE
3   | te                    | NULL                | FALSE
4   | Tokudai               | NULL                | FALSE
```

---

### 3️⃣ **lista_item_ref** (Relacionamento N:M - 32 referências)
```sql
CREATE TABLE lista_item_ref (
    lista_id INTEGER NOT NULL,          -- FK para listas.id
    item_id INTEGER NOT NULL,           -- FK para lista_mae_itens.id
    quantidade_atual FLOAT NOT NULL,
    quantidade_minima FLOAT NOT NULL,
    criado_em DATETIME,
    atualizado_em DATETIME,
    PRIMARY KEY (lista_id, item_id),    -- ⚠️ Chave composta
    FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES lista_mae_itens(id) ON DELETE CASCADE
);
```

**🎯 Propósito:**
- **CONECTA** listas com itens (relacionamento muitos-para-muitos)
- Armazena **quantidades específicas POR LISTA**
- Permite que um item apareça em múltiplas listas
- Permite que uma lista tenha múltiplos itens

**📊 Exemplo de dados:**
```
lista_id | item_id | Item (referência)              | Qtd Atual | Qtd Min
---------+---------+--------------------------------+-----------+--------
4        | 7       | ARROZ GRAO CURTO HEISEI FARDO  | 0.0       | 1.0
4        | 12      | Alga Nori                       | 5.0       | 1.0
4        | 14      | BAO com vegetais                | 0.0       | 1.0
4        | 15      | BISCOITO DA SORTE              | 0.0       | 1.0
```

**🔍 Interpretação:**
- A lista "Tokudai" (ID=4) tem 32 itens
- Cada linha é uma **referência** que conecta a lista ao item do catálogo
- Quantidade_atual e quantidade_minima são **específicas daquela lista**

---

## 🔄 RELACIONAMENTOS

### 📋 **Lista ↔ Itens** (Muitos-para-Muitos via lista_item_ref)

```
Lista "Tokudai" (ID=4)
     │
     ├─→ lista_item_ref (lista_id=4, item_id=7)  → ARROZ
     ├─→ lista_item_ref (lista_id=4, item_id=12) → Alga Nori
     ├─→ lista_item_ref (lista_id=4, item_id=14) → BAO
     └─→ ... (32 referências no total)
```

### 📦 **Item ↔ Listas** (Um item pode estar em várias listas)

```
Item "Alga Nori" (ID=12)
     │
     └─→ lista_item_ref (lista_id=4, item_id=12) → Lista "Tokudai"
     └─→ lista_item_ref (lista_id=?, item_id=12) → Outras listas...
```

---

## 🎯 CONSULTAS SQL PARA ENTENDER

### 1. Ver todos os itens de uma lista:
```sql
SELECT 
    l.nome AS lista_nome,
    i.nome AS item_nome,
    i.unidade,
    r.quantidade_atual,
    r.quantidade_minima
FROM lista_item_ref r
JOIN listas l ON r.lista_id = l.id
JOIN lista_mae_itens i ON r.item_id = i.id
WHERE l.id = 4;  -- Lista "Tokudai"
```

### 2. Ver em quantas listas um item aparece:
```sql
SELECT 
    i.nome AS item_nome,
    COUNT(r.lista_id) AS total_listas
FROM lista_mae_itens i
LEFT JOIN lista_item_ref r ON i.id = r.item_id
GROUP BY i.id, i.nome
ORDER BY total_listas DESC;
```

### 3. Criar uma lista com itens (o que você fez hoje!):
```sql
-- Passo 1: Criar a lista
INSERT INTO listas (nome, descricao) 
VALUES ('Nova Lista', 'Descrição');

-- Passo 2: Adicionar itens (via lista_item_ref)
INSERT INTO lista_item_ref (lista_id, item_id, quantidade_atual, quantidade_minima)
VALUES 
    (5, 7, 0, 1.0),   -- ARROZ
    (5, 12, 0, 1.0),  -- Alga Nori
    (5, 18, 0, 1.0);  -- Cogumelo
```

---

## ⚡ VANTAGENS DESTA ARQUITETURA

### ✅ Reutilização
- Item "Alga Nori" existe **1 vez** no catálogo
- Pode ser usado em **múltiplas listas**
- Sem duplicação de dados

### ✅ Quantidades por Lista
- Mesmo item pode ter quantidades diferentes em cada lista
- Lista A: "Arroz - Qtd Atual: 10, Qtd Min: 5"
- Lista B: "Arroz - Qtd Atual: 0, Qtd Min: 2"

### ✅ Manutenção Simples
- Atualizar nome do item: 1 lugar (lista_mae_itens)
- Todas as listas veem a mudança automaticamente

### ✅ Cascata de Deleção
- Se deletar uma lista → todas as refs em lista_item_ref são removidas
- Se deletar um item do catálogo → todas as refs são removidas

---

## 📊 ESTADO ATUAL DO SEU BANCO

```
┌────────────────────────────────────────────────────────┐
│  📦 lista_mae_itens (Catálogo Global)                  │
│  Total: 32 itens únicos                                │
│  - ARROZ GRAO CURTO HEISEI FARDO                       │
│  - Alga Nori                                           │
│  - BAO com vegetais                                    │
│  - Cogumelo 🍄 kg                                      │
│  - ... (28 itens a mais)                               │
└────────────────────────────────────────────────────────┘
                        ▲
                        │
                        │ Referenciado por
                        │
┌────────────────────────────────────────────────────────┐
│  🔗 lista_item_ref (Relacionamentos)                   │
│  Total: 32 referências                                 │
│  - Lista 4 ↔ Item 7   (Tokudai ↔ ARROZ)              │
│  - Lista 4 ↔ Item 12  (Tokudai ↔ Alga Nori)          │
│  - ... (30 referências a mais)                         │
└────────────────────────────────────────────────────────┘
                        │
                        │ Pertence a
                        ▼
┌────────────────────────────────────────────────────────┐
│  📋 listas (Listas de Compras)                         │
│  Total: 3 listas ativas                                │
│  - ID 1: Lista Supermercado (0 itens)                  │
│  - ID 3: te (0 itens)                                  │
│  - ID 4: Tokudai (32 itens) ✅                         │
└────────────────────────────────────────────────────────┘
```

---

## 🔧 COMO FUNCIONA NA PRÁTICA

### Quando você cria uma lista com itens:

```javascript
// Frontend envia:
POST /v1/listas
{
  "nome": "Minha Lista",
  "descricao": "Descrição",
  "itens": [
    { "item_id": 7, "quantidade_atual": 0, "quantidade_minima": 1.0 },
    { "item_id": 12, "quantidade_atual": 5, "quantidade_minima": 1.0 }
  ]
}
```

```python
# Backend processa:
1. Cria registro em "listas"
   INSERT INTO listas (nome, descricao) VALUES ('Minha Lista', 'Descrição')
   → Retorna lista_id = 5

2. Para cada item em "itens":
   - Valida que item_id existe em lista_mae_itens
   - Cria registro em lista_item_ref:
     INSERT INTO lista_item_ref (lista_id, item_id, qtd_atual, qtd_min)
     VALUES (5, 7, 0, 1.0)
```

### Quando você busca itens de uma lista:

```python
# Backend:
refs = ListaItemRef.query.filter_by(lista_id=4).all()
for ref in refs:
    print(ref.item.nome)  # Acessa o nome via relacionamento
```

---

## 📝 RESUMO

| Tabela            | O que guarda                  | Chave Primária | Relacionamento        |
|-------------------|-------------------------------|----------------|-----------------------|
| lista_mae_itens   | Catálogo de produtos          | id             | 1 item → N listas     |
| listas            | Metadados das listas          | id             | 1 lista → N itens     |
| lista_item_ref    | Conexão lista↔item + qtdades  | (lista_id, item_id) | N:M (intermediária) |

**🎯 Conclusão:** 
- lista_item_ref é a "ponte" entre listas e itens
- Permite relacionamento muitos-para-muitos
- Armazena dados específicos da relação (quantidades)
- É onde você "encontra" a conexão entre listas e itens!

