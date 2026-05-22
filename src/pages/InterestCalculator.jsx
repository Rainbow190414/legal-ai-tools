import { useState, useMemo } from 'react'
import { ArrowLeft, Calculator, Info } from 'lucide-react'

// 完整LPR历史数据（来源：中国人民银行官方公布）
const LPR_HISTORY = [
  { date: '2019-08-20', oneYear: 4.25, fiveYear: 4.85 },
  { date: '2019-09-20', oneYear: 4.20, fiveYear: 4.85 },
  { date: '2019-11-20', oneYear: 4.15, fiveYear: 4.80 },
  { date: '2020-02-20', oneYear: 4.05, fiveYear: 4.75 },
  { date: '2020-04-20', oneYear: 3.85, fiveYear: 4.65 },
  { date: '2021-12-20', oneYear: 3.80, fiveYear: 4.65 },
  { date: '2022-01-20', oneYear: 3.70, fiveYear: 4.60 },
  { date: '2022-05-20', oneYear: 3.70, fiveYear: 4.45 },
  { date: '2022-08-22', oneYear: 3.65, fiveYear: 4.30 },
  { date: '2023-06-20', oneYear: 3.55, fiveYear: 4.20 },
  { date: '2023-08-21', oneYear: 3.45, fiveYear: 4.20 },
  { date: '2024-01-20', oneYear: 3.45, fiveYear: 4.20 },
  { date: '2024-02-20', oneYear: 3.45, fiveYear: 3.95 },
  { date: '2024-07-22', oneYear: 3.35, fiveYear: 3.85 },
  { date: '2024-10-21', oneYear: 3.10, fiveYear: 3.60 },
  { date: '2025-01-20', oneYear: 3.10, fiveYear: 3.60 },
  { date: '2025-05-20', oneYear: 3.00, fiveYear: 3.50 },
]

// LPR起始日期（2019年8月20日首次发布）
const LPR_START_DATE = '2019-08-20'

const OVERDUE_MULTIPLES = [
  { label: '1倍（基准利率）', value: 1 },
  { label: '1.3倍', value: 1.3 },
  { label: '1.5倍', value: 1.5 },
  { label: '2倍', value: 2 },
  { label: '4倍', value: 4 },
]

/**
 * 根据起算日期查找适用的LPR利率
 * 规则：取起算日期当日或之前最近一次公布的LPR利率
 */
function findApplicableLPR(dateStr) {
  if (!dateStr) return null
  const targetDate = new Date(dateStr)
  // LPR发布之前无法查询
  if (targetDate < new Date(LPR_START_DATE)) return null

  let applicable = null
  for (let i = LPR_HISTORY.length - 1; i >= 0; i--) {
    if (new Date(LPR_HISTORY[i].date) <= targetDate) {
      applicable = LPR_HISTORY[i]
      break
    }
  }
  return applicable
}

/**
 * 计算两个日期之间的天数（含首尾两天，即算头算尾）
 * 按中国司法实践，计息天数 = 截止日期 - 起算日期 + 1
 */
function getDaysBetween(start, end) {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  const diffTime = e - s
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1 // 算头算尾
}

function formatMoney(n) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function InterestCalculator() {
  const [principal, setPrincipal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rateType, setRateType] = useState('lpr1y')
  const [customRate, setCustomRate] = useState('')
  const [overdueMultiple, setOverdueMultiple] = useState(1)
  const [isOverdue, setIsOverdue] = useState(false)
  const [calculated, setCalculated] = useState(false)

  // 根据起算日期自动查找适用的LPR
  const applicableLPR = useMemo(() => {
    if (rateType === 'custom') return null
    return findApplicableLPR(startDate)
  }, [startDate, rateType])

  const handleCalculate = () => {
    setCalculated(true)
  }

  const numPrincipal = parseFloat(principal) || 0
  const days = getDaysBetween(startDate, endDate)

  // 确定年利率
  let annualRate = 0
  let rateSource = ''
  if (rateType === 'custom') {
    annualRate = parseFloat(customRate) || 0
    rateSource = '自定义利率'
  } else if (applicableLPR) {
    annualRate = rateType === 'lpr1y' ? applicableLPR.oneYear : applicableLPR.fiveYear
    rateSource = `LPR（${applicableLPR.date}公布）`
  }

  // 实际执行利率（考虑逾期倍数）
  const effectiveRate = isOverdue ? annualRate * overdueMultiple : annualRate

  // 日利率 = 年利率 / 360（按中国司法实践：最高人民法院关于适用LPR的司法解释）
  const dailyRate = effectiveRate / 100 / 360

  // 利息总额 = 本金 × 日利率 × 天数
  const totalInterest = numPrincipal * dailyRate * days
  const totalAmount = numPrincipal + totalInterest

  // 判断起算日期是否在LPR发布之前
  const isBeforeLPR = startDate && new Date(startDate) < new Date(LPR_START_DATE)

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL}" className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">利息计算器</h2>
      </div>

      <div className="form-group">
        <label className="form-label">本金（元）</label>
        <input
          type="number"
          className="form-input"
          placeholder="请输入本金金额"
          value={principal}
          onChange={e => { setPrincipal(e.target.value); setCalculated(false) }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">起算日期</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            min={LPR_START_DATE}
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
        <label className="form-label">利率类型</label>
        <select className="form-select" value={rateType} onChange={e => { setRateType(e.target.value); setCalculated(false) }}>
          <option value="lpr1y">LPR 1年期</option>
          <option value="lpr5y">LPR 5年期</option>
          <option value="custom">自定义年利率</option>
        </select>
      </div>

      {rateType !== 'custom' && applicableLPR && (
        <div className="form-group">
          <label className="form-label">适用LPR利率</label>
          <div style={{
            padding: '12px',
            background: '#f0fff4',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#276749',
            border: '1px solid #c6f6d5'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {applicableLPR.date} 公布的LPR
            </div>
            <div>1年期：{applicableLPR.oneYear}% | 5年期：{applicableLPR.fiveYear}%</div>
            <div style={{ fontSize: '12px', color: '#68d391', marginTop: '4px' }}>
              根据起算日期自动匹配，无需手动选择
            </div>
          </div>
        </div>
      )}

      {rateType !== 'custom' && isBeforeLPR && (
        <div className="form-group">
          <div style={{
            padding: '12px',
            background: '#fff5f5',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#c53030',
            border: '1px solid #fed7d7'
          }}>
            起算日期早于LPR发布日期（2019-08-20），请使用自定义利率。
          </div>
        </div>
      )}

      {rateType === 'custom' && (
        <div className="form-group">
          <label className="form-label">自定义年利率（%）</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            placeholder="请输入年利率，如 4.35"
            value={customRate}
            onChange={e => { setCustomRate(e.target.value); setCalculated(false) }}
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          <input type="checkbox" checked={isOverdue} onChange={e => { setIsOverdue(e.target.checked); setCalculated(false) }} />
          {' '}计算逾期利息
        </label>
      </div>

      {isOverdue && (
        <div className="form-group">
          <label className="form-label">逾期利率倍数</label>
          <select className="form-select" value={overdueMultiple} onChange={e => { setOverdueMultiple(parseFloat(e.target.value)); setCalculated(false) }}>
            {OVERDUE_MULTIPLES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleCalculate}>
        <Calculator size={16} /> 计算利息
      </button>

      {calculated && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">计算结果</h3>
          </div>
          <div className="result-content">
            <div className="calc-highlight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '16px', background: '#f7fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>计息天数</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2d3748' }}>{days} 天</div>
              </div>
              <div style={{ padding: '16px', background: '#fefcbf', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>利息总额</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#975a16' }}>{formatMoney(totalInterest)} 元</div>
              </div>
              <div style={{ padding: '16px', background: '#ebf8ff', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>本息合计</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2b6cb0' }}>{formatMoney(totalAmount)} 元</div>
              </div>
            </div>

            <div className="calc-detail" style={{ background: '#f7fafc', borderRadius: '8px', padding: '16px', fontSize: '14px', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>本金</span>
                <span style={{ fontWeight: 'bold' }}>{formatMoney(numPrincipal)} 元</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>计息期间</span>
                <span>{formatDate(startDate)} 至 {formatDate(endDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>计息天数</span>
                <span>{days} 天（算头算尾）</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>利率来源</span>
                <span>{rateSource}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>基准年利率</span>
                <span>{annualRate}%</span>
              </div>
              {isOverdue && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#718096' }}>逾期倍数</span>
                  <span style={{ color: '#c53030' }}>{overdueMultiple}倍</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>实际执行年利率</span>
                <span style={{ fontWeight: 'bold', color: '#2b6cb0' }}>{effectiveRate}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>日利率（年利率/360）</span>
                <span>{(dailyRate * 100).toFixed(6)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#718096' }}>每日利息</span>
                <span>{formatMoney(numPrincipal * dailyRate)} 元</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#718096', fontWeight: 'bold' }}>利息总额</span>
                <span style={{ fontWeight: 'bold', color: '#c53030', fontSize: '16px' }}>{formatMoney(totalInterest)} 元</span>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '12px', background: '#f0fff4', borderRadius: '8px', fontSize: '13px', color: '#276749' }}>
              <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              计算公式：利息 = 本金 x (年利率 / 360) x 天数 = {formatMoney(numPrincipal)} x ({annualRate}% / 360) x {days}天
            </div>

            <div style={{ marginTop: '8px', padding: '12px', background: '#f7fafc', borderRadius: '8px', fontSize: '12px', color: '#a0aec0' }}>
              LPR数据来源：中国人民银行公布的贷款市场报价利率（LPR）。日利率按年利率除以360天计算，符合最高人民法院关于适用LPR的司法解释。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InterestCalculator
