# 19 — Sistema de Notificações

> Notificações persistentes no servidor + toasts temporários no frontend. Alimentam o sino de notificações e alertam sobre eventos do sistema.

---

## Conceito

O sistema dispara notificações em momentos-chave do fluxo (submissão, aprovação, rejeição, sugestão) e as armazena no banco. O frontend sincroniza com o servidor e exibe um badge de não-lidas no sino.

---

## Modelo do Banco

### Enum

```python
class TipoNotificacao(enum.Enum):
    SUBMISSAO_LISTA          = "submissao_lista"           # Lista enviada para aprovação
    SUBMISSAO_LISTA_RAPIDA   = "submissao_lista_rapida"    # Lista rápida enviada
    SUGESTAO_ITEM            = "sugestao_item"             # Nova sugestão de item
    LISTA_APROVADA           = "lista_aprovada"            # Lista aprovada
    LISTA_REJEITADA          = "lista_rejeitada"           # Lista rejeitada
    ITEM_SUGERIDO_APROVADO   = "item_sugerido_aprovado"    # Sugestão aprovada
    ITEM_SUGERIDO_REJEITADO  = "item_sugerido_rejeitado"   # Sugestão rejeitada
    PEDIDO_APROVADO          = "pedido_aprovado"           # Pedido aprovado
    PEDIDO_REJEITADO         = "pedido_rejeitado"          # Pedido rejeitado
    SOLICITACAO_RESTAURANTE  = "solicitacao_restaurante"   # Nova solicitação de restaurante
```

### Notificacao

```python
class Notificacao(db.Model):
    __tablename__ = 'notificacoes'

    id              = db.Column(db.Integer, primary_key=True)
    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'))   # Destinatário
    restaurante_id  = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True, index=True)
    titulo          = db.Column(db.String(255), nullable=False)
    mensagem        = db.Column(db.Text, nullable=True)
    tipo            = db.Column(db.Enum(TipoNotificacao), nullable=False)
    lida            = db.Column(db.Boolean, default=False)
    lista_id        = db.Column(db.Integer, db.ForeignKey('listas.id', ondelete='SET NULL'), nullable=True)
    lista_rapida_id = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id', ondelete='SET NULL'), nullable=True)
    submissao_id    = db.Column(db.Integer, db.ForeignKey('submissoes.id', ondelete='SET NULL'), nullable=True)
    sugestao_id     = db.Column(db.Integer, db.ForeignKey('sugestoes_itens.id', ondelete='SET NULL'), nullable=True)
    pedido_id       = db.Column(db.Integer, db.ForeignKey('pedidos.id', ondelete='SET NULL'), nullable=True)
    criado_em       = db.Column(db.DateTime, default=brasilia_now)
    lido_em         = db.Column(db.DateTime, nullable=True)

    usuario    = db.relationship('Usuario')
    restaurante = db.relationship('Restaurante')
```

---

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/auth/notificacoes` | Listar notificações do usuário |
| PUT | `/api/auth/notificacoes/<id>/marcar-lida` | Marcar uma como lida |
| PUT | `/api/auth/notificacoes/marcar-todas-lidas` | Marcar todas como lidas |

**Resposta GET:**
```json
[
  {
    "id": 42,
    "titulo": "Lista aprovada",
    "mensagem": "Sua lista 'Hortifruti' foi aprovada",
    "tipo": "lista_aprovada",
    "lida": false,
    "lista_id": 15,
    "lista_rapida_id": null,
    "pedido_id": null,
    "sugestao_id": null,
    "criado_em": "2026-02-24T10:30:00-03:00",
    "lido_em": null
  }
]
```

---

## Quando São Geradas

| Evento | Tipo | Destinatário |
|--------|------|-------------|
| Colaborador submete lista | SUBMISSAO_LISTA | Admins do restaurante |
| Colaborador submete lista rápida | SUBMISSAO_LISTA_RAPIDA | Admins |
| Usuário sugere item | SUGESTAO_ITEM | Admins |
| Admin aprova lista | LISTA_APROVADA | Criador da lista |
| Admin rejeita lista | LISTA_REJEITADA | Criador da lista |
| Admin aprova sugestão | ITEM_SUGERIDO_APROVADO | Sugestor |
| Admin rejeita sugestão | ITEM_SUGERIDO_REJEITADO | Sugestor |
| Admin aprova pedido | PEDIDO_APROVADO | Colaborador |
| Admin rejeita pedido | PEDIDO_REJEITADO | Colaborador |
| Nova solicitação de restaurante | SOLICITACAO_RESTAURANTE | SUPER_ADMIN |

---

## Frontend — NotificationContext

**Arquivo:** `frontend/src/context/NotificationContext.tsx`

### Estrutura de estado

```typescript
interface NotificationItem {
  id: string;           // "server-{id}" para notificações do servidor
  title: string;
  message?: string;
  createdAt: string;    // ISO datetime
  type: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
  link?: string;        // Rota de navegação opcional
  resourceId?: number;  // ID do recurso relacionado
}

interface NotificationContextType {
  notifications: NotificationItem[];   // Lista persistente (sino)
  toasts: NotificationItem[];          // Toasts temporários
  unreadCount: number;
  addNotification(data): void;
  markAllRead(): void;
  markRead(id: string): void;
  clearAll(): void;
  dismissToast(id: string): void;
}
```

### Mapeamento de tipo servidor → UI

```typescript
const mapServerNotificationToItem = (n: ServerNotification): NotificationItem => {
  let type: NotificationType = 'info';
  if (n.tipo.includes('aprovado') || n.tipo.includes('aprovada')) type = 'success';
  if (n.tipo.includes('rejeitado') || n.tipo.includes('rejeitada')) type = 'danger';
  if (n.tipo.includes('submissao') || n.tipo.includes('sugestao')) type = 'warning';

  const resourceId = n.lista_rapida_id || n.pedido_id || n.lista_id || undefined;

  return {
    id: `server-${n.id}`,
    title: n.titulo,
    message: n.mensagem,
    createdAt: n.criado_em,
    type,
    read: n.lida,
    resourceId
  };
};
```

### Armazenamento Dual

- **Servidor:** Carregado via `GET /auth/notificacoes` ao login
- **LocalStorage:** Chave `kaizen:notifications:{userId}:{role}` como fallback offline
- **Sincronização:** Estado de leitura salvo via PUT endpoints

### Toast System

- `addNotification()` adiciona à lista principal E ao array `toasts`
- Toasts exibem-se via `NotificationToasts.tsx`
- `dismissToast(id)` remove apenas do array toasts (mantém na lista)
- Toasts auto-descartados após 5 segundos

---

## Frontend — Layout.tsx (Integração)

O `Layout.tsx` usa o contexto para:

1. **Badge no sino:** `unreadCount` exibido como número no ícone
2. **Painel dropdown:** Lista de `notifications` com botões "Marcar todas" e "Limpar"
3. **Polling:** Hooks `useSugestoesPendentes` e `useListasRapidasPendentes` adicionam novas notificações quando contagem aumenta:

```typescript
// Polling a cada 30s, gera notificação quando count aumenta:
if (count > prevCount) {
  addNotification({
    title: "Novas sugestões pendentes",
    type: "warning",
    link: "/admin/sugestoes"
  });
}
```

---

## Regras de Negócio

1. Usuários veem apenas notificações do seu `restaurante_id`
2. SUPER_ADMIN vê notificações de todos os restaurantes
3. Notificações são imutáveis (não deletadas — apenas marcadas como lidas)
4. Estado `lido` sincronizado com servidor via PUT endpoints
5. Sem expiração automática de notificações

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | Notificacao, TipoNotificacao |
| `backend/kaizen_app/services.py` | `criar_notificacao()` (usado internamente em aprovações, rejeições) |
| `backend/kaizen_app/controllers.py` | Endpoints auth_bp para notificações |
| `frontend/src/context/NotificationContext.tsx` | Estado global, toasts, sincronização servidor |
| `frontend/src/components/Layout.tsx` | Sino, badge, painel dropdown |
| `frontend/src/components/NotificationToasts.tsx` | Toasts temporários |
| `frontend/src/hooks/useSugestoesPendentes.ts` | Polling de sugestões pendentes |
| `frontend/src/hooks/useListasRapidasPendentes.ts` | Polling de listas rápidas pendentes |
