import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Save, Check } from 'lucide-react'

// API 提供商配置
const API_PROVIDERS = [
  { value: 'moonshot', label: 'Moonshot 开放平台', hint: 'API Key 从 platform.moonshot.cn 获取' },
  { value: 'deepseek', label: 'DeepSeek', hint: 'API Key 从 platform.deepseek.com 获取' },
  { value: 'siliconflow', label: '硅基流动 SiliconFlow', hint: 'API Key 从 cloud.siliconflow.cn 获取' },
  { value: 'kimi-code', label: 'Kimi Code（会员）', hint: 'API Key 从 kimi.com/code/console 获取（仅支持CLI/IDE）' },
]

// 模型选项
const MODEL_OPTIONS = {
  'moonshot': [
    { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k', desc: '8K上下文，适合短文本' },
    { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k', desc: '32K上下文，适合中等长度文本' },
    { value: 'moonshot-v1-128k', label: 'moonshot-v1-128k', desc: '128K上下文，适合长文本' }
  ],
  'deepseek': [
    { value: 'deepseek-chat', label: 'deepseek-chat', desc: 'DeepSeek 对话模型' },
    { value: 'deepseek-reasoner', label: 'deepseek-reasoner', desc: 'DeepSeek 推理模型' }
  ],
  'siliconflow': [
    { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', desc: 'DeepSeek V3' },
    { value: 'Qwen/Qwen3-235B-A22B', label: 'Qwen3-235B', desc: '通义千问 235B' },
    { value: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B', desc: '智谱 GLM-4 9B' },
    { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama-3.3-70B', desc: 'Llama 3.3 70B' }
  ],
  'kimi-code': [
    { value: 'kimi-for-coding', label: 'kimi-for-coding', desc: 'Kimi Code 专用模型' },
  ]
}

function Settings() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState('')
  const [apiProvider, setApiProvider] = useState('moonshot')
  const [showApiKey, setShowApiKey] = useState(false)
  const [model, setModel] = useState('moonshot-v1-128k')
  const [temperature, setTemperature] = useState(0.3)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const savedKey = localStorage.getItem('kimi_api_key') || ''
    const savedProvider = localStorage.getItem('kimi_api_provider') || 'moonshot'
    const savedModel = localStorage.getItem('kimi_model') || 'moonshot-v1-128k'
    const savedTemp = localStorage.getItem('kimi_temperature')

    setApiKey(savedKey)
    setApiProvider(savedProvider)
    setModel(savedModel)
    if (savedTemp !== null) {
      setTemperature(parseFloat(savedTemp))
    }
  }, [])

  const handleProviderChange = (provider) => {
    setApiProvider(provider)
    const defaultModel = MODEL_OPTIONS[provider]?.[0]?.value || 'moonshot-v1-128k'
    setModel(defaultModel)
  }

  const handleSave = () => {
    localStorage.setItem('kimi_api_key', apiKey)
    localStorage.setItem('kimi_api_provider', apiProvider)
    localStorage.setItem('kimi_model', model)
    localStorage.setItem('kimi_temperature', temperature.toString())

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const currentModelOptions = MODEL_OPTIONS[apiProvider] || MODEL_OPTIONS['moonshot']

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          <span>返回首页</span>
        </button>
        <h2 className="page-title">设置</h2>
      </div>

      <div className="page-body">
        <div className="settings-card">
          <h3 className="settings-section-title">API配置</h3>

          <div className="settings-field">
            <label className="settings-label">API 提供商</label>
            <select
              className="settings-select"
              value={apiProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {API_PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="settings-hint">
              {API_PROVIDERS.find(p => p.value === apiProvider)?.hint}
            </p>
          </div>

          <div className="settings-field">
            <label className="settings-label">API Key</label>
            <div className="api-key-input-wrapper">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="settings-input api-key-input"
                placeholder="请输入您的API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                className="api-key-toggle"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? '隐藏' : '显示'}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="settings-hint">
              密钥仅保存在本地浏览器中，不会上传到任何服务器。
            </p>
          </div>

          <div className="settings-field">
            <label className="settings-label">模型选择</label>
            <select
              className="settings-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {currentModelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.desc}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-label">
              温度参数（Temperature）：{temperature.toFixed(1)}
            </label>
            <input
              type="range"
              className="settings-range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
            <div className="range-labels">
              <span>精确（0）</span>
              <span>创意（1）</span>
            </div>
            <p className="settings-hint">
              较低的温度值使输出更精确、更确定；较高的温度值使输出更有创意、更多样。法律场景建议使用较低温度（0.1-0.3）。
            </p>
          </div>

          <button className="btn btn-primary settings-save-btn" onClick={handleSave}>
            {saved ? (
              <>
                <Check size={18} />
                <span>保存成功</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>保存设置</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
