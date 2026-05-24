import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'

export async function exportToWord({ title, content, metadata = {} }) {
  const children = []
  children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }))
  if (metadata.tool || metadata.caseName || metadata.timestamp) {
    const metaTexts = []
    if (metadata.tool) metaTexts.push(`工具: ${metadata.tool}`)
    if (metadata.caseName) metaTexts.push(`案件: ${metadata.caseName}`)
    if (metadata.timestamp) metaTexts.push(`时间: ${new Date(metadata.timestamp).toLocaleString()}`)
    children.push(new Paragraph({ children: [new TextRun({ text: metaTexts.join(' | '), italics: true, color: '666666', size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }))
  }
  const lines = content.split('\n')
  for (const line of lines) {
    if (!line.trim()) { children.push(new Paragraph({ spacing: { after: 200 } })); continue }
    if (line.startsWith('# ')) { children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 })); continue }
    if (line.startsWith('## ')) { children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 })); continue }
    if (line.startsWith('### ')) { children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 })); continue }
    children.push(new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 200 } }))
  }
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] })
  const blob = await Packer.toBlob(doc)
  const fileName = `${title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`
  saveAs(blob, fileName)
}
