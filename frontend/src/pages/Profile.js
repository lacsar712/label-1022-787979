import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';
import { resetOnboarding } from '../utils/onboarding';

const Profile = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  
  // Forms
  const [profileData, setProfileData] = useState({
    nickname: '',
    email: '',
    phone: '',
    avatar: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await profileApi.get();
      setProfileData({
        nickname: data.nickname || '',
        email: data.email || '',
        phone: data.phone || '',
        avatar: data.avatar || ''
      });
    } catch (error) {
      // Handled by interceptor
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      setErrors({ email: '邮箱格式不正确' });
      return;
    }
    
    if (profileData.phone && !/^1[3-9]\d{9}$/.test(profileData.phone)) {
      setErrors({ phone: '手机号格式不正确' });
      return;
    }
    
    try {
      setLoading(true);
      const updatedUser = await profileApi.update(profileData);
      updateUser(updatedUser);
      showToast('success', '个人信息更新成功');
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    if (!passwordData.old_password) {
      setErrors({ old_password: '请输入当前密码' });
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      setErrors({ new_password: '新密码至少6个字符' });
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors({ confirm_password: '两次输入的密码不一致' });
      return;
    }
    
    try {
      setLoading(true);
      await profileApi.changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      showToast('success', '密码修改成功，请重新登录');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleRestartGuide = () => {
    resetOnboarding();
    showToast('success', '引导已重置，即将跳转到首页...');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('restart-onboarding'));
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <div className="avatar avatar-xl">
            {profileData.nickname?.[0] || 'U'}
          </div>
        </div>
        <div className="profile-info">
          <h2>{profileData.nickname || '用户'}</h2>
          <div className="profile-role">
            普通用户
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          基本信息
        </div>
        <div 
          className={`tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          修改密码
        </div>
        <div 
          className={`tab ${activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveTab('guide')}
        >
          帮助与引导
        </div>
      </div>

      {/* Content */}
      <div className="card">
        <div className="card-body">
          {activeTab === 'info' && (
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label className="form-label">昵称</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileData.nickname}
                  onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">邮箱</label>
                <input
                  type="email"
                  className="form-input"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">手机号</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
                {errors.phone && <div className="form-error">{errors.phone}</div>}
              </div>
              
              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '保存中...' : '保存更改'}
                </button>
              </div>
            </form>
          )}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">当前密码</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                />
                {errors.old_password && <div className="form-error">{errors.old_password}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">新密码</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="至少6个字符"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                />
                {errors.new_password && <div className="form-error">{errors.new_password}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">确认新密码</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="再次输入新密码"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                />
                {errors.confirm_password && <div className="form-error">{errors.confirm_password}</div>}
              </div>
              
              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '保存中...' : '修改密码'}
                </button>
              </div>
            </form>
          )}
          {activeTab === 'guide' && (
            <div className="guide-section">
              <div className="guide-card">
                <div className="guide-card-icon">🎯</div>
                <div className="guide-card-content">
                  <h3 className="guide-card-title">功能操作引导</h3>
                  <p className="guide-card-desc">
                    重温平台核心功能的分步式操作引导，适合新入职同事熟悉系统，或久未使用的成员快速回忆操作流程。
                  </p>
                  <div className="guide-card-features">
                    <div className="guide-feature-item">
                      <span className="guide-feature-icon">📊</span>
                      <span>侧边栏各功能菜单说明</span>
                    </div>
                    <div className="guide-feature-item">
                      <span className="guide-feature-icon">📋</span>
                      <span>逾期任务提醒与处理</span>
                    </div>
                    <div className="guide-feature-item">
                      <span className="guide-feature-icon">👤</span>
                      <span>个人中心与账号管理</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleRestartGuide}
                    style={{ marginTop: '16px' }}
                  >
                    🔄 重新查看引导
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
