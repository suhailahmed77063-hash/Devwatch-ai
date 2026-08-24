import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

// Dashed drag-and-drop upload area (visual + basic file selection).
export default function FileUpload({
  hint = 'Drag & drop files here or',
  cta = 'click to upload',
  sub = 'Supports PDF, JPG, PNG (Max 10MB each)',
  onFiles,
  className = '',
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    onFiles?.(Array.from(e.dataTransfer.files))
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
        dragging ? 'border-primary-400 bg-primary-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-primary-300'
      } ${className}`}
    >
      <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-500">
        <UploadCloud size={20} />
      </span>
      <p className="text-sm text-slate-600">
        {hint} <span className="font-medium text-primary-600">{cta}</span>
      </p>
      <p className="mt-1 text-2xs text-slate-400">{sub}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onFiles?.(Array.from(e.target.files))}
      />
    </div>
  )
}
