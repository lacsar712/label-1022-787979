import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('./pages/Login', () => () => <div data-testid="login-page">Login Page</div>);
jest.mock('./pages/Dashboard', () => () => <div data-testid="dashboard-page">Dashboard Page</div>);
jest.mock('./pages/Influencer/List', () => () => <div data-testid="influencer-list">Influencer List</div>);
jest.mock('./pages/Influencer/Detail', () => () => <div data-testid="influencer-detail">Influencer Detail</div>);
jest.mock('./pages/Recommendation/Index', () => () => <div data-testid="recommendation">Recommendation</div>);
jest.mock('./pages/Collaboration/List', () => () => <div data-testid="collaboration-list">Collaboration List</div>);
jest.mock('./pages/Task/List', () => () => <div data-testid="task-list">Task List</div>);
jest.mock('./pages/Budget/List', () => () => <div data-testid="budget-list">Budget List</div>);
jest.mock('./pages/Category/List', () => () => <div data-testid="category-list">Category List</div>);
jest.mock('./pages/User/List', () => () => <div data-testid="user-list">User List</div>);
jest.mock('./pages/Settings/Index', () => () => <div data-testid="settings">Settings</div>);
jest.mock('./pages/Profile', () => () => <div data-testid="profile">Profile</div>);

jest.mock('./components/Layout', () => {
  const React = require('react');
  const { Outlet } = require('react-router-dom');
  return () => (
    <div data-testid="layout">
      <div data-testid="layout-content">
        <Outlet />
      </div>
    </div>
  );
});

jest.mock('./components/Toast', () => () => <div data-testid="toast">Toast</div>);

jest.mock('./components/OnboardingGuide', () => () => <div data-testid="onboarding-guide">Onboarding Guide</div>);

jest.mock('./utils/onboarding', () => ({
  hasCompletedOnboarding: () => true
}));

jest.mock('./contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }) => children,
  useSettings: () => ({
    publicSettings: {
      platform_name: 'Test Platform',
      platform_short_name: 'Test',
      allow_self_register: true
    },
    loading: false
  })
}));

jest.mock('./api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    getMe: jest.fn()
  },
  settingsApi: {
    getPublic: jest.fn().mockResolvedValue({}),
    getAll: jest.fn().mockResolvedValue([])
  },
  statisticsApi: {
    getOverview: jest.fn().mockResolvedValue({}),
    getPlatformDistribution: jest.fn().mockResolvedValue([]),
    getCategoryDistribution: jest.fn().mockResolvedValue([]),
    getProvinceDistribution: jest.fn().mockResolvedValue([]),
    getCollaborationStatus: jest.fn().mockResolvedValue([]),
    getMonthlyTrends: jest.fn().mockResolvedValue([]),
    getTopInfluencers: jest.fn().mockResolvedValue([]),
    getRecentCollaborations: jest.fn().mockResolvedValue([])
  },
  tasksApi: {
    getOverdueCount: jest.fn().mockResolvedValue({ overdue_count: 0 })
  },
  influencersApi: {
    getList: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue({ count: 0 })
  },
  collaborationsApi: {
    getList: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue({ count: 0 })
  },
  budgetsApi: {
    getList: jest.fn().mockResolvedValue([])
  },
  categoriesApi: {
    getList: jest.fn().mockResolvedValue([])
  },
  usersApi: {
    getList: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue({ count: 0 }),
    getRoles: jest.fn().mockResolvedValue([])
  },
  profileApi: {
    get: jest.fn().mockResolvedValue({})
  },
  snapshotsApi: {
    getList: jest.fn().mockResolvedValue([])
  },
  recommendationsApi: {
    recommend: jest.fn().mockResolvedValue([])
  },
  default: {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }
}));

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

const renderWithRouter = (route = '/') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
};

describe('App Routing Guards', () => {
  describe('Unauthenticated access', () => {
    test('redirects from protected route to login when not authenticated', async () => {
      renderWithRouter('/dashboard');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
    });

    test('shows login page at /login when not authenticated', async () => {
      renderWithRouter('/login');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
    });

    test('redirects from root to login when not authenticated', async () => {
      renderWithRouter('/');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    test('redirects from unknown routes to login when not authenticated', async () => {
      renderWithRouter('/some-random-route');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated access with token', () => {
    beforeEach(() => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
    });

    test('renders layout with dashboard when authenticated and visiting /dashboard', async () => {
      renderWithRouter('/dashboard');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    test('redirects from /login to /dashboard when already authenticated', async () => {
      renderWithRouter('/login');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    test('renders influencers page when authenticated', async () => {
      renderWithRouter('/influencers');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('influencer-list')).toBeInTheDocument();
    });

    test('renders profile page when authenticated', async () => {
      renderWithRouter('/profile');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('profile')).toBeInTheDocument();
    });

    test('renders recommendations page when authenticated', async () => {
      renderWithRouter('/recommendations');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('recommendation')).toBeInTheDocument();
    });

    test('renders collaborations page when authenticated', async () => {
      renderWithRouter('/collaborations');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('collaboration-list')).toBeInTheDocument();
    });

    test('renders tasks page when authenticated', async () => {
      renderWithRouter('/tasks');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });
  });

  describe('Role-based access control', () => {
    test('admin can access users page', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockAdminUser));

      renderWithRouter('/users');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-list')).toBeInTheDocument();
    });

    test('admin can access settings page', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockAdminUser));

      renderWithRouter('/settings');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('settings')).toBeInTheDocument();
    });

    test('admin can access budgets page', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockAdminUser));

      renderWithRouter('/budgets');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('budget-list')).toBeInTheDocument();
    });

    test('admin can access categories page', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockAdminUser));

      renderWithRouter('/categories');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('category-list')).toBeInTheDocument();
    });

    test('operator can access budgets page', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockOperatorUser));

      renderWithRouter('/budgets');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('budget-list')).toBeInTheDocument();
    });

    test('operator can access categories page', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockOperatorUser));

      renderWithRouter('/categories');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.getByTestId('category-list')).toBeInTheDocument();
    });

    test('operator cannot access users page - redirects to dashboard', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockOperatorUser));

      renderWithRouter('/users');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('user-list')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    test('operator cannot access settings page - redirects to dashboard', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockOperatorUser));

      renderWithRouter('/settings');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    test('regular user cannot access budgets page - redirects to dashboard', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithRouter('/budgets');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('budget-list')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    test('regular user cannot access categories page - redirects to dashboard', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithRouter('/categories');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('category-list')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    test('regular user cannot access users page - redirects to dashboard', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithRouter('/users');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('user-list')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    test('regular user cannot access settings page - redirects to dashboard', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithRouter('/settings');

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    test('shows loading spinner while auth is loading', () => {
      renderWithRouter('/dashboard');

      const loadingElements = document.querySelectorAll('.loading');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Invalid auth state', () => {
    test('redirects to login when token exists but user is invalid JSON', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', 'invalid-json-data');

      renderWithRouter('/dashboard');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
    });

    test('redirects to login when user exists but no token', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithRouter('/dashboard');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
    });

    test('clears localStorage when only token is present', async () => {
      localStorage.setItem('token', mockToken);

      renderWithRouter('/dashboard');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    test('clears localStorage when only user is present', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      renderWithRouter('/dashboard');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});
