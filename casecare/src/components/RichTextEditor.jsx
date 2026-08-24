import { useState } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link2, Image, ChevronDown } from 'lucide-react'

// Visual rich-text editor: formatting toolbar + editable area with character counter.
export default function RichTextEditor({ placeholder = 'Enter text...', maxLength = 2000, className = '' }) {
  const [value, setValue] = useState('')
  const ToolBtn = ({ icon: Icon }) => (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-navy-700"
    >
      <Icon size={15} />
    </button>
  )
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/70 px-2 py-1.5">
        <button type="button" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
          Inter <ChevronDown size={12} />
        </button>
        <button type="button" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
          14 <ChevronDown size={12} />
        </button>
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <ToolBtn icon={Bold} />
        <ToolBtn icon={Italic} />
        <ToolBtn icon={Underline} />
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <ToolBtn icon={ListOrdered} />
        <ToolBtn icon={List} />
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <ToolBtn icon={Link2} />
        <ToolBtn icon={Image} />
      </div>
      <div className="relative">
        <textarea
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-[110px] w-full resize-y px-3.5 py-3 text-sm text-navy-800 outline-none placeholder:text-slate-400"
        />
        <span className="pointer-events-none absolute bottom-2 right-3 text-2xs text-slate-400">
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  )
}
