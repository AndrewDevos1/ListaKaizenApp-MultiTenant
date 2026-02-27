# 22 — Auditoria e Logs (AppLog)

> Trilha de auditoria imutável para todas as ações relevantes do sistema. Somente SUPER_ADMIN tem acesso.

---

## Conceito

Todas as operações significativas (criar, editar, deletar, aprovar, importar) geram um registro `AppLog`. Isso permite rastrear quem fez o quê, quando e em qual contexto — incluindo impersonação.

---

## Modelo do Banco

### AppLog

```python
class AppLog(db.Model):
    __tablename__ = 'app_logs'

    id              = db.Column(db.Integer, primary_key=True)
    criado_em       = db.Column(db.DateTime, default=brasilia_now, nullable=False, index=True)
    restaurante_id  = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True, index=True)
    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    impersonator_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)

    acao       = db.Column(db.String(50), nullable=False, index=True)    # CREATE, UPDATE, DELETE, etc
    entidade   = db.Column(db.String(50), nullable=True, index=True)     # Item, Fornecedor, etc
    entidade_id = db.Column(db.Integer, nullable=True, index=True)
    mensagem   = db.Column(db.String(255), nullable=True)
    meta       = db.Column(db.JSON, nullable=False, default=dict)        # Contexto adicional

    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)

    restaurante  = db.relationship('Restaurante')
    usuario      = db.relationship('Usuario', foreign_keys=[usuario_id])
    impersonator = db.relationship('Usuario', foreign_keys=[impersonator_id])
```

**Índices:** `(criado_em)`, `(restaurante_id)`, `(usuario_id)`, `(acao)`, `(entidade)` — otimizados para filtros.

---

## Endpoint

```
GET /api/admin/logs
Auth: @super_admin_required()
```

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `restaurante_id` | int | Filtrar por restaurante |
| `usuario_id` | int | Filtrar por usuário |
| `acao` | string | Filtrar por ação (CREATE, UPDATE, etc.) |
| `entidade` | string | Filtrar por entidade (Item, Fornecedor, etc.) |
| `start_date` | ISO datetime | Filtrar a partir de |
| `end_date` | ISO datetime | Filtrar até |
| `limit` | int | Máximo de resultados (padrão: 200) |
| `offset` | int | Paginação (padrão: 0) |

**Resposta:**
```json
{
  "logs": [
    {
      "id": 1234,
      "criado_em": "2026-02-24T14:30:00-03:00",
      "restaurante_id": 3,
      "restaurante": {"id": 3, "nome": "Restaurante A", "slug": "restaurante-a"},
      "usuario_id": 10,
      "usuario": {"id": 10, "nome": "João Silva", "email": "joao@a.com", "role": "ADMIN"},
      "impersonator_id": null,
      "impersonator": null,
      "acao": "UPDATE",
      "entidade": "Item",
      "entidade_id": 42,
      "mensagem": "Preço atualizado: R$ 3.50 → R$ 4.00",
      "meta": {"preco_anterior": 3.50, "preco_novo": 4.00},
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0..."
    }
  ],
  "total": 542
}
```

---

## Função register_app_log() (services.py)

```python
def register_app_log(
    acao: str,
    entidade: str = None,
    entidade_id: int = None,
    mensagem: str = None,
    meta: dict = None,
    restaurante_id: int = None,
    usuario_id: int = None,
    impersonator_id: int = None,
    ip_address: str = None,
    user_agent: str = None
) -> AppLog | None:
    """
    Cria um registro de auditoria.
    Retorna None silenciosamente em caso de erro (não interrompe o fluxo principal).
    """
    try:
        log = AppLog(
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            mensagem=mensagem,
            meta=meta or {},
            restaurante_id=restaurante_id,
            usuario_id=usuario_id,
            impersonator_id=impersonator_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(log)
        db.session.commit()
        return log
    except Exception:
        return None
```

---

## Ações e Entidades Comuns

### Ações (acao)

| Ação | Quando |
|------|--------|
| `CREATE` | Criação de registros |
| `UPDATE` | Atualização de dados |
| `DELETE` | Deleção de registros |
| `APPROVE` | Aprovação de usuário, fornecedor, lista |
| `REJECT` | Rejeição de lista, sugestão |
| `IMPORT` | Importação em lote |
| `EXPORT` | Exportação de dados |

### Entidades (entidade)

`Usuario`, `Fornecedor`, `Item`, `Lista`, `ListaRapida`, `Submissao`, `Pedido`, `SugestaoItem`, `Cotacao`, `Checklist`, `POPExecucao`, `Restaurante`

---

## Campo `meta` — Exemplos

### Atualização de preço de item
```json
{
  "item_id": 42,
  "nome": "Cebola Roxa",
  "preco_anterior": 3.50,
  "preco_novo": 4.00
}
```

### Aprovação de lista
```json
{
  "lista_id": 15,
  "lista_nome": "Hortifruti - Semana",
  "usuario_nome": "Maria Santos"
}
```

### Importação de fornecedores
```json
{
  "fornecedores_criados": 5,
  "fornecedores_duplicados": 2,
  "arquivo": "fornecedores.csv"
}
```

### Atualização de perfil com mudanças
```json
{
  "mudancas": {
    "telefone": {"anterior": "(11) 1111-1111", "novo": "(11) 9999-9999"},
    "cidade": {"anterior": "São Paulo", "novo": "Campinas"}
  }
}
```

---

## Impersonação no Log

Quando SUPER_ADMIN acessa como outro usuário:
- `usuario_id` = ID do usuário impersonado (quem aparece como autor)
- `impersonator_id` = ID do SUPER_ADMIN real

Isso permite rastrear: "Admin X impersonou o usuário Y e fez a ação Z".

---

## Regras de Negócio

1. Somente SUPER_ADMIN acessa os logs (`@super_admin_required()`)
2. Logs são **imutáveis** — nenhum endpoint de update ou delete
3. Falha ao registrar log **não interrompe** a operação principal
4. Timestamps em fuso Brasília (BRT/BRST)
5. Filtros com índices eficientes para grandes volumes
6. Paginação obrigatória (padrão: 200 por página)
7. Retém logs indefinidamente (sem purge automático)

---

## Tela do Frontend

### LogsAuditoria.tsx (Admin — `/admin/logs`)

- Filtros: Restaurante | Usuário | Ação | Entidade | Data início | Data fim
- Tabela paginada:
  - Data/Hora | Restaurante | Usuário | Impersonador | Ação | Entidade | ID | Mensagem
- Expandir linha: mostra campo `meta` como JSON formatado
- Botão "Exportar CSV" para download dos logs filtrados

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` (linhas 1298-1334) | Modelo AppLog |
| `backend/kaizen_app/services.py` (linhas 98-190) | `register_app_log`, `listar_logs` |
| `backend/kaizen_app/controllers.py` | Endpoint `GET /admin/logs` |
| `frontend/src/features/admin/LogsAuditoria.tsx` | Tela de auditoria |
