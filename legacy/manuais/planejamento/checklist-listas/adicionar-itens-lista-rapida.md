 adicionar a funcionalidade de sugerir novos itens durante a criação de lista rápida. Deixe-me resumir:

  Contexto:
  - Na tela de criar lista rápida (CriarListaRapida.tsx)
  - Tanto colaborador quanto admin podem estar usando

  Funcionalidade solicitada:
  1. Adicionar um botão/opção para "Sugerir Novo Item" quando o item não existe no catálogo
  2. Ao sugerir, mostrar um formulário/modal com:
    - Nome do item
    - Unidade
    - Checkbox/opção: "Cadastrar este item no sistema" OU "Usar apenas nesta lista"
  3. Dois comportamentos:
    - Se marcado "Cadastrar no sistema": Cria uma sugestão que vai para /admin/sugestoes para o admin aprovar
    - Se marcado "Apenas nesta lista": Adiciona o item temporariamente só naquela lista rápida específica (não fica no catálogo global)

  Integração:
  - Usa o sistema de sugestões existente que já tem no projeto
  - Itens sugeridos aparecem na tela de "Sugestões de Itens" para aprovação do admin









   Plano: Permitir Sugestão de Itens Durante Criação de Lista Rápida

 Problema Identificado

 Atualmente, ao criar lista rápida, usuários só podem selecionar itens que já existem no catálogo global (ListaMaeItem). Não há como:
 1. Sugerir um novo item para ser cadastrado no sistema
 2. Adicionar um item temporário apenas para aquela lista específica

 Requisitos do Usuário

 Funcionalidade solicitada:
 - Adicionar botão "Sugerir Novo Item" na tela de criar lista rápida
 - Modal/formulário com:
   - Nome do item
   - Unidade de medida
   - Checkbox: "Cadastrar este item no sistema" vs "Usar apenas nesta lista"

 Dois comportamentos:
 1. Se marcado "Cadastrar no sistema": Cria sugestão que vai para admin aprovar em /admin/sugestoes
 2. Se marcado "Apenas nesta lista": Adiciona item temporário só naquela lista rápida (não fica no catálogo global)

 Limitações Atuais do Sistema

 1. Sistema de Sugestões Atual

 Modelo: SugestaoItem (backend/kaizen_app/models.py linha 388)

 Problema: lista_id é NOT NULL (linha 397) - sugestões DEVEM estar vinculadas a uma lista tradicional de compras. Não funciona para listas rápidas.

 Campos atuais:
 - usuario_id: Quem sugeriu
 - lista_id: OBRIGATÓRIO - FK para tabela 'listas' (listas tradicionais)
 - nome_item: Nome do item sugerido
 - unidade: Unidade de medida
 - quantidade: Quantidade
 - mensagem_usuario: Mensagem opcional
 - status: PENDENTE/APROVADA/REJEITADA
 - item_global_id: Preenchido após aprovação

 2. Sistema de Listas Rápidas Atual

 Modelo: ListaRapidaItem (backend/kaizen_app/models.py linha 554)

 Problema: item_global_id é NOT NULL (linha 564) - itens DEVEM existir no catálogo global. Não suporta itens temporários.

 Campos atuais:
 - lista_rapida_id: FK para ListaRapida
 - item_global_id: OBRIGATÓRIO - FK para lista_mae_itens
 - prioridade: PREVENCAO/PRECISA_COMPRAR/URGENTE
 - observacao: Observação opcional

 Soluções Possíveis

 Opção A: Modificar SugestaoItem para Suportar Listas Rápidas

 Mudanças no modelo:
 # backend/kaizen_app/models.py
 class SugestaoItem(db.Model):
     # ... campos existentes ...
     lista_id = db.Column(db.Integer, db.ForeignKey('listas.id'), nullable=True)  # Tornar NULLABLE
     lista_rapida_id = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id'), nullable=True)  # NOVO
     # ... resto ...

 Vantagens:
 - ✅ Reutiliza sistema de aprovação existente
 - ✅ Admin já tem tela para gerenciar sugestões
 - ✅ Mesma lógica de aprovação (cria ListaMaeItem)

 Desvantagens:
 - ⚠️ Precisa de migração
 - ⚠️ Precisa adicionar validação: lista_id OU lista_rapida_id (um dos dois obrigatório)
 - ⚠️ Após aprovação, como vincular item à lista rápida? (ListaRapidaItem ainda requer item_global_id)

 Opção B: Adicionar Suporte a Itens Temporários em ListaRapidaItem

 Mudanças no modelo:
 # backend/kaizen_app/models.py
 class ListaRapidaItem(db.Model):
     # ... campos existentes ...
     item_global_id = db.Column(db.Integer, db.ForeignKey('lista_mae_itens.id'), nullable=True)  # Tornar NULLABLE
     item_nome_temp = db.Column(db.String(200), nullable=True)  # NOVO - nome do item temporário
     item_unidade_temp = db.Column(db.String(50), nullable=True)  # NOVO - unidade do item temporário
     # ... resto ...

 Validação: item_global_id OU (item_nome_temp + item_unidade_temp) - um dos dois obrigatório

 Vantagens:
 - ✅ Simples para "usar apenas nesta lista"
 - ✅ Não quebra lógica existente (itens globais continuam com item_global_id)
 - ✅ Não precisa modificar sistema de sugestões

 Desvantagens:
 - ⚠️ Precisa de migração
 - ⚠️ Itens temporários não aparecem em buscas de outros usuários
 - ⚠️ Se usuário quiser "cadastrar no sistema", ainda precisa criar sugestão separadamente

 Opção C: Combinar Opções A e B (RECOMENDADO)

 Implementação completa:

 1. Modificar ListaRapidaItem para suportar itens temporários (Opção B)
 2. Modificar SugestaoItem para suportar listas rápidas (Opção A)
 3. Frontend: Modal com checkbox que decide qual caminho seguir

 Fluxo:
 - "Apenas nesta lista": Cria ListaRapidaItem com item_nome_temp + item_unidade_temp (sem item_global_id)
 - "Cadastrar no sistema": Cria SugestaoItem vinculada à lista rápida + cria ListaRapidaItem temporário enquanto aguarda aprovação

 Vantagens:
 - ✅ Suporta ambos os casos de uso
 - ✅ Itens temporários podem ser "promovidos" a sugestões depois
 - ✅ Flexibilidade máxima

 Desvantagens:
 - ⚠️ Mais complexo
 - ⚠️ Duas migrações necessárias

 Decisão de Implementação (RECOMENDADA: Opção C)

 Backend - Mudanças Necessárias

 1. Migração para ListaRapidaItem

 Arquivo: backend/migrations/versions/XXXXX_add_temp_items_to_lista_rapida.py (novo)

 def upgrade():
     with op.batch_alter_table('listas_rapidas_itens') as batch_op:
         batch_op.alter_column('item_global_id', nullable=True)
         batch_op.add_column(sa.Column('item_nome_temp', sa.String(200), nullable=True))
         batch_op.add_column(sa.Column('item_unidade_temp', sa.String(50), nullable=True))

 def downgrade():
     with op.batch_alter_table('listas_rapidas_itens') as batch_op:
         batch_op.drop_column('item_unidade_temp')
         batch_op.drop_column('item_nome_temp')
         batch_op.alter_column('item_global_id', nullable=False)

 2. Migração para SugestaoItem

 Arquivo: backend/migrations/versions/XXXXX_add_lista_rapida_to_sugestoes.py (novo)

 def upgrade():
     with op.batch_alter_table('sugestoes_itens') as batch_op:
         batch_op.alter_column('lista_id', nullable=True)
         batch_op.add_column(sa.Column('lista_rapida_id', sa.Integer, sa.ForeignKey('listas_rapidas.id', ondelete='CASCADE'), nullable=True))

 def downgrade():
     with op.batch_alter_table('sugestoes_itens') as batch_op:
         batch_op.drop_column('lista_rapida_id')
         batch_op.alter_column('lista_id', nullable=False)

 3. Atualizar Modelo ListaRapidaItem

 Arquivo: backend/kaizen_app/models.py (linha 554+)

 class ListaRapidaItem(db.Model, SerializerMixin):
     # ... campos existentes ...
     item_global_id = db.Column(db.Integer, db.ForeignKey('lista_mae_itens.id', ondelete='CASCADE'), nullable=True)  # ALTERADO
     item_nome_temp = db.Column(db.String(200), nullable=True)  # NOVO
     item_unidade_temp = db.Column(db.String(50), nullable=True)  # NOVO
     # ... resto ...

     def validate(self):
         """Valida que item_global_id OU (item_nome_temp E item_unidade_temp) estão presentes."""
         if not self.item_global_id and not (self.item_nome_temp and self.item_unidade_temp):
             raise ValueError("Item deve ter item_global_id OU (item_nome_temp E item_unidade_temp)")

 4. Atualizar Modelo SugestaoItem

 Arquivo: backend/kaizen_app/models.py (linha 388+)

 class SugestaoItem(db.Model, SerializerMixin):
     # ... campos existentes ...
     lista_id = db.Column(db.Integer, db.ForeignKey('listas.id', ondelete='CASCADE'), nullable=True)  # ALTERADO
     lista_rapida_id = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id', ondelete='CASCADE'), nullable=True)  # NOVO
     # ... resto ...

     def validate(self):
         """Valida que lista_id OU lista_rapida_id está presente."""
         if not self.lista_id and not self.lista_rapida_id:
             raise ValueError("Sugestão deve ter lista_id OU lista_rapida_id")

 5. Novo Service: Criar Item Temporário

 Arquivo: backend/kaizen_app/services.py

 def adicionar_item_temporario_lista_rapida(lista_rapida_id: int, data: dict):
     """Adiciona item temporário (não do catálogo global) a uma lista rápida."""
     from kaizen_app.models import ListaRapida, ListaRapidaItem, PrioridadeItem

     lista = ListaRapida.query.get(lista_rapida_id)
     if not lista:
         raise ValueError("Lista rápida não encontrada")

     if lista.status != StatusListaRapida.RASCUNHO:
         raise ValueError("Só é possível adicionar itens em listas com status RASCUNHO")

     # Criar item temporário
     item = ListaRapidaItem(
         lista_rapida_id=lista_rapida_id,
         item_global_id=None,  # Item temporário
         item_nome_temp=data['nome_item'],
         item_unidade_temp=data['unidade'],
         prioridade=PrioridadeItem[data.get('prioridade', 'PREVENCAO').upper()],
         observacao=data.get('observacao')
     )

     db.session.add(item)
     db.session.commit()

     return item.to_dict()

 6. Modificar Service: Criar Sugestão para Lista Rápida

 Arquivo: backend/kaizen_app/services.py (modificar criar_sugestao_item)

 def criar_sugestao_item(user_id: int, data: dict):
     """Cria sugestão de novo item (para lista tradicional OU rápida)."""
     from kaizen_app.models import SugestaoItem, Lista, ListaRapida

     lista_id = data.get('lista_id')
     lista_rapida_id = data.get('lista_rapida_id')

     # Validação: um dos dois obrigatório
     if not lista_id and not lista_rapida_id:
         raise ValueError("lista_id ou lista_rapida_id é obrigatório")

     if lista_id and lista_rapida_id:
         raise ValueError("Informe apenas lista_id OU lista_rapida_id, não ambos")

     # Validar que lista existe
     if lista_id:
         lista = Lista.query.get(lista_id)
         if not lista:
             raise ValueError("Lista não encontrada")

     if lista_rapida_id:
         lista_rapida = ListaRapida.query.get(lista_rapida_id)
         if not lista_rapida:
             raise ValueError("Lista rápida não encontrada")

     # Criar sugestão
     sugestao = SugestaoItem(
         usuario_id=user_id,
         lista_id=lista_id,
         lista_rapida_id=lista_rapida_id,
         nome_item=data['nome_item'],
         unidade=data['unidade'],
         quantidade=data.get('quantidade', 1.0),
         mensagem_usuario=data.get('mensagem_usuario'),
         status=SugestaoStatus.PENDENTE
     )

     db.session.add(sugestao)
     db.session.commit()

     return sugestao.to_dict()

 7. Novo Endpoint: Adicionar Item Temporário

 Arquivo: backend/kaizen_app/controllers.py

 @auth_bp.route('/listas-rapidas/<int:lista_rapida_id>/itens/temporario', methods=['POST'])
 @jwt_required()
 def adicionar_item_temporario_lista_rapida_route(lista_rapida_id):
     """Adiciona item temporário (não do catálogo) a uma lista rápida."""
     user_id = get_jwt_identity()
     data = request.get_json()

     try:
         item = services.adicionar_item_temporario_lista_rapida(lista_rapida_id, data)
         return jsonify(item), 201
     except ValueError as e:
         return jsonify({"error": str(e)}), 400

 Frontend - Mudanças Necessárias

 1. Adicionar Modal de Sugestão

 Arquivo: frontend/src/features/colaborador/CriarListaRapida.tsx

 Adicionar estados:
 const [mostrarModalSugestao, setMostrarModalSugestao] = useState(false);
 const [novoItemNome, setNovoItemNome] = useState('');
 const [novoItemUnidade, setNovoItemUnidade] = useState('');
 const [cadastrarNoSistema, setCadastrarNoSistema] = useState(true);

 Adicionar função para sugerir item:
 const handleSugerirItem = async () => {
     if (!novoItemNome.trim() || !novoItemUnidade.trim()) {
         alert('Preencha nome e unidade do item');
         return;
     }

     try {
         if (cadastrarNoSistema) {
             // Criar sugestão para admin aprovar
             await api.post('/auth/sugestoes', {
                 lista_rapida_id: listaRapidaId, // ID da lista rápida criada
                 nome_item: novoItemNome,
                 unidade: novoItemUnidade,
                 quantidade: 1,
                 mensagem_usuario: 'Sugerido durante criação de lista rápida'
             });

             alert('✅ Sugestão enviada! O admin irá analisar.');
         } else {
             // Adicionar item temporário apenas nesta lista
             await api.post(`/auth/listas-rapidas/${listaRapidaId}/itens/temporario`, {
                 nome_item: novoItemNome,
                 unidade: novoItemUnidade,
                 prioridade: 'prevencao'
             });

             alert('✅ Item adicionado à lista!');
         }

         // Limpar e fechar modal
         setNovoItemNome('');
         setNovoItemUnidade('');
         setMostrarModalSugestao(false);

         // Recarregar itens selecionados
         carregarItensSelecionados();
     } catch (error: any) {
         alert(error.response?.data?.error || 'Erro ao sugerir item');
     }
 };

 Adicionar botão e modal no JSX:
 {/* Botão para sugerir novo item */}
 <button
     type="button"
     className={styles.btnSugerirItem}
     onClick={() => setMostrarModalSugestao(true)}
 >
     <i className="fas fa-plus-circle"></i> Sugerir Novo Item
 </button>

 {/* Modal de Sugestão */}
 <Modal show={mostrarModalSugestao} onHide={() => setMostrarModalSugestao(false)}>
     <Modal.Header closeButton>
         <Modal.Title>Sugerir Novo Item</Modal.Title>
     </Modal.Header>
     <Modal.Body>
         <Form>
             <Form.Group className="mb-3">
                 <Form.Label>Nome do Item *</Form.Label>
                 <Form.Control
                     type="text"
                     value={novoItemNome}
                     onChange={(e) => setNovoItemNome(e.target.value)}
                     placeholder="Ex: Abacaxi"
                 />
             </Form.Group>

             <Form.Group className="mb-3">
                 <Form.Label>Unidade *</Form.Label>
                 <Form.Control
                     type="text"
                     value={novoItemUnidade}
                     onChange={(e) => setNovoItemUnidade(e.target.value)}
                     placeholder="Ex: kg, un, L"
                 />
             </Form.Group>

             <Form.Group className="mb-3">
                 <Form.Check
                     type="checkbox"
                     label="Cadastrar este item no sistema (requer aprovação do admin)"
                     checked={cadastrarNoSistema}
                     onChange={(e) => setCadastrarNoSistema(e.target.checked)}
                 />
                 {!cadastrarNoSistema && (
                     <Form.Text className="text-muted">
                         Item será usado apenas nesta lista e não ficará disponível para outros usuários.
                     </Form.Text>
                 )}
             </Form.Group>
         </Form>
     </Modal.Body>
     <Modal.Footer>
         <Button variant="secondary" onClick={() => setMostrarModalSugestao(false)}>
             Cancelar
         </Button>
         <Button variant="primary" onClick={handleSugerirItem}>
             Confirmar
         </Button>
     </Modal.Footer>
 </Modal>

 Arquivos a Modificar

 Backend:
 1. backend/migrations/versions/XXXXX_add_temp_items_to_lista_rapida.py (criar)
 2. backend/migrations/versions/XXXXX_add_lista_rapida_to_sugestoes.py (criar)
 3. backend/kaizen_app/models.py - ListaRapidaItem e SugestaoItem
 4. backend/kaizen_app/services.py - adicionar_item_temporario_lista_rapida() e modificar criar_sugestao_item()
 5. backend/kaizen_app/controllers.py - novo endpoint /itens/temporario

 Frontend:
 6. frontend/src/features/colaborador/CriarListaRapida.tsx - adicionar modal e lógica

 Observações Importantes

 1. Itens temporários não aparecem em buscas de outros usuários
 2. Sugestões de listas rápidas vão para a mesma tela de admin (/admin/sugestoes)
 3. Após aprovação, item é adicionado ao catálogo global mas NÃO automaticamente à lista rápida (usuário deve adicionar manualmente)
 4. Conversão para checklist: itens temporários devem usar item_nome_temp e item_unidade_temp em vez de buscar em ListaMaeItem
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌


