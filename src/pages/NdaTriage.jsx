import { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import FileUpload from '../components/FileUpload'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { NDA_TRIAGE_PROMPT } from '../utils/prompts'

function NdaTriage() {
  const { getData, saveData, clearData } = useSession()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const existingContract = getData(STORAGE_KEYS.CONTRACT_TEXT)

  const handleFileContent = (content) => setText(content)

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入NDA内容'); return }
    setLoading(true); setError(''); setResult('')
    try {
      const messages = [{ role: 'system', content: NDA_TRIAGE_PROMPT }, { role: 'user', content: text }]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">NDA审查</h2>
      </div>
      <DataBridge sourceKey={STORAGE_KEYS.CONTRACT_TEXT} label="合同审查" sourcePath="/contract-review" onAccept={() => setText(existingContract)} onReject={() => { clearData(STORAGE_KEYS.CONTRACT_TEXT); setText('') }} />
      <FileUpload onFileContent={handleFileContent} accept=".txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv" />
      <div className="form-group" style={{ marginTop: '16px' }}>
        <textarea className="form-textarea" placeholder="请粘贴NDA文本..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL}settings">前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '16px' }}>{loading ? '审查中...' : '开始审查'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在审查...</span></div>}
      {result && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">审查结果</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.NDA_REVIEW} label="风险评估" data={result} />
        </div>
      )}
    </div>
  )
}

export default NdaTriage
