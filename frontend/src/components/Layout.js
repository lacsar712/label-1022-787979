import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, isAdmin, isOperator } from '../contexts/AuthContext';
import { tasksApi } from '../api';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const dropdownRef = useRef(null);
  
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
    if (path.startsWith('/profile')) return '个人中心';
    return '';
  };

  const navItems = [
    { 
      section: '概览',
      items: [
        { path: '/dashboard', icon: '📊', label: '仪表盘', roles: ['admin', 'operator', 'user'] },
        { path: '/tasks', icon: '📋', label: '我的任务', roles: ['admin', 'operator', 'user'] }
      ]
    },
    {
      section: '业务管理',
      items: [
        { path: '/influencers', icon: '👤', label: 'Influencer管理', roles: ['admin', 'operator', 'user'] },
        { path: '/recommendations', icon: '🎯', label: '达人推荐', roles: ['admin', 'operator', 'user'] },
        { path: '/collaborations', icon: '🤝', label: '合作管理', roles: ['admin', 'operator', 'user'] },
        { path: '/budgets', icon: '💰', label: '季度预算规划', roles: ['admin', 'operator'] },
        { path: '/categories', icon: '📁', label: '分类管理', roles: ['admin', 'operator'] }
      ]
    },
    {
      section: '系统管理',
      items: [
        { path: '/users', icon: '👥', label: '用户管理', roles: ['admin'] }
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
            <span className="sidebar-logo-text">Influencer平台</span>
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
    </div>
  );
};

export default Layout;
