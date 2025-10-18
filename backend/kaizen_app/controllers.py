from flask import Blueprint, request, jsonify
from . import services
from .models import Item, Area, Fornecedor, Estoque
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps

# Cria um Blueprint para as rotas de autenticação
auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/admin')

# Decorator para rotas que exigem permissão de administrador
def admin_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            identity = get_jwt_identity()
            if identity.get('role') != 'ADMIN':
                return jsonify({"error": "Acesso negado. Requer permissão de administrador."}), 403
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

@admin_bp.route('/users/<int:user_id>/approve', methods=['POST'])
@admin_required()
def approve(user_id):
    response, status_code = services.approve_user(user_id)
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
    if not data or not all(k in data for k in ('email', 'senha', 'nome', 'role')):
        return jsonify({"error": "Dados incompletos para criação de usuário."}), 400
    
    response, status_code = services.create_user_by_admin(data)
    return jsonify(response), status_code

@admin_bp.route('/dashboard-summary', methods=['GET'])
@admin_required()
def dashboard_summary_route():
    response, status = services.get_dashboard_summary()
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


# --- Rotas de Pedidos ---

@api_bp.route('/pedidos/me', methods=['GET'])
@jwt_required()
def get_my_pedidos_route():
    identity = get_jwt_identity()
    user_id = identity['id']
    pedidos, _ = services.get_pedidos_by_user(user_id)
    return jsonify([p.to_dict() for p in pedidos])


@api_bp.route('/pedidos/submit', methods=['POST'])
@jwt_required()
def submit_pedidos_route():
    identity = get_jwt_identity()
    user_id = identity['id']
    response, status = services.submit_pedidos(user_id)
    return jsonify(response), status


# --- Rotas de Cotações ---
@api_bp.route('/cotacoes', methods=['POST'])
@admin_required()
def create_quotation_route():
    data = request.get_json()
    if not data or not data.get('fornecedor_id'):
        return jsonify({"error": "O fornecedor_id é obrigatório."}), 400
    response, status = services.create_quotation_from_stock(data['fornecedor_id'])
    return jsonify(response), status

@api_bp.route('/cotacoes', methods=['GET'])
@admin_required()
def get_cotacoes_route():
    cotacoes, _ = services.get_all_cotacoes()
    return jsonify([c.to_dict() for c in cotacoes])

@api_bp.route('/cotacoes/<int:cotacao_id>', methods=['GET'])
@admin_required()
def get_cotacao_route(cotacao_id):
    cotacao, _ = services.get_cotacao_by_id(cotacao_id)
    if not cotacao:
        return jsonify({"error": "Cotação não encontrada"}), 404
    return jsonify(cotacao.to_dict())

@api_bp.route('/cotacao-items/<int:item_id>', methods=['PUT'])
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

@api_bp.route('/estoque/<int:estoque_id>', methods=['PUT'])
@jwt_required() # Permitir que colaboradores atualizem o estoque
def update_estoque_route(estoque_id):
    data = request.get_json()
    response, status = services.update_estoque_item(estoque_id, data)
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
