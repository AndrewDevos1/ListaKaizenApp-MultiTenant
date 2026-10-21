# 06 — Módulo de Merge (Fundir Submissões)

> Permite ao admin consolidar múltiplas submissões APROVADAS em um único pedido, agrupando itens iguais e somando quantidades. Gera texto formatado para envio via WhatsApp ao fornecedor.

---

## Conceito

Quando múltiplos colaboradores submetem listas diferentes com itens em comum, o admin pode:
1. Selecionar 2+ submissões aprovadas
2. Ver um preview consolidado por item (quantidades somadas)
3. Gerar texto para copiar/enviar via WhatsApp ao fornecedor

**Chave de consolidação:** `lista_mae_item_id` — itens com o mesmo ID no catálogo global são agrupados.

---

## Endpoints

### POST `/api/admin/submissoes/merge-preview`

**Permissão:** `@admin_required()`

**Body:**
```json
{
  "submissao_ids": [123, 124, 125]
}
```

**Validações:**
- Mínimo 2 IDs
- Todas devem existir
- Todas devem ter `status = APROVADO`
- Todas devem pertencer ao mesmo restaurante do admin

**Resposta 200:**
```json
{
  "submissao_ids": [123, 124, 125],
  "listas": [
    {"submissao_id": 123, "lista_id": 10, "lista_nome": "Hortifruti A"},
    {"submissao_id": 124, "lista_id": 11, "lista_nome": "Hortifruti B"},
    {"submissao_id": 125, "lista_id": 12, "lista_nome": "Hortifruti C"}
  ],
  "itens": [
    {
      "item_id": 42,
      "item_nome": "Cebola Roxa",
      "item_unidade": "kg",
      "quantidade_total": 15.0,
      "breakdown": [
        {"submissao_id": 123, "lista_id": 10, "lista_nome": "Hortifruti A", "usuario_nome": "Maria", "quantidade": 7.0},
        {"submissao_id": 124, "lista_id": 11, "lista_nome": "Hortifruti B", "usuario_nome": "João", "quantidade": 5.0},
        {"submissao_id": 125, "lista_id": 12, "lista_nome": "Hortifruti C", "usuario_nome": "Ana", "quantidade": 3.0}
      ]
    },
    {
      "item_id": 43,
      "item_nome": "Cenoura",
      "item_unidade": "kg",
      "quantidade_total": 18.0,
      "breakdown": [...]
    }
  ],
  "total_itens": 18
}
```

**Erros possíveis:**
```json
// 400 - menos de 2 IDs
{"error": "Informe ao menos 2 submissões para fundir."}

// 404 - submissão não encontrada
{"error": "Submissões não encontradas: [126, 127]"}

// 422 - submissão não aprovada
{"error": "Submissões [128] não estão APROVADAS. Apenas submissões aprovadas podem ser fundidas."}

// 403 - restaurante errado
{"error": "Acesso negado. Submissões [129] pertencem a outro restaurante."}
```

---

### POST `/api/admin/submissoes/merge-whatsapp`

**Permissão:** `@admin_required()`

**Body:**
```json
{
  "submissao_ids": [123, 124, 125]
}
```

**Resposta 200:**
```json
{
  "texto": "*📋 PEDIDO FUNDIDO*\n*Listas:* Hortifruti A + Hortifruti B + Hortifruti C\n*Data:* 24/02/2026 21:18\n\n*Itens:*\n• Acelga — *2 un*\n• Cebola Roxa — *15 kg*\n• Cenoura — *18 kg*\n...\n\n*Total: 18 itens*\n---\nSistema Kaizen"
}
```

**Formato do texto WhatsApp:**
```
*📋 PEDIDO FUNDIDO*
*Listas:* [nome1] + [nome2] + [nome3]
*Data:* DD/MM/YYYY HH:MM

*Itens:*
• [Item A] — *[qtd] [unidade]*
• [Item B] — *[qtd] [unidade]*
...

*Total: N itens*
---
Sistema Kaizen
```

---

## Lógica de Implementação (services.py)

```python
def merge_submissoes_preview(submissao_ids: list, restaurante_id=None):
    # 1. Validações
    if len(submissao_ids) < 2:
        return {"error": "..."}, 400

    submissoes = Submissao.query.filter(Submissao.id.in_(submissao_ids)).all()

    # 2. Valida existência
    if len(submissoes) != len(submissao_ids):
        return {"error": f"Submissões não encontradas: {faltando}"}, 404

    # 3. Valida status APROVADO
    nao_aprovadas = [s for s in submissoes if s.status != SubmissaoStatus.APROVADO]
    if nao_aprovadas:
        return {"error": "..."}, 422

    # 4. Valida multi-tenant
    if restaurante_id:
        fora = [s for s in submissoes if s.lista.restaurante_id != restaurante_id]
        if fora:
            return {"error": "..."}, 403

    # 5. Merge: agrupa por lista_mae_item_id
    merged = {}  # { item_id: { nome, unidade, total, breakdown } }

    for submissao in submissoes:
        pedidos_aprovados = [p for p in submissao.pedidos if p.status == PedidoStatus.APROVADO]
        for pedido in pedidos_aprovados:
            item_id = pedido.lista_mae_item_id
            item = pedido.item  # ListaMaeItem

            if item_id not in merged:
                merged[item_id] = {
                    "item_id": item_id,
                    "item_nome": item.nome,
                    "item_unidade": item.unidade,
                    "quantidade_total": 0.0,
                    "breakdown": []
                }

            qtd = float(pedido.quantidade_solicitada)
            merged[item_id]["quantidade_total"] += qtd
            merged[item_id]["breakdown"].append({
                "submissao_id": submissao.id,
                "lista_nome": submissao.lista.nome,
                "usuario_nome": submissao.usuario.nome,
                "quantidade": qtd
            })

    itens_ordenados = sorted(merged.values(), key=lambda x: x["item_nome"])

    return {
        "submissao_ids": submissao_ids,
        "listas": [{"submissao_id": s.id, "lista_nome": s.lista.nome} for s in submissoes],
        "itens": itens_ordenados,
        "total_itens": len(itens_ordenados)
    }, 200


def merge_submissoes_whatsapp(submissao_ids: list, restaurante_id=None):
    preview, status = merge_submissoes_preview(submissao_ids, restaurante_id)
    if status != 200:
        return preview, status

    listas_nomes = " + ".join(l["lista_nome"] for l in preview["listas"])
    linhas = [
        "*📋 PEDIDO FUNDIDO*",
        f"*Listas:* {listas_nomes}",
        f"*Data:* {brasilia_now().strftime('%d/%m/%Y %H:%M')}",
        "",
        "*Itens:*",
    ]

    for item in preview["itens"]:
        qtd = item["quantidade_total"]
        qtd_str = f"{qtd:.0f}" if qtd == int(qtd) else f"{qtd:.2f}"
        linhas.append(f"• {item['item_nome']} — *{qtd_str} {item['item_unidade']}*")

    linhas += [
        "",
        f"*Total: {preview['total_itens']} itens*",
        "---",
        "Sistema Kaizen"
    ]

    return {"texto": "\n".join(linhas)}, 200
```

---

## Modal de Merge (Frontend)

**Componente:** `features/admin/MergeModal.tsx`

**Abertura:** Botão "Fundir com outras listas" em `DetalhesSubmissao.tsx` (visível apenas quando `submissao.status === 'APROVADO'`)

### Passo 1 — Selecionar Submissões

- **Submissão atual** (onde o admin clicou) está bloqueada e sempre selecionada
- **Lista de outras submissões APROVADAS** do restaurante
  - Checkbox por submissão
  - Colunas: Nome da Lista | Colaborador | Data | Total de Pedidos
  - Campo de busca/filtro por nome da lista
  - Botão "Selecionar Todas"
- **Requisito**: mínimo 1 outra selecionada (total ≥ 2)
- **Barra de progresso** (step 1 de 3)
- Botão "Próximo" (avança para step 2)

### Passo 2 — Preview do Merge

- Chama `POST /api/admin/submissoes/merge-preview`
- Exibe loading durante chamada
- **Tabela de itens consolidados**:
  - Colunas: Item | Unidade | Quantidade Total
  - Itens ordenados alfabeticamente
- Barra de progresso (step 2 de 3)
- Botões: "Voltar" (retorna ao step 1) | "Gerar WhatsApp" (avança para step 3)

### Passo 3 — Compartilhar

- Chama `POST /api/admin/submissoes/merge-whatsapp`
- **Textarea** com o texto formatado (somente leitura)
- **Botão "Copiar"**: Copia texto para clipboard (`navigator.clipboard.writeText`)
- **Botão "Abrir WhatsApp"**: `window.open('https://wa.me/?text=' + encodeURIComponent(texto))`
- Barra de progresso (step 3 de 3)
- Botão "Fechar"

### Tipos TypeScript do Modal

```typescript
interface SubmissaoResumo {
    id: number;
    lista_id: number;
    lista_nome: string;
    usuario_nome: string;
    data_submissao: string;
    total_pedidos: number;
    status: string;
}

interface BreakdownItem {
    submissao_id: number;
    lista_id: number;
    lista_nome: string;
    usuario_nome: string;
    quantidade: number;
}

interface ItemFundido {
    item_id: number;
    item_nome: string;
    item_unidade: string;
    quantidade_total: number;
    breakdown: BreakdownItem[];
}

interface MergePreview {
    submissao_ids: number[];
    listas: { submissao_id: number; lista_id: number; lista_nome: string; }[];
    itens: ItemFundido[];
    total_itens: number;
}

interface MergeModalProps {
    show: boolean;
    onHide: () => void;
    submissaoAtualId: number;
    listaAtualNome: string;
}
```

---

## Importante: Ordem de Registro de Rotas (Flask)

As rotas de merge **devem ser registradas ANTES** da rota `GET /submissoes/<int:submissao_id>`:

```python
# CORRETO — merge antes do :id
@admin_bp.route('/submissoes/merge-preview', methods=['POST'])  # ← primeiro
@admin_bp.route('/submissoes/merge-whatsapp', methods=['POST'])  # ← segundo
@admin_bp.route('/submissoes/<int:submissao_id>', methods=['GET'])  # ← terceiro
```

Se registrado após, Flask interpretaria "merge-preview" como um `int` e falharia.
