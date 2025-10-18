import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './Login';

test('renders login form', () => {
  render(
    <Router>
      <Login />
    </Router>
  );
  
  // Verifica se os campos de input estão na tela
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/senha/i);
  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();

  // Verifica se o botão de submit está na tela
  const submitButton = screen.getByRole('button', { name: /entrar/i });
  expect(submitButton).toBeInTheDocument();
});
