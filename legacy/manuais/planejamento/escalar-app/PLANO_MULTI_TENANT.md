# PLANO DE IMPLEMENTAÇÃO: SISTEMA MULTI-TENANT - LISTAKAIZEN

**Projeto:** Kaizen Lists - Sistema de Gestão de Inventário
**Objetivo:** Transformar sistema single-tenant em multi-tenant (múltiplos restaurantes)
**Branch:** `escalando-projeto`
**Data:** 2025-12-28
**Status:** Planejamento Completo - Pronto para Execução

---

## ÍNDICE

1. [Resumo Executivo](#resumo-executivo)
2. [Regras e Direcionamento](#regras-e-direcionamento)
3. [Arquitetura Multi-Tenant](#arquitetura-multi-tenant)
4. [Tabelas Auxiliares (12 tabelas)](#tabelas-auxiliares)
5. [Implementação (10 Etapas)](#implementação)
6. [Estratégia de Migração](#estratégia-de-migração)
7. [Pontos de Atenção Críticos](#pontos-de-atenção-críticos)
8. [Testes Necessários](#testes-necessários)
9. [Comandos de Execução](#comandos-de-execução)
10. [Arquivos Críticos](#arquivos-críticos)

---

## RESUMO EXECUTIVO

### Contexto Atual
O sistema Kaizen Lists gerencia inventário, pedidos e cotações para **UM único restaurante**. Todas as tabelas (Usuario, Item, Area, Fornecedor, Estoque, Lista, Pedido, Cotacao, etc.) contêm dados globais sem segmentação por tenant.

### Objetivo da Transformação
Permitir que **múltiplos restaurantes** usem o sistema, cada um com seus próprios:
- Usuários (ADMIN e COLLABORATOR por restaurante)
- Listas de compras
- Itens de inventário
- Áreas de trabalho
- Fornecedores
- Estoques
- Pedidos e Cotações
- Sugestões de itens
- Listas rápidas

### Novo Papel: SUPER_ADMIN
Usuário com acesso global que pode:
- Cadastrar novos restaurantes
- Ver estatísticas consolidadas de todos os restaurantes
- Gerenciar restaurantes (ativar/desativar)
- Promover usuários entre restaurantes

### Hierarquia de Papéis
```
SUPER_ADMIN (acesso global a todos os restaurantes)
    ↓
ADMIN (gerencia UM restaurante específico)
    ↓
COLLABORATOR (trabalha em UM restaurante específico)
```

### Restaurante Atual
O restaurante existente será migrado como **"KZN"** - todos os dados atuais serão associados a ele.

---

## REGRAS E DIRECIONAMENTO

### ⚠️ REGRA CRÍTICA: Não Modificar Tabelas Existentes
**Abordagem OBRIGATÓRIA:** Usar **APENAS tabelas auxiliares** para relacionamentos many-to-many.

❌ **NÃO FAZER:**
```python
# NÃO adicionar campo restaurante_id diretamente
class Usuario(db.Model):
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'))  # ❌ ERRADO
```

✅ **FAZER:**
```python
# Criar tabela auxiliar com chaves compostas
restaurante_usuario = db.Table('restaurante_usuario',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('usuario_id', db.Integer, db.ForeignKey('usuarios.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)
```

### Padrão de Tabelas Auxiliares
Seguir modelo existente em `fornecedor_lista` e `lista_colaborador`:
- ✅ Chaves compostas (ambas FKs como primary_key=True)
- ✅ Sem campo `id` separado
- ✅ Campo `criado_em` opcional para auditoria
- ✅ Definidas **ANTES** dos modelos que as usam

### Estratégia MVP (Mínimo Viável Funcional)
- ✅ Reaproveitar código existente ao máximo
- ✅ Um commit por etapa (10 commits no total)
- ✅ NÃO fazer push (apenas ao final ou quando solicitado)
- ✅ Implementar apenas funcionalidades essenciais primeiro
- ✅ Manter backward compatibility com tokens JWT antigos

### Commit Messages
Formato padrão:
```
feat: breve descrição da funcionalidade adicionada
refactor: breve descrição da refatoração
chore: breve descrição de tarefa de manutenção
```

Exemplo completo:
```
feat: adicionar modelo Restaurante e tabelas multi-tenant

- Criar enum SUPER_ADMIN em UserRoles
- Criar classe Restaurante com 12 relacionamentos many-to-many
- Criar 12 tabelas auxiliares seguindo padrão estabelecido
- Gerar migration para novas tabelas
```

---

## ARQUITETURA MULTI-TENANT

### Modelo de Dados

```
┌─────────────────┐
│  Restaurante    │
│  - id           │
│  - nome (KZN)   │
│  - ativo        │
│  - criado_em    │
└────────┬────────┘
         │
         │ (12 tabelas auxiliares many-to-many)
         │
         ├─── restaurante_usuario ────► Usuario
         ├─── restaurante_lista ──────► Lista
         ├─── restaurante_area ───────► Area
         ├─── restaurante_fornecedor ─► Fornecedor
         ├─── restaurante_item ───────► Item
         ├─── restaurante_estoque ────► Estoque
         ├─── restaurante_pedido ─────► Pedido
         ├─── restaurante_cotacao ────► Cotacao
         ├─── restaurante_lista_mae_item ► ListaMaeItem
         ├─── restaurante_submissao ──► Submissao
         ├─── restaurante_sugestao_item ► SugestaoItem
         └─── restaurante_lista_rapida ► ListaRapida
```

### Fluxo de Autenticação

```
1. Usuário faz login
   ↓
2. Backend valida credenciais
   ↓
3. Backend verifica role:
   - SUPER_ADMIN → JWT sem restaurante_id (acesso global)
   - ADMIN/COLLABORATOR → JWT com restaurante_id (primeiro restaurante associado)
   ↓
4. Frontend armazena token em localStorage
   ↓
5. Todas as requests incluem JWT
   ↓
6. Backend extrai restaurante_id do token
   ↓
7. Services filtram dados por restaurante_id
```

### Isolamento de Dados

**Para ADMIN/COLLABORATOR:**
- Veem apenas dados do **seu restaurante** (restaurante_id no JWT)
- Criam novos registros **associados ao seu restaurante**
- Não podem acessar dados de outros restaurantes (403 Forbidden)

**Para SUPER_ADMIN:**
- Veem dados de **todos os restaurantes**
- Podem criar novos restaurantes
- Podem gerenciar configurações globais
- Não têm restaurante_id no JWT (acesso irrestrito)

---

## TABELAS AUXILIARES

### Lista Completa (12 tabelas)

Todas seguem o mesmo padrão de chaves compostas sem id separado:

```python
# 1. restaurante_usuario
restaurante_usuario = db.Table('restaurante_usuario',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('usuario_id', db.Integer, db.ForeignKey('usuarios.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 2. restaurante_lista
restaurante_lista = db.Table('restaurante_lista',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('lista_id', db.Integer, db.ForeignKey('listas.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 3. restaurante_area
restaurante_area = db.Table('restaurante_area',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('area_id', db.Integer, db.ForeignKey('areas.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 4. restaurante_fornecedor
restaurante_fornecedor = db.Table('restaurante_fornecedor',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('fornecedor_id', db.Integer, db.ForeignKey('fornecedores.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 5. restaurante_item
restaurante_item = db.Table('restaurante_item',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('item_id', db.Integer, db.ForeignKey('itens.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 6. restaurante_estoque
restaurante_estoque = db.Table('restaurante_estoque',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('estoque_id', db.Integer, db.ForeignKey('estoques.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 7. restaurante_pedido
restaurante_pedido = db.Table('restaurante_pedido',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('pedido_id', db.Integer, db.ForeignKey('pedidos.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 8. restaurante_cotacao
restaurante_cotacao = db.Table('restaurante_cotacao',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('cotacao_id', db.Integer, db.ForeignKey('cotacoes.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 9. restaurante_lista_mae_item
restaurante_lista_mae_item = db.Table('restaurante_lista_mae_item',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('lista_mae_item_id', db.Integer, db.ForeignKey('lista_mae_itens.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 10. restaurante_submissao
restaurante_submissao = db.Table('restaurante_submissao',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('submissao_id', db.Integer, db.ForeignKey('submissoes.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 11. restaurante_sugestao_item
restaurante_sugestao_item = db.Table('restaurante_sugestao_item',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('sugestao_item_id', db.Integer, db.ForeignKey('sugestoes_itens.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)

# 12. restaurante_lista_rapida
restaurante_lista_rapida = db.Table('restaurante_lista_rapida',
    db.Column('restaurante_id', db.Integer, db.ForeignKey('restaurantes.id'), primary_key=True),
    db.Column('lista_rapida_id', db.Integer, db.ForeignKey('listas_rapidas.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now)
)
```

### Onde Definir no Código

**Arquivo:** `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/models.py`

**Posição:** Após as tabelas auxiliares existentes (`fornecedor_lista`, `lista_colaborador`) e **ANTES** da classe `Restaurante`.

**Ordem no arquivo:**
1. Imports e timezone helpers (linhas 1-17)
2. SerializerMixin (linhas 20-35)
3. Enums de roles e status (linhas 37-448)
4. **Tabelas auxiliares existentes** (linhas 93-97 e 259-262)
5. **🆕 12 novas tabelas auxiliares** ← INSERIR AQUI
6. **🆕 Classe Restaurante** ← INSERIR AQUI
7. Modelos existentes (Usuario, Item, Area, etc.)

---

## IMPLEMENTAÇÃO

### Etapas e Commits (10 etapas)

---

### 📌 ETAPA 1: Criar Modelo Restaurante e Tabelas Auxiliares

**Arquivos modificados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/models.py`

**Ações:**

1. **Adicionar `SUPER_ADMIN` ao enum `UserRoles` (linha 37):**
```python
class UserRoles(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"  # 🆕 NOVO
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"
```

2. **Criar 12 tabelas auxiliares** (após linha 262, antes dos modelos):
   - Copiar código completo da seção "Tabelas Auxiliares" acima
   - Seguir padrão estabelecido (chaves compostas, criado_em)

3. **Criar classe `Restaurante`** (após as tabelas auxiliares):
```python
class Restaurante(db.Model, SerializerMixin):
    """Modelo de Restaurante para multi-tenancy"""
    __tablename__ = "restaurantes"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now)

    # 12 relacionamentos many-to-many via tabelas auxiliares
    usuarios = db.relationship('Usuario', secondary='restaurante_usuario',
                               backref=db.backref('restaurantes', lazy='dynamic'))
    listas = db.relationship('Lista', secondary='restaurante_lista',
                             backref=db.backref('restaurantes', lazy='dynamic'))
    areas = db.relationship('Area', secondary='restaurante_area',
                            backref=db.backref('restaurantes', lazy='dynamic'))
    fornecedores = db.relationship('Fornecedor', secondary='restaurante_fornecedor',
                                   backref=db.backref('restaurantes', lazy='dynamic'))
    itens = db.relationship('Item', secondary='restaurante_item',
                            backref=db.backref('restaurantes', lazy='dynamic'))
    estoques = db.relationship('Estoque', secondary='restaurante_estoque',
                               backref=db.backref('restaurantes', lazy='dynamic'))
    pedidos = db.relationship('Pedido', secondary='restaurante_pedido',
                              backref=db.backref('restaurantes', lazy='dynamic'))
    cotacoes = db.relationship('Cotacao', secondary='restaurante_cotacao',
                               backref=db.backref('restaurantes', lazy='dynamic'))
    lista_mae_itens = db.relationship('ListaMaeItem', secondary='restaurante_lista_mae_item',
                                      backref=db.backref('restaurantes', lazy='dynamic'))
    submissoes = db.relationship('Submissao', secondary='restaurante_submissao',
                                 backref=db.backref('restaurantes', lazy='dynamic'))
    sugestoes_itens = db.relationship('SugestaoItem', secondary='restaurante_sugestao_item',
                                      backref=db.backref('restaurantes', lazy='dynamic'))
    listas_rapidas = db.relationship('ListaRapida', secondary='restaurante_lista_rapida',
                                     backref=db.backref('restaurantes', lazy='dynamic'))

    serialize_rules = ('-usuarios.restaurantes', '-listas.restaurantes',
                       '-areas.restaurantes', '-fornecedores.restaurantes')
```

4. **Gerar migration:**
```bash
cd backend
flask db migrate -m "add restaurante model and multi-tenant tables"
```

5. **Revisar migration gerada** em `backend/migrations/versions/`:
   - Verificar criação da tabela `restaurantes`
   - Verificar criação das 12 tabelas auxiliares
   - Verificar enum UserRoles atualizado com SUPER_ADMIN

6. **Aplicar migration:**
```bash
flask db upgrade
```

**Commit:**
```
feat: adicionar modelo Restaurante e tabelas multi-tenant

- Adicionar enum SUPER_ADMIN em UserRoles
- Criar classe Restaurante com 12 relacionamentos many-to-many
- Criar 12 tabelas auxiliares (restaurante_usuario, restaurante_lista, etc.)
- Seguir padrão de chaves compostas estabelecido em fornecedor_lista
- Gerar e aplicar migration para novas tabelas
```

---

### 📌 ETAPA 2: Migrar Dados Existentes para Restaurante "KZN"

**Arquivos criados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/migrate_to_multitenant.py` (NOVO)

**Código completo do script:**

```python
"""
Script de migração de dados para multi-tenancy
Associa todos os registros existentes ao restaurante "KZN"
"""
import sys
import os

# Adicionar parent directory ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kaizen_app import create_app, db
from backend.kaizen_app.models import (
    Restaurante, Usuario, Lista, Area, Fornecedor, Item, Estoque,
    Pedido, Cotacao, ListaMaeItem, Submissao, SugestaoItem, ListaRapida
)

def migrate_to_multitenant():
    """Migra dados existentes para o restaurante KZN"""
    app = create_app()

    with app.app_context():
        print("[INFO] Iniciando migração para multi-tenant...")

        # 1. Verificar se KZN já existe
        kzn = Restaurante.query.filter_by(nome="KZN").first()
        if kzn:
            print(f"[OK] Restaurante KZN já existe (ID: {kzn.id})")
        else:
            # Criar restaurante KZN
            kzn = Restaurante(nome="KZN", ativo=True)
            db.session.add(kzn)
            db.session.flush()
            print(f"[OK] Restaurante KZN criado (ID: {kzn.id})")

        # 2. Associar todos os usuários
        usuarios = Usuario.query.all()
        usuarios_adicionados = 0
        for usuario in usuarios:
            if usuario not in kzn.usuarios:
                kzn.usuarios.append(usuario)
                usuarios_adicionados += 1
        print(f"[OK] {usuarios_adicionados} usuários associados ao KZN (total: {len(usuarios)})")

        # 3. Associar todas as listas
        listas = Lista.query.all()
        listas_adicionadas = 0
        for lista in listas:
            if lista not in kzn.listas:
                kzn.listas.append(lista)
                listas_adicionadas += 1
        print(f"[OK] {listas_adicionadas} listas associadas ao KZN (total: {len(listas)})")

        # 4. Associar todas as áreas
        areas = Area.query.all()
        areas_adicionadas = 0
        for area in areas:
            if area not in kzn.areas:
                kzn.areas.append(area)
                areas_adicionadas += 1
        print(f"[OK] {areas_adicionadas} áreas associadas ao KZN (total: {len(areas)})")

        # 5. Associar todos os fornecedores
        fornecedores = Fornecedor.query.all()
        fornecedores_adicionados = 0
        for fornecedor in fornecedores:
            if fornecedor not in kzn.fornecedores:
                kzn.fornecedores.append(fornecedor)
                fornecedores_adicionados += 1
        print(f"[OK] {fornecedores_adicionados} fornecedores associados ao KZN (total: {len(fornecedores)})")

        # 6. Associar todos os itens
        itens = Item.query.all()
        itens_adicionados = 0
        for item in itens:
            if item not in kzn.itens:
                kzn.itens.append(item)
                itens_adicionados += 1
        print(f"[OK] {itens_adicionados} itens associados ao KZN (total: {len(itens)})")

        # 7. Associar todos os estoques
        estoques = Estoque.query.all()
        estoques_adicionados = 0
        for estoque in estoques:
            if estoque not in kzn.estoques:
                kzn.estoques.append(estoque)
                estoques_adicionados += 1
        print(f"[OK] {estoques_adicionados} estoques associados ao KZN (total: {len(estoques)})")

        # 8. Associar todos os pedidos
        pedidos = Pedido.query.all()
        pedidos_adicionados = 0
        for pedido in pedidos:
            if pedido not in kzn.pedidos:
                kzn.pedidos.append(pedido)
                pedidos_adicionados += 1
        print(f"[OK] {pedidos_adicionados} pedidos associados ao KZN (total: {len(pedidos)})")

        # 9. Associar todas as cotações
        cotacoes = Cotacao.query.all()
        cotacoes_adicionadas = 0
        for cotacao in cotacoes:
            if cotacao not in kzn.cotacoes:
                kzn.cotacoes.append(cotacao)
                cotacoes_adicionadas += 1
        print(f"[OK] {cotacoes_adicionadas} cotações associadas ao KZN (total: {len(cotacoes)})")

        # 10. Associar todos os itens do catálogo global
        lista_mae_itens = ListaMaeItem.query.all()
        lista_mae_adicionados = 0
        for item_mae in lista_mae_itens:
            if item_mae not in kzn.lista_mae_itens:
                kzn.lista_mae_itens.append(item_mae)
                lista_mae_adicionados += 1
        print(f"[OK] {lista_mae_adicionados} itens globais associados ao KZN (total: {len(lista_mae_itens)})")

        # 11. Associar todas as submissões
        submissoes = Submissao.query.all()
        submissoes_adicionadas = 0
        for submissao in submissoes:
            if submissao not in kzn.submissoes:
                kzn.submissoes.append(submissao)
                submissoes_adicionadas += 1
        print(f"[OK] {submissoes_adicionadas} submissões associadas ao KZN (total: {len(submissoes)})")

        # 12. Associar todas as sugestões de itens
        sugestoes = SugestaoItem.query.all()
        sugestoes_adicionadas = 0
        for sugestao in sugestoes:
            if sugestao not in kzn.sugestoes_itens:
                kzn.sugestoes_itens.append(sugestao)
                sugestoes_adicionadas += 1
        print(f"[OK] {sugestoes_adicionadas} sugestões associadas ao KZN (total: {len(sugestoes)})")

        # 13. Associar todas as listas rápidas
        listas_rapidas = ListaRapida.query.all()
        listas_rapidas_adicionadas = 0
        for lista_rapida in listas_rapidas:
            if lista_rapida not in kzn.listas_rapidas:
                kzn.listas_rapidas.append(lista_rapida)
                listas_rapidas_adicionadas += 1
        print(f"[OK] {listas_rapidas_adicionadas} listas rápidas associadas ao KZN (total: {len(listas_rapidas)})")

        # Commit final
        db.session.commit()
        print("\n[SUCESSO] Migração concluída! Todos os dados estão associados ao restaurante KZN.")
        print(f"[INFO] Restaurante ID: {kzn.id}, Nome: {kzn.nome}, Ativo: {kzn.ativo}")

if __name__ == "__main__":
    migrate_to_multitenant()
```

**Execução:**
```bash
cd /home/devos/Codigos-vscode/ListaKaizenApp
python backend/migrate_to_multitenant.py
```

**Saída esperada:**
```
[INFO] Iniciando migração para multi-tenant...
[OK] Restaurante KZN criado (ID: 1)
[OK] 5 usuários associados ao KZN (total: 5)
[OK] 3 listas associadas ao KZN (total: 3)
...
[SUCESSO] Migração concluída! Todos os dados estão associados ao restaurante KZN.
```

**Commit:**
```
chore: migrar dados existentes para restaurante KZN

- Criar script migrate_to_multitenant.py
- Associar todos os registros existentes (12 entidades) ao restaurante KZN
- Script é idempotente (pode ser executado múltiplas vezes)
- Verificar associações antes de adicionar (evita duplicatas)
```

---

### 📌 ETAPA 3: Criar Decorator `@super_admin_required()` e Helpers

**Arquivos modificados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/controllers.py`

**Ações:**

1. **Adicionar helper `get_restaurante_id_from_jwt()` após linha 30:**
```python
def get_restaurante_id_from_jwt():
    """
    Extrai restaurante_id do token JWT.
    Retorna None para SUPER_ADMIN (acesso global).

    Returns:
        int or None: ID do restaurante ou None para SUPER_ADMIN
    """
    claims = get_jwt()
    return claims.get('restaurante_id')
```

2. **Criar decorator `@super_admin_required()` após linha 90:**
```python
def super_admin_required():
    """
    Decorator para restringir acesso apenas a usuários SUPER_ADMIN.

    Verifica se o role no JWT é 'SUPER_ADMIN'.
    Retorna 403 se não for SUPER_ADMIN.
    """
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            role = claims.get('role')

            current_app.logger.info(f"[SUPER_ADMIN_CHECK] Role: {role}")

            if role != 'SUPER_ADMIN':
                current_app.logger.warning(f"[SUPER_ADMIN_CHECK] Acesso negado - Role: {role}")
                return jsonify({
                    "error": "Acesso negado. Apenas SUPER_ADMIN pode acessar este recurso."
                }), 403

            current_app.logger.info("[SUPER_ADMIN_CHECK] Acesso autorizado")
            return fn(*args, **kwargs)
        return decorator
    return wrapper
```

3. **Atualizar imports no topo do arquivo:**
```python
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt  # Garantir que get_jwt está importado
)
```

**Commit:**
```
feat: adicionar decorator super_admin_required e helpers

- Criar decorator @super_admin_required() para rotas exclusivas
- Adicionar helper get_restaurante_id_from_jwt() para extrair tenant
- Incluir logging para debug de permissões
- Seguir padrão existente de @admin_required()
```

---

### 📌 ETAPA 4: Atualizar JWT com `restaurante_id`

**Arquivos modificados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/services.py`

**Ações:**

1. **Modificar função `authenticate_user()` (linha 52-85):**

Localizar a seção de criação do token JWT e substituir por:

```python
def authenticate_user(data):
    email = data.get('email')
    senha = data.get('senha')

    if not email or not senha:
        return {"error": "Email e senha são obrigatórios."}, 400

    usuario = repositories.buscar_usuario_por_email(email)
    if not usuario or not check_password_hash(usuario.senha_hash, senha):
        return {"error": "Credenciais inválidas."}, 401

    if not usuario.aprovado:
        return {"error": "Usuário pendente de aprovação."}, 403

    if not usuario.ativo:
        return {
            "error": "Usuário desativado. Entre em contato com o administrador."
        }, 403

    # 🆕 NOVO: Determinar restaurante_id baseado no role
    restaurante_id = None
    if usuario.role != UserRoles.SUPER_ADMIN:
        # Para ADMIN e COLLABORATOR, obter primeiro restaurante associado
        restaurantes = list(usuario.restaurantes)

        if not restaurantes:
            return {
                "error": "Usuário não está associado a nenhum restaurante. Contate o administrador."
            }, 403

        # Usar o primeiro restaurante (futuro: permitir escolha)
        restaurante_id = restaurantes[0].id

    # Criar claims do JWT
    additional_claims = {
        "role": usuario.role.value,
        "nome": usuario.nome,
        "email": usuario.email
    }

    # 🆕 NOVO: Incluir restaurante_id apenas para ADMIN/COLLABORATOR
    if restaurante_id:
        additional_claims["restaurante_id"] = restaurante_id

    # Gerar token
    access_token = create_access_token(
        identity=str(usuario.id),
        additional_claims=additional_claims,
        expires_delta=timedelta(days=1)
    )

    # 🆕 NOVO: Incluir informações do restaurante na resposta
    restaurante_info = None
    if restaurante_id:
        restaurante = Restaurante.query.get(restaurante_id)
        if restaurante:
            restaurante_info = {
                "id": restaurante.id,
                "nome": restaurante.nome,
                "ativo": restaurante.ativo
            }

    return {
        "token": access_token,
        "user": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "role": usuario.role.value
        },
        "restaurante": restaurante_info  # 🆕 NOVO
    }, 200
```

2. **Adicionar import do modelo Restaurante no topo do arquivo:**
```python
from .models import (
    Usuario, Item, Area, Fornecedor, Estoque, Pedido, Cotacao,
    CotacaoItem, Lista, ListaMaeItem, ListaItemRef, NavbarPreference,
    SugestaoItem, ListaRapida, ListaRapidaItem, Submissao,
    UserRoles, PedidoStatus, CotacaoStatus, SubmissaoStatus,
    SugestaoStatus, StatusListaRapida, PrioridadeItem,
    Restaurante  # 🆕 NOVO
)
```

**Commit:**
```
feat: incluir restaurante_id no token JWT

- Modificar authenticate_user() para determinar restaurante do usuário
- SUPER_ADMIN: token sem restaurante_id (acesso global)
- ADMIN/COLLABORATOR: token com restaurante_id do primeiro restaurante
- Validar que usuário está associado a restaurante antes do login
- Incluir informações do restaurante na resposta de login
```

---

### 📌 ETAPA 5: Criar Endpoints SUPER_ADMIN

**Arquivos modificados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/controllers.py`
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/services.py`
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/__init__.py`

**Ações:**

**1. Criar novo blueprint em `controllers.py` (ao final do arquivo, antes da última linha):**

```python
# ==========================================
# SUPER ADMIN BLUEPRINT
# ==========================================

super_admin_bp = Blueprint('super_admin_bp', __name__, url_prefix='/api/super-admin')

@super_admin_bp.route('/restaurantes', methods=['GET'])
@super_admin_required()
def listar_restaurantes_route():
    """Lista todos os restaurantes (SUPER_ADMIN only)"""
    response, status = services.listar_todos_restaurantes()
    return jsonify(response), status

@super_admin_bp.route('/restaurantes', methods=['POST'])
@super_admin_required()
def criar_restaurante_route():
    """Cria novo restaurante (SUPER_ADMIN only)"""
    data = request.get_json()
    response, status = services.criar_restaurante(data)
    return jsonify(response), status

@super_admin_bp.route('/restaurantes/<int:restaurante_id>', methods=['GET'])
@super_admin_required()
def obter_restaurante_route(restaurante_id):
    """Obtém detalhes de um restaurante (SUPER_ADMIN only)"""
    response, status = services.obter_restaurante(restaurante_id)
    return jsonify(response), status

@super_admin_bp.route('/restaurantes/<int:restaurante_id>/ativar', methods=['POST'])
@super_admin_required()
def ativar_restaurante_route(restaurante_id):
    """Ativa um restaurante (SUPER_ADMIN only)"""
    response, status = services.ativar_restaurante(restaurante_id)
    return jsonify(response), status

@super_admin_bp.route('/restaurantes/<int:restaurante_id>/desativar', methods=['POST'])
@super_admin_required()
def desativar_restaurante_route(restaurante_id):
    """Desativa um restaurante (SUPER_ADMIN only)"""
    response, status = services.desativar_restaurante(restaurante_id)
    return jsonify(response), status

@super_admin_bp.route('/dashboard-global', methods=['GET'])
@super_admin_required()
def dashboard_global_route():
    """Dashboard com estatísticas de todos os restaurantes (SUPER_ADMIN only)"""
    response, status = services.obter_dashboard_super_admin()
    return jsonify(response), status
```

**2. Implementar services em `services.py` (ao final do arquivo):**

```python
# ==========================================
# SUPER ADMIN SERVICES
# ==========================================

def listar_todos_restaurantes():
    """Lista todos os restaurantes"""
    try:
        restaurantes = Restaurante.query.order_by(Restaurante.criado_em.desc()).all()
        return {
            "restaurantes": [r.to_dict() for r in restaurantes]
        }, 200
    except Exception as e:
        return {"error": f"Erro ao listar restaurantes: {str(e)}"}, 500

def criar_restaurante(data):
    """Cria novo restaurante"""
    try:
        nome = data.get('nome')

        if not nome:
            return {"error": "Nome do restaurante é obrigatório."}, 400

        # Verificar se já existe
        existente = Restaurante.query.filter_by(nome=nome).first()
        if existente:
            return {"error": f"Restaurante '{nome}' já existe."}, 400

        # Criar restaurante
        restaurante = Restaurante(nome=nome, ativo=True)
        db.session.add(restaurante)
        db.session.commit()

        return {
            "message": f"Restaurante '{nome}' criado com sucesso.",
            "restaurante": restaurante.to_dict()
        }, 201
    except Exception as e:
        db.session.rollback()
        return {"error": f"Erro ao criar restaurante: {str(e)}"}, 500

def obter_restaurante(restaurante_id):
    """Obtém detalhes de um restaurante com estatísticas"""
    try:
        restaurante = Restaurante.query.get(restaurante_id)
        if not restaurante:
            return {"error": "Restaurante não encontrado."}, 404

        # Calcular estatísticas
        stats = {
            "restaurante": restaurante.to_dict(),
            "total_usuarios": len(list(restaurante.usuarios)),
            "total_listas": len(list(restaurante.listas)),
            "total_areas": len(list(restaurante.areas)),
            "total_fornecedores": len(list(restaurante.fornecedores)),
            "total_itens": len(list(restaurante.itens)),
            "total_pedidos_pendentes": sum(
                1 for p in restaurante.pedidos if p.status == PedidoStatus.PENDENTE
            ),
            "total_cotacoes_pendentes": sum(
                1 for c in restaurante.cotacoes if c.status == CotacaoStatus.PENDENTE
            )
        }

        return stats, 200
    except Exception as e:
        return {"error": f"Erro ao obter restaurante: {str(e)}"}, 500

def ativar_restaurante(restaurante_id):
    """Ativa um restaurante"""
    try:
        restaurante = Restaurante.query.get(restaurante_id)
        if not restaurante:
            return {"error": "Restaurante não encontrado."}, 404

        if restaurante.ativo:
            return {"message": f"Restaurante '{restaurante.nome}' já está ativo."}, 200

        restaurante.ativo = True
        db.session.commit()

        return {
            "message": f"Restaurante '{restaurante.nome}' ativado com sucesso.",
            "restaurante": restaurante.to_dict()
        }, 200
    except Exception as e:
        db.session.rollback()
        return {"error": f"Erro ao ativar restaurante: {str(e)}"}, 500

def desativar_restaurante(restaurante_id):
    """Desativa um restaurante"""
    try:
        restaurante = Restaurante.query.get(restaurante_id)
        if not restaurante:
            return {"error": "Restaurante não encontrado."}, 404

        if not restaurante.ativo:
            return {"message": f"Restaurante '{restaurante.nome}' já está desativado."}, 200

        restaurante.ativo = False
        db.session.commit()

        return {
            "message": f"Restaurante '{restaurante.nome}' desativado com sucesso.",
            "restaurante": restaurante.to_dict()
        }, 200
    except Exception as e:
        db.session.rollback()
        return {"error": f"Erro ao desativar restaurante: {str(e)}"}, 500

def obter_dashboard_super_admin():
    """Dashboard com estatísticas consolidadas de todos os restaurantes"""
    try:
        restaurantes = Restaurante.query.order_by(Restaurante.nome).all()

        stats_por_restaurante = []
        totais_globais = {
            "total_restaurantes": len(restaurantes),
            "total_restaurantes_ativos": 0,
            "total_usuarios": 0,
            "total_listas": 0,
            "total_pedidos_pendentes": 0,
            "total_cotacoes_pendentes": 0
        }

        for r in restaurantes:
            if r.ativo:
                totais_globais["total_restaurantes_ativos"] += 1

            usuarios = len(list(r.usuarios))
            listas = len(list(r.listas))
            pedidos_pendentes = sum(1 for p in r.pedidos if p.status == PedidoStatus.PENDENTE)
            cotacoes_pendentes = sum(1 for c in r.cotacoes if c.status == CotacaoStatus.PENDENTE)

            totais_globais["total_usuarios"] += usuarios
            totais_globais["total_listas"] += listas
            totais_globais["total_pedidos_pendentes"] += pedidos_pendentes
            totais_globais["total_cotacoes_pendentes"] += cotacoes_pendentes

            stats_por_restaurante.append({
                "restaurante": r.to_dict(),
                "total_usuarios": usuarios,
                "total_listas": listas,
                "total_areas": len(list(r.areas)),
                "total_fornecedores": len(list(r.fornecedores)),
                "total_itens": len(list(r.itens)),
                "total_pedidos_pendentes": pedidos_pendentes,
                "total_cotacoes_pendentes": cotacoes_pendentes
            })

        return {
            "totais_globais": totais_globais,
            "restaurantes": stats_por_restaurante
        }, 200
    except Exception as e:
        return {"error": f"Erro ao obter dashboard: {str(e)}"}, 500
```

**3. Registrar blueprint em `__init__.py` (após linha 192):**

```python
from .controllers import auth_bp, admin_bp, api_bp, collaborator_bp, super_admin_bp  # Adicionar super_admin_bp

# Registrar blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(api_bp)
app.register_blueprint(collaborator_bp)
app.register_blueprint(super_admin_bp)  # 🆕 NOVO
```

**Commit:**
```
feat: adicionar endpoints SUPER_ADMIN para gerenciar restaurantes

- Criar blueprint super_admin_bp com prefixo /api/super-admin
- Implementar CRUD de restaurantes (criar, listar, ativar, desativar)
- Adicionar endpoint /dashboard-global com estatísticas consolidadas
- Proteger todas as rotas com @super_admin_required()
- Registrar blueprint na aplicação
```

---

### 📌 ETAPA 6: Filtrar Services por Restaurante

**Arquivos modificados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/services.py`
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/controllers.py`

**Ações:**

**Padrão de Modificação:**

Para cada service que retorna listas de dados (get_all_X), adicionar parâmetro `restaurante_id=None` e implementar filtro:

```python
# ANTES
def get_all_users():
    users = Usuario.query.all()
    return [user.to_dict() for user in users], 200

# DEPOIS
def get_all_users(restaurante_id=None):
    if restaurante_id:
        restaurante = Restaurante.query.get(restaurante_id)
        if not restaurante:
            return {"error": "Restaurante não encontrado."}, 404
        users = list(restaurante.usuarios)
    else:
        # SUPER_ADMIN sem filtro
        users = Usuario.query.all()

    return [user.to_dict() for user in users], 200
```

**Services a Modificar (15+ funções):**

1. **Usuários:**
   - `get_all_users(restaurante_id=None)`
   - `create_user_by_admin(data, restaurante_id)` - associar ao restaurante

2. **Listas:**
   - `get_all_listas(restaurante_id=None)`
   - `create_lista(data, restaurante_id)` - associar ao restaurante

3. **Áreas:**
   - `get_all_areas(restaurante_id=None)`
   - `create_area(data, restaurante_id)` - associar ao restaurante

4. **Fornecedores:**
   - `get_all_fornecedores(restaurante_id=None)`
   - `create_fornecedor(data, restaurante_id)` - associar ao restaurante

5. **Itens:**
   - `get_all_items(restaurante_id=None)`
   - `create_item(data, restaurante_id)` - associar ao restaurante

6. **Pedidos:**
   - `get_all_pedidos(restaurante_id=None, status_filter=None)`

7. **Cotações:**
   - `get_all_cotacoes(restaurante_id=None)`
   - `create_cotacao(data, restaurante_id)` - associar ao restaurante

8. **Submissões:**
   - `get_all_submissoes(restaurante_id=None, status_filter=None)`

9. **ListaMaeItem:**
   - `get_all_lista_mae_itens(restaurante_id=None)`
   - `create_lista_mae_item(data, restaurante_id)` - associar ao restaurante

10. **Sugestões:**
    - `get_all_sugestoes(restaurante_id=None, status_filter=None)`

11. **Listas Rápidas:**
    - `get_all_listas_rapidas(restaurante_id=None, status_filter=None)`

**Exemplo de Implementação Completa (get_all_listas):**

```python
def get_all_listas(restaurante_id=None):
    """
    Lista todas as listas.
    Se restaurante_id for fornecido, filtra por restaurante.
    """
    try:
        if restaurante_id:
            restaurante = Restaurante.query.get(restaurante_id)
            if not restaurante:
                return {"error": "Restaurante não encontrado."}, 404
            listas = list(restaurante.listas.filter_by(deletado=False))
        else:
            # SUPER_ADMIN vê todas
            listas = Lista.query.filter_by(deletado=False).all()

        return [lista.to_dict() for lista in listas], 200
    except Exception as e:
        return {"error": f"Erro ao listar listas: {str(e)}"}, 500
```

**Exemplo de Criação com Associação (create_lista):**

```python
def create_lista(data, restaurante_id):
    """
    Cria nova lista e associa ao restaurante.
    """
    try:
        nome = data.get('nome')
        descricao = data.get('descricao')

        if not nome:
            return {"error": "Nome da lista é obrigatório."}, 400

        # Verificar duplicata no restaurante
        if restaurante_id:
            restaurante = Restaurante.query.get(restaurante_id)
            if not restaurante:
                return {"error": "Restaurante não encontrado."}, 404

            # Verificar se lista com mesmo nome já existe no restaurante
            if any(l.nome == nome for l in restaurante.listas):
                return {"error": f"Lista '{nome}' já existe neste restaurante."}, 400

        # Criar lista
        lista = Lista(nome=nome, descricao=descricao)
        db.session.add(lista)
        db.session.flush()

        # Associar ao restaurante
        if restaurante_id:
            restaurante.listas.append(lista)

        db.session.commit()

        return {
            "message": f"Lista '{nome}' criada com sucesso.",
            "lista": lista.to_dict()
        }, 201
    except Exception as e:
        db.session.rollback()
        return {"error": f"Erro ao criar lista: {str(e)}"}, 500
```

**Modificar Controllers para Passar `restaurante_id`:**

```python
# Em admin_bp e api_bp
@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_users_route():
    restaurante_id = get_restaurante_id_from_jwt()

    # Fallback para tokens antigos (backward compatibility)
    if not restaurante_id:
        user_id = get_user_id_from_jwt()
        usuario = Usuario.query.get(user_id)
        if usuario and usuario.role != UserRoles.SUPER_ADMIN:
            restaurantes = list(usuario.restaurantes)
            if restaurantes:
                restaurante_id = restaurantes[0].id

    users, status = services.get_all_users(restaurante_id)
    return jsonify(users), status

@admin_bp.route('/listas', methods=['POST'])
@admin_required()
def create_lista_route():
    data = request.get_json()
    restaurante_id = get_restaurante_id_from_jwt()

    # Fallback para tokens antigos
    if not restaurante_id:
        user_id = get_user_id_from_jwt()
        usuario = Usuario.query.get(user_id)
        if usuario and usuario.role != UserRoles.SUPER_ADMIN:
            restaurantes = list(usuario.restaurantes)
            if restaurantes:
                restaurante_id = restaurantes[0].id

    response, status = services.create_lista(data, restaurante_id)
    return jsonify(response), status
```

**Commit:**
```
refactor: adicionar filtro por restaurante em services

- Modificar 15+ funções get_all_X para aceitar restaurante_id opcional
- SUPER_ADMIN (restaurante_id=None): vê todos os dados
- ADMIN/COLLABORATOR: vê apenas dados do seu restaurante
- Funções de criação (create_X) agora associam ao restaurante
- Atualizar controllers para extrair e passar restaurante_id
- Implementar fallback para tokens antigos (backward compatibility)
```

---

### 📌 ETAPA 7: Script de Promoção SUPER_ADMIN

**Arquivos criados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/promote_super_admin.py` (NOVO)

**Código completo:**

```python
"""
Script para promover um usuário existente a SUPER_ADMIN
Uso: python backend/promote_super_admin.py <email>
"""
import sys
import os

# Adicionar parent directory ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kaizen_app import create_app, db
from backend.kaizen_app.models import Usuario, UserRoles

def promote_to_super_admin(email):
    """Promove usuário a SUPER_ADMIN"""
    app = create_app()

    with app.app_context():
        usuario = Usuario.query.filter_by(email=email).first()

        if not usuario:
            print(f"[ERRO] Usuário com email '{email}' não encontrado.")
            return False

        if usuario.role == UserRoles.SUPER_ADMIN:
            print(f"[INFO] Usuário '{usuario.nome}' já é SUPER_ADMIN.")
            return True

        role_anterior = usuario.role.value
        usuario.role = UserRoles.SUPER_ADMIN
        db.session.commit()

        print(f"[OK] Usuário '{usuario.nome}' promovido de {role_anterior} para SUPER_ADMIN.")
        print(f"[INFO] ID: {usuario.id}, Email: {usuario.email}")
        print(f"[ATENÇÃO] Usuário deve fazer logout e login novamente para obter novo token JWT.")

        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python backend/promote_super_admin.py <email>")
        print("Exemplo: python backend/promote_super_admin.py admin@kaizen.com")
        sys.exit(1)

    email = sys.argv[1]
    success = promote_to_super_admin(email)
    sys.exit(0 if success else 1)
```

**Execução:**
```bash
cd /home/devos/Codigos-vscode/ListaKaizenApp
python backend/promote_super_admin.py admin@kaizen.com
```

**Saída esperada:**
```
[OK] Usuário 'Admin Kaizen' promovido de ADMIN para SUPER_ADMIN.
[INFO] ID: 1, Email: admin@kaizen.com
[ATENÇÃO] Usuário deve fazer logout e login novamente para obter novo token JWT.
```

**Commit:**
```
feat: adicionar script para promover SUPER_ADMIN

- Criar promote_super_admin.py para promoção via linha de comando
- Aceitar email como argumento
- Validar existência do usuário antes de promover
- Exibir informações claras sobre a promoção
- Avisar sobre necessidade de logout/login
```

---

### 📌 ETAPA 8: Frontend - SuperAdminRoute Guard

**Arquivos criados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/components/SuperAdminRoute.tsx` (NOVO)

**Código completo:**

```typescript
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * SuperAdminRoute - Componente de proteção de rotas para SUPER_ADMIN
 *
 * Restringe acesso apenas a usuários com role SUPER_ADMIN.
 * Redireciona para login se não autenticado.
 * Redireciona para home se não for SUPER_ADMIN.
 */
const SuperAdminRoute: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();

  // Aguardar verificação de autenticação
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner />
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se é SUPER_ADMIN
  if (user?.role !== 'SUPER_ADMIN') {
    console.warn('[SuperAdminRoute] Acesso negado - Role:', user?.role);
    return <Navigate to="/" replace />;
  }

  // Renderizar rotas filhas se autorizado
  return <Outlet />;
};

export default SuperAdminRoute;
```

**Commit:**
```
feat: adicionar SuperAdminRoute guard

- Criar componente de proteção de rotas para SUPER_ADMIN
- Seguir padrão de AdminRoute e CollaboratorRoute
- Redirecionar para login se não autenticado
- Redirecionar para home se não for SUPER_ADMIN
- Incluir loading state e logging
```

---

### 📌 ETAPA 9: Frontend - Rotas e Dashboard SUPER_ADMIN

**Arquivos criados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/super-admin/SuperAdminDashboard.tsx` (NOVO)
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/super-admin/GerenciarRestaurantes.tsx` (NOVO)

**Arquivos modificados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/App.tsx`

**1. SuperAdminDashboard.tsx:**

```typescript
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';
import './SuperAdminDashboard.css';

interface RestauranteStats {
  restaurante: {
    id: number;
    nome: string;
    ativo: boolean;
    criado_em: string;
  };
  total_usuarios: number;
  total_listas: number;
  total_areas: number;
  total_fornecedores: number;
  total_itens: number;
  total_pedidos_pendentes: number;
  total_cotacoes_pendentes: number;
}

interface DashboardData {
  totais_globais: {
    total_restaurantes: number;
    total_restaurantes_ativos: number;
    total_usuarios: number;
    total_listas: number;
    total_pedidos_pendentes: number;
    total_cotacoes_pendentes: number;
  };
  restaurantes: RestauranteStats[];
}

const SuperAdminDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/super-admin/dashboard-global');
      setDashboard(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.response?.data?.error || 'Erro ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="super-admin-dashboard mt-4">
      <h1 className="mb-4">
        <i className="fas fa-crown me-2"></i>
        Dashboard Super Admin
      </h1>

      {/* Cards de Totais Globais */}
      <Row className="mb-4">
        <Col md={4} lg={2}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-icon">
                <i className="fas fa-building"></i>
              </div>
              <h5>Restaurantes</h5>
              <h2>{dashboard?.totais_globais.total_restaurantes || 0}</h2>
              <small className="text-muted">
                {dashboard?.totais_globais.total_restaurantes_ativos || 0} ativos
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} lg={2}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-icon">
                <i className="fas fa-users"></i>
              </div>
              <h5>Usuários</h5>
              <h2>{dashboard?.totais_globais.total_usuarios || 0}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} lg={2}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-icon">
                <i className="fas fa-list"></i>
              </div>
              <h5>Listas</h5>
              <h2>{dashboard?.totais_globais.total_listas || 0}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-icon warning">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <h5>Pedidos Pendentes</h5>
              <h2>{dashboard?.totais_globais.total_pedidos_pendentes || 0}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="stats-icon info">
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <h5>Cotações Pendentes</h5>
              <h2>{dashboard?.totais_globais.total_cotacoes_pendentes || 0}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabela de Restaurantes */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-chart-bar me-2"></i>
            Estatísticas por Restaurante
          </h5>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Restaurante</th>
                <th>Status</th>
                <th className="text-center">Usuários</th>
                <th className="text-center">Listas</th>
                <th className="text-center">Áreas</th>
                <th className="text-center">Fornecedores</th>
                <th className="text-center">Itens</th>
                <th className="text-center">Pedidos Pendentes</th>
                <th className="text-center">Cotações Pendentes</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.restaurantes.map((stats) => (
                <tr key={stats.restaurante.id}>
                  <td>
                    <strong>{stats.restaurante.nome}</strong>
                  </td>
                  <td>
                    {stats.restaurante.ativo ? (
                      <span className="badge bg-success">Ativo</span>
                    ) : (
                      <span className="badge bg-secondary">Inativo</span>
                    )}
                  </td>
                  <td className="text-center">{stats.total_usuarios}</td>
                  <td className="text-center">{stats.total_listas}</td>
                  <td className="text-center">{stats.total_areas}</td>
                  <td className="text-center">{stats.total_fornecedores}</td>
                  <td className="text-center">{stats.total_itens}</td>
                  <td className="text-center">
                    {stats.total_pedidos_pendentes > 0 ? (
                      <span className="badge bg-warning text-dark">
                        {stats.total_pedidos_pendentes}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="text-center">
                    {stats.total_cotacoes_pendentes > 0 ? (
                      <span className="badge bg-info">
                        {stats.total_cotacoes_pendentes}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SuperAdminDashboard;
```

**2. SuperAdminDashboard.css:**

```css
.super-admin-dashboard .stats-card {
  transition: transform 0.2s;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.super-admin-dashboard .stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.super-admin-dashboard .stats-icon {
  font-size: 2rem;
  color: #007bff;
  margin-bottom: 0.5rem;
}

.super-admin-dashboard .stats-icon.warning {
  color: #ffc107;
}

.super-admin-dashboard .stats-icon.info {
  color: #17a2b8;
}

.super-admin-dashboard h5 {
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.super-admin-dashboard h2 {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0;
}
```

**3. GerenciarRestaurantes.tsx:**

```typescript
import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Modal, Form,
  Spinner, Alert
} from 'react-bootstrap';
import api from '../../services/api';

interface Restaurante {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

const GerenciarRestaurantes: React.FC = () => {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal de criação
  const [showModal, setShowModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRestaurantes();
  }, []);

  const fetchRestaurantes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/super-admin/restaurantes');
      setRestaurantes(response.data.restaurantes);
    } catch (err: any) {
      console.error('Erro ao listar restaurantes:', err);
      setError(err.response?.data?.error || 'Erro ao listar restaurantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCriar = async () => {
    if (!novoNome.trim()) {
      setError('Nome do restaurante é obrigatório.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.post('/api/super-admin/restaurantes', { nome: novoNome });
      setSuccess(`Restaurante "${novoNome}" criado com sucesso!`);
      setShowModal(false);
      setNovoNome('');
      fetchRestaurantes();
    } catch (err: any) {
      console.error('Erro ao criar restaurante:', err);
      setError(err.response?.data?.error || 'Erro ao criar restaurante.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAtivo = async (id: number, ativoAtual: boolean) => {
    const endpoint = ativoAtual
      ? `/api/super-admin/restaurantes/${id}/desativar`
      : `/api/super-admin/restaurantes/${id}/ativar`;

    try {
      setError('');
      const response = await api.post(endpoint);
      setSuccess(response.data.message);
      fetchRestaurantes();
    } catch (err: any) {
      console.error('Erro ao alterar status:', err);
      setError(err.response?.data?.error || 'Erro ao alterar status do restaurante.');
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h1>
            <i className="fas fa-building me-2"></i>
            Gerenciar Restaurantes
          </h1>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus me-2"></i>
            Novo Restaurante
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Card>
        <Card.Header>
          <h5 className="mb-0">Lista de Restaurantes</h5>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Data de Criação</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {restaurantes.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><strong>{r.nome}</strong></td>
                  <td>
                    {r.ativo ? (
                      <span className="badge bg-success">Ativo</span>
                    ) : (
                      <span className="badge bg-secondary">Inativo</span>
                    )}
                  </td>
                  <td>{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td className="text-center">
                    <Button
                      variant={r.ativo ? 'warning' : 'success'}
                      size="sm"
                      onClick={() => handleToggleAtivo(r.id, r.ativo)}
                    >
                      {r.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal de Criação */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Novo Restaurante</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nome do Restaurante</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex: KZN"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                autoFocus
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCriar} disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GerenciarRestaurantes;
```

**4. Modificar App.tsx (adicionar rotas):**

```typescript
// Adicionar import
import SuperAdminRoute from './components/SuperAdminRoute';
import SuperAdminDashboard from './features/super-admin/SuperAdminDashboard';
import GerenciarRestaurantes from './features/super-admin/GerenciarRestaurantes';

// Dentro de <Routes>, adicionar ANTES das rotas admin:
{/* Rotas Super Admin */}
<Route element={<Layout />}>
  <Route path="/super-admin" element={<SuperAdminRoute />}>
    <Route index element={<SuperAdminDashboard />} />
    <Route path="restaurantes" element={<GerenciarRestaurantes />} />
  </Route>
</Route>
```

**Commit:**
```
feat: adicionar rotas e dashboards SUPER_ADMIN

- Criar SuperAdminDashboard com estatísticas consolidadas
- Criar GerenciarRestaurantes com CRUD de restaurantes
- Adicionar rotas /super-admin e /super-admin/restaurantes
- Implementar cards de totais globais
- Implementar tabela de estatísticas por restaurante
- Incluir modal de criação de restaurante
- Adicionar toggle ativar/desativar restaurante
```

---

### 📌 ETAPA 10: Frontend - Atualizar Menu Layout

**Arquivos modificados:**
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/components/Layout.tsx`

**Ações:**

1. **Adicionar menu para SUPER_ADMIN (após linha 105):**

```typescript
// Menu do Super Admin
const superAdminMenuGroups: MenuGroup[] = [
  {
    title: 'SUPER ADMIN',
    items: [
      {
        path: '/super-admin',
        icon: 'fa-crown',
        label: 'Dashboard Super Admin',
        ariaLabel: 'Dashboard Super Admin'
      },
      {
        path: '/super-admin/restaurantes',
        icon: 'fa-building',
        label: 'Gerenciar Restaurantes',
        ariaLabel: 'Gerenciar Restaurantes'
      }
    ]
  },
  {
    title: 'PERFIL',
    items: [
      {
        path: '/logout',
        icon: 'fa-sign-out-alt',
        label: 'Sair',
        ariaLabel: 'Sair do sistema'
      }
    ]
  }
];
```

2. **Modificar seleção de menu (linha 108):**

```typescript
// Determinar qual menu usar baseado no role
const menuGroups: MenuGroup[] =
  user?.role === 'SUPER_ADMIN' ? superAdminMenuGroups :
  user?.role === 'ADMIN' ? adminMenuGroups :
  collaboratorMenuGroups;
```

**Commit:**
```
feat: adicionar menu SUPER_ADMIN no Layout

- Criar superAdminMenuGroups com itens de navegação
- Dashboard Super Admin e Gerenciar Restaurantes
- Modificar lógica de seleção de menu para incluir SUPER_ADMIN
- Usar ícone fa-crown para identificação visual
- Manter consistência com menus existentes
```

---

## ESTRATÉGIA DE MIGRAÇÃO

### Quando Executar
Após **ETAPA 1** (migration aplicada), executar **ETAPA 2** (script de migração).

### Ordem de Associação
1. Criar restaurante "KZN"
2. Associar 12 entidades na ordem:
   - Usuários
   - Listas
   - Áreas
   - Fornecedores
   - Itens
   - Estoques
   - Pedidos
   - Cotações
   - Catálogo Global (ListaMaeItem)
   - Submissões
   - Sugestões de Itens
   - Listas Rápidas

### Idempotência
Script é **idempotente** - pode ser executado múltiplas vezes sem duplicar dados:
- Verifica se KZN existe antes de criar
- Verifica se relação existe (`if obj not in restaurante.entidades`) antes de adicionar

### Rollback
Se necessário reverter:
```bash
flask db downgrade  # Volta migration
```

---

## PONTOS DE ATENÇÃO CRÍTICOS

### 1. Backward Compatibility JWT

**Problema:**
Tokens JWT emitidos **antes** da ETAPA 4 não contêm `restaurante_id`.

**Solução:**
Implementar fallback nos controllers:

```python
restaurante_id = get_restaurante_id_from_jwt()

# Fallback para tokens antigos
if not restaurante_id:
    user_id = get_user_id_from_jwt()
    usuario = Usuario.query.get(user_id)
    if usuario and usuario.role != UserRoles.SUPER_ADMIN:
        restaurantes = list(usuario.restaurantes)
        if restaurantes:
            restaurante_id = restaurantes[0].id
```

**Impacto:**
Usuários com tokens antigos continuam funcionando, mas devem fazer **logout/login** para obter novo token com `restaurante_id`.

---

### 2. Como Funciona o Login?

**Fluxo Completo:**

1. Usuário envia email/senha → `/api/auth/login`
2. Backend valida credenciais
3. Backend determina `restaurante_id`:
   - **SUPER_ADMIN:** `restaurante_id = None` (acesso global)
   - **ADMIN/COLLABORATOR:** `restaurante_id = primeiro_restaurante.id`
4. Backend valida que ADMIN/COLLABORATOR está associado a pelo menos 1 restaurante
5. JWT é criado:
   - `sub`: user_id
   - `role`: "SUPER_ADMIN" | "ADMIN" | "COLLABORATOR"
   - `restaurante_id`: int ou ausente (para SUPER_ADMIN)
6. Frontend armazena token em localStorage
7. Todas as requests incluem JWT via interceptor (services/api.ts:37)
8. Backend extrai `restaurante_id` do token em cada request
9. Services filtram dados por `restaurante_id`

**Para SUPER_ADMIN:**
Token **NÃO** contém `restaurante_id` → Acesso global a todos os restaurantes.

**Para ADMIN/COLLABORATOR:**
Token **CONTÉM** `restaurante_id` fixo → Usuário trabalha em um restaurante por sessão.

---

### 3. Isolamento de Dados Entre Restaurantes

**Garantias de Segurança:**

1. **Todos os endpoints ADMIN/COLLABORATOR filtram por `restaurante_id`:**
   ```python
   if restaurante_id:
       restaurante = Restaurante.query.get(restaurante_id)
       usuarios = list(restaurante.usuarios)
   ```

2. **Queries usam relacionamento many-to-many:**
   - Não é possível acessar dados de outro restaurante diretamente
   - SQLAlchemy gerencia as tabelas auxiliares automaticamente

3. **Criação sempre associa ao restaurante:**
   ```python
   restaurante.listas.append(nova_lista)
   ```

4. **Validação de segurança ao editar/deletar:**
   ```python
   pedido = Pedido.query.get(pedido_id)
   if restaurante_id:
       restaurante = Restaurante.query.get(restaurante_id)
       if pedido not in restaurante.pedidos:
           return {"error": "Acesso negado"}, 403
   ```

**Testes de Isolamento:**
Ver seção "Testes Necessários" abaixo.

---

### 4. Performance

**Considerações:**

- Relacionamentos many-to-many via tabelas auxiliares são **eficientes** no SQLAlchemy
- Usar `lazy='dynamic'` em backrefs permite queries filtradas
- Considerar eager loading com `joinedload()` para reduzir N+1 queries

**Otimizações Futuras:**

1. Criar índices nas tabelas auxiliares:
```python
# Migration futura
op.create_index('idx_restaurante_usuario_restaurante', 'restaurante_usuario', ['restaurante_id'])
op.create_index('idx_restaurante_usuario_usuario', 'restaurante_usuario', ['usuario_id'])
```

2. Cache de restaurante do usuário (evitar queries repetidas):
```python
@lru_cache(maxsize=128)
def get_user_restaurante(user_id):
    usuario = Usuario.query.get(user_id)
    return list(usuario.restaurantes)[0].id if usuario.restaurantes else None
```

---

### 5. Migração de Dados

**Checklist Pós-Migração:**

- [ ] Restaurante "KZN" criado?
- [ ] Todos os usuários associados?
- [ ] Todas as listas associadas?
- [ ] Todas as 12 entidades associadas?
- [ ] Verificar integridade no banco:
```sql
SELECT COUNT(*) FROM restaurante_usuario;  -- Deve ter N registros (N = total de usuários)
SELECT COUNT(*) FROM restaurantes WHERE nome = 'KZN';  -- Deve ser 1
```

---

## TESTES NECESSÁRIOS

### Backend (pytest)

**Arquivo:** `/home/devos/Codigos-vscode/ListaKaizenApp/backend/tests/test_multi_tenant.py` (NOVO)

```python
def test_criar_restaurante_super_admin(client, super_admin_token):
    """SUPER_ADMIN pode criar restaurantes"""
    response = client.post(
        '/api/super-admin/restaurantes',
        json={'nome': 'Novo Restaurante'},
        headers={'Authorization': f'Bearer {super_admin_token}'}
    )
    assert response.status_code == 201
    assert 'restaurante' in response.json

def test_admin_nao_pode_criar_restaurante(client, admin_token):
    """ADMIN não pode criar restaurantes"""
    response = client.post(
        '/api/super-admin/restaurantes',
        json={'nome': 'Tentativa'},
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert response.status_code == 403

def test_isolamento_usuarios(client, admin_kzn_token, admin_outro_token):
    """ADMIN de restaurante A não vê usuários do restaurante B"""
    response = client.get(
        '/api/admin/users',
        headers={'Authorization': f'Bearer {admin_kzn_token}'}
    )
    usuarios_kzn = response.json

    # Verificar que apenas usuários do KZN são retornados
    for usuario in usuarios_kzn:
        assert usuario['restaurante_id'] == 1  # KZN

def test_super_admin_ve_tudo(client, super_admin_token):
    """SUPER_ADMIN vê usuários de todos os restaurantes"""
    response = client.get(
        '/api/admin/users',  # Sem filtro de restaurante
        headers={'Authorization': f'Bearer {super_admin_token}'}
    )
    assert response.status_code == 200
    # Deve retornar usuários de múltiplos restaurantes

def test_login_sem_restaurante(client):
    """ADMIN sem restaurante associado retorna 403"""
    # Criar usuário ADMIN sem associação a restaurante
    response = client.post(
        '/api/auth/login',
        json={'email': 'admin_sem_rest@test.com', 'senha': 'senha123'}
    )
    assert response.status_code == 403
    assert 'não está associado' in response.json['error']

def test_jwt_com_restaurante_id(client, admin_kzn_credentials):
    """Token JWT de ADMIN contém restaurante_id"""
    response = client.post('/api/auth/login', json=admin_kzn_credentials)
    token = response.json['token']

    # Decodificar JWT
    claims = decode_token(token)
    assert 'restaurante_id' in claims
    assert claims['restaurante_id'] == 1  # KZN

def test_jwt_super_admin_sem_restaurante_id(client, super_admin_credentials):
    """Token JWT de SUPER_ADMIN NÃO contém restaurante_id"""
    response = client.post('/api/auth/login', json=super_admin_credentials)
    token = response.json['token']

    claims = decode_token(token)
    assert 'restaurante_id' not in claims

def test_backward_compatibility_jwt(client, old_token):
    """Token antigo (sem restaurante_id) ainda funciona"""
    response = client.get(
        '/api/admin/users',
        headers={'Authorization': f'Bearer {old_token}'}
    )
    # Não deve retornar erro, deve usar fallback
    assert response.status_code == 200
```

---

### Frontend (Jest + React Testing Library)

**Arquivo:** `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/components/__tests__/SuperAdminRoute.test.tsx` (NOVO)

```typescript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SuperAdminRoute from '../SuperAdminRoute';
import { AuthContext } from '../../context/AuthContext';

test('SuperAdminRoute redireciona ADMIN para home', () => {
  const mockAuthValue = {
    isAuthenticated: true,
    user: { id: '1', role: 'ADMIN', nome: 'Admin', email: 'admin@test.com' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  };

  render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <SuperAdminRoute />
      </AuthContext.Provider>
    </BrowserRouter>
  );

  // Deve redirecionar para home (não renderizar conteúdo)
  expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
});

test('SuperAdminRoute permite SUPER_ADMIN', () => {
  const mockAuthValue = {
    isAuthenticated: true,
    user: { id: '1', role: 'SUPER_ADMIN', nome: 'Super', email: 'super@test.com' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  };

  render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <SuperAdminRoute>
          <div>Conteúdo Super Admin</div>
        </SuperAdminRoute>
      </AuthContext.Provider>
    </BrowserRouter>
  );

  // Deve renderizar conteúdo
  expect(screen.getByText('Conteúdo Super Admin')).toBeInTheDocument();
});
```

---

## COMANDOS DE EXECUÇÃO

### Backend

```bash
# Navegar para backend
cd /home/devos/Codigos-vscode/ListaKaizenApp/backend

# Ativar ambiente virtual
source ../.venv/bin/activate  # Linux/macOS
# OU
..\.venv\Scripts\activate  # Windows

# ETAPA 1: Gerar e aplicar migration
flask db migrate -m "add restaurante model and multi-tenant tables"
flask db upgrade

# ETAPA 2: Migrar dados para KZN
cd ..
python backend/migrate_to_multitenant.py

# ETAPA 7: Promover SUPER_ADMIN
python backend/promote_super_admin.py admin@kaizen.com

# Rodar backend
cd backend
flask run --host=0.0.0.0
```

### Frontend

```bash
# Navegar para frontend
cd /home/devos/Codigos-vscode/ListaKaizenApp/frontend

# Instalar dependências (se necessário)
npm install

# Rodar frontend
npm start

# Build para produção
npm build

# Testes
npm test
```

### Testes

```bash
# Backend tests
cd /home/devos/Codigos-vscode/ListaKaizenApp
pytest backend/tests/ -v

# Frontend tests
cd frontend
npm test
```

---

## ARQUIVOS CRÍTICOS

### Backend

| Arquivo | Descrição | Etapas |
|---------|-----------|--------|
| `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/models.py` | Adicionar enum SUPER_ADMIN, 12 tabelas auxiliares, classe Restaurante | 1 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/controllers.py` | Decorators (@super_admin_required), helpers, blueprint super_admin_bp, modificar rotas para passar restaurante_id | 3, 5, 6 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/services.py` | Modificar authenticate_user (JWT com restaurante_id), filtrar 15+ funções por restaurante_id, criar services SUPER_ADMIN | 4, 5, 6 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/__init__.py` | Registrar super_admin_bp | 5 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/backend/migrate_to_multitenant.py` | Script de migração de dados (NOVO) | 2 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/backend/promote_super_admin.py` | Script de promoção SUPER_ADMIN (NOVO) | 7 |

### Frontend

| Arquivo | Descrição | Etapas |
|---------|-----------|--------|
| `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/App.tsx` | Adicionar rotas /super-admin/* com SuperAdminRoute | 9 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/components/Layout.tsx` | Adicionar superAdminMenuGroups e lógica de seleção | 10 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/components/SuperAdminRoute.tsx` | Route guard (NOVO) | 8 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/super-admin/SuperAdminDashboard.tsx` | Dashboard SUPER_ADMIN (NOVO) | 9 |
| `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/super-admin/GerenciarRestaurantes.tsx` | CRUD restaurantes (NOVO) | 9 |

---

## RESUMO EXECUTIVO

### Total de Etapas: 10
### Total de Commits: 10
### Arquivos Novos: 5 (backend: 2, frontend: 3)
### Arquivos Modificados: 7 (backend: 4, frontend: 3)

### Linha do Tempo de Execução

1. ✅ ETAPA 1: Models + Migration (~30 min)
2. ✅ ETAPA 2: Migração de dados (~10 min)
3. ✅ ETAPA 3: Decorator + Helpers (~15 min)
4. ✅ ETAPA 4: JWT com restaurante_id (~20 min)
5. ✅ ETAPA 5: Endpoints SUPER_ADMIN (~45 min)
6. ✅ ETAPA 6: Filtrar Services (~60 min) ← MAIOR ETAPA
7. ✅ ETAPA 7: Script promoção (~10 min)
8. ✅ ETAPA 8: SuperAdminRoute (~10 min)
9. ✅ ETAPA 9: Dashboards Frontend (~45 min)
10. ✅ ETAPA 10: Menu Layout (~15 min)

**Tempo total estimado:** ~4-5 horas

---

## CHECKLIST DE CONCLUSÃO

Antes de considerar o plano completo:

- [ ] Todas as 10 etapas executadas e commitadas
- [ ] Migration aplicada com sucesso
- [ ] Dados migrados para KZN
- [ ] SUPER_ADMIN promovido e testado
- [ ] Login funcionando com restaurante_id no JWT
- [ ] Endpoints SUPER_ADMIN acessíveis
- [ ] Isolamento de dados testado (ADMIN A não vê dados de restaurante B)
- [ ] Frontend carrega dashboards corretamente
- [ ] Menu switch funciona (SUPER_ADMIN vs ADMIN vs COLLABORATOR)
- [ ] Backward compatibility testada (tokens antigos)
- [ ] Testes automatizados passando

---

**FIM DO PLANO**
