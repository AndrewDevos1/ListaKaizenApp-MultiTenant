
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';

interface Area {
    id: number;
    nome: string;
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
                const response = await api.get('/api/v1/areas');
                setAreas(response.data);
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
            return (
                <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </Spinner>
                </div>
            );
        }

        if (error) {
            return <Alert variant="danger">{error}</Alert>;
        }

        if (areas.length === 0) {
            return (
                <div className="text-center p-5 bg-light rounded">
                    <i className="fas fa-box-open fa-4x text-muted mb-3"></i>
                    <h3>Nenhuma área disponível</h3>
                    <p className="text-muted">Parece que nenhuma área de estoque foi cadastrada ainda. Por favor, peça a um administrador para configurar as áreas do sistema.</p>
                </div>
            );
        }

        return (
            <Row className="g-4">
                {areas.map(area => (
                    <Col md={6} lg={4} key={area.id}>
                        <Card as={Link} to={`/area/${area.id}/estoque`} className="h-100 text-decoration-none text-dark card-hover shadow-sm">
                            <Card.Body className="text-center p-4 d-flex flex-column justify-content-center">
                                <i className="fas fa-map-marker-alt fa-3x text-primary mb-3"></i>
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
