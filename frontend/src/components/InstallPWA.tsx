import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faMobileAlt, faDesktop } from '@fortawesome/free-solid-svg-icons';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isInstallable, setIsInstallable] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detectar se é mobile
        const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(checkMobile);

        // Verificar se já está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Capturar evento beforeinstallprompt (Chrome/Edge desktop)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
            console.log('[PWA] beforeinstallprompt capturado');
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Detectar quando o app foi instalado
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App instalado!');
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Desktop: Mostrar prompt nativo do navegador
            try {
                await deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('[PWA] Usuário aceitou instalar');
                } else {
                    console.log('[PWA] Usuário recusou instalar');
                }
                
                setDeferredPrompt(null);
                setIsInstallable(false);
            } catch (error) {
                console.error('[PWA] Erro ao instalar:', error);
            }
        } else {
            // Mobile ou navegador que não suporta prompt: Mostrar instruções
            setShowInstructions(true);
        }
    };

    const handleCloseInstructions = () => {
        setShowInstructions(false);
    };

    // Se já está instalado, não mostrar nada
    if (isInstalled) {
        return null;
    }

    return (
        <>
            <Card className="mb-3">
                <Card.Body>
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <h5 className="mb-1">
                                <FontAwesomeIcon icon={isMobile ? faMobileAlt : faDesktop} className="me-2" />
                                Instalar Aplicativo
                            </h5>
                            <p className="text-muted mb-0">
                                Adicione o Kaizen à sua tela inicial para acesso rápido e offline
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleInstallClick}
                            className="ms-3"
                        >
                            <FontAwesomeIcon icon={faDownload} className="me-2" />
                            Instalar
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Modal com Instruções Mobile */}
            <Modal show={showInstructions} onHide={handleCloseInstructions} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faMobileAlt} className="me-2" />
                        Como Instalar o App
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/iPhone|iPad|iPod/.test(navigator.userAgent) ? (
                        // Instruções para iOS
                        <>
                            <Alert variant="info">
                                <strong>📱 iOS (Safari)</strong>
                            </Alert>
                            <ol>
                                <li>Toque no botão <strong>Compartilhar</strong> <span style={{ fontSize: '1.2em' }}>⎋</span> na barra inferior</li>
                                <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                                <li>Confirme o nome e toque em <strong>"Adicionar"</strong></li>
                                <li>O ícone do Kaizen aparecerá na sua tela inicial!</li>
                            </ol>
                        </>
                    ) : (
                        // Instruções para Android
                        <>
                            <Alert variant="success">
                                <strong>📱 Android (Chrome)</strong>
                            </Alert>
                            <ol>
                                <li>Toque no menu <strong>(⋮)</strong> no canto superior direito</li>
                                <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong></li>
                                <li>Confirme o nome e toque em <strong>"Adicionar"</strong></li>
                                <li>O ícone do Kaizen aparecerá na sua tela inicial!</li>
                            </ol>
                        </>
                    )}
                    
                    <Alert variant="warning" className="mt-3">
                        <small>
                            <strong>Nota:</strong> Certifique-se de estar usando o navegador {/iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Safari' : 'Chrome'} para instalar o app.
                        </small>
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseInstructions}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default InstallPWA;
