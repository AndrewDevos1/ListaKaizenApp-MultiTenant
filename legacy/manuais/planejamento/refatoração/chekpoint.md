> preciso que ele - ✅ Gerenciar outros admins (criar, editar, deletar, promover/rebaixar)
  - ✅ Configurações globais do sistema\
poder vincular usuarios a cada restaurante, o restaurante atual é o KZN preciso que o super admin possa criar restaurantes e cadastrar novos usuarios 
adm , esses novos restaurantes vao ter a mesma estrutura de dados utilizadas atualmente no projeto porem cada restaurante com a sua estrutura propria a 
parte separado dos outrdos restaurantes cada restaurante ve seu proprio restaurante com exeçao do super admin que pode gerenciar todo o sistema agora me
 fala oque voce entendeu dessa task e oque precisamos? 

● Entendi perfeitamente! Essa é uma mudança GRANDE na arquitetura - você quer transformar o sistema de single-tenant (um único restaurante) para multi-tenant (múltiplos restaurantes independentes).

  Deixe-me confirmar o que entendi:

  🎯 O que você quer:

  1. Sistema Multi-Tenant (Múltiplos Restaurantes)

  - Cada restaurante opera de forma INDEPENDENTE
  - Restaurante "KZN" vira um dos restaurantes do sistema
  - Novos restaurantes podem ser criados
  - Isolamento completo de dados entre restaurantes

  2. Hierarquia de Usuários

  SUPER_ADMIN (global)
    └─ Vê e gerencia TODOS os restaurantes
    └─ Cria novos restaurantes
    └─ Cria ADMINs para cada restaurante
    └─ Gerencia usuários globalmente

  ADMIN (por restaurante)
    └─ Vê apenas SEU restaurante
    └─ Gerencia colaboradores do SEU restaurante
    └─ Mesmas funcionalidades atuais, mas isoladas

  COLLABORATOR (por restaurante)
    └─ Vê apenas SEU restaurante
    └─ Mesmas funcionalidades atuais

  3. Estrutura de Dados

  - Cada restaurante tem suas próprias:
    - ✅ Listas de compras
    - ✅ Itens e catálogo
    - ✅ Áreas
    - ✅ Fornecedores
    - ✅ Estoques
    - ✅ Pedidos
    - ✅ Cotações
    - ✅ Submissões
    - ✅ Sugestões
    - ✅ Listas rápidas
    - ✅ Checklists
    - ✅ Colaboradores

  ---
  🔍 O que isso significa tecnicamente:

  Opção A: Adicionar restaurante_id em TODAS as tabelas

  - Tabelas compartilhadas com filtro por restaurante
  - Mais simples de implementar
  - Risco: esquecer filtro em alguma query = vazamento de dados

  Opção B: Schema separado por restaurante (PostgreSQL)

  - Cada restaurante tem seu próprio schema
  - Isolamento total
  - Mais complexo

  ---
  ❓ Perguntas CRÍTICAS antes de planejar:

  1. Banco de Dados

  Você vai usar PostgreSQL em produção ou continuar com SQLite?
  - Multi-tenancy funciona melhor com PostgreSQL
  - SQLite tem limitações para schemas

  2. Usuários

  - SUPER_ADMIN é global (não pertence a nenhum restaurante)?
  - ADMIN e COLLABORATOR pertencem a UM restaurante específico?
  - Um usuário pode estar em múltiplos restaurantes com roles diferentes? Ou sempre 1 restaurante por usuário?

  3. Restaurante "KZN"

  - Todos os dados atuais viram dados do restaurante "KZN"?
  - Usuários atuais ficam vinculados ao KZN?

  4. Escopo

  Isso é urgente ou posso planejar com calma? Essa mudança afeta:
  - ✅ 20+ tabelas do banco
  - ✅ 100+ queries nos services
  - ✅ Sistema de autenticação (JWT)
  - ✅ Todos os testes
  - ✅ Frontend (contexto de restaurante)

  5. Super Admin Inicial

  - Vai ter UM super admin inicial?
  - Como criar o primeiro? Via script/migration ou tela especial?

  ---
  🚨 Alerta Importante:

  Esta é uma refatoração massiva que pode levar vários dias. Vou criar um plano detalhado, mas precisamos:
  1. Escolher abordagem (tenant_id vs schemas)
  2. Definir estratégia de migration
  3. Implementar em fases para não quebrar tudo

  Me confirma as respostas acima que eu crio o plano completo! 🎯

> me explica mais sobre   Esta é uma refatoração massiva que pode levar vários dias. Vou criar um plano detalhado, mas precisamos:
  1. Escolher abordagem (tenant_id vs schemas)
  2. Definir estratégia de migration
  3. Implementar em fases para não quebrar tudo 

● Ótimo! Vou explicar detalhadamente as opções e suas implicações. Deixe-me primeiro explorar a estrutura atual do banco de dados para te mostrar o impacto real.

  Explore(Mapear todas as tabelas do banco) Haiku 4.5
  ⎿  > Preciso entender TODAS as tabelas do banco de dados atual para planejar a migração multi-tenant.
     Read(backend/kaizen_app/models.py)
     Read 596 lines
     ctrl+b to run in background

✢ Reticulating… (esc to interrupt · 41s · ↓ 483 tokens · thought for 2s)



















● Perfeito! Agora que tenho o mapeamento completo das 18 tabelas, vou explicar detalhadamente as 3 questões que mencionei:

  ---
  1️⃣ ESCOLHER ABORDAGEM: tenant_id vs schemas

  Opção A: Coluna restaurante_id em cada tabela ⭐ (Recomendado)

  Como funciona:
  -- Antes (single-tenant)
  CREATE TABLE listas (
      id INTEGER PRIMARY KEY,
      nome VARCHAR(255) UNIQUE,
      descricao TEXT
  );

  -- Depois (multi-tenant)
  CREATE TABLE listas (
      id INTEGER PRIMARY KEY,
      restaurante_id INTEGER NOT NULL,  -- NOVO
      nome VARCHAR(255),
      descricao TEXT,
      FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
      UNIQUE (restaurante_id, nome)  -- UNIQUE agora é composto
  );

  Impacto no código:
  # Antes
  listas = Lista.query.all()

  # Depois
  restaurante_id = get_current_restaurante_id()  # Do JWT ou sessão
  listas = Lista.query.filter_by(restaurante_id=restaurante_id).all()

  ✅ Vantagens:
  - Simples de implementar
  - Um único banco de dados
  - Fácil para queries cross-tenant (super-admin vê tudo)
  - Backups simples

  ❌ Desvantagens:
  - RISCO DE VAZAMENTO: Se esquecer o filtro filter_by(restaurante_id=X), vaza dados
  - Precisa adicionar restaurante_id em TODAS as queries (100+ lugares no código)
  - Performance degradada com muitos restaurantes (índices maiores)

  Número de mudanças necessárias:
  - ✅ 15 tabelas ganham coluna restaurante_id
  - ✅ 3 tabelas de junção podem precisar também
  - ✅ Todas as 100+ queries nos services precisam de filtro

  ---
  Opção B: Schema separado por restaurante (PostgreSQL)

  Como funciona:
  -- Schema padrão (público)
  CREATE TABLE restaurantes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255),
      schema_name VARCHAR(50) UNIQUE
  );

  -- Schema do KZN
  CREATE SCHEMA kzn;
  CREATE TABLE kzn.listas (...);  -- Estrutura igual
  CREATE TABLE kzn.fornecedores (...);

  -- Schema do restaurante 2
  CREATE SCHEMA restaurante_abc;
  CREATE TABLE restaurante_abc.listas (...);  -- Estrutura igual
  CREATE TABLE restaurante_abc.fornecedores (...);

  Impacto no código:
  # Antes
  listas = Lista.query.all()

  # Depois
  set_schema(restaurante_schema)  # Define schema no início da request
  listas = Lista.query.all()  # Query continua igual!

  ✅ Vantagens:
  - Isolamento total: Impossível vazar dados entre restaurantes
  - Queries continuam iguais (só muda o schema)
  - Performance melhor (índices menores por schema)
  - Fácil exportar/importar um restaurante inteiro

  ❌ Desvantagens:
  - Só funciona com PostgreSQL (não funciona com SQLite)
  - Migrations precisam rodar em TODOS os schemas
  - Mais complexo para queries cross-tenant (super-admin)
  - Backups mais complexos

  ---
  2️⃣ ESTRATÉGIA DE MIGRATION

  Cenário: Migrar dados atuais para modelo multi-tenant

  Você tem dados do restaurante "KZN" atualmente. Vou mostrar as etapas:

  Fase 1: Criar tabela Restaurantes

  # Migration 001
  def upgrade():
      op.create_table('restaurantes',
          sa.Column('id', sa.Integer(), primary_key=True),
          sa.Column('nome', sa.String(255), nullable=False),
          sa.Column('slug', sa.String(100), unique=True, nullable=False),
          sa.Column('ativo', sa.Boolean(), default=True),
          sa.Column('criado_em', sa.DateTime(), default=brasilia_now())
      )

      # Criar restaurante KZN (migração dos dados atuais)
      op.execute("""
          INSERT INTO restaurantes (id, nome, slug, ativo, criado_em)
          VALUES (1, 'KZN', 'kzn', true, CURRENT_TIMESTAMP)
      """)

  Fase 2: Adicionar restaurante_id nas 15 tabelas (uma por vez!)

  Ordem de dependência (importante!):
  1. Tabelas SEM FK (independentes):
     - ListaMaeItem
     - Fornecedor
     - Area

  2. Tabelas com 1 nível de FK:
     - Lista (não depende de restaurante em FK)
     - Item (FK: fornecedor)
     - ListaRapida (FK: usuario - não tem restaurante)

  3. Tabelas com 2+ níveis:
     - ListaItemRef (FK: lista, lista_mae_item)
     - Estoque (FK: item, area, lista)
     - Submissao (FK: lista)
     - Pedido (FK: submissao, lista_mae_item, fornecedor)
     - Checklist (FK: submissao)
     - ChecklistItem (FK: checklist, pedido)
     - Cotacao (FK: fornecedor)
     - CotacaoItem (FK: cotacao, item)
     - SugestaoItem (FK: lista, lista_rapida)
     - ListaRapidaItem (FK: lista_rapida, lista_mae_item)

  Exemplo de migration para listas:
  # Migration 002
  def upgrade():
      # 1. Adicionar coluna (nullable primeiro!)
      op.add_column('listas',
          sa.Column('restaurante_id', sa.Integer(), nullable=True)
      )

      # 2. Popular com o ID do KZN (1)
      op.execute("UPDATE listas SET restaurante_id = 1")

      # 3. Tornar NOT NULL
      op.alter_column('listas', 'restaurante_id', nullable=False)

      # 4. Adicionar FK
      op.create_foreign_key(
          'fk_listas_restaurante',
          'listas', 'restaurantes',
          ['restaurante_id'], ['id'],
          ondelete='CASCADE'
      )

      # 5. Atualizar constraint UNIQUE
      op.drop_constraint('uq_listas_nome', 'listas')
      op.create_unique_constraint(
          'uq_listas_restaurante_nome',
          'listas',
          ['restaurante_id', 'nome']
      )

  Você precisaria de ~15 migrations assim!

  ---
  3️⃣ IMPLEMENTAR EM FASES (para não quebrar tudo)

  FASE 1: Infraestrutura (1-2 dias)

  - ✅ Criar modelo Restaurante
  - ✅ Criar migration inicial com KZN
  - ✅ Adicionar enum SUPER_ADMIN ao UserRoles
  - ✅ Criar primeiro super-admin via script
  - ✅ Adicionar campo restaurante_id aos usuários ADMIN/COLLABORATOR

  Testes: Sistema continua funcionando igual (KZN é hardcoded)

  ---
  FASE 2: Migrations de Schema (2-3 dias)

  - ✅ Migration por tabela (15 migrations)
  - ✅ Popular tudo com restaurante_id = 1 (KZN)
  - ✅ Atualizar constraints UNIQUE

  Testes: Sistema continua funcionando, mas agora tem restaurante_id em tudo

  ---
  FASE 3: Atualizar Services - Queries com Filtro (3-5 dias)

  Exemplo do impacto:
  # services.py - Antes (100+ funções assim)
  def obter_lista(lista_id):
      lista = Lista.query.get(lista_id)
      if not lista:
          return {"error": "Lista não encontrada."}, 404
      return lista.to_dict(), 200

  # services.py - Depois
  def obter_lista(lista_id, restaurante_id):
      lista = Lista.query.filter_by(
          id=lista_id,
          restaurante_id=restaurante_id  # ADICIONAR EM TODAS!
      ).first()
      if not lista:
          return {"error": "Lista não encontrada."}, 404
      return lista.to_dict(), 200

  Arquivos afetados:
  - ✅ backend/kaizen_app/services.py (100+ funções)
  - ✅ backend/kaizen_app/repositories.py (se existir)
  - ✅ Todas as queries precisam de filtro

  Estratégia:
  1. Criar helper get_current_restaurante_id() para pegar do JWT
  2. Ir função por função adicionando filtro
  3. Testar cada módulo (listas, pedidos, submissões, etc.)

  ---
  FASE 4: Atualizar Controllers - JWT e Contexto (2 dias)

  # controllers.py - Antes
  @admin_bp.route('/listas/<int:lista_id>', methods=['GET'])
  @admin_required()
  def get_lista_route(lista_id):
      response, status = services.obter_lista(lista_id)
      return jsonify(response), status

  # controllers.py - Depois
  @admin_bp.route('/listas/<int:lista_id>', methods=['GET'])
  @admin_required()
  def get_lista_route(lista_id):
      restaurante_id = get_restaurante_id_from_jwt()  # NOVO
      response, status = services.obter_lista(lista_id, restaurante_id)
      return jsonify(response), status

  Mudanças no JWT:
  # Antes - JWT claims
  {
      "identity": "1",  # user_id
      "role": "ADMIN",
      "nome": "João",
      "email": "joao@kzn.com"
  }

  # Depois - JWT claims
  {
      "identity": "1",
      "role": "ADMIN",
      "restaurante_id": 1,  # NOVO - ID do KZN
      "restaurante_nome": "KZN",  # NOVO
      "nome": "João",
      "email": "joao@kzn.com"
  }

  ---
  FASE 5: Telas de Super-Admin (2-3 dias)

  - ✅ Tela para criar restaurantes
  - ✅ Tela para gerenciar usuários de cada restaurante
  - ✅ Dashboard global (vê todos os restaurantes)
  - ✅ Seletor de restaurante para super-admin

  ---
  FASE 6: Frontend - Contexto de Restaurante (2 dias)

  - ✅ Mostrar nome do restaurante no header
  - ✅ Criar contexto React para restaurante_id
  - ✅ Super-admin pode trocar entre restaurantes

  ---
  FASE 7: Testes (2 dias)

  - ✅ Testar isolamento entre restaurantes
  - ✅ Testar que cada ADMIN só vê seu restaurante
  - ✅ Testar que SUPER_ADMIN vê tudo
  - ✅ Testar criação de novo restaurante

  ---
  📊 RESUMO DO ESFORÇO

  | Fase                            | Dias Estimados | Risco de Bug |
  |---------------------------------|----------------|--------------|
  | Fase 1: Infraestrutura          | 1-2 dias       | 🟢 Baixo     |
  | Fase 2: Migrations              | 2-3 dias       | 🟡 Médio     |
  | Fase 3: Services (100+ queries) | 3-5 dias       | 🔴 ALTO      |
  | Fase 4: Controllers + JWT       | 2 dias         | 🟡 Médio     |
  | Fase 5: Telas Super-Admin       | 2-3 dias       | 🟢 Baixo     |
  | Fase 6: Frontend                | 2 dias         | 🟢 Baixo     |
  | Fase 7: Testes                  | 2 dias         | 🟡 Médio     |
  | TOTAL                           | 14-19 dias     | -            |

  ---
  ⚠️ PRINCIPAIS RISCOS

  1. Esquecer filtro restaurante_id em alguma query

  # ❌ BUG - Vaza dados de todos os restaurantes
  listas = Lista.query.all()

  # ✅ CORRETO
  listas = Lista.query.filter_by(restaurante_id=restaurante_id).all()

  Solução: Criar mixins ou base classes que forçam o filtro

  2. Constraints UNIQUE quebradas

  # Antes: nome único global
  nome VARCHAR(255) UNIQUE

  # Depois: nome único por restaurante
  UNIQUE (restaurante_id, nome)

  3. Relacionamentos complexos

  # Pedido tem FK para:
  # - Submissao (que tem FK para Lista)
  # - ListaMaeItem
  # - Fornecedor

  # Todos precisam ter o MESMO restaurante_id
  # Validação necessária!

  ---
  💡 MINHA RECOMENDAÇÃO

  Opção A (restaurante_id) + Implementação faseada porque:
  1. ✅ Você pode testar gradualmente
  2. ✅ Pode reverter se der problema
  3. ✅ Funciona com SQLite (desenvolvimento)
  4. ✅ Mais fácil de debugar

  Depois de estabilizar, pode migrar para Opção B (schemas) se necessário.

  ---
  Ficou mais claro o tamanho da refatoração? Quer que eu crie o plano completo ou tem mais alguma dúvida sobre as abordagens?

> /model 
  ⎿  Kept model as Default (recommended)

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
>  
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⏸ plan mode on (shift+tab to cycle)                                                                                  Context left until auto-compact: 0%






