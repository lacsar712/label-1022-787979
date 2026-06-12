import React, { useState } from 'react';
import Modal from './Modal';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '确认操作',
  message = '确定要执行此操作吗？',
  confirmText = '确定',
  cancelText = '取消',
  type = 'warning',
  loading = false,
  requirePassword = false
}) => {
  const [password, setPassword] = useState('');

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  const handleConfirm = () => {
    if (requirePassword) {
      onConfirm(password);
    } else {
      onConfirm();
    }
  };

  const isConfirmDisabled = loading || (requirePassword && !password.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
            {cancelText}
          </button>
          <button 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </>
      }
    >
      <div className="confirm-dialog">
        <div className={`confirm-icon ${type}`}>
          {type === 'danger' ? '⚠' : '?'}
        </div>
        <p className="confirm-message">{message}</p>
        {requirePassword && (
          <div className="confirm-password-section">
            <label className="confirm-password-label">请输入登录密码确认身份</label>
            <input
              type="password"
              className="form-input confirm-password-input"
              placeholder="请输入当前登录密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
