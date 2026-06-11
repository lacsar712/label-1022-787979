import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { snapshotsApi } from '../api';

const formatValue = (val) => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (val >= 100000000) return (val / 100000000).toFixed(2) + '亿';
    if (val >= 10000) return (val / 10000).toFixed(1) + '万';
    return val.toLocaleString();
  }
  return String(val);
};

const formatDiff = (diff) => {
  if (diff === null || diff === undefined) return '-';
  const prefix = diff > 0 ? '+' : '';
  return prefix + formatValue(diff);
};

const formatPercent = (percent) => {
  if (percent === null || percent === undefined) return '-';
  const prefix = percent > 0 ? '+' : '';
  return prefix + percent.toFixed(2) + '%';
};

const SnapshotListModal = ({ isOpen, onClose }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
      setSelected([]);
      setCompareResult(null);
    }
  }, [isOpen]);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const res = await snapshotsApi.getList();
      setSnapshots(res);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setCompareResult(null);
  };

  const handleCompare = async () => {
    if (selected.length !== 2) return;
    try {
      setComparing(true);
      const res = await snapshotsApi.compare(selected[0], selected[1]);
      setCompareResult(res);
    } catch {
    } finally {
      setComparing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await snapshotsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchSnapshots();
      setSelected(prev => prev.filter(x => x !== deleteTarget.id));
      if (compareResult) {
        const ids = [compareResult.snapshot_a.id, compareResult.snapshot_b.id];
        if (ids.includes(deleteTarget.id)) setCompareResult(null);
      }
    } catch {
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="经营快照管理"
        size="large"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {selected.length === 0
                ? '勾选两条快照可进行对比'
                : selected.length === 1
                  ? '请再选择一条快照进行对比'
                  : '已选择两条快照，可点击对比'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={onClose}>关闭</button>
              <button
                className="btn btn-primary"
                onClick={handleCompare}
                disabled={selected.length !== 2 || comparing}
              >
                {comparing ? '对比中...' : '并列对比'}
              </button>
            </div>
          </div>
        }
      >
        <div className="snapshot-list-container">
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : snapshots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📷</div>
              <div className="empty-title">暂无快照</div>
              <div className="empty-description">在仪表盘页面点击「创建快照」存档当前经营数据</div>
            </div>
          ) : (
            <div className="snapshot-list-body">
              <div className="snapshot-list-section">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>快照名称</th>
                      <th>创建人</th>
                      <th>创建时间</th>
                      <th style={{ width: '60px' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map(snap => (
                      <tr
                        key={snap.id}
                        className={selected.includes(snap.id) ? 'snapshot-row-selected' : ''}
                        onClick={() => handleSelect(snap.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(snap.id)}
                            onChange={() => handleSelect(snap.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{snap.name}</span>
                        </td>
                        <td>{snap.creator_name || '-'}</td>
                        <td>{formatDate(snap.created_at)}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--error-color)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(snap);
                            }}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {compareResult && (
                <div className="snapshot-compare-section">
                  <div className="snapshot-compare-header">
                    <span className="snapshot-compare-title">对比结果</span>
                    <span className="snapshot-compare-subtitle">
                      {compareResult.snapshot_a.name} vs {compareResult.snapshot_b.name}
                    </span>
                  </div>
                  <div className="snapshot-compare-table-wrapper">
                    <table className="table snapshot-compare-table">
                      <thead>
                        <tr>
                          <th>指标</th>
                          <th>{compareResult.snapshot_a.name}</th>
                          <th>{compareResult.snapshot_b.name}</th>
                          <th>变化差值</th>
                          <th>涨跌幅</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareResult.indicators.map((ind, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 500 }}>{ind.label}</td>
                            <td>{formatValue(ind.value_a)}</td>
                            <td>{formatValue(ind.value_b)}</td>
                            <td>
                              <span className={
                                ind.diff !== null && ind.diff > 0
                                  ? 'snapshot-diff-up'
                                  : ind.diff !== null && ind.diff < 0
                                    ? 'snapshot-diff-down'
                                    : ''
                              }>
                                {formatDiff(ind.diff)}
                              </span>
                            </td>
                            <td>
                              <span className={
                                ind.percent !== null && ind.percent > 0
                                  ? 'snapshot-diff-up'
                                  : ind.percent !== null && ind.percent < 0
                                    ? 'snapshot-diff-down'
                                    : ''
                              }>
                                {formatPercent(ind.percent)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title="确认删除"
          message={`确定要删除快照「${deleteTarget.name}」吗？此操作不可撤销。`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default SnapshotListModal;
