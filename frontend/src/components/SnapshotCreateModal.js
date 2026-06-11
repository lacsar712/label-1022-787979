import React, { useState } from 'react';
import Modal from './Modal';

const SnapshotCreateModal = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onConfirm(name.trim());
    setName('');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="创建经营快照"
      size="medium"
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleCancel}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()}>确认存档</button>
        </>
      }
    >
      <div className="snapshot-create-form">
        <div className="snapshot-create-hint">
          将当前仪表盘的核心经营指标存档留存，方便后续对比分析。
        </div>
        <div className="form-group">
          <label className="form-label">快照名称</label>
          <input
            className="form-input"
            type="text"
            placeholder="例如：2025年Q1周报快照"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) handleSubmit();
            }}
          />
        </div>
        <div className="snapshot-create-note">
          快照将记录以下指标：网红总量、合作规模、粉丝覆盖、投放预算、互动数据汇总等
        </div>
      </div>
    </Modal>
  );
};

export default SnapshotCreateModal;
