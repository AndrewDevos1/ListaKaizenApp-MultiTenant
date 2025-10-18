import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row, Alert, Button, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import Layout from '../../components/Layout';

interface Area {
    id: number;
    nome: string;
}

const Dashboard: React.FC = () => {
    const [areas, setAreas] = useState<Area[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchAreas = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await api.get('/v1/areas');
                setAreas(response.data);
            } catch (err) {
                setError('Não foi possível carregar as áreas.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAreas();
    }, []);

    return (
        <Layout title="Dashboard">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Selecione uma área para começar</h3>
                <Link to="/me/submissions">
                    <Button variant="outline-primary">
                        <i className="fas fa-clipboard-list me-2"></i>Ver Minhas Submissões
                    </Button>
                </Link>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="g-4">
                {isLoading ? (
                    <Col className="text-center">
                        <Spinner animation="border" />
                    </Col>
                ) : areas.length > 0 ? (
                    areas.map(area => (
                        <Col md={6} lg={4} key={area.id}>
                            <Card as={Link} to={`/area/${area.id}/estoque`} className="h-100 text-decoration-none text-dark">
                                <Card.Body className="text-center d-flex flex-column justify-content-center">
                                    <i className="fas fa-map-marker-alt fa-3x text-primary mb-3"></i>
                                    <Card.Title as="h4">{area.nome}</Card.Title>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                ) : (
                    <Col>
                        <p>Nenhuma área de estoque encontrada. Entre em contato com um administrador.</p>
                    </Col>
                )}
            </Row>
        </Layout>
    );
};

export default Dashboard;
