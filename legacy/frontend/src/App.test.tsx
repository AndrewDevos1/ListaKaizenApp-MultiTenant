import { render, screen } from './test-utils';
import App from './App';

test('renders kaizen lists title', () => {
  // App has its own BrowserRouter, so we don't need MemoryRouter
  render(<App />, { withoutRouter: true });
  const titleElement = screen.getByText(/kaizen lists/i);
  expect(titleElement).toBeInTheDocument();
});
