import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import {
  AllProviders,
  AllProvidersProps,
  AllProvidersWithoutRouter,
} from './test-providers';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  providerProps?: AllProvidersProps;
  /**
   * If true, renders with all providers EXCEPT MemoryRouter
   * Use for testing App component (which already has BrowserRouter)
   * @default false
   */
  withoutRouter?: boolean;
}

/**
 * Custom render function that wraps components with all required providers
 * Automatically includes: MemoryRouter, Theme, Auth, Notification, and Tutorial providers
 *
 * @example
 * import { render, screen } from '../test-utils';
 *
 * test('component renders', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('expected text')).toBeInTheDocument();
 * });
 *
 * @example
 * // With custom route
 * render(<AdminComponent />, {
 *   providerProps: { initialRoute: '/admin' }
 * });
 *
 * @example
 * // For App component (which has BrowserRouter internally)
 * render(<App />, { withoutRouter: true });
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { providerProps, withoutRouter = false, ...renderOptions } =
    options || {};

  const WrapperComponent = withoutRouter ? AllProvidersWithoutRouter : AllProviders;

  return render(ui, {
    wrapper: ({ children }) =>
      withoutRouter ? (
        <AllProvidersWithoutRouter>{children}</AllProvidersWithoutRouter>
      ) : (
        <AllProviders {...providerProps}>{children}</AllProviders>
      ),
    ...renderOptions,
  });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the default render with our custom one
export { renderWithProviders as render };
