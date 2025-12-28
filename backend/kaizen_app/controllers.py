from flask import Blueprint, request, jsonify, send_file
from . import services
from .models import Item, Area, Fornecedor, Estoque
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

# Cria um Blueprint para as rotas de autenticação
auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/admin')
collaborator_bp = Blueprint('collaborator_bp', __name__, url_prefix='/api/collaborator')

# Helper function para obter user_id de forma compatível com tokens antigos e novos
def get_user_id_from_jwt():
    """
    Obtém o user_id do JWT de forma compatível.
    Suporta:
    - Tokens muito antigos: identity = {"id": 1, "role": "ADMIN"}
    - Tokens antigos: identity = 1 (int)
    - Tokens novos: identity = "1" (string)
    """
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        # Token MUITO antigo: identity = {"id": 1, "role": "ADMIN"}
        return identity.get('id')
    elif isinstance(identity, str):
        # Token novo: identity = "1" (string) - converte para int
        return int(identity)
    else:
        # Token antigo: identity = 1 (int)
        return identity

# Decorator para rotas que exigem permissão de administrador
def admin_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            print(f"[DECORATOR] Verificando permissao de admin para {fn.__name__}")
            try:
                # Pega o user_id do campo 'sub' (identity)
                identity = get_jwt_identity()

                # COMPATIBILIDADE: Suporta tokens antigos (identity=dict) e novos (identity=int)
                if isinstance(identity, dict):
                    # Token antigo: identity = {"id": 1, "role": "ADMIN"}
                    print(f"[DECORATOR] Token no formato ANTIGO detectado (identity e dict)")
                    user_id = identity.get('id')
                    role = identity.get('role')
                else:
                    # Token novo: identity = 1 (apenas o ID)
                    user_id = identity
                    # Pega o role dos additional_claims
                    claims = get_jwt()
                    role = claims.get('role')

                print(f"[DECORATOR] User ID: {user_id}, Role: {role}")

                if role != 'ADMIN':
                    print(f"[DECORATOR] Acesso negado - Role: {role}")
                    return jsonify({"error": "Acesso negado. Requer permissão de administrador."}), 403
                print(f"[DECORATOR] Acesso autorizado - Role: ADMIN")
                return fn(*args, **kwargs)
            except Exception as e:
                print(f"[DECORATOR] Erro: {type(e).__name__}: {str(e)}")
                raise
        return decorator
    return wrapper

# Decorator para rotas que exigem permissão de colaborador
def collaborator_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            identity = get_jwt_identity()

            # COMPATIBILIDADE: Suporta tokens antigos (identity=dict) e novos (identity=int)
            if isinstance(identity, dict):
                # Token antigo: identity = {"id": 1, "role": "ADMIN"}
                role = identity.get('role')
            else:
                # Token novo: identity = 1 (apenas o ID)
                claims = get_jwt()
                role = claims.get('role')

            if role not in ['COLLABORATOR', 'ADMIN']:
                return jsonify({"error": "Acesso negado. Requer permissão de colaborador."}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('senha') or not data.get('nome'):
        return jsonify({"error": "Dados incompletos para registro."}), 400
    
    response, status_code = services.register_user(data)
    return jsonify(response), status_code

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('senha'):
        return jsonify({"error": "Dados incompletos para login."}), 400

    response, status_code = services.authenticate_user(data)
    return jsonify(response), status_code

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Endpoint para alterar senha do usuário logado."""
    data = request.get_json()
    user_id = get_user_id_from_jwt()

    if not data or not all(k in data for k in ('senha_atual', 'nova_senha', 'confirmar_senha')):
        return jsonify({"error": "Dados incompletos para alteração de senha."}), 400

    response, status_code = services.change_password(user_id, data)
    return jsonify(response), status_code

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Endpoint para obter perfil do usuário logado."""
    user_id = get_user_id_from_jwt()

    response, status_code = services.get_user_profile(user_id)
    return jsonify(response), status_code

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Endpoint para atualizar perfil do usuário logado."""
    data = request.get_json()
    user_id = get_user_id_from_jwt()

    if not data:
        return jsonify({"error": "Dados não fornecidos."}), 400

    response, status_code = services.update_user_profile(user_id, data)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>/approve', methods=['POST'])
@admin_required()
def approve(user_id):
    response, status_code = services.approve_user(user_id)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required()
def update_user(user_id):
    """Atualiza os dados de um usuário pelo admin."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Dados não fornecidos."}), 400

    response, status_code = services.update_user_by_admin(user_id, data)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required()
def delete_user_route(user_id):
    """Deleta um usuário permanentemente."""
    response, status_code = services.delete_user(user_id)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required()
def deactivate_user_route(user_id):
    """Desativa um usuário (soft delete)."""
    response, status_code = services.deactivate_user(user_id)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>/reactivate', methods=['POST'])
@admin_required()
def reactivate_user_route(user_id):
    """Reativa um usuário desativado."""
    response, status_code = services.reactivate_user(user_id)
    return jsonify(response), status_code

@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_users_route():
    users, _ = services.get_all_users()
    return jsonify([user.to_dict() for user in users])

@admin_bp.route('/create_user', methods=['POST'])
@admin_required()
def create_user_by_admin_route():
    data = request.get_json()

    # Log para debug
    print("=" * 50)
    print("[CONTROLLER] Recebendo requisicao para criar usuario")
    print(f"[CONTROLLER] Dados recebidos: {data}")
    print(f"[CONTROLLER] Tipo dos dados: {type(data)}")

    if data:
        print("[CONTROLLER] Campos presentes:")
        for key, value in data.items():
            print(f"   - {key}: {value} (tipo: {type(value).__name__})")

    # Validação de campos obrigatórios
    required_fields = ('email', 'senha', 'nome', 'role')
    missing_fields = [field for field in required_fields if field not in data]

    if not data:
        print("[ERROR] Erro: Nenhum dado recebido")
        return jsonify({"error": "Nenhum dado recebido."}), 400

    if missing_fields:
        print(f"[ERROR] Erro: Campos obrigatorios ausentes: {missing_fields}")
        return jsonify({
            "error": f"Dados incompletos. Campos obrigatórios ausentes: {', '.join(missing_fields)}"
        }), 400

    print("[OK] Validacao inicial passou, chamando service...")
    response, status_code = services.create_user_by_admin(data)
    print(f"[CONTROLLER] Resposta do service: {response} (status: {status_code})")
    print("=" * 50)

    return jsonify(response), status_code


# [AVISO] ROTA TEMPORARIA SEM AUTENTICACAO - REMOVER DEPOIS!
@admin_bp.route('/create_user_temp', methods=['POST'])
def create_user_temp_route():
    """
    ROTA TEMPORARIA para criar usuario SEM verificacao JWT.
    [AVISO] DEVE SER REMOVIDA apos resolver o problema do token!
    """
    data = request.get_json()

    print("=" * 50)
    print("[TEMP] Criando usuario SEM autenticacao JWT")
    print(f"[TEMP] Dados recebidos: {data}")
    print("=" * 50)

    # Validação de campos obrigatórios
    required_fields = ('email', 'senha', 'nome', 'role')
    missing_fields = [field for field in required_fields if field not in data]

    if not data:
        return jsonify({"error": "Nenhum dado recebido."}), 400

    if missing_fields:
        return jsonify({
            "error": f"Dados incompletos. Campos obrigatórios ausentes: {', '.join(missing_fields)}"
        }), 400

    response, status_code = services.create_user_by_admin(data)
    return jsonify(response), status_code

@admin_bp.route('/dashboard-summary', methods=['GET'])
@admin_required()
def dashboard_summary_route():
    response, status = services.get_dashboard_summary()
    return jsonify(response), status

@admin_bp.route('/activity-summary', methods=['GET'])
@admin_required()
def activity_summary_route():
    response, status = services.get_activity_summary()
    return jsonify(response), status

# Blueprint para a API principal
api_bp = Blueprint('api_bp', __name__, url_prefix='/api/v1')

# --- Rotas de Itens ---
@api_bp.route('/items', methods=['POST'])
@admin_required()
def create_item_route():
    data = request.get_json()
    response, status = services.create_item(data)
    return jsonify(response), status

@api_bp.route('/items', methods=['GET'])
@jwt_required()
def get_items_route():
    print(f"[DEBUG] get_items_route chamado por user: {get_jwt_identity()}")
    items, status = services.get_all_items()
    print(f"[DEBUG] Retornando {len(items)} itens")

    result = []
    for item in items:
        item_dict = item.to_dict()
        if item.fornecedor:
            item_dict['fornecedor'] = {
                'id': item.fornecedor.id,
                'nome': item.fornecedor.nome
            }
        result.append(item_dict)

    return jsonify(result), status

@api_bp.route('/items/<int:item_id>', methods=['GET'])
@admin_required()
def get_item_route(item_id):
    item, _ = services.get_item_by_id(item_id)
    if not item:
        return jsonify({"error": "Item não encontrado"}), 404
    return jsonify(item.to_dict())

@api_bp.route('/items/<int:item_id>', methods=['PUT'])
@admin_required()
def update_item_route(item_id):
    data = request.get_json()
    response, status = services.update_item(item_id, data)
    return jsonify(response), status

@api_bp.route('/items/<int:item_id>', methods=['DELETE'])
@admin_required()
def delete_item_route(item_id):
    response, status = services.delete_item(item_id)
    return jsonify(response), status


# --- Rotas de Áreas ---
@api_bp.route('/areas', methods=['POST'])
@admin_required()
def create_area_route():
    data = request.get_json()
    response, status = services.create_area(data)
    return jsonify(response), status

@api_bp.route('/areas', methods=['GET'])
@jwt_required()
def get_areas_route():
    areas, _ = services.get_all_areas()
    return jsonify([area.to_dict() for area in areas])

@api_bp.route('/areas/<int:area_id>', methods=['GET'])
@admin_required()
def get_area_route(area_id):
    area, _ = services.get_area_by_id(area_id)
    if not area:
        return jsonify({"error": "Área não encontrada"}), 404
    return jsonify(area.to_dict())

@api_bp.route('/areas/<int:area_id>', methods=['PUT'])
@admin_required()
def update_area_route(area_id):
    data = request.get_json()
    response, status = services.update_area(area_id, data)
    return jsonify(response), status

@api_bp.route('/areas/<int:area_id>', methods=['DELETE'])
@admin_required()
def delete_area_route(area_id):
    response, status = services.delete_area(area_id)
    return jsonify(response), status


# --- Rotas de Fornecedores ---
@api_bp.route('/fornecedores', methods=['POST'])
@admin_required()
def create_fornecedor_route():
    data = request.get_json()
    response, status = services.create_fornecedor(data)
    return jsonify(response), status

@api_bp.route('/fornecedores', methods=['GET'])
@jwt_required()
def get_fornecedores_route():
    fornecedores, _ = services.get_all_fornecedores()
    result = []
    for fornecedor in fornecedores:
        fornecedor_dict = fornecedor.to_dict()
        fornecedor_dict['listas'] = [
            {'id': lista.id, 'nome': lista.nome}
            for lista in fornecedor.listas
        ]
        result.append(fornecedor_dict)
    return jsonify(result)

@api_bp.route('/fornecedores/<int:fornecedor_id>', methods=['GET'])
@admin_required()
def get_fornecedor_route(fornecedor_id):
    fornecedor, _ = services.get_fornecedor_by_id(fornecedor_id)
    if not fornecedor:
        return jsonify({"error": "Fornecedor não encontrado"}), 404

    # Serializa o fornecedor e inclui as listas
    fornecedor_dict = fornecedor.to_dict()
    fornecedor_dict['listas'] = [
        {'id': lista.id, 'nome': lista.nome}
        for lista in fornecedor.listas
    ]
    return jsonify(fornecedor_dict)

@api_bp.route('/fornecedores/<int:fornecedor_id>', methods=['PUT'])
@admin_required()
def update_fornecedor_route(fornecedor_id):
    data = request.get_json()
    response, status = services.update_fornecedor(fornecedor_id, data)
    return jsonify(response), status

@api_bp.route('/fornecedores/<int:fornecedor_id>', methods=['DELETE'])
@admin_required()
def delete_fornecedor_route(fornecedor_id):
    response, status = services.delete_fornecedor(fornecedor_id)
    return jsonify(response), status

@api_bp.route('/fornecedores/<int:fornecedor_id>/pedidos-por-lista', methods=['GET'])
@admin_required()
def get_pedidos_fornecedor_por_lista_route(fornecedor_id):
    pedidos, status = services.get_pedidos_fornecedor_por_lista(fornecedor_id)
    return jsonify(pedidos), status

@api_bp.route('/fornecedores/<int:fornecedor_id>/pedidos-consolidados', methods=['GET'])
@admin_required()
def get_pedidos_fornecedor_consolidado_route(fornecedor_id):
    pedidos, status = services.get_pedidos_fornecedor_consolidado(fornecedor_id)
    return jsonify(pedidos), status

@api_bp.route('/fornecedores/export-csv', methods=['GET'])
@admin_required()
def exportar_fornecedores_csv_route():
    """Exporta todos os fornecedores em formato CSV"""
    response, status = services.exportar_fornecedores_csv()
    if status == 200:
        return response['csv'], 200, {
            'Content-Disposition': 'attachment; filename=fornecedores.csv',
            'Content-Type': 'text/csv; charset=utf-8'
        }
    return jsonify(response), status

@api_bp.route('/fornecedores/import-csv', methods=['POST'])
@admin_required()
def importar_fornecedores_csv_route():
    """Importa fornecedores a partir de arquivo CSV"""
    try:
        csv_content = request.data.decode('utf-8')
        response, status = services.importar_fornecedores_csv(csv_content)
        return jsonify(response), status
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- Rotas de Estoque ---


@api_bp.route('/estoque/draft', methods=['POST'])
@jwt_required()
def save_estoque_draft_route():
    data = request.get_json()
    response, status = services.save_estoque_draft(data)
    return jsonify(response), status

# --- Rotas de Pedidos ---

@api_bp.route('/pedidos/me', methods=['GET'])
@jwt_required()
def get_my_pedidos_route():
    user_id = get_user_id_from_jwt()
    pedidos, _ = services.get_pedidos_by_user(user_id)
    return jsonify([p.to_dict() for p in pedidos])


@api_bp.route('/submissoes/me', methods=['GET'])
@jwt_required()
def get_my_submissoes_route():
    """Retorna submissões agrupadas do usuário."""
    user_id = get_user_id_from_jwt()
    submissoes, _ = services.get_submissoes_by_user(user_id)
    
    response = jsonify(submissoes)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@api_bp.route('/pedidos/submit', methods=['POST'])
@jwt_required()
def submit_pedidos_route():
    user_id = get_user_id_from_jwt()
    response, status = services.submit_pedidos(user_id)
    return jsonify(response), status

@admin_bp.route('/pedidos', methods=['GET'])
@admin_required()
def get_all_pedidos_route():
    """Retorna todos os pedidos (com filtro opcional por status via query param)."""
    status_filter = request.args.get('status')  # PENDENTE, APROVADO ou REJEITADO

    if status_filter:
        # Converter string para enum
        try:
            from .models import PedidoStatus
            status_enum = PedidoStatus[status_filter.upper()]
        except KeyError:
            return jsonify({"error": f"Status inválido: {status_filter}"}), 400
        pedidos, _ = services.get_all_pedidos(status_filter=status_enum)
    else:
        pedidos, _ = services.get_all_pedidos()

    return jsonify([p.to_dict() for p in pedidos])


@admin_bp.route('/submissoes', methods=['GET'])
@admin_required()
def get_all_submissoes_route():
    """Retorna todas as submissões com filtro opcional por status."""
    status_filter = request.args.get('status')  # PENDENTE, APROVADO, REJEITADO
    submissoes, _ = services.get_all_submissoes(status_filter)
    return jsonify(submissoes)


@admin_bp.route('/submissoes/<int:submissao_id>/aprovar', methods=['POST'])
@admin_required()
def aprovar_submissao_route(submissao_id):
    """Aprova todos os pedidos de uma submissão."""
    response, status = services.aprovar_submissao(submissao_id)
    return jsonify(response), status


@admin_bp.route('/submissoes/<int:submissao_id>/rejeitar', methods=['POST'])
@admin_required()
def rejeitar_submissao_route(submissao_id):
    """Rejeita todos os pedidos de uma submissão."""
    response, status = services.rejeitar_submissao(submissao_id)
    return jsonify(response), status


@admin_bp.route('/submissoes/<int:submissao_id>/reverter', methods=['POST'])
@admin_required()
def reverter_submissao_route(submissao_id):
    """
    Reverte uma submissão APROVADA ou REJEITADA para PENDENTE.
    Permite que admin reconsidere a decisão.
    """
    response, status = services.reverter_submissao_para_pendente(submissao_id)
    return jsonify(response), status


@admin_bp.route('/submissoes/<int:submissao_id>/editar', methods=['PUT'])
@admin_required()
def editar_quantidades_submissao_route(submissao_id):
    """
    Permite que admin edite as quantidades ATUAIS do estoque de uma submissão PENDENTE.
    Similar ao comportamento do colaborador: edita quantidade_atual, sistema recalcula pedidos.
    Espera JSON: {"items": [{"item_id": 1, "quantidade_atual": 10}, ...]}
    """
    try:
        print(f"[editar_quantidades_submissao_route] Recebendo requisição para submissão #{submissao_id}")
        data = request.get_json()
        
        if not data:
            print(f"[editar_quantidades_submissao_route] ERRO: Nenhum dado JSON recebido")
            return jsonify({"error": "Nenhum dado recebido"}), 400
        
        items_data = data.get('items', [])
        print(f"[editar_quantidades_submissao_route] Items recebidos: {len(items_data)}")
        
        response, status = services.editar_quantidades_submissao(submissao_id, items_data)
        print(f"[editar_quantidades_submissao_route] Resposta: {status}")
        return jsonify(response), status
    except Exception as e:
        print(f"[editar_quantidades_submissao_route] EXCEÇÃO: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao processar edição", "details": str(e)}), 500


@admin_bp.route('/listas/<int:lista_id>/estoque', methods=['GET'])
@admin_required()
def get_estoque_lista_admin_route(lista_id):
    """
    Retorna os itens do estoque de uma lista (para admin editar submissões).
    Mesmo formato usado pelo colaborador.
    """
    response, status = services.get_estoque_lista_admin(lista_id)
    return jsonify(response), status


@admin_bp.route('/pedidos/<int:pedido_id>/aprovar', methods=['POST'])
@admin_required()
def aprovar_pedido_route(pedido_id):
    """Aprova um pedido pendente."""
    response, status = services.aprovar_pedido(pedido_id)
    return jsonify(response), status

@admin_bp.route('/pedidos/<int:pedido_id>/rejeitar', methods=['POST'])
@admin_required()
def rejeitar_pedido_route(pedido_id):
    """Rejeita um pedido pendente."""
    response, status = services.rejeitar_pedido(pedido_id)
    return jsonify(response), status

@admin_bp.route('/pedidos/aprovar-lote', methods=['POST'])
@admin_required()
def aprovar_pedidos_lote_route():
    """Aprova múltiplos pedidos em lote."""
    data = request.get_json()
    pedido_ids = data.get('pedido_ids', [])
    response, status = services.aprovar_pedidos_lote(pedido_ids)
    return jsonify(response), status

@admin_bp.route('/pedidos/rejeitar-lote', methods=['POST'])
@admin_required()
def rejeitar_pedidos_lote_route():
    """Rejeita múltiplos pedidos em lote."""
    data = request.get_json()
    pedido_ids = data.get('pedido_ids', [])
    response, status = services.rejeitar_pedidos_lote(pedido_ids)
    return jsonify(response), status

@admin_bp.route('/pedidos/<int:pedido_id>/editar', methods=['PUT'])
@admin_required()
def editar_pedido_route(pedido_id):
    """Edita um pedido (permite alterar quantidade)."""
    data = request.get_json()
    response, status = services.editar_pedido(pedido_id, data)
    return jsonify(response), status


# --- Rotas de Cotações ---
@api_bp.route('/v1/cotacoes', methods=['POST'])
@admin_required()
def create_quotation_route():
    data = request.get_json()
    if not data or not data.get('fornecedor_id'):
        return jsonify({"error": "O fornecedor_id é obrigatório."}), 400
    response, status = services.create_quotation_from_stock(data['fornecedor_id'])
    return jsonify(response), status

@api_bp.route('/v1/cotacoes', methods=['GET'])
@admin_required()
def get_cotacoes_route():
    cotacoes, _ = services.get_all_cotacoes()
    return jsonify([c.to_dict() for c in cotacoes])

@api_bp.route('/v1/cotacoes/<int:cotacao_id>', methods=['GET'])
@admin_required()
def get_cotacao_route(cotacao_id):
    cotacao, _ = services.get_cotacao_by_id(cotacao_id)
    if not cotacao:
        return jsonify({"error": "Cotação não encontrada"}), 404
    return jsonify(cotacao.to_dict())

@api_bp.route('/v1/cotacao-items/<int:item_id>', methods=['PUT'])
@admin_required()
def update_cotacao_item_price_route(item_id):
    data = request.get_json()
    response, status = services.update_cotacao_item_price(item_id, data)
    return jsonify(response), status
@api_bp.route('/areas/<int:area_id>/estoque', methods=['GET'])
@jwt_required()
def get_estoque_by_area_route(area_id):
    estoque, _ = services.get_estoque_by_area(area_id)
    return jsonify([e.to_dict() for e in estoque])

@api_bp.route('/areas/<int:area_id>/status', methods=['GET'])
@jwt_required()
def get_area_status_route(area_id):
    response, status = services.get_area_status(area_id)
    return jsonify(response), status

@api_bp.route('/estoque/<int:estoque_id>', methods=['PUT'])
@jwt_required() # Permitir que colaboradores atualizem o estoque
def update_estoque_route(estoque_id):
    data = request.get_json()
    response, status = services.update_estoque_item(estoque_id, data)
    return jsonify(response), status


@api_bp.route('/users/stats', methods=['GET'])
@jwt_required()
def get_user_stats_route():
    user_id = get_user_id_from_jwt()
    response, status = services.get_user_stats(user_id)
    return jsonify(response), status

# --- Rotas de Listas ---
@api_bp.route('/listas', methods=['POST'])
@admin_required()
def create_lista_route():
    data = request.get_json()
    response, status = services.create_lista(data)
    return jsonify(response), status

@api_bp.route('/listas', methods=['GET'])
@admin_required()
def get_listas_route():
    listas, status = services.get_all_listas()
    return jsonify(listas), status

@api_bp.route('/listas/<int:lista_id>/assign', methods=['POST'])
@admin_required()
def assign_colaboradores_route(lista_id):
    data = request.get_json()
    response, status = services.assign_colaboradores_to_lista(lista_id, data)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>/unassign', methods=['DELETE'])
@admin_required()
def unassign_colaborador_route(lista_id):
    data = request.get_json()
    response, status = services.unassign_colaborador_from_lista(lista_id, data)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>', methods=['PUT'])
@admin_required()
def update_lista_route(lista_id):
    """Atualiza uma lista existente (nome e/ou descrição)."""
    data = request.get_json()
    response, status = services.update_lista(lista_id, data)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>', methods=['DELETE'])
@admin_required()
def delete_lista_route(lista_id):
    """Move uma lista para a lixeira (soft delete)."""
    response, status = services.delete_lista(lista_id)
    return jsonify(response), status

@admin_bp.route('/listas/deleted', methods=['GET'])
@admin_required()
def get_deleted_listas_route():
    """Retorna todas as listas deletadas (na lixeira)."""
    response, status = services.get_deleted_listas()
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/restore', methods=['POST'])
@admin_required()
def restore_lista_route(lista_id):
    """Restaura uma lista da lixeira."""
    response, status = services.restore_lista(lista_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/permanent-delete', methods=['DELETE'])
@admin_required()
def permanent_delete_lista_route(lista_id):
    """Deleta permanentemente uma lista da lixeira."""
    response, status = services.permanent_delete_lista(lista_id)
    return jsonify(response), status

@admin_bp.route('/listas/permanent-delete-batch', methods=['POST'])
@admin_required()
def permanent_delete_listas_batch_route():
    """Deleta permanentemente múltiplas listas em lote."""
    data = request.get_json()
    lista_ids = data.get('lista_ids', [])
    response, status = services.permanent_delete_listas_batch(lista_ids)
    return jsonify(response), status

# ============================================
# COLLABORATOR ROUTES
# ============================================

@collaborator_bp.route('/dashboard-summary', methods=['GET'])
@collaborator_required()
def collaborator_dashboard_summary_route():
    """Retorna estatísticas do dashboard do colaborador."""
    user_id = get_user_id_from_jwt()
    response, status = services.get_collaborator_dashboard_summary(user_id)
    return jsonify(response), status

@collaborator_bp.route('/minhas-listas-status', methods=['GET'])
@collaborator_required()
def get_minhas_listas_status_route():
    """Retorna status das listas atribuídas ao colaborador."""
    user_id = get_user_id_from_jwt()
    response, status = services.get_minhas_listas_status(user_id)
    return jsonify(response), status

@collaborator_bp.route('/minhas-areas-status', methods=['GET'])
@jwt_required()
def get_minhas_areas_status_route():
    """
    Retorna status das áreas atribuídas ao colaborador.
    Para cada área, mostra última submissão e itens pendentes.
    """
    user_id = get_user_id_from_jwt()
    response, status = services.get_minhas_areas_status(user_id)
    return jsonify(response), status

@collaborator_bp.route('/areas/<int:area_id>', methods=['GET'])
@jwt_required()
def get_area_collaborator_route(area_id):
    """Retorna dados básicos de uma área para o colaborador."""
    area, _ = services.get_area_by_id(area_id)
    if not area:
        return jsonify({"error": "Área não encontrada"}), 404
    return jsonify(area.to_dict())

@collaborator_bp.route('/areas/<int:area_id>/estoque', methods=['GET'])
@jwt_required()
def get_estoque_by_area_collaborator_route(area_id):
    """Retorna itens de estoque de uma área para o colaborador."""
    estoque, _ = services.get_estoque_by_area(area_id)
    return jsonify([e.to_dict() for e in estoque])

# ============================================
# NOVAS ROTAS - LISTAS COM ESTOQUE
# ============================================

@collaborator_bp.route('/minhas-listas', methods=['GET'])
@jwt_required()
def minhas_listas_route():
    """Retorna todas as listas atribuídas ao colaborador."""
    user_id = get_user_id_from_jwt()
    response, status = services.get_minhas_listas(user_id)
    return jsonify(response), status

@collaborator_bp.route('/listas/<int:lista_id>', methods=['GET'])
@jwt_required()
def get_lista_collaborator_route(lista_id):
    """Retorna uma lista específica atribuída ao colaborador."""
    user_id = get_user_id_from_jwt()
    response, status = services.get_lista_colaborador(user_id, lista_id)
    return jsonify(response), status

@collaborator_bp.route('/listas/<int:lista_id>/estoque', methods=['GET'])
@jwt_required()
def get_lista_estoque_collaborator_route(lista_id):
    """Retorna itens de estoque de uma lista para um colaborador."""
    user_id = get_user_id_from_jwt()
    response, status = services.get_estoque_lista_colaborador(user_id, lista_id)
    return jsonify(response), status

@collaborator_bp.route('/estoque/<int:estoque_id>', methods=['PUT'])
@jwt_required()
def update_estoque_collaborator_route(estoque_id):
    """Atualiza a quantidade_atual de um item de estoque."""
    user_id = get_user_id_from_jwt()
    data = request.get_json()
    response, status = services.update_estoque_colaborador(user_id, estoque_id, data)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>/estoque', methods=['GET'])
@jwt_required()
def get_lista_estoque_route(lista_id):
    """Retorna todos os itens (estoques) de uma lista específica."""
    user_id = get_user_id_from_jwt()
    response, status = services.get_estoque_by_lista(lista_id)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>/estoque/submit', methods=['POST'])
@jwt_required()
def submit_lista_estoque_route(lista_id):
    """
    Submete múltiplos itens de estoque de uma lista (CRIA nova submissão).
    Payload: {"items": [{"estoque_id": 1, "quantidade_atual": 5}, ...]}
    """
    user_id = get_user_id_from_jwt()
    data = request.get_json()
    items_data = data.get('items', [])

    response, status = services.submit_estoque_lista(lista_id, user_id, items_data)
    return jsonify(response), status


@api_bp.route('/submissoes/<int:submissao_id>', methods=['PUT'])
@jwt_required()
def update_submissao_route(submissao_id):
    """Atualiza submissão existente PENDENTE."""
    user_id = get_user_id_from_jwt()
    data = request.get_json()
    items_data = data.get('items', [])
    response, status = services.update_submissao(submissao_id, user_id, items_data)
    return jsonify(response), status

@admin_bp.route('/listas/status-submissoes', methods=['GET'])
@admin_required()
def get_listas_status_submissoes_route():
    """Retorna o status das submissões das listas com pedidos pendentes."""
    response, status = services.get_listas_status_submissoes()
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/aprovar-pedidos', methods=['POST'])
@admin_required()
def aprovar_todos_pedidos_lista_route(lista_id):
    """Aprova todos os pedidos pendentes de uma lista específica."""
    response, status = services.aprovar_todos_pedidos_lista(lista_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/itens', methods=['POST'])
@admin_required()
def adicionar_itens_na_lista_route(lista_id):
    """
    Adiciona/atualiza itens de estoque em uma lista.

    Payload: {
        "itens": [
            {"item_id": 1, "quantidade_minima": 10},
            {"item_id": 2, "quantidade_minima": 5}
        ]
    }
    """
    data = request.get_json()
    items_data = data.get('itens', [])

    response, status = services.adicionar_itens_na_lista(lista_id, items_data)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/itens', methods=['GET'])
@admin_required()
def obter_itens_da_lista_route(lista_id):
    """Retorna todos os itens (estoques) vinculados a uma lista"""
    response, status = services.obter_itens_da_lista(lista_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/itens/<int:item_id>', methods=['DELETE'])
@admin_required()
def remover_item_da_lista_route(lista_id, item_id):
    """Remove um item (estoque) de uma lista"""
    response, status = services.remover_item_da_lista(lista_id, item_id)
    return jsonify(response), status


# ===== CATÁLOGO GLOBAL DE ITENS =====

@admin_bp.route('/catalogo-global', methods=['GET'])
@admin_required()
def get_catalogo_global_route():
    """
    Retorna todos os itens do catálogo global.
    Usado pelo admin no card "Itens e Insumos".
    """
    response, status = services.get_catalogo_global()
    return jsonify(response), status


@admin_bp.route('/catalogo-global/<int:item_id>', methods=['PUT'])
@admin_required()
def editar_item_catalogo_global_route(item_id):
    """Edita um item do catálogo global"""
    data = request.get_json()
    response, status = services.editar_item_catalogo_global(item_id, data)
    return jsonify(response), status


# ===== LISTA MAE ITENS ENDPOINTS =====

@admin_bp.route('/listas/<int:lista_id>/lista-mae', methods=['GET'])
@admin_required()
def get_lista_mae_route(lista_id):
    """Retorna a Lista Mãe com todos os seus itens"""
    response, status = services.obter_lista_mae(lista_id)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/mae-itens', methods=['POST'])
@admin_required()
def adicionar_item_lista_mae_route(lista_id):
    """Adiciona um novo item à Lista Mãe"""
    data = request.get_json()
    response, status = services.adicionar_item_lista_mae(lista_id, data)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/mae-itens/<int:item_id>', methods=['PUT'])
@admin_required()
def editar_item_lista_mae_route(lista_id, item_id):
    """Edita um item da Lista Mãe"""
    data = request.get_json()
    response, status = services.editar_item_lista_mae(lista_id, item_id, data)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/mae-itens/<int:item_id>', methods=['DELETE'])
@admin_required()
def deletar_item_lista_mae_route(lista_id, item_id):
    """Deleta um item da Lista Mãe"""
    response, status = services.deletar_item_lista_mae(lista_id, item_id)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/atribuir-fornecedor', methods=['POST'])
@admin_required()
def atribuir_fornecedor_lista_mae_route(lista_id):
    """Atribui um fornecedor a múltiplos itens da Lista Mãe e gera pedidos"""
    data = request.get_json()
    response, status = services.atribuir_fornecedor_lista_mae(lista_id, data)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/itens/copiar', methods=['POST'])
@admin_required()
def copiar_itens_lista_route(lista_id):
    """
    Copia itens de uma lista para outra (ou cria nova lista).
    Body: {
        "item_ids": [1, 2, 3],
        "lista_destino_id": 5,  // ou null
        "nome_nova_lista": "Nova Lista",  // se criar nova
        "area_id": 2  // se criar nova
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Nenhum dado recebido"}), 400
        
        response, status = services.copiar_itens_entre_listas(lista_id, data)
        return jsonify(response), status
    except Exception as e:
        print(f"[copiar_itens_lista_route] ERRO: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro ao copiar itens: {str(e)}"}), 500


@admin_bp.route('/listas/<int:lista_id>/itens/mover', methods=['POST'])
@admin_required()
def mover_itens_lista_route(lista_id):
    """
    Move itens de uma lista para outra (ou cria nova lista).
    Body: {
        "item_ids": [1, 2, 3],
        "lista_destino_id": 5,  // ou null
        "nome_nova_lista": "Nova Lista",  // se criar nova
        "area_id": 2  // se criar nova
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Nenhum dado recebido"}), 400
        
        response, status = services.mover_itens_entre_listas(lista_id, data)
        return jsonify(response), status
    except Exception as e:
        print(f"[mover_itens_lista_route] ERRO: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro ao mover itens: {str(e)}"}), 500

@api_bp.route('/listas/<int:lista_id>/items-import', methods=['POST'])
@admin_required()
def importar_items_em_lote_route(lista_id):
    """Importa múltiplos itens em lote para uma Lista Mãe"""
    data = request.get_json()
    response, status = services.importar_items_em_lote(lista_id, data)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/export-csv', methods=['GET'])
@admin_required()
def export_lista_csv_route(lista_id):
    """Exporta os itens da lista mãe para CSV"""
    from flask import make_response

    response, status = services.export_lista_to_csv(lista_id)

    if status != 200:
        return jsonify(response), status

    # Criar resposta com CSV
    csv_response = make_response(response['csv_content'])
    csv_response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    csv_response.headers['Content-Disposition'] = f'attachment; filename="{response["filename"]}"'

    return csv_response

@admin_bp.route('/listas/<int:lista_id>/import-csv', methods=['POST'])
@admin_required()
def import_lista_csv_route(lista_id):
    """Importa itens da lista mãe a partir de arquivo CSV"""
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado"}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Arquivo deve ser CSV"}), 400

    response, status = services.import_lista_from_csv(lista_id, file)
    return jsonify(response), status

@admin_bp.route('/listas/create-from-csv', methods=['POST'])
@admin_required()
def create_lista_from_csv_route():
    """Cria uma nova lista e importa itens a partir de arquivo CSV ou texto direto"""
    # Obter nome e descrição do form data
    nome = request.form.get('nome', '').strip()
    descricao = request.form.get('descricao', '').strip()

    if not nome:
        return jsonify({"error": "Nome da lista é obrigatório"}), 400

    # Validar que arquivo OU texto foi fornecido (mas não ambos vazios)
    file = request.files.get('file')
    texto = request.form.get('texto', '').strip()

    if file and file.filename:
        # Usar arquivo CSV
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "Arquivo deve ser CSV"}), 400
        conteudo = file
    elif texto:
        # Usar texto direto
        conteudo = texto
    else:
        # Nenhum foi fornecido
        return jsonify({"error": "Selecione um arquivo CSV ou cole o conteúdo de texto direto"}), 400

    response, status = services.create_lista_from_csv(nome, descricao, conteudo)
    return jsonify(response), status


# ===== IMPORTAÇÃO COM ESTOQUE (NOVA FUNCIONALIDADE) =====

@admin_bp.route('/import/preview', methods=['POST'])
@admin_required()
def preview_importacao_route():
    """
    Faz preview da importação de itens com estoque antes de confirmar
    
    Body JSON:
    {
        "texto": "Nome Item\\t\\tQtd Atual\\tQtd Mínima\\n...",
        "area_id": 1,
        "fornecedor_id": 2
    }
    
    Returns:
    {
        "formato": "simples" | "completo",
        "total_itens": 10,
        "itens": [...],
        "erros": [...]
    }
    """
    data = request.get_json()
    response, status = services.preview_importacao_estoque(data)
    return jsonify(response), status


@admin_bp.route('/import/execute', methods=['POST'])
@admin_required()
def executar_importacao_route():
    """
    Executa a importação de itens com estoque
    
    Body JSON:
    {
        "texto": "Nome Item\\t\\tQtd Atual\\tQtd Mínima\\n...",
        "area_id": 1,
        "fornecedor_id": 2,
        "atualizar_existentes": true
    }
    
    Returns:
    {
        "sucesso": true,
        "total_criados": 5,
        "total_atualizados": 3,
        "total_erros": 0,
        "itens_criados": [...],
        "itens_atualizados": [...],
        "erros": [...]
    }
    """
    data = request.get_json()
    response, status = services.executar_importacao_estoque(data)
    return jsonify(response), status


@admin_bp.route('/database/clear', methods=['POST'])
@admin_required()
def clear_database_route():
    """Limpa todas as tabelas do banco de dados exceto usuários. Requer senha do admin."""
    data = request.get_json()
    user_id = get_user_id_from_jwt()
    response, status = services.clear_database_except_users(user_id, data)
    return jsonify(response), status

@admin_bp.route('/database/populate', methods=['POST'])
@admin_required()
def populate_database_route():
    """Popula o banco de dados com dados fictícios para teste."""
    response, status = services.populate_database_with_mock_data()
    return jsonify(response), status

@admin_bp.route('/database/export-bulk', methods=['POST'])
@admin_required()
def export_bulk_data_route():
    """Exporta múltiplos tipos de dados em um arquivo ZIP."""
    from datetime import datetime

    data = request.get_json()
    tipos_dados = data.get('tipos_dados', [])

    if not tipos_dados:
        return jsonify({"error": "Nenhum tipo de dado selecionado para exportação."}), 400

    result, status = services.export_data_bulk(tipos_dados)

    if status != 200:
        return jsonify(result), status

    # result é um BytesIO contendo o ZIP
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'kaizen_export_{timestamp}.zip'

    return send_file(
        result,
        mimetype='application/zip',
        as_attachment=True,
        download_name=filename
    )


# ===== NAVBAR PREFERENCES =====

@auth_bp.route('/navbar-preferences', methods=['GET'])
@jwt_required()
def get_navbar_preferences_route():
    """Busca preferências de navbar do usuário."""
    user_id = get_jwt_identity()
    response, status = services.get_navbar_preferences(user_id)
    return jsonify(response), status


@auth_bp.route('/navbar-preferences', methods=['POST'])
@jwt_required()
def save_navbar_preferences_route():
    """Salva preferências de navbar do usuário."""
    user_id = get_jwt_identity()
    data = request.get_json()
    response, status = services.save_navbar_preferences(user_id, data)
    return jsonify(response), status


# ===== SUGESTÕES DE ITENS =====

@auth_bp.route('/sugestoes', methods=['POST'])
@jwt_required()
def criar_sugestao_route():
    """Usuário cria uma sugestão de novo item."""
    user_id = get_jwt_identity()
    data = request.get_json()
    response, status = services.criar_sugestao_item(user_id, data)
    return jsonify(response), status


@auth_bp.route('/sugestoes/minhas', methods=['GET'])
@jwt_required()
def listar_minhas_sugestoes_route():
    """Usuário lista suas próprias sugestões."""
    user_id = get_jwt_identity()
    response, status = services.listar_minhas_sugestoes(user_id)
    return jsonify(response), status


@admin_bp.route('/sugestoes/pendentes', methods=['GET'])
@admin_required()
def listar_sugestoes_pendentes_route():
    """Admin lista todas as sugestões pendentes."""
    response, status = services.listar_sugestoes_pendentes()
    return jsonify(response), status


@admin_bp.route('/sugestoes/pendentes/count', methods=['GET'])
@admin_required()
def contar_sugestoes_pendentes_route():
    """Retorna contagem de sugestões pendentes para notificação."""
    response, status = services.contar_sugestoes_pendentes()
    return jsonify(response), status


@admin_bp.route('/sugestoes/<int:sugestao_id>/aprovar', methods=['PUT'])
@admin_required()
def aprovar_sugestao_route(sugestao_id):
    """Admin aprova uma sugestão."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    response, status = services.aprovar_sugestao(sugestao_id, admin_id, data)
    return jsonify(response), status


@admin_bp.route('/sugestoes/<int:sugestao_id>/rejeitar', methods=['PUT'])
@admin_required()
def rejeitar_sugestao_route(sugestao_id):
    """Admin rejeita uma sugestão."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    response, status = services.rejeitar_sugestao(sugestao_id, admin_id, data)
    return jsonify(response), status


# ===== LISTA RÁPIDA - COLABORADOR =====

@auth_bp.route('/listas-rapidas', methods=['POST'])
@jwt_required()
def criar_lista_rapida_route():
    """Cria uma nova lista rápida."""
    user_id = get_jwt_identity()
    data = request.get_json()
    response, status = services.criar_lista_rapida(user_id, data)
    return jsonify(response), status


@auth_bp.route('/listas-rapidas', methods=['GET'])
@jwt_required()
def listar_minhas_listas_rapidas_route():
    """Lista todas as listas rápidas do usuário."""
    user_id = get_jwt_identity()
    response, status = services.listar_minhas_listas_rapidas(user_id)
    return jsonify(response), status


@auth_bp.route('/listas-rapidas/<int:lista_id>', methods=['GET'])
@jwt_required()
def obter_lista_rapida_route(lista_id):
    """Obtém detalhes de uma lista rápida."""
    user_id = get_jwt_identity()
    response, status = services.obter_lista_rapida(lista_id, user_id)
    return jsonify(response), status


@auth_bp.route('/listas-rapidas/<int:lista_id>', methods=['DELETE'])
@jwt_required()
def deletar_lista_rapida_route(lista_id):
    """Deleta uma lista rápida."""
    user_id = get_jwt_identity()
    response, status = services.deletar_lista_rapida(lista_id, user_id)
    return jsonify(response), status


@auth_bp.route('/listas-rapidas/<int:lista_id>/itens', methods=['POST'])
@jwt_required()
def adicionar_item_lista_rapida_route(lista_id):
    """Adiciona item à lista rápida."""
    user_id = get_jwt_identity()
    data = request.get_json()
    response, status = services.adicionar_item_lista_rapida(lista_id, user_id, data)
    return jsonify(response), status


@auth_bp.route('/listas-rapidas/<int:lista_id>/itens/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remover_item_lista_rapida_route(lista_id, item_id):
    """Remove item da lista rápida."""
    user_id = get_jwt_identity()
    response, status = services.remover_item_lista_rapida(lista_id, item_id, user_id)
    return jsonify(response), status


@auth_bp.route('/listas-rapidas/<int:lista_id>/itens/<int:item_id>/prioridade', methods=['PUT'])
@jwt_required()
def atualizar_prioridade_item_route(lista_id, item_id):
    """Atualiza prioridade de um item."""
    user_id = get_jwt_identity()
    data = request.get_json()
    response, status = services.atualizar_prioridade_item(lista_id, item_id, user_id, data)
    return jsonify(response), status


@auth_bp.route('/listas-rapidas/<int:lista_id>/submeter', methods=['POST'])
@jwt_required()
def submeter_lista_rapida_route(lista_id):
    """Submete lista rápida para aprovação."""
    user_id = get_jwt_identity()
    response, status = services.submeter_lista_rapida(lista_id, user_id)
    return jsonify(response), status


# ===== LISTA RÁPIDA - ADMIN =====

@admin_bp.route('/listas-rapidas/pendentes', methods=['GET'])
@admin_required()
def listar_listas_rapidas_pendentes_route():
    """Admin lista todas as listas rápidas pendentes."""
    response, status = services.listar_listas_rapidas_pendentes()
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/pendentes/count', methods=['GET'])
@admin_required()
def contar_listas_rapidas_pendentes_route():
    """Conta listas rápidas pendentes."""
    response, status = services.contar_listas_rapidas_pendentes()
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>', methods=['GET'])
@admin_required()
def obter_lista_rapida_admin_route(lista_id):
    """Admin obtém detalhes de qualquer lista rápida."""
    response, status = services.obter_lista_rapida_admin(lista_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/aprovar', methods=['PUT'])
@admin_required()
def aprovar_lista_rapida_route(lista_id):
    """Admin aprova lista rápida."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    response, status = services.aprovar_lista_rapida(lista_id, admin_id, data)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/rejeitar', methods=['PUT'])
@admin_required()
def rejeitar_lista_rapida_route(lista_id):
    """Admin rejeita lista rápida."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    response, status = services.rejeitar_lista_rapida(lista_id, admin_id, data)
    return jsonify(response), status
