from .extensions import db
from datetime import datetime
import enum
import decimal

# Helper para serialização
class SerializerMixin:
    def to_dict(self):
        """Serializa o objeto para um dicionário."""
        # Converte Numeric para float para serialização JSON
        d = {}
        for c in self.__table__.columns:
            val = getattr(self, c.name)
            if isinstance(val, decimal.Decimal):
                d[c.name] = float(val)
            elif isinstance(val, datetime):
                d[c.name] = val.isoformat()
            elif isinstance(val, enum.Enum):
                d[c.name] = val.value
            else:
                d[c.name] = val
        return d

class UserRoles(enum.Enum):
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"

class Usuario(db.Model, SerializerMixin):
    __tablename__ = "usuarios"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum(UserRoles), nullable=False, default=UserRoles.COLLABORATOR)
    aprovado = db.Column(db.Boolean, default=False, nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Sobrescreve para não expor a senha."""
        return {
            "id": self.id,
            "nome": self.nome,
            "username": self.username,
            "email": self.email,
            "role": self.role.value,
            "aprovado": self.aprovado,
            "criado_em": self.criado_em.isoformat()
        }

class Item(db.Model, SerializerMixin):
    __tablename__ = "itens"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    unidade_medida = db.Column(db.String(20), nullable=False)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    fornecedor = db.relationship('Fornecedor', backref=db.backref('itens', lazy=True))

class Area(db.Model, SerializerMixin):
    __tablename__ = "areas"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)

class Fornecedor(db.Model, SerializerMixin):
    __tablename__ = "fornecedores"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    contato = db.Column(db.String(100))
    meio_envio = db.Column(db.String(20))

class Estoque(db.Model, SerializerMixin):
    __tablename__ = "estoques"
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('itens.id'), nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id'), nullable=False)
    quantidade_atual = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    quantidade_minima = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    item = db.relationship('Item', backref=db.backref('estoques', lazy=True))
    area = db.relationship('Area', backref=db.backref('estoques', lazy=True))

    def to_dict(self):
        d = super(Estoque, self).to_dict()
        if self.item:
            d['item'] = self.item.to_dict()
        return d

class PedidoStatus(enum.Enum):
    PENDENTE = "PENDENTE"
    APROVADO = "APROVADO"
    REJEITADO = "REJEITADO"

class Pedido(db.Model, SerializerMixin):
    __tablename__ = "pedidos"
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('itens.id'), nullable=False)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    quantidade_solicitada = db.Column(db.Numeric(10, 2), nullable=False)
    data_pedido = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    status = db.Column(db.Enum(PedidoStatus), nullable=False, default=PedidoStatus.PENDENTE)
    item = db.relationship('Item', backref=db.backref('pedidos', lazy=True))
    fornecedor = db.relationship('Fornecedor', backref=db.backref('pedidos', lazy=True))
    usuario = db.relationship('Usuario', backref=db.backref('pedidos', lazy=True))

class CotacaoStatus(enum.Enum):
    PENDENTE = "PENDENTE"
    CONCLUIDA = "CONCLUIDA"

class Cotacao(db.Model, SerializerMixin):
    __tablename__ = "cotacoes"
    id = db.Column(db.Integer, primary_key=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    data_cotacao = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.Enum(CotacaoStatus), nullable=False, default=CotacaoStatus.PENDENTE)
    fornecedor = db.relationship('Fornecedor', backref=db.backref('cotacoes', lazy=True))

    def to_dict(self):
        d = super(Cotacao, self).to_dict()
        d['itens'] = [item.to_dict() for item in self.itens]
        # Também pode ser útil incluir informações do fornecedor
        if self.fornecedor:
            d['fornecedor'] = self.fornecedor.to_dict()
        return d

class CotacaoItem(db.Model, SerializerMixin):
    __tablename__ = "cotacao_itens"
    id = db.Column(db.Integer, primary_key=True)
    cotacao_id = db.Column(db.Integer, db.ForeignKey('cotacoes.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('itens.id'), nullable=False)
    quantidade = db.Column(db.Numeric(10, 2), nullable=False)
    preco_unitario = db.Column(db.Numeric(10, 4), nullable=False)
    cotacao = db.relationship('Cotacao', backref=db.backref('itens', lazy=True, cascade="all, delete-orphan"))
    item = db.relationship('Item')

    def to_dict(self):
        d = super(CotacaoItem, self).to_dict()
        if self.item:
            d['item'] = self.item.to_dict()
        return d

# Tabela de associação para o relacionamento muitos-para-muitos entre Listas e Colaboradores
lista_colaborador = db.Table('lista_colaborador',
    db.Column('lista_id', db.Integer, db.ForeignKey('listas.id'), primary_key=True),
    db.Column('usuario_id', db.Integer, db.ForeignKey('usuarios.id'), primary_key=True)
)

class Lista(db.Model, SerializerMixin):
    __tablename__ = "listas"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    descricao = db.Column(db.String(255), nullable=True)
    data_criacao = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    # Relacionamento muitos-para-muitos com os usuários (colaboradores)
    colaboradores = db.relationship('Usuario', secondary=lista_colaborador,
                                    lazy='subquery', backref=db.backref('listas_atribuidas', lazy=True))

