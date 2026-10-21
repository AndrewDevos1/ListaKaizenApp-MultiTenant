'use client';

import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { FaDownload, FaShareAlt } from 'react-icons/fa';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useToast } from '@/contexts/ToastContext';

export default function InstallAppButton() {
  const { canShow, isIOS, state, install } = usePWAInstall();
  const { success } = useToast();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!canShow) return null;

  const handleClick = async () => {
    if (isIOS || state === 'ios-safari') {
      setShowIOSModal(true);
      return;
    }
    await install();
    success('Aplicativo instalado', 'Kaizen Lists foi adicionado à sua tela inicial');
  };

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={handleClick}
        title="Instalar aplicativo"
        style={{ whiteSpace: 'nowrap' }}
      >
        <FaDownload className="me-1 d-none d-sm-inline" />
        <span className="d-none d-sm-inline">Instalar app</span>
        <span className="d-sm-none">Instalar</span>
      </Button>

      {/* Modal de instruções para iOS */}
      <Modal show={showIOSModal} onHide={() => setShowIOSModal(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Instalar no iPhone / iPad</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3 text-muted" style={{ fontSize: '0.9rem' }}>
            Para adicionar este app à sua tela inicial, siga os passos:
          </p>
          <ol className="ps-3" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
            <li>
              Toque no botão <FaShareAlt className="mx-1 text-primary" />
              <strong>Compartilhar</strong> no Safari
            </li>
            <li>
              Role para baixo e toque em{' '}
              <strong>"Adicionar à Tela de Início"</strong>
            </li>
            <li>
              Toque em <strong>Adicionar</strong> para confirmar
            </li>
          </ol>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" size="sm" onClick={() => setShowIOSModal(false)}>
            Entendi
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
