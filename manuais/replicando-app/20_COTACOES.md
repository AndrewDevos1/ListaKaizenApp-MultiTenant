# 20 — Módulo de Cotações

> Geração automática de pedidos de compra agrupados por fornecedor, com preenchimento de preços pelo admin.

---

## Conceito

Quando o admin quer comprar itens de um fornecedor, o sistema **gera automaticamente uma cotação** com base nos itens abaixo do estoque mínimo. O admin então preenche os preços unitários de cada item.

```
Admin seleciona fornecedor
→ Sistema detecta itens abaixo do mínimo vinculados ao fornecedor
→ Cria Cotacao com CotacaoItem para cada item deficitário
→ Admin preenche preços unitários
→ Cotacao fica CONCLUIDA
```

---

## Modelos do Banco

### Enum

```python
class CotacaoStatus(enum.Enum):
    PENDENTE  = "PENDENTE"    # Aguardando preenchimento de preços
    CONCLUIDA = "CONCLUIDA"   # Preços preenchidos
```

### Cotacao

```python
class Cotacao(db.Model):
    __tablename__ = 'cotacoes'

    id           = db.Column(db.Integer, primary_key=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    data_cotacao = db.Column(db.DateTime, nullable=False, default=utc_now)
    status       = db.Column(db.Enum(CotacaoStatus), default=CotacaoStatus.PENDENTE)

    fornecedor = db.relationship('Fornecedor', backref=db.backref('cotacoes', lazy=True))
    itens      = db.relationship('CotacaoItem', cascade='all, delete-orphan', backref='cotacao')
```

### CotacaoItem

```python
class CotacaoItem(db.Model):
    __tablename__ = 'cotacao_itens'

    id             = db.Column(db.Integer, primary_key=True)
    cotacao_id     = db.Column(db.Integer, db.ForeignKey('cotacoes.id'), nullable=False)
    item_id        = db.Column(db.Integer, db.ForeignKey('itens.id'), nullable=False)
    quantidade     = db.Column(db.Numeric(10, 2), nullable=False)
    preco_unitario = db.Column(db.Numeric(10, 4), nullable=False)

    item = db.relationship('Item')
```

---

## Endpoints

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/v1/cotacoes` | ADMIN | Gerar cotação (body: `{fornecedor_id}`) |
| GET | `/api/v1/cotacoes` | ADMIN | Listar todas as cotações |
| GET | `/api/v1/cotacoes/<id>` | ADMIN | Detalhe com itens e fornecedor |
| PUT | `/api/v1/cotacao-items/<id>` | ADMIN | Atualizar preço (body: `{preco_unitario}`) |

---

## Lógica de Geração (services.py)

```python
def create_quotation_from_stock(fornecedor_id, restaurante_id):
    fornecedor = Fornecedor.query.get(fornecedor_id)

    # Para cada item do fornecedor:
    items_necessarios = []
    for item in fornecedor.itens:
        # Verifica todos os registros de estoque
        estoques = Estoque.query.filter_by(item_id=item.id).all()
        deficit_total = sum(
            max(0, e.quantidade_minima - e.quantidade_atual)
            for e in estoques
            if e.quantidade_atual < e.quantidade_minima
        )
        if deficit_total > 0:
            items_necessarios.append((item, deficit_total))

    if not items_necessarios:
        return {"message": "Nenhum item precisa de reposição"}, 200

    # Cria cotação
    cotacao = Cotacao(fornecedor_id=fornecedor_id, data_cotacao=now)
    db.session.add(cotacao)
    db.session.flush()

    for item, quantidade in items_necessarios:
        cotacao_item = CotacaoItem(
            cotacao_id=cotacao.id,
            item_id=item.id,
            quantidade=quantidade,
            preco_unitario=0  # admin preencherá depois
        )
        db.session.add(cotacao_item)

    db.session.commit()
    return cotacao.to_dict(), 201
```

---

## Regras de Negócio

1. Cotação é gerada para **um fornecedor específico** de cada vez
2. Sistema agrega déficits de **todas as áreas de estoque** por item
3. Apenas itens com `quantidade_atual < quantidade_minima` são incluídos
4. Se nenhum item precisa de reposição: retorna 200 sem criar cotação
5. `preco_unitario` inicial = 0; admin preenche manualmente
6. Cascade delete: deletar Cotacao deleta todos os CotacaoItem
7. Item não pode ser deletado se estiver em uso em CotacaoItem (409)
8. Não há endpoint para deletar cotação — são permanentes como histórico

---

## Telas do Frontend

### GerarCotacao.tsx (`/admin/gerar-cotacao`)

- Dropdown de seleção de fornecedor
- Botão "Gerar Cotação"
- Redireciona para `/admin/cotacoes/{id}` no sucesso
- Erro se nenhum item precisar de reposição

### CotacaoList.tsx (`/admin/cotacoes`)

- Tabela de todas as cotações:
  - Fornecedor | Data | Status | Qtd Itens | Valor Total
  - Badge: Amarelo (PENDENTE) | Verde (CONCLUIDA)
- Clicar na linha → CotacaoDetail

### CotacaoDetail.tsx (`/admin/cotacoes/:id`)

- Informações do fornecedor (nome, contato)
- Tabela de itens:
  - Nome | Unidade | Quantidade | Preço Unitário (input editável) | Total
- Campo de preço começa em 0 para cada item
- Botão salvar por item ou em lote
- Calcula e exibe valor total da cotação

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | Cotacao, CotacaoItem, CotacaoStatus |
| `backend/kaizen_app/services.py` | `create_quotation_from_stock`, `update_cotacao_item_price` |
| `backend/kaizen_app/controllers.py` | Endpoints cotacao na api_bp |
| `frontend/src/features/admin/GerarCotacao.tsx` | Tela de geração |
| `frontend/src/features/admin/CotacaoList.tsx` | Listagem |
| `frontend/src/features/admin/CotacaoDetail.tsx` | Detalhes e edição de preços |
