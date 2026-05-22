import { useState } from 'react'
import { ArrowLeft, Calculator, Info } from 'lucide-react'

// 财产案件阶梯费率 —— 每档按（本档金额 × 费率）累加
const PROPERTY_BRACKETS = [
  { min: 0,        max: 10000,      rate: 0,     fixed: 50, label: '1万元以下' },
  { min: 10000,    max: 100000,     rate: 0.025, fixed: 0,  label: '1万-10万元' },
  { min: 100000,   max: 200000,     rate: 0.02,  fixed: 0,  label: '10万-20万元' },
  { min: 200000,   max: 500000,     rate: 0.015, fixed: 0,  label: '20万-50万元' },
  { min: 500000,   max: 1000000,    rate: 0.01,  fixed: 0,  label: '50万-100万元' },
  { min: 1000000,  max: 2000000,    rate: 0.009, fixed: 0,  label: '100万-200万元' },
  { min: 2000000,  max: 5000000,    rate: 0.008, fixed: 0,  label: '200万-500万元' },
  { min: 5000000,  max: 10000000,   rate: 0.007, fixed: 0,  label: '500万-1000万元' },
  { min: 10000000, max: 20000000,   rate: 0.006, fixed: 0,  label: '1000万-2000万元' },
  { min: 20000000, max: Infinity,   rate: 0.005, fixed: 0,  label: '2000万元以上' },
]

const NON_PROPERTY_CASES = [
  { name: '离婚案件', fee: 300, note: '涉及财产分割，超过20万元的部分按0.5%交纳' },
  { name: '劳动争议案件', fee: 10, note: '劳动争议案件每件交纳10元' },
  { name: '知识产权案件', fee: 100, note: '没有争议金额的，每件交纳100-1000元' },
  { name: '人格权案件', fee: 100, note: '涉及损害赔偿的，每件交纳100-500元' },
  { name: '行政案件（商标/专利/海事）', fee: 100, note: '商标、专利、海事行政案件每件交纳100元' },
  { name: '行政案件（其他）', fee: 50, note: '其他行政案件每件交纳50元' },
  { name: '执行案件（无执行金额）', fee: 50, note: '没有执行金额或价额的，每件交纳50-500元' },
  { name: '执行案件（有执行金额）', fee: 0, note: '按执行金额1.5%交纳，最高不超过50万元' },
  { name: '财产保全案件', fee: 0, note: '不超1000元按30元；1000-10万按1%；超10万按0.5%，最高不超5000元' },
]

/**
 * 财产案件诉讼费 —— 累进分档计算
 * 每档：本档计费金额 = min(标的额, 档上限) - 档下限
 *       本档费用 = 本档计费金额 × 费率（第一档为固定50元）
 */
function calcPropertyFee(amount) {
  if (amount <= 0) return { fee: 0, breakdown: [] }
  const breakdown = []
  let totalFee = 0
  for (const bracket of PROPERTY_BRACKETS) {
    if (amount <= bracket.min) break
    const taxable = Math.min(amount, bracket.max) - bracket.min
    let bracketFee
    if (bracket.rate === 0) {
      // 第一档：固定费用
      bracketFee = bracket.fixed
    } else {
      bracketFee = taxable * bracket.rate
    }
    totalFee += bracketFee
    breakdown.push({
      range: bracket.label,
      taxable,
      rate: bracket.rate === 0 ? '固定' : `${(bracket.rate * 100).toFixed(1)}%`,
      fee: bracketFee,
    })
  }
  return { fee: totalFee, breakdown }
}

/**
 * 离婚案件：300元 + 超过20万的部分按0.5%
 */
function calcDivorceFee(amount) {
  const base = 300
  if (amount <= 200000) return { fee: base, breakdown: [{ range: '基础费用', taxable: 0, rate: '固定', fee: base }] }
  const extra = (amount - 200000) * 0.005
  const total = base + extra
  return {
    fee: total,
    breakdown: [
      { range: '基础费用', taxable: 0, rate: '固定', fee: base },
      { range: '超20万部分', taxable: amount - 200000, rate: '0.5%', fee: extra },
    ],
  }
}

/**
 * 执行案件（有执行金额）：执行金额 × 1.5%，最高不超过50万
 */
function calcExecutionFee(amount) {
  if (amount <= 0) return { fee: 0, breakdown: [] }
  const fee = Math.min(amount * 0.015, 500000)
  const capped = amount * 0.015 > 500000
  return {
    fee,
    breakdown: [
      { range: '执行金额', taxable: amount, rate: '1.5%', fee: capped ? 500000 : fee },
      ...(capped ? [{ range: '封顶', taxable: 0, rate: '最高50万', fee: 0 }] : []),
    ],
  }
}

/**
 * 财产保全：不超1000元按30元；1000-10万按1%；超10万按0.5%，最高不超5000元
 */
function calcPreservationFee(amount) {
  if (amount <= 0) return { fee: 0, breakdown: [] }
  let fee = 0
  const breakdown = []
  if (amount <= 1000) {
    fee = 30
    breakdown.push({ range: '1000元以下', taxable: amount, rate: '固定', fee })
  } else {
    // 0-1000: 30
    fee += 30
    breakdown.push({ range: '1000元以下', taxable: 1000, rate: '固定', fee: 30 })
    if (amount <= 100000) {
      const part = (amount - 1000) * 0.01
      fee += part
      breakdown.push({ range: '1000-10万元', taxable: amount - 1000, rate: '1%', fee: part })
    } else {
      const part1 = (100000 - 1000) * 0.01
      fee += part1
      breakdown.push({ range: '1000-10万元', taxable: 100000 - 1000, rate: '1%', fee: part1 })
      const part2 = (amount - 100000) * 0.005
      fee += part2
      breakdown.push({ range: '10万元以上', taxable: amount - 100000, rate: '0.5%', fee: part2 })
    }
  }
  fee = Math.min(fee, 5000)
  return { fee, breakdown }
}

function calcNonPropertyFee(type, amount) {
  switch (type) {
    case '离婚案件':
      return calcDivorceFee(amount)
    case '执行案件（有执行金额）':
      return calcExecutionFee(amount)
    case '财产保全案件':
      return calcPreservationFee(amount)
    default: {
      const c = NON_PROPERTY_CASES.find(c => c.name === type)
      return { fee: c?.fee || 0, breakdown: [{ range: '固定费用', taxable: 0, rate: '固定', fee: c?.fee || 0 }] }
    }
  }
}

function formatMoney(n) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function LitigationFeeCalculator() {
  const [caseType, setCaseType] = useState('property')
  const [amount, setAmount] = useState('')
  const [simpleProcedure, setSimpleProcedure] = useState(false)
  const [nonPropertyType, setNonPropertyType] = useState('离婚案件')
  const [showDetail, setShowDetail] = useState(false)
  const [calculated, setCalculated] = useState(false)

  const handleCalculate = () => {
    setCalculated(true)
    setShowDetail(false)
  }

  const numAmount = parseFloat(amount) || 0
  const isProperty = caseType === 'property'

  let rawFee = 0
  let breakdown = []

  if (isProperty) {
    const result = calcPropertyFee(numAmount)
    rawFee = result.fee
    breakdown = result.breakdown
  } else {
    const result = calcNonPropertyFee(nonPropertyType, numAmount)
    rawFee = result.fee
    breakdown = result.breakdown
  }

  const baseFee = rawFee
  const finalFee = simpleProcedure ? baseFee / 2 : baseFee

  // 非财产案件中需要输入金额的类型
  const needsAmount = ['离婚案件', '执行案件（有执行金额）', '财产保全案件'].includes(nonPropertyType)

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL}" className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">诉讼费计算器</h2>
      </div>

      <div className="form-group">
        <label className="form-label">案件类型</label>
        <select className="form-select" value={caseType} onChange={e => { setCaseType(e.target.value); setCalculated(false) }}>
          <option value="property">财产案件</option>
          <option value="nonProperty">非财产案件</option>
        </select>
      </div>

      {isProperty ? (
        <div className="form-group">
          <label className="form-label">诉讼标的额（元）</label>
          <input
            type="number"
            className="form-input"
            placeholder="请输入诉讼标的金额"
            value={amount}
            onChange={e => { setAmount(e.target.value); setCalculated(false) }}
          />
        </div>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">案件类型</label>
            <select className="form-select" value={nonPropertyType} onChange={e => { setNonPropertyType(e.target.value); setCalculated(false) }}>
              {NON_PROPERTY_CASES.map(c => (
                <option key={c.name} value={c.name}>{c.name}（{c.fee > 0 ? c.fee + '元' : '按金额计算'}）</option>
              ))}
            </select>
          </div>
          {needsAmount && (
            <div className="form-group">
              <label className="form-label">争议金额（元）</label>
              <input
                type="number"
                className="form-input"
                placeholder="请输入争议金额"
                value={amount}
                onChange={e => { setAmount(e.target.value); setCalculated(false) }}
              />
            </div>
          )}
        </>
      )}

      <div className="form-group">
        <label className="form-label">
          <input type="checkbox" checked={simpleProcedure} onChange={e => { setSimpleProcedure(e.target.checked); setCalculated(false) }} />
          {' '}适用简易程序（减半收取）
        </label>
      </div>

      <button className="btn btn-primary" onClick={handleCalculate}>
        <Calculator size={16} /> 计算诉讼费
      </button>

      {calculated && (
        <div className="result-area">
          <div className="result-header">
            <h3 className="result-title">计算结果</h3>
          </div>
          <div className="result-content">
            <div className="calc-highlight">
              <div>
                <div style={{ fontSize: '14px', color: '#718096', marginBottom: '4px' }}>基础诉讼费</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>{formatMoney(baseFee)} 元</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#718096', marginBottom: '4px' }}>
                  {simpleProcedure ? '简易程序减半后' : '应交纳诉讼费'}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b6cb0' }}>{formatMoney(finalFee)} 元</div>
              </div>
            </div>

            {simpleProcedure && (
              <div style={{ padding: '12px', background: '#fefcbf', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#744210' }}>
                <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                简易程序减半收取：{formatMoney(baseFee)} / 2 = {formatMoney(finalFee)} 元
              </div>
            )}

            {breakdown.length > 0 && (
              <div className="calc-detail">
                <div style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px', color: '#4a5568' }}
                  onClick={() => setShowDetail(!showDetail)}>
                  {showDetail ? '▼' : '▶'} 费用计算明细
                </div>
                {showDetail && (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="calc-result-table">
                      <thead>
                        <tr>
                          <th>标的额区间</th>
                          <th style={{ textAlign: 'right' }}>计费金额</th>
                          <th style={{ textAlign: 'center' }}>费率</th>
                          <th style={{ textAlign: 'right' }}>本档费用</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((row, i) => (
                          <tr key={i}>
                            <td>{row.range}</td>
                            <td style={{ textAlign: 'right' }}>{row.taxable > 0 ? formatMoney(row.taxable) + ' 元' : '-'}</td>
                            <td style={{ textAlign: 'center' }}>{row.rate}</td>
                            <td style={{ textAlign: 'right' }}>{formatMoney(row.fee)} 元</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#ebf8ff', fontWeight: 'bold' }}>
                          <td colSpan={3} style={{ textAlign: 'right' }}>合计</td>
                          <td style={{ textAlign: 'right' }}>{formatMoney(baseFee)} 元</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!isProperty && (
              <div style={{ padding: '12px', background: '#f0fff4', borderRadius: '8px', fontSize: '14px', color: '#276749' }}>
                <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                {NON_PROPERTY_CASES.find(c => c.name === nonPropertyType)?.note}
              </div>
            )}

            <div style={{ marginTop: '16px', padding: '12px', background: '#f7fafc', borderRadius: '8px', fontSize: '12px', color: '#a0aec0' }}>
              依据：《诉讼费用交纳办法》（国务院令第481号）
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LitigationFeeCalculator
