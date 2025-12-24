/**
 * Backend Heartbeat Service
 * Mantém o backend ativo fazendo ping periódico
 * Útil para serverless deployments (ex: Railway)
 */

// Usar variável de ambiente ou fallback para Railway
const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '')
    || process.env.REACT_APP_API_BASE_URL
    || 'https://kaizen-lists-api-production.up.railway.app';
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos em milissegundos

let heartbeatIntervalId: NodeJS.Timeout | null = null;

/**
 * Inicia o heartbeat para manter o backend ativo
 */
export const startBackendHeartbeat = () => {
    if (heartbeatIntervalId) {
        console.log('[Heartbeat] Heartbeat já está ativo');
        return;
    }

    console.log('[Heartbeat] Iniciando heartbeat do backend');

    // Fazer ping imediato
    pingBackend();

    // Configurar intervalo de ping
    heartbeatIntervalId = setInterval(() => {
        pingBackend();
    }, PING_INTERVAL);
};

/**
 * Para o heartbeat
 */
export const stopBackendHeartbeat = () => {
    if (heartbeatIntervalId) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
        console.log('[Heartbeat] Heartbeat parado');
    }
};

/**
 * Faz ping no backend
 */
const pingBackend = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            const now = new Date().toLocaleTimeString('pt-BR');
            console.log(`[Heartbeat] ✓ Backend ativo em ${now}`);
        } else {
            console.log(`[Heartbeat] ⚠ Backend respondeu com status: ${response.status}`);
        }
    } catch (error) {
        const now = new Date().toLocaleTimeString('pt-BR');
        console.warn(`[Heartbeat] ✗ Erro ao pingar backend em ${now}:`, error);
    }
};

/**
 * Abre o backend em uma nova aba (útil para ativar o dyno no Render)
 * Mantém o foco na aba atual
 */
export const openBackendInNewTab = () => {
    try {
        window.open(BACKEND_URL, '_blank', 'noopener,noreferrer');
        // Manter o foco na aba atual (login)
        window.focus();
        console.log('[Heartbeat] Aba do backend aberta em background:', BACKEND_URL);
    } catch (error) {
        console.error('[Heartbeat] Erro ao abrir aba do backend:', error);
    }
};

const backendHeartbeat = {
    startBackendHeartbeat,
    stopBackendHeartbeat,
    openBackendInNewTab,
};

export default backendHeartbeat;
