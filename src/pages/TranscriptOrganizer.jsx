import { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import FileUpload from '../components/FileUpload'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { TRANSCRIPT_ORGANIZER_PROMPT } from '../utils/prompts'

function TranscriptOrganizer() {
  const { getData, saveData, clearData } = useSession()
  const [text, setText] = useState('')
  const [person, setPerson] = useState('')
  const [keywords, setKeywords] = useState('')
  const [maxQna, setMaxQna] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const existingMaterials = getData(STORAGE_KEYS.CASE_MATERIALS)

  const handleFileContent = (content) => setText(content)

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入案卷文本'); return }
    setLoading(true); setError(''); setResult('')
    let prompt = TRANSCRIPT_ORGANIZER_PROMPT
    if (person) prompt += `\n\n重点关注人物：${person}`
    if (keywords) prompt += `\n关键词过滤：${keywords}`
    if (maxQna) prompt += `\n最大提取数量：${maxQna}`
    try {
      const messages = [{ role: 'system', content: prompt }, { role: 'user', content: text }]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <a href="/" className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">笔录整理</h2>
      </div>
      <DataBridge sourceKey={STORAGE_KEYS.CASE_MATERIALS} label="案件卷宗阅读" sourcePath="/case-reading" onAccept={() => setText(existingMaterials)} onReject={() => { clearData(STORAGE_KEYS.CASE_MATERIALS); setText('') }} />
      <FileUpload onFileContent={handleFileContent} accept=".txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv" />
      <div className="form-group" style={{ marginTop: '16px' }}>
        <textarea className="form-textarea" placeholder="请在此粘贴案卷文本..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">可选配置：</label>
        <input type="text" className="form-input" placeholder="重点关注人物姓名（可选，多个用逗号分隔）" value={person} onChange={(e) => setPerson(e.target.value)} style={{ marginBottom: '8px' }} />
        <input type="text" className="form-input" placeholder="关键词过滤（可选，多个用逗号分隔）" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={{ marginBottom: '8px' }} />
        <input type="number" className="form-input" placeholder="最大提取数量（可选，留空则不限制）" value={maxQna} onChange={(e) => setMaxQna(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href="/settings">前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '16px' }}>{loading ? '整理中...' : '开始整理'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在整理...</span></div>}
      {result && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">整理结果</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.TRANSCRIPT_DATA} label="案件分析" data={result} />
        </div>
      )}
    </div>
  )
}

export default TranscriptOrganizer
