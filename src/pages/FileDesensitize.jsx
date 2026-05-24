import { useState } from 'react'
import { ArrowLeft, Copy, Check, FileDown } from 'lucide-react'
import { exportToWord } from '../utils/wordExport'
import FileUpload from '../components/FileUpload'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { FILE_DESENSITIZE_PROMPT } from '../utils/prompts'

const options = [
  { key: '姓名', label: '姓名' },
  { key: '身份证号', label: '身份证号' },
  { key: '手机号', label: '手机号' },
  { key: '地址', label: '地址' },
  { key: '银行账号', label: '银行账号' },
  { key: '其他', label: '其他敏感信息' },
]

function FileDesensitize() {
  const { getData, clearData } = useSession()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState(['姓名', '身份证号', '手机号', '地址', '银行账号'])

  const existingText = getData(STORAGE_KEYS.CASE_MATERIALS)

  const toggleOption = (key) => {
    setSelectedOptions(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleFileContent = (content) => setText(content)

  const handleUseExisting = () => setText(existingText)

  const handleRejectExisting = () => {
    clearData(STORAGE_KEYS.CASE_MATERIALS)
    setText('')
  }

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入需要脱敏的文本')
      return
    }
    setLoading(true)
    setError('')
    setResult('')
    const prompt = FILE_DESENSITIZE_PROMPT + `\n\n请脱敏以下类型：${selectedOptions.join('、')}`
    try {
      const messages = [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">文件脱敏</h2>
      </div>

      <DataBridge
        sourceKey={STORAGE_KEYS.CASE_MATERIALS}
        label="案件卷宗阅读"
        sourcePath="/case-reading"
        onAccept={handleUseExisting}
        onReject={handleRejectExisting}
      />

      <FileUpload onFileContent={handleFileContent} accept=".txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv" />

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">或直接粘贴文本：</label>
        <textarea
          className="form-textarea"
          placeholder="请粘贴需要脱敏的文本..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">脱敏选项：</label>
        <div className="checkbox-group">
          {options.map(opt => (
            <label 
              key={opt.key} 
              className={`checkbox-item ${selectedOptions.includes(opt.key) ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedOptions.includes(opt.key)}
                onChange={() => toggleOption(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL + "settings"}>前往设置</a></> : error}</div>}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '16px' }}>
        {loading ? '处理中...' : '开始脱敏'}
      </button>

      {loading && <div className="loading"><div className="spinner"></div><span>正在处理...</span></div>}

      {result && (
        <div className="result-area">
        <div className="result-actions">
          <button 
            className="download-word-btn"
            onClick={() => exportToWord({
              title: '脱敏文件',
              content: result,
              filename: 'desensitized_file',
              metadata: { '生成时间': new Date().toLocaleString('zh-CN') }
            })}
          >
            <FileDown size={16} /> 下载Word文档
          </button>
        </div>
          <div className="result-header">
            <h3 className="result-title">脱敏结果</h3>
            <button className="btn btn-outline btn-sm" onClick={handleCopy}>
              {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
            </button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.DESENSITIZE_RESULT} label="案件分析" data={result} />
        </div>
      )}
    </div>
  )
}

export default FileDesensitize
