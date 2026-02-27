# Este arquivo conterá a camada de acesso a dados (Repositórios).
from .extensions import db
from .models import (
    Item,
    Area,
    Fornecedor,
    Restaurante,
    Estoque,
    Pedido,
    Cotacao,
    CotacaoItem,
    Usuario,
    Lista,
    brasilia_now,
)

# Funções genéricas de repositório

def get_by_id(model, item_id):
    return db.session.get(model, item_id)

def get_all(model):
    return db.session.query(model).all()

def add_instance(model_instance):
    db.session.add(model_instance)
    db.session.commit()

def delete_instance(model, item_id):
    instance = db.session.get(model, item_id)
    if instance:
        db.session.delete(instance)
        db.session.commit()
        return True
    return False

def update_instance(model, item_id, data):
    instance = db.session.get(model, item_id)
    if instance:
        for key, value in data.items():
            setattr(instance, key, value)
        db.session.commit()
        return instance
    return None


# Repositórios específicos usados nos testes

def buscar_usuario_por_email(email):
    return Usuario.query.filter_by(email=email).first()

def listar_usuarios_pendentes():
    return Usuario.query.filter_by(aprovado=False).all()

def criar_item(nome, unidade_medida, fornecedor_id):
    item = Item(nome=nome, unidade_medida=unidade_medida, fornecedor_id=fornecedor_id)
    db.session.add(item)
    db.session.commit()
    return item

def listar_itens():
    return Item.query.all()

def buscar_item_por_nome(nome):
    return Item.query.filter_by(nome=nome).first()

def criar_area(nome):
    area = Area(nome=nome)
    db.session.add(area)
    db.session.commit()
    return area

def listar_areas():
    return Area.query.all()

def buscar_area_por_id(area_id):
    return db.session.get(Area, area_id)

def criar_fornecedor(nome, contato=None, meio_envio=None, responsavel=None, observacao=None, restaurante_id=None):
    if restaurante_id is None:
        restaurante = Restaurante.query.first()
        restaurante_id = restaurante.id if restaurante else None
    fornecedor = Fornecedor(
        nome=nome,
        contato=contato,
        meio_envio=meio_envio,
        responsavel=responsavel,
        observacao=observacao,
        restaurante_id=restaurante_id,
    )
    db.session.add(fornecedor)
    db.session.commit()
    return fornecedor

def listar_fornecedores():
    return Fornecedor.query.all()

def atualizar_fornecedor(fornecedor_id, **dados):
    fornecedor = db.session.get(Fornecedor, fornecedor_id)
    if not fornecedor:
        return None
    for key, value in dados.items():
        if hasattr(fornecedor, key):
            setattr(fornecedor, key, value)
    db.session.commit()
    return fornecedor

def buscar_estoque_por_area_e_item(area_id, item_id):
    return Estoque.query.filter_by(area_id=area_id, item_id=item_id).first()

def listar_estoque_abaixo_minimo():
    return Estoque.query.filter(Estoque.quantidade_atual < Estoque.quantidade_minima).all()

def atualizar_quantidade_estoque(estoque_id, quantidade_atual):
    estoque = db.session.get(Estoque, estoque_id)
    if not estoque:
        return None
    estoque.quantidade_atual = quantidade_atual
    db.session.commit()
    return estoque

def criar_lista(nome, descricao=None, restaurante_id=None):
    if restaurante_id is None:
        raise ValueError("restaurante_id é obrigatório")
    lista = Lista(nome=nome, descricao=descricao, restaurante_id=restaurante_id)
    db.session.add(lista)
    db.session.commit()
    return lista

def listar_listas_ativas():
    return Lista.query.filter_by(deletado=False).all()

def soft_delete_lista(lista_id):
    lista = db.session.get(Lista, lista_id)
    if not lista:
        return None
    lista.deletado = True
    lista.data_delecao = brasilia_now()
    db.session.commit()
    return lista

def adicionar_colaborador_lista(lista_id, usuario_id):
    lista = db.session.get(Lista, lista_id)
    usuario = db.session.get(Usuario, usuario_id)
    if not lista or not usuario:
        return None
    if usuario not in lista.colaboradores:
        lista.colaboradores.append(usuario)
        db.session.commit()
    return lista
