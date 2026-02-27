# 12 — Módulo de Checklist de Compras

> Converte uma Submissão APROVADA (ou Lista Rápida APROVADA) em uma lista de compras interativa com itens marcáveis e compartilhamento via WhatsApp.

---

## Conceito

Após o admin aprovar uma submissão, ele pode convertê-la em um **Checklist de Compras**. O checklist funciona como uma lista de supermercado digital:

- Cada pedido aprovado vira um item marcável
- O admin marca os itens conforme vai comprando
- O progresso é calculado em tempo real
- O checklist pode ser compartilhado via WhatsApp (com itens pendentes e concluídos separados)
- Pode ser finalizado e reaberto

**Importante:** Checklists são exclusivos do admin — colaboradores não têm acesso.

---

## Modelos do Banco

### ChecklistStatus (Enum)

```python
class ChecklistStatus(enum.Enum):
    ATIVO = "ATIVO"
    FINALIZADO = "FINALIZADO"
```

### Checklist

```python
class Checklist(db.Model, SerializerMixin):
    __tablename__ = 'checklists'

    id              = db.Column(db.Integer, primary_key=True)
    submissao_id    = db.Column(db.Integer, db.ForeignKey('submissoes.id', ondelete='CASCADE'), nullable=True)
    nome            = db.Column(db.String(200), nullable=False)
    status          = db.Column(db.Enum(ChecklistStatus), default=ChecklistStatus.ATIVO)
    criado_em       = db.Column(db.DateTime, default=brasilia_now)
    finalizado_em   = db.Column(db.DateTime, nullable=True)

    submissao = db.relationship('Submissao', backref=db.backref('checklists', lazy='dynamic'))
    itens     = db.relationship('ChecklistItem', back_populates='checklist',
                                lazy='dynamic', cascade='all, delete-orphan')
```

- `submissao_id` é nullable — pode vir de uma **Lista Rápida** (sem submissão)
- Quando a submissão é deletada (CASCADE), o checklist é deletado junto

### ChecklistItem

```python
class ChecklistItem(db.Model, SerializerMixin):
    __tablename__ = 'checklist_itens'

    id            = db.Column(db.Integer, primary_key=True)
    checklist_id  = db.Column(db.Integer, db.ForeignKey('checklists.id', ondelete='CASCADE'))
    pedido_id     = db.Column(db.Integer, db.ForeignKey('pedidos.id', ondelete='SET NULL'), nullable=True)

    # Snapshot desnormalizado (independente do pedido original)
    item_nome       = db.Column(db.String(200), nullable=False)
    quantidade      = db.Column(db.Numeric(10, 2), nullable=True)
    unidade         = db.Column(db.String(50), nullable=True)
    fornecedor_nome = db.Column(db.String(100), nullable=True)
    observacao      = db.Column(db.Text, nullable=True)

    # Estado
    marcado    = db.Column(db.Boolean, default=False)
    marcado_em = db.Column(db.DateTime, nullable=True)

    checklist = db.relationship('Checklist', back_populates='itens')
    pedido    = db.relationship('Pedido')
```

**Por que desnormalizar?** O checklist armazena um snapshot dos dados do pedido no momento da conversão. Se o pedido for editado depois, o checklist não é afetado.

---

## Fluxo de Status

```
Submissão APROVADA
        ↓
[Admin clica "Converter para Checklist"]
        ↓
Checklist ATIVO  ←────────────────┐
        ↓                          │
 Admin marca itens                 │ [Reabrir]
        ↓                          │
[Admin clica "Finalizar"]          │
        ↓                          │
Checklist FINALIZADO ──────────────┘
```

Regra: quando FINALIZADO, os itens não podem ser marcados/desmarcados. Pode ser reaberto.

---

## Endpoints

Todos protegidos por `@admin_required()`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/admin/submissoes/:id/converter-checklist` | Converte submissão APROVADA em checklist |
| POST | `/api/admin/listas-rapidas/:id/converter-checklist` | Converte lista rápida APROVADA em checklist |
| GET | `/api/admin/checklists` | Lista todos os checklists (`?status=ATIVO\|FINALIZADO`) |
| GET | `/api/admin/checklists/:id` | Detalhe completo com todos os itens |
| PUT | `/api/admin/checklists/:id/itens/:itemId/marcar` | Marca/desmarca item |
| POST | `/api/admin/checklists/:id/finalizar` | Finaliza checklist |
| POST | `/api/admin/checklists/:id/reabrir` | Reabre checklist finalizado |
| GET | `/api/admin/checklists/:id/whatsapp` | Gera texto formatado para WhatsApp |

---

## Conversão: Submissão → Checklist

### Endpoint

```
POST /api/admin/submissoes/123/converter-checklist
{
  "incluir_fornecedor": true,
  "incluir_observacoes": false
}
```

### Lógica (services.py)

```python
def converter_submissao_para_checklist(submissao_id: int, data: dict):
    submissao = Submissao.query.get(submissao_id)

    # Validações
    if submissao.status != SubmissaoStatus.APROVADO:
        raise ValueError("Apenas submissões aprovadas podem ser convertidas em checklist")

    pedidos_aprovados = [p for p in submissao.pedidos if p.status.value == 'APROVADO']
    if not pedidos_aprovados:
        raise ValueError("Nenhum pedido aprovado encontrado nesta submissão")

    # Cria checklist
    checklist = Checklist(
        submissao_id=submissao_id,
        nome=f"Checklist - {submissao.lista.nome}",
        status=ChecklistStatus.ATIVO
    )
    db.session.add(checklist)
    db.session.flush()  # obter ID

    # Cria itens (snapshot)
    incluir_fornecedor = data.get('incluir_fornecedor', False)
    for pedido in pedidos_aprovados:
        item = ChecklistItem(
            checklist_id=checklist.id,
            pedido_id=pedido.id,
            item_nome=pedido.item.nome,
            quantidade=pedido.quantidade_solicitada,
            unidade=pedido.item.unidade,
            fornecedor_nome=pedido.item.fornecedor.nome if incluir_fornecedor and pedido.item.fornecedor else None,
            marcado=False
        )
        db.session.add(item)

    db.session.commit()
    return checklist.to_dict()
```

**Resposta 200:**
```json
{
  "id": 10,
  "nome": "Checklist - Hortifruti - Semana",
  "status": "ATIVO",
  "submissao_id": 123,
  "criado_em": "2026-02-24T21:00:00-03:00",
  "total_itens": 5,
  "itens_marcados": 0
}
```

### Frontend (DetalhesSubmissao.tsx)

O botão "Converter para Checklist" aparece quando `submissao.status === 'APROVADO'`:

```typescript
const handleConverterParaChecklist = async () => {
    const response = await api.post(
        `/admin/submissoes/${submissao.id}/converter-checklist`,
        { incluir_fornecedor: incluirFornecedor, incluir_observacoes: incluirObservacoes }
    );
    navigate(`/admin/checklists/${response.data.id}`); // ← redireciona direto para o checklist
};
```

---

## Marcar Itens (UI Otimista)

### Endpoint

```
PUT /api/admin/checklists/10/itens/201/marcar
{ "marcado": true }
```

### Lógica backend

```python
def marcar_item_checklist(item_id: int, marcado: bool):
    item = ChecklistItem.query.get(item_id)
    item.marcado = marcado
    item.marcado_em = brasilia_now() if marcado else None
    db.session.commit()
    return item.to_dict()
```

### Frontend — Atualização Otimista

O frontend atualiza o estado local **antes** de chamar a API e reverte se falhar:

```typescript
const handleMarcarItem = async (itemId: number, marcado: boolean) => {
    if (checklist.status === 'FINALIZADO') return;

    const itemAnterior = checklist.itens.find(item => item.id === itemId);

    // 1. Atualiza local (otimista)
    setChecklist(prev => {
        const novosItens = prev.itens.map(item =>
            item.id === itemId
                ? { ...item, marcado, marcado_em: marcado ? new Date().toISOString() : undefined }
                : item
        );
        const itensMarcados = novosItens.filter(i => i.marcado).length;
        return {
            ...prev,
            itens: novosItens,
            itens_marcados: itensMarcados,
            progresso_percentual: (itensMarcados / prev.total_itens) * 100
        };
    });

    try {
        // 2. Sincroniza com servidor
        await api.put(`/admin/checklists/${checklist.id}/itens/${itemId}/marcar`, { marcado });
    } catch (error) {
        // 3. Reverte se falhou
        if (itemAnterior) {
            aplicarMudancaLocal(itemAnterior.marcado);
        }
    }
};
```

---

## Compartilhar via WhatsApp

### Endpoint

```
GET /api/admin/checklists/10/whatsapp
```

### Formato do texto gerado

```python
def compartilhar_checklist_whatsapp(checklist_id: int):
    itens = list(checklist.itens.order_by('item_nome'))
    itens_pendentes  = [item for item in itens if not item.marcado]
    itens_concluidos = [item for item in itens if item.marcado]

    linhas = [
        "*CHECKLIST DE COMPRAS*",
        f"*{checklist.nome}*",
        f"Data: {checklist.criado_em.strftime('%d/%m/%Y %H:%M')}",
        "",
    ]

    # Itens pendentes
    if itens_pendentes:
        linhas.append("*📋 ITENS PENDENTES*")
        for item in itens_pendentes:
            linha = f"[ ] {item.item_nome}"
            if item.quantidade is not None:
                linha += f" - {float(item.quantidade):.1f}{item.unidade}"
            if item.fornecedor_nome:
                linha += f" ({item.fornecedor_nome})"
            linhas.append(linha)
        linhas.append("")

    # Itens concluídos (riscados com ~texto~)
    if itens_concluidos:
        linhas.append("*✅ ITENS CONCLUÍDOS*")
        for item in itens_concluidos:
            linha = f"[x] {item.item_nome}"
            if item.quantidade is not None:
                linha += f" - {float(item.quantidade):.1f}{item.unidade}"
            if item.fornecedor_nome:
                linha += f" ({item.fornecedor_nome})"
            linhas.append(f"~{linha}~")  # ← WhatsApp risca com ~
        linhas.append("")

    progresso = itens_marcados / total_itens * 100 if total_itens > 0 else 0
    linhas.append(f"*Progresso: {itens_marcados}/{total_itens} itens ({progresso:.0f}%)*")

    return {"texto": "\n".join(linhas)}
```

**Exemplo de output:**
```
*CHECKLIST DE COMPRAS*
*Checklist - Hortifruti - Semana*
Data: 24/02/2026 14:30

*📋 ITENS PENDENTES*
[ ] Cebola Roxa - 5.0kg (Fornecedor X)
[ ] Batata - 10.0kg

*✅ ITENS CONCLUÍDOS*
~[x] Cenoura - 3.0kg (Fornecedor Y)~

*Progresso: 1/3 itens (33%)*
```

### Frontend — copiar + abrir WhatsApp

```typescript
const handleCompartilharWhatsApp = async () => {
    const popup = window.open('about:blank', '_blank');  // abre janela antes do await (evita bloqueio)

    const texto = await buscarTextoWhatsApp(checklist.id);  // GET /whatsapp
    const copiado = await copiarTexto(texto);  // tenta clipboard API, fallback: execCommand

    // Abre WhatsApp Web com texto pré-preenchido
    const url = new URL('https://wa.me/');
    url.searchParams.set('text', texto);
    popup.location.href = url.toString();
};

// Fallback de cópia para Safari/navegadores sem clipboard API:
const copiarTexto = async (texto: string) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        return true;
    }
    // Fallback: textarea oculto + execCommand
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
};
```

---

## Telas do Frontend

### GerenciarChecklists.tsx

**Rota:** `/admin/checklists`

- Lista todos os checklists do restaurante
- Filtro por status: `TODOS | ATIVO | FINALIZADO`
- Colunas: Nome | Origem | Data | Total Itens | Progresso | Status | Ações
- Ação: "Ver detalhes" → `/admin/checklists/:id`

### DetalhesChecklist.tsx

**Rota:** `/admin/checklists/:id`

**Elementos:**
- Card de informações: nome, origem (submissão ou lista rápida), data, status
- **Barra de progresso**: `itens_marcados / total_itens` atualizada em tempo real
- **Lista de itens**: checkbox por item, nome + quantidade + unidade + fornecedor
  - Itens marcados aparecem com estilo riscado (strikethrough)
  - Checkbox desabilitado quando status=FINALIZADO
- **Botões de ação**:
  - `Compartilhar WhatsApp` (sempre visível)
  - `Finalizar Checklist` (visível se status=ATIVO)
  - `Reabrir Checklist` (visível se status=FINALIZADO)

---

## Regras de Negócio

1. Apenas submissões com `status=APROVADO` podem gerar checklist
2. Apenas os pedidos com `status=APROVADO` dentro da submissão são incluídos
3. Itens são armazenados como snapshot — mudanças no pedido original não afetam o checklist
4. Quando FINALIZADO: itens não podem ser marcados/desmarcados
5. Checklist pode ser reaberto (FINALIZADO → ATIVO) quantas vezes for necessário
6. Se a submissão for deletada, o checklist é deletado em cascata
7. Checklists de lista rápida têm `submissao_id=null`
8. Administrador pode incluir ou não o nome do fornecedor no momento da conversão

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | Modelos `Checklist`, `ChecklistItem`, enum `ChecklistStatus` |
| `backend/kaizen_app/services.py` | `converter_submissao_para_checklist`, `marcar_item_checklist`, `compartilhar_checklist_whatsapp` |
| `backend/kaizen_app/controllers.py` | Endpoints `/admin/checklists/*` e `/admin/submissoes/:id/converter-checklist` |
| `frontend/src/features/admin/GerenciarChecklists.tsx` | Listagem e filtro de checklists |
| `frontend/src/features/admin/DetalhesChecklist.tsx` | Marcar itens (otimista), finalizar, compartilhar WhatsApp |
| `frontend/src/features/admin/DetalhesSubmissao.tsx` | Botão "Converter para Checklist" na tela da submissão |
