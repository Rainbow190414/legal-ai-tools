import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scale, Settings, FileText, Search, Calculator, FileSearch,
  Shield, Briefcase, Gavel, ClipboardList, MessageSquare,
  FolderOpen, Plus, ChevronRight, Send, Trash2, Save, Sparkles,
  LayoutGrid, FileDown, Bot, BookOpen, PenTool, AlertTriangle, MailPlus, FileOutput,
  Upload, X, File
} from 'lucide-react'
import { useCase } from '../context/CaseContext'
import { exportToWord } from '../utils/wordExport'
import { chatWithKimi } from '../api/kimi'
import { prompts } from '../utils/prompts'
import * as db from '../utils/db'
import { readFileContent } from '../api/fileReader'
import '../case-styles.css'

const CASE_TYPES = ['民事案件', '刑事案件', '行政案件', '劳动争议', '合同纠纷', '侵权纠纷', '婚姻家庭', '知识产权', '其他']

const AI_TOOLS = [
  { id: 'contract-review', name: '合同审查', icon: FileSearch, color: '#3b82f6', promptKey: 'CONTRACT_REVIEW_PROMPT' },
  { id: 'nda-triage', name: 'NDA审查', icon: Shield, color: '#10b981', promptKey: 'NDA_TRIAGE_PROMPT' },
  { id: 'case-reading', name: '案件卷宗阅读', icon: BookOpen, color: '#8b5cf6', promptKey: 'CASE_READING_PROMPT' },
  { id: 'transcript-organizer', name: '笔录整理', icon: FileText, color: '#f59e0b', promptKey: 'TRANSCRIPT_ORGANIZER_PROMPT' },
  { id: 'legal-doc-gen', name: '法律文书生成', icon: PenTool, color: '#ec4899', promptKey: 'LEGAL_DOC_GEN_PROMPT' },
  { id: 'risk-assessment', name: '风险评估', icon: AlertTriangle, color: '#ef4444', promptKey: 'RISK_ASSESSMENT_PROMPT' },
  { id: 'compliance', name: '合规审查', icon: Scale, color: '#06b6d4', promptKey: 'COMPLIANCE_PROMPT' },
  { id: 'canned-responses', name: '模板回复', icon: MailPlus, color: '#84cc16', promptKey: 'CANNED_RESPONSES_PROMPT' },
  { id: 'meeting-to-plan', name: '会议纪要转方案', icon: FileOutput, color: '#f97316', promptKey: 'MEETING_TO_PLAN_PROMPT' },
  { id: 'meeting-briefing', name: '会议简报', icon: ClipboardList, color: '#6366f1', promptKey: 'MEETING_BRIEFING_PROMPT' },
  { id: 'file-desensitize', name: '文件脱敏', icon: Shield, color: '#14b8a6', promptKey: 'FILE_DESENSITIZE_PROMPT' },
  { id: 'legal-search', name: '法律检索', icon: Search, color: '#2b6cb0', promptKey: 'LEGAL_SEARCH_PROMPT' },
]

const CALC_TOOLS = [
  { id: 'litigation-fee', name: '诉讼费计算器', icon: Calculator },
  { id: 'interest-calc', name: '利息计算器', icon: Calculator },
  { id: 'penalty-calc', name: '违约金计算器', icon: Calculator },
  { id: 'statute-limitations', name: '诉讼时效计算', icon: Calculator },
]

const FILE_TOOLS = [
  { id: 'pdf-to-image', name: 'PDF转图片', icon: FileText },
  { id: 'image-watermark', name: '图片水印', icon: FileText },
  { id: 'image-stitch', name: '图片拼接', icon: FileText },
]

function Workspace() {
  const navigate = useNavigate()
  const { cases, currentCase, selectCase, addCase: createCase, removeCase: deleteCase, loading } = useCase()

  const [showCreateCase, setShowCreateCase] = useState(false)
  const [newCase, setNewCase] = useState({ name: '', type: '民事案件', description: '', parties: '' })
  const [deletingId, setDeletingId] = useState(null)
  const [activeTab, setActiveTab] = useState('ai')
  const [selectedTool, setSelectedTool] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [caseFiles, setCaseFiles] = useState({})
  const [selectedRefFiles, setSelectedRefFiles] = useState([])
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const loadAllCaseFiles = async () => {
      const filesMap = {}
      for (const c of cases) {
        try {
          const files = await db.getCaseFiles(c.id)
          filesMap[c.id] = files
        } catch (err) { console.error('加载案件文件失败:', err) }
      }
      setCaseFiles(filesMap)
    }
    if (cases.length > 0) loadAllCaseFiles()
  }, [cases])

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

  const getStatusClass = (status) => {
    switch (status) {
      case '进行中': return 'status-active'
      case '已结案': return 'status-closed'
      case '暂停': return 'status-paused'
      default: return ''
    }
  }

  const handleCreateCase = async () => {
    if (!newCase.name.trim()) return
    await createCase(newCase)
    setNewCase({ name: '', type: '民事案件', description: '', parties: '' })
    setShowCreateCase(false)
  }

  const handleDeleteCase = async (id) => {
    if (!window.confirm('确定要删除这个案件吗？')) return
    await deleteCase(id)
    setDeletingId(null)
  }

  const handleToolSelect = (tool) => {
    setSelectedTool(tool)
    setMessages([{ id: Date.now(), role: 'system', content: `已选择工具：${tool.name}`, timestamp: new Date() }])
    setUploadedFiles([])
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    const newFiles = files.map(f => ({ name: f.name, size: f.size, type: f.type, file: f }))
    setUploadedFiles(prev => [...prev, ...newFiles])
    const fileNames = files.map(f => `📎 ${f.name} (${(f.size / 1024).toFixed(1)}KB)`).join('\n')
    const fileMessage = { id: Date.now(), role: 'user', content: `上传了以下文件：\n${fileNames}`, timestamp: new Date(), isFileMessage: true }
    setMessages(prev => [...prev, fileMessage])
    e.target.value = ''
  }

  const removeUploadedFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return

    let fileContentText = ''
    if (uploadedFiles.length > 0) {
      setIsLoading(true)
      try {
        const contents = []
        for (const uf of uploadedFiles) {
          try {
            const content = await readFileContent(uf.file)
            contents.push(`=== ${uf.name} ===\n${content}`)
          } catch (err) {
            contents.push(`=== ${uf.name} ===\n[读取失败: ${err.message}]`)
          }
        }
        fileContentText = '\n\n以下为上传文件内容：\n' + contents.join('\n\n')
      } catch (error) {
        console.error('文件读取失败:', error)
      }
    }

    const userText = inputText.trim()
    // 构建案件上下文
    let caseContext = ''
    if (currentCase) {
      caseContext = '\n\n【当前案件信息】\n'
      caseContext += `案件名称：${currentCase.name}\n`
      caseContext += `案件类型：${currentCase.type}\n`
      if (currentCase.parties) caseContext += `当事人：${currentCase.parties}\n`
      if (currentCase.description) caseContext += `案件描述：${currentCase.description}\n`
      if (currentCase.summary) caseContext += `\n【案件摘要】\n${currentCase.summary}\n`
      if (currentCase.notes && currentCase.notes.length > 0) {
        caseContext += '\n【进展记录】\n'
        currentCase.notes.forEach((note, i) => {
          const date = new Date(note.createdAt).toLocaleDateString('zh-CN')
          caseContext += `${i + 1}. [${date}] ${note.content}\n`
        })
      }
    }

    // 引用文件内容
    let refFilesContent = ''
    if (selectedRefFiles.length > 0 && caseFiles[currentCase?.id]) {
      const selectedFiles = caseFiles[currentCase.id].filter(f => selectedRefFiles.includes(f.id))
      if (selectedFiles.length > 0) {
        refFilesContent = '\n\n【引用案件文件】\n'
        for (const f of selectedFiles) {
          refFilesContent += `=== ${f.name} ===\n`
          if (f.data) {
            try {
              const ext = (f.name || '').split('.').pop().toLowerCase()
              let text = ''
              if (['docx', 'xlsx', 'pptx'].includes(ext)) {
                // 直接传 ArrayBuffer 给 JSZip
                const { default: JSZip } = await import('jszip')
                const zip = await JSZip.loadAsync(f.data)
                const targetFile = ext === 'docx' ? 'word/document.xml' : ext === 'xlsx' ? 'xl/sharedStrings.xml' : 'ppt/slides/slide1.xml'
                let xmlFile = zip.file(targetFile)
                if (!xmlFile) {
                  const allFiles = Object.keys(zip.files)
                  const matched = allFiles.find(fn => fn.includes('document.xml') || fn.includes('sharedStrings.xml') || fn.includes('slide'))
                  if (matched) xmlFile = zip.file(matched)
                }
                if (xmlFile) {
                  const xml = await xmlFile.async('text')
                  const matches = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || xml.match(/<t[^>]*>([^<]+)<\/t>/g)
                  text = matches ? matches.map(m => m.replace(/<\/?[wa]?:t[^>]*>/g, '')).join('') : xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                }
              } else if (ext === 'pdf') {
                const bytes = new Uint8Array(f.data)
                const decoder = new TextDecoder('utf-8', { fatal: false })
                text = decoder.decode(bytes)
              } else {
                // 文本文件
                const decoder = new TextDecoder('utf-8', { fatal: false })
                text = decoder.decode(f.data)
              }
              if (!text || !text.trim()) {
                refFilesContent += `[文件 ${f.name}: 无法提取文本]\n`
              } else {
                const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n...(文件过长，已截断)' : text
                refFilesContent += truncated + '\n'
              }
            } catch (err) {
              refFilesContent += `[文件 ${f.name}: 读取失败 - ${err.message}]\n`
            }
          } else {
            refFilesContent += `[文件数据不可用]\n`
          }
        }
      }
    }

    const fullContent = userText + fileContentText + caseContext + refFilesContent

    const userMessage = { id: Date.now(), role: 'user', content: userText || `请分析上传的${uploadedFiles.length}个文件`, timestamp: new Date() }
    let aiMessage = null
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setUploadedFiles([])
    setIsLoading(true)

    try {
      const systemPrompt = selectedTool ? (prompts[selectedTool.promptKey] || '') : '你是一位专业的法律AI助手，请根据用户提供的内容进行分析。'
      console.log('调用AI, prompt长度:', systemPrompt.length, 'content长度:', fullContent.length)
      const response = await chatWithKimi([{ role: 'system', content: systemPrompt }, { role: 'user', content: fullContent }])
      console.log('AI响应长度:', response?.length)
      aiMessage = { id: Date.now() + 1, role: 'assistant', content: response, timestamp: new Date(), toolId: selectedTool?.id, toolName: selectedTool?.name }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('handleSendMessage 错误:', error.message, error.stack)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'error', content: '处理出错，请重试', timestamp: new Date() }])
    } finally {
      setIsLoading(false)
    }
    // 保存会话消息（不影响主流程）
    if (currentCase) {
      try {
        await db.addSessionMessage(currentCase.id, userMessage)
        await db.addSessionMessage(currentCase.id, aiMessage)
      } catch (err) {
        console.error('会话保存失败:', err)
      }
    }
  }

  const handleExportWord = async (message) => {
    if (!message || message.role !== 'assistant') return
    try { await exportToWord({ title: `${message.toolName || 'AI分析'}结果`, content: message.content, metadata: { tool: message.toolName, timestamp: message.timestamp, caseName: currentCase?.name } }) } catch (error) { alert('导出失败') }
  }

  // 保存AI回复到案件文件
  const handleSaveToCase = async (message) => {
    if (!message || !currentCase) return
    try {
      const fileName = `${message.toolName || 'AI分析'}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`
      const blob = new Blob([message.content], { type: 'text/plain' })
      const file = new File([blob], fileName, { type: 'text/plain' })
      await db.addCaseFile(currentCase.id, file)
      const files = await db.getCaseFiles(currentCase.id)
      setCaseFiles(prev => ({ ...prev, [currentCase.id]: files }))
      alert('已保存到案件文件')
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请重试')
    }
  }

  const renderMessage = (message) => {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'
    return (
      <div key={message.id} className={`message ${isUser ? 'message-user' : isSystem ? 'message-system' : 'message-ai'}`}>
        <div className="message-avatar">{isUser ? <div className="avatar-user">我</div> : isSystem ? <Bot size={16} /> : <Sparkles size={16} />}</div>
        <div className="message-content">
          <div className="message-header"><span className="message-role">{isUser ? '我' : isSystem ? '系统' : 'AI助手'}</span><span className="message-time">{message.timestamp?.toLocaleTimeString()}</span></div>
          <div className="message-body">{message.content}</div>
          {message.role === 'assistant' && <div className="message-actions"><button className="message-action-btn" onClick={() => handleExportWord(message)}><FileDown size={14} />导出Word</button>{currentCase && <button className="message-action-btn" onClick={() => handleSaveToCase(message)} title="保存到案件文件"><Save size={14} />保存到案件</button>}</div>}
        </div>
      </div>
    )
  }

  // 渲染空状态图标
  const renderEmptyIcon = () => {
    if (selectedTool && selectedTool.icon) {
      const IconComponent = selectedTool.icon
      return <IconComponent size={40} style={{ color: selectedTool.color }} />
    }
    return <Upload size={40} />
  }

  // 渲染面板标题
  const renderPanelTitle = () => {
    if (selectedTool) {
      const IconComponent = selectedTool.icon
      return <><IconComponent size={18} style={{ color: selectedTool.color }} />{selectedTool.name}</>
    }
    return <><MessageSquare size={18} />对话工作台</>
  }

  return (
    <div className="workspace">
      {/* 左侧：案件管理 */}
      <aside className="workspace-panel workspace-left">
        <div className="panel-header"><h3 className="panel-title"><FolderOpen size={18} />案件档案管理</h3><button className="panel-action-btn" onClick={() => setShowCreateCase(true)} title="新建案件"><Plus size={16} /></button></div>
        <div className="panel-content">
          <div className="case-stats-mini">
            <div className="stat-mini"><span className="stat-num">{cases.length}</span><span className="stat-lbl">全部</span></div>
            <div className="stat-mini"><span className="stat-num active">{cases.filter(c => c.status === '进行中').length}</span><span className="stat-lbl">进行中</span></div>
            <div className="stat-mini"><span className="stat-num closed">{cases.filter(c => c.status === '已结案').length}</span><span className="stat-lbl">已结案</span></div>
          </div>
          {loading ? <div className="loading-state"><div className="spinner-small"></div><span>加载中...</span></div> : cases.length === 0 ? <div className="empty-state"><FolderOpen size={32} /><p>暂无案件</p><button className="btn btn-primary btn-sm" onClick={() => setShowCreateCase(true)}>创建案件</button></div> :
            <div className="case-list-in-panel">
              {cases.map(c => (
                <div key={c.id} className={`case-item-in-panel ${currentCase?.id === c.id ? 'active' : ''}`}>
                  <div className="case-item-main" onClick={() => { selectCase(c.id); setSelectedRefFiles([]) }}>
                    <div className="case-item-top"><span className="case-item-name">{c.name}</span><span className={`case-status-mini ${getStatusClass(c.status)}`}>{c.status}</span></div>
                    <div className="case-item-meta"><span className="case-type-mini">{c.type}</span><span className="case-date-mini">{formatDate(c.createdAt)}</span></div>
                    {c.parties && <div className="case-parties-mini">{c.parties}</div>}
                  </div>
                  <div className="case-item-actions">
                    <button className="case-action-btn" onClick={(e) => { e.stopPropagation(); navigate(`/case/${c.id}`) }}><ChevronRight size={14} /></button>
                    {deletingId === c.id ? <div className="confirm-delete-mini"><button className="del-yes" onClick={(e) => { e.stopPropagation(); handleDeleteCase(c.id) }}>是</button><button className="del-no" onClick={(e) => { e.stopPropagation(); setDeletingId(null) }}>否</button></div> : <button className="case-action-btn danger" onClick={(e) => { e.stopPropagation(); setDeletingId(c.id) }}><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>}
        </div>

        {currentCase && caseFiles[currentCase.id] && caseFiles[currentCase.id].length > 0 && (
          <div className="panel-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>📎 引用文件</span>
              <button
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#fff', color: '#3b82f6', cursor: 'pointer' }}
                onClick={() => {
                  const allIds = (caseFiles[currentCase.id] || []).map(f => f.id);
                  setSelectedRefFiles(selectedRefFiles.length === allIds.length ? [] : allIds);
                }}
              >
                {selectedRefFiles.length === (caseFiles[currentCase.id] || []).length ? '取消全选' : '全选'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto' }}>
              {(caseFiles[currentCase.id] || []).map(f => (
                <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', cursor: 'pointer', padding: '3px 0' }}>
                  <input
                    type="checkbox"
                    checked={selectedRefFiles.includes(f.id)}
                    onChange={() => {
                      setSelectedRefFiles(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]);
                    }}
                    style={{ margin: 0 }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* 中间：对话工作台 */}
      <main className="workspace-panel workspace-center">
        <div className="panel-header"><h3 className="panel-title">{renderPanelTitle()}</h3>{currentCase && <div className="current-case-badge"><Briefcase size={12} />{currentCase.name}</div>}</div>
        <div className="panel-content chat-area">
          {!selectedTool && messages.length === 0 ? (
            <div className="empty-state large"><Sparkles size={48} /><h4>欢迎使用智能工作台</h4><p>从右侧选择工具，或直接上传文件开始工作</p></div>
          ) : messages.length === 0 ? (
            <div className="empty-state">{renderEmptyIcon()}<h4>{selectedTool ? selectedTool.name : '文件上传'}</h4><p>在下方输入框中描述需求，或直接上传文件</p></div>
          ) : (
            <div className="messages-container">{messages.map(renderMessage)}{isLoading && <div className="message message-ai"><div className="message-avatar"><Sparkles size={16} /></div><div className="message-content"><div className="typing-indicator"><span></span><span></span><span></span></div></div></div>}<div ref={messagesEndRef} /></div>
          )}
        </div>
        <div className="panel-footer chat-input-area">
          {uploadedFiles.length > 0 && (
            <div className="uploaded-files-bar">
              {uploadedFiles.map((uf, i) => (
                <div key={i} className="uploaded-file-chip">
                  <File size={12} />
                  <span className="uploaded-file-name">{uf.name}</span>
                  <button className="uploaded-file-remove" onClick={() => removeUploadedFile(i)}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="chat-input-wrapper">
            <button className="chat-upload-btn" onClick={() => fileInputRef.current?.click()} title="上传文件">
              <Upload size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.json,.csv,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.bmp,.webp,.rtf,.xml,.html,.htm"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <textarea className="chat-input" placeholder="描述您的需求，或直接上传文件..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); handleSendMessage() } }} disabled={isLoading} rows={3} />
            <button className="chat-send-btn" onClick={handleSendMessage} disabled={isLoading}>{isLoading ? <div className="spinner-small" /> : <Send size={18} />}</button>
          </div>
          <div className="chat-input-hint">按 Shift + Enter 发送，Enter 换行 | 支持上传 PDF、Word、Excel、图片、TXT 等文件</div>
        </div>
      </main>

      {/* 右侧：功能选择 */}
      <aside className="workspace-panel workspace-right">
        <div className="panel-header"><h3 className="panel-title"><LayoutGrid size={18} />功能选择</h3></div>
        <div className="panel-content">
          <div className="tool-tabs">
            <button className={`tool-tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}><Sparkles size={14} />AI工具</button>
            <button className={`tool-tab ${activeTab === 'calc' ? 'active' : ''}`} onClick={() => setActiveTab('calc')}><Calculator size={14} />计算</button>
            <button className={`tool-tab ${activeTab === 'file' ? 'active' : ''}`} onClick={() => setActiveTab('file')}><FileText size={14} />文件</button>
          </div>
          {activeTab === 'ai' && <div className="tool-list"><div className="tool-category">AI 智能工具</div>{AI_TOOLS.map(tool => <button key={tool.id} className={`tool-list-item ${selectedTool?.id === tool.id ? 'active' : ''}`} onClick={() => handleToolSelect(tool)}><div className="tool-list-icon" style={{ backgroundColor: `${tool.color}15`, color: tool.color }}><tool.icon size={16} /></div><span className="tool-list-name">{tool.name}</span>{selectedTool?.id === tool.id && <ChevronRight size={14} className="tool-list-arrow" />}</button>)}</div>}
          {activeTab === 'calc' && <div className="tool-list"><div className="tool-category">计算工具</div>{CALC_TOOLS.map(tool => <button key={tool.id} className="tool-list-item" onClick={() => navigate(`/${tool.id}`)}><div className="tool-list-icon" style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}><tool.icon size={16} /></div><span className="tool-list-name">{tool.name}</span><ChevronRight size={14} className="tool-list-arrow" /></button>)}</div>}
          {activeTab === 'file' && <div className="tool-list"><div className="tool-category">文件与图片处理</div>{FILE_TOOLS.map(tool => <button key={tool.id} className="tool-list-item" onClick={() => navigate(`/${tool.id}`)}><div className="tool-list-icon" style={{ backgroundColor: '#f0fdf4', color: '#059669' }}><tool.icon size={16} /></div><span className="tool-list-name">{tool.name}</span><ChevronRight size={14} className="tool-list-arrow" /></button>)}</div>}
        </div>
      </aside>

      {showCreateCase && (
        <div className="modal-overlay" onClick={() => setShowCreateCase(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">新建案件</h2>
            <div className="form-group"><label className="form-label">案件名称 *</label><input className="form-input" type="text" placeholder="例：张三诉李四合同纠纷案" value={newCase.name} onChange={e => setNewCase({ ...newCase, name: e.target.value })} autoFocus /></div>
            <div className="form-group"><label className="form-label">案件类型</label><select className="form-select" value={newCase.type} onChange={e => setNewCase({ ...newCase, type: e.target.value })}>{CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">当事人信息</label><input className="form-input" type="text" placeholder="例：原告：张三，被告：李四" value={newCase.parties} onChange={e => setNewCase({ ...newCase, parties: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">案件描述</label><textarea className="form-textarea" placeholder="简要描述案件基本情况..." value={newCase.description} onChange={e => setNewCase({ ...newCase, description: e.target.value })} rows={3} /></div>
            <div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowCreateCase(false)}>取消</button><button className="btn btn-primary" onClick={handleCreateCase} disabled={!newCase.name.trim()}>创建</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Workspace
