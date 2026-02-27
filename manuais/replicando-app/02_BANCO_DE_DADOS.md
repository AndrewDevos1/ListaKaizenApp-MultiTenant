# 02 — Banco de Dados: Schema Completo

> Todos os modelos SQLAlchemy do sistema. O banco usa PostgreSQL em produção e SQLite como fallback local.

---

## Enums

### `UserRoles`
```python
class UserRoles(enum.Enum):
    SUPER_ADMIN  = "SUPER_ADMIN"   # Acesso global a todos os restaurantes
    ADMIN        = "ADMIN"         # Admin de um restaurante específico
    COLLABORATOR = "COLLABORATOR"  # Colaborador que atualiza estoques
    SUPPLIER     = "SUPPLIER"      # Fornecedor externo
```

### `SubmissaoStatus`
```python
class SubmissaoStatus(enum.Enum):
    PENDENTE               = "PENDENTE"                # Aguardando análise do admin
    PARCIALMENTE_APROVADO  = "PARCIALMENTE_APROVADO"   # Mix de aprovados/rejeitados
    APROVADO               = "APROVADO"                # Todos os pedidos aprovados
    REJEITADO              = "REJEITADO"               # Todos os pedidos rejeitados
```

### `PedidoStatus`
```python
class PedidoStatus(enum.Enum):
    PENDENTE  = "PENDENTE"   # Aguardando decisão
    APROVADO  = "APROVADO"   # Aprovado para compra
    REJEITADO = "REJEITADO"  # Não aprovado
```

### `CotacaoStatus`
```python
class CotacaoStatus(enum.Enum):
    PENDENTE  = "PENDENTE"   # Cotação em aberto
    CONCLUIDA = "CONCLUIDA"  # Cotação fechada
```

### `StatusSolicitacaoRestaurante`
```python
class StatusSolicitacaoRestaurante(enum.Enum):
    PENDENTE  = "PENDENTE"
    APROVADO  = "APROVADO"
    REJEITADO = "REJEITADO"
```

---

## Tabelas Principais

---

### `usuarios`

```sql
CREATE TABLE usuarios (
    id                INTEGER PRIMARY KEY,
    nome              VARCHAR(100)  NOT NULL,
    username          VARCHAR(50)   UNIQUE,
    email             VARCHAR(120)  UNIQUE NOT NULL,
    senha_hash        VARCHAR(256)  NOT NULL,
    senha_texto_puro  VARCHAR(128),          -- Opcional: plain text para admin compartilhar
    role              ENUM(UserRoles) NOT NULL DEFAULT 'COLLABORATOR',
    restaurante_id    INTEGER REFERENCES restaurantes(id),
    aprovado          BOOLEAN NOT NULL DEFAULT FALSE,  -- Admin deve aprovar após registro
    ativo             BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em         TIMESTAMP DEFAULT NOW(),
    session_token     VARCHAR(64),
    session_updated_at TIMESTAMP,
    wizard_status     JSON DEFAULT '{}'
);
CREATE INDEX ix_usuarios_restaurante_id ON usuarios(restaurante_id);
```

**Relacionamentos:**
- `restaurante` → Restaurante (muitos para um)
- `submissoes` → [Submissao] (um para muitos)
- `pedidos` → [Pedido] (um para muitos)
- `listas_atribuidas` → [Lista] (muitos para muitos via `lista_colaborador`)

**Regras de negócio:**
- Novos usuários têm `aprovado=False` por padrão
- Admin deve aprovar manualmente via `/api/admin/users/:id/approve`
- SUPER_ADMIN tem `restaurante_id = NULL`
- `wizard_status` armazena progresso do onboarding (JSON livre)

---

### `restaurantes`

```sql
CREATE TABLE restaurantes (
    id           INTEGER PRIMARY KEY,
    nome         VARCHAR(200) NOT NULL UNIQUE,
    slug         VARCHAR(100) NOT NULL UNIQUE,  -- Ex: "kaizen-centro"
    ativo        BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    deletado     BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ix_restaurantes_slug ON restaurantes(slug);
```

**Relacionamentos:**
- `usuarios` → [Usuario] (um para muitos, lazy='dynamic')

---

### `listas` ⭐ CORE

```sql
CREATE TABLE listas (
    id             INTEGER PRIMARY KEY,
    restaurante_id INTEGER NOT NULL REFERENCES restaurantes(id),
    nome           VARCHAR(100) NOT NULL UNIQUE,
    descricao      VARCHAR(255),
    data_criacao   TIMESTAMP NOT NULL DEFAULT NOW(),
    deletado       BOOLEAN NOT NULL DEFAULT FALSE,
    data_delecao   TIMESTAMP
);
CREATE INDEX ix_listas_restaurante_id ON listas(restaurante_id);
```

**Relacionamentos:**
- `restaurante` → Restaurante
- `colaboradores` → [Usuario] (muitos para muitos via `lista_colaborador`)
- `item_refs` → [ListaItemRef] (um para muitos, lazy='dynamic', cascade delete)
- `submissoes` → [Submissao] (um para muitos)
- `fornecedores` → [Fornecedor] (muitos para muitos via `fornecedor_lista`)

**Regras de negócio:**
- `deletado=True` = soft delete (vai para lixeira)
- `nome` é único globalmente (não apenas por restaurante — atenção!)
- Itens são ligados via `ListaItemRef`, não diretamente

---

### `lista_mae_itens` ⭐ CATÁLOGO GLOBAL

```sql
CREATE TABLE lista_mae_itens (
    id             INTEGER PRIMARY KEY,
    restaurante_id INTEGER NOT NULL REFERENCES restaurantes(id),
    nome           VARCHAR(255) NOT NULL,
    unidade        VARCHAR(50)  NOT NULL DEFAULT 'un',
    criado_em      TIMESTAMP DEFAULT NOW(),
    atualizado_em  TIMESTAMP DEFAULT NOW(),
    UNIQUE(restaurante_id, nome)  -- Nome único por restaurante
);
CREATE INDEX ix_lista_mae_itens_restaurante_id ON lista_mae_itens(restaurante_id);
```

**Papel no sistema:**
- É o catálogo central de produtos do restaurante
- Um item aqui pode aparecer em N listas diferentes
- Os `Pedido`s referenciam diretamente este modelo (`lista_mae_item_id`)
- Permite consolidar pedidos de múltiplas listas para o mesmo item

**Relacionamentos:**
- `lista_refs` → [ListaItemRef] (um para muitos, lazy='dynamic')
- `pedidos` → [Pedido] (um para muitos)

---

### `lista_item_ref` ⭐ ASSOCIAÇÃO LISTA ↔ ITEM

```sql
CREATE TABLE lista_item_ref (
    lista_id              INTEGER NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
    item_id               INTEGER NOT NULL REFERENCES lista_mae_itens(id) ON DELETE CASCADE,
    quantidade_atual      FLOAT NOT NULL DEFAULT 0,
    quantidade_minima     FLOAT NOT NULL DEFAULT 1.0,
    usa_threshold         BOOLEAN NOT NULL DEFAULT FALSE,
    quantidade_por_fardo  FLOAT NOT NULL DEFAULT 1.0,
    criado_em             TIMESTAMP DEFAULT NOW(),
    atualizado_em         TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (lista_id, item_id)
);
```

**Campos explicados:**
- `quantidade_atual` — Estoque atual (atualizado pelo colaborador)
- `quantidade_minima` — Nível mínimo aceitável
- `usa_threshold` — Se TRUE, usa `quantidade_por_fardo` como unidade de pedido
- `quantidade_por_fardo` — Quantidade mínima de compra (ex: 2 caixas, 6 unidades)

**Lógica de cálculo do pedido:**
```python
def get_pedido(self) -> float:
    if self.quantidade_atual <= self.quantidade_minima:
        return self.quantidade_por_fardo  # Pedido = 1 fardo/unidade mínima
    return 0  # Não precisa pedir
```

**Exemplo:**
- Arroz: `qtd_atual=3`, `qtd_min=10`, `usa_threshold=True`, `qtd_fardo=5`
- `get_pedido()` retorna `5` (pede 5 unidades = 1 fardo)

---

### `submissoes` ⭐ CORE

```sql
CREATE TABLE submissoes (
    id              INTEGER PRIMARY KEY,
    lista_id        INTEGER NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id),
    data_submissao  TIMESTAMP NOT NULL DEFAULT NOW(),
    status          ENUM(SubmissaoStatus) NOT NULL DEFAULT 'PENDENTE',
    arquivada       BOOLEAN NOT NULL DEFAULT FALSE,
    arquivada_em    TIMESTAMP,
    total_pedidos   INTEGER NOT NULL DEFAULT 0
);
```

**Relacionamentos:**
- `lista` → Lista
- `usuario` → Usuario (quem submeteu)
- `pedidos` → [Pedido] (lazy='joined', cascade delete)

**Regras de negócio:**
- Uma submissão = um "envio" de lista pelo colaborador
- `status` é recalculado automaticamente baseado nos pedidos filhos:
  - Todos APROVADO → `APROVADO`
  - Todos REJEITADO → `REJEITADO`
  - Mix → `PARCIALMENTE_APROVADO`
  - Algum PENDENTE → `PENDENTE`
- `arquivada=True` oculta da lista padrão mas não deleta

---

### `pedidos` ⭐ CORE

```sql
CREATE TABLE pedidos (
    id                   INTEGER PRIMARY KEY,
    submissao_id         INTEGER REFERENCES submissoes(id) ON DELETE CASCADE,  -- Nullable (legado)
    lista_mae_item_id    INTEGER NOT NULL REFERENCES lista_mae_itens(id) ON DELETE CASCADE,
    fornecedor_id        INTEGER REFERENCES fornecedores(id),
    quantidade_solicitada NUMERIC(10,2) NOT NULL,
    data_pedido          TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_id           INTEGER NOT NULL REFERENCES usuarios(id),
    status               ENUM(PedidoStatus) NOT NULL DEFAULT 'PENDENTE'
);
```

**Relacionamentos:**
- `item` → ListaMaeItem (via `lista_mae_item_id`)
- `fornecedor` → Fornecedor (opcional)
- `usuario` → Usuario (quem gerou)
- `submissao` → Submissao (agrupador)

**Regras de negócio:**
- `quantidade_solicitada = max(qtd_minima - qtd_atual, 0)` calculado no momento da submissão
- `lista_mae_item_id` é a chave para consolidar pedidos de múltiplas listas no merge
- Pedidos aprovados (`APROVADO`) são usados no merge de submissões

---

### `fornecedores`

```sql
CREATE TABLE fornecedores (
    id                    INTEGER PRIMARY KEY,
    restaurante_id        INTEGER NOT NULL REFERENCES restaurantes(id),
    nome                  VARCHAR(100) NOT NULL,
    usuario_id            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    cnpj                  VARCHAR(18),
    telefone              VARCHAR(20),
    endereco              VARCHAR(400),
    cidade                VARCHAR(100),
    estado                VARCHAR(2),
    cep                   VARCHAR(10),
    site                  VARCHAR(200),
    aprovado              BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em             TIMESTAMP NOT NULL DEFAULT NOW(),
    contato               VARCHAR(100),
    meio_envio            VARCHAR(20),
    responsavel           VARCHAR(100),
    observacao            VARCHAR(600),
    compartilhado_regiao  BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ix_fornecedores_restaurante_id ON fornecedores(restaurante_id);
```

**Relacionamentos:**
- `restaurante` → Restaurante
- `usuario` → Usuario (role=SUPPLIER, opcional)
- `listas` → [Lista] (muitos para muitos via `fornecedor_lista`)
- `pedidos` → [Pedido] (um para muitos)

---

### `itens` (Legado / Catálogo de Fornecedores)

```sql
CREATE TABLE itens (
    id                 INTEGER PRIMARY KEY,
    nome               VARCHAR(100) NOT NULL UNIQUE,
    codigo_fornecedor  VARCHAR(50),
    descricao          TEXT,
    marca              VARCHAR(100),
    unidade_medida     VARCHAR(20) NOT NULL,
    preco_atual        NUMERIC(10,4),
    atualizado_em      TIMESTAMP DEFAULT NOW(),
    fornecedor_id      INTEGER NOT NULL REFERENCES fornecedores(id)
);
CREATE INDEX idx_fornecedor_nome ON itens(fornecedor_id, nome);
```

> ⚠️ **Nota**: Este modelo é legado. O catálogo principal agora usa `ListaMaeItem`. `Item` é usado para cotações.

---

### `areas`

```sql
CREATE TABLE areas (
    id   INTEGER PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);
```

---

### `estoques` (Legado)

```sql
CREATE TABLE estoques (
    id                               INTEGER PRIMARY KEY,
    item_id                          INTEGER NOT NULL REFERENCES itens(id),
    area_id                          INTEGER NOT NULL REFERENCES areas(id),
    lista_id                         INTEGER REFERENCES listas(id),
    quantidade_atual                 NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantidade_minima                NUMERIC(10,2) NOT NULL DEFAULT 0,
    pedido                           NUMERIC(10,2) DEFAULT 0,
    data_ultima_submissao            TIMESTAMP,
    usuario_ultima_submissao_id      INTEGER REFERENCES usuarios(id),
    atualizado_em                    TIMESTAMP DEFAULT NOW()
);
```

> ⚠️ **Legado**: Sistema anterior baseado em `Item` + `Area`. O novo sistema usa `ListaItemRef`.

---

## Tabelas de Associação (Many-to-Many)

### `lista_colaborador`
```sql
CREATE TABLE lista_colaborador (
    lista_id   INTEGER NOT NULL REFERENCES listas(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    PRIMARY KEY (lista_id, usuario_id)
);
```

### `fornecedor_lista`
```sql
CREATE TABLE fornecedor_lista (
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
    lista_id      INTEGER NOT NULL REFERENCES listas(id),
    criado_em     TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (fornecedor_id, lista_id)
);
```

---

## Tabelas Auxiliares

### `cotacoes`
```sql
CREATE TABLE cotacoes (
    id            INTEGER PRIMARY KEY,
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
    data_cotacao  TIMESTAMP NOT NULL DEFAULT NOW(),
    status        ENUM(CotacaoStatus) NOT NULL DEFAULT 'PENDENTE'
);
```

### `cotacao_itens`
```sql
CREATE TABLE cotacao_itens (
    id             INTEGER PRIMARY KEY,
    cotacao_id     INTEGER NOT NULL REFERENCES cotacoes(id),
    item_id        INTEGER NOT NULL REFERENCES itens(id),
    quantidade     NUMERIC(10,2) NOT NULL,
    preco_unitario NUMERIC(10,4) NOT NULL
);
```

### `notificacoes`
```sql
CREATE TABLE notificacoes (
    id             INTEGER PRIMARY KEY,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id),
    restaurante_id INTEGER REFERENCES restaurantes(id),
    tipo           ENUM(TipoNotificacao) NOT NULL,
    titulo         VARCHAR(200) NOT NULL,
    mensagem       TEXT,
    lida           BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em      TIMESTAMP DEFAULT NOW(),
    dados_extra    JSON
);
```

### `navbar_preferences`
```sql
CREATE TABLE navbar_preferences (
    id               INTEGER PRIMARY KEY,
    usuario_id       INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    categorias_estado JSON NOT NULL DEFAULT '{}',
    criado_em        TIMESTAMP DEFAULT NOW(),
    atualizado_em    TIMESTAMP DEFAULT NOW()
);
```

---

## Diagrama de Relacionamentos (Core)

```
restaurantes
    │
    ├──< usuarios (restaurante_id)
    │       │
    │       └──< submissoes (usuario_id)
    │               │
    │               └──< pedidos (submissao_id)
    │                       │
    │                       └──> lista_mae_itens (lista_mae_item_id)
    │
    ├──< listas (restaurante_id)
    │       │
    │       ├──< lista_item_ref (lista_id) >──> lista_mae_itens (item_id)
    │       │       ├── quantidade_atual
    │       │       ├── quantidade_minima
    │       │       ├── usa_threshold
    │       │       └── quantidade_por_fardo
    │       │
    │       ├──< submissoes (lista_id)
    │       │
    │       └──M-N── usuarios (via lista_colaborador)
    │
    ├──< lista_mae_itens (restaurante_id)
    │
    └──< fornecedores (restaurante_id)
            └──M-N── listas (via fornecedor_lista)
```

---

## Notas de Migração

- O sistema usa **Flask-Migrate** (Alembic) para versionamento do schema
- Comando para aplicar: `flask db upgrade`
- Comando para criar nova migração: `flask db migrate -m "descrição"`
- Em produção (Railway), as migrations rodam automaticamente no deploy
- O banco de produção é PostgreSQL — usar `postgresql://` não `postgres://`
