import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
const mockSupabase = {
  auth: {
    onAuthStateChange: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Test component that uses auth
const TestComponent = () => {
  const { user, loading, isAdmin } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user?.email || 'null'}</div>
      <div data-testid="admin">{isAdmin.toString()}</div>
    </div>
  );
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide loading state initially', () => {
    const mockOnAuthStateChange = jest.fn();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    render(<TestComponent />, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('should handle null user state', async () => {
    const mockOnAuthStateChange = jest.fn((callback) => {
      callback(null, null);
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue(mockOnAuthStateChange);

    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('admin')).toHaveTextContent('false');
    });
  });

  it('should handle authenticated user', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    const mockOnAuthStateChange = jest.fn((callback) => {
      callback('SIGNED_IN', { user: mockUser });
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue(mockOnAuthStateChange);

    // Mock profile and roles queries
    const mockProfileQuery = {
      data: { id: 'test-user-id', full_name: 'Test User', approval_status: 'approved' },
      error: null,
    };
    const mockRolesQuery = {
      data: [{ role: 'admin' }],
      error: null,
    };

    (supabase.from as jest.Mock).mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(mockProfileQuery),
      then: jest.fn((callback) => {
        if (table === 'profiles') {
          return Promise.resolve(mockProfileQuery);
        } else if (table === 'user_roles') {
          return Promise.resolve(mockRolesQuery);
        }
        return Promise.resolve({ data: [], error: null });
      }),
    }));

    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('admin')).toHaveTextContent('true');
    });
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within AuthProvider');

    consoleError.mockRestore();
  });
});
