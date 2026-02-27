import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ThemeProvider } from '../context/ThemeContext';
import { TutorialProvider } from '../context/TutorialContext';

export interface AllProvidersProps {
  initialRoute?: string;
  children: React.ReactNode;
}

/**
 * All providers including MemoryRouter
 * Use for testing individual components that need routing context
 */
export function AllProviders({ children, initialRoute = '/' }: AllProvidersProps) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <TutorialProvider>
              {children}
            </TutorialProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

/**
 * All providers WITHOUT MemoryRouter
 * Use for testing App component (which already has BrowserRouter)
 * or other components that have their own router setup
 */
export function AllProvidersWithoutRouter({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <TutorialProvider>
            {children}
          </TutorialProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Lightweight version for simple unit tests with just routing
 * Use when you only need MemoryRouter, not all providers
 */
export function MinimalProviders({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}
