import { useState } from 'react'
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const CASE_TYPES = [
  { name: '民事一般时效（《民法典》第188条）', period: 3, unit: '年', basis: '《民法典》第188条', note: '从知道或应当知道权利受侵害之日起计算' },
  { name: '劳动仲裁申请（《劳动争议调解仲裁法》第27条）', period: 1, unit: '年', basis: '《劳动争议调解仲裁法》第27条', note: '从劳动争议发生之日起计算' },
  { name: '劳动诉讼起诉', period: 15, unit: '日', basis: '《劳动争议调解仲裁法》第50条', note: '收到仲裁裁决书之日起计算' },
  { name: '行政诉讼一般（《行政诉讼法》第46条）', period: 6, unit: '月', basis: '《行政诉讼法》第46条', note: '知道行政行为之日起计算' },
  { name: '行政诉讼最长', period: 1, unit: '年', basis: '《行政诉讼法》第46条', note: '自作出行政行为之日起计算' },
  { name: '不动产登记', period: 20, unit: '年', basis: '《民法典》第188条', note: '自权利受到损害之日起计算' },
  { name: '人身损害赔偿', period: 3, unit: '年', basis: '《民法典》第188条', note: '从知道或应当知道权利受侵害之日起计算' },
  { name: '环境污染侵权', period: 3, unit: '年', basis: '《民法典》第188条', note: '从知道或应当知道权利受侵害之日起计算' },
  { name: '国际货物买卖合同', period: 4, unit: '年', basis: '《民法典》第594条', note: '从知道或应当知道权利受侵害之日起计算' },
  { name: '技术合同', period: 1, unit: '年', basis: '《民法典》第188条', note: '从知道或应当知道权利受侵害之日起计算' },
  { name: '民事最长保护（《民法典》第188条）', period: 20, unit: '年', basis: '《民法典》第188条', note: '从权利受侵害之日起计算，不适用中止、中断' },
  { name: '交通事故损害赔偿', period: 3, unit: '年', basis: '《民法典》第188条', note: '从知道或应当知道权利受侵害之日起计算' },
  { name: '产品质量损害赔偿', period: 2, unit: '年', basis: '《产品质量法》第45条', note: '从当事人知道或者应当知道其权益受到损害之日起计算' },
  { name: '医疗损害赔偿', period: 3, unit: '年', basis: '《民法典》第188条', note: '从知道或应当知道权利受侵害之日起计算' },
]

function addPeriod(date, period, unit) {
  const d = new Date(date)
  if (unit === '年') {
    d.setFullYear(d.getFullYear() + period)
  } else if (unit === '月') {
    d.setMonth(d.getMonth() + period)
  } else if (unit === '日') {
    d.setDate(d.getDate() + period)
  }
  return d
}

function getDaysBetween(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  const diffTime = d2 - d1
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function StatuteOfLimitations() {
  const [eventDate, setEventDate] = useState('')
  const [caseType, setCaseType] = useState(CASE_TYPES[0].name)
  const [calculated, setCalculated] = useState(false)

  const handleCalculate = () => {
    setCalculated(true)
  }

  const selectedCase = CASE_TYPES.find(c => c.name === caseType)
  const deadline = eventDate ? addPeriod(eventDate, selectedCase.period, selectedCase.unit) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let remainingDays = null
  let status = null
  let statusText = ''
  let statusClass = ''

  if (calculated && deadline) {
    remainingDays = getDaysBetween(today, deadline)
    if (remainingDays <= 0) {
      status = 'expired'
      statusText = '已过期'
      statusClass = 'status-expired'
    } else if (remainingDays <= 30) {
      status = 'warning'
      statusText = '即将到期'
      statusClass = 'status-warning'
    } else {
      status = 'valid'
      statusText = '有效'
      statusClass = 'status-valid'
    }
  }

  const StatusIcon = status === 'expired' ? XCircle : status === 'warning' ? AlertTriangle : CheckCircle

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL}" className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">诉讼时效计算器</h2>
      </div>

      <div className="form-group">
        <label className="form-label">案件类型</label>
        <select className="form-select" value={caseType} onChange={e => { setCaseType(e.target.value); setCalculated(false) }}>
          {CASE_TYPES.map(c => (
            <option key={c.name} value={c.name}>
              {c.name}（{c.period}{c.unit}）
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">事件发生日期</label>
        <input
          type="date"
          className="form-input"
          value={eventDate}
          onChange={e => { setEventDate(e.target.value); setCalculated(false) }}
        />
      </div>

      <button className="btn btn-primary" onClick={handleCalculate}>
        <Clock size={16} /> 计算时效
      </button>

      {calculated && deadline && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">计算结果</h3>
          </div>
          <div className="result-content">
            {/* Status Banner */}
            <div className={statusClass} style={{
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <StatusIcon size={40} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {statusText}
                </div>
                <div style={{ fontSize: '14px', color: '#4a5568' }}>
                  {status === 'expired'
                    ? `已超过时效期限 ${Math.abs(remainingDays)} 天`
                    : `距离时效截止还有 ${remainingDays} 天`}
                </div>
              </div>
            </div>

            {/* Key Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '16px', background: '#f7fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>时效期限</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2d3748' }}>
                  {selectedCase.period} {selectedCase.unit}
                </div>
              </div>
              <div style={{ padding: '16px', background: '#ebf8ff', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>截止日期</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2b6cb0' }}>
                  {formatDate(deadline)}
                </div>
              </div>
            </div>

            {/* Detail Table */}
            <div style={{ background: '#f7fafc', borderRadius: '8px', padding: '16px', fontSize: '14px', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>案件类型</span>
                <span style={{ fontWeight: 'bold' }}>{selectedCase.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>事件发生日期</span>
                <span>{eventDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>时效期限</span>
                <span>{selectedCase.period} {selectedCase.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>截止日期</span>
                <span style={{ fontWeight: 'bold', color: '#2b6cb0' }}>{formatDate(deadline)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>今日日期</span>
                <span>{formatDate(today)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#718096', fontWeight: 'bold' }}>剩余天数</span>
                <span className={statusClass} style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {remainingDays >= 0 ? `${remainingDays} 天` : `已过期 ${Math.abs(remainingDays)} 天`}
                </span>
              </div>
            </div>

            {/* Legal Basis */}
            <div style={{ marginTop: '12px', padding: '12px', background: '#f0fff4', borderRadius: '8px', fontSize: '13px', color: '#276749' }}>
              <strong>法律依据：</strong>{selectedCase.basis}
            </div>

            <div style={{ marginTop: '8px', padding: '12px', background: '#ebf8ff', borderRadius: '8px', fontSize: '13px', color: '#2b6cb0' }}>
              <strong>说明：</strong>{selectedCase.note}
            </div>

            {status === 'warning' && (
              <div style={{ marginTop: '8px', padding: '12px', background: '#fffaf0', borderRadius: '8px', fontSize: '13px', color: '#c05621' }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                <strong>提醒：</strong>诉讼时效即将到期，建议尽快采取法律行动。注意时效中止、中断事由可能影响实际期限。
              </div>
            )}

            {status === 'expired' && (
              <div style={{ marginTop: '8px', padding: '12px', background: '#fff5f5', borderRadius: '8px', fontSize: '13px', color: '#c53030' }}>
                <XCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                <strong>注意：</strong>诉讼时效已过，对方可以提出时效抗辩。但请注意：(1) 时效经过后义务人自愿履行的，不得请求返还；(2) 请核实是否存在时效中止、中断的法定事由。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatuteOfLimitations
