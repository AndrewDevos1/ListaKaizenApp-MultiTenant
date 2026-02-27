● Perfeito! Criei um plano completo e detalhado para implementar a funcionalidade de seleção de restaurante pelo SUPER_ADMIN.

  📋 Resumo do Plano:

  Backend:

  1. Migration: Adicionar coluna restaurante_id na tabela convite_tokens
  2. Model: Adicionar campo e relacionamento com Restaurante
  3. Services: Modificar lógica para aceitar e validar restaurante_id
  4. Controllers: Passar role do admin para distinguir SUPER_ADMIN

  Frontend:

  1. GerarConvite.tsx:
    - Adicionar dropdown de restaurantes (só para SUPER_ADMIN)
    - Validação obrigatória para SUPER_ADMIN
    - Atualizar histórico com coluna Restaurante

  O plano está detalhado com código completo para cada etapa! 🎯

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plano: SUPER_ADMIN Escolher Restaurante ao Criar Convite

 Contexto

 O sistema de convites já está implementado e funcionando. Atualmente:
 - Admin: cria convite → usuário vai para o restaurante do admin
 - SUPER_ADMIN: cria convite → usuário vai para o restaurante do SUPER_ADMIN

 Nova Funcionalidade Solicitada

 Permitir que SUPER_ADMIN escolha para qual restaurante está convidando o usuário.

 Requisitos:

 1. ✅ SUPER_ADMIN: vê dropdown "Restaurante" com todos os restaurantes (obrigatório)
 2. ✅ Admin normal: NÃO vê esse campo, convida sempre para seu próprio restaurante
 3. ✅ Validação: SUPER_ADMIN deve obrigatoriamente escolher um restaurante

 Arquivos a Modificar

 Backend (3 arquivos):

 1. Migration: Adicionar campo restaurante_id à tabela convite_tokens
 2. Models (backend/kaizen_app/models.py): Adicionar campo e relacionamento
 3. Services (backend/kaizen_app/services.py): Modificar lógica de criação e registro
 4. Controllers (backend/kaizen_app/controllers.py): Passar role do admin

 Frontend (1 arquivo):

 1. GerarConvite.tsx (frontend/src/features/admin/GerarConvite.tsx): Adicionar dropdown condicional

 ---
 Implementação Detalhada

 1. Backend - Migration

 Arquivo: backend/migrations/versions/XXXX_add_restaurante_to_convite_tokens.py

 """Add restaurante_id to convite_tokens

 Revision ID: XXXX
 Revises: c1d2e3f4g5h6
 Create Date: 2026-01-03
 """

 from alembic import op
 import sqlalchemy as sa

 revision = 'XXXX'
 down_revision = 'c1d2e3f4g5h6'

 def upgrade():
     # Adicionar coluna restaurante_id
     op.add_column('convite_tokens',
         sa.Column('restaurante_id', sa.Integer(), nullable=True)
     )

     # Adicionar foreign key
     op.create_foreign_key(
         'fk_convite_restaurante',
         'convite_tokens', 'restaurantes',
         ['restaurante_id'], ['id'],
         ondelete='SET NULL'
     )

     # Preencher valores existentes com o restaurante do criador
     op.execute("""
         UPDATE convite_tokens
         SET restaurante_id = (
             SELECT restaurante_id
             FROM usuarios
             WHERE usuarios.id = convite_tokens.criado_por_id
         )
     """)

 def downgrade():
     op.drop_constraint('fk_convite_restaurante', 'convite_tokens', type_='foreignkey')
     op.drop_column('convite_tokens', 'restaurante_id')

 2. Backend - Model

 Arquivo: backend/kaizen_app/models.py

 Adicionar campo:
 class ConviteToken(db.Model, SerializerMixin):
     # ... campos existentes ...

     # NOVO CAMPO
     restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)

     # NOVO RELACIONAMENTO
     restaurante = db.relationship('Restaurante', backref=db.backref('convites', lazy='dynamic'))

 Atualizar to_dict():
 def to_dict(self):
     return {
         # ... campos existentes ...
         "restaurante_id": self.restaurante_id,
         "restaurante_nome": self.restaurante.nome if self.restaurante else None,
     }

 3. Backend - Services

 Arquivo: backend/kaizen_app/services.py

 Modificar criar_convite_usuario():

 def criar_convite_usuario(admin_id: int, role: str, admin_role: str, restaurante_id: int = None):
     """Cria um novo token de convite para registro de usuário."""
     import os
     from flask import current_app

     # Validar role
     role_upper = role.upper()
     if role_upper not in ['ADMIN', 'COLLABORATOR', 'SUPER_ADMIN']:
         return {"error": "Role inválido. Use ADMIN, COLLABORATOR ou SUPER_ADMIN"}, 400

     # Determinar restaurante_id
     if admin_role == 'SUPER_ADMIN':
         # SUPER_ADMIN deve fornecer restaurante_id
         if not restaurante_id:
             return {"error": "SUPER_ADMIN deve especificar o restaurante"}, 400

         # Validar que o restaurante existe
         restaurante = Restaurante.query.filter_by(id=restaurante_id, deletado=False).first()
         if not restaurante:
             return {"error": "Restaurante não encontrado"}, 404

         final_restaurante_id = restaurante_id
     else:
         # Admin normal: usa o próprio restaurante
         final_restaurante_id = _get_usuario_restaurante_id(admin_id)

     # Converter string para enum
     role_enum = UserRoles[role_upper]

     # Gerar token único
     token = ConviteToken.gerar_token()

     # Criar convite
     convite = ConviteToken(
         token=token,
         role=role_enum,
         criado_por_id=admin_id,
         restaurante_id=final_restaurante_id  # NOVO
     )

     db.session.add(convite)
     db.session.commit()

     # Gerar link completo
     base_url = os.environ.get('FRONTEND_URL', 'https://kaizen-compras.up.railway.app')
     link_convite = f"{base_url}/convite?token={token}"

     return {
         "id": convite.id,
         "token": token,
         "link": link_convite,
         "role": role_upper,
         "restaurante_id": final_restaurante_id,
         "restaurante_nome": convite.restaurante.nome if convite.restaurante else None,
         "criado_em": convite.criado_em.strftime('%d/%m/%Y %H:%M'),
         "message": "Convite criado com sucesso!"
     }, 201

 Modificar register_user_com_convite():

 def register_user_com_convite(data):
     """Registra usuário usando token de convite (auto-aprovado)."""
     # ... validações existentes ...

     # Criar usuário com role e restaurante do convite
     new_user = Usuario(
         nome=data['nome'],
         email=data['email'],
         senha_hash=hashed_password,
         role=convite.role,
         aprovado=True,
         restaurante_id=convite.restaurante_id  # ⚠️ MUDANÇA: Usa restaurante do convite
     )

     # ... resto do código ...

 4. Backend - Controllers

 Arquivo: backend/kaizen_app/controllers.py

 Modificar endpoint criar_convite():

 @admin_bp.route('/convites', methods=['POST'])
 @admin_required()
 def criar_convite():
     """POST /api/admin/convites - Cria novo convite de usuário."""
     data = request.get_json()

     if not data or 'role' not in data:
         return jsonify({"error": "Role é obrigatório"}), 400

     admin_id = get_user_id_from_jwt()
     claims = get_jwt()
     admin_role = claims.get('role')  # NOVO: Pegar role do admin

     # NOVO: Pegar restaurante_id se fornecido
     restaurante_id = data.get('restaurante_id')

     response, status_code = services.criar_convite_usuario(
         admin_id,
         data['role'],
         admin_role,          # NOVO
         restaurante_id       # NOVO
     )
     return jsonify(response), status_code

 5. Frontend - GerarConvite.tsx

 Arquivo: frontend/src/features/admin/GerarConvite.tsx

 Adicionar estados:
 const { user: authUser } = useAuth();
 const isSuperAdmin = authUser?.role === 'SUPER_ADMIN';

 const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
 const [restauranteSelecionado, setRestauranteSelecionado] = useState<string>('');
 const [loadingRestaurantes, setLoadingRestaurantes] = useState(false);

 interface Restaurante {
     id: number;
     nome: string;
     slug: string;
 }

 Carregar restaurantes (só para SUPER_ADMIN):
 useEffect(() => {
     if (isSuperAdmin) {
         carregarRestaurantes();
     }
 }, [isSuperAdmin]);

 const carregarRestaurantes = async () => {
     setLoadingRestaurantes(true);
     try {
         const response = await api.get('/admin/restaurantes');
         setRestaurantes(response.data.restaurantes || []);
     } catch (err: any) {
         console.error('Erro ao carregar restaurantes:', err);
     } finally {
         setLoadingRestaurantes(false);
     }
 };

 Modificar validação e envio:
 const handleGerarConvite = async () => {
     setError('');
     setLinkGerado('');
     setCopiado(false);

     // Validar restaurante para SUPER_ADMIN
     if (isSuperAdmin && !restauranteSelecionado) {
         setError('Você deve selecionar um restaurante');
         return;
     }

     setLoading(true);

     try {
         const payload: any = { role };

         // Adicionar restaurante_id se SUPER_ADMIN
         if (isSuperAdmin) {
             payload.restaurante_id = parseInt(restauranteSelecionado);
         }

         const response = await api.post('/admin/convites', payload);
         setLinkGerado(response.data.link);

         // Limpar seleção após sucesso
         if (isSuperAdmin) {
             setRestauranteSelecionado('');
         }

         carregarConvites();
     } catch (err: any) {
         setError(err.response?.data?.error || 'Erro ao gerar convite');
     } finally {
         setLoading(false);
     }
 };

 Adicionar campo no JSX (antes do campo Role):
 {isSuperAdmin && (
     <Form.Group className="mb-3">
         <Form.Label>
             Restaurante <span className="text-danger">*</span>
         </Form.Label>
         <Form.Select
             value={restauranteSelecionado}
             onChange={(e) => setRestauranteSelecionado(e.target.value)}
             disabled={loadingRestaurantes}
             required
         >
             <option value="">Selecione um restaurante...</option>
             {restaurantes.map((rest) => (
                 <option key={rest.id} value={rest.id}>
                     {rest.nome}
                 </option>
             ))}
         </Form.Select>
         <Form.Text className="text-muted">
             Escolha para qual restaurante você está convidando este usuário
         </Form.Text>
     </Form.Group>
 )}

 Atualizar histórico para mostrar restaurante:
 <Table hover>
     <thead>
         <tr>
             {isSuperAdmin && <th>Restaurante</th>}
             <th>Tipo</th>
             <th>Criado em</th>
             {/* ... outras colunas ... */}
         </tr>
     </thead>
     <tbody>
         {convites.map((convite) => (
             <tr key={convite.id}>
                 {isSuperAdmin && (
                     <td>
                         <Badge bg="secondary">
                             {convite.restaurante_nome || '-'}
                         </Badge>
                     </td>
                 )}
                 {/* ... outras células ... */}
             </tr>
         ))}
     </tbody>
 </Table>

 ---
 Fluxo Completo

 Para ADMIN:

 1. Admin abre /admin/convites
 2. Vê apenas: [Role: ADMIN/COLLABORATOR] [Gerar]
 3. Clica Gerar
 4. Sistema usa automaticamente o restaurante do admin
 5. Usuário convidado vai para o restaurante do admin

 Para SUPER_ADMIN:

 1. SUPER_ADMIN abre /admin/convites
 2. Vê: [Restaurante: dropdown] [Role: ADMIN/COLLABORATOR] [Gerar]
 3. Seleciona restaurante (obrigatório)
 4. Seleciona role
 5. Clica Gerar
 6. Sistema cria convite com restaurante escolhido
 7. Usuário convidado vai para o restaurante selecionado

 ---
 Validações

 Backend:

 - ✅ SUPER_ADMIN deve fornecer restaurante_id
 - ✅ Restaurante deve existir e não estar deletado
 - ✅ Admin normal não pode fornecer restaurante_id (será ignorado)

 Frontend:

 - ✅ Campo restaurante só aparece para SUPER_ADMIN
 - ✅ Validação client-side: restaurante obrigatório para SUPER_ADMIN
 - ✅ Mensagem de erro clara se não selecionado

 ---
 Ordem de Implementação

 1. ✅ Migration (criar coluna e FK)
 2. ✅ Model (adicionar campo e relacionamento)
 3. ✅ Services (modificar criação e registro)
 4. ✅ Controllers (passar role do admin)
 5. ✅ Frontend (adicionar dropdown condicional)
 6. ✅ Testar ambos os fluxos (Admin e SUPER_ADMIN)

 ---
 Impacto em Código Existente

 Convites Já Criados:

 - Migration preenche restaurante_id com base no criador
 - Não quebra convites pendentes

 Comportamento Existente:

 - Admin normal: SEM MUDANÇAS
 - SUPER_ADMIN: NOVO RECURSO (dropdown de restaurantes)

 ---
 Testes Necessários

 1. ✅ Admin cria convite → usuário vai para restaurante do admin
 2. ✅ SUPER_ADMIN escolhe Restaurante A → usuário vai para A
 3. ✅ SUPER_ADMIN tenta criar sem restaurante → erro 400
 4. ✅ Histórico mostra coluna Restaurante (só SUPER_ADMIN)
 5. ✅ Convites antigos ainda funcionam
