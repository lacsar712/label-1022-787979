import React, { useState, useEffect, useCallback } from 'react';
import { tasksApi, usersApi } from '../api';
import { showToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';

const TaskSidebar = ({ isOpen, onClose, collaborationId, collaborationName }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!collaborationId) return;
    try {
      setLoading(true);
      const data = await tasksApi.getList({ collaboration_id: collaborationId });
      setTasks(data.items);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [collaborationId]);

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getList({ page_size: 100 });
      setUsers(data.items);
    } catch {
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
      fetchUsers();
      setShowAddForm(false);
      setNewTitle('');
      setNewAssigneeId('');
      setNewDueDate('');
    }
  }, [isOpen, fetchTasks]);

  const handleAddTask = async () => {
    if (!newTitle.trim()) {
      showToast('error', '请输入任务标题');
      return;
    }
    try {
      setAdding(true);
      await tasksApi.create({
        title: newTitle.trim(),
        assignee_id: newAssigneeId ? parseInt(newAssigneeId) : null,
        due_date: newDueDate || null
      }, collaborationId);
      showToast('success', '任务已添加');
      setNewTitle('');
      setNewAssigneeId('');
      setNewDueDate('');
      setShowAddForm(false);
      fetchTasks();
    } catch {
    } finally {
      setAdding(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      await tasksApi.update(task.id, { completed: !task.completed });
      fetchTasks();
    } catch {
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await tasksApi.delete(deleteId);
      showToast('success', '任务已删除');
      setDeleteId(null);
      fetchTasks();
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  const isOverdue = (task) => {
    if (task.completed || !task.due_date) return false;
    return new Date(task.due_date) < new Date(new Date().toDateString());
  };

  const getAssigneeName = (task) => {
    if (task.assignee) {
      return task.assignee.nickname || task.assignee.username;
    }
    return '未指派';
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`task-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="task-sidebar-header">
          <div>
            <h3 className="task-sidebar-title">项目待办</h3>
            <div className="task-sidebar-subtitle">{collaborationName}</div>
          </div>
          <button className="task-sidebar-close" onClick={onClose}>✕</button>
        </div>

        <div className="task-sidebar-progress">
          <div className="task-progress-bar">
            <div
              className="task-progress-fill"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
          <span className="task-progress-text">{completedCount}/{totalCount} 已完成</span>
        </div>

        <div className="task-sidebar-body">
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : tasks.length === 0 ? (
            <div className="task-empty-state">
              <div className="task-empty-icon">📋</div>
              <div className="task-empty-text">暂无待办任务</div>
              <div className="task-empty-hint">点击下方按钮添加第一条任务</div>
            </div>
          ) : (
            <div className="task-list">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`task-item ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}`}
                >
                  <div className="task-item-left">
                    <button
                      className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                      onClick={() => handleToggleComplete(task)}
                    >
                      {task.completed && <span>✓</span>}
                    </button>
                    <div className="task-item-content">
                      <div className="task-item-title">{task.title}</div>
                      <div className="task-item-meta">
                        <span className="task-assignee">
                          👤 {getAssigneeName(task)}
                        </span>
                        {task.due_date && (
                          <span className={`task-due ${isOverdue(task) ? 'overdue' : ''}`}>
                            📅 {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    className="task-item-delete"
                    onClick={() => setDeleteId(task.id)}
                    title="删除任务"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="task-sidebar-footer">
          {showAddForm ? (
            <div className="task-add-form">
              <input
                type="text"
                className="form-input"
                placeholder="输入任务标题..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                autoFocus
              />
              <div className="task-add-row">
                <select
                  className="form-select"
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                >
                  <option value="">指派负责人</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nickname || u.username}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="form-input"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  placeholder="截止日期"
                />
              </div>
              <div className="task-add-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddTask}
                  disabled={adding}
                >
                  {adding ? '添加中...' : '确认添加'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowAddForm(false); setNewTitle(''); setNewAssigneeId(''); setNewDueDate(''); }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary task-add-btn"
              onClick={() => setShowAddForm(true)}
            >
              + 添加任务
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这条任务吗？"
        type="danger"
        loading={deleting}
      />
    </>
  );
};

export default TaskSidebar;
