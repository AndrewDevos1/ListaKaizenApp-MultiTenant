# 🧹 LIMPEZA DE CÓDIGO LEGADO - Tabelas Estoque e Item

## 📊 STATUS ATUAL (26/12/2024 - 00:58 BRT)

### ✅ CONCLUÍDO:

1. **Refatoração de Serviços**
   - ✅ `get_estoque_lista_colaborador()` - Usa ListaItemRef
   - ✅ `update_estoque_colaborador()` - Usa ListaItemRef
   - ✅ `submit_estoque_lista()` - Refatorado para ListaItemRef
   - ✅ `adicionar_item_lista_mae()` - Removida chamada sync
   - ✅ `editar_item_lista_mae()` - Removida chamada sync

2. **Funções Deprecadas**
   - ✅ `sync_lista_mae_itens_para_estoque()` - Marcada como DEPRECADA
     - Retorna imediatamente com warning
     - Código original comentado para referência
     - Log de warning quando chamada

3. **Compatibilidade**
   - ✅ Frontend continua funcionando
   - ✅ Colaborador vê itens da lista
   - ✅ Colaborador atualiza quantidades
   - ✅ Submit de lista funciona (testando...)

---

## 🔍 INVESTIGAÇÃO: PROBLEMA NO SUBMIT

### Erro Reportado:
"usuário não consegue submeter"

### Mudanças Feitas em submit_estoque_lista():

**ANTES:**
```python
estoque = repositories.get_by_id(Estoque, estoque_id)  # Buscava em Estoque
if not estoque or estoque.lista_id != lista_id:
    continue

estoque.quantidade_atual = quantidade_atual
estoque.data_ultima_submissao = datetime.now(timezone.utc)

# Pedido criado com fornecedor
novo_pedido = Pedido(
    item_id=estoque.item_id,
    fornecedor_id=estoque.item.fornecedor_id,  # ← Acessava estoque.item
    quantidade_solicitada=quantidade_a_pedir,
    usuario_id=usuario_id
)
```

**DEPOIS:**
```python
ref = ListaItemRef.query.filter_by(
    lista_id=lista_id,
    item_id=estoque_id  # estoque_id = item_id
).first()

if not ref:
    continue  # ← Pula se não encontrar

ref.quantidade_atual = quantidade_atual
ref.atualizado_em = datetime.now(timezone.utc)

# Pedido criado SEM fornecedor (por ora)
novo_pedido = Pedido(
    item_id=ref.item_id,
    fornecedor_id=None,  # ← TODO: Mapear fornecedor
    quantidade_solicitada=quantidade_a_pedir,
    usuario_id=usuario_id
)
```

### Possíveis Problemas:

1. **Fornecedor NULL em Pedido**
   - Se `fornecedor_id` for `NOT NULL` → erro ao criar pedido
   - Solução: Verificar constraints de Pedido

2. **Frontend envia estoque_id errado**
   - Frontend pode estar enviando `item.id` diferente de `item.item_id`
   - Verificar estrutura do payload

3. **Validação de acesso**
   - Lista não tem colaborador atribuído?
   - Verificar `lista.colaboradores`

---

## 📋 PRÓXIMOS PASSOS

### Fase 1: Testes e Ajustes (AGORA)
```bash
✓ Refatorar submit_estoque_lista() - FEITO
✓ Remover chamadas sync - FEITO
✓ Marcar sync como deprecada - FEITO
□ Investigar erro no submit
□ Verificar constraint fornecedor_id em Pedido
□ Testar submit completo
```

### Fase 2: Migration (Depois de confirmar que funciona)
```bash
□ Criar migration para adicionar comment em Estoque/Item
□ Documentar que tabelas são legadas
□ Não remover ainda (segurança)
```

### Fase 3: Remoção (Futuro - após período de teste)
```bash
□ Remover imports de Estoque/Item em controllers
□ Remover imports de Estoque/Item em services
□ Migration para DROP TABLE estoque
□ Migration para DROP TABLE item
□ Remover models Estoque e Item
□ Remover função sync_lista_mae_itens_para_estoque()
```

---

## 🔧 INVESTIGAÇÃO: ESTRUTURA DO PEDIDO

Verificar se `fornecedor_id` pode ser NULL:

```python
# models.py - Verificar:
class Pedido(db.Model):
    fornecedor_id = db.Column(...)  # nullable=True ou False?
```

Se `nullable=False` → precisamos:
1. Adicionar fornecedor_id a ListaMaeItem
2. OU mudar Pedido para aceitar NULL
3. OU criar fornecedor padrão

---

## 📊 ARQUIVOS MODIFICADOS ATÉ AGORA

### backend/kaizen_app/services.py
- ✅ `get_estoque_lista_colaborador()` (linha 1996) - Refatorado
- ✅ `update_estoque_colaborador()` (linha 2041) - Refatorado
- ✅ `submit_estoque_lista()` (linha 816) - Refatorado
- ✅ `sync_lista_mae_itens_para_estoque()` (linha 1559) - Deprecada
- ✅ `adicionar_item_lista_mae()` (linha 1671) - Removida sync
- ✅ `editar_item_lista_mae()` (linha 1716) - Removida sync

### Imports a Limpar (Futuro):
- `backend/kaizen_app/services.py:1` - `from .models import ... Estoque ... Item ...`
- `backend/kaizen_app/controllers.py:3` - `from .models import Item, ... Estoque`

---

## ⚠️ AVISOS IMPORTANTES

1. **Não remover tabelas ainda!**
   - Dados podem estar sendo usados em prod
   - Manter período de transição
   - Apenas marcar como deprecadas

2. **Compatibilidade com frontend**
   - Campo `id` no response deve ser `item_id`
   - Campo `unidade_medida` deve vir de `unidade`
   - Estrutura do payload deve manter formato

3. **Testing**
   - Testar todos os fluxos antes de remover
   - Colaborador lê lista ✓
   - Colaborador atualiza item ✓
   - Colaborador submete lista (testando...)

---

## 📝 LOG DE MUDANÇAS

### 26/12/2024 00:45 BRT
- ✅ Refatorado get_estoque_lista_colaborador()
- ✅ Refatorado update_estoque_colaborador()
- ✅ Funcionalidade básica testada e funcionando

### 26/12/2024 00:58 BRT
- ✅ Refatorado submit_estoque_lista()
- ✅ Removidas chamadas sync em adicionar/editar
- ✅ Marcada sync como deprecada
- 🔍 Investigando problema no submit

---

## 🎯 OBJETIVO FINAL

**Arquitetura Limpa:**
```
ListaMaeItem (Catálogo Global)
      ↑
      │ referencia
      │
ListaItemRef (Fonte de Verdade)
      │
      ↓
Lista (Listas de Compras)
```

**Tabelas Removidas:**
- ~~Estoque~~
- ~~Item~~

**Funções Removidas:**
- ~~sync_lista_mae_itens_para_estoque()~~
