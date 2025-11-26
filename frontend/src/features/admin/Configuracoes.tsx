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
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
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
    const [populateSuccess, setPopulateSuccess] = useState(false);

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

            // Sucesso - mostrar mensagem
            setPopulateSuccess(true);
            setShowSuccess(true);

            setTimeout(() => {
                setPopulateSuccess(false);
                setShowSuccess(false);
            }, 5000);

        } catch (error: any) {
            alert('Erro ao popular banco de dados: ' + (error.response?.data?.error || error.message));
        } finally {
            setPopulateLoading(false);
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
                                Tempo de Sessão (minutos)
                            </Form.Label>

                            <div className={styles.rangeContainer}>
                                <div className={styles.rangeValue}>
                                    {sessionTimeout} minutos
                                </div>

                                <Form.Range
                                    min={5}
                                    max={120}
                                    step={5}
                                    value={sessionTimeout}
                                    onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))}
                                />

                                <div className={styles.helpText}>
                                    <FontAwesomeIcon icon={faInfoCircle} />
                                    Após {sessionTimeout} minutos de inatividade, o usuário será desconectado automaticamente.
                                </div>
                            </div>
                        </Form.Group>

                        {/* Informações adicionais */}
                        <div className={styles.helpText}>
                            <FontAwesomeIcon icon={faInfoCircle} />
                            <div>
                                <strong>Valores recomendados:</strong>
                                <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                    <li>5-15 minutos: Alta segurança (áreas sensíveis)</li>
                                    <li>30 minutos: Padrão (balanceado)</li>
                                    <li>60-120 minutos: Conveniência (ambiente confiável)</li>
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

                {/* Card de informações adicionais */}
                <div className={styles.configCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <FontAwesomeIcon icon={faInfoCircle} />
                        </div>
                        <div>
                            <h3 className={styles.cardTitle}>Como Funciona</h3>
                            <p className={styles.cardDescription}>
                                Entenda o sistema de timeout de sessão
                            </p>
                        </div>
                    </div>

                    <div style={{ color: '#7f8c8d', lineHeight: '1.8' }}>
                        <p>
                            <strong>O que acontece quando o tempo expira?</strong>
                        </p>
                        <ul>
                            <li>O sistema verifica automaticamente a expiração da sessão a cada 1 minuto</li>
                            <li>Quando o tempo configurado é atingido, o usuário é desconectado automaticamente</li>
                            <li>O token de autenticação é removido do navegador</li>
                            <li>O usuário é redirecionado para a página de login</li>
                        </ul>

                        <p style={{ marginTop: '1rem' }}>
                            <strong>Funcionalidade "Lembrar-me":</strong>
                        </p>
                        <ul>
                            <li>Se o usuário marcou "Lembrar-me" no login, o email ficará preenchido automaticamente</li>
                            <li>A senha NUNCA é armazenada por questões de segurança</li>
                            <li>O usuário precisará digitar apenas a senha novamente</li>
                        </ul>
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
            </Container>
        </div>
    );
};

export default Configuracoes;
