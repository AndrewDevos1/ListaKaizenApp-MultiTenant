from flask import Blueprint, request, jsonify, send_file
from . import services
from .extensions import db
from .models import Item, Area, Fornecedor, Estoque, ListaMaeItem, Usuario, UserRoles, brasilia_now
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

# Cria um Blueprint para as rotas de autenticação
auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/admin')
collaborator_bp = Blueprint('collaborator_bp', __name__, url_prefix='/api/collaborator')
public_bp = Blueprint('public_bp', __name__, url_prefix='/api/public')
supplier_bp = Blueprint('supplier_bp', __name__, url_prefix='/api/supplier')

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

                if role not in ['ADMIN', 'SUPER_ADMIN']:
                    print(f"[DECORATOR] Acesso negado - Role: {role}")
                    return jsonify({"error": "Acesso negado. Requer permissão de administrador."}), 403
                print(f"[DECORATOR] Acesso autorizado - Role: ADMIN")
                return fn(*args, **kwargs)
            except Exception as e:
                print(f"[DECORATOR] Erro: {type(e).__name__}: {str(e)}")
                raise
        return decorator
    return wrapper

# Decorator para rotas que exigem permissão de fornecedor
def supplier_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            user_id = get_user_id_from_jwt()
            usuario = db.session.get(Usuario, user_id)
            if not usuario or not usuario.ativo:
                return jsonify({"error": "Usuário inválido."}), 403
            if usuario.role != UserRoles.SUPPLIER:
                return jsonify({"error": "Acesso restrito a fornecedores."}), 403
            fornecedor = Fornecedor.query.filter_by(usuario_id=user_id).first()
            if not fornecedor or not fornecedor.aprovado:
                return jsonify({"error": "Fornecedor aguardando aprovação."}), 403
            return fn(*args, **kwargs)
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

            if role not in ['COLLABORATOR', 'ADMIN', 'SUPER_ADMIN']:
                return jsonify({"error": "Acesso negado. Requer permissão de colaborador."}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

# Decorator para rotas que exigem permissão de SUPER_ADMIN
def super_admin_required():
    """Decorator para rotas que exigem SUPER_ADMIN."""
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

def get_current_restaurante_id():
    """
    Retorna restaurante_id do usuário atual.
    SUPER_ADMIN retorna None (acessa todos os restaurantes).
    """
    claims = get_jwt()
    role = claims.get('role')
    if role == 'SUPER_ADMIN':
        return None
    return claims.get('restaurante_id')

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


@auth_bp.route('/session', methods=['GET'])
@jwt_required()
def validar_sessao():
    """Endpoint simples para validar a sessão atual."""
    return jsonify({"status": "ok"}), 200

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


@auth_bp.route('/profile/wizard', methods=['PATCH'])
@jwt_required()
def update_wizard_status():
    """Endpoint para atualizar o status do wizard do usuário logado."""
    user_id = get_user_id_from_jwt()
    data = request.get_json()
    wizard_status = data.get('wizardStatus') if isinstance(data, dict) else None

    response, status_code = services.update_wizard_status(user_id, wizard_status)
    return jsonify(response), status_code


# ==============================
# POPs DIARIOS - ADMIN
# ==============================

@admin_bp.route('/pop-configuracoes', methods=['GET'])
@admin_required()
def get_pop_config():
    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None:
        restaurante_id = request.args.get('restaurante_id', type=int)
    response, status_code = services.get_pop_config(restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-configuracoes', methods=['PUT'])
@admin_required()
def update_pop_config():
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None and 'restaurante_id' in request.args:
        restaurante_id = request.args.get('restaurante_id', type=int)
    response, status_code = services.update_pop_config(data, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-categorias', methods=['GET'])
@admin_required()
def list_pop_categorias():
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.list_pop_categorias(restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-categorias', methods=['POST'])
@admin_required()
def create_pop_categoria():
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    user_id = get_user_id_from_jwt()
    response, status_code = services.create_pop_categoria(data, restaurante_id, user_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-categorias/<int:categoria_id>', methods=['PUT'])
@admin_required()
def update_pop_categoria(categoria_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.update_pop_categoria(categoria_id, data, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-categorias/<int:categoria_id>', methods=['DELETE'])
@admin_required()
def delete_pop_categoria(categoria_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.delete_pop_categoria(categoria_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-templates', methods=['GET'])
@admin_required()
def list_pop_templates():
    restaurante_id = get_current_restaurante_id()
    filtros = {
        "categoria_id": request.args.get('categoria_id'),
        "area_id": request.args.get('area_id'),
        "tipo_verificacao": request.args.get('tipo_verificacao'),
    }
    ativo = request.args.get('ativo')
    if ativo is not None:
        filtros["ativo"] = ativo.lower() == 'true'
    response, status_code = services.list_pop_templates(restaurante_id, filtros)
    return jsonify(response), status_code


@admin_bp.route('/pop-templates', methods=['POST'])
@admin_required()
def create_pop_template():
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    user_id = get_user_id_from_jwt()
    response, status_code = services.create_pop_template(data, restaurante_id, user_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-templates/<int:template_id>', methods=['PUT'])
@admin_required()
def update_pop_template(template_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.update_pop_template(template_id, data, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-templates/<int:template_id>', methods=['DELETE'])
@admin_required()
def delete_pop_template(template_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.delete_pop_template(template_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-templates/<int:template_id>/toggle-ativo', methods=['PATCH'])
@admin_required()
def toggle_pop_template(template_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.toggle_pop_template_ativo(template_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas', methods=['GET'])
@admin_required()
def list_pop_listas():
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.list_pop_listas(restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas', methods=['POST'])
@admin_required()
def create_pop_lista():
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    user_id = get_user_id_from_jwt()
    response, status_code = services.create_pop_lista(data, restaurante_id, user_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>', methods=['PUT'])
@admin_required()
def update_pop_lista(lista_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.update_pop_lista(lista_id, data, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>', methods=['GET'])
@admin_required()
def get_pop_lista(lista_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.get_pop_lista(lista_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>', methods=['DELETE'])
@admin_required()
def delete_pop_lista(lista_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.delete_pop_lista(lista_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>/restore', methods=['POST'])
@admin_required()
def restore_pop_lista(lista_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.restore_pop_lista(lista_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>/tarefas', methods=['GET'])
@admin_required()
def list_pop_lista_tarefas(lista_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.list_pop_lista_tarefas(lista_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>/tarefas', methods=['POST'])
@admin_required()
def add_pop_lista_tarefas(lista_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    template_ids = data.get('template_ids') or []
    response, status_code = services.add_pop_lista_tarefas(lista_id, template_ids, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>/tarefas/<int:tarefa_id>', methods=['DELETE'])
@admin_required()
def remove_pop_lista_tarefa(lista_id, tarefa_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.remove_pop_lista_tarefa(lista_id, tarefa_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>/tarefas/reordenar', methods=['PUT'])
@admin_required()
def reorder_pop_lista_tarefas(lista_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.reorder_pop_lista_tarefas(lista_id, data.get('ordem') or [], restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>/colaboradores', methods=['POST'])
@admin_required()
def assign_pop_lista_colaboradores(lista_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.assign_pop_lista_colaboradores(
        lista_id,
        data.get('colaborador_ids') or [],
        restaurante_id
    )
    return jsonify(response), status_code


@admin_bp.route('/pop-listas/<int:lista_id>/colaboradores', methods=['GET'])
@admin_required()
def list_pop_lista_colaboradores(lista_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.list_pop_lista_colaboradores(lista_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-execucoes', methods=['GET'])
@admin_required()
def list_pop_execucoes_admin():
    restaurante_id = get_current_restaurante_id()
    filtros = {
        "status": request.args.get('status'),
        "usuario_id": request.args.get('usuario_id'),
        "lista_id": request.args.get('lista_id'),
        "data_inicio": request.args.get('data_inicio'),
        "data_fim": request.args.get('data_fim'),
    }
    include_arquivados = request.args.get('include_arquivados')
    if include_arquivados:
        filtros["include_arquivados"] = include_arquivados.lower() == 'true'
    response, status_code = services.list_pop_execucoes_admin(
        restaurante_id,
        filtros,
        executor_id=get_user_id_from_jwt()
    )
    return jsonify(response), status_code


@admin_bp.route('/pop-execucoes/<int:execucao_id>', methods=['GET'])
@admin_required()
def get_pop_execucao_admin(execucao_id):
    user_id = get_user_id_from_jwt()
    response, status_code = services.get_pop_execucao(user_id, execucao_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-execucoes/<int:execucao_id>/revisar', methods=['POST'])
@admin_required()
def review_pop_execucao(execucao_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    user_id = get_user_id_from_jwt()
    response, status_code = services.review_pop_execucao(execucao_id, data, restaurante_id, reviewer_id=user_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-execucoes/<int:execucao_id>/arquivar', methods=['POST'])
@admin_required()
def archive_pop_execucao(execucao_id):
    restaurante_id = get_current_restaurante_id()
    user_id = get_user_id_from_jwt()
    response, status_code = services.archive_pop_execucao(execucao_id, restaurante_id, executor_id=user_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-execucoes/<int:execucao_id>/desarquivar', methods=['POST'])
@admin_required()
def unarchive_pop_execucao(execucao_id):
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.unarchive_pop_execucao(execucao_id, restaurante_id)
    return jsonify(response), status_code


@admin_bp.route('/pop-execucoes/auto-archive', methods=['POST'])
@admin_required()
def run_pop_auto_archive():
    restaurante_id = get_current_restaurante_id()
    user_id = get_user_id_from_jwt()
    response, status_code = services.run_pop_auto_archive(restaurante_id, executor_id=user_id)
    return jsonify(response), status_code


# ==============================
# POPs DIARIOS - COLABORADOR
# ==============================

@collaborator_bp.route('/pop-listas', methods=['GET'])
@collaborator_required()
def list_pop_listas_colaborador():
    user_id = get_user_id_from_jwt()
    response, status_code = services.list_pop_listas_colaborador(user_id)
    return jsonify(response), status_code


@collaborator_bp.route('/pop-execucoes', methods=['POST'])
@collaborator_required()
def start_pop_execucao():
    data = request.get_json() or {}
    user_id = get_user_id_from_jwt()
    response, status_code = services.start_pop_execucao(user_id, data)
    return jsonify(response), status_code


@collaborator_bp.route('/pop-execucoes', methods=['GET'])
@collaborator_required()
def list_pop_execucoes_colaborador():
    user_id = get_user_id_from_jwt()
    filtros = {
        "status": request.args.get('status'),
        "data_inicio": request.args.get('data_inicio'),
        "data_fim": request.args.get('data_fim')
    }
    include_arquivados = request.args.get('include_arquivados')
    if include_arquivados:
        filtros["include_arquivados"] = include_arquivados.lower() == 'true'
    response, status_code = services.list_pop_execucoes(user_id, filtros)
    return jsonify(response), status_code


@collaborator_bp.route('/pop-execucoes/hoje', methods=['GET'])
@collaborator_required()
def list_pop_execucoes_hoje():
    user_id = get_user_id_from_jwt()
    response, status_code = services.list_pop_execucoes_hoje(user_id)
    return jsonify(response), status_code


@collaborator_bp.route('/pop-execucoes/<int:execucao_id>', methods=['GET'])
@collaborator_required()
def get_pop_execucao_colaborador(execucao_id):
    user_id = get_user_id_from_jwt()
    response, status_code = services.get_pop_execucao(user_id, execucao_id)
    return jsonify(response), status_code


@collaborator_bp.route('/pop-execucoes/<int:execucao_id>/itens/<int:item_id>', methods=['PUT'])
@collaborator_required()
def update_pop_execucao_item(execucao_id, item_id):
    data = request.get_json() or {}
    user_id = get_user_id_from_jwt()
    response, status_code = services.update_pop_execucao_item(user_id, execucao_id, item_id, data)
    return jsonify(response), status_code


@collaborator_bp.route('/pop-execucoes/<int:execucao_id>/itens/<int:item_id>/foto', methods=['POST'])
@collaborator_required()
def upload_pop_execucao_foto(execucao_id, item_id):
    return jsonify({"error": "Upload de foto ainda não está disponível."}), 501


@collaborator_bp.route('/pop-execucoes/<int:execucao_id>/finalizar', methods=['POST'])
@collaborator_required()
def finalizar_pop_execucao(execucao_id):
    data = request.get_json() or {}
    user_id = get_user_id_from_jwt()
    response, status_code = services.finalizar_pop_execucao(user_id, execucao_id, data)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>/approve', methods=['POST'])
@admin_required()
def approve(user_id):
    current_role = get_jwt().get('role')
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.approve_user(user_id, current_role, restaurante_id)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required()
def update_user(user_id):
    """Atualiza os dados de um usuário pelo admin."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Dados não fornecidos."}), 400

    current_role = get_jwt().get('role')
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.update_user_by_admin(user_id, data, current_role, restaurante_id)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required()
def delete_user_route(user_id):
    """Deleta um usuário permanentemente."""
    current_role = get_jwt().get('role')
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.delete_user(user_id, current_role, restaurante_id)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required()
def deactivate_user_route(user_id):
    """Desativa um usuário (soft delete)."""
    current_role = get_jwt().get('role')
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.deactivate_user(user_id, current_role, restaurante_id)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>/reactivate', methods=['POST'])
@admin_required()
def reactivate_user_route(user_id):
    """Reativa um usuário desativado."""
    current_role = get_jwt().get('role')
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.reactivate_user(user_id, current_role, restaurante_id)
    return jsonify(response), status_code

@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_users_route():
    current_role = get_jwt().get('role')
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    status = request.args.get('status')

    if current_role == 'SUPER_ADMIN' and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400

    users, status_code = services.get_all_users(restaurante_id, current_role, status)
    return jsonify([user.to_dict() for user in users]), status_code

@admin_bp.route('/users/<int:user_id>/compartilhar-whatsapp', methods=['GET'])
@admin_required()
def compartilhar_usuario_whatsapp_route(user_id):
    """Gera texto formatado para compartilhar credenciais do usuário via WhatsApp."""
    try:
        current_role = get_jwt().get('role')
        restaurante_id = get_current_restaurante_id()
        resultado = services.compartilhar_usuario_whatsapp(user_id, current_role, restaurante_id)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Erro ao gerar texto: {str(e)}"}), 500

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
    current_role = get_jwt().get('role')
    restaurante_id = get_current_restaurante_id()
    response, status_code = services.create_user_by_admin(data, current_role, restaurante_id)
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

    if 'restaurante_id' not in data or not data.get('restaurante_id'):
        data['restaurante_id'] = services._get_restaurante_padrao_id()
    response, status_code = services.create_user_by_admin(data, 'SUPER_ADMIN', None)
    return jsonify(response), status_code

@admin_bp.route('/users/<int:user_id>/atribuir-restaurante', methods=['PUT'])
@super_admin_required()
def atribuir_usuario_restaurante_route(user_id):
    data = request.get_json() or {}
    restaurante_id = data.get('restaurante_id')
    if not restaurante_id:
        return jsonify({"error": "restaurante_id é obrigatório."}), 400
    response, status = services.atribuir_usuario_restaurante(user_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/users/criar-admin-restaurante', methods=['POST'])
@super_admin_required()
def criar_admin_restaurante_route():
    data = request.get_json() or {}
    response, status = services.criar_admin_restaurante(data)
    return jsonify(response), status


# ========================================
# RESTAURANTES (Apenas SUPER_ADMIN)
# ========================================

@admin_bp.route('/restaurantes', methods=['GET'])
@super_admin_required()
def listar_restaurantes_route():
    """Lista todos os restaurantes."""
    response, status = services.listar_restaurantes()
    return jsonify(response), status


@admin_bp.route('/restaurantes/<int:restaurante_id>', methods=['GET'])
@super_admin_required()
def obter_restaurante_route(restaurante_id):
    """Obtém um restaurante por ID."""
    response, status = services.obter_restaurante(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/restaurantes', methods=['POST'])
@super_admin_required()
def criar_restaurante_route():
    """Cria um novo restaurante."""
    data = request.get_json()
    response, status = services.criar_restaurante(data)
    return jsonify(response), status


@admin_bp.route('/restaurantes/<int:restaurante_id>', methods=['PUT'])
@super_admin_required()
def atualizar_restaurante_route(restaurante_id):
    """Atualiza um restaurante."""
    data = request.get_json()
    response, status = services.atualizar_restaurante(restaurante_id, data)
    return jsonify(response), status


@admin_bp.route('/restaurantes/<int:restaurante_id>', methods=['DELETE'])
@super_admin_required()
def deletar_restaurante_route(restaurante_id):
    """Deleta um restaurante (soft delete)."""
    response, status = services.deletar_restaurante(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/restaurantes/<int:restaurante_id>/usuarios', methods=['GET'])
@admin_required()
def listar_usuarios_restaurante_route(restaurante_id):
    """GET /api/admin/restaurantes/<id>/usuarios - Lista usuários do restaurante com senhas."""
    user_id = get_user_id_from_jwt()
    response, status = services.listar_usuarios_restaurante(restaurante_id, user_id)
    return jsonify(response), status


@admin_bp.route('/impersonar', methods=['POST'])
@super_admin_required()
def impersonar_usuario_route():
    data = request.get_json() or {}
    usuario_id = data.get('usuario_id')
    if not usuario_id:
        return jsonify({"error": "usuario_id é obrigatório."}), 400
    super_admin_id = get_user_id_from_jwt()
    response, status = services.iniciar_impersonacao(super_admin_id, usuario_id)
    return jsonify(response), status


@admin_bp.route('/impersonar/encerrar', methods=['POST'])
@jwt_required()
def encerrar_impersonacao_route():
    claims = get_jwt()
    super_admin_id = claims.get('impersonated_by')
    if not super_admin_id:
        return jsonify({"error": "Sessão não está em modo impersonação."}), 400
    response, status = services.encerrar_impersonacao(super_admin_id)
    return jsonify(response), status


@admin_bp.route('/logs', methods=['GET'])
@super_admin_required()
def listar_logs_route():
    def _parse_int(value):
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    filters = {
        "restaurante_id": _parse_int(request.args.get('restaurante_id')),
        "usuario_id": _parse_int(request.args.get('usuario_id')),
        "acao": request.args.get('acao') or None,
        "entidade": request.args.get('entidade') or None,
        "start_date": request.args.get('start_date') or None,
        "end_date": request.args.get('end_date') or None,
        "limit": _parse_int(request.args.get('limit')) or 200,
        "offset": _parse_int(request.args.get('offset')) or 0,
    }
    response, status = services.listar_logs(filters)
    return jsonify(response), status


@admin_bp.route('/usuarios/<int:usuario_id>/alterar-senha', methods=['PUT'])
@admin_required()
def alterar_senha_usuario_route(usuario_id):
    """PUT /api/admin/usuarios/<id>/alterar-senha - Altera senha manualmente.
    Body: {"nova_senha": "SenhaNova123"}
    """
    user_id = get_user_id_from_jwt()
    data = request.get_json()
    nova_senha = data.get('nova_senha')

    if not nova_senha or len(nova_senha) < 6:
        return jsonify({"error": "Senha deve ter pelo menos 6 caracteres."}), 400

    response, status = services.alterar_senha_usuario(usuario_id, nova_senha, user_id)
    return jsonify(response), status


@admin_bp.route('/usuarios/<int:usuario_id>/resetar-senha', methods=['POST'])
@admin_required()
def resetar_senha_usuario_route(usuario_id):
    """POST /api/admin/usuarios/<id>/resetar-senha - Reseta para senha aleatória."""
    user_id = get_user_id_from_jwt()
    response, status = services.resetar_senha_usuario(usuario_id, user_id)
    return jsonify(response), status


@admin_bp.route('/estatisticas', methods=['GET'])
@admin_required()
def estatisticas_route():
    restaurante_id = get_current_restaurante_id()
    response, status = services.get_estatisticas(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/dashboard-summary', methods=['GET'])
@admin_required()
def dashboard_summary_route():
    restaurante_id = get_current_restaurante_id()
    response, status = services.get_dashboard_summary(restaurante_id)
    return jsonify(response), status

@admin_bp.route('/recent-activities', methods=['GET'])
@admin_required()
def admin_recent_activities_route():
    restaurante_id = get_current_restaurante_id()
    limit = request.args.get('limit', default=6, type=int)
    response, status = services.get_admin_recent_activities(restaurante_id, limit)
    return jsonify(response), status

@admin_bp.route('/activity-summary', methods=['GET'])
@admin_required()
def activity_summary_route():
    response, status = services.get_activity_summary()
    return jsonify(response), status


# ===== SUPER ADMIN DASHBOARD =====

@admin_bp.route('/restaurantes', methods=['GET'])
@admin_required()
def get_restaurantes_route():
    """
    GET /api/admin/restaurantes
    Lista todos os restaurantes (para filtros do dashboard).
    """
    from .models import Restaurante
    restaurantes = Restaurante.query.filter_by(deletado=False, ativo=True).all()
    return jsonify([r.to_dict() for r in restaurantes]), 200


@admin_bp.route('/super-dashboard', methods=['GET'])
@admin_required()
def super_dashboard_route():
    """
    GET /api/admin/super-dashboard
    Dashboard completo para Super Admin com todas as estatísticas.

    Query params:
        - restaurante_id: int (opcional, filtra por restaurante)
        - period: int (default=30, dias para dados temporais)
    """
    restaurante_id = request.args.get('restaurante_id', type=int)
    period = request.args.get('period', default=30, type=int)

    response, status = services.get_super_dashboard_data(restaurante_id, period)
    return jsonify(response), status


@admin_bp.route('/super-dashboard/export/pdf', methods=['GET'])
@admin_required()
def export_super_dashboard_pdf_route():
    """
    GET /api/admin/super-dashboard/export/pdf
    Exporta dashboard em PDF.
    """
    from flask import send_file

    restaurante_id = request.args.get('restaurante_id', type=int)
    period = request.args.get('period', default=30, type=int)

    pdf_buffer = services.generate_super_dashboard_pdf(restaurante_id, period)

    filename = f'dashboard_global_{brasilia_now().strftime("%Y%m%d_%H%M")}.pdf'

    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )


@admin_bp.route('/super-dashboard/export/excel', methods=['GET'])
@admin_required()
def export_super_dashboard_excel_route():
    """
    GET /api/admin/super-dashboard/export/excel
    Exporta dashboard em Excel.
    """
    from flask import send_file

    restaurante_id = request.args.get('restaurante_id', type=int)
    period = request.args.get('period', default=30, type=int)

    excel_buffer = services.generate_super_dashboard_excel(restaurante_id, period)

    filename = f'dashboard_global_{brasilia_now().strftime("%Y%m%d_%H%M")}.xlsx'

    return send_file(
        excel_buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )


# Blueprint para a API principal
api_bp = Blueprint('api_bp', __name__, url_prefix='/api/v1')

# --- Rotas de Itens ---
@api_bp.route('/items', methods=['POST'])
@admin_required()
def create_item_route():
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.create_item(data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/items', methods=['GET'])
@jwt_required()
def get_items_route():
    print(f"[DEBUG] get_items_route chamado por user: {get_jwt_identity()}")
    restaurante_id = get_current_restaurante_id()
    items, status = services.get_all_items(restaurante_id)
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
    restaurante_id = get_current_restaurante_id()
    item, _ = services.get_item_by_id(item_id, restaurante_id)
    if not item:
        return jsonify({"error": "Item não encontrado"}), 404
    return jsonify(item.to_dict())

@api_bp.route('/items/<int:item_id>', methods=['PUT'])
@admin_required()
def update_item_route(item_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.update_item(item_id, data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/items/<int:item_id>', methods=['DELETE'])
@admin_required()
def delete_item_route(item_id):
    restaurante_id = get_current_restaurante_id()
    response, status = services.delete_item(item_id, restaurante_id)
    return jsonify(response), status


@api_bp.route('/itens/buscar', methods=['GET'])
@jwt_required()
def buscar_itens_para_lista_route():
    query = request.args.get('q', None)
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None:
        if not filtro_restaurante:
            return jsonify({"error": "SUPER_ADMIN deve especificar restaurante_id."}), 400
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400

    result, status = services.buscar_itens_para_lista(restaurante_id, query)
    return jsonify(result), status


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


@api_bp.route('/areas/<int:area_id>/colaboradores', methods=['GET'])
@admin_required()
def get_colaboradores_area_route(area_id):
    restaurante_id = get_current_restaurante_id()
    response, status = services.get_area_colaboradores(area_id, restaurante_id)
    return jsonify(response), status


@api_bp.route('/areas/<int:area_id>/colaboradores', methods=['POST'])
@admin_required()
def assign_colaboradores_area_route(area_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.assign_colaboradores_to_area(area_id, data, restaurante_id)
    return jsonify(response), status


@api_bp.route('/areas/<int:area_id>/listas', methods=['GET'])
@admin_required()
def get_listas_area_route(area_id):
    restaurante_id = get_current_restaurante_id()
    response, status = services.get_listas_da_area(area_id, restaurante_id)
    return jsonify(response), status


@api_bp.route('/areas/<int:area_id>/listas', methods=['POST'])
@admin_required()
def assign_listas_area_route(area_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.assign_listas_to_area(area_id, data, restaurante_id)
    return jsonify(response), status


# --- Rotas de Fornecedores ---
@api_bp.route('/fornecedores', methods=['POST'])
@admin_required()
def create_fornecedor_route():
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.create_fornecedor(data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/fornecedores', methods=['GET'])
@jwt_required()
def get_fornecedores_route():
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    compartilhado_param = request.args.get('compartilhado_regiao')
    somente_compartilhados = False
    if compartilhado_param is not None:
        somente_compartilhados = str(compartilhado_param).lower() in ['1', 'true', 'sim', 'yes']
    fornecedores, _ = services.get_all_fornecedores(
        restaurante_id,
        somente_compartilhados=somente_compartilhados
    )
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
    restaurante_id = get_current_restaurante_id()
    fornecedor, _ = services.get_fornecedor_by_id(fornecedor_id, restaurante_id)
    if not fornecedor:
        return jsonify({"error": "Fornecedor não encontrado"}), 404

    # Serializa o fornecedor e inclui as listas
    fornecedor_dict = fornecedor.to_dict()
    fornecedor_dict['listas'] = [
        {'id': lista.id, 'nome': lista.nome}
        for lista in fornecedor.listas
    ]
    return jsonify(fornecedor_dict)

@api_bp.route('/fornecedores/<int:fornecedor_id>/detalhes-estoque', methods=['GET'])
@admin_required()
def get_fornecedor_detalhes_estoque_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    response, status = services.get_fornecedor_detalhes_estoque(fornecedor_id, restaurante_id)
    return jsonify(response), status

@api_bp.route('/fornecedores/<int:fornecedor_id>', methods=['PUT'])
@admin_required()
def update_fornecedor_route(fornecedor_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.update_fornecedor(fornecedor_id, data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/fornecedores/<int:fornecedor_id>', methods=['DELETE'])
@admin_required()
def delete_fornecedor_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    response, status = services.delete_fornecedor(fornecedor_id, restaurante_id)
    return jsonify(response), status

@api_bp.route('/fornecedores/<int:fornecedor_id>/pedidos-por-lista', methods=['GET'])
@admin_required()
def get_pedidos_fornecedor_por_lista_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    pedidos, status = services.get_pedidos_fornecedor_por_lista(fornecedor_id, restaurante_id)
    return jsonify(pedidos), status

@api_bp.route('/fornecedores/<int:fornecedor_id>/pedidos-consolidados', methods=['GET'])
@admin_required()
def get_pedidos_fornecedor_consolidado_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    pedidos, status = services.get_pedidos_fornecedor_consolidado(fornecedor_id, restaurante_id)
    return jsonify(pedidos), status

@api_bp.route('/fornecedores/export-csv', methods=['GET'])
@admin_required()
def exportar_fornecedores_csv_route():
    """Exporta todos os fornecedores em formato CSV"""
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.exportar_fornecedores_csv(restaurante_id)
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
        restaurante_id = get_current_restaurante_id()
        filtro_restaurante = request.args.get('restaurante_id')
        if restaurante_id is None and filtro_restaurante:
            try:
                restaurante_id = int(filtro_restaurante)
            except ValueError:
                return jsonify({"error": "restaurante_id inválido"}), 400
        response, status = services.importar_fornecedores_csv(csv_content, restaurante_id)
        return jsonify(response), status
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ===============================================
# ROTAS: Itens de Fornecedor
# ===============================================

@api_bp.route('/fornecedores/<int:fornecedor_id>/itens', methods=['POST'])
@admin_required()
def create_item_fornecedor_route(fornecedor_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    result, status = services.create_item_fornecedor(fornecedor_id, data, restaurante_id)
    return jsonify(result), status


@api_bp.route('/fornecedores/<int:fornecedor_id>/itens', methods=['GET'])
@jwt_required()
def get_itens_fornecedor_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    result, status = services.get_itens_by_fornecedor(fornecedor_id, restaurante_id)
    return jsonify(result), status


@api_bp.route('/fornecedores/itens/<int:item_id>', methods=['PUT'])
@admin_required()
def update_item_fornecedor_route(item_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    result, status = services.update_item_fornecedor(item_id, data, restaurante_id)
    return jsonify(result), status


@api_bp.route('/fornecedores/itens/<int:item_id>', methods=['DELETE'])
@admin_required()
def delete_item_fornecedor_route(item_id):
    restaurante_id = get_current_restaurante_id()
    result, status = services.delete_item_fornecedor(item_id, restaurante_id)
    return jsonify(result), status


@api_bp.route('/fornecedores/<int:fornecedor_id>/itens/import-csv', methods=['POST'])
@admin_required()
def importar_itens_fornecedor_csv_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    csv_content = ''

    if 'file' in request.files:
        uploaded = request.files['file']
        if uploaded:
            raw = uploaded.read()
            try:
                csv_content = raw.decode('utf-8')
            except UnicodeDecodeError:
                csv_content = raw.decode('latin-1')
    else:
        raw = request.data or b''
        if raw:
            try:
                csv_content = raw.decode('utf-8')
            except UnicodeDecodeError:
                csv_content = raw.decode('latin-1')

    if not csv_content:
        return jsonify({"error": "Arquivo CSV não enviado ou vazio."}), 400

    result, status = services.importar_itens_fornecedor_csv(fornecedor_id, csv_content, restaurante_id)
    return jsonify(result), status


@api_bp.route('/fornecedores/<int:fornecedor_id>/itens/import-text', methods=['POST'])
@admin_required()
def importar_itens_fornecedor_texto_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    texto = ''

    if request.is_json:
        data = request.get_json() or {}
        texto = data.get('texto', '')
    if not texto:
        raw = request.data or b''
        if raw:
            try:
                texto = raw.decode('utf-8')
            except UnicodeDecodeError:
                texto = raw.decode('latin-1')

    if not texto:
        return jsonify({"error": "Texto não enviado ou vazio."}), 400

    result, status = services.importar_itens_fornecedor_texto(fornecedor_id, texto, restaurante_id)
    return jsonify(result), status

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


@admin_bp.route('/submissoes/merge-preview', methods=['POST'])
@admin_required()
def merge_submissoes_preview_route():
    """
    Retorna preview de itens fundidos de múltiplas submissões APROVADAS.
    Payload: { "submissao_ids": [1, 2, 3] }
    """
    data = request.get_json() or {}
    submissao_ids = data.get('submissao_ids', [])
    restaurante_id = get_current_restaurante_id()
    response, status = services.merge_submissoes_preview(submissao_ids, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/submissoes/merge-whatsapp', methods=['POST'])
@admin_required()
def merge_submissoes_whatsapp_route():
    """
    Gera texto WhatsApp para pedido fundido de múltiplas submissões APROVADAS.
    Payload: { "submissao_ids": [1, 2, 3] }
    """
    data = request.get_json() or {}
    submissao_ids = data.get('submissao_ids', [])
    restaurante_id = get_current_restaurante_id()
    response, status = services.merge_submissoes_whatsapp(submissao_ids, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/submissoes', methods=['GET'])
@admin_required()
def get_all_submissoes_route():
    """Retorna todas as submissões com filtro opcional por status."""
    status_filter = request.args.get('status')  # PENDENTE, APROVADO, REJEITADO
    arquivadas_param = request.args.get('arquivadas', '').lower()
    arquivadas = arquivadas_param in ('1', 'true', 'sim')
    submissoes, _ = services.get_all_submissoes(status_filter, arquivadas)
    return jsonify(submissoes)


@admin_bp.route('/submissoes/<int:submissao_id>', methods=['GET'])
@admin_required()
def get_submissao_by_id_route(submissao_id):
    """Retorna uma submissão específica por ID (apenas listas tradicionais)."""
    response, status = services.get_submissao_by_id(submissao_id)
    return jsonify(response), status


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


@admin_bp.route('/submissoes/<int:submissao_id>/arquivar', methods=['POST'])
@admin_required()
def arquivar_submissao_route(submissao_id):
    """Arquiva uma submissão APROVADA ou REJEITADA."""
    response, status = services.arquivar_submissao(submissao_id)
    return jsonify(response), status


@admin_bp.route('/submissoes/<int:submissao_id>/desarquivar', methods=['POST'])
@admin_required()
def desarquivar_submissao_route(submissao_id):
    """Remove o status de arquivada de uma submissão."""
    response, status = services.desarquivar_submissao(submissao_id)
    return jsonify(response), status


@admin_bp.route('/submissoes/<int:submissao_id>', methods=['DELETE'])
@admin_required()
def deletar_submissao_permanente_route(submissao_id):
    """Exclui permanentemente uma submissão arquivada e seus pedidos."""
    response, status = services.deletar_submissao_permanente(submissao_id)
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
    restaurante_id = get_current_restaurante_id()
    response, status = services.get_estoque_lista_admin(lista_id, restaurante_id)
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

@admin_bp.route('/pedidos/<int:pedido_id>/reverter', methods=['POST'])
@admin_required()
def reverter_pedido_route(pedido_id):
    """Reverte um pedido rejeitado para PENDENTE."""
    response, status = services.reverter_pedido(pedido_id)
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
    restaurante_id = get_current_restaurante_id()
    response, status = services.create_quotation_from_stock(data['fornecedor_id'], restaurante_id)
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
    restaurante_id = get_current_restaurante_id()
    response, status = services.create_lista(data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/listas', methods=['GET'])
@admin_required()
def get_listas_route():
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    listas, status = services.get_all_listas(restaurante_id)
    return jsonify(listas), status

@api_bp.route('/listas/<int:lista_id>/assign', methods=['POST'])
@admin_required()
def assign_colaboradores_route(lista_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.assign_colaboradores_to_lista(lista_id, data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>/unassign', methods=['DELETE'])
@admin_required()
def unassign_colaborador_route(lista_id):
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.unassign_colaborador_from_lista(lista_id, data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>', methods=['PUT'])
@admin_required()
def update_lista_route(lista_id):
    """Atualiza uma lista existente (nome e/ou descrição)."""
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.update_lista(lista_id, data, restaurante_id)
    return jsonify(response), status

@api_bp.route('/listas/<int:lista_id>', methods=['DELETE'])
@admin_required()
def delete_lista_route(lista_id):
    """Move uma lista para a lixeira (soft delete)."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.delete_lista(lista_id, restaurante_id)
    return jsonify(response), status

@admin_bp.route('/listas/deleted', methods=['GET'])
@admin_required()
def get_deleted_listas_route():
    """Retorna todas as listas deletadas (na lixeira)."""
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.get_deleted_listas(restaurante_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/restore', methods=['POST'])
@admin_required()
def restore_lista_route(lista_id):
    """Restaura uma lista da lixeira."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.restore_lista(lista_id, restaurante_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/permanent-delete', methods=['DELETE'])
@admin_required()
def permanent_delete_lista_route(lista_id):
    """Deleta permanentemente uma lista da lixeira."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.permanent_delete_lista(lista_id, restaurante_id)
    return jsonify(response), status

@admin_bp.route('/listas/permanent-delete-batch', methods=['POST'])
@admin_required()
def permanent_delete_listas_batch_route():
    """Deleta permanentemente múltiplas listas em lote."""
    data = request.get_json()
    lista_ids = data.get('lista_ids', [])
    restaurante_id = get_current_restaurante_id()
    response, status = services.permanent_delete_listas_batch(lista_ids, restaurante_id)
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

@collaborator_bp.route('/recent-activities', methods=['GET'])
@collaborator_required()
def collaborator_recent_activities_route():
    """Retorna atividades recentes do colaborador."""
    user_id = get_user_id_from_jwt()
    limit = request.args.get('limit', default=6, type=int)
    response, status = services.get_collaborator_recent_activities(user_id, limit)
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
    return jsonify([e.to_dict() for e in estoque if float(e.quantidade_minima) > 0])

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
    restaurante_id = get_current_restaurante_id()
    response, status = services.get_estoque_by_lista(lista_id, restaurante_id)
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
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.get_listas_status_submissoes(restaurante_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/aprovar-pedidos', methods=['POST'])
@admin_required()
def aprovar_todos_pedidos_lista_route(lista_id):
    """Aprova todos os pedidos pendentes de uma lista específica."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.aprovar_todos_pedidos_lista(lista_id, restaurante_id)
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
    data = request.get_json() or {}
    items_data = data.get('itens', [])

    if not items_data or not isinstance(items_data, list):
        return jsonify({"error": "Lista de itens é obrigatória."}), 400

    itens_com_origem = [item for item in items_data if 'id' in item]
    itens_legados = [item for item in items_data if 'item_id' in item and 'id' not in item]

    restaurante_id = get_current_restaurante_id()
    if not itens_com_origem:
        response, status = services.adicionar_itens_na_lista(lista_id, itens_legados, restaurante_id)
        return jsonify(response), status

    if restaurante_id is None:
        return jsonify({"error": "SUPER_ADMIN deve especificar restaurante_id."}), 400

    skip_param = request.args.get('skip_if_exists')
    skip_if_exists = False
    if skip_param is not None:
        skip_if_exists = str(skip_param).lower() in ['1', 'true', 'sim', 'yes']

    resultados = []
    erros = []

    for item_data in itens_com_origem:
        resultado, status = services.adicionar_item_na_lista_com_copia(
            lista_id, item_data, restaurante_id, skip_if_exists=skip_if_exists
        )
        if status in (200, 201):
            resultados.append(resultado)
        else:
            erros.append({
                "item_id": item_data.get('id'),
                "error": resultado.get('error')
            })

    legacy_result = None
    if itens_legados:
        legacy_result, _ = services.adicionar_itens_na_lista(lista_id, itens_legados, restaurante_id)

    payload = {
        "success": len(resultados),
        "errors": erros,
        "resultados": resultados
    }
    if legacy_result is not None:
        payload["legacy"] = legacy_result

    return jsonify(payload), 200 if not erros else 207

@admin_bp.route('/listas/<int:lista_id>/itens', methods=['GET'])
@admin_required()
def obter_itens_da_lista_route(lista_id):
    """Retorna todos os itens (estoques) vinculados a uma lista"""
    restaurante_id = get_current_restaurante_id()
    response, status = services.obter_itens_da_lista(lista_id, restaurante_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/itens/<int:item_id>', methods=['DELETE'])
@admin_required()
def remover_item_da_lista_route(lista_id, item_id):
    """Remove um item (estoque) de uma lista"""
    restaurante_id = get_current_restaurante_id()
    response, status = services.remover_item_da_lista(lista_id, item_id, restaurante_id)
    return jsonify(response), status


# ===== ITENS REGIONAIS =====

@admin_bp.route('/itens-regionais', methods=['GET'])
@admin_required()
def get_itens_regionais_route():
    """Retorna itens dos fornecedores regionais do restaurante."""
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    if restaurante_id is None:
        return jsonify({"error": "SUPER_ADMIN deve especificar restaurante_id."}), 400

    query = request.args.get('q')
    response, status = services.get_itens_regionais(restaurante_id, query)
    return jsonify(response), status


# ===== CATÁLOGO GLOBAL DE ITENS =====

@admin_bp.route('/catalogo-global', methods=['GET'])
@admin_required()
def get_catalogo_global_route():
    """
    Retorna todos os itens do catálogo global.
    Usado pelo admin no card "Itens e Insumos".
    """
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.get_catalogo_global(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/catalogo-global/<int:item_id>', methods=['PUT'])
@admin_required()
def editar_item_catalogo_global_route(item_id):
    """Edita um item do catálogo global"""
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.editar_item_catalogo_global(item_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/catalogo-global', methods=['POST'])
@admin_required()
def criar_item_catalogo_global_route():
    """Cria um novo item no catálogo global"""
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None:
        restaurante_id = data.get('restaurante_id')
    response, status = services.criar_item_catalogo_global(data, restaurante_id)
    return jsonify(response), status


# ===== LISTA MAE ITENS ENDPOINTS =====

@admin_bp.route('/listas/<int:lista_id>/lista-mae', methods=['GET'])
@admin_required()
def get_lista_mae_route(lista_id):
    """Retorna a Lista Mãe com todos os seus itens"""
    restaurante_id = get_current_restaurante_id()
    response, status = services.obter_lista_mae(lista_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/mae-itens', methods=['POST'])
@admin_required()
def adicionar_item_lista_mae_route(lista_id):
    """Adiciona um novo item à Lista Mãe"""
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.adicionar_item_lista_mae(lista_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/mae-itens/<int:item_id>', methods=['PUT'])
@admin_required()
def editar_item_lista_mae_route(lista_id, item_id):
    """Edita um item da Lista Mãe"""
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.editar_item_lista_mae(lista_id, item_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/mae-itens/<int:item_id>', methods=['DELETE'])
@admin_required()
def deletar_item_lista_mae_route(lista_id, item_id):
    """Deleta um item da Lista Mãe"""
    restaurante_id = get_current_restaurante_id()
    response, status = services.deletar_item_lista_mae(lista_id, item_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/itens/<int:item_id>/config', methods=['PUT'])
@admin_required()
def atualizar_config_item_route(lista_id, item_id):
    """
    Atualiza a configuração de threshold/fardo de um item na lista.
    Body: {
        "usa_threshold": true,
        "quantidade_por_fardo": 6
    }
    """
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.atualizar_config_item_ref(
        lista_id,
        item_id,
        data.get('quantidade_minima'),
        data.get('quantidade_por_fardo', 1.0),
        restaurante_id
    )
    return jsonify(response), status


@admin_bp.route('/listas/<int:lista_id>/atribuir-fornecedor', methods=['POST'])
@admin_required()
def atribuir_fornecedor_lista_mae_route(lista_id):
    """Atribui um fornecedor a múltiplos itens da Lista Mãe e gera pedidos"""
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.atribuir_fornecedor_lista_mae(lista_id, data, restaurante_id)
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
        
        restaurante_id = get_current_restaurante_id()
        response, status = services.copiar_itens_entre_listas(lista_id, data, restaurante_id)
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
        
        restaurante_id = get_current_restaurante_id()
        response, status = services.mover_itens_entre_listas(lista_id, data, restaurante_id)
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
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None and data.get('restaurante_id') is not None:
        try:
            restaurante_id = int(data.get('restaurante_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.importar_items_em_lote(lista_id, data, restaurante_id)
    return jsonify(response), status

@admin_bp.route('/listas/<int:lista_id>/export-csv', methods=['GET'])
@admin_required()
def export_lista_csv_route(lista_id):
    """Exporta os itens da lista mãe para CSV"""
    from flask import make_response

    restaurante_id = get_current_restaurante_id()
    response, status = services.export_lista_to_csv(lista_id, restaurante_id)

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

    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None:
        restaurante_id_param = request.form.get('restaurante_id') or request.args.get('restaurante_id')
        if restaurante_id_param:
            try:
                restaurante_id = int(restaurante_id_param)
            except ValueError:
                return jsonify({"error": "restaurante_id inválido"}), 400

    response, status = services.import_lista_from_csv(lista_id, file, restaurante_id)
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

    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None:
        restaurante_id_param = request.form.get('restaurante_id')
        if restaurante_id_param:
            try:
                restaurante_id = int(restaurante_id_param)
            except ValueError:
                return jsonify({"error": "restaurante_id inválido"}), 400

    response, status = services.create_lista_from_csv(nome, descricao, conteudo, restaurante_id)
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
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None and data.get('restaurante_id') is not None:
        try:
            restaurante_id = int(data.get('restaurante_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.executar_importacao_estoque(data, restaurante_id)
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
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None and data.get('restaurante_id') is not None:
        try:
            restaurante_id = int(data.get('restaurante_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.populate_database_with_mock_data(restaurante_id)
    return jsonify(response), status

@admin_bp.route('/database/export-bulk', methods=['POST'])
@admin_required()
def export_bulk_data_route():
    """Exporta múltiplos tipos de dados em um arquivo ZIP."""

    data = request.get_json() or {}
    tipos_dados = data.get('tipos_dados', [])
    restaurante_id = get_current_restaurante_id()
    if restaurante_id is None and data.get('restaurante_id') is not None:
        try:
            restaurante_id = int(data.get('restaurante_id'))
        except (TypeError, ValueError):
            return jsonify({"error": "restaurante_id inválido"}), 400

    if not tipos_dados:
        return jsonify({"error": "Nenhum tipo de dado selecionado para exportação."}), 400

    result, status = services.export_data_bulk(tipos_dados, restaurante_id)

    if status != 200:
        return jsonify(result), status

    # result é um BytesIO contendo o ZIP
    timestamp = brasilia_now().strftime('%Y%m%d_%H%M%S')
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


@auth_bp.route('/navbar-layout', methods=['GET'])
@jwt_required()
def get_navbar_layout_route():
    """Busca layout da navbar."""
    claims = get_jwt()
    role = None
    if claims.get('role') == 'SUPER_ADMIN':
        role = request.args.get('role') or None
    else:
        role = claims.get('role')
    response, status = services.get_navbar_layout(role)
    return jsonify(response), status


@auth_bp.route('/navbar-layout', methods=['POST'])
@super_admin_required()
def save_navbar_layout_route():
    """Salva layout da navbar (apenas SUPER_ADMIN)."""
    data = request.get_json() or {}
    response, status = services.save_navbar_layout(data, data.get('role'))
    return jsonify(response), status


@auth_bp.route('/navbar-activity', methods=['GET'])
@jwt_required()
def get_navbar_activity_route():
    """Retorna histórico de navegação recente."""
    user_id = get_jwt_identity()
    response, status = services.get_navbar_activity(user_id)
    return jsonify(response), status


@auth_bp.route('/navbar-activity', methods=['POST'])
@jwt_required()
def log_navbar_activity_route():
    """Registra um clique na navbar."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    response, status = services.log_navbar_activity(user_id, data)
    return jsonify(response), status


# ===== SUGESTÕES DE ITENS =====

@auth_bp.route('/sugestoes', methods=['POST'])
@jwt_required()
def criar_sugestao_route():
    """Usuário cria uma sugestão de novo item."""
    user_id = get_jwt_identity()
    data = request.get_json()
    restaurante_id = get_current_restaurante_id()
    response, status = services.criar_sugestao_item(user_id, data, restaurante_id)
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
    try:
        restaurante_id = get_current_restaurante_id()
        filtro_restaurante = request.args.get('restaurante_id')
        if restaurante_id is None and filtro_restaurante:
            try:
                restaurante_id = int(filtro_restaurante)
            except ValueError:
                return jsonify({"error": "restaurante_id inválido"}), 400

        print(f"[DEBUG] listar_sugestoes_pendentes - restaurante_id: {restaurante_id}")
        response, status = services.listar_sugestoes_pendentes(restaurante_id)
        print(f"[DEBUG] Response: {response}")
        return jsonify(response), status
    except Exception as e:
        print(f"[ERRO] listar_sugestoes_pendentes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro ao listar sugestões: {str(e)}"}), 500


@admin_bp.route('/sugestoes/pendentes/count', methods=['GET'])
@admin_required()
def contar_sugestoes_pendentes_route():
    """Retorna contagem de sugestões pendentes para notificação."""
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.contar_sugestoes_pendentes(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/sugestoes/<int:sugestao_id>/aprovar', methods=['PUT'])
@admin_required()
def aprovar_sugestao_route(sugestao_id):
    """Admin aprova uma sugestão."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status = services.aprovar_sugestao(sugestao_id, admin_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/sugestoes/<int:sugestao_id>/rejeitar', methods=['PUT'])
@admin_required()
def rejeitar_sugestao_route(sugestao_id):
    """Admin rejeita uma sugestão."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status = services.rejeitar_sugestao(sugestao_id, admin_id, data, restaurante_id)
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


@auth_bp.route('/itens-globais', methods=['GET'])
@jwt_required()
def listar_itens_globais_route():
    """Lista todos os itens do catálogo global para colaboradores."""
    try:
        restaurante_id = get_current_restaurante_id()
        query = ListaMaeItem.query.order_by(ListaMaeItem.nome)
        if restaurante_id is not None:
            query = query.filter_by(restaurante_id=restaurante_id)
        itens = query.all()
        return jsonify([{
            'id': item.id,
            'nome': item.nome,
            'unidade': item.unidade
        } for item in itens]), 200
    except Exception as e:
        return jsonify({'error': 'Erro ao buscar itens', 'message': str(e)}), 500


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
    """Adiciona item(ns) à lista rápida."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Verifica se está enviando múltiplos itens ou um único item
    if 'itens' in data and isinstance(data['itens'], list):
        response, status = services.adicionar_multiplos_itens_lista_rapida(lista_id, user_id, data)
    else:
        response, status = services.adicionar_item_lista_rapida(lista_id, user_id, data)
    
    return jsonify(response), status


@auth_bp.route('/listas-rapidas/<int:lista_id>/itens/temporario', methods=['POST'])
@jwt_required()
def adicionar_item_temporario_lista_rapida_route(lista_id):
    """Adiciona item temporário (não do catálogo global) a uma lista rápida."""
    data = request.get_json()
    response, status = services.adicionar_item_temporario_lista_rapida(lista_id, data)
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


@auth_bp.route('/listas-rapidas/<int:lista_id>/whatsapp', methods=['GET'])
@jwt_required()
def compartilhar_lista_rapida_whatsapp_route(lista_id):
    """GET /api/listas-rapidas/<id>/whatsapp - Gera texto para WhatsApp"""
    try:
        user_id = get_jwt_identity()
        # Verificar se o usuário é dono da lista
        from .models import ListaRapida
        lista = ListaRapida.query.get(lista_id)
        if not lista or lista.deletado:
            return jsonify({"error": "Lista não encontrada"}), 404
        if lista.usuario_id != int(user_id):
            return jsonify({"error": "Você não tem permissão para acessar esta lista"}), 403

        resultado = services.compartilhar_lista_rapida_whatsapp(lista_id)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== LISTA RÁPIDA - ADMIN =====

@admin_bp.route('/listas-rapidas/pendentes', methods=['GET'])
@admin_required()
def listar_listas_rapidas_pendentes_route():
    """Admin lista todas as listas rápidas pendentes."""
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.listar_listas_rapidas_pendentes(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/pendentes/count', methods=['GET'])
@admin_required()
def contar_listas_rapidas_pendentes_route():
    """Conta listas rápidas pendentes."""
    restaurante_id = get_current_restaurante_id()
    filtro_restaurante = request.args.get('restaurante_id')
    if restaurante_id is None and filtro_restaurante:
        try:
            restaurante_id = int(filtro_restaurante)
        except ValueError:
            return jsonify({"error": "restaurante_id inválido"}), 400
    response, status = services.contar_listas_rapidas_pendentes(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>', methods=['GET'])
@admin_required()
def obter_lista_rapida_admin_route(lista_id):
    """Admin obtém detalhes de qualquer lista rápida."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.obter_lista_rapida_admin(lista_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/itens', methods=['GET'])
@admin_required()
def listar_itens_lista_rapida_admin_route(lista_id):
    """Admin lista os itens de uma lista rápida."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.obter_lista_rapida_admin(lista_id, restaurante_id)
    if status != 200:
        return jsonify(response), status
    return jsonify(response.get('itens', [])), 200


@admin_bp.route('/listas-rapidas/<int:lista_id>/aprovar', methods=['PUT'])
@admin_required()
def aprovar_lista_rapida_route(lista_id):
    """Admin aprova lista rápida."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status = services.aprovar_lista_rapida(lista_id, admin_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/rejeitar', methods=['PUT'])
@admin_required()
def rejeitar_lista_rapida_route(lista_id):
    """Admin rejeita lista rápida."""
    admin_id = get_jwt_identity()
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status = services.rejeitar_lista_rapida(lista_id, admin_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/reverter', methods=['POST'])
@admin_required()
def reverter_lista_rapida_route(lista_id):
    """Admin reverte lista rápida APROVADA/REJEITADA para PENDENTE."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.reverter_lista_rapida_para_pendente(lista_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/arquivar', methods=['POST'])
@admin_required()
def arquivar_lista_rapida_route(lista_id):
    """Arquiva uma lista rápida APROVADA ou REJEITADA."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.arquivar_lista_rapida(lista_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/desarquivar', methods=['POST'])
@admin_required()
def desarquivar_lista_rapida_route(lista_id):
    """Remove o status de arquivada de uma lista rápida."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.desarquivar_lista_rapida(lista_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>', methods=['DELETE'])
@admin_required()
def deletar_lista_rapida_permanente_route(lista_id):
    """Exclui permanentemente uma lista rápida arquivada."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.deletar_lista_rapida_permanente(lista_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/itens', methods=['POST'])
@admin_required()
def adicionar_item_lista_rapida_admin_route(lista_id):
    """Admin adiciona item à lista rápida PENDENTE."""
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status = services.adicionar_item_lista_rapida_admin(lista_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/itens/<int:item_id>', methods=['DELETE'])
@admin_required()
def remover_item_lista_rapida_admin_route(lista_id, item_id):
    """Admin remove item da lista rápida PENDENTE."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.remover_item_lista_rapida_admin(lista_id, item_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/itens/<int:item_id>', methods=['PUT'])
@admin_required()
def editar_item_lista_rapida_admin_route(lista_id, item_id):
    """Admin edita observação/prioridade de item da lista rápida PENDENTE."""
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status = services.editar_item_lista_rapida_admin(lista_id, item_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/converter-checklist', methods=['POST'])
@admin_required()
def converter_lista_rapida_checklist_route(lista_id):
    """Converte uma lista rápida aprovada em checklist de compras."""
    try:
        data = request.get_json() or {}
        checklist = services.converter_lista_rapida_para_checklist(lista_id, data)
        return jsonify(checklist), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Erro ao converter para checklist', 'message': str(e)}), 500


@admin_bp.route('/listas-rapidas/<int:lista_id>/itens/<int:item_id>/descartar', methods=['PUT'])
@admin_required()
def descartar_item_lista_rapida_route(lista_id, item_id):
    """Admin marca um item como descartado (suficiente)."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.descartar_item_lista_rapida(lista_id, item_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/listas-rapidas/<int:lista_id>/itens/<int:item_id>/restaurar', methods=['PUT'])
@admin_required()
def restaurar_item_lista_rapida_route(lista_id, item_id):
    """Admin remove a marca de descartado de um item."""
    restaurante_id = get_current_restaurante_id()
    response, status = services.restaurar_item_lista_rapida(lista_id, item_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/itens-globais', methods=['GET'])
@admin_required()
def listar_itens_globais_admin_route():
    """Admin lista todos os itens do catálogo global."""
    try:
        restaurante_id = get_current_restaurante_id()
        query = ListaMaeItem.query.order_by(ListaMaeItem.nome)
        if restaurante_id is not None:
            query = query.filter_by(restaurante_id=restaurante_id)
        itens = query.all()
        return jsonify({
            'itens': [{
                'id': item.id,
                'nome': item.nome,
                'unidade': item.unidade
            } for item in itens]
        }), 200
    except Exception as e:
        return jsonify({'error': 'Erro ao buscar itens', 'message': str(e)}), 500


# ==================== CHECKLIST ROUTES ====================

@admin_bp.route('/submissoes/<int:submissao_id>/converter-checklist', methods=['POST'])
@admin_required()
def converter_submissao_para_checklist_route(submissao_id):
    """POST /api/admin/submissoes/<id>/converter-checklist - Converte submissão em checklist"""
    try:
        data = request.get_json()
        checklist = services.converter_submissao_para_checklist(submissao_id, data)
        return jsonify(checklist), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/checklists', methods=['GET'])
@admin_required()
def listar_checklists_route():
    """GET /api/admin/checklists?status=ATIVO - Lista checklists"""
    try:
        status_filter = request.args.get('status')
        checklists = services.listar_checklists(status_filter)
        return jsonify(checklists), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/checklists/<int:checklist_id>', methods=['GET'])
@admin_required()
def obter_checklist_route(checklist_id):
    """GET /api/admin/checklists/<id> - Obtém checklist com itens"""
    try:
        checklist = services.obter_checklist_por_id(checklist_id)
        return jsonify(checklist), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/checklists/<int:checklist_id>/itens/<int:item_id>/marcar', methods=['PUT'])
@admin_required()
def marcar_item_checklist_route(checklist_id, item_id):
    """PUT /api/admin/checklists/<id>/itens/<item_id>/marcar - Marca/desmarca item"""
    try:
        data = request.get_json()
        marcado = data.get('marcado', False)
        item = services.marcar_item_checklist(item_id, marcado)
        return jsonify(item), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/checklists/<int:checklist_id>/finalizar', methods=['POST'])
@admin_required()
def finalizar_checklist_route(checklist_id):
    """POST /api/admin/checklists/<id>/finalizar - Finaliza checklist"""
    try:
        checklist = services.finalizar_checklist(checklist_id)
        return jsonify(checklist), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/checklists/<int:checklist_id>/reabrir', methods=['POST'])
@admin_required()
def reabrir_checklist_route(checklist_id):
    """POST /api/admin/checklists/<id>/reabrir - Reabre checklist finalizado"""
    try:
        checklist = services.reabrir_checklist(checklist_id)
        return jsonify(checklist), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/checklists/<int:checklist_id>/whatsapp', methods=['GET'])
@admin_required()
def compartilhar_checklist_whatsapp_route(checklist_id):
    """GET /api/admin/checklists/<id>/whatsapp - Gera texto para WhatsApp"""
    try:
        resultado = services.compartilhar_checklist_whatsapp(checklist_id)
        return jsonify(resultado), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/notificacoes', methods=['GET'])
@jwt_required()
def listar_notificacoes_route():
    """Usuário lista suas notificações."""
    from flask_jwt_extended import get_jwt

    user_id = get_jwt_identity()
    claims = get_jwt()

    # Extrair restaurante_id do JWT
    role = claims.get('role')
    restaurante_id = None if role == 'SUPER_ADMIN' else claims.get('restaurante_id')

    response, status = services.listar_notificacoes_usuario(user_id, restaurante_id)
    return jsonify(response), status


@auth_bp.route('/notificacoes/<int:notificacao_id>/marcar-lida', methods=['PUT'])
@jwt_required()
def marcar_notificacao_lida_route(notificacao_id):
    """Marca uma notificação como lida."""
    user_id = get_jwt_identity()
    response, status = services.marcar_notificacao_lida(notificacao_id, user_id)
    return jsonify(response), status


@auth_bp.route('/notificacoes/marcar-todas-lidas', methods=['PUT'])
@jwt_required()
def marcar_todas_notificacoes_lidas_route():
    """Marca todas as notificações como lidas."""
    user_id = get_jwt_identity()
    response, status = services.marcar_todas_notificacoes_lidas(user_id)
    return jsonify(response), status


# ===== CONVITES DE USUÁRIOS =====

@admin_bp.route('/convites', methods=['POST'])
@admin_required()
def criar_convite():
    """POST /api/admin/convites - Cria novo convite de usuário."""
    data = request.get_json()

    if not data or 'role' not in data:
        return jsonify({"error": "Role é obrigatório"}), 400

    admin_id = get_user_id_from_jwt()
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        admin_role = identity.get('role')
    else:
        claims = get_jwt()
        admin_role = claims.get('role')
    restaurante_id = data.get('restaurante_id')

    response, status_code = services.criar_convite_usuario(
        admin_id,
        data['role'],
        admin_role,
        restaurante_id
    )
    return jsonify(response), status_code


@admin_bp.route('/convites', methods=['GET'])
@admin_required()
def listar_convites():
    """GET /api/admin/convites - Lista convites criados pelo admin."""
    admin_id = get_user_id_from_jwt()
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        admin_role = identity.get('role')
    else:
        claims = get_jwt()
        admin_role = claims.get('role')

    try:
        convites = services.listar_convites(admin_id, admin_role)
        return jsonify(convites), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/convites/<int:convite_id>', methods=['DELETE'])
@admin_required()
def excluir_convite(convite_id):
    """DELETE /api/admin/convites/<id> - Exclui convite."""
    admin_id = get_user_id_from_jwt()
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        admin_role = identity.get('role')
    else:
        claims = get_jwt()
        admin_role = claims.get('role')

    response, status_code = services.excluir_convite(admin_id, admin_role, convite_id)
    return jsonify(response), status_code


@admin_bp.route('/convites-restaurante', methods=['POST'])
@super_admin_required()
def criar_convite_restaurante_route():
    """POST /api/admin/convites-restaurante - Cria convite para cadastro de restaurante."""
    admin_id = get_user_id_from_jwt()
    data = request.get_json() or {}
    limite_usos = data.get('limite_usos', 1)

    # Converte para int se for string
    try:
        limite_usos = int(limite_usos)
    except (ValueError, TypeError):
        limite_usos = 1

    response, status_code = services.criar_convite_restaurante(admin_id, limite_usos)
    return jsonify(response), status_code


@admin_bp.route('/convites-restaurante', methods=['GET'])
@super_admin_required()
def listar_convites_restaurante_route():
    """GET /api/admin/convites-restaurante - Lista convites de restaurante."""
    admin_id = get_user_id_from_jwt()
    response, status_code = services.listar_convites_restaurante(admin_id)
    return jsonify(response), status_code


@admin_bp.route('/convites-restaurante/<int:convite_id>', methods=['PUT'])
@super_admin_required()
def editar_convite_restaurante_route(convite_id):
    """PUT /api/admin/convites-restaurante/<id> - Edita convite de restaurante."""
    admin_id = get_user_id_from_jwt()
    data = request.get_json() or {}
    response, status_code = services.editar_convite_restaurante(admin_id, convite_id, data)
    return jsonify(response), status_code


@admin_bp.route('/convites-restaurante/<int:convite_id>', methods=['DELETE'])
@super_admin_required()
def excluir_convite_restaurante_route(convite_id):
    """DELETE /api/admin/convites-restaurante/<id> - Exclui convite de restaurante."""
    admin_id = get_user_id_from_jwt()
    response, status_code = services.excluir_convite_restaurante(admin_id, convite_id)
    return jsonify(response), status_code


@auth_bp.route('/validar-convite', methods=['GET'])
def validar_convite():
    """GET /api/auth/validar-convite?token=XXX - Valida se token é válido."""
    token = request.args.get('token')

    if not token:
        return jsonify({"error": "Token não fornecido"}), 400

    response, status_code = services.validar_token_convite(token)
    return jsonify(response), status_code


@auth_bp.route('/register-com-convite', methods=['POST'])
def register_com_convite():
    """POST /api/auth/register-com-convite - Registra usuário com convite."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('senha') or not data.get('nome') or not data.get('token_convite'):
        return jsonify({"error": "Dados incompletos para registro com convite."}), 400

    response, status_code = services.register_user_com_convite(data)
    return jsonify(response), status_code


# ===== ROTAS PÚBLICAS: SOLICITAÇÕES DE RESTAURANTE =====

@public_bp.route('/validar-convite-restaurante', methods=['GET'])
def validar_convite_restaurante_route():
    """GET /api/public/validar-convite-restaurante?token=XXX - Valida convite de restaurante."""
    token = request.args.get('token')

    if not token:
        return jsonify({"error": "Token não fornecido"}), 400

    response, status_code = services.validar_convite_restaurante(token)
    return jsonify(response), status_code


@public_bp.route('/register-restaurante-com-convite', methods=['POST'])
def register_restaurante_com_convite_route():
    """POST /api/public/register-restaurante-com-convite - Registro imediato com convite."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Dados não fornecidos."}), 400

    response, status_code = services.registrar_restaurante_com_convite(data)
    return jsonify(response), status_code


@public_bp.route('/solicitar-restaurante', methods=['POST'])
def solicitar_restaurante_route():
    """POST /api/public/solicitar-restaurante - Cria solicitação de cadastro de restaurante (público)."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Dados não fornecidos."}), 400

    response, status_code = services.criar_solicitacao_restaurante(data)
    return jsonify(response), status_code


# ===== ROTAS ADMIN: SOLICITAÇÕES DE RESTAURANTE =====

@admin_bp.route('/solicitacoes-restaurante', methods=['GET'])
@super_admin_required()
def listar_solicitacoes_restaurante_route():
    """GET /api/admin/solicitacoes-restaurante?status=PENDENTE - Lista solicitações (SUPER_ADMIN)."""
    filtro_status = request.args.get('status')
    response, status_code = services.listar_solicitacoes_restaurante(filtro_status)
    return jsonify(response), status_code


@admin_bp.route('/solicitacoes-restaurante/<int:solicitacao_id>', methods=['GET'])
@super_admin_required()
def obter_solicitacao_restaurante_route(solicitacao_id):
    """GET /api/admin/solicitacoes-restaurante/<id> - Obtém detalhes (SUPER_ADMIN)."""
    response, status_code = services.obter_solicitacao_restaurante(solicitacao_id)
    return jsonify(response), status_code


@admin_bp.route('/solicitacoes-restaurante/<int:solicitacao_id>/aprovar', methods=['PUT'])
@super_admin_required()
def aprovar_solicitacao_restaurante_route(solicitacao_id):
    """PUT /api/admin/solicitacoes-restaurante/<id>/aprovar - Aprova solicitação (SUPER_ADMIN)."""
    user_id = get_user_id_from_jwt()
    response, status_code = services.aprovar_solicitacao_restaurante(solicitacao_id, user_id)
    return jsonify(response), status_code


@admin_bp.route('/solicitacoes-restaurante/<int:solicitacao_id>/rejeitar', methods=['PUT'])
@super_admin_required()
def rejeitar_solicitacao_restaurante_route(solicitacao_id):
    """PUT /api/admin/solicitacoes-restaurante/<id>/rejeitar - Rejeita solicitação (SUPER_ADMIN)."""
    data = request.get_json()
    motivo = data.get('motivo', '') if data else ''
    user_id = get_user_id_from_jwt()
    response, status_code = services.rejeitar_solicitacao_restaurante(solicitacao_id, user_id, motivo)
    return jsonify(response), status_code


# ============================================
# SUPPLIER AUTH (CONVITE + AUTO-CADASTRO)
# ============================================

@auth_bp.route('/validar-convite-fornecedor', methods=['GET'])
def validar_convite_fornecedor_route():
    token = request.args.get('token', '')
    response, status = services.validar_convite_fornecedor(token)
    return jsonify(response), status


@auth_bp.route('/register-fornecedor-com-convite', methods=['POST'])
def register_fornecedor_com_convite_route():
    data = request.get_json() or {}
    response, status = services.register_fornecedor_com_convite(data)
    return jsonify(response), status


@auth_bp.route('/register-fornecedor', methods=['POST'])
def register_fornecedor_auto_route():
    data = request.get_json() or {}
    response, status = services.register_fornecedor_auto(data)
    return jsonify(response), status


# ============================================
# ADMIN - CONVITES FORNECEDOR
# ============================================

@admin_bp.route('/convites-fornecedor', methods=['POST'])
@super_admin_required()
def criar_convite_fornecedor_route():
    data = request.get_json() or {}
    limite_usos = data.get('limite_usos', 1)
    user_id = get_user_id_from_jwt()
    response, status = services.criar_convite_fornecedor(user_id, limite_usos)
    return jsonify(response), status


@admin_bp.route('/convites-fornecedor', methods=['GET'])
@super_admin_required()
def listar_convites_fornecedor_route():
    user_id = get_user_id_from_jwt()
    response, status = services.listar_convites_fornecedor(user_id)
    return jsonify(response), status


@admin_bp.route('/convites-fornecedor/<int:convite_id>', methods=['DELETE'])
@super_admin_required()
def excluir_convite_fornecedor_route(convite_id):
    user_id = get_user_id_from_jwt()
    response, status = services.excluir_convite_fornecedor(user_id, convite_id)
    return jsonify(response), status


@admin_bp.route('/convites-fornecedor/<int:convite_id>', methods=['PUT'])
@super_admin_required()
def editar_convite_fornecedor_route(convite_id):
    data = request.get_json() or {}
    user_id = get_user_id_from_jwt()
    response, status = services.editar_convite_fornecedor(user_id, convite_id, data)
    return jsonify(response), status


# ============================================
# ADMIN - FORNECEDORES CADASTRADOS
# ============================================

@admin_bp.route('/fornecedores-cadastrados', methods=['GET'])
@admin_required()
def listar_fornecedores_cadastrados_route():
    user_id = get_user_id_from_jwt()
    aprovado_param = request.args.get('aprovado')
    filtro_aprovado = None
    if aprovado_param is not None:
        filtro_aprovado = aprovado_param.lower() == 'true'
    response, status = services.listar_fornecedores_cadastrados(user_id, filtro_aprovado)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>/aprovar', methods=['PUT'])
@super_admin_required()
def aprovar_fornecedor_route(fornecedor_id):
    data = request.get_json() or {}
    aprovado = data.get('aprovado', True)
    user_id = get_user_id_from_jwt()
    response, status = services.aprovar_fornecedor(user_id, fornecedor_id, aprovado)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>', methods=['GET'])
@admin_required()
def obter_detalhes_fornecedor_admin_route(fornecedor_id):
    user_id = get_user_id_from_jwt()
    response, status = services.obter_detalhes_fornecedor_admin(user_id, fornecedor_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>', methods=['PUT'])
@super_admin_required()
def atualizar_fornecedor_admin_route(fornecedor_id):
    data = request.get_json() or {}
    restaurante_id = get_current_restaurante_id()
    response, status = services.update_fornecedor(fornecedor_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>', methods=['DELETE'])
@super_admin_required()
def deletar_fornecedor_admin_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    response, status = services.delete_fornecedor(fornecedor_id, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>/itens', methods=['GET'])
@admin_required()
def listar_itens_fornecedor_admin_route(fornecedor_id):
    user_id = get_user_id_from_jwt()
    response, status = services.listar_itens_de_fornecedor_admin(user_id, fornecedor_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>/usuarios', methods=['GET'])
@admin_required()
def listar_usuarios_fornecedor_admin_route(fornecedor_id):
    user_id = get_user_id_from_jwt()
    response, status = services.listar_usuarios_fornecedor(user_id, fornecedor_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>/login', methods=['POST'])
@super_admin_required()
def criar_login_fornecedor_admin_route(fornecedor_id):
    data = request.get_json() or {}
    user_id = get_user_id_from_jwt()
    response, status = services.criar_login_fornecedor(user_id, fornecedor_id, data)
    return jsonify(response), status


# ============================================
# SUPPLIER - PERFIL E ITENS
# ============================================

@supplier_bp.route('/perfil', methods=['GET'])
@supplier_required()
def obter_perfil_fornecedor_route():
    user_id = get_user_id_from_jwt()
    response, status = services.obter_perfil_fornecedor(user_id)
    return jsonify(response), status


@supplier_bp.route('/perfil', methods=['PUT'])
@supplier_required()
def atualizar_perfil_fornecedor_route():
    user_id = get_user_id_from_jwt()
    data = request.get_json() or {}
    response, status = services.atualizar_perfil_fornecedor(user_id, data)
    return jsonify(response), status


@supplier_bp.route('/itens', methods=['GET'])
@supplier_required()
def listar_itens_fornecedor_route():
    user_id = get_user_id_from_jwt()
    response, status = services.listar_itens_fornecedor(user_id)
    return jsonify(response), status


@supplier_bp.route('/itens', methods=['POST'])
@supplier_required()
def criar_item_fornecedor_route():
    user_id = get_user_id_from_jwt()
    data = request.get_json() or {}
    response, status = services.criar_item_fornecedor(user_id, data)
    return jsonify(response), status


@supplier_bp.route('/itens/<int:item_id>', methods=['GET'])
@supplier_required()
def obter_item_fornecedor_route(item_id):
    user_id = get_user_id_from_jwt()
    response, status = services.obter_item_fornecedor(user_id, item_id)
    return jsonify(response), status


@supplier_bp.route('/itens/<int:item_id>', methods=['PUT'])
@supplier_required()
def atualizar_item_fornecedor_route(item_id):
    user_id = get_user_id_from_jwt()
    data = request.get_json() or {}
    response, status = services.atualizar_item_fornecedor(user_id, item_id, data)
    return jsonify(response), status


@supplier_bp.route('/itens/<int:item_id>', methods=['DELETE'])
@supplier_required()
def deletar_item_fornecedor_route(item_id):
    user_id = get_user_id_from_jwt()
    response, status = services.deletar_item_fornecedor(user_id, item_id)
    return jsonify(response), status


@supplier_bp.route('/itens/<int:item_id>/historico-precos', methods=['GET'])
@supplier_required()
def historico_precos_item_route(item_id):
    user_id = get_user_id_from_jwt()
    response, status = services.obter_historico_precos_item(user_id, item_id)
    return jsonify(response), status
