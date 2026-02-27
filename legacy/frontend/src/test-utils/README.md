# Test Utilities

Custom test utilities and helpers for the Kaizen Lists frontend test suite.

## Quick Start

Instead of manually wrapping components with multiple providers:

### Before (15+ lines):
```tsx
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { TutorialProvider } from '../context/TutorialContext';

test('my test', () => {
  render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <TutorialProvider>
              <MyComponent />
            </TutorialProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
  // assertions...
});
```

### After (1 line):
```tsx
import { render, screen } from '../test-utils';

test('my test', () => {
  render(<MyComponent />);
  expect(screen.getByText('expected text')).toBeInTheDocument();
});
```

All providers are automatically configured and ready to use!

## API Reference

### `render()`

The main render function that wraps your component with all necessary providers.

```tsx
import { render, screen } from '../test-utils';

render(<MyComponent />);
```

### Custom Routes

Pass `initialRoute` to test components at different routes:

```tsx
import { render } from '../test-utils';

test('admin page', () => {
  render(<AdminComponent />, {
    providerProps: { initialRoute: '/admin' }
  });
});
```

## Mock Data

### `mockUser`

Pre-configured user objects for testing:

```tsx
import { mockUser } from '../test-utils/mock-data';

// Available roles:
// - mockUser.admin
// - mockUser.collaborator
// - mockUser.superAdmin

localStorage.setItem('accessToken', mockTokens.admin);
```

### `mockTokens`

Valid JWT tokens for testing authentication:

```tsx
import { mockTokens } from '../test-utils/mock-data';

// Available tokens:
// - mockTokens.admin
// - mockTokens.collaborator

localStorage.setItem('accessToken', mockTokens.admin);
```

### `mockApiResponses`

Pre-configured API response objects:

```tsx
import { mockApiResponses } from '../test-utils/mock-data';

// Login success response
const loginResp = mockApiResponses.loginSuccess('ADMIN');

// Error response
const errorResp = mockApiResponses.loginError;
```

## API Mocking

### Mocking Successful Requests

```tsx
import { mockGet, mockPost, resetMocks } from '../__mocks__/axios';
import { mockUser } from '../test-utils/mock-data';

beforeEach(() => {
  resetMocks();
});

test('fetches users', async () => {
  mockGet({ usuarios: [mockUser.admin] });

  render(<UserList />);

  await waitFor(() => {
    expect(screen.getByText('Admin Test')).toBeInTheDocument();
  });
});
```

### Mocking Errors

```tsx
import { mockError } from '../__mocks__/axios';

test('handles error', async () => {
  mockError(500, { message: 'Server error' });

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Available Mock Helpers

- `mockGet(data)` - Mock GET request
- `mockPost(data)` - Mock POST request
- `mockPut(data)` - Mock PUT request
- `mockPatch(data)` - Mock PATCH request
- `mockDelete(data)` - Mock DELETE request
- `mockError(status, error)` - Mock API error
- `resetMocks()` - Clear all mocks between tests

## Common Patterns

### Testing Protected Routes

```tsx
import { render, screen, waitFor } from '../test-utils';
import { mockTokens } from '../test-utils/mock-data';

test('shows protected content when authenticated', async () => {
  localStorage.setItem('accessToken', mockTokens.admin);

  render(<ProtectedComponent />);

  await waitFor(() => {
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

### Testing Form Submission

```tsx
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { mockPost } from '../__mocks__/axios';

test('submits form', async () => {
  const user = userEvent.setup();
  mockPost({ success: true });

  render(<MyForm />);

  await user.type(screen.getByLabelText('Name'), 'John');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

### Testing Admin vs Collaborator Access

```tsx
import { render, screen } from '../test-utils';
import { mockTokens } from '../test-utils/mock-data';

test('admin can access admin page', async () => {
  localStorage.setItem('accessToken', mockTokens.admin);

  render(<AdminPage />);

  expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
});

test('collaborator cannot access admin page', async () => {
  localStorage.setItem('accessToken', mockTokens.collaborator);

  render(<AdminPage />);

  expect(screen.getByText('Unauthorized')).toBeInTheDocument();
});
```

## Best Practices

1. **Reset mocks in beforeEach**

```tsx
beforeEach(() => {
  localStorage.clear();
  resetMocks();
});
```

2. **Use semantic queries**

```tsx
// Good
screen.getByRole('button', { name: /save/i });
screen.getByLabelText('Email');

// Avoid
screen.getByTestId('save-btn');
screen.getByText('email-input');
```

3. **Test behavior, not implementation**

```tsx
// Good - tests what the user sees
expect(screen.getByText('User saved successfully')).toBeInTheDocument();

// Avoid - tests internal state
expect(component.state.saved).toBe(true);
```

4. **Use waitFor for async operations**

```tsx
// Good
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Avoid
setTimeout(() => {
  expect(...);
}, 1000);
```

## Troubleshooting

### "useAuth must be used within an AuthProvider"

Make sure you're using `render()` from `test-utils`, not directly from `@testing-library/react`:

```tsx
// Wrong
import { render } from '@testing-library/react';

// Correct
import { render } from '../test-utils';
```

### "Cannot find element" in async tests

Always use `waitFor` for elements that appear after async operations:

```tsx
import { render, screen, waitFor } from '../test-utils';

test('loads data', async () => {
  render(<DataComponent />);

  // Don't use getByText directly
  // await screen.getByText('Data'); // ❌ Fails

  // Use waitFor instead
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument();
  });
});
```

### Mock not working

Make sure to reset mocks in `beforeEach`:

```tsx
beforeEach(() => {
  resetMocks(); // Clear previous mocks
});
```

## More Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
