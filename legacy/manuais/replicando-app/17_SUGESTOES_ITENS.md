# 17 — Módulo de Sugestões de Itens

> Colaboradores podem sugerir novos itens para o catálogo global. Admin aprova (criando o item) ou rejeita.

---

## Conceito

Quando um colaborador precisa de um item que não existe no catálogo, ele pode **sugerir** que o admin adicione. O admin decide se aprova (criando o item no catálogo) ou rejeita com um motivo.

---

## Modelo do Banco

### Enum

```python
class SugestaoStatus(enum.Enum):
    PENDENTE  = "pendente"    # Aguardando revisão
    APROVADA  = "aprovada"    # Aprovada — item criado no catálogo
    REJEITADA = "rejeitada"   # Rejeitada com motivo
```

### SugestaoItem

```python
class SugestaoItem(db.Model):
    __tablename__ = 'sugestoes_itens'

    id               = db.Column(db.Integer, primary_key=True)
    usuario_id       = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'))
    lista_id         = db.Column(db.Integer, db.ForeignKey('listas.id', ondelete='CASCADE'), nullable=True)
    lista_rapida_id  = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id', ondelete='CASCADE'), nullable=True)
    nome_item        = db.Column(db.String(200), nullable=False)
    unidade          = db.Column(db.String(50), nullable=False)
    quantidade       = db.Column(db.Float, nullable=False)
    mensagem_usuario = db.Column(db.Text, nullable=True)
    status           = db.Column(db.Enum(SugestaoStatus), default=SugestaoStatus.PENDENTE)
    admin_id         = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    mensagem_admin   = db.Column(db.Text, nullable=True)
    item_global_id   = db.Column(db.Integer, db.ForeignKey('lista_mae_itens.id', ondelete='SET NULL'), nullable=True)
    criado_em        = db.Column(db.DateTime, default=brasilia_now)
    respondido_em    = db.Column(db.DateTime, nullable=True)

    usuario     = db.relationship('Usuario', foreign_keys=[usuario_id])
    admin       = db.relationship('Usuario', foreign_keys=[admin_id])
    lista       = db.relationship('Lista')
    lista_rapida = db.relationship('ListaRapida')
    item_global = db.relationship('ListaMaeItem')
```

**Nota:** `item_global_id` é preenchido quando aprovada — aponta para o item criado no catálogo.

---

## Endpoints

### Colaborador

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/sugestoes` | Criar sugestão |
| GET | `/api/auth/sugestoes/minhas` | Listar sugestões do usuário |

**Payload POST:**
```json
{
  "nome_item": "Alho Poró",
  "unidade": "kg",
  "quantidade": 2.5,
  "mensagem_usuario": "Precisamos para o novo prato",
  "lista_id": 42,
  "lista_rapida_id": null
}
```

### Admin

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/sugestoes/pendentes` | Listar pendentes (`?restaurante_id=`) |
| GET | `/api/admin/sugestoes/pendentes/count` | Contagem para badge |
| PUT | `/api/admin/sugestoes/<id>/aprovar` | Aprovar (body: `{mensagem_admin?}`) |
| PUT | `/api/admin/sugestoes/<id>/rejeitar` | Rejeitar (body: `{mensagem_admin}` obrigatório) |

---

## Regras de Negócio

**Criação:**
- Qualquer usuário autenticado (COLLABORATOR/ADMIN) pode sugerir
- Sugestão pode ser vinculada a uma lista ou lista rápida (opcional)
- Status inicial: PENDENTE

**Aprovação:**
- ADMIN/SUPER_ADMIN aprovam
- Cria `ListaMaeItem` no catálogo global com `nome_item` e `unidade`
- Preenche `item_global_id` na sugestão
- Envia notificação `ITEM_SUGERIDO_APROVADO` ao sugestor

**Rejeição:**
- `mensagem_admin` é obrigatório
- Envia notificação `ITEM_SUGERIDO_REJEITADO` ao sugestor

**Visibilidade:**
- Usuários veem apenas suas próprias sugestões
- Admins veem todas as sugestões do restaurante
- SUPER_ADMIN pode filtrar por `restaurante_id`

---

## Telas do Frontend

### GerenciarSugestoes.tsx (Admin — `/admin/sugestoes`)

- Cabeçalho com badge de contagem de pendentes
- Tabela/lista de sugestões pendentes:
  - Sugestor | Nome do item | Unidade | Quantidade | Lista associada | Data | Mensagem
- Modal de revisão por sugestão:
  - Campo de mensagem do admin
  - Botões: Aprovar | Rejeitar

### SugestoesColaborador.tsx (Colaborador)

- Tabela "Minhas Sugestões":
  - Nome do item | Unidade | Status (badge) | Data | Resposta do admin
- Formulário para criar nova sugestão:
  - Nome, unidade, quantidade, mensagem, lista opcional

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | SugestaoItem, SugestaoStatus |
| `backend/kaizen_app/services.py` | Lógica de aprovação (cria ListaMaeItem), rejeição |
| `backend/kaizen_app/controllers.py` | Endpoints auth_bp e admin_bp para sugestões |
| `frontend/src/features/admin/GerenciarSugestoes.tsx` | Tela admin |
| `frontend/src/features/collaborator/SugestoesColaborador.tsx` | Tela colaborador |
