// Mock users for testing
export const mockUser = {
  admin: {
    id: '1',
    role: 'ADMIN',
    nome: 'Admin Test',
    email: 'admin@test.com',
    aprovado: true,
  },
  collaborator: {
    id: '2',
    role: 'COLLABORATOR',
    nome: 'Collaborator Test',
    email: 'collab@test.com',
    aprovado: true,
  },
  superAdmin: {
    id: '3',
    role: 'SUPER_ADMIN',
    nome: 'Super Admin',
    email: 'super@test.com',
    aprovado: true,
  },
};

// Mock JWT tokens (valid JWT structure for decoding)
// These are valid JWT tokens with test data
export const mockTokens = {
  admin:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIiwibm9tZSI6IkFkbWluIFRlc3QiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIn0.test',
  collaborator:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwicm9sZSI6IkNPTExBQk9SQVRPUiIsIm5vbWUiOiJDb2xsYWJvcmF0b3IgVGVzdCIsImVtYWlsIjoiY29sbGFiQHRlc3QuY29tIn0.test',
};

// Mock API responses
export const mockApiResponses = {
  loginSuccess: (role: 'ADMIN' | 'COLLABORATOR' | 'SUPER_ADMIN') => ({
    access_token:
      mockTokens[role.toLowerCase() as keyof typeof mockTokens] ||
      mockTokens.admin,
    user:
      mockUser[role.toLowerCase() as keyof typeof mockUser] ||
      mockUser.admin,
  }),
  loginError: {
    error: 'Credenciais inválidas',
  },
  notificationsEmpty: [],
  notificationsWithData: [
    {
      id: 1,
      message: 'Test notification',
      read: false,
      created_at: '2026-01-05T10:00:00Z',
    },
  ],
};
