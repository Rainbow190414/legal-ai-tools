import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Upload, Download, Trash2, GripVertical, ImagePlus, Move } from 'lucide-react'

const DIRECTION_OPTIONS = [
  { value: 'vertical', label: '纵向拼接' },
  { value: 'horizontal', label: '横向拼接' },
]

const ALIGNMENT_OPTIONS = {
  vertical: [
    { value: 'left', label: '左对齐' },
    { value: 'center', label: '居中' },
    { value: 'right', label: '右对齐' },
  ],
  horizontal: [
    { value: 'top', label: '顶部对齐' },
    { value: 'center', label: '居中' },
    { value: 'bottom', label: '底部对齐' },
  ],
}

const FIT_OPTIONS = [
  { value: 'original', label: '原始尺寸' },
  { value: 'fit-width', label: '适应宽度' },
  { value: 'fit-height', label: '适应高度' },
]

function ImageStitch() {
  const [images, setImages] = useState([])
  const [direction, setDirection] = useState('vertical')
  const [gap, setGap] = useState(0)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [alignment, setAlignment] = useState('center')
  const [fitMode, setFitMode] = useState('fit-width')
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const previewContainerRef = useRef(null)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) {
      setError('请选择图片文件')
      return
    }
    loadImages(files)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) {
      setError('请拖入图片文件')
      return
    }
    loadImages(files)
  }

  const loadImages = (files) => {
    setError('')
    const newImages = []
    let loaded = 0

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          newImages.push({
            id: Date.now() + Math.random(),
            name: file.name,
            file,
            img,
            width: img.width,
            height: img.height,
            dataUrl: e.target.result,
          })
          loaded++
          if (loaded === files.length) {
            setImages(prev => [...prev, ...newImages])
          }
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setImages([])
    setPreviewUrl('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Drag to reorder
  const handleDragStart = (index) => {
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDropReorder = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    setImages(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // Stitch images using Canvas
  const stitchImages = useCallback(() => {
    if (images.length === 0) return null

    const canvas = canvasRef.current || document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // Calculate dimensions based on fit mode
    let targetSize

    if (fitMode === 'fit-width') {
      // All images fit to the same width (use max width)
      const maxWidth = Math.max(...images.map(img => img.width))
      targetSize = { dimension: 'width', value: maxWidth }
    } else if (fitMode === 'fit-height') {
      // All images fit to the same height (use max height)
      const maxHeight = Math.max(...images.map(img => img.height))
      targetSize = { dimension: 'height', value: maxHeight }
    } else {
      targetSize = null
    }

    // Calculate scaled dimensions for each image
    const scaledImages = images.map(img => {
      if (!targetSize) return { ...img, scaledWidth: img.width, scaledHeight: img.height }
      if (targetSize.dimension === 'width') {
        const ratio = targetSize.value / img.width
        return { ...img, scaledWidth: targetSize.value, scaledHeight: Math.round(img.height * ratio) }
      } else {
        const ratio = targetSize.value / img.height
        return { ...img, scaledWidth: Math.round(img.width * ratio), scaledHeight: targetSize.value }
      }
    })

    const totalGap = gap * (images.length - 1)

    if (direction === 'vertical') {
      const maxWidth = Math.max(...scaledImages.map(img => img.scaledWidth))
      const totalHeight = scaledImages.reduce((sum, img) => sum + img.scaledHeight, 0) + totalGap

      canvas.width = maxWidth
      canvas.height = totalHeight

      // Fill background
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let y = 0
      for (const img of scaledImages) {
        let x = 0
        if (alignment === 'center') x = (maxWidth - img.scaledWidth) / 2
        else if (alignment === 'right') x = maxWidth - img.scaledWidth

        ctx.drawImage(img.img, x, y, img.scaledWidth, img.scaledHeight)
        y += img.scaledHeight + gap
      }
    } else {
      // horizontal
      const maxHeight = Math.max(...scaledImages.map(img => img.scaledHeight))
      const totalWidth = scaledImages.reduce((sum, img) => sum + img.scaledWidth, 0) + totalGap

      canvas.width = totalWidth
      canvas.height = maxHeight

      // Fill background
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let x = 0
      for (const img of scaledImages) {
        let y = 0
        if (alignment === 'center') y = (maxHeight - img.scaledHeight) / 2
        else if (alignment === 'bottom') y = maxHeight - img.scaledHeight

        ctx.drawImage(img.img, x, y, img.scaledWidth, img.scaledHeight)
        x += img.scaledWidth + gap
      }
    }

    return canvas.toDataURL('image/png')
  }, [images, direction, gap, bgColor, alignment, fitMode])

  // Update preview on settings change
  useEffect(() => {
    if (images.length < 2) {
      setPreviewUrl('')
      return
    }
    const url = stitchImages()
    if (url) setPreviewUrl(url)
  }, [images, direction, gap, bgColor, alignment, fitMode, stitchImages])

  // Reset alignment when direction changes
  useEffect(() => {
    setAlignment('center')
  }, [direction])

  const downloadResult = () => {
    const url = stitchImages()
    if (!url) return

    const link = document.createElement('a')
    link.href = url
    link.download = `stitched_${direction}_${Date.now()}.png`
    link.click()
  }

  const currentAlignments = ALIGNMENT_OPTIONS[direction]

  return (
    <div>
      <div className="page-header">
        <a href={import.meta.env.BASE_URL} className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">多图拼接</h2>
      </div>

      {/* File Upload */}
      <div
        className="file-upload"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={40} className="file-upload-icon" />
        <p className="file-upload-text">拖拽图片到此处，或点击上传</p>
        <p className="file-upload-hint">支持格式：JPG、PNG、WebP、GIF，至少上传2张图片</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {error && <div className="error-message" style={{ marginTop: '12px' }}>{error}</div>}

      {/* Image List with Drag Reorder */}
      {images.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>
              图片列表（{images.length} 张，拖拽排序）
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus size={14} /> 继续添加
              </button>
              <button className="btn btn-outline btn-sm" onClick={clearAll}>
                <Trash2 size={14} /> 清除全部
              </button>
            </div>
          </div>

          <div className="file-list">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="file-item"
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDropReorder(e, i)}
                onDragEnd={handleDragEnd}
                style={{
                  borderLeft: dragIndex === i ? '3px solid var(--primary)' :
                               dragOverIndex === i ? '3px solid #ed8936' : '3px solid #38a169',
                  cursor: 'grab',
                  opacity: dragIndex === i ? 0.5 : 1,
                  background: dragOverIndex === i ? 'var(--bg-secondary)' : undefined,
                }}
              >
                <GripVertical size={14} style={{ color: 'var(--text-secondary)', cursor: 'grab' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '24px' }}>#{i + 1}</span>
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
                />
                <span style={{ flex: 1 }}>{img.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {img.width} x {img.height}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => removeImage(i)}
                  style={{ padding: '2px 6px' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      {images.length >= 2 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}>
            {/* Direction */}
            <div className="form-group">
              <label className="form-label">拼接方向</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {DIRECTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`btn ${direction === opt.value ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    onClick={() => setDirection(opt.value)}
                    style={{ flex: 1 }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div className="form-group">
              <label className="form-label">对齐方式</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {currentAlignments.map(opt => (
                  <button
                    key={opt.value}
                    className={`btn ${alignment === opt.value ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    onClick={() => setAlignment(opt.value)}
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gap */}
            <div className="form-group">
              <label className="form-label">间距：{gap}px</label>
              <input
                type="range"
                className="form-input"
                min="0"
                max="20"
                value={gap}
                onChange={(e) => setGap(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>0px</span>
                <span>20px</span>
              </div>
            </div>

            {/* Background Color */}
            <div className="form-group">
              <label className="form-label">背景颜色</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{ width: '40px', height: '32px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Fit Mode */}
            <div className="form-group">
              <label className="form-label">图片适配</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {FIT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`btn ${fitMode === opt.value ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    onClick={() => setFitMode(opt.value)}
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="result-area">
            <div className="result-header">
              <h3 className="result-title">拼接预览</h3>
              <button className="btn btn-primary btn-sm" onClick={downloadResult}>
                <Download size={14} /> 下载拼接图
              </button>
            </div>
            <div className="result-content" ref={previewContainerRef} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 50% / 16px 16px',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '200px',
              overflow: 'auto',
              maxHeight: '600px',
            }}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Stitch preview"
                  style={{ maxWidth: '100%', maxHeight: '560px', objectFit: 'contain' }}
                />
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>处理中...</p>
              )}
            </div>
            {previewUrl && canvasRef.current && (
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                输出尺寸：{canvasRef.current.width} x {canvasRef.current.height} px
              </div>
            )}
          </div>
        </div>
      )}

      {images.length === 1 && (
        <div style={{ marginTop: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>请继续添加至少 1 张图片以开始拼接</p>
        </div>
      )}

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default ImageStitch
