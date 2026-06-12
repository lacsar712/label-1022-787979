import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationsApi, influencersApi, categoriesApi } from '../../api';

const Recommendation = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const [platform, setPlatform] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [minEngagementRate, setMinEngagementRate] = useState('');

  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [platformsRes, categoriesRes] = await Promise.all([
          influencersApi.getPlatforms(),
          categoriesApi.getList()
        ]);
        setPlatforms(platformsRes);
        setCategories(categoriesRes);
      } catch (error) {}
    };
    fetchOptions();
  }, []);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setSearched(true);
      const data = {};
      if (platform) data.platform = platform;
      if (categoryId) data.category_id = parseInt(categoryId);
      if (minFollowers) data.min_followers = parseInt(minFollowers);
      if (maxFollowers) data.max_followers = parseInt(maxFollowers);
      if (maxBudget) data.max_budget = parseFloat(maxBudget);
      if (minEngagementRate) data.min_engagement_rate = parseFloat(minEngagementRate);

      const res = await recommendationsApi.recommend(data);
      setResults(res.items);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPlatform('');
    setCategoryId('');
    setMinFollowers('');
    setMaxFollowers('');
    setMaxBudget('');
    setMinEngagementRate('');
    setResults([]);
    setSearched(false);
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num?.toLocaleString() || '0';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'var(--success-color)';
    if (score >= 40) return 'var(--primary-color)';
    if (score >= 20) return '#f59e0b';
    return 'var(--text-tertiary)';
  };

  const getMatchTagClass = (type) => {
    switch (type) {
      case 'success': return 'tag-success';
      case 'primary': return 'tag-primary';
      case 'warning': return 'tag-warning';
      default: return 'tag-gray';
    }
  };

  const followerRanges = [
    { label: '1万以下', min: 0, max: 10000 },
    { label: '1万-10万', min: 10000, max: 100000 },
    { label: '10万-50万', min: 100000, max: 500000 },
    { label: '50万-100万', min: 500000, max: 1000000 },
    { label: '100万以上', min: 1000000, max: null }
  ];

  const handleFollowerRange = (range) => {
    setMinFollowers(range.min ? String(range.min) : '');
    setMaxFollowers(range.max ? String(range.max) : '');
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">达人推荐</h2>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">投放需求</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            设置筛选条件，系统将智能匹配最合适的达人候选
          </span>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">投放平台</label>
              <select
                className="form-select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="">不限平台</option>
                {platforms.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">内容分类</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">不限分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">粉丝区间</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {followerRanges.map((range, idx) => (
                <button
                  key={idx}
                  className={`task-filter-btn ${
                    (minFollowers === String(range.min ?? '') && maxFollowers === String(range.max ?? ''))
                      ? 'active' : ''
                  }`}
                  onClick={() => handleFollowerRange(range)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="form-row">
              <div className="form-group">
                <input
                  type="number"
                  className="form-input"
                  placeholder="最低粉丝数"
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  className="form-input"
                  placeholder="最高粉丝数"
                  value={maxFollowers}
                  onChange={(e) => setMaxFollowers(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">预算上限 (元/条)</label>
              <input
                type="number"
                className="form-input"
                placeholder="单条报价不超过此金额"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">最低互动率 (%)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                placeholder="互动率不低于此值"
                value={minEngagementRate}
                onChange={(e) => setMinEngagementRate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={handleReset}>重置条件</button>
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? '智能匹配中...' : '开始推荐'}
            </button>
          </div>
        </div>
      </div>

      {searched && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              推荐结果
              <span className="card-subtitle">
                共 {results.length} 位匹配达人，按综合匹配度排序
              </span>
            </h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">未找到匹配达人</div>
                <div className="empty-description">请尝试调整筛选条件后重新推荐</div>
              </div>
            ) : (
              <div className="rec-grid">
                {results.map((inf, index) => (
                  <div
                    key={inf.id}
                    className="rec-card"
                    onClick={() => navigate(`/influencers/${inf.id}`)}
                  >
                    <div className="rec-card-rank">
                      <span className={`rec-rank-number ${index < 3 ? 'rec-rank-top' : ''}`}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="rec-card-body">
                      <div className="rec-card-header">
                        <div className="rec-card-avatar">
                          {inf.name?.[0]}
                        </div>
                        <div className="rec-card-info">
                          <div className="rec-card-name">{inf.name}</div>
                          <div className="rec-card-meta">
                            <span className="tag tag-primary">{inf.platform}</span>
                            {inf.category && (
                              <span className="tag tag-gray">{inf.category.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="rec-card-score">
                          <div
                            className="rec-score-value"
                            style={{ color: getScoreColor(inf.score) }}
                          >
                            {inf.score}
                          </div>
                          <div className="rec-score-label">匹配度</div>
                        </div>
                      </div>

                      <div className="rec-card-stats">
                        <div className="rec-stat-item">
                          <span className="rec-stat-value">{formatNumber(inf.followers)}</span>
                          <span className="rec-stat-label">粉丝</span>
                        </div>
                        <div className="rec-stat-item">
                          <span className="rec-stat-value">¥{parseFloat(inf.cost_per_post).toLocaleString()}</span>
                          <span className="rec-stat-label">报价</span>
                        </div>
                        <div className="rec-stat-item">
                          <span className="rec-stat-value">{inf.engagement_rate}%</span>
                          <span className="rec-stat-label">互动率</span>
                        </div>
                        <div className="rec-stat-item">
                          <span className="rec-stat-value">{inf.collaboration_count}次</span>
                          <span className="rec-stat-label">合作</span>
                        </div>
                      </div>

                      {inf.match_tags && inf.match_tags.length > 0 && (
                        <div className="rec-card-tags">
                          {inf.match_tags.map((tag, tagIdx) => (
                            <span key={tagIdx} className={`tag ${getMatchTagClass(tag.type)}`}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="rec-card-action">
                        <span className="rec-card-link">查看详情 →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendation;
