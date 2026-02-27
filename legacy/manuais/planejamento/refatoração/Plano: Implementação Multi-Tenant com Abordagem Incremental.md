 Plano: Implementação Multi-Tenant com Abordagem Incremental

 Objetivo

 Transformar o sistema atual single-tenant (restaurante KZN) em um sistema multi-tenant onde:
 - SUPER_ADMIN pode gerenciar múltiplos restaurantes e todos os dados do sistema
 - Cada restaurante tem dados completamente isolados
 - ADMIN e COLLABORATOR veem apenas dados do seu restaurante
 - Nova hierarquia: SUPER_ADMIN (global) → ADMIN (por restaurante) → COLLABORATOR (por restaurante)

 Estratégia: Implementação Incremental (Faseada)

 Ao invés de refatorar tudo de uma vez (alto risco), vamos implementar em fases testáveis:

 1. Fase 1: Criar tabela Restaurante + role SUPER_ADMIN (2-3 dias)
 2. Fase 2: CRUD de restaurantes - apenas super admin (2 dias)
 3. Fase 3: Associar usuários a restaurantes (2 dias)
 4. Fases 4+: Migrar demais tabelas gradualmente - 2-3 por vez (1-2 semanas)

 Vantagens desta abordagem:
 - Testável: Cada fase independente
 - Reversível: Fácil fazer rollback
 - Menos arriscado: Não quebra sistema atual KZN
 - Incremental: Pode pausar entre fases
 - Aprendizado: Descobre problemas cedo em escopo menor

 ---
 FASE 1: Infraestrutura Base (2-3 dias)

 Objetivo

 Criar fundação do sistema multi-tenant sem tocar no código existente.

 1.1 Novo Model: Restaurante

 Arquivo: backend/kaizen_app/models.py (adicionar após linha 62)

 class Restaurante(db.Model, SerializerMixin):
     __tablename__ = 'restaurantes'
     serialize_rules = ('-usuarios', '-listas', '-itens')

     id = db.Column(db.Integer, primary_key=True)
     nome = db.Column(db.String(200), nullable=False, unique=True)
     slug = db.Column(db.String(100), nullable=False, unique=True, index=True)
     ativo = db.Column(db.Boolean, default=True, nullable=False)
     criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
     atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
     deletado = db.Column(db.Boolean, default=False, nullable=False)

     # Relationships (adicionados nas próximas fases)
     # usuarios = db.relationship('Usuario', back_populates='restaurante')

     def to_dict(self):
         return {
             'id': self.id,
             'nome': self.nome,
             'slug': self.slug,
             'ativo': self.ativo,
             'criado_em': self.criado_em.isoformat() if self.criado_em else None
         }

 1.2 Atualizar Role Enum

 Arquivo: backend/kaizen_app/models.py (linhas 37-39)

 class UserRoles(enum.Enum):
     SUPER_ADMIN = "SUPER_ADMIN"  # NOVO
     ADMIN = "ADMIN"
     COLLABORATOR = "COLLABORATOR"

 1.3 Migração

 cd backend
 flask db migrate -m "Add Restaurante model and SUPER_ADMIN role"
 flask db upgrade

 1.4 Script: Criar Super Admin Inicial

 Criar arquivo: backend/create_super_admin.py

 Script Python para criar primeiro SUPER_ADMIN com:
 - Input de nome, email, senha
 - Validação de email duplicado
 - Aprovado automaticamente (aprovado=True)
 - Role SUPER_ADMIN

 Executar:
 # Windows
 .venv\Scripts\python.exe backend\create_super_admin.py

 # Linux/macOS
 python backend/create_super_admin.py

 1.5 Script: Criar Restaurante KZN

 Criar arquivo: backend/migrate_kzn_restaurante.py

 Script para:
 - Criar restaurante KZN (nome='KZN Restaurante', slug='kzn')
 - Executar apenas uma vez após criar tabela restaurantes

 1.6 Novo Decorator: super_admin_required

 Arquivo: backend/kaizen_app/controllers.py (adicionar após linha 67)

 def super_admin_required():
     """Decorator para rotas que exigem SUPER_ADMIN"""
     def wrapper(fn):
         @wraps(fn)
         @jwt_required()
         def decorator(*args, **kwargs):
             claims = get_jwt()
             role = claims.get('role')
             if role != 'SUPER_ADMIN':
                 return jsonify({"error": "Acesso negado. Apenas SUPER_ADMIN."}), 403
             return fn(*args, **kwargs)
         return decorator
     return wrapper

 ---
 FASE 2: CRUD de Restaurantes (2 dias)

 Objetivo

 Permitir que SUPER_ADMIN gerencie restaurantes (criar, listar, editar, desativar).

 2.1 Backend Services

 Arquivo: backend/kaizen_app/services.py (adicionar no final)

 Funções a criar:
 - listar_restaurantes() - Lista todos restaurantes (deletado=False)
 - obter_restaurante(restaurante_id) - Obtém um restaurante por ID
 - criar_restaurante(data) - Cria novo restaurante com slug único (usando python-slugify)
 - atualizar_restaurante(restaurante_id, data) - Atualiza nome e status ativo
 - deletar_restaurante(restaurante_id) - Soft delete (deletado=True)

 Dependência: Instalar python-slugify==8.0.1

 2.2 Backend Controllers

 Arquivo: backend/kaizen_app/controllers.py (adicionar após linha 953)

 Rotas a criar (todas com @super_admin_required()):
 - GET /admin/restaurantes - Lista todos
 - GET /admin/restaurantes/<id> - Obtém um
 - POST /admin/restaurantes - Cria novo
 - PUT /admin/restaurantes/<id> - Atualiza
 - DELETE /admin/restaurantes/<id> - Deleta (soft)

 2.3 Frontend - Gerenciar Restaurantes

 Criar: frontend/src/features/admin/GerenciarRestaurantes.tsx

 Componente com:
 - Tabela listando todos restaurantes (ID, Nome, Slug, Status, Criado em, Ações)
 - Botão "Criar Novo Restaurante"
 - Modal criar/editar com campos: nome, ativo (checkbox)
 - Botões editar e deletar por restaurante
 - Spinner durante loading
 - Alertas de erro

 Criar: frontend/src/features/admin/GerenciarRestaurantes.module.css

 Estilos básicos para container e header.

 2.4 Adicionar Rota no App

 Arquivo: frontend/src/App.tsx

 - Import: import GerenciarRestaurantes from './features/admin/GerenciarRestaurantes';
 - Rota (após linha 66): <Route path="restaurantes" element={<GerenciarRestaurantes />} />

 2.5 Adicionar Item no Menu Admin

 Arquivo: frontend/src/components/Layout.tsx

 Menu item para SUPER_ADMIN:
 {
     label: 'Restaurantes',
     icon: 'fa-store',
     path: '/admin/restaurantes'
 }

 Nota: Condição para mostrar apenas para SUPER_ADMIN será adicionada na Fase 3.

 ---
 FASE 3: Associação User ↔ Restaurante (2 dias)

 Objetivo

 - Adicionar restaurante_id na tabela usuarios
 - Atualizar JWT para incluir restaurante_id
 - Permitir SUPER_ADMIN atribuir usuários a restaurantes
 - SUPER_ADMIN pode criar novos admins de restaurante

 3.1 Atualizar Model Usuario

 Arquivo: backend/kaizen_app/models.py (linha ~41)

 Adicionar:
 # NOVO: FK para restaurante (nullable para SUPER_ADMIN)
 restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), nullable=True, index=True)

 # Relationship
 restaurante = db.relationship('Restaurante', back_populates='usuarios')

 Atualizar to_dict() para incluir restaurante_id e restaurante.

 Atualizar Model Restaurante:
 usuarios = db.relationship('Usuario', back_populates='restaurante', lazy='dynamic')

 3.2 Migração

 flask db migrate -m "Add restaurante_id to usuarios"
 flask db upgrade

 3.3 Atualizar JWT

 Arquivo: backend/kaizen_app/controllers.py (login_route, linha ~118)

 Adicionar restaurante_id ao JWT:
 additional_claims = {
     'role': usuario.role.value,
     'restaurante_id': usuario.restaurante_id  # NOVO
 }

 3.4 Helper Function

 Arquivo: backend/kaizen_app/controllers.py (adicionar após linha 70)

 def get_current_restaurante_id():
     """
     Retorna restaurante_id do usuário atual.
     SUPER_ADMIN retorna None (acessa todos os restaurantes).
     """
     claims = get_jwt()
     role = claims.get('role')

     if role == 'SUPER_ADMIN':
         return None  # Sem filtro

     return claims.get('restaurante_id')

 3.5 Services - Gestão de Usuários Multi-Tenant

 Arquivo: backend/kaizen_app/services.py

 Funções a criar:
 - atribuir_usuario_restaurante(usuario_id, restaurante_id) - Atribui usuário a restaurante
 - criar_admin_restaurante(data) - SUPER_ADMIN cria ADMIN vinculado a restaurante

 3.6 Controllers - Rotas de Gestão

 Arquivo: backend/kaizen_app/controllers.py

 Rotas a criar (ambas @super_admin_required()):
 - PUT /admin/usuarios/<id>/atribuir-restaurante - Atribui usuário a restaurante
 - POST /admin/usuarios/criar-admin-restaurante - Cria novo ADMIN de restaurante

 3.7 Atualizar Script migrate_kzn_restaurante.py

 Adicionar código para vincular todos os usuários ADMIN e COLLABORATOR existentes ao KZN:

 usuarios_sem_restaurante = Usuario.query.filter(
     Usuario.restaurante_id.is_(None),
     Usuario.role != UserRoles.SUPER_ADMIN
 ).all()

 for usuario in usuarios_sem_restaurante:
     usuario.restaurante_id = kzn.id

 db.session.commit()

 3.8 Frontend - Condicionar Menu por Role

 Arquivo: frontend/src/components/Layout.tsx

 Mostrar "Restaurantes" apenas para SUPER_ADMIN:

 const user = JSON.parse(localStorage.getItem('user') || '{}');
 const isSuperAdmin = user.role === 'SUPER_ADMIN';

 // No menu admin
 {isSuperAdmin && {
     label: 'Restaurantes',
     icon: 'fa-store',
     path: '/admin/restaurantes'
 }}

 ---
 FASES 4+: Migração Gradual das Demais Tabelas (2-3 tabelas por semana)

 Tabelas a Migrar (em ordem de prioridade)

 Grupo 1 (Fase 4): Catálogo e Fornecedores
 - lista_mae_itens (catálogo global por restaurante)
 - fornecedores (fornecedores por restaurante)

 Grupo 2 (Fase 5): Áreas e Listas
 - areas, listas, lista_item_ref

 Grupo 3 (Fase 6): Estoque e Submissões
 - estoques, submissoes

 Grupo 4 (Fase 7): Pedidos e Cotações
 - pedidos, cotacoes, cotacao_itens

 Grupo 5 (Fase 8): Checklists e Listas Rápidas
 - checklists, checklist_itens, listas_rapidas, listas_rapidas_itens, sugestoes_itens

 Padrão de Implementação (Repetir para Cada Grupo)

 1. Migration

 # Adicionar coluna nullable
 op.add_column('nome_tabela',
     sa.Column('restaurante_id', sa.Integer(), nullable=True))
 op.create_foreign_key('fk_nome_tabela_restaurante',
     'nome_tabela', 'restaurantes', ['restaurante_id'], ['id'])
 op.create_index('ix_nome_tabela_restaurante_id',
     'nome_tabela', ['restaurante_id'])

 # Migrar dados existentes para KZN (ID 1)
 op.execute("UPDATE nome_tabela SET restaurante_id = 1 WHERE restaurante_id IS NULL")

 # Tornar coluna obrigatória
 op.alter_column('nome_tabela', 'restaurante_id', nullable=False)

 2. Atualizar Model

 restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'),
                            nullable=False, index=True)
 restaurante = db.relationship('Restaurante')

 3. Atualizar Services (Adicionar Filtros)

 Antes:
 def listar_itens():
     itens = Modelo.query.filter_by(deletado=False).all()

 Depois:
 def listar_itens(restaurante_id):
     """restaurante_id: None para SUPER_ADMIN, ID específico para ADMIN/COLLABORATOR"""
     query = Modelo.query.filter_by(deletado=False)

     if restaurante_id:
         query = query.filter_by(restaurante_id=restaurante_id)

     itens = query.all()

 4. Atualizar Controllers (Passar restaurante_id)

 @admin_bp.route('/endpoint', methods=['GET'])
 @admin_required()
 def endpoint_route():
     restaurante_id = get_current_restaurante_id()
     response, status = services.funcao(restaurante_id)
     return jsonify(response), status

 5. Testes de Isolamento

 def test_isolamento(client, auth_rest1, auth_rest2):
     # Restaurante 1 cria item
     resp1 = client.post('/endpoint', json={'nome': 'Item R1'}, headers=auth_rest1)

     # Restaurante 2 não deve ver
     resp2 = client.get('/endpoint', headers=auth_rest2)
     assert 'Item R1' not in str(resp2.data)

 ---
 Checklist de Validação (Cada Fase)

 - Migration executada sem erros
 - Dados existentes migrados para KZN
 - Models atualizados com relacionamentos
 - Services filtram por restaurante_id
 - SUPER_ADMIN vê todos os dados
 - ADMIN vê apenas seu restaurante
 - COLLABORATOR vê apenas seu restaurante
 - Frontend atualizado (se aplicável)
 - Testes de isolamento passando
 - Documentação atualizada

 ---
 Riscos e Mitigações

 Risco 1: Esquecer Filtro restaurante_id

 Impacto: Data leakage entre restaurantes
 Mitigação: Helper function padronizada, code review rigoroso, testes automatizados

 Risco 2: Dados Órfãos Durante Migração

 Impacto: Registros sem restaurante_id
 Mitigação: Script sempre atribui KZN aos dados existentes, validação pós-migration

 Risco 3: Performance (Queries Complexas)

 Impacto: Lentidão com múltiplos restaurantes
 Mitigação: Índices em todas as colunas restaurante_id, análise de EXPLAIN

 Risco 4: FK Cascades Indesejados

 Impacto: Deletar restaurante deletaria todos os dados
 Mitigação: Soft delete (deletado=True), checks nos services

 ---
 Ordem de Implementação Recomendada

 1. Semana 1: Fases 1, 2, 3 (Infraestrutura + CRUD + Usuários)
 2. Semana 2: Fase 4 (Catálogo + Fornecedores) - Testar isolamento
 3. Semana 3: Fase 5 (Áreas + Listas)
 4. Semana 4: Fase 6 (Estoque + Submissões)
 5. Semana 5: Fase 7 (Pedidos + Cotações)
 6. Semana 6: Fase 8 (Checklists + Listas Rápidas + Sugestões)
 7. Semana 7: Testes finais, ajustes, documentação

 ---
 Arquivos Críticos

 Backend:
 1. backend/kaizen_app/models.py - Adicionar Restaurante, atualizar Usuario, UserRoles enum
 2. backend/kaizen_app/services.py - CRUD restaurantes, gestão usuários, filtros multi-tenant
 3. backend/kaizen_app/controllers.py - Rotas restaurantes, decorator super_admin_required, helper function
 4. backend/create_super_admin.py - Script criar primeiro SUPER_ADMIN (novo)
 5. backend/migrate_kzn_restaurante.py - Script criar restaurante KZN (novo)

 Frontend:
 6. frontend/src/features/admin/GerenciarRestaurantes.tsx - Tela CRUD restaurantes (novo)
 7. frontend/src/features/admin/GerenciarRestaurantes.module.css - Estilos (novo)
 8. frontend/src/App.tsx - Adicionar rota restaurantes
 9. frontend/src/components/Layout.tsx - Menu condicional por role

 ---
 Próximos Passos Imediatos

 1. Validar este plano com o usuário
 2. Executar Fase 1 (criar tabela Restaurante + role SUPER_ADMIN)
 3. Criar primeiro SUPER_ADMIN via script
 4. Criar restaurante KZN
 5. Iniciar Fase 2 (CRUD de restaurantes)


































 ● Ótima pergunta! Deixa eu explicar claramente a estrutura do banco de dados multi-tenant:

  Estrutura do Banco de Dados Multi-Tenant

  1. Abordagem: Tenant ID Column (Coluna restaurante_id)

  Todos os dados ficam no mesmo banco de dados, mas logicamente separados por restaurante_id. NÃO são bancos separados, NÃO são schemas separados (PostgreSQL).

  2. Estrutura das Tabelas

  ┌─────────────────┐
  │  restaurantes   │ ← Tabela master de restaurantes
  ├─────────────────┤
  │ id (PK)         │
  │ nome            │
  │ slug            │
  │ ativo           │
  └─────────────────┘
           ↑
           │ FK (restaurante_id)
           │
      ┌────┴────────────────────────────┐
      │                                  │
  ┌───┴──────────┐              ┌───────┴──────────┐
  │   usuarios   │              │ lista_mae_itens  │
  ├──────────────┤              ├──────────────────┤
  │ id (PK)      │              │ id (PK)          │
  │ nome         │              │ nome             │
  │ email        │              │ unidade          │
  │ role         │              │ restaurante_id*  │ ← FK obrigatória
  │ restaurante_id│              └──────────────────┘
  └──────────────┘
           ↑                    ┌──────────────────┐
           │ FK                 │  fornecedores    │
           │                    ├──────────────────┤
      ┌────┴─────┐              │ id (PK)          │
      │  pedidos │              │ nome             │
      ├──────────┤              │ restaurante_id*  │ ← FK obrigatória
      │ id (PK)  │              └──────────────────┘
      │ usuario_id│
      │ restaurante_id* │ ← FK obrigatória         E assim por diante...
      └──────────┘                 (15 tabelas no total)

  3. Como Funciona na Prática

  Exemplo 1: Dois Restaurantes Criando Fornecedores

  -- Restaurante KZN (ID=1) cria fornecedor
  INSERT INTO fornecedores (nome, restaurante_id) VALUES ('Fornecedor A', 1);

  -- Restaurante Central (ID=2) cria fornecedor
  INSERT INTO fornecedores (nome, restaurante_id) VALUES ('Fornecedor B', 2);

  -- Tabela fornecedores:
  | id | nome          | restaurante_id |
  |----|---------------|----------------|
  | 1  | Fornecedor A  | 1              | ← KZN
  | 2  | Fornecedor B  | 2              | ← Central

  Exemplo 2: Queries Filtradas por Restaurante

  # Admin do KZN (restaurante_id=1) lista seus fornecedores
  fornecedores = Fornecedor.query.filter_by(
      restaurante_id=1,  # ← Filtro automático
      deletado=False
  ).all()
  # Retorna: ["Fornecedor A"]  (não vê "Fornecedor B")

  # Admin do Central (restaurante_id=2) lista seus fornecedores
  fornecedores = Fornecedor.query.filter_by(
      restaurante_id=2,  # ← Filtro automático
      deletado=False
  ).all()
  # Retorna: ["Fornecedor B"]  (não vê "Fornecedor A")

  # SUPER_ADMIN lista TODOS (sem filtro de restaurante)
  fornecedores = Fornecedor.query.filter_by(deletado=False).all()
  # Retorna: ["Fornecedor A", "Fornecedor B"]

  4. Relação Usuário ↔ Restaurante

  Não é tabela auxiliar (junction table). É uma FK direta:

  class Usuario(db.Model):
      id = db.Column(db.Integer, primary_key=True)
      nome = db.Column(db.String(100))
      email = db.Column(db.String(120))
      role = db.Column(db.Enum(UserRoles))

      # FK DIRETA para restaurante
      restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'),
                                  nullable=True)  # nullable apenas para SUPER_ADMIN

      # Relationship
      restaurante = db.relationship('Restaurante', back_populates='usuarios')

  Exemplo de dados:

  Tabela: usuarios
  | id | nome      | email            | role         | restaurante_id |
  |----|-----------|------------------|--------------|----------------|
  | 1  | SuperUser | super@admin.com  | SUPER_ADMIN  | NULL          | ← Sem restaurante
  | 2  | Admin KZN | admin@kzn.com    | ADMIN        | 1             | ← Vinculado ao KZN
  | 3  | João      | joao@kzn.com     | COLLABORATOR | 1             | ← Vinculado ao KZN
  | 4  | Maria     | maria@central.com| ADMIN        | 2             | ← Vinculado ao Central

  5. Todas as 15 Tabelas Seguem o Mesmo Padrão

  Lista completa de tabelas que receberão restaurante_id:

  1. lista_mae_itens - Catálogo de itens
  2. fornecedores - Fornecedores
  3. areas - Áreas de trabalho
  4. listas - Listas de compras
  5. lista_item_ref - Referências de itens em listas
  6. estoques - Controle de estoque
  7. submissoes - Submissões de pedidos
  8. pedidos - Pedidos
  9. cotacoes - Cotações
  10. cotacao_itens - Itens de cotação
  11. checklists - Checklists
  12. checklist_itens - Itens de checklist
  13. listas_rapidas - Listas rápidas
  14. listas_rapidas_itens - Itens de listas rápidas
  15. sugestoes_itens - Sugestões de itens

  Todas terão:
  restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'),
                              nullable=False, index=True)

  6. Isolamento de Dados

  Como garantimos que Restaurant A não vê dados do Restaurant B?

  1. Helper function (Fase 3):
  def get_current_restaurante_id():
      """Retorna restaurante_id do usuário logado"""
      claims = get_jwt()
      role = claims.get('role')

      if role == 'SUPER_ADMIN':
          return None  # Vê tudo

      return claims.get('restaurante_id')  # Vê apenas seu restaurante

  2. Services sempre filtram:
  def listar_fornecedores(restaurante_id):
      query = Fornecedor.query.filter_by(deletado=False)

      if restaurante_id:  # Se não é SUPER_ADMIN
          query = query.filter_by(restaurante_id=restaurante_id)

      return query.all()

  3. Controllers chamam services com filtro:
  @admin_bp.route('/fornecedores', methods=['GET'])
  @admin_required()
  def listar_fornecedores_route():
      restaurante_id = get_current_restaurante_id()
      response, status = services.listar_fornecedores(restaurante_id)
      return jsonify(response), status

  7. Vantagens desta Abordagem

  ✅ Simples de implementar: Uma coluna por tabela
  ✅ Funciona com SQLite e PostgreSQL: Não depende de features específicas
  ✅ Backup único: Um banco, um backup
  ✅ Queries eficientes: Índice em restaurante_id
  ✅ SUPER_ADMIN vê tudo: Sem filtro = visão global
  ✅ Escalável: Adicionar novo restaurante = INSERT na tabela restaurantes

  8. Desvantagens e Mitigações

  ❌ Risco de data leakage: Esquecer filtro em uma query
  ✅ Mitigação: Helper function padronizada + testes automatizados

  ❌ Performance com muitos restaurantes: Queries podem ficar lentas
  ✅ Mitigação: Índices em todas as colunas restaurante_id

  ---
  Resumo Final

  NÃO estamos criando:
  - ❌ Tabelas separadas por restaurante (fornecedores_kzn, fornecedores_central)
  - ❌ Bancos de dados separados
  - ❌ Schemas PostgreSQL separados
  - ❌ Tabelas auxiliares de junção (exceto as que já existem como lista_colaborador)

  ESTAMOS criando:
  - ✅ Uma coluna restaurante_id em 15 tabelas
  - ✅ FK constraint: restaurante_id → restaurantes.id
  - ✅ Filtros automáticos nas queries baseados no role do usuário
  - ✅ Isolamento lógico (não físico) dos dados

  Ficou claro? Quer que eu detalhe alguma parte específica?