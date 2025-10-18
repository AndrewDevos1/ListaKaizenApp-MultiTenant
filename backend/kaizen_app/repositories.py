# Este arquivo conterá a camada de acesso a dados (Repositórios).
from .extensions import db
from .models import Item, Area, Fornecedor, Estoque, Pedido, Cotacao, CotacaoItem, Usuario

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
