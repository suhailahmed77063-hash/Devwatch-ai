import { Check } from 'lucide-react'

// Horizontal numbered workflow stepper.
// `steps` = array of labels, `current` = 0-based index of the active step.
export default function ProgressSteps({ steps, current = 0, className = '' }) {
  return (
    <div className={`flex items-center overflow-x-auto scrollbar-none ${className}`}>
      {steps.map((label, i) => {
        const isDone = i < current
        const isActive = i === current
        const circle = isDone
          ? 'bg-primary-600 text-white border-primary-600'
          : isActive
            ? 'bg-primary-600 text-white border-primary-600 ring-4 ring-primary-100'
            : 'bg-white text-slate-400 border-slate-300'
        return (
          <div key={label} className="flex min-w-max items-center">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${circle}`}
              >
                {isDone ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`text-[13px] font-medium ${
                  isActive ? 'text-primary-700' : isDone ? 'text-navy-700' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-3 h-px w-10 shrink-0 lg:w-14 ${isDone ? 'bg-primary-500' : 'bg-slate-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
