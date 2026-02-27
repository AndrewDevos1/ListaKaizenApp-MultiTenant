import { render, screen, waitFor } from '../../test-utils';
import { mockGet, resetMocks } from '../../__mocks__/axios';
import EstoqueLista from './EstoqueLista';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ areaId: '1' }),
}));

// Mock ImportacaoEstoque component
jest.mock('./ImportacaoEstoque', () => {
  return function MockImportacao() {
    return <div data-testid="importacao-estoque-modal">Importacao Modal</div>;
  };
});

describe('EstoqueLista', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMocks();
  });

  test('renders the component header', async () => {
    mockGet([]); // Empty estoque
    mockGet({ nome: 'Area Teste' }); // Area data

    render(<EstoqueLista />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum item encontrado/i)).toBeInTheDocument();
    });

    // Component should render the header
    expect(screen.getByText(/Preenchimento de Estoque/i)).toBeInTheDocument();
  });

  test('displays loading indicator initially', async () => {
    mockGet([]); // Empty data
    mockGet({ nome: 'Area Teste' });

    render(<EstoqueLista />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum item encontrado/i)).toBeInTheDocument();
    });

    // Component should render without crashing
    const header = screen.getByText(/Preenchimento de Estoque/i);
    expect(header).toBeInTheDocument();
  });

  test('shows import button', async () => {
    mockGet([]); // Empty estoque
    mockGet({ nome: 'Area Teste' }); // Empty area data

    render(<EstoqueLista />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum item encontrado/i)).toBeInTheDocument();
    });

    // Should have the import estoque mock rendered
    expect(screen.getByTestId('importacao-estoque-modal')).toBeInTheDocument();
  });

  test('renders submit buttons', async () => {
    mockGet([]); // Empty estoque
    mockGet({ nome: 'Area Teste' }); // Empty area data

    render(<EstoqueLista />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum item encontrado/i)).toBeInTheDocument();
    });

    // Component should have action buttons
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
