/**
 * HomePage - Página Inicial do Kaizen Lists
 *
 * DESIGN:
 * - Visual moderno com gradiente animado
 * - Card centralizado com informações do sistema
 * - Botão destacado para fazer login
 * - Totalmente responsivo
 *
 * FUNCIONALIDADE:
 * - Apresentação do sistema
 * - Redirecionamento para login
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStream,
    faCheckCircle,
    faChartLine,
    faUsers,
    faSignInAlt
} from '@fortawesome/free-solid-svg-icons';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: faCheckCircle,
            title: 'Gestão Simplificada',
            description: 'Gerencie listas de estoque de forma prática e eficiente',
        },
        {
            icon: faChartLine,
            title: 'Cotações Inteligentes',
            description: 'Compare preços e gere pedidos automaticamente',
        },
        {
            icon: faUsers,
            title: 'Colaboração',
            description: 'Trabalhe em equipe com controle de aprovações',
        },
    ];

    return (
        <div className={styles.homeWrapper}>
            <Container>
                <Row className="justify-content-center">
                    <Col xs={12} md={10} lg={8}>
                        {/* Hero Section */}
                        <div className={styles.heroSection}>
                            <div className={styles.logoContainer}>
                                <FontAwesomeIcon
                                    icon={faStream}
                                    className={styles.logoIcon}
                                />
                            </div>

                            <h1 className={styles.mainTitle}>Kaizen Lists</h1>

                            <p className={styles.subtitle}>
                                Otimizando seu fluxo, um item de cada vez
                            </p>

                            <p className={styles.description}>
                                Sistema completo para gestão de estoque, cotações e pedidos.
                                Simplifique seu trabalho e aumente a produtividade da sua equipe.
                            </p>

                            {/* Botão Principal */}
                            <div className={styles.ctaSection}>
                                <Button
                                    size="lg"
                                    className={styles.loginButton}
                                    onClick={() => navigate('/login')}
                                >
                                    <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                                    Fazer Login
                                </Button>
                            </div>
                        </div>

                        {/* Features Grid */}
                        <Row className={`${styles.featuresGrid} g-4 mt-5`}>
                            {features.map((feature, index) => (
                                <Col key={index} md={4}>
                                    <Card className={styles.featureCard}>
                                        <Card.Body className="text-center p-4">
                                            <div className={styles.featureIcon}>
                                                <FontAwesomeIcon icon={feature.icon} />
                                            </div>
                                            <h5 className={styles.featureTitle}>
                                                {feature.title}
                                            </h5>
                                            <p className={styles.featureDescription}>
                                                {feature.description}
                                            </p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        {/* Footer */}
                        <div className={styles.footer}>
                            <small>
                                Sistema desenvolvido para otimização de processos
                            </small>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default HomePage;
