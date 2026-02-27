import { render, screen } from '../../test-utils';
import Login from './Login';

test('renders login form', () => {
  render(<Login />);

  // Check if input fields are in the document
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/senha/i);
  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();

  // Check if submit button is in the document
  const submitButton = screen.getByRole('button', { name: /entrar/i });
  expect(submitButton).toBeInTheDocument();
});
