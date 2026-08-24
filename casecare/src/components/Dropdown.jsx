import { useEffect, useRef, useState } from 'react'

// Click-to-toggle dropdown that closes on outside click / Escape.
export default function Dropdown({ trigger, children, align = 'right', width = 'w-48', menuClassName = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-40 mt-2 ${width} ${
            align === 'right' ? 'right-0' : 'left-0'
          } origin-top rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop animate-fade-in-up ${menuClassName}`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({ icon: Icon, children, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-navy-700 hover:bg-slate-100'
      }`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  )
}
