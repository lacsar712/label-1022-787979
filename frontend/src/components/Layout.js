import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { tasksApi } from '../api';
import OnboardingGuide from './OnboardingGuide';
import { hasCompletedOnboarding } from '../utils/onboarding';

const Layout = () => {
  const { user, logout } = useAuth();
  const { publicSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const dropdownRef = useRef(null);

  const platformShortName = publicSettings.platform_short_name || 'Influencer平台';
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    const fetchOverdueCount = async () => {
      try {
        const data = await tasksApi.getOverdueCount();
        setOverdueCount(data.overdue_count);
      } catch {
      }
    };
    fetchOverdueCount();
    const interval = setInterval(fetchOverdueCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkOnboarding = () => {
      if (!hasCompletedOnboarding()) {
        setTimeout(() => setShowGuide(true), 500);
      }
    };

    const timer = setTimeout(checkOnboarding, 800);

    const handleRestartGuide = () => {
      setShowGuide(true);
    };
    window.addEventListener('restart-onboarding', handleRestartGuide);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('restart-onboarding', handleRestartGuide);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return '仪表盘';
    if (path.startsWith('/influencers')) return 'Influencer管理';
    if (path.startsWith('/recommendations')) return '达人推荐';
    if (path.startsWith('/collaborations')) return '合作管理';
    if (path.startsWith('/budgets')) return '季度预算规划';
    if (path.startsWith('/categories')) return '分类管理';
    if (path.startsWith('/users')) return '用户管理';
    if (path.startsWith('/tasks')) return '我的任务';
    if (path.startsWith('/settings')) return '系统设置';
    if (path.startsWith('/profile')) return '个人中心';
    return '';
  };

  const navItems = [
    { 
      section: '概览',
      items: [
        { path: '/dashboard', icon: '📊', label: '仪表盘', roles: ['admin', 'operator', 'user'], guideId: 'dashboard' },
        { path: '/tasks', icon: '📋', label: '我的任务', roles: ['admin', 'operator', 'user'], guideId: 'tasks' }
      ]
    },
    {
      section: '业务管理',
      items: [
        { path: '/influencers', icon: '👤', label: 'Influencer管理', roles: ['admin', 'operator', 'user'], guideId: 'influencers' },
        { path: '/recommendations', icon: '🎯', label: '达人推荐', roles: ['admin', 'operator', 'user'], guideId: 'recommendations' },
        { path: '/collaborations', icon: '🤝', label: '合作管理', roles: ['admin', 'operator', 'user'], guideId: 'collaborations' },
        { path: '/budgets', icon: '💰', label: '季度预算规划', roles: ['admin', 'operator'], guideId: 'budgets' },
        { path: '/categories', icon: '📁', label: '分类管理', roles: ['admin', 'operator'], guideId: 'categories' }
      ]
    },
    {
      section: '系统管理',
      items: [
        { path: '/users', icon: '👥', label: '用户管理', roles: ['admin'], guideId: 'users' },
        { path: '/settings', icon: '⚙️', label: '系统设置', roles: ['admin'], guideId: 'settings' }
      ]
    }
  ];

  const userRole = user?.role?.name;
  const getRoleLabel = (roleName) => {
    switch (roleName) {
      case 'admin': return '管理员';
      case 'operator': return '运营人员';
      case 'user': return '普通用户';
      default: return roleName;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🎯</div>
            <span className="sidebar-logo-text">{platformShortName}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section, idx) => {
            const visibleItems = section.items.filter(item => 
              item.roles.includes(userRole)
            );
            
            if (visibleItems.length === 0) return null;
            
            return (
              <div className="nav-section" key={idx}>
                <div className="nav-section-title">{section.section}</div>
                {visibleItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    data-guide-id={item.guideId}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-item-icon">{item.icon}</span>
                    <span className="nav-item-text">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">{getPageTitle()}</h1>
          </div>
          <div className="header-right">
            <div
              className="overdue-badge-wrapper"
              data-guide-id="overdue-badge"
              onClick={() => navigate('/tasks')}
              style={{ cursor: 'pointer' }}
              title="查看逾期任务"
            >
              <span className="overdue-badge-icon">📋</span>
              {overdueCount > 0 && (
                <span className="overdue-badge">{overdueCount > 99 ? '99+' : overdueCount}</span>
              )}
            </div>
            <div className="dropdown" ref={dropdownRef}>
              <div 
                className="user-menu"
                data-guide-id="user-menu"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="user-avatar">
                  {user?.nickname?.[0] || user?.username?.[0] || 'U'}
                </div>
                <div className="user-info">
                  <span className="user-name">{user?.nickname || user?.username}</span>
                  <span className="user-role">{getRoleLabel(userRole)}</span>
                </div>
              </div>
              
              {showDropdown && (
                <div className="dropdown-menu">
                  <div 
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/profile');
                    }}
                  >
                    <span>👤</span>
                    <span>个人中心</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div 
                    className="dropdown-item danger"
                    onClick={handleLogout}
                  >
                    <span>🚪</span>
                    <span>退出登录</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      <OnboardingGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
};

export default Layout;
