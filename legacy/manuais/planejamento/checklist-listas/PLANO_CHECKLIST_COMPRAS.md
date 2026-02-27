# Plano: Checklists de Compras

## 📋 Resumo Executivo

**Repositório:** ListaKaizenApp (ORIGINAL)
**Branch:** checklist-listas
**Funcionalidade:** Sistema de checklists para admin marcar itens durante compras

### Objetivo
Permitir que admin converta submissões aprovadas em checklists interativos para usar durante compras, com capacidade de marcar itens e compartilhar via WhatsApp.

### Fluxo da Feature
1. Admin aprova uma submissão
2. Botão "Converter para Checklist" aparece na página de detalhes
3. Admin escolhe incluir/excluir fornecedor e observações
4. Sistema cria checklist com itens dos pedidos aprovados
5. Admin acessa checklist e marca itens conforme compra
6. Pode compartilhar progresso via WhatsApp
7. Ao finalizar, checklist vai para histórico

### Requisitos Confirmados
- **Conversão**: Botão dentro de detalhes de submissão aprovada
- **Escopo**: Qualquer lista aprovada (não só recentes)
- **Estado**: Múltiplos checklists ativos permitidos, finalizados vão para histórico
- **Itens**: Nome, quantidade, unidade (obrigatório) + fornecedor e observações (opcional)
- **WhatsApp**: Formato texto simples com checkboxes
- **Acesso**: Somente ADMIN

## 🎯 Implementação: 9 Etapas

### ETAPA 1: Modelos Backend (Checklist e ChecklistItem)
**Arquivo:** `backend/kaizen_app/models.py`
**Localização:** Após linha ~442 (depois de PrioridadeItem enum)

**Adicionar:**
```python
class ChecklistStatus(enum.Enum):
    ATIVO = "ATIVO"
    FINALIZADO = "FINALIZADO"

class Checklist(db.Model, SerializerMixin):
    __tablename__ = 'checklists'

    serialize_rules = ('-itens.checklist', '-submissao.checklists')

    id = db.Column(db.Integer, primary_key=True)
    submissao_id = db.Column(db.Integer, db.ForeignKey('submissoes.id', ondelete='CASCADE'), nullable=False)
    nome = db.Column(db.String(200), nullable=False)
    status = db.Column(db.Enum(ChecklistStatus), nullable=False, default=ChecklistStatus.ATIVO)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    finalizado_em = db.Column(db.DateTime, nullable=True)

    # Relationships
    submissao = db.relationship('Submissao', backref=db.backref('checklists', lazy='dynamic'))
    itens = db.relationship('ChecklistItem', back_populates='checklist', lazy='dynamic', cascade='all, delete-orphan')

class ChecklistItem(db.Model, SerializerMixin):
    __tablename__ = 'checklist_itens'

    serialize_rules = ('-checklist.itens',)

    id = db.Column(db.Integer, primary_key=True)
    checklist_id = db.Column(db.Integer, db.ForeignKey('checklists.id', ondelete='CASCADE'), nullable=False)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id', ondelete='SET NULL'), nullable=True)

    # Dados desnormalizados (snapshot no momento da conversão)
    item_nome = db.Column(db.String(200), nullable=False)
    quantidade = db.Column(db.Numeric(10, 2), nullable=False)
    unidade = db.Column(db.String(50), nullable=False)
    fornecedor_nome = db.Column(db.String(100), nullable=True)
    observacao = db.Column(db.Text, nullable=True)

    # Estado do checklist
    marcado = db.Column(db.Boolean, default=False, nullable=False)
    marcado_em = db.Column(db.DateTime, nullable=True)

    # Relationships
    checklist = db.relationship('Checklist', back_populates='itens')
    pedido = db.relationship('Pedido')
```

**Commit:** `feat: adicionar modelos Checklist e ChecklistItem`

---

### ETAPA 2: Migration
**Comando:**
```bash
cd backend
flask db migrate -m "add checklists de compras"
flask db upgrade
```

**Commit:** `chore: criar migration para checklists`

---

### ETAPA 3: Services (6 funções)
**Arquivo:** `backend/kaizen_app/services.py`
**Localização:** Final do arquivo (~linha 4844)

**Adicionar:**
```python
# ==================== CHECKLIST SERVICES ====================

def converter_submissao_para_checklist(submissao_id: int, data: dict):
    """
    Converte uma submissão aprovada em checklist de compras.

    Args:
        submissao_id: ID da submissão
        data: {
            "incluir_fornecedor": bool,
            "incluir_observacoes": bool
        }
    """
    from kaizen_app.models import Submissao, SubmissaoStatus, Checklist, ChecklistItem, ChecklistStatus

    submissao = Submissao.query.get(submissao_id)
    if not submissao:
        raise ValueError("Submissão não encontrada")

    if submissao.status != SubmissaoStatus.APROVADO:
        raise ValueError("Apenas submissões aprovadas podem ser convertidas em checklist")

    # Buscar pedidos aprovados da submissão
    pedidos_aprovados = [p for p in submissao.pedidos if p.status.value == 'APROVADO']

    if not pedidos_aprovados:
        raise ValueError("Nenhum pedido aprovado encontrado nesta submissão")

    # Criar checklist
    checklist = Checklist(
        submissao_id=submissao_id,
        nome=f"Checklist - {submissao.lista.nome}",
        status=ChecklistStatus.ATIVO
    )
    db.session.add(checklist)
    db.session.flush()  # Obter ID do checklist

    # Criar itens do checklist
    incluir_fornecedor = data.get('incluir_fornecedor', False)
    incluir_observacoes = data.get('incluir_observacoes', False)

    for pedido in pedidos_aprovados:
        item = ChecklistItem(
            checklist_id=checklist.id,
            pedido_id=pedido.id,
            item_nome=pedido.item.nome,
            quantidade=pedido.quantidade_aprovada or pedido.quantidade_solicitada,
            unidade=pedido.item.unidade,
            fornecedor_nome=pedido.item.fornecedor.nome if incluir_fornecedor and pedido.item.fornecedor else None,
            observacao=pedido.observacao if incluir_observacoes and pedido.observacao else None,
            marcado=False
        )
        db.session.add(item)

    db.session.commit()
    return checklist.to_dict()


def listar_checklists(status_filter=None):
    """Lista checklists com filtro opcional de status."""
    from kaizen_app.models import Checklist, ChecklistStatus

    query = Checklist.query

    if status_filter:
        try:
            status_enum = ChecklistStatus[status_filter]
            query = query.filter_by(status=status_enum)
        except KeyError:
            raise ValueError(f"Status inválido: {status_filter}")

    checklists = query.order_by(Checklist.criado_em.desc()).all()

    # Enriquecer com dados calculados
    resultado = []
    for checklist in checklists:
        dados = checklist.to_dict()
        itens = list(checklist.itens)
        total_itens = len(itens)
        itens_marcados = sum(1 for item in itens if item.marcado)

        dados['total_itens'] = total_itens
        dados['itens_marcados'] = itens_marcados
        dados['progresso_percentual'] = (itens_marcados / total_itens * 100) if total_itens > 0 else 0

        resultado.append(dados)

    return resultado


def obter_checklist_por_id(checklist_id: int):
    """Retorna checklist com todos os itens."""
    from kaizen_app.models import Checklist

    checklist = Checklist.query.get(checklist_id)
    if not checklist:
        raise ValueError("Checklist não encontrado")

    dados = checklist.to_dict()
    itens = list(checklist.itens.order_by('item_nome'))

    dados['itens'] = [item.to_dict() for item in itens]
    dados['total_itens'] = len(itens)
    dados['itens_marcados'] = sum(1 for item in itens if item.marcado)
    dados['progresso_percentual'] = (dados['itens_marcados'] / dados['total_itens'] * 100) if dados['total_itens'] > 0 else 0

    return dados


def marcar_item_checklist(item_id: int, marcado: bool):
    """Marca ou desmarca um item do checklist."""
    from kaizen_app.models import ChecklistItem

    item = ChecklistItem.query.get(item_id)
    if not item:
        raise ValueError("Item não encontrado")

    item.marcado = marcado
    item.marcado_em = brasilia_now() if marcado else None

    db.session.commit()
    return item.to_dict()


def finalizar_checklist(checklist_id: int):
    """Finaliza um checklist ativo."""
    from kaizen_app.models import Checklist, ChecklistStatus

    checklist = Checklist.query.get(checklist_id)
    if not checklist:
        raise ValueError("Checklist não encontrado")

    if checklist.status == ChecklistStatus.FINALIZADO:
        raise ValueError("Checklist já está finalizado")

    checklist.status = ChecklistStatus.FINALIZADO
    checklist.finalizado_em = brasilia_now()

    db.session.commit()
    return checklist.to_dict()


def compartilhar_checklist_whatsapp(checklist_id: int):
    """Gera texto formatado para compartilhar checklist via WhatsApp."""
    from kaizen_app.models import Checklist

    checklist = Checklist.query.get(checklist_id)
    if not checklist:
        raise ValueError("Checklist não encontrado")

    itens = list(checklist.itens.order_by('item_nome'))
    total_itens = len(itens)
    itens_marcados = sum(1 for item in itens if item.marcado)

    # Montar texto
    linhas = [
        f"🛒 Checklist de Compras - {checklist.nome}",
        f"Data: {checklist.criado_em.strftime('%d/%m/%Y %H:%M')}",
        "",
    ]

    for item in itens:
        checkbox = "✅" if item.marcado else "⬜"
        linha = f"{checkbox} {item.item_nome} - {float(item.quantidade):.1f}{item.unidade}"

        if item.fornecedor_nome:
            linha += f" ({item.fornecedor_nome})"

        linhas.append(linha)

    linhas.append("")
    linhas.append(f"📊 Progresso: {itens_marcados}/{total_itens} itens")

    return {"texto": "\n".join(linhas)}
```

**Commit:** `feat: adicionar services para checklists`

---

### ETAPA 4: Controllers (6 endpoints)
**Arquivo:** `backend/kaizen_app/controllers.py`
**Localização:** Final do admin_bp (~linha 1503, antes de registrar blueprints)

**Adicionar:**
```python
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
```

**Commit:** `feat: adicionar endpoints para checklists`

---

### ETAPA 5: Modificar DetalhesSubmissao (botão converter)
**Arquivo:** `frontend/src/features/admin/DetalhesSubmissao.tsx`

**Mudanças:**
1. Adicionar imports (linha ~10):
```typescript
import { faListCheck } from '@fortawesome/free-solid-svg-icons';
```

2. Adicionar states após linha ~35:
```typescript
const [showConverterModal, setShowConverterModal] = useState(false);
const [incluirFornecedor, setIncluirFornecedor] = useState(true);
const [incluirObservacoes, setIncluirObservacoes] = useState(true);
const [convertendoChecklist, setConvertendoChecklist] = useState(false);
```

3. Adicionar função de conversão após handleAprovar (~linha 250):
```typescript
const handleConverterParaChecklist = async () => {
  if (!submissao) return;

  try {
    setConvertendoChecklist(true);
    const response = await api.post(
      `/admin/submissoes/${submissao.id}/converter-checklist`,
      {
        incluir_fornecedor: incluirFornecedor,
        incluir_observacoes: incluirObservacoes
      }
    );

    toast.success('Checklist criado com sucesso!');
    setShowConverterModal(false);
    navigate(`/admin/checklists/${response.data.id}`);
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Erro ao criar checklist');
  } finally {
    setConvertendoChecklist(false);
  }
};
```

4. Adicionar botão na seção de ações (~linha 582, após botão Aprovar):
```typescript
{submissao.status === 'APROVADO' && (
  <Button
    variant="success"
    onClick={() => setShowConverterModal(true)}
    className="d-flex align-items-center gap-2"
  >
    <FontAwesomeIcon icon={faListCheck} />
    Converter para Checklist
  </Button>
)}
```

5. Adicionar modal antes do último `</Container>` (~linha 800):
```typescript
{/* Modal Converter para Checklist */}
<Modal show={showConverterModal} onHide={() => setShowConverterModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Converter para Checklist</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <p>Configure quais informações incluir no checklist:</p>
    <Form>
      <Form.Check
        type="checkbox"
        label="Incluir nome do fornecedor"
        checked={incluirFornecedor}
        onChange={(e) => setIncluirFornecedor(e.target.checked)}
        className="mb-2"
      />
      <Form.Check
        type="checkbox"
        label="Incluir observações dos pedidos"
        checked={incluirObservacoes}
        onChange={(e) => setIncluirObservacoes(e.target.checked)}
      />
    </Form>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowConverterModal(false)}>
      Cancelar
    </Button>
    <Button
      variant="success"
      onClick={handleConverterParaChecklist}
      disabled={convertendoChecklist}
    >
      {convertendoChecklist ? 'Criando...' : 'Criar Checklist'}
    </Button>
  </Modal.Footer>
</Modal>
```

**Commit:** `feat: adicionar botão converter para checklist em DetalhesSubmissao`

---

### ETAPA 6: Criar GerenciarChecklists (página de listagem)
**Arquivo:** `frontend/src/features/admin/GerenciarChecklists.tsx` (NOVO)

**Conteúdo completo:**
```typescript
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Nav, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck, faEye, faCheckCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import styles from './GerenciarChecklists.module.css';

interface Checklist {
  id: number;
  nome: string;
  status: 'ATIVO' | 'FINALIZADO';
  criado_em: string;
  finalizado_em?: string;
  total_itens: number;
  itens_marcados: number;
  progresso_percentual: number;
  submissao: {
    lista: {
      nome: string;
    };
  };
}

type FiltroStatus = 'TODOS' | 'ATIVO' | 'FINALIZADO';

const GerenciarChecklists: React.FC = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS');
  const navigate = useNavigate();

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const params = filtroStatus !== 'TODOS' ? { status: filtroStatus } : {};
      const response = await api.get('/admin/checklists', { params });
      setChecklists(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar checklists');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [filtroStatus]);

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getVariantProgresso = (percentual: number) => {
    if (percentual === 100) return 'success';
    if (percentual >= 50) return 'info';
    return 'warning';
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <FontAwesomeIcon icon={faListCheck} size="2x" className="text-primary" />
            <div>
              <h2 className="mb-0">Checklists de Compras</h2>
              <p className="text-muted mb-0">Gerencie seus checklists de compras</p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Tabs de Filtro */}
      <Card className="mb-4">
        <Card.Body>
          <Nav variant="tabs" activeKey={filtroStatus} onSelect={(k) => setFiltroStatus(k as FiltroStatus)}>
            <Nav.Item>
              <Nav.Link eventKey="TODOS">Todos</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="ATIVO">
                <FontAwesomeIcon icon={faCircle} className="text-success me-2" />
                Ativos
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="FINALIZADO">
                <FontAwesomeIcon icon={faCheckCircle} className="text-secondary me-2" />
                Finalizados
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      {/* Tabela de Checklists */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
            </div>
          ) : checklists.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FontAwesomeIcon icon={faListCheck} size="3x" className="mb-3" />
              <p>Nenhum checklist encontrado</p>
            </div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Lista Origem</th>
                  <th>Progresso</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {checklists.map((checklist) => (
                  <tr key={checklist.id}>
                    <td>
                      <strong>{checklist.nome}</strong>
                    </td>
                    <td>{checklist.submissao.lista.nome}</td>
                    <td style={{ minWidth: '200px' }}>
                      <div className="d-flex align-items-center gap-2">
                        <ProgressBar
                          now={checklist.progresso_percentual}
                          variant={getVariantProgresso(checklist.progresso_percentual)}
                          style={{ flex: 1, height: '20px' }}
                        />
                        <span className="text-muted small">
                          {checklist.itens_marcados}/{checklist.total_itens}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge bg={checklist.status === 'ATIVO' ? 'success' : 'secondary'}>
                        {checklist.status}
                      </Badge>
                    </td>
                    <td>{formatarData(checklist.criado_em)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(`/admin/checklists/${checklist.id}`)}
                      >
                        <FontAwesomeIcon icon={faEye} className="me-1" />
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default GerenciarChecklists;
```

**Arquivo CSS:** `frontend/src/features/admin/GerenciarChecklists.module.css` (NOVO)
```css
/* Adicionar estilos customizados se necessário */
```

**Commit:** `feat: criar página GerenciarChecklists`

---

### ETAPA 7: Criar DetalhesChecklist (página interativa)
**Arquivo:** `frontend/src/features/admin/DetalhesChecklist.tsx` (NOVO)

**Conteúdo completo:**
```typescript
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, ProgressBar, Form, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck, faArrowLeft, faWhatsapp, faCheckCircle, faSquare, faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import styles from './DetalhesChecklist.module.css';

interface ChecklistItem {
  id: number;
  item_nome: string;
  quantidade: number;
  unidade: string;
  fornecedor_nome?: string;
  observacao?: string;
  marcado: boolean;
  marcado_em?: string;
}

interface Checklist {
  id: number;
  nome: string;
  status: 'ATIVO' | 'FINALIZADO';
  criado_em: string;
  finalizado_em?: string;
  total_itens: number;
  itens_marcados: number;
  progresso_percentual: number;
  submissao: {
    lista: {
      nome: string;
    };
  };
  itens: ChecklistItem[];
}

const DetalhesChecklist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const navigate = useNavigate();

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/checklists/${id}`);
      setChecklist(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar checklist');
      console.error(error);
      navigate('/admin/checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [id]);

  const handleMarcarItem = async (itemId: number, marcado: boolean) => {
    if (!checklist || checklist.status === 'FINALIZADO') return;

    try {
      await api.put(`/admin/checklists/${checklist.id}/itens/${itemId}/marcar`, { marcado });

      // Atualizar localmente
      setChecklist((prev) => {
        if (!prev) return prev;
        const novosItens = prev.itens.map((item) =>
          item.id === itemId ? { ...item, marcado, marcado_em: marcado ? new Date().toISOString() : undefined } : item
        );
        const itensMarcados = novosItens.filter((i) => i.marcado).length;
        return {
          ...prev,
          itens: novosItens,
          itens_marcados: itensMarcados,
          progresso_percentual: (itensMarcados / prev.total_itens) * 100,
        };
      });
    } catch (error: any) {
      toast.error('Erro ao marcar item');
      console.error(error);
    }
  };

  const handleFinalizar = async () => {
    if (!checklist) return;

    if (window.confirm('Deseja realmente finalizar este checklist? Esta ação não pode ser desfeita.')) {
      try {
        setFinalizando(true);
        await api.post(`/admin/checklists/${checklist.id}/finalizar`);
        toast.success('Checklist finalizado com sucesso!');
        fetchChecklist();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Erro ao finalizar checklist');
      } finally {
        setFinalizando(false);
      }
    }
  };

  const handleCompartilharWhatsApp = async () => {
    if (!checklist) return;

    try {
      const response = await api.get(`/admin/checklists/${checklist.id}/whatsapp`);
      const texto = response.data.texto;

      // Copiar para clipboard
      await navigator.clipboard.writeText(texto);
      toast.success('Texto copiado para a área de transferência!');

      // Abrir WhatsApp Web (opcional)
      const textoEncoded = encodeURIComponent(texto);
      window.open(`https://wa.me/?text=${textoEncoded}`, '_blank');
    } catch (error: any) {
      toast.error('Erro ao gerar texto para WhatsApp');
      console.error(error);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getVariantProgresso = (percentual: number) => {
    if (percentual === 100) return 'success';
    if (percentual >= 50) return 'info';
    return 'warning';
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (!checklist) {
    return null;
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <Button variant="outline-secondary" onClick={() => navigate('/admin/checklists')}>
                <FontAwesomeIcon icon={faArrowLeft} />
              </Button>
              <div>
                <h2 className="mb-0">{checklist.nome}</h2>
                <p className="text-muted mb-0">Lista: {checklist.submissao.lista.nome}</p>
              </div>
            </div>
            <Badge bg={checklist.status === 'ATIVO' ? 'success' : 'secondary'} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {checklist.status}
            </Badge>
          </div>
        </Col>
      </Row>

      {/* Card de Progresso */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={8}>
              <h5 className="mb-3">Progresso</h5>
              <ProgressBar
                now={checklist.progresso_percentual}
                label={`${checklist.progresso_percentual.toFixed(0)}%`}
                variant={getVariantProgresso(checklist.progresso_percentual)}
                style={{ height: '30px', fontSize: '1rem' }}
              />
              <p className="text-muted mt-2 mb-0">
                {checklist.itens_marcados} de {checklist.total_itens} itens marcados
              </p>
            </Col>
            <Col md={4} className="d-flex flex-column gap-2">
              <Button
                variant="success"
                onClick={handleCompartilharWhatsApp}
                className="d-flex align-items-center justify-content-center gap-2"
              >
                <FontAwesomeIcon icon={faWhatsapp} />
                Compartilhar WhatsApp
              </Button>
              {checklist.status === 'ATIVO' && (
                <Button
                  variant="primary"
                  onClick={handleFinalizar}
                  disabled={finalizando}
                  className="d-flex align-items-center justify-content-center gap-2"
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  {finalizando ? 'Finalizando...' : 'Finalizar Checklist'}
                </Button>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Alerta se finalizado */}
      {checklist.status === 'FINALIZADO' && (
        <Alert variant="info" className="mb-4">
          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
          Este checklist foi finalizado em {formatarData(checklist.finalizado_em!)}.
          Os itens não podem mais ser modificados.
        </Alert>
      )}

      {/* Tabela de Itens */}
      <Card>
        <Card.Body>
          <h5 className="mb-3">Itens do Checklist</h5>
          <Table hover responsive>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <FontAwesomeIcon icon={faCheckSquare} />
                </th>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Fornecedor</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {checklist.itens.map((item) => (
                <tr
                  key={item.id}
                  className={item.marcado ? styles.itemMarcado : ''}
                  style={{ cursor: checklist.status === 'ATIVO' ? 'pointer' : 'default' }}
                  onClick={() => checklist.status === 'ATIVO' && handleMarcarItem(item.id, !item.marcado)}
                >
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={item.marcado}
                      onChange={(e) => handleMarcarItem(item.id, e.target.checked)}
                      disabled={checklist.status === 'FINALIZADO'}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <strong className={item.marcado ? 'text-decoration-line-through text-muted' : ''}>
                      {item.item_nome}
                    </strong>
                  </td>
                  <td>
                    {item.quantidade} {item.unidade}
                  </td>
                  <td>{item.fornecedor_nome || '-'}</td>
                  <td>{item.observacao || '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Informações Adicionais */}
      <Card className="mt-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <p className="mb-1">
                <strong>Criado em:</strong> {formatarData(checklist.criado_em)}
              </p>
            </Col>
            {checklist.finalizado_em && (
              <Col md={6}>
                <p className="mb-1">
                  <strong>Finalizado em:</strong> {formatarData(checklist.finalizado_em)}
                </p>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DetalhesChecklist;
```

**Arquivo CSS:** `frontend/src/features/admin/DetalhesChecklist.module.css` (NOVO)
```css
.itemMarcado {
  background-color: #f8f9fa;
  opacity: 0.7;
}

.itemMarcado:hover {
  background-color: #e9ecef !important;
}
```

**Commit:** `feat: criar página DetalhesChecklist`

---

### ETAPA 8: Adicionar Rotas (App.tsx)
**Arquivo:** `frontend/src/App.tsx`
**Localização:** Após linha ~69 (importar componentes e adicionar rotas)

**Adicionar imports:**
```typescript
import GerenciarChecklists from './features/admin/GerenciarChecklists';
import DetalhesChecklist from './features/admin/DetalhesChecklist';
```

**Adicionar rotas dentro de AdminRoute:**
```typescript
<Route path="/admin/checklists" element={<GerenciarChecklists />} />
<Route path="/admin/checklists/:id" element={<DetalhesChecklist />} />
```

**Commit:** `feat: adicionar rotas para checklists no App`

---

### ETAPA 9: Adicionar Item no Menu (Layout.tsx)
**Arquivo:** `frontend/src/components/Layout.tsx`
**Localização:** Dentro do grupo "LISTAS & ESTOQUE" (~linha 51-57)

**Adicionar import:**
```typescript
import { faListCheck } from '@fortawesome/free-solid-svg-icons';
```

**Adicionar item no array adminMenuGroups:**
```typescript
{
  label: 'LISTAS & ESTOQUE',
  items: [
    { path: '/admin/listas', icon: faList, label: 'Listas' },
    { path: '/admin/checklists', icon: faListCheck, label: 'Checklists de Compras' },  // NOVO
    { path: '/admin/items', icon: faBoxOpen, label: 'Itens' },
    // ... outros itens
  ]
}
```

**Commit:** `feat: adicionar item Checklists no menu admin`

---

## 📦 Arquivos Críticos

### Backend (4 arquivos)
1. `backend/kaizen_app/models.py` - Adicionar Checklist e ChecklistItem
2. `backend/kaizen_app/services.py` - 6 funções de negócio
3. `backend/kaizen_app/controllers.py` - 6 endpoints REST
4. Migration gerada automaticamente em `backend/migrations/versions/`

### Frontend (5 arquivos)
1. `frontend/src/features/admin/DetalhesSubmissao.tsx` - Modificar (botão + modal)
2. `frontend/src/features/admin/GerenciarChecklists.tsx` - NOVO
3. `frontend/src/features/admin/DetalhesChecklist.tsx` - NOVO
4. `frontend/src/App.tsx` - Adicionar rotas
5. `frontend/src/components/Layout.tsx` - Adicionar menu

### CSS (2 arquivos)
1. `frontend/src/features/admin/GerenciarChecklists.module.css` - NOVO
2. `frontend/src/features/admin/DetalhesChecklist.module.css` - NOVO

---

## 🧪 Testes Manuais Necessários

1. ✅ Aprovar submissão → botão "Converter para Checklist" aparece
2. ✅ Converter com/sem fornecedor e observações
3. ✅ Navegar para checklist criado
4. ✅ Marcar/desmarcar itens (progresso atualiza)
5. ✅ Compartilhar via WhatsApp (copiar texto)
6. ✅ Finalizar checklist (status muda, itens ficam readonly)
7. ✅ Filtrar checklists por ATIVO/FINALIZADO
8. ✅ Menu "Checklists de Compras" funciona
9. ✅ Voltar para lista de checklists
10. ✅ Criar múltiplos checklists ativos

---

## 📝 Ordem de Commits (9 commits)

1. `feat: adicionar modelos Checklist e ChecklistItem`
2. `chore: criar migration para checklists`
3. `feat: adicionar services para checklists`
4. `feat: adicionar endpoints para checklists`
5. `feat: adicionar botão converter para checklist em DetalhesSubmissao`
6. `feat: criar página GerenciarChecklists`
7. `feat: criar página DetalhesChecklist`
8. `feat: adicionar rotas para checklists no App`
9. `feat: adicionar item Checklists no menu admin`

---

## 🚀 Comandos para Execução

```bash
# 1. Backend - Criar migration
cd backend
flask db migrate -m "add checklists de compras"
flask db upgrade

# 2. Rodar backend
flask run --host=0.0.0.0

# 3. Frontend (terminal separado)
cd frontend
npm start
```

---

## ✅ Checklist de Conclusão

- [ ] ETAPA 1: Modelos criados
- [ ] ETAPA 2: Migration aplicada
- [ ] ETAPA 3: Services implementados
- [ ] ETAPA 4: Controllers implementados
- [ ] ETAPA 5: DetalhesSubmissao modificado
- [ ] ETAPA 6: GerenciarChecklists criado
- [ ] ETAPA 7: DetalhesChecklist criado
- [ ] ETAPA 8: Rotas adicionadas
- [ ] ETAPA 9: Menu atualizado
- [ ] Backend rodando sem erros
- [ ] Frontend compilando sem erros
- [ ] Testes manuais passando
- [ ] 9 commits realizados

---

**Branch:** checklist-listas
**Repositório:** ListaKaizenApp (ORIGINAL)
**Próximos Passos:** Implementar etapas 1-9 em ordem sequencial
