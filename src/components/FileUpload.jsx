import { useState, useRef } from 'react'
import { Upload, File, X, Folder, Lock } from 'lucide-react'
import { parseFile, getFileAcceptString, getFileAcceptLabel } from '../utils/fileParser'

function FileUpload({ onFileContent, onAllFilesProcessed, accept, placeholder, multiple, showFolderOption }) {
  const [files, setFiles] = useState([])
  const [dragover, setDragover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [needPassword, setNeedPassword] = useState(false)
  const inputRef = useRef(null)
  const folderRef = useRef(null)
  const originalFilesRef = useRef([])

  const acceptStr = accept || getFileAcceptString()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragover(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  const handleChange = (e) => {
    processFiles(Array.from(e.target.files))
  }

  const handleFolderChange = (e) => {
    processFiles(Array.from(e.target.files))
  }

  const processFiles = async (fileList) => {
    setLoading(true)
    setNeedPassword(false)
    originalFilesRef.current = fileList
    const newFiles = []
    const allContents = []
    let passwordRequired = false

    for (const file of fileList) {
      try {
        const text = await parseFile(file, password)
        newFiles.push({ name: file.name, content: text, size: file.size, status: 'success' })
        allContents.push({ name: file.name, content: text })
      } catch (err) {
        if (err.message === 'PASSWORD_REQUIRED') {
          passwordRequired = true
          newFiles.push({ name: file.name, content: '', size: file.size, status: 'need_password' })
        } else {
          newFiles.push({ name: file.name, content: '', size: file.size, status: 'error', error: err.message })
        }
      }
    }

    setFiles(newFiles)
    setNeedPassword(passwordRequired)
    const successContents = allContents.map(f => '\u3010' + f.name + '\u3011\n' + f.content).join('\n\n')
    if (successContents && onFileContent) {
      onFileContent(multiple ? successContents : allContents[0]?.content || '')
    }
    if (allContents.length > 0 && onAllFilesProcessed) {
      onAllFilesProcessed(allContents)
    }
    setLoading(false)
  }

  const retryWithPassword = async () => {
    if (!password) return
    setLoading(true)
    setNeedPassword(false)
    const fileList = originalFilesRef.current
    if (!fileList.length) { setLoading(false); return }
    const updatedFiles = []
    const allContents = []

    for (const file of fileList) {
      try {
        const text = await parseFile(file, password)
        updatedFiles.push({ name: file.name, content: text, size: file.size, status: 'success' })
        allContents.push({ name: file.name, content: text })
      } catch (err) {
        if (err.message === 'PASSWORD_REQUIRED') {
          updatedFiles.push({ name: file.name, content: '', size: file.size, status: 'need_password' })
        } else {
          updatedFiles.push({ name: file.name, content: '', size: file.size, status: 'error', error: err.message })
        }
      }
    }

    setFiles(updatedFiles)
    setNeedPassword(updatedFiles.some(f => f.status === 'need_password'))
    const successContents = allContents.map(f => '\u3010' + f.name + '\u3011\n' + f.content).join('\n\n')
    if (successContents && onFileContent) {
      onFileContent(multiple ? successContents : allContents[0]?.content || '')
    }
    if (allContents.length > 0 && onAllFilesProcessed) {
      onAllFilesProcessed(allContents)
    }
    setLoading(false)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <Lock size={16} style={{ color: 'var(--text-secondary)' }} />
          <input
            type={showPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="PDF密码（如文件加密请输入）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-outline btn-sm" onClick={() => setShowPassword(!showPassword)} style={{ whiteSpace: 'nowrap' }}>
            {showPassword ? '隐藏' : '显示'}
          </button>
        </div>
        {needPassword && (
          <button className="btn btn-primary btn-sm" onClick={retryWithPassword} disabled={loading || !password}>
            {loading ? '解密中...' : '用密码重新解密'}
          </button>
        )}
      </div>

      <div
        className={'file-upload ' + (dragover ? 'dragover' : '')}
        onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={40} className="file-upload-icon" />
        <p className="file-upload-text">{loading ? '正在解析文件...' : (placeholder || '拖拽文件到此处，或点击上传')}</p>
        <p className="file-upload-hint">{accept ? '支持格式：' + accept : getFileAcceptLabel()}</p>
        <input ref={inputRef} type="file" accept={acceptStr} multiple={multiple} onChange={handleChange} style={{ display: 'none' }} />
      </div>

      {showFolderOption && (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <button className="btn btn-outline" onClick={() => folderRef.current?.click()} disabled={loading} style={{ width: '100%' }}>
            <Folder size={16} /> 选择整个文件夹上传
          </button>
          <input ref={folderRef} type="file" accept={acceptStr} multiple {...({ webkitdirectory: '', directory: '' })} onChange={handleFolderChange} style={{ display: 'none' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            选择文件夹后，将自动读取其中所有支持的文件
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={index} className="file-item" style={{
              borderLeft: file.status === 'success' ? '3px solid #38a169' :
                           file.status === 'need_password' ? '3px solid #ed8936' :
                           '3px solid #e53e3e'
            }}>
              <span>{file.status === 'success' ? '\u2705' : file.status === 'need_password' ? '\uD83D\uDD12' : '\u274C'}</span>
              <span>{file.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({formatSize(file.size)})</span>
              {file.status === 'error' && <span style={{ color: '#e53e3e', fontSize: '0.75rem' }}>{file.error}</span>}
              {file.status === 'need_password' && <span style={{ color: '#ed8936', fontSize: '0.75rem' }}>需要密码</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUpload
