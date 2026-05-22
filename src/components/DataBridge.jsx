import { useSession, STORAGE_KEYS } from '../context/SessionContext'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, X, Database } from 'lucide-react'

function DataBridge({ sourceKey, label, sourcePath, onAccept, onReject, previewText }) {
  const { getDataSummary } = useSession()
  const summary = getDataSummary(sourceKey)

  if (!summary) return null

  return (
    <div className="data-bridge">
      <div className="data-bridge-header">
        <Database size={18} />
        <span>检测到来自 <strong>{label}</strong> 的已有数据</span>
        <CheckCircle size={16} className="data-bridge-check" />
      </div>
      {previewText && <p className="data-bridge-preview">{previewText}</p>}
      <p className="data-bridge-hint">
        {summary.preview ? `数据预览：${summary.preview}` : 
         summary.count ? `包含 ${summary.count} 条记录` :
         `处理时间：${new Date(summary.time).toLocaleString('zh-CN')}`}
      </p>
      <div className="data-bridge-actions">
        <button className="btn btn-primary btn-sm" onClick={onAccept}>
          <CheckCircle size={14} /> 使用已有数据
        </button>
        <button className="btn btn-outline btn-sm" onClick={onReject}>
          <X size={14} /> 重新上传
        </button>
        <Link to={sourcePath} className="data-bridge-link">
          查看{label} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

export default DataBridge
