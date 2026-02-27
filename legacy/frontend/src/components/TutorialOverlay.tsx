import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import styles from './TutorialOverlay.module.css';

interface TutorialOverlayProps {
    title: string;
    steps: string[];
    onClose: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ title, steps, onClose }) => {
    return (
        <Modal show centered backdrop="static" keyboard={false}>
            <Modal.Header>
                <Modal.Title className={styles.overlayTitle}>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ol className={styles.stepList}>
                    {steps.map((step, index) => (
                        <li key={index}>{step}</li>
                    ))}
                </ol>
            </Modal.Body>
            <Modal.Footer className={styles.footerActions}>
                <Button variant="primary" onClick={onClose}>
                    Entendi
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default TutorialOverlay;
