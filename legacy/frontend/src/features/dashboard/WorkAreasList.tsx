import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faExclamationCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import Spinner from '../../components/Spinner';

interface Area {
    id: number;
    nome: string;
    has_pending_items?: boolean;
}

const WorkAreasList: React.FC = () => {
    const [areas, setAreas] = useState<Area[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAreas = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await api.get('/v1/areas');
                const areasWithStatus = await Promise.all(
                    response.data.map(async (area: Area) => {
                        const statusResponse = await api.get(`/v1/areas/${area.id}/status`);
                        return { ...area, has_pending_items: statusResponse.data.has_pending_items };
                    })
                );
                setAreas(areasWithStatus);
            } catch (err) {
                setError('Não foi possível carregar as áreas de trabalho. Tente recarregar a página.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAreas();
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return <Spinner />;
        }

        if (error) {
            return <Alert variant="danger">{error}</Alert>;
        }

        if (areas.length === 0) {
            return (
                <div className="text-center p-5 bg-light rounded">
                    <FontAwesomeIcon icon={faMapMarkerAlt} size="4x" className="text-muted mb-3" />
                    <h3>Nenhuma área disponível</h3>
                    <p className="text-muted">Parece que nenhuma área de estoque foi cadastrada ainda. Por favor, peça a um administrador para configurar as áreas do sistema.</p>
                </div>
            );
        }

        return (
            <Row className="g-4">
                {areas.map(area => (
                    <Col md={6} lg={4} key={area.id}>
                        <Card as={Link} to={`/area/${area.id}/estoque`} className="h-100 text-decoration-none text-dark shadow-sm card-hover">
                            <Card.Body className="text-center p-4 d-flex flex-column justify-content-center">
                                <div className="d-flex justify-content-center align-items-center mb-3">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} size="3x" className="text-primary me-2" />
                                    {area.has_pending_items !== undefined && (
                                        <FontAwesomeIcon 
                                            icon={area.has_pending_items ? faExclamationCircle : faCheckCircle} 
                                            className={area.has_pending_items ? "text-warning" : "text-success"} 
                                            size="2x" 
                                        />
                                    )}
                                </div>
                                <Card.Title as="h4">{area.nome}</Card.Title>
                                <Card.Text className="text-muted small">
                                    Clique aqui para preencher a lista de estoque desta área.
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    };

    return (
        <div>
            <h2 className="fs-2 mb-4">Áreas de Trabalho</h2>
            {renderContent()}
        </div>
    );
};

export default WorkAreasList;