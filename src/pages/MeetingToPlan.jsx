import { useState } from 'react'
import { ArrowLeft, Copy, Check, FileDown } from 'lucide-react'
import { exportToWord } from '../utils/wordExport'
import FileUpload from '../components/FileUpload'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { MEETING_TO_PLAN_PROMPT } from '../utils/prompts'

function MeetingToPlan() {
  const { getData, saveData, clearData } = useSession()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const existingNotes = getData(STORAGE_KEYS.MEETING_NOTES)
  const existingBriefing = getData(STORAGE_KEYS.MEETING_BRIEFING)

  const handleFileContent = (content) => {
    setText(content)
    saveData(STORAGE_KEYS.MEETING_NOTES, content)
  }

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入会议纪要'); return }
    setLoading(true); setError(''); setResult('')
    try {
      const messages = [{ role: 'system', content: MEETING_TO_PLAN_PROMPT }, { role: 'user', content: text }]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">会议纪要→法律服务方案</h2>
      </div>
      <DataBridge sourceKey={STORAGE_KEYS.MEETING_NOTES} label="会议纪要" sourcePath="/meeting-to-plan" onAccept={() => setText(existingNotes)} onReject={() => { clearData(STORAGE_KEYS.MEETING_NOTES); setText('') }} />
      <FileUpload onFileContent={handleFileContent} accept=".txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv" />
      <div className="form-group" style={{ marginTop: '16px' }}>
        <textarea className="form-textarea" placeholder="请粘贴会议纪要..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL + "settings"}>前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '16px' }}>{loading ? '生成中...' : '生成方案'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在生成...</span></div>}
      {result && (
        <div className="result-area">
        <div className="result-actions">
          <button 
            className="download-word-btn"
            onClick={() => exportToWord({
              title: '法律服务方案',
              content: result,
              filename: 'legal_proposal',
              metadata: { '生成时间': new Date().toLocaleString('zh-CN') }
            })}
          >
            <FileDown size={16} /> 下载Word文档
          </button>
        </div>
          <div className="result-header">
            <h3 className="result-title">服务方案</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.LEGAL_PROPOSAL} label="案件分析" data={result} />
        </div>
      )}
    </div>
  )
}

export default MeetingToPlan
