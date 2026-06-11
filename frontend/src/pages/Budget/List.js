import React, { useState, useEffect, useCallback } from 'react';
import { budgetsApi } from '../../api';
import { useAuth, isOperator } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const getCurrentQuarter = () => {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return { year, quarter };
};

const BudgetList = () => {
  const { user } = useAuth();
  const canEdit = isOperator(user);

  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState(null);
  const { year: currentYear, quarter: currentQuarter } = getCurrentQuarter();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [platforms, setPlatforms] = useState([]);

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    years.push(y);
  }
  const quarters = [1, 2, 3, 4];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await budgetsApi.getOverview({
        year: selectedYear,
        quarter: selectedQuarter
      });
      setBudgetData(data);
    } catch (error) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedQuarter]);

  const fetchPlatforms = async () => {
    try {
      const data = await budgetsApi.getPlatforms();
      setPlatforms(data);
    } catch (error) {
      // Handled by interceptor
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const formatMoney = (num) => {
    return '¥' + (Number(num || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'exceeded':
        return 'progress-exceeded';
      case 'warning':
        return 'progress-warning';
      default:
        return 'progress-normal';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'exceeded':
        return <span className="tag tag-error">已超额</span>;
      case 'warning':
        return <span className="tag tag-warning">预警</span>;
      default:
        return <span className="tag tag-success">正常</span>;
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      year: selectedYear,
      quarter: selectedQuarter,
      platform: '',
      budget_limit: 0,
      warning_threshold: 80
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (budget) => {
    setEditingId(budget.id);
    setFormData({
      year: budget.year,
      quarter: budget.quarter,
      platform: budget.platform,
      budget_limit: Number(budget.budget_limit),
      warning_threshold: Number(budget.warning_threshold)
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.year) errors.year = '请选择年度';
    if (!formData.quarter) errors.quarter = '请选择季度';
    if (!formData.platform) errors.platform = '请选择平台';
    if (formData.budget_limit == null || formData.budget_limit < 0) errors.budget_limit = '请输入有效的预算金额';
    if (formData.warning_threshold == null || formData.warning_threshold < 0 || formData.warning_threshold > 100) {
      errors.warning_threshold = '预警阈值应在0-100之间';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const submitData = {
        ...formData,
        year: parseInt(formData.year),
        quarter: parseInt(formData.quarter),
        budget_limit: parseFloat(formData.budget_limit) || 0,
        warning_threshold: parseFloat(formData.warning_threshold) || 80
      };

      if (editingId) {
        const updateData = {
          budget_limit: submitData.budget_limit,
          warning_threshold: submitData.warning_threshold
        };
        await budgetsApi.update(editingId, updateData);
        showToast('success', '预算更新成功');
      } else {
        await budgetsApi.create(submitData);
        showToast('success', '预算创建成功');
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      // Handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await budgetsApi.delete(deleteId);
      showToast('success', '删除成功');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      // Handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">季度预算规划</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + 新增预算
          </button>
        )}
      </div>

      {/* Period Selector */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>年度：</label>
              <select
                className="form-select"
                style={{ width: '120px' }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>季度：</label>
              <select
                className="form-select"
                style={{ width: '100px' }}
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              >
                {quarters.map(q => (
                  <option key={q} value={q}>Q{q}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Summary */}
      {budgetData && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body">
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="stat-card">
                <div className="stat-label">{budgetData.year}年Q{budgetData.quarter}总预算</div>
                <div className="stat-value" style={{ color: 'var(--primary-color)' }}>
                  {formatMoney(budgetData.total_budget)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">已使用</div>
                <div className="stat-value" style={{ color: 'var(--info-color)' }}>
                  {formatMoney(budgetData.total_used)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">剩余预算</div>
                <div className="stat-value" style={{ 
                  color: Number(budgetData.total_remaining) < 0 ? 'var(--error-color)' : 'var(--success-color)' 
                }}>
                  {formatMoney(budgetData.total_remaining)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">整体使用率</div>
                <div className="stat-value">
                  {Number(budgetData.total_percentage).toFixed(1)}%
                </div>
                <div className="progress-bar" style={{ marginTop: '8px' }}>
                  <div 
                    className={`progress-fill ${getProgressColor(
                      Number(budgetData.total_percentage) >= 100 ? 'exceeded' : 
                      Number(budgetData.total_percentage) >= 80 ? 'warning' : 'normal'
                    )}`}
                    style={{ width: `${Math.min(Number(budgetData.total_percentage), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget List */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : !budgetData || budgetData.items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <div className="empty-title">暂无预算数据</div>
              <div className="empty-description">
                {selectedYear}年Q{selectedQuarter}还未设置预算，点击按钮创建
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>平台</th>
                    <th>状态</th>
                    <th>预算上限</th>
                    <th>已用金额</th>
                    <th>剩余金额</th>
                    <th style={{ minWidth: '280px' }}>消耗进度</th>
                    <th>预警阈值</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetData.items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{item.platform}</div>
                      </td>
                      <td>
                        {getStatusBadge(item.status)}
                      </td>
                      <td>{formatMoney(item.budget_limit)}</td>
                      <td style={{ color: 'var(--info-color)' }}>
                        {formatMoney(item.used_amount)}
                      </td>
                      <td style={{ 
                        color: Number(item.remaining_amount) < 0 ? 'var(--error-color)' : 'var(--text-primary)' 
                      }}>
                        {formatMoney(item.remaining_amount)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div 
                              className={`progress-fill ${getProgressColor(item.status)}`}
                              style={{ width: `${Math.min(Number(item.usage_percentage), 100)}%` }}
                            />
                          </div>
                          <span style={{ 
                            fontSize: '13px', 
                            minWidth: '60px', 
                            textAlign: 'right',
                            color: item.status === 'exceeded' ? 'var(--error-color)' : 
                                   item.status === 'warning' ? 'var(--warning-color)' : 'var(--text-secondary)'
                          }}>
                            {Number(item.usage_percentage).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>{Number(item.warning_threshold).toFixed(0)}%</td>
                      <td>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditModal(item)}
                            >
                              编辑
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error-color)' }}
                              onClick={() => setDeleteId(item.id)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑预算' : '新增预算'}
        size="medium"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">年度 *</label>
            <select
              className="form-select"
              value={formData.year || ''}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              disabled={!!editingId}
            >
              <option value="">请选择年度</option>
              {years.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            {formErrors.year && <div className="form-error">{formErrors.year}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">季度 *</label>
            <select
              className="form-select"
              value={formData.quarter || ''}
              onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
              disabled={!!editingId}
            >
              <option value="">请选择季度</option>
              {quarters.map(q => (
                <option key={q} value={q}>Q{q}</option>
              ))}
            </select>
            {formErrors.quarter && <div className="form-error">{formErrors.quarter}</div>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">平台 *</label>
          <select
            className="form-select"
            value={formData.platform || ''}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            disabled={!!editingId}
          >
            <option value="">请选择平台</option>
            {platforms.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {formErrors.platform && <div className="form-error">{formErrors.platform}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">预算上限 (元) *</label>
          <input
            type="number"
            className="form-input"
            min="0"
            step="0.01"
            value={formData.budget_limit ?? ''}
            onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value })}
            placeholder="请输入预算金额"
          />
          {formErrors.budget_limit && <div className="form-error">{formErrors.budget_limit}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">预警阈值 (%)</label>
          <input
            type="number"
            className="form-input"
            min="0"
            max="100"
            step="1"
            value={formData.warning_threshold ?? ''}
            onChange={(e) => setFormData({ ...formData, warning_threshold: e.target.value })}
            placeholder="默认80%"
          />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            当使用率达到此阈值时，将显示预警提示（范围：0-100）
          </div>
          {formErrors.warning_threshold && <div className="form-error">{formErrors.warning_threshold}</div>}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这条预算记录吗？此操作不可恢复。"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default BudgetList;
