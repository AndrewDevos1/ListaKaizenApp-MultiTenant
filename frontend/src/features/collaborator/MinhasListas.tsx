/**
 * Minhas Listas - Card para o dashboard do colaborador
 * Mostra as listas atribuídas e permite gerenciar estoque
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, ListGroup, Spinner, Alert, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faArrowRight } from '@fortawesome/free-solid-svg-icons';
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
        <Card className={styles.minhasListasCard}>
            <Card.Header className={styles.cardHeader}>
                <FontAwesomeIcon icon={faClipboardList} className={styles.headerIcon} />
                <h5 className={styles.cardTitle}>Minhas Listas</h5>
            </Card.Header>
            <Card.Body className={styles.cardBody}>
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <Spinner animation="border" role="status" size="sm" />
                        <span className={styles.loadingText}>Carregando listas...</span>
                    </div>
                ) : error ? (
                    <Alert variant="danger" className="mb-0">{error}</Alert>
                ) : listas.length === 0 ? (
                    <Alert variant="info" className="mb-0">
                        Nenhuma lista atribuída no momento
                    </Alert>
                ) : (
                    <ListGroup variant="flush">
                        {listas.map((lista) => (
                            <ListGroup.Item
                                key={lista.id}
                                className={styles.listaItem}
                                onClick={() => navigate(`/collaborator/lista/${lista.id}/estoque`)}
                            >
                                <div className={styles.listaContent}>
                                    <div className={styles.listaInfo}>
                                        <h6 className={styles.listaNome}>{lista.nome}</h6>
                                        {lista.descricao && (
                                            <p className={styles.listaDescricao}>{lista.descricao}</p>
                                        )}
                                    </div>
                                    <FontAwesomeIcon icon={faArrowRight} className={styles.listaArrow} />
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Card.Body>
        </Card>
    );
};

export default MinhasListas;
