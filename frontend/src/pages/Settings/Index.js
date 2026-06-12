import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { showToast } from '../../components/Toast';

const SystemSettings = () => {
  const { publicSettings, fetchAllSettings, allSettings, allSettingsLoading, updateSettings } = useSettings();

  const [formData, setFormData] = useState({
    platform_name: '',
    platform_short_name: '',
    allow_self_register: true,
    collaboration_reminder_days: 7,
    default_page_size: 10,
    platform_display_names: {}
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAllSettings();
  }, [fetchAllSettings]);

  useEffect(() => {
    setFormData({
      platform_name: publicSettings.platform_name || '',
      platform_short_name: publicSettings.platform_short_name || '',
      allow_self_register: publicSettings.allow_self_register !== false,
      collaboration_reminder_days: publicSettings.collaboration_reminder_days || 7,
      default_page_size: publicSettings.default_page_size || 10,
      platform_display_names: publicSettings.platform_display_names || {}
    });
  }, [publicSettings]);

  const platformKeys = ['抖音', '小红书', 'B站', '微博', '快手', '微信', 'YouTube', 'Instagram', 'TikTok', '其他'];

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.platform_name.trim()) {
      newErrors.platform_name = '请输入平台名称';
    }
    if (!formData.platform_short_name.trim()) {
      newErrors.platform_short_name = '请输入平台简称';
    }
    if (formData.collaboration_reminder_days < 0 || formData.collaboration_reminder_days > 365) {
      newErrors.collaboration_reminder_days = '提醒天数应在0-365之间';
    }
    if (formData.default_page_size < 1 || formData.default_page_size > 100) {
      newErrors.default_page_size = '每页条数应在1-100之间';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const settingsToUpdate = {
        platform_name: formData.platform_name.trim(),
        platform_short_name: formData.platform_short_name.trim(),
        allow_self_register: formData.allow_self_register,
        collaboration_reminder_days: parseInt(formData.collaboration_reminder_days),
        default_page_size: parseInt(formData.default_page_size),
        platform_display_names: formData.platform_display_names
      };

      const result = await updateSettings(settingsToUpdate);

      if (result.errors && result.errors.length > 0) {
        showToast('warning', `部分配置更新失败：${result.errors.join('；')}`);
      } else {
        showToast('success', '系统设置保存成功，已全局生效');
      }
    } catch (error) {
      console.error('Save settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      platform_name: publicSettings.platform_name || '',
      platform_short_name: publicSettings.platform_short_name || '',
      allow_self_register: publicSettings.allow_self_register !== false,
      collaboration_reminder_days: publicSettings.collaboration_reminder_days || 7,
      default_page_size: publicSettings.default_page_size || 10,
      platform_display_names: publicSettings.platform_display_names || {}
    });
    setErrors({});
    showToast('info', '已重置为当前保存的配置');
  };

  const handlePlatformNameChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      platform_display_names: {
        ...prev.platform_display_names,
        [platform]: value
      }
    }));
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">系统设置</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleReset} disabled={saving}>
            重置
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">🎨 平台外观设置</h3>
          <span className="card-subtitle">设置平台对外展示的名称信息</span>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">平台完整名称 *</label>
              <input
                type="text"
                className="form-input"
                value={formData.platform_name}
                onChange={(e) => setFormData(prev => ({ ...prev, platform_name: e.target.value }))}
                placeholder="例如：Influencer管理平台"
                style={{ maxWidth: '400px' }}
              />
              {errors.platform_name && <div className="form-error">{errors.platform_name}</div>}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                显示位置：登录页标题、浏览器标签等
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">平台简称 *</label>
              <input
                type="text"
                className="form-input"
                value={formData.platform_short_name}
                onChange={(e) => setFormData(prev => ({ ...prev, platform_short_name: e.target.value }))}
                placeholder="例如：Influencer平台"
                style={{ maxWidth: '400px' }}
              />
              {errors.platform_short_name && <div className="form-error">{errors.platform_short_name}</div>}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                显示位置：侧边栏Logo旁、导航标题等
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">📋 平台显示名称映射</h3>
          <span className="card-subtitle">自定义各投放平台的对外显示名称</span>
        </div>
        <div className="card-body">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px'
          }}>
            {platformKeys.map(platform => (
              <div key={platform} className="form-group">
                <label className="form-label">{platform}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.platform_display_names[platform] || platform}
                  onChange={(e) => handlePlatformNameChange(platform, e.target.value)}
                  placeholder={`${platform}的显示名称`}
                />
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            提示：修改后将在所有下拉选择、标签展示、统计图表等位置联动更新
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">⚙️ 功能开关与参数</h3>
          <span className="card-subtitle">控制系统核心功能行为</span>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">列表默认每页条数</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="100"
                value={formData.default_page_size}
                onChange={(e) => setFormData(prev => ({ ...prev, default_page_size: parseInt(e.target.value) || 10 }))}
                style={{ maxWidth: '200px' }}
              />
              {errors.default_page_size && <div className="form-error">{errors.default_page_size}</div>}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                范围：1-100 条/页，将影响所有列表页的默认分页大小
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">合作到期默认提醒天数</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="365"
                value={formData.collaboration_reminder_days}
                onChange={(e) => setFormData(prev => ({ ...prev, collaboration_reminder_days: parseInt(e.target.value) || 7 }))}
                style={{ maxWidth: '200px' }}
              />
              {errors.collaboration_reminder_days && <div className="form-error">{errors.collaboration_reminder_days}</div>}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                范围：0-365 天，到期前 N 天开始显示提醒标识
              </div>
            </div>
          </div>

          <div style={{
            padding: '20px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            marginTop: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>自助注册功能</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  开启后，登录页将显示注册入口，用户可自行创建普通用户账户；关闭后仅管理员可在用户管理中创建账户
                </div>
              </div>
              <label className="switch" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.allow_self_register}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_self_register: e.target.checked }))}
                  style={{
                    width: '48px',
                    height: '24px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  display: 'inline-block',
                  marginLeft: '12px',
                  fontWeight: '600',
                  color: formData.allow_self_register ? 'var(--success-color)' : 'var(--text-secondary)'
                }}>
                  {formData.allow_self_register ? '已开启' : '已关闭'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 全部配置项（原始数据）</h3>
          <span className="card-subtitle">查看系统中所有已注册的配置项详情</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {allSettingsLoading ? (
            <div className="loading" style={{ padding: '40px 0' }}>
              <div className="spinner"></div>
            </div>
          ) : allSettings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙️</div>
              <div className="empty-title">暂无配置项</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>配置键名</th>
                    <th>当前值</th>
                    <th>类型</th>
                    <th>是否公开</th>
                    <th>描述</th>
                    <th>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {allSettings.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '500' }}>{item.setting_key}</td>
                      <td style={{ fontFamily: 'monospace', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.setting_value}>
                        {item.setting_value === null ? <span style={{ color: 'var(--text-secondary)' }}>null</span> : String(item.setting_value)}
                      </td>
                      <td>
                        <span className="tag" style={{
                          background: item.setting_type === 'json' ? 'var(--bg-tertiary)' :
                            item.setting_type === 'integer' ? '#e8f0fe' :
                            item.setting_type === 'boolean' ? '#e6f4ea' : '#fef7e0',
                          color: item.setting_type === 'json' ? 'var(--text-primary)' :
                            item.setting_type === 'integer' ? '#1a73e8' :
                            item.setting_type === 'boolean' ? '#137333' : '#b06000'
                        }}>{item.setting_type}</span>
                      </td>
                      <td>
                        {item.is_public ? (
                          <span className="tag tag-success">公开</span>
                        ) : (
                          <span className="tag tag-gray">内部</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item.description || '-'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {new Date(item.updated_at).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
