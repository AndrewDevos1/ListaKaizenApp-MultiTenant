from .models import Usuario, UserRoles, Item, Area, Fornecedor, Estoque, Cotacao, CotacaoStatus, CotacaoItem, Pedido, PedidoStatus, Lista, ListaMaeItem, ListaItemRef, Submissao, SubmissaoStatus
from .extensions import db
from . import repositories
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from flask import current_app
import re
import unicodedata

def register_user(data):
    """Cria um novo usuário no sistema."""
    if Usuario.query.filter_by(email=data['email']).first():
        return {"error": "E-mail já cadastrado."}, 409

    # Verifica se username já existe (se fornecido)
    if data.get('username') and Usuario.query.filter_by(username=data['username']).first():
        return {"error": "Nome de usuário já cadastrado."}, 409

    hashed_password = generate_password_hash(data['senha'])

    # Verifica se foi fornecido token de admin
    TOKEN_ADMIN = "Kaiser@210891"
    token_fornecido = data.get('token_admin')

    # Se token fornecido e correto, cria como ADMIN aprovado
    if token_fornecido and token_fornecido == TOKEN_ADMIN:
        role = UserRoles.ADMIN
        aprovado = True
        mensagem = "Administrador criado e aprovado automaticamente!"
    else:
        # Comportamento padrão: COLLABORATOR não aprovado
        role = UserRoles.COLLABORATOR
        aprovado = False
        mensagem = "Solicitação de cadastro enviada com sucesso. Aguardando aprovação do administrador."

    new_user = Usuario(
        nome=data['nome'],
        username=data.get('username'),
        email=data['email'],
        senha_hash=hashed_password,
        role=role,
        aprovado=aprovado
    )

    db.session.add(new_user)
    db.session.commit()

    return {"message": mensagem}, 201

def authenticate_user(data):
    """Autentica um usuário e retorna um token JWT."""
    # Aceita login com email ou username
    login_field = data.get('email') or data.get('username')

    # Busca por email ou username
    user = Usuario.query.filter(
        (Usuario.email == login_field) | (Usuario.username == login_field)
    ).first()

    if not user or not check_password_hash(user.senha_hash, data['senha']):
        return {"error": "Credenciais inválidas."}, 401

    if not user.aprovado:
        return {"error": "Usuário pendente de aprovação."}, 403

    if not user.ativo:
        return {"error": "Usuário desativado. Entre em contato com o administrador."}, 403

    # O identity deve ser uma STRING (Flask-JWT-Extended espera string no campo 'sub')
    # Dados adicionais vão em additional_claims
    additional_claims = {"role": user.role.value}
    expires = timedelta(days=1)
    access_token = create_access_token(
        identity=str(user.id),  # Converte ID para string
        additional_claims=additional_claims,  # Role e outros dados extras
        expires_delta=expires
    )

    return {"access_token": access_token}, 200

def get_test_users():
    """Retorna lista de usuários ativos para atalho de login em desenvolvimento."""
    try:
        # Buscar todos os usuários aprovados e ativos
        usuarios = Usuario.query.filter_by(aprovado=True, ativo=True).all()

        # Mapeamento de senhas para testes (desenvolvimento apenas)
        senhas_teste = {
            "Andrew": "210891",
            "Joya": "Joya"
        }

        usuarios_data = []
        for user in usuarios:
            senha_teste = senhas_teste.get(user.nome, "teste123")
            usuarios_data.append({
                "id": user.id,
                "nome": user.nome,
                "email": user.email,
                "role": user.role.value,
                "senha_padrao": senha_teste  # Senha para testes (desenvolvimento)
            })

        return {"usuarios": usuarios_data}, 200
    except Exception as e:
        current_app.logger.error(f"[GET_TEST_USERS] Erro: {str(e)}")
        return {"error": "Erro ao buscar usuários de teste"}, 500

def approve_user(user_id):
    """Aprova o cadastro de um usuário."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    user.aprovado = True
    db.session.commit()
    return {"message": f"Usuário {user.nome} aprovado com sucesso."}, 200

def update_user_by_admin(user_id, data):
    """Atualiza os dados de um usuário a pedido de um admin."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    # Validação de email duplicado
    if 'email' in data and data['email'] != user.email:
        if Usuario.query.filter_by(email=data['email']).first():
            return {"error": "E-mail já cadastrado."}, 409

    # Atualiza os campos
    user.nome = data.get('nome', user.nome)
    user.email = data.get('email', user.email)
    
    # Atualiza o role, se fornecido e válido
    if 'role' in data and data['role'] in [r.value for r in UserRoles]:
        user.role = UserRoles(data['role'])

    db.session.commit()
    return {"message": "Usuário atualizado com sucesso.", "user": user.to_dict()}, 200

def create_user_by_admin(data):
    """Cria um novo usuário (admin ou colaborador) a pedido de um admin."""
    try:
        print("[SERVICE] Iniciando criacao de usuario...")
        print(f"[SERVICE] Email: {data.get('email')}")
        print(f"[SERVICE] Nome: {data.get('nome')}")
        print(f"[SERVICE] Username: {data.get('username')}")
        print(f"[SERVICE] Role: {data.get('role')}")

        # Validação de email duplicado
        if Usuario.query.filter_by(email=data['email']).first():
            print(f"[SERVICE] E-mail ja existe: {data['email']}")
            return {"error": "E-mail já cadastrado."}, 409

        # Verifica se username já existe (se fornecido)
        if data.get('username'):
            existing_username = Usuario.query.filter_by(username=data['username']).first()
            if existing_username:
                print(f"[SERVICE] Username ja existe: {data['username']}")
                return {"error": "Nome de usuário já cadastrado."}, 409

        # Hash da senha
        hashed_password = generate_password_hash(data['senha'])
        print("[SERVICE] Senha hashada com sucesso")

        # Define o role
        role = UserRoles.ADMIN if data.get('role') == 'ADMIN' else UserRoles.COLLABORATOR
        print(f"[SERVICE] Role definida: {role}")

        # Cria o novo usuário
        new_user = Usuario(
            nome=data['nome'],
            username=data.get('username') if data.get('username') else None,
            email=data['email'],
            senha_hash=hashed_password,
            role=role,
            aprovado=True  # Criado por admin, já vem aprovado
        )

        print("[SERVICE] Objeto Usuario criado")

        db.session.add(new_user)
        print("[SERVICE] Usuario adicionado a sessao")

        db.session.commit()
        print(f"[SERVICE] Usuario salvo no banco! ID: {new_user.id}")

        return {"message": f"Usuário {new_user.nome} criado com sucesso como {role.value}."}, 201

    except KeyError as e:
        print(f"[SERVICE] Campo obrigatorio ausente: {e}")
        return {"error": f"Campo obrigatório ausente: {str(e)}"}, 400

    except Exception as e:
        print(f"[SERVICE] Erro inesperado: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return {"error": f"Erro ao criar usuário: {str(e)}"}, 500

def get_all_users():
    """Retorna todos os usuários cadastrados."""
    return repositories.get_all(Usuario), 200

def change_password(user_id, data):
    """Altera a senha de um usuário."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    # Verifica se a senha atual está correta
    if not check_password_hash(user.senha_hash, data.get('senha_atual')):
        return {"error": "Senha atual incorreta."}, 401

    # Verifica se nova senha e confirmação são iguais
    if data.get('nova_senha') != data.get('confirmar_senha'):
        return {"error": "A nova senha e a confirmação não coincidem."}, 400

    # Atualiza a senha
    user.senha_hash = generate_password_hash(data.get('nova_senha'))
    db.session.commit()

    return {"message": "Senha alterada com sucesso."}, 200

def update_user_profile(user_id, data):
    """Atualiza o perfil de um usuário."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    # Verifica se o email já está em uso por outro usuário
    if 'email' in data and data['email'] != user.email:
        existing_user = Usuario.query.filter_by(email=data['email']).first()
        if existing_user:
            return {"error": "E-mail já está em uso."}, 409

    # Verifica se o username já está em uso por outro usuário
    if 'username' in data and data['username'] != user.username:
        existing_user = Usuario.query.filter_by(username=data['username']).first()
        if existing_user:
            return {"error": "Nome de usuário já está em uso."}, 409

    # Atualiza os campos permitidos
    if 'nome' in data:
        user.nome = data['nome']
    if 'username' in data:
        user.username = data['username']
    if 'email' in data:
        user.email = data['email']

    db.session.commit()

    return {"message": "Perfil atualizado com sucesso.", "user": user.to_dict()}, 200

def get_user_profile(user_id):
    """Retorna o perfil de um usuário."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    return user.to_dict(), 200

def delete_user(user_id):
    """Deleta um usuário e todos os registros relacionados."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    # Remove relacionamentos many-to-many com listas
    user.listas_atribuidas = []
    db.session.flush()

    # SQLAlchemy vai lidar com cascade delete automático para registros relacionados
    db.session.delete(user)
    db.session.commit()

    return {"message": f"Usuário {user.nome} deletado com sucesso."}, 200

def deactivate_user(user_id):
    """Desativa um usuário (não conseguirá fazer login)."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    if not user.ativo:
        return {"error": "Usuário já está desativado."}, 400

    user.ativo = False
    db.session.commit()

    return {"message": f"Usuário {user.nome} desativado com sucesso."}, 200

def reactivate_user(user_id):
    """Reativa um usuário desativado."""
    user = db.session.get(Usuario, user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    if user.ativo:
        return {"error": "Usuário já está ativo."}, 400

    user.ativo = True
    db.session.commit()

    return {"message": f"Usuário {user.nome} reativado com sucesso."}, 200


# --- Serviços de Inventário ---

def create_item(data):
    new_item = Item(nome=data['nome'], unidade_medida=data['unidade_medida'], fornecedor_id=data['fornecedor_id'])
    repositories.add_instance(new_item)
    # Precisamos de um serializador para retornar o objeto
    return {"id": new_item.id, "nome": new_item.nome, "unidade_medida": new_item.unidade_medida, "fornecedor_id": new_item.fornecedor_id}, 201

def get_all_items():
    return repositories.get_all(Item), 200

def get_item_by_id(item_id):
    return repositories.get_by_id(Item, item_id), 200

def update_item(item_id, data):
    updated_item = repositories.update_instance(Item, item_id, data)
    if not updated_item:
        return {"error": "Item não encontrado"}, 404
    return updated_item.to_dict(), 200

def delete_item(item_id):
    if not repositories.delete_instance(Item, item_id):
        return {"error": "Item não encontrado"}, 404
    return {}, 204


def create_area(data):
    new_area = Area(nome=data['nome'])
    repositories.add_instance(new_area)
    return {"id": new_area.id, "nome": new_area.nome}, 201

def get_all_areas():
    return repositories.get_all(Area), 200

def get_area_by_id(area_id):
    return repositories.get_by_id(Area, area_id), 200

def update_area(area_id, data):
    updated_area = repositories.update_instance(Area, area_id, data)
    if not updated_area:
        return {"error": "Área não encontrada"}, 404
    return updated_area.to_dict(), 200

def delete_area(area_id):

    if not repositories.delete_instance(Area, area_id):

        return {"error": "Área não encontrada"}, 404

    return {}, 204



def get_area_status(area_id):

    """Verifica se uma área possui itens com quantidade atual abaixo da mínima."""

    has_pending_items = Estoque.query.filter_by(area_id=area_id).filter(Estoque.quantidade_atual < Estoque.quantidade_minima).first() is not None

    return {"has_pending_items": has_pending_items}, 200



def create_fornecedor(data):
    # Extrai lista_ids do data se existir
    lista_ids = data.pop('lista_ids', [])

    # Cria novo fornecedor com campos básicos
    new_fornecedor = Fornecedor(
        nome=data['nome'],
        contato=data.get('contato'),
        meio_envio=data.get('meio_envio'),
        responsavel=data.get('responsavel'),
        observacao=data.get('observacao')
    )
    repositories.add_instance(new_fornecedor)

    # Adiciona as listas ao fornecedor se houver
    if lista_ids:
        from .models import Lista
        for lista_id in lista_ids:
            lista = repositories.get_by_id(Lista, lista_id)
            if lista:
                new_fornecedor.listas.append(lista)
        repositories.add_instance(new_fornecedor)

    return {"id": new_fornecedor.id, "nome": new_fornecedor.nome}, 201

def get_all_fornecedores():
    return repositories.get_all(Fornecedor), 200

def get_fornecedor_by_id(fornecedor_id):
    return repositories.get_by_id(Fornecedor, fornecedor_id), 200

def update_fornecedor(fornecedor_id, data):
    from .extensions import db
    from .models import Lista

    # Extrai lista_ids do data se existir
    lista_ids = data.pop('lista_ids', None)

    # Busca o fornecedor
    updated_fornecedor = repositories.get_by_id(Fornecedor, fornecedor_id)
    if not updated_fornecedor:
        return {"error": "Fornecedor não encontrado"}, 404

    # Atualiza campos do fornecedor
    for key, value in data.items():
        setattr(updated_fornecedor, key, value)

    # Atualiza as listas se foi fornecido lista_ids
    if lista_ids is not None:
        # Remove todas as listas anteriores
        updated_fornecedor.listas.clear()

        # Adiciona as novas listas
        for lista_id in lista_ids:
            lista = repositories.get_by_id(Lista, lista_id)
            if lista:
                updated_fornecedor.listas.append(lista)

    # Faz um único commit para todas as mudanças
    db.session.commit()

    return updated_fornecedor.to_dict(), 200

def delete_fornecedor(fornecedor_id):
    if not repositories.delete_instance(Fornecedor, fornecedor_id):
        return {"error": "Fornecedor não encontrado"}, 404
    return {}, 204


def get_pedidos_fornecedor_por_lista(fornecedor_id):
    """
    Retorna os pedidos de um fornecedor agrupados por lista.
    Formato: {lista_id: {lista_nome: str, pedidos: [...]}}
    """
    fornecedor = repositories.get_by_id(Fornecedor, fornecedor_id)
    if not fornecedor:
        return {"error": "Fornecedor não encontrado"}, 404

    # Agrupa pedidos por lista
    resultado = {}

    # Para cada lista atribuída ao fornecedor
    for lista in fornecedor.listas:
        # Busca itens que pertencem a essa lista
        itens_lista = Item.query.filter_by(fornecedor_id=fornecedor_id).all()

        pedidos_lista = []
        for item in itens_lista:
            # Busca pedidos pendentes para esse item
            pedidos_item = Pedido.query.filter_by(
                item_id=item.id,
                fornecedor_id=fornecedor_id,
                status='PENDENTE'
            ).all()

            for pedido in pedidos_item:
                pedidos_lista.append({
                    'item_nome': item.nome,
                    'quantidade': float(pedido.quantidade_solicitada),
                    'unidade': item.unidade_medida,
                    'data_pedido': pedido.data_pedido.isoformat(),
                    'usuario': pedido.usuario.nome if pedido.usuario else 'N/A'
                })

        if pedidos_lista:
            resultado[lista.id] = {
                'lista_nome': lista.nome,
                'pedidos': pedidos_lista,
                'total_itens': len(pedidos_lista)
            }

    return resultado, 200


def get_pedidos_fornecedor_consolidado(fornecedor_id):
    """
    Retorna todos os pedidos de um fornecedor consolidados (sem separação por lista).
    """
    fornecedor = repositories.get_by_id(Fornecedor, fornecedor_id)
    if not fornecedor:
        return {"error": "Fornecedor não encontrado"}, 404

    # Busca todos os itens desse fornecedor
    itens_fornecedor = Item.query.filter_by(fornecedor_id=fornecedor_id).all()

    pedidos_consolidados = []
    for item in itens_fornecedor:
        # Busca todos os pedidos pendentes para esse item
        pedidos_item = Pedido.query.filter_by(
            item_id=item.id,
            fornecedor_id=fornecedor_id,
            status='PENDENTE'
        ).all()

        for pedido in pedidos_item:
            pedidos_consolidados.append({
                'item_nome': item.nome,
                'quantidade': float(pedido.quantidade_solicitada),
                'unidade': item.unidade_medida,
                'data_pedido': pedido.data_pedido.isoformat(),
                'usuario': pedido.usuario.nome if pedido.usuario else 'N/A'
            })

    return {
        'fornecedor_nome': fornecedor.nome,
        'fornecedor_contato': fornecedor.contato,
        'fornecedor_meio_envio': fornecedor.meio_envio,
        'total_pedidos': len(pedidos_consolidados),
        'pedidos': pedidos_consolidados
    }, 200


# --- Serviços de Cotação ---

def create_quotation_from_stock(fornecedor_id):
    """Cria uma nova Cotação com base na necessidade de estoque para um fornecedor."""
    fornecedor = repositories.get_by_id(Fornecedor, fornecedor_id)
    if not fornecedor:
        return {"error": "Fornecedor não encontrado"}, 404

    pedidos = {}
    for item in fornecedor.itens:
        total_a_pedir = 0
        estoques_do_item = Estoque.query.filter_by(item_id=item.id).all()
        for estoque in estoques_do_item:
            if estoque.quantidade_atual < estoque.quantidade_minima:
                total_a_pedir += (estoque.quantidade_minima - estoque.quantidade_atual)
        
        if total_a_pedir > 0:
            pedidos[item] = total_a_pedir

    if not pedidos:
        return {"message": f"Nenhum item precisa de reposição para o fornecedor {fornecedor.nome}."}, 200

    # Cria a Cotação
    nova_cotacao = Cotacao(fornecedor_id=fornecedor_id)
    repositories.add_instance(nova_cotacao)

    # Adiciona os itens na cotação
    for item, quantidade in pedidos.items():
        cotacao_item = CotacaoItem(
            cotacao_id=nova_cotacao.id,
            item_id=item.id,
            quantidade=quantidade,
            preco_unitario=0  # Preço a ser preenchido pelo admin
        )
        db.session.add(cotacao_item)
    
    db.session.commit()

    return nova_cotacao.to_dict(), 201


def get_all_cotacoes():
    """Retorna todas as cotações."""
    return repositories.get_all(Cotacao), 200

def get_cotacao_by_id(cotacao_id):
    """Retorna uma cotação específica com seus itens."""
    cotacao = repositories.get_by_id(Cotacao, cotacao_id)
    if not cotacao:
        return {"error": "Cotação não encontrada"}, 404
    # Aqui precisamos de uma serialização mais inteligente que inclua os itens
    # Vou modificar o to_dict da Cotação no models.py depois
    return cotacao, 200

def update_cotacao_item_price(item_id, data):
    """Atualiza o preço de um item em uma cotação."""
    cotacao_item = repositories.get_by_id(CotacaoItem, item_id)
    if not cotacao_item:
        return {"error": "Item de cotação não encontrado"}, 404
    
    if 'preco_unitario' in data:
        updated_item = repositories.update_instance(CotacaoItem, item_id, {'preco_unitario': data['preco_unitario']})
        return updated_item.to_dict(), 200
    return {"error": "Preço unitário não fornecido"}, 400


def get_estoque_by_area(area_id):
    estoque_list = Estoque.query.filter_by(area_id=area_id).all()
    return estoque_list, 200

def update_estoque_item(estoque_id, data):
    estoque_item = repositories.get_by_id(Estoque, estoque_id)
    if not estoque_item:
        return {"error": "Item de estoque não encontrado."}, 404
    
    # Apenas a quantidade_atual pode ser atualizada por esta rota
    if 'quantidade_atual' in data:
        estoque_item.quantidade_atual = data['quantidade_atual']
        db.session.commit()
        return {"message": "Estoque atualizado"}, 200

def save_estoque_draft(data):
    """Salva um rascunho do estoque de uma área."""
    area_id = data.get('area_id')
    items_data = data.get('items', [])

    if not area_id:
        return {"error": "ID da área não fornecido."}, 400

    for item_data in items_data:
        estoque_id = item_data.get('id')
        quantidade_atual = item_data.get('quantidade_atual')

        if estoque_id is None or quantidade_atual is None:
            continue # Pula itens mal formatados

        estoque_item = repositories.get_by_id(Estoque, estoque_id)
        if estoque_item and estoque_item.area_id == area_id:
            estoque_item.quantidade_atual = quantidade_atual
            db.session.add(estoque_item)
    
    db.session.commit()
    return {"message": "Rascunho do estoque salvo com sucesso!"}, 200

def get_pedidos_by_user(user_id):
    """Retorna todos os pedidos feitos por um usuário."""
    pedidos = Pedido.query.filter_by(usuario_id=user_id).order_by(Pedido.data_pedido.desc()).all()
    return pedidos, 200


def get_submissoes_by_user(user_id):
    """
    Retorna todas as submissões do usuário com pedidos agrupados.
    Formato otimizado para exibição em tela.
    """
    submissoes = Submissao.query.options(
        db.joinedload(Submissao.lista),
        db.joinedload(Submissao.pedidos).joinedload(Pedido.item)
    ).filter_by(usuario_id=user_id).order_by(Submissao.data_submissao.desc()).all()
    
    resultado = []
    for sub in submissoes:
        sub_dict = {
            "id": sub.id,
            "lista_id": sub.lista_id,
            "lista_nome": sub.lista.nome if sub.lista else "N/A",
            "data_submissao": sub.data_submissao.isoformat(),
            "status": sub.status.value,
            "total_pedidos": sub.total_pedidos,
            "pedidos": [
                {
                    "id": p.id,
                    "item_nome": p.item.nome if p.item else "N/A",
                    "quantidade_solicitada": float(p.quantidade_solicitada),
                    "status": p.status.value,
                    "unidade": p.item.unidade if p.item else ""
                }
                for p in sub.pedidos
            ]
        }
        resultado.append(sub_dict)
    
    return resultado, 200


def get_all_submissoes(status_filter=None):
    """
    Retorna todas as submissões (admin) com pedidos agrupados.
    
    Args:
        status_filter: PENDENTE, APROVADO, REJEITADO, PARCIALMENTE_APROVADO ou None
    """
    query = Submissao.query.options(
        db.joinedload(Submissao.lista),
        db.joinedload(Submissao.usuario),
        db.joinedload(Submissao.pedidos).joinedload(Pedido.item)
    )
    
    if status_filter:
        query = query.filter_by(status=status_filter)
    
    submissoes = query.order_by(Submissao.data_submissao.desc()).all()
    
    resultado = []
    for sub in submissoes:
        sub_dict = {
            "id": sub.id,
            "lista_id": sub.lista_id,
            "lista_nome": sub.lista.nome if sub.lista else "N/A",
            "usuario_id": sub.usuario_id,
            "usuario_nome": sub.usuario.nome if sub.usuario else "N/A",
            "data_submissao": sub.data_submissao.isoformat(),
            "status": sub.status.value,
            "total_pedidos": sub.total_pedidos,
            "pedidos": [
                {
                    "id": p.id,
                    "item_nome": p.item.nome if p.item else "N/A",
                    "quantidade_solicitada": float(p.quantidade_solicitada),
                    "status": p.status.value,
                    "unidade": p.item.unidade if p.item else ""
                }
                for p in sub.pedidos
            ]
        }
        resultado.append(sub_dict)
    
    return resultado, 200


def aprovar_submissao(submissao_id):
    """Aprova todos os pedidos de uma submissão."""
    submissao = repositories.get_by_id(Submissao, submissao_id)
    if not submissao:
        return {"error": "Submissão não encontrada."}, 404
    
    # Aprovar todos os pedidos
    for pedido in submissao.pedidos:
        pedido.status = PedidoStatus.APROVADO
    
    submissao.status = SubmissaoStatus.APROVADO
    db.session.commit()
    
    return {"message": f"Submissão #{submissao_id} aprovada com sucesso!"}, 200


def rejeitar_submissao(submissao_id):
    """Rejeita todos os pedidos de uma submissão."""
    submissao = repositories.get_by_id(Submissao, submissao_id)
    if not submissao:
        return {"error": "Submissão não encontrada."}, 404
    
    # Rejeitar todos os pedidos
    for pedido in submissao.pedidos:
        pedido.status = PedidoStatus.REJEITADO
    
    submissao.status = SubmissaoStatus.REJEITADO
    db.session.commit()
    
    return {"message": f"Submissão #{submissao_id} rejeitada."}, 200


def submit_pedidos(user_id):
    """Cria registros de Pedido para todos os itens que estão abaixo do estoque mínimo."""
    itens_a_pedir = db.session.query(Estoque, Item).join(Item).filter(Estoque.quantidade_atual < Estoque.quantidade_minima).all()

    if not itens_a_pedir:
        return {"message": "Nenhum item precisa de reposição." }, 200

    novos_pedidos = []
    for estoque, item in itens_a_pedir:
        quantidade_a_pedir = estoque.quantidade_minima - estoque.quantidade_atual
        novo_pedido = Pedido(
            item_id=item.id,
            fornecedor_id=item.fornecedor_id,
            quantidade_solicitada=quantidade_a_pedir,
            usuario_id=user_id
        )
        novos_pedidos.append(novo_pedido)
        db.session.add(novo_pedido)

    db.session.commit()
    return {"message": f"{len(novos_pedidos)} pedidos foram gerados com sucesso." }, 201


def get_all_pedidos(status_filter=None):
    """
    Retorna todos os pedidos do sistema.

    Args:
        status_filter: Filtra por status (PENDENTE, APROVADO, REJEITADO). Se None, retorna todos.
    """
    query = Pedido.query

    if status_filter:
        query = query.filter_by(status=status_filter)

    pedidos = query.order_by(Pedido.data_pedido.desc()).all()
    return pedidos, 200


def aprovar_pedido(pedido_id):
    """Aprova um pedido pendente."""
    pedido = repositories.get_by_id(Pedido, pedido_id)

    if not pedido:
        return {"error": "Pedido não encontrado."}, 404

    if pedido.status != PedidoStatus.PENDENTE:
        return {"error": f"Apenas pedidos pendentes podem ser aprovados. Status atual: {pedido.status.value}"}, 400

    pedido.status = PedidoStatus.APROVADO
    db.session.commit()

    return {"message": "Pedido aprovado com sucesso.", "pedido": pedido.to_dict()}, 200


def rejeitar_pedido(pedido_id):
    """Rejeita um pedido pendente."""
    pedido = repositories.get_by_id(Pedido, pedido_id)

    if not pedido:
        return {"error": "Pedido não encontrado."}, 404

    if pedido.status != PedidoStatus.PENDENTE:
        return {"error": f"Apenas pedidos pendentes podem ser rejeitados. Status atual: {pedido.status.value}"}, 400

    pedido.status = PedidoStatus.REJEITADO
    db.session.commit()

    return {"message": "Pedido rejeitado com sucesso.", "pedido": pedido.to_dict()}, 200


def aprovar_pedidos_lote(pedido_ids):
    """Aprova múltiplos pedidos em lote."""
    if not pedido_ids or not isinstance(pedido_ids, list):
        return {"error": "Lista de IDs inválida."}, 400

    aprovados = 0
    erros = []

    for pedido_id in pedido_ids:
        pedido = repositories.get_by_id(Pedido, pedido_id)

        if not pedido:
            erros.append(f"Pedido {pedido_id} não encontrado")
            continue

        if pedido.status != PedidoStatus.PENDENTE:
            erros.append(f"Pedido {pedido_id} não está pendente")
            continue

        pedido.status = PedidoStatus.APROVADO
        aprovados += 1

    db.session.commit()

    return {
        "message": f"{aprovados} pedido(s) aprovado(s) com sucesso.",
        "aprovados": aprovados,
        "erros": erros if erros else None
    }, 200


def rejeitar_pedidos_lote(pedido_ids):
    """Rejeita múltiplos pedidos em lote."""
    if not pedido_ids or not isinstance(pedido_ids, list):
        return {"error": "Lista de IDs inválida."}, 400

    rejeitados = 0
    erros = []

    for pedido_id in pedido_ids:
        pedido = repositories.get_by_id(Pedido, pedido_id)

        if not pedido:
            erros.append(f"Pedido {pedido_id} não encontrado")
            continue

        if pedido.status != PedidoStatus.PENDENTE:
            erros.append(f"Pedido {pedido_id} não está pendente")
            continue

        pedido.status = PedidoStatus.REJEITADO
        rejeitados += 1

    db.session.commit()

    return {
        "message": f"{rejeitados} pedido(s) rejeitado(s) com sucesso.",
        "rejeitados": rejeitados,
        "erros": erros if erros else None
    }, 200


def editar_pedido(pedido_id, data):
    """
    Edita um pedido (permite alterar quantidade solicitada).
    Apenas pedidos pendentes podem ser editados.
    """
    pedido = repositories.get_by_id(Pedido, pedido_id)

    if not pedido:
        return {"error": "Pedido não encontrado."}, 404

    if pedido.status != PedidoStatus.PENDENTE:
        return {"error": f"Apenas pedidos pendentes podem ser editados. Status atual: {pedido.status.value}"}, 400

    # Atualizar quantidade
    if 'quantidade_solicitada' in data:
        quantidade = data['quantidade_solicitada']

        if not isinstance(quantidade, (int, float)) or quantidade <= 0:
            return {"error": "Quantidade deve ser um número positivo."}, 400

        pedido.quantidade_solicitada = quantidade

    db.session.commit()

    return {"message": "Pedido editado com sucesso.", "pedido": pedido.to_dict()}, 200

def atualizar_estoque_e_calcular_pedido(estoque_id, quantidade_atual, usuario_id):
    """
    Atualiza a quantidade atual de um estoque e calcula o pedido automaticamente.
    Também registra auditoria (usuário e data da submissão).
    """
    estoque = repositories.get_by_id(Estoque, estoque_id)
    if not estoque:
        return {"error": "Item de estoque não encontrado."}, 404

    # Atualiza quantidade atual
    estoque.quantidade_atual = quantidade_atual

    # Calcula pedido automaticamente
    estoque.pedido = estoque.calcular_pedido()

    # Registra auditoria
    estoque.data_ultima_submissao = datetime.now(timezone.utc)
    estoque.usuario_ultima_submissao_id = usuario_id

    db.session.commit()
    return estoque.to_dict(), 200

def submit_estoque_lista(lista_id, usuario_id, items_data):
    """
    Submete múltiplos itens de estoque de uma lista.
    REFATORADO: Usa ListaItemRef em vez de Estoque.
    Calcula pedidos automaticamente e cria registros de Pedido se necessário.

    items_data: [{"estoque_id": 1, "quantidade_atual": 5}, ...]
    NOTA: estoque_id é interpretado como item_id (compatibilidade)
    
    OTIMIZADO: Busca TODOS os refs de uma vez (1 query ao invés de N queries).
    Cria Submissao para agrupar pedidos.
    """
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    # Valida se usuário está atribuído à lista
    if usuario_id not in [u.id for u in lista.colaboradores]:
        return {"error": "Você não tem acesso a esta lista."}, 403

    # 🚀 OTIMIZAÇÃO: Buscar TODOS os refs de uma vez com IN (1 query ao invés de 32)
    item_ids = [item.get('estoque_id') for item in items_data if item.get('estoque_id')]
    refs_map = {}
    if item_ids:
        refs = ListaItemRef.query.options(
            db.joinedload(ListaItemRef.item)
        ).filter(
            ListaItemRef.lista_id == lista_id,
            ListaItemRef.item_id.in_(item_ids)
        ).all()
        refs_map = {ref.item_id: ref for ref in refs}

    # Criar Submissao primeiro
    submissao = Submissao(
        lista_id=lista_id,
        usuario_id=usuario_id,
        status=SubmissaoStatus.PENDENTE
    )
    db.session.add(submissao)
    db.session.flush()  # Gera ID da submissao

    pedidos_criados = []
    refs_atualizados = []
    agora = datetime.now(timezone.utc)

    for item_data in items_data:
        estoque_id = item_data.get('estoque_id')  # Na verdade é item_id
        quantidade_atual = item_data.get('quantidade_atual')

        if not estoque_id or quantidade_atual is None:
            continue

        ref = refs_map.get(estoque_id)
        if not ref:
            continue

        # Atualiza quantidade
        ref.quantidade_atual = quantidade_atual
        ref.atualizado_em = agora
        refs_atualizados.append(ref)

        # Cria Pedido se quantidade está abaixo do mínimo
        if float(quantidade_atual) < float(ref.quantidade_minima):
            quantidade_a_pedir = float(ref.quantidade_minima) - float(quantidade_atual)
            
            novo_pedido = Pedido(
                submissao_id=submissao.id,
                lista_mae_item_id=ref.item_id,
                fornecedor_id=None,
                quantidade_solicitada=quantidade_a_pedir,
                usuario_id=usuario_id,
                status=PedidoStatus.PENDENTE
            )
            pedidos_criados.append(novo_pedido)
            
            current_app.logger.info(
                f"[SUBMIT] Pedido criado: item {ref.item.nome}, "
                f"qtd={quantidade_a_pedir}, usuario={usuario_id}"
            )

    # Atualizar contador de pedidos na submissao
    submissao.total_pedidos = len(pedidos_criados)

    # Commit único ao final
    if pedidos_criados:
        db.session.add_all(pedidos_criados)
    db.session.commit()

    return {
        "message": f"Lista submetida com sucesso! {len(pedidos_criados)} pedido(s) criado(s).",
        "submissao_id": submissao.id,
        "estoques_atualizados": len(refs_atualizados),
        "pedidos_criados": len(pedidos_criados)
    }, 201

# --- Serviços de Lista ---

def create_lista(data):
    """Cria uma nova lista de compras, opcionalmente com itens do catálogo global."""
    if not data or not data.get('nome'):
        return {"error": "O nome da lista é obrigatório."}, 400

    # Validar se já existe uma lista com esse nome
    nome = data['nome'].strip()
    lista_existente = Lista.query.filter(func.lower(Lista.nome) == func.lower(nome)).first()
    if lista_existente:
        return {"error": f"Já existe uma lista com o nome '{nome}'."}, 409

    nova_lista = Lista(
        nome=nome,
        descricao=data.get('descricao', '').strip() if data.get('descricao') else None
    )
    repositories.add_instance(nova_lista)
    db.session.flush()  # Garantir que nova_lista.id está disponível
    
    # Adicionar itens do catálogo global, se fornecidos
    itens_data = data.get('itens', [])
    if itens_data and isinstance(itens_data, list):
        for item_data in itens_data:
            item_id = item_data.get('item_id')
            if not item_id:
                continue
                
            # Validar que o item existe no catálogo global
            item = ListaMaeItem.query.get(item_id)
            if not item:
                continue
            
            # Criar referência lista-item
            lista_item_ref = ListaItemRef(
                lista_id=nova_lista.id,
                item_id=item_id,
                quantidade_atual=float(item_data.get('quantidade_atual', 0)),
                quantidade_minima=float(item_data.get('quantidade_minima', 1.0))
            )
            db.session.add(lista_item_ref)
    
    db.session.commit()

    return nova_lista.to_dict(), 201

def get_all_listas():
    """Retorna todas as listas de compras não deletadas."""
    listas = Lista.query.filter_by(deletado=False).all()
    
    # Serializar listas incluindo colaboradores
    resultado = []
    for lista in listas:
        lista_dict = lista.to_dict()
        # Adicionar colaboradores manualmente
        lista_dict['colaboradores'] = [
            {
                'id': colaborador.id,
                'nome': colaborador.nome,
                'email': colaborador.email,
                'role': colaborador.role.value if hasattr(colaborador.role, 'value') else colaborador.role
            }
            for colaborador in lista.colaboradores
        ]
        resultado.append(lista_dict)
    
    return resultado, 200

def get_lista_by_id(lista_id):
    """Retorna uma lista específica."""
    return repositories.get_by_id(Lista, lista_id), 200

def assign_colaboradores_to_lista(lista_id, data):
    """Atribui um ou mais colaboradores a uma lista."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    colaborador_ids = data.get('colaborador_ids', [])
    if not colaborador_ids:
        # Se a lista de IDs está vazia, remove todos os colaboradores
        lista.colaboradores = []
    else:
        # Buscar todos os colaboradores válidos primeiro
        colaboradores_novos = []
        for user_id in colaborador_ids:
            user = repositories.get_by_id(Usuario, user_id)
            if user and user.role == UserRoles.COLLABORATOR:
                colaboradores_novos.append(user)
        
        # Substituir de uma vez (mais eficiente)
        lista.colaboradores = colaboradores_novos
    
    db.session.commit()

    lista_dict = lista.to_dict()
    lista_dict["colaboradores"] = [colaborador.to_dict() for colaborador in lista.colaboradores]
    return lista_dict, 200

def unassign_colaborador_from_lista(lista_id, data):
    """Desatribui um colaborador de uma lista."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    colaborador_id = data.get('colaborador_id')
    if not colaborador_id:
        return {"error": "ID do colaborador não fornecido."}, 400

    user = repositories.get_by_id(Usuario, colaborador_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    if user in lista.colaboradores:
        lista.colaboradores.remove(user)
        db.session.commit()
        return {"message": "Colaborador desatribuído com sucesso."}, 200
    else:
        return {"error": "Colaborador não está atribuído a esta lista."}, 400

def update_lista(lista_id, data):
    """Atualiza nome e/ou descrição de uma lista."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    # Validar se nome já existe (se estiver sendo alterado)
    if 'nome' in data and data['nome']:
        novo_nome = data['nome'].strip()
        # Verificar se o nome mudou (case-insensitive)
        if novo_nome.lower() != lista.nome.lower():
            existing = Lista.query.filter(
                func.lower(Lista.nome) == func.lower(novo_nome),
                Lista.id != lista_id
            ).first()
            if existing:
                return {"error": f"Já existe uma lista com o nome '{novo_nome}'."}, 409

    # Atualizar campos
    if 'nome' in data and data['nome']:
        lista.nome = data['nome'].strip()
    if 'descricao' in data:
        lista.descricao = data['descricao'].strip() if data['descricao'] else None

    db.session.commit()
    return lista.to_dict(), 200

def delete_lista(lista_id):
    """Faz soft delete de uma lista (move para lixeira)."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    # Soft delete
    lista.deletado = True
    lista.data_delecao = datetime.now(timezone.utc)
    db.session.commit()

    return {"message": "Lista movida para lixeira."}, 200


def get_deleted_listas():
    """Retorna todas as listas deletadas (na lixeira)."""
    listas = Lista.query.filter_by(deletado=True).order_by(Lista.data_delecao.desc()).all()
    return [lista.to_dict() for lista in listas], 200


def restore_lista(lista_id):
    """Restaura uma lista da lixeira."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    if not lista.deletado:
        return {"error": "Esta lista não está na lixeira."}, 400

    # Restaurar
    lista.deletado = False
    lista.data_delecao = None
    db.session.commit()

    return {"message": "Lista restaurada com sucesso.", "lista": lista.to_dict()}, 200


def permanent_delete_lista(lista_id):
    """Deleta permanentemente uma lista da lixeira."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    if not lista.deletado:
        return {"error": "Apenas listas na lixeira podem ser deletadas permanentemente."}, 400

    # Deletar permanentemente
    db.session.delete(lista)
    db.session.commit()

    return {"message": "Lista deletada permanentemente."}, 200


def permanent_delete_listas_batch(lista_ids):
    """Deleta permanentemente múltiplas listas em lote."""
    if not lista_ids or not isinstance(lista_ids, list):
        return {"error": "Lista de IDs inválida."}, 400

    deleted_count = 0
    errors = []

    for lista_id in lista_ids:
        lista = repositories.get_by_id(Lista, lista_id)
        if not lista:
            errors.append(f"Lista {lista_id} não encontrada")
            continue

        if not lista.deletado:
            errors.append(f"Lista {lista_id} não está na lixeira")
            continue

        try:
            db.session.delete(lista)
            deleted_count += 1
        except Exception as e:
            errors.append(f"Erro ao deletar lista {lista_id}: {str(e)}")

    db.session.commit()

    return {
        "message": f"{deleted_count} lista(s) deletada(s) permanentemente.",
        "deleted_count": deleted_count,
        "errors": errors if errors else None
    }, 200


# --- Serviços de Dashboard ---

def get_user_stats(user_id):
    """Retorna estatísticas para o dashboard de um usuário específico."""
    pending_submissions = Pedido.query.filter_by(usuario_id=user_id, status='PENDENTE').count()
    completed_lists = 0 # Placeholder, a lógica de "lista completa" precisa ser definida

    stats_data = {
        'pending_submissions': pending_submissions,
        'completed_lists': completed_lists,
    }
    
    return stats_data, 200

def get_dashboard_summary():
    """Retorna dados agregados para o dashboard do admin."""
    total_users = Usuario.query.count()
    pending_users = Usuario.query.filter_by(aprovado=False).count()
    total_lists = Lista.query.count()
    total_items = Item.query.count()
    if total_items == 0:
        total_items = ListaMaeItem.query.count()
    pending_submissions = Pedido.query.filter_by(status=PedidoStatus.PENDENTE).count()
    orders_today = Pedido.query.filter(
        func.date(Pedido.data_pedido) == datetime.now(timezone.utc).date()
    ).count()
    pending_cotacoes = Cotacao.query.filter_by(status=CotacaoStatus.PENDENTE).count()
    completed_cotacoes = Cotacao.query.filter_by(status=CotacaoStatus.CONCLUIDA).count()

    summary_data = {
        'total_users': total_users,
        'pending_users': pending_users,
        'total_lists': total_lists,
        'total_items': total_items,
        'pending_submissions': pending_submissions,
        'pending_cotacoes': pending_cotacoes,
        'orders_today': orders_today,
        'completed_cotacoes': completed_cotacoes,
    }
    
    return summary_data, 200

def get_activity_summary():
    """Retorna o número de pedidos por dia nos últimos 7 dias."""
    today = datetime.now(timezone.utc).date()
    dates = [today - timedelta(days=i) for i in range(6, -1, -1)] # Últimos 7 dias

    activity_data = []
    for d in dates:
        count = Pedido.query.filter(func.date(Pedido.data_pedido) == d).count()
        activity_data.append(count)

    labels = [d.strftime('%d/%m') for d in dates]

    return {"labels": labels, "data": activity_data}, 200


def get_catalogo_global():
    """
    Retorna todos os itens do catálogo global.
    Usado pelo admin no card "Itens e Insumos".
    """
    itens = ListaMaeItem.query.order_by(ListaMaeItem.nome).all()

    itens_data = []
    for item in itens:
        # Contar quantas listas usam este item
        total_listas = ListaItemRef.query.filter_by(item_id=item.id).count()

        itens_data.append({
            "id": item.id,
            "nome": item.nome,
            "unidade": item.unidade,
            "total_listas": total_listas,
            "criado_em": item.criado_em.isoformat() if item.criado_em else None,
            "atualizado_em": item.atualizado_em.isoformat() if item.atualizado_em else None
        })

    return {"itens": itens_data, "total": len(itens_data)}, 200


def get_listas_status_submissoes():
    """
    Retorna o status das submissões de listas com pedidos pendentes.

    Para cada lista, inclui:
    - ID e nome
    - Data da última submissão
    - Quantidade de pedidos pendentes
    """
    listas = Lista.query.filter_by(deletado=False).all()
    resultado = []

    for lista in listas:
        estoques = Estoque.query.filter_by(lista_id=lista.id).all()
        if not estoques:
            continue

        datas_submissao = [e.data_ultima_submissao for e in estoques if e.data_ultima_submissao]
        ultima_submissao = max(datas_submissao) if datas_submissao else None

        item_ids = {e.item_id for e in estoques if e.item_id}
        if not item_ids:
            continue

        pedidos_pendentes = Pedido.query.filter(
            Pedido.item_id.in_(item_ids),
            Pedido.status == PedidoStatus.PENDENTE
        ).count()

        if pedidos_pendentes > 0:
            resultado.append({
                "id": lista.id,
                "nome": lista.nome,
                "area": lista.nome,
                "last_submission": ultima_submissao.isoformat() if ultima_submissao else None,
                "pending_submissions": pedidos_pendentes
            })

    return resultado, 200

def aprovar_todos_pedidos_lista(lista_id):
    """
    Aprova todos os pedidos pendentes associados aos itens de uma lista.
    """
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    estoques = Estoque.query.filter_by(lista_id=lista_id).all()
    item_ids = {e.item_id for e in estoques if e.item_id}

    if not item_ids:
        return {"error": "Lista não possui itens."}, 404

    pedidos_pendentes = Pedido.query.filter(
        Pedido.item_id.in_(item_ids),
        Pedido.status == PedidoStatus.PENDENTE
    ).all()

    if not pedidos_pendentes:
        return {"error": "Nenhum pedido pendente encontrado para esta lista."}, 404

    for pedido in pedidos_pendentes:
        pedido.status = PedidoStatus.APROVADO

    db.session.commit()

    return {
        "message": f"Todos os {len(pedidos_pendentes)} pedidos pendentes foram aprovados com sucesso!",
        "pedidos_aprovados": len(pedidos_pendentes),
        "lista_nome": lista.nome
    }, 200

def get_collaborator_dashboard_summary(user_id):
    """Retorna estatísticas do dashboard para colaboradores."""
    from .models import Usuario, Pedido, Lista
    from .extensions import db

    # Buscar o usuário
    usuario = db.session.get(Usuario, user_id)
    if not usuario:
        return {"error": "Usuário não encontrado"}, 404

    # Número de áreas atribuídas ao colaborador (via listas)
    minhas_areas = db.session.query(Lista).filter(
        Lista.colaboradores.any(id=user_id)
    ).count()

    # Submissões pendentes do colaborador
    pending_submissions = Pedido.query.filter_by(
        usuario_id=user_id,
        status=PedidoStatus.PENDENTE
    ).count()

    # Submissões concluídas do colaborador
    completed_submissions = Pedido.query.filter_by(
        usuario_id=user_id,
        status=PedidoStatus.APROVADO
    ).count()

    # Pedidos pendentes
    pedidos_pendentes = Pedido.query.filter_by(
        usuario_id=user_id,
        status=PedidoStatus.PENDENTE
    ).count()

    summary_data = {
        "minhas_areas": minhas_areas,
        "pending_submissions": pending_submissions,
        "completed_submissions": completed_submissions,
        "pedidos_pendentes": pedidos_pendentes
    }

    return summary_data, 200

def get_minhas_listas_status(user_id):
    """
    Retorna status das listas atribuídas ao colaborador.
    Inclui última submissão e quantidade de itens pendentes por lista.
    """
    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        return {"error": "Usuário não encontrado."}, 404

    listas = [lista for lista in usuario.listas_atribuidas if not lista.deletado]
    resultado = []

    for lista in listas:
        estoques = Estoque.query.filter_by(lista_id=lista.id).all()
        datas_submissao = [e.data_ultima_submissao for e in estoques if e.data_ultima_submissao]
        ultima_submissao = max(datas_submissao) if datas_submissao else None

        pending_items = sum(
            1 for estoque in estoques
            if float(estoque.quantidade_atual) < float(estoque.quantidade_minima)
        )

        resultado.append({
            "id": lista.id,
            "nome": lista.nome,
            "last_submission": ultima_submissao.isoformat() if ultima_submissao else None,
            "pending_items": pending_items
        })

    return resultado, 200

def get_minhas_areas_status(user_id):
    """
    Retorna status das áreas atribuídas ao colaborador.
    """
    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        return {"error": "Usuário não encontrado."}, 404

    pedidos = Pedido.query.filter_by(usuario_id=user_id).all()
    areas_status = {}

    for pedido in pedidos:
        if pedido.item and pedido.item.area:
            area_id = pedido.item.area.id
            area_nome = pedido.item.area.nome

            if area_id not in areas_status:
                areas_status[area_id] = {
                    "id": area_id,
                    "area": area_nome,
                    "last_submission": None,
                    "pending_items": 0
                }

            if pedido.data_pedido:
                if not areas_status[area_id]["last_submission"] or pedido.data_pedido > areas_status[area_id]["last_submission"]:
                    areas_status[area_id]["last_submission"] = pedido.data_pedido

            if pedido.status == PedidoStatus.PENDENTE:
                areas_status[area_id]["pending_items"] += 1

    resultado = []
    for area_status in areas_status.values():
        if area_status["last_submission"]:
            area_status["last_submission"] = area_status["last_submission"].strftime("%Y-%m-%d %H:%M")
        else:
            area_status["last_submission"] = "Nunca"
        resultado.append(area_status)

    return resultado, 200

# --- Serviços de Listas com Estoque (Nova Feature) ---

def get_minhas_listas(user_id):
    """Retorna todas as listas atribuídas a um colaborador."""
    current_app.logger.info(f"[GET_MINHAS_LISTAS] user_id: {user_id}")

    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        current_app.logger.error(f"[GET_MINHAS_LISTAS] Usuário {user_id} não encontrado")
        return {"error": "Usuário não encontrado."}, 404

    # Filtrar apenas listas não deletadas
    listas = [l for l in usuario.listas_atribuidas if not l.deletado]
    
    current_app.logger.info(f"[GET_MINHAS_LISTAS] Usuário: {usuario.nome}, Listas atribuídas: {len(listas)}")
    for lista in listas:
        current_app.logger.info(f"  - Lista: {lista.id} - {lista.nome}")

    return {"listas": [lista.to_dict() for lista in listas]}, 200

def get_estoque_by_lista(lista_id):
    """Retorna todos os estoques (itens) de uma lista específica."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    estoques = Estoque.query.filter_by(lista_id=lista_id).all()
    return [estoque.to_dict() for estoque in estoques], 200

def get_lista_mae_consolidada(lista_id):
    """
    Retorna a Lista Mãe consolidada com última submissão de cada item.
    Usada pelo admin para visualizar o consolidado de todas as submissões.
    """
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    estoques = Estoque.query.filter_by(lista_id=lista_id).all()

    itens_consolidados = []
    for estoque in estoques:
        usuario_submissao = None
        if estoque.usuario_ultima_submissao:
            usuario_submissao = {
                "id": estoque.usuario_ultima_submissao.id,
                "nome": estoque.usuario_ultima_submissao.nome
            }

        item_consolidado = {
            "estoque_id": estoque.id,
            "item_id": estoque.item_id,
            "item_nome": estoque.item.nome,
            "item_unidade": estoque.item.unidade_medida,
            "fornecedor_id": estoque.item.fornecedor_id,
            "fornecedor_nome": estoque.item.fornecedor.nome if estoque.item.fornecedor else None,
            "quantidade_minima": float(estoque.quantidade_minima),
            "quantidade_atual": float(estoque.quantidade_atual),
            "pedido": float(estoque.pedido) if estoque.pedido else estoque.calcular_pedido(),
            "data_ultima_submissao": estoque.data_ultima_submissao.isoformat() if estoque.data_ultima_submissao else None,
            "usuario_ultima_submissao": usuario_submissao
        }
        itens_consolidados.append(item_consolidado)

    consolidado = {
        "lista_id": lista.id,
        "lista_nome": lista.nome,
        "lista_descricao": lista.descricao,
        "data_criacao": lista.data_criacao.isoformat() if lista.data_criacao else None,
        "itens": itens_consolidados,
        "total_itens": len(itens_consolidados),
        "total_em_falta": sum(1 for item in itens_consolidados if item["pedido"] > 0),
        "total_pedido": sum(item["pedido"] for item in itens_consolidados)
    }

    return consolidado, 200

def adicionar_itens_na_lista(lista_id, items_data):
    """
    Adiciona/atualiza itens de estoque em uma lista.

    items_data: [
        {"item_id": 1, "quantidade_minima": 10},
        {"item_id": 2, "quantidade_minima": 5}
    ]
    """
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    itens_adicionados = []

    for item_data in items_data:
        item_id = item_data.get('item_id')
        quantidade_minima = item_data.get('quantidade_minima', 0)

        if not item_id:
            continue

        item = repositories.get_by_id(Item, item_id)
        if not item:
            continue

        # Verifica se o estoque já existe
        estoque_existente = Estoque.query.filter_by(
            lista_id=lista_id,
            item_id=item_id
        ).first()

        if estoque_existente:
            # Atualiza quantidade mínima
            estoque_existente.quantidade_minima = quantidade_minima
        else:
            # Cria novo estoque vinculado à lista
            novo_estoque = Estoque(
                lista_id=lista_id,
                item_id=item_id,
                area_id=1,  # Padrão para listas (não é específico de área)
                quantidade_atual=0,
                quantidade_minima=quantidade_minima,
                pedido=0
            )
            db.session.add(novo_estoque)
            itens_adicionados.append(item.nome)

    db.session.commit()

    return {
        "message": f"{len(itens_adicionados)} itens adicionados à lista.",
        "itens_adicionados": itens_adicionados
    }, 200

def obter_itens_da_lista(lista_id):
    """Retorna todos os itens (estoques) vinculados a uma lista"""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    estoques = Estoque.query.filter_by(lista_id=lista_id).all()

    itens = []
    for estoque in estoques:
        itens.append({
            "estoque_id": estoque.id,
            "item_id": estoque.item_id,
            "item_nome": estoque.item.nome,
            "quantidade_minima": float(estoque.quantidade_minima),
            "quantidade_atual": float(estoque.quantidade_atual),
            "unidade_medida": estoque.item.unidade_medida,
            "fornecedor_id": estoque.item.fornecedor_id
        })

    return itens, 200

def remover_item_da_lista(lista_id, item_id):
    """Remove um item (estoque) de uma lista"""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    estoque = Estoque.query.filter_by(
        lista_id=lista_id,
        item_id=item_id
    ).first()

    if not estoque:
        return {"error": "Item não encontrado nesta lista."}, 404

    db.session.delete(estoque)
    db.session.commit()

    return {"message": f"Item removido da lista."}, 200


# ===== LISTA MAE ITENS (Nova Funcionalidade) =====

def normalize_item_nome(value):
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = re.sub(r"\s+", " ", normalized).strip().lower()
    return normalized

def sync_lista_mae_itens_para_estoque(lista_id):
    """
    FUNÇÃO LEGADA - DEPRECADA
    
    Esta função foi substituída pela arquitetura ListaItemRef.
    Mantida apenas para compatibilidade temporária.
    
    TODO: Remover esta função após garantir que nenhum código a chama.
    
    Sincroniza itens da lista (via ListaItemRef) com o estoque.
    Apenas cria estoque para itens com quantidade_minima > 0.
    """
    # FUNÇÃO DESABILITADA - Retorna imediatamente
    current_app.logger.warning(
        f"[DEPRECADO] sync_lista_mae_itens_para_estoque() foi chamada para lista {lista_id}. "
        "Esta função não é mais necessária com a arquitetura ListaItemRef."
    )
    return {"criados": 0, "atualizados": 0, "ignorados": 0, "warning": "Função deprecada"}
    
    # Código original comentado abaixo (para referência)
    """
    # Buscar referências de itens para esta lista
    refs = ListaItemRef.query.filter_by(lista_id=lista_id).all()
    if not refs:
        return {"criados": 0, "atualizados": 0, "ignorados": 0}

    # Carregar itens cadastrados para matching por nome
    itens_cadastrados = Item.query.all()
    itens_por_nome = {}
    for item in itens_cadastrados:
        chave = normalize_item_nome(item.nome)
        if not chave or chave in itens_por_nome:
            continue
        itens_por_nome[chave] = item

    criados = 0
    atualizados = 0
    ignorados = 0

    for ref in refs:
        nome_normalizado = normalize_item_nome(ref.item.nome)
        if not nome_normalizado:
            ignorados += 1
            continue

        item = itens_por_nome.get(nome_normalizado)
        if not item:
            ignorados += 1
            continue

        estoque = Estoque.query.filter_by(lista_id=lista_id, item_id=item.id).first()
        quantidade_minima = float(ref.quantidade_minima or 0)
        quantidade_atual = float(ref.quantidade_atual or 0)

        if not estoque:
            if quantidade_minima <= 0:
                ignorados += 1
                continue

            novo_estoque = Estoque(
                lista_id=lista_id,
                item_id=item.id,
                area_id=1,
                quantidade_atual=quantidade_atual,
                quantidade_minima=quantidade_minima,
                pedido=0
            )
            db.session.add(novo_estoque)
            criados += 1
            continue

        estoque.quantidade_minima = quantidade_minima
        if estoque.data_ultima_submissao is None:
            estoque.quantidade_atual = quantidade_atual
        estoque.pedido = estoque.calcular_pedido()
        atualizados += 1

    db.session.commit()

    return {"criados": criados, "atualizados": atualizados, "ignorados": ignorados}
    """

def adicionar_item_lista_mae(lista_id, data):
    """
    Adiciona um item ao catálogo global e vincula à lista.
    Se o item já existe no catálogo, apenas cria/atualiza a referência.
    """
    try:
        lista = db.session.get(Lista, lista_id)
        if not lista:
            return {"error": "Lista não encontrada"}, 404

        nome = data.get('nome', '').strip()
        if not nome:
            return {"error": "Nome do item é obrigatório"}, 400

        # Buscar ou criar item no catálogo global (por nome, case-insensitive)
        item = ListaMaeItem.query.filter(
            func.lower(ListaMaeItem.nome) == func.lower(nome)
        ).first()

        if not item:
            # Criar novo item no catálogo global
            item = ListaMaeItem(
                nome=nome,
                unidade=data.get('unidade', 'un')
            )
            db.session.add(item)
            db.session.flush()  # Para obter o ID

        # Verificar se já existe referência para esta lista
        ref = ListaItemRef.query.filter_by(lista_id=lista_id, item_id=item.id).first()

        if ref:
            # Atualizar quantidades existentes
            ref.quantidade_atual = data.get('quantidade_atual', ref.quantidade_atual)
            ref.quantidade_minima = data.get('quantidade_minima', ref.quantidade_minima)
            ref.atualizado_em = datetime.now(timezone.utc)
        else:
            # Criar nova referência
            ref = ListaItemRef(
                lista_id=lista_id,
                item_id=item.id,
                quantidade_atual=data.get('quantidade_atual', 0),
                quantidade_minima=data.get('quantidade_minima', 1.0)
            )
            db.session.add(ref)

        db.session.commit()
        # sync_lista_mae_itens_para_estoque(lista_id)  # REMOVIDO - Não mais necessário

        # Retornar dados combinados (item + referência)
        return ref.to_dict(), 201
    except Exception as e:
        import traceback
        from flask import current_app

        current_app.logger.error(f"[adicionar_item_lista_mae] Erro ao criar item:")
        current_app.logger.error(f"  Tipo: {type(e).__name__}")
        current_app.logger.error(f"  Mensagem: {str(e)}")
        current_app.logger.error(f"  Traceback: {traceback.format_exc()}")

        db.session.rollback()
        return {"error": f"{type(e).__name__}: {str(e)}"}, 500


def editar_item_lista_mae(lista_id, item_id, data):
    """
    Edita a referência de um item em uma lista específica.
    Atualiza quantidades na referência e opcionalmente unidade no item global.
    """
    try:
        # Buscar a referência (item_id é o ID do item global)
        ref = ListaItemRef.query.filter_by(
            lista_id=lista_id,
            item_id=item_id
        ).first()

        if not ref:
            return {"error": "Item não encontrado nesta lista"}, 404

        # Atualizar quantidades na referência
        if 'quantidade_atual' in data:
            ref.quantidade_atual = data['quantidade_atual']
        if 'quantidade_minima' in data:
            ref.quantidade_minima = data['quantidade_minima']
        ref.atualizado_em = datetime.now(timezone.utc)

        # Se unidade foi fornecida, atualizar no item global
        if data.get('unidade'):
            ref.item.unidade = data['unidade']
            ref.item.atualizado_em = datetime.now(timezone.utc)

        db.session.commit()
        # sync_lista_mae_itens_para_estoque(lista_id)  # REMOVIDO - Não mais necessário
        return ref.to_dict(), 200
    except Exception as e:
        import traceback
        from flask import current_app

        current_app.logger.error(f"[editar_item_lista_mae] Erro ao editar item {item_id}:")
        current_app.logger.error(f"  Tipo: {type(e).__name__}")
        current_app.logger.error(f"  Mensagem: {str(e)}")
        current_app.logger.error(f"  Traceback: {traceback.format_exc()}")

        db.session.rollback()
        return {"error": f"{type(e).__name__}: {str(e)}"}, 500


def deletar_item_lista_mae(lista_id, item_id):
    """
    Remove a referência de um item de uma lista específica.
    O item permanece no catálogo global para uso em outras listas.
    """
    try:
        ref = ListaItemRef.query.filter_by(
            lista_id=lista_id,
            item_id=item_id
        ).first()

        if not ref:
            return {"error": "Item não encontrado nesta lista"}, 404

        db.session.delete(ref)
        db.session.commit()
        return {"message": "Item removido da lista com sucesso"}, 200
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500


def obter_lista_mae(lista_id):
    """
    Retorna a lista com todos os seus itens via tabela de referência.
    Os itens vêm do catálogo global com quantidades específicas desta lista.
    """
    from flask import current_app

    try:
        lista = Lista.query.filter(Lista.id == lista_id).first()
        if not lista:
            return {"error": "Lista não encontrada"}, 404

        # Buscar referências de itens para esta lista
        refs = ListaItemRef.query.filter_by(lista_id=lista_id).all()

        # Montar dados dos itens com quantidades
        itens_data = []
        for ref in refs:
            item_dict = {
                "id": ref.item.id,
                "nome": ref.item.nome,
                "unidade": ref.item.unidade,
                "quantidade_atual": ref.quantidade_atual,
                "quantidade_minima": ref.quantidade_minima,
                "pedido": ref.get_pedido(),
                "criado_em": ref.criado_em.isoformat() if ref.criado_em else None,
                "atualizado_em": ref.atualizado_em.isoformat() if ref.atualizado_em else None
            }
            itens_data.append(item_dict)

        # Buscar fornecedores atribuídos à lista
        fornecedores_data = []
        for fornecedor in lista.fornecedores:
            fornecedores_data.append({
                "id": fornecedor.id,
                "nome": fornecedor.nome,
                "contato": fornecedor.contato,
                "meio_envio": fornecedor.meio_envio,
                "responsavel": fornecedor.responsavel,
                "observacao": fornecedor.observacao
            })

        result = {
            "lista_id": lista.id,
            "lista_nome": lista.nome,
            "lista_descricao": lista.descricao,
            "data_criacao": lista.data_criacao.isoformat(),
            "fornecedores": fornecedores_data,
            "itens": itens_data,
            "total_itens": len(itens_data)
        }

        return result, 200
    except Exception as e:
        current_app.logger.error(f"[obter_lista_mae] ERRO: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


def atribuir_fornecedor_lista_mae(lista_id, data):
    """
    Atribui um fornecedor a múltiplos itens de uma lista e gera Pedidos.

    Recebe:
        lista_id: ID da Lista
        data: {
            "item_ids": [1, 2, 3],  # IDs dos itens globais
            "fornecedor_id": 5      # ID do fornecedor
        }

    Retorna:
        Lista de pedidos criados
    """
    try:
        item_ids = data.get('item_ids', [])
        fornecedor_id = data.get('fornecedor_id')

        if not item_ids or not fornecedor_id:
            return {"error": "item_ids e fornecedor_id são obrigatórios"}, 400

        lista = db.session.get(Lista, lista_id)
        if not lista:
            return {"error": "Lista não encontrada"}, 404

        fornecedor = db.session.get(Fornecedor, fornecedor_id)
        if not fornecedor:
            return {"error": "Fornecedor não encontrado"}, 404

        # Buscar referências de itens vinculados a esta lista
        refs = ListaItemRef.query.filter(
            ListaItemRef.lista_id == lista_id,
            ListaItemRef.item_id.in_(item_ids)
        ).all()

        if len(refs) != len(item_ids):
            return {"error": "Um ou mais itens não encontrados na lista"}, 404

        pedidos_criados = []
        usuario_id = get_current_user_id()

        for ref in refs:
            # Calcular quantidade do pedido a partir da referência
            quantidade_pedido = ref.get_pedido()

            if quantidade_pedido > 0:
                pedido_existe = Pedido.query.filter_by(
                    item_id=ref.item_id,
                    fornecedor_id=fornecedor_id,
                    status=PedidoStatus.PENDENTE
                ).first()

                if not pedido_existe:
                    novo_pedido = Pedido(
                        item_id=ref.item_id,
                        fornecedor_id=fornecedor_id,
                        quantidade_solicitada=quantidade_pedido,
                        usuario_id=usuario_id,
                        status=PedidoStatus.PENDENTE,
                        data_pedido=datetime.now(timezone.utc)
                    )
                    db.session.add(novo_pedido)
                    pedidos_criados.append(novo_pedido)

        db.session.commit()

        return {
            "message": f"{len(pedidos_criados)} pedido(s) criado(s)",
            "pedidos": [p.to_dict() for p in pedidos_criados],
            "total_pedidos": len(pedidos_criados)
        }, 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[ATRIBUIR FORNECEDOR] ERRO: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

def importar_items_em_lote(lista_id, data):
    """
    Importa múltiplos itens em lote para uma lista.
    Itens são adicionados ao catálogo global e vinculados à lista.

    Recebe:
        lista_id: ID da Lista
        data: {
            "nomes": ["Alga Nori", "Arroz Grao Curto", "BAO com vegetais", ...]
        }

    Retorna:
        Quantidade de itens importados
    """
    try:
        nomes = data.get('nomes', [])

        if not nomes or not isinstance(nomes, list):
            return {"error": "nomes deve ser um array de strings"}, 400

        lista = db.session.get(Lista, lista_id)
        if not lista:
            return {"error": "Lista não encontrada"}, 404

        items_criados = 0
        items_vinculados = 0
        items_duplicados = 0

        for nome in nomes:
            nome_limpo = nome.strip()

            if len(nome_limpo) < 2:
                continue

            # Buscar item no catálogo global (case-insensitive)
            item = ListaMaeItem.query.filter(
                func.lower(ListaMaeItem.nome) == func.lower(nome_limpo)
            ).first()

            if not item:
                # Criar novo item no catálogo global
                item = ListaMaeItem(
                    nome=nome_limpo,
                    unidade='un'
                )
                db.session.add(item)
                db.session.flush()
                items_criados += 1

            # Verificar se já está vinculado a esta lista
            ref_existe = ListaItemRef.query.filter_by(
                lista_id=lista_id,
                item_id=item.id
            ).first()

            if ref_existe:
                items_duplicados += 1
                continue

            # Criar referência
            ref = ListaItemRef(
                lista_id=lista_id,
                item_id=item.id,
                quantidade_atual=0,
                quantidade_minima=1.0
            )
            db.session.add(ref)
            items_vinculados += 1

        db.session.commit()

        return {
            "message": f"{items_vinculados} item(ns) vinculado(s) à lista, {items_criados} novo(s) no catálogo",
            "items_vinculados": items_vinculados,
            "items_criados": items_criados,
            "items_duplicados": items_duplicados
        }, 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[IMPORTAR ITEMS] ERRO: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


def get_lista_colaborador(user_id, lista_id):
    """Retorna dados da lista para um colaborador."""
    # Verificar se o usuário tem acesso a esta lista
    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        return {"error": "Usuário não encontrado."}, 404

    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    # Verificar se o colaborador está atribuído a esta lista
    if lista not in usuario.listas_atribuidas:
        return {"error": "Acesso negado. Esta lista não foi atribuída a você."}, 403

    return lista.to_dict(), 200


def get_estoque_lista_colaborador(user_id, lista_id):
    """Retorna itens da lista via ListaItemRef (sem usar tabela Estoque)."""
    # Verificar se o usuário tem acesso a esta lista
    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        return {"error": "Usuário não encontrado."}, 404

    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    # Verificar se o colaborador está atribuído a esta lista
    if lista not in usuario.listas_atribuidas:
        return {"error": "Acesso negado. Esta lista não foi atribuída a você."}, 403

    # Buscar itens da lista via ListaItemRef com EAGER LOADING (otimização)
    refs = ListaItemRef.query.options(
        db.joinedload(ListaItemRef.item)  # Carrega item junto, evita N+1 queries
    ).filter_by(lista_id=lista_id).all()

    # Preparar resposta com dados do item
    itens_data = []
    for ref in refs:
        # Pular itens sem quantidade mínima definida
        if ref.quantidade_minima <= 0:
            continue
        
        item_dict = {
            "id": ref.item_id,  # Usar item_id como identificador (compatibilidade com frontend)
            "item_id": ref.item_id,
            "lista_id": ref.lista_id,
            "quantidade_atual": float(ref.quantidade_atual),
            "quantidade_minima": float(ref.quantidade_minima),
            "pedido": float(ref.get_pedido()),
            "item": {
                "id": ref.item.id,
                "nome": ref.item.nome,
                "unidade_medida": ref.item.unidade  # ListaMaeItem usa 'unidade', não 'unidade_medida'
            }
        }
        itens_data.append(item_dict)

    return itens_data, 200


def update_estoque_colaborador(user_id, estoque_id, data):
    """
    Atualiza quantidade_atual de um item via ListaItemRef.
    NOTA: estoque_id agora é interpretado como item_id (para compatibilidade).
    """
    # Verificar se o usuário existe
    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        return {"error": "Usuário não encontrado."}, 404

    # Validar que apenas quantidade_atual está sendo atualizado
    if "quantidade_atual" not in data:
        return {"error": "Dados inválidos. Forneça quantidade_atual."}, 400

    # Validar que o valor é um número válido
    try:
        quantidade_atual = float(data.get("quantidade_atual", 0))
        if quantidade_atual < 0:
            return {"error": "A quantidade não pode ser negativa."}, 400
    except (ValueError, TypeError):
        return {"error": "Quantidade deve ser um número válido."}, 400

    # Buscar ListaItemRef - precisa de lista_id também
    # Por ora, vamos buscar por item_id em todas as listas do colaborador
    item_id = estoque_id  # estoque_id é na verdade o item_id
    
    # Buscar qual lista contém este item e está atribuída ao colaborador
    ref = None
    for lista in usuario.listas_atribuidas:
        ref = ListaItemRef.query.filter_by(
            lista_id=lista.id,
            item_id=item_id
        ).first()
        if ref:
            break
    
    if not ref:
        return {"error": "Item não encontrado nas suas listas."}, 404

    try:
        # Atualizar apenas quantidade_atual
        ref.quantidade_atual = quantidade_atual
        ref.atualizado_em = datetime.now(timezone.utc)
        
        db.session.commit()

        return {
            "message": "Estoque atualizado com sucesso.",
            "estoque": {
                "id": ref.item_id,
                "quantidade_atual": float(ref.quantidade_atual),
                "quantidade_minima": float(ref.quantidade_minima),
                "pedido": float(ref.get_pedido())
            }
        }, 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[UPDATE ESTOQUE COLABORADOR] ERRO: {type(e).__name__}: {str(e)}")
        return {"error": str(e)}, 500


# --- CSV Export/Import para Fornecedores ---

def exportar_fornecedores_csv():
    """Exporta todos os fornecedores em formato CSV."""
    try:
        fornecedores = Fornecedor.query.all()

        # Construir CSV
        csv_lines = ["Nome,Contato,Meio de Envio,Responsável,Observação"]

        for fornecedor in fornecedores:
            contato = (fornecedor.contato or "").replace(",", ";").replace("\n", " ")
            meio_envio = (fornecedor.meio_envio or "").replace(",", ";").replace("\n", " ")
            responsavel = (fornecedor.responsavel or "").replace(",", ";").replace("\n", " ")
            observacao = (fornecedor.observacao or "").replace(",", ";").replace("\n", " ")

            csv_lines.append(f'"{fornecedor.nome}","{contato}","{meio_envio}","{responsavel}","{observacao}"')

        csv_content = "\n".join(csv_lines)
        return {"csv": csv_content, "filename": "fornecedores.csv"}, 200
    except Exception as e:
        return {"error": str(e)}, 500


def importar_fornecedores_csv(csv_content):
    """Importa fornecedores a partir de conteúdo CSV."""
    try:
        import csv
        import io

        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_content))

        fornecedores_criados = 0
        fornecedores_duplicados = 0
        erros = []

        for row in csv_reader:
            nome = row.get('Nome', '').strip()
            if not nome:
                continue

            # Verificar se já existe
            fornecedor_existe = Fornecedor.query.filter_by(nome=nome).first()
            if fornecedor_existe:
                fornecedores_duplicados += 1
                continue

            # Criar novo fornecedor
            novo_fornecedor = Fornecedor(
                nome=nome,
                contato=row.get('Contato', '').strip(),
                meio_envio=row.get('Meio de Envio', '').strip(),
                responsavel=row.get('Responsável', '').strip(),
                observacao=row.get('Observação', '').strip()
            )
            db.session.add(novo_fornecedor)
            fornecedores_criados += 1

        db.session.commit()

        return {
            "message": f"{fornecedores_criados} fornecedor(es) criado(s)",
            "fornecedores_criados": fornecedores_criados,
            "fornecedores_duplicados": fornecedores_duplicados
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

def clear_database_except_users(user_id, data):
    """
    Limpa todas as tabelas do banco de dados exceto a tabela de usuários.
    Requer que o usuário forneça sua senha para confirmação.
    """
    try:
        # Validação de entrada
        senha = data.get('senha')
        if not senha:
            return {"error": "Senha é obrigatória para confirmar a operação"}, 400

        # Busca o usuário e verifica a senha
        usuario = db.session.get(Usuario, user_id)
        if not usuario:
            return {"error": "Usuário não encontrado"}, 404

        if not check_password_hash(usuario.senha_hash, senha):
            return {"error": "Senha incorreta"}, 401

        # Verifica se é admin
        if usuario.role != UserRoles.ADMIN:
            return {"error": "Apenas administradores podem limpar o banco de dados"}, 403

        # Começa a limpeza das tabelas na ordem correta (respeitando foreign keys)
        print("🗑️ Iniciando limpeza do banco de dados...")

        # 1. Limpar tabelas de associação (many-to-many)
        db.session.execute(db.text('DELETE FROM fornecedor_lista'))
        db.session.execute(db.text('DELETE FROM lista_colaborador'))
        print("✅ Tabelas de associação limpas")

        # 2. Limpar tabelas dependentes
        CotacaoItem.query.delete()
        print("✅ Itens de cotação removidos")

        Cotacao.query.delete()
        print("✅ Cotações removidas")

        Pedido.query.delete()
        print("✅ Pedidos removidos")

        Estoque.query.delete()
        print("✅ Estoques removidos")

        ListaMaeItem.query.delete()
        print("✅ Itens da lista mãe removidos")

        # 3. Limpar listas
        Lista.query.delete()
        print("✅ Listas removidas")

        # 4. Limpar itens
        Item.query.delete()
        print("✅ Itens removidos")

        # 5. Limpar fornecedores
        Fornecedor.query.delete()
        print("✅ Fornecedores removidos")

        # 6. Limpar áreas
        Area.query.delete()
        print("✅ Áreas removidas")

        # Commit das alterações
        db.session.commit()
        print("✨ Banco de dados limpo com sucesso!")

        return {
            "message": "Banco de dados limpo com sucesso! Apenas usuários foram mantidos.",
            "cleared_tables": [
                "fornecedor_lista",
                "lista_colaborador",
                "cotacao_itens",
                "cotacoes",
                "pedidos",
                "estoques",
                "lista_mae_itens",
                "listas",
                "itens",
                "fornecedores",
                "areas"
            ]
        }, 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro ao limpar banco de dados: {str(e)}")
        return {"error": f"Erro ao limpar banco de dados: {str(e)}"}, 500

def populate_database_with_mock_data():
    """
    Popula o banco de dados com dados fictícios para teste.
    NÃO vincula colaboradores às listas - admin faz isso manualmente.
    """
    try:
        import random
        from datetime import timedelta

        print("🌱 Iniciando população do banco de dados...")

        # 1. Criar Áreas
        print("📍 Criando áreas...")
        areas_nomes = ["Cozinha", "Almoxarifado", "Limpeza", "Manutenção", "Escritório"]
        areas = []
        for nome in areas_nomes:
            if not Area.query.filter_by(nome=nome).first():
                area = Area(nome=nome)
                db.session.add(area)
                areas.append(area)
        db.session.commit()
        areas = Area.query.all()
        print(f"✅ {len(areas)} áreas no banco")

        # 2. Criar Fornecedores
        print("🏪 Criando fornecedores...")
        fornecedores_data = [
            {
                "nome": "Distribuidora ABC",
                "contato": "(11) 1234-5678",
                "meio_envio": "WhatsApp",
                "responsavel": "João Silva",
                "observacao": "Fornecedor principal de alimentos"
            },
            {
                "nome": "Produtos Limpeza XYZ",
                "contato": "(11) 8765-4321",
                "meio_envio": "Email",
                "responsavel": "Maria Santos",
                "observacao": "Produtos de limpeza e higiene"
            },
            {
                "nome": "Papelaria Moderna",
                "contato": "(11) 5555-9999",
                "meio_envio": "WhatsApp",
                "responsavel": "Pedro Costa",
                "observacao": "Material de escritório"
            },
            {
                "nome": "Ferramentas e Cia",
                "contato": "(11) 3333-7777",
                "meio_envio": "Telefone",
                "responsavel": "Carlos Oliveira",
                "observacao": "Ferramentas e material de manutenção"
            }
        ]

        fornecedores = []
        for forn_data in fornecedores_data:
            if not Fornecedor.query.filter_by(nome=forn_data["nome"]).first():
                fornecedor = Fornecedor(**forn_data)
                db.session.add(fornecedor)
                fornecedores.append(fornecedor)
        db.session.commit()
        fornecedores = Fornecedor.query.all()
        print(f"✅ {len(fornecedores)} fornecedores no banco")

        # 3. Criar Itens
        print("📦 Criando itens...")
        itens_data = [
            # Itens da Distribuidora ABC
            {"nome": "Arroz", "unidade_medida": "Kg", "fornecedor_nome": "Distribuidora ABC"},
            {"nome": "Feijão", "unidade_medida": "Kg", "fornecedor_nome": "Distribuidora ABC"},
            {"nome": "Óleo", "unidade_medida": "Litro", "fornecedor_nome": "Distribuidora ABC"},
            {"nome": "Açúcar", "unidade_medida": "Kg", "fornecedor_nome": "Distribuidora ABC"},
            {"nome": "Sal", "unidade_medida": "Kg", "fornecedor_nome": "Distribuidora ABC"},
            # Itens da Produtos Limpeza XYZ
            {"nome": "Detergente", "unidade_medida": "Unidade", "fornecedor_nome": "Produtos Limpeza XYZ"},
            {"nome": "Sabão em Pó", "unidade_medida": "Kg", "fornecedor_nome": "Produtos Limpeza XYZ"},
            {"nome": "Desinfetante", "unidade_medida": "Litro", "fornecedor_nome": "Produtos Limpeza XYZ"},
            {"nome": "Álcool Gel", "unidade_medida": "Litro", "fornecedor_nome": "Produtos Limpeza XYZ"},
            # Itens da Papelaria Moderna
            {"nome": "Papel A4", "unidade_medida": "Resma", "fornecedor_nome": "Papelaria Moderna"},
            {"nome": "Caneta Azul", "unidade_medida": "Unidade", "fornecedor_nome": "Papelaria Moderna"},
            {"nome": "Grampeador", "unidade_medida": "Unidade", "fornecedor_nome": "Papelaria Moderna"},
            # Itens da Ferramentas e Cia
            {"nome": "Martelo", "unidade_medida": "Unidade", "fornecedor_nome": "Ferramentas e Cia"},
            {"nome": "Chave de Fenda", "unidade_medida": "Unidade", "fornecedor_nome": "Ferramentas e Cia"},
            {"nome": "Fita Isolante", "unidade_medida": "Rolo", "fornecedor_nome": "Ferramentas e Cia"},
        ]

        itens = []
        for item_data in itens_data:
            if not Item.query.filter_by(nome=item_data["nome"]).first():
                fornecedor = Fornecedor.query.filter_by(nome=item_data["fornecedor_nome"]).first()
                if fornecedor:
                    item = Item(
                        nome=item_data["nome"],
                        unidade_medida=item_data["unidade_medida"],
                        fornecedor_id=fornecedor.id
                    )
                    db.session.add(item)
                    itens.append(item)
        db.session.commit()
        itens = Item.query.all()
        print(f"✅ {len(itens)} itens no banco")

        # 4. Criar Listas de Compras (SEM vincular colaboradores)
        print("📋 Criando listas de compras...")
        listas_data = [
            {
                "nome": "Lista Mensal - Alimentos",
                "descricao": "Lista mensal de compras de alimentos"
            },
            {
                "nome": "Lista Semanal - Limpeza",
                "descricao": "Lista semanal de produtos de limpeza"
            },
            {
                "nome": "Lista Escritório",
                "descricao": "Material de escritório trimestral"
            }
        ]

        listas = []
        for lista_data in listas_data:
            if not Lista.query.filter_by(nome=lista_data["nome"]).first():
                lista = Lista(**lista_data)
                db.session.add(lista)
                listas.append(lista)
        db.session.commit()
        listas = Lista.query.all()

        # Associar fornecedores às listas
        lista_alimentos = Lista.query.filter_by(nome="Lista Mensal - Alimentos").first()
        lista_limpeza = Lista.query.filter_by(nome="Lista Semanal - Limpeza").first()
        lista_escritorio = Lista.query.filter_by(nome="Lista Escritório").first()

        forn_abc = Fornecedor.query.filter_by(nome="Distribuidora ABC").first()
        forn_limpeza = Fornecedor.query.filter_by(nome="Produtos Limpeza XYZ").first()
        forn_papelaria = Fornecedor.query.filter_by(nome="Papelaria Moderna").first()

        if lista_alimentos and forn_abc and forn_abc not in lista_alimentos.fornecedores:
            lista_alimentos.fornecedores.append(forn_abc)
        if lista_limpeza and forn_limpeza and forn_limpeza not in lista_limpeza.fornecedores:
            lista_limpeza.fornecedores.append(forn_limpeza)
        if lista_escritorio and forn_papelaria and forn_papelaria not in lista_escritorio.fornecedores:
            lista_escritorio.fornecedores.append(forn_papelaria)

        db.session.commit()
        print(f"✅ {len(listas)} listas no banco (colaboradores NÃO vinculados)")

        # 5. Criar itens da Lista Mãe
        print("📝 Criando itens no catálogo global e vinculando às listas...")
        lista_mae_itens_data = [
            # Lista Mensal - Alimentos
            {"lista_nome": "Lista Mensal - Alimentos", "nome": "Arroz Tipo 1", "unidade": "Kg", "qtd_atual": 50, "qtd_min": 100},
            {"lista_nome": "Lista Mensal - Alimentos", "nome": "Feijão Preto", "unidade": "Kg", "qtd_atual": 30, "qtd_min": 80},
            {"lista_nome": "Lista Mensal - Alimentos", "nome": "Óleo de Soja", "unidade": "Litro", "qtd_atual": 15, "qtd_min": 40},
            # Lista Semanal - Limpeza
            {"lista_nome": "Lista Semanal - Limpeza", "nome": "Detergente Neutro", "unidade": "Unidade", "qtd_atual": 5, "qtd_min": 20},
            {"lista_nome": "Lista Semanal - Limpeza", "nome": "Desinfetante Pinho", "unidade": "Litro", "qtd_atual": 8, "qtd_min": 15},
            # Lista Escritório
            {"lista_nome": "Lista Escritório", "nome": "Papel Sulfite A4", "unidade": "Resma", "qtd_atual": 10, "qtd_min": 30},
        ]

        itens_criados = 0
        refs_criadas = 0
        for item_data in lista_mae_itens_data:
            lista = Lista.query.filter_by(nome=item_data["lista_nome"]).first()
            if lista:
                # Buscar ou criar item no catálogo global
                item = ListaMaeItem.query.filter(
                    func.lower(ListaMaeItem.nome) == func.lower(item_data["nome"])
                ).first()

                if not item:
                    item = ListaMaeItem(
                        nome=item_data["nome"],
                        unidade=item_data["unidade"]
                    )
                    db.session.add(item)
                    db.session.flush()
                    itens_criados += 1

                # Verificar se referência já existe
                ref_existe = ListaItemRef.query.filter_by(
                    lista_id=lista.id,
                    item_id=item.id
                ).first()

                if not ref_existe:
                    ref = ListaItemRef(
                        lista_id=lista.id,
                        item_id=item.id,
                        quantidade_atual=item_data["qtd_atual"],
                        quantidade_minima=item_data["qtd_min"]
                    )
                    db.session.add(ref)
                    refs_criadas += 1

        db.session.commit()
        total_lista_mae = ListaMaeItem.query.count()
        total_refs = ListaItemRef.query.count()
        print(f"✅ {total_lista_mae} itens no catálogo global, {total_refs} vínculos com listas")

        # 6. Criar Estoques
        print("📊 Criando registros de estoque...")
        estoque_count = 0
        for area in areas[:3]:  # Primeiras 3 áreas
            for item in itens[:10]:  # Primeiros 10 itens
                # Verifica se já existe
                existe = Estoque.query.filter_by(item_id=item.id, area_id=area.id).first()
                if not existe:
                    qtd_atual = random.uniform(5, 50)
                    qtd_minima = random.uniform(20, 100)
                    estoque = Estoque(
                        item_id=item.id,
                        area_id=area.id,
                        quantidade_atual=qtd_atual,
                        quantidade_minima=qtd_minima,
                        pedido=max(qtd_minima - qtd_atual, 0)
                    )
                    db.session.add(estoque)
                    estoque_count += 1

        db.session.commit()
        total_estoques = Estoque.query.count()
        print(f"✅ {total_estoques} registros de estoque no banco")

        # 7. Criar Pedidos
        print("🛒 Criando pedidos...")
        admin = Usuario.query.filter_by(role=UserRoles.ADMIN).first()
        pedido_count = 0

        if admin and len(itens) > 0:
            for i in range(10):
                item = random.choice(itens)
                # Verifica se item tem fornecedor
                if item.fornecedor_id:
                    pedido = Pedido(
                        item_id=item.id,
                        fornecedor_id=item.fornecedor_id,
                        quantidade_solicitada=random.uniform(10, 100),
                        data_pedido=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)),
                        usuario_id=admin.id,
                        status=random.choice([PedidoStatus.PENDENTE, PedidoStatus.APROVADO, PedidoStatus.REJEITADO])
                    )
                    db.session.add(pedido)
                    pedido_count += 1

            db.session.commit()

        total_pedidos = Pedido.query.count()
        print(f"✅ {total_pedidos} pedidos no banco")

        # 8. Criar Cotações
        print("💰 Criando cotações...")
        cotacao_count = 0
        for fornecedor in fornecedores[:2]:
            cotacao = Cotacao(
                fornecedor_id=fornecedor.id,
                data_cotacao=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15)),
                status=random.choice([CotacaoStatus.PENDENTE, CotacaoStatus.CONCLUIDA])
            )
            db.session.add(cotacao)
            db.session.commit()

            # Adicionar itens à cotação
            itens_fornecedor = Item.query.filter_by(fornecedor_id=fornecedor.id).all()
            for item in itens_fornecedor[:3]:
                cotacao_item = CotacaoItem(
                    cotacao_id=cotacao.id,
                    item_id=item.id,
                    quantidade=random.uniform(10, 50),
                    preco_unitario=random.uniform(5, 100)
                )
                db.session.add(cotacao_item)
            cotacao_count += 1

        db.session.commit()
        total_cotacoes = Cotacao.query.count()
        print(f"✅ {total_cotacoes} cotações no banco")

        print("\n✨ Banco de dados populado com sucesso!")

        return {
            "message": "Banco de dados populado com dados fictícios com sucesso!",
            "data": {
                "areas": len(areas),
                "fornecedores": len(fornecedores),
                "itens": len(itens),
                "listas": len(listas),
                "itens_lista_mae": total_lista_mae,
                "estoques": total_estoques,
                "pedidos": total_pedidos,
                "cotacoes": total_cotacoes,
                "nota": "Colaboradores NÃO foram vinculados às listas - faça isso manualmente"
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro ao popular banco de dados: {str(e)}")
        return {"error": f"Erro ao popular banco de dados: {str(e)}"}, 500


def export_lista_to_csv(lista_id):
    """
    Exporta os itens da lista para formato CSV.
    Usa a tabela de referência ListaItemRef para obter quantidades.
    """
    try:
        lista = db.session.get(Lista, lista_id)
        if not lista:
            return {"error": "Lista não encontrada."}, 404

        # Buscar referências de itens para esta lista
        refs = ListaItemRef.query.filter_by(lista_id=lista_id).all()

        if not refs:
            return {"error": "Lista não possui itens para exportar."}, 400

        # Gerar nome do arquivo com nome da lista e data
        from datetime import datetime
        data_atual = datetime.now().strftime("%Y-%m-%d")
        nome_limpo = "".join(c for c in lista.nome if c.isalnum() or c in (' ', '-', '_')).strip()
        nome_limpo = nome_limpo.replace(' ', '_')
        filename = f"{nome_limpo}_{data_atual}.csv"

        # Gerar conteúdo CSV
        import csv
        from io import StringIO

        output = StringIO()
        writer = csv.writer(output)

        # Cabeçalho
        writer.writerow(['nome', 'unidade', 'quantidade_atual', 'quantidade_minima'])

        # Dados (item global + quantidades da referência)
        for ref in refs:
            writer.writerow([
                ref.item.nome,
                ref.item.unidade,
                float(ref.quantidade_atual) if ref.quantidade_atual else 0,
                float(ref.quantidade_minima) if ref.quantidade_minima else 0
            ])

        csv_content = output.getvalue()
        output.close()

        return {
            "csv_content": csv_content,
            "filename": filename
        }, 200

    except Exception as e:
        print(f"❌ Erro ao exportar lista para CSV: {str(e)}")
        return {"error": f"Erro ao exportar lista: {str(e)}"}, 500


def import_lista_from_csv(lista_id, csv_file):
    """
    Importa itens para uma lista a partir de um arquivo CSV.
    Itens são adicionados ao catálogo global e vinculados à lista.
    Substitui os vínculos existentes pelos do CSV.
    """
    try:
        lista = db.session.get(Lista, lista_id)
        if not lista:
            return {"error": "Lista não encontrada."}, 404

        import csv
        from io import StringIO

        if hasattr(csv_file, 'read'):
            content = csv_file.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')
        else:
            content = csv_file

        csv_reader = csv.DictReader(StringIO(content))

        required_headers = {'nome', 'unidade', 'quantidade_atual', 'quantidade_minima'}
        headers = set(csv_reader.fieldnames or [])

        if not required_headers.issubset(headers):
            return {
                "error": f"CSV deve conter os cabeçalhos: {', '.join(required_headers)}"
            }, 400

        # Remover vínculos existentes da lista (não os itens globais)
        ListaItemRef.query.filter_by(lista_id=lista_id).delete()

        itens_importados = 0
        itens_criados = 0

        for row in csv_reader:
            try:
                nome = row['nome'].strip()
                if not nome:
                    continue

                # Buscar ou criar item no catálogo global
                item = ListaMaeItem.query.filter(
                    func.lower(ListaMaeItem.nome) == func.lower(nome)
                ).first()

                if not item:
                    item = ListaMaeItem(
                        nome=nome,
                        unidade=row['unidade'].strip() if row['unidade'] else 'un'
                    )
                    db.session.add(item)
                    db.session.flush()
                    itens_criados += 1

                # Criar referência
                ref = ListaItemRef(
                    lista_id=lista_id,
                    item_id=item.id,
                    quantidade_atual=float(row['quantidade_atual']) if row['quantidade_atual'] else 0,
                    quantidade_minima=float(row['quantidade_minima']) if row['quantidade_minima'] else 1.0
                )
                db.session.add(ref)
                itens_importados += 1

            except (ValueError, KeyError) as e:
                db.session.rollback()
                return {
                    "error": f"Erro ao processar linha do CSV: {str(e)}"
                }, 400

        db.session.commit()

        return {
            "message": f"Lista importada com sucesso! {itens_importados} itens vinculados, {itens_criados} novos no catálogo.",
            "itens_importados": itens_importados,
            "itens_criados": itens_criados
        }, 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro ao importar lista de CSV: {str(e)}")
        return {"error": f"Erro ao importar lista: {str(e)}"}, 500


def create_lista_from_csv(nome, descricao, csv_file):
    """
    Cria uma nova lista e importa itens a partir de um arquivo CSV.
    Itens são adicionados ao catálogo global e vinculados à nova lista.
    """
    try:
        if not nome or not nome.strip():
            return {"error": "Nome da lista é obrigatório."}, 400

        nome_limpo = nome.strip()
        lista_existente = Lista.query.filter(func.lower(Lista.nome) == func.lower(nome_limpo)).first()
        if lista_existente:
            return {"error": f"Já existe uma lista com o nome '{nome_limpo}'."}, 409

        nova_lista = Lista(
            nome=nome_limpo,
            descricao=descricao.strip() if descricao else None
        )
        db.session.add(nova_lista)
        db.session.flush()

        import csv
        from io import StringIO

        if hasattr(csv_file, 'read'):
            content = csv_file.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')
        else:
            content = csv_file

        lines = content.strip().split('\n')

        is_csv_format = False
        if lines and ',' in lines[0]:
            first_line_lower = lines[0].lower().strip()
            if 'nome' in first_line_lower.split(','):
                is_csv_format = True

        itens_vinculados = 0
        itens_criados = 0

        def find_or_create_item_and_ref(nome_item, unidade='un', quantidade_atual=0, quantidade_minima=1.0):
            """Helper para buscar/criar item global e criar referência"""
            nonlocal itens_criados, itens_vinculados

            # Buscar item no catálogo global
            item = ListaMaeItem.query.filter(
                func.lower(ListaMaeItem.nome) == func.lower(nome_item)
            ).first()

            if not item:
                item = ListaMaeItem(nome=nome_item, unidade=unidade)
                db.session.add(item)
                db.session.flush()
                itens_criados += 1

            # Criar referência
            ref = ListaItemRef(
                lista_id=nova_lista.id,
                item_id=item.id,
                quantidade_atual=quantidade_atual,
                quantidade_minima=quantidade_minima
            )
            db.session.add(ref)
            itens_vinculados += 1

        if is_csv_format:
            csv_reader = csv.DictReader(StringIO(content))

            required_headers = {'nome'}
            headers = set(csv_reader.fieldnames or [])

            if not required_headers.issubset(headers):
                db.session.rollback()
                return {
                    "error": "CSV deve conter no mínimo a coluna 'nome'. Opcionais: unidade, quantidade_atual, quantidade_minima"
                }, 400

            for row in csv_reader:
                try:
                    nome_item = row.get('nome', '').strip()
                    if not nome_item:
                        continue

                    unidade = row.get('unidade', 'un').strip() if row.get('unidade') else 'un'
                    quantidade_atual = 0
                    quantidade_minima = 1.0

                    if row.get('quantidade_atual'):
                        try:
                            quantidade_atual = float(row['quantidade_atual'])
                        except ValueError:
                            pass

                    if row.get('quantidade_minima'):
                        try:
                            valor = float(row['quantidade_minima'])
                            if valor > 0:
                                quantidade_minima = valor
                        except ValueError:
                            pass

                    find_or_create_item_and_ref(nome_item, unidade, quantidade_atual, quantidade_minima)

                except Exception as e:
                    db.session.rollback()
                    return {"error": f"Erro ao processar linha do CSV: {str(e)}"}, 400
        else:
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                try:
                    find_or_create_item_and_ref(line, 'un', 0, 1.0)
                except Exception as e:
                    db.session.rollback()
                    return {"error": f"Erro ao processar linha: {str(e)}"}, 400

        db.session.commit()

        return {
            "message": f"Lista '{nome}' criada com sucesso! {itens_vinculados} itens vinculados, {itens_criados} novos no catálogo.",
            "lista_id": nova_lista.id,
            "itens_vinculados": itens_vinculados,
            "itens_criados": itens_criados
        }, 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro ao criar lista de CSV: {str(e)}")
        return {"error": f"Erro ao criar lista: {str(e)}"}, 500


def export_data_bulk(tipos_dados):
    """
    Exporta múltiplos tipos de dados em um arquivo ZIP contendo CSVs.

    Args:
        tipos_dados: Lista de strings indicando quais dados exportar
                    ['usuarios', 'listas', 'itens', 'fornecedores', 'areas', 'pedidos', 'cotacoes', 'estoque']

    Returns:
        BytesIO contendo o arquivo ZIP, ou erro
    """
    import io
    import zipfile
    import csv

    try:
        # Criar arquivo ZIP em memória
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:

            # Exportar Usuários
            if 'usuarios' in tipos_dados:
                usuarios = Usuario.query.all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Nome', 'Email', 'Username', 'Role', 'Aprovado', 'Ativo', 'Data Criação'])

                for user in usuarios:
                    csv_writer.writerow([
                        user.id,
                        user.nome,
                        user.email,
                        user.username or '',
                        user.role.value,
                        'Sim' if user.aprovado else 'Não',
                        'Sim' if user.ativo else 'Não',
                        user.data_criacao.strftime('%Y-%m-%d %H:%M:%S') if user.data_criacao else ''
                    ])

                zip_file.writestr('usuarios.csv', csv_buffer.getvalue())

            # Exportar Listas
            if 'listas' in tipos_dados:
                listas = Lista.query.filter_by(deletado=False).all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Nome', 'Descrição', 'Data Criação', 'Colaboradores'])

                for lista in listas:
                    colaboradores_nomes = ', '.join([c.nome for c in lista.colaboradores])
                    csv_writer.writerow([
                        lista.id,
                        lista.nome,
                        lista.descricao or '',
                        lista.data_criacao.strftime('%Y-%m-%d %H:%M:%S'),
                        colaboradores_nomes
                    ])

                zip_file.writestr('listas.csv', csv_buffer.getvalue())

            # Exportar Itens
            if 'itens' in tipos_dados:
                itens = Item.query.all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Nome', 'Unidade Medida', 'Fornecedor', 'Data Criação'])

                for item in itens:
                    csv_writer.writerow([
                        item.id,
                        item.nome,
                        item.unidade_medida,
                        item.fornecedor.nome if item.fornecedor else '',
                        item.data_criacao.strftime('%Y-%m-%d %H:%M:%S') if item.data_criacao else ''
                    ])

                zip_file.writestr('itens.csv', csv_buffer.getvalue())

            # Exportar Fornecedores
            if 'fornecedores' in tipos_dados:
                fornecedores = Fornecedor.query.all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Nome', 'Contato', 'Telefone', 'Email', 'Responsável', 'Observação'])

                for fornecedor in fornecedores:
                    csv_writer.writerow([
                        fornecedor.id,
                        fornecedor.nome,
                        fornecedor.contato or '',
                        fornecedor.telefone or '',
                        fornecedor.email or '',
                        fornecedor.responsavel or '',
                        fornecedor.observacao or ''
                    ])

                zip_file.writestr('fornecedores.csv', csv_buffer.getvalue())

            # Exportar Áreas
            if 'areas' in tipos_dados:
                areas = Area.query.all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Nome', 'Descrição'])

                for area in areas:
                    csv_writer.writerow([
                        area.id,
                        area.nome,
                        area.descricao or ''
                    ])

                zip_file.writestr('areas.csv', csv_buffer.getvalue())

            # Exportar Pedidos
            if 'pedidos' in tipos_dados:
                pedidos = Pedido.query.all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Item', 'Fornecedor', 'Quantidade', 'Status', 'Usuário', 'Data Pedido'])

                for pedido in pedidos:
                    csv_writer.writerow([
                        pedido.id,
                        pedido.item.nome if pedido.item else '',
                        pedido.fornecedor.nome if pedido.fornecedor else '',
                        pedido.quantidade_solicitada,
                        pedido.status.value if pedido.status else '',
                        pedido.usuario.nome if pedido.usuario else '',
                        pedido.data_pedido.strftime('%Y-%m-%d %H:%M:%S') if pedido.data_pedido else ''
                    ])

                zip_file.writestr('pedidos.csv', csv_buffer.getvalue())

            # Exportar Cotações
            if 'cotacoes' in tipos_dados:
                cotacoes = Cotacao.query.all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Fornecedor', 'Status', 'Data Criação', 'Total Itens'])

                for cotacao in cotacoes:
                    csv_writer.writerow([
                        cotacao.id,
                        cotacao.fornecedor.nome if cotacao.fornecedor else '',
                        cotacao.status.value if cotacao.status else '',
                        cotacao.data_criacao.strftime('%Y-%m-%d %H:%M:%S') if cotacao.data_criacao else '',
                        len(cotacao.itens) if cotacao.itens else 0
                    ])

                zip_file.writestr('cotacoes.csv', csv_buffer.getvalue())

            # Exportar Estoque
            if 'estoque' in tipos_dados:
                estoques = Estoque.query.all()
                csv_buffer = io.StringIO()
                csv_writer = csv.writer(csv_buffer)
                csv_writer.writerow(['ID', 'Item', 'Área', 'Quantidade Atual', 'Quantidade Mínima'])

                for estoque in estoques:
                    csv_writer.writerow([
                        estoque.id,
                        estoque.item.nome if estoque.item else '',
                        estoque.area.nome if estoque.area else '',
                        estoque.quantidade_atual,
                        estoque.quantidade_minima
                    ])

                zip_file.writestr('estoque.csv', csv_buffer.getvalue())

        # Resetar posição do buffer para o início
        zip_buffer.seek(0)

        return zip_buffer, 200

    except Exception as e:
        print(f"❌ Erro ao exportar dados em lote: {str(e)}")
        return {"error": f"Erro ao exportar dados: {str(e)}"}, 500


# ===== IMPORTAÇÃO COM ESTOQUE (NOVA FUNCIONALIDADE) =====

def preview_importacao_estoque(data):
    """
    Faz preview da importação antes de executar
    
    Args:
        data: {
            'texto': str - Texto com dados para importar,
            'area_id': int - ID da área (opcional para preview),
            'fornecedor_id': int - ID do fornecedor (opcional para preview),
            'formato_forcado': str - 'simples' ou 'completo' (opcional)
        }
    
    Returns:
        Tuple (response_dict, status_code)
    """
    from .import_parser import parse_texto_importacao
    
    try:
        texto = data.get('texto', '').strip()
        formato_forcado = data.get('formato_forcado')  # Novo parâmetro
        
        if not texto:
            return {"error": "Texto para importação é obrigatório"}, 400
        
        # Parse do texto COM formato forçado se especificado
        if formato_forcado:
            resultado = parse_texto_importacao(texto, formato_forcado=formato_forcado)
        else:
            resultado = parse_texto_importacao(texto)
        
        if not resultado['sucesso']:
            return {
                "error": "Nenhum item válido encontrado",
                "erros": resultado['erros']
            }, 400
        
        # Retorna preview
        return {
            "formato": resultado['formato'],
            "total_itens": resultado['total_itens'],
            "total_erros": resultado['total_erros'],
            "itens": resultado['itens'],
            "erros": resultado['erros']
        }, 200
        
    except Exception as e:
        print(f"❌ Erro ao fazer preview: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": f"Erro ao processar preview: {str(e)}"}, 500


def executar_importacao_estoque(data):
    """
    Executa a importação de itens com estoque
    
    Args:
        data: {
            'texto': str - Texto com dados para importar,
            'area_id': int - ID da área,
            'fornecedor_id': int - ID do fornecedor,
            'atualizar_existentes': bool - Se deve atualizar itens existentes (default: True)
        }
    
    Returns:
        Tuple (response_dict, status_code)
    """
    from .import_parser import parse_texto_importacao
    
    try:
        texto = data.get('texto', '').strip()
        area_id = data.get('area_id')
        fornecedor_id = data.get('fornecedor_id')
        atualizar_existentes = data.get('atualizar_existentes', True)
        
        # Validações
        if not texto:
            return {"error": "Texto para importação é obrigatório"}, 400
        
        if not area_id:
            return {"error": "Área é obrigatória"}, 400
        
        if not fornecedor_id:
            return {"error": "Fornecedor é obrigatório"}, 400
        
        # Valida se área existe
        area = Area.query.get(area_id)
        if not area:
            return {"error": f"Área com ID {area_id} não encontrada"}, 404
        
        # Valida se fornecedor existe
        fornecedor = Fornecedor.query.get(fornecedor_id)
        if not fornecedor:
            return {"error": f"Fornecedor com ID {fornecedor_id} não encontrado"}, 404
        
        # Parse do texto
        resultado = parse_texto_importacao(texto)
        
        if not resultado['sucesso']:
            return {
                "error": "Nenhum item válido encontrado",
                "erros": resultado['erros']
            }, 400
        
        itens_criados = []
        itens_atualizados = []
        erros_processamento = []
        
        # Processa cada item
        for item_data in resultado['itens']:
            try:
                nome_item = item_data['nome']
                qtd_atual = item_data.get('quantidade_atual')
                qtd_minima = item_data.get('quantidade_minima')
                
                # Busca item existente no estoque
                estoque_existente = Estoque.query.filter_by(
                    nome_item=nome_item,
                    area_id=area_id
                ).first()
                
                if estoque_existente:
                    # Atualiza item existente
                    if atualizar_existentes:
                        if qtd_atual is not None:
                            estoque_existente.quantidade_atual = qtd_atual
                        if qtd_minima is not None:
                            estoque_existente.quantidade_minima = qtd_minima
                        
                        db.session.commit()
                        itens_atualizados.append({
                            'id': estoque_existente.id,
                            'nome': nome_item,
                            'quantidade_atual': estoque_existente.quantidade_atual,
                            'quantidade_minima': estoque_existente.quantidade_minima
                        })
                    else:
                        # Pula se não deve atualizar
                        erros_processamento.append(f"Item '{nome_item}' já existe e não foi atualizado")
                else:
                    # Cria novo item no estoque
                    novo_estoque = Estoque(
                        nome_item=nome_item,
                        area_id=area_id,
                        fornecedor_id=fornecedor_id,
                        quantidade_atual=qtd_atual if qtd_atual is not None else 0,
                        quantidade_minima=qtd_minima if qtd_minima is not None else 0,
                        unidade_medida='UN'  # Padrão, usuário configura depois
                    )
                    db.session.add(novo_estoque)
                    db.session.flush()  # Para obter o ID
                    
                    itens_criados.append({
                        'id': novo_estoque.id,
                        'nome': nome_item,
                        'quantidade_atual': novo_estoque.quantidade_atual,
                        'quantidade_minima': novo_estoque.quantidade_minima
                    })
                
            except Exception as e:
                db.session.rollback()
                erros_processamento.append(f"Erro ao processar '{item_data['nome']}': {str(e)}")
                continue
        
        # Commit final
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return {"error": f"Erro ao salvar no banco: {str(e)}"}, 500
        
        return {
            "sucesso": True,
            "formato": resultado['formato'],
            "total_criados": len(itens_criados),
            "total_atualizados": len(itens_atualizados),
            "total_erros": len(erros_processamento),
            "itens_criados": itens_criados,
            "itens_atualizados": itens_atualizados,
            "erros": erros_processamento + resultado['erros']
        }, 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro ao executar importação: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": f"Erro ao executar importação: {str(e)}"}, 500
