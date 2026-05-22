import ReactMarkdown from 'react-markdown'

function MarkdownRenderer({ content }) {
  return (
    <div className="result-content">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
