import { useNavigate } from 'react-router-dom'
import {
  FileSearch, ShieldCheck, Shield, BookOpen, FileText,
  FileOutput, ClipboardList, PenTool, AlertTriangle, Scale, MailPlus
} from 'lucide-react'
import '../case-styles.css'

// 计算工具
const calcTools = [
  {
    title: '诉讼费计算器',
    description: '计算民事案件诉讼费用，支持财产案件分段累计计算',
    emoji: '🧮',
    color: '#e53e3e',
    path: '/litigation-fee'
  },
  {
    title: '利息计算器',
    description: '支持LPR利率、逾期利息、民间借贷利息上限计算',
    emoji: '💰',
    color: '#3182ce',
    path: '/interest-calc'
  },
  {
    title: '违约金计算器',
    description: '计算合同违约金，支持日万分之五等常见标准',
    emoji: '⚠️',
    color: '#dd6b20',
    path: '/penalty-calc'
  },
  {
    title: '诉讼时效计算器',
    description: '计算民事、劳动、行政诉讼时效截止日期',
    emoji: '⏰',
    color: '#805ad5',
    path: '/statute-limitations'
  },
]

// 文件与图片处理工具
const fileTools = [
  {
    title: 'PDF转图片',
    description: '将PDF文件转换为PNG图片，支持批量转换和下载',
    emoji: '📄',
    color: '#e53e3e',
    path: '/pdf-to-image'
  },
  {
    title: '图片加水印',
    description: '为图片添加文字水印，支持平铺、自定义位置和透明度',
    emoji: '🖼️',
    color: '#3182ce',
    path: '/image-watermark'
  },
  {
    title: '多图拼接',
    description: '将多张图片纵向或横向拼接为一张长图',
    emoji: '🧩',
    color: '#38a169',
    path: '/image-stitch'
  },
]

// AI 智能工具
const aiTools = [
  {
    title: '合同审查',
    description: '基于谈判手册审查合同，标注偏差并生成红笔建议',
    icon: FileSearch,
    color: '#3182ce',
    path: '/contract-review'
  },
  {
    title: 'NDA审查',
    description: '快速评估保密协议，按绿/黄/红分级并给出路由建议',
    icon: ShieldCheck,
    color: '#2f855a',
    path: '/nda-triage'
  },
  {
    title: '文件脱敏',
    description: '自动识别并脱敏姓名、身份证号、电话等敏感信息',
    icon: Shield,
    color: '#38a169',
    path: '/file-desensitize'
  },
  {
    title: '案件卷宗阅读',
    description: '批量读取分析案卷，生成人物关系图、时间线、证据清单',
    icon: BookOpen,
    color: '#e53e3e',
    path: '/case-reading'
  },
  {
    title: '笔录整理',
    description: '从案卷中提取关键讯问笔录，整理为结构化表格',
    icon: FileText,
    color: '#dd6b20',
    path: '/transcript-organizer'
  },
  {
    title: '会议纪要→服务方案',
    description: '将会议纪要转化为专业的法律服务方案',
    icon: FileOutput,
    color: '#d69e2e',
    path: '/meeting-to-plan'
  },
  {
    title: '会议简报',
    description: '为法律相关会议准备结构化简报和行动项跟踪',
    icon: ClipboardList,
    color: '#805ad5',
    path: '/meeting-briefing'
  },
  {
    title: '法律文书生成',
    description: '根据案件信息生成起诉状、答辩状等各类法律文书',
    icon: PenTool,
    color: '#9f7aea',
    path: '/legal-doc-gen'
  },
  {
    title: '风险评估',
    description: '使用严重性×可能性矩阵评估和分类法律风险',
    icon: AlertTriangle,
    color: '#c53030',
    path: '/risk-assessment'
  },
  {
    title: '合规审查',
    description: 'GDPR/CCPA/PIPL合规审查、DPA审查、数据主体请求处理',
    icon: Scale,
    color: '#319795',
    path: '/compliance'
  },
  {
    title: '模板回复',
    description: '生成常见法律咨询的模板化回复，识别升级触发条件',
    icon: MailPlus,
    color: '#4a5568',
    path: '/canned-responses'
  },
]

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-title">法律AI工具集</h1>
        <p className="home-subtitle">基于AI技术，为律师提供高效的智能辅助工具</p>
      </div>

      {/* 案件档案管理入口 */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">📁 案件档案管理</h2>
          <p className="home-section-desc">管理案件材料，AI自动阅读生成摘要，各工具可针对指定案件工作</p>
        </div>
        <div className="case-manager-entry" onClick={() => navigate('/case-manager')}>
          <div className="case-entry-icon">📂</div>
          <div className="case-entry-info">
            <h3>进入案件档案管理</h3>
            <p>创建案件、上传材料、AI生成摘要、记录案件进展</p>
          </div>
          <div className="case-entry-arrow">→</div>
        </div>
      </div>

      {/* 计算工具 */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">🧮 计算工具</h2>
          <p className="home-section-desc">纯前端计算，数据不离开浏览器</p>
        </div>
        <div className="home-grid">
          {calcTools.map((tool) => (
            <div
              key={tool.path}
              className="card"
              onClick={() => navigate(tool.path)}
            >
              <div className="card-icon" style={{ background: tool.color + '20' }}>
                <span style={{ fontSize: '28px' }}>{tool.emoji}</span>
              </div>
              <h3 className="card-title">{tool.title}</h3>
              <p className="card-desc">{tool.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 文件与图片处理 */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">🛠️ 文件与图片处理</h2>
          <p className="home-section-desc">纯前端处理，无需上传服务器</p>
        </div>
        <div className="home-grid">
          {fileTools.map((tool) => (
            <div
              key={tool.path}
              className="card"
              onClick={() => navigate(tool.path)}
            >
              <div className="card-icon" style={{ background: tool.color + '20' }}>
                <span style={{ fontSize: '28px' }}>{tool.emoji}</span>
              </div>
              <h3 className="card-title">{tool.title}</h3>
              <p className="card-desc">{tool.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI 智能工具 */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">🤖 AI 智能工具</h2>
          <p className="home-section-desc">基于Kimi大模型，需要配置API Key</p>
        </div>
        <div className="home-grid">
          {aiTools.map((tool) => {
            const Icon = tool.icon
            return (
              <div
                key={tool.path}
                className="card"
                onClick={() => navigate(tool.path)}
              >
                <div className="card-icon" style={{ background: tool.color + '20' }}>
                  <Icon size={28} color={tool.color} />
                </div>
                <h3 className="card-title">{tool.title}</h3>
                <p className="card-desc">{tool.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Home
