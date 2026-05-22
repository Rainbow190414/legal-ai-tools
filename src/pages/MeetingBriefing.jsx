import { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { MEETING_BRIEFING_PROMPT } from '../utils/prompts'

function MeetingBriefing() {
  const { getData, saveData, clearData } = useSession()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const existingNotes = getData(STORAGE_KEYS.MEETING_NOTES)

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入会议信息'); return }
    setLoading(true); setError(''); setResult('')
    saveData(STORAGE_KEYS.MEETING_NOTES, text)
    try {
      const messages = [{ role: 'system', content: MEETING_BRIEFING_PROMPT }, { role: 'user', content: text }]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">会议简报</h2>
      </div>
      <DataBridge sourceKey={STORAGE_KEYS.MEETING_NOTES} label="会议纪要" sourcePath="/meeting-to-plan" onAccept={() => setText(existingNotes)} onReject={() => { clearData(STORAGE_KEYS.MEETING_NOTES); setText('') }} />
      <div className="form-group">
        <label className="form-label">会议信息：</label>
        <textarea className="form-textarea" placeholder="请输入会议类型、参会人员、议题、相关背景等信息..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL}settings">前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? '生成中...' : '生成简报'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在生成...</span></div>}
      {result && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">会议简报</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.MEETING_BRIEFING} label="法律服务方案" data={result} />
        </div>
      )}
    </div>
  )
}

export default MeetingBriefing
