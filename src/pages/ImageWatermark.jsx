import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Upload, Download, Trash2, Image as ImageIcon, RotateCw } from 'lucide-react'

const POSITION_OPTIONS = [
  { value: 'center', label: '居中' },
  { value: 'tile', label: '平铺' },
  { value: 'bottom-right', label: '右下角' },
  { value: 'top-left', label: '左上角' },
  { value: 'top-right', label: '右上角' },
  { value: 'bottom-left', label: '左下角' },
]

function ImageWatermark() {
  const [images, setImages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  // Watermark settings
  const [text, setText] = useState('仅供内部使用')
  const [fontSize, setFontSize] = useState(32)
  const [opacity, setOpacity] = useState(0.3)
  const [color, setColor] = useState('#000000')
  const [position, setPosition] = useState('tile')
  const [rotation, setRotation] = useState(-30)

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

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
            if (images.length === 0) {
              setCurrentIndex(0)
            }
          }
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setPreviewUrl('')
      }
      return next
    })
    if (currentIndex >= images.length - 1) {
      setCurrentIndex(Math.max(0, images.length - 2))
    }
  }

  const clearAll = () => {
    setImages([])
    setCurrentIndex(0)
    setPreviewUrl('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const applyWatermark = useCallback((sourceImg, targetCanvas) => {
    const ctx = targetCanvas.getContext('2d')
    targetCanvas.width = sourceImg.width
    targetCanvas.height = sourceImg.height

    // Draw original image
    ctx.drawImage(sourceImg, 0, 0)

    // Watermark settings
    ctx.globalAlpha = opacity
    ctx.fillStyle = color
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const textWidth = ctx.measureText(text).width
    const textHeight = fontSize

    const drawWatermarkAt = (x, y) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }

    switch (position) {
      case 'center':
        drawWatermarkAt(sourceImg.width / 2, sourceImg.height / 2)
        break

      case 'tile': {
        const diagonal = Math.sqrt(sourceImg.width ** 2 + sourceImg.height ** 2)
        const gapX = textWidth + 100
        const gapY = textHeight + 80
        const startX = -diagonal / 2
        const startY = -diagonal / 2
        const endX = sourceImg.width + diagonal / 2
        const endY = sourceImg.height + diagonal / 2

        for (let y = startY; y < endY; y += gapY) {
          for (let x = startX; x < endX; x += gapX) {
            drawWatermarkAt(x, y)
          }
        }
        break
      }

      case 'bottom-right':
        drawWatermarkAt(sourceImg.width - textWidth / 2 - 20, sourceImg.height - textHeight / 2 - 20)
        break

      case 'top-left':
        drawWatermarkAt(textWidth / 2 + 20, textHeight / 2 + 20)
        break

      case 'top-right':
        drawWatermarkAt(sourceImg.width - textWidth / 2 - 20, textHeight / 2 + 20)
        break

      case 'bottom-left':
        drawWatermarkAt(textWidth / 2 + 20, sourceImg.height - textHeight / 2 - 20)
        break

      default:
        break
    }

    ctx.globalAlpha = 1.0
  }, [text, fontSize, opacity, color, position, rotation])

  // Real-time preview
  useEffect(() => {
    if (images.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const currentImage = images[currentIndex]
    if (!currentImage) return

    applyWatermark(currentImage.img, canvas)
    setPreviewUrl(canvas.toDataURL('image/png'))
  }, [images, currentIndex, text, fontSize, opacity, color, position, rotation, applyWatermark])

  const downloadSingle = (index) => {
    const img = images[index]
    if (!img) return

    const canvas = document.createElement('canvas')
    applyWatermark(img.img, canvas)

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `watermarked_${img.name}`
    link.click()
  }

  const downloadAll = async () => {
    if (images.length === 0) return

    if (images.length === 1) {
      downloadSingle(0)
      return
    }

    try {
      const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default
      const zip = new JSZip()

      for (const img of images) {
        const canvas = document.createElement('canvas')
        applyWatermark(img.img, canvas)
        const base64 = canvas.toDataURL('image/png').split(',')[1]
        zip.file(`watermarked_${img.name}`, base64, { base64: true })
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'watermarked_images.zip'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      for (let i = 0; i < images.length; i++) {
        downloadSingle(i)
      }
    }
  }

  const currentImage = images[currentIndex]

  return (
    <div>
      <div className="page-header">
        <a href="/" className="back-btn"><ArrowLeft size={16} /> 返回首页</a>
        <h2 className="page-title">图片加水印</h2>
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
        <p className="file-upload-hint">支持格式：JPG、PNG、WebP、GIF，可同时上传多张</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* File List */}
      {images.length > 0 && (
        <div className="file-list" style={{ marginTop: '12px' }}>
          {images.map((img, i) => (
            <div
              key={i}
              className="file-item"
              style={{
                borderLeft: i === currentIndex ? '3px solid var(--primary)' : '3px solid #38a169',
                cursor: 'pointer',
              }}
              onClick={() => setCurrentIndex(i)}
            >
              <span>&#128444;</span>
              <span>{img.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                ({img.width} x {img.height})
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                style={{ marginLeft: 'auto', padding: '2px 6px' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-message" style={{ marginTop: '12px' }}>{error}</div>}

      {/* Settings & Preview */}
      {images.length > 0 && (
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
          {/* Settings Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">水印文字</label>
              <input
                type="text"
                className="form-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请输入水印文字"
              />
            </div>

            <div className="form-group">
              <label className="form-label">字体大小：{fontSize}px</label>
              <input
                type="range"
                className="form-input"
                min="12"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>12px</span>
                <span>72px</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">透明度：{opacity.toFixed(2)}</label>
              <input
                type="range"
                className="form-input"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>透明</span>
                <span>不透明</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">水印颜色</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '40px', height: '32px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">水印位置</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {POSITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`btn ${position === opt.value ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    onClick={() => setPosition(opt.value)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">旋转角度：{rotation}&deg;</label>
              <input
                type="range"
                className="form-input"
                min="-180"
                max="180"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>-180&deg;</span>
                <span>0&deg;</span>
                <span>180&deg;</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-primary" onClick={downloadAll} style={{ flex: 1 }}>
                <Download size={14} /> 下载全部
              </button>
              <button className="btn btn-outline" onClick={clearAll}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div>
            <div className="result-area">
              <div className="result-header">
                <h3 className="result-title">
                  预览 - {currentImage?.name || ''}
                  {images.length > 1 && ` (${currentIndex + 1}/${images.length})`}
                </h3>
                <button className="btn btn-primary btn-sm" onClick={() => downloadSingle(currentIndex)}>
                  <Download size={14} /> 下载当前
                </button>
              </div>
              <div className="result-content" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 50% / 16px 16px',
                borderRadius: '8px',
                padding: '16px',
                minHeight: '300px',
              }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '500px',
                    objectFit: 'contain',
                    display: previewUrl ? 'block' : 'none',
                  }}
                />
                {!previewUrl && (
                  <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageWatermark
