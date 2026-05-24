import { useState } from 'react'
import { ArrowLeft, Copy, Check, FileDown } from 'lucide-react'
import { exportToWord } from '../utils/wordExport'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { RISK_ASSESSMENT_PROMPT } from '../utils/prompts'

function RiskAssessment() {
  const { getData, clearData } = useSession()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const existingContract = getData(STORAGE_KEYS.CONTRACT_REVIEW)
  const existingNda = getData(STORAGE_KEYS.NDA_REVIEW)

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入待评估内容'); return }
    setLoading(true); setError(''); setResult('')
    try {
      const messages = [{ role: 'system', content: RISK_ASSESSMENT_PROMPT }, { role: 'user', content: text }]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">法律风险评估</h2>
      </div>
      <DataBridge sourceKey={STORAGE_KEYS.CONTRACT_REVIEW} label="合同审查" sourcePath="/contract-review" onAccept={() => setText(existingContract)} onReject={() => { clearData(STORAGE_KEYS.CONTRACT_REVIEW); setText('') }} />
      <div className="form-group">
        <label className="form-label">待评估内容：</label>
        <textarea className="form-textarea" placeholder="请粘贴合同、案件描述或其他需要风险评估的内容..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL + "settings"}>前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? '评估中...' : '开始评估'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在评估风险...</span></div>}
      {result && (
        <div className="result-area">
        <div className="result-actions">
          <button 
            className="download-word-btn"
            onClick={() => exportToWord({
              title: '风险评估报告',
              content: result,
              filename: 'risk_assessment',
              metadata: { '生成时间': new Date().toLocaleString('zh-CN') }
            })}
          >
            <FileDown size={16} /> 下载Word文档
          </button>
        </div>
          <div className="result-header">
            <h3 className="result-title">风险评估报告</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.RISK_ASSESSMENT} label="合规审查" data={result} />
        </div>
      )}
    </div>
  )
}

export default RiskAssessment
