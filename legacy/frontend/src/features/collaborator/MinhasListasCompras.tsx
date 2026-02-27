/**
 * Minhas Listas de Compras - Visão do Colaborador
 *
 * Exibe listas de compras atribuídas ao colaborador
 * com opção de preencher/submeter cada lista
 */

import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingCart,
    faEdit,
    faClipboardList,
    faChevronRight,
    faExclamationTriangle,
    faCheckCircle,
    faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatarDataBrasiliaSemHora } from '../../utils/dateFormatter';
import styles from './MinhasListasCompras.module.css';

// Interfaces TypeScript
interface Lista {
    id: number;
    nome: string;
    descricao: string | null;
    data_criacao: string;
}

const MinhasListasCompras: React.FC = () => {
    const navigate = useNavigate();
    
    // Estados principais
    const [listas, setListas] = useState<Lista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Buscar minhas listas do backend
    const fetchMinhasListas = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/collaborator/minhas-listas');
            setListas(response.data.listas || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar listas');
            console.error('Erro ao buscar listas:', err);
        } finally {
            setLoading(false);
        }
    };

    // useEffect para carregar listas na montagem
    useEffect(() => {
        fetchMinhasListas();
    }, []);

    // Fecha mensagens de sucesso após 5 segundos
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Função para formatar data
    const formatarData = (data: string): string => {
        try {
            return formatarDataBrasiliaSemHora(data);
        } catch {
            return 'Data inválida';
        }
    };

    // Renderizar estado de carregamento
    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </Container>
        );
    }

    return (
        <Container fluid className={`py-4 ${styles.container}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => navigate('/collaborator')}
                        className="mb-3"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} /> Voltar ao Dashboard
                    </Button>
                    
                    <h1>
                        <FontAwesomeIcon icon={faShoppingCart} /> Minhas Listas de Compras
                    </h1>
                    <p className="text-muted">
                        Listas atribuídas a você. Clique em "Preencher" para atualizar as quantidades.
                    </p>
                </div>
            </div>

            {/* Mensagens */}
            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </Alert>
            )}

            {successMessage && (
                <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
                    <FontAwesomeIcon icon={faCheckCircle} /> {successMessage}
                </Alert>
            )}

            {/* Listas vazias */}
            {listas.length === 0 ? (
                <Alert variant="info" className="text-center py-5">
                    <FontAwesomeIcon icon={faClipboardList} size="2x" />
                    <p className="mt-3 mb-0">Você ainda não tem listas atribuídas</p>
                </Alert>
            ) : (
                <Row className="g-4">
                    {listas.map((lista) => (
                        <Col lg={4} md={6} key={lista.id} className="d-flex">
                            <Card className={`w-100 ${styles.listaCard}`}>
                                {/* Card Body */}
                                <Card.Body className={styles.cardBody}>
                                    {/* Ícone e Título */}
                                    <div className={styles.cardHeader}>
                                        <FontAwesomeIcon icon={faClipboardList} className={styles.cardIcon} />
                                        <h5 className={styles.cardTitle}>{lista.nome}</h5>
                                    </div>

                                    {/* Descrição */}
                                    {lista.descricao && (
                                        <p className={styles.cardDescription}>{lista.descricao}</p>
                                    )}

                                    {/* Data de criação */}
                                    <div className={styles.cardMeta}>
                                        <small className="text-muted">
                                            Criada em: {formatarData(lista.data_criacao)}
                                        </small>
                                    </div>
                                </Card.Body>

                                {/* Card Footer com Botão */}
                                <Card.Footer className={styles.cardFooter}>
                                    <Link
                                        to={`/collaborator/listas/${lista.id}/estoque`}
                                        className="w-100"
                                    >
                                        <Button variant="primary" size="sm" className="w-100">
                                            <FontAwesomeIcon icon={faEdit} /> Preencher
                                            <FontAwesomeIcon icon={faChevronRight} className="ms-2" />
                                        </Button>
                                    </Link>
                                </Card.Footer>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default MinhasListasCompras;
