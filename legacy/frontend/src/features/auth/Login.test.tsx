import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

beforeEach(() => {
  jest.spyOn(api, 'get').mockResolvedValue({ data: { usuarios: [] } } as any);
});

test('renders login form', async () => {
  render(
    <AuthProvider>
      <Router>
        <Login />
      </Router>
    </AuthProvider>
  );

  await waitFor(() => {
    expect(api.get).toHaveBeenCalled();
  });
  
  // Verifica se os campos de input estão na tela
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/senha/i);
  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();

  // Verifica se o botão de submit está na tela
  const submitButton = screen.getByRole('button', { name: /entrar/i });
  expect(submitButton).toBeInTheDocument();
});
