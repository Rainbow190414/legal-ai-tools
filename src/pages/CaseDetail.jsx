import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCase } from '../context/CaseContext'
import { useSession } from '../context/SessionContext'
import '../case-styles.css'
import {
  getCaseFiles, addCaseFile, deleteCaseFile,
  addCaseNote, deleteCaseNote, updateCaseSummary, exportCaseData
} from '../utils/db'

const CASE_TYPES = ['民事案件', '刑事案件', '行政案件', '劳动争议', '合同纠纷', '侵权纠纷', '婚姻家庭', '知识产权', '其他']
const STATUSES = ['进行中', '已结案', '暂停']

export default function CaseDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { currentCase, selectCase, editCase } = useCase()
  const { apiKey } = useSession()
  const [activeTab, setActiveTab] = useState('files')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragover, setDragover] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [summaryResult, setSummaryResult] = useState('')
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const fileInputRef = useRef(null)
  
  // 本地文件夹相关状态
  const [localFiles, setLocalFiles] = useState([])
  const [localFolderName, setLocalFolderName] = useState('')
  const [readingLocal, setReadingLocal] = useState(false)

  useEffect(() => {
    if (id) {
      selectCase(id)
      loadFiles()
    }
  }, [id])

  const loadFiles = async () => {
    const caseFiles = await getCaseFiles(id)
    setFiles(caseFiles)
  }

  // 文件上传（存储到 IndexedDB）
  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      for (const file of fileList) {
        await addCaseFile(id, file)
      }
      await loadFiles()
      await selectCase(id)
    } catch (err) {
      alert('文件上传失败: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragover(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('确定要删除这个文件吗？')) return
    await deleteCaseFile(fileId, id)
    await loadFiles()
    await selectCase(id)
  }

  // 选择本地文件夹（不存储，直接读取）
  const handleSelectLocalFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('您的浏览器不支持本地文件夹选择功能，请使用最新版 Chrome/Edge 浏览器')
      return
    }

    try {
      setReadingLocal(true)
      const dirHandle = await window.showDirectoryPicker()
      setLocalFolderName(dirHandle.name)
      
      const fileContents = []
      
      // 递归读取文件夹中的文件
      const readDirectory = async (handle, path = '') => {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile()
            try {
              let content = null
              const ext = file.name.toLowerCase().split('.').pop()
              
              if (['txt', 'md', 'json', 'csv', 'html', 'htm', 'xml', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'less', 'sql', 'yaml', 'yml', 'ini', 'conf', 'log', 'sh', 'bat', 'rtf', 'docx'].includes(ext)) {
                // 文本类文件直接读取
                content = await file.text()
              } else if (ext === 'pdf') {
                // PDF 文件
                content = await readPdfFile(file)
              } else if (['doc', 'docx'].includes(ext)) {
                // Word 文件 - 提取文本
                content = await readWordFile(file)
              } else if (['xls', 'xlsx'].includes(ext)) {
                // Excel 文件
                content = await readExcelFile(file)
              } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
                // 图片文件 - 记录为图片引用
                content = `[图片文件: ${file.name}, 大小: ${formatFileSize(file.size)}]`
              } else {
                // 其他文件尝试作为文本读取
                try {
                  content = await file.text()
                  // 如果内容包含大量乱码，标记为二进制文件
                  if (content.includes('\x00')) {
                    content = `[二进制文件: ${file.name}, 大小: ${formatFileSize(file.size)}]`
                  }
                } catch {
                  content = `[不支持的文件: ${file.name}, 大小: ${formatFileSize(file.size)}]`
                }
              }
              
              if (content) {
                fileContents.push({
                  name: path + file.name,
                  size: file.size,
                  content: content,
                  type: 'local'
                })
              }
            } catch (err) {
              fileContents.push({
                name: path + file.name,
                size: file.size,
                content: `[读取失败: ${err.message}]`,
                type: 'local'
              })
            }
          } else if (entry.kind === 'directory') {
            await readDirectory(entry, path + entry.name + '/')
          }
        }
      }
      
      await readDirectory(dirHandle)
      setLocalFiles(fileContents)
      
      if (fileContents.length === 0) {
        alert('该文件夹中没有可读取的文件')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('读取文件夹失败:', err)
      }
    } finally {
      setReadingLocal(false)
    }
  }

  // 读取 PDF 文件
  const readPdfFile = async (file) => {
    try {
      const pdfjsLib = window.pdfjsLib
      if (!pdfjsLib) {
        return `[PDF文件: ${file.name}, 大小: ${formatFileSize(file.size)} - 需要加载pdf.js库才能读取内容]`
      }
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let text = ''
      for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(item => item.str).join(' ') + '\n'
      }
      return text || `[PDF文件: ${file.name} - 未能提取到文本内容]`
    } catch (err) {
      return `[PDF读取失败: ${file.name} - ${err.message}]`
    }
  }

  // 读取 Word 文件
  const readWordFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      // 使用简单的 ZIP 解析来提取 docx 中的文本
      if (file.name.endsWith('.docx')) {
        const text = await extractDocxText(arrayBuffer)
        return text || `[Word文件: ${file.name} - 未能提取到文本内容]`
      }
      return `[Word文件: ${file.name} - .doc格式不支持，请转换为.docx]`
    } catch (err) {
      return `[Word读取失败: ${file.name} - ${err.message}]`
    }
  }

  // 读取 Excel 文件
  const readExcelFile = async (file) => {
    try {
      const text = await file.text()
      // CSV 格式直接返回
      if (file.name.endsWith('.csv')) {
        return text
      }
      // xlsx 是二进制格式，简单处理
      return `[Excel文件: ${file.name}, 大小: ${formatFileSize(file.size)} - 建议导出为CSV格式后读取]`
    } catch (err) {
      return `[Excel读取失败: ${file.name} - ${err.message}]`
    }
  }

  // 简单提取 docx 文本（不依赖外部库）
  const extractDocxText = async (arrayBuffer) => {
    try {
      // docx 是一个 ZIP 文件，其中 word/document.xml 包含正文
      const blob = new Blob([arrayBuffer])
      // 尝试用 JSZip 如果已加载
      if (window.JSZip) {
        const zip = await window.JSZip.loadAsync(arrayBuffer)
        const docXml = zip.file('word/document.xml')
        if (docXml) {
          const xmlText = await docXml.async('string')
          // 简单提取 XML 标签之间的文本
          const texts = []
          const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g
          let match
          while ((match = regex.exec(xmlText)) !== null) {
            texts.push(match[1])
          }
          return texts.join('')
        }
      }
      return null
    } catch {
      return null
    }
  }

  // 清除本地文件引用
  const handleClearLocalFiles = () => {
    setLocalFiles([])
    setLocalFolderName('')
  }

  // 补充信息
  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    await addCaseNote(id, noteContent.trim())
    setNoteContent('')
    await selectCase(id)
  }

  // AI 生成案件摘要
  const handleSummarize = async () => {
    if (!apiKey) {
      alert('请先在设置中配置 API Key')
      return
    }
    
    const hasFiles = files.length > 0
    const hasLocalFiles = localFiles.length > 0
    const hasNotes = currentCase?.notes?.length > 0
    
    if (!hasFiles && !hasLocalFiles && !hasNotes) {
      alert('请先上传案件文件、选择本地文件夹或添加案件进展')
      return
    }

    setSummarizing(true)
    setSummaryResult('正在阅读案件材料，生成摘要...')
    setActiveTab('summary')

    try {
      let allText = ''
      
      // 读取已上传的文件
      for (const file of files) {
        try {
          const text = await readFileContent(file)
          if (text) {
            allText += `\n\n===== ${file.name} =====\n${text}`
          }
        } catch (err) {
          allText += `\n\n===== ${file.name} =====\n[文件读取失败]`
        }
      }
      
      // 读取本地文件夹中的文件
      for (const file of localFiles) {
        if (file.content) {
          allText += `\n\n===== ${file.name} =====\n${file.content}`
        }
      }

      // 添加补充信息
      if (currentCase?.notes?.length > 0) {
        allText += '\n\n===== 案件进展记录 =====\n'
        currentCase.notes.forEach((note, i) => {
          const date = new Date(note.createdAt).toLocaleString('zh-CN')
          allText += `${i + 1}. [${date}] ${note.content}\n`
        })
      }

      // 如果文本太长，截取关键部分
      if (allText.length > 100000) {
        allText = allText.substring(0, 100000) + '\n\n[...文件内容过长，已截取前10万字...]'
      }

      const prompt = `你是一位专业的律师助理。请根据以下案件材料，生成一份结构化的案件摘要。

要求：
1. 摘要应包含以下部分：
   - 案件基本信息（当事人、案由、案件类型）
   - 事实概要（主要事实经过）
   - 争议焦点
   - 关键证据清单
   - 法律适用分析
   - 代理思路建议
2. 摘要控制在2000-5000字
3. 使用专业但简洁的法律语言
4. 如果材料不足，请标注"待补充"

案件材料如下：
${allText}`

      const provider = localStorage.getItem('kimi_api_provider') || 'moonshot'
      const apiUrl = provider === 'kimi-code'
        ? 'https://api.kimi.com/coding/v1/chat/completions'
        : 'https://api.moonshot.cn/v1/chat/completions'
      const modelName = provider === 'kimi-code' ? 'kimi-for-coding' : (localStorage.getItem('kimi_model') || 'moonshot-v1-128k')

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      })

      const data = await response.json()
      if (data.choices && data.choices[0]) {
        const summary = data.choices[0].message.content
        setSummaryResult(summary)
        await updateCaseSummary(id, summary)
        await selectCase(id)
      } else {
        setSummaryResult('生成失败: ' + (data.error?.message || '未知错误'))
      }
    } catch (err) {
      setSummaryResult('生成失败: ' + err.message)
    } finally {
      setSummarizing(false)
    }
  }

  // 读取文件内容
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([file.data], { type: file.type })
      if (file.type === 'application/pdf') {
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const pdfjsLib = window.pdfjsLib
            if (!pdfjsLib) {
              resolve('[PDF文件 - 请在浏览器中安装pdf.js以读取内容]')
              return
            }
            const typedArray = new Uint8Array(reader.result)
            const pdf = await pdfjsLib.getDocument(typedArray).promise
            let text = ''
            for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
              const page = await pdf.getPage(i)
              const content = await page.getTextContent()
              text += content.items.map(item => item.str).join(' ') + '\n'
            }
            resolve(text)
          } catch (err) {
            resolve('[PDF读取失败: ' + err.message + ']')
          }
        }
        reader.readAsArrayBuffer(blob)
      } else {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(blob, 'utf-8')
      }
    })
  }

  // 导出案件
  const handleExport = async () => {
    try {
      const data = await exportCaseData(id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentCase?.name || '案件'}_备份_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('导出失败: ' + err.message)
    }
  }

  // 编辑案件信息
  const handleStartEdit = () => {
    setEditData({
      name: currentCase.name,
      type: currentCase.type,
      parties: currentCase.parties || '',
      description: currentCase.description || '',
      status: currentCase.status,
    })
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    await editCase(id, editData)
    setEditing(false)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (!currentCase) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={() => navigate('/case-manager')} className="back-btn">← 返回案件列表</button>
        <h1 className="page-title">📁 {currentCase.name}</h1>
      </div>

      {/* 案件信息卡片 */}
      <div className="case-info-card">
        {editing ? (
          <div className="case-edit-form">
            <div className="form-group">
              <label className="form-label">案件名称</label>
              <input className="form-input" value={editData.name}
                onChange={e => setEditData({ ...editData, name: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">案件类型</label>
                <select className="form-select" value={editData.type}
                  onChange={e => setEditData({ ...editData, type: e.target.value })}>
                  {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">案件状态</label>
                <select className="form-select" value={editData.status}
                  onChange={e => setEditData({ ...editData, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">当事人</label>
              <input className="form-input" value={editData.parties}
                onChange={e => setEditData({ ...editData, parties: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">案件描述</label>
              <textarea className="form-textarea" value={editData.description}
                onChange={e => setEditData({ ...editData, description: e.target.value })} rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEditing(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        ) : (
          <div className="case-info-display">
            <div className="case-info-row">
              <span className="case-info-label">案件类型：</span>
              <span className="case-info-value">{currentCase.type}</span>
              <span className={`case-status ${currentCase.status === '进行中' ? 'status-active' : currentCase.status === '已结案' ? 'status-closed' : 'status-paused'}`}>
                {currentCase.status}
              </span>
            </div>
            {currentCase.parties && (
              <div className="case-info-row">
                <span className="case-info-label">当事人：</span>
                <span className="case-info-value">{currentCase.parties}</span>
              </div>
            )}
            {currentCase.description && (
              <div className="case-info-row">
                <span className="case-info-label">案件描述：</span>
                <span className="case-info-value">{currentCase.description}</span>
              </div>
            )}
            <div className="case-info-row">
              <span className="case-info-label">创建时间：</span>
              <span className="case-info-value">{formatDate(currentCase.createdAt)}</span>
            </div>
            <div className="case-info-actions">
              <button className="btn btn-sm btn-outline" onClick={handleStartEdit}>✏️ 编辑</button>
              <button className="btn btn-sm btn-outline" onClick={handleExport}>📥 导出备份</button>
              <button className="btn btn-sm btn-primary" onClick={handleSummarize} disabled={summarizing}>
                {summarizing ? '⏳ 生成中...' : '🤖 AI生成摘要'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div className="case-tabs">
        <button
          className={`case-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          📎 案件材料 {(files.length + localFiles.length) > 0 && `(${files.length + localFiles.length})`}
        </button>
        <button
          className={`case-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 案件进展 {currentCase.notes?.length > 0 && `(${currentCase.notes.length})`}
        </button>
        <button
          className={`case-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          🤖 案件摘要 {currentCase.summary && '✓'}
        </button>
      </div>

      {/* 文件上传区 */}
      {activeTab === 'files' && (
        <div className="case-tab-content">
          {/* 本地文件夹选择 */}
          <div className="local-folder-section">
            <div className="local-folder-header">
              <h4>📂 本地文件夹（不占用存储空间）</h4>
              <p className="local-folder-hint">选择本地文件夹，AI直接读取文件内容，不存储到浏览器</p>
            </div>
            
            {localFolderName ? (
              <div className="local-folder-info">
                <div className="local-folder-name">
                  <span>📁 {localFolderName}</span>
                  <span className="local-file-count">{localFiles.length} 个文件</span>
                </div>
                <button className="btn btn-sm btn-outline" onClick={handleClearLocalFiles}>清除</button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={handleSelectLocalFolder} disabled={readingLocal}>
                {readingLocal ? '正在读取...' : '选择本地文件夹'}
              </button>
            )}
            
            {localFiles.length > 0 && (
              <div className="local-files-list">
                {localFiles.slice(0, 10).map((file, i) => (
                  <div key={i} className="local-file-item">
                    <span className="local-file-name">📄 {file.name}</span>
                    <span className="local-file-size">{formatFileSize(file.size)}</span>
                  </div>
                ))}
                {localFiles.length > 10 && (
                  <div className="local-files-more">还有 {localFiles.length - 10} 个文件...</div>
                )}
              </div>
            )}
          </div>

          <div className="file-section-divider">
            <span>或者上传文件到浏览器存储</span>
          </div>

          {/* 传统文件上传 */}
          <div
            className={`file-upload ${dragover ? 'dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragover(true) }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFileUpload(e.target.files)}
            />
            <div className="upload-icon">📎</div>
            <p>点击或拖拽文件到此处上传</p>
            <p className="upload-hint">支持 PDF、Word、TXT、图片等格式（会占用浏览器存储空间）</p>
          </div>

          {uploading && (
            <div className="loading"><div className="spinner"></div><span>上传中...</span></div>
          )}

          {files.length > 0 && (
            <div className="file-list">
              <h4 style={{margin: '16px 0 8px', color: '#4a5568'}}>已上传的文件</h4>
              {files.map(file => (
                <div key={file.id} className="file-item">
                  <div className="file-item-info">
                    <span className="file-item-name">📄 {file.name}</span>
                    <span className="file-item-meta">
                      {formatFileSize(file.size)} · {formatDate(file.uploadedAt)}
                    </span>
                  </div>
                  <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleDeleteFile(file.id)}>
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 补充信息 */}
      {activeTab === 'notes' && (
        <div className="case-tab-content">
          <div className="note-input-area">
            <textarea
              className="form-textarea"
              placeholder="记录案件新进展、新证据、庭审情况等..."
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              rows={3}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddNote}
              disabled={!noteContent.trim()}
            >
              添加记录
            </button>
          </div>

          {currentCase.notes?.length > 0 ? (
            <div className="notes-list">
              {[...currentCase.notes].reverse().map(note => (
                <div key={note.id} className="note-item">
                  <div className="note-header">
                    <div className="note-time">{formatDate(note.createdAt)}</div>
                    <button 
                      className="btn btn-sm btn-outline btn-danger"
                      onClick={async () => {
                        if (window.confirm('确定要删除这条记录吗？')) {
                          await deleteCaseNote(id, note.id)
                          await selectCase(id)
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                  <div className="note-content">{note.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>暂无案件进展记录</p>
              <p className="empty-hint">在上方输入框中记录案件的新进展</p>
            </div>
          )}
        </div>
      )}

      {/* 案件摘要 */}
      {activeTab === 'summary' && (
        <div className="case-tab-content">
          {summarizing ? (
            <div className="loading">
              <div className="spinner"></div>
              <span>{summaryResult || '正在生成...'}</span>
            </div>
          ) : currentCase.summary ? (
            <div className="summary-content markdown-body">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {currentCase.summary}
              </pre>
              <div className="summary-actions">
                <button className="btn btn-outline" onClick={handleSummarize}>
                  🔄 重新生成
                </button>
              </div>
            </div>
          ) : summaryResult ? (
            <div className="summary-content">
              <p className="error-message">{summaryResult}</p>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <p>尚未生成案件摘要</p>
              <p className="empty-hint">上传案件材料或选择本地文件夹后，点击"AI生成摘要"自动阅读并生成案件摘要</p>
              <button className="btn btn-primary" onClick={handleSummarize} style={{ marginTop: '12px' }}>
                🤖 生成摘要
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
