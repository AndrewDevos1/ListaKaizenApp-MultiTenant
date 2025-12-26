/**
 * Importação de Estoque com Preview
 * 
 * Componente para importar itens de estoque em dois formatos:
 * 1. Simples: apenas nomes
 * 2. Completo: nome + quantidade atual + quantidade mínima
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Table, Spinner, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUpload,
    faEye,
    faCheckCircle,
    faExclamationTriangle,
    faInfoCircle,
    faTimes,
    faClipboard
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

interface Area {
    id: number;
    nome: string;
}

interface Fornecedor {
    id: number;
    nome: string;
}

interface ItemPreview {
    nome: string;
    quantidade_atual: number | null;
    quantidade_minima: number | null;
}

interface PreviewResponse {
    formato: 'simples' | 'completo';
    total_itens: number;
    total_erros: number;
    itens: ItemPreview[];
    erros: string[];
}

interface ImportacaoEstoqueProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
}

const ImportacaoEstoque: React.FC<ImportacaoEstoqueProps> = ({ show, onHide, onSuccess }) => {
    // Estados
    const [texto, setTexto] = useState('');
    const [areaId, setAreaId] = useState<number | null>(null);
    const [fornecedorId, setFornecedorId] = useState<number | null>(null);
    const [atualizarExistentes, setAtualizarExistentes] = useState(true);
    const [formatoEscolhido, setFormatoEscolhido] = useState<'simples' | 'completo'>('completo');
    
    const [areas, setAreas] = useState<Area[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    
    const [loadingAreas, setLoadingAreas] = useState(false);
    const [loadingFornecedores, setLoadingFornecedores] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    
    const [preview, setPreview] = useState<PreviewResponse | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Carregar áreas e fornecedores ao abrir modal
    useEffect(() => {
        if (show) {
            fetchAreas();
            fetchFornecedores();
        }
    }, [show]);

    const fetchAreas = async () => {
        try {
            setLoadingAreas(true);
            const response = await api.get('/areas');
            setAreas(response.data);
        } catch (err: any) {
            console.error('Erro ao buscar áreas:', err);
        } finally {
            setLoadingAreas(false);
        }
    };

    const fetchFornecedores = async () => {
        try {
            setLoadingFornecedores(true);
            const response = await api.get('/fornecedores');
            setFornecedores(response.data);
        } catch (err: any) {
            console.error('Erro ao buscar fornecedores:', err);
        } finally {
            setLoadingFornecedores(false);
        }
    };

    const handlePreview = async () => {
        if (!texto.trim()) {
            setError('Cole os dados na área de texto');
            return;
        }

        try {
            setLoadingPreview(true);
            setError(null);
            
            const response = await api.post('/admin/import/preview', {
                texto: texto.trim(),
                formato_forcado: formatoEscolhido  // Força o formato escolhido
            });

            setPreview(response.data);
            setShowPreview(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao processar preview');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleExecutar = async () => {
        if (!areaId) {
            setError('Selecione uma área');
            return;
        }

        if (!fornecedorId) {
            setError('Selecione um fornecedor');
            return;
        }

        if (!texto.trim()) {
            setError('Cole os dados na área de texto');
            return;
        }

        try {
            setLoadingImport(true);
            setError(null);

            const response = await api.post('/admin/import/execute', {
                texto: texto.trim(),
                area_id: areaId,
                fornecedor_id: fornecedorId,
                atualizar_existentes: atualizarExistentes
            });

            const { total_criados, total_atualizados, total_erros } = response.data;
            
            setSuccessMessage(
                `✅ Importação concluída! 
                ${total_criados} item(ns) criado(s), 
                ${total_atualizados} atualizado(s), 
                ${total_erros} erro(s).`
            );

            setTimeout(() => {
                handleClose();
                onSuccess();
            }, 3000);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao executar importação');
        } finally {
            setLoadingImport(false);
        }
    };

    const handleClose = () => {
        setTexto('');
        setAreaId(null);
        setFornecedorId(null);
        setAtualizarExistentes(true);
        setFormatoEscolhido('completo');
        setPreview(null);
        setShowPreview(false);
        setError(null);
        setSuccessMessage(null);
        onHide();
    };

    const handleVoltarParaForm = () => {
        setShowPreview(false);
        setPreview(null);
    };

    return (
        <Modal show={show} onHide={handleClose} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FontAwesomeIcon icon={faUpload} className="me-2" />
                    Importar Itens para Estoque
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Alertas */}
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        {error}
                    </Alert>
                )}

                {successMessage && (
                    <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        {successMessage}
                    </Alert>
                )}

                {!showPreview ? (
                    /* FORMULÁRIO DE IMPORTAÇÃO */
                    <>
                        <Alert variant="info">
                            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                            <strong>Formatos aceitos:</strong>
                            <ul className="mb-0 mt-2">
                                <li><strong>Simples:</strong> Apenas nomes (um por linha)</li>
                                <li><strong>Completo:</strong> Nome [TAB] Qtd Atual [TAB] Qtd Mínima</li>
                            </ul>
                            <small className="text-muted d-block mt-2">
                                💡 Dica: Copie direto do Excel/Google Sheets!
                            </small>
                        </Alert>

                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon={faClipboard} className="me-2" />
                                    Cole os dados aqui
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={10}
                                    placeholder={`Exemplo formato simples:\nAlga Nori\nARROZ GRAO CURTO\n\nExemplo formato completo:\nAlga Nori\t\t2\t6\nARROZ GRAO CURTO\t\t7\t6`}
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    disabled={loadingPreview || loadingImport}
                                />
                                {texto.trim() && (
                                    <Form.Text className="text-muted">
                                        <FontAwesomeIcon icon={faCheckCircle} className="me-1 text-success" />
                                        {texto.trim().split('\n').length} linha(s) carregada(s)
                                    </Form.Text>
                                )}
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <strong>Formato dos Dados *</strong>
                                </Form.Label>
                                <div className="d-flex gap-3">
                                    <Form.Check
                                        type="radio"
                                        id="formato-completo"
                                        name="formato"
                                        label={
                                            <span>
                                                <strong>Completo</strong> - Nome + Qtd Atual + Qtd Mínima
                                                <br />
                                                <small className="text-muted">
                                                    Exemplo: Alga Nori[TAB]2[TAB]6
                                                </small>
                                            </span>
                                        }
                                        checked={formatoEscolhido === 'completo'}
                                        onChange={() => setFormatoEscolhido('completo')}
                                        disabled={loadingPreview || loadingImport}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="formato-simples"
                                        name="formato"
                                        label={
                                            <span>
                                                <strong>Simples</strong> - Apenas nomes
                                                <br />
                                                <small className="text-muted">
                                                    Exemplo: Alga Nori
                                                </small>
                                            </span>
                                        }
                                        checked={formatoEscolhido === 'simples'}
                                        onChange={() => setFormatoEscolhido('simples')}
                                        disabled={loadingPreview || loadingImport}
                                    />
                                </div>
                                <Form.Text className="text-muted">
                                    ⚠️ Importante: No formato <strong>Completo</strong>, separe as colunas com <strong>TAB</strong> (copie do Excel/Sheets)
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Área *</Form.Label>
                                <Form.Select
                                    value={areaId || ''}
                                    onChange={(e) => setAreaId(Number(e.target.value) || null)}
                                    disabled={loadingAreas || loadingPreview || loadingImport}
                                >
                                    <option value="">Selecione uma área</option>
                                    {areas.map(area => (
                                        <option key={area.id} value={area.id}>
                                            {area.nome}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Fornecedor *</Form.Label>
                                <Form.Select
                                    value={fornecedorId || ''}
                                    onChange={(e) => setFornecedorId(Number(e.target.value) || null)}
                                    disabled={loadingFornecedores || loadingPreview || loadingImport}
                                >
                                    <option value="">Selecione um fornecedor</option>
                                    {fornecedores.map(forn => (
                                        <option key={forn.id} value={forn.id}>
                                            {forn.nome}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Atualizar itens existentes"
                                    checked={atualizarExistentes}
                                    onChange={(e) => setAtualizarExistentes(e.target.checked)}
                                    disabled={loadingPreview || loadingImport}
                                />
                                <Form.Text className="text-muted">
                                    Se um item já existe no estoque, suas quantidades serão atualizadas
                                </Form.Text>
                            </Form.Group>
                        </Form>
                    </>
                ) : (
                    /* PREVIEW DOS DADOS */
                    <>
                        <Alert variant={preview && preview.total_erros > 0 ? 'warning' : 'success'}>
                            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                            <strong>Preview da Importação</strong>
                            <div className="mt-2">
                                <Badge bg="primary" className="me-2">
                                    Formato: {preview?.formato === 'simples' ? 'Simples' : 'Completo'}
                                </Badge>
                                <Badge bg="success" className="me-2">
                                    {preview?.total_itens} item(ns) válido(s)
                                </Badge>
                                {preview && preview.total_erros > 0 && (
                                    <Badge bg="danger">
                                        {preview.total_erros} erro(s)
                                    </Badge>
                                )}
                            </div>
                        </Alert>

                        {/* Erros encontrados */}
                        {preview && preview.erros.length > 0 && (
                            <Alert variant="danger">
                                <strong>Erros encontrados:</strong>
                                <ul className="mb-0 mt-2">
                                    {preview.erros.map((erro, idx) => (
                                        <li key={idx}><small>{erro}</small></li>
                                    ))}
                                </ul>
                            </Alert>
                        )}

                        {/* Tabela de itens */}
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <Table striped bordered hover size="sm">
                                <thead className="sticky-top bg-white">
                                    <tr>
                                        <th>#</th>
                                        <th>Nome do Item</th>
                                        {preview?.formato === 'completo' && (
                                            <>
                                                <th className="text-center">Qtd Atual</th>
                                                <th className="text-center">Qtd Mínima</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview?.itens.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td>{item.nome}</td>
                                            {preview.formato === 'completo' && (
                                                <>
                                                    <td className="text-center">
                                                        {item.quantidade_atual !== null ? item.quantidade_atual : '-'}
                                                    </td>
                                                    <td className="text-center">
                                                        {item.quantidade_minima !== null ? item.quantidade_minima : '-'}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <Alert variant="info" className="mt-3">
                            <small>
                                <strong>Configurações selecionadas:</strong><br />
                                Área: <strong>{areas.find(a => a.id === areaId)?.nome}</strong><br />
                                Fornecedor: <strong>{fornecedores.find(f => f.id === fornecedorId)?.nome}</strong><br />
                                Atualizar existentes: <strong>{atualizarExistentes ? 'Sim' : 'Não'}</strong>
                            </small>
                        </Alert>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                {!showPreview ? (
                    <>
                        <Button variant="secondary" onClick={handleClose} disabled={loadingPreview || loadingImport}>
                            <FontAwesomeIcon icon={faTimes} className="me-2" />
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handlePreview}
                            disabled={!texto.trim() || loadingPreview || loadingImport}
                        >
                            {loadingPreview ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faEye} className="me-2" />
                                    Ver Preview
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" onClick={handleVoltarParaForm} disabled={loadingImport}>
                            Voltar
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleExecutar}
                            disabled={!areaId || !fornecedorId || loadingImport}
                        >
                            {loadingImport ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                    Confirmar Importação
                                </>
                            )}
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default ImportacaoEstoque;
