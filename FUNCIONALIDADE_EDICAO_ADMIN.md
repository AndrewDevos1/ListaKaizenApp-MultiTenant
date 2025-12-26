# 📝 Funcionalidade: Admin Editar Quantidades de Submissões

**Data:** 26/12/2024 - 05:37 BRT  
**Branch:** `gerenciar-submissoes`  
**Commit:** `99f4039`

---

## 🎯 Objetivo

Permitir que o **administrador** edite as quantidades solicitadas em uma submissão **PENDENTE** para:
- ✅ Tangenciar pedidos (ajustar para lotes de compra)
- ✅ Corrigir erros do colaborador
- ✅ Adequar ao orçamento disponível
- ✅ Ajustar por promoções ou ofertas

---

## 🚀 Implementação

### **Backend**

#### Nova Rota
```python
PUT /api/admin/submissoes/{submissao_id}/editar
```

**Headers:**
```
Authorization: Bearer {token_admin}
Content-Type: application/json
```

**Request Body:**
```json
{
  "pedidos": [
    {
      "pedido_id": 1,
      "quantidade_solicitada": 15.5
    },
    {
      "pedido_id": 2,
      "quantidade_solicitada": 30.0
    }
  ]
}
```

**Response Success (200):**
```json
{
  "message": "2 pedido(s) atualizado(s) com sucesso!",
  "submissao_id": 5
}
```

**Response Error (400):**
```json
{
  "error": "Apenas submissões PENDENTES podem ser editadas."
}
```

#### Função em `services.py`

```python
def editar_quantidades_submissao(submissao_id, pedidos_data):
    """
    Permite que admin edite as quantidades dos pedidos de uma submissão.
    
    Validações:
    - Submissão deve existir
    - Status deve ser PENDENTE
    - Pedidos devem pertencer à submissão
    - Quantidades devem ser >= 0
    """
```

#### Validações Implementadas

✅ **Submissão existe?**
```python
if not submissao:
    return {"error": "Submissão não encontrada."}, 404
```

✅ **Status é PENDENTE?**
```python
if submissao.status != SubmissaoStatus.PENDENTE:
    return {"error": "Apenas submissões PENDENTES podem ser editadas."}, 400
```

✅ **Pedido pertence à submissão?**
```python
if pedido_id not in pedidos_map:
    return {"error": f"Pedido #{pedido_id} não pertence a esta submissão."}, 400
```

✅ **Quantidade válida?**
```python
if nova_quantidade < 0:
    return {"error": f"Quantidade não pode ser negativa."}, 400
```

---

### **Frontend**

#### Novos Estados
```typescript
const [modoEdicao, setModoEdicao] = useState(false);
const [quantidadesEditadas, setQuantidadesEditadas] = useState<{[key: number]: number}>({});
```

#### Novo Botão (Status = PENDENTE)
```tsx
<Button variant="warning" onClick={handleIniciarEdicao}>
    <FontAwesomeIcon icon={faEdit} /> Editar Quantidades
</Button>
```

#### Modo Edição Ativado

**Inputs editáveis na tabela:**
```tsx
{modoEdicao ? (
    <Form.Control
        type="number"
        min="0"
        step="0.01"
        value={quantidadesEditadas[pedido.id] || 0}
        onChange={(e) => handleAlterarQuantidade(
            pedido.id,
            parseFloat(e.target.value) || 0
        )}
        style={{ width: '120px', display: 'inline-block' }}
    />
) : (
    `${pedido.quantidade_solicitada}`
)}
```

**Botões de ação:**
```tsx
<Button variant="success" onClick={handleSalvarEdicao}>
    <FontAwesomeIcon icon={faSave} /> Salvar Alterações
</Button>
<Button variant="secondary" onClick={handleCancelarEdicao}>
    <FontAwesomeIcon icon={faTimes} /> Cancelar
</Button>
```

#### Badge Visual
```tsx
{modoEdicao && <Badge bg="warning" className="ms-2">Modo Edição</Badge>}
```

---

## 🎬 Fluxo de Uso

### **Passo a Passo (Admin)**

1. **Login como Admin**
   - Acessa `/admin/submissoes`

2. **Seleciona Submissão PENDENTE**
   - Clica em "Ver Detalhes" de uma submissão pendente

3. **Ativa Modo Edição**
   - Clica no botão amarelo "Editar Quantidades"
   - Tabela muda para modo edição
   - Badge "Modo Edição" aparece
   - Inputs numéricos aparecem na coluna "Quantidade"

4. **Altera Quantidades**
   - Digita novas quantidades nos campos
   - Suporta decimais (ex: 15.5)
   - Mínimo: 0

5. **Salva ou Cancela**
   - **Salvar:** Atualiza no banco e recarrega dados
   - **Cancelar:** Descarta alterações e volta aos valores originais

6. **Feedback Visual**
   - ✅ "Quantidades atualizadas com sucesso!"
   - Sai do modo edição automaticamente
   - Dados atualizados aparecem na tabela

---

## 📊 Exemplos de Uso

### **Caso 1: Ajuste por Lote de Compra**

**Antes:**
```
Arroz 1kg: 12 unidades
```

**Admin edita:**
```
Arroz 1kg: 15 unidades (lote de 15)
```

**Motivo:** Fornecedor vende em lotes de 15 unidades

---

### **Caso 2: Correção de Erro**

**Antes:**
```
Óleo 900ml: 100 unidades
```

**Admin edita:**
```
Óleo 900ml: 10 unidades
```

**Motivo:** Colaborador digitou zero a mais

---

### **Caso 3: Restrição Orçamentária**

**Antes:**
```
Sabão em pó 1kg: 50 unidades (R$ 1.500)
```

**Admin edita:**
```
Sabão em pó 1kg: 30 unidades (R$ 900)
```

**Motivo:** Orçamento disponível limitado

---

## 🔒 Segurança

### **Permissões**
- ✅ Apenas **ADMIN** pode editar
- ✅ Decorator `@admin_required()` na rota
- ✅ JWT token validado

### **Validações**
- ✅ Submissão deve estar **PENDENTE**
- ✅ Pedidos devem pertencer à submissão
- ✅ Quantidades devem ser **>= 0**
- ✅ Dados inválidos retornam erro 400

---

## 🎨 Interface Visual

### **Antes de Editar**
```
┌────────────────────────────────────────────┐
│ [Editar Quantidades] [Aprovar] [Rejeitar] │
├────────────────────────────────────────────┤
│ # │ Item        │ Quantidade │ Status     │
├───┼─────────────┼────────────┼────────────┤
│ 1 │ Arroz 1kg   │ 12 kg      │ PENDENTE   │
│ 2 │ Óleo 900ml  │ 20 un      │ PENDENTE   │
└────────────────────────────────────────────┘
```

### **Durante Edição**
```
┌────────────────────────────────────────────┐
│ [Salvar] [Cancelar]       🟡 Modo Edição   │
├────────────────────────────────────────────┤
│ # │ Item        │ Quantidade │ Status     │
├───┼─────────────┼────────────┼────────────┤
│ 1 │ Arroz 1kg   │ [__15__] kg│ PENDENTE   │
│ 2 │ Óleo 900ml  │ [__18__] un│ PENDENTE   │
└────────────────────────────────────────────┘
         ↑ Inputs editáveis
```

---

## 🧪 Testes Recomendados

### **Backend**
```bash
# Teste 1: Editar quantidades (sucesso)
curl -X PUT http://localhost:5000/api/admin/submissoes/1/editar \
  -H "Authorization: Bearer {token_admin}" \
  -H "Content-Type: application/json" \
  -d '{
    "pedidos": [
      {"pedido_id": 1, "quantidade_solicitada": 15},
      {"pedido_id": 2, "quantidade_solicitada": 20}
    ]
  }'

# Teste 2: Tentar editar submissão APROVADA (erro 400)
curl -X PUT http://localhost:5000/api/admin/submissoes/2/editar \
  -H "Authorization: Bearer {token_admin}" \
  -H "Content-Type: application/json" \
  -d '{"pedidos": [...]}'

# Teste 3: Quantidade negativa (erro 400)
curl -X PUT http://localhost:5000/api/admin/submissoes/1/editar \
  -H "Authorization: Bearer {token_admin}" \
  -H "Content-Type: application/json" \
  -d '{
    "pedidos": [
      {"pedido_id": 1, "quantidade_solicitada": -5}
    ]
  }'
```

### **Frontend**
1. ✅ Botão "Editar" só aparece se status = PENDENTE
2. ✅ Inputs aceitam decimais (15.5)
3. ✅ Cancelar restaura valores originais
4. ✅ Salvar mostra mensagem de sucesso
5. ✅ Tabela recarrega com novos valores
6. ✅ Badge "Modo Edição" aparece/desaparece

---

## 📁 Arquivos Modificados

### **Backend**
```
backend/kaizen_app/services.py
├─ +60 linhas
└─ Nova função: editar_quantidades_submissao()

backend/kaizen_app/controllers.py
├─ +12 linhas
└─ Nova rota: PUT /admin/submissoes/{id}/editar
```

### **Frontend**
```
frontend/src/features/admin/DetalhesSubmissao.tsx
├─ +90 linhas
├─ Novos ícones: faEdit, faSave
├─ Novos estados: modoEdicao, quantidadesEditadas
├─ Novas funções: 
│   ├─ handleIniciarEdicao()
│   ├─ handleCancelarEdicao()
│   ├─ handleSalvarEdicao()
│   └─ handleAlterarQuantidade()
└─ UI condicional baseada em modoEdicao
```

---

## ✅ Checklist de Implementação

- [x] Rota backend criada
- [x] Validações de segurança implementadas
- [x] Função em services.py
- [x] Interface frontend atualizada
- [x] Modo edição visual
- [x] Badge indicador
- [x] Botões Salvar/Cancelar
- [x] Inputs numéricos editáveis
- [x] Feedback de sucesso/erro
- [x] Recarregamento de dados
- [x] Commit realizado
- [x] Documentação criada

---

## 🔄 Próximas Melhorias Sugeridas

1. **Histórico de Edições**
   - Registrar quem editou e quando
   - Mostrar valores antes/depois

2. **Motivo da Edição**
   - Campo textarea para admin justificar alteração
   - Colaborador pode ver o motivo

3. **Notificação ao Colaborador**
   - Email/notificação quando admin edita
   - "Sua submissão foi ajustada pelo admin"

4. **Edição em Massa**
   - Aplicar % de aumento/diminuição em todos
   - Exemplo: "Reduzir todos em 20%"

5. **Validação Contra Estoque Mínimo**
   - Avisar se quantidade editada < mínimo necessário

---

## 🎯 Resultado Final

✅ **Admin pode agora:**
- Editar quantidades de submissões pendentes
- Tangenciar pedidos conforme necessidade
- Corrigir erros rapidamente
- Ajustar por restrições orçamentárias

✅ **Interface intuitiva:**
- Botão claro de edição
- Visual diferenciado em modo edição
- Feedback instantâneo
- Operação reversível (cancelar)

✅ **Seguro:**
- Apenas admins
- Apenas submissões pendentes
- Validações robustas
- Não permite valores negativos

---

**📅 Data de Criação:** 26/12/2024 - 05:37 BRT  
**👤 Branch:** gerenciar-submissoes  
**🔗 Commit:** 99f4039
