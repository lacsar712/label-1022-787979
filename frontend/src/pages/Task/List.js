import React, { useState, useEffect, useCallback } from 'react';
import { tasksApi, collaborationsApi, usersApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import TaskSidebar from '../../components/TaskSidebar';

const TaskPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollabId, setSidebarCollabId] = useState(null);
  const [sidebarCollabName, setSidebarCollabName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, collabsRes, usersRes] = await Promise.all([
        tasksApi.getList({ assignee_id: user.id, completed: filter === 'incomplete' ? false : undefined }),
        collaborationsApi.getList({ page_size: 100 }),
        usersApi.getList({ page_size: 100 })
      ]);
      setTasks(tasksRes.items);
      setCollaborations(collabsRes.items);
      setUsers(usersRes.items);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user.id, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCollabName = (collabId) => {
    const collab = collaborations.find(c => c.id === collabId);
    return collab?.project_name || '未知项目';
  };

  const isOverdue = (task) => {
    if (task.completed || !task.due_date) return false;
    return new Date(task.due_date) < new Date(new Date().toDateString());
  };

  const handleToggleComplete = async (task) => {
    try {
      await tasksApi.update(task.id, { completed: !task.completed });
      showToast('success', task.completed ? '已标记为未完成' : '已标记为完成');
      fetchData();
    } catch {
    }
  };

  const openSidebar = (collabId, collabName) => {
    setSidebarCollabId(collabId);
    setSidebarCollabName(collabName);
    setSidebarOpen(true);
  };

  const handleEditClick = (task) => {
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      assignee_id: task.assignee_id || '',
      due_date: task.due_date || ''
    });
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      await tasksApi.update(editingTaskId, {
        title: editFormData.title,
        assignee_id: editFormData.assignee_id ? parseInt(editFormData.assignee_id) : null,
        due_date: editFormData.due_date || null
      });
      showToast('success', '任务已更新');
      setEditingTaskId(null);
      fetchData();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await tasksApi.delete(deleteId);
      showToast('success', '任务已删除');
      setDeleteId(null);
      fetchData();
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'incomplete') return !task.completed;
    if (filter === 'overdue') return isOverdue(task);
    if (filter === 'completed') return task.completed;
    return true;
  });

  const overdueCount = tasks.filter(isOverdue).length;
  const incompleteCount = tasks.filter(t => !t.completed).length;

  const groupedTasks = {};
  filteredTasks.forEach(task => {
    const key = task.collaboration_id;
    if (!groupedTasks[key]) {
      groupedTasks[key] = {
        collabName: getCollabName(task.collaboration_id),
        tasks: []
      };
    }
    groupedTasks[key].tasks.push(task);
  });

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">我的任务</h2>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div className="task-filter-bar">
            <button
              className={`task-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              全部 ({tasks.length})
            </button>
            <button
              className={`task-filter-btn ${filter === 'incomplete' ? 'active' : ''}`}
              onClick={() => setFilter('incomplete')}
            >
              未完成 ({incompleteCount})
            </button>
            <button
              className={`task-filter-btn ${filter === 'overdue' ? 'active' : ''}`}
              onClick={() => setFilter('overdue')}
            >
              已逾期 ({overdueCount})
            </button>
            <button
              className={`task-filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              已完成 ({tasks.filter(t => t.completed).length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : filteredTasks.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">暂无任务</div>
              <div className="empty-description">
                {filter === 'all' ? '还没有指派给您的任务' : '当前筛选条件下没有任务'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        Object.entries(groupedTasks).map(([collabId, group]) => (
          <div className="card" key={collabId} style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <div className="task-group-header">
                <span className="task-group-name">{group.collabName}</span>
                <span className="task-group-count">
                  {group.tasks.filter(t => t.completed).length}/{group.tasks.length} 已完成
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => openSidebar(parseInt(collabId), group.collabName)}
              >
                打开待办 →
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>状态</th>
                    <th>任务标题</th>
                    <th>负责人</th>
                    <th>截止日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map(task => (
                    <tr key={task.id} className={task.completed ? 'task-row-completed' : ''}>
                      <td>
                        <button
                          className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                          onClick={() => handleToggleComplete(task)}
                        >
                          {task.completed && <span>✓</span>}
                        </button>
                      </td>
                      <td>
                        {editingTaskId === task.id ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editFormData.title}
                            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                            style={{ maxWidth: '300px' }}
                          />
                        ) : (
                          <span className={task.completed ? 'task-text-completed' : ''}>
                            {task.title}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingTaskId === task.id ? (
                          <select
                            className="form-select"
                            value={editFormData.assignee_id}
                            onChange={(e) => setEditFormData({ ...editFormData, assignee_id: e.target.value })}
                            style={{ width: '120px' }}
                          >
                            <option value="">未指派</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.nickname || u.username}</option>
                            ))}
                          </select>
                        ) : (
                          <span>👤 {task.assignee ? (task.assignee.nickname || task.assignee.username) : '未指派'}</span>
                        )}
                      </td>
                      <td>
                        {editingTaskId === task.id ? (
                          <input
                            type="date"
                            className="form-input"
                            value={editFormData.due_date}
                            onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                            style={{ width: '150px' }}
                          />
                        ) : (
                          <span className={`task-due ${isOverdue(task) ? 'overdue' : ''}`}>
                            {task.due_date || '-'}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingTaskId === task.id ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={saving}>
                              {saving ? '保存中...' : '保存'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingTaskId(null)}>
                              取消
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleEditClick(task)}
                            >
                              编辑
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error-color)' }}
                              onClick={() => setDeleteId(task.id)}
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
          </div>
        ))
      )}

      <TaskSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collaborationId={sidebarCollabId}
        collaborationName={sidebarCollabName}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除确认"
        message="确定要删除这条任务吗？"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default TaskPage;
