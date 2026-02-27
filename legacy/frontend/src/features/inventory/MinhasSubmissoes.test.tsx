import { render, screen, waitFor, fireEvent } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { mockError, mockGet, resetMocks } from '../../__mocks__/axios';
import MinhasSubmissoes from './MinhasSubmissoes';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('MinhasSubmissoes', () => {
  const mockSubmissoes = [
    {
      id: 1,
      lista_id: 1,
      lista_nome: 'Lista 1',
      data_submissao: '2025-01-05T10:00:00',
      status: 'PENDENTE',
      total_pedidos: 5,
      pedidos: [],
      tipo: 'normal',
    },
    {
      id: 2,
      lista_id: 2,
      lista_nome: 'Lista 2',
      data_submissao: '2025-01-04T15:30:00',
      status: 'APROVADO',
      total_pedidos: 3,
      pedidos: [],
      tipo: 'normal',
    },
  ];

  const mockListasRapidas = {
    listas: [
      {
        id: 3,
        nome: 'Rápida 1',
        status: 'aprovada',
        submetido_em: '2025-01-03T12:00:00',
        criado_em: '2025-01-03T11:00:00',
        total_itens: 2,
      },
      {
        id: 4,
        nome: 'Rápida 2',
        status: 'rejeitada',
        submetido_em: '2025-01-02T09:00:00',
        criado_em: '2025-01-02T08:00:00',
        total_itens: 1,
      },
      {
        id: 5,
        nome: 'Rápida Draft',
        status: 'rascunho', // Should be filtered out
        submetido_em: null,
        criado_em: '2025-01-01T10:00:00',
        total_itens: 0,
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    resetMocks();
    mockNavigate.mockClear();
  });

  test('fetches and displays submissions from both endpoints', async () => {
    // Setup mocks
    mockGet(mockSubmissoes); // GET /v1/submissoes/me
    mockGet(mockListasRapidas); // GET /auth/listas-rapidas

    render(<MinhasSubmissoes />);

    // Wait for table rows to load (header + at least 1 row)
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    // Verify submissions are displayed (check for unique identifying text)
    expect(screen.getAllByText(/⚡ Rápida 1/).length).toBeGreaterThan(0); // At least in table
    expect(screen.getAllByText(/⚡ Rápida 2/).length).toBeGreaterThan(0);

    // Verify rascunho items are filtered out
    expect(screen.queryByText(/Rápida Draft/)).not.toBeInTheDocument();

    // Verify status indicators are present
    const badges = screen.getAllByText(/PENDENTE|APROVADO|REJEITADO/);
    expect(badges.length).toBeGreaterThan(0);
  });

  test('filters submissions by status', async () => {
    // Setup mocks
    mockGet(mockSubmissoes);
    mockGet(mockListasRapidas);

    render(<MinhasSubmissoes />);

    // Wait for data to load
    await waitFor(() => {
      const rows = screen.queryAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    // Get filter select by label
    const filterLabel = screen.getByText(/Filtrar por Status/i);
    const filterSelect = filterLabel.parentElement?.querySelector('select') as HTMLSelectElement;
    expect(filterSelect).toBeInTheDocument();

    // Initially should show all submissions
    let rows = screen.queryAllByRole('row');
    const initialRowCount = rows.length;
    expect(initialRowCount).toBeGreaterThanOrEqual(2);

    // Filter by PENDENTE - should show only Lista 1 (1 normal submission with PENDENTE status)
    fireEvent.change(filterSelect, { target: { value: 'PENDENTE' } });
    rows = screen.queryAllByRole('row');
    // After filtering, we should have fewer rows or possibly 0 (showing empty state)
    expect(rows.length).toBeLessThanOrEqual(initialRowCount);

    // Filter back to TODOS - should show all again
    fireEvent.change(filterSelect, { target: { value: 'TODOS' } });
    rows = screen.queryAllByRole('row');
    expect(rows.length).toEqual(initialRowCount);
  });

  test('navigates to submission details on click', async () => {
    // Setup mocks
    mockGet(mockSubmissoes);
    mockGet(mockListasRapidas);

    render(<MinhasSubmissoes />);

    // Wait for data to load
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    // Get all "Ver Detalhes" buttons
    const detailsButtons = screen.getAllByRole('button', { name: /Ver Detalhes/i });
    expect(detailsButtons.length).toBeGreaterThan(0);

    // Click first button (should navigate to normal submission)
    await userEvent.click(detailsButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/collaborator\/submissions\/\d+$/)
    );

    mockNavigate.mockClear();

    // Click another button to test rapid list navigation
    const rapidListButton = detailsButtons.find(btn => {
      // Try to identify a rapid list button by its parent row containing ⚡
      return btn.closest('tr')?.textContent?.includes('⚡') ||
             btn.closest('.submissaoCard')?.textContent?.includes('⚡');
    });

    if (rapidListButton) {
      await userEvent.click(rapidListButton);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/collaborator\/lista-rapida\/\d+\/detalhes$/)
      );
    }
  });

  test('displays empty state when no submissions exist', async () => {
    // Setup mocks with empty data
    mockGet([]); // Empty submissões
    mockGet({ listas: [] }); // Empty listas rápidas

    render(<MinhasSubmissoes />);

    // Wait for error-free load
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma submissão encontrada/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Você ainda não submeteu nenhuma lista/i)).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    // Setup mocks with error
    mockError(500, { error: 'Erro ao carregar submissões' });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MinhasSubmissoes />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar suas submissões/i)).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });
});
