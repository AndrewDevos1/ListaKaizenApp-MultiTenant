# 16 — Módulo de Listas Rápidas

> Listas de compras ad-hoc criadas por colaboradores fora do fluxo padrão de estoque, com workflow de aprovação pelo admin.

---

## Conceito

O colaborador pode criar uma **Lista Rápida** para solicitar itens urgentes, sem precisar estar vinculado a uma lista principal. O fluxo é:

```
Colaborador cria lista (RASCUNHO)
→ Adiciona itens com prioridade
→ Submete para aprovação (PENDENTE)
→ Admin revisa, edita, aprova ou rejeita
→ Lista APROVADA pode virar Checklist
```

---

## Modelos do Banco

### Enums

```python
class StatusListaRapida(enum.Enum):
    RASCUNHO  = "rascunho"    # Rascunho local do colaborador
    PENDENTE  = "pendente"    # Submetida, aguardando aprovação
    APROVADA  = "aprovada"    # Admin aprovou
    REJEITADA = "rejeitada"   # Admin rejeitou

class PrioridadeItem(enum.Enum):
    PREVENCAO      = "prevencao"       # Preventivo
    PRECISA_COMPRAR = "precisa_comprar" # Necessário comprar
    URGENTE        = "urgente"         # Urgente
```

### ListaRapida

```python
class ListaRapida(db.Model):
    __tablename__ = 'listas_rapidas'

    id              = db.Column(db.Integer, primary_key=True)
    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id'))   # Criador
    nome            = db.Column(db.String(200), nullable=False)
    descricao       = db.Column(db.Text, nullable=True)
    status          = db.Column(db.Enum(StatusListaRapida))
    admin_id        = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    mensagem_admin  = db.Column(db.Text, nullable=True)
    criado_em       = db.Column(db.DateTime, default=brasilia_now)
    submetido_em    = db.Column(db.DateTime, nullable=True)
    respondido_em   = db.Column(db.DateTime, nullable=True)
    arquivada       = db.Column(db.Boolean, default=False)
    arquivada_em    = db.Column(db.DateTime, nullable=True)
    deletado        = db.Column(db.Boolean, default=False)   # Soft delete

    usuario = db.relationship('Usuario', foreign_keys=[usuario_id])
    admin   = db.relationship('Usuario', foreign_keys=[admin_id])
    itens   = db.relationship('ListaRapidaItem', cascade='all, delete-orphan')
```

### ListaRapidaItem

```python
class ListaRapidaItem(db.Model):
    __tablename__ = 'lista_rapida_itens'

    id               = db.Column(db.Integer, primary_key=True)
    lista_rapida_id  = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id', ondelete='CASCADE'))
    item_global_id   = db.Column(db.Integer, db.ForeignKey('lista_mae_itens.id', ondelete='CASCADE'), nullable=True)
    item_nome_temp   = db.Column(db.String(200), nullable=True)   # Se não estiver no catálogo
    item_unidade_temp = db.Column(db.String(50), nullable=True)
    prioridade       = db.Column(db.Enum(PrioridadeItem))
    observacao       = db.Column(db.Text, nullable=True)
    descartado       = db.Column(db.Boolean, default=False)   # Admin descartou (suficiente)
    criado_em        = db.Column(db.DateTime, default=brasilia_now)

    lista_rapida = db.relationship('ListaRapida', back_populates='itens')
    item_global  = db.relationship('ListaMaeItem')  # Opcional
```

**Nota:** Um item pode vir do catálogo global (`item_global_id`) ou ser temporário (`item_nome_temp`).

---

## Endpoints

### Colaborador (`/api/auth/*`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/listas-rapidas` | Criar nova lista |
| GET | `/api/auth/listas-rapidas` | Listar listas do usuário |
| GET | `/api/auth/listas-rapidas/<id>` | Detalhe |
| DELETE | `/api/auth/listas-rapidas/<id>` | Deletar |
| POST | `/api/auth/listas-rapidas/<id>/itens` | Adicionar item do catálogo |
| POST | `/api/auth/listas-rapidas/<id>/itens/temporario` | Adicionar item temporário |
| DELETE | `/api/auth/listas-rapidas/<id>/itens/<item_id>` | Remover item |
| PUT | `/api/auth/listas-rapidas/<id>/itens/<item_id>/prioridade` | Atualizar prioridade |
| POST | `/api/auth/listas-rapidas/<id>/submeter` | Submeter para aprovação |
| GET | `/api/auth/listas-rapidas/<id>/whatsapp` | Gerar texto WhatsApp |

### Admin (`/api/admin/*`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/listas-rapidas/pendentes` | Listar pendentes |
| GET | `/api/admin/listas-rapidas/pendentes/count` | Contagem pendentes (badge) |
| GET | `/api/admin/listas-rapidas/<id>` | Detalhe |
| GET | `/api/admin/listas-rapidas/<id>/itens` | Itens da lista |
| PUT | `/api/admin/listas-rapidas/<id>/aprovar` | Aprovar (body: `{mensagem_admin?}`) |
| PUT | `/api/admin/listas-rapidas/<id>/rejeitar` | Rejeitar (body: `{mensagem_admin}` obrigatório) |
| POST | `/api/admin/listas-rapidas/<id>/reverter` | Reverter APROVADA/REJEITADA → PENDENTE |
| POST | `/api/admin/listas-rapidas/<id>/arquivar` | Arquivar |
| POST | `/api/admin/listas-rapidas/<id>/desarquivar` | Desarquivar |
| POST | `/api/admin/listas-rapidas/<id>/itens` | Adicionar item |
| DELETE | `/api/admin/listas-rapidas/<id>/itens/<item_id>` | Remover item |
| PUT | `/api/admin/listas-rapidas/<id>/itens/<item_id>` | Editar item (prioridade/notas) |
| PUT | `/api/admin/listas-rapidas/<id>/itens/<item_id>/descartar` | Marcar como descartado |
| PUT | `/api/admin/listas-rapidas/<id>/itens/<item_id>/restaurar` | Restaurar descartado |
| POST | `/api/admin/listas-rapidas/<id>/converter-checklist` | Converter para Checklist |

---

## Regras de Negócio

**Criação:**
- Somente COLLABORATOR pode criar listas rápidas
- Inicia com status=RASCUNHO
- Itens podem ser do catálogo global ou temporários

**Submissão:**
- Colaborador muda status RASCUNHO → PENDENTE
- Define `submetido_em`
- Notifica admins: `SUBMISSAO_LISTA_RAPIDA`

**Aprovação/Rejeição:**
- Somente ADMIN/SUPER_ADMIN podem aprovar ou rejeitar
- Aprovação: status → APROVADA, admin_id definido, respondido_em definido
- Rejeição: exige `mensagem_admin` (motivo obrigatório), status → REJEITADA
- Ambas enviam notificação ao criador

**Arquivamento:**
- Somente listas APROVADA ou REJEITADA podem ser arquivadas
- Separado do soft delete (`deletado`)

**Reversão:**
- Admin pode reverter APROVADA/REJEITADA de volta para PENDENTE

**Conversão para Checklist:**
- Listas APROVADAS podem ser convertidas (ver `12_MODULO_CHECKLIST.md`)
- Items `descartado=True` podem ser excluídos da conversão

**Descarte de Item:**
- Admin pode marcar item como `descartado=True` (suficiente em estoque)
- Pode ser restaurado com endpoint de restaurar

---

## Telas do Frontend

### GerenciarListasRapidas.tsx (Admin — `/admin/listas-rapidas`)

- Cabeçalho com badge de contagem de pendentes
- Lista de listas pendentes:
  - Nome, criador, total de itens, itens urgentes, data de criação/submissão
- Modal de revisão:
  - Itens com badge colorido por prioridade: vermelho=URGENTE, amarelo=PRECISA_COMPRAR, verde=PREVENCAO
  - Campo para mensagem do admin
  - Botões: Aprovar | Rejeitar
- Feedback via alertas com countdown antes de fechar

### CriarListaRapida.tsx (Colaborador)

- Formulário: nome, descrição
- Seleção de itens do catálogo global (busca)
- Adicionar itens temporários (não no catálogo)
- Definir prioridade por item
- Adicionar observações por item
- Salvar como rascunho (RASCUNHO)
- Botão "Submeter" → muda para PENDENTE

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | ListaRapida, ListaRapidaItem, StatusListaRapida, PrioridadeItem |
| `backend/kaizen_app/services.py` | Lógica de criação, submissão, aprovação, rejeição |
| `backend/kaizen_app/controllers.py` | Endpoints auth_bp e admin_bp para listas rápidas |
| `frontend/src/features/admin/GerenciarListasRapidas.tsx` | Tela admin de revisão |
| `frontend/src/features/collaborator/CriarListaRapida.tsx` | Tela de criação pelo colaborador |
