from .extensions import db
from datetime import datetime, timezone, timedelta
import enum
import decimal
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

# Timezone de Brasília (BRT/BRST - com suporte a horário de verão)
BRASILIA_TZ = ZoneInfo('America/Sao_Paulo')

# Helper para datas em horário de Brasília
def brasilia_now():
    """Retorna datetime atual no timezone de Brasília (BRT/BRST com suporte a DST)."""
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
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"
    SUPPLIER = "SUPPLIER"

class StatusSolicitacaoRestaurante(enum.Enum):
    """Status das solicitações de cadastro de restaurante."""
    PENDENTE = "PENDENTE"
    APROVADO = "APROVADO"
    REJEITADO = "REJEITADO"

class Usuario(db.Model, SerializerMixin):
    __tablename__ = "usuarios"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(256), nullable=False)
    senha_texto_puro = db.Column(db.String(128), nullable=True)  # Senha em texto puro para admins compartilharem
    role = db.Column(db.Enum(UserRoles), nullable=False, default=UserRoles.COLLABORATOR)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), nullable=True, index=True)
    aprovado = db.Column(db.Boolean, default=False, nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=utc_now)  # Horário de Brasília (BRT/BRST)
    session_token = db.Column(db.String(64), nullable=True, index=True)
    session_updated_at = db.Column(db.DateTime, nullable=True)
    wizard_status = db.Column(db.JSON, nullable=False, default=dict, server_default='{}')

    restaurante = db.relationship('Restaurante', back_populates='usuarios')

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
            "restaurante_id": self.restaurante_id,
            "restaurante_nome": self.restaurante.nome if self.restaurante else None,
            "aprovado": self.aprovado,
            "ativo": self.ativo,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "wizard_status": self.wizard_status or {}
        }

    def to_dict_with_password(self):
        """Serializa usuário incluindo senha em texto puro (apenas para admins)."""
        data = self.to_dict()
        data['senha_texto_puro'] = self.senha_texto_puro
        return data


class Restaurante(db.Model, SerializerMixin):
    __tablename__ = 'restaurantes'
    serialize_rules = ('-usuarios', '-listas', '-itens')

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False, unique=True)
    slug = db.Column(db.String(100), nullable=False, unique=True, index=True)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
    deletado = db.Column(db.Boolean, default=False, nullable=False)

    usuarios = db.relationship('Usuario', back_populates='restaurante', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'slug': self.slug,
            'ativo': self.ativo,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None
        }

class Item(db.Model, SerializerMixin):
    __tablename__ = "itens"
    serialize_rules = ('-fornecedor.itens',)  # Evita recursão infinita
    __table_args__ = (
        db.Index('idx_fornecedor_nome', 'fornecedor_id', 'nome'),
    )

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    codigo_fornecedor = db.Column(db.String(50), nullable=True)
    descricao = db.Column(db.Text, nullable=True)
    marca = db.Column(db.String(100), nullable=True)
    unidade_medida = db.Column(db.String(20), nullable=False)
    preco_atual = db.Column(db.Numeric(10, 4), nullable=True)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    fornecedor = db.relationship('Fornecedor', backref=db.backref('itens', lazy=True))

# Tabela de associação para o relacionamento muitos-para-muitos entre Áreas e Colaboradores
area_colaborador = db.Table('area_colaborador',
    db.Column('area_id', db.Integer, db.ForeignKey('areas.id', ondelete='CASCADE'), primary_key=True),
    db.Column('usuario_id', db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), primary_key=True)
)

class Area(db.Model, SerializerMixin):
    __tablename__ = "areas"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)

    colaboradores = db.relationship('Usuario', secondary=area_colaborador,
                                    lazy=True, backref=db.backref('areas_atribuidas', lazy=True))

# Tabela de associação para o relacionamento muitos-para-muitos entre Fornecedores e Listas
fornecedor_lista = db.Table('fornecedor_lista',
    db.Column('fornecedor_id', db.Integer, db.ForeignKey('fornecedores.id'), primary_key=True),
    db.Column('lista_id', db.Integer, db.ForeignKey('listas.id'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=utc_now)
)

class Fornecedor(db.Model, SerializerMixin):
    __tablename__ = "fornecedores"
    serialize_rules = ('-listas.fornecedores',)
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    cnpj = db.Column(db.String(18), nullable=True)
    telefone = db.Column(db.String(20), nullable=True)
    endereco = db.Column(db.String(400), nullable=True)
    cidade = db.Column(db.String(100), nullable=True)
    estado = db.Column(db.String(2), nullable=True)
    cep = db.Column(db.String(10), nullable=True)
    site = db.Column(db.String(200), nullable=True)
    aprovado = db.Column(db.Boolean, default=False, nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    contato = db.Column(db.String(100))
    meio_envio = db.Column(db.String(20))
    responsavel = db.Column(db.String(100))
    observacao = db.Column(db.String(600))
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), nullable=False, index=True)
    compartilhado_regiao = db.Column(db.Boolean, default=False, nullable=False)

    restaurante = db.relationship('Restaurante')
    usuario = db.relationship('Usuario', backref=db.backref('fornecedor_vinculado', uselist=False))

    # Relacionamento many-to-many com Lista através da tabela fornecedor_lista
    listas = db.relationship('Lista', secondary='fornecedor_lista',
                            backref=db.backref('fornecedores', lazy=True),
                            lazy=True)


class FornecedorItemCodigo(db.Model, SerializerMixin):
    __tablename__ = "fornecedor_item_codigos"
    __table_args__ = (
        db.UniqueConstraint('fornecedor_id', 'item_id', name='uq_fornecedor_item_codigo'),
        db.UniqueConstraint('fornecedor_id', 'codigo', name='uq_fornecedor_codigo'),
    )

    id = db.Column(db.Integer, primary_key=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id', ondelete='CASCADE'), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey('itens.id', ondelete='CASCADE'), nullable=False, index=True)
    codigo = db.Column(db.String(50), nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)

    fornecedor = db.relationship('Fornecedor')
    item = db.relationship('Item')


class ConviteFornecedor(db.Model, SerializerMixin):
    __tablename__ = 'convite_fornecedores'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    usado = db.Column(db.Boolean, default=False, nullable=False)
    usado_em = db.Column(db.DateTime, nullable=True)
    usado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id', ondelete='SET NULL'), nullable=True, index=True)
    expira_em = db.Column(db.DateTime, nullable=True)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    limite_usos = db.Column(db.Integer, default=1, nullable=False)
    quantidade_usos = db.Column(db.Integer, default=0, nullable=False)

    criado_por = db.relationship('Usuario', foreign_keys=[criado_por_id])
    usado_por = db.relationship('Usuario', foreign_keys=[usado_por_id])
    fornecedor = db.relationship('Fornecedor')

    @property
    def usos_restantes(self):
        return max(0, self.limite_usos - self.quantidade_usos)

    def esta_valido(self):
        if not self.ativo:
            return False
        if self.quantidade_usos >= self.limite_usos:
            return False
        if self.expira_em and self.expira_em < brasilia_now():
            return False
        return True

    def to_dict(self):
        return {
            "id": self.id,
            "token": self.token,
            "criado_por_id": self.criado_por_id,
            "criado_por_nome": self.criado_por.nome if self.criado_por else None,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "expira_em": self.expira_em.isoformat() if self.expira_em else None,
            "usado": self.quantidade_usos >= self.limite_usos,
            "usado_em": self.usado_em.isoformat() if self.usado_em else None,
            "usado_por_id": self.usado_por_id,
            "usado_por_nome": self.usado_por.nome if self.usado_por else None,
            "usado_por_email": self.usado_por.email if self.usado_por else None,
            "fornecedor_id": self.fornecedor_id,
            "fornecedor_nome": self.fornecedor.nome if self.fornecedor else None,
            "limite_usos": self.limite_usos,
            "quantidade_usos": self.quantidade_usos,
            "usos_restantes": self.usos_restantes,
            "ativo": self.ativo
        }


class ItemPrecoHistorico(db.Model, SerializerMixin):
    __tablename__ = 'item_preco_historico'

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('itens.id', ondelete='CASCADE'), nullable=False, index=True)
    preco_anterior = db.Column(db.Numeric(10, 4), nullable=True)
    preco_novo = db.Column(db.Numeric(10, 4), nullable=False)
    alterado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    alterado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    observacao = db.Column(db.String(200), nullable=True)

    item = db.relationship('Item', backref=db.backref('historico_precos', lazy='dynamic'))
    alterado_por = db.relationship('Usuario')

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
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)

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
    arquivada = db.Column(db.Boolean, nullable=False, default=False)
    arquivada_em = db.Column(db.DateTime, nullable=True)
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
    serialize_rules = ('-fornecedores.listas', '-colaboradores.listas_atribuidas')

    id = db.Column(db.Integer, primary_key=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), nullable=False, index=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    descricao = db.Column(db.String(255), nullable=True)
    data_criacao = db.Column(db.DateTime, nullable=False, default=utc_now)
    deletado = db.Column(db.Boolean, nullable=False, default=False)
    data_delecao = db.Column(db.DateTime, nullable=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='SET NULL'), nullable=True, index=True)
    restaurante = db.relationship('Restaurante')
    area = db.relationship('Area', backref=db.backref('listas', lazy='dynamic'))
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
    __table_args__ = (
        db.UniqueConstraint('restaurante_id', 'nome', name='uq_lista_mae_restaurante_nome'),
    )

    id = db.Column(db.Integer, primary_key=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), nullable=False, index=True)
    nome = db.Column(db.String(255), nullable=False)
    unidade = db.Column(db.String(50), nullable=False, default='un', server_default='un')
    criado_em = db.Column(db.DateTime, default=utc_now)
    atualizado_em = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    restaurante = db.relationship('Restaurante')

    def to_dict(self):
        """Serializa o item do catálogo global."""
        return {
            "id": self.id,
            "restaurante_id": self.restaurante_id,
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

    # Configuração de threshold/fardo
    usa_threshold = db.Column(db.Boolean, default=False, nullable=False)
    quantidade_por_fardo = db.Column(db.Float, default=1.0, nullable=False)

    # Relacionamentos
    lista = db.relationship('Lista', backref=db.backref('item_refs', lazy='dynamic', cascade='all, delete-orphan'))
    item = db.relationship('ListaMaeItem', backref=db.backref('lista_refs', lazy='dynamic'))

    def get_pedido(self):
        """
        Calcula o pedido:
        - Se qtd_atual < qtd_minima: pede quantidade_por_fardo
        - Senão: pede 0 (inclui o caso em que qtd_atual == qtd_minima)
        """
        if self.quantidade_atual < self.quantidade_minima:
            return self.quantidade_por_fardo
        return 0

    def to_dict(self):
        """Serializa a referência com dados do item e cálculo de pedido."""
        d = {
            "lista_id": self.lista_id,
            "item_id": self.item_id,
            "quantidade_atual": self.quantidade_atual,
            "quantidade_minima": self.quantidade_minima,
            "pedido": self.get_pedido(),
            "usa_threshold": self.usa_threshold,
            "quantidade_por_fardo": self.quantidade_por_fardo,
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


class NavbarPreference(db.Model, SerializerMixin):
    """
    Armazena preferências de visualização da navbar para cada usuário.
    Estado de expansão/colapso das categorias do menu.
    """
    __tablename__ = "navbar_preferences"
    
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False, unique=True)
    categorias_estado = db.Column(db.JSON, nullable=False, default=dict)
    criado_em = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
    
    # Relacionamento
    usuario = db.relationship('Usuario', backref=db.backref('navbar_preference', uselist=False, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "categorias_estado": self.categorias_estado or {},
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None
        }


class NavbarLayout(db.Model, SerializerMixin):
    """
    Armazena o layout global da navbar (ordem, categorias e itens ocultos).
    """
    __tablename__ = "navbar_layouts"

    id = db.Column(db.Integer, primary_key=True)
    layout = db.Column(db.JSON, nullable=False, default=dict)
    criado_em = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)

    def to_dict(self):
        return {
            "id": self.id,
            "layout": self.layout or {},
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None
        }


class NavbarActivity(db.Model, SerializerMixin):
    """
    Registra o histórico dos botões acessados recentemente pelo usuário.
    """
    __tablename__ = "navbar_activities"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    item_key = db.Column(db.String(80), nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)

    usuario = db.relationship("Usuario", backref=db.backref("navbar_activities", lazy="dynamic"))

    __table_args__ = (
        db.UniqueConstraint("usuario_id", "item_key", name="uq_navbar_activity_user_item"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "item_key": self.item_key,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None
        }


class SugestaoStatus(enum.Enum):
    PENDENTE = "pendente"
    APROVADA = "aprovada"
    REJEITADA = "rejeitada"


class SugestaoItem(db.Model, SerializerMixin):
    """
    Armazena sugestões de novos itens feitas pelos usuários.
    Admin pode aprovar (adiciona ao catálogo global) ou rejeitar.
    """
    __tablename__ = "sugestoes_itens"
    
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    lista_id = db.Column(db.Integer, db.ForeignKey('listas.id', ondelete='CASCADE'), nullable=True)  # Agora nullable
    lista_rapida_id = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id', ondelete='CASCADE'), nullable=True)  # NOVO
    nome_item = db.Column(db.String(200), nullable=False)
    unidade = db.Column(db.String(50), nullable=False)
    quantidade = db.Column(db.Float, nullable=False)
    mensagem_usuario = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(SugestaoStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=SugestaoStatus.PENDENTE)
    admin_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    mensagem_admin = db.Column(db.Text, nullable=True)
    item_global_id = db.Column(db.Integer, db.ForeignKey('lista_mae_itens.id', ondelete='SET NULL'), nullable=True)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    respondido_em = db.Column(db.DateTime, nullable=True)
    
    # Relacionamentos
    usuario = db.relationship('Usuario', foreign_keys=[usuario_id], backref=db.backref('sugestoes', lazy='dynamic'))
    admin = db.relationship('Usuario', foreign_keys=[admin_id])
    lista = db.relationship('Lista', backref=db.backref('sugestoes_itens', lazy='dynamic'))
    lista_rapida = db.relationship('ListaRapida', backref=db.backref('sugestoes_itens', lazy='dynamic'))  # NOVO
    item_global = db.relationship('ListaMaeItem', backref=db.backref('sugestoes', lazy='dynamic'))
    
    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "usuario_nome": self.usuario.nome if self.usuario else None,
            "lista_id": self.lista_id,
            "lista_nome": self.lista.nome if self.lista else None,
            "lista_rapida_id": self.lista_rapida_id,  # NOVO
            "lista_rapida_nome": self.lista_rapida.nome if self.lista_rapida else None,  # NOVO
            "nome_item": self.nome_item,
            "unidade": self.unidade,
            "quantidade": self.quantidade,
            "mensagem_usuario": self.mensagem_usuario,
            "status": self.status.value,
            "admin_id": self.admin_id,
            "admin_nome": self.admin.nome if self.admin else None,
            "mensagem_admin": self.mensagem_admin,
            "item_global_id": self.item_global_id,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "respondido_em": self.respondido_em.isoformat() if self.respondido_em else None
        }


# ===== LISTA RÁPIDA =====

class PrioridadeItem(enum.Enum):
    PREVENCAO = "prevencao"
    PRECISA_COMPRAR = "precisa_comprar"
    URGENTE = "urgente"


# ===== CHECKLISTS DE COMPRAS =====

class ChecklistStatus(enum.Enum):
    ATIVO = "ATIVO"
    FINALIZADO = "FINALIZADO"


class Checklist(db.Model, SerializerMixin):
    """
    Checklist de compras gerado a partir de submissões aprovadas ou listas rápidas.
    Permite ao admin marcar itens durante as compras.
    """
    __tablename__ = 'checklists'

    serialize_rules = ('-itens.checklist', '-submissao.checklists')

    id = db.Column(db.Integer, primary_key=True)
    submissao_id = db.Column(db.Integer, db.ForeignKey('submissoes.id', ondelete='CASCADE'), nullable=True)
    nome = db.Column(db.String(200), nullable=False)
    status = db.Column(db.Enum(ChecklistStatus), nullable=False, default=ChecklistStatus.ATIVO)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    finalizado_em = db.Column(db.DateTime, nullable=True)

    # Relationships
    submissao = db.relationship('Submissao', backref=db.backref('checklists', lazy='dynamic'))
    itens = db.relationship('ChecklistItem', back_populates='checklist', lazy='dynamic', cascade='all, delete-orphan')


class ChecklistItem(db.Model, SerializerMixin):
    """
    Item individual de um checklist de compras.
    Armazena snapshot dos dados do pedido no momento da conversão.
    """
    __tablename__ = 'checklist_itens'

    serialize_rules = ('-checklist.itens',)

    id = db.Column(db.Integer, primary_key=True)
    checklist_id = db.Column(db.Integer, db.ForeignKey('checklists.id', ondelete='CASCADE'), nullable=False)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id', ondelete='SET NULL'), nullable=True)

    # Dados desnormalizados (snapshot no momento da conversão)
    item_nome = db.Column(db.String(200), nullable=False)
    quantidade = db.Column(db.Numeric(10, 2), nullable=True)
    unidade = db.Column(db.String(50), nullable=True)
    fornecedor_nome = db.Column(db.String(100), nullable=True)
    observacao = db.Column(db.Text, nullable=True)

    # Estado do checklist
    marcado = db.Column(db.Boolean, default=False, nullable=False)
    marcado_em = db.Column(db.DateTime, nullable=True)

    # Relationships
    checklist = db.relationship('Checklist', back_populates='itens')
    pedido = db.relationship('Pedido')


# ===== POPs DIARIOS =====

class TipoVerificacao(enum.Enum):
    CHECKBOX = "checkbox"
    MEDICAO = "medicao"
    TEMPERATURA = "temperatura"
    FOTO = "foto"
    TEXTO = "texto"


class CriticidadeTarefa(enum.Enum):
    BAIXA = "baixa"
    NORMAL = "normal"
    ALTA = "alta"
    CRITICA = "critica"


class RecorrenciaLista(enum.Enum):
    DIARIA = "diaria"
    SEMANAL = "semanal"
    MENSAL = "mensal"
    SOB_DEMANDA = "sob_demanda"


class StatusExecucao(enum.Enum):
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    PARCIAL = "parcial"


class POPConfiguracao(db.Model, SerializerMixin):
    """Configuracoes globais do POP por restaurante."""
    __tablename__ = "pop_configuracoes"

    id = db.Column(db.Integer, primary_key=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='CASCADE'), nullable=False, unique=True)
    auto_arquivar = db.Column(db.Boolean, default=True, nullable=False)
    periodo_arquivamento_dias = db.Column(db.Integer, default=7, nullable=False)
    hora_execucao_arquivamento = db.Column(db.Time, nullable=True)
    ultimo_auto_arquivamento_em = db.Column(db.DateTime, nullable=True)

    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now, nullable=False)

    restaurante = db.relationship('Restaurante')

    def to_dict(self):
        return {
            "id": self.id,
            "restaurante_id": self.restaurante_id,
            "auto_arquivar": self.auto_arquivar,
            "periodo_arquivamento_dias": self.periodo_arquivamento_dias,
            "hora_execucao_arquivamento": self.hora_execucao_arquivamento.isoformat() if self.hora_execucao_arquivamento else None,
            "ultimo_auto_arquivamento_em": self.ultimo_auto_arquivamento_em.isoformat() if self.ultimo_auto_arquivamento_em else None,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None
        }


class POPCategoria(db.Model, SerializerMixin):
    """Categorias de POPs (Abertura, Fechamento, etc.)."""
    __tablename__ = "pop_categorias"

    id = db.Column(db.Integer, primary_key=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='CASCADE'), nullable=False, index=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    icone = db.Column(db.String(50), nullable=True)
    cor = db.Column(db.String(20), nullable=True)
    ordem = db.Column(db.Integer, default=0, nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)

    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now, nullable=False)

    restaurante = db.relationship('Restaurante')

    __table_args__ = (
        db.UniqueConstraint('restaurante_id', 'nome', name='uq_pop_categorias_restaurante_nome'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "restaurante_id": self.restaurante_id,
            "nome": self.nome,
            "descricao": self.descricao,
            "icone": self.icone,
            "cor": self.cor,
            "ordem": self.ordem,
            "ativo": self.ativo,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None
        }


class POPTemplate(db.Model, SerializerMixin):
    """Template master de tarefas POP."""
    __tablename__ = "pop_templates"

    id = db.Column(db.Integer, primary_key=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='CASCADE'), nullable=False, index=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey('pop_categorias.id', ondelete='SET NULL'), nullable=True, index=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='SET NULL'), nullable=True, index=True)

    titulo = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    instrucoes = db.Column(db.Text, nullable=True)

    tipo_verificacao = db.Column(db.Enum(TipoVerificacao, values_callable=lambda x: [e.value for e in x]),
                                 nullable=False, default=TipoVerificacao.CHECKBOX)
    requer_foto = db.Column(db.Boolean, default=False, nullable=False)
    requer_medicao = db.Column(db.Boolean, default=False, nullable=False)
    rapida = db.Column(db.Boolean, default=False, nullable=False)
    unidade_medicao = db.Column(db.String(50), nullable=True)
    valor_minimo = db.Column(db.Numeric(10, 2), nullable=True)
    valor_maximo = db.Column(db.Numeric(10, 2), nullable=True)

    criticidade = db.Column(db.Enum(CriticidadeTarefa, values_callable=lambda x: [e.value for e in x]),
                            nullable=False, default=CriticidadeTarefa.NORMAL)
    tempo_estimado = db.Column(db.Integer, nullable=True)
    ordem = db.Column(db.Integer, default=0, nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)

    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now, nullable=False)

    restaurante = db.relationship('Restaurante')
    categoria = db.relationship('POPCategoria')
    area = db.relationship('Area')
    criado_por = db.relationship('Usuario')

    __table_args__ = (
        db.UniqueConstraint('restaurante_id', 'titulo', name='uq_pop_templates_restaurante_titulo'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "restaurante_id": self.restaurante_id,
            "categoria_id": self.categoria_id,
            "categoria_nome": self.categoria.nome if self.categoria else None,
            "area_id": self.area_id,
            "area_nome": self.area.nome if self.area else None,
            "titulo": self.titulo,
            "descricao": self.descricao,
            "instrucoes": self.instrucoes,
            "tipo_verificacao": self.tipo_verificacao.value if self.tipo_verificacao else None,
            "requer_foto": self.requer_foto,
            "requer_medicao": self.requer_medicao,
            "rapida": self.rapida,
            "unidade_medicao": self.unidade_medicao,
            "valor_minimo": float(self.valor_minimo) if self.valor_minimo is not None else None,
            "valor_maximo": float(self.valor_maximo) if self.valor_maximo is not None else None,
            "criticidade": self.criticidade.value if self.criticidade else None,
            "tempo_estimado": self.tempo_estimado,
            "ordem": self.ordem,
            "ativo": self.ativo,
            "criado_por_id": self.criado_por_id,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None
        }


pop_lista_colaboradores = db.Table(
    'pop_lista_colaboradores',
    db.Column('lista_id', db.Integer, db.ForeignKey('pop_listas.id', ondelete='CASCADE'), primary_key=True),
    db.Column('usuario_id', db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), primary_key=True),
    db.Column('criado_em', db.DateTime, default=brasilia_now, nullable=False)
)


class POPLista(db.Model, SerializerMixin):
    """Lista de POPs."""
    __tablename__ = "pop_listas"

    id = db.Column(db.Integer, primary_key=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='CASCADE'), nullable=False, index=True)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='SET NULL'), nullable=True, index=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey('pop_categorias.id', ondelete='SET NULL'), nullable=True, index=True)

    nome = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)

    recorrencia = db.Column(db.Enum(RecorrenciaLista, values_callable=lambda x: [e.value for e in x]),
                            nullable=False, default=RecorrenciaLista.DIARIA)
    dias_semana = db.Column(db.String(50), nullable=True)
    horario_sugerido = db.Column(db.Time, nullable=True)
    publico = db.Column(db.Boolean, default=False, nullable=False)

    tempo_estimado_total = db.Column(db.Integer, nullable=True)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    deletado = db.Column(db.Boolean, default=False, nullable=False)

    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now, nullable=False)

    restaurante = db.relationship('Restaurante')
    area = db.relationship('Area')
    categoria = db.relationship('POPCategoria')
    criado_por = db.relationship('Usuario')
    colaboradores = db.relationship('Usuario', secondary=pop_lista_colaboradores,
                                    lazy='dynamic', backref=db.backref('pop_listas_atribuidas', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('restaurante_id', 'nome', name='uq_pop_listas_restaurante_nome'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "restaurante_id": self.restaurante_id,
            "area_id": self.area_id,
            "area_nome": self.area.nome if self.area else None,
            "categoria_id": self.categoria_id,
            "categoria_nome": self.categoria.nome if self.categoria else None,
            "nome": self.nome,
            "descricao": self.descricao,
            "recorrencia": self.recorrencia.value if self.recorrencia else None,
            "dias_semana": self.dias_semana,
            "horario_sugerido": self.horario_sugerido.isoformat() if self.horario_sugerido else None,
            "publico": self.publico,
            "tempo_estimado_total": self.tempo_estimado_total,
            "ativo": self.ativo,
            "deletado": self.deletado,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None,
            "total_tarefas": self.tarefas.count() if hasattr(self, 'tarefas') else 0,
            "total_colaboradores": self.colaboradores.count() if hasattr(self.colaboradores, 'count') else None
        }


class POPListaTarefa(db.Model, SerializerMixin):
    """Relacionamento entre lista e templates."""
    __tablename__ = "pop_lista_tarefas"

    id = db.Column(db.Integer, primary_key=True)
    lista_id = db.Column(db.Integer, db.ForeignKey('pop_listas.id', ondelete='CASCADE'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('pop_templates.id', ondelete='CASCADE'), nullable=False)

    ordem = db.Column(db.Integer, default=0, nullable=False)
    obrigatoria = db.Column(db.Boolean, default=True, nullable=False)
    requer_foto_override = db.Column(db.Boolean, nullable=True)
    requer_medicao_override = db.Column(db.Boolean, nullable=True)

    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)

    lista = db.relationship('POPLista', backref=db.backref('tarefas', lazy='dynamic', cascade='all, delete-orphan'))
    template = db.relationship('POPTemplate')

    __table_args__ = (
        db.UniqueConstraint('lista_id', 'template_id', name='uq_pop_lista_tarefas_lista_template'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "lista_id": self.lista_id,
            "template_id": self.template_id,
            "ordem": self.ordem,
            "obrigatoria": self.obrigatoria,
            "requer_foto_override": self.requer_foto_override,
            "requer_medicao_override": self.requer_medicao_override,
            "template": self.template.to_dict() if self.template else None
        }


class POPExecucao(db.Model, SerializerMixin):
    """Execucao de uma lista POP."""
    __tablename__ = "pop_execucoes"

    id = db.Column(db.Integer, primary_key=True)
    lista_id = db.Column(db.Integer, db.ForeignKey('pop_listas.id', ondelete='CASCADE'), nullable=False, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False, index=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='CASCADE'), nullable=False, index=True)

    iniciado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    finalizado_em = db.Column(db.DateTime, nullable=True)
    data_referencia = db.Column(db.Date, nullable=False, index=True)

    status = db.Column(db.Enum(StatusExecucao, values_callable=lambda x: [e.value for e in x]),
                       nullable=False, default=StatusExecucao.EM_ANDAMENTO)
    progresso = db.Column(db.Integer, default=0, nullable=False)
    total_tarefas = db.Column(db.Integer, default=0, nullable=False)
    tarefas_concluidas = db.Column(db.Integer, default=0, nullable=False)
    tarefas_com_desvio = db.Column(db.Integer, default=0, nullable=False)

    assinatura_digital = db.Column(db.Text, nullable=True)
    observacoes = db.Column(db.Text, nullable=True)

    revisado = db.Column(db.Boolean, default=False, nullable=False)
    revisado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    revisado_em = db.Column(db.DateTime, nullable=True)
    observacoes_revisao = db.Column(db.Text, nullable=True)

    arquivado = db.Column(db.Boolean, default=False, nullable=False)
    arquivado_em = db.Column(db.DateTime, nullable=True)
    arquivado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)

    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now, nullable=False)

    lista = db.relationship('POPLista')
    usuario = db.relationship('Usuario', foreign_keys=[usuario_id])
    revisado_por = db.relationship('Usuario', foreign_keys=[revisado_por_id])
    arquivado_por = db.relationship('Usuario', foreign_keys=[arquivado_por_id])
    restaurante = db.relationship('Restaurante')

    def to_dict(self, include_itens=False):
        data = {
            "id": self.id,
            "lista_id": self.lista_id,
            "lista_nome": self.lista.nome if self.lista else None,
            "usuario_id": self.usuario_id,
            "usuario_nome": self.usuario.nome if self.usuario else None,
            "restaurante_id": self.restaurante_id,
            "iniciado_em": self.iniciado_em.isoformat() if self.iniciado_em else None,
            "finalizado_em": self.finalizado_em.isoformat() if self.finalizado_em else None,
            "data_referencia": self.data_referencia.isoformat() if self.data_referencia else None,
            "status": self.status.value if self.status else None,
            "progresso": self.progresso,
            "total_tarefas": self.total_tarefas,
            "tarefas_concluidas": self.tarefas_concluidas,
            "tarefas_com_desvio": self.tarefas_com_desvio,
            "assinatura_digital": self.assinatura_digital,
            "observacoes": self.observacoes,
            "revisado": self.revisado,
            "revisado_por_id": self.revisado_por_id,
            "revisado_em": self.revisado_em.isoformat() if self.revisado_em else None,
            "observacoes_revisao": self.observacoes_revisao,
            "arquivado": self.arquivado,
            "arquivado_em": self.arquivado_em.isoformat() if self.arquivado_em else None,
            "arquivado_por_id": self.arquivado_por_id,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None
        }
        if include_itens:
            data["itens"] = [item.to_dict() for item in self.itens.order_by(POPExecucaoItem.ordem.asc()).all()]
        return data


class POPExecucaoItem(db.Model, SerializerMixin):
    """Item executado em uma execucao POP."""
    __tablename__ = "pop_execucao_itens"

    id = db.Column(db.Integer, primary_key=True)
    execucao_id = db.Column(db.Integer, db.ForeignKey('pop_execucoes.id', ondelete='CASCADE'), nullable=False, index=True)
    template_id = db.Column(db.Integer, db.ForeignKey('pop_templates.id', ondelete='CASCADE'), nullable=False, index=True)
    lista_tarefa_id = db.Column(db.Integer, db.ForeignKey('pop_lista_tarefas.id', ondelete='SET NULL'), nullable=True)

    titulo = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    tipo_verificacao = db.Column(db.Enum(TipoVerificacao, values_callable=lambda x: [e.value for e in x]), nullable=True)

    concluido = db.Column(db.Boolean, default=False, nullable=False)
    concluido_em = db.Column(db.DateTime, nullable=True)

    valor_medido = db.Column(db.Numeric(10, 2), nullable=True)
    unidade_medicao = db.Column(db.String(50), nullable=True)
    dentro_padrao = db.Column(db.Boolean, nullable=True)

    foto_url = db.Column(db.String(500), nullable=True)
    foto_path = db.Column(db.String(500), nullable=True)

    observacoes = db.Column(db.Text, nullable=True)
    tem_desvio = db.Column(db.Boolean, default=False, nullable=False)
    descricao_desvio = db.Column(db.Text, nullable=True)
    acao_corretiva = db.Column(db.Text, nullable=True)

    ordem = db.Column(db.Integer, default=0, nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now, nullable=False)

    execucao = db.relationship('POPExecucao', backref=db.backref('itens', lazy='dynamic', cascade='all, delete-orphan'))
    template = db.relationship('POPTemplate')
    lista_tarefa = db.relationship('POPListaTarefa')

    def to_dict(self):
        return {
            "id": self.id,
            "execucao_id": self.execucao_id,
            "template_id": self.template_id,
            "lista_tarefa_id": self.lista_tarefa_id,
            "titulo": self.titulo,
            "descricao": self.descricao,
            "tipo_verificacao": self.tipo_verificacao.value if self.tipo_verificacao else None,
            "concluido": self.concluido,
            "concluido_em": self.concluido_em.isoformat() if self.concluido_em else None,
            "valor_medido": float(self.valor_medido) if self.valor_medido is not None else None,
            "unidade_medicao": self.unidade_medicao,
            "dentro_padrao": self.dentro_padrao,
            "foto_url": self.foto_url,
            "observacoes": self.observacoes,
            "tem_desvio": self.tem_desvio,
            "descricao_desvio": self.descricao_desvio,
            "acao_corretiva": self.acao_corretiva,
            "ordem": self.ordem
        }


class StatusListaRapida(enum.Enum):
    RASCUNHO = "rascunho"
    PENDENTE = "pendente"
    APROVADA = "aprovada"
    REJEITADA = "rejeitada"


class ListaRapida(db.Model, SerializerMixin):
    """
    Lista rápida para compras emergenciais.
    Colaborador seleciona itens do catálogo global com prioridades.
    """
    __tablename__ = 'listas_rapidas'
    
    serialize_rules = ('-itens.lista_rapida', '-usuario.listas_rapidas', '-admin.listas_rapidas_aprovadas')
    
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    nome = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(StatusListaRapida, values_callable=lambda x: [e.value for e in x]), 
                       nullable=False, default=StatusListaRapida.RASCUNHO)
    admin_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    mensagem_admin = db.Column(db.Text, nullable=True)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    submetido_em = db.Column(db.DateTime, nullable=True)
    respondido_em = db.Column(db.DateTime, nullable=True)
    arquivada = db.Column(db.Boolean, nullable=False, default=False)
    arquivada_em = db.Column(db.DateTime, nullable=True)
    deletado = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relacionamentos
    usuario = db.relationship('Usuario', foreign_keys=[usuario_id], backref=db.backref('listas_rapidas', lazy='dynamic'))
    admin = db.relationship('Usuario', foreign_keys=[admin_id], backref=db.backref('listas_rapidas_aprovadas', lazy='dynamic'))
    itens = db.relationship('ListaRapidaItem', back_populates='lista_rapida', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "usuario_nome": self.usuario.nome if self.usuario else None,
            "nome": self.nome,
            "descricao": self.descricao,
            "status": self.status.value,
            "admin_id": self.admin_id,
            "admin_nome": self.admin.nome if self.admin else None,
            "mensagem_admin": self.mensagem_admin,
            "total_itens": self.itens.count(),
            "itens_urgentes": self.itens.filter_by(prioridade=PrioridadeItem.URGENTE).count(),
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "submetido_em": self.submetido_em.isoformat() if self.submetido_em else None,
            "respondido_em": self.respondido_em.isoformat() if self.respondido_em else None,
            "arquivada": self.arquivada,
            "arquivada_em": self.arquivada_em.isoformat() if self.arquivada_em else None
        }


class ListaRapidaItem(db.Model, SerializerMixin):
    """
    Item de uma lista rápida com prioridade.
    """
    __tablename__ = 'listas_rapidas_itens'
    
    serialize_rules = ('-lista_rapida.itens', '-item_global.listas_rapidas_refs')
    
    id = db.Column(db.Integer, primary_key=True)
    lista_rapida_id = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id', ondelete='CASCADE'), nullable=False)
    item_global_id = db.Column(db.Integer, db.ForeignKey('lista_mae_itens.id', ondelete='CASCADE'), nullable=True)
    item_nome_temp = db.Column(db.String(200), nullable=True)  # Nome do item temporário
    item_unidade_temp = db.Column(db.String(50), nullable=True)  # Unidade do item temporário
    prioridade = db.Column(db.Enum(PrioridadeItem, values_callable=lambda x: [e.value for e in x]),
                          nullable=False, default=PrioridadeItem.PRECISA_COMPRAR)
    observacao = db.Column(db.Text, nullable=True)
    descartado = db.Column(db.Boolean, default=False, nullable=False)  # Item marcado como suficiente/descartado
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    
    # Relacionamentos
    lista_rapida = db.relationship('ListaRapida', back_populates='itens')
    item_global = db.relationship('ListaMaeItem', backref=db.backref('listas_rapidas_refs', lazy='dynamic'))
    
    def to_dict(self):
        # Se é item temporário, usar campos temp, senão usar item_global
        item_nome = self.item_nome_temp if self.item_nome_temp else (self.item_global.nome if self.item_global else None)
        item_unidade = self.item_unidade_temp if self.item_unidade_temp else (self.item_global.unidade if self.item_global else None)

        return {
            "id": self.id,
            "lista_rapida_id": self.lista_rapida_id,
            "item_global_id": self.item_global_id,
            "item_nome": item_nome,
            "item_unidade": item_unidade,
            "is_temporario": self.item_nome_temp is not None,  # Flag indicando se é item temporário
            "prioridade": self.prioridade.value,
            "observacao": self.observacao,
            "descartado": self.descartado,  # Item marcado como descartado/suficiente
            "criado_em": self.criado_em.isoformat() if self.criado_em else None
        }


class TipoNotificacao(enum.Enum):
    """Tipos de notificação do sistema."""
    SUBMISSAO_LISTA = "submissao_lista"  # Nova submissão de lista
    SUBMISSAO_LISTA_RAPIDA = "submissao_lista_rapida"  # Nova lista rápida submetida
    SUGESTAO_ITEM = "sugestao_item"  # Nova sugestão de item
    LISTA_APROVADA = "lista_aprovada"  # Lista aprovada
    LISTA_REJEITADA = "lista_rejeitada"  # Lista rejeitada
    ITEM_SUGERIDO_APROVADO = "item_sugerido_aprovado"  # Sugestão aprovada
    ITEM_SUGERIDO_REJEITADO = "item_sugerido_rejeitado"  # Sugestão rejeitada
    PEDIDO_APROVADO = "pedido_aprovado"  # Pedido aprovado
    PEDIDO_REJEITADO = "pedido_rejeitado"  # Pedido rejeitado
    SOLICITACAO_RESTAURANTE = "solicitacao_restaurante"  # Nova solicitação de restaurante


class Notificacao(db.Model, SerializerMixin):
    """Notificações do sistema para admins e usuários."""
    __tablename__ = 'notificacoes'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True, index=True)
    titulo = db.Column(db.String(255), nullable=False)
    mensagem = db.Column(db.Text, nullable=True)
    tipo = db.Column(db.Enum(TipoNotificacao, values_callable=lambda x: [e.value for e in x]), nullable=False)
    lida = db.Column(db.Boolean, default=False, nullable=False)
    
    # Links para recursos relacionados (opcional)
    lista_id = db.Column(db.Integer, db.ForeignKey('listas.id', ondelete='SET NULL'), nullable=True)
    lista_rapida_id = db.Column(db.Integer, db.ForeignKey('listas_rapidas.id', ondelete='SET NULL'), nullable=True)
    submissao_id = db.Column(db.Integer, db.ForeignKey('submissoes.id', ondelete='SET NULL'), nullable=True)
    sugestao_id = db.Column(db.Integer, db.ForeignKey('sugestoes_itens.id', ondelete='SET NULL'), nullable=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id', ondelete='SET NULL'), nullable=True)
    
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    lido_em = db.Column(db.DateTime, nullable=True)
    
    # Relacionamentos
    usuario = db.relationship('Usuario', backref=db.backref('notificacoes', lazy='dynamic'))
    restaurante = db.relationship('Restaurante', backref=db.backref('notificacoes', lazy='dynamic'))

    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "restaurante_id": self.restaurante_id,
            "titulo": self.titulo,
            "mensagem": self.mensagem,
            "tipo": self.tipo.value,
            "lida": self.lida,
            "lista_id": self.lista_id,
            "lista_rapida_id": self.lista_rapida_id,
            "submissao_id": self.submissao_id,
            "sugestao_id": self.sugestao_id,
            "pedido_id": self.pedido_id,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "lido_em": self.lido_em.isoformat() if self.lido_em else None
        }


class AppLog(db.Model, SerializerMixin):
    """Logs de auditoria do sistema."""
    __tablename__ = 'app_logs'

    id = db.Column(db.Integer, primary_key=True)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False, index=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    impersonator_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True, index=True)

    acao = db.Column(db.String(50), nullable=False, index=True)
    entidade = db.Column(db.String(50), nullable=True, index=True)
    entidade_id = db.Column(db.Integer, nullable=True, index=True)
    mensagem = db.Column(db.String(255), nullable=True)
    meta = db.Column(db.JSON, nullable=False, default=dict, server_default='{}')
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)

    restaurante = db.relationship('Restaurante')
    usuario = db.relationship('Usuario', foreign_keys=[usuario_id])
    impersonator = db.relationship('Usuario', foreign_keys=[impersonator_id])

    def to_dict(self):
        return {
            "id": self.id,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "restaurante_id": self.restaurante_id,
            "usuario_id": self.usuario_id,
            "impersonator_id": self.impersonator_id,
            "acao": self.acao,
            "entidade": self.entidade,
            "entidade_id": self.entidade_id,
            "mensagem": self.mensagem,
            "metadata": self.meta,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
        }


class ConviteToken(db.Model, SerializerMixin):
    """
    Tokens de convite para registro de usuários.
    Permite que admins gere links únicos de convite com role específico.
    """
    __tablename__ = 'convite_tokens'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # Role que será atribuído ao convidado
    role = db.Column(db.Enum(UserRoles), nullable=False)

    # Rastreabilidade
    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)

    # Status de uso
    usado = db.Column(db.Boolean, default=False, nullable=False)
    usado_em = db.Column(db.DateTime, nullable=True)
    usado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)

    # Expiração (opcional - pode adicionar depois)
    expira_em = db.Column(db.DateTime, nullable=True)

    # Relacionamentos
    criado_por = db.relationship('Usuario', foreign_keys=[criado_por_id], backref=db.backref('convites_criados', lazy='dynamic'))
    usado_por = db.relationship('Usuario', foreign_keys=[usado_por_id], backref=db.backref('convite_usado', uselist=False))
    restaurante = db.relationship('Restaurante', backref=db.backref('convites', lazy='dynamic'))

    @staticmethod
    def gerar_token():
        """Gera um token UUID único."""
        from uuid import uuid4
        return str(uuid4())

    def esta_valido(self):
        """Verifica se o token ainda é válido."""
        if self.usado:
            return False

        if self.expira_em:
            agora = brasilia_now()
            expira = self.expira_em
            # Se expira_em for naive, assume timezone de Brasília
            if expira.tzinfo is None:
                expira = expira.replace(tzinfo=BRASILIA_TZ)
            if agora > expira:
                return False

        return True

    def to_dict(self):
        """Serializa o convite para JSON."""
        return {
            "id": self.id,
            "token": self.token,
            "role": self.role.value,
            "criado_por_id": self.criado_por_id,
            "criado_por_nome": self.criado_por.nome if self.criado_por else None,
            "restaurante_id": self.restaurante_id,
            "restaurante_nome": self.restaurante.nome if self.restaurante else None,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "usado": self.usado,
            "usado_em": self.usado_em.isoformat() if self.usado_em else None,
            "usado_por_id": self.usado_por_id,
            "usado_por_nome": self.usado_por.nome if self.usado_por else None,
            "usado_por_email": self.usado_por.email if self.usado_por else None,
            "expira_em": self.expira_em.isoformat() if self.expira_em else None
        }


class ConviteRestaurante(db.Model, SerializerMixin):
    """Tokens de convite para cadastro imediato de restaurantes."""
    __tablename__ = 'convite_restaurantes'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)

    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    expira_em = db.Column(db.DateTime, nullable=True)

    usado = db.Column(db.Boolean, default=False, nullable=False)
    usado_em = db.Column(db.DateTime, nullable=True)
    usado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)

    # Controle de múltiplos usos
    limite_usos = db.Column(db.Integer, default=1, nullable=False)  # 1-100
    quantidade_usos = db.Column(db.Integer, default=0, nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)  # Para pausar/despausar

    criado_por = db.relationship(
        'Usuario',
        foreign_keys=[criado_por_id],
        backref=db.backref('convites_restaurante_criados', lazy='dynamic')
    )
    usado_por = db.relationship(
        'Usuario',
        foreign_keys=[usado_por_id],
        backref=db.backref('convite_restaurante_usado', uselist=False)
    )
    restaurante = db.relationship(
        'Restaurante',
        backref=db.backref('convites_restaurante', lazy='dynamic')
    )

    @staticmethod
    def gerar_token():
        """Gera um token UUID único."""
        from uuid import uuid4
        return str(uuid4())

    def esta_valido(self):
        """Verifica se o token ainda é válido."""
        # Verifica se está pausado
        if not self.ativo:
            return False
        # Verifica se atingiu o limite de usos
        if self.quantidade_usos >= self.limite_usos:
            return False
        if self.expira_em:
            agora = brasilia_now()
            expira = self.expira_em
            # Se expira_em for naive, assume timezone de Brasília
            if expira.tzinfo is None:
                expira = expira.replace(tzinfo=BRASILIA_TZ)
            if agora > expira:
                return False
        return True

    @property
    def usos_restantes(self):
        """Retorna quantos usos ainda restam."""
        return max(0, self.limite_usos - self.quantidade_usos)

    def to_dict(self):
        return {
            "id": self.id,
            "token": self.token,
            "criado_por_id": self.criado_por_id,
            "criado_por_nome": self.criado_por.nome if self.criado_por else None,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "expira_em": self.expira_em.isoformat() if self.expira_em else None,
            "usado": self.quantidade_usos >= self.limite_usos,  # Calculado dinamicamente
            "usado_em": self.usado_em.isoformat() if self.usado_em else None,
            "usado_por_id": self.usado_por_id,
            "usado_por_nome": self.usado_por.nome if self.usado_por else None,
            "usado_por_email": self.usado_por.email if self.usado_por else None,
            "restaurante_id": self.restaurante_id,
            "restaurante_nome": self.restaurante.nome if self.restaurante else None,
            "limite_usos": self.limite_usos,
            "quantidade_usos": self.quantidade_usos,
            "usos_restantes": self.usos_restantes,
            "ativo": self.ativo,
        }


class SolicitacaoRestaurante(db.Model, SerializerMixin):
    """Solicitações de cadastro de novos restaurantes via formulário público."""
    __tablename__ = 'solicitacoes_restaurante'

    id = db.Column(db.Integer, primary_key=True)

    # Dados do restaurante
    nome_restaurante = db.Column(db.String(200), nullable=False)
    endereco_restaurante = db.Column(db.String(400), nullable=False)
    telefone_restaurante = db.Column(db.String(20), nullable=False)
    email_restaurante = db.Column(db.String(120), nullable=False)
    cnpj = db.Column(db.String(18), nullable=True)
    razao_social = db.Column(db.String(200), nullable=True)

    # Dados do responsável
    nome_responsavel = db.Column(db.String(100), nullable=False)
    email_responsavel = db.Column(db.String(120), nullable=False)
    telefone_responsavel = db.Column(db.String(20), nullable=False)

    # Controle
    status = db.Column(db.Enum(StatusSolicitacaoRestaurante), nullable=False,
                      default=StatusSolicitacaoRestaurante.PENDENTE)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    processado_em = db.Column(db.DateTime, nullable=True)
    processado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)

    # Resultado
    motivo_rejeicao = db.Column(db.Text, nullable=True)
    restaurante_criado_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)
    usuario_admin_criado_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    senha_gerada = db.Column(db.String(20), nullable=True)

    # Relacionamentos
    processado_por = db.relationship('Usuario', foreign_keys=[processado_por_id],
                                     backref=db.backref('solicitacoes_processadas', lazy='dynamic'))
    restaurante_criado = db.relationship('Restaurante', foreign_keys=[restaurante_criado_id],
                                        backref=db.backref('solicitacao_origem', uselist=False))
    usuario_admin_criado = db.relationship('Usuario', foreign_keys=[usuario_admin_criado_id],
                                          backref=db.backref('solicitacao_origem', uselist=False))

    def to_dict(self):
        """Serializa a solicitação para JSON."""
        return {
            "id": self.id,
            "nome_restaurante": self.nome_restaurante,
            "endereco_restaurante": self.endereco_restaurante,
            "telefone_restaurante": self.telefone_restaurante,
            "email_restaurante": self.email_restaurante,
            "cnpj": self.cnpj,
            "razao_social": self.razao_social,
            "nome_responsavel": self.nome_responsavel,
            "email_responsavel": self.email_responsavel,
            "telefone_responsavel": self.telefone_responsavel,
            "status": self.status.value,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "processado_em": self.processado_em.isoformat() if self.processado_em else None,
            "processado_por_id": self.processado_por_id,
            "processado_por_nome": self.processado_por.nome if self.processado_por else None,
            "motivo_rejeicao": self.motivo_rejeicao,
            "restaurante_criado_id": self.restaurante_criado_id,
            "restaurante_criado_nome": self.restaurante_criado.nome if self.restaurante_criado else None,
            "usuario_admin_criado_id": self.usuario_admin_criado_id,
            "usuario_admin_criado_email": self.usuario_admin_criado.email if self.usuario_admin_criado else None,
            "senha_gerada": self.senha_gerada
        }
