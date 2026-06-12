import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { influencersApi, collaborationsApi, collaborationReviewsApi } from '../../api';
import { useAuth, isOperator } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import StarRating from '../../components/StarRating';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const InfluencerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = isOperator(user);

  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState(null);
  const [collaborations, setCollaborations] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({ platform: '', account_id: '', followers: 0 });
  const [accountFormErrors, setAccountFormErrors] = useState({});
  const [savingAccount, setSavingAccount] = useState(false);

  const [deleteAccountId, setDeleteAccountId] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [settingPrimaryId, setSettingPrimaryId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [infData, collabData, reviewSummaryData, reviewsData] = await Promise.all([
        influencersApi.getById(id),
        collaborationsApi.getList({ influencer_id: id, page_size: 50 }),
        collaborationReviewsApi.getInfluencerSummary(id).catch(() => null),
        collaborationReviewsApi.getByInfluencer(id).catch(() => [])
      ]);
      setInfluencer(infData);
      setCollaborations(collabData.items);
      setReviewSummary(reviewSummaryData);
      setReviews(reviewsData);
    } catch (error) {
      navigate('/influencers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchPlatforms = useCallback(async () => {
    try {
      const data = await influencersApi.getPlatforms();
      setPlatforms(data);
    } catch (error) {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchPlatforms();
  }, [fetchData, fetchPlatforms]);

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num?.toLocaleString() || '0';
  };

  const formatMoney = (num) => {
    return '¥' + (num?.toLocaleString() || '0');
  };

  const getStatusTag = (status) => {
    const map = {
      active: { label: '活跃', class: 'tag-success' },
      inactive: { label: '暂停', class: 'tag-gray' },
      blacklisted: { label: '黑名单', class: 'tag-error' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const getCollabStatusTag = (status) => {
    const map = {
      pending: { label: '待开始', class: 'tag-gray' },
      in_progress: { label: '进行中', class: 'tag-primary' },
      completed: { label: '已完成', class: 'tag-success' },
      cancelled: { label: '已取消', class: 'tag-error' }
    };
    const config = map[status] || { label: status, class: 'tag-gray' };
    return <span className={`tag ${config.class}`}>{config.label}</span>;
  };

  const openAddAccountModal = () => {
    setEditingAccount(null);
    setAccountForm({ platform: platforms[0]?.value || '抖音', account_id: '', followers: 0 });
    setAccountFormErrors({});
    setShowAccountModal(true);
  };

  const openEditAccountModal = (account) => {
    setEditingAccount(account);
    setAccountForm({
      platform: account.platform,
      account_id: account.account_id || '',
      followers: account.followers || 0
    });
    setAccountFormErrors({});
    setShowAccountModal(true);
  };

  const validateAccountForm = () => {
    const errors = {};
    if (!accountForm.platform) errors.platform = '请选择平台';
    setAccountFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAccount = async () => {
    if (!validateAccountForm()) return;
    try {
      setSavingAccount(true);
      const submitData = {
        ...accountForm,
        followers: parseInt(accountForm.followers) || 0
      };
      if (editingAccount) {
        await influencersApi.updatePlatformAccount(id, editingAccount.id, submitData);
        showToast('success', '账号更新成功');
      } else {
        await influencersApi.createPlatformAccount(id, submitData);
        showToast('success', '账号添加成功');
      }
      setShowAccountModal(false);
      fetchData();
    } catch (error) {} finally {
      setSavingAccount(false);
    }
  };

  const handleSetPrimary = async (accountId) => {
    try {
      setSettingPrimaryId(accountId);
      await influencersApi.setPrimaryPlatformAccount(id, accountId);
      showToast('success', '已设为主展示账号');
      fetchData();
    } catch (error) {} finally {
      setSettingPrimaryId(null);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await influencersApi.deletePlatformAccount(id, deleteAccountId);
      showToast('success', '账号已删除');
      setDeleteAccountId(null);
      fetchData();
    } catch (error) {} finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <div className="empty-title">未找到该Influencer</div>
        <button className="btn btn-primary" onClick={() => navigate('/influencers')}>
          返回列表
        </button>
      </div>
    );
  }

  const totalCollabs = collaborations.length;
  const completedCollabs = collaborations.filter(c => c.status === 'completed').length;
  const totalCost = collaborations.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const totalViews = collaborations.reduce((sum, c) => sum + (c.views || 0), 0);
  const totalLikes = collaborations.reduce((sum, c) => sum + (c.likes || 0), 0);

  const platformAccounts = influencer.platform_accounts || [];
  const primaryAccount = platformAccounts.find(a => a.is_primary) || platformAccounts[0];

  return (
    <div>
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/influencers')}
        style={{ marginBottom: '16px' }}
      >
        ← 返回列表
      </button>

      <div className="detail-header">
        <div className="detail-avatar">
          {influencer.name?.[0]}
        </div>
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 className="detail-name" style={{ margin: 0 }}>{influencer.name}</h1>
            {getStatusTag(influencer.status)}
          </div>

          <div className="detail-meta">
            {primaryAccount && (
              <div className="detail-meta-item">
                <span>📱</span>
                <span>{primaryAccount.platform}</span>
              </div>
            )}
            {primaryAccount?.account_id && (
              <div className="detail-meta-item">
                <span>@</span>
                <span>{primaryAccount.account_id}</span>
              </div>
            )}
            {influencer.category && (
              <div className="detail-meta-item">
                <span>📁</span>
                <span>{influencer.category.name}</span>
              </div>
            )}
            {influencer.province && (
              <div className="detail-meta-item">
                <span>📍</span>
                <span>{influencer.province}</span>
              </div>
            )}
          </div>

          <div className="detail-stats">
            <div className="detail-stat">
              <div className="detail-stat-value">{formatNumber(primaryAccount?.followers || influencer.followers)}</div>
              <div className="detail-stat-label">粉丝数</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-value">{formatMoney(influencer.cost_per_post)}</div>
              <div className="detail-stat-label">单条报价</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-value">{influencer.engagement_rate}%</div>
              <div className="detail-stat-label">互动率</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-value">{totalCollabs}</div>
              <div className="detail-stat-label">合作次数</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">平台账号管理</h3>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={openAddAccountModal}>
              + 添加平台账号
            </button>
          )}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {platformAccounts.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <div className="empty-icon">📱</div>
              <div className="empty-title">暂无平台账号</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>主账号</th>
                    <th>平台</th>
                    <th>账号ID</th>
                    <th>粉丝数</th>
                    <th style={{ width: '180px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {platformAccounts.map(account => (
                    <tr key={account.id}>
                      <td>
                        {account.is_primary ? (
                          <span
                            title="主展示账号"
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--primary-color)',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            主账号
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                      <td><span className="tag tag-primary">{account.platform}</span></td>
                      <td>{account.account_id ? `@${account.account_id}` : '-'}</td>
                      <td>{formatNumber(account.followers)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {!account.is_primary && canEdit && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleSetPrimary(account.id)}
                              disabled={settingPrimaryId === account.id}
                            >
                              {settingPrimaryId === account.id ? '设置中...' : '设为主账号'}
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openEditAccountModal(account)}
                              >
                                编辑
                              </button>
                              {platformAccounts.length > 1 && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--error-color)' }}
                                  onClick={() => setDeleteAccountId(account.id)}
                                >
                                  删除
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">联系方式</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '16px' }}>
              {influencer.contact_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>联系人</span>
                  <span>{influencer.contact_name}</span>
                </div>
              )}
              {influencer.contact_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>电话</span>
                  <span>{influencer.contact_phone}</span>
                </div>
              )}
              {influencer.contact_email && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>邮箱</span>
                  <span>{influencer.contact_email}</span>
                </div>
              )}
              {influencer.contact_wechat && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>微信</span>
                  <span>{influencer.contact_wechat}</span>
                </div>
              )}
              {!influencer.contact_name && !influencer.contact_phone &&
               !influencer.contact_email && !influencer.contact_wechat && (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  暂无联系方式
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">合作统计</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-color)' }}>
                  {completedCollabs}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>已完成</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success-color)' }}>
                  {formatMoney(totalCost)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总投入</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                  {formatNumber(totalViews)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总曝光</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#9333ea' }}>
                  {formatNumber(totalLikes)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总互动</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">合作评分</h3>
            <span className="tag tag-primary">{reviewSummary?.total_reviews || 0} 条评价</span>
          </div>
          <div className="card-body">
            {reviewSummary && reviewSummary.total_reviews > 0 ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary-color)' }}>
                    {reviewSummary.avg_overall.toFixed(1)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>/ 5.0</span>
                  <div style={{ marginTop: '4px' }}>
                    <StarRating value={Math.round(reviewSummary.avg_overall)} readonly size="small" />
                  </div>
                </div>
                <div style={{ height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { dimension: '内容质量', value: reviewSummary.avg_content_quality, fullMark: 5 },
                      { dimension: '配合程度', value: reviewSummary.avg_cooperation_level, fullMark: 5 },
                      { dimension: '投放效果', value: reviewSummary.avg_delivery_effect, fullMark: 5 }
                    ]}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} axisLine={false} />
                      <Radar
                        name="评分"
                        dataKey="value"
                        stroke="var(--primary-color)"
                        fill="var(--primary-color)"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        formatter={(value) => [`${value.toFixed(1)} 分`, '评分']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>内容质量</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StarRating value={Math.round(reviewSummary.avg_content_quality)} readonly size="small" />
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>{reviewSummary.avg_content_quality.toFixed(1)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>配合程度</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StarRating value={Math.round(reviewSummary.avg_cooperation_level)} readonly size="small" />
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>{reviewSummary.avg_cooperation_level.toFixed(1)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>投放效果</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StarRating value={Math.round(reviewSummary.avg_delivery_effect)} readonly size="small" />
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>{reviewSummary.avg_delivery_effect.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-icon">⭐</div>
                <div className="empty-title">暂无评价</div>
                <div className="empty-description">完成合作后可进行评价</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {influencer.tags && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">标签</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {influencer.tags.split(',').map((tag, idx) => (
                <span key={idx} className="tag tag-primary">{tag.trim()}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {influencer.notes && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">备注</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {influencer.notes}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">合作记录</h3>
          {canEdit && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/collaborations', {
                state: {
                  openNewModal: true,
                  preSelectedInfluencer: influencer
                }
              })}
            >
              + 新建合作
            </button>
          )}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {collaborations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">暂无合作记录</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>内容类型</th>
                  <th>状态</th>
                  <th>预算</th>
                  <th>实际支出</th>
                  <th>开始日期</th>
                  <th>曝光量</th>
                </tr>
              </thead>
              <tbody>
                {collaborations.map(collab => (
                  <tr key={collab.id}>
                    <td style={{ fontWeight: '500' }}>{collab.project_name}</td>
                    <td>{collab.content_type || '-'}</td>
                    <td>{getCollabStatusTag(collab.status)}</td>
                    <td>{formatMoney(collab.budget)}</td>
                    <td>{formatMoney(collab.actual_cost)}</td>
                    <td>{collab.start_date || '-'}</td>
                    <td>{formatNumber(collab.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">历史评价</h3>
          <span className="tag tag-gray">共 {reviews.length} 条</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {reviews.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <div className="empty-icon">⭐</div>
              <div className="empty-title">暂无历史评价</div>
              <div className="empty-description">完成合作后可对网红进行评价</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', padding: '16px' }}>
              {reviews.map(review => (
                <div key={review.id} className="review-item">
                  <div className="review-item-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar avatar-sm">
                        {review.reviewer?.nickname?.[0] || review.reviewer?.username?.[0] || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500' }}>
                          {review.reviewer?.nickname || review.reviewer?.username}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-color)' }}>
                        {((review.content_quality + review.cooperation_level + review.delivery_effect) / 3).toFixed(1)}
                      </span>
                      <StarRating value={Math.round((review.content_quality + review.cooperation_level + review.delivery_effect) / 3)} readonly size="small" />
                    </div>
                  </div>
                  <div className="review-item-ratings">
                    <div className="review-item-rating">
                      <span className="review-item-rating-label">内容质量</span>
                      <StarRating value={review.content_quality} readonly size="small" />
                      <span className="review-item-rating-value">{review.content_quality}.0</span>
                    </div>
                    <div className="review-item-rating">
                      <span className="review-item-rating-label">配合程度</span>
                      <StarRating value={review.cooperation_level} readonly size="small" />
                      <span className="review-item-rating-value">{review.cooperation_level}.0</span>
                    </div>
                    <div className="review-item-rating">
                      <span className="review-item-rating-label">投放效果</span>
                      <StarRating value={review.delivery_effect} readonly size="small" />
                      <span className="review-item-rating-value">{review.delivery_effect}.0</span>
                    </div>
                  </div>
                  {review.comment && (
                    <div className="review-item-comment">
                      {review.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title={editingAccount ? '编辑平台账号' : '添加平台账号'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAccountModal(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleSaveAccount} disabled={savingAccount}>
              {savingAccount ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">平台 *</label>
          <select
            className="form-select"
            value={accountForm.platform || ''}
            onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value })}
          >
            {platforms.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {accountFormErrors.platform && <div className="form-error">{accountFormErrors.platform}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">账号ID</label>
          <input
            type="text"
            className="form-input"
            value={accountForm.account_id || ''}
            onChange={(e) => setAccountForm({ ...accountForm, account_id: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">粉丝数</label>
          <input
            type="number"
            className="form-input"
            value={accountForm.followers || 0}
            onChange={(e) => setAccountForm({ ...accountForm, followers: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteAccountId}
        onClose={() => setDeleteAccountId(null)}
        onConfirm={handleDeleteAccount}
        title="删除确认"
        message="确定要删除这个平台账号吗？此操作不可恢复。"
        type="danger"
        loading={deletingAccount}
      />
    </div>
  );
};

export default InfluencerDetail;
