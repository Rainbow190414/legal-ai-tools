import { useState } from 'react'
import { ArrowLeft, Scale, Search, FileDown, Loader2, AlertCircle, BookOpen, FileText, CheckCircle } from 'lucide-react'

const SEARCH_TYPES = [
  { value: 'law', label: '法律法规', icon: BookOpen, desc: '法律、行政法规、司法解释、部门规章等' },
  { value: 'case', label: '案例检索', icon: FileText, desc: '各级法院裁判文书、行政处罚案例' },
  { value: 'both', label: '综合检索', icon: Scale, desc: '同时检索法律法规和相关案例' },
]

export default function LegalSearch() {
  const [searchType, setSearchType] = useState('law')
  const [keyword, setKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const handleSearch = async () => {
    if (!keyword.trim()) {
      setError('请输入检索关键词')
      return
    }
    
    setSearching(true)
    setError('')
    setResult('')
    
    try {
      const { chatWithKimi } = await import('../api/kimi')
      
      const systemPrompt = searchType === 'law' 
        ? `你是一位专业的法律检索专家。请根据用户的检索关键词，提供相关法律法规的详细分析。

请按以下格式输出：

## 检索关键词
[用户输入的关键词]

## 相关法律法规

### 1. [法律名称]
- **效力级别**：[法律/行政法规/司法解释/部门规章/地方性法规]
- **发布机关**：[发布机关]
- **发布/施行日期**：[日期]
- **效力状态**：[现行有效/已废止/已修改]
- **核心条款**：
  > [引用相关条款原文]
- **适用要点**：[简要说明适用场景和要点]

### 2. [法律名称]
...（继续列出其他相关法规）

## 法律适用建议
[针对检索关键词，给出法律适用的专业建议]

## 注意事项
[需要特别注意的问题，如新旧法衔接、司法解释适用等]`
        : searchType === 'case'
        ? `你是一位专业的案例检索专家。请根据用户的检索关键词，提供相关案例的分析。

请按以下格式输出：

## 检索关键词
[用户输入的关键词]

## 相关案例

### 案例1：[案件名称]
- **案号**：[案号]
- **审理法院**：[法院名称及层级]
- **裁判日期**：[日期]
- **案由**：[案由]
- **裁判要点**：
  > [核心裁判观点]
- **法律依据**：[引用的法条]
- **参考价值**：[高/中/低，并说明理由]

### 案例2：[案件名称]
...（继续列出其他相关案例）

## 裁判观点总结
[归纳类案中的共同裁判观点]

## 实务建议
[基于案例分析给出的实务操作建议]`
        : `你是一位专业的法律检索专家。请根据用户的检索关键词，同时提供相关法律法规和案例的综合分析。

请按以下格式输出：

## 检索关键词
[用户输入的关键词]

## 一、相关法律法规

### 1. [法律名称]
- **效力级别**：[法律/行政法规/司法解释等]
- **发布机关**：[发布机关]
- **核心条款**：
  > [引用相关条款]
- **适用要点**：[简要说明]

## 二、相关案例

### 案例1：[案件名称]
- **案号**：[案号]
- **审理法院**：[法院名称]
- **裁判要点**：
  > [核心裁判观点]
- **法律依据**：[引用的法条]

## 三、法律适用分析
[结合法律规定和案例裁判观点，给出综合分析]

## 四、实务建议
[具体的操作建议]`

      let fullResult = ''
      await chatWithKimi([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请检索：${keyword}` }
      ], {
        onChunk: (chunk) => {
          fullResult += chunk
          setResult(fullResult)
        }
      })
    } catch (err) {
      setError('检索失败：' + (err.message || '请检查API设置'))
    } finally {
      setSearching(false)
    }
  }

  const handleDownload = async () => {
    if (!result) return
    setDownloading(true)
    
    try {
      // 动态导入 docx 库
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import('docx')
      const { saveAs } = await import('file-saver')
      
      // 解析 Markdown 内容并转换为 docx 段落
      const lines = result.split('\n')
      const children = []
      
      for (const line of lines) {
        if (line.startsWith('## ')) {
          // 二级标题
          children.push(new Paragraph({
            text: line.replace('## ', ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }))
        } else if (line.startsWith('### ')) {
          // 三级标题
          children.push(new Paragraph({
            text: line.replace('### ', ''),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          }))
        } else if (line.startsWith('> ')) {
          // 引用块
          children.push(new Paragraph({
            children: [
              new TextRun({
                text: line.replace('> ', ''),
                italics: true,
                color: '666666'
              })
            ],
            indent: { left: 400 },
            spacing: { before: 100, after: 100 }
          }))
        } else if (line.startsWith('- **') && line.includes('**：')) {
          // 列表项带加粗
          const match = line.match(/- \*\*(.+?)\*\*：(.+)/)
          if (match) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: '• ', bold: true }),
                new TextRun({ text: match[1], bold: true }),
                new TextRun({ text: '：' + match[2] })
              ],
              spacing: { before: 60, after: 60 }
            }))
          }
        } else if (line.startsWith('- ')) {
          // 普通列表项
          children.push(new Paragraph({
            text: '• ' + line.replace('- ', ''),
            spacing: { before: 60, after: 60 }
          }))
        } else if (line.trim()) {
          // 普通段落
          children.push(new Paragraph({
            text: line,
            spacing: { before: 60, after: 60 }
          }))
        }
      }
      
      // 创建文档
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: [
            // 标题
            new Paragraph({
              text: '法律检索报告',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            // 检索信息
            new Paragraph({
              children: [
                new TextRun({ text: '检索类型：', bold: true }),
                new TextRun(SEARCH_TYPES.find(t => t.value === searchType)?.label || ''),
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '检索关键词：', bold: true }),
                new TextRun(keyword),
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '生成时间：', bold: true }),
                new TextRun(new Date().toLocaleString('zh-CN')),
              ],
              spacing: { after: 300 }
            }),
            // 分隔线
            new Paragraph({
              text: '',
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' }
              },
              spacing: { after: 300 }
            }),
            // 内容
            ...children
          ]
        }]
      })
      
      // 生成并下载
      const blob = await Packer.toBlob(doc)
      saveAs(blob, `法律检索报告_${keyword.slice(0, 10)}_${Date.now()}.docx`)
    } catch (err) {
      alert('生成报告失败：' + (err.message || '请稍后重试'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="legal-search-page">
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn">
          <ArrowLeft size={16} /> 返回首页
        </a>
        <h1><Scale size={24} /> 法律检索</h1>
        <p className="page-desc">智能检索法律法规与案例，一键生成专业检索报告</p>
      </div>

      {/* 检索类型选择 */}
      <div className="search-type-section">
        <h3>选择检索类型</h3>
        <div className="search-type-grid">
          {SEARCH_TYPES.map(type => (
            <div
              key={type.value}
              className={`search-type-card ${searchType === type.value ? 'active' : ''}`}
              onClick={() => setSearchType(type.value)}
            >
              <type.icon size={24} className="type-icon" />
              <div className="type-info">
                <h4>{type.label}</h4>
                <p>{type.desc}</p>
              </div>
              {searchType === type.value && <CheckCircle size={20} className="check-icon" />}
            </div>
          ))}
        </div>
      </div>

      {/* 检索输入 */}
      <div className="search-input-section">
        <h3>输入检索关键词</h3>
        <div className="search-input-wrapper">
          <textarea
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder={searchType === 'law' 
              ? '请输入法律检索关键词...\n\n例如：\n• 合同解除的法律后果\n• 劳动合同违约金\n• 消费者权益保护 惩罚性赔偿'
              : searchType === 'case'
              ? '请输入案例检索关键词...\n\n例如：\n• 建设工程施工合同纠纷 工程款\n• 劳动争议 违法解除劳动合同\n• 知识产权侵权 赔偿数额'
              : '请输入检索关键词...\n\n例如：\n• 股权转让合同纠纷\n• 房屋买卖合同 效力认定'
            }
            rows={5}
          />
          <button 
            className="search-btn"
            onClick={handleSearch}
            disabled={searching || !keyword.trim()}
          >
            {searching ? (
              <><Loader2 size={18} className="spin" /> 检索中...</>
            ) : (
              <><Search size={18} /> 开始检索</>
            )}
          </button>
        </div>
        {error && (
          <div className="error-message">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      {/* 检索结果 */}
      {result && (
        <div className="search-result-section">
          <div className="result-header">
            <h3>检索结果</h3>
            <button 
              className="download-btn"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <><Loader2 size={16} className="spin" /> 生成中...</>
              ) : (
                <><FileDown size={16} /> 下载Word报告</>
              )}
            </button>
          </div>
          <div className="result-content">
            <pre>{result}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
