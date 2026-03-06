 Plano: Documentar Rota /admin/users (Gerenciamento de Usuários)                                                           

 Contexto

 A rota /admin/users (e rotas relacionadas) nunca foi documentada em detalhe no 24_TELAS_ADMIN.md. A seção 4 existente
 (GerenciarUsuarios.tsx) tem apenas 6 linhas e está parcialmente incorreta (menciona "Rejeitar" e "Filtro por role" que não
 existem). O objetivo é substituir/expandir essa seção com documentação completa no mesmo padrão da 8.2 e 8.3.

 Arquivo a modificar

 manuais/replicando-app/24_TELAS_ADMIN.md — substituir o conteúdo da seção 4.

 Estrutura de rotas (3 componentes)

 ┌───────────────────────────┬───────────────────────┬─────────────────────────────────────────┐
 │           Rota            │      Componente       │                  Papel                  │
 ├───────────────────────────┼───────────────────────┼─────────────────────────────────────────┤
 │ /admin/gerenciar-usuarios │ GerenciarUsuarios.tsx │ Hub com 3 cards de navegação            │
 ├───────────────────────────┼───────────────────────┼─────────────────────────────────────────┤
 │ /admin/users              │ UserManagement.tsx    │ Tabela principal + todos os modais CRUD │
 ├───────────────────────────┼───────────────────────┼─────────────────────────────────────────┤
 │ /admin/users/new          │ CriarUsuario.tsx      │ Formulário standalone de criação        │
 └───────────────────────────┴───────────────────────┴─────────────────────────────────────────┘

 O que adicionar (substituindo seção 4 atual)

 4. GerenciarUsuarios.tsx (Hub de Navegação)

 - Rota: /admin/gerenciar-usuarios
 - Arquivo: frontend/src/features/admin/GerenciarUsuarios.tsx
 - Sem estado, apenas 3 cards de navegação (Usuários Cadastrados / Pendentes / Criar)
 - Layout ASCII

 4.1 UserManagement.tsx (Tabela Principal)

 - Rota: /admin/users
 - Arquivo: frontend/src/features/admin/UserManagement.tsx
 - Auth: ADMIN ou SUPER_ADMIN
 - Layout ASCII completo (tabela + ações por linha)
 - Colunas da tabela: ID, Nome, Email, Perfil, Restaurante (SUPER_ADMIN only), Aprovação, Status
 - Ações por linha: Aprovar | Alterar (restaurante, SUPER_ADMIN) | Copiar | WhatsApp | Editar | Desativar/Reativar | Deletar
 - Todos os modais:
   a. Criar Usuário
   b. Editar Usuário (com botões Alterar Senha / Resetar Senha dentro)
   c. Atribuir Restaurante (SUPER_ADMIN)
   d. Alterar Senha (senha manual)
   e. Copiar Credenciais (textarea + clipboard)
 - Fluxo de aprovação (auto-aprovado vs registro próprio)
 - Soft delete (ativo=False) vs hard delete
 - Regras de papel: ADMIN cria só COLLABORATOR; SUPER_ADMIN cria ADMIN/COLLABORATOR; ninguém cria SUPER_ADMIN via API
 - Todos os endpoints

 4.2 CriarUsuario.tsx (Formulário Standalone)

 - Rota: /admin/users/new
 - Arquivo: frontend/src/features/admin/CriarUsuario.tsx
 - Layout ASCII
 - Campos: Nome, Username (opt), Email, Restaurante (SUPER_ADMIN), Tipo de Conta, Senha, Confirmar Senha
 - Validações
 - Toggle de visibilidade de senha
 - Redirect 1.5s após sucesso
 - Endpoints utilizados

 Endpoints consolidados (tabela)

 ┌────────┬─────────────────────────────────────────┬─────────────────────────────────────────────────────┐
 │ Método │                Endpoint                 │                      Descrição                      │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ GET    │ /admin/users                            │ Listar usuários (filtro por restaurante_id, status) │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ POST   │ /admin/users/{id}/approve               │ Aprovar usuário pendente                            │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ PUT    │ /admin/users/{id}                       │ Editar nome/email/role                              │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ DELETE │ /admin/users/{id}                       │ Deletar permanentemente                             │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ POST   │ /admin/users/{id}/deactivate            │ Desativar (ativo=False)                             │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ POST   │ /admin/users/{id}/reactivate            │ Reativar                                            │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ GET    │ /admin/users/{id}/compartilhar-whatsapp │ Gerar texto formatado com credenciais               │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ POST   │ /admin/create_user                      │ Criar usuário (autenticado)                         │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ PUT    │ /admin/users/{id}/atribuir-restaurante  │ Alterar restaurante (SUPER_ADMIN)                   │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ POST   │ /admin/users/criar-admin-restaurante    │ Criar ADMIN (SUPER_ADMIN)                           │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ PUT    │ /admin/usuarios/{id}/alterar-senha      │ Alterar senha manualmente                           │
 ├────────┼─────────────────────────────────────────┼─────────────────────────────────────────────────────┤
 │ POST   │ /admin/usuarios/{id}/resetar-senha      │ Resetar senha (gera aleatória)                      │
 └────────┴─────────────────────────────────────────┴─────────────────────────────────────────────────────┘

 Entrada no Resumo de Arquivos (atualizar linha de GerenciarUsuarios.tsx)

 Arquivos críticos

 - frontend/src/features/admin/GerenciarUsuarios.tsx
 - frontend/src/features/admin/UserManagement.tsx
 - frontend/src/features/admin/CriarUsuario.tsx
 - backend/kaizen_app/controllers.py (admin_bp, rotas de users)
 - backend/kaizen_app/services.py (funções listadas acima)
 - backend/kaizen_app/models.py (Usuario, UserRoles)
 - manuais/replicando-app/24_TELAS_ADMIN.md (seção 4 a substituir)

 Verificação

 - Conferir que a seção 4 existente foi totalmente substituída (não duplicada)
 - Conferir que a entrada no Resumo de Arquivos inclui os 3 componentes
 - Conferir que o posicionamento numérico (4, 4.1, 4.2) não conflita com seções vizinhas (3 e 5)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌