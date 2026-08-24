import { useEffect } from 'react'
import { X } from 'lucide-react'

// Centered modal dialog with backdrop. Controlled via `open` / `onClose`.
export default function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className={`relative w-full ${width} animate-fade-in-up rounded-2xl bg-white shadow-pop`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}
