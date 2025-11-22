/**
 * Minhas Listas - Página para o colaborador gerenciar suas listas de compras
 * Mostra todas as listas atribuídas e permite navegar para editar cada uma
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Spinner, Alert, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faClipboardList, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './MinhasListas.module.css';

interface Lista {
    id: number;
    nome: string;
    descricao?: string;
}

const MinhasListas: React.FC = () => {
    const navigate = useNavigate();
    const [listas, setListas] = useState<Lista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMinhasListas();
    }, []);

    const fetchMinhasListas = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/collaborator/minhas-listas');
            setListas(response.data.listas || []);
        } catch (err: any) {
            setError('Erro ao carregar suas listas');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className={styles.container}>
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate('/collaborator')}
                className="mb-3"
            >
                <FontAwesomeIcon icon={faArrowLeft} /> Voltar ao Dashboard
            </Button>

            <div className={styles.header}>
                <h2><FontAwesomeIcon icon={faClipboardList} /> Minhas Compras</h2>
                <p>Gerenciar suas listas de compras atribuídas</p>
            </div>

            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    {error}
                </Alert>
            )}

            {loading ? (
                <div className={styles.loadingContainer}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </Spinner>
                </div>
            ) : listas.length === 0 ? (
                <Alert variant="info">
                    Nenhuma lista atribuída no momento
                </Alert>
            ) : (
                <Row className="g-4">
                    {listas.map((lista) => (
                        <Col lg={6} key={lista.id} className="mb-3">
                            <Card
                                className={styles.listaCard}
                                onClick={() => navigate(`/collaborator/lista/${lista.id}/estoque`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <Card.Body>
                                    <div className={styles.listaCardContent}>
                                        <div>
                                            <Card.Title className={styles.listaCardTitle}>
                                                {lista.nome}
                                            </Card.Title>
                                            {lista.descricao && (
                                                <Card.Text className={styles.listaCardDescricao}>
                                                    {lista.descricao}
                                                </Card.Text>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/collaborator/lista/${lista.id}/estoque`);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faArrowRight} /> Editar
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default MinhasListas;
