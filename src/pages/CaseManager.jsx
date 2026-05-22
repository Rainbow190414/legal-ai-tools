import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCase } from '../context/CaseContext'
import '../case-styles.css'

const CASE_TYPES = ['民事案件', '刑事案件', '行政案件', '劳动争议', '合同纠纷', '侵权纠纷', '婚姻家庭', '知识产权', '其他']

export default function CaseManager() {
  const navigate = useNavigate()
  const { cases, loading, addCase, removeCase } = useCase()
  const [showCreate, setShowCreate] = useState(false)
  const [newCase, setNewCase] = useState({
    name: '',
    type: '民事案件',
    description: '',
    parties: '',
  })
  const [deletingId, setDeletingId] = useState(null)

  const handleCreate = async () => {
    if (!newCase.name.trim()) return
    await addCase(newCase)
    setNewCase({ name: '', type: '民事案件', description: '', parties: '' })
    setShowCreate(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个案件吗？所有关联的文件和记录都将被删除。')) return
    await removeCase(id)
    setDeletingId(null)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  const getStatusClass = (status) => {
    switch (status) {
      case '进行中': return 'status-active'
      case '已结案': return 'status-closed'
      case '暂停': return 'status-paused'
      default: return ''
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-btn">← 返回首页</button>
        <h1 className="page-title">📁 案件档案管理</h1>
      </div>

      {/* 统计栏 */}
      <div className="case-stats">
        <div className="stat-card">
          <div className="stat-number">{cases.length}</div>
          <div className="stat-label">全部案件</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{cases.filter(c => c.status === '进行中').length}</div>
          <div className="stat-label">进行中</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{cases.filter(c => c.status === '已结案').length}</div>
          <div className="stat-label">已结案</div>
        </div>
      </div>

      {/* 新建案件按钮 */}
      <div className="case-actions">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + 新建案件
        </button>
      </div>

      {/* 新建案件弹窗 */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">新建案件</h2>
            <div className="form-group">
              <label className="form-label">案件名称 *</label>
              <input
                className="form-input"
                type="text"
                placeholder="例：张三诉李四合同纠纷案"
                value={newCase.name}
                onChange={e => setNewCase({ ...newCase, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">案件类型</label>
              <select
                className="form-select"
                value={newCase.type}
                onChange={e => setNewCase({ ...newCase, type: e.target.value })}
              >
                {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">当事人信息</label>
              <input
                className="form-input"
                type="text"
                placeholder="例：原告：张三，被告：李四"
                value={newCase.parties}
                onChange={e => setNewCase({ ...newCase, parties: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">案件描述</label>
              <textarea
                className="form-textarea"
                placeholder="简要描述案件基本情况..."
                value={newCase.description}
                onChange={e => setNewCase({ ...newCase, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newCase.name.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 案件列表 */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>加载中...</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <p>还没有案件档案</p>
          <p className="empty-hint">点击"新建案件"开始管理你的案件</p>
        </div>
      ) : (
        <div className="case-list">
          {cases.map(c => (
            <div key={c.id} className="case-card">
              <div className="case-card-header">
                <button 
                  onClick={() => navigate(`/case/${c.id}`)} 
                  className="case-card-title"
                  style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'}}
                >
                  {c.name}
                </button>
                <span className={`case-status ${getStatusClass(c.status)}`}>
                  {c.status}
                </span>
              </div>
              <div className="case-card-meta">
                <span className="case-type">{c.type}</span>
                <span className="case-date">{formatDate(c.createdAt)}</span>
              </div>
              {c.parties && (
                <div className="case-card-parties">{c.parties}</div>
              )}
              {c.description && (
                <div className="case-card-desc">{c.description}</div>
              )}
              <div className="case-card-footer">
                <div className="case-card-info">
                  {c.fileCount > 0 && <span>📎 {c.fileCount} 个文件</span>}
                  {c.notes && c.notes.length > 0 && <span>📝 {c.notes.length} 条记录</span>}
                  {c.summary && <span>🤖 已生成摘要</span>}
                </div>
                <div className="case-card-actions">
                  <button 
                    onClick={() => navigate(`/case/${c.id}`)} 
                    className="btn btn-sm btn-outline"
                  >
                    查看详情
                  </button>
                  {deletingId === c.id ? (
                    <div className="confirm-delete">
                      <span>确定删除？</span>
                      <button className="btn btn-sm" onClick={() => handleDelete(c.id)}>确定</button>
                      <button className="btn btn-sm btn-outline" onClick={() => setDeletingId(null)}>取消</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline btn-danger"
                      onClick={() => setDeletingId(c.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
