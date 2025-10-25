from flask import Blueprint, request, jsonify
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
            print(f"🔐 [DECORATOR] Verificando permissão de admin para {fn.__name__}")
            try:
                # Pega o user_id do campo 'sub' (identity)
                identity = get_jwt_identity()

                # COMPATIBILIDADE: Suporta tokens antigos (identity=dict) e novos (identity=int)
                if isinstance(identity, dict):
                    # Token antigo: identity = {"id": 1, "role": "ADMIN"}
                    print(f"⚠️ [DECORATOR] Token no formato ANTIGO detectado (identity é dict)")
                    user_id = identity.get('id')
                    role = identity.get('role')
                else:
                    # Token novo: identity = 1 (apenas o ID)
                    user_id = identity
                    # Pega o role dos additional_claims
                    claims = get_jwt()
                    role = claims.get('role')

                print(f"🔐 [DECORATOR] User ID: {user_id}, Role: {role}")

                if role != 'ADMIN':
                    print(f"❌ [DECORATOR] Acesso negado - Role: {role}")
                    return jsonify({"error": "Acesso negado. Requer permissão de administrador."}), 403
                print(f"✅ [DECORATOR] Acesso autorizado - Role: ADMIN")
                return fn(*args, **kwargs)
            except Exception as e:
                print(f"❌ [DECORATOR] Erro: {type(e).__name__}: {str(e)}")
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
    print("📥 Recebendo requisição para criar usuário")
    print(f"📋 Dados recebidos: {data}")
    print(f"📋 Tipo dos dados: {type(data)}")

    if data:
        print("📋 Campos presentes:")
        for key, value in data.items():
            print(f"   - {key}: {value} (tipo: {type(value).__name__})")

    # Validação de campos obrigatórios
    required_fields = ('email', 'senha', 'nome', 'role')
    missing_fields = [field for field in required_fields if field not in data]

    if not data:
        print("❌ Erro: Nenhum dado recebido")
        return jsonify({"error": "Nenhum dado recebido."}), 400

    if missing_fields:
        print(f"❌ Erro: Campos obrigatórios ausentes: {missing_fields}")
        return jsonify({
            "error": f"Dados incompletos. Campos obrigatórios ausentes: {', '.join(missing_fields)}"
        }), 400

    print("✅ Validação inicial passou, chamando service...")
    response, status_code = services.create_user_by_admin(data)
    print(f"📤 Resposta do service: {response} (status: {status_code})")
    print("=" * 50)

    return jsonify(response), status_code


# ⚠️ ROTA TEMPORÁRIA SEM AUTENTICAÇÃO - REMOVER DEPOIS!
@admin_bp.route('/create_user_temp', methods=['POST'])
def create_user_temp_route():
    """
    ROTA TEMPORÁRIA para criar usuário SEM verificação JWT.
    ⚠️ DEVE SER REMOVIDA após resolver o problema do token!
    """
    data = request.get_json()

    print("=" * 50)
    print("⚠️ [TEMP] Criando usuário SEM autenticação JWT")
    print(f"📋 Dados recebidos: {data}")
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
    items, _ = services.get_all_items()
    return jsonify([item.to_dict() for item in items])

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
    return jsonify([f.to_dict() for f in fornecedores])

@api_bp.route('/fornecedores/<int:fornecedor_id>', methods=['GET'])
@admin_required()
def get_fornecedor_route(fornecedor_id):
    fornecedor, _ = services.get_fornecedor_by_id(fornecedor_id)
    if not fornecedor:
        return jsonify({"error": "Fornecedor não encontrado"}), 404
    return jsonify(fornecedor.to_dict())

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


@api_bp.route('/pedidos/submit', methods=['POST'])
@jwt_required()
def submit_pedidos_route():
    user_id = get_user_id_from_jwt()
    response, status = services.submit_pedidos(user_id)
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
    listas, _ = services.get_all_listas()
    return jsonify([l.to_dict() for l in listas])

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
    """Deleta uma lista permanentemente."""
    response, status = services.delete_lista(lista_id)
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
