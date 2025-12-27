# 🚀 Implementação: Copiar/Mover Itens entre Listas

## ✅ STATUS DA IMPLEMENTAÇÃO

### Backend: ✅ COMPLETO (Commit: bd475d6)

**Endpoints criados:**
- `POST /admin/listas/:id/itens/copiar`
- `POST /admin/listas/:id/itens/mover`

**Funcionalidades:**
- ✅ Copia/move itens mantendo configurações
- ✅ Suporta criar nova lista ou usar existente
- ✅ Ignora duplicatas
- ✅ Retorna lista de itens ignorados
- ✅ Logs detalhados
- ✅ Tratamento de exceções robusto

---

## 🎨 Frontend: ⏳ EM ANDAMENTO

### Arquivo: `GerenciarItensLista.tsx`

### Modificações Necessárias:

#### 1. **Novos Estados:**
```typescript
const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
const [showCopiarModal, setShowCopiarModal] = useState(false);
const [showMoverModal, setShowMoverModal] = useState(false);
const [showResultModal, setShowResultModal] = useState(false);
const [resultado, setResultado] = useState<any>(null);
const [listas, setListas] = useState<Lista[]>([]);
const [tipoOperacao, setTipoOperacao] = useState<'existente' | 'nova'>('existente');
const [listaDestinoId, setListaDestinoId] = useState<number | null>(null);
const [nomeNovaLista, setNomeNovaLista] = useState('');
const [areaId, setAreaId] = useState<number | null>(null);
const [areas, setAreas] = useState<Area[]>([]);
```

#### 2. **Adicionar Checkbox na Tabela:**
```typescript
<thead>
    <tr>
        <th className="text-center">
            <Form.Check
                type="checkbox"
                checked={itensSelecionados.size === itensAdicionados.length && itensAdicionados.length > 0}
                onChange={handleSelecionarTodos}
            />
        </th>
        <th>Item</th>
        <th>Unidade</th>
        <th>Qtd. Mínima</th>
        <th>Ação</th>
    </tr>
</thead>
<tbody>
    {itensAdicionados.map((item) => (
        <tr key={item.estoque_id}>
            <td className="text-center">
                <Form.Check
                    type="checkbox"
                    checked={itensSelecionados.has(item.item_id)}
                    onChange={() => handleToggleSelecao(item.item_id)}
                />
            </td>
            {/* ... resto das colunas ... */}
        </tr>
    ))}
</tbody>
```

#### 3. **Adicionar Botões no Cabeçalho:**
```typescript
<Row className="mb-3">
    <Col md={12}>
        <div className="d-flex gap-2 flex-wrap">
            <Button
                variant="primary"
                onClick={handleOpenCopiar}
                disabled={itensSelecionados.size === 0}
            >
                <FontAwesomeIcon icon={faCopy} /> Copiar para Lista ({itensSelecionados.size})
            </Button>
            <Button
                variant="warning"
                onClick={handleOpenMover}
                disabled={itensSelecionados.size === 0}
            >
                <FontAwesomeIcon icon={faExchange} /> Mover para Lista ({itensSelecionados.size})
            </Button>
            <Button
                variant="success"
                onClick={() => setShowModal(true)}
            >
                <FontAwesomeIcon icon={faPlus} /> Adicionar Itens
            </Button>
            <Button variant="outline-secondary" onClick={() => setShowModal(true)}>
                <FontAwesomeIcon icon={faFileImport} /> Importar Itens
            </Button>
        </div>
    </Col>
</Row>
```

#### 4. **Modal de Copiar/Mover:**
```typescript
<Modal show={showCopiarModal || showMoverModal} onHide={handleCloseModal} size="lg">
    <Modal.Header closeButton>
        <Modal.Title>
            {showCopiarModal ? 'Copiar' : 'Mover'} Itens para Outra Lista
        </Modal.Title>
    </Modal.Header>
    <Modal.Body>
        <Form.Group className="mb-3">
            <Form.Label>Destino</Form.Label>
            <div>
                <Form.Check
                    type="radio"
                    label="Lista Existente"
                    checked={tipoOperacao === 'existente'}
                    onChange={() => setTipoOperacao('existente')}
                    className="mb-2"
                />
                <Form.Check
                    type="radio"
                    label="Criar Nova Lista"
                    checked={tipoOperacao === 'nova'}
                    onChange={() => setTipoOperacao('nova')}
                />
            </div>
        </Form.Group>

        {tipoOperacao === 'existente' ? (
            <Form.Group>
                <Form.Label>Selecione a Lista</Form.Label>
                <Form.Select
                    value={listaDestinoId || ''}
                    onChange={(e) => setListaDestinoId(Number(e.target.value))}
                >
                    <option value="">Escolha uma lista...</option>
                    {listas
                        .filter(l => l.id !== Number(listaId))
                        .map(lista => (
                            <option key={lista.id} value={lista.id}>
                                {lista.nome}
                            </option>
                        ))}
                </Form.Select>
            </Form.Group>
        ) : (
            <>
                <Form.Group className="mb-3">
                    <Form.Label>Nome da Nova Lista</Form.Label>
                    <Form.Control
                        type="text"
                        value={nomeNovaLista}
                        onChange={(e) => setNomeNovaLista(e.target.value)}
                        placeholder="Ex: Lista Cozinha"
                    />
                </Form.Group>
                <Form.Group>
                    <Form.Label>Área</Form.Label>
                    <Form.Select
                        value={areaId || ''}
                        onChange={(e) => setAreaId(Number(e.target.value))}
                    >
                        <option value="">Escolha uma área...</option>
                        {areas.map(area => (
                            <option key={area.id} value={area.id}>
                                {area.nome}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </>
        )}
    </Modal.Body>
    <Modal.Footer>
        <Button variant="secondary" onClick={handleCloseModal}>
            Cancelar
        </Button>
        <Button
            variant={showCopiarModal ? 'primary' : 'warning'}
            onClick={handleConfirmarOperacao}
            disabled={
                tipoOperacao === 'existente' ? !listaDestinoId : (!nomeNovaLista || !areaId)
            }
        >
            {showCopiarModal ? 'Copiar' : 'Mover'} Itens
        </Button>
    </Modal.Footer>
</Modal>
```

#### 5. **Modal de Resultado:**
```typescript
<Modal show={showResultModal} onHide={() => setShowResultModal(false)}>
    <Modal.Header closeButton>
        <Modal.Title>
            <FontAwesomeIcon
                icon={resultado?.itens_ignorados > 0 ? faExclamationTriangle : faCheckCircle}
                className="me-2"
            />
            Operação Concluída
        </Modal.Title>
    </Modal.Header>
    <Modal.Body>
        <Alert variant="success">
            {resultado?.message}
        </Alert>

        {resultado?.itens_ignorados > 0 && (
            <Alert variant="warning">
                <strong>Itens Ignorados ({resultado.itens_ignorados}):</strong>
                <ul className="mb-0 mt-2">
                    {resultado.itens_ignorados_lista.map((nome: string, idx: number) => (
                        <li key={idx}>{nome}</li>
                    ))}
                </ul>
            </Alert>
        )}
    </Modal.Body>
    <Modal.Footer>
        <Button variant="primary" onClick={() => setShowResultModal(false)}>
            Fechar
        </Button>
    </Modal.Footer>
</Modal>
```

#### 6. **Funções de Handler:**
```typescript
const handleSelecionarTodos = () => {
    if (itensSelecionados.size === itensAdicionados.length) {
        setItensSelecionados(new Set());
    } else {
        setItensSelecionados(new Set(itensAdicionados.map(i => i.item_id)));
    }
};

const handleToggleSelecao = (itemId: number) => {
    const novaSelecao = new Set(itensSelecionados);
    if (novaSelecao.has(itemId)) {
        novaSelecao.delete(itemId);
    } else {
        novaSelecao.add(itemId);
    }
    setItensSelecionados(novaSelecao);
};

const handleOpenCopiar = () => {
    setShowCopiarModal(true);
    carregarListasEAreas();
};

const handleOpenMover = () => {
    setShowMoverModal(true);
    carregarListasEAreas();
};

const carregarListasEAreas = async () => {
    try {
        const [listasRes, areasRes] = await Promise.all([
            api.get('/v1/listas'),
            api.get('/v1/areas')
        ]);
        setListas(listasRes.data);
        setAreas(areasRes.data);
    } catch (err) {
        console.error('Erro ao carregar listas/áreas:', err);
    }
};

const handleConfirmarOperacao = async () => {
    try {
        setSaving(true);
        setError(null);

        const payload = {
            item_ids: Array.from(itensSelecionados),
            lista_destino_id: tipoOperacao === 'existente' ? listaDestinoId : null,
            nome_nova_lista: tipoOperacao === 'nova' ? nomeNovaLista : null,
            area_id: tipoOperacao === 'nova' ? areaId : null
        };

        const endpoint = showCopiarModal ? 'copiar' : 'mover';
        const response = await api.post(
            `/admin/listas/${listaId}/itens/${endpoint}`,
            payload
        );

        setResultado(response.data);
        setShowResultModal(true);
        setShowCopiarModal(false);
        setShowMoverModal(false);
        setItensSelecionados(new Set());

        // Recarregar dados se foi mover
        if (showMoverModal) {
            await fetchDados();
        }
    } catch (err: any) {
        setError(err.response?.data?.error || 'Erro na operação');
    } finally {
        setSaving(false);
    }
};

const handleCloseModal = () => {
    setShowCopiarModal(false);
    setShowMoverModal(false);
    setTipoOperacao('existente');
    setListaDestinoId(null);
    setNomeNovaLista('');
    setAreaId(null);
};
```

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Implementar estados e interfaces
2. ✅ Adicionar checkboxes na tabela
3. ✅ Adicionar botões de ação
4. ✅ Criar modais de copiar/mover
5. ✅ Criar modal de resultado
6. ✅ Implementar handlers
7. ⏳ Testar funcionalidade completa
8. ⏳ Ajustar estilos CSS
9. ⏳ Validações e tratamento de erros

---

## 🎯 CRITÉRIOS DE SUCESSO

- [ ] Usuário consegue selecionar múltiplos itens
- [ ] Botões habilitam/desabilitam conforme seleção
- [ ] Modal mostra opções de lista existente ou nova
- [ ] Copiar mantém itens na origem
- [ ] Mover remove itens da origem
- [ ] Modal de resultado mostra itens ignorados
- [ ] Interface similar à submissão de lista
- [ ] Responsivo e acessível

---

**Branch:** `copiar-mover-itens`
**Última Atualização:** 27/12/2024 03:45 (BRT)
