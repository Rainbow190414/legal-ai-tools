import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, X, Plus, Trash2, FolderOpen, FileText, Upload } from 'lucide-react'
import * as db from '../utils/db'
import '../case-styles.css'

function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const [caseData, setCaseData] = useState(null)
  const [activeTab, setActiveTab] = useState('materials')
  const [newMaterial, setNewMaterial] = useState({ title: '', content: '' })
  const [newNote, setNewNote] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [caseFiles, setCaseFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadCaseData()
    loadCaseFiles()
  }, [id])

  const loadCaseData = async () => {
    const data = await db.getCaseById(id)
    if (data) {
      setCaseData(data)
      setEditForm({ name: data.name, type: data.type, parties: data.parties, description: data.description, status: data.status })
    }
  }

  const loadCaseFiles = async () => {
    const files = await db.getCaseFiles(id)
    setCaseFiles(files)
  }

  const handleSaveEdit = async () => {
    await db.updateCase(id, editForm)
    setCaseData(prev => ({ ...prev, ...editForm }))
    setIsEditing(false)
  }

  const handleAddMaterial = async () => {
    if (!newMaterial.title.trim() || !newMaterial.content.trim()) return
    const materials = [...(caseData.materials || []), {
      id: Date.now().toString(),
      title: newMaterial.title.trim(),
      content: newMaterial.content.trim(),
      createdAt: new Date().toISOString()
    }]
    await db.updateCase(id, { materials })
    setCaseData(prev => ({ ...prev, materials }))
    setNewMaterial({ title: '', content: '' })
  }

  const handleDeleteMaterial = async (materialId) => {
    const materials = (caseData.materials || []).filter(m => m.id !== materialId)
    await db.updateCase(id, { materials })
    setCaseData(prev => ({ ...prev, materials }))
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    const notes = [...(caseData.notes || []), {
      id: Date.now().toString(),
      content: newNote.trim(),
      createdAt: new Date().toISOString()
    }]
    await db.updateCase(id, { notes })
    setCaseData(prev => ({ ...prev, notes }))
    setNewNote('')
  }

  const handleDeleteNote = async (noteId) => {
    const notes = (caseData.notes || []).filter(n => n.id !== noteId)
    await db.updateCase(id, { notes })
    setCaseData(prev => ({ ...prev, notes }))
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setUploading(true)
    const existingNames = new Set((caseFiles || []).map(f => f.name))
    let skipped = 0, added = 0
    try {
      for (const file of files) {
        if (existingNames.has(file.name)) { skipped++; continue }
        await db.addCaseFile(id, file)
        added++
      }
      await loadCaseFiles()
      const msg = added > 0 ? `成功上传 ${added} 个文件` : ''
      if (skipped > 0) alert((msg ? msg + '，' : '') + `跳过 ${skipped} 个重复文件`)
      else if (msg) alert(msg)
    } catch (err) {
      alert('文件上传失败: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setUploading(true)
    const existingNames = new Set((caseFiles || []).map(f => f.name))
    try {
      let added = 0, skipped = 0
      for (const file of files) {
        const relativePath = file.webkitRelativePath || file.name
        if (existingNames.has(file.name)) { skipped++; continue }
        await db.addCaseFile(id, file, relativePath)
        added++
      }
      await loadCaseFiles()
      let msg = `成功上传 ${added} 个文件` + (skipped > 0 ? `，跳过 ${skipped} 个重复文件` : '')
      alert(msg)
    } catch (err) {
      alert('文件夹上传失败: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteFile = async (fileId) => {
    if (!confirm('确定要删除这个文件吗？')) return
    await db.deleteCaseFile(fileId, id)
    await loadCaseFiles()
  }

  if (!caseData) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>案件不存在或已被删除</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(-1)}>返回</button>
        </div>
      </div>
    )
  }

  const materials = caseData.materials || []
  const notes = caseData.notes || []

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          返回
        </button>
      </div>

      <div className="case-info-card">
        {isEditing ? (
          <>
            <div className="form-group">
              <label className="form-label">案件名称</label>
              <input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">案件类型</label>
                <select className="form-select" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                  <option>民事案件</option><option>刑事案件</option><option>行政案件</option>
                  <option>劳动争议</option><option>合同纠纷</option><option>侵权纠纷</option>
                  <option>婚姻家庭</option><option>知识产权</option><option>其他</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">状态</label>
                <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option>进行中</option><option>已结案</option><option>暂停</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">当事人</label>
              <input className="form-input" value={editForm.parties} onChange={e => setEditForm({ ...editForm, parties: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">描述</label>
              <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
            </div>
            <div className="case-info-actions">
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}><Save size={14} />保存</button>
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}>取消</button>
            </div>
          </>
        ) : (
          <>
            <div className="case-info-display">
              <div className="case-info-row"><span className="case-info-label">名称</span><span className="case-info-value">{caseData.name}</span></div>
              <div className="case-info-row"><span className="case-info-label">类型</span><span className="case-info-value">{caseData.type}</span></div>
              <div className="case-info-row"><span className="case-info-label">状态</span><span className={`case-status ${caseData.status === '进行中' ? 'status-active' : caseData.status === '已结案' ? 'status-closed' : 'status-paused'}`}>{caseData.status}</span></div>
              {caseData.parties && <div className="case-info-row"><span className="case-info-label">当事人</span><span className="case-info-value">{caseData.parties}</span></div>}
              {caseData.description && <div className="case-info-row"><span className="case-info-label">描述</span><span className="case-info-value">{caseData.description}</span></div>}
            </div>
            <div className="case-info-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>编辑信息</button>
            </div>
          </>
        )}
      </div>

      <div className="case-tabs">
        <button className={`case-tab ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>案件材料</button>
        <button className={`case-tab ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>文件管理</button>
        <button className={`case-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>进展记录</button>
      </div>

      {activeTab === 'materials' && (
        <div className="case-tab-content">
          <div className="note-input-area">
            <input className="form-input" placeholder="材料标题" value={newMaterial.title} onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })} />
            <textarea className="form-textarea" placeholder="材料内容" value={newMaterial.content} onChange={e => setNewMaterial({ ...newMaterial, content: e.target.value })} rows={4} />
            <button className="btn btn-primary btn-sm" onClick={handleAddMaterial} disabled={!newMaterial.title.trim() || !newMaterial.content.trim()}><Plus size={14} />添加材料</button>
          </div>
          <div className="notes-list">
            {materials.length === 0 ? <div className="empty-state"><p>暂无材料</p></div> : materials.map(m => (
              <div key={m.id} className="note-item">
                <div className="note-header"><strong>{m.title}</strong><span className="note-time">{new Date(m.createdAt).toLocaleString()}</span></div>
                <div className="note-content">{m.content}</div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMaterial(m.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="case-tab-content">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={14} />上传文件
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => folderInputRef.current?.click()} disabled={uploading}>
              <FolderOpen size={14} />添加文件夹
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            <input ref={folderInputRef} type="file" {...{ 'webkitdirectory': '', 'directory': '' }} onChange={handleFolderUpload} style={{ display: 'none' }} />
          </div>
          {uploading && <div className="loading-state"><div className="spinner-small"></div><span>上传中...</span></div>}
          <div className="file-list">
            {caseFiles.length === 0 ? <div className="empty-state"><p>暂无文件</p></div> : caseFiles.map(f => (
              <div key={f.id} className="file-item">
                <div className="file-item-info">
                  <span className="file-item-name">{f.name || f.path || '未命名文件'}</span>
                  <span className="file-item-meta">{f.size ? `${(f.size / 1024).toFixed(1)}KB` : ''}</span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFile(f.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="case-tab-content">
          <div className="note-input-area">
            <textarea className="form-textarea" placeholder="添加进展记录..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} />
            <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!newNote.trim()}><Plus size={14} />添加记录</button>
          </div>
          <div className="notes-list">
            {notes.length === 0 ? <div className="empty-state"><p>暂无记录</p></div> : notes.map(n => (
              <div key={n.id} className="note-item">
                <div className="note-header"><span className="note-time">{new Date(n.createdAt).toLocaleString()}</span></div>
                <div className="note-content">{n.content}</div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNote(n.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CaseDetail
