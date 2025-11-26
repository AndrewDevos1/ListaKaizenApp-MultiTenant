from .models import Usuario, UserRoles, Item, Area, Fornecedor, Estoque, Cotacao, CotacaoStatus, CotacaoItem, Pedido, Lista, ListaMaeItem
from .extensions import db
from . import repositories
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from datetime import datetime, timedelta
from sqlalchemy import func
from flask import current_app

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
    user = Usuario.query.get(user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    user.aprovado = True
    db.session.commit()
    return {"message": f"Usuário {user.nome} aprovado com sucesso."}

def update_user_by_admin(user_id, data):
    """Atualiza os dados de um usuário a pedido de um admin."""
    user = Usuario.query.get(user_id)
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
    user = Usuario.query.get(user_id)
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
    user = Usuario.query.get(user_id)
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
    user = Usuario.query.get(user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    return user.to_dict(), 200

def delete_user(user_id):
    """Deleta um usuário e todos os registros relacionados."""
    user = Usuario.query.get(user_id)
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
    user = Usuario.query.get(user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404

    if not user.ativo:
        return {"error": "Usuário já está desativado."}, 400

    user.ativo = False
    db.session.commit()

    return {"message": f"Usuário {user.nome} desativado com sucesso."}, 200

def reactivate_user(user_id):
    """Reativa um usuário desativado."""
    user = Usuario.query.get(user_id)
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
    estoque.data_ultima_submissao = datetime.utcnow()
    estoque.usuario_ultima_submissao_id = usuario_id

    db.session.commit()
    return estoque.to_dict(), 200

def submit_estoque_lista(lista_id, usuario_id, items_data):
    """
    Submete múltiplos itens de estoque de uma lista.
    Calcula pedidos automaticamente e cria registros de Pedido se necessário.

    items_data: [{"estoque_id": 1, "quantidade_atual": 5}, ...]
    """
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    # Valida se usuário está atribuído à lista
    if usuario_id not in [u.id for u in lista.colaboradores]:
        return {"error": "Você não tem acesso a esta lista."}, 403

    pedidos_criados = []
    estoques_atualizados = []

    for item_data in items_data:
        estoque_id = item_data.get('estoque_id')
        quantidade_atual = item_data.get('quantidade_atual')

        if not estoque_id or quantidade_atual is None:
            continue

        estoque = repositories.get_by_id(Estoque, estoque_id)
        if not estoque or estoque.lista_id != lista_id:
            continue

        # Atualiza quantidade e calcula pedido
        estoque.quantidade_atual = quantidade_atual
        estoque.pedido = estoque.calcular_pedido()
        estoque.data_ultima_submissao = datetime.utcnow()
        estoque.usuario_ultima_submissao_id = usuario_id

        db.session.add(estoque)
        estoques_atualizados.append(estoque)

        # Cria Pedido se quantidade está abaixo do mínimo
        if float(quantidade_atual) < float(estoque.quantidade_minima):
            quantidade_a_pedir = float(estoque.quantidade_minima) - float(quantidade_atual)
            novo_pedido = Pedido(
                item_id=estoque.item_id,
                fornecedor_id=estoque.item.fornecedor_id,
                quantidade_solicitada=quantidade_a_pedir,
                usuario_id=usuario_id
            )
            db.session.add(novo_pedido)
            pedidos_criados.append(novo_pedido)

    db.session.commit()

    return {
        "message": f"Lista submetida com sucesso! {len(pedidos_criados)} pedido(s) criado(s).",
        "estoques_atualizados": len(estoques_atualizados),
        "pedidos_criados": len(pedidos_criados)
    }, 201

# --- Serviços de Lista ---

def create_lista(data):
    """Cria uma nova lista de compras."""
    if not data or not data.get('nome'):
        return {"error": "O nome da lista é obrigatório."}, 400
    
    nova_lista = Lista(nome=data['nome'])
    repositories.add_instance(nova_lista)
    
    return nova_lista.to_dict(), 201

def get_all_listas():
    """Retorna todas as listas de compras."""
    return repositories.get_all(Lista), 200

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
        # Limpa atribuições existentes para garantir que a lista de IDs seja a nova verdade
        lista.colaboradores = []
        for user_id in colaborador_ids:
            user = repositories.get_by_id(Usuario, user_id)
            if user and user.role == UserRoles.COLLABORATOR:
                lista.colaboradores.append(user)
    
    db.session.commit()
    
    return lista.to_dict(), 200

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
    if 'nome' in data and data['nome'] != lista.nome:
        existing = Lista.query.filter_by(nome=data['nome']).first()
        if existing:
            return {"error": "Já existe uma lista com esse nome."}, 400

    # Atualizar campos
    if 'nome' in data:
        lista.nome = data['nome']
    if 'descricao' in data:
        lista.descricao = data['descricao']

    db.session.commit()
    return lista.to_dict(), 200

def delete_lista(lista_id):
    """Deleta uma lista e suas associações com colaboradores."""
    lista = repositories.get_by_id(Lista, lista_id)
    if not lista:
        return {"error": "Lista não encontrada."}, 404

    # O relacionamento many-to-many será limpo automaticamente
    db.session.delete(lista)
    db.session.commit()

    return {"message": "Lista deletada com sucesso."}, 200


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
    pending_cotacoes = Cotacao.query.filter_by(status=CotacaoStatus.PENDENTE).count()
    completed_cotacoes = Cotacao.query.filter_by(status=CotacaoStatus.CONCLUIDA).count()

    summary_data = {
        'total_users': total_users,
        'pending_users': pending_users,
        'total_lists': total_lists,
        'pending_cotacoes': pending_cotacoes,
        'completed_cotacoes': completed_cotacoes,
    }
    
    return summary_data, 200

def get_activity_summary():
    """Retorna o número de pedidos por dia nos últimos 7 dias."""
    today = datetime.utcnow().date()
    dates = [today - timedelta(days=i) for i in range(6, -1, -1)] # Últimos 7 dias
    
    activity_data = []
    for d in dates:
        count = Pedido.query.filter(func.date(Pedido.data_pedido) == d).count()
        activity_data.append(count)

    labels = [d.strftime('%d/%m') for d in dates]

    return {"labels": labels, "data": activity_data}, 200

def get_collaborator_dashboard_summary(user_id):
    """Retorna estatísticas do dashboard para colaboradores."""
    from .models import Usuario, Pedido, Lista
    from .extensions import db

    # Buscar o usuário
    usuario = Usuario.query.get(user_id)
    if not usuario:
        return {"error": "Usuário não encontrado"}, 404

    # Número de áreas atribuídas ao colaborador (via listas)
    minhas_areas = db.session.query(Lista).filter(
        Lista.colaboradores.any(id=user_id)
    ).count()

    # Submissões pendentes do colaborador
    pending_submissions = Pedido.query.filter_by(
        criado_por=user_id,
        status='PENDENTE'
    ).count()

    # Submissões concluídas do colaborador
    completed_submissions = Pedido.query.filter_by(
        criado_por=user_id,
        status='APROVADO'
    ).count()

    # Pedidos pendentes
    pedidos_pendentes = Pedido.query.filter_by(
        criado_por=user_id,
        status='PENDENTE'
    ).count()

    summary_data = {
        "minhas_areas": minhas_areas,
        "pending_submissions": pending_submissions,
        "completed_submissions": completed_submissions,
        "pedidos_pendentes": pedidos_pendentes
    }

    return summary_data, 200

# --- Serviços de Listas com Estoque (Nova Feature) ---

def get_minhas_listas(user_id):
    """Retorna todas as listas atribuídas a um colaborador."""
    current_app.logger.info(f"[GET_MINHAS_LISTAS] user_id: {user_id}")

    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        current_app.logger.error(f"[GET_MINHAS_LISTAS] Usuário {user_id} não encontrado")
        return {"error": "Usuário não encontrado."}, 404

    listas = usuario.listas_atribuidas
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

def adicionar_item_lista_mae(lista_id, data):
    """Adiciona um novo item à Lista Mãe."""
    try:
        lista = Lista.query.get(lista_id)
        if not lista:
            return {"error": "Lista não encontrada"}, 404

        novo_item = ListaMaeItem(
            lista_mae_id=lista_id,
            nome=data.get('nome'),
            unidade=data.get('unidade'),
            quantidade_atual=data.get('quantidade_atual', 0),
            quantidade_minima=data.get('quantidade_minima', 0)
        )

        db.session.add(novo_item)
        db.session.commit()

        return novo_item.to_dict(), 201
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500


def editar_item_lista_mae(lista_id, item_id, data):
    """Edita um item da Lista Mãe."""
    try:
        item = ListaMaeItem.query.filter_by(
            id=item_id,
            lista_mae_id=lista_id
        ).first()

        if not item:
            return {"error": "Item não encontrado"}, 404

        item.nome = data.get('nome', item.nome)
        item.unidade = data.get('unidade', item.unidade)
        item.quantidade_atual = data.get('quantidade_atual', item.quantidade_atual)
        item.quantidade_minima = data.get('quantidade_minima', item.quantidade_minima)
        item.atualizado_em = datetime.utcnow()

        db.session.commit()
        return item.to_dict(), 200
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500


def deletar_item_lista_mae(lista_id, item_id):
    """Deleta um item da Lista Mãe."""
    try:
        item = ListaMaeItem.query.filter_by(
            id=item_id,
            lista_mae_id=lista_id
        ).first()

        if not item:
            return {"error": "Item não encontrado"}, 404

        db.session.delete(item)
        db.session.commit()
        return {"message": "Item removido com sucesso"}, 200
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500


def obter_lista_mae(lista_id):
    """Retorna a Lista Mãe com todos os seus itens."""
    from flask import current_app
    import sys

    try:
        print(f"\n[obter_lista_mae] INICIANDO - lista_id={lista_id}", flush=True, file=sys.stdout)
        print(f"[obter_lista_mae] Database URI: {current_app.config['SQLALCHEMY_DATABASE_URI']}", flush=True, file=sys.stdout)

        # Busca a lista
        lista = Lista.query.filter(Lista.id == lista_id).first()
        print(f"[obter_lista_mae] Lista encontrada: {lista is not None}, ID={lista.id if lista else 'N/A'}", flush=True, file=sys.stdout)

        if not lista:
            return {"error": "Lista não encontrada"}, 404

        # Busca itens diretamente do banco de dados (não da relação)
        # Isso evita problemas de lazy loading em contexto HTTP
        itens = ListaMaeItem.query.filter(ListaMaeItem.lista_mae_id == lista_id).all()
        print(f"[obter_lista_mae] Itens encontrados: {len(itens)}", flush=True, file=sys.stdout)
        for idx, item in enumerate(itens[:3]):
            print(f"  [{idx}] ID={item.id}, Nome={item.nome}, lista_mae_id={item.lista_mae_id}", flush=True, file=sys.stdout)

        # Busca os fornecedores atribuídos à lista
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
            "itens": [item.to_dict() for item in itens],
            "total_itens": len(itens)
        }

        print(f"[obter_lista_mae] Retornando resultado com {result['total_itens']} itens", flush=True, file=sys.stdout)
        return result, 200
    except Exception as e:
        current_app.logger.error(f"[LISTA MAE GET] ERRO: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


def atribuir_fornecedor_lista_mae(lista_id, data):
    """
    Atribui um fornecedor a múltiplos itens da Lista Mãe e gera Pedidos.

    Recebe:
        lista_id: ID da Lista Mãe
        data: {
            "item_ids": [1, 2, 3],  # IDs dos itens
            "fornecedor_id": 5      # ID do fornecedor
        }

    Retorna:
        Lista de pedidos criados
    """
    try:
        # Validar entrada
        item_ids = data.get('item_ids', [])
        fornecedor_id = data.get('fornecedor_id')

        if not item_ids or not fornecedor_id:
            return {"error": "item_ids e fornecedor_id são obrigatórios"}, 400

        # Validar que lista existe
        lista = Lista.query.get(lista_id)
        if not lista:
            return {"error": "Lista não encontrada"}, 404

        # Validar que fornecedor existe
        fornecedor = Fornecedor.query.get(fornecedor_id)
        if not fornecedor:
            return {"error": "Fornecedor não encontrado"}, 404

        # Validar que itens existem e pertencem a esta lista
        itens = ListaMaeItem.query.filter(
            ListaMaeItem.id.in_(item_ids),
            ListaMaeItem.lista_mae_id == lista_id
        ).all()

        if len(itens) != len(item_ids):
            return {"error": "Um ou mais itens não encontrados na lista"}, 404

        # Criar pedidos para cada item
        pedidos_criados = []
        usuario_id = get_current_user_id()

        for item in itens:
            # Calcular quantidade do pedido
            quantidade_pedido = max(0, item.quantidade_minima - item.quantidade_atual)

            if quantidade_pedido > 0:
                # Verificar se já existe pedido pendente para este item/fornecedor
                pedido_existe = Pedido.query.filter_by(
                    item_id=item.id,
                    fornecedor_id=fornecedor_id,
                    status=PedidoStatus.PENDENTE
                ).first()

                if not pedido_existe:
                    novo_pedido = Pedido(
                        item_id=item.id,
                        fornecedor_id=fornecedor_id,
                        quantidade_solicitada=quantidade_pedido,
                        usuario_id=usuario_id,
                        status=PedidoStatus.PENDENTE,
                        data_pedido=datetime.utcnow()
                    )
                    db.session.add(novo_pedido)
                    pedidos_criados.append(novo_pedido)

        # Commit de todos os pedidos
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
    Importa múltiplos itens em lote para uma Lista Mãe.

    Recebe:
        lista_id: ID da Lista Mãe
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

        # Validar que lista existe
        lista = Lista.query.get(lista_id)
        if not lista:
            return {"error": "Lista não encontrada"}, 404

        items_criados = 0
        items_duplicados = 0

        for nome in nomes:
            nome_limpo = nome.strip()

            # Ignorar nomes muito curtos ou vazios
            if len(nome_limpo) < 2:
                continue

            # Verificar se item com esse nome já existe nesta lista
            item_existe = ListaMaeItem.query.filter_by(
                lista_mae_id=lista_id,
                nome=nome_limpo
            ).first()

            if item_existe:
                items_duplicados += 1
                continue

            # Criar novo item
            novo_item = ListaMaeItem(
                lista_mae_id=lista_id,
                nome=nome_limpo,
                unidade='Unidade',  # Padrão - usuário pode editar depois
                quantidade_atual=0,
                quantidade_minima=0
            )
            db.session.add(novo_item)
            items_criados += 1

        # Commit de todos os itens
        db.session.commit()

        return {
            "message": f"{items_criados} item(ns) criado(s)",
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
    """Retorna itens de estoque da lista para um colaborador."""
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

    # Buscar estoques da lista
    estoques = Estoque.query.filter_by(lista_id=lista_id).all()

    # Preparar resposta com dados do item
    estoques_data = []
    for estoque in estoques:
        item = estoque.item
        estoque_dict = {
            "id": estoque.id,
            "item_id": estoque.item_id,
            "lista_id": estoque.lista_id,
            "quantidade_atual": float(estoque.quantidade_atual),
            "quantidade_minima": float(estoque.quantidade_minima),
            "pedido": max(0, float(estoque.quantidade_minima - estoque.quantidade_atual)),
            "item": {
                "id": item.id,
                "nome": item.nome,
                "unidade_medida": item.unidade_medida
            } if item else None
        }
        estoques_data.append(estoque_dict)

    return estoques_data, 200


def update_estoque_colaborador(user_id, estoque_id, data):
    """Atualiza apenas a quantidade_atual de um estoque para um colaborador."""
    # Verificar se o usuário existe
    usuario = repositories.get_by_id(Usuario, user_id)
    if not usuario:
        return {"error": "Usuário não encontrado."}, 404

    # Buscar estoque
    estoque = repositories.get_by_id(Estoque, estoque_id)
    if not estoque:
        return {"error": "Estoque não encontrado."}, 404

    # Verificar se o colaborador está atribuído à lista deste estoque
    if estoque.lista not in usuario.listas_atribuidas:
        return {"error": "Acesso negado. Esta lista não foi atribuída a você."}, 403

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

    try:
        # Atualizar apenas quantidade_atual
        estoque.quantidade_atual = quantidade_atual
        estoque.data_ultima_submissao = datetime.utcnow()
        estoque.usuario_ultima_submissao_id = user_id

        db.session.commit()

        return {
            "message": "Estoque atualizado com sucesso.",
            "estoque": {
                "id": estoque.id,
                "quantidade_atual": float(estoque.quantidade_atual),
                "quantidade_minima": float(estoque.quantidade_minima),
                "pedido": max(0, float(estoque.quantidade_minima - estoque.quantidade_atual))
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
