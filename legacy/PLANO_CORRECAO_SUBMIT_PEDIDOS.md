# 🔧 PLANO DE CORREÇÃO - Submissão de Lista com Pedidos Automáticos

**Data:** 26 de Dezembro de 2024 - 01:09 BRT  
**Branch:** `funcionalidades-colaborador`  
**Objetivo:** Habilitar criação automática de Pedidos ao submeter lista

---

## 🎯 PROBLEMA ATUAL

### ⚠️ Dois problemas impedem criação de Pedidos:

1. **FK incompatível:**
   ```python
   Pedido.item_id → FK para 'itens.id' (tabela VAZIA)
   ListaItemRef.item_id → FK para 'lista_mae_itens.id' (catálogo global)
   ```

2. **fornecedor_id NOT NULL:**
   ```python
   Pedido.fornecedor_id = NOT NULL
   ListaMaeItem não tem fornecedor_id
   ```

---

## 📋 SOLUÇÃO ESCOLHIDA: OPÇÃO 1 (Refatorar Modelo Pedido)

### 🎯 Por quê Opção 1?
- ✅ Alinha com arquitetura nova (ListaMaeItem)
- ✅ Remove dependência de tabelas legadas
- ✅ Solução permanente e escalável
- ✅ Permite adicionar fornecedor no futuro

---

## 🚀 PLANO DE EXECUÇÃO (4 FASES)

---

## 📌 FASE 1: MIGRATION DO MODELO PEDIDO

**Tempo estimado:** 30-45 minutos

### Passo 1.1: Criar Migration
```bash
cd backend
flask db revision -m "refactor_pedido_use_lista_mae_item"
```

### Passo 1.2: Implementar Migration

**Arquivo:** `backend/migrations/versions/XXXX_refactor_pedido_use_lista_mae_item.py`

```python
"""refactor_pedido_use_lista_mae_item

Revision ID: XXXX
Revises: YYYY
Create Date: 2024-12-26 01:09:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'XXXX'
down_revision = 'YYYY'  # ID da última migration
branch_labels = None
depends_on = None


def upgrade():
    """
    Refatora modelo Pedido para usar ListaMaeItem em vez de Item.
    """
    # PASSO 1: Tornar fornecedor_id nullable
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.alter_column('fornecedor_id',
                              existing_type=sa.Integer(),
                              nullable=True)
    
    # PASSO 2: Adicionar nova coluna lista_mae_item_id
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('lista_mae_item_id', sa.Integer(), nullable=True)
        )
    
    # PASSO 3: Criar FK para lista_mae_itens
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.create_foreign_key(
            'fk_pedido_lista_mae_item',
            'lista_mae_itens',
            ['lista_mae_item_id'],
            ['id'],
            ondelete='CASCADE'
        )
    
    # PASSO 4: Migrar dados existentes (se houver)
    # Como tabela 'itens' está vazia, não há dados para migrar
    # Se houvesse, precisaríamos fazer matching por nome
    
    # PASSO 5: Tornar lista_mae_item_id NOT NULL (após migração)
    # Como não há dados, podemos fazer direto
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.alter_column('lista_mae_item_id',
                              existing_type=sa.Integer(),
                              nullable=False)
    
    # PASSO 6: Remover coluna item_id antiga
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.drop_constraint('pedidos_item_id_fkey', type_='foreignkey')
        batch_op.drop_column('item_id')


def downgrade():
    """
    Reverte as mudanças (volta para modelo antigo).
    """
    # Recriar coluna item_id
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('item_id', sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            'pedidos_item_id_fkey',
            'itens',
            ['item_id'],
            ['id']
        )
    
    # Remover lista_mae_item_id
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.drop_constraint('fk_pedido_lista_mae_item', type_='foreignkey')
        batch_op.drop_column('lista_mae_item_id')
    
    # Tornar fornecedor_id NOT NULL novamente
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.alter_column('fornecedor_id',
                              existing_type=sa.Integer(),
                              nullable=False)
```

### Passo 1.3: Aplicar Migration

```bash
# Testar migration
flask db upgrade

# Verificar estrutura
flask db current

# Se algo der errado, reverter
# flask db downgrade
```

**✅ Checklist Fase 1:**
- [ ] Migration criada
- [ ] Migration implementada
- [ ] Migration testada localmente
- [ ] Migration aplicada com sucesso
- [ ] Estrutura da tabela verificada

---

## 📌 FASE 2: ATUALIZAR MODEL PEDIDO

**Tempo estimado:** 15 minutos

### Passo 2.1: Modificar `models.py`

**Arquivo:** `backend/kaizen_app/models.py`

**PROCURAR POR:**
```python
class Pedido(db.Model, SerializerMixin):
    __tablename__ = "pedidos"
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('itens.id'), nullable=False)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    quantidade_solicitada = db.Column(db.Numeric(10, 2), nullable=False)
    data_pedido = db.Column(db.DateTime, nullable=False, default=utc_now)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    status = db.Column(db.Enum(PedidoStatus), nullable=False, default=PedidoStatus.PENDENTE)
    item = db.relationship('Item', backref=db.backref('pedidos', lazy=True))
    fornecedor = db.relationship('Fornecedor', backref=db.backref('pedidos', lazy=True))
    usuario = db.relationship('Usuario', backref=db.backref('pedidos', lazy=True))
```

**SUBSTITUIR POR:**
```python
class Pedido(db.Model, SerializerMixin):
    """
    Pedido de compra gerado automaticamente quando qtd_atual < qtd_minima.
    Refatorado para usar ListaMaeItem (catálogo global).
    """
    __tablename__ = "pedidos"
    id = db.Column(db.Integer, primary_key=True)
    lista_mae_item_id = db.Column(db.Integer, 
                                   db.ForeignKey('lista_mae_itens.id', ondelete='CASCADE'), 
                                   nullable=False)
    fornecedor_id = db.Column(db.Integer, 
                              db.ForeignKey('fornecedores.id'), 
                              nullable=True)  # Nullable agora
    quantidade_solicitada = db.Column(db.Numeric(10, 2), nullable=False)
    data_pedido = db.Column(db.DateTime, nullable=False, default=utc_now)
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
    
    def to_dict(self):
        """Serializa pedido com dados do item."""
        d = super().to_dict()
        if self.item:
            d['item'] = {
                'id': self.item.id,
                'nome': self.item.nome,
                'unidade': self.item.unidade
            }
        if self.fornecedor:
            d['fornecedor'] = {
                'id': self.fornecedor.id,
                'nome': self.fornecedor.nome
            }
        return d
```

**✅ Checklist Fase 2:**
- [ ] Model Pedido atualizado
- [ ] Relacionamentos corrigidos
- [ ] Comentários adicionados
- [ ] to_dict() implementado

---

## 📌 FASE 3: HABILITAR CRIAÇÃO DE PEDIDOS EM SUBMIT

**Tempo estimado:** 30 minutos

### Passo 3.1: Modificar `submit_estoque_lista()`

**Arquivo:** `backend/kaizen_app/services.py` (linha ~816)

**PROCURAR POR:**
```python
        # Cria Pedido se quantidade está abaixo do mínimo
        if float(quantidade_atual) < float(ref.quantidade_minima):
            quantidade_a_pedir = float(ref.quantidade_minima) - float(quantidade_atual)
            
            # PROBLEMA 1: Pedido.item_id referencia tabela 'itens' (Item), não ListaMaeItem
            # PROBLEMA 2: Pedido.fornecedor_id é NOT NULL
            # SOLUÇÃO TEMPORÁRIA: Pular criação de pedidos até resolver arquitetura
            current_app.logger.warning(
                f"[SUBMIT] Pedido não criado para item {ref.item_id} - "
                f"Arquitetura de Pedidos precisa ser refatorada para usar ListaMaeItem"
            )
            # TODO: Refatorar modelo Pedido para usar lista_mae_itens
```

**SUBSTITUIR POR:**
```python
        # Cria Pedido se quantidade está abaixo do mínimo
        if float(quantidade_atual) < float(ref.quantidade_minima):
            quantidade_a_pedir = float(ref.quantidade_minima) - float(quantidade_atual)
            
            # ✅ REFATORADO: Agora usa lista_mae_item_id
            novo_pedido = Pedido(
                lista_mae_item_id=ref.item_id,  # FK para lista_mae_itens
                fornecedor_id=None,  # Nullable agora, pode adicionar lógica depois
                quantidade_solicitada=quantidade_a_pedir,
                usuario_id=usuario_id,
                status=PedidoStatus.PENDENTE
            )
            db.session.add(novo_pedido)
            pedidos_criados.append(novo_pedido)
            
            current_app.logger.info(
                f"[SUBMIT] Pedido criado: item {ref.item.nome}, "
                f"qtd={quantidade_a_pedir}, usuario={usuario_id}"
            )
```

### Passo 3.2: Atualizar Mensagem de Sucesso

**PROCURAR POR:**
```python
    return {
        "message": f"Lista submetida com sucesso! (Pedidos automáticos desabilitados temporariamente)",
        "estoques_atualizados": len(refs_atualizados),
        "pedidos_criados": len(pedidos_criados)
    }, 201
```

**SUBSTITUIR POR:**
```python
    return {
        "message": f"Lista submetida com sucesso! {len(pedidos_criados)} pedido(s) criado(s).",
        "estoques_atualizados": len(refs_atualizados),
        "pedidos_criados": len(pedidos_criados)
    }, 201
```

**✅ Checklist Fase 3:**
- [ ] submit_estoque_lista() atualizado
- [ ] Criação de pedidos habilitada
- [ ] Logs de info adicionados
- [ ] Mensagem de sucesso corrigida

---

## 📌 FASE 4: TESTES E VALIDAÇÃO

**Tempo estimado:** 30-45 minutos

### Passo 4.1: Testes Unitários

```python
# Testar submit com criação de pedidos
def test_submit_cria_pedidos():
    # Setup
    lista = criar_lista_com_itens()
    colaborador = criar_colaborador_atribuido(lista)
    
    # Dados de submit
    items_data = [
        {"estoque_id": 7, "quantidade_atual": 2},   # Arroz: min=10, atual=2 → pedido=8
        {"estoque_id": 12, "quantidade_atual": 0},  # Alga: min=5, atual=0 → pedido=5
        {"estoque_id": 18, "quantidade_atual": 15}  # Cogumelo: min=10, atual=15 → sem pedido
    ]
    
    # Executar
    response, status = submit_estoque_lista(lista.id, colaborador.id, items_data)
    
    # Verificar
    assert status == 201
    assert response['pedidos_criados'] == 2
    assert response['estoques_atualizados'] == 3
    
    # Verificar pedidos no banco
    pedidos = Pedido.query.filter_by(usuario_id=colaborador.id).all()
    assert len(pedidos) == 2
    
    pedido_arroz = next(p for p in pedidos if p.item.nome == 'Arroz')
    assert float(pedido_arroz.quantidade_solicitada) == 8.0
    assert pedido_arroz.status == PedidoStatus.PENDENTE
```

### Passo 4.2: Testes Manuais

**Teste 1: Submit com Pedidos Abaixo do Mínimo**
```bash
1. Login como Tayan
2. Acessar Lista "Tokudai"
3. Preencher quantidades:
   - Arroz: 2 (mínimo: 10) → Deve criar pedido
   - Alga: 0 (mínimo: 5) → Deve criar pedido
   - Cogumelo: 15 (mínimo: 10) → NÃO deve criar pedido
4. Clicar "Submeter Lista"
5. ✅ Verificar mensagem: "Lista submetida com sucesso! 2 pedido(s) criado(s)."
6. ✅ Verificar que quantidades foram salvas
7. ✅ Login como Admin → Ver pedidos pendentes
```

**Teste 2: Submit sem Pedidos (Tudo OK)**
```bash
1. Login como Tayan
2. Acessar Lista "Tokudai"
3. Preencher todas quantidades ACIMA do mínimo
4. Submeter
5. ✅ Verificar mensagem: "Lista submetida com sucesso! 0 pedido(s) criado(s)."
```

**Teste 3: Pedido sem Fornecedor**
```bash
1. Verificar que pedidos são criados mesmo sem fornecedor_id
2. ✅ fornecedor_id deve ser NULL no banco
3. ✅ Não deve dar erro de constraint
```

### Passo 4.3: Verificação no Banco

```sql
-- Verificar estrutura da tabela
PRAGMA table_info(pedidos);
-- Deve ter: lista_mae_item_id (NOT NULL), fornecedor_id (NULL)

-- Verificar pedidos criados
SELECT 
    p.id,
    i.nome AS item_nome,
    p.quantidade_solicitada,
    p.fornecedor_id,
    p.status,
    u.nome AS usuario_nome
FROM pedidos p
JOIN lista_mae_itens i ON p.lista_mae_item_id = i.id
JOIN usuarios u ON p.usuario_id = u.id
ORDER BY p.data_pedido DESC;
```

**✅ Checklist Fase 4:**
- [ ] Testes unitários criados
- [ ] Teste manual 1 executado
- [ ] Teste manual 2 executado
- [ ] Teste manual 3 executado
- [ ] Verificação no banco realizada
- [ ] Pedidos aparecem na interface admin

---

## 📊 CHECKLIST COMPLETO

### FASE 1: Migration ⏱️ 30-45min
- [ ] Migration criada
- [ ] fornecedor_id → nullable
- [ ] lista_mae_item_id adicionado
- [ ] FK criado
- [ ] item_id removido
- [ ] Migration aplicada
- [ ] Rollback testado

### FASE 2: Model ⏱️ 15min
- [ ] Pedido.lista_mae_item_id
- [ ] Relacionamento com ListaMaeItem
- [ ] Relacionamento com Fornecedor (nullable)
- [ ] to_dict() implementado

### FASE 3: Service ⏱️ 30min
- [ ] submit_estoque_lista() habilitado
- [ ] Criação de pedidos funciona
- [ ] Logs informativos
- [ ] Mensagem de sucesso atualizada

### FASE 4: Testes ⏱️ 30-45min
- [ ] Testes unitários
- [ ] Testes manuais
- [ ] Verificação banco
- [ ] Pedidos aparecem no admin

---

## ⏱️ TEMPO TOTAL ESTIMADO

**Desenvolvimento:** 2-2.5 horas  
**Testes:** 30-45 minutos  
**Buffer:** 30 minutos  

**TOTAL:** 3-3.5 horas

---

## 🎯 RESULTADO ESPERADO

### Antes:
```
✅ Submit salva quantidades
❌ Pedidos não criados (desabilitados)
⚠️ Mensagem: "Pedidos automáticos desabilitados"
```

### Depois:
```
✅ Submit salva quantidades
✅ Pedidos criados automaticamente
✅ Mensagem: "2 pedido(s) criado(s)"
✅ Admin vê pedidos pendentes
✅ Arquitetura alinhada com ListaMaeItem
```

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Migration falha
**Mitigação:** Testar em banco local primeiro, ter rollback pronto

### Risco 2: Código existente quebra
**Mitigação:** Buscar todas referências a Pedido.item_id antes

### Risco 3: Frontend espera estrutura antiga
**Mitigação:** Verificar serialização (to_dict mantém compatibilidade)

---

## 📝 COMANDOS ÚTEIS

```bash
# Criar migration
flask db revision -m "refactor_pedido_use_lista_mae_item"

# Aplicar
flask db upgrade

# Reverter se necessário
flask db downgrade

# Ver histórico
flask db history

# Ver atual
flask db current

# Testar backend
pytest backend/tests/

# Iniciar servidor
flask run
```

---

## 📄 ARQUIVOS A MODIFICAR

1. `backend/migrations/versions/XXXX_refactor_pedido_use_lista_mae_item.py` (NOVO)
2. `backend/kaizen_app/models.py` (Pedido class)
3. `backend/kaizen_app/services.py` (submit_estoque_lista)
4. `backend/tests/test_submit_pedidos.py` (NOVO - opcional)

---

## ✅ PRONTO PARA EXECUTAR!

**Próximo comando:**
```bash
cd backend
flask db revision -m "refactor_pedido_use_lista_mae_item"
```

---

**Plano criado em:** 26/12/2024 às 01:09 BRT  
**Status:** ✅ Pronto para execução  
**Tempo estimado:** 3-3.5 horas
