import { useState } from 'react'
import { ArrowLeft, Copy, Check, FileDown } from 'lucide-react'
import { exportToWord } from '../utils/wordExport'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { chatWithKimi } from '../api/kimi'
import { CANNED_RESPONSES_PROMPT } from '../utils/prompts'

const categories = ['数据主体请求', '证据保全通知', '隐私咨询', '供应商法律问题', 'NDA请求', '传票/法律程序', '保险通知']

function CannedResponses() {
  const [category, setCategory] = useState('数据主体请求')
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) { setError('请描述场景'); return }
    setLoading(true); setError(''); setResult('')
    const prompt = CANNED_RESPONSES_PROMPT + `\n\n回复类别：${category}`
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
        <h2 className="page-title">模板回复</h2>
      </div>
      <div className="form-group">
        <label className="form-label">回复类别：</label>
        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">场景描述：</label>
        <textarea className="form-textarea" placeholder="请描述需要回复的场景，例如：收到客户的删除请求，需要在GDPR框架下响应..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <div className="error-message">{error.includes('API Key') ? <>{error} <a href={import.meta.env.BASE_URL + "settings"}>前往设置</a></> : error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? '生成中...' : '生成回复'}</button>
      {loading && <div className="loading"><div className="spinner"></div><span>正在生成...</span></div>}
      {result && (
        <div className="result-area">
          <div className="result-actions">
            <button 
              className="download-word-btn"
              onClick={() => exportToWord({
                title: '法律咨询回复',
                content: result,
                filename: 'canned_response',
                metadata: { '生成时间': new Date().toLocaleString('zh-CN') }
              })}
            >
              <FileDown size={16} /> 下载Word文档
            </button>
          </div>
          <div className="result-header">
            <h3 className="result-title">回复模板</h3>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}</button>
          </div>
          <MarkdownRenderer content={result} />
        </div>
      )}
    </div>
  )
}

export default CannedResponses
