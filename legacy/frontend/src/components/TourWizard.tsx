import React, { useCallback, useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/users';
import styles from './TourWizard.module.css';

interface WizardAction {
  label: string;
  href?: string;
  variant?: 'outline' | 'default';
}

interface WizardStep {
  key: string;
  title: string;
  description: string;
  actions?: WizardAction[];
}

const WIZARD_VERSION = 2;
const WIZARD_STATUS_KEY = 'dashboardTour';
const WIZARD_STORAGE_KEY = 'wizard.dashboardTour.v2';

const WIZARD_STEPS: WizardStep[] = [
  {
    key: 'admin-header',
    title: 'Dashboard administrativo',
    description: 'Aqui voce ve o panorama geral e os atalhos principais da operacao.',
  },
  {
    key: 'admin-edit-mode',
    title: 'Organizar cards',
    description: 'Use este botao para reordenar os cards e salvar sua organizacao.',
  },
  {
    key: 'admin-widgets',
    title: 'Indicadores principais',
    description: 'Cards com os numeros mais importantes do dia.',
  },
  {
    key: 'admin-widget-lists',
    title: 'Card de listas',
    description: 'Acesso rapido para gerenciar listas de compras.',
  },
  {
    key: 'admin-widget-items',
    title: 'Card de itens e insumos',
    description: 'Atalho para o catalogo global e cadastro de itens.',
  },
  {
    key: 'admin-widget-submissions',
    title: 'Card de solicitacoes',
    description: 'Visualize as submissões pendentes para analise.',
  },
  {
    key: 'admin-quick-actions',
    title: 'Acoes rapidas',
    description: 'Botoes diretos para tarefas frequentes do admin.',
  },
  {
    key: 'admin-quick-users',
    title: 'Gerenciar usuarios',
    description: 'Aprovar, editar ou desativar usuarios.',
  },
  {
    key: 'admin-quick-suppliers',
    title: 'Fornecedores',
    description: 'Cadastre e acompanhe fornecedores.',
  },
  {
    key: 'admin-quick-submissions',
    title: 'Gerenciar submissões',
    description: 'Revise pedidos enviados pelos colaboradores.',
  },
  {
    key: 'admin-quick-cotacoes',
    title: 'Cotações',
    description: 'Acesse a area de cotacoes e analises.',
  },
  {
    key: 'admin-quick-config',
    title: 'Configuracoes',
    description: 'Ajustes do sistema e preferencias do admin.',
  },
  {
    key: 'admin-status-list',
    title: 'Status das listas',
    description: 'Acompanhe pendencias e situacao das listas por area.',
  },
  {
    key: 'admin-status-consolidacao',
    title: 'Ver consolidacao',
    description: 'Abre a lista mae consolidada para revisao.',
  },
  {
    key: 'admin-status-aprovar',
    title: 'Aprovar todos',
    description: 'Aprova todos os pedidos da lista selecionada.',
  },
  {
    key: 'admin-status-analisar',
    title: 'Analisar lista rapida',
    description: 'Abre a lista rapida para avaliacao detalhada.',
  },
  {
    key: 'admin-recent-activities',
    title: 'Atividades recentes',
    description: 'Historico das ultimas movimentacoes do sistema.',
  },
  {
    key: 'nav-profile',
    title: 'Perfil do usuario',
    description: 'Identificacao do usuario logado e funcao.',
  },
  {
    key: 'nav-search',
    title: 'Busca no menu',
    description: 'Procure rapidamente por telas e atalhos.',
  },
  {
    key: 'nav-notifications',
    title: 'Notificacoes',
    description: 'Veja alertas e novidades do sistema.',
  },
  {
    key: 'nav-collapse',
    title: 'Recolher menu',
    description: 'Comprima ou expanda o menu lateral.',
  },
  {
    key: 'nav-menu',
    title: 'Itens do menu',
    description: 'Acesse todas as funcionalidades pelo menu lateral.',
  },
  {
    key: 'nav-logout',
    title: 'Sair',
    description: 'Encerra a sessao atual com seguranca.',
  },
  {
    key: 'nav-darkmode',
    title: 'Modo escuro',
    description: 'Alterna entre modo claro e escuro.',
  },
  {
    key: 'nav-tour',
    title: 'Tour da aplicacao',
    description: 'Reinicie o tour sempre que quiser revisar as dicas.',
  },
  {
    key: 'nav-config',
    title: 'Configuracoes',
    description: 'Acesso rapido as configuracoes do usuario e do sistema.',
  },
  {
    key: 'nav-tab',
    title: 'Aba do menu (mobile)',
    description: 'No celular, use esta aba para abrir e fechar o menu.',
  },
];

const TourWizard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mostrarWizard, setMostrarWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const persistWizardStatus = useCallback(
    async (status: 'completed' | 'skipped') => {
      if (!user) return;
      try {
        await usersApi.updateWizardStatus({
          [WIZARD_STATUS_KEY]: {
            version: WIZARD_VERSION,
            status,
            completed: status === 'completed',
            lastStep: wizardStep,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('[Wizard] erro ao persistir status:', error);
      }
    },
    [user, wizardStep]
  );

  const handleWizardClose = useCallback(
    (status: 'completed' | 'skipped') => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(WIZARD_STORAGE_KEY, 'done');
      }
      setMostrarWizard(false);
      setWizardStep(0);
      void persistWizardStatus(status);
    },
    [persistWizardStatus]
  );

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      setMostrarWizard(false);
      return;
    }

    const localDone = localStorage.getItem(WIZARD_STORAGE_KEY) === 'done';
    const backendStatus = user.wizard_status?.[WIZARD_STATUS_KEY];
    const backendDone = backendStatus?.completed && backendStatus?.version >= WIZARD_VERSION;

    if (!localDone && !backendDone) {
      setWizardStep(0);
      setMostrarWizard(true);
    } else {
      setMostrarWizard(false);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleWizardStart = () => {
      if (!user) return;
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      setWizardStep(0);
      setMostrarWizard(true);
    };

    window.addEventListener('wizard-start', handleWizardStart);
    return () => window.removeEventListener('wizard-start', handleWizardStart);
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;

    document.querySelectorAll('.wizard-active').forEach((el) => {
      el.classList.remove('wizard-active');
    });

    if (!mostrarWizard) {
      delete root.dataset.wizardStep;
      return;
    }

    const stepKey = WIZARD_STEPS[wizardStep]?.key;
    if (!stepKey) {
      delete root.dataset.wizardStep;
      return;
    }

    root.dataset.wizardStep = stepKey;

    const target = document.querySelector(`[data-wizard-target="${stepKey}"]`);
    if (target) {
      target.classList.add('wizard-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      document.querySelectorAll('.wizard-active').forEach((el) => {
        el.classList.remove('wizard-active');
      });
    };
  }, [mostrarWizard, wizardStep]);

  useEffect(() => {
    if (!mostrarWizard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleWizardClose('skipped');
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (wizardStep === WIZARD_STEPS.length - 1) {
          handleWizardClose('completed');
        } else {
          setWizardStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mostrarWizard, wizardStep, handleWizardClose]);

  if (!mostrarWizard) {
    return null;
  }

  const currentStep = WIZARD_STEPS[wizardStep];
  if (!currentStep) {
    return null;
  }

  const isLastStep = wizardStep === WIZARD_STEPS.length - 1;
  const totalSteps = WIZARD_STEPS.length;

  return (
    <Card className={styles.tourCard} role="dialog" aria-live="polite">
      <Card.Body>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Tour guiado</div>
            <div className={styles.subtitle}>
              Passo {wizardStep + 1} de {totalSteps}
            </div>
          </div>
          <Button
            variant="link"
            size="sm"
            className={styles.skipButton}
            onClick={() => handleWizardClose('skipped')}
          >
            Pular tour
          </Button>
        </div>

        <div className={styles.stepBadge}>
          <Badge bg="secondary">Passo {wizardStep + 1}</Badge>
        </div>

        <div className={styles.stepContent}>
          <h5 className={styles.stepTitle}>{currentStep.title}</h5>
          <p className={styles.stepDescription}>{currentStep.description}</p>
        </div>

        {currentStep.actions && currentStep.actions.length > 0 && (
          <div className={styles.actionRow}>
            {currentStep.actions.map((action) => (
              <Button
                key={`${currentStep.key}-${action.label}`}
                variant={action.variant === 'outline' ? 'outline-primary' : 'primary'}
                size="sm"
                onClick={() => {
                  if (!action.href || action.href === '#') {
                    return;
                  }
                  navigate(action.href);
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <div className={styles.navigationRow}>
          {wizardStep > 0 && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setWizardStep((prev) => Math.max(prev - 1, 0))}
            >
              Voltar
            </Button>
          )}
          {isLastStep ? (
            <Button size="sm" onClick={() => handleWizardClose('completed')}>
              Concluir
            </Button>
          ) : (
            <Button size="sm" onClick={() => setWizardStep((prev) => Math.min(prev + 1, totalSteps - 1))}>
              Próximo
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default TourWizard;
