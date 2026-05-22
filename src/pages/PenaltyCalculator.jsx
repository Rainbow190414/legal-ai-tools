import { useState } from 'react'
import { ArrowLeft, Calculator, Info } from 'lucide-react'

const PRESET_RATES = [
  { label: '日万分之五（0.05%）', value: 0.0005 },
  { label: '日万分之三（0.03%）', value: 0.0003 },
  { label: '日万分之二（0.02%）', value: 0.0002 },
  { label: '日万分之一（0.01%）', value: 0.0001 },
  { label: '日千分之一（0.1%）', value: 0.001 },
  { label: '自定义', value: 'custom' },
]

function getDaysBetween(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  s.setHours(0, 0, 0, 0)
  e.setHours(0, 0, 0, 0)
  const diffTime = e - s
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function formatMoney(n) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PenaltyCalculator() {
  const [contractAmount, setContractAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rateType, setRateType] = useState('0.0005')
  const [customRate, setCustomRate] = useState('')
  const [calculated, setCalculated] = useState(false)

  const handleCalculate = () => {
    setCalculated(true)
  }

  const numAmount = parseFloat(contractAmount) || 0
  const days = startDate && endDate ? getDaysBetween(startDate, endDate) : 0

  let dailyRate
  if (rateType === 'custom') {
    dailyRate = parseFloat(customRate) || 0
  } else {
    dailyRate = parseFloat(rateType) || 0
  }

  const dailyPenalty = numAmount * dailyRate
  const totalPenalty = dailyPenalty * days
  const totalWithPenalty = numAmount + totalPenalty

  const rateLabel = rateType === 'custom'
    ? `自定义日利率 ${(dailyRate * 100).toFixed(4)}%`
    : PRESET_RATES.find(r => String(r.value) === rateType)?.label

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">违约金计算器</h2>
      </div>

      <div className="form-group">
        <label className="form-label">本金金额（元）</label>
        <input
          type="number"
          className="form-input"
          placeholder="请输入本金金额"
          value={contractAmount}
          onChange={e => { setContractAmount(e.target.value); setCalculated(false) }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">起始日期</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setCalculated(false) }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">截止日期</label>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setCalculated(false) }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">日利率</label>
        <select className="form-select" value={rateType} onChange={e => { setRateType(e.target.value); setCalculated(false) }}>
          {PRESET_RATES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {rateType === 'custom' && (
        <div className="form-group">
          <label className="form-label">自定义日利率（小数，如 0.0005）</label>
          <input
            type="number"
            step="0.00001"
            className="form-input"
            placeholder="请输入日利率，如 0.0005"
            value={customRate}
            onChange={e => { setCustomRate(e.target.value); setCalculated(false) }}
          />
        </div>
      )}

      <button className="btn btn-primary" onClick={handleCalculate}>
        <Calculator size={16} /> 计算违约金
      </button>

      {calculated && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">计算结果</h3>
          </div>
          <div className="result-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '16px', background: '#f7fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>每日违约金</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>{formatMoney(dailyPenalty)} 元</div>
              </div>
              <div style={{ padding: '16px', background: '#faf5ff', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>违约天数</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6b46c1' }}>{days} 天</div>
              </div>
              <div style={{ padding: '16px', background: '#fff5f5', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>违约金总额</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c53030' }}>{formatMoney(totalPenalty)} 元</div>
              </div>
              <div style={{ padding: '16px', background: '#ebf8ff', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>含违约金合计</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2b6cb0' }}>{formatMoney(totalWithPenalty)} 元</div>
              </div>
            </div>

            <div style={{ background: '#f7fafc', borderRadius: '8px', padding: '16px', fontSize: '14px', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>本金金额</span>
                <span style={{ fontWeight: 'bold' }}>{formatMoney(numAmount)} 元</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>违约期间</span>
                <span>{startDate} 至 {endDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>日利率</span>
                <span>{rateLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>每日违约金</span>
                <span>{formatMoney(dailyPenalty)} 元</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>违约天数</span>
                <span>{days} 天</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096', fontWeight: 'bold' }}>违约金总额</span>
                <span style={{ fontWeight: 'bold', color: '#c53030', fontSize: '16px' }}>{formatMoney(totalPenalty)} 元</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#718096', fontWeight: 'bold' }}>本金 + 违约金</span>
                <span style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '16px' }}>{formatMoney(totalWithPenalty)} 元</span>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '12px', background: '#f0fff4', borderRadius: '8px', fontSize: '13px', color: '#276749' }}>
              <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              计算公式：违约金 = 本金 x 日利率 x 违约天数 = {formatMoney(numAmount)} x {(dailyRate * 100).toFixed(4)}% x {days}天
            </div>

            <div style={{ marginTop: '8px', padding: '12px', background: '#fefcbf', borderRadius: '8px', fontSize: '13px', color: '#744210' }}>
              <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              法律参考：《民法典》第585条 - 约定的违约金超过造成损失的30%可以请求法院适当减少。一般认为违约金超过实际损失30%即属于"过分高于"。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PenaltyCalculator
