/**
 * Configurações - Página de configurações do sistema
 *
 * FUNCIONALIDADES:
 * - Configurar timeout de sessão (em minutos)
 * - Slider com visualização em tempo real
 * - Salvar configuração no localStorage
 * - Aplicar automaticamente no próximo login
 */

import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCog,
    faArrowLeft,
    faClock,
    faInfoCircle,
    faSave,
    faTimes,
    faCheckCircle,
    faUser,
    faSignOutAlt,
    faKey,
    faTrashAlt,
    faDatabase,
    faExclamationTriangle,
    faPlus,
    faDownload,
    faFileArchive,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import InstallPWA from '../../components/InstallPWA';
import styles from './Configuracoes.module.css';

const Configuracoes: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [sessionTimeout, setSessionTimeout] = useState(30); // Padrão: 30 minutos
    const [showSuccess, setShowSuccess] = useState(false);
    const [showClearDbModal, setShowClearDbModal] = useState(false);
    const [clearDbPassword, setClearDbPassword] = useState('');
    const [clearDbLoading, setClearDbLoading] = useState(false);
    const [clearDbError, setClearDbError] = useState('');
    const [populateLoading, setPopulateLoading] = useState(false);
    const [, setPopulateSuccess] = useState(false);

    // Estados para exportação em lote
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [exportSelection, setExportSelection] = useState({
        usuarios: true,
        listas: true,
        itens: true,
        fornecedores: true,
        areas: true,
        pedidos: true,
        cotacoes: true,
        estoque: true,
    });

    // Carregar configuração salva ao montar componente
    useEffect(() => {
        const savedTimeout = localStorage.getItem('configSessionTimeout');
        if (savedTimeout) {
            setSessionTimeout(parseInt(savedTimeout, 10));
        }
    }, []);

    const handleSave = () => {
        // Salvar configuração no localStorage
        localStorage.setItem('configSessionTimeout', sessionTimeout.toString());

        // Mostrar mensagem de sucesso
        setShowSuccess(true);

        // Esconder mensagem após 3 segundos
        setTimeout(() => {
            setShowSuccess(false);
        }, 3000);

        console.log('[CONFIG] Configuracao salva:', {
            sessionTimeout: sessionTimeout,
            sessionTimeoutMs: sessionTimeout * 60 * 1000,
        });
    };

    const handleCancel = () => {
        // Voltar ao dashboard sem salvar
        navigate('/admin');
    };

    const handleReset = () => {
        // Resetar para o padrão (30 minutos)
        setSessionTimeout(30);
        localStorage.setItem('configSessionTimeout', '30');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleEditProfile = () => {
        // Navegar para página de editar perfil (a ser implementada)
        navigate('/admin/editar-perfil');
    };

    const handleChangePassword = () => {
        // Navegar para página de mudar senha
        navigate('/admin/mudar-senha');
    };

    const handleOpenClearDbModal = () => {
        setShowClearDbModal(true);
        setClearDbPassword('');
        setClearDbError('');
    };

    const handleCloseClearDbModal = () => {
        setShowClearDbModal(false);
        setClearDbPassword('');
        setClearDbError('');
    };

    const handleClearDatabase = async () => {
        if (!clearDbPassword) {
            setClearDbError('Por favor, digite sua senha para confirmar');
            return;
        }

        setClearDbLoading(true);
        setClearDbError('');

        try {
            const response = await api.post('/admin/database/clear', {
                senha: clearDbPassword
            });
            console.log('Clear DB response:', response);

            // Sucesso - mostrar mensagem e fechar modal
            setShowClearDbModal(false);
            setShowSuccess(true);
            setClearDbPassword('');

            setTimeout(() => {
                setShowSuccess(false);
            }, 5000);

        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Erro ao limpar banco de dados';
            setClearDbError(errorMsg);
        } finally {
            setClearDbLoading(false);
        }
    };

    const handlePopulateDatabase = async () => {
        setPopulateLoading(true);

        try {
            const response = await api.post('/admin/database/populate');
            console.log('Populate DB response:', response);
            setPopulateSuccess(true);

            // Sucesso - mostrar mensagem
            setShowSuccess(true);

            setTimeout(() => {
                setShowSuccess(false);
            }, 5000);

        } catch (error: any) {
            alert('Erro ao popular banco de dados: ' + (error.response?.data?.error || error.message));
        } finally {
            setPopulateLoading(false);
        }
    };

    const handleOpenExportModal = () => {
        setShowExportModal(true);
    };

    const handleCloseExportModal = () => {
        setShowExportModal(false);
    };

    const handleToggleExportItem = (key: keyof typeof exportSelection) => {
        setExportSelection(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSelectAllExport = () => {
        const allSelected = Object.values(exportSelection).every(v => v);
        const newValue = !allSelected;

        setExportSelection({
            usuarios: newValue,
            listas: newValue,
            itens: newValue,
            fornecedores: newValue,
            areas: newValue,
            pedidos: newValue,
            cotacoes: newValue,
            estoque: newValue,
        });
    };

    const handleExportData = async () => {
        const selectedTypes = Object.entries(exportSelection)
            .filter(([_, selected]) => selected)
            .map(([type, _]) => type);

        if (selectedTypes.length === 0) {
            alert('Selecione pelo menos um tipo de dado para exportar');
            return;
        }

        setExportLoading(true);

        try {
            const response = await api.post('/admin/database/export-bulk', {
                tipos_dados: selectedTypes
            }, {
                responseType: 'blob' // Importante para download de arquivos
            });

            // Criar URL do blob e fazer download
            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Nome do arquivo com timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `kaizen_export_${timestamp}.zip`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Fechar modal e mostrar sucesso
            setShowExportModal(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (error: any) {
            alert('Erro ao exportar dados: ' + (error.response?.data?.error || error.message));
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Container fluid>
                {/* Header com botão voltar */}
                <div className={styles.pageHeader}>
                    <div>
                        <Link to="/admin" className={styles.backButton}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Voltar ao Dashboard
                        </Link>
                        <h1 className={styles.pageTitle}>
                            <FontAwesomeIcon icon={faCog} style={{ marginRight: '1rem', color: '#95a5a6' }} />
                            Configurações do Sistema
                        </h1>
                        <p className={styles.pageSubtitle}>
                            Configure parâmetros globais do sistema
                        </p>
                    </div>
                </div>

                {/* Alert de sucesso */}
                {showSuccess && (
                    <Alert className={styles.successAlert}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                        Configuração salva com sucesso! As alterações serão aplicadas no próximo login.
                    </Alert>
                )}

                {/* Card de Conta do Usuário */}
                <div className={styles.configCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <FontAwesomeIcon icon={faUser} />
                        </div>
                        <div>
                            <h3 className={styles.cardTitle}>Conta do Usuário</h3>
                            <p className={styles.cardDescription}>
                                Gerencie suas informações pessoais e segurança da conta
                            </p>
                        </div>
                    </div>

                    <div className={styles.userActions}>
                        <Button
                            variant="outline-primary"
                            className={styles.userActionButton}
                            onClick={handleEditProfile}
                        >
                            <FontAwesomeIcon icon={faUser} style={{ marginRight: '0.5rem' }} />
                            Editar Perfil
                        </Button>

                        <Button
                            variant="outline-warning"
                            className={styles.userActionButton}
                            onClick={handleChangePassword}
                        >
                            <FontAwesomeIcon icon={faKey} style={{ marginRight: '0.5rem' }} />
                            Mudar Senha
                        </Button>

                        <Button
                            variant="outline-danger"
                            className={styles.userActionButton}
                            onClick={handleLogout}
                        >
                            <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '0.5rem' }} />
                            Sair da Conta
                        </Button>
                    </div>
                </div>

                {/* Card de Instalação do PWA */}
                <InstallPWA />

                {/* Card de Timeout de Sessão */}
                <div className={styles.configCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <FontAwesomeIcon icon={faClock} />
                        </div>
                        <div>
                            <h3 className={styles.cardTitle}>Timeout de Sessão</h3>
                            <p className={styles.cardDescription}>
                                Defina por quanto tempo um usuário pode permanecer logado sem atividade
                            </p>
                        </div>
                    </div>

                    <Form>
                        <Form.Group className={styles.formGroup}>
                            <Form.Label className={styles.formLabel}>
                                <FontAwesomeIcon icon={faClock} />
                                Tempo de Sessão
                            </Form.Label>

                            <Form.Select
                                value={sessionTimeout}
                                onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))}
                                className={styles.timeoutSelect}
                            >
                                <option value={5}>5 minutos - Alta segurança</option>
                                <option value={10}>10 minutos - Alta segurança</option>
                                <option value={15}>15 minutos - Alta segurança</option>
                                <option value={30}>30 minutos - Padrão (recomendado)</option>
                                <option value={45}>45 minutos - Balanceado</option>
                                <option value={60}>60 minutos - Conveniência</option>
                                <option value={90}>90 minutos - Conveniência</option>
                                <option value={120}>120 minutos - Máximo</option>
                            </Form.Select>

                            <div className={styles.helpText}>
                                <FontAwesomeIcon icon={faInfoCircle} />
                                Após {sessionTimeout} minutos de inatividade, o usuário será desconectado automaticamente.
                            </div>
                        </Form.Group>

                        {/* Informações adicionais */}
                        <div className={styles.infoBox}>
                            <FontAwesomeIcon icon={faInfoCircle} className={styles.infoIcon} />
                            <div>
                                <strong>Recomendações de Segurança:</strong>
                                <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.2rem' }}>
                                    <li><strong>5-15 minutos:</strong> Ambientes com dados sensíveis ou acesso compartilhado</li>
                                    <li><strong>30 minutos:</strong> Uso corporativo padrão (balanceado)</li>
                                    <li><strong>60-120 minutos:</strong> Ambientes seguros e privados</li>
                                </ul>
                            </div>
                        </div>

                        {/* Botões de ação */}
                        <div className={styles.actionButtons}>
                            <Button
                                variant="outline-secondary"
                                className={styles.cancelButton}
                                onClick={handleCancel}
                            >
                                <FontAwesomeIcon icon={faTimes} style={{ marginRight: '0.5rem' }} />
                                Cancelar
                            </Button>

                            <Button
                                variant="warning"
                                onClick={handleReset}
                                style={{
                                    background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                                    border: 'none',
                                    color: 'white',
                                }}
                            >
                                Resetar Padrão
                            </Button>

                            <Button
                                variant="primary"
                                className={styles.saveButton}
                                onClick={handleSave}
                            >
                                <FontAwesomeIcon icon={faSave} style={{ marginRight: '0.5rem' }} />
                                Salvar Configuração
                            </Button>
                        </div>
                    </Form>
                </div>

                {/* Card de Banco de Dados */}
                <div className={styles.configCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon} style={{ backgroundColor: '#e74c3c' }}>
                            <FontAwesomeIcon icon={faDatabase} />
                        </div>
                        <div>
                            <h3 className={styles.cardTitle}>Gerenciamento de Banco de Dados</h3>
                            <p className={styles.cardDescription}>
                                Ferramentas avançadas para manutenção do banco de dados
                            </p>
                        </div>
                    </div>

                    <div style={{ padding: '1.5rem 0' }}>
                        <Alert variant="info" style={{ marginBottom: '1rem' }}>
                            <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '0.5rem' }} />
                            <strong>Popular com Dados Fictícios:</strong> Adiciona fornecedores, listas, itens e estoques para teste. Colaboradores NÃO são vinculados automaticamente.
                        </Alert>

                        <Alert variant="warning" style={{ marginBottom: '1rem' }}>
                            <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '0.5rem' }} />
                            <strong>Limpar Banco:</strong> Remove todos os dados exceto usuários. Ação irreversível!
                        </Alert>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Button
                                variant="success"
                                onClick={handlePopulateDatabase}
                                disabled={populateLoading}
                                style={{
                                    background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                                    border: 'none',
                                }}
                            >
                                {populateLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} />
                                        Populando...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '0.5rem' }} />
                                        Popular com Dados Fictícios
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="primary"
                                onClick={handleOpenExportModal}
                                disabled={exportLoading}
                                style={{
                                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                    border: 'none',
                                }}
                            >
                                <FontAwesomeIcon icon={faDownload} style={{ marginRight: '0.5rem' }} />
                                Exportar Dados
                            </Button>

                            <Button
                                variant="danger"
                                onClick={handleOpenClearDbModal}
                                disabled={populateLoading}
                                style={{
                                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                    border: 'none',
                                }}
                            >
                                <FontAwesomeIcon icon={faTrashAlt} style={{ marginRight: '0.5rem' }} />
                                Limpar Banco de Dados
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Modal de Confirmação para Limpar Banco de Dados */}
                <Modal show={showClearDbModal} onHide={handleCloseClearDbModal} centered>
                    <Modal.Header closeButton style={{ borderBottom: '2px solid #e74c3c' }}>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#e74c3c', marginRight: '0.5rem' }} />
                            Confirmar Limpeza do Banco de Dados
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Alert variant="danger">
                            <h5><strong>⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!</strong></h5>
                            <p>Todos os dados serão permanentemente removidos, exceto:</p>
                            <ul>
                                <li>✅ Usuários e suas credenciais</li>
                            </ul>
                            <p style={{ marginTop: '1rem' }}><strong>Dados que serão APAGADOS:</strong></p>
                            <ul>
                                <li>❌ Todas as listas de compras</li>
                                <li>❌ Todos os itens e estoques</li>
                                <li>❌ Todos os fornecedores</li>
                                <li>❌ Todas as áreas</li>
                                <li>❌ Todos os pedidos e cotações</li>
                            </ul>
                        </Alert>

                        <Form.Group>
                            <Form.Label><strong>Digite sua senha para confirmar:</strong></Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Digite sua senha"
                                value={clearDbPassword}
                                onChange={(e) => setClearDbPassword(e.target.value)}
                                isInvalid={!!clearDbError}
                                disabled={clearDbLoading}
                            />
                            <Form.Control.Feedback type="invalid">
                                {clearDbError}
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={handleCloseClearDbModal}
                            disabled={clearDbLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleClearDatabase}
                            disabled={clearDbLoading || !clearDbPassword}
                        >
                            {clearDbLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} />
                                    Limpando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faTrashAlt} style={{ marginRight: '0.5rem' }} />
                                    Confirmar Limpeza
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Modal de Exportação de Dados */}
                <Modal show={showExportModal} onHide={handleCloseExportModal} centered size="lg">
                    <Modal.Header closeButton style={{ borderBottom: '2px solid #3498db' }}>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faFileArchive} style={{ color: '#3498db', marginRight: '0.5rem' }} />
                            Exportar Dados do Sistema
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Alert variant="info">
                            <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '0.5rem' }} />
                            <strong>Selecione os dados que deseja exportar:</strong>
                            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                Os dados selecionados serão exportados em formato CSV dentro de um arquivo ZIP.
                            </p>
                        </Alert>

                        <Form>
                            <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #ecf0f1' }}>
                                <Form.Check
                                    type="checkbox"
                                    id="select-all-export"
                                    label={<strong>Selecionar Todos</strong>}
                                    checked={Object.values(exportSelection).every(v => v)}
                                    onChange={handleSelectAllExport}
                                    style={{ fontSize: '1.1rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <Form.Check
                                    type="checkbox"
                                    id="export-usuarios"
                                    label="👥 Usuários"
                                    checked={exportSelection.usuarios}
                                    onChange={() => handleToggleExportItem('usuarios')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    id="export-listas"
                                    label="📋 Listas de Compras"
                                    checked={exportSelection.listas}
                                    onChange={() => handleToggleExportItem('listas')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    id="export-itens"
                                    label="📦 Itens"
                                    checked={exportSelection.itens}
                                    onChange={() => handleToggleExportItem('itens')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    id="export-fornecedores"
                                    label="🏢 Fornecedores"
                                    checked={exportSelection.fornecedores}
                                    onChange={() => handleToggleExportItem('fornecedores')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    id="export-areas"
                                    label="🏭 Áreas"
                                    checked={exportSelection.areas}
                                    onChange={() => handleToggleExportItem('areas')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    id="export-pedidos"
                                    label="📝 Pedidos"
                                    checked={exportSelection.pedidos}
                                    onChange={() => handleToggleExportItem('pedidos')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    id="export-cotacoes"
                                    label="💰 Cotações"
                                    checked={exportSelection.cotacoes}
                                    onChange={() => handleToggleExportItem('cotacoes')}
                                />
                                <Form.Check
                                    type="checkbox"
                                    id="export-estoque"
                                    label="📊 Estoque"
                                    checked={exportSelection.estoque}
                                    onChange={() => handleToggleExportItem('estoque')}
                                />
                            </div>
                        </Form>

                        <Alert variant="success" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                            <strong>
                                {Object.values(exportSelection).filter(v => v).length} tipo(s) de dados selecionado(s)
                            </strong>
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={handleCloseExportModal}
                            disabled={exportLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleExportData}
                            disabled={exportLoading || Object.values(exportSelection).every(v => !v)}
                            style={{
                                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                border: 'none',
                            }}
                        >
                            {exportLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} />
                                    Exportando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faDownload} style={{ marginRight: '0.5rem' }} />
                                    Baixar ZIP
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default Configuracoes;
