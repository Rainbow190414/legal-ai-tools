import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Upload, Download, FileImage, Loader, Trash2, Package } from 'lucide-react'

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

function PdfToImage() {
  const [pdfFiles, setPdfFiles] = useState([])
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [scale, setScale] = useState(2)
  const [selectedPages, setSelectedPages] = useState(new Set())
  const [libReady, setLibReady] = useState(false)
  const fileInputRef = useRef(null)
  const canvasRefs = useRef([])

  // Load pdf.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
      setLibReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = PDFJS_CDN
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
      setLibReady(true)
    }
    script.onerror = () => setError('pdf.js 库加载失败，请检查网络连接')
    document.head.appendChild(script)
  }, [])

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
    if (files.length === 0) {
      setError('请选择 PDF 文件')
      return
    }
    setPdfFiles(files)
    setPages([])
    setSelectedPages(new Set())
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (files.length === 0) {
      setError('请拖入 PDF 文件')
      return
    }
    setPdfFiles(files)
    setPages([])
    setSelectedPages(new Set())
    setError('')
  }

  const convertPdfToImages = useCallback(async () => {
    if (!libReady) {
      setError('pdf.js 尚未加载完成，请稍候重试')
      return
    }
    if (pdfFiles.length === 0) {
      setError('请先上传 PDF 文件')
      return
    }

    setConverting(true)
    setPages([])
    setSelectedPages(new Set())
    setError('')
    const allPages = []

    try {
      for (let fi = 0; fi < pdfFiles.length; fi++) {
        const file = pdfFiles[fi]
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const totalPages = pdf.numPages

        for (let i = 1; i <= totalPages; i++) {
          setProgress(Math.round(((fi * 100 + (i / totalPages) * 100) / pdfFiles.length)))
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')

          await page.render({ canvasContext: ctx, viewport }).promise

          const dataUrl = canvas.toDataURL('image/png')
          allPages.push({
            pageNum: i,
            total: totalPages,
            fileName: file.name,
            fileIndex: fi,
            dataUrl,
            width: viewport.width,
            height: viewport.height,
          })
        }
      }
      setPages(allPages)
    } catch (err) {
      setError('PDF 转换失败：' + err.message)
    }
    setConverting(false)
    setProgress(0)
  }, [libReady, pdfFiles, scale])

  const togglePageSelection = (index) => {
    setSelectedPages(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set())
    } else {
      setSelectedPages(new Set(pages.map((_, i) => i)))
    }
  }

  const downloadSingle = (page, index) => {
    const link = document.createElement('a')
    link.href = page.dataUrl
    link.download = `${page.fileName.replace('.pdf', '')}_page_${page.pageNum}.png`
    link.click()
  }

  const downloadSelected = async () => {
    if (selectedPages.size === 0) return

    if (selectedPages.size === 1) {
      const idx = Array.from(selectedPages)[0]
      downloadSingle(pages[idx], idx)
      return
    }

    // Download as individual files if JSZip is not available
    try {
      const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default
      const zip = new JSZip()
      const selected = Array.from(selectedPages).sort((a, b) => a - b)

      for (const idx of selected) {
        const page = pages[idx]
        const base64 = page.dataUrl.split(',')[1]
        zip.file(`${page.fileName.replace('.pdf', '')}_page_${page.pageNum}.png`, base64, { base64: true })
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'pdf_images.zip'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: download individually
      const selected = Array.from(selectedPages).sort((a, b) => a - b)
      for (const idx of selected) {
        downloadSingle(pages[idx], idx)
      }
    }
  }

  const downloadAll = async () => {
    if (pages.length === 0) return

    if (pages.length === 1) {
      downloadSingle(pages[0], 0)
      return
    }

    try {
      const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default
      const zip = new JSZip()

      for (const page of pages) {
        const base64 = page.dataUrl.split(',')[1]
        zip.file(`${page.fileName.replace('.pdf', '')}_page_${page.pageNum}.png`, base64, { base64: true })
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'pdf_images_all.zip'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      for (let i = 0; i < pages.length; i++) {
        downloadSingle(pages[i], i)
      }
    }
  }

  const clearAll = () => {
    setPdfFiles([])
    setPages([])
    setSelectedPages(new Set())
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <div className="page-header">
        <a href="/" className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">PDF转图片</h2>
      </div>

      {!libReady && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>正在加载 pdf.js 库...</p>
        </div>
      )}

      {libReady && (
        <>
          {/* File Upload */}
          <div
            className="file-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} className="file-upload-icon" />
            <p className="file-upload-text">拖拽 PDF 文件到此处，或点击上传</p>
            <p className="file-upload-hint">支持格式：PDF，可同时上传多个文件</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* File List */}
          {pdfFiles.length > 0 && (
            <div className="file-list" style={{ marginTop: '12px' }}>
              {pdfFiles.map((file, i) => (
                <div key={i} className="file-item">
                  <span style={{ color: '#e53e3e' }}>&#128196;</span>
                  <span>{file.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Settings */}
          {pdfFiles.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                <label className="form-label">缩放倍数：{scale}x</label>
                <input
                  type="range"
                  className="form-input"
                  min="1"
                  max="4"
                  step="0.5"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>1x (低质量)</span>
                  <span>4x (高质量)</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={convertPdfToImages}
                  disabled={converting}
                >
                  {converting ? `转换中 ${progress}%...` : '开始转换'}
                </button>
                <button className="btn btn-outline" onClick={clearAll}>
                  <Trash2 size={14} /> 清除
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {converting && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--bg-secondary)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--primary)',
                  borderRadius: '3px',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && <div className="error-message" style={{ marginTop: '12px' }}>{error}</div>}

          {/* Results */}
          {pages.length > 0 && (
            <div className="result-area" style={{ marginTop: '20px' }}>
              <div className="result-header">
                <h3 className="result-title">
                  转换结果（共 {pages.length} 页）
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={toggleSelectAll}>
                    {selectedPages.size === pages.length ? '取消全选' : '全选'}
                  </button>
                  {selectedPages.size > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={downloadSelected}>
                      <Package size={14} /> 下载选中 ({selectedPages.size})
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={downloadAll}>
                    <Download size={14} /> 下载全部
                  </button>
                </div>
              </div>

              <div className="result-content">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}>
                  {pages.map((page, index) => (
                    <div
                      key={index}
                      style={{
                        border: selectedPages.has(index) ? '2px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                      onClick={() => togglePageSelection(index)}
                    >
                      <div style={{
                        position: 'relative',
                        background: '#f7f7f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                      }}>
                        <img
                          src={page.dataUrl}
                          alt={`Page ${page.pageNum}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain',
                          }}
                        />
                        {selectedPages.has(index) && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}>
                            &#10003;
                          </div>
                        )}
                      </div>
                      <div style={{
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                      }}>
                        <span>
                          {page.fileName} - 第 {page.pageNum}/{page.total} 页
                        </span>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => { e.stopPropagation(); downloadSingle(page, index) }}
                          title="下载此页"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PdfToImage
