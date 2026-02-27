import React from 'react';
import { Card, Button, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCog, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { useTutorial } from '../../context/TutorialContext';
import styles from './Configuracoes.module.css';

const Configuracoes: React.FC = () => {
    const { enabled, enableTutorial, disableTutorial, progress } = useTutorial();

    const handleEnableTutorial = () => {
        enableTutorial(true);
    };

    return (
        <Container fluid className={styles.container}>
            <div className={styles.header}>
                <Link to="/collaborator" className={styles.backLink}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar ao Dashboard
                </Link>
                <h1 className={styles.title}>
                    <FontAwesomeIcon icon={faCog} /> Configurações
                </h1>
                <p className={styles.subtitle}>
                    Preferências pessoais e modo tutorial
                </p>
            </div>

            <Card className={styles.card}>
                <Card.Body>
                    <h2 className={styles.cardTitle}>
                        <FontAwesomeIcon icon={faInfoCircle} /> Modo Tutorial
                    </h2>
                    <p className={styles.cardText}>
                        Ative o modo tutorial para ver explicações rápidas em cada tela. O modo se desativa automaticamente ao concluir todas as telas.
                    </p>
                    <div className={styles.actions}>
                        <Button variant="primary" onClick={handleEnableTutorial}>
                            {enabled ? 'Reiniciar tutorial' : 'Ativar tutorial'}
                        </Button>
                        {enabled && (
                            <Button variant="outline-secondary" onClick={disableTutorial}>
                                Desativar
                            </Button>
                        )}
                    </div>
                    {progress.total > 0 && (
                        <div className={styles.progress}>
                            Progresso: {progress.seen} de {progress.total} telas concluídas
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Configuracoes;
