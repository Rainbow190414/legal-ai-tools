import { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import FileUpload from '../components/FileUpload'
import MarkdownRenderer from '../components/MarkdownRenderer'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { COMPLIANCE_PROMPT } from '../utils/prompts'

const reviewTypes = ['DPA审查', '数据主体请求处理', '隐私合规评估', '监管更新监控']

function Compliance() {
  const [reviewType, setReviewType] = useState('DPA审查')
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleFileContent = (content) => setText(content)

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入待审查内容'); return }
    setLoading(true); setError(''); setResult('')
    const prompt = COMPLIANCE_PROMPT + `\n\n审查类型：${reviewType}`
    try {
      const messages = [{ role: 'system', content: prompt }, { role: 'user', content: text }]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">合规审查</h2>
      </div>
      <div className="form-group">
        <label className="form-label">审查类型：</label>
        <select className="form-select" value={reviewType} onChange={(e) => setReviewType(e.target.value)}>
          {reviewTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <FileUpload onFileContent={handleFileContent} accept=".txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv" />
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">待审查内容：</label>
        <textarea className="form-textarea" placeholder="请粘贴需要审查的文档或描述..." value={text} onChange={(e) => setText(e.target.value)} />
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
          <ResultSaver storageKey={STORAGE_KEYS.COMPLIANCE_DATA} label="风险评估" data={result} />
        </div>
      )}
    </div>
  )
}

export default Compliance
