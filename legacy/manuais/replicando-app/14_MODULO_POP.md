# 14 — Módulo POP (Procedimentos Operacionais Padrão)

> Módulo para criação, execução e auditoria de checklists operacionais com múltiplos tipos de verificação, recorrência e controle de desvios.

---

## Conceito

O módulo POP permite que o admin crie **Procedimentos Operacionais Padrão** — listas de tarefas recorrentes que colaboradores executam e documentam. Exemplos: abertura, fechamento, limpeza, controle de temperatura.

**Fluxo principal:**
```
Admin cria Templates → Admin cria Lista com Templates → Admin atribui Colaboradores
→ Colaborador executa Lista → Preenche itens (checkbox, medição, foto, etc.)
→ Finaliza → Admin revisa na Auditoria → Auto-arquivamento após X dias
```

---

## Modelos do Banco

### Enums

#### TipoVerificacao
```python
class TipoVerificacao(enum.Enum):
    CHECKBOX    = "checkbox"     # Sim/Não simples
    MEDICAO     = "medicao"      # Medição numérica com min/max
    TEMPERATURA = "temperatura"  # Temperatura (tipicamente em °C)
    FOTO        = "foto"         # Exige foto como comprovante
    TEXTO       = "texto"        # Texto livre / observações
```

#### CriticidadeTarefa
```python
class CriticidadeTarefa(enum.Enum):
    BAIXA   = "baixa"
    NORMAL  = "normal"
    ALTA    = "alta"
    CRITICA = "critica"
```

#### RecorrenciaLista
```python
class RecorrenciaLista(enum.Enum):
    DIARIA      = "diaria"
    SEMANAL     = "semanal"
    MENSAL      = "mensal"
    SOB_DEMANDA = "sob_demanda"
```

#### StatusExecucao
```python
class StatusExecucao(enum.Enum):
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO    = "concluido"
    PARCIAL      = "parcial"
```

---

### POPConfiguracao (Configurações globais por restaurante)

```python
class POPConfiguracao(db.Model):
    __tablename__ = 'pop_configuracoes'

    id                          = db.Column(db.Integer, primary_key=True)
    restaurante_id              = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), unique=True)
    auto_arquivar               = db.Column(db.Boolean, default=True)
    periodo_arquivamento_dias   = db.Column(db.Integer, default=7)
    hora_execucao_arquivamento  = db.Column(db.Time, nullable=True)
    ultimo_auto_arquivamento_em = db.Column(db.DateTime, nullable=True)
    criado_em                   = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em               = db.Column(db.DateTime, default=brasilia_now)
```

### POPCategoria (Categorias: "Abertura", "Fechamento", etc.)

```python
class POPCategoria(db.Model):
    __tablename__ = 'pop_categorias'

    id             = db.Column(db.Integer, primary_key=True)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), index=True)
    nome           = db.Column(db.String(100), nullable=False)  # UNIQUE com restaurante_id
    descricao      = db.Column(db.Text, nullable=True)
    icone          = db.Column(db.String(50), nullable=True)   # FontAwesome ou similar
    cor            = db.Column(db.String(20), nullable=True)   # Código HEX
    ordem          = db.Column(db.Integer, default=0)
    ativo          = db.Column(db.Boolean, default=True)
    criado_em      = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em  = db.Column(db.DateTime, default=brasilia_now)
```

### POPTemplate (Template mestre de tarefa)

```python
class POPTemplate(db.Model):
    __tablename__ = 'pop_templates'

    id                = db.Column(db.Integer, primary_key=True)
    restaurante_id    = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), index=True)
    categoria_id      = db.Column(db.Integer, db.ForeignKey('pop_categorias.id'), nullable=True)
    area_id           = db.Column(db.Integer, db.ForeignKey('areas.id'), nullable=True)
    titulo            = db.Column(db.String(200), nullable=False)  # UNIQUE com restaurante_id
    descricao         = db.Column(db.Text, nullable=True)
    instrucoes        = db.Column(db.Text, nullable=True)
    tipo_verificacao  = db.Column(db.Enum(TipoVerificacao))
    requer_foto       = db.Column(db.Boolean, default=False)
    requer_medicao    = db.Column(db.Boolean, default=False)
    rapida            = db.Column(db.Boolean, default=False)  # Atividade rápida
    unidade_medicao   = db.Column(db.String(50), nullable=True)   # e.g., "°C", "kg"
    valor_minimo      = db.Column(db.Numeric(10, 2), nullable=True)
    valor_maximo      = db.Column(db.Numeric(10, 2), nullable=True)
    criticidade       = db.Column(db.Enum(CriticidadeTarefa))
    tempo_estimado    = db.Column(db.Integer, nullable=True)  # minutos
    ordem             = db.Column(db.Integer, default=0)
    ativo             = db.Column(db.Boolean, default=True)
    criado_por_id     = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_em         = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em     = db.Column(db.DateTime, default=brasilia_now)
```

### POPLista (Lista de execução)

```python
class POPLista(db.Model):
    __tablename__ = 'pop_listas'

    id                    = db.Column(db.Integer, primary_key=True)
    restaurante_id        = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), index=True)
    area_id               = db.Column(db.Integer, db.ForeignKey('areas.id'), nullable=True)
    categoria_id          = db.Column(db.Integer, db.ForeignKey('pop_categorias.id'), nullable=True)
    nome                  = db.Column(db.String(200), nullable=False)  # UNIQUE com restaurante_id
    descricao             = db.Column(db.Text, nullable=True)
    recorrencia           = db.Column(db.Enum(RecorrenciaLista))
    dias_semana           = db.Column(db.String(50), nullable=True)   # e.g., "1,2,3,4,5"
    horario_sugerido      = db.Column(db.Time, nullable=True)          # e.g., 09:00
    publico               = db.Column(db.Boolean, default=False)      # Acessível a todos se True
    tempo_estimado_total  = db.Column(db.Integer, nullable=True)
    ativo                 = db.Column(db.Boolean, default=True)
    deletado              = db.Column(db.Boolean, default=False)      # Soft delete
    criado_por_id         = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_em             = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em         = db.Column(db.DateTime, default=brasilia_now)

    # M2M colaboradores via tabela pop_lista_colaboradores
    colaboradores = db.relationship('Usuario', secondary='pop_lista_colaboradores', ...)
    tarefas       = db.relationship('POPListaTarefa', cascade='all, delete-orphan', ...)
```

### POPListaTarefa (Relacionamento Lista ↔ Template)

```python
class POPListaTarefa(db.Model):
    __tablename__ = 'pop_lista_tarefas'

    id                      = db.Column(db.Integer, primary_key=True)
    lista_id                = db.Column(db.Integer, db.ForeignKey('pop_listas.id', ondelete='CASCADE'))
    template_id             = db.Column(db.Integer, db.ForeignKey('pop_templates.id', ondelete='CASCADE'))
    ordem                   = db.Column(db.Integer, default=0)
    obrigatoria             = db.Column(db.Boolean, default=True)  # Impede finalizar se não concluída
    requer_foto_override    = db.Column(db.Boolean, nullable=True)
    requer_medicao_override = db.Column(db.Boolean, nullable=True)
    criado_em               = db.Column(db.DateTime, default=brasilia_now)
    # UNIQUE CONSTRAINT: (lista_id, template_id)
```

### POPExecucao (Instância de execução de uma lista)

```python
class POPExecucao(db.Model):
    __tablename__ = 'pop_execucoes'

    id              = db.Column(db.Integer, primary_key=True)
    lista_id        = db.Column(db.Integer, db.ForeignKey('pop_listas.id', ondelete='CASCADE'), index=True)
    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    restaurante_id  = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='CASCADE'), index=True)
    iniciado_em     = db.Column(db.DateTime)
    finalizado_em   = db.Column(db.DateTime, nullable=True)
    data_referencia = db.Column(db.Date, index=True)

    # Status e progresso
    status              = db.Column(db.Enum(StatusExecucao))
    progresso           = db.Column(db.Integer)     # 0-100%
    total_tarefas       = db.Column(db.Integer)
    tarefas_concluidas  = db.Column(db.Integer)
    tarefas_com_desvio  = db.Column(db.Integer)

    # Assinatura e notas
    assinatura_digital = db.Column(db.Text, nullable=True)  # Canvas base64
    observacoes        = db.Column(db.Text, nullable=True)

    # Revisão pelo admin
    revisado             = db.Column(db.Boolean, default=False)
    revisado_por_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    revisado_em          = db.Column(db.DateTime, nullable=True)
    observacoes_revisao  = db.Column(db.Text, nullable=True)

    # Arquivamento
    arquivado        = db.Column(db.Boolean, default=False)
    arquivado_em     = db.Column(db.DateTime, nullable=True)
    arquivado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)

    criado_em    = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now)

    itens = db.relationship('POPExecucaoItem', cascade='all, delete-orphan', ...)
```

### POPExecucaoItem (Item individual na execução)

```python
class POPExecucaoItem(db.Model):
    __tablename__ = 'pop_execucao_itens'

    id               = db.Column(db.Integer, primary_key=True)
    execucao_id      = db.Column(db.Integer, db.ForeignKey('pop_execucoes.id', ondelete='CASCADE'), index=True)
    template_id      = db.Column(db.Integer, db.ForeignKey('pop_templates.id', ondelete='CASCADE'), index=True)
    lista_tarefa_id  = db.Column(db.Integer, db.ForeignKey('pop_lista_tarefas.id', ondelete='SET NULL'), nullable=True)

    # Snapshot desnormalizado do template
    titulo           = db.Column(db.String(200))
    descricao        = db.Column(db.Text, nullable=True)
    tipo_verificacao = db.Column(db.Enum(TipoVerificacao), nullable=True)
    ordem            = db.Column(db.Integer)

    # Conclusão
    concluido    = db.Column(db.Boolean, default=False)
    concluido_em = db.Column(db.DateTime, nullable=True)

    # Medição (para MEDICAO e TEMPERATURA)
    valor_medido   = db.Column(db.Numeric(10, 2), nullable=True)
    unidade_medicao = db.Column(db.String(50), nullable=True)
    dentro_padrao  = db.Column(db.Boolean, nullable=True)  # True se min <= valor <= max

    # Foto
    foto_url  = db.Column(db.String(500), nullable=True)
    foto_path = db.Column(db.String(500), nullable=True)

    # Desvios
    observacoes       = db.Column(db.Text, nullable=True)
    tem_desvio        = db.Column(db.Boolean, default=False)
    descricao_desvio  = db.Column(db.Text, nullable=True)
    acao_corretiva    = db.Column(db.Text, nullable=True)

    criado_em    = db.Column(db.DateTime, default=brasilia_now)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now)
```

---

## Endpoints

### Admin (`@admin_required()`)

#### Configurações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/pop-configuracoes` | Obter configuração do restaurante |
| PUT | `/api/admin/pop-configuracoes` | Atualizar auto-arquivamento |

#### Categorias
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/pop-categorias` | Listar categorias |
| POST | `/api/admin/pop-categorias` | Criar categoria |
| PUT | `/api/admin/pop-categorias/<id>` | Atualizar |
| DELETE | `/api/admin/pop-categorias/<id>` | Deletar |

#### Templates
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/pop-templates` | Listar (`?categoria_id=&area_id=&tipo_verificacao=&rapida=&ativo=`) |
| POST | `/api/admin/pop-templates` | Criar template |
| PUT | `/api/admin/pop-templates/<id>` | Atualizar |
| DELETE | `/api/admin/pop-templates/<id>` | Deletar |
| PATCH | `/api/admin/pop-templates/<id>/toggle-ativo` | Ativar/desativar |

#### Listas POP
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/pop-listas` | Listar |
| POST | `/api/admin/pop-listas` | Criar lista com templates |
| GET | `/api/admin/pop-listas/<id>` | Detalhe |
| PUT | `/api/admin/pop-listas/<id>` | Atualizar |
| DELETE | `/api/admin/pop-listas/<id>` | Soft delete |
| POST | `/api/admin/pop-listas/<id>/restore` | Restaurar deletada |

#### Tarefas da Lista
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/pop-listas/<id>/tarefas` | Listar tarefas |
| POST | `/api/admin/pop-listas/<id>/tarefas` | Adicionar templates (body: `{template_ids: [...]}`) |
| DELETE | `/api/admin/pop-listas/<id>/tarefas/<tarefa_id>` | Remover tarefa |
| PUT | `/api/admin/pop-listas/<id>/tarefas/reordenar` | Reordenar (body: `{ordem: [id1, id2, ...]}`) |

#### Colaboradores da Lista
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/admin/pop-listas/<id>/colaboradores` | Atribuir (body: `{colaborador_ids: [...]}`) |
| GET | `/api/admin/pop-listas/<id>/colaboradores` | Listar atribuídos |

#### Auditoria
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/pop-execucoes` | Listar execuções (`?status=&usuario_id=&lista_id=&data_inicio=&data_fim=&include_arquivados=`) |
| GET | `/api/admin/pop-execucoes/<id>` | Detalhe com itens |
| POST | `/api/admin/pop-execucoes/<id>/revisar` | Revisar (body: `{revisado: bool, observacoes_revisao: string}`) |
| POST | `/api/admin/pop-execucoes/<id>/arquivar` | Arquivar |
| POST | `/api/admin/pop-execucoes/<id>/desarquivar` | Desarquivar |
| POST | `/api/admin/pop-execucoes/auto-archive` | Disparar auto-arquivamento manual |

---

### Colaborador (`@jwt_required()`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/collaborator/pop-listas` | Ver listas atribuídas |
| POST | `/api/collaborator/pop-execucoes` | Iniciar execução (body: `{lista_id, data_referencia?}`) |
| GET | `/api/collaborator/pop-execucoes` | Listar execuções do usuário |
| GET | `/api/collaborator/pop-execucoes/hoje` | Execuções de hoje |
| GET | `/api/collaborator/pop-execucoes/<id>` | Detalhe com itens |
| PUT | `/api/collaborator/pop-execucoes/<id>/itens/<item_id>` | Atualizar item |
| POST | `/api/collaborator/pop-execucoes/<id>/itens/<item_id>/foto` | Upload de foto (multipart) |
| POST | `/api/collaborator/pop-execucoes/<id>/finalizar` | Finalizar execução |

---

## Fluxo Completo de Execução

```
1. CRIAR TEMPLATE (Admin)
   - POPTemplate criado com tipo_verificacao, criticidade, valores min/max
   - rapida=True para templates de atividade rápida

2. CRIAR LISTA (Admin)
   - POPLista criada com recorrência (diaria/semanal/mensal/sob_demanda)
   - Selecionar templates → cria POPListaTarefa com ordem
   - obrigatoria=True impede finalizar se não concluída
   - Atribuir colaboradores (M2M)
   - publico=True → todos os colaboradores podem ver

3. INICIAR EXECUÇÃO (Colaborador)
   - POST /collaborator/pop-execucoes { lista_id, data_referencia }
   - Cria POPExecucao (status=EM_ANDAMENTO)
   - Para cada template ativo na lista: cria POPExecucaoItem
   - UNIQUE: um usuário não pode iniciar duas execuções do mesmo lista/data

4. EXECUTAR TAREFAS (Colaborador)
   - checkbox: toggle concluido=True
   - medicao/temperatura: inserir valor_medido
     → sistema calcula dentro_padrao: min <= valor <= max
   - texto: preencher observacoes
   - foto: upload de arquivo
   - Qualquer tipo pode ter tem_desvio=True + descricao_desvio + acao_corretiva
   - PUT /collaborator/pop-execucoes/{id}/itens/{item_id}
   - progresso = (concluidas / total) * 100 (auto-calculado)

5. FINALIZAR (Colaborador)
   - POST /collaborator/pop-execucoes/{id}/finalizar
   - Valida: todas obrigatoria=True devem estar concluidas
   - 400 se faltarem tarefas obrigatórias
   - Define status=CONCLUIDO, finalizado_em=now
   - Permite assinatura_digital (canvas base64) e observacoes gerais

6. AUDITORIA (Admin)
   - GET /admin/pop-execucoes (com filtros)
   - Ver detalhes: medições, fotos, desvios
   - POST /admin/pop-execucoes/{id}/revisar → revisado=True
   - POST /admin/pop-execucoes/{id}/arquivar

7. AUTO-ARQUIVAMENTO
   - Acionado ao acessar GET /admin/pop-execucoes (automático)
   - Ou manual via POST /admin/pop-execucoes/auto-archive
   - Arquiva execuções com data_referencia <= (hoje - periodo_arquivamento_dias)
   - Respeita intervalo mínimo de 7 dias entre arquivamentos automáticos
```

---

## Auto-arquivamento (Lógica)

```python
def _apply_pop_auto_archive(restaurante_id, executor_id=None):
    config = get_pop_config(restaurante_id)

    if not config.auto_arquivar:
        return 0  # desabilitado

    if (now - config.ultimo_auto_arquivamento_em).days < 7:
        return 0  # muito cedo

    limite = now.date() - timedelta(days=config.periodo_arquivamento_dias)
    execucoes = POPExecucao.query.filter(
        restaurante_id=restaurante_id,
        arquivado=False,
        data_referencia <= limite
    ).all()

    for execucao in execucoes:
        execucao.arquivado = True
        execucao.arquivado_em = now
        execucao.arquivado_por_id = executor_id

    return len(execucoes)
```

**Padrão:** 7 dias de retenção antes de arquivar.

---

## Tipos de Verificação (Resumo)

| Tipo | Input | Validação | Campos |
|------|-------|-----------|--------|
| **checkbox** | Toggle boolean | Simples sim/não | `concluido` |
| **medicao** | Campo numérico | min/max → `dentro_padrao` | `valor_medido`, `dentro_padrao` |
| **temperatura** | Campo numérico | min/max (°C) | `valor_medido`, `dentro_padrao` |
| **foto** | Upload de arquivo | — | `foto_url`, `foto_path` |
| **texto** | Textarea | Texto livre | `observacoes` |

**Desvios:** Qualquer tipo pode ter `tem_desvio=True` + `descricao_desvio` + `acao_corretiva`.

---

## Recorrência

| Recorrência | `dias_semana` | Disponibilidade |
|-------------|--------------|-----------------|
| DIARIA | ignorado | Todos os dias |
| SEMANAL | "1,2,3,4,5" (Seg=1, Dom=7) | Nos dias especificados |
| MENSAL | ignorado | Uma vez por mês |
| SOB_DEMANDA | ignorado | Apenas manualmente |

---

## Regras de Negócio

1. Todas as tarefas `obrigatoria=True` devem estar concluídas antes de finalizar
2. Medições com `valor_minimo` e `valor_maximo`: sistema calcula `dentro_padrao` automaticamente
3. Colaboradores só veem listas atribuídas a eles (exceto se `publico=True`)
4. Não é possível iniciar duas execuções para o mesmo usuário/lista/data
5. POPLista usa soft delete (`deletado=True`) — pode ser restaurada
6. `progresso` é recalculado a cada atualização de item
7. Somente ADMIN/SUPER_ADMIN podem revisar e arquivar execuções

---

## Telas do Frontend

### POPTemplates.tsx (`/admin/pop-templates`)
- Seção 1: Templates padrão (tabela): Título | Tipo | Criticidade | Categoria | Área | Status | Ações
  - Modal de criação/edição: todos os campos do template
  - Tipo de verificação como radio buttons
- Seção 2: Atividades Rápidas (rapida=True): formulário simples
  - Botão "Promover" converte para template padrão (rapida=False)

### POPListas.tsx (`/admin/pop-listas`)
- Grid de cards: nome, descrição, recorrência, total de tarefas e colaboradores
- Modal "Criar Lista" com 2 abas:
  - Aba 1 (Informações): nome, descrição, categoria, área, recorrência, dias, horário, publico
  - Aba 2 (Tarefas): seleção de templates com busca/filtro por categoria/área/tipo

### ExecutarPOPChecklist.tsx (`/collaborator/pop-execucoes/:id`)
- Cabeçalho: nome da lista, data_referencia, barra de progresso
- Grade de itens: cada card com campos condicionais por tipo_verificacao
- Campos de desvio (tem_desvio, descricao, acao_corretiva) em todos os tipos
- Botão finalizar (verifica obrigatórias antes de enviar)

### POPAuditoria.tsx (`/admin/pop-auditoria`)
- Seção de configuração: toggle auto_arquivar, input periodo_arquivamento_dias
- Tabela de execuções: lista | usuário | status | data | revisado | arquivado | ações
- Filtros: status, data_inicio, data_fim, usuario_id
- Modal de revisão: textarea observacoes_revisao

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` (linhas 739-1138) | Modelos POP completos |
| `backend/kaizen_app/controllers.py` (linhas 214-570) | Endpoints admin e collaborator |
| `backend/kaizen_app/services.py` (linhas 10604-11477) | Lógica de negócio POP |
| `frontend/src/features/admin/POPTemplates.tsx` | Gestão de templates |
| `frontend/src/features/admin/POPListas.tsx` | Gestão de listas |
| `frontend/src/features/collaborator/ExecutarPOPChecklist.tsx` | Execução do colaborador |
| `frontend/src/features/admin/POPAuditoria.tsx` | Auditoria e revisão |
