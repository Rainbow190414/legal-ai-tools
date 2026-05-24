import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

function parseMarkdownToDocx(text) {
  const lines = text.split('\n')
  const children = []
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.replace('## ', ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      }))
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        text: line.replace('### ', ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }))
    } else if (line.startsWith('#### ')) {
      children.push(new Paragraph({
        text: line.replace('#### ', ''),
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 150, after: 80 }
      }))
    } else if (line.startsWith('> ')) {
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
    } else if (line.startsWith('- **') && line.includes('**: ')) {
      const match = line.match(/- \*\*(.+?)\*\*: (.+)/)
      if (match) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: '• ', bold: true }),
            new TextRun({ text: match[1], bold: true }),
            new TextRun({ text: ': ' + match[2] })
          ],
          spacing: { before: 60, after: 60 }
        }))
      }
    } else if (line.startsWith('- ')) {
      children.push(new Paragraph({
        text: '• ' + line.replace('- ', ''),
        spacing: { before: 60, after: 60 }
      }))
    } else if (line.match(/^\d+\.\s/)) {
      children.push(new Paragraph({
        text: line,
        spacing: { before: 60, after: 60 }
      }))
    } else if (line.trim()) {
      children.push(new Paragraph({
        text: line,
        spacing: { before: 60, after: 60 }
      }))
    }
  }
  
  return children
}

export async function exportToWord({ title, content, filename, metadata = {} }) {
  try {
    const contentParagraphs = parseMarkdownToDocx(content)
    
    const metadataParagraphs = []
    if (Object.keys(metadata).length > 0) {
      for (const [key, value] of Object.entries(metadata)) {
        metadataParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: key + '：', bold: true }),
            new TextRun(String(value))
          ],
          spacing: { after: 100 }
        }))
      }
      metadataParagraphs.push(new Paragraph({
        text: '',
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' }
        },
        spacing: { after: 300 }
      }))
    }
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          ...metadataParagraphs,
          ...contentParagraphs
        ]
      }]
    })
    
    const blob = await Packer.toBlob(doc)
    const timestamp = new Date().toISOString().slice(0, 10)
    saveAs(blob, `${filename}_${timestamp}.docx`)
    
    return true
  } catch (err) {
    console.error('导出Word失败:', err)
    throw err
  }
}

export default exportToWord
