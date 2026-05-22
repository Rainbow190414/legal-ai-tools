import { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { LEGAL_DOC_GEN_PROMPT } from '../utils/prompts'

const docTypes = ['起诉状', '答辩状', '代理词', '法律意见书', '律师函', '和解协议', '其他']

function LegalDocGen() {
  const { getData, clearData } = useSession()
  const [docType, setDocType] = useState('起诉状')
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const existingAnalysis = getData(STORAGE_KEYS.CASE_ANALYSIS)
  const existingMaterials = getData(STORAGE_KEYS.CASE_MATERIALS)

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入案件信息'); return }
    setLoading(true); setError(''); setResult('')
    const prompt = LEGAL_DOC_GEN_PROMPT + `\n\n文书类型：${docType}`
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
        <h2 className="page-title">法律文书生成</h2>
      </div>
      <DataBridge sourceKey={STORAGE_KEYS.CASE_ANALYSIS} label="案件分析" sourcePath="/case-reading" onAccept={() => setText(existingAnalysis)} onReject={() => { clearData(STORAGE_KEYS.CASE_ANALYSIS); setText('') }} />
      <div className="form-group">
        <label className="form-label">文书类型：</label>
        <select className="form-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">案件信息：</label>
        <textarea className="form-textarea" placeholder="请输入案件信息，包括但不限于：&#10;- 当事人信息（原告/被告姓名、身份证号、联系方式等）&#10;- 案由&#10;- 事实与理由&#10;- 诉讼请求&#10;&#10;信息越详细，生成的文书质量越高。" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL}settings">前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? '生成中...' : '生成文书'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在生成文书...</span></div>}
      {result && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">{docType}</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
        </div>
      )}
    </div>
  )
}

export default LegalDocGen
