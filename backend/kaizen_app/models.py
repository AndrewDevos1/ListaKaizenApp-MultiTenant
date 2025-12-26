from .extensions import db
from datetime import datetime, timezone, timedelta
import enum
import decimal

# Timezone de Brasília (BRT/BRST - UTC-3)
BRASILIA_TZ = timezone(timedelta(hours=-3))

# Helper para datas em horário de Brasília
def brasilia_now():
    """Retorna datetime atual no timezone de Brasília (BRT/BRST)."""
    return datetime.now(BRASILIA_TZ)

# Mantém compatibilidade com código antigo
def utc_now():
    """DEPRECATED: Use brasilia_now() ao invés."""
    return brasilia_now()

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
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=utc_now)  # Horário de Brasília (BRT/BRST)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.role is None:
            self.role = UserRoles.COLLABORATOR
        if self.aprovado is None:
            self.aprovado = False
        if self.ativo is None:
            self.ativo = True
        if self.criado_em is None:
            self.criado_em = utc_now()

    def to_dict(self):
        """Sobrescreve para não expor a senha."""
        return {
            "id": self.id,
            "nome": self.nome,
            "username": self.username,
            "email": self.email,
            "role": self.role.value,
            "aprovado": self.aprovado,
            "ativo": self.ativo,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None
        }

class Item(db.Model, SerializerMixin):
    __tablename__ = "itens"
    serialize_rules = ('-fornecedor.itens',)  # Evita recursão infinita

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    unidade_medida = db.Column(db.String(20), nullable=False)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    fornecedor = db.relationship('Fornecedor', backref=db.backref('itens', lazy=True))

class Area(db.Model, SerializerMixin):
    __tablename__ = "areas"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)

# Tabela de associação para o relacionamento muitos-para-muitos entre Fornecedores e Listas
fornecedor_lista = db.Table('fornecedor_lista',
    db.Column('fornecedor_id', db.Integer, db.ForeignKey('fornecedores.id'), primary_key=True),
    db.Column('lista_id', db.Integer, db.ForeignKey('listas.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=utc_now)
)

class Fornecedor(db.Model, SerializerMixin):
    __tablename__ = "fornecedores"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    contato = db.Column(db.String(100))
    meio_envio = db.Column(db.String(20))
    responsavel = db.Column(db.String(100))
    observacao = db.Column(db.String(600))

    # Relacionamento many-to-many com Lista através da tabela fornecedor_lista
    listas = db.relationship('Lista', secondary='fornecedor_lista',
                            backref=db.backref('fornecedores', lazy=True),
                            lazy=True)

class Estoque(db.Model, SerializerMixin):
    __tablename__ = "estoques"
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('itens.id'), nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id'), nullable=False)
    lista_id = db.Column(db.Integer, db.ForeignKey('listas.id'), nullable=True)
    quantidade_atual = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    quantidade_minima = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    pedido = db.Column(db.Numeric(10, 2), nullable=True, default=0.0)
    data_ultima_submissao = db.Column(db.DateTime, nullable=True)
    usuario_ultima_submissao_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)

    # Relacionamentos
    item = db.relationship('Item', backref=db.backref('estoques', lazy=True))
    area = db.relationship('Area', backref=db.backref('estoques', lazy=True))
    lista = db.relationship('Lista', backref=db.backref('estoques', lazy=True))
    usuario_ultima_submissao = db.relationship('Usuario', backref=db.backref('estoques_submetidos', lazy=True))

    def calcular_pedido(self):
        """Calcula o pedido baseado em qtd_minima e qtd_atual"""
        return max(float(self.quantidade_minima) - float(self.quantidade_atual), 0)

    def to_dict(self):
        d = super(Estoque, self).to_dict()
        if self.item:
            d['item'] = self.item.to_dict()
        # Garante que pedido sempre tenha um valor calculado
        if d.get('pedido') is None:
            d['pedido'] = self.calcular_pedido()
        return d

class SubmissaoStatus(enum.Enum):
    PENDENTE = "PENDENTE"
    PARCIALMENTE_APROVADO = "PARCIALMENTE_APROVADO"
    APROVADO = "APROVADO"
    REJEITADO = "REJEITADO"

class Submissao(db.Model, SerializerMixin):
    """
    Agrupa múltiplos pedidos de uma submissão de lista.
    Uma submissão representa um único envio de lista pelo colaborador.
    """
    __tablename__ = "submissoes"
    id = db.Column(db.Integer, primary_key=True)
    lista_id = db.Column(db.Integer, db.ForeignKey('listas.id', ondelete='CASCADE'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    data_submissao = db.Column(db.DateTime, nullable=False, default=utc_now)  # Horário de Brasília (BRT/BRST)
    status = db.Column(db.Enum(SubmissaoStatus), nullable=False, default=SubmissaoStatus.PENDENTE)
    total_pedidos = db.Column(db.Integer, nullable=False, default=0)
    
    # Relacionamentos
    lista = db.relationship('Lista', backref=db.backref('submissoes', lazy=True))
    usuario = db.relationship('Usuario', backref=db.backref('submissoes', lazy=True))
    pedidos = db.relationship('Pedido', backref='submissao', lazy='joined')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.status is None:
            self.status = SubmissaoStatus.PENDENTE
        if self.data_submissao is None:
            self.data_submissao = utc_now()

class PedidoStatus(enum.Enum):
    PENDENTE = "PENDENTE"
    APROVADO = "APROVADO"
    REJEITADO = "REJEITADO"

class Pedido(db.Model, SerializerMixin):
    """
    Pedido de compra gerado automaticamente quando qtd_atual < qtd_minima.
    Refatorado para usar ListaMaeItem (catálogo global).
    """
    __tablename__ = "pedidos"
    id = db.Column(db.Integer, primary_key=True)
    submissao_id = db.Column(db.Integer, 
                             db.ForeignKey('submissoes.id', ondelete='CASCADE'), 
                             nullable=True)  # Nullable para pedidos antigos
    lista_mae_item_id = db.Column(db.Integer, 
                                   db.ForeignKey('lista_mae_itens.id', ondelete='CASCADE'), 
                                   nullable=False)
    fornecedor_id = db.Column(db.Integer, 
                              db.ForeignKey('fornecedores.id'), 
                              nullable=True)
    quantidade_solicitada = db.Column(db.Numeric(10, 2), nullable=False)
    data_pedido = db.Column(db.DateTime, nullable=False, default=utc_now)  # Horário de Brasília (BRT/BRST)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    status = db.Column(db.Enum(PedidoStatus), nullable=False, default=PedidoStatus.PENDENTE)
    
    # Relacionamentos
    item = db.relationship('ListaMaeItem', backref=db.backref('pedidos', lazy=True))
    fornecedor = db.relationship('Fornecedor', backref=db.backref('pedidos', lazy=True))
    usuario = db.relationship('Usuario', backref=db.backref('pedidos', lazy=True))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.status is None:
            self.status = PedidoStatus.PENDENTE
        if self.data_pedido is None:
            self.data_pedido = utc_now()

class CotacaoStatus(enum.Enum):
    PENDENTE = "PENDENTE"
    CONCLUIDA = "CONCLUIDA"

class Cotacao(db.Model, SerializerMixin):
    __tablename__ = "cotacoes"
    id = db.Column(db.Integer, primary_key=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    data_cotacao = db.Column(db.DateTime, nullable=False, default=utc_now)
    status = db.Column(db.Enum(CotacaoStatus), nullable=False, default=CotacaoStatus.PENDENTE)
    fornecedor = db.relationship('Fornecedor', backref=db.backref('cotacoes', lazy=True))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.status is None:
            self.status = CotacaoStatus.PENDENTE
        if self.data_cotacao is None:
            self.data_cotacao = utc_now()

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
    data_criacao = db.Column(db.DateTime, nullable=False, default=utc_now)
    deletado = db.Column(db.Boolean, nullable=False, default=False)
    data_delecao = db.Column(db.DateTime, nullable=True)
    # Relacionamento muitos-para-muitos com os usuários (colaboradores)
    colaboradores = db.relationship('Usuario', secondary=lista_colaborador,
                                    lazy=True, backref=db.backref('listas_atribuidas', lazy=True))
    # Relacionamento com itens via tabela intermediária ListaItemRef (definido no model ListaItemRef)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.data_criacao is None:
            self.data_criacao = utc_now()
        if self.deletado is None:
            self.deletado = False


class ListaMaeItem(db.Model, SerializerMixin):
    """
    Catálogo GLOBAL de todos os itens.
    Cada item existe independentemente das listas e pode ser referenciado
    por múltiplas listas através da tabela intermediária ListaItemRef.
    """
    __tablename__ = "lista_mae_itens"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), unique=True, nullable=False)  # ÚNICO GLOBALMENTE
    unidade = db.Column(db.String(50), nullable=False, default='un', server_default='un')
    criado_em = db.Column(db.DateTime, default=utc_now)
    atualizado_em = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    def to_dict(self):
        """Serializa o item do catálogo global."""
        return {
            "id": self.id,
            "nome": self.nome,
            "unidade": self.unidade,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None,
            "total_listas": self.lista_refs.count() if hasattr(self, 'lista_refs') else 0
        }


class ListaItemRef(db.Model, SerializerMixin):
    """
    Tabela intermediária que associa Listas a Itens do Catálogo Global.
    Armazena quantidades específicas por lista.
    """
    __tablename__ = "lista_item_ref"

    lista_id = db.Column(db.Integer, db.ForeignKey('listas.id', ondelete='CASCADE'), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('lista_mae_itens.id', ondelete='CASCADE'), primary_key=True)
    quantidade_atual = db.Column(db.Float, default=0, nullable=False)
    quantidade_minima = db.Column(db.Float, default=1.0, nullable=False)
    criado_em = db.Column(db.DateTime, default=utc_now)
    atualizado_em = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    # Relacionamentos
    lista = db.relationship('Lista', backref=db.backref('item_refs', lazy='dynamic', cascade='all, delete-orphan'))
    item = db.relationship('ListaMaeItem', backref=db.backref('lista_refs', lazy='dynamic'))

    def get_pedido(self):
        """Calcula o pedido: max(0, qtd_minima - qtd_atual)"""
        return max(0, self.quantidade_minima - self.quantidade_atual)

    def to_dict(self):
        """Serializa a referência com dados do item e cálculo de pedido."""
        d = {
            "lista_id": self.lista_id,
            "item_id": self.item_id,
            "quantidade_atual": self.quantidade_atual,
            "quantidade_minima": self.quantidade_minima,
            "pedido": self.get_pedido(),
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None,
        }
        # Incluir dados do item
        if self.item:
            d['item'] = {
                "id": self.item.id,
                "nome": self.item.nome,
                "unidade": self.item.unidade
            }
        return d
