/**
 * TEST TEMPLATE - Copy this file and modify for your component
 *
 * This template demonstrates common testing patterns used in this project.
 * Delete comments and customize for your specific component.
 */

import { render, screen, waitFor } from '../test-utils';
import { mockGet, mockPost, resetMocks } from '../__mocks__/axios';
import { mockUser } from '../test-utils/mock-data';
// import YourComponent from './YourComponent';

/**
 * Example test suite for YourComponent
 * Covers: rendering, data fetching, error handling, user interactions
 */
describe('YourComponent', () => {
  /**
   * Clean up before each test
   * - Clear localStorage
   * - Clear all API mocks
   */
  beforeEach(() => {
    localStorage.clear();
    resetMocks();
  });

  /**
   * Test 1: Component renders without crashing
   * This is a smoke test - ensures basic functionality works
   */
  test('renders without crashing', () => {
    render(<div>YourComponent</div>);
    expect(screen.getByText('YourComponent')).toBeInTheDocument();
  });

  /**
   * Test 2: Component renders with required props
   * Tests the happy path - component displays correctly
   */
  test('renders with required props', () => {
    const props = {
      title: 'Test Title',
      description: 'Test Description',
    };

    render(<div>{props.title}</div>);
    expect(screen.getByText(props.title)).toBeInTheDocument();
  });

  /**
   * Test 3: Fetches and displays data
   * Tests async data loading - uses mockGet and waitFor
   */
  test('fetches and displays data', async () => {
    // Mock the API response
    mockGet({ usuarios: [mockUser.admin] });

    // Render component
    render(<div>Test</div>);

    // Wait for async operation to complete
    await waitFor(() => {
      // Add assertions here
    });
  });

  /**
   * Test 4: Handles errors gracefully
   * Tests error scenarios - when API fails or returns error
   */
  test('handles errors gracefully', async () => {
    // Mock a failed API request
    mockPost({ error: 'Request failed' });

    render(<div>Error handling test</div>);

    // Verify error message is shown
    await waitFor(() => {
      // Add assertions here
    });
  });

  /**
   * Test 5: User interactions work correctly
   * Tests form submission, button clicks, etc.
   */
  test('handles user interactions', async () => {
    render(<div>Interaction test</div>);

    // Simulate user actions
    // const button = screen.getByRole('button', { name: /save/i });
    // await userEvent.click(button);

    // Verify the result
    // expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  /**
   * Test 6: Respects authentication state
   * Tests that component handles logged-in vs logged-out users differently
   */
  test('respects authentication state', () => {
    // Simulate authenticated user
    localStorage.setItem('accessToken', 'test-token');

    render(<div>Auth test</div>);

    // Add assertions for authenticated state
  });

  /**
   * Test 7: Filters/searches data correctly
   * Tests filtering, searching, or data transformation
   */
  test('filters data correctly', async () => {
    mockGet({ data: [mockUser.admin, mockUser.collaborator] });

    render(<div>Filter test</div>);

    // Add assertions for filtered results
  });

  /**
   * Test 8: Pagination works correctly
   * Tests pagination if component has it
   */
  test('handles pagination', async () => {
    mockGet({ data: [], total: 100, page: 1 });

    render(<div>Pagination test</div>);

    // Test page navigation
    // const nextButton = screen.getByRole('button', { name: /next/i });
    // await userEvent.click(nextButton);

    // Verify page changed
    // expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('page=2'));
  });
});

/**
 * COMMON ASSERTION PATTERNS
 *
 * // Check if element is visible
 * expect(screen.getByText('Text')).toBeInTheDocument();
 *
 * // Check if element is NOT visible
 * expect(screen.queryByText('Text')).not.toBeInTheDocument();
 *
 * // Check button is disabled
 * expect(screen.getByRole('button')).toBeDisabled();
 *
 * // Check input value
 * expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
 *
 * // Check API was called
 * expect(mockGet).toHaveBeenCalledWith('/api/users');
 *
 * // Check API was called with params
 * expect(mockGet).toHaveBeenCalledWith(
 *   expect.objectContaining({ url: '/api/users' })
 * );
 */
