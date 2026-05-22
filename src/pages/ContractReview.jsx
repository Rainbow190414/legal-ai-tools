import { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import FileUpload from '../components/FileUpload'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { CONTRACT_REVIEW_PROMPT } from '../utils/prompts'

function ContractReview() {
  const { getData, saveData, clearData } = useSession()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [useExisting, setUseExisting] = useState(false)

  const existingText = getData(STORAGE_KEYS.CONTRACT_TEXT)

  const handleFileContent = (content) => {
    setText(content)
    saveData(STORAGE_KEYS.CONTRACT_TEXT, content)
  }

  const handleUseExisting = () => {
    setText(existingText)
    setUseExisting(true)
  }

  const handleRejectExisting = () => {
    clearData(STORAGE_KEYS.CONTRACT_TEXT)
    setText('')
  }

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入合同文本')
      return
    }
    setLoading(true)
    setError('')
    setResult('')
    try {
      const messages = [
        { role: 'system', content: CONTRACT_REVIEW_PROMPT },
        { role: 'user', content: text }
      ]
      await chatWithKimi(messages, {
        onChunk: (_, full) => setResult(full)
      })
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
        <a href="/" className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">合同审查</h2>
      </div>

      <DataBridge
        sourceKey={STORAGE_KEYS.CONTRACT_TEXT}
        label="合同审查"
        sourcePath="/contract-review"
        onAccept={handleUseExisting}
        onReject={handleRejectExisting}
      />

      <FileUpload onFileContent={handleFileContent} accept=".txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv" />

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">或直接粘贴合同文本：</label>
        <textarea
          className="form-textarea"
          placeholder="请在此粘贴合同文本..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-message">
          {error.includes('API Key') ? <>{error} <a href="/settings">前往设置</a></> : error}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '16px' }}>
        {loading ? '审查中...' : '开始审查'}
      </button>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>正在分析合同...</span>
        </div>
      )}

      {result && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">审查结果</h3>
            <button className="btn btn-outline btn-sm" onClick={handleCopy}>
              {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
            </button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.CONTRACT_REVIEW} label="风险评估" data={result} />
        </div>
      )}
    </div>
  )
}

export default ContractReview
