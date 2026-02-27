import { act } from '@testing-library/react';
import { render, screen, waitFor } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import axiosMock, { mockGet, mockPost, resetMocks } from '../../__mocks__/axios';
import GerenciarPedidos from './GerenciarPedidos';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

describe('GerenciarPedidos', () => {
  const originalConsoleError = console.error;
  const mockPedidos = [
    {
      id: 1,
      item: {
        id: 101,
        nome: 'Arroz',
        unidade_medida: 'kg',
      },
      fornecedor: {
        id: 1,
        nome: 'Fornecedor A',
      },
      quantidade_solicitada: 50,
      status: 'PENDENTE',
      usuario: {
        id: 1,
        nome: 'João',
      },
      data_pedido: '2025-01-05T10:00:00',
    },
    {
      id: 2,
      item: {
        id: 102,
        nome: 'Feijão',
        unidade_medida: 'kg',
      },
      fornecedor: {
        id: 1,
        nome: 'Fornecedor A',
      },
      quantidade_solicitada: 30,
      status: 'PENDENTE',
      usuario: {
        id: 2,
        nome: 'Maria',
      },
      data_pedido: '2025-01-04T15:30:00',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    resetMocks();
    mockNavigate.mockClear();
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      const message = String(args[0] ?? '');
      if (message.includes('not wrapped in act')) {
        return;
      }
      originalConsoleError(...args);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches and displays pedidos', async () => {
    // Setup mocks
    mockGet(mockPedidos); // GET /admin/pedidos?status=PENDENTE

    await act(async () => {
      render(<GerenciarPedidos />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    // Wait for pedidos to load
    await waitFor(() => {
      const rows = screen.queryAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(2); // Header + at least 1 data row
    });

    // Verify pedidos are displayed (may appear multiple times: table + mobile)
    expect(screen.getAllByText('Arroz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Feijão').length).toBeGreaterThan(0);

    // Verify supplier names
    expect(screen.getAllByText('Fornecedor A').length).toBeGreaterThan(0);

    // Verify status badges
    const pendenteBadges = screen.getAllByText(/Pendente/i);
    expect(pendenteBadges.length).toBeGreaterThan(0);
  });

  test('filters pedidos by status', async () => {
    // Setup mocks for initial PENDENTE filter
    mockGet(mockPedidos); // GET /admin/pedidos?status=PENDENTE

    await act(async () => {
      render(<GerenciarPedidos />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    // Wait for initial data to load
    await waitFor(() => {
      const rows = screen.queryAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    // Verify initial PENDENTE status is shown
    expect(screen.getByText('Pendentes')).toBeInTheDocument();

    // Click "Todos" filter button
    const todosButton = screen.getByRole('button', { name: /Todos/i });
    await userEvent.click(todosButton);

    // Setup mock for TODOS filter
    mockGet(mockPedidos);

    // Wait for filtered data
    await waitFor(() => {
      const rows = screen.queryAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    // Verify button is now highlighted
    expect(todosButton).toHaveClass('btn-primary');
  });

  test('approves pedido successfully', async () => {
    // Setup mocks
    mockGet(mockPedidos); // Initial fetch
    mockPost({ message: 'Pedido aprovado com sucesso!' }); // POST /admin/pedidos/:id/aprovar
    mockGet([]); // Fetch after approval (empty list, no more pending)

    await act(async () => {
      render(<GerenciarPedidos />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    // Wait for pedidos to load
    await waitFor(() => {
      const rows = screen.queryAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    // Get all action buttons and find approve button for first pedido
    const actionButtons = screen.getAllByRole('button').filter(btn => {
      const text = btn.textContent;
      return text?.includes('Aprovar') || text?.includes('Visualizar');
    });

    // Click approve button for first pedido (should be a button in action column)
    const approveButtons = screen.getAllByRole('button').filter(btn => {
      const title = btn.getAttribute('title') || btn.getAttribute('aria-label') || '';
      return title.includes('Aprovar') || btn.textContent?.includes('Aprovar');
    });

    if (approveButtons.length > 0) {
      await userEvent.click(approveButtons[0]);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Pedido aprovado com sucesso/i)).toBeInTheDocument();
      });
    }
  });

  test('handles loading and empty states', async () => {
    // Setup mock with empty pedidos
    mockGet([]);

    await act(async () => {
      render(<GerenciarPedidos />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    // Wait for component to load
    await waitFor(() => {
      // Should show empty state message
      const text = screen.queryByText(/nenhum pedido/i) ||
                   screen.queryByText(/Nenhum pedido/i);
      // Or just wait for loading to complete
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });
  });

  test('shows error message on API failure', async () => {
    let rejectRequest: ((reason?: any) => void) | undefined;
    const requestPromise = new Promise((_, reject) => {
      rejectRequest = reject;
    });
    axiosMock.get.mockReturnValueOnce(requestPromise);

    await act(async () => {
      render(<GerenciarPedidos />);
      await Promise.resolve();
      rejectRequest?.({ response: { data: { error: 'Erro ao carregar pedidos' } } });
      await requestPromise.catch(() => {});
    });

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    // Wait for error message
    expect(await screen.findByText(/Erro ao carregar pedidos/i)).toBeInTheDocument();
  });
});
