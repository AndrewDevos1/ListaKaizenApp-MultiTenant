# 📝 Funcionalidade: Admin Editar Quantidades de Submissões

**Data:** 26/12/2024 - 05:45 BRT  
**Branch:** `gerenciar-submissoes`  
**Commits:** `99f4039`, `40af01e`, `cb3ea04`

---

## 🎯 Objetivo

Permitir que o **administrador** edite as **quantidades atuais do estoque** em uma submissão **PENDENTE**, similar ao comportamento do colaborador:
- ✅ Edita **estoque atual** (não pedidos diretamente)
- ✅ Sistema **recalcula pedidos** automaticamente
- ✅ Visualiza impacto em **tempo real**
- ✅ Tangenciar pedidos (ajustar para lotes de compra)
- ✅ Corrigir erros do colaborador
- ✅ Adequar ao orçamento disponível

---

## 🔄 MUDANÇA IMPORTANTE (Refatoração)

### **Antes (99f4039):**
```
Admin editava: Quantidade do Pedido (direto)
Exemplo: Pedido de Arroz = 10kg
```

### **Depois (cb3ea04):**
```
Admin edita: Quantidade Atual do Estoque
Sistema calcula: Pedido = max(0, Mínimo - Atual)

Exemplo:
  Qtd Mínima: 50kg
  Qtd Atual:  40kg (editável)
  → Pedido:   10kg (calculado)
```

**Por quê?** Comportamento consistente entre admin e colaborador.

---

## 🚀 Implementação

### **Backend**

#### Novas Rotas

**1. Buscar Estoque da Lista (Admin)**
```python
GET /api/admin/listas/{lista_id}/estoque
```

**Response:**
```json
[
  {
    "id": 1,
    "item_id": 1,
    "lista_id": 2,
    "quantidade_atual": 40.0,
    "quantidade_minima": 50.0,
    "pedido": 10.0,
    "item": {
      "id": 1,
      "nome": "Arroz 1kg",
      "unidade_medida": "kg"
    }
  }
]
```

**2. Editar Quantidades (Admin)**
```python
PUT /api/admin/submissoes/{submissao_id}/editar
```

**Headers:**
```
Authorization: Bearer {token_admin}
Content-Type: application/json
```

**Request Body (NOVO):**
```json
{
  "items": [
    {
      "item_id": 1,
      "quantidade_atual": 45.0
    },
    {
      "item_id": 2,
      "quantidade_atual": 30.0
    }
  ]
}
```

**Response Success (200):**
```json
{
  "message": "2 item(ns) atualizado(s), 1 pedido(s) gerado(s)!",
  "submissao_id": 5,
  "pedidos_criados": 1
}
```

#### Funções em `services.py`

**1. `get_estoque_lista_admin(lista_id)`**
```python
def get_estoque_lista_admin(lista_id):
    """
    Retorna itens do estoque da lista para admin (sem verificação de atribuição).
    Formato idêntico ao usado pelo colaborador.
    """
```

**2. `editar_quantidades_submissao(submissao_id, items_data)` (REFATORADA)**
```python
def editar_quantidades_submissao(submissao_id, items_data):
    """
    Recebe quantidades ATUAIS do estoque, não quantidades dos pedidos.
    
    Processo:
    1. Atualiza quantidade_atual em ListaItemRef
    2. DELETA todos os pedidos antigos da submissão
    3. RECRIA pedidos com base no cálculo: max(0, minimo - atual)
    4. Atualiza total_pedidos da submissão
    
    Validações:
    - Submissão deve existir
    - Status deve ser PENDENTE
    - Itens devem pertencer à lista
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

✅ **Item pertence à lista?**
```python
if item_id not in refs_map:
    return {"error": f"Item #{item_id} não pertence a esta lista."}, 400
```

✅ **Quantidade válida?**
```python
if nova_quantidade_atual < 0:
    return {"error": f"Quantidade não pode ser negativa."}, 400
```

#### Lógica de Recálculo

```python
# 1. Atualizar quantidade_atual
for item in items_data:
    ref = refs_map[item['item_id']]
    ref.quantidade_atual = item['quantidade_atual']

# 2. Deletar pedidos antigos
Pedido.query.filter_by(submissao_id=submissao_id).delete()

# 3. Recriar pedidos
for ref in refs:
    pedido_qtd = ref.get_pedido()  # max(0, minimo - atual)
    if pedido_qtd > 0:
        novo_pedido = Pedido(
            submissao_id=submissao_id,
            lista_mae_item_id=ref.item_id,
            quantidade_solicitada=pedido_qtd,
            status=PedidoStatus.PENDENTE
        )
        db.session.add(novo_pedido)

# 4. Atualizar total
submissao.total_pedidos = pedidos_criados
db.session.commit()
```

---

### **Frontend**

#### Novos Estados
```typescript
const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
const [modoEdicao, setModoEdicao] = useState(false);
const [quantidadesAtuais, setQuantidadesAtuais] = useState<{[key: number]: number}>({});
```

#### Interfaces TypeScript
```typescript
interface ItemEstoque {
    id: number;
    item_id: number;
    lista_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    pedido: number;
    item: {
        id: number;
        nome: string;
        unidade_medida: string;
    };
}
```

#### Fluxo de Carregamento

**1. Buscar submissão e estoque:**
```typescript
const fetchSubmissao = async () => {
    // 1. Buscar submissão
    const response = await api.get(`/admin/submissoes`);
    const sub = response.data.find(s => s.id === Number(id));
    
    // 2. Buscar estoque da lista
    const responseEstoque = await api.get(`/admin/listas/${sub.lista_id}/estoque`);
    setItensEstoque(responseEstoque.data);
    
    // 3. Inicializar quantidades atuais
    const qtds = {};
    responseEstoque.data.forEach(item => {
        qtds[item.item_id] = item.quantidade_atual;
    });
    setQuantidadesAtuais(qtds);
};
```

#### Cálculo em Tempo Real

```typescript
const calcularPedido = (itemId: number): number => {
    const item = itensEstoque.find(i => i.item_id === itemId);
    if (!item) return 0;
    
    const qtdAtual = quantidadesAtuais[itemId] || 0;
    const qtdMinima = item.quantidade_minima || 0;
    
    return Math.max(0, qtdMinima - qtdAtual);
};
```

#### Navegação por Enter

```typescript
const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const nextIndex = currentIndex + 1;
        const nextInput = document.getElementById(`qtd-input-${nextIndex}`);
        if (nextInput) {
            nextInput.focus();
        } else {
            document.getElementById('btn-salvar')?.focus();
        }
    }
};
```

#### Modo Edição - Tabela

```tsx
{modoEdicao ? (
    // Mostra todos os itens do estoque (editáveis)
    itensEstoque.map((item, idx) => {
        const pedido = calcularPedido(item.item_id);
        return (
            <tr key={item.item_id}>
                <td>{idx + 1}</td>
                <td><strong>{item.item.nome}</strong></td>
                <td className="text-center">
                    <Form.Control
                        id={`qtd-input-${idx}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={quantidadesAtuais[item.item_id] || 0}
                        onChange={(e) => handleAlterarQuantidade(...)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        autoFocus={idx === 0}
                    />
                    <span>{item.item.unidade_medida}</span>
                </td>
                <td className="text-center">
                    {item.quantidade_minima} {item.item.unidade_medida}
                </td>
                <td className="text-center">
                    <Badge bg={pedido > 0 ? 'warning' : 'success'}>
                        {pedido.toFixed(2)} {item.item.unidade_medida}
                    </Badge>
                </td>
                <td className="text-center">
                    <Badge bg={pedido > 0 ? 'warning' : 'success'}>
                        {pedido > 0 ? 'NECESSÁRIO' : 'OK'}
                    </Badge>
                </td>
            </tr>
        );
    })
) : (
    // Modo visualização: mostra apenas pedidos da submissão
    submissao.pedidos.map((pedido, idx) => (
        <tr key={pedido.id}>
            <td>{idx + 1}</td>
            <td><strong>{pedido.item_nome}</strong></td>
            <td colSpan={2}><em>Clique em "Editar" para ver</em></td>
            <td>{pedido.quantidade_solicitada} {pedido.unidade}</td>
            <td>{getStatusBadge(pedido.status)}</td>
        </tr>
    ))
)}
```

#### Salvar Alterações

```typescript
const handleSalvarEdicao = async () => {
    const items = itensEstoque.map(item => ({
        item_id: item.item_id,
        quantidade_atual: quantidadesAtuais[item.item_id] || 0
    }));

    const response = await api.put(
        `/admin/submissoes/${submissao.id}/editar`,
        { items }
    );
    
    setSuccessMessage(`✅ ${response.data.message}`);
    setModoEdicao(false);
    fetchSubmissao(); // Recarregar
};
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

**Situação:**
```
Item: Arroz 1kg
Qtd Mínima: 50kg
Qtd Atual:  40kg (submetida pelo colaborador)
→ Pedido:   10kg
```

**Admin edita:**
```
Qtd Atual:  35kg (ajustando para baixo)
→ Pedido:   15kg (recalculado automaticamente)
```

**Motivo:** Pedido de 15kg fecha o lote do fornecedor.

---

### **Caso 2: Correção de Erro**

**Situação:**
```
Item: Óleo 900ml
Qtd Mínima: 20 unidades
Qtd Atual:  100 unidades (erro do colaborador!)
→ Pedido:   0 (sem necessidade)
```

**Admin edita:**
```
Qtd Atual:  10 unidades (corrigindo)
→ Pedido:   10 unidades (recalculado)
```

**Motivo:** Colaborador digitou zero a mais.

---

### **Caso 3: Restrição Orçamentária**

**Situação:**
```
Item: Sabão em pó 1kg
Qtd Mínima: 100 unidades
Qtd Atual:  50 unidades
→ Pedido:   50 unidades (R$ 1.500)
```

**Admin edita:**
```
Qtd Atual:  80 unidades (aumentando)
→ Pedido:   20 unidades (R$ 600, recalculado)
```

**Motivo:** Orçamento disponível limitado, ajusta para pedir menos.

---

### **Caso 4: Item Já Comprado Externamente**

**Situação:**
```
Item: Detergente 500ml
Qtd Mínima: 50 unidades
Qtd Atual:  10 unidades
→ Pedido:   40 unidades
```

**Admin edita:**
```
Qtd Atual:  55 unidades (recebimento externo)
→ Pedido:   0 (recalculado - não precisa mais)
```

**Motivo:** Item foi comprado de forma emergencial.

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

### **Modo Visualização (Antes de Editar)**
```
┌──────────────────────────────────────────────────────────┐
│ [✏️ Editar Quantidades] [✅ Aprovar] [❌ Rejeitar]       │
├──────────────────────────────────────────────────────────┤
│ # │ Item        │ Qtd Atual/Mín │ Pedido │ Status       │
├───┼─────────────┼───────────────┼────────┼──────────────┤
│ 1 │ Arroz 1kg   │ Ver no editor │ 10 kg  │ PENDENTE     │
│ 2 │ Óleo 900ml  │ Ver no editor │ 20 un  │ PENDENTE     │
└──────────────────────────────────────────────────────────┘
```

### **Modo Edição (Ativo)**
```
┌──────────────────────────────────────────────────────────┐
│ [💾 Salvar] [❌ Cancelar]     🟡 Modo Edição             │
├──────────────────────────────────────────────────────────┤
│ # │ Item     │ Atual  │ Mín │ Pedido │ Status           │
├───┼──────────┼────────┼─────┼────────┼──────────────────┤
│ 1 │ Arroz    │ [_40_] │ 50  │ 10 🟡  │ NECESSÁRIO       │
│ 2 │ Óleo     │ [_25_] │ 30  │  5 🟡  │ NECESSÁRIO       │
│ 3 │ Feijão   │ [_60_] │ 50  │  0 🟢  │ OK               │
└──────────────────────────────────────────────────────────┘
    ↑ Editáveis         ↑ Calcula em tempo real
    
💡 Dica: Pressione [Enter] para ir ao próximo item
```

### **Feedback em Tempo Real**
```
Admin digita: Qtd Atual = 35kg
                 ↓
Sistema calcula: Pedido = 50 - 35 = 15kg
                 ↓
Badge atualiza: 🟡 15kg NECESSÁRIO

Admin digita: Qtd Atual = 60kg
                 ↓
Sistema calcula: Pedido = 50 - 60 = 0kg (max com 0)
                 ↓
Badge atualiza: 🟢 0kg OK
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
