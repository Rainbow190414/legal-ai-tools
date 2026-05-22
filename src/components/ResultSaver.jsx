import { useSession } from '../context/SessionContext'
import { Save, CheckCircle } from 'lucide-react'
import { useState } from 'react'

function ResultSaver({ storageKey, label, data }) {
  const { saveData, getData } = useSession()
  const [saved, setSaved] = useState(!!getData(storageKey))

  const handleSave = () => {
    saveData(storageKey, data)
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="result-saver saved">
        <CheckCircle size={16} />
        <span>结果已保存，可在其他模块中引用</span>
      </div>
    )
  }

  return (
    <div className="result-saver">
      <button className="btn btn-outline btn-sm" onClick={handleSave}>
        <Save size={14} /> 保存结果供后续使用
      </button>
      <span className="result-saver-hint">保存后可在「{label}」等模块中直接引用</span>
    </div>
  )
}

export default ResultSaver
