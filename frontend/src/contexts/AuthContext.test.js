import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, hasRole, isAdmin, isOperator } from './AuthContext';

const mockUser = {
  id: 1,
  username: 'testuser',
  nickname: 'Test User',
  role: { id: 1, name: 'user' }
};

const mockAdminUser = {
  id: 2,
  username: 'admin',
  nickname: 'Admin',
  role: { id: 2, name: 'admin' }
};

const mockOperatorUser = {
  id: 3,
  username: 'operator',
  nickname: 'Operator',
  role: { id: 3, name: 'operator' }
};

const mockToken = 'fake-jwt-token';

describe('AuthContext', () => {
  describe('initial state', () => {
    test('starts with loading state then unauthenticated when no localStorage data', async () => {
      const TestComponent = () => {
        const { user, loading, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="authenticated">{isAuthenticated.toString()}</span>
            <span data-testid="user">{user ? user.username : 'null'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading').textContent).toBe('true');

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    test('loads user from localStorage on mount when both token and user exist', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      const TestComponent = () => {
        const { user, loading, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="authenticated">{isAuthenticated.toString()}</span>
            <span data-testid="username">{user?.username}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('username').textContent).toBe('testuser');
    });

    test('clears localStorage when only token exists (no user)', async () => {
      localStorage.setItem('token', mockToken);

      const TestComponent = () => {
        const { loading, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="authenticated">{isAuthenticated.toString()}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    test('clears localStorage when only user exists (no token)', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const TestComponent = () => {
        const { loading, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="authenticated">{isAuthenticated.toString()}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    test('handles invalid JSON user data in localStorage', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', 'invalid-json-data');

      const TestComponent = () => {
        const { loading, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="authenticated">{isAuthenticated.toString()}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('login', () => {
    test('sets user and stores in localStorage', async () => {
      const TestComponent = () => {
        const { user, loading, login, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="authenticated">{isAuthenticated.toString()}</span>
            <span data-testid="username">{user?.username || 'null'}</span>
            <button
              data-testid="login-btn"
              onClick={() => login(mockUser, mockToken)}
            >
              Login
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('username').textContent).toBe('testuser');
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    test('clears user and removes from localStorage', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      const TestComponent = () => {
        const { user, loading, logout, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="authenticated">{isAuthenticated.toString()}</span>
            <span data-testid="username">{user?.username || 'null'}</span>
            <button
              data-testid="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');

      act(() => {
        screen.getByTestId('logout-btn').click();
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('username').textContent).toBe('null');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('updateUser', () => {
    test('updates user data and persists to localStorage', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      const TestComponent = () => {
        const { user, loading, updateUser } = useAuth();
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="nickname">{user?.nickname || 'null'}</span>
            <button
              data-testid="update-btn"
              onClick={() => updateUser({ nickname: 'Updated Nickname' })}
            >
              Update
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('nickname').textContent).toBe('Test User');

      act(() => {
        screen.getByTestId('update-btn').click();
      });

      expect(screen.getByTestId('nickname').textContent).toBe('Updated Nickname');
      
      const storedUser = JSON.parse(localStorage.getItem('user'));
      expect(storedUser.nickname).toBe('Updated Nickname');
      expect(storedUser.username).toBe('testuser');
    });
  });

  describe('useAuth hook', () => {
    test('throws error when used outside AuthProvider', () => {
      const TestComponent = () => {
        useAuth();
        return <div>Test</div>;
      };

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');
      
      spy.mockRestore();
    });
  });
});

describe('Role utilities', () => {
  describe('hasRole', () => {
    test('returns false when user is null', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });

    test('returns false when user has no role', () => {
      expect(hasRole({}, 'admin')).toBe(false);
    });

    test('returns true for single matching role', () => {
      expect(hasRole(mockAdminUser, 'admin')).toBe(true);
    });

    test('returns false for non-matching role', () => {
      expect(hasRole(mockUser, 'admin')).toBe(false);
    });

    test('returns true when role is in array', () => {
      expect(hasRole(mockAdminUser, ['admin', 'operator'])).toBe(true);
      expect(hasRole(mockOperatorUser, ['admin', 'operator'])).toBe(true);
    });

    test('returns false when role is not in array', () => {
      expect(hasRole(mockUser, ['admin', 'operator'])).toBe(false);
    });
  });

  describe('isAdmin', () => {
    test('returns true for admin user', () => {
      expect(isAdmin(mockAdminUser)).toBe(true);
    });

    test('returns false for non-admin user', () => {
      expect(isAdmin(mockUser)).toBe(false);
      expect(isAdmin(mockOperatorUser)).toBe(false);
    });

    test('returns false for null user', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('isOperator', () => {
    test('returns true for admin user', () => {
      expect(isOperator(mockAdminUser)).toBe(true);
    });

    test('returns true for operator user', () => {
      expect(isOperator(mockOperatorUser)).toBe(true);
    });

    test('returns false for regular user', () => {
      expect(isOperator(mockUser)).toBe(false);
    });

    test('returns false for null user', () => {
      expect(isOperator(null)).toBe(false);
    });
  });
});
