import { useState } from 'react'
import { ArrowLeft, Copy, Check, FileDown } from 'lucide-react'
import { exportToWord } from '../utils/wordExport'
import FileUpload from '../components/FileUpload'
import MarkdownRenderer from '../components/MarkdownRenderer'
import DataBridge from '../components/DataBridge'
import ResultSaver from '../components/ResultSaver'
import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { chatWithKimi } from '../api/kimi'
import { CASE_READING_PROMPT } from '../utils/prompts'

function CaseReading() {
  const { getData, saveData, clearData } = useSession()
  const [text, setText] = useState('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const existingMaterials = getData(STORAGE_KEYS.CASE_MATERIALS)
  const existingTranscript = getData(STORAGE_KEYS.TRANSCRIPT_DATA)

  const handleFileContent = (content) => {
    setText(content)
    saveData(STORAGE_KEYS.CASE_MATERIALS, content)
  }

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请输入案卷材料'); return }
    setLoading(true); setError(''); setResult('')
    const userContent = question ? `${text}\n\n用户问题：${question}` : text
    try {
      const messages = [{ role: 'system', content: CASE_READING_PROMPT }, { role: 'user', content: userContent }]
      await chatWithKimi(messages, { onChunk: (_, full) => setResult(full) })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">案件卷宗阅读</h2>
      </div>
      <DataBridge sourceKey={STORAGE_KEYS.CASE_MATERIALS} label="案卷材料" sourcePath="/case-reading" onAccept={() => setText(existingMaterials)} onReject={() => { clearData(STORAGE_KEYS.CASE_MATERIALS); setText('') }} />
      <FileUpload onFileContent={handleFileContent} accept=".txt,.md,.json,.pdf,.docx,.doc,.xlsx,.xls,.csv" multiple />
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">或直接粘贴案卷文本：</label>
        <textarea className="form-textarea" placeholder="请粘贴案卷材料..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">您想了解的问题（可选）：</label>
        <textarea className="form-textarea" style={{ minHeight: '100px' }} placeholder="例如：被告人的主要辩解是什么？证据链是否完整？" value={question} onChange={(e) => setQuestion(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL + "settings"}>前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '16px' }}>{loading ? '分析中...' : '开始分析'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在分析案卷...</span></div>}
      {result && (
        <div className="result-area">
        <div className="result-actions">
          <button 
            className="download-word-btn"
            onClick={() => exportToWord({
              title: '案件卷宗分析报告',
              content: result,
              filename: 'case_reading',
              metadata: { '生成时间': new Date().toLocaleString('zh-CN') }
            })}
          >
            <FileDown size={16} /> 下载Word文档
          </button>
        </div>
          <div className="result-header">
            <h3 className="result-title">分析结果</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
          <ResultSaver storageKey={STORAGE_KEYS.CASE_ANALYSIS} label="法律文书生成" data={result} />
        </div>
      )}
    </div>
  )
}

export default CaseReading
