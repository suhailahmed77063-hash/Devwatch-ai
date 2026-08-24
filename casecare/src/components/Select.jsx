import { ChevronDown } from 'lucide-react'

// Lightweight styled native select.
export default function Select({
  label,
  required,
  hint,
  options = [],
  className = '',
  selectClassName = '',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-navy-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={`input-base cursor-pointer appearance-none pr-9 ${selectClassName}`}
          {...props}
        >
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value
            const text = typeof opt === 'string' ? opt : opt.label
            return (
              <option key={value} value={value}>
                {text}
              </option>
            )
          })}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
