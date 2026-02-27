● User approved Claude's plan
  ⎿  Plan saved to: ~/.claude/plans/snoopy-seeking-pnueli.md · /plan to edit
     Plano: Sistema de Solicitação de Cadastro de Restaurantes

     📋 Resumo da Task

     Implementar sistema completo de solicitação de cadastro para novos restaurantes no Kaizen Lists.

     Fluxo Confirmado:

     1. Link no Login → "Você tem um restaurante? Quer usar nosso sistema?"
     2. Formulário Público → 9 campos (7 obrigatórios, 2 opcionais)
     3. Notificação → Enviada automaticamente para SUPER_ADMIN
     4. Painel Admin → /admin/solicitacoes-restaurante para gerenciar
     5. Aprovação Automática → Cria Restaurante + Usuário ADMIN + Gera credenciais

     Dados do Formulário:

     - ✅ Nome do restaurante (obrigatório)
     - ✅ Endereço do restaurante (obrigatório)
     - ✅ Email do restaurante (obrigatório)
     - ✅ Telefone do restaurante (obrigatório)
     - ✅ Nome do responsável (obrigatório)
     - ✅ Email do responsável (obrigatório)
     - ✅ Telefone do responsável (obrigatório)
     - ⭕ CNPJ (opcional)
     - ⭕ Razão social (opcional)

     ---
     🎯 Decisões de Design (Aprovadas pelo Usuário)

     ✅ Pós-aprovação: Criar restaurante + criar usuário ADMIN automaticamente
     ✅ Notificação: Apenas SUPER_ADMIN recebe
     ✅ Campos de contato: Telefone + Email separados (4 campos)
     ✅ Visualização: Nova página /admin/solicitacoes-restaurante

     ---
     📦 Ordem de Implementação

     FASE 1: Backend Database (30 min)

     1. Adicionar enum StatusSolicitacaoRestaurante em models.py
     2. Adicionar modelo SolicitacaoRestaurante em models.py
     3. Atualizar enum TipoNotificacao em models.py
     4. Criar e aplicar migration

     FASE 2: Backend Services (60 min)

     5. Implementar 5 funções em services.py:
       - criar_solicitacao_restaurante()
       - listar_solicitacoes_restaurante()
       - obter_solicitacao_restaurante()
       - aprovar_solicitacao_restaurante()
       - rejeitar_solicitacao_restaurante()

     FASE 3: Backend API (30 min)

     6. Criar public_bp em controllers.py
     7. Implementar 5 endpoints da API
     8. Registrar public_bp em __init__.py

     FASE 4: Frontend Formulário (90 min)

     9. Criar componente RegisterRestaurant.tsx
     10. Implementar máscaras (telefone, CNPJ) e validações
     11. Adicionar link em Login.tsx
     12. Adicionar rota pública em App.tsx

     FASE 5: Frontend Admin (120 min)

     13. Criar componente SolicitacoesRestaurante.tsx
     14. Implementar lista, filtros e modais (aprovar/rejeitar)
     15. Adicionar rota admin em App.tsx

     FASE 6: Testes (60 min)

     16. Testes end-to-end de todo o fluxo

     TEMPO TOTAL ESTIMADO: 6-7 horas

     ---
     🗄️ 1. MODELO DE BANCO DE DADOS

     1.1 Novo Enum: StatusSolicitacaoRestaurante

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/models.py
     Localização: Após linha 42 (após enum UserRoles)

     class StatusSolicitacaoRestaurante(enum.Enum):
         PENDENTE = "PENDENTE"
         APROVADO = "APROVADO"
         REJEITADO = "REJEITADO"

     1.2 Novo Modelo: SolicitacaoRestaurante

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/models.py
     Localização: Após ConviteToken (aproximadamente linha 773)

     class SolicitacaoRestaurante(db.Model, SerializerMixin):
         """Solicitações de cadastro de novos restaurantes via formulário público."""
         __tablename__ = 'solicitacoes_restaurante'

         id = db.Column(db.Integer, primary_key=True)

         # Dados do restaurante
         nome_restaurante = db.Column(db.String(200), nullable=False)
         endereco_restaurante = db.Column(db.String(400), nullable=False)
         telefone_restaurante = db.Column(db.String(20), nullable=False)
         email_restaurante = db.Column(db.String(120), nullable=False)
         cnpj = db.Column(db.String(18), nullable=True)
         razao_social = db.Column(db.String(200), nullable=True)

         # Dados do responsável
         nome_responsavel = db.Column(db.String(100), nullable=False)
         email_responsavel = db.Column(db.String(120), nullable=False)
         telefone_responsavel = db.Column(db.String(20), nullable=False)

         # Controle
         status = db.Column(db.Enum(StatusSolicitacaoRestaurante), nullable=False,
                           default=StatusSolicitacaoRestaurante.PENDENTE)
         criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
         processado_em = db.Column(db.DateTime, nullable=True)
         processado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)

         # Resultado
         motivo_rejeicao = db.Column(db.Text, nullable=True)
         restaurante_criado_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)
         usuario_admin_criado_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
         senha_gerada = db.Column(db.String(20), nullable=True)

         # Relacionamentos
         processado_por = db.relationship('Usuario', foreign_keys=[processado_por_id])
         restaurante_criado = db.relationship('Restaurante', foreign_keys=[restaurante_criado_id])
         usuario_admin_criado = db.relationship('Usuario', foreign_keys=[usuario_admin_criado_id])

     1.3 Atualizar TipoNotificacao

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/models.py
     Localização: Linha 653 (dentro do enum TipoNotificacao)

     Adicionar após PEDIDO_REJEITADO:

     SOLICITACAO_RESTAURANTE = "solicitacao_restaurante"

     1.4 Migration

     cd backend
     source .venv/bin/activate
     flask db migrate -m "add solicitacoes restaurante table"
     flask db upgrade

     ---
     🔧 2. BACKEND - SERVICES

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/services.py
     Localização: Final do arquivo

     2.1 criar_solicitacao_restaurante()

     def criar_solicitacao_restaurante(data):
         """Cria solicitação e notifica SUPER_ADMIN."""
         # Validações (campos obrigatórios, formatos)
         # Verificar duplicata (email responsável pendente)
         # Criar registro SolicitacaoRestaurante
         # Notificar todos os SUPER_ADMIN
         # Retornar sucesso com ID

     2.2 listar_solicitacoes_restaurante(filtro_status=None)

     def listar_solicitacoes_restaurante(filtro_status=None):
         """Lista solicitações com filtro opcional de status."""
         # Query com filtro
         # OrderBy criado_em DESC
         # Retornar lista serializada

     2.3 obter_solicitacao_restaurante(id)

     def obter_solicitacao_restaurante(solicitacao_id):
         """Obtém detalhes completos de uma solicitação."""

     2.4 aprovar_solicitacao_restaurante(id, admin_id)

     def aprovar_solicitacao_restaurante(solicitacao_id, admin_id):
         """
         Aprova solicitação:
         1. Criar Restaurante (com slug único)
         2. Criar Usuario ADMIN (gerar senha aleatória 12 chars)
         3. Atualizar solicitação (status=APROVADO, vincular IDs)
         4. Retornar credenciais (IMPORTANTE: exibir apenas uma vez)
         """

     2.5 rejeitar_solicitacao_restaurante(id, admin_id, motivo)

     def rejeitar_solicitacao_restaurante(solicitacao_id, admin_id, motivo):
         """Rejeita solicitação com motivo obrigatório."""

     Detalhes de implementação completos fornecidos no output do Plan agent.

     ---
     🌐 3. BACKEND - API ENDPOINTS

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/controllers.py

     3.1 Criar Blueprint Público

     Localização: Após linha 10

     public_bp = Blueprint('public_bp', __name__, url_prefix='/api/public')

     3.2 Endpoints

     Localização: Final do arquivo

     # === ROTAS PÚBLICAS ===
     @public_bp.route('/solicitar-restaurante', methods=['POST'])
     def solicitar_restaurante_route():
         """POST /api/public/solicitar-restaurante - Não requer autenticação"""

     # === ROTAS ADMIN: SOLICITAÇÕES ===
     @admin_bp.route('/solicitacoes-restaurante', methods=['GET'])
     @super_admin_required()
     def listar_solicitacoes_restaurante_route():
         """GET /api/admin/solicitacoes-restaurante?status=PENDENTE"""

     @admin_bp.route('/solicitacoes-restaurante/<int:id>', methods=['GET'])
     @super_admin_required()
     def obter_solicitacao_restaurante_route(id):
         """GET /api/admin/solicitacoes-restaurante/<id>"""

     @admin_bp.route('/solicitacoes-restaurante/<int:id>/aprovar', methods=['PUT'])
     @super_admin_required()
     def aprovar_solicitacao_restaurante_route(id):
         """PUT /api/admin/solicitacoes-restaurante/<id>/aprovar"""

     @admin_bp.route('/solicitacoes-restaurante/<int:id>/rejeitar', methods=['PUT'])
     @super_admin_required()
     def rejeitar_solicitacao_restaurante_route(id):
         """PUT /api/admin/solicitacoes-restaurante/<id>/rejeitar (body: {motivo})"""

     3.3 Registrar Blueprint Público

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/__init__.py
     Localização: Linha 218 (dentro de create_app)

     # Alterar de:
     from .controllers import auth_bp, admin_bp, api_bp, collaborator_bp

     # Para:
     from .controllers import auth_bp, admin_bp, api_bp, collaborator_bp, public_bp

     # Adicionar registro:
     app.register_blueprint(public_bp)

     ---
     🎨 4. FRONTEND - FORMULÁRIO

     4.1 Componente RegisterRestaurant.tsx

     Criar arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/auth/RegisterRestaurant.tsx

     Características:
     - 9 campos com validações client-side
     - Máscaras: Telefone (00) 00000-0000, CNPJ 00.000.000/0000-00
     - Validação de email (regex)
     - Tela de sucesso animada
     - Redirect para login após 3s
     - Reutiliza estilos de Register.module.css

     Estrutura:
     import React, { useState } from 'react';
     import { Form, Button, Alert, Card, Container } from 'react-bootstrap';
     import { Link, useNavigate } from 'react-router-dom';
     import api from '../../services/api';
     import styles from './Register.module.css';

     const RegisterRestaurant: React.FC = () => {
         // Estados para 9 campos + loading + errors + success
         // Funções de máscara (telefone, CNPJ)
         // handleSubmit (POST /api/public/solicitar-restaurante)
         // Tela de sucesso condicional

         return (/* Formulário completo */);
     };

     4.2 Link no Login

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/auth/Login.tsx
     Localização: Após linha 240 (após link de registro)

     {/* Link para cadastro de restaurante */}
     <div className="text-center mt-3">
         <Link
             to="/register-restaurant"
             style={{
                 fontSize: '14px',
                 color: '#6c63ff',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '8px'
             }}
         >
             <i className="fas fa-store"></i>
             Você tem um restaurante? Quer usar nosso sistema?
         </Link>
     </div>

     4.3 Rota Pública

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/App.tsx

     // Importar
     import RegisterRestaurant from './features/auth/RegisterRestaurant';

     // Adicionar rota (junto com /login, /register)
     <Route path="/register-restaurant" element={<RegisterRestaurant />} />

     ---
     👨‍💼 5. FRONTEND - PAINEL ADMIN

     5.1 Componente SolicitacoesRestaurante.tsx

     Criar arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/admin/SolicitacoesRestaurante.tsx

     Características:
     - Filtro por status (Todos/Pendente/Aprovado/Rejeitado)
     - Tabela responsiva com badges de status
     - Modal de Detalhes: Exibe todos os 9 campos
     - Modal de Aprovação: Exibe credenciais geradas + botão copiar
     - Modal de Rejeição: Campo textarea para motivo
     - Loading states
     - Alerts de sucesso/erro

     Estrutura:
     import React, { useState, useEffect } from 'react';
     import { Button, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
     import api from '../../services/api';

     const SolicitacoesRestaurante: React.FC = () => {
         // Estados: solicitacoes[], filtro, modals, loading
         // useEffect: fetchSolicitacoes()
         // handleAprovar, handleRejeitar, handleCopiarCredenciais

         return (/* Lista + 3 modais */);
     };

     5.2 Rota Admin

     Arquivo: /home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/App.tsx

     // Importar
     import SolicitacoesRestaurante from './features/admin/SolicitacoesRestaurante';

     // Adicionar rota (dentro de AdminRoute, junto com /admin/users, etc.)
     <Route path="solicitacoes-restaurante" element={<SolicitacoesRestaurante />} />

     ---
     📂 Arquivos Críticos para Implementação

     Backend (5 arquivos):

     1. /backend/kaizen_app/models.py - Adicionar 2 novos modelos + atualizar enum
     2. /backend/kaizen_app/services.py - Adicionar 5 funções
     3. /backend/kaizen_app/controllers.py - Criar blueprint + 5 endpoints
     4. /backend/kaizen_app/__init__.py - Registrar public_bp
     5. /backend/migrations/ - Nova migration (gerada automaticamente)

     Frontend (5 arquivos):

     6. /frontend/src/features/auth/RegisterRestaurant.tsx - CRIAR NOVO
     7. /frontend/src/features/admin/SolicitacoesRestaurante.tsx - CRIAR NOVO
     8. /frontend/src/features/auth/Login.tsx - Adicionar link (1 div)
     9. /frontend/src/App.tsx - Adicionar 2 rotas
     10. /frontend/src/features/auth/Register.module.css - Reutilizar estilos existentes

     ---
     ✅ Checklist de Testes

     Backend:

     - Criar solicitação com dados válidos retorna 201
     - Validações rejeitam campos vazios/inválidos
     - Duplicata de email responsável (pendente) retorna 409
     - Notificação enviada para SUPER_ADMIN
     - Listar solicitações com filtros funciona
     - Aprovar cria restaurante + admin + gera senha
     - Rejeitar salva motivo corretamente
     - Apenas SUPER_ADMIN acessa endpoints admin

     Frontend:

     - Formulário renderiza com 9 campos
     - Máscaras de telefone/CNPJ funcionam
     - Validações client-side bloqueiam submit
     - Tela de sucesso exibe e redireciona
     - Link no login está visível e funcional
     - Painel admin lista solicitações
     - Filtros de status funcionam
     - Modal de aprovação exibe credenciais
     - Botão copiar credenciais funciona
     - Modal de rejeição exige motivo

     ---
     🔗 Integrações

     Notificações:

     - Usar função existente criar_notificacao() (services.py linha 6283)
     - Tipo: TipoNotificacao.SOLICITACAO_RESTAURANTE
     - Destinatários: Usuario.query.filter_by(role=UserRoles.SUPER_ADMIN, ativo=True)

     Geração de Senha:

     import secrets, string
     senha = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

     Envio de Credenciais:

     - Implementado: Manual (SUPER_ADMIN copia e envia)
     - Futuro: Integração com Flask-Mail ou Twilio

● Perfeito! O plano foi aprovado. Vou criar uma todo list para rastrear o progresso:

● Pronto! Plano aprovado e todo list criado com 12 tarefas.

  Próximas ações:

  Vou começar a implementação pela FASE 1 (Backend Database). Você quer que eu:

  1. ✅ Adicione os modelos no banco de dados
  2. ✅ Crie a migration
  3. ✅ Depois passe para o services.py (FASE 2)

  Ou prefere que eu espere para fazer algo específico antes de continuar?

  Todos
  ☐ FASE 1: Adicionar enum StatusSolicitacaoRestaurante em models.py
  ☐ FASE 1: Adicionar modelo SolicitacaoRestaurante em models.py
  ☐ FASE 1: Atualizar enum TipoNotificacao em models.py
  ☐ FASE 1: Criar e aplicar migration do banco de dados
  ☐ FASE 2: Implementar 5 funções em services.py
  ☐ FASE 3: Criar blueprint público e endpoints em controllers.py
  ☐ FASE 3: Registrar public_bp em __init__.py
  ☐ FASE 4: Criar componente RegisterRestaurant.tsx
  ☐ FASE 4: Adicionar link no Login.tsx e rota em App.tsx
  ☐ FASE 5: Criar componente SolicitacoesRestaurante.tsx
  ☐ FASE 5: Adicionar rota admin em App.tsx
  ☐ FASE 6: Executar testes end-to-end

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> Começa a implementação agora                                                                                                                       ↵ send
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)





● ✅ FASE 1 completa! Database models e migration criados
  ✅ FASE 2 completa! 5 funções em services.py implementadas

  Vou continuar com FASE 3: Backend API (Controllers + Blueprint público) em sequência. Deixa eu agora adicionar os endpoints em controllers.py!

  Todos
  ☒ FASE 1: Adicionar enum StatusSolicitacaoRestaurante em models.py
  ☒ FASE 1: Adicionar modelo SolicitacaoRestaurante em models.py
  ☒ FASE 1: Atualizar enum TipoNotificacao em models.py
  ☒ FASE 1: Criar e aplicar migration do banco de dados
  ☐ FASE 2: Implementar 5 funções em services.py
  ☐ FASE 3: Criar blueprint público e endpoints em controllers.py
  ☐ FASE 3: Registrar public_bp em __init__.py
  ☐ FASE 4: Criar componente RegisterRestaurant.tsx
  ☐ FASE 4: Adicionar link no Login.tsx e rota em App.tsx
  ☐ FASE 5: Criar componente SolicitacoesRestaurante.tsx
  ☐ FASE 5: Adicionar rota admin em App.tsx
  ☐ FASE 6: Executar testes end-to-end