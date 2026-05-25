import JSZip from 'jszip'

// 读取文件内容，支持多种格式
export async function readFileContent(file) {
  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error(`文件 "${file.name}" 过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请上传20MB以内的文件`)
  }

  const ext = file.name.split('.').pop().toLowerCase()
  const textExts = ['txt', 'md', 'json', 'csv', 'xml', 'html', 'htm', 'js', 'jsx', 'ts', 'css', 'yaml', 'yml', 'log', 'ini', 'conf', 'py', 'java', 'c', 'cpp', 'h', 'sh', 'bat', 'sql', 'rtf']
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']

  if (textExts.includes(ext) || file.type.startsWith('text/')) {
    return file.text()
  }

  if (imageExts.includes(ext) || file.type.startsWith('image/')) {
    return `[图片文件: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(1)}KB\n类型: ${file.type}\n\n注意：图片内容需要通过OCR识别，请描述图片中的文字内容。`
  }

  // DOCX/XLSX/PPTX - 使用 JSZip 解压
  if (['docx', 'xlsx', 'pptx'].includes(ext)) {
    try {
      const zip = await JSZip.loadAsync(file)
      let targetFile = ext === 'docx' ? 'word/document.xml' : ext === 'xlsx' ? 'xl/sharedStrings.xml' : 'ppt/slides/slide1.xml'
      let xmlFile = zip.file(targetFile)
      if (!xmlFile) {
        const allFiles = Object.keys(zip.files)
        const matched = allFiles.find(f => f.includes('document.xml') || f.includes('sharedStrings.xml') || f.includes('slide'))
        if (matched) xmlFile = zip.file(matched)
      }
      if (xmlFile) {
        const xml = await xmlFile.async('text')
        const matches = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || xml.match(/<t[^>]*>([^<]+)<\/t>/g)
        if (matches) return matches.map(m => m.replace(/<\/?[wa]?:t[^>]*>/g, '')).join('')
        return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
    } catch (err) {
      throw new Error(`无法解析${ext.toUpperCase()}文件: ${err.message}`)
    }
  }

  // PDF/旧格式 - 二进制读取
  if (['pdf', 'doc', 'xls', 'ppt'].includes(ext)) {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const text = extractTextFromBinary(bytes, ext)
    if (text && text.trim()) return text
    throw new Error(`此${ext.toUpperCase()}文件无法提取文本内容`)
  }

  // 兜底
  return file.text().catch(() => {
    throw new Error(`不支持的文件格式: .${ext}，请上传 txt、pdf、word、excel、图片等文件`)
  })
}

// 从二进制数据中提取文本（PDF/DOC/XLS/PPT 旧格式）
export function extractTextFromBinary(bytes, ext) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false })
    if (ext === 'pdf') {
      const text = decoder.decode(bytes)
      const streams = text.match(/stream[\s\S]*?endstream/g)
      if (streams) {
        let extracted = ''
        for (const s of streams) {
          const inner = s.replace(/stream\r?\n?/, '').replace(/\r?\n?endstream/, '')
          try {
            const decoded = decoder.decode(new Uint8Array([...inner].map(c => c.charCodeAt(0))))
            const readable = decoded.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,;:!?()（）、，。；：！？""''【】《》\-\—\n]/g, '').trim()
            if (readable.length > 10) extracted += readable + '\n'
          } catch(e) {}
        }
        if (extracted.trim().length > 20) return extracted.trim()
      }
      return null
    }
    if (['doc', 'xls', 'ppt'].includes(ext)) {
      const text = decoder.decode(bytes)
      const readable = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,;:!?()（）、，。；：！？""''【】《》\-\—\n]/g, ' ').trim()
      if (readable.length > 20) return readable
      return null
    }
    return null
  } catch (e) {
    return null
  }
}

// 递归读取文件夹中的所有文件
export async function readFolderFiles(fileHandle) {
  const files = []
  await traverseFolder(fileHandle, '', files)
  return files
}

async function traverseFolder(handle, path, files) {
  for await (const entry of handle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name
    if (entry.kind === 'file') {
      const file = await entry.getFile()
      files.push({ file, path: entryPath })
    } else if (entry.kind === 'directory') {
      await traverseFolder(entry, entryPath, files)
    }
  }
}

export default { readFileContent, extractTextFromBinary, readFolderFiles }
